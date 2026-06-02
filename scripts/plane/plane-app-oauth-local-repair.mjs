#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVICE = "Company.OS Plane App";
const DEFAULT_BASE_URL = "https://api.plane.so";
const DEFAULT_SCOPES = [
  "profile:read",
  "projects:read",
  "projects.states:read",
  "projects.modules:read",
  "projects.cycles:read",
  "projects.pages:read",
  "projects.pages:write",
  "projects.work_items:read",
  "projects.work_items:write",
  "projects.work_items.comments:read",
  "projects.work_items.comments:write",
].join(" ");

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    scopes: DEFAULT_SCOPES,
    openBrowser: false,
    timeoutSeconds: 300,
    callbackUrl: "",
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--base-url") args.baseUrl = argv[++i] || DEFAULT_BASE_URL;
    else if (arg === "--scopes" || arg === "--scope") args.scopes = normalizeScopes(argv[++i] || "");
    else if (arg === "--use-keychain-scopes") args.scopes = "";
    else if (arg === "--open") args.openBrowser = true;
    else if (arg === "--timeout") args.timeoutSeconds = Number(argv[++i] || args.timeoutSeconds);
    else if (arg === "--callback-url") args.callbackUrl = argv[++i] || "";
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  if (!Number.isFinite(args.timeoutSeconds) || args.timeoutSeconds < 5) args.timeoutSeconds = 300;
  return args;
}

function usage() {
  return `Usage:
  node scripts/plane/plane-app-oauth-local-repair.mjs [--open] [--timeout 300] [--json]

  node scripts/plane/plane-app-oauth-local-repair.mjs \\
    --callback-url 'http://localhost:8765/plane-oauth-callback?...' \\
    --json

Starts a temporary localhost callback listener for the Plane App redirect URI,
prints or opens the consent URL, captures app_installation_id, and runs the
bot-token exchange. Keychain is updated only after a successful exchange.

Defaults to the current Company.OS recommended scopes, including
projects.pages:write. Pass --use-keychain-scopes only when intentionally testing
the exact stored scope set.

No client secret or bot token is printed.
`;
}

function normalizeScopes(value) {
  return String(value || "")
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" ");
}

function runOauth(args) {
  const scriptPath = resolve(__dirname, "plane-app-oauth.mjs");
  const child = spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  let parsed = null;
  try {
    parsed = child.stdout ? JSON.parse(child.stdout) : null;
  } catch {
    parsed = { ok: false, parse_error: true, raw: child.stdout?.slice(0, 1000) || "" };
  }

  return {
    exitCode: child.status ?? 1,
    signal: child.signal || null,
    stdout: parsed,
    stderr: child.stderr ? "[redacted]" : "",
  };
}

function getConsent(args) {
  const argv = ["--mode", "consent-url", "--base-url", args.baseUrl, "--json"];
  if (args.scopes) argv.push("--scopes", args.scopes);
  const result = runOauth(argv);
  if (result.exitCode !== 0 || !result.stdout?.ok || !result.stdout?.consentUrl) {
    const error = new Error("Could not generate Plane consent URL");
    error.details = result;
    throw error;
  }
  return result.stdout;
}

function callbackConfig(consentUrl) {
  const url = new URL(consentUrl);
  const redirectUri = new URL(url.searchParams.get("redirect_uri"));
  if (!["127.0.0.1", "localhost"].includes(redirectUri.hostname)) {
    throw new Error(`Refusing to listen for non-local redirect URI: ${redirectUri.toString()}`);
  }
  return {
    redirectUri: redirectUri.toString(),
    host: null,
    port: Number(redirectUri.port || 80),
    pathname: redirectUri.pathname || "/",
  };
}

function parseCallbackUrl(callbackUrl) {
  const url = new URL(callbackUrl);
  return {
    codePresent: Boolean(url.searchParams.get("code")),
    appInstallationId: url.searchParams.get("app_installation_id") || "",
    state: url.searchParams.get("state") || "",
    error: url.searchParams.get("error") || "",
  };
}

