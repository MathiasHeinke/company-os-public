# Company.OS Video-First Content Engine Draft Worker Contract

Use this template for creating one local dry-run editorial package from an
already approved transcript or segment map. It does not upload or schedule.

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
  - Draft package contains YouTube title, description, chapters, thumbnail/frame brief, LinkedIn draft, X draft and blog/article draft.
  - Draft package references transcript segments and claim ledger entries instead of inventing unsupported claims.
  - Draft package remains dry-run and records required HumanGate for release.
  - Report exact blockers instead of claiming completion from partial output.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-video-first-content-engine-draft-worker-contract.md --label role:cmo
  - node scripts/orchestration/company-os-department-pack-evaluator.mjs --pack-id video-first-content-engine --json
human_gate: HG-2.5
reporting: Ledger worker.reported with draft package paths, claim ledger path, HumanGate classification, blockers, reflection and learning_proposals.
BlockedActions: do not upload, post, schedule, send, spend or write production; do not include HG-3 or HG-4 segments in publish-ready output; do not mark Done.
CapabilityProfile: claude-clevel-worker/cmo/video-first-content-engine
OutcomeSpec: Produce one dry-run editorial package from approved transcript material.
OutcomeRubric: PASS only when every public-facing draft has platform, audience, source segment and release gate recorded.
ReflectionPolicy: required
LearningProposalPolicy: required
```
