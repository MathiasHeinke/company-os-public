# ATLAS Marketing Performance Memory

Status: active learning ledger
Use for: reusable, evidence-backed marketing learnings that should influence
future ATLAS Bio.OS content planning, Performance Analyst reports and CMO
briefings.

This file is a durable operating-memory surface, not a task list. Plane tracks
execution. Reports and source artifacts provide evidence. Honcho stores the
cross-session recall.

## 2026-05-22 - LinkedIn Brain-Health Wearable Proof Point

### Evidence

- Post / artifact title: `The next brain-health wearable will predict less
  than it implies.`
- Platform copy title: `The wearable brain-health category is coming.`
- Local source folder:
  `${LOCAL_WORKSPACE}`
- LinkedIn Upload-Post request:
  `ares-2026-05-17-03-brain-health-wearables-prediction-limit-linkedin`
- Upload-Post job id: `82b7e4ec89d243fc821434ced76b6bd4`
- Public LinkedIn URL:
  `https://www.linkedin.com/feed/update/urn:li:share:7462819472974962688/`
- Plane Growth item: `GROW-50`
- Scheduled time: `2026-05-20T13:00:00`
- Primary science source:
  `https://www.nature.com/articles/s41746-026-02340-y`
- DOI: `10.1038/s41746-026-02340-y`
- Screenshot evidence:
  `${LOCAL_WORKSPACE} 2026-05-22 um 12.51.24.png`

Observed from the screenshot at 2026-05-22:

| Metric | Value |
|---|---:|
| Impressions | 2,169 |
| Reactions / likes | 33 |
| Comments | 3 |
| Reposts / shares | 3 |

The founder described this as the first clear LinkedIn proof that the current
ATLAS/ARES editorial-image pattern can work: it is shareworthy, science-backed,
has a clear message and gives readers a concrete caveat instead of product
hype.

Analytics caveat: Upload-Post currently returns the public LinkedIn URL for
this request, but not reliable metrics. The post-level endpoint returns
`Could not fetch LinkedIn post metrics. The token may need reconnection.` and
LinkedIn profile snapshots are all zero. Until repaired, the screenshot is the
trusted metric source and Upload-Post LinkedIn metrics must be treated as
unavailable, not as zero performance.

### Why It Worked

This post did not explain ATLAS as software first. It gave the reader a useful
mental model first:

```text
Prediction is not explanation.
Explanation is not diagnosis.
Diagnosis is not a consumer-content hook.
```

The post then mapped that evidence boundary into the ATLAS product philosophy:
signal, context, trajectory and course correction without pretending to be a
doctor.

The visual supported the claim instead of decorating it. It showed signal,
prediction, context, uncertainty and drift, with the explicit boundary `Not
diagnosis`.

### Reusable Pattern

Future high-priority LinkedIn posts should prefer this shape:

1. Start with a sharp category thesis or anti-hype warning.
2. Anchor the claim in one credible primary source, number, DOI or named
   institution.
3. State what the evidence does not allow.
4. Translate the evidence into a practical reader/operator implication.
5. Tie ATLAS to the principle only after the reader value is clear.
6. Use the visual to make the caveat operational: evidence, caveat, product
   take, uncertainty, boundary, or decision point.

### What To Avoid

- Product-first copy before the reader learns anything.
- Generic "AI for health" positioning without a falsifiable caveat.
- Treating prediction as diagnosis, causality or individual medical advice.
- Decorative visuals that do not show the mechanism, caveat or boundary.
- Optimizing from platform-level aggregates when a screenshot/manual post-level
  signal is the only reliable evidence.

### Planning Implications

- CMO Planner: prioritize more posts where a fresh paper exposes a coming hype
  wave and ATLAS can own the responsible interpretation layer.
- Evidence Scout: look for primary-source papers with a concrete number,
  cohort, method or DOI plus a clear overclaim risk.
- Claim Safety: preserve the blocked-claim section before copy is approved.
- Visual Director: keep the three-part visual contract visible: evidence,
  caveat, ATLAS take.
- Performance Analyst: treat screenshot/manual post-level evidence as usable
  but explicitly source-limited until LinkedIn API metrics are reliable.
- Upload-Post Analytics: distinguish `HTTP 200 with empty platform metrics` and
  LinkedIn token errors from real zero performance.
- Reaction Radar: when a post crosses meaningful comment/share thresholds,
  draft reply options but do not send without approval.

## 2026-05-22 - Product/Knowledge Micro Release Candidate

