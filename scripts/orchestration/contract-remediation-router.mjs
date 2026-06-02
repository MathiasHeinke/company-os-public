#!/usr/bin/env node

/*
 * contract-remediation-router.mjs
 *
 * Stage 0.6 pre-dispatch remediation router.
 *
 * Stage 0.5 decides whether a Plane worker contract is good enough. Stage 0.6
 * decides who owns the repair when Stage 0.5 does not PASS. It never spawns,
 * never marks Done, never changes Plane state, never edits descriptions and
 * never writes Linear. Post mode writes exactly one
 * `controller.remediation-routed` Plane comment.
 */

import {
  DEFAULT_BASE_URL,
  PLANE_API_KEY_ACCOUNT,
  PLANE_API_KEY_SERVICE,
  PLANE_APP_BOT_TOKEN_ACCOUNT,
  PLANE_APP_SERVICE,
  resolvePlaneAuth,
} from "../plane/plane-auth.mjs";
import {
  CONTRACT_REVIEW_TITLE,
  CONTRACT_REVIEW_VERDICTS,
  findLatestContractReview,
} from "./contract-controller.mjs";
import { defaultLabelMapPath } from "./plane-label-map-resolver.mjs";
import { resolvePlaneItemLabels } from "./plane-labels.mjs";
import { ROLE_LABEL_SET } from "./worker-ledger-validator.mjs";
import { canonicalDescriptionHash, htmlEscape } from "./plane-html.mjs";

export const CONTRACT_REMEDIATION_VERSION = "contract-remediation-router-v0";
export const CONTRACT_REMEDIATION_TITLE = "controller.remediation-routed";

export const REMEDIATION_ACTIONS = Object.freeze({
  NONE: "none",
  RERUN_CONTRACT_CONTROLLER: "rerun-contract-controller",
  PATCH_CONTRACT: "patch-contract-and-rerun-contract-controller",
  CREATE_SPEC: "create-or-link-spec-plan-tasks",
  SPLIT_CONTRACT: "split-parent-into-child-contracts",
  REWRITE_OR_PARK: "rewrite-or-park-contract",
  PREPARE_CEO_GATE: "prepare-ceo-hg3-package-and-escalate-to-ceo",
  PREPARE_FOUNDER_GATE: "prepare-founder-gate-package-via-ceo-chief-of-staff",
  ESCALATE_TO_CEO: "escalate-to-ceo-for-owner-or-decision",
});

export const REMEDIATION_REASON_CODES = Object.freeze({
  PASS: "remediation.none-pass",
  REVIEW_MISSING: "remediation.review-missing",
  REVIEW_UNPARSEABLE: "remediation.review-unparseable",
  OWNER_MISSING: "remediation.owner-missing",
  PATCH_TO_CLEVEL: "remediation.contract-patch-to-clevel",
  SPEC_TO_CLEVEL: "remediation.spec-to-clevel",
  SPLIT_TO_CLEVEL: "remediation.split-to-clevel",
  REJECT_TO_CLEVEL: "remediation.reject-to-clevel",
  CEO_GATE_TO_CLEVEL: "remediation.ceo-hg3-package-to-clevel",
  FOUNDER_GATE_TO_CLEVEL: "remediation.founder-gate-package-to-clevel",
  UNKNOWN_VERDICT: "remediation.unknown-verdict",
});

const ROLE_LABELS = new Set(Array.from(ROLE_LABEL_SET));

