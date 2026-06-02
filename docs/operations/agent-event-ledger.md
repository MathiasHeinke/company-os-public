# Agent Event Ledger

Status: canonical contract
Use for: scheduled agents, sandbox workers, controller reviews, memory proposals,
webhooks and managed-agent adapters

## Purpose

The Agent Event Ledger is the machine-readable state stream for Company.OS
agent work.

`metrics/agent-events.jsonl` records typed state transitions. Each row describes
one event in one run, issue, sandbox, review or memory workflow.

`metrics/agent-runs.jsonl` remains the backward-compatible run summary ledger.
It can continue to hold one row per run while new runners append detailed state
events to `metrics/agent-events.jsonl`.

Human-readable Linear comments and Markdown reports are evidence surfaces. The
controller state, morning brief and webhook fan-out should reduce from event
rows instead of scraping prose.

## Ledger Files

| File | Role | Cardinality |
|---|---|---|
| `metrics/agent-events.jsonl` | Canonical typed event stream | many rows per run |
| `metrics/agent-runs.jsonl` | Legacy and summary run ledger | one row per run |
| `metrics/agent-events.example.jsonl` | Sanitized example rows | sample only |

The event ledger is append-only. Corrections are represented by new events, not
by editing historical rows.

## Base Event Row

Every line in `metrics/agent-events.jsonl` must be valid JSON with this base
shape:

```json
{
  "schema_version": "agent-event/v1",
  "event_id": "evt_20260507_000001",
  "event_type": "worker.locked",
  "occurred_at": "2026-05-07T20:00:00Z",
  "producer": "controller",
  "workspace": "registry:company-os",
  "workspace_path": "/absolute/path/to/workspace",
  "issue_id": "COS-123",
  "parent_issue_id": "COS-100",
  "run_id": "run_20260507_cos123_claude_audit",
  "session_id": "session_20260507_night_controller",
  "agent": "claude",
  "mode": "audit",
  "role_owner": "CTO",
  "department": "Engineering",
  "autonomy_level": "L2",
  "event_policy": "issue-state-from-agent-events",
  "payload": {},
  "artifact_paths": [],
  "linear_comment_ids": [],
  "human_gate_required": false,
  "redaction_level": "internal",
  "previous_event_id": null
}
```

## Base Field Rules

| Field | Rule |
|---|---|
| `schema_version` | Required. Current value: `agent-event/v1`. |
| `event_id` | Required. Globally unique and stable. Used for idempotency. |
| `event_type` | Required. Must use one of the canonical event types or a documented local extension. |
| `occurred_at` | Required. UTC ISO 8601 timestamp with `Z`. |
| `producer` | Required. One of `scheduler`, `runner`, `worker`, `controller`, `human`, `webhook`, `managed-agent-adapter`. |
| `workspace` | Required. Prefer `registry:<key>` for portable docs. |
| `workspace_path` | Required for local runs. Must be absolute when present. |
| `issue_id` | Required when the event belongs to execution-ledger work. |
| `parent_issue_id` | Required for child worker issues when a controller parent exists. |
| `run_id` | Required for worker and controller events. Stable for one dispatch attempt. |
| `session_id` | Required for scheduled, multiagent or managed-agent compatible sessions. |
| `agent` | Runtime executor: `claude`, `gemini`, `codex`, `human`, `managed-agent`, or local extension. |
| `mode` | Worker mode: `audit`, `plan`, `implement`, `verify`, `research`, `report`, `review`. |
| `role_owner` | Accountable role whose bar applies. This is not the runtime agent. |
| `department` | Owning department. Used for morning boards and trend reviews. |
| `autonomy_level` | `L0` through `L5`. |
| `event_policy` | Reducer contract name, normally `issue-state-from-agent-events`. |
| `payload` | Event-type-specific object. Do not put prose-only summaries here. |
| `artifact_paths` | Absolute paths to reports, branches, logs or generated artifacts. |
| `linear_comment_ids` | Comment IDs created for the same state transition. |
| `human_gate_required` | True when this event blocks autonomous progress. |
| `redaction_level` | `public`, `internal`, `private`, `confidential` or `regulated`. |
| `previous_event_id` | Optional chain pointer for same run/session. |

Never include secrets, API keys, raw private memory, raw customer data or
regulated details in event payloads. Store sensitive evidence in ignored private
reports and point to the artifact path only when policy allows it.

## Canonical Event Types

