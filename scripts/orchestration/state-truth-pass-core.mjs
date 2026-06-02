// State-Truth Pass — pure core (no I/O).
//
// Pattern 2 of the Supergoal Execution Ladder: before building further on prior
// autonomous work, verify what ACTUALLY exists (branch / main / sandbox / prod)
// and reconcile it against the ledger's claimed Execution-Ladder stage. Any item
// whose ledger stage is ahead of its verified stage is downgraded.
//
// See docs/orchestration/supergoal-execution-ladder.md.

import { EXECUTION_STAGES, stageRank, isKnownStage } from "./supergoal-execution-ladder-core.mjs";

export const STATE_TRUTH_PASS_VERSION = "state-truth-pass/v0";

// Map observable signals to the highest verified stage. Conservative: a stage is
// only "verified" when its concrete signal is present. Missing signal => the item
// has not truly reached that stage regardless of what a report claimed.
//
// signals: {
//   spec_ready, contract_pass, runtime_ready, worker_reported, cao_pass,
//   controller_auto_go, sandbox_verified, integrated_main, deployed_prod, done
// }  (all booleans)
export function verifiedStageFromSignals(signals = {}) {
  const order = [
    ["done", "DONE"],
    ["deployed_prod", "DEPLOYED_PROD"],
    ["integrated_main", "INTEGRATED_MAIN"],
    ["sandbox_verified", "SANDBOX_VERIFIED"],
    ["controller_auto_go", "CONTROLLER_AUTO_GO"],
    ["cao_pass", "CAO_PASS_HG2"],
    ["worker_reported", "WORKER_REPORTED"],
    ["runtime_ready", "RUNTIME_READY_PASS"],
    ["contract_pass", "CONTRACT_PASS"],
    ["spec_ready", "SPEC_READY"],
  ];
  for (const [key, stage] of order) {
    if (signals[key]) return stage;
  }
  return null;
}

// Reconcile a single item's claimed stage vs verified signals.
// Returns { ref, claimed_stage, verified_stage, drift, downgrade, reason }.
export function reconcileItem({ ref, claimed_stage, signals = {} } = {}) {
  const verified = verifiedStageFromSignals(signals);
  const claimedKnown = isKnownStage(claimed_stage);
  if (!verified) {
    return {
      ref,
      claimed_stage: claimed_stage ?? null,
      verified_stage: null,
      drift: claimedKnown,
      downgrade: claimedKnown,
      reason: claimedKnown
        ? "state-truth.no-signals-but-stage-claimed"
        : "state-truth.no-signals-no-claim",
    };
  }
  if (!claimedKnown) {
    return {
      ref,
      claimed_stage: claimed_stage ?? null,
      verified_stage: verified,
      drift: false,
      downgrade: false,
      reason: "state-truth.verified-no-prior-claim",
    };
  }
  const ahead = stageRank(claimed_stage) > stageRank(verified);
  return {
    ref,
    claimed_stage,
    verified_stage: verified,
    drift: stageRank(claimed_stage) !== stageRank(verified),
    downgrade: ahead,
    reason: ahead
      ? "state-truth.ledger-ahead-of-reality-downgraded"
      : stageRank(claimed_stage) < stageRank(verified)
        ? "state-truth.reality-ahead-of-ledger"
        : "state-truth.ledger-matches-reality",
  };
}

export function summarizeStateTruth(reconciliations = []) {
  const summary = {
    total: reconciliations.length,
    matches: 0,
    downgrades: 0,
    drift: 0,
    ahead_of_ledger: 0,
  };
  for (const r of reconciliations) {
    if (r.downgrade) summary.downgrades += 1;
    if (r.drift) summary.drift += 1;
    if (r.reason === "state-truth.ledger-matches-reality") summary.matches += 1;
    if (r.reason === "state-truth.reality-ahead-of-ledger") summary.ahead_of_ledger += 1;
  }
  return summary;
}

// Helper for callers: are there any downgrades that should block further building?
export function hasBlockingDrift(reconciliations = []) {
  return reconciliations.some((r) => r.downgrade);
}

export { EXECUTION_STAGES };
