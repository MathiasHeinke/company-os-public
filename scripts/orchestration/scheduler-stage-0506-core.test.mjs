import assert from "node:assert/strict";
import test from "node:test";

import {
  EXECUTIVE_FIRST_REASON_CODES,
  EXECUTIVE_LANE_KEY,
  EXECUTIVE_ROUTING_TITLE,
  SCHEDULER_DECISIONS,
  buildExecutiveRoutingYaml,
  decideSchedulerStage0506,
  evaluateExecutiveFirstRouting,
  extractInterventionBudgetBlock,
  findHumanGateRelease,
} from "./scheduler-stage-0506-core.mjs";
import {
  CONTRACT_REVIEW_TITLE,
  CONTRACT_REVIEW_VERDICTS,
} from "./contract-controller.mjs";
import {
  CONTRACT_REMEDIATION_TITLE,
  REMEDIATION_ACTIONS,
  REMEDIATION_REASON_CODES,
} from "./contract-remediation-router.mjs";

const PASS_CONTRACT = `\`\`\`yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: implement
workspace: companyos
dispatch: ready
source_of_truth:
  - docs/orchestration/contract-controller.md
scope:
  - include scripts/orchestration/scheduler-stage-0506-core.mjs
  - exclude production systems
sandbox: required
allowedwritepaths:
  - scripts/orchestration/scheduler-stage-0506-core.mjs
capabilityprofile: claude-clevel-worker/cto/runtime
outcomespec: Scheduler glue routes Stage 0.5 verdicts through Stage 0.6 before lock.
outcomerubric: PASS routes lock-allowed; non-PASS routes lock-blocked-* with stable YAML.
acceptance_criteria:
  - PASS path lock-allowed; non-PASS routes posted controller.remediation-routed YAML.
gates:
  - node --test scripts/orchestration/scheduler-stage-0506-core.test.mjs
human_gate: HG-2.5
reporting: Plane worker.reported with changed files, commands, gate results, and subagents: [].
blockedactions: never print secrets; do not deploy, publish, write Linear, mark Done, or touch production.
runtimeauth: claude max local auth present
maxruntime: 900s
maxspend: EUR 0
killswitch: runtime/killswitch/COMPA-test.stop
heartbeat: 60s
\`\`\``;

function makeItem(description = PASS_CONTRACT, name = "Stage 0.5/0.6 Closed-Loop") {
  return {
    id: "item-1",
    sequence_id: 157,
    name,
    description_html: `<pre><code>${description}</code></pre>`,
  };
}

test("PASS contract: scheduler allows lock and only emits contract-review yaml", () => {
  const decision = decideSchedulerStage0506({
    item: makeItem(),
    labelNames: ["role:cto"],
  });
  assert.equal(decision.allow_lock, true);
  assert.equal(decision.decision, SCHEDULER_DECISIONS.LOCK_ALLOWED);
  assert.equal(decision.contract_review.verdict, CONTRACT_REVIEW_VERDICTS.PASS);
  assert.equal(decision.remediation_route, null);
  assert.equal(decision.remediation_yaml, null);
  assert.equal(decision.comments_to_post.length, 1);
  assert.equal(decision.comments_to_post[0].title, CONTRACT_REVIEW_TITLE);
  assert.match(decision.comments_to_post[0].yaml, /verdict: CONTRACT_PASS/);
});

test("PATCH_REQUIRED: scheduler blocks lock and routes to owning C-Level seat", () => {
  // Strip runtime fields to force a PATCH_REQUIRED.
  const weak = PASS_CONTRACT
    .replace("runtimeauth: claude max local auth present\n", "")
    .replace("maxruntime: 900s\n", "")
    .replace("maxspend: EUR 0\n", "")
    .replace("killswitch: runtime/killswitch/COMPA-test.stop\n", "")
    .replace("heartbeat: 60s\n", "");
  const decision = decideSchedulerStage0506({
    item: makeItem(weak),
    labelNames: ["role:cto"],
  });
  assert.equal(decision.allow_lock, false);
  assert.equal(decision.decision, SCHEDULER_DECISIONS.LOCK_BLOCKED_REMEDIATION);
  assert.equal(decision.contract_review.verdict, CONTRACT_REVIEW_VERDICTS.PATCH_REQUIRED);
  assert.equal(decision.remediation_route.action, REMEDIATION_ACTIONS.PATCH_CONTRACT);
  assert.equal(decision.remediation_route.route_owner, "role:cto");
  assert.deepEqual(decision.remediation_route.escalation_path, ["role:cto", "ceo"]);
  assert.equal(decision.remediation_comment_title, CONTRACT_REMEDIATION_TITLE);
  assert.equal(decision.comments_to_post.length, 2);
  assert.match(decision.remediation_yaml, /action: patch-contract-and-rerun-contract-controller/);
});

