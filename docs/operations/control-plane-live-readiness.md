# Control Plane Live Readiness

## Purpose

This document gates Company.OS and related active workspaces before live Linear
agent dispatch.

## Company.OS Registry Decision

Status: `manual-live-pilot-passed`

Decision: Company.OS is allowed for Codex-orchestrated, read-only manual worker
pilots. It is not yet approved for unattended scheduler dispatch.

Reason: the live Linear comment path is proven, but the first 12-hour Claude
Code bughunt still needs an explicit parent launch issue, target worker issues,
and founder or Codex approval.

## 2026-05-07 Cron Approval Hotfix

The scheduled Company.OS controller must not use the Codex Desktop Linear
connector, Linear app connector, or Linear MCP UI path. A cron run that asks
the founder for a per-run Linear approval is not autonomous.

Current rule:

```bash
node ${COMPANY_OS_ROOT}/scripts/linear/headless-linear.mjs \
  auth-preflight --json --soft
```

If this returns `LINEAR_HEADLESS_AUTH_MISSING`, the controller writes a local
runtime-auth blocker and continues report-only. It must not request a UI
approval, and it must not start a Linear-dependent worker slot as if the
execution ledger were available.

Important drift note: the earlier [client website] control-plane runner exists on
branch `codex/agent-control-plane-dispatcher`, but it is not present in the
currently checked out [client website] branch. Company.OS cron therefore treats the
Company.OS headless helper as its own runtime dependency instead of assuming
`[client-website]/scripts/agent-control-plane/` exists on disk.

## Required Proof Before First 12-Hour Claude Bughunt

- STALE: `[client-website]/scripts/agent-control-plane/` existed on branch
  `codex/agent-control-plane-dispatcher`, but is not present in the currently
  checked out [client website] branch. Nightly cron must use the Company.OS
  headless Linear helper until the runner is deliberately re-integrated.
- PASS: local runner `LOCAL-PILOT-2` executed one read-only Claude worker with
  auth sentinel `CLAUDE_AUTH_OK`, exit `0`, status `ready-for-review`, and no
  Linear Done transition.
- PASS: sandbox implementation lane is now policy-gated in the runner:
  `Mode: implement` requires `--sandbox --allow-edits`, creates a dedicated
  Git worktree/branch, and returns `needs-audit` instead of `Done` or direct
  human-ready status.
- PASS: `docs/governance/directives.md` exists.
- PASS: `docs/templates/worker-issue-contract.md` exists.
- PASS: `reports/agent-runs/2026-05-06-controller-review-of-audit.md` exists.
- PASS: `metrics/agent-runs.jsonl` has bootstrap rows.
- PASS: target issue is harmless and read-only.
- PASS: remote lock comment is posted on `[PLANE_ITEM_ID]`.
- PASS: heartbeat comment is posted on `[PLANE_ITEM_ID]`.
- PASS: report path is written.
- PASS: outcome comment is posted.
- PASS: no persistent memory write by worker.
- PASS: no direct `Done` transition.
- PASS: no spend.
- BLOCKED: parent launch issue not approved.
- BLOCKED: worker issue set for the first bughunt has not been created.
- PASS: remote `--linear-live --max-runs 1` pilot is proven on `[PLANE_ITEM_ID]` using
  Linear OAuth client credentials and the Control Plane Runner app actor.
- PASS: Supabase Edge Function secrets and `vault.decrypted_secrets` were
  checked; no Linear key existed there. OAuth client credentials are stored
  locally in the macOS Keychain for the runner pilot. A `Company.OS` member API
  key is also stored locally in Keychain as fallback and passed a GraphQL sanity
  check; no Linear secret is stored in the repository.
- BLOCKED: first sandbox implementation pilot has not been run from a clean
  source workspace and audited by the controller.
- BLOCKED: unattended scheduler dispatch has not been proven.

## Execution Ledger Evidence

Parent issue: `[PLANE_PARENT_ITEM_ID]`

Lock comment: `[lock-comment-id]`

Heartbeat comment: `[heartbeat-comment-id]`

Outcome comment: `[outcome-comment-id]`

Report: `reports/agent-runs/[YYYY-MM-DD]-heartbeat-kill-path-pilot.md`

Ledger: `metrics/agent-runs.jsonl`

## [Client Website] Runner Evidence

Runtime:

```text
${CLIENT_WEBSITE_ROOT}/scripts/agent-control-plane/
```

Local pilot: `LOCAL-PILOT-2`

Runner output:

```text
${CLIENT_WEBSITE_ROOT}/tmp/agent-runs/run-pilot-execute.json
```

Worker report:

```text
${CLIENT_WEBSITE_ROOT}/tmp/agent-runs/LOCAL-PILOT-2/[TIMESTAMP]/claude-audit.md
```

Nightly report smoke:

```text
${CLIENT_WEBSITE_ROOT}/tmp/agent-runs/nightly-pilot.md
```

## State Mapping

| Logical State | Linear Handling For Pilot |
|---|---|
| ai-ready | represented by issue readiness comments |
| ai-running | represented by live lock comment |
| ai-blocked | not triggered |
| needs-human | represented by outcome verdict |
| needs-audit | triggered by successful sandbox implementation before controller audit |
| ready-for-review | represented by outcome verdict |

Native Linear state transitions were intentionally skipped. The pilot tested
comment-based lock/heartbeat/outcome behavior only.

## First Launch Constraint

The first Claude bughunt launch must stay:

- audit-only
- one worker at a time
- no edits
- no direct Linear writes by Claude
- no memory writes by Claude
- max runtime per worker: 60 minutes
- max commits per worker: 0
- max spend: EUR 0 beyond existing subscriptions
- reports written to private/ignored paths unless explicitly approved

## Sandbox Implementation Constraint

Implementation is allowed only after a successful read-only audit/plan and a
controller decision that the task is suitable for sandbox execution.

Allowed shape:

- `Mode: implement`
- code-capable workspace from the registry
- `--sandbox --allow-edits`
- clean source workspace unless explicitly overridden for a pilot
- branch format
  `codex/sandbox/<workspace>/<YYYY-MM-DD>-<issue>-<worker>-<role-owner>-<task-slug>-<hhmmss>`
- worktree root `${SANDBOX_ROOT}/`
- outcome `needs-audit`

Still forbidden:

- direct edits in the source workspace
- merge, push, deploy, publish, production writes
- direct Memory/Honcho writes by worker
- direct Linear `Done`

Controller must audit the sandbox branch before founder/Codex morning review.

## Kill-Path Note

The production stop phrase was not written into Linear history during the pilot.
The stop path was manually simulated in the report to avoid a future scheduler
reading an old test token and stopping a later run.

## Current Verdict

```text
READY-FOR-HUMAN-LAUNCH-DECISION
```