function waitForCallback({ host, port, pathname, timeoutSeconds }) {
  return new Promise((resolve) => {
    const result = {
      ok: false,
      callback: null,
      error: null,
    };

    const server = createServer((request, response) => {
      const requestUrl = new URL(request.url || "/", `http://${request.headers.host || `localhost:${port}`}`);
      if (requestUrl.pathname !== pathname) {
        response.writeHead(404, { "Content-Type": "text/plain" });
        response.end("Not found");
        return;
      }

      result.callback = {
        codePresent: Boolean(requestUrl.searchParams.get("code")),
        appInstallationId: requestUrl.searchParams.get("app_installation_id") || "",
        state: requestUrl.searchParams.get("state") || "",
        error: requestUrl.searchParams.get("error") || "",
      };
      result.ok = Boolean(result.callback.appInstallationId) && !result.callback.error;
      result.error = result.callback.error || (!result.callback.appInstallationId ? "Missing app_installation_id in callback" : null);

      response.writeHead(result.ok ? 200 : 400, { "Content-Type": "text/html; charset=utf-8" });
      response.end(`<!doctype html><title>Plane App Callback</title><h1>${result.ok ? "Plane App callback captured" : "Plane App callback failed"}</h1><p>You can close this window.</p>`);
      server.close(() => resolve(result));
    });

    server.on("error", (error) => {
      result.error = error.message;
      resolve(result);
    });

    if (host) server.listen(port, host);
    else server.listen(port);

    setTimeout(() => {
      result.error = `Timed out waiting for Plane callback after ${timeoutSeconds}s`;
      server.close(() => resolve(result));
    }, timeoutSeconds * 1000).unref();
  });
}

function openBrowser(url) {
  const child = spawn("open", [url], {
    stdio: ["ignore", "ignore", "ignore"],
    detached: true,
  });
  child.unref();
}

function exchangeBotToken({ args, appInstallationId }) {
  const argv = [
    "--mode", "bot-token",
    "--base-url", args.baseUrl,
    "--app-installation-id", appInstallationId,
    "--save-token-keychain",
    "--json",
  ];
  if (args.scopes) argv.push("--scopes", args.scopes);
  return runOauth(argv);
}

function print(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Plane app OAuth local repair: ${result.ok ? "pass" : "fail"}`);
  if (result.consentUrlPrinted) console.log("consent URL printed to stderr");
  if (result.redirectUri) console.log(`redirect URI: ${result.redirectUri}`);
  if (result.callback) {
    console.log(`callback code present: ${result.callback.codePresent}`);
    console.log(`app installation id captured: ${Boolean(result.callback.appInstallationId)}`);
  }
  if (result.tokenExchange?.stdout?.status) console.log(`token exchange status: HTTP ${result.tokenExchange.stdout.status}`);
  if (result.savedInstallationId) console.log("saved installation id: keychain");
  if (result.tokenExchange?.stdout?.savedToKeychain) console.log("saved bot token: keychain");
  if (result.error) console.log(`error: ${result.error}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const consent = args.callbackUrl ? null : getConsent(args);
  const callback = consent ? callbackConfig(consent.consentUrl) : null;
  const result = {
    version: "plane-app-oauth-local-repair/v0",
    ok: false,
    baseUrl: args.baseUrl,
    redirectUri: callback?.redirectUri || null,
    scopes: consent?.scopes || args.scopes || null,
    consentUrlPrinted: Boolean(consent),
    callback: null,
    savedInstallationId: false,
    tokenExchange: null,
    error: null,
  };

  let callbackResult;
  if (args.callbackUrl) {
    const parsedCallback = parseCallbackUrl(args.callbackUrl);
    callbackResult = {
      ok: Boolean(parsedCallback.appInstallationId) && !parsedCallback.error,
      callback: parsedCallback,
      error: parsedCallback.error || (!parsedCallback.appInstallationId ? "Missing app_installation_id in callback URL" : null),
    };
  } else {
    console.error(`Plane consent URL:\n${consent.consentUrl}\n`);
    if (args.openBrowser) openBrowser(consent.consentUrl);
    callbackResult = await waitForCallback({
      ...callback,
      timeoutSeconds: args.timeoutSeconds,
    });
  }
  result.callback = callbackResult.callback;

  if (!callbackResult.ok) {
    result.error = callbackResult.error || "Callback failed";
    print(result, args.json);
    process.exitCode = 1;
    return;
  }

  const tokenExchange = exchangeBotToken({
    args,
    appInstallationId: callbackResult.callback.appInstallationId,
  });
  result.tokenExchange = {
    exitCode: tokenExchange.exitCode,
    signal: tokenExchange.signal,
    stdout: tokenExchange.stdout,
    stderr: tokenExchange.stderr,
  };
  result.ok = tokenExchange.exitCode === 0 && tokenExchange.stdout?.ok === true;
  result.savedInstallationId = Boolean(result.ok && tokenExchange.stdout?.savedToKeychain);
  result.error = result.ok ? null : "Bot-token exchange failed";

  print(result, args.json);
  process.exitCode = result.ok ? 0 : 1;
}

main().catch((error) => {
  const details = error.details ? ` ${JSON.stringify(error.details)}` : "";
  console.error(`Plane app OAuth local repair failed: ${error.message}${details}`);
  process.exitCode = 1;
});
