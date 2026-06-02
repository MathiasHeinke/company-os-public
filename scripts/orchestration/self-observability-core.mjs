// Self-Observability Watchdog — pure core (no I/O).
//
// "Who watches EVE?" Before any 24/7 scheduler activation (Stage 9), the runtime
// must prove it can detect its own failure: a dead scheduler, an overdue cron, a
// silent worker. This core evaluates health signals and decides whether to
// self-alert. Pure functions; the runner gathers signals and emits alerts.
//
// See docs/operations/autonomous-ops-loop.md and the Continuity Trinity (T8).

export const SELF_OBSERVABILITY_VERSION = "self-observability/v0";

export const HEALTH = Object.freeze({
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  DOWN: "down",
  HALTED: "halted",
});

// Default thresholds (ms). Callers may override per lane.
export const DEFAULT_THRESHOLDS = Object.freeze({
  schedulerHeartbeatStaleMs: 10 * 60 * 1000, // scheduler should beat at least every 10 min
  schedulerHeartbeatDownMs: 30 * 60 * 1000, // > 30 min with no beat = down
  cronOverdueFactor: 2, // cron is degraded at 2x its expected interval
  cronDownFactor: 4, // and down at 4x
  workerHeartbeatStaleMs: 20 * 60 * 1000, // a running worker silent > 20 min = degraded
});

function ageMs(now, ts) {
  if (ts === null || ts === undefined) return Infinity;
  if (!Number.isFinite(now)) return Infinity;
  const t = typeof ts === "number" ? ts : Date.parse(ts);
  if (!Number.isFinite(t)) return Infinity;
  return Math.max(0, now - t);
}

function parseNow(value) {
  if (value === undefined || value === null || value === "") return Date.now();
  const parsed = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

// Evaluate overall runtime health from signals.
// signals: {
//   now (ms), killSwitchPresent (bool),
//   lastSchedulerHeartbeat (ms|iso|null),
//   crons: [{ id, lastFire (ms|iso|null), expectedIntervalMs }],
//   workers: [{ id, running (bool), lastHeartbeat (ms|iso|null) }],
// }
export function evaluateRuntimeHealth(signals = {}, thresholds = {}) {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const now = parseNow(signals.now);
  const reasons = [];
  const alerts = [];

  if (!Number.isFinite(now)) {
    return {
      status: HEALTH.DOWN,
      reasons: ["self-obs.invalid-clock"],
      alerts: ["self-obs.invalid-clock"],
    };
  }

  if (signals.killSwitchPresent) {
    return {
      status: HEALTH.HALTED,
      reasons: ["self-obs.kill-switch-present"],
      alerts: ["self-obs.halted-by-kill-switch"],
    };
  }

  let worst = HEALTH.HEALTHY;
  const escalate = (level) => {
    const rank = { healthy: 0, degraded: 1, down: 2, halted: 3 };
    if (rank[level] > rank[worst]) worst = level;
  };

  // Scheduler heartbeat
  const schedAge = ageMs(now, signals.lastSchedulerHeartbeat);
  if (schedAge >= t.schedulerHeartbeatDownMs) {
    reasons.push("self-obs.scheduler-heartbeat-down");
    alerts.push("self-obs.scheduler-down");
    escalate(HEALTH.DOWN);
  } else if (schedAge >= t.schedulerHeartbeatStaleMs) {
    reasons.push("self-obs.scheduler-heartbeat-stale");
    alerts.push("self-obs.scheduler-stale");
    escalate(HEALTH.DEGRADED);
  }

  // Crons
  for (const c of signals.crons || []) {
    const age = ageMs(now, c.lastFire);
    const expected = Number(c.expectedIntervalMs) || 0;
    if (expected > 0) {
      if (age >= expected * t.cronDownFactor) {
        reasons.push(`self-obs.cron-down:${c.id}`);
        alerts.push(`self-obs.cron-down:${c.id}`);
        escalate(HEALTH.DOWN);
      } else if (age >= expected * t.cronOverdueFactor) {
        reasons.push(`self-obs.cron-overdue:${c.id}`);
        alerts.push(`self-obs.cron-overdue:${c.id}`);
        escalate(HEALTH.DEGRADED);
      }
    }
  }

  // Workers marked running but silent
  for (const w of signals.workers || []) {
    if (!w.running) continue;
    const age = ageMs(now, w.lastHeartbeat);
    if (age >= t.workerHeartbeatStaleMs) {
      reasons.push(`self-obs.worker-silent:${w.id}`);
      alerts.push(`self-obs.worker-silent:${w.id}`);
      escalate(HEALTH.DEGRADED);
    }
  }

  return { status: worst, reasons, alerts };
}

// Should the watchdog raise a self-alert? Anything worse than healthy.
export function shouldSelfAlert(health = {}) {
  return health.status !== undefined && health.status !== HEALTH.HEALTHY;
}

// Is the runtime safe to run an unattended 24/7 scheduler tick right now?
// Requires healthy status and a present, recent scheduler heartbeat.
export function isSafeForUnattendedTick(signals = {}, thresholds = {}) {
  const health = evaluateRuntimeHealth(signals, thresholds);
  if (health.status !== HEALTH.HEALTHY) {
    return { safe: false, reason: `self-obs.not-healthy:${health.status}`, health };
  }
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const now = parseNow(signals.now);
  if (ageMs(now, signals.lastSchedulerHeartbeat) >= t.schedulerHeartbeatStaleMs) {
    return { safe: false, reason: "self-obs.no-recent-scheduler-heartbeat", health };
  }
  return { safe: true, reason: "self-obs.safe-for-unattended-tick", health };
}
