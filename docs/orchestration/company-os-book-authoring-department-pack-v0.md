# Company.OS Book Authoring Department Pack v0

Status: guided-pilot department pack
Use for: turning a founder intent into a gated nonfiction book program with
research, voice fidelity, adversarial editing, deterministic build artifacts and
publish-ready review packets.

## Purpose

Book Authoring is a reusable Company.OS CMO department pack for reputation and
qualified-inbound books. The book is not treated as a low-margin publishing
product. It is a trust object: a long-form proof of judgment, taste, evidence
discipline and founder voice.

The first safe release stays draft-only and local. It can create folders,
BookSpec packets, research dossiers, frame briefs, outlines, drafts, audit
reports and build bundles. It cannot publish, upload, submit to KDP, send to
readers, spend money, claim legal or medical compliance, write durable memory or
mark Plane items Done without the relevant HumanGate.

Proof boundary:

- An internal founder proof run produced a complete long-form manuscript,
  deterministic PDF bundle and externally useful reader package.
- A blind review scored the manuscript around editorial 8.5 before the
  adversarial sharpening loop and around editorial 9.4 after it.
- Hygiene gates caught AI-tell punctuation and leaked worker material before
  the final build.
- The reader package generated warm senior-founder inbound within 24 hours.
- This is n=1 evidence. It proves the system can create real, high-quality
  books under founder supervision; it is not yet cohort-level market proof.

The operating rule:

```text
Draft and sharpen aggressively. Publishing is gated.
```

Second operating rule:

```text
Autonomy starts after the outline checkpoint, not before it.
```

Even if the founder says "write the whole book autonomously", the pack must
pause after the first outline. The outline is presented to the founder together
with a CAO/secondary-inference critique before any full-manuscript or chapter
batch draft worker runs. This is not optional. It is the book-authoring version
of the Company.OS controller doctrine: the inference that created the outline
must not be the only inference that certifies it.

Third operating rule:

```text
No research dossier, no source ledger, no proof plan, no Frame Brief, no
official outline.
```

Any structure created before Discovery Research is only an `outline_sketch` or
frame hypothesis. It is not a Phase 3 outline, not source of truth, cannot
unlock the Outline CAO Checkpoint and cannot unlock draft workers.

Fourth operating rule:

```text
After a full-spine draft or major sharpening package, run an Opus Max
Perspective Pass before treating the artifact as ready for formal CAO audit.
```

The pass uses a separate Claude Opus Max 1M-class worker, fed with the actual
draft, claim inventory, BookSpec, FVBM, Frame Brief, outline, source ledger,
proof plan and prior verdicts. It is not a replacement for CAO. It gives the
pipeline another senior perspective: where the book works, where it is still
abstract, where claim guards drift in prose, whether dogfood errors are shown
honestly, and whether the formal CAO audit should run now or after sharpening.
The worker output itself is untrusted until a controller reads the evidence.

## Trigger / Intent

```yaml
intent_id: intent.book_authoring_setup
trigger_phrases:
  - write a book with Command EVE
  - turn this founder idea into a book
  - build a reputation book
  - create a publish-ready book package
founder_problem: I have a thesis and authority, but no repeatable system for producing a serious book in my own voice.
desired_business_outcome: reputation, qualified inbound, category authority and reusable long-form content substrate.
first_safe_scope: initialize the local book project, capture BookSpec and FVBM seed, run discovery research and produce a Frame Brief without publishing.
```

## Founder Intake

EVE asks only for missing fields and stops before HG-4 decisions:

```yaml
company:
founder_or_author:
working_title:
topic:
goal:
audience:
desired_frame:
scope_boundaries:
constraints:
source_material:
voice_samples:
off_limits_claims_or_topics:
approval_owner:
target_language:
target_length:
publish_intent:
success_signal:
```

Minimum start input:

- BookSpec direction: topic, goal, audience, desired frame and constraints.
- FVBM seed: existing Founder Voice and Belief Model, or M0 seed interview
  artifacts.
- Approval owner for HG-3.5/HG-4 cards.

## CEO Delegation Packet

