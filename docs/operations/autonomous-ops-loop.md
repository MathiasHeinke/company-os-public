# Autonomous Ops Loop

Status: generic pattern
Use for: private company repo, client implementation, public Company.OS example

## Purpose

The Autonomous Ops Loop turns normal company work into a controlled agentic
operating rhythm. It is designed for any team with products, repos, tasks,
sessions, marketing work, decisions and unfinished ideas.

It is not product-specific. Replace product names and domains with the local
company context.

For CEO-level orchestration, use
`docs/operations/ceo-controller-agentic-protocol.md` as the control-plane
overlay. This loop describes the operating rhythm; the CEO Controller protocol
defines how conversations become C-level ownership, Linear worker contracts and
human-gated dispatch.

For the reusable work-order precedent behind scheduled Linear-driven autonomy,
use `docs/operations/autonomous-work-order-doctrine.md`. That doctrine defines
how founder intent becomes parseable work orders, how 100+ queued tasks should
be throttled, and how Founder Absence Mode keeps the company operating without
crossing HG-3 gates.

## Core Loop

```text
Company intent
-> Source-of-truth docs and memory
-> Execution ledger
-> CEO/controller interpretation
-> C-level owner and decision owner
-> Scheduled controller pass
-> Bounded worker issue
-> Worker report
-> Controller review
-> Morning CEO brief
-> CEO decision
-> Updated ledger, docs, memory and next work
```

## System Layers

| Layer | Generic Purpose | Example Tooling |
|---|---|---|
| Strategy | Direction, principles, priorities, constraints | README, strategy docs, handbook |
| Memory | Durable decisions and cross-session context | Honcho, Memory Bank, wiki, ADRs |
| Execution Ledger | Concrete work, blockers, dependencies, gates | Linear, GitHub Issues, Jira |
| Code Intelligence | Impact, graph, ownership and refactor safety | GitNexus, code search, CI |
| Runtime | Agents that execute bounded work | Codex, Claude Code, Gemini, humans |
| Cost Router | Bounded worker dispatch and cost telemetry | Grok, DeepSeek, Claude, Gemini, `metrics/ai-cost-ledger.jsonl` |
| Controller | Work-quality and output-quality review | Controller charter, review card |
| C-level Ownership | Domain bar for product, engineering, ops, finance, legal and marketing | CTO/CPO/COO/CMO/CFO/Legal role charters |
| Outcomes | What done means and how quality is graded | OutcomeSpec, canonical review harness |
| Events | Machine-readable work state | `metrics/agent-events.jsonl`, ledger comments, webhooks |
| Dreaming | Memory and SOP consolidation | DreamPolicy, memory proposals, controller review |
| Attention | Human review windows and decision meetings | Calendar, morning brief |
| Reports | Evidence from automated runs | Markdown reports, metrics ledger |

Event row and reducer semantics are defined in
`docs/operations/agent-event-ledger.md`. `metrics/agent-runs.jsonl` stays as
the backward-compatible summary ledger; `metrics/agent-events.jsonl` is the
typed state stream that controllers, webhooks and morning briefs should reduce.

## Automation Permission Baseline

An automation is only an automation if it can run its approved routine actions
without another human click. For every active scheduled job, configure the local
or cloud runtime to always allow in-scope read/report/controller operations.

Always allow inside approved L1/L2 scope:

- reading source-of-truth docs, reports, ledgers and local workspace files
- reading execution-ledger issues, comments, statuses and due worker contracts
- writing lock, heartbeat, outcome and blocker comments
- appending approved event rows required by `EventPolicy`
- writing private reports and appending run-ledger rows
- running read-only inspection commands
- launching bounded read-only audit workers named in due worker contracts through
  the configured cost router
- using read-only connectors required by the automation's source-of-truth docs

Keep human approval for:

- production writes, deploys, migrations, schema/RLS/auth/service-role changes
- public publishing, outreach, customer-visible claims and medical/legal/Rx copy
- money movement, new paid API setup, unbudgeted spend or pricing changes
- direct `Done` transitions, autonomy increases, final merge/release
- edit-capable external workers unless the controller has approved the L3
  sandbox branch lane
