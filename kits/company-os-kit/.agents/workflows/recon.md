---
description: Reconnaissance — Codebase-Index (system-index.md / ARCHITECTURE.md) aktualisieren
---

// turbo-all

# /recon — Codebase Index Maintenance

> Hält die Codebase-Karte (system-index.md / ARCHITECTURE.md) aktuell.
> Ohne aktuelle Karte navigiert der Agent blind.

## Schritte

1. **Aktuelle Karte lesen:**
   ```
   Lies: memory-bank/system-index.md
   ODER: ARCHITECTURE.md (falls system-index nicht existiert)
   ```

2. **Dateisystem scannen:**
   ```
   list_dir auf die Hauptverzeichnisse:
   - src/ (oder app/, lib/, pages/)
   - supabase/functions/
   - docs/
   - memory-bank/
   ```

3. **Delta erkennen:**
   - Neue Dateien/Module die NICHT im Index stehen?
   - Gelöschte Dateien/Module die NOCH im Index stehen?
   - Verschobene Dateien?

4. **Index aktualisieren:**
   - Module Map anpassen
   - Edge Function Registry updaten (falls vorhanden)
   - Data Model aktualisieren (falls Migrations gelaufen)
   - Screen/Component Map aktualisieren (falls UI geändert)

5. **Drift-Report ausgeben:**
   ```markdown
   ## 📡 Recon Report — [Datum]
   
   ### Neue Module
   - [Datei] — [Zweck]
   
   ### Entfernte Module
   - [Datei] — (war: [alter Zweck])
   
   ### Verschobene Module
   - [Alt] → [Neu]
   
   ### Index-Status
   ✅ system-index.md ist aktuell / ⚠️ [N] Drift-Einträge korrigiert
   ```

6. **Git Checkpoint:**
   ```bash
   git add -A && git commit -m "recon: updated codebase index"
   ```
