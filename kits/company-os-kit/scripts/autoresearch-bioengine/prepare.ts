/**
 * Autoresearch BioEngine — Synthetic Ground Truth Generator (READ-ONLY)
 *
 * Generates physiologically realistic test scenarios for eval.ts.
 * Each scenario has known-good input signals and expected score ranges
 * derived from clinical literature and domain expertise.
 *
 * Usage: npx tsx prepare.ts
 * Output: ground-truth/scenarios.json
 *
 * ⚠️  DO NOT MODIFY — The agent should only modify engine.ts and config.ts
 */

import type { AggregatedDay, AggregatedBloodwork, ProfileInput, TestScenario } from './types.ts';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Helper: create a blank AggregatedDay ─────────────────────────────────────

function blankDay(date: string): AggregatedDay {
    return {
        date,
        sleepHours: null, sleepQuality: null, deepSleepMinutes: null, remSleepMinutes: null,
        lightSleepMinutes: null, sleepEfficiency: null, sleepRegularity: null, sleepDebtMinutes: null,
        sleepInterruptions: null, sleepLatencyMinutes: null, bedtime: null, wakeTime: null,
        hrvMs: null, hrvDayAvgMs: null, hrvMetricType: 'sdnn', restingHeartRate: null,
        spo2: null, respiratoryRate: null,
        steps: null, activeEnergyBurned: null, totalEnergyBurned: null, sedentaryMinutes: null,
        vo2Max: null, lowIntensityMin: null, medIntensityMin: null, highIntensityMin: null,
        vigorousIntensityMin: null, maximalIntensityMin: null, exerciseMinutes: null,
        daylightMinutes: null, basalEnergyBurned: null, standMinutes: null,
        readinessScore: null, wellbeingScore: null, cognitiveScore: null,
        totalCalories: null, totalProtein: null, hydrationMl: null, nutritionQualityScore: null,
        aresTdee: null, aresDeficitKcal: null,
        weight: null, bodyFatPct: null, leanMassKg: null, waistCm: null, hipCm: null,
        energyLevel: null, stressLevel: null, libidoLevel: null, morningLibido: null, morningMotivation: null,
        trainingMinutes: null, avgSessionRPE: null,
        saunaMinutes: null, coldPlungeMinutes: null, meditationMinutes: null,
        journalMood: null, journalCount: null,
        trustScore: null, frictionScore: null, readinessModifier: null,
        lifeStressorLoad: null, behavioralCoherence: null, selfAwareness: null, motivationTrend: null,
        sources: [],
    };
}

const DEFAULT_PROFILE: ProfileInput = {
    age: 35, gender: 'male', weight: 85, height: 183, birthDate: '1991-01-15',
};

const FEMALE_PROFILE: ProfileInput = {
    age: 32, gender: 'female', weight: 62, height: 168, birthDate: '1994-05-22',
};

// ─── Scenario Generators ──────────────────────────────────────────────────────

