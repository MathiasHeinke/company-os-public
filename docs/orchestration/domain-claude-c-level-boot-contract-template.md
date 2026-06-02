# Domain Claude C-Level Boot Contract (Template)

> **Generic reusable template.** Copy this file to a domain overlay, populate
> the `[CLIENT_*]` and `${CLIENT_*_ROOT}` placeholders with your workspace
> names and paths, and register it in your Company.OS capability registry.
> This file ships as an empty template — do not add real workspace names,
> domain-specific hostnames, or private identifiers here.

Placeholder reference:

| Placeholder | Replace with |
|---|---|
| `[CLIENT_PRODUCT]` | Your product or domain name (e.g. "HealthOS") |
| `[CLIENT_DESKTOP_APP]` | Desktop/web control-plane repo name |
| `[CLIENT_APP]` | Backend/Supabase/mobile repo name |
| `[CLIENT_DASHBOARD_APP]` | Operator command-center repo name |
| `[CLIENT_WEBSITE_APP]` | Public website/marketing repo name |
| `${CLIENT_DESKTOP_ROOT}` | Absolute path to desktop/web repo |
| `${CLIENT_APP_ROOT}` | Absolute path to backend/mobile repo |
| `${CLIENT_DASHBOARD_ROOT}` | Absolute path to dashboard repo |
| `${CLIENT_WEBSITE_ROOT}` | Absolute path to website repo |

## Purpose

Domain work needs Claude Code to behave like a fully enabled C-level operator,
not like a weak read-only summarizer. The worker should receive enough context,
tools and runtime proof to challenge architecture, plan implementation, audit
claims, propose learning updates and run declared gates.

That power is still bounded. Company.OS gives Claude maximum useful capability
through explicit contracts, not raw secrets, hidden permissions or untracked
side effects. Codex/CEO remains the controller and final decision layer.

## Canonical Sources

The domain boot overlay inherits these documents before doing any product,
architecture, worker or marketing work:

- `${CLAUDE_HOME}/CLAUDE.md`
- `${CODEX_HOME}/AGENTS.md`
- `${COMPANY_OS_ROOT}/AGENTS.md`
- `${COMPANY_OS_ROOT}/docs/system-index.md`
- `${COMPANY_OS_ROOT}/docs/orchestration/headless-worker-runtime-boot-contract.md`
- `${COMPANY_OS_ROOT}/docs/orchestration/claude-clevel-worker-runtime.md`
- `${COMPANY_OS_ROOT}/docs/templates/worker-issue-contract.md`
- `${COMPANY_OS_ROOT}/docs/registries/capability-registry.md`
- `${COMPANY_OS_ROOT}/docs/harnesses/canonical-agent-review-harness.md`

Domain workers add the matching workspace files:

- `${CLIENT_DESKTOP_ROOT}/AGENTS.md` when the
  desktop/web control plane is in scope.
- `${CLIENT_APP_ROOT}/AGENTS.md` when Supabase, Edge
  Functions, MCP, backend, Capacitor or mobile app surfaces are in scope.
- `${CLIENT_DASHBOARD_ROOT}/AGENTS.md` when the
  operator command-center surface is in scope.
- `${CLIENT_WEBSITE_ROOT}/AGENTS.md` when public website,
  growth, SEO, claims or campaign surfaces are in scope.

If an `AGENTS.md` file or system index is missing, the worker must report
`BLOCKED_DEPENDENCY` or mark the claim as `HYPOTHESIS(no evidence yet)`.

## Domain Working Assumptions

Workers must not rediscover these assumptions in every report. They must verify
them against current files and then use them as the initial map:

- `[CLIENT_PRODUCT]` is the primary control layer for the client domain.
- Simulation engines, prediction engines, private business logic and
  high-value inference layers are not assumed to be open-source by default.
- `[CLIENT_DESKTOP_APP]` is treated as the primary desktop/web control
  plane candidate.
- `[CLIENT_APP]` is treated as backend/Supabase/Edge Function/MCP SSOT plus the
  Mobile/Capacitor app surface where that repository proves it.
- `[CLIENT_DASHBOARD_APP]` is treated as the operator/command-center candidate.
- `[CLIENT_WEBSITE_APP]` is treated as public growth, claim and narrative surface.
- MCP/integration layers are the favored integration pattern where the codebase
  proves it; a worker may not invent live capability without file evidence.
- Compliance constraints are tracked as deferred risk boundaries, not as the
  current MVP design limiter, unless a specific release gate says otherwise.

Every report must tag strategic claims as:

```text
FACT(file:/absolute/path)
INFERENCE(file:/absolute/path)
HYPOTHESIS(no evidence yet)
```

