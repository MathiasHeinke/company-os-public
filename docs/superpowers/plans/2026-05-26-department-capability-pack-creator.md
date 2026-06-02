# Department Capability Pack Creator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable Company.OS factory for creating, validating and improving full department capability packs: EVE/Hermes skill, department SOP, domain pack, worker contracts, CapabilityProfiles, eval gates, learning loop and autonomy promotion path.

**Architecture:** Treat "skills" as a three-layer system: UI/intent skill, department operating pack and executable worker/capability substrate. The creator must scaffold artifacts, validate them fail-closed and score the pack across explicit 10/10 disciplines before any pack can be called production-ready.

**Tech Stack:** Markdown templates, JSON registries, Node.js CLIs/tests, existing Goal/Worker Contract/Capability Registry validators, AionUI/Hermes skill files, Plane parent/child contracts.

---

## GoalState

```yaml
goal_state:
  title: Department Capability Pack Creator
  outcome: Company.OS can create new department capability packs with the same rigor as the Blog Engine pack.
  owner: CEO
  role: role:cto
  workspace: registry:company-os
  horizon: 14d
  human_gate: HG-2.5
  metrics:
    - A new pack can be scaffolded from one command or guided workflow.
    - Every pack has SOP, domain pack, EVE/Hermes skill, worker contracts, CapabilityProfile, eval harness and report templates.
    - Pack evaluator scores all 10 disciplines and blocks release unless every score is 10/10 or a non-10 score has explicit evidence-backed justification.
  non_goals:
    - Do not auto-dispatch workers.
    - Do not mark Plane items Done.
    - Do not grant new connectors or secrets.
    - Do not claim self-serve production install until public-release sanitization passes.
```

## 10/10 Disciplines

Each new department pack must be scored. `READY` requires every discipline to be `10/10`, or `>=9/10` only when the missing point is externally constrained and the evaluator records why a literal 10 is not currently possible.

| Discipline | 10/10 means | Hard blocker below 10 |
|---|---|---|
| Founder Intent Fit | EVE can map messy founder language into a clear intent packet and challenge weak assumptions. | Generic intake, no challenge, or missing first decision. |
| Department SOP | C-Level owner, workflow, handoffs, blocked actions and escalation path are explicit. | "Worker just figures it out" behavior. |
| Parent/Child Contracts | Parent and every child are parseable flat Worker Issue Contracts with source, scope, acceptance, gates and reporting. | Missing parseable contract or `dispatch: ready` without Stage 0.5/0.65 readiness. |
| Capability Boundary | CapabilityProfile declares allowed tools, commands, workspaces, connectors, memory and HumanGates. | Undeclared connector/tool or broad write access. |
| Quality Gates | Deterministic eval gates reject thin output, missing evidence, unsafe claims or incomplete artifacts. | Publish/ship marked complete without proof. |
| EVE/AionUI/Hermes UX | A native skill card can guide setup, show blockers and produce CEO-ready packets. | UI is only prose, no actionable packet. |
| Learning Loop | Worker reflection, learning proposals, CAO/controller review and SOP/skill patch path exist. | Repeated failures do not update future behavior. |
| Portability | Pack uses placeholders and client workspace roots, not source-company assumptions or private paths. | ATLAS/ARES/Mathias-specific literals in installable pack. |
| Autonomy Promotion | L0->L3/L4 promotion path is explicit, with dry-run, pilot, monitor, rollback and HumanGates. | Daily/autonomous action can be enabled from one green draft. |
| Evidence Completeness | Example reports, tests and Artifact Truth make the pack independently auditable. | No reproducible proof artifacts. |

## Done Rule

This goal is not complete at "looks good". It is complete only when:

- The scaffold creates a complete pack for a fake non-ARES company.
- The evaluator returns `READY` only for complete packs.
- The evaluator returns `BLOCKED` for missing contracts, weak CapabilityProfile, missing gates, private path leaks, missing EVE skill or unjustified non-10 scores.
- The generated sample pack scores `10/10` in all disciplines, or every lower score contains:
  - `score`
  - `missing_point`
  - `why_10_is_not_currently_possible`
  - `evidence_path`
  - `follow_up_contract`
- Full relevant test gates pass.

