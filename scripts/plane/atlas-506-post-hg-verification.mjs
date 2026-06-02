#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { DEFAULT_BASE_URL, resolvePlaneAuth } from "./plane-auth.mjs";
import { buildDescriptionHtml } from "./plane-contract-materializer-core.mjs";
import { canonicalDescriptionHash } from "../orchestration/plane-html.mjs";
import { validateSourceMarkdown } from "./atlas-description-patch-queue.mjs";
import { EXPECTED as SPLIT_EXPECTED } from "./atlas-576-split-materialization-apply.mjs";

export const VERSION = "atlas-506-post-hg-verification/v0";

export function parseArgs(argv) {
  const args = {
    workspace: "companyos",
    projectId: "268df2ed-a071-4cc8-a394-595e4b7353c2",
    queueFile: "reports/atlas/super-goal/controller/[WORK_ITEM_ID]-patch-queue-2026-06-01.json",
    splitPlanFile: "reports/atlas/super-goal/controller/[WORK_ITEM_ID]-materialization-plan-2026-06-01.json",
    baseUrl: DEFAULT_BASE_URL,
    auth: "app-token",
    refs: [],
    verifySplitChildren: false,
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--workspace") args.workspace = argv[++index] || "";
    else if (arg === "--project-id") args.projectId = argv[++index] || "";
    else if (arg === "--queue-file") args.queueFile = argv[++index] || "";
    else if (arg === "--split-plan-file") args.splitPlanFile = argv[++index] || "";
    else if (arg === "--base-url") args.baseUrl = argv[++index] || "";
    else if (arg === "--auth") args.auth = argv[++index] || "";
    else if (arg === "--ref") args.refs.push(argv[++index] || "");
    else if (arg === "--verify-split-children") args.verifySplitChildren = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.refs = args.refs.map((ref) => ref.trim()).filter(Boolean);
  return args;
}

export function validateArgs(args) {
  const errors = [];
  if (!args.workspace) errors.push("--workspace is required");
  if (!args.projectId) errors.push("--project-id is required");
  if (!args.queueFile) errors.push("--queue-file is required");
  if (!args.splitPlanFile) errors.push("--split-plan-file is required");
  if (!args.refs.length && !args.verifySplitChildren) {
    errors.push("nothing to verify: pass --ref [WORK_ITEM_ID] and/or --verify-split-children");
  }
  return errors;
}

function usage() {
  return `Usage:
  node scripts/plane/atlas-506-post-hg-verification.mjs \\
    --ref [WORK_ITEM_ID] \\
    --verify-split-children \\
    --json

Verifies that later HumanGate-approved Plane actions actually landed before
the scheduler/dispatcher continues. This script is read-only: it never patches,
creates, dispatches, marks Done or mutates Plane.`;
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function buildExpectedDescriptionRows({ queue, refs, root = "${LOCAL_WORKSPACE}" }) {
  const wanted = new Set(refs);
  const items = (queue.patchable_items || []).filter((item) => wanted.has(item.ref));
  const found = new Set(items.map((item) => item.ref));
  const unknown = [...wanted].filter((ref) => !found.has(ref));
  const rows = [];
  for (const item of items) {
    const source = validateSourceMarkdown(item);
    const expectedHtml = buildDescriptionHtml(source.markdown, { root });
    rows.push({
      ref: item.ref,
      work_item_id: item.work_item_id,
      expected_hash: canonicalDescriptionHash(expectedHtml),
      source_validation_ok: source.ok,
      source_reason_codes: source.reason_codes || [],
    });
  }
  return { rows, unknown };
}

export function verifyDescriptions({ expectedRows, workItemsById }) {
  return expectedRows.map((row) => {
    const current = workItemsById.get(row.work_item_id);
    const actualHash = current ? canonicalDescriptionHash(current) : null;
    return {
      ref: row.ref,
      work_item_id: row.work_item_id,
      ok: row.source_validation_ok && Boolean(current) && actualHash === row.expected_hash,
      source_validation_ok: row.source_validation_ok,
      source_reason_codes: row.source_reason_codes,
      current_fetch_ok: Boolean(current),
      expected_hash: row.expected_hash,
      actual_hash: actualHash,
      status: !current ? "missing" : (actualHash === row.expected_hash ? "patched" : "hash_mismatch"),
    };
  });
}

export function verifySplitChildren({ splitPlan, existingRows }) {
  const expectedByExternalId = new Map(
    (splitPlan.planned || []).map((row) => [row.payload?.external_id, row.payload]).filter(([id]) => id),
  );
  const existingByExternalId = new Map();
  for (const row of existingRows || []) {
    if (row?.external_source === SPLIT_EXPECTED.externalSource && row?.external_id) {
      existingByExternalId.set(row.external_id, row);
    }
  }
  return SPLIT_EXPECTED.externalIds.map((externalId) => {
    const expected = expectedByExternalId.get(externalId);
    const existing = existingByExternalId.get(externalId);
    const parent = normalizeParent(existing?.parent);
    const labelIds = normalizeLabels(existing?.labels);
    const expectedLabels = Array.isArray(expected?.labels) ? expected.labels : [];
    return {
      external_id: externalId,
      ok: Boolean(existing)
        && parent === SPLIT_EXPECTED.parentId
        && expectedLabels.every((label) => labelIds.includes(label)),
      exists: Boolean(existing),
      sequence_id: existing?.sequence_id || null,
      id: existing?.id || null,
      parent,
      expected_parent: SPLIT_EXPECTED.parentId,
      label_ids: labelIds,
      expected_labels: expectedLabels,
      status: !existing ? "missing" : "present",
    };
  });
}

function normalizeParent(parent) {
  if (!parent) return null;
  if (typeof parent === "string") return parent;
  return parent.id || null;
}

function normalizeLabels(labels) {
  if (!Array.isArray(labels)) return [];
  return labels.map((label) => {
    if (typeof label === "string") return label;
    return label.id || label.name || "";
  }).filter(Boolean);
}

export function buildVerificationResult({ descriptionChecks = [], splitChecks = [], errors = [] }) {
  const failedDescriptions = descriptionChecks.filter((row) => !row.ok);
  const failedSplit = splitChecks.filter((row) => !row.ok);
  return {
    version: VERSION,
    ok: errors.length === 0 && failedDescriptions.length === 0 && failedSplit.length === 0,
    errors,
    description_checks: descriptionChecks,
    split_child_checks: splitChecks,
    failed_description_refs: failedDescriptions.map((row) => row.ref),
    failed_split_external_ids: failedSplit.map((row) => row.external_id),
    hard_boundaries: [
      "read_only",
      "no_plane_write",
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

export async function fetchWorkItemDescriptions({ args, authHeaders, expectedRows, fetchImpl = fetch }) {
  const byId = new Map();
  for (const row of expectedRows) {
    const response = await fetchImpl(`${args.baseUrl}/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/${encodeURIComponent(args.projectId)}/work-items/${encodeURIComponent(row.work_item_id)}/`, {
      headers: authHeaders,
    });
    if (!response.ok) continue;
    const body = await readResponseBody(response);
    byId.set(row.work_item_id, body);
  }
  return byId;
}

export async function listExistingSplitRows({ args, authHeaders, fetchImpl = fetch }) {
  const qs = new URLSearchParams({
    fields: "id,sequence_id,name,parent,labels,external_source,external_id",
    expand: "parent,labels",
    per_page: "500",
  });
  const response = await fetchImpl(`${args.baseUrl}/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/${encodeURIComponent(args.projectId)}/work-items/?${qs}`, {
    headers: authHeaders,
  });
  const body = await readResponseBody(response);
  if (!response.ok) return { ok: false, status: response.status, error: body, rows: [] };
  return { ok: true, rows: rowsFromList(body) };
}

export async function evaluateFromFiles(args, fetchImpl = fetch) {
  const errors = validateArgs(args);
  const auth = resolvePlaneAuth(args.auth);
  if (!auth.ok) errors.push(auth.missingError);
  if (errors.length) return buildVerificationResult({ errors });

  const queue = readJson(args.queueFile);
  const splitPlan = readJson(args.splitPlanFile);
  const expected = buildExpectedDescriptionRows({ queue, refs: args.refs });
  if (expected.unknown.length) errors.push(`unknown refs: ${expected.unknown.join(", ")}`);

  const workItemsById = await fetchWorkItemDescriptions({
    args,
    authHeaders: auth.headers,
    expectedRows: expected.rows,
    fetchImpl,
  });
  const descriptionChecks = verifyDescriptions({ expectedRows: expected.rows, workItemsById });

  let splitChecks = [];
  if (args.verifySplitChildren) {
    const existing = await listExistingSplitRows({ args, authHeaders: auth.headers, fetchImpl });
    if (!existing.ok) errors.push(`Plane split list failed: ${existing.status}`);
    else splitChecks = verifySplitChildren({ splitPlan, existingRows: existing.rows });
  }

  return buildVerificationResult({ descriptionChecks, splitChecks, errors });
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
    result = buildVerificationResult({ errors: [error.message] });
  }
  printResult(result, args.json);
  if (!result.ok) process.exitCode = 2;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`[WORK_ITEM_ID] post-HG verification: ${result.ok ? "pass" : "fail"}`);
  for (const ref of result.failed_description_refs || []) console.log(`description failed: ${ref}`);
  for (const id of result.failed_split_external_ids || []) console.log(`split child failed: ${id}`);
  for (const error of result.errors || []) console.log(`error: ${error}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
