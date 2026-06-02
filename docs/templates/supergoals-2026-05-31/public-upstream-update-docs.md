# Public-Upstream Update Docs + Rollout Doctrine

Update the user-facing and operator-facing docs so new founders understand the
install/update direction: install from the public artifact, keep company/private
state local, and update private/client workspaces from public releases.

```yaml
role: role:cpo
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
  - ${COMPANY_OS_ROOT}/README.md
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/README.md
  - ${COMPANY_OS_ROOT}/docs/operations/client-productization-readiness.md
  - ${COMPANY_OS_ROOT}/docs/operations/company-os-client-rollout-doctrine.md
  - ${COMPANY_OS_ROOT}/docs/releases/versioning.md
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/update-lifecycle.md
  - ${COMPANY_OS_ROOT}/ROADMAP.md
scope:
  - include documenting public-upstream/private-overlay doctrine, exact update commands, protected local state, release/channel gates and the 0.7.4 placement.
  - exclude marketing claims that self-serve is stable, public launch copy, pricing, Stripe, hosted account provisioning and unrelated roadmap rewrites.
acceptance_criteria:
  - Docs say public repo/release bundle is the supported update upstream for private/client installs.
  - Docs say private/client workspaces are overlays and must not be used as the normal source for updating public.
  - Docs list the dry-run-first update commands and the protected-state files the updater never overwrites.
  - Roadmap places this as a 0.7.4 hardening gate before 0.8 department-pack work.
  - Versioning docs distinguish guided alpha/RC from stable self-serve and do not claim unattended public release.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-05-31/public-upstream-update-docs.md --label role:cpo
  - git diff --check -- README.md kits/company-os-kit/README.md docs/operations/client-productization-readiness.md docs/operations/company-os-client-rollout-doctrine.md docs/releases/versioning.md ROADMAP.md
  - node scripts/page-index/generate-page-index.mjs --root . --check
  - node scripts/release-gates/productization-readiness.mjs check
human_gate: HG-2.5
reporting: Plane worker.reported with changed docs, exact doctrine wording, drift-check results, remaining stable-self-serve blockers, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cpo/runtime
runtime_permission_mode: acceptEdits
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/README.md
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/README.md
  - ${COMPANY_OS_ROOT}/docs/operations/
  - ${COMPANY_OS_ROOT}/docs/releases/
  - ${COMPANY_OS_ROOT}/ROADMAP.md
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-05-31/
blocked_actions: do not claim stable self-serve, publish public launch copy, edit pricing, wire Stripe, change HumanGate ownership, push, deploy or write Plane Done.
reflection_policy: required
learning_proposal_policy: required
```
