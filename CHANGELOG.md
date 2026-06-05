# Changelog

Purpose: Track Company.OS release notes, release boundaries, and operator-facing
runtime changes.

## Unreleased

## 1.0.0-alpha.3 - 2026-06-05

Status: Command EVE publish-prep closure release. This is still alpha, not
stable production.

- Promoted the active product line to `1.0.0-alpha.3` after the HG-4 publish
  pass for the Command EVE 0.8 / 0.9 closure work.
- Added the public `1.0.0-alpha.3` closure supergoal that reconciles all
  unfinished 0.8.x and 0.9.x work below the alpha line instead of hiding it
  behind the self-install milestone.
- Materialized the Plane parent/child tree for the closure lane:
  `[WORK_ITEM_ID]` through `[WORK_ITEM_ID]`, covering absorbed install closeout,
  department dashboard/review cards, post-worker quality/hotfix autonomy,
  support/security/privacy/license gate, scheduler kill-switch/budget brake,
  ladder/context topology integration, self-observability watchdog,
  plugin/connector onboarding harness, remote pilot handoff and CAO
  security/code-review/hotfix gate.
- Added an idempotent Plane materializer for the alpha3 closure tree with
  cursor pagination, App-token fallback for role-label-only planning and
  API-key support for full version/status/gate labels.
- Added the Claude Opus CAO audit and Codex controller hotfix synthesis
  reports for the closure release. The audit found no P0/P1 issues; P2
  materializer idempotency/update-state findings were fixed before publish
  preparation.
- Added the website-facing Command EVE alpha3 feature and structure brief for
  turning the current product truth into public copy without overstating
  hosted, stable or autonomous publish/send/spend claims.

## 1.0.0-alpha.2 - 2026-06-04

Status: Self-install pilot hardening for the public local-first Command EVE
operator-shell alpha. This is still alpha, not stable production.

- Added the `1.0.0-alpha.2` Self-Install Pilot Hardening supergoal as the next
  local-first proof band: public-main update proof, one-command GitHub
  self-install, BYOK/Hermes auth preflight, first-run EVE confirmation flow,
  update lifecycle smoke, draft-only marketing wedge, remote pilot runbook and
  beta promotion gate.
- Added `scripts/install/command-eve-self-install.mjs` as the first
  founder-facing one-command installer wrapper. It composes the public-RC
  workspace install with the managed AionUI/Hermes/EVE sidecar install, keeps a
  no-write dry-run path, checks source/version/target/prerequisite/component
  state before sidecar writes and emits one combined install report with
  start/update command hints.
- Bumped `VERSION` and the operator-shell manifest to `1.0.0-alpha.2`, so the
  AionUI login/version surface updates through the generated
  `public/command-eve-brand.json` instead of a hardcoded fork string.
- Added Hermes BYOK auth preflight receipts under `hermes.auth_profile`.
  `start_eve --auth-check` and `start_eve.mjs check --auth-check --json`
  report provider, model, auth mode and readiness proof; provider-key, quota
  or timeout failures surface as `BLOCKED_AUTH`, not as broken installs.
- Added generated `first_run_confirmation` receipts to the EVE runtime boot
  packet so a fresh EVE session starts with known account/company facts,
  correction confirmation, progressive required/helpful/later setup queues and
  existing-system inventory before proposing new structure.
- Extended the generated `.company-os/bin/start_eve` launcher with `check` and
  `--auth-check` modes while preserving default no-argument UI start behavior.

## 1.0.0-alpha.1 - 2026-06-04

Status: Security and portability hardening for the Command EVE managed
operator-shell alpha. This is still alpha, not stable production.

Changed:

- Replaced copy-pasteable pipe-to-shell installer guidance with operator-reviewed
  package-manager or upstream-doc install paths for Bun and Raindrop Workshop.
- Made Claude/Gemini runtime defaults portable (`claude` / `gemini`, overridable
  by `CLAUDE_BIN` / `GEMINI_BIN`) instead of defaulting to the founder-local binary
  paths.
- Made the model-router workspace default portable through `COMPANY_OS_ROOT` or
  the current working directory.
- Renamed the Vitest engine-eval template from `*.test.ts` to
  `*.vitest.ts` so Node's native `node --test` runner no longer tries to run a
  template file that intentionally requires Vitest after being copied into a
  real project test.

Security:

- Added Supabase token-shaped values to the model-router, runtime dispatcher,
  public mirror, clean-clone and productization secret scanners.
- Extended tests so Supabase-like token fixtures are blocked or redacted across
  router output, worker runtime output, productization readiness, public mirror
  generation and clean-clone verification.
- Replaced a token-shaped Supabase test fixture in the MCP gateway kit with a
  non-secret placeholder and expanded the gateway scrubber pattern.

- Post-Worker Quality Loop now supports multi-marker controller decision cards:
  the controller can emit separate quality, security, regression, deep-audit or
  hotfix markers, and the scheduler/Plane handoff fans them out into distinct
  lower-worker candidates while terminal or human-blocked markers fail closed.
- Release truth is aligned around `1.0.0-alpha.1` as the current managed
  operator-shell alpha. Historical `0.7.4`, `0.9.0-rc.0` and
  `1.0.0-alpha.0` docs remain release evidence, not current-version claims.
- Restored missing public substrate docs for the Command EVE offer, KI-Rendite
  questionnaire, Lead Signal loop, Founder Voice and Belief Model and M0 seed
  interview without importing private [SOURCE_COMPANY]/founder-specific branch content.
- Command EVE AionUI overlay now ships a full German-first `de-DE` language
  pack across all AionUI `en-US` namespaces with key/placeholder parity,
  defaults fresh installs to German, keeps `en-US` selectable, replaces the
  login logo with the face-focused EVE wait video, and writes a generated
  `public/command-eve-brand.json` so the login title can show the installed
  `⌘ EVE` product identity plus `v1.x` release line without hardcoding the version in the AionUI
  patch.
- `start_eve` now treats the AionUI `public/command-eve-brand.json` as a
  launch-time version gate: missing, invalid or stale UI brand config is
  refreshed from the root `VERSION` before AionUI preflight, and the
  `aionui.brand_version` stage reports the visible UI version.
- Added `scripts/operator-shell/aionui-localization-gate.mjs` so the Command
  EVE `de-DE` pack can be validated against a fresh AionUI locale tree before
  shipping an overlay update.
- Command EVE marketing/content-machine stand is now integrated into the
  active `1.0.0-alpha.1` operator-shell alpha line as
  `command-eve-marketing-stand/2026-06-04`; this is a GTM marker, not a
  separate product-version bump or `1.0.1` claim.
