import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_POST_WORKER_QUALITY_REGISTRY_PATH,
  QUALITY_LOOP_REASONS,
  loadPostWorkerQualityRegistry,
  planPostWorkerQualityLoop,
} from "./post-worker-quality-loop-core.mjs";

const loaded = loadPostWorkerQualityRegistry(DEFAULT_POST_WORKER_QUALITY_REGISTRY_PATH);

function workerClasses(result) {
  return result.followup_worker_contracts.map((item) => item.worker_class);
}

test("canonical post-worker quality registry validates", () => {
  assert.equal(loaded.ok, true, JSON.stringify(loaded.reason_codes));
  assert.equal(loaded.registry.version, "post-worker-quality-loop/v0");
  assert.equal(loaded.registry.worker_classes.length, 5);
});

test("P0 docs pass remains controller-only and spawns no lower worker", () => {
  const result = planPostWorkerQualityLoop({
    registry: loaded.registry,
    contractFields: { InferenceClass: "P0-doc-small" },
    workerReport: { state: "PASS" },
    caoVerdict: "PASS",
  });

  assert.equal(result.status, "NO_FOLLOWUP");
  assert.equal(result.scheduler.controller_may_spawn_workers, false);
  assert.equal(result.scheduler.scheduler_may_spawn, false);
  assert.deepEqual(workerClasses(result), []);
  assert.ok(result.reason_codes.includes(QUALITY_LOOP_REASONS.CONTROLLER_ONLY));
});

test("P1 bounded code failure gets one bug audit and one hotfix worker", () => {
  const result = planPostWorkerQualityLoop({
    registry: loaded.registry,
    contractFields: { InferenceClass: "P1-code-bounded" },
    workerReport: { state: "PASS" },
    caoVerdict: "REJECT",
    findings: ["S2 bug: unit test regression"],
    previousHotfixRounds: 0,
  });

  assert.equal(result.status, "FOLLOWUP_READY");
  assert.equal(result.scheduler.scheduler_may_spawn, true);
  assert.deepEqual(workerClasses(result), ["bug-regression-auditor", "hotfix-worker"]);
  assert.deepEqual(
    result.markers_to_post.map((item) => `${item.marker}:${item.worker_class}`),
    [
      "controller.audit-followup:controller-only",
      "controller.audit-followup:bug-regression-auditor",
      "controller.hotfix-request:hotfix-worker",
    ],
  );
  assert.ok(result.reason_codes.includes(QUALITY_LOOP_REASONS.HOTFIX_ELIGIBLE));
});

test("P1 bounded code stops auto hotfix after configured round limit", () => {
  const result = planPostWorkerQualityLoop({
    registry: loaded.registry,
    contractFields: { InferenceClass: "P1-code-bounded" },
    workerReport: { state: "RUNTIME_ERROR" },
    caoVerdict: "REJECT",
    findings: ["S2 bug: runtime failed after partial work"],
    previousHotfixRounds: 1,
  });

  assert.equal(result.status, "FOLLOWUP_READY");
  assert.deepEqual(workerClasses(result), ["bug-regression-auditor"]);
  assert.ok(result.reason_codes.includes(QUALITY_LOOP_REASONS.HOTFIX_LIMIT));
});

test("P1 high-severity finding requires human gate instead of autonomous hotfix", () => {
  const result = planPostWorkerQualityLoop({
    registry: loaded.registry,
    contractFields: { InferenceClass: "P1-code-bounded" },
    workerReport: { state: "PASS" },
    caoVerdict: "REJECT",
    findings: ["S1 blocker: possible data-loss regression"],
    previousHotfixRounds: 0,
  });

  assert.equal(result.status, "NEEDS_HUMAN");
  assert.equal(result.scheduler.scheduler_may_spawn, false);
  assert.equal(workerClasses(result).includes("hotfix-worker"), false);
  assert.ok(result.reason_codes.includes(QUALITY_LOOP_REASONS.HUMAN_GATE_REQUIRED));
});

test("P2 shared runtime work receives Codex quality audit and Claude security audit on security signal", () => {
  const result = planPostWorkerQualityLoop({
    registry: loaded.registry,
    contractFields: {
      InferenceClass: "P2-code-shared",
      Scope: "scripts/orchestration/runtime-dispatcher-v1.mjs auth preflight behavior",
    },
    workerReport: { state: "PASS" },
    caoVerdict: "PASS",
    findings: [],
  });

  assert.equal(result.status, "FOLLOWUP_READY");
  assert.equal(result.scheduler.scheduler_may_spawn, true);
  assert.deepEqual(workerClasses(result), ["quality-auditor", "security-auditor"]);
  assert.deepEqual(
    result.markers_to_post.map((item) => `${item.marker}:${item.worker_class}`),
    [
      "controller.audit-followup:quality-auditor",
      "controller.audit-followup:security-auditor",
    ],
  );
  assert.ok(result.reason_codes.includes(QUALITY_LOOP_REASONS.SECURITY_AUDIT_REQUIRED));
});

test("P3 cross-repo work gets deep audit but no autonomous hotfix", () => {
  const result = planPostWorkerQualityLoop({
    registry: loaded.registry,
    contractFields: { InferenceClass: "P3-cross-repo" },
    workerReport: { state: "PASS" },
    caoVerdict: "PASS",
    findings: [],
  });

  assert.equal(result.status, "FOLLOWUP_READY");
  assert.deepEqual(workerClasses(result), ["quality-auditor", "deep-audit-worker"]);
  assert.deepEqual(
    result.markers_to_post.map((item) => `${item.state}:${item.worker_class}`),
    [
      "AUDIT_REQUESTED:quality-auditor",
      "DEEP_AUDIT_REQUESTED:deep-audit-worker",
    ],
  );
  assert.ok(result.reason_codes.includes(QUALITY_LOOP_REASONS.DEEP_AUDIT_REQUIRED));
  assert.equal(result.reason_codes.includes(QUALITY_LOOP_REASONS.HOTFIX_ELIGIBLE), false);
});

test("P4 or HG-3 high-risk surface blocks autonomous spawn and requires human gate", () => {
  const result = planPostWorkerQualityLoop({
    registry: loaded.registry,
    contractFields: {
      InferenceClass: "P4-high-risk",
      HumanGateLevel: "HG-3",
      Scope: "production-write schema/RLS/auth migration",
    },
    workerReport: { state: "REJECT" },
    caoVerdict: "REJECT",
    findings: ["S0 security: service-role credential risk"],
  });

  assert.equal(result.status, "NEEDS_HUMAN");
  assert.equal(result.scheduler.scheduler_may_spawn, false);
  assert.ok(result.reason_codes.includes(QUALITY_LOOP_REASONS.HUMAN_GATE_REQUIRED));
  assert.ok(result.reason_codes.includes(QUALITY_LOOP_REASONS.AUTONOMOUS_SPAWN_BLOCKED));
});

test("unknown inference class fails closed", () => {
  const result = planPostWorkerQualityLoop({
    registry: loaded.registry,
    contractFields: { InferenceClass: "P9-magic" },
    workerReport: { state: "PASS" },
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "BLOCKED");
  assert.deepEqual(result.reason_codes, [QUALITY_LOOP_REASONS.CLASS_UNKNOWN]);
});