export function routeContractRemediation({
  item = {},
  labelNames = [],
  latestReview = null,
  now = new Date(),
} = {}) {
  const roleLabels = (labelNames || []).filter((name) => ROLE_LABELS.has(name));
  const owner = roleLabels.length === 1 ? roleLabels[0] : null;
  const sequence = item?.sequence_id ? `COMPA-${item.sequence_id}` : item?.id || "unknown";
  const descriptionHash = canonicalDescriptionHash(item);
  const base = {
    ok: true,
    version: CONTRACT_REMEDIATION_VERSION,
    route_required: true,
    work_item: sequence,
    source_review_comment_id: latestReview?.comment_id || null,
    source_review_verdict: latestReview?.fields?.verdict || null,
    description_hash: descriptionHash,
    role_labels: roleLabels,
    route_owner: owner || "ceo",
    escalation_level: owner ? "c-level" : "ceo",
    escalation_path: owner ? [owner, "ceo"] : ["ceo"],
    ceo_gate_required: false,
    founder_gate_required: false,
    action: REMEDIATION_ACTIONS.ESCALATE_TO_CEO,
    reason_codes: [],
    message: "",
    routed_at: now.toISOString(),
  };

  if (!latestReview) {
    return withOwnerFallback({
      ...base,
      action: REMEDIATION_ACTIONS.RERUN_CONTRACT_CONTROLLER,
      reason_codes: [REMEDIATION_REASON_CODES.REVIEW_MISSING],
      message: "No controller.contract-review exists yet. Rerun Stage 0.5 before dispatcher lock.",
    }, owner);
  }

  const verdict = latestReview.fields?.verdict || "";
  if (!verdict) {
    return withOwnerFallback({
      ...base,
      action: REMEDIATION_ACTIONS.RERUN_CONTRACT_CONTROLLER,
      reason_codes: [REMEDIATION_REASON_CODES.REVIEW_UNPARSEABLE],
      message: "Latest controller.contract-review is not parseable. Rerun Stage 0.5.",
    }, owner);
  }

  if (verdict === CONTRACT_REVIEW_VERDICTS.PASS) {
    return {
      ...base,
      route_required: false,
      route_owner: "none",
      escalation_level: "none",
      escalation_path: [],
      action: REMEDIATION_ACTIONS.NONE,
      reason_codes: [REMEDIATION_REASON_CODES.PASS],
      message: "Contract passed. No remediation route is required; dispatcher lock is allowed.",
    };
  }

  if (!owner) {
    return {
      ...base,
      reason_codes: [REMEDIATION_REASON_CODES.OWNER_MISSING],
      message: `Non-PASS contract review (${verdict}) has no single role:* owner. CEO must assign ownership before remediation.`,
    };
  }

  if (verdict === CONTRACT_REVIEW_VERDICTS.PATCH_REQUIRED) {
    return {
      ...base,
      action: REMEDIATION_ACTIONS.PATCH_CONTRACT,
      reason_codes: [REMEDIATION_REASON_CODES.PATCH_TO_CLEVEL],
      message: `${owner} owns contract repair: patch missing/weak fields and rerun Stage 0.5.`,
    };
  }

  if (verdict === CONTRACT_REVIEW_VERDICTS.SPEC_REQUIRED) {
    return {
      ...base,
      action: REMEDIATION_ACTIONS.CREATE_SPEC,
      reason_codes: [REMEDIATION_REASON_CODES.SPEC_TO_CLEVEL],
      message: `${owner} owns pre-work: create or link Spec/Plan/Tasks, harness/eval or no-spec rationale, then rerun Stage 0.5.`,
    };
  }

  if (verdict === CONTRACT_REVIEW_VERDICTS.SPLIT_REQUIRED) {
    return {
      ...base,
      action: REMEDIATION_ACTIONS.SPLIT_CONTRACT,
      reason_codes: [REMEDIATION_REASON_CODES.SPLIT_TO_CLEVEL],
      message: `${owner} owns decomposition: split parent into smaller role-labeled child contracts.`,
    };
  }

  if (verdict === CONTRACT_REVIEW_VERDICTS.CEO_GATE_REQUIRED) {
    return {
      ...base,
      action: REMEDIATION_ACTIONS.PREPARE_CEO_GATE,
      reason_codes: [REMEDIATION_REASON_CODES.CEO_GATE_TO_CLEVEL],
      escalation_path: [owner, "ceo"],
      ceo_gate_required: true,
      message: `${owner} prepares the HG-3 CEO critical-release package; CEO/Codex decides only after reversibility, rollback and CAO evidence are explicit.`,
    };
  }

  if (verdict === CONTRACT_REVIEW_VERDICTS.FOUNDER_GATE_REQUIRED) {
    return {
      ...base,
      action: REMEDIATION_ACTIONS.PREPARE_FOUNDER_GATE,
      reason_codes: [REMEDIATION_REASON_CODES.FOUNDER_GATE_TO_CLEVEL],
      escalation_path: [owner, "ceo", "chief-of-staff", "founder"],
      founder_gate_required: true,
      message: `${owner} prepares the HG-4 founder-gate package; CEO reviews, Chief-of-Staff translates, Founder signs only with a concrete decision card.`,
    };
  }

  if (verdict === CONTRACT_REVIEW_VERDICTS.REJECT) {
    return {
      ...base,
      action: REMEDIATION_ACTIONS.REWRITE_OR_PARK,
      reason_codes: [REMEDIATION_REASON_CODES.REJECT_TO_CLEVEL],
      message: `${owner} owns rewrite or park decision. Do not dispatch until a new contract passes Stage 0.5.`,
    };
  }

  return {
    ...base,
    route_owner: "ceo",
    escalation_level: "ceo",
    escalation_path: ["ceo"],
    action: REMEDIATION_ACTIONS.ESCALATE_TO_CEO,
    reason_codes: [REMEDIATION_REASON_CODES.UNKNOWN_VERDICT],
    message: `Unknown contract-review verdict (${verdict}). CEO must classify before remediation.`,
  };
}

