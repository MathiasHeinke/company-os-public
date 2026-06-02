# ATLAS HG-3 Production Release Packet

Status: executable release-packet doctrine
Date: 2026-05-24
Parent: `docs/governance/ceo-release-authority.md`

## Purpose

ATLAS desktop MVP work may reach `HG-3` when the requested action is a critical
but reversible production or private-beta release decision. At HG-3, Codex/CEO
may approve production only when the evidence packet passes the HumanGate
release validator with `release_authority: CEO_CRITICAL`.

If Codex/CEO sees unresolved ambiguity, the correct output is not release. It
is `CEO_CRITICAL_HOLD` plus an EVE / Chief-of-Staff `HG-3.5` packet.

## When HG-3 Is Allowed

HG-3 can release:

- reversible private beta deploys
- bounded production configuration promotion
- reversible migrations with named restore evidence
- critical release work with CAO/controller PASS
- release actions with rollback, blast radius, Artifact Truth and budget proof

HG-3 must route to HG-4 instead when the request includes:

- strategic direction or mission change
- public launch or founder-voice outreach
- material spend, legal commitment or pricing change
- regulated medical, legal or financial claim
- non-restorable deletion or irreversible data loss
- autonomy promotion to L4/L5

## Required Packet

The decision file may be JSON or fenced JSON in Markdown.

```json
{
  "generated_at": "2026-05-24T10:00:00.000Z",
  "human_gate_release": {
    "level": "HG-3",
    "released_by": "Codex-GPT-5.5-xhigh",
    "release_authority": "CEO_CRITICAL",
    "founder_prediction_confidence": 0.97,
    "requested_actions": [],
    "blocked_actions_still_forbidden": [],
    "rollback_path": "",
    "rollback_verification": { "status": "pass" },
    "blast_radius": { "level": "staged" },
    "cao_verdict": { "verdict": "PASS" }
  },
  "source_of_truth": [],
  "gates": [],
  "artifact_truth": [],
  "budget": { "status": "pass", "estimated_usd": 0, "limit_usd": 1 }
}
```

Sample packet:

```text
reports/examples/human-gate-release/atlas-hg3-release-packet.example.json
```

## Validator

Evergreen sample validation:

```bash
node scripts/release-gates/human-gate-release.mjs \
  validate \
  --decision-file reports/examples/human-gate-release/atlas-hg3-release-packet.example.json \
  --max-age-minutes 1000000 \
  --json
```

Real ATLAS release validation should be stricter:

```bash
node scripts/release-gates/human-gate-release.mjs \
  validate \
  --decision-file /absolute/path/to/atlas-hg3-release-packet.json \
  --issue ATLAS-XXX \
  --run-id RUN_ID \
  --workspace-path "${COMPANY_OS_ROOT}" \
  --report "${COMPANY_OS_ROOT}/reports/releases/YYYY-MM-DD/atlas-hg3-release-validation.md" \
  --json-report "${COMPANY_OS_ROOT}/reports/releases/YYYY-MM-DD/atlas-hg3-release-validation.json" \
  --append-event \
  --require-today \
  --json
```

`--append-event` may be used only after validation passes. A blocked validation
must create an HG-3.5 packet or an HG-4 Founder dossier, not a release event.

## Event Ledger Output

A valid HG-3 release event must include:

- `event_type: human_gate.released`
- `payload.level: HG-3`
- `payload.release_authority: CEO_CRITICAL`
- `payload.released_by: Codex-GPT-5.5-xhigh` or another allowed CEO owner
- `payload.release_validation.status: pass`
- `payload.release_validation.blocker_count: 0`
- `payload.blocked_actions_still_forbidden`

The Command Center read model surfaces this as `ceo_critical_releases`.

## Hold Path

When the CEO/Codex decision is not clean enough:

1. Emit or record `CEO_CRITICAL_HOLD`.
2. Write an EVE / HG-3.5 packet with challenge questions, assumptions and
   consequences.
3. Keep `simulated: true` until EVE is live.
4. Do not resume, deploy, mark Done or escalate to Founder unless HG-3.5 or
   HG-4 evidence explicitly authorizes that next step.

Source of truth for the hold packet:

```text
docs/operations/eve-chief-of-staff-hg35-review.md
```

## Acceptance Bar

An ATLAS HG-3 release can be treated as production-eligible only when:

- validator status is `pass`
- blocker count is `0`
- CAO/controller verdict is PASS
- rollback evidence is named and verified
- Artifact Truth is current for the release date
- budget is known and within limit
- Command Center shows the release in `ceo_critical_releases`
- no HG-4 trigger is present
