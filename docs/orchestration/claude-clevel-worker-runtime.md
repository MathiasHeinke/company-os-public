# Claude C-Level Worker Runtime

Status: canonical doctrine
Last updated: 2026-05-09
Use for: Claude Code as C-level worker, coordinator and subagent spawner under
Plane dispatch

## Purpose

Claude Code can be a powerful C-level worker runtime because it can combine a
large context window, project-aware sessions, MCP connectors, plugins, slash
commands, local files, worktrees and specialist subagents.

That power is useful only when it is made explicit and auditable. Company.OS
does not treat Claude Code as an unbounded assistant. It treats Claude Code as a
runtime that can serve a C-level role under a locked Plane work item, a declared
CapabilityProfile, a bounded SubAgentRoster and a proposal-first learning loop.

This doctrine turns Claude Code into:

1. a C-level worker runtime for CTO, CPO, CMO, COO and CFO work,
2. a bounded coordinator that may spawn subagents only inside a locked item,
3. a learning surface that proposes memory, SOP, skill, workflow and harness
   improvements,
4. never the CAO for its own work,
5. never the final Done, merge, publish, spend or production authority.

## Runtime Position

| Layer | Claude Code may do | Claude Code must not do |
|---|---|---|
| C-level worker | Plan, audit, implement, verify and synthesize inside a role-owned Plane item | Decide final org priority or mark Done |
| Coordinator | Spawn declared subagents inside the same locked item | Spawn recursively, spawn outside a lock or hide subagent outputs |
| Tool runtime | Use allowed plugins, MCPs, commands, skills and local tools from the CapabilityProfile | Discover and use powerful tools just because they exist |
| Learning surface | Propose durable memory, SOP, skill, workflow and harness updates | Write durable Honcho/memory/kit doctrine directly unless the contract allows it |
| Controller input | Produce evidence for CAO and CEO | Self-review into PASS, override CAO REJECT or release HG-3/HG-4 |

The CEO/Codex controller decides what to dispatch. The CAO verifies the
evidence. Claude Code executes and reports.

## Required Capability Inventory

Every Claude C-level worker item must name a `CapabilityProfile`. The profile
must make the available power explicit:

```yaml
CapabilityProfile:
  name: claude-clevel-worker/<role>/<lane>
  role_owner: CTO | CPO | CMO | COO | CFO
  runtime: claude-code
  model: opus | other-approved
  allowed_plugins:
    - <plugin or marketplace capability>
  allowed_connectors:
    - <MCP or app connector>
  allowed_commands:
    - <slash command or local command>
  allowed_skills:
    - <skill name or path>
  allowed_subagents:
    - <subagent name>
  knowledge_base:
    - <docs, ADRs, PageIndex, memory stores>
  honcho_workspace:
    read: none | company | personal | product | install-specific
    write: none | proposal-only | controller-approved
  gitnexus:
    required: true | false
  forbidden_tools:
    - production writes
    - public publish
    - direct memory writes
  max_autonomy_level: L0 | L1 | L2 | L3 | L4 | L5
  human_gates:
    - HG-2.5 release actions
    - HG-3 CEO/Codex critical authority
    - HG-4 founder trust boundary
  last_verified_at: YYYY-MM-DD
  staleness_rule: refresh before dispatch when older than N days
```

The profile is not a suggestion. It is validated before spawn by the executable
Capability Registry:

- data: `registries/capabilities/company-os.json`
- validator: `scripts/capabilities/capability-registry-core.mjs`
- CLI: `scripts/capabilities/capability-registry.mjs`
- runtime hook: `scripts/orchestration/runtime-dispatcher-v1.mjs`

CAO may reject a run if the worker uses a plugin, connector, subagent, command
or memory store not declared in the profile or in the work item. Runtime
Dispatcher v1.1 blocks the run before spawn when the profile is missing, stale,
too permissive for the requested autonomy level, or mismatched to the role,
workspace, mode, subagent roster or memory surface.

## Gate Execution Authority

Claude C-level workers are expected to run their own declared gates whenever the
CapabilityProfile permits the command class. The controller still reruns or
samples the important gates for the final verdict, but a capable worker must not
stop at "please run tests" when the issue contract named `pnpm test`,
`pnpm build`, targeted lint, `node --test`, `git diff --check`, GitNexus or
PageIndex checks.

