#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  buildCmoMorningBrief,
  collectCmoMorningBriefSignals,
  defaultOutputPaths,
  findMorningBriefCommentForDate,
  hasMorningBriefForDate,
  localDate,
  renderCmoMorningBriefMarkdown,
} from "./cmo-morning-briefing-core.mjs";
import {
  DEFAULT_BASE_URL,
  PLANE_API_KEY_ACCOUNT,
  PLANE_API_KEY_SERVICE,
  PLANE_APP_BOT_TOKEN_ACCOUNT,
  PLANE_APP_SERVICE,
  resolvePlaneAuth,
} from "../plane/plane-auth.mjs";

function parseArgs(argv) {
  const args = {
    date: localDate(),
    companyRoot: process.cwd(),
    aresWebsiteRoot: "${LOCAL_WORKSPACE}",
    workspace: "companyos",
    projectId: "",
    workItemId: "",
    auth: process.env.PLANE_AUTH_MODE || "app-token",
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    format: "markdown",
    write: false,
    postPlane: false,
    updateExisting: false,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--date") args.date = argv[++index] || args.date;
    else if (arg === "--company-root") args.companyRoot = argv[++index] || args.companyRoot;
    else if (arg === "--[SOURCE_WORKSPACE]-root") args.aresWebsiteRoot = argv[++index] || args.aresWebsiteRoot;
    else if (arg === "--workspace") args.workspace = argv[++index] || args.workspace;
    else if (arg === "--project-id") args.projectId = argv[++index] || "";
    else if (arg === "--work-item-id") args.workItemId = argv[++index] || "";
    else if (arg === "--auth") args.auth = argv[++index] || args.auth;
    else if (arg === "--base-url") args.baseUrl = argv[++index] || args.baseUrl;
    else if (arg === "--format") args.format = argv[++index] || args.format;
    else if (arg === "--write") args.write = true;
    else if (arg === "--post-plane") args.postPlane = true;
    else if (arg === "--update-existing") args.updateExisting = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.companyRoot = path.resolve(args.companyRoot);
  args.aresWebsiteRoot = path.resolve(args.aresWebsiteRoot);
  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  return args;
}

function usage() {
  return `Usage:
  node scripts/marketing/cmo-morning-briefing.mjs [--date YYYY-MM-DD] [--write]
  node scripts/marketing/cmo-morning-briefing.mjs --post-plane --project-id <CMD uuid> --work-item-id <uuid>

Builds the CMO daily department report. It never creates daily Plane items.
With --post-plane it appends one dated Plane comment. With --update-existing it
patches that dated comment instead of skipping it.

Keychain fallback:
  api key:   ${PLANE_API_KEY_SERVICE} / ${PLANE_API_KEY_ACCOUNT}
  app token: ${PLANE_APP_SERVICE} / ${PLANE_APP_BOT_TOKEN_ACCOUNT}
`;
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function commentHtml(markdown) {
  return `<p><strong>morning.brief</strong></p><pre><code>${htmlEscape(markdown)}</code></pre>`;
}

async function requestJson({ baseUrl, authHeaders, path: apiPath, method = "GET", body }) {
  const response = await fetch(`${baseUrl}${apiPath}`, {
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

async function fetchComments({ baseUrl, authHeaders, workspace, projectId, workItemId }) {
  const apiPath = `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(workItemId)}/comments/`;
  const response = await requestJson({ baseUrl, authHeaders, path: apiPath });
  if (!response.ok) return response;
  return {
    ok: true,
    status: response.status,
    body: Array.isArray(response.body) ? response.body : (response.body?.results || []),
  };
}

async function postComment({ baseUrl, authHeaders, workspace, projectId, workItemId, markdown }) {
  const apiPath = `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(workItemId)}/comments/`;
  return requestJson({
    baseUrl,
    authHeaders,
    path: apiPath,
    method: "POST",
    body: { comment_html: commentHtml(markdown) },
  });
}

async function patchComment({ baseUrl, authHeaders, workspace, projectId, workItemId, commentId, markdown }) {
  const apiPath = `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(workItemId)}/comments/${encodeURIComponent(commentId)}/`;
  return requestJson({
    baseUrl,
    authHeaders,
    path: apiPath,
    method: "PATCH",
    body: { comment_html: commentHtml(markdown) },
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) throw new Error("--date must be YYYY-MM-DD");
  if (!["markdown", "json"].includes(args.format)) throw new Error("--format must be markdown or json");

  const signals = collectCmoMorningBriefSignals({
    companyRoot: args.companyRoot,
    aresWebsiteRoot: args.aresWebsiteRoot,
    date: args.date,
  });
  const brief = buildCmoMorningBrief({ signals });
  const markdown = renderCmoMorningBriefMarkdown(brief);
  const paths = defaultOutputPaths({ companyRoot: args.companyRoot, date: args.date });

  const result = {
    ok: true,
    version: brief.version,
    date: args.date,
    status: brief.status,
    write: args.write,
    post_plane: args.postPlane,
    markdown_path: args.write ? paths.markdownPath : "",
    json_path: args.write ? paths.jsonPath : "",
    plane: null,
  };

  if (args.write) {
    fs.mkdirSync(paths.outputDir, { recursive: true });
    fs.writeFileSync(paths.markdownPath, markdown);
    fs.writeFileSync(paths.jsonPath, `${JSON.stringify(brief, null, 2)}\n`);
  }

  if (args.postPlane) {
    const errors = [];
    if (!args.projectId) errors.push("--project-id is required with --post-plane");
    if (!args.workItemId) errors.push("--work-item-id is required with --post-plane");
    const auth = resolvePlaneAuth(args.auth);
    if (!auth.ok) errors.push(auth.missingError);
    if (errors.length) {
      result.ok = false;
      result.errors = errors;
      if (args.json) console.log(JSON.stringify(result, null, 2));
      else console.error(errors.join("\n"));
      process.exitCode = 2;
      return;
    }

    const comments = await fetchComments({
      baseUrl: args.baseUrl,
      authHeaders: auth.headers,
      workspace: args.workspace,
      projectId: args.projectId,
      workItemId: args.workItemId,
    });
    if (!comments.ok) {
      result.ok = false;
      result.plane = { ok: false, status: comments.status, error: comments.body };
      if (args.json) console.log(JSON.stringify(result, null, 2));
      else console.error(JSON.stringify(result.plane));
      process.exitCode = 1;
      return;
    }
    const existingComment = findMorningBriefCommentForDate(comments.body, args.date);
    if (existingComment && args.updateExisting) {
      const patched = await patchComment({
        baseUrl: args.baseUrl,
        authHeaders: auth.headers,
        workspace: args.workspace,
        projectId: args.projectId,
        workItemId: args.workItemId,
        commentId: existingComment.id,
        markdown,
      });
      result.ok = patched.ok;
      result.plane = {
        ok: patched.ok,
        action: "patch-existing-date",
        status: patched.status,
        comment_id: existingComment.id,
      };
      if (!patched.ok) result.plane.error = patched.body;
    } else if (existingComment || hasMorningBriefForDate(comments.body, args.date)) {
      result.plane = { ok: true, action: "skip-existing-date", status: comments.status, comment_id: existingComment?.id || null };
    } else {
      const posted = await postComment({
        baseUrl: args.baseUrl,
        authHeaders: auth.headers,
        workspace: args.workspace,
        projectId: args.projectId,
        workItemId: args.workItemId,
        markdown,
      });
      result.ok = posted.ok;
      result.plane = {
        ok: posted.ok,
        action: "post-comment",
        status: posted.status,
        comment_id: posted.body?.id || null,
      };
      if (!posted.ok) result.plane.error = posted.body;
    }
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (args.format === "json") {
    console.log(JSON.stringify(brief, null, 2));
    return;
  }
  process.stdout.write(markdown);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