function withOwnerFallback(route, owner) {
  if (owner) return route;
  return {
    ...route,
    route_owner: "ceo",
    escalation_level: "ceo",
    escalation_path: ["ceo"],
    reason_codes: Array.from(new Set([...route.reason_codes, REMEDIATION_REASON_CODES.OWNER_MISSING])),
  };
}

export function buildRemediationYaml({ route, reviewer = "codex" }) {
  const reasonCodes = route.reason_codes.length ? route.reason_codes.join(", ") : "none";
  const roleLabels = route.role_labels.length ? route.role_labels.join(", ") : "none";
  const path = route.escalation_path.length ? route.escalation_path.join(" -> ") : "none";
  return [
    `${CONTRACT_REMEDIATION_TITLE}:`,
    `  version: ${CONTRACT_REMEDIATION_VERSION}`,
    `  work_item: ${route.work_item}`,
    `  reviewer: ${reviewer}`,
    `  route_required: ${route.route_required}`,
    `  route_owner: ${route.route_owner}`,
    `  escalation_level: ${route.escalation_level}`,
    `  escalation_path: ${path}`,
    `  ceo_gate_required: ${route.ceo_gate_required}`,
    `  founder_gate_required: ${route.founder_gate_required}`,
    `  action: ${route.action}`,
    `  source_review_verdict: ${route.source_review_verdict || "none"}`,
    `  source_review_comment_id: ${route.source_review_comment_id || "none"}`,
    `  description_hash: ${route.description_hash}`,
    `  role_labels: ${roleLabels}`,
    `  reason_codes: ${reasonCodes}`,
    `  message: ${oneLine(route.message)}`,
    `  signed_at: ${route.routed_at}`,
  ].join("\n");
}

function oneLine(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    auth: process.env.PLANE_AUTH_MODE || "app-token",
    workspace: process.env.PLANE_WORKSPACE_SLUG || "",
    projectId: "",
    workItemId: "",
    sequenceId: "",
    mode: "dry-run",
    labelMap: process.env.PLANE_LABEL_MAP_PATH || "",
    reviewer: "codex",
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--workspace") args.workspace = argv[++i] || "";
    else if (arg === "--project-id") args.projectId = argv[++i] || "";
    else if (arg === "--work-item-id") args.workItemId = argv[++i] || "";
    else if (arg === "--sequence") args.sequenceId = argv[++i] || "";
    else if (arg === "--mode") args.mode = argv[++i] || "dry-run";
    else if (arg === "--auth") args.auth = argv[++i] || "app-token";
    else if (arg === "--base-url") args.baseUrl = argv[++i] || DEFAULT_BASE_URL;
    else if (arg === "--label-map") args.labelMap = argv[++i] || "";
    else if (arg === "--reviewer") args.reviewer = argv[++i] || "codex";
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  return args;
}

function usage() {
  return `Usage:
  node scripts/orchestration/contract-remediation-router.mjs \\
    --workspace <slug> --project-id <uuid> \\
    (--work-item-id <uuid> | --sequence COMPA-<n>) \\
    [--mode dry-run|post] [--auth api-key|app-token] [--json]

Stage 0.6 remediation router for non-PASS controller.contract-review results.
Dry-run writes nothing. Post mode writes exactly one
controller.remediation-routed Plane comment. It never locks, spawns, marks Done,
writes Linear, deploys, edits source, or mutates work item descriptions.

Keychain fallback:
  api key:   ${PLANE_API_KEY_SERVICE} / ${PLANE_API_KEY_ACCOUNT}
  app token: ${PLANE_APP_SERVICE} / ${PLANE_APP_BOT_TOKEN_ACCOUNT}
`;
}

function validateArgs(args) {
  const errors = [];
  if (!args.workspace) errors.push("--workspace is required");
  if (!args.projectId) errors.push("--project-id is required");
  if (!args.workItemId && !args.sequenceId) errors.push("--work-item-id or --sequence is required");
  if (!["dry-run", "post"].includes(args.mode)) errors.push("--mode must be dry-run or post");
  return errors;
}

async function requestJson({ baseUrl, authHeaders, path, method = "GET", body }) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...authHeaders, "Accept": "application/json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text.slice(0, 500) }; }
  return { ok: response.ok, status: response.status, body: parsed };
}