### Evidence

- Release card:
  `reports/marketing-department-v067/product-knowledge-micro-release-card-2026-05-22.md`
- ARES Website PR:
  `MathiasHeinke/[SOURCE_WORKSPACE]#185`
- Merge commit:
  `61633a19 feat(marketing): scope upload-post scheduler by entry id (#185)`
- Release artifact merge:
  `e57af5ed chore(marketing): record product micro-release schedule (#186)`
- Candidate item:
  `01-calibration-before-personalization`
- Include ids:
  `01-calibration-before-personalization-x_article`,
  `01-calibration-before-personalization-linkedin`

### Learning

The current best controlled reaction-test candidate is the calibration-before-
personalization pair from the 2026-05-22 Product/Knowledge lane. It translates
the LinkedIn proof-point pattern into product philosophy: useful systems earn
personalization through baseline, time window, signal noise, assumption and
uncertainty.

Scheduler capability is now sufficient for bounded release testing because
Upload-Post can be called against explicit entry ids instead of a full
calendar. The first bounded HG-2.5 execution scheduled the calibration pair as
review-calendar jobs:

- X: `2026-05-23T12:30:00`, Upload-Post job
  `3ae8d8e8dc514433a14b3116894766f4`.
- LinkedIn: `2026-05-23T16:30:00`, Upload-Post job
  `065a197fa5ae4d3680da153c20cf93b9`.

Future live scheduling remains HG-2.5 and must keep `--include-id` plus
`--remote-preflight --live --allow-live`.

## 2026-05-23 - Daily Post Metrics Harvester Proof

### Evidence

- Worker report:
  `reports/marketing-department-v067/daily-post-metrics-harvester-2026-05-23.md`
- Morning Brief:
  `reports/marketing/morning-briefs/2026-05-23/cmo-morning-brief.md`
- Plane Growth item: `GROW-51`
- Plane worker.reported comment:
  `20825ac2-5b06-47a9-98dc-1d9c36e04117`
- ARES clean evidence base:
  `e57af5ed chore(marketing): record product micro-release schedule (#186)`

### Observed Signal

The post metrics harvester is executable from a clean `[SOURCE_WORKSPACE]`
`origin/main` worktree and produced 67 target rows:

| Platform | Trusted | Total |
|---|---:|---:|
| Reddit | 6 | 6 |
| LinkedIn | 0 | 31 |
| X | 0 | 30 |

Trusted automated signal is currently Reddit-only and weak: public JSON rows
show score=1, likes=1 and comments=1 for each trusted Reddit target.

### Learning

This is an operations learning, not a creative winner signal:

- Missing platform metrics are blockers, not zero-performance.
- LinkedIn remains manual/browser-snapshot backed until a CEO-approved
  read-only browser profile is declared and tested.
- X remains blocked until bearer/auth and post URL attribution are repaired.
- Reddit public JSON can support presence/availability checks, but score=1 rows
  are not strong enough for creative strategy.

Performance Analyst and CMO Planner may use this run to verify that the metrics
lane works, but must not use it to choose LinkedIn or X winners. The current
best creative learning remains the 2026-05-22 manual LinkedIn brain-health
proof point.

## 2026-05-23 - Product/Knowledge Micro-Release Metrics

### Evidence

- Report:
  `reports/marketing-department-v067/product-micro-release-metrics-2026-05-23.md`
- ARES Website evidence branch:
  `${LOCAL_WORKSPACE}`
- Branch: `codex/linkedin-public-snapshot-fallback`
- Plane Growth item: `GROW-50`
- Plane comment:
  `6fd2e5dd-b084-4843-8781-44afe08c04fd`
- Micro-release X job: `3ae8d8e8dc514433a14b3116894766f4`
- Micro-release LinkedIn job: `065a197fa5ae4d3680da153c20cf93b9`

### Observed Signal

| Target | Signal |
|---|---|
| X calibration-before-personalization | public URL present; trusted Upload-Post-forwarded metrics: impressions=1, likes=0, reposts=0 |
| LinkedIn calibration-before-personalization | public URL present; LinkedIn API metrics unavailable; public fetch reached HTTP 200 but saw no visible reaction/comment counts |
| LinkedIn brain-health proof point | public fetch recovered visible public engagement: reactions=61, comments=5 |

The forced 14-day post-metrics harvester run produced 67 target rows with 37
trusted rows: X 30/30, Reddit 6/6, LinkedIn 1/31. X and Reddit now have usable
automated post-level signals; LinkedIn remains mostly blocked, but public fetch
can recover limited public engagement where visible.

