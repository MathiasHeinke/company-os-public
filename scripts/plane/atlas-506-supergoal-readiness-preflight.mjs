#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const VERSION = "atlas-506-supergoal-readiness-preflight/v0";

export const EXPECTED = Object.freeze({
  projectId: "268df2ed-a071-4cc8-a394-595e4b7353c2",
  parentRef: "[WORK_ITEM_ID]",
  atlas576ParentId: "1f627f33-719c-4497-a173-4ea400df02c9",
  patchableItems: ["[WORK_ITEM_ID]", "[WORK_ITEM_ID]", "[WORK_ITEM_ID]", "[WORK_ITEM_ID]", "[WORK_ITEM_ID]"],
  alreadyParseableFounderGated: ["[WORK_ITEM_ID]", "[WORK_ITEM_ID]", "[WORK_ITEM_ID]"],
  splitExternalIds: [
    "atlas-576-split:g6-non-prod-write-smoke",
    "atlas-576-split:g7-copy-claim-founder-record",
  ],
});

export function parseArgs(argv) {
  const args = {
    queueFile: "reports/atlas/super-goal/controller/[WORK_ITEM_ID]-patch-queue-2026-06-01.json",
    gateRegisterFile: "reports/atlas/super-goal/controller/[WORK_ITEM_ID]-gate-register-2026-06-01.json",
    splitPlanFile: "reports/atlas/super-goal/controller/[WORK_ITEM_ID]-materialization-plan-2026-06-01.json",
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--queue-file") args.queueFile = argv[++index] || "";
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
  if (!args.queueFile) errors.push("--queue-file is required");
  if (!args.gateRegisterFile) errors.push("--gate-register-file is required");
  if (!args.splitPlanFile) errors.push("--split-plan-file is required");
  return errors;
}

function usage() {
  return `Usage:
  node scripts/plane/atlas-506-supergoal-readiness-preflight.mjs --json

Validates the local [WORK_ITEM_ID] gate-control artifacts before any HumanGate
decision is applied. This script reads local JSON only; it never writes Plane,
never executes emitted commands and has no --apply mode.`;
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function evaluatePreflight({ queue, gateRegister, splitPlan }) {
  const checks = [];

  check(checks, queue?.project_id === EXPECTED.projectId, "queue.project", "description patch queue project matches ATLAS project");
  check(checks, queue?.parent_ref === EXPECTED.parentRef, "queue.parent", "description patch queue parent is [WORK_ITEM_ID]");
  checkList(checks, refs(queue.patchable_items), EXPECTED.patchableItems, "queue.patchable_items");
  checkList(checks, refs(queue.already_parseable_founder_gated), EXPECTED.alreadyParseableFounderGated, "queue.already_parseable_founder_gated");
  check(checks, refs(queue.excluded_items).includes("[WORK_ITEM_ID]"), "queue.excludes_atlas_576", "[WORK_ITEM_ID] is excluded from direct description patching");
  check(checks, queue?.apply_status === "not_applied", "queue.not_applied", "description patch queue has not been applied");

  check(checks, gateRegister?.project_id === EXPECTED.projectId, "gate_register.project", "gate register project matches ATLAS project");
  check(checks, gateRegister?.parent_ref === EXPECTED.parentRef, "gate_register.parent", "gate register parent is [WORK_ITEM_ID]");
  check(checks, gateRegister?.planner_status === "BLOCKED_DEPENDENCY", "gate_register.planner_status", "gate register records blocked dependency state");
  check(checks, Array.isArray(gateRegister?.gate_classes?.description_patch_approval_required), "gate_register.patch_class", "gate register has description patch approval class");
  check(checks, Array.isArray(gateRegister?.gate_classes?.already_parseable_but_founder_gated), "gate_register.founder_class", "gate register has already-parseable Founder-gated class");
  check(checks, Array.isArray(gateRegister?.gate_classes?.split_required_before_materialization), "gate_register.split_class", "gate register has split-required class");

  check(checks, splitPlan?.ok === true, "split_plan.ok", "[WORK_ITEM_ID] split plan is ok");
  check(checks, splitPlan?.project_id === EXPECTED.projectId, "split_plan.project", "[WORK_ITEM_ID] split plan project matches ATLAS project");
  check(checks, splitPlan?.parent_id === EXPECTED.atlas576ParentId, "split_plan.parent", "[WORK_ITEM_ID] split plan is parent-linked to [WORK_ITEM_ID]");
  checkList(checks, (splitPlan?.planned || []).map((row) => row.payload?.external_id), EXPECTED.splitExternalIds, "split_plan.external_ids");
  for (const row of splitPlan?.planned || []) {
    check(checks, row.validation_ok === true, `split_plan.${row.slug}.validation`, `${row.slug} validates cleanly`);
    check(checks, row.payload_is_authoritative === true, `split_plan.${row.slug}.payload_authoritative`, `${row.slug} marks payload as authoritative`);
  }

  const failed = checks.filter((row) => !row.ok);
  return {
    version: VERSION,
    ok: failed.length === 0,
    checks,
    failed,
    readiness: {
      description_patch_queue_ready_for_hg_decision: failed.every((row) => !row.id.startsWith("queue.")),
      atlas_576_split_ready_for_hg_decision: failed.every((row) => !row.id.startsWith("split_plan.")),
      gate_register_ready_for_hg_decision: failed.every((row) => !row.id.startsWith("gate_register.")),
    },
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
    ],
  };
}

function refs(rows = []) {
  return (rows || []).map((row) => row.ref).filter(Boolean);
}

function check(checks, ok, id, message) {
  checks.push({ id, ok: Boolean(ok), message });
}

function checkList(checks, actual, expected, id) {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  const ok = JSON.stringify(actualSorted) === JSON.stringify(expectedSorted);
  checks.push({
    id,
    ok,
    message: `${id} matches expected set`,
    actual: actualSorted,
    expected: expectedSorted,
  });
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return;
  }
  const errors = validateArgs(args);
  if (errors.length) {
    const result = { version: VERSION, ok: false, errors };
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }
  let result = null;
  try {
    result = evaluatePreflight({
      queue: readJson(args.queueFile),
      gateRegister: readJson(args.gateRegisterFile),
      splitPlan: readJson(args.splitPlanFile),
    });
  } catch (error) {
    result = { version: VERSION, ok: false, errors: [error.message] };
  }
  printResult(result, args.json);
  if (!result.ok) process.exitCode = 2;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`[WORK_ITEM_ID] supergoal readiness preflight: ${result.ok ? "pass" : "fail"}`);
  for (const row of result.failed || []) console.log(`failed: ${row.id}`);
  for (const error of result.errors || []) console.log(`error: ${error}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
