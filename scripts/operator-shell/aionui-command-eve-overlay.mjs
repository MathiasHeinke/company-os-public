#!/usr/bin/env node

import {
  AIONUI_COMMAND_EVE_OVERLAY_VERSION,
  applyAionuiCommandEveOverlay,
  inspectAionuiCommandEveOverlay,
} from "./aionui-command-eve-overlay-core.mjs";

function parseArgs(argv) {
  const args = {
    command: argv[0] || "preflight",
    aionuiRoot: "",
    companyOsRoot: "",
    privateRoot: "",
    dryRun: false,
    force: false,
    json: false,
    help: false,
  };
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") { args.help = true; continue; }
    if (arg === "--dry-run") { args.dryRun = true; continue; }
    if (arg === "--force") { args.force = true; continue; }
    if (arg === "--json") { args.json = true; continue; }
    const nextValue = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };
    if (arg === "--aionui-root") { args.aionuiRoot = nextValue(); continue; }
    if (arg === "--company-os-root") { args.companyOsRoot = nextValue(); continue; }
    if (arg === "--private-root") { args.privateRoot = nextValue(); continue; }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  aionui-command-eve-overlay.mjs preflight [--aionui-root PATH] [--json]
  aionui-command-eve-overlay.mjs apply [--aionui-root PATH] [--dry-run] [--force] [--json]

Applies the reproducible Command EVE AionUI UI overlay:
- copies the Command EVE logo and wait-video assets into AionUI public/
- applies the checked AionUI source patch with git apply

Version: ${AIONUI_COMMAND_EVE_OVERLAY_VERSION}
`;
}

function printResult(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`AionUI Command EVE overlay: ${result.status}\n`);
  if (result.failures?.length) {
    process.stdout.write("Failures:\n");
    for (const failure of result.failures) process.stdout.write(`- ${failure}\n`);
  }
  if (result.copied_assets?.length) {
    process.stdout.write("Copied assets:\n");
    for (const asset of result.copied_assets) process.stdout.write(`- ${asset}\n`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return;
  }
  const options = {
    aionuiRoot: args.aionuiRoot || undefined,
    companyOsRoot: args.companyOsRoot || undefined,
    privateRoot: args.privateRoot || undefined,
    dryRun: args.dryRun,
    force: args.force,
  };
  let result;
  if (args.command === "preflight") result = inspectAionuiCommandEveOverlay(options);
  else if (args.command === "apply") result = applyAionuiCommandEveOverlay(options);
  else throw new Error(`Unknown command: ${args.command}`);
  printResult(result, args.json);
  if (!result.ok) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 2;
});
