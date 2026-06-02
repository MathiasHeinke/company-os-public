# Video-First Content Engine Pack Example

Date: 2026-05-27
Pack ID: video-first-content-engine
Status: scaffolded guided-pilot example

## Example Run

```bash
node scripts/content/video-first-content-engine-start.mjs \
  --root tmp/video-first-content-engine-test \
  --company "Example Company" \
  --approval-owner "Founder" \
  --write \
  --json
```

## Expected Outcome

- `content/video-engine/01_inbox_raw/` exists for the first raw video.
- `video-engine.config.json` records dry-run-only publisher mode.
- `RUNBOOK.md` explains HumanGate routing and stop rules.
- No upload, schedule, publish, send, spend, production write or secret read
  occurs.

## 10/10 Evaluation Required

This pack is not production-ready unless the Department Capability Pack
Evaluator returns `READY` and all worker contracts pass `worker-ledger-validator`.
