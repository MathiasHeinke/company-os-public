#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const VERSION = "atlas-506-hg-decision-intake/v0";

export const PROJECT_ID = "268df2ed-a071-4cc8-a394-595e4b7353c2";
export const ATLAS_576_PARENT_ID = "1f627f33-719c-4497-a173-4ea400df02c9";

export const PATCHABLE_ITEMS = new Set(["[WORK_ITEM_ID]", "[WORK_ITEM_ID]", "[WORK_ITEM_ID]", "[WORK_ITEM_ID]", "[WORK_ITEM_ID]"]);
export const ALREADY_PARSEABLE_ITEMS = new Set(["[WORK_ITEM_ID]", "[WORK_ITEM_ID]", "[WORK_ITEM_ID]"]);
export const DECISIONS = new Set([
  "APPROVE_DESCRIPTION_PATCH_QUEUE",
  "APPROVE_ATLAS_576_SPLIT_MATERIALIZATION",
  "APPROVE_ALREADY_PARSEABLE_REPORT_ONLY_ITEMS",
]);

export function parseArgs(argv) {
  const args = {
    decisionFile: "",
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--decision-file") args.decisionFile = argv[++index] || "";
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

export function validateArgs(args) {
  const errors = [];
  if (!args.decisionFile) errors.push("--decision-file is required");
  return errors;
}

function usage() {
  return `Usage:
  node scripts/plane/atlas-506-hg-decision-intake.mjs \\
    --decision-file decision.yaml \\
    --json

Validates a narrow Founder/Codex HumanGate decision file and emits the exact
next commands that would be allowed. This script never executes those commands,
never writes Plane and has no --apply mode.`;
}

export function parseDecisionText(text) {
  const out = {
    decisions: [],
    description_patch_items: [],
    already_parseable_items: [],
    materialize_atlas_576_split: false,
    notes: [],
  };
  let currentKey = "";
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/g, "").trimEnd();
    if (!line.trim()) continue;
    const scalar = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*?)\s*$/);
    if (scalar) {
      currentKey = scalar[1].trim();
      const value = scalar[2].trim();
      if (value) applyScalar(out, currentKey, value);
      continue;
    }
    const list = line.match(/^\s*-\s*(.+?)\s*$/);
    if (list && currentKey) applyListValue(out, currentKey, list[1].trim());
  }
  out.decisions = unique(out.decisions);
  out.description_patch_items = unique(out.description_patch_items);
  out.already_parseable_items = unique(out.already_parseable_items);
  return out;
}

function applyScalar(out, key, value) {
  const normalized = stripQuotes(value);
  if (key === "decision") out.decisions.push(normalized);
  else if (key === "materialize_atlas_576_split") out.materialize_atlas_576_split = truthy(normalized);
  else if (key === "description_patch_items") out.description_patch_items.push(...splitInlineList(normalized));
  else if (key === "already_parseable_items") out.already_parseable_items.push(...splitInlineList(normalized));
  else if (key === "notes") out.notes.push(normalized);
}

function applyListValue(out, key, value) {
  const normalized = stripQuotes(value);
  if (key === "decisions" || key === "approve") out.decisions.push(normalized);
  else if (key === "description_patch_items" || key === "patch_items") out.description_patch_items.push(normalized);
  else if (key === "already_parseable_items" || key === "report_only_items") out.already_parseable_items.push(normalized);
  else if (key === "notes") out.notes.push(normalized);
}

