#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PLANE_APP_BOT_TOKEN_ACCOUNT,
  PLANE_APP_BOT_TOKEN_EXPIRES_AT_ACCOUNT,
  PLANE_APP_SERVICE,
  readKeychainSecret,
} from "./plane-auth.mjs";
import {
  DEFAULT_REFRESH_WINDOW_MS,
  TOKEN_ROTATION_VERSION,
  evaluateTokenState,
  parseDurationMs,
  sanitizeOauthResult,
} from "./plane-app-token-rotation-core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {
    mode: "ensure",
    refreshWindow: process.env.PLANE_APP_TOKEN_REFRESH_WINDOW || "2h",
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--mode") {
      args.mode = argv[++i] || args.mode;
    } else if (arg === "--refresh-window" || arg === "--min-ttl") {
      args.refreshWindow = argv[++i] || args.refreshWindow;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function usage() {
  return `Usage:
  node scripts/plane/plane-app-token-rotation.mjs [--mode check|ensure|force] [--refresh-window 2h] [--json]

Modes:
  check   Read keychain/env state only. Exit 2 when token should be refreshed.
  ensure  Refresh only when token is missing, expired, invalid, or within refresh window.
  force   Always refresh, then verify keychain state.

This command never prints the bot token. It delegates token exchange to:
  node scripts/plane/plane-app-oauth.mjs --mode bot-token --save-token-keychain --json

Keychain service:
  ${PLANE_APP_SERVICE}
Accounts:
  ${PLANE_APP_BOT_TOKEN_ACCOUNT}
  ${PLANE_APP_BOT_TOKEN_EXPIRES_AT_ACCOUNT}
`;
}

function readTokenSnapshot() {
  const token = String(
    process.env.PLANE_APP_BOT_TOKEN || process.env.PLANE_API_TOKEN || ""
  ).trim()
    || readKeychainSecret(PLANE_APP_SERVICE, PLANE_APP_BOT_TOKEN_ACCOUNT);
  const expiresAt = String(
    process.env.PLANE_APP_BOT_TOKEN_EXPIRES_AT || process.env.PLANE_API_TOKEN_EXPIRES_AT || ""
  ).trim()
    || readKeychainSecret(PLANE_APP_SERVICE, PLANE_APP_BOT_TOKEN_EXPIRES_AT_ACCOUNT);
  return { token, expiresAt };
}

function refreshToken() {
  const scriptPath = resolve(__dirname, "plane-app-oauth.mjs");
  const child = spawnSync(process.execPath, [
    scriptPath,
    "--mode",
    "bot-token",
    "--save-token-keychain",
    "--json",
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  let parsed = null;
  try {
    parsed = child.stdout ? JSON.parse(child.stdout) : null;
  } catch {
    parsed = { ok: false, parse_error: true };
  }

  return {
    exitCode: child.status ?? 1,
    signal: child.signal || null,
    stdoutParsed: parsed,
    stderr: child.stderr ? "[redacted]" : "",
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  if (!["check", "ensure", "force"].includes(args.mode)) {
    throw new Error("--mode must be check, ensure, or force");
  }

  const refreshWindowMs = parseDurationMs(args.refreshWindow, DEFAULT_REFRESH_WINDOW_MS);
  const beforeSnapshot = readTokenSnapshot();
  const before = evaluateTokenState({
    token: beforeSnapshot.token,
    expiresAt: beforeSnapshot.expiresAt,
    refreshWindowMs,
  });

  const result = {
    version: TOKEN_ROTATION_VERSION,
    mode: args.mode,
    refreshWindowMs,
    ok: before.ok && !before.shouldRefresh,
    action: "kept",
    before,
    after: null,
    refresh: null,
  };

  const shouldRefresh = args.mode === "force" || before.shouldRefresh;

  if (args.mode === "check") {
    result.action = before.shouldRefresh ? "would-refresh" : "kept";
    result.ok = !before.shouldRefresh;
    printResult(result, args.json);
    process.exitCode = result.ok ? 0 : 2;
    return;
  }

  if (shouldRefresh) {
    result.action = "refreshed";
    const refresh = refreshToken();
    result.refresh = {
      exitCode: refresh.exitCode,
      signal: refresh.signal,
      oauth: sanitizeOauthResult(refresh.stdoutParsed),
      stderr: refresh.stderr,
    };
    if (refresh.exitCode !== 0 || !refresh.stdoutParsed?.ok) {
      result.ok = false;
      result.after = null;
      printResult(result, args.json);
      process.exitCode = 1;
      return;
    }
  }

  const afterSnapshot = readTokenSnapshot();
  const after = evaluateTokenState({
    token: afterSnapshot.token,
    expiresAt: afterSnapshot.expiresAt,
    refreshWindowMs,
  });
  result.after = after;
  result.ok = after.ok && !after.shouldRefresh;
  result.action = shouldRefresh ? "refreshed" : "kept";

  printResult(result, args.json);
  process.exitCode = result.ok ? 0 : 1;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Plane app token rotation: ${result.ok ? "pass" : "fail"}`);
  console.log(`mode: ${result.mode}`);
  console.log(`action: ${result.action}`);
  console.log(`before: ${result.before.status} (${result.before.reason})`);
  if (result.after) console.log(`after: ${result.after.status} (${result.after.reason})`);
  if (result.refresh?.oauth?.status) console.log(`refresh status: HTTP ${result.refresh.oauth.status}`);
}

main().catch((error) => {
  console.error(`Plane app token rotation failed: ${error.message}`);
  process.exitCode = 1;
});
