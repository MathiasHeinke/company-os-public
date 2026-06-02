# Headless Worker Runtime Boot Contract

Status: canonical doctrine for Claude/Codex/Gemini headless worker starts
Last updated: 2026-05-09
Use for: scheduler-dispatched workers, Runtime Dispatcher v1.2, Codex
Controller handoffs, and any Plane work item that will run outside a long-lived
desktop chat session

Related doctrine: `docs/orchestration/multi-inference-c-level-runtime.md`
defines when Claude, Codex, Gemini and future providers may act as C-Level
runtime lanes. This boot contract defines how any chosen runtime must be
context-loaded.

## Purpose

Desktop sessions feel strong because they carry accumulated chat context. A
headless CLI run is different: every invocation is either a fresh session or a
resumed session only if the scheduler explicitly stores and reuses a session id.

This contract makes headless workers reliable by replacing "chat memory" with a
deterministic boot pack:

1. repo rules and local system index
2. Company.OS orchestration doctrine
3. Plane work item contract and role label
4. dispatcher v0 lock + worker context
5. source-of-truth files named by the item
6. explicit reporting and stop rules

The worker is considered under-contextualized until it proves this boot pack was
loaded.

## Runtime Truth

| Surface | What it gets by default | Risk | Required fix |
|---|---|---|---|
| Claude Code desktop app | current chat, project state, `CLAUDE.md`, tools | strong but not reproducible | use for founder/operator work |
| Claude Code CLI `claude -p` | fresh prompt, cwd project discovery, `CLAUDE.md` auto-discovery unless `--bare` | loses prior chat context | scheduler must inject boot pack |
| Claude Code CLI `--bare` | no hooks, no keychain/OAuth, no `CLAUDE.md` auto-discovery | too thin for Company.OS workers | forbidden for autonomous workers |
| Codex desktop app | current chat, repo context, configured plugins | strong CEO surface | use for CEO/controller work |
| Codex CLI `codex exec` | fresh prompt, cwd, `AGENTS.md`, global `.codex` config | loses app chat context | scheduler must inject boot pack |
| Gemini CLI | prompt + cwd only, billing currently must pass sanity | optional audit arm | only after sanity check |

Conclusion: the CLI can be just as useful as the desktop app for bounded worker
tasks, but only if the scheduler gives it the right boot pack. Without that,
it is not equivalent.

## Forbidden Boot Shapes

- Do not run Company.OS workers with `claude --bare`.
- Do not let Claude/Gemini/Codex workers self-poll Plane or Linear.
- Do not rely on a previous chat session unless the scheduler explicitly passes
  a stored `--session-id` and the work item is the same issue.
- Do not dispatch from a random cwd. The cwd must be the target workspace root.
- Do not send [SOURCE_WORKSPACE]/private memory, raw financial/private data, secrets, `.env`
  content or raw customer data into external worker prompts.
- Do not treat an auth sentinel as context proof. `CLAUDE_AUTH_OK` proves only
  auth, not that the worker loaded the right doctrine.

## Required Boot Pack

Every headless worker prompt MUST include these sections, in this order.

### 1. Runtime Identity

```yaml
runtime_identity:
  agent: claude | codex | gemini
  model: opus | gpt-5.5-xhigh | gemini-3.1-pro-preview
  role_label: role:cto | role:cpo | role:cmo | role:coo | role:cfo | role:cao
  worker_class: c-level-worker | audit-worker | controller | cao
  work_item: COMPA-<n>
  workspace: /absolute/path
  dispatch_mode: manual | ready | scheduled
```

### 2. Boot Reading Order

The prompt must instruct the worker to read:

1. target workspace `AGENTS.md`
2. target workspace `CLAUDE.md`, if the runtime is Claude and the file exists
3. local Layer-0.5 index: `docs/system-index.md`,
   `memory-bank/system-index.md` or `.antigravity/system-index.md`
4. for Company.OS orchestration work:
   - `${COMPANY_OS_ROOT}/docs/orchestration/plane-first-linear-bridge.md`
   - `${COMPANY_OS_ROOT}/docs/orchestration/plane-role-routing.md`
   - `${COMPANY_OS_ROOT}/docs/orchestration/plane-state-model.md`
   - `${COMPANY_OS_ROOT}/docs/orchestration/headless-worker-runtime-boot-contract.md`
   - `${COMPANY_OS_ROOT}/docs/orchestration/spec-to-worker-pipeline.md`
   - `${COMPANY_OS_ROOT}/docs/orchestration/claude-clevel-worker-runtime.md`
   - `${COMPANY_OS_ROOT}/docs/templates/worker-issue-contract.md`
   - `${COMPANY_OS_ROOT}/docs/orchestration/subagent-reporting-contract.md`
   - `${COMPANY_OS_ROOT}/docs/governance/ceo-release-authority.md`
5. source-of-truth files named in the Plane work item

The worker may load additional files only when the system index or the work
item explicitly points there.

### 3. Plane Work Item Snapshot

