import { execFileSync } from "node:child_process";

export const DEFAULT_BASE_URL = "https://api.plane.so";
export const PLANE_API_KEY_SERVICE = "Company.OS Plane";
export const PLANE_API_KEY_ACCOUNT = "PLANE_API_KEY";
export const PLANE_APP_SERVICE = "Company.OS Plane App";
export const PLANE_APP_BOT_TOKEN_ACCOUNT = "PLANE_APP_BOT_TOKEN";
export const PLANE_APP_BOT_TOKEN_EXPIRES_AT_ACCOUNT = "PLANE_APP_BOT_TOKEN_EXPIRES_AT";

function firstPresentEnv(...names) {
  for (const name of names) {
    if (name && String(process.env[name] || "").trim()) return String(process.env[name]).trim();
  }
  return "";
}

export function readKeychainSecret(service, account) {
  try {
    return execFileSync("security", [
      "find-generic-password",
      "-s",
      service,
      "-a",
      account,
      "-w",
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

export function resolvePlaneAuth(authMode = process.env.PLANE_AUTH_MODE || "app-token") {
  if (authMode === "app-token") {
    const token = firstPresentEnv("PLANE_APP_BOT_TOKEN", "PLANE_API_TOKEN")
      || readKeychainSecret(PLANE_APP_SERVICE, PLANE_APP_BOT_TOKEN_ACCOUNT);
    const expiresAt = firstPresentEnv(
      "PLANE_APP_BOT_TOKEN_EXPIRES_AT",
      "PLANE_API_TOKEN_EXPIRES_AT",
    )
      || readKeychainSecret(PLANE_APP_SERVICE, PLANE_APP_BOT_TOKEN_EXPIRES_AT_ACCOUNT);
    const expiresAtMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;
    const isExpired = Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now() + 60_000;
    return {
      authMode,
      ok: Boolean(token) && !isExpired,
      credentialLabel: "Plane App bot token",
      missingError: !token
        ? "PLANE_APP_BOT_TOKEN (or PLANE_API_TOKEN) missing from env and keychain"
        : "PLANE_APP_BOT_TOKEN is expired; refresh with plane-app-oauth --mode bot-token",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
      expiresAt: expiresAt || undefined,
    };
  }

  if (authMode === "api-key") {
    const apiKey = String(process.env.PLANE_API_KEY || "").trim()
      || readKeychainSecret(PLANE_API_KEY_SERVICE, PLANE_API_KEY_ACCOUNT);
    return {
      authMode,
      ok: Boolean(apiKey),
      credentialLabel: "Plane API key",
      missingError: "PLANE_API_KEY missing from env and keychain",
      headers: apiKey ? { "X-API-Key": apiKey } : {},
    };
  }

  return {
    authMode,
    ok: false,
    credentialLabel: authMode,
    missingError: "--auth must be api-key or app-token",
    headers: {},
  };
}
