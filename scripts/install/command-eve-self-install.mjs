#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  COMMAND_EVE_SELF_INSTALL_VERSION,
  buildCommandEveSelfInstallPlan,
  runCommandEveSelfInstall,
} from "./command-eve-self-install-core.mjs";

function parseArgs(argv) {
  let command = "install";
  let rest = argv;
  if (argv[0] && !argv[0].startsWith("-")) {
    command = argv[0];
    rest = argv.slice(1);
  }
  const args = {
    command: command === "--help" || command === "-h" ? "help" : command,
    source: process.cwd(),
    target: "",
    inputPath: "",
    date: new Date().toISOString().slice(0, 10),
    toVersion: "",
    provider: "",
    model: "",
    port: 25809,
    installMode: "",
    operatorRoot: "",
    aionCoreArchivePath: process.env.COMMAND_EVE_AIONCORE_ARCHIVE || "",
    dryRun: false,
    force: false,
    skipAionuiDependencies: false,
    skipAionuiBuild: false,
    writeReport: true,
    json: false,
    seed: {},
  };
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--help" || arg === "-h") { args.command = "help"; continue; }
    if (arg === "--dry-run") { args.dryRun = true; continue; }
    if (arg === "--force") { args.force = true; continue; }
    if (arg === "--skip-aionui-deps") { args.skipAionuiDependencies = true; continue; }
    if (arg === "--skip-aionui-build") { args.skipAionuiBuild = true; continue; }
    if (arg === "--no-write-report") { args.writeReport = false; continue; }
    if (arg === "--json") { args.json = true; continue; }
    const nextValue = () => {
      index += 1;
      if (index >= rest.length) throw new Error(`Missing value for ${arg}`);
      return rest[index];
    };
    if (arg === "--source" || arg === "--company-os-root") { args.source = nextValue(); continue; }
    if (arg === "--target" || arg === "--client-root") { args.target = nextValue(); continue; }
    if (arg === "--input") { args.inputPath = nextValue(); continue; }
    if (arg === "--date") { args.date = nextValue(); continue; }
    if (arg === "--to") { args.toVersion = nextValue(); continue; }
    if (arg === "--provider") { args.provider = nextValue(); continue; }
    if (arg === "--model") { args.model = nextValue(); continue; }
    if (arg === "--port") { args.port = Number(nextValue()); continue; }
    if (arg === "--install-mode") { args.installMode = nextValue(); continue; }
    if (arg === "--operator-root") { args.operatorRoot = nextValue(); continue; }
    if (arg === "--aioncore-archive") { args.aionCoreArchivePath = nextValue(); continue; }
    if (arg === "--company") { args.seed.companyName = nextValue(); continue; }
    if (arg === "--website") { args.seed.website = nextValue(); continue; }
    if (arg === "--offer") { args.seed.primaryOffer = nextValue(); continue; }
    if (arg === "--buyer") { args.seed.buyer = nextValue(); continue; }
    if (arg === "--founder") { args.seed.founderName = nextValue(); continue; }
    if (arg === "--user") { args.seed.userName = nextValue(); continue; }
    if (arg === "--approval-owner") { args.seed.approvalOwner = nextValue(); continue; }
    if (arg === "--first-department" || arg === "--first-pack") { args.seed.firstDepartment = nextValue(); continue; }
    if (arg === "--industry") { args.seed.industry = nextValue(); continue; }
    if (arg === "--stage") { args.seed.stage = nextValue(); continue; }
    if (arg === "--why-now") { args.seed.whyNow = nextValue(); continue; }
    if (arg === "--sales-motion") { args.seed.salesMotion = nextValue(); continue; }
    if (arg === "--connected-tool") {
      args.seed.connectedTools = [...(args.seed.connectedTools || []), nextValue()];
      continue;
    }
    if (arg === "--already-available") {
      args.seed.alreadyAvailable = [...(args.seed.alreadyAvailable || []), nextValue()];
      continue;
    }
    if (arg === "--missing-tool") {
      args.seed.missingTools = [...(args.seed.missingTools || []), nextValue()];
      continue;
    }
    if (arg === "--first-goal") {
      args.seed.firstGoals = [...(args.seed.firstGoals || []), nextValue()];
      continue;
    }
    if (arg === "--blocked-action") {
      args.seed.blockedActions = [...(args.seed.blockedActions || []), nextValue()];
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  command-eve-self-install.mjs install --target PATH --company NAME --website URL --offer TEXT --buyer TEXT --approval-owner NAME --first-department marketing [--json]
  command-eve-self-install.mjs install --dry-run --target PATH --company NAME --website URL --offer TEXT --buyer TEXT --approval-owner NAME --first-department marketing [--json]
  command-eve-self-install.mjs plan --target PATH --company NAME --website URL --offer TEXT --buyer TEXT --approval-owner NAME --first-department marketing [--json]

One-command guided local install for Command EVE:
- validates signup/report seed
- checks source version, target writability, existing install state
- checks git, python3, bun and pinned AionUI/Hermes manifest
- installs Company.OS public RC kit and onboarding packet
- installs managed AionUI/Hermes/EVE sidecars
- writes install reports plus start/update command hints

Use --aioncore-archive PATH or COMMAND_EVE_AIONCORE_ARCHIVE when the pinned
AionCore release download is slow or blocked.

This command does not create provider accounts, collect raw API keys, provision
hosted tenants, sign apps, publish, send, spend, deploy or mark Plane Done.

Version: ${COMMAND_EVE_SELF_INSTALL_VERSION}
`;
}

function optionsFromArgs(args) {
  return {
    source: args.source,
    target: args.target,
    inputPath: args.inputPath || undefined,
    date: args.date,
    toVersion: args.toVersion || undefined,
    provider: args.provider || undefined,
    model: args.model || undefined,
    port: args.port,
    installMode: args.installMode || undefined,
    operatorRoot: args.operatorRoot || undefined,
    aionCoreArchivePath: args.aionCoreArchivePath || undefined,
    dryRun: args.dryRun,
    force: args.force,
    skipAionuiDependencies: args.skipAionuiDependencies,
    skipAionuiBuild: args.skipAionuiBuild,
    writeReport: args.writeReport,
    seed: args.seed,
  };
}

function print(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`command-eve-self-install: ${result.status}\n`);
  for (const stage of result.stages || []) {
    process.stdout.write(`- ${stage.id}: ${stage.status}${stage.ok ? "" : " (failed)"}\n`);
  }
  const missing = result.operator_shell?.missing_prerequisites || result.operator_plan?.missing_prerequisites || [];
  if (missing.length) {
    process.stdout.write(`missing prerequisites: ${missing.join(", ")}\n`);
    for (const instruction of result.prerequisite_instructions || []) {
      process.stdout.write(`install ${instruction.tool}:\n`);
      for (const command of instruction.commands || []) process.stdout.write(`  ${command}\n`);
    }
  }
  if (result.operator_commands?.start_eve) {
    process.stdout.write(`start: ${result.operator_commands.start_eve}\n`);
    process.stdout.write(`update check: ${result.operator_commands.update_eve_check}\n`);
    process.stdout.write(`update apply: ${result.operator_commands.update_eve_apply}\n`);
  }
  if (result.report?.markdown) process.stdout.write(`report: ${result.report.markdown}\n`);
  if (result.next_steps?.length) {
    process.stdout.write("next:\n");
    for (const step of result.next_steps) process.stdout.write(`  ${step}\n`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "help" || !["plan", "install"].includes(args.command)) {
    process.stdout.write(usage());
    if (args.command !== "help") process.exitCode = 2;
    return;
  }
  const options = optionsFromArgs(args);
  const result = args.command === "plan"
    ? buildCommandEveSelfInstallPlan(options)
    : runCommandEveSelfInstall(options);
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
