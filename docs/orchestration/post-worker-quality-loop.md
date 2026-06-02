# Post-Worker Quality Loop v0

Status: canonical doctrine for lower-worker audit, deep-audit and hotfix routing
Phase: v0 deterministic router and contract vocabulary
Use for: deciding what happens after a C-level or lower worker reports work,
before CEO/Codex accepts, delegates, hotfixes or closes the item
Last updated: 2026-05-31

## Purpose

The Runtime Dispatcher can already run bounded workers and hand off to CAO and
Codex Controller. What was missing was the lower-worker quality lane below the
C-level seats: a deterministic way to say whether a completed worker needs a
normal audit, security audit, deep audit, bounded hotfix, or human gate.

This loop defines that lane.

The central rule is strict:

```text
worker.reported
  -> CAO verdict
  -> Codex Controller decision
  -> Post-Worker Quality Loop plan
  -> scheduler may spawn only from explicit controller markers
  -> follow-up worker reports
  -> CAO/controller re-check
```

Codex Controller still does not spawn workers directly. It writes one or more
markers. The scheduler consumes those markers only when policy, HumanGate and
loop limits allow it.

## Worker Classes

| Class | Agent | Mode | Purpose | Writes |
|---|---|---|---|---|
| `quality-auditor` | Codex | audit | Re-run gates, inspect diff/report, check contract conformance and bug risk | reports and `controller.audit-followup` |
| `security-auditor` | Claude | audit | Read-only security, secret, auth, RLS and data-risk check | reports and `controller.audit-followup` |
| `bug-regression-auditor` | Claude | audit | Read-only regression/root-cause pass for bounded failures | reports and `controller.audit-followup` |
| `deep-audit-worker` | Claude | audit | Long-context Opus audit for shared-runtime or cross-repo work | reports and `controller.audit-followup` |
| `hotfix-worker` | Claude | implement | Narrow repair of a known, bounded failure | declared `AllowedWritePaths` only and `worker.hotfix-reported` |

These are lower-worker classes, not C-level seats. They inherit the owning
`role:*` route from the parent work item, usually `role:cto` for code and
runtime work. They do not mark Plane `Done`.

## Routing Matrix

| Inference Class | Required Follow-Up | Auto Hotfix | Stop Rule |
|---|---|---:|---|
| `P0-doc-small` | controller reruns gates | no | audit only if failed |
| `P1-code-bounded` | controller reruns gates; bug audit on failure | max 1 round | stop on security/high-risk signal |
| `P2-code-shared` | Codex quality audit; security audit on security/auth signal | no | CEO/Codex must delegate hotfix |
| `P3-cross-repo` | Codex quality audit plus Claude deep audit | no | CEO/Codex must delegate hotfix |
| `P4-high-risk` | no autonomous spawn | no | HumanGate / Founder or CEO critical gate |

The machine-readable policy lives in
`registries/quality/post-worker-quality-loop.json`.

## Markers

The controller and scheduler use stable Plane comment markers.

```yaml
controller.audit-followup:
  version: post-worker-quality-loop/v0
  work_item: COMPA-<n>
  state: CONTROLLER_RERUN_GATES | AUDIT_REQUESTED | DEEP_AUDIT_REQUESTED
  worker_class: quality-auditor | security-auditor | bug-regression-auditor | deep-audit-worker | controller-only
  reason_codes:
    - quality-loop.audit-required
  source_worker_reported_comment_id: <comment id>
  source_cao_verdict_comment_id: <comment id>
  report_path: /absolute/path/to/reports/audits/<name>.md
  blocked_actions_remaining:
    - merge
    - push
    - deploy
    - production-write
    - plane-done
```

```yaml
controller.hotfix-request:
  version: post-worker-quality-loop/v0
  work_item: COMPA-<n>
  state: HOTFIX_REQUESTED
  worker_class: hotfix-worker
  max_auto_hotfix_rounds: 1
  previous_hotfix_rounds: 0
  allowed_write_paths:
    - /absolute/path/from/parent/AllowedWritePaths
  required_afterward:
    - fresh worker.hotfix-reported
    - fresh CAO verdict
    - fresh Codex Controller decision
  blocked_actions_remaining:
    - merge
    - push
    - deploy
    - schema/RLS/auth
    - production-write
    - public-publish
    - plane-done
```

```yaml
worker.hotfix-reported:
  version: post-worker-quality-loop/v0
  work_item: COMPA-<n>
  state: PASS | REJECT | BLOCKED_AUTH | BLOCKED_DEPENDENCY | TIMEOUT | RUNTIME_ERROR | NEEDS_HUMAN
  changed_files:
    - /absolute/path
  gates:
    - command: node --test ...
      result: PASS | FAIL
  gitnexus_detect_changes: PASS | FAIL | unavailable
  report_path: /absolute/path/to/reports/runs/<run>.md
  blocked_actions_remaining:
    - merge
    - push
    - deploy
    - production-write
    - plane-done
```

## Stop Gates

The loop stops before autonomous hotfix or worker spawn when any of these are
true:

- secret, credential or token exposure
- schema, RLS, auth or service-role change
- production write, deploy or public publish
- material spend, subscription or pricing change
- legal, medical or regulated public claim
- high-severity `S0` / `S1` finding
- `HG-3`, `HG-3.5` or `HG-4` without the relevant release artifact
- more than one autonomous hotfix round for the same bounded failure

In those cases the controller writes a decision/escalation card. The scheduler
does not spawn a lower worker.

## Executable Router

Run the dry-run router:

```bash
node scripts/orchestration/post-worker-quality-loop-core.mjs \
  --field InferenceClass=P1-code-bounded \
  --worker-state PASS \
  --cao-verdict REJECT \
  --finding "S2 bug: regression" \
  --json
```

The router writes nothing. It returns:

- `status`: `NO_FOLLOWUP`, `FOLLOWUP_READY`, `NEEDS_HUMAN` or `BLOCKED`
- `followup_worker_contracts`
- `markers_to_post`
- `scheduler.controller_may_spawn_workers: false`
- `scheduler.scheduler_may_spawn`
- loop limits and reason codes

The Codex controller loads the same registry during its bounded dry-run/post
flow. For coding contracts it now embeds a `post_worker_quality` summary plus
root-level `controller.audit-followup` and `controller.hotfix-request` marker
blocks into the controller decision card. The scheduler reads the latest
controller card and fans out every eligible marker into a separate
lower-worker candidate. This makes Security, regression, deep-audit and
bounded hotfix follow-ups visible to the existing scheduler without giving the
controller direct spawn authority.

Operational proof: [WORK_ITEM_ID] used this exact path. Codex wrote scheduler-visible
`controller.audit-followup` markers, the scheduler translated them into lower
worker candidates, a `quality-auditor` ran first, and a refreshed
`security-auditor` ran afterward. No Plane `Done` transition was made, and the
controller never spawned either worker directly.

The public Company.OS mirror ships the generic policy registry at
`registries/quality/post-worker-quality-loop.json` and executable lower-worker
profiles in `registries/capabilities/example.json`. Private capability
registries and customer-specific routing remain excluded from the public
distribution.

## Scheduler Handoff

When the controller has posted `controller.audit-followup` or
`controller.hotfix-request`, the scheduler must translate each eligible marker
from the latest controller card into a normal lower-worker contract before
Runtime Dispatcher v1 can touch it.

Executable dry-run:

```bash
node scripts/orchestration/post-worker-quality-scheduler-core.mjs \
  --comments-file /absolute/path/to/comments.json \
  --parent-fields-file /absolute/path/to/parent-contract-fields.json \
  --workspace-root /absolute/path/to/workspace \
  --json
```

The scheduler handoff writes nothing and spawns nothing. It returns:

- `NO_SPAWN` for controller-only markers
- `LOWER_WORKER_READY` with a flat `dispatch: ready` Worker Issue Contract
- `CANDIDATES_READY` when one controller card contains multiple eligible
  lower-worker markers
- `BLOCKED` for unknown worker classes, missing hotfix write scope, exceeded
  hotfix round limits or invalid policy registry

Runtime Dispatcher may consume the generated lower-worker contract only after
normal Stage 0.5, Stage 0.65, CapabilityProfile and HumanGate checks pass.

## Plane Handoff

`post-worker-quality-scheduler-core.mjs` is intentionally file/input based.
The live Plane bridge is:

```bash
node scripts/orchestration/post-worker-quality-plane-handoff.mjs \
  --workspace companyos \
  --project-id <project-uuid> \
  --sequence COMPA-### \
  --mode dry-run \
  --auth app-token \
  --json
```

Project scan mode for the scheduler lane:

```bash
node scripts/orchestration/post-worker-quality-plane-handoff.mjs \
  --workspace companyos \
  --project-id <project-uuid> \
  --scan-project \
  --max-items 50 \
  --mode dry-run \
  --auth app-token \
  --json
```

What it does:

- reads the Plane work item and its comments through the Plane Auth Bridge
- extracts the parent Worker Issue Contract from the work item description
- finds the latest controller card with `controller.audit-followup` or
  `controller.hotfix-request`
- calls the scheduler handoff core and preserves fanout candidates
- optionally writes a local report with `--write-report`
- in `--mode post`, posts one `scheduler.lower-worker-candidate` Plane comment
  per candidate, bounded by `--post-limit`, only when the scheduler produced
  `LOWER_WORKER_READY` or `CANDIDATES_READY`
- in `--scan-project` mode, scans a bounded number of Plane items, ignores
  unmarked items before contract validation and posts at most `--post-limit`
  candidates when explicitly run with `--mode post`

It never locks, spawns, transitions state, marks Done, deploys, pushes or runs
the worker. The candidate comment is a queueable artifact, not authorization to
execute.

## Integration Boundary

This loop sits after `docs/orchestration/codex-controller-runtime.md` and before
the next Runtime Dispatcher run. It complements, but does not replace:

- Contract Controller Stage 0.5
- Runtime Executability Gate Stage 0.65
- Runtime Inference Router Stage 3.5
- CAO verdict
- Codex Controller decision
- CEO/Founder release authority

It is not a hidden autonomy promotion. It is a bounded quality lane.
