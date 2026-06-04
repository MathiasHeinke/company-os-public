# Goal Command

Status: alpha command doctrine
Use for: turning CEO intent into a reviewable GoalState, ObjectiveLoop and first
Plane Worker Contract draft
Last updated: 2026-05-13

## Purpose

The `goal` command is the intent-shaping layer before Plane execution.

It does not create Plane work items, dispatch workers, write memory, mark Done
or push code. It converts a loose operator goal into:

- a `GoalState` draft
- a bounded `ObjectiveLoop`
- one parseable first Worker Issue Contract with `dispatch: manual`
- a Markdown/JSON artifact under `reports/goals/`

This keeps fast intent capture separate from execution authority. Plane remains
the canonical execution ledger once the draft is reviewed and pasted or
materialized as a work item.

For the planned parent/child execution loop that uses Codex or Claude goal
primitives inside a bounded worker run, see
`docs/orchestration/goal-runtime-plane-loop.md`.

## Command

Dry-run prints the Markdown draft to stdout and performs no writes:

```bash
node scripts/goal/goal.mjs draft \
  --title "Founder Daily Queue" \
  --outcome "Founder can review HG-4 items and Chief-of-Staff can review HG-3.5 items from one queue." \
  --role role:coo \
  --source docs/orchestration/codex-controller-runtime.md \
  --metric "Queue contains no more than 10 decision-ready items." \
  --acceptance "Generated queue includes sign and reject templates." \
  --gate "node --test scripts/goal/goal-core.test.mjs"
```

Materialization dry-run prints Plane parent and child payloads. It still
performs no Plane writes:

```bash
node scripts/goal/goal.mjs materialize \
  --title "Founder Daily Queue" \
  --outcome "Founder can review HG-4 items and Chief-of-Staff can review HG-3.5 items from one queue." \
  --role role:coo \
  --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e \
  --label-map-file runtime/plane-label-map/companyos-3537d502-b5a7-4214-9f7d-8f571fb1cd1e.json \
  --child "Build queue generator|role:cto|claude|implement"
```

Apply mode is idempotent: it lists existing Plane work items, keeps matching
items by name, creates missing items, links children to the parent, and does
not transition state, dispatch workers, write Linear or mark Done.

```bash
node scripts/goal/goal.mjs materialize \
  --title "Founder Daily Queue" \
  --outcome "Founder can review HG-4 items and Chief-of-Staff can review HG-3.5 items from one queue." \
  --role role:coo \
  --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e \
  --label-map-file runtime/plane-label-map/companyos-3537d502-b5a7-4214-9f7d-8f571fb1cd1e.json \
  --child "Build queue generator|role:cto|claude|implement" \
  --apply \
  --json
```

Runner dry-run reads one Plane parent and its children, validates each child
contract with the same worker-ledger validator used by the dispatcher, and
selects at most `--max-children` dispatch-ready children. It does not write
Plane and does not spawn a worker:

```bash
node scripts/goal/goal.mjs run \
  --parent [WORK_ITEM_ID] \
  --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e \
  --max-children 1 \
  --dry-run \
  --json
```

Expected blocked output for freshly materialized children:

```text
status: BLOCKED_DEPENDENCY
reason_codes:
  - contract.dispatch-not-ready
selected: []
```

Adapter dry-run reads one selected child and emits a runtime goal wrapper for
Claude or Codex. It is a preview only: if the child contract is still
`dispatch: manual`, the adapter returns `can_start: false`.

```bash
node scripts/goal/goal.mjs adapt \
  --sequence [WORK_ITEM_ID] \
  --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e \
  --runtime claude \
  --effort max \
  --dry-run \
  --json
```

Codex adapter output carries an explicit feature gate and smoke-test
requirement before live use of Codex goal primitives:

```bash
node scripts/goal/goal.mjs adapt \
  --sequence [WORK_ITEM_ID] \
  --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e \
  --runtime codex \
  --dry-run \
  --json
```

Loop dry-run composes the one-parent scheduler pilot. It selects at most one
eligible child and then plans the Stage 0.5/0.6, Dispatcher, Adapter, Runtime,
CAO and Controller chain. It does not create a cron/automation and does not
run the planned commands:

```bash
node scripts/goal/goal.mjs loop \
  --parent [WORK_ITEM_ID] \
  --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e \
  --window-hours 24 \
  --dry-run \
  --json
```

For the current [WORK_ITEM_ID] seed this stops at selection:

```text
status: BLOCKED_DEPENDENCY
stopped_at: select-child
stop_reason_codes:
  - contract.dispatch-not-ready
```

Supergoal dry-run reads a full parent/child tree, validates every descendant,
classifies HumanGate queues and proposes the next bounded controller pass. It is
for large Plane trees such as [WORK_ITEM_ID], where the next step may be Stage 0.5
review rather than worker runtime. It performs no Plane writes and does not
spawn workers:

```bash
node scripts/goal/goal.mjs supergoal \
  --parent [WORK_ITEM_ID] \
  --project-id 268df2ed-a071-4cc8-a394-595e4b7353c2 \
  --project-identifier [SOURCE_COMPANY] \
  --max-children 2 \
  --window-hours 24 \
  --dry-run \
  --write \
  --json
```

