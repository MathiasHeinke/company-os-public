# Multi-Inference C-Level Runtime

Status: audit-ready doctrine proposal; not yet a live dispatch policy
Use for: making Claude CLI, Codex CLI, Gemini CLI and future runtimes first-class
C-Level worker lanes behind one Company.OS control layer
Last updated: 2026-05-11

## Purpose

Company.OS needs one control layer that can decide:

```text
what work exists
who owns it as a C-Level seat
which runtime should execute or audit it
which model / inference budget is sufficient
how much autonomy is allowed
which gates must pass before the result is trusted
```

Plane is the execution ledger. The Runtime Dispatcher is the spawn surface. The
Capability Registry is the allowlist. The Runtime Inference Router is the model
power selector. CAO and Codex Controller are the review and decision layers.

This document defines the missing layer between those pieces: a model-agnostic
C-Level runtime scheme for Claude, Codex, Gemini and later OpenRouter/Grok or
other providers.

## Core Decision

Do not define "three C-Level workers" as three Plane projects or three loose
agent names.

Define them as **runtime lanes** behind a shared contract:

```text
Role owner: CTO / CPO / CMO / COO / CFO / CAO
Runtime agent: claude / codex / gemini / openrouter / human
Inference budget: low / standard / high / xhigh / max-context / multi-proposal
Capability profile: what that runtime may read, write, call and remember
Gate policy: how the result is audited and promoted
```

Plane should store the work item, ownership, state, contract and evidence.
Company.OS registries should store the routing truth. Runtimes should execute
only after the dispatcher injects the boot pack.

## Current State

| Lane | Current maturity | Safe current use | Not safe yet |
|---|---|---|---|
| Claude CLI | primary C-Level worker lane | P0/P1 docs/code, P2/P3 long-context work, first implementation pilots | HG-4 work, ungated production writes, direct Done |
| Codex CLI/Desktop | CEO/controller lane; worker parity under design | controller judgment, integration synthesis, bounded manual work in desktop session | autonomous primary worker dispatch |
| Gemini CLI | authenticated optional sidecar lane | long-context audit, spec drift, second proposal after fresh sanity | edit-capable worker, primary scheduler lane |
| OpenRouter/Grok/DeepSeek | cost-router sidecar lane | redacted read-only proposals or audits | direct repo writes, private context, Plane mutation |
| Hermes / operator shell | future human-assistance layer | briefing, status, decision prep, command center UX | bypassing dispatcher, bypassing HumanGate |

Important existing evidence:

- `reports/audits/2026-05-11-inference-router-codex-parity.md` says Codex as
  primary worker is **not production-ready**. The dispatcher is still
  Claude-shaped, stream-health is Claude-specific, no Codex worker
  CapabilityProfile exists, and cost-ledger separation is unresolved.
- `docs/orchestration/runtime-inference-router.md` and
  `registries/inference/company-os.json` currently route P0-P3 to Claude and P4
  to no spawn.
- `docs/orchestration/headless-worker-runtime-boot-contract.md` defines
  Claude, Codex and Gemini boot shapes but does not make Codex/Gemini first
  class workers by itself.

## Terms

### C-Level Seat

The management owner of the work. This is independent from the runtime.

Allowed seats:

- `role:cto`
- `role:cpo`
- `role:cmo`
- `role:coo`
- `role:cfo`
- `role:cao`

The seat owns scope, quality bar, remediation and business fit. It does not
imply that the runtime must be Claude, Codex or Gemini.

### Runtime Agent

The executable surface used for a bounded run.

Allowed runtime agents:

- `claude`
- `codex`
- `gemini`
- `openrouter`
- `human`

Future runtimes may be added only through registry entries and deep-audited
adapters.

### Inference Budget

The normalized Company.OS effort scale. It hides provider-specific knobs behind
one vocabulary.

