# ATLAS Marketing Claim Safety Worker Contract

Use this template to review public framing before a marketing artifact leaves
draft mode. The worker should preserve useful specificity while blocking unsafe
or unsupported framing.

## Plane Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: review
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
RunAt: set concrete ISO timestamp before dispatch
DependsOn: [WORK_ITEM_ID]
scope:
  - Include: classify ATLAS marketing statements by source fact, inference, community signal or blocked wording.
  - Include: preserve source-backed numbers, caveats and evidence class.
  - Exclude: individual advice, vendor guidance and external actions.
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
acceptance_criteria:
  - Review at least one draft artifact or topic card and classify every sensitive statement.
  - Return allowed wording, revise wording and blocked wording with reasons.
  - Escalate sensitive release-class changes to CEO/founder decision card instead of silently approving.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/atlas-marketing-claim-safety-worker-contract.md --label role:cmo --json
  - node scripts/orchestration/contract-controller.mjs --workspace companyos --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e --sequence [WORK_ITEM_ID] --mode dry-run --auth app-token --json
  - CAO review of first three example cards before scheduled use.
human_gate: HG-2
reporting: Plane worker.reported plus reports/marketing-department-v067/claim-safety.md with reviewed statements, verdicts, escalations, blockers, reflection and learning_proposals.
OutcomeArtifacts:
  - ${LOCAL_WORKSPACE}
AllowedReadPaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
AllowedWritePaths:
  - ${LOCAL_WORKSPACE}
BlockedActions: do not mark Plane Done; do not write Linear; do not write durable memory; do not make individual recommendations; do not provide sourcing, vendor, compounding, titration, cycle or self-injection guidance; do not approve unsupported claims.
OutcomeSpec: Produce one framing verdict that keeps useful facts concrete and bounded.
OutcomeRubric:
  - PASS only if useful source-backed facts remain concrete.
  - PASS only if caveats and evidence class are visible.
  - REJECT if the copy either overclaims or becomes vague meta commentary.
RuntimeAuth:
  - plane-app-token-read-ok
  - filesystem-read-ok
MaxRuntime: 30m
MaxSpend: EUR 0
KillSwitch: parent issue stop comment or CEO stop comment.
Heartbeat: Plane comment every 20m if running longer than one pass.
CapabilityProfile: claude-clevel-worker/cmo/marketing-claim-safety
RuntimeAdapter: local-cli
RuntimePermissionMode: plan
InferenceClass: P2-code-shared
GateExecutionPolicy: worker-runs-declared-gates
DreamPolicy: proposal-only
MemoryUpdatePolicy: proposal-only
ReflectionPolicy: required
LearningProposalPolicy: required
SessionPolicy: no-subagents
SubAgentRoster: none
```
