# Command EVE Ladder and Context Topology Integration

Status: Plane-ready child contract draft
Date: 2026-06-05
Version band: `0.8.x` / `0.9.x`
Plane refs: `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]`

```yaml
role: role:cto
parent_seat: role:coo
agent: codex
mode: verify
workspace: registry:company-os
dispatch: ready
target_class: main-integrated
depends_on:
  - command-eve-alpha2-08-09-closure-parent
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/supergoal-execution-ladder.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/knowledge-context-topology.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/workstream-session-continuity.md
  - ${COMPANY_OS_ROOT}/scripts/orchestration/supergoal-execution-ladder-core.mjs
  - ${COMPANY_OS_ROOT}/scripts/orchestration/context-router-core.mjs
  - ${COMPANY_OS_ROOT}/scripts/orchestration/session-continuity-router.mjs
scope:
  - include proving that execution ladder, target-class truth, context routing and session continuity are attached to the Command EVE release flow.
  - exclude new knowledge store implementation, hosted graph backend, private memory migration and autonomous HG-4 decisions.
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/orchestration/
  - ${COMPANY_OS_ROOT}/scripts/orchestration/
  - ${COMPANY_OS_ROOT}/registries/sessions/
acceptance_criteria:
  - Supergoal ladder can classify alpha2 closure lanes without pretending report-only work is integrated or deployed.
  - Context topology identifies source-truth slices for install, dashboard, support/privacy, scheduler, observability and connector lanes.
  - Session continuity remains opt-in and does not weaken fresh audit/security gates.
gates:
  - node --test scripts/orchestration/supergoal-execution-ladder-core.test.mjs scripts/orchestration/context-router-core.test.mjs scripts/orchestration/session-continuity-router.test.mjs
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-05/command-eve-alpha2-ladder-context-topology-integration.md --label role:cto
human_gate: HG-2.5
reporting: Plane worker.reported with target-class proof, context-route proof, session-continuity proof, changed files and blockers.
blocked_actions: do not create hosted graph storage, persist private memory, mark Done, claim deployment or bypass fresh audit gates.
reflection_policy: required
learning_proposal_policy: required
```
