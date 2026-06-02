#!/usr/bin/env node

// One-off materializer for the 2026-05-29 supergoal set:
//   Supergoal A — EVE-as-COS Activation + EVE<->CEO Refinement Loop (role:cto)
//   Supergoal B — Self-Serve Launch v1 (role:cmo)
// Reuses planContractMaterialization (custom contract set) + the same idempotent
// create/update loop as plane-contract-materializer.mjs. Dry-run by default.

import { resolvePlaneAuth } from "./plane-auth.mjs";
import {
  DEFAULT_BASE_URL,
} from "./plane-auth.mjs";
import {
  DEFAULT_EXTERNAL_SOURCE,
  planContractMaterialization,
} from "./plane-contract-materializer-core.mjs";

const PROJECT_ID = "3537d502-b5a7-4214-9f7d-8f571fb1cd1e"; // CompanyOS / COMPA
const WORKSPACE = "companyos";
const EXTERNAL_PREFIX = "company-os-supergoals-2026-05-29";
const LABEL_MAP = `runtime/plane-label-map/${WORKSPACE}-${PROJECT_ID}.json`;
const BASE = "docs/templates/supergoals-2026-05-29";

// Priority encodes sequencing: high = start this weekend + founder gates;
// medium = supporting; low = gated/last.
const PRIORITY = {
  "eve-cos-parent": "high",
  "eve-cos-intent-refinement": "high", // 427 — start now
  "eve-cos-observability": "medium", // 428
  "eve-cos-doctrine-update": "medium", // 429 — after 427
  "selfserve-parent": "high",
  "selfserve-positioning": "high", // 431 — start now
  "selfserve-readiness": "high", // 432 — founder gate
  "selfserve-pilot": "high", // 433 — start now, COGS long pole
  "selfserve-pricing": "high", // 434 — founder gate
  "selfserve-build": "low", // 435 — gated, splits, last
};

const CONTRACT_SET = [
  { slug: "eve-cos-parent", file: `${BASE}/eve-cos-parent.md` },
  { slug: "eve-cos-intent-refinement", parentSlug: "eve-cos-parent", file: `${BASE}/eve-cos-intent-refinement.md` },
  { slug: "eve-cos-observability", parentSlug: "eve-cos-parent", file: `${BASE}/eve-cos-observability.md` },
  { slug: "eve-cos-doctrine-update", parentSlug: "eve-cos-parent", file: `${BASE}/eve-cos-doctrine-update.md` },
  { slug: "selfserve-parent", file: `${BASE}/selfserve-parent.md` },
  { slug: "selfserve-positioning", parentSlug: "selfserve-parent", file: `${BASE}/selfserve-positioning.md` },
  { slug: "selfserve-readiness", parentSlug: "selfserve-parent", file: `${BASE}/selfserve-readiness.md` },
  { slug: "selfserve-pilot", parentSlug: "selfserve-parent", file: `${BASE}/selfserve-pilot.md` },
  { slug: "selfserve-pricing", parentSlug: "selfserve-parent", file: `${BASE}/selfserve-pricing.md` },
  { slug: "selfserve-build", parentSlug: "selfserve-parent", file: `${BASE}/selfserve-build.md` },
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
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text.slice(0, 1000) }; }
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
  return { id: item.id, sequence_id: item.sequence_id, name: item.name, parent, external_id: item.external_id || null };
}

async function listExisting({ baseUrl, authHeaders }) {
  const qs = new URLSearchParams({
    fields: "id,sequence_id,name,parent,external_source,external_id,labels",
    expand: "parent,labels",
    per_page: "500",
  });
  const response = await requestJson({
    baseUrl, authHeaders,
    path: `/api/v1/workspaces/${encodeURIComponent(WORKSPACE)}/projects/${encodeURIComponent(PROJECT_ID)}/work-items/?${qs}`,
  });
  if (!response.ok) return { ok: false, status: response.status, error: response.body, rows: [] };
  return { ok: true, rows: rowsFromList(response.body) };
}

async function writeItem({ baseUrl, authHeaders, item, parentId, existingId }) {
  const payload = { ...item.payload };
  if (item.parentSlug) payload.parent = parentId;
  if (PRIORITY[item.slug]) payload.priority = PRIORITY[item.slug];
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
    version: "materialize-supergoals/2026-05-29",
    apply: args.apply,
    updateExisting: args.updateExisting,
    authMode: auth.authMode,
    hasCredential: auth.ok,
    ok: auth.ok,
    errors: auth.ok ? [] : [auth.missingError],
    planned: [], existing: [], created: [], updated: [], skipped: [], failed: [],
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
    });
    result.planned = plan.items.map((i) => ({ slug: i.slug, parentSlug: i.parentSlug || null, role: i.role, title: i.title, externalId: i.externalId, validation: i.validation.reason_codes }));
    if (!plan.ok) result.errors.push(...plan.errors);
    result.ok = plan.ok;
  }

  if (!result.ok) { console.log(JSON.stringify(result, null, 2)); process.exitCode = 2; return; }

  const existing = await listExisting({ baseUrl, authHeaders: auth.headers });
  if (!existing.ok) { result.ok = false; result.error = existing.error; console.log(JSON.stringify(result, null, 2)); process.exitCode = 1; return; }

  const byExternalId = new Map();
  for (const row of existing.rows) {
    if (row.external_source === DEFAULT_EXTERNAL_SOURCE && row.external_id) byExternalId.set(row.external_id, row);
  }
  result.existing = plan.items.map((i) => byExternalId.get(i.externalId)).filter(Boolean).map(sanitizeItem);

  if (!args.apply) { console.log(JSON.stringify(result, null, 2)); return; }

  const idBySlug = new Map();
  for (const item of plan.items) {
    const already = byExternalId.get(item.externalId);
    const parentId = item.parentSlug ? idBySlug.get(item.parentSlug) : "";
    if (item.parentSlug && !parentId) { result.ok = false; result.failed.push({ slug: item.slug, error: `parent not materialized: ${item.parentSlug}` }); continue; }

    if (already) {
      idBySlug.set(item.slug, already.id);
      if (!args.updateExisting) { result.skipped.push(sanitizeItem(already)); continue; }
      const resp = await writeItem({ baseUrl, authHeaders: auth.headers, item, parentId, existingId: already.id });
      if (!resp.ok) { result.ok = false; result.failed.push({ slug: item.slug, status: resp.status, error: resp.body }); }
      else result.updated.push(sanitizeItem(resp.body));
      continue;
    }

    const resp = await writeItem({ baseUrl, authHeaders: auth.headers, item, parentId, existingId: "" });
    if (!resp.ok) { result.ok = false; result.failed.push({ slug: item.slug, status: resp.status, error: resp.body }); continue; }
    idBySlug.set(item.slug, resp.body.id);
    result.created.push(sanitizeItem(resp.body));
  }

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main().catch((error) => { console.error(`materialize-supergoals failed: ${error.message}`); process.exitCode = 1; });
