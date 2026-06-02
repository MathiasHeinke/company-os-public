#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { buildVisionReleasePacket, derivePerRunOutputPath } from "./marketing-hg25-vision-core.mjs";

function parseArgs(argv) {
  const args = {
    workspaceRoot: "${LOCAL_WORKSPACE}",
    schedulePaths: [],
    output: "",
    runId: "",
    perRunOutput: true,
    allowCanonicalOverwrite: false,
    maxJobs: 40,
    includePast: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--workspace-root") args.workspaceRoot = argv[++i] || "";
    else if (arg === "--schedule") args.schedulePaths.push(argv[++i] || "");
    else if (arg === "--output") args.output = argv[++i] || "";
    else if (arg === "--run-id") args.runId = argv[++i] || "";
    else if (arg === "--per-run-output") args.perRunOutput = true;
    else if (arg === "--allow-canonical-overwrite") {
      args.perRunOutput = false;
      args.allowCanonicalOverwrite = true;
    }
    else if (arg === "--max-jobs") args.maxJobs = Number(argv[++i] || 40);
    else if (arg === "--include-past") args.includePast = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  node scripts/release-gates/marketing-hg25-vision.mjs \\
    --workspace-root ${LOCAL_WORKSPACE} \\
    --schedule /absolute/path/to/scheduled-jobs.json \\
    --output /absolute/path/to/vision-release-packet.md \\
    [--run-id <id>] [--max-jobs 40] [--include-past] [--json]
    [--per-run-output] [--allow-canonical-overwrite]

Builds a local HG-2.5 visual release packet for scheduled marketing jobs.
It reads Upload-Post schedule artifacts and media files, writes a Markdown
packet with local image references, and performs no network, publish, cancel,
schedule, Plane Done, git or production action.

Per-run output is the default. The writer derives a per-run filename from
--output using the run-id and generated_at timestamp. The canonical base path
(e.g. vision-release-packet.md) is never overwritten unless the operator passes
--allow-canonical-overwrite explicitly; each normal run lands at
vision-release-packet.<stamp>.md so prior packets remain.
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!args.workspaceRoot) throw new Error("--workspace-root is required");
  if (!args.schedulePaths.length) throw new Error("--schedule is required at least once");

  const packet = buildVisionReleasePacket({
    workspaceRoot: args.workspaceRoot,
    schedulePaths: args.schedulePaths,
    maxJobs: args.maxJobs,
    includePast: args.includePast,
  });

  let resolvedOutput = args.output;
  if (args.output && args.perRunOutput) {
    resolvedOutput = derivePerRunOutputPath(args.output, {
      runId: args.runId,
      generatedAt: packet.summary.generated_at,
    });
  }
  if (resolvedOutput) {
    fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
    fs.writeFileSync(resolvedOutput, packet.markdown);
  }

  if (args.json) {
    console.log(JSON.stringify({
      ok: packet.ok,
      output: resolvedOutput || null,
      canonical_output: args.output || null,
      per_run_output: args.perRunOutput,
      summary: packet.summary,
      no_external_actions: true,
    }, null, 2));
  } else {
    console.log(`marketing-hg25-vision: ${packet.ok ? "packet-ready" : "blocked"}`);
    if (resolvedOutput) console.log(`output: ${resolvedOutput}`);
    console.log(`jobs: ${packet.summary.jobs_total}, visual: ${packet.summary.jobs_requiring_visual_review}`);
    for (const blocker of packet.summary.blockers) console.log(`blocker: ${blocker}`);
    if (packet.summary.media_reuse?.length) console.log(`media_reuse_topics: ${packet.summary.media_reuse.length}`);
  }

  process.exitCode = packet.ok ? 0 : 2;
}

main().catch((error) => {
  console.error(`marketing-hg25-vision failed: ${error.message}`);
  process.exitCode = 1;
});
