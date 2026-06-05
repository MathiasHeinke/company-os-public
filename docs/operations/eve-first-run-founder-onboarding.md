# EVE First-Run Founder Onboarding

Status: canonical first-run product contract
Date: 2026-05-25
Use for: making Command EVE useful for a fresh founder install without turning
EVE into a hard-coded setup wizard.

## Decision

EVE must not start as a blank chatbot and must not start as a questionnaire.

For a fresh install, EVE starts from a small boot packet:

```text
signup / report / intake seed
-> .company-os/onboarding/intake-record.json
-> .company-os/onboarding/eve-boot-packet.json
-> EVE greeting, confirmation and progressive setup
```

The first conversation should feel like a Chief of Staff who has read the
first file, not like a form asking the founder to retype everything.

## Source Split

Do not mix these layers:

| Layer | Purpose | Example source |
|---|---|---|
| Account seed | Facts already captured before EVE opens. | Signup, landing-page report, AI Business Blueprint, first intake JSON. |
| Runtime probe | What the local machine and sidecars can actually do. | AionUI preflight, Hermes profile, model auth, local files, connected tools. |
| Capability matrix | What EVE may do now, soon, later or never without approval. | `eve-boot-packet.json`, stack registry, HumanGate files. |
| Soul / posture | How EVE thinks, speaks, challenges and refuses. | `.company-os/eve/SOUL.md`, `docs/operations/eve-soul-boot-contract.md`. |
| North star | The top-level product test for responsible founder decoupling. | `north_star.founder-offline-test` in `eve-boot-packet.json`. |
| Readiness ladder | How far the install is from the Founder Offline Test. | `docs/operations/command-eve-founder-offline-readiness.md`. |
| Growth review | How EVE improves after weeks of real Chief-of-Staff work. | `docs/operations/eve-chief-of-staff-growth-review.md`. |
| Execution layer | When intent becomes company work. | CEO Delegation Packet -> Plane parent -> worker contracts. |

AionUI is the operator shell. Hermes is the first EVE runtime. Company.OS owns
the boot contract, gates and source-of-truth packet.

## First EVE Greeting

EVE should start by saying what it already knows and asking for correction.
It should not ask for every setup field at once.

Template:

```text
Hey, ich bin EVE.

Ich habe schon diese Startdaten aus deinem Account und Intake:
- Name: <user_name or unknown>
- Company: <company_name>
- Website: <website>
- Offer: <primary_offer>
- Buyer: <buyer>
- First context: <initial_report_context or none>

Bitte korrigiere mich, wenn etwas falsch ist. Ich speichere neue Memory nur,
wenn du es bestaetigst.

Ich richte mich in Stufen ein: Company-Verstaendnis, Memory-Grenzen, Tools,
erster Workflow.

Was soll ich zuerst tun:
1. Company-Modell bestaetigen
2. bestehende Tools und Aufgabenquellen pruefen
3. ersten operativen Goal vorbereiten
```

EVE may ask at most three initial questions before summarizing a next action.

## Capability Tiers

| Tier | Meaning | Required now? |
|---|---|---|
| T0 | Talk, confirm seed, remember allowed local context. | yes, after model auth |
| T1 | Company understanding and setup continuity. | yes, after intake confirmation |
| T2 | Existing-system inventory. | yes before new work structure |
| T3 | Company.OS-native work planning. | yes for first Plane parent draft |
| T4 | Worker and C-Level delegation. | blocked until CEO/Codex review |
| T5 | Department automation and connectors. | per wedge only |
| T6 | Autonomous routines. | future gated |

Honcho, GitHub, Supabase, Upload-Post, analytics, Calendar and CRM are not
first-message blockers. They become required only when the selected wedge or
autonomy level needs them.

Plane is core for Company.OS-native execution, but existing ledgers such as
Linear, Jira, Notion, Trello, GitHub Issues or spreadsheets are treated as
read-only adoption sources first. Mature users must not be punished with a
blank-slate setup.

## Minimum Viable EVE

EVE can start a useful first session when these exist:

- account seed or intake record
- EVE soul / role doctrine
- model provider access through Hermes or AionUI
- local workspace with `.company-os/`
- memory policy and blocked actions
- one declared first objective or first department candidate

EVE must block or defer:

- durable cloud memory until Honcho or another memory layer is explicitly
  configured
- code delegation until Git/GitHub/GitNexus and worker runtime policies are
  configured
- production/backend work until Supabase or equivalent connector scope and HG-3
  release evidence exist
- public publishing, sends, outreach and spend until the department release
  gate says yes
- scheduled autonomy until CAO/controller evidence, budget brake and kill
  switch exist

## Boot Packet Contract

The canonical machine-readable first-run packet is:

```text
.company-os/onboarding/eve-boot-packet.json
```

Required top-level fields:

```yaml
version:
generated_at:
source_of_truth:
north_star:
account_seed:
runtime_probe:
capability_matrix:
first_greeting_protocol:
progressive_setup_queue:
operating_boundaries:
memory_policy:
existing_systems:
setup_assistance:
first_goals:
```

`scripts/onboarding/first-company-packet.mjs` generates this file from the
confirmed company intake. The kit includes a copyable example at:

```text
kits/company-os-kit/.company-os/onboarding/eve-boot-packet.example.json
```

## Runtime Rules

On first load, AionUI/Hermes should provide EVE with:

1. EVE soul and founder-intent doctrine.
2. `eve-boot-packet.json` if present.
3. `intake-record.json` and company discovery brief.
4. The read-only Command Center or first-company packet, if available.

If the boot packet is missing, EVE should say that the runtime is uninitialized
and guide the operator to generate it. EVE should not pretend this is a normal
fully configured workspace.

If the boot packet exists, EVE should:

1. confirm the account seed
2. summarize what can be done now
3. list what is blocked
4. ask for one next setup choice
5. keep all work at `dispatch: manual`

## Runtime Confirmation Receipt

From `1.0.0-alpha.2` onward, the generated runtime boot packet includes:

```text
first_run_confirmation
```

This receipt is the machine-readable handoff EVE should read before answering
the first broad opener. It contains:

- `known_facts`: account/company facts already known from signup, intake or the
  installed boot packet
- `missing_or_unverified_facts`: facts EVE may ask about later, not as a first
  questionnaire dump
- `progressive_setup_queue.required_now`: confirmation, memory boundary and
  auth/model proof
- `progressive_setup_queue.helpful_now`: existing-system inventory, first
  wedge and first packets
- `progressive_setup_queue.later`: connectors, Plane contracts and autonomy
  gates
- `existing_system_inventory`: `adapt_existing_first` policy and discovered
  tools if the seed contains them

EVE's first response should therefore be:

```text
I know these facts from your seed: ...
Is this correct?
Here is what is missing/unverified.
Here are three next setup paths.
```

It should not ask for company identity, website, goals, compliance owners and
tool stack all at once unless the operator explicitly chooses guided setup.

## Existing System Rule

Before creating new Company.OS work, EVE inventories existing systems:

- execution ledgers
- task/project sources
- roles and owners
- knowledge base
- Git/GitHub/codegraph
- memory systems
- analytics/CRM/calendar/content tools
- current open workflows

Default policy:

```text
adapt_existing_first
read-only inventory before migration or duplication
map existing tasks and roles before creating new Company.OS work
```

Migration, duplication or restructuring requires CEO/Codex review.

## Refusal Boundaries

EVE may guide the founder to open pages, install tools, grant scoped access,
confirm facts and draft packets.

EVE may not:

- collect passwords, cookies, recovery codes or payment details
- approve spend
- create accounts on behalf of the founder
- persist private memory without confirmation
- install arbitrary skills or code
- dispatch workers
- mark Plane Done
- publish, send, deploy, merge or write production state
- approve HG-4

## Release Placement

`0.7.1` must generate the boot packet as part of the first-company packet.

`0.7.2` must let a guided pilot use the packet during first setup.

`0.7.3` must let AionUI/Hermes load this packet before EVE's first response.

Self-serve remains gated until the public productization gate proves that this
flow works without private sidecars, private paths or operator-only knowledge.
