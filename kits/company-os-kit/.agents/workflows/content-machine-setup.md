# Content Machine Setup Workflow

Use this workflow when a founder, CEO, CMO or operator asks EVE to set up a
marketing pipeline, social content system or founder content machine.

## Department Intent Packet

```yaml
intent_id: intent.content_machine_setup
company:
approval_owner:
primary_channel:
audience:
offer:
fvbm_status: missing | M0 | M1 | M2 | M3
allowed_source_classes:
  - website
  - docs
  - manual_notes
first_safe_scope: local setup, source inventory, FVBM check, vault and raw brief
human_gate: HG-2.5 for publish/schedule/send; HG-4 for voice identity
```

## EVE Response Shape

1. My read
2. What I need to challenge
3. Existing context found
4. Missing inputs
5. Department Intent Packet
6. Source Inventory questions
7. FVBM/M0 decision
8. Start command
9. Draft parent contract
10. Draft child roster
11. First HumanGate decision needed

## Default Child Roster

- CMO parent setup and gate map
- CMO Source Inventory and Vault Scout
- CMO Research Dossier
- CMO Founder Interview and Raw Brief
- CMO Anchor Draft
- CMO Writer Council
- CMO Derivative Packager
- CAO Claim and Gate Review
- CMO Learning Loop

All children stay `dispatch: manual` until CEO/Codex approves Stage 0.5 and
Stage 0.65 readiness.

## Stop Rules

- Stop if FVBM is missing and the next step claims founder voice fidelity.
- Stop before reading optional source systems until Source Inventory approves
  source, scope, sensitivity and owner.
- Stop before release packets if council review has not passed.
- Stop before publish, upload, schedule, send or spend.
- Stop before durable memory write.
- Stop before HG-4 voice, strategic positioning or final publication decisions.
