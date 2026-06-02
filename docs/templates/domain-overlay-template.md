# Domain Overlay Template

Status: public generic template
Last updated: 2026-05-16
Use for: creating a new domain overlay for C-level workers on a specific
client product routed through Plane and Company.OS

This template is a starting point. Copy it, rename it to reflect your domain
(e.g. `[company]-worker-templates.md`), and replace all `[CLIENT_*]`
placeholders before use. Keep the Company.OS productization note in the
file header.

## Placeholders

| Placeholder | Replace with |
|---|---|
| `[CLIENT_PRODUCT]` | Your product name (e.g. "Acme OS") |
| `[CLIENT_DESKTOP_ROOT]` | Env var for your desktop/web workspace root |
| `[CLIENT_APP_ROOT]` | Env var for your backend/app workspace root |
| `[CLIENT_DASHBOARD_ROOT]` | Env var for your dashboard/command-center workspace root |
| `[CLIENT_WEBSITE_ROOT]` | Env var for your website/growth workspace root |
| `[DOMAIN_*]` | Domain-specific product area names |

## Productization Note

These templates are internal examples for one domain overlay. They demonstrate
the required contract density for C-level workers, but they are not shipped as
a client-default template without replacing the workspace map, domain
assumptions, capability profile IDs and claim boundaries.

Rules:

- Keep the contract flat at column 0. Do not wrap it under `contract:` or
  `worker_issue_contract:`.
- Use `dispatch: ready` only when the item is actually ready for scheduler or
  controller dispatch.
- Claude C-level workers must include `ReflectionPolicy: required`,
  `LearningProposalPolicy: required`, `CapabilityProfile`, `RuntimeAuth` and
  `OutcomeRubric`.
- `Done` remains CEO/Codex/Founder authority. Workers report evidence only.

## CTO Desktop Control-Plane Audit

Use for `${CLIENT_DESKTOP_ROOT}` audits: what exists, what is wired, what is
fake, what must be kept, what must be cut and what becomes the
[CLIENT_PRODUCT] MVP surface.

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: audit
workspace: ${CLIENT_DESKTOP_ROOT}
dispatch: ready
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/domain-claude-c-level-boot-contract-template.md
  - ${CLIENT_DESKTOP_ROOT}/AGENTS.md
  - ${COMPANY_OS_ROOT}/docs/templates/worker-issue-contract.md
acceptance_criteria:
  - Evidence-mapped audit of current [CLIENT_PRODUCT] desktop/web control-plane readiness exists in a report artifact.
  - Report separates FACT, INFERENCE and HYPOTHESIS claims.
  - Report lists keep/cut/build decisions for MVP with file evidence.
  - Report proposes follow-up Plane worker contracts for missing work.
gates:
  - git status --short
  - rg -n "MCP|integration|simulation|prediction" .
  - git diff --check
human_gate: HG-2
reporting: Plane worker.reported with boot_context_proof, capability_context_proof, evidence_map, reflection, learning_proposals, report path and follow-up contracts.
Layer: CTO
RoleName: [CLIENT_PRODUCT] desktop control-plane auditor
RoleLabel: role:cto
ParentSeat: role:cto
RoleOwner: CTO
Department: Engineering
AccountableLayer: C-Level
ReportsTo: CEO
AutonomyLevel: L1
Controller: codex
DecisionOwner: CTO
Sandbox: none
AllowedWritePaths:
  - reports/[client]/
OutcomeSpec: Produce a source-grounded [CLIENT_PRODUCT] desktop MVP audit that can drive autonomous implementation planning.
OutcomeRubric:
  - PASS only if every major claim has file evidence or is marked HYPOTHESIS.
  - PASS only if keep/cut/build decisions are actionable.
  - REJECT if the report invents live capability without source evidence.
OutcomeMaxIterations: 1
OutcomeGrader: controller
OutcomePassThreshold: PASS
OutcomeArtifacts:
  - reports/[client]/<timestamp>-desktop-control-plane-audit.md
AlwaysAllow:
  - read repo files
  - run rg
  - run git status
  - run git diff --check
