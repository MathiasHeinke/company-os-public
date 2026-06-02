# Operator Shell Candidate Scorecard

Status: sidecar decision package
Use for: choosing the first sandboxed Operator UI / Hermes assistant surface
Last updated: 2026-05-13

## Decision Frame

Company.OS keeps Plane, Worker Contracts, Runtime Dispatcher, CAO, Codex
Controller and HumanGates as the control system. The Operator Shell is only the
human-facing layer on top:

```text
Founder / operator
  -> Operator Shell and Hermes assistant
  -> Company.OS Command Center adapter
  -> Plane execution ledger
  -> Runtime Dispatcher / Scheduler
  -> Claude, Codex, Gemini, Hermes or other workers
  -> CAO / Controller / HumanGate
```

The shell may speak, show work, draft intent cards and prepare decisions. It
must not become a second ledger, scheduler, memory store or release authority.

## Scoring

Stars are relative to the Company.OS sidecar target. Five stars means strongest
fit. One star means weak fit or high uncertainty.

| Candidate | Repo | Operator UX | Multi-agent fleet | Hermes fit | Plane bridge | Security fit | Voice / morning brief | Fork / adapter fit | v0.7 fit | Recommendation |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| AionUi | https://github.com/iOfficeAI/AionUi | ***** | ***** | **** | *** | ** | *** | **** | ***** | Adopt as primary read-only UX sidecar pilot |
| Mission-Control | https://github.com/builderz-labs/mission-control | **** | **** | ** | **** | **** | ** | **** | **** | Adapter-only or fork candidate for fleet/gate cockpit |
| The Kitchen | https://github.com/jozef-barton/the-kitchen | *** | *** | **** | ** | *** | *** | *** | *** | Hermes benchmark, not primary control shell |
| Hermes Workspace | https://github.com/outsourc-e/hermes-workspace | **** | **** | ***** | ** | ** | ** | *** | *** | Reference-only unless forkability/security passes |
| OpenAgents | https://github.com/openagents-org/openagents | *** | **** | ** | * | ** | * | *** | ** | Monitor; too broad for v0.7 control layer |
| amux | https://github.com/mixpeek/amux | ** | **** | ** | *** | **** | * | *** | *** | Worker-session utility, not CEO Operator Shell |
| Cogpit | https://github.com/gentritbiba/cogpit | *** | ** | * | ** | *** | ** | ** | ** | Claude Code observability sidecar only |
| OrbitDock | https://github.com/Robdel12/OrbitDock | *** | *** | ** | ** | ** | * | ** | ** | Monitor; needs separate security and adapter review |

Verified snapshot on 2026-05-13 via GitHub CLI / GitHub search. The volatile
numbers are deliberately not used as decision authority, but they matter for
ecosystem health: AionUi, Mission-Control, Hermes Workspace and OpenAgents were
active in May 2026; The Kitchen is small but current; Cogpit, amux and OrbitDock
are useful comparison surfaces.

## Shortlist

### 1. AionUi

Role: primary Operator Shell sidecar pilot.

Why it fits:

- strongest daily operator experience for "open laptop, see the system, talk to
  it, continue work"
- explicitly targets Hermes Agent, Claude Code, Codex, Gemini CLI and other CLI
  agents
- broadest chance to prototype the Samantha/Jarvis feeling without building the
  whole UI from scratch
- likely best place to test voice, status panels, assistant persona and intent
  card UX

Main risks:

- broad tool integration can inflate permissions quickly
- not Plane-native; every state-changing action needs a Company.OS adapter
- UI convenience can hide weak source-of-truth boundaries if not sandboxed

Decision: adopt as a read-only sidecar pilot. It may display Plane state and
draft intent cards. It may not write Plane, mark Done, mutate repos, run
production tools or store real secrets during the first pilot.

### 2. Mission-Control

Role: fleet cockpit and governance adapter benchmark.

Why it fits:

- self-hosted orchestration dashboard shape maps well to worker fleets, spend,
  run state, quality gates and operational review
- closer to Company.OS' "control room" needs than a pure chat UI
- better candidate for Plane run status, gate cards, cost ledger and event
  reducers than Hermes-native dashboards

Main risks:

- can become a duplicate task system if Plane is not kept canonical
- weaker assistant/voice surface than AionUi
- needs a strict adapter so it reads Company.OS state instead of owning state

Decision: run as an adapter-only or fork candidate. It should prove whether a
fleet/gate cockpit is better absorbed into Company.OS native Command Center or
kept as a separate visual shell.

### 3. The Kitchen

Role: Hermes-specific benchmark.

Why it fits:

- close to Hermes usage patterns and local assistant ergonomics
- good comparison point for skills, memory, local chat and profile handling
- small enough to inspect quickly

Main risks:

- not a natural Plane-first control surface
- small ecosystem; less evidence for production hardening
- likely needs custom work for HumanGates, CAO decisions and Worker Contracts

Decision: evaluate for Hermes lessons only. Do not use it as the primary
Company.OS control UI unless the pilot proves unusually strong adapter leverage.

## Reference Candidates

