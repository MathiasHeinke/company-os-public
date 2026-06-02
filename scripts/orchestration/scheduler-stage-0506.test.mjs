import assert from "node:assert/strict";
import test from "node:test";

import {
  SCHEDULER_RUNTIME_READY_DECISION,
  applyStage065ToSchedulerDecision,
  findLatestStageCommentFields,
  selectSchedulerStage0506CommentsToPost,
} from "./scheduler-stage-0506.mjs";
import {
  CONTRACT_REVIEW_TITLE,
  RUNTIME_READY_TITLE,
  RUNTIME_READY_VERDICTS,
} from "./contract-controller.mjs";
import { CONTRACT_REMEDIATION_TITLE } from "./contract-remediation-router.mjs";
import {
  EXECUTIVE_FIRST_REASON_CODES,
  EXECUTIVE_ROUTING_TITLE,
  SCHEDULER_DECISIONS,
} from "./scheduler-stage-0506-core.mjs";

const REVIEW_YAML = `${CONTRACT_REVIEW_TITLE}:
  version: contract-controller-v0
  work_item: [WORK_ITEM_ID]
  verdict: SPEC_REQUIRED
  reviewer: scheduler
  description_hash: abc123
  reason_codes: contract-review.spec-required
  suggestions: Add Spec/Plan/Tasks.
  next_action: create-or-link-spec-plan-tasks-before-dispatch
  signed_at: 2026-05-11T10:00:00.000Z`;

const REMEDIATION_YAML = `${CONTRACT_REMEDIATION_TITLE}:
  version: contract-remediation-router-v0
  work_item: [WORK_ITEM_ID]
  reviewer: scheduler
  route_required: true
  route_owner: role:cto
  escalation_level: c-level
  escalation_path: role:cto -> ceo
  founder_gate_required: false
  action: create-or-link-spec-plan-tasks
  source_review_verdict: SPEC_REQUIRED
  source_review_comment_id: none
  description_hash: abc123
  role_labels: role:cto
  reason_codes: remediation.spec-to-clevel
  message: role:cto owns pre-work.
  signed_at: 2026-05-11T10:00:00.000Z`;

const RUNTIME_READY_CONTRACT = `\`\`\`yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: implement
workspace: registry:company-os
dispatch: ready
source_of_truth:
  - [LOCAL_WORKSPACE]
scope:
  - include scripts/orchestration/scheduler-stage-0506.mjs
sandbox: required
allowedreadpaths:
  - [LOCAL_WORKSPACE]
allowedwritepaths:
  - [LOCAL_WORKSPACE]
capabilityprofile: claude-clevel-worker/cto/unknown
outcomespec: Runtime-ready scheduler overlay blocks formally valid but non-executable contracts.
outcomerubric: Scheduler requires RUNTIME_READY_PASS before lock.
acceptance_criteria:
  - unknown CapabilityProfile blocks lock before worker context.
gates:
  - node --test [LOCAL_WORKSPACE]
human_gate: HG-2.5
reporting:
  - [LOCAL_WORKSPACE]
blockedactions: never print secrets; do not deploy, publish, write Linear, mark Done, or touch production.
runtimeauth: claude max local auth present
runtimepermissionmode: acceptEdits
maxruntime: 900s
maxspend: EUR 0
killswitch: runtime/killswitch/COMPA-test.stop
heartbeat: 60s
\`\`\``;

function comment(id, yaml, createdAt = "2026-05-11T10:00:00.000Z") {
  const title = yaml.split(":\n")[0];
  return {
    id,
    created_at: createdAt,
    comment_html: `<p><strong>${title}</strong></p><pre><code>${yaml}</code></pre>`,
  };
}

test("findLatestStageCommentFields returns the latest matching controller comment", () => {
  const older = comment("old", REVIEW_YAML.replace("verdict: SPEC_REQUIRED", "verdict: CONTRACT_PATCH_REQUIRED"), "2026-05-11T09:00:00.000Z");
  const newer = comment("new", REVIEW_YAML, "2026-05-11T10:00:00.000Z");
  const latest = findLatestStageCommentFields([older, newer], CONTRACT_REVIEW_TITLE);
  assert.equal(latest.comment_id, "new");
  assert.equal(latest.fields.verdict, "SPEC_REQUIRED");
  assert.equal(latest.fields.description_hash, "abc123");
});

test("selectSchedulerStage0506CommentsToPost posts both comments when no duplicates exist", () => {
  const selected = selectSchedulerStage0506CommentsToPost({
    commentsToPost: [
      { title: CONTRACT_REVIEW_TITLE, yaml: REVIEW_YAML },
      { title: CONTRACT_REMEDIATION_TITLE, yaml: REMEDIATION_YAML },
    ],
    existingComments: [],
    dedupe: true,
  });
  assert.deepEqual(selected.map((row) => row.should_post), [true, true]);
});

