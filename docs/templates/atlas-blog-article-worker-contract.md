# ATLAS Blog Article Worker Contract

Use this template for the daily Blog Engine lane. Unlike the social lanes, the
blog engine is a CMS/Supabase state machine, not a local Markdown-only
pipeline. The worker therefore acts as a Blog Engine controller/gate worker:
it checks whether the daily article pipeline produced, completed, failed,
halted or needs review, and it only proceeds to publish/index behavior when
the Blog Engine gates already allow it.

## Plane Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: implement
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
RunAt: set concrete ISO timestamp before dispatch
DependsOn:
RelatedWork: GROW-39, GROW-40, GROW-41, GROW-42, GROW-43
Scope: run the daily ATLAS Blog Engine controller/gate pass for the target date; report-only unless a separate release card authorizes publish/index behavior.
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
acceptance_criteria:
  - Blog morning-after audit for the target date runs and writes a Markdown and JSON report under docs/audits/blog-morning-after/.
  - Blog local content audit runs for the target date and blocks publish/import/index release recommendations while it reports `blocked_for_autonomous_publish`.
  - The report distinguishes published articles, complete drafts needing review, failed/stuck articles, scheduler drift, budget halt, operator failures, canonical/indexing findings and GSC Inspect failures.
  - Worker reports whether at least one new blog article is online, complete-but-draft, blocked by QA/revision, blocked by budget/auth/operator failure or absent.
  - No public publish, index push, schema change, Supabase cron change or durable memory write occurs unless the existing Blog Engine gates and HumanGate release card already authorize it.
  - Worker emits concrete next action for CEO/CMO: schedule, review, fix operator, unblock budget, revise draft, or park.
gates:
  - cd ${LOCAL_WORKSPACE} && git status --short
  - cd ${LOCAL_WORKSPACE} && npm run cms:morning-after -- --date YYYY-MM-DD
  - cd ${LOCAL_WORKSPACE} && npm run content:article-audit -- --date YYYY-MM-DD --fail-on-blockers
  - cd ${LOCAL_WORKSPACE} && test -n "$(ls -t docs/audits/blog-morning-after/YYYY-MM-DD-*.md 2>/dev/null | head -1)"
  - cd ${LOCAL_WORKSPACE} && test -n "$(ls -t docs/audits/blog-morning-after/YYYY-MM-DD-*.json 2>/dev/null | head -1)"
  - cd ${LOCAL_WORKSPACE} && git diff --check
human_gate: HG-2.5
reporting: Plane worker.reported with audit report paths, online/draft/blocked counts, scheduler drift, budget/auth/operator blockers, GSC/indexing findings, CEO decision recommendation, reflection, learning_proposals and subagents: [].
OutcomeArtifacts:
  - ${LOCAL_WORKSPACE}
AllowedReadPaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
BlockedActions: do not mark Plane Done; do not write Linear; do not write durable memory; do not create broad duplicate Plane issues; do not change Supabase schema, cron, Edge functions or SQL; do not force-publish; do not claim indexed without verified GSC evidence; do not make personal medical/Rx claims; do not spend money or alter production settings.
EscalationPolicy: stop with NEEDS_HUMAN when publish/index behavior, schema/cron/Edge changes, budget/spend, legal claims, medical/Rx claims, missing auth, failed GSC inspection or out-of-release-card actions are required.
Layer: CMO
RoleName: ATLAS daily Blog Engine controller
RoleLabel: role:cmo
ParentSeat: role:cmo
RoleOwner: CMO
Department: Growth
AccountableLayer: C-Level
ReportsTo: CEO
AutonomyLevel: L1/L2 audit and gate report, L2.5 publish/index only after release card
Controller: codex
DecisionOwner: CMO
Sandbox: required
AllowedWritePaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
MaxRuntime: 30m
MaxSpend: 0
KillSwitch: Plane comment KILL <work-item-ref> or local sentinel runtime/kill/<work-item-ref>.
Heartbeat: write a worker heartbeat every 10 minutes when the runtime supports it; otherwise include last successful gate in worker.reported.
OutcomeSpec: Produce one daily Blog Engine truth report and a CEO-ready decision recommendation for publish/review/fix/park.
OutcomeRubric:
  - PASS only if fresh target-date blog audit Markdown and JSON reports exist.
  - PASS only if local Git-CMS article readiness is not `blocked_for_autonomous_publish`.
  - PASS only if online, draft, failed, stuck, budget and GSC/indexing states are explicitly reported.
  - PASS only if claims about published or indexed status are backed by audit evidence.
  - REJECT if the worker claims a blog was published from stale or missing audit data.
  - NEEDS_HUMAN if auth, budget, operator failure, QA/revision blocker, local content-audit blocker or publish/index gate blocks the lane.
OutcomeMaxIterations: 1
OutcomeGrader: CAO then Codex
OutcomePassThreshold: PASS
RuntimeAuth:
  - supabase-read-auth-ok
  - gsc-read-auth-ok-when-needed
  - tinyfish-mcp-oauth-ok-or-report-BLOCKED_AUTH
  - filesystem-read-write-ok
GateExecutionPolicy: worker-runs-declared-gates
EventPolicy: metrics-jsonl
EventSink: metrics-jsonl
EventTypes:
  - worker.started
  - worker.reported
StateReducer: issue-state-from-agent-events
DreamPolicy: proposal-only
MemoryStore: none
MemoryUpdatePolicy: proposal-only
ReflectionPolicy: required
LearningProposalPolicy: required
SessionPolicy: no-subagents
Coordinator: false
SubAgentRoster: none
SharedFilesystem: target-workspace-only
ContextIsolation: target-workspace-only
CapabilityProfile: claude-clevel-worker/cmo/atlas-growth-blog-engine
RuntimeAdapter: local-cli
ManagedAgentCompatibility: local-only
```
