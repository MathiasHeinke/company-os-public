# Company.OS Worker Issue Template (Plane-canonical)

Use this template when authoring a Plane work item that will be locked by
`scripts/orchestration/plane-dispatcher-v0.mjs` (Stage 0.5 contract review,
Stage 0.6 remediation) and run through Runtime Dispatcher v1.2.

Plane is the canonical execution ledger for new Company.OS work. Linear is
legacy/bridge only and never receives a new worker issue from this template.
The full doctrine lives in `docs/orchestration/plane-first-linear-bridge.md`
and `docs/templates/worker-issue-contract.md` in the Company.OS repo.

Do not paste raw memory dumps, secrets, customer data, private communications
or long strategy archives into work items. Link to source-of-truth files
instead.

## Title

```text
RoleOwner Workstream: concrete outcome
```

## Plane Work Item Body

Plane stores rich-text descriptions as TipTap HTML. The fenced YAML block
below survives the round-trip and is what the dispatcher actually parses; the
prose around it is for human readers only.

````markdown
# Goal

One concrete outcome.

# Source of Truth

- absolute path, Plane work item ID or report path
- linked Spec Kit `constitution.md`, `spec.md`, `plan.md`, `tasks.md` if any

# Scope

Include:

- exact included work

Exclude:

- exact out-of-scope work

# Acceptance Criteria

- verifiable result

# Worker Contract

```yaml
role: role:coo
parent_seat: role:coo
agent: claude
mode: implement
workspace: registry:<workspace-key>
dispatch: ready
source_of_truth:
  - /absolute/source/path.md
acceptance_criteria:
  - One verifiable outcome.
gates:
  - command or review gate
human_gate: HG-1
reporting: Plane worker.reported with changed files, commands, results and blockers.
```

# Full Worker Issue Contract Fields

Use this prose block for the additional fields required by
`docs/templates/worker-issue-contract.md`. Keep the machine-readable YAML
fence above small enough that the dispatcher parser does not have to skip
prose.

