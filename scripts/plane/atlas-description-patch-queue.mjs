#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { DEFAULT_BASE_URL, resolvePlaneAuth } from "./plane-auth.mjs";
import { buildDescriptionHtml } from "./plane-contract-materializer-core.mjs";
import { canonicalDescriptionHash } from "../orchestration/plane-html.mjs";
import { validateContract } from "../orchestration/worker-ledger-validator.mjs";

export const VERSION = "atlas-description-patch-queue/v0";

export function parseArgs(argv) {
  const args = {
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    auth: process.env.PLANE_AUTH_MODE || "app-token",
    workspace: process.env.PLANE_WORKSPACE_SLUG || "companyos",
    projectId: "",
    queueFile: "",
    refs: [],
    apply: false,
    confirmHumanGate: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--workspace") args.workspace = argv[++index] || "";
    else if (arg === "--project-id") args.projectId = argv[++index] || "";
    else if (arg === "--queue-file") args.queueFile = argv[++index] || "";
    else if (arg === "--ref") args.refs.push(argv[++index] || "");
    else if (arg === "--auth") args.auth = argv[++index] || "app-token";
    else if (arg === "--base-url") args.baseUrl = argv[++index] || DEFAULT_BASE_URL;
    else if (arg === "--apply") args.apply = true;
    else if (arg === "--confirm-human-gate") args.confirmHumanGate = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  args.refs = args.refs.map((ref) => ref.trim()).filter(Boolean);
  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  return args;
}

function usage() {
  return `Usage:
  node scripts/plane/atlas-description-patch-queue.mjs \\
    --project-id <uuid> \\
    --queue-file reports/atlas/super-goal/controller/[WORK_ITEM_ID]-patch-queue-2026-06-01.json \\
    [--ref [WORK_ITEM_ID] ...] \\
    [--apply --confirm-human-gate] \\
    [--auth app-token|api-key] [--json]

Dry-run by default. In apply mode, patches only work-item description_html from
the queue source markdown. It never changes state, labels, assignee, parent,
Done, or dispatch outcome. Apply requires --confirm-human-gate.`;
}

export function validateArgs(args) {
  const errors = [];
  if (!args.workspace) errors.push("--workspace is required");
  if (!args.projectId) errors.push("--project-id is required");
  if (!args.queueFile) errors.push("--queue-file is required");
  if (args.apply && !args.confirmHumanGate) {
    errors.push("--apply requires --confirm-human-gate");
  }
  return errors;
}

export function loadQueue(queueFile) {
  const queue = JSON.parse(readFileSync(queueFile, "utf8"));
  const items = Array.isArray(queue.patchable_items) ? queue.patchable_items : [];
  if (!items.length) throw new Error("queue has no patchable_items");
  return { ...queue, patchable_items: items };
}

export function roleFromMarkdown(markdown) {
  const match = String(markdown || "").match(/^role:\s*(role:[a-z]+)\s*$/mi);
  return match ? match[1].trim() : "";
}

export function validateSourceMarkdown(item) {
  const markdown = readFileSync(item.source_markdown, "utf8");
  const role = roleFromMarkdown(markdown);
  const verdict = validateContract({ description: markdown, labels: role ? [role] : [] });
  return {
    markdown,
    role,
    ok: verdict.ok,
    reason_codes: verdict.reason_codes || [],
  };
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
    parsed = { raw: text.slice(0, 1000) };
  }
  return { ok: response.ok, status: response.status, body: parsed };
}

async function fetchWorkItem({ args, authHeaders, workItemId }) {
  return requestJson({
    baseUrl: args.baseUrl,
    authHeaders,
    path: `/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/${encodeURIComponent(args.projectId)}/work-items/${encodeURIComponent(workItemId)}/`,
  });
}

async function patchDescription({ args, authHeaders, workItemId, descriptionHtml }) {
  return requestJson({
    baseUrl: args.baseUrl,
    authHeaders,
    method: "PATCH",
    path: `/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/${encodeURIComponent(args.projectId)}/work-items/${encodeURIComponent(workItemId)}/`,
    body: buildDescriptionPatchBody(descriptionHtml),
  });
}

export function buildDescriptionPatchBody(descriptionHtml) {
  return { description_html: String(descriptionHtml || "") };
}

export function selectQueueItems(queueItems = [], refs = []) {
  const wanted = new Set(refs);
  const selected = queueItems.filter((item) => !wanted.size || wanted.has(item.ref));
  const found = new Set(selected.map((item) => item.ref));
  const unknown = [...wanted].filter((ref) => !found.has(ref));
  return { selected, unknown };
}

