# Codex Cost Router

Status: v0 operational doctrine

## Purpose

Codex GPT-5.5 xhigh is the CEO/controller layer. It should not spend its
budget on every first-pass scan, long-context comparison, test idea, or
worker-style audit. The cost router pushes bounded, redacted subtasks to cheaper
workers and reserves GPT-5.5 for scope, privacy, integration, and final
judgment.

## Routing Matrix

| Task class | Default worker | Why |
|---|---|---|
| Linear issue triage | Grok 4.3 | Fast first-pass prioritization and next-step shaping |
| Implementation plan | Grok 4.3 | Cheap plan draft before GPT-5.5 decides |
| Diff review | Grok 4.3 + DeepSeek V4 Pro | Fast bug scan plus deeper edge-case pass |
| Spec drift / long context | DeepSeek V4 Pro | Better batch synthesis and long-context scrutiny |
| Long-context architecture audit | Gemini CLI, after sanity check | Third perspective when Vertex/API auth and billing are green |
| Test generation | DeepSeek V4 Pro | Finds coverage gaps without spending CEO tokens |
| External audit | Claude Opus CLI | High-signal independent review when worth the cost |
| Private strategy / [SOURCE_WORKSPACE] / finance / health / customer data | GPT-5.5 only by default | Privacy and judgment gate stay central |
| Final answer / Linear update / ship decision | GPT-5.5 | Workers advise; controller decides |

## Non-Negotiable Privacy Gate

OpenRouter workers must not receive unredacted:

- secrets, API keys, JWTs, tokens, `.env` values, or credential names with values
- `[SOURCE_WORKSPACE]` memory, finance, personal, relationship, or life-strategy context
- customer, patient, Rx, medical, or health data
- raw email addresses or private communications
- private Honcho output or personal-memory exports

The local helper blocks obvious sensitive prompts before any worker launches.
`--allow-private` exists only for explicit the founder/Codex override; secrets still
block even with that flag.

## Helper Command

Use the local runner for repeatable bounded worker passes:

```bash
node ${COMPANY_OS_ROOT}/scripts/model-router/codex-cost-router.mjs \
  --mode issue-triage \
  --models grok,deepseek \
  --workspace "${COMPANY_OS_ROOT}" \
  --issue [WORK_ITEM_ID] \
  --prompt-file /path/to/sanitized-prompt.md
```

Default mode routing:

```bash
# Grok only
node scripts/model-router/codex-cost-router.mjs --mode issue-triage --prompt "[WORK_ITEM_ID] public triage only"

# DeepSeek only
node scripts/model-router/codex-cost-router.mjs --mode spec-drift --prompt-file sanitized-spec.md

# Grok + DeepSeek for redacted morning briefing sidecar
node scripts/model-router/codex-cost-router.mjs \
  --mode morning-briefing-redacted \
  --prompt-file redacted-priority-pack.md

# Gemini long-context sidecar, only after runtime auth/billing sanity passes
node scripts/model-router/codex-cost-router.mjs \
  --mode spec-drift \
  --models gemini \
  --prompt-file sanitized-architecture-pack.md
```

Reports are written under:

```text
reports/model-router/YYYY-MM-DD/HHMM-<mode>-<issue>/
```

Each run writes:

- `prompt.md`
- `worker-prompt.md`
- `manifest.json`
- one Markdown report and stderr log per model

If the privacy gate blocks a run, `prompt.md` and `worker-prompt.md` must contain
only a non-sensitive block summary. The original prompt is not stored and no
worker is launched.

Persisted worker stdout/stderr is isolated before it becomes a report:

- secrets and token-looking values are redacted
- private-path, personal-memory, finance, customer/health and email markers are
  redacted
- worker logs are capped at 200,000 characters with truncation metadata in the
  model JSON file

Reusable prompt skeletons live in
[`docs/templates/model-router-worker-prompts.md`](../templates/model-router-worker-prompts.md).

## Claude Opus Runtime Budget

Claude Opus 4.7 Max / 1M is the expensive high-signal audit lane, not a fast
triage worker. Router and controller behavior must treat it as long-running:

- first stuck/retry/duplicate-dispatch check no earlier than 300 seconds
- expect 600+ seconds before useful output on deep/cross-repo audits
- normal audit timeout: 900 seconds
- deep/cross-repo audit timeout: 1800 seconds
- heartbeat/status updates should report elapsed time and report path instead
  of cancelling early

The local router records the Claude runtime policy in `manifest.json` when a
Claude worker is part of the run.

## Morning Briefing Pattern

Morning Briefing keeps a strict split:

1. GPT-5.5 reads private sources, Linear context, calendar context, and active
   workspace memory.
2. GPT-5.5 creates a redacted priority pack with no raw private content.
3. Grok and/or DeepSeek analyze only that redacted pack.
4. GPT-5.5 integrates worker reports into the final CEO brief.
5. No worker output updates Linear directly.

This protects the productivity gain without turning OpenRouter into a private
memory processor.

## Running Session Discovery

Long-running controller sessions may discover the router after it is added if
they read the same local environment and workspace state. That is allowed, but
they must follow the same order:

1. Verify `OPENROUTER_API_KEY` exists without printing it.
2. Verify the target model is available before claiming Grok, DeepSeek or
   Gemini ran.
3. Use read-only, bounded prompts.
4. Write worker reports to private or reviewed report paths.
5. Let GPT-5.5 or the active controller integrate the result before any Linear
   update or user-facing decision.

