# Command EVE Scheduler Kill-Switch and Budget Brake

Status: Plane-ready child contract draft
Date: 2026-06-05
Version band: `0.9.x`
Plane refs: `[WORK_ITEM_ID]`

```yaml
role: role:cto
parent_seat: role:coo
agent: codex
mode: implement
workspace: registry:company-os
dispatch: ready
target_class: main-integrated
depends_on:
  - command-eve-alpha2-08-09-closure-parent
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-runtime-dispatcher-v1.md
  - ${COMPANY_OS_ROOT}/docs/governance/fast-lane-flight-doctrine.md
  - ${COMPANY_OS_ROOT}/docs/operations/runtime-auth-preflight.md
  - ${COMPANY_OS_ROOT}/docs/operations/hard-cron-wrapper.md
  - ${COMPANY_OS_ROOT}/scripts/orchestration/runtime-dispatcher-v1.mjs
  - ${COMPANY_OS_ROOT}/scripts/runtime/hard-cron-wrapper.mjs
scope:
  - include default scheduler kill-switch, budget brake, heartbeat, timeout, cooldown and manual override behavior for client-installable Command EVE.
  - exclude autonomous production deploys, customer spend, hidden background tasks and hosted account control.
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/orchestration/
  - ${COMPANY_OS_ROOT}/docs/operations/
  - ${COMPANY_OS_ROOT}/scripts/orchestration/
  - ${COMPANY_OS_ROOT}/scripts/runtime/
  - ${COMPANY_OS_ROOT}/registries/
acceptance_criteria:
  - Scheduler cannot spawn costly or state-changing work without an explicit budget and kill-switch state.
  - Budget brake output is inspectable by EVE/CEO before dispatch and in post-run reports.
  - Failure states map to PASS, REJECT, BLOCKED_AUTH, BLOCKED_BUDGET, BLOCKED_DEPENDENCY, TIMEOUT, RUNTIME_ERROR or NEEDS_HUMAN.
gates:
  - node --test scripts/orchestration/runtime-dispatcher-v1.test.mjs
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-05/command-eve-alpha2-scheduler-killswitch-budget-brake.md --label role:cto
  - Security/code review before publish.
human_gate: HG-3
reporting: Plane worker.reported with changed files, tests, failure-state table, rollback and residual risks.
blocked_actions: do not enable default background spend, run customer actions, deploy, tag, merge without review, bypass budget gates or mark Done.
reflection_policy: required
learning_proposal_policy: required
```
