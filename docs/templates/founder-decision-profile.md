# Founder Decision Profile

Use for: calibrating controller recommendations, HumanGate cards, autonomy
decisions, CEO intent fit reviews and morning briefs.

## Purpose

Company.OS should not ask the founder to re-explain their judgment on every
similar decision.

This profile captures observed founder decision patterns in a reusable, auditable
format. It does not replace the founder. It lets the CEO/controller estimate
what the founder would probably approve, where confidence is high enough to
recommend a small reversible next step, and where a sharper HumanGate question is
required.

## Boundaries

This profile is not permission to bypass human gates.

Use it to improve:

- controller recommendations
- `founder_prediction`
- `founder_prediction_confidence`
- HumanGate sizing (`HG-1`, `HG-2`, `HG-3`)
- autonomy recommendations
- worker issue contracts
- eval cases and controller checklists

Never use it to auto-approve:

- production writes
- schema, RLS, auth, service-role or permission changes
- public/legal/medical/Rx claims
- spend beyond approved caps
- final merge, release, deploy or `Done`
- irreversible customer-impacting changes

## Profile

```yaml
founder_decision_profile:
  founder_role: Founder
  decision_language: ""
  current_confidence: 0.0 # 0.0-1.0
  confidence_basis:
    - ""

  default_bias:
    risk_posture: conservative | balanced | aggressive | context-dependent
    speed_vs_safety: speed | balanced | safety | context-dependent
    autonomy_preference: low | medium | high | earned-by-evidence
    reversibility_preference: required | preferred | optional
    evidence_preference: concise | detailed | visual | mixed
    challenge_preference: direct | diplomatic | adversarial | mixed

  decision_patterns:
    - pattern: ""
      observed_in:
        - ""
      founder_likely_prefers: ""
      founder_likely_rejects: ""
      confidence: 0.0
      last_updated: YYYY-MM-DD

  hard_stops:
    - ""

  delegated_autonomy:
    hg0_allowed:
      - ""
    hg1_allowed_with_card:
      - ""
    hg2_requires_brief:
      - ""
    hg3_requires_dossier:
      - ""

  learning_loop:
    update_when:
      - founder overrides controller recommendation
      - founder approves with recurring conditions
      - founder rejects because the decision surface was wrong
      - controller confidence was below 0.70
      - controller confidence was high but founder disagreed
    update_artifacts:
      - controller checklist
      - worker issue contract
      - HumanGate template
      - eval case
      - autonomy recommendation
```

## Controller Use

Before asking for a HumanGate release, the controller should answer:

- What do I predict the founder will choose?
- What evidence supports that prediction?
- What would be the cost if that prediction is wrong?
- Is the next step reversible?
- Is my confidence at least `0.70`?

If confidence is below `0.70`, do one of these:

- ask a sharper question
- reduce the next step to a smaller reversible gate
- run a read-only audit
- create a short Decision Card instead of a broad implementation request

## Output Snippet

Use this inside HumanGate cards and controller review cards:

```yaml
founder_prediction:
  expected_decision: GO | GO_MIT_AUFLAGEN | NO_GO | PARKEN
  confidence: 0.0
  basis:
    - ""
  likely_condition:
    - ""
  likely_objection:
    - ""
  if_wrong_consequence: ""
  next_learning_update: ""
```

## Maintenance Rule

Every time the founder corrects the controller, the correction is a learning
event. The controller must decide whether to update:

- this profile
- the HumanGate template
- the CEO intent fit card
- the worker issue contract
- the relevant eval/checklist

Do not store private raw chat logs in a reusable/public Company.OS repo. Store
private examples only in the local company implementation layer.
