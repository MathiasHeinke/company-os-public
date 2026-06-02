# 🏗️ Antigravity Plan Execution Template — Referenzmodell v1.0

**Gültig für:** Alle Agenten (Antigravity, Cursor, Windsurf, Claude Code)

> **Dieses Template ersetzt** das alte Plan-Format aus der Cursor-Ära (manuelle Approval-Gates pro Phase + Modell-Empfehlung).
> **Prinzip:** Autonome Execution mit in-line Sherlock-Audit-Gates. Der User gibt EIN Mal "Go" — der Agent feuert alles durch.

---

## Meta-Prinzipien

### 1. Single-Approval-Start
Der User reviewt den **Plan** und gibt **einmalig** Freigabe. Danach läuft die gesamte Execution autonom — Phase für Phase, mit Audit-Gates dazwischen. **Kein User-Prompt zwischen Phasen nötig.**

### 2. Dependency Chain First
Bevor eine einzige Zeile Code beschrieben wird: **Abhängigkeitsanalyse**. Welche Phase braucht welche andere? Daraus ergibt sich die Reihenfolge automatisch.

```
Phase mit 0 Abhängigkeiten → zuerst
Phase die auf Ergebnis von Phase N baut → nach Phase N
Phase mit meisten Abhängigkeiten → zuletzt
```

### 3. Sherlock-Gate nach jeder Phase
Jede Phase endet mit einem **autonomen Audit-Gate**. Der Agent:
1. **Snapshot:** `git tag agentic/phase-N-start` (Rollback-Punkt)
2. Baut (TSC, Lint, Tests)
3. Prüft (Sherlock-Persona: Bugs, Edge Cases, Regressions)
4. Fixt (sofort, inline, ohne User zu fragen)
5. Bei Erfolg: Tag löschen (`git tag -d agentic/phase-N-start`) → Phase N+1
6. Bei Abort: `git reset --hard agentic/phase-N-start` → Abort-Protokoll

### 4. Abort-Protokoll (Wenn ein Gate fundamental fehlschlägt)
Wenn der Sherlock-Gate einen Fehler findet, der **nicht inline fixbar** ist (z.B. architektureller Fehler, falsches Datenmodell, Breaking Change in Phase N das Phase N+1 unmöglich macht):
1. **STOP** — keine weitere Phase starten
2. Betroffene Phase dokumentieren: Was ging schief? Warum ist inline-Fix unmöglich?
3. User benachrichtigen mit: Problem + 2 Lösungsoptionen (A vs. B)
4. Warte auf User-Decision → Plan anpassen → weiter

> [!CAUTION]
> **Auf einem kaputten Fundament weiterbauen ist VERBOTEN.** Lieber 1 Phase Abort als 5 Phasen Müll.

### 4b. Post-Mortem Template (Bei Abort)
Jeder Abort erzeugt ein strukturiertes Post-Mortem für Institutional Memory:

```markdown
## 💀 Post-Mortem: Phase [N] Abort

**Datum:** TT.MM.JJJJ HH:MM
**Phase:** [Name der abgebrochenen Phase]
**Lead-Persona:** [Wer hat gearbeitet?]

### Was ging schief?
[1-3 Sätze: Kernproblem]

### Root Cause
[Warum konnte das nicht inline gefixt werden?]

### User-Decision
[Option A / Option B — was hat der User gewählt?]

### Learnings
[Was sollte der Agent in Zukunft anders machen?]
- [ ] In Plan-Template als Prüfpunkt aufnehmen?
- [ ] In Sherlock-Gate als Check ergänzen?
```

**Persistence:** Post-Mortems werden als `#### ⚠️ Abort: Phase [N] — [Kurzbeschreibung]` in den Session-Log der `architect-memory.md` geschrieben. So hat der nächste Agent sofort Kontext über vergangene Fehlschläge.

### 5. Final System Audit + Wiki
Nach der letzten Phase: Gesamt-Audit über ALLE Änderungen + Wiki/Doku-Update + Architect-Memory-Log + Bug-Hunting-Pass.

### 6. User Test Run Briefing
Ganz am Ende: **Konkrete Test-Anweisungen** für den User. Was soll er wo testen? Worauf achten? Was ist das erwartete Verhalten?

---

## Plan-Struktur (Template)

