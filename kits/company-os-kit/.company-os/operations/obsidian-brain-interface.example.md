# Obsidian Brain Interface

Status: example, copy to `.company-os/operations/obsidian-brain-interface.md`
Use for: configuring an optional Obsidian cockpit over the local Company.OS
workspace

## Mode

Choose one:

```text
obsidian_mode: disabled | read_cockpit | dashboard_bases | activity_log_spike
```

Default:

```text
obsidian_mode: read_cockpit
```

## Local Vault

```text
vault_path:
opened_workspace_root:
obsidian_sync: disabled | approved | not_applicable
obsidian_settings_policy: local_only | reviewed_sanitized_commit
community_plugins: disabled | approved_list
web_viewer: disabled | public_only
```

Rules:

- Open the existing workspace root as the vault.
- Keep `.obsidian/` local-only unless a review card approves sanitized settings.
- Do not use Web Viewer for credentialed or sensitive apps.
- Do not enable community plugins in the baseline.

## Core Plugins

Baseline core plugins:

- [ ] Properties
- [ ] Bases
- [ ] Workspaces
- [ ] Daily notes
- [ ] Graph view
- [ ] Search

## Property Schema

Use these keys on selected files only. Do not add properties to every file
blindly.

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
---
```

## Starter Files

Mark these first:

- [ ] `memory-bank/activeContext.md`
- [ ] `memory-bank/sessionLog.md`
- [ ] `.company-os/operations/human-gates.md`
- [ ] `.company-os/operations/software-stack.md`
- [ ] `.company-os/operations/first-run-checklist.md`
- [ ] first source-of-truth doc for the pilot wedge

## Starter Views

Create manually in Obsidian Bases:

| View | Purpose |
|---|---|
| Current Workstreams | Active and blocked operating streams. |
| Open Gates | HumanGate and controller decisions. |
| Decisions | Durable decisions. |
| Sessions | Session notes and reviewed activity. |
| Brain Inbox | Unrouted captured items. |
| Public-Safe Only | Demo and screenshot-safe notes. |

## Activity Log Spike

Only enable after operator review.

```text
activity_log_target:
activity_log_status: disabled | spike | accepted
review_owner:
```

Entry shape:

```markdown
### HH:MM - agent activity

- Source:
- Action:
- Artifact:
- Review: unreviewed
```

Blocked:

- raw prompt dumps
- automatic durable Honcho conclusions
- automatic Plane Done
- public release notes without review
- customer, credential, finance, health or private founder data in public-safe
  notes

## Release Gate

- [ ] No `.obsidian/` state committed unless separately reviewed.
- [ ] No secrets or credentials.
- [ ] No raw chat dumps.
- [ ] No customer/private founder data.
- [ ] Obsidian remains optional in `.company-os/operations/software-stack.md`.
- [ ] Public screenshots only use `cos_public_safe: true` notes.

Reference:

```text
docs/operations/obsidian-brain-interface.md
```