function generateOptimalAthleteScenarios(): TestScenario[] {
    const scenarios: TestScenario[] = [];
    const variations = [
        { sleepH: 8.5, eff: 96, hrv: 85, rhr: 48, vo2: 52, steps: 12000 },
        { sleepH: 8.0, eff: 94, hrv: 78, rhr: 50, vo2: 48, steps: 10000 },
        { sleepH: 7.5, eff: 92, hrv: 72, rhr: 52, vo2: 46, steps: 11000 },
        { sleepH: 9.0, eff: 95, hrv: 90, rhr: 46, vo2: 55, steps: 9000 },
        { sleepH: 8.2, eff: 93, hrv: 80, rhr: 49, vo2: 50, steps: 13000 },
    ];

    for (let i = 0; i < variations.length; i++) {
        const v = variations[i];
        const day = blankDay(`2026-03-${(10 + i).toString().padStart(2, '0')}`);
        day.sleepHours = v.sleepH;
        day.sleepEfficiency = v.eff;
        day.deepSleepMinutes = Math.round(v.sleepH * 60 * 0.18);
        day.remSleepMinutes = Math.round(v.sleepH * 60 * 0.22);
        day.sleepLatencyMinutes = 8;
        day.sleepDebtMinutes = 10;
        day.sleepRegularity = 0.92;
        day.readinessScore = 85;
        day.daylightMinutes = 60;
        day.wakeTime = '06:30';

        day.hrvMs = v.hrv;
        day.hrvMetricType = 'sdnn';
        day.restingHeartRate = v.rhr;
        day.spo2 = 98;
        day.respiratoryRate = 13;

        day.steps = v.steps;
        day.activeEnergyBurned = 550;
        day.exerciseMinutes = 45;
        day.vo2Max = v.vo2;
        day.standMinutes = 300;
        day.trainingMinutes = 60;
        day.avgSessionRPE = 7;
        day.medIntensityMin = 30;
        day.highIntensityMin = 20;

        day.totalCalories = 2600;
        day.totalProtein = 150;
        day.hydrationMl = 3000;
        day.nutritionQualityScore = 80;
        day.aresTdee = 2700;

        day.weight = 85;
        day.bodyFatPct = 14;
        day.leanMassKg = 73;

        day.energyLevel = 8;
        day.stressLevel = 3;
        day.morningMotivation = 8;
        day.morningLibido = 7;

        day.saunaMinutes = 20;
        day.meditationMinutes = 15;
        day.journalCount = 3;
        day.journalMood = 0.8;
        day.sources = ['healthkit', 'manual'];

        scenarios.push({
            id: `optimal_athlete_${i + 1}`,
            name: `Optimal Athlete — Variation ${i + 1}`,
            category: 'optimal_athlete',
            description: `Elite biohacker: ${v.sleepH}h sleep, HRV ${v.hrv}ms, RHR ${v.rhr}, VO2 ${v.vo2}`,
            day,
            profile: DEFAULT_PROFILE,
            expectedTotalScore: { min: 75, max: 95 },
            expectedDomainScores: {
                sleep: { min: 70, max: 100 },
                cardiac: { min: 70, max: 100 },
                fitness: { min: 65, max: 100 },
            },
            expectedAgingPace: { min: 0.50, max: 0.85 },
            expectedConfidence: { min: 0.6, max: 1.0 },
            rationale: 'Elite performance across all domains should produce high total score and slow aging pace.',
        });
    }
    return scenarios;
}

function generateAverageAdultScenarios(): TestScenario[] {
    const scenarios: TestScenario[] = [];
    const variations = [
        { sleepH: 7.0, eff: 85, hrv: 45, rhr: 62, steps: 6500 },
        { sleepH: 6.5, eff: 82, hrv: 40, rhr: 65, steps: 5000 },
        { sleepH: 7.5, eff: 88, hrv: 50, rhr: 60, steps: 7500 },
        { sleepH: 7.2, eff: 84, hrv: 42, rhr: 63, steps: 6000 },
        { sleepH: 6.8, eff: 86, hrv: 48, rhr: 61, steps: 7000 },
    ];

    for (let i = 0; i < variations.length; i++) {
        const v = variations[i];
        const day = blankDay(`2026-03-${(15 + i).toString().padStart(2, '0')}`);
        day.sleepHours = v.sleepH;
        day.sleepEfficiency = v.eff;
        day.deepSleepMinutes = Math.round(v.sleepH * 60 * 0.14);
        day.remSleepMinutes = Math.round(v.sleepH * 60 * 0.20);
        day.sleepLatencyMinutes = 18;
        day.sleepDebtMinutes = 35;

        day.hrvMs = v.hrv;
        day.hrvMetricType = 'sdnn';
        day.restingHeartRate = v.rhr;
        day.spo2 = 97;
        day.respiratoryRate = 15;

        day.steps = v.steps;
        day.activeEnergyBurned = 350;
        day.exerciseMinutes = 25;

        day.totalCalories = 2100;
        day.totalProtein = 90;
        day.hydrationMl = 1800;
        day.aresTdee = 2200;

        day.weight = 85;
        day.bodyFatPct = 22;

        day.energyLevel = 6;
        day.stressLevel = 5;
        day.sources = ['healthkit'];

        scenarios.push({
            id: `average_adult_${i + 1}`,
            name: `Average Adult — Variation ${i + 1}`,
            category: 'average_adult',
            description: `Typical adult: ${v.sleepH}h sleep, HRV ${v.hrv}ms, RHR ${v.rhr}, ${v.steps} steps`,
            day,
            profile: DEFAULT_PROFILE,
            expectedTotalScore: { min: 40, max: 65 },
            expectedDomainScores: {
                sleep: { min: 35, max: 70 },
                cardiac: { min: 30, max: 65 },
            },
            expectedAgingPace: { min: 0.85, max: 1.15 },
            expectedConfidence: { min: 0.3, max: 0.7 },
            rationale: 'Average adult metrics should produce mid-range scores close to chronological aging.',
        });
    }
    return scenarios;
}

