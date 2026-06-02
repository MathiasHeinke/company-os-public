# Company.OS Video-First Content Engine Transcript Segmenter Worker Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: implement
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-video-first-content-engine-department-pack-v0.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-video-first-content-engine-media-processor-worker-contract.md
acceptance_criteria:
  - Transcript exists with timestamps or worker reports exact missing transcription-adapter blocker.
  - Segment map identifies chapters, topics, hooks, claims and clip candidates.
  - Segment map marks uncertain transcript spans for review instead of converting them into claims.
  - Report exact blockers instead of claiming completion from partial output.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-video-first-content-engine-transcript-segmenter-worker-contract.md --label role:cmo
human_gate: HG-2
reporting: Ledger worker.reported with transcript path, segment map path, uncertainty notes, blockers, reflection and learning_proposals.
BlockedActions: do not send media to undeclared providers; do not publish, upload, schedule, send or spend; do not include secrets from transcripts in public drafts; do not mark Done.
CapabilityProfile: claude-clevel-worker/cmo/video-first-content-engine
OutcomeSpec: Produce timestamped transcript and segment map for one preflight-approved video.
OutcomeRubric: PASS only when chapters, hooks, claims and uncertainties are explicitly mapped.
ReflectionPolicy: required
LearningProposalPolicy: required
```