Layer: CEO | Controller | CTO | CPO | CMO | COO | CFO | Legal | Compliance | Worker
Role: short role name
RoleLabel: role:cto | role:cpo | role:cmo | role:coo | role:cfo | role:cao
ParentSeat: role:cto | role:cpo | role:cmo | role:coo | role:cfo | role:cao | none
RoleOwner: CEO | CTO | CPO | CMO | COO | CFO | QA-Eval | Controller | Legal-Gate | Founder
Department: Chief-of-Staff | Engineering | Product | Growth | Ops | Finance | QA-Eval | Governance
AccountableLayer: CEO | C-Level | Department | Worker | Controller | HumanGate
ReportsTo: CEO | Controller | Founder
AutonomyLevel: L0 | L1 | L2 | L3 | L4 | L5
Controller: codex | human | scheduler
DecisionOwner: CEO | CTO | CPO | CMO | COO | CFO | Legal | Compliance | Founder | human
Agent: claude | gemini | codex | human
Mode: audit | plan | implement | verify | research | report | review
Workspace: registry:<workspace-key> | /absolute/path
Dispatch: ready | manual | scheduled
RunAt:
DependsOn:
Sandbox: none | required
BranchName:
WorktreeRoot:
IntegrationTarget:
AllowedWritePaths:
OutcomeSpec:
OutcomeRubric:
OutcomeMaxIterations:
OutcomeGrader: controller | separate-agent | human | managed-agent-grader
OutcomePassThreshold:
OutcomeArtifacts:
ReviewVerdict:
AutonomyRecommendation:
AlwaysAllow:
- read listed source-of-truth files
- read this work item and dependencies
- write local report artifact
- append approved event rows
- comment concise status/outcome back to the Plane work item
RuntimeAuth:
- required CLI or connector preflight
RuntimePermissionMode: plan | default | auto | acceptEdits | dontAsk
InferenceClass: auto | P0-doc-small | P1-code-bounded | P2-code-shared | P3-cross-repo | P4-high-risk
RuntimeAgent: auto | claude | codex | gemini | openrouter | human
RuntimeModel:
InferenceBudget: low | standard | high | xhigh | max-context | multi-proposal
SplitPolicy: single-worker | worker-plus-controller-audit | primary-worker-plus-sidecar-audit | parallel-proposal | parallel-execution | no-autonomous-spawn
PrimaryRuntime: auto | claude | codex | gemini | openrouter | human
FallbackRuntime: none | auto | claude | codex | gemini | openrouter | human
SecondaryAuditor: none | auto | claude | codex | gemini | openrouter | human
GateExecutionPolicy: worker-runs-declared-gates | controller-only | audit-only
AllowedClaudeTools:
EventPolicy: required
EventSink: plane-comment | metrics-jsonl | webhook | managed-agent-events
EventTypes: worker.locked, worker.heartbeat, worker.blocked, worker.reported, controller.verdict
StateReducer: issue-state-from-agent-events
WebhookPolicy: none | bridge-only | live
DreamPolicy: none | proposal-only | controller-approved | managed-agent-output-review
MemoryStore: none | company | product | personal
MemoryUpdatePolicy: none | proposal-only | controller-approved
ReflectionPolicy: none | required
LearningProposalPolicy: none | required
SessionPolicy: single-worker | coordinator-with-subagents
Coordinator:
SubAgentRoster: none | [explorer, worker, ...]
SharedFilesystem: none | sandbox-worktree | managed-container
ContextIsolation: redacted-prompt-only | repo-source-only | internal
CapabilityProfile:
RuntimeAdapter: local-cli | plane-runner | managed-agent
ManagedAgentCompatibility: local-only | adapter-ready | managed-agent-pilot
HumanGate:
HumanGateLevel: HG-0 | HG-1 | HG-2 | HG-2.5 | HG-3
HumanGateOwner: CEO | Founder | named-role
DecisionMode: AUTO-GO | DELEGATE | SELF-FIX | ASK-FOUNDER | REJECT | PARK
ReleaseAuthority: none | CEO_AUTONOMOUS | FOUNDER_REQUIRED
RollbackPlan:
BlastRadius:
CAOVerdict:
FounderPrediction:
FounderPredictionConfidence:
BlockedActions:
- production writes
- deploys
- schema/RLS/auth/service-role changes
- public publishing
- external outreach
- money movement
- direct Plane Done transition
- worker memory writes
- new Linear issue creation (Linear is bridge-only)
Reporting: Plane worker.reported with absolute report path under reports/work-orders/YYYY-MM-DD/<issue>/
MaxRuntime:
MaxTurns:
MaxCommits:
MaxSpend: EUR 0
KillSwitch: Plane KILL comment or runtime kill sentinel stops immediately.
Heartbeat: 60s | 15m scheduler heartbeat
````

## Linear Bridge Note

Linear is legacy/bridge only. Pre-migration Linear items (`MAT-*` or a
client's own legacy prefix) remain valid as historical context. New work
items go to Plane. If a Plane work item carries a `bridge_source:` reference
to a Linear key, the worker reads the Linear thread for context but never
writes back unless an `AlwaysAllow` action explicitly enables a bridge
comment.

See `docs/orchestration/plane-first-linear-bridge.md` in the Company.OS repo
for the full bridge doctrine, drift-check pattern and cutover conditions.

## Controller Quality Bar

Before Stage 0.5 Contract Controller may PASS the item:

- AgenticPlanMode is explicit (inline executable plan, linked plan, or hybrid)
- the current decision is explicit, not just a discussion
- source-of-truth paths are concrete and absolute or registry-resolvable
- role owner and runtime worker are separated when needed
- every worker step has acceptance criteria, gates, runtime auth, artifacts,
  reporting, max runtime and kill switch
- HumanGate names the exact decision, owner, evidence, rollback and blocked
  actions
- EventPolicy, EventSink, EventTypes and StateReducer are present for
  scheduled or long-running work
- the next concrete dispatch is named
- controller synthesis is reserved for the controller, not the worker

Before the dispatcher locks the item:

- workspace resolves through the registry (`.company-os/operations/workspace-registry.json`)
- dependencies are satisfied or safely scoped
- external prompts are redacted
- runtime auth is green
- blocked actions are explicit
- report path is absolute or registry-resolvable
- HumanGate level matches risk

Before Plane Done (Founder/CEO only, never worker, never CAO):

- acceptance criteria pass
- gates pass
- worker report exists
- controller verdict exists
- HumanGate decisions are resolved
- event rows validate
- durable memory updates, if any, were controller-approved
