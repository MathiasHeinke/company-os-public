# Private Consumer Update Smoke

Prove the intended direction: a private or client workspace updates from the
public Company.OS artifact. The smoke is dry-run-first and report-backed. It
must not modify private local state unless a later explicit apply approval is
issued.

```yaml
role: role:cao
parent_seat: role:cto
agent: codex
mode: verify
workspace: registry:company-os
dispatch: manual
target_class: report-only
depends_on:
  - public-upstream-update-cli
  - public-upstream-update-promotion
source_of_truth:
  - ${COMPANY_OS_ROOT}/scripts/update/company-os-update.mjs
  - ${COMPANY_OS_ROOT}/scripts/release/build-public-mirror.mjs
  - ${COMPANY_OS_ROOT}/scripts/release/verify-clean-clone.mjs
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/update-lifecycle.md
scope:
  - include building or using a clean public artifact, running update check/apply dry-run against a private/client target or fixture and verifying protected-state preservation.
  - exclude live apply without explicit approval, editing private target files, public publishing, production writes and Plane Done.
acceptance_criteria:
  - Public artifact exists and passes clean-clone verification before any update smoke is interpreted.
  - `company-os-update check` from public source to private/client target writes JSON and Markdown reports.
  - `company-os-update apply --dry-run` from public source to private/client target performs no writes and reports planned changes.
  - Report evidence shows source_version from public `VERSION` and protected local state remains blocked/collision/manual-review as designed.
  - CAO verdict classifies whether the public-upstream update channel is ready for HG-2.5 integration.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-05-31/public-upstream-update-private-consumer-smoke.md --label role:cao
  - node scripts/release/build-public-mirror.mjs --out /tmp/company-os-public --verify
  - node scripts/release/verify-clean-clone.mjs --root /tmp/company-os-public
  - node scripts/update/company-os-update.mjs check --source /tmp/company-os-public --target ${PRIVATE_OR_CLIENT_TARGET} --write-report --json
  - node scripts/update/company-os-update.mjs apply --source /tmp/company-os-public --target ${PRIVATE_OR_CLIENT_TARGET} --dry-run
human_gate: HG-2.5
reporting: Plane worker.reported with CAO PASS/REJECT/PARK, exact report paths, dry-run no-write evidence, protected-state findings, source_version, unresolved blockers, reflection and learning_proposals.
capability_profile: codex-controller/read-only
runtime_permission_mode: plan
blocked_actions: do not apply non-dry-run updates; do not edit private/client target files; do not publish, push, deploy, request secrets or write Plane Done.
reflection_policy: required
learning_proposal_policy: required
```
