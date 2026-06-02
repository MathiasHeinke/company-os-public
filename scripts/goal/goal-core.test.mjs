import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildGoalMaterialization,
  buildGoalState,
  normalizeRoleLabel,
  planGoalMaterializationApply,
  planGoalRun,
  renderGoalMaterializationMarkdown,
  renderGoalMarkdown,
  renderWorkerContract,
  slugifyGoalTitle,
  writeGoalDraft,
  writeGoalMaterialization,
} from "./goal-core.mjs";
import { validateContract } from "../orchestration/worker-ledger-validator.mjs";
import { stripHtml } from "../orchestration/plane-html.mjs";

test("slugifyGoalTitle creates deterministic report slugs", () => {
  assert.equal(slugifyGoalTitle("Founder Daily Queue: HG-3.5 Review!"), "founder-daily-queue-hg-3-5-review");
  assert.equal(slugifyGoalTitle("   "), "goal");
});

test("normalizeRoleLabel accepts short and canonical role labels", () => {
  assert.equal(normalizeRoleLabel("cto"), "role:cto");
  assert.equal(normalizeRoleLabel("role:coo"), "role:coo");
  assert.equal(normalizeRoleLabel("Role-CMO"), "role:cmo");
  assert.equal(normalizeRoleLabel("legal"), "");
});

test("buildGoalState requires title, outcome and valid role", () => {
  assert.throws(
    () => buildGoalState({ title: "Missing outcome", role: "role:cto" }),
    /outcome is required/,
  );
  assert.throws(
    () => buildGoalState({ title: "Bad role", outcome: "Do it", role: "role:legal" }),
    /role must be one of/,
  );
});

test("buildGoalState normalizes GoalState and first worker contract fields", () => {
  const goal = buildGoalState({
    date: "2026-05-13",
    title: "Ship Founder Daily Queue",
    outcome: "Founder can review HG-4 items and Chief-of-Staff can review HG-3.5 items from one queue.",
    role: "coo",
    source: ["docs/orchestration/codex-controller-runtime.md"],
    metric: ["Queue has no more than 10 items."],
    acceptance: ["Generated queue includes sign and reject templates."],
    gate: ["node --test scripts/goal/goal-core.test.mjs"],
  });

  assert.equal(goal.id, "goal-2026-05-13-ship-founder-daily-queue");
  assert.equal(goal.role_label, "role:coo");
  assert.equal(goal.dispatch, "manual");
  assert.deepEqual(goal.metrics, ["Queue has no more than 10 items."]);
  assert.deepEqual(goal.source_of_truth, ["docs/orchestration/codex-controller-runtime.md"]);
});

test("renderWorkerContract emits the flat parseable worker contract shape", () => {
  const goal = buildGoalState({
    date: "2026-05-13",
    title: "Relay v0",
    outcome: "Read-only relay journals Plane comment events.",
    role: "role:cto",
  });

  const contract = renderWorkerContract(goal);

  assert.match(contract, /^```yaml/m);
  assert.match(contract, /^role: role:cto$/m);
  assert.match(contract, /^parent_seat: role:cto$/m);
  assert.match(contract, /^source_of_truth:$/m);
  assert.match(contract, /^acceptance_criteria:$/m);
  assert.match(contract, /^gates:$/m);
  assert.match(contract, /^human_gate: HG-2$/m);
  assert.match(contract, /ReflectionPolicy: required/);
  assert.match(contract, /LearningProposalPolicy: required/);
});

test("renderGoalMarkdown includes GoalState, ObjectiveLoop and next action", () => {
  const goal = buildGoalState({
    date: "2026-05-13",
    title: "Capability Registry Sandbox Patterns",
    outcome: "Sandbox paths resolve through durable registry patterns.",
    role: "role:cto",
    risk: ["Path traversal must reject."],
  });

  const markdown = renderGoalMarkdown(goal);

  assert.match(markdown, /^# Goal Command Draft - Capability Registry Sandbox Patterns/m);
  assert.match(markdown, /## GoalState/);
  assert.match(markdown, /```goalstate/);
  assert.match(markdown, /## ObjectiveLoop/);
  assert.match(markdown, /## First Worker Contract Draft/);
  assert.match(markdown, /Path traversal must reject/);
  assert.match(markdown, /Do not dispatch until the contract controller returns `CONTRACT_PASS`/);
});

test("renderGoalMarkdown keeps GoalState out of dispatcher parsing and exposes the worker contract", () => {
  const goal = buildGoalState({
    date: "2026-05-13",
    title: "Validate Goal Contract",
    outcome: "The generated worker contract is parseable by the dispatcher validator.",
    role: "role:coo",
  });

  const result = validateContract({
    description: renderGoalMarkdown(goal),
    labels: ["role:coo"],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.reason_codes, ["contract.dispatch-not-ready"]);
});

test("writeGoalDraft writes markdown and JSON artifacts", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "company-os-goal-test-"));
  const goal = buildGoalState({
    date: "2026-05-13",
    title: "Goal Command",
    outcome: "Generate a reviewable goal draft.",
    role: "role:coo",
  });

  const output = writeGoalDraft({ workspaceRoot: root, goal });

  assert.equal(fs.existsSync(output.reportPath), true);
  assert.equal(fs.existsSync(output.jsonPath), true);
  assert.match(fs.readFileSync(output.reportPath, "utf8"), /Goal Command Draft - Goal Command/);
  assert.equal(JSON.parse(fs.readFileSync(output.jsonPath, "utf8")).id, "goal-2026-05-13-goal-command");
});

