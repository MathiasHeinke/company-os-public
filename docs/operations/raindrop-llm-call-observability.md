# Raindrop LLM Call Observability

Status: v0.6.5-beta.5 runtime preflight enforces adapter coverage, hook-shape and sandbox workspace boundaries; RS-11 adds unreleased prompt-result integration evidence — 2026-05-20 ([WORK_ITEM_ID] through [WORK_ITEM_ID]); [WORK_ITEM_ID] lands the Company.OS-side ingestion adapter for [SOURCE_WORKSPACE] marketing-pipeline Raindrop envelopes (S1-S6 NOT YET INSTRUMENTED end-to-end; [SOURCE_WORKSPACE] wrapper is a separate follow-on contract)

## Purpose

Raindrop Workshop is the intended call-level observability layer for
Company.OS LLM work. The target is not a weekly generic reviewer. The target is
to capture every Company.OS LLM call that passes through our runtime,
dispatcher, scheduler or CLI wrapper path, then produce local trace summaries
and controller-readable reports.

## Coverage Rule

Company.OS can only observe calls that pass through an instrumented surface.
The canonical coverage/exclusion policy is:

```text
docs/operations/raindrop-observability-coverage-policy.md
scripts/orchestration/raindrop-observability-policy.mjs
```

Required coverage:

- Runtime Dispatcher v1.2 worker spawns
- Claude Code CLI worker calls started by Company.OS
- Codex CLI/controller calls started by Company.OS
- Gemini CLI worker calls started by Company.OS
- future Hermes/AionUi assistant calls that invoke Company.OS runtime actions
- scheduler and hard-cron worker launches

Out of scope for the first pilot:

- arbitrary manual browser sessions
- unrelated desktop app LLM calls
- raw provider traffic outside local control
- hosted/cloud Raindrop ingestion
- production/customer/medical/finance/legal/private founder data

The enforceable rule is: important Company.OS agent work must move behind
instrumented adapters. "Every LLM call" means every Company.OS LLM call that we
own or route, not every model request on the machine.

In practice, the first production-quality target is selective instrumentation:
Plane-managed worker runs, Goal Runtime worker-runs, Runtime Dispatcher spawns,
Model Router workers, Controller decisions, Scheduler launches once released,
and future Hermes/AionUI command-layer calls after they become Company.OS
managed surfaces. Private/manual ideation sessions stay outside Raindrop unless
the user explicitly promotes the work into a Goal/Plane/runtime item.

## Architecture

```text
Plane Work Item
  -> Contract Controller
  -> Runtime Dispatcher / Scheduler / hard-cron
  -> Instrumented LLM call wrapper
  -> Claude / Codex / Gemini / Hermes
  -> Raindrop local trace
  -> trace summary report
  -> CAO / Controller / future Command Center
```

`metrics/agent-events.jsonl` remains the canonical state stream. Raindrop is
the trace evidence stream.

## Instrumentation Points

The first implementation worker should inspect and instrument only local
Company.OS-owned call boundaries:

- `scripts/orchestration/runtime-dispatcher-v1.mjs`
- `scripts/orchestration/runtime-dispatcher-v12-core.mjs`
- `scripts/runtime/hard-cron-wrapper.mjs`
- `scripts/runtime/plane-ui-worker-cadence-runner.mjs`
- Claude/Codex/Gemini command builders used by the runtime

The adapter may initially write Raindrop-shaped local JSON summaries even before
the Workshop binary is installed. Real Workshop ingestion is a separate gated
step after install/readiness passes.

## Trace Summary Shape

Every observed call should reduce to a safe summary:

```yaml
raindrop.llm_call_summary:
  version: raindrop-llm-call/v0
  run_id: <runtime run id>
  plane_issue: COMPA-<n> | none
  agent: claude | codex | gemini | hermes | unknown
  model_route: <route or alias>
  mode: audit | plan | implement | verify | report | review
  started_at: <ISO-8601>
  ended_at: <ISO-8601>
  duration_ms: <number>
  input_redaction_level: none | internal | redacted | blocked
  output_redaction_level: none | internal | redacted | blocked
  token_counts_available: true | false
  tool_call_count: <number>
  error_class: none | auth | timeout | nonzero_exit | scope | stream | other
  trace_artifact: reports/observability/raindrop-workshop/<date>/<run>.json
  report_artifact: reports/observability/raindrop-workshop/<date>/<run>.md
```

