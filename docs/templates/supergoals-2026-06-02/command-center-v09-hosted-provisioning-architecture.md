# v0.9 Hosted Account Provisioning Architecture Child Contract

Status: Plane-ready child contract draft
Date: 2026-06-02

```yaml
role: role:cto
parent_seat: role:cpo
agent: claude
mode: plan
workspace: registry:company-os
dispatch: ready
target_class: report-only
depends_on:
  - command-center-v08-department-dashboard-template
  - command-center-v08-department-intent-surface
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/bootstrap/fresh-company-setup.md
  - ${COMPANY_OS_ROOT}/docs/operations/client-productization-readiness.md
  - ${COMPANY_OS_ROOT}/docs/operations/company-os-client-rollout-doctrine.md
  - ${COMPANY_OS_ROOT}/docs/releases/versioning.md
scope:
  - Design hosted account provisioning as the next layer after public-RC local install.
  - Define tenant/org/user identity, install target ownership, provisioning states, support handoff and update channel relation.
  - Include buy/build/host boundaries for auth, database, storage, billing and support.
  - Exclude production implementation, account creation, customer data ingestion and billing activation.
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/architecture/
  - ${COMPANY_OS_ROOT}/docs/operations/
  - ${COMPANY_OS_ROOT}/docs/templates/
acceptance_criteria:
  - Architecture distinguishes local/self-serve RC, guided hosted pilot and stable hosted SaaS.
  - Tenant boundary, identity model, data retention, audit log, deletion/export and support ownership are explicit.
  - Provisioning flow starts from signup/report seed, reuses EVE boot packet concepts and records exact version/provenance.
  - Failure modes are named: auth failure, partial install, missing connector, data deletion, payment failure and support escalation.
gates:
  - Security/privacy review before any implementation worker.
  - Support lifecycle review before any client-facing guided hosted pilot.
  - No production infra until HG-3 release card exists.
human_gate: HG-3
reporting: Plane worker.reported with architecture doc path, data-flow diagram, provisioning state table, risk register and implementation child proposals.
blocked_actions: do not create hosted accounts, write production DB, configure billing, collect customer data, deploy, publish or mark Done.
reflection_policy: required
learning_proposal_policy: required
```
