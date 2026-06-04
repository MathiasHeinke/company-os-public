# Company.OS Runtime Dispatcher v1

Status: canonical doctrine for **push-mode** worker dispatch
Phase: v1.1 dry-run scaffold exists with executable Capability Registry check;
v1.2 bounded single-runtime run mode exists for HG-2.5 low-risk pilots;
stage 7 controller handoff is proven by first live pilot; v1.2.3 hardens
live streaming, stream-health, stream compaction and worker-declared-state
handling
Use for: starting a Claude / Codex / Gemini worker run from a Company.OS
scheduler against a Plane work item that has already passed the v0 Lock + Context
flow and the CEO has issued an HG-2.5 release card
Last updated: 2026-05-16

Related doctrine: `docs/orchestration/multi-inference-c-level-runtime.md`
defines the target model-agnostic runtime lane architecture. Dispatcher v1.2 is
proven on the Claude lane and now supports Gemini only as a report-only
`audit|plan|review` sidecar. Codex and Gemini still require adapter-specific
hardening before primary or edit-capable worker dispatch.

## Purpose

The dispatcher v0 (`docs/orchestration/plane-worker-dispatcher-v0.md`) is a
**pull/observe** model: it reads a Plane work item, validates the contract,
writes lock + context comments, and stops. The operator copy-pastes the
context comment into a worker runtime by hand.

Dispatcher v1 is the **push** model. The Company.OS scheduler launches the
worker runtime itself against a locked work item, enforces preflights and
budget, captures heartbeats, and writes a structured ledger when the run
ends. The operator does not paste prompts; the scheduler does.

v1 only runs when CEO/Codex has released the project for autonomous push-mode
via `docs/governance/ceo-release-authority.md` (HG-2.5). Until then, v0
remains the safe default.

## Difference to v0

| Dimension | v0 (pull/observe) | v1 (push/run) |
|---|---|---|
| Trigger | operator runs the script | scheduler runs the script |
| Worker spawn | none | yes, controlled by hard-cron-wrapper |
| Modes | `dry-run`, `lock` | `dry-run`, `run` (after HG-2.5 release) |
| Plane state changes | none | none by Claude; CAO + CEO drive transitions |
| Comment writes | `worker.lock` + `worker.context` | adds `worker.run-summary` after the run |
| Ledger | n/a | `metrics/agent-events.jsonl` rows per state |
| Report artifact | n/a | `reports/runs/YYYY-MM-DD/<run_id>.md` |
| HumanGate | HG-2 (CEO Decision Brief) | HG-2.5 for bounded release, HG-3 for CEO/Codex critical reversible scopes, HG-4 for founder scopes |
| Lock semantics | comment-based | comment-based **plus** a scheduler lane lock |
| Budget | not enforced | hard `MaxSpend` and cost-router check before spawn |
| Stop conditions | n/a | `MaxRuntime`, `KillSwitch`, `Heartbeat`, runtime auth loss |

v1 never runs without v0 having already locked the item.

## Current Buildout Stage

Company.OS currently has the full run chain proven through **stage 7 of 9**.
This means the system has moved from a Plane work item through headless worker
execution, CAO audit and Codex controller decision without manual copy-paste.
Repeated pilots and scheduler activation are still required before this becomes
the default unattended path.

