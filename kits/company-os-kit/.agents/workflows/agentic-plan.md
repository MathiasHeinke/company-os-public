---
description: Autonome Multi-Phase Plan Execution mit maximaler Detailtiefe, Feasibility Probes, EVAL-Gates, Fortress-Lite und automatischem Deep Audit Abschluss
---

// turbo-all

# 🏗️ Agentic Plan v3.0 — Modular Execution Pipeline

> **KERNPRINZIP: Jeder Plan ist so detailliert, dass ein fremder Agent ihn BLIND ausführen könnte.**
>
> Dieser Workflow PLANT und BAUT. Die Qualitätssicherung danach übernimmt `/deep-audit`.
> Am Ende dieses Workflows wird `/deep-audit --scope=plan-changes` **automatisch** getriggert.

```
/agentic-plan [Feature/Aufgabe]
Optionen: --fortress (erzwingt Fortress-Baseline), --no-fortress (deaktiviert)
```

```
Pipeline:  Context → Probes → Plan → Approval → Execute → Final EVAL → /deep-audit
```

---

## 🔴 5 UNVERHANDELBARE REGELN

1. **MAXIMALE DETAILTIEFE** — "Passe die Funktion an" ist VERBOTEN. Exakte Signaturen, Types, Diffs. Detail > Kürze.
2. **FEASIBILITY VOR PLAN** — Jede Annahme gegen echten Code verifizieren. "Ich nehme an" = Planfehler.
3. **EVAL = BEWEISFÜHRUNG** — Exakte Commands + exakte Expected Outputs. Kein vages "funktioniert".
4. **KEIN CODE VOR USER-APPROVAL** — Plan präsentieren → User gibt Go → DANN erst bauen.
5. **ABORT > WEITERBAUEN** — Kaputtes Fundament → STOP + Post-Mortem. Nie auf Fehlern aufbauen.

---

## Phase 0: Context & Scope (~15min)

### 0.1 Kontext laden (PFLICHT)

```text
PFLICHT-LEKTÜRE (in dieser Reihenfolge — KEINE überspringen):
1. memory-bank/activeContext.md       → Aktueller Arbeitsstand
2. memory-bank/progress.md            → Was fertig, was offen
3. memory-bank/system-index.md        → Boot-Index (Codebase-Karte)
   ODER ARCHITECTURE.md               → (falls system-index nicht existiert)
4. DESIGN.md                          → Design System (bei UI-Tasks)
5. AGENTS.md                          → Agent Brief + Coding Standards
6. .antigravity/logs/architect-memory.md → Active Directives + Post-Mortems
7. memory-bank/semantic-context.md    → Gewachsenes Systemverständnis (falls vorhanden)
```

ZUSÄTZLICH bei spezifischen Domänen:
- Backend/Engine → Relevante Wiki-Dateien aus system-index.md Wiki-Index
- UI/Design → `.antigravity/personas/steve-jobs.md` + `DESIGN.md` (PFLICHT!)
- AI/Coach → Wiki: `ai-coach-system.md`
- Security → `.antigravity/personas/mr-robot.md` + `cypher-sre.md`

### 0.2 Scope-Analyse

Beantworte JEDE Frage — keine darf leer bleiben:

| # | Frage | Antwort |
|---|-------|---------|
| 1 | WAS will der User? (Feature, Bugfix, Umbau, Migration?) | |
| 2 | WARUM? (Business-Kontext, User-Pain, Tech-Debt?) | |
| 3 | WELCHE Dateien DIREKT betroffen? (absoluter Pfad + 1-Satz-Änderung) | |
| 4 | WELCHE Dateien INDIREKT betroffen? (Imports, Types, Tests, UI-Consumer) | |
| 5 | WELCHE Dependencies? (DB→EF→Frontend? Packages? ENV-Vars?) | |
| 6 | WELCHE Risiken? (Breaking Changes? Performance? Security? Downtime?) | |
| 7 | WAS ist NICHT im Scope? (Explizit ausschließen) | |

### 0.3 Dependency-Chain

```text
Phase mit 0 Abhängigkeiten → zuerst
Phase die auf Output von Phase N baut → nach Phase N

PRO DEPENDENCY: Warum? Was genau wird gebraucht? Parallel möglich?
```

