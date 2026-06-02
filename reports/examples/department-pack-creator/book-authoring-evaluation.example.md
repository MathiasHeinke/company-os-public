# Book Authoring Evaluation Example

Status: placeholder until `company-os-department-pack-evaluator` writes the
timestamped report.

Run:

```bash
node scripts/orchestration/company-os-department-pack-evaluator.mjs \
  --pack-id book-authoring \
  --write \
  --json
```

Expected high-level result: READY or PASS_WITH_JUSTIFIED_GAP after all required
pack artifacts, capability profiles and gates are present.
