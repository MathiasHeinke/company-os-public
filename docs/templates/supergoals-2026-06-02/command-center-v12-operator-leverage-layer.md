# v1.2 Operator Leverage Layer Child Contract

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
  - command-center-v10-stable-baseline-release-pack
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/strategy/autonomy-product-horizon.md
  - ${COMPANY_OS_ROOT}/ROADMAP.md
  - ${COMPANY_OS_ROOT}/docs/operations/eve-chief-of-staff-growth-review.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/parallel-portfolio-orchestration.md
scope:
  - Define the v1.2 Operator Leverage Layer: one trained operator supervising multi-department output.
  - Include dashboard evidence, quality/cost/throughput metrics, gate cards, quick supervision loops and department drill-downs.
  - Define the evidence required to claim small-team coordination replacement.
  - Exclude emotional companion product, autonomous HG-4 decisions, production actions without release gates and unmanaged hosted data capture.
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/strategy/
  - ${COMPANY_OS_ROOT}/docs/operations/
  - ${COMPANY_OS_ROOT}/docs/templates/
acceptance_criteria:
  - v1.2 scorecard defines measurable operator leverage, not vague autonomy.
  - Five or more department packs map to dashboard sections, report sinks, quality gates and owner roles.
  - Quick Mode is limited to receipts, local-safe captures, report lookups and gated intent-card drafts.
  - The contract states what evidence downgrades or blocks an operator-leverage claim.
gates:
  - Product review against docs/strategy/autonomy-product-horizon.md 1.2 bar.
  - CAO review that evidence is measurable and not self-promotion.
  - Support/privacy review for any quick voice/screen capture surface.
human_gate: HG-3
reporting: Plane worker.reported with v1.2 scorecard, metric definitions, dashboard map, evidence examples and blocked claims.
blocked_actions: do not claim human replacement, ship voice/screen capture, approve HG-4 decisions, deploy hosted capture, publish marketing claims or mark Done.
reflection_policy: required
learning_proposal_policy: required
```
