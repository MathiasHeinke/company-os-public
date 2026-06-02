# CEO Release Authority Doctrine

Status: canonical governance doctrine
Phase: HG-2.5 autonomous release authority + HG-3 CEO critical authority
Use for: deciding when the CEO/Codex controller may release bounded production
actions without a founder prompt
Last updated: 2026-05-24

## Purpose

Company.OS is not an assistant system. It is an operating system with a CEO
controller. The CEO must be able to ship bounded work when the evidence is
strong enough, otherwise every automation loop collapses back into founder
approval theater.

This doctrine defines `HG-2.5`: the narrow authority band where CEO/Codex may
release bounded production-facing actions without asking the founder again. It
also defines the corrected `HG-3`: CEO/Codex critical authority for hard but
reversible/restorable decisions.

For reversible R1/R2 work, also apply
`docs/governance/fast-lane-flight-doctrine.md`: do not re-litigate every
low-risk launch once Plane contract, telemetry, CAO, controller and rollback
are active.

## HumanGate Ladder

| Level | Owner | Meaning |
|---|---|---|
| `HG-0` | none | Routine action inside `AlwaysAllow`. |
| `HG-1` | CEO | Small reversible operating decision. |
| `HG-2` | CEO | Bounded orchestration, sandbox, dry-run, reversible workflow change. |
| `HG-2.5` | CEO | Bounded release action with high evidence and rollback. |
| `HG-3` | CEO / Codex | Critical authority for high-risk but reversible/restorable action with verified rollback/snapshot and CAO/controller evidence. |
| `HG-3.5` | Chief-of-Staff / Founder-Proxy | Async review/translation tier that prepares or challenges CEO packets before founder attention. |
| `HG-4` | Founder / human | Strategic, non-restorable, mission/taste/company-identity, major legal/capital/regulatory or true founder-will decision. |

## HG-2.5 Definition

`HG-2.5` is **CEO Autonomous Release Authority**. It allows CEO/Codex to
release actions that were previously treated as founder-only if the release is
bounded, evidenced and reversible.

Allowed under `HG-2.5` when all gates pass:

- merge to the declared integration branch
- push to the declared remote
- deploy to a declared environment
- perform a small production write
- publish bounded public content
- set Plane/Linear `Done` for the specific work item

These actions are not "always allowed". They are allowed only when the
release-card proves the release is safe enough.

## Required Evidence

An `HG-2.5` release card must contain:

```json
{
  "human_gate_release": {
    "level": "HG-2.5",
    "released_by": "Codex-GPT-5.5-xhigh",
    "release_authority": "CEO_AUTONOMOUS",
    "founder_prediction_confidence": 0.92,
    "requested_actions": ["merge main", "deploy canary"],
    "blocked_actions_still_forbidden": [
      "schema/RLS/auth/service-role",
      "new spend",
      "regulated claim",
      "autonomy increase"
    ],
    "rollback_path": "named rollback",
    "rollback_verification": { "status": "pass" },
    "blast_radius": { "level": "canary", "surface": "single project" },
    "cao_verdict": { "verdict": "PASS" }
  }
}
```

Required release conditions:

- `founder_prediction_confidence >= 0.92`
- `release_authority = CEO_AUTONOMOUS`
- CAO/controller verdict is `PASS`
- all executable gates pass with evidence paths
- Artifact Truth passes
- budget passes with known cost and explicit limit
- rollback is named and verified or trivial
- blast radius is `low`, `medium`, `staged`, `canary` or `trivial`
- Plane ledger contains the decision, evidence and result

## HG-2.5 Escalation Boundary

`HG-2.5` must still escalate to `HG-3` for critical work such as:

- schema, RLS, auth or service-role changes
- production data changes beyond trivial config
- secret creation, rotation or stronger credential scopes
- material spend, subscriptions, pricing changes or money movement when still
  bounded by a CFO/CEO-approved budget envelope
- legal, medical, financial, Rx or other regulated claim work when still draft,
  review-only or reversible
- high-risk public publishing/outreach when it can be held, rolled back or
  corrected without permanent founder commitment
- autonomy promotion to L4/L5
- durable private-memory writes when private context is involved
- unresolved high-severity CAO/controller finding

## HG-3 CEO Critical Authority

`HG-3` is not a founder prompt. It is the CEO's expanded operating authority.
CEO/Codex may release an HG-3 action when all of these are true:

- the action is bounded to a declared contract and role scope
- CAO/controller verdict is PASS or explicitly accounted for
- rollback, backup, snapshot or restore path is named and verified
- blast radius is known and not company-wide without rollback
- budget and auth scopes are explicit
- the decision is reported upward for Chief-of-Staff/Founder visibility

HG-3 is the correct place for hard operational work that a real CEO could
authorize after making it reversible: auth fixes, schema migrations with
backups, service-role scope changes, production repairs, secret rotation,
scheduler authority changes or department-process changes that do not alter
company strategy.

`HG-3` must escalate to `HG-4` when the CEO cannot make the decision safely
reversible/restorable, or when the decision is strategic rather than
operational.

Operationally, an HG-3 controller pass has two outcomes:

- **Release.** Codex/CEO, running at the highest available reasoning tier,
  issues `release_authority: CEO_CRITICAL` after the release validator proves
  CAO/controller PASS, rollback/restore, blast radius, budget/auth scope and
  Artifact Truth. In that case the action may go to production without Founder
  interruption.
- **Hold and route to HG-3.5.** If Codex/CEO sees unresolved risk, ambiguity,
  missing proof or likely Founder concern, it writes a Chief-of-Staff packet
  instead of releasing. In the Command EVE architecture this packet is routed
  to EVE as `HG-3.5`; until EVE ships in v0.7, Codex/CEO may simulate that
  tier as an explicit founder-proxy report. The simulation cannot approve
  HG-4.

## HG-4 Founder Boundary

`HG-4` is required for:

- strategic direction, mission, taste, brand/company identity or public posture
- non-restorable data deletion, destructive production drops or permanent loss
- major capital allocation, legal commitment or regulated public liability
- public outreach that materially commits the founder's name, voice or will
- autonomy promotion that changes the operating model of the company
- unresolved high-severity findings where CEO action would create hidden
  founder liability

## Relation To CAO

CAO does not release. CAO emits PASS/REJECT/PARK. `HG-2.5` is a CEO decision
that may rely on CAO PASS plus deterministic gates. CEO may reject a CAO PASS.
CEO must not override CAO REJECT into release without first removing the
rejected condition and rerunning the controller pass.

## Relation To Workers

Workers never claim `HG-2.5`. Workers may request it by producing:

- changed files or artifacts
- exact commands and results
- rollback instructions
- blast-radius note
- release recommendation

The dispatcher or release validator decides whether the request becomes an
actual `human_gate.released` event.

## Implementation Hooks

Canonical enforcement points:

- `docs/templates/worker-issue-contract.md`
- `docs/governance/agentic-sandbox-control-doctrine.md`
- `docs/operations/human-gate-release-validator.md`
- `scripts/release-gates/human-gate-release-core.mjs`
- `scripts/agent-events/agent-event-core.mjs`

Any future scheduler or Plane dispatcher release mode must call the HumanGate
Release Validator before executing an `HG-2.5` action.
