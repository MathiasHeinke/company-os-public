# Contract Remediation Router

Status: canonical Stage 0.6 pre-dispatch remediation router
Use for: routing non-PASS `controller.contract-review` verdicts to the right
organizational owner before a worker sees the item
Last updated: 2026-05-10

## Purpose

Stage 0.5 answers: **is this contract strong enough to dispatch?**

Stage 0.6 answers: **if not, who owns the repair?**

The default escalation path is deliberately organizational:

```text
Contract Controller -> owning C-Level seat -> CEO -> Founder
```

The Controller must not dump every weak contract on the CEO or Founder. The
owning C-Level seat fixes its own handoff quality: missing fields, missing
Spec/Plan/Tasks, broad scope, missing eval/harness, weak gates and bad split
boundaries. CEO only receives items when ownership, priority, source truth or a
business decision is missing. CEO receives HG-3/high-risk reversible decisions
after the C-Level owner prepares the package. Founder only receives HG-4
strategic or non-restorable decisions after CEO and Chief-of-Staff /
Founder-Proxy preparation.

## Position In The Run Chain

```text
0 Plane Work Item
0.5 Contract Controller
0.6 Contract Remediation Router (only when Stage 0.5 is not PASS)
1 Dispatcher v0 lock/context
2 Capability Registry
3 Runtime Dispatcher v1.1 preflights
3.5 Runtime Inference Router
4 Runtime Dispatcher v1.2 spawn
5 C-Level Worker
6 CAO
7 Codex Controller
8 CEO/Codex Done
9 Scheduler 24/7
```

Stage 0.6 never edits source, never mutates the Plane description, never marks
Done, never writes Linear, never locks and never spawns a worker. It may write
one Plane comment:

`controller.remediation-routed`

## Route Matrix

| Contract Review Verdict | Default Owner | Action | CEO/Founder Escalation |
|---|---|---|---|
| `CONTRACT_PASS` | none | no remediation; dispatcher lock allowed | none |
| `CONTRACT_PATCH_REQUIRED` | owning `role:*` | patch contract fields and rerun Stage 0.5 | CEO only if owner/source decision missing |
| `SPEC_REQUIRED` | owning `role:*` | create or link Spec/Plan/Tasks, harness/eval or no-spec rationale | CEO only if product priority/decision missing |
| `SPLIT_REQUIRED` | owning `role:*` | split parent into smaller role-labeled child contracts | CEO only for cross-role ownership conflicts |
| `REJECT` | owning `role:*` | rewrite, park or close proposal | CEO only if the C-Level cannot classify |
| `CEO_GATE_REQUIRED` | owning `role:*` first | prepare HG-3 CEO critical-release package | CEO/Codex decides after rollback/restore and CAO evidence |
| `FOUNDER_GATE_REQUIRED` | owning `role:*` first | prepare HG-4 Founder gate package, then CEO and Chief-of-Staff review | Founder only after CEO + Chief-of-Staff have a concrete decision card |

If no single `role:*` owner exists, Stage 0.6 routes to CEO with
`remediation.owner-missing`. That is a triage defect, not a worker task.

## Executable Files

- `scripts/orchestration/contract-remediation-router.mjs`
- `scripts/orchestration/contract-remediation-router.test.mjs`
- `scripts/orchestration/scheduler-stage-0506-core.mjs` (closed-loop glue:
  Stage 0.5 -> Stage 0.6 decision module used by the scheduler before lock)
- `scripts/orchestration/scheduler-stage-0506-core.test.mjs` (PASS,
  PATCH_REQUIRED, SPEC_REQUIRED, SPLIT_REQUIRED, CEO_GATE_REQUIRED,
  FOUNDER_GATE_REQUIRED and
  owner-missing routing tests)
- `scripts/orchestration/scheduler-stage-0506.mjs` (Plane I/O wrapper that
  posts the Stage 0.5 review and, on every non-PASS verdict, immediately posts
  the Stage 0.6 route with dedupe)
- `scripts/orchestration/scheduler-stage-0506.test.mjs` (comment-dedupe tests
  for the I/O wrapper)

Dry-run:

```bash
node scripts/orchestration/contract-remediation-router.mjs \
  --workspace companyos \
  --project-id <project-id> \
  --work-item-id <work-item-id> \
  --mode dry-run \
  --auth app-token \
  --json
```

Post route comment:

```bash
node scripts/orchestration/contract-remediation-router.mjs \
  --workspace companyos \
  --project-id <project-id> \
  --work-item-id <work-item-id> \
  --mode post \
  --auth app-token \
  --json
```