| Budget | Meaning | Examples |
|---|---|---|
| `low` | cheap, reversible, narrow context | Claude Sonnet small docs pass |
| `standard` | bounded implementation with known tests | Claude Sonnet P1, future Codex high bounded patch |
| `high` | shared code or stricter reasoning | GPT-5.5 high, Claude stronger model tier |
| `xhigh` | controller-grade judgment | GPT-5.5 xhigh controller, release decision |
| `max-context` | large cross-repo context | Claude Opus 1M, Gemini long-context audit |
| `multi-proposal` | more than one model proposes independently | Claude + Gemini + Codex proposal set |

Provider mapping is registry-owned, not encoded in Plane prose.

### Capability Profile

The executable allowlist for one runtime lane:

```text
runtime agent + C-Level seat + workspace + modes + tools + memory + gates
```

Examples:

```text
claude-clevel-worker/cto/runtime
codex-clevel-worker/cto/runtime
gemini-clevel-worker/cto/audit
openrouter-sidecar/cmo/research
```

### Split Policy

How many model perspectives are allowed for one parent work item.

| Policy | Runs | Writes | Use |
|---|---|---|---|
| `single-worker` | one runtime | allowed if contract permits | normal P0/P1 work |
| `worker-plus-controller-audit` | worker + controller | worker only | P2 shared runtime |
| `primary-worker-plus-sidecar-audit` | worker + audit model | worker only | P3 cross-workspace |
| `parallel-proposal` | multiple models | report-only | architecture, strategy, risky choices |
| `parallel-execution` | child contracts in disjoint worktrees | child-scoped only | later v0.7+ |
| `no-autonomous-spawn` | none | none | P4 / HG-3 |

## Target Architecture

```text
0 Founder / CEO intent
1 Plane parent item
2 Spec / plan / tasks if major or cross-workspace
3 Child worker contracts
4 Contract Controller PASS
5 Dispatcher v0 lock + context
6 Capability Registry preflight
7 Runtime Auth Preflight
8 Runtime Inference Router
9 Runtime Dispatcher v1.2 adapter
10 Runtime worker or proposal lane
11 worker.reported
12 CAO verdict
13 Codex Controller decision
14 CEO / Founder gate
15 Plane state and memory sync
```

The control layer decides before spawn:

```yaml
route_decision:
  role_label: role:cto
  runtime_agent: claude
  runtime_model: opus
  model_alias: opus
  inference_budget: max-context
  task_class: P3-cross-repo
  context_profile: cross-workspace-boot-pack
  context_pack: raindrop-marketing-observability-v0
  domain_read_pack: raindrop-core-read-v0
  capability_profile: claude-clevel-worker/cto/runtime
  split_policy: primary-worker-plus-sidecar-audit
  secondary_auditor: gemini
  max_runtime: 2400s
  max_turns: 180
  max_spend: 0
  human_gate_level: HG-2.5
  controller_gate_policy: controller-reruns-gates-plus-cross-workspace-drift-check
```

## Contract Extension

Worker contracts already support `InferenceClass`, `CapabilityProfile`,
`MaxRuntime`, `MaxTurns`, `MaxSpend`, `RuntimePermissionMode` and
`GateExecutionPolicy`.

Add these optional fields for multi-inference routing:

```yaml
RuntimeAgent: claude | codex | gemini | openrouter | human
RuntimeModel: provider model id or auto
RuntimeModelAlias: sonnet | opus | gpt-5.5-high | gpt-5.5-xhigh | gemini-pro | auto
InferenceBudget: low | standard | high | xhigh | max-context | multi-proposal
ContextProfile: small-boot-pack | standard-boot-pack | runtime-shared-boot-pack | cross-workspace-boot-pack | audit-only-boot-pack
ContextPack: named boot/context pack, for example raindrop-marketing-observability-v0
DomainReadPack: named domain read-pack, for example raindrop-core-read-v0
SplitPolicy: single-worker | worker-plus-controller-audit | primary-worker-plus-sidecar-audit | parallel-proposal | parallel-execution | no-autonomous-spawn
PrimaryRuntime: claude | codex | gemini | openrouter | human | auto
FallbackRuntime: claude | codex | gemini | openrouter | human | none | auto
SecondaryAuditor: claude | codex | gemini | openrouter | human | none | auto
RouteReason: explicit | inferred | pool-capacity | cost-ceiling | context-window | risk-gate
PoolPolicy: none | prefer-free-lane | fail-closed-when-primary-unavailable
CostCeiling: none | low | standard | high | explicit-max-spend
```

