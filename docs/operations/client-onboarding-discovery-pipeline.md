# Client Onboarding Discovery Pipeline

Status: canonical onboarding doctrine
Version: `0.2.0-alpha.1`
Use for: installing Company.OS into a new company and deciding where it should
start operating
Last updated: 2026-05-08

## Purpose

Company.OS onboarding has two distinct parts:

```text
technical install -> company discovery -> pressure test -> readiness verdict
-> first department rollout
```

The technical install makes the system available. It does not prove that the
company is ready for agentic operations.

The discovery pipeline builds the company model that Company.OS needs before it
can safely create departments, queues, dashboards, worker contracts and
automation lanes.

## AI Business Blueprint Bridge

Public first-touch asset:

```text
https://github.com/MathiasHeinke/ai-business-blueprint
```

`ai-business-blueprint` is the public founder-diagnostic layer in front of
Company.OS. It is useful for education, lead generation, pre-audit intake and
the first business critique before a paid Company.OS install.

Treat it as:

- open public workbook for founders
- lead magnet before the Company.OS readiness audit
- source of discovery questions, bottleneck framing and founder language
- optional intake artifact for the company-discovery brief
- upstream source for the first business-pressure-test hypotheses

Do not treat it as:

- execution ledger
- scheduler
- runtime harness
- client install record
- Company.OS memory layer
- replacement for Linear/Plane, Honcho, GitNexus or controller gates

Recommended intake from AI Business Blueprint:

- diagnostics: Traffic-Systems-Skills, 1-1-1, Bottleneck Finder, Plumbing
  before Water
- customer discovery: buyer, urgency, current behavior, objections and first
  10 customer path
- business architecture: offer, operating model, delivery bottlenecks and
  founder dependencies
- communication/marketing: positioning, proof, CTA, soft-shop and sellability
- implementation plan: first 90-day priorities and smallest next test

Company.OS consumes the result as structured input, not as canonical truth.
The controller still verifies website evidence, market reality, AI/GDPR
readiness, governance risk and operational fit before recommending automation.

## Core Rule

Do not start with "automate everything."

Start with:

1. install the operating layer
2. understand the company
3. pressure-test the business
4. identify the first narrow department wedge
5. run read-only work first
6. promote only with evidence

Most companies should begin with Marketing, Sales, Website/Web Ops or Knowledge
Work because these lanes can produce high-value drafts, research, queue hygiene
and reporting without immediately touching production systems.

## Discovery Inputs

Collect only what is needed for the first verdict.

Required:

- company name, domain and primary website
- current offer and revenue model
- target customer and buyer
- current channels: website, search, social, email, referrals, ads, outbound
- current AI tools and where they are used
- current execution ledger: Linear, Plane, Jira, Notion, Trello, spreadsheet or
  none
- current knowledge base and docs
- current CRM, lead lists or sales pipeline
- current analytics sources
- data sensitivity level
- GDPR/AI-Act/privacy concerns
- current bottlenecks and expensive recurring work
- founder/CEO decision profile
- first 90-day company priorities

Optional:

- AI Business Blueprint worksheet outputs
- internal SOPs
- customer interviews
- sales calls or objections
- support tickets
- paid campaign data
- product analytics
- hiring/org chart
- current software spend

## Phase 0 - Technical Install

Before discovery work starts, install the Company.OS kit and record the exact
version.

Minimum install:

- install record
- workspace registry
- execution ledger connection: Linear or Plane
- company memory split
- first parent control-plane issue
- runtime auth preflight
- no scheduled worker dispatch yet

Output:

```text
.company-os/install-record.md
```

The install is also where EVE starts as Chief-of-Staff companion, but only as a
guided operator surface. EVE should load the first-run boot packet when present,
say what it already knows from account/report/intake context, ask for
correction and then help the user prepare the missing account, permission,
tool, memory and first goal inputs. EVE must not turn incomplete onboarding
into worker dispatch.

First runtime packet:

```text
.company-os/onboarding/eve-boot-packet.json
```

