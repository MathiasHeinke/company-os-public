#!/usr/bin/env node

// Idempotent materializer for the 2026-06-05 Command EVE 0.8/0.9 closure
// supergoal promoted into 1.0.0-alpha.3. Dry-run by default; --apply creates or
// updates Plane work items via the Company.OS Plane App auth bridge.

import { DEFAULT_BASE_URL, resolvePlaneAuth } from "./plane-auth.mjs";
import {
  DEFAULT_EXTERNAL_SOURCE,
  planContractMaterialization,
} from "./plane-contract-materializer-core.mjs";

const PROJECT_ID = "3537d502-b5a7-4214-9f7d-8f571fb1cd1e"; // CompanyOS / COMPA
const WORKSPACE = "companyos";
const EXTERNAL_PREFIX = "command-eve-alpha2-08-09-closure-supergoal-2026-06-05";
const LABEL_MAP = `runtime/plane-label-map/${WORKSPACE}-${PROJECT_ID}.json`;
const BASE = "docs/templates/supergoals-2026-06-05";
const TARGET_DATE = "2026-06-05";

const EXTRA_LABELS = [
  { name: "track:08-09-closure", color: "#F97316", description: "Command EVE 0.8/0.9 closure under alpha3" },
  { name: "version:1.0.0-alpha3", color: "#111827", description: "Command EVE 1.0.0-alpha.3 closure line" },
  { name: "gate:hg4-publish", color: "#EF4444", description: "HG-4 publish decision required" },
  { name: "status:closure-supergoal", color: "#6366F1", description: "Materialized closure supergoal lane" },
];

const CONTRACT_EXTRA_LABELS = {
  "command-eve-alpha2-absorbed-install-closeout": ["version:0.9.x", "status:absorbed-alpha2"],
  "command-eve-alpha2-department-dashboard-review-cards": ["version:0.8.x", "status:open-gap"],
  "command-eve-alpha2-post-worker-quality-hotfix-autonomy": ["version:0.8.x", "version:0.9.x", "status:open-gap"],
  "command-eve-alpha2-support-security-privacy-license-gate": ["version:0.9.x", "status:open-gap"],
  "command-eve-alpha2-scheduler-killswitch-budget-brake": ["version:0.9.x", "status:open-gap"],
  "command-eve-alpha2-ladder-context-topology-integration": ["version:0.8.x", "version:0.9.x", "status:partial-alpha2"],
  "command-eve-alpha2-self-observability-watchdog": ["version:0.9.x", "status:open-gap"],
  "command-eve-alpha2-plugin-connector-onboarding-harness": ["version:0.9.x", "status:open-gap"],
  "command-eve-alpha2-remote-onboarding-pilot-handoff": ["version:0.9.x", "status:partial-alpha2"],
  "command-eve-alpha2-cao-security-code-review-hotfix-gate": ["status:open-gap"],
};

const LABEL_SEED = [
  ...EXTRA_LABELS,
  { name: "version:0.8.x", color: "#0EA5E9", description: "Historical Command EVE 0.8.x work band" },
  { name: "version:0.9.x", color: "#22C55E", description: "Historical Command EVE 0.9.x work band" },
  { name: "status:absorbed-alpha2", color: "#10B981", description: "Covered by alpha2 evidence but not auto-Done" },
  { name: "status:partial-alpha2", color: "#F59E0B", description: "Partially covered by alpha2; needs closeout" },
  { name: "status:open-gap", color: "#EF4444", description: "Open gap below alpha2" },
];

const PRIORITY = {
  "command-eve-alpha2-08-09-closure-parent": "urgent",
  "command-eve-alpha2-cao-security-code-review-hotfix-gate": "urgent",
  "command-eve-alpha2-support-security-privacy-license-gate": "urgent",
  "command-eve-alpha2-post-worker-quality-hotfix-autonomy": "urgent",
  "command-eve-alpha2-scheduler-killswitch-budget-brake": "high",
};

