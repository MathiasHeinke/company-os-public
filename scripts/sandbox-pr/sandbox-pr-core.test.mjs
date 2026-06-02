import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildDraftPrPacket,
  buildSandboxBranchName,
  buildSandboxEvents,
  buildSandboxWorktreeCommand,
  parseWorkerContract,
  validateSandboxPrReadiness,
  writeSandboxPrPacket,
} from "./sandbox-pr-core.mjs";

function validContract() {
  return `# [WORK_ITEM_ID] Recovery Reader Slice

Layer: CTO
Role: Backend Implementation
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
MemoryStore: none
MemoryUpdatePolicy: proposal-only
SessionPolicy: single-worker-sandbox
Coordinator: Controller
SubAgentRoster: none
SharedFilesystem: sandbox-worktree
ContextIsolation: required
CapabilityProfile: engineering-implementation
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
MaxCommits: 1
MaxSpend: EUR 0
KillSwitch: Linear #stop
Heartbeat: 15m
`;
}

test("parseWorkerContract extracts top-level fields and section bodies", () => {
  const contract = parseWorkerContract(validContract());

  assert.equal(contract.fields.Mode, "implement");
  assert.equal(contract.fields.Workspace, "registry:[SOURCE_WORKSPACE]");
  assert.equal(contract.fields.RoleOwner, "CTO");
  assert.match(contract.sections.SourceOfTruth, /recovery-v2-controller/);
  assert.match(contract.sections.BlockedActions, /production-write/);
});

test("buildSandboxBranchName is deterministic and policy-shaped", () => {
  const branch = buildSandboxBranchName({
    workspaceKey: "[SOURCE_WORKSPACE]",
    date: "2026-05-07",
    issueId: "[WORK_ITEM_ID]",
    worker: "claude",
    roleOwner: "CTO",
    taskSlug: "Recovery Reader",
    time: "231000",
  });

  assert.equal(branch, "codex/sandbox/[SOURCE_WORKSPACE]/2026-05-07-mat-170-claude-cto-recovery-reader-231000");
});

test("validateSandboxPrReadiness accepts a complete L3 contract", () => {
  const contract = parseWorkerContract(validContract());

  const result = validateSandboxPrReadiness(contract);

  assert.equal(result.ready, true);
  assert.deepEqual(result.errors, []);
  assert.ok(result.normalized.worktreePath.endsWith("/[SOURCE_WORKSPACE]/2026-05-07-mat-170-claude-cto-recovery-reader-231000"));
});

test("validateSandboxPrReadiness rejects unsafe autonomy and missing gates", () => {
  const unsafe = parseWorkerContract(
    validContract()
      .replace("Sandbox: required", "Sandbox: none")
      .replace("AutonomyLevel: L3", "AutonomyLevel: L2")
      .replace("BlockedActions:\n- merge\n- push\n- deploy\n- production-write\n- memory-write\n- done-transition", "BlockedActions:\n- merge"),
  );

  const result = validateSandboxPrReadiness(unsafe);

  assert.equal(result.ready, false);
  assert.ok(result.errors.some((error) => error.includes("Sandbox: required")));
  assert.ok(result.errors.some((error) => error.includes("AutonomyLevel: L3")));
  assert.ok(result.errors.some((error) => error.includes("BlockedActions")));
});

test("buildDraftPrPacket makes human review and no-auto-merge explicit", () => {
  const contract = parseWorkerContract(validContract());
  const readiness = validateSandboxPrReadiness(contract);

  const packet = buildDraftPrPacket({ contract, readiness, controllerVerdict: "NEEDS_HUMAN" });

  assert.match(packet, /^# Sandbox Draft PR Packet/m);
  assert.match(packet, /No Auto-Merge/);
  assert.match(packet, /HumanGateOwner: Founder/);
  assert.match(packet, /Branch: `codex\/sandbox\/[SOURCE_WORKSPACE]\/2026-05-07-mat-170-claude-cto-recovery-reader-231000`/);
});

test("buildSandboxWorktreeCommand creates the exact non-destructive git command", () => {
  const contract = parseWorkerContract(validContract());
  const readiness = validateSandboxPrReadiness(contract);

  const command = buildSandboxWorktreeCommand({
    readiness,
    workspaceRoot: "[LOCAL_WORKSPACE]",
  });

  assert.deepEqual(command, [
    "git",
    "-C",
    "[LOCAL_WORKSPACE]",
    "worktree",
    "add",
    "-b",
    "codex/sandbox/[SOURCE_WORKSPACE]/2026-05-07-mat-170-claude-cto-recovery-reader-231000",
    "[LOCAL_WORKSPACE]",
    "main",
  ]);
});

test("writeSandboxPrPacket writes markdown, json and valid sandbox events", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sandbox-pr-test-"));
  const contractPath = path.join(root, "contract.md");
  fs.writeFileSync(contractPath, validContract());

  const output = writeSandboxPrPacket({
    contractPath,
    outputDir: path.join(root, "out"),
    workspaceRoot: "[LOCAL_WORKSPACE]",
    now: new Date("2026-05-07T21:10:00Z"),
  });

  assert.equal(fs.existsSync(output.packetPath), true);
  assert.equal(fs.existsSync(output.jsonPath), true);
  assert.equal(output.readiness.ready, true);

  const events = buildSandboxEvents({
    contract: output.contract,
    readiness: output.readiness,
    packetPath: output.packetPath,
    jsonPath: output.jsonPath,
    workspaceRoot: "[LOCAL_WORKSPACE]",
    now: new Date("2026-05-07T21:10:00Z"),
  });
  assert.equal(events.length, 3);
  assert.equal(events[0].event_type, "worker.locked");
  assert.equal(events[1].event_type, "sandbox.created");
  assert.equal(events[2].event_type, "human_gate.required");
});
