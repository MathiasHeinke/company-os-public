# Content Machine Pack Example Evidence

Status: scaffold evidence
Pack: `content-machine`

This evidence file proves the public Company.OS pack has the required surface:

- department SOP: `docs/orchestration/company-os-content-machine-department-pack-v0.md`
- EVE skill: `docs/integrations/aionui-hermes-content-machine-skill.md`
- kit setup: `kits/company-os-kit/.company-os/domain-packs/content-machine/setup.md`
- workflow: `kits/company-os-kit/.agents/workflows/content-machine-setup.md`
- parent contract: `docs/templates/company-os-content-machine-parent-worker-contract.md`
- research contract: `docs/templates/company-os-content-machine-research-worker-contract.md`
- draft contract: `docs/templates/company-os-content-machine-draft-worker-contract.md`
- FVBM doctrine: `docs/operations/eve-founder-voice-belief-model.md`
- M0 seed interview: `docs/operations/eve-m0-seed-interview.md`

## Example Run

```bash
node scripts/content/content-machine-start.mjs \
  --root tmp/content-machine-test \
  --company "Example Company" \
  --approval-owner "Founder" \
  --primary-channel "LinkedIn" \
  --write \
  --json
```

## Expected Outcome

- `content/content-machine/RUNBOOK.md` exists.
- `content/content-machine/01_source_inventory/SOURCE_INVENTORY.md` exists.
- `content/content-machine/02_vault/CONTENT_VAULT.md` exists.
- `content/content-machine/11_lessons/content-lessons.md` exists.
- `content-machine.config.json` records draft-only public action policy.
- No model call, private-source read, publish, schedule, send, spend,
  production write, secret read or Plane Done transition occurs.

## 10/10 Evaluation Required

This pack is not production-ready unless the Department Capability Pack
Evaluator returns `READY` and all worker contracts pass
`worker-ledger-validator`.

No private founder voice instance, customer data, secrets or source-company
literals belong in this example evidence.
