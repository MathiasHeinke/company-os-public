# KI-Rendite Score Questionnaire

Status: public lead-magnet and audit-entry spec
Use for: qualifying a founder or operator before the first paid Command EVE
audit without turning the questionnaire into a fake diagnosis engine
Last updated: 2026-06-04

## Purpose

The KI-Rendite Score is a short self-qualification flow. It gives a company a
useful first read on AI operating maturity and routes the lead toward the
right human-gated next step.

It is not a compliance assessment, legal opinion, financial forecast or final
automation plan.

## Language

Primary launch languages:

- German for DACH;
- English mirror for international accounts.

The score logic is identical across languages. Labels, examples and CTA copy
may be localized.

## Question Blocks

### A. Company Context

Routing only, not scored:

- company type;
- team size;
- rough revenue band or maturity band;
- market/language;
- current website or main point of presence;
- primary goal for the next 30 to 90 days.

### B. AI Usage Maturity

Score range: 0 to 25.

Typical questions:

- How often does the company use AI for real work?
- Are workflows repeatable or rebuilt prompt by prompt?
- Which teams can use AI productively?
- Are outputs reviewed before they affect customers?

### C. Governance, Data And Cost Control

Score range: 0 to 25.

Typical questions:

- Are monthly AI costs known?
- Are allowed and forbidden data classes documented?
- Is shadow AI happening with customer or company data?
- Are human gates defined for public, customer, spend or production actions?

### D. Operating Leverage

Score range: 0 to 25 plus top-wedge tag.

Ask where time leaks:

- offers, proposals and sales material;
- client reporting and status updates;
- content, LinkedIn and marketing operations;
- knowledge management and internal documentation;
- admin, coordination and recurring inbox work.

Higher manual weekly hours imply more available leverage, not necessarily more
AI maturity.

### E. Intent And Buying Readiness

Routing only, not scored:

- urgency;
- decision owner;
- budget comfort;
- preferred first lane;
- willingness to do a paid audit or guided setup.

## Score

```text
Score = B + C + D + consistency bonus
```

The score is a maturity score. The opportunity read is:

```text
unused_potential = 100 - maturity_score
```

Recommended bands:

| Score | Band | Route |
|---:|---|---|
| 0-39 | Blind operation | paid audit strongly recommended |
| 40-69 | Tool stack without operating system | paid audit plus first department wedge |
| 70-100 | Solid base, scale open | audit focused on governance, autonomy and scale |

Every band may still route to an audit. The questionnaire is the entry point,
not the full solution.

## Output

The user should receive:

- maturity score;
- unused potential;
- strongest wedge;
- main risk;
- recommended first lane;
- next step: triage call, paid audit or guided setup.

The internal system should receive:

- normalized answers;
- score breakdown;
- consent and data-handling metadata;
- source URL or acquisition channel;
- recommended follow-up draft.

## Data Boundary

Store only what the user submitted or explicitly approved. Do not enrich with
private data or scrape account-specific sources without an explicit connector,
consent and HumanGate. Public enrichment must be cited and bounded.

## Integration

The questionnaire can seed EVE's first-run onboarding:

```text
signup/report seed
-> score packet
-> EVE boot packet
-> "this is what I know about you/company; is it correct?"
-> progressive setup
```

EVE may ask fewer questions when the score packet already contains enough
validated context.
