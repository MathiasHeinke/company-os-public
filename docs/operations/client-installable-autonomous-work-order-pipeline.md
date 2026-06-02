# Client Installable Autonomous Work Order Pipeline

Status: productized implementation pattern
Use for: paid Company.OS implementations, internal pilots, open-source reference installs
Owner: CEO/controller
Current version: `0.2.0-alpha.1`
Last updated: 2026-05-08

## Purpose

This document turns the autonomous work-order precedent into a reusable client
pipeline.

The pipeline lets a new company run the same operating pattern:

```text
Founder or CEO intent
-> source-of-truth docs
-> execution ledger work order
-> CEO/controller interpretation
-> C-level role owner
-> bounded worker contracts
-> scheduled controller pass
-> low-cost worker reports
-> controller synthesis
-> HumanGate decision
-> verified implementation or parked blocker
```

The goal is not to sell "agents do everything." The goal is to install a
company-grade control plane where agents can safely keep work moving while
humans keep authority over risk, capital, public trust, production systems and
mission.

For the current end-to-end rollout procedure, read
`docs/operations/company-os-client-rollout-doctrine.md` first. This file
defines the reusable work-order pipeline; the rollout doctrine defines the
versioned install sequence, learned gates, first pilot, stop rules and upgrade
checklist.

## Product Promise

Company.OS installs an autonomous work-order layer that can be copied into a
new firm without rewriting the operating model.

After installation, the client should have:

- one execution ledger with parseable work orders
- one workspace registry for repos and departments
- one CEO/controller role that owns orchestration
- C-level owner roles for product, engineering, growth, ops, finance and
  governance
- low-cost worker routes for read-only planning, audit and review
- expensive or trusted agents reserved for integration and final decisions
- typed event ledgers and report paths
- explicit HumanGate levels
- daily and nightly rhythms
- a first pilot issue that proves the loop before autonomy increases

The installed baseline must record:

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

## What This Is Not

This is not:

- a generic task management setup
- a chatbot in front of Linear
- uncontrolled multi-agent background execution
- a replacement for legal, medical, financial or security judgment
- a permission to let workers self-close issues
- a promise that every company can run without a founder

The pipeline reduces routine coordination load. It does not remove governance.

## Installable Package

The resale package has two layers.

### Layer 1 - Company.OS Repo

The Company.OS repo provides the canonical docs, templates, harnesses and local
helpers:

```text
docs/operations/client-installable-autonomous-work-order-pipeline.md
docs/operations/autonomous-work-order-doctrine.md
docs/operations/autonomous-ops-loop.md
docs/operations/automation-registry.md
docs/operations/runtime-auth-preflight.md
docs/operations/codex-cost-router.md
docs/operations/agent-event-ledger.md
docs/templates/company-os-install-record.md
docs/templates/worker-issue-contract.md
docs/templates/model-router-worker-prompts.md
scripts/linear/headless-linear.mjs
scripts/model-router/codex-cost-router.mjs
scripts/runtime/automation-runtime-runner.mjs
scripts/runtime/lane-lock.mjs
scripts/agent-events/validate-agent-events.mjs
scripts/agent-events/reduce-agent-events.mjs
```

### Layer 2 - Company.OS Kit

The kit is copied into each client workspace:

```text
kits/company-os-kit/.company-os/operations/autonomous-work-order-pipeline.md
kits/company-os-kit/.company-os/operations/install-record.example.md
kits/company-os-kit/.company-os/operations/workspace-registry.example.json
kits/company-os-kit/.company-os/operations/automation-registry.example.md
kits/company-os-kit/.company-os/templates/linear-worker-issue-template.md
kits/company-os-kit/.company-os/charters/
kits/company-os-kit/.agents/
kits/company-os-kit/memory-bank/
kits/company-os-kit/templates/AGENTS.md
```

The kit files are intentionally generic. Client-specific names, repo paths,
Linear team keys and model providers are configured in the client workspace
after install.

## Minimum Architecture

Every implementation must have these layers:

| Layer | Required | Purpose |
|---|---:|---|
| Strategy docs | yes | Company direction, constraints and priorities. |
| Memory | yes | Durable decisions and cross-session context. |
| Execution ledger | yes | Work orders, blockers, dependencies and gates. |
| Workspace registry | yes | Maps portable workspace keys to local paths. |
| CEO/controller | yes | Orchestrates, synthesizes and decides allowed gates. |
| C-level role owners | yes | Product, engineering, growth, ops, finance and governance bars. |
| Worker contracts | yes | Parseable assignments for humans and agents. |
| Cost router | recommended | Routes redacted sidecars to cheaper workers. |
| Runtime auth preflight | yes | Prevents scheduled jobs from failing on login prompts. |
| Git worktree hygiene | yes | Prevents unattended work from starting on dirty roots or unresolved sandboxes. |
| Agent event ledger | yes | Machine-readable state stream for runs and decisions. |
| Automation registry | yes | Lists recurring jobs, owners, outputs and stop rules. |
| Morning brief | recommended | Turns night work into decisions. |

