# ATLAS Marketing Department Runtime

Status: active pilot doctrine
Use for: routing ATLAS growth, blog, social and Case File production through
Company.OS instead of standalone cron jobs
Last updated: 2026-05-21

## Decision

The existing ATLAS marketing scripts in `[SOURCE_WORKSPACE]` are the domain tool
layer. They stay there. Company.OS owns the execution ledger, C-level routing,
worker contracts, gates, controller decisions and reporting.

That means the target system is:

```text
Founder intent / performance signal
-> CEO/Codex intake
-> Plane work item with role:cmo
-> CMO worker contract
-> [SOURCE_WORKSPACE] marketing tools
-> eval / artifact truth / CAO
-> Plane worker.reported
-> CEO brief / next dispatch
```

The cron jobs are allowed to remain as hardened execution lanes while the Plane
dispatcher migration finishes, but they must be treated as tools under this
runtime, not as the source of truth.

## Company.OS v0.6.7 Department Pack

The reusable Company.OS department model lives in
`docs/orchestration/company-os-marketing-department-pack-v067.md`.

COMPA is the productizable operating-system layer:

```text
[WORK_ITEM_ID]: Company.OS v0.6.7 - Marketing Department Pack / ATLAS Pilot Org
  [WORK_ITEM_ID]: CMO Daily Planner and Assignment Desk
  [WORK_ITEM_ID]: Evidence and Topic Scout
  [WORK_ITEM_ID]: Content Lane Integration Pack
  [WORK_ITEM_ID]: Performance Analyst and Growth Learning Loop
  [WORK_ITEM_ID]: Reaction Radar and Reply Draft Desk
  [WORK_ITEM_ID]: Visual Director and Creative QA
  [WORK_ITEM_ID]: Claim Safety and Public Framing Gate
  [WORK_ITEM_ID]: Marketing Ops Bridge and Scheduler Cleanup
  [WORK_ITEM_ID]: Distribution Manager and Upload-Post Release Queue
```

GROW remains the ATLAS execution layer:

```text
GROW-44: ATLAS Marketing Department Runtime
  GROW-45: Daily Case File
  GROW-46: Daily Editorial Image Post
  GROW-47: Daily Blog Article
```

This split is deliberate: COMPA owns the department pattern, worker contracts,
controller gates and productization. GROW owns ATLAS-specific daily outputs.

## Ledger Boundary

Plane is canonical for:

- what the marketing department is trying to accomplish
- which C-level seat owns the work
- which worker is allowed to run
- which sources, gates and HumanGate level apply
- whether the output is PASS, NEEDS_HUMAN, REJECT or blocked

`[SOURCE_WORKSPACE]` is canonical for:

- content pipeline code
- generated marketing artifacts
- visual prompts and rendered assets
- local distribution calendars and Upload-Post payloads
- analytics snapshots used by the next CMO decision

Linear is not used for new marketing execution. It remains a legacy bridge only.

## Plane Mapping

Default project: Atlas Growth Engine (`GROW`)

Default label: `role:cmo`

Recommended hierarchy:

```text
GROW parent:
  ATLAS Marketing Department Runtime

GROW children:
  Daily Case File - YYYY-MM-DD - <topic>
  Daily Editorial Image Post - YYYY-MM-DD - <topic>
  Blog Engine - YYYY-MM-DD - <topic>
  Performance Analytics - YYYY-MM-DD
  Campaign Burst - <campaign>
```

Each dispatchable child must include one flat fenced worker contract using
`docs/templates/worker-issue-contract.md`. See
`docs/templates/atlas-marketing-case-file-worker-contract.md`,
`docs/templates/atlas-marketing-editorial-image-post-worker-contract.md` and
`docs/templates/atlas-blog-article-worker-contract.md` for the three daily
content lanes. Department-pack support workers use:

- `docs/templates/atlas-marketing-daily-planner-worker-contract.md`
- `docs/templates/atlas-marketing-evidence-scout-worker-contract.md`
- `docs/templates/atlas-marketing-distribution-manager-worker-contract.md`
- `docs/templates/atlas-marketing-performance-analyst-worker-contract.md`
- `docs/templates/atlas-marketing-reaction-radar-worker-contract.md`
- `docs/templates/atlas-marketing-visual-director-worker-contract.md`
- `docs/templates/atlas-marketing-claim-safety-worker-contract.md`
- `docs/templates/atlas-marketing-ops-bridge-worker-contract.md`

## Daily Content Lanes

