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
  PLANE_WORK_ITEM_STATE_VERSION,
  buildWorkItemStatePatch,
  isDoneState,
  resolveTargetState,
  sanitizeState,
  sanitizeWorkItem,
  stateAlreadySet,
  validateStateChangeArgs,
} from "./plane-work-item-state-core.mjs";

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    auth: process.env.PLANE_AUTH_MODE || "app-token",
    workspace: process.env.PLANE_WORKSPACE_SLUG || "",
    projectId: "",
    workItemId: "",
    sequenceId: "",
    state: "",
    stateId: "",
    confirmDone: false,
    dryRun: false,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") args.json = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--confirm-done") args.confirmDone = true;
    else if (arg === "--workspace") args.workspace = argv[++i] || "";
    else if (arg === "--project-id") args.projectId = argv[++i] || "";
    else if (arg === "--work-item-id") args.workItemId = argv[++i] || "";
    else if (arg === "--sequence-id") args.sequenceId = String(argv[++i] || "").replace(/^COMPA-/i, "");
    else if (arg === "--state") args.state = argv[++i] || "";
    else if (arg === "--state-id") args.stateId = argv[++i] || "";
    else if (arg === "--auth") args.auth = argv[++i] || "app-token";
    else if (arg === "--base-url") args.baseUrl = argv[++i] || DEFAULT_BASE_URL;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  return args;
}