Raw prompts, raw tool arguments, API keys, cookies, browser storage, private
memory, customer data and regulated content are never valid report fields.

## Reports

The worker must write two classes of local artifacts:

- per-run call summaries under `reports/observability/raindrop-workshop/`
- an aggregate daily or run-batch report that answers:
  - which calls happened
  - which failed
  - which calls lacked instrumentation
  - which contracts/gates should be improved

Plane comments may link safe report paths. They must not embed raw trace
payloads.

## Prompt-Result Quality Loop

Call summaries are the measurement layer. The next layer is the prompt-result
quality loop in `docs/operations/raindrop-prompt-result-quality-loop.md`.

That loop compares the safe contract/prompt envelope against the worker result,
CAO verdict and controller decision, then emits improvement proposals for worker
contracts, runtime preflights, capability profiles, prompt templates and
observability coverage.

The loop stores hashes, counts and verdict metadata. It does not store raw
prompts, raw model output or raw tool payloads.

## Promotion Bar

Raindrop LLM call observability can become a required runtime gate only after:

1. Local adapter produces summaries for one synthetic call and one real bounded
   Runtime Dispatcher worker call.
2. Missing instrumentation is reported as a blocker, not silently ignored.
3. No raw secrets or private data are present in reports.
4. Workshop install/readiness is separately verified.
5. CAO confirms the trace summaries are useful for at least one gate, prompt,
   contract or eval improvement.

## Implementation Status ([WORK_ITEM_ID], 2026-05-19)

### Adapter Module

`scripts/orchestration/raindrop-call-adapter.mjs` implements:

- `buildRaindropCallSummary(params)` — builds a safe summary from named parameters
- `buildRaindropCallSummaryFromDispatcherRun(params)` — convenience builder for
  Runtime Dispatcher v1.2 run outputs
- `buildRaindropCallSummaryFromHardCronRun(params)` — convenience builder for
  hard-cron wrapper launches
- `buildRaindropCallSummaryFromPlaneUiCadenceRun(params)` — convenience builder
  for Plane UI cadence worker launches
- `buildRaindropCallSummaryFromCodexControllerDecision(params)` — convenience
  builder for deterministic Codex Controller decisions
- `buildRaindropCallSummaryFromModelRouterResult(params)` — convenience builder
  for Model Router Claude CLI, Gemini CLI and Codex OpenRouter worker runs
- `buildRaindropCallSummaryFromGoalRuntimeWorkerRun(params)` — convenience builder
  for goal-runtime/worker-run completions; accepts only safe metadata (no raw
  prompts, no workspace paths); wired via `raindrop_hook` field in adapter output
- `buildRaindropCallSummaryMarkdown(summaryObject)` — renders a Markdown artifact
- `writeRaindropCallSummary(summaryObject, dir, options)` — writes JSON + MD files
- `validateRaindropCallSummary(summaryObject)` — verifies shape and privacy boundaries
- `validateRaindropHook(hookObject)` — validates a `raindrop_hook` metadata object
  before a managed surface is promoted as instrumented; enforces required fields,
  surface membership in INSTRUMENTED_SURFACES, valid agent, and no forbidden
  raw/private field patterns (raw_prompt, api_key, workspace_path, etc.)
- `SURFACE_BUILDER_REGISTRY` — read-only registry mapping each surface string in
  `INSTRUMENTED_SURFACES` to its dedicated adapter builder function; surfaces in
  `NOT_YET_INSTRUMENTED_SURFACES` must NOT appear here — their absence is the
  machine-readable gate that blocks premature promotion
- `validateSurfaceBuilderCoverage(surfaceList, registry?)` — checks every surface
  in the given list has an entry in the registry; fails with named errors for each
  uncovered surface; used by the RS-07 coverage harness tests to enforce that
  promoted instrumented surfaces are always backed by explicit builder support
- `RAINDROP_HOOK_PRODUCER_REGISTRY` — read-only registry mapping each currently
  declared Raindrop hook producer to a factory that returns its `raindrop_hook`
  metadata; only producers that actually emit hooks appear here (goal-runtime/
  worker-run today); Scheduler/Hermes/AionUI/manual/external surfaces must NOT
  be added until they have a real producer
