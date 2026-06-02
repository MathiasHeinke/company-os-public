# ATLAS Desktop MVP CTO Department Runtime

Status: closed pilot doctrine; reusable CTO lane reference
Use for: routing ATLAS Desktop MVP coding work through the Company.OS CTO
department, Plane parent/child contracts and the bounded goal runtime
Last updated: 2026-05-24

## Decision

ATLAS Desktop MVP coding work uses the Engineering Department pack as a managed
CTO lane, not as ad hoc coding-agent prompts. The first ATLAS CTO container
(`[WORK_ITEM_ID]` parent plus `[WORK_ITEM_ID]..476` children) closed on 2026-05-24 and is
now the reusable reference for future ATLAS parent/child sessions.

The target operating loop is:

```text
Founder / CEO product intent
-> CTO intake and cutline reconciliation
-> Plane parent with explicit GoalState and acceptance bar
-> dispatchable Plane children with role:cto worker contracts
-> Stage 0.5 contract review and Stage 0.65 runtime executability
-> one bounded child run, optionally using a goal primitive inside that child
-> worker.reported
-> independent review / CAO / Controller
-> CTO daily engineering brief
-> CEO/Codex release, rework, park or escalation decision
```

ATLAS Desktop MVP means dashboard-first private beta:

- `[SOURCE_COMPANY_DOMAIN]-desktop` is the primary Vite/React desktop control plane.
- `[SOURCE_WORKSPACE]` is backend, Supabase, Edge Function and Hermes/Internal MCP source
  of truth.
- `[SOURCE_COMPANY_DOMAIN]-dashboard` is the operator and Command Center surface.
- Swift/iOS remains capture-first: food/photo, hydration, HealthKit/wearables
  and custom tracker entries.
- `[SOURCE_WORKSPACE]` remains Growth/Marketing and is not the primary coding lane
  for the Desktop MVP.

This cutline prevents the CTO lane from drifting into Swift-first or broad
cross-repo implementation before the dashboard beta bar is proven.

## Product Boundary

The first CTO parent should be:

```text
ATLAS Desktop MVP / CTO Department Dashboard-First Private Beta
```

The parent is a management object. It must not be dispatched to a worker. It
holds the GoalState, scope, source-of-truth map, child graph, dependency order,
completion bar and HumanGate boundary.

Dispatch happens only on children. Every dispatchable child must have exactly
one `role:*` label and one flat fenced worker contract using
`docs/templates/worker-issue-contract.md`.

## Parent Requirements

An ATLAS coding parent must include:

- GoalState: one concrete beta outcome, written so the CEO can close the parent
  from evidence without reading every transcript.
- Product cutline: dashboard-first, backend-source-aware, Swift capture-only
  unless explicitly overridden by CEO/Codex.
- Source of truth: exact docs, memory files, repos and relevant Plane parents or
  children.
- Child graph: each child name, owning role, workspace, dependency and expected
  output.
- Acceptance bar: the parent is complete only when children have worker reports,
  review evidence, controller decisions and no unresolved blockers.
- HumanGate envelope: maximum allowed action level and explicit release
  authority boundary.
- Done authority: workers, CTO and CAO do not mark Plane Done.
- Stop rules: when to park, ask CEO/Codex, ask Founder, or split the parent.

Minimal parent GoalState block:

```text
goalstate:
  name: ATLAS Desktop MVP dashboard-first private beta
  outcome: The ATLAS desktop control plane can demonstrate the beta-critical
    dashboard workflow against real backend contracts or explicitly labeled
    mock/demo boundaries.
  success_evidence:
    - child worker.reported comments exist for every dispatchable child
    - review children compared implementation against this parent and the plan
    - local build/test/browser-smoke gates are recorded or explicitly blocked
    - CTO daily engineering brief names remaining release decisions
  non_goals:
    - production deploy
    - Plane Done by worker
    - schema, RLS, auth or service-role writes
    - broad Swift implementation beyond capture-first beta scope
```

## Child Classes

Recommended first child sequence:

1. CTO Intake and Cutline Reconcile
2. Worktree Stewardship and Dirty State Settlement
3. Existing ATLAS Contract Normalizer
4. Architecture Diagnosis and Backend-UI Gap Map
5. L3 Sandbox Implementation Slice
6. Test and Regression Repair Slice
7. Adversarial Reviewer or Black-Box Tester
8. PR Packet and Release Card Bridge
9. CAO Synthesis and Parent Completion Review
10. CTO Daily Engineering Briefing Runner

The normalizer child must inspect existing ATLAS Plane work such as
`[WORK_ITEM_ID]` through `[WORK_ITEM_ID]` and any v0.60, v0.65 or v0.70 parent/child
groups. It fixes weak contract shape, missing `role:*` labels, stale dispatch
state and mismatch between Plane Backlog state and Controller evidence. It does
not mark Done.

