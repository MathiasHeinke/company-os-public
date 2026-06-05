# Command EVE Department Dashboard and Review Cards

Status: Plane-ready child contract draft
Date: 2026-06-05
Version band: `0.8.x`
Plane refs: `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]`

```yaml
role: role:cpo
parent_seat: role:coo
agent: claude
mode: plan
workspace: registry:company-os
dispatch: ready
target_class: report-only
depends_on:
  - command-eve-alpha2-08-09-closure-parent
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-06-02/command-center-v08-department-dashboard-template.md
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-06-02/command-center-v08-department-intent-surface.md
  - ${COMPANY_OS_ROOT}/docs/operations/intent-to-department-reporting-chain.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-engineering-department-pack-v068.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-content-machine-department-pack-v0.md
scope:
  - include reusable department dashboard templates, parent/child review cards, status/read-model fields, approval queues and evidence links for Engineering, Growth/Marketing and Ops.
  - exclude hosted dashboard deployment, customer data storage, billing, production analytics backend and replacing Plane as execution ledger.
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/templates/
  - ${COMPANY_OS_ROOT}/docs/operations/
  - ${COMPANY_OS_ROOT}/docs/releases/
acceptance_criteria:
  - Dashboard spec defines cards, tables, freshness fields, empty states, source truth and owner for every visible decision.
  - Review-card spec maps Founder/EVE/CEO/C-Level/Worker/CAO handoff states without letting workers mark Done.
  - Marketing metrics and approval queue gaps from `[WORK_ITEM_ID]` are named separately from dashboard UI gaps.
gates:
  - Product review against docs/strategy/autonomy-product-horizon.md 0.8 band.
  - Controller review that dashboard is read-model only.
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-05/command-eve-alpha2-department-dashboard-review-cards.md --label role:cpo
human_gate: HG-2
reporting: Plane worker.reported with dashboard/read-model spec, unresolved product gaps, next implementation slice and proof paths.
blocked_actions: do not build hosted UI, deploy, store customer data, mutate Plane state, dispatch workers, mark Done or claim dashboard product readiness.
reflection_policy: required
learning_proposal_policy: required
```
