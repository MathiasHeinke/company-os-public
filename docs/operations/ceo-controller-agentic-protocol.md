# CEO Controller Agentic Protocol

Status: live pilot protocol
Use for: Company.OS, internal company ops, client implementations, public kit

## Purpose

This protocol turns normal founder/CEO conversations into controlled agentic
execution loops.

The goal is not to make the CEO write better prompts. The goal is to move work
out of the CEO's head and into a repeatable control plane:

```text
CEO intent
-> controller interpretation
-> Plane-backed work state
-> C-level ownership
-> bounded worker issue
-> worker execution
-> controller review
-> CEO decision only where judgment is required
```

## Core Principle

Every meaningful work conversation should answer five questions:

1. Where does this already live in the execution ledger?
2. Is this a memory/update, a blocker, a milestone, a review gate, or concrete
   work?
3. Which operating layer owns the decision?
4. Which bounded worker can safely execute the next slice?
5. What exact human gate remains before higher autonomy, edit mode, production
   impact, spend, public publishing, or final completion?

Plane is the canonical Company.OS execution ledger. Linear is bridge/legacy
where older text has not yet been migrated. Memory systems hold durable truth.
Controllers turn ambiguous work into bounded execution. Workers do not
self-promote.

When intent is captured by the future AionUI/Hermes Chief-of-Staff shell, use
`docs/operations/intent-to-department-reporting-chain.md` before execution:
intent card -> CEO routing -> department intake -> worker contract -> review ->
CEO handoff -> founder-facing summary.

## Runtime Versus Ownership

`Agent` is the runtime executor. `RoleOwner` is the accountable management role.
Do not rely on native Linear assignee alone for agentic work.

Founder and CEO are separate operating roles:

- `Founder` owns mission, taste, trust, capital, personal/legal risk and final
  human gates.
- `CEO` owns orchestration: converting founder intent into strategy,
  C-level ownership, bounded worker issues, dispatch, controller audit and
  morning decision surfaces.
- `CEO` may make operational sequencing and dispatch decisions inside approved
  autonomy levels, and may release HG-1/HG-2/HG-2.5/HG-3 gates when the gate
  evidence, reversibility proof and confidence thresholds are met. `Founder`
  remains the required owner for HG-4.

Use these fields for every nontrivial control-plane issue:

```text
RoleOwner: CEO | CTO | CPO | CMO | COO | CFO | QA-Eval | Controller | Legal-Gate | Founder
Department: Engineering | Product | Growth | Ops | Finance | QA-Eval | Governance
AccountableLayer: CEO | C-Level | Department | Worker | Controller | HumanGate
ReportsTo: CEO | Controller | Founder
AutonomyLevel: L0 | L1 | L2 | L3 | L4 | L5
HumanGateOwner: CEO | Founder | Legal | CTO | CPO | delegated-human
HumanGateLevel: HG-0 | HG-1 | HG-2 | HG-2.5 | HG-3 | HG-3.5 | HG-4
FounderPrediction:
FounderPredictionConfidence:
BlockedActions:
```

Default for code implementation after approval:

```text
RoleOwner: CTO
Department: Engineering
AccountableLayer: C-Level
ReportsTo: CEO
AutonomyLevel: L3
HumanGateOwner: Founder
HumanGateLevel: HG-2
FounderPrediction: GO_MIT_AUFLAGEN for non-prod validation if controller gates pass
FounderPredictionConfidence: 0.70
BlockedActions: merge, push, deploy, production write, schema/RLS/auth, public send, Linear Done
```

## Operating Layers

