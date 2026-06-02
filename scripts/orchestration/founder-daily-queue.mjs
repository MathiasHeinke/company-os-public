#!/usr/bin/env node

/*
 * founder-daily-queue.mjs
 *
 * Founder Daily Queue Generator CLI.
 *
 * Reads Plane work items + comments for the configured project, builds
 * the deterministic founder review queue artifact (Markdown), and
 * optionally prints a JSON summary. The artifact lists items waiting
 * for HG-4 sign-before-dispatch and HG-3.5 sign-to-resume.
 *
 * Hard guarantees:
 *   - never POSTs to Plane, never edits a comment, never transitions state
 *   - never marks Done, never spawns a worker, never writes Linear
 *   - never prints token-shaped strings or secret excerpts
 *   - default output is read-only Markdown on disk + stdout summary
 *
 * Source of truth:
 *   docs/governance/human-gate-levels.md
 *   docs/operations/founder-daily-queue.md
 *   reports/audits/2026-05-11/agent-relay-pipeline-drafts.md
 *   scripts/plane/plane-auth.mjs (auth resolver, no token paste)
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  DEFAULT_BASE_URL,
  PLANE_API_KEY_ACCOUNT,
  PLANE_API_KEY_SERVICE,
  PLANE_APP_BOT_TOKEN_ACCOUNT,
  PLANE_APP_SERVICE,
  resolvePlaneAuth,
} from "../plane/plane-auth.mjs";
import {
  NO_TOKEN_MARKER,
  buildQueueModel,
  renderQueueJson,
  renderQueueMarkdown,
} from "./founder-daily-queue-core.mjs";

// Default Company.OS project anchor (see docs/operations/global-plane-auth-bridge.md).
const COMPA_PROJECT_ID = "3537d502-b5a7-4214-9f7d-8f571fb1cd1e";

// Contract gate marker. Presence in this file is the worker's claim that
// `rg -n no-token-shaped-output ...` finds an attestation here.
// no-token-shaped-output
void NO_TOKEN_MARKER;

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    auth: process.env.PLANE_AUTH_MODE || "app-token",
    workspace: process.env.PLANE_WORKSPACE_SLUG || "",
    projectId: process.env.PLANE_PROJECT_ID || "",
    output: "",
    date: "",
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--workspace") args.workspace = argv[++i] || "";
    else if (arg === "--project-id") args.projectId = argv[++i] || "";
    else if (arg === "--output") args.output = argv[++i] || "";
    else if (arg === "--date") args.date = argv[++i] || "";
    else if (arg === "--auth") args.auth = argv[++i] || "app-token";
    else if (arg === "--base-url") args.baseUrl = argv[++i] || DEFAULT_BASE_URL;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  return args;
}

function usage() {
  return `Usage:
  node scripts/orchestration/founder-daily-queue.mjs \\
    --workspace <slug> [--project-id <uuid>] \\
    --output <path/to/founder-queue.md> \\
    [--date YYYY-MM-DD] [--auth api-key|app-token] [--json]

Reads Plane work items and produces a deterministic Markdown queue of
HG-4 sign-before-dispatch and HG-3.5 sign-to-resume items. Never writes
to Plane, never marks any work item Done, never spawns a worker.

When --project-id is omitted, the CLI defaults to the COMPA project
anchor (${COMPA_PROJECT_ID}). Override with PLANE_PROJECT_ID env or the
flag for other Plane projects.

Auth resolution mirrors scripts/plane/plane-auth.mjs:
  api key:   ${PLANE_API_KEY_SERVICE} / ${PLANE_API_KEY_ACCOUNT}
  app token: ${PLANE_APP_SERVICE} / ${PLANE_APP_BOT_TOKEN_ACCOUNT}
`;
}

function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

async function requestJson({ baseUrl, authHeaders, path: urlPath }) {
  const response = await fetch(`${baseUrl}${urlPath}`, {
    method: "GET",
    headers: {
      ...authHeaders,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 500) }; }
  return { ok: response.ok, status: response.status, body };
}

function listResults(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.results)) return body.results;
  return [];
}

async function fetchAllWorkItems({ baseUrl, authHeaders, workspace, projectId }) {
  const rows = [];
  let cursor = "";
  const seen = new Set();
  for (let page = 0; page < 20; page += 1) {
    const qs = `fields=id,sequence_id,name,state,labels,updated_at,description_html&expand=state,labels&per_page=100`;
    const cursorPart = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
    const urlPath = `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/?${qs}${cursorPart}`;
    const resp = await requestJson({ baseUrl, authHeaders, path: urlPath });
    if (!resp.ok) {
      return { ok: false, status: resp.status, body: resp.body };
    }
    rows.push(...listResults(resp.body));
    const next = resp.body?.next_cursor || "";
    if (!next || seen.has(next)) break;
    seen.add(next);
    cursor = next;
  }
  return { ok: true, items: rows };
}

async function fetchComments({ baseUrl, authHeaders, workspace, projectId, workItemId }) {
  const urlPath = `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(workItemId)}/comments/`;
  const resp = await requestJson({ baseUrl, authHeaders, path: urlPath });
  if (!resp.ok) return { ok: false, status: resp.status, body: resp.body };
  return { ok: true, comments: listResults(resp.body) };
}

function labelNamesFromItem(item) {
  const raw = Array.isArray(item?.labels) ? item.labels : [];
  const out = [];
  for (const l of raw) {
    if (l && typeof l === "object" && typeof l.name === "string") out.push(l.name);
  }
  return out;
}

function printResult(result, asJson) {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${result.summary || JSON.stringify(result, null, 2)}\n`);
  }
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  mkdirSync(dir, { recursive: true });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(`${usage()}\n`); return; }

  const errors = [];
  if (!args.workspace) errors.push("--workspace is required");
  if (!args.projectId) args.projectId = COMPA_PROJECT_ID;
  if (!args.output) errors.push("--output is required");
  const auth = resolvePlaneAuth(args.auth);
  if (!auth.ok) errors.push(auth.missingError);

  const date = args.date || todayUtcDate();
  const result = {
    version: "founder-daily-queue-cli/v0",
    workspace: args.workspace,
    projectId: args.projectId,
    output: args.output,
    date,
    authMode: auth.authMode,
    ok: errors.length === 0,
    errors,
    marker: NO_TOKEN_MARKER,
  };

  if (errors.length) {
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  const itemsResp = await fetchAllWorkItems({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    workspace: args.workspace,
    projectId: args.projectId,
  });
  if (!itemsResp.ok) {
    result.ok = false;
    result.status = itemsResp.status;
    result.error = "failed-to-list-work-items";
    printResult(result, args.json);
    process.exitCode = 1;
    return;
  }

  // Fetch comments only for items whose description mentions a relevant
  // human_gate. This keeps the queue cheap for large projects.
  const candidates = itemsResp.items.filter((it) => {
    const desc = it?.description_html || "";
    return /\b(?:HG-4|HG-3\.5)\b/.test(desc);
  });

  const records = [];
  for (const item of candidates) {
    const commentsResp = await fetchComments({
      baseUrl: args.baseUrl,
      authHeaders: auth.headers,
      workspace: args.workspace,
      projectId: args.projectId,
      workItemId: item.id,
    });
    if (!commentsResp.ok) {
      // Skip the item, surface as malformed in the model.
      records.push({ item, comments: [], labelNames: labelNamesFromItem(item) });
      continue;
    }
    records.push({
      item,
      comments: commentsResp.comments,
      labelNames: labelNamesFromItem(item),
    });
  }

  const model = buildQueueModel({ records, date, workspace: args.workspace });
  const markdown = renderQueueMarkdown(model);

  try {
    ensureDir(args.output);
    writeFileSync(args.output, markdown, "utf8");
  } catch (err) {
    result.ok = false;
    result.error = `failed-to-write-output: ${err?.message || err}`;
    printResult(result, args.json);
    process.exitCode = 1;
    return;
  }

  const json = renderQueueJson(model);
  result.summary = [
    `founder-daily-queue: wrote ${args.output}`,
    `date: ${date}`,
    `total_in_scope: ${json.total_in_scope}`,
    `primary: ${json.primary_count}, overflow: ${json.overflow_count}, dropped: ${json.dropped}`,
    json.warnings.length ? `warnings: ${json.warnings.join("; ")}` : "warnings: none",
  ].join("\n");
  result.queue = json;
  printResult(result, args.json);
}

main().catch((err) => {
  process.stderr.write(`founder-daily-queue: ${err?.stack || err}\n`);
  process.exit(1);
});
