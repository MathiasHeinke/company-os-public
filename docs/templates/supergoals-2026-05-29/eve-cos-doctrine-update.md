# Reporting Chain Doctrine: Relay to Bounded Negotiation (Doc Update)

Update the canonical reporting-chain doctrine to add the bounded EVE-to-CEO
intent refinement loop specified by the sibling ADR. Depends on the intent
refinement ADR being controller-reviewed first.

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: implement
workspace: registry:company-os
dispatch: manual
target_class: main-integrated
depends_on:
  - [WORK_ITEM_ID]
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/operations/intent-to-department-reporting-chain.md
  - ${COMPANY_OS_ROOT}/docs/page-index.md
scope:
  - include adding the intent.refinement loop section to the reporting-chain doctrine and refreshing page-index.
  - exclude changing release authority, the Codex controller doctrine, code or worker dispatch.
acceptance_criteria:
  - Reporting-chain doctrine gains an intent.refinement section matching the approved ADR (states, round cap, user-gate rule, definition-not-release invariant).
  - page-index reflects the doctrine change.
  - No change to HumanGate authority or Done ownership.
  - worker-ledger-validator passes for the edited doctrine reference and the doc edit stays within allowed_write_paths.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-05-29/eve-cos-doctrine-update.md --label role:cto
  - git diff --check
  - Controller review and CAO PASS before integration to main.
human_gate: HG-2.5
reporting: Plane worker.reported with changed files, doc diff summary, gate results, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cto/runtime
runtime_permission_mode: acceptEdits
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/operations/intent-to-department-reporting-chain.md
  - ${COMPANY_OS_ROOT}/docs/page-index.md
blocked_actions: do not change release authority or Done ownership; do not merge, push, deploy, publish or spend; integration to main is Codex/CEO under HG-2.5, not this worker.
reflection_policy: required
learning_proposal_policy: required
```
