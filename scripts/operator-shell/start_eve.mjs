#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runStartEve,
  START_EVE_VERSION,
  writeStartEveReport,
} from "./start-eve-core.mjs";

function parseArgs(argv) {
  const [command = "check", ...rest] = argv;
  const args = {
    command: command === "--help" || command === "-h" ? "help" : command,
    companyOsRoot: process.cwd(),
    privateRoot: "",
    aionuiRoot: "",
    hermesRoot: "",
    hermesHome: "",
    hermesWrapper: "",
    port: 25809,
    date: new Date().toISOString().slice(0, 10),
    applyOverlay: false,
    authCheck: false,
    writeReport: false,
    json: false,
    timeoutMs: 180_000,
    provider: "",
    model: "",
  };
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--help" || arg === "-h") { args.command = "help"; continue; }
    if (arg === "--apply-overlay") { args.applyOverlay = true; continue; }
    if (arg === "--auth-check") { args.authCheck = true; continue; }
    if (arg === "--write-report") { args.writeReport = true; continue; }
    if (arg === "--json") { args.json = true; continue; }
    const nextValue = () => {
      index += 1;
      if (index >= rest.length) throw new Error(`Missing value for ${arg}`);
      return rest[index];
    };
    if (arg === "--company-os-root") { args.companyOsRoot = nextValue(); continue; }
    if (arg === "--private-root") { args.privateRoot = nextValue(); continue; }
    if (arg === "--aionui-root") { args.aionuiRoot = nextValue(); continue; }
    if (arg === "--hermes-root") { args.hermesRoot = nextValue(); continue; }
    if (arg === "--hermes-home") { args.hermesHome = nextValue(); continue; }
    if (arg === "--hermes-wrapper") { args.hermesWrapper = nextValue(); continue; }
    if (arg === "--port") { args.port = Number(nextValue()); continue; }
    if (arg === "--date") { args.date = nextValue(); continue; }
    if (arg === "--timeout-ms") { args.timeoutMs = Number(nextValue()); continue; }
    if (arg === "--provider") { args.provider = nextValue(); continue; }
    if (arg === "--model") { args.model = nextValue(); continue; }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  start_eve.mjs check [--apply-overlay] [--auth-check] [--write-report] [--json]
  start_eve.mjs start-command [--apply-overlay] [--auth-check]

What it checks:
  1. AionUI is branded/defaulted to Command EVE over Hermes
  2. EVE sidecar context, SOUL.md, shims and private overlays are prepared
  3. Hermes default model/provider, ACP dependency and EVE soul preflight pass
  4. Optional Hermes auth/model smoke returns non-empty output

Version: ${START_EVE_VERSION}
`;
}

function optionsFromArgs(args) {
  return {
    companyOsRoot: args.companyOsRoot,
    privateRoot: args.privateRoot || undefined,
    aionuiRoot: args.aionuiRoot || undefined,
    hermesRoot: args.hermesRoot || undefined,
    hermesHome: args.hermesHome || undefined,
    hermesWrapper: args.hermesWrapper || undefined,
    port: args.port,
    date: args.date,
    applyOverlay: args.applyOverlay,
    authCheck: args.authCheck,
    timeoutMs: args.timeoutMs,
    provider: args.provider || undefined,
    model: args.model || undefined,
  };
}

function print(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`start_eve: ${result.status}\n`);
  for (const stage of result.stages || []) {
    process.stdout.write(`- ${stage.id}: ${stage.status}\n`);
  }
  if (result.failed_stage) process.stdout.write(`failed_stage: ${result.failed_stage}\n`);
  if (result.start_command?.length) {
    process.stdout.write("start command:\n");
    process.stdout.write(`${result.start_command.join("\n")}\n`);
  }
  if (result.report) process.stdout.write(`report: ${result.report.markdown}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "help" || !["check", "start-command"].includes(args.command)) {
    process.stdout.write(usage());
    if (args.command !== "help") process.exitCode = 2;
    return;
  }
  const result = runStartEve(optionsFromArgs(args));
  if (args.writeReport) {
    result.report = writeStartEveReport({
      result,
      companyOsRoot: args.companyOsRoot,
      date: args.date,
    });
  }
  if (args.command === "start-command" && result.ok) {
    process.stdout.write(`${result.start_command.join("\n")}\n`);
  } else {
    print(result, args.json);
  }
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
