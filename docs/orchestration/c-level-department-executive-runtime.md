# C-Level Department Executive Runtime

Status: doctrine draft for implementation
Use for: separating CEO/Codex orchestration from department-level execution management
Created: 2026-05-21

## Purpose

The [WORK_ITEM_ID] marketing release gate proved the Plane-first chain, but it also
showed a role leak: CEO/Codex still performed too much department-level
coordination.

The missing layer is a **C-Level Department Executive Agent**. It is a separate
runtime session, usually Claude CLI or later Codex CLI, that reports to the CEO
but owns day-to-day execution management inside one department.

This runtime is not the worker, not the CAO and not the CEO. It is the
department head acting like a real CMO/CTO/COO: all-seeing inside its lane,
hard-working, evidence-driven, responsible for worker quality, and accountable
for a daily or parent-level report to CEO/Codex.

## Position In The Company.OS Stack

```text
Founder / Board
  -> Chief-of-Staff / Founder-Proxy for HG-3.5/HG-4 preparation
    -> CEO / Codex Controller
      -> C-Level Department Executive Agent
        -> Worker Contracts
        -> CAO / Controller / Raindrop evidence
      -> CEO decision, release, Done or escalation
```

The CEO delegates a bounded parent objective. The department executive runs the
department loop and escalates only when the decision exceeds department
authority.

## Why This Exists

The CEO must not be the mechanical relay for:

- flipping child items from `manual` to `ready`
- patching weak child contracts after predictable runtime-ready failures
- retrying stale locks
- rerunning gates that a worker harness denied
- collecting child reports into a parent closeout
- classifying dirty worktrees for the department
- turning Raindrop findings into better department contracts

Those are management duties, but they are C-level department duties. CEO/Codex
should see the synthesized department report and decide release/escalation
questions, not operate every child run by hand.

## Identity

| Field | Value |
|---|---|
| Runtime role | `department-executive` |
| Plane label | one owning `role:*`, for example `role:cmo` |
| Runtime agent | `claude` first; `codex` later after adapter hardening |
| Typical model | Sonnet for bounded runs; Opus for cross-workspace/high-context department synthesis |
| Reports to | CEO / Codex Controller |
| Reviews by | CAO and Codex Controller |
| Writes | department reports, Plane department-executive comments, scoped contract patches when allowed |
| Forbidden | Plane Done, public publish, merge, push, deploy, production write, controller.decision, CAO verdict |

## Authority Envelope

The department executive may do these inside a CEO-approved parent objective:

- read the parent and child Plane items
- verify every child has a parseable worker contract
- patch child descriptions only for department-local contract hygiene
- run Stage 0.5/0.6/0.65 preflight checks
- trigger dispatcher lock and runtime run for child items already inside the
  parent objective and HumanGate envelope
- rerun worker-denied gates when the command is within the department
  CapabilityProfile and the gate is read-only or local verification
- post `department.executive.*` Plane comments
- synthesize CAO, Controller and Raindrop findings
- write department closeout reports
- propose next worker contracts and process improvements
- classify worktree dirt for workspaces owned by the department

It must escalate to CEO/Codex before:

- HG-2.5 release actions: push, merge, publish, schedule, send, Supabase import,
  Plane Done or public release
- HG-3 critical reversible/restorable operations
- CapabilityProfile expansion
- RuntimeAuth expansion
- department structure changes
- recurring scheduler authority changes
- cross-department conflict
- strategic or non-restorable HG-4 decisions

## Required Report Shape

Every parent-level department executive run ends with one report:

```yaml
department.executive.report:
  version: department-executive-v0
  department: marketing | engineering | operations | product | finance | ...
  owner: role:cmo | role:cto | role:coo | role:cpo | role:cfo
  parent_work_item: COMPA-###
  child_items:
    - COMPA-###
  overall_state: green | yellow | red | parked
  intervention_count:
    ceo: 0
    department_executive: 0
    worker_retry: 0
  handled_without_ceo:
    - contract_patch
    - runtime_ready_repair
    - gate_rerun
    - worker_retry
    - evidence_commit_preparation
  escalations_to_ceo:
    - human_gate: HG-2.5 | HG-3 | HG-4
      decision_needed: <one sentence>
      evidence:
        - <report or Plane comment>
  raindrop_learnings:
    - <prompt/result lesson>
  worktree_stewardship:
    state: clean | resolved | parked | blocked
  next_worker_contracts:
    - <title>
  signed_at: <ISO-8601>
```

