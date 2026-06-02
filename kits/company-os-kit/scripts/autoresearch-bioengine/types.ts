/**
 * Autoresearch BioEngine — Type Definitions (READ-ONLY)
 *
 * Extracted from ARES unifiedBioEngine.ts + signalAggregator.ts
 * These types define the data contracts for the scoring engine.
 *
 * ⚠️  DO NOT MODIFY — The agent should only modify engine.ts and config.ts
 */

// ─── Input Types ──────────────────────────────────────────────────────────────

/** Normalized signals for a single day from all tracking sources */
export interface AggregatedDay {
    date: string;

    // ── Sleep ──
    sleepHours: number | null;
    sleepQuality: number | null;
    deepSleepMinutes: number | null;
    remSleepMinutes: number | null;
    lightSleepMinutes: number | null;
    sleepEfficiency: number | null;
    sleepRegularity: number | null;
    sleepDebtMinutes: number | null;
    sleepInterruptions: number | null;
    sleepLatencyMinutes: number | null;
    bedtime: string | null;
    wakeTime: string | null;

    // ── Cardiac / ANS ──
    hrvMs: number | null;
    hrvDayAvgMs: number | null;
    hrvMetricType: 'sdnn' | 'rmssd';
    restingHeartRate: number | null;
    spo2: number | null;
    respiratoryRate: number | null;

    // ── Activity / Movement ──
    steps: number | null;
    activeEnergyBurned: number | null;
    totalEnergyBurned: number | null;
    sedentaryMinutes: number | null;
    vo2Max: number | null;
    lowIntensityMin: number | null;
    medIntensityMin: number | null;
    highIntensityMin: number | null;
    vigorousIntensityMin: number | null;
    maximalIntensityMin: number | null;
    exerciseMinutes: number | null;
    daylightMinutes: number | null;
    basalEnergyBurned: number | null;
    standMinutes: number | null;

    // ── ARES Computed Scores ──
    readinessScore: number | null;
    wellbeingScore: number | null;
    cognitiveScore: number | null;

    // ── Nutrition ──
    totalCalories: number | null;
    totalProtein: number | null;
    hydrationMl: number | null;
    nutritionQualityScore: number | null;

    // ── ARES Calorie Engine ──
    aresTdee: number | null;
    aresDeficitKcal: number | null;

    // ── Body Composition ──
    weight: number | null;
    bodyFatPct: number | null;
    leanMassKg: number | null;
    waistCm: number | null;
    hipCm: number | null;

    // ── Subjective / Neuro ──
    energyLevel: number | null;
    stressLevel: number | null;
    libidoLevel: number | null;
    morningLibido: number | null;
    morningMotivation: number | null;

    // ── Training ──
    trainingMinutes: number | null;
    avgSessionRPE: number | null;

    // ── Recovery Blocks ──
    saunaMinutes: number | null;
    coldPlungeMinutes: number | null;
    meditationMinutes: number | null;

    // ── Cognitive / Journal ──
    journalMood: number | null;
    journalCount: number | null;

    // ── Daily Reflection / Meta-Cognition ──
    trustScore: number | null;
    frictionScore: number | null;
    readinessModifier: string | null;

    // ── Psychosocial Signals ──
    lifeStressorLoad: number | null;
    behavioralCoherence: number | null;
    selfAwareness: number | null;
    motivationTrend: string | null;

    // ── Source Tracking ──
    sources: string[];
}

/** Bloodwork data (episodic, not daily) */
export interface AggregatedBloodwork {
    testDate: string | null;
    albumin: number | null;
    creatinine: number | null;
    hsCrp: number | null;
    fastingGlucose: number | null;
    wbc: number | null;
    hba1c: number | null;
    totalCholesterol: number | null;
    ldl: number | null;
    hdl: number | null;
    triglycerides: number | null;
    vitaminD: number | null;
    ferritin: number | null;
    testosterone: number | null;
    tsh: number | null;
}

/** User profile data */
export interface ProfileInput {
    age: number;
    gender: string | null;
    weight: number | null;
    height: number | null;
    birthDate: string | null;
}

// ─── Output Types ─────────────────────────────────────────────────────────────

export interface SubScore {
    key: string;
    score: number;       // 0-100
    weight: number;      // Normalized weight (sum across domain = 1.0)
    available: boolean;
}

export interface DomainResult {
    key: string;         // 'sleep' | 'cardiac' | 'fitness' | 'nutrition' | 'body' | 'neuro' | 'biomarker'
    score: number;       // 0-100
    weight: number;      // Domain weight in total score
    available: boolean;
    subScores: SubScore[];
}

export interface Contribution {
    domain: string;
    signal: string;
    value: number;
    direction: 'positive' | 'negative' | 'neutral';
}

export interface DayResult {
    date: string;
    totalScore: number;    // 0-100
    paceScore: number;     // 0-100 from State/Hybrid domains only
    bioX: number;          // Biological age estimate
    bioXMargin: number;    // ± years confidence interval
    agingPace: number;     // 0.50-1.50 (1.0 = chronological aging)
    confidence: number;    // 0.0-1.0
    signalCount: number;
    domains: DomainResult[];
    contributions: Contribution[];
    traitScores: Record<string, number>;
}

export interface RolledUpResult {
    window: number;
    avgScore: number;
    bioX: number;
    agingPace: number;
    confidence: number;
    domainAverages: Record<string, number>;
    domainTrends: Record<string, number>;
    trend: number;
    daysWithData: number;
}

// ─── Engine Input Options ─────────────────────────────────────────────────────

export interface DomainModifiers {
    sleep?: number;
    cardiac?: number;
    fitness?: number;
    nutrition?: number;
    body?: number;
    neuro?: number;
    biomarker?: number;
}

export interface FitnessPrior {
    steps: number | null;
    activeEnergyBurned: number | null;
    exerciseMinutes: number | null;
    trainingMinutes: number | null;
    vo2Max: number | null;
}

export interface BodyPrior {
    weight: number | null;
    bodyFatPct: number | null;
    leanMassKg: number | null;
}

export interface NutritionPrior {
    totalCalories: number | null;
    totalProtein: number | null;
    hydrationMl: number | null;
    nutritionQualityScore: number | null;
}

// ─── Eval Types ───────────────────────────────────────────────────────────────

/** A single test scenario for the eval harness */
export interface TestScenario {
    id: string;
    name: string;
    category: string;
    description: string;

    // Inputs
    day: AggregatedDay;
    profile: ProfileInput;
    bloodwork?: AggregatedBloodwork | null;
    hrvBaseline?: number | null;

    // Expected outputs (ranges)
    expectedTotalScore: { min: number; max: number };
    expectedDomainScores?: Record<string, { min: number; max: number }>;
    expectedAgingPace?: { min: number; max: number };
    expectedConfidence?: { min: number; max: number };

    // Physiological justification
    rationale: string;
}

/** Eval result for a single scenario */
export interface ScenarioResult {
    scenarioId: string;
    passed: boolean;
    actualTotalScore: number;
    expectedRange: { min: number; max: number };
    domainScores: Record<string, number>;
    confidence: number;
    agingPace: number;
    errors: string[];
}

/** Overall eval metric */
export interface EvalMetric {
    composite: number;         // 0-100, higher = better
    rangeAccuracy: number;     // % of scenarios within expected range
    domainConsistency: number; // Cross-domain correlation score
    monotonicity: number;      // Better inputs → better scores
    stability: number;         // Small perturbations → small changes
    totalScenarios: number;
    passedScenarios: number;
    scenarioResults: ScenarioResult[];
}
