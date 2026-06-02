# Supergoal Execution Ladder

Status: canonical execution-lifecycle doctrine
Phase: v0 — stage enum, authority invariants, TargetClass field, State-Truth Pass, HG-2.5 Merge Readiness Pack
Use for: making the Execution Ledger reflect **integration truth, not agent success**
Plane: [WORK_ITEM_ID] (Welle-2A, released by Codex 2026-05-29)
Last updated: 2026-05-29

## Purpose

Before this doctrine, a Plane item was treated as effectively "complete" once Worker + CAO + Controller
said PASS locally. That conflates three different facts that an autonomous, founder-offline operating
system must never confuse:

```text
"built"  !=  "integrated"  !=  "live"
```

A green `controller.decision: AUTO-GO` means the work is *built and reviewed*. It does **not** mean it is
merged to main, and it certainly does not mean it is deployed to production. The single most dangerous
illusion for the Founder Offline Test is a wall of green AUTO-GO runs that *feel* autonomous while every one
of them still required a human to integrate and ship.

The Supergoal Execution Ladder makes the back half of the lifecycle explicit and authority-gated, and adds a
`TargetClass` so every work item declares, up front, what "DONE" actually means for it.

Core principle: **the Execution Ledger must reflect integration truth, not agent success.**

## The 10 Stages

| # | Stage | Meaning | Who may set it |
|---|---|---|---|
| 1 | `SPEC_READY` | Spec/intent is clear enough to write a contract | author / EVE / C-Level / CEO |
| 2 | `CONTRACT_PASS` | Stage 0.5 Contract Controller PASS for the current description hash | Contract Controller |
| 3 | `RUNTIME_READY_PASS` | Stage 0.65 Runtime Executability PASS | Runtime Executability gate |
| 4 | `WORKER_REPORTED` | Worker produced its single `worker.reported` | worker |
| 5 | `CAO_PASS_HG2` | CAO verdict PASS at the work's HumanGate | CAO |
| 6 | `CONTROLLER_AUTO_GO` | Codex Controller decision AUTO-GO (or bounded release card) | Controller / Codex |
| 7 | `SANDBOX_VERIFIED` | Sandbox branch independently verified | Codex / CEO |
| 8 | `INTEGRATED_MAIN` | Merged/integrated into main | **Codex / CEO only** |
| 9 | `DEPLOYED_PROD` | Deployed/live in production | **Codex / Founder / Release-Gate only** |
| 10 | `DONE` | Plane Done, at the declared TargetClass | per TargetClass (below) |

Stages are forward-only. Backward moves and worker writes above the ceiling are rejected by
`scripts/orchestration/supergoal-execution-ladder-core.mjs`.

## Authority invariants (hard)

1. **Workers may reach `CAO_PASS_HG2` (stage 5) and no further.** A worker never sets
   `INTEGRATED_MAIN` or `DEPLOYED_PROD`. (`evaluateStageTransition` rejects with
   `execution-ladder.worker-exceeds-ceiling`.)
2. **Only Codex/CEO sets `INTEGRATED_MAIN` (8).**
3. **Only Codex/Founder/Release-Gate sets `DEPLOYED_PROD` (9).**
4. **`CONTROLLER_AUTO_GO` (6) never implies integration or production.**
   (`controllerAutoGoImpliesIntegration()` returns `false`, by design and by test.)
5. **Plane `DONE` (10) is valid only when the work has reached its TargetClass stage.**

These mirror and unify the existing `docs/orchestration/plane-state-model.md` (Done helper),
`docs/governance/ceo-release-authority.md` (HG-2.5/HG-3 release authority) and the Stage 0.5 / 0.65 gates
into one explicit state machine.

## TargetClass

Every Worker Issue Contract MAY declare a `target_class`. It is the contract's honest statement of what
DONE means, so the ledger never reads "Claude said PASS" as "it is live". When present, the validator
rejects unknown values with `contract.unknown-target-class`. It is optional (historic contracts keep their
verdict); requiring it for `implement`/`production` work is a future tightening.

