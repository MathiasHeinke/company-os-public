# EVE Founder Voice And Belief Model

Status: target architecture / content substrate
Use for: making founder-facing content sound and reason like the founder
without turning EVE into an ungated memory writer or identity authority
Last updated: 2026-06-04

## Purpose

The Founder Voice and Belief Model, abbreviated FVBM, is the durable,
inspectable model of how a founder sounds, what they believe, which frames they
use and what must never go out under their name.

It is not book-specific. Books, blogs, campaigns, funnels, keynote drafts and
reader packets consume the same substrate.

FVBM sits beside the EVE Founder Intent layer:

- Soul / epistemic posture: how EVE thinks with the founder internally;
- Founder Intent Packet: what the founder wants right now;
- FVBM: how the founder sounds and what they believe when content goes outward.

## Model Dimensions

```yaml
fvbm:
  maturity: M0 | M1 | M2 | M3
  founder:
  dimensions:
    voice:
      confidence:
      register:
      rhythm:
      vocabulary:
      signature_moves:
      forbidden_patterns:
      evidence:
    belief:
      confidence:
      convictions:
      tensions:
      evidence:
    frame:
      confidence:
      worldview:
      recurring_arguments:
      promise:
      evidence:
    refusals:
      confidence:
      hard_no:
      negative_references:
      evidence:
    proof:
      confidence:
      signature_stories:
      recurring_evidence:
      evidence:
    positioning:
      confidence:
      stance:
      contrasts:
      insider_outsider_status:
      evidence:
  calibration:
    sample_prompt:
    eve_draft:
    founder_reaction:
    corrections_applied:
  open_questions:
```

Every dimension carries confidence and evidence. A field with no evidence stays
a hypothesis. EVE may use hypotheses for drafts, but it must label uncertainty
and ask for confirmation before promoting them into durable memory.

## Maturity Curve

| Maturity | State | Content consequence |
|---|---|---|
| M0 | intake, voice samples and one calibration probe exist | more founder touchpoints, low autonomy |
| M1 | several confirmed corrections exist | bounded drafts can project voice |
| M2 | multiple approved artifacts and review loops exist | fewer confirmations, stronger style gates |
| M3 | months of confirmed interaction exist | high-fidelity projection, still HG-4 for identity/public commitments |

Content quality improves with relationship time because the model gains
evidence, negative boundaries and corrections.

## Storage

FVBM has two representations:

- memory representation for durable, queryable recall;
- versioned file artifact such as `fvbm.md`, so the founder and controller can
  inspect and correct the model.

Durable writes are proposal-only. EVE, workers and CAO may propose updates.
CEO/Codex and the relevant HumanGate decide promotion.

## Anti-Slop Gate

```yaml
voice_match: PASS | REJECT | NEEDS_FOUNDER
belief_match: PASS | REJECT | NEEDS_FOUNDER
evidence:
  - path to FVBM
  - path to style profile
  - path to draft
  - path to reviewer verdict
```

The deterministic compliance sweep verifies that a voice/belief verdict exists
and passed. The semantic verdict itself is a reviewer artifact, not a regex
claim.

## HumanGate Boundary

EVE never claims that the FVBM is the founder. It is a model. It may be useful,
wrong, stale or incomplete. Voice, identity, public publication and
non-restorable commitments remain HG-4 Founder decisions.
