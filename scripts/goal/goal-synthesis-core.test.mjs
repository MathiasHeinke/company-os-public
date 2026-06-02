import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildGoalSynthesis,
  classifySynthesisChild,
  renderGoalSynthesisMarkdown,
  writeGoalSynthesis,
} from "./goal-synthesis-core.mjs";

function comment(id, body) {
  return { id, created_at: `2026-05-13T10:00:0${id}.000Z`, body };
}

test("classifySynthesisChild reports pending worker when no report exists", () => {
  const child = classifySynthesisChild({
    item: { id: "child-1", sequence_id: 191, name: "Child" },
    comments: [],
  });

  assert.equal(child.ref, "[WORK_ITEM_ID]");
  assert.equal(child.integration_status, "pending-worker");
  assert.deepEqual(child.blockers, ["worker.reported-missing"]);
  assert.equal(child.complete, false);
});

test("classifySynthesisChild detects CAO pass waiting for controller", () => {
  const child = classifySynthesisChild({
    item: { id: "child-1", sequence_id: 191, name: "Child" },
    comments: [
      comment(1, "worker.reported:\n  state: PASS"),
      comment(2, "controller.verdict:\n  verdict: PASS"),
    ],
  });

  assert.equal(child.integration_status, "ceo:review");
  assert.equal(child.cao_verdict, "PASS");
  assert.deepEqual(child.blockers, ["controller.decision-missing"]);
});

test("buildGoalSynthesis requires every child complete before parent review", () => {
  const synthesis = buildGoalSynthesis({
    parent: { id: "parent-1", sequence_id: 190, name: "Goal Parent" },
    children: [
      { id: "child-1", sequence_id: 191, name: "Complete child" },
      { id: "child-2", sequence_id: 192, name: "Pending child" },
    ],
    commentsByItemId: {
      "child-1": [
        comment(1, "worker.reported:\n  state: PASS"),
        comment(2, "controller.verdict:\n  verdict: PASS"),
        comment(3, "controller.decision (codex-controller-v0):\n  decision_mode: AUTO-GO"),
      ],
    },
    now: new Date("2026-05-13T10:30:00Z"),
  });

  assert.equal(synthesis.status, "BLOCKED_DEPENDENCY");
  assert.equal(synthesis.ready_for_done_review, false);
  assert.equal(synthesis.complete_children, 1);
  assert.match(synthesis.blockers.join("\n"), /[WORK_ITEM_ID]:worker.reported-missing/);
});

test("buildGoalSynthesis marks parent ready only after all children complete", () => {
  const synthesis = buildGoalSynthesis({
    parent: { id: "parent-1", sequence_id: 190, name: "Goal Parent" },
    children: [
      { id: "child-1", sequence_id: 191, name: "Complete child" },
    ],
    commentsByItemId: {
      "child-1": [
        comment(1, "worker.reported:\n  state: PASS"),
        comment(2, "controller.verdict:\n  verdict: PASS"),
        comment(3, "controller.decision:\n  decision_mode: AUTO-GO"),
      ],
    },
    now: new Date("2026-05-13T10:30:00Z"),
  });

  assert.equal(synthesis.status, "READY_FOR_PARENT_COMPLETION_REVIEW");
  assert.equal(synthesis.ready_for_done_review, true);
  assert.equal(synthesis.blockers.length, 0);
  assert.match(synthesis.done_authority, /CEO\/Codex via HG-2\.5\/HG-3 or Founder via HG-4 only/);
});

test("classifySynthesisChild ignores Plane title marker and parses nested controller decision YAML", () => {
  const child = classifySynthesisChild({
    item: { id: "child-1", sequence_id: 191, name: "Child" },
    comments: [
      comment(1, "worker.reported:\n  state: PASS"),
      comment(2, "controller.verdict (cao-v0)\n\ncontroller.verdict:\n  verdict: PASS"),
      comment(3, "controller.decision (codex-controller-v0)\n\ncontroller.decision:\n  decision_mode: AUTO-GO\n  reason: confidence-meets-threshold"),
    ],
  });

  assert.equal(child.integration_status, "controller:auto-go");
  assert.equal(child.controller_decision, "AUTO-GO");
  assert.deepEqual(child.blockers, []);
  assert.equal(child.complete, true);
});

