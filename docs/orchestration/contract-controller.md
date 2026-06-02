# Contract Controller

Status: canonical Stage 0.5 pre-dispatch quality gate
Use for: deciding whether a Plane worker contract is strong enough before
Dispatcher v0 writes `worker.lock`
Last updated: 2026-05-10

## Purpose

The Worker Issue Contract validator answers: **is this contract parseable?**

The Contract Controller answers: **is this contract good enough to give to a
worker?**

Parseable is not sufficient. A weak contract can still waste model budget, hide
missing gates, omit Spec/Plan/Tasks, forget eval harnesses, or send a powerful
worker into a vague scope. Stage 0.5 exists to improve the contract before any
runtime lock or spawn happens.

## Position In The Run Chain

```text
0 Plane Work Item
0.5 Contract Controller
0.6 Contract Remediation Router (only when Stage 0.5 is not PASS)
1 Dispatcher v0 lock/context
2 Capability Registry
3 Runtime Dispatcher v1.1 preflights
3.5 Runtime Inference Router
4 Runtime Dispatcher v1.2 spawn
5 C-Level Worker
6 CAO
7 Codex Controller
8 CEO/Codex Done
9 Scheduler 24/7
```

Stage 0.5 never edits source, never spawns a worker, never marks Done, never
writes Linear, and never mutates the work item description. It may write one
Plane comment:

`controller.contract-review`

Dispatcher v0 defaults to `--contract-review require`; it refuses to lock an
item unless the latest contract review is `CONTRACT_PASS` and matches the
current description hash. When the verdict is not PASS, the next executable
step is Stage 0.6 (`docs/orchestration/contract-remediation-router.md`), not a
worker run and not a direct Founder escalation.

## Verdicts

| Verdict | Meaning | Next Action |
|---|---|---|
| `CONTRACT_PASS` | Contract is parseable and operationally strong enough | Dispatcher may lock |
| `CONTRACT_PATCH_REQUIRED` | Contract is repairable but missing quality fields | Patch description and rerun Stage 0.5 |
| `SPEC_REQUIRED` | Task needs Spec/Plan/Tasks, checklist, eval harness, or no-spec rationale | Create/link planning artifacts first |
| `SPLIT_REQUIRED` | Scope is too broad for one worker item | Split parent into role-labeled children |
| `CEO_GATE_REQUIRED` | HG-3/high-risk but reversible surface detected | Owning C-Level prepares HG-3 package; CEO/Codex decides before dispatch |
| `FOUNDER_GATE_REQUIRED` | HG-4/strategic or non-restorable surface detected | CEO reviews, Chief-of-Staff translates, Founder signs before dispatch |
| `REJECT` | Contract should not proceed | Rewrite or close |

## Remediation Ownership

Non-PASS does not automatically mean "ask CEO" or "ask Founder". The
organizational routing rule is:

```text
Contract Controller -> owning C-Level seat -> CEO -> Founder
```

- `CONTRACT_PATCH_REQUIRED`, `SPEC_REQUIRED`, `SPLIT_REQUIRED` and `REJECT`
  route first to the owning `role:*` C-Level seat.
- Missing owner, missing decision, unclear source truth or cross-role priority
  conflicts route to CEO.
- `CEO_GATE_REQUIRED` starts with the owning C-Level preparing the HG-3
  critical-release package; CEO/Codex reviews reversibility, rollback and CAO
  evidence before dispatcher lock.
- `FOUNDER_GATE_REQUIRED` is HG-4 only: owning C-Level prepares evidence, CEO
  reviews, Chief-of-Staff translates, Founder signs only with a concrete
  decision card.

`scripts/orchestration/contract-remediation-router.mjs` implements this as a
machine-readable `controller.remediation-routed` comment.

## What It Checks

The executable controller validates:

- flat fenced worker contract parseability
- exactly one `role:*` label
- concrete SourceOfTruth pointers
- include/exclude Scope boundaries
- verifiable Acceptance Criteria
- executable Gates or named controller gates
- `Sandbox: required` and `AllowedWritePaths` for implementation work
- `CapabilityProfile` for Claude/Codex/Gemini workers
- runtime fields for ready/scheduled runtime work:
  `RuntimeAuth`, `MaxRuntime`, `MaxSpend`, `KillSwitch`, `Heartbeat`