- Added the Content Machine Department Pack as the shared CMO substrate before
  social, blog, book, video and campaign lanes: source inventory, FVBM check,
  content vault, founder interview/raw brief, research, draft, writer council,
  derivatives, release packets and lessons.
- Added installable Content Machine kit surface, EVE/AionUI skill routing,
  starter command, parent/child worker contracts, capability profile and
  evaluator proof artifacts.
- Added Command EVE daily posting automation doctrine for the current
  bilingual marketing motion: 4 German and 4 English Command EVE drafts per
  day, image-first Upload-Post candidates, max one direct offer post per
  language and Founder approval before any external post or schedule.
- Added Command EVE visual design source for social images and Image 2.0
  briefs, using `try.command-eve.com` as the visual truth.

## 1.0.0-alpha.0 - 2026-06-04

Status: Command EVE managed operator-shell alpha. This is the first
Company.OS line that treats local AionUI + Hermes installation as part of the
install product instead of a separate founder/operator sidecar task. It is an
alpha, not stable: expect supervised setup, dependency repair and explicit
provider auth.

Added:

- Managed Command EVE operator-shell manifest at
  `registries/operator-shell/command-eve-1.0-alpha.json`.
- `scripts/operator-shell/install-command-eve.mjs` and core tests for a
  pinned sidecar install path:
  - AionUI `v2.1.10` source-overlay lane with Command EVE branding.
  - AionCore `v0.1.19` backend binary prepared through AionUI's pinned
    `prepareAioncore.js` flow and wired into `start_eve`.
  - AionUI renderer assets built locally before `start_eve`, so web UI startup
    does not require a separate manual `bun run package`.
  - Hermes Agent `0.15.2` installed into a local Python venv.
  - EVE SOUL, runtime policy, connector manifest and first-run skill materialized
    under the target's local `.company-os/operator-shell/` tree.
  - Default inference profile points to `openrouter` /
    `minimax/minimax-m3` without storing or collecting raw API keys.
- Target-local `.company-os/bin/start_eve` and `.company-os/bin/update_eve`
  launchers for remote pilots; updates pull from the public Company.OS source
  first, then refresh the managed AionUI/Hermes sidecars.
- Public mirror inclusion and clean-clone gates now require the Operator-Shell
  manifest, preventing a public install that has scripts but no component pins.
- Installer prerequisite guidance for missing `git`, `python3` or `bun`, with
  `bun` called out as the likely fresh-macOS blocker for AionUI source-overlay
  installs.
- Hermes package decision now falls back to installed Python package metadata,
  so the venv/wheel path reports Hermes `0.15.2` instead of `unknown`.
- AionUI ChatConversation overlay hunk now targets the generic conversation
  panel instead of the AionRS-only panel; the patch applies cleanly to AionUI
  `v2.1.10` and preserves TypeScript build validity.
- `start_eve` now exports the prepared `AIONUI_BACKEND_BIN`, avoiding an
  accidental frontend-only AionUI launch on fresh installs.
- `clientRoot` support for EVE sidecar/start scripts, so EVE can read public
  Company.OS source docs from the repo while reading the real client
  onboarding seed from the installed workspace.

Boundaries:

- No API keys, OAuth secrets, cookies, browser storage or raw `.env` values are
  collected in chat or committed.
- AionUI/Hermes native scheduled tasks, team/full-auto/YOLO, broad delegation,
  publish/send/spend/deploy and Plane Done remain gated.
- This alpha does not create a hosted account, SaaS tenant, packaged signed
  macOS app or stable unsupported self-serve claim.

## 0.9.0-rc.0 - 2026-06-03

Status: Command EVE 0.9 remote-install release candidate. This is the first
Company.OS public release-candidate line whose sanitized public clone or public
mirror artifact is the canonical distribution source for a remote founder to
install a fresh Company.OS target. It is a guided/self-serve RC, not stable
production: not stable unsupported autonomy, not scheduler-default-on, and not
a production write/publish/send/spend release.

Added:

- Public-RC install wrapper (`scripts/install/public-rc.mjs`) that turns a
  signup/report seed into a fresh Company.OS target: bootstrap dry-run,
  bootstrap apply, `company-intake.json`, EVE boot packet, company discovery
  brief, first Plane parent draft, update provenance and public-RC handoff
  report.
- Public-RC install core and tests proving a naked target can start from
  generic company seed without any client-specific assumptions.
- Public mirror coverage for `registries/domain-packs/**`,
  `registries/plane-templates/**` and `registries/quality/**`, while private
  capability and inference registries remain stripped or replaced with
  examples.
- `docs/releases/0.9-public-rc.md` release notes describing the
  remote-install RC entry point, 0.7.4 update target and explicit "RC, not
  stable" framing for a remote founder following the public GitHub source.

Changed:

- `VERSION`, `README.md`, `docs/releases/versioning.md` and
  `docs/operations/client-productization-readiness.md` now identify
  `0.9.0-rc.0` as the current public remote-install RC line.
- The install path is now public-first: private or client overlays update from
  the public source after the public mirror/clone proves install and update
  evidence, not the other way around.

Update targets:

- Existing `0.7.4-rc.0` installs are the supported update target for the
  `0.9.0-rc.0` line. Operators must run
  `node scripts/update/company-os-update.mjs check --source <public-rc-clone> --target <existing-074-install> --write-report --json`
  followed by the same command with `apply --dry-run` before any non-dry-run
  apply. Earlier 0.6.x / 0.7.0 / 0.7.1 / 0.7.3 installs are not in scope for a
  direct one-shot update on this RC and should first reach 0.7.4-rc.0.

Boundaries:

- `0.9.0-rc.0` does not grant stable unattended self-serve claims, autonomous
  publish/schedule/send/spend behavior, production writes, Plane `Done`,
  GitHub tag creation, GitHub release publishes or scheduler-default-on
  autonomy without the relevant HumanGate release.
- EVE may guide first-run setup and prepare founder/CEO decision packets, but
  HG-4 remains founder-owned.
- The public artifact is the sanitized public clone / fresh-history mirror;
  the private source tree (`reports/`, `metrics/`, internal evidence) is not
  the distribution surface and must not be copied into the public release.

## 0.7.4-rc.0 - 2026-06-02

Status: Supergoal Factory release candidate. This is a reusable Company.OS
control-plane hardening release for long-running supergoals, Claude Opus
worker factories and Codex/CAO/controller handoff. It is not a stable
unattended scheduler release, not a public publishing release and not a
production-write release.

Added:

- Supergoal Factory doctrine for long-running parent/child execution: the
  Execution Ladder keeps `built`, `integrated` and `live` separate, and
  `TargetClass` prevents `controller:auto-go` from being treated as production
  truth.
- State-Truth Pass and HG-2.5 Merge Readiness Pack as canonical bridge
  artifacts between worker/CAO success and Codex/CEO integration.
