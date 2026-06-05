# Supergoal: Command EVE 0.8 / 0.9 Closure For 1.0.0-alpha.3

Status: Plane-ready parent contract draft
Date: 2026-06-05
Version band: `1.0.0-alpha.3` closure
Use for: closing the unfinished `0.8.x` and `0.9.x` Command EVE work without
hiding it behind the `1.0.0-alpha.2` self-install mechanics.

## Release Gate Frame

`1.0.0-alpha.2` proved the public local self-install path: clone, install,
AionUI/Hermes/EVE sidecars, BYOK preflight, EVE first-run confirmation, update
smoke and remote pilot runbook.

`1.0.0-alpha.3` promotes the remaining 0.8/0.9 closure work into the active
publish-prep line.

It does not automatically finish the broader `0.8.x` and `0.9.x` product
surface. This supergoal converts every still-open item from the reconciliation
note into an explicit closeout lane with audit, security, code-review and
hotfix gates.

## Child Roster

1. `command-eve-alpha2-absorbed-install-closeout.md`
2. `command-eve-alpha2-department-dashboard-review-cards.md`
3. `command-eve-alpha2-post-worker-quality-hotfix-autonomy.md`
4. `command-eve-alpha2-support-security-privacy-license-gate.md`
5. `command-eve-alpha2-scheduler-killswitch-budget-brake.md`
6. `command-eve-alpha2-ladder-context-topology-integration.md`
7. `command-eve-alpha2-self-observability-watchdog.md`
8. `command-eve-alpha2-plugin-connector-onboarding-harness.md`
9. `command-eve-alpha2-remote-onboarding-pilot-handoff.md`
10. `command-eve-alpha2-cao-security-code-review-hotfix-gate.md`

## Plane Scope Map

| Plane items | Lane | Status target |
|---|---|---|
| `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]` | absorbed install closeout | attach evidence, CEO closeout candidate |
| `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]` | department dashboard and review cards | product/design gap remains open until implemented |
| `[WORK_ITEM_ID]` | post-worker quality and hotfix autonomy | audit/hotfix loop must become default for coding work |
| `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]` | support, security, privacy, license | release gate remains open |
| `[WORK_ITEM_ID]` | scheduler kill-switch and budget brake | product safety gap remains open |
| `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]` | execution ladder and context topology | runtime integration proof remains open |
| `[WORK_ITEM_ID]` | self-observability/watchdog | watchdog proof remains open |
| `[WORK_ITEM_ID]` | plugin and connector harness | onboarding/productization gap remains open |
| `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]` | remote onboarding and pilot handoff | non-founder install evidence remains open |

```yaml
role: role:coo
parent_seat: role:coo
agent: codex
mode: plan
workspace: registry:company-os
dispatch: ready
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/VERSION
  - ${COMPANY_OS_ROOT}/CHANGELOG.md
  - ${COMPANY_OS_ROOT}/docs/releases/2026-06-05-command-eve-08-09-reconciliation.md
  - ${COMPANY_OS_ROOT}/docs/releases/2026-06-05-command-eve-alpha2-closure-supergoal.md
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-06-05/command-eve-alpha2-08-09-closure-parent.md
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-06-04/command-eve-100-alpha2-self-install-parent.md
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-06-02/command-center-hosted-provisioning-parent.md
scope:
  - include all unfinished 0.8.x and 0.9.x reconciliation items promoted into 1.0.0-alpha.3, their closeout status, worker child contracts, audit/security/code-review/hotfix lanes and HG-4 publish boundary.
  - exclude claiming stable self-serve, hosted SaaS, multi-tenant provisioning, production deploys, release tags, autonomous customer publishing/sending/spend and Plane Done transitions.
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/releases/
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-06-05/
  - ${COMPANY_OS_ROOT}/docs/system-index.md
  - ${COMPANY_OS_ROOT}/docs/page-index.md
  - ${COMPANY_OS_ROOT}/scripts/plane/
acceptance_criteria:
  - Every reconciled 0.8.x and 0.9.x Plane item is represented in a child lane or explicitly listed as absorbed evidence.
  - Parent and children contain parseable Worker Issue Contracts with exactly one role label, source truth, gates, blocked actions and HumanGate.
  - Audit, security, code-review and hotfix lanes are mandatory before publish, not optional memory.
  - The public repository contains the templates and an idempotent Plane materializer for the parent/child tree.
  - The release boundary says `1.0.0-alpha.3` remains local-first and alpha until external install, support, security/privacy and beta gates are proven.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-05/command-eve-alpha2-08-09-closure-parent.md --label role:coo
  - node scripts/plane/materialize-command-eve-alpha2-closure-supergoal-2026-06-05.mjs --json
  - node scripts/page-index/generate-page-index.mjs --root . --check
  - node scripts/release-gates/productization-readiness.mjs check --root . --json
  - git diff --check
human_gate: HG-4
reporting: Plane parent update with child refs, version labels, audit reports, hotfixes applied, residual risks, publish recommendation and explicit HG-4 decision needed.
blocked_actions: do not mark Plane Done, tag a release, publish a GitHub Release, claim stable self-serve, deploy hosted infrastructure, store customer data, collect raw API keys in chat, enable full-auto customer publishing/sending/spend or bypass HG-4 publish approval.
reflection_policy: required
learning_proposal_policy: required
```