- durable memory writes; workers may only create memory or knowledge proposals
- unclear source-of-truth

A permission prompt for an always-allow action is a runtime setup defect, not a
CEO decision point.

## Runtime Auth Baseline

Always-allow permissions are not enough if the worker runtime is logged out.
Every active automation must keep required CLIs and connectors authenticated
before the scheduled window starts.

For Claude, OpenRouter or Gemini-backed lanes, the controller must run the
sentinel in `docs/operations/runtime-auth-preflight.md` before dispatching the
due worker. If a required runtime is not authenticated or is billing-blocked,
the controller records a runtime-auth blocker without treating the target audit
as a product attempt.

For Claude Opus 4.7 Max / 1M audits, the sentinel proves only auth, not audit
latency. Once a real audit starts, do not re-check as "stuck", retry, or
duplicate the worker before 300 seconds. In normal deep-audit lanes, expect
600+ seconds before useful output. Controller heartbeats should carry elapsed
time and report path instead of cancelling early.

## Git Hygiene Baseline

Before unattended night work, run the Git Worktree Hygiene Controller:

```text
docs/operations/git-worktree-hygiene-controller.md
scripts/git-hygiene/check-git-hygiene.mjs
```

Dirty roots, stash entries, dirty sandbox worktrees, detached disallowed roots
and unexpected extra worktrees block autonomous dispatch. Ahead/behind state
and clean leftover sandboxes are carried into the morning brief. For
end-of-session checks, `--close-session` promotes ahead/behind, missing
upstreams and unexpected root branches to blockers. The hygiene controller is
read-only and must not reset, clean, delete, push, merge or deploy.

## Cost Routing Baseline

Scheduled controller passes should not launch ad hoc model commands for L2
worker work. They should route through the local cost-router helper so every
run has the same privacy gate, report shape and cost ledger row.

Default policy:

- GPT-5.5 or successor remains the controller and final decision layer.
- Grok and DeepSeek handle redacted first-pass triage, diff review, test ideas
  and spec-drift sidecars.
- Claude handles expensive high-signal audits when the issue contract says the
  result is worth it.
- Gemini handles optional long-context architecture/spec audits only after a
  headless sanity check passes.
- Every non-dry-run worker dispatch appends `metrics/ai-cost-ledger.jsonl`.
- Worker reports are evidence; Linear state changes remain controller-owned.

## Default Daily Rhythm

All times are local company time and should be adapted.

| Time | Automation | Purpose | Autonomy |
|---:|---|---|---|
| 22:10 | Night Controller | Scan due work, run one safe worker, write report. | L2 audit/report |
| 23:10 | Night Controller | Review previous pass and continue or stop. | L2 audit/report |
| 00:10 | Deep Audit Lane | Code, docs, security, product and process audit. | L2 audit/report |
| 01:10 | Controller Lane | Score outputs and create follow-up candidates. | L2 review |
| 02:10 | Operations Lane | Incidents, support, stuck workflows and tool gaps. | L2 audit/report |
| 03:10 | Department Lane | Marketing/product/sales/customer-support prep. | L2 audit/report |
| 04:10 | QA/Eval Lane | Test gaps, regression risk and release gates. | L2 review |
| 05:10 | Backlog Archaeology | Forgotten work, stale assumptions and idea radar. | L2 report |
| 05:40 | Autonomy Shadow Run | Simulate one due L3 contract with no side effects. | L3 shadow |
| 05:50 | Sandbox PR Autopilot Gate | Validate one due L3 sandbox contract and prepare review packet. | L3 packet only |
| 06:20 | Daily Improvement Dream | Consolidate process learnings into reviewable proposals. | L1 proposal |
| 06:30 | Morning CEO Brief | Decision-ready summary before standup. | L1 report |

## Department Queues

Each department can define a queue using the same worker issue contract.