```yaml
objective: Create a gated founder book program that turns BookSpec plus FVBM into research, frame, outline, manuscript, audit and build artifacts.
recommended_release_band: guided alpha
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-book-authoring-department-pack-v0.md
  - ${COMPANY_OS_ROOT}/docs/operations/eve-founder-voice-belief-model.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-book-spec.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-department-capability-pack.md
c_level_routing:
  owner_role: role:cmo
  support_roles:
    - role:cpo
    - role:cto
    - role:cao
proposed_parent: ${COMPANY_OS_ROOT}/docs/templates/company-os-book-authoring-parent-worker-contract.md
proposed_children:
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-book-authoring-research-worker-contract.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-book-authoring-outline-worker-contract.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-book-authoring-outline-cao-worker-contract.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-book-authoring-draft-worker-contract.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-book-authoring-opus-max-perspective-worker-contract.md
acceptance_criteria:
  - Local project surface exists with BookSpec, FVBM seed, research, draft, audit, build and report folders.
  - Research dossier, source ledger and proof plan exist before Frame Brief or official outline work.
  - Frame Brief is grounded in both facts and FVBM belief/voice boundaries before outline.
  - The first outline is checked by CAO or a secondary inference before drafting, and the founder sees the outline decision card.
  - A full-spine draft or major sharpening package receives a Claude Opus Max
    1M perspective pass before formal CAO audit timing is accepted.
  - Draft work runs through adversarial audit and compliance sweep before any build or publication claim.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-book-authoring-parent-worker-contract.md --label role:cmo
  - node scripts/orchestration/company-os-department-pack-evaluator.mjs --pack-id book-authoring --json
  - node --test scripts/content/book-authoring-start-core.test.mjs scripts/content/book-authoring-compliance-sweep-core.test.mjs
human_gate: HG-4 for BookSpec direction, FVBM voice identity, cover choice and final publish; HG-3.5 for Frame Brief, outline, steelman depth, acknowledgements and final bundle.
blocked_actions:
  - no public publish, upload, submit, send or schedule
  - no KDP or publisher API write
  - no medical, legal, financial or regulated public claim without the proper gate
  - no durable memory write without proposal review and confirmation
  - no secret read
  - no Plane Done transition by worker or CAO
```

## Department SOP

1. EVE reads the Founder Intent Packet and existing FVBM. If FVBM is missing,
   EVE runs the M0 seed interview in small waves.
2. CEO/Codex creates a Plane parent with dispatch manual and one role label.
3. The local project surface is initialized with
   `scripts/content/book-authoring-start.mjs`.
4. Phase 0 captures BookSpec and blocks on HG-4 direction approval.
5. Phase 1 projects a book-specific StyleProfile from the FVBM. It does not
   invent voice from scratch.
6. Phase 2 runs Discovery Research before outline. Research produces a dossier
   source ledger, proof plan and Frame Brief inputs. Any pre-research structure
   is explicitly labeled `outline_sketch` and cannot be treated as Phase 3.
7. The Frame Brief is checked against both evidence and founder belief. EVE or
   Codex prepares an HG-3.5 card.
8. CPO creates the official outline and chapter architecture only after the
   dossier, source ledger, proof plan and Frame Brief exist.
9. Mandatory Outline CAO Checkpoint: CAO or a secondary inference reads the
   real BookSpec, Vision/Frame Brief, Outline and claim ledger. It produces an
   outline review card before any draft worker runs.
10. EVE/Codex presents the outline plus critique to the founder. If the founder
    approved high autonomy, this checkpoint still runs; approval only resumes
    after the critique is reflected.
11. CMO drafts chapters quickly, then attacks them with the sharpening loop.
12. Claim verification creates a chapter-level Claim Inventory.
13. Mandatory Opus Max Perspective Pass: a separate Claude Opus Max 1M-class
    worker reads the real draft plus sufficient source context and produces a
    verdict on readiness, top fixes, voice rhythm, concrete mechanism gaps,
    claim-guard drift and CAO timing. This is a second perspective, not final
    authority; controller review remains required.
14. CAO performs blind cross-model manuscript audit. The auditor must differ
    from the primary draft runtime.
15. Compliance sweep checks AI tells, worker leaks, forbidden patterns,
    claim-gate material and voice/belief match evidence.
16. CTO build/bundle work is deterministic and local. Publication remains HG-4.

## Skill Start

The setup command creates the safe local project surface:

```bash
node scripts/content/book-authoring-start.mjs \
  --root ${CLIENT_ROOT} \
  --company "Example Company" \
  --project-slug "founder-book" \
  --working-title "Working Title" \
  --approval-owner "Founder" \
  --write \
  --json
```

The command creates:

```text
content/book-authoring/<project-slug>/
  00_book_spec/
  01_fvbm/
  02_research/
  03_frame_outline/
  04_claim_inventory/
  05_drafts/
  06_audit/
  07_cover/
  08_build_bundle/
  09_publication/
  10_reports/
  RUNBOOK.md
  book-authoring.config.json
```

The command does not publish, submit, send, spend, call a model or read private
source folders. It only creates the working surface and placeholders.

## C-Level Parent Contract

Use
`${COMPANY_OS_ROOT}/docs/templates/company-os-book-authoring-parent-worker-contract.md`.
The parent coordinates setup, gates, phase ordering and child roster. It does
not write the book itself and does not dispatch child workers by itself.

## Child Worker Contract List

Minimum guided-pilot templates:

