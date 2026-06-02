# EVE Chief-of-Staff Growth Review

Status: canonical review-loop proposal
Date: 2026-05-27
Use for: improving EVE over time without letting EVE self-promote, rewrite its
own soul, or mutate durable memory without review.

## Purpose

EVE uses Hermes and Honcho as a learning and memory substrate. That is useful,
but it is not enough governance.

The EVE Chief-of-Staff Growth Review adds a second layer above native memory:
every few weeks, the Founder, EVE and CEO/Controller review how EVE behaved as
Chief of Staff and decide what should improve.

The review asks:

```text
Is EVE helping the Founder move closer to the Founder Offline Test, or is EVE
creating noise, false autonomy, weak memory, hidden founder work or premature
automation?
```

The output is not automatic self-modification. The output is an evidence-backed
improvement packet that can be accepted, split, rejected or turned into Plane
worker contracts.

## Placement

```text
EVE sessions and managed work
  -> safe activity ledger
  -> Honcho memory proposals
  -> Raindrop / prompt-result / controller evidence
  -> weekly light calibration
  -> monthly EVE Chief-of-Staff Growth Review
  -> accepted improvements
  -> SOUL.md, skills, workflows, Honcho conclusions, connector scopes or Plane contracts
```

Honcho remains a memory layer. Raindrop remains an evidence layer. Controller
remains a review layer. The Founder remains the authority for HG-4 and for
personal/founder memory acceptance.

## Cadence

| Cadence | Name | Purpose | Output |
|---|---|---|---|
| Per managed run | EVE activity capture | Record safe, reduced evidence from important EVE work. | Activity ledger row or packet reference. |
| Weekly | Light calibration | Catch repeated behavior issues before they harden. | Short calibration note with at most three proposals. |
| Every 3-4 weeks | CoS Growth Review | Founder + EVE + CEO/Controller review EVE performance. | Review packet, decisions and follow-up worker contracts. |
| Release milestone | Promotion review | Decide whether a behavior belongs in public product doctrine. | Docs, kit, skill or release-note update. |

## Evidence Inputs

Allowed inputs:

- EVE activity summaries and redacted decision packets
- Founder corrections and accepted/rejected memory proposals
- Plane parent/child contracts drafted by EVE
- worker reports, CAO verdicts and controller decisions
- Raindrop prompt-result summaries and improvement proposals
- Daily Improvement Dream outputs
- connector/preflight reports
- Founder Offline Readiness evidence
- explicit Founder feedback from the review session

Forbidden inputs unless explicitly approved for that private workspace:

- raw private Founder chats
- secrets, cookies, tokens or recovery codes
- customer data, regulated data, PHI, legal/finance raw detail
- raw prompts or raw model outputs captured outside the approved Raindrop policy
- browser storage, local storage or tool payloads

## Review Packet

Each formal review produces one packet:

```yaml
eve_cos_growth_review:
  version: eve-cos-growth-review/v0
  period_start: YYYY-MM-DD
  period_end: YYYY-MM-DD
  founder_offline_readiness:
    start_level: L0
    end_level: L0
    evidence:
      - docs/operations/command-eve-founder-offline-readiness.md
  summary:
    worked:
      - ""
    failed_or_missed:
      - ""
    founder_corrections:
      - ""
    hidden_work_created:
      - ""
  scorecard:
    founder_interruption_reduction: 0
    intent_translation_accuracy: 0
    decision_packet_quality: 0
    gate_discipline: 0
    existing_system_adoption: 0
    delegation_throughput: 0
    memory_precision: 0
    founder_taste_preservation: 0
    health_and_overload_protection: 0
    raindrop_evidence_quality: 0
  recommendations:
    soul_changes:
      - proposal: ""
        evidence: []
        human_gate: HG-4
    skill_or_workflow_changes:
      - proposal: ""
        evidence: []
        owner_role: role:coo
    honcho_memory_candidates:
      - conclusion: ""
        evidence: []
        acceptance_required: Founder
    fvbm_updates:
      - dimension: voice | belief | frame | refusals | proof | positioning
        proposal: ""
        evidence: []
        confidence_change: ""
        human_gate: HG-4
    plane_worker_contracts:
      - title: ""
        role: role:coo
        dispatch: manual
  decision:
    accepted:
      - ""
    rejected:
      - ""
    split:
      - ""
    needs_rework:
      - ""
```