Expected first-state output for a freshly materialized tree:

```text
status: READY_FOR_STAGE_05_REVIEW
reason_codes:
  - contract.dispatch-not-ready
stage05_selected:
  - [WORK_ITEM_ID]
  - [WORK_ITEM_ID]
```

The command treats HG-2.5/HG-3 as CEO/Codex queues, HG-3.5 as
Chief-of-Staff / Founder-proxy review and HG-4 as Founder decision cards. It
never auto-resolves HG-4 and never marks Plane Done. High-context work is
routed to Claude Opus with `--effort max`; bounded work stays at high effort.
Dynamic workflows / subagents are only allowed inside one selected child when
the Worker Contract declares `SubAgentRoster` and a capped `MaxSubAgents`.

Synthesis dry-run reads the parent, every child and the child comments. It
classifies `worker.reported`, CAO verdict and Codex Controller decision state
per child, then decides whether the parent may enter completion review. It does
not transition Done:

```bash
node scripts/goal/goal.mjs synthesize \
  --parent [WORK_ITEM_ID] \
  --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e \
  --dry-run \
  --json
```

Local artifacts can be written explicitly:

```bash
node scripts/goal/goal.mjs synthesize \
  --parent [WORK_ITEM_ID] \
  --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e \
  --dry-run \
  --write
```

The parent is completion-ready only when every child is complete and no child
has unresolved worker, CAO or Controller blockers. Done authority remains
CEO/Codex or Founder only under HG-2.5/HG-3/HG-4 policy.

Write artifacts:

```bash
node scripts/goal/goal.mjs draft \
  --title "Capability Registry Sandbox Patterns" \
  --outcome "Sandbox paths resolve through durable registry patterns." \
  --role role:cto \
  --write
```

Artifacts:

```text
reports/goals/<YYYY-MM-DD>/<slug>-goal.md
reports/goals/<YYYY-MM-DD>/<slug>-goal.json
```

## Execution Boundary

The command is intentionally controlled at the Plane boundary:

- `dispatch` defaults to `manual`
- `draft` and materialization dry-run perform no Plane API calls
- `materialize --apply` may create or keep parent/child Plane items and link
  children to the parent
- `run --dry-run` may read Plane items and contract state
- `adapt --dry-run` may read one Plane item and emit local prompt/command
  previews
- `loop --dry-run` may read one parent and produce a bounded pilot plan
- `supergoal --dry-run` may read one full parent tree and comments, then
  produce the next Stage 0.5 or worker-runtime pass plan
- `synthesize --dry-run` may read parent/child comments and emit a completion
  synthesis
- no Linear writes
- no scheduler invocation from this command
- no worker spawn
- no memory update
- no branch, commit, push, deploy or Done transition

After review, the generated Worker Contract can be copied into a Plane item,
given exactly one `role:*` label, passed through Stage 0.5/0.6, and only then
dispatched.

## Required Shape

Each generated draft includes:

- `GoalState`: title, outcome, owner, role, workspace, horizon, metrics,
  non-goals and source-of-truth
- `ObjectiveLoop`: observe, shape, dispatch, verify, learn
- `First Worker Contract Draft`: flat fenced YAML with the required dispatcher
  keys from `docs/templates/worker-issue-contract.md`
- `ReflectionPolicy: required`
- `LearningProposalPolicy: required`

The GoalState is fenced as `goalstate`, not `yaml`, so the dispatcher ignores
it when a full draft is pasted into Plane. The first dispatcher-parseable YAML
fence is the Worker Contract.

## Multi-Child Goal Plans

For larger goals, `draft` is only the intent capture layer and `materialize`
is only a parent/child payload scaffold. The generated child contracts are
deliberately conservative and generic. They must not be dispatched when the
goal needs dependency ordering, different roles, separate implementation and
verification workers, or public-release gates.

Use this pattern instead:

1. Run `goal.mjs draft --write` to capture the reviewed `GoalState`.
2. Write an expanded plan artifact next to the draft, for example
   `reports/goals/<date>/<slug>-plan.md`.
3. Put the dependency graph, stop rules and every child Worker Issue Contract
   into that expanded plan.
4. Validate each child contract shape before creating Plane items.
5. Create or materialize Plane children from the expanded contracts, not from
   placeholder contracts.
6. Dispatch only the first dependency-ready child after Stage 0.5/0.6 returns
   `CONTRACT_PASS`.

Current example:
`reports/goals/2026-05-14/pub-02-public-mirror-builder-clean-clone-verifier-plan.md`.

## Good Use Cases

- capture a new Company.OS direction before creating Plane items
- prepare a C-Level child plan from a founder/CEO voice note
- turn an ambiguous "go build X" into a scoped worker contract
- create a stable artifact before a Scheduler/Dispatcher pilot

## Non-Goals

- It is not an unreviewed Plane item creator; Plane writes are limited to
  explicit `materialize --apply`.
- It is not a scheduler.
- It is not a project manager.
- It is not a release validator.
- It does not decide whether a goal is strategically correct.

The controller and CEO still decide whether the draft becomes execution work.
