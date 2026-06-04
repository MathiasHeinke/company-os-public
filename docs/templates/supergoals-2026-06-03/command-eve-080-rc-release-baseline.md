# Command EVE 0.9 RC Public Release Baseline

Prepare the public GitHub release-candidate baseline: version identity,
changelog, release branch/PR state, and explicit "RC, not stable" framing.

```yaml
role: role:cto
parent_seat: role:coo
agent: claude
mode: implement
workspace: ${COMPANY_OS_ROOT}
dispatch: ready
run_at: 2026-06-03 21:00 Europe/Berlin
sandbox: required
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/VERSION
  - ${COMPANY_OS_ROOT}/CHANGELOG.md
  - ${COMPANY_OS_ROOT}/README.md
  - ${COMPANY_OS_ROOT}/docs/releases/versioning.md
  - ${COMPANY_OS_ROOT}/docs/operations/client-productization-readiness.md
  - ${COMPANY_OS_ROOT}/docs/operations/company-os-client-rollout-doctrine.md
scope:
  - include version/changelog/readme/release-note edits needed to make the public branch an installable 0.9 public release candidate.
  - exclude final GitHub tag creation, GitHub release publish, merging to main, production deployment and private workspace updates.
acceptance_criteria:
  - VERSION and changelog consistently identify the candidate as 0.9.0-rc.0 or a stricter CEO-approved RC name.
  - README or release docs tell a remote founder where to start installing and where to find update/onboarding instructions.
  - Release notes explicitly say this is a guided/self-serve RC, not stable production.
  - Existing 0.7.4 installs are named as supported update targets when the update command passes dry-run.
  - No private paths, customer data, secrets or local-only reports are added to public release artifacts.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-03/command-eve-080-rc-release-baseline.md --label role:cto
  - git diff --check
  - node scripts/release/verify-clean-clone.mjs --root ${COMPANY_OS_ROOT}
  - node scripts/release-gates/productization-readiness.mjs check
human_gate: HG-2.5
reporting: Plane worker.reported with changed files, chosen version string, release framing, clean-clone/productization output, blockers, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cto/runtime
runtime_permission_mode: acceptEdits
runtimeauth: app-token
maxruntime: 900s
maxspend: EUR 0
killswitch: stop on scope guard, auth prompt, protected-state write, release-publish action or CEO cancellation.
heartbeat: 120s Plane worker.run-summary while running.
allowed_read_paths:
  - ${COMPANY_OS_ROOT}
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/VERSION
  - ${COMPANY_OS_ROOT}/CHANGELOG.md
  - ${COMPANY_OS_ROOT}/README.md
  - ${COMPANY_OS_ROOT}/docs/releases/
  - ${COMPANY_OS_ROOT}/docs/operations/
  - ${COMPANY_OS_ROOT}/reports/releases/0.9-public-rc/
outcome_artifacts:
  - ${COMPANY_OS_ROOT}/reports/releases/0.9-public-rc/release-baseline.md
blocked_actions: do not merge, tag, publish GitHub releases, deploy, request secrets, alter private installs, write Plane Done or claim stable release readiness without CEO review.
outcome_spec: Produce the Spec-to-Worker release-baseline slice for the 0.9 public RC, including version identity, changelog/readme framing and public GitHub distribution readiness.
outcome_rubric: PASS only when the public branch is clearly installable as an RC, versioned consistently, not marketed as stable, and clean of private data or release-publish side effects.
reflection_policy: required
learning_proposal_policy: required
```
