# Department Operating Doctrine

Status: canonical productizable doctrine
Use for: building Company.OS departments as accountable operating units
Last updated: 2026-05-21

## Purpose

Company.OS models departments as real operating units, not as chat sessions or
loose prompt collections.

The system may use fast AI workers, but speed does not remove the need for
clear command boundaries. A department needs an accountable C-level owner,
worker roles, repeatable contracts, review gates, reporting, learning loops and
a clean escalation path to the CEO and Founder.

This doctrine applies to every Company.OS department pack, including Marketing,
Engineering, Website/Web Ops, Product, Operations, Sales, Customer Ops, Finance,
HR, Legal and Knowledge/Memory.

## Core Thesis

A Company.OS department works like a small company unit:

```text
Founder / Board
-> CEO / Codex Controller
-> C-Level Department Owner
-> Worker Roles and Worker Contracts
-> CAO / Controller / Raindrop Review
-> Daily Department Report
-> CEO escalation only when needed
```

The C-level owner may direct, improve and optimize the department inside its
declared mandate. The CEO owns cross-department tradeoffs, release authority,
HumanGate escalation and structural changes to the company operating system.

## Department Identity

Every department must declare:

| Field | Meaning |
|---|---|
| Department | operating lane, for example Marketing or Engineering |
| C-Level Owner | accountable role, for example CMO or CTO |
| Mission | what this department is responsible for |
| Primary Outputs | concrete artifacts the department produces |
| Worker Roles | reusable employee-like capabilities |
| Worker Contracts | bounded assignments for one run |
| CapabilityProfiles | what tools, paths and auth the workers may use |
| OutcomeSpecs | quality bar and scoring method |
| Report Sink | singleton daily report destination |
| Escalation Owner | CEO or Founder gate for non-routine decisions |

Worker contracts are not employees. A worker contract is a bounded assignment:
one job, one scope, one evidence packet, one report.

A worker role is closer to an employee-like capability:

```text
RoleName + CapabilityProfile + Workspace + Tools + Memory Scope + Evaluation
History + Reporting Standard
```

The department matures when roles become reusable and predictable across many
worker contracts.

## Authority Model

### CEO / Codex Controller

The CEO owns:

- company portfolio, sequencing and resource allocation
- cross-department conflicts and tradeoffs
- release decisions and HG-2.5 release cards
- HG-3 critical authority for high-risk work that is reversible/restorable
- department structure changes
- recurring scheduler authority above department-local bounds
- company-wide doctrine, versioning and public release posture
- escalation to Chief-of-Staff/Founder-Proxy for HG-3.5 review and Founder for HG-4 decisions

The CEO may delegate bounded work, but remains accountable for how departments
fit together.

### C-Level Department Owner

The C-level owner owns:

- department bar and operating rhythm
- worker assignment and worker retry decisions inside the department
- acceptance criteria and quality rubrics for department outputs
- prompt, checklist and contract improvements inside declared scope
- department-local process improvements
- daily department report to the CEO
- escalation when a decision exceeds department authority

The department owner may make the department better. The department owner may
not quietly change what the department is allowed to be.

Department owners are also responsible for visible operational hygiene in their
lane. If their workers leave dirty worktrees, unreported artifacts, ambiguous
metrics rows or blocked reports, the owner must resolve, park or escalate them
through `docs/operations/workspace-stewardship-protocol.md`. "Not my changes" is
a temporary classification, not a final report.

### Worker Runtime

Workers own:

- bounded execution
- local evidence gathering
- artifact generation inside allowed paths
- self-reflection and learning proposals
- reporting changed files, commands, blockers and open risks

Workers do not own:

- Plane Done
- release, merge, deploy, publish or spend
- department policy
- memory writes unless explicitly allowed
- expansion beyond the contract

### CAO / Controller / Raindrop

Independent review owns:

- evidence checks
- gate verdicts
- prompt-result quality review
- failure-mode analysis
- autonomy recommendations
- rework routing

Independent review must not produce the same work it judges.

## Department Owner Allowed Actions

Inside its mandate, a C-level department owner may:

- prioritize department backlog items
- assign or reassign worker contracts
- request revisions or retries
- narrow scope when a worker is drifting
- park a low-value task
- improve department-local prompts, checklists, rubrics and SOP drafts
- propose worker role changes
- propose CapabilityProfile changes
- incorporate CAO, Controller and Raindrop findings into better contracts
- create next-work recommendations for the CEO
- write the daily department report

These actions must still be reported. Silent optimization is not allowed.

## Mandatory Escalation

A department owner must escalate before:

| Trigger | Escalates to | Why |
|---|---|---|
| HG-2.5 release action | CEO / Codex Controller | push, merge, deploy, publish, Plane Done, release cards |
| HG-3 critical action | CEO / Codex Controller | auth, schema, secrets, production repair or department authority changes that are reversible/restorable |
| HG-3.5 proxy review | Chief-of-Staff / Founder-Proxy via CEO | founder-facing interpretation, challenge, compression or pause-artifact review |
| HG-4 founder action | Founder via CEO + Chief-of-Staff | strategic direction, non-restorable data loss, company identity/taste, major legal/capital exposure |
| Department structure change | CEO | new roles, removed roles, new recurring cadence, new authority |
| CapabilityProfile expansion | CEO or CAO depending on risk | new tools, broader read/write paths, auth, external connectors |
| RuntimeAuth expansion | CEO / Founder for sensitive auth | new credentials or stronger scopes |
| Scheduler authority expansion | CEO | unattended recurring execution changes risk posture |
| Cross-department dependency conflict | CEO | department-local optimization may harm another lane |
| Public channel expansion | CEO / Founder depending on channel | external trust boundary |
| Budget or spend change | CFO / CEO / Founder | cost and capital control |

If the owner is unsure whether a change is department-local or structural, it
is structural until the CEO classifies it otherwise.

## Daily Department Report

Every active department must produce one dated report per day when it has
activity, recurring jobs, blocked items or material learning.

The report is a reduction layer. It is not a raw activity dump.

Required sections:

1. Executive status
2. What shipped or reached review-ready state
3. What was created as draft or artifact
4. What failed, blocked or degraded
5. Worker performance and intervention count
6. Gate results and CAO/Controller verdicts
7. Raindrop prompt-result learnings
8. Department-local improvements made today
9. Decisions that need CEO or Founder attention
10. Recommended next 1-3 worker contracts
11. Workspace stewardship: clean, resolved, parked or blocked

Canonical report header:

```yaml
type: department.report
department: marketing | engineering | website-ops | product | operations | ...
owner: role:cmo | role:cto | role:cpo | role:coo | ...
date: YYYY-MM-DD
report_sink: plane:<project-or-item> | file:<path>
activity_window: YYYY-MM-DDTHH:mm:ssZ/YYYY-MM-DDTHH:mm:ssZ
overall_state: green | yellow | red | blocked
human_gate_required: none | HG-2.5 | HG-3 | HG-3.5 | HG-4
ceo_decision_needed: true | false
workspace_stewardship: clean | resolved | parked | blocked
```

Canonical escalation card:

```yaml
type: department.escalation
department: marketing | engineering | ...
owner: role:cmo | role:cto | ...
target: role:ceo | chief-of-staff | founder
human_gate: HG-2.5 | HG-3 | HG-3.5 | HG-4
decision_needed: <one sentence>
evidence:
  - <Plane item / report / commit / artifact>
options:
  - option: A
    consequence: <expected result>
  - option: B
    consequence: <expected result>
recommendation: <department owner recommendation>
```

## Worker Performance Model

Departments must evaluate workers like employee performance signals, not as
isolated prompts.

Track:

- output quality
- evidence quality
- contract adherence
- wall-clock runtime
- active runtime
- human-equivalent estimate
- token and cost proxy
- intervention count
- retry count
- gate failures
- repeated failure modes
- Raindrop prompt-result assessment
- CAO/Controller verdicts
- learning proposals
- role promotion, demotion or retraining recommendation

This creates a feedback loop:

