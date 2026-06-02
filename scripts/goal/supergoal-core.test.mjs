import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSupergoalPlan,
  renderSupergoalPlanMarkdown,
} from "./supergoal-core.mjs";

function contract({
  role = "role:cto",
  parentSeat = "role:cpo",
  agent = "claude",
  mode = "plan",
  dispatch = "ready",
  humanGate = "HG-2",
} = {}) {
  return [
    "```yaml",
    `role: ${role}`,
    `parent_seat: ${parentSeat}`,
    `agent: ${agent}`,
    `mode: ${mode}`,
    "workspace: /tmp/company-os-test",
    `dispatch: ${dispatch}`,
    "source_of_truth:",
    "  - docs/orchestration/goal-runtime-plane-loop.md",
    "acceptance_criteria:",
    "  - Pass the bounded worker contract.",
    "gates:",
    "  - node --test scripts/goal/supergoal-core.test.mjs",
    `human_gate: ${humanGate}`,
    "reporting: Plane worker.reported with changed files, commands, results, blockers, reflection and learning_proposals.",
    "BlockedActions: do not deploy; do not push; do not mark Plane Done",
    "ReflectionPolicy: required",
    "LearningProposalPolicy: required",
    "```",
  ].join("\n");
}

function item({
  id,
  sequence,
  name,
  parent = "",
  labels = ["role:cto"],
  description = contract(),
  state = { name: "Backlog", group: "backlog" },
} = {}) {
  return {
    id,
    sequence_id: sequence,
    name,
    parent,
    labels,
    description,
    state,
  };
}

test("buildSupergoalPlan blocks without a root parent", () => {
  const plan = buildSupergoalPlan({ root: null });

  assert.equal(plan.ok, false);
  assert.equal(plan.status, "BLOCKED_DEPENDENCY");
  assert.deepEqual(plan.reason_codes, ["parent.not-found"]);
});

test("buildSupergoalPlan selects ready leaves and does not select parent containers", () => {
  const root = item({
    id: "root",
    sequence: 506,
    name: "[SUPER-GOAL] Personal Bio.OS Intelligence Layer",
    labels: ["role:cpo"],
    description: "",
  });
  const pillar = item({
    id: "pillar-a",
    sequence: 510,
    name: "Pillar A Super-Dashboard",
    parent: "root",
    labels: ["role:cpo"],
    description: contract({ role: "role:cpo", parentSeat: "role:cpo" }),
  });
  const child = item({
    id: "child-a",
    sequence: 511,
    name: "A-reconcile live views",
    parent: "pillar-a",
    labels: ["role:cto"],
    description: contract({ role: "role:cto", parentSeat: "role:cpo", mode: "audit" }),
  });

  const plan = buildSupergoalPlan({
    root,
    items: [root, pillar, child],
    projectIdentifier: "ATLAS",
    maxChildren: 1,
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.status, "READY_FOR_CONTROLLER_LOOP");
  assert.equal(plan.summary.parent_containers, 1);
  assert.deepEqual(plan.selected.map((row) => row.ref), ["[WORK_ITEM_ID]"]);
  assert.equal(plan.blocked.find((row) => row.ref === "[WORK_ITEM_ID]").reason_codes.includes("supergoal.parent-has-children"), true);
});

test("buildSupergoalPlan queues HG-4 for Founder instead of selecting it", () => {
  const root = item({ id: "root", sequence: 506, name: "Root", labels: ["role:cpo"], description: "" });
  const founderChild = item({
    id: "founder",
    sequence: 548,
    name: "E-handoff practitioner broker",
    parent: "root",
    labels: ["role:cao"],
    description: contract({ role: "role:cao", parentSeat: "role:cpo", mode: "review", humanGate: "HG-4" }),
  });

  const plan = buildSupergoalPlan({
    root,
    items: [root, founderChild],
    projectIdentifier: "ATLAS",
  });

  assert.equal(plan.status, "NEEDS_HUMAN");
  assert.deepEqual(plan.selected, []);
  assert.deepEqual(plan.hg4_queue.map((row) => row.ref), ["[WORK_ITEM_ID]"]);
});

test("buildSupergoalPlan selects manual reconcile contracts for Stage 0.5 before worker runtime", () => {
  const root = item({ id: "root", sequence: 506, name: "Root", labels: ["role:cpo"], description: "" });
  const regular = item({
    id: "regular",
    sequence: 508,
    name: "Park superseded native Swift lane",
    parent: "root",
    labels: ["role:coo"],
    description: contract({ role: "role:coo", parentSeat: "role:cpo", mode: "audit", dispatch: "manual" }),
  });
  const reconcile = item({
    id: "reconcile",
    sequence: 552,
    name: "F-reconcile ledger substrate",
    parent: "root",
    labels: ["role:cto"],
    description: contract({ role: "role:cto", parentSeat: "role:cpo", mode: "audit", dispatch: "manual" }),
  });

  const plan = buildSupergoalPlan({
    root,
    items: [root, regular, reconcile],
    projectIdentifier: "ATLAS",
    maxChildren: 1,
  });

  assert.equal(plan.status, "READY_FOR_STAGE_05_REVIEW");
  assert.deepEqual(plan.selected, []);
  assert.deepEqual(plan.stage05_selected.map((row) => row.ref), ["[WORK_ITEM_ID]"]);
  assert.equal(plan.planned_passes[0].stage, "stage-05-contract-review");
});

test("buildSupergoalPlan keeps HG-3 in CEO/Codex runnable lane", () => {
  const root = item({ id: "root", sequence: 506, name: "Root", labels: ["role:cpo"], description: "" });
  const ceoChild = item({
    id: "ceo",
    sequence: 542,
    name: "D-cao external MCP release packet",
    parent: "root",
    labels: ["role:cao"],
    description: contract({ role: "role:cao", parentSeat: "role:cpo", mode: "review", humanGate: "HG-3" }),
  });

  const plan = buildSupergoalPlan({
    root,
    items: [root, ceoChild],
    projectIdentifier: "ATLAS",
  });

  assert.equal(plan.status, "READY_FOR_CONTROLLER_LOOP");
  assert.equal(plan.selected[0].gate_class, "ceo_codex");
  assert.equal(plan.selected[0].model_route.model_class, "opus-4.8-1m-max");
});

test("renderSupergoalPlanMarkdown exposes policy queues", () => {
  const root = item({ id: "root", sequence: 506, name: "Root", labels: ["role:cpo"], description: "" });
  const child = item({
    id: "child",
    sequence: 507,
    name: "spine-reconcile-state",
    parent: "root",
    labels: ["role:cto"],
    description: contract({ role: "role:cto", parentSeat: "role:cpo", mode: "audit" }),
  });

  const markdown = renderSupergoalPlanMarkdown(buildSupergoalPlan({
    root,
    items: [root, child],
    projectIdentifier: "ATLAS",
  }));

  assert.match(markdown, /^# Supergoal Plan - [WORK_ITEM_ID]/m);
  assert.match(markdown, /HG-4 Founder Queue/);
  assert.match(markdown, /[WORK_ITEM_ID]/);
});
