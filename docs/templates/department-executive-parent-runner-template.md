# Department Executive Parent-Runner Worker Contract

Use this template when the CEO/Codex delegates a bounded parent objective to a
C-Level Department Executive Agent (CMO, CTO, COO, CPO, CFO). The executive
supervises the parent's child work items, repairs department-local contract
hygiene, reruns harness-denied gates inside its profile, synthesizes CAO and
Raindrop evidence and emits one parent-level closeout report.

The template is canonical across departments. Swap `role:*`, `parent_seat`,
`workspace`, `source_of_truth` paths and `AllowedReadPaths` to specialize it
per department. CEO release authority stays blocked in every variant because
`human_gate`, `BlockedActions` and `escalation_rules` say so.

This contract is the v0 single-runtime shape. It deliberately keeps
`SubAgentRoster: none`. Subagent supervision is unlocked separately through
`docs/orchestration/subagent-reporting-contract.md` after the report-only
pilot ([WORK_ITEM_ID]) and the scheduler proposal ([WORK_ITEM_ID]) prove the layer.

## Source Of Truth

- `docs/orchestration/c-level-department-executive-runtime.md`
- `docs/operations/department-operating-doctrine.md`
- `docs/templates/worker-issue-contract.md`
- `docs/governance/ceo-release-authority.md`
- `docs/operations/workspace-stewardship-protocol.md`

## Plane Contract

```yaml
role: role:coo
parent_seat: role:coo
agent: claude
mode: implement
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
RunAt:
DependsOn:
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
scope:
  - Include: supervise the parent objective's children inside one department lane.
  - Include: rerun department-local read-only gates that a worker harness denied.
  - Include: patch child work-item descriptions for contract hygiene only.
  - Include: synthesize CAO, Controller and Raindrop evidence into one parent closeout.
  - Include: write one parent-level department.executive.report under reports/department-executive-runtime/.
  - Exclude: Plane Done transitions on the parent or any child item.
  - Exclude: push, merge, deploy, publish, schedule, send, Supabase import or other HG-2.5 release actions.
  - Exclude: CapabilityProfile or RuntimeAuth expansion.
  - Exclude: cross-department contract edits, product code edits and durable memory writes.
acceptance_criteria:
  - A parent-level department.executive.report exists at the declared OutcomeArtifacts path with intervention_count, escalations_to_ceo, raindrop_learnings, worktree_stewardship and next_worker_contracts populated.
  - Every CEO-only HG-2.5/HG-3/HG-3.5/HG-4 decision in scope is captured as an escalation with evidence and recommendation; the executive performs none of them.
  - Every department-local intervention is reported with type and trigger; CEO mechanical intervention count is zero.
  - All child work items remain in their CEO-approved state; no Plane Done set by this run.
  - Worker-ledger-validator, contract-controller dry-run, page-index check and git diff --check all pass for the changed files in this run.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/department-executive-parent-runner-template.md --label role:coo --json
  - node scripts/orchestration/contract-controller.mjs --workspace companyos --project-id <project-uuid> --sequence <PARENT-ITEM> --mode dry-run --auth app-token --json
  - node scripts/page-index/generate-page-index.mjs --check --json
  - git diff --check
human_gate: HG-2
HumanGateLevel: HG-2
HumanGateOwner: CEO
reporting: Plane worker.reported plus absolute closeout report under ${LOCAL_WORKSPACE}>-department-executive-closeout.md with reflection, learning_proposals and capability_context_proof.
OutcomeSpec: Parent-level department executive run produces one closeout report that lets the CEO decide release/escalation without replaying every child run.
OutcomeRubric:
  - PASS if intervention_count is populated, CEO mechanical interventions equal zero, escalations carry exact HG levels and decision_needed sentences.
  - PASS if every child item state is recorded and no Plane Done was set by the executive.
  - PASS if worktree_stewardship is classified as clean, resolved, parked or blocked with owner and next check.
  - REJECT if the executive performed any HG-2.5+ release action, marked Plane Done, expanded CapabilityProfile or wrote durable memory.
  - REJECT if the closeout report is missing intervention_count, escalations_to_ceo, raindrop_learnings or next_worker_contracts.
OutcomeMaxIterations: 1
OutcomeGrader: controller
OutcomePassThreshold: 1.0
OutcomeArtifacts:
  - ${LOCAL_WORKSPACE}>-department-executive-closeout.md
AllowedReadPaths:
  - ${LOCAL_WORKSPACE}
AllowedWritePaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
BlockedActions: do not mark Plane Done; do not push, merge, deploy, publish, schedule, send or import; do not write Linear; do not expand CapabilityProfile or RuntimeAuth; do not write durable memory; do not edit product code; do not read secrets.
RuntimeAuth:
  - plane-app-token-read-ok
  - filesystem-read-ok
RuntimeBrowserAuth: none
RuntimeAdapter: local-cli
RuntimePermissionMode: acceptEdits
InferenceClass: P2-code-shared
DreamPolicy: proposal-only
MemoryStore: none
MemoryUpdatePolicy: proposal-only
ReflectionPolicy: required
LearningProposalPolicy: required
SessionPolicy: single-worker
SubAgentRoster: none
SharedFilesystem: none
ContextIsolation: required
CapabilityProfile: claude-clevel-worker/coo/runtime
ManagedAgentCompatibility: local-only
Sandbox: required
GateExecutionPolicy: worker-runs-declared-gates
EventPolicy: required
EventSink: metrics-jsonl
EventTypes:
  - worker.locked
  - worker.heartbeat
  - worker.reported
StateReducer: issue-state-from-agent-events
MaxRuntime: 45m
MaxTurns: 120
MaxCommits: 0
MaxSpend: EUR 0
KillSwitch: COMPANY_OS_RUNTIME_KILL_SWITCH
Heartbeat: every 10m
```

