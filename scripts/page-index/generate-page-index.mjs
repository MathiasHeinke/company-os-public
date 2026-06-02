#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  buildPageIndex,
  renderPageIndex,
} from "./page-index-core.mjs";

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    output: "docs/page-index.md",
    maxActiveContextLines: 300,
    source: "tracked",
    title: "",
    write: false,
    check: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--root") {
      options.root = argv[index + 1];
      index += 1;
      continue;
    }
    if (item === "--output") {
      options.output = argv[index + 1];
      index += 1;
      continue;
    }
    if (item === "--max-active-context-lines") {
      options.maxActiveContextLines = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (item === "--title") {
      options.title = argv[index + 1];
      index += 1;
      continue;
    }
    if (item === "--source") {
      options.source = argv[index + 1];
      index += 1;
      continue;
    }
    if (item === "--include-untracked") {
      options.source = "filesystem";
      continue;
    }
    if (item === "--write") {
      options.write = true;
      continue;
    }
    if (item === "--check") {
      options.check = true;
      continue;
    }
    if (item === "--json") {
      options.json = true;
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
  console.log([
    "Usage: generate-page-index.mjs [--root .] [--output docs/page-index.md] [--source tracked|filesystem] [--title TITLE] [--write|--check] [--json]",
    "",
    "Creates a generated Markdown map for agent boot/navigation hygiene.",
    "",
    "Sources:",
    "  --source tracked (default)          Enumerate only files tracked by git (canonical)",
    "  --source filesystem                 Enumerate the working tree (includes untracked)",
    "  --include-untracked                 Alias for --source filesystem (developer view)",
    "",
    "Options:",
    "  --root <path>                       Workspace root to scan",
    "  --output <path>                     Output file relative to root or absolute",
    "  --max-active-context-lines <n>      Soft limit for activeContext.md warnings (default 300)",
    "  --title <title>                     Optional title override. Default: Page Index",
    "  --write                             Write the generated markdown to --output",
    "  --check                             Fail if --output is missing or stale",
    "  --json                              Print machine-readable summary",
  ].join("\n"));
}

function resolveOutput(root, output) {
  return path.isAbsolute(output) ? output : path.join(root, output);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const root = path.resolve(options.root);
  const outputPath = resolveOutput(root, options.output);
  const index = buildPageIndex(root, {
    maxActiveContextLines: options.maxActiveContextLines,
    ignoreFiles: [path.relative(root, outputPath).split(path.sep).join("/")],
    source: options.source,
  });
  const markdown = renderPageIndex(index, {
    title: options.title || undefined,
  });

  if (options.check) {
    const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
    const stale = current !== markdown;
    if (options.json) {
      console.log(JSON.stringify({ ok: !stale, output: outputPath, stale, files: index.entries.length, warnings: index.warnings, source: index.source }, null, 2));
    } else if (stale) {
      console.error(`Page index is stale or missing: ${outputPath} (source=${index.source})`);
    } else {
      console.log(`Page index is current: ${outputPath} (source=${index.source})`);
    }
    process.exitCode = stale ? 1 : 0;
    return;
  }

  if (options.write) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, markdown, "utf8");
    if (options.json) {
      console.log(JSON.stringify({ ok: true, output: outputPath, files: index.entries.length, warnings: index.warnings, source: index.source }, null, 2));
    } else {
      console.log(`Wrote ${outputPath} (${index.entries.length} files, source=${index.source})`);
      for (const warning of index.warnings) console.warn(`warning: ${warning}`);
    }
    return;
  }

  if (options.json) {
    console.log(JSON.stringify({ ok: true, output: outputPath, files: index.entries.length, warnings: index.warnings, entries: index.entries, source: index.source }, null, 2));
    return;
  }

  process.stdout.write(markdown);
}

main();
