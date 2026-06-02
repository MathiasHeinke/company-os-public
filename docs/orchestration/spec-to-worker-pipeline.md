# Spec-to-Worker Pipeline

Status: canonical doctrine
Last updated: 2026-05-10
Use for: new projects, MVPs, cross-workspace features, public releases, and any
Plane item that should move from founder intent to autonomous worker execution

## Purpose

Company.OS now has a proven execution loop:

```text
Founder intent -> CEO/Codex -> Plane -> C-level role -> Worker runtime -> CAO -> Controller
```

GitHub Spec Kit adds a missing formal layer before execution. It forces the
system to make the normally implicit human planning process explicit:

```text
constitution -> specify -> plan -> tasks -> implement -> analyze/checklist
```

Company.OS does not replace Plane with Spec Kit. Plane remains the canonical
execution ledger. Spec Kit patterns are used as a product-architecture and task
normalization layer that turns vague intent into parseable, gated worker
contracts.

## Core Invariant

No new project, launch, MVP, major feature, public claim, regulated surface or
cross-workspace build may jump directly from idea to worker spawn.

It must pass through:

1. **Spec** — what is being built, for whom, why it matters, what is out of
   scope, and how the outcome is independently testable.
2. **Plan** — architecture path, workspaces, data flows, dependencies, risks,
   rollback and gates.
3. **Tasks** — independently executable slices, ordered by value and
   dependency.
4. **Worker Contract** — each delegable slice becomes one parseable Plane work
   item with a fenced flat YAML contract.
5. **Capability Gate** — scheduler validates runtime, role, tools, skills,
   connectors, memory surfaces and allowed write paths before spawn.
6. **Runtime** — Claude, Codex, Gemini or human worker executes only inside the
   declared scope.
7. **CAO / Controller** — verifies artifact truth, gates, report shape,
   subagents, capability proof, security/claims/privacy risk and next action.

## What To Cherry-Pick From Spec Kit

| Spec Kit pattern | Company.OS equivalent | Rule |
|---|---|---|
| Constitution | Governance / release / claims / privacy doctrine | Keep generic in Company.OS; install-specific rules live locally. |
| `spec.md` | Product / outcome spec | Must be user-value-first and independently testable. |
| `plan.md` | Product architecture path | Must name real repos, data flows, gates and rollback. |
| `tasks.md` | Plane worker-slice candidates | Must be converted to parseable Worker Issue Contracts before dispatch. |
| Checklist / analyze | CAO and Controller gates | Must become executable gates or explicit human review gates. |
| `taskstoissues` | Plane item creator / normalizer | Must target Plane, not GitHub Issues, unless a repo release explicitly chooses GitHub. |

Spec Kit may be installed in an isolated spec workspace or a new public repo.
Do not blindly initialize it inside existing ARES or Company.OS repos if it
would overwrite `.claude`, `.agents`, `AGENTS.md`, `CLAUDE.md`, hooks or local
skills. Existing project boot files are authoritative.

## Required Spec Frontmatter

Every Company.OS-compatible spec artifact should carry this header before it can
generate worker work:

```yaml
company_os_spec:
  version: 0.1
  project: <name>
  plane_workspace: companyos
  plane_project_id: <uuid>
  source_plane_item: <[WORK_ITEM_ID] or [WORK_ITEM_ID]>
  role_label: role:cto | role:cpo | role:cmo | role:coo | role:cfo | role:cao
  accountable_layer: CEO | C-Level | Worker | Controller | Founder
  workspace: registry:<key> | /absolute/path
  capability_profile: <registry profile name>
  data_classification: public | internal | private | regulated | mixed
  claims_risk: none | public-copy | medical | financial | legal | security
  human_gate_level: HG-0 | HG-1 | HG-2 | HG-2.5 | HG-3 | HG-3.5 | HG-4
  source_of_truth:
    - <absolute path, Plane page, report, or command>
  explicit_non_goals:
    - <what must not be built or claimed>
```

## Worker Contract Conversion

Spec artifacts and Plane prose are not enough for runtime dispatch. Every
delegable task must be converted into the flat fenced contract required by
`docs/templates/worker-issue-contract.md`.

Required minimum:

