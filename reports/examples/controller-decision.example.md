# Controller Decision Example

```yaml
controller.decision:
  version: codex-controller-v0
  work_item: "[WORK-ITEM]"
  decision_mode: AUTO-GO
  confidence: 0.95
  evidence:
    worker_state: PASS
    cao_verdict: PASS
    gates: PASS
  blocked_actions_remaining:
    - no Plane Done
    - no deploy
    - no public publish
  next: "Founder/CEO may release the bounded next action."
```

This public example intentionally uses placeholders only.
