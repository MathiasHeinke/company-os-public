# Company.OS BookSpec Template

Use this template before starting a Book Authoring run. BookSpec direction is
HG-4 because it defines strategy, identity and public commitment.

```yaml
book_spec:
  working_title:
  topic:
  goal:            # reputation, qualified inbound, category authority, client education
  audience:
  desired_frame:   # the thesis or stance the book should test
  scope_boundaries:
    include:
      - ""
    exclude:
      - ""
  constraints:
    language:
    target_length:
    deadline:
    market:
    regulated_claim_risk:
  source_material:
    - ""
  success_signal:
    - warm inbound
    - reader replies
    - sales calls
    - authority proof
  founder_decisions:
    voice_owner:
    cover_owner:
    publish_owner:
  human_gate:
    book_direction: HG-4
    frame_brief: HG-3.5
    outline: HG-3.5
    outline_cao_checkpoint: HG-3.5
    cover: HG-4
    final_publish: HG-4
  autonomy_policy:
    full_autonomy_requested:
    research_before_outline_required: true
    source_ledger_required_before_outline: true
    proof_plan_required_before_outline: true
    pre_research_outline_is_sketch_only: true
    outline_checkpoint_required: true
    secondary_inference_required_before_draft: true
```

## Minimum Start

The book can start once these fields are filled:

- `working_title`
- `topic`
- `goal`
- `audience`
- `desired_frame`
- `scope_boundaries`
- `constraints.language`
- `founder_decisions.publish_owner`

If FVBM maturity is M0 or unknown, run
`docs/operations/eve-m0-seed-interview.md` before autonomous drafting.

## Autonomy Boundary

Founder approval for high autonomy does not skip the outline checkpoint. After
the first outline, a CAO or secondary inference must review the real artifacts
and EVE/Codex must present the outline plus critique before drafting continues.

Founder approval also does not skip Discovery Research. A pre-research
structure is an `outline_sketch`, not a Phase 3 outline. The official outline
requires research dossier, source ledger, proof plan and Frame Brief first.