Closed-loop scheduler gate (preferred for scheduler/operator use):

```bash
node scripts/orchestration/scheduler-stage-0506.mjs \
  --workspace companyos \
  --project-id <project-id> \
  --work-item-id <work-item-id> \
  --mode post \
  --auth app-token \
  --json
```

This wrapper is the normal scheduler entrypoint for Stage 0.5/0.6. It exits
successfully when a non-PASS item was reviewed and routed; lock permission is
carried by `allow_lock`, not the process exit code. That prevents expected
remediation from breaking scheduler loops.

## Comment Shape

```yaml
controller.remediation-routed:
  version: contract-remediation-router-v0
  work_item: [WORK_ITEM_ID]
  reviewer: codex
  route_required: true
  route_owner: role:cto
  escalation_level: c-level
  escalation_path: role:cto -> ceo
  founder_gate_required: false
  action: patch-contract-and-rerun-contract-controller
  source_review_verdict: CONTRACT_PATCH_REQUIRED
  source_review_comment_id: <comment-id>
  description_hash: <sha256>
  role_labels: role:cto
  reason_codes: remediation.contract-patch-to-clevel
  message: role:cto owns contract repair...
  signed_at: 2026-05-10T18:00:00.000Z
```

## Stable Reason Codes

| Code | Meaning |
|---|---|
| `remediation.none-pass` | Stage 0.5 passed; no remediation route needed. |
| `remediation.review-missing` | No `controller.contract-review` exists; rerun Stage 0.5. |
| `remediation.review-unparseable` | Latest review comment could not be parsed. |
| `remediation.owner-missing` | No single `role:*` label exists; CEO must assign owner. |
| `remediation.contract-patch-to-clevel` | Owning C-Level patches weak fields/gates/scope. |
| `remediation.spec-to-clevel` | Owning C-Level creates or links Spec/Plan/Tasks/eval. |
| `remediation.split-to-clevel` | Owning C-Level decomposes scope into child items. |
| `remediation.reject-to-clevel` | Owning C-Level rewrites, parks or closes proposal. |
| `remediation.founder-gate-package-to-clevel` | C-Level prepares Founder-gate package; CEO escalates. |
| `remediation.unknown-verdict` | Unknown verdict; CEO classifies before work continues. |

## Scheduler Rule

When Stage 0.5 is not `CONTRACT_PASS`, the scheduler must not lock or spawn.
Instead, it runs Stage 0.6 and posts `controller.remediation-routed`. The item
then becomes a C-Level remediation task. Only after the owning seat patches the
contract and Stage 0.5 posts a fresh `CONTRACT_PASS` may Dispatcher v0 write
`worker.lock`.

The closed-loop pre-dispatch glue lives in
`scripts/orchestration/scheduler-stage-0506-core.mjs`. Its
`decideSchedulerStage0506({ item, labelNames })` returns one of:

- `lock-allowed` — Stage 0.5 is PASS; scheduler posts the
  `controller.contract-review` YAML and the dispatcher may lock.
- `lock-blocked-remediation` — Stage 0.5 is `PATCH_REQUIRED`,
  `SPEC_REQUIRED`, `SPLIT_REQUIRED` or `REJECT`; scheduler posts both the
  `controller.contract-review` and `controller.remediation-routed` YAML and
  refuses to lock.
- `lock-blocked-ceo-gate` — Stage 0.5 is `CEO_GATE_REQUIRED`; the route
  appends `ceo` to the escalation path; no lock until HG-3 release evidence.
- `lock-blocked-founder-gate` — Stage 0.5 is `FOUNDER_GATE_REQUIRED`; the
  route appends `chief-of-staff -> founder` to the escalation path; no lock.
- `lock-blocked-owner-missing` — Non-PASS without a single `role:*` label;
  remediation routes to CEO; no lock.
- `lock-blocked-review-unknown` — Latest review comment has an unknown
  verdict; CEO must classify; no lock.

The module is pure: no fetch, no spawn, no Plane writes. The scheduler CLI
wraps it with Plane I/O and the stable comment titles
`controller.contract-review` and `controller.remediation-routed`.

## Non-Goals

- no automatic child item creation in v0
- no description patching
- no state transitions
- no direct Founder pings from weak contracts
- no worker spawn from `SPEC_REQUIRED`, `SPLIT_REQUIRED`, `REJECT` or
  `CEO_GATE_REQUIRED` / `FOUNDER_GATE_REQUIRED`
