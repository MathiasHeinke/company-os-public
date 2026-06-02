/**
 * Autoresearch BioEngine — Scoring Engine (AGENT MAY MODIFY)
 *
 * This is the equivalent of Karpathy's `train.py` — the ONLY scoring logic
 * file the agent should modify during autoresearch experiments.
 *
 * All tuneable constants are imported from config.ts (agent may also modify).
 * Types come from types.ts (read-only).
 * Math utilities come from math.ts (read-only).
 *
 * Architecture:
 *   computeDayScore(day, profile, opts?) → DayResult
 *   rollUpScores(results[], window) → RolledUpResult
 *
 * ✅ AGENT: You may modify scoring logic, sigmoid curves, weight formulas,
 *    redistribution strategy, and any algorithmic approach in this file.
 */

import type {
    AggregatedDay, AggregatedBloodwork, ProfileInput,
    SubScore, DomainResult, DayResult, RolledUpResult,
    Contribution, DomainModifiers, FitnessPrior, BodyPrior, NutritionPrior,
} from './types.ts';
import { clamp, sigmoid, avg, stdDev, computeZoneLoad } from './math.ts';
import {
    DOMAIN_WEIGHTS, DOMAIN_CLASSIFICATION, SLEEP, CARDIAC, FITNESS,
    NUTRITION, BODY, NEURO, BIOMARKER, ACCUMULATOR, REDISTRIBUTION,
    RECOVERY_SIGNALS, MACRO_SHOCK, EXOGENOUS, MAX_SIGNALS, VO2MAX_TABLES,
} from './config.ts';

export const ENGINE_VERSION = '4.0-autoresearch';

// ─── Recovery Signal Applicator ───────────────────────────────────────────────

function applyRecoverySignals(
    d: AggregatedDay,
    domain: 'sleep' | 'neuro',
    subs: SubScore[],
): void {
    for (const sig of RECOVERY_SIGNALS) {
        if (!sig.enabled || sig.targetDomain !== domain) continue;
        const minutes = d[sig.field] as number | null;
        if (minutes == null || minutes <= 0) continue;

        const bonus = clamp(
            sigmoid((minutes - sig.sigmoidMidpoint) / sig.sigmoidSpread) * sig.maxBonus,
            sig.minBonus,
            sig.maxBonus,
        );

        const target = subs[sig.targetSubIndex];
        if (target) {
            if (target.available) {
                target.score = clamp(target.score + bonus, 0, 100);
            } else {
                target.score = clamp(sig.neutralBase + bonus, 0, 100);
                target.available = true;
            }
        }

        if (sig.spillover) {
            const spill = subs[sig.spillover.subIndex];
            if (spill && spill.available) {
                spill.score = clamp(spill.score + bonus * sig.spillover.fraction, 0, 100);
            }
        }
    }
}

// ─── Weight Redistribution ────────────────────────────────────────────────────

function redistributeAndScore(items: { score: number; weight: number; available: boolean }[]): number {
    const available = items.filter(i => i.available);
    if (available.length === 0) return REDISTRIBUTION.neutralFallback;

    const totalBaseWeight = items.reduce((sum, i) => sum + i.weight, 0);
    const missingWeight = items.filter(i => !i.available).reduce((sum, i) => sum + i.weight, 0);

    let score = 0;
    let usedWeight = 0;

    for (const item of items) {
        if (item.available) {
            const maxWeight = item.weight * REDISTRIBUTION.maxReweightFactor;
            const redistributedShare = missingWeight * (item.weight / (totalBaseWeight - missingWeight || 1));
            const effectiveWeight = Math.min(item.weight + redistributedShare, maxWeight);
            score += item.score * effectiveWeight;
            usedWeight += effectiveWeight;
        } else {
            const absorbed = items.filter(i => i.available).reduce((sum, i) => {
                const share = missingWeight * (i.weight / (totalBaseWeight - missingWeight || 1));
                const capped = Math.min(share, i.weight * (REDISTRIBUTION.maxReweightFactor - 1));
                return sum + capped;
            }, 0);
            const remainingWeight = item.weight - (absorbed / items.filter(i => !i.available).length || 0);
            if (remainingWeight > 0.001) {
                score += REDISTRIBUTION.neutralFallback * remainingWeight;
                usedWeight += remainingWeight;
            }
        }
    }

    return usedWeight > 0 ? score / usedWeight : REDISTRIBUTION.neutralFallback;
}

// ─── Progressive Bio-Delta ────────────────────────────────────────────────────

function progressiveBioDelta(totalScore: number): number {
    const normalized = (totalScore - 50) / 50;
    const sign = normalized >= 0 ? 1 : -1;
    return sign * Math.pow(Math.abs(normalized), ACCUMULATOR.progressiveExponent) * ACCUMULATOR.progressiveRange;
}

// ─── 1. Sleep Domain ──────────────────────────────────────────────────────────

