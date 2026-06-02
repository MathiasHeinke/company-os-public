import assert from "node:assert/strict";
import test from "node:test";

import {
  FAST_LANE_RINGS,
  FAST_LANE_RING_POLICY,
  FAST_LANE_VERSION,
  classifyFastLaneRing,
  evaluateFastLaneEligibility,
  evaluateFastLaneRequest,
} from "./fast-lane-classifier-core.mjs";

function fullGuardrails(overrides = {}) {
  return {
    contract: {
      RoleLabel: "role:cto",
      CapabilityProfile: "claude-clevel-worker/cto/runtime",
      Workspace: "registry:company-os",
      MaxRuntime: "20m",
      MaxTurns: 120,
      Heartbeat: "10s",
      KillSwitch: "Plane comment KILL",
      Reporting: ["Plane worker.reported", "report file"],
      AllowedWritePaths: ["scripts/release-gates/fast-lane-classifier-core.mjs"],
    },
    has_runtime_stream: true,
    heartbeat_active: true,
    scope_guard: "kill",
    cao_in_loop: true,
    controller_in_loop: true,
    rollback_trivial: true,
    ...overrides,
  };
}

test("FAST_LANE_RINGS lists R0..R4 and policy table is complete", () => {
  assert.deepEqual(FAST_LANE_RINGS, ["R0", "R1", "R2", "R3", "R4"]);
  for (const ring of FAST_LANE_RINGS) {
    assert.ok(FAST_LANE_RING_POLICY[ring], `policy entry missing for ${ring}`);
    assert.equal(typeof FAST_LANE_RING_POLICY[ring].name, "string");
    assert.equal(typeof FAST_LANE_RING_POLICY[ring].policy, "string");
  }
  assert.equal(FAST_LANE_RING_POLICY.R0.fast_lane_default, true);
  assert.equal(FAST_LANE_RING_POLICY.R3.fast_lane_default, false);
  assert.equal(FAST_LANE_RING_POLICY.R4.fast_lane_default, false);
});

test("classifyFastLaneRing returns R0 for read-only audit work", () => {
  const result = classifyFastLaneRing({
    requested_actions: ["audit Plane comments", "scan reports"],
    read_only: true,
  });
  assert.equal(result.ring, "R0");
  assert.ok(result.reasons.some((line) => line.startsWith("R0")));
});

test("classifyFastLaneRing returns R0 when no actions or paths are declared", () => {
  const result = classifyFastLaneRing({});
  assert.equal(result.ring, "R0");
});

test("classifyFastLaneRing returns R1 when every touched path is docs/contracts/reports", () => {
  const result = classifyFastLaneRing({
    requested_actions: ["update doctrine", "regenerate page index"],
    paths_touched: [
      "docs/governance/fast-lane-flight-doctrine.md",
      "docs/page-index.md",
      "reports/runs/2026-05-10/fast-lane-classifier-pilot.md",
    ],
  });
  assert.equal(result.ring, "R1");
  assert.equal(result.matched.r1_paths.length, 3);
});

test("classifyFastLaneRing returns R2 for low-risk script + test edits", () => {
  const result = classifyFastLaneRing({
    requested_actions: ["add fast-lane classifier helper", "add unit tests"],
    paths_touched: [
      "scripts/release-gates/fast-lane-classifier-core.mjs",
      "scripts/release-gates/fast-lane-classifier-core.test.mjs",
    ],
  });
  assert.equal(result.ring, "R2");
  assert.equal(result.matched.r2_paths.length, 2);
});

test("classifyFastLaneRing accepts snake_case allowed_write_paths input", () => {
  const result = classifyFastLaneRing({
    requested_actions: ["add fast-lane classifier helper"],
    allowed_write_paths: ["scripts/release-gates/fast-lane-classifier-core.mjs"],
  });
  assert.equal(result.ring, "R2");
});

test("classifyFastLaneRing returns R3 for release-style actions", () => {
  const result = classifyFastLaneRing({
    requested_actions: ["merge sandbox branch", "deploy canary"],
  });
  assert.equal(result.ring, "R3");
  assert.deepEqual(result.matched.r3_actions, ["merge sandbox branch", "deploy canary"]);
});

test("classifyFastLaneRing returns R3 when paths touch runtime dispatcher / Plane / Linear internals", () => {
  const result = classifyFastLaneRing({
    requested_actions: ["update dispatcher heartbeat"],
    paths_touched: [
      "scripts/runtime/automation-runtime-core.mjs",
      "scripts/plane/plane-work-item-state.mjs",
      "scripts/linear/headless-linear.mjs",
    ],
  });
  assert.equal(result.ring, "R3");
  assert.equal(result.matched.r3_internal_paths.length, 3);
});

test("classifyFastLaneRing returns R4 for founder-only / production / regulated actions", () => {
  const founderOnly = classifyFastLaneRing({
    requested_actions: ["schema migration", "live outreach in founder name", "pricing change"],
  });
  assert.equal(founderOnly.ring, "R4");
  assert.ok(founderOnly.matched.r4_actions.length >= 1);

  const productionRegulated = classifyFastLaneRing({
    requested_actions: ["payments processing change", "irreversible mass deletion"],
  });
  assert.equal(productionRegulated.ring, "R4");
  assert.ok(productionRegulated.matched.r4_actions.includes("payments processing change"));
  assert.ok(productionRegulated.matched.r4_actions.includes("irreversible mass deletion"));
});

