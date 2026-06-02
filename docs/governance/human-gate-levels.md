# HumanGate Levels - CEO/Codex Critical Authority And Founder Boundary ADR

Status: canonical governance doctrine
Phase: HG-3 CEO/Codex authority + HG-3.5 Chief-of-Staff review + HG-4 Founder boundary
Use for: defining every Company.OS HumanGate level, the Chief-of-Staff /
Founder-Proxy review tier, and the validator/CAO/controller fields that make
the ladder executable
Last updated: 2026-05-24

## Purpose

This ADR defines the authority ladder Company.OS needs to behave like an
autonomous company instead of a chat relay.

Terminology guardrail: `human_gate` is the historical field name for the
decision ladder. It does **not** mean "ask a human" at every level. `HG-1`
through `HG-3` are company-internal autonomy gates owned by CEO/Codex or a
delegated C-level seat inside its authority. `HG-3.5` is Chief-of-Staff /
Founder-Proxy review. The real human/founder boundary starts at `HG-4`.
UI, reports and worker prompts should say "decision gate", "CEO release" or
"Chief-of-Staff review" for lower levels, not "human review".

The important correction: `HG-3` is not "ask the founder". `HG-3` is
CEO/Codex critical authority. CEO/Codex may authorize high-critical work when
it is bounded, evidenced, reversible or restorable, and reported upward. The
CEO's job is to make hard operations reversible before authorizing them.

`HG-3.5` is the Chief-of-Staff / Founder-Proxy tier. It translates and
challenges CEO packets from the founder's perspective and prepares the final
decision surface. It is not the final human sign.

In the Command EVE architecture, EVE is the intended Chief-of-Staff runtime
for `HG-3.5`. Until that runtime ships in the v0.7 line, Codex/CEO may
simulate `HG-3.5` only by writing an explicit founder-proxy decision packet.
That simulation may challenge, compress and route; it may not release `HG-4`
or pretend that the founder has signed.

`HG-4` is the real Founder boundary: strategic direction, non-restorable data
loss, mission/taste/company-identity choices, major legal/capital exposure or
any decision where the human must own the consequence.

Earlier slices consolidated the enum and codified `HG-3.5` as an async
pause/resume protocol. This slice promotes `HG-4` into the accepted enum and
reassigns `HG-3` to CEO/Codex critical authority.

The level matrix is now an enum. Unknown levels REJECT at the validator
layer. The CAO PARKs (does not REJECT) a well-formed founder-proxy pause.
The controller emits a structured `HG-3.5-PENDING-ARTIFACT-REVIEW` decision
card that carries the pause artifact and a copy-paste-ready sign template.

This ADR does not run an actual pause/resume worker. It defines the
protocol. Automatic resume belongs to a future write-capable relay; until
then, the Chief-of-Staff / Founder-Proxy signs by pasting the sign template
as a Plane comment and a controller rerun observes the new sign evidence. If
the packet is HG-4, the sign must come from the real founder/human.

## Position In The HumanGate Ladder

| Level | Owner | Async/Sync | Meaning |
|---|---|---|---|
| `HG-0` | none | n/a | Routine action inside `AlwaysAllow`. No gate. |
| `HG-1` | CEO | sync (delegable) | Small reversible operating decision. Codex delegate may release at confidence >= 0.80. |
| `HG-2` | CEO | sync (delegable) | Bounded orchestration, sandbox, dry-run, reversible workflow change. Codex delegate may release at confidence >= 0.85. |
| `HG-2.5` | CEO | sync (delegable, bounded) | CEO Autonomous Release Authority for merge / push / deploy / production-write / public-publish / Done. Codex delegate may release at confidence >= 0.92 when CAO PASS, rollback verified, blast radius low/medium/staged/canary, budget known, Artifact Truth passes. |
| `HG-3` | CEO / Codex | sync (critical) | High-critical but reversible/restorable authority: production/auth/schema/secret/runtime changes may proceed only with CAO/controller PASS, explicit rollback/backup/snapshot, bounded blast radius and upward report. Strategic or non-restorable surfaces are excluded. |
| `HG-3.5` | Chief-of-Staff / Founder-Proxy | async | Founder-proxy review and translation tier. Reviews CEO packets, prepares founder-facing decision cards, challenges assumptions and may pause/resume bounded artifacts. Does not replace Founder sign. |
| `HG-4` | Founder / human | sync | Strategic direction, mission/taste/company identity, non-restorable data loss, major capital/legal/regulatory exposure, high-stakes founder-voice public commitments, or anything the CEO cannot make safely reversible. |

