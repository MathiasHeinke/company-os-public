#!/usr/bin/env node

/*
 * scheduler-stage-0506.mjs
 *
 * I/O wrapper for the closed-loop Stage 0.5 -> Stage 0.6 scheduler gate.
 *
 * It reviews the current Plane worker contract and, when the contract is not
 * PASS, immediately emits the matching C-Level remediation route. It never
 * locks, spawns, marks Done, mutates work-item descriptions, writes Linear, or
 * touches source files. Post mode writes only controller comments.
 */

import {
  DEFAULT_BASE_URL,
  PLANE_API_KEY_ACCOUNT,
  PLANE_API_KEY_SERVICE,
  PLANE_APP_BOT_TOKEN_ACCOUNT,
  PLANE_APP_SERVICE,
  resolvePlaneAuth,
} from "../plane/plane-auth.mjs";
import { defaultLabelMapPath } from "./plane-label-map-resolver.mjs";
import { resolvePlaneItemLabels } from "./plane-labels.mjs";
import {
  EXECUTIVE_ROUTING_TITLE,
  decideSchedulerStage0506,
} from "./scheduler-stage-0506-core.mjs";
import {
  CONTRACT_REVIEW_TITLE,
  RUNTIME_READY_TITLE,
  RUNTIME_READY_VERDICTS,
  buildRuntimeReadyYaml,
  evaluateRuntimeExecutability,
} from "./contract-controller.mjs";
import { CONTRACT_REMEDIATION_TITLE } from "./contract-remediation-router.mjs";
import {
  DEFAULT_CAPABILITY_REGISTRY_PATH,
  loadCapabilityRegistry,
} from "../capabilities/capability-registry-core.mjs";
import {
  htmlEscape,
  parseYamlScalar,
  stripHtml,
} from "./plane-html.mjs";
import { formatPlaneWorkItemSequence } from "./runtime-dispatcher-v12-core.mjs";

export const SCHEDULER_STAGE_0506_CLI_VERSION = "scheduler-stage-0506-cli/v0";

const COMPARABLE_COMMENT_FIELDS = Object.freeze({
  [CONTRACT_REVIEW_TITLE]: [
    "version",
    "work_item",
    "verdict",
    "description_hash",
    "reason_codes",
    "next_action",
  ],
  [CONTRACT_REMEDIATION_TITLE]: [
    "version",
    "work_item",
    "route_required",
    "route_owner",
    "escalation_level",
    "escalation_path",
    "founder_gate_required",
    "action",
    "source_review_verdict",
    "description_hash",
    "role_labels",
    "reason_codes",
    "message",
  ],
  [RUNTIME_READY_TITLE]: [
    "version",
    "work_item",
    "verdict",
    "description_hash",
    "reason_codes",
  ],
  [EXECUTIVE_ROUTING_TITLE]: [
    "version",
    "work_item",
    "decision",
    "allow_lock",
    "capability_profile",
    "reason_codes",
    "description_hash",
  ],
});

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    auth: process.env.PLANE_AUTH_MODE || "app-token",
    workspace: process.env.PLANE_WORKSPACE_SLUG || "",
    projectId: "",
    workItemId: "",
    sequenceId: "",
    mode: "dry-run",
    labelMap: process.env.PLANE_LABEL_MAP_PATH || "",
    reviewer: "scheduler",
    dedupe: process.env.COMPANY_OS_STAGE_0506_DEDUPE || "on",
    capabilityRegistry: process.env.COMPANY_OS_CAPABILITY_REGISTRY || DEFAULT_CAPABILITY_REGISTRY_PATH,
    runtimeReady: process.env.COMPANY_OS_STAGE_065 || "on",
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--workspace") args.workspace = argv[++i] || "";
    else if (arg === "--project-id") args.projectId = argv[++i] || "";
    else if (arg === "--work-item-id") args.workItemId = argv[++i] || "";
    else if (arg === "--sequence") args.sequenceId = argv[++i] || "";
    else if (arg === "--mode") args.mode = argv[++i] || "dry-run";
    else if (arg === "--auth") args.auth = argv[++i] || "app-token";
    else if (arg === "--base-url") args.baseUrl = argv[++i] || DEFAULT_BASE_URL;
    else if (arg === "--label-map") args.labelMap = argv[++i] || "";
    else if (arg === "--reviewer") args.reviewer = argv[++i] || "scheduler";
    else if (arg === "--dedupe") args.dedupe = argv[++i] || "on";
    else if (arg === "--capability-registry") args.capabilityRegistry = argv[++i] || DEFAULT_CAPABILITY_REGISTRY_PATH;
    else if (arg === "--runtime-ready") args.runtimeReady = argv[++i] || "on";
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  return args;
}