test("SPEC_REQUIRED: scheduler blocks lock and routes spec pre-work to owning C-Level seat", () => {
  // Major product work without spec/eval/rubric → SPEC_REQUIRED.
  const major = PASS_CONTRACT
    .replace(/source_of_truth:[\s\S]*?scope:/, "source_of_truth:\n  - docs/system-index.md\nscope:")
    .replace(
      "outcomespec: Scheduler glue routes Stage 0.5 verdicts through Stage 0.6 before lock.\n",
      "",
    )
    .replace(
      "outcomerubric: PASS routes lock-allowed; non-PASS routes lock-blocked-* with stable YAML.\n",
      "",
    );
  const decision = decideSchedulerStage0506({
    item: makeItem(major, "Build new dashboard MVP"),
    labelNames: ["role:cto"],
  });
  assert.equal(decision.allow_lock, false);
  assert.equal(decision.decision, SCHEDULER_DECISIONS.LOCK_BLOCKED_REMEDIATION);
  assert.equal(decision.contract_review.verdict, CONTRACT_REVIEW_VERDICTS.SPEC_REQUIRED);
  assert.equal(decision.remediation_route.action, REMEDIATION_ACTIONS.CREATE_SPEC);
  assert.equal(decision.remediation_route.route_owner, "role:cto");
  assert.match(decision.remediation_yaml, /action: create-or-link-spec-plan-tasks/);
});

test("SPLIT_REQUIRED: scheduler blocks lock and routes split decision to owning C-Level seat", () => {
  const broad = PASS_CONTRACT.replace(
    "include scripts/orchestration/scheduler-stage-0506-core.mjs",
    "rewrite the entire codebase",
  );
  const decision = decideSchedulerStage0506({
    item: makeItem(broad),
    labelNames: ["role:cto"],
  });
  assert.equal(decision.allow_lock, false);
  assert.equal(decision.decision, SCHEDULER_DECISIONS.LOCK_BLOCKED_REMEDIATION);
  assert.equal(decision.contract_review.verdict, CONTRACT_REVIEW_VERDICTS.SPLIT_REQUIRED);
  assert.equal(decision.remediation_route.action, REMEDIATION_ACTIONS.SPLIT_CONTRACT);
  assert.equal(decision.remediation_route.route_owner, "role:cto");
  assert.match(decision.remediation_yaml, /action: split-parent-into-child-contracts/);
});

test("CEO_GATE_REQUIRED: scheduler blocks lock and tags HG-3 CEO routing", () => {
  const risky = PASS_CONTRACT
    .replace("human_gate: HG-2.5", "human_gate: HG-3")
    .replace("exclude production systems", "include Supabase schema/RLS/auth migration");
  const decision = decideSchedulerStage0506({
    item: makeItem(risky),
    labelNames: ["role:cto"],
  });
  assert.equal(decision.allow_lock, false);
  assert.equal(decision.decision, SCHEDULER_DECISIONS.LOCK_BLOCKED_CEO_GATE);
  assert.equal(decision.contract_review.verdict, CONTRACT_REVIEW_VERDICTS.CEO_GATE_REQUIRED);
  assert.equal(decision.remediation_route.action, REMEDIATION_ACTIONS.PREPARE_CEO_GATE);
  assert.equal(decision.remediation_route.ceo_gate_required, true);
  assert.deepEqual(decision.remediation_route.escalation_path, ["role:cto", "ceo"]);
  assert.match(decision.remediation_yaml, /ceo_gate_required: true/);
});