Operational owner rule:

- Workers operate inside `HG-0` through `HG-2` when their role contract and
  controller gates allow it.
- C-level seats may direct, improve and retry department work through `HG-2`
  and may prepare `HG-2.5` / `HG-3` release packets for CEO/Codex.
- CEO/Codex owns `HG-2.5` and `HG-3` release decisions.
- Chief-of-Staff / Founder-Proxy owns `HG-3.5` review and compression.
- Founder / human owns `HG-4` only.

## CEO Critical Authority (HG-3)

HG-3 exists so the CEO can run the company without turning every serious
operation into a founder interruption.

Allowed under HG-3 when all conditions are true:

- the action is bounded to the declared Plane contract and role scope
- CAO/controller verdict is PASS or explicitly routed
- rollback, backup, snapshot or restore path is named and verified
- blast radius is known and not strategic/company-wide without a rollback
- budget, auth, data and privacy impact are explicit
- the CEO records a `human_gate.released` event or equivalent release card
- the result is reported upward for Chief-of-Staff/Founder visibility

HG-3 may include production, auth, schema, service-role, secret, runtime or
sensitive workflow work when the CEO has made it reversible. If the action is
not restorable, it is not HG-3; it becomes HG-4.

HG-3 has two valid controller outcomes:

- `CEO_CRITICAL_RELEASE`: Codex/CEO judges the packet production-ready and may
  release it under the HG-3 release validator. The artifact can go to
  production without founder interruption.
- `CEO_CRITICAL_HOLD`: Codex/CEO sees unresolved issues, ambiguity or founder
  liability. The controller writes a report for `HG-3.5` Chief-of-Staff /
  EVE review. Until EVE is live, that report is the simulated HG-3.5 artifact
  and the item remains unreleased.

HG-3 must escalate to HG-4 when it touches:

- strategic direction, mission, taste, brand identity or company posture
- non-restorable data deletion, destructive production drops or permanent loss
- major capital, legal or contractual exposure
- regulated public claims that create founder/company liability
- public outreach that materially commits the founder's voice or identity
- autonomy promotions that change the company operating model

## Chief-of-Staff / Founder-Proxy (HG-3.5) Semantics

HG-3.5 is an **async pause/resume** tier. It exists for the case where the
work is genuinely below HG-4, but the artifact at the moment of mutation needs
the founder-proxy lens before it lands: an ADR draft, a non-trivial diff in a
sensitive area, a marketing mirror with regulated-adjacent language, a generated
client-facing report or a CEO packet that needs human-readable translation.

Lifecycle:

1. The contract declares `human_gate: HG-3.5` and lists a relative
   `hg35_pause_artifact` path that the worker will produce.
2. The worker runs through capability gate, runtime spawn and stage 5, then
   stops before any irreversible action. It writes the artifact to the
   declared path and emits a single `worker.reported` Plane comment with
   `state: NEEDS_HUMAN`, `reason: hg35-pause-pending`, and an
   `hg35:` block carrying `pause_artifact`, `awaiting_sign: true`, and an
   optional `sign_comment_id: null`.
3. CAO runs the role-specific pass. If the report is otherwise well-formed
   and the only outstanding condition is the missing proxy sign, CAO
   emits `PARK` (not `REJECT`) with `reason_codes: cao.hg35-awaiting-sign`
   and evidence under `hg35.{pause_artifact, awaiting_sign,
   sign_comment_id}`.
