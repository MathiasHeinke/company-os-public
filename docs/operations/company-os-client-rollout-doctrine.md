# Company.OS Client Rollout Doctrine

Status: canonical rollout HowTo
Version: `0.3.1-alpha.1`
Productization status: guided alpha; not yet self-serve
Use for: installing Company.OS into a new company or workspace
Last updated: 2026-05-10

## Purpose

This document captures the current learned rollout pipeline.

It is the operational bridge between the product docs and a real client install:

```text
Company intent
-> source-of-truth docs
-> workspace registry
-> execution ledger
-> company discovery and pressure test
-> C-level role owners
-> bounded worker contracts
-> executable preflight gates
-> scheduled controller pass
-> worker reports
-> controller synthesis
-> HumanGate decision
-> next safe dispatch
```

The goal is not to make agents "fully autonomous." The goal is to make routine
work continue without the founder carrying state, while production risk, public
trust, money, regulated claims and final company direction stay under human
authority.

## What We Learned

### 1. Version Must Be Explicit

Do not install "the latest Company.OS." Install a version.

Required install metadata:

```text
Company.OS version: 0.3.1-alpha.1
Productization status: guided alpha
Runtime proof: Stage 7 / 9 proven by pilot; Stage 8-9 gated
Install date:
Execution ledger:
Workspace registry:
HumanGate owner:
First pilot issue:
```

Product version and autonomy profile are different. A codebase can be versioned
while its autonomy profile is still low because runtime auth, budgets, reports
or review loops are unproven.

### 2. Founder Intent Must Become A Work Order

The founder or CEO should not carry state in chat.

Every serious request becomes one of:

- source-of-truth doc update
- memory conclusion or memory proposal
- execution-ledger parent issue
- bounded worker issue
- calendar decision block
- explicit parked/no-action note

The execution ledger tracks action. Durable truth lives in docs, memory, code,
wikis and ADRs.

### 3. RoleOwner, Runtime Worker And HumanGateOwner Are Separate

Do not encode accountability only as `assignee`.

Separate:

| Field | Owns |
|---|---|
| `RoleOwner` | Fachliche bar and accountability. |
| `Agent` | Runtime that performs the bounded work. |
| `Controller` | Review, synthesis and gate state. |
| `HumanGateOwner` | Irreversible or high-trust decision. |

This allows a CMO-owned workstream to use a low-cost worker, a high-context
auditor and Codex/controller synthesis without pretending one user owns all
states.

### 4. A 10/10 Work Order Is Machine-Readable

Before dispatch, apply the 10/10 work-order quality bar from
`docs/operations/client-installable-autonomous-work-order-pipeline.md`.
If the work began from GitHub Spec Kit, ATLAS-style planning, a founder brief
or a product spec, first normalize it through
`docs/orchestration/spec-to-worker-pipeline.md`.

Minimum bar:

- agentic plan mode is explicit: `inline`, `linked` or `hybrid`
- current decision is explicit
- source-of-truth files are linked
- control-plane fields are machine-readable
- worker steps are real contracts
- data model is operational
- acceptance criteria are verifiable
- HumanGate is a decision surface
- reporting is reducible
- next dispatch is named
- controller synthesis is reserved for the controller

If an issue is understandable only to the person who wrote it, it is not ready
for autonomous work.

HTML Control Plane blocks, nested YAML and `tasks.md` files are planning
artifacts, not dispatch artifacts. A worker-ready issue must include a flat
fenced `worker_issue_contract` block.

### 5. Night Work Needs Executable Gates

Prompt instructions are not a hard boundary.

Before unattended work, the system needs executable gates:

| Gate | Purpose |
|---|---|
| Git worktree hygiene | Blocks dirty roots, dirty sandboxes and ambiguous worktrees. |
| Runtime auth preflight | Blocks doomed jobs before login prompts or missing credentials waste a slot. |
| Hard cron wrapper | Enforces lock, dedupe, preflight, budget, redaction and exit-code gates. |
| Budget brake | Stops model runs before max-run/day/month limits are exceeded. |
| Artifact Truth | Verifies report/artifact freshness and provenance. |
| HumanGate release validator | Allows HG-1/HG-2 only with evidence; blocks HG-3 automation. |

