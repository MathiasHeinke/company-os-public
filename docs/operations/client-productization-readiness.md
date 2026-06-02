# Client Productization Readiness

Status: canonical productization gate for `0.5.1-alpha.1`
Use for: deciding whether Company.OS can be installed into another company
Last updated: 2026-05-17

## Verdict

Company.OS `0.5.1-alpha.1` is ready for a **guided done-for-you pilot** and can
generate a sanitized public mirror artifact, rehearse the fresh-history public
repo path through a local temporary bare remote and install the kit from that
remote clone.

It is not yet an unrestricted self-serve public product.

```text
guided pilot: yes
public mirror artifact: yes
public open repo push: gated
unsupported self-serve install: gated
default scheduler autonomy: gated
```

The repo contains the reusable operating system, contracts, runtime gates,
Plane integration, capability registry, controller/CAO doctrine and installable
kit. A trained operator can install it for a client tomorrow.

A random company should not yet clone the private repo and enable full
automation without an operator. The supported public-surface path is the
generated mirror artifact plus guided setup; credentials, Plane App install,
Honcho workspace separation, scheduler policy and first-pilot gates still need
operator review.

## Productized Surfaces

| Surface | Status | Source |
|---|---|---|
| Versioning | ready | `VERSION`, `CHANGELOG.md`, `docs/releases/versioning.md` |
| Company discovery | ready | `docs/operations/client-onboarding-discovery-pipeline.md`, `docs/templates/company-discovery-brief.md` |
| EVE first-run boot packet | ready | `docs/operations/eve-first-run-founder-onboarding.md`, `kits/company-os-kit/.company-os/onboarding/eve-boot-packet.example.json`, `scripts/onboarding/first-company-packet.mjs` |
| Client stack registry | ready | `docs/registries/company-os-client-stack-registry.md` |
| Kit install | guided alpha | `scripts/install/bootstrap.mjs`, `kits/company-os-kit/`, `docs/bootstrap/fresh-company-setup.md` |
| Plane execution ledger | ready for guided installs | `docs/orchestration/plane-first-linear-bridge.md`, `docs/integrations/plane-app-control-plane.md` |
| Worker contracts | ready | `docs/templates/worker-issue-contract.md`, `docs/orchestration/spec-to-worker-pipeline.md` |
| Capability registry | ready as gate | `docs/registries/capability-registry.md`, `registries/capabilities/company-os.json` |
| Runtime Dispatcher | alpha | `docs/orchestration/company-os-runtime-dispatcher-v1.md`, `scripts/orchestration/runtime-dispatcher-v1.mjs` |
| Update routine | dry-run ready; public-upstream hardening pending | `scripts/update/company-os-update.mjs`, `docs/releases/0.7.1-client-self-onboarding-readiness.md`, `docs/templates/supergoals-2026-05-31/public-upstream-update-parent.md` |
| Scheduler | gated alpha | `docs/orchestration/headless-worker-runtime-boot-contract.md`, `docs/operations/automation-cutover-to-plane-dispatcher.md` |
| CAO/controller | alpha | `docs/agents/cao.md`, `docs/orchestration/codex-controller-runtime.md` |
| Honcho memory | policy-ready, setup-guided | `docs/orchestration/claude-clevel-worker-runtime.md`, kit boot files |
| Obsidian brain interface | optional guided alpha | `docs/operations/obsidian-brain-interface.md`, `kits/company-os-kit/.company-os/operations/obsidian-brain-interface.example.md`, `kits/company-os-kit/.agents/workflows/obsidian-brain-setup.md` |
| Page Index | ready | `docs/operations/page-index-generator.md`, `scripts/page-index/` |
| Supabase | optional connector/backend | this document, kit knowledge files |
| Public mirror artifact | ready | `scripts/release/build-public-mirror.mjs`, `scripts/release/verify-clean-clone.mjs`, `scripts/release/verify-fresh-history-remote.mjs` |
| Public repo push | gated | `docs/github/repository-strategy.md`, HumanGate release |

## Guided Pilot Bar

Before installing Company.OS into a new firm, the operator must complete:

1. **Version pin.** Install a specific `VERSION`, not `latest`.
2. **Discovery.** Run company discovery, market map, business pressure test and
   AI/GDPR readiness before creating a large backlog.
3. **Plane App setup.** Use Plane App / bot-token flow as the target identity.
   A personal API key is bootstrap/fallback only.
4. **Role routing.** Create `role:*` labels and require exactly one role label
   on every worker-ready item.
5. **Spec-to-Worker conversion.** Turn founder intent or Spec Kit artifacts into
   a flat fenced `worker_issue_contract` before runtime dispatch.
6. **Capability profile.** Every Claude/Codex/Gemini worker item names a
   CapabilityProfile from the registry.
7. **Honcho split.** Company memory, personal/founder memory and product/user
   memory use separate workspaces. Workers may propose durable memory, not write
   it, unless explicitly authorized.
8. **Scheduler off by default.** Start with manual or dry-run dispatch. Enable
   repeated scheduler lanes one at a time after CAO/controller evidence.
9. **First pilot read-only or low-risk.** The first client pilot must not touch
   production data, schema/RLS/auth, public publishing, outreach or spend.
10. **CEO/Founder acceptance.** Done, merge, deploy, public release and autonomy
    increases stay behind HG-2.5/HG-3 gates.

## Self-Serve Release Bar

Unsupported self-serve release remains blocked until all of the following are true:

- install script or wizard provisions kit files and active local setup files
  without overwriting existing client rules or installation state
- Plane App setup is documented with callback, token rotation and dry-run
  verification
- Honcho setup is documented with workspace IDs and safe memory boundaries
- scheduler can run `--dry-run` and `--mode run` pilots with clear kill switch
- Capability Registry validates declared tools/connectors/subagents before spawn
- public mirror builder and clean-clone verifier pass from current `main`
- public repo or release bundle can update a private/client install in
  dry-run-first mode, with report provenance proving the consumed public
  version and protected local state preservation
- README, VERSION, CHANGELOG, ROADMAP and install docs agree on the version
- at least one non-founder pilot completes Plane -> Worker -> CAO -> Controller
  without chat copy/paste

## Plane Setup Boundary

Plane is core.

For new client installs:

- Plane is the canonical execution ledger.
- Linear is legacy/import/bridge only unless a client explicitly chooses it as
  a temporary migration source.
- Plane App install is preferred over collecting long-lived personal API keys.
- Worker-ready items require a parseable contract and role label.
- Workers and CAO do not mark Plane `Done`.

## Honcho Setup Boundary

Honcho is a memory layer, not a task queue.

Required split:

| Memory class | Honcho workspace |
|---|---|
| company architecture / operations | company workspace |
| founder personal / private strategy | personal workspace |
| product/user memory | product or user workspace |

Worker rule:

- read only the workspace declared in the CapabilityProfile or work item
- include memory proof in `worker.reported`
- propose durable conclusions in the reflection block
- do not write durable memory unless the work item explicitly allows it

## Obsidian Brain Interface Boundary

Obsidian is optional local interface, not a Company.OS source of truth.

Supported in guided alpha:

- open the existing workspace root as a local vault
- use core plugins such as Properties, Bases, Workspaces, Daily notes, Graph
  view and Search
- create local dashboard views over selected Markdown properties
- keep `.obsidian/` state local-only unless a sanitized settings review
  explicitly approves committing it

Not supported as a public baseline:

- required Obsidian install before Company.OS works
- community plugins
- custom Obsidian plugin distribution
- Web Viewer for sensitive or credentialed apps
- Obsidian Sync credentials or policy managed by Company.OS
- copying Plane or Honcho state into notes as a second ledger or second memory
  store

Reference:

```text
docs/operations/obsidian-brain-interface.md
```

## Scheduler Boundary

Scheduler is not a second brain and not a second ledger.

The scheduler may:

- rotate/ensure Plane app token
- read Plane queue items
- validate worker contract and CapabilityProfile
- create lock/context comments
- spawn one bounded runtime when HG level permits it
- capture stream/report/metrics artifacts
- route output to CAO and controller

