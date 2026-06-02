# Page Index Generator

Status: first reusable slice

## Purpose

The Page Index generator creates a deterministic Markdown map for agent boot,
domain routing and knowledge hygiene.

It does not replace the human-curated `docs/system-index.md`. The system index
stays the short Layer-0.5 boot card. `docs/page-index.md` is the generated
inventory beneath it.

## CLI

```bash
node scripts/page-index/generate-page-index.mjs \
  --root . \
  --output docs/page-index.md \
  --write
```

Check mode:

```bash
node scripts/page-index/generate-page-index.mjs \
  --root . \
  --output docs/page-index.md \
  --check
```

Machine-readable mode:

```bash
node scripts/page-index/generate-page-index.mjs \
  --root . \
  --output docs/page-index.md \
  --write \
  --json
```

## Workspace Sweep

Use the workspace sweep when a controller needs to check many workspaces without
blindly loading their full memory banks.

Registry shape:

```json
{
  "workspaces": [
    {
      "name": "company",
      "root": "/absolute/path/to/workspace",
      "output": "docs/page-index.md",
      "maxActiveContextLines": 300
    }
  ]
}
```

Read-only sweep:

```bash
node scripts/page-index/check-workspace-page-indexes.mjs \
  --registry /path/to/page-index-workspaces.json \
  --report /path/to/reports/private/page-index-sweep-report.md
```

Write missing or stale indexes, then report:

```bash
node scripts/page-index/check-workspace-page-indexes.mjs \
  --registry /path/to/page-index-workspaces.json \
  --report /path/to/reports/private/page-index-sweep-report.md \
  --write-indexes
```

Keep sweep reports outside scanned knowledge roots or in `reports/private/`;
otherwise a generated report can make the page index stale again.

Sweep report columns:

- `Stale`: whether the index was stale after the run.
- `Wrote`: whether this run wrote a generated index.
- `Warnings`: remaining hygiene findings after any write.

## What It Scans

- Markdown files under the target root.
- Root boot files such as `AGENTS.md` and `CLAUDE.md`.
- `memory-bank/`, `docs/`, `kits/` and `reports/` Markdown.

## What It Skips

- `.git`
- `node_modules`
- build/cache folders
- `tmp`
- `reports/private`
- `.claude`
- the generated output file itself

## Warnings

The generator warns when:

- no Layer-0.5 system index exists at `memory-bank/system-index.md`,
  `docs/system-index.md` or `.antigravity/system-index.md`
- any `activeContext.md` exceeds the configured line limit

Default active context limit:

```text
300 lines
```

## Output Contract

The generated file groups entries by category:

- Boot
- Memory
- Operations
- Governance
- Harnesses
- Templates
- Kit
- Reports
- Docs
- Root
- Other

Each row includes:

- path
- H1 title
- first purpose line
- H2/H3 headings

## Agent Rule

Agents read the curated `system-index.md` first. If they need a broader map or
suspect file sprawl, they read or regenerate `docs/page-index.md`.

Linear remains the execution ledger. The Page Index is knowledge navigation, not
task tracking.

## Current Local Pilot Result

The first active-workspace sweep proved the controller loop:

- 8 workspaces checked.
- 5 current after index generation.
- 3 need attention because root `memory-bank/activeContext.md` exceeds 300
  lines: `[client-app]`, `[client-desktop]`, `[client-website]`.
- Missing/stale generated indexes were cleared.
- `.claude` runtime/worktree folders are ignored by default after the first
  sweep exposed noisy historical worktree memory.
