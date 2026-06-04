# Command EVE 0.9 RC Clean Install Smoke

Prove that the public source can be cloned and smoke-tested as a clean remote
install candidate.

```yaml
role: role:cto
parent_seat: role:coo
agent: claude
mode: verify
workspace: ${COMPANY_OS_ROOT}
dispatch: ready
run_at: 2026-06-03 22:00 Europe/Berlin
sandbox: required
target_class: report-only
source_of_truth:
  - ${COMPANY_OS_ROOT}/README.md
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/README.md
  - ${COMPANY_OS_ROOT}/scripts/release/verify-clean-clone.mjs
  - ${COMPANY_OS_ROOT}/scripts/release-gates/productization-readiness.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/start_eve.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/eve-sidecar.mjs
scope:
  - include clean clone, kit install/readiness check, update dry-run check and EVE sidecar preflight where local dependencies allow.
  - exclude non-dry-run client updates, production deploys, connector OAuth, paid account setup, private overlay import, private overlay availability checks and public release publish.
acceptance_criteria:
  - Clean-clone verification passes or records exact blockers with commands to reproduce.
  - Kit install/readiness docs are sufficient for a remote founder to reach first EVE launch or a clear dependency blocker.
  - EVE sidecar/preflight either passes or reports missing local dependencies without leaking secrets.
  - Update dry-run from public source proves protected local-state behavior.
  - Smoke report is written under the release report directory with exact commands and results.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-03/command-eve-080-rc-clean-install-smoke.md --label role:cto
  - node scripts/release/verify-clean-clone.mjs --root ${COMPANY_OS_ROOT}
  - node scripts/release-gates/productization-readiness.mjs check
  - node scripts/operator-shell/eve-sidecar.mjs preflight --company-os-root ${COMPANY_OS_ROOT} --json
  - node scripts/update/company-os-update.mjs apply --source ${COMPANY_OS_ROOT} --target ${COMPANY_OS_ROOT} --dry-run
human_gate: HG-2
reporting: Plane worker.reported with smoke report path, commands, pass/fail matrix, install blockers, update blockers, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cto/runtime
runtime_permission_mode: default
runtimeauth: app-token
maxruntime: 1200s
maxspend: EUR 0
killswitch: stop on scope guard, auth prompt, protected-state write, private overlay path access, non-dry-run client update or CEO cancellation.
heartbeat: 120s Plane worker.run-summary while running.
allowed_read_paths:
  - ${COMPANY_OS_ROOT}
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/reports/releases/0.9-public-rc/
outcome_artifacts:
  - ${COMPANY_OS_ROOT}/reports/releases/0.9-public-rc/clean-install-smoke.md
blocked_actions: do not write source files unless asked by CEO; do not inspect, list, read or test availability of private overlay paths; do not run real client updates, connector OAuth, release publishing, merge, deploy, request secrets or write Plane Done.
outcome_spec: Produce the Spec-to-Worker clean-install smoke report for the 0.9 public RC using reproducible commands and exact blocker evidence.
outcome_rubric: PASS only when clean-clone, productization readiness, EVE preflight and update dry-run either pass or report exact reproducible blockers without leaking secrets.
reflection_policy: required
learning_proposal_policy: required
```