Erstelle ASCII-Diagramm:
```text
Phase 1 (DB) ──→ Phase 2 (Edge Function)
             ╲──→ Phase 3 (Types) ──→ Phase 4 (Frontend)
```

### 0.4 Lead-Persona pro Phase

| Task-Domäne | Lead-Persona |
|---|---|
| Backend/Engine/DB | 🖥️ John Carmack |
| UI/UX/Design | 🖤 Steve Jobs + ⚛️ The React Architect |
| Fullstack | Carmack + Rauno (alternierend) |
| Strategie/Architektur | 🧠 Karpathy |
| Deletion/Vereinfachung | 🚀 Elon Musk |
| Security | 🕵️ Mr. Robot + Cypher |
| Testing/Audit | 🔍 Sherlock Holmes |

---

## Phase 1: 🔬 Feasibility Probes (~15min)

> [!CAUTION]
> **KEIN Plan ohne Probes. Jeder geplante Eingriff wird gegen den echten Code validiert.**

### Probe-Typen

**Typ A — Signatur-Probe:** Für jede zu ändernde Funktion/Klasse/Hook:
- Datei öffnen → EXAKTE aktuelle Signatur dokumentieren
- Wo wird sie importiert/aufgerufen? (grep)
- Welche Side Effects? (DB, API, State)
- → "Signatur X → Y, Impact auf Z Aufrufer"

**Typ B — Schema-Probe:** Für jede DB-Änderung:
- Aktuelles Schema (Tabelle, Spalten, Typen, Constraints, Indizes)
- RLS Policies, Foreign Keys, Cascades
- Edge Functions die diese Tabelle lesen/schreiben
- → "Migration XY kompatibel mit Schema"

**Typ C — Import-Graph-Probe:** Für jede strukturelle Datei-Änderung:
- grep: Wer importiert aus dieser Datei?
- Welche Imports brechen bei Änderung?
- → "Änderung an X bricht Import in Y"

**Typ D — Runtime-Probe:** Für Laufzeit-Annahmen:
- Existierende Tests? Edge Cases (null, undefined, [])?
- Error Boundaries / try-catch?

**Typ E — Env/Config-Probe:** Für Environment-Annahmen:
- ENV-Variablen benötigt? Existieren sie?
- Config-Dateien die angepasst werden müssen?

### Probe-Dokumentation

```markdown
### Probe [N]: [Typ] — [Ziel]
- **Datei:** [absoluter Pfad]
- **Aktuell:** `[exakte Signatur/Schema/Import]`
- **Geplant:** `[neue Signatur/Schema/Import]`
- **Impact:** [X Aufrufer/Importeure betroffen]
- **Feasibility:** ✅ Machbar / ⚠️ Anpassungen nötig / ❌ Nicht machbar
- **⚠️/❌ → Lösung:** [Was muss am Plan geändert werden?]
```

> [!IMPORTANT]
> **❌-Probe → Plan STOPP.** Plan umschreiben bis alle ✅ oder ⚠️ (mit Lösung).

---

## Phase 2: Plan schreiben (~30min)

> **Der Plan ist das Artefakt. Er MUSS so präzise sein, dass Code nur mechanisches Abtippen ist.**

### Plan-Struktur (PFLICHT — jeder Abschnitt muss vorhanden sein)

```markdown
# [Plan-Titel]

> **[N] Phasen. [N] EVAL-Gates. [N] Probes durchgeführt.**
> **Geschätzter Gesamtaufwand: ~[X]h.**

---

## Zusammenfassung

### Was wird gebaut?
[3-5 Sätze: Business-Kontext + technische Lösung]

### Warum?
[2-3 Sätze: Problem das gelöst wird]

### Architektur-Überblick
[Mermaid oder ASCII: Wie die Komponenten zusammenspielen]

### Impact-Matrix
| Modul/Datei | Änderungstyp | Complexity | Risiko |
|-------------|-------------|------------|--------|
| [abs. Pfad] | MODIFY/NEW/DELETE | ⭐-⭐⭐⭐⭐⭐ | 🟢/🟡/🔴 |

### Nicht im Scope
[Explizit ausschließen]

---

## Feasibility Probes — Zusammenfassung
[Alle Probe-Ergebnisse, nur ⚠️ hervorheben + deren Lösung]

---

## Execution Order
[ASCII-Diagramm + Begründung der Reihenfolge]
```