The controller should report bypasses as `RUNTIME-HARDENING-BYPASS-BLOCKED` or
`UNHARDENED-RUN`, not as autonomous success.

### 6. Git Hygiene Is A Guard, Not A Cleanup Bot

The first real hygiene pass found a useful blocker immediately: an untracked
database migration. The correct pattern is:

```text
detect
-> report blocker
-> preserve on clear branch if needed
-> return root to clean baseline
-> rerun hygiene
```

The hygiene controller may not run:

- `git reset`
- `git clean`
- branch deletion
- worktree removal
- push
- pull/merge/rebase
- deploy

Cleanup remains CEO/human controlled because it can destroy work.

### 7. L3 Is Sandbox-Only

Current autonomy profile supports:

- L1: read, report, preflight, hygiene, local dry-run
- L2: plan, audit, triage, low-risk internal docs, controller comments
- L3: sandbox branch/worktree and human-review packet

Current profile does not support:

- direct merge
- push
- deploy
- production writes
- schema/RLS/auth/service-role changes
- public publishing
- external outreach
- new spend
- durable memory writes by workers
- direct Done transition

### 8. Morning Brief Is The Reduction Layer

Night work is useful only if it reduces to a morning decision.

Morning brief must include:

- what ran
- what was blocked
- what used hardened executable gates
- what bypassed or failed gates
- artifact/report paths
- HumanGate decisions
- next three safe dispatches
- stale assumptions and improvement proposals

Dreaming remains proposal-only until controller or CEO review accepts it.

## Rollout Pipeline

### Phase 0 - Version And Governance

1. Read `VERSION`.
2. Read `docs/releases/versioning.md`.
3. Read `docs/operations/client-productization-readiness.md`.
4. Record install metadata.
5. Decide the initial autonomy ceiling. Default: `L2`.
6. Decide HumanGate owners for HG-1, HG-2, HG-2.5 and HG-3.

Output:

```text
.company-os/install-record.md
```

### Phase 1 - Install The Kit

Copy the kit into the target company workspace:

```bash
rsync -a /path/to/Company.OS/kits/company-os-kit/. /path/to/company-workspace/
```

Then customize:

- `AGENTS.md`
- `memory-bank/system-index.md`
- `.company-os/operations/workspace-registry.example.json`
- `.company-os/operations/automation-registry.example.md`
- `.company-os/templates/linear-worker-issue-template.md`
- `.company-os/charters/*.md`

Rename examples only after customization:

```text
.company-os/operations/workspace-registry.json
.company-os/operations/automation-registry.md
```

Before enabling any scheduler lane, run:

```bash
node scripts/release-gates/productization-readiness.mjs check
```

### Phase 1.5 - Company Discovery And Business Pressure Test

Before creating a large backlog or enabling scheduled dispatch, run the
discovery pipeline.

Optional public pre-step:

```text
https://github.com/MathiasHeinke/ai-business-blueprint
```

AI Business Blueprint can run before the paid Company.OS audit as a founder
diagnostic and lead-magnet workbook. Its outputs may seed the company discovery
brief, website scan, market map and business pressure test, but they do not
replace controller verification, AI/GDPR readiness or Company.OS fit scoring.

Required source:

```text
docs/operations/client-onboarding-discovery-pipeline.md
```

Required bundle:

```text
company-discovery-brief.md
website-scan.md
market-map.md
business-pressure-test.md
ai-governance-readiness.md
company-os-fit-score.md
savings-calculator.md
rollout-recommendation.md
```

The pressure test exists to prevent the system from automating the wrong
business, wrong offer or wrong department. It must name current customer
behavior, competitors, urgency, fatal flaws and the smallest next test.

