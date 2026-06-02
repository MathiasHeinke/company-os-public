#!/usr/bin/env node

import {
  DEFAULT_BASE_URL,
  PLANE_API_KEY_ACCOUNT,
  PLANE_API_KEY_SERVICE,
  PLANE_APP_BOT_TOKEN_ACCOUNT,
  PLANE_APP_SERVICE,
  resolvePlaneAuth,
} from "./plane-auth.mjs";

const DEFAULT_PER_PAGE = 5;

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    auth: process.env.PLANE_AUTH_MODE || "app-token",
    workspace: process.env.PLANE_WORKSPACE_SLUG || "",
    json: false,
    samples: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      args.json = true;
    } else if (arg === "--samples") {
      args.samples = true;
    } else if (arg === "--workspace") {
      args.workspace = argv[++i] || "";
    } else if (arg === "--base-url") {
      args.baseUrl = argv[++i] || DEFAULT_BASE_URL;
    } else if (arg === "--auth") {
      args.auth = argv[++i] || "app-token";
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  return args;
}

function usage() {
  return `Usage:
  node scripts/plane/plane-ledger-preflight.mjs --workspace <slug> [--json] [--samples] [--auth api-key|app-token]

Environment:
  PLANE_APP_BOT_TOKEN       Preferred secret source
  PLANE_API_KEY             Bootstrap/fallback secret source when --auth api-key
  PLANE_WORKSPACE_SLUG      Optional workspace slug
  PLANE_BASE_URL            Defaults to ${DEFAULT_BASE_URL}
  PLANE_AUTH_MODE           api-key or app-token

Keychain fallback:
  api key:   ${PLANE_API_KEY_SERVICE} / ${PLANE_API_KEY_ACCOUNT}
  app token: ${PLANE_APP_SERVICE} / ${PLANE_APP_BOT_TOKEN_ACCOUNT}
`;
}

function pathWithQuery(path, query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function requestJson({ baseUrl, authHeaders, path }) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      ...authHeaders,
      "Accept": "application/json",
    },
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 500) };
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    rateLimitRemaining: response.headers.get("x-ratelimit-remaining"),
    rateLimitReset: response.headers.get("x-ratelimit-reset"),
    body,
  };
}

function listFromPlaneResponse(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function countFromPlaneResponse(body) {
  for (const key of ["total_results", "total_count", "count"]) {
    if (Number.isInteger(body?.[key])) return body[key];
  }
  return listFromPlaneResponse(body).length;
}

function sanitizeUser(user) {
  if (!user || typeof user !== "object") return null;
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
  };
}

function sanitizeProject(project) {
  return {
    id: project.id,
    identifier: project.identifier,
    name: project.name,
    network: project.network,
    module_view: project.module_view,
    cycle_view: project.cycle_view,
    inbox_view: project.inbox_view,
    page_view: project.page_view,
    issue_views_view: project.issue_views_view,
  };
}

function sanitizeWorkItem(item) {
  return {
    id: item.id,
    sequence_id: item.sequence_id,
    identifier: item.identifier,
    name: item.name,
    priority: item.priority,
    state: item.state?.name || item.state,
  };
}

function summarizeProbe(id, response, options = {}) {
  const list = listFromPlaneResponse(response.body);
  return {
    id,
    ok: response.ok,
    status: response.status,
    count: response.ok ? countFromPlaneResponse(response.body) : 0,
    sample: response.ok && options.samples ? list.slice(0, DEFAULT_PER_PAGE).map(options.sampleMapper || ((item) => item)) : undefined,
    error: response.ok ? undefined : response.body,
  };
}

async function probeProject({ baseUrl, authHeaders, workspace, project, samples }) {
  const encodedWorkspace = encodeURIComponent(workspace);
  const projectPath = `/api/v1/workspaces/${encodedWorkspace}/projects/${encodeURIComponent(project.id)}`;
  const probes = [];

  const workItems = await requestJson({
    baseUrl,
    authHeaders,
    path: pathWithQuery(`${projectPath}/work-items/`, {
      per_page: samples ? DEFAULT_PER_PAGE : 1,
      fields: samples ? "id,sequence_id,identifier,name,priority,state" : "id",
      expand: samples ? "state" : "",
    }),
  });

  probes.push(summarizeProbe("work_items", workItems, {
    samples,
    sampleMapper: sanitizeWorkItem,
  }));

  const modules = await requestJson({
    baseUrl,
    authHeaders,
    path: pathWithQuery(`${projectPath}/modules/`, { per_page: 1 }),
  });
  probes.push(summarizeProbe("modules", modules));

  const cycles = await requestJson({
    baseUrl,
    authHeaders,
    path: pathWithQuery(`${projectPath}/cycles/`, { per_page: 1 }),
  });
  probes.push(summarizeProbe("cycles", cycles));

  const pages = await requestJson({
    baseUrl,
    authHeaders,
    path: pathWithQuery(`${projectPath}/pages/`, { per_page: 1 }),
  });
  probes.push(summarizeProbe("pages", pages));

  const states = await requestJson({
    baseUrl,
    authHeaders,
    path: pathWithQuery(`${projectPath}/states/`, { per_page: 1 }),
  });
  probes.push(summarizeProbe("states", states));

  return {
    ...sanitizeProject(project),
    probes,
    ok: probes.find((probe) => probe.id === "work_items")?.ok === true,
    warnings: probes
      .filter((probe) => probe.id !== "work_items" && !probe.ok)
      .map((probe) => `${probe.id}: HTTP ${probe.status}`),
  };
}

