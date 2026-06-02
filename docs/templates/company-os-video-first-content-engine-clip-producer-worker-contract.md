# Company.OS Video-First Content Engine Clip Producer Worker Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: implement
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-video-first-content-engine-department-pack-v0.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-video-first-content-engine-transcript-segmenter-worker-contract.md
acceptance_criteria:
  - Clip plan contains timestamp ranges, hook text, platform fit, risk level and expected value for each candidate.
  - Optional local clip files are written only inside `05_clips/`.
  - Clip plan excludes HG-3 and HG-4 segments unless a review packet explicitly authorizes draft-only handling.
  - Report exact blockers instead of claiming completion from partial output.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-video-first-content-engine-clip-producer-worker-contract.md --label role:cmo
human_gate: HG-2.5
reporting: Ledger worker.reported with clip plan path, optional clip paths, excluded segments, blockers, reflection and learning_proposals.
BlockedActions: do not publish, upload, schedule, send or spend; do not write clips outside the video-engine root; do not mark Done.
CapabilityProfile: claude-clevel-worker/cmo/video-first-content-engine
OutcomeSpec: Produce a short-form clip plan and optional local clips for one video package.
OutcomeRubric: PASS only when every clip has timestamp range, hook, platform, risk level and release gate.
ReflectionPolicy: required
LearningProposalPolicy: required
```
