# Company.OS Content Machine Vault Scout Worker Contract

Use this template for creating scored content-vault cards from approved sources
or founder-provided manual notes.

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
  - Include: read only approved Source Inventory entries and create topic cards.
  - Include: score ideas by founder truth, buyer value, proof potential,
      freshness, platform fit and HumanGate level.
  - Exclude: finished copy, publishing, scheduling, outreach and durable memory writes.
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-content-machine-department-pack-v0.md
  - ${CLIENT_ROOT}/content/content-machine/01_source_inventory/SOURCE_INVENTORY.md
  - ${CLIENT_ROOT}/content/content-machine/02_vault/CONTENT_VAULT.md
acceptance_criteria:
  - Emit at least five topic cards or explain why the source inventory is insufficient.
  - Every card has source, evidence class, audience value, score and gate level.
  - Park weak or unsafe ideas with a concrete reason.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-content-machine-vault-scout-worker-contract.md --label role:cmo --json
human_gate: HG-1 for local cards; HG-2.5 before public release use.
reporting: reports/content-machine/vault-scout-report.md
AllowedReadPaths:
  - ${CLIENT_ROOT}/content/content-machine/
AllowedWritePaths:
  - ${CLIENT_ROOT}/content/content-machine/02_vault/
  - ${CLIENT_ROOT}/reports/content-machine/
BlockedActions: no private-source reads outside Source Inventory; no public copy; no publish; no schedule; no durable memory write; no Plane Done transition.
CapabilityProfile: claude-clevel-worker/cmo/content-machine
OutcomeSpec: Produce source-backed vault cards that can feed founder interviews and research.
OutcomeRubric:
  - PASS only if each idea cites an approved source or manual founder answer.
  - REJECT if output is generic trend chasing or source-free.
ReflectionPolicy: required
LearningProposalPolicy: required
```
