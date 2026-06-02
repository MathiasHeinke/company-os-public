#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const DEFAULT_BASE_URL = "https://api.plane.so";
const DEFAULT_SERVICE = "Company.OS Plane App";
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

const ACCOUNTS = {
  clientId: "PLANE_APP_CLIENT_ID",
  clientSecret: "PLANE_APP_CLIENT_SECRET",
  redirectUri: "PLANE_APP_REDIRECT_URI",
  installationId: "PLANE_APP_INSTALLATION_ID",
  scopes: "PLANE_APP_SCOPES",
  botToken: "PLANE_APP_BOT_TOKEN",
  botTokenExpiresAt: "PLANE_APP_BOT_TOKEN_EXPIRES_AT",
};

function parseArgs(argv) {
  const args = {
    mode: "consent-url",
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    clientId: process.env.PLANE_APP_CLIENT_ID || "",
    clientSecret: process.env.PLANE_APP_CLIENT_SECRET || "",
    redirectUri: process.env.PLANE_APP_REDIRECT_URI || "",
    installationId: process.env.PLANE_APP_INSTALLATION_ID || "",
    scopes: process.env.PLANE_APP_SCOPES || "",
    state: "",
    token: process.env.PLANE_APP_BOT_TOKEN || process.env.PLANE_API_TOKEN || "",
    saveTokenKeychain: false,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--mode") {
      args.mode = argv[++i] || args.mode;
    } else if (arg === "--base-url") {
      args.baseUrl = argv[++i] || DEFAULT_BASE_URL;
    } else if (arg === "--client-id") {
      args.clientId = argv[++i] || "";
    } else if (arg === "--client-secret") {
      args.clientSecret = argv[++i] || "";
    } else if (arg === "--redirect-uri") {
      args.redirectUri = argv[++i] || "";
    } else if (arg === "--app-installation-id") {
      args.installationId = argv[++i] || "";
    } else if (arg === "--scopes" || arg === "--scope") {
      args.scopes = normalizeScopes(argv[++i] || "");
    } else if (arg === "--state") {
      args.state = argv[++i] || "";
    } else if (arg === "--token") {
      args.token = argv[++i] || "";
    } else if (arg === "--save-token-keychain") {
      args.saveTokenKeychain = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  args.clientId ||= readKeychainSecret(ACCOUNTS.clientId);
  args.clientSecret ||= readKeychainSecret(ACCOUNTS.clientSecret);
  args.redirectUri ||= readKeychainSecret(ACCOUNTS.redirectUri);
  args.installationId ||= readKeychainSecret(ACCOUNTS.installationId);
  args.scopes = normalizeScopes(args.scopes || readKeychainSecret(ACCOUNTS.scopes) || DEFAULT_SCOPES);
  args.token ||= readKeychainSecret(ACCOUNTS.botToken);
  return args;
}

function usage() {
  return `Usage:
  node scripts/plane/plane-app-oauth.mjs --mode consent-url \\
    --client-id <id> --redirect-uri <url> [--state <csrf>] [--json]

  node scripts/plane/plane-app-oauth.mjs --mode bot-token \\
    --client-id <id> --client-secret <secret> \\
    --app-installation-id <uuid> [--save-token-keychain] [--json]

  node scripts/plane/plane-app-oauth.mjs --mode installation \\
    --app-installation-id <uuid> [--token <bot-token>] [--json]

Environment / keychain account names:
  PLANE_APP_CLIENT_ID
  PLANE_APP_CLIENT_SECRET
  PLANE_APP_REDIRECT_URI
  PLANE_APP_INSTALLATION_ID
  PLANE_APP_SCOPES
  PLANE_APP_BOT_TOKEN

Keychain service:
  ${DEFAULT_SERVICE}
`;
}

function normalizeScopes(value) {
  return String(value || "")
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" ");
}