EVE must also detect whether onboarding is truly greenfield. Many companies
already have Plane, Linear, Jira, Notion, Trello, spreadsheets, GitHub,
GitNexus, Honcho, Drive, CRM, analytics, task owners or active employees in
their current operating layer. Existing systems are an asset, not clutter.
Before creating new Company.OS work, EVE inventories what is already present
and maps it into the Company.OS model.

## Phase 1 - Company Identity Brief

Create the first company model.

If the company entered through AI Business Blueprint, import only the distilled
answers and link the source. Do not copy a long workbook dump into the brief.

Answer:

- What does the company sell?
- Who buys it?
- Why do they buy now?
- What is the current sales motion?
- What does the company believe is its moat?
- Which workflows currently depend on founder memory?
- Which departments exist in reality, even if they are not formal teams?
- Which decisions must stay human-owned?

Output:

```text
.company-os/company-discovery-brief.md
```

Use the template:

```text
docs/templates/company-discovery-brief.md
```

The generated brief should also include EVE's onboarding setup queue: what the
Founder wants, which approvals are missing, which app pages should be opened,
which skills/workflows are requested, which memory sources may be saved and
which sources are forbidden.

The generated packet should also produce `eve-boot-packet.json`, which is the
small machine-readable version AionUI/Hermes can load before EVE's first
response.

The generated brief should include an `Existing System Discovery` section:

- active execution ledger and any secondary ledgers
- existing task/project sources to review
- roles, people and owner sources
- connected tools already available
- missing or blocked tools
- adoption policy, import policy and conflict policy

Default policy:

```text
adapt_existing_first
read-only inventory before migration or duplication
map existing tasks and roles before creating new Company.OS work
```

## Phase 2 - Website And Public Surface Scan

Scan the public company surface.

Include:

- homepage positioning
- offer clarity
- ICP clarity
- proof and case studies
- CTA clarity
- pricing or qualification path
- claims and compliance risk
- content freshness
- SEO basics
- conversion leaks
- public trust signals

Output:

```text
reports/company-discovery/YYYY-MM-DD/website-scan.md
```

## Phase 3 - Market And Competitor Map

Map current customer behavior before naming competitors.

The real competitor is often:

- doing nothing
- hiring an agency
- using spreadsheets
- manual founder work
- generic ChatGPT usage
- a cheaper freelancer
- a vertical SaaS tool
- an existing team process

Required sections:

- direct competitors
- indirect competitors
- current behavior
- switching cost
- why now
- buyer urgency
- credible wedge

Output:

```text
reports/company-discovery/YYYY-MM-DD/market-map.md
```

## Phase 4 - Business Pressure Test

Run the Business Pressure Test before recommending automation.

This is the Company.OS version of the local `startup-pressure-test` skill. The
skill is intentionally blunt: it looks for fatal flaws, weak buyer clarity,
missing urgency, fake differentiation and validation theatre.

Use modes:

- `pressure-test` for a direct strong/weak/pivot verdict
- `problem-validation` when pain or urgency is unclear
- `competition-map` when the company underestimates current behavior
- `first-10-customers` when sales motion is unproven
- `mvp-plan` when the offer or product is still too large
- `full` for first onboarding

Required output:

- verdict: strong, weak or pivot required
- scorecard
- core assumption
- fatal flaws
- problem reality
- competition/current behavior
- first 10 customer path or first 10 qualified leads path
- smallest next test

Output:

```text
reports/company-discovery/YYYY-MM-DD/business-pressure-test.md
```

## Phase 5 - AI, GDPR And Governance Readiness

Company.OS must know whether the company is already using AI safely.

Assess:

- which AI tools are already in use
- where sensitive data enters AI tools
- whether customer, employee, health, financial or legal data is processed
- GDPR/AVV/DPA status for relevant vendors
- AI-Act relevance
- access control and role separation
- prompt/data retention risk
- current approval process for public claims
- audit logs and accountability
- shadow AI usage by employees

