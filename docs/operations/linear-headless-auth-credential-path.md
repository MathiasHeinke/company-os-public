# Linear Headless Auth Credential Path

Status: canonical durable credential doctrine for headless Linear access
in scheduled cron lanes
Use for: keeping `scripts/linear/headless-linear.mjs auth-preflight`
green in unattended scheduled-host execution
Last updated: 2026-05-09

## Rule

Scheduled jobs that read or comment on Linear must obtain a Linear
credential **without any UI connector**. The connector path (Linear
desktop app, Linear UI session, MCP-UI fallback) is forbidden in
scheduled lanes by `docs/operations/runtime-auth-preflight.md` and by
the `BlockedActions` of every Plane work item that touches Linear.

## Resolution Ladder (canonical, in order)

`scripts/linear/headless-linear-core.mjs#resolveLinearAuthorization`
walks this ladder. The first hit wins.

1. **`env:LINEAR_API_KEY`** — environment variable in the scheduled-host
   process environment.
2. **`env:LINEAR_OAUTH_ACCESS_TOKEN`** — environment variable, used
   verbatim as `Bearer <token>`.
3. **`file:--linear-api-key-file`** — explicit file path passed by the
   caller. Useful for one-off batch runs that source a sealed file.
4. **`keychain:--linear-api-key-keychain` (custom)** — explicit
   `service::account` entries passed by the caller via comma-separated
   list.
5. **OAuth client credentials**, resolved from any of:
   - `env:LINEAR_OAUTH_CLIENT_ID` + `env:LINEAR_OAUTH_CLIENT_SECRET`
   - `--linear-oauth-client-id-file` + `--linear-oauth-client-secret-file`
   - `OAUTH_CLIENT_ID_KEYCHAIN_CANDIDATES` + `OAUTH_CLIENT_SECRET_KEYCHAIN_CANDIDATES`
6. **`keychain:API_KEY_KEYCHAIN_CANDIDATES` (fallback list)** — last
   resort: well-known Keychain service/account pairs.

The canonical pairs in candidate fallback lists are:

| Purpose | Service | Account |
|---|---|---|
| API key (member) | `Company.OS` | `LINEAR_API_KEY` |
| OAuth client id | `ares-control-plane-linear-client-id` | `ares-control-plane` |
| OAuth client secret | `ares-control-plane-linear-client-secret` | `ares-control-plane` |

Other entries in the candidate arrays exist for backward compatibility
(legacy Company.OS / ARES naming variants); the three above are the
recommended canonical pairs going forward.

## Recommended Scheduled-Host Install (current)

The current passing path on Mathias' host is **OAuth client credentials
in macOS Keychain**, resolved via path 5 of the ladder. Install once, on
the scheduled host:

```bash
# Run once on the host that hosts the cron / LaunchAgent / scheduler.
# Replace the placeholders with the values issued in the Linear OAuth
# application settings. The values are not stored in this repo, this
# doctrine, or any Plane comment.

security add-generic-password -U \
  -s 'ares-control-plane-linear-client-id' \
  -a 'ares-control-plane' \
  -w '<linear-oauth-client-id>'

security add-generic-password -U \
  -s 'ares-control-plane-linear-client-secret' \
  -a 'ares-control-plane' \
  -w '<linear-oauth-client-secret>'
```

After install:

```bash
node ${COMPANY_OS_ROOT}/scripts/linear/headless-linear.mjs \
  auth-preflight --json --soft
```

Expected:

```json
{
  "protocol": "linear-headless/v1",
  "ok": true,
  "status": "pass",
  "auth": {
    "method": "oauth_client_credentials",
    "source": "oauth_client_credentials",
    "actor": "<runner-name>",
    "organization": "<linear-org>"
  }
}
```

The actor will be the OAuth application's bot user, not the founder's
personal Linear account. This is intentional: scheduled comments and
reads are attributable to the Company.OS runner identity, not to a human
session.

## Alternative: API Key in Keychain

If OAuth client credentials are unavailable, a member API key in
Keychain at the canonical pair also works (path 6 of the ladder):

```bash
security add-generic-password -U \
  -s 'Company.OS' \
  -a 'LINEAR_API_KEY' \
  -w '<linear-api-key>'
```

Drawback: comments will appear under the member account that issued the
key, which mixes scheduled-runner activity with human history.

## Alternative: Env Var via LaunchAgent

If the scheduled lane is a `launchd` agent, env vars in the plist's
`EnvironmentVariables` block are inherited by the launched process:

```xml
<key>EnvironmentVariables</key>
<dict>
    <key>LINEAR_API_KEY</key>
    <string>...</string>
</dict>
```

Drawback: the secret value sits in a file. Prefer Keychain unless the
launchd agent has no Keychain access for some reason.

## Verification (mandatory before declaring green)

```bash
node ${COMPANY_OS_ROOT}/scripts/linear/headless-linear.mjs \
  auth-preflight --json --soft
```

A successful preflight in any other shell does **not** count. The
preflight must be run **inside the scheduled host's pass** so that the
running environment (LaunchAgent EnvironmentVariables, sourced shell
config, Keychain access) matches what the cron job will see at run
time.

## Forbidden

- The Linear UI connector in scheduled jobs.
- The Linear desktop app as fallback.
- The MCP-UI connector in scheduled lanes.
- Pasting, printing, committing, or storing the credential value
  anywhere outside the OS keystore (Keychain) or the LaunchAgent plist.
- Using the founder's personal Linear session as a scheduled-job
  identity.

## When Auth is Blocked

`resolveLinearAuthorization` returns:

```json
{
  "ok": false,
  "blocker": "LINEAR_HEADLESS_AUTH_MISSING",
  "requiredAction": "<6-line repair ladder>",
  "resolutionLadder": [...],
  "forbidden": [...]
}
```

The `requiredAction` field of the live blocker message in code spells
out the exact `security add-generic-password` commands plus the
verification command. Do **not** rely on this doctrine alone for the
repair commands; the helper's `--soft` JSON output is the contract that
schedulers and CAO read.

## Relation to Other Docs

- `docs/operations/runtime-auth-preflight.md` — generic runtime auth
  preflight rule for any CLI/connector.
- `docs/operations/control-plane-live-readiness.md` — uses Linear
  headless auth as one of its readiness checks.
- `scripts/linear/headless-linear-core.mjs` — implementation; this doc
  must stay aligned with the resolution ladder there.
- `reports/runtime-auth/<date>/...-linear-headless-auth-*.md` —
  per-run preflight evidence trail.

## Hygiene

- New keychain candidates require an amendment to the candidate arrays
  in `scripts/linear/headless-linear-core.mjs`, the canonical-pair
  table above, and the corresponding test fixtures.
- The verification command must remain a non-interactive
  `--json --soft` invocation so that schedulers and CAO can parse the
  result.
- Source-company-specific naming (ARES Control Plane Runner) belongs
  in private operating docs; the generic Company.OS canonical pairs
  stay generic.
