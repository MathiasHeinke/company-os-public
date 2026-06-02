#!/usr/bin/env node

/*
 * codex-controller-dryrun.mjs
 *
 * Codex Controller Runtime.
 *
 * Reads a Plane work item that already has a CAO `controller.verdict`,
 * computes a controller decision (AUTO-GO / DELEGATE / SELF-FIX /
 * ASK-CEO-HG3 / ASK-FOUNDER / REJECT / PARK) and a SELF-FIX eligibility verdict, and
 * prints or posts the structured decision card.
 *
 * Hard guarantees:
 *   - dry-run never writes a Plane comment
 *   - post mode writes exactly one `controller.decision` Plane comment
 *   - never transitions a Plane work item state
 *   - never spawns a worker, never schedules anything
 *   - never executes a SELF-FIX edit (this CLI never edits source)
 *   - never marks Done, never writes Linear, never reads secrets
 *
 * Source of truth:
 *   docs/orchestration/codex-controller-runtime.md
 *   docs/orchestration/subagent-reporting-contract.md
 *   docs/governance/ceo-release-authority.md
 *   docs/agents/cao.md
 */

import { randomUUID } from "node:crypto";
import {
  DEFAULT_BASE_URL,
  PLANE_API_KEY_ACCOUNT,
  PLANE_API_KEY_SERVICE,
  PLANE_APP_BOT_TOKEN_ACCOUNT,
  PLANE_APP_SERVICE,
  resolvePlaneAuth,
} from "../plane/plane-auth.mjs";
import { stripHtml } from "./plane-html.mjs";
import {
  buildRaindropCallSummaryFromCodexControllerDecision,
  buildRaindropOutputDir,
  writeRaindropCallSummary,
} from "./raindrop-call-adapter.mjs";
import {
  loadPostWorkerQualityRegistry,
  planPostWorkerQualityLoop,
} from "./post-worker-quality-loop-core.mjs";
import { extractContractBlock } from "./worker-ledger-validator.mjs";

// Closed set of decision modes per docs/orchestration/codex-controller-runtime.md.
// HG-3.5-PENDING-ARTIFACT-REVIEW is the Chief-of-Staff / founder-proxy decision per
// docs/governance/human-gate-levels.md: CAO PARKed a well-formed pause,
// the proxy reviews the artifact in Plane, signs via the template, and
// a subsequent controller rerun routes the item forward.
export const DECISION_MODES = Object.freeze({
  AUTO_GO: "AUTO-GO",
  DELEGATE: "DELEGATE",
  SELF_FIX: "SELF-FIX",
  ASK_CEO_HG3: "ASK-CEO-HG3",
  ASK_FOUNDER: "ASK-FOUNDER",
  REJECT: "REJECT",
  PARK: "PARK",
  HG_35_PENDING_ARTIFACT_REVIEW: "HG-3.5-PENDING-ARTIFACT-REVIEW",
});

// Sign / reject templates the Chief-of-Staff / Founder-Proxy pastes back
// into Plane to record a founder-proxy decision. Kept as constants so the
// controller emits byte-identical templates on every rerun and the queue
// can rely on a deterministic shape.
export const HG_35_SIGN_TEMPLATE = [
  "controller.founder-proxy-sign:",
  "  verdict: APPROVE",
  "  sign_comment_id: <plane comment id>",
  "  signed_at: <ISO-8601>",
].join("\n");

export const HG_35_REJECT_TEMPLATE = [
  "controller.founder-proxy-sign:",
  "  verdict: REJECT",
  "  reason: <short proxy reason>",
  "  signed_at: <ISO-8601>",
].join("\n");

// SELF-FIX reject codes per [WORK_ITEM_ID] contract. Stable identifiers, never renamed.
export const SELFFIX_REJECT_CODES = Object.freeze({
  SCOPE_TOO_LARGE: "selffix.scope-too-large",
  TOUCHES_HG3: "selffix.touches-hg3",
  CONFIDENCE_TOO_LOW: "selffix.confidence-too-low",
  PRODUCTION_WRITE: "selffix.production-write",
  SECRETS_AUTH_SCHEMA_RLS: "selffix.secrets-auth-schema-rls",
  LARGE_REFACTOR: "selffix.large-refactor",
  GATES_NOT_GREEN: "selffix.gates-not-green",
});

// SELF-FIX numeric thresholds. Tunable per phase but stable within a phase.
export const SELFFIX_THRESHOLDS = Object.freeze({
  MIN_CONFIDENCE: 0.92,
  MAX_FILES_TOUCHED: 3,
  MAX_LINES_CHANGED: 40,
  MAX_REFACTOR_LINES: 20,
});

// High-gate surfaces lifted from docs/governance/ceo-release-authority.md.
const HG3_SCOPE_SURFACES = new Set([
  "schema",
  "rls",
  "auth",
  "service-role",
  "irreversible-data",
  "mass-data-mutation",
  "material-spend",
  "subscription-change",
  "pricing-change",
  "money-movement",
  "regulated-claim",
  "founder-outreach",
  "autonomy-l4",
  "autonomy-l5",
  "private-memory-write",
  "strategic-direction",
]);

const SECRETS_AUTH_SCOPE_SURFACES = new Set([
  "secrets",
  "auth",
  "schema",
  "rls",
  "service-role",
]);

const PRODUCTION_WRITE_SCOPE_SURFACES = new Set([
  "production-write",
  "deploy",
  "merge-main",
  "push-main",
]);

