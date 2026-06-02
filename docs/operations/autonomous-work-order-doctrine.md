# Autonomous Work Order Doctrine

Status: precedent doctrine  
Use for: Company.OS, ARES workspaces, client/company implementations  
Created: 2026-05-08

## Purpose

This doctrine captures the operating precedent from the ARES Marketing Control
Plane plan:

```text
Founder intent
-> Linear work order
-> Codex CEO/controller
-> C-level role owner
-> parseable worker contract
-> scheduled controller pass
-> low-cost worker sidecars
-> controller synthesis
-> gated integration
-> ledger, reports, memory, next work
```

The goal is to remove the founder from routine execution without removing
founder taste, mission, risk control or capital authority from the system.

Company.OS should treat every serious work request as a future autonomous work
order unless the request is intentionally exploratory conversation.

For paid or third-party implementations, use
`docs/operations/client-installable-autonomous-work-order-pipeline.md` as the
packaging and installation layer. This doctrine defines the operating principle;
the client-installable pipeline defines how to reproduce it in another firm with
workspace registry, kit files, automation registry, Linear templates and first
pilot gates.

## Core Rule

Do not ask the founder to carry state in their head.

Every durable work request must become one of these:

- source-of-truth doc update
- memory conclusion or memory proposal
- Linear parent issue
- Linear child worker issue
- calendar decision block
- explicit parked/no-action note

Linear is the execution ledger, not memory. Memory and docs hold durable truth.
Codex as CEO/controller converts loose intent into structured execution.

## Precedent Work Order Shape

A work order is valid only when it answers:

1. What exact outcome is wanted?
2. Which C-level bar owns it?
3. Which workspace owns it?
4. Which source-of-truth files constrain it?
5. Which worker can safely do the next bounded slice?
6. Which runtime auth and cost gates are required?
7. Which evidence proves completion?
8. Which actions remain blocked?
9. Which HumanGate remains?
10. Where does the worker report?

Minimum parseable fields:

```text
Layer:
Role:
RoleOwner:
Department:
AccountableLayer:
ReportsTo:
AutonomyLevel:
Controller:
DecisionOwner:
Agent:
Mode:
Workspace:
Dispatch:
RunAt:
DependsOn:
Sandbox:
SourceOfTruth:
Scope:
Acceptance Criteria:
Gates:
OutcomeSpec:
AlwaysAllow:
RuntimeAuth:
EventPolicy:
DreamPolicy:
SessionPolicy:
HumanGate:
HumanGateLevel:
HumanGateOwner:
FounderPrediction:
FounderPredictionConfidence:
BlockedActions:
Reporting:
MaxRuntime:
MaxSpend:
KillSwitch:
Heartbeat:
```

## Autonomy Design Target

The founder should not be the scheduler, issue triager, prompt writer, QA
operator or status reporter.

The founder should only be needed for:

- mission/taste calls
- capital allocation beyond approved budgets
- regulated public risk acceptance
- irreversible production/customer actions
- autonomy increases
- hiring/vendor/legal commitments
- final company direction changes

Everything else should be reducible to CEO/controller decisions, C-level bars,
worker contracts, evidence gates and rollback paths.

## Autonomy Horizon

Company.OS can run at different autonomy horizons depending on how many gates
have explicit pre-approval.

| Horizon | What can run without founder | Expected limit |
|---|---|---|
| 24-72 hours | L1/L2 read, report, audit, draft, triage, planning, dry-run artifacts, morning briefs | Safe today if runtime auth, lane locks and ledgers are healthy. |
| 3-7 days | Multiple department queues, cost-routed sidecars, recurring content drafts, test generation, sandbox preparation | Works if budgets, runtime auth and issue contracts are explicit. HumanGate backlog starts accumulating. |
| 1-4 weeks | L2 operations plus selected L3 sandbox implementation and review packets | Requires delegated CEO/controller authority for HG-1/HG-2, strict kill switches, and daily artifact truth. |
| 1-3 months | Mostly autonomous company operating cadence | Requires real deputies or policies for HG-3 substitutes, budget envelopes, incident playbooks, and legal/compliance escalation. |
| Indefinite | Not founderless, but founder-light | Requires governance: board/delegate gates, capital policy, production release policy, emergency stop, and audited memory/ledger loops. |

