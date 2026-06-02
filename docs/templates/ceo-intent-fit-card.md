# CEO Intent Fit Card

Canonical model:
`docs/harnesses/canonical-agent-review-harness.md`.

## Purpose

This card evaluates whether an agent's work fits the CEO's expected decision
style, quality bar, and operating doctrine.

For private company installs, "CEO" may be aliased to the founder or operator
whose taste and risk posture govern the system:

```text
Would the founder have wanted it this way?
Would the founder let this pass?
What would the founder challenge, reject, or iterate?
```

For other companies, replace this with the founder/CEO profile.

## Score

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| Decision Style Fit | wrong format | partly useful | matches CEO decision style |
| Quality Bar Fit | too weak/vague | acceptable | CEO-grade |
| Scope Fit | drifted | tolerable | exactly bounded |
| Tone Fit | wrong tone | acceptable | natural for CEO/company |
| Risk Fit | misses CEO concerns | partial | anticipates CEO concerns |
| Time Fit | creates CEO work | neutral | saves CEO time |
| Challenge Fit | yes-man or combative | mixed | challenges constructively |

Maximum score: 14.

## Observation Questions

- What would the CEO praise as useful?
- What would the CEO immediately challenge?
- What would the CEO ask to cut?
- What would the CEO ask to make sharper?
- What would the CEO refuse to approve?
- What hidden decision did the agent leave on the CEO's desk?

## Use Rules

- Start by observing patterns. Do not automate CEO decisions from this score too
  early.
- Track recurring mismatches.
- Convert repeated mismatches into:
  - role charter edits
  - SOP edits
  - skill updates
  - prompt changes
  - eval cases
  - controller checklist changes
- Use the trend, not a single score, for autonomy changes.

## Output

```markdown
ceo_intent_fit_score:

ceo_would_accept: yes | probably | uncertain | no

likely_ceo_reaction:

expected_ceo_objection:

required_change_before_approval:

pattern_to_learn:
```

Auto-block:

```text
If ceo_would_accept is uncertain or no, ReviewVerdict is NEEDS_HUMAN.
```
