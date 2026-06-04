# Marketing HG-2.5 Vision Release Gate

Status: canonical release-gate doctrine
Created: 2026-05-21
Use for: CEO/Codex HG-2.5 decisions on marketing publish, upload, post and
schedule actions that carry visual artifacts

## Purpose

Marketing HG-2.5 is not a text-only approval. If a release action will put a
visual asset into Upload-Post, LinkedIn, X, Reddit, a blog, a deck or a public
website, the CEO release surface must include the visual artifact itself.

The release owner must be able to see the thing that will ship.

This gate exists because the Distribution Manager found live scheduled
Upload-Post jobs. The jobs have valid IDs, media paths and local artifact truth,
but CEO/Codex cannot safely approve, backfill or cancel marketing jobs from
metadata alone.

## Rule

Any marketing HG-2.5 release card that includes `publish`, `post`, `schedule`,
`upload`, `send`, `import` or `public-release` must include a visual review
bundle when media is present or expected.

The bundle must include:

- platform and channel
- scheduled time and timezone
- request id and remote job id, if already scheduled
- public copy or an excerpt with a path to the full body
- every media path, resolved to an absolute local path
- image validity result: exists, readable, type, dimensions and byte size
- at least one rendered preview path or local image reference the reviewer can
  open
- claim-safety status
- cancel or rollback path
- `visual_review.verdict`
- `creative_quality_review.verdict`
- media-reuse warnings when the same image hash spans distinct request ids or
  topics
- a per-run output path; canonical packet paths must not be overwritten by a
  normal rerun

The default verdict is `PENDING`. A job with `PENDING` visual review is not
approved for final external publication. If the job is already scheduled into
Upload-Post as a review-calendar job, the settlement decision must classify it
as one of:

```text
APPROVE_REVIEW_CALENDAR
BACKFILL_WITH_VISUAL_REVIEW
CANCEL_OR_HOLD
```

## Required YAML Block

Every marketing HG-2.5 release packet must expose this block:

```yaml
marketing.hg25.vision_release:
  version: marketing-hg25-vision-v0
  release_surface: upload-post | linkedin | x | blog | website | deck | mixed
  parent_work_item: COMPA-###
  source_schedule:
    - /absolute/path/to/scheduled-jobs.json
  jobs_total: 0
  jobs_requiring_visual_review: 0
  visual_review:
    required: true
    verdict: PENDING | PASS | NEEDS_REVISION | BLOCK
    reviewer: CEO/Codex | Chief-of-Staff | Founder | vision-model
    evidence:
      - /absolute/path/to/image-or-preview.png
  creative_quality_review:
    required: true
    verdict: PENDING | PASS | NEEDS_REVISION | BLOCK
    dimensions:
      - brand_fit
      - copy_quality
      - visual_quality
      - claim_safety
      - channel_fit
  settlement_recommendation: APPROVE_REVIEW_CALENDAR | BACKFILL_WITH_VISUAL_REVIEW | CANCEL_OR_HOLD
  cancel_path:
    available: true | false
    instructions: <short text>
  signed_at: <ISO-8601>
```

## Creative Quality Review

Vision access is necessary but not enough. A marketing reviewer must judge
whether the artifact should represent the company in public.

The additive text gate is:

```bash
node scripts/release-gates/marketing-copy-lint.mjs \
  --text-file /absolute/path/to/public-copy.txt \
  --payload /absolute/path/to/copy-claim-payload.json \
  --artifact-id <request-or-artifact-id> \
  --json
```

It performs no publish, schedule, send, import, Plane Done, network or
production action. It catches deterministic public-copy blockers (`[SOURCE_COMPANY] Bio.OS`
brand drift, internal routing metadata, hard claim-safety terms) and annotates
WARN / REVIEW_REQUIRED findings for CMO Claim Safety review. It does not
replace visual review and does not approve claims.

Every job in the packet needs a per-job creative-quality verdict:

```yaml
creative_quality_review:
  verdict: PASS | NEEDS_REVISION | BLOCK
  dimensions:
    brand_fit: PASS | NEEDS_REVISION | BLOCK
    copy_quality: PASS | NEEDS_REVISION | BLOCK
    visual_quality: PASS | NEEDS_REVISION | BLOCK
    claim_safety: PASS | NEEDS_REVISION | BLOCK
    channel_fit: PASS | NEEDS_REVISION | BLOCK
  notes:
    - <short concrete observation>
```

Review dimensions:

- `brand_fit`: matches the established [SOURCE_COMPANY] / Company.OS voice, positioning
  and audience expectation.
- `copy_quality`: clear, platform-appropriate, no obvious typo, grammar,
  truncation or wrong-language issue.
- `visual_quality`: readable at mobile size, correct aspect ratio, no broken
  layout, cropping, low contrast or artifacting.
- `claim_safety`: no unsupported medical, partnership, performance, legal or
  founder-voice claim.
- `channel_fit`: suitable for the declared platform, schedule and content lane.

`NEEDS_REVISION` means the CMO can route the item back to the department for a
bounded fix. `BLOCK` means the CMO must hold or cancel the job and report the
reason to CEO/Codex. Strategic positioning shifts, founder-voice commitments or
regulated claims escalate beyond CMO authority.

## Pass Bar

HG-2.5 can approve only when all of these are true:

- artifact truth is green for the source pipeline
- every referenced image exists and is readable
- every image has non-zero dimensions and plausible byte size
- carousel/media ordering is explicit
- public copy is English-first where the lane requires it
- claim-safety is not blocked
- the preview or image reference was reviewed, not merely listed
- creative quality is `PASS` across brand fit, copy quality, visual quality,
  claim safety and channel fit
- rollback/cancel path is named
- the release card says exactly what is being approved

If any visual artifact is missing, stale, unreadable or not actually reviewed,
the release card must return `NEEDS_REVISION` or `BLOCK`.

If the artifact is technically valid but off-brand, visually weak, wrong for
the audience, typo-prone, in the wrong language or unsafe as a public claim, the
release card must also return `NEEDS_REVISION` or `BLOCK`.

## Runtime Guardrails

The local gate runner is:

```bash
node scripts/release-gates/marketing-hg25-vision.mjs \
  --workspace-root /absolute/path/to/[SOURCE_WORKSPACE] \
  --schedule /absolute/path/to/scheduled-jobs.json \
  --output /absolute/path/to/vision-release-packet.md \
  --run-id <controller-or-dispatch-run-id> \
  --json
```

Runtime invariants:

- same-day future Upload-Post jobs are included by default; only jobs older
  than `now` are filtered unless `--include-past` is passed
- identical media hashes across distinct `request_id` topics emit
  `media_reuse` warnings and a `Media Reuse Across Topics` section
- per-run output filenames are the default; the canonical output path is
  preserved unless an operator explicitly passes
  `--allow-canonical-overwrite`
- the runner performs no network, publish, schedule, send, cancel, Plane Done,
  git or production action

## Authority Boundary

This gate equips HG-2.5 with eyes. It does not grant more authority.

Allowed under HG-2.5:

- approve a bounded review-calendar schedule
- backfill visual review evidence for already scheduled review-calendar jobs
- cancel or hold review-calendar jobs when the cancel path exists
- approve a low/medium blast-radius public marketing release when CAO,
  artifact truth and visual review are green

Still escalates:

- founder-voice public commitments -> HG-4
- regulated health/medical treatment claims -> HG-4 unless explicitly
  downgraded by doctrine and legal/claim gate
- irreversible external sends without cancel path -> HG-4
- budget, legal, contractual or brand-position shifts -> HG-4

## C-Level Ownership

The CMO executive prepares the visual release packet and settlement
recommendation. CEO/Codex signs or rejects HG-2.5. CAO verifies structure and
evidence. Raindrop evaluates prompt -> result -> outcome quality after the
decision.

CEO/Codex should not manually inspect raw directories for every job once the
CMO executive runtime is live. The department executive must compile the
packet, surface the images and ask only for the bounded release decision.