RuntimeAuth:
  - claude-max-oauth-ok
  - filesystem-read-ok
  - gitnexus-read-ok
RuntimePermissionMode: plan
GateExecutionPolicy: worker-runs-declared-gates
AllowedClaudeTools:
  - Read
  - Glob
  - Grep
  - LS
  - Bash(git status*)
  - Bash(git diff --check*)
  - Bash(rg *)
EventPolicy: metrics-jsonl
EventSink: metrics-jsonl
EventTypes:
  - worker.started
  - worker.reported
StateReducer: issue-state-from-agent-events
DreamPolicy: proposal-only
MemoryStore: honcho-company
MemoryUpdatePolicy: proposal-only
ReflectionPolicy: required
LearningProposalPolicy: required
SessionPolicy: no-subagents
Coordinator: false
SubAgentRoster: none
SharedFilesystem: none
ContextIsolation: target-workspace-only
CapabilityProfile: claude-clevel-worker/cto/client-desktop
RuntimeAdapter: local-cli
ManagedAgentCompatibility: local-only
HumanGateLevel: HG-2
HumanGateOwner: CEO
DecisionMode: DELEGATE
ReleaseAuthority: none
RollbackPlan: no product changes
RollbackVerification: no rollback required
BlastRadius: read-only audit
CAOVerdict: pending
BlockedActions: never print secrets, never write private data, never push, never deploy, never mark Plane Done, never change production systems.
MaxRuntime: 1800s
MaxTurns: 30
MaxCommits: 0
MaxSpend: controller-budget
KillSwitch: controller stops worker on scope drift or secret exposure risk
Heartbeat: every 300s for long audits
```

## CTO Backend And Edge Function Audit

Use for `${CLIENT_APP_ROOT}` backend, Supabase, Edge Function, MCP, interaction
and simulation-adjacent work.

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: audit
workspace: ${CLIENT_APP_ROOT}
dispatch: ready
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/domain-claude-c-level-boot-contract-template.md
  - ${CLIENT_APP_ROOT}/AGENTS.md
  - ${COMPANY_OS_ROOT}/docs/templates/worker-issue-contract.md
acceptance_criteria:
  - Evidence-mapped backend audit identifies existing Edge Functions, data models, MCP paths, interaction engines and simulation-adjacent modules.
  - Report identifies which backend surfaces can support the 14-day [CLIENT_PRODUCT] MVP without production-risk changes.
  - Report lists missing data contracts and gates for simulation claims.
gates:
  - git status --short
  - rg -n "edge function|supabase|mcp|interaction|simulation" .
  - git diff --check
human_gate: HG-2
reporting: Plane worker.reported with boot_context_proof, capability_context_proof, evidence_map, reflection, learning_proposals, backend map and follow-up contracts.
Layer: CTO
RoleName: [CLIENT_PRODUCT] backend auditor
RoleLabel: role:cto
ParentSeat: role:cto
RoleOwner: CTO
Department: Engineering
AccountableLayer: C-Level
ReportsTo: CEO
AutonomyLevel: L1
Controller: codex
DecisionOwner: CTO
Sandbox: none
AllowedWritePaths:
  - reports/[client]/
OutcomeSpec: Produce a source-grounded backend readiness map for [CLIENT_PRODUCT] simulation and data-ingestion MVP planning.
OutcomeRubric:
  - PASS only if Edge Functions and data contracts are mapped with file paths.
  - PASS only if simulation claims are separated from currently implemented capability.
  - REJECT if raw secrets, env values or private data appear in the report.
OutcomeMaxIterations: 1
OutcomeGrader: controller
OutcomePassThreshold: PASS
OutcomeArtifacts:
  - reports/[client]/<timestamp>-backend-edge-function-audit.md
AlwaysAllow:
  - read repo files
  - run rg
  - run git status
  - run git diff --check
RuntimeAuth:
  - claude-max-oauth-ok
  - filesystem-read-ok
  - supabase-readonly-ok
  - gitnexus-read-ok
RuntimePermissionMode: plan
GateExecutionPolicy: worker-runs-declared-gates
AllowedClaudeTools:
  - Read
  - Glob
  - Grep
  - LS
  - Bash(git status*)
  - Bash(git diff --check*)
  - Bash(rg *)
EventPolicy: metrics-jsonl
EventSink: metrics-jsonl
EventTypes:
  - worker.started
  - worker.reported
StateReducer: issue-state-from-agent-events
DreamPolicy: proposal-only
MemoryStore: honcho-company
MemoryUpdatePolicy: proposal-only
ReflectionPolicy: required
LearningProposalPolicy: required
SessionPolicy: no-subagents
Coordinator: false
SubAgentRoster: none
SharedFilesystem: none
ContextIsolation: target-workspace-only
CapabilityProfile: claude-clevel-worker/cto/client-backend
RuntimeAdapter: local-cli
ManagedAgentCompatibility: local-only
HumanGateLevel: HG-2
HumanGateOwner: CEO
DecisionMode: DELEGATE
ReleaseAuthority: none
RollbackPlan: no product changes
RollbackVerification: no rollback required
BlastRadius: read-only audit
CAOVerdict: pending
BlockedActions: never print secrets, never write private data, never push, never deploy, never mark Plane Done, never alter schema, RLS, auth or service-role behavior.
MaxRuntime: 1800s
MaxTurns: 30
MaxCommits: 0
MaxSpend: controller-budget
KillSwitch: controller stops worker on scope drift or secret exposure risk
Heartbeat: every 300s for long audits
```

