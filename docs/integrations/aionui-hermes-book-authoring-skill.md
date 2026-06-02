# AionUI / Hermes Book Authoring Skill

Status: Company.OS native EVE skill contract
Owner: CMO with CEO/Codex release authority
CapabilityProfile: `claude-clevel-worker/cmo/book-authoring`

## Skill Id

```text
intent.book_authoring_setup
```

## Trigger Phrases

```yaml
intent_id: intent.book_authoring_setup
trigger_phrases:
  - write a book with Command EVE
  - create a founder book
  - turn this thesis into a real book
  - build a reputation book package
first_safe_scope: create local project surface, capture BookSpec/FVBM seed, draft Plane contracts and generate discovery-research plan
```

## EVE Behavior

EVE inspects existing BookSpec, FVBM, voice samples and source material before
asking. EVE challenges weak frames, unsupported claims, generic voice, fake
autonomy and publish-risk shortcuts. EVE does not dispatch workers, write
durable memory, publish, submit to KDP, send reader copies, request secrets,
approve HG-4 or mark Plane items Done.

If the user asks for "full autonomy" or "just write the whole book", EVE must
still enforce the Outline CAO Checkpoint: after the first outline, EVE presents
the outline plus a CAO/secondary-inference critique and does not allow draft
workers to proceed until the checkpoint is reflected.

EVE must also enforce the research-before-outline gate. Before a research
dossier, source ledger, proof plan and Frame Brief exist, EVE may create only a
frame hypothesis or `outline_sketch`. EVE must not call that artifact an
"outline", "Phase 3 outline" or "approved architecture", and it must not unlock
the Outline CAO Checkpoint or any draft worker.

## Required Output

1. My read
2. What I need to challenge
3. Book Intent Packet
4. CEO Delegation Packet
5. Target folder proposal
6. Skill start command
7. Draft CMO parent contract
8. Draft child worker roster
9. Capability boundaries
10. 10/10 evaluation rubric
11. Research-before-outline gate policy
12. Outline CAO Checkpoint policy
13. First Founder/CEO decision needed

## Book Intent Packet

```yaml
working_title:
topic:
goal:
audience:
desired_frame:
scope_boundaries:
constraints:
voice_source:
fvbm_maturity:
source_material:
claim_risk:
success_signal:
founder_decisions_needed:
open_questions:
eve_challenge:
```

## Skill Start Command

```bash
node scripts/content/book-authoring-start.mjs \
  --root ${CLIENT_ROOT} \
  --company "<company name>" \
  --project-slug "<book-slug>" \
  --working-title "<working title>" \
  --approval-owner "<approval owner>" \
  --write \
  --json
```

## HumanGate Routing

- HG-1/HG-2: local setup, research planning and low-risk draft artifacts.
- HG-2.5: bounded reader-package release card after CAO/controller proof.
- HG-3: regulated public claims, legal/medical/finance risk or reversible
  critical release.
- HG-3.5: Frame Brief, outline, steelman depth, acknowledgements and final
  bundle founder-proxy review.
- Mandatory research gate: research dossier, source ledger, proof plan and
  Frame Brief before any official outline.
- Mandatory checkpoint: outline plus CAO/secondary-inference critique before
  drafting, even when autonomy was requested up front.
- HG-4: BookSpec direction, founder voice identity, cover, final publish and
  non-restorable public commitment.

## Blocked Actions

- no worker dispatch from EVE
- no public publish, upload, KDP submit, send, schedule or spend
- no publisher API write
- no secret, browser-cookie or password-store read
- no durable memory write
- no production write
- no HumanGate downgrade
- no Done transition by worker or CAO

## Learning Loop

Hermes and workers may propose improvements to FVBM extraction, research
decomposition, frame-brief structure, style gates, claim inventory, build
tooling and capability boundaries. Promotion requires CAO/controller review and
CEO/Codex approval; authority expansion requires the applicable HumanGate.
