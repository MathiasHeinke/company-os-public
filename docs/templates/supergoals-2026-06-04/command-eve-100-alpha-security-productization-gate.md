# Command EVE 1.0 Alpha Security And Productization Gate

```yaml
role: role:cto
parent_seat: role:coo
agent: codex
mode: audit
workspace: registry:company-os
dispatch: manual
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/scripts/release/verify-clean-clone.mjs
  - ${COMPANY_OS_ROOT}/scripts/release/build-public-mirror.mjs
  - ${COMPANY_OS_ROOT}/scripts/release-gates/productization-readiness.mjs
  - ${COMPANY_OS_ROOT}/registries/operator-shell/command-eve-1.0-alpha.json
scope:
  - include public mirror strip rules, secret/path scans, reader-surface marker scans, dependency license notes and blocked-action checks.
  - exclude penetration testing of upstream AionUI/Hermes, production deploys and provider account/payment changes.
acceptance_criteria:
  - Public mirror includes the operator-shell installer and manifest but no private reports, metrics ledgers or source-company reader markers.
  - Secret scan and private path scan pass.
  - AionUI Apache-2.0 and Hermes MIT licenses are recorded in manifest/docs.
  - Installer reports prerequisites and auth blockers without collecting secrets.
gates:
  - node scripts/release-gates/productization-readiness.mjs check
  - node scripts/release/verify-fresh-history-remote.mjs --json
  - node --test scripts/release/build-public-mirror.test.mjs scripts/release/verify-clean-clone.test.mjs scripts/operator-shell/command-eve-installer-core.test.mjs
human_gate: HG-3
reporting: Plane worker.reported with PASS/REJECT, evidence paths and required Founder/CEO decisions.
blocked_actions: no tag, release, deploy, Plane Done, production write, schema/RLS/auth change or autonomous publish/send/spend.
```