function scoreSleep(d: AggregatedDay, profile: ProfileInput, sleepTargetHours: number = 8.0): DomainResult {
    const w = SLEEP.subWeights;
    const subs: SubScore[] = [
        { key: 'efficiency', score: 0, weight: w.efficiency, available: false },
        { key: 'architecture', score: 0, weight: w.architecture, available: false },
        { key: 'duration', score: 0, weight: w.duration, available: false },
        { key: 'regularity', score: 0, weight: w.regularity, available: false },
        { key: 'latency', score: 0, weight: w.latency, available: false },
        { key: 'debt', score: 0, weight: w.debt, available: false },
        { key: 'bedtime', score: 0, weight: w.bedtime, available: false },
        { key: 'readiness', score: 0, weight: w.readiness, available: false },
        { key: 'daylight', score: 0, weight: w.daylight, available: false },
    ];

    if (d.sleepEfficiency != null && d.sleepEfficiency > 0) {
        const eff = Math.min(d.sleepEfficiency, 100);
        subs[0].score = clamp(sigmoid((eff - SLEEP.efficiency.midpoint) / SLEEP.efficiency.spread) * 100, 5, 100);
        subs[0].available = true;
    }

    if (d.deepSleepMinutes != null && d.remSleepMinutes != null && d.sleepHours != null && d.sleepHours > 0) {
        const totalMin = d.sleepHours * 60;
        const deepPct = d.deepSleepMinutes / totalMin;
        const remPct = d.remSleepMinutes / totalMin;
        const age = profile.age;
        const cfg = age < 30 ? SLEEP.deepOptimalByAge.under30
            : age < 40 ? SLEEP.deepOptimalByAge.under40
            : age < 50 ? SLEEP.deepOptimalByAge.under50
            : age < 60 ? SLEEP.deepOptimalByAge.under60
            : SLEEP.deepOptimalByAge.over60;
        const deepMid = cfg.min + cfg.range / 2;
        const deepScore = clamp(sigmoid(-Math.abs(deepPct - deepMid) / SLEEP.architectureSigmoidSpread + 2) * 100, 10, 100);
        const remScore = clamp(sigmoid(-Math.abs(remPct - SLEEP.remOptimal) / SLEEP.architectureSigmoidSpread + 2) * 100, 10, 100);
        subs[1].score = deepScore * SLEEP.deepWeight + remScore * SLEEP.remWeight;
        subs[1].available = true;
    }

    if (d.sleepHours != null && d.sleepHours > 0) {
        subs[2].score = clamp(sigmoid(-Math.abs(d.sleepHours - sleepTargetHours) / SLEEP.duration.spread + 2) * 100, 5, 100);
        subs[2].available = true;
    }

    if (d.sleepRegularity != null && d.sleepRegularity > 0) {
        subs[3].score = Math.min(100, d.sleepRegularity * 100);
        subs[3].available = true;
    }

    if (d.sleepLatencyMinutes != null && d.sleepLatencyMinutes >= 0) {
        subs[4].score = clamp(sigmoid(-(d.sleepLatencyMinutes - SLEEP.latency.midpoint) / SLEEP.latency.spread) * 100, 5, 100);
        subs[4].available = true;
    }

    if (d.sleepDebtMinutes != null && d.sleepDebtMinutes >= 0) {
        subs[5].score = clamp(sigmoid(-(d.sleepDebtMinutes - SLEEP.debt.midpoint) / SLEEP.debt.spread) * 100, 5, 100);
        subs[5].available = true;
    }

    if (d.sleepQuality != null && d.sleepQuality > 0) {
        subs[6].score = Math.min(100, d.sleepQuality * 10);
        subs[6].available = true;
    }

    if (d.readinessScore != null) {
        subs[7].score = clamp(d.readinessScore, 0, 100);
        subs[7].available = true;
    }

    applyRecoverySignals(d, 'sleep', subs);

    if (d.daylightMinutes != null && d.daylightMinutes > 0) {
        let daylightScore = clamp(sigmoid((d.daylightMinutes - SLEEP.daylight.midpoint) / SLEEP.daylight.spread) * 100, 10, 100);
        if (d.wakeTime != null) {
            const wakeHour = parseInt(d.wakeTime.split(':')[0] ?? '8', 10);
            if (wakeHour <= SLEEP.earlyWakeHour) daylightScore = Math.min(100, daylightScore * SLEEP.earlyWakeBonus);
        }
        subs[8].score = daylightScore;
        subs[8].available = true;
    }

    const score = redistributeAndScore(subs);
    return { key: 'sleep', score, weight: DOMAIN_WEIGHTS.sleep, available: subs.some(s => s.available), subScores: subs };
}

// ─── 2. Cardiac Domain ────────────────────────────────────────────────────────

function scoreCardiac(d: AggregatedDay, hrvBaseline?: number | null): DomainResult {
    const w = CARDIAC.subWeights;
    const subs: SubScore[] = [
        { key: 'hrvLevel', score: 0, weight: w.hrvLevel, available: false },
        { key: 'restingHR', score: 0, weight: w.restingHR, available: false },
        { key: 'spo2', score: 0, weight: w.spo2, available: false },
        { key: 'respiratoryRate', score: 0, weight: w.respiratoryRate, available: false },
    ];

    if (d.hrvMs != null) {
        let hrvScore: number;
        if (hrvBaseline != null && hrvBaseline > 0) {
            const ratio = d.hrvMs / hrvBaseline;
            hrvScore = sigmoid((ratio - 1.0) * CARDIAC.hrvBaselineScale) * 100;
        } else {
            const pop = d.hrvMetricType === 'rmssd' ? CARDIAC.hrvPopulation.rmssd : CARDIAC.hrvPopulation.sdnn;
            hrvScore = sigmoid((d.hrvMs - pop.midpoint) / pop.spread) * 100;
        }
        subs[0].score = hrvScore;
        subs[0].available = true;
    }

    if (d.restingHeartRate != null) {
        subs[1].score = sigmoid(-(d.restingHeartRate - CARDIAC.rhr.midpoint) / CARDIAC.rhr.spread) * 100;
        subs[1].available = true;
    }

    if (d.spo2 != null && d.spo2 > 0 && d.spo2 <= 100) {
        subs[2].score = clamp((d.spo2 - CARDIAC.spo2.min) / CARDIAC.spo2.range, 0, 1) * 100;
        subs[2].available = true;
    }

    if (d.respiratoryRate != null && d.respiratoryRate > 0) {
        subs[3].score = sigmoid(-(d.respiratoryRate - CARDIAC.respRate.midpoint) / CARDIAC.respRate.spread) * 100;
        subs[3].available = true;
    }

    const score = redistributeAndScore(subs);
    return { key: 'cardiac', score, weight: DOMAIN_WEIGHTS.cardiac, available: subs.some(s => s.available), subScores: subs };
}

