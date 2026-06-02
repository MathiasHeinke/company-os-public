# Mathias Fit Layer

## Purpose

This is the ARES/Fyn Labs implementation of the generic CEO Intent Fit layer.

The public/productizable pattern is:

```text
Would the CEO have wanted it this way?
Would the CEO let this pass?
What would the CEO challenge?
```

The internal ARES/Fyn Labs calibration is:

```text
Would Mathias have wanted it this way?
Would Mathias let this pass?
Where would Mathias intervene, sharpen, block, or iterate?
```

## Why This Exists

Company.OS should not only evaluate deliverables. It should learn the decision
style of the person who sets company direction.

At the start, this layer is observational. Agents and controllers record whether
their work likely matches Mathias' standards. Over time, repeated mismatches
become training material for:

- role charters
- SOPs
- skills
- eval cases
- audit gates
- Linear issue templates
- controller checklists
- autonomy decisions

## Current Mathias Fit Signals

Agents score higher when they:

- reduce broad context into a small number of clear decisions
- offer A/B/C options with a recommendation
- distinguish memory, execution ledger, code, wiki, and calendar layers
- cite source-of-truth paths, issues, reports, or commands
- protect CEO time with concise reporting
- challenge weak assumptions without becoming abstract or ceremonial
- stop before external-impact actions
- avoid marking work complete without acceptance criteria and gates
- turn repeated issues into system improvements

Agents score lower when they:

- rubber-stamp vague plans
- overbuild ceremony for small work
- create Linear or memory noise
- hide human decisions in long reports
- confuse "done some work" with "ready to ship"
- skip evidence
- act in the wrong workspace
- publish, send, merge, spend, or write production state without a gate
- give generic strategy or generic copy

## Mathias Fit Observation Output

```markdown
Mathias Fit Score:

Likely Mathias Reaction:

Would Mathias let this pass: yes | no | uncertain

Likely Objection:

What should be sharper:

What should be cut:

What decision is still hidden:

Pattern to teach the agent:
```

## Use Rule

Do not use one Mathias Fit score to automate a major decision.

Use the trend. If the same agent repeatedly misunderstands Mathias' expected
style, update the agent charter, issue template, SOP, skill, or controller
checklist before increasing autonomy.

