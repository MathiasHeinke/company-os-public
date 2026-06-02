# Company.OS Book Authoring Parent Worker Contract

Use this template for the CMO parent that coordinates the Book Authoring guided
pilot. The parent creates no public output and dispatches no child workers by
itself.

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: plan
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-book-authoring-department-pack-v0.md
  - ${COMPANY_OS_ROOT}/docs/operations/eve-founder-voice-belief-model.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-book-spec.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-department-capability-pack.md
acceptance_criteria:
  - Parent setup packet exists with target root, BookSpec status, FVBM status, HumanGate policy, child roster and draft-only release boundary.
  - Skill start command is documented and can initialize the folder structure without reading private source folders or publishing.
  - Child contracts stay dispatch manual and include research, official outline, Outline CAO Checkpoint, draft lanes and Opus Max Perspective Pass.
  - Parent packet explicitly includes the research-before-outline gate: dossier, source ledger, proof plan and Frame Brief before official outline.
  - Parent packet explicitly includes the Outline CAO Checkpoint and blocks draft workers until a secondary-inference outline critique plus founder-facing decision card exists.
  - Parent packet explicitly includes the Opus Max Perspective Pass after any full-spine draft or major sharpening package, before formal CAO audit timing is accepted.
  - Worker-ledger validation reports only contract.dispatch-not-ready while dispatch stays manual.
  - Report exact blockers instead of claiming completion from partial output.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-book-authoring-parent-worker-contract.md --label role:cmo
  - node scripts/orchestration/company-os-department-pack-evaluator.mjs --pack-id book-authoring --json
  - node --test scripts/content/book-authoring-start-core.test.mjs scripts/content/book-authoring-compliance-sweep-core.test.mjs
human_gate: HG-4
reporting: Plane worker.reported with child roster, artifact paths, gate results, blockers, release recommendation, reflection and learning_proposals.
BlockedActions: do not dispatch workers automatically; do not publish, upload, submit, send, schedule, spend, write durable memory, request secrets or mark Done.
CapabilityProfile: claude-clevel-worker/cmo/book-authoring
OutcomeSpec: Produce a CEO-ready parent setup packet for a gated founder book program.
OutcomeRubric: PASS only when setup packet, child roster, BookSpec/FVBM gate status, folder initializer evidence and evaluator result are complete.
ReflectionPolicy: required
LearningProposalPolicy: required
```