Contract rule:

- Plane may declare preferences or hard requirements.
- The router emits the effective route.
- The dispatcher spawns only the effective route.
- The worker report must echo the route fields actually used.

## Runtime Lane Matrix

### Claude CLI

Primary strengths:

- edit-capable local code worker
- long-context Opus 1M audits and shared runtime work
- mature stream-json integration in current dispatcher
- existing `claude-clevel-worker/*` profiles

Default classes:

| Class | Route |
|---|---|
| P0 | Claude Sonnet unless Codex canary explicitly overrides |
| P1 | Claude Sonnet |
| P2 | Claude Opus 1M |
| P3 | Claude Opus 1M plus sidecar |
| P4 | no spawn |

Required guards:

- no `--bare`
- boot context proof required
- `SubAgentRoster` required before subagents
- `allowed_claude_tools` derived from CapabilityProfile and safe gates only
- controller reruns or samples gates

### Codex CLI

Primary strengths:

- CEO/controller reasoning
- high-quality bounded integration judgment
- potentially strong P0/P1 deterministic patches once adapter is proven

Current blocker summary:

- no `buildCodexRuntimeArgs`
- no Codex-specific stream-health evaluator
- no Codex worker CapabilityProfile
- no proven CAO compatibility for `runtime: codex`
- cost-ledger separation between controller and worker is not resolved
- Codex controller doctrine currently treats Codex as deputy CEO, not ordinary
  worker

Allowed before those blockers are fixed:

- manual desktop CEO/controller work
- report-only proposal in `parallel-proposal`
- read-only audit when explicitly launched and captured outside scheduler

Blocked until audited:

- autonomous primary worker dispatch
- edit-capable scheduler spawn
- P2/P3 shared runtime primary lane
- P4 / HG-3 work

Codex worker canary boundary:

| Phase | Scope | Gate |
|---|---|---|
| 1 | dry-run arg builder only | no process spawn |
| 2 | P0 docs-only canary | `AllowedWritePaths: docs/` |
| 3 | P1 bounded script/test canary | CAO accepts `runtime: codex` |
| 4 | pool-capacity fallback | metrics ledger pool signal proven |

### Gemini CLI

Primary strengths:

- long-context audit
- alternative architecture proposal
- spec-drift and cross-file contradiction detection
- useful counterweight to Claude/Codex assumptions

Current allowed use:

- read-only or report-only sidecar after fresh sanity check
- `parallel-proposal` lane
- P3 secondary auditor when source context is safe and redacted if needed

Blocked until audited:

- edit-capable worker mode
- primary scheduler lane
- direct Plane writes
- private/[SOURCE_WORKSPACE]/customer/finance/health raw context

Gemini policy:

```yaml
RuntimeAgent: gemini
Mode: audit | plan | review
RuntimePermissionMode: plan
GateExecutionPolicy: audit-only
MemoryUpdatePolicy: none | proposal-only
AllowedWritePaths: reports/audits/** only
```

### OpenRouter / Grok / DeepSeek

These are not first-class C-Level workers yet. Treat them as cost-router
sidecar lanes:

- redacted prompt only
- report-only
- no secrets, no private memory, no raw customer data
- no repo writes unless a future adapter is audited
- no Plane writes

They are useful for:

- cheap independent critique
- market / research sweep
- alternate implementation proposal
- sanity check against model-specific blind spots

## Role Ownership Matrix

| Role | Default primary runtime | Strong secondary | Notes |
|---|---|---|---|
| CTO | Claude for implementation, Codex controller for release, Gemini audit for cross-file | Gemini, Codex | highest code-risk surface |
| CPO | Claude for specs/UX docs, Gemini for research synthesis, Codex for decision synthesis | Gemini | good first multi-proposal seat |
| CMO | Claude for content systems, OpenRouter for redacted research, Codex for final gate | Gemini/OpenRouter | public claims require gate |
| COO | Claude for process/runbooks, Codex for controller, Gemini for drift audit | Codex | scheduler/process owner |
| CFO | Claude/Gemini only for report-only analysis unless finance connector is scoped | Codex | money/spend gates stay strict |
| CAO | no worker spawn; separate audit session only | Codex controller reads CAO | CAO builds nothing |

