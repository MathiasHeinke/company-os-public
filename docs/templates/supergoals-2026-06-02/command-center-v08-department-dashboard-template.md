# v0.8 Department Dashboard Template Child Contract

Status: Plane-ready child contract draft
Date: 2026-06-02

```yaml
role: role:cpo
parent_seat: role:cpo
agent: claude
mode: plan
workspace: registry:company-os
dispatch: ready
target_class: report-only
depends_on:
  - command-center-hosted-provisioning-parent
source_of_truth:
  - ${COMPANY_OS_ROOT}/ROADMAP.md
  - ${COMPANY_OS_ROOT}/docs/strategy/autonomy-product-horizon.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-marketing-department-pack-v067.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-engineering-department-pack-v068.md
scope:
  - Design the reusable department dashboard template for Engineering, Website/Web Ops and Marketing/Growth.
  - Include quality, cost, throughput, blocked gates, worker runs, HumanGate queue and stale-work signals.
  - Exclude a hosted frontend implementation, live analytics backend, production customer data and billing.
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/templates/
  - ${COMPANY_OS_ROOT}/docs/releases/
acceptance_criteria:
  - Template defines cards, tables, source links, freshness fields and empty/error states.
  - Template maps every dashboard section to Plane item, report, event row, diff, source doc or approved read model.
  - Template states how it differs from a marketing landing page and from Plane itself.
  - Template includes first three department examples: Engineering, Website/Web Ops and Marketing/Growth.
gates:
  - Product review against docs/strategy/autonomy-product-horizon.md 0.8 target.
  - Controller review that dashboard is read-model only and not a second ledger.
  - node scripts/page-index/generate-page-index.mjs --root . --check
human_gate: HG-2
reporting: Plane worker.reported with dashboard template path, source map, unresolved UX risks and next implementation slice.
blocked_actions: do not build hosted UI, store customer data, create accounts, mutate Plane, dispatch workers or mark Done.
reflection_policy: required
learning_proposal_policy: required
```
