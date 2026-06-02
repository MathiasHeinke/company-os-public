#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import { appendEventIfRequested } from "../runtime/lane-lock-core.mjs";
import {
  buildHumanGateReleaseEvent,
  evaluateHumanGateRelease,
  readHumanGateDecisionFile,
  renderHumanGateReleaseMarkdown,
} from "./human-gate-release-core.mjs";

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {
    command,
    decisionFile: "",
    report: "",
    jsonReport: "",
    json: false,
    appendEvent: false,
    eventLedger: path.resolve("metrics", "agent-events.jsonl"),
    workspacePath: process.cwd(),
    workspace: "registry:company-os",
    issueId: "",
    runId: "",
    sessionId: "",
    agent: "codex",
    mode: "release-gate",
    roleOwner: "CEO",
    department: "Operations",
    autonomyLevel: "L2",
    requireToday: false,
    maxAgeMinutes: 24 * 60,
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
    if (arg === "--append-event") {
      options.appendEvent = true;
      continue;
    }
    if (arg === "--require-today") {
      options.requireToday = true;
      continue;
    }
    const nextValue = () => {
      index += 1;
      if (index >= rest.length) throw new Error(`Missing value for ${arg}`);
      return rest[index];
    };
    if (arg === "--decision-file") options.decisionFile = nextValue();
    else if (arg === "--report") options.report = nextValue();
    else if (arg === "--json-report") options.jsonReport = nextValue();
    else if (arg === "--event-ledger") options.eventLedger = nextValue();
    else if (arg === "--workspace-path") options.workspacePath = nextValue();
    else if (arg === "--workspace") options.workspace = nextValue();
    else if (arg === "--issue") options.issueId = nextValue();
    else if (arg === "--run-id") options.runId = nextValue();
    else if (arg === "--session-id") options.sessionId = nextValue();
    else if (arg === "--agent") options.agent = nextValue();
    else if (arg === "--mode") options.mode = nextValue();
    else if (arg === "--role-owner") options.roleOwner = nextValue();
    else if (arg === "--department") options.department = nextValue();
    else if (arg === "--autonomy-level") options.autonomyLevel = nextValue();
    else if (arg === "--max-age-minutes") options.maxAgeMinutes = Number(nextValue());
    else throw new Error(`Unknown argument: ${arg}`);
  }

  options.workspacePath = path.resolve(options.workspacePath);
  options.eventLedger = path.resolve(options.eventLedger);
  if (options.report) options.report = path.resolve(options.report);
  if (options.jsonReport) options.jsonReport = path.resolve(options.jsonReport);
  return options;
}

function printHelp() {
  console.log(
    [
      "Usage:",
      "  human-gate-release.mjs validate --decision-file decision.json [options]",
      "",
      "Options:",
      "  --decision-file PATH       JSON or Markdown file with fenced JSON Decision Card.",
      "  --report PATH              Write Markdown validation report.",
      "  --json-report PATH         Write JSON validation report.",
      "  --append-event             Append human_gate.released event only when validation passes.",
      "  --event-ledger PATH        Default: metrics/agent-events.jsonl.",
      "  --require-today            Require Artifact Truth entries to match today's Europe/Berlin date.",
      "  --max-age-minutes N        Decision card freshness window. Default: 1440.",
      "  --issue [WORK_ITEM_ID]            Event issue id.",
      "  --run-id RUN               Event run id.",
      "  --session-id SESSION       Event session id.",
      "  --workspace-path PATH      Absolute workspace path for the event.",
      "  --json                     Print JSON.",
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
  process.stdout.write(`${result.status.toUpperCase()} ${result.level}: ${result.blocker_count} blockers\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || options.command !== "validate") {
    printHelp();
    if (!options.help) process.exitCode = 2;
    return;
  }
  if (!options.decisionFile) throw new Error("validate requires --decision-file");

  const { decision, text, path: decisionPath } = readHumanGateDecisionFile(options.decisionFile);
  const validation = evaluateHumanGateRelease(decision, {
    decisionText: text,
    decisionPath,
    requireToday: options.requireToday,
    maxAgeMinutes: options.maxAgeMinutes,
  });

  const event = options.appendEvent && validation.ok
    ? buildHumanGateReleaseEvent({
        validation,
        decision,
        runId: options.runId || path.basename(decisionPath, path.extname(decisionPath)),
        issueId: options.issueId,
        sessionId: options.sessionId,
        workspace: options.workspace,
        workspacePath: options.workspacePath,
        agent: options.agent,
        mode: options.mode,
        roleOwner: options.roleOwner,
        department: options.department,
        autonomyLevel: options.autonomyLevel,
        artifactPaths: [decisionPath, options.report, options.jsonReport].filter(Boolean),
      })
    : null;

  if (event) appendEventIfRequested(options.eventLedger, event);
  const result = { ...validation, event_appended: Boolean(event), event_id: event?.event_id || "" };
  writeFileIfRequested(options.report, renderHumanGateReleaseMarkdown(validation));
  writeFileIfRequested(options.jsonReport, `${JSON.stringify(result, null, 2)}\n`);
  printResult(result, options.json);
  if (!validation.ok) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
