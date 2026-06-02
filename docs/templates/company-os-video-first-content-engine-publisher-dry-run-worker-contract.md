# Company.OS Video-First Content Engine Publisher Dry-Run Worker Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: verify
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-video-first-content-engine-department-pack-v0.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-video-first-content-engine-editorial-packager-worker-contract.md
acceptance_criteria:
  - Dry-run validates YouTube, LinkedIn, X and article payload shapes without connecting to publisher APIs.
  - Dry-run report records missing fields, platform-specific blockers and rollback or cancel requirements for future release.
  - Dry-run refuses to run when HumanGate report, claim ledger or approval owner is missing.
  - Report exact blockers instead of claiming completion from partial output.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-video-first-content-engine-publisher-dry-run-worker-contract.md --label role:cmo
human_gate: HG-2.5
reporting: Ledger worker.reported with dry-run report path, payload validation summary, missing fields, blockers, reflection and learning_proposals.
BlockedActions: do not call publisher APIs; do not upload, post, schedule, send or spend; do not request tokens; do not mark Done.
CapabilityProfile: claude-clevel-worker/cmo/video-first-content-engine
OutcomeSpec: Produce publisher payload validation for one dry-run package.
OutcomeRubric: PASS only when every platform payload is validated locally and any external action remains blocked behind release.
ReflectionPolicy: required
LearningProposalPolicy: required
```