## File Structure

- Create: `docs/templates/company-os-department-capability-pack.md`
  - Canonical template for Department SOP / Department Pack.
- Create: `docs/templates/company-os-domain-pack-template.md`
  - Canonical domain-pack registry entry template.
- Create: `docs/templates/company-os-aionui-skill-template.md`
  - Canonical EVE/Hermes/AionUI skill template.
- Create: `docs/templates/company-os-capability-pack-eval-rubric.md`
  - The 10-discipline scoring rubric and justification policy.
- Create: `scripts/orchestration/company-os-department-pack-scaffold-core.mjs`
  - Pure functions that build a pack file tree from structured input.
- Create: `scripts/orchestration/company-os-department-pack-scaffold.mjs`
  - CLI wrapper for scaffold/write/json.
- Create: `scripts/orchestration/company-os-department-pack-evaluator-core.mjs`
  - Pure evaluator for completeness, score discipline and fail-closed release status.
- Create: `scripts/orchestration/company-os-department-pack-evaluator.mjs`
  - CLI wrapper for eval/write/json.
- Create: `scripts/orchestration/company-os-department-pack-scaffold-core.test.mjs`
  - TDD tests for scaffold output.
- Create: `scripts/orchestration/company-os-department-pack-evaluator-core.test.mjs`
  - TDD tests for release-blocking evaluator.
- Modify: `docs/system-index.md`
  - Add Department Capability Pack Creator routing row.
- Modify: `registries/capabilities/company-os.json`
  - Add/extend a CTO/COO profile for pack creation and validation.
- Modify: `registries/domain-packs/company-os.json`
  - Add pack-creator domain if it should be exposed to EVE as an installable company capability.
- Modify: `docs/integrations/aionui-hermes-blog-department-skill.md`
  - Reference the generic creator once it exists, not as a dependency for current Blog Pack behavior.

## Tasks

### Task 1: Canonical Templates

**Files:**
- Create: `docs/templates/company-os-department-capability-pack.md`
- Create: `docs/templates/company-os-domain-pack-template.md`
- Create: `docs/templates/company-os-aionui-skill-template.md`
- Create: `docs/templates/company-os-capability-pack-eval-rubric.md`

- [ ] **Step 1: Write the template content**

The templates must include exact sections for:

```text
Purpose
Trigger / Intent
Founder Intake
CEO Delegation Packet
C-Level Parent Contract
Child Worker Contract List
CapabilityProfile Requirements
Allowed / Forbidden Surfaces
HumanGates
Quality Gates
Evidence Artifacts
Learning Loop
Autonomy Promotion Path
10/10 Evaluation Rubric
```

- [ ] **Step 2: Verify no private/source-company literals**

Run:

```bash
rg -n "ATLAS|ARES|bio-os|Mathias|${LOCAL_WORKSPACE}" docs/templates/company-os-*pack*.md docs/templates/company-os-aionui-skill-template.md
```

Expected: no matches, except intentional placeholder examples that use `${COMPANY_OS_ROOT}` or `${CLIENT_WORKSPACE_ROOT}`.

### Task 2: Scaffold Core TDD

**Files:**
- Create: `scripts/orchestration/company-os-department-pack-scaffold-core.test.mjs`
- Create: `scripts/orchestration/company-os-department-pack-scaffold-core.mjs`

- [ ] **Step 1: Write failing scaffold tests**

Tests must assert that a fake "Customer Support KB Department" input creates:

```text
docs/orchestration/company-os-customer-support-kb-department-pack-v0.md
kits/company-os-kit/.company-os/domain-packs/customer-support-kb/setup.md
kits/company-os-kit/.agents/workflows/customer-support-kb-setup.md
docs/integrations/aionui-hermes-customer-support-kb-skill.md
docs/templates/company-os-customer-support-kb-parent-worker-contract.md
docs/templates/company-os-customer-support-kb-research-worker-contract.md
docs/templates/company-os-customer-support-kb-draft-worker-contract.md
reports/examples/customer-support-kb-pack/README.example.md
```

- [ ] **Step 2: Run red test**

Run:

```bash
node --test scripts/orchestration/company-os-department-pack-scaffold-core.test.mjs
```