// HumanGate-level confidence thresholds for AUTO-GO per
// docs/governance/ceo-release-authority.md.
export const HUMAN_GATE_AUTO_GO_THRESHOLDS = Object.freeze({
  "HG-0": 0,
  "HG-1": 0.80,
  "HG-2": 0.85,
  "HG-2.5": 0.92,
  "HG-3": 0.96,
});

export function normalizeHumanGateLevel(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  // Recognize the canonical HumanGate enum including HG-4.
  // Source of truth: docs/governance/human-gate-levels.md.
  const match = text.match(/\bHG-(?:0|1|2(?:\.5)?|3(?:\.5)?|4)\b/i);
  return match ? match[0].toUpperCase() : text;
}

function numericField(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const n = Number(String(value).trim());
    if (Number.isFinite(n)) return n;
  }
  return NaN;
}

export function resolveControllerInputs({ args = {}, contractFields = {} } = {}) {
  const cliReleaseAuthority = String(args.releaseAuthority || "").trim();
  const releaseAuthorityDeclared = (cliReleaseAuthority || String(contractField(
    contractFields,
    "releaseauthority",
    "release_authority",
  ) || "")).trim();
  const founderPrediction = String(contractField(
    contractFields,
    "founderprediction",
    "founder_prediction",
  ) || "").trim();
  const founderPredictionConfidence = numericField(
    contractFields.founderpredictionconfidence,
    contractFields.founder_prediction_confidence,
  );
  const contractCeoConfidence = numericField(
    contractFields.ceoconfidence,
    contractFields.ceo_confidence,
  );
  const cliConfidence = Number.isFinite(args.confidence) ? args.confidence : NaN;

  let ceoConfidence = 0;
  let ceoConfidenceSource = "default-zero";
  if (Number.isFinite(cliConfidence)) {
    ceoConfidence = cliConfidence;
    ceoConfidenceSource = "cli";
  } else if (Number.isFinite(contractCeoConfidence)) {
    ceoConfidence = contractCeoConfidence;
    ceoConfidenceSource = "contract-ceoconfidence";
  } else if (
    Number.isFinite(founderPredictionConfidence)
    && ["CEO_AUTONOMOUS", "CEO_CRITICAL"].includes(releaseAuthorityDeclared)
  ) {
    ceoConfidence = founderPredictionConfidence;
    ceoConfidenceSource = "contract-founderpredictionconfidence";
  }

  return {
    ceoConfidence,
    ceoConfidenceSource,
    founderPrediction,
    founderPredictionConfidence: Number.isFinite(founderPredictionConfidence) ? founderPredictionConfidence : null,
    releaseAuthorityDeclared: releaseAuthorityDeclared || "",
  };
}

// ---------- Pure functions ----------

/**
 * SELF-FIX eligibility validator. Pure function. Tests every reject code
 * in `SELFFIX_REJECT_CODES`.
 */
export function evaluateSelfFixEligibility({
  changeScope = {},
  gates = { green: [], red: [] },
  humanGateLevel = "HG-0",
  ceoConfidence = 0,
} = {}) {
  const reasons = [];
  const normalizedHumanGateLevel = normalizeHumanGateLevel(humanGateLevel);

  if (normalizedHumanGateLevel === "HG-3" || normalizedHumanGateLevel === "HG-4") {
    reasons.push(SELFFIX_REJECT_CODES.TOUCHES_HG3);
  }
  const scopeSurfaces = Array.isArray(changeScope.surfaces) ? changeScope.surfaces : [];
  for (const surface of scopeSurfaces) {
    if (HG3_SCOPE_SURFACES.has(String(surface).toLowerCase())) {
      if (!reasons.includes(SELFFIX_REJECT_CODES.TOUCHES_HG3)) {
        reasons.push(SELFFIX_REJECT_CODES.TOUCHES_HG3);
      }
    }
  }

  if (ceoConfidence < SELFFIX_THRESHOLDS.MIN_CONFIDENCE) {
    reasons.push(SELFFIX_REJECT_CODES.CONFIDENCE_TOO_LOW);
  }

  if (scopeSurfaces.some((s) => PRODUCTION_WRITE_SCOPE_SURFACES.has(String(s).toLowerCase()))) {
    reasons.push(SELFFIX_REJECT_CODES.PRODUCTION_WRITE);
  }

  if (scopeSurfaces.some((s) => SECRETS_AUTH_SCOPE_SURFACES.has(String(s).toLowerCase()))) {
    if (!reasons.includes(SELFFIX_REJECT_CODES.SECRETS_AUTH_SCHEMA_RLS)) {
      reasons.push(SELFFIX_REJECT_CODES.SECRETS_AUTH_SCHEMA_RLS);
    }
  }

  const filesCount = Number(changeScope.files_count || 0);
  const linesChanged = Number(changeScope.lines_changed || 0);
  if (
    filesCount > SELFFIX_THRESHOLDS.MAX_FILES_TOUCHED ||
    linesChanged > SELFFIX_THRESHOLDS.MAX_LINES_CHANGED
  ) {
    reasons.push(SELFFIX_REJECT_CODES.SCOPE_TOO_LARGE);
  }

  const refactorLines = Number(changeScope.refactor_lines || 0);
  if (
    scopeSurfaces.includes("refactor") &&
    refactorLines > SELFFIX_THRESHOLDS.MAX_REFACTOR_LINES
  ) {
    reasons.push(SELFFIX_REJECT_CODES.LARGE_REFACTOR);
  }

  const redGates = Array.isArray(gates.red) ? gates.red : [];
  if (redGates.length > 0) {
    reasons.push(SELFFIX_REJECT_CODES.GATES_NOT_GREEN);
  }

  const unique = Array.from(new Set(reasons));
  return {
    eligible: unique.length === 0,
    reject_codes: unique,
    inputs: {
      humanGateLevel: normalizedHumanGateLevel,
      ceoConfidence,
      filesCount,
      linesChanged,
      refactorLines,
      scopeSurfaces,
      gates_green: Array.isArray(gates.green) ? gates.green.length : 0,
      gates_red: redGates.length,
    },
  };
}