- `REQUIRED_HOOK_PRODUCERS` — doctrine list of producer ids that must always be
  present in `RAINDROP_HOOK_PRODUCER_REGISTRY`; removal requires explicit
  doctrine evidence
- `validateRaindropHookProducerCoverage({ registry?, required? })` — runs the
  factory for every registered producer, passes its hook through
  `validateRaindropHook`, and confirms every required producer id is present;
  fails closed on missing producer, non-callable factory, throwing factory,
  structurally invalid hook, unknown/not-yet-instrumented surface, or forbidden
  private fields

Privacy invariants enforced by the adapter and test suite:

- `input_redaction_level` is always `"redacted"` (raw prompts never captured)
- `output_redaction_level` is always `"internal"` (summary counts only)
- `token_counts_available` is always `false` (not surfaced through current boundary)
- `input_redaction_level: "none"` and `output_redaction_level: "none"` both
  fail validation
- Forbidden field patterns (`raw_prompt_*`, `api_key_*`, `cookie_*`, etc.) cause
  `validateRaindropCallSummary` to return `ok: false`

### Currently Instrumented Surfaces

| Surface | Adapter hook |
|---|---|
| `runtime-dispatcher-v1.2/worker-spawn` | Mandatory post-run hook in `runtime-dispatcher-v1.mjs`; writes JSON + Markdown summaries under `reports/observability/raindrop-workshop/<date>/` |
| `hard-cron-wrapper/llm-spawn` | Post-command hook in `hard-cron-wrapper-core.mjs`; writes summary artifacts and appends them to the runtime event artifact list |
| `plane-ui-worker-cadence-runner/llm-spawn` | Post-hard-cron hook in `plane-ui-worker-cadence-runner-core.mjs`; writes a cadence-level summary after browser-proof and hard-cron execution |
| `codex-controller/decision` | Post-decision hook in `codex-controller-dryrun.mjs`; records deterministic controller decisions without pretending a model-backed Codex LLM call occurred |
| `model-router/claude-cli-worker` | Post-worker hook in `codex-cost-router.mjs`; writes a safe call summary after Claude CLI worker output is persisted and redacted |
| `model-router/gemini-cli-worker` | Post-worker hook in `codex-cost-router.mjs`; writes a safe call summary after Gemini CLI worker output is persisted and redacted |
| `model-router/codex-openrouter-worker` | Post-worker hook in `codex-cost-router.mjs`; writes a safe call summary after Codex/OpenRouter worker output is persisted and redacted |
| `goal-runtime/worker-run` | Post-run hook wired via `raindrop_hook` field in `goal-runtime-adapter-core.mjs`; caller uses `buildRaindropCallSummaryFromGoalRuntimeWorkerRun` after the worker completes; no raw prompts, no workspace paths captured (RS-04, [WORK_ITEM_ID]) |

### Not Yet Instrumented Surfaces

| Surface | Gap reason |
|---|---|
| `codex-controller/llm-spawn` | current controller CLI is deterministic Node logic; future Codex CLI model-backed controller calls still need an adapter |
| `hermes-assistant/llm-calls` | Hermes not live in this repo yet |
| `aionui-hermes/command-layer` | AionUI/Hermes command layer not live yet; surface is in the policy classifier but no adapter hook is wired |
| `scheduler/worker-run` | surface is in the policy classifier; scheduler not yet integrated with the adapter |
| `gemini-cli-workers-outside-company-os-runtime` | Model Router Gemini workers are covered; arbitrary Gemini sessions outside Company.OS runtime/model-router control are not |
| `manual-claude-desktop-sessions` | Out of scope — cannot instrument arbitrary sessions |
| `[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-openai` (S1) | Company.OS ingestion adapter shipped ([WORK_ITEM_ID]); [SOURCE_WORKSPACE] `withRaindropHook` wrapper around `createImageWithOpenAiApi` is a separate follow-on `role:cto` contract |
| `[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-codex-cli` (S2) | Same as S1: ingestion adapter ready; [SOURCE_WORKSPACE] wrapper around the Codex CLI `spawn` in `codex-image-runner.mjs` is the missing piece |
| `[SOURCE_WORKSPACE]/marketing-pipeline/visual-directions-openai` (S3) | Same as S1: ingestion adapter ready; [SOURCE_WORKSPACE] wrapper around `createImageWithOpenAiApi` in `generate-visual-directions.mjs` is the missing piece |
| `[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openrouter` (S4) | Same as S1: ingestion adapter ready; [SOURCE_WORKSPACE] wrapper around `openRouterEval` is the missing piece |
| `[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openai-fallback` (S5) | Same as S1: ingestion adapter ready; [SOURCE_WORKSPACE] wrapper around `openAiEval` is the missing piece |
| `[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-claude-cli` (S6) | Same as S1: ingestion adapter ready; [SOURCE_WORKSPACE] wrapper around `claudeCliEval` (claude CLI spawn) is the missing piece |

