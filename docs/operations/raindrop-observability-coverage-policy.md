# Raindrop Observability Coverage Policy

Status: v0.6.4-beta.1 policy draft, executable classifier; [WORK_ITEM_ID] adds the `productive_marketing_ares_website_pipeline` coverage class and the `[SOURCE_WORKSPACE]/marketing-pipeline/*` managed surface pattern
Last updated: 2026-05-23

## Purpose

Company.OS should learn from productive agent work without turning every model
conversation into permanent surveillance.

The policy is:

```text
Observe managed Company.OS work.
Do not observe unmanaged/private ideation by default.
Deep-evaluate only the runs where learning signal is worth the review cost.
```

This keeps Raindrop useful as a quality officer for the Company.OS runtime
chain without creating noisy, invasive or expensive traces.

## Executable Source

The executable classifier lives in:

```text
scripts/orchestration/raindrop-observability-policy.mjs
scripts/orchestration/raindrop-observability-policy.test.mjs
```

Policy version:

```text
raindrop-observability-policy/v0.1
```

## Coverage Classes

| Class | Examples | Default |
|---|---|---|
| Managed runtime calls (`managed_runtime_calls`) | Runtime Dispatcher, Scheduler, hard-cron, Plane UI cadence, Goal Runtime worker-run | safe call summary |
| Managed worker router calls (`managed_worker_router_calls`) | Model Router Claude, Gemini, Codex/OpenRouter | safe call summary |
| Managed controller calls (`managed_controller_calls`) | deterministic Controller decision, future model-backed Controller | safe call summary; deep eval on triggers |
| Top-layer command calls (`top_layer_command_calls`) | future AionUI/Hermes command layer that routes Company.OS work | safe call summary; deep eval on HG-3/HG-4 or external impact |
| Productive Marketing — [SOURCE_WORKSPACE] pipeline (`productive_marketing_ares_website_pipeline`) | S1-S6 [SOURCE_WORKSPACE] marketing-pipeline calls (editorial-image, visual-directions, editorial-eval, codex-image-runner, claude-cli-eval, openrouter-eval) | safe call summary by default; **deep eval automatically when the pipeline context block reports a publish-bound stage** (`visual_gen`, `visual_directions`, `eval_gate`, `video_gen`) or when `externalImpact=true`; surface IDs live in `NOT_YET_INSTRUMENTED_SURFACES` until the [SOURCE_WORKSPACE] wrapper ships |
| Productive Marketing/Coding via Company.OS (legacy generic) | blog/social/coding outputs created through Plane/Goal/runtime that are not [SOURCE_WORKSPACE]-pipeline-specific | safe call summary; deep eval on external impact |
| Manual ideation chats (`manual_ideation`) | ad hoc Claude/Codex/ChatGPT brainstorming | not observed unless promoted |
| Private founder/life context (`private_founder_context`) | [SOURCE_WORKSPACE] personal memory, private ideation, finance/life context | not observed by default; block unless explicitly promoted and redacted |
| Arbitrary local CLI experiments (`arbitrary_local_cli`) | non-Company.OS commands outside runtime/model-router | not observed |

The machine-readable class identifiers live in the `COVERAGE_CLASSES`
constant in `scripts/orchestration/raindrop-observability-policy.mjs` and
appear in the `coverage_class` field of every `classifyRaindropObservability`
result. `inferCoverageClass(surface)` returns the same identifier when given
a surface string.

## Decision Shape

Every policy evaluation returns:

```yaml
version: raindrop-observability-policy/v0.1
decision: observe_summary_only | observe_and_evaluate | not_observed | blocked_private
summary_required: true | false
deep_eval_required: true | false
deep_eval_reasons:
  - non_pass_state
  - needs_human_escalation
  - cao_controller_disagree
  - human_gate_high
  - template_or_prompt_version_change
  - external_impact_output
  - sampling
retention: summary_metadata_only | summary_plus_prompt_result_eval | none
reason: <machine-readable reason>
```

## Summary vs. Deep Evaluation

Safe call summaries are cheap and should exist for managed Company.OS calls.
They contain metadata only: run id, Plane issue, agent, route, state, duration,
surface, artifact paths, redaction level and missing coverage surfaces.

