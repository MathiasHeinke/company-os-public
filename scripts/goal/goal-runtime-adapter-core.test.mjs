import assert from "node:assert/strict";
import test from "node:test";

import { buildGoalRuntimeAdapter } from "./goal-runtime-adapter-core.mjs";

const WORK_ITEM = {
  id: "item-1",
  sequence_id: 194,
  name: "Goal Runtime Slice 4 - Runtime goal adapter",
};

const CONTRACT = {
  role: "role:cto",
  agent: "claude",
  mode: "implement",
  workspace: "${LOCAL_WORKSPACE}",
  dispatch: "ready",
  acceptance_criteria: [
    "Claude prompt wrapper includes child acceptance criteria, gates and stop conditions.",
    "Fallback worker prompt exists when goal primitive is unavailable.",
  ],
  gates: [
    "node --test scripts/goal/goal-runtime-adapter-core.test.mjs",
  ],
  human_gate: "HG-2.5",
  blockedactions: "never mark Plane Done; never deploy",
};

test("buildGoalRuntimeAdapter emits a bounded Claude goal wrapper", () => {
  const adapter = buildGoalRuntimeAdapter({
    workItem: WORK_ITEM,
    contractFields: CONTRACT,
    contractValidation: { ok: true, reason_codes: [] },
    description: "Worker description",
    runtime: "claude",
    maxTurns: 12,
  });

  assert.equal(adapter.version, "goal-runtime-adapter/v0");
  assert.equal(adapter.can_start, true);
  assert.equal(adapter.work_item.ref, "[WORK_ITEM_ID]");
  assert.match(adapter.prompt, /^\/goal /);
  assert.match(adapter.goal_condition, /Complete only Plane child [WORK_ITEM_ID]/);
  assert.match(adapter.goal_condition, /Claude prompt wrapper includes child acceptance criteria/);
  assert.match(adapter.goal_condition, /CEO\/Codex release packet/);
  assert.doesNotMatch(adapter.goal_condition, /NEEDS_HUMAN/);
  assert.match(adapter.prompt, /Work only on this selected child item/);
  assert.match(adapter.prompt, /worker.reported/);
  assert.deepEqual(adapter.command_preview.slice(0, 2), ["claude", "-p"]);
  assert.equal(adapter.command_preview.includes("--max-turns"), true);
  assert.equal(adapter.command_preview.includes("--effort"), true);
});

test("buildGoalRuntimeAdapter defaults Claude command preview to verified Opus alias", () => {
  const adapter = buildGoalRuntimeAdapter({
    workItem: WORK_ITEM,
    contractFields: CONTRACT,
    contractValidation: { ok: true, reason_codes: [] },
    description: "Worker description",
    runtime: "claude",
  });

  const modelIndex = adapter.command_preview.indexOf("--model");
  assert.notEqual(modelIndex, -1);
  assert.equal(adapter.command_preview[modelIndex + 1], "opus");
});

test("buildGoalRuntimeAdapter can request Claude max effort", () => {
  const adapter = buildGoalRuntimeAdapter({
    workItem: WORK_ITEM,
    contractFields: CONTRACT,
    contractValidation: { ok: true, reason_codes: [] },
    runtime: "claude",
    effort: "max",
  });

  const effortIndex = adapter.command_preview.indexOf("--effort");
  assert.notEqual(effortIndex, -1);
  assert.equal(adapter.command_preview[effortIndex + 1], "max");
  assert.equal(adapter.effort, "max");
});

test("buildGoalRuntimeAdapter gates dynamic workflows behind declared subagent roster", () => {
  const blocked = buildGoalRuntimeAdapter({
    workItem: WORK_ITEM,
    contractFields: CONTRACT,
    contractValidation: { ok: true, reason_codes: [] },
    runtime: "claude",
  });

  assert.equal(blocked.dynamic_workflow_policy.allowed, false);
  assert.ok(blocked.dynamic_workflow_policy.blocked_reasons.includes("subagent-roster-missing"));

  const allowed = buildGoalRuntimeAdapter({
    workItem: WORK_ITEM,
    contractFields: {
      ...CONTRACT,
      subagentroster: "audit-a, audit-b",
      maxsubagents: "100",
    },
    contractValidation: { ok: true, reason_codes: [] },
    runtime: "claude",
  });

  assert.equal(allowed.dynamic_workflow_policy.allowed, true);
  assert.equal(allowed.dynamic_workflow_policy.max_subagents, 100);
  assert.match(allowed.prompt, /Do not spawn dynamic subagents unless/);
});

test("buildGoalRuntimeAdapter blocks dynamic workflows on HG-4", () => {
  const adapter = buildGoalRuntimeAdapter({
    workItem: WORK_ITEM,
    contractFields: {
      ...CONTRACT,
      human_gate: "HG-4",
      subagentroster: "care-reviewer, claims-reviewer",
      maxsubagents: "20",
    },
    contractValidation: { ok: true, reason_codes: [] },
    runtime: "claude",
  });

  assert.equal(adapter.dynamic_workflow_policy.allowed, false);
  assert.ok(adapter.dynamic_workflow_policy.blocked_reasons.includes("hg4-founder-required"));
});