### [SOURCE_WORKSPACE] Marketing Pipeline Surfaces ([WORK_ITEM_ID])

The [SOURCE_WORKSPACE] marketing pipeline owns six direct LLM call surfaces that
are now visible to Company.OS Raindrop coverage as `NOT YET INSTRUMENTED
end-to-end` — the Company.OS ingestion adapter
(`scripts/orchestration/raindrop-marketing-pipeline-ingest.mjs`) can already
read, validate, redact and ledger envelope JSON files that conform to the
canonical envelope shape, but the [SOURCE_WORKSPACE]-side wrapper that emits those
envelopes is a separate follow-on `role:cto` contract and is intentionally
out of scope for [WORK_ITEM_ID].

| # | Surface ID | [SOURCE_WORKSPACE] file | Function | Provider |
|---|---|---|---|---|
| S1 | `[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-openai` | `scripts/marketing-pipeline/generate-editorial-images.mjs` | `createImageWithOpenAiApi` | OpenAI Images API |
| S2 | `[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-codex-cli` | `scripts/marketing-pipeline/codex-image-runner.mjs` | `runCodexExec` (spawn `codex`) | Codex CLI |
| S3 | `[SOURCE_WORKSPACE]/marketing-pipeline/visual-directions-openai` | `scripts/marketing-pipeline/generate-visual-directions.mjs` | `createImageWithOpenAiApi` | OpenAI Images API |
| S4 | `[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openrouter` | `scripts/marketing-pipeline/run-editorial-eval.mjs` | `openRouterEval` | OpenRouter |
| S5 | `[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openai-fallback` | `scripts/marketing-pipeline/run-editorial-eval.mjs` | `openAiEval` | OpenAI Responses API |
| S6 | `[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-claude-cli` | `scripts/marketing-pipeline/run-editorial-eval.mjs` | `claudeCliEval` (spawn `claude`) | Claude CLI |

Boundary that ships in [WORK_ITEM_ID] (Company.OS only; no [SOURCE_WORKSPACE] edit):

- `VALID_AGENTS` in `scripts/orchestration/raindrop-call-adapter.mjs:56`
  is extended to `{claude, codex, gemini, hermes, openai, openrouter, unknown}`
  so envelopes from S1, S3, S4, S5 are reported truthfully instead of as
  `unknown`.
- The six S1-S6 surface IDs are listed in `NOT_YET_INSTRUMENTED_SURFACES`
  (and in `CANONICAL_MANAGED_SURFACES`) so the coverage harness keeps them
  visible until the [SOURCE_WORKSPACE] wrapper ships and a per-surface builder is
  registered in `SURFACE_BUILDER_REGISTRY`.
- A managed-surface pattern `^[SOURCE_WORKSPACE]/marketing-pipeline/<id>$` lands
  in `raindrop-observability-policy.mjs`; the new `COVERAGE_CLASSES`
  constant exposes `productive_marketing_ares_website_pipeline` as the
  policy bucket for these calls, with `summary_only` retention by default
  and automatic promotion to `observe_and_evaluate` when the pipeline
  context block reports a publish-bound stage
  (`visual_gen | visual_directions | eval_gate | video_gen`).
