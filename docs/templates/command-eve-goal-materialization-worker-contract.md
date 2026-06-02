# Command EVE Goal Materialization Worker Contract

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: implement
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
depends_on: [WORK_ITEM_ID]
source_of_truth:
  - ${COMPANY_OS_ROOT}/scripts/goal/goal.mjs
  - ${COMPANY_OS_ROOT}/scripts/goal/goal-core.mjs
  - ${COMPANY_OS_ROOT}/scripts/goal/goal-core.test.mjs
  - ${COMPANY_OS_ROOT}/docs/operations/goal-command.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/goal-runtime-plane-loop.md
  - ${COMPANY_OS_ROOT}/docs/templates/worker-issue-contract.md
  - ${COMPANY_OS_ROOT}/docs/templates/command-eve-installable-operator-shell-parent-worker-contract.md
  - ${COMPANY_OS_ROOT}/docs/templates/command-eve-*.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/command-eve-installable-operator-shell-plane-contracts.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/spec-to-worker-pipeline.md
scope:
  - include GoalState mapping, ObjectiveLoop promotion rules, Plane parent/child materialization and blocker taxonomy.
  - include a dry-run materialization example for the Command EVE installable operator shell parent and its child set.
  - include exact mapping from contract template fields to goal.mjs materialize arguments and Plane payloads.
  - include tests or dry-runs proving goal materialization writes reports only and does not apply to Plane.
  - include parser-safe final reporting: the final worker response must end with a machine-readable `worker.reported` YAML block whose last `state:` field is `PASS` when all gates pass.
  - exclude live worker dispatch, materialize --apply, Plane Done, bypassing Stage 0.5 or Stage 0.65, production writes and public release.
sandbox: required
acceptance_criteria:
  - Goal materialization plan shows how this parent and child contract set becomes a GoalState, ObjectiveLoop and Plane parent/children.
  - Plan defines promotion rules from dispatch manual to ready after Contract Controller, Runtime Executability and HumanGate evidence.
  - Plan names exact reports and controller comments required before any worker spawn.
  - Plan includes rollback or park behavior when AionUI, Hermes, Plane auth or connector preflights fail.
  - Worker-ledger validation passes with no reason codes.
  - Verification dry-run writes goal materialization report paths without `--apply` and without creating Plane work items.
  - Final worker.reported output is parser-safe even when the durable report documents failure examples such as blocked dependencies.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/command-eve-goal-materialization-worker-contract.md --label role:cto
  - node scripts/goal/goal.mjs --help
  - node --test scripts/goal/goal-core.test.mjs scripts/goal/intake-to-plane-core.test.mjs
  - node scripts/goal/goal.mjs materialize --title "Command EVE installable operator shell" --outcome "A new company can install Command EVE, see available AionUI/Hermes skills and connectors, and materialize governed Plane parent/child work from founder intent without live dispatch." --role role:cto --workspace registry:company-os --human-gate HG-2.5 --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e --project-identifier COMPA --label-map-file runtime/plane-label-map/companyos-3537d502-b5a7-4214-9f7d-8f571fb1cd1e.json --child "Installer Architecture|role:cto|claude|implement" --child "AionUI Extension|role:cpo|claude|implement" --child "Installer CLI|role:cto|claude|implement" --child "Connector Catalog|role:cto|claude|implement" --child "Hermes Runtime Packaging|role:cto|claude|implement" --child "Update Lifecycle|role:cto|claude|implement" --child "Goal Materialization|role:cto|claude|implement" --write --json
  - node scripts/orchestration/contract-controller.mjs --help
human_gate: HG-2.5
reporting: Plane worker.reported with goal materialization plan, proposed Plane parent/child titles, promotion gates, blocker taxonomy, reflection and learning_proposals. Final response must end with a fenced YAML worker.reported block and the last `state:` field in stdout must be `PASS` when gates pass; do not let blocker taxonomy examples become the final parseable state.
capability_profile: claude-clevel-worker/cto/runtime
inference_class: P1-code-bounded
runtime_permission_mode: acceptEdits
runtime_auth: claude max local auth present
maxruntime: 1200s
max_spend: EUR 0
killswitch: ${COMPANY_OS_ROOT}/runtime/killswitch/[WORK_ITEM_ID].stop
heartbeat: 60s
allowed_read_paths:
  - ${COMPANY_OS_ROOT}
  - ${LOCAL_WORKSPACE}
allowed_claude_tools:
  - Bash(node scripts/orchestration/worker-ledger-validator.mjs*)
  - Bash(node scripts/goal/goal.mjs*)
  - Bash(node --test scripts/goal/*)
  - Bash(node scripts/orchestration/contract-controller.mjs*)
  - Bash(git status*)
  - Bash(git diff*)
  - Bash(git diff --check*)
allowed_write_paths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
outcome_artifacts:
  - ${LOCAL_WORKSPACE}
blocked_actions: do not run goal.mjs materialize --apply; do not create live Plane items without CEO approval; do not dispatch workers; do not mark Done; do not bypass Stage 0.5, Stage 0.65 or HumanGate checks.
outcome_spec: Produce or implement the bridge plan that lets a future /goal run materialize this package into Plane safely, following Spec-to-Worker boundaries.
outcome_rubric: PASS only when later goal execution can run without reinterpreting loose prose.
reflection_policy: required
learning_proposal_policy: required
```
