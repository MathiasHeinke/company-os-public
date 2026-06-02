# Plane Native Template Registry

Status: v0 seed complete for operator-led installs; Plane UI/API installation
remains manual until Plane exposes a supported template import path.

## Purpose

Company.OS already has strong Markdown templates for worker contracts, CAO
audits, HumanGate decisions and client installs. The missing layer is a
Plane-native template registry so new Plane work items, pages and projects start
from proven Company.OS shapes instead of ad-hoc pasted prose.

This document defines the registry and the operating rule:

- Company.OS repo remains the source of truth for template content.
- Plane-native templates are generated from `registries/plane-templates/`.
- Until a supported Plane template API is verified, installation into Plane is a
  manual UI step or a controlled future worker contract.
- Worker/CAO/Controller semantics do not change: templates help create items;
  they do not bypass Stage 0.5, CAO, Controller or HumanGate.

## Current Release Boundary

The current template layer is accepted as **v0 seed complete** for guided,
operator-led Company.OS installs.

This means the release bar is:

- templates live in Git as the canonical source of truth
- `registries/plane-templates/company-os.json` validates and renders the
  current Plane-native seed set
- operators may render or copy templates into Plane manually
- generated work items still pass through Stage 0.5, Stage 0.6, CAO,
  Controller and HumanGate as usual

This does **not** require a browser-based install UI. A Browser/UI install layer
is a product-experience feature, not a safety prerequisite for the current
runtime. It belongs to the later AionUI/Hermes operator-shell layer, where
Company.OS can offer a guided install, discovery wizard and template activation
flow.

Do not expand template work into an open-ended template-library project. Add or
promote templates only when one of these is true:

- a real Plane worker run exposed repeated manual copy/paste or contract-shape
  drift
- a client or internal install needs the template to reproduce a proven flow
- a controller/CAO review identified a missing gate or decision surface
- the AionUI/Hermes shell needs a specific install/onboarding surface

Until then, the default posture is: registry seed accepted, manual install
documented, browser install deferred.

## Canonical Registry

```text
registries/plane-templates/company-os.json
```

The registry stores:

- `id`
- `plane_surface`: `work_item`, `project` or `page`
- human name and description
- default labels and priority
- variable defaults
- Markdown body

The body may include `${PLACEHOLDER}` variables. Every placeholder must have a
default in the template's `variables` object. The validator fails closed when a
placeholder is undeclared.

## CLI

Validate the registry:

```bash
node scripts/plane/plane-template-registry.mjs validate
```

List templates:

```bash
node scripts/plane/plane-template-registry.mjs list
node scripts/plane/plane-template-registry.mjs list --surface work_item
```

Render a copy-pasteable Plane body:

```bash
node scripts/plane/plane-template-registry.mjs render \
  --id work-item.clevel-worker-contract \
  --var TITLE="Bounded Runtime Parser Fix" \
  --var ROLE_LABEL=role:cto
```

Render into an artifact:

```bash
node scripts/plane/plane-template-registry.mjs render \
  --id work-item.hg4-founder-review \
  --output reports/templates/compa-###-founder-review-template.md
```

## Installer Adapter

The installer adapter turns the repo registry into deterministic Plane UI
installation artifacts and verifies them later. It intentionally does not write
Plane templates.

Probe live Plane for supported template endpoints:

```bash
node scripts/plane/plane-template-installer.mjs probe \
  --workspace companyos \
  --project-id <project-id> \
  --json
```

Render the full install packet:

```bash
node scripts/plane/plane-template-installer.mjs render \
  --output-dir reports/runs/[WORK_ITEM_ID]/template-install-artifacts
```

Verify that an existing packet still matches the registry:

```bash
node scripts/plane/plane-template-installer.mjs verify \
  --output-dir reports/runs/[WORK_ITEM_ID]/template-install-artifacts
```

Safety rules:

- `probe` sends only `GET` requests.
- `render` and `verify` are local-file operations.
- No command in this adapter creates, updates or deletes Plane templates.
- If `probe` returns `manual-required`, use the generated
  `install-runbook.md` and rendered `templates/**.md` files as the copy source.

