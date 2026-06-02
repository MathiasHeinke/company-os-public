# Worker Issue Contract

Use this template for Claude, Gemini, Codex, and human worker issues.

**Phase 1 (current):** Plane is the canonical execution ledger. Linear is a
read-only legacy + bounded bridge mirror until the migration cohort is done.
See `docs/orchestration/plane-first-linear-bridge.md`. Pre-migration items
written to Linear remain valid as historical contracts; new items are written
to Plane.

This contract is the minimum parseable shape a scheduler, orchestrator,
dispatcher, or human controller can rely on.

## Spec-to-Worker Rule

For new projects, MVPs, cross-workspace features and major product surfaces,
use `docs/orchestration/spec-to-worker-pipeline.md` before worker dispatch.
GitHub Spec Kit / `specify` patterns may shape the thinking (`constitution`,
`spec.md`, `plan.md`, `tasks.md`, checklists), but they are not execution
contracts by themselves.

Every Spec Kit task or project-plan task must be normalized into the fenced
flat Worker Issue Contract below before `plane-dispatcher-v0`, Runtime
Dispatcher v1, Claude Code, Codex CLI, Gemini CLI or a human worker may start.
Plane remains canonical; Spec Kit artifacts are source-of-truth inputs linked
from the Plane item.

## Plane Dispatcher Parseability Rule

Every Plane work item intended for `plane-dispatcher-v0` MUST include one
fenced contract block in its description:

````markdown
```yaml
role: role:coo
parent_seat: role:coo
agent: claude
mode: implement
workspace: companyos
dispatch: ready
source_of_truth:
  - /absolute/source/path.md
acceptance_criteria:
  - One verifiable outcome.
gates:
  - command or review gate
human_gate: HG-1
reporting: Plane worker.reported with changed files, commands, results and blockers.
BlockedActions: never print secrets; do not merge, deploy, freeze, write Linear, or mark Done unless the contract explicitly authorizes it.
```
````

The dispatcher validator is deliberately simple and fail-closed:

- the block must be fenced as `yaml`, `worker-issue-contract`, or `contract`
- required keys must live at column 0 as flat `key: value` entries
- required keys MUST be lowercase snake_case identifiers (`role`,
  `parent_seat`, `agent`, `mode`, `workspace`, `dispatch`,
  `source_of_truth`, `acceptance_criteria`, `gates`, `human_gate`,
  `reporting`). The parser regex only matches identifier characters
  (`[a-zA-Z_][a-zA-Z0-9_]*`) and lowercases the captured key before
  matching against the required set, so a label written as
  `Acceptance Criteria:` (capitalized, space-separated, prose-style)
  does NOT satisfy the required `acceptance_criteria` machine key —
  the line is skipped by the parser and the validator rejects with
  `contract.required-field-missing`.
- capitalized display labels (`Acceptance Criteria`, `Source Of Truth`,
  `Human Gate`, etc.) are prose-only outside the fenced contract block
  and never substitute for the required machine keys inside it. The
  same applies to PascalCase (`AcceptanceCriteria:`) and any other
  non-snake_case spelling.
- list values may use indented `- item` rows below a flat key
- do **not** wrap the fields under `worker_issue_contract:`,
  `contract:`, `metadata:`, or any other nested parent key
- do **not** rely on prose near the contract to satisfy required fields

If this shape is not present, the dispatcher rejects with
`contract.required-field-missing` and the worker must not lock or begin work.
Indented `key: value` continuations under a parent block (such as
`worker_issue_contract:`, `contract:`, `metadata:`, or a legacy nested
`human_gate:`) are rejected with `contract.fields-wrapped-in-parent-block`,
which calls out the wrapper directly instead of leaving the operator to guess
which required field is missing.

Plane stores rich-text descriptions as TipTap-rendered HTML. The validator
strips the HTML wrapper and decodes named, decimal, and hex entities
(`&quot;`, `&#39;`, `&#x27;`) before parsing, so a Markdown fence pasted
through the Plane UI round-trips intact. Run
`node scripts/orchestration/worker-ledger-validator.mjs --examples` (or
`--examples --json`) for the canonical Markdown shape, the Plane HTML
round-trip shape, and the nested-wrapper shapes that REJECT.

## Stage 0.5 Contract Controller Rule

Parseable is not enough. Before `plane-dispatcher-v0` may lock a `ready`
contract, `scripts/orchestration/contract-controller.mjs` must post a fresh
`controller.contract-review` comment with `verdict: CONTRACT_PASS` for the
current description hash.

The Contract Controller checks the quality of the handoff:

- SourceOfTruth is concrete
- Scope has include/exclude boundaries
- Acceptance Criteria are verifiable
- Gates are executable or named controller gates
- Spec/Plan/Tasks, checklist, harness or eval artifacts are present when the
  task is major, multi-agent, product-surface, scheduler/runtime or
  cross-workspace work
