# Fresh Company Setup

Use this when starting from a clean MacBook and a new company.

## Phase 0 - Decisions Before Installing

Decide:

- company name
- primary domain / website
- Company.OS version to install
- initial autonomy profile and maximum autonomy ceiling
- GitHub org/user
- primary product repo name
- Company.OS source: public clone or sanitized public mirror first; private
  overlay later
- execution ledger: Plane workspace/project; Linear only if importing legacy work
- memory split: personal, company architecture, user/product memory
- cloud providers: Vercel, Supabase, Google Cloud, Stripe as needed
- agent runtimes: Codex, Claude Code, Gemini CLI
- primary C-level agents for first pilot
- HumanGate owners for HG-1, HG-2 and HG-3
- first likely department wedge: Marketing, Sales, Website, Knowledge, Engineering,
  Customer Ops or other
- known disabled lanes for the first 14 days

## Phase 1 - Machine Bootstrap

Install:

```bash
xcode-select --install
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install git gh node pnpm python@3.12 ripgrep jq
```

Then configure Git:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
gh auth login
```

## Phase 2 - Agent Runtime Bootstrap

Install or verify:

```bash
npm install -g @anthropic-ai/claude-code
claude --version
claude login
```

Install Gemini CLI according to the current provider docs, then run a headless
sanity check.

Verify Codex access and workspace trust before using it for filesystem or shell
automation.

## Phase 3 - Create Repos

Create:

- `Company.OS`
- product repo
- optional marketing/website repo
- optional backend/agent repo

Clone locally under one developer root:

```text
~/Developer/company-os
~/Developer/product-repo
~/Developer/website-repo
~/Developer/agent-repo
```

## Phase 4 - Install Company.OS Kit

From the public Company.OS repo root, run the public-RC installer:

```bash
node scripts/install/public-rc.mjs install \
  --target ~/Developer/product-repo \
  --company "Acme Systems" \
  --website "https://acme.example" \
  --offer "AI operating-system setup" \
  --buyer "founder-led service firms" \
  --founder "Jane Founder" \
  --approval-owner "Jane Founder" \
  --first-department marketing \
  --json
```

The installer runs the bootstrap collision dry-run, installs the kit, writes
the first intake from signup/report seed, generates EVE's boot packet, writes
an update dry-run report and writes a public-RC handoff report.

It creates active local setup files:

- `.company-os/install-record.md`
- `.company-os/company-discovery-brief.md`
- `.company-os/first-run-checklist.md`
- `.company-os/operations/workspace-registry.json`
- `.company-os/operations/software-stack.md`
- `.company-os/operations/human-gates.md`
- `.company-os/onboarding/company-intake.json`
- `.company-os/onboarding/intake-record.json`
- `.company-os/onboarding/eve-boot-packet.json`
- `reports/company-os-public-rc/YYYY-MM-DD/company-os-public-rc-0.9.0-rc.0.md`

Record the exact Company.OS version and autonomy profile. Do not install
"latest" without a version.

Then replace placeholders and customize:

```bash
rg "\\[PROJEKT\\]|\\[projekt-repo\\]|\\[PROJECT_REF\\]|<plane-" ~/Developer/product-repo
```

If files already exist, the installer blocks instead of overwriting local
agent rules or installation state. Use `--force` only after reviewing the
reported `collisions`.

## Phase 5 - Memory And Knowledge

Set up:

- Honcho workspace for company architecture memory.
- Separate personal/founder memory if needed.
- Separate user/product memory if needed.
- `memory-bank/` local files.
- `docs/wiki/` or `docs/knowledge/` for canonical domain knowledge.
- ADR folder for architectural decisions.

Memory rule:

```text
Honcho: durable invariants and cross-session context.
Memory Bank: current project state and session learning.
Wiki/ADR: canonical domain and architecture truth.
Plane: execution ledger, never memory dump.
Linear: legacy/import/bridge only unless explicitly selected during migration.
```

## Phase 6 - Plane Control Plane

Create Plane:

- company workspace
- first Company.OS project
- role labels: `role:cto`, `role:cpo`, `role:cmo`, `role:coo`, `role:cfo`,
  `role:cao`
- optional helper labels for queue views
- labels
- parent control-plane work item
- first agent-ready worker issue template

Use Plane App / bot-token identity as the productized target. A personal Plane
API key is bootstrap/fallback only.

Minimum worker issue contract:

```yaml
role: role:cto
parent_seat: role:coo
agent: claude
mode: implement
workspace: registry:product
dispatch: manual
source_of_truth:
  - docs/...
