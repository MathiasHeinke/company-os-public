# Company.OS Capability Pack Evaluation Rubric

Use for: scoring department capability packs before guided use, public release
or autonomy promotion.

Status: template

## Release Rule

`READY` requires every discipline to score `10/10`.

`PASS_WITH_JUSTIFIED_GAP` is allowed only when every non-10 discipline is at
least `9/10` and has all of:

```yaml
score:
missing_point:
why_10_is_not_currently_possible:
evidence_path:
follow_up_contract:
```

Anything below 9, any missing justification field or any missing evidence path
is `BLOCKED`.

## Disciplines

| Discipline | 10/10 Requirement |
|---|---|
| Founder Intent Fit | EVE maps messy founder language to a clear intent packet, asks only missing questions and challenges weak assumptions. |
| Department SOP | C-Level owner, workflow, handoffs, blocked actions and escalation path are explicit. |
| Parent/Child Contracts | Parent and every child have parseable flat Worker Issue Contracts with source, scope, acceptance, gates and reporting. |
| Capability Boundary | CapabilityProfile declares tools, commands, workspaces, connectors, memory, write paths and HumanGates. |
| Quality Gates | Deterministic gates reject incomplete output, missing evidence, unsafe claims and false completion. |
| EVE/AionUI/Hermes UX | Native skill card guides setup, exposes blockers and produces CEO-ready packets. |
| Learning Loop | Reflection, learning proposals, CAO/controller review and SOP/skill patch path exist. |
| Portability | Uses placeholders and client roots; contains no private paths, secrets or source-company assumptions. |
| Autonomy Promotion | L0->L3/L4 path has dry-run, pilot, monitor, rollback and HumanGate conditions. |
| Evidence Completeness | Example reports, scorecards, tests and Artifact Truth make the pack independently auditable. |

## Required Evidence

```yaml
discipline:
score:
evidence_paths:
  - ""
checks:
  - id:
    status: pass | block
    message:
justification:
  missing_point:
  why_10_is_not_currently_possible:
  follow_up_contract:
```

## Default Blockers

- missing EVE/Hermes skill
- missing department SOP
- missing domain pack registry entry
- missing parent or child Worker Issue Contract
- missing CapabilityProfile
- private path, secret or source-company literal
- public/production/daily autonomy without dry-run, pilot, monitor and rollback
- score below 10 without complete justification
- score below 9 even with justification