// ─── 3. Fitness Domain ────────────────────────────────────────────────────────

function scoreVo2Max(vo2: number, age: number, sex: 'male' | 'female'): number {
    const decade = Math.min(60, Math.max(20, Math.floor(age / 10) * 10));
    const ref = VO2MAX_TABLES[`${sex}_${decade}`] || VO2MAX_TABLES['male_30'];
    if (vo2 >= ref.excellent) return 100;
    if (vo2 >= ref.good) return 80;
    if (vo2 >= ref.average) return 60;
    if (vo2 >= ref.belowAvg) return 40;
    return 20;
}

function scoreFitness(d: AggregatedDay, profile: ProfileInput, prior?: FitnessPrior | null): DomainResult {
    const sex = (profile.gender === 'female') ? 'female' as const : 'male' as const;

    const todayActive = d.activeEnergyBurned ?? 0;
    const hasPrior = prior != null && (prior.activeEnergyBurned ?? 0) > 0;
    const todayWeight = hasPrior
        ? clamp((todayActive - FITNESS.intradayRampStart) / FITNESS.intradayRampRange, 0.0, 1.0)
        : 1.0;
    const priorWeight = 1.0 - todayWeight;

    const blendNum = (today: number | null, priorVal: number | null): number | null => {
        if (today != null && today > 0 && priorVal != null && priorVal > 0) {
            return Math.round(today * todayWeight + priorVal * priorWeight);
        }
        return today != null && today > 0 ? today : priorVal ?? null;
    };

    const bSteps = blendNum(d.steps, prior?.steps ?? null);
    const bActiveEnergy = blendNum(d.activeEnergyBurned, prior?.activeEnergyBurned ?? null);
    const bExerciseMin = blendNum(d.exerciseMinutes, prior?.exerciseMinutes ?? null);
    const bTrainingMin = blendNum(d.trainingMinutes, prior?.trainingMinutes ?? null);
    const bVo2Max = d.vo2Max ?? prior?.vo2Max ?? null;

    const w = FITNESS.subWeights;
    const subs: SubScore[] = [
        { key: 'vo2Max', score: 0, weight: w.vo2Max, available: false },
        { key: 'activityVolume', score: 0, weight: w.activityVolume, available: false },
        { key: 'movementConsistency', score: 0, weight: w.movementConsistency, available: false },
        { key: 'physiologicalLoad', score: 0, weight: w.physiologicalLoad, available: false },
        { key: 'sedentary', score: 0, weight: w.sedentary, available: false },
    ];

    if (bVo2Max != null && bVo2Max > 0) {
        subs[0].score = scoreVo2Max(bVo2Max, profile.age, sex);
        subs[0].available = true;
    }

    const hasActivity = bActiveEnergy != null || bExerciseMin != null;
    if (hasActivity) {
        let actScore = 50;
        if (bActiveEnergy != null) {
            actScore = clamp(bActiveEnergy / FITNESS.activityEnergyTarget * 100, 10, 100);
        } else if (bExerciseMin != null) {
            actScore = clamp(bExerciseMin / FITNESS.exerciseMinutesTarget * 100, 10, 100);
        }
        subs[1].score = actScore;
        subs[1].available = true;
    }

    if (bSteps != null && bSteps > 0) {
        subs[2].score = sigmoid((bSteps - FITNESS.steps.midpoint) / FITNESS.steps.spread) * 100;
        subs[2].available = true;
    }

    let loadScore = 0;
    let loadAvailable = false;

    if ((bTrainingMin ?? 0) > 0) {
        loadScore = clamp(bTrainingMin! / FITNESS.trainingMinutesTarget * 100, 10, 100);
        if (d.avgSessionRPE != null && d.avgSessionRPE >= FITNESS.rpeThreshold) {
            loadScore = Math.min(100, loadScore * FITNESS.rpeBoostFactor);
        }
        loadAvailable = true;
    }

    const zoneLoad = computeZoneLoad({
        lowIntensityMin: d.lowIntensityMin ?? null,
        moderateIntensityMin: d.medIntensityMin ?? null,
        highIntensityMin: d.highIntensityMin ?? null,
        vigorousIntensityMin: d.vigorousIntensityMin ?? null,
        maximalIntensityMin: d.maximalIntensityMin ?? null,
    });

    if (zoneLoad > 0 && !loadAvailable) {
        loadScore = clamp(sigmoid((zoneLoad - FITNESS.zoneLoad.midpoint) / FITNESS.zoneLoad.spread) * 100, 10, 100);
        loadAvailable = true;
    } else if (zoneLoad > 0 && loadAvailable) {
        const zoneScore = clamp(sigmoid((zoneLoad - FITNESS.zoneLoad.midpoint) / FITNESS.zoneLoad.spread) * 100, 10, 100);
        loadScore = loadScore * FITNESS.zoneTrainingBlend.explicit + zoneScore * FITNESS.zoneTrainingBlend.zone;
    }

    if (!loadAvailable && (bExerciseMin ?? 0) > 0) {
        loadScore = clamp(bExerciseMin! / FITNESS.exerciseMinutesTarget * 100, 10, 100);
        loadAvailable = true;
    }

    subs[3].score = loadScore;
    subs[3].available = loadAvailable;

    if (d.standMinutes != null && d.standMinutes > 0) {
        subs[4].score = clamp(sigmoid((d.standMinutes - FITNESS.standMinutes.midpoint) / FITNESS.standMinutes.spread) * 100, 10, 100);
        subs[4].available = true;
    }

    const score = redistributeAndScore(subs);
    return { key: 'fitness', score, weight: DOMAIN_WEIGHTS.fitness, available: subs.some(s => s.available), subScores: subs };
}

