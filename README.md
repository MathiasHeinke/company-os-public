# Company.OS

Company.OS is an AI-native operating system for small companies, founders, and
agentic teams.

Current version: `0.9.0-rc.0`

Current productization status: public self-serve release candidate, not stable.
Company.OS now has a public-first install path: a sanitized public clone or
public mirror artifact can install a fresh target from generic signup/report
seed, generate EVE's first boot packet, write update provenance and produce a
public-RC handoff report. The 0.9 RC carries forward the 0.7.4 Supergoal
Factory hardening, post-worker quality lane and lower-worker audit/hotfix
profiles, but external posting, outreach sends, spend changes, production
writes, scheduler-default-on, Plane Done, stable self-serve claims, tags and
release uploads remain gated.

Current runtime proof: Stage 7 / 9 proven by live pilots; Stage 8-9 still
gated.

It turns high-level CEO intent into structured work:

```text
CEO Intent
-> Company Strategy / Handbook / Memory
-> Execution Ledger
-> C-Level Agents
-> Worker Agents
-> Output Quality Gates
-> Work Performance Reviews
-> Controller Review
-> CEO Decisions
-> Next Iteration
```

The goal is not autonomous busywork. The goal is calibrated autonomy:

- agents know their role before they use tools
- work is split into bounded, reviewable units
- output quality is gated before it ships
- the way agents work is scored and improved over time
- CEO time is protected by short, decision-ready reports
- autonomy increases only after repeated proof

## Relationship To AI Business Blueprint

AI Business Blueprint is the public founder-diagnostic front door:

```text
https://github.com/MathiasHeinke/ai-business-blueprint
```

Use it to educate founders, collect initial business context, pressure-test
their offer and route qualified companies into a paid Company.OS readiness
audit.

Company.OS is the installable operating layer after that audit. It owns the
execution ledger, role owners, worker contracts, runtime gates, memory split,
controller review, department rollout and HumanGate model.

## Quick Start

For a new company or a clean MacBook setup, start from the public source:

```bash
git clone https://github.com/MathiasHeinke/company-os.git
cd company-os

node scripts/install/public-rc.mjs install \
  --target /path/to/company-workspace \
  --company "Acme Systems" \
  --website "https://acme.example" \
  --offer "AI operating-system setup" \
  --buyer "founder-led service firms" \
  --founder "Jane Founder" \
  --approval-owner "Jane Founder" \
  --first-department marketing \
  --json
```

The public-RC installer performs the bootstrap dry-run, kit install, intake
write, EVE boot packet generation, update dry-run and handoff report in one
bounded flow. It writes EVE's first-run boot packet to:

```text
/path/to/company-workspace/.company-os/onboarding/eve-boot-packet.json
```

It also writes the release-candidate handoff to:

```text
/path/to/company-workspace/reports/company-os-public-rc/YYYY-MM-DD/company-os-public-rc-0.9.0-rc.0.md
```

1. [Fresh Company Setup](./docs/bootstrap/fresh-company-setup.md)
2. [Versioning](./docs/releases/versioning.md)
3. [Client Productization Readiness](./docs/operations/client-productization-readiness.md)
4. [Client Rollout Doctrine](./docs/operations/company-os-client-rollout-doctrine.md)
5. [Client Onboarding Discovery Pipeline](./docs/operations/client-onboarding-discovery-pipeline.md)
6. [Install Record Template](./docs/templates/company-os-install-record.md)
7. [Company Discovery Brief](./docs/templates/company-discovery-brief.md)
8. [Spec-to-Worker Pipeline](./docs/orchestration/spec-to-worker-pipeline.md)
9. [Worker Issue Contract](./docs/templates/worker-issue-contract.md)
10. [Goal Command](./docs/operations/goal-command.md)
11. [Capability Registry](./docs/registries/capability-registry.md)
12. [Agent Org Model](./docs/architecture/agent-org-model.md)
13. [Autonomy Product Horizon](./docs/strategy/autonomy-product-horizon.md)
14. [Component Map](./docs/architecture/component-map.md)
15. [System Index](./docs/system-index.md)
16. [Generated Page Index](./docs/page-index.md)
17. [Obsidian Brain Interface](./docs/operations/obsidian-brain-interface.md)
18. [Operating System Setup Checklist](./docs/operations/operating-system-setup-checklist.md)
19. [Governance Directives](./docs/governance/directives.md)
20. [Agentic Sandbox Control Doctrine](./docs/governance/agentic-sandbox-control-doctrine.md)
21. [CEO Controller Agentic Protocol](./docs/operations/ceo-controller-agentic-protocol.md)
22. [HumanGate Decision Brief](./docs/templates/human-gate-decision-brief.md)
23. [Founder Decision Profile](./docs/templates/founder-decision-profile.md)
24. [Autonomous Ops Loop](./docs/operations/autonomous-ops-loop.md)
25. [Client Installable Autonomous Work Order Pipeline](./docs/operations/client-installable-autonomous-work-order-pipeline.md)
26. [Automation Registry](./docs/operations/automation-registry.md)
27. [Daily Improvement Dream](./docs/operations/daily-improvement-dream.md)
28. [Autonomy Shadow Run](./docs/operations/autonomy-shadow-run.md)
29. [Sandbox PR Autopilot](./docs/operations/sandbox-pr-autopilot.md)
30. [Git Worktree Hygiene Controller](./docs/operations/git-worktree-hygiene-controller.md)
31. [Company.OS Kit](./kits/company-os-kit/README.md)
32. [GitHub Repository Strategy](./docs/github/repository-strategy.md)