scope:
  include: []
  exclude: []
acceptance_criteria: []
gates: []
human_gate: HG-1
reporting:
  plane_comment: worker.reported
capability_profile: claude-clevel-worker/cto/runtime
```

Install the sandbox doctrine before any edit-capable worker:

- [Governance Directives](../governance/directives.md)
- [Agentic Sandbox Control Doctrine](../governance/agentic-sandbox-control-doctrine.md)
- [CEO Controller Agentic Protocol](../operations/ceo-controller-agentic-protocol.md)
- [Versioning Doctrine](../releases/versioning.md)
- [Client Rollout Doctrine](../operations/company-os-client-rollout-doctrine.md)
- [Client Productization Readiness](../operations/client-productization-readiness.md)
- [Client Installable Work-Order Pipeline](../operations/client-installable-autonomous-work-order-pipeline.md)
- [Spec-to-Worker Pipeline](../orchestration/spec-to-worker-pipeline.md)
- [Worker Issue Contract](../templates/worker-issue-contract.md)
- [Company.OS Install Record](../templates/company-os-install-record.md)
- [HumanGate Decision Brief](../templates/human-gate-decision-brief.md)
- [Founder Decision Profile](../templates/founder-decision-profile.md)
- [Client Onboarding Discovery Pipeline](../operations/client-onboarding-discovery-pipeline.md)
- [Company Discovery Brief](../templates/company-discovery-brief.md)

Edit-capable workers need `Sandbox: required`, deterministic `BranchName`,
isolated `Worktree`, explicit `HumanGateOwner`, and controller audit before
merge/release.

## Phase 6.1 - Optional Supabase Connector

Supabase is not required for a Company.OS control-plane install.

Only add Supabase when the client product needs database/auth/storage/edge
functions. If enabled:

- RLS is mandatory on every table.
- Service-role keys stay out of worker prompts and reports.
- Schema/RLS/auth changes are HG-3.
- Workers use Supabase only when their CapabilityProfile declares it.
- Production writes need a HumanGate release card.

## Phase 6.5 - Company Discovery And Pressure Test

After the public-RC install, review the generated discovery brief and EVE boot
packet before creating a large backlog or department rollout.

If the first seed was incomplete, update the intake JSON and regenerate the
first-company packet:

```bash
node ~/Developer/company-os/scripts/onboarding/first-company-packet.mjs \
  --target ~/Developer/product-repo \
  --input ~/Developer/product-repo/.company-os/onboarding/company-intake.json \
  --date YYYY-MM-DD \
  --force \
  --json
```

Use `--force` only after reviewing that `.company-os/company-discovery-brief.md`
is still the blank install template or an intentionally regenerated draft.

Create:

- company discovery brief
- intake record
- EVE boot packet for the first AionUI/Hermes greeting
- first Plane parent draft
- website/public-surface scan
- market and competitor map
- business pressure test
- AI/GDPR/governance readiness report
- Company.OS fit score
- savings/capacity calculator
- first department rollout recommendation

Use:

- [Client Onboarding Discovery Pipeline](../operations/client-onboarding-discovery-pipeline.md)
- [Company Discovery Brief](../templates/company-discovery-brief.md)
- kit workflow: `.agents/workflows/business-pressure-test.md`
- script: `scripts/onboarding/first-company-packet.mjs`

Default first department candidates:

- Marketing / Growth
- Sales / Business Development
- Website / Web Ops
- Knowledge / SOP Governance

Do not recommend a full company rollout until the first department wedge is
clear and the readiness verdict is `go` or `pilot-only`.

## Phase 6.6 - Self-Serve Smoke Drill

Before claiming the install path for a new founder, run the public-RC install
drill from the public Company.OS source checkout:

```bash
node ~/Developer/company-os/scripts/install/public-rc.mjs install \
  --target ~/Developer/product-repo-self-serve-smoke \
  --company "Acme Systems" \
  --website "https://acme.example" \
  --offer "AI operating-system setup" \
  --buyer "founder-led service firms" \
  --approval-owner "Jane Founder" \
  --first-department marketing \
  --date YYYY-MM-DD \
  --json
```

The older combined smoke remains useful for regression checks:

```bash
node ~/Developer/company-os/scripts/install/self-serve-smoke.mjs run \
  --source ~/Developer/company-os \
  --date YYYY-MM-DD \
  --json
