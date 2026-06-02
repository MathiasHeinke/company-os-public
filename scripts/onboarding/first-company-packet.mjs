#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFirstCompanyPacket,
  FIRST_COMPANY_PACKET_VERSION,
  writeFirstCompanyPacket,
} from "./first-company-packet-core.mjs";

function parseArgs(argv) {
  const args = {
    target: "",
    input: "",
    registry: "registries/domain-packs/company-os.json",
    date: new Date().toISOString().slice(0, 10),
    dryRun: false,
    force: false,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") { args.help = true; continue; }
    if (arg === "--dry-run") { args.dryRun = true; continue; }
    if (arg === "--force") { args.force = true; continue; }
    if (arg === "--json") { args.json = true; continue; }
    const nextValue = () => {
      i += 1;
      if (i >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[i];
    };
    if (arg === "--target") { args.target = nextValue(); continue; }
    if (arg === "--input") { args.input = nextValue(); continue; }
    if (arg === "--registry") { args.registry = nextValue(); continue; }
    if (arg === "--date") { args.date = nextValue(); continue; }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  first-company-packet.mjs --target <workspace> --input <intake.json> [options]

Options:
  --registry PATH  Domain pack registry. Default: registries/domain-packs/company-os.json
  --date YYYY-MM-DD
  --dry-run        Build packet and list files without writing.
  --force          Overwrite generated target files after review.
  --json           Print machine-readable result.

Generated files:
  .company-os/company-discovery-brief.md
  .company-os/onboarding/intake-record.json
  .company-os/onboarding/eve-boot-packet.json
  .company-os/onboarding/first-plane-parent-draft.md
  reports/company-discovery/YYYY-MM-DD/first-company-packet.md
  reports/company-discovery/YYYY-MM-DD/first-plane-parent-draft.md
`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function printResult(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`First company packet: ${result.ok ? result.status : "blocked"}\n`);
  if (result.files?.length) {
    for (const file of result.files) process.stdout.write(`- ${file}\n`);
  }
  if (result.collisions?.length) {
    process.stdout.write("Collisions:\n");
    for (const file of result.collisions) process.stdout.write(`- ${file}\n`);
  }
  if (result.errors?.length) {
    process.stdout.write("Errors:\n");
    for (const error of result.errors) process.stdout.write(`- ${error}\n`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return;
  }
  if (!args.target || !args.input) {
    process.stderr.write("Error: --target and --input are required.\n");
    process.stdout.write(usage());
    process.exitCode = 2;
    return;
  }
  const registryPath = path.resolve(args.registry);
  const input = readJson(args.input);
  const registry = readJson(registryPath);
  const packet = buildFirstCompanyPacket(input, { registry, date: args.date });
  if (!packet.ok) {
    printResult({
      ok: false,
      status: "error",
      version: FIRST_COMPANY_PACKET_VERSION,
      errors: packet.errors,
      reasons: packet.reasons,
    }, args.json);
    process.exitCode = 2;
    return;
  }
  const writeResult = writeFirstCompanyPacket({
    target: args.target,
    packet,
    force: args.force,
    dryRun: args.dryRun,
  });
  printResult({
    version: FIRST_COMPANY_PACKET_VERSION,
    ...writeResult,
    date: packet.date,
    company_slug: packet.company_slug,
  }, args.json);
  if (!writeResult.ok) process.exitCode = 2;
}

const invokedPath = process.argv[1] ? fs.realpathSync(path.resolve(process.argv[1])) : "";
const currentPath = fs.realpathSync(fileURLToPath(import.meta.url));
if (invokedPath === currentPath) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message || String(error)}\n`);
    process.exitCode = 1;
  });
}