Discovery is not permission escalation. Privacy gates and HumanGates still
apply.

## Cost Ledger

Every model-router run should append operational usage telemetry to:

```text
metrics/ai-cost-ledger.jsonl
```

The ledger stores provider, model, mode, issue, report path, exit status, token
footer if exposed by the runtime, and estimated variable OpenRouter cost. It
does not store prompt text. Gemini CLI calls are logged under
`google_gemini_cli`; token counts are captured when the CLI emits a parseable
footer such as `Total tokens: ...`. Successful worker calls also record
`estimated_gpt55_tokens_avoided` as a planning proxy for GPT-5.5 controller
budget avoided.

## Budget Brake

The router evaluates a pre-dispatch budget brake before launching workers.
Default policy:

| Limit | Default |
|---|---:|
| Max run reserve | 1.00 USD |
| Daily variable worker budget | 5.00 USD |
| Monthly variable worker budget | 50.00 USD |
| Conservative reserve per priced worker | 250,000 tokens |
| Unknown model reserve | 0.25 USD |

Overrides:

```bash
node scripts/model-router/codex-cost-router.mjs \
  --mode diff-review \
  --models grok,deepseek \
  --max-run-usd 1 \
  --daily-budget-usd 5 \
  --monthly-budget-usd 50 \
  --prompt-file sanitized-diff.md
```

If the run reserve would exceed max-run, daily or monthly limits, the router
writes manifest/report files with `blockReason: budget_brake_blocked` and does
not launch a worker.

Standalone check:

```bash
node scripts/model-router/cost-ledger.mjs budget-check \
  --models grok,deepseek \
  --max-run-usd 1 \
  --daily-budget-usd 5 \
  --monthly-budget-usd 50 \
  --json
```

Monthly summary:

```bash
node ${COMPANY_OS_ROOT}/scripts/model-router/cost-ledger.mjs \
  summary \
  --month 2026-05
```

Add a fictional GPT-5.5 equivalent rate when you want a planning-value estimate:

```bash
node ${COMPANY_OS_ROOT}/scripts/model-router/cost-ledger.mjs \
  summary \
  --month 2026-05 \
  --gpt55-eur-per-m-token 10
```

This does not claim invoice-grade savings. It answers: "If these successful
worker tokens had been spent in the GPT-5.5 controller lane at the chosen
fictional rate, what budget pressure did routing avoid?"

Fixed monthly commitments are tracked separately from variable OpenRouter use:

| Runtime | Monthly cost |
|---|---:|
| Codex GPT-5.5 Max / 20x | 238 EUR incl. German tax |
| Claude Max / 20x | 238 EUR incl. German tax |
| Fixed total | 476 EUR incl. German tax |

Measurement limits:

- Codex Desktop GPT-5.5 app usage is not fully captured unless the task runs
  through an instrumented helper or exposes a token footer.
- Claude CLI text mode may not expose token counts; the fixed monthly package is
  still included in the summary.
- Gemini CLI text mode may not expose token counts and currently has no fixed
  monthly commitment in this ledger.
- GPT-5.5 savings are a planning proxy: successful worker tokens are counted as
  avoided controller tokens, and EUR value appears only when an explicit
  `--gpt55-eur-per-m-token` assumption is passed.
- OpenRouter estimates use total tokens at output-token rate when Codex does
  not expose input/output split. This is conservative operational telemetry, not
  invoice-grade accounting.

## Nightly And Daily Routing

Nightly and daily Linear controller passes should use the cost router for
worker-grade L2 work instead of launching ad hoc model commands. The controller
still remains GPT-5.5 xhigh or successor.

Required order:

1. Read the due Linear issue contract and source-of-truth files.
2. Build a redacted, bounded worker prompt.
3. Run `codex-cost-router.mjs` with the allowed model aliases for that issue.
4. Append `metrics/ai-cost-ledger.jsonl` unless the run is an explicit dry run.
5. Integrate worker reports in the controller report or morning brief.
6. Let GPT-5.5/Codex decide Linear comments, gates and follow-up issues.

Gemini CLI is an optional worker lane, not a default fallback. It may run only
after the runtime auth preflight confirms a successful headless Gemini sanity
check. If Gemini is blocked by billing, auth or CLI failure, the controller
records a runtime blocker and continues with the remaining approved workers.

## Escalation Rules

Use GPT-5.5 directly when:

- the task involves private personal, finance, health, customer, legal, or
  strategy content
- the decision is irreversible or public
- a worker report conflicts with source-of-truth files
- the task requires final judgment, prioritization, or a user-facing answer

Use cheap workers first when:

- the prompt is already redacted
- the task is bounded and read-only
- a first pass can save GPT-5.5 from scanning lots of text
- disagreement between workers is useful signal

## Verification

Syntax and unit checks:

```bash
node --check scripts/model-router/codex-cost-router.mjs
node --check scripts/model-router/codex-cost-router-core.mjs
node --test scripts/model-router/codex-cost-router-core.test.mjs
node --test scripts/model-router/cost-ledger-core.test.mjs
```

Dry run:

```bash
node scripts/model-router/codex-cost-router.mjs \
  --mode issue-triage \
  --models grok,deepseek \
  --workspace "${COMPANY_OS_ROOT}" \
  --issue [WORK_ITEM_ID] \
  --prompt "Public sanitized smoke test: return a compact triage." \
  --dry-run
```

Live worker smoke should use a small public prompt first. Do not use private
Morning Briefing content until the redaction pack has been reviewed.