The scheduler may not:

- decide new strategy
- create broad work without CEO intent
- bypass Capability Registry
- mark Done
- merge/push/deploy
- write production data
- write durable Honcho memory by itself

## Supabase Boundary

Supabase is **optional connector/backend**, not a Company.OS core requirement.

Use Supabase when a client product needs database/auth/storage/edge functions.
Do not require Supabase for a pure operating-system install that only needs
Plane, docs, GitHub, memory and headless workers.

If Supabase is used:

- RLS is mandatory on every table.
- Service-role keys are never exposed to workers.
- Schema/RLS/auth changes are HG-3.
- Workers may run read-only analysis only when credentials and scopes are
  explicitly declared in the CapabilityProfile.
- Production writes require an explicit HumanGate release card.

## Public Sanitize Gate

The repository may be private-staging while internal reports and live metrics
exist in-tree. A public/self-serve release must pass:

```bash
node scripts/release-gates/productization-readiness.mjs check --public-release
```

The guided/private alpha gate is:

```bash
node scripts/release-gates/productization-readiness.mjs check
```

Public release must remove or sanitize:

- live `metrics/*.jsonl` ledgers
- internal `reports/` artifacts with client/company details
- committed `.obsidian/` state unless separately reviewed and sanitized
- private paths
- secrets or token examples
- source-company-specific work item IDs unless intentionally documented as
  sanitized examples

### Drift checks (guided vs public release)

The gate runs the following deterministic checks in addition to the required
docs/scripts and version/changelog drift. Each row names how the same check
behaves in guided alpha (default) vs `--public-release` mode.

| Check id | Guided alpha | `--public-release` | What it guards |
|---|---|---|---|
| `kit.legacy-ledger-template` | block | block | `kits/company-os-kit/.company-os/templates/linear-worker-issue-template.md` must not assert Linear as the canonical execution ledger. |
| `kit.legacy-ledger-registry` | block | block | `kits/company-os-kit/.company-os/operations/workspace-registry.example.json` must default `execution_ledger` to `plane`. |
| `docs.hard-coded-developer-paths` | warn | block | Hard-coded private home paths (any `/Users/<name>/...`) in `docs/operations/`, `docs/orchestration/`, `kits/` or public-mirror `scripts/` (skips `*.example*` files). Use placeholders such as `${COMPANY_OS_ROOT}` or `${LOCAL_WORKSPACE}` per `docs/operations/portable-path-placeholders.md`. |
| `kit.founder-identity-leak` | warn | block | Founder identity literals (`Mathias Heinke`, `Founder ARES`) in tracked kit content. |
| `kit.private-domain-leak` | warn | block | Source-company domain literals in tracked kit, scripts or docs. Pattern set defined in `scripts/release-gates/productization-readiness-core.mjs`; matches private product and service hostnames/prefixes. |
| `kit.token-shaped-string` | warn | block | Token-shaped strings in tracked kit content (Anthropic/OpenAI/GitHub PAT/Slack/Google API key prefixes and source-company token prefixes). Evidence is redacted to `path:line + pattern id`; the matched value is never printed in details, warnings, blockers or the rendered report. |
| `install.prerequisite-drift` | warn | block | Top-level `.env.example` and `scripts/install/bootstrap.mjs` must exist for a stranger to install the kit unattended. |

Two-mode semantics: guided alpha tolerates founder/source-company artefacts so
trained operators can keep working; `--public-release` flips the same evidence
to a closed gate. The token-shaped-string check is the only sensitivity-class
finding that intentionally lands in the rendered report without its value, so a
human can grep `path:line` and inspect the source line directly without the gate
ever logging the secret.

## Current Action

For the next rocket tests, do not start from raw prompts. Start from:

1. `docs/orchestration/spec-to-worker-pipeline.md`
2. `docs/templates/worker-issue-contract.md`
3. `docs/registries/capability-registry.md`
4. `docs/orchestration/headless-worker-runtime-boot-contract.md`
5. this productization gate

Then create a Plane item that can pass Dispatcher, Capability, Runtime, CAO and
Controller without copy/paste.
