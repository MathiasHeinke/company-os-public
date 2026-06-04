# Daily Improvement Dream

Status: executable v0.1
Use for: nightly or early-morning process improvement before the CEO brief

## Purpose

The Daily Improvement Dream reviews recent controller reports, night-shift
artifacts, run ledgers and event ledgers to propose improvements to SOPs,
skills, harnesses, worker contracts, memory policy and Linear hygiene.

It is not an autonomous memory writer. The dream output is a proposal artifact
for controller or CEO review.

## Contract

```text
InputStore:
- reports/night-shift/YYYY-MM-DD/
- reports/runtime-auth/YYYY-MM-DD/
- reports/agent-runs/*YYYY-MM-DD*.md
- metrics/agent-runs.jsonl dated rows
- existing metrics/agent-events.jsonl rows
- Plane `worker.reported` comments with `reflection:` and
  `learning_proposals:` blocks

OutputStore:
- reports/dreams/YYYY-MM-DD/daily-improvement-dream.md
- reports/dreams/YYYY-MM-DD/daily-improvement-dream.json
- optional marked section in reports/night-shift/YYYY-MM-DD/morning-ceo-brief.md
- memory.dream_requested / memory.proposal_created events

DreamPolicy: proposal-only
MemoryUpdatePolicy: proposal-only
Durable writes: none
HumanGate: required before durable memory, SOP, skill, harness or Linear changes
```

Input artifacts must be read-only for the dream job. The event ledger and dream
report are outputs, not rewritten source truth.

## Local CLI

Dry run:

```bash
node scripts/dreams/generate-daily-improvement-dream.mjs \
  --date 2026-05-07 \
  --json
```

Write the report, update the morning brief and append dream events:

```bash
node scripts/dreams/generate-daily-improvement-dream.mjs \
  --date YYYY-MM-DD \
  --issue [WORK_ITEM_ID] \
  --write \
  --update-morning-brief \
  --append-events
```

The morning brief update is idempotent. It replaces the content between:

```text
<!-- daily-improvement-dream:start -->
<!-- daily-improvement-dream:end -->
```

## Morning Meeting Rule

The morning CEO brief must either:

1. run the dream CLI after it writes the main brief, or
2. read the latest dream report and include the same decision section.

The CEO meeting only sees the summarized improvement surface:

- top process improvements
- repeated Claude/C-level worker reflection patterns
- what should become memory/SOP/skill/harness/Linear work
- what remains only a report
- whether durable writes are still gated

## Review Rule

Controller or CEO review decides proposal fate:

| Verdict | Meaning |
|---|---|
| accept | Apply the proposed memory/SOP/skill/harness update. |
| split | Create smaller proposal artifacts or worker issues. |
| reject | Keep the dream as evidence; do not promote it. |
| needs_rework | Rerun or refine the dream scope. |

Durable memory writes go through the correct memory layer:

- private founder/company context: `mcp__honcho_personal__*`
- [SOURCE_COMPANY]/Hermes architecture context: `mcp__honcho__*`
- app/user context: `mcp__honcho_users__*`
- canonical docs: Memory Bank, ADR, wiki, or skill library

Linear is touched only when the accepted dream produces concrete work, blockers,
review duties, milestones or status changes.

## Gates

- `node --test scripts/dreams/daily-improvement-dream-core.test.mjs`
- `node --check scripts/dreams/daily-improvement-dream-core.mjs`
- `node --check scripts/dreams/generate-daily-improvement-dream.mjs`
- `node scripts/agent-events/validate-agent-events.mjs --file metrics/agent-events.jsonl`

## Failure Modes

| Failure | Controller Action |
|---|---|
| The dream proposes broad work without evidence | Reject or rerun with narrower input scope. |
| The dream tries to write memory directly | Block; durable writes require review. |
| The morning brief overwrites the dream section | Run the CLI after the main brief is written. |
| Too many generic proposals | Keep only repeated patterns with source artifacts. |
| Private context would leak into productizable docs | Keep output private or rewrite generically before promotion. |
