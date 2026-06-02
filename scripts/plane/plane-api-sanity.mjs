#!/usr/bin/env node

import {
  DEFAULT_BASE_URL,
  PLANE_API_KEY_ACCOUNT,
  PLANE_API_KEY_SERVICE,
  PLANE_APP_BOT_TOKEN_ACCOUNT,
  PLANE_APP_SERVICE,
  resolvePlaneAuth,
} from "./plane-auth.mjs";

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    auth: process.env.PLANE_AUTH_MODE || "app-token",
    workspace: process.env.PLANE_WORKSPACE_SLUG || "",
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      args.json = true;
    } else if (arg === "--workspace") {
      args.workspace = argv[++i] || "";
    } else if (arg === "--auth") {
      args.auth = argv[++i] || "app-token";
    } else if (arg === "--base-url") {
      args.baseUrl = argv[++i] || DEFAULT_BASE_URL;
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
  node scripts/plane/plane-api-sanity.mjs [--workspace <slug>] [--json]

Environment:
  PLANE_APP_BOT_TOKEN       Preferred secret source
  PLANE_API_TOKEN           Optional alias for runtimes using the legacy token variable name
  PLANE_API_KEY             Bootstrap/fallback secret source when --auth api-key
  PLANE_WORKSPACE_SLUG      Optional workspace slug
  PLANE_BASE_URL            Defaults to ${DEFAULT_BASE_URL}
  PLANE_AUTH_MODE           api-key or app-token

Keychain fallback:
  api key:   ${PLANE_API_KEY_SERVICE} / ${PLANE_API_KEY_ACCOUNT}
  app token: ${PLANE_APP_SERVICE} / ${PLANE_APP_BOT_TOKEN_ACCOUNT}
`;
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

function sanitizeUser(user) {
  if (!user || typeof user !== "object") return null;
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    first_name: user.first_name,
    last_name: user.last_name,
  };
}

function listFromPlaneResponse(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function sanitizeProjects(body) {
  return listFromPlaneResponse(body).map((project) => ({
    id: project.id,
    identifier: project.identifier,
    name: project.name,
    network: project.network,
    module_view: project.module_view,
    cycle_view: project.cycle_view,
    inbox_view: project.inbox_view,
    page_view: project.page_view,
    issue_views_view: project.issue_views_view,
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const auth = resolvePlaneAuth(args.auth);
  const result = {
    version: "plane-api-sanity/v0",
    baseUrl: args.baseUrl,
    authMode: auth.authMode,
    hasCredential: auth.ok,
    workspace: args.workspace || null,
    checks: [],
  };

  if (!auth.ok) {
    result.ok = false;
    result.error = auth.missingError;
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  const me = await requestJson({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    path: "/api/v1/users/me/",
  });

  result.checks.push({
    id: "plane.users_me",
    ok: me.ok,
    status: me.status,
    rateLimitRemaining: me.rateLimitRemaining,
    rateLimitReset: me.rateLimitReset,
    user: me.ok ? sanitizeUser(me.body) : undefined,
    error: me.ok ? undefined : me.body,
  });

  if (args.workspace) {
    const projects = await requestJson({
      baseUrl: args.baseUrl,
      authHeaders: auth.headers,
      path: `/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/`,
    });

    result.checks.push({
      id: "plane.workspace_projects",
      ok: projects.ok,
      status: projects.status,
      rateLimitRemaining: projects.rateLimitRemaining,
      rateLimitReset: projects.rateLimitReset,
      projectCount: projects.ok ? sanitizeProjects(projects.body).length : 0,
      projects: projects.ok ? sanitizeProjects(projects.body) : undefined,
      error: projects.ok ? undefined : projects.body,
    });
  }

  result.ok = result.checks.every((check) => check.ok);
  printResult(result, args.json);
  if (!result.ok) process.exitCode = 1;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Plane API sanity: ${result.ok ? "pass" : "fail"}`);
  for (const check of result.checks) {
    console.log(`- ${check.ok ? "pass" : "fail"} ${check.id}: HTTP ${check.status}`);
    if (check.user) {
      console.log(`  user: ${check.user.display_name || check.user.email}`);
    }
    if (typeof check.projectCount === "number") {
      console.log(`  projects: ${check.projectCount}`);
    }
  }
  if (result.error) console.log(`error: ${result.error}`);
}

main().catch((error) => {
  console.error(`Plane API sanity failed: ${error.message}`);
  process.exitCode = 1;
});
