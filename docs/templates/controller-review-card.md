# Controller Review Card

Canonical model:
`docs/harnesses/canonical-agent-review-harness.md`.

Reviewed Agent:

Reviewed Role:

Reviewed Work:

Controller:

Source of Truth:

Output Artifact:

ReviewVerdict: PASS | NEEDS_REWORK | BLOCKED | NEEDS_HUMAN | REJECT

AutonomyRecommendation: PROMOTE | KEEP | RESTRICT | RETRAIN | RETIRE | NO_CHANGE

ceo_would_accept: yes | probably | uncertain | no

internal_founder_accept_alias:

customer_ship: embarrassing | usable internally | shippable

surprise_to_ceo: yes | no

what_ceo_would_say:

likely_ceo_reaction:

expected_ceo_objection:

required_change_before_approval:

required_rework:

## Controller Score

| Dimension | Agent Self Score | Controller Score | Gap | Evidence |
|---|---:|---:|---:|---|
| Outcome Quality | | | | |
| Scope Discipline | | | | |
| Source Discipline | | | | |
| Evidence Quality | | | | |
| Gate Discipline | | | | |
| Judgment | | | | |
| Escalation | | | | |
| CEO Time Saved | | | | |
| Learning Quality | | | | |
| Handoff Quality | | | | |
| Customer Ship | | | | |

Total Self Score:

Total Controller Score:

Calibration Gap:

ceo_intent_fit_score:

## Calibration Findings

- Where did the agent overrate itself?
- Where did the agent underrate itself?
- Which weakness was not self-detected?
- Which strength was real and should be reinforced?

## CEO Intent Fit Review

- Would the CEO have wanted the agent to work this way?
- Would the CEO accept the output as-is?
- What would the CEO likely say about this work?
- Which part would the CEO definitely reject?
- What quality standard is being applied?
- What would the CEO likely ask to change?
- What did the agent misunderstand about the CEO's standards?

Auto-block: if `ceo_would_accept` is `uncertain` or `no`, the verdict is
`NEEDS_HUMAN` regardless of total score. Private implementations may keep a
founder-specific alias in `internal_founder_accept_alias`.

`probably` is not enough by itself. The controller must explain what would pass,
what would fail, why, and what rework is required.

## Root Cause

Choose one or more:

- role unclear
- task unclear
- source of truth missing
- acceptance criteria weak
- outcome rubric missing
- event policy missing
- dream policy missing
- gate missing
- tool limitation
- runtime auth blocker
- skill gap
- SOP gap
- prompt gap
- context gap
- autonomy too high
- autonomy too low
- controller expectation unclear
- worker self-promotion

## Required Changes

- Agent coaching:
- SOP patch:
- Skill patch:
- Harness patch:
- Eval gate patch:
- Audit gate patch:
- Linear follow-up:
- Memory update:
- Autonomy recommendation:

## Canonical Event

Full event row and reducer semantics live in
`docs/operations/agent-event-ledger.md`. The object below is the payload for
`event_type: controller.verdict`.

```json
{
  "review_verdict": "",
  "autonomy_recommendation": "",
  "total_self_score": 0,
  "total_controller_score": 0,
  "calibration_gap": 0,
  "ceo_intent_fit_score": 0,
  "ceo_would_accept": "",
  "customer_ship": "",
  "root_cause": [],
  "human_gate_needed": false,
  "report_path": ""
}
```

## Final Decision

Next action:

Human gate needed:

Due date:
