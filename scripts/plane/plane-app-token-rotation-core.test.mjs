import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_REFRESH_WINDOW_MS,
  evaluateTokenState,
  parseDurationMs,
  sanitizeOauthResult,
} from "./plane-app-token-rotation-core.mjs";

const NOW = new Date("2026-05-09T12:00:00.000Z");

test("parseDurationMs accepts scheduler-friendly units", () => {
  assert.equal(parseDurationMs("30m"), 30 * 60 * 1000);
  assert.equal(parseDurationMs("2h"), DEFAULT_REFRESH_WINDOW_MS);
  assert.equal(parseDurationMs("1d"), 24 * 60 * 60 * 1000);
  assert.equal(parseDurationMs("5000"), 5000);
});

test("parseDurationMs falls back on invalid values", () => {
  assert.equal(parseDurationMs("soon", 1234), 1234);
  assert.equal(parseDurationMs("-1h", 1234), 1234);
});

test("evaluateTokenState refreshes when token is missing", () => {
  const result = evaluateTokenState({ token: "", expiresAt: "2026-05-09T20:00:00.000Z", now: NOW });
  assert.equal(result.status, "missing-token");
  assert.equal(result.shouldRefresh, true);
  assert.equal(result.hasToken, false);
});

test("evaluateTokenState refreshes when expiry is missing", () => {
  const result = evaluateTokenState({ token: "secret", expiresAt: "", now: NOW });
  assert.equal(result.status, "missing-expiry");
  assert.equal(result.shouldRefresh, true);
  assert.equal(result.hasToken, true);
});

test("evaluateTokenState refreshes expired token", () => {
  const result = evaluateTokenState({ token: "secret", expiresAt: "2026-05-09T11:59:59.000Z", now: NOW });
  assert.equal(result.status, "expired");
  assert.equal(result.ok, false);
  assert.equal(result.shouldRefresh, true);
});

test("evaluateTokenState refreshes inside refresh window", () => {
  const result = evaluateTokenState({
    token: "secret",
    expiresAt: "2026-05-09T13:00:00.000Z",
    now: NOW,
    refreshWindowMs: 2 * 60 * 60 * 1000,
  });
  assert.equal(result.status, "expiring-soon");
  assert.equal(result.ok, true);
  assert.equal(result.shouldRefresh, true);
  assert.equal(result.ttlSeconds, 3600);
});

test("evaluateTokenState keeps valid token outside refresh window", () => {
  const result = evaluateTokenState({
    token: "secret",
    expiresAt: "2026-05-09T16:00:00.000Z",
    now: NOW,
    refreshWindowMs: 2 * 60 * 60 * 1000,
  });
  assert.equal(result.status, "valid");
  assert.equal(result.ok, true);
  assert.equal(result.shouldRefresh, false);
  assert.equal(result.ttlSeconds, 14400);
});

test("sanitizeOauthResult never returns raw access token or error body", () => {
  const result = sanitizeOauthResult({
    ok: true,
    status: 200,
    mode: "bot-token",
    savedToKeychain: true,
    expiresAt: "2026-05-09T20:00:00.000Z",
    token: {
      token_type: "Bearer",
      access_token: "redacted-test-value",
      expires_in: 36000,
      scope: "profile:read",
      has_access_token: true,
    },
    error: { raw: "secret-ish" },
  });

  assert.equal(result.token.has_access_token, true);
  assert.equal("access_token" in result.token, false);
  assert.equal(result.error, "[redacted]");
});
