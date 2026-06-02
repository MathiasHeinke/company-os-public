import assert from "node:assert/strict";
import test from "node:test";

import { buildApprovedActionPlan, parseArgs } from "./atlas-506-approved-action-plan.mjs";

function passingPreflight() {
  return {
    ok: true,
    failed: [],
    warnings: [],
  };
}

function passingDecision() {
  return {
    ok: true,
    errors: [],
    warnings: [],
    allowed_commands: [
      {
        decision: "APPROVE_DESCRIPTION_PATCH_QUEUE",
        kind: "description-patch-apply",
        command: "node scripts/plane/atlas-description-patch-queue.mjs --ref [WORK_ITEM_ID] --apply --confirm-human-gate --json",
      },
      {
        decision: "STAGE_0506_POST",
        kind: "stage-post",
        sequence: "[WORK_ITEM_ID]",
        command: "node scripts/orchestration/scheduler-stage-0506.mjs --sequence [WORK_ITEM_ID] --mode post --json",
      },
      {
        decision: "APPROVE_ATLAS_576_SPLIT_MATERIALIZATION",
        kind: "split-materialization-plan-check",
        command: "node scripts/plane/atlas-576-split-materialization-plan.mjs --json",
        note: "Create children from JSON payloads only after this plan check; this intake does not create Plane items.",
      },
    ],
  };
}

test("parseArgs captures decision and artifact overrides", () => {
  const args = parseArgs([
    "--decision-file",
    "decision.yaml",
    "--queue-file",
    "queue.json",
    "--gate-register-file",
    "gate.json",
    "--split-plan-file",
    "split.json",
    "--json",
  ]);

  assert.equal(args.decisionFile, "decision.yaml");
  assert.equal(args.queueFile, "queue.json");
  assert.equal(args.gateRegisterFile, "gate.json");
  assert.equal(args.splitPlanFile, "split.json");
  assert.equal(args.json, true);
});

test("buildApprovedActionPlan emits deterministic runbook for valid inputs", () => {
  const result = buildApprovedActionPlan({
    preflight: passingPreflight(),
    decision: passingDecision(),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.runbook.map((step) => step.kind), [
    "readiness-preflight",
    "description-patch-apply",
    "stage-post",
    "split-materialization-plan-check",
    "split-materialization-authority-boundary",
    "post-hg-verification",
  ]);
  assert.deepEqual(result.runbook.map((step) => step.step), [1, 2, 3, 4, 5, 6]);
  assert.match(result.runbook[1].command, /--confirm-human-gate/);
  assert.match(result.runbook[4].command, /atlas-576-split-materialization-apply\.mjs/);
  assert.match(result.runbook[4].command, /--confirm-human-gate/);
  assert.match(result.runbook[5].command, /atlas-506-post-hg-verification\.mjs/);
  assert.match(result.runbook[5].command, /--ref [WORK_ITEM_ID]/);
  assert.match(result.runbook[5].command, /--verify-split-children/);
  assert.equal(result.hard_boundaries.includes("no_child_creation_by_this_tool"), true);
});

test("buildApprovedActionPlan blocks commands when preflight fails", () => {
  const result = buildApprovedActionPlan({
    preflight: {
      ok: false,
      failed: [{ id: "queue.patchable_items" }],
    },
    decision: passingDecision(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.preflight_ok, false);
  assert.deepEqual(result.runbook, []);
  assert.match(result.errors.join("\n"), /queue\.patchable_items/);
});

test("buildApprovedActionPlan blocks commands when decision intake fails", () => {
  const result = buildApprovedActionPlan({
    preflight: passingPreflight(),
    decision: {
      ok: false,
      errors: ["unknown decision: APPROVE_ALL"],
      allowed_commands: [],
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.decision_ok, false);
  assert.deepEqual(result.runbook, []);
  assert.match(result.errors.join("\n"), /APPROVE_ALL/);
});
