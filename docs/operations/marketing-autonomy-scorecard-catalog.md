# Marketing Autonomy Scorecard Catalog

Status: canonical v0.1 evaluation catalog
Created: 2026-05-23
Use for: scoring [SOURCE_COMPANY]/Company.OS Marketing Department autonomy, quality and
human-gate readiness across social, performance and blog-engine lanes

## Purpose

This catalog fixes the scoring frame before a CMO executive evaluates the
Marketing Department. The CMO may improve workers, prompts, contracts and
department-local process inside the approved authority boundary, but the CMO
must not silently move the scoring goalposts.

The score answers two separate questions:

1. How good is the work product compared with a strong human marketing team?
2. How autonomous is the operating loop without hiding release, safety or
   analytics blockers?

The target is not to claim "100% autonomous marketing" early. The target is to
make the autonomy gap visible, then close it with evidence.

## Authority Boundary

Marketing autonomy is evaluated under the Company.OS human-gate model:

- HG-1/HG-2: CMO and department workers may operate inside approved contracts.
- HG-2.5: CEO/Codex decides bounded public publish, upload, schedule, send,
  import and release-card actions.
- HG-3: CEO/Codex decides critical company-internal changes, production-risk
  operations and capability expansion when reversible and backed by rollback.
- HG-3.5: Chief of Staff / Founder-Proxy prepares founder-facing decision
  packets and translates CEO reports into operator language.
- HG-4: Founder decides strategic direction, non-restorable data loss, major
  brand/legal/capital commitments and any material company-positioning shift.

The CMO can direct the Marketing Department and improve department-local work,
but must escalate any HG-2.5 or higher decision with evidence and a
recommendation.

## Scoring Scale

Every category is scored from 1 to 10.

| Score | Meaning |
|---:|---|
| 1-2 | Broken or mostly manual; cannot be trusted for the lane. |
| 3-4 | Useful pilot; works in narrow cases but needs close CEO supervision. |
| 5-6 | Operational beta; repeatable with visible blockers and bounded autonomy. |
| 7-8 | Strong operating lane; CMO can run it regularly with CEO gate decisions. |
| 9 | Near-human senior operator quality; only release/strategy gates remain. |
| 10 | Better than a strong human process on speed, traceability and consistency. |

The CMO must report both the numeric score and the evidence grade:

- `FACT`: proven by file, Plane comment, run log, API/browser evidence or gate.
- `INFERENCE`: supported by evidence but not directly proven.
- `HYPOTHESIS`: plausible, but still needs a controlled run or external signal.

## Fixed Categories

| # | Category | What A 10 Requires |
|---:|---|---|
| 1 | Plane Ledger And Worker Contracts | Every recurring lane has a parseable Plane contract, correct role label, source of truth, gates, human gate, reporting and no hidden manual side channel. |
| 2 | CMO Executive Autonomy | The CMO executive reads department state, supervises workers, repairs department-local drift, escalates only real decisions and writes one CEO-ready report. |
| 3 | Research And Evidence Quality | Topics, claims and article inputs are source-backed, current, useful, caveated and linked to audience value rather than generic trend chasing. |
| 4 | Content And Copy Quality | X, LinkedIn, Reddit and blog copy matches [SOURCE_COMPANY] voice, has clear operator usefulness, avoids hype, fits channel norms and needs minimal human rewrite. |
| 5 | Blog Engine Depth And SEO | EN/DE articles have parity, strong structure, titles/meta, internal links, tables, source lists, claim boundaries, import dry-run proof and article review queue coverage. |
| 6 | Visual And Creative QA | Images, carousels and blog visuals are generated from recorded prompts, readable on mobile, on-brand, channel-fit, claim-safe and reviewed through HG-2.5 vision gates. |
| 7 | Claim Safety And Public Risk Control | Health, medical, partnership, performance, legal and founder-voice claims are classified, evidence-checked and blocked before public release when needed. |
| 8 | Distribution And Release Control | Upload-Post, publish calendars, release cards, cancel paths, schedule state and rollback evidence are accurate; no publish/schedule action bypasses HG-2.5. |
| 9 | Analytics And Learning Loop | Each post/article maps to copy, image, prompt/source artifact, URL, metrics, trust source, blocker status and planner learning; false API zeroes are never treated as performance truth. |
| 10 | Controller, Raindrop And Improvement Loop | CAO/controller verdicts, Raindrop prompt-result evaluations, worker reflection and learning proposals become concrete contract, prompt or scheduler improvements. |

## Overall Score

The overall score is the rounded average of the ten categories, but the
reported autonomy ceiling is capped by the weakest gate-critical category:

- If category 7 or 8 is below 7, public release autonomy cannot exceed HG-2.5
  gated.
- If category 9 is below 7, performance-driven optimization cannot exceed
  planner input with confidence flags.
- If category 2 is below 7, CEO/Codex is still doing C-Level mechanical work.
- If any category is below 5, the department is still an operational beta, not
  an autonomous loop.

## Worked Example

If a CMO audit scores the ten categories at:

```text
8, 7, 8, 8, 5, 6, 8, 7, 4, 6
```

the arithmetic average is `6.7`. That does not mean "almost autonomous." The
reported ceiling is still `HG-2.5-gated` because:

- Category 9 is `4`, so performance-driven optimization may only feed planner
  input with confidence flags.
- Category 6 is `6`, so visual release remains under HG-2.5 review.
- Category 5 is `5`, so Blog Engine publish/import/index actions remain
  release-card gated.

The correct CEO summary is:

```text
Operational beta. Strong traceability and content discipline. Not autonomous
until analytics trust, visual release control and Blog Engine publish/import
proof all score at least 7.
```

## Required CMO Executive Output

A CMO executive autonomy audit must produce:

```yaml
marketing.autonomy.scorecard:
  version: marketing-autonomy-scorecard-v0.1
  date: YYYY-MM-DD
  evaluator: role:cmo
  parent_work_item: COMPA-###
  lanes_scored:
    - social
    - blog_engine
    - performance
    - distribution
  scores:
    - category: Plane Ledger And Worker Contracts
      score: 0
      evidence_grade: FACT | INFERENCE | HYPOTHESIS
      evidence:
        - /absolute/path/or/Plane-comment-id
      blocker:
      next_action:
  overall_score: 0.0
  human_comparison:
    current: worse_than_human | comparable | better_on_traceability | better_overall
    rationale:
  autonomy_ceiling:
    current: L1 | L2 | HG-2.5-gated | HG-3-ceo-controlled | HG-4-founder-required
    reason:
  escalations_to_ceo:
    - human_gate: HG-2.5 | HG-3 | HG-3.5 | HG-4
      decision_needed:
      recommendation:
  next_worker_contracts:
    - title:
      role:
      reason:
```

## Non-Negotiables

- Missing analytics are blockers, not zero performance.
- Good copy does not compensate for missing release control.
- Fast generation does not count as autonomy unless evidence, gates and
  learning loop are attached.
- CMO may improve the department; CEO/Codex approves HG-2.5/HG-3 changes.
- Founder/HG-4 is only for strategic or non-restorable decisions.
