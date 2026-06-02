#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  buildMainMirrorCommands,
  readGitHygieneRegistry,
  runGitHygieneController,
} from "./git-hygiene-core.mjs";

function runGit(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim(),
    args,
  };
}

function parseArgs(argv) {
  const options = {
    registry: "",
    write: false,
    json: false,
    only: new Set(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--write") {
      options.write = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    const nextValue = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };
    if (arg === "--registry") options.registry = nextValue();
    else if (arg === "--only") options.only.add(nextValue());
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(
    [
      "Usage:",
      "  sync-main.mjs --registry <file> [--only <workspace>] [--write] [--json]",
      "",
      "Safely mirrors clean root checkouts back to their configured integration branch.",
      "Dry-run by default. Mutates only with --write.",
      "",
      "A workspace is skipped unless:",
      "- root worktree is clean",
      "- stash list is empty",
      "- current branch equals integration_branch (default: main)",
      "- upstream is configured",
      "- the hygiene controller has no blockers for that workspace",
      "",
      "Write mode runs:",
      "  git fetch <upstream-remote> --prune",
      "  git switch --detach <upstream>",
      "  git branch -f <branch> <upstream>",
      "  git switch <branch>",
    ].join("\n"),
  );
}

function planWorkspaceSync(workspace, inspected) {
  const branch = workspace.integrationBranch || "main";
  const result = {
    name: workspace.name,
    root: path.resolve(workspace.root),
    branch: inspected?.branch || "",
    upstream: inspected?.upstream || "",
    ahead: inspected?.ahead ?? 0,
    behind: inspected?.behind ?? 0,
    action: "skip",
    reason: "",
    commands: [],
  };

  if (!inspected) {
    result.reason = "workspace was not inspected";
    return result;
  }
  if (inspected.dirty) result.reason = "dirty worktree";
  else if ((inspected.stashCount ?? 0) > 0) result.reason = `stash list contains ${inspected.stashCount} entry(s)`;
  else if (inspected.blockers?.length) result.reason = `blocked by hygiene controller: ${inspected.blockers.join("; ")}`;
  else if (inspected.branch !== branch) result.reason = `current branch '${inspected.branch}' is not integration branch '${branch}'`;
  else if (!inspected.upstream) result.reason = "no upstream configured";
  else if (inspected.ahead === 0 && inspected.behind === 0) {
    result.action = "noop";
    result.reason = "already aligned";
  } else {
    result.action = "sync";
    result.reason = `mirror ${branch} to ${inspected.upstream}`;
    result.commands = buildMainMirrorCommands({ branch, upstream: inspected.upstream });
  }

  return result;
}

function commandString(args) {
  return `git ${args.map((item) => (/\s/.test(item) ? JSON.stringify(item) : item)).join(" ")}`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (!options.registry) throw new Error("--registry is required");

  const registry = readGitHygieneRegistry(path.resolve(options.registry));
  const selected = options.only.size
    ? registry.workspaces.filter((workspace) => options.only.has(workspace.name))
    : registry.workspaces;
  const audit = runGitHygieneController({ ...registry, workspaces: selected }, { closeSession: false });
  const plans = selected.map((workspace) => planWorkspaceSync(
    workspace,
    audit.workspaces.find((item) => item.name === workspace.name),
  ));

  const executed = [];
  if (options.write) {
    let failed = false;
    for (const plan of plans.filter((item) => item.action === "sync")) {
      if (failed) break;
      for (const args of plan.commands) {
        const result = runGit(plan.root, args);
        executed.push({ workspace: plan.name, command: commandString(args), ok: result.ok, stderr: result.stderr });
        if (!result.ok) {
          process.exitCode = 2;
          failed = true;
          break;
        }
      }
    }
  }

  const output = {
    write: options.write,
    generatedAt: new Date().toISOString(),
    plans,
    executed,
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    return;
  }

  for (const plan of plans) {
    console.log(`${plan.name}: ${plan.action} - ${plan.reason}`);
    for (const command of plan.commands) console.log(`  ${commandString(command)}`);
  }
  if (executed.length) {
    console.log("");
    console.log("Executed:");
    for (const event of executed) console.log(`- ${event.workspace}: ${event.ok ? "ok" : "failed"} ${event.command}${event.stderr ? ` (${event.stderr})` : ""}`);
  }
}

main();