No role gets permanent ownership of a provider. The provider is selected by
task class, context need, risk, cost, current runtime health and pool load.

## Task Class Policy

Keep the existing P0-P4 task classes, but split route selection into two steps.

### Step 1: Classify Risk And Context

| Class | Meaning | Spawn |
|---|---|---|
| P0-doc-small | reversible docs/report/contract wording | yes |
| P1-code-bounded | bounded code/docs patch with known gates | yes |
| P2-code-shared | shared runtime/parser/controller/registry code | yes, heavy review |
| P3-cross-repo | multi-workspace or long-context architecture work | yes, sidecar recommended |
| P4-high-risk | HG-4, strategic, non-restorable, major legal/capital, founder-voice commitments | no |

### Step 2: Select Runtime Candidate

Decision factors:

```yaml
runtime_selection_inputs:
  task_class:
  role_label:
  mode:
  workspace:
  allowed_write_paths:
  source_of_truth_count:
  context_window_need:
  runtime_auth:
  pool_load:
  max_spend:
  human_gate_level:
  caa_or_controller_requirement:
  private_context_risk:
```

Default target policy:

| Class | Primary | Secondary / sidecar | Notes |
|---|---|---|---|
| P0 | Claude Sonnet now; Codex canary later | none | Codex only after adapter blockers fixed |
| P1 | Claude Sonnet now; Codex canary later | controller audit | Codex only for tight paths/tests |
| P2 | Claude Opus 1M | Codex controller | no Codex primary until parity proven |
| P3 | Claude Opus 1M | Gemini or Codex sidecar | proposal/audit sidecar, not write race |
| P4 | none | required audit before Founder/HG-4 decision | fail closed |

## Pool And Capacity Policy

Pool routing is allowed only after the runtime event ledger can answer:

```yaml
pool_load:
  claude_active_workers: 0
  codex_active_workers: 0
  gemini_active_workers: 0
  stale_locks: 0
  source: metrics/agent-events.jsonl
  freshness_seconds: 60
```

Never infer pool load from vibes or chat history. Preferred sources:

1. metrics ledger reducer
2. scheduler lane locks
3. Plane state counts
4. process count as last-resort advisory signal

Policy:

- `pool_load` may choose between equivalent safe routes.
- `pool_load` may not lower gates.
- `pool_load` may not route P2/P3/P4 to a weaker runtime.
- if primary is unavailable and fallback is not proven, emit `BLOCKED_AUTH` or
  `BLOCKED_DEPENDENCY`, not a silent downgrade.

## Multi-Proposal Mode

Use `parallel-proposal` when the question is "what should we do?" rather than
"apply this known patch."

Recommended shape:

```yaml
SessionPolicy: parallel-proposal
SplitPolicy: parallel-proposal
Coordinator: role:cto
SynthesisOwner: codex
MaxConcurrentAgents: 3
SharedFilesystem: none
ContextIsolation: required
SubAgentRoster:
  - name: claude-opus-architecture
    agent: claude
    mode: plan
    write_scope: report-only
  - name: gemini-long-context
    agent: gemini
    mode: plan
    write_scope: report-only
  - name: codex-controller-proposal
    agent: codex
    mode: review
    write_scope: report-only
```

Rules:

- no source-code writes by proposal agents
- each proposal gets the same boot pack and source-of-truth list
- each proposal declares assumptions and rejected alternatives
- Codex/CEO synthesis chooses one path, merges insights or rejects all
- implementation requires a later child contract with one primary worker

This can run earlier than parallel execution because it produces evidence, not
write conflicts.

## Live Dispatch Preconditions

Before Codex or Gemini becomes a first-class primary worker:

1. Capability Registry contains profiles for that runtime and role.
2. Runtime Dispatcher has adapter-specific arg builder.
3. Runtime stream/report parser understands that adapter.
4. Warm preflight has a runtime-specific sentinel.
5. CAO accepts and audits `runtime: <agent>` reports.
6. Cost ledger separates controller spend, worker spend and external provider
   spend.
