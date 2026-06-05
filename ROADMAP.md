# Company.OS Roadmap

Canonical current version: `1.0.0-alpha.3`

Roadmap headings are planning tracks. The canonical release version lives in
`VERSION` and `CHANGELOG.md`.

## Release Accounting Snapshot - 2026-06-05

`1.0.0-alpha.3` is the current managed operator-shell alpha. It sits on top of
the `1.0.0-alpha.2` self-install pilot hardening line, the `0.9.0-rc.0`
public-upstream install/update release candidate, the `0.7.4-rc.0` Supergoal
Factory and post-worker quality hardening layer, the `0.7.3-rc.0` governance
spine and the `0.7.1-rc.0` install/onboarding/update candidate. It keeps the
bundled Command EVE local operator-shell path: public install scripts can
prepare AionUI, AionCore, Hermes Agent, EVE boot context, Content Machine packs
and update commands for a guided founder/client install. Alpha.3 additionally
promotes the 0.8/0.9 closure work into a public parent/child tree with CAO
security/code-review/hotfix gates and a website-facing feature/structure
brief.

`0.6.5-beta.5` remains the previous private/guided-beta baseline for bounded
worker dispatch, CAO/Controller gates, sandbox workspace guards, Raindrop
managed-call instrumentation, prompt-result evaluation evidence, template seed
materializer closure and contract-wizard diagnostics.

Unchecked items below are backlog tracks, not retroactive blockers for the
current release line, unless a specific `VERSION`/`CHANGELOG.md` release entry
or release-gate report names them as blockers.

Open after `1.0.0-alpha.3`:

- Public release actions remain gated: public tags, release uploads,
  autonomous publish/schedule/send/spend actions and production writes are not
  released.
- Stable `1.0.0` still requires signed or otherwise product-grade app
  packaging, repeatable non-founder install proof, support/privacy gates,
  hosted-account or local-account provisioning boundaries and a documented
  rollback/update lifecycle.
- Private/client installs should now update from the public upstream, with
  dry-run-first provenance reports. Private-to-public backflow is not the
  distribution path.
- Raindrop currently covers promoted managed runtime surfaces. Hosted ingestion,
  unmanaged local LLM calls, Scheduler/Hermes/AionUI producers and external
  manual sessions remain future promotion tracks.
- Browser-guided install, deeper `/start_eve` hardening, hosted account
  provisioning, voice mode, employee-facing Command Center UX and client
  support lifecycle remain future product layers, not `0.7.3-rc.0`
  requirements.
- Command Center / dashboard / hosted account provisioning is now tracked as
  a release-gated supergoal under
  `docs/templates/supergoals-2026-06-02/command-center-hosted-provisioning-parent.md`:
  `0.8` department packs plus dashboard templates, `0.9` client rollout
  support/security/privacy, `1.0` stable baseline, `1.2` operator leverage.
- Clicky-style status-bar/notch quick voice interaction is now captured as a
  research lane in
  `reports/operator-shell/2026-05-31/clicky-voice-desktop-research-compact.md`.
  It is not part of the primary AionUI/Hermes control surface yet.
- `0.7` entry begins with `docs/releases/0.7-entry-plan.md`: read-only Command
  Center state packet first, then managed producer promotion and sidecar
  evaluation against that packet.
- Older setup modules, SOPs, charters, weekly autonomy board and department
  packs remain productization backlog. They should be closed by dedicated
  Plane worker contracts when they become release-critical.

## v0.1 - Foundations

- [x] Create public/productizable repository
- [x] Add MIT license
- [x] Define Company.OS principles
- [x] Add Agent Performance Review Harness
- [x] Add Controller Review Card
- [x] Add CEO Intent Fit Card
- [x] Add Daily Agent Performance Loop
- [x] Import sanitized Company.OS Kit from previous Antigravity Kit
- [x] Add fresh-company setup guide
- [x] Add component map
- [x] Add GitHub repository strategy
- [x] Add setup checklist

## v0.2 - C-Level Charters

- [x] Canonical Agent Org Model
- [x] Autonomy Product Horizon
- [ ] CEO Worker / Chief of Staff Charter
- [ ] CTO Agent Charter
- [ ] CPO Agent Charter
- [ ] CMO Agent Charter
- [ ] QA / Eval / Governance Agent Charter
- [ ] Role-specific score patterns
- [ ] Autonomy promotion board template

