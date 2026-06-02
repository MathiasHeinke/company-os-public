import assert from "node:assert/strict";
import test from "node:test";

import { loadPostWorkerQualityRegistry } from "./post-worker-quality-loop-core.mjs";
import {
  QUALITY_SCHEDULER_REASONS,
  buildLowerWorkerDispatchFromMarker,
  latestQualityMarker,
  parseQualityMarkerFields,
} from "./post-worker-quality-scheduler-core.mjs";
import { validateContract } from "./worker-ledger-validator.mjs";

const loaded = loadPostWorkerQualityRegistry();
const workspaceRoot = "[LOCAL_WORKSPACE]";

function comment(id, body, createdAt = "2026-05-27T10:00:00.000Z") {
  return { id, body, created_at: createdAt };
}

const parentFields = {
  role: "role:cto",
  parent_seat: "role:cto",
  workspace: "registry:company-os",
  source_of_truth: [
    "[LOCAL_WORKSPACE]",
  ],
  allowedwritepaths: [
    "[LOCAL_WORKSPACE]",
  ],
};

test("parseQualityMarkerFields reads scalar and list fields", () => {
  const fields = parseQualityMarkerFields([
    "controller.hotfix-request:",
    "  version: post-worker-quality-loop/v0",
    "  worker_class: hotfix-worker",
    "  allowed_write_paths:",
    "    - /tmp/a.mjs",
    "    - /tmp/b.mjs",
  ].join("\n"), "controller.hotfix-request");

  assert.equal(fields.version, "post-worker-quality-loop/v0");
  assert.equal(fields.worker_class, "hotfix-worker");
  assert.deepEqual(fields.allowed_write_paths, ["/tmp/a.mjs", "/tmp/b.mjs"]);
});

test("latestQualityMarker selects newest quality marker", () => {
  const latest = latestQualityMarker([
    comment("a", "controller.audit-followup:\n  worker_class: quality-auditor", "2026-05-27T10:00:00.000Z"),
    comment("b", "controller.hotfix-request:\n  worker_class: hotfix-worker", "2026-05-27T10:05:00.000Z"),
  ]);

  assert.equal(latest.comment_id, "b");
  assert.equal(latest.marker, "controller.hotfix-request");
});

test("controller-only audit marker does not spawn lower worker", () => {
  const result = buildLowerWorkerDispatchFromMarker({
    registry: loaded.registry,
    comments: [comment("marker-1", "controller.audit-followup:\n  state: CONTROLLER_RERUN_GATES\n  worker_class: controller-only")],
    parentContractFields: parentFields,
    workspaceRoot,
  });

  assert.equal(result.status, "NO_SPAWN");
  assert.deepEqual(result.reason_codes, [QUALITY_SCHEDULER_REASONS.CONTROLLER_ONLY]);
});

test("hotfix marker becomes a valid ready lower-worker contract", () => {
  const result = buildLowerWorkerDispatchFromMarker({
    registry: loaded.registry,
    comments: [comment("marker-1", [
      "controller.hotfix-request:",
      "  state: HOTFIX_REQUESTED",
      "  worker_class: hotfix-worker",
      "  max_auto_hotfix_rounds: 1",
      "  previous_hotfix_rounds: 0",
      "  allowed_write_paths:",
      "    - [LOCAL_WORKSPACE]",
    ].join("\n"))],
    parentContractFields: parentFields,
    workItem: { sequence_id: 999 },
    workspaceRoot,
  });

  assert.equal(result.status, "LOWER_WORKER_READY");
  assert.equal(result.worker_class, "hotfix-worker");
  assert.equal(result.worker_contract.agent, "claude");
  assert.equal(result.worker_contract.mode, "implement");
  assert.equal(result.worker_contract.dispatch, "ready");
  assert.ok(result.worker_contract_markdown.includes("dispatch: ready"));
  assert.ok(result.worker_contract_markdown.includes("WorkerClass: hotfix-worker"));

  const validation = validateContract({
    description: result.worker_contract_markdown,
    labels: ["role:cto"],
    parentRoleLabel: "role:cto",
  });
  assert.equal(validation.ok, true, JSON.stringify(validation.reason_codes));
});

test("security audit marker becomes a valid read-only audit contract", () => {
  const result = buildLowerWorkerDispatchFromMarker({
    registry: loaded.registry,
    comments: [comment("marker-1", [
      "controller.audit-followup:",
      "  state: AUDIT_REQUESTED",
      "  worker_class: security-auditor",
      "  report_path: [LOCAL_WORKSPACE]",
    ].join("\n"))],
    parentContractFields: parentFields,
    workspaceRoot,
  });

  assert.equal(result.status, "LOWER_WORKER_READY");
  assert.equal(result.worker_contract.agent, "claude");
  assert.equal(result.worker_contract.mode, "audit");
  assert.equal(result.worker_contract.runtime_permission_mode, "plan");
  assert.ok(result.worker_contract.blocked_actions.includes("source-code-write"));

  const validation = validateContract({
    description: result.worker_contract_markdown,
    labels: ["role:cto"],
    parentRoleLabel: "role:cto",
  });
  assert.equal(validation.ok, true, JSON.stringify(validation.reason_codes));
});

test("hotfix marker fails closed at loop limit", () => {
  const result = buildLowerWorkerDispatchFromMarker({
    registry: loaded.registry,
    comments: [comment("marker-1", [
      "controller.hotfix-request:",
      "  worker_class: hotfix-worker",
      "  max_auto_hotfix_rounds: 1",
      "  previous_hotfix_rounds: 1",
      "  allowed_write_paths:",
      "    - [LOCAL_WORKSPACE]",
    ].join("\n"))],
    parentContractFields: parentFields,
    workspaceRoot,
  });

  assert.equal(result.status, "BLOCKED");
  assert.deepEqual(result.reason_codes, [QUALITY_SCHEDULER_REASONS.HOTFIX_LIMIT]);
});

test("unknown worker class fails closed", () => {
  const result = buildLowerWorkerDispatchFromMarker({
    registry: loaded.registry,
    comments: [comment("marker-1", "controller.audit-followup:\n  worker_class: magic-auditor")],
    parentContractFields: parentFields,
    workspaceRoot,
  });

  assert.equal(result.status, "BLOCKED");
  assert.deepEqual(result.reason_codes, [QUALITY_SCHEDULER_REASONS.WORKER_CLASS_UNKNOWN]);
});
