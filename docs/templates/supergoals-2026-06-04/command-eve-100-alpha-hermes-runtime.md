# Command EVE 1.0 Alpha Hermes Runtime

```yaml
role: role:cto
parent_seat: role:coo
agent: codex
mode: implement
workspace: registry:company-os
dispatch: manual
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/registries/operator-shell/command-eve-1.0-alpha.json
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/command-eve-installer-core.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/eve-sidecar-core.mjs
scope:
  - include Hermes Agent 0.15.2 local venv install, wrapper, HERMES_HOME/SOUL.md and ACP preflight.
  - exclude storing provider secrets, granting broad Hermes toolsets, native cron and direct delegation.
acceptance_criteria:
  - Manifest pins Hermes Agent 0.15.2 / v2026.5.29.2.
  - Installer creates a local venv and installs hermes-agent[acp]==0.15.2.
  - EVE sidecar preflight can classify missing runtime, model and auth failures separately.
gates:
  - python3 -m pip index versions hermes-agent
  - node --test scripts/operator-shell/eve-sidecar-core.test.mjs scripts/operator-shell/command-eve-installer-core.test.mjs
human_gate: HG-2.5
reporting: Plane worker.reported with Hermes version, install mode, wrapper path, failure taxonomy and auth boundary.
blocked_actions: no native Hermes cron, direct delegation, broad toolsets, durable memory writes or raw key capture.
```
