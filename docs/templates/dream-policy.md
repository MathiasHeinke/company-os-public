# DreamPolicy Template

Use for: memory consolidation, SOP improvement, skill improvement, harness
updates and cross-session learning.

## Purpose

`DreamPolicy` defines how worker learnings become reviewable memory proposals
without letting workers write durable truth directly.

## Template

```markdown
DreamPolicy: none | proposal-only | controller-approved | managed-agent-output-review
MemoryStore:
InputStore:
OutputStore:
Curator:
DreamCadence:
DreamInstructions:
MemoryUpdatePolicy: none | proposal-only | controller-approved
MemoryOutputReview:
KnowledgeUpdateProposal:
StalenessRule:
ContradictionRule:
DeprecationRule:
```

## Rules

- Workers may propose memory updates; they do not write durable memory.
- Claude C-level workers must emit `reflection:` and `learning_proposals:` in
  `worker.reported` when `DreamPolicy` is not `none`.
- `InputStore` and `OutputStore` must be different when a dream or consolidation
  job rewrites memory.
- Dream output is a review artifact until controller or CEO accepts it.
- Private implementation context must not be copied into productizable
  Company.OS docs.
- Memory updates that affect legal, medical, finance, public claims, production
  behavior or autonomy require HumanGate.
