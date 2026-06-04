# Supergoal: Command EVE 0.9 Remote Install RC

COO parent for shipping a public, remote-installable Command EVE / Company.OS
release candidate by 2026-06-04 morning Europe/Berlin.

Goal: a new founder can start from the public GitHub release candidate, follow
remote onboarding instructions, install the local Company.OS Kit, run EVE's
first setup flow, and later update from 0.7.4 to 0.9.x with one documented
command while preserving local/private overlay state.

## Child Roster

1. `command-eve-080-rc-release-baseline.md` - public version, changelog,
   release branch and GitHub distribution baseline.
2. `command-eve-080-rc-install-update-cli.md` - install and update command path,
   including 0.7.4 -> 0.9.x update dry-run.
3. `command-eve-080-rc-remote-onboarding-docs.md` - remote install and
   onboarding instructions for a non-local founder.
4. `command-eve-080-rc-clean-install-smoke.md` - clean machine/sandbox install
   smoke from public source.
5. `command-eve-080-rc-security-productization-gate.md` - public-release
   security, private-path and productization checks.
6. `command-eve-080-rc-eve-first-run-check.md` - EVE first-run boot,
   connector-status and guided setup check.
7. `command-eve-080-rc-remote-pilot-handoff.md` - remote-pilot handoff and
   support loop for the first external founder.

```yaml
role: role:coo
parent_seat: role:coo
agent: codex
mode: plan
workspace: registry:company-os
dispatch: manual
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/VERSION
  - ${COMPANY_OS_ROOT}/CHANGELOG.md
  - ${COMPANY_OS_ROOT}/README.md
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/README.md
  - ${COMPANY_OS_ROOT}/docs/operations/client-productization-readiness.md
  - ${COMPANY_OS_ROOT}/docs/operations/company-os-client-rollout-doctrine.md
  - ${COMPANY_OS_ROOT}/docs/operations/client-onboarding-discovery-pipeline.md
  - ${COMPANY_OS_ROOT}/docs/operations/eve-first-run-founder-onboarding.md
  - ${COMPANY_OS_ROOT}/docs/operations/command-eve-first-run-skill-pack.md
  - ${COMPANY_OS_ROOT}/docs/integrations/aionui-hermes-eve-portable-bootstrap.md
  - ${COMPANY_OS_ROOT}/scripts/update/company-os-update.mjs
  - ${COMPANY_OS_ROOT}/scripts/release/verify-clean-clone.mjs
  - ${COMPANY_OS_ROOT}/scripts/release-gates/productization-readiness.mjs
scope:
  - include coordinating the 0.9 public release-candidate child roster, acceptance gates, proof order and morning handoff criteria.
  - exclude direct implementation, worker dispatch, public release publish, GitHub tag creation, production deploy, secret handling and Plane Done.
acceptance_criteria:
  - Plane child tree covers release baseline, install/update CLI, remote onboarding docs, clean-install smoke, security/productization gate, EVE first-run check and remote-pilot handoff.
  - Every child contract is parseable, role-labeled and scoped to public reusable Company.OS artifacts.
  - 2026-06-04 morning readiness is defined as public GitHub branch or PR, install guide, update guide, clean-install smoke report, security/productization report and pilot handoff packet.
  - The tree keeps the first external founder pilot generic; no customer-specific or private local state is committed to public artifacts.
  - CEO/Codex must review the closeout before merge, tag, public release, production deploy or Plane Done.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-03/command-eve-080-rc-parent.md --label role:coo
  - node scripts/plane/materialize-remote-install-080-rc-supergoal-2026-06-03.mjs --json
  - node scripts/release-gates/productization-readiness.mjs check
human_gate: HG-2.5
reporting: Plane worker.reported with child roster, materialized Plane refs, proof report paths, unresolved blockers, release recommendation, reflection and learning_proposals.
capability_profile: codex-controller/ceo/release
runtime_permission_mode: plan
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-06-03/
  - ${COMPANY_OS_ROOT}/reports/releases/0.9-public-rc/
blocked_actions: do not dispatch children automatically; do not merge, tag, publish a GitHub release, deploy, request secrets, write production state, overwrite client/private local state, mark Plane Done or treat this parent as HG-4 approval.
reflection_policy: required
learning_proposal_policy: required
```
