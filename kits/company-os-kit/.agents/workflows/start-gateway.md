---
description: Startet den Antigravity MCP Gateway (Context7 + Mem0) im Hintergrund
---

# /start-gateway — MCP Gateway Autostart

> **Wann:** Bei Workspace-Boot oder manuell wenn das Gateway nicht läuft.  
> **Wo:** Im Antigravity Root-Workspace oder jedem Workspace mit `scripts/mcp-gateway/`

## Pre-Check

1. Prüfe ob der Gateway bereits läuft:
```bash
curl -s http://localhost:9090/health 2>/dev/null || echo "Gateway nicht erreichbar"
```

Falls "healthy" → Gateway läuft bereits. Nichts zu tun.

## Start

// turbo
2. Gateway starten (im Hintergrund):
```bash
cd scripts/mcp-gateway && nohup python3 start.py >> /tmp/gateway.log 2>&1 &
```

// turbo
3. Warte 10 Sekunden und verifiziere:
```bash
sleep 10 && curl -s http://localhost:9090/health
```

4. Erwartetes Ergebnis:
```json
{"status":"healthy","services":{"context7":"available (npx)","mem0":"in-process (gemini)","pii_scrubber":"active"}}
```

## Troubleshooting

Falls Port 9090 belegt:
```bash
lsof -ti:9090 | xargs kill -9 && sleep 2
```
Dann Schritt 2 wiederholen.

Falls `.env` fehlt:
```bash
cp scripts/mcp-gateway/.env.example scripts/mcp-gateway/.env
```
→ `GOOGLE_GEMINI_API_KEY` eintragen!
