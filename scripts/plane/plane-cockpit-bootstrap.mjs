#!/usr/bin/env node

import {
  DEFAULT_BASE_URL,
  resolvePlaneAuth,
} from "./plane-auth.mjs";
import {
  COCKPIT_VERSION,
  inferOwnerId,
  planCockpitBootstrap,
} from "./plane-cockpit-bootstrap-core.mjs";

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    auth: process.env.PLANE_AUTH_MODE || "app-token",
    workspace: process.env.PLANE_WORKSPACE_SLUG || "companyos",
    projectId: "",
    apply: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--workspace") args.workspace = argv[++i] || "";
    else if (arg === "--project-id") args.projectId = argv[++i] || "";
    else if (arg === "--auth") args.auth = argv[++i] || "app-token";
    else if (arg === "--base-url") args.baseUrl = argv[++i] || DEFAULT_BASE_URL;
    else if (arg === "--apply") args.apply = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  return args;
}

function usage() {
  return `Usage:
  node scripts/plane/plane-cockpit-bootstrap.mjs \\
    --workspace companyos \\
    --project-id <uuid> \\
    [--auth app-token|api-key] [--apply] [--json]

Dry-run by default. With --apply, creates missing Company.OS cockpit Modules,
Cycles and Pages, and replaces the default demo project overview with a
Company.OS control-plane overview. The script is idempotent by name.
`;
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
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text.slice(0, 500) }; }
  return { ok: response.ok, status: response.status, body: parsed };
}

function rows(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.results)) return body.results;
  return [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(usage()); return; }
  const errors = [];
  if (!args.workspace) errors.push("--workspace is required");
  if (!args.projectId) errors.push("--project-id is required");
  const auth = resolvePlaneAuth(args.auth);
  if (!auth.ok) errors.push(auth.missingError);

  const result = {
    version: COCKPIT_VERSION,
    baseUrl: args.baseUrl,
    authMode: auth.authMode,
    workspace: args.workspace,
    projectId: args.projectId,
    apply: args.apply,
    ok: errors.length === 0,
    errors,
    writes: [],
  };
  if (errors.length) {
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  const projectBase = `/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/${encodeURIComponent(args.projectId)}`;
  const [projectResp, modulesResp, cyclesResp, pagesResp] = await Promise.all([
    requestJson({ baseUrl: args.baseUrl, authHeaders: auth.headers, path: `${projectBase}/` }),
    requestJson({ baseUrl: args.baseUrl, authHeaders: auth.headers, path: `${projectBase}/modules/` }),
    requestJson({ baseUrl: args.baseUrl, authHeaders: auth.headers, path: `${projectBase}/cycles/` }),
    requestJson({ baseUrl: args.baseUrl, authHeaders: auth.headers, path: `${projectBase}/pages/` }),
  ]);
  result.reads = {
    project: projectResp.status,
    modules: modulesResp.status,
    cycles: cyclesResp.status,
    pages: pagesResp.status,
  };
  if (!projectResp.ok || !modulesResp.ok || !cyclesResp.ok || !pagesResp.ok) {
    result.ok = false;
    result.errors.push("Plane cockpit read failed");
    result.read_errors = {
      project: projectResp.ok ? undefined : projectResp.body,
      modules: modulesResp.ok ? undefined : modulesResp.body,
      cycles: cyclesResp.ok ? undefined : cyclesResp.body,
      pages: pagesResp.ok ? undefined : pagesResp.body,
    };
    printResult(result, args.json);
    process.exitCode = 1;
    return;
  }

  const ownerId = inferOwnerId({ project: projectResp.body, cycles: rows(cyclesResp.body) });
  const plan = planCockpitBootstrap({
    project: projectResp.body,
    modules: rows(modulesResp.body),
    cycles: rows(cyclesResp.body),
    pages: rows(pagesResp.body),
    ownerId,
    projectId: args.projectId,
  });
  result.ownerId = ownerId || null;
  result.plan = plan;

  if (args.apply) {
    if (plan.project_overview.action === "update") {
      const response = await requestJson({
        baseUrl: args.baseUrl,
        authHeaders: auth.headers,
        method: "PATCH",
        path: `${projectBase}/`,
        body: plan.project_overview.payload,
      });
      result.writes.push({ kind: "project_overview", action: "update", ok: response.ok, status: response.status, id: args.projectId, error: response.ok ? undefined : response.body });
    }

    for (const module of plan.modules.filter((item) => item.action === "create")) {
      const response = await requestJson({
        baseUrl: args.baseUrl,
        authHeaders: auth.headers,
        method: "POST",
        path: `${projectBase}/modules/`,
        body: module.payload,
      });
      result.writes.push({ kind: "module", action: "create", name: module.name, ok: response.ok, status: response.status, id: response.body?.id || null, error: response.ok ? undefined : response.body });
    }

    for (const cycle of plan.cycles.filter((item) => item.action === "create")) {
      const response = await requestJson({
        baseUrl: args.baseUrl,
        authHeaders: auth.headers,
        method: "POST",
        path: `${projectBase}/cycles/`,
        body: cycle.payload,
      });
      result.writes.push({ kind: "cycle", action: "create", name: cycle.name, ok: response.ok, status: response.status, id: response.body?.id || null, error: response.ok ? undefined : response.body });
    }

    for (const page of plan.pages.filter((item) => item.action === "create")) {
      const response = await requestJson({
        baseUrl: args.baseUrl,
        authHeaders: auth.headers,
        method: "POST",
        path: `${projectBase}/pages/`,
        body: page.payload,
      });
      result.writes.push({ kind: "page", action: "create", name: page.name, ok: response.ok, status: response.status, id: response.body?.id || null, error: response.ok ? undefined : response.body });
    }
    result.ok = result.writes.every((write) => write.ok);
  }

  printResult(result, args.json);
  if (!result.ok) process.exitCode = 1;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`${result.version}: ${result.ok ? "pass" : "fail"}`);
  console.log(`apply=${result.apply}`);
  if (result.plan?.summary) console.log(`summary=${JSON.stringify(result.plan.summary)}`);
  for (const write of result.writes || []) {
    console.log(`${write.kind} ${write.name || write.id}: ${write.ok ? "ok" : "fail"} HTTP ${write.status}`);
  }
  for (const error of result.errors || []) console.log(`error: ${error}`);
}

main().catch((error) => {
  console.error(`Plane cockpit bootstrap failed: ${error.message}`);
  process.exitCode = 1;
});