test("human_gate.released comment lets scheduler pass a released HG-3 contract", () => {
  const risky = PASS_CONTRACT
    .replace("human_gate: HG-2.5", "human_gate: HG-3")
    .replace("exclude production systems", "include Supabase schema/RLS/auth migration");
  const comments = [{
    id: "release-1",
    created_at: "2026-05-17T19:20:00.000Z",
    comment_html: "<p><strong>human_gate.released</strong></p><pre><code>work_item: [WORK_ITEM_ID]</code></pre>",
  }];
  const decision = decideSchedulerStage0506({
    item: makeItem(risky),
    labelNames: ["role:cto"],
    comments,
  });
  assert.equal(decision.allow_lock, true);
  assert.equal(decision.decision, SCHEDULER_DECISIONS.LOCK_ALLOWED);
  assert.equal(decision.contract_review.verdict, CONTRACT_REVIEW_VERDICTS.PASS);
  assert.match(decision.contract_review.yaml, /human_gate_release: release-1/);
});

test("findHumanGateRelease selects latest release marker", () => {
  const release = findHumanGateRelease([
    {
      id: "old-release",
      created_at: "2026-05-17T19:00:00.000Z",
      comment_html: "<p>human_gate.released</p>",
    },
    {
      id: "new-release",
      created_at: "2026-05-17T19:05:00.000Z",
      comment_html: "<p><strong>human_gate.released</strong></p>",
    },
  ]);
  assert.equal(release.comment_id, "new-release");
});

test("non-PASS without role label escalates to CEO and never spawns", () => {
  const weak = PASS_CONTRACT.replace("runtimeauth: claude max local auth present\n", "");
  const decision = decideSchedulerStage0506({
    item: makeItem(weak),
    labelNames: [],
  });
  assert.equal(decision.allow_lock, false);
  assert.equal(decision.decision, SCHEDULER_DECISIONS.LOCK_BLOCKED_OWNER_MISSING);
  assert.equal(decision.remediation_route.route_owner, "ceo");
  assert.deepEqual(decision.remediation_route.escalation_path, ["ceo"]);
  assert.ok(decision.remediation_route.reason_codes.includes(REMEDIATION_REASON_CODES.OWNER_MISSING));
});

const EXECUTIVE_LANE_BLOCK = Object.freeze({
  doctrine: "docs/orchestration/c-level-department-executive-runtime.md",
  template: "docs/templates/department-executive-parent-runner-template.md",
  allowed_write_paths_lane: [
    "[LOCAL_WORKSPACE]",
    "[LOCAL_WORKSPACE]",
    "[LOCAL_WORKSPACE]",
    "[LOCAL_WORKSPACE]",
  ],
  blocked_surfaces_lane: ["plane-done-by-worker", "production-write"],
  required_contract_fields: ["parent_seat", "AllowedWritePaths"],
  max_autonomy_level_lane: "L3",
  human_gate_floor: "HG-2",
  subagent_roster_lane: "none",
  intervention_budget: {
    ceo_mechanical_target: 0,
    ceo_mechanical_hard_limit: 0,
    ceo_decision_target: 1,
    ceo_decision_hard_limit: 3,
    worker_retry_target: 2,
    worker_retry_hard_limit: 3,
  },
  escalation_levels_lane: ["HG-2", "HG-2.5", "HG-3"],
});

function buildExecutiveRegistry({ withLane = true, role = "cmo" } = {}) {
  const profile = {
    id: `claude-clevel-worker/${role}/runtime`,
    role: `role:${role}`,
    agents: ["claude"],
    modes: ["implement", "plan"],
    workspaces: ["companyos"],
    max_autonomy_level: "L3",
    last_verified_at: "2026-05-23",
    stale_after_days: 14,
  };
  if (withLane) {
    profile.lanes = { [EXECUTIVE_LANE_KEY]: { ...EXECUTIVE_LANE_BLOCK } };
  }
  return { version: "capability-registry/v0", profiles: [profile] };
}

