# ATLAS Marketing Performance Analyst Worker Contract

Use this template for the CMO learning loop. The worker reads metrics and
recommends changes; it does not change cadence or doctrine.

## Plane Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: report
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
RunAt: set concrete ISO timestamp before dispatch
DependsOn:
scope:
  - Include: produce one daily or weekly ATLAS marketing performance report.
  - Include: compare topics, hooks, visuals, lane, platform and timing.
  - Exclude: changing cadence, doctrine or external queue state.
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
acceptance_criteria:
  - Report impressions, CTR when available, comments, shares, saves, follows, topic class and visual class.
  - For LinkedIn, prefer official Creator export evidence over public fetch when present; read the German multi-sheet XLSX-derived report for aggregate reach, top days, top posts, followers and demographics.
  - When LinkedIn Creator export exists but post-level request_id matching is blocked, use aggregate/profile and URL-level facts for CMO learning and label post-level attribution as blocked_no_matches.
  - When API metrics are missing and no Creator export exists, use only bounded public-fetch fallback evidence and label it as public_visible_partial or blocked.
  - Classify every recommendation as continue, revise, park or investigate with confidence.
  - Feed Planner with no more than five next-topic recommendations and no durable memory write.
gates:
  - cd ${LOCAL_WORKSPACE} && npm run marketing:analytics -- --date YYYY-MM-DD
  - cd ${LOCAL_WORKSPACE} && test -f marketing/performance/linkedin/YYYY-MM-DD_linkedin-performance.md || npm run marketing:linkedin-pull -- --date YYYY-MM-DD --profile mheinke_founder --open --watch-downloads --timeout-minutes 5
  - cd ${LOCAL_WORKSPACE} && git diff --check
  - node ${LOCAL_WORKSPACE} --description-file ${LOCAL_WORKSPACE} --label role:cmo --json
human_gate: HG-1
reporting: Plane worker.reported plus reports/marketing-department-v067/performance-analyst.md with metrics, recommendations, confidence, blockers, reflection and learning_proposals.
OutcomeArtifacts:
  - ${LOCAL_WORKSPACE}
AllowedReadPaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
AllowedWritePaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
BlockedActions: do not mark Plane Done; do not write Linear; do not write durable memory; do not change cadence; do not edit content artifacts; do not overfit from one weak data point.
OutcomeSpec: Produce one performance report that turns market response into bounded Planner inputs.
OutcomeRubric:
  - PASS only if recommendations cite metrics and confidence.
  - PASS only if weak data is labeled as weak.
  - PASS only if LinkedIn Creator export aggregate data is separated from post-level attribution and the German workbook sheet coverage is explicit.
  - REJECT if the report only summarizes impressions without next action.
RuntimeAuth:
  - analytics-read-auth-ok
  - tinyfish-mcp-oauth-ok-or-report-BLOCKED_AUTH
  - filesystem-read-ok
  - plane-app-token-read-ok
MaxRuntime: 30m
MaxSpend: EUR 0
KillSwitch: parent issue stop comment or CEO stop comment.
Heartbeat: Plane comment every 20m if running longer than one pass.
CapabilityProfile: claude-clevel-worker/cmo/marketing-performance-analyst
RuntimeAdapter: local-cli
RuntimePermissionMode: plan
RuntimeModelAlias: opus
InferenceBudget: max-context
ContextProfile: cross-workspace-boot-pack
ContextPack: atlas-marketing-department-intelligence-v0
InferenceClass: P3-cross-repo
GateExecutionPolicy: worker-runs-declared-gates
DreamPolicy: proposal-only
MemoryUpdatePolicy: proposal-only
ReflectionPolicy: required
LearningProposalPolicy: required
SessionPolicy: no-subagents
SubAgentRoster: none
```
