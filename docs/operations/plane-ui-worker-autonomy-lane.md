# Plane UI Worker Autonomy Lane

Status: v0.6.x recurring pilot

## Purpose

The Plane UI worker lane is the first browser-backed autonomy lane that can run
on a schedule without turning the browser session into an uncontrolled write
surface.

It exists to prove a complete local loop:

1. Regenerate a short-lived Plane UI proof from the managed Chrome profile.
2. Run the hard-cron wrapper with GitNexus, token rotation, warm preflight and
   lane locks.
3. Execute only the bounded child command declared for the run.
4. Write reports and typed events.
5. Leave Plane Done, deploy, merge, publish and production writes untouched.

## Automation Identity

| Field | Value |
|---|---|
| Stable id | `company-os-plane-ui-worker-cadence` |
| Codex automation id | `company-os-plane-ui-worker-cadence-pilot` |
| Initial schedule | `FREQ=HOURLY;INTERVAL=4` |
| Lane | `plane-ui-worker` |
| Autonomy | L2 report/worker lane, HG-2.5 release before enabling broader dispatch |
| Runtime auth | Plane App token rotation, managed Chrome CDP proof, GitNexus current |
| Primary script | `scripts/runtime/plane-ui-worker-cadence-runner.mjs` |
| Source of truth | `docs/operations/plane-ui-worker-recurring-cadence.md` |
| Reports | `reports/runtime-auth/` and `reports/runs/[WORK_ITEM_ID]/` |

## Pilot Command Shape

The recurring job must call the dedicated cadence runner, not the proof probe
and hard-cron wrapper as detached commands:

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/plane-ui-worker-cadence-runner.mjs \
  --company-root "${COMPANY_OS_ROOT}" \
  --workspace-path "${COMPANY_OS_ROOT}" \
  --run-id plane-ui-worker-$(date +%Y%m%d-%H%M) \
  --issue [WORK_ITEM_ID] \
  --dedupe-key company-os-plane-ui-worker-cadence \
  --target-url https://app.plane.so/companyos/projects/3537d502-b5a7-4214-9f7d-8f571fb1cd1e/issues/ \
  --output reports/runtime-auth/plane-ui-worker-cadence.md \
  --json-output reports/runtime-auth/plane-ui-worker-cadence.json \
  --json -- node scripts/orchestration/runtime-dispatcher-v1.mjs --mode run
```

For release-pilot runs, the child command may be a bounded no-op or a single
manual-dispatch worker. It must not sweep all ready work until a separate
release item expands the lane.

The first active Codex automation uses the bounded no-op heartbeat child. It is
allowed to produce reports over time, not to dispatch broad queue work.

## Cadence Levels

| Level | Meaning | Allowed |
|---|---|---|
| `pilot-manual` | operator starts one run | yes |
| `pilot-cron-report` | scheduled proof plus hard-cron report, bounded child only | yes after [WORK_ITEM_ID] |
| `pilot-cron-worker` | scheduled single worker dispatch | needs HG-2.5 release |
| `continuous-controller` | recurring queue scan and worker dispatch | later, not v0.6.x default |

## Required Gates

- GitNexus status is current.
- Managed Chrome CDP proof regenerates immediately before the run.
- Plane App token rotation passes in the same run window.
- Lane lock is acquired and released.
- Child command runs only after proof and hard-cron checks pass.
- Run reports are written and do not contain cookies, browser storage, tokens
  or raw prompt payloads.
- `git diff --check` stays clean for any committed reports/docs.

## Stop Rules

Stop with `BLOCKED_AUTH` if the browser proof cannot be refreshed.

Stop with `BLOCKED_GITNEXUS` if GitNexus is stale.

Stop with `BLOCKED_LOCK` if another `plane-ui-worker` lane run is active.

Stop with `NEEDS_HUMAN` if the child command wants to deploy, publish, merge,
push, transition Plane Done, read browser storage or run production writes.

## Next Promotion

Promotion from `pilot-cron-report` to `pilot-cron-worker` requires:

1. At least two successful scheduled cadence reports.
2. One independent reviewer report over those runs.
3. CAO PASS on auth, scope, event and report boundaries.
4. Controller release note naming the exact child worker class allowed.
