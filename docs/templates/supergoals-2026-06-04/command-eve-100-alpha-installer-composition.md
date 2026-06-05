# Command EVE 1.0 Alpha Installer Composition

```yaml
role: role:cto
parent_seat: role:coo
agent: codex
mode: implement
workspace: registry:company-os
dispatch: manual
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/scripts/install/public-rc.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/install-command-eve.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/command-eve-installer-core.mjs
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/README.md
scope:
  - include install sequence, clientRoot/sourceRoot separation, reports and start-command emission.
  - exclude hosted account provisioning, one-click OAuth and signed app packaging.
acceptance_criteria:
  - Public install can write EVE boot packet to a target workspace.
  - Operator-shell installer accepts --client-root and writes sidecars under that target.
  - Installer dry-run prints staged work without writing sidecar state.
  - Install report records source root, client root, component versions and blocked actions.
gates:
  - node scripts/operator-shell/install-command-eve.mjs install --dry-run --client-root /tmp/company-eve-client --json
  - node --test scripts/operator-shell/command-eve-installer-core.test.mjs
human_gate: HG-2.5
reporting: Plane worker.reported with install command, report path, dry-run output and remaining manual steps.
blocked_actions: no private source copy into target, no destructive overwrite without force, no raw secret collection.
```
