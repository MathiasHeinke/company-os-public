# Company.OS Customer Support KB Research Worker Contract

Use this template for a generated department capability pack worker lane.

```yaml
role: role:coo
parent_seat: role:coo
agent: claude
mode: research
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-customer-support-kb-department-pack-v0.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-department-capability-pack.md
acceptance_criteria:
  - Customer Support KB current-state research report exists with cited evidence and uncertainties.
  - Report exact blockers instead of claiming completion from partial output.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --examples
  - node scripts/orchestration/company-os-department-pack-evaluator.mjs --pack-id customer-support-kb --json
human_gate: HG-2
reporting: Plane worker.reported with changed files, evidence paths, gate results, blockers, reflection and learning_proposals.
BlockedActions: do not read secrets; do not write production systems; do not publish, send, schedule or spend; do not mark Plane Done.
CapabilityProfile: claude-clevel-worker/cto/department-capability-pack-creator
OutcomeSpec: Produce one verifiable department capability pack artifact or a blocker report.
OutcomeRubric: PASS only when the declared artifact exists, gates pass and blocked actions remain forbidden.
ReflectionPolicy: required
LearningProposalPolicy: required
```
