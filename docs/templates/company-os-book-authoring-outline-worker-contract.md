# Company.OS Book Authoring Outline Worker Contract

Use this template for the first official outline after Discovery Research and
Frame Brief. It exists to prevent pre-research sketches from being promoted into
draft-unlocking architecture.

```yaml
role: role:cpo
parent_seat: role:cpo
agent: claude
mode: plan
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${BOOK_PROJECT_ROOT}/00_book_spec/BOOK_SPEC.md
  - ${BOOK_PROJECT_ROOT}/01_fvbm/FVBM.md
  - ${BOOK_PROJECT_ROOT}/02_research/dossier.md
  - ${BOOK_PROJECT_ROOT}/02_research/source-ledger.md
  - ${BOOK_PROJECT_ROOT}/02_research/proof-plan.md
  - ${BOOK_PROJECT_ROOT}/03_frame_outline/frame-brief.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-book-authoring-department-pack-v0.md
acceptance_criteria:
  - Official outline is created only after research dossier, source ledger, proof plan and Frame Brief exist.
  - Any earlier pre-research structure is explicitly demoted to `outline_sketch` and may be used only as hypotheses to test.
  - Outline maps each chapter to evidence buckets, open proof gaps, founder dogfood, counterarguments and claim-risk notes.
  - 10X/100X or category-defining claims separate measured evidence, founder inference, anecdote and speculation.
  - Worker reports `outline_gate_ready: false` instead of writing an official outline when required research artifacts are missing.
  - Worker-ledger validation reports only contract.dispatch-not-ready while dispatch stays manual.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-book-authoring-outline-worker-contract.md --label role:cpo
  - test -f ${BOOK_PROJECT_ROOT}/02_research/dossier.md
  - test -f ${BOOK_PROJECT_ROOT}/02_research/source-ledger.md
  - test -f ${BOOK_PROJECT_ROOT}/02_research/proof-plan.md
  - test -f ${BOOK_PROJECT_ROOT}/03_frame_outline/frame-brief.md
human_gate: HG-3.5
hg35_pause_artifact: ${BOOK_PROJECT_ROOT}/03_frame_outline/outline-hg35-decision-card.md
reporting: Plane worker.reported with outline path, sketch-demotion note, proof-gap table, gate results, reflection and learning_proposals.
BlockedActions: do not draft chapters; do not promote pre-research sketches to official outline; do not publish, send, spend, write durable memory or mark Done.
CapabilityProfile: claude-clevel-worker/cmo/book-authoring
OutcomeSpec: Produce a research-grounded official outline that is ready for the Outline CAO Checkpoint.
OutcomeRubric: PASS only when the outline is grounded in research artifacts and cannot be confused with a pre-research sketch.
ReflectionPolicy: required
LearningProposalPolicy: required
```
