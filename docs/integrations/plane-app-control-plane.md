# Plane App Control Plane

Status: active control-plane identity
Use for: Company.OS Plane OAuth/App access for ledger reads, writes,
controller comments and worker orchestration
Last updated: 2026-05-13

## Purpose

Company.OS does not use a personal Plane API key as its normal execution
identity.

The normal runtime and migration identity is the Plane OAuth App with
bot-token flow, scoped permissions, app installation identity and hardened
webhooks. A direct API key is emergency/bootstrap-only.

```text
0.3.0-alpha = Plane ledger capability proven
0.3.1-alpha = Plane App control-plane adapter installed and verified
0.4.x       = scheduler/controller hardens app-token-only runtime lanes
```

## Decision

Use the Plane App path by default. Do not delete the API-key fallback yet, but
do not route ordinary runtime or migration writes through it.

This is not "API versus App". A Plane App still calls Plane's API. The
difference is authentication, installation model, permissions and event
surface:

| Dimension | Direct API key | Plane App |
|---|---|---|
| Identity | personal/member token | app/bot installation |
| Installable for clients | poor | good |
| Permission model | broad and easy to leak | scoped OAuth permissions |
| Token rotation | manual | bot-token refresh by installation id |
| Webhooks | possible but ad hoc | first-class app surface |
| Marketplace/client rollout | no | yes |
| Best use | emergency/bootstrap fallback | production control plane |

## Required Plane App Shape

App name:

```text
[SOURCE_COMPANY] Multi-Agent
```

Earlier docs and scripts may still refer to `Company.OS Control Plane`; treat
that as the former/control-plane role name. The verified current Plane bot
identity is `[SOURCE_COMPANY] Multi-Agent`.

Recommended initial mode:

```text
Bot Token Flow / Client Credentials
```

Reason: Company.OS workers and controllers act as the installed company
operating layer, not as the founder personally.

User Token Flow remains optional for future user-specific actions that must be
attributed to a human.

## URLs

Plane App registration requires public HTTPS URLs. For local development, use a
temporary tunnel only for the setup/callback/webhook smoke test.

```text
Setup URL:   https://<company-os-runtime>/api/plane/setup
Redirect URI: https://<company-os-runtime>/api/plane/oauth/callback
Webhook URL: https://<company-os-runtime>/api/plane/webhook
```

Do not enable broad production webhooks until the receiver is hardened.

## Initial Scopes

Request the smallest scopes that support controller read/write pilot work:

```text
profile:read
projects:read
projects.states:read
projects.modules:read
projects.cycles:read
projects.pages:read
projects.pages:write
projects.work_items:read
projects.work_items:write
projects.work_items.comments:read
projects.work_items.comments:write
```

Do not request workspace member write, customer write, initiatives write,
assets write or agent-run write in the first app pilot.

Existing installations that were approved before `projects.pages:write` was
added must be re-authorized or re-installed before a bot token can request that
scope. Until then, keep the stored `PLANE_APP_SCOPES` aligned with the actually
granted scope set; otherwise bot-token refresh fails with `invalid_scope`.

## Local Secret Standard

Store app credentials and installation data in macOS Keychain:

```text
service: Company.OS Plane App
accounts:
  PLANE_APP_CLIENT_ID
  PLANE_APP_CLIENT_SECRET
  PLANE_APP_REDIRECT_URI
  PLANE_APP_INSTALLATION_ID
  PLANE_APP_SCOPES
  PLANE_APP_BOT_TOKEN
  PLANE_APP_BOT_TOKEN_EXPIRES_AT
```

Never commit client secret, bot token, refresh token, webhook secret or app
installation token.

The shared Plane auth resolver treats an expired `PLANE_APP_BOT_TOKEN_EXPIRES_AT`
as a hard credential failure. Refresh the bot token through
`plane-app-token-rotation.mjs --mode ensure` before unattended controller runs.
The rotation wrapper refreshes only when the token is missing, expired, invalid
or inside the configured refresh window. It never prints the access token.

Legacy/interop note:
`PLANE_API_TOKEN` is accepted as an alias for `PLANE_APP_BOT_TOKEN` in
Company.OS runtime scripts for compatibility with external toolchains. The
preferred source remains `PLANE_APP_BOT_TOKEN` (or Keychain) for new setups.

## Helper CLI

Global fallback doctrine for sessions where the native Plane App connector is
not exposed:

