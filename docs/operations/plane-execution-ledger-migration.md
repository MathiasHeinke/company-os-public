# Plane Execution Ledger Migration

Status: migration doctrine; Plane App identity is active
Target release: `0.3.2-alpha.1`
Use for: moving Company.OS from Linear-first execution ledger to Plane-first
execution ledger
Last updated: 2026-05-10

## Purpose

Plane becomes the active Company.OS execution ledger when the migration is
verified.

Linear remains a frozen archive and rollback source until the Plane import,
field mapping, project structure, pages, intake and API preflight are proven.

```text
Linear = read-only historical ledger
Plane = active execution ledger
Company.OS = Plane-first controller doctrine
```

## Why Plane

Plane matches the Company.OS model better than a pure issue tracker:

- work items
- projects
- modules
- cycles
- pages/wiki
- intake
- views and dashboards
- API and webhooks
- import from Linear
- agent-facing surface through API/MCP/OAuth patterns

Company.OS must use Plane-native concepts instead of forcing Linear vocabulary
onto Plane.

## Auth Standard

Plane Cloud API base URL:

```text
https://api.plane.so/
```

Normal Company.OS Plane access uses the installed Plane OAuth App /
bot-token identity documented in
`docs/integrations/plane-app-control-plane.md`.

Direct Plane API keys are emergency/bootstrap-only. When used, they are sent
with:

```text
X-API-Key: <secret>
```

Local keychain convention:

```text
service: Company.OS Plane
account: PLANE_API_KEY
```

Do not store Plane API keys in repo files, reports, Linear, Plane work items or
webhook payload examples.

The setup key used during bootstrap should be rotated after the first
successful write-capable pilot if it crossed chat/session context.

The productized target is the Plane OAuth App, not a long-lived personal API
key. In Mathias' Company.OS workspace, the app is installed and verified; new
automation should default to app-token auth.

Source: `docs/integrations/plane-app-control-plane.md`.

## Required Workspace Slug

Plane API project and work-item endpoints need the workspace slug:

```text
https://app.plane.so/<workspace_slug>/...
```

Record the slug in private ops, keychain metadata or local automation config.
Do not hardcode it into public docs if it is private-client-specific.

## API Sanity

Read-only current-user check:

```bash
node scripts/plane/plane-api-sanity.mjs --json
```

With workspace slug:

```bash
node scripts/plane/plane-api-sanity.mjs \
  --workspace <workspace_slug> \
  --json
```

The same helper uses the Plane App bot token by default:

```bash
node scripts/plane/plane-api-sanity.mjs \
  --workspace <workspace_slug> \
  --auth app-token \
  --json
```

Pass condition:

- `/api/v1/users/me/` returns the authenticated Plane user.
- workspace project list returns HTTP 200 when the slug is correct.
- no secret is printed.
- rate limit headers do not show immediate exhaustion.

## Ledger Preflight

After the API sanity check passes, use the ledger preflight before declaring
Plane active:

```bash
node scripts/plane/plane-ledger-preflight.mjs \
  --workspace <workspace_slug> \
  --json
```

Use the default app-token auth once the Plane App bot token has been exchanged
and stored in Keychain. Pass `--auth api-key` only for explicit emergency or
bootstrap fallback work.

The preflight must check:

- authenticated user endpoint
- workspace project list
- per-project work-item endpoint
- per-project modules endpoint
- per-project cycles endpoint
- per-project pages endpoint
- per-project states endpoint

Release readiness requires at least one reachable project and at least one work
item. A workspace with zero work items can be API-ready, but it is not yet an
execution ledger.

Use `--samples` only for private/internal audits. Do not paste sampled work-item
names into public documentation or client-facing examples unless explicitly
approved.

## Controlled Write Pilot

After read-only preflight passes, create exactly one low-risk Plane work item to
prove write capability:

```bash
node scripts/plane/plane-create-work-item.mjs \
  --workspace <workspace_slug> \
  --project-id <project_uuid> \
  --name "Company.OS 0.3.0 Alpha - Plane controlled write pilot" \
  --description-html "<p>Controlled write pilot. No production systems touched.</p>" \
  --priority low
```

For the app-auth pilot, use an explicit title such as `Company.OS 0.3.1 Alpha
- Plane App controlled write pilot`. The helper defaults to app-token auth.

Rules:

- Run with `--dry-run` first.
- The work item title must clearly say what migration/release it belongs to.
- Do not create generic "test" items.
- Do not move Linear to archive-only until count reconciliation is complete.
- Rotate the setup token after the first write-capable pilot.