Executable rules:

1. The worker issue declares `RuntimePermissionMode: auto` or a stricter
   approved mode when implementation work is expected.
2. The CapabilityProfile declares `allowed_claude_tools`, including exact
   `Bash(...)` patterns for test/build/lint/check commands.
3. Runtime Dispatcher v1.2 passes those tools to Claude via `--allowed-tools`.
4. Runtime Dispatcher v1.2 derives additional safe `Bash(...)` patterns from
   the fenced `Gates:` block for known gate commands only.
5. Runtime Dispatcher v1.2 dry-run blocks before spawn if an executable gate is
   neither safe-derived nor explicitly covered by `allowed_claude_tools`.
6. If Claude's harness denies a declared gate anyway, the worker must quote the
   denied command and denial reason in `worker.reported`; CAO treats that as
   `BLOCKED_DEPENDENCY`, not as a completed gate.

Safe declared-gate classes today:

- unit tests and node checks: `node --test`, `node --check`
- package gates: `pnpm test`, `pnpm build`, `pnpm lint`, `pnpm exec eslint`,
  `npm test`, `npm run test`, `npm run build`, `npm run lint`
- repo hygiene: `git status`, `git diff`, `git diff --check`, `rg`
- Company.OS graph checks: `${GITNEXUS_BIN} status`,
  `${GITNEXUS_BIN} detect-changes` (resolve `${GITNEXUS_BIN}` against
  `docs/operations/portable-path-placeholders.md`; on macOS pnpm setups this is
  typically `~/Library/pnpm/gitnexus`)

Still forbidden even when the worker is strong:

- deploy, publish, push, merge, direct Plane Done, Linear state changes
- production DB writes, schema/RLS/auth/service-role changes
- material spend, outbound founder communication, regulated public claims
- durable Honcho/memory writes unless the work item explicitly releases them

## Boot Requirements

Claude Code C-level workers inherit
`docs/orchestration/headless-worker-runtime-boot-contract.md` and add these
requirements:

1. Read this doctrine before using any plugin, connector, command or subagent.
2. Read the declared CapabilityProfile before doing work.
3. Read only the Honcho workspace named by the work item or profile.
4. Include a `capability_context_proof` block in `worker.reported`.
5. Include a `learning_proposals` block in `worker.reported`, even if it is
   empty.

Example:

```yaml
capability_context_proof:
  capability_profile: claude-clevel-worker/cto/runtime
  plugins_seen:
    - <declared plugin or []>
  connectors_seen:
    - <declared connector or []>
  commands_seen:
    - <declared command or []>
  skills_seen:
    - <declared skill or []>
  honcho_workspace_seen: company
  undeclared_capabilities_used: []
  context_gaps: []
```

If the worker cannot prove the profile, it must return
`BLOCKED_DEPENDENCY` with `runtime.capability-profile-missing` or
`runtime.capability-profile-stale`.

Atlas / [SOURCE_COMPANY] Bio.OS workers also inherit
`docs/orchestration/atlas-claude-c-level-boot-contract.md`, which adds the
Atlas workspace map, evidence-label discipline, runtime-auth sentinel rules and
the report rejection rule for pointer-only Claude output.

## Subagent Rules

Claude Code may spawn specialist subagents only when all are true:

1. the Plane item is locked by dispatcher v0 or a later approved dispatcher,
2. `SessionPolicy` allows coordination,
3. `SubAgentRoster` is non-empty and names the allowed subagents,
4. each subagent has a bounded scope and disjoint write scope or read-only mode,
5. max delegation depth is `1`,
6. all subagent output is consolidated into one `worker.reported` comment.

Subagents are not second controllers. They do not mark Done, release gates,
write durable memory, post independent status comments or spawn more subagents.

## Reflection And Learning Loop

Claude Code workers must constantly improve the operating system, but only
through reviewable proposals.

Every `worker.reported` comment from a Claude C-level worker must include:

```yaml
reflection:
  what_worked:
    - <one concrete observation>
  what_broke_or_slowed_down:
    - <one concrete observation or []>
  where_context_was_missing:
    - <gap or []>
  where_tooling_was_underused:
    - <plugin/connector/skill opportunity or []>
  next_capability_to_register:
    - <candidate or []>

learning_proposals:
  - type: memory | sop | skill | workflow | harness | capability-profile | plane-contract | none
    title: <short title>
    evidence:
      - <source file, report path, Plane item or command>
    target_store: honcho | docs | skill-library | workflow-library | plane-followup | none
    proposed_change: <summary>
    durable_write_allowed_now: false
    required_reviewer: CEO | CAO | role-owner | founder
```