function buildExecutiveFirstContractFields(overrides = {}) {
  return {
    role: "role:cmo",
    parent_seat: "role:cmo",
    parent_runner: "department-executive-v0",
    capabilityprofile: "claude-clevel-worker/cmo/runtime",
    human_gate: "HG-2",
    subagentroster: "none",
    depends_on: ["[WORK_ITEM_ID]", "[WORK_ITEM_ID]", "[WORK_ITEM_ID]"],
    scope: "supervise parent objective; coordinate children and closeout report",
    allowedwritepaths: [
      "[LOCAL_WORKSPACE]",
      "[LOCAL_WORKSPACE]",
    ],
    blockedactions:
      "no plane-done-by-worker, no push, no merge, no deploy, no publish, "
      + "no schedule, no send, no import, no capability-profile-expansion, "
      + "no runtime-auth-expansion",
    ...overrides,
  };
}

test("evaluateExecutiveFirstRouting PASS: hard triggers + lane block emit executive-first", () => {
  const result = evaluateExecutiveFirstRouting({
    contractFields: buildExecutiveFirstContractFields(),
    labelNames: ["role:cmo"],
    capabilityRegistry: buildExecutiveRegistry({ role: "cmo" }),
  });
  assert.ok(result, "expected a routing decision, got null");
  assert.equal(result.decision, SCHEDULER_DECISIONS.LOCK_ALLOWED_EXECUTIVE_FIRST);
  assert.deepEqual(result.reason_codes, [EXECUTIVE_FIRST_REASON_CODES.EXECUTIVE_FIRST]);
  assert.equal(result.capability_profile_id, "claude-clevel-worker/cmo/runtime");
  assert.equal(result.evidence.parent_runner_inference, "explicit");
  assert.equal(result.evidence.child_count, 3);
});

test("evaluateExecutiveFirstRouting PASS: sandbox worktree write paths match lane patterns", () => {
  const result = evaluateExecutiveFirstRouting({
    contractFields: buildExecutiveFirstContractFields({
      allowedwritepaths: [
        "[LOCAL_WORKSPACE]",
        "[LOCAL_WORKSPACE]",
      ],
    }),
    labelNames: ["role:cmo"],
    capabilityRegistry: buildExecutiveRegistry({ role: "cmo" }),
  });
  assert.ok(result, "expected sandbox lane routing decision");
  assert.equal(result.decision, SCHEDULER_DECISIONS.LOCK_ALLOWED_EXECUTIVE_FIRST);
});

test("evaluateExecutiveFirstRouting direct-child fallback: tiny bounded item returns null", () => {
  const result = evaluateExecutiveFirstRouting({
    contractFields: buildExecutiveFirstContractFields({
      parent_runner: "none",
      depends_on: ["[WORK_ITEM_ID]"],
      scope: "include one single report under reports/department-executive-runtime/",
    }),
    labelNames: ["role:cmo"],
    capabilityRegistry: buildExecutiveRegistry({ role: "cmo" }),
  });
  assert.equal(result, null, "tiny bounded item must fall through to direct dispatch");
});

test("evaluateExecutiveFirstRouting missing-lane: profile without lanes.department_executive_v0 fails closed", () => {
  const result = evaluateExecutiveFirstRouting({
    contractFields: buildExecutiveFirstContractFields(),
    labelNames: ["role:cmo"],
    capabilityRegistry: buildExecutiveRegistry({ withLane: false, role: "cmo" }),
  });
  assert.ok(result, "expected missing-profile decision");
  assert.equal(result.decision, SCHEDULER_DECISIONS.LOCK_BLOCKED_EXECUTIVE_MISSING_PROFILE);
  assert.deepEqual(result.reason_codes, [EXECUTIVE_FIRST_REASON_CODES.MISSING_PROFILE]);
  assert.equal(result.capability_profile_id, "claude-clevel-worker/cmo/runtime");
  assert.equal(result.evidence.lane_key, EXECUTIVE_LANE_KEY);
});

test("evaluateExecutiveFirstRouting over-budget: ceo_decision_hard_limit > lane default blocks", () => {
  const result = evaluateExecutiveFirstRouting({
    contractFields: buildExecutiveFirstContractFields({
      intervention_budget: {
        ceo_mechanical_target: 0,
        ceo_mechanical_hard_limit: 0,
        ceo_decision_target: 1,
        ceo_decision_hard_limit: 5,
      },
    }),
    labelNames: ["role:cmo"],
    capabilityRegistry: buildExecutiveRegistry({ role: "cmo" }),
  });
  assert.ok(result, "expected over-budget decision");
  assert.equal(result.decision, SCHEDULER_DECISIONS.LOCK_BLOCKED_EXECUTIVE_OVER_BUDGET);
  assert.deepEqual(result.reason_codes, [EXECUTIVE_FIRST_REASON_CODES.OVER_BUDGET]);
  assert.equal(result.evidence.intervention_budget.ceo_decision_hard_limit, 5);
  assert.equal(result.evidence.lane_intervention_budget.ceo_decision_hard_limit, 3);
});

