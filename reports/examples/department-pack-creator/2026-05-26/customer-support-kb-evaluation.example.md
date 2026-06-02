# Department Capability Pack Evaluation - customer-support-kb

Version: company-os-department-pack-evaluator/v0
Date: 2026-05-26
Status: READY
Average Score: 10

## Disciplines

| Discipline | Score | Status |
|---|---:|---|
| Founder Intent Fit | 10 | pass |
| Department SOP | 10 | pass |
| Parent/Child Contracts | 10 | pass |
| Capability Boundary | 10 | pass |
| Quality Gates | 10 | pass |
| EVE/AionUI/Hermes UX | 10 | pass |
| Learning Loop | 10 | pass |
| Portability | 10 | pass |
| Autonomy Promotion | 10 | pass |
| Evidence Completeness | 10 | pass |

## Blockers

- none

## Checks

- PASS artifact.department_pack_missing: Department pack SOP is present.
- PASS artifact.kit_setup_missing: Kit setup runbook is present.
- PASS artifact.workflow_missing: Agent workflow is present.
- PASS artifact.eve_skill_missing: EVE/Hermes skill is present.
- PASS artifact.worker_contract_missing: Parent worker contract is present.
- PASS artifact.worker_contract_missing: Research worker contract is present.
- PASS artifact.worker_contract_missing: Draft worker contract is present.
- PASS artifact.scaffold_report_missing: Scaffold report is present.
- PASS contract.flat_yaml: Contract contains a flat yaml fence with role.
- PASS contract.source_of_truth: Contract declares source_of_truth.
- PASS contract.acceptance: Contract declares acceptance_criteria.
- PASS contract.gates: Contract declares gates.
- PASS contract.reflection: Contract requires reflection.
- PASS contract.learning: Contract requires learning proposals.
- PASS contract.flat_yaml: Contract contains a flat yaml fence with role.
- PASS contract.source_of_truth: Contract declares source_of_truth.
- PASS contract.acceptance: Contract declares acceptance_criteria.
- PASS contract.gates: Contract declares gates.
- PASS contract.reflection: Contract requires reflection.
- PASS contract.learning: Contract requires learning proposals.
- PASS contract.flat_yaml: Contract contains a flat yaml fence with role.
- PASS contract.source_of_truth: Contract declares source_of_truth.
- PASS contract.acceptance: Contract declares acceptance_criteria.
- PASS contract.gates: Contract declares gates.
- PASS contract.reflection: Contract requires reflection.
- PASS contract.learning: Contract requires learning proposals.
- PASS semantic.founder_intent: Pack captures founder intent, trigger and CEO delegation shape.
- PASS semantic.department_sop: Pack includes department purpose, setup loop, boundaries and HumanGates.
- PASS semantic.parent_child_contracts: Parent and child contracts carry seat, dispatch, source, acceptance and gate fields.
- PASS semantic.capability_boundary: CapabilityProfile and blocked surfaces are explicit in SOP and worker contracts.
- PASS semantic.quality_gates: Pack declares worker-contract validation, pack evaluator and 10/10 rubric gates.
- PASS semantic.eve_ux: EVE/Hermes skill defines behavior, output shape and challenge posture.
- PASS semantic.learning_loop: Pack requires reflection and learning proposals before doctrine or authority changes.
- PASS semantic.portability: Pack uses portable root placeholders and no source-company literals.
- PASS semantic.autonomy_promotion: Autonomy path is staged and keeps generated contracts manual by default.
- PASS semantic.evidence_completeness: Pack declares evidence artifacts and has a scaffold evidence report.
- PASS capability_profile.present: Department pack creator CapabilityProfile is registered.
- PASS capability_profile.blocks_production: CapabilityProfile blocks production writes.
- PASS capability_profile.blocks_public_publish: CapabilityProfile blocks public publish.
- PASS capability_profile.blocks_secret_read: CapabilityProfile blocks secret reads.
- PASS capability_profile.blocks_done: CapabilityProfile blocks Plane Done by worker.
- PASS privacy.private_literal: Pack contains no private path, source-product or token-shaped literals.
- PASS autonomy.unsafe_daily_claim: Daily/autonomous action is not enabled from a single draft.