/**
 * Top-level controller decision. Pure function. Order of precedence:
 *
 *   1. CAO REJECT  → REJECT
 *   2. CAO PARK    → PARK
 *   3. HG-4        → ASK-FOUNDER
 *   4. HG-3 without CEO_CRITICAL → ASK-CEO-HG3
 *   5. confidence < 0.70 → ASK-FOUNDER / ASK-CEO-HG3 by level
 *   5. self-fix requested + eligible → SELF-FIX
 *   6. self-fix requested + not eligible → DELEGATE (route to worker run)
 *   7. confidence >= HG-level threshold → AUTO-GO
 *   8. default → DELEGATE
 */
export function decideController({
  caoVerdict = null,
  humanGateLevel = "HG-0",
  ceoConfidence = 0,
  releaseAuthorityDeclared = "",
  humanGateRelease = null,
  selfFixRequested = false,
  changeScope = {},
  gates = { green: [], red: [] },
  pauseArtifact = "",
} = {}) {
  const normalizedHumanGateLevel = normalizeHumanGateLevel(humanGateLevel);
  const normalizedReleaseAuthority = String(releaseAuthorityDeclared || "").trim();
  const humanGateReleased = Boolean(humanGateRelease?.ok);
  if (!caoVerdict) {
    return {
      decision_mode: DECISION_MODES.PARK,
      reason: "cao-missing",
      release_authority: "none",
      next_state_hint: "cao-required",
      selffix: null,
    };
  }
  if (caoVerdict === "REJECT") {
    return {
      decision_mode: DECISION_MODES.REJECT,
      reason: "cao-reject",
      release_authority: "none",
      next_state_hint: "c-level:role:planning",
      selffix: null,
    };
  }
  if (caoVerdict === "PARK") {
    // Founder-Proxy (HG-3.5) PARK is a distinct decision: surface the
    // pause artifact and sign/reject templates so the founder-proxy
    // queue can render the review without further controller work.
    if (normalizedHumanGateLevel === "HG-3.5") {
      const artifact = String(pauseArtifact || "").trim();
      return {
        decision_mode: DECISION_MODES.HG_35_PENDING_ARTIFACT_REVIEW,
        reason: "cao-park-hg35",
        release_authority: "none",
        next_state_hint: "founder-proxy-review",
        selffix: null,
        hg35: {
          pause_artifact: artifact || null,
          sign_template: HG_35_SIGN_TEMPLATE,
          reject_template: HG_35_REJECT_TEMPLATE,
        },
      };
    }
    return {
      decision_mode: DECISION_MODES.PARK,
      reason: "cao-park",
      release_authority: "none",
      next_state_hint: "parked",
      selffix: null,
    };
  }
  if (normalizedHumanGateLevel === "HG-4" && humanGateReleased) {
    return {
      decision_mode: DECISION_MODES.AUTO_GO,
      reason: "hg-4-founder-released",
      release_authority: "FOUNDER_REQUIRED",
      next_state_hint: "founder-released",
      selffix: null,
      human_gate_release: humanGateRelease,
    };
  }
  if (normalizedHumanGateLevel === "HG-4") {
    return {
      decision_mode: DECISION_MODES.ASK_FOUNDER,
      reason: "hg-4",
      release_authority: "FOUNDER_REQUIRED",
      next_state_hint: "founder-decision",
      selffix: null,
    };
  }
  if (normalizedHumanGateLevel === "HG-3" && normalizedReleaseAuthority !== "CEO_CRITICAL") {
    return {
      decision_mode: DECISION_MODES.ASK_CEO_HG3,
      reason: "hg-3-ceo-critical-required",
      release_authority: "CEO_CRITICAL",
      next_state_hint: "ceo-critical-decision",
      selffix: null,
    };
  }
  if (normalizedHumanGateLevel === "HG-2.5" && normalizedReleaseAuthority === "FOUNDER_REQUIRED") {
    return {
      decision_mode: DECISION_MODES.ASK_FOUNDER,
      reason: "declared-founder-required",
      release_authority: "FOUNDER_REQUIRED",
      next_state_hint: "founder-decision",
      selffix: null,
    };
  }
  if (ceoConfidence < 0.70) {
    return {
      decision_mode: normalizedHumanGateLevel === "HG-3" ? DECISION_MODES.ASK_CEO_HG3 : DECISION_MODES.ASK_FOUNDER,
      reason: "low-confidence",
      release_authority: normalizedHumanGateLevel === "HG-3" ? "CEO_CRITICAL" : "FOUNDER_REQUIRED",
      next_state_hint: normalizedHumanGateLevel === "HG-3" ? "ceo-critical-decision" : "founder-decision",
      selffix: null,
    };
  }

  if (selfFixRequested) {
    const selffix = evaluateSelfFixEligibility({
      changeScope,
      gates,
      humanGateLevel: normalizedHumanGateLevel,
      ceoConfidence,
    });
    if (selffix.eligible) {
      return {
        decision_mode: DECISION_MODES.SELF_FIX,
        reason: "selffix-eligible",
        release_authority: "none", // SELF-FIX in Phase 1 is dry-run only
        next_state_hint: "controller-selffix-pending",
        selffix,
      };
    }
    return {
      decision_mode: DECISION_MODES.DELEGATE,
      reason: "selffix-ineligible",
      release_authority: "none",
      next_state_hint: "delegate-to-worker",
      selffix,
    };
  }

  const threshold = HUMAN_GATE_AUTO_GO_THRESHOLDS[normalizedHumanGateLevel];
  if (typeof threshold === "number" && ceoConfidence >= threshold) {
    const releaseAuthority = normalizedHumanGateLevel === "HG-2.5"
      ? "CEO_AUTONOMOUS"
      : normalizedHumanGateLevel === "HG-3"
        ? "CEO_CRITICAL"
        : "none";
    return {
      decision_mode: DECISION_MODES.AUTO_GO,
      reason: "confidence-meets-threshold",
      release_authority: releaseAuthority,
      next_state_hint: normalizedHumanGateLevel === "HG-2.5"
        ? "ready-for-release"
        : normalizedHumanGateLevel === "HG-3"
          ? "ready-for-critical-release"
          : "ceo-decided",
      selffix: null,
    };
  }

  return {
    decision_mode: DECISION_MODES.DELEGATE,
    reason: "default-delegate",
    release_authority: "none",
    next_state_hint: "delegate-to-worker",
    selffix: null,
  };
}

