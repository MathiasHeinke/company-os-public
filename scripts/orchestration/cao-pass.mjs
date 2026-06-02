#!/usr/bin/env node

/*
 * cao-pass.mjs
 *
 * Phase 1 Chief Audit Officer (CAO) controller pass for a single Plane
 * work item. Reads the work item + comments, runs deterministic checks,
 * emits a controller.verdict YAML.
 *
 * Hard guarantees (v0, CTO-pass scope):
 *   - never spawns a worker
 *   - never marks anything Done
 *   - never modifies the work item description
 *   - never changes labels
 *   - never writes to Linear
 *   - default mode is dry-run (verdict printed, NOT posted to Plane)
 *
 * --mode dry-run (default): compute verdict, print to stdout, no writes
 * --mode post:              post controller.verdict comment, no state change
 *
 * Source of truth:
 *   docs/agents/cao.md
 *   docs/orchestration/plane-worker-dispatcher-v0.md
 *   docs/orchestration/plane-role-routing.md
 *
 * Phase 1 scope: covers the CTO pass surface (validator + lock+report
 * presence + description hash invariant). Full role-specific check suites
 * (CMO/COO/CPO/CFO) are tracked as separate work items.
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
  extractContractBlock,
  normalizeHumanGateLevel,
  validateContract,
} from "./worker-ledger-validator.mjs";
import { defaultLabelMapPath } from "./plane-label-map-resolver.mjs";
import { resolvePlaneItemLabels } from "./plane-labels.mjs";
import {
  canonicalDescriptionHash,
  descriptionHashCandidates,
  extractLockDescriptionHash,
  htmlEscape,
  parseYamlScalar,
  stripHtml,
} from "./plane-html.mjs";

const LOCK_COMMENT_TITLE = "worker.lock (dispatcher-v0)";
const REPORT_COMMENT_PREFIX = "worker.reported"; // matches "worker.reported"

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    auth: process.env.PLANE_AUTH_MODE || "app-token",
    workspace: process.env.PLANE_WORKSPACE_SLUG || "",
    projectId: "",
    workItemId: "",
    mode: "dry-run",
    labelMap: process.env.PLANE_LABEL_MAP_PATH || "",
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--workspace") args.workspace = argv[++i] || "";
    else if (arg === "--project-id") args.projectId = argv[++i] || "";
    else if (arg === "--work-item-id") args.workItemId = argv[++i] || "";
    else if (arg === "--mode") args.mode = argv[++i] || "dry-run";
    else if (arg === "--auth") args.auth = argv[++i] || "app-token";
    else if (arg === "--base-url") args.baseUrl = argv[++i] || DEFAULT_BASE_URL;
    else if (arg === "--label-map") args.labelMap = argv[++i] || "";
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  return args;
}

function usage() {
  return `Usage:
  node scripts/orchestration/cao-pass.mjs \\
    --workspace <slug> --project-id <uuid> --work-item-id <uuid> \\
    [--mode dry-run|post] \\
    [--auth api-key|app-token] \\
    [--label-map <path>] [--json]

Default mode is dry-run (no Plane writes). --mode post writes a single
controller.verdict comment. Never marks Done. Never spawns a worker.

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
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text.slice(0, 500) }; }
  return { ok: response.ok, status: response.status, body: parsed };
}

async function fetchWorkItem({ baseUrl, authHeaders, workspace, projectId, workItemId }) {
  const path = `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(workItemId)}/`;
  return requestJson({ baseUrl, authHeaders, path });
}

async function listComments({ baseUrl, authHeaders, workspace, projectId, workItemId }) {
  const path = `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(workItemId)}/comments/`;
  return requestJson({ baseUrl, authHeaders, path });
}

function findLockComment(comments) {
  // Returns the most recent worker.lock comment (active or expired) and
  // structured fields parsed from its YAML block.
  let best = null;
  for (const row of comments || []) {
    const html = row.comment_html || "";
    if (!html.includes(LOCK_COMMENT_TITLE)) continue;
    const body = stripHtml(html);
    const yaml = body.match(/worker\.lock:\s*\n([\s\S]*?)(?:\n\S|$)/);
    if (!yaml) continue;
    const fields = parseYamlScalar(yaml[1]);
    const ts = row.created_at ? Date.parse(row.created_at) : 0;
    if (!best || ts > best.ts) {
      best = { comment_id: row.id, created_at: row.created_at, ts, fields, raw_body: body };
    }
  }
  return best;
}

function findReportComments(comments, { afterTs = -Infinity } = {}) {
  // worker.reported is the canonical marker for a worker delivery.
  const found = [];
  for (const row of comments || []) {
    const html = row.comment_html || "";
    const strongTitle = html.match(/<strong>\s*([^<]+?)\s*<\/strong>/i)?.[1] || "";
    if (strongTitle === REPORT_COMMENT_PREFIX) {
      const ts = row.created_at ? Date.parse(row.created_at) : 0;
      const body = stripHtml(html);
      const state = body.match(/\bstate:\s*([A-Z_]+)/)?.[1] || null;
      const reasonMatch = body.match(/^\s*reason:\s*([^\n]+)$/m);
      const reason = reasonMatch ? reasonMatch[1].trim() : null;
      if (ts >= afterTs) {
        found.push({
          comment_id: row.id,
          created_at: row.created_at,
          ts,
          state,
          reason,
          hg35: parseHg35Block(body),
          dispatcher_version: parseDispatcherVersion(body),
          has_reflection: reportBodyHasField(body, "reflection"),
          has_learning_proposals: reportBodyHasField(body, "learning_proposals"),
        });
      }
    }
  }
  return found.sort((a, b) => a.ts - b.ts);
}

/**
 * Parse the `hg35:` sub-block from a worker.reported body. Captures the
 * pause_artifact, awaiting_sign and sign_comment_id sub-keys. The
 * parser stops at the first line whose indent is shallower than the
 * block's base indent. Returns null when no `hg35:` block is present.
 *
 * Sub-key values are coerced as follows:
 *   - "true" / "false" -> boolean
 *   - "" / "null" / "none" -> null
 *   - everything else -> trimmed string
 */
