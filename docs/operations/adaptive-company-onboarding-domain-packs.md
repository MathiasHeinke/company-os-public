# Adaptive Company Onboarding + Domain Packs

Status: canonical v0 design seed; pack expansion is use-case driven
Date: 2026-05-18

## Principle

Company.OS must adapt to the company. The company should not have to reshape
itself around static software.

**Adaptive software doctrine**: Company.OS learns company reality before
steering behavior. The first-run arc is a discovery and confirmation pass, not
a configuration wizard. Company.OS holds no behavioral defaults until the
operator confirms the discovered facts.

Two-stage adaptive model:
1. **Learn**: gather, infer and confirm company reality from operator answers
   and permitted public signals.
2. **Steer**: propose structure, domain packs, worker contracts and
   recommendations only after company reality is confirmed and memory-seeded.

No automation is planned, no Plane structure is written, and no domain pack is
activated before stage 1 is complete and the operator has confirmed the summary.

The operating system starts by learning the company's current reality, then
creates memory, Plane structure, worker contracts and domain packs around that
reality. Over time, Company.OS may guide the company toward better operating
habits, but the first move is fit and understanding, not forced process.

## Expansion Policy

The initial domain-pack registry is complete enough for the current
operator-led Company.OS layer. Do not try to pre-build every possible department,
automation or industry variant.

Domain packs move from seed to implementation only when there is a concrete
install, Rocket Start, client pilot or internal operating need. The pack owner
must then add the missing detail as a bounded worker contract with explicit
source-of-truth, allowed actions, gates, approval owner and rollback path.

Pack expansion should follow this order:

1. **Prove the operator-led flow**: use the existing registry and templates in
   real work before adding more surfaces.
2. **Harden the repeated pain**: add a template or pack section only when a
   repeated manual step or unsafe ambiguity appears.
3. **Keep sends and writes gated**: outreach, CRM, support, finance, hiring and
   publishing packs remain draft/read-only until a specific HumanGate release
   says otherwise.
4. **Promote to UI later**: browser-guided onboarding belongs to the AionUI /
   Hermes operator-shell layer, not to the v0 registry seed.

This keeps the system adaptive: Company.OS brings proven pack seeds, then shapes
the working system around the company it is being installed into.

## First-Run Intake Model

The intake model defines what Company.OS must learn before it can steer. Every
dimension below must be covered before memory seeding begins. Confidence must
be tracked per fact; no automation runs on `hypothesis`-only facts.

| Dimension | Intake Source | Confidence Levels | Allowed Actions | Human Gate |
|---|---|---|---|---|
| Company identity | Operator answers, public website | confirmed, inferred | read-only until confirmed | HG-1 |
| Operating state | Operator answers | confirmed, inferred | read-only until confirmed | HG-1 |
| Active domains | Operator selection | confirmed | domain-pack scoping only | HG-1 |
| Source provenance | URL, document, manual input | confirmed, inferred, hypothesis | cite-only | none |
| Confidence | Assigned per fact | confirmed, inferred, hypothesis, stale | determines allowed-action ceiling | none |
| Allowed actions | Declared per intake section | read-only, draft-only, worker-contract, send-gated, production-write-gated | must match confidence ceiling | HG-2 for send-gated |
| Human gate | Declared per automation boundary | HG-1 through HG-4 | no automation above declared gate without explicit release | depends |

**Confidence ceiling rules**:
- `hypothesis` → `read-only` only; no drafts, no Plane items, no memory write
- `inferred` → `draft-only` maximum; no send-gated actions
- `confirmed` → full allowed-action range, still bounded by human-gate level
- `stale` → blocks `send-gated` and `production-write-gated`; requires re-confirmation

## Onboarding Arc

The first-run arc is:

1. **Company identity**: name, website, products, customer segments, markets,
   pricing model, brand voice, legal/compliance constraints and claims policy.
2. **Operating state**: departments, current tools, existing team, workflows,
   bottlenecks, active campaigns, CRM, support inboxes and approval habits.
3. **AI discovery**: website read, product extraction, competitor/alternative
   scan, ICP hypothesis and current public messaging summary.
4. **Founder/operator confirmation**: the AI summarizes what it found and asks
   for correction before any automation is planned.
5. **Memory seed**: structured company context is written into files that any
   future inference lane can read.
6. **Plane substrate**: create parent goals, domain-pack child items, role
   labels, gates and review queues.
7. **Domain pack activation**: start with one bounded pack, usually
   Marketing/Outreach, in draft-only mode.

## AI Discovery + Operator Confirmation Loop

This loop must be clearly specified before any guided onboarding UI or
downstream worker is built against it. It is a stateless read/confirm cycle,
not a chat session. Each phase has defined inputs, outputs and a terminal
condition.

