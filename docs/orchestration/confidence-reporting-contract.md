# Confidence Reporting Contract

Status: canonical reporting-contract extension (v0 — worker-side confidence + calibration loop)
Phase: makes worker self-confidence a native, integral field in every worker→controller report, everywhere
Plane: Command EVE v1.3 governance spine (sibling to the Supergoal Execution Ladder + State-Truth Pass)
Last updated: 2026-05-29

## Why this exists

Today the only native confidence fields are **controller/CEO-side**: `CEOConfidence` and
`FounderPredictionConfidence` (thresholds 0.80 / 0.85 / 0.92 / 0.96; parsed by
`scripts/orchestration/codex-controller-dryrun.mjs`). The **worker** does not emit its own confidence — so
the controller has no worker self-assessment to weigh, and no way to tell whether a worker is well-calibrated
or chronically over-confident.

This contract adds **`WorkerConfidence`** as a native, required field in every worker report — in this
session, the COMPA worktree, marketing, Atlas, any workspace — so CEO/Codex always gets a direction signal
up front AND can react to it over time (e.g. throttle a worker whose confidence is repeatedly higher than its
actual outcomes).

## The field (required in every `worker.reported`)

```
WorkerConfidence: 0.0-1.0
WorkerConfidenceBasis: <one line: the evidence the score rests on>
```

- **Semantics:** the worker's self-assessed probability that its reported result is correct AND ready for its
  claimed stage / disposition (per the Supergoal Execution Ladder).
- **A naked number is invalid.** `WorkerConfidenceBasis` is required so the score is justified, not asserted.
- **Distinct from and INPUT to** the controller-side `CEOConfidence` / `FounderPredictionConfidence`. It does
  not replace them; the controller weighs the worker's confidence alongside its own.
- Subagents emit their own `WorkerConfidence` in the `subagents:` block; the coordinator does not average them away.

## Confidence informs gates — it NEVER overrides them

WorkerConfidence is a signal, not an authority. Hard gates stand regardless of confidence:
- CAO REJECT / PARK, HG-3 / HG-4 authority, access-control / capability-allowlist changes, secrets, production,
  publish/send/spend, Plane Done, INTEGRATED_MAIN — all remain gated at any confidence.
- A worker claiming auto-eligibility at a HumanGate level should carry at least that level's threshold
  (HG-2.5 ≥ 0.92, HG-3 ≥ 0.96). Below threshold → the controller must review more. Above threshold ≠ release.

Threshold check: `confidenceMeetsGate(confidence, hgLevel)` in
`scripts/orchestration/confidence-calibration-core.mjs` (reuses `HG_CONFIDENCE_THRESHOLDS`).

## The calibration loop (how CEO/Codex reacts)

1. The worker emits `WorkerConfidence` + basis in `worker.reported`.
2. The CAO/CEO records the actual **outcome** of that report (PASS / PARK / REJECT).
3. Over runs, per seat, `calibrationFromHistory()` compares claimed confidence to outcome:
   - `gap = meanClaimed − meanOutcome` (outcome map: PASS=1, PARK=0.5, REJECT=0; PARK = unresolved/partial
     evidence, **not** half-PASS authority).
   - `verdict`: `over-confident` (gap > band) / `under-confident` (gap < −band) / `well-calibrated` / `insufficient-data`.
4. `recommendAutonomyAdjustment()` turns the verdict into a flag:
   - **over-confident → `raise-bar`** (the founder's key case: repeatedly high confidence, low outcome → require
     more controller review before auto-eligibility).
   - under-confident → `widen-eligible` (sandbagging; autonomy may widen after review).
   - well-calibrated / insufficient-data → `hold`.

The core only **flags**. Any actual autonomy change still requires controller/CEO/founder action — this is the
Earned-Authority / Trust-Ledger principle made measurable: autonomy rises with demonstrated calibration, never
on self-assessment alone.

## Native wiring (the "stellen")

**Built (v0, this batch — new, uncoupled):**
- this doctrine
- `scripts/orchestration/confidence-calibration-core.mjs` (+ test): `parseConfidence`,
  `validateWorkerConfidence`, `confidenceMeetsGate`, `calibrationFromHistory`, `recommendAutonomyAdjustment`.

**Specced wiring (follow-on — keep scopes clean):**
- *Coupled to PR #30 (do not stack on the dirty files):*
  - `docs/templates/worker-issue-contract.md` — add `WorkerConfidence` + `WorkerConfidenceBasis` to the
    `worker.reported` block spec (next to `ReflectionPolicy` / `reflection:`).
  - `scripts/orchestration/worker-ledger-validator.mjs` — validate the field via `validateWorkerConfidence`;
    REJECT code `confidence.missing` / `confidence.out-of-range` / `confidence.basis-missing`.
- *Clean follow-on batch:*
  - `scripts/orchestration/codex-controller-dryrun.mjs` — read `WorkerConfidence` as an input next to
    `CEOConfidence`; surface the worker-vs-controller confidence delta in the decision card.
  - `docs/orchestration/codex-controller-runtime.md`, `docs/orchestration/subagent-reporting-contract.md`,
    `docs/orchestration/claude-clevel-worker-runtime.md` — reference this contract.

## Boundary
WorkerConfidence is advisory input to the controller. It never confers authority, never auto-releases, never
overrides a hard gate. The calibration core is pure (no I/O, no clock) and report-only.