test("buildGoalRuntimeAdapter uses RuntimePermissionMode from contract fields", () => {
  const adapter = buildGoalRuntimeAdapter({
    workItem: WORK_ITEM,
    contractFields: { ...CONTRACT, runtimepermissionmode: "acceptEdits" },
    contractValidation: { ok: true, reason_codes: [] },
    description: "Worker description",
    runtime: "claude",
  });

  const permissionIndex = adapter.command_preview.indexOf("--permission-mode");
  assert.notEqual(permissionIndex, -1);
  assert.equal(adapter.command_preview[permissionIndex + 1], "acceptEdits");
});

test("buildGoalRuntimeAdapter blocks start when contract validator blocks", () => {
  const adapter = buildGoalRuntimeAdapter({
    workItem: WORK_ITEM,
    contractFields: { ...CONTRACT, dispatch: "manual" },
    contractValidation: { ok: false, reason_codes: ["contract.dispatch-not-ready"] },
    runtime: "claude",
  });

  assert.equal(adapter.can_start, false);
  assert.deepEqual(adapter.blocked_reasons, ["contract.dispatch-not-ready"]);
  assert.match(adapter.fallback_prompt, /^Goal fallback, no managed goal primitive available:/);
});

test("buildGoalRuntimeAdapter marks Codex goal feature gate and smoke requirement", () => {
  const adapter = buildGoalRuntimeAdapter({
    workItem: WORK_ITEM,
    contractFields: { ...CONTRACT, agent: "codex" },
    contractValidation: { ok: true, reason_codes: [] },
    runtime: "codex",
  });

  assert.equal(adapter.runtime, "codex");
  assert.equal(adapter.feature_gates.some((gate) => gate.includes("features")), true);
  assert.equal(adapter.smoke_tests.length, 1);
  assert.match(adapter.prompt, /Runtime agent: codex/);
  assert.match(adapter.prompt, /Contract agent: codex/);
  assert.deepEqual(adapter.command_preview.slice(0, 4), ["codex", "exec", "--cd", CONTRACT.workspace]);
});

test("buildGoalRuntimeAdapter shows runtime override separately from contract agent", () => {
  const adapter = buildGoalRuntimeAdapter({
    workItem: WORK_ITEM,
    contractFields: { ...CONTRACT, agent: "claude" },
    contractValidation: { ok: true, reason_codes: [] },
    runtime: "codex",
  });

  assert.equal(adapter.runtime, "codex");
  assert.match(adapter.prompt, /Runtime agent: codex/);
  assert.match(adapter.prompt, /Contract agent: claude/);
});

// ---- raindrop_hook tests (RS-04) ----

test("buildGoalRuntimeAdapter exposes raindrop_hook with goal-runtime/worker-run surface", () => {
  const adapter = buildGoalRuntimeAdapter({
    workItem: WORK_ITEM,
    contractFields: CONTRACT,
    contractValidation: { ok: true, reason_codes: [] },
    runtime: "claude",
  });

  assert.ok(adapter.raindrop_hook, "adapter must include raindrop_hook");
  assert.equal(adapter.raindrop_hook.surface, "goal-runtime/worker-run");
  assert.equal(adapter.raindrop_hook.work_item_ref, "[WORK_ITEM_ID]");
  assert.equal(adapter.raindrop_hook.agent, "claude");
  assert.equal(adapter.raindrop_hook.mode, "implement");
  assert.ok(typeof adapter.raindrop_hook.adapter_version === "string", "adapter_version must be a string");
  assert.ok(adapter.raindrop_hook.instrumentation.includes("buildRaindropCallSummaryFromGoalRuntimeWorkerRun"), "instrumentation must reference the builder");
});

test("buildGoalRuntimeAdapter raindrop_hook contains no raw prompt or private context", () => {
  const adapter = buildGoalRuntimeAdapter({
    workItem: WORK_ITEM,
    contractFields: CONTRACT,
    contractValidation: { ok: true, reason_codes: [] },
    description: "A private internal description",
    runtime: "claude",
  });

  const hook = adapter.raindrop_hook;
  const keys = Object.keys(hook);
  assert.equal(keys.some((k) => k.toLowerCase().includes("prompt")), false, "raindrop_hook must not contain prompt fields");
  assert.equal(keys.some((k) => k.toLowerCase().includes("description")), false, "raindrop_hook must not contain description");
  assert.equal(keys.some((k) => k.toLowerCase().includes("workspace")), false, "raindrop_hook must not contain workspace paths");
  assert.equal("surface" in hook, true);
  assert.equal("work_item_ref" in hook, true);
  assert.equal("agent" in hook, true);
});

test("buildGoalRuntimeAdapter raindrop_hook reflects codex runtime correctly", () => {
  const adapter = buildGoalRuntimeAdapter({
    workItem: WORK_ITEM,
    contractFields: { ...CONTRACT, agent: "claude" },
    contractValidation: { ok: true, reason_codes: [] },
    runtime: "codex",
  });

  assert.equal(adapter.raindrop_hook.agent, "codex");
  assert.equal(adapter.raindrop_hook.surface, "goal-runtime/worker-run");
});

test("buildGoalRuntimeAdapter raindrop_hook is present even when can_start is false", () => {
  const adapter = buildGoalRuntimeAdapter({
    workItem: WORK_ITEM,
    contractFields: { ...CONTRACT, dispatch: "manual" },
    contractValidation: { ok: false, reason_codes: ["contract.dispatch-not-ready"] },
    runtime: "claude",
  });

  assert.equal(adapter.can_start, false);
  assert.ok(adapter.raindrop_hook, "raindrop_hook must be present even when adapter is blocked");
  assert.equal(adapter.raindrop_hook.surface, "goal-runtime/worker-run");
});
