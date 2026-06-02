# Supergoal: Public-Upstream Update Channel

CTO parent that makes the public Company.OS repository or release bundle the
canonical update source for private installs. Private workspaces become
consumers/overlays. Public updates may be promoted only through the sanitizer
and public-mirror release path; no future update path may require pulling from
private into public as the normal distribution direction.

## Child Roster

1. `public-upstream-update-cli.md` - update CLI accepts a public clone or
   release bundle as source and records public source provenance.
2. `public-upstream-update-promotion.md` - public mirror/release channel is
   the promoted distribution artifact with a clean-clone proof.
3. `public-upstream-update-private-consumer-smoke.md` - private/client target
   can dry-run update from the public artifact while preserving local state.
4. `public-upstream-update-docs.md` - install, update and rollout docs state
   public-upstream/private-overlay doctrine.

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: plan
workspace: registry:company-os
dispatch: manual
target_class: main-integrated
depends_on:
  - [WORK_ITEM_ID]
source_of_truth:
  - ${COMPANY_OS_ROOT}/scripts/update/company-os-update.mjs
  - ${COMPANY_OS_ROOT}/scripts/update/company-os-update-core.mjs
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/update-lifecycle.md
  - ${COMPANY_OS_ROOT}/scripts/release/build-public-mirror.mjs
  - ${COMPANY_OS_ROOT}/scripts/release/verify-clean-clone.mjs
  - ${COMPANY_OS_ROOT}/docs/operations/client-productization-readiness.md
  - ${COMPANY_OS_ROOT}/docs/operations/company-os-client-rollout-doctrine.md
  - ${COMPANY_OS_ROOT}/docs/releases/versioning.md
scope:
  - include defining the public-upstream update doctrine, child roster, dependency order, proof gates and private-overlay preservation rule.
  - exclude publishing a public release, pushing tags, overwriting private local state, collecting credentials, production deploys and Plane Done.
acceptance_criteria:
  - Parent packet declares public repo or release bundle as the canonical update upstream and private installs as downstream consumers/overlays.
  - Parent packet makes private-to-public promotion explicit and gated through sanitizer/public mirror tooling, not the normal update direction.
  - Child contracts cover CLI/source provenance, public promotion, private consumer smoke and docs/rollout updates.
  - Acceptance requires a clean public artifact to update a private/client target in dry-run mode without touching protected local state.
  - Worker-ledger validation reports only contract.dispatch-not-ready while dispatch stays manual.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-05-31/public-upstream-update-parent.md --label role:cto
  - node scripts/release/build-public-mirror.mjs --out /tmp/company-os-public --verify
  - node scripts/release/verify-clean-clone.mjs --root /tmp/company-os-public
  - node scripts/update/company-os-update.mjs check --source /tmp/company-os-public --target ${PRIVATE_OR_CLIENT_TARGET} --write-report --json
  - node scripts/update/company-os-update.mjs apply --source /tmp/company-os-public --target ${PRIVATE_OR_CLIENT_TARGET} --dry-run
  - node scripts/release-gates/productization-readiness.mjs check
human_gate: HG-2.5
reporting: Plane worker.reported with parent packet path, child roster, public-upstream doctrine, clean-clone proof, private-consumer dry-run report paths, unresolved blockers, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cto/runtime
runtime_permission_mode: plan
blocked_actions: do not dispatch children automatically; do not publish, push tags, upload releases, deploy, request secrets, overwrite protected private state, write Plane Done or treat private repo content as public without sanitizer proof.
reflection_policy: required
learning_proposal_policy: required
```
