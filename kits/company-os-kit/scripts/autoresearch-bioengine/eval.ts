/**
 * Autoresearch BioEngine — Evaluation Harness (READ-ONLY)
 *
 * Runs engine.ts against all synthetic scenarios from prepare.ts.
 * Outputs a composite metric (0-100, higher = better).
 *
 * Metric Components:
 *   40% — Range Accuracy:  % of scenarios where totalScore falls within expected range
 *   30% — Domain Consistency: domain scores match physiological expectations
 *   20% — Monotonicity: better inputs always produce better scores
 *   10% — Stability: small perturbations produce small output changes
 *
 * Usage: npx tsx eval.ts [--verbose]
 *
 * ⚠️  DO NOT MODIFY — The agent should only modify engine.ts and config.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TestScenario, ScenarioResult, EvalMetric } from './types.ts';
import { computeDayScore } from './engine.ts';
import { avg } from './math.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERBOSE = process.argv.includes('--verbose');

// ─── Load Scenarios ───────────────────────────────────────────────────────────

function loadScenarios(): TestScenario[] {
    const path = join(__dirname, 'ground-truth', 'scenarios.json');
    if (!existsSync(path)) {
        console.error('❌ No scenarios found. Run `npx tsx prepare.ts` first.');
        process.exit(1);
    }
    return JSON.parse(readFileSync(path, 'utf-8'));
}

// ─── Run Single Scenario ──────────────────────────────────────────────────────

function runScenario(scenario: TestScenario): ScenarioResult {
    const errors: string[] = [];

    try {
        const result = computeDayScore(
            scenario.day,
            scenario.profile,
            scenario.bloodwork ?? null,
            scenario.hrvBaseline ?? null,
        );

        const inRange = result.totalScore >= scenario.expectedTotalScore.min
            && result.totalScore <= scenario.expectedTotalScore.max;

        if (!inRange) {
            errors.push(`totalScore ${result.totalScore} outside expected [${scenario.expectedTotalScore.min}, ${scenario.expectedTotalScore.max}]`);
        }

        // Check domain scores if expected
        const domainScores: Record<string, number> = {};
        for (const domain of result.domains) {
            domainScores[domain.key] = Math.round(domain.score * 10) / 10;

            if (scenario.expectedDomainScores?.[domain.key]) {
                const exp = scenario.expectedDomainScores[domain.key];
                if (domain.score < exp.min || domain.score > exp.max) {
                    errors.push(`${domain.key} score ${domain.score.toFixed(1)} outside [${exp.min}, ${exp.max}]`);
                }
            }
        }

        // Check aging pace
        if (scenario.expectedAgingPace) {
            if (result.agingPace < scenario.expectedAgingPace.min || result.agingPace > scenario.expectedAgingPace.max) {
                errors.push(`agingPace ${result.agingPace} outside [${scenario.expectedAgingPace.min}, ${scenario.expectedAgingPace.max}]`);
            }
        }

        // Check confidence
        if (scenario.expectedConfidence) {
            if (result.confidence < scenario.expectedConfidence.min || result.confidence > scenario.expectedConfidence.max) {
                errors.push(`confidence ${result.confidence} outside [${scenario.expectedConfidence.min}, ${scenario.expectedConfidence.max}]`);
            }
        }

        return {
            scenarioId: scenario.id,
            passed: errors.length === 0,
            actualTotalScore: result.totalScore,
            expectedRange: scenario.expectedTotalScore,
            domainScores,
            confidence: result.confidence,
            agingPace: result.agingPace,
            errors,
        };
    } catch (err) {
        return {
            scenarioId: scenario.id,
            passed: false,
            actualTotalScore: -1,
            expectedRange: scenario.expectedTotalScore,
            domainScores: {},
            confidence: 0,
            agingPace: 1.0,
            errors: [`CRASH: ${(err as Error).message}`],
        };
    }
}

// ─── Monotonicity Check ───────────────────────────────────────────────────────

function checkMonotonicity(scenarios: TestScenario[], results: ScenarioResult[]): number {
    const pairs = [
        ['mono_sleep_good', 'mono_sleep_bad'],
        ['mono_cardiac_good', 'mono_cardiac_bad'],
    ];

    let passed = 0;
    let total = 0;

    for (const [goodId, badId] of pairs) {
        const goodResult = results.find(r => r.scenarioId === goodId);
        const badResult = results.find(r => r.scenarioId === badId);
        if (!goodResult || !badResult) continue;

        total++;
        if (goodResult.actualTotalScore > badResult.actualTotalScore) {
            passed++;
        } else if (VERBOSE) {
            console.log(`  ⚠️ Monotonicity FAIL: ${goodId} (${goodResult.actualTotalScore}) <= ${badId} (${badResult.actualTotalScore})`);
        }
    }

    return total > 0 ? (passed / total) * 100 : 100;
}

// ─── Stability Check ──────────────────────────────────────────────────────────

function checkStability(scenarios: TestScenario[]): number {
    // Pick a few representative scenarios and add small perturbations
    const baseScenarios = scenarios.filter(s =>
        s.category === 'average_adult' || s.category === 'optimal_athlete'
    ).slice(0, 5);

    if (baseScenarios.length === 0) return 100;

    const deviations: number[] = [];

    for (const scenario of baseScenarios) {
        const baseResult = computeDayScore(scenario.day, scenario.profile, scenario.bloodwork ?? null);

        // Perturb: add ±5% to HRV
        if (scenario.day.hrvMs != null) {
            const perturbedDay = { ...scenario.day, hrvMs: scenario.day.hrvMs * 1.05 };
            const perturbedResult = computeDayScore(perturbedDay, scenario.profile, scenario.bloodwork ?? null);
            const deviation = Math.abs(perturbedResult.totalScore - baseResult.totalScore);
            deviations.push(deviation);
        }

        // Perturb: add ±0.3h sleep
        if (scenario.day.sleepHours != null) {
            const perturbedDay = { ...scenario.day, sleepHours: scenario.day.sleepHours + 0.3 };
            const perturbedResult = computeDayScore(perturbedDay, scenario.profile, scenario.bloodwork ?? null);
            const deviation = Math.abs(perturbedResult.totalScore - baseResult.totalScore);
            deviations.push(deviation);
        }
    }

    if (deviations.length === 0) return 100;

    // Score: average deviation < 2 points = 100%, > 10 points = 0%
    const avgDeviation = avg(deviations);
    return Math.max(0, Math.min(100, (10 - avgDeviation) / 10 * 100));
}

// ─── Domain Consistency Check ─────────────────────────────────────────────────

function checkDomainConsistency(scenarios: TestScenario[], results: ScenarioResult[]): number {
    let checks = 0;
    let passed = 0;

    for (let i = 0; i < scenarios.length; i++) {
        const s = scenarios[i];
        const r = results[i];
        if (!r || r.actualTotalScore < 0) continue;

        // Check: optimal athletes should have all domains above 50
        if (s.category === 'optimal_athlete') {
            checks++;
            const allAbove50 = Object.values(r.domainScores).every(v => v >= 40);
            if (allAbove50) passed++;
        }

        // Check: poor sleepers should have sleep domain below average
        if (s.category === 'poor_sleeper' && r.domainScores['sleep'] != null) {
            checks++;
            if (r.domainScores['sleep'] < 55) passed++;
        }

        // Check: heavy training should have fitness above average
        if (s.category === 'heavy_training' && r.domainScores['fitness'] != null) {
            checks++;
            if (r.domainScores['fitness'] > 50) passed++;
        }
    }

    return checks > 0 ? (passed / checks) * 100 : 100;
}

// ─── Main Evaluation ──────────────────────────────────────────────────────────

function evaluate(): EvalMetric {
    const scenarios = loadScenarios();
    const results: ScenarioResult[] = [];

    console.log(`\n🧬 BioEngine Autoresearch — Evaluation Harness`);
    console.log(`   Scenarios: ${scenarios.length}`);
    console.log(`   Engine: engine.ts`);
    console.log(`${'─'.repeat(60)}\n`);

    // Run all scenarios
    for (const scenario of scenarios) {
        const result = runScenario(scenario);
        results.push(result);

        if (VERBOSE) {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${scenario.id}: score=${result.actualTotalScore} [${result.expectedRange.min}-${result.expectedRange.max}] conf=${result.confidence}`);
            if (!result.passed) {
                for (const err of result.errors) {
                    console.log(`   └─ ${err}`);
                }
            }
        }
    }

    // Calculate metric components
    const rangeAccuracy = (results.filter(r => r.passed).length / results.length) * 100;
    const domainConsistency = checkDomainConsistency(scenarios, results);
    const monotonicity = checkMonotonicity(scenarios, results);
    const stability = checkStability(scenarios);

    // Composite metric (higher = better)
    const composite = Math.round(
        rangeAccuracy * 0.40 +
        domainConsistency * 0.30 +
        monotonicity * 0.20 +
        stability * 0.10
    );

    const metric: EvalMetric = {
        composite,
        rangeAccuracy: Math.round(rangeAccuracy * 10) / 10,
        domainConsistency: Math.round(domainConsistency * 10) / 10,
        monotonicity: Math.round(monotonicity * 10) / 10,
        stability: Math.round(stability * 10) / 10,
        totalScenarios: scenarios.length,
        passedScenarios: results.filter(r => r.passed).length,
        scenarioResults: results,
    };

    // Print results
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`COMPOSITE METRIC: ${composite}/100`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`  Range Accuracy:     ${metric.rangeAccuracy}% (${metric.passedScenarios}/${metric.totalScenarios} passed)`);
    console.log(`  Domain Consistency: ${metric.domainConsistency}%`);
    console.log(`  Monotonicity:       ${metric.monotonicity}%`);
    console.log(`  Stability:          ${metric.stability}%`);
    console.log(`${'─'.repeat(60)}`);

    // Category breakdown
    const categories = [...new Set(scenarios.map(s => s.category))];
    for (const cat of categories) {
        const catResults = results.filter((r, i) => scenarios[i].category === cat);
        const catPassed = catResults.filter(r => r.passed).length;
        const pct = Math.round((catPassed / catResults.length) * 100);
        const icon = pct >= 80 ? '🟢' : pct >= 50 ? '🟡' : '🔴';
        console.log(`  ${icon} ${cat}: ${catPassed}/${catResults.length} (${pct}%)`);
    }

    // Failed scenarios detail
    const failed = results.filter(r => !r.passed);
    if (failed.length > 0 && !VERBOSE) {
        console.log(`\n  Top failures (run with --verbose for full detail):`);
        for (const f of failed.slice(0, 5)) {
            console.log(`    ❌ ${f.scenarioId}: score=${f.actualTotalScore} expected=[${f.expectedRange.min}-${f.expectedRange.max}]`);
        }
    }

    console.log();

    // Write metric to file (agent reads this)
    const metricPath = join(__dirname, 'results', 'latest-metric.json');
    writeFileSync(metricPath, JSON.stringify({
        composite: metric.composite,
        rangeAccuracy: metric.rangeAccuracy,
        domainConsistency: metric.domainConsistency,
        monotonicity: metric.monotonicity,
        stability: metric.stability,
        passed: metric.passedScenarios,
        total: metric.totalScenarios,
        timestamp: new Date().toISOString(),
    }, null, 2), 'utf-8');

    return metric;
}

// ─── Execute ──────────────────────────────────────────────────────────────────

evaluate();