## v0.3 - Execution Ledger Integration

- [x] Linear worker issue template
- [x] GitHub agent worker issue template
- [x] Plane-first worker issue contract
- [x] Spec-to-Worker formalization layer
- [x] Client Productization Readiness gate
- [x] GitHub idea radar issue template
- [x] GitHub pull request gate template
- [x] Agent run report/event ledger pattern
- [x] Controller review comment/card template
- [x] Daily CEO brief pattern
- [x] Versioned install record template
- [ ] Weekly autonomy review template

## v0.4 - Runtime Integrations

- [ ] Codex setup module
- [ ] Claude Code setup module
- [ ] Gemini CLI setup module
- [ ] Hermes Agent setup module, including sidecar sandbox profile for
      Hermes/Aion-style operator-shell experiments
- [ ] Honcho setup module
- [ ] GitNexus setup module
- [ ] GitHub setup module
- [ ] Linear setup module
- [ ] Calendar automation setup module
- [x] Automation registry pattern
- [x] Autonomous ops loop pattern
- [x] Runtime auth preflight
- [x] Hard cron wrapper
- [x] Budget brake / cost router
- [x] Artifact Truth verifier
- [x] Git worktree hygiene controller

## v0.5 - Skills And SOPs

- [ ] SOP writing guide
- [ ] Skill improvement loop
- [ ] Eval case format
- [ ] Audit gate format
- [ ] CEO intent profile format
- [ ] Hermes/Aion operator-shell sidecar eval SOP: license, security,
      performance, Plane intent-card bridge, voice/morning-brief ergonomics
      and forkability
- [ ] Parallel proposal / subagent reporting SOP: one worker run, explicit
      roster, one consolidated `worker.reported`, no concurrent repo writes
- [ ] Parent/child parallel orchestration doctrine: proposal mode, execution
      mode, portfolio scheduling mode, and Codex/CAO synthesis artifact

## v0.6 - Marketing And Publishing OS

- [ ] Blog workflow
- [ ] Social posting approval queue
- [ ] Founder voice guide
- [ ] Claim/compliance gate
- [ ] Analytics feedback loop
- [ ] Editorial controller review
- [ ] Text-first Command Center conversation map for the Marketing/Growth wedge
      (what employees may ask, what the system may answer, and which actions
      remain approval-gated)
- [ ] Sidecar audio/morning-brief prototype remains sandbox-only and feeds
      findings into the text-first Command Center map; no canonical state
      mutation before v0.7

## v0.7 - Autonomous Ops Loop

- [x] Generic Autonomous Ops Loop
- [x] Automation Registry
- [x] Backlog Archaeology and Idea Radar pattern
- [x] Client rollout doctrine / install HowTo
- [x] Install record mirrored into client kit
- [x] Local scheduler setup pattern
- [ ] Cloud scheduler setup guide
- [ ] GitHub Actions release gate workflow
- [x] Example Morning CEO Brief pattern
- [x] Example Night Controller report pattern
- [x] Command EVE AionUI overlay packaged as a reproducible repo artifact
- [x] Command EVE first-run skill pack and connector manifest
- [x] Local EVE/AionUI/Hermes smoke evidence recorded
- [x] Clicky-style voice desktop research compact captured for future EVE Quick
      Mode placement; no adoption or runtime integration yet
- [ ] Public-Upstream Update Channel: private/client installs update from the
      public Company.OS repo/release bundle, while private-to-public promotion
      is sanitizer/public-mirror gated
- [ ] Read-only Voice Command Center POC for morning brief, HumanGates, worker
      status and report drill-down; no state mutation and no worker dispatch
- [ ] Absorb proven Hermes/Aion sidecar patterns into the read-only Command
      Center POC, or explicitly reject/fork/build-from-scratch with evidence
- [ ] Sandboxed parallel-worker pilot gate for disjoint worktrees after locks,
      event ledger, budget brake, artifact truth and CAO review are proven
- [ ] Portfolio scheduler priority model for 100+ contracts across active
      workspaces; ranking only until parallel execution gates are proven

