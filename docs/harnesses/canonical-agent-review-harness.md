# Canonical Agent Review Harness

Status: normative Company.OS harness
Use for: self-review, controller review, CEO intent fit, autonomy trend review

## Purpose

This harness reconciles four previously separate review surfaces:

- agent self-review
- controller review
- CEO intent fit
- agent performance review

The central rule is simple:

```text
Review Verdict judges the work.
Autonomy Recommendation judges the agent's future permission level.
```

Do not mix those decisions. A run can pass and still get `RESTRICT` if the
process was reckless. A run can be blocked and still get `KEEP` if the agent
found the right gate and stopped correctly.

## Who Uses It

| Role | Use |
|---|---|
| Worker | fills self-review as evidence |
| Controller | issues the authoritative review verdict |
| CEO / Orchestrator | decides sequencing, rework and human-gate surface |
| C-level RoleOwner | uses findings to improve charters, SOPs and worker contracts |
| HumanGateOwner | releases or rejects non-delegable gates |

Workers may self-review. Workers may not self-promote, mark work done, release
human gates, or write durable memory.

## When It Runs

Run this harness:

- after every L2/L3 agent run
- after any important C-level plan, audit, implementation or report
- before autonomy promotion or restriction
- after incidents, missed gates, bad audits or noisy reporting
- before updating SOPs, skills, harnesses, evals or controller gates

## Canonical Review Verdict

`ReviewVerdict` answers: what should happen to this piece of work now?

| Verdict | Meaning | Allowed Next Action |
|---|---|---|
| `PASS` | Acceptance criteria and gates are met; no human gate remains. | Close slice or dispatch dependent work. |
| `NEEDS_REWORK` | The work is useful but does not yet meet the bar. | Create a narrower rework slice. |
| `BLOCKED` | Work cannot proceed because required source, auth, dependency, permission or evidence is missing. | Resolve blocker or park. |
| `NEEDS_HUMAN` | A non-delegable judgment or gate remains. | HumanGateOwner decides. |
| `REJECT` | Work is unsafe, out of scope, misleading or not salvageable as a slice. | Stop, document cause, restart with new contract if needed. |

Auto-block rules:

- `ceo_would_accept: uncertain | no` forces `NEEDS_HUMAN`.
- Missing source of truth forces `NEEDS_HUMAN` or `BLOCKED`.
- Missing required gate evidence forces `NEEDS_REWORK` or `BLOCKED`.
- Any required legal, medical, production, spend, publishing, merge or external
  send gate forces `NEEDS_HUMAN`.
- Worker self-promotion forces controller concern and cannot produce `PASS`
  without independent controller review.

## Autonomy Recommendation

`AutonomyRecommendation` answers: should this agent's future permission level
change?

| Recommendation | Meaning |
|---|---|
| `PROMOTE` | Candidate for a narrow autonomy increase after repeated proof. |
| `KEEP` | Current autonomy is appropriate. |
| `RESTRICT` | Reduce autonomy or require tighter controller gates. |
| `RETRAIN` | Keep low autonomy and patch SOP, skill, prompt or harness. |
| `RETIRE` | Stop using this agent/role for this work type. |
| `NO_CHANGE` | Review did not evaluate autonomy. |

Never use autonomy recommendation as the work verdict.

## Score Pattern

Each dimension is scored 0, 1 or 2.

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| Outcome Quality | wrong or unusable | partly useful | meets acceptance criteria |
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

CEO intent fit is scored separately because it can override the operational
score.

## Score Bands

| Operational Score | Meaning | Default Action |
|---:|---|---|
| 0-10 | Fail | `REJECT`, `BLOCKED` or `NEEDS_REWORK`; consider `RESTRICT`. |
| 11-15 | Weak | Rework or retrain; keep low autonomy. |
| 16-18 | Acceptable | Keep current autonomy. |
| 19-20 | Strong | Candidate for narrow autonomy increase after repeated proof. |
| 21-22 | Excellent | Promotion candidate after repeated proof and low gate noise. |

The score band does not override auto-block rules.

## CEO Intent Fit

CEO intent fit answers whether the work matches the CEO's expected decision
style, quality bar and risk posture.

| Field | Values |
|---|---|
| `ceo_intent_fit_score` | 0-14 |
| `ceo_would_accept` | `yes | probably | uncertain | no` |
| `likely_ceo_reaction` | free text |
| `expected_ceo_objection` | free text |
| `required_change_before_approval` | free text |

Private implementations may alias `ceo_would_accept` to a founder-specific
field, but the generic Company.OS field is `ceo_would_accept`.

Auto-block:

```text
If ceo_would_accept is uncertain or no, ReviewVerdict is NEEDS_HUMAN.
```

`probably` is not a pass by itself. The controller must state what would pass,
what would fail and what rework is needed.

## Calibration Gap

The self-review is evidence. The controller review is authority.

Formula:

```text
calibration_gap = total_self_score - total_controller_score
```

Interpretation:

| Gap | Meaning |
|---:|---|
| `>= 4` | overconfident; controller should inspect missed weaknesses |
| `1..3` | mildly overconfident |
| `0` | calibrated |
| `-1..-3` | mildly underconfident |
| `<= -4` | underconfident; agent may be missing real strengths |

For per-dimension gaps:

```text
dimension_gap = self_dimension_score - controller_dimension_score
```

Any dimension gap of `2` must be explained in the controller review.

## Root Cause Categories

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

## Output Contract

Every authoritative controller review must end with:

```markdown
ReviewVerdict: PASS | NEEDS_REWORK | BLOCKED | NEEDS_HUMAN | REJECT
AutonomyRecommendation: PROMOTE | KEEP | RESTRICT | RETRAIN | RETIRE | NO_CHANGE

total_self_score:
total_controller_score:
calibration_gap:

ceo_intent_fit_score:
ceo_would_accept: yes | probably | uncertain | no
customer_ship: embarrassing | usable internally | shippable

likely_ceo_reaction:
expected_ceo_objection:
required_change_before_approval:

top_strength:
top_weakness:
controller_concern:
root_cause:
required_rework:

sop_skill_harness_eval_change:
memory_update_policy: none | proposal-only | controller-approved
next_linear_action:
human_gate_needed:
```

## Canonical Event

Controller reviews should emit or be reducible to one machine-readable event:

The complete event row, payload and reducer contract lives in
`docs/operations/agent-event-ledger.md`. The object below is the
`payload` shape for `event_type: controller.verdict`.

```json
{
  "review_verdict": "NEEDS_REWORK",
  "autonomy_recommendation": "KEEP",
  "total_self_score": 18,
  "total_controller_score": 15,
  "calibration_gap": 3,
  "ceo_intent_fit_score": 9,
  "ceo_would_accept": "uncertain",
  "customer_ship": "usable internally",
  "root_cause": ["gate missing", "evidence quality"],
  "human_gate_needed": true,
  "report_path": "/absolute/path/to/controller-review.md"
}
```

## Improvement Loop

```text
Agent Self Review
-> Controller Review
-> Calibration Gap
-> Root Cause
-> ReviewVerdict
-> AutonomyRecommendation
-> SOP / Skill / Harness / Eval / Issue Contract Patch
-> Next Run
-> Trend Review
```

## Human Gates

Stop before:

- production writes or migrations
- schema, RLS, auth, service-role or permission changes
- deploy, merge, release, push or public publishing
- medical, legal, financial, safety or regulated claims
- customer-impacting behavior changes
- new spend or paid API activation
- durable memory writes by workers
- direct execution-ledger `Done`
- autonomy increase

Controllers may recommend. Only the named `HumanGateOwner` or delegated human
authority can release these gates.