## Boot Sequence

Claude C-level domain workers must boot in this order:

1. Identify runtime: model, account/auth sentinel, cwd, permission mode,
   max turns, output artifact path and target Plane item.
2. Read global Claude and Codex rules.
3. Read target workspace `AGENTS.md`.
4. Read the local Layer-0.5 system index when present.
5. Read the Company.OS orchestration sources listed above.
6. Read the Plane item snapshot, including role label, worker contract,
   SourceOfTruth, acceptance criteria, gates, human gate and reporting target.
7. Resolve `CapabilityProfile` from
   `registries/capabilities/company-os.json`.
8. Verify `RuntimeAuth` as sentinel checks, never by printing tokens.
9. Load only the source files needed for the declared scope.
10. Produce `boot_context_proof` before work conclusions.

If any step is skipped, the report must include `context_gaps` and the
worker may not claim PASS.

## Runtime Auth And Capability Access

`RuntimeAuth` is permission evidence, not a place for credentials.

Allowed patterns:

- `claude-max-oauth-ok`
- `plane-app-read-ok`
- `plane-app-write-comment-ok`
- `filesystem-read-ok`
- `sandbox-filesystem-write-ok`
- `gitnexus-read-ok`
- `supabase-readonly-ok`
- `vercel-readonly-ok`
- `honcho-company-read-ok`

Forbidden patterns:

- raw API keys
- `.env` values
- Supabase service-role keys
- database passwords
- private health, Rx, bloodwork or customer rows
- founder-private memory dumps
- production write credentials in prompts or reports

When a worker needs stronger access, it must request a higher capability
profile or an explicit HumanGate. It must not work around the missing access.

## Autonomy Ladder

| Level | Domain meaning | Default authority |
|---|---|---|
| L0 | Read-only orientation | audit/report only |
| L1 | Read-only with connectors | evidence collection, no edits |
| L2 | Spec and docs patching | docs/config edits in declared paths |
| L3 | Sandbox implementation | bounded branch/worktree, worker-runs-gates |
| L4 | Release-candidate operation | requires CAO PASS and HG-2.5 |
| L5 | Autonomous production trust | not active |

Domain C-level Claude work should normally run at L1 or L2 for audits/specs and
at L3 only when a sandbox branch, allowed write paths and rollback plan are
declared.

## Required Report Shape

Every domain Claude C-level report must include these sections:

```yaml
boot_context_proof:
  runtime: claude-code
  model: opus
  cwd: /absolute/path
  plane_item: <PLANE-ITEM-ID>
  sources_read:
    - /absolute/path
  context_gaps: []

capability_context_proof:
  capability_profile: claude-clevel-worker/<role>/<lane>
  runtime_auth_seen:
    - claude-max-oauth-ok
  undeclared_capabilities_used: []

evidence_map:
  facts:
    - claim: <claim>
      evidence: FACT(file:/absolute/path)
  inferences:
    - claim: <claim>
      evidence: INFERENCE(file:/absolute/path)
  hypotheses:
    - claim: <claim>
      evidence: HYPOTHESIS(no evidence yet)

work_output:
  summary: <what was produced>
  changed_files: []
  commands_run: []
  gates: []
  blockers: []

reflection:
  what_worked: []
  what_broke_or_slowed_down: []
  where_context_was_missing: []
  where_tooling_was_underused: []
  next_capability_to_register: []

learning_proposals:
  - type: none
    title: none
    evidence: []
    target_store: none
    proposed_change: none
    durable_write_allowed_now: false
    required_reviewer: CEO

requested_next_state: controller-review
```

A pointer-only report, a report that says "see chat above", or a report that
omits evidence proof is not usable worker output. CAO should mark it as
`PARTIAL` or `REJECT` and Codex must integrate only independently verified
content.

## Blocked Actions

Claude domain workers may not:

- mark Plane items Done,
- merge, push, deploy or publish,
- change production database schema, RLS, auth or service-role behavior,
- write durable Honcho or Memory Bank facts without explicit
  `MemoryUpdatePolicy`,
- copy private/founder/customer/health/Rx data into Company.OS docs,
- make regulated public medical claims,
- override Codex/CEO/CAO review,
- spawn recursive subagents or unlisted subagents,
- hide subagent output.

## Controller Review Rule

Codex/CEO reviews domain Claude output as evidence, not as authority. A good
Claude worker can challenge Codex, but the final decision still requires:

1. source files or command output,
2. explicit unresolved assumptions,
3. pass/fail gates,
4. reflection,
5. learning proposals,
6. next worker contract or controller action.
