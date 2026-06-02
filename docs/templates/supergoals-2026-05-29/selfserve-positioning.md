# Positioning + 10 Landing-Page Outlines (Divergent)

Generate ten landing-page outlines across audiences, value framings and pitch
intensity for the micro-SME owner who wants outcomes, not tools. The constant is
Company.OS: structures created, Command EVE at your side, one accountable
partner. Diverge widely, then recommend the few bets worth actually testing.

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: research
workspace: registry:company-os
dispatch: manual
target_class: report-only
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/strategy/autonomy-product-horizon.md
  - ${COMPANY_OS_ROOT}/docs/templates/command-eve-installable-operator-shell-parent-worker-contract.md
scope:
  - include ten distinct landing-page outlines and a recommendation to converge on two or three positioning bets for the real test.
  - exclude building pages, registering domains, Stripe, deploy and any public publish.
acceptance_criteria:
  - Report contains ten outlines, each with audience, core promise, angle, pitch intensity (simple to technical) and the constant Command EVE value line.
  - Outlines span at least three audience perspectives and at least three value perspectives.
  - Report recommends two or three outlines to actually test and says why.
  - Report defines a funnel metric plan beyond signup: signup to activation to retention, not conversion alone.
  - Worker-ledger validation reports only contract.dispatch-not-ready while dispatch stays manual.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-05-29/selfserve-positioning.md --label role:cmo
  - Controller review of outlines before any page build.
human_gate: HG-2
reporting: Plane worker.reported with outlines report path, the recommended test bets, the funnel metric plan, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cmo/runtime
runtime_permission_mode: plan
blocked_actions: do not build or publish pages; no domain registration; no Stripe; no deploy; no spend; no Plane Done.
reflection_policy: required
learning_proposal_policy: required
```
