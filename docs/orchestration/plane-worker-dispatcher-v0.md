# Plane Worker Dispatcher v0

Status: design + scaffold (not auto-runnable in production)
Phase: read + validate + lock-comment + report. **No worker spawn. No Done
transition.**
Use for: bounded, observable handoff between Plane work items and Claude Code
worker runs, gated by HumanGate before any auto-dispatch is enabled
Last updated: 2026-05-08

## Purpose

The dispatcher turns "open Plane work item" into "ready-to-paste Claude Code
prompt", with hard preflight checks. v0 deliberately does not spawn anything.
It tells the operator: *this work item passes the contract, here is the run
prompt, here is the lock comment that I am about to write*. The operator (or
a later v1 with HG-2 release) does the actual run.

Before v0 writes `worker.lock`, Stage 0.5 Contract Controller must have posted
a fresh `controller.contract-review` PASS for the same description hash. The
dispatcher defaults to `--contract-review require`; weak contracts are repaired
before a worker sees them. If Stage 0.5 does not PASS, Stage 0.6 Contract
Remediation Router posts `controller.remediation-routed` so the owning C-Level
seat repairs the handoff before any dispatcher lock.

## Inputs

The dispatcher reads Plane work items in the CompanyOS workspace that satisfy
all of the following:

```text
state          : not Done, not Cancelled, not Backlog
labels         : exactly one role:cto | role:cpo | role:cmo | role:coo | role:cfo | role:cao
custom field   : agent = claude | codex | gemini | human
custom field   : dispatch = ready
custom field   : mode = audit | plan | implement | verify | research | report | review
description    : satisfies docs/templates/worker-issue-contract.md required fields
comments       : latest controller.contract-review is CONTRACT_PASS and not stale
```

In Phase 1 (Plane "Build your own app" custom fields not yet enforced
project-wide), the dispatcher reads the same fields from a fenced YAML block
inside the work item description. The validator falls back to that block when
Plane custom fields are missing.

Contract parseability is a hard triage gate. The description must contain one
fenced block using `yaml`, `worker-issue-contract`, or `contract`, and the
dispatcher-required fields must be flat keys at column 0. Nested wrappers such
as `worker_issue_contract:` or prose-only contracts are invalid because the
Phase 1 validator intentionally does not parse full YAML. If this shape is
wrong, the dispatcher rejects with `contract.required-field-missing`; workers
must not repair CEO triage metadata as part of their own run. When the
description nests required keys under a parent block (`worker_issue_contract:`,
`contract:`, `metadata:`, or a legacy nested `human_gate:`), the validator
emits the more specific `contract.fields-wrapped-in-parent-block` reject so
operators can locate the wrapper without re-reading the raw description.

Plane stores rich-text descriptions as TipTap-rendered HTML; the dispatcher
strips HTML and decodes named/numeric entities (`&quot;`, `&#39;`, `&#x27;`)
before parsing. The Markdown fence (` ```yaml ` or ` ```worker-issue-contract `)
must therefore survive the round-trip — keep contract fences inside a single
`<pre><code>` block in Plane and avoid hand-edits that re-flow the fence.

Run `node scripts/orchestration/worker-ledger-validator.mjs --examples` for
the canonical Markdown shape, the Plane HTML round-trip shape, and the nested
wrapper shapes that the validator REJECTs. Pair with `--json` to consume the
catalog from automation.

## Output

v0 is **comment-only**. No file-system event-row append in this version.

For each accepted work item the dispatcher emits:

```text
- one Plane comment    : worker.lock     (machine-readable YAML block)
- one Plane comment    : worker.context  (Claude Code prompt + source of truth links)
```

For each rejected work item, v0 writes nothing by default. It returns a
machine-readable rejection result to stdout/stderr so the operator or CAO can
decide whether to append a verdict comment:

```text
- no Plane comment
- no state transition
- reject result includes stable reason codes
```

`metrics/agent-events.jsonl` append is **Phase 2**. Tracked under
`docs/operations/agent-event-ledger.md` and gated by a separate work item
once the dispatcher has earned at least one CAO PASS in Phase 1.

The dispatcher **does not**:

- transition the work item to a different state
- mark anything Done
- start a Claude Code or Codex run
- write to Linear
- send webhooks
- modify labels (Phase 1 uses comment-based locks; see Lock Source below)
- append rows to `metrics/agent-events.jsonl` (Phase 2)

## Reject Matrix

| Code | Meaning |
|---|---|
| `role.label.missing` | No `role:*` label. |
| `role.label.multiple` | More than one `role:*` label. |
| `role.label.unknown` | A `role:*` label that is not in the canonical set. |
| `role.label.changed-mid-run` | A re-dispatch of an item whose role label moved since the last lock. |
| `role.cao.created-by-non-cao-seat` | Item carries `role:cao` but was authored by another seat. |
| `contract.required-field-missing` | One of `role`, `parent_seat`, `agent`, `mode`, `workspace`, `dispatch`, `source_of_truth`, `acceptance_criteria`, `gates`, `human_gate`, `reporting` is missing. |
| `contract.fields-wrapped-in-parent-block` | The fenced block contains indented `key:value` continuations under a parent like `worker_issue_contract:`, `contract:`, `metadata:`, or a legacy nested `human_gate:`. Required fields must be flat at column 0; only `- item` array rows may indent under a flat key. |
| `contract.parent_seat-mismatch` | `parent_seat` does not match the parent work item's role label. |
| `contract.unknown-agent` | `agent` value not in the supported runtime set. |
| `contract.unknown-mode` | `mode` not in the supported worker mode set. |
| `contract.dispatch-not-ready` | `dispatch` is not `ready`. |
| `contract.source-of-truth-empty` | `source_of_truth` block has no entries. |
| `contract.gates-empty` | `gates` block has no entries. |
| `contract-review.missing` | No `controller.contract-review` comment exists. |
| `contract-review.stale` | Latest `controller.contract-review` was signed against an older description hash. |
| `contract-review.not-pass` | Latest `controller.contract-review` verdict is not `CONTRACT_PASS`. |
| `remediation.*` | Stage 0.6 routing reason emitted by `contract-remediation-router.mjs`; the item is a C-Level remediation task until Stage 0.5 passes. |
| `contract-review.unparseable` | Latest `controller.contract-review` comment cannot be parsed as the expected YAML shape. |
| `runtime.auth-preflight-failed` | Plane App bot token expired or missing. |
| `runtime.workspace-mismatch` | Item's workspace slug differs from `companyos`. |
| `safety.blocked-action-requested` | Description requests an explicitly blocked action (push, deploy, schema change, public publish, Linear write outside bridge, Plane Done). |
| `safety.scope-too-broad` | Scope description triggers the broad-scope heuristic. |
| `lock.duplicate` | An unexpired `worker.lock (dispatcher-v0)` comment already exists on the work item. |
| `runtime.label-map-missing` | Label-map fallback was invoked, but the map file is absent at the resolved path. |
| `runtime.label-map-malformed` | Label-map fallback was invoked, but the JSON shape, version, or entry validation failed. |
| `runtime.label-map-mismatch` | Label-map workspace or project_id does not match the dispatcher's invocation. |
| `runtime.label-map-incomplete` | The work item carries label UUIDs that have no corresponding entry in the label map. |

The reject codes are stable identifiers. New codes are added by extending
this matrix; codes are not renamed.

## Stage 0.5 Contract Review Gate

The dispatcher enforces the Contract Controller by default:

```bash
node scripts/orchestration/plane-dispatcher-v0.mjs \
  --workspace companyos \
  --project-id <project-id> \
  --work-item-id <work-item-id> \
  --mode lock \
  --contract-review require
```

`require` means:

- latest `controller.contract-review` exists
- verdict is `CONTRACT_PASS`
- `description_hash` in that comment equals the current canonical description
  hash

If any condition fails, the dispatcher rejects before lock. `--contract-review
warn` is for migrations only; `--contract-review off` is for
controller-approved bootstrap/debug runs.

## Lock Source (v0)

The lock in v0 is a **Plane comment**, not a Plane label.

