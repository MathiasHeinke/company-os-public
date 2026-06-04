# Company.OS Engineering Department Pack v0.6.8

Status: operational candidate pack
Use for: turning coding work into a managed CTO department before v0.7 command
center and v0.8 department-pack operation
Last updated: 2026-05-24

## Decision

Engineering is the second Company.OS department pack after Marketing.

The goal is not "let a coding agent edit faster." The goal is a managed
Engineering Department:

```text
Founder / employee / Chief-of-Staff intent
-> CEO/Codex routing
-> CTO department intake
-> bounded engineering worker contracts
-> sandbox branch/worktree when edits are needed
-> tests, GitNexus, Raindrop, CAO and Controller review
-> CTO daily engineering report
-> CEO release or escalation decision
```

The CTO may manage engineering work inside the approved operating boundary. The
CTO may not quietly become release authority.

## Scope

This pack covers:

- code investigation and bug triage
- architecture review
- implementation planning
- L3 sandbox implementation
- test and regression repair
- documentation and handoff updates
- GitHub/PR packet preparation
- worktree and sandbox stewardship
- engineering daily reporting
- Raindrop prompt-result learning for coding work

This pack does not grant:

- auto-merge
- auto-push
- auto-deploy
- production DB/schema/RLS/auth changes
- secret rotation
- public release
- Plane Done
- direct customer-impacting production writes

## Plane Shape

Recommended parent:

```text
Company.OS Engineering Department Pack / CTO Operating Lane
```

Recommended first children:

1. CTO Intake and Triage Desk
2. Engineering Worktree Stewardship Desk
3. Sandbox Implementation Worker Template
4. Test and Regression Repair Worker Template
5. GitHub PR Packet and Release Card Bridge
6. Daily Engineering Report Runner
7. Raindrop Coding Run Quality Loop

The exact Plane sequences are assigned by Plane. Do not pre-allocate sequence
numbers in docs.

## [SOURCE_COMPANY] Desktop MVP Pilot

The first domain-specific CTO lane is the [SOURCE_COMPANY] Desktop MVP pilot:

```text
[SOURCE_COMPANY] Desktop MVP / CTO Department Dashboard-First Private Beta
```

Canonical pilot doctrine:

- `docs/orchestration/atlas-desktop-mvp-cto-department-runtime.md`
- `docs/orchestration/goal-runtime-plane-loop.md`
- `docs/operations/sandbox-branch-lane.md`
- `docs/templates/worker-issue-contract.md`

The [SOURCE_COMPANY] pilot is dashboard-first. `[SOURCE_COMPANY_DOMAIN]-desktop` is the primary UI
control-plane workspace, `[SOURCE_WORKSPACE]` is backend/Supabase/Edge/Hermes source of
truth, `[SOURCE_COMPANY_DOMAIN]-dashboard` is the operator surface, and Swift/iOS remains
capture-first until CEO/Codex changes the parent cutline.

## Goal-Compatible Parent And Child Rules

For Engineering Department work that should run through the goal loop, the
Plane parent is a management object and the children are the dispatchable
objects.

The parent must define GoalState, product cutline, source-of-truth files, child
graph, dependencies, acceptance bar, HumanGate envelope, Done authority and stop
rules.

Each dispatchable child must include exactly one owning `role:*` label and one
flat fenced worker contract following `docs/templates/worker-issue-contract.md`.
Implementation children must use the sandbox branch lane, deterministic
branch/worktree names, exact read/write paths, blocked actions and absolute
report paths. Stage 0.5 and Stage 0.65 must pass before a child may move to
`dispatch: ready`.

The official Codex/Claude goal primitive may be used only inside one already
selected child. It must not replace parent planning, dependency selection,
CAO/Controller review, release authority or Plane Done authority.

## Department Roles

| Role | Seat | Output | Authority ceiling |
|---|---|---|---|
| CEO/Codex | CEO | portfolio decision, HG-2.5 release card, HG-3 critical release card, cross-department synthesis | HG-3 when release validator, CAO/controller and rollback/restore evidence pass |
| CTO | role:cto | engineering bar, work slicing, retry/rework decisions, daily report | L3 sandbox; no merge/push/deploy |
| Intake Engineer | role:cto | intent cards turned into diagnosis or worker contracts | L2/L3 draft |
| Architecture Reviewer | role:cto | data-contract, API, runtime and reversibility review | review only |
| Implementation Worker | role:cto | bounded patch in sandbox worktree | L3 sandbox |
| Test/Regression Worker | role:cto | failing-test diagnosis and repair packet | L3 sandbox |
| Security/Auth Reviewer | role:cto or role:cao | secrets, auth, RLS, permissions, unsafe data-flow review | review; HG-3 CEO escalation, HG-4 if non-restorable/strategic |
| GitHub Release Bridge | role:cto | PR packet, branch summary, release-card inputs | no push/merge/deploy |
| Worktree Steward | role:coo or role:cto | clean, parked or blocked workspace state | no destructive cleanup |
| Docs/Knowledge Steward | role:cto | README, ADR, system-index, runbook updates | docs-only inside scope |
| CAO | role:cao | PASS/REJECT/PARK | independent review only |

