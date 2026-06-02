# Hermes Operator Shell Sidecar

Status: canonical sidecar decision
Use for: evaluating a Hermes/Aion-style operator shell without interrupting
Company.OS v0.4-v0.6 hardening
Last updated: 2026-05-11

## Purpose

Company.OS needs two layers that must not be collapsed:

1. The control system: Plane, Worker Contracts, Runtime Dispatcher, CAO,
   Codex Controller, HumanGates, event ledger and release validators.
2. The operator shell: a conversational and visual layer that helps an
   operator understand, steer and trust the system.

The operator shell may feel like a Jarvis-style assistant. It may speak,
prepare morning briefs, show live worker state, surface external intelligence
and create intent cards. It must not become a second ledger, scheduler,
memory store or release authority.

## Decision

The Hermes/Aion-style operator shell is now a formal sidecar workstream.

Company.OS continues to harden v0.4, v0.5 and v0.6 as planned. The operator
shell is evaluated in parallel as a sandboxed sidecar until the v0.7 read-only
Command Center POC can absorb the proven parts.

This means:

- v0.4-v0.6 work stays focused on runtime integrations, worker-contract
  quality, inference routing, scheduler safety, SOPs, evals and text-first
  Command Center maps.
- The sidecar may test AionUi, Hermes-native dashboards, voice input/output,
  morning brief presentation and Hermes profile setup.
- The sidecar may not bypass Plane, write production state, mark Done, alter
  HumanGate levels, auto-approve tools or run with unrestricted secrets.
- Any useful pattern must be pulled back into Company.OS as doctrine, adapter
  code, capability profile, eval or dashboard requirement before it becomes
  part of v0.7+.
- Work requests captured in the shell must follow
  `docs/operations/intent-to-department-reporting-chain.md`: shell captures
  intent, CEO routes, C-level owns, workers execute, CAO/Controller review, and
  the shell summarizes the result back to the founder.

## Candidate Surface Classes

| Class | Examples | Role |
|---|---|---|
| Broad fleet shell | AionUi, OpenAgents, OrbitDock | Evaluate multi-agent UX, local desktop fit, Codex/Claude/Gemini/Hermes handling. |
| Hermes-native dashboard | Kori Hermes Dashboard, The Kitchen, Hermes Workspace variants | Evaluate Hermes hooks, skills/memory visibility, session telemetry and local-first patterns. |
| Coding-agent cockpit | amux, Cogpit, Mission Control-style dashboards | Evaluate worker-fleet status, tmux/session supervision, cost and diff review patterns. |
| Company.OS native layer | Future Command Center | The only canonical product surface after sidecar patterns are absorbed. |

`hermes-workspace` is reference-only unless a future review finds a forkable
surface that meets Company.OS quality, security and product-fit bars.

## Sidecar Constraints

The sidecar runs under a sandbox profile:

- no real customer, medical, legal, finance or secret-bearing data
- no raw `.env` reads
- no YOLO / full-auto permission mode
- no production deploy, merge, push, schema/RLS/auth, service-role or spend
  changes
- no Plane Done transitions
- no autonomous Plane writes except explicitly approved test intent cards
- no durable private-memory write without the matching Memory/Honcho gate
- all external intelligence ingestion is read-only and source-attributed

The default allowed sidecar outputs are:

- screenshots and operator notes
- eval reports
- capability matrix
- read-only morning brief mock
- voice/audio interaction prototype
- Plane intent-card draft
- adapter requirements for Company.OS

## HumanGate 3.5

`HG-3.5` is the Chief-of-Staff / Founder-Proxy Review layer:

```text
HG-3   CEO/Codex critical authority for reversible/restorable hard decisions.
HG-3.5 Chief-of-Staff / Founder-Proxy prepares, predicts and challenges the decision.
HG-4   Founder / human for strategic or non-restorable decisions.
```

HG-3.5 may:

- simulate the likely founder decision from precedent, memory, source-of-truth
  documents and explicit no-go rules
- produce a decision card with `likely_go`, `likely_no` or `ask_founder`
- recommend that a repeated decision class be downgraded after enough green
  evidence

HG-3.5 may not:

- release HG-4 strategic, non-restorable, major legal/capital, founder-voice or
  true founder-will decisions
- bypass CAO, Codex Controller or Plane evidence
- create a new authority class without a separate governance update

Promotion from HG-4 to HG-3.5-assisted, HG-3 or HG-2.5 requires repeated evidence,
not model confidence alone. A material miss resets the decision class.

## Target Architecture

```text
Founder / operator
  -> Hermes/Aion-style operator shell
  -> Company.OS Command Center adapter
  -> Plane execution ledger
  -> Runtime Dispatcher / Scheduler
  -> Claude, Codex, Gemini, Hermes or other workers
  -> CAO
  -> Codex Controller
  -> HumanGate / release validator
```

The operator shell may become the primary human interaction layer. It does not
own execution truth.

For state-changing work, the shell creates intent cards. It does not become the
department owner unless a future governance update explicitly assigns it a
worker/runtime role with CapabilityProfile, gates and reporting.

## Roadmap Placement

| Version | Placement |
|---|---|
| v0.4 | Document Hermes setup, runtime auth, local profile constraints and sidecar sandbox. |
| v0.5 | Add dashboard/voice eval SOP and sidecar reporting format. |
| v0.6 | Keep text-first Command Center map as the canonical interaction spec; sidecar may prototype audio and morning brief UX. |
| v0.7 | Pull proven sidecar parts into read-only Voice Command Center POC. |
| v0.8 | Department assistant surface may use the operator-shell patterns to create gated intent cards. |
| v0.9 | Harden microphone consent, realtime provider choice, audit logs, auth, kill switch and support lifecycle. |
| v1.2 | Operator leverage layer: one trained operator can supervise small-team output through briefings, dashboards and gate cards. |

## Evaluation Matrix

Each candidate must be scored before adoption:

- license and commercial usability
- local-first operation and self-hosting
- active community and commit cadence
- memory, CPU and battery behavior
- Hermes Agent integration depth
- Codex, Claude Code, Gemini CLI and OpenRouter support
- Plane read-only and intent-card bridge feasibility
- Mac mini worker-node feasibility
- audio input/output and morning brief ergonomics
- browser-use / desktop-use capability boundaries
- secrets isolation, permission model and audit log
- kill switch and session shutdown behavior
- forkability and product fit for Company.OS

## Acceptance Bar For v0.7 Absorption

The sidecar can influence v0.7 only when:

- at least one candidate has been installed in a sandbox profile
- no real secrets were exposed during the spike
- read-only morning brief can be shown from Company.OS artifacts
- the operator can inspect worker status and report drill-downs
- state-changing actions are represented as visible intent cards
- the candidate's permission model can map to Company.OS HumanGates
- the final recommendation is `adopt`, `fork`, `adapter-only`,
  `from-scratch` or `reject` with evidence

Until then, the sidecar remains learning surface, not production interface.
