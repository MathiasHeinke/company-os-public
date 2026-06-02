/**
 * Autoresearch BioEngine — Math Utilities (READ-ONLY)
 *
 * Extracted from ARES _shared/utils/math.ts
 * Provides: clamp, sigmoid, avg, stdDev, ema, lerp, mapRange
 *
 * ⚠️  DO NOT MODIFY — The agent should only modify engine.ts and config.ts
 */

/** Clamp a value between min and max (inclusive) */
export function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

/** Standard logistic sigmoid function: 1 / (1 + e^(-x)) → (0, 1) */
export function sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
}

/** Arithmetic mean of a number array. Returns 0 for empty arrays. */
export function avg(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Population standard deviation. Returns 0 for arrays with ≤1 element. */
export function stdDev(arr: number[]): number {
    if (arr.length <= 1) return 0;
    const mean = avg(arr);
    const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
    return Math.sqrt(variance);
}

/** Round to N decimal places */
export function roundN(n: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(n * factor) / factor;
}

/**
 * Exponential Moving Average.
 * @param history - Array of values (newest last)
 * @param decayFactor - Weight decay (0 = ignore history, 1 = only latest), default 0.3
 */
export function ema(history: number[], decayFactor: number = 0.3): number {
    if (history.length === 0) return 0;
    if (history.length === 1) return history[0];

    let result = history[0];
    for (let i = 1; i < history.length; i++) {
        result = decayFactor * history[i] + (1 - decayFactor) * result;
    }
    return result;
}

/** Linear interpolation between a and b at t ∈ [0, 1] */
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * clamp(t, 0, 1);
}

/** Map a value from one range to another */
export function mapRange(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number,
): number {
    const t = (value - inMin) / (inMax - inMin);
    return lerp(outMin, outMax, t);
}

/**
 * Compute zone-weighted physiological load from HR intensity minutes.
 * Extracted from ARES load-calc.ts — TRIMP-lite formula.
 *
 * Zone multipliers: Z1=1.0, Z2=1.8, Z3=3.2, Z4=5.0, Z5=7.5
 */
export function computeZoneLoad(zones: {
    lowIntensityMin: number | null;
    moderateIntensityMin: number | null;
    highIntensityMin: number | null;
    vigorousIntensityMin: number | null;
    maximalIntensityMin: number | null;
}): number {
    return (
        (zones.lowIntensityMin ?? 0) * 1.0 +
        (zones.moderateIntensityMin ?? 0) * 1.8 +
        (zones.highIntensityMin ?? 0) * 3.2 +
        (zones.vigorousIntensityMin ?? 0) * 5.0 +
        (zones.maximalIntensityMin ?? 0) * 7.5
    );
}
