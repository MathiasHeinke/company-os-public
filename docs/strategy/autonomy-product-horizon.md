# Company.OS Autonomy Product Horizon

Status: strategic horizon
Current Company.OS version: `0.9.0-rc.0`
Current autonomy profile: `Stage 3.65 / 5`, `7.45 / 10`
Current runtime buildout: `Stage 7 / 9 proven, Stage 8-9 gated`
Use for: deciding what must exist before Company.OS becomes beta, 1.0 and 1.2
Last updated: 2026-06-02

## Purpose

This document defines where Company.OS is going over the next 6 to 12 months.

The target is not "agents everywhere." The target is a company operating layer
that can replace most coordination work in specific departments while keeping
trust boundaries explicit.

The practical promise at maturity:

```text
One human operator plus Company.OS can run work that currently requires a small
team, as long as production trust, legal risk, public promises, money and
company direction remain governed.
```

## Current Position

`0.7.1-rc.0` means:

- the first Command EVE/AionUI/Hermes operator-shell start path is packaged as
  repo artifact, not just a local sidecar edit
- EVE has a first-run skill pack that inspects existing onboarding artifacts
  before asking the founder for missing setup context
- connector manifests classify the first required/optional app surfaces EVE
  needs to reason about during setup
- runtime smoke evidence exists for the local guided start path
- a self-serve candidate smoke proves kit install, first onboarding packet,
  EVE boot packet and update dry-run from a fresh target
- the installable kit exists
- the execution-ledger contract exists
- the controller and HumanGate doctrine exists
- Plane is the canonical Company.OS execution ledger; Linear is legacy/bridge
- L1/L2 lanes have executable hardening gates
- L3 can prepare sandbox branches and review packets
- the Plane -> Runtime Dispatcher -> C-Level worker -> CAO -> Codex
  controller chain is proven through Stage 7/9 by the first live headless pilot;
  repeated pilots and scheduler activation remain before default automation
- the Contract Controller Stage 0.5 and Remediation Router Stage 0.6 prevent
  weak work contracts from spawning workers and route repairs through C-Level
- versioned client rollout and install records exist
- Codex CEO boot-pack integration exists for bounded controller sessions
- the Plane auth bridge accepts the `PLANE_API_TOKEN` runtime alias for
  scheduler and edge-style secret injection
- the `goal` command can turn CEO intent into a reviewable GoalState,
  ObjectiveLoop and first Worker Contract draft before Plane execution
- deterministic public mirror generation, clean-clone verification and local
  fresh-history remote rehearsal are executable
- the real GitHub destination push is isolated as an HG-2.5 release action
  rather than a worker-owned step

Current limits:

- no repeated multi-night proof at scale
- no complete department dashboard layer
- no mature cloud scheduler install
- no role identity registry or app-user layer
- no completed self-serve install/update/onboarding path for an arbitrary new
  founder
- no hardened `/start_eve` command, Hermes update-or-pin decision or AionUI
  default-agent/auth preflight
- no full marketing/content/social publishing OS
- no HR, sales, finance or legal operating packs
- no standard customer implementation playbook with support lifecycle
- no 1.0 release gate with security, privacy, license and install evidence

## What Fully Functional Means

Company.OS becomes fully functional when these statements are true:

1. A new company can install it from documented steps without founder-specific
   knowledge.
2. Each core department follows the Department Operating Doctrine and has a
   RoleOwner, CapabilityProfile, queue, dashboard, worker contract, event
   policy, scorecard, daily report and escalation rhythm.
3. At least three departments can run recurring L2/L3 work without manual
   nightly repair.
4. L3 sandbox work repeatedly reaches review-ready patches or artifacts with
   clean controller audit.
5. L4 integration is possible for selected low-risk lanes through explicit
   release validators and rollback paths.
6. HG-3 is CEO/Codex critical authority for hard but reversible/restorable
   work; HG-4 is rare, crisp and high-signal: strategic direction,
   non-restorable data loss, founder voice, major legal/capital exposure.
7. The morning brief is a real reduction layer, not a raw activity log.
8. The system improves itself through proposal-only dreams, evals, SOP updates
   and controller-approved memory/knowledge changes.
9. Costs, model routes and worker quality are measurable.
10. A human can explain what ran, why it ran, what changed, what was blocked and
    what decision is needed.

## Release Ladder