| Lane | Output | Tool layer | Plane contract |
|---|---|---|---|
| Case File Slides | X up to four slides, LinkedIn full slide set | `marketing:case-files`, image gate, eval, Upload-Post dry-run | `atlas-marketing-case-file-worker-contract.md` |
| Editorial Image Post | Article-style X/LinkedIn post with one image | daily editorial pipeline, image generation, eval, Upload-Post dry-run | `atlas-marketing-editorial-image-post-worker-contract.md` |
| Blog Article | Blog Engine truth/report and gated publish/index decision | CMS/Supabase Blog Engine plus morning-after audit | `atlas-blog-article-worker-contract.md` |

When Gemini/Vertex/Grok paths are blocked, the Blog Article production lane may
temporarily run as a local Claude/Codex draft lane using
`docs/templates/atlas-blog-article-claude-codex-worker-contract.md`: Claude
produces source-backed EN/DE article drafts and Codex runs deterministic
artifact, import-dry-run and controller gates. Supabase import, publish and
index remain separate HG-2.5 release actions.

The first two lanes write local marketing artifacts. The Blog Article lane is a
controller/gate lane for the existing CMS state machine; it must not pretend a
fresh article is online unless the audit evidence proves that state.

## Support Lanes

| Lane | Output | Plane contract |
|---|---|---|
| Daily Planner | topic assignment board and lane selection | `atlas-marketing-daily-planner-worker-contract.md` |
| Evidence Scout | source-backed topic cards | `atlas-marketing-evidence-scout-worker-contract.md` |
| Distribution Manager | Upload-Post payload verification and cancel path | `atlas-marketing-distribution-manager-worker-contract.md` |
| Performance Analyst | daily/weekly learning report | `atlas-marketing-performance-analyst-worker-contract.md` |
| Reaction Radar | scored reaction digest and draft-only replies | `atlas-marketing-reaction-radar-worker-contract.md` |
| Visual Director | image/slide QA verdict | `atlas-marketing-visual-director-worker-contract.md` |
| Claim Safety | public framing verdict | `atlas-marketing-claim-safety-worker-contract.md` |
| Ops Bridge | hardening and scheduler bridge | `atlas-marketing-ops-bridge-worker-contract.md` |

## Public Fetch Fallback

When Upload-Post or platform APIs return missing LinkedIn/X/Reddit post-level
metrics, the Performance Analyst and Reaction Radar may use the bounded public
fetch doctrine in `docs/operations/marketing-public-fetch-fallback.md`.

This is a read-only evidence lane. It may fetch public URLs and recover visible
public reactions, comments, share/repost labels or page text, but it must not
use browser cookies, creator dashboards, replies, likes, deletes, schedules or
publish actions. TinyFish/Claude public-fetch results are partial evidence; they
must be labeled as public-visible partial metrics and missing values remain
unknown blockers, not zero performance.

## Roles

Founder:

- sets high-level intent, risk appetite and topics that need founder judgment
- approves HG-4 strategic public medical/Rx/protocol, legal, spend or reputation-risk
  decisions
- does not approve routine in-scope reads, drafts, local renders or reports

CEO/Codex:

- turns founder intent and analytics into bounded CMO work
- decides whether a CMO child is ready for dispatch
- reads worker.reported, CAO verdicts and analytics before scheduling the next
  run
- owns HG-2.5 release cards, HG-3 critical-release cards, department-structure decisions and escalation
  triage from the CMO
- never treats an unhardened cron success as autonomous department success

CMO:

- owns positioning, public usefulness, evidence class, copy, visual utility and
  platform fit
- directs existing role:cmo workers inside the approved department boundary
- may improve prompts, local checklists, rubrics and contract drafts when the
  change stays inside declared write scope and does not lower gates
- escalates HG-2.5, HG-3, HG-3.5/HG-4 and department-structure decisions to CEO/Codex
- must optimize for save/share value, not internal system explanation
- must separate guideline fact, study-arm fact, editorial interpretation and
  personal action
- must not self-approve release cards, new recurring cadences, new public
  formats, CapabilityProfile changes or lowered HumanGate levels

CAO:

- audits output quality, gates, evidence and public-risk boundaries
- builds nothing and does not mark Plane Done

COO/Scheduler:

- owns hard-cron-wrapper usage, lane locks, warm preflight, Budget Brake,
  redacted output capture and exit-code gates
- may run routine in-scope commands after the contract is approved

## Daily Case File Flow

1. Intake chooses one high-utility topic from founder intent, performance
   analytics, paper watch, blog backlog or Plane backlog.
2. CMO worker builds a source table and labels evidence class: guideline,
   human study, observational, case report, community signal or preclinical.
3. CMO worker writes one Case File deck under the latest daily editorial run.
4. Visual brief must name the concrete scene, model system, text-safe zone,
   forbidden imagery and generic-background guard before image generation.
