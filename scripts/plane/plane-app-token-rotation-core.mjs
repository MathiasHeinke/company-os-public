export const TOKEN_ROTATION_VERSION = "plane-app-token-rotation/v0";
export const DEFAULT_REFRESH_WINDOW_MS = 2 * 60 * 60 * 1000;

export function parseDurationMs(value, fallbackMs = DEFAULT_REFRESH_WINDOW_MS) {
  const raw = String(value || "").trim();
  if (!raw) return fallbackMs;
  const match = raw.match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d)?$/i);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount < 0) return fallbackMs;
  const unit = (match[2] || "ms").toLowerCase();
  const multiplier = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }[unit] || 1;
  return Math.round(amount * multiplier);
}

export function evaluateTokenState({
  token = "",
  expiresAt = "",
  now = new Date(),
  refreshWindowMs = DEFAULT_REFRESH_WINDOW_MS,
} = {}) {
  const hasToken = Boolean(String(token || "").trim());
  const expiresAtMs = Date.parse(String(expiresAt || ""));
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));
  const validNow = Number.isFinite(nowMs) ? nowMs : Date.now();
  const ttlMs = Number.isFinite(expiresAtMs) ? expiresAtMs - validNow : null;
  const ttlSeconds = ttlMs === null ? null : Math.floor(ttlMs / 1000);

  if (!hasToken) {
    return {
      status: "missing-token",
      ok: false,
      shouldRefresh: true,
      reason: "PLANE_APP_BOT_TOKEN is missing",
      hasToken: false,
      expiresAt: expiresAt || null,
      ttlSeconds,
    };
  }

  if (!Number.isFinite(expiresAtMs)) {
    return {
      status: "missing-expiry",
      ok: false,
      shouldRefresh: true,
      reason: "PLANE_APP_BOT_TOKEN_EXPIRES_AT is missing or invalid",
      hasToken: true,
      expiresAt: expiresAt || null,
      ttlSeconds,
    };
  }

  if (ttlMs <= 0) {
    return {
      status: "expired",
      ok: false,
      shouldRefresh: true,
      reason: "Plane App bot token is expired",
      hasToken: true,
      expiresAt,
      ttlSeconds,
    };
  }

  if (ttlMs <= refreshWindowMs) {
    return {
      status: "expiring-soon",
      ok: true,
      shouldRefresh: true,
      reason: "Plane App bot token is inside refresh window",
      hasToken: true,
      expiresAt,
      ttlSeconds,
    };
  }

  return {
    status: "valid",
    ok: true,
    shouldRefresh: false,
    reason: "Plane App bot token has enough TTL",
    hasToken: true,
    expiresAt,
    ttlSeconds,
  };
}

export function sanitizeOauthResult(result) {
  if (!result || typeof result !== "object") return null;
  return {
    ok: Boolean(result.ok),
    status: result.status || null,
    mode: result.mode || null,
    savedToKeychain: Boolean(result.savedToKeychain),
    expiresAt: result.expiresAt || null,
    token: result.token ? {
      token_type: result.token.token_type || null,
      expires_in: result.token.expires_in || null,
      scope: result.token.scope || null,
      has_access_token: Boolean(result.token.has_access_token),
    } : null,
    errors: Array.isArray(result.errors) ? result.errors : [],
    error: result.error ? "[redacted]" : null,
  };
}
