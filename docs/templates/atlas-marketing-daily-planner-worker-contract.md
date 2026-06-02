# ATLAS Marketing Daily Planner Worker Contract

Use this template for the CMO assignment desk. The worker does not create
public content. It converts signals into bounded lane assignments.

## Plane Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: plan
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
RunAt: set concrete ISO timestamp before dispatch
DependsOn: [WORK_ITEM_ID]
scope:
  - Include: build one daily CMO assignment board for ATLAS marketing.
  - Include: score topic candidates by evidence, reader utility, platform fit and gate level.
  - Exclude: public content creation, distribution actions and durable memory writes.
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
acceptance_criteria:
  - Report at least five scored topic candidates with evidence class, reader value, lane recommendation and gate level.
  - Select exactly three assignments across Case File, editorial image post and Blog Engine when enough evidence exists.
  - Emit a CEO-readable report path and one Plane worker.reported comment with blockers and next dispatch recommendations.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/atlas-marketing-daily-planner-worker-contract.md --label role:cmo --json
  - node scripts/orchestration/contract-controller.mjs --workspace companyos --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e --sequence [WORK_ITEM_ID] --mode dry-run --auth app-token --json
  - CAO review of assignment rubric before scheduled use.
human_gate: HG-1
reporting: Plane worker.reported plus reports/marketing-department-v067/daily-planner.md with candidates, selected assignments, blockers, reflection and learning_proposals.
OutcomeArtifacts:
  - ${LOCAL_WORKSPACE}
AllowedReadPaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
AllowedWritePaths:
  - ${LOCAL_WORKSPACE}
BlockedActions: do not mark Plane Done; do not write Linear; do not send external posts or replies; do not alter live cadence; do not write durable memory; do not create broad duplicate work items.
OutcomeSpec: Produce one daily CMO assignment board that can feed bounded GROW worker items.
OutcomeRubric:
  - PASS only if every selected assignment has a lane, source anchor, evidence class and expected user value.
  - PASS only if weak topics are parked with a concrete reason.
  - REJECT if assignments are generic, product-centric or not gate-aware.
RuntimeAuth:
  - plane-app-token-read-ok
  - filesystem-read-ok
MaxRuntime: 30m
MaxSpend: EUR 0
KillSwitch: parent issue stop comment or CEO stop comment.
Heartbeat: Plane comment every 20m if running longer than one pass.
CapabilityProfile: claude-clevel-worker/cmo/marketing-daily-planner
RuntimeAdapter: local-cli
RuntimePermissionMode: plan
RuntimeModelAlias: opus
InferenceBudget: max-context
ContextProfile: cross-workspace-boot-pack
ContextPack: atlas-marketing-department-intelligence-v0
InferenceClass: P3-cross-repo
GateExecutionPolicy: worker-runs-declared-gates
DreamPolicy: proposal-only
MemoryUpdatePolicy: proposal-only
ReflectionPolicy: required
LearningProposalPolicy: required
SessionPolicy: no-subagents
SubAgentRoster: none
```
