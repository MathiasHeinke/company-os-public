# ADR: Public Release History Strategy — PUB-01a

Status: accepted; validated by 0.5.1-alpha.1 local fresh-history remote dry-run;
current private staging tree is 0.5.2-alpha.1
Deciders: COO (author), CEO/Codex (controller), Founder (HG-2)
Work item: [WORK_ITEM_ID]
Date: 2026-05-14
Supersedes: none
Superseded by: none

---

## Context

Company.OS 0.5.2-alpha.1 is the current working private staging tree. The
public sanitization audit (`reports/public-release/2026-05-11/
public-sanitization-audit.md`) classified the private repository history as
**BLOCKED** for any direct public/self-serve GitHub release. The first public
mirror target was **0.5.0-alpha.1**; **0.5.1-alpha.1** validates the next step
by rehearsing the fresh-history mirror through a local temporary bare Git
remote and fresh clone. **0.5.2-alpha.1** keeps that public-release strategy
unchanged and adds adaptive onboarding safety hardening on the private staging
track.

The primary hard blocker for the public release is the git history problem:

- **P-01 (S0)** — A token-shaped ARES Hermes string
  (`kits/company-os-kit/.antigravity/logs/architect-memory.md:207`) was embedded
  in a tracked kit file. Live credential status is not asserted by this ADR.
  The string class is still disallowed in any public artifact, and the
  historical commit that carried it is treated as non-public history.
- **P-12 (S1/S4)** — ~270 `reports/**` files and three `metrics/*.jsonl`
  ledgers contain source-company identifiers (Plane project UUIDs, ATLAS-/
  COMPA-* IDs, founder email, home paths). These are acceptable in the private
  staging tree but constitute blocking leaks in a public repository.
- **P-13 through P-14 (S1/S4)** — Live worker-stream JSONL files carry
  absolute private paths and operational telemetry, covered by the P-12 class.
- Several additional S1 blockers across kit, docs and scripts (P-02 through
  P-11, P-15 through P-25) are categorized in the audit but follow from the
  history/mirror decision made here.

The history strategy chosen here determines how PUB-02 must implement the
public-mirror builder and how the public 0.5.x-alpha repository will be
seeded. **This ADR decides the history path and delegates execution to PUB-02.**

Constraints that the chosen strategy must satisfy:

1. No token or credential value may appear in any publicly reachable git object
   (blob, commit, tree, note, tag, stash, reflog).
2. No private-company identifiers (ARES names, founder paths, COMPA-* IDs,
   Plane UUIDs) may appear in any public commit message or file content.
3. The private staging tree (`Company.OS` private repo, current `main`) must
   remain intact and unmodified by the public release process.
4. The public release must be reproducible: given the same private commit SHA,
   the same public tree must be produced every time.
5. The chosen strategy must be executable without running any live ARES system
   and without a force-push to a private branch that collaborators depend on.

---

## Decision

**Selected strategy: Fresh-history public mirror repository seeded by a
deterministic sanitization script.**

A new standalone public repository (e.g. `companyos/companyos` or
`MathiasHeinke/companyos`) is created with a **single root commit** for each
public release. The commit contains only the sanitized output of
`scripts/release/build-public-mirror.mjs`. The public repository carries no
lineage to the private staging tree. Each subsequent public release appends a
new commit to the public repository, authored with a sanitized commit message
that references only the public release version, not any private Plane/Linear
identifiers.

The private staging repository (`Company.OS`) remains untouched. Its history
is never rewritten.

### Required preconditions before executing this strategy

1. **PUB-01 classification and excision**: The token-shaped string must be
   removed from the reusable kit and replaced with a non-secret placeholder.
   If separate live-system evidence proves the string is or was an active
   credential, the Founder must rotate/revoke it under HG-2. Without that
   evidence, this release track treats P-01 as a public-artifact sanitization
   blocker, not as a proven live-token incident. The historical commit that
   carried the string is still treated as non-public history and is never
   pushed to any public remote.
2. **PUB-02 mirror builder**: `scripts/release/build-public-mirror.mjs` must
   exist and must strip all items on the blockers table (reports, metrics
   ledgers, private kit content, ARES-named docs) and pass
   `productization-readiness.mjs check --public-release` with zero blockers on
   the produced tree.
