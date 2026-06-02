#!/usr/bin/env node
import path from "node:path";

import {
  buildAutonomyShadowRun,
  parseShadowRunContractFile,
  renderAutonomyShadowRunMarkdown,
  writeAutonomyShadowRunReport,
} from "./autonomy-shadow-run-core.mjs";

function usage() {
  console.error(
    [
      "Usage: simulate-autonomy-shadow-run.mjs --contract PATH [options]",
      "",
      "Options:",
      "  --contract PATH        Worker contract markdown path.",
      "  --workspace-root PATH  Target workspace root. Defaults to cwd.",
      "  --write-report PATH    Optional markdown report path. Default writes nothing.",
      "  --json                 Print JSON instead of markdown.",
      "  --help                 Show help.",
      "",
      "Default behavior is shadow-only and write-free: no worktree, no events,",
      "no Linear writes, no memory writes, no worker execution.",
    ].join("\n"),
  );
}

function parseArgs(argv) {
  const options = {
    contractPath: "",
    workspaceRoot: process.cwd(),
    writeReportPath: "",
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--contract") {
      options.contractPath = argv[++index];
      continue;
    }
    if (arg === "--workspace-root") {
      options.workspaceRoot = argv[++index];
      continue;
    }
    if (arg === "--write-report") {
      options.writeReportPath = argv[++index];
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.help) return options;
  if (!options.contractPath) throw new Error("--contract is required.");
  options.contractPath = path.resolve(options.contractPath);
  options.workspaceRoot = path.resolve(options.workspaceRoot);
  if (options.writeReportPath) options.writeReportPath = path.resolve(options.writeReportPath);
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const { markdown } = parseShadowRunContractFile(options.contractPath);
  const run = buildAutonomyShadowRun({
    contractMarkdown: markdown,
    contractPath: options.contractPath,
    workspaceRoot: options.workspaceRoot,
  });

  if (options.writeReportPath) {
    writeAutonomyShadowRunReport({ run, reportPath: options.writeReportPath });
    run.report_path = options.writeReportPath;
  }

  if (options.json) console.log(JSON.stringify(run, null, 2));
  else console.log(renderAutonomyShadowRunMarkdown(run));

  if (!run.would_dispatch) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
