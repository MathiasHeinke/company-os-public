# Public Mirror Promotion + Distribution Channel

Turn the generated public mirror into the distribution channel that private
installs consume. The promotion lane must prove a clean public artifact and
make private-to-public movement a deliberate sanitizer/release step, never an
implicit update shortcut.

```yaml
role: role:coo
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
  - ${COMPANY_OS_ROOT}/scripts/release/build-public-mirror.mjs
  - ${COMPANY_OS_ROOT}/scripts/release/verify-clean-clone.mjs
  - ${COMPANY_OS_ROOT}/scripts/release/verify-fresh-history-remote.mjs
  - ${COMPANY_OS_ROOT}/docs/operations/client-productization-readiness.md
  - ${COMPANY_OS_ROOT}/docs/github/repository-strategy.md
  - ${COMPANY_OS_ROOT}/docs/operations/portable-path-placeholders.md
scope:
  - include public mirror build verification, clean-clone proof, release-channel provenance and doctrine for private-to-public promotion.
  - exclude live public push, GitHub release upload, paid hosting changes, credentials and any unsanitized private content promotion.
acceptance_criteria:
  - Public mirror build command produces a clean artifact that contains the kit, update CLI, release docs, VERSION and CHANGELOG needed for downstream update.
  - Clean-clone verifier passes against the public artifact and blocks private paths, secrets, internal metrics and private reports.
  - Promotion doctrine states private changes move public only through sanitizer/public mirror builder plus HG-2.5 approval.
  - Public artifact contains enough provenance for a downstream install/update report to cite the public version it consumed.
  - Release docs describe public as upstream and private as overlay/consumer.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-05-31/public-upstream-update-promotion.md --label role:coo
  - node scripts/release/build-public-mirror.mjs --out /tmp/company-os-public --verify
  - node scripts/release/verify-clean-clone.mjs --root /tmp/company-os-public
  - node scripts/release/verify-fresh-history-remote.mjs --json
  - node scripts/release-gates/productization-readiness.mjs check --public-release
human_gate: HG-2.5
reporting: Plane worker.reported with public artifact path, clean-clone proof, promotion doctrine diff, remaining public-release blockers, reflection and learning_proposals.
capability_profile: claude-clevel-worker/coo/runtime
runtime_permission_mode: acceptEdits
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/scripts/release/
  - ${COMPANY_OS_ROOT}/docs/operations/
  - ${COMPANY_OS_ROOT}/docs/github/
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-05-31/
blocked_actions: do not push to public remote, create tags, upload releases, publish packages, include private reports/metrics/secrets, request credentials or write Plane Done.
reflection_policy: required
learning_proposal_policy: required
```
