# CTO Daily Engineering Report

Status: active operating doctrine; runner shipped
Use for: routing Engineering Department state into CEO review without raw
developer noise
Last updated: 2026-05-24

## Decision

The Engineering Department reports to the CEO through one daily CTO engineering
report when engineering work, code workers, sandbox branches, GitHub/PR packets,
CI failures, worktree drift or coding-related blockers exist.

The report is not a commit log. It is a management reduction layer.

Canonical Plane sink:

```text
Project: Command Center (`CMD`)
Module/Page/Item: Engineering Briefing
Singleton work item or page: `CMD-31 Engineering Briefing - Current`
Work item id: `3ceb7625-7cf1-4297-beea-22dda2c6c966`
Write pattern: append one dated `engineering.brief` comment per local day
```

Do not create a new daily Engineering Briefing work item. Create or update a
Plane item only when the brief identifies concrete follow-up work.

## Reporting Chain

```text
Engineering workers / sandboxes / GitHub / tests
-> CTO synthesis
-> Engineering Briefing - Current
-> CEO/Codex release, rework, park or escalation decision
-> Chief-of-Staff shell summary when founder attention is needed
```

The CTO reports to CEO/Codex. The CTO does not mark Plane Done, merge, push,
deploy, release, rotate credentials, change production auth/schema/RLS or lower
HumanGate levels. The CTO may prepare HG-3 critical-release packets; CEO/Codex
decides them. HG-4 goes through Chief-of-Staff to the Founder.

## CTO Authority Boundary

Within the Engineering Department, the CTO may:

- classify incoming bugs and implementation requests
- route work to approved role:cto worker capabilities
- request read-only diagnosis before patching
- authorize L3 sandbox implementation when the worker contract passes
- request rework, test repair, narrower prompts or parked follow-ups
- improve department-local prompts, coding checklists and review rubrics
- resolve generated evidence and report artifacts under Workspace Stewardship
- recommend release cards to CEO/Codex

The CTO must escalate before:

- any HG-2.5 action: push, merge, deploy, release, tag, PR creation when policy
  requires release authority, Plane Done, production write or publish
- any HG-3 action: auth/schema/RLS, service-role, customer data, secrets,
  production behavior, credential scope or critical runtime change that needs
  CEO/Codex authority and verified rollback/restore evidence
- any HG-4 action: strategic direction, non-restorable production loss,
  founder-voice public commitment, major legal/capital exposure or company
  identity/taste decision
- department-structure changes: new worker roles, CapabilityProfiles,
  RuntimeAuth expansion, scheduler authority, CI/release policy or HumanGate
  changes
- cross-department tradeoffs, for example slowing Marketing output to protect
  Engineering stability

Escalation format:

```yaml
cto.escalation:
  version: cto-escalation/v0
  reason: HG-2.5 | HG-3 | HG-4 | department-structure | blocked-auth | blocked-ci | blocked-worktree | security
  recommended_decision: approve | revise | park | kill | split | ask-chief-of-staff | ask-founder
  evidence:
    - <Plane item/comment/report path/commit/branch/PR packet>
  cto_recommendation: <one concrete recommendation>
  ceo_action_required: <exact CEO/Codex decision>
```

If the gate level is ambiguous, the CTO chooses the higher gate and escalates.

## Required Brief Sections

Every CTO engineering report includes:

1. **Executive status**: green/yellow/red by repo and lane.
2. **Work shipped or review-ready**: commits, sandbox packets, docs, test
   repairs or PR packets, separated from unreleased work.
3. **Open engineering work**: active Plane items, worker runs, sandboxes,
   blocked items and parked follow-ups.
4. **GitHub / branch / PR state**: local commits, upstream state, draft PR
   packets, release-card candidates and merge blockers.
5. **Tests and CI**: commands run, pass/fail/skip, flaky tests and missing gates.
6. **Code quality and architecture signals**: risky files, GitNexus impact,
   dependency drift, data-contract issues and refactor proposals.
7. **Security/auth/data boundaries**: secrets, auth, RLS, production data,
   customer impact, required HG-3 CEO decisions and HG-4 founder decisions.