- Post-Worker Quality Loop promotion into the public distribution: the
  generic quality registry, lower-worker class vocabulary and executable
  marker-to-scheduler handoff are public-safe.
- Controller/scheduler separation for follow-up work: the controller writes
  scheduler-visible `controller.audit-followup` or `controller.hotfix-request`
  markers; the scheduler translates eligible markers into
  `scheduler.lower-worker-candidate` comments. The controller still does not
  spawn workers directly.
- Public lower-worker capability examples for `quality-auditor`,
  `security-auditor`, `bug-regression-auditor`, `deep-audit-worker` and
  `hotfix-worker`.

Changed:

- `VERSION`, `README.md`, `ROADMAP.md` and `docs/releases/versioning.md` now
  identify `0.7.4-rc.0` as the current productization line.
- Public mirror tests now assert that the reusable Supergoal / Post-Worker
  Quality doctrine, registry and capability examples are included while
  private [SOURCE_COMPANY] evidence, reports and company-specific capability registries
  remain excluded.

Boundaries:

- No Plane `Done`, merge, push, deploy, production write, schema/RLS/auth,
  service-role use, public medical/Rx/legal claim approval or scheduler
  default-on behavior is released by this version.
- Private [SOURCE_COMPANY] run reports are evidence for the internal controller, not
  public artifacts.

## 0.7.3-rc.0 - 2026-05-30

Release boundary: Command EVE v1.3 governance spine integrated to `main` via the
isolated stream PRs #30-#36 (carrier #29). Release-candidate; no production deploy.
Integration-truth ladder enforced throughout (draft -> merged, no premature
"integrated" claims). Confidence-contract validator enforcement and a post-merge
page-index refresh follow as separate PRs.

Added:

- Command EVE v1.3 governance spine: the Supergoal Execution Ladder
  (`SPEC_READY..DONE` with integration-truth stages and a worker ceiling at
  `CAO_PASS_HG2`), the State-Truth Pass (claimed-vs-verified stage reconciliation),
  Knowledge & Context Topology + Context Router, the Self-Observability watchdog,
  and the Plugin & Connector Integration Harness (#30).
- Goal/Supergoal runtime planner: `supergoal-core` decomposes a supergoal into
  child worker contracts through the goal command (#32).
- Dispatcher runtime wiring: a `--runtime-effort` / `COMPANY_OS_RUNTIME_EFFORT`
  knob and an exact-read-roots-only guard that blocks broad parent-directory
  filesystem scans (#33).
- Worker self-confidence reporting contract plus a confidence-calibration core
  that scores claimed-vs-outcome confidence over runs to surface over-confidence
  (#34; validator enforcement lands as a follow-up).
- Read-only `gitnexus impact` capability for the CTO desktop worker lane, gated
  `HG-2.5`/`HG-3`, ratified per [WORK_ITEM_ID] (#35).
- Command EVE runtime policy gate for the 0.7.3 operator shell: AionUI native
  scheduled tasks/team mode/assistant switching/YOLO are disabled at launch,
  Hermes native cron/delegation/kanban/toolset autonomy is disabled or gated,
  and `/start_eve` reports the proposal-only policy profile before the UI is
  treated as ready.
- Department Capability Pack Creator: reusable templates, scaffold/evaluator
  CLIs, native EVE/Hermes skill routing, CTO CapabilityProfile gating and a
  non-[SOURCE_COMPANY] `customer-support-kb` proof pack that evaluates `READY` at 10/10
  across all ten disciplines.
- Obsidian Brain Interface: optional public-safe cockpit doctrine, kit
  checklist and setup workflow that treat Obsidian as a local interface over
  Company.OS Markdown truth, not as a second memory or execution ledger.

Changed:

- Command EVE first responses now include explicit boot-packet modes so broad
  openers like `hey` or `wo stehen wir?` summarize known runtime/company facts
  and offer three setup paths instead of dumping a full onboarding
  questionnaire.
- Command EVE's AionUI wait state now ships five face-focused 1:1 video
  variants and rotates clips, while the mobile guid input width no longer
  overflows narrow viewports.

## 0.7.1-rc.0 - 2026-05-26

Status: Self-serve install/onboarding/update candidate. This is a release
candidate for the guided install path and first founder onboarding evidence,
not a stable unattended public release.

Added:

- `0.7.1` self-serve smoke CLI that proves kit bootstrap, first-company packet
  materialization, EVE boot packet generation, update report writing and update
  apply dry-run together against a fresh target.
- `/start_eve` candidate CLI (`scripts/operator-shell/start_eve.mjs`) that
  checks the Command EVE AionUI default-agent overlay, prepares EVE sidecar
  context, runs Hermes/AionUI preflight and can include Hermes model/auth smoke
  before printing the local AionUI start command.

Changed:

- `VERSION` now identifies the current working line as `0.7.1-rc.0`.
- EVE/Hermes operator-shell smoke now resolves `HERMES_HOME/config.yaml`
  defaults and passes the model/provider explicitly to Hermes one-shot runs.

Fixed:

- Refreshed the current AionUI/Hermes/EVE smoke evidence against Hermes Agent
  `v0.14.0 (2026.5.16)` commit `2517917de`, replacing the stale
  `v0.13.0` update-needed evidence.

## 0.7.0-alpha.1 - 2026-05-26

Status: Command EVE guided operator-shell alpha. The repo now carries the first
reproducible EVE/AionUI/Hermes start path, first-run skill pack and runtime
smoke evidence, but it is still supervised/guided alpha rather than self-serve
stable or public RC.

Added:

- Command EVE AionUI overlay package with patch tooling, branded logo,
  1:1 EVE wait video asset, anchor frame and overlay tests.
- Command EVE first-run skill pack that lets Hermes/EVE inspect existing
  Company.OS onboarding artifacts before asking the founder for missing setup
  context.
- EVE connector manifest and JSON schema for the first required/optional app
  surfaces: Plane, GitHub, Honcho, GitNexus, Codex, Claude, AionUI/Hermes,
  Supabase and marketing connectors.
- Runtime smoke evidence for the local EVE/AionUI/Hermes start path under
  `reports/operator-shell/`.
- Runtime Dispatcher v1 can now emit Raindrop prompt-result evaluation
  artifacts after a successful Runtime -> CAO -> Codex Controller chain, and
  records `dispatcher.prompt_result_eval` rows in `metrics/agent-events.jsonl`
  for both generated and intentionally skipped evaluations.
- Contract wizard diagnostics now expose derived Claude tool requirements from
  worker-contract gates so future C-Level worker launches can see missing CLI
  capabilities before dispatch.
- Roadmap release-accounting now separates proven `0.6.5` substrate from
  older productization backlog and `0.7+` operator-shell work.
- `0.7` entry plan for the read-only Command Center path: read-model packet
  first, then Raindrop managed-producer promotion, AionUI/Hermes sidecar
  evaluation and portfolio-scheduler ranking.
- Read-only Command Center read-model seed CLI that reduces
  `metrics/agent-events.jsonl` into morning brief totals, worker run cards,
  HumanGate queue entries and Raindrop trace cards.
- `0.7A` Command Center read-model contract documenting packet shape, source
  policy, blocked actions, smoke output and next fixture slice.
- Sanitized Command Center sample packet under
  `reports/examples/command-center-read-model/` for AionUI/Hermes and other
  UI/mock consumers.
- AionUI/Hermes Command Center handoff doctrine that fixes GitHub/source
  ownership, installation boundaries, adapter contract and blocked actions for
  the future operator shell.

Changed:

- `VERSION` now identifies the current working line as `0.7.0-alpha.1`.
- The AionUI/Hermes portable bootstrap now documents the Command EVE overlay,
  first-run runtime context and connector manifest as reproducible repo
  artifacts instead of local-only sidecar edits.
- Published the sanitized `0.6.0-beta.1` fresh-history public mirror to
  `https://github.com/MathiasHeinke/company-os-public` after [WORK_ITEM_ID] HG-2.5
  approval. Tags, release uploads, autonomous publish/schedule/send/spend
  actions and production writes remain gated.
- Integrated the RS-11/RS-17 prompt-result evaluation and contract-wizard
  hardening branch plus the operator-led template-seed closure branch into the
  `0.6.5` hygiene line.
- Command Center read-model packets now declare the concrete event ledger
  source so UI consumers can distinguish live internal ledgers from sanitized
  fixtures.

Fixed:

- Command Center morning brief totals no longer count auth-blocked idle runs as
  active work.
- Runtime browser-auth preflight no longer treats negative privacy/scope lines
  such as "no browser storage" as browser-bound UI work.
- Prompt-result evaluation artifact write failures now block a runtime chain
  instead of being hidden behind an otherwise green worker/CAO/controller
  result.
- Runtime inference routing now uses the verified local Claude Code v2 Opus
  alias `opus` for P2/P3 routes instead of stale marketing/version aliases that
  can fail headless dispatch.

Notes:

- Hermes remains pinned to the locally verified pilot state until the next
  explicit update-or-pin decision; this blocks any claim stronger than guided
  alpha.
- `0.7.1` remains the next client self-onboarding/install/update candidate.
  `0.7.2` remains the practical `/start_eve`, auth/model preflight and AionUI
  default-agent polish lane.
- RS-11 / [WORK_ITEM_ID] produced useful runtime hardening and privacy-safe
  Raindrop call evidence, but the live worker run hit `MaxTurns: 35` and
  stopped as `RUNTIME_ERROR`. No CAO PASS, Controller AUTO-GO, Plane Done,
  deploy, public publish or version bump is claimed for that run.

## 0.6.5-beta.5 - 2026-05-20

Status: Runtime sandbox-routing hardening beta. Runtime Dispatcher now fails
before worker spawn when a write-capable sandbox contract tries to use the
canonical Company.OS workspace alias or canonical source checkout instead of an
absolute sandbox worktree path.

Added:

- `preflightSandboxWorkspace` in Runtime Dispatcher v1.
- Stable preflight reason code
  `runtime.sandbox-workspace-alias-unsafe`.
- Tests covering blocked `registry:company-os`, bare `company-os`, canonical
  absolute Company.OS paths, sandbox root-only paths, traversal paths, allowed
  absolute sandbox worktrees and read-only/audit compatibility.
- [WORK_ITEM_ID] / RS-10 evidence: Worker PASS, CAO PASS and Codex Controller
  AUTO-GO.

Changed:

- Runtime Dispatcher dry-run now checks the sandbox workspace guard immediately
  after the basic workspace preflight.
- Sandbox and capability-registry doctrine now state that edit-capable
  `Mode: implement` + `Sandbox: required` contracts must declare
  `Workspace: /Users/<dev>/Developer/[SOURCE_WORKSPACE]/<workspace>/<run-slug>`,
  not `Workspace: registry:company-os`.

Verification:

- [WORK_ITEM_ID] Worker PASS, CAO PASS and Controller AUTO-GO posted in Plane.
- `node --test scripts/orchestration/runtime-dispatcher-v1.test.mjs scripts/orchestration/runtime-dispatcher-v12-core.test.mjs scripts/capabilities/capability-registry-core.test.mjs`:
  PASS, 193/193 in the controller rerun.
- `node --test scripts/orchestration/*.test.mjs scripts/release-gates/*.test.mjs scripts/page-index/*.test.mjs scripts/goal/*.test.mjs scripts/agent-events/*.test.mjs scripts/capabilities/*.test.mjs scripts/release/*.test.mjs`:
  PASS, 701/701 in the controller rerun.
- `node scripts/release-gates/productization-readiness.mjs check`: PASS, 0
  blockers, 5 known warnings.

## 0.6.5-beta.4 - 2026-05-20

Status: Raindrop runtime-preflight hook-shape beta. Runtime Dispatcher now
fails before worker spawn when declared Raindrop hook producers drift from the
safe `raindrop_hook` contract.

Added:

- `RAINDROP_HOOK_PRODUCER_REGISTRY` for producers that actually emit
  `raindrop_hook` metadata.
- `REQUIRED_HOOK_PRODUCERS` for producer ids that must remain covered unless a
  later doctrine update explicitly removes them.
- `validateRaindropHookProducerCoverage`, covering live registry PASS, missing
  required producer, invalid hook shape, forbidden private fields,
  not-yet-instrumented surfaces, non-callable factories and throwing factories.
- `preflightRaindropHookShape` in Runtime Dispatcher v1.
- Stable preflight reason code
  `runtime.raindrop-hook-shape-broken`.
- RS-09 evidence for [WORK_ITEM_ID]: Worker PASS, CAO PASS and Codex Controller
  AUTO-GO.

Changed:

- Runtime Dispatcher dry-run now runs Raindrop builder coverage and hook-shape
  coverage before worker spawn.
- Raindrop docs now distinguish instrumented surfaces from declared hook
  producers. Scheduler, Hermes, AionUI, `codex-controller/llm-spawn`, manual
  sessions and external sessions remain absent from the producer registry until
  they have real producers and builders.
- Versioning remains in the `0.6.5` Raindrop-hardening lane; RS-09 still does
  not promote hosted ingestion or unmanaged/private model calls.

Verification:

- [WORK_ITEM_ID] Worker PASS, CAO PASS and Controller AUTO-GO posted in Plane.
- `node --test scripts/orchestration/runtime-dispatcher-v1.test.mjs scripts/orchestration/raindrop-call-adapter.test.mjs scripts/goal/goal-runtime-adapter-core.test.mjs scripts/orchestration/raindrop-observability-policy.test.mjs`:
  PASS, 171/171 in the controller rerun.
- `node scripts/release-gates/productization-readiness.mjs check`: PASS, 0
  blockers, 5 known warnings.

## 0.6.5-beta.3 - 2026-05-20

Status: Raindrop runtime-preflight hardening beta. Runtime Dispatcher now
fails before worker spawn when promoted Raindrop surfaces are missing adapter
builder coverage.

Added:

- `preflightRaindropBuilderCoverage` in Runtime Dispatcher v1.
- Stable preflight reason code
  `runtime.raindrop-builder-coverage-broken`.
- Composer-level tests proving broken `SURFACE_BUILDER_REGISTRY` /
  `INSTRUMENTED_SURFACES` coverage returns `BLOCKED_DEPENDENCY` before worker
  spawn and keeps `no_writes_performed: true`.
- RS-08 evidence for [WORK_ITEM_ID]: Worker PASS, CAO PASS and Codex Controller
  AUTO-GO.

Changed:

- Raindrop docs now document runtime preflight as the next promotion-bar step.
- Versioning remains in the `0.6.5` Raindrop-hardening lane; RS-08 still does
  not promote Scheduler, Hermes, AionUI, hosted ingestion or arbitrary manual
  sessions.

Verification:

- `node --test scripts/orchestration/runtime-dispatcher-v1.test.mjs scripts/orchestration/raindrop-call-adapter.test.mjs scripts/orchestration/raindrop-observability-policy.test.mjs`:
  PASS, 143/143 in the worker run.
- CAO PASS and Controller AUTO-GO were posted on [WORK_ITEM_ID].

## 0.6.5-beta.2 - 2026-05-20

Status: Raindrop builder-coverage hardening beta. Company.OS now enforces that
every promoted instrumented Raindrop managed surface has explicit adapter
builder support.

Added:

- `SURFACE_BUILDER_REGISTRY`, mapping each current `INSTRUMENTED_SURFACES`
  entry to its dedicated safe summary builder.
- `validateSurfaceBuilderCoverage(surfaceList, registry?)`, including tests for
  the passing path, failing path, future-surface gating and registry/list sync.
- RS-07 evidence for [WORK_ITEM_ID] and [WORK_ITEM_ID]: [WORK_ITEM_ID] correctly blocked
  before worker spawn on missing absolute artifact path; [WORK_ITEM_ID] retried with
  corrected `OutcomeArtifacts`/`Reporting` and reached Worker PASS, CAO PASS and
  Codex Controller AUTO-GO.

Changed:

- Raindrop docs now explain builder coverage as a promotion gate, not as a
  mandate to observe every unmanaged local LLM call.
- Versioning remains in the `0.6.5` Raindrop-hardening lane; RS-07 does not
  start the `0.7` Command Center / AionUI track.

Verification:

- `node --test scripts/orchestration/raindrop-call-adapter.test.mjs scripts/orchestration/raindrop-observability-policy.test.mjs`:
  PASS, 60/60 in the worker run.
- Controller release gates rerun before commit.

## 0.6.5-beta.1 - 2026-05-20

Status: Raindrop hook-validation beta. Company.OS now has an executable
pre-promotion validator for safe `raindrop_hook` metadata so new managed
surfaces cannot be promoted with unknown surfaces, invalid agents or raw/private
fields.

Added:

- `validateRaindropHook(hookObject)` in the Raindrop call adapter.
- RS-06 retry evidence reports for [WORK_ITEM_ID], including worker PASS, CAO PASS
  and Codex Controller AUTO-GO.
- Controller synthesis for RS-05/RS-06 lessons: scheduler instrumentation is
  still Founder-gated, and worker contracts must use explicit duration units
  such as `900s` instead of bare numeric `maxruntime` values.

Changed:

- Raindrop documentation now separates safe managed-surface validation from
  broader "observe everything" language: Company.OS observes owned runtime,
  Plane, Goal, Model Router, Controller, Scheduler and future Hermes/AionUI
  calls when they are promoted into managed work; arbitrary private/manual
  sessions remain out of scope.
- `README.md`, `VERSION`, `ROADMAP.md`, `docs/releases/versioning.md` and the
  generated page index now align on `0.6.5-beta.1`.

Verification:

- `node --test scripts/goal/goal-runtime-adapter-core.test.mjs scripts/orchestration/raindrop-call-adapter.test.mjs scripts/orchestration/raindrop-observability-policy.test.mjs`:
  PASS, 64/64.
- `git diff --check`: PASS.

## 0.6.4-beta.3 - 2026-05-19

Status: Raindrop goal-runtime worker-run coverage beta. Company.OS has now run
RS-04 through Plane, Runtime Dispatcher, Claude worker, CAO and Codex Controller
to promote `goal-runtime/worker-run` from an explicit gap to an instrumented
managed surface.

Added:

- Safe `raindrop_hook` metadata on the Goal Runtime adapter output.
- `buildRaindropCallSummaryFromGoalRuntimeWorkerRun` for post-run summaries
  that capture only safe run metadata and no raw prompts, workspace paths or
  private context.
- RS-04 evidence reports under
  `reports/observability/raindrop-workshop/2026-05-19/` and
  `reports/observability/raindrop-workshop/2026-05-20/`.

Changed:

- `goal-runtime/worker-run` moved from `NOT_YET_INSTRUMENTED_SURFACES` to
  `INSTRUMENTED_SURFACES`.
- Raindrop documentation now lists Goal Runtime worker-run as covered and keeps
  Scheduler, Hermes/AionUI, future model-backed Codex controller calls and
  unmanaged manual sessions gated.
- `README.md`, `VERSION`, `ROADMAP.md`, `docs/releases/versioning.md` and
  generated indexes now align on `0.6.4-beta.3`.

Verification:

- `node --test scripts/goal/goal-runtime-adapter-core.test.mjs scripts/orchestration/raindrop-call-adapter.test.mjs scripts/orchestration/raindrop-observability-policy.test.mjs`:
  PASS, 56/56.
- `node scripts/release-gates/productization-readiness.mjs check`:
  PASS, 0 blockers, 5 known warnings.

## 0.6.4-beta.2 - 2026-05-19

Status: Raindrop observability policy hardening beta. Company.OS has now run
three live RS pipeline tests through Plane, Runtime Dispatcher, Claude worker,
CAO, Codex Controller and Raindrop summaries for the Raindrop learning loop.

Added:

- Canonical managed-surface catalog in
  `scripts/orchestration/raindrop-observability-policy.mjs`.
- Adapter coverage harness that fails tests if a canonical managed surface is
  neither instrumented nor explicitly listed as not-yet instrumented.
- RS-01 to RS-03 evidence reports under
  `reports/observability/raindrop-workshop/2026-05-19/`.

Changed:

- `NEEDS_HUMAN` managed runs are classified as `needs_human_escalation` instead
  of the generic `non_pass_state` reason.
- `aionui-hermes/command-layer`, `goal-runtime/worker-run` and
  `scheduler/worker-run` are now explicit not-yet-instrumented managed
  surfaces.
- `README.md`, `VERSION`, `ROADMAP.md`, `docs/releases/versioning.md` and
  generated indexes now align on `0.6.4-beta.2`.

Verification:

- `node --test scripts/orchestration/raindrop-observability-policy.test.mjs scripts/orchestration/raindrop-call-adapter.test.mjs`:
  PASS, 41/41.
- `node scripts/release-gates/productization-readiness.mjs check`:
  PASS, 0 blockers, 5 known warnings.

## 0.6.4-beta.1 - 2026-05-19

Status: Raindrop observability policy beta. Company.OS now has an executable
coverage policy that separates managed runtime work from private/manual
ideation and decides when a run needs safe summary only versus deeper
prompt/result evaluation.

Added:

- `docs/operations/raindrop-observability-coverage-policy.md`.
- `scripts/orchestration/raindrop-observability-policy.mjs`.
- Policy tests covering managed runtime surfaces, AionUI/Hermes top-layer
  promotion, private/manual exclusions, external-impact outputs, HG-3/HG-4
  deep-eval triggers, template-change triggers and sampling triggers.

Changed:

- `README.md`, `VERSION`, `ROADMAP.md`, `docs/releases/versioning.md` and
  generated indexes now align on `0.6.4-beta.1`.
- Raindrop doctrine now explicitly rejects "observe everything" and defines the
  promotion boundary from manual idea to managed Company.OS run.

Verification:

- `node --test scripts/orchestration/raindrop-observability-policy.test.mjs`:
  PASS, 9/9.
- `find scripts -name '*.test.mjs' -print | sort | xargs node --test`:
  PASS, 830/830.
- `node scripts/release-gates/productization-readiness.mjs check`:
  PASS, 0 blockers, 5 known warnings.

## 0.6.3-beta.1 - 2026-05-19

Status: Raindrop Model Router coverage beta. Runtime Dispatcher, hard-cron,
Plane UI cadence, deterministic Controller decisions and Model Router CLI
worker spawns now emit safe local Raindrop call summaries. Hosted Raindrop
ingestion, arbitrary manual sessions, future model-backed Codex Controller LLM
calls, Hermes/AionUi calls, external publishing/sends, spend changes,
production writes, tags and release uploads remain gated.

Added:

- Model Router Raindrop summaries for Claude CLI, Gemini CLI and Codex
  OpenRouter worker runs from `scripts/model-router/codex-cost-router.mjs`.
- `buildRaindropCallSummaryFromModelRouterResult` and model-router output-dir
  mapping so worker run reports also land in the canonical
  `reports/observability/raindrop-workshop/<date>/` lane.
- [WORK_ITEM_ID] runtime-router coverage report under
  `reports/observability/raindrop-workshop/2026-05-19/`.

Changed:

- `docs/operations/raindrop-llm-call-observability.md` now treats
  `model-router/claude-cli-worker`, `model-router/gemini-cli-worker` and
  `model-router/codex-openrouter-worker` as instrumented surfaces.
- The remaining Gemini gap is narrowed to Gemini CLI sessions outside
  Company.OS runtime/model-router control.
- `README.md`, `VERSION`, `docs/releases/versioning.md` and generated indexes
  now align on `0.6.3-beta.1`.

Verification:

- `node --test scripts/orchestration/raindrop-call-adapter.test.mjs scripts/model-router/codex-cost-router-core.test.mjs`:
  PASS, 43/43.
- `find scripts -name '*.test.mjs' -print | sort | xargs node --test`:
  PASS, 821/821.
- `node scripts/release-gates/productization-readiness.mjs check`:
  PASS, 0 blockers, 5 known warnings.

## 0.6.2-beta.1 - 2026-05-19

Status: Raindrop runtime-wrapper coverage beta. Runtime Dispatcher worker
spawns, hard-cron wrapper launches, Plane UI cadence worker launches and
deterministic Codex Controller decisions now emit safe local Raindrop call
summaries. Hosted Raindrop ingestion, arbitrary manual sessions, future
model-backed Codex Controller LLM calls, Gemini workers, Hermes/AionUi calls,
external publishing/sends, spend changes, production writes, tags and release
uploads remain gated.

Added:

- Hard-cron Raindrop summaries from `scripts/runtime/hard-cron-wrapper-core.mjs`.
- Plane UI cadence Raindrop summaries from
  `scripts/runtime/plane-ui-worker-cadence-runner-core.mjs`.
- Deterministic Codex Controller decision summaries from
  `scripts/orchestration/codex-controller-dryrun.mjs`.
- Adapter builders for hard-cron, Plane UI cadence and Codex Controller
  decision surfaces.

Changed:

- `docs/operations/raindrop-llm-call-observability.md` now distinguishes
  deterministic controller-decision coverage from future model-backed
  `codex-controller/llm-spawn` coverage.
- `README.md`, `VERSION`, `docs/releases/versioning.md` and generated indexes
  now align on `0.6.2-beta.1`.

Verification:

- `node --test scripts/orchestration/raindrop-call-adapter.test.mjs scripts/runtime/hard-cron-wrapper-core.test.mjs scripts/runtime/plane-ui-worker-cadence-runner-core.test.mjs scripts/orchestration/codex-controller-dryrun.test.mjs`:
  PASS, 78/78.
- `find scripts -name '*.test.mjs' -print | sort | xargs node --test`:
  PASS, 817/817.
- `node scripts/release-gates/productization-readiness.mjs check`:
  PASS, 0 blockers, 5 known warnings.

## 0.6.1-beta.1 - 2026-05-19

Status: Raindrop prompt-result quality loop beta. Runtime Dispatcher LLM worker
calls can now be evaluated through safe prompt/result envelopes, but hosted
Raindrop ingestion, automatic template mutation, external publishing/sends,
spend changes, production writes, tags and release uploads remain gated.

Added:

- Local Raindrop prompt-result evaluation loop:
  `scripts/orchestration/raindrop-prompt-result-loop.mjs`.
- Prompt-result evaluation tests:
  `scripts/orchestration/raindrop-prompt-result-loop.test.mjs`.
- Canonical doctrine:
  `docs/operations/raindrop-prompt-result-quality-loop.md`.
- First [WORK_ITEM_ID] prompt-result evidence under
  `reports/observability/raindrop-workshop/2026-05-19/`.

Changed:

- Raindrop LLM call observability now distinguishes the measurement layer
  from the prompt/result quality loop.
- `README.md`, `VERSION`, `docs/releases/versioning.md` and generated indexes
  now align on `0.6.1-beta.1`.

Verification:

- `node --test scripts/orchestration/raindrop-prompt-result-loop.test.mjs`:
  PASS, 9/9.
- Broader runtime and release gates run as part of the [WORK_ITEM_ID] release
  closeout before this bump: focused runtime tests PASS 178/178, broader
  orchestration/release/page-index tests PASS 425/425.

## 0.6.0-beta.1 - 2026-05-18

Status: Marketing/Growth beta spec tier. Public remote publish, autonomous
publishing, external scheduling, outreach sends, spend changes, production
writes, specific regulated claim approvals and ungated Plane Done transitions
remain gated.

Added:

- 0.6A Marketing/Growth Command Center conversation map with source citation
  rules, blocked action catalog and intent-card boundaries.
- 0.6B Blog Workflow Approval Packet with research, outline, draft, editorial
  review, claim review and publication handoff stages.
- 0.6C Social Approval Queue with draft states, 24-hour staleness boundary,
  scheduling intent card and no-autonomous-external-scheduling rule.
- 0.6D Claim/Compliance Gate covering medical, Rx, legal, financial, security
  and privacy claim classes, Founder HG-3 escalation and refusal templates.
- 0.6E Analytics Feedback Loop with read-only metric classes and weekly
  insight-to-action handoff rules.
- 0.6F Editorial Controller Rubric with PASS/WARN/FAIL dimensions and hard-fail
  conditions for 0.6 content artifacts.
- 0.6G Parent Release Readiness Synthesis and 2026-05-18 controller refresh
  evidence under `reports/releases/0.6.0-beta/`.

Changed:

- Founder ratified [WORK_ITEM_ID]'s claim/compliance gate as a v0 governance
  structure; this approval does not approve any specific regulated claim.
- `README.md`, `CHANGELOG.md`, `VERSION`, `ROADMAP.md` and versioning docs now
  align on `0.6.0-beta.1`.
- The 0.6A evidence map now classifies
  `docs/releases/0.6-growth-beta-entry-plan.md` as present `FACT` evidence.

Verification:

- `find scripts -name '*.test.mjs' -print | sort | xargs node --test`: PASS,
  724/724.
- `node scripts/page-index/generate-page-index.mjs --check`: PASS.
- `node scripts/release-gates/productization-readiness.mjs check`: PASS, 0
  blockers, 5 guided-beta warnings.
- `git diff --check`: PASS.

## 0.5.2-alpha.1 - 2026-05-18

Status: adaptive onboarding safety alpha. Public remote publish, tag creation,
production writes, deploys and ungated Plane Done transitions remain gated.

Added:

- Domain Pack Registry validator with owner-role, HumanGate, blocked-action,
  finance and send/publish safety checks for adaptive company onboarding packs.
- Intake freshness and stale-fact guard for adaptive onboarding materialization.
- Finance and external-action gate hardening for finance, CRM, outreach,
  customer-support and hiring domain packs.
- Deterministic Controller Self-Fix Acceptance path:
  `scripts/goal/self-fix-acceptance-core.mjs`.
- Parent goal synthesis evidence for [WORK_ITEM_ID] adaptive onboarding safety
  hardening under `reports/goals/2026-05-18/`.

Changed:

- Goal synthesis now recognizes `controller.self-fix-accepted` as a bounded
  completion path while preserving the distinction from CAO PASS and Worker
  PASS.
- Adaptive onboarding safety hardening is closed in Plane across [WORK_ITEM_ID]
  through [WORK_ITEM_ID] with explicit release evidence.
- `README.md`, `CHANGELOG.md`, `VERSION` and versioning docs now align on
  `0.5.2-alpha.1`.

Verification:

- `node --test scripts/goal/*.test.mjs`: PASS, 116/116.
- `node --test scripts/capabilities/capability-registry-core.test.mjs`: PASS,
  22/22.
- `node scripts/page-index/generate-page-index.mjs --check`: PASS.
- `node scripts/release-gates/productization-readiness.mjs check`: PASS, 0
  blockers, 4 guided-alpha warnings.
- `git diff --check`: PASS.

## 0.5.1-alpha.1 - 2026-05-17

Status: public-mirror validation alpha. Public remote publish, tag creation,
production writes, deploys and Plane Done transitions remain gated.

Added:

- Fresh company install smoke evidence under
  `reports/releases/0.5.1-alpha.1/`, proving the generated public mirror can
  install the Company.OS kit into a fresh target.
- Reusable fresh-history remote verifier:
  `scripts/release/verify-fresh-history-remote.mjs`.
- Local bare-remote dry-run for the fresh-history strategy: build sanitized
  mirror, initialize a fresh Git history, push only to a local temporary bare
  remote, clone from that remote, run clean-clone verification and run
  bootstrap install.

Changed:

- Public mirror sanitization now covers `scripts/**` in addition to `docs/`
  and `kits/`, including internal work item IDs, private home paths,
  source-company workspace names and common token-shaped fixtures.
- Clean-clone verification now fails closed on private paths, internal work
  item IDs, source-company markers and broader token-shaped strings across all
  public mirror text files.
- Productization readiness now treats source-tree script private markers as
  public-release blockers while keeping them as guided-alpha warnings.
- Public mirror builder regenerates `docs/page-index.md` inside the mirror so
  clean-clone verification checks the public artifact's tracked files, not the
  private source tree's index.
- `README.md`, `CHANGELOG.md`, `VERSION` and versioning docs now align on
  `0.5.1-alpha.1`.

Verification:

- Fresh company install smoke: PASS.
- Fresh-history remote dry-run: PASS.
- Public mirror builder `--verify`: PASS with zero invariant failures.
- Clean-clone verifier on the locally pushed-and-cloned mirror: PASS.
- Bootstrap install from the remote clone: PASS.

## 0.5.0-alpha.1 - 2026-05-16

Status: public-mirror-ready alpha. Public remote publish, tag creation,
production writes, deploys and Plane Done transitions remain gated.

Added:

- Public release history strategy selecting a fresh-history public mirror
  rather than pushing private git history.
- Deterministic public mirror builder:
  `scripts/release/build-public-mirror.mjs`.
- Clean-clone verifier: `scripts/release/verify-clean-clone.mjs`.
- Public mirror invariant scrubber for safe output-copy sanitization of test
  fixture token shapes and internal work item references.
- Public bootstrap prerequisite files for `.env.example` and install scripts.
- PUB-06 through PUB-10 release evidence under `reports/releases/`.

Changed:

- `README.md`, `CHANGELOG.md`, `VERSION` and versioning docs now align on
  `0.5.0-alpha.1`.
- Public release status now distinguishes the private source tree from the
  generated public mirror artifact. The private tree intentionally retains
  `reports/` and `metrics/` ledgers; the public mirror builder strips them.
- Generated page index title is worktree-stable, avoiding false drift between
  sandbox worktrees.

Verification:

- Public mirror builder `--verify`: PASS with zero invariant failures.
- Clean-clone verifier on the produced mirror: PASS.
- Private/guided productization gate: PASS with expected private
  reports/metrics warnings.
- Private source `--public-release` gate remains blocked only by
  `sanitize.metrics-ledgers` and `sanitize.reports`; this is expected for the
  private staging tree and not a blocker for the generated public mirror.

## 0.4.1-alpha.1 - 2026-05-13

Added:

- `goal` command for turning CEO intent into a reviewable GoalState,
  ObjectiveLoop and first parseable Worker Contract draft without Plane,
  scheduler or memory writes.
- Plane auth bridge compatibility for `PLANE_API_TOKEN` as an app-token alias
  to support scheduler, Supabase and edge-runtime secret injection where
  `PLANE_APP_BOT_TOKEN` is not the exposed secret name.

Changed:

- Runtime Dispatcher scope guard is now attribution-aware: parallel dirty files
  in the same worktree are reported as external changes instead of killing a
  worker run, while streamed worker writes outside `AllowedWritePaths` still
  trigger immediate `scope-write-drift`.
- Added a Codex CEO CLI boot-pack generator so headless `codex exec` runs can
  load Company.OS doctrine, Plane/Runtime context, release state and explicit
  auth-lane rules before acting as deputy CEO/controller.

## 0.4.0-alpha.1 - 2026-05-11

Added:

- Hermes/Aion-style operator shell sidecar doctrine for future Jarvis/Samantha
  voice/dashboard surfaces, kept explicitly outside the Plane execution ledger
  until v0.7+ absorption gates are met.
- executable `runtime-04-readiness` release gate for deciding whether the
  Runtime Dispatcher / Scheduler evidence is `blocked`, `rc-ready` or
  `alpha-ready`.

Changed:

- Plane App default OAuth scope now includes `projects.pages:write`; existing
  installations must be re-authorized before storing that scope, otherwise bot
  token refresh can fail with `invalid_scope`.

## 0.3.2-alpha.1 - 2026-05-10

Added:

- executable Contract Controller Stage 0.5 as the pre-dispatch quality gate
  before worker locks, checking Spec/Plan/Tasks, harness/eval, runtime fields,
  rollback, blast radius and split/founder-gate needs
- executable Contract Remediation Router Stage 0.6, routing non-PASS contract
  reviews first to the owning C-Level seat, then CEO only for missing
  decisions/source truth, and Founder only through prepared HG-3 packages
- Plane App / OAuth cleanup: app-token is the default automation identity,
  direct API keys are bootstrap/emergency fallback, and Plane migration
  reports now document the verified multi-project control-plane state
- versioning cleanup after the Plane migration, Batch-5 reconciliation and
  global Spec-to-Worker rollout so the repo matches the current operating
  doctrine

## 0.3.1-alpha.1 - 2026-05-10

Added:

- canonical Agent Org Model for productizable Founder/CEO/C-Level/Controller/
  Worker/Capability separation
- Autonomy Product Horizon describing the path from `0.2.0-alpha.1` through
  beta, `1.0.0` and `1.2.x`
- roadmap tracks for department packs, client rollout RC, operating baseline
  and operator leverage layer
- executable Capability Registry gate for runtime worker allowlists
- Runtime Dispatcher v1.2 bounded `--mode run` path for one low-risk worker
  pilot, including run report, metrics rows and Plane report comments
- Runtime Dispatcher v1.2 durable stream logs, live `worker.heartbeat`
  telemetry, scope drift guard and Plane/local kill switch polling
- Codex Controller bounded `--mode post` path for `controller.decision`
  comments after CAO verdicts
- Fast-Lane Flight Doctrine for reversible R1/R2 autonomy: run bounded live
  pilots with telemetry instead of re-litigating low-risk work every session
- runtime buildout stage map: **Stage 7 / 9 proven by first live pilot;
  Stage 8-9 still gated**
- Runtime Dispatcher v1.2 scope-guard hardening: dispatcher-owned report,
  stream and metrics artifacts are allowed automatically, and intervention now
  terminates the spawned process group instead of only the top-level CLI.
- Spec-to-Worker Pipeline doctrine: GitHub Spec Kit / `specify` patterns are
  now mapped into Company.OS as a formal spec/plan/tasks layer before Plane
  worker contracts, capability gates, runtime dispatch, CAO and controller.
- global Codex/Claude/kit boot rules for Plane-first + Spec-to-Worker-aware
  execution across active workspaces.
- Client Productization Readiness gate separating guided done-for-you alpha,
  self-serve release, public sanitize requirements and optional connector
  boundaries.
- executable `productization-readiness` release gate checking README/VERSION
  drift, required docs/scripts, kit boot doctrine, real `.env` files and
  public-release blockers for live reports/metrics.

## 0.2.0-alpha.1 - 2026-05-08

Status: internal/client-rollout alpha

This is the first canonical Company.OS version with the current autonomous
work-order hardening model documented as a reusable rollout.

Included:

- client-installable autonomous work-order pipeline
- 10/10 work-order quality bar
- executable HG-1/HG-2 release validator
- hard cron wrapper
- runtime auth preflight
- cost router and budget brake
- artifact truth verifier
- daily improvement dream loop
- autonomy shadow run
- sandbox PR autopilot
- git worktree hygiene controller
- agent event ledger and reducer
- workspace registry and automation registry patterns
- installable Company.OS Kit mirrors for new workspaces

Current autonomy profile:

```text
Stage 3.65 / 5
7.45 / 10 hardened internal operating maturity
```

Boundaries:

- L1/L2 controller lanes can run autonomously inside configured gates.
- L3 implementation is sandbox-only and requires controller review.
- Merge, push, deploy, production writes, public publishing, new spend,
  durable memory writes, regulated claims and direct Done transitions remain
  human/founder-gated.

## 0.1.0 - 2026-05-06

Status: foundation

Included:

- productizable Company.OS repository foundation
- MIT license
- initial principles, harnesses and review cards
- sanitized Company.OS Kit import
- fresh company setup guide
- component map
- GitHub repository strategy
- setup checklist
