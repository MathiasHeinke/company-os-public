# Company.OS Video-First Content Engine Media Preflight Worker Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: verify
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-video-first-content-engine-department-pack-v0.md
  - ${COMPANY_OS_ROOT}/scripts/content/video-first-content-engine-start-core.mjs
acceptance_criteria:
  - Preflight manifest records run id, source filename, size, duration if available, audio presence if available and raw immutability policy.
  - Preflight records privacy and screen-risk hints without reading unrelated files or secrets.
  - Preflight returns REVIEW_REQUIRED when source metadata or approval owner is missing.
  - Report exact blockers instead of claiming completion from partial output.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-video-first-content-engine-media-preflight-worker-contract.md --label role:cmo
  - node --test scripts/content/video-first-content-engine-start-core.test.mjs
human_gate: HG-2
reporting: Ledger worker.reported with manifest path, metadata summary, review flags, blockers, reflection and learning_proposals.
BlockedActions: do not mutate raw video; do not transcribe; do not publish, upload, schedule, send or spend; do not read secrets or unrelated paths; do not mark Done.
CapabilityProfile: claude-clevel-worker/cmo/video-first-content-engine
OutcomeSpec: Produce one preflight manifest for a raw video candidate.
OutcomeRubric: PASS only when raw immutability, metadata and review flags are explicit.
ReflectionPolicy: required
LearningProposalPolicy: required
```