```markdown
# [Plan-Titel]

> **[N] Features. [N] Sherlock-Audit-Gates. 1 Final System Audit. ~[X]h Gesamtaufwand.**

---

## Execution Order (Abhängigkeitskette)

[ASCII-Diagramm der Phase-Abhängigkeiten]

> [!IMPORTANT]
> Reihenfolge kurz begründen (warum diese Abfolge?)

---

## Phase N: [Titel] (~Xh) — [#Issue-Link] — Complexity: [⭐-⭐⭐⭐⭐⭐]

### Ziel
[1-2 Sätze: Was wird erreicht?]

<!-- Phase-Timing (vom Agent ausgefüllt während Execution):
  Started: HH:MM
  Completed: HH:MM
  Actual vs Estimate: [on-time / over / under]
-->

### Änderungen

#### [MODIFY/NEW/DELETE] [filename](file:///absolute/path)
- [Konkrete Beschreibung der Änderung]
- [Code-Snippets wo nötig (diff-Format bevorzugt)]

### 🔍 Sherlock Gate N
- **Snapshot:** `git tag agentic/phase-N-start` (vor Phase-Start erstellt)
- [Build-Check: Kommando + erwartetes Ergebnis]
- [Prüfpunkte: Was genau wird auditiert?]
- [Edge Cases die geprüft werden]
- Bei Success: `git tag -d agentic/phase-N-start` → weiter zu Phase N+1
- Bei Abort: `git reset --hard agentic/phase-N-start` → Post-Mortem schreiben

---

[... weitere Phasen ...]

---

## 🔍 Final System Audit

### 1. Build
[Exaktes Kommando]

### 2. Full Code Review
[Alle geänderten Dateien + was pro Datei geprüft wird]

### 3. Wiki + Doku Update
[Welche Docs werden wie aktualisiert]
- `architect-memory.md` — Session-Log (PFLICHT bei jeder Änderung)
- `tech-stack-context.md` — Bei neuen Patterns/Architekturen
- `docs/wiki/*.md` — Bei Engine/Formel-Änderungen

### 4. Bug Hunting Pass
[Grep-Checks: Was darf NICHT mehr im Code stehen?]

---

## Verification Plan

### Automated
[Tests, Build-Checks, Grep-Scans]

### User Test Run
> [!IMPORTANT]
> **Worauf du achten sollst:**

1. [Konkreter Schritt + erwartetes Verhalten]
2. [...]
```

---

## Abgrenzung zum alten Cursor-Format

| Aspekt | Alt (Cursor-Ära) | Neu (Agentic v1.0) |
|---|---|---|
| **Approval-Gates** | Pro Phase User-Freigabe nötig | 1× Start-Freigabe, danach autonom |
| **Modell-Empfehlung** | Opus/Sonnet/Fast pro Phase | Entfällt — Agent wählt selbst |
| **Kosten-Strategie** | Im Plan dokumentiert | Entfällt — irrelevant bei Flat-Rate-Agents |
| **Session-Splitting** | Manuell geplant | Entfällt — Agent arbeitet in einer Session durch |
| **Audit** | Optional, am Ende | **Pflicht nach jeder Phase** (Sherlock Gate) |
| **Bug-Fixing** | Separater Task | **Inline** — sofort fixen, dann weiter |
| **Wiki-Update** | "Falls nötig" | **Pflicht** — Teil des Final Audit |
| **Test-Anweisungen** | Fehlen oft | **Pflicht** — konkreter User Test Run Block |
| **Rollback** | Kein Mechanismus | **git tag Snapshot** vor jeder Phase → instant Rollback bei Abort |
| **Abort-Dokumentation** | Nicht vorhanden | **Post-Mortem Template** → Institutional Memory in architect-memory.md |

---

## Integration mit Agentic Router

Dieses Template wird primär von folgenden Chains aktiviert:

| Chain | Wann |
|---|---|
| Chain 2 (Backend) | Carmack → Robot → **+Sherlock Gates** |
| Chain 3 (Hardening) | Sherlock → Ramsay → **+autonome Fixes** |
| Chain 4 (Ship-Ready) | Jobs → Rauno → Carmack → Robot → **+Sherlock Gates** |
| **Chain 6 (Deep Work)** | **[Lead: Carmack/Karpathy/Elon/Steve/Sherlock] → Audit Gate pro Phase → Final: Sherlock + Ramsay** |
| **Solo (≤2 Dateien)** | Carmack oder Rauno allein, kein Template nötig |

> [!IMPORTANT]
> **Jede Chain mit ≥3 Dateien MUSS dieses Template nutzen.** Keine Ausnahme.
> Entscheidungsmatrix "Wann das Template verwenden?" → siehe `system-prompt.md` §PLAN-FORMAT.
