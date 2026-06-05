# Raindrop Workshop Observability Sidecar

Status: candidate sidecar pilot
Use for: local trace/debug/replay evidence for Company.OS-owned LLM calls
before the read-only v0.7 Command Center
Last updated: 2026-05-19

## Purpose

Company.OS needs an evidence layer that sits beside the runtime loop and makes
agent work inspectable while it happens. Raindrop Workshop is a candidate for
that layer.

It should be treated as a local flight recorder for agent runs:

```text
Operator / Founder
  -> AionUi + Hermes assistant
  -> Company.OS Command Center adapter
  -> Plane execution ledger
  -> Runtime Dispatcher / Scheduler
  -> Claude, Codex, Gemini, Hermes or other workers
  -> CAO / Controller / HumanGate

Raindrop Workshop observes Company.OS-owned agent/runtime traces beside this
flow. It does not own the flow.
```

Raindrop may help the operator and controller answer:

- What did the worker actually do?
- Which model call, tool call, prompt section or output caused the failure?
- Did the retry or prompt/code patch change the trajectory?
- Is the Worker Contract, Runtime Dispatcher or CAO gate missing a testable
  eval case?

## What It Is

Raindrop Workshop is a local, open-source debugger for AI agents. The official
Workshop docs describe it as a browser UI that streams tokens, tool calls,
timing, inputs, outputs and errors from an instrumented agent run. It runs
locally and defaults to `localhost:5899`.

Canonical upstream references:

- https://www.raindrop.ai/workshop
- https://www.raindrop.ai/docs/workshop/overview/
- https://github.com/raindrop-ai/workshop
- https://www.raindrop.ai/docs/mcp/overview/
- https://www.raindrop.ai/docs/security/data-security-and-privacy/

Upstream-reported properties to verify during the pilot:

- local UI: `http://localhost:5899`
- install path: verify the upstream Raindrop Workshop install docs first; do not
  run pipe-to-shell quick installers without operator review.
- source build: `git clone https://github.com/raindrop-ai/workshop.git`
  followed by `bun install` and `bun run dev`
- default local database:
  `~/.raindrop/raindrop_workshop.db`
- useful env vars:
  - `RAINDROP_WORKSHOP_PORT`
  - `RAINDROP_WORKSHOP_DB_PATH`
  - `RAINDROP_LOCAL_DEBUGGER`
- supported transport includes Raindrop SDKs and OTLP JSON at `/v1/traces`
- compatible stacks include TypeScript, Python, Go, Rust, OpenAI Agents SDK,
  Anthropic SDK, Claude Agent SDK, LangChain, LangGraph, CrewAI, Mastra,
  Pydantic AI, DSPy, Google ADK, Strands, Agno, Claude Code, Codex, Cursor,
  Devin and OpenCode

These claims are not Company.OS guarantees. The pilot must verify them locally
before any roadmap promotion.

## What It Does For Company.OS

Raindrop is not another cockpit and not another scheduler. It is useful because
it can make every Company.OS-routed LLM call observable at the level where
normal logs are too coarse.

Primary Company.OS uses:

- trace every Company.OS LLM call that passes through Runtime Dispatcher,
  Scheduler, hard-cron, CLI wrappers or future Hermes/AionUi adapters
- trace selected local worker runs
- inspect model calls, tool calls, spans, timing and errors
- preserve failure evidence for CAO and Codex Controller review
- turn repeated failures into eval cases or Worker Contract improvements
- compare route choices from the Runtime Inference Router
- support morning brief drill-down with evidence links instead of prose claims
- replay a failure after a prompt, code, gate or contract change

Non-goals:

- no Plane writes
- no `dispatch: ready` decisions
- no `Done` transitions
- no scheduler ownership
- no HumanGate ownership
- no memory authority
- no production-data observability platform in the first pilot

## Placement

Raindrop belongs before v0.7 as a v0.6.x evidence pilot, not as a product UI.

