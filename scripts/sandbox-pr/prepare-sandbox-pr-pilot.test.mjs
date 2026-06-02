import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

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
WorktreeRoot: [LOCAL_WORKSPACE]
IntegrationTarget: main
SourceOfTruth:
- [LOCAL_WORKSPACE]
Scope:
- Include: one narrow Recovery reader helper.
Acceptance Criteria:
- Helper is covered by tests.
Gates:
- npm test
OutcomeSpec:
- Produce a sandbox patch and review packet.
OutcomeRubric:
- canonical review harness
OutcomeGrader: controller
OutcomeArtifacts:
- sandbox branch diff
AlwaysAllow:
- create sandbox worktree
RuntimeAuth:
- claude sentinel returns CLAUDE_AUTH_OK
EventPolicy: required
EventSink: metrics-jsonl
EventTypes:
- worker.locked
- sandbox.created
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
- [LOCAL_WORKSPACE]
MaxRuntime: 900s
MaxSpend: EUR 0
KillSwitch: Linear #stop
Heartbeat: 15m
`;
}

test("prepare-sandbox-pr-pilot writes a ready packet and JSON without creating a worktree", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sandbox-pr-cli-"));
  const contractPath = path.join(root, "contract.md");
  const outputDir = path.join(root, "out");
  fs.writeFileSync(contractPath, validContract());

  const result = spawnSync(
    process.execPath,
    [
      path.resolve("scripts/sandbox-pr/prepare-sandbox-pr-pilot.mjs"),
      "--contract",
      contractPath,
      "--output-dir",
      outputDir,
      "--workspace-root",
      "[LOCAL_WORKSPACE]",
      "--json",
    ],
    { cwd: path.resolve("."), encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ready, true);
  assert.equal(payload.createWorktree, false);
  assert.equal(payload.worktreeCreated, false);
  assert.equal(fs.existsSync(payload.packetPath), true);
  assert.equal(fs.existsSync(payload.jsonPath), true);
  assert.match(fs.readFileSync(payload.packetPath, "utf8"), /No Auto-Merge/);
});

test("prepare-sandbox-pr-pilot refuses event append without actual worktree creation", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sandbox-pr-cli-"));
  const contractPath = path.join(root, "contract.md");
  fs.writeFileSync(contractPath, validContract());

  const result = spawnSync(
    process.execPath,
    [
      path.resolve("scripts/sandbox-pr/prepare-sandbox-pr-pilot.mjs"),
      "--contract",
      contractPath,
      "--output-dir",
      path.join(root, "out"),
      "--append-events",
    ],
    { cwd: path.resolve("."), encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--append-events requires --create-worktree/);
});