| Layer | Responsibility | Typical Actor | Output |
|---|---|---|---|
| Founder / HumanGate | Mission, taste, trust, capital, final risk acceptance | founder, delegated human | Go, no-go, priority, final gate |
| CEO / Orchestrator | Translate Founder intent into operating plan, ownership, dispatch and review | CEO agent, human operator | Strategy, sequence, delegation, decision surface |
| Controller / COO | Interpret intent, read ledger, split work, set gates, dispatch, review | Codex, human operator, scheduler | Controller plan, issue split, outcome verdict |
| C-level Owner | Own domain judgment and acceptance bar | CTO, CPO, CMO, COO, CFO, Legal/Compliance | Charter, acceptance criteria, tradeoffs |
| Worker | Execute one bounded task | Claude Code, Gemini, Codex worker, human | Report, patch, artifact, verification |
| Auditor | Challenge result against gates and CEO intent | Codex, Claude/Gemini audit, human reviewer | Findings, risk, pass/fail |

The controller may simulate a C-level role when no separate agent exists yet,
but the Linear issue must still name the role whose bar is being applied.

## State Machine

Use these logical states even when the underlying tool cannot model them
natively. Linear comments may carry the state during pilots.

| State | Meaning | Allowed Next Action |
|---|---|---|
| `intake` | Loose idea, request, report, or conversation fragment. | Read ledger and source of truth. |
| `mapped` | Existing issue, doc, memory, or owner is identified. | Decide whether work exists. |
| `insight` | A report produced a useful finding, but not yet execution shape. | Controller audit. |
| `controller-review` | Controller checks evidence, duplicates, gates and owner. | Plan, split, park, or ask CEO. |
| `plan-ready` | Work is sliced, but not approved for execution. | HumanGate or scheduled dispatch if pre-approved. |
| `human-gate` | CEO/founder judgment is required. | Go, no-go, park, rewrite, split further. |
| `dispatch-ready` | Issue has parseable contract and permission to run. | Worker lock and runtime auth. |
| `running` | One bounded worker is active. | Heartbeat, stop, wait, or controller intervention. |
| `worker-reported` | Worker returned output. | Controller review. |
| `needs-audit` | Sandbox worker changed files and reported back. | Controller branch audit. |
| `ready-for-human-review` | Controller accepts sandbox result but integration is gated. | Founder/CEO integration decision. |
| `verified` | Gates passed and controller accepts. | Mark done or dispatch dependent work. |
| `blocked` | Missing auth, source, gate, dependency, or permission. | Fix blocker or park. |
| `parked` | Valid but not active. | Revisit by date or trigger. |
| `done` | Acceptance criteria and gates are proven. | Memory/ledger closeout. |

Direct worker `Done` transitions are forbidden unless a specific policy grants
that autonomy.

## Linear Mapping

Parent issues are controller cases. Child issues are worker contracts.

Parent issue responsibilities:

- preserve original intent and source reports
- carry controller comments, locks, heartbeats and outcome synthesis
- list proposed child issues and human decisions
- stay open while child work is active or gates are unresolved

Child issue responsibilities:

- one outcome
- one owner layer
- one worker
- one workspace
- explicit include/exclude scope
- verifiable acceptance criteria
- gates and human gates
- reporting target
- dependency links

Do not create a child issue if the next action is only a memory note or a vague
idea. Do create one when there is concrete work, a blocker, a milestone, a
review obligation, or a status transition.

## Required Worker Control Fields

Every delegated issue should include:

```markdown
Layer: CEO | Controller | CTO | CPO | CMO | COO | CFO | Legal | Compliance | Worker
Role: short role name
RoleOwner: CEO | CTO | CPO | CMO | COO | CFO | QA-Eval | Controller | Legal-Gate | Founder
Department: Chief-of-Staff | Engineering | Product | Growth | Ops | Finance | QA-Eval | Governance
AccountableLayer: CEO | C-Level | Department | Worker | Controller | HumanGate
ReportsTo: CEO | Controller | Founder
AutonomyLevel: L0 | L1 | L2 | L3 | L4 | L5
Controller: codex | human | scheduler | other
DecisionOwner: CEO | CTO | CPO | CMO | COO | CFO | Legal | Compliance | Founder | human
Agent: claude | gemini | codex | human
Mode: audit | plan | implement | verify | research | report | review
Workspace: registry:<key> | /absolute/path
Dispatch: manual | scheduled
RunAt:
DependsOn:
Sandbox: none | required
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
ReviewVerdict:
AutonomyRecommendation:
AlwaysAllow:
RuntimeAuth:
EventPolicy:
EventSink:
EventTypes:
StateReducer:
WebhookPolicy:
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

`Layer`, `Role`, `RoleOwner`, `Controller`, and `DecisionOwner` make the issue
useful for CEO-level orchestration instead of only task tracking. `Agent`
controls runtime dispatch. `RoleOwner` controls accountability and report
routing.

`OutcomeSpec` turns acceptance criteria into a grader-ready definition of
done. `EventPolicy` makes state changes reducible without scraping prose.
`DreamPolicy` controls whether learnings become memory proposals. `SessionPolicy`
and `SubAgentRoster` control coordinator and parallel-agent work. `RuntimeAdapter`
keeps local CLI, Linear runner and later managed-agent execution behind the same
contract.

`EventPolicy` rows must follow
`docs/operations/agent-event-ledger.md`. The default reducer is
`issue-state-from-agent-events`, which derives worker state, controller state,
issue recommendation, merge state, human gate state and memory state from typed
events.

## C-level Role Defaults

Use these defaults until a workspace defines more specific charters.

| Role | Owns | Must Challenge |
|---|---|---|
| CTO | Architecture, code quality, data contracts, security, reliability | Is the implementation path safe, testable and reversible? |
| CPO | Product loop, UX, scope, customer value, acceptance criteria | Does this close the user workflow or only add surface area? |
| COO | Process, dependencies, sequencing, throughput, handoff quality | Is the execution path clear and operationally cheap? |
| CMO | Positioning, campaign, distribution, brand, public narrative | Is this ready for public/customer-facing use? |
| CFO | Budget, spend, pricing, business impact | Is spend approved and measurable? |
| Legal/Compliance | Legal, medical, privacy, regulated claims | Is this allowed to ship or publish? |

The controller may ask a worker to act as one of these roles for audit or plan
mode, but controller review remains mandatory before execution changes state.

## Night Insight Promotion Loop

Night work should not dump raw reports on the CEO. It should promote useful
findings into decision-ready work.

```text
1. Worker produces report or audit.
2. Controller reads the report and the ledger.
3. Controller decides:
   - no concrete work: memory/report only
   - duplicate: update existing issue
   - concrete work: split into parent/child issue contracts
   - risky work: stop at HumanGate
4. Controller assigns `OutcomeSpec`, `EventPolicy` and `DreamPolicy` before
   dispatch when the work is scheduled, long-running, memory-affecting or L3.
5. Controller may run one read-only verification worker.
6. Controller writes:
   - outcome comment
   - report path
   - proposed child issues
   - required Founder or CEO decision
7. Morning CEO brief surfaces only:
   - what changed
   - what is ready to dispatch
   - what is blocked
   - recommended next three actions
