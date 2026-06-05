# Command EVE 1.0.0-alpha.2 Public Main Update Proof

```yaml
role: role:coo
parent_seat: role:coo
agent: codex
mode: verify
workspace: registry:company-os
dispatch: ready
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/VERSION
  - ${COMPANY_OS_ROOT}/CHANGELOG.md
  - ${COMPANY_OS_ROOT}/docs/releases/versioning.md
  - ${COMPANY_OS_ROOT}/scripts/release/build-public-mirror.mjs
  - ${COMPANY_OS_ROOT}/scripts/release/verify-clean-clone.mjs
  - ${COMPANY_OS_ROOT}/scripts/update/update-company-os.mjs
scope:
  - include post-PR public source proof, public mirror generation, clean clone verification and update provenance from public source.
  - exclude private-to-public backflow, public tags, release uploads and hosted provisioning.
acceptance_criteria:
  - PR #48 or equivalent 1.0.0-alpha.1 hardening work is integrated before alpha.2 proof starts.
  - Public mirror and clean clone pass from the integrated source commit.
  - Update provenance reports the public source commit and target install version without private paths or secrets.
  - The proof explains that public source is the distribution path and private overlays update from public, not the reverse.
gates:
  - node scripts/release/build-public-mirror.mjs --out <tmp-public> --verify --json
  - node scripts/release/verify-clean-clone.mjs --root <tmp-public> --json
  - node scripts/update/update-company-os.mjs check --target <fresh-target> --json
human_gate: HG-2.5
reporting: Plane worker.reported with integrated commit, public mirror path, clean-clone result, update provenance output and residual warnings.
blocked_actions: no private branch merge, no tag, no GitHub Release upload, no hosted account creation, no Plane Done.
```