### Phase-N Template (PFLICHT pro Phase)

Jede Phase im Plan MUSS diese Sektionen enthalten:

```markdown
## Phase N: [Titel] (~Xh) — Complexity: ⭐–⭐⭐⭐⭐⭐ — Risiko: 🟢/🟡/🔴

### Ziel
[2-4 Sätze: Was + Warum]

### Vorbedingungen
- [ ] Phase X EVAL bestanden
- [ ] [Konkreter Output] existiert
- [ ] Build kompiliert fehlerfrei

### Änderungen

#### [MODIFY/NEW/DELETE] [filename](file:///absolute/path)

**Aktuell** (Probe [N]):
```typescript
// EXAKTE aktuelle Signatur
```

**Geplant:**
```diff
- [Ist-Zustand]
+ [Soll-Zustand]
```

**Neue/Geänderte Types:**
```typescript
interface NewType {
  id: string;           // UUID, auto-generated
  name: string;         // User-provided, max 255
  status: 'active' | 'inactive';  // Default: 'active'
}
```

**Neue/Geänderte Funktionen:**
```typescript
async function newFunction(
  param1: Type1,     // [Constraints]
  param2?: Type2,    // [Default, Beschreibung]
): Promise<ReturnType> {
  // Schritt 1: [Was]
  // Error: [Welcher] → [Behandlung]
  // Edge Case: [Was wenn null?] → [Verhalten]
}
```

**Error Handling:**
| Szenario | Auslöser | Behandlung | User-Feedback |
|----------|----------|------------|---------------|

**Edge Cases:**
| Case | Input | Erwartetes Verhalten |
|------|-------|----------------------|

**Import-Änderungen:**
```diff
+ import { NewType } from '@/types/newModule';
- import { OldThing } from '@/lib/oldModule';
```

### Data Flow
```text
[User Action] → [Component] → [Hook] → [API] → [EF] → [DB] → [Response] → [UI]
```

### Failure Modes
| Mode | Wahrscheinlichkeit | Impact | Mitigation |
|------|-------------------|--------|------------|

### 🏰 EVAL Gate N

#### ✅ Acceptance (MIND. 5 — binär prüfbar)
- [ ] [Exaktes Kriterium mit konkreten Werten]
- [ ] [Typ X hat Properties a, b, c]
- [ ] [Funktion Y wirft TypeError bei null]
- [ ] [Import in Datei A kompiliert]
- [ ] [Funktionaler Test mit Schritt→Ergebnis]

#### 🚫 Rejection (MIND. 3)
- [ ] Kein `any` in neuen TS-Dateien
- [ ] Keine hardcoded URLs/Secrets
- [ ] Kein try-catch ohne Logging

#### 🧪 Tests (MIND. 3 — mit Expected Output)
```bash
npm run build 2>&1 | tail -5
→ EXPECTED: "Build completed successfully"

npx tsc --noEmit 2>&1 | grep -c "error TS"
→ EXPECTED: 0

grep -rn "any" [neue-dateien] --include="*.ts"
→ EXPECTED: 0 Treffer
```
```

### Final Session EVAL Template

```markdown
## 🏰 Final Session EVAL

### ✅ Acceptance (ALLE müssen PASS)
- [ ] `npm run build` / `tsc --noEmit` → 0 errors
- [ ] Alle Phase-EVALs: PASS (mit Beweisen)
- [ ] Grep-Checks clean:
  ```bash
  grep -rn "any" [geänderte-dateien] --include="*.ts" --include="*.tsx"
  grep -rn "console.log" [geänderte-dateien] --include="*.ts" --include="*.tsx"
  grep -rn "TODO\|FIXME\|HACK\|XXX" [geänderte-dateien]
  grep -rn "password\|secret\|api.key\|token" [geänderte-dateien] --include="*.ts"
  ```
- [ ] Data Flow: Eingabe→Persistenz durchgetestet
- [ ] Error Handling: Mind. 1 Error-Pfad verifiziert

### 🚫 Rejection (EINE → FAIL)
- [ ] Unresolved `any`
- [ ] `console.log` in Production-Pfaden
- [ ] Hardcoded Secrets/Keys/URLs
- [ ] Fehlende Error Boundaries auf async Ops
- [ ] Breaking Change ohne Migration
- [ ] Nicht-verifizierte Annahmen (Probe fehlend/❌)
```