Hermes Workspace is the best reference for a Hermes-native local command center:
chat, terminal, memory, skills, inspector and related workspace patterns. It is
not the current primary candidate because Company.OS already decided it should
stay reference-only unless a future review finds a forkable surface that meets
the security, governance and product-fit bars.

OpenAgents is interesting for broader agent networks and collaboration, but it
is too broad for the v0.7 Operator Shell. Treat it as long-horizon ecosystem
watch, not the first Company.OS UI.

amux, Cogpit and OrbitDock are useful for lower-level coding-agent monitoring
and parallel session ergonomics. They should inform the Worker Session view, but
they are not the CEO-level Samantha/Jarvis surface.

## Observability Sidecars

Raindrop Workshop is not scored as an Operator Shell candidate because it is not
the human command surface. It is a local trace/debug/replay layer that can run
beside AionUi, Hermes and Company.OS worker runtimes.

Role in the stack:

```text
AionUi + Hermes
  = operator and assistant surface

Plane + Runtime Dispatcher + CAO + Codex Controller
  = execution and governance system

Raindrop Workshop
  = local flight recorder and replay/eval evidence layer
```

Why it matters:

- it can make model calls, tool calls, errors and timing inspectable for CAO
  and controller review
- it can help turn failures into evals or Worker Contract improvements
- it is a strong candidate for trace-summary links inside the v0.7 read-only
  Command Center

Risk boundary:

- use local Workshop only for the first pilot
- do not enable hosted Raindrop MCP or production trace upload without a
  separate HG-3 data-transfer review
- keep Plane and `metrics/agent-events.jsonl` as state truth; Raindrop is
  evidence, not ledger state

Canonical doc:
`docs/strategy/raindrop-workshop-observability-sidecar.md`.

## Pilot Plan

Use a five-day sandbox. No real secrets, no production writes and no private
customer, medical, legal or finance data. Raindrop Workshop may be added as a
parallel observability pilot on safe read-only or synthetic runs.

| Day | Target | Output |
|---|---|---|
| 0 | Sandbox setup | isolated local clone/profile, no production credentials, kill switch documented |
| 1 | AionUi pilot | screenshots, capability matrix, Hermes/Codex/Claude/Gemini affordance notes |
| 2 | Mission-Control pilot | mock Plane event import, worker run panel, gate card and cost-state feasibility |
| 3 | The Kitchen / Hermes benchmark | Hermes assistant interaction notes, skills/memory/session visibility report |
| 4 | Adapter design | Company.OS read-only API shape, Plane query requirements, intent-card draft schema |
| 5 | Decision review | adopt/fork/adapter-only/reject decision with evidence, Raindrop trace-summary recommendation and v0.7 absorption plan |

## Acceptance Criteria

A candidate may influence v0.7 only if it proves all of these:

- shows read-only morning brief from Company.OS artifacts
- shows Plane work state, worker runs, gate state and blocked decisions
- links every visible claim back to Plane item, event row, report, git diff or
  source document
- links trace-derived claims back to a local report path and redaction class
- represents state-changing actions as visible intent cards, not direct writes
- can run without real secrets in the UI process
- has a clear kill switch and session shutdown behavior
- maps actions to HumanGate levels and never bypasses CAO/Controller
- can be forked or adapted without license or architecture blockers

## Rejection Triggers

Reject or demote a candidate if any of these are true:

- requires raw `.env` or production secrets in the UI process
- assumes full-auto or irreversible write permissions as normal operation
- stores Company.OS state in its own ledger without Plane as source of truth
- cannot link UI state back to evidence
- cannot run locally or self-hosted for the pilot
- cannot separate read-only inspect from write/execute actions
- license blocks commercial productization
- memory, CPU or battery behavior makes daily laptop use unrealistic

## W9 Plane Draft

This is a draft only. Create it in Plane after Founder/CEO approves the pilot
slot.

```yaml
role: role:coo
parent_seat: role:coo
agent: human
mode: research
workspace: companyos
dispatch: manual
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
scope:
  - Include: sandbox-install and read-only evaluation of AionUi, Mission-Control and The Kitchen.
  - Include: capability matrix, screenshots, security notes, adapter requirements and v0.7 recommendation.
  - Exclude: production writes, real secrets, Plane Done transitions, deploys, schema/RLS/auth changes, private data ingestion.
allowed_write_paths:
  - ${LOCAL_WORKSPACE}
acceptance_criteria:
  - AionUi, Mission-Control and The Kitchen each have one bounded evaluation note with evidence.
  - Final recommendation is adopt, fork, adapter-only, from-scratch or reject for each candidate.
  - At least one read-only morning brief mock and one Plane intent-card draft shape are documented.
gates:
  - gitnexus status
  - no real secrets in screenshots, reports or config
  - no production writes or Plane Done transitions
human_gate: HG-2.5
reporting: Plane worker.reported with candidates tested, evidence links, screenshots/report paths, unresolved risks and exact Founder decision needed.
blocked_actions: never expose secrets; never write production state; never mark Plane Done; never bypass CAO, Controller or HumanGate.
```
