import test from "node:test";
import assert from "node:assert/strict";

import {
  EXECUTION_STAGES,
  STAGE_INDEX,
  WORKER_STAGE_CEILING,
  KNOWN_TARGET_CLASSES,
  canSeatSetStage,
  isWithinWorkerCeiling,
  evaluateDoneEligibility,
  evaluateStageTransition,
  controllerAutoGoImpliesIntegration,
  stageRank,
} from "./supergoal-execution-ladder-core.mjs";

test("execution stages are the canonical 10 in order", () => {
  assert.equal(EXECUTION_STAGES.length, 10);
  assert.equal(EXECUTION_STAGES[0], "SPEC_READY");
  assert.equal(EXECUTION_STAGES[4], "CAO_PASS_HG2");
  assert.equal(EXECUTION_STAGES[7], "INTEGRATED_MAIN");
  assert.equal(EXECUTION_STAGES[8], "DEPLOYED_PROD");
  assert.equal(EXECUTION_STAGES[9], "DONE");
  assert.equal(STAGE_INDEX.CAO_PASS_HG2, 5);
});

test("worker ceiling is CAO_PASS_HG2 and nothing above", () => {
  assert.equal(WORKER_STAGE_CEILING, "CAO_PASS_HG2");
  assert.ok(isWithinWorkerCeiling("WORKER_REPORTED"));
  assert.ok(isWithinWorkerCeiling("CAO_PASS_HG2"));
  assert.equal(isWithinWorkerCeiling("CONTROLLER_AUTO_GO"), false);
  assert.equal(isWithinWorkerCeiling("INTEGRATED_MAIN"), false);
  assert.equal(isWithinWorkerCeiling("DEPLOYED_PROD"), false);
});

test("INTEGRATED_MAIN authority is Codex/CEO only", () => {
  assert.ok(canSeatSetStage("codex", "INTEGRATED_MAIN"));
  assert.ok(canSeatSetStage("ceo", "INTEGRATED_MAIN"));
  assert.equal(canSeatSetStage("worker", "INTEGRATED_MAIN"), false);
  assert.equal(canSeatSetStage("cao", "INTEGRATED_MAIN"), false);
});

test("DEPLOYED_PROD authority is Codex/Founder/Release-Gate only", () => {
  assert.ok(canSeatSetStage("codex", "DEPLOYED_PROD"));
  assert.ok(canSeatSetStage("founder", "DEPLOYED_PROD"));
  assert.ok(canSeatSetStage("release-gate", "DEPLOYED_PROD"));
  assert.equal(canSeatSetStage("worker", "DEPLOYED_PROD"), false);
  assert.equal(canSeatSetStage("ceo", "DEPLOYED_PROD"), false);
});

test("worker may set up to CAO_PASS_HG2 only via WORKER_REPORTED", () => {
  assert.ok(canSeatSetStage("worker", "WORKER_REPORTED"));
  // worker is not the CAO; CAO_PASS_HG2 is set by cao seat
  assert.equal(canSeatSetStage("worker", "CAO_PASS_HG2"), false);
  assert.ok(canSeatSetStage("cao", "CAO_PASS_HG2"));
});

test("DONE eligibility maps to target class stage", () => {
  // report-only: done-eligible at CONTROLLER_AUTO_GO
  assert.equal(evaluateDoneEligibility({ targetClass: "report-only", currentStage: "CONTROLLER_AUTO_GO" }).eligible, true);
  assert.equal(evaluateDoneEligibility({ targetClass: "report-only", currentStage: "CAO_PASS_HG2" }).eligible, false);
  // main-integrated: only at INTEGRATED_MAIN
  assert.equal(evaluateDoneEligibility({ targetClass: "main-integrated", currentStage: "CONTROLLER_AUTO_GO" }).eligible, false);
  assert.equal(evaluateDoneEligibility({ targetClass: "main-integrated", currentStage: "INTEGRATED_MAIN" }).eligible, true);
  // production-deployed: only at DEPLOYED_PROD
  assert.equal(evaluateDoneEligibility({ targetClass: "production-deployed", currentStage: "INTEGRATED_MAIN" }).eligible, false);
  assert.equal(evaluateDoneEligibility({ targetClass: "production-deployed", currentStage: "DEPLOYED_PROD" }).eligible, true);
});

test("DONE eligibility rejects unknown target class and stage", () => {
  assert.equal(evaluateDoneEligibility({ targetClass: "whatever", currentStage: "DONE" }).reason, "execution-ladder.unknown-target-class");
  assert.equal(evaluateDoneEligibility({ targetClass: "report-only", currentStage: "NOPE" }).reason, "execution-ladder.unknown-current-stage");
});

test("controller AUTO-GO never implies integration (anti-fake-autonomy)", () => {
  assert.equal(controllerAutoGoImpliesIntegration(), false);
});

test("stage transition: forward-only, seat-authorized, worker ceiling enforced", () => {
  assert.equal(evaluateStageTransition({ seat: "cao", fromStage: "WORKER_REPORTED", toStage: "CAO_PASS_HG2" }).ok, true);
  // backward rejected
  assert.equal(evaluateStageTransition({ seat: "codex", fromStage: "INTEGRATED_MAIN", toStage: "SANDBOX_VERIFIED" }).reason, "execution-ladder.no-backward-transition");
  // worker exceeding ceiling rejected
  assert.equal(evaluateStageTransition({ seat: "worker", toStage: "INTEGRATED_MAIN" }).reason, "execution-ladder.worker-exceeds-ceiling");
  // unauthorized seat rejected
  assert.equal(evaluateStageTransition({ seat: "cao", toStage: "DEPLOYED_PROD" }).reason, "execution-ladder.seat-not-authorized-for-stage");
});

test("known target classes are the three canonical", () => {
  assert.deepEqual([...KNOWN_TARGET_CLASSES].sort(), ["main-integrated", "production-deployed", "report-only"]);
});

test("stageRank orders integration above worker stages", () => {
  assert.ok(stageRank("INTEGRATED_MAIN") > stageRank("CAO_PASS_HG2"));
  assert.ok(stageRank("DEPLOYED_PROD") > stageRank("INTEGRATED_MAIN"));
});
