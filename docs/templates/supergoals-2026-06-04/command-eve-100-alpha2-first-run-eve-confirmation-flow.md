# Command EVE 1.0.0-alpha.2 First-Run EVE Confirmation Flow

```yaml
role: role:cpo
parent_seat: role:coo
agent: codex
mode: implement
workspace: registry:company-os
dispatch: ready
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/operations/eve-first-run-founder-onboarding.md
  - ${COMPANY_OS_ROOT}/docs/operations/command-eve-first-run-skill-pack.md
  - ${COMPANY_OS_ROOT}/docs/operations/eve-founder-intent-operating-layer.md
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/eve-sidecar.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/eve-sidecar-core.mjs
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/.company-os/eve/connector-manifests.json
scope:
  - include first-run boot packet inspection, known-facts confirmation, progressive setup queue and existing-system inventory.
  - exclude broad questionnaire dumps, durable memory writes without confirmation, worker dispatch, connector writes and customer data uploads.
acceptance_criteria:
  - Fresh EVE starts by saying what she already knows from signup/install seed and asks whether it is correct.
  - EVE distinguishes required-now, helpful-now and later setup items.
  - EVE inventories existing tools before proposing replacement structure.
  - First-run output can draft Founder Intent Packet and CEO Delegation Packet but cannot dispatch workers autonomously.
gates:
  - node --test scripts/operator-shell/eve-sidecar-core.test.mjs
  - node scripts/operator-shell/eve-sidecar.mjs prepare --client-root <fresh-target> --json
  - rg -n "I know|known|confirm|progressive|existing" docs/operations/eve-first-run-founder-onboarding.md docs/operations/command-eve-first-run-skill-pack.md scripts/operator-shell
human_gate: HG-2.5
reporting: Plane worker.reported with first-run transcript fixture, boot packet path, setup queue shape and blocked actions.
blocked_actions: no worker dispatch, no Plane Done, no durable memory write without confirmation, no connector OAuth mutation, no public send/publish/spend.
```
