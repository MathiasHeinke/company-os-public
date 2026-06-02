# Company.OS Worktree Stewardship Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return the Company.OS root checkout, stashes and sandbox worktrees to a settled, auditable baseline without losing recent 0.7.4 work or deleting ambiguous worker output.

**Architecture:** This is a stewardship run, not a cleanup script. The worker first captures immutable inventory, then classifies root changes into release slices, then handles stashes and sandboxes through review packets before any destructive action. Default action is commit, park or block; never reset/clean/delete unless a later CEO/founder decision explicitly approves that exact path.

**Tech Stack:** Git CLI, Company.OS git hygiene controller, existing release/productization gates, Markdown stewardship report.

---

## Non-Negotiable Rules

- Do not run `git reset`, `git clean`, `git checkout --`, `git stash drop`, `git worktree remove`, branch deletion, force-push, rebase, merge or deploy.
- Do not mark Plane Done.
- Do not silently discard untracked reports, metrics, scripts, docs, stashes or sandbox changes.
- If a path has unclear ownership, classify it as `unsafe-mutation` or `active-external-session`, write a blocker/stewardship note and stop that slice.
- Commit only scoped slices that pass gates and can be explained in one sentence.

## Current Known State

Captured on 2026-06-02:

```text
root branch: codex/company-os-fortress-gate-autonomy
root dirty paths: 139
tracked modified: 46
untracked: 93
stash entries: 2
root worktree count: 27
sandbox worktrees: 48
dirty sandbox worktrees: 18
```

The two stashes:

```text
stash@{2026-05-31 11:53:10 +0200}: On codex/company-os-072-start-eve-preflight: cleanup: preserve dirty Company.OS workspace before syncing 0.7.3-rc.0 main (2026-05-31)
stash@{2026-05-26 12:22:18 +0200}: On codex/company-os-cleanup-2026-05-24: cleanup: preexisting company-os workspace artifacts before eve 0.7.x continuation
```

## File Structure

**Files to create during this cleanup run:**

- `reports/stewardship/2026-06-02/root-worktree-inventory.md`: root status, diff buckets, stashes, sandbox summary.
- `reports/stewardship/2026-06-02/root-worktree-inventory.json`: machine-readable status and bucket counts.
- `reports/stewardship/2026-06-02/stash-review.md`: per-stash keep/apply/drop recommendation; no drop performed.
- `reports/stewardship/2026-06-02/sandbox-worktree-review.md`: dirty and clean sandbox roster with owner/action.
- `reports/stewardship/2026-06-02/cleanup-closeout.md`: final decision record, commands run, commits/branches/blocked paths.

**Files likely to stage as the first safe slice:**

- `docs/page-index.md`
- `reports/session-sync/2026-06-02-074-to-09-pilot-readiness.md`
- `docs/superpowers/plans/2026-06-02-company-os-worktree-stewardship-cleanup.md`
- `reports/goals/2026-06-02/company-os-074-to-09-guided-marketing-client-pilot-supergoal.md`

**Files not to stage blindly:**

- `metrics/*.jsonl`
- `reports/**` other than current stewardship/session-sync reports
- `scripts/**` modified or untracked source
- `docs/**` modified or untracked strategy/orchestration docs
- sandbox worktree files under `${LOCAL_WORKSPACE}`
- anything from stash contents

## Task 1: Capture Immutable Root Inventory

**Files:**
- Create: `reports/stewardship/2026-06-02/root-worktree-inventory.md`
- Create: `reports/stewardship/2026-06-02/root-worktree-inventory.json`

- [ ] **Step 1: Create report directory**

Run:

```bash
mkdir -p reports/stewardship/2026-06-02
```

Expected: command exits 0.

- [ ] **Step 2: Capture root git status**

Run:

```bash
git status --short --branch > reports/stewardship/2026-06-02/root-status.txt
git diff --stat > reports/stewardship/2026-06-02/root-diff-stat.txt
git stash list --date=iso > reports/stewardship/2026-06-02/stash-list.txt
git worktree list > reports/stewardship/2026-06-02/worktree-list.txt
```

