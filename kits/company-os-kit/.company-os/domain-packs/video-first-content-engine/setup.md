# Video-First Content Engine Setup

Status: installable guided-pilot runbook

## Setup Loop

1. Confirm company, offer, audience, channels and approval owner.
2. Record off-limits claims, private data classes and HumanGate owner.
3. Choose a local target root for the video engine.
4. Run the start command with `--write`.
5. Drop one test video into `content/video-engine/01_inbox_raw/`.
6. Keep publishing, scheduling and uploading disabled until a release card
   authorizes a publisher adapter.
7. Run quality and capability-pack evaluator gates before promotion.
8. Use the generated reports and scorecards as CEO/Codex review inputs.

## Start Command

```bash
node scripts/content/video-first-content-engine-start.mjs \
  --root ${CLIENT_ROOT} \
  --company "Example Company" \
  --approval-owner "Founder" \
  --write \
  --json
```

## Folder Contract

```text
content/video-engine/
  01_inbox_raw/        raw operator drops only
  02_processing/       normalized working copies and transcripts
  03_review_required/  HG-3/HG-4 or blocked packages
  04_publish_ready/    reviewed dry-run packages only
  05_clips/            clip plans and optional local clips
  06_reports/          scorecards, risk reports and learning proposals
  07_archive/          archived local packages
```

## Default Boundary

Draft-only and dry-run only. No public upload, post, schedule, send, spend,
publisher API write, production write, secret read or Done transition.