export function parseHg35Block(body) {
  if (!body) return null;
  const lines = body.split(/\r?\n/);
  let inBlock = false;
  let baseIndent = -1;
  const block = {};
  for (const line of lines) {
    const match = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!match) continue;
    const [, indent, key, rest] = match;
    if (!inBlock) {
      if (key === "hg35") {
        inBlock = true;
        baseIndent = indent.length;
      }
      continue;
    }
    if (indent.length <= baseIndent) break;
    const raw = rest.trim();
    let value;
    if (raw === "true") value = true;
    else if (raw === "false") value = false;
    else if (raw === "" || raw === "null" || raw === "none") value = null;
    else value = raw;
    block[key] = value;
  }
  return inBlock ? block : null;
}

export function parseDispatcherVersion(body) {
  if (!body) return null;
  const match = body.match(/^\s*version:\s*([^\n]+)/m);
  return match ? match[1].trim() : null;
}

export function isDispatcherV12Plus(version) {
  if (!version) return false;
  const match = String(version).match(/dispatcher-v(\d+)\.(\d+)/);
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major > 1 || (major === 1 && minor >= 2);
}

export function reportBodyHasField(body, fieldName) {
  if (!body || !fieldName) return false;
  const lines = body.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!match) continue;
    const [, indent, key, rest] = match;
    if (key !== fieldName) continue;
    const value = rest.trim();
    if (value && value !== "null" && value !== "none" && value !== "[]" && value !== '""' && value !== "''") {
      return true;
    }
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = lines[j];
      if (next.trim() === "") continue;
      const nextIndent = next.match(/^(\s*)/)[1];
      if (nextIndent.length > indent.length) return true;
      break;
    }
  }
  return false;
}

