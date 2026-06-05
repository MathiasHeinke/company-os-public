#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  COMMAND_EVE_INSTALLER_VERSION,
  buildInstallerPlan,
  runCommandEveInstall,
  writeCommandEveInstallReport,
} from "./command-eve-installer-core.mjs";

function parseArgs(argv) {
  const [command = "plan", ...rest] = argv;
  const args = {
    command: command === "--help" || command === "-h" ? "help" : command,
    companyOsRoot: process.cwd(),
    clientRoot: "",
    operatorRoot: "",
    installMode: "",
    provider: "",
    model: "",
    aionCoreArchivePath: process.env.COMMAND_EVE_AIONCORE_ARCHIVE || "",
    port: 25809,
    date: new Date().toISOString().slice(0, 10),
    dryRun: false,
    force: false,
    skipAionuiDependencies: false,
    skipAionuiBuild: false,
    writeReport: false,
    json: false,
  };
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--help" || arg === "-h") { args.command = "help"; continue; }
    if (arg === "--dry-run") { args.dryRun = true; continue; }
    if (arg === "--force") { args.force = true; continue; }
    if (arg === "--skip-aionui-deps") { args.skipAionuiDependencies = true; continue; }
    if (arg === "--skip-aionui-build") { args.skipAionuiBuild = true; continue; }
    if (arg === "--write-report") { args.writeReport = true; continue; }
    if (arg === "--json") { args.json = true; continue; }
    const nextValue = () => {
      index += 1;
      if (index >= rest.length) throw new Error(`Missing value for ${arg}`);
      return rest[index];
    };
    if (arg === "--company-os-root") { args.companyOsRoot = nextValue(); continue; }
    if (arg === "--client-root") { args.clientRoot = nextValue(); continue; }
    if (arg === "--operator-root") { args.operatorRoot = nextValue(); continue; }
    if (arg === "--install-mode") { args.installMode = nextValue(); continue; }
    if (arg === "--provider") { args.provider = nextValue(); continue; }
    if (arg === "--model") { args.model = nextValue(); continue; }
    if (arg === "--aioncore-archive") { args.aionCoreArchivePath = nextValue(); continue; }
    if (arg === "--port") { args.port = Number(nextValue()); continue; }
    if (arg === "--date") { args.date = nextValue(); continue; }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  install-command-eve.mjs plan [--client-root PATH] [--json]
  install-command-eve.mjs install [--client-root PATH] [--write-report] [--json]
  install-command-eve.mjs install --dry-run [--client-root PATH] [--json]

Installs the managed Command EVE operator shell for Company.OS 1.0.0-alpha.3:
- AionUI v2.1.10 source-overlay lane with Command EVE branding
- AionUI renderer assets built for local webui start
- Hermes Agent 0.15.2 in a local Python venv
- HERMES_HOME/SOUL.md, first-run skill pack and runtime policy
- default model config provider/model only; no raw API keys are collected

Use --aioncore-archive PATH or COMMAND_EVE_AIONCORE_ARCHIVE to prepare the
pinned AionCore binary from a pre-downloaded release archive.

Version: ${COMMAND_EVE_INSTALLER_VERSION}
`;
}

function optionsFromArgs(args) {
  return {
    companyOsRoot: args.companyOsRoot,
    clientRoot: args.clientRoot || undefined,
    operatorRoot: args.operatorRoot || undefined,
    installMode: args.installMode || undefined,
    provider: args.provider || undefined,
    model: args.model || undefined,
    aionCoreArchivePath: args.aionCoreArchivePath || undefined,
    port: args.port,
    date: args.date,
    dryRun: args.dryRun,
    force: args.force,
    skipAionuiDependencies: args.skipAionuiDependencies,
    skipAionuiBuild: args.skipAionuiBuild,
  };
}

function print(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`install-command-eve: ${result.status}\n`);
  if (result.missing_prerequisites?.length) {
    process.stdout.write(`missing prerequisites: ${result.missing_prerequisites.join(", ")}\n`);
    for (const instruction of result.prerequisite_instructions || []) {
      process.stdout.write(`install ${instruction.tool}:\n`);
      for (const command of instruction.commands || []) {
        process.stdout.write(`  ${command}\n`);
      }
    }
  }
  for (const stage of result.stages || []) {
    if (typeof stage === "string") process.stdout.write(`- ${stage}\n`);
    else process.stdout.write(`- ${stage.id}: ${stage.status || (stage.ok ? "pass" : "failed")}\n`);
  }
  if (result.start_command?.length) {
    process.stdout.write("start command:\n");
    process.stdout.write(`${result.start_command.join("\n")}\n`);
  }
  if (result.operator_commands) {
    process.stdout.write("operator commands:\n");
    process.stdout.write(`  start: ${result.operator_commands.start_eve}\n`);
    process.stdout.write(`  update check: ${result.operator_commands.update_eve_check}\n`);
    process.stdout.write(`  update apply: ${result.operator_commands.update_eve_apply}\n`);
  }
  if (result.report) process.stdout.write(`report: ${result.report.markdown}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "help" || !["plan", "install"].includes(args.command)) {
    process.stdout.write(usage());
    if (args.command !== "help") process.exitCode = 2;
    return;
  }
  let result = args.command === "plan"
    ? buildInstallerPlan(optionsFromArgs(args))
    : runCommandEveInstall(optionsFromArgs(args));
  if (args.writeReport && args.command === "install") {
    result = {
      ...result,
      report: writeCommandEveInstallReport({ result, date: args.date }),
    };
  }
  print(result, args.json);
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