Rules:

- `learning_proposals: []` is valid only when the worker states why no learning
  was found.
- Durable Honcho, Memory Bank, SOP, kit or workflow changes remain gated by
  `DreamPolicy` and `MemoryUpdatePolicy`.
- Private [SOURCE_WORKSPACE]/founder context must never be copied into productizable
  Company.OS docs. Use generic principles.
- If a learning would affect legal, medical, finance, public claims,
  production behavior, spend or autonomy, it requires the matching HumanGate.

## Honcho Policy

Honcho is a memory layer, not a task queue and not a source-code database.

| Context | Allowed use | Forbidden use |
|---|---|---|
| Company architecture memory | Read current invariants, propose conclusions | Write conclusions without controller-approved MemoryUpdatePolicy |
| Founder/private memory | Read only when the active workspace explicitly authorizes it | Copy private data into reports, prompts, kit docs or public artifacts |
| Product/user memory | Use only in product/user contexts with privacy gates | Mix with founder or company memory |

Claude Code must report:

```yaml
memory_context:
  honcho_workspace: company | personal | product | none
  honcho_read: true | false
  honcho_write_attempted: false
  memory_update_policy: none | proposal-only | controller-approved
  proposed_honcho_conclusions:
    - <proposal or []>
```

If a worker writes to Honcho without authorization, CAO rejects the run with
`memory.unauthorized-durable-write`.

## Hermes-Inspired Operating Pattern

The reusable pattern is:

```text
Sense -> Work -> Reflect -> Propose -> Review -> Incorporate -> Dream
```

| Phase | Owner | Output |
|---|---|---|
| Sense | Worker | boot proof, capability proof, source-of-truth proof |
| Work | Worker and declared subagents | artifact, patch, audit or plan |
| Reflect | Worker | concrete work-quality observations |
| Propose | Worker | memory/SOP/skill/workflow/harness proposals |
| Review | CAO and CEO | PASS/REJECT/PARK, accept/split/reject learning |
| Incorporate | RoleOwner or approved worker | canonical doc, skill, workflow or memory update |
| Dream | Daily Improvement Dream | cross-run improvement proposals for morning brief |

This keeps Claude's long-context power useful without letting it silently mutate
the operating system.

## CAO Checks

CAO must add these checks when `Agent: claude` and
`worker_class: c-level-worker` or a Claude CapabilityProfile is present:

1. `capability_context_proof` exists and names the profile.
2. No undeclared plugin, connector, command, skill, subagent or memory store was
   used.
3. `reflection` exists and is concrete enough to evaluate.
4. `learning_proposals` exists, even if empty.
5. No durable memory write happened unless explicitly allowed by
   `MemoryUpdatePolicy`.
6. Honcho workspace separation matches the active workspace and work item.
7. Subagents, if present, also pass
   `docs/orchestration/subagent-reporting-contract.md`.

Stable reject codes:

```text
claude.capability-profile-missing
claude.undeclared-capability-used
claude.reflection-missing
claude.learning-proposal-missing
memory.unauthorized-durable-write
memory.workspace-boundary-violation
```

## Rollout Plan

| Phase | Deliverable | Gate |
|---|---|---|
| 0 | Doctrine and boot pointers | docs current, page-index current |
| 1 | Capability registry for Claude/Codex/Gemini and active workspaces | [WORK_ITEM_ID] / [WORK_ITEM_ID], role:cto |
| 2 | Scheduler prompt builder injects CapabilityProfile and memory policy | Runtime Dispatcher v1.2 gate |
| 3 | CAO validator checks reflection, learning and capability proof | CAO tests and live pilot |
| 4 | Daily Improvement Dream consumes worker learning proposals | morning brief shows accepted/split/rejected proposals |
| 5 | Department packs define Claude C-level profiles per role | role owner review |

Until Phase 2 is proven, Claude C-level worker runs may be launched manually or
by a dry-run scheduler only. Full scheduled spawn remains HG-2.5 gated.
