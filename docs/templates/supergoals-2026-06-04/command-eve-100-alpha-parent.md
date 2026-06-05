# Supergoal: Command EVE 1.0 Operator Shell Alpha

COO parent for shipping a public, remote-installable Company.OS alpha where a
non-technical founder can install the Company.OS workspace and then install a
local Command EVE operator shell with AionUI + Hermes.

Goal: after cloning the public repo, a new founder can run one workspace
install command and one operator-shell install command; the system installs
pinned AionUI/Hermes sidecars, applies the Command EVE overlay, prepares EVE's
SOUL/runtime context, emits a start command and blocks safely when provider
auth or prerequisites are missing.

## Child Roster

1. `command-eve-100-alpha-release-baseline.md` - version, changelog, README,
   release doc and public framing.
2. `command-eve-100-alpha-aionui-source-overlay.md` - AionUI `v2.1.10`
   source-overlay install path and branding gate.
3. `command-eve-100-alpha-hermes-runtime.md` - Hermes Agent `0.15.2` venv,
   SOUL and wrapper install path.
4. `command-eve-100-alpha-installer-composition.md` - public install plus
   operator-shell install command flow.
5. `command-eve-100-alpha-minimax-auth.md` - MiniMax/OpenRouter model profile
   and auth onboarding without secret capture.
6. `command-eve-100-alpha-clean-install-smoke.md` - fresh target smoke from
   public source.
7. `command-eve-100-alpha-security-productization-gate.md` - public mirror,
   secret/path scan, license and blocked-action gate.

```yaml
role: role:coo
parent_seat: role:coo
agent: codex
mode: plan
workspace: registry:company-os
dispatch: manual
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/VERSION
  - ${COMPANY_OS_ROOT}/CHANGELOG.md
  - ${COMPANY_OS_ROOT}/README.md
  - ${COMPANY_OS_ROOT}/docs/releases/1.0-command-eve-operator-shell-alpha.md
  - ${COMPANY_OS_ROOT}/registries/operator-shell/command-eve-1.0-alpha.json
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/install-command-eve.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/command-eve-installer-core.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/eve-sidecar.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/start_eve.mjs
  - ${COMPANY_OS_ROOT}/scripts/install/public-rc.mjs
scope:
  - include coordinating the 1.0.0-alpha.1 operator-shell child roster, acceptance gates, proof order and first external founder handoff criteria.
  - exclude public GitHub Release publish, private-main merge, production deploy, customer-specific code, raw secret collection, hosted tenant provisioning and Plane Done.
acceptance_criteria:
  - Parent and child contracts are parseable, role-labeled and scoped to public reusable Company.OS artifacts.
  - Version docs identify 1.0.0-alpha.1 as managed operator-shell alpha, not stable production.
  - Installer can plan/dry-run AionUI v2.1.10 source overlay, Hermes Agent 0.15.2 venv, EVE sidecar prepare, preflight and start-command emission.
  - Public docs give a non-technical founder the exact install sequence and the exact boundary when provider auth or prerequisites are missing.
  - CEO/Codex must review closeout before tag, public release, production deploy, hosted provisioning, Plane Done or stable claims.
gates:
  - node --test scripts/operator-shell/command-eve-installer-core.test.mjs scripts/operator-shell/eve-sidecar-core.test.mjs scripts/operator-shell/start-eve-core.test.mjs scripts/operator-shell/aionui-command-eve-overlay-core.test.mjs
  - node scripts/operator-shell/install-command-eve.mjs install --dry-run --client-root /tmp/company-eve-client --json
  - node scripts/release-gates/productization-readiness.mjs check
  - node scripts/release/verify-fresh-history-remote.mjs --json
human_gate: HG-2.5
reporting: Plane worker.reported with child roster, proof report paths, unresolved blockers, release recommendation, reflection and learning_proposals.
capability_profile: codex-controller/ceo/release
runtime_permission_mode: plan
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-06-04/
  - ${COMPANY_OS_ROOT}/docs/releases/
  - ${COMPANY_OS_ROOT}/registries/operator-shell/
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/
  - ${COMPANY_OS_ROOT}/README.md
  - ${COMPANY_OS_ROOT}/CHANGELOG.md
  - ${COMPANY_OS_ROOT}/VERSION
blocked_actions: do not mark Plane Done, publish a GitHub Release, create a tag, merge private main, deploy, request or store secrets, collect raw API keys in chat, enable AionUI/Hermes YOLO/full-auto, or claim stable unsupported self-serve.
reflection_policy: required
learning_proposal_policy: required
```