## CPO Domain Hypothesis And MVP Scope

Use for narrowing the [CLIENT_PRODUCT] thesis into one investor-readable MVP
promise, with explicit evidence boundaries.

```yaml
role: role:cpo
parent_seat: role:cpo
agent: claude
mode: plan
workspace: ${COMPANY_OS_ROOT}
dispatch: ready
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/domain-claude-c-level-boot-contract-template.md
  - ${COMPANY_OS_ROOT}/docs/templates/domain-overlay-template.md
  - ${COMPANY_OS_ROOT}/docs/templates/worker-issue-contract.md
acceptance_criteria:
  - MVP scope defines one primary user promise, one demo path and one data loop.
  - Domain hypothesis is expressed as falsifiable product claims with required data inputs.
  - Plan states which parts are open layer, closed engine, future engine and marketing narrative.
gates:
  - git status --short
  - git diff --check
human_gate: HG-2
reporting: Plane worker.reported with boot_context_proof, capability_context_proof, evidence_map, reflection, learning_proposals and MVP scope artifact.
Layer: CPO
RoleName: [CLIENT_PRODUCT] simulation MVP planner
RoleLabel: role:cpo
ParentSeat: role:cpo
RoleOwner: CPO
Department: Product
AccountableLayer: C-Level
ReportsTo: CEO
AutonomyLevel: L2
Controller: codex
DecisionOwner: CPO
Sandbox: none
AllowedWritePaths:
  - docs/product/
  - reports/[client]/
OutcomeSpec: Produce a controller-reviewable MVP scope that converts [CLIENT_PRODUCT] strategy into buildable work.
OutcomeRubric:
  - PASS only if the MVP can be explained in one sentence.
  - PASS only if required user inputs and engine outputs are explicit.
  - REJECT if scope tries to be every use case at once.
OutcomeMaxIterations: 1
OutcomeGrader: controller
OutcomePassThreshold: PASS
OutcomeArtifacts:
  - reports/[client]/<timestamp>-simulation-mvp-scope.md
AlwaysAllow:
  - read Company.OS docs
  - run git status
  - run git diff --check
RuntimeAuth:
  - claude-max-oauth-ok
  - filesystem-read-ok
RuntimePermissionMode: plan
GateExecutionPolicy: worker-runs-declared-gates
AllowedClaudeTools:
  - Read
  - Glob
  - Grep
  - LS
  - Bash(git status*)
  - Bash(git diff --check*)
EventPolicy: metrics-jsonl
EventSink: metrics-jsonl
EventTypes:
  - worker.started
  - worker.reported
StateReducer: issue-state-from-agent-events
DreamPolicy: proposal-only
MemoryStore: honcho-company
MemoryUpdatePolicy: proposal-only
ReflectionPolicy: required
LearningProposalPolicy: required
SessionPolicy: no-subagents
Coordinator: false
SubAgentRoster: none
SharedFilesystem: none
ContextIsolation: company-os-docs-only
CapabilityProfile: claude-clevel-worker/cpo/runtime
RuntimeAdapter: local-cli
ManagedAgentCompatibility: local-only
HumanGateLevel: HG-2
HumanGateOwner: CEO
DecisionMode: DELEGATE
ReleaseAuthority: none
RollbackPlan: docs-only rollback via git diff
RollbackVerification: git diff --check
BlastRadius: product scope docs only
CAOVerdict: pending
BlockedActions: never make regulated claims, never publish public copy, never mark Plane Done, never change production systems.
MaxRuntime: 1200s
MaxTurns: 24
MaxCommits: 0
MaxSpend: controller-budget
KillSwitch: controller stops worker on scope drift
Heartbeat: every 300s for long planning
```