async function fetchWorkItem({ baseUrl, authHeaders, workspace, projectId, workItemId, sequenceId }) {
  if (workItemId) {
    const path = `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(workItemId)}/`;
    return requestJson({ baseUrl, authHeaders, path });
  }
  const listed = await requestJson({
    baseUrl,
    authHeaders,
    path: `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/`,
  });
  if (!listed.ok) return listed;
  const rows = Array.isArray(listed.body) ? listed.body : (listed.body?.results || []);
  const wantedSeq = String(sequenceId).replace(/^.+-/, "");
  const found = rows.find((row) => String(row.sequence_id) === String(wantedSeq));
  if (!found) return { ok: false, status: 404, body: { detail: `sequence ${sequenceId} not found in project` } };
  return requestJson({
    baseUrl,
    authHeaders,
    path: `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(found.id)}/`,
  });
}

async function fetchComments({ baseUrl, authHeaders, workspace, projectId, workItemId }) {
  const path = `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(workItemId)}/comments/`;
  const response = await requestJson({ baseUrl, authHeaders, path });
  if (!response.ok) return response;
  return {
    ok: true,
    status: response.status,
    body: Array.isArray(response.body) ? response.body : (response.body?.results || []),
  };
}

async function postComment({ baseUrl, authHeaders, workspace, projectId, workItemId, html }) {
  const path = `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(workItemId)}/comments/`;
  return requestJson({ baseUrl, authHeaders, path, method: "POST", body: { comment_html: html } });
}

function wrapAsCommentHtml(title, body) {
  return `<p><strong>${htmlEscape(title)}</strong></p><pre><code>${htmlEscape(body)}</code></pre>`;
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

  const result = {
    version: "contract-remediation-router-cli/v0",
    mode: args.mode,
    authMode: auth.authMode,
    workspace: args.workspace || null,
    projectId: args.projectId || null,
    work_item: null,
    ok: errors.length === 0,
    errors,
  };
  if (errors.length) {
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  const fetched = await fetchWorkItem({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    workspace: args.workspace,
    projectId: args.projectId,
    workItemId: args.workItemId,
    sequenceId: args.sequenceId,
  });
  if (!fetched.ok) {
    result.ok = false;
    result.status = fetched.status;
    result.error = fetched.body;
    printResult(result, args.json);
    process.exitCode = 1;
    return;
  }
  const item = fetched.body;
  result.work_item = {
    id: item.id,
    sequence_id: item.sequence_id ? `COMPA-${item.sequence_id}` : null,
    name: item.name,
  };

  const commentsResp = await fetchComments({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    workspace: args.workspace,
    projectId: args.projectId,
    workItemId: item.id,
  });
  if (!commentsResp.ok) {
    result.ok = false;
    result.status = commentsResp.status;
    result.error = commentsResp.body;
    printResult(result, args.json);
    process.exitCode = 1;
    return;
  }

  const labelMapPath = args.labelMap || defaultLabelMapPath({ workspace: args.workspace, projectId: args.projectId });
  const labelResolution = await resolvePlaneItemLabels({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    workspace: args.workspace,
    projectId: args.projectId,
    item,
    labelMapPath,
  });
  const labelNames = labelResolution.ok ? labelResolution.names : [];
  const latestReview = findLatestContractReview(commentsResp.body);
  const route = routeContractRemediation({ item, labelNames, latestReview });
  result.ok = true;
  result.label_resolution = labelResolution;
  result.route = route;
  result.remediation_yaml = buildRemediationYaml({ route, reviewer: args.reviewer });

  if (args.mode === "post") {
    const post = await postComment({
      baseUrl: args.baseUrl,
      authHeaders: auth.headers,
      workspace: args.workspace,
      projectId: args.projectId,
      workItemId: item.id,
      html: wrapAsCommentHtml(CONTRACT_REMEDIATION_TITLE, result.remediation_yaml),
    });
    result.post_status = post.status;
    result.post_ok = post.ok;
    result.post_comment_id = post.ok && post.body?.id ? post.body.id : null;
    if (!post.ok) {
      result.ok = false;
      result.error = post.body;
    }
  }

  printResult(result, args.json);
  process.exitCode = result.ok ? 0 : 2;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (result.work_item) console.log(`work item: ${result.work_item.sequence_id || result.work_item.id} ${result.work_item.name}`);
  console.log(`remediation route: ${result.route?.action || "ERROR"}`);
  if (result.route) {
    console.log(`owner: ${result.route.route_owner}`);
    console.log(`escalation: ${result.route.escalation_path.join(" -> ") || "none"}`);
    for (const code of result.route.reason_codes || []) console.log(`reason: ${code}`);
  }
  if (result.post_status) console.log(`posted: HTTP ${result.post_status}`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((error) => {
    console.error(`Contract remediation router failed: ${error.message}`);
    process.exitCode = 1;
  });
}
