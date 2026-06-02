# ATLAS Marketing Daily Post Metrics Harvester Worker Contract

Use this template for the CMO-owned daily metrics collection lane. The worker
collects read-only post metrics and writes structured evidence for the CMO
Morning Briefing. It does not publish, schedule, reply, like, cancel, delete,
or mark Plane work items Done.

## Plane Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: report
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
RunAt: daily 18:00 Europe/Berlin
DependsOn:
scope:
  - Include: collect daily post-level metrics for ATLAS-owned X, LinkedIn and Reddit posts from Upload-Post, local publishing artifacts, public read sources and browser snapshots where available.
  - Include: update the stable post metrics ledger keyed by request_id, job_id, platform, post_url and source artifact.
  - Include: write CMO Morning Briefing inputs and evidence-backed learning candidates for planner use.
  - Exclude: publishing, scheduling, replying, liking, deleting, cancelling, reconnecting accounts, rotating credentials, changing cadence or claiming statistical winners from weak signal.
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
acceptance_criteria:
  - Runs Upload-Post analytics for profile mheinke_founder across x, linkedin and reddit for the target date and records API gaps as blockers, not zero-performance.
  - When LinkedIn API/browser metrics are missing, runs the founder-assisted LinkedIn Creator export lane and records the official German export URL: https://www.linkedin.com/analytics/creator/content/#:~:text=Zielgruppe-,Exportieren,-Vergangene%207%20Tage
  - Parses German LinkedIn Creator XLSX as a multi-sheet workbook: `AUFFINDBARKEIT`, `ENGAGEMENT`, `Top-Beiträge`, `Follower innen` and `DEMOGRAFISCHE DATEN`; `Top-Beiträge` has two side-by-side tables, one for interactions and one for impressions.
  - Reports aggregate Creator Analytics truth even when post-level attribution is blocked; missing request_id matches are blockers, not zero performance.
  - Runs the post metrics harvester with a 14-day daily lookback and preserves the cadence rule for day 21, 28, 35 and 42 follow-ups.
  - Updates or creates marketing/performance/post-metrics-ledger.json with request_id, platform, post_url, source_run, copy path, asset path, prompt or visual artifact path, metrics, trust source and blocker status.
  - Produces a dated CMO metrics report with best signal, weak signal, missing analytics, LinkedIn browser-snapshot coverage and no more than five planner recommendations.
  - Adds Morning Briefing input in the existing singleton pattern; no new daily Plane item is created.
  - Posts Plane worker.reported with report paths, gates, blockers, reflection and learning_proposals.
gates:
  - cd ${LOCAL_WORKSPACE} && node scripts/marketing-pipeline/upload-post-analytics.mjs --date YYYY-MM-DD --profile mheinke_founder --platforms x,linkedin,reddit
  - cd ${LOCAL_WORKSPACE} && npm run marketing:linkedin-pull -- --date YYYY-MM-DD --profile mheinke_founder --open --watch-downloads --timeout-minutes 5
  - cd ${LOCAL_WORKSPACE} && node scripts/marketing-pipeline/post-metrics-harvester.mjs --date YYYY-MM-DD --profile mheinke_founder --lookback-days 14 --max-targets 100
  - cd ${LOCAL_WORKSPACE} && node scripts/marketing-pipeline/linkedin-browser-snapshot.mjs --date YYYY-MM-DD
  - cd ${LOCAL_WORKSPACE} && git diff --check
  - cd ${LOCAL_WORKSPACE} && git diff --check
human_gate: HG-2
reporting: Plane worker.reported plus absolute report path ${LOCAL_WORKSPACE} and ARES ledger ${LOCAL_WORKSPACE}
OutcomeArtifacts:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
AllowedReadPaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
AllowedWritePaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
BlockedActions: do not publish; do not schedule; do not reply; do not like; do not delete; do not cancel; do not reconnect accounts; do not rotate credentials; do not print secrets; do not mark Plane Done; do not write Linear; do not change cadence; do not claim durable winners from weak signal.
OutcomeSpec: The CMO has a daily, evidence-backed post-level performance table that connects each published post to copy, image, prompt/source artifacts and measured platform response.
OutcomeRubric:
  - PASS only if every metric row has trust_source and blocker_status.
  - PASS only if LinkedIn API empty metrics are classified as missing/untrusted unless backed by Creator export, browser or manual snapshot evidence.
  - PASS only if the German Creator export workbook was parsed across all expected sheets or the report states `ARES LinkedIn Creator export failed` / `blocked_no_export` / `blocked_no_matches` with the exact blocker.
  - PASS only if recommendations distinguish strong, weak and missing signal.
  - REJECT if the worker treats aggregate profile metrics as post-level truth.
RuntimeAuth:
  - filesystem-read-ok
  - filesystem-write-report-ok
  - upload-post-read-auth-ok
  - plane-app-token-read-ok
RuntimeBrowserAuth: founder-assisted export only; worker may open the Creator Analytics export URL but must not log in, scrape private dashboard state, click publish/reply/like/delete/schedule or bypass the human export action.
MaxRuntime: 45m
MaxSpend: EUR 0
KillSwitch: COMPANY_OS_RUNTIME_KILL_SWITCH or CEO stop comment on the Plane item.
Heartbeat: Plane comment every 20m if running longer than one pass.
CapabilityProfile: claude-clevel-worker/cmo/marketing-performance-analyst
RuntimeAdapter: local-cli
RuntimePermissionMode: acceptEdits
InferenceClass: P1-code-bounded
GateExecutionPolicy: worker-runs-declared-gates
DreamPolicy: proposal-only
MemoryUpdatePolicy: proposal-only
ReflectionPolicy: required
LearningProposalPolicy: required
SessionPolicy: no-subagents
SubAgentRoster: none
```