The output is a readiness and risk report, not legal advice.

Required output:

- AI/GDPR governance gap map
- risk register
- no-go zones
- safe first lanes
- legal/compliance questions for human or counsel

Output:

```text
reports/company-discovery/YYYY-MM-DD/ai-governance-readiness.md
```

## Phase 6 - Company.OS Fit Score

Score whether the company is a fit for Company.OS rollout.

Suggested dimensions:

| Dimension | Score |
|---|---:|
| Pain intensity | 1-5 |
| Buyer/owner clarity | 1-5 |
| Repeatable workflow density | 1-5 |
| Data readiness | 1-5 |
| Governance readiness | 1-5 |
| Tool integration readiness | 1-5 |
| Department wedge clarity | 1-5 |
| Expected ROI confidence | 1-5 |
| HumanGate owner clarity | 1-5 |
| Founder/operator adoption likelihood | 1-5 |

Verdict:

```text
go
pilot-only
advisory-first
not-ready
```

Output:

```text
reports/company-discovery/YYYY-MM-DD/company-os-fit-score.md
```

## Phase 7 - Savings And Capacity Calculator

The calculator estimates a range, never a guarantee.

Inputs:

- coordination hours per week
- manual content/research/reporting hours
- agency/freelancer spend
- software/tool spend
- number of repeatable workflows
- current approval load
- current sales/marketing throughput
- department in scope
- data sensitivity level
- required human review level

Outputs:

- estimated hours reclaimed
- estimated monthly cost range
- estimated monthly savings range
- likely first department pack
- automation risk class
- payback hypothesis

Never claim a specific saving without evidence from the company.

Output:

```text
reports/company-discovery/YYYY-MM-DD/savings-calculator.md
```

## Phase 8 - First Department Rollout Recommendation

Recommend one first department wedge.

Default order:

1. Marketing / Growth
2. Sales / Business Development
3. Website / Web Ops
4. Knowledge / SOP Governance
5. Engineering / Coding
6. Customer Ops / Support

Choose based on:

- value per safe action
- available data
- approval burden
- integration complexity
- public/compliance risk
- proof speed
- existing team willingness

Each recommendation must include:

- first department
- first work order
- first dashboard
- first weekly review
- blocked actions
- HumanGate level
- promotion criteria

Output:

```text
reports/company-discovery/YYYY-MM-DD/rollout-recommendation.md
```

## Phase 9 - Execution Ledger Backfill

After discovery, create only the next concrete issues.

Minimum:

- parent Company.OS rollout issue
- W0 preflight issue
- discovery synthesis issue
- first department pilot issue
- HumanGate decision issue

Do not create a full company backlog until the first department pilot proves
that the company can operate the loop.

## Human Gates

HG-3 required for:

- public claims
- pricing commitments
- customer-facing offers
- legal/GDPR/AI-Act statements
- production access
- external sends
- employee/customer data use
- final rollout recommendation
- savings claims

HG-1/HG-2 may approve:

- internal discovery reports
- read-only scans
- non-public draft work
- issue normalization
- dashboard scaffolding
- advisory-only recommendations

## Output Bundle

The discovery phase is complete when this bundle exists:

```text
company-discovery-brief.md
website-scan.md
market-map.md
business-pressure-test.md
ai-governance-readiness.md
company-os-fit-score.md
savings-calculator.md
rollout-recommendation.md
```

The controller must synthesize the bundle into one decision:

```text
Proceed with Company.OS pilot: yes / no / advisory-first
First department:
First work order:
HumanGate required:
Main risk:
Expected ROI range:
```

## Public Repo Rule

The public Company.OS repo may include this pipeline, templates and example
outputs with fake data.

It must not include:

- private client discovery data
- real customer lead lists
- private financial data
- raw meeting transcripts
- secrets or credentials
- legal conclusions presented as legal advice

The open-source value is the operating pattern. The paid value is installing it,
running the discovery, customizing department packs and safely operating the
first lanes.
