# Company.OS Uplift Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise Company.OS from audit score 5.08/10 toward an evidence-backed
6.0-6.45/10 band before the first broader Claude Code 12-hour bughunt portfolio
is scheduled.

**Architecture:** This portfolio splits the uplift into bounded plans. A
2026-05-06 Claude Opus 4.7 Max pre-bughunt audit changed the execution order:
directives and the bughunt scope spec come before worker runs, and the
Controller must run once before any 12-hour portfolio launches.

**Tech Stack:** Markdown, Company.OS Kit, Linear, GitNexus CLI, Claude Code CLI, Codex, Git.

---

## Current Score

Current audit score:

```text
96.5 total points / 19 scored areas = 5.08 / 10
```

Projected score after completing this uplift portfolio:

```text
122.5 total points / 19 scored areas = 6.45 / 10
Delta: +1.37 points, about +27.0% relative improvement
```

Claude pre-bughunt audit adjusted this to a band:

```text
6.0  = artifacts exist only
6.45 = artifacts plus one proof loop each
6.7  = artifacts, proof loops, and a successful live Linear pilot
```

The projected score is not claimable until the plans below are actually
executed, verified, and backed by controller-review and ledger evidence.

## Plan Set

| Plan | Primary Linear Issues | Raises |
|---|---|---|
| [Org Charters + Controller](./2026-05-06-org-charters-controller.md) | `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]` | C-level layer, Controller, autonomy readiness |
| [Bughunt Portfolio Spec](./2026-05-06-bughunt-portfolio-spec.md) | `[WORK_ITEM_ID]` | automation/runtime, Claude worker launch safety |
| [Control Plane Live Readiness](./2026-05-06-control-plane-live-readiness.md) | `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]` | Linear runtime, GitNexus Company.OS, automation/runtime |
| [Public Release Hygiene](./2026-05-06-public-release-hygiene.md) | `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]` | Company.OS Kit, security, GitHub/release |
| [Metrics Reporting Governance](./2026-05-06-metrics-reporting-governance.md) | `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]` | reporting, metrics/finance, directives |

## Execution Order

- [x] **Step 0: Write Governance Directives First**

Extract the directive registry from the metrics/reporting plan and make it the
rule-of-law before any worker runs.

Expected output:

```text
docs/governance/directives.md
```

- [x] **Step 1: Write Bughunt Portfolio Scope Spec**

Define the 12-hour Claude Code bughunt portfolio before it can be scheduled.

Expected output:

```text
docs/superpowers/plans/2026-05-06-bughunt-portfolio-spec.md
```

Required scope:

- target repos and workspace registry keys
- first-run mode: audit only
- writable paths: none on first run
- heartbeat interval: 15 minutes or less
- dead-man timeout: two missed heartbeats
- Linear kill phrase: `#stop`
- max runtime, max commits, and max spend
- non-goals: no public publishing, production writes, money movement, outreach,
  or medical/legal claims

- [x] **Step 2: Execute Org Charters + Controller**

Run the org-role plan first because every later worker run needs role authority,
score pattern, and stop rules.

Expected output:

```text
kits/company-os-kit/.company-os/charters/*.md
kits/company-os-kit/.agents/workflows/controller-review.md
```

- [x] **Step 3: Run First Controller Proof Loop**

Run the controller workflow on a real artifact before scaling worker execution.

Expected output:

```text
reports/agent-runs/2026-05-06-controller-review-of-audit.md
metrics/agent-runs.jsonl
```

- [ ] **Step 4: Execute Control Plane Live Readiness**

Run this second to prepare a harmless live Linear pilot without granting edit
autonomy.

Expected output:

```text
Company.OS workspace registry decision documented
Company.OS GitNexus status documented
Linear live-pilot checklist ready
```

- [x] **Step 5: Create Worker Issue Contract Template**

Create one normative schema for Claude, Gemini, Codex, and human worker issues.

Expected output:

```text
docs/templates/worker-issue-contract.md
```

- [ ] **Step 6: Execute Metrics Reporting Governance**

Run this before increasing autonomy above read-only pilots.

Expected output:

```text
docs/metrics/agent-run-ledger-spec.md
docs/rhythms/weekly-trend-review.md
docs/rhythms/monthly-department-review.md
docs/rhythms/quarterly-board-review.md
```

- [ ] **Step 7: Execute Public Release Hygiene**

Run this before any remote/public release work.

Expected output:

```text
SOP/persona provenance matrix
persona-IP/naming cleanup plan
release gate checklist
```

- [ ] **Step 8: Re-score Company.OS**

Update `reports/audits/company-os-deep-audit-synthesis-2026-05-06.md` with the
actual post-execution score. Do not use the projected score as actual evidence.

Run:

```bash
git diff --check
git status --short
```

Expected:

```text
No whitespace errors.
Only intended Company.OS docs are changed.
```

## Gate Before Claude 12h Bughunt Portfolio

Do not schedule the 12-hour Claude Code bughunt portfolio until:

- the bughunt portfolio spec exists
- governance directives exist
- the first controller proof loop has produced a filled review card
- the first real agent-run ledger row exists
- live Linear pilot gates are explicit, including heartbeat, lock TTL, and
  `#stop` kill phrase
- spend/external-impact/publication gates remain blocked

Current gate status as of 2026-05-06:

```text
PASS: docs/governance/directives.md exists.
PASS: docs/superpowers/plans/2026-05-06-bughunt-portfolio-spec.md exists.
PASS: reports/agent-runs/2026-05-06-controller-review-of-audit.md exists.
PASS: metrics/agent-runs.jsonl contains the first bootstrap row.
PASS: docs/templates/worker-issue-contract.md exists.
PASS: reports/agent-runs/2026-05-06-linear-heartbeat-kill-path-pilot.md exists.
BLOCKED: no explicit Mathias/Codex parent launch approval yet.
```
