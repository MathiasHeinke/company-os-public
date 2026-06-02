# Company.OS Video-First Content Engine Research Worker Contract

Use this template for current-state discovery before a company activates the
Video-First Content Engine.

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: research
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-video-first-content-engine-department-pack-v0.md
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/.company-os/domain-packs/video-first-content-engine/setup.md
acceptance_criteria:
  - Research report captures company, audience, channels, approval owner, capture location, privacy constraints and off-limits claim classes.
  - Report classifies the first safe scope as folder initialization and dry-run package generation only.
  - Report identifies missing inputs and asks only for fields needed before the first local test.
  - Report exact blockers instead of claiming completion from partial output.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-video-first-content-engine-research-worker-contract.md --label role:cmo
  - node scripts/orchestration/company-os-department-pack-evaluator.mjs --pack-id video-first-content-engine --json
human_gate: HG-2
reporting: Ledger worker.reported with discovery summary, missing inputs, gate results, blockers, reflection and learning_proposals.
BlockedActions: do not read secrets, private memory, browser storage or unrelated files; do not process videos; do not publish, schedule, send or spend; do not mark Done.
CapabilityProfile: claude-clevel-worker/cmo/video-first-content-engine
OutcomeSpec: Produce a bounded current-state discovery report for one company video-engine setup.
OutcomeRubric: PASS only when approval owner, risk classes, target channels and first local test boundary are explicit.
ReflectionPolicy: required
LearningProposalPolicy: required
```
