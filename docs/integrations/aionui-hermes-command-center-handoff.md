# AionUI / Hermes Command Center Handoff

Status: foundation ready
Date: 2026-05-20
Owner: Company.OS Command Center track

## Purpose

This document is the handoff boundary for evaluating AionUI and Hermes Agent
as the future top operator shell for Company.OS.

Company.OS remains the backend, execution ledger and governance substrate.
AionUI/Hermes may become the interaction layer, but it must consume
Company.OS-owned read models and contracts instead of becoming a second source
of truth.

## Current Integration Boundary

The only supported input for a UI prototype is the read-only Command Center
packet:

```text
scripts/command-center/command-center-read-model.mjs
reports/examples/command-center-read-model/command-center-read-model.example.json
reports/examples/command-center-read-model/command-center-read-model.example.md
```

The packet is generated from an agent-event ledger and contains:

- morning brief totals
- worker run cards
- HumanGate queue entries
- Raindrop trace summary cards
- prompt-result eval links
- blocked actions
- source event ids and artifact paths

The UI may render these fields. It must not execute the actions.

## GitHub / Source Ownership

The customized Company.OS UI layer must be source-controlled.

Default policy:

1. Evaluate AionUI/Hermes in a sandbox first.
2. If adopted or forked, create a Company.OS-owned repo or subpackage with a
   clear upstream reference.
3. Keep installation instructions and adapter contracts in the Company.OS repo.
4. Do not let local UI experiments become the canonical runtime unless they are
   reproducible from GitHub.

Acceptable paths:

- adapter-only: keep AionUI upstream untouched and build a Company.OS adapter
- fork: fork AionUI into a Company.OS-controlled repo and track upstream
- from-scratch shell: build a new UI that consumes the same read model
- park/reject: keep the backend path headless until a better shell exists

The chosen path must be recorded in the operator-shell scorecard before it is
treated as product direction.

## Installation Boundary

The first UI install should be browser/local only:

- no production secrets
- no Plane write token in the browser process
- no GitHub push token in the browser process
- no Supabase service-role key
- no Stripe write key
- no publish/send/schedule/spend credentials
- no raw prompts, raw tool payloads, private memory, cookies or browser storage
  in screenshots or reports

The UI may read a local JSON packet or a sanitized mock endpoint. It may not
poll Plane, dispatch workers, mark Done, resume HumanGates or mutate memory.

## Adapter Contract

The first adapter should treat the read model as immutable input:

```ts
type CommandCenterPacket = {
  schema_version: "command-center-read-model/v0";
  generated_at: string;
  read_only: true;
  source_policy: "artifact-linked-no-state-mutation";
  sources: {
    event_ledger: string;
    reducer: string;
  };
  morning_brief: {
    headline: string;
    totals: Record<string, number>;
  };
  worker_runs: Array<Record<string, unknown>>;
  human_gate_queue: Array<Record<string, unknown>>;
  ceo_critical_releases: Array<Record<string, unknown>>;
  eve_hg35_packets: Array<Record<string, unknown>>;
  trace_summary_cards: Array<Record<string, unknown>>;
  event_type_counts: Record<string, number>;
  blocked_actions: string[];
};
```

Consumer rules:

- render only fields present in the packet
- preserve source event ids in drill-down views
- preserve artifact links as evidence, not as editable content
- show blocked actions in the UI during early pilots
- treat unknown fields as forward-compatible additions
- fail closed if `read_only` is not true

## Hermes Agent Boundary

Hermes may be used as an assistant over the packet:

- explain what happened
- summarize blocked runs
- draft questions for HumanGate review
- draft Plane comment text for the operator to paste
- compare two read-model packets
- propose follow-up worker contracts as drafts

Hermes must not:

- call Plane write APIs
- dispatch workers
- sign HumanGates
- mark Done
- deploy, publish, send, schedule, spend or write production systems
- ingest private memory or raw prompts unless a later explicit contract allows it

## First Evaluation Checklist

Before any AionUI/Hermes pilot is accepted:

- sandbox install is reproducible from documented commands
- UI consumes `reports/examples/command-center-read-model/command-center-read-model.example.json`
- no secrets appear in environment, screenshots, reports or generated files
- every visible state claim maps to a source event id or artifact path
- HumanGate entries are presented as review cards, not buttons that execute
- HG-3 CEO releases and EVE / HG-3.5 packets are rendered as read-only
  evidence, not authority controls
- blocked actions remain visible
- scorecard recommendation is one of: `adopt`, `fork`, `adapter-only`,
  `from-scratch`, `park`, `reject`

## Handoff To Future UI Worker

Recommended worker contract fields:

```yaml
role: role:coo
parent_seat: role:coo
agent: claude
mode: audit
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - docs/releases/0.7-entry-plan.md
  - docs/releases/0.7a-command-center-read-model.md
  - docs/integrations/aionui-hermes-command-center-handoff.md
  - reports/examples/command-center-read-model/command-center-read-model.example.json
  - docs/strategy/operator-shell-candidate-scorecard.md
acceptance_criteria:
  - Evaluate AionUI/Hermes against the read-only packet, not against live Plane.
  - Produce capability matrix, security notes, screenshots and recommendation.
  - Do not install credentials or mutate Company.OS state.
gates:
  - no secrets in report or screenshots
  - recommendation maps to the operator-shell scorecard
  - every UI claim cites packet fields or documented adapter requirements
human_gate: HG-2
reporting: Plane worker.reported with evidence, blockers, reflection and learning_proposals.
```

## Next Step

The next clean UI move is not a broad frontend build. It is a sandbox
evaluation that proves AionUI/Hermes can render the sample Command Center
packet and stay inside the blocked-action boundary.

Concrete start packet:

```text
docs/integrations/aionui-hermes-eve-start-plan.md
reports/operator-shell/2026-05-25/eve-aionui-hermes-start-packet.md
```
