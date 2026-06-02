#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const VERSION = "atlas-506-opus-dispatch-guard/v0";

export function parseArgs(argv) {
  const args = {
    plannerFile: "",
    postHgFile: "",
    sourceGateFile: "",
    requirePostHgOk: false,
    requireSourceGateOk: false,
    planeWorkspace: "companyos",
    maxWorkers: 3,
    outputDir: "reports/atlas/super-goal/worker-dispatch",
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--planner-file") args.plannerFile = argv[++index] || "";
    else if (arg === "--post-hg-file") args.postHgFile = argv[++index] || "";
    else if (arg === "--source-gate-file") args.sourceGateFile = argv[++index] || "";
    else if (arg === "--require-post-hg-ok") args.requirePostHgOk = true;
    else if (arg === "--require-source-gate-ok") args.requireSourceGateOk = true;
    else if (arg === "--plane-workspace") args.planeWorkspace = argv[++index] || "";
    else if (arg === "--max-workers") args.maxWorkers = Number.parseInt(argv[++index] || "0", 10);
    else if (arg === "--output-dir") args.outputDir = argv[++index] || "";
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

export function validateArgs(args) {
  const errors = [];
  if (!args.plannerFile) errors.push("--planner-file is required");
  if (args.requirePostHgOk && !args.postHgFile) errors.push("--post-hg-file is required with --require-post-hg-ok");
  if (args.requireSourceGateOk && !args.sourceGateFile) errors.push("--source-gate-file is required with --require-source-gate-ok");
  if (!args.planeWorkspace) errors.push("--plane-workspace is required");
  if (!Number.isInteger(args.maxWorkers) || args.maxWorkers < 1) errors.push("--max-workers must be a positive integer");
  if (!args.outputDir) errors.push("--output-dir is required");
  return errors;
}

function usage() {
  return `Usage:
  node scripts/plane/atlas-506-opus-dispatch-guard.mjs \\
    --planner-file /tmp/atlas-506-supergoal-planner-current.json \\
    [--post-hg-file /tmp/post-hg.json --require-post-hg-ok] \\
    [--source-gate-file /tmp/source-gate.json --require-source-gate-ok] \\
    [--plane-workspace companyos] \\
    --json

Read-only guard for bounded Claude Opus dispatch. It emits commands only when
the Supergoal planner has selected runnable candidates and optional post-HG
verification is ok. It emits CAO-compatible dispatcher-v0/v1 command sequences,
not direct Claude commands. It never executes Claude, never spawns workers and
never writes Plane.`;
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function extractCandidates(planner) {
  const plan = planner?.plan || planner;
  return [
    ...(Array.isArray(plan?.selected) ? plan.selected : []),
    ...(Array.isArray(plan?.stage05_selected) ? plan.stage05_selected : []),
  ].filter((item) => item && item.ref && item.leaf !== false);
}

export function evaluateDispatchGuard({ planner, postHg = null, sourceGate = null, args }) {
  const errors = [];
  const plan = planner?.plan || planner;
  const candidates = extractCandidates(planner);
  if (!planner?.ok && !plan?.ok) errors.push("planner is not ok");
  if (plan?.status && !["READY", "RUNNABLE", "PARTIAL", "SELECTED"].includes(plan.status) && candidates.length === 0) {
    errors.push(`planner has no runnable selected candidates: ${plan.status}`);
  }
  if (args.requirePostHgOk && postHg?.ok !== true) errors.push("post-HG verification is not ok");
  if (args.requireSourceGateOk && sourceGate?.ok !== true) errors.push("source/gate preflight is not ok");

  const selected = candidates.slice(0, args.maxWorkers);
  const projectId = planner?.plane?.project_id || plan?.plane?.project_id || "";
  const commands = errors.length ? [] : selected.map((candidate) => buildOpusCommand({
    candidate,
    outputDir: args.outputDir,
    projectId,
    planeWorkspace: args.planeWorkspace,
  }));
  return {
    version: VERSION,
    ok: errors.length === 0 && commands.length > 0,
    status: errors.length ? "BLOCKED" : (commands.length ? "READY_TO_DISPATCH" : "BLOCKED_NO_RUNNABLE"),
    errors,
    planner_status: plan?.status || null,
    planner_summary: plan?.summary || null,
    post_hg_required: args.requirePostHgOk,
    post_hg_ok: postHg ? postHg.ok === true : null,
    source_gate_required: args.requireSourceGateOk,
    source_gate_ok: sourceGate ? sourceGate.ok === true : null,
    selected_count: selected.length,
    candidates: selected.map(sanitizeCandidate),
    commands,
    hard_boundaries: [
      "read_only",
      "no_command_execution",
      "no_plane_write",
      "no_plane_done",
      "no_worker_spawn_by_this_tool",
      "no_merge",
      "no_push",
      "no_pr",
      "no_deploy",
      "no_production_write",
      "no_schema_rls_auth_apply",
    ],
  };
}

function sanitizeCandidate(candidate) {
  return {
    ref: candidate.ref,
    id: candidate.id || null,
    name: candidate.name || null,
    role: candidate.role || null,
    agent: candidate.agent || null,
    mode: candidate.mode || null,
    workspace: candidate.workspace || null,
    human_gate: candidate.human_gate || null,
    model_route: candidate.model_route || null,
  };
}

function buildOpusCommand({ candidate, outputDir, projectId, planeWorkspace }) {
  const safeRef = candidate.ref.replace(/[^A-Z0-9-]/g, "_");
  const modelRoute = candidate.model_route || {};
  const maxTurns = modelRoute.effort === "max" ? 60 : 30;
  const workspace = candidate.workspace || process.cwd();
  const absoluteOutputDir = outputDir.startsWith("/")
    ? outputDir
    : `${LOCAL_WORKSPACE}}`;
  const outputPath = `${absoluteOutputDir}/${safeRef}-opus-worker-report.md`;
  const baseArgs = [
    "--workspace", planeWorkspace || "companyos",
    "--project-id", projectId || "PROJECT_ID_MISSING",
    "--work-item-id", candidate.id || "WORK_ITEM_ID_MISSING",
    "--auth", "app-token",
    "--json",
  ].map((part) => JSON.stringify(part)).join(" ");
  const v0DryRun = `node scripts/orchestration/plane-dispatcher-v0.mjs ${baseArgs} --mode "dry-run" --contract-review "require"`;
  const v0Lock = `node scripts/orchestration/plane-dispatcher-v0.mjs ${baseArgs} --mode "lock" --contract-review "require"`;
  const v1DryRun = [
    `node scripts/orchestration/runtime-dispatcher-v1.mjs ${baseArgs}`,
    `--mode "dry-run"`,
    `--runtime-command ${JSON.stringify(process.env.CLAUDE_BIN || "${LOCAL_WORKSPACE}")}`,
    `--runtime-model "opus"`,
    `--runtime-effort ${JSON.stringify(modelRoute.effort || "high")}`,
    `--permission-mode "plan"`,
    `--controller "dry-run"`,
    `--codex-controller "off"`,
  ].join(" ");
  const v1Run = [
    `node scripts/orchestration/runtime-dispatcher-v1.mjs ${baseArgs}`,
    `--mode "run"`,
    `--runtime-command ${JSON.stringify(process.env.CLAUDE_BIN || "${LOCAL_WORKSPACE}")}`,
    `--runtime-model "opus"`,
    `--runtime-effort ${JSON.stringify(modelRoute.effort || "high")}`,
    `--permission-mode "plan"`,
    `--controller "dry-run"`,
    `--codex-controller "off"`,
    `--heartbeat-ms "60000"`,
  ].join(" ");
  return {
    ref: candidate.ref,
    model_class: modelRoute.model_class || "opus-4.8-high",
    effort: modelRoute.effort || "high",
    workspace,
    output_path: outputPath,
    protocol: "dispatcher-v0-lock-then-runtime-dispatcher-v1",
    preflight_command: `cd "${LOCAL_WORKSPACE}" && ${v0DryRun} && ${v1DryRun}`,
    lock_command: `cd "${LOCAL_WORKSPACE}" && ${v0Lock}`,
    run_command: `cd "${LOCAL_WORKSPACE}" && ${v1Run}`,
    command: `cd "${LOCAL_WORKSPACE}" && ${v0Lock} && ${v1Run}`,
    max_turns: maxTurns,
    note: "Command emitted only; this guard does not execute Claude. Use preflight_command first; command uses dispatcher-v0/v1 so CAO can see worker.lock, worker.context and worker.reported.",
  };
}

export function evaluateFromFiles(args) {
  const errors = validateArgs(args);
  if (errors.length) return { version: VERSION, ok: false, status: "INVALID_ARGS", errors, commands: [] };
  return evaluateDispatchGuard({
    planner: readJson(args.plannerFile),
    postHg: args.postHgFile ? readJson(args.postHgFile) : null,
    sourceGate: args.sourceGateFile ? readJson(args.sourceGateFile) : null,
    args,
  });
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return;
  }
  let result = null;
  try {
    result = evaluateFromFiles(args);
  } catch (error) {
    result = { version: VERSION, ok: false, status: "ERROR", errors: [error.message], commands: [] };
  }
  printResult(result, args.json);
  if (!result.ok) process.exitCode = 2;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`[WORK_ITEM_ID] Opus dispatch guard: ${result.ok ? "pass" : "fail"} (${result.status})`);
  for (const error of result.errors || []) console.log(`error: ${error}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
