# Company.OS Domain Pack Template

Use for: adding a reusable domain pack entry to
`registries/domain-packs/company-os.json` and the installable kit.

Status: template

## Registry Entry Shape

```json
{
  "id": "pack-id",
  "name": "Department Name",
  "owner_role": "role:coo",
  "first_useful_scope": "One guided-pilot scope that produces value without public or production actions.",
  "intake_questions": [
    "What company, offer and buyer should this support?",
    "Which existing systems or artifacts should be read first?",
    "Which actions, claims or surfaces are off-limits?",
    "Who approves output before external use?"
  ],
  "ai_discovery": [
    "Read approved public/company-provided sources.",
    "Summarize current state and uncertainties.",
    "Propose source-backed next actions.",
    "Ask operator to confirm or correct before drafting."
  ],
  "confirmation_steps": [
    "Present company reality summary.",
    "Operator accepts, corrects or rejects each assumption.",
    "No worker dispatch until the CEO/Codex parent is reviewed."
  ],
  "outputs": [
    "department-context.md",
    "setup-checklist.md",
    "parent-worker-contract.md",
    "child-worker-contracts.md",
    "quality-gate-report.md",
    "evaluation-scorecard.md"
  ],
  "default_human_gate": "HG-2",
  "activation_mode": "draft-only",
  "operator_confirmation_required": true,
  "blocked_actions": [
    "production-write-without-release",
    "public-send-publish-schedule-without-release",
    "regulated-claim-without-gate",
    "secret-read",
    "plane-done-by-worker"
  ]
}
```

## Kit Files

```text
kits/company-os-kit/.company-os/domain-packs/<pack-id>/setup.md
kits/company-os-kit/.agents/workflows/<pack-id>-setup.md
```

## Required Rules

- The pack starts `draft-only`.
- It asks only for missing information.
- It records approval owner before public or production actions.
- It emits Plane-ready parent/child contract drafts.
- It blocks all public, production, spend, secret and Done-transition actions
  until the relevant HumanGate release exists.
