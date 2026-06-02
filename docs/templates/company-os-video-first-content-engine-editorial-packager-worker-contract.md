# Company.OS Video-First Content Engine Editorial Packager Worker Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: implement
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-video-first-content-engine-department-pack-v0.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-video-first-content-engine-risk-claim-safety-worker-contract.md
acceptance_criteria:
  - Package includes YouTube title, description, chapters, thumbnail/frame brief, LinkedIn draft, X draft and blog/article draft.
  - Every public-facing draft references approved transcript segments and claim classifications.
  - Package includes CTA, audience, channel and required HumanGate for every output.
  - Report exact blockers instead of claiming completion from partial output.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-video-first-content-engine-editorial-packager-worker-contract.md --label role:cmo
human_gate: HG-2.5
reporting: Ledger worker.reported with package paths, channel drafts, gate level, blockers, reflection and learning_proposals.
BlockedActions: do not upload, post, schedule, send or spend; do not use HG-3 or HG-4 material without release; do not mark Done.
CapabilityProfile: claude-clevel-worker/cmo/video-first-content-engine
OutcomeSpec: Produce one dry-run multi-channel editorial package from approved segments.
OutcomeRubric: PASS only when every output is useful standalone, source-linked and release-gated.
ReflectionPolicy: required
LearningProposalPolicy: required
```