test("classifySynthesisChild parses title marker with colon", () => {
  const child = classifySynthesisChild({
    item: { id: "child-1", sequence_id: 191, name: "Child" },
    comments: [
      comment(1, "worker.reported:\n  state: PASS"),
      comment(2, "controller.verdict:\n  verdict: PASS"),
      comment(3, "controller.decision (codex-controller-v0):\n  decision_mode: AUTO-GO"),
    ],
  });

  assert.equal(child.controller_decision, "AUTO-GO");
  assert.equal(child.complete, true);
});

test("classifySynthesisChild treats HG-3 audit follow-up as CEO critical review, not missing CAO", () => {
  const child = classifySynthesisChild({
    item: { id: "child-1", sequence_id: 228, name: "Claim gate" },
    comments: [
      comment(1, "worker.reported:\n  state: NEEDS_HUMAN"),
      comment(2, [
        "controller.audit-followup",
        "",
        "controller.audit-followup",
        "  state: COMMITTED_FOR_HG3_REVIEW",
        "  runtime_reason: hg3-mandatory-per-contract",
        "  blocked_actions_remaining:",
        "    - regulated claim approval",
      ].join("\n")),
    ],
  });

  assert.equal(child.integration_status, "ceo:hg3-review");
  assert.equal(child.cao_verdict, null);
  assert.equal(child.evidence.audit_followup_comment, 2);
  assert.deepEqual(child.blockers, ["ceo.hg3-review-required"]);
  assert.equal(child.complete, false);
});

test("classifySynthesisChild accepts Plane-stripped audit follow-up top-level YAML fields", () => {
  const child = classifySynthesisChild({
    item: { id: "child-1", sequence_id: 228, name: "Claim gate" },
    comments: [
      comment(1, "worker.reported:\n  state: NEEDS_HUMAN"),
      comment(2, [
        "controller.audit-followup",
        "",
        "controller.audit-followup",
        "version: controller-audit-followup/v1",
        "work_item: [WORK_ITEM_ID]",
        "state: COMMITTED_FOR_HG3_REVIEW",
        "runtime:",
        "  reason: hg3-mandatory-per-contract",
      ].join("\n")),
    ],
  });

  assert.equal(child.integration_status, "ceo:hg3-review");
  assert.deepEqual(child.blockers, ["ceo.hg3-review-required"]);
});

test("classifySynthesisChild lets AUTO-GO override earlier HG-3 follow-up evidence", () => {
  const child = classifySynthesisChild({
    item: { id: "child-1", sequence_id: 228, name: "Claim gate" },
    comments: [
      comment(1, "worker.reported:\n  state: NEEDS_HUMAN"),
      comment(2, [
        "controller.audit-followup",
        "  state: committed_for_hg3_review",
      ].join("\n")),
      comment(3, "controller.decision:\n  decision_mode: AUTO-GO"),
    ],
  });

  assert.equal(child.integration_status, "controller:auto-go");
  assert.deepEqual(child.blockers, []);
  assert.equal(child.complete, true);
});

test("classifySynthesisChild accepts controller self-fix accepted without retroactive CAO pass", () => {
  const child = classifySynthesisChild({
    item: { id: "child-1", sequence_id: 242, name: "Self-fix item" },
    comments: [
      comment(1, "worker.reported:\n  state: RUNTIME_ERROR\n  stream_health: PASS"),
      comment(2, "controller.verdict:\n  verdict: REJECT\n  reason: runtime-non-pass"),
      comment(3, [
        "controller.self-fix-accepted:",
        "  verdict: ACCEPTED",
        "  commit: abc1234",
        "  policy: bounded-controller-self-fix-not-retroactive-cao-pass",
      ].join("\n")),
    ],
  });

  assert.equal(child.integration_status, "controller:self-fix-accepted");
  assert.equal(child.cao_verdict, "REJECT");
  assert.equal(child.evidence.self_fix_accepted_comment, 3);
  assert.deepEqual(child.blockers, []);
  assert.equal(child.complete, true);
});

test("buildGoalSynthesis marks parent ready when child is controller self-fix accepted", () => {
  const synthesis = buildGoalSynthesis({
    parent: { id: "parent-1", sequence_id: 240, name: "Safety Hardening" },
    children: [
      { id: "child-1", sequence_id: 242, name: "Self-fix item" },
    ],
    commentsByItemId: {
      "child-1": [
        comment(1, "worker.reported:\n  state: RUNTIME_ERROR\n  stream_health: PASS"),
        comment(2, "controller.self-fix-accepted:\n  verdict: ACCEPTED"),
      ],
    },
    now: new Date("2026-05-18T13:00:00Z"),
  });

  assert.equal(synthesis.status, "READY_FOR_PARENT_COMPLETION_REVIEW");
  assert.equal(synthesis.ready_for_done_review, true);
  assert.equal(synthesis.complete_children, 1);
  assert.deepEqual(synthesis.blockers, []);
});

