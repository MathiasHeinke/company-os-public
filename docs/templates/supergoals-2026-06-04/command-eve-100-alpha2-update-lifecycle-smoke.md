# Command EVE 1.0.0-alpha.2 Update Lifecycle Smoke

```yaml
role: role:cto
parent_seat: role:coo
agent: codex
mode: verify
workspace: registry:company-os
dispatch: ready
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/scripts/update/update-company-os.mjs
  - ${COMPANY_OS_ROOT}/scripts/update/update-company-os-core.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/install-command-eve.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/start_eve.mjs
  - ${COMPANY_OS_ROOT}/docs/operations/company-os-client-rollout-doctrine.md
scope:
  - include update check/apply proof from public source, version identity, protected local state, sidecar refresh and rollback instructions.
  - exclude destructive local overwrite, private source pull, automatic provider credential mutation and hidden background updates.
acceptance_criteria:
  - `update_eve check` reports current version, available source version, source provenance, changed kit files and blocked/manual-review files.
  - `update_eve apply` preserves install record, human-gates, workspace registry and connector-local state.
  - `start_eve` after update refreshes UI version from `VERSION`.
  - Rollback or repair instructions are visible when update blocks.
gates:
  - node --test scripts/update/update-company-os-core.test.mjs scripts/operator-shell/start-eve-core.test.mjs
  - node scripts/update/update-company-os.mjs check --target <fresh-target> --json
  - node scripts/update/update-company-os.mjs apply --target <fresh-target> --dry-run --json
human_gate: HG-2.5
reporting: Plane worker.reported with check/apply output, version before/after, preserved files and rollback notes.
blocked_actions: no destructive overwrite of local state, no private source pull, no hidden update, no Plane Done.
```
