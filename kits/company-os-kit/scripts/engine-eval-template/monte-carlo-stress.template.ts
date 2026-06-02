/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MONTE CARLO STRESS TEST TEMPLATE — Randomized Input Stability Testing
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Pattern: Generate N random inputs, feed them through the engine, assert:
 *   1. No crashes (no uncaught exceptions)
 *   2. Outputs within valid ranges
 *   3. Timing within acceptable bounds
 *
 * Usage:
 *   1. Copy to tests/[engine-name].stress.ts
 *   2. Replace TODO markers with your engine specifics
 *   3. Run: npx tsx tests/[engine-name].stress.ts
 *
 * Output: Console report + optional JSON file
 */

// TODO: Import your engine function
// import { myEngineFunction, type MyInput } from '../src/lib/myEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  /** Number of random iterations */
  iterations: 10_000,

  /** Seed for reproducibility (null = random each run) */
  seed: null as number | null,

  /** Maximum allowed execution time per call in ms */
  maxCallTimeMs: 50,

  /** Output JSON report to file */
  outputFile: null as string | null, // e.g. 'stress-report.json'
};

// ═══════════════════════════════════════════════════════════════════════════════
// RANDOM INPUT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple seeded PRNG (Mulberry32) for reproducibility.
 * If seed is null, uses Math.random.
 */
function createRng(seed: number | null): () => number {
  if (seed === null) return Math.random;
  let s = seed | 0;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const rng = createRng(CONFIG.seed);

/** Random float in [min, max] */
function randFloat(min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Random int in [min, max] (inclusive) */
function randInt(min: number, max: number): number {
  return Math.floor(randFloat(min, max + 1));
}

/** Random element from array */
function randPick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

/** Random boolean with given probability of true */
function randBool(p = 0.5): boolean {
  return rng() < p;
}

// TODO: Build your random input generator using the helpers above
// function generateRandomInput(): MyInput {
//   return {
//     field1: randFloat(0, 100),
//     field2: randPick(['option_a', 'option_b', 'option_c']),
//     field3: randBool(0.3) ? null : randInt(1, 10),
//   };
// }

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATORS — Define what "valid output" means
// ═══════════════════════════════════════════════════════════════════════════════

interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// TODO: Implement your output validator
// function validateOutput(output: MyOutput, input: MyInput): ValidationResult {
//   if (typeof output.score !== 'number') return { valid: false, reason: 'score is not a number' };
//   if (output.score < 0 || output.score > 100) return { valid: false, reason: `score out of range: ${output.score}` };
//   return { valid: true };
// }

// ═══════════════════════════════════════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

interface StressResult {
  iterations: number;
  crashes: number;
  validationFailures: number;
  timingViolations: number;
  timings: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
    mean: number;
  };
  failures: Array<{ iteration: number; error: string; input?: unknown }>;
  passed: boolean;
}

async function runMonteCarlo(): Promise<StressResult> {
  const timings: number[] = [];
  const failures: StressResult['failures'] = [];
  let crashes = 0;
  let validationFailures = 0;
  let timingViolations = 0;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  MONTE CARLO STRESS TEST — ${CONFIG.iterations.toLocaleString()} iterations`);
  console.log(`  Seed: ${CONFIG.seed ?? 'random'}`);
  console.log(`${'═'.repeat(60)}\n`);

  const progressStep = Math.max(1, Math.floor(CONFIG.iterations / 20));

  for (let i = 0; i < CONFIG.iterations; i++) {
    if (i % progressStep === 0) {
      const pct = Math.round((i / CONFIG.iterations) * 100);
      process.stdout.write(`\r  Progress: ${'█'.repeat(Math.floor(pct / 5))}${'░'.repeat(20 - Math.floor(pct / 5))} ${pct}%`);
    }

    // TODO: Uncomment and use your generator + engine
    // const input = generateRandomInput();
    const input = {}; // placeholder

    try {
      const start = performance.now();
      // TODO: Call your engine
      // const output = myEngineFunction(input);
      const elapsed = performance.now() - start;
      timings.push(elapsed);

      if (elapsed > CONFIG.maxCallTimeMs) {
        timingViolations++;
        failures.push({ iteration: i, error: `Timing violation: ${elapsed.toFixed(2)}ms > ${CONFIG.maxCallTimeMs}ms` });
      }

      // TODO: Validate output
      // const validation = validateOutput(output, input);
      // if (!validation.valid) {
      //   validationFailures++;
      //   failures.push({ iteration: i, error: `Validation: ${validation.reason}`, input });
      // }
    } catch (err) {
      crashes++;
      failures.push({
        iteration: i,
        error: `CRASH: ${err instanceof Error ? err.message : String(err)}`,
        input,
      });
    }
  }

  process.stdout.write('\r  Progress: ████████████████████ 100%\n\n');

  // Calculate percentiles
  timings.sort((a, b) => a - b);
  const percentile = (p: number) => timings[Math.floor(timings.length * p)] ?? 0;

  const result: StressResult = {
    iterations: CONFIG.iterations,
    crashes,
    validationFailures,
    timingViolations,
    timings: {
      p50: Number(percentile(0.5).toFixed(3)),
      p95: Number(percentile(0.95).toFixed(3)),
      p99: Number(percentile(0.99).toFixed(3)),
      max: Number((timings[timings.length - 1] ?? 0).toFixed(3)),
      mean: Number((timings.reduce((a, b) => a + b, 0) / timings.length).toFixed(3)),
    },
    failures: failures.slice(0, 20), // cap at 20 for readability
    passed: crashes === 0 && validationFailures === 0,
  };

  // Print report
  console.log(`  RESULTS:`);
  console.log(`  ├─ Iterations:    ${result.iterations.toLocaleString()}`);
  console.log(`  ├─ Crashes:       ${result.crashes === 0 ? '✅ 0' : `❌ ${result.crashes}`}`);
  console.log(`  ├─ Invalid Out:   ${result.validationFailures === 0 ? '✅ 0' : `❌ ${result.validationFailures}`}`);
  console.log(`  ├─ Timing Viols:  ${result.timingViolations === 0 ? '✅ 0' : `⚠️  ${result.timingViolations}`}`);
  console.log(`  │`);
  console.log(`  ├─ Timing (ms):`);
  console.log(`  │  ├─ p50:  ${result.timings.p50}ms`);
  console.log(`  │  ├─ p95:  ${result.timings.p95}ms`);
  console.log(`  │  ├─ p99:  ${result.timings.p99}ms`);
  console.log(`  │  └─ max:  ${result.timings.max}ms`);
  console.log(`  │`);
  console.log(`  └─ VERDICT: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`\n${'═'.repeat(60)}\n`);

  if (failures.length > 0) {
    console.log(`  First ${Math.min(failures.length, 5)} failures:`);
    failures.slice(0, 5).forEach((f) => {
      console.log(`    [#${f.iteration}] ${f.error}`);
    });
    console.log('');
  }

  // Optional: write JSON report
  if (CONFIG.outputFile) {
    const fs = await import('fs');
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(result, null, 2));
    console.log(`  Report written to: ${CONFIG.outputFile}\n`);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

runMonteCarlo().then((result) => {
  process.exit(result.passed ? 0 : 1);
});
