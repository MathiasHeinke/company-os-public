# Landing Pages Build + Vercel Subdomains + Stripe (Gated)

Build the two or three recommended landing pages, deploy them as Vercel
subdomains and wire Stripe at the decided price. Go-live is blocked until the
readiness gate passes and pricing is decided. This item will split into
per-surface implement items at dispatch; it is the gated build envelope.

```yaml
role: role:cto
parent_seat: role:cmo
agent: claude
mode: implement
workspace: registry:company-os
dispatch: manual
sandbox: required
target_class: production-deployed
depends_on:
  - [WORK_ITEM_ID]
  - [WORK_ITEM_ID]
  - [WORK_ITEM_ID]
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/strategy/autonomy-product-horizon.md
  - ${COMPANY_OS_ROOT}/kits/company-os-kit/README.md
scope:
  - include building the recommended landing pages, deploying them as Vercel subdomains and wiring Stripe at the decided price, all inside a sandbox until release.
  - exclude go-live and live Stripe before the readiness gate (selfserve-readiness) and pricing decision (selfserve-pricing) are released by the founder.
acceptance_criteria:
  - The two or three pages from the positioning child are built and pass build and lint gates inside the sandbox.
  - Pages deploy to Vercel subdomains (no new paid domains) in a non-public/preview state until go-live is released.
  - Stripe is wired at the decided price but stays in test mode until the founder releases go-live.
  - The item is split into per-surface implement items before dispatch if the contract controller requires it.
gates:
  - node scripts/orchestration/worker-ledger-validator.mjs --description-file docs/templates/supergoals-2026-05-29/selfserve-build.md --label role:cto
  - Repo build and lint gates named at dispatch.
  - Controller audit of the sandbox branch and CAO PASS.
  - Founder go-live release (HG-3) after readiness and pricing are decided.
human_gate: HG-3
reporting: Plane worker.reported with branch, worktree, changed files, deploy preview URLs, Stripe test-mode evidence, gate results, reflection and learning_proposals.
capability_profile: claude-clevel-worker/cto/runtime
runtime_permission_mode: acceptEdits
allowed_write_paths:
  - ${COMPANY_OS_ROOT}/[SOURCE_WORKSPACE]/
blocked_actions: no public go-live, no live Stripe, no public publish and no new paid domains until founder releases HG-3 after readiness and pricing; no merge, push, deploy-to-public or spend outside the gated release; no Plane Done.
reflection_policy: required
learning_proposal_policy: required
```
