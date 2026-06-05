# Company.OS Kit

Company.OS Kit is the installable workspace kit for a new AI-native company or
project.

It is based on the previous Antigravity Kit, renamed and repositioned as the
portable operating layer for Company.OS.

## What It Contains

```text
kits/company-os-kit/
├── .agents/
│   ├── rules/          # boot rules, memory automation, workspace rules
│   └── workflows/      # slash-command style workflows
├── .company-os/
│   ├── charters/       # org-level agent role charters
│   ├── eve/            # EVE first-run connector manifest
│   ├── operations/     # work-order pipeline, registry examples
│   └── templates/      # execution-ledger and discovery templates
├── .antigravity/
│   ├── personas/       # expert personas and routing profiles
│   ├── knowledge/      # domain knowledge files and playbooks
│   ├── logs/           # architect memory template
│   └── *.md            # system prompt, router, stack context
├── memory-bank/        # local project memory template
├── scripts/            # eval, research, MCP gateway templates
└── templates/          # AGENTS.md, design system, semantic context
```

The internal folder `.antigravity/` is kept for compatibility with existing
workflows. The product name is Company.OS Kit.

## Versioned Install Rule

Do not install this kit as "latest." Each target workspace must record:

```text
Company.OS version:
Autonomy profile:
Install date:
Workspace registry:
Execution ledger:
HumanGate owner:
First pilot issue:
Known disabled lanes:
```

Use `.company-os/operations/install-record.example.md` as the local template.
The canonical repo-level references are `VERSION`, `CHANGELOG.md`,
`docs/releases/versioning.md` and
`docs/operations/company-os-client-rollout-doctrine.md`.

For guided client installs, also review:

```text
docs/operations/client-productization-readiness.md
docs/orchestration/spec-to-worker-pipeline.md
docs/registries/capability-registry.md
docs/integrations/plane-app-control-plane.md
```

## Fresh Project Install

For `1.0.0-alpha.1`, the recommended remote-founder install path is:

```bash
git clone https://github.com/MathiasHeinke/company-os-public.git
cd company-os-public

node scripts/install/public-rc.mjs install \
  --target /path/to/target-workspace \
  --company "Acme Systems" \
  --website "https://acme.example" \
  --offer "AI operating-system setup" \
  --buyer "founder-led service firms" \
  --founder "Jane Founder" \
  --approval-owner "Jane Founder" \
  --first-department marketing \
  --json
```

This wraps the low-level bootstrap installer, writes the first intake, generates
EVE's boot packet and writes update/handoff provenance from the public source.

Then install the managed local Command EVE operator shell from the same public
source clone:

```bash
node scripts/operator-shell/install-command-eve.mjs install \
  --client-root /path/to/target-workspace \
  --write-report \
  --json
```

This installs pinned local sidecars under
`.company-os/operator-shell/`: AionUI `v2.1.10` with the Command EVE source
overlay, AionCore `v0.1.19` prepared as the local backend, locally built
renderer assets, and Hermes Agent `0.15.2` in a Python venv. It writes
provider/model defaults only (`openrouter` / `minimax/minimax-m3`);
authenticate through the provider's official flow and never paste raw API keys
into chat.

After the operator-shell install passes, use the generated local commands:

```bash
/path/to/target-workspace/.company-os/bin/start_eve
/path/to/target-workspace/.company-os/bin/update_eve check
/path/to/target-workspace/.company-os/bin/update_eve apply
```

The `start_eve` command launches the patched local AionUI web UI with Hermes as
the default EVE agent. The `update_eve` command checks or applies updates from
the public Company.OS source clone, then refreshes the local AionUI/Hermes
sidecars according to the current operator-shell manifest.

If an operator needs the low-level bootstrap only, run a dry-run first:

```bash
node scripts/install/bootstrap.mjs install \
  --source /path/to/Company.OS \
  --target /path/to/target-workspace \
  --dry-run \
  --json
```

If the dry-run is clean, install:

```bash
node scripts/install/bootstrap.mjs install \
  --source /path/to/Company.OS \
  --target /path/to/target-workspace \
  --json
```

The installer copies the kit and creates these active local files from the
versioned examples/templates:

- `.company-os/install-record.md`
- `.company-os/company-discovery-brief.md`
- `.company-os/first-run-checklist.md`
- `.company-os/operations/workspace-registry.json`
- `.company-os/operations/software-stack.md`
- `.company-os/operations/human-gates.md`

The public-RC wrapper also writes:

- `.company-os/onboarding/company-intake.json`
- `.company-os/onboarding/intake-record.json`
- `.company-os/onboarding/eve-boot-packet.json`
- `.company-os/bin/start_eve`
- `.company-os/bin/update_eve`
- `reports/company-os-public-rc/YYYY-MM-DD/company-os-public-rc-1.0.0-alpha.1.md`
- `reports/operator-shell/YYYY-MM-DD/command-eve-install-1.0.0-alpha.1.md`

