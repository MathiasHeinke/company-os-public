# Antigravity MCP Gateway — Kit Template

> **Zweck:** Lokaler Proxy-Server der Custom-MCPs (Context7) bündelt und über eine REST-API auf Port 9090 bereitstellt. Kein Docker nötig — alles In-Process Python.

## Schnellstart

```bash
# 1. Template in dein Projekt kopieren
cp -r antigravity-kit/scripts/mcp-gateway-template/ scripts/mcp-gateway/

# 2. .env erstellen
cp scripts/mcp-gateway/.env.example scripts/mcp-gateway/.env
# → API_KEY eintragen!

# 3. Dependencies installieren
pip install -r scripts/mcp-gateway/requirements.txt

# 4. Gateway starten
cd scripts/mcp-gateway && python3 start.py
```

## Stack

| Component | Wert |
|-----------|------|
| PII Scrubber | Regex (DIRECTIVE-002) |
| Context7 | npx sub-process |
| Port | 9090 |

## Endpoints

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/health` | GET | Health Check |
| `/context7/query` | POST | Library-Docs abfragen |

## Dateien

- `gateway.py` — Hauptmodul (wird aus dem Root-Workspace kopiert, nicht im Template)
- `start.py` — Entry-Point mit .env Loader
- `.env.example` — Credentials-Template
- `requirements.txt` — Python Dependencies
