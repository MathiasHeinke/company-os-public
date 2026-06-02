---
description: Deep Autonomous E2E Testing Protocol (The Swarm Edition)
---

// turbo-all

# 🐝 Deep E2E — Autonomer End-to-End Systemtest

Dieser Workflow treibt den autonomen Agenten an, ein vollständiges E2E-Systemtest-Szenario für das aktuelle Projekt durchzulaufen. **Maximal autonom, maximal tief, ohne den User zu brauchen.**

> Auslöser: `/deep-e2e` oder `/deep-e2e [Feature-Scope]`

---

## Phase 0: Context & Self-Adaptive Master Test Plan

### 0.1 Projekt-Kontext laden

```text
PFLICHT-LEKTÜRE:
Lies: memory-bank/system-index.md ODER ARCHITECTURE.md → Codebase-Karte
Lies: AGENTS.md                                       → Agent Brief + Standards
Lies: memory-bank/semantic-context.md                 → Systemverständnis (falls vorhanden)
Lies: memory-bank/progress.md
Lies: memory-bank/activeContext.md
Lies: .antigravity/logs/architect-memory.md (Active Directives)
```

### 0.2 Änderungen identifizieren

```bash
git log --oneline -20
git diff --stat HEAD~10 HEAD
```

### 0.3 Master Test Plan generieren

Erstelle eine Datei `e2e-master-plan.md` (im Projekt-Root oder `memory-bank/`).
Der Agent generiert den Plan **selbstständig** basierend auf den gelesenen Changes und dem Progress.

**Pflicht-Format:**

```md
# 🐝 [Projektname] — End-to-End Master Test Plan
Generiert: [Datum] | Scope: [Feature-Scope oder "Full System"]

## 🏁 Phase 1: [Logische Gruppierung, z.B. "Authentication & Core"]
| ID  | Funktion        | Beschreibung             | Test-Status | Gefundene Bugs / Fixes |
|-----|-----------------|--------------------------|-------------|------------------------|
| 1.1 | [Feature]       | [Was genau prüfen]       | ⏳ Pending  | -                      |

## 💬 Phase 2: [Nächste Gruppierung, z.B. "Chat & AI Engine"]
...
```

**Legende Test-Status:**
- ⏳ Pending
- 🏃‍♂️ In Progress
- ❌ Failed (Bug found)
- 🛠️ Bugfixed (Fix applied, re-tested)
- ✅ Passed

### 0.4 DB Seeding / Test-Account

Nutze `mcp_supabase-mcp-server_execute_sql` oder das projektspezifische DB-Setup:
1. Identifiziere oder erstelle einen Test-User mit bestätigter E-Mail + bekanntem Passwort.
2. Überschreibe Subscription/Tier-Daten → **volle Feature-Freischaltung** (Premium/Pro).
3. Dokumentiere die Credentials im Context (NICHT im Master Plan committen — PII!).

---

## Phase 1..N: Autonome Test-Execution

**Persona-Zuweisung:**
- **🔍 Sherlock Holmes** → Analysiert Fehler, leitet deduktiv die Root Cause ab
- **🖥️ John Carmack** → Fixt den Code (Backend, Edge Functions, DB)
- **⚛️ The React Architect** → Fixt den Code (Frontend, Komponenten, CSS)

### Pro Test-Step (ID X.Y):

1. **Status Update:** Markiere in `e2e-master-plan.md`: `🏃‍♂️ In Progress`

2. **Browser Execution:** Starte den `browser_subagent` mit einem extrem detaillierten Task:
   - Öffne die zu testende URL (leite sie aus dem Projekt-Kontext ab: `localhost:3000`, Vercel Preview, etc.)
   - Logge dich mit den Seed-Credentials ein
   - Führe die exakte Aktion für diesen Test-Step aus
   - Beobachte: UI-Rendering, Console-Errors, Network-Responses (400/500er)
   - Erstelle ein Recording (der `browser_subagent` tut das automatisch)

3. **Ergebnis bewerten:**

   **✅ Passed:** Markiere den Step als `✅ Passed`. Weiter zum nächsten Step.

   **❌ Failed:** 
   - Markiere als `❌ Failed` + trage den Bug in die Tabelle ein
   - Wechsle in **Sherlock-Modus**: Analysiere den Fehler (Console-Output, Logs, Code)
   - Wechsle in **Carmack/Rauno-Modus**: Implementiere den Fix
   - Trage den Fix in die Master-Plan-Tabelle unter "Gefundene Bugs / Fixes" ein
   - Setze Status auf `🛠️ Bugfixed`
   - **Re-Test:** Führe den Step im Browser erneut aus → muss `✅ Passed` werden

4. **Erst dann zum nächsten Step.**

---

## Context Checkpoint (Anti-Halluzination Gate)

> **KRITISCH:** Long-Running Tests (>45 Min) führen zu Kontext-Overflow. Der Agent beginnt zu halluzinieren (erfindet Dateien, Code, Responses).

**Nach dem Abschluss JEDER großen Test-Phase (alle IDs einer Phase sind ✅ oder 🛠️):**

1. **Speichern:** Sichere ALLE bisherigen Ergebnisse in `e2e-master-plan.md`
2. **Zusammenfassung schreiben:** Am Ende des Plans einen Checkpoint-Block:
   ```
   ### 🧹 Context Checkpoint — Phase X
   - Abgeschlossen: [Datum/Uhrzeit]
   - Passed: X | Bugfixed: Y | Failed: Z
   - Nächste Phase: [Phase Y Titel]
   ```
3. **User Ping:** Informiere den User via `notify_user`:
   > "Phase X fertig. [X] Passed, [Y] Bugfixed. Mein Kontext füllt sich — antworte mit 'Weiter' damit ich mit frischem Kopf in Phase Y starte."
4. **Beim Neustart:** Lies `e2e-master-plan.md` erneut. Überspringe alle `✅ Passed` und `🛠️ Bugfixed` Steps. Starte bei der nächsten `⏳ Pending` Phase.

---

## Finalisierung: Report & Memory Update

Wenn alle Phasen abgeschlossen sind:

1. **Finale Zusammenfassung** am Ende des `e2e-master-plan.md`:
   ```
   ## 🏆 E2E Test Result
   - Total Steps: X
   - Passed: X | Bugfixed: Y | Remaining Failed: Z
   - Duration: ~Xh
   - System Status: ✅ Battle-Tested / ⚠️ Partial / ❌ Blocked
   ```

2. **Memory Update:** Aktualisiere `memory-bank/progress.md` mit dem E2E-Ergebnis

3. **User Report:** Melde dem User:
   > "Deep E2E abgeschlossen. [X] Steps getestet, [Y] Bugs on-the-fly gefixt. System ist [Status]. Master Plan: `e2e-master-plan.md`"
