# BioEngine Autoresearch

> Autonomous overnight research for ARES BioEngine scoring calibration.
> Inspired by [karpathy/autoresearch](https://github.com/karpathy/autoresearch).

## What This Is

A self-contained experiment harness that lets an AI coding agent (Claude, Codex, Gemini)
autonomously optimize the ARES biological aging score engine overnight.

The agent modifies scoring logic and parameters, evaluates against synthetic physiological
scenarios, and keeps only improvements — running ~120 experiments/hour on CPU.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Generate synthetic ground truth (one-time)
npx tsx prepare.ts

# 3. Run baseline evaluation
npx tsx eval.ts

# 4. Run with verbose output
npx tsx eval.ts --verbose

# 5. Let an agent go (in your IDE / CLI):
#    "Read program.md and start experimenting"
```

## Project Structure

```
prepare.ts       — Synthetic scenario generator (DO NOT MODIFY)
engine.ts        — Scoring engine (AGENT MODIFIES THIS)
config.ts        — Tuneable constants (AGENT MODIFIES THIS)
eval.ts          — Evaluation harness (DO NOT MODIFY)
program.md       — Agent instructions / "skill"
types.ts         — Type definitions (DO NOT MODIFY)
math.ts          — Math utilities (DO NOT MODIFY)
ground-truth/    — Generated test scenarios
results/         — Experiment logs and metrics
run-experiment.sh — Automated experiment wrapper
```

## Origin: Antigravity Kit Template

This is an `antigravity-kit/scripts/` template. To use in a project:

1. Copy to your project workspace
2. Optionally customize `prepare.ts` with project-specific scenarios
3. Point the engine at your project's scoring logic
4. Let rip

## How It Works

```
Agent reads program.md → Modifies engine.ts/config.ts → npx tsx eval.ts
→ Metric improved? → YES: git commit, keep → NO: revert
→ Repeat ~120 times overnight
```

## Metric

| Component | Weight | Description |
|---|---|---|
| Range Accuracy | 40% | Scores within physiologically expected ranges |
| Domain Consistency | 30% | Domains correlate correctly with scenario types |
| Monotonicity | 20% | Better inputs always produce better scores |
| Stability | 10% | Robust to small input perturbations |

## Requirements

- Node.js 18+
- No GPU needed (pure CPU TypeScript computation)
- ~30 seconds per eval run
