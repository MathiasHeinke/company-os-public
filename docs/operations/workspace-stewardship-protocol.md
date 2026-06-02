# Workspace Stewardship Protocol

Status: normative Company.OS protocol
Use for: end-of-session hygiene gates, dispatch preflights, scheduler close gates,
morning brief baselines

## Purpose

Unattended work requires an unambiguous filesystem baseline. Dirty roots, forgotten
sandbox worktrees, detached branches and unexpected branch/worktree counts make
autonomous controller decisions ambiguous and create risk of unreported output
escaping the review path.

This protocol defines:

- the mandatory close-session gate command every worker and scheduler must run
  before ending a session or dispatching new work
- the exact set of conditions that must be resolved before unattended work proceeds
- the integration points with the Runtime Dispatcher, daily rhythm, and morning brief
- the required resolution path for every dirty worktree finding

## Dirty State Resolution Doctrine

A dirty worktree is not an observation to leave behind. It is operational work.

The sentence "dirty files exist but I did not touch them" is allowed only as an
intermediate safety note while the controller classifies ownership. It is not a
valid end state for Company.OS work.

Whenever a Company.OS, department, scheduler, worker or controller session sees
dirty state in a registered workspace, it must classify every changed path into
one of these buckets before continuing:

| Bucket | Meaning | Required action |
|---|---|---|
| `current-session-output` | Produced by the active session or run. | Stage, verify, commit and push when inside authority; otherwise write a release/decision card. |
| `generated-evidence` | Metrics, reports, page indexes, artifact truth or runtime evidence. | Validate format, secret-scan, commit and push as an evidence slice when no active owner lock exists. |
| `active-external-session` | Another live worker or human session owns the change. | Record owner, lock/run ID and next check in a stewardship report; do not overwrite. |
| `stale-unowned-output` | No active owner and no clear reason to keep it dirty. | Inspect, classify as evidence or work, then commit, park in a branch/Plane follow-up, or escalate. |
| `unsafe-mutation` | Source/code/config changes whose owner or intent is unclear. | Stop mutation, write a blocker report, route to responsible C-level owner. |
| `discard-candidate` | Cache, temp output or accidental file that is not source truth. | Remove only when the path is generated/ignored and the removal is safe; otherwise escalate. |

Every bucket must end in one of these settlement states:

- `committed_and_pushed`
- `committed_local_needs_release_card`
- `parked_with_owner_and_next_check`
- `blocked_with_report`
- `escalated_to_c_level_or_ceo`
- `safely_removed_generated_artifact`

There is no permanent `ignored` state.

## Safe Cleanup Authority

Controllers and C-level owners may clean up without asking the founder when all
conditions are true:

- the worktree is a registered Company.OS workspace
- no active owner lock says another session is still writing those paths
- changed paths are docs, reports, generated indexes, metrics ledgers or other
  declared evidence artifacts
- gates pass for the affected artifact type
- no secret, credential, private customer data or production mutation appears
- the cleanup can be represented as a scoped commit and normal push

Examples:

- commit and push generated runtime reports plus metrics ledger rows
- regenerate and commit `docs/page-index.md` after tracked docs changed
- fix trailing whitespace in generated Markdown reports before committing them
- archive a morning brief or Artifact Truth report that was already produced

Controllers and C-level owners must escalate before:

- resetting, restoring or deleting tracked source changes from another owner
- deleting branches or worktrees
- force-pushing or rebasing
- merging, deploying or publishing
- altering production config, secrets, auth, schema, RLS or customer data
- silently dropping ambiguous code/config changes

## Stewardship Report Packet

When dirty state cannot be resolved immediately, write a short stewardship
packet to the relevant report sink or Plane item. It must include:

