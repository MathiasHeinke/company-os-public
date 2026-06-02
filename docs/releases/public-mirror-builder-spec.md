# Public Mirror Builder Spec — PUB-02A

Status: accepted
Work item: [WORK_ITEM_ID] (PUB-02A)
Date: 2026-05-14
Source of truth for: PUB-02B (builder), PUB-02C (verifier), PUB-02D (gate reconciliation)
Preconditions: PUB-01 excision evidence exists (`reports/releases/PUB-01/token-shaped-string-excision.md`)
Supersedes: none
Superseded by: none

---

## 1. Purpose

This spec defines the mirror output contract that `scripts/release/build-public-mirror.mjs`
must honour. It names the include list, strip list, replacement fixtures, output invariants,
CLI contracts, and exit code definitions that PUB-02B (builder) and PUB-02C (verifier) must
implement.

The public mirror is a **fresh-history** repository seeded from a deterministic sanitization
script. The private staging tree is never modified. Each public release is a new commit
containing only the sanitized output of this script. See `docs/releases/public-history-strategy.md`
for the strategy decision.

---

## 2. Include List

These paths are copied verbatim into the public mirror, subject to the strip list taking
precedence on exact matches.

| Path / Pattern | Notes |
|---|---|
| `docs/**` | All docs after PUB-07 (path portability) and PUB-08 (Atlas/ARES relocation). Strip-list entries override exact paths. |
| `scripts/orchestration/**` | All orchestration scripts. |
| `scripts/release-gates/**` | All release gate scripts. |
| `scripts/plane/**` | All Plane scripts **except** `scripts/plane/enrich-batch-5-mirror-plans.mjs`. |
| `scripts/capabilities/**` | Capability registry scripts. |
| `scripts/sandbox-pr/**` | Sandbox PR automation. |
| `scripts/agent-events/**` | Agent event reducers. |
| `scripts/goal/**` | Goal command scripts. |
| `scripts/git-hygiene/**` | Git hygiene scripts. |
| `scripts/page-index/**` | Page index generator. |
| `scripts/dreams/**` | Daily improvement dream scripts. |
| `scripts/artifact-truth/**` | Artifact truth verifier. |
| `scripts/model-router/**` | Cost router scripts. |
| `scripts/runtime/**` | Hard cron wrapper and warm preflight. |
| `scripts/install/**` | Bootstrap, self-serve smoke and public-RC install wrapper. |
| `scripts/release/**` | Public mirror, clean-clone and fresh-history remote verifiers. |
| `scripts/operator-shell/**` | Command EVE / AionUI / Hermes local start helpers. |
| `scripts/update/**` | `/update_eve` kit update planner and dry-run/apply helper. |
| `scripts/onboarding/**` | First-company packet and EVE boot packet materializer. |
| `kits/company-os-kit/templates/**` | Kit templates after PUB-05 (founder identity scrub). |
| `kits/company-os-kit/.agents/**` | Kit agent rules and workflows. |
| `kits/company-os-kit/.company-os/**` | Kit Company.OS operations layer. |
| `kits/company-os-kit/.antigravity/*.md` | Generic overlays: `agentic-plan-template.md`, `agentic-router.md`, `copy-rules.md`, `system-prompt.md` (after PUB-05 template strip), `tech-stack-context.md` (after PUB-05 template strip), `workspace-strategy.md`. |
| `kits/company-os-kit/.antigravity/personas/**` | Role-based variants only if PUB-06 doctrine A is chosen; skip named-person files. |
| `kits/company-os-kit/README.md` | |
| `registries/capabilities/example.json` | Template version only (see §4). |
| `registries/inference/example.json` | Template version only (see §4). |
| `registries/inference/eve-hermes-brain.json` | Public EVE/Hermes operator-brain routing registry; no private workspace IDs. |
| `registries/domain-packs/**` | Public onboarding/domain-pack registry required by first install. |
| `registries/plane-templates/**` | Public Plane template registry required by setup. |
| `registries/quality/**` | Public post-worker quality routing registry. |
| `LICENSE` | MIT license. |
| `README.md` | After PUB-10 release-status alignment. |
| `CHANGELOG.md` | After PUB-10. |
| `ROADMAP.md` | |
| `VERSION` | |
| `AGENTS.md` | After P-18 provenance line decision. |
| `metrics/agent-events.example.jsonl` | Already exists; included as-is. |
| `metrics/ai-cost-ledger.example.jsonl` | Replacement fixture (see §4). |
| `reports/.gitkeep` | Preserves reports/ directory structure. |
| `reports/examples/*.example.md` | Up to 3 curated example files (see §4). |
| `reports/examples/*.example.stream.jsonl` | One minimal runtime pilot example (see §4). |