function readKeychainSecret(account) {
  try {
    return execFileSync("security", [
      "find-generic-password",
      "-s",
      DEFAULT_SERVICE,
      "-a",
      account,
      "-w",
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function writeKeychainSecret(account, value) {
  execFileSync("security", [
    "add-generic-password",
    "-U",
    "-s",
    DEFAULT_SERVICE,
    "-a",
    account,
    "-w",
    value,
  ], { stdio: ["ignore", "ignore", "pipe"] });
}

function buildConsentUrl(args) {
  const url = new URL("/auth/o/authorize-app/", `${args.baseUrl}/`);
  url.searchParams.set("client_id", args.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", args.redirectUri);
  url.searchParams.set("scope", args.scopes);
  if (args.state) url.searchParams.set("state", args.state);
  return url.toString();
}

function validate(args) {
  const errors = [];
  if (!["consent-url", "bot-token", "installation"].includes(args.mode)) {
    errors.push("--mode must be consent-url, bot-token, or installation");
  }
  if (["consent-url", "bot-token"].includes(args.mode) && !args.clientId) {
    errors.push("Plane app client id missing");
  }
  if (args.mode === "consent-url" && !args.redirectUri) {
    errors.push("Plane app redirect uri missing");
  }
  if (args.mode === "bot-token" && !args.clientSecret) {
    errors.push("Plane app client secret missing");
  }
  if (["bot-token", "installation"].includes(args.mode) && !args.installationId) {
    errors.push("Plane app installation id missing");
  }
  if (args.mode === "installation" && !args.token) {
    errors.push("Plane app bot token missing");
  }
  return errors;
}

async function requestBotToken(args) {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    app_installation_id: args.installationId,
    scope: args.scopes,
  });

  const response = await fetch(`${args.baseUrl}/auth/o/token/`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${Buffer.from(`${args.clientId}:${args.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body,
  });

  return readJsonResponse(response);
}

async function requestInstallation(args) {
  const url = new URL("/auth/o/app-installation/", `${args.baseUrl}/`);
  url.searchParams.set("id", args.installationId);
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${args.token}`,
      "Accept": "application/json",
    },
  });

  return readJsonResponse(response);
}

async function readJsonResponse(response) {
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 500) };
  }
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    body,
  };
}

function sanitizeTokenResponse(body) {
  if (!body || typeof body !== "object") return null;
  return {
    token_type: body.token_type,
    expires_in: body.expires_in,
    scope: body.scope,
    has_access_token: Boolean(body.access_token),
  };
}

function sanitizeInstallation(body) {
  const rows = Array.isArray(body) ? body : [body].filter(Boolean);
  return rows.map((item) => ({
    id: item.id,
    workspace: item.workspace,
    workspace_detail: item.workspace_detail ? {
      id: item.workspace_detail.id,
      name: item.workspace_detail.name,
      slug: item.workspace_detail.slug,
    } : undefined,
    app_bot: item.app_bot,
    status: item.status,
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const errors = validate(args);
  const result = {
    version: "plane-app-oauth/v0",
    mode: args.mode,
    baseUrl: args.baseUrl,
    scopes: args.scopes,
    ok: errors.length === 0,
    errors,
  };

  if (errors.length) {
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  if (args.mode === "consent-url") {
    result.consentUrl = buildConsentUrl(args);
  } else if (args.mode === "bot-token") {
    const response = await requestBotToken(args);
    result.ok = response.ok;
    result.status = response.status;
    result.token = response.ok ? sanitizeTokenResponse(response.body) : undefined;
    result.error = response.ok ? undefined : response.body;
    if (response.ok && args.saveTokenKeychain) {
      const expiresAt = new Date(Date.now() + Number(response.body.expires_in || 0) * 1000).toISOString();
      writeKeychainSecret(ACCOUNTS.botToken, response.body.access_token);
      writeKeychainSecret(ACCOUNTS.botTokenExpiresAt, expiresAt);
      writeKeychainSecret(ACCOUNTS.installationId, args.installationId);
      writeKeychainSecret(ACCOUNTS.scopes, args.scopes);
      result.savedToKeychain = true;
      result.expiresAt = expiresAt;
    }
  } else if (args.mode === "installation") {
    const response = await requestInstallation(args);
    result.ok = response.ok;
    result.status = response.status;
    result.installation = response.ok ? sanitizeInstallation(response.body) : undefined;
    result.error = response.ok ? undefined : response.body;
  }

  printResult(result, args.json);
  if (!result.ok) process.exitCode = 1;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Plane app OAuth: ${result.ok ? "pass" : "fail"}`);
  console.log(`mode: ${result.mode}`);
  if (result.consentUrl) console.log(`consent url: ${result.consentUrl}`);
  if (result.status) console.log(`status: HTTP ${result.status}`);
  if (result.token) {
    console.log(`token type: ${result.token.token_type}`);
    console.log(`expires in: ${result.token.expires_in}`);
    console.log(`has access token: ${result.token.has_access_token}`);
    if (result.savedToKeychain) console.log("saved token: keychain");
  }
  if (result.installation) {
    for (const item of result.installation) {
      console.log(`installation: ${item.id} ${item.status || ""}`);
      if (item.workspace_detail?.slug) console.log(`workspace: ${item.workspace_detail.slug}`);
    }
  }
  for (const error of result.errors || []) console.log(`error: ${error}`);
  if (result.error) console.log(`error: ${JSON.stringify(result.error)}`);
}

main().catch((error) => {
  console.error(`Plane app OAuth failed: ${error.message}`);
  process.exitCode = 1;
});
