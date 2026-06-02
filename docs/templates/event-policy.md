# EventPolicy Template

Use for: scheduled, long-running, live-ledger, webhook-capable or managed-agent
compatible work.

## Purpose

`EventPolicy` defines which state changes must be emitted or recorded so the
controller can reduce work state without scraping prose comments.

Canonical event row, payload and reducer semantics live in
`docs/operations/agent-event-ledger.md`. Use
`docs/templates/agent-event-row.md` for copyable row examples.

## Template

```markdown
EventPolicy:
EventSink: linear-comment | metrics-jsonl | webhook | managed-agent-events
EventTypes:
- worker.locked
- worker.heartbeat
- worker.blocked
- worker.reported
- sandbox.created
- controller.audit_started
- controller.verdict
- human_gate.required
- memory.proposal_created
- memory.dream_requested
- memory.dream_reviewed
StateReducer:
WebhookPolicy: none | signed-https | local-only | managed-agent-webhook
WebhookVerification:
EventRetention:
PIIClass: none | internal | confidential | regulated
```

## Rules

- Human-readable comments are allowed, but machine state must come from typed
  events.
- `metrics-jsonl` means append to `metrics/agent-events.jsonl` using
  `schema_version: agent-event/v1`.
- `StateReducer` should normally be `issue-state-from-agent-events`.
- Webhooks should deliver event type and ID, then consumers fetch canonical
  state from the ledger or session store.
- Signed webhooks are required before external endpoints are used.
- Never put secrets, customer data or private raw memory in event payloads.