Files not listed here and not covered by a strip list rule are excluded by default. The builder
must reject unexpected files rather than silently include them.

---

## 3. Strip List

These paths and patterns are unconditionally removed from the public mirror output.
The strip list takes precedence over the include list on exact matches.

| Category | Pattern | Replacement |
|---|---|---|
| Internal reports | `reports/**` | Keep only `reports/.gitkeep` and `reports/examples/*.example.*` |
| Internal metrics ledgers | `metrics/agent-events.jsonl` | None (example variant included instead) |
| Internal metrics ledgers | `metrics/agent-runs.jsonl` | None |
| Internal metrics ledgers | `metrics/ai-cost-ledger.jsonl` | None (example variant included instead) |
| Live worker stream JSONL | `reports/**/*.stream.jsonl` | One minimal example in `reports/examples/` (see §4) |
| Private kit log body | `kits/company-os-kit/.antigravity/logs/architect-memory.md` | `kits/company-os-kit/.antigravity/logs/architect-memory.example.md` template |
| ARES-named operations doc | `docs/operations/ares-product-domain-night-shift-queue.md` | None (moved to private overlay by PUB-08) |
| Internal migration script | `scripts/plane/enrich-batch-5-mirror-plans.mjs` | None |
| Private company registries | `registries/capabilities/company-os.json` | `registries/capabilities/example.json` template |
| Private company registries | `registries/inference/company-os.json` | `registries/inference/example.json` template |
| Named-person personas (if PUB-06 doctrine A) | `kits/company-os-kit/.antigravity/personas/andrej-karpathy.md` | None |
| Named-person personas (if PUB-06 doctrine A) | `kits/company-os-kit/.antigravity/personas/daniel-kahneman.md` | None |
| Named-person personas (if PUB-06 doctrine A) | `kits/company-os-kit/.antigravity/personas/elon-musk.md` | None |
| Named-person personas (if PUB-06 doctrine A) | `kits/company-os-kit/.antigravity/personas/steve-jobs.md` | None |
| Named-person personas (if PUB-06 doctrine A) | `kits/company-os-kit/.antigravity/personas/john-carmack.md` | None |
| Named-person personas (if PUB-06 doctrine A) | `kits/company-os-kit/.antigravity/personas/don-draper.md` | None |
| Named-person personas (if PUB-06 doctrine A) | `kits/company-os-kit/.antigravity/personas/sherlock-holmes.md` | None |
| Named-person personas (if PUB-06 doctrine A) | `kits/company-os-kit/.antigravity/personas/mr-robot.md` | None |
| Named-person personas (if PUB-06 doctrine A) | `kits/company-os-kit/.antigravity/personas/elara-voss.md` | None |
| Named-person personas (if PUB-06 doctrine A) | `kits/company-os-kit/.antigravity/personas/valeria-castellano.md` | None |
| Named-person personas (if PUB-06 doctrine A) | `kits/company-os-kit/.antigravity/personas/jonah-jansen.md` | None |
| Named-person personas (if PUB-06 doctrine A) | `kits/company-os-kit/.antigravity/personas/kai-renner.md` | None |
| Named-person personas (if PUB-06 doctrine A) | `kits/company-os-kit/.antigravity/personas/cypher-sre.md` | None |
| Named-person personas (if PUB-06 doctrine A) | `kits/company-os-kit/.antigravity/personas/the-refactorer.md` | None |
| Named-person personas (if PUB-06 doctrine A) | `kits/company-os-kit/.antigravity/personas/the-nexus.md` | None |
| Knowledge files (do-not-publish) | Per `kits/company-os-kit/.antigravity/knowledge/SOURCES.md` PUB-09 verdict | None |
| Atlas/ARES domain overlay docs | `docs/templates/atlas-worker-templates.md` | Generic `docs/templates/domain-overlay-template.md` (PUB-08) |
| Atlas/ARES domain overlay docs | `docs/orchestration/atlas-claude-c-level-boot-contract.md` | Generic `docs/orchestration/domain-claude-c-level-boot-contract-template.md` (PUB-08) |
| Private .env files | `.env`, `**/.env`, `**/.env.local`, `**/.env.*.local` | None |
| git / tooling internals | `.git/**`, `node_modules/**`, `.DS_Store` | None |

