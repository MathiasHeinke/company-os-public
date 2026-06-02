# Company.OS Book Authoring Opus Max Perspective Worker Contract

Use this template for the mandatory second-perspective pass after a substantial
book artifact exists: full-spine draft, expanded manuscript, claim inventory or
major sharpening package.

This pass is not a replacement for the formal CAO manuscript audit. It is the
"fresh senior reader" pass that decides whether the artifact is ready for
expansion, sharpening or CAO audit.

```yaml
role: role:cao
parent_seat: role:cmo
agent: claude
mode: audit
workspace: registry:company-os
dispatch: manual
runtime_preference: claude-opus-max-1m; requested_model=Claude Opus 4.8 Max 1M or newest available Opus Max 1M; local_verified_alias=opus; sanity_check_required=true
source_of_truth:
  - ${BOOK_PROJECT_ROOT}/00_book_spec/BOOK_SPEC.md
  - ${BOOK_PROJECT_ROOT}/01_fvbm/FVBM.md
  - ${BOOK_PROJECT_ROOT}/02_research/source-ledger.md
  - ${BOOK_PROJECT_ROOT}/02_research/proof-plan.md
  - ${BOOK_PROJECT_ROOT}/03_frame_outline/frame-brief.md
  - ${BOOK_PROJECT_ROOT}/03_frame_outline/outline.md
  - ${BOOK_PROJECT_ROOT}/03_frame_outline/founder-decision-card.md
  - ${BOOK_PROJECT_ROOT}/04_claim_inventory/claim-inventory.md
  - ${BOOK_PROJECT_ROOT}/05_drafts/manuscript-or-full-spine.md
  - ${BOOK_PROJECT_ROOT}/06_audit/previous-verdicts.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-book-authoring-department-pack-v0.md
acceptance_criteria:
  - Worker reads the actual artifact, not only summaries or claim inventory.
  - Worker gets enough source context to challenge voice, claims, evidence, structure and offer placement.
  - Verdict distinguishes spine-read, expansion-readiness, CAO-readiness and public-readiness.
  - Verdict lists the two highest-leverage fixes before weaker nits.
  - Verdict checks whether dogfood errors are shown honestly instead of sanitized.
  - Verdict checks whether claim guards are held in prose, not only in inventory.
  - Verdict checks whether the manuscript shows concrete mechanisms, not only concepts.
  - Verdict checks rhythm/voice fatigue, repetition and AI-tell cadence.
  - Verdict identifies whether formal CAO audit should run now or after another sharpening pass.
  - Worker output is treated as untrusted until controller reviews the evidence.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-book-authoring-opus-max-perspective-worker-contract.md --label role:cao
  - test -f ${BOOK_PROJECT_ROOT}/05_drafts/manuscript-or-full-spine.md
  - test -f ${BOOK_PROJECT_ROOT}/04_claim_inventory/claim-inventory.md
human_gate: HG-3.5
hg35_pause_artifact: ${BOOK_PROJECT_ROOT}/06_audit/opus-max-perspective-verdict.md
reporting: Plane worker.reported with verdict path, top fixes, pass/fail/park recommendation, CAO timing recommendation, evidence notes, prompt-injection/tool-output integrity notes, reflection and learning_proposals.
BlockedActions: do not edit manuscript directly; do not publish, submit, send, schedule or spend; do not downgrade HumanGates; do not mark Done; do not trust own output as final controller decision.
CapabilityProfile: claude-clevel-worker/cao/book-authoring-perspective
OutcomeSpec: Produce an independent senior-reader perspective on whether the artifact is ready for expansion, sharpening or CAO audit.
OutcomeRubric: PASS only when the review is grounded in actual manuscript evidence, preserves claim boundaries, and gives concrete next edits rather than generic praise.
ReflectionPolicy: required
LearningProposalPolicy: required
ControllerReviewPolicy: required
```

Publication, title lock and strategic positioning changes remain HG-4 even when
the perspective pass itself is HG-3.5.

## Invocation Note

In local Claude Code runtimes, run a short sanity check before dispatch and use
the verified Opus Max alias for that runtime. At the time this template was
written, the local verified alias is:

```bash
claude -p "<sanity prompt>" --model opus --permission-mode plan --output-format text --max-turns 3
```

For real passes, provide a boot packet that quotes paths and gives the worker
permission to read the declared local artifacts only. Never paste secrets,
customer data or raw private communication.