// ─── 4. Nutrition Domain ──────────────────────────────────────────────────────

function scoreNutrition(d: AggregatedDay, profile: ProfileInput, prior?: NutritionPrior | null): DomainResult {
    const todayCal = d.totalCalories ?? 0;
    const hasPrior = prior?.totalCalories != null && prior.totalCalories > 0;
    const todayWeight = hasPrior
        ? clamp((todayCal - NUTRITION.intradayRampStart) / NUTRITION.intradayRampRange, 0.0, 1.0)
        : 1.0;
    const priorWeight = 1.0 - todayWeight;

    const blend = (today: number | null, priorVal: number | null): number | null => {
        if (today != null && today > 0 && priorVal != null && priorVal > 0) {
            return Math.round(today * todayWeight + priorVal * priorWeight);
        }
        return today != null && today > 0 ? today : priorVal ?? null;
    };

    const cal = blend(d.totalCalories, prior?.totalCalories ?? null);
    const prot = blend(d.totalProtein, prior?.totalProtein ?? null);
    const hydro = blend(d.hydrationMl, prior?.hydrationMl ?? null);
    const quality = blend(d.nutritionQualityScore, prior?.nutritionQualityScore ?? null);

    const w = NUTRITION.subWeights;
    const subs: SubScore[] = [
        { key: 'qualityScore', score: 0, weight: w.qualityScore, available: false },
        { key: 'proteinRatio', score: 0, weight: w.proteinRatio, available: false },
        { key: 'hydration', score: 0, weight: w.hydration, available: false },
        { key: 'calBalance', score: 0, weight: w.calBalance, available: false },
    ];

    if (quality != null) {
        subs[0].score = clamp(quality, 0, 100);
        subs[0].available = true;
    }

    if (prot != null && prot > 0 && profile.weight != null && profile.weight > 0) {
        const target = profile.weight * NUTRITION.proteinTarget;
        subs[1].score = clamp((prot / target) * 100, 0, 100);
        subs[1].available = true;
    }

    if (hydro != null && hydro > 0) {
        subs[2].score = clamp(sigmoid((hydro - NUTRITION.hydration.midpoint) / NUTRITION.hydration.spread) * 100, 10, 100);
        subs[2].available = true;
    }

    if (cal != null && cal > 0) {
        const tdeeTarget = d.aresTdee ?? NUTRITION.calBalance.defaultTdee;
        const deviation = Math.abs(cal - tdeeTarget);
        const normalizedDev = deviation / (tdeeTarget * NUTRITION.calBalance.deviationFactor);
        subs[3].score = clamp(sigmoid(-normalizedDev + 2) * 100, NUTRITION.calBalance.minScore, NUTRITION.calBalance.maxScore);
        subs[3].available = true;
    }

    const score = redistributeAndScore(subs);
    return { key: 'nutrition', score, weight: DOMAIN_WEIGHTS.nutrition, available: subs.some(s => s.available), subScores: subs };
}

// ─── 5. Body Composition Domain ───────────────────────────────────────────────