function usage() {
  return `Usage:
  node scripts/orchestration/scheduler-stage-0506.mjs \\
    --workspace <slug> --project-id <uuid> \\
    (--work-item-id <uuid> | --sequence COMPA-<n>) \\
    [--mode dry-run|post] [--auth api-key|app-token] \\
    [--dedupe on|off] [--json]

Closed-loop Stage 0.5 -> Stage 0.6 scheduler gate. It always computes the
contract review first. If the review is not CONTRACT_PASS, it immediately
computes the remediation route and blocks lock/spawn.

Post mode writes controller.contract-review and, for non-PASS contracts,
controller.remediation-routed. Dedupe defaults to on: if the latest matching
comment already covers the same description hash and route/verdict, it skips
that comment instead of spamming Plane.

This wrapper never locks, spawns, marks Done, writes Linear, deploys, edits
source, or mutates work item descriptions.

Keychain fallback:
  api key:   ${PLANE_API_KEY_SERVICE} / ${PLANE_API_KEY_ACCOUNT}
  app token: ${PLANE_APP_SERVICE} / ${PLANE_APP_BOT_TOKEN_ACCOUNT}
`;
}

function validateArgs(args) {
  const errors = [];
  if (!args.workspace) errors.push("--workspace is required");
  if (!args.projectId) errors.push("--project-id is required");
  if (!args.workItemId && !args.sequenceId) errors.push("--work-item-id or --sequence is required");
  if (!["dry-run", "post"].includes(args.mode)) errors.push("--mode must be dry-run or post");
  if (!["on", "off"].includes(args.dedupe)) errors.push("--dedupe must be on or off");
  if (!["on", "off"].includes(args.runtimeReady)) errors.push("--runtime-ready must be on or off");
  return errors;
}

async function requestJson({ baseUrl, authHeaders, path, method = "GET", body }) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...authHeaders, "Accept": "application/json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text.slice(0, 500) }; }
  return { ok: response.ok, status: response.status, body: parsed };
}