function generatePoorSleeperScenarios(): TestScenario[] {
    const scenarios: TestScenario[] = [];
    const variations = [
        { sleepH: 4.5, eff: 65, deep: 15, rem: 25, latency: 45 },
        { sleepH: 5.0, eff: 70, deep: 20, rem: 30, latency: 35 },
        { sleepH: 5.5, eff: 72, deep: 25, rem: 35, latency: 40 },
        { sleepH: 4.0, eff: 60, deep: 10, rem: 20, latency: 55 },
        { sleepH: 5.2, eff: 68, deep: 18, rem: 28, latency: 38 },
    ];

    for (let i = 0; i < variations.length; i++) {
        const v = variations[i];
        const day = blankDay(`2026-02-${(10 + i).toString().padStart(2, '0')}`);
        day.sleepHours = v.sleepH;
        day.sleepEfficiency = v.eff;
        day.deepSleepMinutes = v.deep;
        day.remSleepMinutes = v.rem;
        day.sleepLatencyMinutes = v.latency;
        day.sleepDebtMinutes = 120;
        day.sleepInterruptions = 5;

        day.hrvMs = 35;
        day.restingHeartRate = 68;
        day.spo2 = 96;

        day.steps = 4000;
        day.activeEnergyBurned = 200;
        day.energyLevel = 3;
        day.stressLevel = 7;
        day.sources = ['healthkit'];

        scenarios.push({
            id: `poor_sleeper_${i + 1}`,
            name: `Poor Sleeper — Variation ${i + 1}`,
            category: 'poor_sleeper',
            description: `Chronic poor sleep: ${v.sleepH}h, ${v.eff}% eff, ${v.latency}min latency`,
            day,
            profile: DEFAULT_PROFILE,
            expectedTotalScore: { min: 20, max: 50 },
            expectedDomainScores: {
                sleep: { min: 10, max: 40 },
            },
            expectedAgingPace: { min: 1.05, max: 1.50 },
            rationale: 'Poor sleep architecture with high stress should produce low scores and accelerated aging.',
        });
    }
    return scenarios;
}

function generateRecoveryDayScenarios(): TestScenario[] {
    const scenarios: TestScenario[] = [];
    const combos = [
        { sauna: 25, cold: 5, meditation: 20 },
        { sauna: 30, cold: 0, meditation: 30 },
        { sauna: 0, cold: 10, meditation: 25 },
        { sauna: 20, cold: 3, meditation: 15 },
        { sauna: 15, cold: 8, meditation: 0 },
    ];

    for (let i = 0; i < combos.length; i++) {
        const c = combos[i];
        const day = blankDay(`2026-03-${(20 + i).toString().padStart(2, '0')}`);
        day.sleepHours = 8.0;
        day.sleepEfficiency = 90;
        day.deepSleepMinutes = 85;
        day.remSleepMinutes = 100;
        day.readinessScore = 70;

        day.hrvMs = 55;
        day.restingHeartRate = 56;
        day.spo2 = 98;
        day.respiratoryRate = 13.5;

        day.steps = 5000;
        day.activeEnergyBurned = 200;

        day.saunaMinutes = c.sauna || null;
        day.coldPlungeMinutes = c.cold || null;
        day.meditationMinutes = c.meditation || null;

        day.energyLevel = 7;
        day.stressLevel = 3;
        day.wellbeingScore = 70;
        day.journalCount = 2;
        day.journalMood = 0.7;
        day.sources = ['healthkit', 'manual'];

        scenarios.push({
            id: `recovery_day_${i + 1}`,
            name: `Recovery Day — ${c.sauna ? 'Sauna' : ''}${c.cold ? '+Cold' : ''}${c.meditation ? '+Med' : ''}`,
            category: 'recovery_day',
            description: `Rest day with recovery: sauna=${c.sauna}m, cold=${c.cold}m, meditation=${c.meditation}m`,
            day,
            profile: DEFAULT_PROFILE,
            expectedTotalScore: { min: 55, max: 80 },
            expectedDomainScores: {
                sleep: { min: 55, max: 90 },
                neuro: { min: 55, max: 85 },
            },
            rationale: 'Recovery modalities should boost readiness/neuro sub-scores. Low activity but good recovery.',
        });
    }
    return scenarios;
}

