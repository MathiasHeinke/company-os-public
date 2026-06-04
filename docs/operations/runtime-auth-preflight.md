# Runtime Auth Preflight

Status: required for active automations

## Purpose

Active automations must not fail at worker dispatch because a required local
runtime is logged out. If Claude, Codex, Gemini, Upload-Post or another runtime
is part of the approved automation scope, its authentication is a standing
operational dependency, not an ad hoc human decision.

## Rule

For every active automation, required local runtimes must be authenticated before
the scheduled window starts.

This is mandatory for:

- Claude Code audit/eval workers
- Codex local scheduled controllers
- OpenRouter workers through Codex Cost Router
- Gemini workers when enabled
- Linear execution-ledger reads/comments from scheduled jobs
- Upload-Post scheduling helpers when live scheduling is approved
- any connector or CLI named in the automation's source-of-truth docs

## Path Placeholders

The command snippets below use the portable placeholders from
`docs/operations/portable-path-placeholders.md`:
`${COMPANY_OS_ROOT}`, `${SITE_PROJECT_ROOT}`, `${CLAUDE_BIN}`,
`${GEMINI_BIN}`. Set them in your shell or substitute by hand before pasting.

## Non-Interactive Runtime Runner

Scheduled jobs should invoke runtime-sensitive CLIs through the automation
runtime runner when they need Claude or Linear credentials:

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/automation-runtime-runner.mjs \
  auth-preflight --json --soft
```

The runner does not perform an interactive `/login`. It loads already-approved
durable credentials from environment variables or macOS Keychain and injects
them into the child process environment:

- Claude: either `ANTHROPIC_API_KEY` from the sanctioned Company.OS Anthropic
  Keychain entries, or `CLAUDE_CODE_OAUTH_TOKEN` from
  `com.company-os.claude-code-oauth-token` / `mathiasheinke`.
- Linear: OAuth client credentials or API key from the headless Linear
  Keychain aliases used by `scripts/linear/headless-linear.mjs`.

Use the runner for direct scheduled calls:

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/automation-runtime-runner.mjs \
  claude -- -p "Return exactly: CLAUDE_AUTH_OK" \
  --model 'opus' \
  --permission-mode plan \
  --output-format text \
  --max-turns 1 \
  --mcp-config '{"mcpServers":{}}' \
  --strict-mcp-config \
  --no-session-persistence
```

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/automation-runtime-runner.mjs \
  linear -- auth-preflight --json --soft
```

Runner output must never print token values. It may report only credential
source names, actor names, status, blockers and `connectorUsed: false`.

### Claude API-Key Fallback

Claude Code subscription OAuth is the preferred low-cost path when the selected
Claude organization allows Claude Code. If the organization blocks subscription
access and Claude returns:

```text
Your organization has disabled Claude subscription access for Claude Code · Use an Anthropic API key instead, or ask your admin to enable access
```

do not paste a key into Plane, chat, reports or `.env` files. Store a dedicated
Anthropic API key in macOS Keychain and let the runtime runner inject it only
into child processes:

```bash
security add-generic-password \
  -U \
  -s "Company.OS Anthropic" \
  -a "ANTHROPIC_API_KEY" \
  -w "$ANTHROPIC_API_KEY"
```

Then verify without printing the key:

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/automation-runtime-runner.mjs \
  auth-preflight --json --soft
```

When both a sanctioned API key and an OAuth token are present, the automation
runtime injects `ANTHROPIC_API_KEY` because Claude Code gives API-key auth
precedence over subscription OAuth. This fallback may bill the Anthropic API
account; contracts still need `MaxSpend`, `RuntimeAuth`, `KillSwitch` and the
normal controller gates. The sentinel classifies this failure as
`oauth_org_not_allowed` so Scheduler, CAO and Controller reports can route the
remediation without scraping human prose from Claude stdout.

## Warm Preflight

Use the executable warm preflight before the night-shift window and whenever a
controller pass is about to consume a worker slot:

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/warm-preflight.mjs \
  --company-root ${COMPANY_OS_ROOT} \
  --[SOURCE_WORKSPACE]-root ${SITE_PROJECT_ROOT} \
  --date latest \
  --soft
