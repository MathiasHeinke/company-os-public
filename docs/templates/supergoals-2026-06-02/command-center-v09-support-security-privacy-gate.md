# v0.9 Support / Security / Privacy Gate Child Contract

Status: Plane-ready child contract draft
Date: 2026-06-02

```yaml
role: role:cao
parent_seat: role:cpo
agent: claude
mode: audit
workspace: registry:company-os
dispatch: ready
target_class: report-only
depends_on:
  - command-center-v09-hosted-provisioning-architecture
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/operations/client-productization-readiness.md
  - ${COMPANY_OS_ROOT}/docs/operations/company-os-client-rollout-doctrine.md
  - ${COMPANY_OS_ROOT}/docs/governance/human-gate-levels.md
  - ${COMPANY_OS_ROOT}/docs/templates/worker-issue-contract.md
scope:
  - Define the release gate for client rollout, support lifecycle, security, privacy, license and voice/realtime consent.
  - Include kill switch, audit logs, data retention, connector scopes, model-provider disclosure, support SLA classes and incident workflow.
  - Exclude legal advice, final pricing, production launch and customer-specific policy.
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/operations/
  - ${COMPANY_OS_ROOT}/docs/governance/
  - ${COMPANY_OS_ROOT}/docs/templates/
acceptance_criteria:
  - Gate checklist blocks hosted/client-facing launch when privacy, security, support or license evidence is missing.
  - Checklist covers local install, guided hosted pilot and stable hosted SaaS separately.
  - Gate maps support failures to owner, severity, response window, rollback/restore and customer communication policy.
  - Gate states which decisions are HG-2, HG-2.5, HG-3 and HG-4.
gates:
  - CAO review.
  - Security scan or explicit proof-gap report before implementation.
  - Productization readiness check in public-release mode for public artifacts.
human_gate: HG-3
reporting: Plane worker.reported with gate doc path, checklist, blocker taxonomy, proof gaps and exact release decision needed.
blocked_actions: do not approve production launch, collect customer data, change legal policy, send customer communications, spend, deploy or mark Done.
reflection_policy: required
learning_proposal_policy: required
```
