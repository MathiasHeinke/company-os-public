# Local Mac Night Shift

## Purpose

Run a local-Mac Company.OS night shift while the founder is offline. The Mac is
assumed to stay awake and connected to power.

This is the bridge toward a future cloud scheduler. For now, Codex cron
automations run locally and use Linear as the execution ledger.

## Launch Issue

Plane parent issue: `[PLANE_PARENT_ITEM_ID]`

Related control-plane issue: `[PLANE_CONTROL_PLANE_ITEM_ID]`

## Active Automation IDs

Company.OS:

- `company-os-runtime-auth-preflight`
- `company-os-night-shift-controller`
- `company-os-morning-ceo-brief`

Marketing:

- `[client]-daily-editorial-desk`
- `[client]-editorial-quality-gate`
- `[client]-editorial-eval-gate`
- `[client]-distribution-planner`
- `[client]-upload-post-scheduler`
- `[client]-product-knowledge-daily-desk`
- `[client]-daily-performance-analytics`

## Operating Principle

```text
Linear = queue and execution ledger
Codex cron = scheduler/controller runtime
Codex Cost Router = bounded Grok, DeepSeek, Claude and Gemini worker dispatch
Heartbeat = live run visibility and stop path
Controller = work-quality decision
C-level role = domain ownership and acceptance bar
Calendar = the founder attention layer
```

## Pre-Approved Automation Contract

The night shift exists so the founder does not have to approve every routine run.
Once the automation schedule, source-of-truth docs, parent issue and worker
contracts are approved, each scheduled pass is pre-authorized to execute inside
the documented L2 audit/report scope.

Allowed without extra per-run approval:

- read Linear issues, comments, statuses and due worker contracts
- post Linear lock, heartbeat and outcome comments
- read local source-of-truth docs, reports, ledgers and workspace files
- run read-only local inspection commands
- verify required runtime authentication before consuming a due worker slot
- launch at most one bounded read-only worker group through the Codex Cost
  Router when the due issue contract permits it
- write private/raw worker reports
- write controller reports
- append AI cost-ledger rows
- append Company.OS run-ledger rows
- recommend follow-up issues or human decisions

Gate ownership:

- HG-1/HG-2 are CEO gates. The local CEO delegate is Codex running the
  configured high-reasoning controller model (`GPT-5.5 xhigh` or successor).
  It may release HG-1/HG-2 only when gates pass, confidence is high enough and
  blocked actions remain blocked.
- HG-3 is the CEO/Codex critical authority gate for high-risk but reversible or
  restorable actions. The Founder is required only when the action crosses the
  HG-4 strategic or non-restorable boundary.

Still requires Founder `NEEDS-HUMAN` / HG-4:

- non-restorable production deletion or mutation without verified backup/restore
- strategic public publishing, founder-voice commitments or outreach outside
  pre-approved lanes
- company identity, mission, capital allocation or trust-boundary decisions
- material legal/Rx/financial public commitments or regulated claims that cannot
  be reduced to evidence-backed bounded copy
- spend or liability beyond approved budgets and subscriptions
- autonomy level increases that materially change the operating model
- unclear source-of-truth, missing worker contract, active lock conflict,
  unauthenticated required tool or unstable runtime

CEO/Codex may release HG-1/HG-2 examples without waking the founder:

- retrying a failed read/report lane after runtime auth is green
- dispatching a bounded L2 read-only audit worker from a valid due contract
- accepting dry-run-ready marketing artifacts into a pre-approved review queue
- preparing an L3 sandbox packet without merge, push, deploy or live write
- posting outcome/blocker comments to Linear through the headless helper

Local runtime setup must use "always allow" permissions for the pre-approved
read/report operations above. If the UI asks for approval during a scheduled
pass, treat that as a control-plane configuration blocker to fix, not as a
required CEO decision about the work itself.

Claude Code, OpenRouter and Gemini CLI must be authenticated before every
night-shift window that may dispatch those workers. Use
`${COMPANY_OS_ROOT}/docs/operations/runtime-auth-preflight.md`
as the sentinel source. A failed worker-runtime sanity check is a runtime-auth
defect and must be fixed before the controller consumes a due worker lane.