test("buildGoalMaterialization emits parent and child Plane payloads", () => {
  const goal = buildGoalState({
    date: "2026-05-13",
    title: "Goal Runtime",
    outcome: "Plane can materialize parent and child payloads.",
    role: "role:coo",
    source: ["docs/orchestration/goal-runtime-plane-loop.md"],
  });

  const materialization = buildGoalMaterialization({
    goal,
    projectId: "project-1",
    labelMap: {
      labels: [
        { name: "role:coo", id: "label-coo" },
        { name: "role:cto", id: "label-cto" },
      ],
    },
    children: [
      { title: "Build materializer", role: "role:cto", mode: "implement" },
    ],
  });

  assert.equal(materialization.version, "goal-materialize/v0");
  assert.equal(materialization.parent.payload.name, "Goal: Goal Runtime");
  assert.deepEqual(materialization.parent.payload.labels, ["label-coo"]);
  assert.equal(materialization.children.length, 1);
  assert.deepEqual(materialization.children[0].payload.labels, ["label-cto"]);
  assert.equal(materialization.warnings.length, 0);
});

test("materialized child description remains dispatcher-parseable and manual", () => {
  const materialization = buildGoalMaterialization({
    date: "2026-05-13",
    title: "Validate Child",
    outcome: "Child contract survives Plane HTML.",
    role: "role:coo",
    children: [{ title: "Implement child", role: "role:cto" }],
  });

  const description = stripHtml(materialization.children[0].payload.description_html);
  const result = validateContract({ description, labels: ["role:cto"] });

  assert.equal(result.ok, false);
  assert.deepEqual(result.reason_codes, ["contract.dispatch-not-ready"]);
});