### Detail-Checkliste (vor Plan-Abgabe)

```text
□ JEDE Phase hat ≥5 Acceptance + ≥3 Rejection + ≥3 Test Commands?
□ JEDE Datei mit absolutem Pfad referenziert?
□ ALLE Interfaces VOLLSTÄNDIG (jedes Property)?
□ ALLE Funktionen mit Signatur + Logik?
□ ALLE Error-Szenarien + Edge Cases dokumentiert?
□ JEDE Datei-Änderung hat Import-Sektion?
□ Data Flow + Failure Modes pro Phase?
□ JEDE Annahme durch Probe validiert? (kein ❌)
□ Final Session EVAL vorhanden?
```

---

## Phase 3: User-Approval

> [!IMPORTANT]
> **EINMALIGE Freigabe.** User reviewt den Plan und gibt "Go". Danach autonom.

Präsentiere:
- Vollständiger Plan (ungekürzt)
- Probe-Ergebnisse (Zusammenfassung)
- Dependency-Diagramm
- Impact-Matrix
- Geschätzte Dauer
- Bekannte Risiken + Mitigations

**Gate:** Kein Code vor User-Approval. Nicht verhandelbar.

---

## Phase 4: Autonome Execution (Loop pro Phase)

### 4.1 Fortress Baseline (Optional — nur bei `--fortress` Flag)

```text
Falls --fortress:
  1. /fortress-audit Stage 1 (Baseline E2E)
  2. Baseline-Snapshot speichern
  3. Baseline-Failures sofort fixen
→ Baseline muss sauber sein bevor Code gebaut wird.
```

### 4.2 Execution Loop (für JEDE Phase im Plan)

```text
┌─────────────────────────────────────────┐
│  PRE-FLIGHT → EXECUTE → EVAL → GATE    │
│       ↑                          │      │
│       └──── Bei FAIL: Fix ───────┘      │
│              Bei 2x FAIL: ABORT         │
└─────────────────────────────────────────┘
```

#### Schritt A: PRE-FLIGHT Check

```text
Vor JEDER Phase — kein Skip:
1. □ Vorbedingungen erfüllt?
2. □ Dateien existieren am erwarteten Pfad?
3. □ Signaturen/Types stimmen noch mit Probes überein?
4. □ Build kompiliert fehlerfrei?

Bei ❌: STOP → Abweichung dokumentieren → Plan für DIESE Phase anpassen → dann starten.
```

#### Schritt B: Git Snapshot + Execute

```bash
git tag agentic/phase-N-start
```

- Lead-Persona aktivieren
- Code bauen **exakt** gemäß Plan
- Jede Änderung gegen Plan abgleichen (Interfaces? Signaturen? Error Handling? Edge Cases?)
- Build prüfen nach jeder signifikanten Änderung

#### Schritt C: EVAL Gate (BEWEISFÜHRUNG)

```text
Pro Acceptance Criterion:
  1. Test Command ausführen
  2. Output EXAKT dokumentieren
  3. Expected vs. Actual vergleichen
  4. Verdict: ✅ oder ❌

Pro Rejection Criterion:
  1. Anti-Pattern-Check ausführen
  2. Bei Fund: sofort fixen

EVAL-Dokumentation:
| # | Criterion | Command | Expected | Actual | Verdict |
|---|-----------|---------|----------|--------|---------|
| A1 | ... | ... | ... | ... | ✅/❌ |
| R1 | ... | ... | keine Treffer | ... | ✅/❌ |
```

#### Schritt D: Fortress-Gate (nach jeder Phase)

```text
Sherlock prüft ALLE geänderten Dateien:
  ① Build fehlerfrei?
  ② Keine Regressions?
  ③ Error Handling komplett? (async → try/catch, throw gefangen)
  ④ Edge Cases bedacht? (null, undefined, [])
  ⑤ Type Safety? (kein any, keine unbegründeten Assertions)
  ⑥ Naming konsistent?
  ⑦ Kein Dead Code erzeugt?
  ⑧ Keine Performance-Anti-Patterns? (N+1, unnötige Re-Renders)
  ⑨ Security: Keine PII-Leaks, keine hardcoded Secrets?
  ⑩ Plan-Konformität?

Dokumentiere als 10-Punkte-Tabelle mit ✅/❌.
```

