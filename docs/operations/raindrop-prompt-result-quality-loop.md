# Raindrop Prompt-Result Quality Loop

Status: Unreleased RS-11 runtime-dispatcher integration evidence; v0.6.3-beta.1 introduced the local evaluation loop

## Purpose

The Raindrop Prompt-Result Quality Loop evaluates the quality of internal
Company.OS agent communication.

It does not only ask whether the final artifact was acceptable. It asks whether
the chain that produced it was good enough:

```text
CEO intent / Plane contract
-> prompt and boot-pack envelope
-> runtime call summary
-> worker report
-> CAO verdict
-> controller decision
-> improvement proposal
```

This is the "quality officer" layer for Company.OS worker communication. It
turns completed runs into concrete improvements for worker contracts, prompt
templates, runtime preflights, capability profiles and observability coverage.

## Privacy Boundary

The loop never stores raw prompts, raw model output, tool payloads, browser
storage, API keys, private memory, customer data or regulated content.

Allowed evidence:

- prompt template version
- contract hash
- source-of-truth count
- acceptance criteria count
- gate count
- blocked action count
- model/runtime metadata
- worker state
- CAO verdict
- controller decision
- test counts
- safe artifact paths
- missing instrumentation surfaces
- improvement proposals

Forbidden evidence:

- raw prompt text
- raw model output
- raw tool input or output
- secrets or token-shaped strings
- private/customer/regulated data

## Implementation

Executable implementation:

```text
scripts/orchestration/raindrop-prompt-result-loop.mjs
scripts/orchestration/raindrop-prompt-result-loop.test.mjs
```

The script emits:

```text
reports/observability/raindrop-workshop/<date>/<run>.prompt-result.json
reports/observability/raindrop-workshop/<date>/<run>.prompt-result.md
```

Top-level artifact key:

```yaml
raindrop.prompt_result_evaluation:
  version: raindrop-prompt-result-eval/v0
  run_id: <id>
  plane_issue: COMPA-<n>
  prompt_contract_envelope:
    contract_hash: <sha256>
    raw_prompt_captured: false
    raw_contract_text_captured: false
    source_of_truth_count: <n>
    gate_count: <n>
    acceptance_criteria_count: <n>
    blocked_actions_count: <n>
  result_envelope:
    call_state: PASS | NEEDS_HUMAN | REJECT | unknown
    call_error_class: none | auth | timeout | nonzero_exit | scope | stream | other
    worker_state: PASS | REJECT | NEEDS_HUMAN | BLOCKED | unknown
    cao_verdict: PASS | REJECT | PARK | unknown
    controller_decision: AUTO-GO | REJECT | PARK | DELEGATE | unknown
  score:
    verdict: PASS | WARN | FAIL
    overall: <0..1>
  improvement_proposals:
    - target: <contract/runtime/controller/coverage surface>
      reason: <machine-readable reason>
      proposal: <safe prose>
```

## Scoring

The v0 scorer evaluates four dimensions:

| Dimension | Meaning |
|---|---|
| Contract completeness | Source truth, gates, acceptance criteria, blocked actions, HumanGate, reporting and capability profile are present |
| Result alignment | Worker, CAO and controller agree on the outcome |
| Observability quality | Safe Raindrop call summary exists with redaction and missing-surface reporting |
| Learning capture | Reflection and learning proposals are present, and no raw prompt/output was captured |

If the observed call summary itself reports a non-PASS state, the evaluation is
capped at WARN even if the final controller release is green. This preserves the
lesson from a recovered run instead of hiding it behind final success.

## When To Run Deep Evaluation

The coverage policy in `docs/operations/raindrop-observability-coverage-policy.md`
decides whether a managed call receives summary-only retention or this deeper
prompt/result evaluation.

Deep evaluation is required for non-PASS runs, CAO/Controller disagreement,
HG-3/HG-3.5/HG-4 work, prompt/template changes, external-impact outputs and
sampling-selected green runs. Manual/private ideation is not evaluated unless it
is first redacted and promoted into a managed Plane/Goal/runtime run.

## First Evidence

[WORK_ITEM_ID] produced the first prompt-result evaluation:

```text
reports/observability/raindrop-workshop/2026-05-19/compa-270-prompt-result-evaluation.prompt-result.json
reports/observability/raindrop-workshop/2026-05-19/compa-270-prompt-result-evaluation.prompt-result.md
```

Verdict: WARN, score 0.84.

Reason: the final worker, CAO and controller chain passed, but the observed
Raindrop call summary captured an earlier `NEEDS_HUMAN` scope failure. The loop
therefore generated improvement proposals for runtime preflight, controller
release evidence and missing Raindrop coverage surfaces.

## Promotion Path

The loop is a local evaluation tool in v0.6.3-beta.1. It becomes a required gate
only after:

1. Runtime Dispatcher emits prompt-result evaluations automatically for every
   completed worker run.
2. Hard-cron, Plane UI cadence runner and deterministic Codex Controller
   decisions emit comparable call summaries.
3. Model Router Claude/Gemini/OpenRouter worker runs emit comparable call
   summaries.
4. Future model-backed Codex Controller LLM calls receive their own adapter
   before that lane is called fully covered.
5. CAO consumes prompt-result evaluations and can reject a run when the
   communication quality is too low.
6. Controller can route improvement proposals into Plane worker contracts
   without mutating templates automatically.

## Runtime Dispatcher Integration Evidence

RS-11 / [WORK_ITEM_ID] added the Runtime Dispatcher v1 integration path:

- after a successful Runtime -> CAO -> Codex Controller chain, the dispatcher
  writes prompt-result JSON and Markdown artifacts under
  `reports/observability/raindrop-workshop/<date>/`
- every run appends a `dispatcher.prompt_result_eval` row to
  `metrics/agent-events.jsonl`, either with artifact paths or a
  machine-readable skip reason
- artifact generation failure blocks the runtime chain instead of being hidden
  behind an otherwise green worker/CAO/controller result
- non-PASS runtime runs skip deep prompt-result evaluation with a reason such
  as `runtime-not-pass`

RS-11 itself did not become the first fully green autopublish proof. The live
[WORK_ITEM_ID] worker declared PASS, but Claude hit `MaxTurns: 35`, causing the
Runtime Dispatcher state to become `RUNTIME_ERROR`; CAO, Codex Controller and
prompt-result evaluation were therefore skipped. RS-12 hardens the immediate
infrastructure cause by routing P2/P3 Claude work through the verified local
`opus` alias and the registry-defined higher turn budgets. A clean rerun is
still required before claiming a green Runtime -> CAO -> Controller ->
Raindrop-eval chain.