function usage() {
  return `Usage:
  node scripts/plane/plane-work-item-state.mjs \\
    --workspace <slug> \\
    --project-id <uuid> \\
    (--work-item-id <uuid> | --sequence-id <number|COMPA-number>) \\
    (--state <name> | --state-id <uuid>) \\
    [--auth app-token|api-key] [--dry-run] [--confirm-done] [--json]

Examples:
  # Preview the exact Plane PATCH body.
  node scripts/plane/plane-work-item-state.mjs \\
    --workspace companyos \\
    --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e \\
    --sequence-id [WORK_ITEM_ID] \\
    --state Done \\
    --dry-run --json

  # CEO/Codex-only closeout transition.
  node scripts/plane/plane-work-item-state.mjs \\
    --workspace companyos \\
    --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e \\
    --sequence-id [WORK_ITEM_ID] \\
    --state Done \\
    --confirm-done --json

Important:
  Plane work-item state updates use JSON key "state", not "state_id".

Keychain fallback:
  api key:   ${PLANE_API_KEY_SERVICE} / ${PLANE_API_KEY_ACCOUNT}
  app token: ${PLANE_APP_SERVICE} / ${PLANE_APP_BOT_TOKEN_ACCOUNT}
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

function listResults(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.results)) return body.results;
  return [];
}

async function fetchStates({ args, authHeaders }) {
  const response = await requestJson({
    baseUrl: args.baseUrl,
    authHeaders,
    path: `/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/${encodeURIComponent(args.projectId)}/states/`,
  });
  return response;
}

async function fetchWorkItemById({ args, authHeaders, workItemId }) {
  return requestJson({
    baseUrl: args.baseUrl,
    authHeaders,
    path: `/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/${encodeURIComponent(args.projectId)}/work-items/${encodeURIComponent(workItemId)}/?fields=id,sequence_id,name,state,updated_at&expand=state`,
  });
}

async function resolveWorkItem({ args, authHeaders }) {
  if (args.workItemId) {
    const response = await fetchWorkItemById({ args, authHeaders, workItemId: args.workItemId });
    return { response, item: response.body };
  }
  const response = await requestJson({
    baseUrl: args.baseUrl,
    authHeaders,
    path: `/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/${encodeURIComponent(args.projectId)}/work-items/?per_page=100&fields=id,sequence_id,name,state,updated_at&expand=state`,
  });
  if (!response.ok) return { response, item: null };
  const sequence = Number(args.sequenceId);
  const item = listResults(response.body).find((candidate) => Number(candidate.sequence_id) === sequence) || null;
  return {
    response: item ? { ok: true, status: response.status, body: item } : { ok: false, status: 404, body: { error: "sequence_id not found" } },
    item,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const errors = validateStateChangeArgs(args);
  const auth = resolvePlaneAuth(args.auth);
  if (!auth.ok) errors.push(auth.missingError);

  const result = {
    version: PLANE_WORK_ITEM_STATE_VERSION,
    baseUrl: args.baseUrl,
    authMode: auth.authMode,
    hasCredential: auth.ok,
    workspace: args.workspace || null,
    projectId: args.projectId || null,
    workItemId: args.workItemId || null,
    sequenceId: args.sequenceId || null,
    dryRun: args.dryRun,
    ok: errors.length === 0,
    errors,
  };

  if (errors.length) {
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  const statesResponse = await fetchStates({ args, authHeaders: auth.headers });
  result.stateListStatus = statesResponse.status;
  if (!statesResponse.ok) {
    result.ok = false;
    result.errors.push(`states request failed: HTTP ${statesResponse.status}`);
    result.error = statesResponse.body;
    printResult(result, args.json);
    process.exitCode = 1;
    return;
  }

  const states = listResults(statesResponse.body);
  result.availableStates = states.map(sanitizeState);
  const target = resolveTargetState({ states, state: args.state, stateId: args.stateId });
  result.targetState = sanitizeState(target.state);
  if (!target.ok) {
    result.ok = false;
    result.errors.push(target.reason);
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }
  if (!args.dryRun && isDoneState(target.state) && !args.confirmDone) {
    result.ok = false;
    result.errors.push("--confirm-done is required for completed state targets");
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  const { response: itemResponse, item } = await resolveWorkItem({ args, authHeaders: auth.headers });
  result.workItemLookupStatus = itemResponse.status;
  if (!itemResponse.ok || !item) {
    result.ok = false;
    result.errors.push(`work item lookup failed: HTTP ${itemResponse.status}`);
    result.error = itemResponse.body;
    printResult(result, args.json);
    process.exitCode = 1;
    return;
  }

  result.before = sanitizeWorkItem(item);
  result.patch = buildWorkItemStatePatch({ stateId: target.state.id });
  result.usesCorrectPlaneStateKey = Object.hasOwn(result.patch, "state") && !Object.hasOwn(result.patch, "state_id");

  if (stateAlreadySet({ item, targetState: target.state })) {
    result.ok = true;
    result.action = "already-set";
    result.after = result.before;
    printResult(result, args.json);
    return;
  }

  if (args.dryRun) {
    result.ok = true;
    result.action = "dry-run";
    result.after = null;
    printResult(result, args.json);
    return;
  }

  const patchResponse = await requestJson({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    method: "PATCH",
    path: `/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/${encodeURIComponent(args.projectId)}/work-items/${encodeURIComponent(item.id)}/`,
    body: result.patch,
  });
  result.patchStatus = patchResponse.status;
  if (!patchResponse.ok) {
    result.ok = false;
    result.errors.push(`patch failed: HTTP ${patchResponse.status}`);
    result.error = patchResponse.body;
    printResult(result, args.json);
    process.exitCode = 1;
    return;
  }

  const afterResponse = await fetchWorkItemById({ args, authHeaders: auth.headers, workItemId: item.id });
  result.afterLookupStatus = afterResponse.status;
  result.after = sanitizeWorkItem(afterResponse.body);
  result.ok = afterResponse.ok && stateAlreadySet({ item: afterResponse.body, targetState: target.state });
  result.action = result.ok ? "patched" : "patch-unverified";
  if (!result.ok) {
    result.errors.push("patch response could not be verified by read-back");
    process.exitCode = 1;
  }
  printResult(result, args.json);
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`Plane work-item state: ${result.ok ? "pass" : "fail"}`);
  if (result.sequenceId) console.log(`sequence: COMPA-${result.sequenceId}`);
  if (result.workItemId) console.log(`work item id: ${result.workItemId}`);
  if (result.action) console.log(`action: ${result.action}`);
  if (result.before?.state) console.log(`before: ${result.before.state.name || result.before.state}`);
  if (result.after?.state) console.log(`after: ${result.after.state.name || result.after.state}`);
  for (const error of result.errors || []) console.log(`error: ${error}`);
}

main().catch((error) => {
  console.error(`Plane work-item state failed: ${error.message}`);
  process.exitCode = 1;
});