function scoreBody(d: AggregatedDay, profile: ProfileInput, weightCV?: number | null, bodyPrior?: BodyPrior | null): DomainResult {
    const effectiveWeight = d.weight ?? bodyPrior?.weight ?? null;
    const effectiveBodyFat = d.bodyFatPct ?? bodyPrior?.bodyFatPct ?? null;
    const effectiveLeanMass = d.leanMassKg ?? bodyPrior?.leanMassKg ?? null;

    const w = BODY.subWeights;
    const subs: SubScore[] = [
        { key: 'bodyFat', score: 0, weight: w.bodyFat, available: false },
        { key: 'bmi', score: 0, weight: w.bmi, available: false },
        { key: 'weightStable', score: 0, weight: w.weightStable, available: false },
        { key: 'leanMass', score: 0, weight: w.leanMass, available: false },
        { key: 'whr', score: 0, weight: w.whr, available: false },
        { key: 'waistRisk', score: 0, weight: w.waistRisk, available: false },
    ];

    if (effectiveBodyFat != null && effectiveBodyFat > 0) {
        const age = profile.age ?? 35;
        const baseCenter = profile.gender === 'female' ? BODY.bodyFat.femaleBase : BODY.bodyFat.malBase;
        const ageShift = age >= 40 ? BODY.bodyFat.ageShift40 : age >= 30 ? BODY.bodyFat.ageShift30 : 0;
        const center = baseCenter + ageShift;
        subs[0].score = sigmoid(-(effectiveBodyFat - center) / BODY.bodyFat.spread) * 100;
        subs[0].available = true;
    }

    const weight = effectiveWeight ?? profile.weight;
    const height = profile.height;
    if (weight != null && height != null && height > 0) {
        const heightM = height > 3 ? height / 100 : height;
        const bmi = weight / (heightM * heightM);
        let bmiMidpoint = BODY.bmi.defaultMidpoint;
        if (effectiveLeanMass != null && effectiveLeanMass > 0) {
            const lmi = effectiveLeanMass / (heightM * heightM);
            const optimalLMI = profile.gender === 'female' ? BODY.bmi.optimalLMI.female : BODY.bmi.optimalLMI.male;
            if (lmi > optimalLMI) {
                const excess = Math.min(lmi - optimalLMI, BODY.bmi.lmiAdjustMax);
                bmiMidpoint += excess;
            }
        }
        subs[1].score = clamp(sigmoid(-Math.abs(bmi - bmiMidpoint) / BODY.bmi.spread + 2) * 100, 10, 100);
        subs[1].available = true;
    }

    if ((effectiveWeight ?? weight) != null && (effectiveWeight ?? weight)! > 0) {
        if (weightCV != null && weightCV >= 0) {
            subs[2].score = clamp(sigmoid(-(weightCV - BODY.weightCV.midpoint) / BODY.weightCV.spread) * 100, 20, 100);
        } else {
            subs[2].score = BODY.weightCVFallback;
        }
        subs[2].available = true;
    }

    if (effectiveLeanMass != null && effectiveLeanMass > 0 && height != null && height > 0) {
        const heightM = height > 3 ? height / 100 : height;
        const lmi = effectiveLeanMass / (heightM * heightM);
        const optimalLMI = profile.gender === 'female' ? BODY.lmi.optimalFemale : BODY.lmi.optimalMale;
        subs[3].score = clamp(sigmoid((lmi - optimalLMI + BODY.lmi.offset) / BODY.lmi.spread) * 100, 10, 100);
        subs[3].available = true;
    }

    if (d.waistCm != null && d.hipCm != null && d.hipCm > 0) {
        const whr = d.waistCm / d.hipCm;
        const lowRisk = profile.gender === 'female' ? BODY.whr.femaleLow : BODY.whr.maleLow;
        const highRisk = profile.gender === 'female' ? BODY.whr.femaleHigh : BODY.whr.maleHigh;
        if (whr < lowRisk) {
            subs[4].score = clamp(90 + (lowRisk - whr) * 100, 90, 100);
        } else if (whr < highRisk) {
            const ratio = (whr - lowRisk) / (highRisk - lowRisk);
            subs[4].score = clamp(90 - ratio * 50, 40, 90);
        } else {
            subs[4].score = clamp(40 - (whr - highRisk) * 200, 10, 40);
        }
        subs[4].available = true;
    }

    if (d.waistCm != null && d.waistCm > 0) {
        const lowCut = profile.gender === 'female' ? BODY.waist.femaleLow : BODY.waist.maleLow;
        const highCut = profile.gender === 'female' ? BODY.waist.femaleHigh : BODY.waist.maleHigh;
        if (d.waistCm < lowCut) {
            subs[5].score = clamp(90 + (lowCut - d.waistCm) * 2, 90, 100);
        } else if (d.waistCm < highCut) {
            const ratio = (d.waistCm - lowCut) / (highCut - lowCut);
            subs[5].score = clamp(90 - ratio * 50, 40, 90);
        } else {
            subs[5].score = clamp(40 - (d.waistCm - highCut) * 3, 10, 40);
        }
        subs[5].available = true;
    }

    const score = redistributeAndScore(subs);
    return { key: 'body', score, weight: DOMAIN_WEIGHTS.body, available: subs.some(s => s.available), subScores: subs };
}

// ─── 6. Neuro-Cognitive Domain ────────────────────────────────────────────────

