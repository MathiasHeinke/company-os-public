# v0.8 Department Intent Surface Child Contract

Status: Plane-ready child contract draft
Date: 2026-06-02

```yaml
role: role:cpo
parent_seat: role:cpo
agent: claude
mode: plan
workspace: registry:company-os
dispatch: ready
target_class: report-only
depends_on:
  - command-center-v08-department-dashboard-template
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/operations/intent-to-department-reporting-chain.md
  - ${COMPANY_OS_ROOT}/docs/operations/eve-founder-intent-operating-layer.md
  - ${COMPANY_OS_ROOT}/docs/releases/0.6a-marketing-growth-command-center-map.md
  - ${COMPANY_OS_ROOT}/docs/templates/worker-issue-contract.md
scope:
  - Define the department assistant / Command Center intent-card surface for typed or spoken requests.
  - Show how EVE converts founder or employee intent into CEO/C-Level reviewable packets.
  - Include parent/child visibility, proposal comparison, rejected paths, risks and next HumanGate.
  - Exclude autonomous state-changing work and any hidden scheduler or second execution ledger.
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/integrations/
  - ${COMPANY_OS_ROOT}/docs/templates/
acceptance_criteria:
  - Intent card schema includes requester, department, source context, proposed parent, proposed children, evidence links, gate level and blocked actions.
  - EVE Chief-of-Staff behavior stays preparation/prediction only; CEO/Codex keeps controller authority and HG-4 stays founder-owned.
  - Voice/Quick Mode is represented as an input channel only, not an execution path.
  - The surface can explain what it knows, what is missing and what will happen before any worker runs.
gates:
  - Check against docs/operations/intent-to-department-reporting-chain.md.
  - Check against docs/templates/worker-issue-contract.md parseability requirements.
  - node scripts/page-index/generate-page-index.mjs --root . --check
human_gate: HG-2.5
reporting: Plane worker.reported with intent-card schema, example cards, gate map and unresolved UX/security questions.
blocked_actions: do not dispatch workers, approve gates, create accounts, persist private memory, send messages, publish, spend, deploy or mark Done.
reflection_policy: required
learning_proposal_policy: required
```