## Migration Map

| Linear | Plane | Company.OS use |
|---|---|---|
| Workspace | Workspace | top-level organization boundary |
| Team / project grouping | Teamspace or Project | company/domain grouping |
| Project | Module | release, initiative or portfolio slice |
| Cycle | Cycle | sprint, night shift, weekly review cadence |
| Issue | Work item | executable work contract |
| Sub-issue | Parent/child work item | worker decomposition |
| Document | Page / Wiki | source-of-truth and doctrine |
| Triage / inbox workaround | Intake | inbound requests and bug reports |
| Views | Views / dashboards | C-level, controller and worker cockpit |
| Labels | Labels / custom properties | role, lane, gate and runtime metadata |

Plane's older `/issues/` API paths are not the target for new Company.OS work.
New automation should use `work-items` endpoints.

## Plane-Native Company.OS Fields

Use custom fields or parseable work-item sections where native fields are not
available yet:

```text
RoleOwner:
Agent:
Mode:
Workspace:
AutonomyLevel:
HumanGateLevel:
RunAt:
DependsOn:
SourceOfTruth:
RuntimeAuth:
CostBudget:
KillSwitch:
OutcomeArtifact:
EventPolicy:
EventSink:
StateReducer:
Reporting:
```

Do not encode accountability only in assignee.

## Target Workspace Structure

Workspace:

```text
FYN Labs / Company.OS
```

Projects:

- Company.OS Control Plane
- Company.OS Product / Public Repo
- Company.OS Private Ops
- ARES Core Product
- ARES Growth Engine
- ARES Command Center
- FYN Labs AI Systems
- [SOURCE_WORKSPACE] Founder Office

Modules:

- `0.3.0 Plane Migration`
- `0.3.1 Migration Hardening`
- `0.4 Runtime Alpha`
- `0.5 Quality Beta`
- release radar modules from `[WORK_ITEM_ID]`

Cycles:

- current weekly migration sprint
- Night Shift
- Morning Review
- Weekly CEO Review

Pages/Wiki:

- Company.OS Org Model
- HumanGate Doctrine
- Worker Contract
- Plane Operating Protocol
- Release Radar
- Client Onboarding Discovery
- Private Ops Boundary

## Webhook Policy

Do not enable broad webhooks on day one.

Webhook receiver requirements:

- stable HTTPS payload URL
- shared secret or signature verification if available
- idempotency by `webhook_id`
- replay window
- payload redaction
- event allowlist
- dead-letter log
- no automatic worker dispatch on raw incoming events
- controller gate before state-changing actions

Initial webhook events should be narrow:

- work item created
- work item updated
- comment created

Broad "send me everything" is allowed only for a short read-only capture test in
private ops, never for production dispatch.

## 0.3.0 Alpha Release Bar

`0.3.0-alpha` can be cut when:

- Plane API read-only preflight passes.
- Plane ledger preflight passes and returns at least one project plus one work
  item.
- One controlled Plane write pilot succeeds.
- Linear import completes.
- Imported project/module/cycle/work-item counts are checked.
- Company.OS project structure exists in Plane.
- Plane pages contain core doctrines or links to source docs.
- Intake is enabled for at least one project.
- Company.OS docs state Plane as the active execution ledger.
- Linear is frozen as archive/rollback.
- No scheduled controller writes to Linear as the primary ledger.

## 0.3.1 Alpha Patch Bar

`0.3.1-alpha` is for immediate migration hardening:

- headless Plane helper
- Plane OAuth App / bot-token control-plane adapter
- Plane ledger preflight in nightly controller wrapper
- Plane dedupe checks
- Plane work-item template mapping
- webhook receiver dry-run
- migration count reconciliation
- Linear-to-Plane link map
- morning brief Plane summary

## 0.3.2 Alpha Patch Bar

`0.3.2-alpha.1` is the post-migration hardening baseline:

- Plane App / OAuth bot-token is the default automation identity.
- Direct Plane API keys are bootstrap/emergency fallback only.
- Plane migration and reconciliation reports are committed as guided-alpha
  evidence.
- Contract Controller Stage 0.5 blocks weak worker contracts before lock.
- Contract Remediation Router Stage 0.6 routes repairs to the owning C-Level
  seat before CEO/Founder escalation.
- Runtime activation remains gated until repeated scheduler/controller/worker
  runs prove the path.