````markdown
```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: implement
workspace: ${COMPANY_OS_ROOT}
dispatch: ready
source_of_truth:
  - /absolute/spec.md
  - /absolute/plan.md
acceptance_criteria:
  - One independently verifiable outcome exists.
gates:
  - command or review gate
human_gate: HG-2.5
reporting: Plane worker.reported with boot proof, capability proof, changed files, commands, gates and risks.
BlockedActions: never print secrets; do not merge, deploy, publish, write production, write Linear, or mark Done unless the contract explicitly authorizes it.
```
````

HTML descriptions, headings named "Control Plane", nested YAML, or prose bullets
do not satisfy the dispatcher. If the fenced flat block is missing, Runtime
Dispatcher v0 must reject with `contract.required-field-missing`.

## Project Creation Rule

When a new project appears in Plane, the first items must establish the
execution substrate before workers build product code:

1. **North Star / Outcome Spec** — one-page project thesis and non-goals.
2. **Routing Matrix** — which repo, Plane project, pages, modules, cycles and
   source-of-truth docs own which surfaces.
3. **Spec Architecture** — where specs live, which Spec Kit patterns are used,
   and how they map to Plane.
4. **Per-Item DoD** — each active work item has acceptance criteria, gates and
   human gate.
5. **Capability Profile** — which runtime may use which plugins, connectors,
   skills, commands, subagents and memory stores.
6. **Risk Gates** — privacy, security, public claims, legal/compliance,
   financial and production-write gates are explicit before execution.

Only after those are present should a worker item move to `dispatch: ready`.

## Runtime Role Mapping

| Work type | Default role | Default agent | Notes |
|---|---|---|---|
| Architecture, schemas, runtime, integrations | `role:cto` | Claude or Codex | Codex for controller/high-confidence integration decisions; Claude for large-context implementation. |
| Product decisions, UX path, cutline | `role:cpo` | Claude | Requires user-facing acceptance criteria. |
| Positioning, launch, content, SEO | `role:cmo` | Claude | Requires public-claim and brand gates. |
| Operations, schedules, runbooks, migration | `role:coo` | Claude | Requires ledger/reporting/runbook gates. |
| Cost, pricing, runway, metrics | `role:cfo` | Claude or Codex | Requires numbers reconcile and cost-ledger gates. |
| Audit, privacy, claims, controller pass | `role:cao` | Separate audit session | CAO builds nothing and never self-passes building work. |

## ATLAS Failure Mode Captured

The ATLAS Plane project proved the gap this doctrine closes:

- Plane project exists.
- Labels, modules, cycles and pages exist.
- Work item descriptions contain useful "Control Plane" prose.
- But dispatcher dry-runs on representative items rejected with
  `contract.required-field-missing` because the descriptions did not contain
  the exact flat fenced Worker Issue Contract.

This is not an ATLAS-specific bug. It is the canonical failure mode for any new
project created outside the current Company.OS boot doctrine. The fix is not to
make the dispatcher parse arbitrary prose; the fix is to normalize specs and
Plane descriptions into the contract shape before runtime dispatch.

## Global Rollout Rule

All active workspaces are Plane-aware and Spec-to-Worker-aware:

- For Company.OS / orchestration work, Plane is canonical.
- For new project planning, use Spec Kit patterns before worker execution.
- For worker execution, only the Company.OS Worker Issue Contract is accepted.
- For headless runtime, the scheduler must inject boot pack, spec artifacts,
  Plane snapshot, source-of-truth files, capability profile and reporting rules.
- For learning, workers propose memory/SOP/skill/workflow changes; they do not
  silently mutate global doctrine.

## Gates

Before a spec-generated work item can run:

- `plane-dispatcher-v0 --mode dry-run` returns PASS.
- Runtime Dispatcher v1 capability preflight returns PASS.
- Source-of-truth files exist or are explicitly external.
- `AllowedWritePaths` or `Scope` makes write boundaries machine-checkable for
  implementation work.
- `HumanGateLevel` matches risk.
- Public claim, regulated data, security, financial and production surfaces
  have explicit gates.

## Productization Rule

Company.OS Kit must ship this same pattern for client installs:

```text
Client intent -> discovery spec -> architecture plan -> worker tasks ->
Plane contracts -> capability registry -> runtime -> audit -> CEO approval
```

The public/open-source version may expose the templates and validator. Private
client installs may add company-specific memory, connectors, roles and
capability profiles without changing the core pipeline.
