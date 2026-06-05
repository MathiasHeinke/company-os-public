# Command EVE Remote Onboarding Pilot Handoff

Status: Plane-ready child contract draft
Date: 2026-06-05
Version band: `0.9.x`
Plane refs: `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]`

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
  - ${COMPANY_OS_ROOT}/README.md
  - ${COMPANY_OS_ROOT}/docs/releases/1.0-command-eve-operator-shell-alpha.md
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-06-04/command-eve-100-alpha2-remote-pilot-runbook.md
  - ${COMPANY_OS_ROOT}/docs/operations/eve-first-run-founder-onboarding.md
  - ${COMPANY_OS_ROOT}/scripts/install/command-eve-self-install.mjs
scope:
  - include remote first-pilot runbook, preflight checklist, consent language, install/update/start smoke, failure modes and support escalation.
  - exclude customer-specific customization, hosted account provisioning, stable support SLA and autonomous external publishing/sending/spend.
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/README.md
  - ${COMPANY_OS_ROOT}/docs/operations/
  - ${COMPANY_OS_ROOT}/docs/releases/
  - ${COMPANY_OS_ROOT}/reports/release/
acceptance_criteria:
  - A non-technical founder can follow the remote runbook with a human on a call.
  - Runbook says exactly which facts EVE already knows, what she asks next and which setup can happen later.
  - Support path records install evidence without collecting secrets or private raw data.
gates:
  - node scripts/install/command-eve-self-install.mjs --dry-run --json
  - node scripts/update/company-os-update.mjs check --root . --json
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-05/command-eve-alpha2-remote-onboarding-pilot-handoff.md --label role:coo
human_gate: HG-2.5
reporting: Plane worker.reported with runbook path, smoke evidence, support risks, exact manual steps and next pilot decision.
blocked_actions: do not customize for one client, collect secrets, install paid providers without consent, publish/send/spend, deploy hosted systems or mark Done.
reflection_policy: required
learning_proposal_policy: required
```
