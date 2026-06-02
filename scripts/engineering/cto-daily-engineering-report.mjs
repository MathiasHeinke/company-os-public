#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  buildCtoDailyEngineeringReport,
  collectCtoEngineeringSignals,
  defaultOutputPaths,
  findEngineeringBriefForDate,
  localDate,
  renderCtoDailyEngineeringReportMarkdown,
} from "./cto-daily-engineering-report-core.mjs";
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
    workspaceRoots: [],
    workspace: "companyos",
    projectId: "",
    workItemId: "",
    auth: process.env.PLANE_AUTH_MODE || "app-token",
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    format: "markdown",
    write: false,
    out: "",
    jsonOut: "",
    postPlane: false,
    updateExisting: false,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--date") args.date = argv[++index] || args.date;
    else if (arg === "--company-root") args.companyRoot = argv[++index] || args.companyRoot;
    else if (arg === "--workspace-root") args.workspaceRoots.push(argv[++index] || "");
    else if (arg === "--workspace") args.workspace = argv[++index] || args.workspace;
    else if (arg === "--project-id") args.projectId = argv[++index] || "";
    else if (arg === "--work-item-id") args.workItemId = argv[++index] || "";
    else if (arg === "--auth") args.auth = argv[++index] || args.auth;
    else if (arg === "--base-url") args.baseUrl = argv[++index] || args.baseUrl;
    else if (arg === "--format") args.format = argv[++index] || args.format;
    else if (arg === "--write") args.write = true;
    else if (arg === "--out") args.out = argv[++index] || "";
    else if (arg === "--json-out") args.jsonOut = argv[++index] || "";
    else if (arg === "--post-plane") args.postPlane = true;
    else if (arg === "--update-existing") args.updateExisting = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.companyRoot = path.resolve(args.companyRoot);
  args.workspaceRoots = args.workspaceRoots.filter(Boolean).map((root) => path.resolve(root));
  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  return args;
}

function usage() {
  return `Usage:
  node scripts/engineering/cto-daily-engineering-report.mjs [--date YYYY-MM-DD] [--write]
  node scripts/engineering/cto-daily-engineering-report.mjs --post-plane --project-id <CMD uuid> --work-item-id <uuid>

Builds the CTO daily Engineering Department report. It never creates daily
Plane items, never marks Done, and never merges, deploys or releases.
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
  return `<p><strong>engineering.brief</strong></p><pre><code>${htmlEscape(markdown)}</code></pre>`;
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

  const signals = collectCtoEngineeringSignals({
    companyRoot: args.companyRoot,
    date: args.date,
    ...(args.workspaceRoots.length ? { workspaceRoots: args.workspaceRoots } : {}),
  });
  const brief = buildCtoDailyEngineeringReport({ signals });
  const markdown = renderCtoDailyEngineeringReportMarkdown(brief);
  const paths = defaultOutputPaths({ companyRoot: args.companyRoot, date: args.date });
  const markdownPath = args.out ? path.resolve(args.out) : paths.markdownPath;
  const jsonPath = args.jsonOut ? path.resolve(args.jsonOut) : paths.jsonPath;

  const result = {
    ok: true,
    version: brief.version,
    date: args.date,
    status: brief.status,
    write: args.write,
    post_plane: args.postPlane,
    markdown_path: args.write ? markdownPath : "",
    json_path: args.write ? jsonPath : "",
    plane: null,
  };

  if (args.write) {
    fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(markdownPath, markdown);
    fs.writeFileSync(jsonPath, `${JSON.stringify(brief, null, 2)}\n`);
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
    const existingComment = findEngineeringBriefForDate(comments.body, args.date);
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
        status: patched.status,
        action: "patched_existing",
        comment_id: existingComment.id,
        response: patched.body,
      };
    } else if (existingComment) {
      result.plane = {
        ok: true,
        status: comments.status,
        action: "skipped_existing",
        comment_id: existingComment.id,
      };
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
        status: posted.status,
        action: "posted",
        response: posted.body,
      };
    }
    if (!result.ok) process.exitCode = 1;
  }

  if (args.json || args.format === "json") console.log(JSON.stringify(result, null, 2));
  else console.log(markdown);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
