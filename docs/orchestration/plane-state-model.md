# Plane Work-Item State Model

Status: canonical mapping of logical Company.OS lifecycle states to Plane
native states + comment + label surfaces
Phase: doctrine first; idempotent label additions are deferred to a
follow-up slice with its own HG-2.5 release card
Use for: deciding which Plane state + which control comment marks each
logical lifecycle transition; no new Plane native states in this phase
Last updated: 2026-05-09

## Decision

Company.OS does **not** create custom Plane native states. The five Plane
native states (`Backlog`, `Todo`, `In Progress`, `Done`, `Cancelled`) are
the underlying state machine. Logical lifecycle states like `locked`,
`cao-review`, or `ceo:review` live as Plane **comments** (the
`worker.lock`, `worker.reported`, `controller.verdict` markers) and
optionally as **labels** for queue filtering.

The reason: adding nine custom Plane states would fragment the workflow
view and require migrating every existing item. The comment-based state
ladder is already in use ([WORK_ITEM_ID] through [WORK_ITEM_ID]) and is the source
of truth that the dispatcher, CAO, and Codex Controller all read.

## Executable State Update Rule

When CEO/Codex intentionally changes a Plane work-item native state, use:

```bash
node ${COMPANY_OS_ROOT}/scripts/plane/plane-work-item-state.mjs \
  --workspace companyos \
  --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e \
  --sequence-id [WORK_ITEM_ID] \
  --state Done \
  --confirm-done \
  --json
```

The Plane API update payload is:

```json
{ "state": "<state_uuid>" }
```

Do **not** use `state_id`. Plane accepts that key with HTTP 200 in some
contexts but does not change the work item state. The helper verifies the
read-back state after every live PATCH and fails closed if the transition
cannot be proven. `Done` targets require `--confirm-done`; worker and CAO
scripts still do not mark Done.

## Canonical Mapping

| Logical state | Plane native state | Plane comment marker (canonical) | Optional label (queue filter) | Set by | Documented in |
|---|---|---|---|---|---|
| `planning` | `Todo` | none | `state:planning` (optional, future) | CEO/Codex on triage | `docs/operations/ceo-controller-agentic-protocol.md` |
| `dispatch-ready` | `Todo` | none (signalled by `dispatch: ready` in the fenced contract block) | `dispatch:ready` (optional, future) | CEO/Codex when contract is complete | `docs/orchestration/plane-worker-dispatcher-v0.md` |
| `locked` | `In Progress` | `worker.lock (dispatcher-v0)` | n/a (comment-based lock per `Lock Source` section in v0 doc) | dispatcher v0 `--mode lock` | `docs/orchestration/plane-worker-dispatcher-v0.md` |
| `running` (v1.2+) | `In Progress` | `worker.lock` + future `worker.heartbeat` | n/a | runtime dispatcher v1 (push) | `docs/orchestration/company-os-runtime-dispatcher-v1.md` |
| `worker-reported` | `In Progress` | `worker.reported` | n/a | the worker (or operator-authored simulated report in pilots) | `docs/templates/worker-issue-contract.md` |
| `cao-review` | `In Progress` | `controller.verdict (cao-v0)` is **not yet posted** | `state:cao-review` (optional, future) | inferred when worker.reported is present and no controller.verdict yet | `docs/agents/cao.md` |
| `cao:pass` | `In Progress` | `controller.verdict` with `verdict: PASS` | n/a (verdict is in comment body) | CAO seat | `docs/agents/cao.md` |
| `cao:reject` | `In Progress` | `controller.verdict` with `verdict: REJECT` | n/a | CAO seat | `docs/agents/cao.md` |
| `cao:park` | `Backlog` | `controller.verdict` with `verdict: PARK` | `state:parked` (optional, future) | CAO seat | `docs/agents/cao.md` |
| `ceo:review` | `In Progress` | `controller.verdict` PASS, no `controller.decision` yet | `state:ceo-review` (optional, future) | inferred from CAO PASS without controller decision | `docs/orchestration/codex-controller-runtime.md` |
| `controller:auto-go` | `In Progress` | `controller.decision` with `decision_mode: AUTO-GO` | n/a | Codex Controller (Phase 2+) | `docs/orchestration/codex-controller-runtime.md` |
| `controller:delegate` | `In Progress` | `controller.decision` with `decision_mode: DELEGATE` | n/a | Codex Controller | `docs/orchestration/codex-controller-runtime.md` |
| `controller:self-fix` | `In Progress` | `controller.decision` with `decision_mode: SELF-FIX` | n/a | Codex Controller (Phase 3+) | `docs/orchestration/codex-controller-runtime.md` |
| `ask-ceo-hg3` | `In Progress` | `controller.escalation` | n/a | Codex Controller for HG-3 critical release | `docs/orchestration/codex-controller-runtime.md` |
| `ask-founder` | `In Progress` | `controller.escalation` | n/a | Codex Controller / Chief-of-Staff for HG-4 or low-confidence founder boundary | `docs/orchestration/codex-controller-runtime.md` |
| `released` | `In Progress` (briefly) | `human_gate.released` (HG-1 / HG-2 / HG-2.5) | n/a | CEO/Codex via release validator | `docs/governance/ceo-release-authority.md` |
| `done` | `Done` | none (state itself is the marker) | n/a | CEO/Codex/Founder per HG ladder | `docs/governance/ceo-release-authority.md` |
| `cancelled` | `Cancelled` | none | n/a | CEO/Founder | n/a |
| `parked` | `Backlog` | `controller.parked` (when controller-driven) or operator note | `state:parked` (optional, future) | CAO PARK or CEO/Codex | `docs/agents/cao.md` |

