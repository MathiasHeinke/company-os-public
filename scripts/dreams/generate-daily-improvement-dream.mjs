#!/usr/bin/env node
import path from "node:path";

import { writeDailyImprovementDream } from "./daily-improvement-dream-core.mjs";

function usage() {
  console.error(
    [
      "Usage: generate-daily-improvement-dream.mjs [options]",
      "",
      "Options:",
      "  --date YYYY-MM-DD              Date to analyze. Defaults to local today.",
      "  --workspace-root PATH          Company.OS workspace root. Defaults to cwd.",
      "  --issue ISSUE                  Issue/control id. Defaults to [WORK_ITEM_ID].",
      "  --write                        Write report and JSON outputs.",
      "  --update-morning-brief         Insert/update the dream section in morning-ceo-brief.md.",
      "  --append-events                Append memory.dream_requested and memory.proposal_created events.",
      "  --event-ledger PATH            Event JSONL path. Defaults to metrics/agent-events.jsonl.",
      "  --json                         Print machine-readable result.",
      "  --help                         Show this help.",
      "",
      "Without --write, the command prints the planned output paths and exits without writes.",
    ].join("\n"),
  );
}

function localDate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const options = {
    date: localDate(),
    workspaceRoot: process.cwd(),
    issueId: "[WORK_ITEM_ID]",
    write: false,
    updateMorningBrief: false,
    appendEvents: false,
    json: false,
    eventLedgerPath: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--date") {
      options.date = argv[++index];
      continue;
    }
    if (arg === "--workspace-root") {
      options.workspaceRoot = argv[++index];
      continue;
    }
    if (arg === "--issue") {
      options.issueId = argv[++index];
      continue;
    }
    if (arg === "--event-ledger") {
      options.eventLedgerPath = argv[++index];
      continue;
    }
    if (arg === "--write") {
      options.write = true;
      continue;
    }
    if (arg === "--update-morning-brief") {
      options.updateMorningBrief = true;
      continue;
    }
    if (arg === "--append-events") {
      options.appendEvents = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    throw new Error(`--date must be YYYY-MM-DD, got: ${options.date}`);
  }

  options.workspaceRoot = path.resolve(options.workspaceRoot);
  if (options.eventLedgerPath) options.eventLedgerPath = path.resolve(options.eventLedgerPath);
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  if (!options.write) {
    const reportPath = path.join(
      options.workspaceRoot,
      "reports",
      "dreams",
      options.date,
      "daily-improvement-dream.md",
    );
    const jsonPath = path.join(
      options.workspaceRoot,
      "reports",
      "dreams",
      options.date,
      "daily-improvement-dream.json",
    );
    const result = {
      write: false,
      date: options.date,
      reportPath,
      jsonPath,
      morningBriefPath: options.updateMorningBrief
        ? path.join(options.workspaceRoot, "reports", "night-shift", options.date, "morning-ceo-brief.md")
        : "",
      eventLedgerPath: options.appendEvents
        ? options.eventLedgerPath || path.join(options.workspaceRoot, "metrics", "agent-events.jsonl")
        : "",
    };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(`Dry run: ${reportPath}`);
    return;
  }

  const output = writeDailyImprovementDream({
    workspaceRoot: options.workspaceRoot,
    date: options.date,
    issueId: options.issueId,
    updateMorningBrief: options.updateMorningBrief,
    appendEvents: options.appendEvents,
    eventLedgerPath: options.eventLedgerPath || undefined,
  });

  const result = {
    write: true,
    date: options.date,
    reportPath: output.reportPath,
    jsonPath: output.jsonPath,
    morningBriefPath: output.morningBriefPath,
    eventLedgerPath: output.eventLedgerPath,
    appendedEvents: output.appendedEvents,
    findingCount: output.dream.finding_count,
    proposalCount: output.dream.proposal_count,
  };

  if (options.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`Daily Improvement Dream written: ${output.reportPath}`);
    if (output.morningBriefPath) console.log(`Morning brief updated: ${output.morningBriefPath}`);
    if (options.appendEvents) console.log(`Events appended: ${output.appendedEvents}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