- `${COMPANY_OS_ROOT}/docs/templates/company-os-book-authoring-research-worker-contract.md`
- `${COMPANY_OS_ROOT}/docs/templates/company-os-book-authoring-outline-worker-contract.md`
- `${COMPANY_OS_ROOT}/docs/templates/company-os-book-authoring-outline-cao-worker-contract.md`
- `${COMPANY_OS_ROOT}/docs/templates/company-os-book-authoring-draft-worker-contract.md`
- `${COMPANY_OS_ROOT}/docs/templates/company-os-book-authoring-opus-max-perspective-worker-contract.md`

Recommended next templates after the guided pilot:

- CPO outline worker
- CMO claim verification worker
- Claude Opus Max perspective worker
- CAO blind manuscript audit worker
- CTO build and bundle worker
- CMO compliance polish worker

All child contracts start with `dispatch: manual`.

## CapabilityProfile Requirements

Use `claude-clevel-worker/cmo/book-authoring` for the guided-pilot CMO parent,
research and draft lanes.

Allowed:

- read the declared BookSpec, FVBM, research, draft and audit artifacts
- write local Markdown/JSON reports inside the declared book project
- run deterministic validators and private-literal scans
- run `book-authoring-start` and `book-authoring-compliance-sweep`
- propose FVBM enrichment, but not persist it without confirmation

Forbidden:

- public publish, upload, KDP submit, send, schedule or spend
- publisher API writes
- raw private memory, browser cookies, password stores or unrelated filesystem
  reads
- secrets or token printing
- medical, legal, financial or regulated public claims without review
- durable memory writes without controller review and confirmation
- HumanGate downgrade
- Done transition by worker or CAO

## Allowed / Forbidden Surfaces

Allowed: docs, templates, local project artifacts, dry-run build bundles,
research reports, Frame Briefs, claim inventories, audit reports, proposal-only
learning notes and fake-company examples.

Forbidden: secrets, raw private memory, customer data, production writes,
public publishing or sending, regulated claims without review, connector
expansion, publisher API writes and Done transitions.

## HumanGates

- HG-1/HG-2: local setup, general research, low-risk draft work.
- HG-2.5: CEO/Codex bounded release card for reversible external reader packet
  prep after CAO/controller evidence.
- HG-3: legal, medical, financial, public claim risk or irreversible brand risk
  with rollback/restore evidence.
- HG-3.5: EVE/Chief-of-Staff founder-proxy card for Frame Brief, outline,
  steelman depth, acknowledgements and final bundle.
- HG-4: Founder only for BookSpec direction, voice identity, cover taste,
  publication and non-restorable public commitment.

## Quality Gates

- worker contract parseability via `worker-ledger-validator.mjs`
- manual template validator output must be limited to
  `contract.dispatch-not-ready`; any other reject code is a real template bug
- department pack evaluator READY status
- local setup tests and dry-run output
- private path, secret and source-company literal scan
- research dossier, source ledger and proof plan before Frame Brief
- Frame Brief plus source ledger before official outline
- pre-research outline sketches must be labeled non-authoritative and cannot
  unlock Phase 3, CAO checkpoint or draft work
- Outline CAO Checkpoint before drafting, even under "full autonomy" requests
- claim inventory before manuscript audit
- Opus Max Perspective Pass after full-spine draft or major sharpening package,
  before formal CAO audit timing is accepted
- cross-model blind audit before compliance polish
- `book-authoring-compliance-sweep` before build or publication claim
- HumanGate report before any publish-ready claim

## Evidence Artifacts

- `reports/examples/book-authoring-pack/README.example.md`
- `reports/examples/department-pack-creator/book-authoring-evaluation.example.md`
- `reports/examples/department-pack-creator/2026-05-31/book-authoring-evaluation.example.md`
- `reports/examples/department-pack-creator/2026-05-31/book-authoring-evaluation.example.json`

## Learning Loop

Workers may propose improvements to prompts, research decomposition, outline
rubrics, StyleProfile extraction, FVBM dimensions, compliance gates, build
scripts, claim tiers or CapabilityProfile boundaries. Those proposals are
reported as `learning_proposals` and reviewed by CAO/controller plus CEO/Codex
before they become doctrine or expand authority.

## Autonomy Promotion Path

L0 inspect -> L1 initialize folders -> L2 research and local draft artifacts ->
L2.5 bounded reader-package review -> L3 critical reversible runtime after
repeated green proof history -> L3.5 Chief-of-Staff/founder-proxy review ->
L4 Founder decision.

The guided pilot remains L1/L2. It can create folders, research, drafts, audit
reports and local bundles. It cannot publish.

## 10/10 Evaluation Rubric

Use `${COMPANY_OS_ROOT}/docs/templates/company-os-capability-pack-eval-rubric.md`.

Domain-specific 10/10 additions:

- founder voice fidelity
- belief/frame fidelity
- research and claim evidence quality
- outline checkpoint quality and secondary-inference critique
- adversarial edit depth
- AI-tell and worker-leak hygiene
- deterministic build reproducibility
- reader-package usefulness
- public claim safety and HumanGate routing
