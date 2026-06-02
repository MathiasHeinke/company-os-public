# Supergoal: Self-Serve Launch v1 (Positioning to Pages to Pilot to Pricing to Stripe)

CMO parent that coordinates the commercial launch layer on top of the Command
EVE installable operator shell ([WORK_ITEM_ID]..375). This layer turns the installable
product into a self-serve, priced offering. It contains two founder decisions
(readiness and pricing) that stay HG-4.

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: plan
workspace: registry:company-os
dispatch: manual
target_class: report-only
depends_on:
  - [WORK_ITEM_ID]
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/strategy/autonomy-product-horizon.md
  - ${COMPANY_OS_ROOT}/docs/templates/command-eve-installable-operator-shell-parent-worker-contract.md
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/README.md
scope:
  - include coordinating the commercial launch layer, the child roster, the readiness gate that blocks go-live and the placement of founder decisions.
  - exclude live deploy and live Stripe (child selfserve-build, gated), the founder pricing decision (child selfserve-pricing, HG-4) and the readiness decision (child selfserve-readiness, HG-4).
acceptance_criteria:
  - Parent packet defines the launch layer and its hard dependency on the installable shell ([WORK_ITEM_ID]..375) being ready.
  - Parent packet names the child roster (positioning, readiness, pilot, pricing, build) and their dependency order.
  - Parent packet defines a readiness gate that blocks public go-live until the product is truly self-serve, and recommends pilot-before-public.
  - Parent packet places the two founder decisions (readiness, pricing) at HG-4 and the build/Stripe at HG-3.
  - Worker-ledger validation reports only contract.dispatch-not-ready while dispatch stays manual.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-05-29/selfserve-parent.md --label role:cmo
  - Controller review before any child dispatch.
human_gate: HG-2.5
reporting: Plane worker.reported with parent packet path, child roster, dependency on [WORK_ITEM_ID], readiness gate, founder-decision placement, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cmo/runtime
runtime_permission_mode: plan
blocked_actions: do not dispatch children automatically; do not deploy, publish, set live Stripe, spend or write Plane Done; founder decisions stay HG-4.
reflection_policy: required
learning_proposal_policy: required
```