## Goal-Compatible SOP

Every new ATLAS coding request goes through this sequence:

1. Create or update a CTO intake child.
2. Reconcile the request against the dashboard-first parent cutline.
3. Decide whether the request is diagnosis, plan, implementation, verification,
   review, release-card or park.
4. For implementation, create a separate L3 sandbox child with exact write paths
   and deterministic branch/worktree naming.
5. Run Stage 0.5 contract review before changing `dispatch` to `ready`.
6. Run Stage 0.65 runtime executability before scheduler lock or worker spawn.
7. Start at most one eligible child per goal loop pass.
8. If a runtime supports `/goal`, scope it to the selected child only.
9. Require `worker.reported`, then independent review or CAO/Controller before
   the next child is trusted.
10. Close the parent only through CEO/Codex or Founder authority according to
    the HumanGate.

The `goal` primitive is a persistence helper inside one child. It is not the
planner, parent owner, dependency selector, release authority or Done authority.

## Child Contract Minimum

Each dispatchable child must include the flat lowercase machine keys required
by `docs/templates/worker-issue-contract.md`:

- `role`
- `parent_seat`
- `agent`
- `mode`
- `workspace`
- `dispatch`
- `source_of_truth`
- `acceptance_criteria`
- `gates`
- `human_gate`
- `reporting`

For Stage 0.5 and Stage 0.65 readiness, ATLAS CTO children must also name:

- `CapabilityProfile`
- `AutonomyLevel`
- `Sandbox`
- `BranchName`
- `WorktreeRoot`
- `AllowedReadPaths`
- `AllowedWritePaths`
- `BlockedActions`
- `RuntimeAuth`
- `RuntimePermissionMode`
- `OutcomeArtifacts`
- `OutcomeRubric`
- `ReflectionPolicy`
- `LearningProposalPolicy`
- `SubAgentRoster`
- `KillSwitch`

If the item lacks those fields, it remains `dispatch: manual` and gets routed
to the CTO normalizer instead of a coding worker.

## Ready Child Example

Use this shape only after the parent exists and Stage 0.5/0.65 are expected to
pass. During drafting, keep `dispatch: manual`.

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: implement
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
acceptance_criteria:
  - One dashboard-first MVP slice is implemented in the sandbox worktree and matches the parent cutline.
  - Mock/demo boundaries remain visible in code or UI state and are not presented as live backend proof.
  - Worker report lists changed files, commands, tests, blockers, residual risk and rollback notes.
gates:
  - git status --short --branch
  - git diff --check
  - pnpm build
  - pnpm test
  - pnpm typecheck
  - gitnexus detect-changes --repo ${LOCAL_WORKSPACE}
human_gate: HG-2.5
reporting: Plane worker.reported plus ${LOCAL_WORKSPACE}>/worker-report.md
CapabilityProfile: claude-clevel-worker/cto/atlas-desktop
AutonomyLevel: L3
Sandbox: required
BranchName: codex/atlas-desktop-mvp-<plane-sequence>
WorktreeRoot: ${LOCAL_WORKSPACE}>
AllowedReadPaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
AllowedWritePaths:
  - ${LOCAL_WORKSPACE}>/
  - ${LOCAL_WORKSPACE}>/
BlockedActions: do not push, merge, deploy, write production data, edit secrets, change schema/RLS/auth/service-role, write durable memory, write Linear, mark Plane Done or broaden CapabilityProfile.
RuntimeAuth: no production credentials; Plane app token only through approved bridge; Supabase read-only only if the parent explicitly grants it.
RuntimePermissionMode: acceptEdits
OutcomeArtifacts:
  - ${LOCAL_WORKSPACE}>/worker-report.md