Read-only and planning work can run almost indefinitely. Value degrades when
HumanGates accumulate. True business autonomy is limited by unresolved HG-3
decisions, not by the number of tasks.

## The 100 Work Orders Rule

Company.OS should be able to ingest 100 work orders if each order is sliced into
bounded contracts.

The system must not attempt 100 parallel actions.

Default throughput:

- one active controller lane per workspace
- one active worker group per controller pass
- one L3 sandbox implementation per workspace unless explicitly widened
- no more than one public/external-write lane at a time
- batch low-risk L1/L2 audits through Grok and DeepSeek
- reserve Claude for high-risk evals or final audits
- reserve Codex for CEO/controller integration

With eight nightly controller passes and three daytime department passes, a
healthy pilot can process roughly:

- 8-12 controller decisions per day
- 3-6 low-cost worker sidecars per day
- 1-2 serious implementation/review packets per day
- many more issue triage updates if they are report-only

This is enough for 100 work orders to be triaged in days, but not enough to
complete 100 meaningful changes in days. Completion speed is bound by gates,
quality review, integration risk and founder-level decisions.

## Work Order Lifecycle

```text
intake
-> mapped
-> contract-valid
-> dispatch-ready
-> running
-> worker-reported
-> controller-review
-> verified | blocked | human-gate | parked
-> done only after acceptance criteria and gates pass
```

Workers never self-promote to done.

The controller may release HG-1/HG-2 when:

- source of truth is explicit
- gates passed
- no high-severity finding remains
- rollback/stop path exists
- FounderPredictionConfidence meets the threshold
- blocked actions remain blocked

HG-3 remains founder or delegated-human owned.

## Worker Economy

Use the cheapest competent worker first.

| Worker | Default use | Forbidden |
|---|---|---|
| Grok 4.3 | broad triage, idea/angle generation, market scan, first-pass report | source writes, Linear writes, production actions |
| DeepSeek Pro | edge cases, implementation critique, tests, schema drift, deterministic review | source writes, Linear writes, production actions |
| Claude CLI | final audit, legal/medical/reputation review, deep code review | direct edits unless explicitly approved in sandbox |
| Codex | CEO/controller, integration, final decision, source edits, ledger closeout | bypassing gates or using itself for every cheap first pass |

Every non-dry-run external worker dispatch must append a cost ledger row.

## Founder Absence Mode

If the founder is sick or unavailable, Company.OS should switch to Founder
Absence Mode instead of stalling.

Allowed:

- continue L1/L2 read/report/audit/plan/draft work
- prepare decision cards and review packets
- run approved dry-runs
- run cost-routed sidecars inside existing budgets
- prepare sandbox branches for review when pre-approved
- write morning CEO briefs and blocker reports
- park HG-3 decisions cleanly

Not allowed:

- new production release
- public publishing that has not been pre-approved
- direct public replies/outreach
- schema/RLS/auth/service-role changes
- spend beyond approved envelope
- legal/medical/Rx/financial risk acceptance
- autonomy increase
- direct Done on gate-incomplete issues

Founder Absence Mode should produce a daily packet:

```text
What continued
What completed
What is waiting for founder
What CEO/controller released under HG-1/HG-2
What is blocked under HG-3
What risk is accumulating
What should be killed, parked or delegated
```

## How To Preserve This For Future Sessions

Future Codex/agent sessions should bootstrap in this order:

1. repo `AGENTS.md`
2. local system index
3. active context
4. Company.OS `docs/operations/autonomous-work-order-doctrine.md`
5. Company.OS `docs/operations/ceo-controller-agentic-protocol.md`
6. Company.OS `docs/templates/worker-issue-contract.md`
7. relevant Linear parent issue

When a new task looks like a precedent:

- write the plan to `docs/superpowers/plans/`
- link the plan from the Linear parent
- extract the reusable doctrine into Company.OS docs
- add only a small pointer to workspace memory/index
- create Honcho conclusions for durable architecture memory
- avoid dumping session summaries into Linear

## Quality Bar

The system is autonomous only when it can prove:

- it knows what it is allowed to do
- it knows what it must not do
- it can run without UI approval prompts
- it can stop safely
- it can report evidence
- it can preserve cost telemetry
- it can separate work state from memory
- it can keep founder-level decisions queued instead of pretending they passed

Autonomy is not measured by how many agents run. It is measured by how long the
company can continue producing valid, reviewable, non-destructive work while the
founder is unavailable.
