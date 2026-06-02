# Domain Product Night Shift Queue

> **Moved to generic template.** The source-company-specific version of this
> file has been moved to a private overlay. This file now serves as a generic
> template for building a domain-specific product night-shift queue.
> Replace `[CLIENT_PRODUCT]`, `[CLIENT_DESKTOP_ROOT]`, `[CLIENT_APP_ROOT]`,
> and `[DOMAIN_*]` placeholders with your actual product domain names.

Status: generic template (source-company content moved to private overlay)
Date: 2026-05-16
Parent: `[PLANE_PARENT_ITEM_ID]`
Primary workspace: `${CLIENT_DESKTOP_ROOT}`
Backend SSOT: `${CLIENT_APP_ROOT}`

## Purpose

Turn the founder's product-domain direction into bounded night-shift worker
issues. The first pass is audit and planning only. It should create clear
product gaps, implementation order, eval gates and human decisions before any
code changes.

This queue is intentionally specific. The night controller should not spend the
first night inventing generic backlog items. It should use these lanes to map
where the desktop control-plane is already close to production readiness and
where the backend app still contains the deeper domain truth.

## Global Guardrails

- Claude Code workers run read-only with `--permission-mode plan`.
- No code edits, migrations, RLS changes, Supabase writes or production writes.
- No regulated claims (medical, legal, financial, Rx) are published or
  normalized into user-facing copy.
- Plane is the execution ledger; Memory/Honcho/Wiki remain truth layers.
- Every worker returns a report path and a Controller review.
- Controller review must include what the founder would reject, why, and
  required rework.
- One active worker at a time.

## Required Source Spine

Read these first:

- `${CLIENT_DESKTOP_ROOT}/AGENTS.md`
- `${CLIENT_DESKTOP_ROOT}/memory-bank/system-index.md`
- `${CLIENT_DESKTOP_ROOT}/memory-bank/activeContext.md`
- `${CLIENT_APP_ROOT}/AGENTS.md`
- `${CLIENT_APP_ROOT}/src/pages`
- `${CLIENT_APP_ROOT}/src/components`
- `${CLIENT_APP_ROOT}/docs/audits`

Use GitNexus status/query first where the repo is indexed. If the index is
stale, report it and do not pretend the graph is reliable.

## Product Lanes

### 1. [DOMAIN_1] Production-Readiness Retrospective

Intent:

- Reconstruct why [DOMAIN_1] needed iteration loops before it felt
  production-ready.
- Extract the reusable quality pattern for all upcoming domains.
- Identify remaining hidden issues in [DOMAIN_1] that should be audited again.

Must answer:

- What did [DOMAIN_1] have before the final iterations?
- Which gaps caused earlier states to be rejected?
- Which production-readiness dimensions emerged: data truth, detail
  inspectors, schema-driven enrichment, mutation safety, empty/error states,
  i18n, visual density, source labels, write receipts, eval gates?
- Which of those dimensions must become default gates for [DOMAIN_2],
  [DOMAIN_3] and [DOMAIN_4]?

Output:

- `reports/night-shift/YYYY-MM-DD/[domain-1]-production-readiness-retro.md`
- Reusable checklist section for later domains.

### 2. [DOMAIN_2] Scope And Gap Map

Intent:

- Expand [DOMAIN_2] beyond its initial scope into the full domain the product
  vision describes.
- Compare current desktop [DOMAIN_2] with backend/mobile SSOT.

Must answer:

- Which [DOMAIN_2] surfaces already exist in Desktop?
- Which backend/mobile surfaces contain the domain's deeper truth?
- What is missing for detecting and classifying domain events?
- Which write paths belong in `${CLIENT_APP_ROOT}`, and which desktop UI
  actions may only call shared tools?
- Which eval gate would make the founder accept [DOMAIN_2] as production-ready?

Output:

- `reports/night-shift/YYYY-MM-DD/[domain-2]-gap-map.md`
- Proposed field matrix and first implementation phases.

### 3. [DOMAIN_3] Parity And Daily Operating Flow

Intent:

- Map how [DOMAIN_3] currently works in the mobile/backend app and how the
  new Desktop app should represent it.
- Include all relevant workflow flows.

Must answer:

- Which route/page/component/data model currently owns [DOMAIN_3] in
  `${CLIENT_APP_ROOT}`?
- Which concepts are generic, and which are domain-specific?
- How should Desktop show [DOMAIN_3] state without becoming a to-do app?
- Which human decisions are required before implementation?

Output:

- `reports/night-shift/YYYY-MM-DD/[domain-3]-parity-map.md`
- Suggested Desktop IA and issue breakdown.

### 4. [DOMAIN_4] Architecture And Data Model

Intent:

- Turn the current [DOMAIN_4] ideas into a coherent Desktop product map.

Must answer:

- Which [DOMAIN_4] features already exist in `${CLIENT_APP_ROOT}`?
- Which are real flows versus prototype/playground surfaces?
- What is the correct Desktop hierarchy?
- What should be read-only first, and what requires write/tool gates?
- Which data model or backend surfaces are likely SSOT?

Output:

- `reports/night-shift/YYYY-MM-DD/[domain-4]-architecture-map.md`
- First three implementation slices with eval gates.

## Controller Synthesis Requirements

The controller pass must produce:

- ranked product-domain gaps
- which lanes are implementation-ready
- which lanes need founder decisions
- which issues the worker may implement later only after explicit approval
- what the founder would reject in each lane
- one recommended next worker issue

## Stop Rules

Stop and report `NEEDS-HUMAN` if:

- source-of-truth is unclear
- Plane issue contract is missing required fields
- production/public/spend/medical/legal gate is touched
- worker asks for edit mode without approval
- another worker lock is still active
- required model CLI/API is unavailable or unauthenticated