```

The warm preflight is read/report only. It checks:

- Claude shell sentinel.
- Claude durable Keychain-backed sentinel via
  `com.company-os.claude-code-oauth-token`.
- Linear headless auth through the local helper, never the UI connector.
- GitNexus freshness for Company.OS.
- Upload-Post live env gate.
- active/stale runtime lane locks.
- lane-scoped warm-stage Artifact Truth. The standalone `runtime-preflight`
  lane and [SOURCE_COMPANY] marketing/editorial/product/upload-post lanes verify latest
  [SOURCE_COMPANY] editorial and product runs (`manifest,source,provenance,freshness`) with
  today's Europe/Berlin date and a default 36-hour max manifest age. Pure
  Company.OS / Plane / controller lanes record Artifact Truth as skipped unless
  explicitly forced with `--artifact-truth-required`. Full final/image/eval/
  scheduler Artifact Truth stays on the downstream quality, eval and
  Upload-Post gates.
- lane-scoped Browser Auth proof freshness. UI-bound lanes such as
  `plane-ui-worker`, `browser-*`, `chrome-*` or `runtimebrowserauth-*` require
  a fresh redacted browser-auth proof by default. Non-UI lanes record this as a
  skipped check unless explicitly forced with `--browser-auth-proof-required`.

It writes Markdown/JSON reports under
`reports/runtime-auth/YYYY-MM-DD/HHMM-warm-preflight.*`, appends a local
`metrics/agent-runs.jsonl` row, and emits runtime-preflight lock events. Use
`--soft` in scheduled jobs so the job records blockers instead of asking for UI
approval. Without `--soft`, blockers exit non-zero.

Force Browser Auth proof freshness before a UI-bound run:

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/warm-preflight.mjs \
  --company-root ${COMPANY_OS_ROOT} \
  --lane plane-ui-worker \
  --browser-auth-proof-required \
  --browser-auth-proof-file ~/.company-os/browser-auth-proof.json \
  --soft
```

The check uses the same redacted `browser-auth-proof/v0` validator as Runtime
Dispatcher. Missing, expired, kind-mismatched or secret-like proof files block
the warm preflight before any UI worker is spawned.

## Hard Cron Wrapper

Scheduled jobs that execute child commands should use the hard cron wrapper
instead of relying on prompt text alone:

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/hard-cron-wrapper.mjs \
  --company-root ${COMPANY_OS_ROOT} \
  --workspace-path ${COMPANY_OS_ROOT} \
  --lane company-controller \
  --run-id RUN_ID \
  --issue [WORK_ITEM_ID] \
  --dedupe-key company-os-night-shift-controller \
  --cost-models grok,deepseek \
  --timeout-ms 1800000 \
  -- node scripts/model-router/codex-cost-router.mjs --mode issue-triage --models grok --prompt-file sanitized.md
```

The wrapper blocks before running the child command when lane lock, warm
preflight, same-day dedupe, budget, lane-scoped Artifact Truth freshness or
exit-code gates fail. Details live in `docs/operations/hard-cron-wrapper.md`.

Expected healthy result:

```text
Status: `pass`
Blockers: `0`
```

`LINEAR_HEADLESS_AUTH_MISSING` remains a real blocker for Linear queue/comment
work. The controller may continue local report-only lanes, but it must not fall
back to approval-gated Linear connectors.

## Runtime Dispatcher Sentinel Gate

`runtime-dispatcher-v1.mjs --mode run` performs the Claude sentinel in `auto`
mode before spawning a Claude worker. A declared `RuntimeAuth` field or a
positive `claude auth status` is not sufficient; the selected runtime must be
able to return exactly `CLAUDE_AUTH_OK` through the same automation environment
used by scheduled workers.

When the sentinel fails, the dispatcher stops at preflight with
`BLOCKED_AUTH` / `runtime.auth-sentinel-failed` and does not spawn Claude. This
catches cases where durable OAuth credentials exist in Keychain but the
organization no longer permits Claude Code subscription access. Dry-runs keep
the historical no-worker-spawn behavior unless explicitly invoked with
`--auth-sentinel require`.

## Browser Auth Proof Gate

Browser/UI workers have a separate auth lane from Plane API/app-token access.
If a Worker Contract declares `RuntimeBrowserAuth: browser-connector` or
`RuntimeBrowserAuth: operator-shared-session`, Runtime Dispatcher v1 checks a
redacted browser-auth proof before worker spawn.

Preferred probe command:

```bash
COMPANY_OS_BROWSER_AUTH_PROBE_COMMAND='["node","scripts/runtime/browser-auth-probe.mjs"]' \
node ${COMPANY_OS_ROOT}/scripts/orchestration/runtime-dispatcher-v1.mjs ...
```

Plane UI / Chrome CDP connector:

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/browser-auth-plane-ui-probe.mjs \
  --cdp-url http://127.0.0.1:9222 \
  --target-url https://app.plane.so/companyos/ \
  --marker CompanyOS \
  --marker COMPA \
  --proof-file ~/.company-os/browser-auth-proof.json \
  --json
```

Managed Plane UI Chrome profile:

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/browser-auth-managed-chrome-profile.mjs \
  --mode launch \
  --target-url https://app.plane.so/companyos/ \
  --json
