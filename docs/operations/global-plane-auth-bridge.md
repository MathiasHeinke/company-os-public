# Global Plane Auth Bridge

Status: active global fallback doctrine
Last updated: 2026-05-13
Use for: Codex, Claude Code, Gemini or scheduler sessions that must operate
against Plane when the native Plane App connector is not exposed in that
runtime.

## Decision

Plane remains the canonical execution ledger for Company.OS and cross-workspace
agent orchestration. A missing native Plane App connector in a fresh session is
not a reason to fall back to Linear or ask the founder to paste credentials.

Use this order in every active workspace:

1. Prefer a native Plane App / connector tool when the runtime exposes one.
2. If no Plane connector namespace is visible, explicitly report
   `plane.connector-unavailable` and use the Company.OS Plane Auth Bridge.
3. If the bridge cannot refresh or verify the app token, stop with
   `BLOCKED_AUTH`.
4. Direct personal API-key auth remains emergency/bootstrap fallback only.

## Bridge Commands

These commands are safe from any workspace because they use absolute paths and
the shared macOS Keychain service `Company.OS Plane App`.

```bash
node ${COMPANY_OS_ROOT}/scripts/plane/plane-app-token-rotation.mjs \
  --mode ensure \
  --refresh-window 2h \
  --json
```

```bash
node ${COMPANY_OS_ROOT}/scripts/plane/plane-api-sanity.mjs \
  --workspace companyos \
  --auth app-token \
  --json
```

The first command refreshes only when the bot token is missing, expired,
invalid or inside the refresh window. It never prints the access token. The
second command proves the active app identity can read Plane and list projects.

## Codex Local Plugin

When Codex does not expose a native Plane connector, new Codex sessions should
load the home-local plugin:

```text
plugin: company-os-plane@<operator-local>
source: ${PLANE_PLUGIN_ROOT}
cache:  ${CODEX_HOME}/plugins/cache/<operator-local>/company-os-plane/0.1.0
config: ${CODEX_HOME}/config.toml
```