| Event Type | Producer | Meaning |
|---|---|---|
| `worker.locked` | controller or runner | A bounded worker owns the issue/run scope. |
| `worker.heartbeat` | runner or worker | Worker is still alive and within scope. |
| `worker.blocked` | worker, runner or controller | Worker cannot proceed because of a blocker. |
| `worker.reported` | worker or runner | Worker produced a report, patch or artifact. |
| `sandbox.created` | controller or runner | L3 sandbox branch/worktree exists. |
| `sandbox.patch_produced` | worker or runner | Sandbox contains changed files for controller audit. |
| `sandbox.max_turns_reached` | runner | Worker stopped because the prompt or scope was too broad. |
| `sandbox.rework_requested` | controller | Controller asks for a bounded follow-up pass. |
| `controller.audit_started` | controller | Controller has started review of a worker result. |
| `controller.verdict` | controller | Controller emits canonical review verdict and state recommendation. |
| `human_gate.required` | controller, human or policy | Human/CEO/founder decision is required before progress. |
| `human_gate.released` | human | Human gate is explicitly released. |
| `human_gate.rejected` | human | Human gate blocks or rejects the proposed action. |
| `memory.proposal_created` | controller or worker | Learning is proposed for memory, SOP, skill or knowledge base. |
| `memory.dream_requested` | controller or scheduler | Memory consolidation is requested. |
| `memory.dream_reviewed` | controller or human | Dream output was reviewed and accepted, rejected or split. |
| `runtime.auth_passed` | runner | Runtime auth sentinel passed before dispatch. |
| `runtime.auth_failed` | runner | Runtime auth sentinel failed before dispatch. |
| `runtime.timeout` | runner | Run exceeded approved runtime. |
| `runtime.killed` | runner, controller or human | Kill switch stopped the run. |
| `ledger.run_summarized` | controller or runner | Backward-compatible run summary row was produced. |

Local extensions must use a namespaced prefix such as
`vendor.event_name` or `department.event_name` and must not override canonical
semantics.

## Event Payload Contracts

### worker.locked

```json
{
  "lock_id": "lock_cos123_20260507",
  "locked_by": "controller",
  "scope_hash": "sha256:...",
  "max_runtime_minutes": 90,
  "heartbeat_interval_minutes": 15,
  "kill_switch": "issue #stop",
  "allowed_actions": ["read_source", "write_report", "append_event"]
}
```

### worker.heartbeat

```json
{
  "lock_id": "lock_cos123_20260507",
  "state": "running",
  "progress": "read source docs, preparing report",
  "last_artifact_path": "/absolute/path/to/report-draft.md",
  "next_check_at": "2026-05-07T20:15:00Z"
}
```

### worker.blocked

```json
{
  "blocker_type": "runtime_auth | dependency | source_missing | permission | test_failure | scope_ambiguous | external_service",
  "blocker": "Claude auth sentinel failed",
  "recoverable_by_worker": false,
  "required_action": "restore runtime auth and rerun sentinel"
}
```

### worker.reported

```json
{
  "result_type": "report | plan | patch | test_result | audit",
  "summary": "bounded worker report produced",
  "changed_files": [],
  "commands": [
    {
      "command": "git diff --check",
      "result": "pass"
    }
  ],
  "needs_controller_audit": true
}
```

### sandbox.created

```json
{
  "branch_name": "codex/sandbox/product-api/2026-05-07-cos-123-claude-cto-backend-slice-200000",
  "worktree_path": "/absolute/path/to/[SOURCE_WORKSPACE]/product-api/2026-05-07-cos-123-claude-cto-backend-slice-200000",
  "integration_target": "main",
  "sandbox_policy": "docs/operations/sandbox-branch-lane.md"
}
```

### sandbox.patch_produced

```json
{
  "branch_name": "codex/sandbox/product-api/2026-05-07-cos-123-claude-cto-backend-slice-200000",
  "changed_files": ["src/example.ts"],
  "commit_id": null,
  "tests": [
    {
      "command": "npm test",
      "result": "pass"
    }
  ],
  "merge_ready_claimed_by_worker": false
}
```

### sandbox.max_turns_reached

```json
{
  "max_turns": 30,
  "classification": "scope-too-broad | runtime-blocker | tool-blocker",
  "retry_policy": "split-before-rerun",
  "required_rework": "create narrower child issue"
}
```

### controller.audit_started

```json
{
  "target_event_id": "evt_20260507_worker_reported",
  "audit_scope": "sandbox branch and worker report",
  "review_harness": "docs/harnesses/canonical-agent-review-harness.md",
  "started_by": "controller"
}
```

### controller.verdict

