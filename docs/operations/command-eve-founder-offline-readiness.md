# Command EVE Founder Offline Readiness

Status: canonical readiness ladder
Date: 2026-05-27
Use for: measuring whether Command EVE and Company.OS are moving toward the
Founder Offline Test instead of adding surface area.

## Purpose

The Founder Offline Test is the product and operating-system north star:

```text
Can the Founder turn off phone and laptop for 14 days while the company keeps
earning, operating, shipping, supporting customers, monitoring risks, preparing
decisions and protecting the Founder's body and life?
```

This document turns that test into levels. EVE should use the ladder to answer
questions such as "where are we?", "what should we set up next?", "what can run
without me?", and "which connector or automation actually matters now?"

The target is not founder replacement. The target is responsible founder
decoupling under Company.OS governance:

- CEO/Codex keeps release authority inside HG-2.5/HG-3.
- CAO/Controller keeps audit and evidence discipline.
- EVE keeps the Founder-facing intent, review and companion layer.
- HG-4 remains Founder-owned.
- Atlas or an equivalent health layer protects the Founder as a human, not as
  an infinite company battery.

## Readiness Levels

| Level | Name | Meaning | Pass Evidence | Hard Stop |
|---|---|---|---|---|
| L0 | Soul loaded | Hermes starts as Command EVE with the Founder Offline Test and hard boundaries. | `HERMES_HOME/SOUL.md` and `EVE_RUNTIME_BOOT_PACKET.json` contain `founder-offline-test`. | EVE answers like a blank chatbot or claims execution authority. |
| L1 | Seed confirmed | EVE knows the account/company seed and asks for correction before memory. | `eve-boot-packet.json`, `intake-record.json`, first greeting confirms known facts. | EVE opens with a full questionnaire despite known seed. |
| L2 | Existing systems mapped | EVE inventories current ledgers, tools, people, roles and open work before creating new structure. | Read-only inventory of Plane/Linear/Jira/Notion/GitHub/GitNexus/Honcho/Drive/CRM as applicable. | EVE duplicates a mature user's existing system. |
| L3 | First department wedge | One department has a clear wedge, parent, child contracts and manual dispatch path. | Founder Intent Packet, CEO Delegation Packet, Plane parent and child drafts with `dispatch: manual`. | Worker dispatch without CEO/Codex review. |
| L4 | Managed work loop | CEO -> C-Level -> Worker -> CAO -> Controller loop works for one bounded lane. | Worker report, CAO PASS/REJECT, controller decision, post-worker quality loop. | Workers or CAO mark Plane Done. |
| L5 | Connector-aware operations | Required connectors for one wedge are verified, scoped and gated. | Connector manifest evidence, auth/model preflight, allowed read/write scope, HumanGate map. | Raw secrets, cookies, broad write scopes or unbounded send/publish/spend. |
| L6 | Daily ops autopilot | Routine content, support, sales, bugfix, reporting and follow-up work can continue with bounded autonomy. | Recurring run logs, budget brake, kill switch, evidence packets and escalation queue. | Autonomy runs without loop limits, rollback or budget control. |
| L7 | Founder review compression | Founder sees crisp decision packets instead of raw operational noise. | Founder Daily Queue, HG-3.5 EVE packets, HG-4 dossiers, clear "approve / reject / defer" decisions. | EVE forwards every uncertainty to the Founder. |
| L8 | 72-hour shadow offline | A simulated three-day founder-offline run completes with only parked HG-4 decisions. | Shadow run report, revenue/ops/support/product/health summaries, no ungated irreversible action. | Any HG-4 action executes or silent failure hides a real risk. |
| L9 | 14-day assisted offline | A real or staged 14-day run works with a predeclared emergency channel. | Daily or end-of-run packet, kept operating metrics, parked strategic decisions, health/life guardrails. | Company keeps moving only by creating hidden founder debt. |
| L10 | Founder Offline Test pass | The company demonstrably earns, operates, ships, supports, monitors, prepares and protects for 14 days. | Postmortem proves continuity, safety, customer impact, founder health protection and improved next run. | Revenue or product motion depends on untracked founder intervention. |

## Current 0.7.x Target

`0.7.x` is not expected to pass the full Founder Offline Test. It should reach
a credible guided-pilot baseline:

- L0: pass locally through generated Hermes `SOUL.md`.
- L1: pass for a fresh install through first-company packet generation.
- L2: pass as a read-only inventory protocol, not full connector automation.
- L3: pass for one first department wedge with manual dispatch.
- L4: partial pass where existing Plane worker, CAO, controller and quality
  loop evidence exists.

`0.7.2` should make L0-L2 practical in the AionUI/Hermes path. `0.7.3` should
make AionUI/Hermes load the boot packet and answer the first broad opener from
evidence. `0.8` should prove L3-L4 for one department. `0.9` should prove
L5-L6 for one operating lane. `1.0` should be credible guided beta for daily
ops. `1.2` should run L8 shadow offline. `2.x` and `3.x` move toward L9-L10
across more departments, customers and operating contexts.

## What EVE Should Say When Asked "Where Are We?"

EVE should answer in this shape:

```text
My read:
- Current Founder Offline readiness: L<N> / L10.
- Evidence I can see: <paths, packets, connector/preflight status>.
- What this already enables: <concrete operations>.
- What is still blocked: <missing seed, connector, gate, budget, memory, health or run evidence>.
- Next best move: <one action>.

Challenge:
- <strongest hidden risk or false-autonomy warning>.

Three choices:
1. <setup / verify / run option>
2. <existing-system inventory option>
3. <first goal / department wedge option>
```

EVE should not inflate the score. A beautiful UI, a powerful model or many
connectors do not raise the level unless the operating loop has evidence.

## Core Evidence Paths

EVE should prefer these sources before asking the Founder:

- `.company-os/eve/SOUL.md`
- `.company-os/onboarding/eve-boot-packet.json`
- `.company-os/onboarding/intake-record.json`
- `.company-os/company-discovery-brief.md`
- `reports/company-discovery/YYYY-MM-DD/first-company-packet.md`
- `docs/operations/eve-soul-boot-contract.md`
- `docs/operations/eve-first-run-founder-onboarding.md`
- `docs/operations/eve-founder-intent-operating-layer.md`
- `docs/operations/command-eve-founder-offline-readiness.md`
- `docs/operations/eve-chief-of-staff-growth-review.md`
- `docs/integrations/aionui-hermes-eve-portable-bootstrap.md`
- Plane parent/child contracts and worker reports
- CAO/Controller decisions
- connector manifest and preflight evidence

## What We Have Now

As of this contract, the productized Company.OS line has:

- public EVE soul seed for the kit
- generated Hermes `SOUL.md` support
- first-run boot packet and example packet
- account seed and existing-system inventory protocol
- connector manifest with gated install posture
- `/start_eve` / sidecar prepare-preflight-smoke path
- Plane worker contract doctrine
- post-worker quality/audit/hotfix loop doctrine and scheduler glue

## What Is Still Needed

The next practical blockers are:

- AionUI/Hermes must load the boot packet before the first EVE answer in the
  real UI, not only through generated files.
- Hermes must be updated or explicitly pinned with a reproducible version
  decision.
- EVE must answer `hey` / `wo stehen wir?` from the runtime packet and this
  readiness ladder, not from a generic onboarding questionnaire.
- The first real company/user intake must produce a confirmed
  `eve-boot-packet.json`.
- At least one first department wedge must produce parent/child contracts and
  complete a worker -> CAO -> Controller loop.
- Honcho or an equivalent memory layer must be configured before durable
  founder/company memory is treated as available.
- EVE needs a three-to-four-week Chief-of-Staff Growth Review so native memory
  and self-reflection become evidence-backed proposals instead of unchecked
  self-promotion.
- Atlas or an equivalent health/life layer must be designed before claiming
  levels above L7.
- A 72-hour shadow offline run must pass before any 14-day claim.

## Non-Negotiable Boundaries

- HG-4 is never delegated to EVE.
- EVE may prepare and challenge decisions, not approve them.
- No connector is "available" until evidence proves it.
- No self-serve claim is valid while private sidecars or private paths are
  required.
- No health or life-protection claim is valid without explicit source truth and
  medical/legal boundaries.
- If the system creates hidden work for the Founder, the readiness level goes
  down, not up.
