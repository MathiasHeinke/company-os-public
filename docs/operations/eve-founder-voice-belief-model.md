# EVE Founder Voice and Belief Model

Status: target architecture / content substrate
Use for: making founder-facing content sound and reason like the founder without
turning EVE into an ungated memory writer or identity authority.

## Purpose

The Founder Voice and Belief Model, abbreviated FVBM, is the durable,
inspectable model of how a founder sounds, what they believe, which frames they
use and what must never go out under their name.

It is not book-specific. Books, blogs, campaigns, funnels, keynote drafts and
reader packets consume the same substrate. The book authoring pack is the first
high-pressure user of this layer because a serious book exposes generic AI
voice faster than short content does.

FVBM sits beside the EVE Founder Intent layer:

- `Soul` / epistemic posture: how EVE thinks with the founder internally.
- Founder Intent Packet: what the founder wants right now.
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
      syntax:
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
a hypothesis. EVE may use hypotheses for drafts, but it must label them and ask
for confirmation before treating them as durable memory.

## Maturity Curve

| Maturity | State | Content Consequence |
|---|---|---|
| M0 | Intake, voice samples and one calibration probe exist. | More founder touchpoints, lower autonomy, more explicit gaps. |
| M1 | Several confirmed content corrections exist. | EVE can project voice for bounded drafts. |
| M2 | Multiple approved artifacts and review loops exist. | Fewer confirmations, stronger style and refusal gates. |
| M3 | Months of confirmed interaction and content history exist. | High-fidelity projection, still HG-4 for identity and public commitment. |

The important product truth: content quality improves with relationship time.
This is not hand-waving. The model carries more evidence, fewer gaps and clearer
negative boundaries. The founder sees and corrects it, so voice fidelity is
earned rather than claimed.

## Storage

FVBM has two representations:

- Honcho peer representation for durable, queryable memory.
- Versioned file artifact, usually `fvbm.md`, so the founder and controller can
  inspect and correct the model.

Durable write policy is proposal-only. EVE, workers and CAO may propose updates;
CEO/Codex and the relevant HumanGate decide promotion. A worker never silently
rewrites durable founder identity.

## Content Consumption

Book Authoring uses FVBM in three places:

1. StyleProfile projection: Phase 1 extracts book-specific voice rules from the
   general FVBM.
2. Frame grounding: Phase 2 tests the desired book frame against both research
   evidence and founder belief/frame.
3. Compliance sweep: Phase 8 requires voice_match and belief_match evidence
   before build or publication claims.

Other content skills use the same pattern. They project from the model; they do
not rebuild founder voice from scratch each time.

## Anti-Slop Gate

AI slop is content that is fluent but not anchored in a real founder's voice,
beliefs and refusal boundaries. The FVBM turns that into a gate:

```yaml
voice_match: PASS | REJECT | NEEDS_FOUNDER
belief_match: PASS | REJECT | NEEDS_FOUNDER
evidence:
  - path to FVBM
  - path to style profile
  - path to draft
  - path to reviewer verdict
```

The deterministic compliance sweep can verify that a voice/belief verdict
exists and passed. The semantic verdict itself is a reviewer artifact, not a
regex claim.

## HumanGate Boundary

EVE never claims that the FVBM is the founder. It is a model. It may be useful,
wrong, stale or incomplete. Voice, identity, cover taste, public publication and
non-restorable commitments remain HG-4 Founder decisions.

## Integration Points

- `docs/operations/eve-founder-intent-operating-layer.md`
- `docs/operations/eve-first-run-founder-onboarding.md`
- `docs/operations/eve-chief-of-staff-growth-review.md`
- `docs/orchestration/company-os-book-authoring-department-pack-v0.md`
- `docs/templates/company-os-book-spec.md`