test("classifySynthesisChild lets HG-3 CEO review trump intermediate controller modes", () => {
  const child = classifySynthesisChild({
    item: { id: "child-1", sequence_id: 228, name: "Claim gate" },
    comments: [
      comment(1, "worker.reported:\n  state: NEEDS_HUMAN"),
      comment(2, "controller.audit-followup:\n  state: COMMITTED_FOR_HG3_REVIEW"),
      comment(3, "controller.decision:\n  decision_mode: DELEGATE"),
    ],
  });

  assert.equal(child.integration_status, "ceo:hg3-review");
  assert.equal(child.controller_decision, "DELEGATE");
  assert.deepEqual(child.blockers, ["ceo.hg3-review-required"]);
  assert.equal(child.complete, false);
});

test("classifySynthesisChild treats controller DELEGATE as open follow-up, not complete", () => {
  const child = classifySynthesisChild({
    item: { id: "child-1", sequence_id: 598, name: "Runtime gate" },
    comments: [
      comment(1, "worker.reported:\n  state: PASS"),
      comment(2, "controller.verdict:\n  verdict: PASS"),
      comment(3, "controller.decision:\n  decision_mode: DELEGATE"),
      comment(4, "controller.audit-followup:\n  state: AUDIT_COMPLETED\n  worker_class: security-auditor\n  verdict: PASS_WITH_FINDING"),
    ],
  });

  assert.equal(child.integration_status, "controller:delegate");
  assert.equal(child.controller_decision, "DELEGATE");
  assert.deepEqual(child.blockers, ["controller.delegate-open"]);
  assert.equal(child.complete, false);
});

test("classifySynthesisChild ignores prose-only HG-3 mentions in audit follow-up body", () => {
  const child = classifySynthesisChild({
    item: { id: "child-1", sequence_id: 228, name: "Claim gate" },
    comments: [
      comment(1, "worker.reported:\n  state: PASS"),
      comment(2, [
        "controller.audit-followup",
        "  state: PASS",
        "  note: Does not need Founder review despite prior HG-3 language.",
      ].join("\n")),
    ],
  });

  assert.equal(child.integration_status, "cao-review");
  assert.deepEqual(child.blockers, ["cao.verdict-missing"]);
  assert.equal(child.complete, false);
});

test("classifySynthesisChild uses the latest duplicated audit follow-up marker fields", () => {
  const child = classifySynthesisChild({
    item: { id: "child-1", sequence_id: 228, name: "Claim gate" },
    comments: [
      comment(1, "worker.reported:\n  state: PASS"),
      comment(2, [
        "controller.audit-followup",
        "  state: NEEDS_HUMAN",
        "",
        "controller.audit-followup",
        "  state: PASS",
      ].join("\n")),
    ],
  });

  assert.equal(child.integration_status, "cao-review");
  assert.deepEqual(child.blockers, ["cao.verdict-missing"]);
});

test("classifySynthesisChild falls through when audit follow-up has no structured HG-3 fields", () => {
  const child = classifySynthesisChild({
    item: { id: "child-1", sequence_id: 228, name: "Claim gate" },
    comments: [
      comment(1, "worker.reported:\n  state: PASS"),
      comment(2, "controller.audit-followup:\n  note: needs human language in prose is ignored"),
    ],
  });

  assert.equal(child.integration_status, "cao-review");
  assert.deepEqual(child.blockers, ["cao.verdict-missing"]);
});

test("renderGoalSynthesisMarkdown and writeGoalSynthesis expose child table", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "company-os-goal-synthesis-test-"));
  const synthesis = buildGoalSynthesis({
    parent: { id: "parent-1", sequence_id: 190, name: "Goal Parent" },
    children: [{ id: "child-1", sequence_id: 191, name: "Pending child" }],
    now: new Date("2026-05-13T10:30:00Z"),
  });
  const markdown = renderGoalSynthesisMarkdown(synthesis);

  assert.match(markdown, /^# Goal Synthesis - [WORK_ITEM_ID]/m);
  assert.match(markdown, /[WORK_ITEM_ID] Pending child/);

  const output = writeGoalSynthesis({ workspaceRoot: root, synthesis });
  assert.equal(fs.existsSync(output.reportPath), true);
  assert.equal(JSON.parse(fs.readFileSync(output.jsonPath, "utf8")).version, "goal-synthesis/v0");
});
