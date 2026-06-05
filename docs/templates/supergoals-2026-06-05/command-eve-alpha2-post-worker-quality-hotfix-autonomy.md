# Command EVE Post-Worker Quality and Hotfix Autonomy

Status: Plane-ready child contract draft
Date: 2026-06-05
Version band: `0.8.x` / `0.9.x`
Plane refs: `[WORK_ITEM_ID]`

```yaml
role: role:cao
parent_seat: role:coo
agent: claude
mode: audit
workspace: registry:company-os
dispatch: ready
target_class: report-only
depends_on:
  - command-eve-alpha2-08-09-closure-parent
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/post-worker-quality-loop.md
  - ${COMPANY_OS_ROOT}/docs/templates/post-worker-quality-worker-contracts.md
  - ${COMPANY_OS_ROOT}/registries/quality/post-worker-quality-loop.json
  - ${COMPANY_OS_ROOT}/scripts/orchestration/post-worker-quality-loop-core.mjs
  - ${COMPANY_OS_ROOT}/scripts/orchestration/post-worker-quality-scheduler-core.mjs
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/.agents/workflows/security-sweep.md
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/.agents/workflows/hotfix.md
scope:
  - include the mandatory post-worker audit fanout for coding work: quality auditor, security auditor, bug/regression auditor, deep-audit worker and hotfix worker.
  - exclude autonomous merge, deployment, release tagging, production writes and hidden bypass of CEO/Founder gates.
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/orchestration/
  - ${COMPANY_OS_ROOT}/docs/templates/
  - ${COMPANY_OS_ROOT}/registries/quality/
  - ${COMPANY_OS_ROOT}/scripts/orchestration/
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/.agents/workflows/
acceptance_criteria:
  - Coding work default path explicitly requires security/code-review/regression audit plus hotfix lane before publish when risk warrants it.
  - Audit fanout has clear terminal markers, no infinite loop and no worker Done authority.
  - Hotfix lane describes how findings become scoped fix contracts and how CAO/Controller re-checks them.
gates:
  - node --test scripts/orchestration/post-worker-quality-loop-core.test.mjs scripts/orchestration/post-worker-quality-scheduler-core.test.mjs
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-05/command-eve-alpha2-post-worker-quality-hotfix-autonomy.md --label role:cao
  - Security diff scan or explicit proof-gap report before publish.
human_gate: HG-3
reporting: Plane worker.reported with CAO verdict, audit fanout proof, hotfix routing proof, residual failure modes and exact publish blocker list.
blocked_actions: do not implement broad refactors, mark Done, merge, deploy, tag, approve publish or let auditors mutate production.
reflection_policy: required
learning_proposal_policy: required
```