**Phase 1 — AI proposal**
- Read permitted public sources: website pages, public docs, open registries.
- Extract: company name, products, pricing signals, market segments, ICP
  signals, competitor/alternative references, current public messaging.
- Assign confidence level to each extracted fact: `confirmed`, `inferred`, or
  `hypothesis`.
- Produce a structured summary with source citation and confidence per claim.
  No free-text dump; the summary must be machine-readable and match the intake
  model dimensions above.

**Phase 2 — Operator confirmation**
- Present the summary to the operator grouped by intake dimension.
- Operator actions: accept, correct, reject or mark-stale per item.
- If corrections are made, re-present the affected dimension with the updated
  facts before moving on.
- Loop terminates only when the operator explicitly confirms all dimensions or
  marks outstanding items `stale`.
- No memory write, no Plane structure creation, no domain pack activation
  before loop terminates.

**State transitions**:

```
AI_DISCOVERY → SUMMARY_READY → OPERATOR_REVIEW
  → [CORRECTIONS → AI_REPROCESS → SUMMARY_READY]
  → CONFIRMED → memory-seed-write → Plane-substrate-create → domain-pack-activate
```

**Specification requirements for downstream UI or worker builders**:
- Implement as a stateless form step sequence; never rely on chat-session
  context for state.
- Each step must have a defined input schema (what the operator sees), an
  output schema (what changes in the intake record), and an explicit terminal
  condition.
- Downstream workers and UI screens must read from the intake record file, not
  from session history.
- The confirmation loop must support partial sessions: save progress to file,
  resume from last confirmed dimension.

## Company Knowledge Table

Every install should build a structured company knowledge table. This is not a
loose notes file; it is the shared operating context for all future workers.

Recommended columns:

| Field | Purpose |
|---|---|
| `domain` | company, brand, product, marketing, sales, support, finance, hiring, product, legal |
| `fact` | the normalized claim or operating fact |
| `source` | URL, document, interview answer, Plane item, CRM export, manual input |
| `confidence` | confirmed, inferred, hypothesis, stale |
| `owner` | founder, CEO, CMO, COO, CFO, CTO, CPO, support, sales |
| `last_verified` | ISO date |
| `allowed_actions` | read-only, draft-only, worker-contract, send-gated, production-write-gated |
| `human_gate` | HG-1, HG-2, HG-2.5, HG-3, HG-3.5, HG-4 |
| `notes` | short context, not a session dump |

This table can later live as Markdown, JSON, database rows or a managed memory
store. The first version should be file-backed and deterministic.

## Memory Seed Files

Initial file-backed seed:

- `company-profile.md`
- `brand-voice.md`
- `product-offers.md`
- `customer-segments.md`
- `competitors.md`
- `operating-map.md`
- `outreach-policy.md`
- `activeContext.md`

These files are install-specific and belong in the target company workspace or
private overlay, not in the public Company.OS template body.

## Inference Lane Reading Model

Future workers and inference lanes must read company context from the memory seed
files, not from chat-session history. This is a hard constraint: sessions end,
context windows reset, and workers run headless. A worker that relies on session
state instead of file-backed context produces unreproducible behavior.

**Reading protocol for any worker or inference lane:**

1. Load the relevant seed file(s) directly by path before starting any inference.
2. Treat `confirmed` facts as actionable input; treat `inferred` as draft-only
   input; treat `hypothesis` and `stale` as read-only background context.
3. Never infer company context from prior tool results or chat history. If the
   seed file is missing or `stale`, stop and raise a `NEEDS_HUMAN` signal.
4. Cite the seed file path and the fact's `confidence` level in every worker
   output that depends on a company fact.
5. If a fact's `last_verified` date is older than the worker's declared staleness
   threshold, treat it as `stale` regardless of its stored confidence label.

**File-backed reading is mandatory because:**
- Headless runtimes (Claude CLI, Codex CLI) have no persistent session.
- Parallel workers run in isolated sandboxes; shared session state does not exist.
- CAO audits must be reproducible from artifacts alone; session memory is not an
  artifact.
- The page index and Plane execution ledger reference seed file paths, not
  session summaries.

## Plane vs Memory Boundary

Plane and the company memory files serve different roles. Mixing them produces
audit drift and unreproducible behavior. The boundary is strict:

| Surface | Role | What lives here | What must NOT live here |
|---|---|---|---|
| Plane | Execution ledger | Work items, states, worker contracts, dispatches, CAO verdicts, releases | Company facts, brand voice, product specs, customer segments |
| Memory seed files | Company truth | Company profile, brand voice, products, customers, competitors, operating map, outreach policy, active context | Plane item IDs, work-item state, dispatch history |
| Honcho (company store) | Proposal-only runtime memory | Memory update proposals from workers, dream reviews | Raw execution logs, Plane snapshots |

