# Workstream Session Continuity

Status: canonical architecture policy
Use for: keeping selected EVE, CEO, C-Level and worker sessions alive across
multiple related work items when long-context continuity improves quality.
Last updated: 2026-06-02

## Purpose

Company.OS currently favors a fresh runtime session for every worker item. That
is safe, reproducible and easy to audit, but it makes every worker blind unless
the scheduler rebuilds context in the boot pack.

Some work is different. Books, brand systems, long research threads,
multi-week product concepts and EVE's Chief-of-Staff relationship improve when
the same runtime session continues to carry working context. This document
defines when to keep sessions alive, when to resume them, and when to force a
fresh run.

## Core Decision

Default remains fresh per item.

Workstream continuity is opt-in and policy-routed. It is allowed for
long-context, iterative, concept-shaped work when the continuity session is
registered, scoped, resumable, auditable and still emits one report per work
item.

Continuity is working memory. It is not the execution ledger, not durable memory
truth, not a HumanGate bypass and not a reason to skip Plane.

## Existing Baseline

`docs/orchestration/headless-worker-runtime-boot-contract.md` already permits
session reuse for interruption recovery:

```text
same Plane work item + same workspace + same runtime/model + stored session_id
+ previous TIMEOUT/NEEDS_HUMAN/bounded continuation + same boot pack
```

That protects a single interrupted item. This policy extends the concept to
workstreams: one conceptual parent may keep a CEO, C-Level or worker session
alive across multiple child items.

## Session Classes

| Class | Name | Use | Reuse |
|---|---|---|---|
| `SC0-fresh-task` | Fresh task | default for bounded tasks, audits, gates, quick patches | no |
| `SC1-same-item-resume` | Same-item resume | existing interruption recovery after timeout or human pause | yes |
| `SC2-workstream-continuity` | Workstream continuity | book, brand, research, concept, multi-week feature, EVE companion | yes |
| `SC3-session-group` | Session group | CEO plus C-Level/worker/subagent sessions stay linked under one parent | yes, grouped |
| `SC4-continuity-blocked` | Continuity blocked | high-risk, secrets, production, customer, legal, pricing, HG-4 or unsafe parallel work | no |

## Registry And Router

Canonical registry:

```text
registries/sessions/workstream-continuity.json
```

Dry-run router:

```text
scripts/orchestration/session-continuity-router.mjs
```

The router writes nothing. It decides whether a request should start fresh,
resume a same-item session, attach to a workstream session, attach to a session
group or block continuity.

## Session Registry Shape

Runtime session state is stored outside this public template in the installed
workspace's local/private operations layer. Public Company.OS only defines the
shape:

```yaml
workstream_session:
  id: ws_book_001
  parent_ref: Plane parent id or local goal id
  title: Book drafting workstream
  owner_role: role:cpo
  session_policy: workstream-continuity
  status: open
  runtime_sessions:
    ceo_codex:
      runtime: codex
      model_alias: superbrain-veto
      session_id: codex-session-id
      opened_at: 2026-06-02T00:00:00Z
    cpo_claude:
      runtime: claude
      model_alias: opus
      session_id: claude-session-id
      opened_at: 2026-06-02T00:00:00Z
  allowed_scope:
    - docs/
    - book/
  blocked_surfaces:
    - production writes
    - secrets
    - customer data
    - Plane Done
  close_conditions:
    - parent done
    - context polluted
    - stale after configured days
    - owner closes workstream
```

## Route Receipt

Every continuity decision should retain a route receipt:

```yaml
session_continuity_route:
  version: session-continuity-router/v0
  route_class: SC2-workstream-continuity
  session_policy: workstream-continuity
  reuse_allowed: true
  session_group_allowed: false
  route_reason: iterative-concept-work
  human_gate: HG-2.5
  required_registry_state: open-workstream-session
  blocked_actions:
    - production write
    - external send
    - Plane Done
```

## Where Continuity Is Valuable

Use continuity for:

- book drafting, manuscript editing and narrative architecture
- brand, voice, design and product-language work
- long research threads where source relationships compound
- multi-week product concepts or architecture work
- EVE Chief-of-Staff companion sessions with the founder
- CEO/C-Level planning where repeated back-and-forth is the work

Use fresh sessions for:

- one-off audits
- security reviews
- release gates
- deterministic validators
- small bounded patches
- parallel worker swarms
- anything where independence and reproducibility matter more than memory

## Session Groups

Session groups are allowed when the same parent needs linked continuity across
multiple runtime seats:

```text
EVE/Hermes Chief-of-Staff session
  -> CEO/Codex continuity session
    -> C-Level continuity session
      -> worker or subagent session
```

The group does not merge authority. Each child still reports separately. The
group only says: "these runtime sessions belong to the same conceptual parent
and may be resumed together if policy allows."

## Hard Boundaries

Continuity must not be used to:

- carry secrets, cookies, credentials or raw private customer data as hidden
  context
- bypass the boot pack
- skip current Plane snapshot loading
- hide work from CAO/Controller
- create a second execution ledger
- let a worker mark Plane Done
- keep sessions alive after context pollution or scope drift

When in doubt, start fresh and load a bounded context slice.

## Version Placement

This policy can be documented in `0.9.0-rc.0` because it changes architecture
truth and public setup expectations. Live continuity is a later product layer:

1. `0.9.x`: policy, public registry, dry-run router, `/start_eve` route
   receipts and report visibility.
2. `1.0`: local workstream session registry and close-session hygiene.
3. `1.2`: EVE/Command Center displays continuity sessions and receipts.
4. `1.3+`: first live continuity pilot, preferably book or brand work.
5. `1.5+`: session groups with CEO/C-Level/worker resume orchestration.

## Gates

```bash
node --check scripts/orchestration/session-continuity-router.mjs
node --test scripts/orchestration/session-continuity-router.test.mjs
node scripts/orchestration/session-continuity-router.mjs \
  --message "Continue the book drafting workstream with the same CEO session" \
  --json
```

Public release gate:

```bash
node scripts/release-gates/productization-readiness.mjs check --public-release --json
```