function generateHeavyTrainingScenarios(): TestScenario[] {
    const scenarios: TestScenario[] = [];
    const workouts = [
        { training: 90, rpe: 8.5, zone3: 30, zone4: 20, steps: 15000, energy: 400 },
        { training: 60, rpe: 9.0, zone3: 20, zone4: 25, steps: 12000, energy: 600 },
        { training: 120, rpe: 7.0, zone3: 40, zone4: 15, steps: 18000, energy: 800 },
        { training: 45, rpe: 9.5, zone3: 15, zone4: 20, steps: 8000, energy: 350 },
        { training: 75, rpe: 8.0, zone3: 25, zone4: 18, steps: 11000, energy: 500 },
    ];

    for (let i = 0; i < workouts.length; i++) {
        const w = workouts[i];
        const day = blankDay(`2026-03-${(5 + i).toString().padStart(2, '0')}`);
        day.sleepHours = 7.5;
        day.sleepEfficiency = 88;
        day.deepSleepMinutes = 75;
        day.remSleepMinutes = 95;

        day.hrvMs = 50;
        day.restingHeartRate = 55;
        day.spo2 = 97;

        day.steps = w.steps;
        day.activeEnergyBurned = w.energy;
        day.exerciseMinutes = w.training;
        day.trainingMinutes = w.training;
        day.avgSessionRPE = w.rpe;
        day.highIntensityMin = w.zone3;
        day.vigorousIntensityMin = w.zone4;
        day.medIntensityMin = 40;
        day.standMinutes = 360;
        day.vo2Max = 45;

        day.totalCalories = 2800;
        day.totalProtein = 160;
        day.hydrationMl = 3500;
        day.aresTdee = 3000;

        day.energyLevel = 6;
        day.morningMotivation = 8;
        day.sources = ['healthkit', 'manual'];

        scenarios.push({
            id: `heavy_training_${i + 1}`,
            name: `Heavy Training — ${w.training}min RPE ${w.rpe}`,
            category: 'heavy_training',
            description: `Hard workout: ${w.training}min, RPE ${w.rpe}, ${w.energy} kcal active`,
            day,
            profile: DEFAULT_PROFILE,
            expectedTotalScore: { min: 55, max: 80 },
            expectedDomainScores: {
                fitness: { min: 60, max: 100 },
            },
            expectedAgingPace: { min: 0.70, max: 1.10 },
            rationale: 'Heavy training should produce high fitness scores. Other domains at moderate baseline.',
        });
    }
    return scenarios;
}

