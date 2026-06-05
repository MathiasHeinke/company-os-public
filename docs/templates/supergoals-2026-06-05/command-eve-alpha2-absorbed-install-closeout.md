# Command EVE Alpha2 Absorbed Install Closeout

Status: Plane-ready child contract draft
Date: 2026-06-05
Version band: `0.9.x` absorbed into `1.0.0-alpha.2`
Plane refs: `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]`

```yaml
role: role:coo
parent_seat: role:coo
agent: codex
mode: verify
workspace: registry:company-os
dispatch: ready
target_class: report-only
depends_on:
  - command-eve-alpha2-08-09-closure-parent
source_of_truth:
  - ${COMPANY_OS_ROOT}/VERSION
  - ${COMPANY_OS_ROOT}/docs/releases/1.0-command-eve-operator-shell-alpha.md
  - ${COMPANY_OS_ROOT}/docs/releases/2026-06-05-command-eve-08-09-reconciliation.md
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-06-04/command-eve-100-alpha2-self-install-parent.md
  - ${COMPANY_OS_ROOT}/scripts/install/command-eve-self-install.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/install-command-eve.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/start_eve.mjs
  - ${COMPANY_OS_ROOT}/scripts/update/company-os-update.mjs
scope:
  - include evidence closeout for alpha2 release baseline, install/update CLI, clean/live install proof and EVE first-run confirmation.
  - exclude Plane Done transitions, release tags, hosted account creation, stable claims and customer-specific install changes.
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/reports/release/
  - ${COMPANY_OS_ROOT}/docs/releases/
acceptance_criteria:
  - Closeout packet maps `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]` and `[WORK_ITEM_ID]` to exact public proof files, commands or report paths.
  - Each item is classified as closeout candidate, partial or blocked with a concrete missing artifact.
  - Any closeout recommendation states that CEO/Founder must still decide Done separately.
gates:
  - node scripts/release/verify-clean-clone.mjs --root <tmp-public> --json
  - node scripts/install/self-serve-smoke.mjs --root <tmp-public> --json
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-05/command-eve-alpha2-absorbed-install-closeout.md --label role:coo
human_gate: HG-2.5
reporting: Plane worker.reported with evidence map, closeout candidates, blockers, commands run and CEO decision needed.
blocked_actions: do not mark Done, tag, publish, deploy, collect secrets, modify customer machines or claim stable release.
reflection_policy: required
learning_proposal_policy: required
```
