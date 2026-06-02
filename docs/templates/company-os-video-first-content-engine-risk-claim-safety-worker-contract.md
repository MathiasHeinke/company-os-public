# Company.OS Video-First Content Engine Risk and Claim Safety Worker Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: review
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-video-first-content-engine-department-pack-v0.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-video-first-content-engine-transcript-segmenter-worker-contract.md
acceptance_criteria:
  - Risk report classifies each segment as HG-1, HG-2, HG-3 or HG-4.
  - Claim ledger classifies claims as source-backed, personal experience, opinion, uncertain or blocked.
  - HG-3 and HG-4 segments are routed to review and excluded from publish-ready packages.
  - Report exact blockers instead of claiming completion from partial output.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-video-first-content-engine-risk-claim-safety-worker-contract.md --label role:cmo
human_gate: HG-3
reporting: Ledger worker.reported with risk report path, claim ledger path, blocked segments, approval owner, blockers, reflection and learning_proposals.
BlockedActions: do not downgrade HumanGate level; do not publish or approve claims; do not include private data in public drafts; do not mark Done.
CapabilityProfile: claude-clevel-worker/cmo/video-first-content-engine
OutcomeSpec: Produce the HumanGate and claim-safety decision packet for one video package.
OutcomeRubric: PASS only when all risky segments are explicit and no blocked material reaches publish-ready output.
ReflectionPolicy: required
LearningProposalPolicy: required
```
