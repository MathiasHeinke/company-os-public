# Company.OS Versioning

Status: canonical versioning doctrine
Current version: `1.0.0-alpha.3`
Last updated: 2026-06-05

## Purpose

Company.OS has several version-like numbers. They must not be mixed.

This document defines what each number means so a new company can install,
audit, upgrade and discuss the system without relying on chat memory.

## Version Layers

| Layer | Example | Meaning | Source |
|---|---|---|---|
| Product version | `1.0.0-alpha.3` | Version of the Company.OS repo and installable kit/operator-shell baseline. | `VERSION`, `CHANGELOG.md` |
| Runtime buildout stage | `Stage 7 / 9 proven, Stage 8-9 gated` | How far the Plane -> worker -> CAO -> Codex controller run chain is executable. | `docs/orchestration/company-os-runtime-dispatcher-v1.md` |
| Autonomy profile | `Stage 3.65 / 5` | Operational autonomy maturity of the current control plane. | rollout docs, audit reports |
| Internal maturity score | `7.45 / 10` | Evidence-backed quality score for current internal readiness. | audit/CEO synthesis |
| Marketing / GTM stand | `command-eve-marketing-stand/2026-06-04` | Current Command EVE commercial positioning, content operating system, posting cadence and visual source truth. This is not the repo product version. | `docs/releases/1.0-command-eve-marketing-stand.md`, `docs/strategy/command-eve-offer-v1.md`, `docs/strategy/command-eve-outreach-kit.md` |
| Script/schema versions | `agent-event/v1`, `git-hygiene-controller/v1` | Contract versions for executable helpers and ledgers. | script constants, docs |
| Roadmap tracks | `v0.1` to `v0.7` headings | Planning buckets, not release versions. | `ROADMAP.md` |
| Git tags | `v0.4.1-alpha.1` | Optional release marker after human release gate. | Git |

## Current Canonical Version

```text
1.0.0-alpha.3
```

This means:

- `1`: the product has crossed from pure Company.OS Kit packaging into a
  managed local Command EVE operator-shell install path.
- `0`: first major baseline for installing AionUI + Hermes + EVE context as a
  local managed sidecar.
- `0`: first alpha claim in the 1.0 line. It opens the managed local
  operator-shell install path without claiming stable unattended autonomy.
- `alpha.3`: publish-prep closure for the active local-first Command EVE
  operator-shell line. It keeps the alpha.2 self-install, BYOK/provider auth
  preflight, first-run EVE confirmation, generated launcher auth-check mode and
  update-path proof, then adds the public 0.8/0.9 closure parent/child tree,
  CAO security/code-review/hotfix evidence and website-facing product
  structure brief. It is not stable, not scheduler-default-on and not an
  autonomous publishing/scheduling/outreach/spend/release-worker release.

Included in this candidate:

- founder-facing Command EVE self-install wrapper:
  `scripts/install/command-eve-self-install.mjs`
- managed Command EVE operator-shell installer:
  `scripts/operator-shell/install-command-eve.mjs`
- pinned AionUI `v2.1.10` source-overlay lane with Command EVE branding and
  assets
- pinned AionCore `v0.1.19` backend binary prepared through AionUI's own
  backend downloader and wired into `start_eve`
- pinned Hermes Agent `0.15.2` local Python venv install
- target-local `.company-os/bin/start_eve` and `.company-os/bin/update_eve`
  launchers for non-technical remote pilots
- `clientRoot` support so EVE reads public source truth and the actual client
  install seed separately
- default provider/model profile `openrouter` / `minimax/minimax-m3` with
  bring-your-own-key auth
- `start_eve --auth-check` / `start_eve.mjs check --auth-check` BYOK provider
  smoke. Missing provider key, quota or timeout reports `BLOCKED_AUTH`, not a
  broken product install, and never asks for raw API keys in chat.
- generated runtime boot packet includes `first_run_confirmation.known_facts`,
  `missing_or_unverified_facts`, progressive required/helpful/later setup
  queues and an `adapt_existing_first` existing-system inventory contract.
- `0.7.1-rc.0` self-serve smoke baseline: kit bootstrap, first-company packet
  materialization, EVE boot packet generation, update report writing and update
  apply dry-run against a fresh target
- Command EVE v1.3 governance spine: Supergoal Execution Ladder,
  State-Truth Pass, Knowledge & Context Topology, Self-Observability watchdog
  and Plugin & Connector Integration Harness
