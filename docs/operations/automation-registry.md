# Automation Registry

Status: generic template with current local pilot examples

## Purpose

The Automation Registry lists recurring Company.OS jobs, their source-of-truth
docs, reports, permissions and stop rules.

Every company using Company.OS should keep one registry. It prevents hidden
automation drift and makes the morning brief explainable.

## Registry Fields

| Field | Meaning |
|---|---|
| `id` | Stable automation id in the local or cloud scheduler. |
| `name` | Human-readable name. |
| `kind` | `cron`, `heartbeat`, `webhook`, `manual`, or `cloud-workflow`. |
| `schedule` | Local wall-clock schedule or trigger. |
| `workspace` | Repo or runtime path. |
| `source_of_truth` | Docs/issues/templates the automation must read. |
| `outputs` | Reports, comments, metrics or artifacts created. |
| `autonomy` | L0-L5 permission level. |
| `runtime_auth` | Required CLI/connector auth sentinels before the run window. |
| `human_gate` | Conditions that require a person. |
| `owner` | Department or controller owner. |
| `status` | `active`, `paused`, `draft`, `retired`. |

## Permission Model

Recurring automations are invalid if every routine tool call requires a new
human click. The registry must define an always-allow baseline for every active
automation and must keep that separate from true human gates.

For Linear, scheduled Company.OS jobs must use the local headless helper:

```bash
node ${COMPANY_OS_ROOT}/scripts/linear/headless-linear.mjs auth-preflight --json --soft
```

They must not call the Codex Desktop Linear connector, Linear app connector, or
Linear MCP UI path. A UI approval prompt during cron is a runtime setup defect,
not a valid HumanGate.

Always allow for scheduled L1/L2 automations:

- read execution-ledger issues, comments, statuses and due worker contracts
- post lock, heartbeat, outcome and blocker comments
- read local source-of-truth files and workspace reports
- run read-only inspection commands
- run bounded read-only audit workers named in due worker contracts
- write private reports and append run-ledger rows
- call headless API helpers needed by the automation's source-of-truth docs
- retry idempotent read/report steps after transient connector failures

Human-gated:

- production writes, schema/RLS/auth/service-role changes
- public publishing, outreach, customer-visible claims or medical/legal/Rx copy
- money movement, new paid API setup or spend beyond approved subscriptions
- direct `Done` transitions, autonomy increases, final merge/release
- edit-capable external workers

Local scheduler and runtime permissions must be configured to always allow the
baseline actions for active automations. A repeated approval prompt for those
actions is a runtime setup defect and should be fixed before relying on the
automation. If a helper cannot authenticate headlessly, the automation writes a
runtime-auth blocker and continues in local report-only mode instead of asking
for a UI approval.

Required CLI and connector authentication must also be checked before the active
run window. For Claude-backed automations, use
`docs/operations/runtime-auth-preflight.md` and require the Claude sentinel to
return `CLAUDE_AUTH_OK` before dispatching a Claude worker.

## Artifact Truth Gate

Recurring jobs must not claim generated, passed, fixed or scheduled status from
free-form report prose alone. For marketing/editorial/product lanes, run:

```bash
node ${COMPANY_OS_ROOT}/scripts/artifact-truth/verify-artifact-truth.mjs
```

with the target workspace, pipeline, date and stages named in
`docs/operations/artifact-truth-verifier.md`. A blocked verifier result blocks
the lane and must be surfaced in the morning brief. The verifier is read-only
and does not replace quality, eval, HumanGate or remote duplicate checks.

## Runtime Lane Locks

Every active local cron lane must acquire a local lock before it starts mutable
or long-running work. The lock contract is:

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/lane-lock.mjs acquire \
  --lane company-controller \
  --run-id RUN_ID \
  --issue-id [WORK_ITEM_ID] \
  --workspace-path "${COMPANY_OS_ROOT}" \
  --ttl-seconds 7200 \
  --json
```

Release on normal completion:

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/lane-lock.mjs release \
  --lane company-controller \
  --run-id RUN_ID \
  --workspace-path "${COMPANY_OS_ROOT}" \
  --json
```

If acquisition returns blocked or exits with status 2, the automation must write
a typed local blocker and stop that lane. It must not start a second worker in
the same lane. Stale locks may be replaced only after the configured TTL. Lock
events append to `metrics/agent-events.jsonl` as `runtime.lock_acquired`,
`runtime.lock_blocked` and `runtime.lock_released`.

## Warm Preflight Gate

Before active night-shift lanes consume worker slots, run:

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/warm-preflight.mjs \
  --company-root "${COMPANY_OS_ROOT}" \
  --[SOURCE_WORKSPACE]-root "${SITE_PROJECT_ROOT}" \
  --date latest \
  --soft