| Version | Placement |
|---|---|
| v0.4-v0.5 | Document and evaluate locally only. No production traces and no cloud MCP. |
| v0.6.x | Run a local Workshop pilot on harmless read-only or synthetic worker runs. Produce trace cards and security notes. |
| v0.7 | If the pilot passes, the read-only Command Center may link to trace summaries, replay reports and eval cases. |
| v0.8 | Department assistants may attach trace evidence to intent cards and blocked worker reports. |
| v0.9+ | Consider Raindrop cloud/MCP or managed triage only after a separate data-transfer, privacy and support-lifecycle review. |

This means Raindrop can be integrated before v0.7, but only as observability
scaffolding. It must not accelerate state-changing autonomy by itself.

## Architecture Boundary

```text
Plane
  = execution truth: work item, contract, comments, state, gates

metrics/agent-events.jsonl
  = typed Company.OS state stream for reducers and morning briefs

Worker reports
  = human-readable outcome and artifact evidence

Raindrop Workshop
  = local trace/debug/replay evidence for Company.OS-owned LLM calls
```

Raindrop traces may be referenced by Plane comments and reports. Plane comments
must not embed raw trace payloads when they contain secrets, private memory,
customer data, PHI, regulated details or large prompts. Store only the safe
summary, trace id, local artifact path and redaction classification.

The operational call-level requirement lives in
`docs/operations/raindrop-llm-call-observability.md`. The generic independent
reviewer loop is downstream and currently paused; it is not a substitute for
Raindrop call instrumentation.

## Initial Pilot Scope

The first pilot should prove three things:

1. Workshop can run locally without touching production state.
2. A Company.OS-owned LLM call path can emit a safe local summary.
3. The controller can turn a trace into a better gate, eval, prompt, contract
   field or CAO rejection reason.

Recommended first trace targets:

- a synthetic Runtime Dispatcher dry-run
- a read-only Contract Controller / Stage 0.5 pass
- a harmless Claude Code read-only audit against docs only
- a local Hermes/Aion morning-brief mock that reads copied public-safe
  Company.OS context

Longer-term coverage requires Company.OS to route all important LLM work
through instrumented adapters. Raindrop cannot observe arbitrary manual calls
outside the Company.OS runtime boundary.

Do not start with:

- live production deploys
- schema/RLS/auth/service-role tasks
- raw `.env` reads
- private customer, medical, finance, legal or founder-personal data
- full Claude/Codex/Gemini desktop sessions with unrestricted tool payloads

## Security And Privacy Rules

Default mode is local-only Workshop.

Blocked until separate HG-3 review:

- Raindrop cloud ingestion for Company.OS private runs
- hosted Raindrop MCP connected to production traces
- API key auth stored in repo files
- automatic upload of raw prompts, tool arguments or tool outputs
- traces over regulated, customer, finance, legal, medical or private founder
  data

Required pilot guardrails:

- set a private local DB path outside this repo or inside ignored private ops
- keep Raindrop config and DB ignored
- run with synthetic or redacted data
- redact secrets, raw environment values and private memory from trace payloads
- document kill switch and reset path
- record every traced run as a report artifact, not as a Plane memory dump
- keep `RAINDROP_LOCAL_DEBUGGER` scoped to the pilot shell only

Operational kill switch:

```bash
raindrop workshop stop
unset RAINDROP_LOCAL_DEBUGGER
```

DB deletion is a separate deliberate cleanup action. Do not delete trace
evidence before CAO/Controller review if a run is under audit.

## Integration Pattern

Phase A: local install record

- install Workshop locally
- pin binary version or source commit in a private install record
- set `RAINDROP_WORKSHOP_DB_PATH` to a private ignored path
- verify `raindrop workshop status`

Phase B: read-only trace pilot

- run Workshop locally
- instrument a harmless read-only agent path
- capture one successful trace and one intentional failure trace
- write a report under `reports/observability/raindrop-workshop/`
- link the safe report path in Plane

Phase C: Company.OS adapter design

- define a trace summary card shape:
  - `trace_id`
  - `run_id`
  - `plane_issue`
  - `agent`
  - `mode`
  - `redaction_level`
  - `failure_class`
  - `top_spans`
  - `controller_action`
  - `eval_or_contract_update`
- define whether the adapter reads from Raindrop local DB, local export, SDK or
  OTLP JSON endpoint
