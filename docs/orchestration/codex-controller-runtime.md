# Codex Controller Runtime — GPT-5.5 xhigh Deputy CEO

Status: canonical doctrine for the deputy-CEO controller runtime
Phase: doctrine first; dry-run only adapter is the next slice; bounded
controller automation is HG-2.5/HG-3 gated and not implemented in this doc
Use for: deciding what Codex CLI (GPT-5.5 xhigh) is allowed to do as a
deputy CEO controller against Plane work items already audited by CAO
Last updated: 2026-05-21

Related doctrine: `docs/orchestration/multi-inference-c-level-runtime.md`
defines a future Codex-as-worker lane. That future lane is a separate runtime
identity from this deputy-CEO controller and is not live until adapter,
CapabilityProfile, CAO, stream-health and cost-ledger gates pass.

## Purpose

Founder/CEO acceptance work is the bottleneck once the Plane → Worker → CAO
loop is healthy. The Codex Controller Runtime is the **deputy CEO surface**
that takes the repetitive read/decide/route portion of CEO acceptance off
the founder, while keeping every strategic or non-restorable decision behind
explicit HG-4 founder gates.

This doctrine defines:

- which agent identity acts as the deputy CEO
- which Plane queues the controller reads
- which writes the controller is allowed to perform
- which writes are forbidden
- when the controller must use HG-3 CEO critical authority, route HG-3.5 to
  Chief-of-Staff / Founder-Proxy, or escalate to HG-4 Founder gates
- how the controller relates to the existing CAO seat and to HG-2.5/HG-3
- the explicit non-goals of this runtime

It does **not** activate any controller automation. Activation is a separate
slice with its own HG-2.5 release card.

## Identity

| Field | Value |
|---|---|
| Runtime | Codex CLI (`codex` binary) |
| Model | GPT-5.5 xhigh (or the highest-tier reasoning model the Codex CLI exposes at the time) |
| Role | Deputy CEO controller |
| Worker class | **NOT** a normal worker. Never assigned `role:cto/cpo/cmo/coo/cfo` work items as build target. |
| Audit class | **NOT** the CAO. CAO is a separate seat per `docs/agents/cao.md`. The Codex controller may consume CAO PASS, but never replaces CAO. |
| HumanGate authority | Releases HG-1, HG-2, HG-2.5 and HG-3 within the bounds of `docs/governance/ceo-release-authority.md`. Routes HG-3.5 to Chief-of-Staff / Founder-Proxy. Escalates HG-4 to Founder. |

Codex Controller Runtime is **one identity**, not a per-seat pool. A future
phase may split it into CEO Controller / Chief of Staff Controller /
Release Controller; today they collapse into one deputy-CEO surface.

If Company.OS later adds `codex-clevel-worker/*` profiles, those profiles must
be treated as worker identities and must not inherit this controller's release
authority. The same underlying CLI may exist in both lanes, but the roles,
contracts, cost category, writes and gates are different.

## Position in the Loop

```text
worker run (v0 manual or v1 push)
  → worker.reported in Plane
  → CAO controller pass (PASS / REJECT / PARK)
  → Plane state ceo:review
  → Codex Controller Runtime reads ceo:review queue
  → controller decision:
       AUTO-GO   under HG-1/HG-2 (small reversible)
       HG-2.5    bounded release with confidence gates
       ASK-CEO-HG3 for high-critical reversible work
       CEO_CRITICAL_RELEASE for HG-3 production-ready packets
       HG-3.5-PENDING-ARTIFACT-REVIEW for EVE / Chief-of-Staff challenge
       ASK-FOUNDER for HG-4 / ambiguity / strategic
       REJECT    back to c-level:<role>:planning
       PARK      with rationale
  → controller emits Plane controller-decision comment
  → HG-2.5/HG-3-eligible items receive a release card and Done only when gates pass
  → HG-3.5/HG-4 candidates surface as EVE / Chief-of-Staff decision packets
```

The controller never receives raw worker output. CAO PASS is a precondition.
If CAO did not PASS, the controller does not act.

## Queue Inputs

The controller reads exactly these Plane queues. Anything outside is
out-of-scope.

