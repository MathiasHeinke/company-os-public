# Controller Review Workflow

Use when reviewing how an agent worked, not only what it produced.

## Required Inputs

- Source of truth.
- Linear issue or assigned task.
- Agent output artifact.
- Agent self-review card.
- Relevant gates and acceptance criteria.
- Agent-run ledger row when available.

## Procedure

1. Read source of truth and assigned scope.
2. Read output artifact.
3. Read self-review.
4. Read run ledger row if one exists.
5. Score each 0-2 dimension from the Agent Performance Review Harness.
6. Score `customer_ship`.
7. Compare self-score and controller-score.
8. Identify calibration gaps.
9. Classify root cause.
10. Set `mathias_let_this_pass`.
11. Write what Mathias would likely say, what would fail his quality bar, why,
    and what rework is required.
12. Recommend one of: PROMOTE, KEEP, RESTRICT, RETRAIN, RETIRE, NEEDS-HUMAN.
13. Propose SOP, skill, harness, eval, or Linear follow-up changes.

## Output Contract

Use `docs/templates/controller-review-card.md`.

Required fields:

- `mathias_let_this_pass: yes | probably | uncertain | no`
- `customer_ship: embarrassing | usable internally | shippable`
- `what_mathias_would_say`
- `mathias_quality_bar`
- `would_fail_because`
- `required_rework`
- numeric calibration gap
- source path or Linear ID
- exact next action

## Auto-Block Rules

- If `mathias_let_this_pass` is `uncertain` or `no`, verdict is `NEEDS-HUMAN`.
- If source-of-truth is missing, verdict is `NEEDS-HUMAN`.
- If the task required a human gate and no approval is recorded, verdict is
  `NEEDS-HUMAN`.
- If the agent tries to promote itself, verdict cannot be `PROMOTE`.

## Non-Negotiables

- Do not change autonomy directly.
- Do not mark Linear `Done`.
- Do not write persistent memory unless the conclusion is stable and approved.
- Do not convert projected score into actual score without ledger evidence.