#### Schritt E: Phase-Abschluss

**Bei ✅ PASS:**
```bash
git tag -d agentic/phase-N-start
git add -A && git commit -m "checkpoint: Phase [N] — [summary]"
```
→ Weiter zur nächsten Phase.

**Bei ❌ FAIL (inline fixbar):**
- Fix → EVAL + Gate komplett wiederholen
- Max 2 Fix-Versuche, dann ABORT

**Bei ❌ FAIL (nicht fixbar = ABORT):**

```markdown
## 💀 Post-Mortem: Phase [N] Abort

**Phase:** [Name] | **Lead:** [Persona] | **Datum:** [TT.MM.JJJJ]

### Was ging schief?
[WARUM, nicht "hat nicht funktioniert"]

### Root Cause
[Warum nicht inline fixbar? Welcher Probe hat das nicht abgefangen?]

### Divergenz zum Plan
[Plan vs. Realität]

### Optionen
[A: Beschreibung + Aufwand + Risiko]
[B: Beschreibung + Aufwand + Risiko]

### Learnings
[Was in Zukunft anders? Welcher Probe-Typ hätte geholfen?]
```

→ Post-Mortem in `architect-memory.md`
→ `git reset --hard agentic/phase-N-start`
→ User informieren, auf Decision warten

> [!CAUTION]
> **Auf kaputtem Fundament weiterbauen ist VERBOTEN.** Lieber 1 Phase Abort als 5 Phasen Müll.

---

## Phase 5: Final EVAL & Delivery

### 5.1 Final Session EVAL

Führe das Final Session EVAL aus dem Plan durch (Acceptance + Rejection + Test Suite).

### 5.2 Plan-Konformitäts-Check

```text
Pro Phase:
  → Wie geplant gebaut? ✅
  → Abweichung? ⚠️ → Dokumentiert + begründet?
  → Nicht gebaut? ❌ → Warum?
  → Zusätzlich gebaut? → Warum?

Ergebnis: Plan-Konformitäts-Score [X/Y Phasen plankonform]
```

### 5.3 Bug Hunting Pass

```bash
# Console.log in Production
grep -rn "console\.log" [geänderte-dateien] --include="*.ts" --include="*.tsx"

# Any in TypeScript
grep -rn ": any\|as any\|<any>" [geänderte-dateien] --include="*.ts" --include="*.tsx"

# Unresolved TODOs
grep -rn "TODO\|FIXME\|HACK\|XXX\|TEMP" [geänderte-dateien]

# Hardcoded Secrets
grep -rn "password\|secret\|api.key\|bearer\|token.*=.*['\"]" [geänderte-dateien] --include="*.ts"

# Leere Catch-Blöcke
grep -A1 "catch" [geänderte-dateien] --include="*.ts" --include="*.tsx" | grep -B1 "^\s*}"

# Unused Imports
npx tsc --noEmit 2>&1 | grep "declared but"
```

### 5.4 User Delivery Briefing

```markdown
## 🏗️ Agentic Plan: [Feature] — Execution Complete

### Was wurde gebaut
[Zusammenfassung aller Phasen — WAS, nicht WIE]

### Plan-Konformität: [X/Y] Phasen plankonform
| Phase | Abweichung | Begründung |
|-------|-----------|------------|

### EVAL-Ergebnisse
| Phase | Acceptance | Rejection | Tests | Verdict |
|-------|-----------|-----------|-------|---------| 
| 1 | 5/5 ✅ | 3/3 ✅ | 3/3 ✅ | ✅ PASS |

### Fortress-Gates
| Phase | Verdict | Issues |
|-------|---------|--------|
| 1 | ✅ CLEAR | — |

### Quality Summary
| Gate | Status |
|------|--------|
| EVAL-Gates | ✅ [N/N] passed |
| Fortress-Gates | ✅ [N/N] cleared |
| Final EVAL | ✅ |
| Bug Hunting | ✅ 0 Violations |
| Build | ✅ Clean |

### ⏭️ Nächster Schritt: Automatischer Deep Audit
```

---

## Phase 6: 🔬 Exit → Deep Audit (AUTOMATISCH)

> [!CAUTION]
> **KEIN SKIP. Der Deep Audit ist der Qualitäts-Abschluss des Agentic Plan.**
> Erst nach Deep Audit + dessen Hotfix-Stage → `/ship-it`.

