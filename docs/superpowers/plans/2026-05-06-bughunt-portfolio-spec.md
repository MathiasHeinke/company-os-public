# Claude Code Bughunt Portfolio Scope Spec

> **For orchestrators:** this is a dispatch gate, not a launch approval. The
> first 12-hour Claude Code bughunt portfolio remains blocked until the
> prerequisites below are proven.

## Goal

Use Claude Code Opus 4.7 Max as a bounded audit worker to find bugs, regressions,
security risks, UI/product issues, incomplete work, and high-value follow-ups
across active Company.OS/ARES workspaces without granting unattended edit,
publish, spend, or production authority.

The portfolio is a sequence of bounded read-only worker runs controlled by
Codex or a central scheduler. Claude workers do not self-poll Linear.

## Launch Status

Status: `BLOCKED`

Reason: the bughunt spec and live Linear heartbeat/kill-path pilot now exist,
but the first launch still requires explicit Mathias or Codex approval of the
parent launch issue.

Current gate status:

- PASS: `docs/governance/directives.md` exists.
- PASS: one filled Controller proof-loop report exists.
- PASS: one agent-run ledger row exists.
- PASS: worker issue contract template exists.
- PASS: Linear live-pilot gates were proven by a heartbeat/kill-path run.
- BLOCKED: Mathias or Codex has not approved the parent launch issue.

## Target Workspace Registry

Do not hardcode local paths in worker prompts. Resolve these keys through the
private workspace registry at dispatch time.

| Registry Key | First-Run Priority | Scope |
|---|---:|---|
| `company-os` | P0 | Company.OS operating system, kit, directives, controller, reports. |
| `[SOURCE_WORKSPACE]` | P1 | Marketing site, SEO, UX, performance, legal pages, funnel. |
| `[SOURCE_WORKSPACE]` | P1 | Product app, core UX, data flows, security, tests. |
| `client-dashboard` | P1 | Dashboard, analytics, operator workflows, reporting. |
| `client-desktop` | P1 | Desktop app, native shell, local runtime, packaging. |
| `the-intention` | P2 | Product/content system if active in current sprint. |
| `[SOURCE_WORKSPACE]` | P2 | CEO/business/private control layer; audit only with personal-memory hygiene. |
| `Antigravity` | P2 | Legacy kit/source template; audit only for migration/provenance. |

Excluded until explicitly reactivated:

- `TheSwarm`
- `autarch`
- `Strategos`
- `clone-wars`
- old standalone Hermes/Bridge/Honcho repos when their source of truth already
  lives in an active workspace

## First-Run Mode

The first bughunt portfolio is `audit` only.

Allowed:

- read files in the target workspace
- run read-only inspection commands
- run local test/build/typecheck commands when they do not mutate state beyond
  normal ignored caches
- produce markdown audit reports
- recommend Linear follow-ups
- recommend hotfixes

Forbidden:

- edit files
- commit, branch, push, merge, tag, or publish
- update Linear directly
- write memory/Honcho directly
- create or modify production data
- run database migrations or RLS/auth/service-role changes
- send email, DMs, comments, campaigns, or public content
- register APIs, create subscriptions, move money, or incur external spend
- mark Linear issues `Done`

## Writable Boundary

First-run Claude workers get no repository write permission.

The orchestrator may capture stdout/stderr and write reports under ignored or
private report paths such as:

```text
reports/private/agent-runs/
```

If a worker needs an artifact path later, create a new worker issue with explicit
writable paths and human approval. Do not reuse the read-only bughunt issue for
edit work.

## Portfolio Runtime Limits

Portfolio wall-clock window: maximum `12h`.

First launch limits:

| Limit | Value |
|---|---:|
| concurrent workers | 1 |
| max workers per launch | 4 |
| max runtime per worker | 60 minutes |
| max commits per worker | 0 |
| max external spend | EUR 0 beyond existing subscriptions |
| max direct Linear writes by workers | 0 |
| max memory writes by workers | 0 |

Concurrency can increase only after controller review and ledger evidence prove
the first run behaved correctly.

## Heartbeat, Lock, And Kill Switch

The scheduler or Codex owns heartbeat and cancellation. Claude workers do not
self-poll Linear.

Required control behavior:

- Parent issue receives a `heartbeat` comment at least every 15 minutes while
  the portfolio is active.
- Each worker issue receives `ai-running` lock metadata before dispatch.
- Lock TTL is 30 minutes.
- Dead-man timeout is 2 missed heartbeats.
- Claude Opus 4.7 Max / 1M audits are long-running. Do not classify a worker
  as stuck, retry, or start a duplicate before at least 300 seconds have
  elapsed. In real deep-audit portfolio runs, 600+ seconds before useful output
  is normal; use heartbeat/status updates rather than early cancellation.
