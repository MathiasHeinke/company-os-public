# Company.OS Marketing Department Pack v0.6.7

Status: draft-to-build operating pack
Use for: turning the [SOURCE_COMPANY] marketing pilot into a reusable Company.OS CMO
department before v0.7 autonomous ops
Plane parent: [WORK_ITEM_ID]
[SOURCE_COMPANY] execution parent: GROW-44
Last updated: 2026-05-21

## Decision

v0.6.7 is the Marketing Department Pack bridge between the v0.6
Marketing/Growth wedge and the v0.7 Autonomous Ops Loop.

The [SOURCE_COMPANY] Growth Engine already has working tool lanes in `[SOURCE_WORKSPACE]`.
Company.OS must now wrap those lanes in a company-shaped department:

```text
Founder intent / market signal
-> CEO/Codex portfolio decision
-> CMO department planning
-> bounded worker contracts
-> domain tools in [SOURCE_WORKSPACE]
-> CAO quality/evidence review
-> CEO scheduling/revision decision
-> analytics and learning loop
```

GROW stays the [SOURCE_COMPANY] execution project. COMPA owns the productizable operating
model, reusable templates, gates, reporting and department rhythm.

## Plane Shape

COMPA parent:

- [WORK_ITEM_ID]: Company.OS v0.6.7 - Marketing Department Pack / [SOURCE_COMPANY] Pilot Org

COMPA children:

- [WORK_ITEM_ID]: CMO Daily Planner and Assignment Desk
- [WORK_ITEM_ID]: Evidence and Topic Scout
- [WORK_ITEM_ID]: Content Lane Integration Pack
- [WORK_ITEM_ID]: Performance Analyst and Growth Learning Loop
- [WORK_ITEM_ID]: Reaction Radar and Reply Draft Desk
- [WORK_ITEM_ID]: Visual Director and Creative QA
- [WORK_ITEM_ID]: Claim Safety and Public Framing Gate
- [WORK_ITEM_ID]: Marketing Ops Bridge and Scheduler Cleanup
- [WORK_ITEM_ID]: Distribution Manager and Upload-Post Release Queue

GROW execution children already present:

- GROW-45: Daily Case File slides for X and LinkedIn
- GROW-46: Daily editorial image post
- GROW-47: Daily Blog Article / Blog Engine controller lane

## Department Roles

| Role | Seat | Output | First v0.6.7 artifact |
|---|---|---|---|
| CEO/Codex | CEO | portfolio decision, release card, final synthesis | COMPA parent review |
| CMO | role:cmo | marketing bar, positioning, usefulness, channel fit | department pack owner |
| CMO Daily Planner | role:cmo | daily assignments by lane/topic/evidence/platform | `atlas-marketing-daily-planner-worker-contract.md` |
| Evidence and Topic Scout | role:cmo | source-backed topic cards with numbers and caveats | `atlas-marketing-evidence-scout-worker-contract.md` |
| Case File Producer | role:cmo | X/LinkedIn slide decks | existing Case File contract |
| Editorial Image Post Producer | role:cmo | one-image X/LinkedIn article posts | existing image-post contract |
| Blog Article Controller | role:cmo | Blog Engine truth report and decision | existing blog contract |
| Distribution Manager | role:cmo | Upload-Post payloads, cadence, rollback/cancel notes | `atlas-marketing-distribution-manager-worker-contract.md` |
| Performance Analyst | role:cmo | daily/weekly learning report | `atlas-marketing-performance-analyst-worker-contract.md` |
| Reaction Radar / Reply Desk | role:cmo | scored reaction digest and draft-only replies | `atlas-marketing-reaction-radar-worker-contract.md` |
| Visual Director | role:cmo | visual brief, image QA, slide readability gate | `atlas-marketing-visual-director-worker-contract.md` |
| Claim Safety Editor | role:cmo | evidence class and public framing review | `atlas-marketing-claim-safety-worker-contract.md` |
| Marketing Ops Bridge | role:coo | hardening, scheduler, lane locks, event ledger | `atlas-marketing-ops-bridge-worker-contract.md` |
| CAO | role:cao | PASS/REJECT/PARK review | separate controller item |

## CMO Management Authority

The CMO is accountable for department performance, but does not own company
release authority.

The CMO may direct the Marketing Department inside the approved operating
boundary:

- choose daily topics from founder intent, analytics and backlog evidence
- assign existing role:cmo workers to Planner, Evidence, Production, Visual,
  Claim, Distribution, Performance and Reaction lanes
- request revisions, retries, narrowing or parking of department work
- propose improved worker contracts, prompts, checklists, scorecards and
  Raindrop-derived learning loops
- promote lessons into the next CMO recommendation when they do not lower gates
  or expand authority

The CMO must escalate to CEO/Codex before any management decision that changes
the department itself:

- adding, removing or renaming worker roles
- changing CapabilityProfiles, AllowedWritePaths, RuntimeAuth, scheduler/cron
  authority or recurring cadence
- changing HumanGate levels or attempting to downgrade a gate
- approving a new public channel, content format, release pattern or autonomous
  publishing lane
- turning a proposal-only Raindrop/CAO learning into a binding rule

CEO/Codex decides HG-2.5 release cards, HG-3 critical marketing operations and
department-structure changes. Chief-of-Staff / Founder-Proxy prepares HG-3.5
founder-facing packets. Founder decides HG-4 through the CEO + Chief-of-Staff
decision path. The CMO may prepare the evidence card and recommendation, but
cannot self-approve it.

## Current Lanes Versus Department Workers

The current [SOURCE_COMPANY] pilot has three production lanes:

1. Case File slides: high-density carousel, X up to four slides, LinkedIn full
   deck.
2. Editorial image post: one source-backed image plus platform-native copy.
3. Blog Article: CMS/Supabase Blog Engine state machine and morning-after audit.

Those are production workers, not the whole department. A functional CMO
department also needs:

- intake and assignment selection before production starts
- evidence scouting before claims become copy
- distribution control before schedule decisions
- performance feedback after posts go live
- reaction radar and reply drafts after the market responds
- visual QA and claim safety gates before release
- COO runtime hardening so cron jobs become tools, not truth

## Daily Operating Loop

1. Planner reads founder intent, performance analytics, paper/article backlog,
   GROW status and morning blockers.
2. Planner emits topic candidates with lane, platform, evidence class,
   expected user value and gate level.
3. Evidence Scout turns selected topics into topic cards with hard facts,
   source anchors, caveats and allowed framing.
4. Production lane creates the artifact: Case File, image post or Blog Engine
   report.
5. Copy-lint / claim-safety gate runs on public text before distribution:
   deterministic `REJECT` findings return to the producer; `WARN` and
   `REVIEW_REQUIRED` findings are carried into Claim Safety review.
6. Visual Director and Claim Safety review the artifact before distribution.
7. Distribution Manager creates or verifies Upload-Post payloads and cancel
   paths.
8. CAO reviews evidence, output quality, gates and public-risk boundaries.
9. CEO/Codex decides schedule, revise, park or kill.
10. Performance Analyst turns results into the next Planner input.
11. Reaction Radar watches responses and drafts replies without sending them.
12. CMO synthesizes the department state into the Command Center Morning
    Briefing singleton for CEO/Codex.
13. CMO escalates HG-2.5, HG-3, HG-3.5/HG-4 and department-structure decisions as explicit
    CEO decision cards instead of acting on them directly.

## Morning Briefing Reporting

The daily CMO report uses `docs/operations/cmo-morning-briefing.md` as source
of truth. It is written as a dated `morning.brief` comment on the Command Center
`Morning Briefing - Current` singleton. The brief reports outputs, blockers,
analytics, blog state, social state, pipeline, risks and CEO decisions. It does
not create a new daily Plane item, mark Done, publish externally, change cron
or write durable memory.

## Content Quality Bar

The department optimizes for save/share value, not internal product
explanation.

Every public artifact should answer:

- What does the reader learn in the first five seconds?
- Which concrete number, range, threshold, timeline, comparison or mechanism
  makes it worth saving?
- Which evidence class supports the statement?
- What is the caveat or boundary?
- What should the reader ask or inspect next?

Reject patterns:

- generic metaphors without numbers
- "context" labels without explaining the useful decision
- product explainers that do not stand alone as useful content
- generated visuals with no topic-specific scene
- unreadable axes, missing scale labels or decorative charts
- [SOURCE_COMPANY] Bio.OS in public [SOURCE_COMPANY] Bio.OS copy
- internal routing metadata in public posts

Deterministic enforcement for the text-checkable part lives in
`scripts/release-gates/marketing-copy-lint.mjs`. Image-only and semantic
judgment patterns remain Visual Director / Claim Safety review items; the gate
annotates them but does not pretend text regex can review an image.

## Evidence and Claim Doctrine

The CMO may use concrete scientific information when it is labeled precisely.

Allowed in drafts:

- source-backed values, ranges, effect sizes, sample sizes and time windows
- guideline or consensus facts
- human trial or observational findings with caveats
- preclinical mechanisms when clearly labeled
- community signal when clearly labeled as non-trial evidence

Blocked without CEO/Founder decision card:

- personal protocol advice
- sourcing, vendor or compounding guidance
- diagnosis or treatment instructions
- prescription, titration, cycle or self-injection instructions
- legal or regulated claims
- irreversible external actions outside a release card

The goal is not to make the content vague. The goal is to make useful facts
traceable and bounded.

## Reaction Job Policy

The old reaction jobs are not production workers:

- `cms-x-fast-watch-2min`: paused; keep paused until redesigned as Radar input.
- `cms-debunk-alert-dispatcher-2min`: paused; keep paused until thresholding
  exists.
- `cms-article-reaction-watch-10min`: currently noisy; convert to scored
  watcher.
- `cms-reaction-alert-dispatcher-10min`: currently noisy; convert to thresholded
  digest/alert.

The target pattern:

```text
watcher collects signal
-> scorer assigns priority and reason
-> dispatcher emits only thresholded digest/alert
-> reply desk drafts response
-> CEO/founder approves external reply until autonomy is proven
```

## v0.6.7 Completion Criteria

v0.6.7 can be called ready for v0.7 absorption when:

- [WORK_ITEM_ID] has all required child contracts and handoff docs.
- Each child template passes `worker-ledger-validator`.
- Stage 0.5 `contract-controller` can PASS the child intended for dispatch.
- GROW-45, GROW-46 and GROW-47 are mapped to the department model.
- No marketing result is summarized as autonomous success unless the hardened
  lane evidence exists.
- Upload-Post scheduling remains gated by release card, artifact truth, remote
  preflight and cancel path.
- Performance and Reaction Radar outputs feed Planner without writing durable
  memory directly.
- CAO remains separate from the worker that produced the artifact.

## Productization Rule

For a client install, replace [SOURCE_COMPANY]-specific paths with the client's marketing
workspace and keep the same operating split:

```text
Company.OS owns roles, Plane contracts, gates, reports and controller rhythm.
Domain workspace owns tools, source files, artifacts and platform adapters.
```