## Initial Template Set

| Template ID | Surface | Purpose |
|---|---|---|
| `work-item.clevel-worker-contract` | Work item | Default delegable C-Level worker item with a parseable Worker Issue Contract. |
| `work-item.cao-audit` | Work item | Separate CAO audit item; CAO verifies and reports, but does not build. |
| `work-item.hg4-founder-review` | Work item | Founder decision item with sign/reject YAML for true HG-4 decisions. |
| `work-item.goal-parent` | Work item | `/goal` parent; children carry dispatchable contracts. |
| `page.founder-daily-queue` | Page | Daily Founder / Chief-of-Staff decision cockpit for HG-4 and HG-3.5. |
| `project.company-os-client-install` | Project | Client install seed with first pages and work-item sequence. |

## Plane Installation Rule

When creating Plane-native templates manually:

1. Render the template from this registry.
2. Paste the rendered body into the matching Plane template surface.
3. Preserve the template ID in the Plane template name or first paragraph.
4. Attach the default `role:*` label where the surface supports labels.
5. Do not mark any generated work item `Done`.
6. Do not change `dispatch: manual` to `dispatch: ready` unless a separate
   scheduler/dispatcher run is approved.

## Future API Importer

A future importer may write to Plane only after:

- a supported Plane endpoint for work-item/project/page templates is verified
  against official Plane docs or live API discovery
- the importer has a dry-run mode and tests
- the importer posts no runtime secrets and never prints Plane tokens
- templates are idempotent by `id`
- a controller review confirms no hidden `dispatch: ready` or Done transition

Until then, `scripts/plane/plane-template-registry.mjs` is intentionally local:
it validates, lists and renders; it does not mutate Plane.

`scripts/plane/plane-template-installer.mjs` is also intentionally non-mutating.
It may graduate to a write-capable importer only after the Future API Importer
conditions above are met and a new Worker Contract explicitly authorizes the
write path.

## Contract Wizard

The seed templates are intentionally static. For day-to-day work, use the
contract wizard to turn operator answers into a dispatcher-parseable Worker
Issue Contract.

Show the intake questions:

```bash
node scripts/plane/plane-contract-wizard.mjs questions
```

Draft a new worker item body:

```bash
node scripts/plane/plane-contract-wizard.mjs draft \
  --title "Bounded Template Probe" \
  --role role:cto \
  --mode implement \
  --source docs/operations/plane-native-template-registry.md \
  --acceptance "Rendered artifacts verify against the registry." \
  --gate "node --test scripts/plane/*.test.mjs" \
  --allowed-write-path scripts/plane/ \
  --allowed-write-path reports/runs/[WORK_ITEM_ID]/ \
  --human-gate HG-2 \
  --capability-profile claude-clevel-worker/cto/runtime \
  --sandbox required \
  --output reports/runs/[WORK_ITEM_ID]/example-worker-contract.md
```

The wizard fails closed when source truth, acceptance criteria, gates or write
paths are missing. Its output still goes through Stage 0.5 Contract Controller
before runtime dispatch.

For browser-/UI-bound work, the wizard also fails closed unless the operator
declares the browser-auth lane explicitly:

```bash
node scripts/plane/plane-contract-wizard.mjs draft \
  --title "Plane Browser UI Screenshot Probe" \
  --role role:cto \
  --mode implement \
  --source docs/operations/plane-native-template-registry.md \
  --acceptance "Worker captures browser screenshot evidence after trying the Plane UI." \
  --gate "Playwright screenshot capture" \
  --allowed-write-path reports/runs/[WORK_ITEM_ID]/ \
  --human-gate HG-2 \
  --runtime-browser-auth browser-connector
```

Allowed values are `none`, `forbidden`, `browser-connector` and
`operator-shared-session`. `RuntimeAuth` / Plane app-token access is not a
browser session.

## Non-Goals

- No undocumented Plane API writes.
- No auto-creation of work items from templates.
- No replacement for `docs/templates/worker-issue-contract.md`.
- No relaxation of Stage 0.5, CAO, Controller or HumanGate.
