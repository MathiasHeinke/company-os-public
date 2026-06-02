#!/usr/bin/env node

/*
 * contract-controller.mjs
 *
 * Stage 0.5 pre-dispatch controller for Plane worker contracts.
 *
 * It reviews a Plane work item before dispatcher lock and decides whether the
 * contract is strong enough to hand to a worker. It never spawns, never marks
 * Done, never mutates the work item description, and never writes outside one
 * optional `controller.contract-review` Plane comment.
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
  ROLE_LABEL_SET,
  extractContractBlock,
  validateContract,
} from "./worker-ledger-validator.mjs";
import { defaultLabelMapPath } from "./plane-label-map-resolver.mjs";
import { resolvePlaneItemLabels } from "./plane-labels.mjs";
import {
  canonicalDescriptionHash,
  htmlEscape,
  parseYamlScalar,
  stripHtml,
} from "./plane-html.mjs";
import {
  extractAbsoluteArtifactPathToken,
  formatPlaneWorkItemSequence,
  resolveRuntimeWorkspacePath,
} from "./runtime-dispatcher-v12-core.mjs";

export const CONTRACT_CONTROLLER_VERSION = "contract-controller-v0";
export const CONTRACT_REVIEW_TITLE = "controller.contract-review";
export const RUNTIME_READY_TITLE = "controller.runtime-ready";
export const RUNTIME_EXECUTABILITY_VERSION = "runtime-executability-v0";

export const RUNTIME_READY_VERDICTS = Object.freeze({
  PASS: "RUNTIME_READY_PASS",
  REJECT: "RUNTIME_READY_REJECT",
  SKIPPED: "RUNTIME_READY_SKIPPED",
});

export const RUNTIME_READY_REASONS = Object.freeze({
  CONTRACT_NOT_PARSEABLE: "runtime-ready.contract-not-parseable",
  CAPABILITY_PROFILE_UNREGISTERED: "runtime-ready.capability-profile-unregistered",
  DEPENDS_ON_UNPARSEABLE: "runtime-ready.depends-on-unparseable",
  OUTCOME_ARTIFACT_NOT_ABSOLUTE: "runtime-ready.outcome-artifact-not-absolute",
  CLAUDE_PLAN_MODE_REPORT_ARTIFACT: "runtime-ready.claude-plan-mode-report-artifact",
  ALLOWED_READ_PATHS_MISSING_SOURCE: "runtime-ready.allowed-read-paths-missing-source",
  ALLOWED_READ_PATHS_MISSING_GATE: "runtime-ready.allowed-read-paths-missing-gate",
  CLAUDE_TOOL_RESULT_READ: "runtime-ready.claude-tool-result-read",
});

const RUNTIME_READY_AGENTS = new Set(["claude", "codex", "gemini"]);
const RUNTIME_READY_LIVE_DISPATCH = new Set(["ready", "scheduled"]);
const RUNTIME_READY_DEPENDS_ON_PATTERN = /^[A-Z][A-Z0-9]{1,9}-\d+$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RUNTIME_READY_TOOL_RESULT_PATTERNS = [
  /\.claude\/projects\//i,
  /\.claude\/sessions\b/i,
  /~\/\.claude\/projects/i,
  /\$HOME\/\.claude\/projects/i,
  /\btool_use_result\b/i,
  /\btool_result_block\b/i,
];

export const CONTRACT_REVIEW_VERDICTS = Object.freeze({
  PASS: "CONTRACT_PASS",
  PATCH_REQUIRED: "CONTRACT_PATCH_REQUIRED",
  SPEC_REQUIRED: "SPEC_REQUIRED",
  SPLIT_REQUIRED: "SPLIT_REQUIRED",
  CEO_GATE_REQUIRED: "CEO_GATE_REQUIRED",
  FOUNDER_GATE_REQUIRED: "FOUNDER_GATE_REQUIRED",
  REJECT: "REJECT",
});

export const CONTRACT_REVIEW_REASONS = Object.freeze({
  VALIDATOR_FAIL: "contract-review.validator-fail",
  SCOPE_MISSING: "contract-review.scope-missing",
  SCOPE_TOO_BROAD: "contract-review.scope-too-broad",
  SOURCE_WEAK: "contract-review.source-of-truth-weak",
  ACCEPTANCE_WEAK: "contract-review.acceptance-not-verifiable",
  GATES_WEAK: "contract-review.gates-not-executable",
  SPEC_REQUIRED: "contract-review.spec-required",
  RUNTIME_FIELDS_MISSING: "contract-review.runtime-fields-missing",
  RUNTIME_BROWSER_AUTH_MISSING: "contract-review.runtime-browser-auth-missing",
  CAPABILITY_PROFILE_MISSING: "contract-review.capability-profile-missing",
  CAPABILITY_PROFILE_ROLE_MISMATCH: "contract-review.capability-profile-role-mismatch",
  SANDBOX_REQUIRED: "contract-review.sandbox-required",
  RUNTIME_PERMISSION_MODE_MISMATCH: "contract-review.runtime-permission-mode-mismatch",
  ALLOWED_WRITE_PATHS_MISSING: "contract-review.allowed-write-paths-missing",
  BLOCKED_ACTIONS_MISSING: "contract-review.blocked-actions-missing",
  REPORTING_WEAK: "contract-review.reporting-weak",
  OUTCOME_RUBRIC_MISSING: "contract-review.outcome-rubric-missing",
  SUBAGENT_POLICY_MISSING: "contract-review.subagent-policy-missing",
  HIGH_RISK_CEO_GATE: "contract-review.high-risk-ceo-gate",
  STRATEGIC_FOUNDER_GATE: "contract-review.strategic-founder-gate",
  INFERENCE_P4: "contract-review.inference-p4",
});

export const CONTRACT_REVIEW_GATE_REASONS = Object.freeze({
  MISSING: "contract-review.missing",
  STALE: "contract-review.stale",
  NOT_PASS: "contract-review.not-pass",
  UNPARSEABLE: "contract-review.unparseable",
});

const RUNTIME_FIELD_KEYS = ["runtimeauth", "maxruntime", "maxspend", "killswitch", "heartbeat"];
const HIGH_RISK_PATTERNS = [
  /\bHG-3\b/i,
  /\b(schema|rls|service-role|auth migration|production write|deploy|public publish)\b/i,
  /\b(material spend|money movement|pricing change|regulated claim|medical claim|legal claim)\b/i,
];
const STRATEGIC_FOUNDER_PATTERNS = [
  /\bHG-4\b/i,
  /\b(strategic direction|strategic shift|strategy pivot|mission change|company identity)\b/i,
  /\b(non-restorable|irreversible data loss|drop production database|delete production database)\b/i,
  /\b(material legal commitment|regulated public claim|founder-name live outreach)\b/i,
];
const BROAD_SCOPE_PATTERNS = [
  /\b(do|fix|rewrite|refactor|clean|migrate)\s+(everything|all|the whole|entire)\b/i,
  /\b(entire|whole|complete)\s+(repo|repository|codebase|workspace|project)\b/i,
  /\ball workspaces\b/i,
];
const MAJOR_SPEC_PATTERNS = [
  /\b(mvp|dashboard|new project|new app|product surface|runtime|scheduler|controller|cross-repo|cross-workspace|multi-agent|multiagent)\b/i,
];
const BROWSER_UI_PATTERNS = [
  /\bbrowser[-\s/]?ui\b/i,
  /\b(browser-backed|authenticated browser|browser-confirmed|playwright|screenshot)\b/i,
  /\bPlane UI\b/i,
];

export function evaluateContractForDispatch({
  item = {},
  labelNames = [],
  now = new Date(),
  humanGateRelease = null,
} = {}) {
  const description = stripHtml(item.description_html || item.description_stripped || item.description || "");
  const descriptionHash = canonicalDescriptionHash(item);
  const formal = validateContract({ description, labels: labelNames });
  const extracted = extractContractBlock(description);
  const fields = extracted.ok ? extracted.fields : {};
  const normalized = normalizeFields(fields);
  const reasonCodes = [];
  const suggestions = [];

  if (!formal.ok) {
    reasonCodes.push(CONTRACT_REVIEW_REASONS.VALIDATOR_FAIL);
    suggestions.push("Fix the flat fenced worker contract until worker-ledger-validator returns ok=true.");
  }

  const fullText = [
    item.name,
    description,
    ...Object.values(fields).flatMap(asList),
  ].join("\n");
  const requestedWorkText = buildRequestedWorkText(normalized, item);
  const riskText = buildRiskText(normalized, item);

  const humanGateReleased = Boolean(humanGateRelease?.ok);
  if (isFounderStrategicRisk(normalized, riskText) && !humanGateReleased) {
    reasonCodes.push(CONTRACT_REVIEW_REASONS.STRATEGIC_FOUNDER_GATE);
    suggestions.push("Escalate to Founder/HG-4 with a Chief-of-Staff decision packet before dispatcher lock.");
  } else if (isP4HighRisk(normalized, riskText) && !humanGateReleased) {
    reasonCodes.push(CONTRACT_REVIEW_REASONS.HIGH_RISK_CEO_GATE);
    suggestions.push("Escalate to CEO/Codex HG-3 critical release before dispatcher lock or worker run.");
  }
  if (String(field(normalized, "inferenceclass", "inference_class")).trim() === "P4-high-risk") {
    reasonCodes.push(CONTRACT_REVIEW_REASONS.INFERENCE_P4);
    suggestions.push("P4-high-risk items cannot be autonomously spawned.");
  }

  const scopeText = listText(field(normalized, "scope"));
  if (!scopeText) {
    reasonCodes.push(CONTRACT_REVIEW_REASONS.SCOPE_MISSING);
    suggestions.push("Add a Scope section with include and exclude boundaries.");
  }
  if (BROAD_SCOPE_PATTERNS.some((rx) => rx.test(fullText))) {
    reasonCodes.push(CONTRACT_REVIEW_REASONS.SCOPE_TOO_BROAD);
    suggestions.push("Split broad work into parent + smaller role-labeled child contracts.");
  }

  const sourceText = listText(field(normalized, "sourceoftruth", "source_of_truth"));
  if (!hasSourcePointer(sourceText)) {
    reasonCodes.push(CONTRACT_REVIEW_REASONS.SOURCE_WEAK);
    suggestions.push("SourceOfTruth must name concrete docs, paths, Plane IDs, reports, or commands.");
  }

  const acceptanceText = listText(field(normalized, "acceptancecriteria", "acceptance_criteria"));
  if (!isVerifiableAcceptance(acceptanceText)) {
    reasonCodes.push(CONTRACT_REVIEW_REASONS.ACCEPTANCE_WEAK);
    suggestions.push("Acceptance Criteria must be objectively testable, not just 'done' or 'works'.");
  }

  const gatesText = listText(field(normalized, "gates"));
  if (!hasExecutableGate(gatesText)) {
    reasonCodes.push(CONTRACT_REVIEW_REASONS.GATES_WEAK);
    suggestions.push("Gates must include executable commands or named controller/audit gates.");
  }

  const mode = String(field(normalized, "mode") || "").toLowerCase();
  const agent = String(field(normalized, "agent") || "").toLowerCase();
  const dispatch = String(field(normalized, "dispatch") || "").toLowerCase();
  const isRuntimeWorker = ["claude", "codex", "gemini"].includes(agent);
  const isLiveDispatch = ["ready", "scheduled"].includes(dispatch);
  const isImplement = mode === "implement";

  if (isRuntimeWorker && !field(normalized, "capabilityprofile", "capability_profile")) {
    reasonCodes.push(CONTRACT_REVIEW_REASONS.CAPABILITY_PROFILE_MISSING);
    suggestions.push("Declare CapabilityProfile so the runtime allowlist can be checked before spawn.");
  }
  const declaredRole = String(field(normalized, "role") || labelNames.find((name) => ROLE_LABEL_SET.has(name)) || "").trim();
  const capabilityProfile = String(field(normalized, "capabilityprofile", "capability_profile") || "").trim();
  const profileRoleMatch = capabilityProfile.match(/claude-clevel-worker\/(cto|cpo|cmo|coo|cfo|cao)\//i);
  if (isRuntimeWorker && declaredRole && profileRoleMatch) {
    const profileRole = `role:${profileRoleMatch[1].toLowerCase()}`;
    if (declaredRole !== profileRole) {
      reasonCodes.push(CONTRACT_REVIEW_REASONS.CAPABILITY_PROFILE_ROLE_MISMATCH);
      suggestions.push(`Align CapabilityProfile role (${profileRole}) with contract/Plane role (${declaredRole}).`);
    }
  }
  if (isImplement && String(field(normalized, "sandbox") || "").toLowerCase() !== "required") {
    reasonCodes.push(CONTRACT_REVIEW_REASONS.SANDBOX_REQUIRED);
    suggestions.push("Mode implement must use Sandbox: required before edit-capable runtime work.");
  }
  const permissionMode = String(field(normalized, "runtimepermissionmode", "runtime_permission_mode") || "").trim();
  if (isImplement && isRuntimeWorker && isLiveDispatch && permissionMode === "plan") {
    reasonCodes.push(CONTRACT_REVIEW_REASONS.RUNTIME_PERMISSION_MODE_MISMATCH);
    suggestions.push("Mode implement cannot use RuntimePermissionMode: plan; use acceptEdits/default/auto or change Mode to plan/audit.");
  }
  if (isImplement && !field(normalized, "allowedwritepaths", "allowed_write_paths")) {
    reasonCodes.push(CONTRACT_REVIEW_REASONS.ALLOWED_WRITE_PATHS_MISSING);
    suggestions.push("Declare AllowedWritePaths for scope-guarded implementation work.");
  }
  if (isLiveDispatch && isRuntimeWorker) {
    const missing = RUNTIME_FIELD_KEYS.filter((key) => !field(normalized, key));
    if (missing.length) {
      reasonCodes.push(CONTRACT_REVIEW_REASONS.RUNTIME_FIELDS_MISSING);
      suggestions.push(`Declare runtime fields before ready/scheduled dispatch: ${missing.join(", ")}.`);
    }
  }
  if (
    isLiveDispatch &&
    isRuntimeWorker &&
    requiresRuntimeBrowserAuth(normalized, item) &&
    !field(normalized, "runtimebrowserauth", "runtime_browser_auth")
  ) {
    reasonCodes.push(CONTRACT_REVIEW_REASONS.RUNTIME_BROWSER_AUTH_MISSING);
    suggestions.push("Declare RuntimeBrowserAuth: none | forbidden | browser-connector | operator-shared-session for browser/UI-bound work.");
  }
  if (!field(normalized, "blockedactions", "blocked_actions")) {
    reasonCodes.push(CONTRACT_REVIEW_REASONS.BLOCKED_ACTIONS_MISSING);
    suggestions.push("Add BlockedActions with explicit no-secrets/no-Done/no-prod/no-deploy boundaries.");
  }
  const reportingText = listText(field(normalized, "reporting"));
  if (!/worker\.reported|report path|reports\//i.test(reportingText)) {
    reasonCodes.push(CONTRACT_REVIEW_REASONS.REPORTING_WEAK);
    suggestions.push("Reporting must require worker.reported and/or a concrete report artifact path.");
  }

  const majorWork = MAJOR_SPEC_PATTERNS.some((rx) => rx.test(fullText));
  const hasSpecEvidence = /spec\.md|plan\.md|tasks\.md|spec-to-worker|outcomespec|outcomerubric|eval|harness|checklist/i.test(fullText);
  if (majorWork && !hasSpecEvidence) {
    reasonCodes.push(CONTRACT_REVIEW_REASONS.SPEC_REQUIRED);
    suggestions.push("Major work needs Spec/Plan/Tasks, OutcomeSpec/Rubric, eval harness, or explicit no-spec rationale.");
  }
  if (isRuntimeWorker && isLiveDispatch && !field(normalized, "outcomerubric", "outcome_rubric")) {
    reasonCodes.push(CONTRACT_REVIEW_REASONS.OUTCOME_RUBRIC_MISSING);
    suggestions.push("Declare OutcomeRubric for scheduled/live worker runs so the controller can grade output.");
  }

  const subagents = listText(field(normalized, "subagentroster", "subagent_roster"));
  if (subagents && !/none|\[\]/i.test(subagents)) {
    if (!field(normalized, "sessionpolicy", "session_policy") || !/subagents:/i.test(reportingText)) {
      reasonCodes.push(CONTRACT_REVIEW_REASONS.SUBAGENT_POLICY_MISSING);
      suggestions.push("If SubAgentRoster is non-empty, declare SessionPolicy and require subagents: in worker.reported.");
    }
  }

  const uniqueReasons = Array.from(new Set(reasonCodes));
  const verdict = selectVerdict(uniqueReasons);
  return {
    ok: verdict === CONTRACT_REVIEW_VERDICTS.PASS,
    version: CONTRACT_CONTROLLER_VERSION,
    verdict,
    reason_codes: uniqueReasons,
    suggestions: Array.from(new Set(suggestions)),
    evidence: {
      work_item: formatPlaneWorkItemSequence(item),
      role_labels: labelNames.filter((name) => ROLE_LABEL_SET.has(name)),
      formal_validator: { ok: formal.ok, reason_codes: formal.reason_codes || [] },
      fields_seen: Object.keys(fields).sort(),
      human_gate_release: humanGateReleased ? humanGateRelease : null,
      description_hash: descriptionHash,
      reviewed_at: now.toISOString(),
    },
  };
}

export function buildContractReviewYaml({ review, item, reviewer = "codex" }) {
  const sequence = formatPlaneWorkItemSequence(item);
  const reasons = review.reason_codes.length ? review.reason_codes.join(", ") : "none";
  const suggestions = review.suggestions.length ? review.suggestions.slice(0, 8).join(" | ") : "none";
  const lines = [
    `${CONTRACT_REVIEW_TITLE}:`,
    `  version: ${CONTRACT_CONTROLLER_VERSION}`,
    `  work_item: ${sequence}`,
    `  verdict: ${review.verdict}`,
    `  reviewer: ${reviewer}`,
    `  description_hash: ${review.evidence.description_hash}`,
    `  reason_codes: ${reasons}`,
    `  suggestions: ${suggestions}`,
    `  next_action: ${nextActionForVerdict(review.verdict)}`,
    `  signed_at: ${review.evidence.reviewed_at}`,
  ];
  if (review.evidence.human_gate_release?.comment_id) {
    lines.splice(lines.length - 1, 0, `  human_gate_release: ${review.evidence.human_gate_release.comment_id}`);
  }
  return lines.join("\n");
}

export function findLatestContractReview(comments = []) {
  let best = null;
  for (const row of comments || []) {
    const html = row.comment_html || "";
    if (!html.includes(CONTRACT_REVIEW_TITLE)) continue;
    const body = stripHtml(html);
    const match = body.match(/controller\.contract-review:\s*\n([\s\S]*?)(?:\n\S|$)/);
    if (!match) continue;
    const fields = parseYamlScalar(match[1]);
    const ts = row.created_at ? Date.parse(row.created_at) : 0;
    if (!best || ts > best.ts) {
      best = { comment_id: row.id || null, created_at: row.created_at || null, ts, fields, raw_body: body };
    }
  }
  return best;
}

export function findContractReviewGate({ comments = [], currentDescriptionHash }) {
  const reviews = findContractReviews(comments);
  const matchingPass = reviews
    .filter((review) =>
      review.fields?.description_hash === currentDescriptionHash &&
      review.fields?.verdict === CONTRACT_REVIEW_VERDICTS.PASS)
    .sort((a, b) => b.ts - a.ts)[0];
  if (matchingPass) return { ok: true, reason_codes: [], review: matchingPass };

  const review = reviews.sort((a, b) => b.ts - a.ts)[0] || null;
  if (!review) {
    return { ok: false, reason_codes: [CONTRACT_REVIEW_GATE_REASONS.MISSING], review: null };
  }
  if (!review.fields?.verdict || !review.fields?.description_hash) {
    return { ok: false, reason_codes: [CONTRACT_REVIEW_GATE_REASONS.UNPARSEABLE], review };
  }
  if (review.fields.description_hash !== currentDescriptionHash) {
    return {
      ok: false,
      reason_codes: [CONTRACT_REVIEW_GATE_REASONS.STALE],
      review,
      expected_hash: currentDescriptionHash,
    };
  }
  if (review.fields.verdict !== CONTRACT_REVIEW_VERDICTS.PASS) {
    return { ok: false, reason_codes: [CONTRACT_REVIEW_GATE_REASONS.NOT_PASS], review };
  }
  return { ok: true, reason_codes: [], review };
}

function findContractReviews(comments = []) {
  const reviews = [];
  for (const row of comments || []) {
    const html = row.comment_html || "";
    if (!html.includes(CONTRACT_REVIEW_TITLE)) continue;
    const body = stripHtml(html);
    const match = body.match(/controller\.contract-review:\s*\n([\s\S]*?)(?:\n\S|$)/);
    if (!match) continue;
    const fields = parseYamlScalar(match[1]);
    const ts = row.created_at ? Date.parse(row.created_at) : 0;
    reviews.push({ comment_id: row.id || null, created_at: row.created_at || null, ts, fields, raw_body: body });
  }
  return reviews;
}

/**
 * Stage 0.65 Runtime Executability Gate.
 *
 * Static contract-level checks that must pass between Stage 0.5
 * CONTRACT_PASS and dispatcher lock/spawn. CONTRACT_PASS no longer
 * implies dispatchability; this gate verifies that the contract is
 * actually runnable by a bounded headless worker.
 *
 * The function is pure and idempotent. It never touches Plane, fs or
 * spawn. The scheduler and runtime dispatcher both invoke it; the
 * scheduler also records the YAML payload as `controller.runtime-ready`.
 */
