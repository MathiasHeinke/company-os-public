import test from "node:test";
import assert from "node:assert/strict";

import {
  verifiedStageFromSignals,
  reconcileItem,
  summarizeStateTruth,
  hasBlockingDrift,
} from "./state-truth-pass-core.mjs";

test("verifiedStageFromSignals returns the highest present signal", () => {
  assert.equal(verifiedStageFromSignals({ worker_reported: true, contract_pass: true }), "WORKER_REPORTED");
  assert.equal(verifiedStageFromSignals({ integrated_main: true, worker_reported: true }), "INTEGRATED_MAIN");
  assert.equal(verifiedStageFromSignals({}), null);
  assert.equal(verifiedStageFromSignals({ spec_ready: true }), "SPEC_READY");
});

test("reconcileItem downgrades when ledger claims more than reality", () => {
  const r = reconcileItem({ ref: "COMPA-X", claimed_stage: "INTEGRATED_MAIN", signals: { worker_reported: true } });
  assert.equal(r.verified_stage, "WORKER_REPORTED");
  assert.equal(r.downgrade, true);
  assert.equal(r.drift, true);
  assert.equal(r.reason, "state-truth.ledger-ahead-of-reality-downgraded");
});

test("reconcileItem matches when ledger equals reality", () => {
  const r = reconcileItem({ ref: "[WORK_ITEM_ID]", claimed_stage: "WORKER_REPORTED", signals: { worker_reported: true } });
  assert.equal(r.downgrade, false);
  assert.equal(r.drift, false);
  assert.equal(r.reason, "state-truth.ledger-matches-reality");
});

test("reconcileItem flags claim with no signals as downgrade", () => {
  const r = reconcileItem({ ref: "COMPA-Y", claimed_stage: "CONTROLLER_AUTO_GO", signals: {} });
  assert.equal(r.verified_stage, null);
  assert.equal(r.downgrade, true);
  assert.equal(r.reason, "state-truth.no-signals-but-stage-claimed");
});

test("reconcileItem notes reality ahead of ledger (no downgrade)", () => {
  const r = reconcileItem({ ref: "COMPA-Z", claimed_stage: "WORKER_REPORTED", signals: { worker_reported: true, cao_pass: true } });
  assert.equal(r.verified_stage, "CAO_PASS_HG2");
  assert.equal(r.downgrade, false);
  assert.equal(r.reason, "state-truth.reality-ahead-of-ledger");
});

test("summarize + hasBlockingDrift aggregate correctly", () => {
  const recon = [
    reconcileItem({ ref: "a", claimed_stage: "INTEGRATED_MAIN", signals: { worker_reported: true } }),
    reconcileItem({ ref: "b", claimed_stage: "WORKER_REPORTED", signals: { worker_reported: true } }),
    reconcileItem({ ref: "c", claimed_stage: "DEPLOYED_PROD", signals: {} }),
  ];
  const s = summarizeStateTruth(recon);
  assert.equal(s.total, 3);
  assert.equal(s.downgrades, 2);
  assert.equal(s.matches, 1);
  assert.equal(hasBlockingDrift(recon), true);
  assert.equal(hasBlockingDrift([recon[1]]), false);
});
