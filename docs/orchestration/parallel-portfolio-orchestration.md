# Parallel Portfolio Orchestration

Status: draft doctrine
Use for: deciding when Company.OS may run parallel work across projects,
child contracts, models, workers and sandbox worktrees
Last updated: 2026-05-10

Related doctrine: `docs/orchestration/multi-inference-c-level-runtime.md`
defines the runtime-lane vocabulary used when parallel proposals compare Claude,
Codex, Gemini, OpenRouter or future providers.

## Purpose

Company.OS should eventually process many active work orders across several
projects without requiring the founder to sit at the laptop.

The goal is not "maximum parallelism." The goal is higher throughput with
higher quality:

```text
portfolio intent
-> parent work item
-> child contracts
-> controlled parallel proposals or disjoint execution
-> evidence and audit
-> Codex/CEO synthesis
-> gated integration
```

Parallelism is only useful when it reduces time-to-evidence or improves the
quality of the final decision. It is harmful when it creates write races,
unreviewable activity, duplicate work, budget burn or false consensus.

## Three Different Modes

Do not collapse these into one "multi-agent" label.

| Mode | What runs in parallel | Write permission | Best for |
|---|---|---|---|
| Parallel proposals | Claude, Gemini, Codex, Grok or other models produce alternative plans or patch proposals | none or proposal artifacts only | architecture, implementation strategy, risky refactors, product options |
| Parallel execution | child contracts execute on disjoint scopes or disjoint sandbox worktrees | bounded to declared paths/worktrees | broad parent work where modules do not overlap |
| Portfolio scheduling | scheduler chooses due work across multiple active projects | only through existing dispatcher/controller gates | background throughput across 3-4 projects |

The first safe version is parallel proposals. Parallel execution comes later
and only with disjoint scopes. Portfolio scheduling comes last because it needs
strong priority, budget, auth and kill-switch policy.

## Parent / Child Shape

A parent item is a management case, not a worker prompt.

Parent responsibilities:

- preserve founder or CEO intent
- define success, non-goals, sequencing and quality bar
- identify child contracts and dependencies
- define which children may run in parallel
- define integration and audit owner
- hold controller synthesis and human gates

Child responsibilities:

- one bounded outcome
- one owner seat
- one runtime or one coordinator
- explicit include/exclude scope
- explicit AllowedWritePaths or proposal-only output
- verifiable acceptance criteria and gates
- one `worker.reported` output

Default rule:

```text
Parent may coordinate.
Children may execute.
Controller synthesizes.
CAO audits.
Founder/CEO gates integration.
```

## Parallel Proposal Pattern

Use this when the question is "how should we build this?" or when the
implementation path is uncertain.

Example roster:

```yaml
SessionPolicy: parallel-proposal
Coordinator: C-Level
SynthesisOwner: codex
MaxConcurrentAgents: 3
MaxDelegationDepth: 1
SharedFilesystem: none
ContextIsolation: required
SubAgentRoster:
  - name: claude-opus-architecture
    agent: claude
    mode: plan
    scope: architecture and safety proposal
    write_scope: report-only
  - name: gemini-long-context
    agent: gemini
    mode: plan
    scope: cross-file and spec-drift proposal
    write_scope: report-only
  - name: codex-controller-proposal
    agent: codex
    mode: review
    scope: integration and implementation path proposal
    write_scope: report-only
```

Output:

- each model produces one proposal artifact
- coordinator produces a comparison table
- Codex/CEO chooses: adopt one, merge ideas, request another pass, or reject
- no source code changes unless a later child implementation contract allows it

This is valid in `v0.5` because it exercises SOPs, evals, proposal structure
and review harnesses without allowing parallel writes.

## Parallel Execution Pattern

Use this only when scopes are genuinely disjoint.

Valid examples:

- frontend component A in one sandbox worktree, backend endpoint B in another,
  docs/eval gate C as report-only
