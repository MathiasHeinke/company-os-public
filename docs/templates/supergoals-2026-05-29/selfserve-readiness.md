# 1.0-Sellable Readiness Bar + Persona Delivery Conflict (Decision Packet)

Resolve the central contradiction: the buyer wants a no-touch outcome, but
delivery today needs CLI install plus bring-your-own subscriptions. Define what
1.0-sellable (truly self-serve) means and the go-live gate it implies. This is a
founder decision (HG-4).

```yaml
role: role:cpo
parent_seat: role:cmo
agent: claude
mode: plan
workspace: registry:company-os
dispatch: manual
target_class: report-only
depends_on:
  - [WORK_ITEM_ID]
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/templates/command-eve-installable-operator-shell-parent-worker-contract.md
  - ${COMPANY_OS_ROOT}/docs/operations/command-eve-first-run-skill-pack.md
  - ${COMPANY_OS_ROOT}/docs/strategy/autonomy-product-horizon.md
scope:
  - include a readiness checklist, the persona-versus-delivery resolution options and a recommended go-live gate.
  - exclude building, deploying, pricing decision and any public publish.
acceptance_criteria:
  - Decision packet defines a concrete 1.0-sellable readiness checklist (onboarding without CLI friction, activation measurable, failure-safe for non-technical users).
  - Decision packet states resolution options for the no-touch persona versus CLI plus bring-your-own-subscription delivery, with a recommendation and trade-offs.
  - Decision packet defines an explicit go-live gate that blocks the build/Stripe child until readiness is met.
  - Decision packet maps the dependency on the installable shell set ([WORK_ITEM_ID]..375).
  - Packet is a founder decision card: clear options, recommendation, and the exact decision the founder must make.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-05-29/selfserve-readiness.md --label role:cpo
  - Controller review, then founder decision (HG-4).
human_gate: HG-4
reporting: Plane worker.reported with decision packet path, readiness checklist, persona-delivery options, recommended go-live gate, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cpo/runtime
runtime_permission_mode: plan
blocked_actions: founder decides readiness; do not build, deploy, price, publish or spend; do not write Plane Done.
reflection_policy: required
learning_proposal_policy: required
```
