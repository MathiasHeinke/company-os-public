# Org Charters And Controller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the first runnable Company.OS org-role layer: CEO Worker, CTO, CPO, CMO, QA/Eval, and Controller.

**Architecture:** Org-role charters live in a new public-safe `.company-os/charters/` namespace and are separate from inherited expert personas. The Controller also gets a workflow because work-quality review must become executable, not just conceptual.

**Tech Stack:** Markdown, Company.OS Kit, Linear issue contracts, agent performance harness.

---

## Files

- Create: `kits/company-os-kit/.company-os/README.md`
- Create: `kits/company-os-kit/.company-os/charters/ceo-worker.md`
- Create: `kits/company-os-kit/.company-os/charters/cto-agent.md`
- Create: `kits/company-os-kit/.company-os/charters/cpo-agent.md`
- Create: `kits/company-os-kit/.company-os/charters/cmo-agent.md`
- Create: `kits/company-os-kit/.company-os/charters/qa-eval-agent.md`
- Create: `kits/company-os-kit/.company-os/charters/controller-agent.md`
- Create: `kits/company-os-kit/.agents/workflows/controller-review.md`
- Modify: `kits/company-os-kit/README.md`
- Modify: `reports/audits/company-os-deep-audit-synthesis-2026-05-06.md`

## Task 1: Create The Org-Layer Namespace

- [x] **Step 1: Create namespace README**

Create `kits/company-os-kit/.company-os/README.md` with:

```markdown
# Company.OS Org Layer

This folder contains organization-level agent charters.

Org agents are not expert personas. They own role, scope, reporting, stop rules,
delegation, and quality gates.

Expert personas remain specialist lenses. Org agents may assign expert lenses to
bounded subtasks, but expert lenses do not own departments and do not self-promote.

Required org charters:

- CEO Worker / Chief of Staff
- CTO Agent
- CPO Agent
- CMO Agent
- QA / Eval Agent
- Controller Agent
```

- [x] **Step 2: Verify namespace exists**

Run:

```bash
test -f kits/company-os-kit/.company-os/README.md && echo ok
```

Expected:

```text
ok
```

## Task 2: Create Six Charters

- [x] **Step 1: Use one required charter structure**

Every charter must include these headings exactly:

```markdown
# [Role Name]

## Mission

## Owns

## Does Not Own

## Inputs

## Outputs

## Tools

## Authority

## Stop Rules

## Reporting

## Escalation

## Score Pattern

## Starting Autonomy

## First Pilot
```

- [x] **Step 2: Create CEO Worker charter**

Create `kits/company-os-kit/.company-os/charters/ceo-worker.md` using the
required headings and these fixed constraints:

```markdown
Starting Autonomy: L1 Plan
First Pilot: Produce one CEO Morning Brief from Linear, memory/docs, GitHub/GitNexus status, and agent ledgers.
Hard Stop: No `Done`, no spend, no external publishing, no production writes, no autonomy changes.
```

- [x] **Step 3: Create CTO Agent charter**

Create `kits/company-os-kit/.company-os/charters/cto-agent.md` using the
required headings and these fixed constraints:

```markdown
Starting Autonomy: L2 Read-only execute
First Pilot: Audit one active engineering issue and produce implementation gates.
Hard Stop: No schema/RLS/auth/service-role changes, no production DB writes, no final merge.
```

- [x] **Step 4: Create CPO Agent charter**

Create `kits/company-os-kit/.company-os/charters/cpo-agent.md` using the
required headings and these fixed constraints:

```markdown
Starting Autonomy: L1 Plan
First Pilot: Convert one product gap into a PRD/ADR/Linear worker issue set.
Hard Stop: No medical claims, no diagnosis/treatment promises, no scoring threshold changes.
```

- [x] **Step 5: Create CMO Agent charter**

Create `kits/company-os-kit/.company-os/charters/cmo-agent.md` using the
required headings and these fixed constraints:

```markdown
Starting Autonomy: L1 Plan
First Pilot: Produce one approval-gated content or outreach plan.
Hard Stop: No autonomous public publishing, DMs, emails, paid campaigns, or medical/legal claims.
```

- [x] **Step 6: Create QA/Eval Agent charter**

Create `kits/company-os-kit/.company-os/charters/qa-eval-agent.md` using the
required headings and these fixed constraints:

```markdown
Starting Autonomy: L2 Read-only audit
First Pilot: Review one agent output against acceptance criteria and gates.
Hard Stop: No final approval when human gate is required; no self-review of own output.
```

- [x] **Step 7: Create Controller Agent charter**

Create `kits/company-os-kit/.company-os/charters/controller-agent.md` using the
required headings and these fixed constraints:

```markdown
Starting Autonomy: L2 Read-only review
First Pilot: Compare one agent self-review against the output and produce a calibration gap report.
Hard Stop: No self-promotion, no direct autonomy changes, no direct Done transition.
```

- [x] **Step 8: Verify all charters exist**

Run:

```bash
for f in ceo-worker cto-agent cpo-agent cmo-agent qa-eval-agent controller-agent; do test -f "kits/company-os-kit/.company-os/charters/$f.md" || exit 1; done; echo ok
```

Expected:

```text
ok
```

## Task 3: Create Controller Review Workflow

- [x] **Step 1: Create workflow file**

Create `kits/company-os-kit/.agents/workflows/controller-review.md` with:

```markdown
# Controller Review Workflow

Use when reviewing how an agent worked, not only what it produced.

## Required Inputs

- Source of truth
- Linear issue or assigned task
- Agent output artifact
- Agent self-review card
- Relevant gates and acceptance criteria

## Procedure

1. Read source of truth and assigned scope.
2. Read output artifact.
3. Read self-review.
4. Score each 0-2 dimension from the Agent Performance Review Harness.
5. Compare self-score and controller-score.
6. Identify calibration gaps.
7. Classify root cause.
8. Recommend one of: PROMOTE, KEEP, RESTRICT, RETRAIN, RETIRE, NEEDS-HUMAN.
9. Propose SOP, skill, harness, eval, or Linear follow-up changes.

## Output Contract

Use `docs/templates/controller-review-card.md`.

Do not change autonomy directly.
Do not mark Linear `Done`.
Do not write persistent memory unless the conclusion is stable and approved.
```

- [x] **Step 2: Verify workflow has no placeholders**

Run:

```bash
rg -n "T[B]D|TO[D]O|fill[ ]in" kits/company-os-kit/.agents/workflows/controller-review.md
```

Expected: no output.

## Task 4: Update Kit README

- [x] **Step 1: Add org-layer section**

Modify `kits/company-os-kit/README.md` after `## Primary Persona Layers` to
include:

```markdown
## Primary Org Layers

Organization-level agent charters live in `.company-os/charters/`.

These are manager roles, not expert personas:

- CEO Worker
- CTO Agent
- CPO Agent
- CMO Agent
- QA / Eval Agent
- Controller Agent

Expert personas can be used as specialist lenses under these roles, but they do
not own departments and cannot self-promote.
```

- [x] **Step 2: Verify README references org layer**

Run:

```bash
rg -n "Primary Org Layers|\\.company-os/charters|Controller Agent" kits/company-os-kit/README.md
```

Expected: three matching lines.

## Task 5: Update Audit Synthesis

- [x] **Step 1: Append execution evidence**

In `reports/audits/company-os-deep-audit-synthesis-2026-05-06.md`, under the
iteration section, record:

```markdown
Org Charters Plan Status: executed
Target score lift: C-level layer 4.0 -> 6.5, Controller/performance 5.0 -> 6.5, Autonomous workforce readiness 4.0 -> 5.5
```

- [x] **Step 2: Verify markdown**

Run:

```bash
git diff --check
```

Expected: no output.