test("evaluateExecutiveFirstRouting over-lane: AllowedWritePaths outside lane scope blocks", () => {
  const result = evaluateExecutiveFirstRouting({
    contractFields: buildExecutiveFirstContractFields({
      allowedwritepaths: [
        "[LOCAL_WORKSPACE]",
        "[LOCAL_WORKSPACE]",
      ],
    }),
    labelNames: ["role:cmo"],
    capabilityRegistry: buildExecutiveRegistry({ role: "cmo" }),
  });
  assert.ok(result, "expected over-lane decision");
  assert.equal(result.decision, SCHEDULER_DECISIONS.LOCK_BLOCKED_EXECUTIVE_OVER_LANE);
  assert.deepEqual(result.reason_codes, [EXECUTIVE_FIRST_REASON_CODES.OVER_LANE]);
  assert.ok(result.evidence.allowed_write_paths.length >= 2);
});

test("evaluateExecutiveFirstRouting anti-trigger A1: role:cao never routes executive-first", () => {
  const result = evaluateExecutiveFirstRouting({
    contractFields: buildExecutiveFirstContractFields({
      role: "role:cao",
      capabilityprofile: "claude-clevel-worker/cao/runtime",
    }),
    labelNames: ["role:cao"],
    capabilityRegistry: buildExecutiveRegistry({ role: "cmo" }),
  });
  assert.equal(result, null);
});

test("evaluateExecutiveFirstRouting anti-trigger A7: non-empty SubAgentRoster falls through", () => {
  const result = evaluateExecutiveFirstRouting({
    contractFields: buildExecutiveFirstContractFields({
      subagentroster: "explorer, worker",
    }),
    labelNames: ["role:cmo"],
    capabilityRegistry: buildExecutiveRegistry({ role: "cmo" }),
  });
  assert.equal(result, null);
});

const EXECUTIVE_FIRST_PASS_CONTRACT = `\`\`\`yaml
role: role:cmo
parent_seat: role:cmo
parent_runner: department-executive-v0
agent: claude
mode: implement
workspace: companyos
dispatch: ready
depends_on:
  - [WORK_ITEM_ID]
  - [WORK_ITEM_ID]
  - [WORK_ITEM_ID]
source_of_truth:
  - [LOCAL_WORKSPACE]
scope:
  - include supervise parent objective and coordinate children plus closeout report
  - exclude production systems
sandbox: required
allowed_write_paths:
  - [LOCAL_WORKSPACE]
  - [LOCAL_WORKSPACE]
capabilityprofile: claude-clevel-worker/cmo/runtime
outcomespec: Executive supervises children and produces closeout report.
outcomerubric: PASS if closeout report carries the child_status_rollup block.
acceptance_criteria:
  - Closeout report filed under reports/department-executive-runtime/ and rollup verified.
gates:
  - node --test scripts/orchestration/scheduler-stage-0506-core.test.mjs
human_gate: HG-2
reporting: Plane worker.reported with subagents: [].
subagentroster: none
blocked_actions: no plane-done-by-worker, no push, no merge, no deploy, no publish, no schedule, no send, no import, no capability-profile-expansion, no runtime-auth-expansion
runtimeauth: claude max local auth present
maxruntime: 900s
maxspend: EUR 0
killswitch: runtime/killswitch/COMPA-test.stop
heartbeat: 60s
intervention_budget:
  ceo_mechanical_target: 0
  ceo_mechanical_hard_limit: 0
  ceo_decision_target: 1
  ceo_decision_hard_limit: 3
\`\`\``;

function executiveItem(description = EXECUTIVE_FIRST_PASS_CONTRACT, name = "Marketing Parent Objective") {
  return {
    id: "item-exec-1",
    sequence_id: 341,
    name,
    description_html: `<pre><code>${description}</code></pre>`,
  };
}

