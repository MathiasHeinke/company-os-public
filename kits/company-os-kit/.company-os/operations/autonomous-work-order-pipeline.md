# Autonomous Work Order Pipeline

Status: local client install guide
Company.OS baseline: record exact version in `.company-os/install-record.md`
Use for: converting executive intent into controlled agentic work orders

## Purpose

This workspace uses Company.OS to turn company intent into bounded work orders.

The operating loop is:

```text
CEO intent
-> source-of-truth docs
-> execution ledger issue
-> CEO/controller review
-> C-level role owner
-> worker contract
-> scheduled or manual dispatch
-> worker report
-> controller synthesis
-> HumanGate decision
-> verified next action
```

This file is the local install guide. The canonical doctrine lives in the
Company.OS repo:

```text
VERSION
CHANGELOG.md
docs/releases/versioning.md
docs/operations/company-os-client-rollout-doctrine.md
docs/operations/client-installable-autonomous-work-order-pipeline.md
docs/operations/autonomous-work-order-doctrine.md
docs/templates/worker-issue-contract.md
```

Do not run a new installation as "latest." Copy
`.company-os/operations/install-record.example.md` to
`.company-os/install-record.md` and record the exact Company.OS version,
autonomy profile, ledger, registry and disabled lanes before the first pilot.

## Local Files

Customize these files after installing the kit:

```text
.company-os/operations/workspace-registry.example.json
.company-os/operations/automation-registry.example.md
.company-os/operations/install-record.example.md
.company-os/templates/linear-worker-issue-template.md
.company-os/charters/ceo-worker.md
.company-os/charters/controller-agent.md
.company-os/charters/cto-agent.md
.company-os/charters/cpo-agent.md
.company-os/charters/cmo-agent.md
.company-os/charters/qa-eval-agent.md
memory-bank/system-index.md
AGENTS.md
```

The example registry files may be copied to production names such as:

```text
.company-os/operations/workspace-registry.json
.company-os/operations/automation-registry.md
```

Before scheduled night work, run the Git Worktree Hygiene job from the
automation registry. It is read-only and should block dirty roots or dirty
sandbox worktrees before the controller starts worker dispatch.

## Installed Baseline

Every target workspace should promote the example record to:

```text
.company-os/install-record.md
```

Minimum metadata:

```text
Company.OS version:
Autonomy profile:
Install date:
Workspace registry:
Execution ledger:
HumanGate owner:
First pilot issue:
Known disabled lanes:
```

Treat this record as the install anchor. Upgrade docs, worker contracts,
schedules and gates against this record, not against chat memory.

## Roles

| Role | Owns |
|---|---|
| Founder | mission, taste, capital, trust, HG-3 decisions |
| CEO/controller | orchestration, synthesis, sequencing, HG-1/HG-2 when allowed |
| CTO | engineering risk, architecture, tests, release gates |
| CPO | product scope, acceptance criteria, user workflow |
| CMO | growth, content, campaigns, public-claim gates |
| QA/Eval | evidence, tests, audit verdicts |
| Worker | bounded report, plan, audit or implementation slice |

Workers do not self-promote, self-close, publish, spend, deploy or write memory
unless a controller-approved contract explicitly allows the action.

## HumanGate Matrix

| Gate | Release owner | Allowed examples |
|---|---|---|
| HG-0 | automation/controller | read-only reports, local dry-runs |
| HG-1 | CEO/controller | child issue creation, docs, low-risk internal planning |
| HG-2 | CEO/controller with evidence | reversible implementation slice, sandbox review packet |
| HG-3 | founder or delegated human | production, schema/auth, public publishing, spend, regulated claims |

HG-3 boundaries are company trust boundaries. Do not automate across them by
default.

## Worker Issue Rule

Every delegated issue must include at least:

```text
Layer
Role
RoleOwner
Department
Controller
DecisionOwner
Agent
Mode
Workspace
Dispatch
RunAt
DependsOn
SourceOfTruth
Scope
Acceptance Criteria
Gates
HumanGate
BlockedActions
Reporting
```

Use `.company-os/templates/linear-worker-issue-template.md` for the full
copyable template.

## Scheduler Rules

The scheduler may dispatch only contract-valid work.

Allowed by default:

- read source-of-truth docs
- read execution-ledger issues
- write heartbeat/outcome comments
- write local reports
- append event rows
- run read-only inspections
- run redacted read-only worker sidecars inside the issue scope

Blocked by default:

- production writes
- deploys
- schema/RLS/auth changes
- public publishing or outreach
- paid spend
- raw customer or regulated data in external prompts
- direct Done transitions
- durable memory writes by workers

## First Pilot

Start with one read-only pilot:

Before dispatch:

- install record exists and names the exact version
- workspace registry is customized and promoted
- execution ledger parent issue exists
- runtime auth preflight is green for required agents
- git worktree hygiene is green for target repos
- budget brake is configured
- first issue passes the 10/10 work-order quality bar

Then:

1. Create one parent issue with a real company problem.
2. Attach source-of-truth docs.
3. Create one W0 controller preflight worker.
4. Create one low-cost planning worker.
5. Create one risk/audit worker if needed.
6. Let the controller synthesize the reports.
7. Decide the next slice under HG-1, HG-2 or HG-3.

Do not begin with autonomous production execution.

## Reports

Use local report paths that a controller can find:

```text
reports/work-orders/YYYY-MM-DD/ISSUE-ID/
metrics/agent-events.jsonl
metrics/ai-cost-ledger.jsonl
```

Reports are evidence. The execution ledger is the state surface. Memory is for
durable decisions only after controller review.