Claude Opus 4.7 Max / 1M audit mode needs generous wall-clock runtime. Do not
declare an in-scope Claude audit/plan worker stuck, retry it, or start a
duplicate before at least 300 seconds have elapsed. Most real deep-audit runs
should be expected to take 600+ seconds before useful output appears. Default
worker budget is 900 seconds for normal audits and 1800 seconds for
deep/cross-repo audits, with heartbeat/status updates every 60-120 seconds.
The auth sentinel remains the exception: it is a one-turn `CLAUDE_AUTH_OK`
preflight and should fail fast before consuming the worker slot.

## Night Schedule

All times are Europe/Berlin.

| Time | Lane | Purpose | Autonomy |
|---|---|---|---|
| :55 | Warm Runtime Preflight | Verify Claude shell + Keychain auth, Linear headless auth, GitNexus, lane locks, Upload-Post live freeze and warm-stage Artifact Truth before active worker windows consume due slots. | L1/L2 verify |
| 22:10 | Night Shift Controller | Scan Linear, active reports, due work, and run at most one bounded worker group. | L2 audit/report |
| 23:10 | Night Shift Controller | Review previous pass, retry only if safe, otherwise queue follow-up. | L2 audit/report |
| 00:10 | Night Shift Controller | Deep audit lane: codebase, security, frontend, backend, Downloads triage, GitNexus gaps. | L2 audit/report |
| 01:10 | Night Shift Controller | Controller pass: check outcomes, score work, create follow-ups. | L2 review |
| 02:10 | Night Shift Controller | Operational lane: Hermes/Gateway/App stuck points and tool/MCP gaps. | L2 audit/report |
| 03:10 | Night Shift Controller | Marketing/product support lane: check overnight pipeline outputs. | L2 audit/report |
| 04:10 | Night Shift Controller | QA/eval lane: summarize test gaps, broken workflows, regression risks. | L2 audit/report |
| 05:10 | Night Shift Controller | Consolidation lane: prepare morning handoff and review needs. | L2 report |
| 06:30 | Morning CEO Brief | Write CEO brief with outcomes, blockers, decisions, and next dispatch. | L1 report |

## Existing Marketing Automation Schedule

The marketing pipeline is moved from late morning into overnight/morning prep.

| Automation | New Time | Purpose |
|---|---:|---|
| [Client] Daily Editorial Desk | 00:15 | Create daily editorial packages. |
| [Client] Editorial Quality Gate | 01:30 | Finalize/quality-gate editorial assets. |
| [Client] Editorial Eval Gate | 02:15 | Claude eval gate before scheduling. |
| [Client] Distribution Planner | 02:45 | Build 14-day distribution plan. |
| [Client] Upload-Post Scheduler | 03:15 | Schedule only if eval passed; no direct social publishing. |
| [Client] Product/Knowledge Daily Desk | 03:45 | Create product-native content packages and dry-run upload plan. |
| [Client] Daily Performance Analytics | 06:20 | Pull previous-day performance before CEO morning brief. |

## First Night Scope

Allowed:

- inspect Linear issue queue
- inspect active workspace status
- run audit-only Claude Code workers
- run cost-router workers for sanitized Grok, DeepSeek, Claude or Gemini scopes
- run local read-only shell commands
- inspect Downloads and propose file destinations
- inspect GitNexus status and index freshness
- inspect GitNexus relationship gaps for Edge Functions, APIs, and runtime flows
- inspect likely dead-code, spaghetti-code, test-gap, and broken-workflow
  surfaces
- inspect Hermes/Gateway/App logs or docs where available
- inspect the domain product queue in
  `docs/operations/domain-product-night-shift-queue.md`
- map Desktop product gaps against `${CLIENT_APP_ROOT}` as backend/mobile SSOT
- run the backlog archaeology and idea radar sweep in
  `docs/operations/night-shift-backlog-archaeology.md`
- run required runtime auth sentinels from
  `docs/operations/runtime-auth-preflight.md`
- surface forgotten work, stale assumptions and promising ideas for the morning
  CEO brief
- promote validated night insights into parent/child Linear issue proposals
  with C-level owner, controller, decision owner and human gate
- create private/ignored reports
- create/update Linear comments and follow-up issues
- append Company.OS run ledger rows

Forbidden:

- public publishing
- production writes
- database migrations, RLS/auth/service-role changes
- live user-affecting tool changes
- direct Linear `Done` transitions
- autonomous memory writes by workers
- spend beyond existing subscriptions
- more than one active worker group at a time

## Worker Routing Limit

Each night-shift controller pass may start at most one bounded worker group. The
default dispatch path is the Codex Cost Router:

```bash
node ${COMPANY_OS_ROOT}/scripts/model-router/codex-cost-router.mjs \
  --mode diff-review \
  --models grok,deepseek \
  --workspace /target/workspace \
  --issue ISSUE-123 \
  --prompt-file /path/to/sanitized-worker-prompt.md
```

Every non-dry-run router dispatch must append
`metrics/ai-cost-ledger.jsonl`. Workers may write reports only; GPT-5.5/Codex
integrates findings and decides Linear comments, gate outcomes and follow-ups.

Claude direct command shape, when the due issue explicitly requires Claude:

```bash
"${CLAUDE_BIN}" -p "<task>" \
  --model 'opus' \
  --permission-mode plan \
  --output-format text \
  --max-turns 30
```

Gemini direct command shape, when the due issue explicitly requires Gemini and
the runtime sanity check has passed:

```bash
"${GEMINI_BIN}" --skip-trust -p "<task>" \
  -m gemini-3.1-pro-preview \
  --approval-mode plan \
  --output-format text
```

The worker must be read-only unless the founder explicitly approves edit mode.

## Sandbox Edit Lane

When the founder approves edit mode, the worker still does not edit the source
workspace directly. The controller must create or approve an isolated sandbox
branch and worktree before dispatch:

```text
codex/sandbox/<workspace>/<YYYY-MM-DD>-<issue>-<worker>-<role-owner>-<task-slug>-<hhmmss>
${SANDBOX_ROOT}/<workspace>/<YYYY-MM-DD>-<issue>-<worker>-<role-owner>-<task-slug>-<hhmmss>/
```

The worker outcome is `needs-audit`. The controller audits the sandbox branch
before the morning CEO brief recommends any merge, push, deploy or production
action.

## Report Paths

Night shift controller pass:

```text
reports/night-shift/YYYY-MM-DD/HHMM-controller-pass.md
```

Claude worker raw report:

```text
reports/private/night-shift/YYYY-MM-DD/HHMM-claude-audit.md
```

Morning CEO brief:

```text
reports/night-shift/YYYY-MM-DD/morning-ceo-brief.md
```

Downloads triage proposal:

```text
reports/night-shift/YYYY-MM-DD/downloads-triage.md
```

Deep audit queue:

```text
reports/night-shift/YYYY-MM-DD/deep-audit-queue.md
```

[SOURCE_COMPANY] product-domain queue:

```text
reports/night-shift/YYYY-MM-DD/activities-production-readiness-retro.md
reports/night-shift/YYYY-MM-DD/recovery-v2-gap-map.md
reports/night-shift/YYYY-MM-DD/routines-parity-map.md
reports/night-shift/YYYY-MM-DD/nutrition-os-parity-map.md
reports/night-shift/YYYY-MM-DD/substances-architecture-map.md
reports/night-shift/YYYY-MM-DD/ai-insights-deep-scan-gate.md
```

Backlog archaeology and idea radar:

```text
reports/night-shift/YYYY-MM-DD/forgotten-work-sweep.md
reports/night-shift/YYYY-MM-DD/stale-assumption-sweep.md
reports/night-shift/YYYY-MM-DD/idea-radar.md
```

## Controller Bar

Every controller review must include:

- `state`
- `layer`
- `role`
- `controller`
- `decision_owner`
- `founder_let_this_pass`
- `what_founder_would_say`
- `founder_quality_bar`
- `would_fail_because`
- `required_rework`

`probably` is not enough without the concrete critique.

## Stop Rules

Stop and report `NEEDS-HUMAN` if:

- source-of-truth is unclear
- Linear issue contract is missing required fields
- production/public/spend/medical/legal/Rx gate is touched
- worker asks for edit mode without approval
- another worker lock is still active
- required model CLI/API is unavailable, unauthenticated or billing-blocked
- required runtime-auth sentinel fails before dispatch
- report path cannot be written
- Mac/network/tooling is unstable

## Morning Success Criteria

By the morning brief, the system should answer:

- What ran?
- What did it find?
- What was fixed or prepared?
- What is blocked?
- What would the founder reject and why?
- Which decisions need the founder today?
- Which worker issue should run next?
- Which product domain is closest to implementation readiness?
- Which product domain would the founder reject first, and why?
- What has been left unfinished or forgotten?
- Which assumptions/docs are outdated enough to mislead agents?
- Which top ideas should be discussed, parked, killed or scheduled?