3. **PUB-03 through PUB-10** sanitization tasks must reduce the blocker count
   to zero as measured by the `--public-release` gate on the public mirror tree.

**PUB-01 is not complete until token-shaped string excision evidence exists and the chosen history strategy (fresh-history public mirror) has been executed.**

**No public mirror may be built from current private history before PUB-01 is closed.**

---

## Alternatives

### Alternative A — History rewrite on the private main branch (REJECTED)

Use `BFG Repo Cleaner` or `git filter-repo` to scrub the token commit from the
private `main` branch history, then push from a sanitized branch to a public
remote.

**Rejection reasons:**

- Requires a destructive force-push of `main`, invalidating all existing
  collaborator branch pointers and rebasing any in-flight work.
- Even after token scrubbing, every private commit message referencing
  ARES/ATLAS-*/COMPA-*/founder paths becomes part of the public git log,
  requiring a second pass that effectively rewrites all commit messages.
- The private-staging and public histories diverge in SHA space, making future
  audit of private→public provenance impossible to verify deterministically.
- Risk of missing deep-history blobs (notes, stash, reflogs) during the filter
  pass, leaving a residual exposure window that is hard to prove clean.
- Does not solve P-12 (reports/metrics files in historical commits) without
  also filtering those, which expands the rewrite scope to hundreds of paths
  and makes the operation harder to verify.

### Alternative B — Filtered release branch in the private repo (REJECTED)

Create a `release/public-0.5.x` branch from `main` via `git filter-branch` or
`git worktree`, strip the blocked files, and push that branch to a public
remote.

**Rejection reasons:**

- Shares the structural history problems of Alternative A (private commit
  messages, deep-history blobs from the shared ancestry).
- The public remote would have a branch history that diverges from the private
  repo at a point in time, making the two repos structurally coupled. Any
  history-adjacent action on the private repo (cherry-pick, rebase) risks
  inadvertently creating a second path to the token commit.
- Maintenance burden grows with every release cycle: the filter must be rerun
  cleanly on each cycle without introducing new private content.
- The `release/` branch naming makes the private repo's conceptual layout
  visible to the public remote.

### Alternative C — Tag-and-copy manual release (DEFERRED/REJECTED)

On each release, manually copy files to a separate public repository without
any script. Tag the private and public repos independently.

**Rejection reasons:**

- Not reproducible: a second run of the same "copy" procedure by a different
  person or at a different time could produce different output.
- Not auditable: there is no deterministic way to prove that the public tree
  matches the private tree minus the strip-list.
- Does not scale: the 25-item blocker table grows; a manual copy cannot
  reliably enforce it.
- Deferred as a fallback if PUB-02 cannot be implemented, but the intent is to
  implement PUB-02 for the 0.5 public mirror track.

---

## Consequences

### Positive consequences

- The private staging repository is never destructively altered. Its history
  remains a full audit trail for internal governance.
- The public repository has a clean, short history: one root commit per major
  release, no private references in any git object.
- The sanitization script (`build-public-mirror.mjs`) is the single source of
  truth for what enters the public repo. It is testable and auditable in CI.
- The `productization-readiness.mjs check --public-release` gate can be run
  against the script output in isolation, before any push, giving a deterministic
  green/red signal.
- P-01 classification/excision is fully decoupled from the mirror build: the
  private tree can preserve internal audit history, while the mirror builder
  must never copy token-shaped strings to the public tree.

### Negative consequences / tradeoffs

- The public repository does not carry git blame or per-file history from the
  private development cycle. Contributions and feature commits are not visible
  to the public as individual commits. This is acceptable for an alpha release
  aimed at external operators, not contributors.
- Each public release requires running the mirror builder, verifying the output
  tree, and pushing — it is not a simple `git push origin main`. This is
  documented in the release checklist and is the price of deterministic
  sanitization.
- PUB-02 must remain green before the first public release. The 0.5.1-alpha.1
  validation run proves the local fresh-history remote rehearsal; the
  0.5.2-alpha.1 safety patch does not change the history strategy. Actual
  public remote push remains a separate HG-2/HG-2.5 action.

---

## Rollback

This ADR is a documentation decision, not a code change. Rollback means
reverting this file to a prior state via `git revert`. No infrastructure has
been touched.

