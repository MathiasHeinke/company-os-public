# 🧠 Memory Bank — Antigravity Working Memory

> **Zweck:** Persistentes Arbeitsgedächtnis für den AI-Agenten.
> Diese Dateien werden bei **jedem Konversationsstart** automatisch geladen und am **Ende jeder Session** aktualisiert.

## Dateien

| Datei | Zweck | Update-Frequenz |
|---|---|---|
| `system-index.md` | Layer-0.5 Boot-Karte und Domain-Router | Bei neuen Domaenen oder Boot-Regeln |
| `projectbrief.md` | Projektziel, Scope, Core Directives | Selten (bei Scope-Änderungen) |
| `productContext.md` | Warum existiert dieses Projekt? Target Users? | Selten |
| `systemPatterns.md` | Architektur, Patterns, Konventionen | Bei Architektur-Änderungen |
| `techContext.md` | Tech Stack, Dependencies, APIs | Bei Stack-Änderungen |
| `activeContext.md` | Woran wird JETZT gearbeitet? Nächste Schritte | **Jede Session** |
| `progress.md` | Was ist fertig? Was ist offen? Known Issues | **Jede Session** |
| `sessionLog.md` | Chronologisches Protokoll aller Sessions | **Jede Session** |

## Boot-Sequenz (für NOUS / alle Personas)

```
Bei Konversationsstart:
1. Lies memory-bank/system-index.md → Welche Domaene ist relevant?
2. Lies memory-bank/activeContext.md → Was war der letzte Stand?
3. Lies memory-bank/progress.md → Was ist offen?
4. Lies memory-bank/systemPatterns.md → Welche Patterns gelten?
5. (Optional) Lies memory-bank/techContext.md bei technischen Tasks
```

## Session-Ende Protokoll

```
Vor Session-Ende:
1. Update activeContext.md → Aktueller Stand + nächste Schritte
2. Update progress.md → Erledigtes nach "Completed", Neues nach "In Progress"
3. Schreibe sessionLog.md → Kurzer Eintrag mit Datum, Thema, Ergebnis
```

## Integration mit architect-memory.md

Die Memory Bank **ergänzt** `architect-memory.md`, ersetzt es nicht:
- `architect-memory.md` = **Strategische** Entscheidungen (Guardrails, Decision Records)
- `memory-bank/` = **Operativer** Arbeitskontext (Was tun wir gerade? Was ist fertig?)