async function fetchWorkItem({ baseUrl, authHeaders, workspace, projectId, workItemId, sequenceId }) {
  if (workItemId) {
    const path = `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(workItemId)}/`;
    return requestJson({ baseUrl, authHeaders, path });
  }

  const listed = await requestJson({
    baseUrl,
    authHeaders,
    path: `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/?per_page=100`,
  });
  if (!listed.ok) return listed;
  const rows = Array.isArray(listed.body) ? listed.body : (listed.body?.results || []);
  const wantedSeq = String(sequenceId).replace(/^.+-/, "");
  const found = rows.find((row) => String(row.sequence_id) === String(wantedSeq));
  if (!found) return { ok: false, status: 404, body: { detail: `sequence ${sequenceId} not found in project` } };

  return requestJson({
    baseUrl,
    authHeaders,
    path: `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(found.id)}/`,
  });
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

async function fetchComments({ baseUrl, authHeaders, workspace, projectId, workItemId }) {
  const path = `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(workItemId)}/comments/`;
  const response = await requestJson({ baseUrl, authHeaders, path });
  if (!response.ok) return response;
  return {
    ok: true,
    status: response.status,
    body: Array.isArray(response.body) ? response.body : (response.body?.results || []),
  };
}

async function postComment({ baseUrl, authHeaders, workspace, projectId, workItemId, html }) {
  const path = `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(workItemId)}/comments/`;
  return requestJson({ baseUrl, authHeaders, path, method: "POST", body: { comment_html: html } });
}

function wrapAsCommentHtml(title, body) {
  return `<p><strong>${htmlEscape(title)}</strong></p><pre><code>${htmlEscape(body)}</code></pre>`;
}

export function findLatestStageCommentFields(comments = [], title) {
  let best = null;
  for (const row of comments || []) {
    const body = stripHtml(row.comment_html || row.comment_stripped || "");
    const marker = `${title}:`;
    const index = body.indexOf(marker);
    if (index === -1) continue;
    const fields = parseYamlScalar(body.slice(index + marker.length));
    const ts = row.created_at ? Date.parse(row.created_at) : 0;
    if (!best || ts > best.ts) {
      best = {
        comment_id: row.id || null,
        created_at: row.created_at || null,
        fields,
        ts,
      };
    }
  }
  return best;
}

function parseCommentYamlFields(yaml) {
  const lines = String(yaml || "").split(/\r?\n/);
  return parseYamlScalar(lines.slice(1).join("\n"));
}

function equivalentControllerComment({ title, desiredYaml, latest }) {
  if (!latest) return false;
  const desired = parseCommentYamlFields(desiredYaml);
  const keys = COMPARABLE_COMMENT_FIELDS[title] || Object.keys(desired);
  return keys.every((key) => String(desired[key] || "") === String(latest.fields?.[key] || ""));
}

export const SCHEDULER_RUNTIME_READY_DECISION = "lock-blocked-runtime-not-ready";

/**
 * Overlay Stage 0.65 Runtime Executability onto an existing Stage 0.5/0.6
 * scheduler decision. If Stage 0.5 already blocked the lock, Stage 0.65
 * adds the runtime-ready evidence without overriding the existing block.
 * If Stage 0.5 allowed the lock and Stage 0.65 rejects, the combined
 * decision blocks the lock with `lock-blocked-runtime-not-ready` and
 * appends a `controller.runtime-ready` comment.
 */
export function applyStage065ToSchedulerDecision({
  decision,
  item,
  labelNames,
  capabilityRegistry,
  reviewer = "scheduler",
  now = new Date(),
} = {}) {
  const executability = evaluateRuntimeExecutability({
    item,
    labelNames,
    capabilityRegistry,
    now,
  });
  const runtimeReadyYaml = buildRuntimeReadyYaml({ executability, item, reviewer });
  const out = {
    ...decision,
    runtime_ready: {
      verdict: executability.verdict,
      ok: executability.ok,
      reason_codes: executability.reason_codes,
      suggestions: executability.suggestions,
      yaml: runtimeReadyYaml,
      comment_title: RUNTIME_READY_TITLE,
    },
    comments_to_post: [...decision.comments_to_post],
  };

  if (executability.verdict !== RUNTIME_READY_VERDICTS.SKIPPED) {
    out.comments_to_post.push({ title: RUNTIME_READY_TITLE, yaml: runtimeReadyYaml });
  }

  if (decision.allow_lock && executability.verdict === RUNTIME_READY_VERDICTS.REJECT) {
    out.allow_lock = false;
    out.decision = SCHEDULER_RUNTIME_READY_DECISION;
  }
  return out;
}

export function selectSchedulerStage0506CommentsToPost({
  commentsToPost = [],
  existingComments = [],
  dedupe = true,
} = {}) {
  return commentsToPost.map((comment) => {
    const latest = findLatestStageCommentFields(existingComments, comment.title);
    const skip = Boolean(dedupe && equivalentControllerComment({
      title: comment.title,
      desiredYaml: comment.yaml,
      latest,
    }));
    return {
      ...comment,
      should_post: !skip,
      skip_reason: skip ? "dedupe.same-description-and-route" : null,
      existing_comment_id: latest?.comment_id || null,
    };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const errors = validateArgs(args);
  const auth = resolvePlaneAuth(args.auth);
  if (!auth.ok) errors.push(auth.missingError);

  const result = {
    version: SCHEDULER_STAGE_0506_CLI_VERSION,
    mode: args.mode,
    authMode: auth.authMode,
    workspace: args.workspace || null,
    projectId: args.projectId || null,
    dedupe: args.dedupe,
    work_item: null,
    ok: errors.length === 0,
    errors,
    allow_lock: false,
    decision: null,
    actions: [],
  };

  if (errors.length) {
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  const fetched = await fetchWorkItem({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    workspace: args.workspace,
    projectId: args.projectId,
    workItemId: args.workItemId,
    sequenceId: args.sequenceId,
  });
  if (!fetched.ok) {
    result.ok = false;
    result.status = fetched.status;
    result.error = fetched.body;
    printResult(result, args.json);
    process.exitCode = 1;
    return;
  }

  const item = fetched.body;
  const projectIdentifier = await fetchProjectIdentifier({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    workspace: args.workspace,
    projectId: args.projectId,
  });
  if (projectIdentifier) item._project_identifier = projectIdentifier;
  result.work_item = {
    id: item.id,
    sequence_id: item.sequence_id ? formatPlaneWorkItemSequence(item) : null,
    name: item.name,
  };

  const labelMapPath = args.labelMap || defaultLabelMapPath({ workspace: args.workspace, projectId: args.projectId });
  const labelResolution = await resolvePlaneItemLabels({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    workspace: args.workspace,
    projectId: args.projectId,
    item,
    labelMapPath,
  });
  if (!labelResolution.ok && (labelResolution.labelIds || []).length > 0) {
    result.ok = false;
    result.label_resolution = labelResolution;
    result.actions.push({
      action: "reject",
      reasons: [labelResolution.reason],
      details: {
        source: labelResolution.source,
        api_status: labelResolution.api_status || null,
        label_map_path: labelMapPath,
      },
    });
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  const commentsResp = await fetchComments({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    workspace: args.workspace,
    projectId: args.projectId,
    workItemId: item.id,
  });
  if (!commentsResp.ok) {
    result.ok = false;
    result.status = commentsResp.status;
    result.error = commentsResp.body;
    printResult(result, args.json);
    process.exitCode = 1;
    return;
  }

  const labelNames = labelResolution.ok ? labelResolution.names : [];
  const registryLoad = loadCapabilityRegistry(args.capabilityRegistry);
  const capabilityRegistry = registryLoad.registry;
  result.capability_registry = {
    path: args.capabilityRegistry,
    ok: registryLoad.ok,
    reason_codes: registryLoad.reason_codes,
  };

  const baseDecision = decideSchedulerStage0506({
    item,
    labelNames,
    comments: commentsResp.body,
    reviewer: args.reviewer,
    capabilityRegistry,
  });

  let decision = baseDecision;
  if (args.runtimeReady === "on") {
    decision = applyStage065ToSchedulerDecision({
      decision: baseDecision,
      item,
      labelNames,
      capabilityRegistry,
      reviewer: args.reviewer,
    });
  }

  result.label_resolution = labelResolution;
  result.allow_lock = decision.allow_lock;
  result.decision = decision.decision;
  result.contract_review = {
    verdict: decision.contract_review.verdict,
    reason_codes: decision.contract_review.reason_codes,
    description_hash: decision.contract_review.description_hash,
  };
  result.remediation_route = decision.remediation_route ? {
    action: decision.remediation_route.action,
    route_owner: decision.remediation_route.route_owner,
    escalation_path: decision.remediation_route.escalation_path,
    founder_gate_required: decision.remediation_route.founder_gate_required,
    reason_codes: decision.remediation_route.reason_codes,
  } : null;
  result.runtime_ready = decision.runtime_ready ? {
    verdict: decision.runtime_ready.verdict,
    ok: decision.runtime_ready.ok,
    reason_codes: decision.runtime_ready.reason_codes,
    suggestions: decision.runtime_ready.suggestions,
  } : null;
  result.executive_routing = decision.executive_routing ? {
    decision: decision.executive_routing.decision,
    allow_lock: decision.executive_routing.allow_lock,
    reason_codes: decision.executive_routing.reason_codes,
    capability_profile_id: decision.executive_routing.capability_profile_id,
    evidence: decision.executive_routing.evidence,
  } : null;

  let selectedComments = decision.comments_to_post.map((comment) => ({
    ...comment,
    should_post: true,
    skip_reason: null,
    existing_comment_id: null,
  }));

  if (args.mode === "post" && args.dedupe === "on") {
    selectedComments = selectSchedulerStage0506CommentsToPost({
      commentsToPost: decision.comments_to_post,
      existingComments: commentsResp.body,
      dedupe: true,
    });
  }

  if (args.mode === "dry-run") {
    result.actions = selectedComments.map((comment) => ({
      action: "would-write-comment",
      comment_type: comment.title,
      preview: comment.yaml,
    }));
    printResult(result, args.json);
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  for (const comment of selectedComments) {
    if (!comment.should_post) {
      result.actions.push({
        action: "skipped-comment",
        comment_type: comment.title,
        reason: comment.skip_reason,
        existing_comment_id: comment.existing_comment_id,
      });
      continue;
    }
    const post = await postComment({
      baseUrl: args.baseUrl,
      authHeaders: auth.headers,
      workspace: args.workspace,
      projectId: args.projectId,
      workItemId: item.id,
      html: wrapAsCommentHtml(comment.title, comment.yaml),
    });
    result.actions.push({
      action: "wrote-comment",
      comment_type: comment.title,
      ok: post.ok,
      status: post.status,
      comment_id: post.ok && post.body?.id ? post.body.id : null,
    });
    if (!post.ok) {
      result.ok = false;
      result.error = post.body;
      break;
    }
  }

  printResult(result, args.json);
  process.exitCode = result.ok ? 0 : 1;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`Scheduler Stage 0.5/0.6: ${result.ok ? "ok" : "fail"}`);
  console.log(`mode: ${result.mode}`);
  console.log(`auth: ${result.authMode}`);
  if (result.work_item) {
    console.log(`work item: ${result.work_item.sequence_id || result.work_item.id} ${result.work_item.name || ""}`);
  }
  if (result.decision) {
    console.log(`decision: ${result.decision}`);
    console.log(`allow lock: ${result.allow_lock}`);
  }
  if (result.contract_review) {
    console.log(`contract review: ${result.contract_review.verdict}`);
    for (const code of result.contract_review.reason_codes || []) console.log(`contract reason: ${code}`);
  }
  if (result.runtime_ready) {
    console.log(`runtime ready: ${result.runtime_ready.verdict}`);
    for (const code of result.runtime_ready.reason_codes || []) console.log(`runtime ready reason: ${code}`);
  }
  if (result.executive_routing) {
    console.log(`executive routing: ${result.executive_routing.decision}`);
    for (const code of result.executive_routing.reason_codes || []) console.log(`executive routing reason: ${code}`);
  }
  if (result.remediation_route) {
    console.log(`remediation: ${result.remediation_route.action}`);
    console.log(`owner: ${result.remediation_route.route_owner}`);
    console.log(`escalation: ${result.remediation_route.escalation_path.join(" -> ") || "none"}`);
    for (const code of result.remediation_route.reason_codes || []) console.log(`remediation reason: ${code}`);
  }
  for (const action of result.actions || []) {
    if (action.action === "would-write-comment") {
      console.log(`would write comment: ${action.comment_type}`);
    } else if (action.action === "wrote-comment") {
      console.log(`wrote comment: ${action.comment_type} (HTTP ${action.status})`);
    } else if (action.action === "skipped-comment") {
      console.log(`skipped comment: ${action.comment_type} (${action.reason})`);
    } else if (action.action === "reject") {
      console.log(`rejected: ${action.reasons.join(", ")}`);
    }
  }
  for (const error of result.errors || []) console.log(`error: ${error}`);
  if (result.error) console.log(`error: ${JSON.stringify(result.error).slice(0, 300)}`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((error) => {
    console.error(`Scheduler Stage 0.5/0.6 failed: ${error.message}`);
    process.exitCode = 1;
  });
}
