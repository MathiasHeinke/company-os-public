#!/usr/bin/env node

import {
  applyCompanyOsUpdate,
  COMPANY_OS_UPDATE_VERSION,
  planCompanyOsUpdate,
  writeUpdateReport,
} from "./company-os-update-core.mjs";

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = {
    command,
    source: process.cwd(),
    target: "",
    toVersion: "",
    date: new Date().toISOString().slice(0, 10),
    dryRun: false,
    writeReport: false,
    json: false,
    help: false,
  };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--help" || arg === "-h") { args.help = true; continue; }
    if (arg === "--dry-run") { args.dryRun = true; continue; }
    if (arg === "--write-report") { args.writeReport = true; continue; }
    if (arg === "--json") { args.json = true; continue; }
    const nextValue = () => {
      i += 1;
      if (i >= rest.length) throw new Error(`Missing value for ${arg}`);
      return rest[i];
    };
    if (arg === "--source") { args.source = nextValue(); continue; }
    if (arg === "--target") { args.target = nextValue(); continue; }
    if (arg === "--to") { args.toVersion = nextValue(); continue; }
    if (arg === "--date") { args.date = nextValue(); continue; }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  company-os-update.mjs check --source <Company.OS> --target <workspace> [--to <version>]
  company-os-update.mjs apply --source <Company.OS> --target <workspace> --to <version> [--dry-run]

Examples:
  company-os update check
  company-os update apply --to 0.7.2 --dry-run
  /update_eve -> run check first, then request operator approval before apply

Options:
  --source PATH       Company.OS repo root. Default: current working directory.
  --target PATH       Installed target workspace. Required.
  --to VERSION        Target version label. Defaults to source VERSION.
  --date YYYY-MM-DD   Report date.
  --write-report      For check mode, also write reports/company-os-updates/...
  --json              Print machine-readable result.
`;
}

function printResult(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`Company.OS update: ${result.status}\n`);
  if (result.summary) {
    process.stdout.write(`changes: add=${result.summary.add} update=${result.summary.update} unchanged=${result.summary.unchanged}\n`);
  }
  if (result.report) {
    process.stdout.write(`report: ${result.report.markdown}\n`);
  }
  if (result.errors?.length) {
    for (const error of result.errors) process.stdout.write(`error: ${error}\n`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !["check", "apply"].includes(args.command)) {
    process.stdout.write(usage());
    if (!args.help) process.exitCode = 2;
    return;
  }
  if (!args.target) {
    process.stderr.write("Error: --target is required.\n");
    process.stdout.write(usage());
    process.exitCode = 2;
    return;
  }
  let result;
  if (args.command === "check") {
    result = planCompanyOsUpdate({
      source: args.source,
      target: args.target,
      toVersion: args.toVersion,
      date: args.date,
    });
    if (result.ok && args.writeReport) {
      result.report = writeUpdateReport({ target: args.target, plan: result, applied: false, dryRun: true });
    }
  } else {
    result = applyCompanyOsUpdate({
      source: args.source,
      target: args.target,
      toVersion: args.toVersion,
      date: args.date,
      dryRun: args.dryRun,
      writeReport: !args.dryRun,
    });
  }
  result.command_version = COMPANY_OS_UPDATE_VERSION;
  printResult(result, args.json);
  if (!result.ok) process.exitCode = 2;
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message || String(error)}\n`);
  process.exitCode = 1;
});