const CONTRACT_SET = [
  { slug: "command-eve-alpha2-08-09-closure-parent", file: `${BASE}/command-eve-alpha2-08-09-closure-parent.md` },
  { slug: "command-eve-alpha2-absorbed-install-closeout", parentSlug: "command-eve-alpha2-08-09-closure-parent", file: `${BASE}/command-eve-alpha2-absorbed-install-closeout.md` },
  { slug: "command-eve-alpha2-department-dashboard-review-cards", parentSlug: "command-eve-alpha2-08-09-closure-parent", file: `${BASE}/command-eve-alpha2-department-dashboard-review-cards.md` },
  { slug: "command-eve-alpha2-post-worker-quality-hotfix-autonomy", parentSlug: "command-eve-alpha2-08-09-closure-parent", file: `${BASE}/command-eve-alpha2-post-worker-quality-hotfix-autonomy.md` },
  { slug: "command-eve-alpha2-support-security-privacy-license-gate", parentSlug: "command-eve-alpha2-08-09-closure-parent", file: `${BASE}/command-eve-alpha2-support-security-privacy-license-gate.md` },
  { slug: "command-eve-alpha2-scheduler-killswitch-budget-brake", parentSlug: "command-eve-alpha2-08-09-closure-parent", file: `${BASE}/command-eve-alpha2-scheduler-killswitch-budget-brake.md` },
  { slug: "command-eve-alpha2-ladder-context-topology-integration", parentSlug: "command-eve-alpha2-08-09-closure-parent", file: `${BASE}/command-eve-alpha2-ladder-context-topology-integration.md` },
  { slug: "command-eve-alpha2-self-observability-watchdog", parentSlug: "command-eve-alpha2-08-09-closure-parent", file: `${BASE}/command-eve-alpha2-self-observability-watchdog.md` },
  { slug: "command-eve-alpha2-plugin-connector-onboarding-harness", parentSlug: "command-eve-alpha2-08-09-closure-parent", file: `${BASE}/command-eve-alpha2-plugin-connector-onboarding-harness.md` },
  { slug: "command-eve-alpha2-remote-onboarding-pilot-handoff", parentSlug: "command-eve-alpha2-08-09-closure-parent", file: `${BASE}/command-eve-alpha2-remote-onboarding-pilot-handoff.md` },
  { slug: "command-eve-alpha2-cao-security-code-review-hotfix-gate", parentSlug: "command-eve-alpha2-08-09-closure-parent", file: `${BASE}/command-eve-alpha2-cao-security-code-review-hotfix-gate.md` },
];

function parseArgs(argv) {
  const args = { apply: false, updateExisting: false, json: false };
  for (const arg of argv) {
    if (arg === "--apply") args.apply = true;
    else if (arg === "--update-existing") args.updateExisting = true;
    else if (arg === "--json") args.json = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

async function requestJson({ baseUrl, authHeaders, path, method = "GET", body }) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...authHeaders, Accept: "application/json", "Content-Type": "application/json" },
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

function rowsFromList(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.results)) return body.results;
  return [];
}

function sanitizeItem(item) {
  if (!item || typeof item !== "object") return null;
  const parent = item.parent && typeof item.parent === "object" ? (item.parent.id || null) : (item.parent || null);
  return {
    id: item.id,
    sequence_id: item.sequence_id,
    name: item.name,
    parent,
    external_id: item.external_id || null,
  };
}

async function listExisting({ baseUrl, authHeaders }) {
  const rows = [];
  let cursor = "";
  const seen = new Set();
  for (let page = 0; page < 10; page += 1) {
    const qs = new URLSearchParams({
      fields: "id,sequence_id,name,parent,priority,target_date,external_source,external_id,labels",
      expand: "parent,labels",
      per_page: "500",
    });
    if (cursor) qs.set("cursor", cursor);
    const response = await requestJson({
      baseUrl,
      authHeaders,
      path: `/api/v1/workspaces/${encodeURIComponent(WORKSPACE)}/projects/${encodeURIComponent(PROJECT_ID)}/work-items/?${qs}`,
    });
    if (!response.ok) return { ok: false, status: response.status, error: response.body, rows };
    rows.push(...rowsFromList(response.body));
    const next = response.body?.next_cursor || "";
    if (!next || seen.has(next)) break;
    seen.add(next);
    cursor = next;
  }
  return { ok: true, rows };
}