4. The controller reads the CAO `PARK` and emits a structured
   `controller.decision` card with `decision_mode:
   HG-3.5-PENDING-ARTIFACT-REVIEW`. The card carries
   `pause_artifact` and a `sign_template` markdown block the Chief-of-Staff /
   Founder-Proxy can paste back into Plane to record the sign (or a
   `reject_template` to route back to the building seat).
5. The Chief-of-Staff / Founder-Proxy reviews the artifact, prepares the
   founder-facing decision packet when needed, and a subsequent controller run
   observes `hg35.sign_comment_id` and routes the item forward (CAO rerun →
   controller rerun → CEO release under the applicable envelope) or rejects it
   back to the building seat. If the decision is truly strategic, the packet
   moves to HG-4.

Hard rules:

- HG-3.5 is **not** the final founder decision. It prepares, challenges and
  translates. Final human authority remains HG-4.
- HG-3.5 must not be used to launder HG-4 surfaces. Strategic direction,
  non-restorable data loss, major legal/capital exposure and true founder
  will remain HG-4.
- HG-3.5 must not be used to skip CAO. CAO PARK is the canonical state for
  a pending founder-proxy sign; the controller cannot promote it to
  `AUTO-GO` while the sign is missing.
- HG-3.5 pause artifacts must be relative paths inside the work item's
  declared `AllowedWritePaths` (or `reports/runs/`). Absolute paths outside
  the workspace are rejected.
- HG-3.5 review budget is ≤ 5 minutes proxy time per item. HG-4 founder time
  should stay rare and batched; the Chief-of-Staff prepares the compression.

## Worker Issue Contract Fields

The contract adds two optional fields. The validator parses them at column
0 in the fenced contract block, like every other field.

```yaml
human_gate: HG-3.5
hg35_pause_artifact: reports/runs/{date}/founder-proxy-artifact.md
hg35_resume_sign: ""   # set to the Chief-of-Staff / proxy Plane comment id after sign
```

Rules:

- If `human_gate` is `HG-3.5`, `hg35_pause_artifact` MUST be present and
  non-empty. The validator REJECTs with
  `contract.hg35-pause-artifact-missing` otherwise.
- `hg35_resume_sign` defaults to empty. It is set by the controller (or
  Chief-of-Staff / Founder-Proxy, via the sign template) once a valid sign
  comment exists. The validator does not require it.
- For every other `human_gate` level, both fields are ignored.

## Worker Report Shape (HG-3.5 Pause)

When a worker pauses at HG-3.5, the single `worker.reported` Plane comment
must include:

```yaml
state: NEEDS_HUMAN
reason: hg35-pause-pending
hg35:
  pause_artifact: reports/runs/2026-05-13/founder-proxy-artifact.md
  awaiting_sign: true
  sign_comment_id: null
  sign_template: |
    controller.founder-proxy-sign:
      verdict: APPROVE | REJECT
      sign_comment_id: <plane comment id>
      signed_at: <ISO-8601>
```

The CAO's `runCaoPass` recognizes this shape and emits `PARK` instead of
`REJECT` for `cao.report-non-pass`.

## Validator Enum

`KNOWN_HUMAN_GATES` is the canonical set:

```text
HG-0, HG-1, HG-2, HG-2.5, HG-3, HG-3.5, HG-4
```

The validator extracts the leading `HG-*` token from the `human_gate`
field (descriptive prose after the token, such as `HG-2.5 sandbox only;
no merge`, is allowed) and rejects anything that does not normalize to
one of the seven canonical levels with:

```text
contract.unknown-human-gate-level
```

`HG-4` is accepted by the validator. It is not a default worker lane; it is
the real founder boundary and must carry a founder/human release.

## CAO Reject And Park Codes

New stable codes:

```text
cao.hg35-awaiting-sign            # PARK reason, well-formed pause
cao.hg35-pause-artifact-missing   # REJECT, contract claimed HG-3.5 but no artifact path
cao.hg35-pause-artifact-not-found # REJECT, artifact path declared but file missing on disk
```