## Readiness

`0.9.0-rc.0` is the public self-serve release candidate for the install,
onboarding and update path. It carries the `0.7.4-rc.0` Supergoal Factory
substrate forward and closes the public-upstream distribution path for fresh
targets.

For installs, this is a release candidate and not stable. The public clone or
fresh-history mirror is the distribution source, but tags, release uploads,
unsupported stable rollout, production writes and default-on autonomy remain
gated. Before any public remote push, tag, package or broader release action,
run:

```bash
node scripts/release/build-public-mirror.mjs --out /tmp/company-os-public --verify
node scripts/release/verify-clean-clone.mjs --root /tmp/company-os-public
node scripts/release/verify-fresh-history-remote.mjs --json
```

For private/guided alpha work:

```bash
node scripts/release-gates/productization-readiness.mjs check
```

For the current public-RC install drill:

```bash
node scripts/install/public-rc.mjs install \
  --target /tmp/company-os-rc-target \
  --company "Acme Systems" \
  --website "https://acme.example" \
  --offer "AI operating-system setup" \
  --buyer "founder-led service firms" \
  --approval-owner "Jane Founder" \
  --first-department marketing \
  --date YYYY-MM-DD \
  --json
```

This proves install, first onboarding packet generation, update provenance and
public-RC handoff together against a fresh target. Passing it is necessary for
the release candidate, but it is not a stable unattended autonomy release.

The private staging tree still contains internal `reports/` and live
`metrics/*.jsonl` ledgers. They are allowed in private staging and intentionally
remain source-tree `--public-release` blockers. The public mirror builder must
strip them from the derived public artifact.

## Public Release Roadmap

**Company.OS 0.7.0-alpha.1** is the EVE / AionUI / Hermes guided alpha.

