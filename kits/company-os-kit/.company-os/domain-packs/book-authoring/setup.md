# Book Authoring Domain Pack Setup

Status: guided-pilot setup

## Setup Loop

1. Capture BookSpec with `${COMPANY_OS_ROOT}/docs/templates/company-os-book-spec.md`.
2. Locate an existing FVBM or run the M0 seed interview from
   `${COMPANY_OS_ROOT}/docs/operations/eve-m0-seed-interview.md`.
3. Initialize the local project:

   ```bash
   node scripts/content/book-authoring-start.mjs \
     --root ${CLIENT_ROOT} \
     --company "Example Company" \
     --project-slug "founder-book" \
     --working-title "Working Title" \
     --approval-owner "Founder" \
     --write \
     --json
   ```

4. Create a CMO parent Plane item from
   `${COMPANY_OS_ROOT}/docs/templates/company-os-book-authoring-parent-worker-contract.md`.
5. Keep all child contracts `dispatch: manual` until CEO/Codex approves them.
6. Run research dossier, source ledger and proof plan before Frame Brief.
7. Treat any pre-research structure as `outline_sketch`, not official outline.
8. Create the official outline only after Frame Brief; run Outline CAO
   Checkpoint before drafting.
9. Run quality and capability-pack evaluator gates before claiming readiness.

## Safe Default

The pack starts in local draft-only mode. It creates no public output and does
not publish, submit, send, schedule, spend, write durable memory, request
secrets or mark Done.

## Required Gates

- worker-ledger-validator on parent and child contracts
- department pack evaluator for `book-authoring`
- local start command test
- research-before-outline gate: dossier + source ledger + proof plan + Frame
  Brief before official outline
- Outline CAO Checkpoint before drafting
- compliance sweep before build or publication claim
- HG-4 Founder decision for BookSpec direction, voice identity, cover and final
  publish