- runtime fields are present for `ready`/`scheduled` Claude/Codex/Gemini work
- `CapabilityProfile`, `Sandbox`, `AllowedWritePaths`, `BlockedActions`,
  `OutcomeSpec`, `OutcomeRubric`, reporting and subagent policy are strong
  enough for the declared mode
- HG-3/high-risk reversible surfaces are escalated to CEO/Codex before worker
  dispatch; HG-4 strategic/non-restorable surfaces go to Founder via
  Chief-of-Staff

Stable verdicts:

- `CONTRACT_PASS`
- `CONTRACT_PATCH_REQUIRED`
- `SPEC_REQUIRED`
- `SPLIT_REQUIRED`
- `CEO_GATE_REQUIRED`
- `FOUNDER_GATE_REQUIRED`
- `REJECT`

Any description edit after a PASS makes the review stale. Rerun Stage 0.5
before dispatch.

## Stage 0.6 Remediation Routing Rule

If Stage 0.5 does not PASS, do not send the weak item to a worker and do not
escalate every failure to CEO/Founder. Run
`scripts/orchestration/contract-remediation-router.mjs` and post
`controller.remediation-routed`.

Default remediation path:

```text
Contract Controller -> owning C-Level seat -> CEO -> Chief-of-Staff -> Founder
```

- missing/weak fields, missing gates, missing Spec/Plan/Tasks and broad scope
  are repaired by the owning `role:*` C-Level seat
- CEO handles missing owner, missing source truth, priority conflicts and
  decisions the C-Level cannot make
- CEO handles HG-3 critical decisions after the C-Level prepares a reversible
  release package with rollback/restore evidence
- Founder handles only HG-4 strategic or non-restorable decisions after CEO and
  Chief-of-Staff prepare a concrete decision card

## Stage 0.65 Runtime Executability Gate

`CONTRACT_PASS` is necessary but no longer sufficient for dispatcher lock.
Between Stage 0.5 and Stage 1 the scheduler and Runtime Dispatcher v1 each run
`evaluateRuntimeExecutability` in
`scripts/orchestration/contract-controller.mjs` and require
`verdict: RUNTIME_READY_PASS` before lock/spawn. The same evaluator backs the
`controller.runtime-ready` Plane comment posted by the scheduler.

The gate is static (no fetch, no spawn) and only runs for `Dispatch: ready` or
`Dispatch: scheduled` items with a runtime `Agent` (`claude`, `codex`,
`gemini`). It rejects the [WORK_ITEM_ID]/305 failure classes:

- `runtime-ready.capability-profile-unregistered` — `CapabilityProfile` must
  exist in `registries/capabilities/company-os.json`.
- `runtime-ready.depends-on-unparseable` — `DependsOn` must be empty, a Plane
  short reference (e.g. `[WORK_ITEM_ID]`) or a UUID; free-text such as
  `parent-workspace-stewardship` is rejected.
- `runtime-ready.outcome-artifact-not-absolute` — at least one entry in
  `Reporting` or `OutcomeArtifacts` must be an absolute path (e.g.
  `/Users/.../reports/runs/<name>.md`).
- `runtime-ready.allowed-read-paths-missing-source` /
  `runtime-ready.allowed-read-paths-missing-gate` — absolute paths used in
  `SourceOfTruth` and `Gates` must be covered by `AllowedReadPaths`,
  `Workspace` or `AllowedWritePaths`. Dispatcher-owned report/stream/metrics
  paths are handled separately and need no additional read-scope declaration.
- `runtime-ready.claude-tool-result-read` — the contract must not reference
  Claude internal tool-result storage (`~/.claude/projects/`,
  `.claude/sessions`, `tool_use_result`, etc.).

Bounded Claude workers inherit no global MCP connectors by default. Runtime
Dispatcher v1.2 passes an explicit built-in `--tools` list and a strict empty
MCP config unless a later CapabilityProfile deliberately declares a connector
profile. Contract authors must not rely on whatever Gmail/Supabase/Vercel/etc.
MCP tools happen to be visible in an interactive Claude session.

The scheduler emits `decision: lock-blocked-runtime-not-ready` and refuses to
lock/spawn until the contract is repaired and Stage 0.65 returns
`RUNTIME_READY_PASS`. A re-run of the Runtime Dispatcher v1 dry-run will
mirror that verdict in `preflights[].runtime_executability` with reason code
`runtime.executability-blocked`.

## Required Fields

