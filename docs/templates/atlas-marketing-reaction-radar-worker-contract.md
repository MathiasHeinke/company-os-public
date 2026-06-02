# ATLAS Marketing Reaction Radar Worker Contract

Use this template to convert noisy reaction jobs into a scored digest and
draft-only reply desk.

## Plane Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: report
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
RunAt: set concrete ISO timestamp before dispatch
DependsOn: [WORK_ITEM_ID]
scope:
  - Include: redesign reaction watchers as scored radar input and thresholded digest.
  - Include: propose reply drafts with evidence, tone and exact approval need.
  - Exclude: sending replies, creating alert spam and self-polling work.
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
acceptance_criteria:
  - Classify jobs 139, 140, 141 and 142 as paused, keep, throttle, redesign or remove with reason.
  - Convert public post URLs into raw public-visible events only; no replies, likes or external actions.
  - Define scoring dimensions for reaction value, risk, urgency and reply-worthiness.
  - Emit a draft-only reply format and daily digest format that suppresses low-value noise.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/atlas-marketing-reaction-radar-worker-contract.md --label role:cmo --json
  - node scripts/orchestration/contract-controller.mjs --workspace companyos --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e --sequence [WORK_ITEM_ID] --mode dry-run --auth app-token --json
  - Check docs/operations/automation-registry.md before changing any automation state.
human_gate: HG-1
reporting: Plane worker.reported plus reports/marketing-department-v067/reaction-radar.md with job classification, scoring, digest examples, blockers, reflection and learning_proposals.
OutcomeArtifacts:
  - ${LOCAL_WORKSPACE}
AllowedReadPaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
AllowedWritePaths:
  - ${LOCAL_WORKSPACE}
BlockedActions: do not mark Plane Done; do not write Linear; do not send external replies; do not change automation state; do not write durable memory; do not create high-frequency alert loops.
OutcomeSpec: Produce a reaction radar design that reduces noise and preserves high-value response opportunities.
OutcomeRubric:
  - PASS only if low-value events are suppressed by threshold.
  - PASS only if reply drafts are clearly draft-only and approval-gated.
  - REJECT if the design creates another loud dispatcher.
RuntimeAuth:
  - plane-app-token-read-ok
  - filesystem-read-ok
  - tinyfish-mcp-oauth-ok-or-report-BLOCKED_AUTH
MaxRuntime: 30m
MaxSpend: EUR 0
KillSwitch: parent issue stop comment or CEO stop comment.
Heartbeat: Plane comment every 20m if running longer than one pass.
CapabilityProfile: claude-clevel-worker/cmo/marketing-reaction-radar
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
