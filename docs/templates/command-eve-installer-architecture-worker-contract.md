# Command EVE Installer Architecture Worker Contract

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: plan
workspace: registry:company-os
dispatch: ready
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/command-eve-installable-operator-shell-plane-contracts.md
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/README.md
  - ${COMPANY_OS_ROOT}/docs/strategy/autonomy-product-horizon.md
  - ${COMPANY_OS_ROOT}/docs/operations/client-productization-readiness.md
  - ${COMPANY_OS_ROOT}/docs/operations/company-os-client-rollout-doctrine.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/spec-to-worker-pipeline.md
scope:
  - include installer architecture spec, package boundary, dependency model, rollback model and guided-alpha to self-serve ladder.
  - exclude installer implementation, auth scope changes, production writes, public release claims and Plane Done.
acceptance_criteria:
  - Architecture spec defines install package contents, dependency pins, local directories, version record, auth boundaries, rollback and update model.
  - Spec clearly separates bundled artifacts from post-install human-owned connector auth.
  - Spec chooses whether AionUI is upstream dependency, fork, wrapper or extension host for the first release candidate.
  - Spec includes a no-private-paths public release rule and a guided-alpha to self-serve ladder.
  - Worker-ledger validation reports only contract.dispatch-not-ready while dispatch stays manual.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/command-eve-installer-architecture-worker-contract.md --label role:cto
  - rg -n "(/Users/[^[:space:]]+|PRIVATE_KEY|SERVICE_ROLE|sk-|ghp_|xoxb-)" docs/orchestration/command-eve-installable-operator-shell-plane-contracts.md docs/templates/command-eve-* || true
human_gate: HG-2.5
reporting: Plane worker.reported with architecture spec path, decisions, alternatives rejected, gate results, blockers, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cto/runtime
inference_class: P1-code-bounded
runtime_permission_mode: acceptEdits
runtime_auth: claude max local auth present
maxruntime: 900s
max_spend: EUR 0
killswitch: ${COMPANY_OS_ROOT}/runtime/killswitch/[WORK_ITEM_ID].stop
heartbeat: 60s
allowed_read_paths:
  - ${COMPANY_OS_ROOT}
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/architecture/
  - ${COMPANY_OS_ROOT}/docs/operations/
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/
outcome_artifacts:
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/installer-architecture.md
blocked_actions: do not implement installer code; do not change auth scopes; do not fetch secrets; do not publish release claims; do not mark Plane Done.
outcome_spec: Produce the install architecture spec needed before implementation workers start, following Spec-to-Worker boundaries.
outcome_rubric: PASS only when the spec is specific enough for installer, extension, runtime and update workers to implement without re-deciding product boundaries.
reflection_policy: required
learning_proposal_policy: required
```
