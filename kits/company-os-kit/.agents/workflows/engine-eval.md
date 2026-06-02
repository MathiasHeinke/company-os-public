---
description: Engine Eval — Scenario-Table Testing + Monte Carlo Stress für deterministische Engines/Scorer
---

# 🧪 Engine Eval — Scenario Tables + Monte Carlo Stress

Validiert deterministische Engines, Scorer und Classifier mit gelabelten Szenarien und randomisiertem Stress-Testing.

> Auslöser: `/engine-eval [Engine/Scorer]`

---

## 1. Engine identifizieren

// turbo
```
Identifiziere die zu testende Engine/Funktion.
Lies den Source Code und bestimme:
  - Input-Type (alle Felder, Optionals, Defaults)
  - Output-Type (Felder, Ranges, Constraints)
  - Interne Logik (Fallback-Hierarchie, Tier-System, Clamping, etc.)
```

---

## 2. Template kopieren & anpassen

// turbo
```
Kopiere: antigravity-kit/scripts/engine-eval-template/engine-eval.template.test.ts
→ tests/[engine-name].eval.test.ts

Fülle die TODO-Marker aus:
  - Engine-Import + Factory-Function (makeInput)
  - Scenario Tables pro Tier/Kategorie
  - Edge Cases
  - Output Structure Validation
  - Priority/Precedence Rules
```

---

## 3. Szenarien definieren

Erstelle gelabelte Szenarien für JEDE logische Kategorie:

| Szenario-Typ | Beispiel (ARES) |
|---|---|
| Happy Path pro Tier | "Dianabol" → Tier 4, "Kreatin" → Tier 2 |
| Grenzwerte | 500mg threshold, Clamping [-20, +15] |
| Null/Empty Inputs | Leerer String → Default/Tier 0 |
| Konflikte | "Kreatin + Tren" → höchster Tier gewinnt |
| Known Limitations | Dokumentiert als Test, nicht als Failure |

**Faustregel:** Mindestens 5 Szenarien pro Kategorie, mindestens 3 Edge Cases.

---

## 4. Eval laufen lassen

// turbo
```bash
npx vitest run tests/[engine-name].eval.test.ts
```

**Ziel:** 100/100 Score.

Bei Failures:
1. Ist der Test falsch? → Test fixen
2. Ist die Engine falsch? → Engine fixen (TDD-Style: Test hat Recht)
3. Known Limitation? → Dokumentiere als `KNOWN LIMITATION` Test

---

## 5. Monte Carlo Stress Test

// turbo
```
Kopiere: antigravity-kit/scripts/engine-eval-template/monte-carlo-stress.template.ts
→ tests/[engine-name].stress.ts

Fülle die TODO-Marker aus:
  - generateRandomInput() mit den realen Input-Ranges
  - validateOutput() mit den realen Output-Constraints
  - Konfiguriere iterations (Default: 10.000)
```

// turbo
```bash
npx tsx tests/[engine-name].stress.ts
```

**Prüfe:**
- 0 Crashes
- 0 Validation Failures
- p95 Timing < maxCallTimeMs

---

## 6. Ergebnis dokumentieren

```
Logge das Eval-Ergebnis in:
  - memory-bank/progress.md (Score + Datum)
  - memory-bank/activeContext.md (falls relevant)
```

**Format:**
```md
### Engine Eval: [Engine-Name]
- Eval Score: X/Y (100/100)
- Monte Carlo: 10.000 iterations, 0 crashes, p95: Xms
- Date: [ISO Date]
```

---

## Eiserne Regeln

> [!CAUTION]
> Diese Regeln sind NICHT verhandelbar.

1. **Jedes Szenario bekommt ein Label** → Kein anonymer Test-Case
2. **Edge Cases sind PFLICHT** → Empty, null, extreme values, conflicts
3. **Known Limitations werden dokumentiert, nicht ignoriert**
4. **Monte Carlo ist KEIN Ersatz für Scenario Tables** → Beides zusammen
5. **Score < 100 → Nicht shippen** → Erst fixen, dann committen
