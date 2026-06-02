# Worker Report Example

```yaml
worker.reported:
  version: dispatcher-v1.2
  work_item: "[WORK-ITEM]"
  state: PASS
  dispatcher_run_id: "[RUN-ID]"
  changed_files:
    - "[RELATIVE/PATH]"
  commands:
    - command: "node --test [test-file]"
      result: PASS
  blocked_actions_remaining:
    - no Plane Done
    - no deploy
    - no public publish
  capability_context_proof:
    profile: "[CAPABILITY-PROFILE]"
    workspace: "[WORKSPACE]"
  reflection:
    summary: "What the worker learned from this run."
  learning_proposals:
    - "Concrete improvement proposal for the next run."
```

No real Plane IDs, private paths, tokens, customer data or production details.
