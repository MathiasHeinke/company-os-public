#!/usr/bin/env node

import { readFileSync } from "node:fs";
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
    projectId: "",
    name: "",
    descriptionHtml: "",
    descriptionHtmlFile: "",
    labels: [],
    parent: "",
    state: "",
    externalSource: "",
    externalId: "",
    startDate: "",
    targetDate: "",
    priority: "none",
    json: false,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      args.json = true;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--workspace") {
      args.workspace = argv[++i] || "";
    } else if (arg === "--project-id") {
      args.projectId = argv[++i] || "";
    } else if (arg === "--name") {
      args.name = argv[++i] || "";
    } else if (arg === "--description-html") {
      args.descriptionHtml = argv[++i] || "";
    } else if (arg === "--description-html-file") {
      args.descriptionHtmlFile = argv[++i] || "";
    } else if (arg === "--labels") {
      args.labels = splitList(argv[++i] || "");
    } else if (arg === "--label") {
      const value = argv[++i] || "";
      if (value) args.labels.push(value);
    } else if (arg === "--parent") {
      args.parent = argv[++i] || "";
    } else if (arg === "--state") {
      args.state = argv[++i] || "";
    } else if (arg === "--external-source") {
      args.externalSource = argv[++i] || "";
    } else if (arg === "--external-id") {
      args.externalId = argv[++i] || "";
    } else if (arg === "--start-date") {
      args.startDate = argv[++i] || "";
    } else if (arg === "--target-date") {
      args.targetDate = argv[++i] || "";
    } else if (arg === "--priority") {
      args.priority = argv[++i] || "none";
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
  if (args.descriptionHtmlFile) {
    args.descriptionHtml = readFileSync(args.descriptionHtmlFile, "utf8");
  }
  return args;
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function usage() {
  return `Usage:
  node scripts/plane/plane-create-work-item.mjs \\
    --workspace <slug> \\
    --project-id <uuid> \\
    --name <title> \\
    [--description-html '<p>...</p>' | --description-html-file file.html] \\
    [--label <uuid> | --labels <uuid,uuid>] \\
    [--parent <work-item-uuid>] \\
    [--state <state-uuid>] \\
    [--external-source <source>] [--external-id <id>] \\
    [--start-date YYYY-MM-DD] [--target-date YYYY-MM-DD] \\
    [--priority none|urgent|high|medium|low] \\
    [--auth api-key|app-token] \\
    [--dry-run] [--json]

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

function validate(args) {
  const errors = [];
  if (!args.workspace) errors.push("--workspace is required");
  if (!args.projectId) errors.push("--project-id is required");
  if (!args.name) errors.push("--name is required");
  if (!["none", "urgent", "high", "medium", "low"].includes(args.priority)) {
    errors.push("--priority must be one of none, urgent, high, medium, low");
  }
  for (const [name, value] of [["--start-date", args.startDate], ["--target-date", args.targetDate]]) {
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) errors.push(`${name} must be YYYY-MM-DD`);
  }
  return errors;
}

function sanitizeWorkItem(item) {
  if (!item || typeof item !== "object") return null;
  return {
    id: item.id,
    sequence_id: item.sequence_id,
    name: item.name,
    priority: item.priority,
    state: item.state,
    project: item.project,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
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
    statusText: response.statusText,
    body: parsed,
  };
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

  const payload = {
    name: args.name,
    description_html: args.descriptionHtml || undefined,
    priority: args.priority,
    labels: args.labels.length ? args.labels : undefined,
    parent: args.parent || undefined,
    state: args.state || undefined,
    external_source: args.externalSource || undefined,
    external_id: args.externalId || undefined,
    start_date: args.startDate || undefined,
    target_date: args.targetDate || undefined,
  };

  const result = {
    version: "plane-create-work-item/v0",
    baseUrl: args.baseUrl,
    authMode: auth.authMode,
    hasCredential: auth.ok,
    workspace: args.workspace || null,
    projectId: args.projectId || null,
    dryRun: args.dryRun,
    payload,
    ok: errors.length === 0,
    errors,
  };

  if (errors.length || args.dryRun) {
    printResult(result, args.json);
    process.exitCode = errors.length ? 2 : 0;
    return;
  }

  const response = await requestJson({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    method: "POST",
    path: `/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/${encodeURIComponent(args.projectId)}/work-items/`,
    body: payload,
  });

  result.ok = response.ok;
  result.status = response.status;
  result.workItem = response.ok ? sanitizeWorkItem(response.body) : undefined;
  result.error = response.ok ? undefined : response.body;

  printResult(result, args.json);
  if (!result.ok) process.exitCode = 1;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Plane create work item: ${result.ok ? "pass" : "fail"}`);
  if (result.authMode) console.log(`auth: ${result.authMode}`);
  if (result.dryRun) console.log("dry run: true");
  if (result.status) console.log(`status: HTTP ${result.status}`);
  if (result.workItem) {
    console.log(`work item: ${result.workItem.sequence_id || result.workItem.id} ${result.workItem.name}`);
  }
  for (const error of result.errors || []) console.log(`error: ${error}`);
  if (result.error) console.log(`error: ${JSON.stringify(result.error)}`);
}

main().catch((error) => {
  console.error(`Plane create work item failed: ${error.message}`);
  process.exitCode = 1;
});