The prompt must include:

- Plane sequence id and UUID
- title
- role label
- current state
- source Linear bridge id, if any
- description stripped to text
- the fenced worker contract or execution-plan enrichment YAML
- latest `worker.lock (dispatcher-v0)` comment id
- latest `worker.context (dispatcher-v0)` comment body
- latest relevant CAO/controller comments, if this is a controller run

For HTML descriptions, use Plane's sanitized `description_html` or
`description_stripped`. Do not rely on HTML comments as durable markers; Plane
may strip them. Stable parser anchors must be visible headings or fenced YAML.

### 4. Context Proof Requirement

Before doing substantive work, the worker must include this block in its final
report. For multi-hour runs, it should also appear in the first heartbeat:

```yaml
boot_context_proof:
  read:
    - AGENTS.md
    - <local system index>
    - <Company.OS orchestration docs actually used>
    - <Plane work item snapshot>
  role_label_seen: role:...
  source_of_truth_seen:
    - <path or Plane item>
  context_gaps:
    - <gap or []>
  refused_due_to_context_gap: true | false
```

If the worker cannot prove the boot pack, it must return `BLOCKED_DEPENDENCY`
with reason `runtime.boot-context-incomplete`.

### 4.1 Timing Policy

Long-context headless audits are slow by design. Claude Opus 4.7 with the 1M
context window may spend several minutes before emitting useful output.

Every scheduled or dispatcher-started worker must therefore carry explicit
timing fields:

```yaml
timing_policy:
  min_silent_seconds: 300
  normal_audit_wait_seconds: 600-900
  hard_timeout_seconds: <contract MaxRuntime>
  max_turns: <contract MaxTurns or dispatcher default>
  heartbeat_ms: <dispatcher heartbeat cadence>
  stream_log: <absolute .stream.jsonl path>
  duplicate_before_min_silent_seconds: never
```

Interpretation:

- **0-300 seconds silent:** normal. Do not retry, duplicate, or classify stuck.
- **300-600 seconds silent:** watch with heartbeat/status checks only.
- **600-900 seconds silent:** still normal for deep audits; report as running
  if the process is alive.
- **After hard timeout:** emit `TIMEOUT` or `NEEDS_HUMAN` with captured partial
  artifacts. Never start a second worker on the same lock unless the old lock is
  expired or explicitly superseded.
- **After max turns:** emit `RUNTIME_ERROR` with the captured output and treat
  it as a scope/runtime-budget problem. Implementation workers should declare
  `MaxTurns: 120` unless the work is deliberately audit-only; the dispatcher
  clamps unsafe values above 200.
- **During the run:** persist redacted stdout/stderr chunks to the stream log
  and emit `worker.heartbeat` telemetry. The controller should watch these
  durable artifacts instead of relying on in-memory process buffers.
- **If the worker drifts out of scope:** Runtime Dispatcher v1.2 compares
  changed files against `AllowedWritePaths` or path-like `Scope` entries. With
  `--scope-guard kill`, out-of-scope writes terminate the runtime and return
  `NEEDS_HUMAN`.
- **If a kill switch appears:** a Plane comment `KILL COMPA-<n>` / `KILL
  <work-item-id>` or declared local sentinel file terminates the runtime.

### 5. Reporting Contract

Every worker run returns exactly one consolidated `worker.reported` payload.
Subagents are allowed only inside a locked Plane work item and must be reported
under `subagents:` per
`docs/orchestration/subagent-reporting-contract.md`.

The report must name:

- changed files or `[]`
- commands run and exit codes
- generated report paths
- gate results
- risks
- blocked actions still blocked
- `capability_context_proof` when `Agent: claude` or a Claude
  CapabilityProfile is present
- `reflection` and `learning_proposals` when `DreamPolicy` is not `none`
- requested next state: `cao:review`, `ceo:review`, `planning`, `parked`,
  `needs-human`

The worker never marks Plane `Done`.

## Claude CLI Shape

Default audit/plan worker:

```bash
"${CLAUDE_BIN}" -p "$BOOT_PROMPT" \
  --model 'opus' \
  --permission-mode plan \
  --output-format text \
  --max-turns 30
```

Use `--add-dir "${COMPANY_OS_ROOT}"` when the target cwd is another workspace
and the worker must read Company.OS doctrine. Do not use `--bare`.

(Resolve `${CLAUDE_BIN}` and `${COMPANY_OS_ROOT}` against
`docs/operations/portable-path-placeholders.md`; defaults on macOS pnpm setups
are `~/Library/pnpm/claude` and `~/Developer/Company.OS`.)

Implementation workers are only allowed after Runtime Dispatcher v1.2, HG-2.5
release card, v0 lock, workspace health, budget, timeout, artifact paths and
CAO/controller prerequisites are green. The permission mode for those runs is
defined by the dispatcher, not by the worker prompt.

