#!/usr/bin/env node

import {
  buildVideoFirstContentEngineStartPlan,
  writeVideoFirstContentEngineStartPlan,
} from "./video-first-content-engine-start-core.mjs";

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    company: "Example Company",
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
  node scripts/content/video-first-content-engine-start.mjs \\
    --root <target-root> \\
    --company "Company Name" \\
    --approval-owner "Founder" \\
    [--date YYYY-MM-DD] [--write] [--force] [--json]

Creates the content/video-engine folder structure. Without --write it prints a
dry-run plan. The command never uploads, posts, schedules, sends or processes
videos.`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const plan = buildVideoFirstContentEngineStartPlan(args);
  const result = args.write ? writeVideoFirstContentEngineStartPlan(plan, { force: args.force }) : { dry_run: true, ...plan };
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(args.write ? "video-first-content-engine-start: wrote folder structure" : "video-first-content-engine-start: dry run");
  console.log(`root: ${result.root}`);
  console.log(`engine_root: ${result.engine_root}`);
  console.log(`inbox: ${result.root}/content/video-engine/01_inbox_raw`);
}

main().catch((error) => {
  console.error(`video-first-content-engine-start failed: ${error.message}`);
  process.exitCode = 1;
});
