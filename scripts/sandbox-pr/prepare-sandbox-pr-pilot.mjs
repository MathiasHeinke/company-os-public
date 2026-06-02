#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  buildSandboxEvents,
  buildSandboxWorktreeCommand,
  writeSandboxPrPacket,
} from "./sandbox-pr-core.mjs";

function usage() {
  console.error(
    [
      "Usage: prepare-sandbox-pr-pilot.mjs --contract PATH [options]",
      "",
      "Options:",
      "  --contract PATH           Worker contract markdown path.",
      "  --output-dir PATH         Output dir. Defaults to reports/sandbox-pr/YYYY-MM-DD.",
      "  --workspace-root PATH     Target workspace root for event rows. Defaults to cwd.",
      "  --event-ledger PATH       Event JSONL path. Defaults to metrics/agent-events.jsonl in cwd.",
      "  --create-worktree         Create the git sandbox worktree from IntegrationTarget.",
      "  --append-events           Append worker.locked, sandbox.created, human_gate.required events.",
      "  --json                    Print machine-readable result.",
      "  --help                    Show help.",
      "",
      "This command validates and packets an L3 sandbox PR lane. It does not create",
      "a git worktree unless --create-worktree is explicit. It never runs Claude,",
      "pushes, merges, deploys, marks Done, or writes memory.",
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
    contractPath: "",
    outputDir: "",
    workspaceRoot: process.cwd(),
    eventLedgerPath: path.join(process.cwd(), "metrics", "agent-events.jsonl"),
    appendEvents: false,
    createWorktree: false,
    json: false,
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
    if (arg === "--output-dir") {
      options.outputDir = argv[++index];
      continue;
    }
    if (arg === "--workspace-root") {
      options.workspaceRoot = argv[++index];
      continue;
    }
    if (arg === "--event-ledger") {
      options.eventLedgerPath = argv[++index];
      continue;
    }
    if (arg === "--append-events") {
      options.appendEvents = true;
      continue;
    }
    if (arg === "--create-worktree") {
      options.createWorktree = true;
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
  options.eventLedgerPath = path.resolve(options.eventLedgerPath);
  options.outputDir = path.resolve(options.outputDir || path.join(process.cwd(), "reports", "sandbox-pr", localDate()));
  return options;
}

function runWorktreeCreate({ readiness, workspaceRoot }) {
  const command = buildSandboxWorktreeCommand({ readiness, workspaceRoot });
  const result = spawnSync(command[0], command.slice(1), {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    command,
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    ok: result.status === 0,
  };
}

function appendEventsIfMissing(filePath, events) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const existingText = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const seen = new Set(
    existingText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line).event_id;
        } catch {
          return "";
        }
      })
      .filter(Boolean),
  );
  const missing = events.filter((event) => !seen.has(event.event_id));
  if (missing.length) fs.appendFileSync(filePath, `${missing.map((event) => JSON.stringify(event)).join("\n")}\n`);
  return missing.length;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const output = writeSandboxPrPacket({
    contractPath: options.contractPath,
    outputDir: options.outputDir,
    workspaceRoot: options.workspaceRoot,
  });

  let appendedEvents = 0;
  let worktree = { ok: false, command: [], stdout: "", stderr: "", status: null };
  if (options.createWorktree && output.readiness.ready) {
    worktree = runWorktreeCreate({
      readiness: output.readiness,
      workspaceRoot: options.workspaceRoot,
    });
  }
  if (options.appendEvents && !options.createWorktree) {
    throw new Error("--append-events requires --create-worktree so sandbox.created is truthful.");
  }
  if (options.appendEvents && output.readiness.ready && worktree.ok) {
    appendedEvents = appendEventsIfMissing(
      options.eventLedgerPath,
      buildSandboxEvents({
        contract: output.contract,
        readiness: output.readiness,
        packetPath: output.packetPath,
        jsonPath: output.jsonPath,
        workspaceRoot: options.workspaceRoot,
      }),
    );
  }

  const result = {
    ready: output.readiness.ready,
    errors: output.readiness.errors,
    warnings: output.readiness.warnings,
    packetPath: output.packetPath,
    jsonPath: output.jsonPath,
    branchName: output.readiness.normalized.branchName,
    worktreePath: output.readiness.normalized.worktreePath,
    eventLedgerPath: options.appendEvents ? options.eventLedgerPath : "",
    appendedEvents,
    createWorktree: options.createWorktree,
    worktreeCreated: worktree.ok,
    worktreeCommand: worktree.command,
    worktreeStatus: worktree.status,
    worktreeStdout: worktree.stdout,
    worktreeStderr: worktree.stderr,
  };

  if (options.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`${result.ready ? "READY" : "BLOCKED"}: ${result.packetPath}`);
    for (const error of result.errors) console.log(`ERROR: ${error}`);
    for (const warning of result.warnings) console.log(`WARNING: ${warning}`);
  }

  if (options.createWorktree && output.readiness.ready && !worktree.ok) process.exitCode = 3;
  if (!result.ready) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