```

## Dispatch Rules

For L3 implementation, use
`docs/operations/sandbox-branch-lane.md` as the execution contract. An
edit-capable worker may only run in a deterministic sandbox branch and worktree:

```text
codex/sandbox/<workspace>/<YYYY-MM-DD>-<issue>-<worker>-<role-owner>-<task-slug>-<hhmmss>
<developer-root>/[SOURCE_WORKSPACE]/<workspace>/<YYYY-MM-DD>-<issue>-<worker>-<role-owner>-<task-slug>-<hhmmss>/
```

Successful worker output from this lane becomes `needs-audit`, not
`ready-for-review` and never `Done`. The controller audits the sandbox branch
before the Founder sees an integration decision.

If an agent reaches `max-turns`, classify the attempt as `scope-too-broad`
unless the logs show a runtime or tool blocker. Do not rerun the same broad
prompt; split it into a narrower worker issue or controller rework slice.

Worker report paths must be absolute paths. Relative raw-report paths are
invalid in controller summaries and Linear comments because source workspaces,
sandbox worktrees and Company.OS reports live in different roots.

Before dispatch:

- read the parent issue and latest comments
- check related existing issues to avoid duplicates
- verify source-of-truth paths exist
- check runtime auth for the target worker
- confirm GitNexus/index state for code workspaces
- post controller lock and heartbeat
- ensure only one worker owns the same scope

During dispatch:

- keep the worker bounded to the issue contract
- prefer read-only `audit`, `plan`, or `verify` for first pass
- do not let external workers write Linear directly unless explicitly allowed
- do not let workers write memory directly
- emit or record typed worker events in `metrics/agent-events.jsonl` when
  `EventPolicy` is present
- keep coordinator fan-out inside the approved `SubAgentRoster`
- keep raw reports in private/ignored report paths when they include internal
  context

After dispatch:

- controller reads raw report
- controller deduplicates findings
- controller posts outcome to Linear and records `controller.verdict`
- controller appends event rows and a backward-compatible run summary row
- controller converts memory learnings into proposals according to `DreamPolicy`
- controller decides next state: `verified`, `blocked`, `human-gate`, `parked`,
  or new child work

## Event Reducer

Controllers should reduce issue/session state from
`metrics/agent-events.jsonl` using `issue-state-from-agent-events`.

Reducer output is the source for:

- worker state and stale heartbeat detection
- controller state and next review action
- issue state recommendation
- sandbox merge gate
- human gate board
- memory proposal and dream review queue
- morning CEO brief dispatch board

For L3 sandbox work, a passing `controller.verdict` may only reduce to
`ready-for-human-review` while merge, push, deploy, production write or final
`Done` gates remain unresolved.

## HumanGate Defaults

Use the tiered gate model from
`docs/governance/agentic-sandbox-control-doctrine.md`.

HG-1 and HG-2 are CEO gates. A CEO delegate such as `Codex / GPT-5.5 xhigh` may
release them when:

- all listed gates pass
- no high-severity audit finding remains
- source-of-truth is explicit
- rollback or stop path is explicit
- `FounderPredictionConfidence >= 0.80` for HG-1
- `FounderPredictionConfidence >= 0.85` for HG-2
- blocked actions remain blocked in the release note

HG-3 is the CEO/Codex critical authority gate. Stop for CEO/Codex approval before
high-risk but reversible or restorable work:

- production writes with verified backup/rollback and bounded blast radius
- deploy/release or production merge with passing release validator
- schema, RLS, auth, service-role or live customer-impacting permission changes
  when a tested restore path exists
- direct `Done` transition for critical work with complete acceptance evidence
- ambiguous source-of-truth or unresolved high-severity audit findings that need
  cross-department CEO judgment

HG-4 is the Founder gate. Stop for Founder approval before:

- non-restorable deletion or mutation without verified backup/restore
- strategic direction, company identity, taste, trust boundary, capital
  allocation or final risk-tolerance decisions
- public founder-voice commitments, material legal/Rx/financial commitments,
  or autonomy-model changes that alter how the company operates

The controller should prepare HG-3 for CEO/Codex decision. It should prepare
HG-3.5 through EVE / Chief-of-Staff as founder-proxy review. Until EVE ships
in v0.7, Codex may simulate this tier by writing a read-only decision packet.
It should prepare HG-4 through the Chief-of-Staff / Founder-Proxy so the
Founder can approve, reject or modify it quickly.

## HumanGate Decision Brief

When a controller asks for a HumanGate release, the output must be a decision
card or brief, not a raw audit summary.

Write the brief in the configured founder/CEO decision language from the
Founder Decision Profile.

Use the smallest artifact that makes the decision safe:

- `HG-1 CEO Decision Card`: small, reversible decision. The CEO controller can
  answer in under one minute when confidence is high.
- `HG-2 CEO Decision Brief`: integration packet, user-data-adjacent dry-run,
  cross-workspace or meaningful but reversible product/risk tradeoff.
- `HG-3 CEO Critical Release Card`: high-risk but reversible production write,
  deploy/release, schema/RLS/auth/service-role change or critical Done decision.
- `HG-3.5 Chief-of-Staff / Founder-Proxy Packet`: translation, challenge and
  compression of CEO packets before founder attention.
- `HG-4 Founder Decision Dossier`: strategic direction, non-restorable action,
  company identity, material capital/legal exposure, founder-voice commitment or
  operating-model autonomy increase.

Every `HG-1+` gate must start with a machine-readable decision block:

```yaml
human_gate:
  level: HG-1 | HG-2 | HG-2.5 | HG-3 | HG-3.5 | HG-4
  requested_decision: GO | GO_MIT_AUFLAGEN | NO_GO | PARKEN
  controller_recommendation: ""
  founder_prediction: ""
  founder_prediction_confidence: 0.0
  consequence_if_go: ""
  consequence_if_no_go: ""
  consequence_if_wrong: ""
  reversible: true
  blocked_actions: []
  next_action_if_approved: ""