function scoreNeuro(d: AggregatedDay): DomainResult {
    const w = NEURO.subWeights;
    const subs: SubScore[] = [
        { key: 'wellbeing', score: 0, weight: w.wellbeing, available: false },
        { key: 'cognitive', score: 0, weight: w.cognitive, available: false },
        { key: 'energy', score: 0, weight: w.energy, available: false },
        { key: 'stress', score: 0, weight: w.stress, available: false },
        { key: 'motivation', score: 0, weight: w.motivation, available: false },
        { key: 'journalEngagement', score: 0, weight: w.journalEngagement, available: false },
    ];

    if (d.wellbeingScore != null) {
        subs[0].score = clamp(d.wellbeingScore, 0, 100);
        subs[0].available = true;
    }

    if (d.cognitiveScore != null) {
        subs[1].score = clamp(d.cognitiveScore, 0, 100);
        subs[1].available = true;
    }

    applyRecoverySignals(d, 'neuro', subs);

    if (d.energyLevel != null && d.energyLevel > 0) {
        subs[2].score = d.energyLevel * 10;
        subs[2].available = true;
    }

    if (d.stressLevel != null && d.stressLevel > 0) {
        subs[3].score = (10 - d.stressLevel) * 10;
        subs[3].available = true;
    }

    const motivationVals: number[] = [];
    if (d.morningMotivation != null && d.morningMotivation > 0) motivationVals.push(d.morningMotivation);
    if (d.morningLibido != null && d.morningLibido > 0) motivationVals.push(d.morningLibido);
    if (d.libidoLevel != null && d.libidoLevel > 0) motivationVals.push(d.libidoLevel);
    if (motivationVals.length > 0) {
        subs[4].score = avg(motivationVals) * 10;
        subs[4].available = true;
    }

    if (d.journalCount != null && d.journalCount > 0) {
        const moodScore = d.journalMood != null
            ? NEURO.journal.baseScore + d.journalMood * NEURO.journal.moodScale
            : NEURO.journal.noMoodDefault;
        const ritualBonus = d.journalCount >= NEURO.journal.ritualThreshold ? NEURO.journal.ritualBonus : 1.0;
        subs[5].score = clamp(moodScore * ritualBonus, NEURO.journal.minScore, 100);
        subs[5].available = true;
    }

    const score = redistributeAndScore(subs);
    const hasAnySignal = subs.some(s => s.available);
    if (!hasAnySignal) {
        return { key: 'neuro', score: NEURO.neutralFallback, weight: DOMAIN_WEIGHTS.neuro, available: false, subScores: subs };
    }

    const hasVeto = (
        (d.energyLevel != null && d.energyLevel <= NEURO.veto.threshold) ||
        (motivationVals.length > 0 && avg(motivationVals) <= NEURO.veto.threshold)
    );
    const finalScore = hasVeto ? Math.min(score, NEURO.veto.capScore) : score;

    return { key: 'neuro', score: finalScore, weight: DOMAIN_WEIGHTS.neuro, available: true, subScores: subs };
}

// ─── 7. Biomarker Domain ──────────────────────────────────────────────────────

