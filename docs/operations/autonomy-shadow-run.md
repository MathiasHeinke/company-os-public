# Autonomy Shadow Run

Status: executable v0.1
Use for: simulating the next autonomy step before allowing a real sandbox run

## Purpose

Autonomy Shadow Run answers one question without changing state:

```text
If the controller were allowed to proceed, what would it do next?
```

It reads a worker contract, reuses the Sandbox PR Autopilot readiness gate, and
prints a decision model. By default it writes nothing and starts nothing.

## Local CLI

```bash
node scripts/sandbox-pr/simulate-autonomy-shadow-run.mjs \
  --contract /absolute/path/to/worker-contract.md \
  --workspace-root /absolute/path/to/target-workspace \
  --json
```

Default behavior is shadow-only:

- no worktree creation
- no event append
- no Linear write
- no memory write
- no worker execution
- no merge, push or deploy

If the controller explicitly needs an artifact, it may write a report:

```bash
node scripts/sandbox-pr/simulate-autonomy-shadow-run.mjs \
  --contract /absolute/path/to/worker-contract.md \
  --workspace-root /absolute/path/to/target-workspace \
  --write-report /absolute/path/to/reports/sandbox-pr/YYYY-MM-DD/<issue>-autonomy-shadow-run.md
```

Writing the report is an observation artifact only. It still does not authorize
worktree creation, worker execution, event append, Linear writes, memory writes
or integration.

## Output Contract

The JSON/markdown output includes:

```text
shadow_only
side_effects_allowed
would_dispatch
selected_issue
would_create_branch
would_create_worktree
would_start_worker
would_run_commands
would_append_events
blocked_actions_respected
controller_verdict_if_finished
what_mathias_would_reject
would_fail_because
next_safe_real_action
confidence
```

## Controller Rule

Run a shadow pass before the first real L3 sandbox pilot of the night or before
raising a lane from audit/report to implement.

Promotion rule:

1. Shadow run predicts `would_dispatch: true`.
2. `blocked_actions_respected: true`.
3. `would_fail_because` is empty.
4. `what_mathias_would_reject` does not expose an unhandled HG-3 risk.
5. The next safe action is reviewed by CEO/controller.

Only then may the controller run the packet-only readiness gate. `--create-
worktree` remains a later explicit step.

## Gates

- `node --test scripts/sandbox-pr/autonomy-shadow-run-core.test.mjs`
- `node --check scripts/sandbox-pr/autonomy-shadow-run-core.mjs`
- `node --check scripts/sandbox-pr/simulate-autonomy-shadow-run.mjs`
- `git diff --check`