- keep `metrics/agent-events.jsonl` as the reducer source and use Raindrop as
  evidence, not state

Phase D: v0.7 absorption decision

- adopt trace links in read-only Command Center
- fork/adapt Raindrop Workshop only if license, security, local operation,
  performance and data handling pass
- reject or park if local-first guarantees, redaction, or adapter boundaries are
  not strong enough

## Acceptance Bar

Raindrop may influence v0.7 only if:

- local Workshop runs without production credentials
- trace DB is private and ignored
- one read-only worker run has useful trace evidence
- one replay or eval loop improves a Worker Contract, prompt, gate or CAO
  verdict
- no raw secrets or private data appear in reports or Plane comments
- trace summaries link back to Plane item, run id and report path
- the Command Center remains read-only
- cloud/MCP remains off unless separately reviewed

## Worker Contract Draft

Create this as a Plane CompanyOS work item when the pilot is ready to execute.
Keep `dispatch: manual` until the install profile and private DB path are
confirmed.

```yaml
role: role:coo
parent_seat: role:coo
agent: claude
mode: implement
workspace: registry:company-os
dispatch: manual
sandbox: required
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - https://www.raindrop.ai/docs/workshop/overview/
  - https://github.com/raindrop-ai/workshop
scope:
  - Include: local-only Raindrop Workshop install/readiness pilot for Company.OS observability.
  - Include: private install record, DB-path decision, one safe trace target selection, report template and v0.7 absorption recommendation.
  - Exclude: production traces, cloud Raindrop MCP, Plane state writes, dispatch-ready flips, Done transitions, schema/RLS/auth/service-role/deploy/spend/public-publish actions, private/customer/medical/finance/legal data.
allowed_write_paths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
capability_profile: ops-observability-sidecar-local-only
runtime_auth:
  - `claude -p "Return exactly: CLAUDE_AUTH_OK" --model opus --permission-mode plan --output-format text --max-turns 1`
runtime_permission_mode: plan
inference_class: P1-code-bounded
runtime_agent: claude
runtime_model_alias: opus
inference_budget: standard
split_policy: single-worker
cost_ceiling: low
gate_execution_policy: controller-only
event_policy: required
event_sink: metrics-jsonl
event_types:
  - worker.locked
  - worker.heartbeat
  - worker.reported
  - controller.verdict
state_reducer: issue-state-from-agent-events
memory_update_policy: proposal-only
reflection_policy: required
learning_proposal_policy: required
session_policy: single-worker
subagent_roster: none
shared_filesystem: sandbox-worktree
context_isolation: required
runtime_adapter: local-cli
acceptance_criteria:
  - Raindrop Workshop local install/readiness path is documented with exact commands and kill switch.
  - Pilot report defines trace target, redaction policy, DB path, evidence artifacts and v0.7 recommendation.
  - No cloud/MCP/API key path is enabled.
  - No production data or secrets are traced.
gates:
  - gitnexus status
  - raindrop workshop status
  - no real secrets in reports, config or Plane comments
  - controller review before enabling any cloud/MCP or production trace path
outcome_spec: Local-only Raindrop Workshop readiness pilot with documented install path, trace target, redaction policy and v0.7 absorption recommendation.
outcome_rubric: PASS when local-only boundaries are explicit, no cloud/MCP/API key path is enabled, and one safe trace target is ready for controller review.
outcome_grader: controller
outcome_pass_threshold: controller PASS or PARK with exact blocker.
outcome_artifacts:
  - ${LOCAL_WORKSPACE}
human_gate: HG-2.5
reporting: Plane worker.reported with install status, commands/results, trace target, report path, risks, and exact decision needed before v0.7 absorption.
blocked_actions: never enable cloud Raindrop MCP, never upload private traces, never write Plane Done, never mutate production state, never bypass CAO/Controller/HumanGate.
kill_switch: stop Raindrop Workshop via `raindrop workshop stop`, unset `RAINDROP_LOCAL_DEBUGGER`, and stop worker before any cloud/MCP/API-key prompt.
heartbeat: every 15 minutes while installing, tracing or writing the pilot report.
```
