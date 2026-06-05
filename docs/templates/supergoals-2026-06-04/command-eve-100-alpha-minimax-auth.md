# Command EVE 1.0 Alpha MiniMax Auth Onboarding

```yaml
role: role:cpo
parent_seat: role:coo
agent: codex
mode: implement
workspace: registry:company-os
dispatch: manual
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/registries/operator-shell/command-eve-1.0-alpha.json
  - ${COMPANY_OS_ROOT}/docs/orchestration/eve-hermes-superbrain-router.md
scope:
  - include default provider/model profile and user-facing auth boundary for MiniMax M3 through OpenRouter.
  - exclude storing API keys, entering payment details, quota management or provider account creation automation.
acceptance_criteria:
  - Manifest defaults to provider openrouter and model minimax/minimax-m3.
  - Docs tell the operator to authenticate through the official provider flow, never through chat.
  - EVE/Hermes may start without guaranteed inference; missing auth is BLOCKED_AUTH, not product failure.
gates:
  - rg -n "minimax/minimax-m3|openrouter|API keys" README.md CHANGELOG.md docs/releases/1.0-command-eve-operator-shell-alpha.md registries/operator-shell/command-eve-1.0-alpha.json
human_gate: HG-2.5
reporting: Plane worker.reported with model route, auth boundary and residual provider risk.
blocked_actions: no raw key capture, no payment setup automation, no provider account mutation.
```
