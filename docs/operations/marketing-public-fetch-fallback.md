# Marketing Public Fetch Fallback

Status: active pilot doctrine
Use for: bounded public URL reads when platform analytics are missing,
especially LinkedIn public post snapshots, X/Reddit post presence checks,
source-page research and reaction digests.
Last updated: 2026-05-24

## Decision

Marketing workers may use a declared public-fetch capability, including
Claude Code `WebFetch` or the TinyFish MCP endpoint, as a read-only fallback
after platform APIs fail or return incomplete post metrics.

TinyFish endpoint:

```text
Name: tinyfish
Transport: http
URL: https://agent.tinyfish.ai/mcp
Auth: OAuth bearer
```

Observed local status on 2026-05-23:

```text
claude mcp list -> tinyfish connected via OAuth
curl https://agent.tinyfish.ai/mcp -> 401 OAuth bearer required
claude -p ... --permission-mode plan -> MCP fetch blocked by plan-mode approval
claude -p ... --permission-mode auto --allowedTools mcp__tinyfish__fetch_content -> fetch passed
```

This means TinyFish is a Claude Code capability, not a raw unauthenticated HTTP
endpoint. A worker contract may request `tinyfish-mcp` only with an explicit
read-only tool allowlist such as `mcp__tinyfish__fetch_content`. If the tool is
not connected or the permission profile blocks the fetch, runtime preflight must
report `BLOCKED_AUTH` or `BLOCKED_PERMISSION`, not a successful fetch lane.

## Creator Analytics Boundary

Public fetch is not creator analytics. It may read public pages, but it must
not open private dashboards or use logged-in cookies. The real 2026-05-23
LinkedIn run proved this boundary: public fetch returned metadata/text where
visible but no reliable creator counters for 31/31 LinkedIn targets.

Official LinkedIn Creator Analytics metrics use the separate assisted export
lane merged in ARES PR #193:

```text
npm run marketing:linkedin-pull -- --date YYYY-MM-DD --profile mheinke_founder --open --watch-downloads --timeout-minutes 5 --run-post-metrics
```

Mathias performs the authenticated browser action by clicking LinkedIn
`Export`; the local runner only watches for the downloaded CSV, parses it,
archives it and emits `linkedin_creator_export` evidence. These CSV-derived
metrics may supersede public-fetch blockers after import, but they are still
Founder-assisted until a real API lane exists.

## Allowed Uses

Allowed for CMO-scoped, read-only work:

- fetch public LinkedIn, X, Reddit or article URLs already present in the
  marketing ledger
- recover visible public counters such as reactions, comments, repost labels or
  public text snippets when the page exposes them without login
- verify public URL presence, canonical URL, title, noindex hints and visible
  body text for marketing evidence
- cross-check Upload-Post analytics when API metrics are empty or blocked
- feed Performance Analyst, Reaction Radar, Evidence Scout, Distribution
  Manager and Blog Engine reports with source-labeled partial evidence

## Blocked Uses

The fallback must not:

- use browser cookies, private sessions, account dashboards or logged-in
  creator analytics
- like, reply, repost, delete, cancel, schedule or publish
- bypass Upload-Post, Plane, HG-2.5 release cards or CAO/CEO gates
- treat missing visible metrics as zero performance
- scrape at unbounded scale or fetch private/customer/founder data
- store OAuth tokens, cookies or raw auth headers in reports, Plane or Git

## Evidence Contract

Every public-fetch result that enters marketing performance memory must include:

```yaml
source: tinyfish_public_fetch | claude_webfetch | node_public_fetch
url:
fetched_at:
http_status:
auth_state: authenticated | unauthenticated | not_required | blocked
visible_metrics:
  reactions:
  comments:
  reposts:
  shares:
  impressions:
metric_trust: public_visible_partial | api_verified | manual_screenshot | blocked
limitations:
```

Rules:

- `metric_trust: public_visible_partial` can support learning proposals, not
  final creative-winner claims by itself.
- LinkedIn public fetch may recover reactions/comments, but does not replace
  impressions, shares or creator analytics.
- API `200` with empty platform metrics and public fetch with no visible
  counters are blockers or unknowns, never real zeroes.
- Human screenshot evidence remains valid when labeled as
  `metric_trust: manual_screenshot`.
- Claude/TinyFish snapshots must be stored as JSON artifacts and then consumed
  by the local harvester. The harvester, not the worker, decides whether the
  evidence is trusted enough to enter the ledger.

## Cadence

Recommended daily worker pattern:

1. Upload-Post API metrics.
2. Public-fetch fallback for missing public post-level rows.
3. Browser/screenshot manual evidence only when the public fetch cannot see
   the relevant counters and the post is strategically important.
4. Write one Performance Analyst report and one CMO Morning Brief delta.

Default fetch bounds:

- first 14 days after publishing: daily
- after day 14: weekly unless the post is still receiving comments/shares
- cap per run: 100 public URLs
- no automatic replies or public actions from this lane

## Capability Profiles

The capability registry exposes `tinyfish-mcp` and Claude `WebFetch` only to
bounded CMO marketing profiles that need public reads:

- `claude-clevel-worker/cmo/runtime`
- `claude-clevel-worker/cmo/atlas-website`
- `claude-clevel-worker/cmo/marketing-evidence-scout`
- `claude-clevel-worker/cmo/marketing-reaction-radar`
- `claude-clevel-worker/cmo/atlas-growth-blog-engine`
- `claude-clevel-worker/cmo/marketing-distribution-manager`
- `claude-clevel-worker/cmo/marketing-performance-analyst`

Claim Safety may use evidence handed off by Evidence Scout or Blog Engine; it
does not need direct public-fetch expansion by default.