function scoreBiomarker(bloodwork: AggregatedBloodwork | null, profile: ProfileInput): DomainResult {
    const w = BIOMARKER.subWeights;
    const subs: SubScore[] = [
        { key: 'albumin', score: 0, weight: w.albumin, available: false },
        { key: 'creatinine', score: 0, weight: w.creatinine, available: false },
        { key: 'hsCrp', score: 0, weight: w.hsCrp, available: false },
        { key: 'glucose', score: 0, weight: w.glucose, available: false },
        { key: 'wbc', score: 0, weight: w.wbc, available: false },
        { key: 'hba1c', score: 0, weight: w.hba1c, available: false },
        { key: 'lipids', score: 0, weight: w.lipids, available: false },
        { key: 'vitamins', score: 0, weight: w.vitamins, available: false },
    ];

    if (!bloodwork) {
        return { key: 'biomarker', score: 50, weight: DOMAIN_WEIGHTS.biomarker, available: false, subScores: subs };
    }

    // 1. Albumin
    if (bloodwork.albumin != null) {
        const [lo, hi] = BIOMARKER.albumin.excellent;
        subs[0].score = bloodwork.albumin >= lo && bloodwork.albumin <= hi ? 90
            : bloodwork.albumin >= BIOMARKER.albumin.good[0] ? 60 : 30;
        subs[0].available = true;
    }

    // 2. Creatinine
    if (bloodwork.creatinine != null) {
        const [lo, hi] = BIOMARKER.creatinine.excellent;
        subs[1].score = bloodwork.creatinine >= lo && bloodwork.creatinine <= hi ? 90
            : bloodwork.creatinine >= BIOMARKER.creatinine.good[0] && bloodwork.creatinine <= BIOMARKER.creatinine.good[1] ? 60 : 30;
        subs[1].available = true;
    }

    // 3. hs-CRP
    if (bloodwork.hsCrp != null) {
        const t = BIOMARKER.hsCrp.thresholds;
        const s = BIOMARKER.hsCrp.scores;
        subs[2].score = bloodwork.hsCrp < t[0] ? s[0]
            : bloodwork.hsCrp < t[1] ? s[1]
            : bloodwork.hsCrp < t[2] ? s[2]
            : bloodwork.hsCrp < t[3] ? s[3] : s[4];
        subs[2].available = true;
    }

    // 4. Glucose
    if (bloodwork.fastingGlucose != null) {
        const [lo, hi] = BIOMARKER.glucose.excellent;
        subs[3].score = bloodwork.fastingGlucose >= lo && bloodwork.fastingGlucose <= hi ? 90
            : bloodwork.fastingGlucose >= BIOMARKER.glucose.good[0] && bloodwork.fastingGlucose <= BIOMARKER.glucose.good[1] ? 60 : 25;
        subs[3].available = true;
    }

    // 5. WBC
    if (bloodwork.wbc != null) {
        const [lo, hi] = BIOMARKER.wbc.excellent;
        subs[4].score = bloodwork.wbc >= lo && bloodwork.wbc <= hi ? 90
            : bloodwork.wbc >= BIOMARKER.wbc.good[0] && bloodwork.wbc <= BIOMARKER.wbc.good[1] ? 65 : 30;
        subs[4].available = true;
    }

    // 6. HbA1c
    if (bloodwork.hba1c != null) {
        const t = BIOMARKER.hba1c.thresholds;
        const s = BIOMARKER.hba1c.scores;
        subs[5].score = bloodwork.hba1c < t[0] ? s[0]
            : bloodwork.hba1c < t[1] ? s[1]
            : bloodwork.hba1c < t[2] ? s[2]
            : bloodwork.hba1c < t[3] ? s[3] : s[4];
        subs[5].available = true;
    }

    // 7. Lipids
    const hasLipids = bloodwork.hdl != null || bloodwork.ldl != null || bloodwork.triglycerides != null;
    if (hasLipids) {
        const lipidScores: number[] = [];
        if (bloodwork.hdl != null) {
            const t = BIOMARKER.lipids.hdl.thresholds;
            const s = BIOMARKER.lipids.hdl.scores;
            lipidScores.push(bloodwork.hdl >= t[0] ? s[0] : bloodwork.hdl >= t[1] ? s[1] : s[2]);
        }
        if (bloodwork.ldl != null) {
            const t = BIOMARKER.lipids.ldl.thresholds;
            const s = BIOMARKER.lipids.ldl.scores;
            lipidScores.push(bloodwork.ldl < t[0] ? s[0] : bloodwork.ldl < t[1] ? s[1] : bloodwork.ldl < t[2] ? s[2] : s[3]);
        }
        if (bloodwork.triglycerides != null) {
            const t = BIOMARKER.lipids.triglycerides.thresholds;
            const s = BIOMARKER.lipids.triglycerides.scores;
            lipidScores.push(bloodwork.triglycerides < t[0] ? s[0] : bloodwork.triglycerides < t[1] ? s[1] : bloodwork.triglycerides < t[2] ? s[2] : s[3]);
        }
        subs[6].score = avg(lipidScores);
        subs[6].available = true;
    }

    // 8. Vitamins/Hormones
    const hasVitamins = bloodwork.vitaminD != null || bloodwork.ferritin != null
        || bloodwork.testosterone != null || bloodwork.tsh != null;
    if (hasVitamins) {
        const vitScores: number[] = [];
        if (bloodwork.vitaminD != null) {
            const [lo, hi] = BIOMARKER.vitamins.vitaminD.excellent;
            vitScores.push(bloodwork.vitaminD >= lo && bloodwork.vitaminD <= hi ? 90
                : bloodwork.vitaminD >= BIOMARKER.vitamins.vitaminD.good[0] ? 70
                : bloodwork.vitaminD >= BIOMARKER.vitamins.vitaminD.fair[0] ? 45 : 20);
        }
        if (bloodwork.ferritin != null) {
            const [lo, hi] = BIOMARKER.vitamins.ferritin.excellent;
            vitScores.push(bloodwork.ferritin >= lo && bloodwork.ferritin <= hi ? 80
                : bloodwork.ferritin >= BIOMARKER.vitamins.ferritin.good[0] ? 50 : 25);
        }
        if (bloodwork.tsh != null) {
            const [lo, hi] = BIOMARKER.vitamins.tsh.excellent;
            vitScores.push(bloodwork.tsh >= lo && bloodwork.tsh <= hi ? 85
                : bloodwork.tsh >= BIOMARKER.vitamins.tsh.good[0] && bloodwork.tsh <= BIOMARKER.vitamins.tsh.good[1] ? 50 : 20);
        }
        if (bloodwork.testosterone != null) {
            const ref = profile.gender === 'female' ? BIOMARKER.vitamins.testosterone.female : BIOMARKER.vitamins.testosterone.male;
            const [lo, hi] = ref.excellent;
            vitScores.push(bloodwork.testosterone >= lo && bloodwork.testosterone <= hi ? 90
                : bloodwork.testosterone >= ref.good[0] && bloodwork.testosterone <= ref.good[1] ? 70 : 40);
        }
        if (vitScores.length > 0) {
            subs[7].score = avg(vitScores);
            subs[7].available = true;
        }
    }

    const score = redistributeAndScore(subs);
    return { key: 'biomarker', score, weight: DOMAIN_WEIGHTS.biomarker, available: subs.some(s => s.available), subScores: subs };
}

// ─── Core: computeDayScore ────────────────────────────────────────────────────