```markdown
Layer: CEO | Controller | CTO | CPO | CMO | COO | CFO | Legal | Compliance | Worker
Role: short role name
RoleLabel: role:cto | role:cpo | role:cmo | role:coo | role:cfo | role:cao
ParentSeat: role:cto | role:cpo | role:cmo | role:coo | role:cfo | role:cao | none
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
RunAt: YYYY-MM-DD HH:mm Europe/Berlin
DependsOn:
Sandbox: none | required
BranchName:
WorktreeRoot:
IntegrationTarget:
TargetClass: report-only | main-integrated | production-deployed
SourceOfTruth:
Scope:
AllowedWritePaths:
Acceptance Criteria:
Gates:
OutcomeSpec:
OutcomeRubric:
OutcomeMaxIterations:
OutcomeGrader: controller | separate-agent | human | managed-agent-grader
OutcomePassThreshold:
OutcomeArtifacts:
ReviewVerdict:
AutonomyRecommendation:
AlwaysAllow:
RuntimeAuth:
RuntimePermissionMode: plan | default | auto | acceptEdits | dontAsk
InferenceClass: auto | P0-doc-small | P1-code-bounded | P2-code-shared | P3-cross-repo | P4-high-risk
RuntimeAgent: auto | claude | codex | gemini | openrouter | human
RuntimeModel:
RuntimeModelAlias:
InferenceBudget: low | standard | high | xhigh | max-context | multi-proposal
ContextProfile:
ContextPack:
DomainReadPack:
SplitPolicy: single-worker | worker-plus-controller-audit | primary-worker-plus-sidecar-audit | parallel-proposal | parallel-execution | no-autonomous-spawn
PrimaryRuntime: auto | claude | codex | gemini | openrouter | human
FallbackRuntime: none | auto | claude | codex | gemini | openrouter | human
SecondaryAuditor: none | auto | claude | codex | gemini | openrouter | human
RouteReason: explicit | inferred | pool-capacity | cost-ceiling | context-window | risk-gate
PoolPolicy: none | prefer-free-lane | fail-closed-when-primary-unavailable
CostCeiling: none | low | standard | high | explicit-max-spend
GateExecutionPolicy: worker-runs-declared-gates | controller-only | audit-only
AllowedClaudeTools:
EventPolicy:
EventSink: linear-comment | metrics-jsonl | webhook | managed-agent-events
EventTypes:
StateReducer:
WebhookPolicy:
DreamPolicy: none | proposal-only | controller-approved | managed-agent-output-review
MemoryStore:
MemoryUpdatePolicy: none | proposal-only | controller-approved
ReflectionPolicy: none | required
LearningProposalPolicy: none | required
SessionPolicy:
Coordinator:
SubAgentRoster:
SharedFilesystem: none | sandbox-worktree | managed-container
ContextIsolation:
CapabilityProfile:
WorkerClass:
PostWorkerQualityPolicy:
QualityLoopMaxHotfixRounds:
QualityLoopPreviousHotfixRounds:
RuntimeAdapter: local-cli | linear-runner | managed-agent
ManagedAgentCompatibility: local-only | adapter-ready | managed-agent-pilot
HumanGate:
HumanGateLevel: HG-0 | HG-1 | HG-2 | HG-2.5 | HG-3 | HG-3.5 | HG-4
HumanGateOwner:
hg35_pause_artifact:
hg35_resume_sign:
DecisionMode: AUTO-GO | DELEGATE | SELF-FIX | ASK-FOUNDER | REJECT | PARK
CEOConfidence:
AutoGoReason:
ReleaseAuthority: none | CEO_AUTONOMOUS | FOUNDER_REQUIRED
RollbackPlan:
RollbackVerification:
BlastRadius:
CAOVerdict:
FounderPrediction:
FounderPredictionConfidence:
BlockedActions:
Reporting:
MaxRuntime:
MaxTurns:
MaxCommits:
MaxSpend:
KillSwitch:
Heartbeat:
```

## Rules

- `Dispatch: manual` is the default.
- `RunAt` is empty unless the CEO, founder, or scheduler policy explicitly
  approves scheduling.
- `Layer` names the operating layer whose bar the worker serves.
- `Role` names the C-level/controller role applied to the work.
- `RoleLabel` is the Plane routing label. **Required for every Plane work
  item.** Exactly one of `role:cto`, `role:cpo`, `role:cmo`, `role:coo`,
  `role:cfo`, `role:cao`. The dispatcher rejects items without a single
  `role:*` label per `docs/orchestration/plane-role-routing.md`.
- `ParentSeat` is the `role:*` of the parent work item for cross-role child
  items. `none` for top-level items. Used by the dispatcher to verify the
  parent/child seat relationship before lock.
- `RoleOwner` names the accountable management role. It is required for every
  active Company.OS/control-plane issue.
- `Department`, `AccountableLayer`, `ReportsTo` and `AutonomyLevel` make the
  management context parseable for scheduler and morning brief.
- `Controller` names who will lock, dispatch, review and close the loop.
- `DecisionOwner` names who must approve unresolved judgment calls.
- `Agent` is the runtime executor, not the management owner.
- `RoleOwner` and `DecisionOwner` must use generic role names in reusable
  Company.OS docs. Private installs may alias these to named people or named
  agents in local implementation files.
- `Workspace` must resolve through the active workspace registry or use an
  absolute path.