7. `worker.reported` schema is runtime-agnostic.
8. Scope guard works for that runtime's process tree.
9. Failure modes map to stable run states.
10. At least three canary runs pass for the intended class.

## Capability Profile Buildout

### Required Profile Families

```text
claude-clevel-worker/<role>/<workspace-or-scope>
codex-clevel-worker/<role>/<workspace-or-scope>
gemini-clevel-worker/<role>/<workspace-or-scope>
openrouter-sidecar/<role>/<scope>
```

Minimum initial set:

```text
codex-clevel-worker/cto/runtime
codex-clevel-worker/cpo/runtime
codex-clevel-worker/coo/runtime
gemini-clevel-worker/cto/audit
gemini-clevel-worker/cpo/audit
gemini-clevel-worker/coo/audit
openrouter-sidecar/cmo/research
```

Do not create edit-capable Gemini profiles until a separate audit approves the
adapter, process control and report parser.

### Common Required Fields

Every non-human runtime profile needs:

```yaml
id:
role:
agents:
modes:
workspaces:
max_autonomy_level:
allowed_plugins:
allowed_connectors:
restricted_connectors:
allowed_commands:
gate_execution:
memory:
forbidden_surfaces:
human_gates:
last_verified_at:
stale_after_days:
source:
```

### Non-Claude Enforcement Gap

The executable Capability Registry currently blocks missing profiles for
Claude. Before Codex/Gemini primary dispatch, the validator must require a
profile for every `agent` in:

```text
claude, codex, gemini, openrouter
```

This enforcement change is a separate implementation step and must not be
smuggled into a docs-only update.

## Runtime Adapter Requirements

### Common Adapter Contract

Every runtime adapter must implement:

```text
buildRuntimeArgs(route, bootPrompt, contractFields)
runRuntime(args, env, cwd, timeout)
captureStream(stdout, stderr)
evaluateStreamHealth(streamLog, exitCode)
extractWorkerReport(output)
normalizeExitState(exitCode, streamHealth, declaredState)
```

### Claude Adapter

Current status: live first adapter.

Needs:

- keep stream-json support
- keep `--max-turns`
- keep `--allowed-tools`
- keep Claude-specific permission mode mapping

### Codex Adapter

Required before live:

- `buildCodexRuntimeArgs`
- no `--ignore-rules` for Company.OS worker runs
- no prompt shape that suppresses `AGENTS.md`
- Codex-specific stream-health evaluator
- separate `provider: openai_codex_worker` cost category if cost rows are
  emitted
- CAO tests for `runtime: codex`
- scope-guard process-tree kill test
- canary dry-run with no spawn

### Gemini Adapter

Required before primary:

- auth/billing sentinel in warm preflight
- report-only output capture
- Gemini-specific timeout policy
- no edit-capable mode until write semantics are understood
- no direct Plane mutation
- context redaction policy
- canary read-only audit with artifact path under `reports/audits/`

## Cost And Ledger Policy

Do not collapse all AI usage into one cost line.

Required categories:

```text
openai_codex_controller
openai_codex_worker
anthropic_claude_worker
google_gemini_sidecar
openrouter_sidecar
human_operator
```

Rules:

- controller spend and worker spend are different operating facts
- fixed subscription cost and marginal provider cost are different operating
  facts
- report-only sidecars must still emit event rows
- missing token usage is allowed, but missing run identity is not
- budget brakes must use the effective runtime category

## HumanGate Policy

| Gate | Runtime rule |
|---|---|
| HG-0 | fully reversible, no external effect; worker may proceed if all registries pass |
| HG-1 | CEO decision card required before promotion |
| HG-2 | CEO decision brief required before broader action |
| HG-2.5 | Codex/CEO autonomous release possible only with CAO PASS and rollback |
| HG-3 | CEO/Codex critical authority; spawn only with reversible/restorable scope and release evidence |
| HG-3.5 | Chief-of-Staff / Founder-Proxy review layer; prepares Founder decision but does not replace Founder on HG-4 calls |
| HG-4 | Founder/human strategic or non-restorable decision; no autonomous spawn for the gated action |

