# Company.OS Customer Support KB Department Pack v0

Status: scaffolded guided-pilot template
Use for: creating a reusable department capability pack with explicit SOP, worker contracts, capability boundaries, gates and learning loop.

## Purpose

Customer Support KB supports the customer-support-kb domain as a guided Company.OS department pack. It starts as draft-only and cannot perform public, production, spend or scheduling actions without HumanGate release.

## Trigger / Intent

```yaml
intent_id: intent.customer_support_kb_setup
trigger_phrases:
  - set up Customer Support KB
  - build a Customer Support KB department
first_safe_scope: guided setup packet, parent contract and child contract drafts
```

## Founder Intake

- company, offer, buyer and primary user
- current systems and source-of-truth artifacts
- approval owner
- off-limits claims, actions and data
- desired cadence and success signal

## CEO Delegation Packet

```yaml
objective: Create the Customer Support KB guided department capability pack.
recommended_release_band: guided alpha
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-department-capability-pack.md
owner_role: role:coo
human_gate: HG-2.5
blocked_actions:
  - no production write without release card
  - no public publish/send/schedule without release card
  - no secret read
  - no Plane Done transition by worker or CAO
```

## C-Level Parent Contract

Use the generated parent worker contract template. Keep `dispatch: manual` until Stage 0.5 and Stage 0.65 pass.

## Child Worker Contract List

- parent setup and scope synthesis
- research/current-state audit
- draft artifact production
- CAO/controller evaluation packet

## CapabilityProfile Requirements

Use `claude-clevel-worker/cto/department-capability-pack-creator` unless a narrower role-specific profile is approved.

## Allowed / Forbidden Surfaces

Allowed: docs, templates, local reports, dry-run evidence and proposal-only learning notes.
Forbidden: secrets, production writes, public publish/send/schedule/spend, connector expansion and Done transitions.

## HumanGates

- HG-2 setup artifacts
- HG-2.5 bounded pack promotion
- HG-3 critical reversible scheduler/runtime authority
- HG-4 strategic or non-restorable authority

## Quality Gates

- worker contract parseability
- capability profile registration
- private/source literal scan
- deterministic evaluator scorecard

## Evidence Artifacts

- reports/examples/customer-support-kb-pack/README.example.md
- reports/examples/department-pack-creator/customer-support-kb-evaluation.example.md

## Learning Loop

Workers may propose SOP, skill, harness or rubric improvements. CAO/controller review is required before the pack self-modifies or expands authority.

## Autonomy Promotion Path

L0 inspect -> L1 draft -> L2 dry-run -> L2.5 bounded promotion -> L3 critical reversible runtime after proof history -> L4 Founder decision.

## 10/10 Evaluation Rubric

Use `${COMPANY_OS_ROOT}/docs/templates/company-os-capability-pack-eval-rubric.md`.