The CEO should be able to read this report and make a release/escalation
decision without replaying the whole worker chain.

## Intervention Budget

The target for a mature parent run is:

| Intervention type | Target |
|---|---:|
| CEO mechanical intervention | 0 |
| CEO decision intervention | <= 1 per parent run |
| Department executive intervention | allowed and reported |
| Worker retry | allowed when reason and lock lineage are clear |
| Founder/HG-4 intervention | only strategic/non-restorable |

If the CEO manually performs more than one mechanical intervention in a parent
run, the department executive runtime is considered missing or failed and must
receive a follow-up contract.

## Lessons From [WORK_ITEM_ID]

The next CMO executive pilot must take over the work Codex handled manually in
[WORK_ITEM_ID]:

- child contract readiness repair
- runtime-ready failure diagnosis
- harness-denied gate reruns where the department profile allows the command
- parent-level closeout synthesis
- worktree stewardship packet
- Raindrop learning capture and next contract proposal
- evidence commit preparation for CEO release, without doing push/Done itself

CEO/Codex should only receive:

- a release-card recommendation
- a list of true HG-2.5/HG-3/HG-4 decisions
- a confidence score
- the rollback/cancel path
- the department executive's intervention count

## First Implementation Slice

The first slice must be implemented as Plane work, not as ad-hoc chat:

1. Register a department-executive CapabilityProfile ([WORK_ITEM_ID]).
2. Add a parent-runner contract template that can supervise child items
   (this work item, [WORK_ITEM_ID]; see
   `docs/templates/department-executive-parent-runner-template.md`).
3. Run a CMO executive replay against [WORK_ITEM_ID] evidence in report-only mode
   ([WORK_ITEM_ID]).
4. Compare intervention count against the real [WORK_ITEM_ID] run.
5. Only after the report-only pilot passes, allow the executive to trigger
   bounded child dispatch for a new parent run ([WORK_ITEM_ID] scheduler proposal).

## Parent-Runner Template Contract

The template at
`docs/templates/department-executive-parent-runner-template.md` is the
canonical Plane work-item shape for any department executive parent run. It
must carry these verifiable fields, all of which the Worker Issue Contract
parser and Stage 0.5/0.65 evaluator can check without spawning the runtime:

- `role:*` + `parent_seat:*` matching the owning C-Level department
- `agent: claude` (or audited Codex/Gemini) and `mode: implement`
- `workspace:` absolute or `registry:*` path inside the department lane
- `source_of_truth:` list naming this doctrine, the department operating
  doctrine and the worker issue contract template
- `scope:` explicit include/exclude with department-local child supervision
  in-scope and release/Done/publish out-of-scope
- `acceptance_criteria:` department closeout report exists, intervention
  count is reported, escalations carry HG levels, no Plane Done was set
- `gates:` worker-ledger-validator on the parent-runner template,
  contract-controller dry-run, page-index `--check`, `git diff --check`,
  and the department executive's own runbook check
- `human_gate: HG-2` for the executive itself, with explicit
  `BlockedActions` covering Plane Done, push, merge, deploy, publish,
  production write, secret read and Linear writes
- `capability_profile: claude-clevel-worker/<role>/runtime`
- `OutcomeSpec` and `OutcomeRubric` tied to the
  `department.executive.report` shape above
- `ReflectionPolicy: required` and `LearningProposalPolicy: required`
- `SubAgentRoster: none` for the v0 slice; subagent supervision is a later
  capability tied to `docs/orchestration/subagent-reporting-contract.md`
- `intervention_budget` block declaring CEO mechanical = 0, CEO decision <= 1,
  worker retry budget and retry reason guard
- `escalation_rules` block enumerating HG-2.5 / HG-3 / HG-3.5 / HG-4 triggers
  and the exact Plane comment shape the executive will post
- `closeout_reporting:` block naming the absolute report path under
  `reports/department-executive-runtime/`, the singleton rule and the
  `department.executive.report` schema reference

The template is reusable across departments. The CMO, CTO, COO, CPO and CFO
parent runners differ only in `role:*`, `parent_seat:*`, workspace and the
allowed read/write paths. CEO release authority remains blocked in every
variant because the template's `BlockedActions` and `human_gate` fields say
so, not because a controller remembers to enforce it later.
