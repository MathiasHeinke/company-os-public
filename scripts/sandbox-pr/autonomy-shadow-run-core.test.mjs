import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildAutonomyShadowRun,
  parseShadowRunContractFile,
  renderAutonomyShadowRunMarkdown,
} from "./autonomy-shadow-run-core.mjs";

function validContract() {
  return `# [WORK_ITEM_ID] Recovery Reader Slice

Layer: CTO
RoleOwner: CTO
Department: Engineering
AccountableLayer: C-Level
ReportsTo: Controller
AutonomyLevel: L3
Controller: codex
DecisionOwner: CTO
Agent: claude
Mode: implement
Workspace: registry:[SOURCE_WORKSPACE]
Dispatch: scheduled
RunAt: 2026-05-07 23:10 Europe/Berlin
DependsOn: [WORK_ITEM_ID]
Sandbox: required
BranchName: codex/sandbox/[SOURCE_WORKSPACE]/2026-05-07-mat-170-claude-cto-recovery-reader-231000
WorktreeRoot: ${LOCAL_WORKSPACE}
IntegrationTarget: main
SourceOfTruth:
- ${LOCAL_WORKSPACE}
Scope:
- Include: one narrow Recovery reader helper.
- Exclude: schema/RLS/auth/service-role writes.
Acceptance Criteria:
- Helper is covered by tests.
Gates:
- npm test
- git diff --check
OutcomeSpec:
- Produce a sandbox patch and review packet.
OutcomeRubric:
- canonical review harness
OutcomeGrader: controller
OutcomeArtifacts:
- sandbox branch diff
AlwaysAllow:
- create sandbox worktree
- write report
RuntimeAuth:
- claude sentinel returns CLAUDE_AUTH_OK
EventPolicy: required
EventSink: metrics-jsonl
EventTypes:
- worker.locked
- sandbox.created
- sandbox.patch_produced
- controller.verdict
StateReducer: issue-state-from-agent-events
DreamPolicy: proposal-only
MemoryUpdatePolicy: proposal-only
SessionPolicy: single-worker-sandbox
SharedFilesystem: sandbox-worktree
ContextIsolation: required
RuntimeAdapter: local-cli
HumanGate:
- Stop before merge, push, deploy, production writes, memory writes, Done.
HumanGateLevel: HG-2
HumanGateOwner: Founder
FounderPrediction: GO_MIT_AUFLAGEN
FounderPredictionConfidence: 0.74
BlockedActions:
- merge
- push
- deploy
- production-write
- memory-write
- done-transition
Reporting:
- ${LOCAL_WORKSPACE}
MaxRuntime: 900s
MaxSpend: EUR 0
KillSwitch: Linear #stop
Heartbeat: 15m
`;
}

test("buildAutonomyShadowRun predicts the next autonomous steps without authorizing writes", () => {
  const run = buildAutonomyShadowRun({
    contractMarkdown: validContract(),
    workspaceRoot: "${LOCAL_WORKSPACE}",
    now: new Date("2026-05-07T21:15:00Z"),
  });

  assert.equal(run.shadow_only, true);
  assert.equal(run.side_effects_allowed, false);
  assert.equal(run.would_dispatch, true);
  assert.equal(run.selected_issue, "[WORK_ITEM_ID]");
  assert.equal(run.would_create_branch, "codex/sandbox/[SOURCE_WORKSPACE]/2026-05-07-mat-170-claude-cto-recovery-reader-231000");
  assert.equal(run.would_create_worktree, "${LOCAL_WORKSPACE}");
  assert.equal(run.would_start_worker, "claude implement sandbox");
  assert.deepEqual(run.would_append_events, [
    "worker.locked",
    "sandbox.created",
    "human_gate.required",
  ]);
  assert.equal(run.blocked_actions_respected, true);
  assert.equal(run.controller_verdict_if_finished, "slice-ready-for-human-review");
  assert.match(run.what_mathias_would_reject.join("\n"), /schema\/RLS\/auth/);
  assert.match(run.next_safe_real_action, /packet-only readiness gate/);
  assert.equal(run.would_run_commands.some((command) => command.includes("worktree add")), true);
  assert.equal(run.would_run_commands.some((command) => command.includes("claude -p")), true);
});

test("buildAutonomyShadowRun blocks unsafe contracts and predicts no worker start", () => {
  const run = buildAutonomyShadowRun({
    contractMarkdown: validContract()
      .replace("AutonomyLevel: L3", "AutonomyLevel: L2")
      .replace("Sandbox: required", "Sandbox: none"),
    workspaceRoot: "${LOCAL_WORKSPACE}",
  });

  assert.equal(run.would_dispatch, false);
  assert.equal(run.would_start_worker, "none");
  assert.equal(run.controller_verdict_if_finished, "blocked-by-contract");
  assert.equal(run.would_append_events.length, 0);
  assert.equal(run.blocked_actions_respected, false);
  assert.ok(run.would_fail_because.some((reason) => reason.includes("AutonomyLevel: L3")));
});

test("renderAutonomyShadowRunMarkdown creates a CEO-readable no-side-effects report", () => {
  const run = buildAutonomyShadowRun({
    contractMarkdown: validContract(),
    workspaceRoot: "${LOCAL_WORKSPACE}",
  });

  const markdown = renderAutonomyShadowRunMarkdown(run);

  assert.match(markdown, /^# Autonomy Shadow Run/m);
  assert.match(markdown, /No Side Effects/);
  assert.match(markdown, /would_dispatch/);
  assert.match(markdown, /What Mathias Would Reject/);
});

test("parseShadowRunContractFile reads only the contract and the CLI writes nothing by default", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "autonomy-shadow-"));
  const contractPath = path.join(root, "contract.md");
  const outputPath = path.join(root, "shadow.md");
  fs.writeFileSync(contractPath, validContract());

  const parsed = parseShadowRunContractFile(contractPath);
  assert.equal(parsed.contract.fields.Mode, "implement");

  const result = spawnSync(
    process.execPath,
    [
      path.resolve("scripts/sandbox-pr/simulate-autonomy-shadow-run.mjs"),
      "--contract",
      contractPath,
      "--workspace-root",
      "${LOCAL_WORKSPACE}",
      "--json",
    ],
    { cwd: path.resolve("."), encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.shadow_only, true);
  assert.equal(payload.side_effects_allowed, false);
  assert.equal(fs.existsSync(outputPath), false);
});