- `InferenceClass` is optional. Omit it or set `auto` for normal routing.
  Runtime Dispatcher v1.2 consults
  `docs/orchestration/runtime-inference-router.md` and
  `registries/inference/company-os.json` to select the minimum sufficient
  model and max-turn fallback before spawn. Use an explicit class only when
  CEO/Controller wants to force a route.
- `RuntimeAgent`, `RuntimeModel`, `RuntimeModelAlias`, `InferenceBudget`,
  `ContextProfile`, `ContextPack`, `DomainReadPack`, `SplitPolicy`,
  `PrimaryRuntime`, `FallbackRuntime`, `SecondaryAuditor`, `RouteReason`,
  `PoolPolicy` and `CostCeiling` are the optional multi-inference routing vocabulary from
  `docs/orchestration/multi-inference-c-level-runtime.md`. They may express
  route intent or constraints, but the effective route is still emitted by the
  Runtime Inference Router and enforced by the dispatcher.
- `ContextPack` names the boot-pack class; `DomainReadPack` names the bounded
  domain files a strong worker is expected to read before acting. Domain read
  packs should be wider than write scope for integration work. They must not
  include secrets, browser cookies, raw customer data or private founder
  context.
- A Plane contract saying `Agent: codex` or `Agent: gemini` does not by itself
  authorize autonomous primary dispatch. Non-Claude runtimes need audited
  adapter support, matching CapabilityProfile, runtime auth sentinel, CAO
  compatibility and cost/stream/scope handling before live use.
- `Sandbox: required` is mandatory for every `Mode: implement` worker at L3.
- `BranchName` must follow
  `codex/sandbox/<workspace>/<YYYY-MM-DD>-<issue>-<worker>-<role-owner>-<task-slug>-<hhmmss>`
  when sandbox work is allowed.
- `WorktreeRoot` must normally be
  `<developer-root>/[SOURCE_WORKSPACE]/`.
- `IntegrationTarget` names the intended base branch or integration issue.
- `TargetClass` declares what Plane `Done` means for this item per
  `docs/orchestration/supergoal-execution-ladder.md`: `report-only`
  (Done at `CONTROLLER_AUTO_GO`, no main/prod change), `main-integrated`
  (Done only at `INTEGRATED_MAIN`, Codex/CEO authority), or
  `production-deployed` (Done only at `DEPLOYED_PROD`,
  Codex/Founder/Release-Gate authority). Optional; when present the validator
  rejects unknown values with `contract.unknown-target-class`. The Execution
  Ledger reflects integration truth, not agent success: a worker may progress
  an item only up to `CAO_PASS_HG2`; integration and release stages are
  reserved.
- `SourceOfTruth` must include concrete paths, issue IDs, docs, or commands.
- `Scope` must include both include and exclude boundaries.
- `AllowedWritePaths` should list machine-checkable file or directory paths
  for edit-capable runtime workers. If omitted, Runtime Dispatcher v1.2 tries
  to derive path-like tokens from `Scope`; if neither path exists, live scope
  guard runs in advisory mode and does not kill the worker.
- `Acceptance Criteria` must be verifiable.
- `Gates` must list commands, review gates, or human gates.
- Executable gates must be single commands run from the declared `Workspace`
  or sandbox worktree. Do not use shell composition such as `cd ... && ...`;
  the runtime allowlist intentionally treats that shape as unsafe.
- Goal-loop gates may call only `node scripts/goal/goal.mjs run`,
  `node scripts/goal/goal.mjs adapt`, or
  `node scripts/goal/goal.mjs synthesize`. Broad `goal.mjs*` allowances are
  forbidden because `materialize --apply` can mutate Plane drafts.
- `OutcomeSpec` names what "done" means; it is required for scheduled,
  long-running, multiagent or L3 work.
- `OutcomeRubric`, `OutcomeGrader`, `OutcomePassThreshold` and
  `OutcomeArtifacts` define how the work is graded. Use
  `docs/harnesses/canonical-agent-review-harness.md` for review semantics.
- `ReviewVerdict` and `AutonomyRecommendation` must follow the canonical
  harness. Do not use autonomy recommendations as work verdicts.
- `AlwaysAllow` must list routine in-scope actions the scheduler may execute
  without extra per-run approval.
- `RuntimeAuth` must list required CLI/connector auth checks before dispatch.
- `RuntimePermissionMode` must match the local runtime. For Claude Code
  workers with machine-checkable `AllowedWritePaths` and active scope guards,
  prefer `acceptEdits`. Use `plan` only for harnesses that explicitly account
  for Claude scratch reads and never rely on it to authorize product writes.