| TargetClass | DONE maps to stage | Use for |
|---|---|---|
| `report-only` | `CONTROLLER_AUTO_GO` (6) | audits, specs, ADRs, plans, decision packets — no main/prod change |
| `main-integrated` | `INTEGRATED_MAIN` (8) | code/docs merged to main |
| `production-deployed` | `DEPLOYED_PROD` (9) | deploys / live changes |

Contract field (inside the fenced contract block, snake_case at column 0):

```yaml
target_class: report-only   # report-only | main-integrated | production-deployed
```

`evaluateDoneEligibility({ targetClass, currentStage })` returns whether DONE may be set, the required
stage, and a stable reason code.

## Pattern 1 — Experimental Supergoal Run

When a supergoal worker (e.g. Claude Opus Max) is allowed to work massively autonomously, all of its
comments and reports are marked **experimental** and are NOT treated as final ledger truth until a
State-Truth Pass confirms them. Experimental output may explore, propose and draft; it may not be the
basis for `INTEGRATED_MAIN` or `DEPLOYED_PROD` without verification.

Marker convention: experimental reports carry `experimental: true` (and the controller does not promote
an experimental report past `CONTROLLER_AUTO_GO`).

## Pattern 2 — State-Truth Pass

Before building further on top of prior autonomous work, an agent verifies **what actually exists** on
branch, main, sandbox and production — not what the prior reports claimed. Ground truth precedes more
work. The State-Truth Pass produces a short report that reconciles claimed stage vs. real stage per item,
and downgrades any item whose ledger stage is ahead of its real integration state.

Minimum checks: `git` branch/main state, sandbox worktree presence, deploy/prod evidence, and a diff
between the item's recorded Execution-Ladder stage and the verified stage.

## Pattern 3 — HG-2.5 Merge Readiness Pack

Between `CAO_PASS_HG2`/`CONTROLLER_AUTO_GO` and Codex setting `INTEGRATED_MAIN`, a distinct integration
package is assembled: the diff, the rollback/restore path, blast radius, CAO verdict pointer, and the
gate evidence. This is the artifact Codex/CEO reviews to move an item from "built" to "integrated" under
HG-2.5 release authority. It keeps integration a deliberate, evidenced act rather than an implicit
side effect of a green worker run.

## Implementation hooks (v0)

- `scripts/orchestration/supergoal-execution-ladder-core.mjs` — stage enum, `STAGE_AUTHORITY`,
  `WORKER_STAGE_CEILING`, `TARGET_CLASS_DONE_STAGE`, `canSeatSetStage`, `isWithinWorkerCeiling`,
  `evaluateDoneEligibility`, `evaluateStageTransition`, `controllerAutoGoImpliesIntegration`.
- `scripts/orchestration/supergoal-execution-ladder-core.test.mjs` — full coverage of the invariants and
  the three TargetClass DONE mappings.
- `scripts/orchestration/worker-ledger-validator.mjs` — `KNOWN_TARGET_CLASSES`, `normalizeTargetClass`,
  `contract.unknown-target-class` (optional field, value-validated when present).
- `docs/templates/worker-issue-contract.md` — `TargetClass` field + rule.

## Non-goals for this slice (v0)

- No automatic stage transitions in the live controller yet; the core is importable and the controller
  will consume it in a follow-up.
- No retroactive relabeling of historic items.
- No change to who owns HG-4. Founder authority is unchanged.

## Enforcement History

| Code | Enabled by | Applies to |
|---|---|---|
| `contract.unknown-target-class` | [WORK_ITEM_ID] (2026-05-29) | Contracts declaring a `target_class` outside the canonical set. Optional field; absent = no change. |
| `execution-ladder.worker-exceeds-ceiling` | [WORK_ITEM_ID] (2026-05-29) | A `worker` seat attempting to set a stage above `CAO_PASS_HG2`. |
| `execution-ladder.done-blocked-target-class-stage-not-reached` | [WORK_ITEM_ID] (2026-05-29) | DONE attempted before the TargetClass stage is reached. |
