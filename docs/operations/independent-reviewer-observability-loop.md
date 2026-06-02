# Independent Reviewer Observability Loop

Status: paused downstream doctrine

## Purpose

Company.OS needs an independent reviewer that improves the system over time
without becoming another control plane.

Correction 2026-05-19: this is not the primary Raindrop requirement. The
primary requirement is call-level Raindrop observability for every
Company.OS-owned LLM call routed through the runtime. This reviewer loop is a
downstream consumer of that evidence and is paused until the call-level adapter
exists.

The reviewer loop watches bounded runtime evidence, identifies repeated failure
patterns, and proposes better contracts, gates, prompts, evals or documentation.
It does not dispatch workers, mark Plane items Done, mutate memory, publish,
deploy or make release decisions.

## Placement

```text
Plane execution ledger
  -> Runtime Dispatcher / Scheduler
  -> Worker run artifacts
  -> CAO / Controller decisions
  -> Reviewer observability loop
  -> insight proposals for future contracts and gates
```

Raindrop Workshop is a candidate trace/debug sidecar for this loop. It may add
span-level evidence for selected local or synthetic runs, but Plane and
`metrics/agent-events.jsonl` remain the state truth.

## Reviewer Authority

| Capability | Allowed |
|---|---|
| Read Plane items, comments and local reports | yes |
| Read `metrics/agent-events.jsonl` and reduced state | yes |
| Read local Raindrop trace summaries from approved pilot paths | yes |
| Write private reviewer reports | yes |
| Create Plane insight comments | only after controller release |
| Dispatch workers | no |
| Flip `dispatch: ready` | no |
| Mark Plane Done | no |
| Write memory or Honcho conclusions directly | no |
| Upload traces to a cloud service | no |
| Read browser storage, raw secrets or private customer data | no |

## Evidence Inputs

The first reviewer pass reads only these classes of evidence:

- `metrics/agent-events.jsonl` and sanitized run-local event extracts
- `reports/runs/**` worker, CAO and controller artifacts
- `reports/runtime-auth/**` hard-cron and browser proof reports
- `docs/operations/agent-event-ledger.md`
- `docs/strategy/raindrop-workshop-observability-sidecar.md`
- optional local-only Raindrop trace summary cards after the Raindrop pilot is
  explicitly accepted

Raw trace payloads, prompts, tool arguments, cookies, local storage, customer
data, PHI, finance/legal data and private founder memory are not valid reviewer
inputs.

## Insight Card

Reviewer output must be reducible. Each finding uses this shape:

```yaml
reviewer.insight:
  version: reviewer-observability/v0
  run_id: <run id or none>
  plane_issue: COMPA-<n> | none
  source_artifacts:
    - reports/...
  severity: blocker | high | medium | low | info
  pattern: <stable short name>
  evidence: <file/path anchored summary>
  recommendation: <contract | gate | prompt | eval | docs | product>
  owner_role: role:cto | role:coo | role:cpo | role:cmo | role:cfo | role:cao
  blocked_actions_remaining:
    - dispatch
    - done
    - deploy
    - publish
```

The reviewer may aggregate insights into a weekly report, but every proposed
action still needs a separate Worker Issue Contract before runtime dispatch.

## Raindrop Boundary

Raindrop belongs to the evidence layer, not the execution layer.

Allowed first pilot:

- local-only install/readiness review
- private ignored DB path decision
- one synthetic or read-only trace target
- trace summary card written under `reports/observability/raindrop-workshop/`
- no cloud MCP, no hosted ingestion, no API key prompt, no production traces

Blocked until HG-3:

- cloud trace upload
- hosted Raindrop MCP
- automatic raw prompt/tool payload ingestion
- trace links in public or client-visible artifacts
- traces over regulated, customer, finance, legal, medical or founder-private
  data

## First Pilot

The first independent reviewer pilot should run after at least one recurring
`plane-ui-worker` cadence report exists.

Codex automation id: `company-os-independent-reviewer-observability-pilot`.
The initial schedule is weekly on Friday at 17:30 Europe/Berlin. The pilot must
write `BLOCKED_INSUFFICIENT_EVIDENCE` and stop when fewer than two completed
cadence reports exist.

Acceptance bar:

1. It reads one completed run chain from Plane/report artifacts.
2. It produces at least three insight cards.
3. At least one insight proposes a concrete gate or Worker Contract change.
4. It writes no Plane Done, no dispatch change and no durable memory.
5. It declares whether Raindrop trace evidence would have changed the review.

## Stop Rules

Stop and report `reviewer.scope-boundary` if the reviewer needs raw trace
payloads, secrets, browser storage, private memory or production data to make
the finding.

Stop and report `reviewer.control-plane-boundary` if the reviewer tries to
dispatch work, transition Plane state, create release comments or write memory
instead of producing an insight report.
