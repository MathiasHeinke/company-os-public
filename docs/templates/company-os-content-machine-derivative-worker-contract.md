# Company.OS Content Machine Derivative Worker Contract

Use this template for creating native derivatives from an approved anchor draft.

## Plane Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: implement
workspace: registry:company-os
dispatch: manual
RunAt: manual
DependsOn:
scope:
  - Include: create derivative drafts for approved target channels.
  - Include: re-hook each derivative natively for its platform.
  - Exclude: publishing, scheduling, sending and changing factual claims.
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-content-machine-department-pack-v0.md
  - ${CLIENT_ROOT}/content/content-machine/06_anchor_drafts/
  - ${CLIENT_ROOT}/content/content-machine/07_council_reviews/
acceptance_criteria:
  - Each derivative names source anchor, channel, hook, CTA and claim delta.
  - No derivative introduces a new factual claim without a source path.
  - Release packet targets are draft-only until HumanGate.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-content-machine-derivative-worker-contract.md --label role:cmo --json
human_gate: HG-2 for local derivatives; HG-2.5 before external release.
reporting: reports/content-machine/derivative-report.md
AllowedReadPaths:
  - ${CLIENT_ROOT}/content/content-machine/
AllowedWritePaths:
  - ${CLIENT_ROOT}/content/content-machine/08_derivatives/
  - ${CLIENT_ROOT}/content/content-machine/09_release_packets/
  - ${CLIENT_ROOT}/reports/content-machine/
BlockedActions: no public publish; no schedule; no send; no spend; no new uncited claims; no Plane Done transition.
CapabilityProfile: claude-clevel-worker/cmo/content-machine
OutcomeSpec: Produce channel-native derivative drafts and release packet inputs.
OutcomeRubric:
  - PASS only if every derivative can be traced back to the approved anchor.
  - REJECT if derivatives are copy-pasted translations or platform-generic.
ReflectionPolicy: required
LearningProposalPolicy: required
```
