# Lead Signal Intelligence Loop

Status: productizable operating pattern
Use for: recurring detection of buying-intent signals without creating daily
session spam or unsafe outbound automation
Last updated: 2026-05-31

## Decision

Lead discovery should run as one persistent operating loop, not as new agent
sessions for every scan.

```text
twice-daily source scan
-> normalize and dedupe signals
-> score for buyer intent and fit
-> draft recommended responses
-> append to one queue and one daily brief
-> human/CEO approves any outbound action
-> reply and close data improve the scorer
```

The loop is a CMO/COO operating lane. It may collect public buying-intent
signals and prepare response drafts. It must not send outreach, alter a CRM, or
start customer-visible sequences without the declared HumanGate.

## Why This Pattern Exists

The strongest early-stage B2B signal is not general interest in AI. It is an
organization already trying to buy AI/automation capacity:

- active job postings for AI operations, workflow automation, agent systems,
  no-code automation, RPA, Copilot, LLM, n8n, Make, Zapier or related roles;
- freelance or agency requests for implementation capacity;
- repeated or aging postings that suggest the company has budget but cannot
  hire quickly;
- public project briefs that request exactly one lane of work.

This signal has three useful properties:

1. Budget is already implied.
2. The internal pain is already public.
3. The first offer can be framed as time-to-value instead of generic sales.

## Singleton Rule

The loop must have one durable sink:

```text
Lead Signal Queue - Current
```

Do not create a new Plane item, Codex thread, Claude session, Google Doc or
chat every morning and afternoon. Each run writes a timestamped private report
and updates the singleton queue/brief.

Recommended Plane shape:

```text
Project: Command Center or Growth
Singleton: Lead Signal Queue - Current
Write pattern: append one dated lead_signal.brief comment per local day and
replace/update the queue artifact for the current open batch.
```

New Plane work items are created only for concrete follow-up work:

- approve an outbound batch;
- verify an important candidate manually;
- implement or fix a source adapter;
- run a legal/compliance review;
- create a new ICP-specific response pack.

## Schedule

Default local schedule:

- morning scan: before the daily CMO/CEO brief;
- midday scan: after new job-board postings have propagated;
- no evening scan unless the company deliberately runs an outbound/sales sprint.

The two scans do not spawn two new sessions. They append to the same local
report folder and singleton queue.

## Source Adapters

Each adapter declares:

- source name;
- allowed access method: API, RSS, public search, manual import, or connector;
- robots/ToS/compliance note;
- query set;
- freshness window;
- rate limit;
- output schema;
- failure behavior.

Typical sources:

- job boards;
- company career pages;
- public communities and freelance boards;
- public search;
- social/job posts where an API or compliant connector exists;
- manual CSV import from a human-curated list.

If a source blocks automated access or has unclear terms, the adapter reports
`source.blocked_or_manual` and does not scrape around it.

## Query Themes

The query set is domain-specific, but a generic AI-operations lane starts with:

- `AI Automation Manager`
- `AI Operations`
- `KI Automatisierung`
- `Process Automation`
- `n8n`
- `Make`
- `Zapier`
- `RPA`
- `Copilot Studio`
- `LLM Agent`
- `AI Enablement`
- `Workflow Automation`

Every query must map to one or more target lanes. If a query does not produce
actionable lane hypotheses, it should be removed.

## Data Flow

```text
SourceAdapter
-> SignalNormalizer
-> CompanyEnricher
-> Deduper
-> FitScorer
-> ActionClassifier
-> DraftGenerator
-> ComplianceGate
-> QueueWriter
-> DailyBrief
-> ReplyLearningLoop
```

### SignalNormalizer

Produces a normalized record:

```yaml
signal_id: stable hash
source: source name
source_url: public URL or connector reference
company_name: string
role_or_need: string
detected_at: ISO timestamp
posted_at: date | unknown
location: string | unknown
remote: yes | no | hybrid | unknown
keywords:
  - string
description_excerpt: short summary, not full copied page
```

### CompanyEnricher

Adds public, non-secret context:

- company size band;
- industry;
- likely decision-maker role;
- revenue proxy if public;
- current tool hints;
- procurement complexity proxy;
- regulation/compliance risk proxy.

### FitScorer

