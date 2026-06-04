# Command EVE 0.9 RC Security And Productization Gate

Run the public-release security and productization review before the remote
install candidate is presented to an external founder.

```yaml
role: role:cto
parent_seat: role:coo
agent: claude
mode: audit
workspace: ${COMPANY_OS_ROOT}
dispatch: ready
run_at: 2026-06-03 22:20 Europe/Berlin
sandbox: required
target_class: report-only
source_of_truth:
  - ${COMPANY_OS_ROOT}/AGENTS.md
  - ${COMPANY_OS_ROOT}/docs/operations/client-productization-readiness.md
  - ${COMPANY_OS_ROOT}/docs/operations/workspace-stewardship-protocol.md
  - ${COMPANY_OS_ROOT}/scripts/release/verify-clean-clone.mjs
  - ${COMPANY_OS_ROOT}/scripts/release-gates/productization-readiness.mjs
  - ${COMPANY_OS_ROOT}/docs/orchestration/post-worker-quality-loop.md
scope:
  - include public-path scan, secret-pattern scan, install/update blast-radius review, connector/OAuth boundary review and productization readiness gate.
  - exclude changing code unless a bounded hotfix is separately approved, external pen-test claims, production deploys, public release publish and Plane Done.
acceptance_criteria:
  - Audit report states whether the 0.9 public RC is safe enough for a guided external founder pilot.
  - Private paths, secrets, customer data and credential-paste instructions are absent or listed as blockers with exact file paths.
  - Update/install scripts do not overwrite protected local state without explicit dry-run/manual-review behavior.
  - Connector manager docs preserve human-owned OAuth and do not imply silent plugin/connector authority.
  - Any required hotfixes are listed as child follow-ups with severity and owner, not silently patched outside scope.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-03/command-eve-080-rc-security-productization-gate.md --label role:cto
  - node scripts/release/verify-clean-clone.mjs --root ${COMPANY_OS_ROOT}
  - node scripts/release-gates/productization-readiness.mjs check
human_gate: HG-2.5
reporting: Plane worker.reported with audit report path, severity table, hotfix follow-ups, release recommendation, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cto/runtime
runtime_permission_mode: default
runtimeauth: app-token
maxruntime: 1500s
maxspend: EUR 0
killswitch: stop on scope guard, secret exposure, private path requiring redaction, source edit request, release-publish action or CEO cancellation.
heartbeat: 120s Plane worker.run-summary while running.
allowed_read_paths:
  - ${COMPANY_OS_ROOT}
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/reports/releases/0.9-public-rc/
outcome_artifacts:
  - ${COMPANY_OS_ROOT}/reports/releases/0.9-public-rc/security-productization-gate.md
blocked_actions: do not modify source, suppress findings, publish releases, merge, deploy, request secrets, touch private workspaces, transition Plane state or write Plane Done.
outcome_spec: Produce the Spec-to-Worker security and productization audit for the 0.9 public RC, including private-path, secret-pattern, update-safety and connector/OAuth boundary review.
outcome_rubric: PASS only when the RC is safe for a guided external founder pilot; REJECT on secret leakage, credential-paste instructions, unsafe update behavior or unresolved private/public boundary violations.
reflection_policy: required
learning_proposal_policy: required
```
