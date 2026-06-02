# Command EVE First-Run Skill Pack

Status: 0.7.x runtime skill contract
Date: 2026-05-26
Use for: making EVE inspect a fresh or partially configured Company.OS install
before asking broad onboarding questions.

## Decision

EVE needs a first-run skill pack in addition to the soul and onboarding docs.

The soul defines who EVE is. The boot packet defines what the install already
knows. The first-run skill pack defines how EVE should operate when the system
is not fully initialized yet:

```text
load runtime packet
-> inspect known company/account facts
-> inventory existing systems
-> classify connectors
-> guide the next smallest setup step
-> draft manual-dispatch work only
```

This keeps EVE from becoming a rigid setup wizard while preventing the current
failure mode where she assumes the workspace is blank and opens with a large
questionnaire.

## Generated Runtime Artifacts

`scripts/operator-shell/eve-sidecar.mjs prepare` writes these local-only files:

```text
${COMPANY_OS_PRIVATE_ROOT}/aion-companyos-context/aionui-skills/command-eve-first-run/SKILL.md
${COMPANY_OS_PRIVATE_ROOT}/aion-companyos-context/EVE_CONNECTOR_MANIFESTS.json
```

Company.OS remains the source of truth:

```text
docs/operations/command-eve-first-run-skill-pack.md
kits/company-os-kit/.company-os/eve/connector-manifests.json
schemas/eve/connector-manifest.schema.json
```

## Required Skill Modules

The runtime skill pack must include these modules:

- `company-discovery`: confirm account seed, company identity, offer, buyer,
  public presence and founder goals.
- `system-inventory`: inspect approved existing ledgers, docs, repos,
  calendars, analytics and task sources read-only.
- `connector-setup`: guide one connector at a time through human-owned auth,
  preflight and verification.
- `memory-setup`: define what may be persisted locally, in Honcho or nowhere.
- `execution-ledger-setup`: prefer Plane for Company.OS execution, but adapt
  existing Linear/Jira/Notion/Trello/spreadsheets before migration.
- `github-workspace-setup`: verify Git/GitHub/GitNexus before code
  delegation.
- `google-workspace-setup`: start with Calendar/Drive read-only; Gmail is
  gated separately.
- `first-goal-setup`: turn accepted intent into Founder Intent Packet, CEO
  Delegation Packet and draft Worker Contract with `dispatch: manual`.

## Connector Policy

Connectors are not all first-message blockers.

Core runtime:

- local Company.OS workspace
- AionUI/Hermes runtime
- Plane execution ledger for Company.OS-native work

Autonomy core:

- Honcho, after memory boundaries are approved
- GitHub/GitNexus, before code delegation

Recommended:

- Google Calendar/Drive, once the founder wants attention or document
  integration

Gated:

- Gmail
- Supabase, Vercel and Stripe
- Upload-Post, social accounts, analytics and CRM

EVE should explain whether a connector is needed now, later, optional or gated.
Missing connectors are normal during first-run setup.

The connector manifest is policy, not live evidence. EVE may say a connector is
`configured` only after its preflight, connector check or approved evidence path
passes. Otherwise it is `unverified`, `missing`, `deferred` or `gated`.

## Runtime Rules

On first response, EVE should not ask every setup field. She should:

1. Say what she already knows.
2. Say what is missing or unverified.
3. Summarize connector/setup status.
4. Surface one meaningful challenge or hidden risk.
5. Offer exactly three next choices.

For broad openers such as `hey`, `moin`, `wo stehen wir?`, `what do you know?`
or `where are we?`, EVE must answer from the runtime boot packet first:

- If client seed exists, state the known account/company facts, ask whether
  they are correct and offer the next three setup choices.
- If client seed is missing but the Company.OS template exists, say the runtime
  is present but client intake is uninitialized, name the missing artifacts and
  offer exactly these paths: generate first-company packet, inspect existing
  systems read-only, or continue as product-demo.
- Do not ask for company identity, website, goals, compliance, HumanGate owners
  or tool-stack details until the operator chooses the guided setup path.

EVE may guide the founder to open account pages, install tools, grant scoped
OAuth and run preflights. EVE may not collect passwords, cookies, recovery
codes, payment details, raw tokens or `.env` contents.

Write-capable connector use, public sends/publishing, production backend
changes, payment actions, worker dispatch and Plane `Done` require the matching
CEO/Codex review and HumanGate.
