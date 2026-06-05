# Command EVE 1.0 Alpha AionUI Source Overlay

```yaml
role: role:cpo
parent_seat: role:coo
agent: codex
mode: implement
workspace: registry:company-os
dispatch: manual
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/registries/operator-shell/command-eve-1.0-alpha.json
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/aionui-command-eve-overlay-core.mjs
  - ${COMPANY_OS_ROOT}/assets/brand/eve-command/aionui-overlay/
scope:
  - include pinned AionUI v2.1.10 source-overlay install path, overlay preflight and fallback boundary.
  - exclude modifying upstream AionUI history, unsigned binary packaging and native app notarization.
acceptance_criteria:
  - Manifest pins AionUI v2.1.10 and commit 83f52aff5c3e79c066798162dbdaa6d4c8ec220f.
  - Overlay preflight and apply pass against a fresh v2.1.10 source clone.
  - Installer blocks when bun/git prerequisites are missing instead of silently falling back to unbranded UI.
gates:
  - node --test scripts/operator-shell/aionui-command-eve-overlay-core.test.mjs scripts/operator-shell/command-eve-installer-core.test.mjs
human_gate: HG-2.5
reporting: Plane worker.reported with AionUI tag, commit, license, overlay proof and unresolved UI gaps.
blocked_actions: no native full-auto/YOLO/team/scheduled-task enablement.
```
