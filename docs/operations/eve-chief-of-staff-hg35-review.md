# EVE Chief-of-Staff HG-3.5 Review

Status: read-only surface contract
Date: 2026-05-24
Parent: `docs/releases/0.7-entry-plan.md`

## Purpose

`HG-3.5` is the Chief-of-Staff / Founder-Proxy review tier. In the Command EVE
architecture, EVE owns this surface after the v0.7 runtime exists.

Until EVE is live, Codex/CEO may simulate HG-3.5 only by writing a clearly
marked, source-linked decision packet. The simulated packet may challenge,
compress and recommend. It may not release, resume, mark Done, deploy or act
as the Founder.

## Inputs

An HG-3.5 packet may be created only from artifact-backed evidence:

- original worker report
- CAO/controller verdict
- HumanGate event row
- HumanGate release validator report, if the issue was an HG-3 hold
- rollback and blast-radius evidence
- Artifact Truth report
- Raindrop trace or prompt-result summary, when available

The packet must not read Plane directly, raw prompts, raw model output, private
memory, cookies, browser storage, `.env` files or production systems.

## Packet Shape

```json
{
  "schema_version": "eve-hg35-decision-packet/v0",
  "simulated": true,
  "runtime": "codex-ceo-simulated-chief-of-staff",
  "originating_gate": "HG-3",
  "target_gate": "HG-3.5",
  "decision_mode": "CEO_CRITICAL_HOLD",
  "issue_id": "[WORK_ITEM_ID]",
  "run_id": "run_example_904",
  "source_events": [],
  "cao_controller_evidence": [],
  "worker_report_evidence": [],
  "challenge_questions": [],
  "assumptions": [],
  "consequences": {
    "if_go": "",
    "if_no_go": "",
    "if_wrong": ""
  },
  "recommendation": {
    "verdict": "hold | return_to_ceo_release | escalate_to_hg4",
    "next_action": ""
  },
  "blocked_actions": []
}
```

Canonical sample:

```text
reports/examples/command-center-read-model/hg35-eve-packet.json
```

## Decision Modes

`CEO_CRITICAL_RELEASE`: HG-3 was validated and released by Codex/CEO. The
Command Center shows this in `ceo_critical_releases`; EVE does not need to act.

`CEO_CRITICAL_HOLD`: Codex/CEO found unresolved ambiguity or risk. The Command
Center shows a simulated EVE packet in `eve_hg35_packets`.

`HG-3.5-PENDING-ARTIFACT-REVIEW`: A worker or CAO parked a declared HG-3.5
pause artifact. Chief-of-Staff / EVE must sign or reject before resume.

`HG-4`: Founder authority. EVE may compress and challenge, but cannot approve.

## Command Center Projection

The read-only projection lives in:

```text
scripts/command-center/command-center-read-model-core.mjs
```

It exposes:

- `ceo_critical_releases`: HG-3 releases that Codex/CEO validated.
- `eve_hg35_packets`: HG-3 holds and HG-3.5 review packets.
- `human_gate_queue`: decision gates still requiring review.

All three are projections from the event ledger. None of them write Plane,
resume workers, mark Done or release production.

## Hard Boundaries

- HG-3.5 is not Founder authority.
- Simulated EVE packets must set `simulated: true`.
- No autonomous resume is allowed until an HG-3.5 sign event or equivalent
  Chief-of-Staff evidence exists.
- If the decision changes strategy, public founder voice, material spend,
  legal/medical/financial claims or non-restorable data, escalate to HG-4.
- Every claim must link to a source event id or artifact path.

## Acceptance Bar

HG-3.5 is implemented enough for v0.7 only when:

- Command Center fixtures show HG-3 release and HG-3 hold paths.
- Each packet links to worker, CAO/controller and gate evidence.
- Simulated packets are visibly marked.
- HG-4 cannot be represented as approved without real Founder sign.
- Focused read-model and HumanGate validator tests pass.
