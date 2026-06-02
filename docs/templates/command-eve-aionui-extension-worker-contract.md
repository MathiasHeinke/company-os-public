# Command EVE AionUI Extension Worker Contract

```yaml
role: role:cpo
parent_seat: role:cto
agent: claude
mode: plan
workspace: registry:company-os
dispatch: ready
depends_on: [WORK_ITEM_ID]
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/command-eve-installable-operator-shell-plane-contracts.md
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/installer-architecture.md
  - ${COMPANY_OS_ROOT}/docs/operations/command-eve-first-run-skill-pack.md
  - ${COMPANY_OS_ROOT}/docs/operations/eve-soul-boot-contract.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-department-capability-pack.md
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/.company-os/eve/connector-manifests.json
  - ${COMPANY_OS_ROOT}/docs/orchestration/spec-to-worker-pipeline.md
scope:
  - include AionUI-visible Command EVE capability cards, install states, skill surfacing and connector template UX.
  - exclude AionUI source fork, OAuth execution, third-party code installation, public release and Plane Done.
sandbox: required
acceptance_criteria:
  - Extension design contributes Command EVE assistant, first-run skill, department skills and connector templates without requiring manual copy-paste.
  - User-visible cards show installed, available, needs_auth, unverified, gated, connected and blocked states.
  - Blog Department, Video-First Content Engine and Department Capability Pack Creator appear as native EVE skills or installable skill cards.
  - Extension never stores raw credentials and never silently enables write-capable connectors.
  - Worker-ledger validation passes with no reason codes.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/command-eve-aionui-extension-worker-contract.md --label role:cpo
  - rg -n "Blog Department|Video-First Content Engine|Department Capability Pack|needs_auth|connected|blocked" reports/command-eve-installer/aionui-extension-design.md
human_gate: HG-2.5
reporting: Plane worker.reported with extension artifact paths, screenshots or mock paths, connector card matrix, gate results, blockers, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cpo/runtime
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
  - ${COMPANY_OS_ROOT}/docs/integrations/
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/
outcome_artifacts:
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/aionui-extension-design.md
blocked_actions: do not fork or patch AionUI source unless parent architecture approves; do not install third-party code; do not request OAuth secrets; do not publish, deploy, push, merge or mark Plane Done.
outcome_spec: Produce the Command EVE AionUI extension design or implementation slice that makes EVE capabilities visible after install, following Spec-to-Worker boundaries.
outcome_rubric: PASS only when the extension path can show skills, departments and connector templates as visible, gated user-facing capabilities.
reflection_policy: required
learning_proposal_policy: required
```