- `RuntimeBrowserAuth` is required for browser-/UI-bound work. Allowed values:
  `none`, `forbidden`, `browser-connector`, `operator-shared-session`.
  `RuntimeAuth` and Plane app-token access do not count as browser auth. If
  the contract requires `browser-connector` or `operator-shared-session`, the
  Runtime Dispatcher must prove that lane before worker spawn or stop with
  `BLOCKED_AUTH`. Browser-auth proof is redacted connector evidence only; never
  include cookies, tokens, passwords, authorization headers or session IDs.
- `EventPolicy` is required for scheduled, live-ledger, long-running or
  webhook-capable work.
- `EventSink`, `EventTypes` and `StateReducer` must make the work reducible
  without scraping prose comments.
- `metrics-jsonl` event rows must follow
  `docs/operations/agent-event-ledger.md`; copyable examples live in
  `docs/templates/agent-event-row.md`.
- `StateReducer` should normally be `issue-state-from-agent-events`.
- `DreamPolicy` defaults to `none`; use `proposal-only` or
  `controller-approved` when the worker may surface memory, SOP, skill,
  harness or knowledge improvements.
- `ReflectionPolicy: required` is mandatory for Claude C-level worker runs,
  scheduled workers, multiagent work and any work with `DreamPolicy` other than
  `none`. The single `worker.reported` comment must include a structured
  `reflection:` block.
- Every `worker.reported` MUST include `WorkerConfidence:` (a `0.0`-`1.0`
  self-assessed probability that the reported result is correct AND ready for its
  claimed stage/disposition) and a one-line `WorkerConfidenceBasis:` stating what
  evidence supports it. This is the worker's own signal, distinct from and an input
  to the controller-side `CEOConfidence` / `FounderPredictionConfidence`; it informs
  gates (a worker claiming HG-2.5 eligibility carries `>= 0.92`, HG-3 `>= 0.96`) but
  NEVER overrides a hard gate (access-control / secrets / prod / Done stay gated at
  any confidence). The controller records claimed-vs-outcome over runs to surface
  over-confidence. See `docs/orchestration/confidence-reporting-contract.md`;
  validated by `validateWorkerReportedConfidence` in `worker-ledger-validator.mjs`.
- `LearningProposalPolicy: required` is mandatory for Claude C-level worker
  runs and any work with `DreamPolicy` other than `none`. The report must
  include `learning_proposals:`. Proposal-only means no durable memory, SOP,
  skill, workflow or harness change happens until controller/CEO review.
- `SessionPolicy` and `SubAgentRoster` are required before a coordinator can
  spawn, delegate to, or parallelize specialist agents.
- When `SubAgentRoster` is non-empty, the worker MUST emit a structured
  `subagents:` block inside its single `worker.reported` Plane comment per
  `docs/orchestration/subagent-reporting-contract.md`. Required keys per
  subagent: `name`, `scope`, `verdict` (PASS / REJECT / PARTIAL), and at
  least one of `files_changed` or `commands_run`. The CAO REJECTs the run
  with stable codes `subagent.report-missing`,
  `subagent.report-incomplete`, `subagent.report-out-of-roster`,
  `subagent.report-budget-exceeded`, `subagent.role-cao-forbidden`, or
  `subagent.report-duplicate-name` if the block is missing or invalid.
- When `SubAgentRoster` is `none` or empty, the worker MUST still emit
  an explicit empty `subagents: []` line inside its single
  `worker.reported` Plane comment. The empty array is a positive
  declaration that no subagents ran; it is not optional. A missing
  `subagents:` key under a `none`/empty roster is still a CAO REJECT
  (`subagent.report-missing`), and any non-empty entries under that
  condition are a `subagent.report-out-of-roster` REJECT per
  `docs/orchestration/subagent-reporting-contract.md`.
- Subagents only run inside a locked Plane work item; never recursively;
  never spawned by the controller or CAO.
- `SharedFilesystem` must be explicit for multiagent work. Shared filesystem
  never means shared write scope.
- `CapabilityProfile` names the rules, knowledge, skills, workflows, personas
  and harnesses available to the worker.
- `WorkerClass` is optional for normal C-level workers and required for
  post-worker quality follow-ups. Valid v0 lower-worker values are
  `quality-auditor`, `security-auditor`, `bug-regression-auditor`,
  `deep-audit-worker` and `hotfix-worker`; see
  `docs/orchestration/post-worker-quality-loop.md`.
- `PostWorkerQualityPolicy` is `post-worker-quality-loop/v0` when a worker is
  spawned from a `controller.audit-followup` or `controller.hotfix-request`
  marker. The router is
  `scripts/orchestration/post-worker-quality-loop-core.mjs` and the policy
  registry is `registries/quality/post-worker-quality-loop.json`.
- `QualityLoopMaxHotfixRounds` and `QualityLoopPreviousHotfixRounds` make the
  loop limit parseable. The v0 default is at most one autonomous bounded
  hotfix round for `P1-code-bounded`; `P2`, `P3` and `P4` require CEO/Codex or
  human-gate delegation before a hotfix worker can run.