8. **Workspace stewardship**: root worktree status, dirty buckets, active owner
   locks, sandbox lifecycle and cleanup action.
9. **Worker performance**: interventions, retries, prompt failures, max-turns,
   CAO/Controller verdicts and Raindrop learnings.
10. **CTO actions taken**: retries, parks, narrowed contracts, checklist/rubric
   improvements inside CTO authority.
11. **CEO decisions requested**: release, rework, split, park, kill, escalate,
   approve HG-2.5/HG-3, route HG-3.5, or ask Founder for HG-4.
12. **Next dispatch recommendations**: no more than three bounded next actions.

## Plane Comment Shape

Each engineering report starts with:

```yaml
engineering.brief:
  version: cto-engineering-brief/v0
  date: YYYY-MM-DD
  department: engineering
  reporter: role:cto
  recipient: CEO
  source_projects:
    - COMPA
    - <domain project>
  release_authority: none
  done_authority: none
  workspace_stewardship: clean | resolved | parked | blocked
```

Every operational claim must cite a report path, Plane work item, commit, branch
name, PR packet, command output summary or metric source. If the source is
unavailable, the brief says `UNKNOWN`.

## Workspace Stewardship Section

Required shape:

```yaml
workspace.stewardship:
  version: workspace-stewardship/v0
  status: clean | resolved | parked | blocked
  workspaces:
    - workspace: registry:<key>
      branch: <branch>
      head: <sha>
      dirty_state: clean | dirty
      dirty_buckets:
        - bucket: current-session-output | generated-evidence | active-external-session | stale-unowned-output | unsafe-mutation | discard-candidate
          paths:
            - <path>
          owner: role:cto | worker:<run-id> | human:<name> | unknown
          action: committed_and_pushed | parked_with_owner_and_next_check | blocked_with_report | escalated_to_c_level_or_ceo
      sandboxes:
        active: <n>
        dirty: <n>
        parked: <n>
```

## Follow-Up Creation Rule

The engineering report may recommend follow-up work. It creates or updates a
Plane item only when the follow-up has:

- owning role label
- workspace
- source of truth
- acceptance criteria
- gates
- HumanGate level
- reporting path
- blocked actions
- expected release boundary

Otherwise the recommendation remains in the current report.

## Runner Status

Canonical CLI:

```bash
node scripts/engineering/cto-daily-engineering-report.mjs \
  --date YYYY-MM-DD \
  --company-root ${LOCAL_WORKSPACE} \
  --write
```

To append the brief to the Plane singleton:

```bash
node scripts/engineering/cto-daily-engineering-report.mjs \
  --date YYYY-MM-DD \
  --company-root ${LOCAL_WORKSPACE} \
  --post-plane \
  --workspace companyos \
  --project-id a0289488-bae2-4403-8628-8ce842a0becc \
  --work-item-id 3ceb7625-7cf1-4297-beea-22dda2c6c966 \
  --auth app-token
```

The runner is idempotent per local date: if the singleton already has an
`engineering.brief` comment for that date, it skips the Plane write. Use
`--update-existing` with `--post-plane` when the same dated comment must be
corrected.

Current reduced input set:

- `reports/engineering/**/worker-report.md` and controller reports
- `reports/releases/<date>/**/*.{md,json}`
- `git status --short --branch` across registered engineering workspaces
- recent `metrics/agent-events.jsonl`
- generated daily output under
  `reports/engineering/daily-briefs/<date>/cto-daily-engineering-report.{md,json}`

The runner is a management reducer, not a release tool. It does not create
follow-up items, mark Plane Done, merge, push, deploy or change production
state. Plane follow-up creation still requires a bounded worker contract under
the Follow-Up Creation Rule above.

## Autonomy Boundary

Allowed:

- read Plane/report/metric/GitHub state
- append one dated engineering brief comment to the singleton sink
- produce CEO decision recommendations
- create bounded follow-up contract drafts
- resolve generated evidence under Workspace Stewardship

Blocked:

- Plane Done
- push, merge, deploy, release, tag or public publish
- production DB/schema/RLS/auth/service-role changes
- secret rotation or broader credential access
- durable memory writes without policy
- deleting branches or worktrees without explicit authority
- lowering HumanGate levels
