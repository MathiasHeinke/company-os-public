# EVE / Hermes Superbrain Router

Status: canonical operator-brain routing policy
Use for: deciding how Command EVE / Hermes chooses inference for founder
conversation, intent understanding, orchestration and escalation without giving
the operator shell ungated execution authority.
Last updated: 2026-06-02

## Purpose

EVE needs a better brain than a cheap chat assistant, but the expensive brain
should not answer every sentence. The operator shell should route model power
the same way Company.OS routes worker power: cheapest sufficient path first,
expensive frontier reasoning only when the request is ambiguous, high-impact or
context-heavy.

This document defines the operator-facing brain route. It complements
`docs/orchestration/runtime-inference-router.md`, which routes worker runs.

## Core Decision

EVE / Hermes may route inference autonomously for:

1. intent classification
2. context-pack selection
3. model tier selection
4. escalation to Superbrain, challenger or HumanGate

EVE / Hermes may not autonomously:

- create hosted accounts
- mutate Plane, GitHub, Supabase, Stripe, Vercel, customer systems or external
  communication
- spend above the route budget ceiling
- downgrade an HG-3/HG-4 request to a weaker model to save money
- mark Plane Done
- make founder, legal, capital, pricing, customer, irreversible or public
  commitment decisions

Autonomy here means **route autonomy**, not **decision authority**.

## Executable Registry

Canonical registry:

```text
registries/inference/eve-hermes-brain.json
```

Dry-run router:

```text
scripts/orchestration/eve-brain-router.mjs
```

The router writes nothing. It returns a route receipt that the shell must show
or log before using the selected inference lane.

## Brain Classes

| Class | Name | Use | Default lane | Autonomy |
|---|---|---|---|---|
| `B0-intake-scout` | Cheap scout | classify, summarize, dedupe, prepare one next question | cheap scout via OpenRouter-compatible lane | autonomous |
| `B1-daily-brain` | Daily brain | normal EVE conversation, onboarding, status, simple routing | Sonnet/GPT-quality daily model | autonomous |
| `B2-long-context-challenger` | Long-context challenger | large docs, reports, screenshots/transcripts, cross-source contradiction scan | Gemini/long-context challenger | autonomous for report-only |
| `B3-superbrain` | Superbrain | founder intent, multi-department orchestration, ambiguous strategy, high-impact routing | Opus-class primary, GPT-xhigh fallback | autonomous for plan/route/proposal only |
| `B4-founder-veto` | Founder gate | HG-4, irreversible, legal/capital/pricing/customer/public commitments | no autonomous model call unless asked for proposal | blocked |

## Default Model Intent

The route aliases are more important than provider names. Provider names may be
updated in the registry after fresh pricing, latency, context and quality checks.

| Alias | Preferred candidate | Fallback intent |
|---|---|---|
| `cheap-scout` | DeepSeek/Grok/OpenRouter-class cheap model | low-cost classifier only |
| `daily-brain` | Claude Sonnet-class or GPT-5.4-class | normal EVE reasoning |
| `long-context-challenger` | Gemini Pro-class long context | contradiction and context sweep |
| `superbrain-primary` | Claude Opus-class | highest-quality orchestration and founder-intent read |
| `superbrain-veto` | GPT-5.5-xhigh/Codex-class controller | challenge, veto, release-grade synthesis |

## Route Receipt

Every non-trivial EVE/Hermes response that proposes work or chooses a runtime
must retain a route receipt:

```yaml
eve_brain_route:
  version: eve-brain-router/v0
  route_class: B3-superbrain
  selected_alias: superbrain-primary
  selected_model: claude-opus-4-8
  fallback_alias: superbrain-veto
  context_profile: founder-intent-plus-company-state
  route_reason: founder-intent-orchestration
  autonomous_model_selection: true
  autonomous_decision_authority: false
  max_auto_cost_usd: 8
  human_gate: HG-3
  blocked_actions:
    - founder decision
    - external send
    - production write
```

The receipt may be visible in a UI drill-down instead of shown in every chat
message, but it must exist for audit and cost learning.

## Classification Rules

The router should classify in this order:

1. HG-4, irreversible action, legal/capital/customer/pricing/public commitment
   or founder-voice commitment -> `B4-founder-veto`.
2. Founder intent translation, CEO/C-Level orchestration, ambiguous strategy,
   multi-department routing, major roadmap/release-gate judgment or conflict
   between sources -> `B3-superbrain`.
3. Very large context, transcript/screenshot/report sweep, long source bundle
   or explicit need for cross-source contradiction detection ->
   `B2-long-context-challenger`.
4. Normal onboarding, morning report, status, department routing or next-step
   assistance -> `B1-daily-brain`.
5. Pure classification, summarization, dedupe, title generation or one narrow
   next question -> `B0-intake-scout`.

If the route is uncertain, escalate one level. If the route would cross a
HumanGate, block and produce the decision card instead.

## Autonomy Answer

Yes, it routes autonomously once wired into EVE/Hermes.

What is autonomous:

- choose `B0` through `B3`
- ask for a stronger model when confidence is low
- attach a challenger model for long-context or high-impact work
- block and ask the founder/CEO when the request is HG-4 or outside budget

What is not autonomous:

- final founder decision
- customer-facing commitment
- production write
- public publish/send
- hosted account provisioning
- large spend
- Plane Done

This keeps EVE powerful without letting the shell become an ungoverned second
CEO.

## Implementation Path

1. `v0.9.x`: keep router as dry-run policy and route receipt generator.
2. `v1.0`: require route receipts in Command Center / dashboard event history.
3. `v1.2`: connect the operator shell to the route registry and budget ledger;
   EVE selects the brain autonomously for `B0`-`B3`, with `B4` blocked.
4. `v1.2+`: add live provider health, latency, quality and cost feedback before
   changing default models.

## Gates

```bash
node --check scripts/orchestration/eve-brain-router.mjs
node --test scripts/orchestration/eve-brain-router.test.mjs
node scripts/orchestration/eve-brain-router.mjs \
  --message "Translate founder intent into CEO and C-Level work" \
  --json
```

Public release gate:

```bash
node scripts/release-gates/productization-readiness.mjs check --public-release --json
```
