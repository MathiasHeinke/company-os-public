#!/usr/bin/env node
import fs from "node:fs";
import {
  readJsonlFile,
  validateAgentEventRows,
} from "./agent-event-core.mjs";

function parseArgs(argv) {
  const options = { file: "metrics/agent-events.jsonl", "allow-missing": false };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--allow-missing") {
      options["allow-missing"] = true;
      continue;
    }
    if (item === "--file") {
      options.file = argv[index + 1];
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
  console.log("Usage: validate-agent-events.mjs --file metrics/agent-events.jsonl [--allow-missing]");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (!fs.existsSync(options.file)) {
    if (options["allow-missing"]) {
      console.log(JSON.stringify({ ok: true, file: options.file, rows: 0, missing: true }, null, 2));
      return;
    }
    throw new Error(`Event file does not exist: ${options.file}`);
  }

  const items = readJsonlFile(options.file);
  const result = validateAgentEventRows(items);
  if (!result.valid) {
    console.error(JSON.stringify({ ok: false, file: options.file, rows: items.length, errors: result.errors }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({ ok: true, file: options.file, rows: items.length }, null, 2));
}

main();
