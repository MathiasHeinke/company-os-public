# Plane-First, Linear-Bridge Operating Doctrine

Status: canonical operating doctrine
Phase: bridge phase until Linear archive-only is verified
Use for: deciding where new Company.OS work items live, what Linear is allowed
to receive, and when bridge mirroring may stop
Last updated: 2026-05-08

## Decision

Plane is the **canonical execution ledger** for Company.OS.
Linear is a **legacy/bridge/comparison surface** during a bounded migration
window.

```text
Plane = active execution ledger
Linear = read-only legacy + bounded bridge mirror until archive-only
Company.OS = Plane-first controller doctrine, Linear remains source of truth ONLY for the migration cohort
```

This complements `docs/operations/plane-execution-ledger-migration.md`. The
migration doctrine explains *why* Plane wins. This doctrine explains *how*
Plane and Linear coexist during the migration without splitting source of
truth.

## Why Both Tools, Briefly

| Surface | Strength | Role in Company.OS |
|---|---|---|
| Linear | Native agent-as-app-user, "Open in Claude Code/Codex" UX, polished delegation flow | Reference for Agent UX. Not our control plane. |
| Plane | OAuth/Bot-Token apps, work items, webhooks, custom integrations, project + module + cycle + page model | Our own Company.OS execution ledger and orchestration backend. |

We pick Plane not because Plane is more polished. We pick Plane because Plane
lets us own the control plane. Linear is the better finished product. Plane
is the better operating system substrate for an installable, multi-client
Company.OS.

## Operating Rules

### New Work Items

1. **Every new Company.OS work item is created in Plane.** No exceptions.
2. Each item carries exactly one `role:*` label per
   `docs/orchestration/plane-role-routing.md`.
3. Each item satisfies the worker issue contract in
   `docs/templates/worker-issue-contract.md`.
4. CEO/Codex triages and accepts items in Plane. C-level seats own them in
   Plane. CAO transitions them in Plane.

### Linear in the Bridge Window

1. Linear receives **mirror comments only** for items that already had a
   Linear thread (`MAT-*`). The mirror is a one-way pointer to the Plane
   item, not a duplicated description, not a duplicated status.
2. Linear **must not be the source of truth** for any item that exists in
   both systems. If a Linear comment and a Plane work item disagree, Plane
   wins.
3. New work items **must not be created in Linear** by any agent. Founder may
   manually open Linear items in exceptional Bridge-cleanup situations and
   immediately mirror them into Plane.
4. Linear writes by Claude Code, Codex, or schedulers are **read-only by
   default**, mirror-only when explicitly enabled by a bridge skill.

### Migration Cohort

The cohort of currently open Linear issues (`[WORK_ITEM_ID]`, `[WORK_ITEM_ID]`, `[WORK_ITEM_ID]`,
related child issues) is the bounded **migration cohort**. The cohort is
processed via:

1. **Dry-Run Inventory.** Read all open Linear issues, classify
   (migrate / merge / archive), produce a mapping report. No writes.
2. **Bridge Mirror.** Each cohort item gets one Plane work item with a
   `bridge_source: linear:<KEY>` field in description and one Linear comment
   linking to the Plane item.
3. **Cutover.** When the cohort is fully mirrored and a CAO pass confirms
   no orphaned obligations, Linear flips to archive-only: no new items, no
   new comments by Company.OS agents, label `frozen-archive` on the project.

The cutover is a HumanGate (HG-2) decision by CEO with founder visibility.

## When Linear Bridge May Stop

The bridge window can end when **all** of these are true:

- Migration cohort fully mirrored to Plane and reconciled.
- Plane Worker Dispatcher v0 has run a green pilot end-to-end.
- CAO seat exists as separate session and has run at least one PASS and one
  REJECT verdict.
- Nightly Drift Check confirms no agent created Linear items in the last 7
  days outside approved bridge skills.
- Bot Token rotation policy is in effect.
- CEO releases the HG-2 cutover gate.

Until those are true, Plane is canonical and Linear bridge stays on
read-only-plus-mirror.

## Drift Check Pattern

A nightly job (not part of this slice; tracked separately) reads Linear via
the connected MCP and checks:

- New Linear issues created since the last check?
- New Linear comments by Company.OS-related accounts?
- Status changes on cohort items?

Output: a private operations report, not an automatic close. Drift findings
are routed back to Plane as a `role:coo` work item if action is required.

## What Workers Are Told

Every worker issue (Plane work item dispatched to Claude Code, Codex, or any
runtime) must include:

```text
SourceOfTruth: Plane work item COMPA-<seq> (canonical)
Bridge: Linear <KEY> (mirror-only, read for context, do not write)
```

Workers must not propose changes to Linear state from this slice forward
unless their issue contract explicitly enables a bridge action and the action
appears in `AlwaysAllow`.

## Hygiene

- Plane OAuth / Plane App bot identity (`PLANE_APP_BOT_TOKEN` in Keychain) is
  the canonical identity for Company.OS Plane reads and writes. Do not route
  normal runtime or migration writes through a raw Plane API key when the app
  installation is available.
- Linear MCP connector remains authenticated for read + bounded bridge
  comments. Read access is broad; write access is restricted to bridge
  skills that use the `mirror-only` action set.
- Source-company-specific Plane workspace details remain in private operating
  docs. This doctrine stays generic and reusable.
