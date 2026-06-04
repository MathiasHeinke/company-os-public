# CMO Morning Briefing

Status: active operating doctrine
Use for: routing Marketing Department results into the CEO morning briefing
without creating a new Plane item every day
Last updated: 2026-05-21

## Decision

The Marketing Department reports to the CEO through a daily CMO morning
briefing. The briefing is a department report, not a task dump.

The CMO must explain what the department did, what changed in the market, what
is blocked, and what the CEO should decide next.

Canonical Plane sink:

```text
Project: Command Center (`CMD`)
Module/Page/Item: Morning Briefing
Singleton work item or page: Morning Briefing - Current
Write pattern: append one dated `morning.brief` comment per local day
```

Do not create a new Morning Briefing work item per day. New Plane items are only
created for concrete follow-up work that leaves the brief.

## Department Reporting Chain

```text
CMO department workers
-> CMO synthesis
-> Morning Briefing - Current
-> CEO/Codex portfolio decision
-> bounded Plane worker contracts
```

The CMO reports to CEO/Codex. The CMO does not mark Plane items Done, publish
externally, alter production cron, write durable memory, or lower HumanGate
levels. The CMO may prepare HG-3 marketing-risk packets; CEO/Codex decides
them. Strategic brand/company-position decisions move through Chief-of-Staff to
HG-4 Founder.

`HumanGate` is a legacy field name, not a synonym for "ask the founder". In the
Marketing Department, `HG-1` and `HG-2` are CMO-operable inside the approved
department envelope, `HG-2.5` and `HG-3` are CEO/Codex decisions, `HG-3.5` is
Chief-of-Staff / Founder-Proxy review, and the real human/founder decision
starts at `HG-4`.

## CMO Authority Boundary

The CMO is a department manager, not an autonomous CEO.

Within the Marketing Department, the CMO may:

- prioritize daily topics and lanes inside the approved strategy
- route work to existing role:cmo worker capabilities
- request revisions from department workers
- improve local prompts, checklists, rubrics and worker-contract drafts as
  proposal or bounded in-scope changes
- use Raindrop, CAO and performance evidence to recommend better contracts,
  gates and reporting shapes
- park, retry or narrow department work that remains inside HG-1/HG-2

The CMO must escalate to CEO/Codex before:

- any HG-2.5 action: release card, autonomous scheduling, import/apply,
  publishing, indexing, new cadence, new content format or newly hardened lane
- any HG-3 action: high-risk but reversible marketing operation such as
  production spend inside an approved envelope, reputation-risk draft handling,
  claim review, scheduler authority or channel operations that need CEO/Codex
  critical release
- any HG-4 action: strategic brand positioning, founder-voice commitment,
  non-restorable external action, major legal/capital exposure or true founder
  will
- changing department structure: adding/removing worker roles, changing
  CapabilityProfiles, changing HumanGate levels, altering scheduler/cron
  authority, changing the public release boundary, or changing the CMO charter
- committing a durable memory, doctrine or template change outside the
  contract's explicit write scope

The CMO must escalate to Chief-of-Staff / Founder-Proxy before an `HG-3.5`
artifact review. The Founder/human is only interrupted when the packet is
classified as `HG-4`.

Escalation format:

```yaml
cmo.escalation:
  version: cmo-escalation/v0
  reason: HG-2.5 | HG-3 | HG-3.5 | HG-4 | department-structure | policy | blocked-auth | blocked-budget
  recommended_decision: approve | revise | park | kill | split | ask-chief-of-staff | ask-founder
  evidence:
    - <Plane item/comment/report path/metric source>
  cmo_recommendation: <one concrete recommendation>
  ceo_action_required: <exact CEO/Codex decision>
```

If the gate level is ambiguous, the CMO chooses the higher gate and escalates.
The CMO may prepare the decision card; CEO/Codex owns the decision.

## Required Brief Sections

Every CMO morning brief includes:

1. **Executive status**: green/yellow/red by lane.
2. **Yesterday's outputs**: Case Files, editorial image posts, blog audits,
   research cards, visuals, distribution payloads and draft artifacts.
3. **Published / scheduled / parked**: external state separated from internal
   drafts.
4. **Blog state**: online, complete draft, failed/stuck, scheduler drift,
   billing/runtime blockers, GSC/index truth and review queue.
5. **Social state**: X, LinkedIn, Reddit or other channel observations,
   reactions, comments, reach, CTR and known data gaps.
6. **Performance learning**: what performed, what underperformed, and how
   confident that signal is.
