# Git Worktree Hygiene Controller

Status: executable controller lane

## Purpose

Night jobs need one unambiguous filesystem baseline. Dirty roots, forgotten
sandbox worktrees, detached branches and unexpected branch/worktree counts make
autonomous controller decisions ambiguous.

The Git Worktree Hygiene Controller is a read-only guard before night work and
morning briefs. It reports:

- missing workspace roots
- non-git workspaces
- dirty working trees
- stash entries
- detached roots
- unexpected root branches
- local ahead/behind state
- excess worktrees per repository
- leftover sandbox worktrees
- dirty sandbox worktrees

It never deletes, resets, cleans, pushes, merges or checks out branches.

## Command

```bash
node ${COMPANY_OS_ROOT}/scripts/git-hygiene/check-git-hygiene.mjs \
  --registry ${COMPANY_OS_ROOT}/kits/company-os-kit/.company-os/operations/workspace-registry.example.json \
  --sandbox-root ${SANDBOX_ROOT} \
  --report ${COMPANY_OS_ROOT}/reports/git-hygiene/YYYY-MM-DD/HHMM-git-hygiene.md \
  --json-output ${COMPANY_OS_ROOT}/reports/git-hygiene/YYYY-MM-DD/HHMM-git-hygiene.json \
  --fail-on-blockers
```

For end-of-session checks, use strict close-session mode:

```bash
node ${COMPANY_OS_ROOT}/scripts/git-hygiene/check-git-hygiene.mjs \
  --registry ${COMPANY_OS_ROOT}/.company-os/operations/workspace-registry.json \
  --close-session
```

For a live installation, copy the example registry to:

```text
.company-os/operations/workspace-registry.json
```

Then set real workspace paths, expected root branches and sandbox roots.
`workspace-registry.json` is local installation state and should stay
gitignored. Keep committed examples in `.company-os/operations/*.example.json`
or `kits/company-os-kit/.company-os/operations/`.

Registry path strings may use environment placeholders such as
`${COMPANY_OS_ROOT}`, `${DEVELOPER_ROOT}` or `${SANDBOX_ROOT}`. The controller
expands placeholders from the process environment. Unknown placeholders are left
literal so misconfigured registries fail visibly instead of silently checking the
wrong path.

## Registry Fields

The controller accepts the standard Company.OS workspace registry shape:

```json
{
  "defaults": {
    "default_branches": ["main", "master"],
    "integration_branch": "main",
    "max_worktrees": 1,
    "allow_stashes": false,
    "allow_no_upstream": false,
    "sandbox_roots": ["${SANDBOX_ROOT}"]
  },
  "workspaces": {
    "product": {
      "path": "${DEVELOPER_ROOT}/product",
      "expected_branches": ["main"],
      "integration_branch": "main",
      "max_worktrees": 1
    }
  }
}
```

Per-workspace overrides:

| Field | Meaning |
|---|---|
| `expected_branches` | Branches allowed for the root checkout without warning. |
| `integration_branch` | Branch that may be mirrored by `sync-main.mjs`. Default: `main`. |
| `max_worktrees` | Maximum allowed `git worktree list` count for that repo. |
| `allow_dirty` | If true, dirty state is reported but not blocked. Default: false. |
| `allow_detached` | If true, detached HEAD is reported but not blocked. Default: false. |
| `allow_stashes` | If true, stash entries are reported but not blocked. Default: false. |
| `allow_no_upstream` | If true, close-session mode does not block a missing upstream. Default: false. |
| `require_upstream` | If true, missing upstream becomes a warning. Default: false. |

## Verdicts

| Status | Meaning | Exit with `--fail-on-blockers` |
|---|---|---:|
| `clean` | No blockers or warnings. | 0 |
| `needs_attention` | Clean enough to inspect, but ahead/behind, branch or leftover-sandbox warnings exist. | 0 |
| `blocked` | Dirty root, stash entry, dirty sandbox, missing root, detached disallowed root or excess worktrees. | 2 |

Use `--fail-on-warnings` only for strict release or packaging checks. Nightly
controller jobs should usually fail on blockers and carry warnings into the
morning brief.

`--close-session` also sets `--fail-on-blockers` and promotes ahead/behind,
missing upstreams and unexpected root branches to blockers. Use it when a
human or agent is about to stop work and the root checkouts should be fully
settled.

## Controller Rules

- Dirty roots block unattended work because the controller cannot know whether
  changes are human work, worker output or stale generated artifacts.
- Stash entries block by default because they hide work outside the visible
  branch and PR path.
- Dirty sandbox worktrees block because they may contain unreported L3 output.
- Clean leftover sandbox worktrees warn because they should be archived,
  reviewed or removed after controller review.
- Local ahead/behind is not a blocker by itself. It is a morning decision:
  push, PR, review, park or keep local.
- A non-default root branch warns unless the workspace registry explicitly
  allows it.

## Safe Main Mirror

`sync-main.mjs` exists for the recurring "why is main ahead/behind?" problem.
It is dry-run by default:

```bash
node ${COMPANY_OS_ROOT}/scripts/git-hygiene/sync-main.mjs \
  --registry ${COMPANY_OS_ROOT}/.company-os/operations/workspace-registry.json
```

To execute the plan:

```bash
node ${COMPANY_OS_ROOT}/scripts/git-hygiene/sync-main.mjs \
  --registry ${COMPANY_OS_ROOT}/.company-os/operations/workspace-registry.json \
  --write
```

The sync script mutates only when all of these are true:

- root worktree is clean
- stash list is empty
- current branch equals `integration_branch`
- upstream is configured
- the hygiene controller has no blockers for that workspace

When it syncs, it fetches the upstream remote, detaches to the upstream ref,
force-moves the local integration branch to that ref, then switches back. It
does not reset, clean, delete branches, remove worktrees, push, merge or touch
feature branches. Work in progress therefore remains visible as dirty files,
stashes, feature branches or PRs, and blocks the sync instead of being hidden.

## Hard Cron Wrapper Pattern

Run this lane through the hard cron wrapper:

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/hard-cron-wrapper.mjs \
  --company-root "${COMPANY_OS_ROOT}" \
  --workspace-path "${COMPANY_OS_ROOT}" \
  --lane git-worktree-hygiene \
  --run-id git-worktree-hygiene-YYYYMMDD-HHMM \
  --dedupe-key git-worktree-hygiene \
  --skip-budget \
  --timeout-ms 120000 \
  -- node scripts/git-hygiene/check-git-hygiene.mjs \
    --registry .company-os/operations/workspace-registry.json \
    --fail-on-blockers
```

Do not pass `--skip-preflight` in scheduled production use unless the source
issue explicitly records why runtime auth and artifact freshness are irrelevant.

## Output Contract

Default reports:

```text
reports/git-hygiene/YYYY-MM-DD/HHMM-git-hygiene.md
reports/git-hygiene/YYYY-MM-DD/HHMM-git-hygiene.json
```

Morning brief should surface:

- blockers first
- dirty workspace names
- stash counts
- dirty sandbox names
- local ahead/behind summary
- exact next safe action per blocker

## HumanGate

This controller may recommend cleanup. It may not autonomously perform cleanup.

Human/CEO review is required before:

- deleting branches
- removing worktrees
- resetting or cleaning files
- pushing commits
- opening PRs
- merging
- deploying