export function parseContractPolicy(description, fieldName) {
  if (!description || !fieldName) return "absent";
  const parts = String(fieldName)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const fieldPattern = parts.length
    ? parts.join("[\\s_-]*")
    : String(fieldName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|\\n)\\s*${fieldPattern}\\s*:\\s*([^\\n]+)`, "i");
  const match = description.match(re);
  if (!match) return "absent";
  const raw = match[1].trim().toLowerCase();
  if (["required", "mandatory", "enforced", "must"].includes(raw)) return "required";
  if (["optional", "none", "disabled", "no", "off"].includes(raw)) return "optional";
  return raw || "absent";
}

export function isPolicyRequired({ contractPolicy, dispatcherVersion }) {
  if (contractPolicy === "required") return true;
  if (contractPolicy === "optional") return false;
  return isDispatcherV12Plus(dispatcherVersion);
}

function selectReportForCao(reports) {
  if (reports.length <= 1) {
    return {
      report: reports[0] || null,
      duplicate: false,
      superseded_count: 0,
      policy: "single-report",
    };
  }
  const latest = reports[reports.length - 1];
  const previous = reports.slice(0, -1);
  const previousTerminalFailures = previous.every((r) => ["NEEDS_HUMAN", "RUNTIME_ERROR", "TIMEOUT"].includes(r.state));
  const latestPass = latest.state === "PASS";
  const previousPassCount = previous.filter((r) => r.state === "PASS").length;
  if (latestPass && previousPassCount === 0 && previousTerminalFailures) {
    return {
      report: latest,
      duplicate: false,
      superseded_count: previous.length,
      superseded_reports: previous.map((r) => ({ comment_id: r.comment_id, state: r.state })),
      policy: "latest-pass-supersedes-failed-retries",
    };
  }
  return {
    report: null,
    duplicate: true,
    superseded_count: 0,
    policy: "duplicate-report-reject",
  };
}

function findContextComment(comments) {
  for (const row of comments || []) {
    const html = row.comment_html || "";
    if (html.includes("worker.context (dispatcher-v0)")) {
      return { comment_id: row.id, created_at: row.created_at };
    }
  }
  return null;
}

/**
 * Pure CAO-pass evaluation. Takes already-fetched item + comments and
 * returns a verdict structure. No I/O.
 *
 * Reject codes (stable, Phase 1 CTO pass):
 *   cao.lock-missing
 *   cao.report-missing
 *   cao.report-non-pass
 *   cao.context-missing
 *   cao.lock-expired
 *   cao.description-hash-changed
 *   cao.contract-validator-fail
 *   cao.role-label-changed
 *   cao.role-mismatch
 *   cao.reflection-block-missing
 *   cao.learning-proposals-missing
 *   cao.lock-superseded-not-acknowledged   (advisory; future-use)
 *
 * Reflection / learning-proposal gating:
 *   - If contract declares `ReflectionPolicy: required` -> required.
 *   - If contract declares `ReflectionPolicy: optional|none|disabled` -> not required.
 *   - If contract declares no policy -> required iff worker.reported carries a
 *     dispatcher-v1.2+ version marker (default-required for new runtime).
 *   - Same rules apply to `LearningProposalPolicy` and `learning_proposals:`.
 *   - Historic worker.reported comments without a version marker stay green.
 */
export function runCaoPass({ item, labelNames, comments, sessionId, now = new Date() }) {
  const reasonCodes = [];
  const evidence = {};

  const seq = item?.sequence_id ? `COMPA-${item.sequence_id}` : item?.id;
  const role = (labelNames || []).find((n) => typeof n === "string" && n.startsWith("role:")) || null;
  evidence.role_label = role;

  // Validator re-pass on current description.
  const desc = stripHtml(item?.description_html || item?.description_stripped || item?.description || "");
  const validator = validateContract({
    description: desc,
    labels: labelNames || [],
    parentRoleLabel: undefined,
  });
  evidence.validator_verdict = { ok: validator.ok, reason_codes: validator.reason_codes };
  if (!validator.ok) reasonCodes.push("cao.contract-validator-fail");

  // Lock comment must be present.
  const lock = findLockComment(comments);
  if (!lock) {
    reasonCodes.push("cao.lock-missing");
    evidence.lock = null;
  } else {
    evidence.lock = {
      comment_id: lock.comment_id,
      created_at: lock.created_at,
      dispatcher_run_id: lock.fields.dispatcher_run_id || null,
      role: lock.fields.role || null,
      expires_at: lock.fields.expires_at || null,
      hash_at_lock: null,
    };
    // Description hash invariant.
    const hashAtLock = extractLockDescriptionHash(lock.raw_body);
    if (hashAtLock) {
      evidence.lock.hash_at_lock = hashAtLock;
      const currentHash = canonicalDescriptionHash(item || {});
      const hashCandidates = descriptionHashCandidates(item || {});
      const match = hashCandidates.includes(hashAtLock);
      evidence.description = {
        current_hash: currentHash,
        lock_hash: hashAtLock,
        match,
        accepted_hash_algorithms: hashCandidates.length === 1 ? ["canonical"] : ["canonical", "legacy-raw"],
      };
      if (!match) reasonCodes.push("cao.description-hash-changed");
    } else {
      evidence.description = { warning: "lock comment missing description hash field" };
    }

    // Lock expired?
    if (lock.fields.expires_at) {
      const expiry = Date.parse(lock.fields.expires_at);
      if (Number.isFinite(expiry) && expiry < now.getTime()) {
        reasonCodes.push("cao.lock-expired");
      }
    }

    // Role consistency between lock and current label.
    if (lock.fields.role && role && lock.fields.role !== role) {
      reasonCodes.push("cao.role-label-changed");
    }
    if (lock.fields.role && !role) {
      reasonCodes.push("cao.role-mismatch");
    }
  }

  // Context comment expected.
  const ctx = findContextComment(comments);
  evidence.context = ctx ? { comment_id: ctx.comment_id } : null;
  if (!ctx) reasonCodes.push("cao.context-missing");

  // Report comment must be present. Scheduler retries can leave failed
  // worker.reported comments under the same lock; CAO may select a later PASS
  // only when every earlier report is a terminal failure.
  const reports = findReportComments(comments, { afterTs: lock?.ts ?? -Infinity });
  const reportSelection = selectReportForCao(reports);
  evidence.report = reportSelection.report ? {
    comment_id: reportSelection.report.comment_id,
    state: reportSelection.report.state,
  } : null;
  evidence.report_count = reports.length;
  evidence.report_scope = lock ? "after-current-lock" : "all-comments";
  evidence.report_selection = {
    policy: reportSelection.policy,
    superseded_count: reportSelection.superseded_count,
    superseded_reports: reportSelection.superseded_reports || [],
  };
  if (reports.length === 0) reasonCodes.push("cao.report-missing");
  if (reportSelection.duplicate) reasonCodes.push("cao.report-duplicate");
  if (reportSelection.report && reportSelection.report.state !== "PASS") {
    reasonCodes.push("cao.report-non-pass");
  }

  const selectedReport = reportSelection.report
    ? reports.find((r) => r.comment_id === reportSelection.report.comment_id) || null
    : null;
  const reflectionContractPolicy = parseContractPolicy(desc, "ReflectionPolicy");
  const learningContractPolicy = parseContractPolicy(desc, "LearningProposalPolicy");
  const dispatcherVersion = selectedReport?.dispatcher_version || null;
  const reflectionRequired = isPolicyRequired({
    contractPolicy: reflectionContractPolicy,
    dispatcherVersion,
  });
  const learningRequired = isPolicyRequired({
    contractPolicy: learningContractPolicy,
    dispatcherVersion,
  });
  evidence.reflection = {
    contract_policy: reflectionContractPolicy,
    dispatcher_version: dispatcherVersion,
    required: reflectionRequired,
    present: Boolean(selectedReport?.has_reflection),
  };
  evidence.learning_proposals = {
    contract_policy: learningContractPolicy,
    dispatcher_version: dispatcherVersion,
    required: learningRequired,
    present: Boolean(selectedReport?.has_learning_proposals),
  };
  if (selectedReport && reflectionRequired && !selectedReport.has_reflection) {
    reasonCodes.push("cao.reflection-block-missing");
  }
  if (selectedReport && learningRequired && !selectedReport.has_learning_proposals) {
    reasonCodes.push("cao.learning-proposals-missing");
  }

  // Chief-of-Staff / Founder-Proxy (HG-3.5) PARK detection.
  // Source of truth: docs/governance/human-gate-levels.md.
  // A well-formed founder-proxy pause is NEEDS_HUMAN + reason
  // `hg35-pause-pending` with a non-empty `hg35.pause_artifact` and
  // `awaiting_sign: true`. CAO emits PARK (not REJECT) in that case;
  // `cao.report-non-pass` is superseded because PARK is the right
  // verdict while the proxy reviews the artifact.
  const extracted = extractContractBlock(desc);
  const contractFields = extracted.ok ? extracted.fields : {};
  const contractHumanGateLevel = normalizeHumanGateLevel(
    String(contractFields.human_gate || ""),
  );
  const contractPauseArtifact = String(contractFields.hg35_pause_artifact || "").trim();
  evidence.human_gate_level = contractHumanGateLevel || null;

  if (contractHumanGateLevel === "HG-3.5") {
    const reportHg35 = selectedReport?.hg35 || null;
    const hg35Evidence = {
      contract_pause_artifact: contractPauseArtifact || null,
      report_reason: selectedReport?.reason || null,
      pause_artifact: reportHg35?.pause_artifact || null,
      awaiting_sign: reportHg35?.awaiting_sign === true,
      sign_comment_id: reportHg35?.sign_comment_id || null,
    };
    evidence.hg35 = hg35Evidence;

    if (!contractPauseArtifact) {
      reasonCodes.push("cao.hg35-pause-artifact-missing");
    } else if (
      selectedReport &&
      selectedReport.state === "NEEDS_HUMAN" &&
      selectedReport.reason === "hg35-pause-pending" &&
      reportHg35?.pause_artifact &&
      reportHg35.awaiting_sign === true
    ) {
      const blockingCodes = reasonCodes.filter((code) => code !== "cao.report-non-pass");
      if (blockingCodes.length === 0) {
        return {
          version: "cao-v0",
          work_item: { id: item?.id || null, sequence_id: seq, name: item?.name || null, role },
          verdict: "PARK",
          reason_codes: ["cao.hg35-awaiting-sign"],
          next_state: "parked-hg35-founder-proxy-review",
          evidence,
          cao_session_id: sessionId || null,
          signed_at: now.toISOString(),
        };
      }
    }
  }

  const unique = Array.from(new Set(reasonCodes));
  const verdict = unique.length === 0 ? "PASS" : "REJECT";

  return {
    version: "cao-v0",
    work_item: { id: item?.id || null, sequence_id: seq, name: item?.name || null, role },
    verdict,
    reason_codes: unique,
    next_state: verdict === "PASS" ? "ceo:review" : `c-level:${role || "unknown"}:planning`,
    evidence,
    cao_session_id: sessionId || null,
    signed_at: now.toISOString(),
  };
}

function buildVerdictYaml(verdict) {
  const lines = ["controller.verdict:"];
  const emit = (key, value, indent = 2) => {
    const pad = " ".repeat(indent);
    if (value === null || value === undefined) {
      lines.push(`${pad}${key}: null`);
    } else if (Array.isArray(value)) {
      lines.push(`${pad}${key}:`);
      for (const v of value) lines.push(`${pad}  - ${v}`);
    } else if (typeof value === "object") {
      lines.push(`${pad}${key}:`);
      for (const [k, v] of Object.entries(value)) {
        if (v && typeof v === "object" && !Array.isArray(v)) {
          lines.push(`${pad}  ${k}:`);
          for (const [k2, v2] of Object.entries(v)) {
            lines.push(`${pad}    ${k2}: ${v2 === null || v2 === undefined ? "null" : v2}`);
          }
        } else if (Array.isArray(v)) {
          lines.push(`${pad}  ${k}:`);
          for (const item of v) lines.push(`${pad}    - ${item}`);
        } else {
          lines.push(`${pad}  ${k}: ${v === null || v === undefined ? "null" : v}`);
        }
      }
    } else {
      lines.push(`${pad}${key}: ${value}`);
    }
  };
  emit("version", verdict.version);
  emit("work_item", verdict.work_item);
  emit("verdict", verdict.verdict);
  emit("reason_codes", verdict.reason_codes);
  emit("next_state", verdict.next_state);
  emit("evidence", verdict.evidence);
  emit("cao_session_id", verdict.cao_session_id);
  emit("signed_at", verdict.signed_at);
  return lines.join("\n");
}

function commentHtml(yaml) {
  return `<p><strong>controller.verdict (cao-v0)</strong></p><pre><code>${htmlEscape(yaml)}</code></pre>`;
}

async function postComment({ baseUrl, authHeaders, workspace, projectId, workItemId, html }) {
  const path = `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(workItemId)}/comments/`;
  return requestJson({ baseUrl, authHeaders, path, method: "POST", body: { comment_html: html } });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const errors = [];
  if (!args.workspace) errors.push("--workspace is required");
  if (!args.projectId) errors.push("--project-id is required");
  if (!args.workItemId) errors.push("--work-item-id is required");
  if (!["dry-run", "post"].includes(args.mode)) errors.push("--mode must be dry-run or post");
  const auth = resolvePlaneAuth(args.auth);
  if (!auth.ok) errors.push(auth.missingError);

  const result = {
    version: "cao-pass-cli/v0",
    workspace: args.workspace,
    projectId: args.projectId,
    workItemId: args.workItemId,
    mode: args.mode,
    authMode: auth.authMode,
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
  });
  if (!fetched.ok) {
    result.ok = false;
    result.error = fetched.body;
    result.status = fetched.status;
    printResult(result, args.json);
    process.exitCode = 1;
    return;
  }
  const item = fetched.body;

  const mapPath = args.labelMap || defaultLabelMapPath({ workspace: args.workspace, projectId: args.projectId });
  const labelResolution = await resolvePlaneItemLabels({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    workspace: args.workspace,
    projectId: args.projectId,
    item,
    labelMapPath: mapPath,
    requestJson,
  });
  const resolvedLabels = labelResolution.ok ? labelResolution.names : [];
  result.label_names = resolvedLabels;
  result.label_resolution = labelResolution.ok ? {
    ok: true,
    source: labelResolution.source,
    label_ids_on_item: labelResolution.labelIds,
  } : {
    ok: false,
    source: labelResolution.source,
    reason: labelResolution.reason,
    label_ids_on_item: labelResolution.labelIds,
    api_status: labelResolution.api_status || null,
  };

  const commentsResp = await listComments({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    workspace: args.workspace,
    projectId: args.projectId,
    workItemId: args.workItemId,
  });
  if (!commentsResp.ok) {
    result.ok = false;
    result.error = commentsResp.body;
    result.status = commentsResp.status;
    printResult(result, args.json);
    process.exitCode = 1;
    return;
  }
  const comments = Array.isArray(commentsResp.body) ? commentsResp.body : (commentsResp.body?.results || []);

  const verdict = runCaoPass({
    item,
    labelNames: resolvedLabels,
    comments,
    sessionId: process.env.CAO_SESSION_ID || null,
    now: new Date(),
  });
  result.verdict = verdict;

  const yaml = buildVerdictYaml(verdict);

  if (args.mode === "dry-run") {
    result.would_post_comment = true;
    result.preview = yaml;
    printResult(result, args.json);
    process.exitCode = verdict.verdict === "PASS" ? 0 : 2;
    return;
  }

  // mode === "post"
  const post = await postComment({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    workspace: args.workspace,
    projectId: args.projectId,
    workItemId: args.workItemId,
    html: commentHtml(yaml),
  });
  result.post_status = post.status;
  result.post_ok = post.ok;
  result.post_comment_id = post.ok && post.body && post.body.id ? post.body.id : null;
  if (!post.ok) result.ok = false;
  printResult(result, args.json);
  process.exitCode = result.ok ? (verdict.verdict === "PASS" ? 0 : 2) : 1;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`cao-pass: ${result.ok ? "ok" : "fail"}`);
  console.log(`mode: ${result.mode}`);
  if (result.verdict) {
    console.log(`verdict: ${result.verdict.verdict}`);
    console.log(`work_item: ${result.verdict.work_item.sequence_id} role=${result.verdict.work_item.role || "(none)"}`);
    for (const code of result.verdict.reason_codes || []) console.log(`reject: ${code}`);
  }
  if (result.post_status) console.log(`post: HTTP ${result.post_status} comment_id=${result.post_comment_id || "(none)"}`);
  for (const error of result.errors || []) console.log(`error: ${error}`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    console.error(`cao-pass failed: ${err.message}`);
    process.exitCode = 1;
  });
}
