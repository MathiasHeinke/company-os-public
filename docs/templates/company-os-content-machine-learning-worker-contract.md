# Company.OS Content Machine Learning Loop Worker Contract

Use this template after a founder-approved final artifact or published result.

## Plane Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: report
workspace: registry:company-os
dispatch: manual
RunAt: manual
DependsOn:
scope:
  - Include: compare first draft, council revisions, founder final and metrics.
  - Include: propose content lessons and FVBM updates.
  - Exclude: durable memory writes, FVBM promotion and public actions.
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-content-machine-department-pack-v0.md
  - ${COMPANY_OS_ROOT}/docs/operations/eve-founder-voice-belief-model.md
  - ${CLIENT_ROOT}/content/content-machine/
acceptance_criteria:
  - Produce confirmed lessons, hypotheses and rejected patterns separately.
  - Link each proposed lesson to draft/final/performance evidence.
  - Mark all memory or FVBM updates as proposal-only.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-content-machine-learning-worker-contract.md --label role:cmo --json
human_gate: HG-2 for local lesson proposal; HG-4 for durable founder voice identity changes.
reporting: reports/content-machine/learning-loop-report.md
AllowedReadPaths:
  - ${CLIENT_ROOT}/content/content-machine/
AllowedWritePaths:
  - ${CLIENT_ROOT}/content/content-machine/10_performance/
  - ${CLIENT_ROOT}/content/content-machine/11_lessons/
  - ${CLIENT_ROOT}/reports/content-machine/
BlockedActions: no durable memory promotion; no FVBM overwrite; no public action; no Plane Done transition.
CapabilityProfile: claude-clevel-worker/cmo/content-machine
OutcomeSpec: Produce proposal-only learning artifacts that improve the next draft.
OutcomeRubric:
  - PASS only if lessons are evidence-backed and separated by confidence.
  - REJECT if the worker silently rewrites founder identity or style doctrine.
ReflectionPolicy: required
LearningProposalPolicy: required
```