| Version band | Name | Autonomy target | Release standard |
|---|---|---|---|
| `0.2.x-alpha` | Hardened internal alpha | L1/L2 autonomous, L3 sandbox prepared | single-company internal proof |
| `0.3.x-alpha` | Org model alpha | C-level charters, role registry, capability profiles | departments parseable and routable |
| `0.4.x-alpha` | Runtime alpha | local CLI, headless ledger, cost router, scheduler install | recurring jobs run fail-closed |
| `0.5.x-beta` | Quality beta | canonical verdicts, evals, SOP/skill loops | work quality measurable by lane |
| `0.6.x-beta` | Growth beta | marketing/content/social operating pack | campaigns draft autonomously, publish gated |
| `0.7.x-beta` | Ops beta | multi-night ops, backlog archaeology, morning brief, read-only command surface | repeated night proof without repair; operator can inspect and discuss what happened |
| `0.8.x-beta` | Department pack beta | engineering, website, marketing packs, department assistant surface | three domains run L3 safely; employees can use a gated conversational entrypoint |
| `0.9.x-rc` | Client rollout RC | installer, support playbook, security/privacy gate | repeatable installs outside core team |
| `1.0.0` | Operating baseline | safe production-grade operating system | stable contracts and documented limits |
| `1.1.x` | Multi-department scale | 5+ department packs with dashboards | reliable company-function coverage |
| `1.2.x` | Operator leverage layer | one operator can supervise small-team output | measurable replacement of coordination work |

`1.0` does not mean production writes are fully autonomous. It means the system
is honest, repeatable, safe to install and operationally useful without private
scaffolding.

## Command Center And Voice Layer

The conversational surface is an adoption layer, not the control plane. It
should make Company.OS easier to understand and operate, but it must not become
a second ledger, scheduler, memory store or release authority.

Target placement:

1. `0.6.x-beta` defines the first department wedge, usually Marketing/Growth,
   and the text-first conversation map: what employees may ask, what the system
   may answer, what sources it must cite, and which actions remain gated.
2. `0.7.x-beta` introduces a read-only Command Center POC: morning brief,
   HumanGate review, worker status, report drill-down and visible process
   feedback. Voice is allowed only as an input/output channel over read-only
   state.
3. `0.8.x-beta` promotes the surface into department packs. Employees can talk
   or type to the department assistant, inspect what it is doing, and create
   explicit intent cards for automations. The first production-like use case is
   Marketing/Growth because drafts, research, planning and queue hygiene have
   high value and lower trust-boundary risk than finance, legal, HR or
   production engineering.
4. `0.9.x-rc` hardens client install concerns: microphone consent, realtime
   provider choice, data retention, audit logs, session auth, kill switch,
   allowlisted tools and support lifecycle.
5. `1.2.x` is where the surface becomes true operator leverage: one trained
   operator can supervise multi-department output through dashboards,
   conversations, gate cards and drill-down artifacts.

Voice, animation or a face can improve trust and usability, but the control
mechanism is still explicit evidence: every meaningful answer links back to a
Plane item, report, event row, source document, diff or approved dashboard.
State-changing commands must become visible intent cards before execution.

## Command Center / Dashboard / Hosted Provisioning Supergoal

The current public RC proves a local/public-upstream install path. It does not
ship hosted account provisioning, a multi-tenant dashboard or stable SaaS.

The next product surface is tracked as a release-gated supergoal:

```text
docs/templates/supergoals-2026-06-02/command-center-hosted-provisioning-parent.md
```

Gate map:

1. `0.8.x`: department packs plus dashboard templates. The Command Center can
   show department read models, parent/child lanes, proposal comparisons,
   rejected paths, risks and next HumanGate. It still cannot become a second
   ledger or run workers by itself.
2. `0.9.x`: client rollout, support, security and privacy. Hosted account
   provisioning may be designed and proven in guided form only after tenant
   identity, data retention, audit logs, support ownership, kill switch and
   privacy gates are explicit.
3. `1.0.0`: stable operating baseline. The install/update/support/contracts
   layer is stable and documented, with known unsupported actions and at least
   three usable department packs. This still does not imply ungated production
   writes or autonomous founder decisions.
4. `1.2.x`: operator leverage layer. A trained operator can supervise
   multi-department output through dashboards, gate cards, EVE conversations
   and evidence drill-downs. The claim is measurable coordination replacement,
   not generic AI capability.

Hosted provisioning is therefore a v0.9+ architecture and security/privacy
problem, not a hidden requirement for `0.9.0-rc.0`.

## Hermes Operator Shell Sidecar

The Hermes/Aion-style operator shell is a formal sidecar, not a competing
control plane. Its purpose is to let the operator learn the future surface
early while Company.OS continues to harden v0.4, v0.5 and v0.6.

