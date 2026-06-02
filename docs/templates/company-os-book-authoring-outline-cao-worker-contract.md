# Company.OS Book Authoring Outline CAO Worker Contract

Use this template for the mandatory secondary-inference checkpoint between
outline and drafting. It exists to prevent the outline author from certifying
its own frame, proof plan or product claims.

```yaml
role: role:cao
parent_seat: role:cao
agent: claude
mode: audit
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${BOOK_PROJECT_ROOT}/00_book_spec/BOOK_SPEC.md
  - ${BOOK_PROJECT_ROOT}/01_fvbm/FVBM.md
  - ${BOOK_PROJECT_ROOT}/02_research/dossier.md
  - ${BOOK_PROJECT_ROOT}/02_research/source-ledger.md
  - ${BOOK_PROJECT_ROOT}/02_research/proof-plan.md
  - ${BOOK_PROJECT_ROOT}/03_frame_outline/frame-brief.md
  - ${BOOK_PROJECT_ROOT}/03_frame_outline/outline.md
  - ${BOOK_PROJECT_ROOT}/04_claim_inventory/claim-ledger.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-book-authoring-department-pack-v0.md
acceptance_criteria:
  - CAO first verifies that the reviewed outline is an official post-research outline, not a pre-research sketch.
  - Outline critique names the strongest parts, required patches, unsupported claims, missing proof and founder decisions.
  - Product claims distinguish internal capability from buyer/self-serve availability at publication.
  - The critique is written by a different inference/runtime than the outline author when available.
  - Drafting remains blocked unless the checkpoint is reflected in a founder-facing decision card.
  - Worker-ledger validation reports only contract.dispatch-not-ready while dispatch stays manual.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-book-authoring-outline-cao-worker-contract.md --label role:cao
  - test -f ${BOOK_PROJECT_ROOT}/02_research/source-ledger.md
  - test -f ${BOOK_PROJECT_ROOT}/02_research/proof-plan.md
  - test -f ${BOOK_PROJECT_ROOT}/03_frame_outline/frame-brief.md
  - test -f ${BOOK_PROJECT_ROOT}/03_frame_outline/outline.md
human_gate: HG-3.5
hg35_pause_artifact: ${BOOK_PROJECT_ROOT}/03_frame_outline/outline-cao-checkpoint.md
reporting: Plane worker.reported with critique path, founder decision card path, claim-ledger issues, proof gaps, gate results, reflection and learning_proposals.
BlockedActions: do not draft chapters; do not rewrite the outline directly unless explicitly assigned; do not publish, send, spend, write durable memory or mark Done.
CapabilityProfile: claude-clevel-worker/cmo/book-authoring
OutcomeSpec: Produce the mandatory outline checkpoint that decides whether drafting may proceed.
OutcomeRubric: PASS only when the outline has been independently challenged and all draft-blocking issues are explicit.
ReflectionPolicy: required
LearningProposalPolicy: required
PrimaryRuntime: different_from_outline_author_required_when_available
```