**Rules enforced at every dispatch:**
- Workers read company truth from memory files, not from Plane descriptions.
- Workers write execution evidence to Plane (via `worker.reported` comment), not
  to memory files.
- Memory file updates require a `memory.proposal_created` event and explicit
  Honcho/operator review; no direct write by a runtime worker.
- No memory dump into Plane item descriptions. A Plane item links to a memory
  file path; it does not copy the file content.
- Plane Done transitions are Founder/CEO-only. Memory file updates are
  operator-reviewed. Neither surface is modified by CAO.

## Domain Pack Registry

Domain packs are capability bundles, not hard-coded workflows.

Initial pack families:

| Pack | First Useful Scope | Default Gate |
|---|---|---|
| Marketing/Outreach | ICP, channels, draft messaging, competitor-informed positioning | draft-only, HG-2 before send |
| Content Engine | blog, LinkedIn, X, newsletter, editorial calendar | claim review, publish gate |
| Sales/CRM | lead stages, qualification, CRM hygiene, handoff notes | no mass-write without HG-2.5 |
| Customer Support | ticket triage, response drafts, KB suggestions | no customer send without approval |
| Finance Ops | invoices, cashflow rituals, metrics, budget views | no bank/payment action |
| Hiring | role briefs, candidate screening rubrics, outreach drafts | no candidate decision automation |
| Product Discovery | user feedback, roadmap candidates, spec drafts | no shipping/deploy without release gate |
| Print/Magazine | editorial plan, issue outline, vendor checklist, proof review | publish/print gate |

The pack asks deeper questions only for the domains the company chooses to
activate. Company.OS should not force a full enterprise questionnaire before
the first useful outcome.

## Marketing/Outreach Pack v0

The first pack runs in draft-only mode. No draft is produced until the operator
confirms the AI discovery summary. HG-2 is required before any send action.

Questions:

- What company, product or offer should outreach support?
- What is the website and which pages best describe the offer?
- Who is the target buyer, user and economic decision maker?
- Which channels are currently allowed: email, LinkedIn, X, phone, events,
  partners, direct mail or print?
- What has been tried already?
- What must never be claimed?
- What tone should be preserved?
- Who approves messages before they are sent?

AI discovery:

- read public website pages
- summarize offer and proof points
- identify competitors/alternatives
- infer ICP hypotheses
- propose positioning angles

Confirmation:

- present discovery summary to operator grouped by: offer, ICP, channels, competitors
- operator must accept, correct or reject each item before any draft is produced
- no draft output is generated until operator explicitly confirms or marks items stale
- loop repeats until operator confirms all dimensions or marks outstanding items stale
- approval owner is identified and recorded; their identity is required before HG-2 releases

Outputs:

- `outreach-context.md`
- `competitor-brief.md`
- `icp-hypotheses.md`
- `message-angles.md`
- `draft-sequence.md`
- Plane child worker contracts for follow-up work

Claim policy:

- all claims are draft-only; none may be distributed without operator review
- regulated claims (health, financial, legal, comparative, superlative) require a
  separate gate before draft distribution
- the operator must declare during intake which claims are permanently off-limits
- the named approval owner reviews all claims before any distribution; HG-2 is the
  minimum gate for any outreach send

Stop rules:

- no email/LinkedIn/X sends
- no CRM mass-write
- no scraped personal data storage
- no public claim generation without review
- no regulated claims unless a separate gate authorizes them
- no distribution of any draft without named approval owner sign-off

## Content Engine Pack v0

The Content Engine pack runs in draft-only mode. No publishing action is permitted without operator review and explicit release gate.

Questions:

- What topics, themes or categories should content cover?
- Which channels are active: blog, LinkedIn, X, newsletter, podcast or other?
- What is the publishing cadence goal?
- Who is the primary audience for each channel?
- What content has performed well or poorly in the past?
- What claims or topics must be avoided?
- Who reviews and approves content before publishing?
- Are there brand guidelines or tone documents to follow?

AI discovery:

- read existing public content and website
- summarize current content themes and gaps
- identify competitor content patterns
- propose initial editorial calendar with topic clusters
- ask the operator to confirm or correct

Outputs:

- `editorial-calendar.md`
- `content-topic-backlog.md`
- `draft-blog-post.md`
- `draft-newsletter.md`
- Plane child worker contracts for follow-up drafts

Stop rules:

- no publish without review
- no social post without approval
- no regulated claim without gate
- no personal data storage without consent

## Sales/CRM Pack v0