7. **Pipeline**: what is draft-ready, what needs image/claim/visual review,
   what is waiting for distribution, what is dead.
8. **Risks and gates**: claim safety, regulated/public-risk boundaries, auth,
   budget, cron, publish and scheduler blockers.
9. **Artifact Truth**: current pipeline gate output, blocker count, warning
   count and cited report path for each active lane.
10. **Upload-Post release evidence**: live/scheduled state, approval kind,
    platforms, job count, release-card or standing-approval evidence, and
    whether CEO HG-2.5 evidence is still missing.
11. **Performance analytics evidence quality**: API/browser/manual source,
    known auth gaps, zero-vs-missing metrics, confidence level and data
    freshness.
    - LinkedIn Creator export evidence must distinguish aggregate/profile
      truth from post-level attribution. For German Creator XLSX exports, cite
      the parsed sheets `AUFFINDBARKEIT`, `ENGAGEMENT`, `Top-Beiträge`,
      `Follower innen` and `DEMOGRAFISCHE DATEN`; if the export exists but
      request_id matching fails, report `blocked_no_matches`, not success and
      not zero performance.
12. **CMO actions taken**: internal reroutes, revisions, parks or narrowed
   worker proposals that stayed inside CMO authority.
13. **CEO decisions requested**: schedule, review, fix operator, unblock auth,
   park, kill, dispatch next worker, approve HG-2.5/HG-3, route HG-3.5 or ask
   Founder for HG-4.
14. **Next dispatch recommendations**: no more than three bounded next actions.

## Blog Lane Rule

While Gemini/Vertex/Grok billing or runtime paths are blocked, the Blog
Department may use a local Claude/Codex production lane:

```text
Claude Code CLI -> evidence-backed EN/DE draft and editorial judgment
Codex CLI -> deterministic artifact/gate checks, import dry-run, controller
```

The local lane writes draft artifacts first. Supabase/import, publish and index
actions remain HG-2.5 release actions and must not be executed from the brief.

## Plane Comment Shape

Each morning comment starts with a parseable header:

```yaml
morning.brief:
  version: cmo-morning-brief/v0
  date: YYYY-MM-DD
  department: marketing
  reporter: role:cmo
  recipient: CEO
  source_projects:
    - GROW
    - COMPA
  publish_authority: none
  done_authority: none
```

The body may be Markdown, but every operational claim must cite a report path,
Plane work item, comment id, or metric source. If the source is unavailable, the
brief says `UNKNOWN`, not "probably".

## Runner

Canonical CLI:

```bash
node scripts/marketing/cmo-morning-briefing.mjs \
  --date YYYY-MM-DD \
  --company-root ${LOCAL_WORKSPACE} \
  --[SOURCE_WORKSPACE]-root ${LOCAL_WORKSPACE} \
  --write
```

To append the brief to the Plane singleton:

```bash
node scripts/marketing/cmo-morning-briefing.mjs \
  --date YYYY-MM-DD \
  --company-root ${LOCAL_WORKSPACE} \
  --[SOURCE_WORKSPACE]-root ${LOCAL_WORKSPACE} \
  --post-plane \
  --workspace companyos \
  --project-id a0289488-bae2-4403-8628-8ce842a0becc \
  --work-item-id 0e1a5732-5249-4d1e-9833-528e6c4a2339 \
  --auth app-token
```

The runner is idempotent per local date: if the singleton already has a
`morning.brief` comment for that date, it skips the Plane write instead of
creating a duplicate.

When the evidence reducer or doctrine changes and the same dated singleton
comment must be corrected, use `--update-existing` with `--post-plane`. The
runner patches the existing dated comment instead of creating a second daily
brief.

## Follow-Up Creation Rule

The morning brief may recommend follow-up work. It must not create broad
duplicate tasks.

Create or update a Plane item only when the follow-up has:

- one owning role label
- one workspace
- source of truth
- acceptance criteria
- gates
- HumanGate level
- reporting path
- blocked actions

Otherwise the recommendation remains in the current morning brief comment.

## Autonomy Boundary

Allowed:

- read Plane/report/metric artifacts
- append one dated morning brief comment to the singleton sink
- produce CEO decision recommendations
- link artifacts and report paths

Blocked:

- Plane Done transitions
- public publish, schedule, send or index
- production DB/Supabase cron changes
- spend or billing changes
- durable memory writes
- regulated medical/Rx/legal claims
- creating a new daily brief item per day
