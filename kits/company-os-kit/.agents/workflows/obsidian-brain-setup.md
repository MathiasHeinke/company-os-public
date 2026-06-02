# Obsidian Brain Setup Workflow

Use this workflow when a founder, CEO or operator asks to add Obsidian as a
Company.OS brain, cockpit, vault view or local knowledge surface.

## Purpose

Configure Obsidian as an optional interface over existing Company.OS Markdown
truth. Do not create a second memory system.

## Sources

- `docs/operations/obsidian-brain-interface.md`
- `.company-os/operations/obsidian-brain-interface.example.md`
- `.company-os/operations/software-stack.md`
- `memory-bank/system-index.md`
- `memory-bank/activeContext.md`

## Output

1. Current source-of-truth map
2. Selected Obsidian mode
3. Local vault path
4. Core plugin checklist
5. Property schema applied to selected files
6. Starter Bases view list
7. Security and sync boundary
8. Activity-log spike decision
9. First operator review needed

## Steps

1. Confirm Obsidian mode:

   ```text
   disabled | read_cockpit | dashboard_bases | activity_log_spike
   ```

2. Copy the example config:

   ```bash
   cp .company-os/operations/obsidian-brain-interface.example.md \
      .company-os/operations/obsidian-brain-interface.md
   ```

3. Open the existing workspace root as the local Obsidian vault.

4. Keep `.obsidian/` local-only unless a separate review approves sanitized
   committed settings.

5. Enable only baseline core plugins:

   - Properties
   - Bases
   - Workspaces
   - Daily notes
   - Graph view
   - Search

6. Add Company.OS properties only to selected starter files.

7. Build starter Bases views manually.

8. If activity logging is requested, create a spike note first. Do not enable a
   live hook until the operator reviews the exact file path and entry shape.

## Stop Rules

- Do not install community plugins.
- Do not commit `.obsidian/` state by default.
- Do not use Web Viewer for sensitive or credentialed apps.
- Do not copy Plane state into notes as a second ledger.
- Do not copy Honcho memory into notes as a second memory store.
- Do not write secrets, customer data, private founder context or raw chat logs.
- Do not mark Plane Done.
- Do not dispatch workers.