The Sales/CRM pack runs in draft-only mode. No CRM mass-write or bulk outreach is permitted without HG-2.5 release.

Questions:

- What CRM or lead tracking tool is currently in use?
- What are the active deal stages or pipeline steps?
- What does a qualified lead look like?
- What is the handoff process between marketing and sales, and between sales and customer success?
- What information must every deal record contain?
- Are there compliance or privacy rules around how lead data is stored or used?
- Who approves bulk outreach or CRM automation rules?
- What is the current biggest bottleneck in the sales process?

AI discovery:

- read public pricing and product pages
- infer likely buyer personas and deal complexity from product positioning
- propose initial lead stage map and qualification criteria
- draft CRM hygiene checklist based on typical gaps
- ask the operator to confirm or correct

Outputs:

- `lead-stage-map.md`
- `qualification-rubric.md`
- `crm-hygiene-checklist.md`
- `handoff-note-template.md`
- Plane child worker contracts for pipeline definition work

Stop rules:

- no CRM mass-write without HG-2.5
- no bulk outreach without approval
- no lead enrichment without consent
- no deal stage automation without review
- no personal data export without gate

## Customer Support Pack v0

The Customer Support pack runs in draft-only mode. No response is sent to any customer without operator approval.

Questions:

- What support channels are active: email, live chat, phone, help desk, community?
- What ticketing or help desk tool is in use?
- What are the most common support request categories?
- What is the expected response time or SLA per tier?
- Are there topics that require escalation or legal review before responding?
- Who approves responses before they are sent to customers?
- What tone should support communications use?
- Are there any compliance or regulatory constraints on customer communication?

AI discovery:

- read public help docs and FAQ pages
- identify common product pain points from public reviews or community posts
- propose initial ticket triage categories and escalation rules
- draft response templates for top issue types
- ask the operator to confirm or correct

Outputs:

- `ticket-triage-framework.md`
- `response-draft-templates.md`
- `kb-article-outlines.md`
- `escalation-rules.md`
- Plane child worker contracts for KB article drafts

Stop rules:

- no customer send without approval
- no automated reply without review
- no regulated advice without gate
- no personal data storage without consent
- no case close without human sign-off

## Finance Ops Pack v0

The Finance Ops pack runs in draft-only mode. No financial action, payment initiation or bank instruction is permitted under any circumstance. Human gate is HG-3 for any action touching financial systems.

Questions:

- What finance or accounting tool is in use?
- What is the current invoicing and payment collection process?
- What financial metrics does the founder or leadership review weekly?
- Are there open invoices, overdue accounts or cashflow concerns right now?
- What budget categories matter most at this stage?
- Who has authority to approve financial actions or payments?
- Are there external accountants, bookkeepers or CFO advisors involved?
- What compliance or tax obligations shape financial operations?

AI discovery:

- read public pricing and billing information
- infer likely revenue model and cost structure from product and team signals
- propose initial metrics dashboard and cashflow ritual
- draft invoice checklist template
- ask the operator to confirm or correct

Outputs:

- `invoice-checklist.md`
- `cashflow-ritual-outline.md`
- `metrics-dashboard-skeleton.md`
- `budget-view-template.md`
- Plane child worker contracts for financial ritual setup

Stop rules:

- no bank action of any kind
- no payment initiation
- no financial data export without gate
- no accounting system write without approval
- no tax filing without human sign-off

## Hiring Pack v0

The Hiring pack runs in draft-only mode. No candidate decision may be automated. No outreach is sent without operator approval. Employment law constraints apply to all questions and claims.

Questions:

- What roles are currently open or planned to open in the next 90 days?
- What sourcing channels are being used: job boards, LinkedIn, referrals, agencies?
- What are the non-negotiable requirements for each role?
- What is the interview process and who is involved?
- Are there diversity, equity or inclusion goals or constraints?
- Who makes the final hiring decision?
- What must not be said or asked during outreach or interviews under employment law?
- What is the target salary range or compensation model?

AI discovery:

- read company website, about page and team page
- infer team size, growth stage and likely skill gaps from product and market signals
- propose initial role brief outlines for open roles
- draft screening rubric and interview question bank
- ask the operator to confirm or correct

Outputs:

- `role-brief-drafts.md`
- `screening-rubric.md`
- `outreach-message-templates.md`
- `interview-question-bank.md`
- Plane child worker contracts for role brief finalization

Stop rules:

- no candidate decision automation
- no outreach send without approval
- no regulated employment claim without review
- no personal candidate data storage without consent
- no rejection send without human sign-off

## Product Discovery Pack v0

The Product Discovery pack runs in draft-only mode. No spec, feature or roadmap item may be shipped or deployed without an explicit release gate.

Questions:

- What are the top user complaints or requested features right now?
- Where does user feedback currently live: support tickets, interviews, reviews, community?
- What is the current product roadmap horizon?
- What are the main strategic bets or themes for the next release cycle?
- Who owns product decisions and who has veto rights?
- What is the release process and gate for shipping a feature?
- What user research has been done recently?
- Are there any technical, regulatory or contractual constraints on what can be built?

AI discovery:

- read public product pages, changelog and release notes
- read public reviews, community posts and support forum signals
- propose initial opportunity brief from signal synthesis
- draft roadmap candidate list with confidence levels
- ask the operator to confirm or correct

Outputs:

- `user-feedback-synthesis.md`
- `roadmap-candidates.md`
- `opportunity-brief.md`
- `spec-draft-outlines.md`
- Plane child worker contracts for spec drafting

Stop rules:

- no ship or deploy without release gate
- no production write without approval
- no spec publish without review
- no roadmap commit without product owner sign-off

## Print/Magazine Pack v0

The Print/Magazine pack runs in draft-only mode. No publish, print order or distribution trigger may be issued without editor approval and an explicit release gate.

Questions:

- What is the publication name, cadence and format?
- Who is the target audience and what is the distribution model?
- What are the main sections or departments in each issue?
- Who is the editor-in-chief and who has final approval over content?
- What is the print or publish deadline for the next issue?
- Which vendors or suppliers are involved: printers, distributors, designers?
- Are there advertising, sponsorship or regulated content sections?
- What claims, topics or images are off-limits?

AI discovery:

- read public website, archive pages or previous issues if available
- identify audience, format and editorial themes from public signals
- propose initial issue structure and editorial calendar
- draft vendor checklist and proof review workflow
- ask the operator to confirm or correct

Outputs:

- `editorial-plan.md`
- `issue-outline.md`
- `vendor-checklist.md`
- `proof-review-workflow.md`
- Plane child worker contracts for article commissioning and proofing

Stop rules:

- no publish without editor approval
- no print order without human sign-off
- no distribution trigger without gate
- no regulated claim without review
- no advertising copy publish without approval

## Domain Pack Registry Artifact

The machine-readable registry for all domain packs lives at:

`registries/domain-packs/company-os.json`

It declares for each pack: id, name, owner role, first useful scope, intake questions, AI discovery steps, outputs, default human gate, activation mode, and blocked actions. Workers and onboarding flows must read from the registry, not from session context.

The structural schema lives at:

`registries/domain-packs/company-os.schema.json`

The executable validator lives at:

`scripts/goal/domain-pack-registry-core.mjs`

Before a Browser UI installer, onboarding wizard, or intake materializer treats
the registry as executable input, the registry validator must pass. It enforces
the baseline safety invariants that JSON Schema alone cannot express:

- pack ids are unique case-insensitively
- each pack has a valid `role:*` owner and a valid default human gate
- every pack declares non-empty `blocked_actions`
- Finance/CFO packs require `HG-3` or stronger and explicit bank, payment and
  accounting-system blocked-action coverage
- send/publish-capable packs stay `draft-only`

## Opt-In Activation Model

Pack activation is always opt-in. The operator explicitly selects which domain(s) to activate during or after onboarding. Key principles:

- Company.OS activates one pack at a time, starting with the operator's highest-priority domain.
- Deeper intake questions are only asked for the chosen domain; other domains stay dormant.
- The operator may not be asked all questions from all packs in a single session.
- Every pack starts in draft-only mode. No send, publish, deploy or production-write action may occur until the operator explicitly releases it through the declared human gate.
- Re-activation of a dormant pack requires a new operator selection and a fresh intake pass.

This model prevents a full enterprise questionnaire before the first useful outcome and keeps the cognitive load proportional to the scope the operator actually needs.

## Plane Mapping

Onboarding creates one parent Goal item and bounded child worker items:

1. Adaptive onboarding doctrine + schema.
2. Company knowledge table and memory seed.
3. Domain pack registry.
4. Marketing/Outreach pack v0.
5. Plane/materialization generator from intake answers.
6. CAO safety audit for draft-only, claims and send gates.

All children start as `dispatch: manual`. Stage 0.5, runtime preflight, CAO and
Controller decide when a child may run.

## Intake-to-Plane Materializer (v0)

This section defines how a confirmed intake record becomes Plane parent and
child worker-contract drafts without auto-dispatch. It is the bounded bridge
between the AI Discovery + Operator Confirmation Loop and `scripts/goal/goal.mjs
materialize`. It does not call Plane on its own; it produces input that the
existing `buildGoalMaterialization` substrate consumes.

### Input contract

File-backed intake record (machine-readable JSON or YAML) that must include:

| Field | Required | Notes |
|---|---|---|
| `confirmed_at` | yes | ISO timestamp of operator confirmation; missing value blocks materialization |
| `company.name` | yes | Confirmed company identity |
| `company.confidence` | yes | Must be `confirmed`; `inferred` and `hypothesis` block materialization |
| `approval_owner` | yes | Named human reviewer for HG-2 releases (also accepted under `operating_state.approval_owner`) |
| `active_domains[]` | yes | At least one entry with `pack_id` and `confidence: confirmed` |
| `active_domains[].last_verified` | recommended | ISO timestamp; falls back to `intake.confirmed_at`, must resolve fresh per the stale-fact guard |
| `company.last_verified` | recommended | ISO timestamp; falls back to `intake.confirmed_at`, must resolve fresh per the stale-fact guard |
| `record_path` | recommended | Relative path to the intake record, cited in source-of-truth |
| `workspace` | optional | Workspace pointer (default `registry:company-os`) |

Any required field missing or below confidence `confirmed` returns a structured
error from `validateConfirmedIntake`. No materialization payload is produced
from a partial intake. Confirmed facts without a fresh `last_verified` (or
fresh `confirmed_at` fallback) are rejected by the stale-fact guard with stable
reason codes; see the [WORK_ITEM_ID] verification section below.

### Mapping rules

The mapping module `scripts/goal/intake-to-plane-core.mjs` produces:

- One parent goal (role `role:coo`) whose acceptance criteria, gates and risks
  pin the dispatch-manual, Stage 0.5, CAO, Controller and HG-2 contract.
- One child per confirmed active domain. Each child's role comes from the
  domain pack registry (`owner_role`), `agent` is `claude`, `mode` defaults to
  `implement`, `dispatch` is always `manual`, `human_gate` defaults to the
  pack's `default_human_gate`, and `blocked_actions` is the union of the
  default no-auto-dispatch/no-publish base and the pack's declared blocked
  actions.
- Source-of-truth on every child cites the doctrine doc, the domain-pack
  registry artifact and the intake record path.
- Acceptance criteria on every child name the approval owner and re-assert
  Stage 0.5, CAO PASS and Controller decision as preconditions before HG-2.

Pack ids that are not present in the registry are rejected. Duplicate pack ids
emit a warning and use the first occurrence.

### Manual-dispatch enforcement

`dispatch: manual` is set explicitly in the mapping module for every child,
independent of any registry default. The downstream `buildGoalMaterialization`
in `scripts/goal/goal-core.mjs` further normalizes child `dispatch` to
`manual` via `childGoalFromInput`. The rendered fenced worker contract therefore
fails the validator's `contract.dispatch-not-ready` check at materialization
time, which is the desired state: the dispatcher must not lock these children
until Stage 0.5 returns `CONTRACT_PASS` and the operator/Codex flips dispatch.

### Stage 0.5, CAO and Controller gates

The materializer never:

- Locks a child Plane item.
- Calls a runtime dispatcher.
- Marks anything Done.
- Writes memory beyond proposal-only Honcho events.

Each generated child carries the gate list
`operator-confirmation-complete`, `stage-0.5-contract-pass`, `cao-pass`,
`controller-decision-card`, `human-gate-<pack default>`. The parent goal carries
`stage-0.5-contract-pass-per-child`, `cao-pass-per-child`,
`controller-decision-card-per-child` and `founder-or-ceo-release-before-done`.

### CLI surface (no new commands)

The materializer reuses the existing CLI:

1. Operator writes the confirmed intake record to a known path under the
   company workspace.
2. A separate (manual) step calls `buildIntakeMaterializationInput` from
   `scripts/goal/intake-to-plane-core.mjs` to produce a `{goal, children}`
   bundle.
3. The operator runs `node scripts/goal/goal.mjs materialize --write` with the
   produced fields to render a local materialization report.
4. The operator runs `node scripts/goal/goal.mjs materialize --apply` only when
   they want Plane drafts created. Apply remains label-id gated and emits
   `dispatch: manual` children.

No automated runner chains these steps; the materializer is library code, not
a worker.

### Rollback path

Local artifact rollback:

- Delete `reports/goals/<date>/<slug>-materialize.md` and the matching
  `.json` sibling. Nothing else on disk is touched by this materializer.
- Re-run `goal.mjs draft` only if a fresh draft is required before
  re-materializing.

Plane draft rollback (operator action, never worker, never CAO):

1. Confirm each generated child item is still in its initial state with no
   `worker.locked` comment. If any child has been locked, stop and escalate to
   the Controller; rollback does not cover dispatched items.
2. Cancel children before parent: set each child Plane item state to
   `Cancelled` (Founder/CEO authority).