OutcomeRubric: PASS only if implementation, gates, mock/live boundary and rollback evidence are all present.
ReflectionPolicy: required
LearningProposalPolicy: required
SubAgentRoster: none unless a separate approved review child grants it
KillSwitch: stop on secret exposure, production-write request, schema/RLS/auth request, unclean unrelated worktree changes, failed required gate or parent cutline conflict.
```

## Review Child Rule

No implementation child is release-ready until a fresh read-only reviewer checks
the diff against:

- the parent GoalState
- the child contract
- exact source-of-truth files
- acceptance criteria
- declared gates
- mock/live boundary
- blocked actions

The reviewer may recommend PASS, PATCH_REQUIRED, SPLIT_REQUIRED, PARK or
REJECT. The reviewer does not edit files, mark Done, push, merge or deploy.

## Operational Debt Pulled Forward

The first ATLAS CTO parent must handle these known gaps before adding new
feature breadth:

- Dashboard-first beta cutline must override Swift-first momentum until CEO/Codex
  changes the parent.
- Existing ATLAS Plane items with missing `role:*` labels or weak contracts
  must be normalized before dispatcher use.
- Plane Backlog state is not enough to judge progress. Worker reports,
  CAO/Controller comments and local artifacts must be read before rerun.
- Dirty worktrees across Company.OS and ATLAS repos must be classified before
  sandbox implementation.
- The Goal Runtime Plane Loop is still a bounded pilot. Start with at most one
  child per pass.
- Goal runner validation gates may use only `node scripts/goal/goal.mjs run`,
  `adapt` or `synthesize`. Do not grant broad `goal.mjs*` execution to workers.
- Executable gates must be single commands run from the declared `Workspace`
  or sandbox worktree. Do not write gates as `cd ... && ...`; that shape is
  intentionally not auto-allowed by Runtime Dispatcher v1.2.
- Local Claude runtime workers should declare `RuntimePermissionMode:
  acceptEdits` when `AllowedWritePaths` are machine-checkable and scope guards
  are active. `plan` mode can trigger Claude scratch reads outside the declared
  worker scope and is reserved for explicitly read-only harnesses that account
  for that path.
- The CTO Daily Engineering Report runner exists:
  `scripts/engineering/cto-daily-engineering-report.mjs`. For the closed
  ATLAS pilot it generated
  `reports/engineering/daily-briefs/2026-05-24/cto-daily-engineering-report.md`.
- Adversarial review is mandatory before release-card preparation.
- GitNexus impact is mandatory before source-symbol edits are accepted.
- The LinkedIn Creator Export import is closed by operator confirmation on
  2026-05-24 and must not remain an ATLAS coding blocker.

## Current Plane Seed / Closed Pilot

Created 2026-05-24 in Plane project `ATLAS`:

- Parent: `[WORK_ITEM_ID]` - `[ATLAS Desktop MVP CTO] Parent - Dashboard-first
  private beta`
- Children: `[WORK_ITEM_ID]` through `[WORK_ITEM_ID]`
- Initial child dispatch state: `manual`
- Role labels: nine `role:cto` children and one `role:cao` synthesis child

Child sequence:

1. `[WORK_ITEM_ID]` - CTO Intake and Cutline Reconcile
2. `[WORK_ITEM_ID]` - Worktree Stewardship and Dirty State Settlement
3. `[WORK_ITEM_ID]` - Existing ATLAS Contract Normalizer
4. `[WORK_ITEM_ID]` - Architecture Diagnosis and Backend-UI Gap Map
5. `[WORK_ITEM_ID]` - L3 Sandbox Implementation Slice
6. `[WORK_ITEM_ID]` - Test and Regression Repair Slice
7. `[WORK_ITEM_ID]` - Adversarial Reviewer or Black-Box Tester
8. `[WORK_ITEM_ID]` - PR Packet and Release Card Bridge
9. `[WORK_ITEM_ID]` - CAO Synthesis and Parent Completion Review
10. `[WORK_ITEM_ID]` - CTO Daily Engineering Briefing Runner

Initial pre-dispatch dry-run on 2026-05-24:

```text
node scripts/goal/goal.mjs run --parent [WORK_ITEM_ID] \
  --workspace-slug companyos \
  --project-id 268df2ed-a071-4cc8-a394-595e4b7353c2 \
  --project-identifier ATLAS \
  --max-children 1 \
  --dry-run \
  --auth api-key \
  --json
```

Result: `status=BLOCKED_DEPENDENCY`, `children_total=10`, `selected=0`,
`blocked=10`, reason `contract.dispatch-not-ready`. This is intentional:
contracts are present and labeled, but no child may run until CTO/Controller
patches a child to `dispatch: ready` after Stage 0.5 and Stage 0.65 pass.

Final closeout on 2026-05-24 superseded the initial blocked dry-run state:

- PR: `https://github.com/MathiasHeinke/[SOURCE_COMPANY_DOMAIN]-desktop/pull/8`
- Merge commit: `48c478c4a8701ad6e0f80cb85e8f077710b883a8`
- Vercel deployment: `dpl_4jERmjASexR8aGu3995uMT9yPxeR`
- Production alias: `https://ares.[SOURCE_COMPANY_DOMAIN]`
- HG-3 release validator: pass, 33 checks, 0 blockers.
- Final closeout report:
  `reports/releases/2026-05-24/atlas-desktop-mvp-hg3-pass/atlas-final-closeout.md`
- CTO daily engineering brief:
  `reports/engineering/daily-briefs/2026-05-24/cto-daily-engineering-report.md`

Future ATLAS work must not reopen this container. Create a fresh parent and
fresh child contracts, then use this document as the SOP/reference.

## Done And Release Authority

Workers may report. The CTO may synthesize and recommend. CAO may reject or
pass evidence. Controller may decide rework, self-fix, delegate, ask Founder or
park. Plane Done, merge, push, deploy, production writes and release decisions
remain CEO/Codex or Founder authority according to the HumanGate level.