5. Image generation creates a no-text cover image only. Public text and data
   stay deterministic in rendered slides.
6. Case File rendering blocks banned framing, qualitative pseudo-quant bars,
   generic covers and missing visual briefs.
7. Distribution planner creates X and LinkedIn Upload-Post payloads. X receives
   up to four image slides; LinkedIn receives the full deck as images.
8. Eval, artifact truth and remote Upload-Post preflight must pass before any
   live schedule action.
9. Worker posts exactly one `worker.reported` with artifacts, commands, gate
   results, blockers, reflection and learning proposals.
10. CAO and CEO/Codex decide whether to schedule, park, kill or request a
    revised dispatch.

## Required Runtime Gates

Minimum local gates for a daily Case File worker:

```bash
cd ${LOCAL_WORKSPACE}
npm run marketing:finalize -- --date YYYY-MM-DD --refresh-visuals
npm run marketing:images -- --date YYYY-MM-DD --provider codex --quality high --size 1024x1536
npm run marketing:case-files -- --date YYYY-MM-DD
npm run marketing:plan -- --date YYYY-MM-DD --days 14 --cadence growth
npm run marketing:eval -- --date YYYY-MM-DD
npm run marketing:schedule -- --date YYYY-MM-DD --remote-preflight
git diff --check
```

If any command fails, the worker reports `state: NEEDS_HUMAN` or `state:
RUNTIME_ERROR` and includes the local report path. The scheduler must not treat
missing fresh artifacts as success.

## Human Gates

HG-1:

- read-only analytics
- local draft generation
- local renders
- dry-run distribution payloads
- routine Plane comments

HG-2:

- CEO/Codex approves a bounded CMO dispatch or revision request
- CMO may schedule only when a prior release card covers that exact lane and
  the run remains inside the approved claim and platform boundary

HG-2.5:

- required before autonomous push-mode scheduling through Upload-Post for a new
  content format, new cadence or newly hardened lane
- requires CAO PASS, rollback/cancel path, fresh artifact truth, Budget Brake
  and hard-cron-wrapper evidence
- CMO may prepare the release recommendation, but CEO/Codex owns the release
  decision

HG-3 / HG-4:

- CEO/Codex HG-3 required for high-risk but reversible/restorable marketing
  operations, spend inside a declared envelope, claim-review work, scheduler
  authority or reputation-risk handling.
- Founder HG-4 required for strategic positioning, non-restorable external
  action, founder-voice public commitment, major legal/capital exposure or
  true founder judgment.
- CMO routes HG-3/HG-4 through CEO/Codex as a decision card; CMO does not ask
  the founder directly and does not proceed while waiting.

Department-structure changes:

- adding/removing workers, changing CapabilityProfiles, scheduler authority,
  RuntimeAuth, public channels, recurring cadence, HumanGate level or release
  boundary requires CEO/Codex approval even when the work looks operational

## Worker Report Shape

Every CMO worker run ends in one Plane comment:

```yaml
worker.reported:
  version: marketing-cmo-worker-v0
  state: PASS | NEEDS_HUMAN | REJECT | RUNTIME_ERROR | BLOCKED_AUTH
  project: GROW
  role: role:cmo
  workspace: ${LOCAL_WORKSPACE}
  date: YYYY-MM-DD
  topic: <topic>
  artifacts:
    - /absolute/path/to/case-file-carousel.json
    - /absolute/path/to/carousel/slide-01.png
    - /absolute/path/to/upload-post-submissions.json
  scheduled:
    x: true|false
    linkedin: true|false
    upload_post_job_ids: []
  gates:
    - name: marketing:case-files
      state: PASS
  blockers: []
  reflection: <what improved or failed>
  learning_proposals:
    - <proposal-only SOP/skill/gate improvement>
  subagents: []
```

## Productization Rule

This runtime is a Company.OS department pattern, not an ATLAS-only hack:

- domain repo owns tools and artifacts
- Company.OS owns contract, gates, reporting and controller rhythm
- the C-level owner is explicit via `role:*`
- the worker report is structured enough for CAO, CEO and the morning brief
- public publishing stays gated by a release card and human gates

For a client install, replace ATLAS-specific source paths with the client's
marketing workspace, keep the same CMO contract shape, and preserve the
artifact/eval/reporting boundaries.

## Migration Notes

Current local cron jobs may continue only as hardened lanes while the Plane
dispatcher path catches up. Any overnight or scheduled marketing result that
bypasses hard-cron-wrapper or does not attach to a `role:cmo` work item must be
reported as `UNHARDENED-RUN` or `RUNTIME-HARDENING-BYPASS-BLOCKED`, not as
autonomous department success.
