#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { DEFAULT_BASE_URL, resolvePlaneAuth } from "./plane-auth.mjs";

export const VERSION = "atlas-576-split-materialization-apply/v0";
export const EXPECTED = Object.freeze({
  workspace: "companyos",
  projectId: "268df2ed-a071-4cc8-a394-595e4b7353c2",
  parentId: "1f627f33-719c-4497-a173-4ea400df02c9",
  externalSource: "atlas-576-split-materialization",
  externalIds: [
    "atlas-576-split:g6-non-prod-write-smoke",
    "atlas-576-split:g7-copy-claim-founder-record",
  ],
});

export function parseArgs(argv) {
  const args = {
    workspace: EXPECTED.workspace,
    projectId: EXPECTED.projectId,
    parentId: EXPECTED.parentId,
    planFile: "reports/atlas/super-goal/controller/[WORK_ITEM_ID]-materialization-plan-2026-06-01.json",
    baseUrl: DEFAULT_BASE_URL,
    auth: "app-token",
    apply: false,
    confirmHumanGate: false,
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--workspace") args.workspace = argv[++index] || "";
    else if (arg === "--project-id") args.projectId = argv[++index] || "";
    else if (arg === "--parent-id") args.parentId = argv[++index] || "";
    else if (arg === "--plan-file") args.planFile = argv[++index] || "";
    else if (arg === "--base-url") args.baseUrl = argv[++index] || "";
    else if (arg === "--auth") args.auth = argv[++index] || "";
    else if (arg === "--apply") args.apply = true;
    else if (arg === "--confirm-human-gate") args.confirmHumanGate = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

export function validateArgs(args) {
  const errors = [];
  if (!args.workspace) errors.push("--workspace is required");
  if (!args.projectId) errors.push("--project-id is required");
  if (!args.parentId) errors.push("--parent-id is required");
  if (!args.planFile) errors.push("--plan-file is required");
  if (!args.baseUrl) errors.push("--base-url is required");
  if (args.apply && !args.confirmHumanGate) {
    errors.push("--apply requires --confirm-human-gate");
  }
  return errors;
}

function usage() {
  return `Usage:
  node scripts/plane/atlas-576-split-materialization-apply.mjs --json

Dry-run validates the [WORK_ITEM_ID] split materialization plan and checks existing
Plane items by external_id. Apply mode is create-only and requires both
--apply and --confirm-human-gate. This script never updates existing items and
never marks Plane Done.`;
}

export function readPlan(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function buildCreatePlan({ splitPlan, args, existingRows = [] }) {
  const errors = [];
  if (splitPlan?.ok !== true) errors.push("split plan is not ok");
  if (splitPlan?.project_id !== args.projectId) errors.push("split plan project_id mismatch");
  if (splitPlan?.parent_id !== args.parentId) errors.push("split plan parent_id mismatch");
  if (splitPlan?.external_source !== EXPECTED.externalSource) errors.push("split plan external_source mismatch");

  const planned = Array.isArray(splitPlan?.planned) ? splitPlan.planned : [];
  const externalIds = planned.map((row) => row?.payload?.external_id).filter(Boolean).sort();
  if (JSON.stringify(externalIds) !== JSON.stringify([...EXPECTED.externalIds].sort())) {
    errors.push("split plan external_id set mismatch");
  }

  const existingByExternalId = new Map();
  for (const row of existingRows) {
    if (row?.external_source === EXPECTED.externalSource && row?.external_id) {
      existingByExternalId.set(row.external_id, row);
    }
  }

  const items = [];
  for (const row of planned) {
    const payload = row?.payload || {};
    const externalId = payload.external_id || "";
    const existing = existingByExternalId.get(externalId) || null;
    const itemErrors = validatePayload({ row, payload, args });
    errors.push(...itemErrors.map((error) => `${externalId || row?.slug || "unknown"}: ${error}`));
    items.push({
      slug: row?.slug || null,
      ref_hint: row?.ref_hint || null,
      external_id: externalId,
      validation_ok: row?.validation_ok === true,
      payload_is_authoritative: row?.payload_is_authoritative === true,
      exists: Boolean(existing),
      existing: existing ? sanitizeExisting(existing) : null,
      action: existing ? "skip-existing" : "create",
      payload: {
        name: payload.name,
        description_html: payload.description_html,
        labels: payload.labels,
        parent: payload.parent,
        priority: payload.priority,
        external_source: payload.external_source,
        external_id: payload.external_id,
      },
    });
  }

  return {
    version: VERSION,
    mode: "dry-run-create-only",
    ok: errors.length === 0,
    errors,
    workspace: args.workspace,
    project_id: args.projectId,
    parent_id: args.parentId,
    external_source: EXPECTED.externalSource,
    apply: args.apply,
    planned: items,
    to_create: items.filter((item) => item.action === "create").map((item) => item.external_id),
    skipped_existing: items.filter((item) => item.action === "skip-existing").map((item) => item.external_id),
    hard_boundaries: [
      "create_only",
      "no_update_existing",
      "no_plane_done",
      "no_worker_spawn",
      "no_merge",
      "no_push",
      "no_pr",
      "no_deploy",
      "no_production_write",
      "no_schema_rls_auth_apply",
    ],
  };
}

function validatePayload({ row, payload, args }) {
  const errors = [];
  if (row?.validation_ok !== true) errors.push("source contract validation is not ok");
  if (row?.payload_is_authoritative !== true) errors.push("payload is not authoritative");
  if (!payload.name) errors.push("payload.name missing");
  if (!payload.description_html) errors.push("payload.description_html missing");
  if (!Array.isArray(payload.labels) || payload.labels.length !== 1) errors.push("payload.labels must contain exactly one role label");
  if (payload.parent !== args.parentId) errors.push("payload.parent must be [WORK_ITEM_ID] parent id");
  if (payload.external_source !== EXPECTED.externalSource) errors.push("payload.external_source mismatch");
  if (!EXPECTED.externalIds.includes(payload.external_id)) errors.push("payload.external_id is not an expected [WORK_ITEM_ID] split id");
  return errors;
}

function sanitizeExisting(item) {
  return {
    id: item.id || null,
    sequence_id: item.sequence_id || null,
    name: item.name || null,
    external_source: item.external_source || null,
    external_id: item.external_id || null,
  };
}

export async function listExisting({ args, authHeaders, fetchImpl = fetch }) {
  const qs = new URLSearchParams({
    fields: "id,sequence_id,name,external_source,external_id,parent",
    per_page: "500",
  });
  const url = `${args.baseUrl}/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/${encodeURIComponent(args.projectId)}/work-items/?${qs}`;
  const response = await fetchImpl(url, { headers: authHeaders });
  const body = await readResponseBody(response);
  if (!response.ok) return { ok: false, status: response.status, error: body, rows: [] };
  return { ok: true, status: response.status, rows: rowsFromList(body) };
}

export async function createMissingItems({ args, authHeaders, plan, fetchImpl = fetch }) {
  const created = [];
  const failed = [];
  for (const item of plan.planned.filter((row) => row.action === "create")) {
    const response = await fetchImpl(
      `${args.baseUrl}/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/${encodeURIComponent(args.projectId)}/work-items/`,
      {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      },
    );
    const body = await readResponseBody(response);
    if (!response.ok) {
      failed.push({ external_id: item.external_id, status: response.status, error: body });
    } else {
      created.push(sanitizeExisting(body));
    }
  }
  return { ok: failed.length === 0, created, failed };
}

function rowsFromList(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.results)) return body.results;
  return [];
}

async function readResponseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function evaluateFromFiles(args, fetchImpl = fetch) {
  const auth = resolvePlaneAuth(args.auth);
  const errors = validateArgs(args);
  if (!auth.ok) errors.push(auth.missingError);
  if (errors.length) {
    return { version: VERSION, ok: false, errors, planned: [], created: [], failed: [] };
  }

  const existing = await listExisting({ args, authHeaders: auth.headers, fetchImpl });
  if (!existing.ok) {
    return { version: VERSION, ok: false, errors: [`Plane list failed: ${existing.status}`], list_error: existing.error, planned: [], created: [], failed: [] };
  }

  const plan = buildCreatePlan({
    splitPlan: readPlan(args.planFile),
    args,
    existingRows: existing.rows,
  });
  if (!plan.ok || !args.apply) return { ...plan, created: [], failed: [] };

  const writes = await createMissingItems({ args, authHeaders: auth.headers, plan, fetchImpl });
  return {
    ...plan,
    ok: writes.ok,
    created: writes.created,
    failed: writes.failed,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return;
  }
  let result = null;
  try {
    result = await evaluateFromFiles(args);
  } catch (error) {
    result = { version: VERSION, ok: false, errors: [error.message], planned: [], created: [], failed: [] };
  }
  printResult(result, args.json);
  if (!result.ok) process.exitCode = 2;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`[WORK_ITEM_ID] split materialization apply: ${result.ok ? "pass" : "fail"}`);
  console.log(`to_create: ${result.to_create?.length || 0}`);
  console.log(`created: ${result.created?.length || 0}`);
  for (const error of result.errors || []) console.log(`error: ${error}`);
  for (const failed of result.failed || []) console.log(`failed: ${failed.external_id}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
