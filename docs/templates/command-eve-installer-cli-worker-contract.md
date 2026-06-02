# Command EVE Installer CLI Worker Contract

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: implement
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
depends_on: [WORK_ITEM_ID], [WORK_ITEM_ID]
source_of_truth:
  - ${COMPANY_OS_ROOT}/scripts/install/bootstrap.mjs
  - ${COMPANY_OS_ROOT}/scripts/install/bootstrap-core.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/eve-sidecar.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/eve-sidecar-core.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/aionui-command-eve-overlay.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/aionui-command-eve-overlay-core.mjs
  - ${COMPANY_OS_ROOT}/scripts/update/company-os-update.mjs
  - ${COMPANY_OS_ROOT}/docs/orchestration/command-eve-installable-operator-shell-plane-contracts.md
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/installer-architecture.md
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/aionui-extension-design.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/spec-to-worker-pipeline.md
scope:
  - include installer CLI dry-run, preflight, start, repair and update command design plus bounded implementation in existing install/operator-shell scripts.
  - include deterministic AionUI Command EVE context-bundle generation compatible with [WORK_ITEM_ID].
  - preserve existing legacy overlay behavior unless replacing it is explicitly report-backed and backward-compatible.
  - exclude remote installer execution, AionUI source fork, client auth overwrite, production writes, public release, deploy, push, merge and Plane Done.
sandbox: required
acceptance_criteria:
  - CLI design supports one-time install, preflight, start, repair and update commands for Command EVE.
  - Installer pins Company.OS version and records install metadata before any runtime starts.
  - Installer prepares EVE context, AionUI extension artifacts and Hermes wrapper without overwriting local client state.
  - Dry-run output lists all writes, collisions, required external downloads and next human auth steps.
  - Worker-ledger validation passes with no reason codes.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/command-eve-installer-cli-worker-contract.md --label role:cto
  - node scripts/install/bootstrap.mjs install --source ${COMPANY_OS_ROOT} --target ${COMPANY_OS_ROOT}/tmp/command-eve-installer-smoke --dry-run --json
  - node scripts/operator-shell/aionui-command-eve-overlay.mjs apply --company-os-root ${COMPANY_OS_ROOT} --private-root ${COMPANY_OS_ROOT}/tmp/command-eve-private-smoke --aionui-root ${COMPANY_OS_ROOT}/tmp/command-eve-aionui-smoke --dry-run --json
  - node scripts/operator-shell/eve-sidecar.mjs prepare --company-os-root ${COMPANY_OS_ROOT} --dry-run --json
  - node --test scripts/operator-shell/aionui-command-eve-overlay-core.test.mjs scripts/operator-shell/eve-sidecar-core.test.mjs
human_gate: HG-2.5
reporting: Plane worker.reported with CLI design or changed files, dry-run output path, collision handling, gate results, blockers, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cto/runtime
inference_class: P1-code-bounded
runtime_permission_mode: acceptEdits
runtime_auth: claude max local auth present
maxruntime: 1800s
max_spend: EUR 0
killswitch: ${COMPANY_OS_ROOT}/runtime/killswitch/[WORK_ITEM_ID].stop
heartbeat: 60s
allowed_read_paths:
  - ${COMPANY_OS_ROOT}
  - ${LOCAL_WORKSPACE}
allowed_claude_tools:
  - Bash(node scripts/install/bootstrap.mjs*)
  - Bash(node scripts/operator-shell/aionui-command-eve-overlay.mjs*)
  - Bash(node scripts/operator-shell/eve-sidecar.mjs*)
allowed_write_paths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
outcome_artifacts:
  - ${LOCAL_WORKSPACE}
blocked_actions: do not download or execute remote installers without explicit approval; do not overwrite client auth or company facts; do not push, merge, deploy, spend, request secrets or mark Plane Done.
outcome_spec: Produce or implement the bounded Command EVE installer CLI slice with dry-run-first behavior and Spec-to-Worker boundaries.
outcome_rubric: PASS only when install/preflight/start/update behavior is deterministic, collision-safe and report-backed.
reflection_policy: required
learning_proposal_policy: required
```
