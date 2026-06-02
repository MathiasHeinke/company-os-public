# EVE Observability Surface — Honest Capability Map (Audit)

Audit what the EVE Chief-of-Staff shell can actually observe today across repos,
connectors, Codex/Claude runs, reports and Plane, versus the founder vision that
EVE sees everything. The gap is the honesty risk for any landing-page claim.

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: audit
workspace: registry:company-os
dispatch: manual
target_class: report-only
source_of_truth:
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/start-eve-core.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/eve-sidecar-core.mjs
  - ${COMPANY_OS_ROOT}/docs/operations/intent-to-department-reporting-chain.md
  - ${COMPANY_OS_ROOT}/scripts/orchestration/runtime-dispatcher-v1.mjs
scope:
  - include a read-only map of EVE real observable surfaces today and the gap to the sees-everything vision.
  - exclude code changes, new connectors, production writes, secret reads and public claims.
acceptance_criteria:
  - Report lists each real observable surface today (repos, connectors, Codex/Claude runs, reports, Plane, metrics) with FACT/INFERENCE/HYPOTHESIS markers.
  - Report lists the concrete gaps between the real surface and the sees-everything vision.
  - Report states what must be built to close each gap and what a landing page may honestly claim today.
  - Report contains no secrets, tokens, raw customer data or private founder context.
  - Worker-ledger validation reports only contract.dispatch-not-ready while dispatch stays manual.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-05-29/eve-cos-observability.md --label role:cto
  - Read-only Claude run, no file edits.
human_gate: HG-2
reporting: Plane worker.reported with audit report path, real-vs-claimed surface table, gap list, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cto/runtime
runtime_permission_mode: plan
blocked_actions: read-only; no edits; no secret reads; no production writes; no public claims; no merge, deploy, push, spend or Plane Done.
reflection_policy: required
learning_proposal_policy: required
```
