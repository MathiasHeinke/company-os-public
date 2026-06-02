# Night Shift Backlog Archaeology And Idea Radar

Status: ready for local-Mac audit pilot
Date: 2026-05-06
Parent Linear issue: `[WORK_ITEM_ID]`

## Purpose

Add a nightly sweep that asks:

```text
What did we start, mention, plan, or discover but never finish?
What is now outdated?
What should be revived, scheduled, killed, or turned into an idea-board item?
```

This lane is not a second Memory layer. It is a retrieval and triage pass. It
surfaces forgotten work, stale assumptions and promising ideas for the morning
CEO brief.

## Operating Principle

```text
Memory/Honcho/Wiki = truth and context
Linear = active execution ledger
Reports = nightly evidence
Idea Radar = candidate board, not commitment
CEO Brief = decision interface
```

The sweep may propose work. It must not mark work as active, schedule outreach,
publish content, move private files or create broad duplicate Linear issues
without controller approval.

## Inputs

Use only bounded sources:

- active Linear issues, parent programs and recent comments
- Company.OS reports under `reports/`
- Company.OS docs under `docs/`
- active workspace memory-bank files
- active workspace plan/eval/audit docs
- Honcho conclusions and relevant session messages
- recent git branches and unmerged worktrees
- Codex/Claude run ledgers and night-shift reports

Do not ingest raw private chat dumps into publishable repo docs. If a private
example is needed, keep it in a private report and reference only the sanitized
category in Company.OS.

## Sweep Categories

### 1. Forgotten Work

Find items that were started or discussed but not closed.

Examples:

- planned outreach that never happened
- unfinished implementation plans
- branches/worktrees with no final ship decision
- reports that created follow-up work but no Linear issue
- TODOs, FIXME notes, unchecked plan boxes and old eval failures
- promised memory/wiki/Linear updates that were never completed

Required classification:

- `revive`: still valuable and should become scheduled work
- `park`: valid but not relevant this week
- `kill`: no longer useful
- `needs-human`: requires Mathias decision
- `already-covered`: duplicate of an existing Linear issue

### 2. Outdated Or Drifted Assumptions

Find assumptions that might no longer be true.

Examples:

- docs that describe old architecture after a newer implementation
- stale roadmap status
- old agent instructions that conflict with new Linear/Memory doctrine
- plans that reference parked repos as active
- manual workflow notes replaced by automation

Required classification:

- `source-of-truth-drift`
- `status-drift`
- `process-drift`
- `risk-drift`
- `unknown-needs-review`

### 3. Idea Radar

Find good ideas that are not urgent execution work yet.

Examples:

- product improvements for ARES App/Desktop
- speed/performance/process improvements
- marketing experiments
- Company.OS productization ideas
- [SOURCE_WORKSPACE]/business operating improvements
- future automations, dashboards, templates, SOPs or agent roles

Required classification:

- `now`: strong candidate for the next 72 hours
- `next`: candidate for the next 2 weeks
- `later`: useful but not near-term
- `research`: needs exploration before action
- `trash`: sounds interesting but should not distract

## Output Contract

Write:

```text
reports/night-shift/YYYY-MM-DD/forgotten-work-sweep.md
reports/night-shift/YYYY-MM-DD/stale-assumption-sweep.md
reports/night-shift/YYYY-MM-DD/idea-radar.md
```

Each report must include:

- source pointer
- item title
- why it matters
- current status
- classification
- recommended next action
- whether Linear issue exists
- whether Mathias must decide
- confidence

## Linear Policy

Default: write a report and add a concise summary comment to `[WORK_ITEM_ID]`.

Create or update Linear only when the item is concrete and actionable:

- blocker
- review obligation
- scheduled worker task
- milestone
- launch gate
- high-confidence follow-up with clear acceptance criteria

Do not create Linear issues for raw ideas, vague future work, private memories or
duplicate reminders. Put those into the Idea Radar report first.

## Morning Brief Section

The Morning CEO Brief must include:

```text
Liegen geblieben:
- top 3 revived work candidates

Outdated:
- top 3 stale assumptions or docs

Idea Radar:
- top 3 ideas worth discussing

CEO Decisions:
- decide now / park / kill / schedule
```

## Controller Quality Bar

The controller must be strict:

- A forgotten item is not important just because it was mentioned.
- An idea is not good just because it is novel.
- A stale doc is not worth fixing unless it can mislead an agent or human.
- Outreach, public content, medical/Rx claims, money movement and production
  writes require human approval.

For every top item, include:

- `what_mathias_would_say`
- `would_fail_because`
- `required_rework`

