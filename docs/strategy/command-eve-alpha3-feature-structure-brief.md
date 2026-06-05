# Command EVE 1.0.0-alpha.3 Feature and Structure Brief

Status: website and positioning substrate
Date: 2026-06-05
Product version: `1.0.0-alpha.3`

## Short Positioning

Command EVE is a local-first AI operating system for founders and small teams.
It does not try to be another chat window. It turns founder intent into a
structured company operating loop: EVE captures and sharpens the intent, the
CEO/controller turns it into C-Level work, C-Level lanes prepare bounded worker
contracts, and CAO/security/review gates decide what is safe to ship.

The user can still use Claude Code, Codex, Gemini, Hermes, OpenRouter models or
future runtimes. Command EVE is the layer above them: role, memory, contracts,
gates, update path, audit trail and company context.

## What Alpha3 Includes Today

### 1. Local Command EVE Operator Shell

- One guided self-install command from the public source.
- Pinned AionUI `v2.1.10` source overlay.
- AionCore `v0.1.19` as local backend.
- Hermes Agent `0.15.2` in a local Python venv.
- Generated `start_eve` and `update_eve` commands inside the target workspace.
- Command EVE UI identity with `⌘ EVE` and installed version surfaced from
  `VERSION`, not a stale hardcoded UI string.

### 2. EVE Chief-of-Staff Boot Layer

- EVE SOUL and runtime policy.
- First-run boot packet from signup/report seed.
- Known company facts, missing facts and progressive setup queues.
- "Inspect what exists first" onboarding: EVE checks existing tools/systems
  before forcing a new Company.OS structure.
- Proposal-only Founder Intent Packets and CEO Delegation Packets.

### 3. BYOK Superbrain Boundary

- Default inference profile: OpenRouter / MiniMax M3.
- Provider auth preflight through `start_eve --auth-check`.
- Missing key, quota or network issues return `BLOCKED_AUTH`, not a broken
  install.
- Command EVE does not collect raw API keys in chat or repository files.

### 4. Company.OS Kit

- Reusable workspace template.
- Agent rules, workflows, personas, memory-bank templates and semantic context.
- Install record and company discovery artifacts.
- Plane-first execution ledger doctrine.
- Spec-to-worker pipeline and parseable Worker Issue Contract templates.

### 5. Plane Parent/Child Execution System

- Work becomes parent/child contracts, not vague chat tasks.
- Every worker item has role, agent, mode, source truth, acceptance criteria,
  gates, HumanGate and blocked actions.
- Workers and CAO do not mark Done.
- Founder/CEO authority remains explicit.

### 6. C-Level Department Model

- CEO/controller layer.
- CTO, CPO, CMO, COO, CFO and CAO seats.
- CAO is separate from builders.
- Department packs can be installed and extended without turning every request
  into one giant prompt.

### 7. Supergoal Factory

- Large founder goals become a parent contract plus bounded child contracts.
- Target-class truth separates report-only work from main-integrated work and
  production-deployed work.
- HG-2.5 / HG-3 / HG-4 decision levels keep merge, deploy, release and
  strategic calls visible.

### 8. Post-Worker Quality, Security and Hotfix Lane

- Quality auditor, security auditor, regression auditor, deep-audit worker and
  hotfix worker classes exist as governed lower-worker lanes.
- Coding work can be routed through audit and hotfix loops before publish.
- Alpha3 made this mandatory in the closure path instead of optional memory.

### 9. Marketing and Content Machine Pack

- Founder voice and belief model substrate.
- M0 seed interview.
- Content Machine Department Pack: source inventory, raw brief, research,
  drafting, writer council, derivatives, release packets and lessons.
- Daily posting doctrine for German and English drafts.
- Human approval before external publish, schedule, outreach, spend or
  connector writes.

### 10. Update Lifecycle

- `update_eve check` and `update_eve apply`.
- Public source remains the update path.
- Local state is protected: install record, workspace registry, human gates and
  connector manifests are not silently overwritten.

### 11. Alpha3 Closure and Audit Structure

- `[WORK_ITEM_ID]` through `[WORK_ITEM_ID]` materialize the remaining 0.8/0.9 closure
  lanes under the active alpha line.
- Explicit lanes now exist for department dashboards, review cards,
  support/security/privacy/license gate, scheduler kill-switch and budget
  brake, context topology, self-observability, plugin/connector onboarding and
  remote pilot handoff.
- Claude Opus CAO audit and Codex controller hotfix synthesis are part of the
  release evidence.

## Why This Is Different From Just Using Claude Code or Codex

Claude Code and Codex are powerful runtimes. They are not, by themselves, a
company operating system.

Command EVE adds the missing structure:

- role-first execution instead of model-first prompting
- company memory and source truth before task execution
- parent/child contracts instead of loose chat instructions
- C-Level delegation instead of one overloaded assistant
- CAO/security/review gates before publish
- update lifecycle for a repeatable install
- local-first data posture and BYOK inference
- model and CLI agnosticism: Codex, Claude, Gemini, Hermes and future runtimes
  can all become workers or auditors behind the same operating model

The same social-media automation can be hacked together in Claude Code or
Codex. Command EVE makes it a reusable department capability: founder intent,
brand voice, content substrate, worker contracts, approval gates, audit trail,
update path and future extensibility are already part of the structure.

## What A Founder Should Expect After Install

- A local Command EVE shell starts.
- EVE knows the first company facts from the install seed.
- EVE asks whether those facts are correct before asking broad setup questions.
- EVE helps connect missing tools progressively.
- The first useful wedge is marketing/content operations, draft-only and
  approval-gated.
- The system can create structured parent/child work, but broad autonomous
  execution remains gated.

## Boundaries In Alpha3

Alpha3 is not:

- a stable unsupported self-serve product
- a hosted multi-tenant SaaS
- a signed/notarized desktop app
- an autonomous posting, outreach, spend or deploy machine
- a tool that bypasses provider OAuth/BYOK consent

Alpha3 is:

- a supervised local-first operator-shell alpha
- a structured founder operating layer
- a public-source install/update path
- a reusable execution architecture that can grow with the user's company

## Where This Goes Next

The long-term direction is a founder-grade operating companion: closer to a
company-specific Jarvis than another chat UI.

Future layers can add:

- richer desktop app packaging
- status-bar / quick-voice / screen-context modes
- hosted dashboard and team views
- department scorecards and review cards
- deeper connector onboarding
- self-observability watchdogs
- session continuity for long-horizon work
- stronger autonomous delegation under explicit HumanGates
- multi-department operator leverage for founder-led teams

The important architectural choice is that Command EVE stays agnostic:
inference providers, CLIs, tools and departments can change. The founder's
operating system, memory, contracts, gates and taste layer remain stable.