```

This replaces scattered auth-only checks as the standard readiness gate. It
verifies Claude shell auth, durable Claude Keychain auth, Linear headless auth,
GitNexus freshness, Upload-Post live freeze, lane locks and warm-stage Artifact
Truth. It must not require final/image/eval artifacts before those downstream
lanes have run. A blocked result must be shown in the morning brief runtime
banner. Scheduled jobs must not ask for UI approval when this gate blocks; they
write the local report and continue only in explicitly safe local report-only
lanes.

Initial lane names:

| Lane | Intended automation scope |
|---|---|
| `runtime-preflight` | Runtime auth and headless helper checks. |
| `company-controller` | Company.OS night-shift controller. |
| `morning-brief` | Morning CEO brief. |
| `claude-worker` | Claude-backed audit/eval workers. |
| `codex-image` | Codex image generation child runs. |
| `marketing-daily` | Daily editorial generation. |
| `marketing-product` | Product/Knowledge generation. |
| `marketing-distribution` | Distribution planner dry-run artifacts. |
| `upload-post-live` | Upload-Post live or remote cleanup attempts. |
| `performance-analytics` | Upload-Post/performance read/report lane. |

Every automation row should be interpreted as:

```text
AlwaysAllow: routine reads, status comments, private reports, ledger appends,
read-only inspections and bounded read-only workers inside the approved scope.
HumanGate: only the explicit external-impact boundaries listed for that job.
```

## Core Automations

| ID | Name | Schedule | Purpose | Autonomy | Status |
|---|---|---:|---|---|---|
| `night-controller` | Night Shift Controller | 22:10-05:10 hourly | Scans due work, runs at most one safe worker, writes reports. | L2 | recommended |
| `runtime-auth-preflight` | Runtime Auth Preflight | before/through active windows | Verifies required CLIs/headless helpers are authenticated before worker slots are consumed. | L1/L2 | required |
| `git-worktree-hygiene` | Git Worktree Hygiene | before night-controller | Reports dirty roots, dirty sandboxes, branch drift and worktree count before unattended work. | L1 | required |
| `morning-ceo-brief` | Morning CEO Brief | 06:30 | Summarizes night work and decisions for the CEO. | L1 | recommended |
| `cmo-morning-brief` | CMO Morning Brief | before CEO brief | Appends the Marketing Department report to the Command Center Morning Briefing singleton. | L1 | recommended |
| `department-daily` | Department Dispatch Briefs | morning blocks | Product, engineering, marketing or ops daily decisions. | L1 | optional |
| `backlog-archaeology` | Forgotten Work Sweep | 05:10 or weekly | Finds unfinished work, stale assumptions and ideas. | L2 report | recommended |
| `weekly-autonomy-review` | Weekly Autonomy Review | weekly | Reviews agent performance, autonomy and SOP changes. | L2 review | recommended |
| `release-gate` | GitHub Release Gate | PR/tag trigger | Runs secret/license/private-data/release readiness checks. | L1/L2 | recommended |
| `marketing-editorial` | Editorial Desk | overnight/morning | Drafts content packages and research. | L2 draft | optional |
| `marketing-quality-gate` | Editorial Quality Gate | after editorial | Scores drafts and flags compliance/voice issues. | L2 review | optional |
| `marketing-case-file` | Case File Deck | daily | Builds one evidence-backed, saveable social carousel for X and LinkedIn. | L2 draft / HG-2.5 schedule | optional |
| `marketing-editorial-image-post` | Editorial Image Post | daily | Builds source-backed X/LinkedIn article-style posts with one useful image. | L2 draft / HG-2.5 schedule | optional |
| `marketing-blog-article` | Blog Article Controller | daily | Audits Blog Engine article state and gates publish/index decisions. | L1/L2 report / HG-2.5 publish gate | optional |
| `marketing-distribution` | Distribution Planner | after eval | Builds schedule and channel plan; no auto-publishing. | L1 plan | optional |
| `performance-analytics` | Performance Analytics | morning | Pulls performance data and feeds next decisions. | L1 report | optional |
| `independent-reviewer` | Independent Reviewer Observability Loop | after completed runtime pilots or weekly | Reads Plane/report/event evidence and proposes contract, gate, eval and prompt improvements without control-plane authority. | L2 review | pilot |

## Current Local Pilot Mapping

The ARES/Fyn local pilot currently maps to the generic registry like this:

| Generic ID | Local Automation ID | Notes |
|---|---|---|
| `night-controller` | `company-os-night-shift-controller` | Local Mac cron, Company.OS cwd, reads Night Shift runbooks. |
| `runtime-auth-preflight` | `company-os-runtime-auth-preflight` | Local Mac cron, Company.OS cwd, verifies Claude auth sentinel before/through active windows. |
| `git-worktree-hygiene` | `company-os-git-worktree-hygiene` | Local Mac cron, read-only Git/worktree hygiene report before night work. |
| `morning-ceo-brief` | `company-os-morning-ceo-brief` | Local Mac cron, writes morning CEO brief. |
| `cmo-morning-brief` | `company-os-cmo-morning-brief` | Target Plane-first sink: Command Center `Morning Briefing - Current`; append dated comment, never create daily items. |
| `marketing-editorial` | `ares-daily-editorial-desk` | ARES-specific implementation of generic editorial desk. |
| `marketing-quality-gate` | `ares-editorial-quality-gate` | ARES-specific editorial gate. |
| `marketing-quality-gate` | `ares-editorial-eval-gate` | Claude eval gate before scheduling. |
| `marketing-daily-planner` | `atlas-marketing-daily-planner-cmo-worker` | Plane `role:cmo` department-pack worker; converts founder intent, analytics and source intake into lane assignments. |
| `marketing-evidence-scout` | `atlas-marketing-evidence-scout-cmo-worker` | Plane `role:cmo` department-pack worker; creates source-backed topic cards with evidence class, hard facts and caveats. |
| `marketing-case-file` | `atlas-case-file-cmo-worker` | Plane `role:cmo` child contract; uses the ARES Website Case File renderer, image gate, eval and Upload-Post dry-run. |
| `marketing-editorial-image-post` | `atlas-editorial-image-post-cmo-worker` | Plane `role:cmo` child contract; uses Daily Editorial, image generation, eval and Upload-Post dry-run. |
| `marketing-blog-article` | `atlas-blog-article-cmo-worker` | Plane `role:cmo` child contract; runs Blog Engine morning-after audit and reports publish/index blockers. |
| `marketing-distribution-manager` | `atlas-marketing-distribution-manager-cmo-worker` | Plane `role:cmo` department-pack worker; verifies Upload-Post payloads, media attachment, cadence fit and cancel path. |
| `marketing-performance-analyst` | `atlas-marketing-performance-analyst-cmo-worker` | Plane `role:cmo` department-pack worker; turns X/LinkedIn/blog response into next Planner inputs. |
| `marketing-reaction-radar` | `atlas-marketing-reaction-radar-cmo-worker` | Plane `role:cmo` department-pack worker; converts noisy reaction watchers into scored digest and draft-only replies. |
| `marketing-visual-director` | `atlas-marketing-visual-director-cmo-worker` | Plane `role:cmo` department-pack worker; checks generated images, overlays, slide readability and visual reject reasons. |
| `marketing-claim-safety` | `atlas-marketing-claim-safety-cmo-worker` | Plane `role:cmo` department-pack worker; reviews evidence class, caveats and public framing before schedule decisions. |
| `marketing-ops-bridge` | `atlas-marketing-ops-bridge-coo-worker` | Plane `role:coo` department-pack worker; maps cron/tool lanes into hardened Plane-reportable operations. |
| `marketing-distribution` | `ares-distribution-planner` | Distribution plan, not direct publishing. |
| `marketing-distribution` | `ares-upload-post-scheduler` | Schedules only after approval/eval gates. |
| `performance-analytics` | `ares-daily-performance-analytics` | Morning performance pull before CEO brief. |
| `plane-ui-worker` | `company-os-plane-ui-worker-cadence` | Browser-backed Company.OS lane. Uses `scripts/runtime/plane-ui-worker-cadence-runner.mjs`; starts at `pilot-cron-report`, not continuous queue dispatch. |
| `raindrop-observability` | `company-os-raindrop-llm-call-observability` | Target lane for Raindrop Workshop call-level observability across Company.OS-owned LLM calls. Worker contract only until adapter exists. |
| `independent-reviewer` | `company-os-independent-reviewer-observability` | Paused. Downstream consumer of Raindrop/report evidence, not a substitute for call-level LLM observability. |

## Current v0.6.x Pilot Additions

### company-os-plane-ui-worker-cadence

Status: active Codex cron pilot.

Codex automation id: `company-os-plane-ui-worker-cadence-pilot`.

Schedule: `FREQ=HOURLY;INTERVAL=4`.

Source of truth:

- `docs/operations/plane-ui-worker-autonomy-lane.md`
- `docs/operations/plane-ui-worker-recurring-cadence.md`
- `docs/operations/hard-cron-wrapper.md`
- `scripts/runtime/plane-ui-worker-cadence-runner.mjs`

Allowed autonomy: `pilot-cron-report`. The child command is bounded to a
cadence heartbeat until a separate HG-2.5 release expands the lane.

Blocked without separate release:

- continuous queue scan
- broad worker dispatch
- browser storage reads
- Plane Done transitions
- deploy, merge, push, publish or production writes

### company-os-raindrop-llm-call-observability

Status: worker-contract stage.

Source of truth:

- `docs/operations/raindrop-llm-call-observability.md`
- `docs/strategy/raindrop-workshop-observability-sidecar.md`
- `docs/operations/agent-event-ledger.md`

Allowed autonomy: none until the adapter exists. First worker may write local
safe summary artifacts and tests only.

Blocked without separate release:

- hosted/cloud Raindrop ingestion
- raw prompt/tool payload capture
- browser storage reads
- production/customer/private/regulated traces
- Plane Done by worker
- dispatch/queue authority

### company-os-independent-reviewer-observability

Status: paused. This automation was created from a misunderstanding. The
intended near-term system is Raindrop LLM call instrumentation, not a weekly
generic reviewer.

Codex automation id: `company-os-independent-reviewer-observability-pilot`.

Schedule: `FREQ=WEEKLY;BYDAY=FR;BYHOUR=17;BYMINUTE=30`.

Source of truth:

- `docs/operations/independent-reviewer-observability-loop.md`
- `docs/strategy/raindrop-workshop-observability-sidecar.md`
- `docs/operations/agent-event-ledger.md`

Allowed autonomy: read-only review, private reports and future Worker Contract
proposals. The run must write `BLOCKED_INSUFFICIENT_EVIDENCE` and stop when
fewer than two completed cadence reports exist.

Blocked without separate release:

- dispatch
- Plane state transitions
- memory writes
- cloud Raindrop ingestion
- raw prompt, tool payload, browser storage, private customer or regulated data

## Generic Night Controller Prompt Shape

```text
Run one Company.OS controller pass for the current local date/time.