A Plane comment whose body starts with the string
`worker.lock (dispatcher-v0)` and contains a fenced block matching the
shape below is treated as an active lock for that work item. There is no
`lock:dispatcher` label in v0; using a label-based lock is deferred to a
later phase because (a) the Phase 1 App identity lacks
`projects.labels:write` scope and (b) a single lock source is easier to
reason about than two.

## Lock Comment Shape

```yaml
worker.lock:
  version: dispatcher-v0
  parent_id: <plane-work-item-uuid>
  parent_sequence: COMPA-<n>
  role: role:cto | role:cpo | role:cmo | role:coo | role:cfo | role:cao
  parent_seat: <role:* of parent if any, else none>
  agent: claude | codex | gemini | human
  mode: audit | plan | implement | verify | research | report | review
  workspace: companyos
  dispatch: ready
  human_gate:
    level: HG-0 | HG-1 | HG-2 | HG-3
    owner: CEO | Founder | delegated-human
  acceptance_summary: <one-line>
  expires_at: <ISO-8601 + 90 minutes default>
  dispatcher_run_id: <uuid>
  hash:
    description: <sha256 of work item description at lock time>
    labels: <sha256 of sorted label set>
```

Lock invariants:

- **One active lock per work item.** Before posting `worker.lock`, the
  dispatcher must list the work item's existing comments, look for any
  prior `worker.lock (dispatcher-v0)` whose `expires_at` has not passed,
  and reject with `lock.duplicate` if found.
- The lock is **released** by a CAO `controller.verdict` comment that
  references the same `dispatcher_run_id`. The dispatcher does not release
  its own lock.
- `expires_at` (default +90 minutes) is the soft recovery boundary for
  stuck runs. After expiry, a fresh dispatch is allowed; the new
  `worker.lock` references the previous `dispatcher_run_id` in a
  `superseded` field for traceability.

## Context Comment Shape

The context comment is a single Plane comment containing exactly:

1. A short one-paragraph framing.
2. A fenced code block with the Claude Code (or Codex/Gemini) run prompt.
3. A bullet list of source-of-truth absolute paths.
4. The lock identifier so the operator can correlate.

The prompt is **not** auto-executed in v0. The operator copy-pastes it.

## CAO Handoff

Once the worker run is complete and reported, the work item moves to the
CAO. The CAO seat reads:

- the lock comment
- the worker report comment
- the original description hash from the lock to detect mid-run mutation
- the role-specific controller checklist

The CAO emits a `controller.verdict` comment with one of:

```text
PASS    -> work item transitions to ceo:review (state name TBD per Plane state set)
REJECT  -> work item transitions back to c-level:<role>:planning
PARK    -> work item transitions to parked with rationale
```

The CAO never marks Done. Done is CEO/Codex.

## Run Modes

Phase 1 supports two run modes:

- `--mode dry-run` (default): read + validate + emit reject reasons + print
  what the lock + context comments would look like. **Writes nothing.**
- `--mode lock`: validation must pass; writes lock + context comments;
  still no spawn, still no Done, still no event-row append.

A future `--mode dispatch` is **not** in v0 and requires HG-2 release plus a
documented kill switch.

## Acceptance for v0

- Dispatcher script `scripts/orchestration/plane-dispatcher-v0.mjs` exists.
- `--mode dry-run` produces a reject-or-accept verdict without any Plane
  writes.
- `--mode lock` writes exactly one lock comment + one context comment per
  accepted item, no state transitions, no label changes.
- `--mode lock` performs the lock-dedupe check before posting; if an
  unexpired `worker.lock (dispatcher-v0)` already exists, the run is
  rejected with `lock.duplicate` and no new comments are written.
- All reject codes from the matrix are emitted with the exact strings.
- Worker Issue Contract validator
  (`scripts/orchestration/worker-ledger-validator.mjs`) is invoked before
  emitting `worker.lock`.
- No Plane Done transition occurs in any code path.
- No Linear writes occur.
- No webhooks are subscribed or fired.

## Out of Scope for v0

- Auto-running Claude Code / Codex sessions.
- Auto-promoting CAO PASS to Done.
- Cron / scheduler integration.
- Webhook receiver.
- Cross-workspace dispatch.
- Linear write surfaces.

These are tracked as separate work items under `role:cto` and require their
own HG-2 releases.
