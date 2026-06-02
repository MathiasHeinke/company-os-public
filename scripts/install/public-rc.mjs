#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PUBLIC_RC_INSTALL_VERSION,
  runPublicRcInstall,
} from "./public-rc-core.mjs";

function pushOption(args, key, value) {
  if (!args[key]) args[key] = [];
  args[key].push(value);
}

function parseArgs(argv) {
  const [command = "install", ...rest] = argv;
  const args = {
    command,
    source: process.cwd(),
    target: "",
    date: new Date().toISOString().slice(0, 10),
    toVersion: "",
    inputPath: "",
    force: false,
    json: false,
    help: false,
    seed: {},
  };

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--help" || arg === "-h") { args.help = true; continue; }
    if (arg === "--json") { args.json = true; continue; }
    if (arg === "--force") { args.force = true; continue; }
    const nextValue = () => {
      i += 1;
      if (i >= rest.length) throw new Error(`Missing value for ${arg}`);
      return rest[i];
    };

    if (arg === "--source") { args.source = nextValue(); continue; }
    if (arg === "--target") { args.target = nextValue(); continue; }
    if (arg === "--date") { args.date = nextValue(); continue; }
    if (arg === "--to") { args.toVersion = nextValue(); continue; }
    if (arg === "--input") { args.inputPath = nextValue(); continue; }
    if (arg === "--company") { args.seed.companyName = nextValue(); continue; }
    if (arg === "--website") { args.seed.website = nextValue(); continue; }
    if (arg === "--offer") { args.seed.primaryOffer = nextValue(); continue; }
    if (arg === "--buyer") { args.seed.buyer = nextValue(); continue; }
    if (arg === "--founder") { args.seed.founderName = nextValue(); continue; }
    if (arg === "--user") { args.seed.userName = nextValue(); continue; }
    if (arg === "--approval-owner") { args.seed.approvalOwner = nextValue(); continue; }
    if (arg === "--first-department") { args.seed.firstDepartment = nextValue(); continue; }
    if (arg === "--industry") { args.seed.industry = nextValue(); continue; }
    if (arg === "--stage") { args.seed.stage = nextValue(); continue; }
    if (arg === "--revenue-model") { args.seed.revenueModel = nextValue(); continue; }
    if (arg === "--why-now") { args.seed.whyNow = nextValue(); continue; }
    if (arg === "--sales-motion") { args.seed.salesMotion = nextValue(); continue; }
    if (arg === "--data-sensitivity") { args.seed.dataSensitivity = nextValue(); continue; }
    if (arg === "--execution-ledger") { args.seed.executionLedger = nextValue(); continue; }
    if (arg === "--initial-report-context") { args.seed.initialReportContext = nextValue(); continue; }
    if (arg === "--founder-decision-style") { args.seed.founderDecisionStyle = nextValue(); continue; }
    if (arg === "--founder-communication-notes") { args.seed.founderCommunicationNotes = nextValue(); continue; }

    if (arg === "--connected-tool") { pushOption(args.seed, "connectedTools", nextValue()); continue; }
    if (arg === "--already-available") { pushOption(args.seed, "alreadyAvailable", nextValue()); continue; }
    if (arg === "--missing-tool") { pushOption(args.seed, "missingTools", nextValue()); continue; }
    if (arg === "--task-source") { pushOption(args.seed, "taskSources", nextValue()); continue; }
    if (arg === "--role-source") { pushOption(args.seed, "rolesAndPeopleSources", nextValue()); continue; }
    if (arg === "--account-to-connect") { pushOption(args.seed, "accountsToConnect", nextValue()); continue; }
    if (arg === "--permission-needed") { pushOption(args.seed, "permissionsNeeded", nextValue()); continue; }
    if (arg === "--tool-to-install") { pushOption(args.seed, "toolsToInstall", nextValue()); continue; }
    if (arg === "--first-goal") { pushOption(args.seed, "firstGoals", nextValue()); continue; }
    if (arg === "--blocked-action") { pushOption(args.seed, "blockedActions", nextValue()); continue; }
    if (arg === "--allowed-memory-source") { pushOption(args.seed, "allowedMemorySources", nextValue()); continue; }
    if (arg === "--forbidden-memory-source") { pushOption(args.seed, "forbiddenMemorySources", nextValue()); continue; }
    if (arg === "--founder-preference") { pushOption(args.seed, "founderPreferences", nextValue()); continue; }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function usage() {
  return `Usage:
  public-rc.mjs install --target <workspace> --company <name> --website <url> --offer <offer> --buyer <buyer> --approval-owner <name> [options]
  public-rc.mjs install --target <workspace> --input <company-intake.json> [options]

Options:
  --source PATH              Public Company.OS clone or sanitized public mirror. Default: current directory.
  --target PATH              Fresh target workspace. Required.
  --to VERSION               Target version label. Defaults to source VERSION.
  --date YYYY-MM-DD          Report date.
  --input PATH               Use an existing intake JSON instead of seed flags.
  --force                    Allow overwriting target collisions after operator review.
  --json                     Print machine-readable result.

Seed fields:
  --company NAME             Company name.
  --website URL              Company website or domain.
  --offer TEXT               Primary offer.
  --buyer TEXT               Target buyer.
  --founder NAME             Founder/CEO.
  --approval-owner NAME      HumanGate approval owner.
  --first-department ID      First wedge, e.g. marketing, content, sales, support.

Repeatable context fields:
  --connected-tool VALUE
  --already-available VALUE
  --missing-tool VALUE
  --task-source VALUE
  --account-to-connect VALUE
  --first-goal VALUE
  --blocked-action VALUE

What it does:
  1. dry-runs kit install and blocks on collisions
  2. installs the Company.OS kit
  3. writes .company-os/onboarding/company-intake.json from public signup/report seed
  4. materializes EVE boot packet, discovery brief and first Plane parent draft
  5. writes update provenance and public-RC handoff reports
`;
}

function printResult(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`Company.OS public RC install: ${result.status}\n`);
  process.stdout.write(`target: ${result.target}\n`);
  process.stdout.write(`version: ${result.to_version}\n`);
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
  if (args.help || args.command !== "install") {
    process.stdout.write(usage());
    if (!args.help) process.exitCode = 2;
    return;
  }
  const result = runPublicRcInstall({
    source: args.source,
    target: args.target,
    date: args.date,
    toVersion: args.toVersion,
    inputPath: args.inputPath,
    seed: args.seed,
    force: args.force,
  });
  result.command_version = PUBLIC_RC_INSTALL_VERSION;
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
