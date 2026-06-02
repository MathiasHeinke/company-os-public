# Company.OS Book Authoring Research Worker Contract

Use this template for Discovery Research and Frame Grounding before outline.

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: research
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${BOOK_PROJECT_ROOT}/00_book_spec/BOOK_SPEC.md
  - ${BOOK_PROJECT_ROOT}/01_fvbm/FVBM.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-book-authoring-department-pack-v0.md
  - ${COMPANY_OS_ROOT}/docs/operations/eve-founder-voice-belief-model.md
acceptance_criteria:
  - Research dossier maps core facts, debates, strongest counterarguments, open questions and source quality.
  - Source ledger lists source type, claim supported, evidence quality, date checked and unresolved verification gaps.
  - Proof Plan is complete enough to decide which claims may enter official outline architecture and which must stay hypotheses.
  - Frame Brief classifies founder desired frame elements as supported, strained, unsupported or open.
  - Proof Plan identifies which claims need market data, studies, press examples, founder dogfood evidence, user reports or expert quotes before outline hardening.
  - Worker explicitly reports `outline_gate_ready: true|false`; it may be true only when dossier, source ledger, proof plan and Frame Brief inputs exist.
  - Output separates facts, inferences and hypotheses and does not invent citations.
  - Worker-ledger validation reports only contract.dispatch-not-ready while dispatch stays manual.
  - Report exact blockers instead of claiming completion from partial output.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-book-authoring-research-worker-contract.md --label role:cmo
  - test -f ${BOOK_PROJECT_ROOT}/00_book_spec/BOOK_SPEC.md
  - test -f ${BOOK_PROJECT_ROOT}/01_fvbm/FVBM.md
human_gate: HG-3.5
hg35_pause_artifact: ${BOOK_PROJECT_ROOT}/03_frame_outline/frame-brief-hg35-decision-card.md
reporting: Plane worker.reported with dossier path, frame brief path, source list, unresolved claims, gate results, reflection and learning_proposals.
BlockedActions: do not draft chapters; do not publish, send or spend; do not write durable memory; do not turn hypotheses into claims; do not mark Done.
CapabilityProfile: claude-clevel-worker/cmo/book-authoring
OutcomeSpec: Produce a research dossier and Frame Brief that can safely feed outline work.
OutcomeRubric: PASS only when frame decisions are evidence-backed and founder-belief tension is explicit.
ReflectionPolicy: required
LearningProposalPolicy: required
```
