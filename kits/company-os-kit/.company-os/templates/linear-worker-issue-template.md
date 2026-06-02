# Company.OS Worker Issue Template — Linear (legacy / bridge only)

> **Status:** legacy / bridge-only. Plane is the canonical execution ledger for
> new Company.OS work. See `plane-worker-issue-template.md` (same directory)
> and `docs/orchestration/plane-first-linear-bridge.md` in the Company.OS
> repo. New worker issues MUST be authored in the Plane template, not here.
>
> This file is retained so installs that still have an active Linear cohort
> (`MAT-*` or a client's own pre-migration prefix) can keep authoring bridge
> comments and historical issues in a recognizable shape. Workers must not
> open new Linear issues from this template unless their contract explicitly
> enables a bridge-only action.
>
> **When to use this template:**
>
> - You are mirroring a Plane work item back to a pre-existing Linear thread
>   for human visibility during the bridge window, OR
> - You are documenting a legacy Linear issue for archive/reference, OR
> - Your install has not yet migrated to Plane and is operating in the
>   transitional period named in
>   `docs/orchestration/plane-first-linear-bridge.md`.
>
> **When NOT to use this template:**
>
> - Authoring a new dispatchable worker contract. Use the Plane template.
> - Anything the dispatcher (`plane-dispatcher-v0`, Runtime Dispatcher v1.2)
>   will lock. The dispatcher reads Plane work items, not Linear issues.
> - Anything that needs a `controller.contract-review: CONTRACT_PASS` from
>   Stage 0.5 Contract Controller. That gate runs on Plane only.

Linear is legacy / bridge surface. Do not paste raw memory dumps, secrets,
customer data, private communications or long strategy archives into issues.
Link to source-of-truth files instead.

## Title

```text
RoleOwner Workstream: concrete outcome
```

## Issue Body

```markdown
# Goal

One concrete outcome.

# Agentic Plan

AgenticPlanMode: inline | linked | hybrid
PlanVersion: YYYY-MM-DD-v1
ControllerContract: W0-W4 + Gates + Reporting

# Control Plane

Layer: CEO | Controller | CTO | CPO | CMO | COO | CFO | Legal | Compliance | Worker
Role: short role name
RoleOwner: CEO | CTO | CPO | CMO | COO | CFO | QA-Eval | Controller | Legal-Gate | Founder
Department: Chief-of-Staff | Engineering | Product | Growth | Ops | Finance | QA-Eval | Governance
AccountableLayer: CEO | C-Level | Department | Worker | Controller | HumanGate
ReportsTo: CEO | Controller | Founder
AutonomyLevel: L0 | L1 | L2 | L3 | L4 | L5
Controller: codex | human | scheduler
DecisionOwner: CEO | CTO | CPO | CMO | COO | CFO | Legal | Compliance | Founder | human
Agent: claude | gemini | codex | human | managed-agent
Mode: audit | plan | implement | verify | research | report | review
Workspace: registry:company-os | registry:product | registry:website | /absolute/path
Dispatch: manual | scheduled
RunAt:
DependsOn:
Sandbox: none | required
BranchName:
WorktreeRoot:
IntegrationTarget:

# SourceOfTruth

- path, URL, issue id or report path

# Scope

Include:

- exact included work

Exclude:

- exact out-of-scope work

# Acceptance Criteria

- verifiable result

# Gates

- command, review, audit or human gate

# Outcome

OutcomeSpec:
OutcomeRubric:
OutcomeMaxIterations: 1
OutcomeGrader: controller
OutcomePassThreshold:
OutcomeArtifacts:
ReviewVerdict:
AutonomyRecommendation:

# Permissions

AlwaysAllow:

- read listed source-of-truth files
- read this issue and dependencies
- write local report artifact
- append approved event rows
- comment concise status/outcome back to the execution ledger

RuntimeAuth:

- required CLI or connector preflight

EventPolicy: required
EventSink: linear-comment, metrics-jsonl
EventTypes: worker.locked, worker.heartbeat, worker.blocked, worker.reported, controller.verdict
StateReducer: issue-state-from-agent-events

# Memory And Session Policy

DreamPolicy: none | proposal-only | controller-approved
MemoryStore: none | company | product | personal
MemoryUpdatePolicy: none | proposal-only | controller-approved
SessionPolicy: single-worker | coordinator-with-subagents
Coordinator:
SubAgentRoster:
SharedFilesystem: none | sandbox-worktree
ContextIsolation: redacted-prompt-only | repo-source-only | internal
CapabilityProfile:
RuntimeAdapter: local-cli | linear-runner | managed-agent
ManagedAgentCompatibility: local-only | adapter-ready | managed-agent-pilot

# HumanGate

HumanGate:
HumanGateLevel: HG-0 | HG-1 | HG-2 | HG-3
HumanGateOwner:
FounderPrediction:
FounderPredictionConfidence:

BlockedActions:

- production writes
- deploys
- schema/RLS/auth/service-role changes
- public publishing
- external outreach
- money movement
- direct Done transition
- memory writes by workers

# Reporting

Reporting:
MaxRuntime:
MaxCommits:
MaxSpend:
KillSwitch:
Heartbeat:
```

## Controller Checklist

10/10 quality bar before dispatch:

- AgenticPlanMode makes clear whether the issue itself is the executable plan,
  links to a canonical plan, or uses a hybrid split
- the current decision is explicit, not just a discussion
- source-of-truth files are linked and the execution ledger is not used as a
  data warehouse
- role owner and runtime worker are separated when needed
- every worker step has acceptance criteria, gates, runtime auth, artifacts,
  reporting, max runtime and kill switch
- data schemas include required fields, allowed values, dedupe keys, privacy
  class and forbidden fields
- HumanGate states the exact decision, owner, evidence, rollback and blocked
  actions
- EventPolicy, EventSink, EventTypes and StateReducer are present for scheduled
  or long-running work
- the next concrete dispatch is named
- controller synthesis is reserved for the controller, not the worker

Before dispatch:

- source-of-truth is explicit
- workspace resolves through the registry
- dependencies are satisfied or safely scoped
- external prompts are redacted
- runtime auth is green
- blocked actions are explicit
- report path is absolute or registry-resolvable
- HumanGate level matches risk

Before Done:

- acceptance criteria pass
- gates pass
- worker report exists
- controller verdict exists
- HumanGate decisions are resolved
- event rows validate
- durable memory updates, if any, were controller-approved