Examples:

- Product Domain Queue: product areas, feature gaps, UX audits, roadmap slices.
- Engineering Queue: bugs, refactors, performance, CI, security and dead code.
- Marketing Queue: research, briefs, drafts, quality gates, distribution plans.
- Sales/Partnership Queue: lead research and outreach drafts, never auto-send.
- Customer Ops Queue: support themes, stuck workflows, FAQ gaps and bugs.
- Company.OS Queue: SOPs, skills, harnesses, charters, release readiness.

## Worker Issue Contract

Every delegated issue should be parseable:

```markdown
# Control Plane
Layer: CEO | Controller | CTO | CPO | CMO | COO | CFO | Legal | Compliance | Worker
Role: short role name
RoleOwner: CEO | CTO | CPO | CMO | COO | CFO | QA-Eval | Controller | Legal-Gate | Founder
Department: Engineering | Product | Growth | Ops | Finance | QA-Eval | Governance
AccountableLayer: CEO | C-Level | Department | Worker | Controller | HumanGate
ReportsTo: CEO | Controller | Founder
AutonomyLevel: L0 | L1 | L2 | L3 | L4 | L5
Controller: codex | human | scheduler | other
DecisionOwner: CEO | CTO | CPO | CMO | COO | CFO | Legal | Compliance | Founder | human
Agent: claude | gemini | codex | human
Mode: audit | plan | implement | verify | research | report | review
Workspace: /absolute/path/or-registry-key
Dispatch: manual | scheduled
RunAt: YYYY-MM-DD HH:mm Local/Timezone
DependsOn: ISSUE-123
Sandbox: none | required
BranchName:
WorktreeRoot:
IntegrationTarget:

# SourceOfTruth
- docs, repos, dashboards, reports

# Scope
- include
- exclude

# Acceptance Criteria
- verifiable outputs

# Gates
- test/build/audit/review commands

# OutcomeSpec
- what done means
OutcomeRubric:
OutcomeMaxIterations:
OutcomeGrader:
OutcomePassThreshold:
OutcomeArtifacts:
ReviewVerdict:
AutonomyRecommendation:

# AlwaysAllow
- routine reads, lock/heartbeat/outcome comments, private reports, ledger
  appends and read-only worker runs inside this issue's approved scope

# CostPolicy
Router: /absolute/path/to/scripts/model-router/codex-cost-router.mjs
AllowedModels: grok | deepseek | claude | gemini
CostLedger: /absolute/path/to/metrics/ai-cost-ledger.jsonl
BudgetGate: stop before unbudgeted spend or non-approved paid APIs

# RuntimeAuth
- required CLI/connector auth sentinels before scheduled dispatch

# EventPolicy
EventSink:
EventTypes:
StateReducer:
WebhookPolicy:

# DreamPolicy
DreamPolicy:
MemoryStore:
MemoryUpdatePolicy:

# SessionPolicy
Coordinator:
SubAgentRoster:
SharedFilesystem:
ContextIsolation:
CapabilityProfile:
RuntimeAdapter:
ManagedAgentCompatibility:

# HumanGate
- stop conditions
HumanGateOwner:

# Reporting
- where to write the report and what to comment back
```

## Autonomy Ladder

| Level | Agent May Do | Agent Must Not Do |
|---|---|---|
| L0 | Read, summarize, ask questions. | Create work or change state. |
| L1 | Write reports, draft plans, suggest issues. | Execute external actions. |
| L2 | Run bounded audits and update ledger comments. | Mark done, publish, spend, write prod. |
| L3 | Implement in deterministic sandbox branch/worktree after approval. | Edit source workspace, merge, push, deploy or skip controller audit. |
| L4 | Run recurring department lanes with controller review. | Change autonomy or policy alone. |
| L5 | Autonomous operations under budgets and kill switch. | Bypass human/legal/security gates. |

## Required Reports