### 6.1 Scope bestimmen

```bash
git diff --name-only [plan-start-commit] HEAD
```

### 6.2 Deep Audit triggern

Führe `/deep-audit` aus mit Scope = alle geänderten/neuen Dateien seit Plan-Start.

Der Deep Audit übernimmt:
- **Stage 2-3:** Static + Smart Scan aller geänderten Dateien
- **Stage 4:** Multi-Lens Review (Sherlock + Mr. Robot + Elon + optional Carmack)
- **Stage 5:** Verdict + Konsolidierung
- **Stage 6:** Hotfix aller Findings (Critical + Warning + Dead Code)
- **Stage 7:** Verify (Build + detect_changes + Anti-Pattern Re-Check)
- **Stage 8:** Audit Report + Memory Bank Update

### 6.3 Nach Deep Audit

```text
Deep Audit ✅ PASS → /ship-it (Commit, Push, Deploy)
Deep Audit ❌ FAIL → Hotfix-Loop im Deep Audit Workflow
```

---

## Phase 7: Memory Update (Session-Ende)

> Wird EINMAL am Session-Ende ausgeführt, nicht pro Phase.

### 7.1 activeContext.md aktualisieren

```markdown
### [Datum] — Agentic Plan: [Feature]
**Phasen:** [N] completed, [M] plankonform
**Geänderte Module:** [Liste]
**Erkenntnisse:** [Was über das System gelernt]
**Entscheidungen:** [Was + Warum]
**Plan-Abweichungen:** [Was angepasst + Warum]
**Deep Audit:** [N] Findings fixed, [M] LOC entfernt
```

### 7.2 Weitere Updates

- `memory-bank/progress.md` → Completed Items
- `architect-memory.md` → Session-Log (bei Abweichungen/Learnings/Post-Mortems)
- `memory-bank/semantic-context.md` → Systemverständnis erweitern
- `tech-stack-context.md` → Bei neuen Patterns/Architekturen
- `docs/wiki/*.md` → Bei Engine/Formel-Änderungen

### 7.3 Git + Ship

```bash
git add -A && git commit -m "ship: [Feature] — [N] phases, deep audit clean"
```

→ `/ship-it` wenn User bereit ist.

---

## Anti-Halluzination Protokoll

### Context Checkpoints

Nach JEDER abgeschlossenen Phase:
1. **Git Checkpoint** — `git add -A && git commit -m "checkpoint: Phase [N]"`
2. **Plan re-lesen** — relevante Abschnitte der NÄCHSTEN Phase laden
3. Bei langen Plans (>4 Phasen): Informiere User:
   > "Phase [X/N] fertig. Antworte mit 'Weiter' für frischen Kontext."
4. Beim Neustart: Plan RE-LESEN, ✅ Phasen überspringen, letzte Phase prüfen.

### 17 Harte Regeln

1. **Kein Code vor User-Approval** — Phase 3 Gate ist absolut
2. **Pre-Flight Check vor JEDER Phase** — auch bei "trivialen"
3. **EVAL = Terminal-Output** — nicht "sieht OK aus"
4. **Fortress-Gate nach JEDER Phase** — 10-Punkte-Check
5. **Abort > Weiterbauen** — kaputtes Fundament → STOP
6. **Post-Mortems werden IMMER geschrieben**
7. **JEDE Annahme durch Probe belegt** — "ich nehme an" VERBOTEN
8. **Detail-Checkliste bestanden** bevor Plan dem User gezeigt wird
9. **Deep Audit ist PFLICHT nach Plan-Completion** — automatisch getriggert
10. **Deep Audit fixt ALLE Findings** — nicht nur Criticals
11. **Dead Code LÖSCHEN, nicht markieren**
12. **Security-Findings haben IMMER Priority** — Mr. Robot vor Sherlock vor Elon
13. **Max 2 Fix-Versuche pro Phase** — dann ABORT
14. **Git Tags für Rollback** — `agentic/phase-N-start` vor jeder Phase
15. **Memory Update am Session-Ende** — nicht pro Phase
16. **Plan-Konformität dokumentieren** — Abweichungen OK wenn begründet
17. **Kein Phase-Skip** — auch "triviale" Phasen durchlaufen EVAL + Gate
