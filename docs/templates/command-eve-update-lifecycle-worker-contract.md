# Command EVE Update Lifecycle Worker Contract

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: implement
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
depends_on: [WORK_ITEM_ID]
source_of_truth:
  - ${COMPANY_OS_ROOT}/scripts/update/company-os-update.mjs
  - ${COMPANY_OS_ROOT}/scripts/update/company-os-update-core.mjs
  - ${COMPANY_OS_ROOT}/scripts/update/company-os-update-core.test.mjs
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/README.md
  - ${COMPANY_OS_ROOT}/docs/operations/company-os-client-rollout-doctrine.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/command-eve-installable-operator-shell-plane-contracts.md
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/installer-architecture.md
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/installer-cli-report.md
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/hermes-runtime-packaging.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/spec-to-worker-pipeline.md
scope:
  - include update check, dry-run, apply proposal, rollback advice, protected state list and report paths for Command EVE installs.
  - include EVE-readable update impact summary so the operator sees what changes before approving apply.
  - include command behavior for source==target or non-installed target so reports are not misleading.
  - include tests for protected state, version pinning, report classification and dry-run-first behavior.
  - exclude overwriting client company truth, auth state, local memory, production writes, push, deploy and Plane Done.
sandbox: required
acceptance_criteria:
  - Update lifecycle defines check, dry-run, apply, rollback advice and report paths for Command EVE installs.
  - Updates can refresh packaged skills, connector manifests, workflows and templates without overwriting client state.
  - Update report classifies add, update, unchanged, collision, blocked and manual-review changes.
  - EVE can explain update impact before the operator approves apply.
  - Source==target or not-yet-installed target is explicitly classified so operators do not confuse kit source checks with client update checks.
  - Worker-ledger validation passes with no reason codes.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/command-eve-update-lifecycle-worker-contract.md --label role:cto
  - node --test scripts/update/company-os-update-core.test.mjs
  - node scripts/update/company-os-update.mjs check --source ${LOCAL_WORKSPACE} --target ${LOCAL_WORKSPACE} --write-report --json
human_gate: HG-2.5
reporting: Plane worker.reported with update lifecycle artifact, dry-run report path, protected-state list, gate results, blockers, reflection and learning_proposals.
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
  - Bash(node scripts/update/company-os-update.mjs*)
  - Bash(node --test scripts/update/company-os-update-core.test.mjs*)
  - Bash(git status*)
  - Bash(git diff*)
  - Bash(git diff --check*)
allowed_write_paths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
outcome_artifacts:
  - ${LOCAL_WORKSPACE}
blocked_actions: do not overwrite install record, workspace registry, human gates, intake, auth state, local memory or first Plane drafts; do not push, deploy or mark Plane Done.
outcome_spec: Produce or implement the update lifecycle that lets a client install pull safe Command EVE updates after the first install, following Spec-to-Worker boundaries.
outcome_rubric: PASS only when update is versioned, dry-run-first, report-backed and preserves local company truth.
reflection_policy: required
learning_proposal_policy: required
```