test("selectSchedulerStage0506CommentsToPost skips matching review but still posts missing remediation", () => {
  const selected = selectSchedulerStage0506CommentsToPost({
    commentsToPost: [
      { title: CONTRACT_REVIEW_TITLE, yaml: REVIEW_YAML },
      { title: CONTRACT_REMEDIATION_TITLE, yaml: REMEDIATION_YAML },
    ],
    existingComments: [comment("review-1", REVIEW_YAML)],
    dedupe: true,
  });
  assert.equal(selected[0].should_post, false);
  assert.equal(selected[0].skip_reason, "dedupe.same-description-and-route");
  assert.equal(selected[1].should_post, true);
});

test("selectSchedulerStage0506CommentsToPost ignores source_review_comment_id churn for remediation dedupe", () => {
  const existingRoute = REMEDIATION_YAML.replace("source_review_comment_id: none", "source_review_comment_id: actual-review-id");
  const selected = selectSchedulerStage0506CommentsToPost({
    commentsToPost: [{ title: CONTRACT_REMEDIATION_TITLE, yaml: REMEDIATION_YAML }],
    existingComments: [comment("route-1", existingRoute)],
    dedupe: true,
  });
  assert.equal(selected[0].should_post, false);
});

test("selectSchedulerStage0506CommentsToPost reposts when the remediation action changes", () => {
  const existingRoute = REMEDIATION_YAML.replace("action: create-or-link-spec-plan-tasks", "action: patch-contract-and-rerun-contract-controller");
  const selected = selectSchedulerStage0506CommentsToPost({
    commentsToPost: [{ title: CONTRACT_REMEDIATION_TITLE, yaml: REMEDIATION_YAML }],
    existingComments: [comment("route-1", existingRoute)],
    dedupe: true,
  });
  assert.equal(selected[0].should_post, true);
});

test("applyStage065ToSchedulerDecision preserves executive block decision and still appends runtime-ready evidence", () => {
  const item = {
    id: "item-411",
    sequence_id: 411,
    name: "Marketing Parent Objective",
    description_html: `<pre><code>${RUNTIME_READY_CONTRACT}</code></pre>`,
  };
  const executiveYaml = `${EXECUTIVE_ROUTING_TITLE}:\n  decision: ${SCHEDULER_DECISIONS.LOCK_BLOCKED_EXECUTIVE_OVER_LANE}`;
  const baseDecision = {
    allow_lock: false,
    decision: SCHEDULER_DECISIONS.LOCK_BLOCKED_EXECUTIVE_OVER_LANE,
    executive_routing: {
      decision: SCHEDULER_DECISIONS.LOCK_BLOCKED_EXECUTIVE_OVER_LANE,
      allow_lock: false,
      reason_codes: [EXECUTIVE_FIRST_REASON_CODES.OVER_LANE],
      capability_profile_id: "claude-clevel-worker/cto/runtime",
      evidence: {},
      yaml: executiveYaml,
      comment_title: EXECUTIVE_ROUTING_TITLE,
    },
    comments_to_post: [
      { title: CONTRACT_REVIEW_TITLE, yaml: REVIEW_YAML.replace("verdict: SPEC_REQUIRED", "verdict: CONTRACT_PASS") },
      { title: EXECUTIVE_ROUTING_TITLE, yaml: executiveYaml },
    ],
  };
  const decision = applyStage065ToSchedulerDecision({
    decision: baseDecision,
    item,
    labelNames: ["role:cto"],
    capabilityRegistry: { profiles: [] },
    reviewer: "scheduler-test",
    now: new Date("2026-05-23T12:00:00.000Z"),
  });
  assert.equal(decision.allow_lock, false);
  assert.equal(decision.decision, SCHEDULER_DECISIONS.LOCK_BLOCKED_EXECUTIVE_OVER_LANE);
  assert.equal(decision.runtime_ready.verdict, RUNTIME_READY_VERDICTS.REJECT);
  assert.equal(decision.comments_to_post.at(-1).title, RUNTIME_READY_TITLE);
  assert.match(decision.comments_to_post.at(-1).yaml, /verdict: RUNTIME_READY_REJECT/);
});

test("applyStage065ToSchedulerDecision blocks lock when runtime-ready rejects", () => {
  const item = {
    id: "item-311",
    sequence_id: 311,
    name: "Runtime Ready",
    description_html: `<pre><code>${RUNTIME_READY_CONTRACT}</code></pre>`,
  };
  const baseDecision = {
    allow_lock: true,
    decision: "lock-allowed",
    comments_to_post: [{ title: CONTRACT_REVIEW_TITLE, yaml: REVIEW_YAML }],
  };
  const decision = applyStage065ToSchedulerDecision({
    decision: baseDecision,
    item,
    labelNames: ["role:cto"],
    capabilityRegistry: { profiles: [] },
    reviewer: "scheduler-test",
    now: new Date("2026-05-20T12:00:00.000Z"),
  });
  assert.equal(decision.allow_lock, false);
  assert.equal(decision.decision, SCHEDULER_RUNTIME_READY_DECISION);
  assert.equal(decision.runtime_ready.verdict, RUNTIME_READY_VERDICTS.REJECT);
  assert.equal(decision.comments_to_post.at(-1).title, RUNTIME_READY_TITLE);
  assert.match(decision.comments_to_post.at(-1).yaml, /verdict: RUNTIME_READY_REJECT/);
});
