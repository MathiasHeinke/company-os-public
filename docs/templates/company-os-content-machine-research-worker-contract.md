# Company.OS Content Machine Research Worker Contract

Use this template for current-state discovery and sourced research before a
Content Machine anchor draft is created.

## Plane Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: research
workspace: registry:company-os
dispatch: manual
RunAt: manual
DependsOn:
scope:
  - Include: inspect only approved Source Inventory entries and selected vault
      cards.
  - Include: create a sourced research dossier for one selected anchor idea.
  - Include: separate facts, founder opinion, hypotheses and open questions.
  - Exclude: drafting final copy, derivatives, public release, connector writes
      and memory promotion.
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-content-machine-department-pack-v0.md
  - ${CLIENT_ROOT}/content/content-machine/01_source_inventory/SOURCE_INVENTORY.md
  - ${CLIENT_ROOT}/content/content-machine/02_vault/CONTENT_VAULT.md
acceptance_criteria:
  - Produce a research dossier with TL;DR, key facts, links or source paths,
      contrarian angles, already-said context and open questions.
  - Mark every factual claim as sourced, founder opinion or hypothesis.
  - Route missing proof back to Source Inventory or Founder Interview instead
      of inventing support.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-content-machine-research-worker-contract.md --label role:cmo --json
  - node scripts/orchestration/company-os-department-pack-evaluator.mjs --pack-id content-machine --json
human_gate: HG-2 for local research; HG-2.5 before public release use.
reporting: reports/content-machine/research-report.md
AllowedReadPaths:
  - ${CLIENT_ROOT}/content/content-machine/
AllowedWritePaths:
  - ${CLIENT_ROOT}/content/content-machine/03_research/
  - ${CLIENT_ROOT}/reports/content-machine/
BlockedActions: no private-source reads outside Source Inventory; no public copy; no publish; no schedule; no send; no spend; no durable memory write; no Plane Done transition.
CapabilityProfile: claude-clevel-worker/cmo/content-machine
OutcomeSpec: Produce a sourced dossier that can feed founder interview and anchor drafting.
OutcomeRubric:
  - PASS only if facts, opinions, hypotheses and gaps are separated.
  - REJECT if the dossier relies on unsourced trend claims or generic market prose.
ReflectionPolicy: required
LearningProposalPolicy: required
```
