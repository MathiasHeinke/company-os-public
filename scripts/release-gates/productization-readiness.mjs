#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  evaluateProductizationReadiness,
  renderProductizationReadinessMarkdown,
} from "./productization-readiness-core.mjs";

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {
    command,
    root: process.cwd(),
    report: "",
    jsonReport: "",
    json: false,
    publicRelease: false,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--public-release") {
      options.publicRelease = true;
      continue;
    }
    const nextValue = () => {
      index += 1;
      if (index >= rest.length) throw new Error(`Missing value for ${arg}`);
      return rest[index];
    };
    if (arg === "--root") options.root = nextValue();
    else if (arg === "--report") options.report = nextValue();
    else if (arg === "--json-report") options.jsonReport = nextValue();
    else throw new Error(`Unknown argument: ${arg}`);
  }

  options.root = path.resolve(options.root);
  if (options.report) options.report = path.resolve(options.report);
  if (options.jsonReport) options.jsonReport = path.resolve(options.jsonReport);
  return options;
}

function printHelp() {
  console.log(
    [
      "Usage:",
      "  productization-readiness.mjs check [options]",
      "",
      "Options:",
      "  --root PATH            Company.OS repo root. Default: cwd.",
      "  --report PATH          Write Markdown report.",
      "  --json-report PATH     Write JSON report.",
      "  --public-release       Treat tracked reports/metrics as blockers.",
      "  --json                 Print JSON.",
    ].join("\n"),
  );
}

function writeFileIfRequested(filePath, content) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function printResult(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(
    `${result.status.toUpperCase()}: ${result.blocker_count} blockers, ${result.warning_count} warnings\n`,
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || options.command !== "check") {
    printHelp();
    if (!options.help) process.exitCode = 2;
    return;
  }

  const result = evaluateProductizationReadiness({
    root: options.root,
    publicRelease: options.publicRelease,
  });
  writeFileIfRequested(options.report, renderProductizationReadinessMarkdown(result));
  writeFileIfRequested(options.jsonReport, `${JSON.stringify(result, null, 2)}\n`);
  printResult(result, options.json);
  if (!result.ok) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