function generateBiomarkerOnlyScenarios(): TestScenario[] {
    const scenarios: TestScenario[] = [];
    const panels = [
        { albumin: 4.5, creat: 0.9, crp: 0.3, glucose: 85, hba1c: 4.8, hdl: 65, ldl: 90, vitD: 55, testo: 650 },
        { albumin: 3.8, creat: 1.4, crp: 5.0, glucose: 115, hba1c: 6.0, hdl: 38, ldl: 155, vitD: 22, testo: 280 },
        { albumin: 4.2, creat: 1.0, crp: 1.5, glucose: 95, hba1c: 5.3, hdl: 52, ldl: 120, vitD: 40, testo: 500 },
        { albumin: 4.7, creat: 0.8, crp: 0.1, glucose: 78, hba1c: 4.5, hdl: 72, ldl: 75, vitD: 65, testo: 720 },
        { albumin: 3.5, creat: 1.6, crp: 8.0, glucose: 130, hba1c: 6.8, hdl: 35, ldl: 180, vitD: 15, testo: 200 },
    ];
    const expectedScores = [
        { min: 55, max: 80 },  // excellent markers
        { min: 30, max: 55 },  // poor markers
        { min: 45, max: 65 },  // average markers
        { min: 60, max: 85 },  // elite markers
        { min: 20, max: 45 },  // terrible markers
    ];

    for (let i = 0; i < panels.length; i++) {
        const p = panels[i];
        const day = blankDay(`2026-01-${(15 + i).toString().padStart(2, '0')}`);
        // Minimal wearable data — only sleep + basic cardiac
        day.sleepHours = 7.0;
        day.sleepEfficiency = 85;
        day.hrvMs = 45;
        day.restingHeartRate = 60;
        day.sources = ['healthkit'];

        const bloodwork: AggregatedBloodwork = {
            testDate: day.date,
            albumin: p.albumin,
            creatinine: p.creat,
            hsCrp: p.crp,
            fastingGlucose: p.glucose,
            wbc: 6.0,
            hba1c: p.hba1c,
            totalCholesterol: null,
            ldl: p.ldl,
            hdl: p.hdl,
            triglycerides: 110,
            vitaminD: p.vitD,
            ferritin: 80,
            testosterone: p.testo,
            tsh: 2.0,
        };

        scenarios.push({
            id: `biomarker_only_${i + 1}`,
            name: `Biomarker Panel — ${i === 0 ? 'Excellent' : i === 1 ? 'Poor' : i === 2 ? 'Average' : i === 3 ? 'Elite' : 'Critical'}`,
            category: 'biomarker_only',
            description: `Focus: bloodwork. CRP=${p.crp}, HbA1c=${p.hba1c}, LDL=${p.ldl}`,
            day,
            profile: DEFAULT_PROFILE,
            bloodwork,
            expectedTotalScore: expectedScores[i],
            rationale: 'Biomarker-heavy scenario tests proper weighting and dynamic boost when bloodwork available.',
        });
    }
    return scenarios;
}

function generateMissingDataScenarios(): TestScenario[] {
    const scenarios: TestScenario[] = [];

    // 1. Only sleep data
    const sleepOnly = blankDay('2026-02-01');
    sleepOnly.sleepHours = 7.5;
    sleepOnly.sleepEfficiency = 90;
    sleepOnly.deepSleepMinutes = 80;
    sleepOnly.remSleepMinutes = 95;
    sleepOnly.sources = ['healthkit'];
    scenarios.push({
        id: 'missing_sleep_only',
        name: 'Missing Data — Sleep Only',
        category: 'missing_data',
        description: 'Only sleep signals available, everything else missing',
        day: sleepOnly,
        profile: DEFAULT_PROFILE,
        expectedTotalScore: { min: 35, max: 65 },
        expectedConfidence: { min: 0.05, max: 0.20 },
        rationale: 'With only 1 domain, confidence should be very low. Score pulled toward neutral by redistribution.',
    });

    // 2. Only cardiac + steps
    const cardiacSteps = blankDay('2026-02-02');
    cardiacSteps.hrvMs = 55;
    cardiacSteps.restingHeartRate = 54;
    cardiacSteps.spo2 = 98;
    cardiacSteps.steps = 10000;
    cardiacSteps.sources = ['healthkit'];
    scenarios.push({
        id: 'missing_cardiac_steps',
        name: 'Missing Data — Cardiac + Steps',
        category: 'missing_data',
        description: 'Good cardiac signals + steps, nothing else',
        day: cardiacSteps,
        profile: DEFAULT_PROFILE,
        expectedTotalScore: { min: 40, max: 70 },
        expectedConfidence: { min: 0.08, max: 0.25 },
        rationale: 'Good cardiac should push score above neutral but low confidence from missing domains.',
    });

    // 3. Nearly complete (only biomarker missing)
    const almostComplete = blankDay('2026-02-03');
    almostComplete.sleepHours = 7.5;
    almostComplete.sleepEfficiency = 88;
    almostComplete.deepSleepMinutes = 78;
    almostComplete.remSleepMinutes = 90;
    almostComplete.hrvMs = 50;
    almostComplete.restingHeartRate = 58;
    almostComplete.spo2 = 97;
    almostComplete.steps = 8000;
    almostComplete.activeEnergyBurned = 400;
    almostComplete.vo2Max = 42;
    almostComplete.totalCalories = 2200;
    almostComplete.totalProtein = 120;
    almostComplete.hydrationMl = 2500;
    almostComplete.weight = 85;
    almostComplete.bodyFatPct = 18;
    almostComplete.energyLevel = 7;
    almostComplete.stressLevel = 4;
    almostComplete.sources = ['healthkit', 'manual'];
    scenarios.push({
        id: 'missing_no_biomarker',
        name: 'Missing Data — No Biomarker',
        category: 'missing_data',
        description: 'All domains populated except biomarker — typical daily state',
        day: almostComplete,
        profile: DEFAULT_PROFILE,
        expectedTotalScore: { min: 50, max: 75 },
        expectedConfidence: { min: 0.35, max: 0.65 },
        rationale: 'Most common real-world scenario. Score should be reasonable with moderate confidence.',
    });

    // 4. Completely empty
    const empty = blankDay('2026-02-04');
    empty.sources = [];
    scenarios.push({
        id: 'missing_empty',
        name: 'Missing Data — Completely Empty',
        category: 'missing_data',
        description: 'No data at all — should return neutral fallback',
        day: empty,
        profile: DEFAULT_PROFILE,
        expectedTotalScore: { min: 45, max: 55 },
        expectedConfidence: { min: 0, max: 0.05 },
        rationale: 'Zero signals should produce neutral score (50) with zero confidence.',
    });

    // 5. Female profile with partial data
    const femalePartial = blankDay('2026-02-05');
    femalePartial.sleepHours = 7.8;
    femalePartial.sleepEfficiency = 91;
    femalePartial.hrvMs = 48;
    femalePartial.restingHeartRate = 60;
    femalePartial.steps = 7500;
    femalePartial.weight = 62;
    femalePartial.bodyFatPct = 24;
    femalePartial.sources = ['healthkit'];
    scenarios.push({
        id: 'missing_female_partial',
        name: 'Missing Data — Female Partial Signals',
        category: 'missing_data',
        description: 'Female profile with basic sleep + cardiac + body. Tests gender-aware scoring.',
        day: femalePartial,
        profile: FEMALE_PROFILE,
        expectedTotalScore: { min: 40, max: 70 },
        expectedConfidence: { min: 0.10, max: 0.35 },
        rationale: 'Female-specific body fat thresholds and HR ranges should be applied correctly.',
    });

    return scenarios;
}

function generateEdgeCaseScenarios(): TestScenario[] {
    const scenarios: TestScenario[] = [];

    // 1. Extreme HRV spike (145ms with baseline 55)
    const hrvSpike = blankDay('2026-01-30');
    hrvSpike.hrvMs = 145;
    hrvSpike.restingHeartRate = 50;
    hrvSpike.sleepHours = 8.0;
    hrvSpike.sleepEfficiency = 92;
    hrvSpike.sources = ['healthkit'];
    scenarios.push({
        id: 'edge_hrv_spike',
        name: 'Edge Case — Extreme HRV Spike',
        category: 'edge_case',
        description: 'HRV 145ms (population sigmoid should handle gracefully)',
        day: hrvSpike,
        profile: DEFAULT_PROFILE,
        hrvBaseline: 55,
        expectedTotalScore: { min: 50, max: 85 },
        rationale: 'Extreme HRV should score high but not break the system. Baseline ratio = 2.6x.',
    });

    // 2. Neuro veto: great wearables, terrible subjective
    const vetoDay = blankDay('2026-01-31');
    vetoDay.sleepHours = 8.0;
    vetoDay.sleepEfficiency = 93;
    vetoDay.deepSleepMinutes = 85;
    vetoDay.remSleepMinutes = 100;
    vetoDay.hrvMs = 65;
    vetoDay.restingHeartRate = 52;
    vetoDay.steps = 10000;
    vetoDay.activeEnergyBurned = 500;
    vetoDay.energyLevel = 1;  // critical
    vetoDay.stressLevel = 9;
    vetoDay.morningMotivation = 2;
    vetoDay.sources = ['healthkit', 'manual'];
    scenarios.push({
        id: 'edge_neuro_veto',
        name: 'Edge Case — Neuro Veto (Great Metrics, Feels Terrible)',
        category: 'edge_case',
        description: 'All wearable metrics excellent but energy=1, stress=9 → neuro veto should cap score',
        day: vetoDay,
        profile: DEFAULT_PROFILE,
        expectedTotalScore: { min: 40, max: 70 },
        expectedDomainScores: {
            neuro: { min: 5, max: 35 },
        },
        rationale: 'Neuro veto should cap neuro domain at 30 despite great wearable data.',
    });

    // 3. Maximum recovery stacking
    const maxRecovery = blankDay('2026-02-15');
    maxRecovery.sleepHours = 9.0;
    maxRecovery.readinessScore = 55;
    maxRecovery.saunaMinutes = 40;
    maxRecovery.coldPlungeMinutes = 15;
    maxRecovery.meditationMinutes = 30;
    maxRecovery.wellbeingScore = 60;
    maxRecovery.energyLevel = 7;
    maxRecovery.sources = ['healthkit', 'manual'];
    scenarios.push({
        id: 'edge_max_recovery',
        name: 'Edge Case — Maximum Recovery Stacking',
        category: 'edge_case',
        description: 'All recovery modalities maxed: sauna 40m, cold 15m, meditation 30m',
        day: maxRecovery,
        profile: DEFAULT_PROFILE,
        expectedTotalScore: { min: 45, max: 75 },
        rationale: 'Recovery signals should boost readiness and neuro but not create unrealistic scores.',
    });

    // 4. Zero weight / height
    const noBodyMetrics = blankDay('2026-02-16');
    noBodyMetrics.sleepHours = 7.5;
    noBodyMetrics.hrvMs = 50;
    noBodyMetrics.steps = 8000;
    noBodyMetrics.sources = ['healthkit'];
    scenarios.push({
        id: 'edge_no_body_profile',
        name: 'Edge Case — No Weight/Height in Profile',
        category: 'edge_case',
        description: 'Profile has no weight or height — body/nutrition scoring must handle gracefully',
        day: noBodyMetrics,
        profile: { age: 35, gender: 'male', weight: null, height: null, birthDate: null },
        expectedTotalScore: { min: 35, max: 65 },
        rationale: 'Missing profile data should gracefully degrade — no crashes, neutral body domain.',
    });

    // 5. Older adult (age 65)
    const olderAdult = blankDay('2026-02-17');
    olderAdult.sleepHours = 6.5;
    olderAdult.sleepEfficiency = 80;
    olderAdult.deepSleepMinutes = 35;
    olderAdult.remSleepMinutes = 65;
    olderAdult.hrvMs = 28;
    olderAdult.restingHeartRate = 68;
    olderAdult.spo2 = 96;
    olderAdult.steps = 4500;
    olderAdult.vo2Max = 28;
    olderAdult.weight = 80;
    olderAdult.bodyFatPct = 25;
    olderAdult.energyLevel = 5;
    olderAdult.sources = ['healthkit'];
    scenarios.push({
        id: 'edge_older_adult',
        name: 'Edge Case — Older Adult (65y)',
        category: 'edge_case',
        description: 'Age-appropriate metrics for 65yo: lower HRV, less deep sleep, lower VO2Max',
        day: olderAdult,
        profile: { age: 65, gender: 'male', weight: 80, height: 178, birthDate: '1961-06-10' },
        expectedTotalScore: { min: 30, max: 60 },
        rationale: 'Age-adjusted scoring should recognize this as average-for-age, not penalize like a 35yo.',
    });

    return scenarios;
}

// ─── Monotonicity Pairs ───────────────────────────────────────────────────────
// Pairs where A should ALWAYS score higher than B

