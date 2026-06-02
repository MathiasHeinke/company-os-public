# Command EVE Security Productization Audit Worker Contract

```yaml
role: role:cao
parent_seat: role:cto
agent: claude
mode: audit
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
depends_on: [WORK_ITEM_ID]
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
scope:
  - include security, privacy, license, update, connector-auth, supply-chain and public-release audit for the install package.
  - include guided-alpha readiness, public-release readiness, secret/path scan results, protected-state update safety, and AionUI/Hermes/operator-shell boundary checks.
  - exclude file fixes, release approval, secrets access, production writes, push, merge, deploy, publish and Plane Done.
acceptance_criteria:
  - Audit identifies security, privacy, license, update, connector-auth, supply-chain and public-release blockers.
  - Audit checks that no installer path asks for secrets in chat or stores raw credentials.
  - Audit confirms AionUI remains shell/extension surface and does not become a second execution ledger.
  - Audit distinguishes guided-pilot blockers from self-serve/public-release blockers.
  - Audit returns PASS, REJECT or PARK with exact remediation contracts.
  - Audit report contains evidence commands, severity table, remediation worker-contract candidates, residual risks, reflection and learning_proposals.
  - Worker final response ends with parser-safe worker.reported YAML whose last state field is PASS, REJECT or PARK with exact reasons.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/command-eve-security-productization-audit-worker-contract.md --label role:cao
  - node scripts/release-gates/productization-readiness.mjs check --json
  - node scripts/release-gates/productization-readiness.mjs check --public-release --json
  - node scripts/release/verify-clean-clone.mjs --help
  - rg -n "(/Users/[^[:space:]]+|PRIVATE_KEY|SERVICE_ROLE|sk-|ghp_|xoxb-|password|cookie|recovery code)" docs scripts kits schemas registries || true
human_gate: HG-3
reporting: Plane worker.reported with ${LOCAL_WORKSPACE}, findings, severity, remediation contracts, guided-pilot/public-release recommendation, residual risk and blocked actions.
capability_profile: claude-clevel-worker/cao/runtime
runtime_permission_mode: acceptEdits
sandbox: required
max_spend: EUR 0
maxruntime: 1200s
heartbeat: 60s
killswitch: ${LOCAL_WORKSPACE}
runtime_auth: required
inference_class: P2-code-shared
allowed_read_paths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
allowed_write_paths:
  - ${LOCAL_WORKSPACE}
outcome_artifacts:
  - ${LOCAL_WORKSPACE}
allowed_claude_tools:
  - Read
  - Write
  - Edit
  - MultiEdit
  - Glob
  - Grep
  - LS
  - TodoWrite
  - Bash(git status*)
  - Bash(git diff*)
  - Bash(git diff --check*)
  - Bash(node --test*)
  - Bash(node scripts/orchestration/worker-ledger-validator.mjs*)
  - Bash(node scripts/release-gates/productization-readiness.mjs*)
  - Bash(node scripts/release/verify-clean-clone.mjs*)
  - Bash(rg*)
blocked_actions: do not fix files in audit mode; do not approve public release; do not read secrets; do not write Plane Done; do not push, merge, deploy, publish, send or spend.
outcome_spec: Produce the CAO/security productization verdict for the Command EVE install package, following Spec-to-Worker boundaries.
outcome_rubric: PASS only when the package is safe for guided pilot release; REJECT if secret handling, auth, update safety or source-of-truth boundaries are weak; PARK when evidence is incomplete but no critical blocker is proven.
reflection_policy: required
learning_proposal_policy: required
```
