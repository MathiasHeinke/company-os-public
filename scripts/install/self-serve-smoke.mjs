#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runSelfServeSmoke } from "./self-serve-smoke-core.mjs";

function parseArgs(argv) {
  const [command = "run", ...rest] = argv;
  const args = {
    command,
    source: process.cwd(),
    target: "",
    date: new Date().toISOString().slice(0, 10),
    toVersion: "",
    intakePath: "",
    json: false,
    help: false,
  };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--help" || arg === "-h") { args.help = true; continue; }
    if (arg === "--json") { args.json = true; continue; }
    const nextValue = () => {
      i += 1;
      if (i >= rest.length) throw new Error(`Missing value for ${arg}`);
      return rest[i];
    };
    if (arg === "--source") { args.source = nextValue(); continue; }
    if (arg === "--target") { args.target = nextValue(); continue; }
    if (arg === "--date") { args.date = nextValue(); continue; }
    if (arg === "--to") { args.toVersion = nextValue(); continue; }
    if (arg === "--intake") { args.intakePath = nextValue(); continue; }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  self-serve-smoke.mjs run --source <Company.OS> [--target <workspace>] [options]

Options:
  --source PATH       Company.OS repo root. Default: current working directory.
  --target PATH       Fresh target workspace. Defaults to a temp directory.
  --intake PATH       Intake JSON to use instead of installed company-intake.example.json.
  --to VERSION        Target version label. Defaults to source VERSION.
  --date YYYY-MM-DD   Report date.
  --json              Print machine-readable result.

What it proves:
  1. bootstrap dry-run detects collisions before writes
  2. bootstrap apply installs the public kit into a fresh workspace
  3. first-company-packet materializes intake, EVE boot packet and Plane draft
  4. update check writes a report
  5. update apply dry-run stays non-destructive
`;
}

function printResult(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`Company.OS self-serve smoke: ${result.status}\n`);
  process.stdout.write(`target: ${result.target}\n`);
  for (const stage of result.stages || []) {
    process.stdout.write(`- ${stage.id}: ${stage.status}\n`);
  }
  if (result.artifacts) {
    process.stdout.write("artifacts:\n");
    for (const [key, value] of Object.entries(result.artifacts)) {
      if (value) process.stdout.write(`- ${key}: ${value}\n`);
    }
  }
  if (result.failed_stage) process.stdout.write(`failed_stage: ${result.failed_stage}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.command !== "run") {
    process.stdout.write(usage());
    if (!args.help) process.exitCode = 2;
    return;
  }
  const result = runSelfServeSmoke({
    source: args.source,
    target: args.target,
    date: args.date,
    toVersion: args.toVersion,
    intakePath: args.intakePath,
  });
  printResult(result, args.json);
  if (!result.ok) process.exitCode = 2;
}

const invokedPath = process.argv[1] ? fs.realpathSync(path.resolve(process.argv[1])) : "";
const currentPath = fs.realpathSync(fileURLToPath(import.meta.url));
if (invokedPath === currentPath) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message || String(error)}\n`);
    process.exitCode = 1;
  });
}
