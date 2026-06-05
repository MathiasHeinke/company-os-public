#!/usr/bin/env node

// One-off materializer for the 2026-06-04 Command EVE 1.0 operator-shell
// alpha supergoal. Dry-run by default; --apply creates/updates Plane work
// items via the Company.OS Plane App auth bridge.

import { DEFAULT_BASE_URL, resolvePlaneAuth } from "./plane-auth.mjs";
import {
  DEFAULT_EXTERNAL_SOURCE,
  planContractMaterialization,
} from "./plane-contract-materializer-core.mjs";

const PROJECT_ID = "3537d502-b5a7-4214-9f7d-8f571fb1cd1e"; // CompanyOS / COMPA
const WORKSPACE = "companyos";
const EXTERNAL_PREFIX = "company-os-supergoal-command-eve-100-alpha-operator-shell-2026-06-04";
const LABEL_MAP = `runtime/plane-label-map/${WORKSPACE}-${PROJECT_ID}.json`;
const BASE = "docs/templates/supergoals-2026-06-04";
const TARGET_DATE = "2026-06-04";

const PRIORITY = {
  "command-eve-100-alpha-parent": "urgent",
  "command-eve-100-alpha-release-baseline": "urgent",
  "command-eve-100-alpha-aionui-source-overlay": "urgent",
  "command-eve-100-alpha-hermes-runtime": "urgent",
  "command-eve-100-alpha-installer-composition": "urgent",
  "command-eve-100-alpha-minimax-auth": "high",
  "command-eve-100-alpha-clean-install-smoke": "urgent",
  "command-eve-100-alpha-security-productization-gate": "urgent",
};

const CONTRACT_SET = [
  { slug: "command-eve-100-alpha-parent", file: `${BASE}/command-eve-100-alpha-parent.md` },
  { slug: "command-eve-100-alpha-release-baseline", parentSlug: "command-eve-100-alpha-parent", file: `${BASE}/command-eve-100-alpha-release-baseline.md` },
  { slug: "command-eve-100-alpha-aionui-source-overlay", parentSlug: "command-eve-100-alpha-parent", file: `${BASE}/command-eve-100-alpha-aionui-source-overlay.md` },
  { slug: "command-eve-100-alpha-hermes-runtime", parentSlug: "command-eve-100-alpha-parent", file: `${BASE}/command-eve-100-alpha-hermes-runtime.md` },
  { slug: "command-eve-100-alpha-installer-composition", parentSlug: "command-eve-100-alpha-parent", file: `${BASE}/command-eve-100-alpha-installer-composition.md` },
  { slug: "command-eve-100-alpha-minimax-auth", parentSlug: "command-eve-100-alpha-parent", file: `${BASE}/command-eve-100-alpha-minimax-auth.md` },
  { slug: "command-eve-100-alpha-clean-install-smoke", parentSlug: "command-eve-100-alpha-parent", file: `${BASE}/command-eve-100-alpha-clean-install-smoke.md` },
  { slug: "command-eve-100-alpha-security-productization-gate", parentSlug: "command-eve-100-alpha-parent", file: `${BASE}/command-eve-100-alpha-security-productization-gate.md` },
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
  const qs = new URLSearchParams({
    fields: "id,sequence_id,name,parent,external_source,external_id,labels",
    expand: "parent,labels",
    per_page: "500",
  });
  const response = await requestJson({
    baseUrl,
    authHeaders,
    path: `/api/v1/workspaces/${encodeURIComponent(WORKSPACE)}/projects/${encodeURIComponent(PROJECT_ID)}/work-items/?${qs}`,
  });
  if (!response.ok) return { ok: false, status: response.status, error: response.body, rows: [] };
  return { ok: true, rows: rowsFromList(response.body) };
}

async function writeItem({ baseUrl, authHeaders, item, parentId, existingId }) {
  const payload = { ...item.payload };
  if (item.parentSlug) payload.parent = parentId;
  if (PRIORITY[item.slug]) payload.priority = PRIORITY[item.slug];
  payload.target_date = TARGET_DATE;

  const path = existingId
    ? `/api/v1/workspaces/${encodeURIComponent(WORKSPACE)}/projects/${encodeURIComponent(PROJECT_ID)}/work-items/${encodeURIComponent(existingId)}/`
    : `/api/v1/workspaces/${encodeURIComponent(WORKSPACE)}/projects/${encodeURIComponent(PROJECT_ID)}/work-items/`;
  return requestJson({ baseUrl, authHeaders, method: existingId ? "PATCH" : "POST", path, body: payload });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = (process.env.PLANE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const auth = resolvePlaneAuth(process.env.PLANE_AUTH_MODE || "app-token");

  const result = {
    version: "materialize-command-eve-100-alpha-supergoal/2026-06-04",
    apply: args.apply,
    updateExisting: args.updateExisting,
    workspace: WORKSPACE,
    projectId: PROJECT_ID,
    targetDate: TARGET_DATE,
    authMode: auth.authMode,
    hasCredential: auth.ok,
    ok: auth.ok,
    errors: auth.ok ? [] : [auth.missingError],
    planned: [],
    existing: [],
    created: [],
    updated: [],
    skipped: [],
    failed: [],
  };

  let plan = null;
  if (result.ok) {
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
    result.planned = plan.items.map((item) => ({
      slug: item.slug,
      parentSlug: item.parentSlug || null,
      role: item.role,
      title: item.title,
      externalId: item.externalId,
      validation: item.validation.reason_codes,
    }));
    if (!plan.ok) result.errors.push(...plan.errors);
    result.ok = plan.ok;
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
      const response = await writeItem({ baseUrl, authHeaders: auth.headers, item, parentId, existingId: already.id });
      if (!response.ok) result.failed.push({ slug: item.slug, status: response.status, error: response.body });
      else result.updated.push(sanitizeItem(response.body));
      result.ok = result.ok && response.ok;
      continue;
    }

    const response = await writeItem({ baseUrl, authHeaders: auth.headers, item, parentId, existingId: "" });
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
  console.error(`materialize-command-eve-100-alpha-supergoal failed: ${error.message}`);
  process.exitCode = 1;
});
