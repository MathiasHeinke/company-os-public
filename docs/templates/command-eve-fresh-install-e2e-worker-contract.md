# Command EVE Fresh Install E2E Worker Contract

```yaml
role: role:cao
parent_seat: role:cto
agent: claude
mode: verify
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
depends_on: [WORK_ITEM_ID]
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
scope:
  - include fake-company fresh install verification in the sandbox worktree, boot packet generation, EVE sidecar prepare/preflight dry-run, update dry-run and a durable E2E report.
  - include the real temp install target ${LOCAL_WORKSPACE} only.
  - exclude real customer data, private customer overlays, AionUI start/smoke, production writes, publish, deploy, push, merge, spend, send and Plane Done.
acceptance_criteria:
  - Fresh target install dry-run and real temp install complete in the sandbox target without unhandled collisions, missing generated files or writes outside allowed paths.
  - First-company packet, EVE boot packet, intake record and first Plane parent draft are generated from the bundled fake company intake.
  - EVE sidecar prepare dry-run and preflight pass, or the report names exact blockers and next actions without attempting start/smoke.
  - Update check dry-run proves local client state is protected and performs zero writes.
  - E2E report contains a pass/fail table for install, first-company packet, EVE sidecar, update check, privacy/path safety and residual risks.
  - Worker final response ends with parser-safe worker.reported YAML whose last state field is PASS or a justified stable non-PASS runtime state.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/command-eve-fresh-install-e2e-worker-contract.md --label role:cao
  - node scripts/install/bootstrap.mjs install --source ${LOCAL_WORKSPACE} --target ${LOCAL_WORKSPACE} --dry-run --json
  - node scripts/install/bootstrap.mjs install --source ${LOCAL_WORKSPACE} --target ${LOCAL_WORKSPACE} --force --json
  - node scripts/onboarding/first-company-packet.mjs --target ${LOCAL_WORKSPACE} --input ${LOCAL_WORKSPACE} --force --json
  - node scripts/operator-shell/eve-sidecar.mjs prepare --company-os-root ${LOCAL_WORKSPACE} --dry-run --json
  - node scripts/operator-shell/eve-sidecar.mjs preflight --company-os-root ${LOCAL_WORKSPACE} --json
  - node scripts/update/company-os-update.mjs check --source ${LOCAL_WORKSPACE} --target ${LOCAL_WORKSPACE} --write-report --json
human_gate: HG-2.5
reporting: Plane worker.reported with ${LOCAL_WORKSPACE}, commands/results, pass/fail table, residual risks, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cao/runtime
runtime_permission_mode: acceptEdits
sandbox: required
max_spend: EUR 0
maxruntime: 900s
heartbeat: 60s
killswitch: ${LOCAL_WORKSPACE}
runtime_auth: required
inference_class: P1-code-bounded
allowed_read_paths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
allowed_write_paths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
outcome_artifacts:
  - ${LOCAL_WORKSPACE}
allowed_claude_tools:
  - Read
  - Write
  - Edit
  - MultiEdit
  - Glob
  - Grep
  - LS
  - TodoWrite
  - Bash(git status*)
  - Bash(git diff*)
  - Bash(git diff --check*)
  - Bash(node --test*)
  - Bash(node scripts/orchestration/worker-ledger-validator.mjs*)
  - Bash(node scripts/install/bootstrap.mjs*)
  - Bash(node scripts/onboarding/first-company-packet.mjs*)
  - Bash(node scripts/operator-shell/eve-sidecar.mjs*)
  - Bash(node scripts/update/company-os-update.mjs*)
blocked_actions: do not use real customer data; do not write company-os-private-ops except dry-run metadata reads; do not start AionUI; do not run smoke; do not write production systems; do not publish, deploy, push, merge, spend, send or mark Plane Done.
outcome_spec: Verify the Command EVE install lifecycle on a fresh fake target, following Spec-to-Worker boundaries.
outcome_rubric: PASS only when install, boot packet, EVE sidecar and update dry-run are proven or blockers are exact.
reflection_policy: required
learning_proposal_policy: required
```
