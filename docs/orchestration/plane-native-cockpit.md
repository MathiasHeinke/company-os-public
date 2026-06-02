# Plane Native Cockpit

Status: v0 cockpit bootstrap
Last updated: 2026-05-10

## Purpose

Company.OS uses Plane as the canonical execution ledger. The first migration
proved Work Items and comments. The next step is to use Plane's native product
surfaces as the operator cockpit:

- Modules group operating domains.
- Cycles time-box rocket tests, drift windows and activation weeks.
- Pages hold operator maps and runbooks.
- Work Items keep machine-readable contracts and event comments.
- Views should expose queues, but the current script treats them as a manual or
  next-API surface because the obvious public endpoints are not exposed in our
  current app-token API surface.

## Bootstrap Script

```bash
node scripts/plane/plane-cockpit-bootstrap.mjs \
  --workspace companyos \
  --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e \
  --json
```

Dry-run is the default. Apply with:

```bash
node scripts/plane/plane-cockpit-bootstrap.mjs \
  --workspace companyos \
  --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e \
  --apply \
  --json
```

The script is idempotent by Plane name.

Auth boundary observed on 2026-05-10:

- `app-token` can read Project, Modules, Cycles and Pages.
- `app-token` cannot create/update Project Overview, Modules, Cycles or Pages
  with the current Plane app scopes (`403`).
- `api-key` is the current bootstrap fallback for native cockpit setup.
- Runtime workers should continue to use app-token by default; API-key remains a
  deliberate bootstrap/admin surface.

## Native Surfaces

| Surface | v0 Action | Notes |
|---|---|---|
| Project Overview | replace demo overview | Makes the project clearly Company.OS, not Plane demo content. |
| Modules | create five Company.OS modules | Runtime, Controller, Dashboard, Department Packs, Release/Cutover. |
| Cycles | create rocket-test and drift-window cycles | Current operating rhythm becomes visible in Plane. |
| Pages | create Control Plane Cockpit page | Operator map for views, event comments and queues. |
| Views | recommended only | API endpoint still needs discovery or UI creation. |

## Module Map

| Module | Owner Bias | Use |
|---|---|---|
| Company.OS - Runtime & Scheduler | CTO/COO | Runtime Dispatcher, token rotation, scheduler, kill switches. |
| Company.OS - Controller & CAO | CAO/CEO | CAO pass, controller verdicts, autonomy calibration. |
| Company.OS - Dashboard Command Center | CTO/CPO | [Client] command center and CEO cockpit surfaces. |
| Company.OS - C-Level Department Packs | CPO/COO | Department-pack work and role-specific queues. |
| Company.OS - Release & Cutover | COO/CEO | Drift windows, release ladder, client rollout. |

## Recommended Views

Create these manually in Plane until the view API is discovered and wrapped:

| View | Filter Intent |
|---|---|
| CEO Review | Items with controller verdict/followup and `next_state: ceo_review`. |
| Dispatch Ready | Items with `dispatch: ready` or dispatch-ready label. |
| Blocked / Needs Human | Items with `BLOCKED_*`, `NEEDS_HUMAN`, or unresolved human gate. |
| Runtime Pilots | Runtime/Scheduler module items and runtime reports. |
| Dashboard / Command Center | Dashboard module items and command-center work. |

## Event Layer

Plane comments remain the machine-readable event bus:

- `worker.lock`
- `worker.context`
- `worker.run-summary`
- `worker.reported`
- `controller.verdict`
- `controller.followup`
- `human_gate.released`
- `KILL COMPA-*`

This is intentionally compatible with Runtime Dispatcher, CAO and Codex
Controller. Native Plane surfaces organize the work; comments remain the exact
machine signal.
