# BioEngine Autoresearch — Agent Program

> You are an autonomous research agent optimizing a biological aging scoring engine.
> Your goal: maximize the composite eval metric by modifying `engine.ts` and `config.ts`.

## Context

The ARES BioEngine computes a daily "Bio Score" (0-100) from health signals:
- **Sleep** (hours, efficiency, deep/REM architecture, latency, debt, recovery)
- **Cardiac** (HRV, resting heart rate, SpO2, respiratory rate)
- **Fitness** (VO2Max, activity volume, steps, training load, standing time)
- **Nutrition** (quality, protein ratio, hydration, caloric balance vs TDEE)
- **Body Composition** (body fat%, BMI, lean mass index, waist/hip ratio)
- **Neuro-Cognitive** (wellbeing, cognitive, energy, stress, motivation, journaling)
- **Biomarkers** (albumin, creatinine, hsCRP, glucose, HbA1c, lipids, vitamins)

The score maps to biological age: higher score = biologically younger.

## Files

| File | Role | You modify? |
|------|------|-------------|
| `engine.ts` | Scoring functions (all 7 domain scorers + computeDayScore) | ✅ YES |
| `config.ts` | All tuneable constants (sigmoid params, weights, thresholds) | ✅ YES |
| `types.ts` | Type definitions (AggregatedDay, ProfileInput, DayResult) | ❌ NO |
| `math.ts` | Math utilities (clamp, sigmoid, avg, stdDev) | ❌ NO |
| `prepare.ts` | Scenario generator | ❌ NO |
| `eval.ts` | Evaluation harness | ❌ NO |

## Experiment Loop

1. Read the current eval metric: `cat results/latest-metric.json`
2. Form a hypothesis (e.g., "sleep efficiency sigmoid midpoint 88 is too generous")
3. Modify `engine.ts` or `config.ts`
4. Run eval: `npx tsx eval.ts`
5. Check the composite metric:
   - If **improved** → `git add -A && git commit -m "experiment: [description] — metric [old]→[new]"`
   - If **not improved** → `git checkout -- engine.ts config.ts` (revert)
6. Repeat with next hypothesis

## Metric (Higher = Better)

| Component | Weight | What it measures |
|---|---|---|
| Range Accuracy | 40% | % of scenarios where totalScore is within expected range |
| Domain Consistency | 30% | Domains correlate correctly with scenario types |
| Monotonicity | 20% | Better inputs always produce better scores |
| Stability | 10% | Small input changes produce small output changes |

## Optimization Strategies

### Low-Risk: Parameter Tuning
- Adjust sigmoid midpoints and spreads in `config.ts`
- Re-balance domain weights (must sum to ~1.0)
- Re-balance sub-score weights within domains (must sum to ~1.0)
- Tune recovery signal parameters (bonus caps, sigmoid curves)

### Medium-Risk: Algorithm Changes
- Modify `redistributeAndScore()` logic (weight redistribution for missing data)
- Change confidence calculation formula
- Adjust progressive bio-delta curve exponent/range
- Modify aging pace calculation

### High-Risk: Architectural Changes
- Add new sub-scores to existing domains
- Change domain classification (State/Trait/Hybrid)
- Modify the exogenous substance dampening
- Change the snapshot-anchor accumulator behavior

## Hard Constraints

1. **Scores must be 0-100**: All domain and sub-scores clamped to this range
2. **Weights must be positive**: No negative weights
3. **No crashes**: Engine must handle null/undefined inputs gracefully
4. **Deterministic**: Same inputs must always produce same outputs
5. **Type safety**: The code must type-check against types.ts
6. **Physiological plausibility**: Don't create inversions (e.g., high HRV → low cardiac score)

## Physiological Priors

Use these as domain knowledge constraints:

- **HRV**: Higher is better. RMSSD midpoint ~40ms, SDNN ~50ms. Population σ = 20ms.
- **RHR**: Lower is better. Athletes: 40-50, Average: 60-70, Elevated: >80
- **Sleep**: 7-9h optimal adult. Deep sleep: 15-25% of total. REM: 20-25%.
- **VO2Max**: Declines ~1%/year after 30. ACSM tables are the gold standard.
- **Body Fat**: Male optimal 12-20%, Female optimal 20-28%. Age-adjusted.
- **hsCRP**: <0.5 excellent, <1.0 good, <3.0 moderate, >10 acute inflammation
- **Recovery**: Sauna 15-30min optimal, Cold plunge 3-10min, Meditation 10-20min

## Tips

- Start with Range Accuracy — get more scenarios passing first
- Then focus on Monotonicity — ensure no score inversions
- Use `npx tsx eval.ts --verbose` to see per-scenario details
- Check `results/latest-metric.json` for the current best score
- Keep experiments fast — evaluate every change immediately
- Prefer small, targeted changes over large rewrites
