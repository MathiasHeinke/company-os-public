#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const VERSION = "atlas-599-g6-env-preflight/v0";

const REQUIRED = [
  "ATLAS_G6_NON_PROD_SUPABASE_URL",
  "ATLAS_G6_NON_PROD_SUPABASE_ANON_KEY",
  "ATLAS_G6_EXPECTED_SUPABASE_PROJECT_REF",
  "ATLAS_G6_ALLOW_NON_PROD_WRITE",
  "ATLAS_G6_FORBID_PROJECT_REFS",
  "ATLAS_G6_USER_A_JWT",
  "ATLAS_G6_USER_B_JWT",
  "ATLAS_G6_USER_A_ID",
  "ATLAS_G6_ROLLBACK_OWNER",
];

export function parseArgs(argv) {
  const args = {
    envFile: "",
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--env-file") args.envFile = argv[++index] || "";
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  node scripts/plane/atlas-599-g6-env-preflight.mjs --json
  node scripts/plane/atlas-599-g6-env-preflight.mjs --env-file /path/to/local.env --json

Read-only G6 environment preflight. It checks whether the [WORK_ITEM_ID] non-prod
Recovery write-smoke can advance to dry-run readiness. It never executes the
smoke, never performs network calls and never prints secret values.`;
}

export function loadEnv(args, baseEnv = process.env) {
  const env = { ...baseEnv };
  if (!args.envFile) return env;
  if (!existsSync(args.envFile)) {
    throw new Error(`env file missing: ${args.envFile}`);
  }
  for (const line of readFileSync(args.envFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    env[match[1]] = unquote(match[2].trim());
  }
  return env;
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

export function evaluateG6Env(env) {
  const checks = [];
  for (const name of REQUIRED) {
    checks.push({
      name,
      ok: Boolean(String(env[name] || "").trim()),
      status: String(env[name] || "").trim() ? "present" : "missing",
      value: maskValue(name, env[name]),
    });
  }

  const url = String(env.ATLAS_G6_NON_PROD_SUPABASE_URL || "");
  const expectedRef = String(env.ATLAS_G6_EXPECTED_SUPABASE_PROJECT_REF || "");
  const forbidRefs = String(env.ATLAS_G6_FORBID_PROJECT_REFS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const anonKey = String(env.ATLAS_G6_NON_PROD_SUPABASE_ANON_KEY || "");
  const allowWrite = String(env.ATLAS_G6_ALLOW_NON_PROD_WRITE || "");

  checks.push({
    name: "expected-ref-matches-url",
    ok: Boolean(url && expectedRef && url.includes(expectedRef)),
    status: url && expectedRef && url.includes(expectedRef) ? "matched" : "not-matched",
    value: { url: maskUrl(url), expected_ref: maskRef(expectedRef) },
  });
  const forbiddenMatches = forbidRefs.filter((ref) => url.includes(ref));
  checks.push({
    name: "forbid-refs-do-not-match-url",
    ok: Boolean(url && forbidRefs.length && forbiddenMatches.length === 0),
    status: !forbidRefs.length ? "missing-forbid-refs" : (forbiddenMatches.length ? "forbidden-ref-match" : "no-match"),
    value: { forbid_refs_count: forbidRefs.length, matched_count: forbiddenMatches.length },
  });
  checks.push({
    name: "anon-key-not-service-role",
    ok: Boolean(anonKey && !looksLikeServiceRole(anonKey)),
    status: anonKey ? (looksLikeServiceRole(anonKey) ? "service-role-like" : "anon-like") : "missing",
    value: maskValue("ATLAS_G6_NON_PROD_SUPABASE_ANON_KEY", anonKey),
  });
  checks.push({
    name: "write-confirmation-exact",
    ok: allowWrite === "I_UNDERSTAND_NON_PROD_ONLY",
    status: allowWrite === "I_UNDERSTAND_NON_PROD_ONLY" ? "confirmed" : "missing-or-wrong",
    value: allowWrite ? "[set]" : "[missing]",
  });

  const failed = checks.filter((check) => !check.ok);
  return {
    version: VERSION,
    ok: failed.length === 0,
    status: failed.length ? "BLOCKED_ENV" : "READY_FOR_DRY_RUN",
    checks,
    failed,
    next_command: failed.length ? null : "pnpm exec tsx reports/atlas/super-goal/p0-gate-clearance/recovery-write-smoke.ts",
    hard_boundaries: [
      "read_only",
      "no_network_call",
      "no_smoke_execution",
      "no_secret_printing",
      "no_plane_write",
      "no_plane_done",
      "no_production_write",
      "no_schema_rls_auth_apply",
    ],
  };
}

function looksLikeServiceRole(value) {
  const lower = String(value || "").toLowerCase();
  return lower.includes("service_role") || lower.includes("service-role");
}

function maskValue(name, value) {
  const text = String(value || "");
  if (!text) return "[missing]";
  if (name.includes("URL")) return maskUrl(text);
  if (name.includes("REF")) return name.includes("FORBID") ? `[${text.split(",").filter(Boolean).length} refs set]` : maskRef(text);
  if (name.includes("OWNER")) return "[set]";
  if (name.includes("ALLOW")) return text === "I_UNDERSTAND_NON_PROD_ONLY" ? "[confirmed]" : "[set-but-not-confirmed]";
  if (name.includes("USER_A_ID")) return maskRef(text);
  return `[set:${text.length} chars]`;
}

function maskUrl(value) {
  if (!value) return "[missing]";
  try {
    const url = new URL(value);
    const host = url.host.replace(/^(.{4}).*?(\..*)$/, "$1***$2");
    return `${url.protocol}//${host}`;
  } catch {
    return "[set:invalid-url]";
  }
}

function maskRef(value) {
  const text = String(value || "");
  if (!text) return "[missing]";
  if (text.length <= 8) return `${text.slice(0, 2)}***`;
  return `${text.slice(0, 4)}***${text.slice(-4)}`;
}

export function main(argv = process.argv.slice(2), baseEnv = process.env) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return;
  }
  let result = null;
  try {
    result = evaluateG6Env(loadEnv(args, baseEnv));
  } catch (error) {
    result = {
      version: VERSION,
      ok: false,
      status: "ERROR",
      errors: [error.message],
      checks: [],
      failed: [],
      hard_boundaries: ["read_only", "no_secret_printing"],
    };
  }
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`[WORK_ITEM_ID] G6 env preflight: ${result.ok ? "pass" : "fail"} (${result.status})`);
    for (const failed of result.failed || []) console.log(`failed: ${failed.name} ${failed.status}`);
    for (const error of result.errors || []) console.log(`error: ${error}`);
  }
  if (!result.ok) process.exitCode = 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