The comment-marker column is the **machine-readable signal**. The optional
labels are queue conveniences and are not yet bootstrapped in the
CompanyOS Plane project.

## Verified at [WORK_ITEM_ID] (current state)

- **Plane native states present (5):** `Backlog`, `Todo`, `In Progress`,
  `Done`, `Cancelled`. Reachable via app-token at `GET /states/`
  (HTTP 200).
- **Role labels present (6):** `role:cto`, `role:cpo`, `role:cmo`,
  `role:coo`, `role:cfo`, `role:cao`. Reachable via app-token only by
  reading the work-item's embedded `labels` array (HTTP 200). Direct
  `GET /labels/` is HTTP 403 with app-token; api-key fallback works.
- **Other labels present (2):** `concepts`, `admin` (legacy / unrelated
  to the orchestration loop).
- **Modules:** 3 Plane defaults (`Workspace Setup`, `Onboarding Flow`,
  `Core Workflow`). Not customised; not load-bearing for the loop.
- **Cycles:** 2 Plane defaults. Not load-bearing.
- **Pages:** 1 default (`Project Design Spec`). Not load-bearing.

The dispatcher's embedded label resolver is currently sufficient for
role-routing without `GET /labels/` access. See
`docs/orchestration/plane-role-routing.md` (HG-2b note).

## Identified Schema Gaps (not applied in this slice)

These are **optional** helper labels that would simplify queue queries
once the Codex Controller Phase 2 lands. None are required for the
dispatcher v0 + CAO loop that ships today.

| Label | Purpose | Required by | Apply method |
|---|---|---|---|
| `dispatch:ready` | filters items the dispatcher should pick up without parsing the description | future dispatcher queue mode | api-key `POST /labels/` |
| `state:cao-review` | filters items waiting on CAO | future morning brief | api-key `POST /labels/` |
| `state:ceo-review` | filters items past CAO PASS, awaiting CEO/Codex decision | Codex Controller Phase 2 queue | api-key `POST /labels/` |
| `state:parked` | filters items parked by CAO PARK or operator | morning brief | api-key `POST /labels/` |

**No states are missing for the Phase 1 + 2 lifecycle.** The five Plane
native states cover what the dispatcher, CAO, and controller need to
emit and read.

## Apply Plan (deferred to a follow-up slice)

The four optional labels above can be added once via the existing
bootstrap script with the `--write-label-map` regenerated immediately
after, so the dispatcher's local label-map stays current:

```bash
# Idempotent label-add path. Requires PLANE_API_KEY in macOS Keychain.
# Each call is "create if missing, skip if present" by name.
node ${COMPANY_OS_ROOT}/scripts/orchestration/plane-role-labels-bootstrap.mjs \
  --workspace companyos \
  --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e \
  --auth api-key \
  --apply
```

The current bootstrap script only knows the six `role:*` labels. To add
the four `state:*` / `dispatch:ready` helper labels, the script's
`ROLE_LABELS` constant would need a sibling `HELPER_LABELS` constant or
a `--label-set role|helper|all` flag. That is a small role:cto follow-up
work item; **not** part of [WORK_ITEM_ID]'s scope, which is read-only schema
verification + apply plan.

After any label additions, regenerate the local map:

```bash
node ${COMPANY_OS_ROOT}/scripts/orchestration/plane-role-labels-bootstrap.mjs \
  --workspace companyos \
  --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e \
  --auth api-key \
  --write-label-map
```

The api-key should be rotated after each bootstrap-class write per
`docs/integrations/plane-app-control-plane.md`.

## What This Slice Does NOT Do

- It does **not** create new Plane native states.
- It does **not** rename or delete existing states or labels.
- It does **not** add the optional helper labels (deferred).
- It does **not** mark any work item Done.
- It does **not** customise modules, cycles, or pages (deferred; not
  load-bearing).
- It does **not** open any webhook subscription.

## Hygiene

- New logical lifecycle states require an amendment to this doc and a
  verification pass that the dispatcher, CAO, and Codex Controller all
  emit / read the new comment marker consistently.
- Optional label additions require their own work item with HG-2.5
  release card; bulk additions are forbidden.
- Source-company-specific lifecycle ([SOURCE_COMPANY]/Fyn) belongs in private
  operating docs. This doctrine remains generic and reusable.
