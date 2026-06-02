# Integration Playbook

This playbook lists the core integrations a Company.OS installation should
consider.

## Required Integrations

### Codex

Purpose:

- primary implementation agent
- local filesystem work
- orchestration
- final integration and review

Setup requirements:

- workspace trust configured
- AGENTS.md loaded
- shell access verified
- memory/Linear doctrine installed

### Claude Code CLI

Purpose:

- read-only audits
- deep evals
- implementation only after explicit gate
- second-pass review

Setup requirements:

- `claude` binary installed
- login completed
- headless `-p` sanity check
- default read-only plan mode

### Gemini CLI

Purpose:

- third audit/eval perspective
- long-context architecture review
- spec drift and concurrency review

Setup requirements:

- CLI installed
- billing/quota verified
- headless sanity check
- read-only approval mode by default

### Honcho

Purpose:

- durable cross-session memory
- role and founder preference memory
- architectural invariants

Setup requirements:

- workspace map defined
- personal/company/user memory separated
- create-conclusions policy defined
- dream/consolidation cadence defined

### Memory Bank

Purpose:

- local project state
- active context
- session log
- progress
- technical context
- system patterns

Setup requirements:

- template installed from Company.OS Kit
- update-memory workflow enabled
- Linear boundary documented

### Wiki / Knowledge Files

Purpose:

- canonical domain knowledge
- architecture docs
- SOPs
- ADRs
- public/private knowledge split

Setup requirements:

- folder structure created
- owner/source status clear
- stale-doc policy defined

### GitNexus

Purpose:

- code graph
- impact analysis
- flow tracing
- refactor safety

Setup requirements:

- each repo indexed
- group status configured for multi-repo systems
- impact-before-edit rule installed
- detect-before-ship rule installed

### Linear

Purpose:

- execution ledger
- dependencies
- scheduling
- agent dispatch fields
- blocker and review tracking

Setup requirements:

- projects and states created
- worker issue contract installed
- parent program issue created
- no memory dumps policy enforced

### GitHub

Purpose:

- code hosting
- PR review
- CI
- release gate
- public/open-source distribution
- fallback execution ledger through GitHub Issues

Setup requirements:

- repos created
- branch protection
- PR template
- agent worker issue template
- idea radar issue template
- secret scanning
- release tags

### Automation Registry

Purpose:

- list recurring jobs and their source-of-truth docs
- document schedules, outputs, autonomy levels and stop rules
- prevent hidden automation drift
- make night runs and morning briefs explainable

Setup requirements:

- `docs/operations/automation-registry.md` exists
- each automation has owner, status, schedule, source docs and outputs
- each active automation has an always-allow baseline for routine in-scope
  reads, comments, private reports, ledger appends and read-only worker runs
- each active automation has runtime-auth sentinels for required CLIs/connectors
- each automation has human gates
- local and cloud scheduler differences are documented
- inactive or retired jobs are marked clearly

## Recommended Integrations

### Google Calendar

Purpose:

- CEO attention layer
- daily standups
- review blocks
- human decision windows

Rule:

Do not mirror every task into calendar.

Only create events for human decisions, review blocks, department meetings or
real deep-work slots. Default duration should be long enough to be visible in
the user's calendar.

Do not create all-day events for review, reminder, approval or decision work by
default. If a date-only marker is tempting, ask whether the user wants an
all-day marker or a visible timed block. If the runtime cannot ask and the work
is an attention item, use the configured attention window instead; default to a
30-60 minute morning block in the user's local timezone.

### Vercel / Hosting

Purpose:

- website and app deployment
- preview environments
- deployment checks

### Supabase / Database

Purpose:

- product backend
- auth
- storage
- realtime

Gate:

Schema, RLS, auth, and production writes require explicit human gate.

### Stripe

Purpose:

- billing
- subscriptions
- invoices

Gate:

Pricing and money movement require human gate.

### Marketing And Publishing Tools

Purpose:

- blog publishing
- social scheduling
- newsletter
- reply approval queues

Gate:

No autonomous public publishing or outreach until approval queues are proven.

## Missing Pieces To Decide Per Company

- secret manager: 1Password, Doppler, Vault, cloud secret manager
- observability: logs, traces, alerts
- CI/CD platform
- legal/compliance review owner
- data retention policy
- backup/export policy
- incident review cadence
- cost limits per agent runtime
- customer support loop
- analytics and KPI dashboard