The 0.5 PUB track closed the practical public-artifact blockers by using a
fresh-history public mirror strategy, deterministic mirror builder, clean-clone
verifier, installer prerequisites and output-only invariant scrubber.
`0.5.1-alpha.1` adds the first full local remote rehearsal: current main can
generate a sanitized mirror tree, initialize it as a fresh-history repository,
push only to a local temporary bare remote, clone it back and install the kit
from that clone.
`0.5.2-alpha.1` keeps that public-mirror substrate intact and adds the safety
layer needed before broader guided installs: adaptive domain pack validation,
freshness checks before Plane materialization, draft-only external action
boundaries and an auditable self-fix acceptance path.
`0.6.0-beta.1` adds the first department wedge on top of that substrate:
Marketing/Growth planning, approval and review contracts for blog, social,
claim/compliance, analytics and editorial controller work.
`0.6.1-beta.1` adds the local Raindrop prompt-result quality loop.
`0.6.2-beta.1` extends safe Raindrop call summaries from Runtime Dispatcher
worker spawns to hard-cron wrapper launches, Plane UI cadence worker launches
and deterministic Codex Controller decisions.
`0.6.3-beta.1` adds Model Router coverage for Claude CLI, Gemini CLI and Codex
OpenRouter worker spawns.
`0.6.4-beta.1` adds the executable Raindrop observability coverage policy:
managed Company.OS calls get safe summaries, only high-signal runs get deep
prompt/result evaluation, and private/manual ideation stays out unless promoted
into a managed Plane/Goal/runtime run. Hosted ingestion, arbitrary manual
sessions, Hermes / AionUi calls and future model-backed Codex Controller LLM
calls remain gated.
`0.6.4-beta.2` hardens that policy with live RS-01 to RS-03 pipeline evidence:
`NEEDS_HUMAN` is classified separately from hard failures, all canonical managed
surfaces are accounted for as either instrumented or explicitly not-yet
instrumented, and the Raindrop adapter tests fail on silent coverage drift.
`0.6.4-beta.3` promotes `goal-runtime/worker-run` into the instrumented managed
surface set through RS-04: Goal Runtime adapter output now carries a safe
`raindrop_hook`, and the Raindrop call adapter can build post-run summaries
without raw prompts, workspace paths or private context.
`0.6.5-beta.1` adds the RS-06 hook-shape validator: promoted managed surfaces
must carry required safe `raindrop_hook` fields, use a known instrumented
surface and valid agent, and reject raw/private fields such as raw prompts, API
keys, workspace paths, browser storage and customer data. This keeps Raindrop
selective and useful: observe Company.OS-managed calls, not every arbitrary
private/manual model session.
`0.6.5-beta.2` adds the RS-07 builder-coverage harness: every currently
instrumented Raindrop surface must be mapped to an explicit summary builder, and
future surfaces such as Scheduler, Hermes and AionUI remain blocked until their
builders exist and pass tests.
`0.6.5-beta.3` elevates that invariant into Runtime Dispatcher preflight:
broken `INSTRUMENTED_SURFACES` / `SURFACE_BUILDER_REGISTRY` coverage now blocks
before Claude spawn with `runtime.raindrop-builder-coverage-broken`, while
Scheduler, Hermes, AionUI, hosted ingestion and arbitrary manual sessions remain
out of scope.
`0.6.5-beta.4` adds the matching RS-09 hook-producer preflight:
`RAINDROP_HOOK_PRODUCER_REGISTRY` and `REQUIRED_HOOK_PRODUCERS` now validate
that every declared Raindrop hook producer emits safe `raindrop_hook` metadata
through real producer code before worker spawn. Missing producers, invalid hook
shape, forbidden private fields, non-callable factories, throwing factories and
not-yet-instrumented surfaces block with
`runtime.raindrop-hook-shape-broken`.
`0.6.5-beta.5` adds the RS-10 sandbox workspace alias guard: edit-capable
`Mode: implement` + `Sandbox: required` contracts now block before worker spawn
when they declare `Workspace: registry:company-os`, a bare `company-os` slug,
the canonical source checkout, the sandbox root itself or a traversal path
instead of a concrete absolute sandbox worktree. The stable reason is
`runtime.sandbox-workspace-alias-unsafe`.
`0.7.0-alpha.1` adds the first Command EVE operator-shell packaging layer:
AionUI overlay patch/assets, Hermes/EVE first-run skill context, connector
manifest/schema and local runtime smoke evidence. This is a guided alpha for
EVE/AionUI/Hermes work, not self-serve stable.

`0.7.1-rc.0` adds the self-serve candidate drill for install, onboarding packet
generation and update dry-run. It is a release candidate for the
install/onboarding/update path, not a stable unattended public release.

`0.7.3-rc.0` adds the Command EVE v1.3 governance spine, goal/supergoal runtime
planner, dispatcher runtime-effort guard, WorkerConfidence contract, Command EVE
runtime policy gate and public mirror include-list v2. It is still a release
candidate, not stable unattended public distribution.

`0.7.4-rc.0` adds the reusable Supergoal Factory layer proven during the ATLAS
private run: the Execution Ladder keeps built / integrated / live truth
separate, State-Truth Pass and HG-2.5 Merge Readiness Pack become canonical,
the controller writes scheduler-visible `controller.audit-followup` and
`controller.hotfix-request` markers instead of spawning follow-up workers, and
the public mirror includes the generic Post-Worker Quality Registry plus
lower-worker capability profiles. It is still a release candidate, not
scheduler-default-on or stable unattended client autonomy.

`0.9.0-rc.0` closes the public-upstream install/update path: the public clone
or sanitized public mirror contains the domain-pack, Plane-template and
post-worker-quality registries needed for a fresh external install, and
`scripts/install/public-rc.mjs` collapses bootstrap, onboarding, EVE boot packet
and update provenance into one generic flow.

