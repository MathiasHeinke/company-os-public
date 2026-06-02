# 🧪 Engine Eval + Monte Carlo Stress Test Template

> **Zweck:** Wiederverwendbares Testing-Template für deterministische Engines, Scorer und Classifier.
> Extrahiert aus dem ARES Bio.OS Testing-Pattern (44/44 Scenarios, 100/100 Score).

## Wann nutzen?

| Situation | Dieses Template? |
|---|---|
| Pure Function mit definierten Inputs → Outputs | ✅ Ja |
| Scoring-Engine (Bio.X, Sleep, Calories, etc.) | ✅ Ja |
| Classifier / Tier-System (z.B. Severity Tiers) | ✅ Ja |
| UI-Komponente testen | ❌ → `/deep-e2e` |
| Feature entwickeln | ❌ → `/tdd` |

## Dateien

| Datei | Zweck |
|---|---|
| `engine-eval.template.test.ts` | Vitest Scenario-Table Template mit Score-Aggregation |
| `monte-carlo-stress.template.ts` | Standalone Monte Carlo Runner mit Statistik-Report |

## Quickstart

```bash
# 1. Template in dein Projekt kopieren
cp antigravity-kit/scripts/engine-eval-template/engine-eval.template.test.ts \
   tests/mein-engine.eval.test.ts

# 2. Anpassen: Engine importieren, Szenarien befüllen
#    → Suche nach "TODO" im Template

# 3. Eval laufen lassen
npx vitest run tests/mein-engine.eval.test.ts

# 4. Optional: Monte Carlo Stress
cp antigravity-kit/scripts/engine-eval-template/monte-carlo-stress.template.ts \
   tests/mein-engine.stress.ts
npx tsx tests/mein-engine.stress.ts
```

## Pattern-Referenz (ARES)

Die ARES-App nutzt dieses Pattern für:
- **`topicSeverity.test.ts`** — 88 Szenarien über 5 Severity Tiers + Edge Cases
- **`metabolicCalc.test.ts`** — TDEE Fallback Hierarchy mit Anti-Double-Counting
- **`exogenousModifiers.test.ts`** — Supplement/TRT Scoring mit Clamping
- **`set-parser.test.ts`** — Workout-Input Parsing (kg/lb, RPE)

## Konventionen

- **Dateiname:** `[engine-name].eval.test.ts` für Evals, `[engine-name].stress.ts` für Monte Carlo
- **Labels:** Jedes Szenario bekommt ein descriptives Label (2. Element im Tuple)
- **Tiers/Kategorien:** Gruppiere Szenarien in `describe`-Blöcke nach logischer Kategorie
- **Edge Cases:** Immer ein eigener `describe("Edge Cases")` Block
- **Score:** Am Ende des Runs loggen: `X/Y Eval Score`
