#!/usr/bin/env node

import {
  DEPARTMENT_PACK_EVALUATOR_VERSION,
  evaluateDepartmentCapabilityPack,
  renderDepartmentPackEvaluationMarkdown,
  toPortableDepartmentPackEvaluationReport,
  writeDepartmentPackEvaluation,
} from "./company-os-department-pack-evaluator-core.mjs";

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    packId: "",
    date: new Date().toISOString().slice(0, 10),
    write: false,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--write") { args.write = true; continue; }
    if (arg === "--json") { args.json = true; continue; }
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };
    if (arg === "--root") { args.root = next(); continue; }
    if (arg === "--pack-id") { args.packId = next(); continue; }
    if (arg === "--date") { args.date = next(); continue; }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = evaluateDepartmentCapabilityPack({
    root: args.root,
    packId: args.packId,
    date: args.date,
  });
  const paths = args.write ? writeDepartmentPackEvaluation(report) : null;
  const ok = report.status === "READY" || report.status === "PASS_WITH_JUSTIFIED_GAP";
  const result = {
    ok,
    version: DEPARTMENT_PACK_EVALUATOR_VERSION,
    status: report.status,
    paths,
    report: toPortableDepartmentPackEvaluationReport(report),
  };
  if (args.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(`${renderDepartmentPackEvaluationMarkdown(report)}\n`);
  if (!ok) process.exitCode = 2;
}

main();
