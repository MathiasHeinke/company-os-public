#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  evaluatePreflight,
  readJson,
} from "./atlas-506-supergoal-readiness-preflight.mjs";
import { evaluateDecisionText } from "./atlas-506-hg-decision-intake.mjs";

export const VERSION = "atlas-506-approved-action-plan/v0";

export function parseArgs(argv) {
  const args = {
    decisionFile: "",
    queueFile: "reports/atlas/super-goal/controller/[WORK_ITEM_ID]-patch-queue-2026-06-01.json",
    gateRegisterFile: "reports/atlas/super-goal/controller/[WORK_ITEM_ID]-gate-register-2026-06-01.json",
    splitPlanFile: "reports/atlas/super-goal/controller/[WORK_ITEM_ID]-materialization-plan-2026-06-01.json",
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--decision-file") args.decisionFile = argv[++index] || "";
    else if (arg === "--queue-file") args.queueFile = argv[++index] || "";
    else if (arg === "--gate-register-file") args.gateRegisterFile = argv[++index] || "";
    else if (arg === "--split-plan-file") args.splitPlanFile = argv[++index] || "";
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

export function validateArgs(args) {
  const errors = [];
  if (!args.decisionFile) errors.push("--decision-file is required");
  if (!args.queueFile) errors.push("--queue-file is required");
  if (!args.gateRegisterFile) errors.push("--gate-register-file is required");
  if (!args.splitPlanFile) errors.push("--split-plan-file is required");
  return errors;
}

function usage() {
  return `Usage:
  node scripts/plane/atlas-506-approved-action-plan.mjs \\
    --decision-file decision.yaml \\
    --json

Combines the local [WORK_ITEM_ID] readiness preflight with a narrow HumanGate
decision file and emits an ordered runbook. This script never executes commands,
never writes Plane, never creates children and has no --apply mode.`;
}

export function buildApprovedActionPlan({ preflight, decision }) {
  const errors = [];
  if (!preflight?.ok) {
    errors.push(...formatPreflightErrors(preflight));
  }
  if (!decision?.ok) {
    errors.push(...formatDecisionErrors(decision));
  }

  const ok = errors.length === 0;
  return {
    version: VERSION,
    ok,
    preflight_ok: Boolean(preflight?.ok),
    decision_ok: Boolean(decision?.ok),
    errors,
    warnings: [...(preflight?.warnings || []), ...(decision?.warnings || [])],
    runbook: ok ? buildRunbook(decision.allowed_commands || []) : [],
    hard_boundaries: [
      "local_read_only",
      "no_command_execution",
      "no_plane_write",
      "no_plane_done",
      "no_worker_spawn",
      "no_merge",
      "no_push",
      "no_pr",
      "no_deploy",
      "no_production_write",
      "no_schema_rls_auth_apply",
      "no_child_creation_by_this_tool",
    ],
  };
}

function formatPreflightErrors(preflight) {
  if (!preflight) return ["preflight missing"];
  const failed = preflight.failed || [];
  const explicit = failed.map((row) => `preflight failed: ${row.id}`);
  return explicit.length ? explicit : (preflight.errors || ["preflight failed"]);
}

function formatDecisionErrors(decision) {
  if (!decision) return ["decision intake missing"];
  return (decision.errors || ["decision intake failed"]).map((error) => `decision failed: ${error}`);
}

function buildRunbook(commands) {
  const runbook = [
    {
      step: 1,
      kind: "readiness-preflight",
      command: "node scripts/plane/atlas-506-supergoal-readiness-preflight.mjs --json",
      note: "Re-run immediately before any approved action to catch local artifact drift.",
    },
  ];
  let step = 2;
  for (const command of commands) {
    runbook.push({
      step,
      kind: command.kind,
      decision: command.decision,
      sequence: command.sequence,
      command: command.command,
      note: command.note || noteForKind(command.kind),
    });
    step += 1;
  }
  if (commands.some((command) => command.kind === "split-materialization-plan-check")) {
    runbook.push({
      step,
      kind: "split-materialization-authority-boundary",
      command: "node scripts/plane/atlas-576-split-materialization-apply.mjs --apply --confirm-human-gate --json",
      note: "Separate create-only command for the [WORK_ITEM_ID] split children. This action-plan tool does not execute it.",
    });
    step += 1;
  }
  const postHgVerification = buildPostHgVerificationStep(commands, step);
  if (postHgVerification) {
    runbook.push(postHgVerification);
  }
  return runbook;
}

function buildPostHgVerificationStep(commands, step) {
  const refs = commands
    .filter((command) => command.kind === "description-patch-apply")
    .flatMap((command) => [...String(command.command || "").matchAll(/--ref\s+(ATLAS-\d+)/g)].map((match) => match[1]));
  const hasSplit = commands.some((command) => command.kind === "split-materialization-plan-check");
  if (!refs.length && !hasSplit) return null;
  const refArgs = refs.map((ref) => `--ref ${ref}`).join(" ");
  const splitArg = hasSplit ? "--verify-split-children" : "";
  return {
    step,
    kind: "post-hg-verification",
    decision: "POST_HG_VERIFY",
    command: `node scripts/plane/atlas-506-post-hg-verification.mjs ${[refArgs, splitArg].filter(Boolean).join(" ")} --json`,
    note: "Read-only verification that approved patches/split children landed before Stage-0.5/0.6 continues.",
  };
}

function noteForKind(kind) {
  if (kind === "description-patch-apply") return "Applies only approved description_html patches for explicit --ref items after HumanGate confirmation.";
  if (kind === "stage-post") return "Posts scheduler-visible Stage-0.5/0.6 markers only; does not mark Plane Done.";
  return "Allowed command emitted by HG decision intake.";
}

export function evaluateActionPlanFromFiles(args) {
  const preflight = evaluatePreflight({
    queue: readJson(args.queueFile),
    gateRegister: readJson(args.gateRegisterFile),
    splitPlan: readJson(args.splitPlanFile),
  });
  const decision = evaluateDecisionText(readFileSync(args.decisionFile, "utf8"));
  return buildApprovedActionPlan({ preflight, decision });
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return;
  }
  const errors = validateArgs(args);
  if (errors.length) {
    printResult({ version: VERSION, ok: false, errors, runbook: [] }, args.json);
    process.exitCode = 2;
    return;
  }
  let result = null;
  try {
    result = evaluateActionPlanFromFiles(args);
  } catch (error) {
    result = { version: VERSION, ok: false, errors: [error.message], runbook: [] };
  }
  printResult(result, args.json);
  if (!result.ok) process.exitCode = 2;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`[WORK_ITEM_ID] approved action plan: ${result.ok ? "pass" : "fail"}`);
  console.log(`runbook_steps: ${result.runbook?.length || 0}`);
  for (const error of result.errors || []) console.log(`error: ${error}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
