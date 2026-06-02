#!/usr/bin/env node
import path from "node:path";
import { readJsonlFile, validateAgentEventRows } from "../agent-events/agent-event-core.mjs";
import {
  buildCommandCenterReadModel,
  renderCommandCenterReadModelMarkdown,
  writeCommandCenterReadModel,
} from "./command-center-read-model-core.mjs";

function parseArgs(argv) {
  const options = {
    events: "metrics/agent-events.jsonl",
    maxRuns: 20,
    format: "markdown",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (["--events", "--out-dir", "--format", "--generated-at"].includes(item)) {
      options[item.slice(2)] = argv[index + 1];
      index += 1;
      continue;
    }
    if (item === "--file-stem") {
      options.fileStem = argv[index + 1];
      index += 1;
      continue;
    }
    if (item === "--max-runs") {
      options.maxRuns = Number(argv[index + 1]);
      index += 1;
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
  console.log(
    [
      "Usage: command-center-read-model.mjs [--events metrics/agent-events.jsonl] [--out-dir /absolute/path]",
      "",
      "Builds a read-only Command Center packet from the Company.OS agent event ledger.",
      "",
      "Options:",
      "  --format markdown|json   stdout format when --out-dir is omitted",
      "  --file-stem NAME        output filename stem when --out-dir is used",
      "  --max-runs N             maximum recent run cards to include",
      "  --generated-at ISO       deterministic timestamp for tests/reports",
    ].join("\n"),
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const items = readJsonlFile(options.events);
  const validation = validateAgentEventRows(items);
  if (!validation.valid) {
    console.error(JSON.stringify({ ok: false, errors: validation.errors }, null, 2));
    process.exitCode = 1;
    return;
  }
  const model = buildCommandCenterReadModel({
    rows: items.map((item) => item.row),
    generatedAt: options["generated-at"] || new Date().toISOString(),
    maxRuns: Number.isFinite(options.maxRuns) ? options.maxRuns : 20,
    eventLedger: options.events,
  });
  if (options["out-dir"]) {
    const outputDir = path.resolve(options["out-dir"]);
    const result = writeCommandCenterReadModel({ model, outputDir, fileStem: options.fileStem });
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
    return;
  }
  if (options.format === "json") {
    console.log(JSON.stringify(model, null, 2));
    return;
  }
  if (options.format !== "markdown") {
    throw new Error(`Unsupported format: ${options.format}`);
  }
  process.stdout.write(renderCommandCenterReadModelMarkdown(model));
}

main();