If, after accepting this ADR, the Founder decides to use Alternative A or B
instead:

1. Revert this file.
2. Draft a replacement ADR naming the new chosen strategy.
3. The replacement must pass Stage 0.5 Contract Controller review and CAO PASS
   before PUB-02 is implemented under the new strategy.

No public push may happen under any strategy without Founder HG-2 sign-off
after PUB-01 classification/excision evidence exists.

---

## PUB-02 Handoff

This ADR authorizes PUB-02 to implement the public-mirror builder as follows:

**Script:** `scripts/release/build-public-mirror.mjs`

**Strip-list (minimum, must be enforced by the builder):**

| Category | Paths/Patterns |
|---|---|
| Internal reports | `reports/**` except `reports/.gitkeep` and up to 2 curated `reports/examples/*.example.md` files |
| Internal metrics ledgers | `metrics/agent-events.jsonl`, `metrics/agent-runs.jsonl`, `metrics/ai-cost-ledger.jsonl` |
| Live stream JSONL | `reports/**/*.stream.jsonl` |
| Token-containing kit file body | `kits/company-os-kit/.antigravity/logs/architect-memory.md` real content (replaced with `architect-memory.example.md` template) |
| ARES-named docs | `docs/operations/ares-product-domain-night-shift-queue.md` and any file not yet anonymized under P-08/P-09 |
| Named persona files | `kits/company-os-kit/.antigravity/personas/` real-person files if Doctrine A is chosen under PUB-06 |
| Private company registries | `registries/capabilities/company-os.json`, `registries/inference/company-os.json` (replaced with `example.json` variants) |

**Acceptance gates for PUB-02 output (run against `/tmp/companyos-public`):**

```bash
node scripts/release-gates/productization-readiness.mjs \
  --root /tmp/companyos-public check --public-release
# must return PASS with zero blockers and zero warnings

rg -rP "<SOURCE_COMPANY_TOKEN_PREFIX>-[A-Za-z0-9_-]{20,}" /tmp/companyos-public/
# must return no matches

rg -rP "/Users/[a-zA-Z]+" /tmp/companyos-public/docs/ /tmp/companyos-public/kits/
# must return no matches
```

**Public repo seeding procedure (HG-2, Founder approval required):**

1. Confirm PUB-01 classification/excision evidence exists.
2. Run `node scripts/release/build-public-mirror.mjs --out /tmp/companyos-public --verify`.
3. Confirm gate output is PASS.
4. `cd /tmp/companyos-public && git init && git add -A && git commit -m "Company.OS <version> public release"`.
5. `git remote add origin <public-repo-url> && git push -u origin main`.
6. Record the private-staging SHA and public-mirror SHA in
   `reports/releases/<version>-mirror-provenance.md`.
7. CAO reviews the public repo clone for residual blockers.
8. Founder releases under HG-2.

**PUB-02 must not push any public remote without Founder HG-2 approval.
PUB-02 is blocked behind PUB-01 token-shaped string excision.**

---

## Related work items

| ID | Title | Dependency |
|---|---|---|
| PUB-01 | Classify and excise token-shaped kit string | Precondition — must complete first |
| PUB-02 | Public-mirror sanitization script | Implements this ADR |
| PUB-03 | Productization-readiness public-release coverage extension | Extends gates for PUB-02 |
| PUB-04 | Kit Plane-first doctrine alignment | Required for public mirror to pass gate |
| PUB-05 | Kit identity scrub and antigravity overlay split | Required for public mirror to pass gate |
| PUB-06 | Persona doctrine decision | Determines named-persona strip-list entry |
| PUB-07 | Path portability sweep | Required for public mirror to pass gate |
| PUB-08 | Atlas/ARES doc relocation | Required for public mirror to pass gate |
| PUB-09 | Knowledge-folder provenance audit | Required before PUB-02 can pass |
| PUB-10 | README/CHANGELOG release-status alignment | Required before public push |

---

*This ADR covers strategy selection only. It does not prove live credential
status, rotate credentials, rewrite git history, create a public repository,
push any branch or tag, publish content, or close PUB-01. Those actions require
explicit Founder HG-2 approval after this ADR is accepted by the controller.*
