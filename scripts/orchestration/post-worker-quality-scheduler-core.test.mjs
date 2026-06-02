import assert from "node:assert/strict";
import test from "node:test";

import { loadPostWorkerQualityRegistry } from "./post-worker-quality-loop-core.mjs";
import {
  QUALITY_SCHEDULER_REASONS,
  buildLowerWorkerDispatchesFromMarkers,
  buildLowerWorkerDispatchFromMarker,
  latestQualityMarker,
  parseQualityMarkerFields,
} from "./post-worker-quality-scheduler-core.mjs";
import { validateContract } from "./worker-ledger-validator.mjs";

const loaded = loadPostWorkerQualityRegistry();
const workspaceRoot = "/tmp/company-os-test-workspace";

function comment(id, body, createdAt = "2026-05-27T10:00:00.000Z") {
  return { id, body, created_at: createdAt };
}

const parentFields = {
  role: "role:cto",
  parent_seat: "role:cto",
  workspace: "registry:company-os",
  source_of_truth: [
    "/tmp/company-os-test-workspace/scripts/orchestration/post-worker-quality-loop-core.mjs",
  ],
  allowedwritepaths: [
    "/tmp/company-os-test-workspace/scripts/orchestration/post-worker-quality-loop-core.mjs",
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

test("parseQualityMarkerFields keeps flat list keys inside the same marker", () => {
  const fields = parseQualityMarkerFields([
    "controller.audit-followup:",
    "version: post-worker-quality-loop/v0",
    "work_item: [WORK_ITEM_ID]",
    "state: AUDIT_REQUESTED",
    "worker_class: quality-auditor",
    "reason_codes:",
    "  - quality-loop.cao-reject-runtime-protocol",
    "  - quality-loop.dispatch-guard-hardened-needs-independent-check",
    "source_worker_reported_comment_id: worker-comment-1",
    "source_cao_verdict_comment_id: cao-comment-1",
    "source_worker_report_path: /tmp/worker-report.md",
    "report_path: /tmp/quality-report.md",
    "blocked_actions_remaining:",
    "  - merge",
    "  - plane-done",
    "---",
    "controller.hotfix-request:",
    "state: HOTFIX_REQUESTED",
  ].join("\n"), "controller.audit-followup");

  assert.equal(fields.version, "post-worker-quality-loop/v0");
  assert.deepEqual(fields.reason_codes, [
    "quality-loop.cao-reject-runtime-protocol",
    "quality-loop.dispatch-guard-hardened-needs-independent-check",
  ]);
  assert.equal(fields.source_worker_reported_comment_id, "worker-comment-1");
  assert.equal(fields.source_cao_verdict_comment_id, "cao-comment-1");
  assert.equal(fields.source_worker_report_path, "/tmp/worker-report.md");
  assert.equal(fields.report_path, "/tmp/quality-report.md");
  assert.deepEqual(fields.blocked_actions_remaining, ["merge", "plane-done"]);
  assert.equal(fields.state, "AUDIT_REQUESTED");
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

test("completed audit marker does not spawn another lower worker", () => {
  const result = buildLowerWorkerDispatchFromMarker({
    registry: loaded.registry,
    comments: [comment("marker-1", [
      "controller.audit-followup:",
      "  state: AUDIT_COMPLETED",
      "  worker_class: quality-auditor",
      "  verdict: PASS_WITH_FINDING",
    ].join("\n"))],
    parentContractFields: parentFields,
    workspaceRoot,
  });

  assert.equal(result.status, "NO_SPAWN");
  assert.deepEqual(result.reason_codes, [QUALITY_SCHEDULER_REASONS.MARKER_TERMINAL]);
  assert.equal(result.evidence.marker_state, "AUDIT_COMPLETED");
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
      "    - /tmp/company-os-test-workspace/scripts/orchestration/post-worker-quality-loop-core.mjs",
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
      "  report_path: /tmp/company-os-test-workspace/reports/audits/security.md",
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

test("controller NEEDS_HUMAN quality summary prevents lower-worker spawn", () => {
  const result = buildLowerWorkerDispatchFromMarker({
    registry: loaded.registry,
    comments: [comment("marker-1", [
      "controller.decision:",
      "  work_item: [WORK_ITEM_ID]",
      "post_worker_quality:",
      "  status: NEEDS_HUMAN",
      "  scheduler_may_spawn: false",
      "  reason_codes:",
      "    - quality-loop.human-gate-required",
      "  markers_to_post:",
      "    - controller.audit-followup:quality-auditor",
      "controller.audit-followup:",
      "  state: AUDIT_REQUESTED",
      "  worker_class: quality-auditor",
      "  reason_codes:",
      "    - quality-loop.human-gate-required",
    ].join("\n"))],
    parentContractFields: parentFields,
    workspaceRoot,
  });

  assert.equal(result.status, "NO_SPAWN");
  assert.deepEqual(result.reason_codes, [QUALITY_SCHEDULER_REASONS.CONTROLLER_SPAWN_FORBIDDEN]);
  assert.equal(result.marker.controller_quality.status, "NEEDS_HUMAN");
  assert.equal(result.evidence.scheduler_may_spawn, "false");
});

test("multi-marker controller decision fans out into separate lower-worker candidates", () => {
  const result = buildLowerWorkerDispatchesFromMarkers({
    registry: loaded.registry,
    comments: [comment("controller-card-1", [
      "controller.decision:",
      "  work_item: [WORK_ITEM_ID]",
      "controller.audit-followup:",
      "  state: CONTROLLER_RERUN_GATES",
      "  worker_class: controller-only",
      "controller.audit-followup:",
      "  state: AUDIT_REQUESTED",
      "  worker_class: bug-regression-auditor",
      "controller.hotfix-request:",
      "  state: HOTFIX_REQUESTED",
      "  worker_class: hotfix-worker",
      "  max_auto_hotfix_rounds: 1",
      "  previous_hotfix_rounds: 0",
      "  allowed_write_paths:",
      "    - /tmp/company-os-test-workspace/scripts/orchestration/post-worker-quality-loop-core.mjs",
    ].join("\n"))],
    parentContractFields: parentFields,
    workItem: { sequence_id: 999 },
    workspaceRoot,
  });

  assert.equal(result.status, "CANDIDATES_READY");
  assert.equal(result.candidate_count, 2);
  assert.equal(result.no_spawn_count, 1);
  assert.deepEqual(
    result.candidates.map((candidate) => candidate.worker_class),
    ["bug-regression-auditor", "hotfix-worker"],
  );
  assert.deepEqual(
    result.no_spawn.map((item) => item.reason_codes[0]),
    [QUALITY_SCHEDULER_REASONS.CONTROLLER_ONLY],
  );
  for (const candidate of result.candidates) {
    const validation = validateContract({
      description: candidate.worker_contract_markdown,
      labels: ["role:cto"],
      parentRoleLabel: "role:cto",
    });
    assert.equal(validation.ok, true, JSON.stringify(validation.reason_codes));
  }
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
      "    - /tmp/company-os-test-workspace/scripts/orchestration/post-worker-quality-loop-core.mjs",
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
