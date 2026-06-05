# Command EVE 1.0 Alpha Release Baseline

```yaml
role: role:coo
parent_seat: role:coo
agent: codex
mode: implement
workspace: registry:company-os
dispatch: manual
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/VERSION
  - ${COMPANY_OS_ROOT}/CHANGELOG.md
  - ${COMPANY_OS_ROOT}/README.md
  - ${COMPANY_OS_ROOT}/docs/releases/versioning.md
  - ${COMPANY_OS_ROOT}/docs/releases/1.0-command-eve-operator-shell-alpha.md
scope:
  - include version identity, changelog, README install path and alpha boundary.
  - exclude GitHub tags, GitHub releases, public stable claims and hosted provisioning.
acceptance_criteria:
  - VERSION is 1.0.0-alpha.1.
  - README describes both public workspace install and operator-shell install.
  - Release docs call this alpha and name AionUI v2.1.10, Hermes Agent 0.15.2 and minimax/minimax-m3 defaults.
gates:
  - rg -n "1.0.0-alpha.1" VERSION CHANGELOG.md README.md docs/releases/versioning.md docs/releases/1.0-command-eve-operator-shell-alpha.md
human_gate: HG-2.5
reporting: Plane worker.reported with changed files and exact verification commands.
blocked_actions: no tag, release, merge, deploy, Plane Done or stable self-serve claim.
```
