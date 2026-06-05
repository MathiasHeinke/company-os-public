# Company.OS Content Machine Founder Interview Worker Contract

Use this template for extracting real founder stories, numbers, tension and
voice before drafting.

## Plane Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: plan
workspace: registry:company-os
dispatch: manual
RunAt: manual
DependsOn:
scope:
  - Include: create interview questions for one selected vault idea.
  - Include: produce a raw founder brief from founder-confirmed answers.
  - Exclude: inventing stories, writing final copy, public release or memory promotion.
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-content-machine-department-pack-v0.md
  - ${COMPANY_OS_ROOT}/docs/operations/eve-founder-voice-belief-model.md
  - ${CLIENT_ROOT}/content/content-machine/02_vault/CONTENT_VAULT.md
acceptance_criteria:
  - Ask questions one at a time or in short waves.
  - Capture at least one concrete story, one number or mechanism, one tension and one refusal.
  - Mark unanswered information gaps instead of fabricating details.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/company-os-content-machine-founder-interview-worker-contract.md --label role:cmo --json
human_gate: HG-2 for founder answers; HG-4 for voice identity and strategic public positioning.
reporting: reports/content-machine/founder-interview-report.md
AllowedReadPaths:
  - ${CLIENT_ROOT}/content/content-machine/
AllowedWritePaths:
  - ${CLIENT_ROOT}/content/content-machine/04_founder_interviews/
  - ${CLIENT_ROOT}/content/content-machine/05_raw_briefs/
  - ${CLIENT_ROOT}/reports/content-machine/
BlockedActions: no fabricated stories; no public copy; no publish; no schedule; no durable memory write without approval; no Plane Done transition.
CapabilityProfile: claude-clevel-worker/cmo/content-machine
OutcomeSpec: Produce a raw founder brief that preserves the founder's words and unresolved gaps.
OutcomeRubric:
  - PASS only if raw founder material is clearly separated from AI interpretation.
  - REJECT if the brief paraphrases away concrete founder language.
ReflectionPolicy: required
LearningProposalPolicy: required
```