- `scripts/orchestration/raindrop-marketing-pipeline-ingest.mjs` is a
  pure-local ingestion adapter: it never calls any external network, never
  reads secrets, never modifies [SOURCE_WORKSPACE], never writes outside
  Company.OS allowed paths and never marks Plane Done. It accepts envelope
  JSON files under any local directory (defaults to
  `reports/observability/raindrop-workshop/<date>/`), runs a secret-shape
  regex sweep (`SECRET_SHAPE_PATTERNS`), normalizes missing canonical
  fields via `buildRaindropCallSummary`, classifies via the coverage
  policy, and appends one deterministic `marketing.pipeline.raindrop_call`
  row per envelope to `metrics/agent-events.jsonl`, keyed by envelope
  `run_id` for idempotency.

Explicit non-goals for [WORK_ITEM_ID]:

- No [SOURCE_WORKSPACE] file is edited. The S1-S6 wrappers, the
  `ARES_RAINDROP_HOOK` env flag, the per-site rollback and the daily
  sync step are a separate `role:cto` contract operating in the
  `${LOCAL_WORKSPACE}` workspace.
- No envelope is actually written to `reports/observability/raindrop-workshop/`
  in this slice. The adapter is unit-tested against synthetic envelopes in
  a temporary directory; production envelopes will only appear after the
  [SOURCE_WORKSPACE] wrapper ships and an explicit sync step (cron pull or
  manual copy) brings them into Company.OS.
- No scheduler activation, no production credential, no external network
  call.

When the [SOURCE_WORKSPACE] wrapper ships, promotion of any S1-S6 surface from
`NOT_YET_INSTRUMENTED_SURFACES` to `INSTRUMENTED_SURFACES` MUST also add a
dedicated builder to `SURFACE_BUILDER_REGISTRY` (RS-07 invariant). Until
then the runtime preflight `preflightRaindropBuilderCoverage` keeps these
surfaces blocked from being treated as fully instrumented.

### Synthetic Artifact

`reports/observability/raindrop-workshop/2026-05-19/synthetic-runtime-dispatcher-dry-run.json`
and the companion `.md` prove the adapter shape and privacy boundaries using
metadata from real [WORK_ITEM_ID] run 9e65bbf4.

### Test Suite

`scripts/orchestration/raindrop-call-adapter.test.mjs` — tests covering:

- Summary shape and required fields
- Redaction enforcement (input always `redacted`, output always `internal`,
  `input_redaction_level: none` and `output_redaction_level: none` fail)
- Forbidden field detection (raw_prompt, api_key, cookie, etc.)
- Dispatcher run builder (error class mapping from runtime states)
- Hard-cron, Plane UI cadence and deterministic Codex Controller decision builders
- Model Router Claude/Gemini/OpenRouter worker builder
- Write round-trip (JSON artifact passes validation after reload)
- Markdown rendering (privacy verdict, missing surfaces listed)
- Coverage harness: every `CANONICAL_MANAGED_SURFACES` entry is in `INSTRUMENTED_SURFACES` or `NOT_YET_INSTRUMENTED_SURFACES`; RS-01 remaining gap surfaces are explicitly listed; RS-04 confirms `goal-runtime/worker-run` is instrumented and no longer in NOT_YET
- Goal-runtime worker-run builder: shape, privacy invariants (no raw_prompt, no raw_output, no workspace paths), error_class mapping, and full validation round-trip
- **RS-06 hook shape validator** (`validateRaindropHook`):
  - Valid hook accepted (all required fields, instrumented surface, valid agent)
  - Invalid hook rejected (missing required fields)
  - Unknown/not-yet-instrumented surface rejected (`hermes-assistant/llm-calls`, unrecognized surfaces)
  - Forbidden raw/private fields rejected (`raw_prompt`, `workspace_path`, `api_key`)
  - Goal-runtime hook compatibility: actual `raindrop_hook` from `buildGoalRuntimeAdapter` passes
- **RS-07 builder coverage harness** (`SURFACE_BUILDER_REGISTRY`, `validateSurfaceBuilderCoverage`):
  - Passing path: all current `INSTRUMENTED_SURFACES` entries have a builder in the registry
  - Failing path: a synthetic surface without a builder is named and rejected
  - Gating: Hermes, AionUI, Scheduler, codex-controller/llm-spawn are absent from the registry and blocked
  - Sync invariant: registry keys and `INSTRUMENTED_SURFACES` are exactly in sync (no phantom or missing entries)