- Supergoal Factory runtime doctrine: built/integrated/live separation,
  HG-2.5 Merge Readiness Pack, controller marker emission, scheduler
  lower-worker candidate handoff and post-worker quality registry
- public mirror coverage for the reusable Supergoal / Post-Worker Quality
  docs, scripts, generic quality registry and lower-worker capability profiles
- public mirror coverage for domain-pack and Plane-template registries needed
  by a fresh install
- `scripts/install/public-rc.mjs`: public-RC wrapper for seed -> bootstrap ->
  EVE boot packet -> update provenance -> handoff report
- `scripts/install/command-eve-self-install.mjs`: dry-run first, then
  public-RC workspace install plus managed AionUI/Hermes/EVE sidecar install
  with one combined report and start/update command hints
- Command EVE runtime policy gate for AionUI/Hermes launch posture
- first-response boot-packet behavior so broad openers answer from known
  runtime/company facts instead of dumping a full questionnaire
- face-focused AionUI wait-state assets and mobile input polish
- UI release identity is part of the release contract: every Command EVE UI
  surface that displays a product version must read from `VERSION` directly or
  from a generated config derived from `VERSION`. `start_eve` refreshes AionUI
  `public/command-eve-brand.json` before launch so stale local sidecars cannot
  keep showing an old product version.
- Department Capability Pack Creator and optional Obsidian Brain Interface
- existing `0.6.5` runtime substrate: Plane-first worker contracts, CAO/Codex
  controller gates, sandbox workspace guard and Raindrop managed-call coverage
- public 0.8/0.9 closure supergoal:
  `docs/templates/supergoals-2026-06-05/command-eve-alpha2-08-09-closure-parent.md`
- materialized Plane closure tree: `[WORK_ITEM_ID]` through `[WORK_ITEM_ID]`
- CAO security/code-review/hotfix audit reports under
  `reports/audits/2026-06-05/`
- website-facing Command EVE alpha3 feature and structure brief:
  `docs/strategy/command-eve-alpha3-feature-structure-brief.md`

Known limits:

- the self-install wrapper, public-RC wrapper and operator-shell installer are
  alpha installers, not hosted account provisioners, packaged signed macOS apps
  or stable unsupported self-serve products
- private/client overlays must update from the public source after public
  install/update evidence exists; private-to-public backflow is not the
  distribution path
- AionUI native scheduled tasks/team mode/assistant switching/YOLO and Hermes
  native cron/delegation/kanban/toolset autonomy remain disabled or gated at
  launch
- Clicky-style status-bar/notch quick voice interaction is research only, not
  part of the released Command EVE runtime path
- no autonomous Plane Done, production writes, public publishing, outreach,
  spend, customer communication, direct controller spawning, scheduler
  default-on autonomy, public tags or release uploads are released by this
  version

## Current Marketing / GTM Stand

```text
command-eve-marketing-stand/2026-06-04
```

This marker records the current Command EVE marketing truth without changing
the Company.OS product version.

Included:

- cash-first offer spec: Command EVE as KI-Betriebssystem / external AI
  operator, with paid AI-Rendite-Audit, Founder OS, Growth OS and Managed AI
  Ops as the commercial ladder
- outreach and content kit for the current LinkedIn wave, re-aimed from health
  reach toward the consultant/founder-led business ICP
- Content Machine Department Pack as the public-repo-safe marketing substrate
  that collects source inventory, founder voice, raw briefs, research, council
  review, derivatives, release packets and learning loops before social/blog/
  book/video lanes run
- daily bilingual posting doctrine: 4 German and 4 English Command EVE drafts
  per day, with max one direct offer post per language and image-first
  candidates before Upload-Post
- Command EVE visual source truth from `https://try.command-eve.com` plus
  `assets/brand/eve-command/DESIGN.md`

Not included:

- no autonomous external posting, scheduling, outreach, spend or connector
  write
- no claim that the landing page app is finalized by this marker
- no additional product-version bump beyond the active `1.0.0-alpha.3`
  operator-shell alpha and no `1.0.1` claim
- no self-serve stable release

## Next Candidate Target

```text
1.0.0-beta.1
```

This is not the current product version yet. It is the next planned proof band:
promotion from supervised alpha to a beta candidate after CAO/security/privacy
and remote-pilot evidence.

Target outcome:

- public source remains the update path
- one guided self-install command survives fresh external operator use
- BYOK/provider auth preflight produces actionable `BLOCKED_AUTH` evidence
- first-run EVE confirmation produces a useful initial conversation
- `update_eve check` / `update_eve apply` have a fresh target smoke after
  alpha.3 install
