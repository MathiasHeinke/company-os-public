# Sandbox PR Autopilot

Status: executable v0.1
Use for: L3 sandbox implementation lanes that should reach human review without
auto-merge

## Purpose

Sandbox PR Autopilot moves edit-capable agent work one step further without
collapsing review gates.

It can validate a parseable worker contract, prepare a deterministic sandbox
branch/worktree command, create a draft PR packet, and optionally create the git
worktree plus typed events.

It does not run Claude by itself, does not merge, push, deploy, mark issues
Done, write production data, or write durable memory.

For the step before a real sandbox run, use
`docs/operations/autonomy-shadow-run.md`. The shadow run predicts what the
controller would do next without creating worktrees, appending events, writing
Linear, writing memory or starting workers.

## Flow

```text
L3 worker contract
-> sandbox readiness validation
-> draft PR packet
-> optional git worktree creation
-> worker implementation in sandbox only
-> controller audit
-> human review packet
-> explicit integration decision
```

## Executable CLI

Simulate next autonomy decision with no side effects:

```bash
node scripts/sandbox-pr/simulate-autonomy-shadow-run.mjs \
  --contract /absolute/path/to/worker-contract.md \
  --workspace-root /absolute/path/to/target-workspace \
  --json
```

Validate and write a packet:

```bash
node scripts/sandbox-pr/prepare-sandbox-pr-pilot.mjs \
  --contract /absolute/path/to/worker-contract.md \
  --output-dir /absolute/path/to/reports/sandbox-pr/YYYY-MM-DD \
  --workspace-root /absolute/path/to/target-workspace \
  --json
```

Create the sandbox worktree and append truthful events:

```bash
node scripts/sandbox-pr/prepare-sandbox-pr-pilot.mjs \
  --contract /absolute/path/to/worker-contract.md \
  --output-dir /absolute/path/to/reports/sandbox-pr/YYYY-MM-DD \
  --workspace-root /absolute/path/to/target-workspace \
  --event-ledger /absolute/path/to/Company.OS/metrics/agent-events.jsonl \
  --create-worktree \
  --append-events \
  --json
```

`--append-events` requires `--create-worktree`. This prevents the controller
from claiming `sandbox.created` before a worktree actually exists.

## Readiness Rules

The validator blocks L3 autopilot unless the contract includes:

- `Mode: implement`
- `AutonomyLevel: L3`
- `Sandbox: required`
- deterministic `BranchName`
- absolute `WorktreeRoot`
- `RoleOwner`, `HumanGateOwner`, `HumanGateLevel`
- `SourceOfTruth`, `Scope`, `Acceptance Criteria`, `Gates`
- `OutcomeSpec`, `EventPolicy`, `DreamPolicy`, `SessionPolicy`
- `RuntimeAuth` sentinel
- `MaxSpend: EUR 0`
- `FounderPredictionConfidence >= 0.70`
- `BlockedActions` including merge, push, deploy, production-write,
  memory-write and done-transition
- absolute `Reporting` path

## Output Artifacts

```text
reports/sandbox-pr/YYYY-MM-DD/<issue>-sandbox-draft-pr-packet.md
reports/sandbox-pr/YYYY-MM-DD/<issue>-sandbox-draft-pr-packet.json
```

The packet is written as a human review surface. It includes the branch,
worktree, integration target, source of truth, scope, acceptance criteria,
gates, blocked actions, readiness errors and human decision options.

## Event Policy

When the worktree is actually created, the CLI may append:

- `worker.locked`
- `sandbox.created`
- `human_gate.required`

Later worker/controller steps should append:

- `worker.heartbeat`
- `sandbox.patch_produced`
- `controller.audit_started`
- `controller.verdict`
- `memory.proposal_created` when learnings exist

## Night Controller Rule

The night controller may use this lane only when:

1. no L2 audit lane is safer or more important,
2. exactly one L3 worker contract is due and parseable,
3. the validator returns `ready: true`,
4. Claude runtime auth passes,
5. the source workspace can be worktree-based from a known integration target,
6. all forbidden actions remain blocked.

If any condition fails, the controller writes a blocked report instead of
starting implementation.

## Human Gate

The end state of this autopilot is:

```text
slice-ready-for-human-review
```

Never:

- `Done`
- auto-merge
- auto-push
- auto-deploy
- production write
- durable memory write

## Gates

- `node --test scripts/sandbox-pr/sandbox-pr-core.test.mjs`
- `node --test scripts/sandbox-pr/autonomy-shadow-run-core.test.mjs`
- `node --check scripts/sandbox-pr/sandbox-pr-core.mjs`
- `node --check scripts/sandbox-pr/prepare-sandbox-pr-pilot.mjs`
- `node --check scripts/sandbox-pr/autonomy-shadow-run-core.mjs`
- `node --check scripts/sandbox-pr/simulate-autonomy-shadow-run.mjs`
- `git diff --check`

## Failure Modes

| Failure | Controller Action |
|---|---|
| Missing L3 fields | Block and request contract backfill. |
| Branch name is random or non-deterministic | Block and regenerate deterministic name. |
| Worktree creation fails | Block; do not append `sandbox.created`. |
| Worker reaches max turns | Classify as scope-too-broad unless runtime/tool evidence says otherwise. |
| Worker claims merge-ready | Treat as untrusted; controller audit decides. |
| Tests fail | Packet can still be useful, but state is `needs-rework`. |
