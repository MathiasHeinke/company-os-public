# Command EVE Hermes Runtime Packaging Worker Contract

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: implement
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
depends_on: [WORK_ITEM_ID]
source_of_truth:
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/eve-sidecar.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/eve-sidecar-core.mjs
  - ${COMPANY_OS_ROOT}/docs/operations/eve-soul-boot-contract.md
  - ${COMPANY_OS_ROOT}/docs/operations/command-eve-first-run-skill-pack.md
  - ${COMPANY_OS_ROOT}/docs/integrations/aionui-hermes-eve-portable-bootstrap.md
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/connector-catalog-matrix.md
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/compa-370-post-run-hg3-release-validation.json
  - ${COMPANY_OS_ROOT}/docs/orchestration/spec-to-worker-pipeline.md
scope:
  - include Hermes runtime package decision, local wrapper, boot preflight, model default check and smoke behavior.
  - include failure taxonomy and report shape for prepare, preflight, smoke, model config and ACP dependency.
  - include only bounded private sidecar prepare/smoke writes needed to prove local runtime packaging.
  - exclude provider billing changes, credential retrieval, provider switching, deploy, push, merge and Plane Done.
sandbox: required
acceptance_criteria:
  - Runtime package decision pins Hermes version/source or defines a safe update channel.
  - HERMES_HOME, SOUL.md, wrapper, AionUI shim and model default preflight are deterministic.
  - Smoke test proves EVE can answer from boot packet, first-run skill and connector manifest.
  - Failure modes produce actionable BLOCKED_AUTH, BLOCKED_RUNTIME or BLOCKED_MODEL reports.
  - Worker-ledger validation passes with no reason codes.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/command-eve-hermes-runtime-packaging-worker-contract.md --label role:cto
  - node scripts/operator-shell/eve-sidecar.mjs preflight --company-os-root ${COMPANY_OS_ROOT} --json
  - node scripts/operator-shell/eve-sidecar.mjs smoke --company-os-root ${COMPANY_OS_ROOT} --json
human_gate: HG-2.5
reporting: Plane worker.reported with runtime package decision, preflight/smoke report path, failure taxonomy, gate results, blockers, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cto/runtime
inference_class: P1-code-bounded
runtime_permission_mode: acceptEdits
runtime_auth: claude max local auth present
maxruntime: 1200s
max_spend: EUR 0
killswitch: ${COMPANY_OS_ROOT}/runtime/killswitch/[WORK_ITEM_ID].stop
heartbeat: 60s
allowed_read_paths:
  - ${COMPANY_OS_ROOT}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
allowed_claude_tools:
  - Bash(node scripts/operator-shell/eve-sidecar.mjs*)
  - Bash(node scripts/orchestration/worker-ledger-validator.mjs*)
  - Bash(node --test scripts/operator-shell/eve-sidecar-core.test.mjs*)
allowed_write_paths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
outcome_artifacts:
  - ${LOCAL_WORKSPACE}
blocked_actions: do not change provider billing or model credentials; do not fetch secrets; do not silently switch providers; do not deploy, push, merge or mark Plane Done.
outcome_spec: Produce or implement the Hermes runtime packaging slice required by a one-time Command EVE install, following Spec-to-Worker boundaries.
outcome_rubric: PASS only when runtime boot, model preflight, EVE skill loading and smoke behavior are proven or explicitly blocked.
reflection_policy: required
learning_proposal_policy: required
```