function stripQuotes(value) {
  return String(value || "").replace(/^['"]|['"]$/g, "").trim();
}

function splitInlineList(value) {
  return String(value || "")
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((item) => stripQuotes(item))
    .filter(Boolean);
}

function truthy(value) {
  return /^(true|yes|y|1|approved|approve)$/i.test(String(value || "").trim());
}

function unique(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

export function validateDecision(decision) {
  const errors = [];
  const warnings = [];
  for (const value of [...decision.decisions, ...decision.description_patch_items, ...decision.already_parseable_items]) {
    if (/^(all|everything|\*)$/i.test(value)) errors.push(`broad selector is forbidden: ${value}`);
  }
  for (const item of decision.description_patch_items) {
    if (!PATCHABLE_ITEMS.has(item)) errors.push(`unknown or non-patchable description item: ${item}`);
  }
  for (const item of decision.already_parseable_items) {
    if (!ALREADY_PARSEABLE_ITEMS.has(item)) errors.push(`unknown or non-founder-gated report-only item: ${item}`);
  }
  for (const decisionCode of decision.decisions) {
    if (!DECISIONS.has(decisionCode)) errors.push(`unknown decision: ${decisionCode}`);
  }
  if (decision.description_patch_items.length && !decision.decisions.includes("APPROVE_DESCRIPTION_PATCH_QUEUE")) {
    errors.push("description_patch_items require APPROVE_DESCRIPTION_PATCH_QUEUE");
  }
  if (decision.already_parseable_items.length && !decision.decisions.includes("APPROVE_ALREADY_PARSEABLE_REPORT_ONLY_ITEMS")) {
    errors.push("already_parseable_items require APPROVE_ALREADY_PARSEABLE_REPORT_ONLY_ITEMS");
  }
  if (decision.materialize_atlas_576_split && !decision.decisions.includes("APPROVE_ATLAS_576_SPLIT_MATERIALIZATION")) {
    errors.push("materialize_atlas_576_split requires APPROVE_ATLAS_576_SPLIT_MATERIALIZATION");
  }
  if (decision.decisions.includes("APPROVE_DESCRIPTION_PATCH_QUEUE") && !decision.description_patch_items.length) {
    errors.push("APPROVE_DESCRIPTION_PATCH_QUEUE requires at least one description_patch_items entry");
  }
  if (decision.decisions.includes("APPROVE_ALREADY_PARSEABLE_REPORT_ONLY_ITEMS") && !decision.already_parseable_items.length) {
    errors.push("APPROVE_ALREADY_PARSEABLE_REPORT_ONLY_ITEMS requires at least one already_parseable_items entry");
  }
  if (decision.decisions.includes("APPROVE_ATLAS_576_SPLIT_MATERIALIZATION") && !decision.materialize_atlas_576_split) {
    errors.push("APPROVE_ATLAS_576_SPLIT_MATERIALIZATION requires materialize_atlas_576_split: true");
  }
  if (!decision.decisions.length) warnings.push("no decisions supplied");
  return { ok: errors.length === 0, errors, warnings };
}

export function buildAllowedCommands(decision) {
  const commands = [];
  if (decision.description_patch_items.length) {
    const refs = decision.description_patch_items.flatMap((item) => ["--ref", item]).join(" ");
    commands.push({
      decision: "APPROVE_DESCRIPTION_PATCH_QUEUE",
      kind: "description-patch-apply",
      command: `node scripts/plane/atlas-description-patch-queue.mjs --project-id ${PROJECT_ID} --queue-file reports/atlas/super-goal/controller/[WORK_ITEM_ID]-patch-queue-2026-06-01.json ${refs} --apply --confirm-human-gate --json`,
    });
    for (const item of decision.description_patch_items) {
      commands.push(stagePostCommand(item));
    }
  }
  if (decision.materialize_atlas_576_split) {
    commands.push({
      decision: "APPROVE_ATLAS_576_SPLIT_MATERIALIZATION",
      kind: "split-materialization-plan-check",
      command: `node scripts/plane/atlas-576-split-materialization-plan.mjs --project-id ${PROJECT_ID} --parent-id ${ATLAS_576_PARENT_ID} --json`,
      note: "Create children from JSON payloads only after this plan check; this intake does not create Plane items.",
    });
  }
  for (const item of decision.already_parseable_items) commands.push(stagePostCommand(item));
  return commands;
}

function stagePostCommand(sequence) {
  return {
    decision: "STAGE_0506_POST",
    kind: "stage-post",
    sequence,
    command: `node scripts/orchestration/scheduler-stage-0506.mjs --workspace companyos --project-id ${PROJECT_ID} --sequence ${sequence} --mode post --auth app-token --json`,
  };
}

export function evaluateDecisionText(text) {
  const decision = parseDecisionText(text);
  const validation = validateDecision(decision);
  return {
    version: VERSION,
    ok: validation.ok,
    decision,
    errors: validation.errors,
    warnings: validation.warnings,
    allowed_commands: validation.ok ? buildAllowedCommands(decision) : [],
    hard_boundaries: [
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
    ],
  };
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return;
  }
  const errors = validateArgs(args);
  if (errors.length) {
    const result = { version: VERSION, ok: false, errors, allowed_commands: [] };
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }
  const result = evaluateDecisionText(readFileSync(args.decisionFile, "utf8"));
  printResult(result, args.json);
  if (!result.ok) process.exitCode = 2;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`[WORK_ITEM_ID] HG decision intake: ${result.ok ? "pass" : "fail"}`);
  console.log(`allowed_commands: ${result.allowed_commands?.length || 0}`);
  for (const error of result.errors || []) console.log(`error: ${error}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
