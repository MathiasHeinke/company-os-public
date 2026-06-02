---
description: Self-Diagnosis wenn der Agent steckenbleibt oder confused ist
---

// turbo-all

# /unstuck — Agent Self-Diagnosis

> Wenn der Agent steckenbleibt, confused ist, oder im Kreis dreht.
> Systematische Diagnose statt blindes Probieren.

## Schritte

1. **Was war der Plan?**
   ```
   Lies: task.md / implementation_plan.md (falls vorhanden)
   Lies: memory-bank/activeContext.md
   Lies: memory-bank/progress.md
   ```
   → Was war das Ziel? Welche Phase sind wir?

2. **Was war die letzte Aktion?**
   ```bash
   git log --oneline -5
   ```
   → Letzten Memory-Checkpoint prüfen
   → Was wurde zuletzt geändert?

3. **Was genau ist fehlgeschlagen?**
   - Error-Message kopieren und analysieren
   - Build-Output / Test-Output prüfen
   - Browser-Konsole checken (bei UI-Problemen)

4. **3 mögliche Ursachen benennen:**
   ```markdown
   | # | Ursache | Wahrscheinlichkeit | Aufwand Fix |
   |---|---------|:------------------:|:-----------:|
   | 1 | [Beschreibung] | 🔴 hoch | ⬜ niedrig |
   | 2 | [Beschreibung] | 🟡 mittel | ⬜ mittel |
   | 3 | [Beschreibung] | ⬜ niedrig | 🔴 hoch |
   ```

5. **Wahrscheinlichste Ursache wählen + Fix vorschlagen:**
   - Konkreten Fix formulieren (nicht vage)
   - DIRECTIVE-004: Wie wird der Fix verifiziert?

6. **User fragen:**
   > "Ich stecke fest bei [Problem]. Wahrscheinlichste Ursache: [X]. Vorgeschlagener Fix: [Y]. Soll ich das versuchen?"

> **Regel:** Niemals mehr als 3 Versuche ohne User-Rückfrage. Nach 3 Failures → `/unstuck` PFLICHT.
