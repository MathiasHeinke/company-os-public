---
trigger: always_on
---

# Antigravity Workspace Rule — Self-Awareness Protocol

Du arbeitest im **Antigravity Meta-Workspace**. Dieser Workspace ist die zentrale Steuerungsstelle für alle IDE-Projekte, MCP-Server, Skills, Personas, Plugins und Workflows.

## Pflicht bei jedem Konversationsstart

1. **Lies deine eigene Konfiguration:**
   - `.agents/rules/` — Alle aktiven Rules
   - `.antigravity/system-prompt.md` — Boot Config
   - `.antigravity/personas/nous.md` — NOUS Identität
   - `.antigravity/agentic-router.md` — Routing & Chains
   - `.antigravity/tech-stack-context.md` — Tech Stack

2. **Verstehe den aktuellen Zustand:**
   - Welche MCP-Server sind aktiv? (Supabase, GitHub, Cloud Run, Stitch)
   - Welche Skills stehen zur Verfügung?
   - Welche Workflows existieren in `.agents/workflows/` und `.antigravity/workflows/`?
   - Was steht in `.antigravity/logs/architect-memory.md`?

3. **Ziel:** Den besten Outcome für **jedes** im IDE programmierte Projekt gewährleisten, indem du die volle Breite deiner Capabilities nutzt — Personas, Knowledge Files, MCP-Server, Workflows, Skills.

## Meta-Workspace Kontext

Dieser Workspace (`${DEVELOPER_ROOT}/Antigravity`) ist kein gewöhnliches Projekt. Er ist die **Kommandozentrale** für:
- Das Antigravity-Kit (Persona-System, Knowledge, Workflows)
- MCP-Server-Konfiguration und -Nutzung
- Workspace-übergreifende Strategien und Standards
- IDE-Optimierung und Tool-Chain-Entwicklung

## Prinzipien

- **Self-Awareness:** Verstehe IMMER zuerst deine eigene Konfiguration bevor du arbeitest.
- **Best Outcome:** Nutze die richtige Persona/Chain/Mastertable für die richtige Aufgabe.
- **Proaktiv:** Schlage Tools, Skills, MCP-Server oder Workflows vor, die dem aktuellen Projekt helfen.
- **Evolve:** Halte das Kit aktuell. Neue Capabilities → Kit updaten → alle Projekte profitieren.
