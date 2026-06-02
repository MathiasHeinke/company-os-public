#!/usr/bin/env node

import {
  DEFAULT_BASE_URL,
  PLANE_API_KEY_ACCOUNT,
  PLANE_API_KEY_SERVICE,
  PLANE_APP_BOT_TOKEN_ACCOUNT,
  PLANE_APP_SERVICE,
  resolvePlaneAuth,
} from "./plane-auth.mjs";
import {
  DEFAULT_EXTERNAL_SOURCE,
  defaultLabelMapPath,
  planContractMaterialization,
} from "./plane-contract-materializer-core.mjs";

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    auth: process.env.PLANE_AUTH_MODE || "app-token",
    workspace: process.env.PLANE_WORKSPACE_SLUG || "companyos",
    projectId: "",
    root: process.cwd(),
    labelMapPath: "",
    externalSource: DEFAULT_EXTERNAL_SOURCE,
    externalPrefix: "command-eve-installable-operator-shell",
    targetDate: "",
    apply: false,
    updateExisting: false,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--workspace") args.workspace = argv[++i] || "";
    else if (arg === "--project-id") args.projectId = argv[++i] || "";
    else if (arg === "--root") args.root = argv[++i] || process.cwd();
    else if (arg === "--label-map") args.labelMapPath = argv[++i] || "";
    else if (arg === "--external-source") args.externalSource = argv[++i] || DEFAULT_EXTERNAL_SOURCE;
    else if (arg === "--external-prefix") args.externalPrefix = argv[++i] || "command-eve-installable-operator-shell";
    else if (arg === "--target-date") args.targetDate = argv[++i] || "";
    else if (arg === "--auth") args.auth = argv[++i] || "app-token";
    else if (arg === "--base-url") args.baseUrl = argv[++i] || DEFAULT_BASE_URL;
    else if (arg === "--apply") args.apply = true;
    else if (arg === "--update-existing") args.updateExisting = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  if (!args.labelMapPath && args.workspace && args.projectId) {
    args.labelMapPath = defaultLabelMapPath({
      root: args.root,
      workspace: args.workspace,
      projectId: args.projectId,
    });
  }
  return args;
}

function usage() {
  return `Usage:
  node scripts/plane/plane-contract-materializer.mjs \\
    --workspace <slug> \\
    --project-id <uuid> \\
    [--label-map runtime/plane-label-map/<workspace>-<project>.json] \\
    [--external-source company-os-contract-materializer] \\
    [--external-prefix command-eve-installable-operator-shell] \\
    [--target-date YYYY-MM-DD] \\
    [--auth app-token|api-key] \\
    [--apply] [--update-existing] [--json]

Without --apply this is a dry-run. It materializes the Command EVE installable
operator shell parent/child contract set into Plane with role labels, stable
external ids and child parent links.

Keychain fallback:
  api key:   ${PLANE_API_KEY_SERVICE} / ${PLANE_API_KEY_ACCOUNT}
  app token: ${PLANE_APP_SERVICE} / ${PLANE_APP_BOT_TOKEN_ACCOUNT}
`;
}

function validateArgs(args) {
  const errors = [];
  if (!args.workspace) errors.push("--workspace is required");
  if (!args.projectId) errors.push("--project-id is required");
  if (!args.labelMapPath) errors.push("--label-map is required or derivable");
  if (args.targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(args.targetDate)) {
    errors.push("--target-date must be YYYY-MM-DD");
  }
  return errors;
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

  return {
    ok: response.ok,
    status: response.status,
    body: parsed,
  };
}

function rowsFromList(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.results)) return body.results;
  return [];
}

async function listExisting({ args, authHeaders }) {
  const qs = new URLSearchParams({
    fields: "id,sequence_id,name,parent,external_source,external_id,labels",
    expand: "parent,labels",
    per_page: "500",
  });
  const response = await requestJson({
    baseUrl: args.baseUrl,
    authHeaders,
    path: `/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/${encodeURIComponent(args.projectId)}/work-items/?${qs}`,
  });
  if (!response.ok) return { ok: false, status: response.status, error: response.body, rows: [] };
  return { ok: true, status: response.status, rows: rowsFromList(response.body) };
}

function sanitizeItem(item) {
  if (!item || typeof item !== "object") return null;
  const parent = item.parent && typeof item.parent === "object"
    ? (item.parent.id || null)
    : (item.parent || null);
  return {
    id: item.id,
    sequence_id: item.sequence_id,
    name: item.name,
    parent,
    external_source: item.external_source || null,
    external_id: item.external_id || null,
    labels: Array.isArray(item.labels)
      ? item.labels.map((label) => (typeof label === "string" ? label : label?.name || label?.id)).filter(Boolean)
      : [],
  };
}