Read:
- docs/operations/autonomous-ops-loop.md
- docs/operations/automation-registry.md
- docs/operations/runtime-auth-preflight.md
- docs/operations/night-shift-backlog-archaeology.md
- docs/templates/worker-issue-contract.md
- the parent execution issue
- due worker issues

Rules:
- one active worker at a time
- default read-only audit/report
- required runtime auth must be verified before consuming a due worker slot
- pre-approved routine reads/comments/reports/ledger writes run without per-run
  human approval
- Linear access uses the Company.OS headless helper, never the UI connector
- no production writes
- no public publishing or outreach
- no money movement
- no direct Done transition
- no memory writes by workers
- stop on unclear source-of-truth

Output:
- controller report
- ledger row
- execution-ledger comment
- next safe worker recommendation
```

## Generic Morning Brief Prompt Shape

```text
Create the morning CEO brief for the current local date.

Read:
- night reports
- automation registry
- execution ledger parent issue
- metrics ledger
- department outputs
- backlog archaeology reports

Include:
- what ran
- what completed
- what failed
- what the CEO would reject and why
- decisions needed today
- department status
- forgotten work
- outdated assumptions
- idea radar
- next three dispatches

Do not:
- publish
- move files
- mark issues done
- create broad duplicate idea issues
- schedule calendar events unless a human review block is clearly required
```

## CMO Morning Brief Sink

The Marketing Department must not create a fresh Plane item for every daily
brief. It reports into one persistent Command Center sink:

```text
Project: CMD / Command Center
Module/Page/Item: Morning Briefing
Singleton: Morning Briefing - Current
Comment prefix: morning.brief
Source of truth: docs/operations/cmo-morning-briefing.md
Runner: scripts/marketing/cmo-morning-briefing.mjs
```

The CMO morning brief is appended as the current day's comment. Concrete
follow-up work leaves the brief only as a normal role-labeled Worker Contract.

## Stop Rules

Stop and report `NEEDS-HUMAN` when an automation touches:

- production data
- schema/RLS/auth/service-role changes
- public publishing or outreach
- money movement or pricing
- medical/legal/regulated claims
- customer data export
- autonomy level changes
- direct `Done` transitions
- unclear source-of-truth
- missing worker contract

## GitHub Release Checklist

Before this registry is published or shipped to a client:

- remove private local paths or move them into examples
- replace company-specific automation IDs with placeholders
- scan for secrets and customer data
- mark which automations are examples versus active local jobs
- document scheduler setup separately for local Mac, cloud cron and CI