## Per-Department Specialization

Replace these fields for each C-Level seat. The rest of the template stays
identical so the validator and the Stage 0.5 controller can compare runs
across departments.

| Department | role / parent_seat | workspace | CapabilityProfile |
|---|---|---|---|
| Marketing | `role:cmo` | `/Users/<user>/Developer/Company.OS` or marketing repo root | `claude-clevel-worker/cmo/runtime` |
| Engineering | `role:cto` | engineering monorepo or sandbox worktree | `claude-clevel-worker/cto/runtime` |
| Operations | `role:coo` | `/Users/<user>/Developer/Company.OS` | `claude-clevel-worker/coo/runtime` |
| Product | `role:cpo` | product spec workspace | `claude-clevel-worker/cpo/runtime` |
| Finance | `role:cfo` | finance ledger workspace | `claude-clevel-worker/cfo/runtime` |

`AllowedReadPaths` and `AllowedWritePaths` must be narrowed to the department
lane. The executive never writes outside `reports/department-executive-runtime/`
and `docs/page-index.md` in v0.

## Child Supervision Rules

The executive may, inside its declared parent objective:

- read every Plane child item, its description hash and its latest comments
- patch a child description only when Stage 0.5/0.65 rejects it for
  contract hygiene (missing `role:*`, missing absolute report path,
  Claude internal storage references, weak gates list)
- rerun a worker-denied gate when the command is in `allowed_commands` and
  the gate is read-only or local verification
- request a worker retry through the dispatcher when the retry reason and
  lock lineage are explicit
- post `department.executive.*` Plane comments with evidence
- synthesize CAO/Controller/Raindrop verdicts into the closeout

The executive must not:

- flip a child from `manual` to `ready` without an explicit CEO instruction
  in the parent contract or a CEO Plane comment on the parent
- run gates outside the declared CapabilityProfile
- spawn subagents (v0)
- write durable memory or rotate auth
- mark any Plane item Done

## Intervention Budget

| Intervention type | Target | Hard limit | What to do if exceeded |
|---|---:|---:|---|
| CEO mechanical | 0 | 0 | Re-open this contract; the executive layer is missing or failed |
| CEO decision | <= 1 per parent run | 3 | Escalate as `escalations_to_ceo` with options and recommendation |
| Department executive intervention | reported | none | Each intervention must appear in `intervention_count.department_executive` and `handled_without_ceo` |
| Worker retry | 2 per child item | 3 | After hard limit, escalate as `worker.repeated-failure` to CEO with Raindrop evidence |
| Founder / HG-4 | only strategic / non-restorable | none | Route via CEO + Chief-of-Staff Decision Card |

If `intervention_count.ceo > 1` for mechanical or `> 1` for decisions during
a single parent run, the executive must record the overrun in `reflection:`
and propose a contract change as a `learning_proposals:` item.

