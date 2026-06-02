/**
 * Autoresearch BioEngine — Extracted Configuration (AGENT MAY MODIFY)
 *
 * All ~80+ tuneable parameters extracted from unifiedBioEngine.ts v4.0.
 * This is the PRIMARY optimization target for the autoresearch agent.
 *
 * Structure:
 *   - DOMAIN_WEIGHTS: How much each domain contributes to total score
 *   - DOMAIN_*: Per-domain sub-score weights and sigmoid parameters
 *   - ACCUMULATOR: Bio.X accumulator and Pace constants
 *   - RECOVERY_SIGNALS: Recovery modality parameters
 *
 * ✅ AGENT: You may modify ANY value in this file.
 *    Constraints: weights within a domain should sum to ~1.0,
 *    domain weights should sum to ~1.0, scores must stay 0-100.
 */

// ─── Domain Weights (must sum to ~1.0) ────────────────────────────────────────

export const DOMAIN_WEIGHTS = {
    sleep: 0.22,
    cardiac: 0.20,
    fitness: 0.15,
    nutrition: 0.12,
    body: 0.10,
    neuro: 0.10,
    biomarker: 0.10,
    /** Dynamic biomarker boost when bloodwork available */
    biomarkerBoosted: 0.15,
} as const;

// ─── Domain Classification (State/Trait/Hybrid) ───────────────────────────────
// State → drives daily Pace, Trait → drives monthly Macro-Shocks

export const DOMAIN_CLASSIFICATION: Record<string, 'state' | 'trait' | 'hybrid'> = {
    sleep: 'state',
    cardiac: 'hybrid',
    fitness: 'trait',
    nutrition: 'trait',
    body: 'hybrid',
    neuro: 'state',
    biomarker: 'trait',
};

// ─── Sleep Domain ─────────────────────────────────────────────────────────────

export const SLEEP = {
    subWeights: {
        efficiency: 0.17,
        architecture: 0.17,
        duration: 0.17,
        regularity: 0.08,
        latency: 0.08,
        debt: 0.05,
        bedtime: 0.05,
        readiness: 0.15,
        daylight: 0.08,
    },
    // Sigmoid parameters: [midpoint, spread]
    efficiency: { midpoint: 88, spread: 4 },
    duration: { spread: 1.2 },        // deviation from target / spread
    latency: { midpoint: 22, spread: 8 },
    debt: { midpoint: 50, spread: 25 },
    daylight: { midpoint: 45, spread: 25 },
    // Architecture: deep/REM balance
    deepOptimalByAge: {
        under30: { min: 0.20, range: 0.10 },
        under40: { min: 0.17, range: 0.10 },
        under50: { min: 0.15, range: 0.10 },
        under60: { min: 0.12, range: 0.10 },
        over60:  { min: 0.10, range: 0.10 },
    },
    remOptimal: 0.22,
    deepWeight: 0.55,
    remWeight: 0.45,
    architectureSigmoidSpread: 0.04,
    // Early wake daylight bonus
    earlyWakeBonus: 1.15,
    earlyWakeHour: 7,
};

// ─── Cardiac Domain ───────────────────────────────────────────────────────────

export const CARDIAC = {
    subWeights: {
        hrvLevel: 0.40,
        restingHR: 0.25,
        spo2: 0.15,
        respiratoryRate: 0.20,
    },
    // HRV baseline ratio scoring
    hrvBaselineScale: 5,    // (ratio - 1.0) * scale → sigmoid input
    // HRV population sigmoid (no personal baseline)
    hrvPopulation: {
        rmssd: { midpoint: 40, spread: 25 },
        sdnn: { midpoint: 50, spread: 20 },
    },
    // RHR: lower = better (inverted sigmoid)
    rhr: { midpoint: 58, spread: 6 },
    // SpO2: linear 92-98
    spo2: { min: 92, range: 6 },
    // Respiratory Rate
    respRate: { midpoint: 14, spread: 2 },
};

// ─── Fitness Domain ───────────────────────────────────────────────────────────

export const FITNESS = {
    subWeights: {
        vo2Max: 0.25,
        activityVolume: 0.22,
        movementConsistency: 0.18,
        physiologicalLoad: 0.20,
        sedentary: 0.15,
    },
    // Activity volume: target active energy (kcal)
    activityEnergyTarget: 600,
    exerciseMinutesTarget: 60,
    // Steps sigmoid
    steps: { midpoint: 8000, spread: 3000 },
    // Training load calculation
    trainingMinutesTarget: 60,
    rpeBoostFactor: 1.15,
    rpeThreshold: 6,
    // Zone load sigmoid
    zoneLoad: { midpoint: 60, spread: 80 },
    zoneTrainingBlend: { explicit: 0.7, zone: 0.3 },
    // Sedentary (stand minutes)
    standMinutes: { midpoint: 240, spread: 120 },
    // Intraday smoothing thresholds
    intradayRampStart: 50,   // kcal active energy
    intradayRampRange: 350,  // ramp from 0% to 100% today
};