export function evaluateRuntimeExecutability({
  item = {},
  contractFields = null,
  labelNames = [],
  capabilityRegistry = null,
  now = new Date(),
} = {}) {
  const description = stripHtml(item.description_html || item.description_stripped || item.description || "");
  const descriptionHash = canonicalDescriptionHash(item);
  const sequence = formatPlaneWorkItemSequence(item);

  let fields;
  if (contractFields && typeof contractFields === "object" && Object.keys(contractFields).length > 0) {
    fields = contractFields;
  } else {
    const extracted = extractContractBlock(description);
    if (!extracted.ok) {
      return {
        ok: false,
        version: RUNTIME_EXECUTABILITY_VERSION,
        verdict: RUNTIME_READY_VERDICTS.REJECT,
        reason_codes: [RUNTIME_READY_REASONS.CONTRACT_NOT_PARSEABLE],
        suggestions: ["Repair the fenced worker contract before Stage 0.65 can evaluate runtime executability."],
        evidence: {
          work_item: sequence,
          description_hash: descriptionHash,
          reviewed_at: now.toISOString(),
          role_labels: labelNames.filter((name) => ROLE_LABEL_SET.has(name)),
        },
      };
    }
    fields = extracted.fields;
  }
  const normalized = normalizeFields(fields);
  const agent = String(field(normalized, "agent") || "").toLowerCase().trim();
  const dispatch = String(field(normalized, "dispatch") || "").toLowerCase().trim();
  const isRuntimeWorker = RUNTIME_READY_AGENTS.has(agent);
  const isLiveDispatch = RUNTIME_READY_LIVE_DISPATCH.has(dispatch);

  if (!isRuntimeWorker || !isLiveDispatch) {
    return {
      ok: true,
      version: RUNTIME_EXECUTABILITY_VERSION,
      verdict: RUNTIME_READY_VERDICTS.SKIPPED,
      reason_codes: [],
      suggestions: [],
      evidence: {
        work_item: sequence,
        agent: agent || null,
        dispatch: dispatch || null,
        skipped_reason: !isRuntimeWorker ? "not-runtime-agent" : "not-live-dispatch",
        description_hash: descriptionHash,
        reviewed_at: now.toISOString(),
        role_labels: labelNames.filter((name) => ROLE_LABEL_SET.has(name)),
      },
    };
  }

  const reasonCodes = [];
  const suggestions = [];

  const profileId = String(field(normalized, "capabilityprofile", "capability_profile") || "").trim();
  let knownProfiles = [];
  if (capabilityRegistry && Array.isArray(capabilityRegistry.profiles)) {
    knownProfiles = capabilityRegistry.profiles.map((profile) => profile?.id).filter(Boolean);
    if (profileId && !knownProfiles.includes(profileId)) {
      reasonCodes.push(RUNTIME_READY_REASONS.CAPABILITY_PROFILE_UNREGISTERED);
      suggestions.push(`CapabilityProfile "${profileId}" is not present in registries/capabilities/company-os.json.`);
    }
  }

  const deps = asList(field(normalized, "dependson", "depends_on"));
  const badDeps = deps.filter((dep) => !RUNTIME_READY_DEPENDS_ON_PATTERN.test(dep));
  if (badDeps.length) {
    reasonCodes.push(RUNTIME_READY_REASONS.DEPENDS_ON_UNPARSEABLE);
    suggestions.push(
      `DependsOn entries must be empty, a Plane reference (e.g. [WORK_ITEM_ID]) or a UUID; non-parseable: ${badDeps.slice(0, 3).join(", ")}.`,
    );
  }

  const reportingEntries = [
    ...asList(field(normalized, "reporting")),
    ...asList(field(normalized, "outcomeartifacts", "outcome_artifacts")),
  ];
  const absoluteReportPaths = reportingEntries
    .map((entry) => extractAbsoluteArtifactPathToken(entry))
    .filter(Boolean);
  if (!absoluteReportPaths.length) {
    reasonCodes.push(RUNTIME_READY_REASONS.OUTCOME_ARTIFACT_NOT_ABSOLUTE);
    suggestions.push("Declare at least one absolute Reporting or OutcomeArtifacts path (e.g. /Users/.../reports/runs/<name>.md).");
  }
  const permissionMode = String(field(normalized, "runtimepermissionmode", "runtime_permission_mode") || "").trim();
  if (agent === "claude" && permissionMode === "plan" && absoluteReportPaths.length) {
    reasonCodes.push(RUNTIME_READY_REASONS.CLAUDE_PLAN_MODE_REPORT_ARTIFACT);
    suggestions.push("Claude RuntimePermissionMode: plan writes only Claude's internal plan scratch artifact; use acceptEdits/default/auto for live runs that must materialize declared report artifacts.");
  }

  const workspaceField = String(field(normalized, "workspace") || "").trim();
  const workspacePath = resolveRuntimeWorkspacePath(workspaceField);
  const allowedReadPaths = asList(field(normalized, "allowedreadpaths", "allowed_read_paths"))
    .filter((entry) => entry.startsWith("/"));
  const allowedWritePaths = asList(field(normalized, "allowedwritepaths", "allowed_write_paths"))
    .filter((entry) => entry.startsWith("/"));
  const sandboxReadRoots = Array.from(new Set([
    ...allowedReadPaths,
    ...(workspacePath ? [workspacePath] : []),
    ...allowedWritePaths,
  ]));

  const uncoveredSource = collectAbsolutePaths(asList(field(normalized, "sourceoftruth", "source_of_truth")))
    .filter((path) => !isPathCoveredByRoots(path, sandboxReadRoots));
  if (uncoveredSource.length) {
    reasonCodes.push(RUNTIME_READY_REASONS.ALLOWED_READ_PATHS_MISSING_SOURCE);
    suggestions.push(
      `Declare AllowedReadPaths covering source_of_truth absolute paths: ${uncoveredSource.slice(0, 3).join(", ")}.`,
    );
  }

  const uncoveredGate = collectAbsolutePaths(asList(field(normalized, "gates")))
    .filter((path) => !isPathCoveredByRoots(path, sandboxReadRoots));
  if (uncoveredGate.length) {
    reasonCodes.push(RUNTIME_READY_REASONS.ALLOWED_READ_PATHS_MISSING_GATE);
    suggestions.push(
      `Declare AllowedReadPaths covering gate absolute paths: ${uncoveredGate.slice(0, 3).join(", ")}.`,
    );
  }

  const fieldText = Object.values(fields)
    .flatMap((value) => asList(value))
    .join("\n");
  if (RUNTIME_READY_TOOL_RESULT_PATTERNS.some((pattern) => pattern.test(fieldText))) {
    reasonCodes.push(RUNTIME_READY_REASONS.CLAUDE_TOOL_RESULT_READ);
    suggestions.push(
      "Remove Claude internal tool-result references from the contract (e.g. ~/.claude/projects/, .claude/sessions, tool_use_result).",
    );
  }

  const uniqueReasons = Array.from(new Set(reasonCodes));
  const ok = uniqueReasons.length === 0;
  return {
    ok,
    version: RUNTIME_EXECUTABILITY_VERSION,
    verdict: ok ? RUNTIME_READY_VERDICTS.PASS : RUNTIME_READY_VERDICTS.REJECT,
    reason_codes: uniqueReasons,
    suggestions: Array.from(new Set(suggestions)),
    evidence: {
      work_item: sequence,
      agent,
      dispatch,
      profile_id: profileId || null,
      known_profile_count: knownProfiles.length,
      depends_on: deps,
      reporting_absolute_paths: absoluteReportPaths,
      allowed_read_roots: sandboxReadRoots,
      uncovered_source_paths: uncoveredSource,
      uncovered_gate_paths: uncoveredGate,
      description_hash: descriptionHash,
      reviewed_at: now.toISOString(),
      role_labels: labelNames.filter((name) => ROLE_LABEL_SET.has(name)),
    },
  };
}

