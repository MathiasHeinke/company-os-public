# Fast-Lane Flight Doctrine

Status: canonical governance doctrine
Use for: deciding when Company.OS should run reversible work aggressively
instead of re-litigating autonomy scope in every session
Last updated: 2026-05-10

## Purpose

Company.OS optimizes for speed with telemetry, not permission theater.

For reversible work, the default is: **fly the small rocket, collect the
failure mode, fix the system, launch again.** Do not block low-risk work behind
repeated philosophical approval loops after the same guardrails have already
been accepted.

## Flight Rings

| Ring | Name | Default Policy |
|---:|---|---|
| R0 | Read-only audit | Run automatically when budget and auth are green. |
| R1 | Reversible docs/contracts/reports | Run fast through Plane + dispatcher; CAO checks output. |
| R2 | Low-risk code/tools/tests | Run with HG-2.5, stream/heartbeat, scope guard and rollback. |
| R3 | Integration/release | CEO/Codex may push, mark Done or release only after CAO PASS and controller decision. |
| R4 | Production/regulated | Founder gate. No autonomous release. |

## Always Fly

R1/R2 work should proceed without a new debate when all of these are true:

- the work item is in Plane and has a parseable worker contract;
- `RoleLabel`, `CapabilityProfile`, `Workspace`, `MaxRuntime`, `MaxTurns`,
  `Heartbeat`, `KillSwitch`, `Reporting` and `AllowedWritePaths` are declared
  or machine-derived;
- Runtime Dispatcher v1.2 can stream output to `.stream.jsonl`;
- heartbeat telemetry is active;
- scope guard is `kill` unless the item is explicitly audit-only;
- CAO PASS and Codex Controller decision are part of the loop;
- rollback is trivial: revert commit, restore file, delete generated artifact,
  or mark the run rejected.

Examples:

- Markdown/HTML parser hardening
- worker-contract validation
- report generators
- PageIndex and system-index hygiene
- non-production scripts and tests
- Plane comment/report formatting
- documentation and kit-template cleanup

## Stop Or Escalate

Escalate to R4 / Founder Gate for:

- schema, RLS, auth, service-role or secrets work;
- production database writes, deletion or mass mutation;
- payments, pricing, material spend or subscriptions;
- legal, medical, financial, Rx or regulated public claims;
- live outreach in the founder's name;
- autonomy promotion to L4/L5;
- deploy, public publish or irreversible customer-visible changes;
- unresolved high-severity CAO or controller finding.

## Crash Protocol

If an R1/R2 run fails:

1. Do not silently retry.
2. Preserve stream log, run report, metrics rows and Plane comments.
3. Classify the failure: contract, auth, budget, scope drift, test failure,
   runtime error, timeout or controller reject.
4. Fix the smallest broken part in a new bounded slice.
5. Launch again.

For Claude Opus 4.7 Max / 1M-context workers, do not duplicate a live run before
the declared heartbeat/timeout policy says it is stalled. Normal useful output
can take 600-900 seconds on deep work.

## Relation To HG-2.5

This doctrine does not weaken `docs/governance/ceo-release-authority.md`.

It clarifies that R1/R2 work is expected to use HG-2.5 aggressively when the
blast radius is low, telemetry is active and rollback is trivial. HG-3 remains
Founder-only.

## Implementation Hooks

Canonical enforcement points for this doctrine:

- `scripts/release-gates/fast-lane-classifier-core.mjs` - pure classifier that
  maps a worker contract or release request to one of `R0..R4` and reports
  whether the work qualifies as `Always Fly` (R1/R2 with parseable contract,
  active stream, heartbeat, scope guard, CAO + controller in the loop and
  trivial rollback).
- `scripts/release-gates/fast-lane-classifier-core.test.mjs` - test suite
  covering R0-R4 cases plus Always-Fly eligibility.
- `scripts/release-gates/human-gate-release-core.mjs` - HG-2.5 release
  validator that the classifier reuses for founder-only and non-delegable
  action detection.

The classifier is advisory: it helps the dispatcher and CEO/Codex controller
decide whether a launch can proceed without re-litigating fast-lane scope.
CAO PASS and HG-2.5 evidence remain required for R3 release; HG-3 remains the
only path for R4.
