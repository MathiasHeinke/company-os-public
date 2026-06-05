# Command EVE Alpha3 Closure Supergoal

Status: public release-planning note
Date: 2026-06-05
Current version: `1.0.0-alpha.3`

## Purpose

This note is the public anchor for closing all unfinished `0.8.x` and `0.9.x`
Command EVE items that Alpha.2 exposed but did not finish. Alpha.3 promotes
that closure work into the active publish-prep line.

The closure work is deliberately not a stable release claim. It makes the open
work visible, materializable in Plane and gateable by audit/security/code-review
before any HG-4 publish decision.

## What Alpha2 Already Absorbed

- Public source install and update proof.
- One-command guided local install path.
- AionUI, AionCore, Hermes and EVE sidecar composition.
- BYOK/Hermes auth preflight boundary.
- EVE first-run confirmation flow.
- Update lifecycle smoke.
- Remote pilot runbook for a supervised install.

## What Still Needs Closure

- Department dashboard templates and review cards.
- Marketing metrics and approval queue maturity.
- Post-worker quality, security, regression and hotfix automation as a default
  coding-work lane.
- Support, security, privacy and license client-rollout gate.
- Scheduler kill-switch and budget brake.
- Supergoal ladder and context topology integration proof.
- Self-observability/watchdog.
- Plugin and connector onboarding harness.
- Non-founder guided install evidence.

## Public Artifacts

- Parent contract:
  `docs/templates/supergoals-2026-06-05/command-eve-alpha2-08-09-closure-parent.md`
- Child contracts:
  `docs/templates/supergoals-2026-06-05/command-eve-alpha2-*.md`
- Plane materializer:
  `scripts/plane/materialize-command-eve-alpha2-closure-supergoal-2026-06-05.mjs`
- Reconciliation source:
  `docs/releases/2026-06-05-command-eve-08-09-reconciliation.md`

## Publish Boundary

This closure lane may prepare publish evidence, open a PR and produce a
decision card. With an explicit HG-4 pass it may tag/publish the named alpha
prerelease. It must not claim stable self-serve, deploy hosted infrastructure,
store customer data, enable autonomous publish/send/spend or mark Plane items
Done without the explicit release authority for those actions.