| Stage | Actor | What Happens | Writes Allowed | Status Now |
|---:|---|---|---|---|
| 0 | CEO/Codex | Plane work item gets a parseable contract: `Agent`, `RoleLabel`, `Workspace`, `CapabilityProfile`, `Gates`, `Reporting`, `HumanGate` | Plane description/comments | running |
| 0.5 | Contract Controller | Audits whether the contract is strong enough before lock: Spec/Plan/Tasks, harness/eval, scope, runtime fields, gates, rollback and split/HG-3/HG-4 needs | `controller.contract-review` comment only | executable v0, required by Dispatcher v0 |
| 0.6 | Contract Remediation Router | For non-PASS contract reviews, routes the fix to the owning C-Level seat first, HG-3 to CEO/Codex, HG-4 to Founder via Chief-of-Staff | `controller.remediation-routed` comment only | executable v0 |
| 0.65 | Runtime Executability Gate | Between `CONTRACT_PASS` and dispatcher lock/spawn: rejects formally passing contracts that are not actually runnable (unknown CapabilityProfile, free-text DependsOn, missing absolute report artifact, source/gate paths outside AllowedReadPaths, Claude internal tool-result reads). `CONTRACT_PASS` no longer implies dispatchability; the scheduler additionally requires `RUNTIME_READY_PASS`. | `controller.runtime-ready` comment only | executable, tests green |
| 1 | Dispatcher v0 | Validates contract, role label, contract-review PASS and dedupe, then writes `worker.lock` + `worker.context` | Plane comments only | proven |
| 2 | Capability Registry | Checks whether the runtime may use the declared role, tools, subagents, Honcho boundary, workspace and autonomy level | none | executable, tests green |
| 3 | Runtime Dispatcher v1.1 | Dry-runs hard preflights: auth, lock, budget, workspace, secrets, capability, dependencies, timeout, artifacts and boot context | none | running as dry-run |
| 3.5 | Runtime Inference Router | Chooses the minimum sufficient inference route: Sonnet for small reversible work, Opus 1M for shared-runtime or cross-repo work, HG-3 only with CEO critical evidence, HG-4 no autonomous spawn | none | executable v0, integrated into v1.2 |
| 4 | Runtime Dispatcher v1.2 | Starts one bounded headless worker via `--mode run`, constrained by runtime auth, `MaxRuntime`, `MaxSpend`, `KillSwitch` and capability profile | worker artifacts, reports, stream logs, metrics and Plane run comments | proven by [WORK_ITEM_ID] pilot |
| 5 | C-Level Worker | Claude/Codex/Gemini performs scoped work; Claude may spawn subagents only from `SubAgentRoster`; output ends in one `worker.reported` | declared files/artifacts and Plane report comments | headless Claude pilot proven |
| 6 | CAO | Separate audit pass validates lock, contract, report, gates, subagent block and capability proof; writes `controller.verdict` | CAO Plane comments | proven |
| 7 | Codex Controller | GPT-5.5 xhigh deputy CEO reads CAO verdict and emits `AUTO-GO`, `DELEGATE`, `SELF-FIX`, `ASK-FOUNDER`, `REJECT` or `PARK` as `controller.decision` | controller decision comments; later tiny SELF-FIXes under validator | live `AUTO-GO` proven |
| 7.5 | Post-Worker Quality Loop | Plans lower-worker audit, deep-audit, security-audit or bounded hotfix follow-up after CAO/controller signal. Controller still does not spawn; scheduler consumes explicit markers only. | dry-run report and future `controller.audit-followup` / `controller.hotfix-request` comments | router plus scheduler handoff tests green |
| 8 | CEO/Codex Done | Final acceptance, Done, merge, push or release only when the relevant gate allows it | Done/push/merge/release per HG-2.5 or HG-3; HG-4 requires Founder | partly running, not fully autonomous |
| 9 | Scheduler 24/7 | Polls Plane, selects due items, invokes dispatcher/controller loop and removes human copy-paste | only through dispatcher/controller surfaces | not active |

Operational label: **Stage 7/9 proven, Stage 8-9 gated**. Product release version
remains governed by `VERSION` and `docs/releases/versioning.md`; this stage is
the runtime buildout stage, not a SemVer replacement.

## Push Model

Scheduler loop (intent shape; concrete cron lives in
`docs/operations/hard-cron-wrapper.md`):

