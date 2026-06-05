# Command Center / Dashboard / Hosted Provisioning Supergoal Parent

Status: Plane-ready parent contract draft
Date: 2026-06-02
Use for: keeping Command Center, department dashboards and hosted account
provisioning aligned across the next release gates without confusing them with
the current local/public-RC install path.

## Release Gate Frame

The current `1.0.0-alpha.1` line absorbs the `0.9.0-rc.0` public-upstream
install/update/onboarding proof and adds the managed local AionUI/Hermes/EVE
operator-shell path. It does not ship hosted SaaS, multi-tenant account
provisioning or a stable dashboard product.

This supergoal splits the next product surface into gated release bands:

| Band | Product outcome | Boundary |
|---|---|---|
| `0.8.x` | Department packs plus dashboard templates | templates and read models, no hosted account creation |
| `0.9.x` | Client rollout, support, security and privacy gate | hosted provisioning architecture and guided proof, no stable SaaS claim |
| `1.0.0` | Stable operating baseline | stable install/update/support/contracts, documented limits |
| `1.2.x` | Operator leverage layer | one trained operator supervises multi-department output through dashboards and gate cards |

## Parent Contract

```yaml
role: role:cpo
parent_seat: role:cpo
agent: codex
mode: plan
workspace: registry:company-os
dispatch: ready
target_class: report-only
depends_on:
  - PR-43
source_of_truth:
  - ${COMPANY_OS_ROOT}/ROADMAP.md
  - ${COMPANY_OS_ROOT}/docs/strategy/autonomy-product-horizon.md
  - ${COMPANY_OS_ROOT}/docs/releases/versioning.md
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-06-02/command-center-hosted-provisioning-parent.md
scope:
  - Define the release-gated path from local/public-RC install to department dashboards and hosted account provisioning.
  - Keep Command Center, dashboard, hosted provisioning, support, security and privacy work as explicit child contracts.
  - Exclude implementation, deployment, production database writes, hosted customer data storage, pricing and public release tags.
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-06-02/
  - ${COMPANY_OS_ROOT}/ROADMAP.md
  - ${COMPANY_OS_ROOT}/docs/strategy/autonomy-product-horizon.md
acceptance_criteria:
  - Parent maps the v0.8, v0.9, v1.0 and v1.2 release bands with clear product outcomes and blocked actions.
  - Child contracts exist for dashboard templates, department Command Center views, hosted provisioning architecture, support/security/privacy, stable baseline and operator leverage.
  - Each child is dispatch: ready for read-only planning, verification or audit work, with external actions blocked by HumanGate.
  - Current public-RC boundary remains explicit: local/public install is available, hosted SaaS is not released.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-02/command-center-hosted-provisioning-parent.md --label role:cpo
  - node scripts/page-index/generate-page-index.mjs --root . --check
  - git diff --check
human_gate: HG-3
reporting: Plane parent update with child contract paths, release-band map, open HG decisions and next dispatch recommendation.
blocked_actions: do not create hosted accounts, deploy infrastructure, store customer data, price the product, mark Plane Done, tag a release or claim stable SaaS.
reflection_policy: required
learning_proposal_policy: required
```

## Child Contracts

1. `command-center-v08-department-dashboard-template.md`
2. `command-center-v08-department-intent-surface.md`
3. `command-center-v09-hosted-provisioning-architecture.md`
4. `command-center-v09-support-security-privacy-gate.md`
5. `command-center-v10-stable-baseline-release-pack.md`
6. `command-center-v12-operator-leverage-layer.md`

## Promotion Rule

No child may move beyond read-only/report-only work until:

1. Stage 0.5 Contract Controller returns `CONTRACT_PASS`.
2. Stage 0.65 Runtime Executability returns `RUNTIME_READY_PASS` for runtime
   children.
3. Public/private data boundaries are named.
4. HumanGate level is confirmed.
5. The child can be verified without relying on chat memory.
