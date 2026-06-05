# Company.OS Content Machine Draft Worker Contract

Use this template for turning a selected vault card, research dossier and raw
founder brief into one anchor draft.

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
  - Include: draft one anchor artifact for the selected channel.
  - Include: cite raw brief and research inputs.
  - Exclude: derivatives, release packets, external actions and final approval.
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-content-machine-department-pack-v0.md
  - ${CLIENT_ROOT}/content/content-machine/03_research/
  - ${CLIENT_ROOT}/content/content-machine/05_raw_briefs/
acceptance_criteria:
  - Draft names target audience, channel, thesis, proof, caveats and CTA.
  - Draft preserves founder voice where evidence exists and flags FVBM gaps.
  - Every factual claim cites a source path or is labeled founder opinion.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-content-machine-draft-worker-contract.md --label role:cmo --json
  - node scripts/orchestration/company-os-department-pack-evaluator.mjs --pack-id content-machine --json
human_gate: HG-2 for local draft; HG-2.5 before external release path.
reporting: reports/content-machine/anchor-draft-report.md
AllowedReadPaths:
  - ${CLIENT_ROOT}/content/content-machine/
AllowedWritePaths:
  - ${CLIENT_ROOT}/content/content-machine/06_anchor_drafts/
  - ${CLIENT_ROOT}/reports/content-machine/
BlockedActions: no public publish; no public schedule; no outreach send; no spend; no uncited factual claims; no Plane Done transition.
CapabilityProfile: claude-clevel-worker/cmo/content-machine
OutcomeSpec: Produce one council-ready anchor draft.
OutcomeRubric:
  - PASS only if the draft stands on founder context or explicit source evidence.
  - REJECT if it reads like generic AI content.
ReflectionPolicy: required
LearningProposalPolicy: required
```