Expected: all files exist and contain text.

- [ ] **Step 3: Capture structured root buckets**

Run:

```bash
node --input-type=module <<'NODE' > reports/stewardship/2026-06-02/root-worktree-inventory.json
import { execSync } from 'node:child_process';
const status = execSync('git status --porcelain=v1', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
const buckets = new Map();
for (const line of status) {
  const code = line.slice(0, 2);
  const file = line.slice(3);
  const kind = code.includes('?') ? 'untracked' : 'tracked';
  const prefix = file.split('/')[0];
  const key = `${kind}:${prefix}`;
  if (!buckets.has(key)) buckets.set(key, { key, count: 0, samples: [] });
  const bucket = buckets.get(key);
  bucket.count += 1;
  if (bucket.samples.length < 12) bucket.samples.push(file);
}
console.log(JSON.stringify({
  generated_at: new Date().toISOString(),
  branch: execSync('git branch --show-current', { encoding: 'utf8' }).trim(),
  head: execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(),
  total_dirty_paths: status.length,
  buckets: [...buckets.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
}, null, 2));
NODE
```

Expected: JSON has `total_dirty_paths` and bucket objects.

- [ ] **Step 4: Write human inventory summary**

Create `reports/stewardship/2026-06-02/root-worktree-inventory.md` with:

```markdown
# Root Worktree Inventory

Date: 2026-06-02
Workspace: ${LOCAL_WORKSPACE}
Branch: codex/company-os-fortress-gate-autonomy
Purpose: preserve root dirty-state truth before cleanup.

## Inputs

- root-status: reports/stewardship/2026-06-02/root-status.txt
- root-diff-stat: reports/stewardship/2026-06-02/root-diff-stat.txt
- stash-list: reports/stewardship/2026-06-02/stash-list.txt
- worktree-list: reports/stewardship/2026-06-02/worktree-list.txt
- structured inventory: reports/stewardship/2026-06-02/root-worktree-inventory.json

## Initial Verdict

Cleanup must proceed by scoped slice. No destructive action is approved.
```

- [ ] **Step 5: Verify no whitespace issue**

Run:

```bash
git diff --check reports/stewardship/2026-06-02/root-worktree-inventory.md
```

Expected: no output, exit 0.

## Task 2: Create The First Safe Evidence Slice

**Files:**
- Stage: `docs/page-index.md`
- Stage: `reports/session-sync/2026-06-02-074-to-09-pilot-readiness.md`
- Stage: `docs/superpowers/plans/2026-06-02-company-os-worktree-stewardship-cleanup.md`
- Stage: `reports/goals/2026-06-02/company-os-074-to-09-guided-marketing-client-pilot-supergoal.md`
- Stage: `reports/stewardship/2026-06-02/root-worktree-inventory.md`
- Stage: `reports/stewardship/2026-06-02/root-worktree-inventory.json`
- Stage: `reports/stewardship/2026-06-02/root-status.txt`
- Stage: `reports/stewardship/2026-06-02/root-diff-stat.txt`
- Stage: `reports/stewardship/2026-06-02/stash-list.txt`
- Stage: `reports/stewardship/2026-06-02/worktree-list.txt`

- [ ] **Step 1: Confirm the index gate is current**

Run:

```bash
node scripts/page-index/generate-page-index.mjs --root . --check
```

Expected:

```text
Page index is current: ${LOCAL_WORKSPACE} (source=tracked)
```

- [ ] **Step 2: Run evidence gates**

Run:

```bash
git diff --check
node scripts/release-gates/productization-readiness.mjs check --json
node scripts/install/self-serve-smoke.mjs run --source ${LOCAL_WORKSPACE} --date 2026-06-02 --json
```

Expected:

- `git diff --check`: no output.
- productization readiness: `status` is `pass`.
- self-serve smoke: `status` is `pass`.

- [ ] **Step 3: Stage only the first safe evidence slice**

Run:

```bash
git add docs/page-index.md \
  reports/session-sync/2026-06-02-074-to-09-pilot-readiness.md \
  docs/superpowers/plans/2026-06-02-company-os-worktree-stewardship-cleanup.md \
  reports/goals/2026-06-02/company-os-074-to-09-guided-marketing-client-pilot-supergoal.md \
  reports/stewardship/2026-06-02/root-worktree-inventory.md \
  reports/stewardship/2026-06-02/root-worktree-inventory.json \
  reports/stewardship/2026-06-02/root-status.txt \
  reports/stewardship/2026-06-02/root-diff-stat.txt \
  reports/stewardship/2026-06-02/stash-list.txt \
  reports/stewardship/2026-06-02/worktree-list.txt
```

Expected: command exits 0.

- [ ] **Step 4: Inspect staged diff**

Run:

```bash
git diff --cached --stat
git diff --cached --check
```

Expected:

- stat contains only the files from Step 3.
- `git diff --cached --check` exits 0.

- [ ] **Step 5: Commit the evidence slice**

Run:

```bash
git commit -m "docs(stewardship): capture 074 to 09 pilot cleanup plan"
```

Expected: commit succeeds. If it fails due missing files, unstage with `git restore --staged <file>` only for files that do not exist, then rerun Step 4 and commit.

## Task 3: Classify Remaining Root Changes Into Release Slices

**Files:**
- Create: `reports/stewardship/2026-06-02/root-slice-classification.md`

- [ ] **Step 1: Generate remaining status after first commit**

Run:

```bash
git status --short --branch > reports/stewardship/2026-06-02/root-status-after-evidence-slice.txt
git diff --stat > reports/stewardship/2026-06-02/root-diff-stat-after-evidence-slice.txt
```

Expected: output files exist.

- [ ] **Step 2: Write slice classification**

Create `reports/stewardship/2026-06-02/root-slice-classification.md` with this table and fill only from `git status --short`:

```markdown
# Root Slice Classification

Date: 2026-06-02
Rule: do not stage a file unless it belongs clearly to one slice.

| Slice | Paths | Bucket | Action |
|---|---|---|---|
| 0.7.4 Supergoal Factory / Fortress Gate | scripts/orchestration/post-worker-quality*, scripts/goal/*, registries/capabilities/*, docs/orchestration/post-worker-quality-loop.md, docs/orchestration/supergoal-execution-ladder.md | current-session-output | verify and commit as one implementation slice |
| 0.7.5 Public-Upstream Update | scripts/update/*, scripts/release/build-public-mirror.mjs, reports/command-eve-installer/update-lifecycle.md, docs/templates/supergoals-2026-05-31/*, scripts/plane/materialize-public-upstream-update-supergoal-2026-05-31.mjs | current-session-output | verify and commit after public-upstream smoke |
| 0.8/0.9 Strategy And Pilot Docs | docs/strategy/command-eve-offer-v1.md, docs/strategy/ki-rendite-score-fragebogen.md, marketing/* | current-session-output | commit only after secret/public-copy review |
| Book Authoring Pack | docs/*book-authoring*, scripts/content/book-authoring*, kits/company-os-kit/.company-os/domain-packs/book-authoring/* | separate-scope-output | park or commit on separate branch |
| ATLAS 506/576/599 Plane Helpers | scripts/plane/atlas-*, reports/atlas/* | active-external-session | park on ATLAS stewardship report unless current owner confirms |
| Metrics Ledgers | metrics/agent-events.jsonl, metrics/agent-runs.jsonl | generated-evidence | commit only if internal evidence slice; never public-release source |
| Broad reports | reports/artifact-truth, reports/audits, reports/night-shift, reports/runtime-auth, reports/runs | generated-evidence | secret-scan then commit/park by date and owner |
```

- [ ] **Step 3: Do not commit from this task**

Expected: this task only creates classification. Commit happens in later scoped tasks after gates.

## Task 4: Review Stashes Without Applying Them

**Files:**
- Create: `reports/stewardship/2026-06-02/stash-review.md`

- [ ] **Step 1: Inspect stash names and stats**

Run:

```bash
git stash list --date=iso
git stash show --stat stash@{0}
git stash show --stat stash@{1}
```

Expected: stats print; no stash is applied or dropped.

- [ ] **Step 2: Write stash review**

Create `reports/stewardship/2026-06-02/stash-review.md`:

```markdown
# Stash Review

Date: 2026-06-02
Rule: no stash apply/drop until root is clean and exact target branch is chosen.

## Stashes

| Stash | Source branch/message | Initial action |
|---|---|---|
| stash@{0} | cleanup: preserve dirty Company.OS workspace before syncing 0.7.3-rc.0 main (2026-05-31) | keep, review after 0.7.4 root slices are committed |
| stash@{1} | cleanup: preexisting company-os workspace artifacts before eve 0.7.x continuation | keep, review after stash@{0}; likely archival/historical |

## Safe Review Command

Use `git stash show --stat stash@{N}` and, only when root is clean, `git stash branch review/company-os-stash-N stash@{N}`.

## Forbidden

No `git stash apply`, `git stash pop`, or `git stash drop` in a dirty root.
```

## Task 5: Review Sandbox Worktrees Without Removing Them

**Files:**
- Create: `reports/stewardship/2026-06-02/sandbox-worktree-review.md`

- [ ] **Step 1: Capture sandbox status**

Run:

```bash
COMPANY_OS_ROOT=${LOCAL_WORKSPACE} \
DEVELOPER_ROOT=${LOCAL_WORKSPACE} \
node scripts/git-hygiene/check-git-hygiene.mjs \
  --registry .company-os/operations/workspace-registry.json \
  --sandbox-root ${LOCAL_WORKSPACE} \
  --fail-on-blockers \
  --json > reports/stewardship/2026-06-02/git-hygiene-before-sandbox-review.json
```

Expected: exit code may be 2 because blockers exist. If the shell stops before writing output, rerun without redirect and copy the summary into the Markdown report.

- [ ] **Step 2: Write sandbox review report**

Create `reports/stewardship/2026-06-02/sandbox-worktree-review.md`:

```markdown
# Sandbox Worktree Review

Date: 2026-06-02
Rule: no sandbox removal without explicit CEO/founder cleanup decision.

## Dirty Sandboxes To Preserve First

Known dirty sandboxes from 2026-06-02 hygiene:

- ${LOCAL_WORKSPACE}
- ${LOCAL_WORKSPACE}
- ${LOCAL_WORKSPACE}
- ${LOCAL_WORKSPACE}
- ${LOCAL_WORKSPACE}
- ${LOCAL_WORKSPACE}
- ${LOCAL_WORKSPACE}
- ${LOCAL_WORKSPACE}
- ${LOCAL_WORKSPACE}

## Clean Sandboxes

Clean sandbox worktrees can be archived or removed only after controller review. This report does not approve removal.

## Recommended Action

Create a separate Plane/cleanup parent: Workspace Stewardship - Historic Sandbox Closure.
```

## Task 6: Commit Or Park Remaining Root Slices One At A Time

**Files:**
- Depends on Task 3 classification.

- [ ] **Step 1: Pick exactly one slice**

Choose one from `root-slice-classification.md`. Recommended first implementation slice:

```text
0.7.4 Supergoal Factory / Fortress Gate
```

- [ ] **Step 2: Run targeted tests for that slice**

For 0.7.4 Supergoal Factory / Fortress Gate, run:

```bash
node --test \
  scripts/goal/goal-synthesis-core.test.mjs \
  scripts/goal/supergoal-core.test.mjs \
  scripts/orchestration/codex-controller-dryrun.test.mjs \
  scripts/orchestration/post-worker-quality-loop-core.test.mjs \
  scripts/orchestration/post-worker-quality-plane-handoff-core.test.mjs \
  scripts/orchestration/post-worker-quality-scheduler-core.test.mjs \
  scripts/orchestration/runtime-dispatcher-v1.test.mjs \
  scripts/orchestration/runtime-dispatcher-v12-core.test.mjs \
  scripts/capabilities/capability-registry-core.test.mjs
```