Deep prompt/result evaluation is more expensive and should run only when it
will improve the system:

- worker state is not `PASS`; `NEEDS_HUMAN` is classified separately as
  `needs_human_escalation`, while hard failures remain `non_pass_state`
- CAO and Controller disagree
- HumanGate is `HG-3`, `HG-3.5` or `HG-4`
- prompt, template, boot-pack or worker-contract version changed
- output has external impact: publish, send, deploy, public code, client-facing
  artifact, claim/compliance sensitive content
- sampling selects an otherwise green run

Default sampling target for green managed runs: 10-20%, configurable later.

## Promotion Rule

Manual conversations are not observed by default. They become observable only
when promoted into a managed Company.OS run, for example:

```text
manual idea -> /goal -> Plane parent/child contracts -> runtime/model-router
```

The promotion boundary must remove raw private context and must create a
bounded worker contract before runtime execution.

## AionUI / Hermes Boundary

AionUI/Hermes is expected to become the top operator layer in later releases.
Once it routes Company.OS work, it is treated as managed.

Minimum observable fields for the top layer:

- user intent class
- target workspace or Plane work item
- HumanGate level
- chosen route: CEO / C-Level / Worker / Controller / CAO
- blocked actions
- resulting run id and artifact paths
- controller/founder decision
- safe improvement proposal if the run fails or needs review

The top layer must not store raw voice transcripts, private context, browser
storage, cookies, secrets or customer/regulatory data inside Raindrop artifacts.

## Privacy Boundary

Never observe by default:

- private founder/life strategy chats
- [SOURCE_WORKSPACE] personal memory
- finance/tax/private relationship context
- customer/health/legal/regulatory raw data
- raw browser session storage or cookies
- arbitrary desktop sessions outside Company.OS runtime

If such context must become work, it is first redacted and promoted into a
managed Plane/Goal contract. The raw source stays outside Raindrop.

## Operational Rule

Raindrop coverage is a learning system, not a control-plane authority.

- Raindrop does not mark Plane Done.
- Raindrop does not dispatch workers.
- Raindrop does not mutate prompts automatically.
- Raindrop may propose improvements for contracts, prompt templates, runtime
  preflights, capability profiles and coverage gaps.
- Controller/CAO/Founder decide whether proposals become work.

## Current Release Interpretation

In `0.6.4-beta.1`, Company.OS has:

- local safe call summaries for Runtime Dispatcher, hard-cron, Plane UI cadence,
  deterministic Controller decisions and Model Router worker runs
- local prompt/result evaluation tooling
- an executable coverage classifier defining when summary-only vs deep eval is
  required

In `[WORK_ITEM_ID]` Company.OS also gains:

- the `productive_marketing_ares_website_pipeline` coverage class with the
  six S1-S6 surface IDs listed in `CANONICAL_MANAGED_SURFACES` and
  `NOT_YET_INSTRUMENTED_SURFACES`, plus a managed-surface regex pattern
  `^[SOURCE_WORKSPACE]/marketing-pipeline/<id>$`
- a Company.OS-side ingestion adapter
  (`scripts/orchestration/raindrop-marketing-pipeline-ingest.mjs`) that
  consumes [SOURCE_WORKSPACE] Raindrop envelopes locally, runs a secret-shape
  regex sweep, normalizes via `buildRaindropCallSummary`, classifies via
  this coverage policy, and appends deterministic
  `marketing.pipeline.raindrop_call` rows to `metrics/agent-events.jsonl`
- extended `VALID_AGENTS` enum (`openai`, `openrouter`) in
  `raindrop-call-adapter.mjs` so [SOURCE_WORKSPACE]-side providers can be
  reported truthfully

Still gated:

- hosted Raindrop ingestion
- automatic prompt/template mutation
- future model-backed Codex Controller LLM calls
- Hermes/AionUI live command-layer instrumentation
- external publish/send/deploy/spend/production writes
- the [SOURCE_WORKSPACE]-side `withRaindropHook` wrapper that actually emits S1-S6
  envelopes (separate `role:cto` contract in the `[SOURCE_WORKSPACE]` workspace)
