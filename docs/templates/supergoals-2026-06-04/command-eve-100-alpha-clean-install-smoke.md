# Command EVE 1.0 Alpha Clean Install Smoke

```yaml
role: role:coo
parent_seat: role:coo
agent: codex
mode: verify
workspace: registry:company-os
dispatch: manual
target_class: main-integrated
source_of_truth:
  - ${COMPANY_OS_ROOT}/scripts/install/public-rc.mjs
  - ${COMPANY_OS_ROOT}/scripts/operator-shell/install-command-eve.mjs
  - ${COMPANY_OS_ROOT}/scripts/release/verify-clean-clone.mjs
scope:
  - include fresh public clone, public install, operator-shell dry-run and ideally one supervised live sidecar install.
  - exclude publishing a GitHub release, tagging or marking Plane Done.
acceptance_criteria:
  - Fresh public clone passes verify-clean-clone.
  - Public install against empty target passes and writes first EVE prompt.
  - Operator-shell install dry-run passes against the same target.
  - If live sidecar install is attempted, it must produce a report with exact failed/passed stage and no secrets.
gates:
  - node scripts/release/verify-clean-clone.mjs --root <fresh-public-clone>
  - node scripts/install/public-rc.mjs install --target <fresh-target> --company "Example Pilot GmbH" --website "https://example.com" --offer "Marketing outreach operating system" --buyer "founder-led client-service teams" --approval-owner "Pilot Founder" --first-department marketing --json
  - node scripts/operator-shell/install-command-eve.mjs install --dry-run --client-root <fresh-target> --json
human_gate: HG-2.5
reporting: Plane worker.reported with clone URL, commits, command outputs, report paths and blockers.
blocked_actions: no stable claim without live non-founder evidence, no secrets, no Plane Done.
```
