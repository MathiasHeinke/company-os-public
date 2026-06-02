# Subagent Reporting Contract

Status: canonical contract for worker subagent transparency
Phase: in force as soon as a worker contract declares a non-empty
`SubAgentRoster`
Use for: making subagent activity inside a single worker run
machine-readable, reviewable by the CAO, and auditable against scope
boundaries
Last updated: 2026-05-09

## Purpose

When a Plane worker run uses subagents (parallel sub-workers, specialist
helpers, fan-out audit passes), the CAO and CEO surfaces must be able to
read **what each subagent did** without reconstructing it from prose.

This contract makes subagent activity a first-class block inside the
`worker.reported` Plane comment. It does not change how subagents are
spawned. It changes how their output appears in the ledger.

## Hard Rules

These are non-negotiable boundaries. Violation is a CAO REJECT.

1. **Subagents only inside a locked Plane Work Item.** The work item must
   carry an active `worker.lock (dispatcher-v0)` comment. No subagents may
   be spawned during dispatcher dry-run, before lock, after CAO verdict,
   or outside a work-item-bounded run.
2. **No recursive subagent spawning.** A subagent may not itself spawn
   subagents. The worker is the one and only spawn surface for a given
   work item. If a sub-subagent is needed, the work must be split into a
   new Plane work item with its own contract, lock, and CAO loop.
3. **Controller and CAO never spawn subagents.** The Codex Controller
   Runtime (`docs/orchestration/codex-controller-runtime.md`) and the CAO
   seat (`docs/agents/cao.md`) are decision surfaces. They never fan out
   into worker activity. If a controller decision implies new work, that
   work is a new Plane item with its own worker run.
4. **One consolidated `worker.reported` per run.** A worker run must emit
   exactly one `worker.reported` Plane comment. Subagent activity is
   reported as a structured block inside that single comment, not as
   multiple comments per subagent.
5. **The work item's `SubAgentRoster` declares the allowed roster.** A
   subagent that is not in the declared roster is an out-of-scope spawn
   and is a CAO REJECT.
6. **Subagent identities never claim HG-2.5 or HG-3.** A subagent surfaces
   findings; release authority belongs to the controller and the founder
   only.

## Required Fields per Subagent

Every subagent that participated in the worker run MUST appear in the
`subagents:` array of the `worker.reported` YAML block.

```yaml
worker.reported:
  ...
  subagents:
    - name: "<subagent-id-or-purpose>"
      role: "<role:* if applicable, else \"subworker\">"
      scope: "<one-line bound: what was delegated to this subagent>"
      verdict: "PASS" | "REJECT" | "PARTIAL"
      files_changed:
        - "<absolute path>"
      commands_run:
        - "<verbatim command, exit code optional>"
      gates_green:
        - "<gate id>"
      gates_red:
        - "<gate id>"
      risks:
        - "<one-liner per risk>"
      cost_eur: 0.00
```

### Required keys

- `name` — stable identifier or short purpose label
- `scope` — one-line description of the delegated work
- `verdict` — exactly one of `PASS`, `REJECT`, `PARTIAL`
- at least one of `files_changed` (non-empty array) or `commands_run`
  (non-empty array)

### Optional keys

- `role` — `role:cto` / `role:cpo` / `role:cmo` / `role:coo` / `role:cfo`
  if the subagent acted under a specific seat. Default: `subworker`.
  Never `role:cao`.
- `gates_green` / `gates_red` — gate IDs the subagent observed. Empty
  arrays allowed; the field is informative.
- `risks` — short risk lines surfaced by the subagent.
- `cost_eur` — runtime cost the subagent incurred. Default: `0`. Must be
  a number, not a string. Cumulative cost across all subagents must not
  exceed the work item's `MaxSpend`.

### Forbidden

- Free-text "I used a subagent" without the structured block.
- Listing a subagent that did not actually run (CAO REJECT
  `subagent.report-fabricated`).
- Listing a subagent that is not in the work item's declared
  `SubAgentRoster` (CAO REJECT `subagent.report-out-of-roster`).
- Multiple `worker.reported` comments per run; the consolidated block is
  the single source.

## CAO Behaviour

The CAO seat reads the `worker.reported` comment and applies these
rules in addition to its existing checks (lock present, context present,
report present, hash unchanged, validator green):

| Condition | CAO action | Reject code |
|---|---|---|
| Work item declares `SubAgentRoster` non-empty AND the report has no `subagents:` block | REJECT | `subagent.report-missing` |
| Work item declares `SubAgentRoster: none` (or empty) AND the report omits the `subagents:` key entirely | REJECT | `subagent.report-missing` |
| `subagents:` block present but a required key (`name`, `scope`, `verdict`, evidence) is missing for any entry | REJECT | `subagent.report-incomplete` |
| A subagent verdict is not `PASS` / `REJECT` / `PARTIAL` | REJECT | `subagent.report-incomplete` |
| A subagent name is not in the work item's `SubAgentRoster` | REJECT | `subagent.report-out-of-roster` |
| Sum of `cost_eur` across subagents exceeds the contract's `MaxSpend` | REJECT | `subagent.report-budget-exceeded` |
| Subagent declares `role:cao` | REJECT | `subagent.role-cao-forbidden` |
| Two or more subagents share the same `name` | REJECT | `subagent.report-duplicate-name` |

These reject codes are stable identifiers and are added to the canonical
CAO reject set in `docs/agents/cao.md`.

## Worker Issue Contract Hookup

The `SubAgentRoster` field already exists in
`docs/templates/worker-issue-contract.md`. This contract makes the field
load-bearing: when it is non-empty, the worker MUST emit a structured
`subagents:` block in `worker.reported`, and the CAO MUST validate it
per the table above.

`SubAgentRoster: none` (or empty) means: no subagents are permitted in
this run. The worker MUST still emit an explicit empty `subagents: []`
line inside its single `worker.reported` Plane comment. The empty array
is a positive declaration that no subagents ran; it is not optional.
A missing `subagents:` key under a `none`/empty roster is a CAO REJECT
with code `subagent.report-missing`. Any non-empty `subagents:` entries
in the report under that condition are themselves a
`subagent.report-out-of-roster` REJECT.

```yaml
worker.reported:
  ...
  # SubAgentRoster: none — required positive declaration:
  subagents: []
```

## Mapping to Existing Canon

| Concept | Source | This contract adds |
|---|---|---|
| Worker contract | `docs/templates/worker-issue-contract.md` | `SubAgentRoster` is now load-bearing |
| Dispatcher v0 (lock) | `docs/orchestration/plane-worker-dispatcher-v0.md` | rule 1: lock must precede subagent activity |
| Runtime dispatcher v1 | `docs/orchestration/company-os-runtime-dispatcher-v1.md` | future spawn must respect rule 2 (no recursion) |
| CAO seat | `docs/agents/cao.md` | new reject codes added (`subagent.*`) |
| Codex Controller Runtime | `docs/orchestration/codex-controller-runtime.md` | rule 3: controller never spawns subagents |

## Hygiene

- The reject-code set above is closed in this version. New codes require
  an amendment to this doc and to `docs/agents/cao.md`.
- The required-key set is closed. Optional keys may be extended in
  later phases without breaking the contract, as long as the required
  set is preserved.
- Source-company-specific subagent patterns (ARES/Fyn) belong in
  private operating docs. This contract stays generic and reusable.