- **RS-09 hook producer coverage harness** (`RAINDROP_HOOK_PRODUCER_REGISTRY`, `REQUIRED_HOOK_PRODUCERS`, `validateRaindropHookProducerCoverage`):
  - Passing path: live registry covers every required producer and each producer's emitted hook passes `validateRaindropHook`
  - Failing path: missing required producer is named and rejected
  - Failing path: producer emitting a structurally invalid hook (missing `adapter_version`, `instrumentation`, etc.) is named and rejected
  - Failing path: producer emitting a hook containing a forbidden private field (`raw_prompt`, `api_key`, `workspace_path`, etc.) is named and rejected
  - Failing path: producer emitting a hook with a not-yet-instrumented surface (e.g. `hermes-assistant/llm-calls`) is named and rejected
  - Failing path: registry entry that is not a function, or factory that throws, is named and rejected
  - Gating: Scheduler, Hermes, AionUI, codex-controller/llm-spawn, manual and external surfaces are absent from the producer registry
  - Sync invariant: every producer key is in `INSTRUMENTED_SURFACES`

Run with: `node --test scripts/orchestration/raindrop-call-adapter.test.mjs`

### Runtime Load Note

Runtime-generated Raindrop summaries use the adapter module version loaded by
the running dispatcher process. If a worker modifies the adapter during the
same run, that run's post-run summary can reflect the pre-change surface list.
Subsequent controller summaries and subsequent dispatcher runs use the updated
adapter. This is expected and should be treated as run-lineage evidence, not as
a failed observability gate.

### Promotion Bar Progress

| Criterion | Status |
|---|---|
| Adapter produces summaries for one synthetic call | DONE — synthetic artifact written |
| Runtime Dispatcher writes per-run summaries | DONE — post-run hook wired in `runtime-dispatcher-v1.mjs` |
| hard-cron wrapper writes per-run summaries | DONE — post-command hook wired in `hard-cron-wrapper-core.mjs` |
| Plane UI cadence runner writes per-run summaries | DONE — post-hard-cron hook wired in `plane-ui-worker-cadence-runner-core.mjs` |
| Deterministic Codex Controller decisions write summaries | DONE — post-decision hook wired in `codex-controller-dryrun.mjs` |
| Model Router worker runs write summaries | DONE — post-worker hook wired in `codex-cost-router.mjs` |
| Goal-runtime/worker-run writes summaries | DONE — `buildRaindropCallSummaryFromGoalRuntimeWorkerRun` + `raindrop_hook` wired in adapter (RS-04, [WORK_ITEM_ID]) |
| raindrop_hook metadata formally validated before promotion | DONE — `validateRaindropHook` enforces required fields, INSTRUMENTED_SURFACES membership, valid agent and no forbidden private fields; 8 new test cases confirm all AC (RS-06, [WORK_ITEM_ID]) |
| Adapter-level builder coverage harness | DONE — `SURFACE_BUILDER_REGISTRY` ties every `INSTRUMENTED_SURFACES` entry to an explicit builder; `validateSurfaceBuilderCoverage` proves passing path (all 8 surfaces), failing path (synthetic surface named + rejected), and gating (Hermes/AionUI/Scheduler absent from registry); 4 new test cases confirm all AC (RS-07, [WORK_ITEM_ID]) |
| Runtime preflight enforces adapter coverage before worker spawn | DONE — Runtime Dispatcher v1 `preflightRaindropBuilderCoverage` (`PREFLIGHT_REASONS.RAINDROP_BUILDER_COVERAGE_BROKEN` → `runtime.raindrop-builder-coverage-broken`) runs the same `validateSurfaceBuilderCoverage` invariant against `INSTRUMENTED_SURFACES` and `SURFACE_BUILDER_REGISTRY`; broken or missing builders block in dry-run/run preflight before Claude is spawned; current registry passes; instrumented surfaces are not expanded — Scheduler, Hermes, AionUI, hosted ingestion and arbitrary manual sessions remain gated out (RS-08, [WORK_ITEM_ID]) |
| Runtime preflight enforces hook-shape coverage before worker spawn | DONE — Runtime Dispatcher v1 `preflightRaindropHookShape` (`PREFLIGHT_REASONS.RAINDROP_HOOK_SHAPE_BROKEN` → `runtime.raindrop-hook-shape-broken`) runs `validateRaindropHookProducerCoverage` against `RAINDROP_HOOK_PRODUCER_REGISTRY` and `REQUIRED_HOOK_PRODUCERS`; missing required producer, structurally invalid hook, forbidden private field, not-yet-instrumented surface, non-callable factory or throwing factory all block in dry-run/run preflight before Claude is spawned; current producer registry (goal-runtime/worker-run) passes; Scheduler, Hermes, AionUI, codex-controller/llm-spawn, manual and external sessions remain absent from the producer registry (RS-09, [WORK_ITEM_ID]) |
| Missing surfaces reported explicitly | DONE — listed in adapter and this doc |
| No raw secrets or private data in reports | DONE — enforced by adapter + tests |
| Workshop binary install/readiness separately verified | NOT DONE — out of scope for [WORK_ITEM_ID] |
| CAO confirms trace summaries improve a gate/eval | NOT DONE — pending CAO review |

