# Automation Registry

Status: example registry for a new Company.OS installation

## Purpose

This registry lists recurring jobs, their source-of-truth files, outputs,
permissions and stop rules.

Copy this file to:

```text
.company-os/operations/automation-registry.md
```

Then customize schedules, issue IDs, paths and runtime auth checks for the
local company.

## Permission Baseline

Always allow inside approved L1/L2 scope:

- read source-of-truth docs
- read execution-ledger issues and comments
- write heartbeat, blocker and outcome comments
- write private reports
- append event rows
- run read-only inspection commands
- run redacted read-only worker sidecars named by a valid issue contract

Human-gated by default:

- production writes
- deploys
- schema/RLS/auth/service-role changes
- public publishing
- outreach or customer-visible communication
- money movement or new paid tooling
- direct Done transitions
- autonomy increases
- memory writes by workers

## Jobs

| ID | Name | Kind | Schedule | Workspace | Owner | Autonomy | Status |
|---|---|---|---|---|---|---|---|
| `runtime-auth-preflight` | Runtime Auth Preflight | cron | before active windows | `registry:company-os` | Controller | L1 | draft |
| `git-worktree-hygiene` | Git Worktree Hygiene | cron | before night controller | `registry:company-os` | Controller | L1 | draft |
| `night-controller` | Night Controller | cron | weekdays 22:10 local | `registry:company-os` | CEO/controller | L2 | draft |
| `morning-ceo-brief` | Morning CEO Brief | cron | weekdays 06:30 local | `registry:company-os` | CEO/controller | L1 | draft |
| `backlog-archaeology` | Backlog Archaeology | cron | weekly 05:10 local | `registry:company-os` | Controller | L2 | draft |
| `weekly-autonomy-review` | Weekly Autonomy Review | cron | weekly 16:00 local | `registry:company-os` | Controller | L2 | draft |

## Job Contracts

### runtime-auth-preflight

SourceOfTruth:

- `.company-os/operations/autonomous-work-order-pipeline.md`
- `.company-os/operations/workspace-registry.json`

Outputs:

- `reports/runtime/YYYY-MM-DD/preflight.md`
- `metrics/agent-events.jsonl`

RuntimeAuth:

```bash
node /path/to/Company.OS/scripts/linear/headless-linear.mjs auth-preflight --json --soft
node /path/to/Company.OS/scripts/runtime/automation-runtime-runner.mjs auth-preflight --company-root /path/to/Company.OS --json --soft
```

HumanGate:

- restore missing auth
- approve new runtime or connector
- approve paid model/billing changes

Stop rules:

- stop if headless execution would require UI approval
- stop if secrets would be printed

### git-worktree-hygiene

SourceOfTruth:

- `.company-os/operations/workspace-registry.json`
- `.company-os/operations/automation-registry.md`

Outputs:

- `reports/git-hygiene/YYYY-MM-DD/HHMM-git-hygiene.md`
- `reports/git-hygiene/YYYY-MM-DD/HHMM-git-hygiene.json`

Runtime:

```bash
node /path/to/Company.OS/scripts/git-hygiene/check-git-hygiene.mjs \
  --registry .company-os/operations/workspace-registry.json \
  --fail-on-blockers
```

Rules:

- read-only only
- report dirty roots, detached roots, ahead/behind state and sandbox worktrees
- block dirty roots and dirty sandbox worktrees
- never run `git reset`, `git clean`, branch deletion, worktree removal, push,
  merge or deploy

HumanGate:

- deleting branches
- removing worktrees
- resetting or cleaning files
- pushing, PR creation, merging or deployment

### night-controller

SourceOfTruth:

- `.company-os/operations/autonomous-work-order-pipeline.md`
- `.company-os/operations/workspace-registry.json`
- `.company-os/operations/automation-registry.md`
- `.company-os/templates/linear-worker-issue-template.md`

Outputs:

- `reports/night-controller/YYYY-MM-DD/controller-pass.md`
- `metrics/agent-events.jsonl`
- execution-ledger comment

Rules:

- process due issues only
- validate work-order fields before dispatch
- run at most one worker group per pass
- prefer read-only L1/L2 work
- use redacted prompts for external workers
- stop before HG-3 actions

### morning-ceo-brief

SourceOfTruth:

- night controller reports
- execution-ledger updates
- event ledger
- automation registry
- active department reports

Outputs:

- `reports/morning-brief/YYYY-MM-DD/ceo-brief.md`
- execution-ledger comment if a parent control-plane issue exists

Include:

- what ran
- what completed
- what blocked
- what needs CEO/founder decision
- top next dispatches
- HG-3 backlog

### backlog-archaeology

SourceOfTruth:

- execution ledger
- source-of-truth docs
- stale reports
- memory-bank indexes

Outputs:

- `reports/backlog-archaeology/YYYY-MM-DD/report.md`

Rules:

- find forgotten work and stale assumptions
- recommend revive, park, kill or schedule
- do not create broad new active work without controller review

### weekly-autonomy-review

SourceOfTruth:

- controller reports
- worker reports
- event ledger
- cost ledger
- HumanGate decisions

Outputs:

- `reports/autonomy-review/YYYY-MM-DD/review.md`

Rules:

- review work quality and output quality separately
- recommend keep, restrict, retrain or promote
- autonomy promotion requires human gate
