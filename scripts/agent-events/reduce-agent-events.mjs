#!/usr/bin/env node
import fs from "node:fs";
import {
  filterEvents,
  readJsonlFile,
  reduceAgentEvents,
  summarizeByIssue,
  validateAgentEventRows,
} from "./agent-event-core.mjs";

function parseArgs(argv) {
  const options = { file: "metrics/agent-events.jsonl", format: "state" };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (["--file", "--issue", "--run", "--session", "--out", "--format"].includes(item)) {
      options[item.slice(2)] = argv[index + 1];
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
      "Usage: reduce-agent-events.mjs --file metrics/agent-events.jsonl [--issue COS-123] [--run RUN] [--session SESSION]",
      "",
      "Formats:",
      "  --format state       single reduced state for filtered events",
      "  --format by-issue    one reduced state per issue",
    ].join("\n"),
  );
}

function writeOutput(options, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  if (options.out) fs.writeFileSync(options.out, body);
  else process.stdout.write(body);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const items = readJsonlFile(options.file);
  const validation = validateAgentEventRows(items);
  if (!validation.valid) {
    console.error(JSON.stringify({ ok: false, file: options.file, errors: validation.errors }, null, 2));
    process.exitCode = 1;
    return;
  }

  const rows = items.map((item) => item.row);
  const filtered = filterEvents(rows, options);
  const result =
    options.format === "by-issue"
      ? { file: options.file, count: filtered.length, issues: summarizeByIssue(filtered) }
      : { file: options.file, count: filtered.length, state: reduceAgentEvents(filtered) };
  writeOutput(options, result);
}

main();