test("decideSchedulerStage0506 returns LOCK_ALLOWED_EXECUTIVE_FIRST and emits controller.executive-routing evidence", () => {
  const decision = decideSchedulerStage0506({
    item: executiveItem(),
    labelNames: ["role:cmo"],
    capabilityRegistry: buildExecutiveRegistry({ role: "cmo" }),
    reviewer: "scheduler",
    now: new Date("2026-05-23T12:00:00.000Z"),
  });
  assert.equal(decision.contract_review.verdict, "CONTRACT_PASS");
  assert.equal(decision.allow_lock, true);
  assert.equal(decision.decision, SCHEDULER_DECISIONS.LOCK_ALLOWED_EXECUTIVE_FIRST);
  assert.equal(decision.executive_routing.decision, SCHEDULER_DECISIONS.LOCK_ALLOWED_EXECUTIVE_FIRST);
  assert.deepEqual(decision.executive_routing.reason_codes, [EXECUTIVE_FIRST_REASON_CODES.EXECUTIVE_FIRST]);
  assert.equal(decision.executive_routing.capability_profile_id, "claude-clevel-worker/cmo/runtime");
  const last = decision.comments_to_post.at(-1);
  assert.equal(last.title, EXECUTIVE_ROUTING_TITLE);
  assert.match(last.yaml, /decision: lock-allowed-executive-first/);
  assert.match(last.yaml, /allow_lock: true/);
  assert.match(last.yaml, /capability_profile: claude-clevel-worker\/cmo\/runtime/);
  assert.match(last.yaml, /reason_codes: scheduler\.executive-first-routing/);
});

test("decideSchedulerStage0506 blocks lock with executive-missing-profile when lane block is absent", () => {
  const decision = decideSchedulerStage0506({
    item: executiveItem(),
    labelNames: ["role:cmo"],
    capabilityRegistry: buildExecutiveRegistry({ withLane: false, role: "cmo" }),
    now: new Date("2026-05-23T12:00:00.000Z"),
  });
  assert.equal(decision.allow_lock, false);
  assert.equal(decision.decision, SCHEDULER_DECISIONS.LOCK_BLOCKED_EXECUTIVE_MISSING_PROFILE);
  assert.equal(decision.executive_routing.decision, SCHEDULER_DECISIONS.LOCK_BLOCKED_EXECUTIVE_MISSING_PROFILE);
  assert.deepEqual(decision.executive_routing.reason_codes, [EXECUTIVE_FIRST_REASON_CODES.MISSING_PROFILE]);
  assert.match(
    decision.comments_to_post.at(-1).yaml,
    /reason_codes: scheduler\.executive-missing-profile/,
  );
});

test("decideSchedulerStage0506 blocks lock with executive-over-budget when intervention_budget exceeds lane defaults", () => {
  const overBudget = EXECUTIVE_FIRST_PASS_CONTRACT.replace(
    "ceo_decision_hard_limit: 3",
    "ceo_decision_hard_limit: 5",
  );
  const decision = decideSchedulerStage0506({
    item: executiveItem(overBudget),
    labelNames: ["role:cmo"],
    capabilityRegistry: buildExecutiveRegistry({ role: "cmo" }),
    now: new Date("2026-05-23T12:00:00.000Z"),
  });
  assert.equal(decision.allow_lock, false);
  assert.equal(decision.decision, SCHEDULER_DECISIONS.LOCK_BLOCKED_EXECUTIVE_OVER_BUDGET);
  assert.deepEqual(decision.executive_routing.reason_codes, [EXECUTIVE_FIRST_REASON_CODES.OVER_BUDGET]);
  assert.equal(decision.executive_routing.evidence.intervention_budget.ceo_decision_hard_limit, 5);
  assert.match(
    decision.comments_to_post.at(-1).yaml,
    /decision: lock-blocked-executive-over-budget/,
  );
});