Default first department wedge:

1. Marketing / Growth
2. Sales / Business Development
3. Website / Web Ops
4. Knowledge / SOP Governance

Do not start with full-company rollout. Start with the first department that has
the highest value per safe action and the lowest trust-boundary risk.

### Phase 2 - Define The Control Plane

Create or configure:

- execution ledger project/team
- parent control-plane issue
- workspace registry
- automation registry
- discovery report root
- C-level role owners
- worker routing policy
- report root
- event ledger path
- cost ledger path
- blocked actions
- first pilot issue

Do not create 100 worker issues before the first pilot proves the loop.

### Phase 3 - Runtime And Auth Preflight

Configure only the runtimes needed for the first pilot.

Required:

```bash
node /path/to/Company.OS/scripts/runtime/automation-runtime-runner.mjs \
  auth-preflight \
  --company-root /path/to/Company.OS \
  --json \
  --soft
```

If execution ledger access is configured:

```bash
node /path/to/Company.OS/scripts/linear/headless-linear.mjs \
  auth-preflight \
  --json \
  --soft
```

No scheduled job should ask the founder to approve routine connector access.
If auth is missing, record a runtime setup blocker.

### Phase 4 - Git And Workspace Hygiene

Before the first night pass:

```bash
node /path/to/Company.OS/scripts/git-hygiene/check-git-hygiene.mjs \
  --registry /path/to/company-workspace/.company-os/operations/workspace-registry.json \
  --fail-on-blockers
```

Use the strict close-session gate before ending a human or agent work session:

```bash
node /path/to/Company.OS/scripts/git-hygiene/check-git-hygiene.mjs \
  --registry /path/to/company-workspace/.company-os/operations/workspace-registry.json \
  --close-session
```

Pass condition:

- no dirty roots
- no stash entries
- no dirty sandbox worktrees
- no excess worktrees
- no missing roots
- no disallowed detached roots

Warnings such as ahead/behind may continue to the morning brief in normal
nightly mode. In close-session mode they block until the branch is pushed,
pulled, PR'd, parked or intentionally exempted.

### Phase 5 - Create The First Work Order

Create one parent work order and one W0 preflight child.

W0 should be read-only:

```text
Agent: codex
Mode: verify
AutonomyLevel: L1
Workspace: registry:company-os
Scope: validate source-of-truth, registry, auth, reports and gates
HumanGateLevel: HG-0
```

Then add one or two bounded L2 workers:

- first-pass plan
- data/model review
- risk audit

Do not start with L3 implementation.

### Phase 6 - Scheduled Controller Pass

A scheduled pass should run:

```text
git-worktree-hygiene
-> runtime-auth-preflight
-> night-controller
-> optional low-cost worker sidecar
-> controller synthesis
-> morning-ceo-brief
-> daily-improvement-dream proposal
```

Any child command that writes reports, ledgers or starts workers should be
wrapped by the hard cron wrapper or an equivalent executable gate.

### Phase 7 - Shadow Before Sandbox

Before L3:

```bash
node /path/to/Company.OS/scripts/sandbox-pr/simulate-autonomy-shadow-run.mjs \
  --contract /path/to/worker-contract.md \
  --json
```

Proceed only when the shadow run predicts:

- dispatch is allowed
- blocked actions remain blocked
- no unresolved HG-3 action exists
- branch/worktree name is deterministic
- next safe action is clear

### Phase 8 - Sandbox PR Packet

When L3 is approved:

```bash
node /path/to/Company.OS/scripts/sandbox-pr/prepare-sandbox-pr-pilot.mjs \
  --contract /path/to/worker-contract.md \
  --workspace-root /path/to/target-workspace \
  --output-dir /path/to/reports/sandbox-pr/YYYY-MM-DD \
  --json
```

Only create a worktree when readiness passes and the contract explicitly allows
L3 sandbox work.

Expected end state:

```text
ready-for-human-review
```

Not:

```text
merged
deployed
done
```

### Phase 9 - Morning Review And Promotion

Morning review decides:

- keep current autonomy
- restrict a lane
- rerun with narrower scope
- promote one specific lane
- create follow-up worker issue
- require human/founder decision

Autonomy promotion requires evidence over repeated runs.

## Minimum Acceptance Criteria For A New Install

A new company install is not ready until:

- `VERSION` and autonomy profile are recorded
- workspace registry resolves real paths
- automation registry names schedules, owners, outputs and stop rules
- execution ledger has parent issue plus W0 preflight issue
- git hygiene reports no blockers
- runtime auth preflight reports no blocking auth issue for the pilot
- first work order passes the 10/10 quality bar
- first report artifact is written
- first controller synthesis names the next safe dispatch
- HG-3 boundaries are explicitly blocked

## Upgrade Checklist

When upgrading an existing install to `0.2.0-alpha.1`:

- add `VERSION` to local install metadata
- copy the latest worker issue template
- add the 10/10 quality bar to controller checklist
- add Git Worktree Hygiene before night-controller
- verify hard cron wrapper usage for scheduled child commands
- verify HumanGate release validator is used for HG-1/HG-2
- verify cost router/budget brake for model sidecars
- verify Artifact Truth reports are included in morning brief
- rerun Page Index after doc changes

### 0.7.4-rc.0 → 0.9.0-rc.0 Update Path

The `0.9.0-rc.0` line accepts one supported in-place update: an existing
`0.7.4-rc.0` install. Earlier 0.6.x, 0.7.0, 0.7.1 and 0.7.3 installs must
reach `0.7.4-rc.0` first; there is no one-shot path to 0.9 from those lines.

A remote founder runs the canonical update command twice in non-destructive
mode before any non-dry-run apply:

```bash
# 1. Check against the public clone; writes markdown+JSON report.
node scripts/update/company-os-update.mjs check \
  --source /path/to/company-os-public \
  --target /path/to/existing-074-install \
  --to 0.9.0-rc.0 \
  --write-report \
  --json

# 2. Dry-run apply to see exactly which files would change.
node scripts/update/company-os-update.mjs apply \
  --source /path/to/company-os-public \
  --target /path/to/existing-074-install \
  --to 0.9.0-rc.0 \
  --dry-run
```

Both commands record:

- `source_version` (read from the source `VERSION`),
- `target_version` (read from `.company-os/install-record.md` on the target),
- `to_version` (must match the source `VERSION` exactly when `--to` is set),
- `source_provenance`: git remote URL, HEAD, branch and `public/private/unknown`
  classification of the source clone,
- `kit_secret_audit`: a scan of the kit source for known secret-leak
  filenames (`.env*`, `secrets.json`, `credentials.yaml`, `connector-auth.json`).

The dry-run report under `<target>/reports/company-os-updates/<YYYY-MM-DD>/`
shows every kit file classified as `add`, `update`, `unchanged`,
`manual-review`, `collision` or `blocked`. Only `add` and `update` are copied
during a real apply. `collision` (would overwrite local state),
`blocked` (hard-blocked path such as install-record / workspace-registry /
human-gates) and `manual-review` (connector manifests, EVE soul) are skipped
by default and reported as work for the operator.

The update never reaches outside the public source tree. The kit excludes
`.env`, raw credentials and connector auth files by construction, so the
update path cannot pull private state into a public target. If the source
clone is classified `private`, the report includes an explicit warning so
operators do not publish artifacts produced from that run.

## Stop Rules

Stop and report, do not improvise, when:

- source-of-truth is unclear
- workspace registry does not resolve
- root workspace is dirty
- sandbox worktree is dirty
- runtime auth is missing
- model budget is unknown or exceeded
- artifact truth fails
- worker prompt cannot be redacted
- HumanGate level is unclear
- requested action touches HG-3 boundaries

The system gets more autonomous by proving safe bounded loops, not by hiding
uncertainty.
