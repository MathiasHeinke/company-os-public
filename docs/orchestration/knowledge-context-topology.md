# Knowledge & Context Topology (T13)

Status: canonical schema decision (foundational-early — decide now, or rebuild at 1.5)
Phase: v0 — schema lock + context-router contract + rollout rule. Build flat now, graph-projectable from day one.
Plane: [WORK_ITEM_ID] (Welle-2 autonomy run)
Last updated: 2026-05-29

## Why this is a schema decision, not a feature

If Command EVE ships flat-session-only and a tree is bolted on at v1.5, the whole memory/session model is
rebuilt. This doc locks the data model now so that does not happen. The cost of being wrong here is a
system-wide migration; the cost of being right is a few constraints honored from day one.

Three locks (each prevents a known rebuild):

1. **Graph underneath, tree on top.** Storage is a tagged knowledge graph; the user-facing left-rail is a
   *projection* (a tree view), not the storage. A session about "training" is simultaneously `health` and
   `self-development` and `communication-with-partner`; a literal tree store hits this contradiction in
   week two. Graph store + tree projection does not.
2. **Self-extending, proposal-only ontology.** Domains are not hard-coded (`health/sport/coaching/...`).
   A small root set (or an onboarding-proposed split per user) plus EVE growing the tree proposal-only as
   it learns. Hard-coding the taxonomy overfits to one user and recreates the rebuild trap one layer up.
   This is the Co-Constructed Structure axiom applied to memory.
3. **Topology over stores, not a new store.** EVE's substrate already exists: Honcho (memory/conclusions,
   built into Hermes), GitNexus (code structure), Obsidian Brain Interface (wiki/knowledge surface). T13 is
   a routing/projection layer OVER them, not a replacement.

## Data model (v0)

- **Node**: a unit of knowledge/session/artifact. Fields: `id`, `kind` (session | memory | artifact |
  project | doc), `domains` (array of domain tags — many-to-many), `created_at`, `source` (honcho |
  gitnexus | obsidian | plane | session), `summary`.
- **Domain**: a tag in a self-extending set. Fields: `id`, `label`, `parent` (nullable — domains may nest),
  `origin` (root | onboarding | eve-proposed | user-named), `status` (active | proposed). EVE-proposed
  domains are `proposed` until accepted via the growth-review path (no self-accept).
- **Edge**: typed relation (`belongs-to-domain`, `derived-from`, `supersedes`, `relates-to`). The graph is
  the truth; the tree is `belongs-to-domain` projected with a chosen primary domain per node.
- **Projection**: a deterministic function `graph -> tree` choosing, per node, a primary domain for display
  while keeping cross-links visible. Multiple projections are allowed (by-domain, by-time, by-project).

## Context Router (sibling to the Inference Router)

`docs/orchestration/runtime-inference-router.md` chooses the *model* at spawn. The Context Router chooses
the *domain + relevant context slice* at session start:

```text
session opener -> classify domain(s) -> load the bounded context slice for those domains
                                        (not the whole graph) -> proceed
```

- Input: the user's opener + recent active context.
- Output: `{ domains: [...], context_slice: [node ids], confidence }`.
- Honors AllowedReadPaths / capability scope: the slice never exceeds the session's declared read scope.
- Low confidence -> ask one disambiguating question rather than load the wrong slice.
- This is exactly today's "which folders are relevant for this session" — but EVE decides and fetches it.

## Session lifecycle (domain-scoped, mitgedacht not built yet)

When the user starts "training" for the 5th time, each is its own session node tagged `health`. Over a
threshold, the domain's sessions compact (LLM summarization, like Hermes cross-session recall) into a
durable **domain memory** for that node, and new sessions are "reborn" with that domain memory as context —
not with a global memory blob. This keeps EVE sharp instead of blurred. v0 locks the schema (sessions carry
`domains` + `summary`); the compaction/rebirth logic is a later slice.

## Rollout rule (the flat -> sorted transition)

`FACT(founder meta 2026-05-29)`: do not show a half-learned tree.

1. Phase A: flat sessions, user can rename / order / categorize manually.
2. Phase B: when EVE has enough signal that its projection is reliable, surface an "EVE-Sorted view"
   button. The user opts in; manual order is preserved underneath.
3. The projection must be belastbar before it is offered. A wrong first picture destroys trust more than a
   missing feature.

## Boundaries

- No durable memory write without the proven HG-2 memory boundary + correct Honcho workspace/peer.
- EVE-proposed domains/edges are proposal-only until growth-review acceptance; EVE never self-accepts.
- The graph never ingests secrets, cookies, raw credentials or private customer data as node content.
- The tree projection is UX; it never becomes a second execution ledger (Plane stays canonical).

## Implementation order

1. (this doc) schema lock + context-router contract + rollout rule. **report-only.**
2. Honcho metadata mapping for `domains`/`edges` (after RR-3 Honcho boundary).
3. Context Router core (pure classify+slice function + tests), sibling module to the inference router.
4. Tree projection function + the EVE-Sorted-view unlock signal.
5. Domain-scoped compaction/rebirth (later; depends on session-lifecycle slice).

## Non-goals (v0)

- No literal tree storage. No hard-coded domain taxonomy. No live UI this slice. No compaction logic yet.
- No change to Plane as the canonical execution ledger.