If using the low-level bootstrap path, generate the first-company packet from
the confirmed signup/report seed before EVE greets the founder for real work:

```bash
node /path/to/Company.OS/scripts/onboarding/first-company-packet.mjs \
  --target /path/to/target-workspace \
  --input /path/to/target-workspace/.company-os/onboarding/company-intake.json \
  --json
```

This materializes `.company-os/onboarding/eve-boot-packet.json` so EVE starts
with known company facts and asks for confirmation instead of opening with a
blank long-form questionnaire.

Then replace placeholders with the new company/project values:

```bash
rg "\\[PROJEKT\\]|\\[projekt-repo\\]|\\[PROJECT_REF\\]|<plane-" /path/to/target-workspace
```

If target files already exist, the installer blocks and reports `collisions`.
Use `--force` only after reviewing the local state it would overwrite.

## Required Boot Files

Every agent session should read:

1. `AGENTS.md` or `templates/AGENTS.md`
2. `.agents/rules/system.md`
3. `.agents/rules/workspace.md`
4. `.antigravity/system-prompt.md`
5. `.antigravity/personas/meta-orchestrator.md`
6. `.antigravity/agentic-router.md`
7. `memory-bank/activeContext.md`

## Primary Workflows

- `/init` - bootstrap project context
- `/agentic-plan` - plan before execution
- `/agentic-execute` - execute a bounded phase
- `/deep-audit` - high-confidence audit
- `/deep-e2e` - end-to-end verification
- `/engine-eval` - scenario/eval test
- `/business-pressure-test` - blunt market, buyer and Company.OS fit critique
- `/security-sweep` - security check
- `/obsidian-brain-setup` - optional local Obsidian cockpit over existing
  Company.OS Markdown truth
- `/update-memory` - local memory update
- `/ship-it` - ship gate

## Primary Persona Layers

The kit ships role-based persona archetypes only. Named personas (living persons,
fictional characters, or branded characters) are not included in the public kit.
See `.antigravity/personas/README.md` for the full doctrine and private-overlay rule.

- `meta-orchestrator` - context loading and routing bootloader
- `ai-architect` - multi-agent and AI architecture
- `engineering-lead` - engineering and runtime quality
- `audit-investigator` - audit and investigation
- `security-engineer` - security perspective
- `product-visionary` - product and UX standard
- `copy-architect` - copy and positioning
- `growth-engine` - growth and marketing pressure-test
- `compliance-officer` - compliance gate

Named or domain-specific personas for private deployments belong in a local
private overlay (for example under a user-owned `.company-os/private-overlays/`
folder), not in the kit. Public-RC install and smoke checks must not inspect or
depend on any private overlay path.

## Primary Org Layers

Organization-level agent charters live in `.company-os/charters/`.

These are manager roles, not expert personas:

- CEO Worker
- CTO Agent
- CPO Agent
- CMO Agent
- QA / Eval Agent
- Controller Agent

Expert personas can be used as specialist lenses under these roles, but they do
not own departments and cannot self-promote.

## Autonomous Work-Order Pipeline

The installable pipeline lives in `.company-os/operations/`:

- `autonomous-work-order-pipeline.md` explains the local operating loop.
- `install-record.example.md` pins the installed version, autonomy profile,
  HumanGate owners and disabled lanes.
- `workspace-registry.example.json` maps portable workspace keys to local repos.
- `software-stack.example.md` records required, autonomy and optional connector
  surfaces for the first pilot.
- `human-gates.example.md` records gate owners and blocked actions.
- `first-run-checklist.example.md` turns install output into a pilot checklist.
- `onboarding/company-intake.example.json` is the first input for
  `scripts/onboarding/first-company-packet.mjs`.
- `onboarding/eve-boot-packet.example.json` shows the first runtime packet EVE
  should load before greeting a fresh founder.
- `automation-registry.example.md` defines starter recurring jobs.
- `.company-os/templates/company-discovery-brief.md` captures the company model
  after technical install and before department rollout.
- `.company-os/operations/obsidian-brain-interface.example.md` records an
  optional local Obsidian cockpit setup. It is disabled by default, keeps
  `.obsidian/` local-only, and treats Obsidian as interface rather than source
  of truth.
- `.company-os/eve/connector-manifests.json` defines which connectors EVE
  should inspect, guide, defer or gate during first-run setup.
- Git worktree hygiene is a starter L1 job: it reports dirty roots, dirty
  sandbox worktrees, unexpected branches and ahead/behind state without
  deleting or resetting anything.
- `.company-os/templates/linear-worker-issue-template.md` is the copyable
  execution-ledger issue contract.
