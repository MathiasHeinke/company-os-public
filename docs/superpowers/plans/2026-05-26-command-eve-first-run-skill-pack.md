# Command EVE First-Run Skill Pack Plan

Date: 2026-05-26
Status: executed in current branch

## Goal

Make the AionUI/Hermes EVE startup path reproducible enough that a fresh
Company.OS install can load a first-run skill pack and connector manifest,
instead of EVE assuming an empty workspace and opening with a broad
questionnaire.

## Scope

- Add a canonical first-run skill-pack operation doc.
- Add a versioned connector manifest to the public Company.OS kit.
- Add a schema for the connector manifest shape.
- Teach `eve-sidecar prepare` to materialize the generated skill and manifest
  into the private AionUI/Hermes context bundle.
- Teach `eve-sidecar preflight` to block when the generated first-run skill or
  connector manifest is missing/invalid.
- Extend operator-shell tests around the new artifacts.

## Non-Goals

- No real connector auth setup.
- No Plane writes.
- No AionUI frontend changes in this slice.
- No public self-serve stable claim.

## Verification

- `node --test scripts/operator-shell/eve-sidecar-core.test.mjs scripts/operator-shell/aionui-command-eve-overlay-core.test.mjs`
- `node scripts/operator-shell/eve-sidecar.mjs prepare --company-os-root ${LOCAL_WORKSPACE} --json`
- `node scripts/operator-shell/eve-sidecar.mjs preflight --company-os-root ${LOCAL_WORKSPACE} --json`
- `git diff --check`