- For `Agent: claude` C-level worker runs, `CapabilityProfile` must also name
  allowed plugins, connectors, commands, skills, subagents, Honcho workspace
  boundaries, staleness rule and forbidden tools per
  `docs/orchestration/claude-clevel-worker-runtime.md`. Runtime Dispatcher v1
  validates it through `registries/capabilities/company-os.json` before spawn.
- `RuntimeAdapter` names the execution backend. `local-cli` and
  `linear-runner` are default-safe; `managed-agent` requires an adapter pilot
  and human gate.
- `HumanGate` must name the exact decision that stops the worker.
- `HumanGateLevel` calibrates both authority and artifact size: `HG-0` no
  human gate, `HG-1` CEO decision card, `HG-2` CEO decision brief, `HG-2.5`
  CEO autonomous release card, `HG-3` CEO/Codex critical release card,
  `HG-3.5` Chief-of-Staff / Founder-Proxy review artifact, `HG-4` Founder
  decision dossier. The canonical
  enum is documented in `docs/governance/human-gate-levels.md`; the
  validator rejects unknown levels with `contract.unknown-human-gate-level`.
- `HumanGateOwner` must name the role that can release the gate. HG-1/HG-2
  and HG-2.5 default to `CEO`; HG-3 defaults to `CEO/Codex`; HG-3.5 defaults
  to `Chief-of-Staff` or `Founder-Proxy`; HG-4 defaults to `Founder`.
- `hg35_pause_artifact` is the relative path the worker will produce when
  pausing at `HG-3.5`. It is required when `HumanGateLevel` is `HG-3.5`
  and is rejected with `contract.hg35-pause-artifact-missing` otherwise.
  Per `docs/governance/human-gate-levels.md`, the worker emits exactly
  one `worker.reported` with `state: NEEDS_HUMAN`, `reason:
  hg35-pause-pending`, and an `hg35:` block. CAO PARKs the run with
  `cao.hg35-awaiting-sign` while the Chief-of-Staff / Founder-Proxy reviews
  the artifact.
- `hg35_resume_sign` is the Plane comment id of the Chief-of-Staff / proxy sign on
  the pause artifact. It is empty at lock time and is filled in only
  after the proxy pastes a sign template into the work item.
- `DecisionMode` records the CEO/controller action: `AUTO-GO`, `DELEGATE`,
  `SELF-FIX`, `ASK-FOUNDER`, `REJECT`, or `PARK`.
- `CEOConfidence` is the controller's own confidence score for the decision.
- `AutoGoReason` is required when `DecisionMode: AUTO-GO`.
- `ReleaseAuthority: CEO_AUTONOMOUS` is required for `HG-2.5`.
- `ReleaseAuthority: CEO_CRITICAL` is required for `HG-3`.
- `RollbackPlan`, `RollbackVerification`, `BlastRadius` and `CAOVerdict` are
  required for `HG-2.5` and `HG-3`.
- A CEO delegate such as `Codex / GPT-5.5 xhigh` may release HG-1/HG-2 only
  when the issue gates pass, source-of-truth is explicit, rollback/stop path is
  named, no high-severity audit finding remains, and
  `FounderPredictionConfidence` is at least `0.80` for HG-1 or `0.85` for
  HG-2.
- A CEO delegate may release HG-2.5 when `FounderPredictionConfidence >= 0.92`,
  CAO/controller verdict is PASS, rollback is verified or trivial, blast radius
  is low/medium/staged/canary, budget and Artifact Truth pass, and the requested
  action is a bounded merge/push/deploy/production-write/public-publish/Done
  action. Schema/RLS/auth/service-role, regulated claims, material spend,
  risky production data, live outreach and L4/L5 autonomy increase escalate to
  HG-3 unless they are strategic or non-restorable.
- A CEO delegate may release HG-3 when `FounderPredictionConfidence >= 0.96`,
  `ReleaseAuthority: CEO_CRITICAL`, CAO/controller verdict is PASS,
  rollback/backup/snapshot/restore evidence is verified, and the action is
  bounded and reversible/restorable.
- `FounderPrediction` states what the controller expects the founder or gate
  owner to choose.
- `FounderPredictionConfidence` is a 0.0-1.0 estimate. Below `0.70`, the
  controller must narrow the ask, choose a smaller reversible next step, or run
  read-only audit before asking for broad approval.
- `BlockedActions` lists actions that remain forbidden even if the next gate is
  approved. A go for the next step is not a go for merge, release, production,
  spend, public send, schema/RLS/auth, memory writes or `Done`.
- HG-4 remains Founder-owned. Strategic direction, non-restorable data loss,
  major legal/capital exposure, founder-voice public commitments, company
  identity/taste decisions and unresolved hidden founder-liability findings
  must not be released by the CEO delegate alone.