function asList(value) {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.flatMap(asList);
  return String(value)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function contractText(fields = {}, ...names) {
  return names.flatMap((name) => asList(contractField(fields, name))).join("\n");
}

function inferPostWorkerQualityClass(contractFields = {}) {
  const explicit = contractField(contractFields, "inferenceclass", "inference_class", "InferenceClass");
  if (explicit) return explicit;
  const text = [
    contractText(contractFields, "scope", "source_of_truth", "sourceoftruth", "allowedwritepaths", "allowed_write_paths", "gates"),
    contractField(contractFields, "mode", "Mode"),
  ].join("\n").toLowerCase();
  if (/\b(cross[-\s]?repo|multi[-\s]?repo|multiple workspaces)\b/.test(text)) return "P3-cross-repo";
  if (/(scripts\/(?:orchestration|runtime|update|release|release-gates|capabilities)|registries\/|auth|rls|service-role|capability|scheduler|dispatcher|controller)/.test(text)) {
    return "P2-code-shared";
  }
  return "P1-code-bounded";
}

function shouldRunPostWorkerQuality(contractFields = {}, decision = {}) {
  const policy = String(contractField(
    contractFields,
    "postworkerqualitypolicy",
    "post_worker_quality_policy",
    "PostWorkerQualityPolicy",
  ) || "").trim().toLowerCase();
  if (["off", "disabled", "none", "optional"].includes(policy)) return false;
  if (["required", "enforced", "post-worker-quality-loop/v0"].includes(policy)) return true;
  const mode = String(contractField(contractFields, "mode", "Mode") || "").trim().toLowerCase();
  const agent = String(contractField(contractFields, "agent", "Agent") || "").trim().toLowerCase();
  const decisionMode = decision?.decision_mode || "";
  return (
    ["implement", "verify", "review"].includes(mode)
    && ["claude", "codex", "gemini"].includes(agent)
    && ![
      DECISION_MODES.ASK_FOUNDER,
      DECISION_MODES.ASK_CEO_HG3,
      DECISION_MODES.HG_35_PENDING_ARTIFACT_REVIEW,
      DECISION_MODES.PARK,
    ].includes(decisionMode)
  );
}

export function buildPostWorkerQualityPlanForController({
  registry,
  decision,
  contractFields = {},
  workerReport = {},
  caoVerdict = "",
  findings = [],
  previousHotfixRounds = 0,
  now = new Date(),
} = {}) {
  if (!registry || !shouldRunPostWorkerQuality(contractFields, decision)) return null;
  const inferenceClass = inferPostWorkerQualityClass(contractFields);
  const report = {
    state: workerReport.state || workerReport.verdict || workerReport.status || (caoVerdict === "REJECT" ? "REJECT" : "PASS"),
    reason: workerReport.reason || "",
    summary: workerReport.summary || "",
    reason_codes: workerReport.reason_codes || [],
  };
  return planPostWorkerQualityLoop({
    registry,
    contractFields: {
      ...contractFields,
      InferenceClass: inferenceClass,
    },
    workerReport: report,
    caoVerdict,
    findings,
    previousHotfixRounds,
    now,
  });
}

/**
 * Build the controller.decision YAML block. Pure function for reuse and
 * testing.
 */
export function buildDecisionCardYaml({
  runId,
  workItem,
  caoVerdict,
  decision,
  contractFields,
  signedAt,
  version = "codex-controller-dryrun-v0",
  noWritesPerformed = true,
  postWorkerQualityPlan = null,
}) {
  const lines = ["controller.decision:"];
  const indent = (n) => " ".repeat(n);
  const seq = formatControllerWorkItemSequence(workItem);
  const blocked = (
    Array.isArray(contractFields?.blockedactions)
      ? contractFields.blockedactions
      : (typeof contractFields?.blockedactions === "string"
        ? contractFields.blockedactions.split(/[;,]/).map((s) => s.trim()).filter(Boolean)
        : ["merge", "push", "deploy", "production-write", "schema/RLS/auth", "public-publish", "linear-write-outside-bridge", "plane-done-outside-hg-25"])
  );

  lines.push(`${indent(2)}version: ${version}`);
  lines.push(`${indent(2)}controller_run_id: ${runId}`);
  lines.push(`${indent(2)}work_item: ${seq}`);
  lines.push(`${indent(2)}cao_verdict: ${caoVerdict || "null"}`);
  lines.push(`${indent(2)}decision_mode: ${decision.decision_mode}`);
  lines.push(`${indent(2)}reason: ${decision.reason}`);
  lines.push(`${indent(2)}human_gate_level: ${normalizeHumanGateLevel(contractField(contractFields, "human_gate", "humangate")) || "HG-0"}`);
  lines.push(`${indent(2)}ceo_confidence: ${decision._inputs?.ceoConfidence ?? "n/a"}`);
  lines.push(`${indent(2)}ceo_confidence_source: ${decision._inputs?.ceoConfidenceSource || "n/a"}`);
  lines.push(`${indent(2)}founder_prediction: ${decision._inputs?.founderPrediction || "n/a"}`);
  lines.push(`${indent(2)}founder_prediction_confidence: ${decision._inputs?.founderPredictionConfidence ?? "n/a"}`);
  lines.push(`${indent(2)}declared_release_authority: ${decision._inputs?.releaseAuthorityDeclared || "n/a"}`);
  lines.push(`${indent(2)}release_authority: ${decision.release_authority}`);
  lines.push(`${indent(2)}next_state_hint: ${decision.next_state_hint}`);
  if (decision.selffix) {
    lines.push(`${indent(2)}selffix:`);
    lines.push(`${indent(4)}eligible: ${decision.selffix.eligible}`);
    lines.push(`${indent(4)}reject_codes:`);
    if (decision.selffix.reject_codes.length === 0) {
      lines.push(`${indent(6)}- []`);
    } else {
      for (const code of decision.selffix.reject_codes) {
        lines.push(`${indent(6)}- ${code}`);
      }
    }
  } else {
    lines.push(`${indent(2)}selffix: null`);
  }
  if (decision.hg35) {
    lines.push(`${indent(2)}hg35:`);
    lines.push(`${indent(4)}pause_artifact: ${decision.hg35.pause_artifact ?? "null"}`);
    emitLiteralBlock(lines, indent(4), "sign_template", decision.hg35.sign_template);
    emitLiteralBlock(lines, indent(4), "reject_template", decision.hg35.reject_template);
  }
  if (decision.human_gate_release) {
    lines.push(`${indent(2)}human_gate_release:`);
    lines.push(`${indent(4)}source: human_gate.released`);
    lines.push(`${indent(4)}comment_id: ${decision.human_gate_release.comment_id || "unknown"}`);
    lines.push(`${indent(4)}released_by: ${decision.human_gate_release.released_by || "unknown"}`);
    lines.push(`${indent(4)}level: ${decision.human_gate_release.level || "unknown"}`);
    lines.push(`${indent(4)}scope: ${decision.human_gate_release.scope || "unspecified"}`);
  }
  if (postWorkerQualityPlan) {
    emitPostWorkerQualityPlan(lines, indent, postWorkerQualityPlan, seq);
  }
  lines.push(`${indent(2)}blocked_actions_remaining:`);
  for (const a of blocked) lines.push(`${indent(4)}- ${a}`);
  lines.push(`${indent(2)}signed_at: ${signedAt}`);
  lines.push(`${indent(2)}no_writes_performed: ${noWritesPerformed}`);
  return lines.join("\n");
}

function formatControllerWorkItemSequence(workItem = {}) {
  if (!workItem?.sequence_id) return workItem?.id || "unknown";
  const rawPrefix = workItem.project_identifier
    || workItem._project_identifier
    || workItem.project_detail?.identifier
    || (typeof workItem.project === "object" ? workItem.project?.identifier : "")
    || "COMPA";
  const prefix = String(rawPrefix || "COMPA").trim().toUpperCase();
  return `${prefix || "COMPA"}-${workItem.sequence_id}`;
}

function emitPostWorkerQualityPlan(lines, indent, plan, workItemRef) {
  lines.push(`${indent(2)}post_worker_quality:`);
  lines.push(`${indent(4)}version: ${plan.version || "post-worker-quality-loop/v0"}`);
  lines.push(`${indent(4)}status: ${plan.status || "UNKNOWN"}`);
  lines.push(`${indent(4)}inference_class: ${plan.inference_class || "unknown"}`);
  lines.push(`${indent(4)}scheduler_may_spawn: ${Boolean(plan.scheduler?.scheduler_may_spawn)}`);
  lines.push(`${indent(4)}reason_codes:`);
  for (const reason of plan.reason_codes || []) lines.push(`${indent(6)}- ${reason}`);
  lines.push(`${indent(4)}markers_to_post:`);
  for (const marker of plan.markers_to_post || []) {
    lines.push(`${indent(6)}- ${marker.marker}:${marker.worker_class}`);
  }
  for (const marker of plan.markers_to_post || []) {
    lines.push(`${marker.marker}:`);
    lines.push(`${indent(2)}version: ${plan.version || "post-worker-quality-loop/v0"}`);
    lines.push(`${indent(2)}work_item: ${workItemRef || "unknown"}`);
    lines.push(`${indent(2)}state: ${marker.state || "AUDIT_REQUESTED"}`);
    lines.push(`${indent(2)}worker_class: ${marker.worker_class || "unknown"}`);
    lines.push(`${indent(2)}reason_codes:`);
    for (const reason of plan.reason_codes || []) lines.push(`${indent(4)}- ${reason}`);
    if (marker.worker_class === "hotfix-worker") {
      lines.push(`${indent(2)}max_auto_hotfix_rounds: ${plan.loop_limits?.max_auto_hotfix_rounds ?? 1}`);
      lines.push(`${indent(2)}previous_hotfix_rounds: ${plan.loop_limits?.previous_hotfix_rounds ?? 0}`);
    }
  }
}

function emitLiteralBlock(lines, indentText, key, value) {
  if (value === null || value === undefined || value === "") {
    lines.push(`${indentText}${key}: null`);
    return;
  }
  // YAML literal block scalar (`|`) preserves newlines inside the
  // template while keeping the card parseable. Indent every value line
  // two spaces beyond the key indent so the sign template renders
  // intact when the founder-proxy queue lifts it.
  lines.push(`${indentText}${key}: |`);
  const inner = `${indentText}  `;
  for (const valueLine of String(value).split(/\r?\n/)) {
    lines.push(`${inner}${valueLine}`);
  }
}

// ---------- Helpers (shared with cao-pass / dispatcher) ----------

function parseYamlScalar(text) {
  const out = {};
  for (const line of String(text || "").split(/\r?\n/)) {
    const m = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+?)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function htmlEscape(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function contractField(fields, ...names) {
  for (const name of names) {
    if (fields?.[name] !== undefined && fields?.[name] !== null && fields?.[name] !== "") return fields[name];
  }
  return "";
}

/**
 * Extract the most recent CAO controller.verdict comment (PASS / REJECT /
 * PARK). Returns null if none present.
 */
export function findCaoVerdictComment(comments) {
  let best = null;
  for (const row of comments || []) {
    const html = row.comment_html || "";
    if (!html.includes("controller.verdict (cao-v0)")) continue;
    const body = stripHtml(html);
    const yamlMatch = body.match(/controller\.verdict:\s*\n([\s\S]*?)(?:\n\S|$)/);
    if (!yamlMatch) continue;
    const fields = parseYamlScalar(yamlMatch[1]);
    const ts = row.created_at ? Date.parse(row.created_at) : 0;
    if (!best || ts > best.ts) {
      best = {
        comment_id: row.id || null,
        ts,
        verdict: fields.verdict || null,
        cao_session_id: fields.cao_session_id || null,
      };
    }
  }
  return best;
}

/**
 * Extract the most recent explicit human gate release marker. This is evidence
 * only when the comment title is exactly `human_gate.released`; prose mentions
 * do not satisfy founder/CEO gates.
 */
export function findHumanGateReleaseComment(comments) {
  let best = null;
  for (const row of comments || []) {
    const html = row.comment_html || "";
    const title = html.match(/<strong>\s*([^<]+?)\s*<\/strong>/i)?.[1] || "";
    if (title.trim() !== "human_gate.released") continue;
    const body = stripHtml(html);
    const fields = parseYamlScalar(body.match(/human_gate\.released:\s*\n([\s\S]*?)(?:\n\S|$)/)?.[1] || body);
    const ts = row.created_at ? Date.parse(row.created_at) : 0;
    if (!best || ts > best.ts) {
      best = {
        ok: true,
        comment_id: row.id || null,
        ts,
        released_by: fields.released_by || fields.founder || null,
        level: fields.level || fields.human_gate_level || null,
        scope: fields.scope || fields.tenant_scope || null,
      };
    }
  }
  return best;
}

function findLatestWorkerReportedComment(comments) {
  let best = null;
  for (const row of comments || []) {
    const html = row.comment_html || "";
    const title = html.match(/<strong>\s*([^<]+?)\s*<\/strong>/i)?.[1] || "";
    if (title.trim() !== "worker.reported") continue;
    const body = stripHtml(html);
    const fields = parseYamlScalar(body.match(/worker\.reported:\s*\n([\s\S]*?)(?:\n\S|$)/)?.[1] || body);
    const ts = row.created_at ? Date.parse(row.created_at) : 0;
    if (!best || ts > best.ts) {
      best = {
        comment_id: row.id || null,
        ts,
        state: fields.state || fields.verdict || fields.status || null,
        reason: fields.reason || null,
        summary: fields.summary || null,
      };
    }
  }
  return best;
}

// ---------- CLI ----------

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    auth: process.env.PLANE_AUTH_MODE || "app-token",
    workspace: process.env.PLANE_WORKSPACE_SLUG || "",
    projectId: "",
    workItemId: "",
    mode: "dry-run",
    json: false,
    confidence: NaN,
    releaseAuthority: "",
    selfFixRequested: false,
    scopeFilesCount: NaN,
    scopeLinesChanged: NaN,
    scopeRefactorLines: NaN,
    scopeSurfaces: [],
    gatesGreen: [],
    gatesRed: [],
    raindropOutputDir: "",
    skipRaindrop: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--workspace") args.workspace = argv[++i] || "";
    else if (arg === "--project-id") args.projectId = argv[++i] || "";
    else if (arg === "--work-item-id") args.workItemId = argv[++i] || "";
    else if (arg === "--mode") args.mode = argv[++i] || "dry-run";
    else if (arg === "--auth") args.auth = argv[++i] || "app-token";
    else if (arg === "--base-url") args.baseUrl = argv[++i] || DEFAULT_BASE_URL;
    else if (arg === "--confidence") args.confidence = Number(argv[++i] || 0);
    else if (arg === "--release-authority") args.releaseAuthority = argv[++i] || "";
    else if (arg === "--selffix") args.selfFixRequested = true;
    else if (arg === "--scope-files") args.scopeFilesCount = Number(argv[++i] || 0);
    else if (arg === "--scope-lines") args.scopeLinesChanged = Number(argv[++i] || 0);
    else if (arg === "--scope-refactor-lines") args.scopeRefactorLines = Number(argv[++i] || 0);
    else if (arg === "--scope-surface") args.scopeSurfaces.push(argv[++i] || "");
    else if (arg === "--gate-green") args.gatesGreen.push(argv[++i] || "");
    else if (arg === "--gate-red") args.gatesRed.push(argv[++i] || "");
    else if (arg === "--raindrop-output-dir") args.raindropOutputDir = argv[++i] || "";
    else if (arg === "--skip-raindrop") args.skipRaindrop = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  return args;
}

function usage() {
  return `Usage:
  node scripts/orchestration/codex-controller-dryrun.mjs \\
    --workspace <slug> --project-id <uuid> --work-item-id <uuid> \\
    [--mode dry-run|post] \\
    [--auth api-key|app-token] \\
    [--confidence 0.92] [--release-authority CEO_AUTONOMOUS|CEO_CRITICAL] [--selffix] \\
    [--scope-files N] [--scope-lines N] [--scope-refactor-lines N] \\
    [--scope-surface refactor --scope-surface auth] \\
    [--gate-green name] [--gate-red name] \\
    [--raindrop-output-dir PATH] [--skip-raindrop] \\
    [--json]

Dry-run mode never writes to Plane. Post mode writes exactly one
controller.decision comment. The CLI never spawns a worker, never executes
a SELF-FIX edit, never marks Done and never changes Plane state.

Operator-supplied flags (--confidence, --scope-*, --gate-*) feed the
decision logic when the work item description does not encode them.

Keychain fallback:
  api key:   ${PLANE_API_KEY_SERVICE} / ${PLANE_API_KEY_ACCOUNT}
  app token: ${PLANE_APP_SERVICE} / ${PLANE_APP_BOT_TOKEN_ACCOUNT}
`;
}

async function requestJson({ baseUrl, authHeaders, path, method = "GET", body }) {
  const r = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...authHeaders, "Accept": "application/json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text.slice(0, 500) }; }
  return { ok: r.ok, status: r.status, body: parsed };
}

async function postDecisionComment({ baseUrl, authHeaders, itemPath, yaml }) {
  return requestJson({
    baseUrl,
    authHeaders,
    path: `${itemPath}comments/`,
    method: "POST",
    body: {
      comment_html: [
        "<p><strong>controller.decision (codex-controller-v0)</strong></p>",
        `<pre><code>${htmlEscape(yaml)}</code></pre>`,
      ].join("\n"),
    },
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = new Date();
  if (args.help) { console.log(usage()); return; }
  const errors = [];
  if (!["dry-run", "post"].includes(args.mode)) errors.push("--mode must be dry-run or post");
  if (!args.workspace) errors.push("--workspace is required");
  if (!args.projectId) errors.push("--project-id is required");
  if (!args.workItemId) errors.push("--work-item-id is required");
  const auth = resolvePlaneAuth(args.auth);
  if (!auth.ok) errors.push(auth.missingError);

  const result = {
    version: "codex-controller-dryrun-cli/v0",
    mode: args.mode,
    workspace: args.workspace,
    projectId: args.projectId,
    workItemId: args.workItemId,
    authMode: auth.authMode,
    ok: errors.length === 0,
    errors,
  };
  if (errors.length) { printResult(result, args.json); process.exitCode = 2; return; }

  const itemPath = `/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/${encodeURIComponent(args.projectId)}/work-items/${encodeURIComponent(args.workItemId)}/`;
  const itemResp = await requestJson({ baseUrl: args.baseUrl, authHeaders: auth.headers, path: itemPath });
  if (!itemResp.ok) {
    result.ok = false;
    result.error = itemResp.body;
    result.status = itemResp.status;
    printResult(result, args.json);
    process.exitCode = 1;
    return;
  }
  const workItem = itemResp.body;

  const commentsPath = `${itemPath}comments/`;
  const commentsResp = await requestJson({ baseUrl: args.baseUrl, authHeaders: auth.headers, path: commentsPath });
  if (!commentsResp.ok) {
    result.ok = false;
    result.error = commentsResp.body;
    result.status = commentsResp.status;
    printResult(result, args.json);
    process.exitCode = 1;
    return;
  }
  const comments = Array.isArray(commentsResp.body) ? commentsResp.body : (commentsResp.body?.results || []);
  const cao = findCaoVerdictComment(comments);

  const description = stripHtml(workItem.description_html || workItem.description_stripped || "");
  const extracted = extractContractBlock(description);
  const contractFields = extracted.ok ? extracted.fields : {};

  const controllerInputs = resolveControllerInputs({ args, contractFields });

  const changeScope = {
    files_count: Number.isFinite(args.scopeFilesCount) ? args.scopeFilesCount : 0,
    lines_changed: Number.isFinite(args.scopeLinesChanged) ? args.scopeLinesChanged : 0,
    refactor_lines: Number.isFinite(args.scopeRefactorLines) ? args.scopeRefactorLines : 0,
    surfaces: args.scopeSurfaces,
  };
  const gates = { green: args.gatesGreen, red: args.gatesRed };

  const decision = decideController({
    caoVerdict: cao?.verdict || null,
    humanGateLevel: contractField(contractFields, "human_gate", "humangate") || "HG-0",
    ceoConfidence: controllerInputs.ceoConfidence,
    releaseAuthorityDeclared: controllerInputs.releaseAuthorityDeclared,
    humanGateRelease: findHumanGateReleaseComment(comments),
    selfFixRequested: args.selfFixRequested,
    changeScope,
    gates,
    pauseArtifact: contractField(contractFields, "hg35_pause_artifact"),
  });
  decision._inputs = controllerInputs;

  const qualityRegistry = loadPostWorkerQualityRegistry(process.env.COMPANY_OS_POST_WORKER_QUALITY_REGISTRY);
  const postWorkerQualityPlan = qualityRegistry.ok
    ? buildPostWorkerQualityPlanForController({
      registry: qualityRegistry.registry,
      decision,
      contractFields,
      workerReport: findLatestWorkerReportedComment(comments) || {},
      caoVerdict: cao?.verdict || null,
      findings: args.gatesRed,
    })
    : null;

  const runId = randomUUID();
  const signedAt = new Date().toISOString();
  const yaml = buildDecisionCardYaml({
    runId,
    workItem,
    caoVerdict: cao?.verdict,
    decision,
    contractFields,
    signedAt,
    version: args.mode === "post" ? "codex-controller-v0" : "codex-controller-dryrun-v0",
    noWritesPerformed: args.mode !== "post",
    postWorkerQualityPlan,
  });

  result.cao_verdict = cao?.verdict || null;
  result.decision = decision;
  result.preview = yaml;
  result.no_writes_performed = args.mode !== "post";
  result.ok = true; // Controller decisions may be PARK/REJECT; non-zero exit only on runtime/write errors.

  if (args.mode === "post") {
    const post = await postDecisionComment({ baseUrl: args.baseUrl, authHeaders: auth.headers, itemPath, yaml });
    result.post_status = post.status;
    result.post_ok = post.ok;
    result.post_comment_id = post.ok && post.body?.id ? post.body.id : null;
    if (!post.ok) {
      result.ok = false;
      result.error = post.body;
      printResult(result, args.json);
      process.exitCode = 1;
      return;
    }
  }

  if (!args.skipRaindrop) {
    const finishedAt = new Date();
    const summary = buildRaindropCallSummaryFromCodexControllerDecision({
      runId,
      workItem,
      decision,
      mode: args.mode,
      startedAt: startedAt.toISOString(),
      endedAt: finishedAt.toISOString(),
      caoVerdict: cao?.verdict || null,
      postCommentId: result.post_comment_id || "",
    });
    const written = writeRaindropCallSummary(
      summary,
      args.raindropOutputDir || buildRaindropOutputDir({ now: finishedAt }),
      { runId: `${runId}.codex-controller` },
    );
    result.raindrop_summary = {
      jsonPath: written.jsonPath,
      mdPath: written.mdPath,
      version: summary["raindrop.llm_call_summary"].version,
      surface: summary["raindrop.llm_call_summary"].surface,
    };
  }

  printResult(result, args.json);
  process.exitCode = 0;
}

function printResult(result, json) {
  if (json) { console.log(JSON.stringify(result, null, 2)); return; }
  console.log(`codex-controller-dryrun: ${result.ok ? "ok" : "fail"}`);
  console.log(`mode: ${result.mode}`);
  if (result.cao_verdict !== undefined) console.log(`cao_verdict: ${result.cao_verdict}`);
  if (result.decision) {
    console.log(`decision_mode: ${result.decision.decision_mode}`);
    console.log(`reason: ${result.decision.reason}`);
    console.log(`release_authority: ${result.decision.release_authority}`);
    if (result.decision.selffix) {
      console.log(`selffix.eligible: ${result.decision.selffix.eligible}`);
      if (result.decision.selffix.reject_codes.length) {
        console.log(`selffix.reject_codes: ${result.decision.selffix.reject_codes.join(", ")}`);
      }
    }
  }
  if (result.preview) console.log("---preview---\n" + result.preview);
  if (result.raindrop_summary) {
    console.log(`raindrop_summary_json: ${result.raindrop_summary.jsonPath}`);
    console.log(`raindrop_summary_md: ${result.raindrop_summary.mdPath}`);
  }
  for (const e of result.errors || []) console.log(`error: ${e}`);
  if (result.error) console.log(`error: ${JSON.stringify(result.error).slice(0, 300)}`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    console.error(`codex-controller-dryrun failed: ${err.message}`);
    process.exitCode = 1;
  });
}