### Learning

Claude/TinyFish-style public fetch should become a daily fallback lane after
Upload-Post analytics and before the harvester. It is useful for public
LinkedIn reactions/comments, but it does not replace LinkedIn impressions,
shares, creator analytics or screenshot evidence. Missing LinkedIn API metrics
remain blockers, not zero performance.

This fallback is now governed by
`docs/operations/marketing-public-fetch-fallback.md`: TinyFish/Claude public
fetch is allowed only as a bounded read-only CMO capability, requires OAuth
auth preflight, uses no browser cookies or account dashboards and must label
results as partial public evidence.

The Brain-Health proof point strengthened from the 2026-05-22 screenshot state
of 33 reactions / 3 comments to public-visible 61 reactions / 5 comments on
2026-05-23. The reusable creative lesson stays the same and gains confidence:
lead with a useful evidence boundary, make the caveat operational, then connect
ATLAS to the responsible interpretation layer.

## 2026-05-23 - LinkedIn Creator Export Pull Lane

### Evidence

- ARES Website PR:
  `https://github.com/MathiasHeinke/[SOURCE_WORKSPACE]/pull/193`
- ARES commit: `bdae27ec`
- ARES merge commit: `d156f85c`
- Company.OS report:
  `reports/marketing-department-v067/linkedin-creator-export-pull-2026-05-23.md`
- Runner:
  `npm run marketing:linkedin-pull -- --date YYYY-MM-DD --profile mheinke_founder --open --watch-downloads --timeout-minutes 5 --run-post-metrics`
- Output report:
  `marketing/performance/linkedin/YYYY-MM-DD_linkedin-performance.md`
- Raw archive:
  `marketing/performance/linkedin/_raw/YYYY-MM-DD/`

### Learning

Public fetch is useful for visible post text, dates and sometimes public
reaction/comment counts. It is not Creator Analytics. The real two-pass run in
ARES PR #192 proved the limit: 31/31 LinkedIn targets stayed blocked for
creator counters even after TinyFish/public fetch.

The pragmatic lane is therefore assisted export:

1. CMO Morning Brief surfaces `marketing:linkedin-pull -- --run-post-metrics`
   as the operator action when trusted LinkedIn rows are missing.
2. LinkedIn Creator Analytics opens in Mathias' normal authenticated browser at
   the German/current content analytics URL:
   `https://www.linkedin.com/analytics/creator/content/#:~:text=Zielgruppe-,Exportieren,-Vergangene%207%20Tage`
3. Mathias clicks `Exportieren` and saves the XLSX/CSV into `~/Downloads`.
4. The runner parses, archives and cross-joins the official export to
   Upload-Post request ids and posting timestamps.
5. The harvester consumes `linkedin_creator_export` snapshots as higher-trust
   evidence than public-fetch blockers.

This is a serious improvement, but it is not full autonomy. Marketing may use
the exported CSV to update Performance Memory after the first real import, but
it must not claim LinkedIn creative winners from public fetch alone or before
the CSV has been matched.

## 2026-05-24 - German LinkedIn Creator XLSX Sheet Layout

### Evidence

- Official export archive:
  `${LOCAL_WORKSPACE}`
- Parsed digest:
  `${LOCAL_WORKSPACE}`
- Updated parser branch:
  `${LOCAL_WORKSPACE}`

### Learning

The German LinkedIn Creator export is not a flat CSV-style table. It is a
multi-sheet XLSX workbook:

- `AUFFINDBARKEIT`: aggregate impressions and reached members.
- `ENGAGEMENT`: daily impressions and interactions.
- `Top-Beiträge`: two side-by-side tables; left side ranks interactions,
  right side ranks impressions.
- `Follower innen`: total followers and daily new followers.
- `DEMOGRAFISCHE DATEN`: audience job titles, locations, industries, seniority,
  company size and companies.

Performance workers must parse all sheets before making a CMO recommendation.
`Top-Beiträge` URL-level data is trusted as Creator Analytics evidence, but it
is not automatically post-level attribution unless the URL or request id can be
matched to Upload-Post/local publishing artifacts. If matching is absent, the
correct status is `blocked_no_matches`; aggregate LinkedIn state can still be
reported, but creative-winner claims stay gated.

## 2026-05-24 - Current Channel Role Split

### Evidence

- Official LinkedIn Creator export:
  `${LOCAL_WORKSPACE}`