The CAO does not synthesize proxy or founder sign. It only observes the latest
`worker.reported` and the artifact file. If the artifact exists, the report
is otherwise well-formed, and `awaiting_sign: true`, the verdict is `PARK`.
If the artifact path is missing from the contract or from disk, the verdict
is `REJECT` and the work item returns to the building seat.

## Controller Decision Card

The controller adds a new decision mode and a structured pending block:

```yaml
controller.decision:
  version: codex-controller-v0
  decision_mode: HG-3.5-PENDING-ARTIFACT-REVIEW
  reason: cao-park-hg35
  release_authority: none
  next_state_hint: founder-proxy-review
  hg35:
    pause_artifact: reports/runs/2026-05-13/founder-proxy-artifact.md
    sign_template: |
      controller.founder-proxy-sign:
        verdict: APPROVE
        sign_comment_id: <plane comment id>
        signed_at: <ISO-8601>
    reject_template: |
      controller.founder-proxy-sign:
        verdict: REJECT
        reason: <short founder reason>
        signed_at: <ISO-8601>
```

The card is read-only metadata for the founder-proxy queue. Posting a sign
comment is a Chief-of-Staff / proxy action for HG-3.5 and a founder action for
HG-4, not a controller action. The controller never auto-promotes HG-3.5 to
HG-4 release.

## Example Contracts

### HG-1 (CEO delegate, reversible)

```yaml
role: role:coo
parent_seat: role:coo
agent: claude
mode: implement
workspace: registry:company-os
dispatch: ready
source_of_truth:
  - docs/operations/runtime-auth-preflight.md
acceptance_criteria:
  - Lint and unit-test pass on the touched core file.
gates:
  - pnpm lint
  - node --test scripts/orchestration/worker-ledger-validator.test.mjs
human_gate: HG-1
reporting: Plane worker.reported with changed files and gate results.
```

### HG-2 (sandbox / dry-run, bounded)

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: implement
workspace: registry:company-os
dispatch: ready
source_of_truth:
  - docs/orchestration/plane-worker-dispatcher-v0.md
acceptance_criteria:
  - Sandbox branch produced, gates green, no push or merge.
gates:
  - node --test scripts/orchestration/cao-pass.test.mjs
  - git diff --check
human_gate: HG-2
reporting: Plane worker.reported with branch, worktree, changed files, reflection.
```

### HG-2.5 (CEO autonomous release)

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: implement
workspace: registry:company-os
dispatch: ready
source_of_truth:
  - docs/governance/ceo-release-authority.md
acceptance_criteria:
  - Bounded merge + canary deploy with named rollback and CAO PASS.
gates:
  - node scripts/release-gates/human-gate-release.mjs verify --decision <path>
human_gate: HG-2.5
reporting: Plane worker.reported with release card pointer and rollback path.
```

### HG-3 (CEO/Codex critical, reversible)

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: plan
workspace: registry:company-os
dispatch: ready
source_of_truth:
  - docs/governance/ceo-release-authority.md
acceptance_criteria:
  - CEO critical-release card with verified rollback or restore path.
  - CAO/controller PASS and explicit upward report.
gates:
  - node scripts/release-gates/human-gate-release.mjs verify --decision <path>
human_gate: HG-3
reporting: Plane worker.reported summarizing the reversible critical decision.
```

### HG-3.5 (Chief-of-Staff / Founder-Proxy, async review)

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: implement
workspace: registry:company-os
dispatch: ready
source_of_truth:
  - docs/governance/human-gate-levels.md
acceptance_criteria:
  - Mirror artifact authored to the declared pause path with no marketing claims.
  - Worker stops at Stage 5; no push, no publish, no Plane state change.
  - CAO emits PARK with hg35.awaiting_sign: true; controller emits HG-3.5-PENDING-ARTIFACT-REVIEW.
gates:
  - node --test scripts/orchestration/cao-pass.test.mjs
  - node --test scripts/orchestration/codex-controller-dryrun.test.mjs
human_gate: HG-3.5
hg35_pause_artifact: reports/runs/2026-05-13/founder-proxy-mirror.md
reporting: Plane worker.reported with state NEEDS_HUMAN, reason hg35-pause-pending, hg35 block.
```