- marketing image generation, copy quality gate and scheduler dry-run as three
  separate lanes
- three independent repo hygiene audits across three workspaces

Invalid examples:

- three agents editing the same file
- one agent changing schema while another updates queries against it
- one agent refactoring shared utilities while others build on old contracts
- multiple workers writing Plane state directly

Requirements before edit-capable parallel execution:

- active parent item names the integration owner
- each child has its own Plane item, lock and worker contract
- each child has deterministic branch/worktree naming
- AllowedWritePaths are disjoint
- dependencies are explicit
- MaxSpend and MaxRuntime are explicit per child
- CAO reviews each child before integration
- Codex/CEO owns the final synthesis and integration decision

This belongs no earlier than `v0.7` for implementation work.

## Portfolio Scheduling Pattern

Use this when Company.OS has 100+ valid contracts across 3-4 projects.

The scheduler must not start the oldest item by default. It ranks a portfolio
queue using a scoring model such as:

```text
priority_score =
  business_value
  + unblock_value
  + deadline_pressure
  + confidence
  - risk
  - cost
  - dependency_uncertainty
  - context_staleness
```

Hard caps:

- one active L3 implementation per workspace unless CEO explicitly widens it
- one active integration owner per parent
- no parallel external/public/production write lanes
- no child runs when parent intent or dependency graph is stale
- no run when git hygiene is red
- no run when runtime auth, budget brake or kill switch is missing

Portfolio scheduling is an operating layer, not a model feature. It belongs
after Runtime Dispatcher v1, event ledger, auth preflight, budget brake and
git hygiene are proven.

## Synthesis And Audit

Parallel work needs a stronger final bar than sequential work.

Every parallel parent must end with a synthesis artifact:

```yaml
synthesis:
  parent_item: COMPA-...
  children:
    - item: COMPA-...
      verdict: PASS | REJECT | PARTIAL
      integration_status: used | rejected | deferred
      reason: ...
  selected_path: ...
  rejected_paths:
    - ...
  merged_insights:
    - ...
  conflicts:
    - ...
  residual_risks:
    - ...
  next_gate: HG-1 | HG-2 | HG-2.5 | HG-3
```

CAO checks evidence and contract compliance. Codex/CEO decides whether the
result is coherent enough to proceed. The founder only gets pulled in for
genuine HumanGate questions, not for every child result.

## Roadmap Placement

`v0.5`:

- define the SOP, vocabulary, SubAgentRoster examples, proposal comparison
  rubric and synthesis artifact
- allow parallel proposal passes only
- no concurrent repo writes

`v0.6`:

- use parallel proposals for low-risk department lanes, especially
  Marketing/Growth, content workflows, specs and eval design
- allow report-only multi-model review as part of quality gates

`v0.7`:

- run first sandboxed parallel execution pilot with disjoint child worktrees
- require Runtime Dispatcher v1, event ledger, budget brake, git hygiene,
  artifact truth, CAO review and Codex synthesis

`v0.8`:

- expose parallel proposals and child-lane status in the Command Center and
  department dashboards
- support client-facing "compare approaches" workflows

`v1.0+`:

- consider portfolio-level background execution across multiple projects after
  conflict policy, priority scoring, kill switches, rollback and integration
  audit are proven repeatedly

## Non-Goals

- no "100 tasks, 100 workers" mode
- no autonomous multi-agent writes to shared files
- no hidden arena where rejected alternatives vanish
- no subagent Done transitions
- no CAO spawning workers
- no model-specific lock-in; Claude, Gemini, Codex, Grok and future models are
  runtime options behind the same contract

## Company.OS Advantage

Foundation-lab coding tools can make many agents produce outputs. Company.OS
should make many agents produce accountable evidence.

The business case exists if this system proves both:

1. higher throughput: more valid work reaches controller review per week
2. higher quality: fewer regressions, clearer decisions, better code and better
   auditability than a single-worker path

If either condition fails, reduce parallelism.