function addTotals(projects) {
  const totals = {
    projects: projects.length,
    work_items: 0,
    modules: 0,
    cycles: 0,
    pages: 0,
    states: 0,
  };

  for (const project of projects) {
    for (const probe of project.probes) {
      if (Object.prototype.hasOwnProperty.call(totals, probe.id)) {
        totals[probe.id] += probe.count;
      }
    }
  }

  return totals;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const auth = resolvePlaneAuth(args.auth);
  const result = {
    version: "plane-ledger-preflight/v0",
    baseUrl: args.baseUrl,
    authMode: auth.authMode,
    workspace: args.workspace || null,
    hasCredential: auth.ok,
    generatedAt: new Date().toISOString(),
  };

  if (!auth.ok) {
    result.ok = false;
    result.error = auth.missingError;
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  if (!args.workspace) {
    result.ok = false;
    result.error = "Workspace slug required. Pass --workspace <slug> or PLANE_WORKSPACE_SLUG.";
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  const me = await requestJson({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    path: "/api/v1/users/me/",
  });

  const projects = await requestJson({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    path: `/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/`,
  });

  result.userCheck = {
    ok: me.ok,
    status: me.status,
    user: me.ok ? sanitizeUser(me.body) : undefined,
    error: me.ok ? undefined : me.body,
  };

  result.projectListCheck = {
    ok: projects.ok,
    status: projects.status,
    count: projects.ok ? listFromPlaneResponse(projects.body).length : 0,
    error: projects.ok ? undefined : projects.body,
  };

  if (me.ok && projects.ok) {
    result.projects = await Promise.all(
      listFromPlaneResponse(projects.body).map((project) => probeProject({
        baseUrl: args.baseUrl,
        authHeaders: auth.headers,
        workspace: args.workspace,
        project,
        samples: args.samples,
      })),
    );
    result.totals = addTotals(result.projects);
  } else {
    result.projects = [];
    result.totals = addTotals([]);
  }

  result.ok = result.userCheck.ok
    && result.projectListCheck.ok
    && result.projects.length > 0
    && result.projects.every((project) => project.ok);

  result.ledgerReady = result.ok && result.totals.work_items > 0;
  result.next = result.ledgerReady
    ? "Plane has at least one project and one work item; run migration reconciliation against the previous ledger."
    : "Plane API is reachable, but no imported/executable work items were found yet.";

  printResult(result, args.json);
  if (!result.ok) process.exitCode = 1;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Plane ledger preflight: ${result.ok ? "pass" : "fail"}`);
  if (result.authMode) console.log(`auth: ${result.authMode}`);
  if (result.workspace) console.log(`workspace: ${result.workspace}`);
  if (result.userCheck) {
    console.log(`user check: ${result.userCheck.ok ? "pass" : "fail"} HTTP ${result.userCheck.status}`);
  }
  if (result.projectListCheck) {
    console.log(`projects: ${result.projectListCheck.ok ? result.projectListCheck.count : 0}`);
  }
  if (result.totals) {
    console.log(`work items: ${result.totals.work_items}`);
    console.log(`modules: ${result.totals.modules}`);
    console.log(`cycles: ${result.totals.cycles}`);
    console.log(`pages: ${result.totals.pages}`);
    console.log(`states: ${result.totals.states}`);
  }
  if (result.projects?.length) {
    for (const project of result.projects) {
      const workItems = project.probes.find((probe) => probe.id === "work_items");
      console.log(`- ${project.identifier || project.id} ${project.name}: ${workItems?.count ?? 0} work items`);
      for (const warning of project.warnings || []) {
        console.log(`  warning: ${warning}`);
      }
    }
  }
  if (result.next) console.log(`next: ${result.next}`);
  if (result.error) console.log(`error: ${result.error}`);
}

main().catch((error) => {
  console.error(`Plane ledger preflight failed: ${error.message}`);
  process.exitCode = 1;
});
