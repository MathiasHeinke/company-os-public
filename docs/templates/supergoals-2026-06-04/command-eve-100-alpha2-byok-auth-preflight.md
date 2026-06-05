# Command EVE 1.0.0-alpha.2 BYOK Auth Preflight

```yaml
role: role:cpo
parent_seat: role:coo
agent: codex
mode: implement
workspace: registry:company-os
dispatch: ready
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/registries/operator-shell/command-eve-1.0-alpha.json
  - ${COMPANY_OS_ROOT}/docs/orchestration/eve-hermes-superbrain-router.md
  - ${COMPANY_OS_ROOT}/docs/releases/1.0-command-eve-operator-shell-alpha.md
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/start_eve.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/eve-sidecar-core.mjs
scope:
  - include provider/BYOK setup guidance, MiniMax/OpenRouter default route, local auth smoke and blocked-auth messaging.
  - exclude payment automation, OAuth account creation, raw API key collection in chat, storing provider credentials in Company.OS and quota management.
acceptance_criteria:
  - Docs and CLI output tell the operator to configure provider auth through the official provider flow.
  - Missing provider auth is reported as BLOCKED_AUTH or equivalent, not as a broken product install.
  - `start_eve --auth-check` or equivalent emits provider, model and one short readiness proof without printing secrets.
  - EVE can explain the next provider-auth step without asking the user to paste keys into chat.
gates:
  - node --test scripts/operator-shell/eve-sidecar-core.test.mjs scripts/operator-shell/start-eve-core.test.mjs
  - rg -n "minimax/minimax-m3|openrouter|raw API keys|BLOCKED_AUTH" README.md docs/releases/1.0-command-eve-operator-shell-alpha.md registries/operator-shell/command-eve-1.0-alpha.json scripts/operator-shell
human_gate: HG-2.5
reporting: Plane worker.reported with auth UX copy, smoke output shape, provider/model route and remaining manual account setup.
blocked_actions: no key paste into chat, no provider payment setup, no credential storage in repo, no silent auth mutation.
```