---

## 4. Replacement Fixtures

These fixture files must exist in the private staging tree before the builder runs. The builder
copies them into the output tree at their declared target paths.

| Fixture source (private staging) | Target in public mirror | Description |
|---|---|---|
| `kits/company-os-kit/.antigravity/logs/architect-memory.example.md` | same path | Empty/templated frontmatter. No private tech stack, no token values. Layer-1/2/3 sections are empty or use `[YOUR PROJECT]` placeholders. |
| `metrics/agent-events.example.jsonl` | same path | Already exists. Minimal scrubbed event set (≤50 lines). |
| `metrics/ai-cost-ledger.example.jsonl` | same path | New fixture. Three sanitized cost-ledger rows with `[project]` / `[model]` placeholders and realistic but not real cost values. |
| `reports/.gitkeep` | same path | Empty file preserving directory entry. |
| `reports/examples/worker-issue-report.example.md` | same path | Shows worker.reported shape with all required fields; no real Plane UUIDs, paths, or identifiers. |
| `reports/examples/cao-pass.example.md` | same path | Shows CAO PASS verdict shape; no real work item IDs. |
| `reports/examples/controller-decision.example.md` | same path | Shows controller.decision shape; no real identifiers. |
| `reports/examples/runtime-pilot.example.stream.jsonl` | same path | ≤200 lines. Heartbeat and completion events only; all paths use `[COMPANY_OS_ROOT]` placeholder. |
| `registries/capabilities/example.json` | same path | Capability registry template. Blocked actions list kept for public value; all `company-os`-specific IDs replaced with `[client]`. |
| `registries/inference/example.json` | same path | Inference registry template. Task classes and model routing patterns retained; all workspace slugs and Plane UUIDs replaced. |
| `registries/inference/eve-hermes-brain.json` | same path | Public EVE/Hermes B0-B4 brain routing registry. Model aliases and blocked actions are generic; no private workspace IDs. |
| `registries/domain-packs/company-os.json` | same path | Public first-run domain pack registry. |
| `registries/plane-templates/company-os.json` | same path | Public setup template registry for Plane workspaces/items/pages. |
| `registries/quality/post-worker-quality-loop.json` | same path | Public lower-worker quality/audit/hotfix routing registry. |

If any fixture file is missing from the private staging tree, the builder must exit with
`RUNTIME_ERROR` and name the missing file — it must not silently omit the fixture.

---

## 5. Output Invariants

The following invariants must hold for every output tree produced by the builder,
regardless of which private source SHA is used as input.

### 5.1 Secrets and credentials

| Invariant | Check command |
|---|---|
| No source-company token-shaped strings | `rg --hidden -nP '<SOURCE_COMPANY_TOKEN_PREFIX>-[A-Za-z0-9_-]{20,}' <OUT_ROOT>` must return no matches |
| No `sk-`, `ghp_`, `xoxb-` prefixed strings | `rg --hidden -nP '(sk-[A-Za-z0-9]{20,}\|ghp_[A-Za-z0-9]{36,}\|xoxb-[A-Za-z0-9-]{24,})' <OUT_ROOT>` must return no matches |
| No real `.env` files | `find <OUT_ROOT> -name '.env'` must return no matches |

### 5.2 Private identifiers

