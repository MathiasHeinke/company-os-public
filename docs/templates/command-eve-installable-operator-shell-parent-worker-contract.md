# Command EVE Installable Operator Shell Parent Worker Contract

Use this template for the CTO parent that coordinates the productized one-time
Command EVE install package.

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: plan
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/command-eve-installable-operator-shell-plane-contracts.md
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/README.md
  - ${COMPANY_OS_ROOT}/docs/operations/command-eve-first-run-skill-pack.md
  - ${COMPANY_OS_ROOT}/docs/operations/eve-soul-boot-contract.md
  - ${COMPANY_OS_ROOT}/docs/integrations/aionui-hermes-eve-portable-bootstrap.md
  - ${COMPANY_OS_ROOT}/docs/strategy/autonomy-product-horizon.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/spec-to-worker-pipeline.md
scope:
  - include Command EVE one-time install package architecture, child roster, promotion gates and release boundary.
  - exclude implementation work, connector OAuth, production writes, public release, Plane Done and worker dispatch.
acceptance_criteria:
  - Parent setup packet defines the target one-time install architecture, child roster, dependency order, HumanGate envelope and release boundary.
  - The packet explains exactly what ships in the install package and what remains human-authenticated after install.
  - Every child contract is dispatch manual, parseable and points to concrete source-of-truth files.
  - The later goal promotion criteria are explicit and include Stage 0.5, Stage 0.65, connector preflight and HumanGate checks.
  - Worker-ledger validation reports only contract.dispatch-not-ready while dispatch stays manual.
  - Verification dry-run must check the parent packet against all child gates and write a report path.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/command-eve-installable-operator-shell-parent-worker-contract.md --label role:cto
  - node scripts/operator-shell/eve-sidecar.mjs preflight --company-os-root ${COMPANY_OS_ROOT} --json
  - node scripts/update/company-os-update.mjs check --source ${COMPANY_OS_ROOT} --target ${COMPANY_OS_ROOT} --json
human_gate: HG-2.5
reporting: Plane worker.reported with parent packet path, child roster, gate results, blockers, release recommendation, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cto/runtime
runtime_permission_mode: default
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/orchestration/
  - ${COMPANY_OS_ROOT}/docs/templates/
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/
outcome_artifacts:
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/parent-setup-packet.md
blocked_actions: do not dispatch children automatically; do not write Plane Done; do not publish, push, merge, deploy, spend, request secrets, alter production systems or overwrite local client state.
outcome_spec: Produce a CEO-ready parent setup packet for the Command EVE one-time install productization lane using the Spec-to-Worker pipeline.
outcome_rubric: PASS only when architecture, child roster, gates, preflight strategy and update boundaries are concrete enough for later goal materialization.
reflection_policy: required
learning_proposal_policy: required
```
