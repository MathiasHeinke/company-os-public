# Company.OS Component Map

This map describes the complete system we want to recreate quickly on a fresh
machine or in a new company.

## Layers

```text
Company Strategy
-> Company.OS Repo
-> Company.OS Kit
-> Agent Runtime Layer
-> Memory / Knowledge Layer
-> Execution Ledger
-> Code Intelligence
-> Quality / Eval / Controller Layer
-> Autonomous Ops / Night Shift Layer
-> Marketing / Publishing Layer
-> Automations / Attention Layer
```

## Components

| Component | Purpose | Fresh-setup status |
|---|---|---|
| Company.OS repo | Productizable handbook, harnesses, kit, setup docs | Required |
| Company.OS Kit | Personas, workflows, rules, templates, memory-bank seed | Required |
| Codex | Primary implementation and orchestration runtime | Required |
| Claude Code CLI | External worker for audit, eval, planning, implementation after gate | Required |
| Gemini CLI | Third audit/eval perspective, long-context review | Optional until billing works |
| Hermes Agent | Domain agent / MCP gateway / app-facing agent runtime | Optional per product |
| Honcho | Long-term cross-session memory | Required for durable agent memory |
| Memory Bank | Local project state and session memory | Required |
| Wiki / Knowledge FS | Canonical domain and architecture docs | Required |
| GitNexus | Code graph, impact, flow, refactor safety | Required for code repos |
| Linear | Execution ledger, dependencies, scheduling, dispatch fields | Required |
| GitHub | Code hosting, issues/PRs, CI, release gate | Required |
| Google Calendar | CEO attention layer, dailies, review gates | Optional but recommended |
| Automation Registry | Source of truth for recurring jobs, schedules, outputs and stop rules | Required for autonomy |
| Night Controller | Recurring controller pass that runs bounded workers and reports outcomes | Recommended |
| Morning CEO Brief | Decision-ready daily summary | Recommended |
| Backlog Archaeology | Forgotten-work, stale-assumption and idea-radar sweep | Recommended |
| Automations | Scheduler, reports, nightly/daily loops | Recommended |
| Marketing system | Content strategy, blog, social, approval queues | Optional per company |
| Controller reviews | Work-performance review and autonomy calibration | Required for autonomy |

## What Is Easy To Forget

- Secret management and credential rotation.
- Billing and quota setup for cloud APIs.
- GitHub branch protection and PR rules.
- CI checks before merging.
- Linear project taxonomy and lifecycle states.
- Honcho workspace separation for personal, company, and user memory.
- GitNexus indexing per repo and per repo group.
- Memory namespace rules.
- Calendar is attention, not task storage.
- Observability, logs, incident review.
- Legal/compliance gates for public claims, medical, privacy, money, outreach.
- Backup/export strategy for docs, memory, and Linear.
- Automation registry drift: hidden recurring jobs without owner, source docs,
  reports or stop rules.
- Idea sprawl: turning every interesting thought into active work instead of an
  idea radar candidate.

## Minimum Viable Company.OS

For a new firm, the minimum viable setup is:

1. GitHub org and repos.
2. Company.OS repo.
3. One product repo.
4. Company.OS Kit installed in the product repo.
5. Codex, Claude Code, Gemini CLI sanity checks.
6. Honcho workspace and MCP connectors.
7. Linear project with agent-ready issue template.
8. Memory bank and wiki folders.
9. GitNexus index for the product repo.
10. Automation registry with Night Controller and Morning CEO Brief.
11. Backlog Archaeology and Idea Radar.
12. Daily CEO brief and controller review rhythm.