```text
Worker Contract -> Worker Output -> CAO/Controller/Raindrop Review
-> Department Owner Learning -> Better Contract / SOP / CapabilityProfile
-> Next Worker Contract
```

## Department Maturity Ladder

| Level | State | Evidence |
|---|---|---|
| D0 | Doctrine only | mission and authority documented |
| D1 | Templates exist | worker contracts and report template exist |
| D2 | First-pass workers | first bounded worker reports posted |
| D3 | Daily report | singleton report sink works |
| D4 | Scheduler loop | recurring work reaches CAO/Controller review |
| D5 | Local autonomy | L2/L3 work runs repeatedly inside gates |
| D6 | Portfolio integration | CEO sees cross-department status and tradeoffs |

A department is not considered operational because one worker succeeded once.
It becomes operational when it can repeat the work, report it, learn from it and
escalate only the decisions that matter.

## Department Readiness Checklist

A department may start recurring work only when it has:

- Department mission and C-level owner
- Role label and parent Plane project/module
- worker contract template
- CapabilityProfile and allowed read/write paths
- OutcomeSpec or review rubric
- gates and rollback boundary
- daily report sink
- HumanGate map
- CAO/Controller review path
- Raindrop or event-ledger observability path
- worktree or artifact hygiene rule
- memory/update policy
- scheduler policy
- CEO escalation format

## Marketing Department Example

The CMO may:

- assign topic research, article drafts, image briefs and performance analysis
- improve campaign prompts and editorial rubrics
- reroute low-quality drafts to a better worker
- request a rewrite before CEO review
- convert Raindrop findings into better marketing contracts
- write the daily CMO morning briefing

The CMO must escalate:

- publish/send/post decisions
- new public cadence or new public channel
- brand-positioning changes
- regulated, medical, legal or aggressive claims
- budget, ads or paid distribution
- structural changes to the Marketing Department Pack

The CMO escalates HG-2.5/HG-3 to CEO. The Chief-of-Staff only enters at HG-3.5
when founder-facing translation is needed; the Founder only enters at HG-4.

## Engineering Department Example

The CTO may:

- assign code audits, test fixes, sandbox patches and docs updates
- request worker retries for failing tests
- improve coding worker prompts, review checklists and branch hygiene
- require stronger test gates for recurring defects
- propose code-quality process changes
- write the daily engineering report

Canonical sources:

- `docs/orchestration/company-os-engineering-department-pack-v068.md`
- `docs/operations/cto-daily-engineering-report.md`

The CTO must escalate:

- merge, push, deploy, release or Plane Done
- production database, auth, secret or infrastructure changes to CEO/HG-3 when
  reversible/restorable, to Founder/HG-4 when not
- broad CapabilityProfile expansion
- changes to the department's release authority
- cross-department tradeoffs, for example slowing Marketing to protect
  Engineering stability

## Rollout Order

Recommended Company.OS department rollout:

1. Marketing / Growth / Content - current first wedge; high leverage, strong
   reporting value, publication remains gated.
2. Engineering / Coding - next critical lane; requires worktree hygiene,
   sandbox branch discipline, GitHub release reporting and daily engineering
   reports.
3. Website / Web Ops - depends on Engineering and Marketing; good bridge for
   SEO, landing pages, QA and deploy packets.
4. Operations / COO - scheduler, auth, queue, morning brief and hygiene
   ownership.
5. Product / CPO - specs, roadmap, UX, acceptance criteria and customer value
   gates.
6. Sales / BD and Customer Ops - external communication drafts and pipeline
   hygiene with strict send gates.
7. Finance, HR, Legal and Compliance - later because their trust boundaries are
   higher.

This order can change for a client installation, but the doctrine stays the
same: make the department explicit before making it autonomous.

## Installation Rule

A new Company.OS installation should not clone the founder's departments as
facts. It should clone the department operating pattern.

Client-specific onboarding must ask:

- which departments exist today
- who owns each department
- which department should be automated first
- what outputs matter
- which tools and repositories are in scope
- which HumanGates are non-negotiable
- what the daily report should answer
- who receives escalations

The system then materializes department-specific contracts, reports and memory
seeds from this doctrine.
