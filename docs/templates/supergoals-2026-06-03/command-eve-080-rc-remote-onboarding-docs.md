# Command EVE 0.9 RC Remote Onboarding Docs

Write the remote installation and onboarding guide for a founder who is not in
the room with the operator.

```yaml
role: role:cpo
parent_seat: role:coo
agent: claude
mode: implement
workspace: ${COMPANY_OS_ROOT}
dispatch: ready
run_at: 2026-06-03 21:40 Europe/Berlin
sandbox: required
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/README.md
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/README.md
  - ${COMPANY_OS_ROOT}/docs/operations/client-onboarding-discovery-pipeline.md
  - ${COMPANY_OS_ROOT}/docs/operations/eve-first-run-founder-onboarding.md
  - ${COMPANY_OS_ROOT}/docs/operations/command-eve-first-run-skill-pack.md
  - ${COMPANY_OS_ROOT}/docs/integrations/aionui-hermes-eve-portable-bootstrap.md
scope:
  - include remote founder onboarding guide, prerequisite checklist, first-run EVE flow, connector/OAuth expectations, troubleshooting and support handoff.
  - exclude marketing landing page copy, customer-specific setup, account creation on behalf of the user, private support scripts and production deploys.
acceptance_criteria:
  - Public docs contain a remote-friendly install and onboarding path that a founder can follow without the operator physically present.
  - The guide distinguishes what the user must do, what EVE can guide, what remains optional and what is gated.
  - The first-run flow starts from known account/company seed facts and avoids a large blank questionnaire.
  - Connector setup explains human-owned OAuth and does not ask users to paste tokens, cookies, passwords or recovery codes.
  - Troubleshooting includes auth missing, update failure, missing local tools, clean-clone failure and how to collect a safe support report.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-03/command-eve-080-rc-remote-onboarding-docs.md --label role:cpo
  - git diff --check
human_gate: HG-2.5
reporting: Plane worker.reported with changed files, remote guide path, first-run checklist, support-report boundary, blockers, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cpo/runtime
runtime_permission_mode: acceptEdits
runtimeauth: app-token
maxruntime: 900s
maxspend: EUR 0
killswitch: stop on scope guard, credential-paste instruction, private customer detail, release-publish action or CEO cancellation.
heartbeat: 120s Plane worker.run-summary while running.
allowed_read_paths:
  - ${COMPANY_OS_ROOT}
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/README.md
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/
  - ${COMPANY_OS_ROOT}/docs/operations/
  - ${COMPANY_OS_ROOT}/docs/integrations/
  - ${COMPANY_OS_ROOT}/reports/releases/0.9-public-rc/
outcome_artifacts:
  - ${COMPANY_OS_ROOT}/reports/releases/0.9-public-rc/remote-onboarding-docs.md
blocked_actions: do not include private customer names, private paths, secrets, credential paste instructions, production deploys, release publishing, merges or Plane Done.
outcome_spec: Produce the Spec-to-Worker remote-onboarding documentation slice for a founder installing Command EVE without an in-person operator.
outcome_rubric: PASS only when the guide is self-contained for remote setup, distinguishes user-owned OAuth from EVE-guided setup, names support-report boundaries and avoids private/customer-specific assumptions.
reflection_policy: required
learning_proposal_policy: required
```
