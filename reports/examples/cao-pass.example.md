# CAO PASS Example

```yaml
controller.verdict:
  version: cao-v0
  work_item: "[WORK-ITEM]"
  verdict: PASS
  reviewer: cao
  evidence:
    lock_match: true
    description_hash_match: true
    worker_report_present: true
    reflection_present: true
    learning_proposals_present: true
  next_state: controller-review
```

This is a shape example only. It contains no real work item IDs or private paths.