Sidecar work may evaluate AionUi, Hermes-native dashboards, local desktop
shells, audio input/output, morning brief presentation, external intelligence
feeds and Mac-mini worker-node ergonomics. It may not replace Plane, skip
Worker Contracts, create a second scheduler, bypass CAO/Codex Controller, or
auto-approve state-changing actions.

The absorption point is v0.7: only proven, sandboxed and audited patterns move
into the read-only Voice Command Center POC. Until then, the sidecar is a
learning and UX-validation lane.

`HG-3.5` is the Chief-of-Staff / Founder-Proxy Review layer. It can prepare and
predict founder decisions from precedent and evidence, but it is not final
Founder authority. Promotion from HG-4 to HG-3.5-assisted, HG-3 or a lower gate
requires repeated green evidence and a separate governance update.

## Six-Month Target

Six months from the current alpha, Company.OS should be able to run an internal
or paid pilot across three hardened departments:

1. Engineering / Coding
2. Website / Web Ops
3. Marketing / Content / Growth

Minimum state:

- role identity registry exists
- department dashboards exist
- worker queues are parseable
- local and cloud scheduler options are documented
- every recurring job uses hard cron, locks, budget brake and artifact truth
- every department has a CapabilityProfile
- every department has an OutcomeSpec and review harness
- every department has a daily report sink and CEO escalation format
- every department has a weekly autonomy board
- every L3 implementation uses deterministic branch/worktree naming
- engineering work uses a CTO daily report with GitHub, CI, sandbox and
  worktree stewardship signals before release decisions
- every generated artifact has provenance, freshness and owner fields
- every model route reports cost, quality and failure mode

What this enables:

- coding team compression: one senior operator can supervise multiple L3 worker
  slices instead of manually writing every patch
- website operations: daily content, SEO, bugfix and landing-page updates can
  reach review-ready packets repeatedly
- marketing operations: research, offers, campaign drafts, reply queues,
  creative briefs and analytics loops can run with gated publication

## Twelve-Month Target

Twelve months from the current alpha, Company.OS should support a broader
operating company:

- Engineering
- Product
- Website / Web Ops
- Marketing / Growth
- Social / Content
- Creative / Video
- Sales / Business Development
- Customer Ops / Support
- Finance / Budget
- HR / Hiring
- Legal / Compliance / Security
- Knowledge / Memory / SOP Governance

The target is not to eliminate humans. The target is to collapse repeated
coordination, drafting, checking, routing and reporting work into agentic
operating lanes.

Expected maturity by `1.2.x`:

- marketing team replacement for 60-80% of non-final-publish work
- website team replacement for most routine updates, QA and optimization
- coding team compression where one engineer supervises multiple sandbox
  workers and reviews integration candidates
- content team compression where humans approve taste, claims and release
  while agents produce drafts, variants, metadata, assets and analytics
- operations team compression through ticket triage, SOP generation, follow-up
  routing and customer handover packets

## Missing Product Areas

These areas are not yet sufficiently covered.

### 1. Client Onboarding And Business Pressure Test

Need:

- public AI Business Blueprint bridge for founder education and pre-audit intake
- company discovery brief
- website/public-surface scan
- market and competitor map
- business pressure test
- AI/GDPR/governance readiness
- Company.OS fit score
- savings/capacity calculator
- first department rollout recommendation

Why:

Company.OS should not automate a company it does not understand. The first
commercial install must prove that the company has a real pain, clear buyer,
safe first department wedge and governance readiness before department packs are
rolled out.

### 2. Department Dashboards

Need:

- CEO dashboard
- C-level dashboards
- controller dashboard
- worker run dashboard
- cost and quality dashboard
- HumanGate queue
- stale work and forgotten work dashboard

Why:

Autonomy without visibility becomes invisible risk.

### 3. Role Identity And Permission Layer

Need:

- role identity registry
- email alias policy
- app-user/service-account policy
- OAuth/keychain/vault integration
- allowed send targets
- forbidden target policies
- audit log per role

Why:

Native tool identity is useful only after accountability and permission scope
are explicit.

### 4. Department Packs

Need reusable packs for:

- Engineering
- Website
- Product
- Marketing
- Social/Content
- Creative/Video
- Sales/BD
- Customer Ops
- Finance
- HR
- Legal/Compliance
- Knowledge/Memory

Each pack needs:

```text
charter
CapabilityProfile
queue template
worker templates
OutcomeSpec
EventPolicy
dashboard
scorecard
stop rules
HumanGate rules
weekly autonomy board
```

### 5. Cloud Scheduler And Remote Runtime

Need:

- local Mac scheduler pattern
- cloud scheduler pattern
- retry and backoff policy
- kill switch
- remote secrets handling
- artifact storage
- signed webhook policy
- managed-agent adapter
- fail-closed run contract

