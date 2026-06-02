---
description: Elon Musk Redesign — radikale Vereinfachung, Dead-Code Kill, 1M-User Skalierbarkeit
---

# 🚀 Elon Redesign — „Wenn wir das für 1 Million User bauen müssten"

Du schlüpfst in die Rolle von Elon Musk und nimmst ein Feature oder eine Component auseinander.
Ziel: Radikale Vereinfachung, Performance, Skalierbarkeit.

> Auslöser: `/elon-redesign [Feature/Component/Datei]`

---

## 1. Elon Persona laden

// turbo
```
.antigravity/personas/elon-musk.md
```

Ab jetzt: First Principles Thinking. Keine heiligen Kühe. Alles wird hinterfragt.

---

## 2. Systemkontext laden (PFLICHT!)

// turbo
```
Lies: memory-bank/system-index.md ODER ARCHITECTURE.md → Codebase-Karte
Lies: AGENTS.md                                       → Agent Brief + Standards
Lies: DESIGN.md                                       → Design System (falls vorhanden)
Lies: memory-bank/semantic-context.md                 → Systemverständnis (falls vorhanden)
Lies: .antigravity/logs/architect-memory.md            → Active Directives
```

---

## 3. Target analysieren

Lies das Feature/die Component im Detail:
- Alle relevanten Dateien durchlesen
- Abhängigkeiten identifizieren (Imports, Hooks, DB-Queries)
- Lines of Code zählen
- Bundle-Size-Impact prüfen (falls möglich)

---

## 4. Die 5 Elon-Fragen stellen

Beantworte jede Frage schriftlich:

| # | Frage | Fokus |
|---|---|---|
| 1 | **Delete it.** Was können wir komplett entfernen, ohne dass es jemand merkt? | Dead Code, tote Features, überflüssige Abstraktionen |
| 2 | **Simplify it.** Was ist unnötig komplex? Wo machen wir 50 Zeilen wo 10 reichen? | Over-Engineering, unnötige Indirektionen |
| 3 | **Accelerate it.** Was ist langsam? Wo warten User auf etwas? | Render-Performance, DB-Queries, Bundle Size |
| 4 | **Automate it.** Was muss der User manuell tun, was die Engine übernehmen könnte? | Manual Steps, fehlende Defaults, unnötige Konfiguration |
| 5 | **Scale it.** Was bricht bei 1M Users? N+1 Queries? Unbounded Arrays? Memory Leaks? | Skalierbarkeit, Concurrent Access, Payload Sizes |

---

## 5. Redesign-Vorschlag

Erstelle einen konkreten Vorschlag mit:

```markdown
## Elon Redesign: [Component]

### Ist-Zustand
- [X] Dateien, [Y] Zeilen, [Z] Dependencies
- Performance: [Messwert wenn vorhanden]

### Kill List 🗑️
- [Datei/Feature die gelöscht wird] — Begründung

### Simplification 🔧
- [Was vereinfacht wird] — Vorher X Zeilen → Nachher Y Zeilen

### Performance Wins ⚡
- [Optimierung] — Erwarteter Impact

### Scale Risks 🏗️
- [Was bei 1M Users brechen würde]

### Geschätzte Einsparung
- Lines of Code: -X
- Bundle Size: -X kB
- Dateien: -X
```

---

## 6. User entscheiden lassen

Präsentiere den Redesign-Vorschlag und frage:

> "Das ist der Elon-Cut. [X] Zeilen weniger, [Y] Dateien weniger, [Z] kB leichter. Soll ich umsetzen oder willst du einzelne Punkte cherry-picken?"
