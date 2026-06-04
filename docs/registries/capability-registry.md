# Capability Registry

## Purpose

The Capability Registry is the executable allowlist for Company.OS runtime
workers. It turns the C-Level worker doctrine into machine-checkable profiles
before a scheduler or dispatcher starts Claude, Codex, Gemini, or another
runtime.

The registry answers five questions before dispatch:

1. Which agent may run this work item?
2. Which C-Level role does that agent operate under?
3. Which workspace may it touch?
4. Which plugins, connectors, commands, skills, subagents, and memory surfaces
   are allowed?
5. Which Claude CLI tools and declared gate commands may run without asking the
   controller to do routine validation later?
6. Which autonomy level is allowed before the task needs CEO or Founder review?
7. Which model default and context/domain read pack should make the worker
   intelligent enough for the job?

For model-agnostic runtime routing, also read
`docs/orchestration/multi-inference-c-level-runtime.md`. That document defines
how C-Level seat, runtime agent, inference budget and HumanGate stay separate
when Claude, Codex, Gemini or future providers compete for a work item.

## Canonical Files

- Registry data: `registries/capabilities/company-os.json`
- Core validator: `scripts/capabilities/capability-registry-core.mjs`
- CLI validator: `scripts/capabilities/capability-registry.mjs`
- Runtime hook: `scripts/orchestration/runtime-dispatcher-v1.mjs`

## Contract Field

Every scheduler-runnable Plane work item must declare a flat contract field:

```yaml
CapabilityProfile: claude-clevel-worker/cto/runtime
```

The profile must match:

- `Agent`
- `RoleLabel`
- `Mode`
- `Workspace`
- `AutonomyLevel`, when declared
- `SubAgentRoster`, when declared
- `MemoryStore` / `MemoryUpdatePolicy`, when declared

If a non-human `Agent` is present without `CapabilityProfile`, the runtime
dispatcher blocks with `capability.profile-missing`. This includes Claude,
Codex, Gemini, OpenRouter and future model-backed workers. `Agent: human` may
remain profile-less because the human gate is not dispatched through the
runtime harness.

Before Codex, Gemini or OpenRouter can become first-class scheduled worker
lanes, the registry must contain audited profile families such as:

```text
codex-clevel-worker/cto/runtime
codex-clevel-worker/cpo/runtime
gemini-clevel-worker/cto/audit
gemini-clevel-worker/cpo/audit
openrouter-sidecar/cmo/research
```

Until then, non-Claude runtimes are proposal, audit or manual-controller lanes,
not autonomous primary worker lanes.

## Runtime Defaults And Context Packs

Profiles may declare runtime defaults and context packs. These are not broad
write grants. They are intelligence grants: the worker may receive enough
domain context to reason well, while edit scope remains controlled by
`Workspace`, `AllowedWritePaths`, scope guard and HumanGate.

```json
{
  "runtime_defaults": {
    "runtime_agent": "claude",
    "runtime_model_alias": "opus",
    "resolved_model_observed": "claude-opus-4-7",
    "inference_budget": "max-context",
    "context_window_tokens": 1000000
  },
  "context_packs": [
    {
      "id": "raindrop-marketing-observability-v0",
      "read_paths": ["${COMPANY_OS_ROOT}/docs/operations/raindrop-llm-call-observability.md"],
      "write_paths": [],
      "blocked_reads": ["secrets", ".env", "private-founder-context", "browser-cookies"]
    }
  ]
}
```

Use this when a worker repeatedly fails because it lacks cross-file doctrine
context, as happened during the Raindrop marketing-pipeline wrapper pilot:
Claude Opus was the correct model, but the first contracts underfed it with
Raindrop source-of-truth files. The fix is a declared domain read pack, not
loosening write access.

## Claude Tool And Gate Execution

Profiles may declare `allowed_claude_tools`. Runtime Dispatcher v1.2 passes
those entries to Claude CLI as `--allowed-tools`, then adds safe `Bash(...)`
patterns derived from the work item's `Gates:` block.

