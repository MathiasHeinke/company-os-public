import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateDispatchGuard,
  extractCandidates,
  parseArgs,
} from "./atlas-506-opus-dispatch-guard.mjs";

function args(overrides = {}) {
  return {
    plannerFile: "planner.json",
    postHgFile: "",
    requirePostHgOk: false,
    maxWorkers: 3,
    outputDir: "reports/atlas/super-goal/worker-dispatch",
    ...overrides,
  };
}

test("parseArgs captures guard controls", () => {
  const parsed = parseArgs([
    "--planner-file",
    "planner.json",
    "--post-hg-file",
    "post.json",
    "--source-gate-file",
    "source.json",
    "--require-post-hg-ok",
    "--require-source-gate-ok",
    "--plane-workspace",
    "companyos",
    "--max-workers",
    "2",
    "--output-dir",
    "out",
    "--json",
  ]);

  assert.equal(parsed.plannerFile, "planner.json");
  assert.equal(parsed.postHgFile, "post.json");
  assert.equal(parsed.sourceGateFile, "source.json");
  assert.equal(parsed.requirePostHgOk, true);
  assert.equal(parsed.requireSourceGateOk, true);
  assert.equal(parsed.planeWorkspace, "companyos");
  assert.equal(parsed.maxWorkers, 2);
  assert.equal(parsed.outputDir, "out");
});

test("extractCandidates uses selected and stage05_selected leaf items", () => {
  const planner = {
    ok: true,
    plan: {
      selected: [{ ref: "[WORK_ITEM_ID]", leaf: true }],
      stage05_selected: [{ ref: "[WORK_ITEM_ID]", leaf: true }],
      blocked: [{ ref: "[WORK_ITEM_ID]", leaf: true }],
      parent_containers: [{ ref: "[WORK_ITEM_ID]", leaf: false }],
    },
  };

  assert.deepEqual(extractCandidates(planner).map((item) => item.ref), ["[WORK_ITEM_ID]", "[WORK_ITEM_ID]"]);
});

test("evaluateDispatchGuard fails closed when planner has no runnable candidates", () => {
  const result = evaluateDispatchGuard({
    planner: {
      ok: true,
      plan: {
        status: "BLOCKED_DEPENDENCY",
        summary: { runnable: 0 },
        selected: [],
        stage05_selected: [],
      },
    },
    args: args(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "BLOCKED");
  assert.match(result.errors.join("\n"), /no runnable/);
  assert.deepEqual(result.commands, []);
});

test("evaluateDispatchGuard requires post-HG ok when requested", () => {
  const result = evaluateDispatchGuard({
    planner: runnablePlanner(),
    postHg: { ok: false },
    args: args({ requirePostHgOk: true }),
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /post-HG/);
  assert.deepEqual(result.commands, []);
});

test("evaluateDispatchGuard requires source-gate ok when requested", () => {
  const result = evaluateDispatchGuard({
    planner: runnablePlanner(),
    sourceGate: { ok: false },
    args: args({ requireSourceGateOk: true }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.join("\n").includes("source/gate"), true);
  assert.deepEqual(result.commands, []);
});

test("evaluateDispatchGuard emits dispatcher-v0/v1 commands for runnable candidates", () => {
  const result = evaluateDispatchGuard({
    planner: runnablePlanner(),
    postHg: { ok: true },
    sourceGate: { ok: true },
    args: args({ requirePostHgOk: true, requireSourceGateOk: true, maxWorkers: 1 }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "READY_TO_DISPATCH");
  assert.equal(result.commands.length, 1);
  assert.equal(result.commands[0].protocol, "dispatcher-v0-lock-then-runtime-dispatcher-v1");
  assert.match(result.commands[0].preflight_command, /plane-dispatcher-v0\.mjs/);
  assert.match(result.commands[0].preflight_command, /runtime-dispatcher-v1\.mjs/);
  assert.match(result.commands[0].lock_command, /--mode "lock"/);
  assert.match(result.commands[0].run_command, /--mode "run"/);
  assert.match(result.commands[0].run_command, /--runtime-model "opus"/);
  assert.match(result.commands[0].command, /--permission-mode "plan"/);
  assert.equal(result.commands[0].command.includes("claude -p"), false);
  assert.match(result.commands[0].output_path, /[WORK_ITEM_ID]-worker-report\.md/);
  assert.equal(result.hard_boundaries.includes("no_worker_spawn_by_this_tool"), true);
});

function runnablePlanner() {
  return {
    ok: true,
    plane: {
      project_id: "268df2ed-a071-4cc8-a394-595e4b7353c2",
    },
    plan: {
      status: "READY",
      summary: { runnable: 1 },
      selected: [{
        ref: "[WORK_ITEM_ID]",
        id: "wi-900",
        leaf: true,
        name: "Runnable worker",
        role: "role:cto",
        agent: "claude",
        mode: "verify",
        workspace: "${LOCAL_WORKSPACE}",
        human_gate: "HG-2",
        model_route: {
          model_class: "opus-4.8-1m-max",
          effort: "max",
        },
      }],
      stage05_selected: [],
    },
  };
}