- `.agents/workflows/business-pressure-test.md` turns the startup-pressure-test
  lens into a reusable onboarding workflow for new companies.

For paid or third-party setups, customize these files before enabling scheduled
dispatch. Start with one read-only pilot issue, then expand autonomy only after
the controller can prove source-of-truth, report artifacts, event rows and
HumanGate handling.

## Command EVE First-Run Runtime

`scripts/operator-shell/eve-sidecar.mjs prepare` turns the public kit doctrine
into local-only AionUI/Hermes context:

```text
${COMPANY_OS_PRIVATE_ROOT}/aion-companyos-context/aionui-skills/command-eve-first-run/SKILL.md
${COMPANY_OS_PRIVATE_ROOT}/aion-companyos-context/EVE_CONNECTOR_MANIFESTS.json
```

The canonical sources are:

```text
docs/operations/command-eve-first-run-skill-pack.md
kits/company-os-kit/.company-os/eve/connector-manifests.json
schemas/eve/connector-manifest.schema.json
```

EVE should use this to start with "what I already know / what is missing /
connector status / challenge / three next choices" instead of a broad first-run
questionnaire.

## Updates

The `/update_eve` implementation lives in the Company.OS source repo at
`scripts/update/company-os-update.mjs`. The supported update target for the
`0.9.0-rc.0` line is an existing `0.7.4-rc.0` install. Earlier 0.6.x, 0.7.0,
0.7.1 and 0.7.3 installs are not in scope for a one-shot 0.9.x update; reach
`0.7.4-rc.0` first.

A remote founder updating an existing `0.7.4-rc.0` install must run the
command twice in non-destructive mode before any non-dry-run apply:

```bash
# Step 1: dry-run check from the public clone; writes a markdown+JSON report
# under the target workspace and prints provenance + secret-audit lines.
node scripts/update/company-os-update.mjs check \
  --source /path/to/company-os-public \
  --target /path/to/existing-074-install \
  --to 0.9.0-rc.0 \
  --write-report \
  --json

# Step 2: dry-run apply; classifies every kit file as add/update/unchanged/
# manual-review/collision/blocked without writing to the target.
node scripts/update/company-os-update.mjs apply \
  --source /path/to/company-os-public \
  --target /path/to/existing-074-install \
  --to 0.9.0-rc.0 \
  --dry-run
```

The check output records:

- `source_version`, `target_version` (read from the target's install-record)
  and `to_version`.
- `source_provenance` (git remote URL, HEAD, branch, `public/private/unknown`
  classification) so the operator can see *which* clone shipped the kit.
- `kit_secret_audit` so an `.env`, `secrets.json`, `credentials.yaml` or
  `connector-auth.json` accidentally living inside the kit source becomes a
  visible blocker before any apply.
- A markdown report at
  `reports/company-os-updates/<YYYY-MM-DD>/company-os-update-<version>.md`
  under the target workspace with sections for Versions, Source Provenance,
  Kit Secret Audit, Summary, Safe Changes, Manual Review Required, Collisions,
  Blocked by Policy, Preserved Local State, Rollback and Blocked Actions.

The update does not overwrite active local `.company-os/` state such as
install record, workspace registry, software stack, human gates, intake
record, first Plane draft, connector manifests or EVE soul file. These are
either preserved by classification (`collision`), hard-blocked
(`HARD_BLOCKED_UPDATE_PATHS`) or held for `manual-review`. The kit also
deliberately excludes `.env`, raw credentials and connector auth files, so a
clean run never copies secrets from the source into the target. The secret
audit makes that guarantee mechanical, not implicit.

The same command supports updating against a sandbox/private source clone for
operator development, but the report will then classify the source as
`private` and warn the operator not to publish any artifacts produced from
that run.

## Productization Boundary

This kit is ready for public release-candidate installs from a public clone or
sanitized public mirror.

It is not stable unattended autonomy. A Company.OS operator or EVE setup flow
must still:

- pin the exact repo `VERSION`
- configure Plane App / bot-token identity
- create the first Plane project, role labels and worker contract template
- set up Honcho workspace separation
- choose which optional connectors are allowed
- run the productization readiness gate
- keep scheduler lanes off or dry-run until the first CAO/controller pilot
  passes

Supabase is optional product backend/connector support. It is not required for
a pure Company.OS control-plane install.

## What Was Excluded From The Import

The Company.OS repo intentionally excludes:

- `.env`
- `node_modules/`
- `.DS_Store`

Keep `.env.example` files, but never commit real credentials.

## Publishability Rule

This kit should remain safe to publish. Before pushing to GitHub, run:

```bash
find . -type f \( -name '.env' -o -path '*/node_modules/*' -o -name '.DS_Store' \)
rg -n "(API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|SERVICE_ROLE|sk-|ghp_|xoxb-)" .
```