```text
reports/night-shift/YYYY-MM-DD/HHMM-controller-pass.md
reports/night-shift/YYYY-MM-DD/deep-audit-queue.md
reports/night-shift/YYYY-MM-DD/forgotten-work-sweep.md
reports/night-shift/YYYY-MM-DD/stale-assumption-sweep.md
reports/night-shift/YYYY-MM-DD/idea-radar.md
reports/sandbox-pr/YYYY-MM-DD/<issue>-autonomy-shadow-run.md
reports/sandbox-pr/YYYY-MM-DD/<issue>-sandbox-draft-pr-packet.md
reports/dreams/YYYY-MM-DD/daily-improvement-dream.md
reports/dreams/YYYY-MM-DD/daily-improvement-dream.json
reports/night-shift/YYYY-MM-DD/morning-ceo-brief.md
```

## Morning CEO Brief Contract

The brief must be decision-ready:

- what ran
- what completed
- what failed
- what the CEO would likely reject and why
- top human decisions
- blocked work
- next three recommended dispatches
- forgotten work worth reviving
- outdated assumptions that can mislead agents
- top ideas to decide, park, kill or schedule
- Daily Improvement Dream section with proposal-only SOP, skill, harness,
  memory and Linear hygiene recommendations
- AI cost snapshot with fixed monthly commitments, variable worker usage,
  unknown-token calls and budget blockers
- controller dispatch board with parent, child candidate, C-level owner, worker,
  state and exact CEO decision
- runtime readiness board entries for every blocked dispatch: latest
  `controller.runtime-ready` verdict, `reason_codes`, owning C-level seat,
  remediation owner and next repair action. `CONTRACT_PASS` alone is not enough
  for a morning recommendation once Stage 0.65 is active.

Controller state should come from the `issue-state-from-agent-events` reducer,
not from scraping prose reports. Raw worker output is evidence; reduced event
state is the dispatch board source.

The morning brief should run
`scripts/dreams/generate-daily-improvement-dream.mjs --write
--update-morning-brief --append-events` after writing the main brief, or include
the latest `reports/dreams/YYYY-MM-DD/daily-improvement-dream.md` section
itself. The dream remains proposal-only until controller or CEO review.

The CEO should be able to process it in under 10 minutes.

## Sandbox Branch Review

Before the first real L3 sandbox pilot, the controller should run
`scripts/sandbox-pr/simulate-autonomy-shadow-run.mjs` and read the predicted
`what_mathias_would_reject`, `would_fail_because` and `next_safe_real_action`.
The shadow run is not a work authorization; it is a calibration surface.

Morning review for L3 work should list sandbox branches instead of raw worker
noise:

```text
codex/sandbox/<workspace>/<YYYY-MM-DD>-<issue>-<worker>-<role-owner>-<task-slug>-<hhmmss>
```

Each sandbox entry needs owner, controller verdict, test status, residual risk
and recommended integration order. Integration stays gated even when the worker
and controller both pass.

## GitHub Repo Pattern

A public or private Company.OS-compatible repo should contain:

```text
AGENTS.md
README.md
ROADMAP.md
docs/
  architecture/
  operations/
  integrations/
  governance/
  templates/
  rhythms/
kits/
metrics/
reports/
.github/
  ISSUE_TEMPLATE/
  pull_request_template.md
```

Do not commit:

- credentials
- raw chat logs
- personal memory
- customer data
- private medical/legal details
- ignored private reports

## Productization Rule

When an internal company pattern proves useful, extract it like this:

| Internal Pattern | Public/GitHub Pattern |
|---|---|
| Internal product-domain queue | Product Domain Queue |
| Internal app/backend SSOT | Product repo / Backend SSOT |
| Founder quality bar | CEO Intent Fit / Founder Quality Bar |
| Internal marketing lane | Marketing Department Queue |
| Internal business ops | Business Operations Queue |
| Night Shift Controller | Autonomous Ops Controller |
| Backlog Archaeology | Forgotten Work Sweep |
| Idea Radar | Idea Radar |

Keep private examples private. Publish the operating principle, contract,
template and guardrails.
