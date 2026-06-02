# ATLAS Marketing Distribution Manager Worker Contract

Use this template for platform packaging, Upload-Post dry-runs, cadence checks
and cancel-path evidence. It does not create the content artifact itself.

## Plane Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: verify
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
RunAt: set concrete ISO timestamp before dispatch
DependsOn:
scope:
  - Include: verify X, LinkedIn and blog distribution payloads for one target date.
  - Include: check media attachment, cadence, release card fit, remote preflight and cancel path.
  - Exclude: content rewriting and external posting outside the approved lane.
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
acceptance_criteria:
  - Verify platform payloads include intended media, public copy and platform-specific limits.
  - Report Upload-Post dry-run and remote-preflight result with absolute artifact paths.
  - Emit schedule, revise or park recommendation with exact blocker and cancel path.
gates:
  - cd ${LOCAL_WORKSPACE} && npm run marketing:plan -- --date YYYY-MM-DD --days 14 --cadence growth
  - cd ${LOCAL_WORKSPACE} && npm run marketing:schedule -- --date YYYY-MM-DD --remote-preflight
  - cd ${LOCAL_WORKSPACE} && git diff --check
  - node ${LOCAL_WORKSPACE} --description-file ${LOCAL_WORKSPACE} --label role:cmo --json
human_gate: HG-2.5
reporting: Plane worker.reported plus reports/marketing-department-v067/distribution-manager.md with payload paths, preflight state, cancel path, blockers, reflection and learning_proposals.
OutcomeArtifacts:
  - ${LOCAL_WORKSPACE}
AllowedReadPaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
AllowedWritePaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
BlockedActions: do not mark Plane Done; do not write Linear; do not send external posts or replies outside release card; do not alter live cadence; do not overwrite content artifacts; do not write durable memory.
OutcomeSpec: Produce one distribution verification report and schedule-ready or park recommendation.
OutcomeRubric:
  - PASS only if platform payloads and media are present and fresh.
  - PASS only if preflight and cancel path are explicit.
  - NEEDS_HUMAN if the lane exceeds release card, cadence or claim boundary.
RuntimeAuth:
  - upload-post-preflight-ok
  - tinyfish-mcp-oauth-ok-or-report-BLOCKED_AUTH
  - filesystem-read-write-ok
  - plane-app-token-read-ok
MaxRuntime: 30m
MaxSpend: EUR 0
KillSwitch: parent issue stop comment or CEO stop comment.
Heartbeat: Plane comment every 10m if running longer than one pass.
CapabilityProfile: claude-clevel-worker/cmo/marketing-distribution-manager
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