Expected: all selected tests pass. If a test fails, stop and write a blocker note.

- [ ] **Step 3: Stage only files for the selected slice**

Run `git add` with explicit file paths from the slice. Do not use `git add .`.

Example for the 0.7.4 slice:

```bash
git add \
  scripts/goal/goal-synthesis-core.mjs \
  scripts/goal/goal-synthesis-core.test.mjs \
  scripts/goal/supergoal-core.mjs \
  scripts/goal/supergoal-core.test.mjs \
  scripts/orchestration/codex-controller-dryrun.mjs \
  scripts/orchestration/codex-controller-dryrun.test.mjs \
  scripts/orchestration/post-worker-quality-loop-core.mjs \
  scripts/orchestration/post-worker-quality-loop-core.test.mjs \
  scripts/orchestration/post-worker-quality-plane-handoff-core.mjs \
  scripts/orchestration/post-worker-quality-plane-handoff-core.test.mjs \
  scripts/orchestration/post-worker-quality-plane-handoff.mjs \
  scripts/orchestration/post-worker-quality-scheduler-core.mjs \
  scripts/orchestration/post-worker-quality-scheduler-core.test.mjs \
  scripts/orchestration/runtime-dispatcher-v1.mjs \
  scripts/orchestration/runtime-dispatcher-v1.test.mjs \
  scripts/orchestration/runtime-dispatcher-v12-core.mjs \
  scripts/orchestration/runtime-dispatcher-v12-core.test.mjs \
  scripts/capabilities/capability-registry-core.test.mjs \
  registries/capabilities/company-os.json \
  registries/capabilities/example.json \
  docs/orchestration/post-worker-quality-loop.md \
  docs/orchestration/supergoal-execution-ladder.md
```

- [ ] **Step 4: Inspect staged slice**

Run:

```bash
git diff --cached --stat
git diff --cached --check
```

Expected: only selected-slice files staged; check exits 0.

- [ ] **Step 5: Commit selected slice**

Run:

```bash
git commit -m "feat(orchestration): harden supergoal post-worker quality routing"
```

Expected: commit succeeds.

- [ ] **Step 6: Repeat Task 6 for each remaining slice**

Use a new scoped commit message per slice:

```text
feat(update): harden public-upstream update provenance
docs(strategy): capture command eve pilot funnel artifacts
feat(content): add book authoring department pack
docs(atlas): capture atlas release-gate evidence
```

Stop whenever a slice cannot be explained, tested or safely staged.

## Task 7: Closeout And Remaining Blockers

**Files:**
- Create: `reports/stewardship/2026-06-02/cleanup-closeout.md`

- [ ] **Step 1: Run closeout gates**

Run:

```bash
git status --short --branch
git diff --check
node scripts/page-index/generate-page-index.mjs --root . --check
```

Expected:

- Root may still be dirty if unresolved slices remain.
- `git diff --check` exits 0.
- page index is current.

- [ ] **Step 2: Write closeout report**

Create `reports/stewardship/2026-06-02/cleanup-closeout.md`:

```markdown
# Cleanup Closeout

Date: 2026-06-02
Workspace: ${LOCAL_WORKSPACE}

## Commits Created

- <commit-sha> <subject>

## Still Dirty

- <path or bucket>

## Parked

- <path or bucket>

## Blocked

- <path or bucket and reason>

## Explicitly Not Done

- No stashes dropped.
- No sandbox worktrees removed.
- No reset, clean, branch deletion, force-push, merge or deploy.
```

- [ ] **Step 3: If unresolved dirt remains, create follow-up parent**

Create a Plane or local follow-up only after the closeout report exists:

```text
Workspace Stewardship - Historic Sandbox Closure
```

Acceptance: each dirty sandbox has owner, branch, commit, dirty count, action and HumanGate.

## Self-Review

- Spec coverage: root dirty paths, stashes and sandbox worktrees are covered.
- Placeholder scan: this plan uses explicit files, commands and expected outcomes.
- Safety check: no destructive command is part of the default plan.

