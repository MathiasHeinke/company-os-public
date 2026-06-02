# Sandbox Branch Lane

Status: live pilot doctrine
Use for: L3 implementation by external agents

## Principle

Edit-capable worker execution is never direct production work. It is isolated
branch work that produces an auditable artifact.

```text
read-only audit or plan
-> controller decision
-> sandbox branch and worktree
-> worker implementation
-> controller audit of sandbox branch
-> rework loop or ready-for-human-review
-> human integration decision
```

Workers may create patches in the sandbox worktree. They must not merge, push,
deploy, publish, write production data, write memory, or mark Linear issues
`Done`.

## Required Conditions

Sandbox implementation is allowed only when all conditions are true:

- the parent issue has passed controller review
- `Mode: implement` is explicitly approved for the worker issue
- `AutonomyLevel: L3` is present
- `RoleOwner` and `HumanGateOwner` are present
- the workspace resolves through the workspace registry
- source-of-truth, scope, acceptance criteria, gates and reporting are present
- runtime auth has been verified
- the controller created or approved a deterministic branch/worktree

`RunAt` only controls the earliest dispatch time. It does not grant edit
permission by itself.

## Branch Contract

Branch names must be deterministic and human-readable:

```text
codex/sandbox/<workspace>/<YYYY-MM-DD>-<issue>-<worker>-<role-owner>-<task-slug>-<hhmmss>
```

Example:

```text
codex/sandbox/product-api/2026-05-07-cos-145-claude-cto-backend-slice-113500
```

Rules:

- `<workspace>` is the registry key, not an arbitrary folder name.
- `<issue>` is the lowercase Linear identifier.
- `<worker>` is the runtime agent, for example `claude`.
- `<role-owner>` is the accountable management role, for example `cto`.
- `<task-slug>` is a short kebab-case task slug.
- `<hhmmss>` prevents collisions during repeated controller passes.

## Worktree Contract

Sandbox worktrees live under:

```text
<developer-root>/[SOURCE_WORKSPACE]/
```

Recommended shape:

```text
<developer-root>/[SOURCE_WORKSPACE]/<workspace>/<YYYY-MM-DD>-<issue>-<worker>-<role-owner>-<task-slug>-<hhmmss>/
```

The source workspace should stay clean whenever possible. If the source
workspace is already dirty during a pilot, the controller must state that the
sandbox worktree is created from `HEAD` and that unrelated dirty source-workspace
changes were not copied, reverted or treated as worker output.

## Controller Audit

After the worker reports, the controller audits the sandbox branch before any
human review or integration decision.

Minimum controller audit:

- compare branch against the expected base
- inspect changed files and touched symbols
- run GitNexus `detect-changes` or the nearest available equivalent
- run the worker issue's test, build and lint gates where applicable
- verify no forbidden actions happened
- verify acceptance criteria are actually met
- produce one of:
  - `needs-rework`
  - `ready-for-human-review`
  - `blocked`
  - `reject`

The controller may create a bounded rework issue. It must not silently merge a
sandbox branch.

If a worker exits by reaching `max-turns`, the controller classifies the attempt
as `scope-too-broad` unless evidence proves a runtime/tool failure instead. The
controller must not rerun the same broad prompt. It should create a narrower
rework slice with one measurable outcome.

Raw worker reports must be written and reported as absolute paths. Relative
paths such as `reports/private/...` are invalid for cross-workspace controller
handoff because the worker cwd may be a sandbox worktree.

## Owner And Review Lenses

`Agent` is runtime. `RoleOwner` is accountability.

Default implementation ownership:

```text
RoleOwner: CTO
Department: Engineering
AccountableLayer: C-Level
ReportsTo: CEO
AutonomyLevel: L3
HumanGateOwner: Founder
```

`CEO` is the operational orchestrator role for this lane. The controller is a
stable meta-agent with scripted review lenses. Specialist personas are review
lenses or bounded audit workers, not floating owners.

Default lenses:

- CTO Architecture: contract, tests, data model, reversibility
- Security: auth, RLS, secrets, unsafe data exposure, permission escalation
- CPO Product: workflow completion, UX fit, customer value
- COO Operations: sequencing, dependencies, handoff quality
- Kahneman: bias, overconfidence, premature convergence
- Sherlock: evidence gaps, contradictions, unproven assumptions
- Legal/Compliance: regulated claims, privacy, medical/legal risk

Spawn a separate persona worker only when the scope is high-risk, cross-domain,
or too large for one controller audit. A spawned persona worker needs its own
parseable issue or controller subtask, bounded scope, report target and gates.

## Stop Rules

Stop before:

- production writes or migrations
- RLS, auth, service-role or customer-impacting schema changes
- public publishing, outreach or regulated medical/legal/Rx claims
- new spend or paid API activation
- merge, push, deploy or release
- direct Memory/Honcho writes by the worker
- direct Linear `Done`
- unclear source-of-truth, missing owner, missing gates or active lock conflict

The morning CEO review should see sandbox branches, controller verdicts,
remaining risk, and recommended integration order, not raw implementation noise.

## Executable Readiness Gate

Use `docs/operations/sandbox-pr-autopilot.md` and
`scripts/sandbox-pr/prepare-sandbox-pr-pilot.mjs` to validate whether an L3
worker contract is ready for sandbox PR handling.

The readiness gate may create a draft PR packet without touching git. It may
append `sandbox.created` events only when `--create-worktree` actually creates
the git worktree. A packet alone is not a created sandbox.