```

`founder_prediction_confidence` is not decoration. It is the controller saying
how sure it is that it understands the founder's decision style. Below `0.70`,
prefer a smaller reversible next step or ask a sharper question.

Required `HG-2+` brief shape:

- where we came from
- where we are now
- where we want to go
- what was learned
- which problems and hidden risks remain
- what the controller recommends
- what exactly is being approved and what remains blocked
- which protection layer, EvalGate, E2E/integration check and rollback path
  guard the next step
- one or more simple diagrams for non-trivial gates

Use `docs/templates/human-gate-decision-brief.md` as the canonical template.

The HumanGate artifact should reduce CEO work. It must make it possible to
answer with `GO`, `GO MIT AUFLAGEN`, `NO-GO`, or `PARKEN` without reading raw
worker logs. Repeated founder feedback from these gates should update controller
checklists, issue contracts, eval cases, founder-decision confidence and
autonomy recommendations.

Use `docs/templates/founder-decision-profile.md` to store generic decision
patterns and private implementation-local overlays to store company-specific
examples. The profile helps the controller predict what the founder would likely
approve, but it never releases production, legal, spend, merge, deploy or `Done`
gates by itself.

## Morning CEO Brief Addendum

Every morning brief should include a `Controller Dispatch Board`:

```markdown
## Controller Dispatch Board

| Candidate | Parent | Layer | Owner | Worker | State | CEO Decision |
|---|---|---|---|---|---|---|
| ... | ... | CTO | ... | claude | human-gate | approve edit mode? |

Recommended sequence:
1. ...
2. ...
3. ...

Do not start:
- ...
```

The brief should not ask the CEO to inspect raw worker output unless the raw
artifact is the decision surface.

## Pilot Translation Pattern

Use this pattern when a night report or worker audit produces a concrete
execution insight:

```text
PARENT-114 = controller parent
night worker report = insight
CEO/controller = controller
read-only agent = verification worker
Outcome = split into bounded child issues
HumanGate = product/data/risk decisions before edit mode
```

Recommended child mapping:

```text
PARENT-114a = CTO/Architecture: decision record and live-source verification
PARENT-114b = CTO/Backend: implementation tools after architecture gate
PARENT-114c = CPO/Product: user workflow/read model after backend contract
```

This is the intended morning pattern: the CEO approves the next slice, not the
entire raw backlog.

## Controller Self-Check

Before closing a controller turn, answer:

- Did I read the ledger before writing?
- Did I update an existing issue instead of creating a duplicate?
- Did I separate memory truth from executable work?
- Did I name the C-level owner and decision owner?
- Did I split broad work into bounded child contracts?
- Did I keep workers read-only unless edit mode was approved?
- If edit mode was approved, did I force the sandbox branch/worktree lane?
- Did I preserve human gates?
- Did I report enough for the CEO to make a fast decision?
- If I need a HumanGate, did I create a founder-readable decision brief instead
  of forcing raw audit interpretation?