Why:

Night work cannot depend forever on one local machine and manual auth repair.

### 6. Release And PR Automation

Need:

- sandbox PR autopilot to draft PR packets
- integration PR lane for selected low-risk areas
- protected branch checks
- release validator
- rollback documentation
- automated changelog preparation
- no-auto-merge defaults
- L4 approval board

Why:

Coding autonomy becomes valuable only when patches repeatedly reach a reviewable
integration lane.

### 6. Marketing, Social And Publishing OS

Need:

- offer and positioning workflow
- campaign planner
- editorial calendar
- content brief generator
- reply queue
- claim/compliance gate
- visual/video asset workflow
- channel-specific publishing packets
- analytics feedback loop
- brand/taste review harness

Boundary:

External publishing remains HG-2.5/HG-3 depending on risk until the company
explicitly delegates it; founder-voice or strategic public commitments remain
HG-4.

### 7. Creative And Video Pipeline

Need:

- script workflow
- storyboard workflow
- asset provenance
- render QA
- accessibility/caption checks
- brand consistency harness
- channel export profiles
- approval queue

Why:

High-output companies increasingly need video and visual systems, not only text.

### 8. Sales, Customer Ops And CRM

Need:

- account research
- CRM hygiene
- outreach drafts
- meeting prep
- follow-up packets
- support triage
- customer health summaries
- renewal/upsell signals

Boundary:

External send, pricing commitments and contractual promises remain gated.

### 9. HR And Organization

Need:

- role scorecards
- hiring pipeline
- interview packets
- candidate evaluation rubric
- onboarding checklist
- internal SOP training
- performance review templates

Boundary:

Hiring decisions, offers, terminations and sensitive people decisions stay
human-owned.

### 10. Finance, Legal, Security And Compliance

Need:

- budget envelopes
- spend preflight
- invoice/revenue dashboard
- legal claim checklist
- privacy impact checklist
- security review harness
- incident response workflow
- access review rhythm

Boundary:

Bounded spend and security-sensitive production actions may be HG-3 when
reversible/restorable and evidenced. Major legal/capital exposure, regulated
public liability and non-restorable security actions stay HG-4 unless
explicitly delegated by governance update.

## The Path To Lower Human Gates

Human gates should be reduced by evidence, not desire.

Promotion checklist for any lane:

1. Same work type succeeds repeatedly.
2. Artifacts are fresh, findable and complete.
3. Controller accepts output without major rework.
4. Cost is within budget.
5. No private data or secret leaks.
6. Rollback or stop path is named.
7. Failure mode is known and bounded.
8. The department owner trusts the lane.
9. Morning briefs reduce decisions correctly.
10. Human corrections are converted into updated profiles, evals or SOPs.

If these are true, a lane can move:

```text
L1 -> L2: from plan/report to live read-only verify
L2 -> L3: from verify to sandbox artifact or patch
L3 -> L4: from sandbox to integration PR or staging action
L4 -> L5: only with explicit governance delegation
```

## 1.0 Release Bar

Company.OS reaches `1.0.0` when:

- versioning and install record are stable
- worker contract is stable
- event ledger schema is stable
- HumanGate release validator is stable
- hard cron wrapper is stable
- budget brake is stable
- artifact truth verifier is stable
- at least three department packs are usable
- at least one external/client-style install has completed
- docs are publishable and free of private context
- tests and page index are green
- security and secret scans are reviewed
- support/upgrade/downgrade docs exist
- known unsupported actions are explicit

## 1.2 Release Bar

Company.OS reaches `1.2.x` when:

- five or more department packs are operational
- cloud scheduler and local scheduler are both supported
- role identity and permission model are usable
- multiple model providers can be routed by cost and quality
- department dashboards show quality, cost, throughput and blocked gates
- integration PR lane is proven for selected work types
- marketing/content/social packs can produce high-quality publication packets
- coding and website lanes repeatedly produce review-ready artifacts
- support lifecycle exists for installed companies
- one trained operator can supervise what previously required a small team

## Strategic Direction

The next qualitative jump is not more prompts. It is productizing departments.

Priority order:

1. Canonical org model and role registry.
2. Department dashboards.
3. Engineering/Web/Marketing department packs.
4. Multi-night proof with hard gates.
5. Read-only Command Center surface for morning brief, gate review and worker
   observability.
6. Sandbox PR to integration PR lane.
7. Marketing/content/social publishing OS.
8. Department assistant surface for client-style adoption.
9. Client installer and support lifecycle.
10. HR, finance, legal, compliance and sales packs.

This is the road from the current alpha to a real operating company layer.
