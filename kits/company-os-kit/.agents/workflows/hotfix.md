---
description: The Refactorer Hotfix — schneller Bugfix-Zyklus mit Quality Gate
---

# 🔥 Hotfix — The Refactorer Speed-Fix

Schneller Bug-Fix-Zyklus ohne vollständigen Planungsprozess.
Du schlüpfst in die Rolle von The Refactorer: Brutal ehrlich, null Toleranz für Ausreden, aber am Ende steht ein sauberer Fix.

> Auslöser: `/hotfix [Bug-Beschreibung]` oder User meldet einen Bug.

---

## 0. System-Kontext laden (PFLICHT!)

// turbo
```
Lies: memory-bank/system-index.md ODER ARCHITECTURE.md → Codebase-Karte
Lies: AGENTS.md                                       → Agent Brief + Standards
Lies: memory-bank/semantic-context.md                 → Systemverständnis (falls vorhanden)
```

---

## 1. Ramsay Persona laden

// turbo
Lies die Persona-Datei:
```
.antigravity/personas/the-refactorer.md
```

---

## 2. Bug reproduzieren & Root Cause finden

Analysiere den Bug:
- Lies die betroffenen Dateien
- Suche nach dem Root Cause (nicht nur dem Symptom!)
- Prüfe git log für kürzliche Änderungen in dem Bereich

```bash
git log --oneline -10 -- [betroffene Datei(en)]
```

**Ramsay-Regel:** "Wenn du den Bug nicht in 5 Minuten findest, suchst du am falschen Ort!"

---

## 3. Fix implementieren

- Schreibe den Fix
- Halte die Änderungen minimal (Hotfix ≠ Refactoring!)
- Kommentiere nicht-offensichtliche Fixes inline

**Ramsay-Regel:** "Fix the dish, don't redesign the kitchen!"

---

## 4. Build & Sync

// turbo
```bash
npm run build
```

// turbo
```bash
npx cap sync ios
```

Bei Build-Fehler: Sofort fixen, kein Weiterleiten.

---

## 5. Auto-Review-Gate

Aktiviere das 3-Persona Review-Gate:

**🖥️ Carmack** (`.antigravity/personas/john-carmack.md`):
- Ist der Fix korrekt und vollständig?
- Gibt es Seiteneffekte?
- Könnte der gleiche Bug an einer anderen Stelle auftreten?

**🛠️ The Refactorer** (`.antigravity/personas/the-refactorer.md`):
- Ist der Fix clean? Naming korrekt?
- Werden SOLID-Prinzipien eingehalten?
- Test für den Fix geschrieben? (Regression verhindern!)

**🛡️ Resilience Engineer** (`.antigravity/personas/resilience-engineer.md`):
- Error Path abgedeckt?
- Graceful Degradation wenn der Fix fehlschlägt?
- Idempotenz bei Edge Functions?

Falls Findings: Zurück zu Schritt 3. Kein Deploy mit offenen Findings.

---

## 6. Edge Function Deploy (falls betroffen)

Nur wenn der Fix eine Edge Function betrifft:

```bash
npx supabase functions deploy [function-name] --project-ref [PROJECT_REF]
```

---

## 7. User informieren

Präsentiere das Ergebnis im Ramsay-Stil:

> "🔥 **HOTFIX DONE.** [Was war kaputt] → [Was wurde gefixt]. Build ✅, Sync ✅. [Optional: Deploy ✅]. Guten Appetit."

Zeige:
- Root Cause (1 Satz)
- Fix (Datei + was geändert)
- Build-Status
- Reversibility Rating