Scores each signal on:

| Dimension | Meaning |
|---|---|
| buyer_intent | Public evidence that the company is trying to buy or hire capacity. |
| budget_proxy | Size, role seniority, and commercial maturity. |
| lane_clarity | How clearly the first operating lane can be inferred. |
| decision_speed | Founder-led or team-led buying path versus enterprise procurement. |
| implementation_fit | Whether the first lane can show value in 14-30 days. |
| compliance_risk | Whether legal/medical/finance/safety claims make this too heavy. |
| public_response_fit | Whether the source explicitly invites contact or application. |
| learning_value | Whether the case improves a reusable lane pack. |

Default route:

```text
A = ready for founder/CEO review
B = needs enrichment or nurture
C = later / enterprise / regulated / slow
D = no-fit / competitor-only / unsafe
```

## Outbound Boundary

The loop may create drafts. It must not auto-send.

Allowed without further gate:

- generate a private response draft;
- generate a source-cited scorecard;
- append to queue;
- propose next action.

Human-gated:

- sending email, LinkedIn messages, DMs or form submissions;
- adding contacts to a live CRM;
- scheduling follow-ups;
- claiming a relationship or permission that is not evidenced;
- referencing posting age or hiring status without fresh verification.

The local company must define the applicable jurisdictional outbound rules.
When unsure, the loop chooses a higher gate and prepares a decision card.

## Calendar Attention Boundary

Lead-signal reviews are attention events, not all-day date markers.

When drafts, response cards or approval decisions are ready, the loop may create
or propose a review block only if the local calendar connector is in scope and
the action is human-gated. The event must be a visible timed block by default.

Do not create all-day events for outbound approvals, draft reviews, CRM gates or
follow-up decisions unless the user explicitly chose all-day after being asked.
If the runtime cannot ask but a review block is already approved, place it in
the configured attention window instead. Default fallback: a 30-60 minute
morning block in the user's local timezone, avoiding known conflicts.

## Daily Brief Shape

The singleton brief uses a parseable header:

```yaml
lead_signal.brief:
  version: lead-signal-brief/v0
  date: YYYY-MM-DD
  department: marketing
  reporter: role:cmo
  recipient: CEO
  outbound_authority: none
  crm_write_authority: none
```

Body sections:

1. Executive status.
2. New A-grade signals.
3. Changed or repeated signals.
4. Candidates needing verification.
5. Drafts ready for CEO/human review.
6. Rejected/no-fit signals and why.
7. Source adapter failures.
8. Legal/compliance gates.
9. Recommended next three actions.

## Reports

Recommended local outputs:

```text
reports/lead-signal/YYYY-MM-DD/HHMM-lead-signal-scan.md
reports/lead-signal/YYYY-MM-DD/HHMM-lead-signal-scan.json
reports/lead-signal/current/lead-signal-queue.json
reports/lead-signal/current/lead-signal-queue.md
```

Reports should include source URLs and short summaries, not copied job posts or
private page content.

## Learning Loop

Each approved outreach decision and each reply updates:

- which source produced the lead;
- which query found it;
- score at time of review;
- response type;
- human decision;
- reply outcome;
- whether a fit-check, workshop or pilot happened;
- whether the first lane became reusable.

The scoring model improves from closed-loop outcomes, not from agent confidence.

## Cron Wrapper

Recurring runs should be wrapped by `docs/operations/hard-cron-wrapper.md`.

Recommended lane:

```text
lane: lead-signal
dedupe-key: lead-signal-YYYY-MM-DD-HHMM-window
plane-token-rotation: required when writing Plane
human_gate: HG-4 for outbound
```

The cron job is allowed to read public sources, write private reports, update
the singleton queue and prepare drafts. It is not allowed to send.

## Public Product Boundary

This pattern is productizable as a Command EVE Growth/CMO lane:

```text
EVE watches buying-intent signals, keeps one queue clean, prepares response
drafts, and asks for approval only when a real decision is needed.
```

Do not productize it as:

- "fully automated cold email";
- "scrape LinkedIn/Indeed/StepStone and spam everyone";
- "AI sales rep that sends without review";
- "guaranteed lead generation".

The public promise is controlled signal intelligence plus human-gated response,
not autonomous spam.