## CMO Website Claim Audit

Use for `${CLIENT_WEBSITE_ROOT}` messaging: product claim, investor narrative,
target-group sharpness and public-risk boundaries.

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: audit
workspace: ${CLIENT_WEBSITE_ROOT}
dispatch: ready
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/domain-claude-c-level-boot-contract-template.md
  - ${CLIENT_WEBSITE_ROOT}/AGENTS.md
  - ${COMPANY_OS_ROOT}/docs/templates/worker-issue-contract.md
acceptance_criteria:
  - Website claim audit maps current public claims to file paths.
  - Report identifies which claims can be stronger, which need evidence and which should stay deferred.
  - Report proposes [CLIENT_PRODUCT] landing-page narrative blocks without regulated public claims.
gates:
  - git status --short
  - rg -n "simulation|prediction|digital twin|AI|compliance|medical|legal" .
  - npm run build
  - git diff --check
human_gate: HG-2.5
reporting: Plane worker.reported with boot_context_proof, capability_context_proof, evidence_map, reflection, learning_proposals, claim table and recommended copy direction.
Layer: CMO
RoleName: [CLIENT_PRODUCT] website claim auditor
RoleLabel: role:cmo
ParentSeat: role:cmo
RoleOwner: CMO
Department: Growth
AccountableLayer: C-Level
ReportsTo: CEO
AutonomyLevel: L1
Controller: codex
DecisionOwner: CMO
Sandbox: none
AllowedWritePaths:
  - reports/[client]/
OutcomeSpec: Produce a claim-safe but aggressive [CLIENT_PRODUCT] website narrative audit.
OutcomeRubric:
  - PASS only if each claim is mapped to current copy or marked as proposed.
  - PASS only if medical-risk language is flagged rather than normalized.
  - REJECT if the report suggests publishing unverified regulated claims.
OutcomeMaxIterations: 1
OutcomeGrader: controller
OutcomePassThreshold: PASS
OutcomeArtifacts:
  - reports/[client]/<timestamp>-website-claim-audit.md
AlwaysAllow:
  - read repo files
  - run rg
  - run npm run build
  - run git status
  - run git diff --check
RuntimeAuth:
  - claude-max-oauth-ok
  - filesystem-read-ok
RuntimePermissionMode: plan
GateExecutionPolicy: worker-runs-declared-gates
AllowedClaudeTools:
  - Read
  - Glob
  - Grep
  - LS
  - Bash(git status*)
  - Bash(git diff --check*)
  - Bash(npm run build*)
  - Bash(rg *)
EventPolicy: metrics-jsonl
EventSink: metrics-jsonl
EventTypes:
  - worker.started
  - worker.reported