- `BlockedActions`
- `worker.reported`/artifact Reporting
- `OutcomeSpec`/`OutcomeRubric` for live scheduled worker runs
- SubAgentRoster reporting/session policy
- high-risk HG-3 / schema / RLS / auth / production / deploy / money /
  regulated-claim surfaces

## HumanGate Awareness

Stage 0.5 must not confuse the async Chief-of-Staff / Founder-Proxy tier
(`HG-3.5`) with the synchronous Founder dispatch gate (`HG-4`). Source of truth:
`docs/governance/human-gate-levels.md`. The Worker Issue Contract
validator now exposes `KNOWN_HUMAN_GATES` and rejects unknown levels
with `contract.unknown-human-gate-level`; the contract controller may
rely on that enum rather than re-tokenizing the human_gate field.

When a contract declares `human_gate: HG-3.5`, it must also declare a
non-empty `hg35_pause_artifact`. The validator emits
`contract.hg35-pause-artifact-missing` if that field is absent. Stage
0.5 does not need to escalate `HG-3.5` to Founder before dispatch; it
is a normal CAO/controller-routed slice that pauses at Stage 5 and
returns a controller `HG-3.5-PENDING-ARTIFACT-REVIEW` decision card.

`HG-3` high-risk reversible surfaces trigger `CEO_GATE_REQUIRED` before
dispatch. `HG-4` strategic or non-restorable surfaces trigger
`FOUNDER_GATE_REQUIRED` through the Chief-of-Staff / Founder-Proxy packet before
dispatcher lock. Explicit HG-4/founder-only surfaces named in
`docs/governance/ceo-release-authority.md` trigger `FOUNDER_GATE_REQUIRED`.

## Executable Files

- `scripts/orchestration/contract-controller.mjs`
- `scripts/orchestration/contract-controller.test.mjs`

Run dry:

```bash
node scripts/orchestration/contract-controller.mjs \
  --workspace companyos \
  --project-id <project-id> \
  --work-item-id <work-item-id> \
  --mode dry-run \
  --auth app-token \
  --json
```

Post the review:

```bash
node scripts/orchestration/contract-controller.mjs \
  --workspace companyos \
  --project-id <project-id> \
  --work-item-id <work-item-id> \
  --mode post \
  --auth app-token \
  --json
```

For scheduler/operator use, prefer the closed-loop wrapper so Stage 0.6 runs
immediately after every non-PASS review:

```bash
node scripts/orchestration/scheduler-stage-0506.mjs \
  --workspace companyos \
  --project-id <project-id> \
  --work-item-id <work-item-id> \
  --mode post \
  --auth app-token \
  --json
```

The wrapper writes `controller.contract-review` first. If the verdict is not
`CONTRACT_PASS`, it also writes `controller.remediation-routed` and returns
`allow_lock: false` without failing the scheduler process.

Only after a posted `CONTRACT_PASS` should Dispatcher v0 lock:

```bash
node scripts/orchestration/plane-dispatcher-v0.mjs \
  --workspace companyos \
  --project-id <project-id> \
  --work-item-id <work-item-id> \
  --mode lock \
  --contract-review require \
  --auth app-token \
  --json
```

## Comment Shape

```yaml
controller.contract-review:
  version: contract-controller-v0
  work_item: [WORK_ITEM_ID]
  verdict: CONTRACT_PASS
  reviewer: codex
  description_hash: <sha256>
  reason_codes: none
  suggestions: none
  next_action: dispatcher-lock-allowed
  signed_at: 2026-05-10T18:00:00.000Z
```

Dispatcher v0 treats stale review comments as invalid. Any description change
requires rerunning Stage 0.5.

## Bootstrap Escape Hatch

`plane-dispatcher-v0 --contract-review off` exists only for controller-approved
bootstrap/debug runs. Normal scheduler use must keep `require`.

`--contract-review warn` may be used during migrations to observe the gate
without blocking, but it must not be the scheduler default.

## Hygiene

- A worker never patches its own failed contract after Dispatcher rejects it.
- Contract patching is a controller/CEO surface, not worker execution.
- Stage 0.5 is allowed to be stricter than the validator. That is the point:
  better contracts first, less cleanup later.
