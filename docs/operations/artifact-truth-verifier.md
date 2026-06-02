# Artifact Truth Verifier

Status: active control-plane harness

## Purpose

Automation reports must not be accepted as truth by themselves. The Artifact
Truth Verifier checks filesystem artifacts, machine-readable reports and media
paths before a controller, morning brief or scheduler may claim that work is
`passed`, `generated`, `fixed` or `scheduled`.

This is an L1/L2 control-plane harness. It is read-only by default.

## Command

```bash
node ${COMPANY_OS_ROOT}/scripts/artifact-truth/verify-artifact-truth.mjs \
  --workspace-root "${SITE_PROJECT_ROOT}" \
  --pipeline editorial \
  --date YYYY-MM-DD \
  --stages manifest,source,final,images,eval,scheduler,provenance,freshness \
  --scheduler-mode any \
  --require-today \
  --max-artifact-age-hours 36 \
  --output ${COMPANY_OS_ROOT}/reports/artifact-truth/YYYY-MM-DD/editorial.md \
  --json-output ${COMPANY_OS_ROOT}/reports/artifact-truth/YYYY-MM-DD/editorial.json
```

Product/Knowledge uses:

```bash
node ${COMPANY_OS_ROOT}/scripts/artifact-truth/verify-artifact-truth.mjs \
  --workspace-root "${SITE_PROJECT_ROOT}" \
  --pipeline product \
  --date YYYY-MM-DD \
  --stages manifest,source,final,images,scheduler,provenance,freshness \
  --scheduler-mode any
```

## Stages

| Stage | Checks |
|---|---|
| `manifest` | Dated manifest exists, date matches, run folder matches, item list exists. |
| `source` | Source paths from manifest exist and are non-empty. |
| `final` | Final public files exist and are non-empty. |
| `images` | `image.png` exists and is non-empty for every item. |
| `eval` | Editorial eval report exists, passed, `ok_to_schedule: true`, piece/image counts match manifest. |
| `scheduler` | Upload-Post dry-run/scheduled report exists, date matches, rows exist, scheduled rows have job IDs, media paths exist. |
| `provenance` | Each manifest item has source/provenance signals and source artifacts contain traceable source text. |
| `freshness` | Optional require-today and max-age checks prevent stale artifacts from passing as current. |

## Rules

- A report with blockers means the lane is blocked, even if another report says
  success.
- Morning brief must include the latest artifact-truth status for editorial and
  product lanes.
- Upload-Post live scheduling must not run until the pre-live verifier passes
  for `manifest,source,final,images,eval` on editorial or
  `manifest,source,final,images` on product.
- After any scheduler run, run the verifier again with `scheduler` included and
  store the markdown/JSON report under Company.OS reports.
- For night jobs and morning briefs, use `--require-today` unless the source of
  truth explicitly permits previous-day carryover.
- Use `--max-artifact-age-hours` for unattended jobs so old manifests cannot be
  mistaken for fresh output.
- The verifier is evidence, not approval. It does not bypass HumanGate for live
  publishing, public claims, merge, deploy, production writes, durable memory
  writes or Linear Done.

## Current Known Boundaries

- It verifies local filesystem truth, not remote Upload-Post truth.
- It checks media existence and scheduled job IDs, not remote duplicate state.
- Provenance checks prove traceability exists; they do not independently judge
  claim correctness. Eval, quality gates and controller review remain separate.
- It does not judge copy quality; eval and quality gates remain separate.