Scores are internal 0-5 calibration signals, not public autonomy claims. A
score without evidence is invalid.

## Scorecard Definitions

| Dimension | Question |
|---|---|
| Founder interruption reduction | Did EVE reduce low-value Founder interruptions? |
| Intent translation accuracy | Did EVE translate messy intent into correct CEO/C-Level/worker packets? |
| Decision packet quality | Were options, tradeoffs, gates and recommendations crisp enough to decide? |
| Gate discipline | Did EVE respect HG-2.5/HG-3/HG-3.5/HG-4 and avoid false authority? |
| Existing-system adoption | Did EVE inspect and adapt existing tools before creating new structure? |
| Delegation throughput | Did EVE create useful, bounded work instead of broad plans? |
| Memory precision | Were proposed memories specific, useful, reversible and accepted? |
| Founder taste preservation | Did EVE preserve voice, standards and refusal patterns without flattery? |
| FVBM calibration | Did confirmed founder corrections improve the Voice and Belief Model without silently expanding authority? |
| Health and overload protection | Did EVE reduce hidden founder debt and protect recovery capacity? |
| Raindrop evidence quality | Is there enough safe evidence to improve the system honestly? |

## Promotion Rules

Accepted findings go to the right layer:

- `SOUL.md`: only stable identity, posture, North Star or hard-boundary changes.
- Skills/workflows: repeatable procedures EVE should run again.
- Honcho: accepted durable founder/company facts and preferences.
- FVBM file/Honcho representation: accepted voice, belief, frame, refusal,
  proof and positioning updates with evidence and founder confirmation.
- Docs/ADR: reusable Company.OS product doctrine.
- Capability profiles: connector and permission changes.
- Plane: concrete implementation, audit or productization work.

Rejected findings stay in the review artifact as evidence but do not mutate
memory, docs, skills or runtime behavior.

## Authority Boundaries

EVE may:

- self-reflect
- propose improvements
- ask the Founder for corrections
- draft memory candidates
- draft Plane worker contracts
- recommend a `SOUL.md`, skill or workflow change

EVE may not:

- accept its own memory candidates
- rewrite its own `SOUL.md`
- increase connector scope
- change HumanGate levels
- dispatch workers
- mark Plane Done
- approve HG-4 or strategic identity changes

CEO/Codex may accept bounded HG-2.5/HG-3 operational improvements after
evidence. Founder approval is required for HG-4, personal memory, public founder
voice, health/life doctrine and non-restorable changes.

## Failure Modes

| Failure | Controller response |
|---|---|
| EVE self-grades without evidence | Reject the review and request evidence paths. |
| Review becomes generic coaching theater | Reduce to three artifact-backed proposals. |
| EVE overfits to one Founder mood | Require repeated evidence or explicit Founder decision. |
| Honcho memory creates false certainty | Keep memory candidates proposal-only until accepted. |
| Raindrop asks for raw private data | Block and use reduced summaries. |
| Review creates hidden Founder work | Lower Founder Offline Readiness confidence. |

## Release Placement

`0.7.3` should add the activity ledger and review packet schema in dry-run
form.

`0.7.4` should generate a weekly calibration packet from safe local artifacts.

`0.8` should connect managed EVE work to Raindrop summaries and controller
evidence.

`0.9` should run the first formal three-to-four-week Founder/EVE/CEO review.

`1.0` may allow accepted findings to become Plane worker contracts
automatically, but durable memory, soul, connector and HumanGate changes remain
review-gated.

## Minimum Viable Pilot

The first pilot can be simple:

1. EVE records safe summaries for meaningful Chief-of-Staff interactions.
2. Weekly calibration emits one Markdown packet with three proposals maximum.
3. At week three or four, the Founder reviews the packet with EVE and
   CEO/Controller.
4. Accepted findings create Plane child contracts with `dispatch: manual`.
5. Accepted memory candidates are written to the correct Honcho workspace only
   after Founder approval.

This is enough to prove the loop without building a heavy meta-organization
around a young EVE runtime.