When an implementation issue declares `RuntimePermissionMode: auto` and a
CapabilityProfile with `allowed_claude_tools`, Runtime Dispatcher v1.2 must pass
those tools to Claude with `--allowed-tools`. The worker is then responsible for
running declared safe gates itself, including test/build/lint/typecheck commands
named in the work item. If Claude's own harness still denies a gate, the worker
reports the denial as a blocker instead of silently handing all validation back
to the controller.

Runtime dry-run also checks this before spawn: executable `Gates:` commands must
be safe-derived by the dispatcher or explicitly covered by `allowed_claude_tools`.
Missing coverage blocks as `runtime.gate-tool-not-allowed`.

Gate commands must be single commands, not shell-composed chains. Split
`pnpm test && pnpm lint` into two `Gates:` entries. Explicit `Bash(...)`
allow-list entries without trailing `*` cover only the exact command; use the
wildcard form when the gate includes arguments.

## Codex CLI Shape

Default controller/dry-run shape:

```bash
codex exec \
  --cd "${COMPANY_OS_ROOT}" \
  --model gpt-5.5 \
  --ask-for-approval never \
  "$BOOT_PROMPT"
```

Codex CLI is the deputy-CEO/controller surface, not the default worker. Use it
when the item is high-priority, controller/release-specific, or needs GPT-5.5
xhigh judgment. Use it sparingly for implementation because it is the expensive
authority layer.

Codex as autonomous primary worker is not live policy yet. Before scheduler
dispatch may route `Agent: codex` as a C-Level worker, Company.OS must add a
Codex-specific runtime adapter, stream-health evaluator, CapabilityProfile
family, CAO acceptance tests and cost-ledger separation as defined in
`docs/orchestration/multi-inference-c-level-runtime.md`.

## Gemini CLI Shape

Default report-only audit shape:

```bash
"${GEMINI_BIN}" --skip-trust \
  -p "$BOOT_PROMPT" \
  -m gemini-3.1-pro-preview \
  --approval-mode plan \
  --output-format text
```

(Resolve `${GEMINI_BIN}` against `docs/operations/portable-path-placeholders.md`;
default on macOS pnpm setups is `~/Library/pnpm/gemini`.)

Gemini is a long-context audit and proposal lane until a separate adapter audit
proves edit-capable semantics. Every Gemini worker requires a fresh auth/billing
sanity check, report-only `AllowedWritePaths`, no direct Plane mutation and a
runtime-specific output parser.

## Session Reuse

Default: one fresh CLI run per worker item. This is safer and easier to audit.

The baseline same-item resume path is allowed only when all are true:

- same Plane work item
- same target workspace
- same runtime and model
- scheduler stores `session_id`
- prior run ended in `TIMEOUT`, `NEEDS_HUMAN`, or a bounded continuation state
- the next prompt includes the same boot pack and current Plane snapshot

If any condition is missing, start fresh and reload context.

Long-context workstreams may opt into a broader continuity policy only through
`docs/orchestration/workstream-session-continuity.md`,
`registries/sessions/workstream-continuity.json` and
`scripts/orchestration/session-continuity-router.mjs`. That policy can route to
`SC2-workstream-continuity` or `SC3-session-group`, but it still requires the
current boot pack, current Plane snapshot, route receipt and explicit registry
state. Audits, security reviews, release gates and high-risk/HG-4 surfaces
remain fresh or blocked by default.

## Scheduler Responsibilities

The scheduler must:

1. rotate/ensure Plane app token before reading queue
2. read Plane item and comments
3. run v0 lock/dedupe checks
4. build the boot pack
5. run runtime auth sentinel
6. run context proof validator after worker output
7. capture stdout/stderr into a report
8. write `worker.run-summary` / `worker.reported`
9. hand off to CAO
10. never mark Done

The worker must not compensate for scheduler omissions. Missing boot pack is a
hard dependency blocker, not an invitation to guess.

## Automation Transition Policy

Existing Codex automations may stay active as transitional lanes only when they
do not claim to be the new Plane dispatcher. They must not create competing
truth. New recurring Company.OS work should be expressed as Plane work items and
dispatched by the Runtime Dispatcher path.

Until Runtime Dispatcher v1.2 is proven, existing Cron jobs should be treated
as legacy scheduled operators:

- keep runtime/auth/preflight jobs active
- keep domain production jobs active only if they already have lane locks and
  artifact-truth gates
- do not add new logic to old Cron prompts except security/auth fixes
- migrate repeated jobs into Plane dispatcher one lane at a time

## First Pilot Recommendation

Do not start with product code or publishing. Start with a small verifier-type
task:

- target: Plane HTML/description parser hardening
- reason: we just observed that Plane strips HTML comments while preserving
  visible headings/YAML
- expected output: parser utility or doctrine update, tests, report
- allowed writes: Company.OS docs/scripts only
- forbidden: Plane Done by worker, Linear writes, scheduler activation

This pilot tests the exact risk surface: can a headless worker load enough
context, notice Plane HTML semantics, patch safely, and report back in a
controller-verifiable shape?
