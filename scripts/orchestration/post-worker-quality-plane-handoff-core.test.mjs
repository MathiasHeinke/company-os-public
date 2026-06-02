import assert from "node:assert/strict";
import test from "node:test";

import { loadPostWorkerQualityRegistry } from "./post-worker-quality-loop-core.mjs";
import {
  PLANE_HANDOFF_REASONS,
  buildPlaneQualityProjectScan,
  buildPlaneQualitySchedulerHandoff,
  findExistingCandidateComment,
  hasQualityControllerMarker,
  normalizePlaneComment,
  parentContractFromWorkItem,
  renderPlaneCandidateMarkdown,
  sequenceRef,
} from "./post-worker-quality-plane-handoff-core.mjs";
import { validateContract } from "./worker-ledger-validator.mjs";

const { registry } = loadPostWorkerQualityRegistry();
const workspaceRoot = "[LOCAL_WORKSPACE]";

function workItem(overrides = {}) {
  return {
    id: "plane-item-1",
    sequence_id: 352,
    name: "Parent work item",
    labels: [{ name: "role:cto" }],
    description_html: [
      "<pre><code>",
      "role: role:cto\n",
      "parent_seat: role:cto\n",
      "agent: claude\n",
      "mode: implement\n",
      "workspace: registry:company-os\n",
      "dispatch: ready\n",
      "source_of_truth:\n",
      "  - [LOCAL_WORKSPACE]",
      "acceptance_criteria:\n",
      "  - Parent run reports done with gates.\n",
      "gates:\n",
      "  - node --test scripts/orchestration/post-worker-quality-loop-core.test.mjs\n",
      "human_gate: HG-2\n",
      "reporting: Plane worker.reported plus report path\n",
      "BlockedActions: merge; push; deploy; plane-done\n",
      "</code></pre>",
    ].join(""),
    ...overrides,
  };
}

function comment(body, createdAt = "2026-05-27T10:00:00.000Z") {
  return {
    id: "comment-1",
    created_at: createdAt,
    body,
  };
}

test("sequenceRef formats numeric Plane sequence ids", () => {
  assert.equal(sequenceRef({ sequence_id: 352 }, "COMPA"), "[WORK_ITEM_ID]");
  assert.equal(sequenceRef({ sequence_id: "[WORK_ITEM_ID]" }, "COMPA"), "[WORK_ITEM_ID]");
});

test("normalizePlaneComment strips HTML and preserves marker body", () => {
  const normalized = normalizePlaneComment({
    id: "c1",
    comment_html: "<p>controller.audit-followup:</p><p>worker_class: quality-auditor</p>",
  });
  assert.equal(normalized.id, "c1");
  assert.match(normalized.body, /controller\.audit-followup:/);
  assert.match(normalized.body, /worker_class: quality-auditor/);
});

test("hasQualityControllerMarker detects controller quality markers only", () => {
  assert.equal(hasQualityControllerMarker([comment("worker.reported:\n  status: pass")]), false);
  assert.equal(hasQualityControllerMarker([comment("controller.audit-followup:\n  worker_class: quality-auditor")]), true);
});

test("parentContractFromWorkItem blocks missing contracts", () => {
  const parent = parentContractFromWorkItem(workItem({ description_html: "<p>No contract</p>" }));
  assert.equal(parent.ok, false);
  assert.deepEqual(parent.reason_codes, [PLANE_HANDOFF_REASONS.PARENT_CONTRACT_MISSING]);
});

test("buildPlaneQualitySchedulerHandoff turns hotfix Plane marker into candidate", () => {
  const result = buildPlaneQualitySchedulerHandoff({
    registry,
    workItem: workItem(),
    comments: [comment([
      "controller.hotfix-request:",
      "  state: HOTFIX_REQUESTED",
      "  worker_class: hotfix-worker",
      "  max_auto_hotfix_rounds: 1",
      "  previous_hotfix_rounds: 0",
      "  allowed_write_paths:",
      "    - [LOCAL_WORKSPACE]",
    ].join("\n"))],
    workspaceRoot,
    projectIdentifier: "COMPA",
  });

  assert.equal(result.status, "LOWER_WORKER_READY");
  assert.equal(result.work_item.ref, "[WORK_ITEM_ID]");
  assert.equal(result.comments_read, 1);
  assert.equal(result.worker_class, "hotfix-worker");
  assert.match(result.worker_contract_markdown, /dispatch: ready/);

  const validation = validateContract({
    description: result.worker_contract_markdown,
    labels: ["role:cto"],
    parentRoleLabel: "role:cto",
  });
  assert.equal(validation.ok, true, JSON.stringify(validation.reason_codes));
});

test("buildPlaneQualitySchedulerHandoff returns no-spawn when no marker exists", () => {
  const result = buildPlaneQualitySchedulerHandoff({
    registry,
    workItem: workItem(),
    comments: [comment("worker.reported:\n  status: pass")],
    workspaceRoot,
    projectIdentifier: "COMPA",
  });

  assert.equal(result.status, "NO_SPAWN");
  assert.deepEqual(result.reason_codes, ["quality-scheduler.marker-missing"]);
});

test("buildPlaneQualityProjectScan skips unmarked items and returns candidates", () => {
  const marked = workItem({ id: "marked", sequence_id: 352 });
  const unmarked = workItem({ id: "unmarked", sequence_id: 353 });
  const scan = buildPlaneQualityProjectScan({
    registry,
    workItems: [marked, unmarked],
    commentsByWorkItemId: {
      marked: [comment([
        "controller.audit-followup:",
        "  state: AUDIT_REQUESTED",
        "  worker_class: security-auditor",
      ].join("\n"))],
      unmarked: [comment("worker.reported:\n  status: pass")],
    },
    workspaceRoot,
    projectIdentifier: "COMPA",
  });

  assert.equal(scan.status, "CANDIDATES_READY");
  assert.equal(scan.scanned_items, 2);
  assert.equal(scan.marked_items, 1);
  assert.equal(scan.skipped_no_marker, 1);
  assert.equal(scan.candidate_count, 1);
  assert.equal(scan.candidates[0].worker_class, "security-auditor");
});

test("renderPlaneCandidateMarkdown includes the candidate marker and generated contract", () => {
  const result = buildPlaneQualitySchedulerHandoff({
    registry,
    workItem: workItem(),
    comments: [comment([
      "controller.audit-followup:",
      "  state: AUDIT_REQUESTED",
      "  worker_class: security-auditor",
    ].join("\n"))],
    workspaceRoot,
    projectIdentifier: "COMPA",
  });
  const markdown = renderPlaneCandidateMarkdown(result);
  assert.match(markdown, /scheduler\.lower-worker-candidate/);
  assert.match(markdown, /Generated Lower-Worker Contract/);
  assert.match(markdown, /WorkerClass: security-auditor/);
});

test("findExistingCandidateComment dedupes candidate for same marker and worker class", () => {
  const result = buildPlaneQualitySchedulerHandoff({
    registry,
    workItem: workItem(),
    comments: [comment([
      "controller.audit-followup:",
      "  state: AUDIT_REQUESTED",
      "  worker_class: security-auditor",
    ].join("\n"))],
    workspaceRoot,
    projectIdentifier: "COMPA",
  });
  const candidate = renderPlaneCandidateMarkdown(result);
  const existing = findExistingCandidateComment([
    comment(candidate, "2026-05-27T10:05:00.000Z"),
  ], result);
  assert.equal(existing.id, "comment-1");
});
