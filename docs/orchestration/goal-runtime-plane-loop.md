# Goal Runtime Plane Loop

Status: agentic implementation plan
Last updated: 2026-05-13
Use for: turning founder or CEO goals into Plane parent/child execution loops
that can keep working across Codex, Claude, CAO and Controller gates without
requiring manual restart prompts after every worker turn

## Purpose

Company.OS needs goal pursuit as an operating loop, not only as a chat prompt.
The intended outcome is:

```text
Founder/CEO goal
-> GoalState
-> Plane parent
-> child worker contracts
-> scheduler selects next eligible child
-> runtime uses Codex/Claude goal primitive for one bounded child
-> worker.reported
-> CAO verdict
-> Codex Controller decision
-> next child or human gate
-> parent acceptance review
```

This document is the implementation plan for that loop.

## Decision

Use official managed goal primitives as runtime helpers, not as the canonical
control plane.

- Codex `/goal` and Claude `/goal` may keep one runtime session focused until
  a bounded stop condition is met.
- Plane remains the durable execution ledger for parent/child state, gates,
  dependencies, blocker history and final acceptance.
- Company.OS Scheduler / Dispatcher owns candidate selection, locking,
  preflights, runtime launch, CAO handoff and controller handoff.
- Workers do not self-poll Plane, set `Done`, bypass HumanGates or decide
  parent completion.

## Non-Goals

- No generic "do everything" goal prompt.
- No Plane replacement with Codex or Claude transcript state.
- No autonomous HG-3, production, finance, legal, medical, customer-data or
  public-claim action.
- No worker-created `Done` transition.
- No duplicate scheduler loop outside the existing Dispatcher v0/v1 chain.

## Runtime Boundary

The official goal feature is allowed only inside one already-selected work
item:

```text
Good:
  Plane child COMPA-XYZ is dispatch-ready.
  Scheduler starts a worker.
  Worker receives a goal stop condition for that one child.

Bad:
  /goal "finish the whole Plane parent and all children"
```

The goal primitive should make a worker persist within its bounded task. It
must not replace parent planning, dependency selection, gate evaluation or
controller authority.

## Implementation Slices

### Slice 1: Doctrine And Feature Gate

Outcome: Company.OS knows where official Codex/Claude goal primitives fit.

Acceptance criteria:

- this document is linked from `docs/system-index.md`
- `docs/operations/goal-command.md` points from draft-only command to this
  runtime plan
- local Codex config explicitly records whether experimental goals are enabled
- no Plane dispatch behavior changes yet

Status 2026-05-13:

- Claude lane: allowed only as a bounded runtime helper inside one selected
  child worker.
- Codex lane: not treated as live until a local `features.goals` /
  experimental-goals smoke test is recorded. The adapter emits this as a
  feature gate and must fall back to the bounded non-goal worker prompt when
  the feature is unavailable.
- Plane parent/child selection stays canonical even when a runtime supports a
  managed goal primitive.

### Slice 2: Plane Materialization

Outcome: reviewed GoalState artifacts can become Plane parent/child payloads.

Acceptance criteria:

- `scripts/goal/goal.mjs materialize` produces parent and child payloads
- dry-run prints payloads without Plane writes
- `--apply` is idempotent: keep matching items, create missing items and link
  children to the parent
- optional label map resolves `role:*` labels to Plane label IDs
- child contracts stay `dispatch: manual` until Stage 0.5 passes
- tests cover payload generation and dispatcher parseability

### Slice 3: Goal Runner v0

Outcome: a parent can be advanced one child at a time.

Status 2026-05-13: dry-run selector implemented as
`node scripts/goal/goal.mjs run --parent [WORK_ITEM_ID] --max-children 1 --dry-run`.

Acceptance criteria:

- `goal run --parent COMPA-... --max-children 1 --dry-run` reads Plane and
  identifies the next eligible child
- dependency, stale-state and blocker cases fail closed
- no worker spawn in dry-run
- run output includes the exact dispatcher command that would execute

Current behavior:

- lists Plane work items through the global app-token auth bridge
- resolves the parent by `COMPA-<n>`, sequence id, UUID or exact name
- reads child comments and treats Controller `AUTO-GO` evidence as
  complete-for-selection even when the Plane state is not `Done`
- validates child descriptions with `worker-ledger-validator`
- sorts children by Plane sequence id
- selects only children whose contract validator returns pass
- skips children that are already complete by Plane state or Controller
  decision, so the runner does not re-dispatch a child waiting for CEO Done
- returns `BLOCKED_DEPENDENCY` when children remain `dispatch: manual`

### Slice 4: Runtime Goal Adapter

Outcome: selected children can use Codex/Claude goal primitives safely.

Status 2026-05-13: dry-run adapter implemented as
`node scripts/goal/goal.mjs adapt --sequence [WORK_ITEM_ID] --runtime claude --dry-run`
and `--runtime codex`.

Acceptance criteria:

- Claude prompt wrapper includes child acceptance criteria, gates and stop
  conditions
- Codex wrapper is gated behind `features.goals = true` and a smoke test
- transcript-visible gate proof is required because goal evaluators cannot
  independently inspect files
- fallback worker prompt exists when goal primitive is unavailable

Current behavior:

- reads one Plane child through the app-token auth bridge
- extracts the worker contract and validator verdict
- emits a `/goal ...` prompt scoped to exactly one selected child
- emits a fallback prompt when the managed goal primitive is unavailable
- emits Claude command preview for `claude -p <goal-prompt>`
- emits Codex command preview plus explicit `features.goals` and smoke-test
  requirement
- returns `can_start: false` when the contract remains
  `contract.dispatch-not-ready`

