# Lead Signal Intelligence Loop

Status: productizable operating pattern
Use for: recurring detection of buying-intent signals without creating daily
session spam or unsafe outbound automation
Last updated: 2026-06-04

## Decision

Lead discovery runs as one durable operating loop, not as a new thread or task
for every scan.

```text
source scan
-> normalize and dedupe signals
-> score buyer intent and fit
-> prepare response drafts
-> append to one queue and one daily brief
-> human approves any outbound action
-> reply and close data improve the scorer
```

The loop belongs to the CMO/COO Growth lane. It may collect public or
connector-approved buying-intent signals and prepare drafts. It must not send
outreach, alter a CRM, submit forms or start customer-visible sequences without
the declared HumanGate.

## Singleton Rule

Use one durable sink:

```text
Lead Signal Queue - Current
```

Do not create a new Plane item, Codex thread, Claude session, document or chat
for every scan. Each run writes a timestamped report and updates the singleton
queue or daily brief.

New work items are created only for concrete follow-up:

- approve an outbound batch;
- verify an important candidate manually;
- implement or fix a source adapter;
- run legal/compliance review;
- create a new ICP-specific response pack.

## Source Adapters

Every adapter declares:

- source name;
- allowed access method: API, RSS, public search, manual import or connector;
- robots/ToS/compliance note;
- query set;
- freshness window;
- rate limit;
- output schema;
- failure behavior.

If a source blocks automated access or has unclear terms, the adapter returns
`source.blocked_or_manual` and does not scrape around it.

## Query Themes

Generic AI-operations searches can start with:

- AI operations;
- AI automation;
- process automation;
- workflow automation;
- n8n, Make, Zapier or RPA;
- Copilot, LLM or agent implementation;
- AI enablement or AI transformation.

Every query must map to one or more target lanes. Remove queries that do not
produce actionable lane hypotheses.

## Normalized Signal

```yaml
signal_id: stable hash
source: source name
source_url: public URL or connector reference
company_name: string
role_or_need: string
detected_at: ISO timestamp
posted_at: date | unknown
location: string | unknown
keywords:
  - string
description_excerpt: short cited summary, not full copied page
```

## Fit Scoring

Score each signal on:

| Dimension | Meaning |
|---|---|
| buyer_intent | public evidence that the company is trying to buy or hire capacity |
| budget_proxy | size, role seniority and commercial maturity |
| lane_clarity | how clearly the first operating lane can be inferred |
| decision_speed | founder-led path versus enterprise procurement |
| implementation_fit | whether value can show in 14 to 30 days |
| compliance_risk | whether the case is too regulated or heavy |
| response_fit | whether the source invites contact or application |
| learning_value | whether the case improves reusable templates |

Default route:

```text
A = ready for founder/CEO review
B = needs enrichment or nurture
C = later / enterprise / regulated / slow
D = no-fit / unsafe
```

## Outbound Boundary

Allowed without further gate:

- generate private response draft;
- generate cited scorecard;
- append to queue;
- propose next action.

Human-gated:

- email, LinkedIn, DM or form submission;
- adding contacts to a live CRM;
- scheduling follow-ups;
- referencing permission, relationship or freshness that is not evidenced;
- spend, paid lead tools or data broker usage.

When unsure, choose the higher gate and prepare a decision card.

## Daily Brief Shape

```yaml
lead_signal.brief:
  date: YYYY-MM-DD
  scan_window:
  new_signals:
  a_route:
  b_route:
  blocked_sources:
  recommended_human_actions:
  outbound_actions_taken: 0
```

The brief is a reduction layer. It should surface the few decisions that matter
instead of dumping raw signals.