3. After all children are cancelled, set the parent item to `Cancelled`.
4. Do not delete Plane items; cancellation preserves the audit trail.

The module exports `renderIntakeRollbackMarkdown` which renders this checklist
with the actual `pack_id` refs for the run.

### Verification ([WORK_ITEM_ID] CTO pass 2026-05-18)

- `scripts/goal/intake-to-plane-core.mjs` and
  `scripts/goal/intake-to-plane-core.test.mjs` verify that confirmed intake
  maps to a parent and per-pack children, that every child is `dispatch:
  manual`, that the rendered fenced worker contract fails
  `contract.dispatch-not-ready` (so the dispatcher cannot lock it), and that
  unknown packs are rejected.
- The materializer emits no Plane write of its own. It produces input for the
  existing `buildGoalMaterialization` and remains subject to its label-id and
  `apply` gates.

### Verification ([WORK_ITEM_ID] CTO pass 2026-05-18)

- `scripts/goal/domain-pack-registry-core.mjs` and
  `scripts/goal/domain-pack-registry-core.test.mjs` validate the current
  registry and its high-risk boundaries before Browser UI installer work.
- `registries/domain-packs/company-os.schema.json` documents the structural
  registry shape for installers and future external validation surfaces.

### Intake Freshness + Stale-Fact Guard ([WORK_ITEM_ID] CTO pass 2026-05-18)

The intake materializer enforces a stale-fact guard before any Plane parent or
child contract is emitted. The guard answers a single question per confirmed
fact: is the last operator-verified timestamp recent enough to drive Plane
substrate without re-confirmation?

**Per-fact freshness contract**

- Every confirmed `intake.company` and every confirmed `intake.active_domains[]`
  selection must carry `last_verified` (ISO timestamp). When `last_verified` is
  absent the materializer falls back to `intake.confirmed_at` as the effective
  freshness anchor.
- If neither `last_verified` nor `confirmed_at` resolves to a parseable
  timestamp, the materializer fails with the stable reason code
  `INTAKE_FACT_FRESHNESS_MISSING` and emits no payload.
- If the effective timestamp is older than the freshness window (default
  `DEFAULT_INTAKE_FRESHNESS_WINDOW_DAYS = 30`), the materializer fails with the
  stable reason code `INTAKE_FACT_STALE` and emits no payload. Callers may
  override the window via `freshnessWindowDays` for environment-specific
  tightening.
- Non-selected background entries in `intake.active_domains[]` (rows whose
  `confidence` is anything other than `confirmed`) are treated as background
  context and are not freshness-checked. They never block materialization,
  matching the doctrine that `hypothesis` and `inferred` facts stay read-only
  or draft-only and never drive Plane substrate.

**Child contract evidence**

Each emitted child carries a `freshness` block (`{ ok, effective_source,
last_verified, age_days, ... }`) and an extra acceptance criterion citing the
`last_verified` source (`pack last_verified=<iso>` or `intake confirmed_at
fallback=<iso>`). Downstream workers must re-check the stale-fact guard before
HG-2 release and surface any stale fact as `NEEDS_HUMAN`; silent reuse of
stale company facts is a contract violation.

**Parent goal coverage**

The parent goal carries an explicit `intake-freshness-window-passed` gate, an
acceptance row that names the window in effect, and a risk row that names the
two reason codes. The freshness window itself is reported in the parent metric
list so audits can confirm the materializer ran under the intended threshold.

**Reason codes**

`INTAKE_REASON_CODES.INTAKE_FACT_FRESHNESS_MISSING` and
`INTAKE_REASON_CODES.INTAKE_FACT_STALE` are exported from
`scripts/goal/intake-to-plane-core.mjs` and asserted in
`scripts/goal/intake-to-plane-core.test.mjs`. They are the canonical identifiers
for both worker reports and downstream installer error surfaces; do not rename
without updating both the doctrine doc and the test suite.

**Verification command**

`node --test scripts/goal/intake-to-plane-core.test.mjs` covers four
freshness-specific paths:

- Missing `last_verified` plus unparseable `confirmed_at` produces
  `INTAKE_FACT_FRESHNESS_MISSING`.
- A confirmed active domain older than the freshness window produces
  `INTAKE_FACT_STALE`.
- A confirmed active domain with no `last_verified` but a recent
  `confirmed_at` materializes successfully and records
  `effective_source: confirmed_at`.
- Stale background entries (`confidence` not `confirmed`) do not block
  materialization and do not emit blocking reason codes.

## Non-Goals and Hard Boundaries

These boundaries apply system-wide, at every stage of onboarding, discovery and
domain pack activation. Downstream workers, UI screens and domain-pack children
must inherit and re-assert them in their own contracts.