- the first draft-only marketing/content-machine wedge is useful without
  external publishing, outreach, spend or hosted customer storage
- CAO/security/privacy gate decides whether evidence supports
  `1.0.0-beta.1`

Source:

- `docs/templates/supergoals-2026-06-04/command-eve-100-alpha2-self-install-parent.md`

Cloud, hosted multi-tenant provisioning and a signed desktop app remain later
gated surfaces, not `alpha.3` scope.

## Bump Rules

Patch bump:

- documentation clarifications
- small bug fixes in existing helpers
- no new required fields
- no changed autonomy boundary

Minor bump:

- new executable controller lane
- new required install step
- new work-order contract field
- new kit file or client rollout phase
- new hardening gate

Major bump:

- breaking change to worker issue contract
- breaking change to event ledger semantics
- changed default HumanGate boundary
- changed autonomy envelope for L3/L4/L5
- incompatible workspace registry structure

Prerelease labels:

| Label | Meaning |
|---|---|
| `alpha` | Internal or first supervised client rollout. Expect manual repair. |
| `beta` | A department/workflow lane has repeated gated worker/controller evidence, or multiple installs/night runs have succeeded without major repair. |
| `rc` | Release candidate for public/client packaging. |

## Autonomy Profile Rules

Autonomy profile is not the same as product version.

Current runtime buildout stage:

```text
Stage 7 / 9 proven, Stage 8-9 gated
```

Interpretation:

- Stages 0-3 are executable and proven for Plane contract, v0 lock, capability
  validation and v1.1 dry-run preflights.
- Stage 4 exists as v1.2 bounded `--mode run` and has completed one low-risk
  live pilot.
- Stage 5 is proven through a headless Claude C-Level worker pilot.
- Stage 6 CAO verdict posting is proven on that live pilot.
- Stage 7 Codex Controller `--mode post` is executable and has emitted a live
  `AUTO-GO` / `CEO_AUTONOMOUS` decision after CAO PASS.
- Stage 8 remains CEO/Codex Done/release authority, not worker-owned.
- Stage 9 remains scheduler/24-7 loop activation and is still gated.

Current profile:

```text
Stage 3.65 / 5
7.45 / 10 hardened internal operating maturity
```

Interpretation:

- L1/L2 controller lanes can run autonomously inside configured gates.
- L3 implementation can prepare sandbox branches and review packets.
- L3 does not merge, push, deploy or mark Done.
- L4 recurring department autonomy is emerging but not proven.
- L5 production autonomy is out of scope.

Promotion requires evidence, not optimism:

- repeated night runs without manual repair
- clean git hygiene reports
- warm preflight green
- budget brake green
- artifact truth green
- HumanGate validator used for HG-1/HG-2
- morning brief confirms no bypassed executable gates

## Release Gate

A Git tag or public release must wait for human review.

Minimum release gate:

```bash
cat VERSION
git diff --check
node scripts/page-index/generate-page-index.mjs --root . --check
node scripts/release-gates/runtime-04-readiness.mjs check
node scripts/release-gates/productization-readiness.mjs check
node scripts/release/build-public-mirror.mjs --out /tmp/company-os-public --verify
node scripts/release/verify-clean-clone.mjs --root /tmp/company-os-public
node scripts/update/company-os-update.mjs check --source /tmp/company-os-public --target ${PRIVATE_OR_CLIENT_TARGET} --write-report --json
node scripts/update/company-os-update.mjs apply --source /tmp/company-os-public --target ${PRIVATE_OR_CLIENT_TARGET} --dry-run
node scripts/release/verify-fresh-history-remote.mjs --json
find scripts -name '*.test.mjs' -print | sort | xargs node --test
rg -n "(API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|SERVICE_ROLE|sk-|ghp_|xoxb-)" .
```

The private staging tree may still block under
`productization-readiness.mjs check --public-release` because it contains
internal `reports/` and `metrics/` ledgers. The 0.5 public-release signal is the
generated mirror output plus clean-clone verifier. The secret scan may report
documentation examples; a controller must inspect matches before release.

## Upgrade Rule

When installing Company.OS into another company, record:

```text
Company.OS version:
Autonomy profile:
Install date:
Workspace registry path:
Execution ledger:
HumanGate owner:
First pilot issue:
Known disabled lanes:
```

Never call an install "latest" without also recording the exact product version
and autonomy profile.
