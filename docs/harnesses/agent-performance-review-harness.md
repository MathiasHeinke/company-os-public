# Agent Performance Review Harness

Canonical model:
`docs/harnesses/canonical-agent-review-harness.md`.

## Purpose

This harness evaluates how an agent worked, not only what the agent produced.

It exists because output quality gates are not enough. A strong artifact can
come from weak process. A blocked task can still be strong work if the agent
found the right risk and stopped correctly.

## Cadence

Run this harness:

- after every important agent run
- at the end of each working day for active C-level agents
- before autonomy promotion or restriction
- after incidents, bad audits, missed gates, or noisy reporting
- before updating SOPs, skills, evals, and audit gates

## Review Roles

### Agent Self Review

The agent evaluates its own work first.

The goal is reflection, not promotion. The self-review is evidence for the
controller, not an authority decision. Self-review may propose a
`ReviewVerdict`, but only controller review is authoritative.

### Controller Review

The controller independently evaluates the same work.

The controller owns:

- authoritative `ReviewVerdict`
- calibration gaps
- missed weaknesses
- overconfidence detection
- underconfidence detection
- root cause classification
- improvement proposals
- autonomy recommendation

### CEO Intent Fit Review

For CEO-level and C-level work, add a separate intent-fit question:

```text
Would the CEO have wanted it this way?
```

For private company installs this can be specialized to the founder or operator:

```text
Would the founder have wanted it this way, and would they let this pass?
```

This layer is a required controller gate for CEO-level and C-level work. It
starts conservative: `uncertain` or `no` forces `NEEDS_HUMAN` regardless of the
numeric score.

## Canonical Verdict Separation

Do not mix work verdict and future autonomy.

```text
ReviewVerdict judges the work.
AutonomyRecommendation judges future permission level.
```

Canonical `ReviewVerdict`:

```text
PASS | NEEDS_REWORK | BLOCKED | NEEDS_HUMAN | REJECT
```

Canonical `AutonomyRecommendation`:

```text
PROMOTE | KEEP | RESTRICT | RETRAIN | RETIRE | NO_CHANGE
```

## Score Pattern

Each dimension is scored 0, 1, or 2.

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| Outcome Quality | unusable or wrong | partly useful | meets acceptance criteria |
| Scope Discipline | drifted or overbuilt | mostly scoped | precise include/exclude |
| Source Discipline | no source of truth | partial source | exact source path/link/issue |
| Evidence Quality | assertions | partial proof | reproducible proof |
| Gate Discipline | skipped gates | named gates | enforced gates and stopped when needed |
| Judgment | naive or reactive | acceptable | anticipates tradeoffs and consequences |
| Escalation | hid decisions | weak escalation | exact human decision requested |
| CEO Time Saved | created more work | neutral | reduced decision load |
| Learning Quality | no self-diagnosis | generic learning | concrete improvement proposed |
| Handoff Quality | vague status | usable report | next agent can continue cleanly |
| Customer Ship | embarrassing | usable internally | shippable to a paying customer |

Maximum operational score: 22.

## Score Bands

| Score | Meaning | Action |
|---|---|---|
| 0-10 | Fail | reject, block, rework, or restrict autonomy |
| 11-15 | Weak | keep low autonomy, improve SOP/skill |
| 16-18 | Acceptable | keep current autonomy |
| 19-20 | Strong | candidate for narrow autonomy increase |
| 21-22 | Excellent | promotion candidate after repeated proof |

## CEO Intent Fit Subscore

The CEO Intent Fit score is tracked separately from the operational score.

It answers:

- Did the agent understand what the CEO values?
- Did the agent match preferred decision style?
- Did the agent avoid known anti-patterns?
- Did the agent protect CEO time?
- Did the agent know when not to act?
- Did the agent frame the next decision correctly?
- What would the CEO likely say if reviewing this work live?
- Which part would the CEO definitely reject, and why?
- What quality standard is being applied?

Use `docs/templates/ceo-intent-fit-card.md` for the detailed fit review.

Required generic gate field:

```text
ceo_would_accept: yes | probably | uncertain | no
```

Private implementations may include a founder-specific alias, but
`ceo_would_accept` is the canonical Company.OS field.

Auto-block rule:

```text
If ceo_would_accept is uncertain or no, ReviewVerdict is NEEDS_HUMAN.
```

## Required Output

Every review must end with:

```markdown
ReviewVerdict: PASS | NEEDS_REWORK | BLOCKED | NEEDS_HUMAN | REJECT
AutonomyRecommendation: PROMOTE | KEEP | RESTRICT | RETRAIN | RETIRE | NO_CHANGE

total_self_score:
total_controller_score:
calibration_gap:

ceo_intent_fit_score:
ceo_would_accept:
customer_ship:

likely_ceo_reaction:
expected_ceo_objection:
required_change_before_approval:

required_rework:

top_strength:
top_weakness:
controller_concern:
root_cause:
sop_skill_harness_eval_change:
next_linear_action:
human_gate_needed:
```

## Root Cause Categories

When performance is weak, classify the cause:

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

## Improvement Loop

The controller turns review findings into system updates:

```text
Self Review
-> Controller Review
-> Calibration Gap
-> Root Cause
-> ReviewVerdict
-> AutonomyRecommendation
-> SOP / Skill / Harness / Eval Patch
-> Next Run
-> Trend Review
-> Autonomy Decision
```

## Non-Negotiables

- Agents can self-review but cannot self-promote.
- A controller can recommend autonomy changes but should not silently apply them
  if the change affects external impact, production systems, budget, or final
  issue status.
- The CEO Intent Fit gate overrides the numeric score when the answer is
  `uncertain` or `no`.
- The controller must name the actual critique, not only the pass likelihood.
  "Probably" without why, quality bar, and rework instruction is insufficient.
- Bad output with honest self-diagnosis is better than bad output with confident
  concealment.
- Repeated calibration gaps must become training data or role changes.
- Controller reviews should emit or be reducible to a `controller.verdict`
  event as defined in `docs/operations/agent-event-ledger.md`.