| Invariant | Check command |
|---|---|
| No private home paths in docs or kit | `rg --hidden -nP '/Users/[a-zA-Z][-a-zA-Z0-9]+' <OUT_ROOT>/docs <OUT_ROOT>/kits` must return no matches |
| No source-company domain strings in docs or kit | `rg --hidden -nP '<SOURCE_COMPANY_DOMAIN_PATTERN>' <OUT_ROOT>/docs <OUT_ROOT>/kits` must return no matches |
| No source-company prefix identifiers in tracked content | `rg --hidden -nP '<SOURCE_COMPANY_PREFIX_PATTERN>' <OUT_ROOT>/docs <OUT_ROOT>/kits <OUT_ROOT>/scripts` must return no matches |
| No private Plane workspace slug `companyos` in non-example scripts | `rg --hidden -nP '"companyos"' <OUT_ROOT>/scripts` must return no matches (example files are excluded from scripts/) |
| No ATLAS-*/COMPA-*/MAT-* work item IDs | `rg --hidden -nP '\b(ATLAS|COMPA|MAT)-[0-9]+' <OUT_ROOT>/docs <OUT_ROOT>/kits` must return no matches |
| No founder email | `rg --hidden -nP 'marketing@mathiasheinke\.de' <OUT_ROOT>` must return no matches |

### 5.3 Stripped paths absent

| Invariant | Check |
|---|---|
| `reports/` contains only `.gitkeep` and `examples/*` | `find <OUT_ROOT>/reports -type f -not -name '.gitkeep' -not -path '*/examples/*'` must return no matches |
| `metrics/*.jsonl` contains only `*.example.jsonl` | `find <OUT_ROOT>/metrics -name '*.jsonl' -not -name '*.example.jsonl'` must return no matches |
| `registries/capabilities/company-os.json` absent | `test ! -f <OUT_ROOT>/registries/capabilities/company-os.json` |
| `registries/inference/company-os.json` absent | `test ! -f <OUT_ROOT>/registries/inference/company-os.json` |
| `scripts/plane/enrich-batch-5-mirror-plans.mjs` absent | `test ! -f <OUT_ROOT>/scripts/plane/enrich-batch-5-mirror-plans.mjs` |
| `docs/operations/ares-product-domain-night-shift-queue.md` absent | `test ! -f <OUT_ROOT>/docs/operations/ares-product-domain-night-shift-queue.md` |

### 5.4 Determinism

| Invariant |
|---|
| Running the builder twice on the same private source SHA and the same strip-list version produces a file set with the same paths and content SHA-256 values for every non-generated file. |
| The provenance manifest (`mirror-provenance.json`) records: `source_sha`, `strip_list_version`, `generated_at` (ISO-8601 UTC), `output_file_count`, `blocker_summary[]`. |
| `generated_at` is the only field permitted to differ between two runs on the same source SHA. |

### 5.5 Public-release gate

| Invariant |
|---|
| `node scripts/release-gates/productization-readiness.mjs --root <OUT_ROOT> check --public-release` exits 0 when all PUB-03..PUB-10 source-tree blocker-class items are resolved. Until then, it may report known deferred blocker classes but must not report any blocker that the builder was supposed to strip. |

---

## 6. Builder CLI Contract

**Script:** `scripts/release/build-public-mirror.mjs`

| Flag | Type | Description |
|---|---|---|
| `--out <path>` | required | Output directory for the public mirror tree. Must not exist or must be empty. |
| `--dry-run` | flag | Print the list of included and stripped files without copying. Exit 0. |
| `--verify` | flag | After building, run all §5 invariant checks against `--out`. Exit with the appropriate exit code. |
| `--json` | flag | Print structured JSON result to stdout. |
| `--strip-list-version` | string | Label for the strip list version used, recorded in the provenance manifest. Default: `v1`. |
| `--source-sha` | string | Override the private source SHA recorded in the provenance manifest. Default: `git rev-parse HEAD`. |

**Standard output (non-JSON mode):**

```
BUILD [PASS|BLOCKED|RUNTIME_ERROR|PRIVATE_CONTENT_DETECTED]: <count> files copied, <count> files stripped
VERIFY [PASS|BLOCKED|RUNTIME_ERROR|PRIVATE_CONTENT_DETECTED]: <summary>
```

**Standard output (JSON mode, `--verify`):**

```json
{
  "status": "PASS | BLOCKED | RUNTIME_ERROR | PRIVATE_CONTENT_DETECTED",
  "exit_code": 0,
  "source_sha": "<sha>",
  "strip_list_version": "v1",
  "generated_at": "<iso8601>",
  "output_file_count": 0,
  "copied": [],
  "stripped": [],
  "missing_fixtures": [],
  "invariant_failures": [],
  "blocker_summary": []
}
```

---

## 7. Builder Exit Codes