## Escalation Rules

The executive posts a `department.executive.escalation` Plane comment when:

| Trigger | Human gate | Owner | Decision card shape |
|---|---|---|---|
| Worker requests publish/send/schedule | HG-2.5 | CEO / Codex | release card with rollback, blast radius, confidence |
| Worker hits production write / schema / auth need | HG-3 | CEO / Codex | critical release card with snapshot/restore evidence |
| CAO REJECT cannot be repaired in department scope | HG-2 -> CEO | CEO / Codex | rework request with REJECT codes and proposed contract patch |
| Cross-department conflict | HG-2 -> CEO | CEO | tradeoff card with both department contexts |
| Founder-facing translation needed | HG-3.5 | Chief-of-Staff / Founder-Proxy via CEO | pause artifact per `docs/governance/human-gate-levels.md` |
| Strategic / non-restorable decision | HG-4 | Founder via CEO + Chief-of-Staff | Founder decision dossier |
| CapabilityProfile expansion required | HG-2 -> CEO | CEO | scope-change request with audit trail |

The Plane comment shape mirrors the canonical
`department.escalation` block in
`docs/operations/department-operating-doctrine.md`. The executive never sets
the gate; it asks the gate owner.

## Department Closeout Report

The executive emits exactly one closeout report per parent run at:

```text
/Users/<user>/Developer/Company.OS/reports/department-executive-runtime/<PARENT>-department-executive-closeout.md
```

Required fenced block:

```yaml
department.executive.report:
  version: department-executive-v0
  department: marketing | engineering | operations | product | finance | ...
  owner: role:cmo | role:cto | role:coo | role:cpo | role:cfo
  parent_work_item: COMPA-###
  child_items:
    - COMPA-###
  child_states:
    - work_item: COMPA-###
      state: manual | ready | locked | reported | cao_pass | cao_reject | parked
      runtime_verdict: PASS | REJECT | NEEDS_HUMAN | BLOCKED_* | TIMEOUT
      gate_results:
        - gate: <command or named gate>
          verdict: pass | fail | rerun-by-executive
  overall_state: green | yellow | red | parked
  intervention_count:
    ceo: 0
    department_executive: <int>
    worker_retry: <int>
  handled_without_ceo:
    - contract_patch
    - runtime_ready_repair
    - gate_rerun
    - worker_retry
    - evidence_commit_preparation
  escalations_to_ceo:
    - human_gate: HG-2.5 | HG-3 | HG-3.5 | HG-4
      decision_needed: <one sentence>
      evidence:
        - <report or Plane comment>
      recommendation: <one sentence>
  raindrop_learnings:
    - <prompt/result lesson>
  worktree_stewardship:
    state: clean | resolved | parked | blocked
    owner: <role or person>
    next_check: <ISO-8601 or condition>
  next_worker_contracts:
    - title: <short>
      role: role:cmo | role:cto | ...
      rationale: <one sentence>
  reflection:
    - <self-assessment of department run quality>
  learning_proposals:
    - <proposal-only memory / SOP / contract delta>
  capability_context_proof:
    capability_profile: claude-clevel-worker/<role>/runtime
    boot_files_read:
      - <absolute path>
    declared_gates_run:
      - <command>
    allowed_write_paths_used:
      - <absolute path>
  signed_at: <ISO-8601>
```

The CEO reads this report and decides release/escalation. The CEO does not
replay the children.

## Validator Self-Test

This template is validator-clean as itself:

```bash
node scripts/orchestration/worker-ledger-validator.mjs \
  --description-file docs/templates/department-executive-parent-runner-template.md \
  --label role:coo --json
```

The validator returns `ok: true` with `human_gate_level: HG-2` and all
required fields present. A real parent run substitutes the placeholder
`<project-uuid>` and `<PARENT>` tokens before live dispatch.

## Blocked Actions Recap

This contract NEVER authorizes:

- Plane Done on the parent or any child
- push, merge, deploy, publish, schedule, send, Supabase import
- CapabilityProfile or RuntimeAuth expansion
- Linear writes
- durable memory writes
- product code edits outside `reports/department-executive-runtime/` and
  `docs/page-index.md`
- secret reads

CEO release authority lives in
`docs/governance/ceo-release-authority.md` and remains a separate, gated
runtime path even when the executive's recommendation is GO.
