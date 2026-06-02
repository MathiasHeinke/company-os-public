# Metrics Reporting Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the minimum governance, reporting, and metrics layer required before Company.OS can safely increase agent autonomy.

**Architecture:** Markdown-first for the first 30 days, with a clear migration path to CSV/Sheets/Supabase later. Directives become canonical governance, reports become cadence templates, and metrics become a run ledger spec.

**Tech Stack:** Markdown, Linear, CSV/JSONL conventions, future Sheets/Supabase.

---

## Files

- Create: `docs/governance/directives.md`
- Create: `docs/metrics/agent-run-ledger-spec.md`
- Create: `docs/rhythms/weekly-trend-review.md`
- Create: `docs/rhythms/monthly-department-review.md`
- Create: `docs/rhythms/quarterly-board-review.md`
- Modify: `reports/audits/company-os-deep-audit-synthesis-2026-05-06.md`

## Task 1: Create Governance Directives

- [ ] **Step 1: Create `docs/governance/directives.md`**

Use this directive registry:

```markdown
# Company.OS Governance Directives

## DIRECTIVE-001: Source Of Truth Before Action

Trigger: any plan, implementation, audit, or delegation.
Enforcement: name source paths, Linear issues, docs, or commands before action.
Failure Mode: agent works from stale or invented context.

## DIRECTIVE-002: PII And Secret Hygiene

Trigger: any file, report, memory, release, or external tool use.
Enforcement: scrub secrets, private data, credentials, raw personal data.
Failure Mode: public leak or unsafe memory write.

## DIRECTIVE-003: Ruthless Efficiency

Trigger: every scope decision.
Enforcement: no feature creep; smallest useful proof loop wins.
Failure Mode: ceremony grows faster than output.

## DIRECTIVE-004: Verify Before Claim

Trigger: any claim of done, fixed, shipped, passed, or ready.
Enforcement: cite command, report, screenshot, issue, or gate evidence.
Failure Mode: false confidence.

## DIRECTIVE-005: Human Gate Before External Impact

Trigger: production writes, public publishing, outreach, medical/legal claims,
money movement, autonomy changes, final merge, or Linear Done.
Enforcement: Mathias/Codex approval.
Failure Mode: irreversible external harm.

## DIRECTIVE-006: Linear Is Execution Ledger, Not Memory

Trigger: any Linear update.
Enforcement: only tasks, blockers, milestones, reviews, status, gates.
Failure Mode: Linear becomes a noisy knowledge dump.

## DIRECTIVE-007: No Self-Promotion

Trigger: self-review, autonomy recommendation, Done transition.
Enforcement: controller review and human/Codex gate.
Failure Mode: agent grants itself authority.

## DIRECTIVE-008: Cost And Spend Hard Caps

Trigger: paid model/API/tool usage, agentic payments, subscriptions.
Enforcement: budget ledger and explicit approval before money movement.
Failure Mode: runaway spend.

## DIRECTIVE-009: Public Claim And Outreach Gate

Trigger: public content, medical/Rx/legal statements, DMs, emails, campaigns.
Enforcement: claim/compliance/human gate.
Failure Mode: legal, reputational, or platform risk.

## DIRECTIVE-010: Metrics Before Autonomy Increase

Trigger: L1->L2 or higher autonomy recommendation.
Enforcement: score trend, gate history, cost, and controller calibration evidence.
Failure Mode: autonomy increases without proof.

## DIRECTIVE-011: Workspace Registry Firewall

Trigger: cross-workspace read/write/dispatch.
Enforcement: use active workspace registry; no hardcoded assumptions.
Failure Mode: wrong repo, wrong memory namespace, wrong Linear context.

## DIRECTIVE-012: Reproducible Run Ledger

Trigger: every agent run.
Enforcement: issue, workspace, mode, report path, commands, status, cost if known.
Failure Mode: no forensic trail.

## DIRECTIVE-013: IP And License Hygiene Before Public Release

Trigger: public GitHub push, release tag, client distribution.
Enforcement: provenance matrix, license review, persona/name scan, private scan.
Failure Mode: unlicensed or non-public-safe distribution.

## DIRECTIVE-014: Evidence Before Re-score

Trigger: Company.OS maturity score update, area score lift, autonomy score lift.
Enforcement: score increases require a controller-review card plus agent-run
ledger row; projected scores stay labeled as projected.
Failure Mode: maturity inflation from documents instead of proof loops.

## DIRECTIVE-015: Calendar Is Attention Layer

Trigger: Google Calendar event, review block, human decision block, daily.
Enforcement: Mathias calendar blocks must be at least 30 minutes; Calendar is
attention layer, Linear is execution ledger.
Failure Mode: invisible micro-events and noisy CEO attention.
```

- [ ] **Step 2: Verify directives count**

Run:

```bash
rg -n "^## DIRECTIVE-" docs/governance/directives.md | wc -l
```

