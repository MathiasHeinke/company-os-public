# Command EVE Connector Catalog Worker Contract

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: implement
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
depends_on: [WORK_ITEM_ID]
source_of_truth:
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/.company-os/eve/connector-manifests.json
  - ${COMPANY_OS_ROOT}/schemas/eve/connector-manifest.schema.json
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/aionui-command-eve-overlay-core.mjs
  - ${COMPANY_OS_ROOT}/docs/operations/command-eve-first-run-skill-pack.md
  - ${COMPANY_OS_ROOT}/docs/operations/global-plane-auth-bridge.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/command-eve-installable-operator-shell-plane-contracts.md
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/aionui-extension-design.md
  - ${COMPANY_OS_ROOT}/reports/command-eve-installer/installer-cli-report.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/spec-to-worker-pipeline.md
scope:
  - include connector manifest/schema templates, visible setup states, safe preflights, allowed actions and blocked actions.
  - include local preflight result file rules for installed, needs_auth, unverified, gated, connected and blocked card states.
  - include overlay capability-card derivation improvements if needed.
  - exclude OAuth login, token storage, connector writes, production calls, public release and Plane Done.
sandbox: required
acceptance_criteria:
  - Connector catalog exposes GitHub/GitNexus, Plane, Honcho, Google Calendar/Drive, Gmail, Supabase/Vercel/Stripe and marketing publishing as visible templates.
  - Every connector has setup_mode, auth_surface, safe_preflight, allowed_actions, blocked_actions, human_gate and memory_policy.
  - UI state model distinguishes policy manifest from live configured evidence.
  - No connector is called connected until a preflight or approved evidence path passes.
  - Worker-ledger validation passes with no reason codes.
  - Verification dry-run must check manifest/schema validity and write a connector catalog report path.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/command-eve-connector-catalog-worker-contract.md --label role:cto
  - node -e "JSON.parse(require('fs').readFileSync('kits/company-os-kit/.company-os/eve/connector-manifests.json','utf8')); JSON.parse(require('fs').readFileSync('schemas/eve/connector-manifest.schema.json','utf8'))"
  - node scripts/operator-shell/eve-sidecar.mjs prepare --company-os-root ${COMPANY_OS_ROOT} --dry-run --json
  - node --test scripts/operator-shell/aionui-command-eve-overlay-core.test.mjs scripts/operator-shell/eve-sidecar-core.test.mjs
human_gate: HG-3
reporting: Plane worker.reported with connector catalog matrix, manifest/schema changes, preflight map, gate results, blockers, reflection and learning_proposals.
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
allowed_claude_tools:
  - Bash(node -e *)
  - Bash(node scripts/operator-shell/eve-sidecar.mjs*)
allowed_write_paths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
outcome_artifacts:
  - ${LOCAL_WORKSPACE}
blocked_actions: do not perform OAuth login; do not store tokens; do not enable write-capable connectors; do not call missing connectors configured; do not mark Plane Done.
outcome_spec: Produce the manifest-driven connector catalog that EVE and AionUI can show during first run, following Spec-to-Worker boundaries.
outcome_rubric: PASS only when each connector has visible status, preflight, gates and blocked actions.
reflection_policy: required
learning_proposal_policy: required
```