function generateMonotonicityPairs(): TestScenario[] {
    // Better sleep should produce higher sleep score
    const goodSleep = blankDay('2026-04-01');
    goodSleep.sleepHours = 8.5;
    goodSleep.sleepEfficiency = 95;
    goodSleep.deepSleepMinutes = 100;
    goodSleep.remSleepMinutes = 110;
    goodSleep.sleepLatencyMinutes = 5;
    goodSleep.sleepDebtMinutes = 0;
    goodSleep.sources = ['healthkit'];

    const badSleep = blankDay('2026-04-02');
    badSleep.sleepHours = 4.5;
    badSleep.sleepEfficiency = 60;
    badSleep.deepSleepMinutes = 15;
    badSleep.remSleepMinutes = 20;
    badSleep.sleepLatencyMinutes = 50;
    badSleep.sleepDebtMinutes = 180;
    badSleep.sources = ['healthkit'];

    // Better cardiac should produce higher cardiac score
    const goodCardiac = blankDay('2026-04-03');
    goodCardiac.hrvMs = 90;
    goodCardiac.restingHeartRate = 45;
    goodCardiac.spo2 = 99;
    goodCardiac.respiratoryRate = 12;
    goodCardiac.sources = ['healthkit'];

    const badCardiac = blankDay('2026-04-04');
    badCardiac.hrvMs = 20;
    badCardiac.restingHeartRate = 80;
    badCardiac.spo2 = 93;
    badCardiac.respiratoryRate = 20;
    badCardiac.sources = ['healthkit'];

    return [
        {
            id: 'mono_sleep_good',
            name: 'Monotonicity — Good Sleep (A)',
            category: 'monotonicity_pair',
            description: 'Good sleep: 8.5h, 95% eff, proper architecture',
            day: goodSleep,
            profile: DEFAULT_PROFILE,
            expectedTotalScore: { min: 50, max: 100 },
            rationale: 'MUST score higher than mono_sleep_bad',
        },
        {
            id: 'mono_sleep_bad',
            name: 'Monotonicity — Bad Sleep (B)',
            category: 'monotonicity_pair',
            description: 'Bad sleep: 4.5h, 60% eff, minimal deep/REM',
            day: badSleep,
            profile: DEFAULT_PROFILE,
            expectedTotalScore: { min: 0, max: 50 },
            rationale: 'MUST score lower than mono_sleep_good',
        },
        {
            id: 'mono_cardiac_good',
            name: 'Monotonicity — Good Cardiac (A)',
            category: 'monotonicity_pair',
            description: 'Elite cardiac: HRV 90ms, RHR 45, SpO2 99%',
            day: goodCardiac,
            profile: DEFAULT_PROFILE,
            expectedTotalScore: { min: 50, max: 100 },
            rationale: 'MUST score higher than mono_cardiac_bad',
        },
        {
            id: 'mono_cardiac_bad',
            name: 'Monotonicity — Bad Cardiac (B)',
            category: 'monotonicity_pair',
            description: 'Poor cardiac: HRV 20ms, RHR 80, SpO2 93%',
            day: badCardiac,
            profile: DEFAULT_PROFILE,
            expectedTotalScore: { min: 0, max: 50 },
            rationale: 'MUST score lower than mono_cardiac_good',
        },
    ];
}

// ─── Main: Generate All Scenarios ─────────────────────────────────────────────

function generateAllScenarios(): TestScenario[] {
    return [
        ...generateOptimalAthleteScenarios(),
        ...generateAverageAdultScenarios(),
        ...generatePoorSleeperScenarios(),
        ...generateRecoveryDayScenarios(),
        ...generateHeavyTrainingScenarios(),
        ...generateBiomarkerOnlyScenarios(),
        ...generateMissingDataScenarios(),
        ...generateEdgeCaseScenarios(),
        ...generateMonotonicityPairs(),
    ];
}

// ─── Execute ──────────────────────────────────────────────────────────────────

const scenarios = generateAllScenarios();
const outDir = join(__dirname, 'ground-truth');
mkdirSync(outDir, { recursive: true });

const outPath = join(outDir, 'scenarios.json');
writeFileSync(outPath, JSON.stringify(scenarios, null, 2), 'utf-8');

console.log(`✅ Generated ${scenarios.length} test scenarios`);
console.log(`   Categories: ${[...new Set(scenarios.map(s => s.category))].join(', ')}`);
console.log(`   Output: ${outPath}`);
