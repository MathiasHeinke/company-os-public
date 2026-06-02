// Confidence calibration — pure core (no I/O).
//
// Adds the WORKER-side confidence signal to the worker->controller reporting
// contract and makes it calibratable. Distinct from the controller-side
// CEOConfidence / FounderPredictionConfidence (docs/templates/worker-issue-contract.md,
// scripts/orchestration/codex-controller-dryrun.mjs): WorkerConfidence is the
// worker's self-assessed probability that its reported result is correct AND
// ready for its claimed stage/disposition. It INFORMS the controller; it never
// overrides a hard gate (access-control / secrets / prod / Done / CAO REJECT
// stay gated regardless of confidence).
//
// The calibration loop lets CEO/Codex react to a worker whose claimed confidence
// is repeatedly higher than the actual outcome (over-confidence) — the
// Earned-Authority / Trust-Ledger principle made measurable.
//
// See docs/orchestration/confidence-reporting-contract.md.

export const CONFIDENCE_CONTRACT_VERSION = "confidence-reporting-contract/v0";

// Reuse the existing HumanGate confidence thresholds (codex-controller-runtime.md
// / worker-issue-contract.md). WorkerConfidence below the level's threshold means
// the worker may NOT claim auto-eligibility at that level; the controller reviews more.
export const HG_CONFIDENCE_THRESHOLDS = Object.freeze({
  "HG-1": 0.8,
  "HG-2": 0.85,
  "HG-2.5": 0.92,
  "HG-3": 0.96,
});

// Outcome scoring for calibration. PARK is unresolved/partial readiness evidence,
// NOT half-PASS authority — it scores 0.5 only for the claimed-vs-outcome gap math.
export const OUTCOME_SCORE = Object.freeze({ PASS: 1, PARK: 0.5, REJECT: 0 });

// Parse a confidence value to a number in [0,1]; return null if absent/invalid/out-of-range.
export function parseConfidence(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 1) return null;
  return n;
}

// Validate a worker.reported WorkerConfidence pair. A naked number is not enough:
// a one-line basis is required so the score is justified, not asserted.
// Returns { ok, reason, confidence }.
export function validateWorkerConfidence({ confidence, basis } = {}) {
  const parsed = parseConfidence(confidence);
  if (parsed === null) {
    const present = confidence !== null && confidence !== undefined && confidence !== "";
    return {
      ok: false,
      reason: present ? "confidence.out-of-range" : "confidence.missing",
      confidence: null,
    };
  }
  if (!basis || String(basis).trim().length === 0) {
    return { ok: false, reason: "confidence.basis-missing", confidence: parsed };
  }
  return { ok: true, reason: "confidence.ok", confidence: parsed };
}

// Does a WorkerConfidence meet the threshold for a HumanGate level?
// Unknown level or unparseable confidence => false (conservative).
export function confidenceMeetsGate(confidence, hgLevel) {
  const parsed = parseConfidence(confidence);
  if (parsed === null) return false;
  const threshold = HG_CONFIDENCE_THRESHOLDS[hgLevel];
  if (typeof threshold !== "number") return false;
  return parsed >= threshold;
}

// Compute calibration from a history of {claimed, outcome} records (optionally per seat).
// records: [{ seat?, claimed: 0..1, outcome: "PASS"|"PARK"|"REJECT" }]
// gap = meanClaimed - meanOutcome (positive => over-confident).
// brier = mean((claimed - outcomeScore)^2).
export function calibrationFromHistory(records = [], { minRuns = 5, gapBand = 0.15 } = {}) {
  const valid = (Array.isArray(records) ? records : []).filter((r) => {
    const c = parseConfidence(r && r.claimed);
    return c !== null && r && Object.prototype.hasOwnProperty.call(OUTCOME_SCORE, r.outcome);
  });
  const n = valid.length;
  if (n < minRuns) {
    return { n, meanClaimed: null, meanOutcome: null, gap: null, brier: null, verdict: "insufficient-data" };
  }
  let sumClaimed = 0;
  let sumOutcome = 0;
  let sumSq = 0;
  for (const r of valid) {
    const c = parseConfidence(r.claimed);
    const o = OUTCOME_SCORE[r.outcome];
    sumClaimed += c;
    sumOutcome += o;
    sumSq += (c - o) * (c - o);
  }
  const meanClaimed = sumClaimed / n;
  const meanOutcome = sumOutcome / n;
  const gap = meanClaimed - meanOutcome;
  const brier = sumSq / n;
  let verdict = "well-calibrated";
  if (gap > gapBand) verdict = "over-confident";
  else if (gap < -gapBand) verdict = "under-confident";
  return {
    n,
    meanClaimed: round3(meanClaimed),
    meanOutcome: round3(meanOutcome),
    gap: round3(gap),
    brier: round3(brier),
    verdict,
  };
}

// Recommend an autonomy adjustment from a calibration result. The core only flags;
// any actual autonomy change still requires controller/CEO/founder action.
export function recommendAutonomyAdjustment(calibration = {}) {
  switch (calibration.verdict) {
    case "over-confident":
      return {
        action: "raise-bar",
        rationale:
          "claimed confidence repeatedly exceeds outcome; raise the confidence bar / require more controller review before auto-eligibility",
      };
    case "under-confident":
      return {
        action: "widen-eligible",
        rationale:
          "claimed confidence repeatedly below outcome; worker is sandbagging — autonomy may widen after controller/CEO review",
      };
    case "well-calibrated":
      return { action: "hold", rationale: "claimed confidence tracks outcome; maintain current bar" };
    default:
      return { action: "hold", rationale: "insufficient runs to judge calibration; keep current bar" };
  }
}

function round3(x) {
  return Math.round(x * 1000) / 1000;
}
