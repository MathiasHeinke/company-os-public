#!/usr/bin/env node

/*
 * plane-role-labels-bootstrap.mjs
 *
 * Idempotent bootstrap of the canonical role:* labels in a Plane project.
 *
 * Phase 1: this script runs ONCE per Plane project that joins the
 * Company.OS control plane. It creates the label set used by the worker
 * issue contract and the worker dispatcher v0.
 *
 * Defaults: dry-run. Pass --apply to actually create missing labels.
 *
 * Source of truth: docs/orchestration/plane-role-routing.md
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  DEFAULT_BASE_URL,
  PLANE_API_KEY_ACCOUNT,
  PLANE_API_KEY_SERVICE,
  PLANE_APP_BOT_TOKEN_ACCOUNT,
  PLANE_APP_SERVICE,
  resolvePlaneAuth,
} from "../plane/plane-auth.mjs";

export const LABEL_MAP_VERSION = "plane-label-map/v0";

export function defaultLabelMapPath({ workspace, projectId, root = process.cwd() }) {
  return resolve(root, "runtime/plane-label-map", `${workspace}-${projectId}.json`);
}

const ROLE_LABELS = [
  { name: "role:cto", description: "Owner seat: CTO. Engineering, architecture, code, security, reliability.", color: "#1f6feb" },
  { name: "role:cpo", description: "Owner seat: CPO. Product, UX, scope, customer value, acceptance criteria.", color: "#a371f7" },
  { name: "role:cmo", description: "Owner seat: CMO. Positioning, brand voice, growth, distribution, public-readiness.", color: "#db61a2" },
  { name: "role:coo", description: "Owner seat: COO. Process, runbooks, ledger discipline, throughput, dependencies.", color: "#bf8700" },
  { name: "role:cfo", description: "Owner seat: CFO. Spend, runway, cost ledger, pricing, business impact.", color: "#1a7f37" },
  { name: "role:cao", description: "Owner seat: CAO. Audit-only controller. Does not build. Carries controller-pass items.", color: "#6e7781" },
];

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    auth: process.env.PLANE_AUTH_MODE || "app-token",
    workspace: process.env.PLANE_WORKSPACE_SLUG || "",
    projectId: "",
    apply: false,
    writeLabelMap: "",
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--workspace") args.workspace = argv[++i] || "";
    else if (arg === "--project-id") args.projectId = argv[++i] || "";
    else if (arg === "--auth") args.auth = argv[++i] || "app-token";
    else if (arg === "--base-url") args.baseUrl = argv[++i] || DEFAULT_BASE_URL;
    else if (arg === "--apply") args.apply = true;
    else if (arg === "--write-label-map") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args.writeLabelMap = argv[++i];
      } else {
        args.writeLabelMap = "<default>";
      }
    }
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  return args;
}

function usage() {
  return `Usage:
  node scripts/orchestration/plane-role-labels-bootstrap.mjs \\
    --workspace <slug> \\
    --project-id <uuid> \\
    [--auth api-key|app-token] \\
    [--apply] [--write-label-map [path]] [--json]

Defaults to dry-run. Pass --apply to actually POST missing labels.

--write-label-map without a path defaults to
  runtime/plane-label-map/<workspace>-<project_id>.json
relative to the current working directory. The runtime/ directory is
gitignored. The map carries no secrets — workspace, project id, label
ids and label names only. The dispatcher uses this map to resolve
role:* labels when the App bot token cannot read /labels/.

Keychain fallback:
  api key:   ${PLANE_API_KEY_SERVICE} / ${PLANE_API_KEY_ACCOUNT}
  app token: ${PLANE_APP_SERVICE} / ${PLANE_APP_BOT_TOKEN_ACCOUNT}
`;
}

function validate(args) {
  const errors = [];
  if (!args.workspace) errors.push("--workspace is required");
  if (!args.projectId) errors.push("--project-id is required");
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
    parsed = { raw: text.slice(0, 500) };
  }

  return {
    ok: response.ok,
    status: response.status,
    body: parsed,
  };
}

async function listLabels({ baseUrl, authHeaders, workspace, projectId }) {
  const path = `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/labels/`;
  const response = await requestJson({ baseUrl, authHeaders, path });
  if (!response.ok) {
    return { ok: false, status: response.status, error: response.body, labels: [] };
  }

  const rows = Array.isArray(response.body) ? response.body : (response.body?.results || []);
  return {
    ok: true,
    status: response.status,
    labels: rows.map((row) => ({ id: row.id, name: row.name, color: row.color })),
  };
}

async function createLabel({ baseUrl, authHeaders, workspace, projectId, label }) {
  const path = `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/labels/`;
  const response = await requestJson({
    baseUrl,
    authHeaders,
    path,
    method: "POST",
    body: { name: label.name, description: label.description, color: label.color },
  });
  return response;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const errors = validate(args);
  const auth = resolvePlaneAuth(args.auth);
  if (!auth.ok) errors.push(auth.missingError);

  const result = {
    version: "plane-role-labels-bootstrap/v0",
    baseUrl: args.baseUrl,
    authMode: auth.authMode,
    hasCredential: auth.ok,
    workspace: args.workspace || null,
    projectId: args.projectId || null,
    apply: args.apply,
    writeLabelMap: Boolean(args.writeLabelMap),
    labelMapPath: null,
    expected: ROLE_LABELS.map((row) => row.name),
    existing: [],
    missing: [],
    created: [],
    skipped: [],
    failed: [],
    ok: errors.length === 0,
    errors,
  };

  if (errors.length) {
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  const list = await listLabels({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    workspace: args.workspace,
    projectId: args.projectId,
  });

  if (!list.ok) {
    result.ok = false;
    result.error = list.error;
    result.status = list.status;
    printResult(result, args.json);
    process.exitCode = 1;
    return;
  }

  const existingByName = new Map(list.labels.map((row) => [row.name, row]));
  result.existing = list.labels.map((row) => row.name).sort();

  for (const label of ROLE_LABELS) {
    if (existingByName.has(label.name)) {
      result.skipped.push(label.name);
      continue;
    }
    if (!args.apply) {
      result.missing.push(label.name);
      continue;
    }

    const create = await createLabel({
      baseUrl: args.baseUrl,
      authHeaders: auth.headers,
      workspace: args.workspace,
      projectId: args.projectId,
      label,
    });

    if (create.ok) {
      result.created.push(label.name);
    } else {
      result.failed.push({ name: label.name, status: create.status, error: create.body });
      result.ok = false;
    }
  }

  if (args.writeLabelMap && result.ok) {
    const mapPath = args.writeLabelMap === "<default>"
      ? defaultLabelMapPath({ workspace: args.workspace, projectId: args.projectId })
      : resolve(args.writeLabelMap);

    // Re-list to capture freshly-created labels too.
    const fresh = await listLabels({
      baseUrl: args.baseUrl,
      authHeaders: auth.headers,
      workspace: args.workspace,
      projectId: args.projectId,
    });
    if (!fresh.ok) {
      result.ok = false;
      result.error = fresh.error;
      result.status = fresh.status;
    } else {
      const roleLabels = fresh.labels
        .filter((row) => typeof row.name === "string" && row.name.startsWith("role:"))
        .map((row) => ({ id: row.id, name: row.name }));

      const map = {
        version: LABEL_MAP_VERSION,
        workspace: args.workspace,
        project_id: args.projectId,
        generated_at: new Date().toISOString(),
        generated_by: "plane-role-labels-bootstrap.mjs",
        labels: roleLabels,
      };

      mkdirSync(dirname(mapPath), { recursive: true });
      writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`, "utf8");
      result.labelMapPath = mapPath;
      result.labelMapEntryCount = roleLabels.length;
    }
  }

  printResult(result, args.json);
  if (!result.ok) process.exitCode = 1;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Plane role labels bootstrap: ${result.ok ? "pass" : "fail"}`);
  console.log(`auth: ${result.authMode}`);
  console.log(`apply: ${result.apply}`);
  console.log(`expected: ${result.expected.join(", ")}`);
  console.log(`existing role:* among labels: ${(result.existing || []).filter((n) => n.startsWith("role:")).join(", ") || "(none)"}`);
  if (result.skipped.length) console.log(`skipped (already present): ${result.skipped.join(", ")}`);
  if (result.missing.length) console.log(`missing (would create with --apply): ${result.missing.join(", ")}`);
  if (result.created.length) console.log(`created: ${result.created.join(", ")}`);
  if (result.failed.length) {
    for (const row of result.failed) {
      console.log(`failed: ${row.name} HTTP ${row.status}`);
    }
  }
  if (result.labelMapPath) {
    console.log(`label map written: ${result.labelMapPath} (${result.labelMapEntryCount} role:* entries)`);
  }
  for (const error of result.errors || []) console.log(`error: ${error}`);
}

main().catch((error) => {
  console.error(`Plane role labels bootstrap failed: ${error.message}`);
  process.exitCode = 1;
});