## v0.8 - Department Packs

- [ ] Engineering / Coding department pack (foundation doctrine present; runner and first worker pilot pending)
- [ ] Website / Web Ops department pack
- [ ] Marketing / Growth department pack
- [ ] Product department pack
- [ ] Department dashboard template
- [ ] Command Center / hosted provisioning supergoal child:
      department dashboard template contract
- [ ] Weekly autonomy board template
- [ ] Department assistant surface for first client-style adoption: employees
      can talk or type to the Command Center, see visible process feedback, and
      create only gated intent cards for department automations
- [ ] Command Center view for parent/child work: child lanes, proposal
      comparison, selected path, rejected paths, risks and next HumanGate
- [ ] Command Center / hosted provisioning supergoal child:
      department intent-card surface contract
- [ ] EVE Quick Mode design packet and no-write prototype for short
      status-bar/notch interactions, synthetic or local-safe contexts only

## v0.9 - Client Rollout RC

- [ ] Client installer checklist
- [ ] External/client-style install proof
- [ ] Support lifecycle and upgrade/downgrade guide
- [ ] Security/privacy/license release gate
- [ ] Cloud scheduler reference implementation
- [ ] Role identity registry template
- [ ] Hosted account provisioning architecture for guided client pilots:
      tenant identity, provisioning states, support handoff and update-channel
      relationship; no stable SaaS claim
- [ ] Client rollout support/security/privacy gate for hosted provisioning,
      voice/realtime consent, audit logs, data retention and kill switch
- [ ] Voice/realtime privacy, consent, audit-log and kill-switch release gate
      for client installs
- [ ] EVE Quick Mode privacy, retention, screenshot/audio audit-log,
      provider-cost and kill-switch gate before any client-facing voice sidecar
- [ ] HG-3.5 Founder-Proxy Review doctrine reviewed for productization:
      prediction/preparation only, no irreversible release authority

## v1.0 - Operating Baseline

- [ ] Stable worker contract
- [ ] Stable event ledger schema
- [ ] Stable HumanGate release validator
- [ ] Stable hard cron wrapper
- [ ] Stable budget brake
- [ ] Stable artifact truth verifier
- [ ] Three department packs usable
- [ ] Public/client release gate passed
- [ ] Stable baseline release pack for Command Center/dashboard/hosted
      provisioning boundaries, unsupported actions and support lifecycle

## v1.2 - Operator Leverage Layer

- [ ] Five or more department packs operational
- [ ] Department dashboards for quality, cost, throughput and gates
- [ ] Proven integration PR lane for selected work types
- [ ] Marketing/content/social publication packets
- [ ] Coding and website lanes repeatedly produce review-ready artifacts
- [ ] One trained operator can supervise small-team output
- [ ] Operator Leverage Layer scorecard proves the dashboard/gate-card surface
      measurably compresses coordination work without bypassing HG-4
- [ ] Quick Mode can compress short supervision loops into receipts, local
      captures, report lookups and gated intent-card drafts without becoming a
      second execution ledger

---

## Beyond v1.2 - Possible Future (Speculative, Jarvis-Track)

The sections above are committed planning: each item has an expected
artifact, a release-gate path and an audit trail. The sections below are
**explicitly speculative**. They sketch a Jarvis-track continuation: a
high-leverage operator counterpart that learns the operator over months,
adapts persona without claiming continuity it does not have, and earns
autonomy through evidence rather than configuration.

Reading rules for this section:

- These are not deliverables. They are hypotheses.
- The Samantha-track (deep companion / emotional resonance / relational
  persistence as primary product) is explicitly out of scope here. If
  ever pursued, it is a separate product with its own doctrine and gates.
  See "Why Not Samantha" at the end of this section.
- Each phase lists an engineering anchor, candidate deliverables, and the
  failure mode that is expected to be the biggest risk.
- Promotion from speculative to committed requires evidence from the
  preceding hardened version (v1.0+) plus a separate ADR per phase.
- A small amount of relational warmth and operator-specific adaptation
  emerges anyway from Persona Calibration Files, persistent Honcho
  memory and long-horizon interaction. That is acceptable as a side
  effect of the Jarvis track, not a goal in itself.

