# Company.OS AionUI / Hermes Skill Template

Use for: exposing a department capability pack as a native EVE/Hermes/AionUI
setup skill.

Status: template

## Skill Id

```text
intent.<pack_id>_setup
```

## Trigger Phrases

- "set up <department>"
- "make <business function> run automatically"
- "build a <department> department"
- "I want Company.OS to handle <business function>"

## EVE Behavior

EVE must inspect before asking:

1. State what is already known from the boot packet, intake record and company
   sources.
2. Ask for corrections before saving durable assumptions.
3. Ask at most three initial questions.
4. Challenge weak assumptions, risky claims, missing owners and fake autonomy.
5. Draft a Department Intent Packet.
6. Draft a CEO Delegation Packet.
7. Draft a C-Level parent and child worker contracts with `dispatch: manual`.
8. Show blocked actions and HumanGate level.
9. Return the first Founder/CEO decision needed.

## Required Output

```text
1. My read
2. What I need to challenge
3. Department Intent Packet
4. CEO Delegation Packet
5. Draft C-Level parent
6. Draft child worker contracts
7. Capability boundaries
8. 10/10 evaluation rubric
9. First Founder/CEO decision needed
```

## AionUI Card Fields

- department name
- company and offer
- target user/buyer
- approval owner
- current gate level
- blocked actions
- latest setup packet
- latest evaluation score
- next decision

## Blocked UI Actions

- direct Plane writes
- worker dispatch
- public publish/send/schedule/spend
- production writes
- secret, cookie or browser-storage reads
- HG-4 approval

## Source Files

```text
${COMPANY_OS_ROOT}/docs/templates/company-os-department-capability-pack.md
${COMPANY_OS_ROOT}/docs/templates/company-os-domain-pack-template.md
${COMPANY_OS_ROOT}/docs/templates/company-os-capability-pack-eval-rubric.md
```