## CTO Management Authority

The CTO may:

- accept engineering intent from CEO routing packets
- split broad work into bounded worker contracts
- request read-only audits before implementation
- start or recommend L3 sandbox work when contracts pass
- require tests, GitNexus impact and code-review gates
- ask workers to retry, narrow or park work
- improve coding worker prompts, checklists and rubrics
- create or improve docs and runbooks inside explicit write scope
- resolve generated evidence and worktree hygiene inside stewardship authority
- write the Daily Engineering Report

The CTO must escalate before:

- merge, push, deploy, release, tag or Plane Done
- production DB, schema, RLS, auth, service-role or customer-impacting writes
  that need HG-3 CEO/Codex critical authority and verified rollback/restore
- secret creation, rotation or broader credential access
- CapabilityProfile or RuntimeAuth expansion
- changing branch protection, CI policy, release process or HumanGate level
- cross-department sequencing tradeoffs
- autonomy promotion from L3 sandbox toward L4 integration
- any non-restorable, strategic or founder-voice action to HG-4

If the gate level is ambiguous, the CTO chooses the higher gate and escalates.

## Daily Engineering Loop

1. Intake reads CEO routing packets, Plane items, GitHub/PR state, worktree
   hygiene, sandbox lifecycle, failed tests and prior CAO/Raindrop findings.
2. CTO classifies each item: diagnose, implement, verify, release-card,
   escalate, park or kill.
3. Read-only diagnosis runs before implementation unless the issue is already
   narrowly scoped and low risk.
4. L3 implementation happens only through sandbox branch/worktree rules.
5. Worker reports changed files, commands, tests, residual risk, reflection and
   learning proposals.
6. CTO or Controller audits the sandbox branch against source of truth,
   GitNexus impact, tests and blocked actions.
7. CAO reviews evidence and rejects weak or self-promoting outputs.
8. Raindrop evaluates prompt-result quality for managed coding runs.
9. CTO synthesizes results into the Daily Engineering Report through
   `scripts/engineering/cto-daily-engineering-report.mjs`.
10. CEO decides release cards, cross-department sequencing, rework or escalation.

## Goal-Ready Definition For Coding Parents

A coding parent is goal-ready only when the parent and at least one child can
survive the actual goal dry-run without human interpretation.

Parent minimum:

- one concrete GoalState and non-goals
- product cutline and source-of-truth map
- child dependency graph with one next eligible child
- acceptance bar that names required worker reports, reviews, gates and release
  evidence
- HumanGate envelope, Done authority and release authority
- stop rules for rework, park, split, CEO/Codex and Founder escalation

Child minimum:

- exactly one `role:*` label
- one flat fenced worker contract following `docs/templates/worker-issue-contract.md`
- declared `Workspace`, `Dispatch`, `DependsOn`, `SourceOfTruth`, `Scope`,
  `Acceptance Criteria`, `Gates`, `HumanGate`, `Reporting` and `BlockedActions`
- for implementation: sandbox branch/worktree, `AllowedReadPaths`,
  `AllowedWritePaths`, `RuntimePermissionMode`, `KillSwitch` and rollback path
- Stage 0.5 contract review is `CONTRACT_PASS`
- Stage 0.65 runtime executability is `RUNTIME_READY_PASS`

Operational proof:

```bash
node scripts/goal/goal.mjs run --parent <PARENT-ID> \
  --workspace-slug companyos \
  --project-id <project uuid> \
  --project-identifier <PROJECT> \
  --max-children 1 \
  --dry-run \
  --json
```

The dry-run must not return `selected=0`,
`contract.dispatch-not-ready`, missing role label, missing source-of-truth,
failed Stage 0.5, failed Stage 0.65 or unresolved dependency for the next
intended child. If it does, the CTO fixes the parent/child contracts before any
worker runtime is started.

## Worker Contract Classes

### 1. Engineering Diagnosis

Use when the problem is observed but root cause is unknown.

Default:

```yaml
role: role:cto
agent: claude
mode: audit
autonomy_level: L2
sandbox: none
blocked_actions:
  - edit
  - push
  - merge
  - deploy
  - production-write
  - plane-done
```

Expected output: root-cause map, candidate files, reproduction steps, risk and
recommended next contract.

