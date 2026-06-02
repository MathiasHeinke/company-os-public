# Company.OS Versioning

Status: canonical versioning doctrine
Current version: `0.9.0-rc.0`
Last updated: 2026-06-02

## Purpose

Company.OS has several version-like numbers. They must not be mixed.

This document defines what each number means so a new company can install,
audit, upgrade and discuss the system without relying on chat memory.

## Version Layers

| Layer | Example | Meaning | Source |
|---|---|---|---|
| Product version | `0.9.0-rc.0` | Version of the Company.OS repo and installable kit baseline. | `VERSION`, `CHANGELOG.md` |
| Runtime buildout stage | `Stage 7 / 9 proven, Stage 8-9 gated` | How far the Plane -> worker -> CAO -> Codex controller run chain is executable. | `docs/orchestration/company-os-runtime-dispatcher-v1.md` |
| Autonomy profile | `Stage 3.65 / 5` | Operational autonomy maturity of the current control plane. | rollout docs, audit reports |
| Internal maturity score | `7.45 / 10` | Evidence-backed quality score for current internal readiness. | audit/CEO synthesis |
| Script/schema versions | `agent-event/v1`, `git-hygiene-controller/v1` | Contract versions for executable helpers and ledgers. | script constants, docs |
| Roadmap tracks | `v0.1` to `v0.7` headings | Planning buckets, not release versions. | `ROADMAP.md` |
| Git tags | `v0.4.1-alpha.1` | Optional release marker after human release gate. | Git |

## Current Canonical Version

```text
0.9.0-rc.0
```

This means:

- `0`: pre-1.0 product, still evolving quickly.
- `9`: the active product layer is the public-upstream install/update release
  candidate: a public clone or sanitized public mirror can install a fresh
  target from generic company seed, generate EVE's first boot packet and write
  update plus handoff provenance.
- `0`: first claim in the 0.9 line. It closes the public-first distribution
  path without claiming stable unattended autonomy.
- `rc.0`: release-candidate evidence for public self-serve install packaging.
  It is not stable, not scheduler-default-on and not an autonomous
  publishing/scheduling/outreach/spend/release-worker release.

Included in this candidate:

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
- Command EVE runtime policy gate for AionUI/Hermes launch posture
- first-response boot-packet behavior so broad openers answer from known
  runtime/company facts instead of dumping a full questionnaire
- face-focused AionUI wait-state assets and mobile input polish
- Department Capability Pack Creator and optional Obsidian Brain Interface
- existing `0.6.5` runtime substrate: Plane-first worker contracts, CAO/Codex
  controller gates, sandbox workspace guard and Raindrop managed-call coverage

Known limits:

- the public-RC wrapper is a release-candidate installer, not a hosted account
  provisioner or stable unsupported self-serve product
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
