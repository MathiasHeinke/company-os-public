# Command EVE CAO Security, Code Review and Hotfix Gate

Status: Plane-ready child contract draft
Date: 2026-06-05
Version band: below `1.0.0-alpha.2`
Plane refs: all closure lanes

```yaml
role: role:cao
parent_seat: role:coo
agent: claude
mode: audit
workspace: registry:company-os
dispatch: ready
target_class: report-only
depends_on:
  - command-eve-alpha2-08-09-closure-parent
source_of_truth:
  - ${COMPANY_OS_ROOT}/AGENTS.md
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-06-05/command-eve-alpha2-08-09-closure-parent.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/post-worker-quality-loop.md
  - ${COMPANY_OS_ROOT}/docs/governance/ceo-release-authority.md
  - ${COMPANY_OS_ROOT}/docs/governance/human-gate-levels.md
  - ${COMPANY_OS_ROOT}/docs/operations/workspace-stewardship-protocol.md
  - ${COMPANY_OS_ROOT}/docs/releases/versioning.md
scope:
  - include diff-scoped security scan, code review, productization review, release-boundary review and hotfix routing for all changes made under this closure supergoal.
  - exclude broad unrelated repository audit, secret extraction, production writes, release tagging, merging and Plane Done transitions.
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/reports/security/
  - ${COMPANY_OS_ROOT}/reports/audits/
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-06-05/
  - ${COMPANY_OS_ROOT}/scripts/plane/
acceptance_criteria:
  - Security/code-review pass covers every changed file in the closure diff or explicitly defers with reason.
  - Findings are either suppressed with evidence, converted into hotfixes, or left as publish blockers.
  - Final CAO report states PASS, REJECT or PARK for HG-4 publish preparation.
  - Any hotfix made after audit reruns the relevant deterministic gate.
gates:
  - Codex Security diff scan against main...HEAD or local patch.
  - Claude Opus read-only audit with security, code-review, regression and release-boundary focus.
  - node --test
  - node scripts/page-index/generate-page-index.mjs --root . --check
  - node scripts/release-gates/productization-readiness.mjs check --root . --json
  - git diff --check
  - gitnexus detect-changes
human_gate: HG-4
reporting: Plane CAO report with audit artifacts, findings, hotfixes, rerun gates, unresolved publish blockers and exact HG-4 decision card.
blocked_actions: do not merge, publish, tag, upload a release, deploy, print secrets, broaden audit into private data, mark Done or approve HG-4.
reflection_policy: required
learning_proposal_policy: required
```