| Code | Name | Meaning |
|---|---|---|
| `0` | `PASS` | Mirror built and all declared `--verify` invariants pass. |
| `1` | `BLOCKED` | Mirror built but `--verify` found at least one blocker from the public-release gate. Structured `blocker_summary` lists each failing check ID and which PUB item must clear it. |
| `2` | `RUNTIME_ERROR` | Script error: source tree not found, output directory not writable, missing fixture file, or unexpected I/O failure. `reason` field names the specific error. |
| `3` | `PRIVATE_CONTENT_DETECTED` | Post-build scan found a token-shaped string, private path, or private domain literal in the output tree. Structured `invariant_failures` lists each finding path and pattern. The output directory is considered unsafe and must be deleted before any push. |

Codes `1` and `3` differ in severity: `BLOCKED` means "deferred work items remain"; `PRIVATE_CONTENT_DETECTED` means "a strip rule is missing or broken" and is a hard stop.

---

## 8. Verifier CLI Contract

**Script:** `scripts/release/verify-clean-clone.mjs`

The verifier creates a local temporary git repository from the builder output, initializes it,
and runs structured smoke checks. It does not push to any remote.

| Flag | Type | Description |
|---|---|---|
| `--root <path>` | required | Path to the already-built public mirror tree (output of `build-public-mirror.mjs`). |
| `--json` | flag | Print structured JSON result to stdout. |
| `--temp-dir <path>` | optional | Directory for the temp git clone. Default: system temp. Deleted on success. |
| `--keep-temp` | flag | Do not delete the temp clone on completion. |

**Checks performed (in order):**

1. `README.md` exists and contains a version string that matches `VERSION`.
2. `CHANGELOG.md` contains a section for the current `VERSION`.
3. `scripts/release-gates/productization-readiness.mjs check --public-release` exits 0 or reports only known-deferred blocker classes.
4. Token-shaped string scan: no `<SOURCE_COMPANY_TOKEN_PREFIX>-[A-Za-z0-9_-]{20,}` match anywhere.
5. Hard-coded private path scan: no `/Users/[a-zA-Z]` match in `docs/`, `kits/`.
6. No `reports/*.jsonl` file outside `reports/examples/`.
7. No `metrics/agent-*.jsonl` file that is not `*.example.jsonl`.
8. `git init && git add -A && git commit -m "verify"` exits 0 (tree is a valid git repository).

**Standard output (JSON mode):**

```json
{
  "status": "PASS | BLOCKED_PUBLIC_GATE | BLOCKED_BOOTSTRAP | BLOCKED_SECRET_SCAN | BLOCKED_PRIVATE_PATH | RUNTIME_ERROR",
  "exit_code": 0,
  "root": "<path>",
  "temp_clone": "<path>",
  "checks": [
    { "id": "readme.version", "status": "pass | fail", "detail": "" }
  ]
}
```

---

## 9. Verifier Exit Codes

| Code | Name | Meaning |
|---|---|---|
| `0` | `PASS` | All verifier checks pass. |
| `1` | `BLOCKED_PUBLIC_GATE` | `productization-readiness check --public-release` returned blockers that the mirror builder was supposed to strip. Check builder strip-list version. |
| `2` | `BLOCKED_BOOTSTRAP` | `git init` or `git add -A` failed in the temp clone. Output tree has a structural problem (invalid files, encoding issue). |
| `3` | `BLOCKED_SECRET_SCAN` | Token-shaped string detected in the temp clone. This is a hard blocker equivalent to builder exit code `3`. |
| `4` | `BLOCKED_PRIVATE_PATH` | Hard-coded private path detected in docs or kit content of the temp clone. |
| `5` | `RUNTIME_ERROR` | Verifier script error: `--root` not found, temp dir not writable, or unexpected I/O failure. |

Codes `3` and `4` must block any release action unconditionally.
Codes `1` and `2` require investigation of either the strip list or the source tree.

---

## 10. Blocker Map

### 10.1 Blockers PUB-02 (builder + verifier) CAN clear by stripping

These blocker IDs from `productization-readiness check --public-release` are resolved by the
builder removing the relevant paths from the output tree. No source-tree changes are required.

| Check ID | Cleared by | How |
|---|---|---|
| `sanitize.metrics-ledgers` | PUB-02B builder | Strip `metrics/*.jsonl` (except `*.example.jsonl`); copy example variants. |
| `sanitize.reports` | PUB-02B builder | Strip `reports/**` except `.gitkeep` and `reports/examples/*.example.*`. |

