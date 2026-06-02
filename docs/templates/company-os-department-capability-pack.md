# Company.OS Department Capability Pack Template

Use for: defining a reusable department-level capability that can be installed
for Company.OS itself or for a client company.

Status: template

## Purpose

Describe the business function this department pack owns, the company outcome it
improves and the first useful guided-pilot scope. A department pack is more
than a prompt or skill: it must include intent routing, SOP, worker contracts,
capability boundaries, gates, evidence and learning.

## Trigger / Intent

```yaml
intent_id:
trigger_phrases:
  - ""
founder_problem:
desired_business_outcome:
first_safe_scope:
```

## Founder Intake

Ask only for missing fields:

```yaml
company:
website:
offer:
buyer:
primary_user:
existing_systems:
allowed_channels_or_surfaces:
off_limits_claims_or_actions:
approval_owner:
cadence_goal:
success_signal:
```

## CEO Delegation Packet

```yaml
objective:
recommended_release_band:
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-department-capability-pack.md
c_level_routing:
  owner_role:
  support_roles:
proposed_parent:
proposed_children:
  - ""
acceptance_criteria:
  - ""
gates:
  - ""
human_gate:
blocked_actions:
  - no production write without release card
  - no public publish/send/schedule without HumanGate release
  - no secret read
  - no Plane Done transition by worker or CAO
```

## C-Level Parent Contract

The parent is a coordination item, not a worker. It must specify outcome,
children, release path and review gates. Child work must be normalized into
flat fenced Worker Issue Contracts before dispatch.

```yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: plan
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-department-capability-pack.md
acceptance_criteria:
  - Department pack source truth, child contracts and gates exist.
gates:
  - Stage 0.5 contract review
  - Stage 0.65 runtime executability
human_gate: HG-2.5
reporting: Plane worker.reported with pack paths, child contracts, gates, blockers and release recommendation.
BlockedActions: do not dispatch workers automatically; do not mark Plane Done; do not publish, send, schedule, spend or write production systems.
CapabilityProfile: claude-clevel-worker/cto/department-capability-pack-creator
ReflectionPolicy: required
LearningProposalPolicy: required
```

## Child Worker Contract List

Minimum child lanes:

- intent and intake setup
- domain research or current-state audit
- SOP and parent/child contract authoring
- capability boundary and registry proposal
- quality/eval gate implementation
- AionUI/EVE/Hermes skill materialization
- CAO/controller evaluation and release packet

Each child must include:

```yaml
role:
parent_seat:
agent:
mode:
workspace:
dispatch: manual
source_of_truth:
acceptance_criteria:
gates:
human_gate:
reporting:
BlockedActions:
CapabilityProfile:
OutcomeSpec:
OutcomeRubric:
ReflectionPolicy: required
LearningProposalPolicy: required
```

## CapabilityProfile Requirements

Declare:

- allowed workspaces and sandbox workspaces
- allowed commands
- allowed connectors and restricted connectors
- allowed skills and subagents
- blocked reads and forbidden surfaces
- HumanGate levels
- write paths
- gate execution policy
- memory read/write policy

No worker may infer access from an interactive runtime. Runtime access must be
declared in the CapabilityProfile and repeated in the worker contract.

## Allowed / Forbidden Surfaces

Allowed by default:

- local docs/templates/reports under declared write paths
- dry-run evidence artifacts
- proposal-only learning notes
- local evaluation harnesses

Forbidden by default:

- secrets, browser cookies and private raw memory
- production writes
- public publish/send/schedule/spend
- connector or runtime-auth expansion
- Plane Done transitions by worker or CAO
- durable memory writes without controller review

## HumanGates

```yaml
setup: HG-2
bounded_release_or_pack_promotion: HG-2.5
critical_reversible_runtime_or_scheduler_change: HG-3
founder_proxy_review: HG-3.5
strategic_or_non_restorable_decision: HG-4
```

## Quality Gates

A pack must define deterministic gates for:

- artifact completeness
- worker-contract parseability
- CapabilityProfile registration
- private path and source-company literal scan
- claim/safety/regulated-surface risk, if applicable
- dry-run or fake-company proof
- CAO/controller review packet

## Evidence Artifacts

Required evidence:

```text
reports/examples/<pack-id>/<date>/scaffold-report.example.md
reports/examples/<pack-id>/<date>/evaluation-report.example.md
reports/examples/<pack-id>/<date>/scorecard.example.json
```

## Learning Loop

Workers may propose improvements to SOPs, skills, harnesses and capability
boundaries. They do not silently self-modify the department pack. Promotion
requires CAO/controller review and, when the change expands authority,
HumanGate release.

## Autonomy Promotion Path

```text
L0: read-only intent and current-state discovery
L1: draft setup packet and child contracts
L2: local dry-run artifacts and eval reports
L2.5: bounded CEO/Codex release for reversible pack promotion
L3: critical reversible scheduler/runtime authority after proof history
L4: founder decision for strategic or non-restorable authority
```

## 10/10 Evaluation Rubric

Use `docs/templates/company-os-capability-pack-eval-rubric.md`. A department
pack is not complete unless every discipline is 10/10 or a justified non-10
score includes evidence, reason, external constraint and follow-up contract.
