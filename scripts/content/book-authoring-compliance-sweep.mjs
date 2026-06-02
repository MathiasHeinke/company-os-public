#!/usr/bin/env node

import {
  readSweepInput,
  runBookAuthoringComplianceSweep,
} from "./book-authoring-compliance-sweep-core.mjs";

function parseArgs(argv) {
  const args = {
    manuscript: "",
    fvbm: "",
    voiceBeliefReport: "",
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--manuscript") args.manuscript = argv[++index];
    else if (arg === "--fvbm") args.fvbm = argv[++index];
    else if (arg === "--voice-belief-report") args.voiceBeliefReport = argv[++index];
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  node scripts/content/book-authoring-compliance-sweep.mjs \\
    --manuscript <path> \\
    --fvbm <path> \\
    --voice-belief-report <path> \\
    [--json]

Checks deterministic manuscript hygiene plus the presence of PASS verdicts for
voice_match and belief_match. Semantic voice/belief review is a separate audit
artifact; this gate verifies that it exists and passed.`;
}

function renderText(result) {
  const lines = [`book-authoring-compliance-sweep: ${result.status}`];
  for (const check of result.checks) {
    lines.push(`- ${check.status.toUpperCase()} ${check.id}: ${check.message}`);
  }
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const input = readSweepInput(args);
  const result = runBookAuthoringComplianceSweep(input);
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else console.log(renderText(result));
  if (!result.ok) process.exitCode = 2;
}

main();
