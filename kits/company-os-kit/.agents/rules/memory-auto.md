# Memory Auto-Sync — Autonomous IDE Memory Checkpoint

> **PFLICHT-REGEL:** Diese Rule wird bei JEDEM Workflow-Ende automatisch ausgeführt.
> Der Agent MUSS den Memory Checkpoint ausführen — der User soll NIEMALS `/update-memory` manuell aufrufen müssen.

## 3-Tier Memory Checkpoint

### Tier 1 — ALWAYS (nach jeder abgeschlossenen Aufgabe)

Wenn eine Aufgabe abgeschlossen ist (Feature implementiert, Bug gefixt, Analyse fertig):

1. **Honcho Session-Update:**
   ```
   mcp_honcho_add_messages_to_session({
     session_id: "architect-strategy",
     messages: [{
       peer_id: "nous",
       content: "[DATUM] — [THEMA]\n- Was wurde getan: [Zusammenfassung]\n- Erkenntnisse: [Was gelernt]\n- Entscheidungen: [Was entschieden]"
     }]
   })
   ```

2. **Honcho Conclusions** (nur bei neuen Invarianten/Regeln/Entscheidungen):
   ```
   mcp_honcho_create_conclusions({
     peer_id: "nous",
     target_peer_id: "nous",
     conclusions: ["[Neue Erkenntnis als Satz]"]
   })
   ```

3. **Karpathy Brain Update** (`memory-bank/semantic-context.md`):
   - Neue Session-Chronik-Einträge appenden (NIEMALS löschen, nur hinzufügen)
   - Format: `### YYYY-MM-DD — [Thema]\n**Geänderte Module:** ...\n**Erkenntnisse:** ...\n**Entscheidungen:** ...`
   - Bei >300 Zeilen: älteste 50% in `memory-bank/archive/` verschieben

### Tier 2 — ON CODE CHANGE (wenn Code editiert wurde)

Wenn Dateien in `src/`, `supabase/functions/`, oder `supabase/migrations/` geändert wurden:

1. **`memory-bank/system-index.md` Inkrement-Update:**
   - Neue Edge Functions → eintragen
   - Neue DB-Tabellen → eintragen
   - Neue Pipelines → eintragen
   - **NUR hinzufügen/anpassen, kein Full-Scan!**

2. **GitNexus re-index** (wenn verfügbar):
   - `mcp_gitnexus_detect_changes()` um Impact zu prüfen

### Tier 3 — ON MILESTONE (deploy, ship-it, Architektur-Entscheidung)

Wird ZUSÄTZLICH zu Tier 1+2 ausgeführt bei:
- Edge Function Deployments
- Architektur-Änderungen
- Neue Directives oder strategische Entscheidungen
- `/ship-it` Aufrufe

1. **`memory-bank/progress.md`** — Erledigte Items verschieben, neue Issues eintragen
2. **`architect-memory.md` Layer 1+2** — Strategische Guardrails / Active Directives aktualisieren
3. **Honcho Dream Trigger:**
   ```
   mcp_honcho_schedule_dream({ peer_id: "nous" })
   ```

### Linear Gate — CONDITIONAL EXECUTION LEDGER

Linear ist kein Memory-Ziel. Nach Tier 1-3 nur dann Linear schreiben, wenn
eine konkrete Arbeit, ein Blocker, ein Milestone, eine Review-Pflicht oder ein
Statuswechsel entstanden ist.

**Schreiben:** bestehendes Issue kommentieren/aktualisieren, actionable
Follow-up anlegen, Blocker sichtbar machen, Gate-/Deploy-Status setzen.

**Nicht schreiben:** reine Session-Zusammenfassung, Invariante ohne naechsten
Schritt, Architekturgeschichte, Memory-Dump, parked-repo-Aufraeumidee.

Regeln: Linear zuerst lesen; bestehende Issues bevorzugen; neue Issues nur mit
Ziel, Source of Truth, Akzeptanzkriterien, Guardrails, Zielworkspace und
naechstem Schritt; `Done` nur bei erfuellten Gates.

## Entscheidungslogik

```
Aufgabe abgeschlossen?
├── JA → Tier 1 ausführen (IMMER)
│   ├── Code geändert? → Tier 2 zusätzlich
│   └── Deployment/Architektur? → Tier 3 zusätzlich
└── NEIN → Nichts tun (Aufgabe läuft noch)
```

## Wichtig

- **KEIN separater Schritt nötig** — der Agent führt den Checkpoint als letzten Schritt seiner Arbeit aus
- **Fire-and-forget** — wenn Honcho nicht erreichbar ist, trotzdem weiterarbeiten
- **Workspace:** Honcho Workspace ist `antigravity-dev`, Peer ist `nous`
- **Kein `/update-memory` mehr nötig** — diese Rule ersetzt den manuellen Workflow für 90% der Fälle
- **`/update-memory` bleibt** als expliziter Milestone-Checkpoint (Tier 3 only)
