#!/usr/bin/env node

import {
  buildContentMachineStartPlan,
  writeContentMachineStartPlan,
} from "./content-machine-start-core.mjs";

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    company: "Example Company",
    approvalOwner: "Founder",
    primaryChannel: "LinkedIn",
    date: new Date().toISOString().slice(0, 10),
    write: false,
    force: false,
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") args.root = argv[++index];
    else if (arg === "--company") args.company = argv[++index];
    else if (arg === "--approval-owner") args.approvalOwner = argv[++index];
    else if (arg === "--primary-channel") args.primaryChannel = argv[++index];
    else if (arg === "--date") args.date = argv[++index];
    else if (arg === "--write") args.write = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  node scripts/content/content-machine-start.mjs \\
    --root <target-root> \\
    --company "Company Name" \\
    --approval-owner "Founder" \\
    --primary-channel "LinkedIn" \\
    [--date YYYY-MM-DD] [--write] [--force] [--json]

Creates the content/content-machine folder structure. Without --write it prints
a dry-run plan. The command never publishes, schedules, sends, spends, calls a
model, reads private sources or writes durable memory.`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const plan = buildContentMachineStartPlan(args);
  const result = args.write ? writeContentMachineStartPlan(plan, { force: args.force }) : { dry_run: true, ...plan };
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(args.write ? "content-machine-start: wrote folder structure" : "content-machine-start: dry run");
  console.log(`root: ${result.root}`);
  console.log(`machine_root: ${result.machine_root}`);
  console.log(`intake: ${result.machine_root}/00_intake/CONTENT_MACHINE_INTAKE.md`);
}

main().catch((error) => {
  console.error(`content-machine-start failed: ${error.message}`);
  process.exitCode = 1;
});
