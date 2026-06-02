# Codex CEO CLI Boot Pack

Status: executable v0 boot-pack generator
Use for: making a headless `codex exec` run behave like the interactive
Company.OS CEO/Controller session by injecting the same canonical context

## Purpose

Codex CLI is not automatically the same agent as the interactive Codex desktop
CEO session. A fresh CLI run has a model, a cwd and local config, but it does
not automatically know the current Company.OS doctrine, Plane rules, runtime
state, GitNexus expectations, memory boundaries or recent release truth.

The boot-pack generator fixes that by creating a deterministic prompt and
manifest from canonical source files before the CLI run starts.

Executable:

```bash
node scripts/orchestration/codex-ceo-boot-pack.mjs \
  --objective "Review Plane controller queue and decide next safe action" \
  --print-command \
  --json
```

It writes local, gitignored artifacts under `runtime/codex-ceo/<run_id>/`:

- `prompt.md` — full CEO boot prompt with source file content
- `manifest.json` — source file hashes, auth-lane sentinel and missing-file
  status; no prompt body and no secret values

## Identity

The booted CLI identity is:

```text
codex-ceo-orchestrator
```

This is the Deputy CEO / controller lane. It is not the same as a future
`codex-clevel-worker/*` runtime lane.

Allowed default use:

- controller queue review
- release decision draft
- Plane gate synthesis
- CAO PASS/REJECT/PARK interpretation
- dispatch plan generation
- Founder decision card preparation

Forbidden default use:

- direct worker spawn
- direct Plane Done outside release doctrine
- merge, push, deploy or production write
- silent API billing fallback
- treating Codex/Gemini as live edit-capable workers before adapter gates

## Source Surface

The boot pack requires these source families:

- repo boot rules: `AGENTS.md`
- Layer-0.5 map: `docs/system-index.md`, `docs/page-index.md`
- release state: `VERSION`, `CHANGELOG.md`, `ROADMAP.md`
- Plane/control doctrine: Plane-first, role routing, global Plane auth bridge,
  contract controller, remediation router, dispatcher v0/v1
- runtime doctrine: headless worker boot, multi-inference runtime, inference
  router, Codex controller runtime
- review doctrine: CAO, worker contract, CEO release authority and fast-lane
  flight doctrine
- optional local user rules: `~/.codex/AGENTS.md` when present

If any required repo file is missing, the generator emits a prompt with
`BOOT PACK INCOMPLETE` and exits with code `2`.

## Auth Lanes

Default lane:

```text
subscription
```

This means the CLI should use the user's signed-in Codex/ChatGPT plan.

Optional lane:

```text
api
```

API is allowed only as an explicit cost lane. The boot pack records whether
`OPENAI_API_KEY` is present, but never writes the key value into prompt,
manifest, reports or Plane comments.

Rule:

```text
No silent fallback from subscription quota to API billing.
```

If subscription quota is exhausted, controller state should become
`BLOCKED_BUDGET` / `BLOCKED_QUOTA` unless a contract declares `MaxSpend`,
`CostCeiling`, `RuntimeAuth`, reporting and a HumanGate that explicitly allow
the API lane.

## Required First Response

The headless CEO must begin with:

```yaml
boot_context_proof:
  boot_pack_version: codex-ceo-boot-pack/v0
  source_file_count: <n>
  missing_required_files: none | <files>
  plane_access_path: native-connector | global-plane-auth-bridge | blocked
  gitnexus_status: up-to-date | stale | unavailable
  memory_status: boot-pack | honcho-read | unavailable
  auth_lane: subscription | api-explicit | blocked
  next_action: <one concrete action>
```

If it cannot prove Plane, GitNexus or required memory/context access, it must
say so and stop before irreversible controller decisions.

## Plane Access

The booted CLI must prefer native Plane connector tools when exposed. If no
Plane connector namespace exists, it uses the Global Plane Auth Bridge (app-token supports PLANE_APP_BOT_TOKEN, and alias PLANE_API_TOKEN):

```bash
node "${COMPANY_OS_ROOT}/scripts/plane/plane-app-token-rotation.mjs" \
  --mode ensure \
  --refresh-window 2h \
  --json
```

```bash
node "${COMPANY_OS_ROOT}/scripts/plane/plane-api-sanity.mjs" \
  --workspace companyos \
  --auth app-token \
  --json
```

Resolve `${COMPANY_OS_ROOT}` against `docs/operations/portable-path-placeholders.md`;
default is `~/Developer/Company.OS`.

Failed Plane bridge verification is `BLOCKED_AUTH`, not permission to fall
back to Linear.

## Verification

```bash
node --test scripts/orchestration/codex-ceo-boot-pack.test.mjs
node scripts/orchestration/codex-ceo-boot-pack.mjs \
  --objective "Smoke test boot pack" \
  --out-dir runtime/codex-ceo/smoke \
  --print-command \
  --json
```

The smoke command writes only to `runtime/`, which is gitignored.
