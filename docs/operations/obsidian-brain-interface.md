# Obsidian Brain Interface

Status: optional guided-alpha surface for `0.7.x`
Use for: adding an Obsidian cockpit over Company.OS Markdown truth without
creating a second memory source
Last updated: 2026-05-27

## Decision

Obsidian can be supported as a **brain interface**, not as the Company.OS brain
of record.

Company.OS truth remains in the existing source-of-truth layers:

| Truth class | Source of truth |
|---|---|
| Current operating state | `memory-bank/activeContext.md` and local system index |
| Durable company/process truth | docs, wiki, ADRs, memory bank, accepted reports |
| Execution | Plane work items and parseable worker contracts |
| Agent memory | Honcho workspace split, when configured |
| Code impact | GitNexus and repo-local tests |
| Release decisions | CAO/controller reports and HumanGate release cards |

Obsidian is a local read/review cockpit over those files. It may help a founder
or operator see current context, decisions, gates and notes in one visual
workspace. It must not silently replace Plane, Honcho, GitNexus, release cards
or repo docs.

## Public Release Boundary

This surface is public-safe because it ships only:

- doctrine
- setup checklist
- workflow guidance
- optional property schema
- links to official Obsidian docs

It does not ship:

- an `.obsidian/` runtime state folder
- community plugins
- private vaults
- customer notes
- browser cookies
- sync credentials
- raw chat or memory dumps

The installable kit must work when Obsidian is disabled. Treat Obsidian as an
optional connector in the client stack registry.

## Supported Modes

| Mode | When to use | Authority |
|---|---|---|
| `disabled` | Client does not use Obsidian. | No effect. |
| `read_cockpit` | Operator wants to browse existing Company.OS Markdown files. | Read-only visual layer. |
| `dashboard_bases` | Operator wants tables/cards over note properties. | Local view over existing Markdown. |
| `activity_log_spike` | Operator wants agent activity evidence in daily notes. | Manual spike only; no durable memory authority. |
| `custom_plugin` | Client wants a tailored mini-app inside Obsidian. | Future-gated; not part of public baseline. |

Default for guided alpha: `read_cockpit`.

## Why Bases First

Obsidian Bases is an official core plugin for database-like views over local
Markdown files and their properties. It can display, sort and filter files in
tables, lists and cards. That maps cleanly to Company.OS because our operating
truth already lives in Markdown.

Use Bases before Dataview or custom plugins.

Reasons:

- core plugin, lower supply-chain risk
- works with note properties/frontmatter
- enough for current decisions, open gates and operating views
- avoids turning public Company.OS into an Obsidian plugin distribution

Dataview and chart/community plugins remain local operator choices. They are
not part of the public baseline.

## Property Schema

Use small, atomic YAML properties. Do not encode long summaries or nested
objects in properties; keep long context in the note body.

Recommended keys:

```yaml
---
cos_type: decision | gate | workstream | session | source | inbox
cos_status: active | blocked | parked | closed | draft
cos_owner: ceo | cto | cpo | cmo | coo | cfo | cao | operator
cos_hg: HG-0 | HG-1 | HG-2 | HG-2.5 | HG-3 | HG-3.5 | HG-4 | none
cos_workspace: company-os | client | product | marketing | ops
cos_ledger: plane | none | bridge
cos_public_safe: true | false
cos_next_review: YYYY-MM-DD
cos_source_of_truth: relative/path.md
cos_tags:
  - company-os
  - brain
---
```

Rules:

- `cos_public_safe: false` means do not mirror, publish or include in public
  screenshots.
- `cos_ledger: plane` means the actionable work lives in Plane. Do not copy
  full work-item state into the note.
- `cos_source_of_truth` should point back to the canonical local file when the
  current note is a dashboard or summary.
- Agents may propose property edits, but the operator owns accepted memory
  changes unless a worker contract explicitly grants write authority.

## Starter Views

Create these views manually in Obsidian Bases first. Do not commit generated
`.base` state until a clean public-safe example has been reviewed.

