# Command EVE 1.0.0-alpha.2 One-Command Installer

```yaml
role: role:cto
parent_seat: role:coo
agent: codex
mode: implement
workspace: registry:company-os
dispatch: ready
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/scripts/install/command-eve-self-install.mjs
  - ${COMPANY_OS_ROOT}/scripts/install/command-eve-self-install-core.mjs
  - ${COMPANY_OS_ROOT}/scripts/install/public-rc.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/install-command-eve.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/command-eve-installer-core.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/start_eve.mjs
  - ${COMPANY_OS_ROOT}/docs/releases/1.0-command-eve-operator-shell-alpha.md
scope:
  - include a guided self-install wrapper that composes public workspace install, operator-shell install, prerequisite checks, report writing and next command hints.
  - exclude unattended destructive repair, provider account creation, hosted provisioning, raw secret capture and signed app packaging.
acceptance_criteria:
  - A non-technical operator can run one documented command from the cloned repo and receive clear pass/block/fix instructions.
  - The command checks `git`, `python3`, `bun`, writable target paths, source version, AionUI/Hermes pins and existing install state before sidecar writes.
  - The command writes an install report with exact component versions, local paths, blocked actions and start/update commands.
  - Dry-run mode remains available and writes no sidecar state.
gates:
  - node --test scripts/install/command-eve-self-install-core.test.mjs scripts/operator-shell/command-eve-installer-core.test.mjs scripts/operator-shell/start-eve-core.test.mjs
  - node scripts/install/command-eve-self-install.mjs install --dry-run --target <fresh-target> --company "Example Pilot GmbH" --website "https://example.com" --offer "Marketing operating system" --buyer "founder-led service teams" --approval-owner "Pilot Founder" --first-department marketing --json
  - node scripts/operator-shell/install-command-eve.mjs install --dry-run --client-root <fresh-target> --json
  - node scripts/install/public-rc.mjs install --target <fresh-target> --company "Example Pilot GmbH" --website "https://example.com" --offer "Marketing operating system" --buyer "founder-led service teams" --approval-owner "Pilot Founder" --first-department marketing --json
human_gate: HG-2.5
reporting: Plane worker.reported with command shape, changed files, test output, install report path and unresolved prerequisite blockers.
blocked_actions: no destructive overwrite without explicit force, no raw secrets, no hosted writes, no stable unsupported self-serve claim.
```