After PUB-02B ships, the public-release gate run against the mirror output must not report
these two check IDs as blockers.

### 10.2 Blockers deferred to PUB-03..PUB-10 (source tree must change first)

The builder cannot strip these without also removing content that belongs in the public mirror.
Each item requires a source-tree change in the corresponding PUB task before the blocker class
can be cleared on the mirror output.

| Check ID | Deferred to | What must change |
|---|---|---|
| `docs.hard-coded-developer-paths` (123 occurrences) | **PUB-07** | Replace private home-path literals in `docs/operations/**` and `docs/orchestration/**` with `$COMPANY_OS_ROOT`, `$CLAUDE_BIN`, `$GEMINI_BIN`. The builder can strip the worst offenders by exclusion, but the remaining docs must be sanitized at source. |
| `kit.founder-identity-leak` (1 occurrence: `kits/company-os-kit/templates/AGENTS.md:8`) | **PUB-05** | Replace founder name literal with `[Founder/CEO name]` placeholder. |
| `kit.private-domain-leak` (44 occurrences in `kits/`) | **PUB-05** + **PUB-08** | Remove source-company domain references from kit logs, tech-stack-context, and system-prompt; move source-specific overlays to private workspace. |
| `install.prerequisite-drift` (`scripts/install/bootstrap.mjs`, `.env.example` missing) | **PUB-10** + separate install work | Add top-level installer and `.env.example` as declared install prerequisites. |
| `kit.private-domain-leak` from `docs/templates/atlas-worker-templates.md` | **PUB-08** | Move Atlas-named overlay doc to private workspace or replace with generic `[CLIENT]` template. |
| `docs.hard-coded-developer-paths` from `docs/orchestration/atlas-claude-c-level-boot-contract.md` | **PUB-08** | Same as above. |
| `kit.token-shaped-string` (currently PASS) | N/A — maintain PASS | PUB-01 already cleared this. Builder must verify it stays PASS post-strip. |

### 10.3 Blockers that become new gate checks after PUB-03

PUB-03 extends `productization-readiness-core.mjs` with new check IDs. The builder and
verifier must pass these additional checks against the public mirror output:

| Future check ID | Added by | Guards |
|---|---|---|
| `kit.legacy-ledger-template` | PUB-03 | Kit template no longer teaches Linear-as-canonical |
| `kit.legacy-ledger-registry` | PUB-03 | Workspace registry defaults to Plane |
| (already PASS in private tree — see current gate output) | — | — |

---

## 11. Acceptance Gates for This Spec

The following gates must pass in the private staging workspace before PUB-02A is considered
complete:

```bash
# Gate 1: private tree still passes default productization readiness
node scripts/release-gates/productization-readiness.mjs check
# Expected: PASS, 0 blockers, 6 warnings (sanitize.metrics-ledgers, sanitize.reports,
# docs.hard-coded-developer-paths, kit.founder-identity-leak, kit.private-domain-leak,
# install.prerequisite-drift)

# Gate 2: no trailing whitespace or line-ending issues
git diff --check
# Expected: no output (clean)
```

These gates apply to the spec document itself — PUB-02B and PUB-02C will add the builder
and verifier gate runs.

---

## 12. Known Limitations and Out-of-Scope

- This spec does not implement `build-public-mirror.mjs` — that is PUB-02B.
- This spec does not implement `verify-clean-clone.mjs` — that is PUB-02C.
- The spec does not cover public repo creation, public push, or VERSION bump. Those require
  Founder HG-2 sign-off and are explicitly blocked for PUB-02A..E.
- The spec does not resolve the PUB-06 persona doctrine decision. The strip list has a
  conditional entry for named-person personas pending that decision.
- The spec does not resolve PUB-09 knowledge-folder provenance. Until `SOURCES.md` exists,
  the knowledge folder is treated as do-not-publish by the builder.
- `docs.hard-coded-developer-paths` cannot be resolved by the builder alone because the
  affected docs are substantive content, not stripped artifacts. They must be sanitized
  at source by PUB-07 before the public mirror can be released.

---

*Spec ends. No files were deployed, no public push was made, no VERSION was bumped.*
