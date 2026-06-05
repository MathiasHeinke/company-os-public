# Supergoal: Command EVE 1.0.0-alpha.2 Self-Install Pilot Hardening

Status: Plane-ready parent contract draft
Date: 2026-06-04
Use for: turning the current `1.0.0-alpha.1` managed local operator-shell alpha
into a privacy-first GitHub self-install pilot that a remote founder can run
without hosted account provisioning.

## Release Gate Frame

Current state: `1.0.0-alpha.1` proves the local Command EVE operator-shell
baseline: public source, Company.OS target workspace, AionUI, AionCore, Hermes,
EVE SOUL/runtime context, German-first login UI, `start_eve` and `update_eve`.

Next target: `1.0.0-alpha.2` should not be a cloud or SaaS jump. It should make
the GitHub self-install path smooth, repeatable, supportable and commercially
usable for a first supervised remote pilot while keeping client data local and
BYOK.

## Product Outcome

A new founder can:

1. Clone or download the public Company.OS repo.
2. Run one guided self-install command.
3. Pass local prerequisite checks for `git`, `python3`, `bun`, AionUI, Hermes
   and writable target paths.
4. Configure provider auth through the provider's official BYOK flow, not chat.
5. Start local Command EVE and see the correct product version in the UI.
6. Let EVE inspect known first-run facts, ask for confirmation and guide only
   the next missing setup step.
7. Run `update_eve check` and `update_eve apply` against the public source.
8. Activate the first marketing/content-machine wedge without external
   publishing, outreach, spend or hosted customer storage.

## Child Roster

1. `command-eve-100-alpha2-public-main-update-proof.md` - public source and
   update provenance proof after PR #48/main integration.
2. `command-eve-100-alpha2-one-command-installer.md` - one guided self-install
   wrapper around public install plus operator-shell install.
3. `command-eve-100-alpha2-byok-auth-preflight.md` - provider/BYOK UX and
   Hermes auth smoke without secret capture.
4. `command-eve-100-alpha2-first-run-eve-confirmation-flow.md` - first-run EVE
   "I know this already; is it correct?" boot flow.
5. `command-eve-100-alpha2-update-lifecycle-smoke.md` - update check/apply,
   version identity and sidecar refresh smoke.
6. `command-eve-100-alpha2-marketing-wedge-activation.md` - first useful
   marketing/content-machine wedge for external pilots.
7. `command-eve-100-alpha2-remote-pilot-runbook.md` - Google Meet handoff,
   support checklist and failure-mode script.
8. `command-eve-100-alpha2-beta-promotion-gate.md` - CAO/security/privacy gate
   for deciding whether alpha.2 may become beta.

```yaml
role: role:coo
parent_seat: role:coo
agent: codex
mode: plan
workspace: registry:company-os
dispatch: ready
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/VERSION
  - ${COMPANY_OS_ROOT}/CHANGELOG.md
  - ${COMPANY_OS_ROOT}/README.md
  - ${COMPANY_OS_ROOT}/docs/releases/versioning.md
  - ${COMPANY_OS_ROOT}/docs/releases/1.0-command-eve-operator-shell-alpha.md
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-06-04/command-eve-100-alpha-parent.md
  - ${COMPANY_OS_ROOT}/docs/templates/supergoals-2026-06-04/command-eve-100-alpha2-self-install-parent.md
  - ${COMPANY_OS_ROOT}/scripts/install/command-eve-self-install.mjs
  - ${COMPANY_OS_ROOT}/scripts/install/public-rc.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/install-command-eve.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/start_eve.mjs
  - ${COMPANY_OS_ROOT}/scripts/update/update-company-os.mjs
scope:
  - include GitHub self-install hardening, public source update proof, local BYOK auth, first-run EVE confirmation, update lifecycle, marketing wedge activation and remote pilot support docs.
  - exclude hosted SaaS, multi-tenant account provisioning, signed desktop app, production database writes, external publishing/sending/spend and stable unsupported self-serve claims.
acceptance_criteria:
  - Parent and children are parseable Worker Issue Contracts with role labels, source truth, gates and blocked actions.
  - The next release target is named `1.0.0-alpha.2` without bumping `VERSION` before proof gates pass.
  - The release plan keeps client data local and treats cloud/desktop app work as later gated surfaces.
  - First pilot success is defined by a fresh public source install, local EVE start, provider auth smoke, update smoke and one draft-only marketing wedge.
  - Beta promotion remains blocked until the CAO/security/privacy gate reviews real install evidence.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-06-04/command-eve-100-alpha2-self-install-parent.md --label role:coo
  - node scripts/page-index/generate-page-index.mjs --root . --check
  - node scripts/release-gates/productization-readiness.mjs check --root . --json
  - git diff --check
human_gate: HG-2.5
reporting: Plane worker.reported with child roster, proof paths, install/update evidence, blockers, beta recommendation, reflection and learning_proposals.
blocked_actions: do not bump VERSION, tag a release, merge to main, publish a GitHub Release, deploy hosted infrastructure, store customer data, collect raw API keys in chat, enable full-auto/YOLO, publish/send/spend, or mark Plane Done.
```
