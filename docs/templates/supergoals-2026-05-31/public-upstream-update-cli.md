# Public-Upstream Update CLI + Provenance

Make the update command explicitly support a public Company.OS clone or release
bundle as source. The generated plan and apply reports must record source
origin, source version and source kind, so a private install can prove it was
updated from the public distribution artifact rather than from a private
working tree.

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: implement
workspace: registry:company-os
dispatch: manual
sandbox: required
target_class: main-integrated
depends_on:
  - public-upstream-update-parent
source_of_truth:
  - ${COMPANY_OS_ROOT}/scripts/update/company-os-update.mjs
  - ${COMPANY_OS_ROOT}/scripts/update/company-os-update-core.mjs
  - ${COMPANY_OS_ROOT}/scripts/update/company-os-update-core.test.mjs
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/update-lifecycle.md
scope:
  - include update CLI/source detection, provenance fields in JSON and Markdown reports, tests for public source paths and version pin behavior.
  - exclude public release publishing, private workspace cleanup, installer wizard changes and any update that writes protected local state.
acceptance_criteria:
  - `check` and `apply --dry-run` accept a clean public clone or release bundle as `--source` when it contains `kits/company-os-kit` and `VERSION`.
  - JSON and Markdown reports include source_kind, source_version and source_path or source_url/provenance without exposing private paths in public artifacts.
  - Version pin enforcement still rejects mismatched `--to` values against the public source `VERSION`.
  - Protected local files remain blocked, collision-protected or manual-review exactly as in the existing lifecycle.
  - Tests cover public-source check/apply dry-run and existing update lifecycle tests still pass.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-05-31/public-upstream-update-cli.md --label role:cto
  - node --test scripts/update/company-os-update-core.test.mjs
  - node scripts/update/company-os-update.mjs check --source /tmp/company-os-public --target ${PRIVATE_OR_CLIENT_TARGET} --write-report --json
  - node scripts/update/company-os-update.mjs apply --source /tmp/company-os-public --target ${PRIVATE_OR_CLIENT_TARGET} --dry-run
human_gate: HG-2.5
reporting: Plane worker.reported with changed files, tests, dry-run report paths, provenance fields shown, protected-state evidence, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cto/runtime
runtime_permission_mode: acceptEdits
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/scripts/update/
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-05-31/
blocked_actions: do not run non-dry-run update against a private/client target; do not overwrite protected local state; do not publish, push, deploy, request secrets or write Plane Done.
reflection_policy: required
learning_proposal_policy: required
```
