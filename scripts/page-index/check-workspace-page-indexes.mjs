#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  readWorkspaceRegistry,
  renderWorkspaceSweepReport,
  sweepWorkspaces,
} from "./workspace-sweep-core.mjs";

function parseArgs(argv) {
  const options = {
    registry: "",
    report: "",
    json: false,
    writeIndexes: false,
    failOnWarnings: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--registry") {
      options.registry = argv[index + 1];
      index += 1;
      continue;
    }
    if (item === "--report") {
      options.report = argv[index + 1];
      index += 1;
      continue;
    }
    if (item === "--json") {
      options.json = true;
      continue;
    }
    if (item === "--write-indexes") {
      options.writeIndexes = true;
      continue;
    }
    if (item === "--fail-on-warnings") {
      options.failOnWarnings = true;
      continue;
    }
    if (item === "--help" || item === "-h") {
      options.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${item}`);
  }

  return options;
}

function printHelp() {
  console.log([
    "Usage: check-workspace-page-indexes.mjs --registry <file> [--report <file>] [--json] [--write-indexes] [--fail-on-warnings]",
    "",
    "Runs a controller-readable PageIndex hygiene sweep across registered workspaces.",
  ].join("\n"));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (!options.registry) {
    throw new Error("--registry is required");
  }

  const registryPath = path.resolve(options.registry);
  const registry = readWorkspaceRegistry(registryPath);
  const result = sweepWorkspaces(registry, { writeIndexes: options.writeIndexes });
  const report = renderWorkspaceSweepReport(result);

  if (options.report) {
    const reportPath = path.resolve(options.report);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report, "utf8");
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    process.stdout.write(report);
  }

  if (options.failOnWarnings && result.summary.needsAttention > 0) {
    process.exitCode = 1;
  }
}

main();

