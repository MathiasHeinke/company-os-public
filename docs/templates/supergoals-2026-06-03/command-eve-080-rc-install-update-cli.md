# Command EVE 0.9 RC Install And Update Command Path

Make the install and update path concrete enough for a remote founder: fresh
install from GitHub and update from 0.7.4 to 0.9.x with a simple documented
command and dry-run proof.

```yaml
role: role:cto
parent_seat: role:coo
agent: claude
mode: implement
workspace: ${COMPANY_OS_ROOT}
dispatch: ready
run_at: 2026-06-03 21:20 Europe/Berlin
sandbox: required
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/scripts/update/company-os-update.mjs
  - ${COMPANY_OS_ROOT}/scripts/update/company-os-update-core.mjs
  - ${COMPANY_OS_ROOT}/scripts/update/company-os-update-core.test.mjs
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/README.md
  - ${COMPANY_OS_ROOT}/docs/operations/company-os-client-rollout-doctrine.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-install-record.md
scope:
  - include install/update command documentation, 0.7.4-to-0.9.x update dry-run, provenance reporting and protected-local-state checks.
  - exclude non-dry-run updates against private/client machines, secret collection, remote shell execution on user devices, release publishing and production deploys.
acceptance_criteria:
  - A remote founder can identify one fresh-install command or script path and one update command path from public docs.
  - Update documentation covers 0.7.4 to 0.9.x or explains the exact blocker and fallback.
  - `company-os-update` dry-run records source version, target version, source provenance and protected-file behavior.
  - Existing local overlays, secrets, memory and connector auth files are preserved or explicitly blocked for manual review.
  - Tests or dry-run reports prove the update path does not require pulling from private into public.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-03/command-eve-080-rc-install-update-cli.md --label role:cto
  - node --test scripts/update/company-os-update-core.test.mjs
  - node scripts/update/company-os-update.mjs check --source ${COMPANY_OS_ROOT} --target ${COMPANY_OS_ROOT} --write-report --json
  - node scripts/update/company-os-update.mjs apply --source ${COMPANY_OS_ROOT} --target ${COMPANY_OS_ROOT} --dry-run
human_gate: HG-2.5
reporting: Plane worker.reported with changed files, exact install command, exact update command, dry-run report paths, protected-state evidence, blockers, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cto/runtime
runtime_permission_mode: acceptEdits
runtimeauth: app-token
maxruntime: 1200s
maxspend: EUR 0
killswitch: stop on scope guard, auth prompt, protected-state write, non-dry-run client update or CEO cancellation.
heartbeat: 120s Plane worker.run-summary while running.
allowed_read_paths:
  - ${COMPANY_OS_ROOT}
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/scripts/update/
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/
  - ${COMPANY_OS_ROOT}/docs/operations/
  - ${COMPANY_OS_ROOT}/docs/templates/
  - ${COMPANY_OS_ROOT}/reports/releases/0.9-public-rc/
outcome_artifacts:
  - ${COMPANY_OS_ROOT}/reports/releases/0.9-public-rc/install-update-cli.md
blocked_actions: do not run non-dry-run updates against private/client targets; do not overwrite protected local state; do not request secrets, publish releases, merge, deploy or write Plane Done.
outcome_spec: Produce the Spec-to-Worker install/update CLI slice that lets a public install move from 0.7.4 to 0.9.x through a dry-run-first, provenance-recorded update command.
outcome_rubric: PASS only when fresh install and update commands are explicit, dry-run proof exists, source/target versions are recorded, and protected local overlays are preserved or blocked for manual review.
reflection_policy: required
learning_proposal_policy: required
```