```json
{
  "review_verdict": "PASS | NEEDS_REWORK | BLOCKED | NEEDS_HUMAN | REJECT",
  "autonomy_recommendation": "PROMOTE | KEEP | RESTRICT | RETRAIN | RETIRE | NO_CHANGE",
  "total_self_score": 18,
  "total_controller_score": 15,
  "calibration_gap": 3,
  "ceo_intent_fit_score": 9,
  "ceo_would_accept": "yes | probably | uncertain | no",
  "customer_ship": "embarrassing | usable internally | shippable",
  "root_cause": ["gate missing", "evidence quality"],
  "required_rework": "narrow next worker issue",
  "next_state": "ready-for-human-review",
  "merge_state": "not-ready-to-merge",
  "memory_update_policy": "none | proposal-only | controller-approved"
}
```

`controller.verdict` must follow
`docs/harnesses/canonical-agent-review-harness.md`. `ReviewVerdict` judges the
work. `AutonomyRecommendation` judges future permissions.

### human_gate.required

```json
{
  "gate_owner": "Founder | CEO | CTO | CPO | Legal | delegated-human",
  "decision": "approve sandbox integration",
  "options": ["approve", "reject", "split", "park"],
  "blocks": ["merge", "done", "production-write"],
  "decision_surface": "/absolute/path/to/controller-review.md"
}
```

### human_gate.released

```json
{
  "gate_owner": "Codex-GPT-5.5-xhigh",
  "released_by": "Codex-GPT-5.5-xhigh",
  "level": "HG-1 | HG-2 | HG-3",
  "founder_prediction_confidence": 0.9,
  "decision": "approve bounded reversible action",
  "conditions": ["no production writes", "no Linear Done"],
  "blocked_actions_still_forbidden": ["merge", "deploy", "production_write", "linear_done"],
  "decision_reference": "Linear comment ID or local report path",
  "release_validation": {
    "schema_version": "human-gate-release/v1",
    "status": "pass",
    "check_count": 12,
    "blocker_count": 0,
    "decision_path": "/absolute/path/to/decision-card.md"
  }
}
```

HG-1/HG-2 release events must be produced by the HumanGate Release Validator.
They require passing `release_validation`, threshold-level
`founder_prediction_confidence`, and explicit `blocked_actions_still_forbidden`.
HG-3 release events may be released by CEO/Codex critical authority when
`release_validation` passes, `CEO_CRITICAL` authority is present and rollback or
restore evidence is verified. HG-4 release events may only be released by
`Founder` or `human`.

### human_gate.rejected

```json
{
  "gate_owner": "Founder",
  "rejected_by": "human",
  "decision": "approve sandbox integration",
  "reason": "scope or risk unacceptable",
  "next_action": "split and rerun controller plan"
}
```

### memory.proposal_created

```json
{
  "proposal_type": "memory | sop | skill | harness | knowledge-base | eval",
  "store": "honcho | memory-bank | wiki | adr | skill-library",
  "summary": "controller proposes a reusable runtime-auth invariant",
  "proposal_path": "/absolute/path/to/memory-proposal.md",
  "requires_review": true,
  "durable_write_performed": false
}
```

Workers may create memory proposals. Durable memory writes require controller
or human approval according to `DreamPolicy`.

### memory.dream_requested

```json
{
  "store": "honcho | memory-bank | wiki | adr | skill-library",
  "scope": "night-shift controller learnings",
  "input_artifacts": ["/absolute/path/to/controller-report.md"],
  "review_required": true
}
```

### memory.dream_reviewed

```json
{
  "store": "honcho | memory-bank | wiki | adr | skill-library",
  "review_verdict": "accepted | rejected | split | needs_rework",
  "accepted_outputs": ["/absolute/path/to/adr.md"],
  "rejected_outputs": [],
  "durable_write_performed": true
}
```

### runtime.auth_passed

```json
{
  "runtime": "claude-code",
  "sentinel_command": "claude -p \"Return exactly: CLAUDE_AUTH_OK\" ...",
  "sentinel_output": "CLAUDE_AUTH_OK"
}
```

### runtime.auth_failed

```json
{
  "runtime": "claude-code",
  "sentinel_command": "claude -p \"Return exactly: CLAUDE_AUTH_OK\" ...",
  "failure": "Not logged in",
  "blocks_dispatch": true
}
```

### ledger.run_summarized

```json
{
  "summary_row_path": "/absolute/path/to/metrics/agent-runs.jsonl",
  "legacy_agent_run_id": "company-os-2026-05-07-example-001",
  "summary_status": "ready-for-review",
  "summary_verdict": "PASS",
  "report_path": "/absolute/path/to/report.md"
}
```