```

This starts a dedicated Chrome user-data-dir under
`~/.company-os/browser-profiles/plane-ui` with a localhost-only DevTools lane
(`http://127.0.0.1:9222`). The operator logs into Plane in that isolated
profile once. After that, the Plane UI probe can create a short-lived redacted
proof from visible UI markers without extracting browser credentials, request
headers or storage snapshots.

Dry-run the exact launch/probe wiring without opening Chrome:

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/browser-auth-managed-chrome-profile.mjs \
  --mode plan \
  --json
```

The JSON output includes a `dispatcher_env.COMPANY_OS_BROWSER_AUTH_PROBE_COMMAND`
value. Use that value for UI-bound worker contracts that declare
`RuntimeBrowserAuth: browser-connector`.

Launch mode checks the local Chrome DevTools Protocol endpoint before opening
Chrome. If the configured CDP port already responds on `/json/version`, the
launcher stops with `cdp-port-already-listening` instead of attaching a new
managed profile to a possibly foreign browser process. The check is localhost
only and never reads browser storage, request headers or credentials.

For lifecycle handoff, generate a cleanup plan from the managed launch
manifest:

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/browser-auth-managed-chrome-profile.mjs \
  --mode cleanup-plan \
  --json
```

The cleanup plan is explicit and non-executing: it lists the managed PID signal
and manifest cleanup action, while preserving the user-data-dir. It is intended
for controller/operator review before any future automated lifecycle executor.

To let the Runtime Dispatcher call that connector directly:

```bash
COMPANY_OS_BROWSER_AUTH_PROBE_COMMAND='["node","scripts/runtime/browser-auth-plane-ui-probe.mjs","--cdp-url","http://127.0.0.1:9222","--target-url","https://app.plane.so/companyos/","--marker","CompanyOS","--marker","COMPA"]' \
node ${COMPANY_OS_ROOT}/scripts/orchestration/runtime-dispatcher-v1.mjs ...
```

The Plane UI connector attaches only to an already-approved local Chrome DevTools
Protocol lane. It evaluates URL, title and DOM marker booleans in the browser.
It does not read cookies, localStorage, sessionStorage, request headers or
tokens. If no matching Plane tab exists, use `--open-target` to open the target
URL in the CDP browser profile.

If the probe returns `plane-ui-login-markers-present`, the managed profile is
alive but not authenticated for Plane. The correct operator action is to log in
inside the isolated managed Chrome profile, then rerun the probe. Do not paste
Plane tokens into the worker prompt, do not point the probe at a normal daily
Chrome profile, and do not start the `plane-ui-worker` lane from a failed proof.

If the browser is on `https://app.plane.so/?next_path=...`, the probe still
attaches to that redirect target so the failure remains an explicit
login-required verdict instead of a misleading `target-not-found` result.

Proof-file fallback:

```bash
node ${COMPANY_OS_ROOT}/scripts/runtime/browser-auth-probe.mjs \
  --declared browser-connector \
  --proof-file ~/.company-os/browser-auth-proof.json \
  --json
```

The proof JSON is a redacted health artifact only:

```json
{
  "ok": true,
  "kind": "browser-connector",
  "subject": "Plane UI",
  "checked_at": "2026-05-19T10:00:00.000Z",
  "expires_at": "2026-05-19T10:10:00.000Z",
  "evidence": "connector-health-check"
}
```

Never store cookies, tokens, passwords, authorization headers or session IDs in
the proof file. The dispatcher rejects secret-like proof keys before spawn.

## Claude Audit Timing

The auth sentinel is intentionally short: it only proves the scheduled runtime
can call Claude and receive exactly `CLAUDE_AUTH_OK`.

Do not apply that short sentinel timing to real Claude Opus 4.7 Max / 1M audit
workers. For read-only audits, the controller must not declare the worker stuck,
retry, or start a duplicate before 300 seconds have elapsed. For deep or
cross-repo audits, 600+ seconds before useful output is normal. Use heartbeat or
status comments during that window; use 900 seconds as the normal audit timeout
and 1800 seconds for deep/cross-repo audits unless the worker contract is
explicitly narrower.

## Claude Code Sentinel

Use this non-mutating sentinel before any automation window that may launch a
Claude worker. Use the absolute local binary in automation contexts so PATH
differences between Codex, launchd, shells and Claude Code do not create false
auth failures:

```bash
${CLAUDE_BIN} -p "Return exactly: CLAUDE_AUTH_OK" \
  --model 'opus' \
  --permission-mode plan \
  --output-format text \
  --max-turns 1
```

Expected output:

```text
CLAUDE_AUTH_OK
```

