# EVE CEO Intent Refinement Loop — Protocol Spec (ADR)

Specify the bounded back-and-forth between the EVE Chief-of-Staff shell and the
CEO/Codex controller that sharpens an intent before it is routed to a
department. Today the reporting chain is a one-way relay (intent.card to
ceo.routing); this adds a refinement loop without unbounded deliberation. This
is the first dispatch-ready child of [WORK_ITEM_ID]; its ADR drives [WORK_ITEM_ID].

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: plan
workspace: registry:company-os
dispatch: ready
sandbox: none
target_class: report-only
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/operations/intent-to-department-reporting-chain.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/codex-controller-runtime.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/supergoal-execution-ladder.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/spec-to-worker-pipeline.md
scope:
  - include the intent.refinement protocol states, round cap, termination rule, user-gate rule and the definition-not-release invariant.
  - exclude editing the canonical reporting-chain doctrine (that is [WORK_ITEM_ID]), code, release authority and worker dispatch.
acceptance_criteria:
  - The ADR defines the loop states intent.card, intent.challenge, reconcile and ceo.routing with one worked example trace a controller can verify.
  - The ADR sets a hard round cap of at most two refinement rounds and blocks any third round, escalating non-convergence to the founder.
  - The ADR states the user-gate rule so that a material scope, goal or cost change must route back to the founder while refinement inside the approved intent proceeds.
  - The ADR states the invariant that the loop grants EVE no execution, release or Done authority; a reviewer can check it against the release-authority doctrine.
  - The ADR must pass the worker-ledger-validator gate and a controller review before the [WORK_ITEM_ID] doctrine update.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-05-29/eve-cos-intent-refinement.md --label role:cto
  - Controller review and CAO PASS of the ADR before the [WORK_ITEM_ID] doctrine update.
human_gate: HG-2
human_gate_owner: CEO
allowed_read_paths:
  - ${COMPANY_OS_ROOT}/docs/
  - ${COMPANY_OS_ROOT}/scripts/orchestration/
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/reports/supergoals/eve-cos/
outcome_spec: Produce a controller-ready ADR for the bounded EVE-to-CEO intent.refinement loop, concrete enough to drive the [WORK_ITEM_ID] doctrine update.
outcome_rubric: PASS only when loop states, round cap, termination, user-gate rule and the definition-not-release invariant are concrete, with one worked trace.
outcome_max_iterations: 2
outcome_grader: controller
outcome_pass_threshold: ReviewVerdict PASS or NEEDS_HUMAN with exact gate
outcome_artifacts:
  - ${COMPANY_OS_ROOT}/reports/supergoals/eve-cos/intent-refinement-adr.md
reporting: Plane worker.reported with the ADR path ${COMPANY_OS_ROOT}/reports/supergoals/eve-cos/intent-refinement-adr.md, loop-state diagram, round-cap and user-gate rules, subagents, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cto/runtime
runtime_permission_mode: acceptEdits
runtime_auth:
  - claude -p "Return exactly: CLAUDE_AUTH_OK" --model opus --permission-mode plan --output-format text --max-turns 1
event_policy: required
event_sink: metrics-jsonl
event_types:
  - worker.locked
  - worker.heartbeat
  - worker.reported
state_reducer: issue-state-from-agent-events
session_policy: single-worker
subagent_roster: none
shared_filesystem: none
context_isolation: required
memory_store: none
memory_update_policy: proposal-only
dream_policy: proposal-only
reflection_policy: required
learning_proposal_policy: required
blocked_actions: do not edit canonical doctrine here (that is [WORK_ITEM_ID]); do not grant EVE release authority; do not merge, deploy, push, publish, spend or write Plane Done; stay within the declared report write path.
max_runtime: 60m; first stuck or retry check no earlier than 300s
max_turns: 120
max_commits: 0
max_spend: EUR 0
kill_switch: parent [WORK_ITEM_ID] #stop
heartbeat: 15m scheduler heartbeat
```
