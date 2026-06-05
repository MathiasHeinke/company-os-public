# Command EVE 1.0.0-alpha.2 Beta Promotion Gate

```yaml
role: role:cao
parent_seat: role:coo
agent: codex
mode: audit
workspace: registry:company-os
dispatch: ready
target_class: report-only
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-06-04/command-eve-100-alpha2-self-install-parent.md
  - ${COMPANY_OS_ROOT}/docs/operations/client-productization-readiness.md
  - ${COMPANY_OS_ROOT}/docs/releases/versioning.md
  - ${COMPANY_OS_ROOT}/scripts/release-gates/productization-readiness.mjs
  - ${COMPANY_OS_ROOT}/scripts/release/verify-clean-clone.mjs
scope:
  - include CAO/security/privacy/support review of alpha.2 evidence and beta promotion recommendation.
  - exclude implementing fixes, marking Plane Done, tagging releases, public announcements and hosted deployment.
acceptance_criteria:
  - Gate reviews at least one fresh public-source install/update/start evidence packet.
  - Gate states whether `1.0.0-beta.1` is justified or which blockers keep the product in alpha.
  - Privacy posture is explicit: local-first, BYOK, no hosted tenant, no raw key capture.
  - Supportability posture is explicit: known failure modes, runbook, rollback/update behavior and unresolved manual repairs.
gates:
  - node scripts/release-gates/productization-readiness.mjs check --root . --json
  - node scripts/release/verify-clean-clone.mjs --root <tmp-public> --json
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-04/command-eve-100-alpha2-self-install-parent.md --label role:coo
human_gate: HG-3
reporting: Plane controller/CAO report with PASS/REJECT/PARK, beta recommendation, evidence paths, risk table and required fixes.
blocked_actions: no implementation, no release tag, no GitHub Release upload, no stable claim, no hosted customer data, no Plane Done.
```