```yaml
type: workspace.stewardship
workspace: registry:<key> | /absolute/path
branch: <branch>
head: <short-sha>
status: clean | resolved | parked | blocked
dirty_buckets:
  - bucket: current-session-output | generated-evidence | active-external-session | stale-unowned-output | unsafe-mutation | discard-candidate
    paths:
      - <path>
    owner: role:cto | role:cmo | worker:<run-id> | human:<name> | unknown
    action: committed_and_pushed | parked_with_owner_and_next_check | blocked_with_report | escalated_to_c_level_or_ceo
next_check: YYYY-MM-DDTHH:mm:ssZ
human_gate_required: none | HG-2.5 | HG-3
```

This packet prevents later sessions from seeing unexplained drift and guessing.
If the packet names an active owner, later sessions may respect that owner. If
the packet names no owner, the next controller must resolve or escalate.

## Close-Session Gate Command

Before ending any session that produced worker output or modified workspace state,
run:

```bash
COMPANY_OS_ROOT=${LOCAL_WORKSPACE} \
DEVELOPER_ROOT=${LOCAL_WORKSPACE} \
node ${LOCAL_WORKSPACE} \
  --registry .company-os/operations/workspace-registry.json \
  --sandbox-root ${LOCAL_WORKSPACE} \
  --close-session
```

`--close-session` enables strict mode. It:

- sets `--fail-on-blockers` automatically (exit code 2 on any blocker)
- promotes ahead/behind state to blockers (unpushed or behind-remote commits must be
  resolved before session close)
- promotes missing upstream to a blocker
- promotes unexpected root branch to a blocker

The local `.company-os/operations/workspace-registry.json` file is
installation-specific and gitignored. It may contain absolute local paths or
environment placeholders such as `${COMPANY_OS_ROOT}` and `${DEVELOPER_ROOT}`;
the controller expands those placeholders from the process environment.

For CI or scheduler contexts that need separate report artifacts:

```bash
COMPANY_OS_ROOT=${LOCAL_WORKSPACE} \
DEVELOPER_ROOT=${LOCAL_WORKSPACE} \
node ${LOCAL_WORKSPACE} \
  --registry .company-os/operations/workspace-registry.json \
  --sandbox-root ${LOCAL_WORKSPACE} \
  --report reports/git-hygiene/YYYY-MM-DD/HHMM-close-session.md \
  --json-output reports/git-hygiene/YYYY-MM-DD/HHMM-close-session.json \
  --close-session
```

## Mandatory Check Scope

The close-session gate checks every registered workspace and every git directory
found under each declared sandbox root.

### Workspace Blockers (exit 2 in close-session mode)

| Condition | Exit code | Meaning |
|---|---:|---|
| Workspace root does not exist | 2 | Registry misconfigured or workspace deleted |
| Workspace is not a git repo | 2 | Repo missing or detached worktree path |
| Dirty working tree | 2 | Uncommitted changes; controller cannot determine origin |
| Stash entries present | 2 | Work hidden outside branch/PR path |
| Detached HEAD (allowDetached not set) | 2 | No named branch; commits may be unreachable |
| Root branch not in expectedBranches | 2 | (promoted from warning in close-session mode) |
| git worktree count exceeds maxWorktrees | 2 | Excess open worktrees; unreviewed work may exist |
| Local commits ahead of upstream | 2 | (promoted from warning in close-session mode) |
| Local branch behind upstream | 2 | (promoted from warning in close-session mode) |
| Missing upstream | 2 | (promoted from warning in close-session mode) |

### Sandbox Blockers (exit 2)

| Condition | Exit code | Meaning |
|---|---:|---|
| Dirty sandbox worktree | 2 | Unreported L3 output exists |

### Warnings (non-zero exit only with `--fail-on-warnings`)

| Condition | Meaning |
|---|---|
| Clean leftover sandbox worktree | Should be archived or removed after controller review |
| Detached HEAD in sandbox worktree | Commits may exist outside any named branch; needs review |

## Verdicts

