# Company.OS Video-First Content Engine Media Processor Worker Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: implement
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-video-first-content-engine-department-pack-v0.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-video-first-content-engine-media-preflight-worker-contract.md
acceptance_criteria:
  - Worker creates normalized local working copy or reports exact missing ffmpeg/runtime blocker.
  - Worker records command, input checksum if available, output path and raw-video immutability proof.
  - Worker produces audio normalization notes and optional safe clip source markers.
  - Report exact blockers instead of claiming completion from partial output.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-video-first-content-engine-media-processor-worker-contract.md --label role:cmo
  - node --test scripts/content/video-first-content-engine-start-core.test.mjs
human_gate: HG-2
reporting: Ledger worker.reported with processing command, output paths, raw immutability proof, blockers, reflection and learning_proposals.
BlockedActions: do not mutate raw video; do not process files outside the declared video-engine root; do not publish, upload, schedule, send or spend; do not mark Done.
CapabilityProfile: claude-clevel-worker/cmo/video-first-content-engine
OutcomeSpec: Produce a local normalized working asset or a precise runtime blocker report.
OutcomeRubric: PASS only when raw source is preserved and every output is inside the declared video-engine workspace.
ReflectionPolicy: required
LearningProposalPolicy: required
```
