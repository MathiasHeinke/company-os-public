import test from "node:test";
import assert from "node:assert/strict";

import {
  HEALTH,
  evaluateRuntimeHealth,
  shouldSelfAlert,
  isSafeForUnattendedTick,
} from "./self-observability-core.mjs";

const NOW = 1_000_000_000_000;
const MIN = 60 * 1000;

test("healthy when scheduler beats recently and no overdue crons/workers", () => {
  const h = evaluateRuntimeHealth({
    now: NOW,
    lastSchedulerHeartbeat: NOW - 2 * MIN,
    crons: [{ id: "morning", lastFire: NOW - 5 * MIN, expectedIntervalMs: 24 * 60 * MIN }],
    workers: [{ id: "w1", running: true, lastHeartbeat: NOW - 1 * MIN }],
  });
  assert.equal(h.status, HEALTH.HEALTHY);
  assert.equal(shouldSelfAlert(h), false);
});

test("kill switch halts everything immediately", () => {
  const h = evaluateRuntimeHealth({ now: NOW, killSwitchPresent: true });
  assert.equal(h.status, HEALTH.HALTED);
  assert.ok(h.alerts.includes("self-obs.halted-by-kill-switch"));
  assert.equal(shouldSelfAlert(h), true);
});

test("scheduler stale -> degraded, very stale -> down", () => {
  const stale = evaluateRuntimeHealth({ now: NOW, lastSchedulerHeartbeat: NOW - 15 * MIN });
  assert.equal(stale.status, HEALTH.DEGRADED);
  const down = evaluateRuntimeHealth({ now: NOW, lastSchedulerHeartbeat: NOW - 45 * MIN });
  assert.equal(down.status, HEALTH.DOWN);
  assert.ok(down.alerts.includes("self-obs.scheduler-down"));
});

test("never-beat scheduler (null) is down", () => {
  const h = evaluateRuntimeHealth({ now: NOW, lastSchedulerHeartbeat: null });
  assert.equal(h.status, HEALTH.DOWN);
});

test("invalid explicit clock fails closed", () => {
  const h = evaluateRuntimeHealth({ now: "not-a-date", lastSchedulerHeartbeat: NOW - 1 * MIN });
  assert.equal(h.status, HEALTH.DOWN);
  assert.ok(h.reasons.includes("self-obs.invalid-clock"));
  assert.equal(isSafeForUnattendedTick({ now: "not-a-date", lastSchedulerHeartbeat: NOW - 1 * MIN }).safe, false);
});

test("overdue cron escalates", () => {
  const h = evaluateRuntimeHealth({
    now: NOW,
    lastSchedulerHeartbeat: NOW - 1 * MIN,
    crons: [{ id: "hourly", lastFire: NOW - 150 * MIN, expectedIntervalMs: 60 * MIN }],
  });
  assert.equal(h.status, HEALTH.DEGRADED);
  assert.ok(h.alerts.some((a) => a.includes("cron-overdue:hourly")));
});

test("silent running worker -> degraded", () => {
  const h = evaluateRuntimeHealth({
    now: NOW,
    lastSchedulerHeartbeat: NOW - 1 * MIN,
    workers: [{ id: "w9", running: true, lastHeartbeat: NOW - 25 * MIN }],
  });
  assert.equal(h.status, HEALTH.DEGRADED);
  assert.ok(h.alerts.some((a) => a.includes("worker-silent:w9")));
});

test("isSafeForUnattendedTick requires healthy + recent scheduler beat", () => {
  assert.equal(isSafeForUnattendedTick({ now: NOW, lastSchedulerHeartbeat: NOW - 2 * MIN }).safe, true);
  assert.equal(isSafeForUnattendedTick({ now: NOW, lastSchedulerHeartbeat: NOW - 45 * MIN }).safe, false);
  assert.equal(isSafeForUnattendedTick({ now: NOW, killSwitchPresent: true }).safe, false);
});