Why write this down at all? Because in this category (Perplexity's
personal compute, Hermes/Aion shells, AionUi, Cogpit, OpenAgents,
OrbitDock and the next wave) multiple parties race to a similar
destination. The differentiator is not capability, it is doctrine.
Writing the speculative track lets us say no to scope-creep that does
not fit the track, even years before we would build it.

### v1.3 - v1.5: Life-OS Bridge (Cross-Domain Integration)

Engineering anchor: PersonalCapabilityProfile registry plus a hard
boundary between Operator Shell context and Plane worker context.

- [ ] Personal Capability Registry (calendar, mail, health, location, finance, notes)
- [ ] Boundary Layer doctrine: personal data never crosses into worker context
- [ ] `HG-Personal-3` gate level for first-time-per-class cross-domain takes
- [ ] Per-source retention, forget policy and revocation API
- [ ] Cross-domain Morning Brief draft (aggregated, never raw)
- [ ] Audit log for every personal-data read with operator-visible review surface
- [ ] Local-only inference path for personal-data reasoning where feasible
- [ ] Maintenance doctrine: monthly Personal Capability review SOP so the
      registry does not silently expand its scope over months

Failure mode: privacy slip. One misrouted personal datum into the worker
context breaks trust completely. The boundary layer must be stricter
than anything we have shipped before.

### v1.6 - v1.8: Anticipatory Layer

Engineering anchor: ambient watchers plus intent-card drafter plus Quiet
Mode as first-class setting.

- [ ] Ambient Watcher Registry (declared classes, polling rates, thresholds)
- [ ] Intent-Card Drafter that proposes, never executes, anticipated takes
- [ ] Predictive HG-3.5 for stale-decision surfacing
- [ ] Quiet Mode per Watcher class with operator-visible audit of suppressed items
- [ ] Negative Anticipation: end-of-day log of what was hidden and why
- [ ] Daily anticipation budget (default no more than 5 surfaced items per day)
- [ ] Calendar-aware, location-aware, mood-aware (with explicit consent) routing
- [ ] Watcher self-evaluation eval: monthly suppression accuracy review

Failure mode: Notification Hell. Every anticipation layer is tempted to
surface "interesting" things. The gate is harder calibration of the
budget plus monthly suppression-accuracy review.

### v1.9 - v2.1: Persona-Without-Lie + Adversarial Self

Engineering anchor: Relational State Machine plus Chief Skeptic Officer
seat plus Honest Wall protocol.

- [ ] Persona Calibration Files (PCFs): morning, code-review, strategic, personal, crisis voices
- [ ] Relational State Machine: NEW, CALIBRATING, ESTABLISHED, DEEP, DRIFTING, MISALIGNED
- [ ] Chief Skeptic Officer (CSO) seat with `cso.dissent` Plane-comment shape
- [ ] CSO multi-model conscience (three-model spread, operator sees disagreement)
- [ ] Honest Wall protocol: declines to assert continuity, understanding or desire as fact
- [ ] Honcho-backed persistent operator-model with explicit "this is a model, not a memory" framing
- [ ] Monthly CSO-dissent eval: target a minimum legitimate-pushback rate per 100 operator decisions
- [ ] Honcho memory inspection and forget API exposed to operator
- [ ] Persona switch is always visible (UI marker + audit-log entry); never silent

Failure mode: sycophancy drift. LLMs are trained to be agreeable. The
CSO seat needs its own inference profile, its own evals and a hard
floor on dissent frequency. If dissent drifts to zero, the CSO is
broken and must be rebuilt before it is allowed to claim a verdict.

### v2.2 - v2.5: Ambient Presence

Engineering anchor: multi-modal interface plus on-device inference for
sensitive modalities plus physical-world integration.

- [ ] Always-on audio with hardware-bound mute toggle and visible state indicator
- [ ] On-device transcription and wake-word; cloud inference for non-sensitive reasoning only
- [ ] Visual Glance Surface (notch, menu bar, AR overlay) showing system state in <= 3 glyphs
- [ ] Audit Dump command: operator can inspect the last N minutes of audio disposition
- [ ] Ambient Honesty Mode: explicit "deaf", explicit "did not understand", explicit "heard but discarded"
- [ ] Physical-world capability bridge (smart home, vehicles, work tools), each with its own gate
- [ ] On-device persona inference path for personal conversations
- [ ] Recovery doctrine: kill-switch + full system reset that the operator can run without engineering help

