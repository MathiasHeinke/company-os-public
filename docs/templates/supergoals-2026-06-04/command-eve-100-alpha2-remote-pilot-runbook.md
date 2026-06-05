# Command EVE 1.0.0-alpha.2 Remote Pilot Runbook

```yaml
role: role:coo
parent_seat: role:coo
agent: codex
mode: implement
workspace: registry:company-os
dispatch: ready
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/releases/1.0-command-eve-operator-shell-alpha.md
  - ${COMPANY_OS_ROOT}/docs/operations/company-os-client-rollout-doctrine.md
  - ${COMPANY_OS_ROOT}/docs/operations/client-productization-readiness.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-install-record.md
scope:
  - include Google Meet handoff script, screen-share checklist, install steps, support responses, privacy boundaries and post-call evidence capture.
  - exclude legal terms, pricing automation, hosted account creation, customer-specific consulting delivery and production support SLA.
acceptance_criteria:
  - Runbook tells an operator exactly what to do before, during and after the remote install call.
  - Failure modes are named: missing Bun, provider auth missing, AionUI build failure, Hermes smoke failure, update collision, stale UI version.
  - The runbook includes what must not be collected: passwords, cookies, raw tokens, browser storage, private files unrelated to install.
  - Post-call report captures install result, version, blockers, next step and whether beta evidence exists.
gates:
  - rg -n "Bun|provider|Hermes|AionUI|update|privacy|token|password" docs/operations docs/releases README.md
  - node scripts/page-index/generate-page-index.mjs --root . --check
  - git diff --check
human_gate: HG-2.5
reporting: Plane worker.reported with runbook path, checklist coverage, unresolved support risks and next pilot date if known.
blocked_actions: no legal commitment, no price collection, no customer data ingestion beyond install seed, no hosted account creation.
```