```bash
node scripts/release/build-public-mirror.mjs --out /tmp/company-os-public --verify
node scripts/release/verify-clean-clone.mjs --root /tmp/company-os-public
node scripts/release/verify-fresh-history-remote.mjs --json
```

Public publishing is a separate HG-2.5 action. This private repo is still the
source control plane and contains reports/metrics that must never be copied to
the public artifact. The approved 2026-05-18 HG-2.5 action pushed only the
generated fresh-history mirror to
`https://github.com/MathiasHeinke/company-os-public`. Do not push the private
history to a public remote.

Company.OS 0.9.0-rc.0 remains a public release candidate. Scheduler-default-on,
full department autonomy, autonomous publish/schedule/send actions, spend
changes, production writes, Plane Done, public tags/release uploads and stable
unsupported self-serve claims stay gated past this cut.

## Company.OS Kit

The installable kit lives at:

```text
kits/company-os-kit/
```

It packages the reusable workspace layer:

- agent rules
- agent workflows
- persona/router system
- knowledge files
- memory-bank templates
- engine/eval templates
- MCP gateway templates
- AGENTS.md and semantic-context templates

The folder `.antigravity/` is kept inside the kit for compatibility with the
existing workflow ecosystem. The productized name is Company.OS Kit.

## Core Ideas

1. **Role first, runtime second**
   Claude, Codex, Gemini, humans, and future tools are runtimes. A Company.OS
   agent is defined by role, mandate, inputs, outputs, decision rights, stop
   rules, gates, and reporting.

2. **Execution ledger, not memory dump**
   Work systems such as Linear should contain tasks, blockers, owners,
   dependencies, acceptance criteria, gates, and status. Long-term truth belongs
   in strategy docs, memory, code repos, wikis, and ADRs.

3. **Output quality and work quality are separate**
   A result can be good while the process was bad. A blocked result can still
   be excellent work if the agent caught the right risk. Company.OS scores both.

4. **Controller review improves the system**
   Every agent can self-review, but no agent self-promotes. A controller reviews
   work, detects calibration gaps, and turns them into SOP, skill, harness, eval,
   and audit-gate improvements.

5. **Sandbox before edit-capable autonomy**
   Agents that can edit code or operating-system artifacts work in isolated,
   deterministic sandbox branches/worktrees. Worker state, controller state,
   issue state and merge/release state are kept separate.

6. **Founder and CEO are separate roles**
   The founder owns mission, taste, trust, capital and final human gates. The
   CEO/controller owns orchestration, sequencing, delegation, review and
   decision surfaces inside approved autonomy.

7. **HumanGate is a decision surface**
   A human gate is not a raw audit dump. Controllers use `HG-1` cards, `HG-2`
   briefs and `HG-3` dossiers with a recommendation, blocked actions,
   reversibility and founder-decision confidence.

8. **CEO intent fit is a separate layer**
   Every important agent run asks: "Would the CEO have wanted it this way?" This
   is observed first, then used to improve prompts, charters, score patterns,
   and next-step decisions.

9. **Automation must be explainable**
   Night runs, morning briefs, backlog sweeps, idea radars and department lanes
   must have source-of-truth docs, report paths, stop rules and human gates.
   A company should know what ran, why it ran, what it changed, and what it was
   forbidden to do.

10. **Dreaming is proposal-only**
    Daily improvement dreams consolidate process learnings into reviewable
    proposals. They may write reports and event rows, but durable memory, SOP,
    skill, harness or Linear changes require controller or CEO review.

11. **Sandbox PRs stop at human review**
    Edit-capable workers may reach a deterministic sandbox branch, worktree and
    draft PR packet. Merge, push, deploy, production writes, memory writes and
    Done transitions remain blocked until explicit review.

12. **Shadow autonomy before real autonomy**
    Before raising a lane from audit/report to implementation, the controller
    can run a shadow pass that predicts dispatch, branch, worktree, worker,
    events, likely rejection reasons and the next safe real action without
    changing state.

## Repository Status

This repository is the productizable/open-source track for Company.OS work.

Private company implementation layers may be more specific. This repository
should stay reusable, clean, and safe to publish.

Current status:

- `0.9.0-rc.0` is the current public self-serve release candidate. It
  includes the 0.6.5 Plane-first runtime substrate, the 0.7.0 AionUI/Hermes/EVE
  operator-shell packaging, the 0.7.1 install/onboarding/update smoke, the 0.7.3
  governance spine, goal/supergoal planner, confidence reporting, the 0.7.4
  post-worker quality / lower-worker scheduler handoff doctrine and the 0.9
  public-RC install wrapper. Public remote push, autonomous publishing, scheduling,
  outreach sends, spend changes, production writes, regulated claim approvals,
  direct controller spawning and stable unattended self-serve installs remain
  gated.
- `0.7.4-rc.0` was the Supergoal Factory and post-worker quality release
  candidate.
- `0.7.1-rc.0` was the first self-serve install/onboarding/update candidate.
- `0.7.0-alpha.1` was the EVE / AionUI / Hermes guided alpha that first made
  the installable EVE boot path explicit.
- `0.6.5-beta.5` was the runtime-hardening beta with Raindrop managed-call
  coverage, hook-shape/builder preflights and sandbox workspace alias guards.
- `0.5.2-alpha.1` was the adaptive onboarding safety alpha with domain pack
  registry validation, intake freshness guards, finance/external-action gating
  and deterministic Controller Self-Fix Acceptance.
- `0.5.1-alpha.1` was the public-mirror validation alpha with fresh company
  install smoke and local fresh-history remote dry-run evidence.
- `0.5.0-alpha.1` was the first public-mirror-ready alpha.
- `0.4.1-alpha.1` was the Plane-first, Spec-to-Worker-aware guided
  client-rollout alpha with executable pre-dispatch contract review, C-Level
  remediation routing, bounded runtime proof, executable 0.4 readiness gate,
  Codex CEO boot pack, Plane auth bridge compatibility and the pre-Plane
  `goal` command for shaping CEO intent into reviewable GoalState drafts.
- `0.2.0-alpha.1` was the first canonical versioned client-rollout alpha.
- `v0.1` foundation committed.
- `v0.1-kit` imported from the previous Antigravity Kit, sanitized by excluding
  `.env`, `node_modules/`, and `.DS_Store`.
- Client Productization Readiness defines the exact boundary between
  guided done-for-you install, self-serve release and public publishability.
- Client Rollout Doctrine captures the current installable pipeline, learned
  gates, rollout phases, stop rules and upgrade checklist.
- Spec-to-Worker Pipeline maps GitHub Spec Kit / `specify` patterns into Plane
  worker contracts, capability gates, runtime dispatch, CAO and controller.
- Capability Registry validates allowed plugins, connectors, tools, subagents
  and Honcho boundaries before worker runtime dispatch.
- Client Onboarding Discovery Pipeline adds the required company-discovery,
  market-map, business-pressure-test, AI/GDPR-readiness, fit-score and first
  department-rollout layer before full deployment.
- Install Record template pins version, autonomy profile, HumanGate owners and
  disabled lanes for each new company rollout.
- Agent Org Model captures the productizable Founder/CEO/C-Level/Controller/
  Worker/Capability separation.
- Autonomy Product Horizon defines the path from current alpha to beta,
  `1.0.0` and `1.2.x`.
- Autonomous Ops Loop, Automation Registry, Night Shift, Backlog Archaeology and
  Idea Radar patterns have been extracted from the internal pilot into generic
  Company.OS docs.
- Client-installable autonomous work-order pipeline is documented and mirrored
  into the kit for paid or third-party company setups.
- Daily Improvement Dream v0.1 is executable and can insert proposal-only
  improvement findings into the morning CEO brief.
- Sandbox PR Autopilot v0.1 can validate L3 worker contracts and prepare
  human-review packets without auto-merge.
- Autonomy Shadow Run v0.1 can simulate the next L3 autonomy decision without
  worktree creation, event append, Linear write, memory write or worker start.
- Git Worktree Hygiene Controller v0.1 can block dirty roots and dirty sandbox
  worktrees before unattended night jobs without deleting or resetting anything.
- Runtime Dispatcher v1.2 has live pilot proof, durable stream logs,
  heartbeat telemetry and kill-switch/scope-drift guards, but scheduler
  default-on remains gated.
- GitHub publishing is prepared but stays behind the productization readiness
  and public sanitize gates.

## License

MIT. See [LICENSE](./LICENSE).
