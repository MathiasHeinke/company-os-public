// Supergoal Execution Ladder — pure core (no I/O).
//
// Encodes the 10-stage execution lifecycle and its authority invariants so the
// ledger reflects INTEGRATION TRUTH, not agent success. "Built" != "integrated"
// != "live". See docs/orchestration/supergoal-execution-ladder.md.
//
// Stage order is canonical and 1-indexed for human readability.

export const EXECUTION_LADDER_VERSION = "supergoal-execution-ladder/v0";

export const EXECUTION_STAGES = Object.freeze([
  "SPEC_READY",
  "CONTRACT_PASS",
  "RUNTIME_READY_PASS",
  "WORKER_REPORTED",
  "CAO_PASS_HG2",
  "CONTROLLER_AUTO_GO",
  "SANDBOX_VERIFIED",
  "INTEGRATED_MAIN",
  "DEPLOYED_PROD",
  "DONE",
]);

// 1-indexed position lookup.
export const STAGE_INDEX = Object.freeze(
  EXECUTION_STAGES.reduce((acc, name, i) => {
    acc[name] = i + 1;
    return acc;
  }, {}),
);

// Who may SET each stage. Seats are generic Company.OS roles, never named people.
// Workers may progress the work up to CAO_PASS_HG2 and no further; integration
// and release are reserved.
export const STAGE_AUTHORITY = Object.freeze({
  SPEC_READY: ["author", "eve", "c-level", "ceo"],
  CONTRACT_PASS: ["contract-controller"],
  RUNTIME_READY_PASS: ["runtime-executability"],
  WORKER_REPORTED: ["worker"],
  CAO_PASS_HG2: ["cao"],
  CONTROLLER_AUTO_GO: ["controller", "codex"],
  SANDBOX_VERIFIED: ["codex", "ceo"],
  INTEGRATED_MAIN: ["codex", "ceo"],
  DEPLOYED_PROD: ["codex", "founder", "release-gate"],
  DONE: ["codex", "ceo", "founder"],
});

// The highest stage a worker may set. Everything above is integration/release.
export const WORKER_STAGE_CEILING = "CAO_PASS_HG2";

// TargetClass -> the stage that DONE maps to. DONE is only valid once the work
// has reached at least this stage.
export const TARGET_CLASS_DONE_STAGE = Object.freeze({
  "report-only": "CONTROLLER_AUTO_GO",
  "main-integrated": "INTEGRATED_MAIN",
  "production-deployed": "DEPLOYED_PROD",
});

export const KNOWN_TARGET_CLASSES = Object.freeze(
  Object.keys(TARGET_CLASS_DONE_STAGE),
);

export function isKnownStage(stage) {
  return Object.prototype.hasOwnProperty.call(STAGE_INDEX, stage);
}

export function stageRank(stage) {
  return STAGE_INDEX[stage] ?? 0;
}

// May `seat` set `stage`? Unknown stage or seat -> false.
export function canSeatSetStage(seat, stage) {
  const allowed = STAGE_AUTHORITY[stage];
  if (!allowed) return false;
  return allowed.includes(String(seat || "").trim().toLowerCase());
}

// Is `stage` within the worker ceiling (<= CAO_PASS_HG2)?
export function isWithinWorkerCeiling(stage) {
  if (!isKnownStage(stage)) return false;
  return stageRank(stage) <= stageRank(WORKER_STAGE_CEILING);
}

// Evaluate whether DONE may be set for a given target class + current stage.
// Returns { eligible, requiredStage, reason }.
export function evaluateDoneEligibility({ targetClass, currentStage } = {}) {
  const tc = String(targetClass || "").trim().toLowerCase();
  if (!KNOWN_TARGET_CLASSES.includes(tc)) {
    return {
      eligible: false,
      requiredStage: null,
      reason: "execution-ladder.unknown-target-class",
    };
  }
  if (!isKnownStage(currentStage)) {
    return {
      eligible: false,
      requiredStage: TARGET_CLASS_DONE_STAGE[tc],
      reason: "execution-ladder.unknown-current-stage",
    };
  }
  const requiredStage = TARGET_CLASS_DONE_STAGE[tc];
  const eligible = stageRank(currentStage) >= stageRank(requiredStage);
  return {
    eligible,
    requiredStage,
    reason: eligible
      ? "execution-ladder.done-eligible"
      : "execution-ladder.done-blocked-target-class-stage-not-reached",
  };
}

// Guard: a controller AUTO-GO (stage 6) must never be treated as INTEGRATED_MAIN
// or DEPLOYED_PROD. This codifies the core anti-fake-autonomy invariant.
export function controllerAutoGoImpliesIntegration() {
  return false;
}

// Validate a proposed stage transition by a seat. Returns { ok, reason }.
export function evaluateStageTransition({ seat, fromStage, toStage } = {}) {
  if (!isKnownStage(toStage)) {
    return { ok: false, reason: "execution-ladder.unknown-target-stage" };
  }
  if (fromStage !== undefined && fromStage !== null && fromStage !== "") {
    if (!isKnownStage(fromStage)) {
      return { ok: false, reason: "execution-ladder.unknown-from-stage" };
    }
    // Forward-only by default; no skipping is enforced at the doc layer, but
    // backward moves are rejected here.
    if (stageRank(toStage) < stageRank(fromStage)) {
      return { ok: false, reason: "execution-ladder.no-backward-transition" };
    }
  }
  // Worker ceiling guard runs first so a worker attempting an integration/release
  // stage gets the specific ceiling error, not the generic seat-auth error.
  if (String(seat || "").trim().toLowerCase() === "worker" && !isWithinWorkerCeiling(toStage)) {
    return { ok: false, reason: "execution-ladder.worker-exceeds-ceiling" };
  }
  if (!canSeatSetStage(seat, toStage)) {
    return { ok: false, reason: "execution-ladder.seat-not-authorized-for-stage" };
  }
  return { ok: true, reason: "execution-ladder.transition-ok" };
}
