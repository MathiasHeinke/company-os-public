# Supergoal: EVE-as-COS Activation + EVE CEO Refinement Loop

CTO parent that coordinates the EVE coordination layer (Chief-of-Staff shell)
and the bounded EVE-to-CEO intent refinement loop. This is the protocol layer,
distinct from the Command EVE installable packaging layer ([WORK_ITEM_ID]..375) and
from the commercial Self-Serve Launch layer (sibling Supergoal B).

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: plan
workspace: registry:company-os
dispatch: manual
target_class: report-only
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/operations/intent-to-department-reporting-chain.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/codex-controller-runtime.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/supergoal-execution-ladder.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/claude-clevel-worker-runtime.md
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/start-eve-core.mjs
scope:
  - include the EVE coordination-layer definition, the EVE-to-CEO intent refinement loop, child roster, dependency order and HumanGate envelope.
  - exclude doctrine merge to main (child eve-cos-doctrine-update), implementation, production writes, Plane Done and worker dispatch.
acceptance_criteria:
  - Parent packet defines the EVE-as-COS coordination boundary against the canonical Chief-of-Staff shell boundary already in the reporting-chain doctrine.
  - Parent packet names the child roster (intent-refinement spec, observability audit, doctrine update), their dependency order and the HumanGate envelope.
  - Parent packet makes explicit that the refinement loop is a definition protocol upstream of release authority, not an autonomy grant.
  - Parent packet states the relationship to the existing Command EVE install set ([WORK_ITEM_ID]) and to start-eve preflight runtime work.
  - Worker-ledger validation reports only contract.dispatch-not-ready while dispatch stays manual.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-05-29/eve-cos-parent.md --label role:cto
  - Controller review before any child dispatch.
human_gate: HG-2.5
reporting: Plane worker.reported with parent packet path, child roster, dependency order, HumanGate envelope, blockers, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cto/runtime
runtime_permission_mode: plan
blocked_actions: do not dispatch children automatically; do not write Plane Done; do not merge, deploy, push, publish, spend, request secrets or alter production systems.
reflection_policy: required
learning_proposal_policy: required
```