test("renderGoalMaterializationMarkdown and writeGoalMaterialization expose payload artifacts", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "company-os-goal-materialize-test-"));
  const materialization = buildGoalMaterialization({
    date: "2026-05-13",
    title: "Materialize Goal",
    outcome: "Write payload artifacts.",
    role: "role:coo",
  });

  const markdown = renderGoalMaterializationMarkdown(materialization);
  assert.match(markdown, /^# Goal Materialization Plan - Materialize Goal/m);
  assert.match(markdown, /## Parent Payload/);
  assert.match(markdown, /## Child Payloads/);

  const output = writeGoalMaterialization({ workspaceRoot: root, materialization });
  assert.equal(fs.existsSync(output.reportPath), true);
  assert.equal(fs.existsSync(output.jsonPath), true);
  assert.equal(JSON.parse(fs.readFileSync(output.jsonPath, "utf8")).version, "goal-materialize/v0");
});

test("planGoalMaterializationApply creates missing parent and children", () => {
  const materialization = buildGoalMaterialization({
    date: "2026-05-13",
    title: "Apply Goal",
    outcome: "Create parent and child.",
    role: "role:coo",
    projectId: "project-1",
    labelMap: { labels: [{ name: "role:coo", id: "coo" }] },
  });

  const plan = planGoalMaterializationApply({ materialization, existingItems: [] });

  assert.equal(plan.ok, true);
  assert.equal(plan.parent.action, "create");
  assert.equal(plan.children[0].action, "create");
  assert.equal(plan.summary.create, 2);
});

test("planGoalMaterializationApply keeps existing parent and patches unlinked children", () => {
  const materialization = buildGoalMaterialization({
    date: "2026-05-13",
    title: "Existing Goal",
    outcome: "Link child.",
    role: "role:coo",
    projectId: "project-1",
    labelMap: { labels: [{ name: "role:coo", id: "coo" }] },
  });

  const existingItems = [
    { id: "parent-1", name: materialization.parent.payload.name },
    { id: "child-1", name: materialization.children[0].payload.name, parent: "other-parent" },
  ];
  const plan = planGoalMaterializationApply({ materialization, existingItems });

  assert.equal(plan.ok, true);
  assert.equal(plan.parent.action, "keep");
  assert.equal(plan.children[0].action, "patch-parent");
  assert.equal(plan.summary.patch_parent, 1);
});

test("planGoalMaterializationApply patches existing children when parent will be created", () => {
  const materialization = buildGoalMaterialization({
    date: "2026-05-13",
    title: "New Parent Existing Child",
    outcome: "Create parent and relink child.",
    role: "role:coo",
    projectId: "project-1",
    labelMap: { labels: [{ name: "role:coo", id: "coo" }] },
  });

  const existingItems = [
    { id: "child-1", name: materialization.children[0].payload.name, parent: "old-parent" },
  ];
  const plan = planGoalMaterializationApply({ materialization, existingItems });

  assert.equal(plan.ok, true);
  assert.equal(plan.parent.action, "create");
  assert.equal(plan.children[0].action, "patch-parent");
  assert.equal(plan.summary.create, 1);
  assert.equal(plan.summary.patch_parent, 1);
});

test("planGoalMaterializationApply rejects missing project id and label warnings", () => {
  const materialization = buildGoalMaterialization({
    date: "2026-05-13",
    title: "Blocked Goal",
    outcome: "Reject apply.",
    role: "role:coo",
  });

  const plan = planGoalMaterializationApply({ materialization, existingItems: [] });

  assert.equal(plan.ok, false);
  assert.match(plan.errors.join("\n"), /plane.project_id is required/);
  assert.match(plan.errors.join("\n"), /label id missing for role:coo/);
});

test("planGoalRun blocks when child contracts are not dispatch-ready", () => {
  const plan = planGoalRun({
    parent: { id: "parent-1", sequence_id: 190, name: "Goal: Runtime", labels: ["role:coo"] },
    children: [{
      id: "child-1",
      sequence_id: 191,
      name: "Implement runner",
      labels: ["role:cto"],
      contract: { ok: false, reason_codes: ["contract.dispatch-not-ready"] },
      contract_fields: { dispatch: "manual", agent: "claude", mode: "implement" },
    }],
    maxChildren: 1,
    projectIdentifier: "COMPA",
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.status, "BLOCKED_DEPENDENCY");
  assert.deepEqual(plan.selected, []);
  assert.equal(plan.blocked[0].ref, "[WORK_ITEM_ID]");
  assert.deepEqual(plan.reason_codes, ["contract.dispatch-not-ready"]);
});

test("planGoalRun selects only the requested number of ready children", () => {
  const plan = planGoalRun({
    parent: { id: "parent-1", sequence_id: 190, name: "Goal: Runtime", labels: ["role:coo"] },
    children: [
      {
        id: "child-1",
        sequence_id: 191,
        name: "Ready one",
        labels: ["role:cto"],
        contract: { ok: true, reason_codes: [] },
        contract_fields: { dispatch: "ready", agent: "claude", mode: "implement" },
      },
      {
        id: "child-2",
        sequence_id: 192,
        name: "Ready two",
        labels: ["role:cpo"],
        contract: { ok: true, reason_codes: [] },
        contract_fields: { dispatch: "ready", agent: "claude", mode: "plan" },
      },
    ],
    maxChildren: 1,
    projectIdentifier: "COMPA",
  });

  assert.equal(plan.status, "READY");
  assert.equal(plan.selected.length, 1);
  assert.equal(plan.selected[0].ref, "[WORK_ITEM_ID]");
  assert.equal(plan.queued.length, 1);
  assert.equal(plan.queued[0].ref, "[WORK_ITEM_ID]");
});

test("planGoalRun skips completed children and reports complete", () => {
  const plan = planGoalRun({
    parent: { id: "parent-1", sequence_id: 190, name: "Goal: Runtime", labels: ["role:coo"] },
    children: [{
      id: "child-1",
      sequence_id: 191,
      name: "Done child",
      state: { name: "Done", group: "completed" },
      labels: ["role:cto"],
      contract: { ok: true, reason_codes: [] },
      contract_fields: { dispatch: "ready" },
    }],
    projectIdentifier: "COMPA",
  });

  assert.equal(plan.status, "COMPLETE");
  assert.deepEqual(plan.reason_codes, ["child.all-done"]);
  assert.equal(plan.skipped[0].ref, "[WORK_ITEM_ID]");
});

test("planGoalRun skips controller AUTO-GO children even before Plane Done", () => {
  const plan = planGoalRun({
    parent: { id: "parent-1", sequence_id: 190, name: "Goal: Runtime", labels: ["role:coo"] },
    children: [
      {
        id: "child-1",
        sequence_id: 191,
        name: "Already accepted",
        state: { name: "Backlog", group: "backlog" },
        labels: ["role:cto"],
        contract: { ok: true, reason_codes: [] },
        contract_fields: { dispatch: "ready" },
        goal_completion: {
          complete: true,
          integration_status: "controller:auto-go",
          controller_decision: "AUTO-GO",
        },
      },
      {
        id: "child-2",
        sequence_id: 192,
        name: "Next ready child",
        labels: ["role:cto"],
        contract: { ok: true, reason_codes: [] },
        contract_fields: { dispatch: "ready" },
      },
    ],
    projectIdentifier: "COMPA",
  });

  assert.equal(plan.status, "READY");
  assert.equal(plan.selected[0].ref, "[WORK_ITEM_ID]");
  assert.equal(plan.skipped[0].ref, "[WORK_ITEM_ID]");
  assert.equal(plan.skipped[0].complete, true);
  assert.equal(plan.skipped[0].done, false);
  assert.equal(plan.skipped[0].integration_status, "controller:auto-go");
  assert.deepEqual(plan.skipped[0].reason_codes, ["child.controller-auto-go"]);
});
