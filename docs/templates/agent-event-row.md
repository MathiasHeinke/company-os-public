# Agent Event Row Template

Use for: workers, runners, controllers, webhooks and managed-agent adapters
that append to `metrics/agent-events.jsonl`.

Canonical schema and reducer rules live in
`docs/operations/agent-event-ledger.md`.

## Base Template

```json
{
  "schema_version": "agent-event/v1",
  "event_id": "evt_YYYYMMDD_unique",
  "event_type": "worker.locked",
  "occurred_at": "YYYY-MM-DDTHH:mm:ssZ",
  "producer": "controller",
  "workspace": "registry:company-os",
  "workspace_path": "/absolute/path/to/workspace",
  "issue_id": "COS-123",
  "parent_issue_id": "COS-100",
  "run_id": "run_YYYYMMDD_issue_agent_mode",
  "session_id": "session_YYYYMMDD_controller",
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

## worker.locked Example

```json
{
  "schema_version": "agent-event/v1",
  "event_id": "evt_20260507_cos123_worker_locked",
  "event_type": "worker.locked",
  "occurred_at": "2026-05-07T20:00:00Z",
  "producer": "controller",
  "workspace": "registry:company-os",
  "workspace_path": "/workspace/company-os",
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
  "payload": {
    "lock_id": "lock_cos123_20260507",
    "locked_by": "controller",
    "scope_hash": "sha256:example",
    "max_runtime_minutes": 90,
    "heartbeat_interval_minutes": 15,
    "kill_switch": "issue #stop",
    "allowed_actions": ["read_source", "write_report", "append_event"]
  },
  "artifact_paths": [],
  "linear_comment_ids": [],
  "human_gate_required": false,
  "redaction_level": "internal",
  "previous_event_id": null
}
```

## controller.verdict Example

```json
{
  "schema_version": "agent-event/v1",
  "event_id": "evt_20260507_cos123_controller_verdict",
  "event_type": "controller.verdict",
  "occurred_at": "2026-05-07T20:45:00Z",
  "producer": "controller",
  "workspace": "registry:company-os",
  "workspace_path": "/workspace/company-os",
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
  "payload": {
    "review_verdict": "NEEDS_HUMAN",
    "autonomy_recommendation": "KEEP",
    "total_self_score": 18,
    "total_controller_score": 15,
    "calibration_gap": 3,
    "ceo_intent_fit_score": 9,
    "ceo_would_accept": "uncertain",
    "customer_ship": "usable internally",
    "root_cause": ["gate missing", "evidence quality"],
    "required_rework": "prepare exact human decision",
    "next_state": "ready-for-human-review",
    "merge_state": "merge_gated",
    "memory_update_policy": "proposal-only"
  },
  "artifact_paths": ["/workspace/company-os/reports/night-shift/YYYY-MM-DD/controller-review.md"],
  "linear_comment_ids": [],
  "human_gate_required": true,
  "redaction_level": "internal",
  "previous_event_id": "evt_20260507_cos123_worker_reported"
}
```

## memory.proposal_created Example

```json
{
  "schema_version": "agent-event/v1",
  "event_id": "evt_20260507_cos123_memory_proposal",
  "event_type": "memory.proposal_created",
  "occurred_at": "2026-05-07T20:50:00Z",
  "producer": "controller",
  "workspace": "registry:company-os",
  "workspace_path": "/workspace/company-os",
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
  "payload": {
    "proposal_type": "sop",
    "store": "wiki",
    "summary": "promote reusable runtime-auth preflight rule",
    "proposal_path": "/workspace/company-os/reports/night-shift/YYYY-MM-DD/memory-proposal.md",
    "requires_review": true,
    "durable_write_performed": false
  },
  "artifact_paths": ["/workspace/company-os/reports/night-shift/YYYY-MM-DD/memory-proposal.md"],
  "linear_comment_ids": [],
  "human_gate_required": false,
  "redaction_level": "internal",
  "previous_event_id": "evt_20260507_cos123_controller_verdict"
}
```

## Checklist

- Use a stable `event_id`.
- Use UTC `occurred_at`.
- Keep payloads typed and small.
- Put evidence in artifact files; do not paste raw private context into JSONL.
- Use absolute paths for local artifacts.
- Do not use event comments as a replacement for `controller.verdict`.