StateReducer: issue-state-from-agent-events
DreamPolicy: proposal-only
MemoryStore: honcho-company
MemoryUpdatePolicy: proposal-only
ReflectionPolicy: required
LearningProposalPolicy: required
SessionPolicy: no-subagents
Coordinator: false
SubAgentRoster: none
SharedFilesystem: none
ContextIsolation: target-workspace-only
CapabilityProfile: claude-clevel-worker/cmo/client-website
RuntimeAdapter: local-cli
ManagedAgentCompatibility: local-only
HumanGateLevel: HG-2.5
HumanGateOwner: CEO
DecisionMode: DELEGATE
ReleaseAuthority: none
RollbackPlan: no product changes
RollbackVerification: no rollback required
BlastRadius: read-only marketing audit
CAOVerdict: pending
BlockedActions: never publish, never deploy, never make regulated claims, never contact investors, never mark Plane Done.
MaxRuntime: 1200s
MaxTurns: 24
MaxCommits: 0
MaxSpend: controller-budget
KillSwitch: controller stops worker on claim-risk drift
Heartbeat: every 300s for long audits
```

## Codex Implementation Child

Use after a Claude or Codex audit produces a narrow implementation target.

```yaml
role: role:cto
parent_seat: role:cto
agent: codex
mode: implement
workspace: ${CLIENT_DESKTOP_ROOT}
dispatch: ready
source_of_truth:
  - <audit-report-path>
  - ${COMPANY_OS_ROOT}/docs/orchestration/domain-claude-c-level-boot-contract-template.md
  - ${COMPANY_OS_ROOT}/docs/templates/worker-issue-contract.md
acceptance_criteria:
  - Implementation matches the accepted audit scope and touches only declared write paths.
  - Tests or build gates pass, or blockers are documented with command output.
  - Controller can review a small diff with clear rollback.
gates:
  - npm run build
  - npm run lint
  - git diff --check
human_gate: HG-2.5
reporting: Plane worker.reported with changed files, commands, gate output, blockers, rollback notes and follow-up risk.
Layer: CTO
RoleName: [CLIENT_PRODUCT] implementation worker
RoleLabel: role:cto
ParentSeat: role:cto
RoleOwner: CTO
Department: Engineering
AccountableLayer: Worker
ReportsTo: Controller
AutonomyLevel: L3
Controller: codex
DecisionOwner: CTO
Sandbox: required
BranchName: codex/sandbox/<workspace>/<yyyy-mm-dd>-<issue>-codex-cto-<task>-<hhmmss>
WorktreeRoot: ${SANDBOX_ROOT}/
IntegrationTarget: main
AllowedWritePaths:
  - <exact-file-or-directory>
OutcomeSpec: Implement one accepted [CLIENT_PRODUCT] MVP slice with bounded write scope.
OutcomeRubric:
  - PASS only if scope is narrow and gates are run.
  - PASS only if changed files match AllowedWritePaths.
  - REJECT if implementation expands into unrelated redesign.
OutcomeMaxIterations: 2
OutcomeGrader: controller
OutcomePassThreshold: PASS
OutcomeArtifacts:
  - git diff
AlwaysAllow:
  - read repo files
  - edit declared paths
  - run declared gates
RuntimeAuth:
  - filesystem-read-ok
  - sandbox-filesystem-write-ok
RuntimePermissionMode: auto
GateExecutionPolicy: worker-runs-declared-gates
AllowedClaudeTools:
  - none
EventPolicy: metrics-jsonl
EventSink: metrics-jsonl
EventTypes:
  - worker.started
  - worker.reported
StateReducer: issue-state-from-agent-events
DreamPolicy: proposal-only
MemoryStore: none
MemoryUpdatePolicy: proposal-only
ReflectionPolicy: required
LearningProposalPolicy: required
SessionPolicy: no-subagents
Coordinator: false
SubAgentRoster: none
SharedFilesystem: sandbox-worktree
ContextIsolation: target-workspace-only
RuntimeAdapter: local-cli
ManagedAgentCompatibility: local-only
HumanGateLevel: HG-2.5
HumanGateOwner: CEO
DecisionMode: SELF-FIX
ReleaseAuthority: none
RollbackPlan: revert sandbox branch or drop worktree
RollbackVerification: git status --short
BlastRadius: declared write paths only
CAOVerdict: pending
BlockedActions: never push, never merge, never deploy, never mark Plane Done, never alter production schema, RLS, auth or service-role behavior.
MaxRuntime: 2400s
MaxTurns: 40
MaxCommits: 0
MaxSpend: controller-budget
KillSwitch: controller stops worker on scope drift or failing gates outside task scope
Heartbeat: every 300s for long implementation
```