test("classifyFastLaneRing prefers R4 over R3 when both match", () => {
  const result = classifyFastLaneRing({
    requested_actions: ["deploy canary", "schema migration"],
  });
  assert.equal(result.ring, "R4");
});

test("classifyFastLaneRing prefers R3 over R2 when an internal path is touched alongside scripts", () => {
  const result = classifyFastLaneRing({
    requested_actions: ["edit dispatcher and helper"],
    paths_touched: [
      "scripts/runtime/automation-runtime-core.mjs",
      "scripts/release-gates/fast-lane-classifier-core.mjs",
    ],
  });
  assert.equal(result.ring, "R3");
  assert.equal(result.matched.r3_internal_paths.length, 1);
});

test("classifyFastLaneRing falls back to R3 for unrecognized paths", () => {
  const result = classifyFastLaneRing({
    requested_actions: ["edit something"],
    paths_touched: ["unknown/area/file.txt"],
  });
  assert.equal(result.ring, "R3");
});

test("evaluateFastLaneEligibility passes for R2 with full guardrails", () => {
  const eligibility = evaluateFastLaneEligibility(fullGuardrails(), "R2");
  assert.equal(eligibility.eligible, true);
  assert.equal(eligibility.blocker_count, 0);
});

test("evaluateFastLaneEligibility rejects R2 when scope guard is not kill", () => {
  const eligibility = evaluateFastLaneEligibility(
    fullGuardrails({ scope_guard: "warn" }),
    "R2",
  );
  assert.equal(eligibility.eligible, false);
  assert.ok(eligibility.blockers.some((item) => item.id === "scope_guard.kill"));
});

test("evaluateFastLaneEligibility rejects when CAO or controller is missing", () => {
  const eligibility = evaluateFastLaneEligibility(
    fullGuardrails({ cao_in_loop: false, controller_in_loop: false }),
    "R2",
  );
  assert.equal(eligibility.eligible, false);
  assert.ok(eligibility.blockers.some((item) => item.id === "loop.cao"));
  assert.ok(eligibility.blockers.some((item) => item.id === "loop.controller"));
});

test("evaluateFastLaneEligibility rejects R3 (not a fast-lane ring)", () => {
  const eligibility = evaluateFastLaneEligibility(fullGuardrails(), "R3");
  assert.equal(eligibility.eligible, false);
  assert.ok(eligibility.blockers.some((item) => item.id === "ring.not_fast_lane"));
});

test("evaluateFastLaneEligibility rejects R2 when an Always-Fly contract field is missing", () => {
  const guardrails = fullGuardrails();
  delete guardrails.contract.Heartbeat;
  const eligibility = evaluateFastLaneEligibility(guardrails, "R2");
  assert.equal(eligibility.eligible, false);
  assert.ok(eligibility.blockers.some((item) => item.id === "contract.Heartbeat"));
});

test("evaluateFastLaneEligibility accepts parser-normalized lowercase contract fields", () => {
  const guardrails = fullGuardrails({
    contract: {
      rolelabel: "role:cto",
      capabilityprofile: "claude-clevel-worker/cto/runtime",
      workspace: "registry:company-os",
      maxruntime: "20m",
      maxturns: 120,
      heartbeat: "10s",
      killswitch: "Plane comment KILL",
      reporting: ["Plane worker.reported", "report file"],
      allowedwritepaths: ["scripts/release-gates/fast-lane-classifier-core.mjs"],
    },
  });
  const eligibility = evaluateFastLaneEligibility(guardrails, "R2");
  assert.equal(eligibility.eligible, true);
  assert.equal(eligibility.blocker_count, 0);
});

test("evaluateFastLaneRequest sets always_fly=true for R2 with full guardrails", () => {
  const request = evaluateFastLaneRequest({
    requested_actions: ["add fast-lane classifier helper", "add unit tests"],
    paths_touched: [
      "scripts/release-gates/fast-lane-classifier-core.mjs",
      "scripts/release-gates/fast-lane-classifier-core.test.mjs",
    ],
    ...fullGuardrails(),
  });
  assert.equal(request.schema_version, FAST_LANE_VERSION);
  assert.equal(request.ring, "R2");
  assert.equal(request.fast_lane_eligible, true);
  assert.equal(request.always_fly, true);
  assert.deepEqual(request.non_delegable_actions, []);
});

test("evaluateFastLaneRequest sets always_fly=false for R0 even with full guardrails", () => {
  const request = evaluateFastLaneRequest({
    read_only: true,
    requested_actions: ["audit Plane locks"],
    ...fullGuardrails(),
  });
  assert.equal(request.ring, "R0");
  assert.equal(request.fast_lane_eligible, true);
  assert.equal(request.always_fly, false);
});

test("evaluateFastLaneRequest blocks R4 even when guardrails would otherwise pass", () => {
  const request = evaluateFastLaneRequest({
    requested_actions: ["pricing change", "schema migration"],
    ...fullGuardrails(),
  });
  assert.equal(request.ring, "R4");
  assert.equal(request.fast_lane_eligible, false);
  assert.equal(request.always_fly, false);
  assert.ok(request.non_delegable_actions.length > 0);
});