### Slice 5: Scheduler Loop Pilot

Outcome: a scheduled automation can advance at most one eligible child per
pass.

Status 2026-05-13: manual dry-run pilot implemented as
`node scripts/goal/goal.mjs loop --parent [WORK_ITEM_ID] --window-hours 24 --dry-run`.
No cron or heartbeat automation has been created yet.

Acceptance criteria:

- automation is scoped to one parent only for the first pilot
- loop runs preflights, contract controller, dispatcher, CAO and Codex
  controller in order
- stops on `NEEDS_HUMAN`, `BLOCKED_*`, `TIMEOUT`, `RUNTIME_ERROR` or stale
  state
- writes concise Plane comments and event ledger rows

Current behavior:

- scoped to one parent and `max_children=1`
- runs the same selector as Slice 3
- if no child is selected, stops at `select-child`
- when a future child is dispatch-ready, emits planned dry-run commands for:
  Stage 0.5/0.6, Dispatcher v0, goal adapter, Runtime Dispatcher v1, CAO pass
  and Codex Controller
- does not create a cron/heartbeat automation
- does not execute planned commands, spawn a worker, append metrics or mutate
  Plane in dry-run mode

### Slice 5.5: Supergoal Planner

Outcome: a large parent/child tree can be inspected as one execution graph
without treating `/goal` as a broad "do everything" command.

Status 2026-05-29: dry-run planner implemented as
`node scripts/goal/goal.mjs supergoal --parent [WORK_ITEM_ID] --dry-run`.

Acceptance criteria:

- reads the full Plane project with cursor pagination, not a 500-item partial
  page
- traverses every descendant under one parent and excludes superseded children
  by default
- separates worker-runtime candidates from Stage 0.5 candidates where the only
  blocker is `contract.dispatch-not-ready`
- routes HG-2.5/HG-3 to CEO/Codex queues, HG-3.5 to proxy-review queues and
  HG-4 to Founder decision queues
- never spawns workers, creates automations, mutates Plane state or marks Done

Current behavior:

- for a freshly materialized [WORK_ITEM_ID] tree, all active descendants are still
  `dispatch: manual`
- the planner returns `READY_FOR_STAGE_05_REVIEW` and selects the first bounded
  Stage 0.5 candidates instead of pretending the runtime can start
- high-context/reconcile/MCP/privacy/care/security work is routed to
  `opus-4.8-1m-max` with `--effort max`; bounded child work is routed to
  `opus-4.8-high`; Codex remains controller/integrator for HG-2.5/HG-3 release
  packets
- dynamic workflow / high-fanout subagent use is adapter-visible but gated:
  it requires a declared `SubAgentRoster`, an explicit capped `MaxSubAgents`,
  one selected Plane child, transcript-visible subagent reporting and no HG-4
  unresolved decision

### Slice 6: CAO Synthesis And Parent Completion

Outcome: Company.OS can decide when the parent is truly complete.

Status 2026-05-13: dry-run synthesis implemented as
`node scripts/goal/goal.mjs synthesize --parent [WORK_ITEM_ID] --dry-run`.

Acceptance criteria:

- synthesis artifact records every child verdict and integration status
- CAO audits evidence and blocked actions
- Codex Controller decides `AUTO-GO`, `DELEGATE`, `SELF-FIX`,
  `ASK-FOUNDER`, `REJECT` or `PARK`
- `Done` remains Codex/CEO or Founder gated according to HG-2.5/HG-3/HG-4 policy

Current behavior:

- reads the parent, every child and child comments
- records per-child worker report presence, CAO verdict, Controller decision
  and integration status
- returns `READY_FOR_PARENT_COMPLETION_REVIEW` only when every child is
  complete and no blockers remain
- writes local synthesis artifacts only with explicit `--write`
- never transitions parent or child state and never marks Done

## Current Plane Seed

The first execution seed lives in the CompanyOS Plane project:

- Parent: `[WORK_ITEM_ID]` — Goal Runtime Plane Loop
- Childs: `[WORK_ITEM_ID]` through `[WORK_ITEM_ID]`
- Initial child dispatch state: `manual`
- Expected dispatcher reject before controller release:
  `contract.dispatch-not-ready`
- Verified run dry-run 2026-05-13:
  `status=BLOCKED_DEPENDENCY`, `children_total=6`, `selected=0`,
  `blocked=6`, reason `contract.dispatch-not-ready`
- Verified loop dry-run 2026-05-13:
  `status=BLOCKED_DEPENDENCY`, `stopped_at=select-child`, no selected child,
  no event ledger append, no worker spawn
- Verified synthesis dry-run 2026-05-13:
  `status=BLOCKED_DEPENDENCY`, `ready_for_done_review=false`,
  `child_count=6`, `complete_children=0`, blockers are missing
  `worker.reported` on `[WORK_ITEM_ID]` through `[WORK_ITEM_ID]`
- Verified post-[WORK_ITEM_ID] Stage-7 run 2026-05-13: selector skips
  `[WORK_ITEM_ID]` as `controller:auto-go`, synthesis reports
  `complete_children=1`, and the loop stops at `[WORK_ITEM_ID]` with
  `contract.dispatch-not-ready`. This avoids re-running children that have
  completed worker -> CAO -> Controller but are intentionally not Plane Done.

## Exit Criteria

This plan is complete when a CompanyOS parent can be left unattended for a
bounded run window and the next session can see, from Plane and local artifacts
alone:

- what goal was being pursued
- which child ran
- what evidence was produced
- what CAO decided
- what Codex Controller decided
- what remains blocked or next
- whether founder attention is genuinely needed