```text
1. Scheduler scans Plane queue:
     state ∈ {dispatch-ready}
     labels ⊇ {role:*}
     comments include unexpired worker.lock (dispatcher-v0)
     description hash matches lock hash
     Plane work item carries Dispatch: scheduled OR explicit AlwaysAllow
2. For each candidate, run Stage 0.5 Contract Controller
   (`docs/orchestration/contract-controller.md`). If the verdict is not
   `CONTRACT_PASS`, run Stage 0.6 Contract Remediation Router
   (`docs/orchestration/contract-remediation-router.md`), post
   `controller.remediation-routed`, and stop. The scheduler must not lock or
   spawn from weak contracts.
2.5. For every `CONTRACT_PASS` item with `Dispatch: ready` or `Dispatch: scheduled`
   and a runtime agent (`claude`, `codex`, `gemini`), run Stage 0.65 Runtime
   Executability Gate (`evaluateRuntimeExecutability` in
   `scripts/orchestration/contract-controller.mjs`). The scheduler must record
   `RUNTIME_READY_PASS` via a `controller.runtime-ready` comment before lock.
   A `RUNTIME_READY_REJECT` blocks the lock with decision
   `lock-blocked-runtime-not-ready`, regardless of the Stage 0.5 verdict. The
   same evaluator runs again inside the Runtime Dispatcher v1 dry-run preflight
   so a hand-launched run cannot bypass the scheduler gate.
3. For each contract-passing and runtime-ready item, run hard preflights (see
   below), including the executable Capability Registry profile. If any fails,
   emit BLOCKED_* and skip.
4. Acquire scheduler lane lock for {workspace, project_id, role, run_id}.
5. Run Stage 3.5 Runtime Inference Router
   (`docs/orchestration/runtime-inference-router.md`) unless the controller
   explicitly passes `--inference-route off`. The route selects model,
   max-turn fallback, context profile, split policy and controller gate policy.
6. Build the worker boot pack per
   `docs/orchestration/headless-worker-runtime-boot-contract.md`.
7. Spawn the named runtime (claude | codex | gemini) bounded by
     - MaxRuntime
     - MaxTurns
     - MaxCommits
     - MaxSpend
     - KillSwitch (Plane comment trigger or sentinel file)
     - Heartbeat (scheduler poll interval)
8. Worker writes artifacts to declared absolute paths only.
   Gemini is additionally constrained to report-only `audit|plan|review`,
   `RuntimePermissionMode: plan`, and worker report scope under
   `reports/audits/**`. For Gemini, dispatcher v1.2 maps declared
   `AllowedReadPaths` into CLI `--include-directories` arguments; if Gemini
   runs in `approval-mode plan`, the worker streams the report to stdout and
   the dispatcher materializes that stdout at `report_path`. Denied shell gates
   in Gemini plan mode are treated as external dispatcher/operator verification,
   not as a human blocker by themselves.
9. On exit, emit run summary to:
     - Plane comment (worker.run-summary)
     - reports/runs/YYYY-MM-DD/<run_id>.md
     - metrics/agent-events.jsonl
10. Hand off to CAO via `cao-pass.mjs`. CAO emits `controller.verdict`.
11. Optionally hand off to Codex Controller via
   `codex-controller-dryrun.mjs --mode post`. Codex emits
   `controller.decision`.
11.5. When the controller decision requires audit, deep-audit, security audit
   or bounded hotfix, run the dry-run Post-Worker Quality Loop router
   (`scripts/orchestration/post-worker-quality-loop-core.mjs`) against
   `registries/quality/post-worker-quality-loop.json`. The router may propose
   `controller.audit-followup` or `controller.hotfix-request`; it never spawns
   the lower worker itself. After the controller marker exists, run
   `scripts/orchestration/post-worker-quality-scheduler-core.mjs` to translate
   the marker into exactly one `dispatch: ready` lower-worker contract. The
   generated contract still re-enters the normal Stage 0.5/0.65/capability and
   HumanGate checks before any worker process may start.
11.6. In live Plane mode, use
   `scripts/orchestration/post-worker-quality-plane-handoff.mjs` to read the
   work item plus comments, then optionally post one
   `scheduler.lower-worker-candidate` comment. This comment is a queueable
   artifact only; it is not a lock, spawn, state transition or Done authority.
   Scheduler project polling may use `--scan-project --max-items <n>` and must
   keep `--mode dry-run` until the lane is explicitly released for bounded
   candidate-comment posting.
12. Release scheduler lane lock.
```

The scheduler only reads items that CEO/Codex has already made
`dispatch-ready`; it does not create that state by itself. v1 never sets
`Done` and never advances past CAO.

## Run States

Stable identifiers. The dispatcher and CAO emit exactly these.

| State | Meaning | Default next |
|---|---|---|
| `PASS` | Worker reported success, all gates green | CAO controller pass |
| `REJECT` | Scope violation, contract drift, gate red | back to `c-level:<role>:planning` |
| `BLOCKED_AUTH` | Runtime auth preflight failed | CEO surface; no auto-retry |
| `BLOCKED_BUDGET` | `MaxSpend` exceeded or budget unapproved | CEO surface; no auto-retry |
| `BLOCKED_DEPENDENCY` | A `DependsOn` item is not yet PASS or PARK | scheduler reschedules next pass |
| `TIMEOUT` | `MaxRuntime` or stalled heartbeat | CEO surface; partial artifacts archived |
| `RUNTIME_ERROR` | Runtime crash, non-deterministic failure, sentinel mismatch | CEO surface; raw stderr saved |
| `NEEDS_HUMAN` | Worker explicitly raised an HG-4 founder/human boundary or a declared HG-3.5 founder-proxy pause | Chief-of-Staff/Founder-Proxy for HG-3.5; Founder/human for HG-4 |

Auto-retry is **not** a state. Retries require a fresh worker.lock and a new
HG-2.5 release; the scheduler does not transparently rerun a failed run.

## Hard Preflights

Each preflight emits a stable BLOCKED_* code and aborts before spawn.

1. **Auth.** Each runtime needed by the work item must return its sentinel
   string per `docs/operations/runtime-auth-preflight.md`. Failure →
   `BLOCKED_AUTH`. Before any Plane App read/write lane, the scheduler must
   run `node scripts/plane/plane-app-token-rotation.mjs --mode ensure
   --refresh-window 2h --json`. A non-zero exit is `BLOCKED_AUTH`; the
   scheduler must not proceed with an expiring or expired app token.
2. **Lock.** A `worker.lock (dispatcher-v0)` comment must exist on the work
   item with `expires_at` in the future and a description hash matching the
   current item. Drift → `BLOCKED_DEPENDENCY` with reason
   `runtime.lock-drift`.
3. **Budget.** `MaxSpend` must be > 0 EUR or the run must appear in
   `AlwaysAllow` plus the cost-router approval log
   (`docs/operations/codex-cost-router.md`). Failure → `BLOCKED_BUDGET`.
4. **Workspace.** `Workspace` resolves through the registry; the worktree
   exists; git status passes the hygiene check from
   `docs/operations/git-worktree-hygiene-controller.md`. Failure →
   `BLOCKED_DEPENDENCY` with reason `runtime.workspace-unhealthy`.
5. **Secrets.** The work item description and contract block contain no
   secret patterns; the declared artifact paths are not under known secret
   roots. Failure → `BLOCKED_AUTH` with reason
   `runtime.secret-leak-suspected`.
6. **Browser auth.** Browser-/UI-bound work must declare `RuntimeBrowserAuth`.
   Allowed values are `none`, `forbidden`, `browser-connector` and
   `operator-shared-session`. `RuntimeAuth` or a Plane app-token is not a
   browser session. If a contract asks for `browser-connector` or
   `operator-shared-session` and no authenticated browser lane is exposed, the
   runtime stops before worker spawn with `BLOCKED_AUTH` and reason
   `runtime.browser-auth-unavailable`. Missing declarations on UI-bound work
   fail with `runtime.browser-auth-missing`.
   The live check order is:
   `COMPANY_OS_BROWSER_AUTH_PROBE_COMMAND` (JSON command, preferred),
   `COMPANY_OS_BROWSER_AUTH_PROOF_FILE` / default
   `~/.company-os/browser-auth-proof.json` (redacted proof file), then legacy
   `COMPANY_OS_BROWSER_AUTH_OK=1` as fallback. Proof artifacts must not contain
   cookies, tokens, passwords, authorization headers or session IDs.
7. **Capability profile.** Runtime work must declare `CapabilityProfile`
   and the profile must validate through
   `registries/capabilities/company-os.json` via
   `scripts/capabilities/capability-registry-core.mjs`. It must match
   `Agent`, `RoleLabel`, `Mode`, `Workspace`, `AutonomyLevel`,
   `SubAgentRoster`, and declared memory boundaries. Failure →
   `BLOCKED_DEPENDENCY` with one of:
   `capability.profile-missing`, `capability.profile-not-found`,
   `capability.stale`, `capability.undeclared-tool`,
   `capability.memory-boundary-violation`,
   `capability.autonomy-too-high`, or `capability.registry-invalid`.
8. **Dependencies.** Every `DependsOn` reference must resolve to a PASS or
   PARK state. Otherwise → `BLOCKED_DEPENDENCY`.
9. **Timeout.** `MaxRuntime`, `Heartbeat`, and `KillSwitch` must be declared
   on the work item. Missing → `BLOCKED_DEPENDENCY` with reason
   `runtime.timeout-policy-missing`. Claude Opus 4.7 Max audits must not be
   duplicated before `min_silent_seconds: 300`; normal silent audit windows are
   600-900 seconds when the process is alive. The scheduler treats silence
   before the declared hard timeout as a heartbeat/status problem, not as
   permission to spawn a second worker on the same Plane lock.
10. **Artifact paths.** The contract's `Reporting` and `OutcomeArtifacts`
   absolute paths must point at writable directories owned by the
   workspace. Otherwise → `BLOCKED_DEPENDENCY` with reason
   `runtime.artifact-path-invalid`.
11. **Boot context.** The scheduler must construct the required headless boot
   pack and the worker output must include `boot_context_proof`. Missing proof
   or missing source-of-truth reads aborts with `BLOCKED_DEPENDENCY` and reason
   `runtime.boot-context-incomplete`.
11. **Runtime executability (Stage 0.65).** Even when Stage 0.5 emits
   `CONTRACT_PASS`, the dispatcher reruns `evaluateRuntimeExecutability`. A
   `RUNTIME_READY_REJECT` aborts the dry-run with `BLOCKED_DEPENDENCY` and
   reason `runtime.executability-blocked`; the underlying
   `runtime-ready.*` reason codes
   (`capability-profile-unregistered`, `depends-on-unparseable`,
   `outcome-artifact-not-absolute`, `allowed-read-paths-missing-source`,
   `allowed-read-paths-missing-gate`, `claude-tool-result-read`) appear in
   the run summary so CEO/CAO can repair the contract without re-deriving the
   verdict.

Every BLOCKED_* result is logged in `metrics/agent-events.jsonl` and posted
to Plane as a short comment. The work item state does not change.

## Executable v1.2 Boundary

`scripts/orchestration/runtime-dispatcher-v1.mjs --mode run` is the first
bounded production path. It may:

- run exactly one local runtime command, defaulting to Claude Code,
- write one run report `.md`,
- write one durable `.stream.jsonl` beside the run report while the process is
  still running; Claude runs use `--output-format stream-json`, `--verbose`
  and `--include-partial-messages` so partial model events can be observed
  before final completion; Claude runs also pass a derived built-in `--tools`
  list from `allowed_claude_tools`, so dynamic discovery tools such as
  `ToolSearch` and undeclared subagents are not available inside bounded
  workers; Claude runs also default to `--strict-mcp-config` with an empty MCP
  config, so global/private MCP connector tools are not inherited unless a
  future CapabilityProfile explicitly wires a connector-scoped MCP config;
  Gemini runs use text output plus
  `--include-directories` for declared sibling-workspace read scopes,
- append `worker.reported` and `ledger.run_summarized` rows to
  `metrics/agent-events.jsonl`,
- append `worker.heartbeat` rows while the process is alive,
- post `worker.run-summary (dispatcher-v1)` and `worker.reported` comments,
- optionally call `scripts/orchestration/cao-pass.mjs` in `dry-run` or `post`
  mode,
- optionally call `scripts/orchestration/codex-controller-dryrun.mjs` in
  `dry-run` or `post` mode after CAO `--mode post` succeeds.

By default it also consumes Stage 3.5:

```bash
--inference-registry registries/inference/company-os.json
--inference-route auto
```

The inference route chooses the fallback runtime model and `MaxTurns` before
the worker spawn. Explicit `MaxTurns` in the Plane contract still wins because
it is part of the human-reviewed worker contract. Use `--inference-route off`
only for emergency compatibility or a controller-approved debug run.
For Claude Opus routes, Runtime Dispatcher uses the locally verified Claude
Code v2 alias `opus`; old marketing/version aliases are treated as stale until
a fresh sanity call proves otherwise.

It must not:

- set Plane Done,
- change Linear,
- merge, push, deploy, publish or write production systems,
- schedule follow-up work,
- auto-release HG-3 or mark Done after controller decision,
- bypass Capability Registry, budget, timeout, secret, dependency or artifact
  preflights.

Default `--permission-mode` is `plan`. Edit-capable Claude runs require an
explicit `--permission-mode acceptEdits` command on an HG-2.5 released
low-risk item. Implementing Claude workers should declare `MaxTurns: 120` in
the Plane contract; audit-only workers may stay at the CLI default of 30.
Runtime Dispatcher v1.2 reads `MaxTurns`/`Max_Turns` from the contract and
clamps values above 200.
Claude `RuntimePermissionMode: plan` is not report-artifact-capable: Claude
may write only its internal plan scratch file under `~/.claude/plans`, not the
declared repo report. Stage 0.65 rejects live Claude contracts that combine
`RuntimePermissionMode: plan` with an absolute `Reporting`/`OutcomeArtifacts`
path. Use `acceptEdits`, `default` or `auto` when the worker must materialize a
Markdown report in the workspace.

Non-Claude runtime adapters are not considered production-ready merely because
the contract says `Agent: codex` or `Agent: gemini`. Before live primary
dispatch, each adapter must satisfy the preconditions in
`docs/orchestration/multi-inference-c-level-runtime.md`: runtime args, stream
health, CAO compatibility, CapabilityProfile enforcement, cost category and
scope-guard behavior.

Live controls:

- `--heartbeat-ms` controls durable heartbeat cadence. Default: `60000`.
- `--scope-guard off|warn|kill` controls whether path drift only records or
  terminates the worker. Default: `kill`.
- `AllowedWritePaths` is the preferred machine-readable scope source. If it is
  missing, v1.2 derives path-like tokens from `Scope`. If no paths can be
  resolved, scope guard is advisory and cannot kill based on file drift.
- v1.2.4 treats git dirty diff as attribution-aware telemetry. Heartbeats and
  final reports split changed files into `worker_attributed_changed_files` and
  `external_changed_files`. `--scope-guard kill` may terminate only when a
  worker-attributed write drifts outside `AllowedWritePaths`; unrelated
  parallel edits in the same worktree are reported as external changes and do
  not kill the run by themselves.
- Worker attribution comes from streamed edit tool calls (`Write`, `Edit`,
  `MultiEdit`, `NotebookEdit`) plus dispatcher-owned artifacts. A streamed
  out-of-scope worker write still triggers immediate `scope-write-drift`.
- Runtime-owned artifacts are always scope-guard allowed even when not declared
  by the worker contract: the run report, the beside-it `.stream.jsonl`, and
  the configured metrics JSONL sink. These are dispatcher outputs, not worker
  drift. Runtime-owned artifacts do not turn an otherwise missing worker write
  scope into a kill-capable scope guard.
- Claude Code `plan` permission mode may write an internal plan artifact under
  `~/.claude/plans`. v1.2 treats that directory as runtime-owned for Claude
  plan-mode runs only; it does not expand product/workspace write scope.
- Effective `AllowedWritePaths` are also accepted by the read guard for the
  same run so a worker can list or inspect its own report/screenshot target
  directory. This does not authorize writes outside the declared write scope.
- Bash read-scope extraction ignores shell device redirects such as
  `/dev/null`, `/dev/stdout`, `/dev/stderr`, and `/dev/fd/*`; these are not
  workspace reads.
- On intervention (`scope-drift`, timeout, local kill, Plane kill), v1.2
  signals the spawned process group, not only the first CLI process. Headless
  Claude/worker child processes must not survive the dispatcher decision.
- v1.2.1 treats the worker's declared final state as authoritative for
  non-PASS outcomes. If worker stdout/stderr or Claude stream-json declares
  `NEEDS_HUMAN`, `BLOCKED_*` or `REJECT`, the run state is not upgraded to
  `PASS` just because the CLI process exits with code 0.
- v1.2.2 evaluates the durable stream log before accepting a worker PASS. A
  PASS run must have `worker.spawned`, at least one `stream` event, and
  `worker.exit` in the `.stream.jsonl` file with no malformed JSONL rows. If
  those invariants fail, a process-level PASS is downgraded to `NEEDS_HUMAN`
  with a `stream-health:*` state reason.
- v1.2.2 also surfaces `worker_declared_state`, `state_reason`,
  `heartbeat_count`, `stream_health`, `stream_event_count`, and
  `out_of_scope_change_count` in the short Plane `worker.run-summary` comment
  so CEO/CAO can triage from Plane without opening the long report first.
- Process args and runtime output are sanitized before stream/report surfaces.
  Prompt bodies and token-like connector/API values must never be written raw
  to `.stream.jsonl`, run reports or Plane comments.
- v1.2.3 compacts Claude stream-json by replacing non-empty `signature` and
  `thinking` JSON string fields with `[REDACTED_STREAM_SIGNATURE]` and
  `[REDACTED_STREAM_THINKING]` before durable stream/report writes. Timing,
  event type, tool-use shape and stream-health counts remain observable, but
  verbose model signature/scratchpad payloads do not persist raw.
- Plane kill switch polling looks for comments matching `KILL COMPA-<n>` or
  `KILL <work-item-id>`; local kill switch paths are extracted from
  `KillSwitch` entries such as `runtime/kill/<slug>`.

Fast-lane rule: for R1/R2 work as defined in
`docs/governance/fast-lane-flight-doctrine.md`, the runtime should prefer
launching a bounded live pilot with telemetry over repeatedly debating whether
reversible work may start. If it breaks, preserve artifacts, classify the
failure and launch the next small repair slice.

Full stage-7 pilot shape:

```bash
node scripts/orchestration/runtime-dispatcher-v1.mjs \
  --workspace companyos \
  --project-id <project-id> \
  --work-item-id <work-item-id> \
  --mode run \
  --permission-mode acceptEdits \
  --controller post \
  --codex-controller post \
  --json
```

That path reaches: v0 lock already present -> v1.2 runtime -> run report ->
metrics -> `worker.reported` -> CAO `controller.verdict` -> Codex
`controller.decision`. It still stops before Done, merge, push, deploy and
production writes.

## Reporting Contract

Every v1 run produces four artifacts. None of them are optional.

1. **Plane short comment.** Title: `worker.run-summary (dispatcher-v1)`.
   Body is a fenced YAML block, max ~30 lines:

   ```yaml
   worker.run-summary:
     version: dispatcher-v1
     dispatcher_run_id: <ulid>
     state: PASS | REJECT | BLOCKED_* | TIMEOUT | RUNTIME_ERROR | NEEDS_HUMAN
     started_at: <ISO-8601>
     ended_at: <ISO-8601>
     runtime: claude | codex | gemini
     mode: <contract.mode>
     workspace: <slug>
     work_item: COMPA-<n>
     report_path: <absolute path to .md>
     metrics_rows_appended: <count>
     blocked_actions_remaining:
       - merge
       - push
       - deploy
       - production-write
       - schema/RLS/auth
       - public-publish
       - linear-write-outside-bridge
       - plane-done-by-claude
   ```

   The Plane comment is operator-readable. It does not contain the full run
   transcript; that lives in the report `.md`.

2. **Run report `.md`.** Absolute path:
   `reports/runs/YYYY-MM-DD/<dispatcher_run_id>.md`. Required sections:

   - run header (state, timings, runtime, work item)
   - changed files (absolute paths)
   - commands run (verbatim, with exit codes)
   - gate results (one row per declared gate)
   - heartbeat / timeout summary
   - truncated stdout / stderr (secrets stripped)
   - rollback path if any
   - link back to the Plane work item

   Reports under `reports/private/` follow the existing private-evidence
   rules; never push these to public mirrors.

3. **Stream log `.jsonl`.** Absolute path beside the run report:
   `<report-base>.<dispatcher_run_id>.stream.jsonl`. It is written during the
   run and contains redacted stdout/stderr chunks, heartbeat snapshots,
   changed-file observations, and any runtime intervention.

4. **Metrics row.** `metrics/agent-events.jsonl`, schema per
   `docs/operations/agent-event-ledger.md`. One row per state transition,
   minimum:

   - `dispatcher.preflight-pass` / `dispatcher.preflight-fail`
   - `worker.spawned` / `worker.heartbeat` / `worker.exit`
   - `dispatcher.run-summary`
   - `controller.verdict` (after CAO handoff)

A v1 run without all four artifacts is invalid and is treated as a
`RUNTIME_ERROR` regardless of worker exit code.

## CAO Handoff

After every PASS or REJECT (not for BLOCKED_* / TIMEOUT / RUNTIME_ERROR), the
dispatcher invokes `scripts/orchestration/cao-pass.mjs` against the same
work item. The CAO seat:

1. Reads the work item, the v0 lock, the v1 run-summary comment, and the
   report `.md` named in the summary.
2. Re-runs the worker-issue-contract validator on the current description.
3. Verifies the description hash matches the lock hash (no mid-run mutation).
4. Emits `controller.verdict` with one of `PASS` / `REJECT` / `PARK`.

Outcomes:

- CAO `PASS` → state transitions to `ceo:review`. CEO/Codex decides Done.
- CAO `REJECT` → state transitions to `c-level:<role>:planning`. The
  rejected work item must spawn a fix worker before another v1 run.
- CAO `PARK` → state transitions to `parked` with rationale.

CAO never marks Done. The dispatcher never marks Done. Done is CEO/Codex.

## HG-2.5 / HG-3 / HG-4 Boundaries

v1 runs only when an HG-2.5 release card is on file for the work item or its
parent. The release card must satisfy
`docs/governance/ceo-release-authority.md`:

- `release_authority: CEO_AUTONOMOUS`
- `founder_prediction_confidence >= 0.92`
- CAO/controller verdict on prerequisites is `PASS`
- rollback path named and verified or trivial
- blast radius: `low`, `medium`, `staged`, `canary`, or `trivial`
- Artifact Truth and budget passes

The release card is itself a Plane comment with the canonical
`human_gate_release` JSON block.

The dispatcher must escalate to **HG-3 (CEO/Codex or accountable C-Level
critical authority)** and abort with `BLOCKED_DEPENDENCY` plus reason
`hg3-ceo-escalation` if the work item or worker behaviour requests:

- schema, RLS, auth, or service-role changes
- risky production data mutation that is still reversible/restorable
- material spend, subscriptions, pricing, or money movement
- legal, medical, financial, Rx, or other regulated claim work before public release
- high-risk outreach or publishing that can be rolled back, held or corrected

`NEEDS_HUMAN` is reserved for HG-4 founder/human boundaries and declared
HG-3.5 founder-proxy pauses. HG-3 is not a founder interruption.
- autonomy promotion to L4 or L5
- durable private-memory writes when private context is involved
- unresolved high-severity CAO finding

The dispatcher must escalate to **HG-4 (Founder)** if the CEO cannot make the
action reversible/restorable, or if the work item requests strategic direction,
company identity/taste, major legal/capital exposure, founder-voice public
commitment or non-restorable data loss.

These categories never fall under HG-2.5, even with the release card
present.

## Phase Plan

| Phase | Scope | Gate |
|---|---|---|
| v1.0 | this doctrine doc | committed in Company.OS |
| v1.1 | `scripts/orchestration/runtime-dispatcher-v1.mjs` scaffolding with `--mode dry-run` only (no spawn) | doctrine ratified by CEO |
| v1.2 | bounded `--mode run` for one project, one role, one runtime, with HG-2.5 release card per run | implemented; first live stage-7 pilot passed |
| v1.3 | scheduler integration via hard-cron-wrapper, after at least 5 v1.2 runs report PASS | green run-history + zero BLOCKED-without-cause |

Each phase is its own work item. v1 phases do not auto-promote.

## Out of Scope (still v0 only)

- worker spawn without an HG-2.5 release card on the work item
- writing to Linear from v1
- live webhook receivers
- multi-tenant runs (one client at a time until v1.3 stabilises)
- any state transition that lands on Plane `Done`

## Implementation Hooks

Already exist:

- `scripts/runtime/warm-preflight.mjs` — runtime auth check
- `scripts/runtime/hard-cron-wrapper.mjs` — lane lock + scheduled launch
- `scripts/orchestration/cao-pass.mjs` — CAO seat (Phase 1 CTO)
- `scripts/orchestration/plane-dispatcher-v0.mjs` — v0 lock source
- `scripts/orchestration/runtime-dispatcher-v1.mjs` — v1.1 dry-run plus
  v1.2 bounded single-runtime run mode
- `scripts/orchestration/runtime-dispatcher-v12-core.mjs` — v1.2 run-mode
  command, report, metrics and Plane-comment helpers
- `scripts/orchestration/runtime-dispatcher-v1.test.mjs` — v1.1 preflight tests
- `scripts/orchestration/runtime-dispatcher-v12-core.test.mjs` — v1.2 run
  helper tests
- `scripts/orchestration/worker-ledger-validator.mjs` — contract validator
- `scripts/orchestration/codex-controller-dryrun.mjs` — Codex Controller
  dry-run and bounded `--mode post` decision comments
- `scripts/release-gates/human-gate-release-core.mjs` — HG-2.5 validator
- `scripts/agent-events/agent-event-core.mjs` — ledger writer
- `metrics/agent-events.jsonl` — event sink
- `metrics/agent-runs.jsonl` — backward-compatible run summary

Still to build:

- scheduler integration for automatic due-item polling
- controller metrics-row writer for `controller.decision`
- optional `human_gate.released` post mode after the release-card validator
  passes
- repeated live pilots before v1.3 becomes the default path

## Mapping to Existing Canon

| Concept | Source | This doc adds |
|---|---|---|
| Worker contract | `docs/templates/worker-issue-contract.md` | v1 push-run requirements + run states |
| Dispatcher v0 (pull) | `docs/orchestration/plane-worker-dispatcher-v0.md` | the contrast and the v0 → v1 hand-up |
| CAO seat | `docs/agents/cao.md` | the v1 run-summary input the CAO must read |
| CEO release authority | `docs/governance/ceo-release-authority.md` | v1 spawn requires HG-2.5 |
| Runtime auth | `docs/operations/runtime-auth-preflight.md` | preflight 1 |
| Hard cron wrapper | `docs/operations/hard-cron-wrapper.md` | scheduler integration in v1.3 |
| Agent event ledger | `docs/operations/agent-event-ledger.md` | reporting contract artifact 3 |

## Hygiene

- v1 changes always ship with both an updated reject-state matrix and a
  fresh dry-run pilot before live runs return.
- The set of stable run states is closed; new states are added by extending
  this doc, not by ad-hoc emissions.
- Source-company-specific runtime details ([SOURCE_COMPANY]/Fyn) belong in private
  operating docs. This doctrine remains generic and reusable.
