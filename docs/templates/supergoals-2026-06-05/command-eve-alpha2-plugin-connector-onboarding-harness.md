# Command EVE Plugin and Connector Onboarding Harness

Status: Plane-ready child contract draft
Date: 2026-06-05
Version band: `0.9.x`
Plane refs: `[WORK_ITEM_ID]`

```yaml
role: role:cto
parent_seat: role:coo
agent: codex
mode: implement
workspace: registry:company-os
dispatch: ready
target_class: main-integrated
depends_on:
  - command-eve-alpha2-08-09-closure-parent
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/plugin-connector-integration-harness.md
  - ${COMPANY_OS_ROOT}/docs/registries/capability-registry.md
  - ${COMPANY_OS_ROOT}/registries/capabilities/company-os.json
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/.company-os/eve/connector-manifests.json
  - ${COMPANY_OS_ROOT}/schemas/eve/connector-manifest.schema.json
scope:
  - include EVE first-run connector inventory, capability registry mapping, OAuth/user-consent handoff, install-state detection and missing-capability prompts.
  - exclude bypassing OAuth, storing raw tokens, granting global connector access, installing third-party plugins without user consent and hosted connector management.
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/orchestration/
  - ${COMPANY_OS_ROOT}/docs/registries/
  - ${COMPANY_OS_ROOT}/registries/capabilities/
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/.company-os/eve/
  - ${COMPANY_OS_ROOT}/schemas/eve/
acceptance_criteria:
  - Harness states how EVE asks for missing connector capability without pretending she already has access.
  - Plugin/connector install and update steps are gated by user consent and capability profile.
  - Existing customer tools are detected before recommending a new Company.OS default.
gates:
  - node scripts/orchestration/company-os-department-pack-evaluator.mjs --registry registries/capabilities/company-os.json --json
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-05/command-eve-alpha2-plugin-connector-onboarding-harness.md --label role:cto
  - Security review for OAuth/token/storage boundaries.
human_gate: HG-3
reporting: Plane worker.reported with capability map, consent gates, schema changes, tests and unresolved connector risks.
blocked_actions: do not install connectors without consent, store secrets, bypass OAuth, call private tools, deploy hosted services, tag, publish or mark Done.
reflection_policy: required
learning_proposal_policy: required
```
