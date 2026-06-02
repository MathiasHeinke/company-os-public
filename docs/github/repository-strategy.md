# GitHub Repository Strategy

Company.OS should be usable in three GitHub modes:

1. Private internal company repo.
2. Client implementation repo.
3. Public MIT/open-source repo.

## Recommended Repos

| Repo | Visibility | Purpose |
|---|---|---|
| `Company.OS` | private first, public later | productizable operating system and kit |
| product repo | private | app/product implementation |
| website/content repo | public or private | marketing site, blog, docs |
| agent-runtime repo | private | schedulers, dispatchers, gateways, automations |
| knowledge repo | private or internal | wiki, SOPs, ADRs, domain docs |

## Company.OS Repo Contents

Should include:

- kit templates
- autonomous ops loop
- automation registry
- agentic sandbox control doctrine
- worker issue templates
- idea-radar templates
- install docs
- generic harnesses
- generic charters
- generic scorecards
- generic workflows
- sanitized examples
- report contracts
- release gates
- MIT license

Should not include:

- secrets
- live `.env`
- raw chat logs
- personal memory
- customer data
- production credentials
- private medical/legal details
- unlicensed third-party content copied wholesale

## Public-Release History Policy

**Selected strategy:** Fresh-history public mirror repository seeded by a
deterministic sanitization script. Documented in
`docs/releases/public-history-strategy.md` (ADR, [WORK_ITEM_ID]).

The private staging repository (`Company.OS`) is never force-pushed or
history-rewritten for public-release purposes. Public releases use a separate
destination repository seeded from the output of
`scripts/release/build-public-mirror.mjs` with a single root commit per release.

**Current release track status: `0.6.0-beta.1` public fresh-history mirror
pushed to `MathiasHeinke/company-os-public` after HG-2.5 approval.**

Completed foundations:

- `scripts/release/build-public-mirror.mjs` builds the sanitized mirror.
- `scripts/release/verify-clean-clone.mjs` verifies a clean clone surface.
- `scripts/release/verify-fresh-history-remote.mjs` proves a local
  fresh-history remote, remote clone, and bootstrap install.
- `docs/releases/release-destination-runbook.md` defines the no-push packet and
  HG-2.5 hold before any external remote write.

Remaining release boundary: no worker may push to a real destination repository,
create a tag, upload a release, rotate credentials, write Linear, or mark Plane
Done. The first external remote write was CEO/Codex-owned under [WORK_ITEM_ID]
HG-2.5; future external writes remain under the same release authority.

## GitHub Release Gate

Before pushing public:

```bash
find . -type f \( -name '.env' -o -path '*/node_modules/*' -o -name '.DS_Store' \)
rg -n "(API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|SERVICE_ROLE|sk-|ghp_|xoxb-)" .
git status --short
```

Then review:

- license compatibility
- private-data scan
- third-party copied content
- branding and naming
- README clarity
- install path works on a fresh clone

## Branch And PR Rules

Recommended:

- `main` protected
- PR required
- at least one controller review for harness/charter changes
- at least one controller review for automation, autonomy, scheduler, release
  gate, issue template or worker contract changes
- secret scan before merge
- markdown link check before release
- versioned releases for stable kit snapshots

## GitHub As Execution Ledger Fallback

Plane is the canonical execution ledger for Company.OS because it carries
contracts, role labels, scheduler state, CAO/controller evidence and human-gate
decisions. GitHub Issues can still run a smaller installation when Plane is not
available in the target company.

Minimum GitHub issue templates:

- `Agent Worker Issue`: bounded work with Agent, Mode, Workspace, Dispatch,
  RunAt, SourceOfTruth, Scope, Acceptance Criteria, Gates, HumanGate and
  Reporting.
- `Idea Radar Candidate`: a non-urgent idea that should be decided, parked,
  killed or scheduled later.

Rules:

- Raw ideas stay in the idea radar until a CEO/controller decision turns them
  into execution work.
- Agent workers must not close their own issues unless the acceptance criteria
  and gates are proven.
- Public publishing, outreach, money movement, production writes and
  medical/legal/regulated claims require explicit human approval.
- PRs changing automations or autonomy require controller review.

## Automation Parity

Every repo using Company.OS should include:

- [Governance Directives](../governance/directives.md)
- [Agentic Sandbox Control Doctrine](../governance/agentic-sandbox-control-doctrine.md)
- [Autonomous Ops Loop](../operations/autonomous-ops-loop.md)
- [Automation Registry](../operations/automation-registry.md)
- [Backlog Archaeology And Idea Radar](../operations/night-shift-backlog-archaeology.md)
- [Worker Issue Contract](../templates/worker-issue-contract.md)
- GitHub issue templates for worker issues and ideas
- Pull request template with security, release and human-gate checks

The public repo may contain generic schedules, prompt shapes and sandbox branch
contracts. Active local automation IDs, private local paths and company-specific
targets should live in private implementation docs or be marked as examples.

## Release Naming

Use:

- `v0.1-foundation`
- `v0.2-c-level-charters`
- `v0.3-control-plane`
- `v0.4-runtime-integrations`
- `v0.5-marketing-ops`
- `v0.6-autonomous-ops-loop`