| Status | `--close-session` result |
|---|---|
| `clean` | All workspaces and sandboxes settled. Safe to close. Exit 0. |
| `needs_attention` | No blockers, but warnings exist (ahead/behind promoted to blockers in close-session). Exit 0 normally, but close-session promotes ahead/behind to exit 2. |
| `blocked` | One or more blockers found. Unattended work must not proceed. Exit 2. |

## Runtime Dispatcher Integration

Runtime Dispatcher v1 (`docs/orchestration/company-os-runtime-dispatcher-v1.md`)
runs the hygiene check as step 4 of its preflight for every dispatch:

> **Workspace.** `Workspace` resolves through the registry; the worktree exists;
> git status passes the hygiene check from
> `docs/operations/git-worktree-hygiene-controller.md`. Failure →
> `BLOCKED_DEPENDENCY` with reason `runtime.workspace-unhealthy`.

The dispatch-time check runs without `--close-session` (warnings are allowed for
in-progress work). The close-session gate runs with `--close-session` and must
pass before any session is declared done and before the next unattended dispatch
batch is queued.

Scheduler integration rule: **no new dispatch batch may be queued if the previous
session's close-session gate has not been run or exited with blockers.**

## Scheduler and Night-Job Integration

For night jobs, run the close-session gate through the hard cron wrapper before
and after each batch:

```bash
node ${LOCAL_WORKSPACE} \
  --company-root ${LOCAL_WORKSPACE} \
  --workspace-path ${LOCAL_WORKSPACE} \
  --lane git-worktree-hygiene-close-session \
  --run-id git-worktree-hygiene-close-session-YYYYMMDD-HHMM \
  --dedupe-key git-worktree-hygiene-close-session \
  --skip-budget \
  --timeout-ms 120000 \
  -- node scripts/git-hygiene/check-git-hygiene.mjs \
    --registry .company-os/operations/workspace-registry.json \
    --close-session
```

## Daily Rhythm Placement

| Phase | Gate | Mode |
|---|---|---|
| Pre-dispatch (morning) | `check-git-hygiene.mjs --fail-on-blockers` | standard — warns on drift |
| Post-session (after any L3 worker) | `check-git-hygiene.mjs --close-session` | strict — drift is a blocker |
| Pre-night-job | `check-git-hygiene.mjs --close-session` | strict |
| Morning CEO brief input | `check-git-hygiene.mjs --fail-on-blockers` | standard — surfacing ahead/behind for human decision |

## Human Gate

The close-session gate itself is read-only. The controller or owning C-level
seat is responsible for resolving the finding through the resolution doctrine
above.

Human/CEO review is required before any of the following cleanup actions:

- deleting sandbox worktrees or branches
- resetting or cleaning files
- force-pushing or rebasing
- merging or deploying
- archiving sandbox worktree output without controller review

The gate reports. The human or CEO decides. Workers and schedulers stop at a
`blocked` verdict and must not proceed without a documented decision or resolution.

## Implementation Reference

| Component | Path |
|---|---|
| Core library | `scripts/git-hygiene/git-hygiene-core.mjs` |
| CLI gate | `scripts/git-hygiene/check-git-hygiene.mjs` |
| Tests | `scripts/git-hygiene/git-hygiene-core.test.mjs` |
| Controller doctrine | `docs/operations/git-worktree-hygiene-controller.md` |
| Registry example | `kits/company-os-kit/.company-os/operations/workspace-registry.example.json` |
| Sandbox doctrine | `docs/governance/agentic-sandbox-control-doctrine.md` |
| Runtime Dispatcher v1 | `docs/orchestration/company-os-runtime-dispatcher-v1.md` |

## Never Do

This gate and its backing scripts must not:

- run `git reset`, `git clean`, `git checkout --force`, or `git restore`
- delete branches or worktrees
- push commits or open PRs
- merge or deploy
- write durable memory

The gate is read-only. Safe evidence cleanup is controller-owned. Destructive,
ambiguous or authority-expanding cleanup is human-gated.
