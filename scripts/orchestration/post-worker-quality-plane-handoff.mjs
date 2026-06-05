#!/usr/bin/env node

import {
  DEFAULT_BASE_URL,
  resolvePlaneAuth,
} from "../plane/plane-auth.mjs";
import {
  htmlEscape,
  stripHtml,
} from "./plane-html.mjs";
import {
  POST_WORKER_QUALITY_CANDIDATE_MARKER,
  buildPlaneQualityProjectScan,
  buildPlaneQualitySchedulerHandoff,
  findExistingCandidateComment,
  loadDefaultQualityRegistry,
  postableCandidateResults,
  renderPlaneCandidateMarkdown,
  writePlaneHandoffReport,
  writePlaneProjectScanReport,
} from "./post-worker-quality-plane-handoff-core.mjs";

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    auth: process.env.PLANE_AUTH_MODE || "app-token",
    workspace: process.env.PLANE_WORKSPACE_SLUG || "companyos",
    projectId: process.env.PLANE_PROJECT_ID || "",
    projectIdentifier: process.env.PLANE_PROJECT_IDENTIFIER || "",
    workItemId: "",
    sequenceId: "",
    scanProject: false,
    maxItems: 50,
    postLimit: 10,
    mode: "dry-run",
    workspaceRoot: process.cwd(),
    registry: "",
    writeReport: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--write-report") args.writeReport = true;
    else if (arg === "--scan-project") args.scanProject = true;
    else if (arg === "--workspace") args.workspace = argv[++index] || "";
    else if (arg === "--project-id") args.projectId = argv[++index] || "";
    else if (arg === "--project-identifier") args.projectIdentifier = argv[++index] || "";
    else if (arg === "--work-item-id") args.workItemId = argv[++index] || "";
    else if (arg === "--sequence") args.sequenceId = argv[++index] || "";
    else if (arg === "--max-items") args.maxItems = Number(argv[++index] || args.maxItems);
    else if (arg === "--post-limit") args.postLimit = Number(argv[++index] || args.postLimit);
    else if (arg === "--mode") args.mode = argv[++index] || "dry-run";
    else if (arg === "--auth") args.auth = argv[++index] || "app-token";
    else if (arg === "--base-url") args.baseUrl = argv[++index] || DEFAULT_BASE_URL;
    else if (arg === "--workspace-root") args.workspaceRoot = argv[++index] || process.cwd();
    else if (arg === "--registry") args.registry = argv[++index] || "";
    else throw new Error(`Unknown argument: ${arg}`);
  }

  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  return args;
}

function usage() {
  return `Usage:
  node scripts/orchestration/post-worker-quality-plane-handoff.mjs \\
    --workspace companyos \\
    --project-id <uuid> \\
    (--sequence COMPA-### | --work-item-id <uuid>) \\
    [--mode dry-run|post] \\
    [--auth app-token|api-key] \\
    [--write-report] \\
    [--json]

  node scripts/orchestration/post-worker-quality-plane-handoff.mjs \\
    --workspace companyos \\
    --project-id <uuid> \\
    --scan-project \\
    [--max-items 50] \\
    [--mode dry-run|post] \\
    [--post-limit 10] \\
    [--auth app-token|api-key] \\
    [--write-report] \\
    [--json]

Reads a real Plane work item plus comments, finds the latest
controller.audit-followup / controller.hotfix-request marker, and converts it
into one scheduler.lower-worker-candidate comment.

Hard boundary:
  - dry-run writes nothing
  - post writes at most one Plane comment
  - never locks, spawns, transitions state, marks Done, deploys or pushes
`;
}

function validateArgs(args) {
  const errors = [];
  if (!args.workspace) errors.push("--workspace is required");
  if (!args.projectId) errors.push("--project-id is required");
  if (!args.scanProject && !args.workItemId && !args.sequenceId) errors.push("--work-item-id, --sequence or --scan-project is required");
  if (args.scanProject && (args.workItemId || args.sequenceId)) errors.push("--scan-project cannot be combined with --work-item-id or --sequence");
  if (!["dry-run", "post"].includes(args.mode)) errors.push("--mode must be dry-run or post");
  if (!Number.isFinite(args.maxItems) || args.maxItems < 1) errors.push("--max-items must be a positive number");
  if (!Number.isFinite(args.postLimit) || args.postLimit < 1) errors.push("--post-limit must be a positive number");
  return errors;
}

async function requestJson({ baseUrl, authHeaders, path, method = "GET", body }) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...authHeaders,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text.slice(0, 500) };
  }
  return { ok: response.ok, status: response.status, body: parsed };
}