- If timeout fires, set outcome to `ai-blocked` or `needs-human` and stop
  dispatching new workers.
- Kill phrase is `#stop` on the parent Linear issue.
- If `#stop` appears, stop after the current shell process exits or terminate it
  if it exceeds the current worker timeout.

Minimum heartbeat payload:

```markdown
Status:
Active Worker:
Workspace:
Elapsed:
Last Command:
Current Report Path:
Next Check:
Stop Phrase:
```

## Linear Parent Issue Contract

The parent portfolio issue must include:

```markdown
Agent: claude
Mode: audit
Workspace: registry:multi
Dispatch: manual
RunAt:
DependsOn:
SourceOfTruth:
Scope:
Acceptance Criteria:
Gates:
HumanGate:
Reporting:
MaxRuntime:
MaxCommits:
MaxSpend:
KillSwitch:
Heartbeat:
```

`RunAt` stays empty until Mathias explicitly approves scheduling.

## Worker Issue Contract

Each child worker issue must include:

```markdown
Agent: claude
Mode: audit
Workspace: registry:<key>
Dispatch: manual
RunAt:
DependsOn:
SourceOfTruth:
Scope:
Acceptance Criteria:
Gates:
HumanGate:
Reporting:
MaxRuntime: 60m; first stuck/retry check no earlier than 300s; expect 600s+ for Opus 4.7 Max / 1M deep audits
MaxCommits: 0
MaxSpend: EUR 0
KillSwitch: parent issue #stop
Heartbeat: 15m scheduler heartbeat
```

## Worker Prompt Shape

Use this shape for the first read-only run:

```bash
claude -p "<task>" \
  --model 'claude-opus-4-7[1m]' \
  --permission-mode plan \
  --output-format text \
  --max-turns 30
```

Prompt requirements:

- name the source files and target workspace
- state `read-only`
- state `do not edit files`
- state `do not update Linear or memory`
- request concrete findings with file/path references
- request severity, impact, recommended owner, and gate needed
- request a final `human_decision_needed` section

## Report Format

Each worker report must include:

```markdown
# Claude Bughunt Report

Worker Issue:
Workspace:
Agent:
Mode:
Started:
Finished:
Runtime:
Source Of Truth:
Commands:
Report Path:
Cost:
Status:

## Executive Verdict

## Findings

| Severity | Area | Finding | Evidence | Recommendation | Gate |
|---|---|---|---|---|---|

## Hotfix Candidates

## Follow-Up Linear Issues Proposed

## Human Decisions Needed

## Worker Self-Review

mathias_let_this_pass:
customer_ship:
confidence:
```

## Severity Definitions

| Severity | Meaning | Required Action |
|---|---|---|
| CRITICAL | Production/user/security/legal/spend risk with high blast radius. | Stop and require human/Codex gate. |
| HIGH | Likely bug, regression, security issue, or launch blocker. | Create or update Linear issue. |
| MEDIUM | Important quality, maintainability, UX, or process gap. | Queue follow-up with owner/gate. |
| LOW | Cleanup, polish, documentation, or minor risk. | Batch into later issue or ignore. |

## Non-Goals

The first portfolio does not:

- fix code
- write PRs
- publish reports publicly
- send outreach
- generate marketing at scale
- touch production data
- alter schemas/RLS/auth
- register APIs or create paid accounts
- update memory automatically
- change worker autonomy levels

## Launch Checklist

- [x] Directives exist and are linked from the launch issue.
- [x] Controller proof-loop report exists.
- [x] Agent-run ledger has one bootstrap row.
- [x] Worker issue contract template exists.
- [ ] Parent Linear issue includes all required fields.
- [ ] Each worker issue includes all required fields.
- [ ] Target workspace registry resolves every target key.
- [x] Heartbeat path is tested.
- [x] Stop path is manually simulated.
- [ ] Reports go to private/ignored paths unless explicitly approved.
- [ ] Mathias or Codex approves the launch.

## Exit Criteria

The portfolio is successful only if:

- all dispatched workers complete or stop cleanly
- every report has source paths and severity
- every HIGH/CRITICAL finding maps to a proposed Linear follow-up
- no worker edited files
- no worker wrote Linear/memory directly
- no spend beyond approved subscriptions occurred
- controller review identifies at least one calibration learning
- next action is either a bounded hotfix portfolio, a human review block, or a
  blocked/no-go decision
