---
description: 🤖 Dynamic Assembly & Execution — Team-Auswahl + (optional) Autonomer Harness
---

# @mt-dyn — Dynamic Assembly & Deep Worker Harness

Gib nach dem Kürzel die Aufgabe an. 
Beispiel: `/mt-dyn E2E Testing: Swarm ChatRoom zu ActionRoom Transition`

## System-Kontext laden (PFLICHT — vor JEDER Mastertable-Aktivierung!)

// turbo
```
Lies: memory-bank/system-index.md ODER ARCHITECTURE.md
Lies: AGENTS.md
Lies: memory-bank/semantic-context.md (falls vorhanden)
Lies: .antigravity/logs/architect-memory.md (Active Directives!)
```

## Team-Assembly + Execution

// turbo-all
```text
1. Lies: .antigravity/agentic-router.md (Sektion "🤖 Dynamic Assembly")
2. Interpretiere den Text nach dem Kürzel als Aufgabenbeschreibung.
3. LLM analysiert Dispatch-Tabelle und stellt das optimale Team zusammen (min 3, max 7 Personas).

---

## Phase 1: Planning (Mastertable-Protokoll)
Führe das klassische Mastertable-Protokoll durch:
1. Briefing → 2. Solo-Analyse → 3. Konfrontation → 4. User-Decision.
Ziel: Eine wasserdichte Strategie oder ein Test-Plan (z.B. "Welche Knöpfe muss der Agent klicken?").

---

## Phase 2: Execution (NOUS Autonomous Harness / Deep Worker)
> Optional: Wird aktiviert, wenn die Aufgabe Long-Running ist (Web-Research, E2E UI Testing, "Act as a User").

Wenn Phase 1 abgeschlossen ist und der User das Go gibt:
1. Der Test-Plan wird in eine iterative Task-Queue übersetzt.
2. Der autonome "Harness" (via `browser-use`) wird gestartet.
3. "Deep Worker" Behavior:
   - Der Agent agiert wie ein **normaler User** (Logins, Klicken, Tippen, Warten).
   - Er gleicht das Verhalten der App live mit den Insights aus der `architect-memory.md` ab.
   - Er dokumentiert Bugs, UI-Fehler und fehlende Logik direkt als Report.
```