- `Reporting` must name where the worker reports back. Report paths must be
  absolute paths, not repo-relative paths, so controllers can find raw artifacts
  across workspaces and sandbox worktrees. If a contract gives an absolute
  report directory ending in `/`, Runtime Dispatcher v1.2 normalizes it to
  `<directory>/<run_id>.md`; prefer explicit `.md` paths for human-authored
  contracts.
- `MaxSpend` defaults to `EUR 0` unless explicitly approved.
- `MaxTurns` is the runtime's internal agent turn budget. For Claude Opus
  4.7 Max implementation workers, use 120 unless a smaller audit-only scope
  is intentional. The dispatcher clamps values above 200 and falls back to the
  CLI default if the field is malformed.
- `KillSwitch` is required for scheduled or long-running work.
- `Heartbeat` is required for scheduled or long-running work.
- Claude Opus 4.7 Max / 1M audit contracts must not mark the worker stuck,
  retry, or dispatch a duplicate before 300 seconds have elapsed. For deep or
  cross-repo audits, 600+ seconds before useful output is normal. Default
  `MaxRuntime` is 900 seconds for normal audits and 1800 seconds for
  deep/cross-repo audits unless the contract explicitly narrows the scope.
- Scheduled automations without `AlwaysAllow` are invalid, because they require
  a human operator to babysit work that was meant to run unattended.
- Scheduled worker issues that depend on Claude, Gemini, Codex, Upload-Post or
  another CLI/connector without a `RuntimeAuth` sentinel are invalid.

## Claude Audit Worker Example

```markdown
Layer: CTO
Role: Engineering Audit
RoleOwner: CTO
Department: Engineering
AccountableLayer: C-Level
ReportsTo: Controller
AutonomyLevel: L2
Controller: codex
DecisionOwner: CEO
Agent: claude
Mode: audit
Workspace: registry:company-os
Dispatch: manual
RunAt:
DependsOn: COS-98
Sandbox: none
BranchName:
WorktreeRoot:
IntegrationTarget:
SourceOfTruth:
- /path/to/company-os/docs/governance/directives.md
- /path/to/company-os/docs/plans/bughunt-portfolio-spec.md
Scope:
- Include: Company.OS directives and bughunt launch gates.
- Exclude: code edits, Linear writes, memory writes, public publishing, spend.
Acceptance Criteria:
- Markdown report with severity, evidence, recommendation, and human decision.
Gates:
- Read-only Claude Code run.
- No file edits.
- Controller review required before launch.
OutcomeSpec:
- Produce a markdown audit report with severity, evidence, recommendation and
  exact human decision.
OutcomeRubric:
- Uses the canonical agent review harness.
OutcomeMaxIterations: 1
OutcomeGrader: controller
OutcomePassThreshold: ReviewVerdict PASS or NEEDS_HUMAN with exact gate
OutcomeArtifacts:
- Absolute report path.
ReviewVerdict:
AutonomyRecommendation:
AlwaysAllow:
- Read source-of-truth docs and local workspace files.
- Read parent/worker issue state and comments.
- Post lock, heartbeat, outcome and blocker comments.
- Write private/raw reports and append run-ledger rows.
- Run the bounded read-only Claude audit command named by this issue.
RuntimeAuth:
- `claude -p "Return exactly: CLAUDE_AUTH_OK" --model opus --permission-mode plan --output-format text --max-turns 1`
- Expected output: `CLAUDE_AUTH_OK`.
EventPolicy: required
EventSink: linear-comment | metrics-jsonl
EventTypes:
- worker.locked
- worker.heartbeat
- worker.reported
- controller.verdict
StateReducer: issue-state-from-agent-events
WebhookPolicy: none
DreamPolicy: proposal-only
MemoryStore: none
MemoryUpdatePolicy: proposal-only
SessionPolicy: single-worker
Coordinator: Controller
SubAgentRoster: none
SharedFilesystem: none
ContextIsolation: required
CapabilityProfile: engineering-audit
RuntimeAdapter: local-cli
ManagedAgentCompatibility: adapter-ready
HumanGate:
- Stop before production writes, public publishing, spend, edit mode, direct
  Done transition, autonomy increase, or any 12-hour portfolio launch not
  already approved by the parent issue.
HumanGateLevel: HG-2
HumanGateOwner: CEO
FounderPrediction: GO_MIT_AUFLAGEN if the report is read-only, scoped, and leaves irreversible actions blocked
FounderPredictionConfidence: 0.70
BlockedActions:
- edit mode
- production writes
- public publishing
- spend
- autonomy increase
- Linear Done
Reporting:
- Comment summary to parent Linear issue; raw report path under
  `/absolute/path/to/company-os/reports/private/...`.
MaxRuntime: 60m; first stuck/retry check no earlier than 300s; expect 600s+ for Opus 4.7 Max / 1M deep audits
MaxCommits: 0
MaxSpend: EUR 0
KillSwitch: parent issue #stop
Heartbeat: 15m scheduler heartbeat
```

