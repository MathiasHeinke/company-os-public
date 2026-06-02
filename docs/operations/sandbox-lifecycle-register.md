# Sandbox Lifecycle Register

Status: normative Company.OS doctrine

## Purpose

Sandbox worktrees produced by agent workers can become invisible debris without
a lifecycle model. This register defines seven discrete states for every sandbox
branch and worktree, maps allowed and forbidden actions per state, and defines
the review path to surface stale sandboxes in the morning brief and Plane
comments.

No lifecycle state triggers automatic branch deletion or worktree removal.
Every removal requires an explicit HumanGate release and human execution.

## State Definitions

### 1. created

Worker dispatch active; branch and worktree exist; worker may be running or
recently started.

**Allowed actions:**
- Worker edits, commits, heartbeat reporting
- Controller read-only inspection at any time
- Worker self-report (`worker.reported` comment)

**Forbidden actions:**
- Merge to integration target
- Deploy, push to production
- `git reset`, `git clean`
- Branch deletion or worktree removal
- Plane Done

**Stale threshold:** 48 hours without heartbeat or `worker.reported`

**Transition trigger:** Worker files `worker.reported` → state becomes `reported`

---

### 2. reported

Worker filed `worker.reported`; controller audit has not yet been issued.

**Allowed actions:**
- Controller audit (CAO review, verdict)
- Additional context reads by controller
- Worker clarification comment if controller requests it

**Forbidden actions:**
- Merge to integration target
- Deploy, push to production
- `git reset`, `git clean`
- Branch deletion or worktree removal
- Plane Done by worker

**Stale threshold:** 24 hours without controller verdict

**Transition trigger:** Controller issues verdict (PASS / REJECT / PARK) → state
becomes `audited`

---

### 3. audited

Controller / CAO verdict issued; CEO integration decision pending.

**Allowed actions:**
- CEO review and decision
- Rework dispatch (on REJECT verdict, returns to `created` in a new slice)
- Integration packet preparation
- Plane comment with findings

**Forbidden actions:**
- Merge to integration target without HG-2.5 CEO release
- Deploy without HG-3 CEO/Codex critical release, or HG-4 Founder release when
  the deployment changes strategy or is not cleanly reversible
- `git reset`, `git clean`
- Branch deletion or worktree removal without explicit HG release
- Plane Done by worker or controller

**Stale threshold:** 72 hours without CEO action

**Transition trigger:**
- CEO approves merge → state becomes `integrated`
- CEO defers or parks → state becomes `parked`

---

### 4. integrated

Branch merged into integration target (PR merged or integration packet applied).

**Allowed actions:**
- Read-only inspection of merged state and history
- Archive recommendation surfaced to CEO

**Forbidden actions:**
- New commits to the now-integrated branch
- `git reset`, `git clean` of worktree
- Worktree removal without explicit HG-2 CEO release

**Stale threshold:** Eligible immediately for archive recommendation; removal
requires CEO review.

**Transition trigger:** CEO authorizes archive → state becomes `archived`

---

### 5. parked

Work paused intentionally; dependency blocked, rework deferred, or CEO decision
pending beyond the `audited` stale threshold.

**Allowed actions:**
- Read-only inspection
- Surface in morning brief and Plane comment
- Resumption dispatch (new `worker.locked` returns to `created` in a new slice)

**Forbidden actions:**
- Merge, deploy, push to production
- `git reset`, `git clean`
- Branch deletion or worktree removal without explicit HG release
- Plane Done

**Stale threshold:** 7 days (168 hours) without activity

**Transition trigger:**
- Resumption approved by CEO → state becomes `created` (new slice)
- CEO archives → state becomes `archived`

---

### 6. archived

Branch and worktree preserved read-only; no further active work; available for
historical review and evidence retrieval.

**Allowed actions:**
- Read-only inspection and audit
- Removal recommendation surfaced to CEO / Founder

**Forbidden actions:**
- New commits
- `git reset`, `git clean`
- Branch deletion or worktree removal without explicit HG release
- Plane Done by worker or controller

**Stale threshold:** No decay; preserved until CEO / Founder review and
explicit HG release.

**Transition trigger:** CEO / Founder review and explicit HG-2, HG-3 or HG-4 release
→ state becomes `removable`

---

### 7. removable

CEO / Founder review complete; sandbox explicitly cleared for deletion by a
named human gate release.

**Allowed actions:**
- Branch deletion executed by human / CEO (not automatic)
- Worktree removal executed by human / CEO (not automatic)
- Plane Done by CEO after integration and archive confirmation

**Forbidden actions:**
- Automatic deletion (no script or scheduler may delete without human trigger)
- Worker-initiated deletion
- Plane Done by worker or controller

