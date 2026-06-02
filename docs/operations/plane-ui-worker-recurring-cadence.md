# Plane UI Worker Recurring Cadence

Status: runner-proven recurring pilot substrate

## Purpose

`plane-ui-worker` is the hard-cron lane for browser-bound Plane UI work. It is
more sensitive than normal controller or Claude worker lanes because it depends
on an operator-approved browser session. Recurring cadence may only run after
browser proof, GitNexus state and cleanup policy are all explicit.

## Current Release State

As of [WORK_ITEM_ID] and [WORK_ITEM_ID], the lane has proof-backed smoke evidence and a
dedicated cadence runner:

- missing browser proof blocks before child execution
- stale GitNexus blocks before child execution
- fresh browser proof plus current GitNexus allows one bounded child command
  to execute
- `scripts/runtime/plane-ui-worker-cadence-runner.mjs` wraps proof refresh and
  hard-cron execution into one fail-closed command

That evidence does not by itself enable recurring cadence.
Recurring activation is tracked by
`docs/operations/plane-ui-worker-autonomy-lane.md`.

## Required Cadence Shape

A recurring `plane-ui-worker` job must be a two-step local chain. Use the
dedicated runner so proof refresh and hard-cron execution stay one fail-closed
operation:

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/plane-ui-worker-cadence-runner.mjs \
  --company-root "${COMPANY_OS_ROOT}" \
  --workspace-path "${COMPANY_OS_ROOT}" \
  --run-id plane-ui-worker-YYYYMMDD-HHMM \
  --issue [WORK_ITEM_ID] \
  --dedupe-key plane-ui-worker-[WORK_ITEM_ID] \
  --target-url https://app.plane.so/companyos/projects/3537d502-b5a7-4214-9f7d-8f571fb1cd1e/issues/ \
  --output reports/runtime-auth/plane-ui-worker-cadence.md \
  --json-output reports/runtime-auth/plane-ui-worker-cadence.json \
  --json -- node scripts/orchestration/runtime-dispatcher-v1.mjs --mode run ...
```

Internally the runner performs:

1. Regenerate a short-lived redacted Plane UI proof from the managed Chrome CDP
   profile.
2. Run `hard-cron-wrapper.mjs --lane plane-ui-worker` with warm preflight and
   Plane App token rotation required.

The child command must not start if either step fails.

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/browser-auth-plane-ui-probe.mjs \
  --cdp-url http://127.0.0.1:9222 \
  --target-url https://app.plane.so/companyos/projects/3537d502-b5a7-4214-9f7d-8f571fb1cd1e/issues/ \
  --proof-file ~/.company-os/browser-auth-proof.json \
  --marker CompanyOS \
  --marker COMPA \
  --json

node ${COMPANY_OS_ROOT}/scripts/runtime/hard-cron-wrapper.mjs \
  --company-root "${COMPANY_OS_ROOT}" \
  --workspace-path "${COMPANY_OS_ROOT}" \
  --lane plane-ui-worker \
  --run-id plane-ui-worker-YYYYMMDD-HHMM \
  --issue [WORK_ITEM_ID] \
  --dedupe-key plane-ui-worker-[WORK_ITEM_ID] \
  --skip-budget \
  --plane-token-rotation required \
  --timeout-ms 1800000 \
  -- node scripts/orchestration/runtime-dispatcher-v1.mjs --mode run ...
```

The proof file remains a redacted health artifact. It must never contain cookies,
tokens, passwords, request headers, storage snapshots or session IDs.

## Retention Policy

- Proof TTL stays short. Default accepted proof window is minutes, not hours.
- Local proof file may be overwritten by each probe run.
- Run reports may retain redacted proof timestamps and marker booleans.
- Reports must not retain the proof file contents if any future probe adds
  fields beyond the current redacted marker format.
- Managed Chrome profile user-data-dir is local runtime state, not a repo
  artifact, and must never be copied into reports or commits.

## Refresh Cadence

Each recurring run must refresh proof immediately before hard-cron execution.
Do not rely on a previous proof from an earlier run window.

If the probe returns `plane-ui-login-markers-present`, `target-not-found`,
`cdp-port-unavailable` or any other non-PASS state, the cadence records
`BLOCKED_AUTH` and stops. It must not retry by opening a normal daily Chrome
profile or by pasting tokens.

## Cleanup Policy

Cleanup is separate from cadence execution.

Allowed cleanup artifact:

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/browser-auth-managed-chrome-profile.mjs \
  --mode cleanup-plan \
  --target-url https://app.plane.so/companyos/projects/3537d502-b5a7-4214-9f7d-8f571fb1cd1e/issues/ \
  --json
```

The cleanup plan is non-executing. It may list a managed PID signal and launch
manifest removal, but it must not:

- delete the browser user-data-dir
- read browser storage
- export browser state
- run while a proof or worker run is active

Actual process signaling needs a separate release slice.

## Release Gates Before Enabling Cadence

Before any recurring `plane-ui-worker` schedule is activated:

1. [WORK_ITEM_ID] evidence exists and is green.
2. GitNexus is current.
3. Browser proof probe can regenerate a fresh proof.
4. Hard-cron smoke passes from the regenerated proof.
5. Cleanup-plan artifact exists and is non-executing.
6. Dedupe key and run ID include the target work item or cadence name.
7. The cadence command is recorded in Plane with HG-2.5 release authority.

## Boundaries

Not allowed as part of cadence release prep:

- enable recurring cadence as a side effect of docs or smoke evidence
- mark unrelated Plane items Done
- deploy, publish, or run production writes
- read browser credentials or storage
- delete browser profile data

## Next Implementation Slice

The next release slice should create the conservative `pilot-cron-report`
automation entry for `company-os-plane-ui-worker-cadence`, run at least two
scheduled reports, then hand the evidence to the independent reviewer loop
before expanding to worker dispatch.
