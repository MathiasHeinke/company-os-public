# Company.OS Video-First Content Engine Parent Worker Contract

Use this template for the CMO parent that coordinates the Video-First Content
Engine setup. The parent creates no public output and dispatches no child
workers by itself.

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: plan
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-video-first-content-engine-department-pack-v0.md
  - ${COMPANY_OS_ROOT}/docs/superpowers/specs/2026-05-27-video-first-content-engine-design.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-department-capability-pack.md
acceptance_criteria:
  - Parent setup packet exists with target root, approval owner, HumanGate policy, child roster and dry-run-only release boundary.
  - Skill start command is documented and can initialize the folder structure without reading videos or credentials.
  - Child contracts stay dispatch manual and reference the Video-First Content Engine CapabilityProfile.
  - Report exact blockers instead of claiming completion from partial output.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-video-first-content-engine-parent-worker-contract.md --label role:cmo
  - node scripts/orchestration/company-os-department-pack-evaluator.mjs --pack-id video-first-content-engine --json
  - node --test scripts/content/video-first-content-engine-start-core.test.mjs
human_gate: HG-2.5
reporting: Ledger worker.reported with child roster, artifact paths, gate results, blockers, release recommendation, reflection and learning_proposals.
BlockedActions: do not dispatch workers automatically; do not upload, post, schedule, send, spend or write production; do not request secrets; do not mark Done.
CapabilityProfile: claude-clevel-worker/cmo/video-first-content-engine
OutcomeSpec: Produce a CEO-ready parent setup packet for the Video-First Content Engine guided pilot.
OutcomeRubric: PASS only when setup packet, child roster, folder initializer evidence and evaluator result are complete.
ReflectionPolicy: required
LearningProposalPolicy: required
```