test("decideSchedulerStage0506 blocks lock with executive-over-lane when AllowedWritePaths leak outside the lane", () => {
  const outOfLane = EXECUTIVE_FIRST_PASS_CONTRACT.replace(
    "  - [LOCAL_WORKSPACE]",
    "  - [LOCAL_WORKSPACE]",
  );
  const decision = decideSchedulerStage0506({
    item: executiveItem(outOfLane),
    labelNames: ["role:cmo"],
    capabilityRegistry: buildExecutiveRegistry({ role: "cmo" }),
    now: new Date("2026-05-23T12:00:00.000Z"),
  });
  assert.equal(decision.allow_lock, false);
  assert.equal(decision.decision, SCHEDULER_DECISIONS.LOCK_BLOCKED_EXECUTIVE_OVER_LANE);
  assert.deepEqual(decision.executive_routing.reason_codes, [EXECUTIVE_FIRST_REASON_CODES.OVER_LANE]);
  assert.match(
    decision.comments_to_post.at(-1).yaml,
    /decision: lock-blocked-executive-over-lane/,
  );
});

test("decideSchedulerStage0506 keeps historical LOCK_ALLOWED direct path for tiny bounded non-parent items", () => {
  const decision = decideSchedulerStage0506({
    item: makeItem(),
    labelNames: ["role:cto"],
    capabilityRegistry: buildExecutiveRegistry({ role: "cto" }),
  });
  assert.equal(decision.allow_lock, true);
  assert.equal(decision.decision, SCHEDULER_DECISIONS.LOCK_ALLOWED);
  assert.equal(decision.executive_routing, null);
  assert.equal(decision.comments_to_post.length, 1);
  assert.equal(decision.comments_to_post[0].title, "controller.contract-review");
});

test("extractInterventionBudgetBlock parses nested YAML children into a numeric object", () => {
  const parsed = extractInterventionBudgetBlock(
    "role: role:cmo\nintervention_budget:\n  ceo_mechanical_target: 0\n  ceo_decision_hard_limit: 5\n  notes: keep-low\nhuman_gate: HG-2\n",
  );
  assert.deepEqual(parsed, {
    ceo_mechanical_target: 0,
    ceo_decision_hard_limit: 5,
    notes: "keep-low",
  });
});

test("buildExecutiveRoutingYaml produces a stable comment shape for dedupe", () => {
  const yaml = buildExecutiveRoutingYaml({
    routing: {
      decision: SCHEDULER_DECISIONS.LOCK_ALLOWED_EXECUTIVE_FIRST,
      reason_codes: [EXECUTIVE_FIRST_REASON_CODES.EXECUTIVE_FIRST],
      capability_profile_id: "claude-clevel-worker/cmo/runtime",
      evidence: {
        child_count: 3,
        child_count_threshold: 3,
        parent_runner_inference: "explicit",
      },
    },
    item: { id: "x", sequence_id: 341, _project_identifier: "COMPA" },
    reviewer: "scheduler-test",
    descriptionHash: "abc123",
    signedAt: "2026-05-23T12:00:00.000Z",
  });
  assert.match(yaml, /^controller\.executive-routing:/);
  assert.match(yaml, /work_item: [WORK_ITEM_ID]/);
  assert.match(yaml, /decision: lock-allowed-executive-first/);
  assert.match(yaml, /allow_lock: true/);
  assert.match(yaml, /capability_profile: claude-clevel-worker\/cmo\/runtime/);
  assert.match(yaml, /reason_codes: scheduler\.executive-first-routing/);
  assert.match(yaml, /description_hash: abc123/);
  assert.match(yaml, /child_count: 3/);
  assert.match(yaml, /parent_runner_inference: explicit/);
  assert.match(yaml, /signed_at: 2026-05-23T12:00:00\.000Z/);
});

test("comments_to_post YAML stays stable for downstream Plane post-mode CLIs", () => {
  const decision = decideSchedulerStage0506({
    item: makeItem(),
    labelNames: ["role:cto"],
    reviewer: "scheduler-test",
    now: new Date("2026-05-11T07:00:00.000Z"),
  });
  assert.equal(decision.comments_to_post.length, 1);
  assert.match(decision.comments_to_post[0].yaml, /^controller\.contract-review:/);
  assert.match(decision.comments_to_post[0].yaml, /reviewer: scheduler-test/);
  assert.match(decision.comments_to_post[0].yaml, /signed_at: 2026-05-11T07:00:00\.000Z/);
});
