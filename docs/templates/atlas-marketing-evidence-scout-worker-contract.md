# ATLAS Marketing Evidence Scout Worker Contract

Use this template for paper, article and community-signal intake. The worker
creates topic cards, not finished posts.

## Plane Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: research
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
RunAt: set concrete ISO timestamp before dispatch
DependsOn: [WORK_ITEM_ID]
scope:
  - Include: convert selected sources into ATLAS marketing topic cards.
  - Include: extract concrete values, ranges, timelines, caveats and evidence class.
  - Exclude: individual advice, sourcing guidance and external actions.
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
acceptance_criteria:
  - Emit at least three topic cards with source anchor, evidence class, numeric fact payload, caveat and recommended lane.
  - Separate source fact, editorial inference, community signal and blocked wording.
  - Report parked sources with the specific reason: weak evidence, no reader utility, too sensitive or duplicate topic.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/atlas-marketing-evidence-scout-worker-contract.md --label role:cmo --json
  - node scripts/orchestration/contract-controller.mjs --workspace companyos --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e --sequence [WORK_ITEM_ID] --mode dry-run --auth app-token --json
  - CAO evidence audit before first Planner consumption.
human_gate: HG-1
reporting: Plane worker.reported plus reports/marketing-department-v067/evidence-scout.md with topic cards, source classes, blockers, reflection and learning_proposals.
OutcomeArtifacts:
  - ${LOCAL_WORKSPACE}
AllowedReadPaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
AllowedWritePaths:
  - ${LOCAL_WORKSPACE}
BlockedActions: do not mark Plane Done; do not write Linear; do not write durable memory; do not create public copy; do not provide individual instructions; do not hide evidence limitations.
OutcomeSpec: Produce source-backed topic cards that raise information density without overstating claims.
OutcomeRubric:
  - PASS only if every card has a concrete fact payload and caveat.
  - PASS only if preclinical or community evidence is explicitly labeled.
  - REJECT if output is vibe-only, unsupported or framed as individual action.
RuntimeAuth:
  - plane-app-token-read-ok
  - filesystem-read-ok
MaxRuntime: 45m
MaxSpend: EUR 0
KillSwitch: parent issue stop comment or CEO stop comment.
Heartbeat: Plane comment every 20m if running longer than one pass.
CapabilityProfile: claude-clevel-worker/cmo/marketing-evidence-scout
RuntimeAdapter: local-cli
RuntimePermissionMode: plan
InferenceClass: P1-code-bounded
GateExecutionPolicy: worker-runs-declared-gates
DreamPolicy: proposal-only
MemoryUpdatePolicy: proposal-only
ReflectionPolicy: required
LearningProposalPolicy: required
SessionPolicy: no-subagents
SubAgentRoster: none
```
