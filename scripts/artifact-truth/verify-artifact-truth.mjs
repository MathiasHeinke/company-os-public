#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  parseStageList,
  renderArtifactTruthMarkdown,
  verifyAresMarketingArtifacts,
} from "./artifact-truth-core.mjs";

function parseArgs(argv) {
  const options = {
    workspaceRoot: "[LOCAL_WORKSPACE]",
    pipeline: "editorial",
    date: "latest",
    stages: "manifest,source,final,images,eval,scheduler,provenance,freshness",
    schedulerMode: "any",
    requireToday: false,
    maxArtifactAgeHours: null,
    output: "",
    jsonOutput: "",
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--require-today") {
      options.requireToday = true;
      continue;
    }
    const nextValue = () => argv[++index];
    if (arg === "--workspace-root") options.workspaceRoot = nextValue();
    else if (arg === "--pipeline") options.pipeline = nextValue();
    else if (arg === "--date") options.date = nextValue();
    else if (arg === "--stages") options.stages = nextValue();
    else if (arg === "--scheduler-mode") options.schedulerMode = nextValue();
    else if (arg === "--max-artifact-age-hours") options.maxArtifactAgeHours = Number(nextValue());
    else if (arg === "--output") options.output = nextValue();
    else if (arg === "--json-output") options.jsonOutput = nextValue();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log(
    [
      "Usage: verify-artifact-truth.mjs [options]",
      "",
      "Options:",
      "  --workspace-root PATH      ARES website root. Default: [LOCAL_WORKSPACE]",
      "  --pipeline editorial|product",
      "  --date YYYY-MM-DD|latest",
      "  --stages csv               manifest,source,final,images,eval,scheduler,provenance,freshness",
      "  --scheduler-mode any|scheduled|dry-run",
      "  --require-today            Block when resolved artifact date is not today's Europe/Berlin date.",
      "  --max-artifact-age-hours N Block when manifest mtime is older than N hours.",
      "  --output PATH              Write markdown report.",
      "  --json-output PATH         Write JSON report.",
      "  --json                     Print JSON to stdout.",
    ].join("\n"),
  );
}

function writeFileIfRequested(filePath, content) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(path.resolve(filePath), content);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const report = verifyAresMarketingArtifacts({
    workspaceRoot: options.workspaceRoot,
    pipeline: options.pipeline,
    date: options.date,
    stages: parseStageList(options.stages),
    schedulerMode: options.schedulerMode,
    requireToday: options.requireToday,
    maxArtifactAgeHours: options.maxArtifactAgeHours,
  });

  const markdown = renderArtifactTruthMarkdown(report);
  writeFileIfRequested(options.output, markdown);
  writeFileIfRequested(options.jsonOutput, `${JSON.stringify(report, null, 2)}\n`);

  if (options.json) console.log(JSON.stringify(report, null, 2));
  else console.log(`${report.ok ? "PASS" : "BLOCKED"} ${report.pipeline} ${report.date}: ${report.blocker_count} blockers, ${report.warning_count} warnings`);

  if (!report.ok) process.exitCode = 2;
}

main();
