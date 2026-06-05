# Company.OS Content Machine Writer Council Worker Contract

Use this template for independent review of an anchor draft before derivatives
or release packets.

## Plane Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: review
workspace: registry:company-os
dispatch: manual
RunAt: manual
DependsOn:
scope:
  - Include: score one draft through anti-slop, founder voice, buyer value,
      claim safety, platform fit and business outcome lenses.
  - Include: split fixes into machine-editable issues and founder-only gaps.
  - Exclude: publishing, scheduling, final approval and durable memory promotion.
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-content-machine-department-pack-v0.md
  - ${CLIENT_ROOT}/content/content-machine/06_anchor_drafts/
acceptance_criteria:
  - Produce scores per council lens and an overall verdict.
  - Route founder-only gaps back to interview instead of rewriting around them.
  - Recommend pass, revise or park.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-content-machine-council-worker-contract.md --label role:cmo --json
human_gate: HG-2 for local review; HG-4 for voice identity disputes.
reporting: reports/content-machine/writer-council-report.md
AllowedReadPaths:
  - ${CLIENT_ROOT}/content/content-machine/
AllowedWritePaths:
  - ${CLIENT_ROOT}/content/content-machine/07_council_reviews/
  - ${CLIENT_ROOT}/reports/content-machine/
BlockedActions: no self-approval by original writer; no public release; no HumanGate downgrade; no durable memory write; no Plane Done transition.
CapabilityProfile: claude-clevel-worker/cmo/content-machine
OutcomeSpec: Produce a council verdict that can be audited without reading chat history.
OutcomeRubric:
  - PASS only if all council lenses score and explain evidence.
  - REJECT if the reviewer only gives generic prose feedback.
ReflectionPolicy: required
LearningProposalPolicy: required
```