export function buildPostPatchCommands({ workspace, projectId, ref, auth = "app-token" } = {}) {
  return [
    [
      "node",
      "scripts/orchestration/scheduler-stage-0506.mjs",
      "--workspace",
      workspace,
      "--project-id",
      projectId,
      "--sequence",
      ref,
      "--mode",
      "post",
      "--auth",
      auth,
      "--json",
    ].join(" "),
  ];
}

export function summarizeItem({ queueItem, source, current, nextHtml, workspace = "companyos", projectId = "" }) {
  const currentHash = current?.ok ? canonicalDescriptionHash(current.body) : null;
  const nextHash = canonicalDescriptionHash(nextHtml);
  return {
    ref: queueItem.ref,
    work_item_id: queueItem.work_item_id,
    source_markdown: queueItem.source_markdown,
    approval_required: queueItem.approval_required,
    target_posture: queueItem.target_posture,
    source_validation_ok: source.ok,
    source_reason_codes: source.reason_codes,
    role: source.role || null,
    current_fetch_ok: Boolean(current?.ok),
    current_status: current?.status || null,
    current_description_hash: currentHash,
    next_description_hash: nextHash,
    would_change: Boolean(currentHash && currentHash !== nextHash),
    post_patch_commands: buildPostPatchCommands({
      workspace,
      projectId,
      ref: queueItem.ref,
    }),
  };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return;
  }

  const errors = validateArgs(args);
  const auth = resolvePlaneAuth(args.auth);
  if (!auth.ok) errors.push(auth.missingError);

  let queue = null;
  if (!errors.length) {
    try {
      queue = loadQueue(args.queueFile);
    } catch (error) {
      errors.push(error.message);
    }
  }

  const result = {
    version: VERSION,
    mode: args.apply ? "apply" : "dry-run",
    authMode: auth.authMode,
    workspace: args.workspace || null,
    project_id: args.projectId || null,
    queue_file: args.queueFile || null,
    ok: errors.length === 0,
    errors,
    hard_boundaries: queue?.hard_boundaries || [],
    selected_refs: [],
    planned: [],
    updated: [],
    skipped: [],
    failed: [],
  };

  if (errors.length) {
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  const { selected, unknown } = selectQueueItems(queue.patchable_items, args.refs);
  result.selected_refs = selected.map((item) => item.ref);
  if (unknown.length) {
    result.ok = false;
    result.errors.push(`unknown refs: ${unknown.join(", ")}`);
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  for (const queueItem of selected) {
    let source = null;
    let nextHtml = "";
    try {
      source = validateSourceMarkdown(queueItem);
      nextHtml = buildDescriptionHtml(source.markdown, { root: "${LOCAL_WORKSPACE}" });
    } catch (error) {
      result.ok = false;
      result.failed.push({ ref: queueItem.ref, error: error.message });
      continue;
    }

    const current = await fetchWorkItem({
      args,
      authHeaders: auth.headers,
      workItemId: queueItem.work_item_id,
    });
    const summary = summarizeItem({
      queueItem,
      source,
      current,
      nextHtml,
      workspace: args.workspace,
      projectId: args.projectId,
    });
    result.planned.push(summary);

    if (!source.ok) {
      result.ok = false;
      result.failed.push({ ref: queueItem.ref, error: "source validation failed", reason_codes: source.reason_codes });
      continue;
    }
    if (!current.ok) {
      result.ok = false;
      result.failed.push({ ref: queueItem.ref, status: current.status, error: current.body });
      continue;
    }
    if (!summary.would_change) {
      result.skipped.push({ ref: queueItem.ref, reason: "description already matches source" });
      continue;
    }
    if (!args.apply) continue;

    const response = await patchDescription({
      args,
      authHeaders: auth.headers,
      workItemId: queueItem.work_item_id,
      descriptionHtml: nextHtml,
    });
    if (!response.ok) {
      result.ok = false;
      result.failed.push({ ref: queueItem.ref, status: response.status, error: response.body });
      continue;
    }
    result.updated.push({
      ref: queueItem.ref,
      work_item_id: queueItem.work_item_id,
      status: response.status,
      next_description_hash: summary.next_description_hash,
    });
  }

  printResult(result, args.json);
  if (!result.ok) process.exitCode = 1;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`ATLAS description patch queue: ${result.ok ? "pass" : "fail"}`);
  console.log(`mode: ${result.mode}`);
  console.log(`selected: ${result.selected_refs.join(", ") || "(none)"}`);
  console.log(`planned: ${result.planned.length}`);
  console.log(`updated: ${result.updated.length}`);
  console.log(`skipped: ${result.skipped.length}`);
  console.log(`failed: ${result.failed.length}`);
  for (const error of result.errors) console.log(`error: ${error}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`ATLAS description patch queue failed: ${error.message}`);
    process.exitCode = 1;
  });
}
