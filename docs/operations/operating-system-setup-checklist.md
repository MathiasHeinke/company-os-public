# Operating System Setup Checklist

Use this checklist when setting up Company.OS in a new firm.

## Identity

- [ ] Company name defined
- [ ] Company.OS version recorded from `VERSION`
- [ ] Client Productization Readiness reviewed
- [ ] Autonomy profile recorded from the rollout doctrine
- [ ] Install metadata created from `docs/templates/company-os-install-record.md`
- [ ] Founder/CEO decision profile drafted
- [ ] Company voice guide drafted
- [ ] Initial strategy document created
- [ ] First 90-day priorities defined

## Company Discovery

- [ ] AI Business Blueprint intake checked or explicitly skipped
- [ ] Company discovery brief created from `docs/templates/company-discovery-brief.md`
- [ ] Website/public-surface scan completed
- [ ] Market and competitor map completed
- [ ] Business pressure test completed
- [ ] Current customer behavior named
- [ ] First 10 customers/leads path identified if relevant
- [ ] AI/GDPR/governance readiness report completed
- [ ] Company.OS fit score created
- [ ] Savings/capacity calculator created as a range, not a guarantee
- [ ] First department wedge selected
- [ ] Full-company rollout explicitly rejected until first wedge proves the loop

## Repositories

- [ ] GitHub org/user ready
- [ ] `Company.OS` repo cloned
- [ ] Product repo created
- [ ] Website/content repo created if needed
- [ ] Agent runtime repo created if needed
- [ ] Branch protection configured
- [ ] Agent worker issue template installed
- [ ] Idea radar issue template installed
- [ ] Pull request gate template installed

## Agent Runtimes

- [ ] Codex available and trusted in intended workspaces
- [ ] Claude Code CLI installed
- [ ] Claude login verified
- [ ] Claude auth sentinel returns `CLAUDE_AUTH_OK`
- [ ] Gemini CLI installed
- [ ] Gemini headless sanity check passed
- [ ] Runtime cost/billing limits understood

## Memory And Knowledge

- [ ] Honcho company workspace created
- [ ] Honcho personal/founder workspace separated if needed
- [ ] Honcho user/product memory separated if needed
- [ ] Memory-bank installed
- [ ] Wiki/knowledge folder created
- [ ] ADR folder created
- [ ] Memory namespace rules documented
- [ ] Layer-0.5 system index created
- [ ] Page Index generated and checked

## Execution Ledger

- [ ] Plane workspace configured
- [ ] Plane App install path chosen; API key only bootstrap/fallback
- [ ] First Plane project created
- [ ] Native states verified
- [ ] `role:*` labels created
- [ ] Agent-ready Plane work item template created
- [ ] Parent Company.OS control-plane work item created
- [ ] Worker issue contract tested
- [ ] Linear import/bridge scope documented if legacy Linear exists

## Code Intelligence

- [ ] GitNexus installed
- [ ] Product repo indexed
- [ ] Website repo indexed if needed
- [ ] Repo groups created if needed
- [ ] Impact/detect workflow documented

## Control Plane

- [ ] Workspace registry created
- [ ] Versioning doctrine reviewed
- [ ] Client productization readiness gate reviewed
- [ ] Client rollout doctrine reviewed
- [ ] Spec-to-Worker pipeline reviewed
- [ ] Client-installable work-order pipeline reviewed
- [ ] Kit pipeline guide copied into target workspace
- [ ] Client onboarding discovery pipeline reviewed
- [ ] Install record copied into `.company-os/install-record.md`
- [ ] Workspace registry example customized and promoted to active registry
- [ ] Automation registry example customized and promoted to active registry
- [ ] Plane worker issue template installed in the execution ledger
- [ ] 10/10 work-order quality bar applied to the first pilot
- [ ] Agent dispatch policy defined
- [ ] Read-only default enforced
- [ ] RunAt and DependsOn semantics defined
- [ ] Ledger/report directory created
- [ ] Remote lock/status policy defined
- [ ] Always-allow baseline configured for every active automation
- [ ] Runtime/headless helpers do not prompt for routine in-scope automation actions
- [ ] Linear scheduled jobs use `scripts/linear/headless-linear.mjs`, not the UI connector
- [ ] Runtime auth preflight configured for every active automation dependency
- [ ] Plane App token rotation gate configured before any unattended Plane writes
- [ ] Git worktree hygiene controller configured before night-controller jobs
- [ ] Autonomous Ops Loop installed
- [ ] Automation Registry created
- [ ] Night Controller schedule defined
- [ ] Morning CEO Brief schedule defined
- [ ] Backlog Archaeology sweep defined
- [ ] Idea Radar process defined
- [ ] Stop rules and human gates written per automation

## Resale / Client Pipeline Readiness

- [ ] No source-company names, private paths, customer data or secrets in the kit
- [ ] Productization readiness gate passes in guided-alpha mode
- [ ] Public release gate either passes with `--public-release` or is explicitly blocked
- [ ] Handover includes `VERSION`, `CHANGELOG.md`, versioning doctrine and rollout doctrine
- [ ] Client install record names exact version, autonomy profile and disabled lanes
- [ ] Client workspace registry uses local client paths and portable registry keys
- [ ] Execution ledger has parent control-plane issue and first pilot issue
- [ ] C-level charters customized for the client
- [ ] HG-0/HG-1/HG-2/HG-3 matrix reviewed with the client
- [ ] External worker redaction policy accepted
- [ ] Cost-router budget envelope configured
- [ ] Runtime auth preflight passes headlessly
- [ ] First pilot is read-only and report-only
- [ ] Client handover includes next three work orders and blocked actions

## Optional Product Connectors

- [ ] Supabase treated as optional product backend/connector, not Company.OS core
- [ ] Supabase RLS reviewed if the client product uses Supabase
- [ ] Supabase service-role keys excluded from worker prompts and reports
- [ ] Stripe connector gated behind spend/pricing HumanGate
- [ ] Vercel connector gated behind deploy/publish HumanGate
- [ ] Gmail/Calendar connector gated behind outreach/attention HumanGate

## C-Level Layer

- [ ] CEO Worker charter
- [ ] CTO Agent charter
- [ ] CPO Agent charter
- [ ] CMO Agent charter
- [ ] QA/Eval/Governance Agent charter
- [ ] Role-specific score patterns
- [ ] Autonomy levels defined

## Performance Layer

- [ ] Agent Self Review Card enabled
- [ ] Controller Review Card enabled
- [ ] CEO Intent Fit Card customized
- [ ] Daily performance loop scheduled
- [ ] Weekly autonomy review scheduled
- [ ] Morning CEO Brief includes forgotten work, stale assumptions and ideas
- [ ] Controller can decide revive / park / kill / schedule

## Marketing And Publishing

- [ ] Content strategy created
- [ ] Blog/posting workflow created
- [ ] Approval queue defined
- [ ] Claim/compliance gate defined
- [ ] Analytics feedback loop defined

## Security And Compliance

- [ ] Secret manager selected
- [ ] `.env` excluded
- [ ] Secret scan run
- [ ] Privacy/legal gates documented
- [ ] Production write gates documented
- [ ] Incident review template created

## First Pilot

- [ ] Read-only pilot issue created
- [ ] Pilot department selected from the discovery verdict
- [ ] Agent selected
- [ ] Controller selected
- [ ] Source of truth attached
- [ ] Gates defined
- [ ] Self review completed
- [ ] Controller review completed
- [ ] CEO intent fit observed
- [ ] Follow-up improvements created
- [ ] Morning brief created from pilot evidence
- [ ] No autonomy upgrade without repeated proof
