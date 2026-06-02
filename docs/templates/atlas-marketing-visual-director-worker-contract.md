# ATLAS Marketing Visual Director Worker Contract

Use this template for creative direction and generated-image QA. The worker
does not replace the production lane; it defines and verifies the visual bar.

## Plane Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: review
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
RunAt: set concrete ISO timestamp before dispatch
DependsOn:
scope:
  - Include: review one Case File or editorial image package for topic-specific visual utility.
  - Include: check raw image, deterministic overlay, slide readability and reject reasons.
  - Exclude: broad renderer rewrites or unrelated design changes.
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
acceptance_criteria:
  - Report whether the raw image is topic-specific, text-free and safe for overlay.
  - Check at least ten reject reasons: generic image, weird anatomy, detached parts, unreadable axis, missing scale, oval circles, metadata text, low contrast, weak hook, weak user value.
  - Emit pass, revise or reject recommendation with exact artifact paths.
gates:
  - cd ${LOCAL_WORKSPACE} && npm run marketing:images -- --date YYYY-MM-DD --provider codex --quality high --size 1024x1536
  - cd ${LOCAL_WORKSPACE} && npm run marketing:case-files -- --date YYYY-MM-DD
  - cd ${LOCAL_WORKSPACE} && git diff --check
  - node ${LOCAL_WORKSPACE} --description-file ${LOCAL_WORKSPACE} --label role:cmo --json
human_gate: HG-1
reporting: Plane worker.reported plus reports/marketing-department-v067/visual-director.md with artifact paths, QA verdict, reject reasons, blockers, reflection and learning_proposals.
OutcomeArtifacts:
  - ${LOCAL_WORKSPACE}
AllowedReadPaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
AllowedWritePaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
BlockedActions: do not mark Plane Done; do not write Linear; do not overwrite approved images; do not write durable memory; do not approve visuals with unsafe or confusing anatomy; do not change renderer code in this review lane.
OutcomeSpec: Produce one visual QA verdict that protects topic-specific utility and brand quality.
OutcomeRubric:
  - PASS only if image and overlay help the reader understand the topic.
  - PASS only if text, axes and numeric labels are readable.
  - REJECT if the image is generic, odd, decorative or not source-aligned.
RuntimeAuth:
  - codex-chatgpt-login-ok-for-image-generation
  - filesystem-read-write-ok
  - plane-app-token-read-ok
MaxRuntime: 30m
MaxSpend: EUR 0
KillSwitch: parent issue stop comment or CEO stop comment.
Heartbeat: Plane comment every 20m if running longer than one pass.
CapabilityProfile: claude-clevel-worker/cmo/marketing-visual-director
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
