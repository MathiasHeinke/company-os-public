#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const VERSION = "atlas-506-source-gate-preflight/v0";

export function parseArgs(argv) {
  const args = {
    contractFiles: [],
    splitPlanFile: "",
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--contract-file") args.contractFiles.push(argv[++index] || "");
    else if (arg === "--split-plan-file") args.splitPlanFile = argv[++index] || "";
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.contractFiles = args.contractFiles.map((file) => file.trim()).filter(Boolean);
  return args;
}

export function validateArgs(args) {
  const errors = [];
  if (!args.contractFiles.length && !args.splitPlanFile) {
    errors.push("pass --contract-file and/or --split-plan-file");
  }
  return errors;
}

function usage() {
  return `Usage:
  node scripts/plane/atlas-506-source-gate-preflight.mjs \\
    --contract-file reports/atlas/super-goal/controller/[WORK_ITEM_ID]-non-prod-write-smoke-contract-proposal-2026-06-01.md \\
    --json

Read-only source/gate preflight for worker contracts. It checks declared
source_of_truth files and simple file-existence gates before any Opus dispatch.`;
}

export function contractFilesFromSplitPlan(path) {
  const plan = JSON.parse(readFileSync(path, "utf8"));
  return (plan.planned || []).map((row) => row.source_markdown).filter(Boolean);
}

export function evaluateContracts(contractFiles) {
  const checks = [];
  for (const file of contractFiles) {
    if (!existsSync(file)) {
      checks.push({ contract_file: file, kind: "contract-file", target: file, ok: false, status: "missing" });
      continue;
    }
    const text = readFileSync(file, "utf8");
    const yaml = extractYamlFence(text);
    for (const source of extractList(yaml, "source_of_truth")) {
      checks.push({
        contract_file: file,
        kind: "source_of_truth",
        target: source,
        ok: existsSync(source),
        status: existsSync(source) ? "present" : "missing",
      });
    }
    for (const gate of extractList(yaml, "gates")) {
      const fileTarget = parseTestFileGate(gate);
      if (!fileTarget) {
        checks.push({ contract_file: file, kind: "gate", target: gate, ok: true, status: "not-file-existence-gate" });
        continue;
      }
      checks.push({
        contract_file: file,
        kind: "gate:test-f",
        target: fileTarget,
        ok: existsSync(fileTarget),
        status: existsSync(fileTarget) ? "present" : "missing",
      });
    }
  }
  const failed = checks.filter((check) => !check.ok);
  return {
    version: VERSION,
    ok: failed.length === 0,
    checks,
    failed,
    hard_boundaries: [
      "read_only",
      "no_plane_write",
      "no_plane_done",
      "no_worker_spawn",
      "no_command_execution",
      "no_merge",
      "no_push",
      "no_deploy",
      "no_production_write",
      "no_schema_rls_auth_apply",
    ],
  };
}

function extractYamlFence(text) {
  const match = String(text || "").match(/```yaml\n([\s\S]*?)```/);
  return match ? match[1] : "";
}

export function extractList(yaml, key) {
  const lines = String(yaml || "").split(/\r?\n/);
  const values = [];
  let inBlock = false;
  for (const line of lines) {
    if (line.startsWith(`${key}:`)) {
      inBlock = true;
      continue;
    }
    if (inBlock && /^[a-zA-Z_][a-zA-Z0-9_]*:/.test(line)) break;
    const item = inBlock ? line.match(/^\s*-\s+(.+?)\s*$/) : null;
    if (item) values.push(item[1].trim());
  }
  return values;
}

function parseTestFileGate(gate) {
  const match = String(gate || "").match(/^test\s+-f\s+(.+?)\s*$/);
  return match ? match[1].trim() : "";
}

export function evaluateFromArgs(args) {
  const errors = validateArgs(args);
  if (errors.length) return { version: VERSION, ok: false, errors, checks: [], failed: [] };
  const files = [
    ...args.contractFiles,
    ...(args.splitPlanFile ? contractFilesFromSplitPlan(args.splitPlanFile) : []),
  ];
  return evaluateContracts([...new Set(files)]);
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return;
  }
  let result = null;
  try {
    result = evaluateFromArgs(args);
  } catch (error) {
    result = { version: VERSION, ok: false, errors: [error.message], checks: [], failed: [] };
  }
  printResult(result, args.json);
  if (!result.ok) process.exitCode = 2;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`[WORK_ITEM_ID] source/gate preflight: ${result.ok ? "pass" : "fail"}`);
  for (const failed of result.failed || []) console.log(`failed: ${failed.kind} ${failed.target}`);
  for (const error of result.errors || []) console.log(`error: ${error}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