async function listLabels({ baseUrl, authHeaders }) {
  const response = await requestJson({
    baseUrl,
    authHeaders,
    path: `/api/v1/workspaces/${encodeURIComponent(WORKSPACE)}/projects/${encodeURIComponent(PROJECT_ID)}/labels/`,
  });
  if (!response.ok) return { ok: false, status: response.status, error: response.body, labels: [] };
  return { ok: true, labels: rowsFromList(response.body) };
}

async function createLabel({ baseUrl, authHeaders, label }) {
  return requestJson({
    baseUrl,
    authHeaders,
    method: "POST",
    path: `/api/v1/workspaces/${encodeURIComponent(WORKSPACE)}/projects/${encodeURIComponent(PROJECT_ID)}/labels/`,
    body: { name: label.name, color: label.color, description: label.description },
  });
}

async function ensureLabels({ baseUrl, authHeaders, apply }) {
  const result = { ok: true, existing: [], created: [], failed: [], warnings: [], byName: new Map() };
  const listed = await listLabels({ baseUrl, authHeaders });
  if (!listed.ok) {
    result.warnings.push({
      action: "list-labels",
      status: listed.status,
      message: "label endpoint unavailable; continuing with required role labels from local label map only",
    });
    return result;
  }
  for (const label of listed.labels) {
    if (label?.name && label?.id) {
      result.byName.set(label.name, label.id);
      result.existing.push({ id: label.id, name: label.name });
    }
  }

  for (const label of LABEL_SEED) {
    if (result.byName.has(label.name)) continue;
    if (!apply) continue;
    const created = await createLabel({ baseUrl, authHeaders, label });
    if (created.ok && created.body?.id) {
      result.byName.set(label.name, created.body.id);
      result.created.push({ id: created.body.id, name: created.body.name || label.name });
      continue;
    }
    result.ok = false;
    result.failed.push({ action: "create-label", name: label.name, status: created.status, error: created.body });
  }
  return result;
}

function addExtraLabels({ item, labelIdsByName }) {
  const labels = new Set(item.payload.labels || []);
  for (const row of EXTRA_LABELS) {
    const id = labelIdsByName.get(row.name);
    if (id) labels.add(id);
  }
  for (const name of CONTRACT_EXTRA_LABELS[item.slug] || []) {
    const id = labelIdsByName.get(name);
    if (id) labels.add(id);
  }
  item.payload.labels = [...labels];
}

function existingLabelIds(row) {
  if (!Array.isArray(row?.labels)) return [];
  return row.labels
    .map((label) => (typeof label === "string" ? label : label?.id))
    .filter(Boolean);
}