// ─── Nutrition Domain ─────────────────────────────────────────────────────────

export const NUTRITION = {
    subWeights: {
        qualityScore: 0.30,
        proteinRatio: 0.30,
        hydration: 0.20,
        calBalance: 0.20,
    },
    proteinTarget: 1.6,       // g/kg body weight
    hydration: { midpoint: 2000, spread: 500 },
    calBalance: {
        defaultTdee: 2200,
        deviationFactor: 0.25,  // normalized deviation = abs(cal - tdee) / (tdee * factor)
        minScore: 20,
        maxScore: 95,
    },
    // Intraday smoothing
    intradayRampStart: 200,   // kcal consumed
    intradayRampRange: 1600,  // ramp from 0% to 100% today
};

// ─── Body Composition Domain ──────────────────────────────────────────────────

export const BODY = {
    subWeights: {
        bodyFat: 0.25,
        bmi: 0.15,
        weightStable: 0.10,
        leanMass: 0.20,
        whr: 0.15,
        waistRisk: 0.15,
    },
    // Body fat centers (age-adjusted)
    bodyFat: {
        malBase: 18,
        femaleBase: 25,
        ageShift30: 1,
        ageShift40: 2,
        spread: 5,
    },
    // BMI
    bmi: {
        defaultMidpoint: 22.0,
        lmiAdjustMax: 4.0,        // max LMI-based midpoint shift
        optimalLMI: { male: 20.5, female: 16.5 },
        spread: 3,
    },
    // Weight stability (CV-based)
    weightCV: { midpoint: 1.5, spread: 0.8 },
    weightCVFallback: 70,
    // Lean Mass Index
    lmi: {
        optimalMale: 20.5,
        optimalFemale: 16.5,
        offset: 2,
        spread: 3,
    },
    // WHR (WHO)
    whr: {
        maleLow: 0.90,
        maleHigh: 1.00,
        femaleLow: 0.85,
        femaleHigh: 0.95,
    },
    // Waist circumference (WHO)
    waist: {
        maleLow: 94,
        maleHigh: 102,
        femaleLow: 80,
        femaleHigh: 88,
    },
};

// ─── Neuro-Cognitive Domain ───────────────────────────────────────────────────

export const NEURO = {
    subWeights: {
        wellbeing: 0.20,
        cognitive: 0.20,
        energy: 0.18,
        stress: 0.14,
        motivation: 0.18,
        journalEngagement: 0.10,
    },
    // Journal scoring
    journal: {
        moodScale: 35,      // mood * scale + 50 → score
        baseScore: 50,       // base when mood is 0
        noMoodDefault: 55,   // score when journal exists but no mood
        ritualThreshold: 3,  // entries for full ritual bonus
        ritualBonus: 1.15,
        minScore: 30,
    },
    // Veto: cap neuro if subjective signals critically low
    veto: {
        threshold: 2,   // energy/motivation <= this triggers veto
        capScore: 30,    // max neuro score when vetoed
    },
    // Neutral fallback when no sub-scores available
    neutralFallback: 50,
};

// ─── Biomarker Domain ─────────────────────────────────────────────────────────

export const BIOMARKER = {
    subWeights: {
        albumin: 0.15,
        creatinine: 0.10,
        hsCrp: 0.20,
        glucose: 0.15,
        wbc: 0.10,
        hba1c: 0.10,
        lipids: 0.10,
        vitamins: 0.10,
    },
    // Optimal ranges for each marker (simplified tiered scoring)
    albumin: { excellent: [4.0, 5.0], good: [3.5, Infinity], scores: [90, 60, 30] },
    creatinine: { excellent: [0.7, 1.3], good: [0.5, 1.5], scores: [90, 60, 30] },
    hsCrp: { thresholds: [0.5, 1.0, 3.0, 10.0], scores: [100, 85, 60, 30, 10] },
    glucose: { excellent: [70, 100], good: [60, 125], scores: [90, 60, 25] },
    wbc: { excellent: [4.5, 7.5], good: [3.5, 11.0], scores: [90, 65, 30] },
    hba1c: { thresholds: [5.0, 5.5, 5.7, 6.5], scores: [95, 85, 70, 40, 15] },
    lipids: {
        hdl: { thresholds: [60, 40], scores: [90, 65, 30] },
        ldl: { thresholds: [100, 130, 160], scores: [90, 70, 45, 20] },
        triglycerides: { thresholds: [100, 150, 200], scores: [90, 70, 45, 20] },
    },
    vitamins: {
        vitaminD: { excellent: [40, 80], good: [30, Infinity], fair: [20, Infinity], scores: [90, 70, 45, 20] },
        ferritin: { excellent: [30, 300], good: [15, Infinity], scores: [80, 50, 25] },
        tsh: { excellent: [0.5, 4.0], good: [0.1, 10.0], scores: [85, 50, 20] },
        testosterone: {
            male: { excellent: [500, 800], good: [300, 1000], scores: [90, 70, 40] },
            female: { excellent: [25, 50], good: [15, 70], scores: [90, 70, 40] },
        },
    },
};

