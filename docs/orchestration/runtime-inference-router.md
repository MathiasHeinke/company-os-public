# Runtime Inference Router

Status: canonical Stage 3.5 doctrine for Company.OS runtime routing
Use for: choosing the minimum sufficient inference layer before Runtime
Dispatcher v1.2 spawns Claude, Codex, Gemini or another worker
Last updated: 2026-05-20

Related doctrine: `docs/orchestration/multi-inference-c-level-runtime.md`
defines the model-agnostic target architecture for Claude, Codex, Gemini and
future runtime lanes. `docs/orchestration/eve-hermes-superbrain-router.md`
defines the separate operator-shell brain route for EVE/Hermes conversations
and founder-intent orchestration. This document remains the executable v0
worker-runtime router doctrine.

## Purpose

The Capability Registry answers: **is this worker allowed to use this role,
workspace, tool surface and autonomy level?**

The Runtime Inference Router answers the next question: **what inference layer
is sufficient for this exact work item?**

Without this stage, Company.OS tends to aim Claude Opus 4.7 Max with the 1M
context window at work that Sonnet can handle. That wastes budget, increases
latency and raises `max_turns` failure risk. The router exists to make the
runtime more powerful by using the expensive path only when the task actually
needs it.

## Position In The Run Chain

```text
0 Plane Work Item
1 Dispatcher v0 lock/context
2 Capability Registry
3 Runtime Dispatcher v1.1 preflights
3.5 Runtime Inference Router
4 Runtime Dispatcher v1.2 spawn
5 C-Level Worker
6 CAO
7 Codex Controller
8 CEO/Codex Done
9 Scheduler 24/7
```

Stage 3.5 never writes, never spawns and never marks Done. It produces a route
decision consumed by Runtime Dispatcher v1.2:

- runtime agent
- model name / alias
- max turns
- max runtime
- context profile
- split policy
- controller gate policy

The route decision is runtime identity, not C-Level ownership. A `role:cto`
item may eventually route to Claude, Codex, Gemini or a human worker depending
on task class, risk, context need and capability profile. Plane owns the work
item and evidence; the registry owns the effective runtime route.

## Task Classes

| Class | When | Default Route | Notes |
|---|---|---|---|
| `P0-doc-small` | reversible docs/report/contract wording | Claude Sonnet, 45 turns | cheapest edit-capable path |
| `P1-code-bounded` | bounded code/docs patch with known tests | Claude Sonnet, 75 turns | default for small implementation |
| `P2-code-shared` | shared runtime/parser/controller/registry code | Claude Opus 4.7 1M, 120 turns | controller reruns GitNexus/gates |
| `P3-cross-repo` | multi-workspace or long-context architecture work | Claude Opus 4.7 1M, 180 turns | sidecar audit recommended |
| `P4-high-risk` | HG-4 or non-restorable/strategic surfaces | no autonomous spawn | Founder gate only |

The canonical executable registry is:

`registries/inference/company-os.json`

The executable router is:

`scripts/orchestration/inference-router.mjs`

Current v0 limitation: all spawnable executable routes in
`registries/inference/company-os.json` still use Claude as primary runtime.
Codex and Gemini are sidecar/controller concepts until the blockers documented
in `reports/audits/2026-05-11-inference-router-codex-parity.md` and
`docs/orchestration/multi-inference-c-level-runtime.md` are closed.

## Classification Rules

The router reads the normalized Plane contract fields and title. It prefers an
explicit `InferenceClass`/`inference_class` if present and known. Otherwise it
classifies deterministically:

1. HG-4, non-restorable data loss, strategic direction, major legal/capital
   exposure and founder-voice public commitments are `P4-high-risk`.
2. HG-3, schema/RLS/auth/service-role, production writes, deploy/publish,
   material spend and regulated-claim work stay spawnable only after CEO/Codex
   critical-release evidence proves rollback/restore and CAO/controller PASS.
3. Cross-workspace/cross-repo work or multiple active workspace paths are
   `P3-cross-repo`.
4. Shared orchestration surfaces such as Runtime Dispatcher, worker validator,
   CAO, Codex Controller or capability registries are `P2-code-shared`.
5. Script/test/source-code work is `P1-code-bounded`.
6. Docs/report-only work is `P0-doc-small`.
6. Unknown but implement-like work falls back to `P1-code-bounded`.

This is intentionally conservative but not fear-driven: reversible low-risk
work gets a fast route; irreversible or regulated surfaces fail closed.

## Runtime Dispatcher Integration

Runtime Dispatcher v1.2 loads the inference registry by default unless
`--inference-route off` is passed.

Example:

```bash
node scripts/orchestration/runtime-dispatcher-v1.mjs \
  --workspace companyos \
  --project-id <project-id> \
  --work-item-id <work-item-id> \
  --mode run \
  --inference-route auto \
  --controller post \
  --codex-controller post
```

The router output is used as the fallback for `--runtime-model` and
`--max-turns`. A work item may still override turns with an explicit
`MaxTurns`; that is part of the contract and remains visible to the controller.
For Claude Code v2, P2/P3 Opus routes use the verified local alias `opus`; do
not reintroduce stale marketing/version aliases such as
`claude-opus-4-7[1m]` without a fresh headless sanity check.

Use `--inference-route P2-code-shared` to force a known class for a pilot. Use
`--inference-route off` only for emergency compatibility or a controller-approved
debug run.

## Split Policy

The split policy is advisory in v0. Runtime Dispatcher v1.2 still spawns exactly
one worker. The policy tells the scheduler/controller what the next buildout
should do:

- `single-worker`: no sidecar
- `worker-plus-controller-audit`: controller reruns gates and GitNexus
- `primary-worker-plus-sidecar-audit`: add Codex/Gemini/Claude sidecar audit
  when authenticated and scoped
- `no-autonomous-spawn`: block and ask Founder/HG-4 or CEO/HG-3 as classified

Future scheduler versions may use the split policy to dispatch multiple workers
under one locked Plane item, but only after the SubAgent Reporting Contract and
Controller gate are upgraded for multi-run reconciliation.

## Required Evidence

Every runtime report that uses the router should surface:

- `inference_route.task_class`
- selected model
- selected max turns
- context profile
- split policy
- whether the route was explicit or inferred

Controller reviews treat router misclassification as a learning proposal. A bad
route does not automatically invalidate good work, but it must improve the
registry or classifier before the next comparable run.

## Gates

```bash
node --check scripts/orchestration/inference-router.mjs
node --test scripts/orchestration/inference-router.test.mjs
node scripts/orchestration/inference-router.mjs \
  --field mode=implement \
  --field scope=docs/templates/worker-issue-contract.md \
  --json
```

Runtime integration gates:

```bash
node --test scripts/orchestration/runtime-dispatcher-v1.test.mjs \
  scripts/orchestration/runtime-dispatcher-v12-core.test.mjs
```
