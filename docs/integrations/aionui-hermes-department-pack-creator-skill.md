# AionUI / Hermes Department Capability Pack Creator Skill

Status: Company.OS native EVE skill contract
Owner: CEO/Codex with CTO execution boundary
CapabilityProfile: `claude-clevel-worker/cto/department-capability-pack-creator`

## Purpose

Use this skill when a founder, CEO, EVE or Hermes asks to create a new Company.OS capability, skill, department, worker group, SOP, domain pack or automation lane.

The output is not a loose prompt. The output is a reusable Department Capability Pack with SOP, domain setup, AionUI/Hermes skill seed, parent/child worker contracts, capability boundaries, learning loop and deterministic 10/10 evaluation.

## Trigger Phrases

```yaml
intent_id: intent.department_capability_pack_creator
trigger_phrases:
  - create a new Company.OS skill
  - build a new department pack
  - set up a department capability
  - teach Hermes a new capability
  - build worker contracts for this capability
  - turn this workflow into an autonomous department
first_safe_scope: founder intent packet, CEO delegation packet, scaffold dry-run and 10/10 evaluator report
```

## Required Inputs

- company or client domain this capability serves
- desired outcome and first useful artifact
- owning C-Level role
- source-of-truth artifacts
- required workers and expected handoffs
- allowed read/write surfaces
- blocked actions, compliance risks and HumanGate owner
- initial evidence strategy and eval gates

## EVE Response Contract

When the operator asks for a new skill or department, EVE must return:

1. My read
2. What I need to challenge
3. Department Intent Packet
4. CEO Delegation Packet
5. Pack scaffold command
6. Draft C-Level parent contract
7. Draft child worker roster
8. CapabilityProfile boundary
9. 10/10 evaluation plan
10. First Founder/CEO decision needed

## Scaffold Command

```bash
node scripts/orchestration/company-os-department-pack-scaffold.mjs \
  --pack-id "<pack-id>" \
  --name "<Human Name>" \
  --owner-role role:cto \
  --client-domain "<client-domain>" \
  --date YYYY-MM-DD \
  --json
```

Use `--write` only after CEO/Codex accepts the intent packet and source-of-truth boundary.

## Evaluation Command

```bash
node scripts/orchestration/company-os-department-pack-evaluator.mjs \
  --pack-id "<pack-id>" \
  --date YYYY-MM-DD \
  --json
```

The pack is not accepted unless every discipline scores 10/10, or a 9/10 gap has evidence, an external constraint, and a follow-up worker contract. Scores below 9 are not acceptable for release.

## Required Artifacts

- `docs/orchestration/company-os-<pack-id>-department-pack-v0.md`
- `kits/company-os-kit/.company-os/domain-packs/<pack-id>/setup.md`
- `kits/company-os-kit/.agents/workflows/<pack-id>-setup.md`
- `docs/integrations/aionui-hermes-<pack-id>-skill.md`
- `docs/templates/company-os-<pack-id>-parent-worker-contract.md`
- `docs/templates/company-os-<pack-id>-research-worker-contract.md`
- `docs/templates/company-os-<pack-id>-draft-worker-contract.md`
- `reports/examples/<pack-id>-pack/README.example.md`
- `reports/examples/department-pack-creator/YYYY-MM-DD/<pack-id>-evaluation.example.md`
- `reports/examples/department-pack-creator/YYYY-MM-DD/<pack-id>-evaluation.example.json`

## 10/10 Disciplines

- Founder Intent Fit
- Department SOP
- Parent/Child Contracts
- Capability Boundary
- Quality Gates
- EVE/AionUI/Hermes UX
- Learning Loop
- Portability
- Autonomy Promotion
- Evidence Completeness

## Blocked Actions

- no worker dispatch from EVE
- no `dispatch: ready` during scaffold
- no production write
- no public publish, send, schedule or spend
- no connector expansion without controller review
- no secret read
- no direct memory write
- no Plane Done transition by worker or CAO
- no HG-4 approval

## Learning Loop

Hermes and workers may propose improvements to SOPs, skills, templates, rubrics, eval harnesses and capability profiles. Those proposals must be reported as `learning_proposals` and reviewed by CAO/controller plus CEO/Codex before becoming doctrine.

## Autonomy Promotion

```text
L0 inspect
L1 draft artifacts
L2 local dry-run and evaluator proof
L2.5 bounded pilot after HG-2.5
L3 reversible scheduler/runtime after repeated green proof and HG-3
L3.5 controller challenge if CEO sees blockers
L4 Founder decision for public, strategic or non-restorable authority
```

The creator itself remains at L2 by default. It creates the pack and proof, not the autonomous production runtime.
