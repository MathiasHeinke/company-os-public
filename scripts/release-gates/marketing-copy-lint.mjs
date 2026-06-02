#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  renderFullGateMarkdown,
  runFullGate,
} from "./marketing-copy-lint-core.mjs";

function parseArgs(argv) {
  const args = {
    textFile: "",
    payloadFile: "",
    artifactId: "",
    output: "",
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--text-file") args.textFile = argv[++i] || "";
    else if (arg === "--payload") args.payloadFile = argv[++i] || "";
    else if (arg === "--artifact-id") args.artifactId = argv[++i] || "";
    else if (arg === "--output") args.output = argv[++i] || "";
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  node scripts/release-gates/marketing-copy-lint.mjs \\
    --text-file /absolute/path/to/draft.txt \\
    [--payload /absolute/path/to/gate-payload.json] \\
    [--artifact-id <id>] [--output /absolute/path/to/report.md|report.json] [--json]

Runs the additive Marketing copy-lint + claim-safety gate.
No publish, schedule, send, import, Plane Done, network or production action is performed.

Exit codes:
  0 = PASS
  1 = REJECT violations
  2 = WARN / REVIEW_REQUIRED only
  3 = input error
`;
}

function readPayload(filePath) {
  if (!filePath) return {};
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("--payload must be a JSON object");
  }
  return parsed;
}

function writeOutput(filePath, result) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const body = filePath.endsWith(".json")
    ? `${JSON.stringify(result, null, 2)}\n`
    : renderFullGateMarkdown(result);
  fs.writeFileSync(filePath, body);
}

function printHuman(result) {
  console.log(`marketing-copy-lint: ${result.status}`);
  console.log(`violations: ${result.violations.length}, warnings: ${result.warnings.length}`);
  for (const item of result.violations) console.log(`violation: ${item.rule} - ${item.message}`);
  for (const item of result.warnings) console.log(`warning: ${item.rule} - ${item.message}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!args.textFile) throw new Error("--text-file is required");

  const text = fs.readFileSync(args.textFile, "utf8");
  const payload = {
    ...readPayload(args.payloadFile),
    text,
    artifact_id: args.artifactId || undefined,
  };
  const result = runFullGate(payload);
  writeOutput(args.output, result);

  if (args.json) console.log(JSON.stringify(result, null, 2));
  else printHuman(result);

  if (result.violations.length) process.exitCode = 1;
  else if (result.warnings.length) process.exitCode = 2;
  else process.exitCode = 0;
}

main().catch((error) => {
  console.error(`marketing-copy-lint failed: ${error.message}`);
  process.exitCode = 3;
});