## State Reducer

The canonical reducer is `issue-state-from-agent-events`.

Input:

1. All events for one issue, parent issue, run or session.
2. Sort by `occurred_at`, then by append order when timestamps tie.
3. Ignore duplicate `event_id` rows after the first occurrence.
4. Apply event-specific transitions.

Output shape:

```json
{
  "issue_id": "COS-123",
  "parent_issue_id": "COS-100",
  "run_id": "run_20260507_cos123_claude_audit",
  "worker_state": "running",
  "controller_state": "audit_required",
  "issue_state_recommendation": "in_progress",
  "merge_state": "not_ready_to_merge",
  "human_gate_state": "none",
  "memory_state": "none",
  "last_event_id": "evt_20260507_000003",
  "blocking_reasons": [],
  "next_action": "wait for worker report"
}
```

### Worker State

Allowed values:

```text
idle
locked
running
blocked
reported
needs_audit
cancelled
timed_out
```

Transitions:

- `worker.locked` -> `locked`
- `worker.heartbeat` -> `running`
- `worker.blocked` -> `blocked`
- `worker.reported` -> `reported`
- `worker.reported` with `needs_controller_audit: true` -> `needs_audit`
- `sandbox.patch_produced` -> `needs_audit`
- `runtime.timeout` or `sandbox.max_turns_reached` -> `timed_out`
- `runtime.killed` -> `cancelled`

### Controller State

Allowed values:

```text
none
audit_required
audit_running
needs_rework
ready_for_gate_review
blocked
reject
pass
```

`ready_for_gate_review` is deliberately not "ready for human review". It covers
CEO/Codex `HG-2.5` / `HG-3`, Chief-of-Staff `HG-3.5` and Founder `HG-4`.
Only `HG-4` is a real human/founder interruption.

Transitions:

- `worker.reported` -> `audit_required`
- `sandbox.patch_produced` -> `audit_required`
- `controller.audit_started` -> `audit_running`
- `controller.verdict` with `PASS` -> `pass`, unless a decision gate or sandbox
  integration gate is still required
- `controller.verdict` with `NEEDS_REWORK` -> `needs_rework`
- `controller.verdict` with `BLOCKED` -> `blocked`
- `controller.verdict` with `NEEDS_HUMAN` -> `ready_for_gate_review`
- `controller.verdict` with `REJECT` -> `reject`
- `human_gate.required` overrides to `ready_for_gate_review`

### Issue State Recommendation

Allowed values:

```text
intake
in_progress
blocked
needs_human
verified
done_candidate
parked
rejected
```

`needs_human` is the legacy state token for a required decision gate. New UI
and reports must render it as decision-gate review unless the event payload
declares `level: HG-4`.

Transitions:

- `worker.locked`, `worker.heartbeat`, `sandbox.created` -> `in_progress`
- `worker.blocked`, `runtime.auth_failed`, `runtime.timeout`,
  `runtime.killed` -> `blocked`
- `worker.reported`, `sandbox.patch_produced` -> `in_progress`
- `controller.verdict` with `PASS` -> `verified`
- `controller.verdict` with `PASS` and no human gate, no sandbox gate and no
  dependency gate -> `done_candidate`
- `controller.verdict` with `NEEDS_REWORK` -> `in_progress`
- `controller.verdict` with `BLOCKED` -> `blocked`
- `controller.verdict` with `NEEDS_HUMAN` -> `needs_human`
- `controller.verdict` with `REJECT` -> `rejected`
- `human_gate.required` -> `needs_human`
- `human_gate.released` may remove `needs_human`, but does not directly mark
  work done
- `human_gate.rejected` -> `rejected`

### Merge State

Allowed values:

```text
not_applicable
not_ready_to_merge
ready_for_gate_review
merge_gated
merged
rejected
```

Transitions:

- `sandbox.created` -> `not_ready_to_merge`
- `sandbox.patch_produced` -> `not_ready_to_merge`
- `controller.verdict` with `PASS` for sandbox work -> `ready_for_gate_review`
- `controller.verdict` with `NEEDS_HUMAN` -> `merge_gated`
- `human_gate.required` blocking merge -> `merge_gated`
- `human_gate.released` can move `merge_gated` to `ready_for_gate_review`
- `human_gate.rejected` or `controller.verdict` with `REJECT` -> `rejected`

No event except a future explicit integration event may set `merged`.

### Human Gate State

Allowed values:

```text
none
required
released
rejected
```

Transitions:

- `human_gate.required` -> `required`
- `controller.verdict` with `NEEDS_HUMAN` -> `required`
- `human_gate.released` -> `released`
- `human_gate.rejected` -> `rejected`

Human gate release never implies direct production write, merge, memory write
or `Done` unless the released gate explicitly covers that action.

### Memory State

Allowed values:

```text
none
proposal_created
dream_requested
dream_reviewed
approved
rejected
```

Transitions:

- `memory.proposal_created` -> `proposal_created`
- `memory.dream_requested` -> `dream_requested`
- `memory.dream_reviewed` with `accepted` -> `approved`
- `memory.dream_reviewed` with `rejected` -> `rejected`
- `memory.dream_reviewed` with `split` or `needs_rework` -> `dream_reviewed`

Memory proposal events never perform durable memory writes. Durable writes are
tracked only when a controller or human-reviewed event says they happened.

## Controller Morning Brief Projection

Morning CEO briefs should use the reducer output, not raw report inventory.

Minimum projection:

- active workers by `worker_state`
- blocked work and exact blocker type
- sandbox branches ready for controller audit
- controller verdicts that require human review
- memory proposals awaiting review
- top three dispatch candidates after dependency and gate filtering
- stale locks or missing heartbeats

## Legacy Mapping

Historical `metrics/agent-runs.jsonl` rows can be mapped into event rows for
trend review without changing the old file.

| Legacy Field | Event Mapping |
|---|---|
| `agent_run_id` | `run_id`, plus `ledger.run_summarized.payload.legacy_agent_run_id` |
| `timestamp` | `occurred_at` after normalizing to UTC |
| `workspace` | `workspace` |
| `workspace_path` | `workspace_path` |
| `agent` | `agent` |
| `mode` | `mode` |
| `linear_issue` | `issue_id` |
| `linear_issues` | one summary event per issue or parent session event |
| `status` | `ledger.run_summarized.payload.summary_status` |
| `verdict` | `ledger.run_summarized.payload.summary_verdict` |
| `output_artifact` | `artifact_paths[]` and `ledger.run_summarized.payload.report_path` |
| `human_gate_required` | base `human_gate_required`; if true, emit `human_gate.required` when the gate is known |

Old `verdict` values are legacy summary values unless they exactly match the
canonical `ReviewVerdict` enum. Do not treat `KEEP`, `UPDATED` or
`REPORT_PRODUCED` as canonical work verdicts.

## Implementation Requirements

A runner or controller that claims Event Ledger support must:

1. Append valid JSONL rows to `metrics/agent-events.jsonl`.
2. Preserve `metrics/agent-runs.jsonl` compatibility until all readers migrate.
3. Emit `worker.locked`, `worker.heartbeat` and `worker.reported` for active
   workers.
4. Emit `sandbox.created` and `sandbox.patch_produced` for L3 sandbox lanes.
5. Emit `controller.audit_started` and `controller.verdict` for controller
   reviews.
6. Emit `human_gate.required` before blocking merge, production, memory writes
   or direct `Done`.
7. Emit `memory.proposal_created`, `memory.dream_requested` and
   `memory.dream_reviewed` for DreamPolicy-controlled memory work.
8. Validate event rows before append.
9. Deduplicate by `event_id`.
10. Generate the morning controller board from reducer output.

## Local CLI

Company.OS ships a dependency-free Node CLI for the contract layer:

```bash
node scripts/agent-events/validate-agent-events.mjs \
  --file metrics/agent-events.example.jsonl

node scripts/agent-events/reduce-agent-events.mjs \
  --file metrics/agent-events.example.jsonl \
  --format state

node scripts/agent-events/reduce-agent-events.mjs \
  --file metrics/agent-events.example.jsonl \
  --format by-issue
```

For a real install, point the same commands at `metrics/agent-events.jsonl`.
Use `--allow-missing` on the validator only during bootstrap before the first
event row exists.

## Gates

- `metrics/agent-events.example.jsonl` must parse as JSONL.
- `node scripts/agent-events/validate-agent-events.mjs --file
  metrics/agent-events.example.jsonl` must pass.
- `node scripts/agent-events/reduce-agent-events.mjs --file
  metrics/agent-events.example.jsonl --format state` must produce a reduced
  state.
- New event rows must not contain secrets or raw private memory.
- Controller verdict payloads must match the canonical review harness.
- L3 sandbox events must never reduce directly to `done_candidate` while merge,
  push, deploy or production writes remain human gated.