export function buildRuntimeReadyYaml({ executability, item, reviewer = "scheduler" }) {
  const sequence = formatPlaneWorkItemSequence(item);
  const reasons = executability.reason_codes.length ? executability.reason_codes.join(", ") : "none";
  const suggestions = executability.suggestions.length ? executability.suggestions.slice(0, 8).join(" | ") : "none";
  return [
    `${RUNTIME_READY_TITLE}:`,
    `  version: ${executability.version}`,
    `  work_item: ${sequence}`,
    `  verdict: ${executability.verdict}`,
    `  reviewer: ${reviewer}`,
    `  description_hash: ${executability.evidence.description_hash}`,
    `  reason_codes: ${reasons}`,
    `  suggestions: ${suggestions}`,
    `  signed_at: ${executability.evidence.reviewed_at}`,
  ].join("\n");
}

function collectAbsolutePaths(tokens) {
  const paths = [];
  for (const token of tokens) {
    const matches = String(token || "").matchAll(/(^|[\s"'=(:\[])(\/(?!\/)[A-Za-z0-9._\-/]+)/g);
    for (const match of matches) {
      const raw = String(match[2] || "").replace(/[.,;:)\]]+$/g, "");
      const parts = raw.split("/").filter(Boolean);
      if (parts.length >= 2) paths.push(raw);
    }
  }
  return paths;
}

function isPathCoveredByRoots(path, roots) {
  if (!path || !roots.length) return false;
  const normalized = path.replace(/\/+$/g, "");
  return roots.some((rawRoot) => {
    const root = String(rawRoot || "").replace(/\/\*\*?$/g, "").replace(/\/+$/g, "");
    if (!root) return false;
    if (normalized === root) return true;
    return normalized.startsWith(`${root}/`);
  });
}

function selectVerdict(reasonCodes) {
  if (!reasonCodes.length) return CONTRACT_REVIEW_VERDICTS.PASS;
  if (
    reasonCodes.includes(CONTRACT_REVIEW_REASONS.STRATEGIC_FOUNDER_GATE)
  ) return CONTRACT_REVIEW_VERDICTS.FOUNDER_GATE_REQUIRED;
  if (
    reasonCodes.includes(CONTRACT_REVIEW_REASONS.HIGH_RISK_CEO_GATE) ||
    reasonCodes.includes(CONTRACT_REVIEW_REASONS.INFERENCE_P4)
  ) return CONTRACT_REVIEW_VERDICTS.CEO_GATE_REQUIRED;
  if (reasonCodes.includes(CONTRACT_REVIEW_REASONS.SCOPE_TOO_BROAD)) {
    return CONTRACT_REVIEW_VERDICTS.SPLIT_REQUIRED;
  }
  if (reasonCodes.includes(CONTRACT_REVIEW_REASONS.VALIDATOR_FAIL)) {
    return CONTRACT_REVIEW_VERDICTS.PATCH_REQUIRED;
  }
  if (reasonCodes.includes(CONTRACT_REVIEW_REASONS.SPEC_REQUIRED)) {
    return CONTRACT_REVIEW_VERDICTS.SPEC_REQUIRED;
  }
  return CONTRACT_REVIEW_VERDICTS.PATCH_REQUIRED;
}

function nextActionForVerdict(verdict) {
  if (verdict === CONTRACT_REVIEW_VERDICTS.PASS) return "dispatcher-lock-allowed";
  if (verdict === CONTRACT_REVIEW_VERDICTS.PATCH_REQUIRED) return "patch-contract-and-rerun-contract-controller";
  if (verdict === CONTRACT_REVIEW_VERDICTS.SPEC_REQUIRED) return "create-or-link-spec-plan-tasks-before-dispatch";
  if (verdict === CONTRACT_REVIEW_VERDICTS.SPLIT_REQUIRED) return "split-parent-into-smaller-child-contracts";
  if (verdict === CONTRACT_REVIEW_VERDICTS.CEO_GATE_REQUIRED) return "ask-ceo-hg3-before-dispatch";
  if (verdict === CONTRACT_REVIEW_VERDICTS.FOUNDER_GATE_REQUIRED) return "ask-founder-hg4-before-dispatch";
  return "reject";
}

function normalizeFields(fields) {
  const normalized = {};
  for (const [key, value] of Object.entries(fields || {})) {
    normalized[String(key).replace(/[-_\s]/g, "").toLowerCase()] = value;
    normalized[String(key).trim().toLowerCase()] = value;
  }
  return normalized;
}

function field(fields, ...keys) {
  for (const key of keys) {
    const value = fields[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function asList(value) {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value).split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
}

function listText(value) {
  return asList(value).join("\n").trim();
}

function buildRequestedWorkText(fields, item) {
  return [
    item?.name,
    field(fields, "role"),
    field(fields, "agent"),
    field(fields, "mode"),
    field(fields, "workspace"),
    field(fields, "humangate", "human_gate", "humangatelevel", "human_gate_level"),
    field(fields, "inferenceclass", "inference_class"),
    field(fields, "scope"),
    field(fields, "sourceoftruth", "source_of_truth"),
    field(fields, "acceptancecriteria", "acceptance_criteria"),
    field(fields, "gates"),
    field(fields, "outcomespec", "outcome_spec"),
    field(fields, "outcomerubric", "outcome_rubric"),
  ].flatMap(asList).filter(isPositiveRequestLine).join("\n");
}

function buildRiskText(fields, item) {
  return [
    item?.name,
    field(fields, "humangate", "human_gate", "humangatelevel", "human_gate_level"),
    field(fields, "scope"),
    field(fields, "sourceoftruth", "source_of_truth"),
    field(fields, "inferenceclass", "inference_class"),
  ].flatMap(asList).filter(isPositiveRequestLine).join("\n");
}

function isPositiveRequestLine(line) {
  return !/^\s*(exclude|do not|never|no |not |blocked|forbidden)\b/i.test(String(line || ""));
}

function hasSourcePointer(text) {
  return /\/Users\/|^docs\/|^scripts\/|^registries\/|[A-Z]+-\d+|MAT-\d+|https?:\/\/|reports\/|\.md\b|\.mjs\b|\.json\b/im.test(text);
}

function isVerifiableAcceptance(text) {
  if (!text || /\b(done|works|finished|complete)\b/i.test(text) && text.length < 60) return false;
  return /\b(pass|reject|emit|write|create|update|verify|test|check|report|comment|route|classify|lock|block|blocks)\b/i.test(text);
}

function hasExecutableGate(text) {
  return /(`[^`]+`|node |pnpm |npm |git |gitnexus |page-index|secret scan|CAO|controller|Playwright|pytest|xcodebuild)/i.test(text);
}

function isP4HighRisk(fields, text) {
  const humanGate = String(field(fields, "humangate", "human_gate", "humangatelevel", "human_gate_level"));
  return /\bHG-3\b/i.test(humanGate) || HIGH_RISK_PATTERNS.some((rx) => rx.test(text));
}

function isFounderStrategicRisk(fields, text) {
  const humanGate = String(field(fields, "humangate", "human_gate", "humangatelevel", "human_gate_level"));
  return /\bHG-4\b/i.test(humanGate) || STRATEGIC_FOUNDER_PATTERNS.some((rx) => rx.test(text));
}

function requiresRuntimeBrowserAuth(fields, item) {
  const text = [
    item?.name,
    field(fields, "runtimepermissionmode", "runtime_permission_mode"),
    field(fields, "capabilityprofile", "capability_profile"),
    field(fields, "scope"),
    field(fields, "outcomespec", "outcome_spec"),
    field(fields, "outcomerubric", "outcome_rubric"),
    field(fields, "acceptancecriteria", "acceptance_criteria"),
    field(fields, "gates"),
    field(fields, "reporting"),
  ].flatMap(asList).join("\n");
  return BROWSER_UI_PATTERNS.some((rx) => rx.test(text));
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
  node scripts/orchestration/contract-controller.mjs \\
    --workspace <slug> --project-id <uuid> \\
    (--work-item-id <uuid> | --sequence <PROJECT>-<n>) \\
    [--mode dry-run|post] [--auth api-key|app-token] [--json]

Stage 0.5 pre-dispatch contract review. Dry-run writes nothing. Post mode
writes exactly one controller.contract-review Plane comment. It never locks,
spawns, marks Done, writes Linear, deploys or edits the work item.

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

async function fetchProjectIdentifier({ baseUrl, authHeaders, workspace, projectId }) {
  const response = await requestJson({
    baseUrl,
    authHeaders,
    path: `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/`,
  });
  if (!response.ok) return "";
  return String(response.body?.identifier || "").trim().toUpperCase();
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
    version: "contract-controller-cli/v0",
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
  const projectIdentifier = await fetchProjectIdentifier({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    workspace: args.workspace,
    projectId: args.projectId,
  });
  if (projectIdentifier) item._project_identifier = projectIdentifier;
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
  const review = evaluateContractForDispatch({ item, labelNames });
  result.ok = review.ok;
  result.work_item = {
    id: item.id,
    sequence_id: item.sequence_id ? formatPlaneWorkItemSequence(item) : null,
    name: item.name,
  };
  result.label_resolution = labelResolution;
  result.review = review;
  result.review_yaml = buildContractReviewYaml({ review, item, reviewer: args.reviewer });

  if (args.mode === "post") {
    const post = await postComment({
      baseUrl: args.baseUrl,
      authHeaders: auth.headers,
      workspace: args.workspace,
      projectId: args.projectId,
      workItemId: item.id,
      html: wrapAsCommentHtml(CONTRACT_REVIEW_TITLE, result.review_yaml),
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
  console.log(`Contract controller: ${result.review?.verdict || "ERROR"}`);
  if (result.work_item) console.log(`work item: ${result.work_item.sequence_id || result.work_item.id} ${result.work_item.name}`);
  for (const code of result.review?.reason_codes || []) console.log(`reason: ${code}`);
  for (const suggestion of result.review?.suggestions || []) console.log(`suggestion: ${suggestion}`);
  if (result.post_status) console.log(`posted: HTTP ${result.post_status}`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((error) => {
    console.error(`Contract controller failed: ${error.message}`);
    process.exitCode = 1;
  });
}
