# ATLAS Blog Article Claude/Codex Production Worker Contract

Use this template while Gemini/Vertex/Grok paths are blocked. The worker creates
local EN/DE blog article artifacts with Claude/Codex and proves they can pass
deterministic import and quality gates. Supabase import, publish and indexing
remain separate HG-2.5 release actions.

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
Scope: produce one source-backed ATLAS blog article pair in EN and DE using local Claude/Codex workflow; no public publish, no Supabase apply, no index push unless a separate HG-2.5 release card explicitly authorizes it.
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
acceptance_criteria:
  - Worker verifies one EN and one DE Markdown article file exist under ${LOCAL_WORKSPACE} with matching slug, complete frontmatter, canonical paths and source list.
  - Worker verifies the local Blog Content Audit is green before recommending HG-2.5 import/publish; if blocked, worker reports the exact missing language/stub/source blockers.
  - Worker reports a claim-safety check result proving the two articles are evidence-backed, useful without internal context and free of personal medical/Rx/legal claims.
  - Worker writes or verifies a hero-image prompt or image brief for the article pair, with provider choice recorded; actual image generation is optional unless the release card requires it.
  - Worker reports an import dry-run PASS without requiring --apply.
  - Worker reports whether the article pair is ready for HG-2.5 import/publish review, needs revision, or should be parked.
gates:
  - cd ${LOCAL_WORKSPACE} && git status --short
  - cd ${LOCAL_WORKSPACE} && npm run content:article-audit -- --date YYYY-MM-DD --fail-on-blockers
  - cd ${LOCAL_WORKSPACE} && node scripts/import-research-articles-to-supabase.js --limit 50 --only-published --require-content-audit
  - cd ${LOCAL_WORKSPACE} && git diff --check
  - node ${LOCAL_WORKSPACE} --description-file ${LOCAL_WORKSPACE} --label role:cmo --json
human_gate: HG-2.5
reporting: Plane worker.reported with article file paths, slug, source list, dry-run result, image brief path, blocker state, release recommendation, reflection, learning_proposals and subagents: [].
OutcomeArtifacts:
  - ${LOCAL_WORKSPACE}
AllowedReadPaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
AllowedWritePaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
BlockedActions: do not mark Plane Done; do not write Linear; do not run import --apply; do not publish, schedule, index or call Supabase write functions; do not change Supabase schema, cron, Edge functions or SQL; do not spend money; do not make personal medical/Rx/legal claims.
EscalationPolicy: stop with NEEDS_HUMAN when Supabase apply, public publish, index push, schema/cron/Edge changes, spend, legal claims, medical/Rx claims, missing auth, failed dry-run or out-of-release-card actions are required.
Layer: CMO
RoleName: ATLAS Blog Article Claude/Codex producer
RoleLabel: role:cmo
ParentSeat: role:cmo
RoleOwner: CMO
Department: Growth
AccountableLayer: C-Level
ReportsTo: CEO
AutonomyLevel: L2 draft, L2.5 import/publish only after release card
Controller: codex
DecisionOwner: CMO
Sandbox: required
MaxRuntime: 45m
MaxSpend: EUR 0
KillSwitch: Plane comment KILL <work-item-ref> or local sentinel runtime/kill/<work-item-ref>.
Heartbeat: write a worker heartbeat every 10 minutes when the runtime supports it; otherwise include last successful gate in worker.reported.
OutcomeSpec: Produce one local EN/DE blog article pair and a CEO-ready HG-2.5 release recommendation.
OutcomeRubric:
  - PASS only if EN and DE files exist, frontmatter is complete, local content audit is green and import dry-run passes with `--require-content-audit`.
  - PASS only if source claims are concrete, bounded and cited in the frontmatter/source list.
  - NEEDS_HUMAN if content audit blocks, or if publish/index/import --apply is required.
  - REJECT if the article pair uses unsupported medical claims or stale/missing source evidence.
OutcomeMaxIterations: 1
OutcomeGrader: CAO then Codex
OutcomePassThreshold: PASS
RuntimeAuth:
  - claude-auth-ok
  - codex-cli-ok
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
RuntimeModelAlias: opus
InferenceBudget: max-context
ContextProfile: cross-workspace-boot-pack
ContextPack: atlas-marketing-department-intelligence-v0
InferenceClass: P3-cross-repo
ManagedAgentCompatibility: local-only
```
