# Pricing Model Decision (COGS-Floored, 2-Tier) (Decision Packet)

Turn measured per-customer compute cost into a pricing decision. The floor is
COGS; the anchor is the agency and the founder's wasted time, not cheap SaaS.
Propose a two-tier offer plus staggered founder pricing. Final numbers are a
founder decision (HG-4). Depends on the pilot COGS data.

```yaml
role: role:cfo
parent_seat: role:cmo
agent: claude
mode: plan
workspace: registry:company-os
dispatch: manual
target_class: report-only
depends_on:
  - [WORK_ITEM_ID]
source_of_truth:
  - ${COMPANY_OS_ROOT}/metrics/agent-events.jsonl
  - ${COMPANY_OS_ROOT}/docs/operations/agent-event-ledger.md
  - ${COMPANY_OS_ROOT}/docs/strategy/autonomy-product-horizon.md
scope:
  - include a COGS-floored pricing analysis, a two-tier proposal with concrete numbers, an anchor rationale and a staggered intro-pricing plan.
  - exclude setting live prices, configuring Stripe, deploy and public publish.
acceptance_criteria:
  - Packet states the COGS floor from pilot data (or a placeholder plus exactly how the pilot fills it) and shows price-cannot-fall-below-COGS reasoning.
  - Packet proposes two tiers (included-credits versus higher-compute/done-for-you) with concrete monthly numbers.
  - Packet anchors price against the agency and cost-of-inaction, not against cheap SaaS tools, with rationale.
  - Packet proposes a staggered founder/early-adopter price that rises, tied to the rough early phase.
  - Packet is a founder decision card listing the open decisions the founder must make (final numbers, staggering).
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-05-29/selfserve-pricing.md --label role:cfo
  - Controller review, then founder decision (HG-4).
human_gate: HG-4
reporting: Plane worker.reported with pricing decision packet path, COGS floor, two-tier proposal, anchor rationale, staggering plan, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cfo/runtime
runtime_permission_mode: plan
blocked_actions: founder decides final price; do not set live prices, configure Stripe, deploy, publish or spend; do not write Plane Done.
reflection_policy: required
learning_proposal_policy: required
```
