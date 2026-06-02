# ATLAS Marketing Ops Bridge Worker Contract

Use this template for the COO-side bridge from marketing cron/tool lanes to
Plane-owned, hardened execution.

## Plane Contract

```yaml
role: role:coo
parent_seat: role:cmo
agent: claude
mode: plan
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
RunAt: set concrete ISO timestamp before dispatch
DependsOn: [WORK_ITEM_ID]
scope:
  - Include: map marketing automations into Planner, Production, Radar, Analytics or Blog lanes.
  - Include: define hardening evidence, lane locks, Budget Brake, artifact truth and event-ledger requirements.
  - Exclude: executing workers or changing live automation state in this planning slice.
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
acceptance_criteria:
  - Map each current marketing automation to keep, pause, redesign or Plane-dispatch with reason.
  - Define hardened-lane evidence required before a run can be reported as autonomous success.
  - Emit scheduler follow-ups and blockers without writing Done or changing live state.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/atlas-marketing-ops-bridge-worker-contract.md --label role:coo --json
  - node scripts/orchestration/contract-controller.mjs --workspace companyos --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e --sequence [WORK_ITEM_ID] --mode dry-run --auth app-token --json
  - node scripts/runtime/hard-cron-wrapper.mjs --help
human_gate: HG-1
reporting: Plane worker.reported plus reports/marketing-department-v067/ops-bridge.md with automation map, hardening evidence, blockers, reflection and learning_proposals.
OutcomeArtifacts:
  - ${LOCAL_WORKSPACE}
AllowedReadPaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
AllowedWritePaths:
  - ${LOCAL_WORKSPACE}
BlockedActions: do not mark Plane Done; do not write Linear; do not execute workers; do not change automation state; do not report unhardened runs as autonomous success; do not write durable memory.
OutcomeSpec: Produce one COO bridge plan that turns cron/tool lanes into Plane-reportable marketing operations.
OutcomeRubric:
  - PASS only if every current marketing job is mapped or explicitly parked.
  - PASS only if hardened-lane evidence is concrete.
  - REJECT if cron remains the source of truth.
RuntimeAuth:
  - plane-app-token-read-ok
  - filesystem-read-ok
MaxRuntime: 30m
MaxSpend: EUR 0
KillSwitch: parent issue stop comment or CEO stop comment.
Heartbeat: Plane comment every 20m if running longer than one pass.
CapabilityProfile: claude-clevel-worker/coo/marketing-ops-bridge
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