| Queue | Source signal | Controller action |
|---|---|---|
| **`worker.reported`** | Plane work items with a `worker.reported` comment but no `controller.verdict` yet | Wait for CAO. Surface to founder only if CAO has been silent past its TTL. |
| **`controller:ready`** | Items whose CAO emitted PASS or REJECT | Run controller pass: decision card draft, classify HG level, route. |
| **`ceo:review`** | Items in CEO-review state with CAO PASS | Decide AUTO-GO / DELEGATE / ASK-FOUNDER / REJECT / PARK per `docs/templates/worker-issue-contract.md`. |
| **HG-2.5 review candidates** | Items whose contract carries `HumanGateLevel: HG-2.5` and a draft release card | Validate release card against `docs/governance/ceo-release-authority.md`; emit `human_gate.released` event or REJECT. |

The controller never invents queue items. CEO state transitions into these
queues come from CAO verdicts and explicit operator action; the controller
reacts.

## Allowed Writes

The controller may write exactly these surfaces. Anything else is
forbidden.

1. **Plane comments**, specifically:
   - `controller.decision` (CEO-layer decision card YAML)
   - `human_gate.released` (HG-1, HG-2, HG-2.5, HG-3 release event per
     `docs/operations/human-gate-release-validator.md`)
   - `controller.parked` with rationale
   - `controller.escalation` when an HG-4 founder decision is needed
2. **Controller verdict drafts** as Plane comments only — never as Plane
   description edits, never as label changes.
3. **Report files** under `reports/controller/YYYY-MM-DD/<run_id>.md` with
   the same secret-stripping rules as worker run reports.
4. **Metrics rows** in `metrics/agent-events.jsonl` per
   `docs/operations/agent-event-ledger.md`. Allowed event types:
   - `controller.decision`
   - `controller.released`
   - `controller.escalated`
   - `controller.parked`

## Forbidden Writes

The controller never:

- spawns a worker, schedules a worker, or starts the runtime dispatcher v1
- transitions Plane work items to `Done` outside the HG-2.5/HG-3 release card
  flow defined in `docs/governance/ceo-release-authority.md`
- merges, pushes, deploys, or writes to production systems
- writes to Linear outside the bridge mirror skill
- modifies a work item description, body, label, or relationship
- edits source code, docs, scripts, configs, or kit templates
- changes secrets, rotates tokens, or reads `.env`/keychain values
- subscribes webhooks, registers cron jobs, or activates schedulers
- creates new Plane work items
- creates HG-4 founder gates that the founder did not request

If the controller needs any of those, it emits `controller.escalation` and
stops on that work item.

## Escalation Rules

The controller must escalate to **chat CEO (the founder)** when:

- a CAO REJECT contains a reason code the controller has not seen before
  (no precedent decision)
- two or more independent CAO PASS items conflict or block each other
- the contract's `BlockedActions` list overlaps with what the work item
  would actually require
- the work item carries `HumanGateLevel: HG-4`
- the controller's own `FounderPredictionConfidence` is below `0.80` for
  HG-1 or `0.85` for HG-2 or `0.92` for HG-2.5

The controller may use **HG-3 CEO critical authority** only when rollback,
backup/snapshot/restore evidence and CAO/controller PASS prove reversibility.
If the controller approves HG-3, the release authority is
`CEO_CRITICAL` and the action may proceed to production under the release
validator. If the controller does not approve HG-3, it does not ask the
Founder directly by default; it writes a report for `HG-3.5`
Chief-of-Staff / EVE review. Until Command EVE is live in the v0.7 line,
Codex may simulate that HG-3.5 packet as a read-only founder-proxy report.
That simulation challenges and compresses the decision; it never substitutes
for HG-4 Founder sign.
The controller must escalate to **HG-4 founder gate** (and stop) when the work
item touches any HG-4 surface listed in `docs/governance/ceo-release-authority.md`:

- strategic direction, mission/taste/company identity or public posture
- non-restorable data deletion, destructive production drops or permanent loss
- major capital allocation, legal commitment or regulated public liability
- public outreach that materially commits the founder's name, voice or will
- autonomy promotion to L4 or L5
- unresolved high-severity finding where CEO action would create hidden
  founder liability

These categories never become AUTO-GO regardless of confidence.

## Decision Card Shape

Every controller decision is a Plane comment with one fenced YAML block.
This is the operator-readable artifact; the report `.md` carries the long
form.

