# Release Destination Runbook

Status: 0.6.0-beta.1 public mirror pushed
Owner: CEO/Codex
Gate: HG-2.5 for the external remote write

This runbook defines the final manual packet between the verified fresh-history
mirror and a GitHub destination repository. It deliberately separates packet
generation from the external remote write.

## Current State

Company.OS `0.6.0-beta.1` has a deterministic public mirror builder, a
fresh-history remote verifier, adaptive onboarding safety hardening and the
first Marketing/Growth beta wedge. The verifier builds the sanitized mirror,
commits it into a local temporary Git repository, pushes to a local bare
temporary remote, clones it, runs clean-clone verification, and bootstraps the
kit into a fresh target.

[WORK_ITEM_ID] executed the first real HG-2.5 public destination action on
2026-05-18: the generated fresh-history mirror was pushed to
`https://github.com/MathiasHeinke/company-os-public` as a single root commit.
No worker is allowed to create a tag, upload a release, rotate credentials,
write Linear, or mark Plane Done.

## Packet Generation

Generate the release destination packet:

```bash
node scripts/release/prepare-release-destination-packet.mjs \
  --target-repo MathiasHeinke/company-os-public \
  --json
```

The script returns:

- target repository URLs
- required gates
- preflight commands
- local packet commands
- held HG-2.5 command
- blocked actions still remaining

The script does not run the held command.

## Required Gates

Before any external remote write:

```bash
node --test scripts/release/prepare-release-destination-packet.test.mjs
node scripts/release/prepare-release-destination-packet.mjs --target-repo MathiasHeinke/company-os-public --json
node scripts/release/verify-fresh-history-remote.mjs --json
node scripts/release-gates/productization-readiness.mjs check
node scripts/page-index/generate-page-index.mjs --check
git diff --check
```

The public-release profile may still report launch-channel blockers until a real
destination repository exists. That does not authorize skipping the fresh-history
or secret-scan gates.

## HG-2.5 Hold

The held command is:

```bash
git -C "$MIRROR" push -u origin main
```

Run it only after CEO/Codex release sign-off has confirmed:

- target repository owner/name is correct
- destination repository is empty or intentionally replaceable
- final packet JSON is reviewed
- fresh-history local remote verifier is green
- no secrets or private paths are present in the mirror output
- rollback plan is written down

## 0.6.0-beta.1 Execution Record

The first real public destination push was executed under [WORK_ITEM_ID] after
Founder/CEO HG-2.5 approval:

- Target repository: `MathiasHeinke/company-os-public`
- Visibility: public
- Public root commit:
  `d5209406bcf3a4830bb0090367c9db0dc34b836e`
- Source snapshot:
  `c33796e73e4a7a5ffb95842bb681218f92420873`
- Post-push GitHub clone verification: PASS
- Clean-clone verifier on real GitHub clone: PASS
- Bootstrap install from real GitHub clone: PASS, 137 files copied
- Tags, release uploads, credential changes and private history push: not
  performed

## Rollback Boundary

Before pushing, the rollback is deletion of the temporary run directory. After
pushing to a real destination repository, rollback is a GitHub repository-level
administrative action and therefore remains CEO/Codex-owned.