Expected: fail because the module does not exist yet.

- [ ] **Step 3: Implement minimal scaffold core**

Export:

```js
export function buildDepartmentPackScaffold(input) {}
export function validateDepartmentPackInput(input) {}
export function writeDepartmentPackScaffold(scaffold) {}
```

No CLI yet. No Plane writes.

- [ ] **Step 4: Run green test**

Run:

```bash
node --test scripts/orchestration/company-os-department-pack-scaffold-core.test.mjs
```

Expected: all scaffold tests pass.

### Task 3: Evaluator Core TDD

**Files:**
- Create: `scripts/orchestration/company-os-department-pack-evaluator-core.test.mjs`
- Create: `scripts/orchestration/company-os-department-pack-evaluator-core.mjs`

- [ ] **Step 1: Write failing evaluator tests**

Tests must cover:

```text
complete fake pack -> READY and 10/10 all disciplines
missing EVE skill -> BLOCKED
missing worker contract -> BLOCKED
missing CapabilityProfile -> BLOCKED
private path literal -> BLOCKED
score 9 without justification -> BLOCKED
score 9 with external constraint + evidence + follow-up contract -> PASS_WITH_JUSTIFIED_GAP
daily/autonomous action without pilot/monitor/rollback gates -> BLOCKED
```

- [ ] **Step 2: Run red test**

Run:

```bash
node --test scripts/orchestration/company-os-department-pack-evaluator-core.test.mjs
```

Expected: fail because the module does not exist yet.

- [ ] **Step 3: Implement evaluator**

Export:

```js
export function evaluateDepartmentCapabilityPack({ root, packId, rubric }) {}
export function scoreDepartmentPackDiscipline(discipline, evidence) {}
export function renderDepartmentPackEvaluationMarkdown(report) {}
export function writeDepartmentPackEvaluation(report) {}
```

- [ ] **Step 4: Run green test**

Run:

```bash
node --test scripts/orchestration/company-os-department-pack-evaluator-core.test.mjs
```

Expected: all evaluator tests pass.

### Task 4: CLI Wrappers

**Files:**
- Create: `scripts/orchestration/company-os-department-pack-scaffold.mjs`
- Create: `scripts/orchestration/company-os-department-pack-evaluator.mjs`

- [ ] **Step 1: Add scaffold CLI**

Required flags:

```text
--pack-id
--name
--owner-role
--client-domain
--date
--write
--json
```

- [ ] **Step 2: Add evaluator CLI**

Required flags:

```text
--pack-id
--root
--date
--write
--json
```

- [ ] **Step 3: Verify CLI dry-runs do not write by default**

Run:

```bash
node scripts/orchestration/company-os-department-pack-scaffold.mjs --pack-id customer-support-kb --name "Customer Support KB" --owner-role role:coo --client-domain customer-support-kb --json
node scripts/orchestration/company-os-department-pack-evaluator.mjs --pack-id customer-support-kb --json
```

Expected: JSON output and no new files unless `--write` is present.

### Task 5: Capability Registry Integration

**Files:**
- Modify: `registries/capabilities/company-os.json`
- Modify: `scripts/capabilities/capability-registry-core.test.mjs`

- [ ] **Step 1: Add/extend capability profile**

Profile id:

```text
claude-clevel-worker/cto/department-capability-pack-creator
```

The profile must allow only docs/templates/scripts/reports writes required for pack creation and block:

```text
production-write
public-publish
secret-read
plane-done-by-worker
capability-profile-expansion-without-hg25
runtime-auth-expansion
```

- [ ] **Step 2: Add registry test**

Test that a pack-creator worker contract passes only when it uses that profile and allowed paths.

### Task 6: EVE/Hermes Native Skill Path

**Files:**
- Create or modify: `docs/integrations/aionui-hermes-department-pack-creator-skill.md`
- Modify: `scripts/operator-shell/eve-sidecar-core.mjs`
- Modify: `scripts/operator-shell/eve-sidecar-core.test.mjs`

- [ ] **Step 1: Add native EVE intent**

Intent id:

```text
intent.department_capability_pack_setup
```

EVE output sections:

```text
1. My read
2. What I need to challenge
3. Department Intent Packet
4. CEO Delegation Packet
5. Draft C-Level parent
6. Draft child worker contracts
7. Capability boundaries
8. 10/10 evaluation rubric
9. First Founder/CEO decision needed
```

- [ ] **Step 2: Materialize the skill in sidecar prepare**

The prepare step should generate:

```text
${COMPANY_OS_PRIVATE_ROOT}/aion-companyos-context/aionui-skills/company-os-department-pack-creator/SKILL.md
```

- [ ] **Step 3: Verify preflight**

Run:

```bash
node scripts/operator-shell/eve-sidecar.mjs preflight --json
```

Expected: `department_pack_creator_skill_exists=true`.

### Task 7: Fake Non-ARES Proof Pack

**Files:**
- Create generated example under: `reports/examples/department-pack-creator/2026-05-26/`

- [ ] **Step 1: Scaffold fake pack**

Run:

```bash
node scripts/orchestration/company-os-department-pack-scaffold.mjs --pack-id customer-support-kb --name "Customer Support KB" --owner-role role:coo --client-domain customer-support-kb --date 2026-05-26 --write --json
```

Expected: scaffold report with no private/source-company literals.

- [ ] **Step 2: Evaluate fake pack**

Run:

```bash
node scripts/orchestration/company-os-department-pack-evaluator.mjs --pack-id customer-support-kb --date 2026-05-26 --write --json
```

Expected: `status=READY` only when all ten disciplines score 10/10.

### Task 8: Goal/Plane Contract Set

**Files:**
- Create: `reports/goals/2026-05-26/department-capability-pack-creator-goal.md`
- Create: `reports/goals/2026-05-26/department-capability-pack-creator-goal.json`

- [ ] **Step 1: Generate local Goal draft**

Run:

```bash
node scripts/goal/goal.mjs draft \
  --title "Department Capability Pack Creator" \
  --outcome "Company.OS can create and evaluate full department capability packs with 10/10 rubric, worker contracts, capability boundaries and EVE/Hermes skill support." \
  --role role:cto \
  --workspace registry:company-os \
  --human-gate HG-2.5 \
  --source docs/orchestration/spec-to-worker-pipeline.md \
  --source docs/templates/worker-issue-contract.md \
  --source docs/orchestration/company-os-blog-engine-department-pack-v072.md \
  --metric "Evaluator blocks every incomplete pack and returns READY only when all ten disciplines are 10/10 or justified." \
  --acceptance "Scaffold CLI creates SOP, domain pack, EVE skill, worker contracts, CapabilityProfile references, eval harness and example reports." \
  --acceptance "Evaluator emits 10-discipline scorecard with evidence paths and fail-closed blockers." \
  --gate "node --test scripts/orchestration/company-os-department-pack-*.test.mjs" \
  --gate "node scripts/release-gates/productization-readiness.mjs check" \
  --write
```

Expected: local goal artifacts only. No Plane write.

### Task 9: Verification

Run:

```bash
node --test scripts/orchestration/company-os-department-pack-*.test.mjs scripts/capabilities/capability-registry-core.test.mjs scripts/operator-shell/eve-sidecar-core.test.mjs
node scripts/release-gates/productization-readiness.mjs check
node scripts/page-index/generate-page-index.mjs --root . --output docs/page-index.md --source tracked --check --json
git diff --check
${LOCAL_WORKSPACE} status
${LOCAL_WORKSPACE} detect-changes --repo company-os
```

Expected:

```text
tests: PASS
productization-readiness: 0 blockers
page-index: ok true
git diff --check: no output
gitnexus status: up-to-date
detect-changes: report risk; HIGH is acceptable only with explanation
```

## Release Gate

This pack creator can be called `10/10 ready for guided Company.OS use` only after:

- a fake non-ARES pack is scaffolded
- evaluator returns `READY`
- at least one intentionally broken pack returns `BLOCKED`
- EVE sidecar exposes the creator skill
- generated worker contracts pass worker-ledger validation
- CapabilityProfile boundaries pass registry validation
- Productization gate has `0 blockers`
- CAO/Controller review has no unresolved blocker

It cannot be called `self-serve production ready for arbitrary customers` until public-release sanitization and install/update flows pass separately.
