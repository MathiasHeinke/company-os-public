# Pilot Program (Max Kuester Channel) + Real COGS Measurement

Design a supported pilot for three to five micro-SMEs via the Max Kuester sales
channel, and a concrete method to measure the real per-active-customer monthly
LLM cost. Warm, supported pilots de-risk the rough early phase and produce the
COGS data the pricing decision needs. The worker designs the program; the
founder runs the actual outreach.

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: plan
workspace: registry:company-os
dispatch: manual
target_class: report-only
source_of_truth:
  - ${COMPANY_OS_ROOT}/metrics/agent-events.jsonl
  - ${COMPANY_OS_ROOT}/metrics/agent-runs.jsonl
  - ${COMPANY_OS_ROOT}/docs/operations/agent-event-ledger.md
  - ${COMPANY_OS_ROOT}/docs/strategy/autonomy-product-horizon.md
scope:
  - include a pilot playbook, a supported-onboarding script and a per-customer COGS measurement method using the existing metrics ledgers.
  - exclude actual customer or Max outreach, public commitments, deploy, Stripe and any spend; the founder runs outreach.
acceptance_criteria:
  - Pilot playbook defines target profile, three to five pilot slots via the Max channel, supported-onboarding steps and success/activation metrics.
  - COGS method specifies which metrics rows attribute compute to a customer and how to compute per-active-customer monthly LLM cost.
  - Report states how pilot data feeds the pricing decision (sibling selfserve-pricing).
  - Report contains no secrets, raw customer data or private contact details.
  - Worker-ledger validation reports only contract.dispatch-not-ready while dispatch stays manual.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-05-29/selfserve-pilot.md --label role:cmo
  - Controller review; founder approves before any real outreach.
human_gate: HG-3
reporting: Plane worker.reported with pilot playbook path, COGS measurement method, hand-off to pricing, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cmo/runtime
runtime_permission_mode: plan
blocked_actions: no customer or Max outreach; no public commitments; no onboarding of real users; no deploy, Stripe, spend or Plane Done; outreach is founder-led.
reflection_policy: required
learning_proposal_policy: required
```
