# Founder Daily Queue

Status: executable v0 read-only artifact generator
Phase: HG-4 sign-before-dispatch and HG-3.5 sign-to-resume cross-section
Use for: collapsing all pending founder attention into one daily artifact
Marker: no-token-shaped-output

## Purpose

The Founder Daily Queue compresses every Plane work item that still needs
a founder decision into one Markdown artifact at
`reports/runs/{YYYY-MM-DD}/founder-queue.md`. The founder opens the file
once per day, signs or rejects via paste-back templates, and that is the
full daily review loop.

The generator is **read-only**: it never posts a Plane comment, never
transitions state, never marks Done, and never pings the founder. The
sign and reject templates live in the artifact; the founder pastes them
manually until the write-capable Relay v1 ships.

The artifact is deterministic. Two consecutive runs against the same
Plane state produce byte-identical output. This is the property that
makes it auditable.

## Admission Rules

A Plane work item appears on the queue when:

- `human_gate: HG-4` AND no `controller.decision (codex-controller-v0)`
  comment has been posted yet. The founder gate is still blocking
  dispatch.
- `human_gate: HG-3.5` AND the latest CAO `controller.verdict (cao-v0)`
  is `PARK`, AND the latest `worker.reported` is `state: NEEDS_HUMAN`
  with `reason: hg35-pause-pending` and `hg35.awaiting_sign: true`. The
  worker is paused mid-run and the Chief-of-Staff / Founder-Proxy needs to
  review the pause artifact and sign to resume.

Items not in the cross-section are ignored. HG-0 / HG-1 / HG-2 / HG-2.5 /
HG-3 items never appear here. HG-3 belongs to CEO/Codex critical release;
only a failed or held HG-3 packet routes onward to HG-3.5 or HG-4.

## Caps And Budget

Per `docs/governance/human-gate-levels.md`:

- Founder or founder-proxy budget per item: ≤ 5 minutes.
- Founder / Chief-of-Staff daily budget across HG-4 + HG-3.5: ≤ 20 minutes.

The queue enforces this by capping the primary section at 10 items. The
next batch (up to a tracked total of 50) goes to a `Next Up` section with
an explicit overflow warning. Anything beyond 50 is dropped with a
warning row.

Sort order is stable:

1. HG-4 (dispatch-blocked or review-required) before HG-3.5 (awaiting-resume).
2. Oldest `updated_at` first within each kind.
3. Sequence id as the final tiebreaker.

## CLI

```bash
node scripts/orchestration/founder-daily-queue.mjs \
  --workspace companyos \
  --project-id <uuid or default COMPA anchor> \
  --output reports/runs/2026-05-13/founder-queue.md \
  --date 2026-05-13 \
  --json
```

Flags:

| Flag | Required | Meaning |
|---|---|---|
| `--workspace` | yes | Plane workspace slug. |
| `--project-id` | no | Plane project UUID. Defaults to the COMPA anchor. Override with `PLANE_PROJECT_ID` env. |
| `--output` | yes | Absolute path to write the Markdown artifact. The directory is created if missing. |
| `--date` | no | Override the artifact date header (defaults to today UTC). |
| `--auth` | no | `app-token` (default) or `api-key`. Mirrors `scripts/plane/plane-auth.mjs`. |
| `--json` | no | Print a structured summary to stdout instead of a plain string. |

The CLI fails closed when Plane auth or required flags are missing. It
never POSTs to Plane and has no `--mode post` switch.

## Artifact Shape

Header:

```text
# Founder Daily Queue - YYYY-MM-DD

generated_by: founder-daily-queue/v0
workspace: companyos
marker: no-token-shaped-output
```

When the queue is empty, the artifact contains a single `## Inbox Zero`
section with the daily budget consumed (0 of ≤ 20 minutes) and no
warnings.

When the queue has items, each item is rendered as:

```markdown
### [WORK_ITEM_ID] - Founder Daily Queue Generator

- kind: HG-3.5-awaiting-resume
- role: role:coo
- human_gate: HG-3.5
- ask: Review pause artifact and sign to resume
- pause_artifact: reports/runs/2026-05-13/artifact.md
- updated_at: 2026-05-13T08:00:00Z

**Sign template (paste into Plane to approve):**

```yaml
controller.founder-proxy-sign:
  verdict: APPROVE
  sign_comment_id: <plane comment id>
  signed_at: <ISO-8601>
```

**Reject template (paste into Plane to send back to the building seat):**

```yaml
controller.founder-proxy-sign:
  verdict: REJECT
  reason: <short founder reason>
  signed_at: <ISO-8601>
```
```

HG-4 items use `founder.sign:` templates that carry the work item
sequence. HG-3.5 items use the canonical
`controller.founder-proxy-sign:` block defined in
`docs/governance/human-gate-levels.md`.

## Determinism

The model builder takes already-fetched Plane records and produces a
sorted, capped, redacted output. The renderer never reads the clock and
never sees the random number generator. The same Plane snapshot on two
consecutive runs produces byte-identical Markdown.

The CLI captures the date in two places: `--date` (CLI override) and the
artifact header (only). Plane `updated_at` timestamps are passed through
unchanged so the founder can verify how stale each ask is.

## Redaction

All text imported from Plane comments and item titles is run through a
token-shape scrubber before it reaches the artifact. Patterns covered:

- `sk_live_*`, `sk_test_*`, `sk-*` (Stripe / OpenAI style).
- `ghp_*`, `gho_*`, `ghu_*`, `ghs_*`, `ghr_*` (GitHub PAT prefixes).
- `xoxb-*`, `xoxa-*`, `xoxp-*`, `xoxr-*`, `xoxs-*` (Slack).
- `Bearer ...` (Authorization headers).
- JWT-shaped strings (`eyJ...`. ...).
- Long hex (40+ chars) and long base64 blobs (60+ chars).

Matched strings collapse to `<redacted>` and the marker
`no-token-shaped-output` is written into both the artifact header and
this document.

## Non-Goals

- No Plane comment POST. The founder pastes templates manually until
  Relay v1 ships.
- No state transitions. The queue never moves an item out of its current
  Plane state.
- No founder web UI. The artifact is plain Markdown on disk.
- No cross-workspace queue. One workspace per run.
- No automatic re-run on item-change. The founder runs the CLI or a
  scheduler invokes it on cron; the queue itself does not poll.
- No founder ping. Notification belongs to a future relay.

## Round-Trip Contract

The sign and reject templates emitted by the queue are designed to be
parsed by the future Relay v1 write-capable layer. Until that ships,
two pure parsers live next to the renderer for tests:

- `parseFounderProxySign(text)` extracts `{ verdict, sign_comment_id,
  signed_at, reason? }` from an HG-3.5 sign or reject paste.
- `parseHg3FounderSign(text)` is the legacy parser name for the current HG-4
  founder sign shape; it extracts `{ work_item, verdict, signed_at, reason? }`
  from an HG-4 sign or reject paste.

The test suite asserts that every emitted template round-trips through
its parser, so a future Relay v1 implementation can rely on the shape.

## Failure Modes

- **Plane auth missing.** CLI exits with code 2 and a structured error.
  No partial artifact is written.
- **Plane API error.** CLI exits with code 1 and the HTTP status. No
  partial artifact is written.
- **Malformed Plane comment.** The item is skipped, recorded in
  `model.malformed`, and a warning row appears in the artifact.

## Source Of Truth

- `docs/governance/human-gate-levels.md`
- `reports/audits/2026-05-11/agent-relay-pipeline-drafts.md`
- `scripts/orchestration/founder-daily-queue-core.mjs`
- `scripts/orchestration/founder-daily-queue.mjs`
- `scripts/orchestration/cao-pass.mjs` (HG-3.5 PARK detection mirror)
- `scripts/orchestration/codex-controller-dryrun.mjs` (canonical
  HG-3.5 templates)