```text
docs/operations/global-plane-auth-bridge.md
```

In those sessions, do not ask the founder to paste Plane tokens. Run the
bridge preflight/rotation commands from that document and stop with
`BLOCKED_AUTH` if they fail.

Codex-specific local propagation is handled by the home-local plugin:

```text
company-os-plane@mathias-local
${CODEX_PLUGIN_ROOT}/company-os-plane
```

The plugin is enabled in `${CODEX_HOME}/config.toml`, cached under
`${CODEX_HOME}/plugins/cache/mathias-local/company-os-plane/0.1.0`
and also registered as direct MCP server `mcp_servers.company_os_plane`. It
exposes read/write tools for projects, work items, states and comments plus
safe keychain diagnostics, consent URL generation and local OAuth repair. The
plugin is only a runtime adapter: the canonical credentials remain the Plane App
env/keychain values from this document.

For local repair after an app recreation, use:

```bash
node scripts/plane/plane-app-oauth-local-repair.mjs --open --json
```

If browser approval redirects to localhost after the helper timed out, rerun
with the full callback URL from the address bar:

```bash
node scripts/plane/plane-app-oauth-local-repair.mjs \
  --callback-url '<localhost callback URL>' \
  --json
```

The helper listens on the configured localhost redirect URI, captures
`app_installation_id` and immediately attempts the bot-token exchange without
printing secrets. Keychain is updated only after a successful exchange.

Generate a consent URL:

```bash
node scripts/plane/plane-app-oauth.mjs \
  --mode consent-url \
  --client-id <client_id> \
  --redirect-uri https://<company-os-runtime>/api/plane/oauth/callback
```

Exchange an approved app installation for a bot token:

```bash
node scripts/plane/plane-app-oauth.mjs \
  --mode bot-token \
  --client-id <client_id> \
  --client-secret <client_secret> \
  --app-installation-id <installation_uuid> \
  --save-token-keychain
```

Scheduler-safe token rotation gate:

```bash
node scripts/plane/plane-app-token-rotation.mjs \
  --mode ensure \
  --refresh-window 2h \
  --json
```

Use `--mode check` for read-only preflight and `--mode force` only for
operator repair. A scheduler should run `ensure` before every Plane App
write lane and treat non-zero exit as `BLOCKED_AUTH`.

Verify the installed workspace:

```bash
node scripts/plane/plane-app-oauth.mjs \
  --mode installation \
  --app-installation-id <installation_uuid>
```

Run the existing ledger helpers through app identity:

```bash
node scripts/plane/plane-ledger-preflight.mjs \
  --workspace <workspace_slug> \
  --auth app-token

node scripts/plane/plane-create-work-item.mjs \
  --workspace <workspace_slug> \
  --project-id <project_uuid> \
  --name "Company.OS 0.3.1 Alpha - Plane App controlled write pilot" \
  --description-html "<p>Plane App auth write pilot. No production systems touched.</p>" \
  --priority low \
  --auth app-token
```

## Webhook Receiver Gate

The webhook endpoint must be fail-closed and reducer-compatible before live
dispatch:

- verify `X-Plane-Signature` with HMAC SHA-256
- dedupe by `X-Plane-Delivery`
- persist raw payload only in private ops or redacted ledger
- event allowlist: work item, issue comment, project
- reject unsupported event/action pairs
- map events into the Company.OS agent-event ledger
- never dispatch workers directly from raw webhook payload
- return HTTP 200 only after validation and append succeed

## 0.3.1 Alpha Release Bar

`0.3.1-alpha` can be cut when:

- Plane App exists in the Plane workspace.
- Client ID/secret are stored in Keychain, not repo files.
- Consent URL generation works.
- Bot-token exchange works and stores token without printing it.
- App installation lookup returns workspace slug.
- Existing Plane ledger preflight runs with app token or equivalent app-auth
  adapter.
- App-auth controlled writes succeed.
- Webhook receiver has a dry-run signature verification test.
- Direct API key remains emergency/bootstrap fallback only.

## Product Rule

For new client installs, Company.OS must prefer Plane App install flow over
manual API-key collection.

The install wizard should ask for:

1. execution ledger choice: Plane or fallback
2. Plane workspace slug
3. app install approval
4. first controller project
5. first work-order template

The client should never paste a long-lived personal API key into a worker
prompt.