This is deliberately stronger than prompt-only policy:

- Claude workers must run declared safe gates themselves when allowed.
- The controller still reruns or samples gates for the final verdict.
- Harness denial for a declared gate is a `BLOCKED_DEPENDENCY`, not a PASS.
- Runtime dry-run fails before worker spawn when an executable `Gates:` command
  is neither safe-derived nor covered by explicit `allowed_claude_tools`.
- Runtime dry-run rejects shell-composed gate commands (`&&`, pipes, redirects,
  subshells). Split them into separate gate entries.
- Explicit `Bash(...)` entries without trailing `*` cover only the exact
  command. Use `Bash(path/to/tool*)` when the gate passes arguments.
- Unsafe commands are not derived from `Gates:` even if a work item asks for
  them. Deploy, publish, push, merge, production writes, schema/RLS/auth and
  service-role work remain gated surfaces.

Safe derived gate prefixes today:

- `node --check`, `node --test`
- `pnpm test`, `pnpm build`, `pnpm lint`, `pnpm exec eslint`
- `npm test`, `npm run test`, `npm run build`, `npm run lint`
- `git status`, `git diff`, `git diff --check`, `rg`
- `npx gitnexus status`, `npx gitnexus detect-changes`

## Stable Reject Codes

- `capability.profile-missing`
- `capability.profile-not-found`
- `capability.stale`
- `capability.undeclared-tool`
- `capability.memory-boundary-violation`
- `capability.autonomy-too-high`
- `capability.registry-invalid`

Internal validator reasons for the `sandbox_workspaces` field (surface as
`capability.registry-invalid` at the runtime boundary):

- `sandbox-pattern-empty`
- `sandbox-pattern-not-absolute`
- `sandbox-pattern-traversal`
- `sandbox-pattern-wildcard-not-final`

The Runtime Dispatcher v1 `preflightSandboxWorkspace` guard runs alongside
the capability preflight and emits the stable reason
`runtime.sandbox-workspace-alias-unsafe` (run state `BLOCKED_DEPENDENCY`)
when an edit-capable contract (`Mode: implement` + `Sandbox: required`)
declares a canonical workspace alias instead of an absolute sandbox
worktree path under an approved sandbox root. See
`docs/governance/agentic-sandbox-control-doctrine.md` for the [WORK_ITEM_ID]/283
incident context. Write-capable contracts therefore must ship
`Workspace: /Users/<dev>/Developer/[SOURCE_WORKSPACE]/<workspace>/...`, not
`Workspace: registry:company-os`.

## Sandbox Workspace Patterns

Sandbox-capable profiles may declare `sandbox_workspaces` next to the static
`workspaces` list. The capability preflight accepts a contract `Workspace`
value if it matches the static list OR matches one of the declared sandbox
patterns. This makes durable worktree authorization first-class and removes
the need for ad-hoc `/tmp/...` registry copies when a worker is dispatched
into an isolated sandbox worktree per
`docs/governance/agentic-sandbox-control-doctrine.md`.

```json
{
  "id": "claude-clevel-worker/cto/runtime",
  "workspaces": ["companyos", "${COMPANY_OS_ROOT}"],
  "sandbox_workspaces": [
    "${SANDBOX_ROOT}/company-os/**"
  ]
}
```

Pattern rules (enforced by `validateSandboxPatternEntry` at registry load):

- patterns must be absolute (`/Users/...`)
- patterns must not contain `..` segments
- wildcards (`*`, `**`) are only allowed as the final path segment
- a `*` final segment matches exactly one nested directory
- a `**` final segment matches one or more nested directories (the sandbox
  root itself is intentionally not a match: a worktree must be a real
  subdirectory)

Candidate paths are rejected when:

- the candidate is not absolute
- the candidate contains a literal `..` segment (traversal escape)
- the candidate does not match any approved pattern

Future profile updates that declare a sandbox lane should:

1. Add a `sandbox_workspaces` array to the profile alongside `workspaces`.
2. Bump `last_verified_at` and document the source doctrine pointer.
3. Pass `node --test scripts/capabilities/capability-registry-core.test.mjs`
   and `node --test scripts/orchestration/runtime-dispatcher-v12-core.test.mjs`.
4. Get CAO review before scheduler use (see Update Rule).

## Migration Away From Ad-Hoc `/tmp` Registry Patches

Earlier pilots (for example the [WORK_ITEM_ID] Plane Comment Event Relay v0 run)
worked around the missing sandbox surface by writing a temporary capability
registry JSON to `/tmp/...` with the sandbox absolute path injected into a
profile's `workspaces` list, then pointing Runtime Dispatcher v1.2 at that
temp file. That workaround is now deprecated: it bypasses CAO review, leaves
no audit trail, and produces non-reproducible sandbox authorizations.

The supported path going forward:

- Declare the sandbox root once in the profile via `sandbox_workspaces`.
- Let the worker contract carry the per-run worktree as `Workspace:
  /Users/.../[SOURCE_WORKSPACE]/<workspace>/<run-slug>`.
- The Runtime Dispatcher v1.2 capability preflight resolves the worktree
  through the registry pattern without any temp file.

New worker contracts MUST NOT ship with `/tmp/...` registry overrides. If a
sandbox lane is needed but not yet declared on a profile, the contract is
rejected with `capability.undeclared-tool` and the fix is a registry update
under the Update Rule below, not a temp file.

## Runtime Boundary

The registry is not a prompt. It is a preflight gate. A worker prompt can be
beautiful and still fail if the requested capability profile does not allow the
tooling, memory surface, autonomy level, or subagent roster.

The first production use is Runtime Dispatcher v1 dry-run enforcement. Spawn
modes remain blocked until Runtime Dispatcher v1.2 has a separate HG-2.5 release
card.

## Claude Capability Inventory Mapping

Founder-provided Claude connector and skill screenshots from 2026-05-09 are
captured in `observed_inventory` inside the registry. That raw inventory is
not authority. It is the pool from which role profiles may allow or restrict
capabilities.

Default stance:

| Surface | Default | Reason |
|---|---|---|
| `filesystem`, `plane-app`, `honcho-company`, `gitnexus` | allow by role | Core execution and evidence surfaces |
| GitHub / Supabase / Vercel | restricted | Can mutate code, infra, deploys or production data |
| Gmail / Google Calendar / Fantastical / Apple Notes | restricted | External communication, attention layer or personal data |
| Control Chrome / Claude in Chrome / Control your Mac | restricted | Desktop/UI power can bypass normal API gates |
| Stripe | restricted | Money, billing and customer-finance surface |
| Microsoft Clarity | allow only for CMO analytics by default | Analytics read surface; still no public publish |
| TinyFish MCP / Claude WebFetch | allow only for bounded CMO public-fetch profiles | Public URL evidence fallback for marketing analytics/research; OAuth auth is a runtime gate, no cookies or public actions |
| Apify / Mercury / Peec AI | not connected | No profile may depend on them until connected and audited |

Role skill mapping:

| Role | Primary allowed skill families |
|---|---|
| CTO | architecture, code review, debugging, deploy checklist, documentation, incident response, system design, tech debt, testing strategy, MCP/skill building |
| CPO | user research, research synthesis, design critique, design handoff, design system, UX copy, accessibility review |
| CMO | brand, campaign, competitive brief, content, draft content, email sequence, performance report, SEO, web artifacts |
| COO | task management, memory management, standup, incident response, customer ops, ticket triage, KB article, draft response |
| CFO | analyze, dashboard, visualization, data extraction, SQL, statistical analysis, data validation |

Life-science skills are intentionally not part of the Company.OS default
profiles. They need a domain-specific [SOURCE_COMPANY]/BioOS profile before scheduler use.

## Update Rule

Registry changes are release-sensitive because they expand or contract worker
authority. Any profile update must include:

- source doctrine pointer
- `last_verified_at`
- `stale_after_days`
- tests for profile lookup and rejection behavior
- CAO review before scheduler use