### HG-4 (Founder, strategic / non-restorable)

```yaml
role: role:coo
parent_seat: role:coo
agent: claude
mode: plan
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - docs/governance/human-gate-levels.md
acceptance_criteria:
  - Chief-of-Staff packet states facts, interpretation, options, risks and recommendation.
  - Founder/human signs or rejects the strategic decision.
gates:
  - founder/human sign required
human_gate: HG-4
reporting: Plane controller.decision with founder-facing decision packet.
```

## Implementation Hooks

Canonical enforcement points enabled by this ADR:

- `docs/templates/worker-issue-contract.md`
- `scripts/orchestration/worker-ledger-validator.mjs` (`KNOWN_HUMAN_GATES`,
  `contract.unknown-human-gate-level`,
  `contract.hg35-pause-artifact-missing`)
- `scripts/orchestration/cao-pass.mjs` (HG-3.5 PARK on well-formed pause,
  `cao.hg35-*` codes)
- `scripts/orchestration/codex-controller-dryrun.mjs`
  (`HG-3.5-PENDING-ARTIFACT-REVIEW` decision mode + `hg35` payload block)
- `scripts/agent-events/agent-event-core.mjs` (`HG-4` in known levels,
  `HG-3` threshold 0.96, `HG-3.5` Chief-of-Staff owners, `HG-4` founder
  owner)
- `scripts/release-gates/human-gate-release-core.mjs` (HG-3 requires
  `CEO_CRITICAL`, rollback/restore evidence and CAO/controller PASS; HG-4
  requires founder/human release)
- `docs/agents/cao.md` (Enforcement History row for the new codes)
- `docs/orchestration/contract-controller.md` (Stage 0.5 awareness)

## Non-Goals For This Slice

- No actual HG-3.5 worker run.
- No automatic resume on proxy sign; a future write-capable relay turns
  `hg35_resume_sign` into a dispatcher trigger.
- No retroactive relabeling of historic HG-2/HG-3 items.
- No edits to `docs/operations/goal-command.md` or
  `docs/orchestration/goal-runtime-plane-loop.md`; those belong to the
  Goal Runtime lane.

## Enforcement History

| Reject code | Enabled by | Applies to |
|---|---|---|
| `contract.unknown-human-gate-level` | this ADR (2026-05-13) | Plane work items declaring `human_gate` outside `KNOWN_HUMAN_GATES`. Older items with non-canonical scalars retain their historic verdict; new validations REJECT. |
| `contract.hg35-pause-artifact-missing` | this ADR (2026-05-13) | New `human_gate: HG-3.5` contracts without `hg35_pause_artifact`. |
| `cao.hg35-awaiting-sign` | this ADR (2026-05-13) | CAO PARK reason on well-formed founder-proxy pause. Not a REJECT. |
| `cao.hg35-pause-artifact-missing` | this ADR (2026-05-13) | Contract claims HG-3.5 but the pause artifact path is absent or empty. |
| `cao.hg35-pause-artifact-not-found` | this ADR (2026-05-13) | Pause artifact path declared but file missing on disk at verdict time. |
| `HG-4` accepted in HumanGate enum | CEO/Codex critical authority slice (2026-05-21) | New validations accept `human_gate: HG-4`; release validators require Founder/human release. |
| `HG-3` reassigned to CEO/Codex critical authority | CEO/Codex critical authority slice (2026-05-21) | HG-3 release cards may be stamped by CEO/Codex only with high confidence, CAO/controller PASS and verified rollback/restore evidence. |

Future ADRs that add automatic resume or extend the controller decision payload
must add rows here so the audit trail stays interpretable.