// ─── Accumulator / Pace Constants ─────────────────────────────────────────────

export const ACCUMULATOR = {
    /** Progressive Bio-Delta exponent (steepness of score→age mapping) */
    progressiveExponent: 1.9,
    /** Maximum Bio-Delta range (±years at score 0 / 100) */
    progressiveRange: 14,
    /** Pace delta multiplier */
    paceMultiplier: 0.42,
    /** Pace range */
    paceMin: 0.50,
    paceMax: 1.50,
    /** DunedinPACE dampening (50% = daily deviation halved toward lab anchor) */
    dunedinDampening: 0.5,
    /** Snapshot-Anchor pull rates */
    anchorAlphaImprove: 0.04,
    anchorAlphaDegrade: 0.02,
    anchorMaxDailyPull: 0.08,
    /** Calibration threshold (confidence needed for accumulator mode) */
    calibrationThreshold: 0.5,
    /** Hysteresis threshold (once unlocked, needs lower confidence to stay active) */
    hysteresisThreshold: 0.3,
};

// ─── Weight Redistribution ────────────────────────────────────────────────────

export const REDISTRIBUTION = {
    /** Maximum factor a domain can be reweighted when others are missing */
    maxReweightFactor: 2.0,
    /** Neutral fallback score for missing domains */
    neutralFallback: 50,
};

// ─── Recovery Signal Registry ─────────────────────────────────────────────────

export interface RecoverySignalConfig {
    id: string;
    field: keyof import('./types.ts').AggregatedDay;
    targetDomain: 'sleep' | 'neuro';
    targetSubIndex: number;
    sigmoidMidpoint: number;
    sigmoidSpread: number;
    maxBonus: number;
    minBonus: number;
    neutralBase: number;
    spillover?: { subIndex: number; fraction: number };
    evidence: string;
    enabled: boolean;
}

export const RECOVERY_SIGNALS: RecoverySignalConfig[] = [
    {
        id: 'sauna',
        field: 'saunaMinutes',
        targetDomain: 'sleep',
        targetSubIndex: 7,  // readiness
        sigmoidMidpoint: 20,
        sigmoidSpread: 15,
        maxBonus: 12,
        minBonus: 2,
        neutralBase: 50,
        evidence: 'Laukkanen et al. 2015 (sauna → CV mortality -40%)',
        enabled: true,
    },
    {
        id: 'cold_plunge',
        field: 'coldPlungeMinutes',
        targetDomain: 'sleep',
        targetSubIndex: 7,  // readiness
        sigmoidMidpoint: 5,
        sigmoidSpread: 4,
        maxBonus: 10,
        minBonus: 2,
        neutralBase: 50,
        evidence: 'Shevchuk 2008 (cold → norepinephrine +200-300%)',
        enabled: true,
    },
    {
        id: 'meditation',
        field: 'meditationMinutes',
        targetDomain: 'neuro',
        targetSubIndex: 0,  // wellbeing
        sigmoidMidpoint: 15,
        sigmoidSpread: 10,
        maxBonus: 10,
        minBonus: 2,
        neutralBase: 55,
        spillover: { subIndex: 1, fraction: 0.7 },
        evidence: 'Goyal et al. 2014 (meditation meta-analysis)',
        enabled: true,
    },
];

// ─── Macro-Shock Constants ────────────────────────────────────────────────────

export const MACRO_SHOCK = {
    amplifier: 0.1,
    cap: 2.0,
    significanceThreshold: 0.05,
    traitWeights: {
        cardiac: 0.20,
        fitness: 0.15,
        body: 0.10,
        biomarker: 0.15,
    } as Record<string, number>,
};

// ─── Exogenous Modifier ───────────────────────────────────────────────────────

export const EXOGENOUS = {
    /** Dampening factor to prevent double-counting with TDEE calorie engine */
    dampening: 0.5,
};

// ─── Maximum Signal Count ─────────────────────────────────────────────────────

export const MAX_SIGNALS = 40;

// ─── VO2Max Reference Tables (ACSM) ──────────────────────────────────────────

export const VO2MAX_TABLES: Record<string, { excellent: number; good: number; average: number; belowAvg: number }> = {
    'male_20': { excellent: 48, good: 44, average: 39, belowAvg: 35 },
    'male_30': { excellent: 44, good: 40, average: 35, belowAvg: 31 },
    'male_40': { excellent: 41, good: 37, average: 32, belowAvg: 28 },
    'male_50': { excellent: 38, good: 34, average: 29, belowAvg: 25 },
    'male_60': { excellent: 35, good: 31, average: 26, belowAvg: 22 },
    'female_20': { excellent: 42, good: 38, average: 33, belowAvg: 29 },
    'female_30': { excellent: 38, good: 34, average: 29, belowAvg: 25 },
    'female_40': { excellent: 35, good: 31, average: 26, belowAvg: 22 },
    'female_50': { excellent: 32, good: 28, average: 23, belowAvg: 19 },
    'female_60': { excellent: 29, good: 25, average: 20, belowAvg: 16 },
};