- No production writes during onboarding.
- No email, LinkedIn, X, CRM, phone or any external send during onboarding.
- No public claim generation without operator review and explicit release gate.
- No personal data storage from scraping or enrichment without explicit
  operator consent.
- No generic CRM/email/LinkedIn automation in the first pass.
- No external data enrichment beyond explicitly allowed public research.
- No forced enterprise questionnaire before a first bounded domain pack.
- No memory dump into Plane; Plane tracks execution, memory files track company
  truth.
- No Plane Done by worker or CAO.

**Boundary verification ([WORK_ITEM_ID] CPO pass 2026-05-18)**: These boundaries
have been verified and confirmed during the adaptive onboarding doctrine sharpening
pass. Downstream children must inherit and re-assert them in their own contracts.

## Finance and External-Action Gate Hardening ([WORK_ITEM_ID] CFO pass 2026-05-18)

This section documents the fail-closed safety layer added for Finance Ops and all
external-action domain packs before any Browser UI installer or onboarding wizard
may consume the registry as executable input.

### Finance domain: gate and blocked-action preservation

`scripts/goal/domain-pack-registry-core.mjs` enforces:

- Finance packs (owner_role `role:cfo` or id contains "finance") must declare
  `default_human_gate` of `HG-3` or stronger. Downgrade to `HG-2` or `HG-2.5`
  fails with `FINANCE_GATE_TOO_WEAK`.
- Finance packs must explicitly block each of: bank-action, payment-initiation,
  accounting-system action. Missing any of these three categories fails with
  `FINANCE_BLOCKED_ACTION_MISSING`.

`scripts/goal/intake-to-plane-core.mjs` preserves:

- The materializer invokes the registry validator before building any child
  drafts. Invalid registry state fails closed and emits the validator's stable
  reason codes instead of relying on callers to run a separate preflight.
- The child's `human_gate` is set exactly to the pack's `default_human_gate`.
  For Finance Ops this is always `HG-3`.
- The child's `blocked_actions` is the union of the base no-dispatch/no-publish
  list and the pack's full declared `blocked_actions`, including bank-action,
  payment-initiation, accounting-system-write, and tax-filing entries.
- Materialization fails if `approval_owner` is absent, regardless of pack type.

### External-action packs: draft-only enforcement

Packs whose `blocked_actions` include any of the following keyword families are
classified as external-action-capable and must declare `activation_mode:
draft-only`:

- send, publish, post, email, linkedin, x-post, mail, distribute, broadcast
- crm (catches CRM mass-write patterns)
- outreach (catches bulk-outreach patterns)

Attempting to set `activation_mode` to any value other than `draft-only` for
these packs fails with `UNSAFE_ACTIVATION_MODE`.

Downgrade-prevention is verified for each named pack family:

| Pack | Downgrade attempted | Failing reason code |
|---|---|---|
| Finance Ops | gate lowered to HG-2 | `FINANCE_GATE_TOO_WEAK` |
| Finance Ops | bank/payment/accounting blocked action removed | `FINANCE_BLOCKED_ACTION_MISSING` |
| Sales / CRM | activation_mode changed from draft-only | `UNSAFE_ACTIVATION_MODE` |
| Marketing / Outreach | activation_mode changed from draft-only | `UNSAFE_ACTIVATION_MODE` |
| Customer Support | activation_mode changed from draft-only | `UNSAFE_ACTIVATION_MODE` |
| Hiring | activation_mode changed from draft-only | `UNSAFE_ACTIVATION_MODE` |

### Non-goals (explicit exclusions)

The following actions are excluded from every domain pack, runtime worker, and
downstream installer in this system. They are not deferred or gated — they are
categorically excluded and must be re-asserted in every child contract:

- No bank action of any kind (query, transfer, authorization, reconciliation).
- No payment initiation (invoice trigger, stripe charge, payroll run, wire).
- No accounting-system write (ledger entry, transaction post, report publish).
- No external message send (email, LinkedIn, X/Twitter, SMS, customer support reply, CRM bulk-write, outreach sequence trigger, candidate message).
- No personal data scraping or storage without explicit operator consent.
- No production-system write, deploy, merge, or public release.
- No Plane Done transition by worker or CAO.

These non-goals apply to the registry validator, the intake materializer, every
generated child contract, and any future Browser UI or onboarding wizard that
consumes the registry.

### Verification commands ([WORK_ITEM_ID])

```
node --test scripts/goal/domain-pack-registry-core.test.mjs   # 44 tests
node --test scripts/goal/intake-to-plane-core.test.mjs         # 24 tests
node scripts/page-index/generate-page-index.mjs --check
git diff --check
```
