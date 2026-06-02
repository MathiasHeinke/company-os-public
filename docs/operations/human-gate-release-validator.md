# HumanGate Release Validator

Status: executable hardening gate

## Purpose

HG-1, HG-2, HG-2.5 and HG-3 releases are allowed only when the CEO/controller can
prove the decision is bounded, reversible, fresh, evidenced and inside the
approved action boundary. A `human_gate.released` event is not valid just
because an agent writes it.

## Command

```bash
node ${COMPANY_OS_ROOT}/scripts/release-gates/human-gate-release.mjs \
  validate \
  --decision-file /absolute/path/to/decision-card.md \
  --issue [WORK_ITEM_ID] \
  --run-id RUN_ID \
  --workspace-path "${COMPANY_OS_ROOT}" \
  --report ${COMPANY_OS_ROOT}/reports/night-shift/YYYY-MM-DD/hg-release.md \
  --json-report ${COMPANY_OS_ROOT}/reports/night-shift/YYYY-MM-DD/hg-release.json \
  --append-event \
  --require-today \
  --json
```

`--append-event` appends `human_gate.released` only when validation passes. If
validation blocks, no release event is written.

## Required Decision Card Shape

The decision file may be JSON or Markdown with a fenced JSON block:

```json
{
  "generated_at": "2026-05-08T10:00:00.000Z",
  "human_gate_release": {
    "level": "HG-3",
    "released_by": "Codex-GPT-5.5-xhigh",
    "release_authority": "CEO_CRITICAL",
    "founder_prediction_confidence": 0.97,
    "requested_actions": ["merge main", "deploy canary"],
    "blocked_actions_still_forbidden": ["schema/RLS/auth/service-role", "new spend", "regulated claim"],
    "rollback_path": "Revert the commit and redeploy the previous artifact.",
    "rollback_verification": { "status": "pass" },
    "blast_radius": { "level": "canary", "surface": "single project" },
    "cao_verdict": { "verdict": "PASS" }
  },
  "source_of_truth": ["/absolute/path/to/source.md"],
  "gates": [
    { "id": "warm-preflight", "status": "pass", "evidence_path": "/absolute/path/to/preflight.md" }
  ],
  "artifact_truth": [
    { "pipeline": "editorial", "status": "passed", "ok": true, "date": "2026-05-08", "report_path": "/absolute/path/to/artifact-truth.md" }
  ],
  "budget": { "status": "pass", "estimated_usd": 0.04, "limit_usd": 0.25 }
}
```

## Hard Rules

- HG-1 requires `founder_prediction_confidence >= 0.80`.
- HG-2 requires `founder_prediction_confidence >= 0.85`.
- HG-2.5 requires `founder_prediction_confidence >= 0.92`.
- HG-3 requires `founder_prediction_confidence >= 0.96`.
- HG-2.5 may include merge, push, deploy, bounded production write, bounded
  public publish or execution-ledger Done when `release_authority`,
  `cao_verdict`, `rollback_verification`, `blast_radius`, gates, Artifact Truth
  and budget all pass.
- HG-3 may include reversible critical release actions when
  `release_authority: CEO_CRITICAL`, CAO/controller PASS, rollback/restore
  evidence, gates, Artifact Truth and budget all pass.
- HG-1/HG-2 requested actions must not include merge, push, deploy, release,
  production write, schema/RLS/auth/service-role, new spend, public regulated
  claims, autonomy increase, durable memory write, Linear Done or live
  publishing.
- HG-2.5 still cannot include schema/RLS/auth/service-role, material spend,
  pricing, regulated claims, autonomy increase, durable private-memory write or
  live outreach in the founder's name.
- HG-3 still cannot include strategic direction, public founder-voice launch,
  material spend, legal/medical/financial claims, non-restorable deletion or
  autonomy promotion to L4/L5.
- Every executable gate needs a passing status and evidence path.
- Artifact Truth must pass and, when `--require-today` is used, match today's
  Europe/Berlin date.
- Budget must pass with known estimated cost and explicit limit.
- Decision cards must be fresh and must not contain secrets or private context.

## Event Ledger Enforcement

`scripts/agent-events/agent-event-core.mjs` now validates `human_gate.released`
payloads:

- HG-1/HG-2/HG-2.5 require passing `payload.release_validation`.
- Confidence must meet the level threshold.
- `blocked_actions_still_forbidden` must be present.
- HG-3 release events must be released by `CEO`, `Codex-GPT-5.5-xhigh`,
  `delegated-controller`, `Founder` or `human` with passing validation,
  `CEO_CRITICAL` authority and rollback/restore evidence.
- HG-3.5 release events must be released by `Chief-of-Staff`,
  `Founder-Proxy`, `Founder` or `human`.
- HG-4 release events must be released by `Founder` or `human`.

This makes accidental or worker-forged release events fail validation.
