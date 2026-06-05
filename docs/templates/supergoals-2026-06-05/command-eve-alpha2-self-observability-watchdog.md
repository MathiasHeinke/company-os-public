# Command EVE Self-Observability Watchdog

Status: Plane-ready child contract draft
Date: 2026-06-05
Version band: `0.9.x`
Plane refs: `[WORK_ITEM_ID]`

```yaml
role: role:cto
parent_seat: role:coo
agent: codex
mode: implement
workspace: registry:company-os
dispatch: ready
target_class: main-integrated
depends_on:
  - command-eve-alpha2-08-09-closure-parent
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/operations/agent-event-ledger.md
  - ${COMPANY_OS_ROOT}/docs/operations/raindrop-observability-coverage-policy.md
  - ${COMPANY_OS_ROOT}/docs/operations/raindrop-prompt-result-quality-loop.md
  - ${COMPANY_OS_ROOT}/docs/operations/independent-reviewer-observability-loop.md
  - ${COMPANY_OS_ROOT}/scripts/orchestration/self-observability-core.mjs
  - ${COMPANY_OS_ROOT}/scripts/orchestration/raindrop-observability-policy.mjs
scope:
  - include watchdog checks for silent failure, stale sessions, missing reports, missing audit followup and hidden background work in Command EVE.
  - exclude live telemetry SaaS, screen recording, private user data capture and mandatory always-on monitoring.
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/operations/
  - ${COMPANY_OS_ROOT}/scripts/orchestration/
  - ${COMPANY_OS_ROOT}/reports/observability/
acceptance_criteria:
  - Watchdog defines what EVE should detect, what she should say, and when she escalates to CEO/Founder.
  - Evidence paths are bounded local reports or event-ledger rows, not raw private chats or screen captures.
  - Missing audit/security/hotfix followups are visible as watchdog findings.
gates:
  - node --test scripts/orchestration/self-observability-core.test.mjs scripts/orchestration/raindrop-observability-policy.test.mjs
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-05/command-eve-alpha2-self-observability-watchdog.md --label role:cto
human_gate: HG-3
reporting: Plane worker.reported with watchdog spec/proof, event examples, privacy boundary, tests and residual risks.
blocked_actions: do not record screens/audio, upload telemetry, capture private data, deploy hosted monitoring, tag, publish or mark Done.
reflection_policy: required
learning_proposal_policy: required
```