async function createWorkItem({ args, authHeaders, item, parentId }) {
  const payload = { ...item.payload };
  if (item.parentSlug) payload.parent = parentId;

  return requestJson({
    baseUrl: args.baseUrl,
    authHeaders,
    method: "POST",
    path: `/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/${encodeURIComponent(args.projectId)}/work-items/`,
    body: payload,
  });
}

async function updateWorkItem({ args, authHeaders, workItemId, item, parentId }) {
  const payload = { ...item.payload };
  if (item.parentSlug) payload.parent = parentId;

  return requestJson({
    baseUrl: args.baseUrl,
    authHeaders,
    method: "PATCH",
    path: `/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/${encodeURIComponent(args.projectId)}/work-items/${encodeURIComponent(workItemId)}/`,
    body: payload,
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

  let plan = null;
  if (!errors.length) {
    try {
      plan = planContractMaterialization({
        root: args.root,
        workspace: args.workspace,
        projectId: args.projectId,
        labelMapPath: args.labelMapPath,
        externalSource: args.externalSource,
        externalPrefix: args.externalPrefix,
        targetDate: args.targetDate,
      });
      if (!plan.ok) errors.push(...plan.errors);
    } catch (error) {
      errors.push(error.message);
    }
  }

  const result = {
    version: "plane-contract-materializer/v0",
    baseUrl: args.baseUrl,
    authMode: auth.authMode,
    hasCredential: auth.ok,
    workspace: args.workspace || null,
    projectId: args.projectId || null,
    labelMapPath: args.labelMapPath || null,
    apply: args.apply,
    updateExisting: args.updateExisting,
    ok: errors.length === 0,
    errors,
    planned: plan ? plan.items.map((item) => ({
      slug: item.slug,
      parentSlug: item.parentSlug || null,
      title: item.title,
      role: item.role,
      labelId: item.labelId,
      externalId: item.externalId,
      validation: item.validation.reason_codes,
    })) : [],
    existing: [],
    created: [],
    updated: [],
    skipped: [],
    failed: [],
  };

  if (errors.length) {
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  const existing = await listExisting({ args, authHeaders: auth.headers });
  if (!existing.ok) {
    result.ok = false;
    result.status = existing.status;
    result.error = existing.error;
    printResult(result, args.json);
    process.exitCode = 1;
    return;
  }

  const existingByExternalId = new Map();
  for (const row of existing.rows) {
    if (row.external_source === args.externalSource && row.external_id) {
      existingByExternalId.set(row.external_id, row);
    }
  }

  result.existing = plan.items
    .map((item) => existingByExternalId.get(item.externalId))
    .filter(Boolean)
    .map(sanitizeItem);

  if (!args.apply) {
    printResult(result, args.json);
    return;
  }

  const materializedBySlug = new Map();
  for (const item of plan.items) {
    const already = existingByExternalId.get(item.externalId);
    if (already) {
      materializedBySlug.set(item.slug, already.id);
      if (!args.updateExisting) {
        result.skipped.push(sanitizeItem(already));
        continue;
      }
      const parentId = item.parentSlug ? materializedBySlug.get(item.parentSlug) : "";
      if (item.parentSlug && !parentId) {
        result.ok = false;
        result.failed.push({ slug: item.slug, error: `parent not materialized: ${item.parentSlug}` });
        continue;
      }
      const response = await updateWorkItem({
        args,
        authHeaders: auth.headers,
        workItemId: already.id,
        item,
        parentId,
      });
      if (!response.ok) {
        result.ok = false;
        result.failed.push({ slug: item.slug, status: response.status, error: response.body });
      } else {
        result.updated.push(sanitizeItem(response.body));
      }
      continue;
    }

    const parentId = item.parentSlug ? materializedBySlug.get(item.parentSlug) : "";
    if (item.parentSlug && !parentId) {
      result.ok = false;
      result.failed.push({ slug: item.slug, error: `parent not materialized: ${item.parentSlug}` });
      continue;
    }

    const response = await createWorkItem({ args, authHeaders: auth.headers, item, parentId });
    if (!response.ok) {
      result.ok = false;
      result.failed.push({ slug: item.slug, status: response.status, error: response.body });
      continue;
    }
    materializedBySlug.set(item.slug, response.body.id);
    result.created.push(sanitizeItem(response.body));
  }

  printResult(result, args.json);
  if (!result.ok) process.exitCode = 1;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Plane contract materializer: ${result.ok ? "pass" : "fail"}`);
  console.log(`apply: ${result.apply}`);
  console.log(`planned: ${result.planned.length}`);
  console.log(`existing: ${result.existing.length}`);
  console.log(`created: ${result.created.length}`);
  console.log(`updated: ${result.updated.length}`);
  console.log(`skipped: ${result.skipped.length}`);
  for (const error of result.errors || []) console.log(`error: ${error}`);
  for (const row of result.failed || []) console.log(`failed: ${row.slug} ${row.status || ""}`);
}

main().catch((error) => {
  console.error(`Plane contract materializer failed: ${error.message}`);
  process.exitCode = 1;
});
