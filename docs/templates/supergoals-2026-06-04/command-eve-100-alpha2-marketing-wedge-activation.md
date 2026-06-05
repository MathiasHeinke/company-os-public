# Command EVE 1.0.0-alpha.2 Marketing Wedge Activation

```yaml
role: role:cmo
parent_seat: role:coo
agent: codex
mode: implement
workspace: registry:company-os
dispatch: ready
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-content-machine-department-pack-v0.md
  - ${COMPANY_OS_ROOT}/docs/operations/command-eve-daily-posting-automation.md
  - ${COMPANY_OS_ROOT}/docs/strategy/command-eve-offer-v1.md
  - ${COMPANY_OS_ROOT}/assets/brand/eve-command/DESIGN.md
  - ${COMPANY_OS_ROOT}/scripts/content/content-machine-start.mjs
scope:
  - include a draft-only Marketing/Content Machine first wedge that creates local briefs, source inventory, founder voice checks and first content drafts.
  - exclude autonomous external posting, scheduling, outreach, spend, CRM writes, public claims and customer-specific templates.
acceptance_criteria:
  - A fresh pilot can activate the Content Machine pack from local install state.
  - The first wedge produces draft-only local artifacts with source inventory, FVBM status, raw brief and next review packet.
  - EVE can explain that publishing/scheduling/outreach remains HumanGate-gated.
  - The wedge is generic enough for founder-led service teams, not Alois-specific.
gates:
  - node --test scripts/content/content-machine-start.test.mjs
  - node scripts/content/content-machine-start.mjs --client-root <fresh-target> --dry-run --json
  - node scripts/orchestration/company-os-department-pack-evaluator.mjs --pack content-machine --json
human_gate: HG-2.5
reporting: Plane worker.reported with generated draft artifact paths, pack evaluator result, gated actions and pilot usefulness notes.
blocked_actions: no public publishing, no scheduled post, no outreach send, no spend, no CRM mutation, no customer data upload.
```