```yaml
controller.decision:
  version: codex-controller-v0
  controller_run_id: <ulid>
  work_item: COMPA-<n>
  cao_verdict: PASS | REJECT | PARK
  decision_mode: AUTO-GO | DELEGATE | SELF-FIX | ASK-CEO-HG3 | ASK-FOUNDER | REJECT | PARK
  human_gate_level: HG-0 | HG-1 | HG-2 | HG-2.5 | HG-3 | HG-3.5 | HG-4
  ceo_confidence: 0.0
  founder_prediction: GO | GO_MIT_AUFLAGEN | NO_GO | PARKEN
  founder_prediction_confidence: 0.0
  release_authority: none | CEO_AUTONOMOUS | CEO_CRITICAL | FOUNDER_REQUIRED
  rollback_plan: <named rollback or "none">
  rollback_verification: pass | n/a | pending
  blast_radius: trivial | low | medium | staged | canary | high
  blocked_actions_remaining:
    - merge
    - push
    - deploy
    - production-write
    - schema/RLS/auth
    - public-publish
    - linear-write-outside-bridge
    - plane-done-outside-hg-25
  evidence:
    cao_verdict_comment: <comment uuid>
    worker_report_path: <absolute path or "n/a">
    metrics_rows: <count>
  next_action:
    - the literal next step the controller will or will not take
  signed_at: <ISO-8601>
```

If `decision_mode` is `AUTO-GO` or the release_authority is
`CEO_AUTONOMOUS`, the controller may also emit a `human_gate.released`
event. If `ASK-FOUNDER`, the controller emits `controller.escalation`
instead and stops on this item.

## Confidence Resolution

The controller is deliberately conservative unless confidence is parseable.
It resolves `ceo_confidence` in this order:

1. CLI override `--confidence`, used only for an explicit operator/controller
   run.
2. Contract field `CEOConfidence`.
3. Contract field `FounderPredictionConfidence`, but only when
   `ReleaseAuthority: CEO_AUTONOMOUS` is also present.
4. `0`, which forces `ASK-FOUNDER` or `DELEGATE` instead of accidental
   release.

For `HG-2.5`, `ReleaseAuthority: FOUNDER_REQUIRED` always forces
`ASK-FOUNDER`, even if confidence is high. `ReleaseAuthority:
CEO_AUTONOMOUS` plus `FounderPredictionConfidence >= 0.92` allows `AUTO-GO`
after CAO PASS, while the blocked actions in the work item remain forbidden.

## Relation to CAO

CAO emits PASS / REJECT / PARK. The Codex controller consumes the CAO
verdict and adds the CEO-layer decision on top.

CAO **never** issues a release. Codex controller **never** overrides a CAO
REJECT into a release. The only way a REJECT becomes a release is if a
fresh worker run produces a fresh CAO PASS.

CAO findings beyond the Phase 1 CTO-pass surface (CMO/COO/CPO/CFO) are not
yet implemented. The Codex controller MUST escalate to chat CEO when a work
item's role label requires a CAO surface that does not yet exist
(reason: `cao.phase-1-only-cto`).

## Relation to Worker Runtime

The Codex controller never spawns workers. Worker spawning is the job of
the runtime dispatcher v1.2+ (per
`docs/orchestration/company-os-runtime-dispatcher-v1.md`), and only after a
separate HG-2.5 release card.

Two possible cooperation patterns later:

- **Decoupled.** Controller writes a decision card; a separate scheduler
  notices and dispatches. (Default; least authority for the controller.)
- **Coupled (v1.3+).** Controller emits a release card that names the next
  worker run; scheduler reads release card AND queue together. Requires its
  own doctrine update before activation.

This slice does not pick a pattern. It just rules out: the controller does
not call the dispatcher directly today.

## Relation to Post-Worker Quality Loop

When CAO/controller review finds that a lower follow-up is needed, the
controller uses `docs/orchestration/post-worker-quality-loop.md` and
`scripts/orchestration/post-worker-quality-loop-core.mjs` to classify the
next step. The allowed follow-up classes are `quality-auditor`,
`security-auditor`, `bug-regression-auditor`, `deep-audit-worker` and
`hotfix-worker`.

The controller may write `controller.audit-followup` or
`controller.hotfix-request` comments, but still does not spawn the worker. A
separate scheduler can consume those markers only when the policy registry,
HumanGate level, loop limit and capability profile pass. The executable handoff
is `scripts/orchestration/post-worker-quality-scheduler-core.mjs`: it converts
the latest explicit marker into one `dispatch: ready` lower-worker contract and
writes or spawns nothing itself. P2/P3/P4 work cannot quietly become an
autonomous hotfix loop.

