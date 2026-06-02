# Hard Cron Wrapper

Status: executable hardening gate

## Purpose

Prompt instructions are not a hard automation boundary. The hard cron wrapper is
the executable wrapper for scheduled jobs that must fail closed before running a
child command.

It enforces:

- target lane lock
- Plane App bot-token rotation for Plane/controller lanes
- warm preflight
- lane-scoped Artifact Truth freshness through warm preflight
- lane-scoped Browser Auth proof freshness through warm preflight
- local same-day dedupe key
- model budget brake when worker models are declared
- child process exit-code/timeout gate
- redacted stdout/stderr capture
- event-ledger start/completed/failed/blocked rows

## Command

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/hard-cron-wrapper.mjs \
  --company-root "${COMPANY_OS_ROOT}" \
  --workspace-path "${COMPANY_OS_ROOT}" \
  --lane company-controller \
  --run-id company-os-night-shift-controller-YYYYMMDD-HHMM \
  --issue [WORK_ITEM_ID] \
  --dedupe-key company-os-night-shift-controller \
  --cost-models grok,deepseek \
  --max-run-usd 1 \
  --daily-budget-usd 5 \
  --monthly-budget-usd 50 \
  --plane-token-rotation required \
  --plane-token-refresh-window 2h \
  --timeout-ms 1800000 \
  -- node scripts/model-router/codex-cost-router.mjs --mode issue-triage --models grok --prompt "Public bounded task"
```

For non-model local checks, pass `--skip-budget`.

## Stop Semantics

The wrapper does not ask for approval. It stops and writes a local report when:

- the same `dedupe-key` already completed today
- the target lane lock is held by another active run
- Plane App bot token rotation fails on a Plane/controller lane
- warm preflight blocks
- budget reserve would exceed max-run/day/month policy
- the child process exits non-zero or times out

`--skip-preflight`, `--skip-budget` and `--skip-dedupe` exist for tests and
exceptional local checks. Production cron prompts should not use them unless the
source-of-truth issue explicitly says why.

Plane App token rotation is controlled by:

```text
--plane-token-rotation off|auto|required
--plane-token-refresh-window 2h
```

Default is `auto`. It runs when the lane or command looks like a Plane,
dispatcher or controller lane. Use `required` for any production lane that reads
or writes Plane through the app token. The wrapper calls
`scripts/plane/plane-app-token-rotation.mjs --mode ensure`, never prints the
token, and blocks as `plane_app_token_rotation_blocked` if the refresh cannot
be proven before the child command starts.

## Lane-Scoped Artifact Truth

The wrapper passes `--lane` into warm preflight. Artifact Truth is required for
the standalone `runtime-preflight` lane and ARES marketing/editorial/product/
upload-post lanes. Pure Company.OS / Plane / controller lanes skip ARES
marketing Artifact Truth by default, so a stale editorial or product manifest
does not block unrelated scheduler/controller work. Force the old behavior with
the warm-preflight option `--artifact-truth-required` when a source-of-truth
issue deliberately couples a lane to ARES artifact freshness.

## Plane UI Worker Lane

Use `plane-ui-worker` for scheduled browser-/Plane-UI-bound worker launches.
This lane is separate from `company-controller` and normal Claude worker lanes
because it needs a fresh redacted Browser Auth proof before any child command
starts.

```bash
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

Warm preflight auto-requires Browser Auth proof freshness for this lane. A
missing, expired, kind-mismatched or secret-like
`~/.company-os/browser-auth-proof.json` blocks as `warm_preflight_blocked`
before the dispatcher or worker process starts. The lane does not create or
refresh the proof; the managed Chrome profile and Plane UI probe remain the
upstream proof source.

Before enabling recurring unattended UI-bound work, run the managed Chrome
profile launcher in `plan` or `launch` mode and keep its launch manifest. Launch
mode refuses to open Chrome when the configured local CDP port already responds,
so the lane does not accidentally bind to a foreign browser process. Use
`--mode cleanup-plan` to produce the explicit non-executing lifecycle handoff
for the managed profile; actual process signaling remains a later gated slice.

Recurring `plane-ui-worker` cadence must follow
`docs/operations/plane-ui-worker-recurring-cadence.md`: regenerate a redacted
Plane UI proof immediately before the hard-cron wrapper, keep proof retention
short, and treat cleanup as a separate release action. [WORK_ITEM_ID] proves one
bounded proof-backed smoke; it does not enable recurring cadence by itself.
Use `scripts/runtime/plane-ui-worker-cadence-runner.mjs` for recurring lane
tests so proof refresh and hard-cron execution stay one fail-closed command.

## Reports

Default reports are written to:

```text
reports/runtime-auth/YYYY-MM-DD/HHMM-<lane>-hard-cron.md
reports/runtime-auth/YYYY-MM-DD/HHMM-<lane>-hard-cron.json
```

Events are appended to:

```text
metrics/agent-events.jsonl
```

The wrapper emits namespaced runtime events:

- `runtime.cron_started`
- `runtime.cron_completed`
- `runtime.cron_failed`
- `runtime.cron_blocked`

These are local extensions and keep the canonical `runtime.lock_*` events for
lane lock state.