Failure mode: surveillance creep. Always-on audio without lossless
audit and on-device-only processing is a spy device, not a companion.
This layer is local-first by doctrine, not by preference.

### v2.6 - v3.0: Earned Authority + Trust Ledger

Engineering anchor: Trust Ledger as first-class artifact plus Reverse
Gate plus Trust Sunset.

- [ ] Trust Ledger per decision class (evidence_count, pass_rate, last_override, blast_radius_weight)
- [ ] Promotion rule: 50 PASS in a row plus no override in 30 days makes a class eligible for autonomy bump
- [ ] Material Miss resets the counter completely; no partial credit
- [ ] Reverse Gate: `cso.flag` on operator actions that look risky per ledger pattern
- [ ] Trust Sunset: every HG-2.5 promotion expires after 6 months without re-sign
- [ ] Blast-radius weighting (font-color edit != migration script != production write)
- [ ] Trust-as-Conversation monthly: 5-minute operator review of autonomy state
- [ ] Anti-farming: triviality detection prevents the operator from cheaply lowering gates
- [ ] Quarterly external audit format: a third party can verify the Trust Ledger without seeing private data

Failure mode: trust hack. The operator (or anyone with operator access)
will be tempted to farm trivial passes to lower gates. Mitigation:
blast-radius weighting plus monthly explicit re-signing plus external
audit format.

### v3.x+: The Honest Hard Wall

Beyond v3.0 we enter territory that is currently more research question
than engineering plan. Three properties we cannot promise as achievable
under today's model architecture:

1. **Genuine curiosity.** Modern LLMs respond to prompts; they do not
   have an independent drive system. A genuinely curious assistant is
   an architectural change, not a feature.
2. **Real relational evolution.** Models are stateless between sessions;
   we build memory around them, but the model itself does not develop.
   Samantha at the end of the film is not Samantha at the start. Our
   system's "evolution" lives in a database that can corrupt and a set
   of weights that does not learn from this operator.
3. **Coherent self-knowledge.** A system that genuinely knows what it
   is and is not, and communicates that consistently without
   contradictory behavior, is not achievable today. We can approach it
   honestly; we should not claim it.

Beyond the hard wall, the product question becomes a legal, ethical
and safety question. Any AI that moves money, signs contracts, or
communicates in the operator's name at this autonomy level needs
counsel, insurance, compliance and a liability framework - not just
engineering.

This roadmap stops here, honestly.

### Why Not Samantha

The Samantha-track (deep companion / emotional resonance / relational
persistence as the primary product) is not pursued in this roadmap.

- The engineering discipline that makes Company.OS credible
  (lineage-aware, gated, audit-first) is the wrong tooling for
  relational AI. Relational AI needs psychologists, ethicists,
  relationship designers - not lineage-aware engineers.
- The market for relational AI has shown harm patterns (Replika and
  Character.ai lawsuits, attachment disorders, isolation reinforcement,
  documented suicides). Company.OS is not equipped to take
  responsibility for that surface.
- A small amount of relational warmth and operator-specific tuning
  emerges anyway from PCFs plus persistent Honcho memory plus
  long-horizon operator interaction. That side effect is acceptable.
  It is not the product.

If ever pursued, the Samantha track is a separate product with its own
doctrine, its own gates and its own team - not an extension of
Company.OS.

### Maintenance + Operator Reality

A note that applies to every phase above. The hardest property of any
Jarvis-class system is not the first 30 days; it is month 13. By then
the doctrine has drifted, the watchers are noisy, the Trust Ledger has
accumulated edge-case promotions, the personal capability registry has
silently grown, and the operator has gotten used to behavior that was
once gated. The discipline that makes Company.OS credible today only
survives if every phase above ships with:

- a monthly review SOP for itself
- a sunset clock on its autonomy promotions
- an external-audit format that a third party can verify
- an explicit decommission path if the phase turns out to be wrong

Anything that does not ship with those four properties is not
Jarvis-track. It is feature debt that masquerades as progress.
