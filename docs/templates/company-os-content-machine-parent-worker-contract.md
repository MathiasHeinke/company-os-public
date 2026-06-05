# Company.OS Content Machine Parent Worker Contract

Use this template for the CMO parent that coordinates Content Machine setup,
source inventory, vault, raw founder briefs, council review and downstream
release packets.

## Plane Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: plan
workspace: registry:company-os
dispatch: manual
RunAt: manual
DependsOn:
scope:
  - Include: initialize or verify a draft-only Content Machine folder surface.
  - Include: coordinate source inventory, FVBM status, vault, raw brief,
      council and learning-loop child contracts.
  - Exclude: public publish, external scheduling, outreach sends, spend,
      connector writes and durable memory promotion.
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-content-machine-department-pack-v0.md
  - ${COMPANY_OS_ROOT}/docs/operations/eve-founder-voice-belief-model.md
  - ${COMPANY_OS_ROOT}/docs/operations/eve-m0-seed-interview.md
  - ${COMPANY_OS_ROOT}/docs/templates/worker-issue-contract.md
acceptance_criteria:
  - Content Machine start plan or existing folder surface is verified.
  - FVBM status is reported as missing, M0, M1, M2 or M3.
  - Source Inventory policy is explicit before optional source reads.
  - Child roster is bounded and all children remain dispatch: manual.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-content-machine-parent-worker-contract.md --label role:cmo --json
  - node scripts/orchestration/company-os-department-pack-evaluator.mjs --pack-id content-machine --json
  - node --test scripts/content/content-machine-start-core.test.mjs
human_gate: HG-2.5 for external publish/schedule/send; HG-4 for founder voice identity and strategic positioning.
reporting: reports/content-machine/parent-worker-report.md with setup status, blockers, child roster, gates, reflection and learning_proposals.
OutcomeArtifacts:
  - reports/content-machine/parent-worker-report.md
AllowedReadPaths:
  - ${CLIENT_ROOT}/.company-os/
  - ${CLIENT_ROOT}/content/content-machine/
AllowedWritePaths:
  - ${CLIENT_ROOT}/content/content-machine/
  - ${CLIENT_ROOT}/reports/content-machine/
BlockedActions: no public publish; no public schedule; no outreach send; no spend; no credential collection; no broad private-source mining; no durable memory write; no Plane Done transition.
OutcomeSpec: Produce a ready-to-review local Content Machine setup and child plan.
OutcomeRubric:
  - PASS only if source inventory and FVBM status are explicit.
  - PASS only if public release paths remain gated.
  - REJECT if the worker assumes a private connector or mines unapproved sources.
RuntimeAuth:
  - filesystem-read-ok
MaxRuntime: 30m
MaxSpend: EUR 0
KillSwitch: CEO stop comment or parent stop comment.
Heartbeat: report every 20m if running longer than one pass.
CapabilityProfile: claude-clevel-worker/cmo/content-machine
RuntimeAdapter: local-cli
RuntimePermissionMode: plan
ReflectionPolicy: required
LearningProposalPolicy: required
SessionPolicy: no-subagents
SubAgentRoster: none
```
