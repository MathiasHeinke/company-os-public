# EVE M0 Seed Interview

Status: target onboarding extension
Use for: creating the first inspectable Founder Voice and Belief Model for a
new founder without pretending that a form can capture a voice.

## Purpose

The M0 seed interview starts the FVBM. It is not a questionnaire and not a
single long intake form. EVE asks in waves, summarizes after at most three
questions and converts confirmed evidence into a thin but usable FVBM.

The goal is not completeness. The goal is a safe starting model with explicit
gaps, confidence and correction hooks.

## Design Principles

1. Voice is shown, not described. Real texts carry more signal than adjectives.
2. Belief appears under tension. Provocation finds stronger convictions than
   asking "what do you believe".
3. Refusals matter as much as preferences. Negative space prevents slop.
4. Calibration is the heart. EVE writes a short sample back and the founder's
   correction becomes the strongest signal.

## Wave 1: Voice Samples

Ask for artifacts, not opinions:

- Send three to five texts that sound unmistakably like you.
- Send one text from your field that you would never write.
- Send one raw, angry or unusually honest piece if it exists.

## Wave 2: Belief And Frame

- What does your field mostly misunderstand?
- What makes you angry when you see it in your field?
- What should someone believe, become or do after reading your content, beyond
  buying your product?

## Wave 3: Refusals

- What must never go out under your name?
- Which words, registers, claims or tones are instantly not you?
- Name one account, author or style in your field that repels you and why.

## Wave 4: Proof And Positioning

- Which story do you tell again and again because it carries something
  essential?
- Which numbers, studies, examples or proof points do you keep returning to?
- Where do you sit relative to the obvious insiders, critics and competitors?

## Wave 5: Calibration Probe

EVE writes about 150 words on a neutral topic in the claimed voice and asks:

```text
Read this aloud. What is accurate, what feels foreign and what would you never
say? Be precise; this is the highest-value correction.
```

## Output Artifact

```yaml
fvbm:
  maturity: M0
  founder:
  dimensions:
    voice:
      confidence: 0.0
      evidence:
        - voice_sample_1
      gaps:
        - ""
    belief:
      confidence: 0.0
      convictions:
        - ""
      gaps:
        - ""
    frame:
      confidence: 0.0
      worldview:
      promise:
      gaps:
        - ""
    refusals:
      confidence: 0.0
      hard_no:
        - ""
      negative_references:
        - ""
    proof:
      confidence: 0.0
      signature_stories:
        - ""
      recurring_evidence:
        - ""
    positioning:
      confidence: 0.0
      stance:
      contrasts:
        - ""
  calibration:
    eve_draft:
    founder_reaction:
    corrections_applied:
      - ""
  open_questions:
    - ""
```

## Done Criteria

M0 is done when:

- at least three voice artifacts exist,
- one calibration probe has been corrected,
- every dimension has either confidence above 0.5 or an explicit gap,
- the founder has confirmed what may be persisted.

## Promotion

M0 becomes M1+ through confirmed corrections, approved content, periodic growth
reviews and proposal-only learning updates. Workers may suggest updates. EVE
may prepare update cards. Durable memory promotion remains gated.
