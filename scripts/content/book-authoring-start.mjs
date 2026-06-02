#!/usr/bin/env node

import {
  buildBookAuthoringStartPlan,
  writeBookAuthoringStartPlan,
} from "./book-authoring-start-core.mjs";

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    company: "Example Company",
    projectSlug: "founder-book",
    workingTitle: "Working Title",
    approvalOwner: "Founder",
    date: new Date().toISOString().slice(0, 10),
    write: false,
    force: false,
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") args.root = argv[++index];
    else if (arg === "--company") args.company = argv[++index];
    else if (arg === "--project-slug") args.projectSlug = argv[++index];
    else if (arg === "--working-title") args.workingTitle = argv[++index];
    else if (arg === "--approval-owner") args.approvalOwner = argv[++index];
    else if (arg === "--date") args.date = argv[++index];
    else if (arg === "--write") args.write = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  node scripts/content/book-authoring-start.mjs \\
    --root <target-root> \\
    --company "Company Name" \\
    --project-slug "book-slug" \\
    --working-title "Working Title" \\
    --approval-owner "Founder" \\
    [--date YYYY-MM-DD] [--write] [--force] [--json]

Creates the content/book-authoring/<book-slug> folder structure. Without
--write it prints a dry-run plan. The command never publishes, submits, sends,
schedules, spends, calls a model or reads private source folders.`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const plan = buildBookAuthoringStartPlan(args);
  const result = args.write ? writeBookAuthoringStartPlan(plan, { force: args.force }) : { dry_run: true, ...plan };
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(args.write ? "book-authoring-start: wrote folder structure" : "book-authoring-start: dry run");
  console.log(`root: ${result.root}`);
  console.log(`project_root: ${result.project_root}`);
  console.log(`book_spec: ${result.project_root}/00_book_spec/BOOK_SPEC.md`);
}

main().catch((error) => {
  console.error(`book-authoring-start failed: ${error.message}`);
  process.exitCode = 1;
});
