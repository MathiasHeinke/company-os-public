# Command EVE 0.9 RC Remote Pilot Handoff

Prepare the remote pilot handoff packet for the first external founder using
the public release candidate.

```yaml
role: role:coo
parent_seat: role:coo
agent: claude
mode: implement
workspace: ${COMPANY_OS_ROOT}
dispatch: ready
run_at: 2026-06-03 23:00 Europe/Berlin
sandbox: required
target_class: report-only
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/operations/company-os-client-rollout-doctrine.md
  - ${COMPANY_OS_ROOT}/docs/operations/client-productization-readiness.md
  - ${COMPANY_OS_ROOT}/docs/operations/pilot-operator-handoff-pricing-test.md
  - ${COMPANY_OS_ROOT}/docs/operations/client-onboarding-discovery-pipeline.md
scope:
  - include remote pilot checklist, operator script, support intake, safe evidence collection, update cadence and escalation boundaries.
  - exclude customer-specific promises, pricing changes, legal terms, production support SLA, connector OAuth on behalf of the user and public release publishing.
acceptance_criteria:
  - Handoff packet states what the remote founder receives, what they must install, what they must authorize and what remains operator-assisted.
  - Support flow collects safe logs/reports without secrets or private customer data.
  - Update flow explains how the founder receives or runs future updates from the public release channel.
  - Pilot success/failure criteria are explicit for the first remote setup call and the first week.
  - CEO can use the packet to run a remote install without being physically present.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-03/command-eve-080-rc-remote-pilot-handoff.md --label role:coo
  - git diff --check
human_gate: HG-2.5
reporting: Plane worker.reported with handoff packet path, remote checklist, safe-support boundary, week-one success criteria, blockers, reflection and learning_proposals.
capability_profile: claude-clevel-worker/coo/runtime
runtime_permission_mode: acceptEdits
runtimeauth: app-token
maxruntime: 900s
maxspend: EUR 0
killswitch: stop on scope guard, named customer private data, legal/pricing change, release-publish action or CEO cancellation.
heartbeat: 120s Plane worker.run-summary while running.
allowed_read_paths:
  - ${COMPANY_OS_ROOT}
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/operations/
  - ${COMPANY_OS_ROOT}/reports/releases/0.9-public-rc/
outcome_artifacts:
  - ${COMPANY_OS_ROOT}/reports/releases/0.9-public-rc/remote-pilot-handoff.md
blocked_actions: do not include named customer data, change pricing/legal terms, promise SLA, perform user OAuth, publish releases, merge, deploy, request secrets or write Plane Done.
outcome_spec: Produce the Spec-to-Worker remote-pilot handoff packet for the first external founder using the public 0.9 public RC.
outcome_rubric: PASS only when the remote pilot can be run without physical presence, support evidence is safe to collect, update cadence is clear and success/failure criteria are explicit.
reflection_policy: required
learning_proposal_policy: required
```
