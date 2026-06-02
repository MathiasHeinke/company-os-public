# Post-Worker Quality Worker Contracts

Status: reusable lower-worker templates
Use for: drafting audit, deep-audit and hotfix follow-up workers after a
worker.reported and CAO/controller signal
Last updated: 2026-05-27

## Quality Auditor

```yaml
role: role:cto
parent_seat: role:cto
agent: codex
mode: audit
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/post-worker-quality-loop.md
  - ${COMPANY_OS_ROOT}/registries/quality/post-worker-quality-loop.json
  - <parent worker report path>
acceptance_criteria:
  - Re-run declared gates or state exactly why a gate cannot be rerun.
  - Produce a bug/regression/security-risk summary with severity and evidence.
  - Do not edit source files.
gates:
  - git diff --check
  - node scripts/orchestration/post-worker-quality-loop-core.mjs --json
human_gate: HG-2
reporting: Plane controller.audit-followup plus absolute report path under reports/audits/.
BlockedActions: do not edit source; do not merge, push, deploy, publish, spend, write production, or mark Plane Done.
CapabilityProfile: codex-lower-worker/cto/quality-auditor
WorkerClass: quality-auditor
PostWorkerQualityPolicy: post-worker-quality-loop/v0
QualityLoopMaxHotfixRounds: 0
ReflectionPolicy: required
LearningProposalPolicy: required
```

## Security Auditor

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: audit
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/post-worker-quality-loop.md
  - <parent worker report path>
acceptance_criteria:
  - Inspect only declared source-of-truth and changed files.
  - Report security, credential, auth, RLS, data and production-risk findings.
  - Do not print secrets; redact any detected secret-like value.
gates:
  - git diff --check
  - rg -n "secret|token|credential|service-role|RLS|auth" <declared paths>
human_gate: HG-2.5
reporting: Plane controller.audit-followup plus absolute report path under reports/audits/.
BlockedActions: do not edit source; do not print secrets; do not merge, push, deploy, publish, spend, write production, or mark Plane Done.
CapabilityProfile: claude-lower-worker/cto/security-auditor
WorkerClass: security-auditor
PostWorkerQualityPolicy: post-worker-quality-loop/v0
RuntimePermissionMode: plan
ReflectionPolicy: required
LearningProposalPolicy: required
```

## Deep Audit Worker

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: audit
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/post-worker-quality-loop.md
  - <parent worker report path>
  - <parent source-of-truth paths>
acceptance_criteria:
  - Produce a severity-ordered architecture, bug, regression and security audit.
  - Mark claims as FACT(path), INFERENCE(path) or HYPOTHESIS(no evidence yet).
  - Recommend hotfix contracts only; do not edit files.
gates:
  - git diff --check
  - ${LOCAL_WORKSPACE} detect-changes
human_gate: HG-2.5
reporting: Plane controller.audit-followup plus absolute report path under reports/audits/.
BlockedActions: do not edit source; do not merge, push, deploy, publish, spend, write production, or mark Plane Done.
CapabilityProfile: claude-lower-worker/cto/deep-audit
WorkerClass: deep-audit-worker
PostWorkerQualityPolicy: post-worker-quality-loop/v0
RuntimeModelAlias: opus
MaxRuntime: 1800s; first duplicate/stuck check no earlier than 300s
RuntimePermissionMode: plan
ReflectionPolicy: required
LearningProposalPolicy: required
```

## Hotfix Worker

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: implement
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/post-worker-quality-loop.md
  - <audit finding path>
  - <parent worker report path>
scope:
  - Include only the exact failing files listed in AllowedWritePaths.
  - Exclude merge, push, deploy, production write, schema/RLS/auth, public publish, spend and Plane Done.
allowedwritepaths:
  - <absolute file or directory path>
acceptance_criteria:
  - Fix the named finding with the smallest coherent change.
  - Run the declared regression gate and report output.
  - Emit worker.hotfix-reported with changed files, gates and blockers.
gates:
  - git diff --check
  - <repo-specific test command>
  - ${LOCAL_WORKSPACE} detect-changes
human_gate: HG-2.5
reporting: Plane worker.hotfix-reported plus absolute report path under reports/runs/.
BlockedActions: do not merge, push, deploy, publish, spend, write production, change schema/RLS/auth, or mark Plane Done.
CapabilityProfile: claude-lower-worker/cto/hotfix
WorkerClass: hotfix-worker
PostWorkerQualityPolicy: post-worker-quality-loop/v0
QualityLoopMaxHotfixRounds: 1
RuntimePermissionMode: acceptEdits
ReflectionPolicy: required
LearningProposalPolicy: required
```