export function computeDayScore(
    day: AggregatedDay,
    profile: ProfileInput,
    bloodwork?: AggregatedBloodwork | null,
    hrvBaseline?: number | null,
    exogenousDelta?: number | null,
    previousBioX?: number | null,
    dunedinPaceAnchor?: number | null,
    nutritionPrior?: NutritionPrior | null,
    sleepTargetHours?: number | null,
    domainModifiers?: DomainModifiers | null,
    weightCV?: number | null,
    fitnessPrior?: FitnessPrior | null,
    bodyPrior?: BodyPrior | null,
    scoreEma7d?: number | null,
): DayResult {
    const domains: DomainResult[] = [
        scoreSleep(day, profile, sleepTargetHours ?? 8.0),
        scoreCardiac(day, hrvBaseline),
        scoreFitness(day, profile, fitnessPrior),
        scoreNutrition(day, profile, nutritionPrior),
        scoreBody(day, profile, weightCV, bodyPrior),
        scoreNeuro(day),
        scoreBiomarker(bloodwork ?? null, profile),
    ];

    // Domain modifiers (exogenous substances)
    if (domainModifiers != null) {
        for (const domain of domains) {
            const mod = domainModifiers[domain.key as keyof DomainModifiers];
            if (mod != null && mod !== 0 && domain.available) {
                domain.score = clamp(domain.score + mod, 0, 100);
            }
        }
    }

    // Dynamic biomarker boost
    const biomarkerDomain = domains.find(d => d.key === 'biomarker');
    if (biomarkerDomain && biomarkerDomain.available) {
        biomarkerDomain.weight = DOMAIN_WEIGHTS.biomarkerBoosted;
    }

    let totalScore = redistributeAndScore(domains);

    // State/Trait split for Pace
    const paceDomains = domains.filter(d => {
        const cls = DOMAIN_CLASSIFICATION[d.key];
        return cls === 'state' || cls === 'hybrid';
    });
    let paceScore = paceDomains.length > 0 ? redistributeAndScore(paceDomains) : totalScore;

    // Trait scores for Macro-Shocks
    const traitScores: Record<string, number> = {};
    for (const d of domains) {
        const cls = DOMAIN_CLASSIFICATION[d.key];
        if ((cls === 'trait' || cls === 'hybrid') && d.available) {
            traitScores[d.key] = Math.round(d.score * 10) / 10;
        }
    }

    // Exogenous modifier
    if (exogenousDelta != null && exogenousDelta !== 0) {
        const exoPct = (exogenousDelta * EXOGENOUS.dampening) / 100;
        totalScore = clamp(totalScore * (1 + exoPct), 0, 100);
        paceScore = clamp(paceScore * (1 + exoPct), 0, 100);
    }

    // Signal count & confidence
    const signalCount = domains.reduce((sum, d) => sum + d.subScores.filter(s => s.available).length, 0);
    const confidence = clamp(signalCount / MAX_SIGNALS, 0, 1);

    // Chronological age
    let chronoAge = profile.age;
    if (profile.birthDate) {
        const birth = new Date(profile.birthDate);
        const ref = new Date(day.date + 'T12:00:00');
        const diffMs = ref.getTime() - birth.getTime();
        chronoAge = diffMs / (365.25 * 24 * 60 * 60 * 1000);
    }

    // Aging Pace
    const paceNorm = (paceScore - 50) / 50;
    const paceSign = paceNorm >= 0 ? 1 : -1;
    const paceDelta = paceSign * Math.pow(Math.abs(paceNorm), ACCUMULATOR.progressiveExponent) * ACCUMULATOR.paceMultiplier;
    let agingPace = Math.round(clamp(1.0 - paceDelta, ACCUMULATOR.paceMin, ACCUMULATOR.paceMax) * 1000) / 1000;

    // DunedinPACE anchor
    if (dunedinPaceAnchor != null && dunedinPaceAnchor > 0) {
        const dailyDeviation = agingPace - 1.0;
        agingPace = Math.round(clamp(
            dunedinPaceAnchor + dailyDeviation * ACCUMULATOR.dunedinDampening,
            ACCUMULATOR.paceMin, ACCUMULATOR.paceMax
        ) * 1000) / 1000;
    }

    // Snapshot-Anchor Bio.X
    const anchorScore = scoreEma7d ?? totalScore;
    const snapshotBioX = Math.round((chronoAge - progressiveBioDelta(anchorScore)) * 10) / 10;

    const isAccumulatorUnlocked = previousBioX != null;
    const modeThreshold = isAccumulatorUnlocked ? ACCUMULATOR.hysteresisThreshold : ACCUMULATOR.calibrationThreshold;

    let bioX: number;
    if (previousBioX != null && confidence >= modeThreshold) {
        const dailyDelta = (agingPace - 1.0) / 365.25;
        const paceResult = previousBioX + dailyDelta;
        const gap = snapshotBioX - paceResult;
        const isImproving = gap < 0;
        const alpha = confidence * (isImproving ? ACCUMULATOR.anchorAlphaImprove : ACCUMULATOR.anchorAlphaDegrade);
        const pull = clamp(gap * alpha, -ACCUMULATOR.anchorMaxDailyPull, ACCUMULATOR.anchorMaxDailyPull);
        bioX = Math.round((paceResult + pull) * 10000) / 10000;
    } else if (previousBioX != null && confidence < modeThreshold) {
        bioX = previousBioX;
    } else {
        const blendFactor = clamp(confidence / ACCUMULATOR.calibrationThreshold, 0, 1);
        bioX = Math.round((chronoAge * (1 - blendFactor) + snapshotBioX * blendFactor) * 10) / 10;
    }

    const bioXMargin = Math.round(clamp(0.5 + (1 - confidence) * 2.5, 0.5, 3.0) * 10) / 10;

    // Contributions
    const contributions: Contribution[] = [];
    for (const domain of domains) {
        if (!domain.available) continue;
        for (const sub of domain.subScores) {
            if (!sub.available) continue;
            contributions.push({
                domain: domain.key,
                signal: sub.key,
                value: Math.round(sub.score),
                direction: sub.score >= 70 ? 'positive' : sub.score >= 40 ? 'neutral' : 'negative',
            });
        }
    }
    contributions.sort((a, b) => a.value - b.value);

    return {
        date: day.date,
        totalScore: Math.round(totalScore * 10) / 10,
        paceScore: Math.round(paceScore * 10) / 10,
        bioX,
        bioXMargin,
        agingPace,
        confidence: Math.round(confidence * 1000) / 1000,
        signalCount,
        domains,
        contributions,
        traitScores,
    };
}
