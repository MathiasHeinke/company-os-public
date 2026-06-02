import assert from "node:assert/strict";
import test from "node:test";

import { buildGoalLoopPilot } from "./goal-loop-core.mjs";

test("buildGoalLoopPilot stops at selection when no child is ready", () => {
  const loop = buildGoalLoopPilot({
    runPlan: {
      status: "BLOCKED_DEPENDENCY",
      reason_codes: ["contract.dispatch-not-ready"],
      selected: [],
      parent: { ref: "[WORK_ITEM_ID]" },
    },
    projectId: "project-1",
    parentRef: "[WORK_ITEM_ID]",
  });

  assert.equal(loop.version, "goal-loop-pilot/v0");
  assert.equal(loop.status, "BLOCKED_DEPENDENCY");
  assert.equal(loop.stopped_at, "select-child");
  assert.deepEqual(loop.stop_reason_codes, ["contract.dispatch-not-ready"]);
  assert.deepEqual(loop.planned_steps, []);
  assert.equal(loop.event_ledger.would_append, false);
});

test("buildGoalLoopPilot plans the gated chain for one selected child", () => {
  const loop = buildGoalLoopPilot({
    runPlan: {
      status: "READY",
      reason_codes: [],
      selected: [{
        id: "child-1",
        ref: "[WORK_ITEM_ID]",
        name: "Ready child",
        agent: "claude",
      }],
      parent: { ref: "[WORK_ITEM_ID]" },
    },
    workspaceSlug: "companyos",
    projectId: "project-1",
    authMode: "app-token",
    parentRef: "[WORK_ITEM_ID]",
  });

  assert.equal(loop.status, "READY_FOR_MANUAL_PILOT");
  assert.equal(loop.selected_child.ref, "[WORK_ITEM_ID]");
  assert.deepEqual(loop.planned_steps.map((step) => step.step), [
    "stage-0506",
    "dispatcher-v0",
    "goal-adapter",
    "runtime-dispatcher-v1",
    "cao-pass",
    "codex-controller",
  ]);
  assert.match(loop.planned_steps[0].command, /scheduler-stage-0506\.mjs/);
  assert.match(loop.planned_steps[2].command, /goal\.mjs adapt/);
  assert.match(loop.planned_steps[3].command, /--controller off/);
  assert.equal(loop.event_ledger.would_append, true);
});
