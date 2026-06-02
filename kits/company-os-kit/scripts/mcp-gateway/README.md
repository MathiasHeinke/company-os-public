# Antigravity MCP Gateway

> **Single-Router Proxy** für Context7 (Live Docs).
> Baut auf den 3 Mastertable-Requirements (Single-Router, Doc-Chunking, PII-Scrubber) auf.

## Quick Start

```bash
# 1. Setup
cd antigravity-kit/scripts/mcp-gateway/
cp .env.example .env
# → OPENAI_API_KEY eintragen!

# 2. Gateway Dependencies
pip install -r requirements.txt

# 3. Gateway starten
python gateway.py
# → läuft auf http://localhost:9090
# → Swagger UI auf http://localhost:9090/docs
```

## Endpoints

| Endpoint | Method | Beschreibung |
|---|---|---|
| `/health` | GET | Health Check |
| `/context7/query` | POST | Library-Docs abfragen (auto-chunked) |
| `/utils/scrub` | POST | PII-Scrubber testen (Debug) |

## Nutzung durch NOUS

NOUS kann das Gateway über `curl` im Terminal nutzen:

```bash
# Aktuelle Next.js Docs abfragen
curl -X POST http://localhost:9090/context7/query \
  -H "Content-Type: application/json" \
  -d '{"library": "nextjs", "query": "server actions form handling"}'
```

## Architektur

```
NOUS (IDE Agent)
    │
    ├── curl localhost:9090/context7/query
    │       └── npx @upstash/context7-mcp (subprocess)
    │               └── Upstash Context7 API (live docs)
    │
    └── HTTP
            └── PII Scrubber (DIRECTIVE-002)
```

## Sicherheit

- **PII-Scrubber** (DIRECTIVE-002): Emails, Telefonnummern, IBANs, API-Keys, JWTs werden automatisch entfernt.
- **Lokaler Betrieb:** Kein externer Traffic. Gateway läuft auf localhost.