Expected:

```text
15
```

## Task 2: Create Metrics Ledger Spec

- [ ] **Step 1: Create `docs/metrics/agent-run-ledger-spec.md`**

Use this schema:

```markdown
# Agent Run Ledger Spec

## Phase 1 Format

Use Markdown reports plus JSONL or CSV rollups.

## Required Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `agent_run_id` | string | yes | Unique run ID. |
| `issue_id` | string | yes | Linear issue identifier. |
| `agent_role` | string | yes | CEO Worker, CTO, CPO, CMO, QA, Controller, worker. |
| `runtime` | string | yes | codex, claude, gemini, human. |
| `workspace` | string | yes | Registry key or absolute path. |
| `mode` | string | yes | plan, audit, triage, implement, verify, report. |
| `autonomy_level` | string | yes | L0-L5. |
| `started_at` | datetime | yes | ISO timestamp. |
| `finished_at` | datetime | yes | ISO timestamp. |
| `status` | string | yes | ready-for-review, needs-human, ai-blocked, failed. |
| `report_path` | string | yes | Local or linked report. |
| `tokens_in` | number | no | Runtime token input if known. |
| `tokens_out` | number | no | Runtime token output if known. |
| `cost_eur` | number | no | Estimated cost. |
| `self_score` | number | no | 0-22. |
| `controller_score` | number | no | 0-22. |
| `ceo_intent_fit` | number | no | 0-14 or mapped score. |
| `gate_result` | string | yes | pass, hold, block, needs-human. |
| `human_gate_required` | boolean | yes | true/false. |
| `human_gate_resolved_at` | datetime | no | ISO timestamp. |
| `rework_required` | boolean | yes | true/false. |
| `next_action` | string | yes | Next Linear/action step. |

## CEO KPIs

- CEO time saved per day
- decisions closed per day
- unresolved human gates
- accepted outputs / reviewed outputs
- rework rate
- critical gate misses
- cost per accepted output
- cost per closed decision
- average controller score by department
- CEO intent fit trend
- autonomy level by role
```

- [ ] **Step 2: Verify required fields**

Run:

```bash
rg -n "agent_run_id|controller_score|cost_eur|human_gate_required" docs/metrics/agent-run-ledger-spec.md
```

Expected: four matching lines or more.

## Task 3: Create Reporting Cadence Templates

- [ ] **Step 1: Create weekly review**

Create `docs/rhythms/weekly-trend-review.md` with:

```markdown
# Weekly Trend Review

Owner: Controller Agent
Cadence: weekly
Duration target: 20 minutes

## Inputs

- Daily CEO briefs
- Agent run ledger
- Controller reviews
- Linear blocked and needs-human issues
- GitHub/GitNexus risk signals

## Output

- Department health table
- agent score trends
- recurring gate misses
- autonomy recommendations
- SOP/skill/harness patch queue
- next week focus

## Human Gate

Autonomy changes remain recommendations until Mathias/Codex approves.
```

- [ ] **Step 2: Create monthly review**

Create `docs/rhythms/monthly-department-review.md` with:

```markdown
# Monthly Department Review

Owner: CEO Worker with Controller review
Cadence: monthly
Duration target: 45 minutes

## Inputs

- Linear project status
- KPI ledger
- cost ledger
- incidents
- shipped outputs
- blocked decisions

## Output

- department objectives vs outcomes
- budget and cost review
- agent hire/retrain/retire recommendations
- productizable Company.OS learnings
- next month focus
```

- [ ] **Step 3: Create quarterly board review**

Create `docs/rhythms/quarterly-board-review.md` with:

```markdown
# Quarterly Board Review

Owner: CEO Worker
Reviewer: Mathias/Codex and invited advisors if any
Cadence: quarterly
Duration target: 90 minutes

## Inputs

- monthly reviews
- strategy docs
- financial/cost dashboard
- roadmap
- incidents
- autonomy board results

## Output

- strategy adjustment
- budget allocation
- autonomy policy update
- department goals
- public/product roadmap decision
- Company.OS commercialization decision
```

- [ ] **Step 4: Verify files exist**

Run:

```bash
for f in weekly-trend-review monthly-department-review quarterly-board-review; do test -f "docs/rhythms/$f.md" || exit 1; done; echo ok
```

Expected:

```text
ok
```

## Task 4: Update Audit Synthesis

- [ ] **Step 1: Record metrics/reporting/governance plan**

Update the iteration section in `reports/audits/company-os-deep-audit-synthesis-2026-05-06.md`:

```markdown
Metrics Reporting Governance Plan Status: ready for execution
Target score lift: Reporting rhythms 5.0 -> 6.5, Metrics/finance 2.0 -> 5.5, Security/compliance 5.0 -> 6.0
```

- [ ] **Step 2: Verify markdown**

Run:

```bash
git diff --check
```

Expected: no output.
