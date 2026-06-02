# Company.OS Book Authoring Draft Worker Contract

Use this template for bounded chapter drafting and adversarial sharpening. One
contract should cover a chapter batch, not the whole book unless the manuscript
is short.

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: implement
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
  - ${BOOK_PROJECT_ROOT}/03_frame_outline/outline-cao-checkpoint.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-book-authoring-department-pack-v0.md
acceptance_criteria:
  - Drafted chapters follow the approved outline and StyleProfile.
  - Research-before-outline gate has passed; drafts do not use a pre-research sketch as authoritative outline.
  - Outline CAO Checkpoint has been reflected before drafting starts.
  - At least one adversarial pass attacks repetition, weak steelman sections, unsupported certainty and generic AI voice.
  - Claims that need sources are marked for the Claim Inventory instead of asserted as verified.
  - If this produces a full-spine draft or major sharpening package, request the Opus Max Perspective Pass and do not treat the artifact as CAO-ready until that verdict is reflected.
  - Compliance sweep passes or reports exact blockers.
  - Worker-ledger validation reports only contract.dispatch-not-ready while dispatch stays manual.
  - Report exact blockers instead of claiming completion from partial output.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-book-authoring-draft-worker-contract.md --label role:cmo
  - test -f ${BOOK_PROJECT_ROOT}/02_research/source-ledger.md
  - test -f ${BOOK_PROJECT_ROOT}/02_research/proof-plan.md
  - test -f ${BOOK_PROJECT_ROOT}/03_frame_outline/outline-cao-checkpoint.md
  - node scripts/content/book-authoring-compliance-sweep.mjs --manuscript ${BOOK_PROJECT_ROOT}/05_drafts/manuscript.md --fvbm ${BOOK_PROJECT_ROOT}/01_fvbm/FVBM.md --voice-belief-report ${BOOK_PROJECT_ROOT}/06_audit/voice-belief-match.md --json
human_gate: HG-2
reporting: Plane worker.reported with draft paths, compliance output, unresolved claims, requested audit, reflection and learning_proposals.
BlockedActions: do not publish, submit, send, schedule or spend; do not make regulated public claims; do not write durable memory; do not bypass CAO audit; do not mark Done.
CapabilityProfile: claude-clevel-worker/cmo/book-authoring
OutcomeSpec: Produce bounded chapter drafts plus sharpening notes ready for claim inventory and CAO blind audit.
OutcomeRubric: PASS only when drafts are voice-grounded, claim-risk marked, adversarially sharpened and compliance-gated.
ReflectionPolicy: required
LearningProposalPolicy: required
PrimaryRuntime: claude
SecondaryAuditor: codex_or_separate_model_required
```