- LinkedIn parser report:
  `${LOCAL_WORKSPACE}`
- Prior metrics proof:
  `reports/marketing-department-v067/daily-post-metrics-harvester-2026-05-23.md`

### Decision

For current ATLAS/ARES marketing work, LinkedIn is the primary channel for
qualified founder, executive and operator market signal. The 2026-04-27 to
2026-05-24 Creator export shows 7,243 impressions, 3,642 reached members,
9,545 followers, 99 new followers and strong audience fit across Founder, CEO,
Business Owner, consulting, IT services, Munich and Berlin segments. The top
Creator row reached 4,280 impressions and 120 interactions.

This is a channel-role decision, not a fully attributed post-level performance
decision. Until LinkedIn activity URLs can be mapped back to Upload-Post request
ids, Performance Analyst and CMO Briefing should use LinkedIn for aggregate
market traction, audience fit and category resonance, but keep exact
creative-winner claims gated.

Current channel roles:

| Channel | Role | Current Interpretation |
|---|---|---|
| LinkedIn | Primary qualified signal | Best evidence for founder/operator/executive resonance and audience quality. |
| X | Fast instrumentation | Useful because automated post-level rows are now reliable, but weak engagement does not yet prove demand. |
| Reddit | Research and objection mining | Useful for presence checks, language, objections and topic discovery; not yet a distribution winner. |
| Blog/SEO | Durable capture | Best treated as long-term authority and search compounding, not same-day market signal. |

### Planning Implications

- CMO Planner should bias high-conviction science/product category theses
  toward LinkedIn first.
- Performance Analyst should report LinkedIn aggregate and audience truth even
  when `blocked_no_matches` prevents post-level attribution.
- X should remain the quick test lane for instrumentation and copy variants,
  but not override LinkedIn audience evidence until engagement improves.
- Reddit should feed insight and objection language back into LinkedIn/blog
  strategy instead of being treated as the main growth channel.

## 2026-05-24 - LinkedIn Signal-to-Capitalization Policy

### Decision

LinkedIn should not become a hard-sell channel. The current advantage is trust:
useful, evidence-backed posts that make a serious founder/operator audience
smarter. The commercial move is to attach a low-friction help offer only after
the post has delivered standalone value.

Default CTA posture:

```text
Give the reader the useful frame first.
Then make the help offer small, specific and optional.
Do not turn every post into a pitch.
```

### CTA Ladder

| Stage | When To Use | CTA Shape |
|---|---|---|
| Soft presence | Most posts | No direct pitch; one quiet line that ARES/ATLAS works on this problem. |
| Diagnostic offer | Posts with strong evidence boundary or operator pain | "If you are trying to evaluate this in your own team/product, happy to compare notes." |
| Concrete help | Posts crossing meaningful signal thresholds | "We help teams turn this kind of signal into a practical decision/review system. DM me if useful." |
| Product lane | Repeated topic traction or inbound | Link to a focused page, brief, diagnostic, waitlist or founder call. |

### Signal Threshold

Escalate from soft presence to diagnostic/concrete help when at least one of
these is true:

- Creator export shows unusually strong impressions or interactions for the
  topic versus the current baseline.
- Qualified comments, DMs or profile visits come from founders, operators,
  executives, product leaders, clinicians or relevant technical buyers.
- The same theme repeats across multiple posts, public comments, private
  replies or sales conversations.
- The post explains a problem ARES/ATLAS can credibly help solve now, not just
  a future category thesis.

### Approved CTA Patterns

Use CTAs that sound like founder-to-founder help, not campaign copy:

```text
If you're trying to separate signal from noise in your own health/product data,
happy to compare notes.
```

```text
This is the kind of evidence boundary we are building ATLAS around. If your
team is wrestling with a similar decision layer, feel free to DM me.
```

```text
If useful, I can share the checklist we use to decide whether a signal is ready
for productization or still just an interesting metric.
```

Avoid generic CTAs such as `book a demo`, `learn more`, `check us out`, or
`contact sales` until there is a real product page or diagnostic offer behind
them.

### Planning Implications

- CMO Planner should draft one optional CTA variant for high-signal LinkedIn
  posts, but keep it removable during review.
- Performance Analyst should flag posts that deserve CTA escalation, not only
  posts that performed well.
- CEO review should decide when a theme graduates from thought leadership into
  an explicit offer, diagnostic, waitlist or founder-call lane.
- Blog/SEO follow-ups should capture the best LinkedIn themes with a clearer
  product/help path than the original post.
