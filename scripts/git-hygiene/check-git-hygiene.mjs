#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  readGitHygieneRegistry,
  renderGitHygieneMarkdown,
  runGitHygieneController,
} from "./git-hygiene-core.mjs";

function localParts(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hhmm: `${parts.hour}${parts.minute}` };
}

function parseArgs(argv) {
  const options = {
    registry: "",
    sandboxRoots: [],
    report: "",
    jsonOutput: "",
    json: false,
    closeSession: false,
    failOnBlockers: false,
    failOnWarnings: false,
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
    if (arg === "--close-session") {
      options.closeSession = true;
      options.failOnBlockers = true;
      continue;
    }
    if (arg === "--fail-on-blockers") {
      options.failOnBlockers = true;
      continue;
    }
    if (arg === "--fail-on-warnings") {
      options.failOnWarnings = true;
      continue;
    }
    const nextValue = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };
    if (arg === "--registry") options.registry = nextValue();
    else if (arg === "--sandbox-root") options.sandboxRoots.push(nextValue());
    else if (arg === "--report") options.report = nextValue();
    else if (arg === "--json-output") options.jsonOutput = nextValue();
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(
    [
      "Usage:",
      "  check-git-hygiene.mjs --registry <file> [--sandbox-root <path>] [--report <file>] [--json-output <file>]",
      "",
      "Runs a read-only Git/worktree hygiene controller pass across registered workspaces.",
      "",
      "Options:",
      "  --registry PATH          Workspace registry JSON. Required.",
      "  --sandbox-root PATH      Optional sandbox root. Repeatable.",
      "  --report PATH            Markdown report path.",
      "  --json-output PATH       JSON report path.",
      "  --json                   Print JSON instead of Markdown.",
      "  --close-session          Promote stashes, ahead/behind, missing upstreams and unexpected branches to blockers.",
      "  --fail-on-blockers       Exit 2 when dirty roots, dirty sandboxes or excess worktrees exist.",
      "  --fail-on-warnings       Exit 1 on warnings when no blockers exist.",
    ].join("\n"),
  );
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function defaultReportPaths() {
  const parts = localParts();
  const root = path.join(process.cwd(), "reports", "git-hygiene", parts.date);
  return {
    report: path.join(root, `${parts.hhmm}-git-hygiene.md`),
    jsonOutput: path.join(root, `${parts.hhmm}-git-hygiene.json`),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (!options.registry) throw new Error("--registry is required");

  const defaults = defaultReportPaths();
  if (!options.report) options.report = defaults.report;
  if (!options.jsonOutput) options.jsonOutput = defaults.jsonOutput;

  const registry = readGitHygieneRegistry(path.resolve(options.registry));
  const result = runGitHygieneController(registry, {
    sandboxRoots: options.sandboxRoots.map((item) => path.resolve(item)),
    closeSession: options.closeSession,
  });
  const markdown = renderGitHygieneMarkdown(result);

  writeFile(path.resolve(options.report), markdown);
  writeFile(path.resolve(options.jsonOutput), `${JSON.stringify(result, null, 2)}\n`);

  if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(markdown);

  if (options.failOnBlockers && result.summary.blockerCount > 0) process.exitCode = 2;
  else if (options.failOnWarnings && result.summary.warningCount > 0) process.exitCode = 1;
}

main();