```

The public-RC drill proves the narrow 0.9 path end to end:

- bootstrap dry-run blocks collisions before writes
- bootstrap apply installs the kit
- signup/report seed writes intake, discovery brief, EVE boot packet and first
  Plane parent draft
- update check writes an update report
- update apply dry-run stays non-destructive
- public-RC handoff report tells EVE what is known and what needs confirmation

This does not replace founder onboarding. It only proves the repo artifacts can
produce the first install/onboarding/update evidence from a fresh target.

## Phase 7 - Company.OS Updates

Before a private/client overlay updates, prove update visibility from the
public source without mutating local state:

```bash
node ~/Developer/company-os/scripts/update/company-os-update.mjs check \
  --source ~/Developer/company-os \
  --target ~/Developer/product-repo \
  --to 0.9.0-rc.0 \
  --write-report
```

Then run the apply dry-run:

```bash
node ~/Developer/company-os/scripts/update/company-os-update.mjs apply \
  --source ~/Developer/company-os \
  --target ~/Developer/product-repo \
  --to 0.9.0-rc.0 \
  --dry-run
```

The update routine compares versioned kit files and preserves active local
state under `.company-os/`, including install record, workspace registry,
software stack, human gates, intake record and Plane draft. AionUI/Hermes/EVE
sidecar changes stay behind explicit operator approval.

## Phase 7 - GitNexus

For each code repo:

```bash
npx gitnexus analyze
npx gitnexus status
```

Create repo groups when product behavior spans multiple repos.

Rule:

```text
Impact before editing shared symbols.
Detect changes before ship.
High/Critical risk requires human gate.
```

## Phase 8 - GitHub

Set up:

- remote repositories
- branch protection
- required CI checks
- CODEOWNERS if needed
- PR template
- issue templates
- security scanning
- secret scanning
- agent worker issue template
- idea radar issue template

Public release gate:

```text
No public GitHub release until secret scan, license check, private-data scan,
and human approval pass.
```

## Phase 9 - Autonomous Ops And Automations

Install the generic operating loop:

- `VERSION`
- `CHANGELOG.md`
- `docs/releases/versioning.md`
- `docs/governance/directives.md`
- `docs/governance/agentic-sandbox-control-doctrine.md`
- `docs/operations/ceo-controller-agentic-protocol.md`
- `docs/operations/company-os-client-rollout-doctrine.md`
- `docs/operations/client-installable-autonomous-work-order-pipeline.md`
- `docs/operations/autonomous-ops-loop.md`
- `docs/operations/automation-registry.md`
- `docs/operations/git-worktree-hygiene-controller.md`
- `docs/operations/night-shift-backlog-archaeology.md`
- `docs/templates/human-gate-decision-brief.md`
- `docs/templates/founder-decision-profile.md`
- `docs/templates/worker-issue-contract.md`

Define:

- parent execution issue
- scheduler runtime: local Mac, cloud cron, CI, or workflow engine
- Night Controller cadence
- Git Worktree Hygiene cadence before night work
- Morning CEO Brief cadence
- department queues
- forgotten-work sweep
- idea radar
- weekly autonomy review
- report paths
- stop rules
- human gates

Mirror the installable client layer into the target workspace through the kit:

```text
.company-os/operations/autonomous-work-order-pipeline.md
.company-os/operations/install-record.example.md
.company-os/operations/workspace-registry.example.json
.company-os/operations/automation-registry.example.md
.company-os/templates/linear-worker-issue-template.md
```

Customize the example registry files before enabling scheduled dispatch.

Create:

- daily CEO brief
- department dailies
- nightly status/report job
- controller review cadence
- weekly autonomy review
- calendar attention blocks only for human decisions

Do not create calendar events for every agent task.

## Phase 10 - Department Queues

Define the first department queues based on the discovery verdict:

- Product Domain Queue
- Engineering / Code Quality Queue
- Marketing Queue
- Customer Ops Queue if relevant
- Business Ops Queue if relevant
- Company.OS / SOP Improvement Queue

Each queue should use the same worker issue contract and should report into the
Morning CEO Brief.

## Phase 11 - Marketing And Publishing

Set up:

- company voice guide
- blog/content repo or folder
- editorial calendar
- post/reply approval queue
- claim/compliance gate
- publishing checklist
- analytics and feedback loop

No autonomous outreach or public claims until the approval queue is proven.

## Phase 12 - First Pilot

Recommended first pilot:

1. CTO Agent or QA/Eval Agent.
2. Read-only audit.
3. Self review.
4. Controller review.
5. CEO intent fit observation.
6. SOP/skill/harness improvement.
7. No autonomy upgrade until repeated proof.