### 2. Sandbox Patch

Use when implementation is bounded and reversible.

Default:

```yaml
role: role:cto
agent: claude | codex
mode: implement
autonomy_level: L3
sandbox: required
human_gate: HG-2.5
blocked_actions:
  - push
  - merge
  - deploy
  - production-write
  - memory-write
  - plane-done
```

Required sources:

- `docs/operations/sandbox-branch-lane.md`
- `docs/operations/sandbox-pr-autopilot.md`
- relevant repo `AGENTS.md`
- relevant system index
- exact source files or investigation report

### 3. Test And Regression Repair

Use when tests are failing or a bug class repeats.

Required output:

- failing command
- reproduction
- suspected regression range when available
- patch or patch plan
- tests run
- residual risk
- whether the failure indicates weak contract, weak tests or weak runtime

### 4. PR Packet / Release Card Bridge

Use when a sandbox patch is ready for review.

The worker may prepare:

- branch summary
- changed files
- test evidence
- rollback notes
- release-card draft
- PR body draft

The worker may not push, open PRs, merge, deploy or mark Done unless a separate
HG-2.5 release action explicitly grants that authority.

## Engineering Gates

Engineering worker contracts should choose the smallest sufficient gate set:

| Gate | Use |
|---|---|
| `git status --short --branch` | always, to prove workspace baseline |
| `git diff --check` | every source/doc patch |
| `node --test ...` | Node runtime code |
| package-specific test/build/lint | target workspace |
| GitNexus impact/detect-changes | source symbol edits and pre-commit scope |
| sandbox-pr readiness | L3 implementation |
| productization-readiness check | Company.OS release or public surface changes |
| secret scan | any release/PR/public/export path |
| Raindrop prompt-result eval | managed coding runs |
| CAO pass | worker completion before CEO decision |

Skipping a gate requires a reason in the report.

## GitHub / PR Boundary

GitHub is a code-hosting and review surface, not the Company.OS execution
ledger.

Engineering workers may draft PR packets. The CEO/Codex release path owns real
GitHub push, PR creation, merge and release actions under HG-2.5 or higher.

Required PR packet contents:

- problem statement
- linked Plane item or intent card
- branch and base
- changed files and why
- tests and gates
- CAO/Controller verdict
- rollback path
- release authority needed

## Worktree Stewardship

Engineering owns the dirtiest part of the company: source code.

Therefore every engineering report must include workspace stewardship:

- root workspace status
- sandbox worktree count and state
- dirty files by bucket
- active owner locks
- commits ahead/behind
- next cleanup action

Use `docs/operations/workspace-stewardship-protocol.md`. A dirty worktree is not
a closing note. It must be resolved, owner-parked, blocked or escalated.

## Raindrop / Learning Loop

For coding work, Raindrop should answer:

- Was the worker prompt too broad?
- Did the source packet contain enough files and constraints?
- Did the worker select the right gates?
- Did it overclaim completion?
- Did it need too much controller intervention?
- Did the CAO reject for predictable reasons?
- Should the next coding contract template change?

Raindrop proposals remain proposal-only until CTO or CEO promotes them into a
template, SOP or capability update.

## Completion Criteria For v0.6.8 Foundation

This pack is foundation-ready when:

- CTO authority and escalation are documented.
- Daily Engineering Report is defined.
- Worktree stewardship is part of the engineering report.
- Sandbox implementation and PR packet boundaries are linked.
- GitHub release authority is separated from worker output.
- Raindrop learning loop is part of engineering quality.
- System Index points to the pack and report doctrine.

Status as of 2026-05-24:

- Foundation criteria: met.
- Daily Engineering Report runner: shipped as
  `scripts/engineering/cto-daily-engineering-report.mjs` with core tests.
- Bounded CTO worker pilot: proven by the [WORK_ITEM_ID] parent and [WORK_ITEM_ID]..476
  child chain, ending in HG-3 release pass, PR #8 merge and production smoke.
- Evidence brief:
  `reports/engineering/daily-briefs/2026-05-24/cto-daily-engineering-report.md`.

The department is still not a fully autonomous production engineer. Remaining
autonomy gaps are intentional gates: parent-to-child scheduler selection must
stay behind Stage 0.5/0.65, HG-2.5/HG-3 release authority remains CEO/Codex,
HG-3.5 remains Chief-of-Staff review, and HG-4 remains Founder.

## Productization Rule

For a client installation, Engineering must be tailored to the client's repos,
branch rules, CI, release process and production boundary. The reusable pattern
is:

```text
Company.OS owns intent, contracts, gates, reports and release authority.
Client/product repos own source code, tests, CI, branches and deployment
targets.
```