async function writeItem({ baseUrl, authHeaders, item, parentId, existing }) {
  const payload = { ...item.payload };
  if (item.parentSlug) payload.parent = parentId;
  if (PRIORITY[item.slug]) payload.priority = PRIORITY[item.slug];

  if (existing) {
    payload.labels = [...new Set([...existingLabelIds(existing), ...(payload.labels || [])])];
    if (!PRIORITY[item.slug]) delete payload.priority;
    if (!existing.target_date) payload.target_date = TARGET_DATE;
    else delete payload.target_date;
  } else {
    payload.target_date = TARGET_DATE;
  }

  const path = existing
    ? `/api/v1/workspaces/${encodeURIComponent(WORKSPACE)}/projects/${encodeURIComponent(PROJECT_ID)}/work-items/${encodeURIComponent(existing.id)}/`
    : `/api/v1/workspaces/${encodeURIComponent(WORKSPACE)}/projects/${encodeURIComponent(PROJECT_ID)}/work-items/`;
  return requestJson({ baseUrl, authHeaders, method: existing ? "PATCH" : "POST", path, body: payload });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = (process.env.PLANE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const auth = resolvePlaneAuth(process.env.PLANE_AUTH_MODE || "app-token");

  const result = {
    version: "materialize-command-eve-alpha2-closure-supergoal/2026-06-05",
    apply: args.apply,
    updateExisting: args.updateExisting,
    workspace: WORKSPACE,
    projectId: PROJECT_ID,
    targetDate: TARGET_DATE,
    authMode: auth.authMode,
    hasCredential: auth.ok,
    ok: auth.ok,
    errors: auth.ok ? [] : [auth.missingError],
    labels: { existing: [], created: [], failed: [], warnings: [] },
    planned: [],
    existing: [],
    created: [],
    updated: [],
    skipped: [],
    failed: [],
  };

  let plan = null;
  if (result.ok) {
    const labelResult = await ensureLabels({ baseUrl, authHeaders: auth.headers, apply: args.apply });
    result.labels = {
      existing: labelResult.existing,
      created: labelResult.created,
      failed: labelResult.failed,
      warnings: labelResult.warnings,
    };
    if (!labelResult.ok) result.errors.push(...labelResult.failed.map((row) => `${row.action}:${row.name || row.status}`));

    plan = planContractMaterialization({
      root: process.cwd(),
      workspace: WORKSPACE,
      projectId: PROJECT_ID,
      labelMapPath: LABEL_MAP,
      contractSet: CONTRACT_SET,
      externalSource: DEFAULT_EXTERNAL_SOURCE,
      externalPrefix: EXTERNAL_PREFIX,
      targetDate: TARGET_DATE,
    });
    for (const item of plan.items) addExtraLabels({ item, labelIdsByName: labelResult.byName });

    result.planned = plan.items.map((item) => ({
      slug: item.slug,
      parentSlug: item.parentSlug || null,
      role: item.role,
      title: item.title,
      externalId: item.externalId,
      labelCount: item.payload.labels.length,
      validation: item.validation.reason_codes,
    }));
    if (!plan.ok) result.errors.push(...plan.errors);
    result.ok = plan.ok && labelResult.ok;
  }

  if (!result.ok) {
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 2;
    return;
  }

  const existing = await listExisting({ baseUrl, authHeaders: auth.headers });
  if (!existing.ok) {
    result.ok = false;
    result.error = existing.error;
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }

  const byExternalId = new Map();
  for (const row of existing.rows) {
    if (row.external_source === DEFAULT_EXTERNAL_SOURCE && row.external_id) byExternalId.set(row.external_id, row);
  }
  result.existing = plan.items
    .map((item) => byExternalId.get(item.externalId))
    .filter(Boolean)
    .map(sanitizeItem);

  if (!args.apply) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const idBySlug = new Map();
  for (const item of plan.items) {
    const already = byExternalId.get(item.externalId);
    const parentId = item.parentSlug ? idBySlug.get(item.parentSlug) : "";
    if (item.parentSlug && !parentId) {
      result.ok = false;
      result.failed.push({ slug: item.slug, error: `parent not materialized: ${item.parentSlug}` });
      continue;
    }

    if (already) {
      idBySlug.set(item.slug, already.id);
      if (!args.updateExisting) {
        result.skipped.push(sanitizeItem(already));
        continue;
      }
      const response = await writeItem({ baseUrl, authHeaders: auth.headers, item, parentId, existing: already });
      if (!response.ok) result.failed.push({ slug: item.slug, status: response.status, error: response.body });
      else result.updated.push(sanitizeItem(response.body));
      result.ok = result.ok && response.ok;
      continue;
    }

    const response = await writeItem({ baseUrl, authHeaders: auth.headers, item, parentId, existing: null });
    if (!response.ok) {
      result.ok = false;
      result.failed.push({ slug: item.slug, status: response.status, error: response.body });
      continue;
    }
    idBySlug.set(item.slug, response.body.id);
    result.created.push(sanitizeItem(response.body));
  }

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`materialize-command-eve-alpha2-closure-supergoal failed: ${error.message}`);
  process.exitCode = 1;
});
