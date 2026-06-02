# Plane Role Routing

Status: canonical productizable model
Phase: 1 (single Plane App identity, role label per work item)
Use for: deciding which C-level seat owns a Plane work item, validating
delegation, and gating dispatcher decisions
Last updated: 2026-05-08

## Purpose

Plane work items must declare the C-level seat that owns the item. Without an
explicit seat the dispatcher does not know which controller pass to run, the
CAO does not know which acceptance bar to apply, and the morning brief cannot
group items by seat.

This doc defines the `role:*` label scheme that every work item carries while
Company.OS runs a single Plane App identity in Phase 1.

It does not replace the existing canon in
`docs/architecture/agent-org-model.md` and
`docs/operations/ceo-controller-agentic-protocol.md`. It adds the routing
primitive that makes those models executable in Plane.

## Phase Map

```text
Phase 1 (now)
  - one Plane App identity: Company.OS Control Plane
  - one Plane App bot token in Keychain
  - role assignment via mandatory label `role:*` on every work item
  - dispatcher rejects work items without exactly one role label
  - CAO is a separate Claude session, not the same agent that built the slice

Phase 2 (when a seat is hot enough to specialize)
  - separate Claude session per seat with role-specific system prompt
  - separate Honcho peer per seat
  - role label remains the same

Phase 3 (only if measurable benefit > coordination tax)
  - separate Plane Apps per seat or derived sub-tokens
  - per-seat scopes narrowed from the full Phase 1 scope set
```

## Role Label Set

The CompanyOS Plane project must carry exactly these labels, no more, no
fewer for routing:

| Label | Seat | Department | Default acceptance lens |
|---|---|---|---|
| `role:cto` | CTO | Engineering | Architecture, code quality, security, reliability, reversibility |
| `role:cpo` | CPO | Product | User workflow, scope, customer value, acceptance criteria |
| `role:cmo` | CMO | Growth / Marketing | Positioning, brand voice, factual claims, public-readiness |
| `role:coo` | COO | Operations | Process discipline, runbooks, dependencies, throughput, ledger hygiene |
| `role:cfo` | CFO | Finance | Spend approval, runway, cost ledger, pricing, business impact |
| `role:cao` | CAO / Controller | QA-Eval / Governance | Audit-only seat. Not assigned to building work. Carries controller-pass items. |

Other charters (CHRO, CLO/Compliance) listed in
`docs/architecture/agent-org-model.md` are valid charters but are not first-
class routing labels in Phase 1. Promote them only when work volume justifies
a dispatcher branch.

## Routing Rules

1. **Exactly one `role:*` label per work item.** Zero is invalid. Two is
   invalid. The dispatcher rejects both and the CAO must not pass through.
2. **Cross-role work uses a parent + linked sub-items, not multiple labels.**
   Owner seat owns the parent. Each sub-item carries its own single
   `role:*`. See `parent_seat` field in the worker issue contract.
3. **`role:cao` items are only created by the CAO seat.** They represent
   controller-pass work, not building work. Other seats do not create
   `role:cao` items.
4. **`role:*` labels are immutable after dispatch.** Re-routing means closing
   the item with a non-Done state and creating a new item with the correct
   label. The dispatcher and CAO refuse to act on items whose `role:*`
   changed mid-run.

## Bootstrap Exception

The very first work items used to bootstrap the role label set in Plane may be
created without a `role:*` label, because the labels do not yet exist. Such
items must:

- declare the seat owner explicitly in the description;
- name themselves as bootstrap exceptions;
- be relabeled within the same slice that creates the labels.

After bootstrap, the dispatcher rule is enforced without exception.

## Scope Gap: App Token Cannot Manage Labels (Phase 1)

The Phase 1 Plane App identity carries the work-item and comment scopes but
**not** label-management scopes. Listing or creating labels with the App bot
token returns HTTP 403:

```text
"detail": "You do not have permission to perform this action."
```

For **label creation** this is a real blocker: the bootstrap script must run
with the legacy Plane API key once per project:

```bash
node scripts/orchestration/plane-role-labels-bootstrap.mjs \
  --workspace companyos \
  --project-id <uuid> \
  --auth api-key \
  --apply
```

This is the documented Bootstrap/Fallback role of the API key in
`docs/integrations/plane-app-control-plane.md`. The API key should be
rotated after each bootstrap-class write because it has crossed an operator
session.

## Label Resolution at Dispatch Time (HG-2b: Solved by Embedded Names)

For **runtime label resolution by the dispatcher**, the App-token 403 turns
out **not to be a blocker**. Plane's `/work-items/{id}/` endpoint already
embeds full label objects in the work item response — including `name` —
under both api-key and app-token auth. The dispatcher reads names directly
from `item.labels[].name` and does not need to call `/labels/` at all.

The dispatcher resolver therefore uses this precedence:

1. **Embedded** — read `item.labels[].name` directly (Phase 1 canonical
   path, no scope required).
2. **API** — only invoked if a Plane response ever returns labels as bare
   UUID strings instead of objects (not observed today on
   `/work-items/{id}/`, but defensive).
3. **Label-map fallback** — when /labels/ returns 4xx and the dispatcher
   only has UUIDs, it loads a non-secret JSON map at
   `runtime/plane-label-map/<workspace>-<project_id>.json` (gitignored).
   Generate the map once per project after bootstrap:

```bash
node scripts/orchestration/plane-role-labels-bootstrap.mjs \
  --workspace companyos --project-id <uuid> \
  --auth api-key --write-label-map
```

This means HG-2b is closed in practice without an App reconsent: the
dispatcher works with the existing app-token scope set today. App reconsent
with `projects.labels:read` remains an option for future hygiene (single
identity for both create and read), not a blocker.

### Fail-Closed Reject Codes

When the dispatcher must invoke the label-map fallback path and the map is
not usable, it emits one of these stable reject codes — never a silent
empty-labels result:

```text
runtime.label-map-missing
runtime.label-map-malformed
runtime.label-map-mismatch
runtime.label-map-incomplete
```

See `docs/orchestration/plane-worker-dispatcher-v0.md` for the full reject
matrix.

## Dispatcher Reject Reasons (role layer)

The dispatcher must record one of these `controller.verdict` reasons when it
rejects a work item for routing reasons:

```text
role.label.missing
role.label.multiple
role.label.unknown
role.label.changed-mid-run
role.cao.created-by-non-cao-seat
```

See `docs/orchestration/plane-worker-dispatcher-v0.md` for the full reject
matrix.

## Mapping to Existing Canon

| Concept | Source | This doc adds |
|---|---|---|
| C-level role list | `docs/architecture/agent-org-model.md` | machine-readable label scheme in Plane |
| Controller protocol | `docs/operations/ceo-controller-agentic-protocol.md` | CAO as seat-shaped controller, not an inline self-review |
| Worker contract fields | `docs/templates/worker-issue-contract.md` | `role`, `parent_seat` mandatory fields |
| Plane execution ledger | `docs/operations/plane-execution-ledger-migration.md` | role label as routing primitive on top of work items |
| Plane App identity | `docs/integrations/plane-app-control-plane.md` | one App identity in Phase 1, one bot token, one scope set |

## Hygiene

- New seats are added by extending this table and the worker-issue-contract
  enum, then teaching the dispatcher and validator. They are not added by ad
  hoc label creation in Plane.
- Generic `role:*` labels stay project-scoped. They are a Company.OS routing
  primitive; private installs may extend the set in their own workspace docs.
- Source-company specifics (ARES/Fyn) belong in private operating docs, not
  here.