## Claude Sandbox Implement Worker Example

```markdown
Layer: CTO
Role: Backend Implementation
RoleOwner: CTO
Department: Engineering
AccountableLayer: C-Level
ReportsTo: CEO
AutonomyLevel: L3
Controller: codex
DecisionOwner: CEO
Agent: claude
Mode: implement
Workspace: registry:product-api
Dispatch: manual
RunAt:
DependsOn: COS-144
Sandbox: required
BranchName: codex/sandbox/product-api/2026-05-07-cos-145-claude-cto-backend-slice-113500
WorktreeRoot: <developer-root>/[SOURCE_WORKSPACE]/
IntegrationTarget: product-api main after controller audit and HumanGate
SourceOfTruth:
- COS-145
- /absolute/path/to/company-os/reports/night-shift/YYYY-MM-DD/backend-slice-verification.md
Scope:
- Include: bounded backend implementation named by the worker issue.
- Exclude: production DB apply, merge, push, deploy, memory writes, Linear Done.
Acceptance Criteria:
- Code changes are limited to the approved scope and pass named gates.
Gates:
- GitNexus status before work.
- GitNexus detect-changes after work.
- Repo-specific tests named by the issue.
- Controller audit of sandbox branch.
OutcomeSpec:
- Implement only the approved backend slice inside the sandbox worktree.
OutcomeRubric:
- Scope discipline, gate discipline, evidence quality and handoff quality from
  the canonical agent review harness.
OutcomeMaxIterations: 2
OutcomeGrader: controller
OutcomePassThreshold: ReviewVerdict PASS or NEEDS_HUMAN with residual risk
OutcomeArtifacts:
- Sandbox branch.
- Worktree path.
- Changed files list.
- Test/gate output summary.
ReviewVerdict:
AutonomyRecommendation:
AlwaysAllow:
- Read source-of-truth docs and workspace files.
- Edit files only inside the sandbox worktree.
- Run local tests and static checks inside the sandbox worktree.
RuntimeAuth:
- Claude auth sentinel from docs/operations/runtime-auth-preflight.md.
EventPolicy: required
EventSink: linear-comment | metrics-jsonl
EventTypes:
- worker.locked
- sandbox.created
- worker.heartbeat
- worker.reported
- controller.audit_started
- controller.verdict
StateReducer: issue-state-from-agent-events
WebhookPolicy: none
DreamPolicy: proposal-only
MemoryStore: none
MemoryUpdatePolicy: proposal-only
SessionPolicy: single-worker-sandbox
Coordinator: Controller
SubAgentRoster: none
SharedFilesystem: sandbox-worktree
ContextIsolation: required
CapabilityProfile: backend-implementation
RuntimeAdapter: local-cli
ManagedAgentCompatibility: local-only
HumanGate:
- Stop before merge, push, deploy, production writes, schema/RLS/auth changes,
  memory writes, direct Done transition or scope expansion.
HumanGateLevel: HG-2
HumanGateOwner: CEO
FounderPrediction: GO_MIT_AUFLAGEN for controller-audited non-prod validation, not for integration
FounderPredictionConfidence: 0.70
BlockedActions:
- merge
- push
- deploy
- production writes
- schema/RLS/auth
- memory writes
- direct Done transition
- scope expansion
Reporting:
- Comment branch, worktree, changed files, commands/results and unresolved risks
  to the Linear issue with absolute report paths; controller appends run-ledger
  row.
MaxRuntime: 90m
MaxCommits: 1 sandbox commit max, no push
MaxSpend: EUR 0
KillSwitch: issue #stop
Heartbeat: 15m scheduler heartbeat
```

## Invalid Worker Issue Shapes

Invalid:

- missing `Workspace`
- missing `Agent` or `Mode`
- broad "do everything" scope
- no source-of-truth
- scheduled automation issue missing `AlwaysAllow`
- scheduled worker issue missing `RuntimeAuth` for required CLIs/connectors
- no human gate for production, spend, public, medical/legal/Rx, or `Done`
- human gate missing `HumanGateLevel`, `HumanGateOwner`, `BlockedActions` or
  a controller recommendation/prediction for `HG-1+`
- scheduled work without heartbeat and kill switch
- worker allowed to self-promote or mark itself done
- missing C-level owner, controller or decision owner for cross-functional work
- `Mode: implement` without `Sandbox: required`, deterministic `BranchName`,
  `WorktreeRoot`, controller audit and human integration gate
- scheduled, long-running, multiagent or L3 work missing `OutcomeSpec`
- scheduled or live-ledger work missing `EventPolicy`
- work that may create SOP, skill, harness, eval or memory learnings without
  `DreamPolicy` / `MemoryUpdatePolicy`
- coordinator or parallel-agent work missing `SessionPolicy` and
  `SubAgentRoster`
- managed-agent execution without `RuntimeAdapter`, compatibility state and
  human-gated adapter pilot