| View | Filter idea | Purpose |
|---|---|---|
| Current Workstreams | `cos_type == workstream` and status is active or blocked | What is moving now. |
| Open Gates | `cos_type == gate` and status is not closed | HumanGate and controller decisions. |
| Decisions | `cos_type == decision` | Durable decision recall. |
| Sessions | `cos_type == session` | Session notes without dumping all chat. |
| Brain Inbox | `cos_type == inbox` | Captured items awaiting routing. |
| Public-Safe Only | `cos_public_safe == true` | Safe demo and screenshot surface. |

## Setup Flow

1. Copy the kit example:

   ```bash
   cp .company-os/operations/obsidian-brain-interface.example.md \
      .company-os/operations/obsidian-brain-interface.md
   ```

2. Open the target workspace root as a local Obsidian vault.

3. Keep `.obsidian/` local-only by default. If the client wants to commit
   sanitized Obsidian settings later, create a separate review card first.

4. Enable only core plugins for the baseline:

   - Properties
   - Bases
   - Workspaces
   - Daily notes
   - Graph view
   - Search

5. Keep community plugins disabled for the baseline.

6. Add properties to a small set of files first:

   - `memory-bank/activeContext.md`
   - `memory-bank/sessionLog.md`
   - `.company-os/operations/human-gates.md`
   - `.company-os/operations/software-stack.md`
   - `.company-os/operations/first-run-checklist.md`
   - one or two current source-of-truth docs

7. Build the starter Bases views.

8. Save a local Obsidian Workspace layout named `Company.OS Brain`. Do not
   commit local layout state without public-safety review.

9. Run the normal Company.OS release checks before public distribution.

## Agent Activity Log Spike

The activity log is evidence, not durable memory.

Allowed spike:

- append timestamped entries to a local daily note or log file
- include action type, source session and report path
- keep entries short
- mark entries as unreviewed until operator review

Blocked by default:

- automatic Honcho durable conclusions
- automatic Plane Done
- automatic public release notes
- raw prompt/chat dumps
- private customer/founder context in public files

Suggested entry shape:

```markdown
### HH:MM - agent activity

- Source: codex | claude | operator
- Action: short factual line
- Artifact: relative/path
- Review: unreviewed | accepted | discarded
```

## Security And Privacy Boundary

Obsidian is local-file-first, but a client setup can still create risk through
sync, plugins and browser surfaces.

Rules:

- Do not require Obsidian Sync.
- Do not put a private Company.OS vault inside another file-sync folder unless
  the client has accepted that sync policy.
- Do not use the Obsidian Web Viewer for sensitive apps such as email, banking,
  health portals, customer admin panels or credentialed dashboards.
- Do not enable community plugins in the public baseline.
- Treat any custom plugin as software: source review, version pin, permission
  review, rollback, and HumanGate before team rollout.
- Do not record secrets, raw personal strategy, customer data or regulated
  health/finance content in public-safe brain views.

## EVE First-Run Questions

When EVE or an operator detects that the founder uses Obsidian, ask only these
bounded questions:

1. Do you want Obsidian disabled, read-only, or dashboard mode for this install?
2. Which local workspace folder should be opened as the vault?
3. Should `.obsidian/` stay local-only, or do you want a reviewed sanitized
   settings folder later?

Do not ask for sync credentials, plugin tokens or browser logins.

## Release Checklist

Before claiming Obsidian Brain Interface is public-release ready:

- [ ] `docs/operations/obsidian-brain-interface.md` is present.
- [ ] Kit example exists at
      `kits/company-os-kit/.company-os/operations/obsidian-brain-interface.example.md`.
- [ ] Kit workflow exists at
      `kits/company-os-kit/.agents/workflows/obsidian-brain-setup.md`.
- [ ] Client stack registry classifies Obsidian as optional.
- [ ] Software stack example includes Obsidian as disabled by default.
- [ ] No `.obsidian/` state is included in the kit baseline.
- [ ] Public-release scan finds no private paths, secrets or source-company
      literals introduced by this surface.
- [ ] Any demo screenshots use `cos_public_safe: true` notes only.

## Source Links

- Obsidian Bases: https://obsidian.md/help/bases
- Obsidian Properties: https://obsidian.md/help/properties
- Obsidian Core plugins: https://obsidian.md/help/plugins
- Obsidian Web Viewer: https://obsidian.md/help/plugins/web-viewer
- Obsidian Sync: https://help.obsidian.md/sync
