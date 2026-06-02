import test from "node:test";
import assert from "node:assert/strict";

import {
  parseConfidence,
  validateWorkerConfidence,
  confidenceMeetsGate,
  calibrationFromHistory,
  recommendAutonomyAdjustment,
  HG_CONFIDENCE_THRESHOLDS,
  OUTCOME_SCORE,
  CONFIDENCE_CONTRACT_VERSION,
} from "./confidence-calibration-core.mjs";

test("parseConfidence accepts numbers and numeric strings in [0,1]", () => {
  assert.equal(parseConfidence(0.93), 0.93);
  assert.equal(parseConfidence("0.5"), 0.5);
  assert.equal(parseConfidence(0), 0);
  assert.equal(parseConfidence(1), 1);
});

test("parseConfidence rejects absent, non-numeric, and out-of-range", () => {
  assert.equal(parseConfidence(null), null);
  assert.equal(parseConfidence(""), null);
  assert.equal(parseConfidence("high"), null);
  assert.equal(parseConfidence(1.2), null);
  assert.equal(parseConfidence(-0.1), null);
});

test("validateWorkerConfidence requires a parseable value AND a basis", () => {
  assert.deepEqual(validateWorkerConfidence({ confidence: 0.93, basis: "tests 78/78, diff clean" }), {
    ok: true,
    reason: "confidence.ok",
    confidence: 0.93,
  });
  assert.equal(validateWorkerConfidence({ confidence: undefined, basis: "x" }).reason, "confidence.missing");
  assert.equal(validateWorkerConfidence({ confidence: 1.5, basis: "x" }).reason, "confidence.out-of-range");
  assert.equal(validateWorkerConfidence({ confidence: 0.9, basis: "" }).reason, "confidence.basis-missing");
  assert.equal(validateWorkerConfidence({ confidence: 0.9, basis: "   " }).reason, "confidence.basis-missing");
});

test("confidenceMeetsGate uses the canonical HG thresholds", () => {
  assert.equal(HG_CONFIDENCE_THRESHOLDS["HG-2.5"], 0.92);
  assert.equal(HG_CONFIDENCE_THRESHOLDS["HG-3"], 0.96);
  assert.equal(confidenceMeetsGate(0.92, "HG-2.5"), true);
  assert.equal(confidenceMeetsGate(0.919, "HG-2.5"), false);
  assert.equal(confidenceMeetsGate(0.96, "HG-3"), true);
  assert.equal(confidenceMeetsGate(0.95, "HG-3"), false);
});

test("confidenceMeetsGate is conservative for unknown level or bad confidence", () => {
  assert.equal(confidenceMeetsGate(0.99, "HG-banana"), false);
  assert.equal(confidenceMeetsGate("nope", "HG-2.5"), false);
});

test("calibrationFromHistory needs minRuns before judging", () => {
  const r = calibrationFromHistory([{ claimed: 0.9, outcome: "PASS" }], { minRuns: 5 });
  assert.equal(r.verdict, "insufficient-data");
  assert.equal(r.n, 1);
});

test("calibrationFromHistory flags OVER-confidence (the founder's key case)", () => {
  // Worker repeatedly claims ~0.95 but CAO/CEO mostly REJECTs/PARKs.
  const history = [
    { claimed: 0.95, outcome: "REJECT" },
    { claimed: 0.96, outcome: "REJECT" },
    { claimed: 0.94, outcome: "PARK" },
    { claimed: 0.97, outcome: "REJECT" },
    { claimed: 0.95, outcome: "PARK" },
  ];
  const r = calibrationFromHistory(history);
  assert.equal(r.verdict, "over-confident");
  assert.ok(r.gap > 0.15, `gap ${r.gap}`);
  const rec = recommendAutonomyAdjustment(r);
  assert.equal(rec.action, "raise-bar");
});

test("calibrationFromHistory recognizes well-calibrated and under-confident", () => {
  const wellCal = calibrationFromHistory([
    { claimed: 0.9, outcome: "PASS" },
    { claimed: 0.5, outcome: "PARK" },
    { claimed: 0.1, outcome: "REJECT" },
    { claimed: 0.95, outcome: "PASS" },
    { claimed: 0.5, outcome: "PARK" },
  ]);
  assert.equal(wellCal.verdict, "well-calibrated");
  assert.equal(recommendAutonomyAdjustment(wellCal).action, "hold");

  const under = calibrationFromHistory([
    { claimed: 0.4, outcome: "PASS" },
    { claimed: 0.5, outcome: "PASS" },
    { claimed: 0.45, outcome: "PASS" },
    { claimed: 0.5, outcome: "PASS" },
    { claimed: 0.4, outcome: "PASS" },
  ]);
  assert.equal(under.verdict, "under-confident");
  assert.equal(recommendAutonomyAdjustment(under).action, "widen-eligible");
});

test("calibrationFromHistory ignores invalid records", () => {
  const r = calibrationFromHistory([
    { claimed: 0.9, outcome: "PASS" },
    { claimed: 2.0, outcome: "PASS" }, // out of range -> dropped
    { claimed: 0.8, outcome: "MAYBE" }, // bad outcome -> dropped
    { claimed: 0.85, outcome: "PASS" },
  ], { minRuns: 2 });
  assert.equal(r.n, 2);
  assert.equal(OUTCOME_SCORE.PARK, 0.5);
});

test("insufficient-data recommendation holds", () => {
  assert.equal(recommendAutonomyAdjustment({ verdict: "insufficient-data" }).action, "hold");
  assert.equal(CONFIDENCE_CONTRACT_VERSION, "confidence-reporting-contract/v0");
});