## Worker Contract Draft

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: implement
workspace: registry:company-os
dispatch: manual
sandbox: required
allowed_read_paths:
  - ${LOCAL_WORKSPACE}
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
scope:
  - Include: design and implement local call-summary instrumentation for Company.OS-owned LLM call boundaries.
  - Include: produce safe Raindrop-shaped summary artifacts for one synthetic call path.
  - Include: report which Company.OS call surfaces are not yet observable.
  - Exclude: hosted/cloud Raindrop ingestion, raw prompt/tool payload capture, production/customer/private/regulated data, browser storage reads, Plane Done, deploy, merge, push, publish.
allowed_write_paths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
capability_profile: claude-clevel-worker/cto/runtime
runtime_auth:
  - `claude -p "Return exactly: CLAUDE_AUTH_OK" --model opus --permission-mode plan --output-format text --max-turns 1`
runtime_permission_mode: acceptEdits
runtime_browser_auth: forbidden
inference_class: P1-code-bounded
runtime_agent: claude
runtime_model_alias: opus
split_policy: single-worker
maxruntime: 90m
maxspend: EUR 0
killswitch: COMPANY_OS_RUNTIME_KILL_SWITCH
heartbeat: every 10 minutes while implementing
reflection_policy: required
learning_proposal_policy: required
session_policy: single-worker
subagent_roster: none
spec_to_worker_checklist:
  - Spec: docs/operations/raindrop-llm-call-observability.md defines the call-summary boundary, privacy model and report shape.
  - Plan: implement a bounded local adapter or report the exact runtime blocker without enabling hosted Raindrop or raw trace upload.
  - Tasks: add adapter, add one synthetic summary artifact, update tests or smoke checks, and list missing call surfaces.
  - Eval: verify summary shape and redaction boundaries through executable tests or smoke commands.
acceptance_criteria:
  - A local call-summary adapter writes safe summaries for Company.OS-owned LLM call boundaries, or `worker.reported` reports a precise implementation blocker.
  - One synthetic LLM-call summary artifact is created under `reports/observability/raindrop-workshop/`.
  - `worker.reported` reports missing instrumentation surfaces explicitly.
  - No raw prompts, tool payloads, secrets, browser storage or private/regulated data are captured.
  - Tests or smoke commands verify redaction and summary shape.
gates:
  - ${LOCAL_WORKSPACE} status
  - node --test scripts/orchestration/runtime-dispatcher-v12-core.test.mjs scripts/runtime/hard-cron-wrapper-core.test.mjs
  - node scripts/page-index/generate-page-index.mjs --root . --output docs/page-index.md --check --json
  - git diff --check
  - no real secrets in reports, config or Plane comments
human_gate: HG-2.5
reporting: Plane worker.reported with changed files, commands/results, summary artifact paths, missing surfaces, privacy verdict and next Raindrop Workshop install decision.
outcome_artifacts:
  - ${LOCAL_WORKSPACE}
blocked_actions: no hosted Raindrop, no raw trace upload, no raw prompt capture, no browser storage read, no production data, no Plane Done by worker, no deploy, no merge, no push, no public publish.
outcome_spec: Company.OS-owned LLM calls become locally observable through safe Raindrop-shaped summaries without expanding control-plane authority.
outcome_rubric: PASS when at least one synthetic call summary exists, redaction boundaries are proven, and missing runtime surfaces are explicitly listed.
outcome_grader: controller
outcome_pass_threshold: controller PASS or PARK with exact blocker.
```
