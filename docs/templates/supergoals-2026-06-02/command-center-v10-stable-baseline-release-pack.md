# v1.0 Stable Baseline Release Pack Child Contract

Status: Plane-ready child contract draft
Date: 2026-06-02

```yaml
role: role:cao
parent_seat: role:cpo
agent: codex
mode: verify
workspace: registry:company-os
dispatch: ready
target_class: report-only
depends_on:
  - command-center-v09-support-security-privacy-gate
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/releases/versioning.md
  - ${COMPANY_OS_ROOT}/docs/strategy/autonomy-product-horizon.md
  - ${COMPANY_OS_ROOT}/ROADMAP.md
  - ${COMPANY_OS_ROOT}/docs/operations/client-productization-readiness.md
scope:
  - Define the 1.0 stable operating baseline release pack.
  - Verify stable worker contract, event ledger, HumanGate validator, hard cron, budget brake, artifact truth, support and upgrade/downgrade docs.
  - Include three usable department packs and at least one external/client-style install proof.
  - Exclude changing version to 1.0, tagging, release upload, hosted SaaS launch or production writes.
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/releases/
  - ${COMPANY_OS_ROOT}/docs/operations/
  - ${COMPANY_OS_ROOT}/reports/releases/
acceptance_criteria:
  - Release pack has a checklist with exact source paths, commands, owners and pass/fail thresholds.
  - Known unsupported actions and autonomy boundaries are explicit.
  - At least three department packs have dashboard templates, worker contracts, report sinks and gate maps.
  - The release pack can be reviewed without private context or chat memory.
gates:
  - find scripts -name '*.test.mjs' -print | sort | xargs node --test
  - node scripts/page-index/generate-page-index.mjs --root . --check
  - node scripts/release-gates/productization-readiness.mjs check --public-release --json
  - node scripts/release/build-public-mirror.mjs --out /tmp/company-os-public-10-candidate --verify
  - git diff --check
human_gate: HG-3
reporting: Plane worker.reported with release pack path, command results, blockers, unsupported-action list and final CEO/Founder decision request.
blocked_actions: do not tag, upload release, deploy hosted service, approve production writes, mark Plane Done or claim stable without human release.
reflection_policy: required
learning_proposal_policy: required
```