P4 always fails closed. Parallel proposal may prepare the decision package for
HG-4, but it may not execute the gated action.

## Roadmap

### v0.4 Immediate

- keep Claude as primary live worker lane
- document multi-inference target architecture
- run deep audit on this doctrine, existing router and Codex parity report
- do not activate Codex/Gemini primary worker dispatch

### v0.5

- add first Codex and Gemini CapabilityProfiles as report-only or dry-run
- add normalized contract fields to docs and parser tests where needed
- add runtime adapter interface design
- add pool-load reducer design
- allow `parallel-proposal` for report-only C-Level strategy questions

### v0.6

- implement Codex dry-run adapter
- implement Gemini report-only audit adapter
- add CAO tests for non-Claude runtimes
- run P0 Codex docs-only canary after audit approval
- use Gemini as P3 sidecar when sanity is green

### v0.7

- allow first bounded Codex P1 canary with disjoint `AllowedWritePaths`
- expose runtime lanes, queue state and sidecars in Command Center / operator
  shell
- start first sandboxed parallel execution pilot only with disjoint worktrees

### v0.8

- make department assistants aware of runtime lanes
- allow employees/operators to ask the assistant for "compare three approaches"
  workflows
- show route decisions, active runs, gates and audit status in the UI

### v1.0+

- portfolio scheduler chooses between due items across projects
- pool-load and cost-aware routing influence non-critical task ordering
- HG-3.5 founder-proxy layer may reduce direct Founder interruptions after
  repeated green history

## Deep Audit Scope

A serious audit should test the doctrine against implementation reality.

Required audit files:

```text
docs/orchestration/multi-inference-c-level-runtime.md
docs/orchestration/runtime-inference-router.md
registries/inference/company-os.json
scripts/orchestration/inference-router.mjs
scripts/orchestration/inference-router.test.mjs
docs/registries/capability-registry.md
registries/capabilities/company-os.json
scripts/capabilities/capability-registry-core.mjs
docs/orchestration/company-os-runtime-dispatcher-v1.md
scripts/orchestration/runtime-dispatcher-v1.mjs
scripts/orchestration/runtime-dispatcher-v12-core.mjs
docs/orchestration/headless-worker-runtime-boot-contract.md
docs/orchestration/codex-controller-runtime.md
docs/orchestration/parallel-portfolio-orchestration.md
docs/templates/worker-issue-contract.md
reports/audits/2026-05-11-inference-router-codex-parity.md
```

Audit questions:

1. Are management role, runtime agent and model budget separated everywhere?
2. Can Plane store enough route intent without becoming the registry?
3. Does any document imply Codex/Gemini primary dispatch is already safe?
4. Are current scripts hardcoded to Claude in ways the docs now expose?
5. Are P4/HG-3 surfaces impossible to spawn autonomously?
6. Are non-Claude CapabilityProfiles required before live dispatch?
7. Does CAO understand runtime-agnostic `worker.reported` payloads?
8. Are stream-health, cost ledger and scope guard runtime-specific?
9. Does parallel proposal mode avoid write conflicts?
10. Are v0.5/v0.6/v0.7 boundaries realistic and auditable?

Expected audit output:

```yaml
verdict: PASS | PATCH_REQUIRED | REJECT
critical_findings:
warnings:
doc_drift:
implementation_gaps:
missing_tests:
recommended_plane_items:
human_gate:
```

## Stop Rules

- Do not route Codex as autonomous primary worker until the Codex adapter,
  stream-health, capability profile, CAO acceptance and cost split are proven.
- Do not route Gemini as edit-capable worker until the Gemini adapter and
  process/report semantics are proven.
- Do not let any runtime self-poll Plane.
- Do not let provider availability lower HumanGate level.
- Do not treat `max` or `xhigh` as a substitute for SourceOfTruth, gates or
  rollback.
- Do not add external provider lanes for private or regulated context without
  an explicit redaction gate.
- Do not activate multi-agent writes before disjoint worktree integration is
  proven.