If the sentinel fails with `Not logged in`, stale credentials, network/auth
errors or any non-zero exit, the automation must treat the runtime as unhealthy.
The controller should not consume the due worker slot on a doomed worker
attempt. It should record a runtime-auth blocker and retry only after auth is
restored.

## Controller Behavior

Before dispatching a Claude worker:

1. Run the Claude auth sentinel.
2. If it returns `CLAUDE_AUTH_OK`, continue with the due worker.
3. If it fails, write a runtime-auth blocker report and comment.
4. Do not mark the worker as attempted for product-quality purposes.
5. Do not advance to the next worker lane unless the founder/Codex explicitly skips
   the blocked lane.

## OpenRouter Worker Sentinel

Before dispatching Grok or DeepSeek through the Codex Cost Router, verify that
`OPENROUTER_API_KEY` exists without printing it and run a tiny redacted smoke if
the lane has not been verified recently:

```bash
node ${COMPANY_OS_ROOT}/scripts/model-router/codex-cost-router.mjs \
  --mode issue-triage \
  --models grok \
  --workspace ${COMPANY_OS_ROOT} \
  --prompt "Public runtime auth sentinel: return exactly OPENROUTER_WORKER_OK"
```

Expected report content:

```text
OPENROUTER_WORKER_OK
```

If the smoke fails because the key is missing, the model is unavailable or the
provider returns auth/rate-limit errors, the controller records a runtime-auth
blocker and does not consume the target worker lane.

## Gemini CLI Sentinel

Before dispatching a Gemini worker, run a headless sanity check. Use the
absolute local binary in automation contexts:

```bash
${GEMINI_BIN} --skip-trust -p "Return exactly: GEMINI_AUTH_OK" \
  -m gemini-3.1-pro-preview \
  --approval-mode plan \
  --output-format text
```

Expected output:

```text
GEMINI_AUTH_OK
```

If the sentinel fails with auth, billing, project, model availability, network
or non-zero exit errors, the automation must treat Gemini as unavailable. The
controller may continue with other approved workers, but must not claim the
Gemini arm ran.

## Setup Requirement

Local runtime setup must keep required CLIs logged in persistently. Repeated
auth loss is a control-plane defect and should create a concrete follow-up until
the machine can run scheduled automation windows unattended.

Claude Code v2 should be moved from fragile interactive OAuth-only runtime to a
long-lived automation token where possible:

```bash
${CLAUDE_BIN} setup-token
```

This command may require an interactive subscription-backed setup step. If it
cannot run unattended, the controller must report the auth contract as
`CURRENTLY_AUTHENTICATED_NOT_DURABLE` instead of treating one green sentinel as
night-shift-ready.

## Runtime Budget

Claude Opus audit/plan workers are long-context jobs. The controller must not
classify an in-scope Claude audit as stuck, failed or timed out before at least
300 wall-clock seconds have elapsed. For Opus 4.7 Max / 1M deep audits, 600+
seconds before useful output is normal.

Recommended budgets:

- auth sentinel: 60 seconds
- normal audit/plan worker: 900 seconds
- deep audit or cross-repo plan worker: 1800 seconds
- heartbeat/status update while running: every 60-120 seconds

If a worker reaches the budget, preserve stdout/stderr, report the elapsed time,
and write an explicit timeout blocker instead of advancing silently.

## Linear Headless Sentinel

Scheduled Company.OS jobs must not call the Codex Desktop Linear connector,
Linear app connector, or Linear MCP UI path. Those paths can trigger a per-run
approval prompt and therefore are not valid for unattended cron automation.

Use the local headless helper instead:

```bash
node ${COMPANY_OS_ROOT}/scripts/linear/headless-linear.mjs \
  auth-preflight --json --soft
```

Expected healthy result:

```json
{
  "protocol": "linear-headless/v1",
  "ok": true,
  "status": "pass",
  "connectorUsed": false
}
```

If the helper returns `LINEAR_HEADLESS_AUTH_MISSING`, the automation must write a
runtime-auth blocker report and continue in local report-only mode. It must not
ask the founder for a UI approval and must not fall back to the Linear connector.

Accepted credential sources, in order:

- `LINEAR_API_KEY`
- `LINEAR_OAUTH_ACCESS_TOKEN`
- `LINEAR_OAUTH_CLIENT_ID` plus `LINEAR_OAUTH_CLIENT_SECRET`
- explicit secret files passed to the helper
- matching macOS Keychain entries

## HumanGate Boundary

Auth failure is not a permission decision about the work. It is a broken runtime
precondition. Human approval is still required for production/public/spend/Rx or
edit-mode boundaries, but not for routine re-auth verification.