## HumanGate Levels

Use the same gate levels in every client implementation.

| Level | Who may release | Examples |
|---|---|---|
| HG-0 | automation/controller | read-only reports, local dry-runs, non-sensitive triage |
| HG-1 | CEO/controller | reversible internal docs, child issue creation, low-risk planning |
| HG-2 | CEO/controller if confidence and evidence pass | reversible implementation slices, sandbox packets, internal dashboard changes |
| HG-3 | founder or explicitly delegated human | production releases, schema/RLS/auth, public publishing, spend, regulated claims, autonomy increase |

The CEO/controller may release HG-1/HG-2 only when:

- source-of-truth is explicit
- acceptance criteria and gates are verifiable
- rollback or stop path is named
- no high-severity finding remains
- worker reports are attached
- blocked actions remain blocked
- founder-decision prediction confidence meets the local threshold

HG-3 is CEO/operator-owned only when the client has a written governance
delegation, passing validation and a reversible restore path. Strategic,
non-restorable or founder-will decisions stay human-owned at HG-4.

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
-> done only after gates pass
```

State rules:

- Workers never mark work done.
- Workers never update durable memory directly.
- Workers never spend money or publish externally.
- Workers never bypass dependency gates.
- Controller comments explain state transitions.
- Event rows make state reducible without scraping prose.

## 10/10 Work Order Quality Bar

A work order is good when a smart human understands it. A 10/10 Company.OS work
order is stronger: a scheduler, C-level owner, worker and controller can all act
on it without guessing.

Use this quality bar before calling a work order dispatch-ready.

### 1. Decision Is Explicit

The issue must state one current decision, not only a discussion.

Good:

```text
For 14 days, use the execution ledger for decisions and a spreadsheet as the
operational data layer. Revisit buy-vs-build after real usage.
```

Weak:

```text
Figure out whether we should use sheets, the execution ledger, a CRM or a
dashboard.
```

### 2. Source Of Truth Is Split Correctly

The issue links the durable source files and keeps the execution ledger as the
state surface.

Required:

- canonical doc path
- related parent/child issue IDs
- workspace registry key or absolute path
- data source or dashboard link if relevant
- explicit note for what must not be copied into the execution ledger

### 3. Agentic Plan Mode Is Explicit

Each work order must say where the executable agentic plan lives.

Use one of:

- `inline`: the execution-ledger issue itself is the complete executable plan
  and includes worker contracts, gates, reporting and next dispatch.
- `linked`: the issue is a ledger shell and links to a canonical versioned plan
  in repo docs, Drive or another approved source of truth.
- `hybrid`: the issue contains dispatch fields and current state, while the
  longer architecture or implementation plan lives in a linked source file.

Required header:

```text
AgenticPlanMode: inline | linked | hybrid
PlanVersion: YYYY-MM-DD-v1
ControllerContract: W0-W4 + Gates + Reporting
```

If this header is missing, a scheduler may treat the work order as not
dispatch-ready even when the prose looks complete.

### 4. Control Plane Is Machine-Readable

The control-plane block must include:

```text
Layer
Role
RoleOwner
Department
AccountableLayer
ReportsTo
AutonomyLevel
Controller
DecisionOwner
Agent
Mode
Workspace
Dispatch
RunAt
DependsOn
Sandbox
HumanGateLevel
HumanGateOwner
BlockedActions
```

If `Agent: human` appears in a task that should later be scheduled, add a
separate worker contract for the non-human executor. The role owner can be CMO
while the runtime worker is Codex, Claude, DeepSeek, Grok, Gemini or human.

### 5. Worker Steps Are Real Contracts

Each worker step needs more than a paragraph.

For each worker include:

- `Agent`
- `Mode`
- `Workspace`
- `SourceOfTruth`
- `Scope Include`
- `Scope Exclude`
- `Acceptance Criteria`
- `Gates`
- `RuntimeAuth`
- `OutcomeArtifacts`
- `Reporting`
- `MaxRuntime`
- `KillSwitch`

If a worker will touch Google Drive, Slack, email, CRM, production data or a
public channel, name the required connector/auth and stop rule.

### 6. Data Model Is Operational

For data-layer work, a schema is 10/10 only if it names:

- entity IDs
- required fields
- allowed enum values
- owner fields
- update cadence
- privacy class
- source system
- dedupe key
- readout destination
- forbidden fields

Column lists are useful, but controller-grade schemas also need allowed values,
dummy seed rows or examples for the first operator.

### 7. Acceptance Criteria Are Verifiable

Every acceptance criterion must be checkable by a worker or controller.

Good:

```text
Sheet exists, link is commented on the issue, all required tabs exist, and the
privacy pass confirms no raw health data or private communication fields are
present.
```

Weak:

```text
Sheet is useful and privacy-safe.
```

### 8. HumanGate Is A Decision Surface

HumanGate must state:

- the exact decision
- who releases it
- what evidence they receive
- which actions remain blocked even after approval
- rollback or stop path
- founder/CEO prediction and confidence

HG-2 without `OutcomeArtifacts` and `BlockedActions` is not controller-ready.
HG-3 without a human decision dossier is not release-ready.

### 9. Reporting Is Reducible

A report is reducible when the controller can answer:

- what ran
- what changed
- what artifact exists
- what passed
- what blocked
- what human decision is needed
- what exact next worker should run

For scheduled work, free-form prose is not enough. Include `EventPolicy`,
`EventSink`, `EventTypes` and `StateReducer`.

### 10. Next Dispatch Is Named

Every dispatch-ready issue should end with the next concrete worker.

```text
Next Dispatch:
Agent: codex
Mode: verify
Workspace: registry:company-os
Report: reports/work-orders/YYYY-MM-DD/ISSUE/W0-controller-preflight.md
Stop: no external worker until W0 confirms redaction and dependency state
```

Without this, the issue may be well documented but still not operational.

### 11. Controller Synthesis Is Reserved

Workers produce evidence. The controller synthesizes.

The final controller synthesis must name:

- accepted worker findings
- rejected worker findings
- unresolved risks
- HumanGate level
- next issue or next worker
- whether the parent issue remains open, moves to review, or parks

Workers may propose a status. They do not own the final state.

## Required Linear Issue Shape

Every delegated issue must include:

```markdown
AgenticPlanMode:
PlanVersion:
ControllerContract:

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
BranchName:
WorktreeRoot:
IntegrationTarget:

SourceOfTruth:

Scope:

Acceptance Criteria:

Gates:

OutcomeSpec:
OutcomeRubric:
OutcomeMaxIterations:
OutcomeGrader:
OutcomePassThreshold:
OutcomeArtifacts:

AlwaysAllow:

RuntimeAuth:

EventPolicy:
EventSink:
EventTypes:
StateReducer:

DreamPolicy:
MemoryStore:
MemoryUpdatePolicy:

SessionPolicy:
Coordinator:
SubAgentRoster:
SharedFilesystem:
ContextIsolation:
CapabilityProfile:
RuntimeAdapter:
ManagedAgentCompatibility:

HumanGate:
HumanGateLevel:
HumanGateOwner:
FounderPrediction:
FounderPredictionConfidence:
BlockedActions:

Reporting:
MaxRuntime:
MaxCommits:
MaxSpend:
KillSwitch:
Heartbeat:
```

Use the full canonical contract in
`docs/templates/worker-issue-contract.md` when building paid implementations.

## Workspace Registry

Do not hardcode one repo.

Each client gets a workspace registry that maps portable keys to local paths and
execution-ledger routing.

Example keys:

```text
registry:company-os
registry:product
registry:website
registry:dashboard
registry:data
registry:marketing
registry:mobile
```

Registry rows should include:

- local path
- repo type
- owning department
- default controller
- Linear team or project
- build/test commands
- GitNexus availability
- sensitive-data class
- allowed autonomy ceiling

The scheduler reads the registry before dispatching. Agents do not self-poll
Linear as independent workers.

## Worker Routing

Default worker economy:

| Runtime | Default use | Must not do |
|---|---|---|
| Low-cost reasoning worker | issue triage, market scan, first-pass plan | write source, update ledger, handle secrets |
| Low-cost code/review worker | tests, schema critique, spec drift | production writes, final decision |
| High-context audit worker | privacy, security, release risk, cross-file audit | direct edits unless sandbox-approved |
| Codex/controller | orchestration, integration, final judgment | bypass gates or perform every cheap first pass |
| Human | HG-3 decisions, taste, capital, trust | carry routine state manually |

External workers get redacted prompts only.

Forbidden in external worker prompts:

- secrets, tokens, credential values
- raw private memory
- raw customer data
- raw personal communications
- raw health, legal, financial or regulated data
- private strategy not explicitly approved for that worker

If redaction is not clean, use the trusted controller path only and write the
blocker into the ledger.

## Scheduler Pattern

A scheduled controller pass performs this sequence:

```text
1. acquire lane lock
2. run runtime auth preflight
3. read automation registry
4. read due execution-ledger issues
5. validate worker contract fields
6. validate dependencies and RunAt
7. build redacted worker prompt if allowed
8. route low-risk worker through cost router
9. collect report artifacts
10. append agent-event rows
11. write concise ledger comment
12. release lock
13. include result in morning brief
```

It must stop before:

- production writes
- schema/RLS/auth/service-role changes
- public publishing or outreach
- external customer communication
- spend or paid API setup outside budget
- direct Done transition
- memory writes not covered by policy
- unclear source-of-truth

## First Client Pilot

The first pilot should be read-only.

Recommended pilot:

```text
Create one P1 issue as a parent work order.
Attach source-of-truth docs.
Create W0 controller preflight.
Dispatch W1 low-cost first-pass plan.
Dispatch W2 data/technical review.
Dispatch W3 product/customer review.
Dispatch W4 high-context risk audit only if needed.
Controller synthesizes reports.
CEO decides next gated slice.
```

Success criteria:

- the issue contract is parseable
- workers produce report artifacts
- event rows validate
- controller synthesis is short and decision-ready
- no worker crosses blocked actions
- the founder or CEO can approve, reject, narrow or park the next slice in
  under ten minutes

## Resale Implementation Phases

### Phase 1 - Discovery And Scope

Inputs:

- company goals
- product repos
- existing task system
- public-risk boundaries
- sensitive-data classes
- available agent runtimes
- budget envelope

Outputs:

- component map
- workspace registry draft
- execution-ledger taxonomy
- HumanGate matrix
- first pilot issue

### Phase 2 - Kit Installation

Install:

```bash
rsync -a /path/to/Company.OS/kits/company-os-kit/. /path/to/client-workspace/
```

Then customize:

- `AGENTS.md`
- `memory-bank/system-index.md`
- `.company-os/operations/workspace-registry.example.json`
- `.company-os/operations/automation-registry.example.md`
- `.company-os/templates/linear-worker-issue-template.md`
- `.company-os/charters/*.md`

The example files may be renamed after customization, but the canonical
contract should stay easy to find.

### Phase 3 - Runtime Setup

Required checks:

```bash
node /path/to/Company.OS/scripts/linear/headless-linear.mjs auth-preflight --json --soft
node /path/to/Company.OS/scripts/runtime/automation-runtime-runner.mjs auth-preflight --company-root /path/to/Company.OS --json --soft
```

Optional checks:

```bash
node /path/to/Company.OS/scripts/model-router/cost-ledger.mjs budget-check --models grok,deepseek --json
```

Code repos:

```bash
npx gitnexus analyze
npx gitnexus status
```

### Phase 4 - Execution Ledger Setup

Create:

- parent Company.OS control-plane project
- department projects or labels
- lifecycle states
- worker labels
- role-owner labels
- priority labels
- first pilot parent issue
- first worker child issue

Install the issue template from:

```text
.company-os/templates/linear-worker-issue-template.md
```

### Phase 5 - Automation Registry

Start with only three jobs:

1. runtime auth preflight
2. night controller
3. morning CEO brief

Add department lanes only after the first pilot proves:

- the worker contract is valid
- auth is headless
- events validate
- reports are findable
- the controller synthesis is useful

### Phase 6 - Autonomy Expansion

Autonomy increases require repeated proof.

Recommended progression:

```text
L1 reports
-> L2 read-only worker sidecars
-> L2 controller synthesis
-> L3 sandbox shadow run
-> L3 sandbox branch packet
-> human-reviewed merge/release
```

Never jump from read-only plans to production execution.

## Client Deliverables

A paid implementation should leave the client with:

- installed Company.OS Kit
- customized workspace registry
- customized automation registry
- C-level charters
- Linear worker issue template
- parent control-plane issue
- first pilot issue and worker reports
- HumanGate matrix
- runtime auth preflight result
- cost-router policy
- event ledger validation command
- morning CEO brief template
- handover note with next three work orders

## Readiness Checklist

The pipeline is ready for a client when:

- no private implementation data is in the installable kit
- every recurring job has owner, source-of-truth, output and stop rule
- Linear can be read and commented headlessly
- runtime auth checks do not require UI prompts
- workspace registry has no hardcoded source-company paths
- worker prompts are redacted
- event rows validate
- cost ledger path is configured
- first pilot can run read-only
- HG-3 boundaries are explicit
- client knows which actions are still human-owned

## Sales-Safe Explanation

Use this explanation when positioning the pipeline:

```text
Company.OS does not sell autonomous chaos. It installs a control plane for
agentic work. The system turns executive intent into parseable work orders,
routes bounded research and audit work to lower-cost agents, keeps a controller
in the loop, and stops before production, public, legal, money or trust
boundaries unless an authorized human releases the gate.
```

## Maintenance Loop

After installation, run a weekly controller review:

- which worker reports were useful
- which prompts leaked context or were too broad
- which HumanGates accumulated
- which automations asked for avoidable UI approval
- which issues were not parseable
- which C-level charters need tightening
- which client-specific docs should move into source-of-truth

Update the kit only with generic improvements. Keep client-specific data in the
client workspace.