function listFromPlaneResponse(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

async function fetchWorkItem({ baseUrl, authHeaders, workspace, projectId, workItemId, sequenceId }) {
  if (workItemId) {
    return requestJson({
      baseUrl,
      authHeaders,
      path: `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(workItemId)}/`,
    });
  }
  const listed = await requestJson({
    baseUrl,
    authHeaders,
    path: `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/?per_page=500`,
  });
  if (!listed.ok) return listed;
  const wantedSeq = String(sequenceId).replace(/^.+-/, "");
  const found = listFromPlaneResponse(listed.body).find((row) => String(row.sequence_id) === wantedSeq);
  if (!found) return { ok: false, status: 404, body: { detail: `sequence ${sequenceId} not found in project` } };
  return requestJson({
    baseUrl,
    authHeaders,
    path: `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(found.id)}/`,
  });
}

async function listWorkItems({ baseUrl, authHeaders, workspace, projectId, maxItems }) {
  const listed = await requestJson({
    baseUrl,
    authHeaders,
    path: `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/?per_page=${encodeURIComponent(maxItems)}`,
  });
  if (!listed.ok) return { ok: false, status: listed.status, error: listed.body, items: [] };
  const rows = listFromPlaneResponse(listed.body).slice(0, maxItems);
  const items = [];
  const errors = [];
  for (const row of rows) {
    const detail = await requestJson({
      baseUrl,
      authHeaders,
      path: `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(row.id)}/`,
    });
    if (detail.ok) items.push(detail.body);
    else errors.push({ id: row.id || null, status: detail.status, error: detail.body });
  }
  return { ok: errors.length === 0, status: listed.status, items, errors };
}

async function fetchProjectIdentifier({ baseUrl, authHeaders, workspace, projectId }) {
  const response = await requestJson({
    baseUrl,
    authHeaders,
    path: `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/`,
  });
  if (!response.ok) return "";
  return String(response.body?.identifier || "").trim().toUpperCase();
}

async function listComments({ baseUrl, authHeaders, workspace, projectId, workItemId }) {
  const response = await requestJson({
    baseUrl,
    authHeaders,
    path: `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(workItemId)}/comments/`,
  });
  if (!response.ok) return { ok: false, status: response.status, error: response.body, comments: [] };
  return {
    ok: true,
    status: response.status,
    comments: listFromPlaneResponse(response.body).map((comment) => ({
      id: comment.id || null,
      created_at: comment.created_at || null,
      updated_at: comment.updated_at || null,
      body: stripHtml(comment.comment_html || comment.comment_stripped || comment.description_html || ""),
    })),
  };
}

async function postComment({ baseUrl, authHeaders, workspace, projectId, workItemId, markdown }) {
  const html = `<p><strong>${htmlEscape(POST_WORKER_QUALITY_CANDIDATE_MARKER)}</strong></p><pre><code>${htmlEscape(markdown)}</code></pre>`;
  return requestJson({
    baseUrl,
    authHeaders,
    method: "POST",
    path: `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(workItemId)}/comments/`,
    body: { comment_html: html },
  });
}

function print(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`post-worker-quality-plane-handoff: ${result.status}\n`);
  if (result.work_item?.ref) process.stdout.write(`work_item: ${result.work_item.ref}\n`);
  if (Number.isFinite(result.scanned_items)) {
    process.stdout.write(`scanned_items: ${result.scanned_items}\n`);
    process.stdout.write(`marked_items: ${result.marked_items}\n`);
    process.stdout.write(`candidate_count: ${result.candidate_count}\n`);
    process.stdout.write(`blocked_count: ${result.blocked_count}\n`);
  }
  if (result.worker_class) process.stdout.write(`worker_class: ${result.worker_class}\n`);
  if (result.reason_codes?.length) process.stdout.write(`reason_codes: ${result.reason_codes.join(", ")}\n`);
  if (result.report?.markdown) process.stdout.write(`report: ${result.report.markdown}\n`);
  if (result.post?.comment_id) process.stdout.write(`posted_comment_id: ${result.post.comment_id}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return;
  }
  const errors = validateArgs(args);
  if (errors.length) {
    process.stderr.write(`${errors.join("\n")}\n\n${usage()}`);
    process.exitCode = 2;
    return;
  }

  const auth = resolvePlaneAuth(args.auth);
  if (!auth.ok) {
    print({
      ok: false,
      status: "BLOCKED_AUTH",
      reason_codes: [auth.missingError],
    }, args.json);
    process.exitCode = 2;
    return;
  }

  const registry = loadDefaultQualityRegistry(args.registry || undefined);
  if (!registry.ok) {
    print({ ok: false, status: "BLOCKED_REGISTRY", reason_codes: [registry.error || "registry.load-failed"] }, args.json);
    process.exitCode = 2;
    return;
  }

  const projectIdentifier = args.projectIdentifier || await fetchProjectIdentifier({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    workspace: args.workspace,
    projectId: args.projectId,
  }) || "COMPA";

  if (args.scanProject) {
    const listed = await listWorkItems({
      baseUrl: args.baseUrl,
      authHeaders: auth.headers,
      workspace: args.workspace,
      projectId: args.projectId,
      maxItems: args.maxItems,
    });
    if (!listed.ok) {
      print({ ok: false, status: "BLOCKED_PLANE_PROJECT_SCAN", status_code: listed.status, errors: listed.errors || listed.error }, args.json);
      process.exitCode = 2;
      return;
    }

    const commentsByWorkItemId = {};
    for (const item of listed.items) {
      const comments = await listComments({
        baseUrl: args.baseUrl,
        authHeaders: auth.headers,
        workspace: args.workspace,
        projectId: args.projectId,
        workItemId: item.id,
      });
      if (!comments.ok) {
        commentsByWorkItemId[item.id] = [];
        continue;
      }
      commentsByWorkItemId[item.id] = comments.comments;
    }

    const scan = buildPlaneQualityProjectScan({
      registry: registry.registry,
      workItems: listed.items,
      commentsByWorkItemId,
      workspaceRoot: args.workspaceRoot,
      projectIdentifier,
    });

    if (args.writeReport) {
      scan.report = writePlaneProjectScanReport({
        scan,
        workspaceRoot: args.workspaceRoot,
      });
    }

    if (args.mode === "post") {
      const posts = [];
      for (const candidate of scan.candidates.slice(0, args.postLimit)) {
        const comments = commentsByWorkItemId[candidate.work_item.id] || [];
        const existing = findExistingCandidateComment(comments, candidate);
        if (existing) {
          posts.push({
            work_item: candidate.work_item.ref,
            ok: true,
            skipped: true,
            reason: "candidate already posted for marker",
            comment_id: existing.id,
          });
          continue;
        }
        const post = await postComment({
          baseUrl: args.baseUrl,
          authHeaders: auth.headers,
          workspace: args.workspace,
          projectId: args.projectId,
          workItemId: candidate.work_item.id,
          markdown: renderPlaneCandidateMarkdown(candidate),
        });
        posts.push({
          work_item: candidate.work_item.ref,
          ok: post.ok,
          status: post.status,
          comment_id: post.body?.id || null,
          error: post.ok ? null : post.body,
        });
      }
      scan.post = {
        attempted: posts.length,
        post_limit: args.postLimit,
        ok: posts.every((post) => post.ok),
        posts,
      };
      if (!scan.post.ok) scan.ok = false;
    }

    print(scan, args.json);
    process.exitCode = scan.ok ? 0 : 2;
    return;
  }

  const itemResponse = await fetchWorkItem({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    workspace: args.workspace,
    projectId: args.projectId,
    workItemId: args.workItemId,
    sequenceId: args.sequenceId,
  });
  if (!itemResponse.ok) {
    print({ ok: false, status: "BLOCKED_PLANE_ITEM_READ", status_code: itemResponse.status, error: itemResponse.body }, args.json);
    process.exitCode = 2;
    return;
  }

  const comments = await listComments({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    workspace: args.workspace,
    projectId: args.projectId,
    workItemId: itemResponse.body.id,
  });
  if (!comments.ok) {
    print({ ok: false, status: "BLOCKED_PLANE_COMMENTS_READ", status_code: comments.status, error: comments.error }, args.json);
    process.exitCode = 2;
    return;
  }

  const result = buildPlaneQualitySchedulerHandoff({
    registry: registry.registry,
    workItem: itemResponse.body,
    comments: comments.comments,
    workspaceRoot: args.workspaceRoot,
    projectIdentifier,
  });

  if (args.writeReport) {
    result.report = writePlaneHandoffReport({
      result,
      workspaceRoot: args.workspaceRoot,
    });
  }

  if (args.mode === "post") {
    const candidates = postableCandidateResults(result);
    if (!candidates.length) {
      result.post = {
        ok: true,
        skipped: true,
        reason: "no lower-worker candidate to post",
      };
    } else {
      const posts = [];
      for (const candidate of candidates.slice(0, args.postLimit)) {
        const existing = findExistingCandidateComment(comments.comments, candidate);
        if (existing) {
          posts.push({
            work_item: candidate.work_item.ref,
            worker_class: candidate.worker_class,
            ok: true,
            skipped: true,
            reason: "candidate already posted for marker",
            comment_id: existing.id,
          });
          continue;
        }
        const post = await postComment({
          baseUrl: args.baseUrl,
          authHeaders: auth.headers,
          workspace: args.workspace,
          projectId: args.projectId,
          workItemId: itemResponse.body.id,
          markdown: renderPlaneCandidateMarkdown(candidate),
        });
        posts.push({
          work_item: candidate.work_item.ref,
          worker_class: candidate.worker_class,
          ok: post.ok,
          status: post.status,
          comment_id: post.body?.id || null,
          error: post.ok ? null : post.body,
        });
      }
      result.post = {
        attempted: posts.length,
        post_limit: args.postLimit,
        ok: posts.every((post) => post.ok),
        posts,
      };
      if (!result.post.ok) result.ok = false;
    }
  }

  print(result, args.json);
  process.exitCode = result.ok ? 0 : 2;
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message || String(error)}\n`);
  process.exitCode = 1;
});