**Transition trigger:** Human / CEO executes deletion → sandbox closed

---

## State Transition Map

```
created
  └── worker.reported ──────────────────────────→ reported
                                                      └── controller verdict ────→ audited
                                                                                     ├── CEO merge ──→ integrated ──→ archived ──→ removable
                                                                                     └── CEO park ──→ parked ───────→ archived
                                                                                                       └── CEO resume → created (new slice)
```

## No Automatic Deletion

No lifecycle state, cron job, or script may automatically delete a branch or
remove a worktree.

Every removal requires all three:
1. An explicit CEO / Founder review
2. An explicit HG-2/HG-3 (CEO/Codex) or HG-4 (Founder) release recorded in Plane
3. Human execution of the deletion command

The morning brief may surface `removable` sandboxes. It may not execute removal.

## Stale Threshold Summary

| State | Stale After | Recommendation When Stale |
|---|---|---|
| `created` | 48 h | Check heartbeat or abort; worker may be stuck |
| `reported` | 24 h | Trigger controller audit; worker has reported |
| `audited` | 72 h | CEO decision required; controller verdict is waiting |
| `integrated` | — (immediate) | Recommend archive to CEO |
| `parked` | 168 h (7 d) | Park review required; consider resumption or archive |
| `archived` | — | Removal awaiting CEO / Founder review and explicit HG release |
| `removable` | — | Authorized for deletion; human must execute |

## CLI Listing

Use the Git Worktree Hygiene Controller to scan sandbox roots:

```bash
node ${LOCAL_WORKSPACE} \
  --sandbox-root ${LOCAL_WORKSPACE} \
  --report ${LOCAL_WORKSPACE} +%Y-%m-%d)/$(date +%H%M)-sandbox-lifecycle.md
```

The sandbox lifecycle module (`scripts/git-hygiene/sandbox-lifecycle-core.mjs`)
exports:

| Export | Description |
|---|---|
| `SANDBOX_LIFECYCLE_STATES` | State definitions with allowed / forbidden actions and stale thresholds |
| `deriveSandboxLifecycleState(worktree, options)` | Derives heuristic lifecycle state from branch name, age, and git status |
| `attachLifecycleStates(sandboxScanResults, options)` | Layers lifecycle state onto `scanSandboxRoots` output |
| `listStaleSandboxes(annotatedSandboxes)` | Returns only sandboxes past their stale threshold |
| `renderLifecycleReport(annotatedSandboxes)` | Markdown block suitable for morning brief or Plane comment |

## Heuristic State Derivation

The CLI derives lifecycle state from available git signals when no explicit
Plane state tag or sentinel file is present:

| Git Signal | Age Since Branch Date | Derived State |
|---|---|---|
| Dirty worktree | Any | `created` — worker active or output uncommitted |
| Detached HEAD, clean | Any | `archived` — unusual; flag for review |
| Clean, named branch, age ≤ 24 h | < 24 h | `reported` — recently completed |
| Clean, named branch, 24–72 h | 24–72 h | `audited` — controller may have acted |
| Clean, named branch, > 72 h | > 72 h | `parked` — stale; needs CEO review |

For precise state tracking, attach a Plane comment with the lifecycle state
(e.g. `sandbox.state: audited`) or write a `.sandbox-state` sentinel file to
the worktree root.

## Morning Brief Requirements

The morning brief must:

1. List all sandbox worktrees per sandbox root
2. Show: state, age in hours, branch name, last commit
3. Flag stale sandboxes with the per-state recommendation
4. Surface `removable` sandboxes prominently for human action
5. Never execute any cleanup action

## Governance

- No action that deletes or resets work is automatic.
- Every `removable` state requires an explicit HumanGate release before any
  human executes the deletion.
- Controllers surface findings; they do not execute cleanup.
- CEO / Codex may release HG-2 for archive and removal recommendations; the
  CEO/Codex may release HG-3 for reversible critical cleanup with restore
  evidence; the Founder owns HG-4 for non-restorable or strategic sandbox
  decisions.
- Audit trail: every lifecycle state recommendation must appear in a Plane
  comment or morning brief report with an absolute report path.

## Relation to Git Worktree Hygiene Controller

The hygiene controller (`docs/operations/git-worktree-hygiene-controller.md`)
reports dirty sandboxes as blockers and clean leftover sandboxes as warnings.
This lifecycle register adds the review dimension: a clean leftover sandbox is
not debris to be deleted — it has a lifecycle state, a stale threshold, and a
review path. The hygiene controller blocks night jobs; the lifecycle register
surfaces the appropriate human action.
