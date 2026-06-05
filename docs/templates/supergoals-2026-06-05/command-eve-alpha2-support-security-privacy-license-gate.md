# Command EVE Support, Security, Privacy and License Gate

Status: Plane-ready child contract draft
Date: 2026-06-05
Version band: `0.9.x`
Plane refs: `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]`

```yaml
role: role:cao
parent_seat: role:coo
agent: claude
mode: audit
workspace: registry:company-os
dispatch: ready
target_class: report-only
depends_on:
  - command-eve-alpha2-08-09-closure-parent
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-06-02/command-center-v09-support-security-privacy-gate.md
  - ${COMPANY_OS_ROOT}/docs/operations/client-productization-readiness.md
  - ${COMPANY_OS_ROOT}/docs/operations/company-os-client-rollout-doctrine.md
  - ${COMPANY_OS_ROOT}/docs/governance/human-gate-levels.md
  - ${COMPANY_OS_ROOT}/docs/releases/versioning.md
scope:
  - include local install, guided pilot and future hosted rollout security/privacy/license/support gates as separate readiness levels.
  - exclude legal advice, stable claim, hosted deployment, customer data processing and final pricing.
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/operations/
  - ${COMPANY_OS_ROOT}/docs/governance/
  - ${COMPANY_OS_ROOT}/docs/releases/
acceptance_criteria:
  - Gate blocks publish/stable claims when support, security, privacy, license or BYOK/provider disclosure evidence is missing.
  - Local-first, guided hosted pilot and future SaaS are separated with different data boundaries.
  - Incident, rollback, update and customer communication policy is explicit enough for a first external pilot.
gates:
  - node scripts/release-gates/productization-readiness.mjs check --root . --json
  - Security diff scan or explicit proof-gap report.
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-05/command-eve-alpha2-support-security-privacy-license-gate.md --label role:cao
human_gate: HG-3
reporting: Plane worker.reported with PASS/REJECT/PARK, checklist, proof gaps, risk table and release decision needed.
blocked_actions: do not approve launch, change legal policy, collect customer data, send customer communications, deploy, tag, publish or mark Done.
reflection_policy: required
learning_proposal_policy: required
```
