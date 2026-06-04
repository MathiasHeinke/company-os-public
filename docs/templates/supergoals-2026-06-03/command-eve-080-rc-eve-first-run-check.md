# Command EVE 0.9 RC EVE First-Run Check

Verify that EVE's first interaction for a fresh remote founder install follows
the intended seeded, progressive setup model.

```yaml
role: role:cpo
parent_seat: role:coo
agent: claude
mode: verify
workspace: ${COMPANY_OS_ROOT}
dispatch: ready
run_at: 2026-06-03 22:40 Europe/Berlin
sandbox: required
target_class: report-only
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/operations/eve-first-run-founder-onboarding.md
  - ${COMPANY_OS_ROOT}/docs/operations/command-eve-first-run-skill-pack.md
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/.company-os/onboarding/eve-boot-packet.example.json
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/.company-os/eve/connector-manifests.json
  - ${COMPANY_OS_ROOT}/scripts/onboarding/first-company-packet.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/eve-sidecar.mjs
scope:
  - include first-run boot packet generation, EVE greeting shape, connector-state inventory and three-choice guided setup behavior.
  - exclude UI redesign, live customer onboarding, connector OAuth, durable memory writes, worker dispatch and production deploys.
acceptance_criteria:
  - Report contains a PASS/REJECT table for boot packet example, first greeting protocol, connector manifest, sidecar prepare dry-run and sidecar preflight.
  - Report quotes or references the exact file path and field that lets EVE state known seed facts before asking setup questions.
  - Report verifies the greeting offers exactly three next setup choices or records the exact doc/example mismatch that prevents that behavior.
  - Report verifies connector statuses are evidence states by checking at least one configured, one gated and one deferred or missing connector example.
  - Report lists every mismatch between docs, examples and sidecar generation with a concrete file path, command output and severity.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-03/command-eve-080-rc-eve-first-run-check.md --label role:cpo
  - node scripts/onboarding/first-company-packet.mjs --help
  - node scripts/operator-shell/eve-sidecar.mjs prepare --company-os-root ${COMPANY_OS_ROOT} --dry-run --json
  - node scripts/operator-shell/eve-sidecar.mjs preflight --company-os-root ${COMPANY_OS_ROOT} --json
human_gate: HG-2
reporting: Plane worker.reported with first-run check report, boot packet evidence, connector-state findings, doc/example mismatches, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cpo/runtime
runtime_permission_mode: default
runtimeauth: app-token
maxruntime: 900s
maxspend: EUR 0
killswitch: stop on scope guard, durable memory write, connector OAuth action, UI rewrite request or CEO cancellation.
heartbeat: 120s Plane worker.run-summary while running.
allowed_read_paths:
  - ${COMPANY_OS_ROOT}
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/reports/releases/0.9-public-rc/
outcome_artifacts:
  - ${COMPANY_OS_ROOT}/reports/releases/0.9-public-rc/eve-first-run-check.md
blocked_actions: do not write durable memory, run connector OAuth, dispatch workers, change UI, request secrets, publish releases, merge, deploy or write Plane Done.
outcome_spec: Produce the Spec-to-Worker EVE first-run verification report for a fresh remote founder install.
outcome_rubric: PASS only when EVE can start from seed facts, present connector evidence states, avoid a blank questionnaire and offer exactly three progressive setup choices or exact blockers.
reflection_policy: required
learning_proposal_policy: required
```