## Phase Plan

| Phase | Scope | Gate |
|---|---|---|
| 0 (this doc) | doctrine only — what the controller may and may not do | committed in Company.OS |
| 1 | `scripts/orchestration/codex-controller-dryrun.mjs` reads queues, drafts decision cards to stdout / report file, never writes Plane | doctrine ratified by CEO |
| 2 | bounded `--mode post` writes a single `controller.decision` comment per run, still no Done/release without explicit HG-2.5 card | implemented in `scripts/orchestration/codex-controller-dryrun.mjs` |
| 3 | controller may release HG-1 and HG-2 autonomously when confidence and gates pass | five phase-2 PASSes, founder approval |
| 4 | controller may release HG-2.5 with full release-card validator | five phase-3 PASSes, founder approval |
| 5 | controller may release HG-3 with `CEO_CRITICAL`, CAO PASS and verified rollback/restore | five phase-4 PASSes, founder-approved doctrine |

HG-4 release authority is **never** part of this runtime. HG-4 stays with the
Founder/human.

## Non-Goals

The Codex controller is not:

- a build agent. It does not refactor, refactor proposals, or edit source.
- a CAO replacement. It does not audit code, contracts, or evidence.
- a memory writer. Memory writes go through `DreamPolicy` controlled
  surfaces only.
- a customer surface. The controller never sends external messages.
- a broad billing or spend authority. Bounded spend can be HG-3 only with CFO/CEO evidence; material capital exposure is HG-4.
- a prompt-engineering layer. Worker prompts come from the v1 dispatcher's
  context comment, not from the controller.

If a request to the controller would require any of the above, the
controller emits `controller.escalation` and stops.

## Implementation Hooks

Already present:

- `docs/operations/ceo-controller-agentic-protocol.md` — generic CEO/Controller protocol
- `docs/governance/ceo-release-authority.md` — HG-2.5 contract
- `docs/operations/human-gate-release-validator.md` — release validator
- `docs/agents/cao.md` — CAO seat doctrine
- `docs/orchestration/company-os-runtime-dispatcher-v1.md` — worker runtime
- `scripts/orchestration/cao-pass.mjs` — CAO controller pass
- `scripts/orchestration/codex-controller-dryrun.mjs` — Phase 1 dry-run,
  Phase 2 bounded post mode, SELF-FIX eligibility and decision-card writer
- `scripts/orchestration/codex-controller-dryrun.test.mjs` — controller
  dry-run tests
- `scripts/release-gates/human-gate-release-core.mjs` — release validator core
- `scripts/agent-events/agent-event-core.mjs` — ledger writer

Still to build (each gated by HG-2.5 release card on its own work item):

- Controller metrics row writer for `controller.decision`
- Optional `human_gate.released` post mode after release-card validator passes
- Scheduler queue integration

## Mapping to Existing Canon

| Concept | Source | This doc adds |
|---|---|---|
| CEO/Controller protocol | `docs/operations/ceo-controller-agentic-protocol.md` | the runtime identity for that protocol |
| HG-2.5 release card | `docs/governance/ceo-release-authority.md` | controller is the deputy that may issue them |
| CAO seat | `docs/agents/cao.md` | controller consumes CAO output, never overrides REJECT |
| Worker contract | `docs/templates/worker-issue-contract.md` | controller honours `BlockedActions`, `HumanGateLevel`, `ReleaseAuthority` |
| Runtime dispatcher v1 | `docs/orchestration/company-os-runtime-dispatcher-v1.md` | controller does not spawn; cooperation pattern is later |

## Hygiene

- The set of decision modes (`AUTO-GO`, `DELEGATE`, `SELF-FIX`,
  `ASK-FOUNDER`, `REJECT`, `PARK`) is closed. New modes require an
  amendment to this doc and to the worker-issue-contract template.
- The set of allowed write surfaces is closed. New surfaces require an
  amendment to this doc and a separate HG-2.5 release card.
- Source-company-specific deputy-CEO behaviour ([SOURCE_COMPANY]/Fyn) belongs in
  private operating docs. This doctrine remains generic and reusable.