Resolve `${CODEX_HOME}` (default `~/.codex`) and `${PLANE_PLUGIN_ROOT}` (the
operator's local clone of the `company-os-plane` plugin) per
`docs/operations/portable-path-placeholders.md`. The `<operator-local>` token is
the per-operator plugin marketplace slug; treat it as a substitution, not a
literal.

The plugin exposes the MCP server `company_os_plane` and tools for auth status,
safe keychain diagnostics, consent URL generation, local OAuth repair, token
rotation, Plane sanity checks, project creation/listing, work-item
creation/listing, state updates and comments. It uses the same env/keychain
credential path as the bridge commands above and stores no raw Plane secrets in
the plugin.

Codex also has a direct MCP fallback entry in `${CODEX_HOME}/config.toml`:

```toml
[mcp_servers.company_os_plane]
command = "node"
args = ["${PLANE_PLUGIN_ROOT}/scripts/mcp-server.mjs"]
```

This direct entry is intentionally redundant with the plugin manifest so that a
fresh Codex session can expose Plane tools even if the local plugin marketplace
cache is stale.

Fresh sessions should still follow the same order:

1. Discover native Plane connector tools first.
2. If absent, report `plane.connector-unavailable`.
3. Use `company_os_plane.plane_auth_ensure` or the bridge command above.
4. If token rotation or sanity fails, stop with `BLOCKED_AUTH`.

## Known Project Anchors

These IDs are not credentials. They are stable routing anchors for worker
contracts and scheduler prompts.

| Project | Identifier | Project id |
|---|---|---|
| CompanyOS | COMPA | `3537d502-b5a7-4214-9f7d-8f571fb1cd1e` |
| Atlas Bio.OS | [SOURCE_COMPANY] | `268df2ed-a071-4cc8-a394-595e4b7353c2` |
| Atlas Growth Engine | GROW | `2fd81365-a180-483e-b5ed-f9212ebca876` |
| [SOURCE_COMPANY] | FYN | `f96e33d6-491d-425d-bae9-09a94da9c73c` |
| Command Center | CMD | `a0289488-bae2-4403-8628-8ce842a0becc` |
| [SOURCE_WORKSPACE] Founder Office | MHDEV | `488fac05-3714-4cf5-bced-3a6a032291db` |

## Rules

- Do not ask the founder to paste `PLANE_APP_BOT_TOKEN`, `PLANE_API_KEY`,
  client secret or installation token into a prompt.
- Do not write Plane state or `Done` from a worker unless the relevant
  HumanGate/Controller doctrine explicitly allows it.
- Do not silently use Linear when Plane is unavailable. Stop with
  `BLOCKED_AUTH` or `plane.connector-unavailable` plus the bridge command that
  failed.
- Worker contracts may reference the project anchors above, but must still
  carry `role:*`, `agent`, `mode`, `workspace`, `source_of_truth`,
  `acceptance_criteria`, `gates`, `human_gate`, `reporting` and
  `blocked_actions`.
- Runtime boot packs should include this file whenever a session is expected to
  read or write Plane from outside the Company.OS root.

## Contract Materialization Fallback

When the Codex Desktop runtime does not expose the `company_os_plane` MCP tools,
the local fallback path is:

1. Refresh/check the Plane App token with `plane-app-token-rotation.mjs`.
2. Verify project access with `plane-api-sanity.mjs`.
3. Generate or refresh the role label map with API-key auth, because the App
   token can read work item embedded labels but may receive HTTP 403 on the
   project labels endpoint.
4. Materialize parent/child worker contracts with
   `scripts/plane/plane-contract-materializer.mjs`.

The materializer supports role labels, parent links, stable `external_id`s and
idempotent `--update-existing` writes. Use it instead of plain
`plane-create-work-item.mjs` for goal-ready parent/child contract sets.

## Runtime Secret Alias (interop)

Company.OS resolves `PLANE_API_TOKEN` as an alias for `PLANE_APP_BOT_TOKEN`
in app-token auth mode. This is for external/edge runtimes like Claude Code
helpers that only expose a legacy token field.

For remote runners, set one of:

```text
PLANE_APP_BOT_TOKEN=<bot_token>            # preferred
PLANE_API_TOKEN=<bot_token>                # accepted alias

PLANE_APP_BOT_TOKEN_EXPIRES_AT=<ISO8601>   # preferred
PLANE_API_TOKEN_EXPIRES_AT=<ISO8601>       # accepted alias
PLANE_BASE_URL=https://api.plane.so         # optional
```

## Current Verification

Checked on 2026-05-13:

- Codex tool discovery exposes no native Plane namespace:
  `plane.connector-unavailable`.
- `company-os-plane@mathias-local` is installed, enabled and smoke-tested at
  MCP protocol level; `mcp_servers.company_os_plane` is also configured as a
  direct fallback in `~/.codex/config.toml`.
- Plane App identity is `[SOURCE_COMPANY] Multi-Agent`.
- `plane-app-token-rotation --mode ensure`: PASS, action `kept`.
- `plane-api-sanity --workspace companyos --auth app-token`: PASS, reads all
  six Company.OS projects.
- `plane-ledger-preflight --workspace companyos --auth app-token --samples`:
  PASS, totals: 6 projects, 561 work items, 37 modules, 9 cycles, 13 pages and
  30 states.
- Supabase `AresAI` Plane secrets were refreshed for bot-token,
  bot-token expiry, installation id, scopes, auth mode, base URL, workspace
  slug and the legacy `PLANE_API_TOKEN` alias.

Local repair helper:

```bash
node ${COMPANY_OS_ROOT}/scripts/plane/plane-app-oauth-local-repair.mjs \
  --open \
  --json
```

If the browser approval lands on a Safari/Chrome "cannot connect to localhost"
page after the helper already timed out, rerun with the full callback URL from
the address bar:

```bash
node ${COMPANY_OS_ROOT}/scripts/plane/plane-app-oauth-local-repair.mjs \
  --callback-url '<localhost callback URL>' \
  --json
```

This starts a temporary listener for the stored localhost redirect URI, opens
the Plane consent URL, captures `app_installation_id` and runs the bot-token
exchange. Keychain is updated only after a successful exchange. The helper
defaults to the current recommended scope set, including `projects.pages:write`.

## Supabase Secret Injection (when this runtime cannot read local Keychain)

If an execution lane only reads environment variables (z. B. Claude Code helper
container / edge worker), set the secrets in Supabase:

```bash
supabase secrets set \
  PLANE_APP_BOT_TOKEN='<token>' \
  PLANE_APP_BOT_TOKEN_EXPIRES_AT='<ISO8601-UTC>' \
  PLANE_BASE_URL='https://api.plane.so' \
  --project-ref <your-supabase-project-ref>

# optional legacy alias for external shells expecting PLANE_API_TOKEN
supabase secrets set \
  PLANE_API_TOKEN='<token>' \
  PLANE_API_TOKEN_EXPIRES_AT='<ISO8601-UTC>' \
  --project-ref <your-supabase-project-ref>
```

For Plane access from these runtimes, keep `PLANE_AUTH_MODE=app-token` (default)
and call the bridge preflight after deployment:

```bash
node ${COMPANY_OS_ROOT}/scripts/plane/plane-api-sanity.mjs \
  --workspace companyos \
  --auth app-token \
  --json
```
