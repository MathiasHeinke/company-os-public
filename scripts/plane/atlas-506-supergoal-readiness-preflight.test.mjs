import assert from "node:assert/strict";
import test from "node:test";

import {
  EXPECTED,
  evaluatePreflight,
  parseArgs,
} from "./atlas-506-supergoal-readiness-preflight.mjs";

function fixture(overrides = {}) {
  return {
    queue: {
      project_id: EXPECTED.projectId,
      parent_ref: EXPECTED.parentRef,
      apply_status: "not_applied",
      patchable_items: EXPECTED.patchableItems.map((ref) => ({ ref })),
      already_parseable_founder_gated: EXPECTED.alreadyParseableFounderGated.map((ref) => ({ ref })),
      excluded_items: [{ ref: "[WORK_ITEM_ID]" }],
      ...(overrides.queue || {}),
    },
    gateRegister: {
      project_id: EXPECTED.projectId,
      parent_ref: EXPECTED.parentRef,
      planner_status: "BLOCKED_DEPENDENCY",
      gate_classes: {
        description_patch_approval_required: [],
        already_parseable_but_founder_gated: [],
        split_required_before_materialization: [],
      },
      ...(overrides.gateRegister || {}),
    },
    splitPlan: {
      ok: true,
      project_id: EXPECTED.projectId,
      parent_id: EXPECTED.atlas576ParentId,
      planned: EXPECTED.splitExternalIds.map((external_id, index) => ({
        slug: index === 0 ? "g6" : "g7",
        payload: { external_id },
        validation_ok: true,
        payload_is_authoritative: true,
      })),
      ...(overrides.splitPlan || {}),
    },
  };
}

test("parseArgs defaults to canonical artifact paths", () => {
  const args = parseArgs(["--json"]);

  assert.match(args.queueFile, /[WORK_ITEM_ID]-patch-queue/);
  assert.match(args.gateRegisterFile, /[WORK_ITEM_ID]-gate-register/);
  assert.match(args.splitPlanFile, /[WORK_ITEM_ID]-materialization-plan/);
  assert.equal(args.json, true);
});

test("evaluatePreflight passes for the canonical fixture", () => {
  const result = evaluatePreflight(fixture());

  assert.equal(result.ok, true);
  assert.equal(result.failed.length, 0);
  assert.equal(result.readiness.description_patch_queue_ready_for_hg_decision, true);
  assert.equal(result.readiness.atlas_576_split_ready_for_hg_decision, true);
  assert.equal(result.hard_boundaries.includes("no_plane_write"), true);
});

test("evaluatePreflight fails when queue contains a broad or drifted set", () => {
  const result = evaluatePreflight(fixture({
    queue: {
      patchable_items: [{ ref: "[WORK_ITEM_ID]" }],
    },
  }));

  assert.equal(result.ok, false);
  assert.equal(result.failed.some((row) => row.id === "queue.patchable_items"), true);
  assert.equal(result.readiness.description_patch_queue_ready_for_hg_decision, false);
});

test("evaluatePreflight fails when split payloads lose parent linkage", () => {
  const result = evaluatePreflight(fixture({
    splitPlan: {
      parent_id: "wrong-parent",
    },
  }));

  assert.equal(result.ok, false);
  assert.equal(result.failed.some((row) => row.id === "split_plan.parent"), true);
  assert.equal(result.readiness.atlas_576_split_ready_for_hg_decision, false);
});
