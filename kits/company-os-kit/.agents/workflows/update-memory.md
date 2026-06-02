---
description: Memory Bank aktualisieren — Session-Ende-Protokoll für persistentes Arbeitsgedächtnis
---
// turbo-all

# /update-memory — Memory Bank Session Update

> **Trigger:** Am Ende einer produktiven Session, oder wenn der User `@nous session-end` sagt.
> **Dauer:** ~2 Minuten

## Schritte

1. **Lies den aktuellen Stand:**
   ```
   Lies memory-bank/activeContext.md
   Lies memory-bank/progress.md
   ```

2. **Update `activeContext.md` (MAX 100 ZEILEN!):**
   - Aktualisiere "Woran wird aktuell gearbeitet?" mit dem neuesten Stand
   - Aktualisiere "Nächste Schritte" basierend auf offenen Punkten
   - Aktualisiere "Kontext aus letzten Sessions" mit einem Einzeiler zur aktuellen Session
   - **Hygiene:** Falls >100 Zeilen → abgeschlossene Items nach `memory-bank/archive/activeContext-YYYY-MM.md` verschieben

3. **Update `semantic-context.md` (PFLICHT!):**
   - Füge neue Erkenntnisse der Session ins Literaturverzeichnis ein:
   ```markdown
   ### [Datum] — [Session-Titel]
   **Geänderte Module:** [Liste der angefassten Dateien/Module]
   **Erkenntnisse:** [Was haben wir über das System gelernt?]
   **Abhängigkeiten entdeckt:** [Welche Module hängen wie zusammen?]
   **Entscheidungen:** [Was wurde entschieden und warum?]
   ```
   - **Hygiene:** Falls >300 Zeilen → älteste 50% nach `memory-bank/archive/semantic-YYYY-QN.md` verschieben

4. **Update `progress.md`:**
   - Verschiebe erledigte Items von "In Progress" nach "Completed"  
   - Füge neue offene Punkte unter "In Progress" oder "Planned" ein
   - Aktualisiere "Known Issues" falls neue technische Schulden aufgefallen sind

5. **Schreibe `sessionLog.md` Eintrag:**
   - Füge einen neuen Eintrag am Anfang der Datei ein (neueste zuerst):
   ```markdown
   ### [DATUM] — [Thema]
   - **Was:** [Was wurde getan?]
   - **Ergebnis:** [Was ist das Ergebnis?]
   - **Offen:** [Was ist noch offen?]
   - **Betroffene Dateien:** [Welche Dateien wurden geändert?]
   ```
   - **Hygiene:** Falls >10 Sessions → ältere nach `memory-bank/archive/sessionLog-YYYY-QN.md`

6. **(PFLICHT) Architect Memory Update:**
   - **Layer 2 (Active Directives):** Haben sich Active Directives geändert?
     → Neue Direktive? Hinzufügen.
     → Direktive erledigt? Entfernen oder als ✅ markieren.
   - **Layer 3 (Session Log):** Was ist in dieser Session passiert?
     → Datum, Thema, Ergebnis, offene Punkte.
     → Wenn Layer 3 > 30 Einträge: ältere Sessions komprimieren.
   - Datei: `.antigravity/logs/architect-memory.md`

7. **(Optional) Update `systemPatterns.md` & `techContext.md`**
   - Nur wenn sich Architektur-Patterns, Code-Style-Vorgaben oder neue Dependencies eingeschlichen haben.

8. **(KRITISCH) Memory V4 Micro-Update prüfen:**
   - Wenn in dieser Session **neue Edge Functions, neue Datenbank-Tabellen, neue Pipelines oder neue APIs** hinzugefügt wurden:
   - Führe **Micro-Updates** an den jeweiligen Maps durch:
     - `edge-function-registry.md`
     - `data-model-map.md`
     - `module-interaction-map.md`
     - `infrastructure-map.md`
     - `system-index.md` (Boot-Index Einzeiler anpassen)
   - *Ziel:* Verhindern von Drift. Die Karte muss zum Territorium passen.

9. **(KRITISCH) Drift-Check system-index.md / ARCHITECTURE.md:**
   - Haben sich Modul-Strukturen, Edge Functions oder Data Models geändert?
   - Falls ja → system-index.md / ARCHITECTURE.md anpassen
   - *Ziel:* Boot-Index muss IMMER aktuell sein.

10. **Linear Sync Gate (PFLICHT-ENTSCHEIDUNG, konditionaler Write):**
   - Frage: Entsteht aus dieser Session konkrete Arbeit, ein Blocker, ein
     Milestone, eine Review-Pflicht oder ein Statuswechsel?
   - Falls nein: Linear nicht anfassen und im Abschluss `Linear: nicht noetig`
     melden.
   - Falls ja: Linear zuerst lesen, bestehendes Issue bevorzugen, dann knapp
     kommentieren/aktualisieren.
   - Neues Issue nur anlegen, wenn kein passendes Issue existiert und Ziel,
     Source of Truth, Akzeptanzkriterien, Guardrails, Zielworkspace und
     naechster Schritt klar sind.
   - Keine Session-Recaps, Memory-Dumps, privaten Rohdaten oder parked-repo-
     Aufraeumideen in Linear schreiben.
   - `Done` nur setzen, wenn Akzeptanzkriterien und Gates erfuellt sind.

11. **Bestätige dem User:**
    ```
    ✅ Memory Bank updated:
    - activeContext.md: [Kurz-Summary] (Zeilen: [N]/100)
    - semantic-context.md: [N] neue Erkenntnisse
    - progress.md: [X Items completed, Y Items added]
    - sessionLog.md: Eintrag [Datum] geschrieben
    - architect-memory.md: Layer 2 [geändert/unverändert], Layer 3 geschrieben
    - V4 Maps: [aktualisiert / keine Änderungen]
    - system-index.md: [aktuell / aktualisiert]
    - Linear: [Issue aktualisiert / neues Issue / nicht noetig]
    ```

---

## Memory Hygiene Quick-Ref

| File | Max Zeilen | Overflow → |
|------|:----------:|------------|
| `activeContext.md` | 100 | `archive/activeContext-YYYY-MM.md` |
| `semantic-context.md` | 300 | `archive/semantic-YYYY-QN.md` |
| `sessionLog.md` | 10 Sessions | `archive/sessionLog-YYYY-QN.md` |
| `architect-memory.md` Layer 3 | 30 Einträge | Komprimieren |

## Tiered Memory Model

| Tier | File | Update-Trigger |
|------|------|---------------|
| **Operativ** | `activeContext.md`, `progress.md` | Jeder Phasen-Checkpoint |
| **Semantisch** | `semantic-context.md` | Jeder Phasen-Checkpoint + Session-Ende |
| **Strategisch** | `architect-memory.md` | Session-Ende |
| **Topografisch** | `system-index.md` / `ARCHITECTURE.md` | Bei Struktur-Änderungen |
| **Archiv** | `archive/*.md` | Bei Overflow |
