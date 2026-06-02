#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { buildDescriptionHtml, markdownTitle } from "./plane-contract-materializer-core.mjs";
import { validateContract } from "../orchestration/worker-ledger-validator.mjs";

export const VERSION = "atlas-576-split-materialization-plan/v0";

export const DEFAULT_ITEMS = [
  {
    slug: "atlas-576-g6-non-prod-write-smoke",
    ref_hint: "[WORK_ITEM_ID]",
    source_markdown: "${LOCAL_WORKSPACE}",
    role: "role:cto",
    external_id: "atlas-576-split:g6-non-prod-write-smoke",
    gate: "HG-2.5",
  },
  {
    slug: "atlas-576-g7-copy-claim-founder-record",
    ref_hint: "[WORK_ITEM_ID]",
    source_markdown: "${LOCAL_WORKSPACE}",
    role: "role:cpo",
    external_id: "atlas-576-split:g7-copy-claim-founder-record",
    gate: "HG-4",
  },
];

export function parseArgs(argv) {
  const args = {
    workspace: process.env.PLANE_WORKSPACE_SLUG || "companyos",
    projectId: "",
    parentId: "",
    labelMap: "",
    root: process.cwd(),
    externalSource: "atlas-576-split-materialization",
    auth: process.env.PLANE_AUTH_MODE || "app-token",
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--workspace") args.workspace = argv[++index] || "";
    else if (arg === "--project-id") args.projectId = argv[++index] || "";
    else if (arg === "--parent-id") args.parentId = argv[++index] || "";
    else if (arg === "--label-map") args.labelMap = argv[++index] || "";
    else if (arg === "--root") args.root = argv[++index] || process.cwd();
    else if (arg === "--external-source") args.externalSource = argv[++index] || "";
    else if (arg === "--auth") args.auth = argv[++index] || "app-token";
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.labelMap && args.workspace && args.projectId) {
    args.labelMap = `runtime/plane-label-map/${args.workspace}-${args.projectId}.json`;
  }
  return args;
}

export function validateArgs(args) {
  const errors = [];
  if (!args.workspace) errors.push("--workspace is required");
  if (!args.projectId) errors.push("--project-id is required");
  if (!args.parentId) errors.push("--parent-id is required");
  if (!args.labelMap) errors.push("--label-map is required or derivable");
  if (!args.externalSource) errors.push("--external-source is required");
  return errors;
}

function usage() {
  return `Usage:
  node scripts/plane/atlas-576-split-materialization-plan.mjs \\
    --project-id <uuid> \\
    --parent-id <[WORK_ITEM_ID] work-item uuid> \\
    [--workspace companyos] [--json]

Dry-run planner only. It validates the two prepared [WORK_ITEM_ID] split proposal
contracts and emits exact Plane create payloads plus later create commands.
It never writes Plane and has no --apply mode.`;
}

export function loadRoleLabelMap(labelMapPath) {
  const raw = JSON.parse(readFileSync(labelMapPath, "utf8"));
  const byName = new Map();
  for (const label of raw.labels || []) {
    if (label?.name && label?.id) byName.set(label.name, label.id);
  }
  return {
    workspace: raw.workspace || "",
    project_id: raw.project_id || "",
    byName,
  };
}

export function roleFromMarkdown(markdown) {
  const match = String(markdown || "").match(/^role:\s*(role:[a-z]+)\s*$/mi);
  return match ? match[1].trim() : "";
}

export function planSplitItem({ item, args, labels }) {
  const markdown = readFileSync(item.source_markdown, "utf8");
  const role = roleFromMarkdown(markdown);
  const labelId = labels.byName.get(item.role);
  const validation = validateContract({ description: markdown, labels: role ? [role] : [item.role] });
  const title = markdownTitle(markdown, item.slug);
  const descriptionHtml = buildDescriptionHtml(markdown, { root: args.root });
  const payload = {
    name: title,
    description_html: descriptionHtml,
    labels: labelId ? [labelId] : [],
    parent: args.parentId,
    priority: "none",
    external_source: args.externalSource,
    external_id: item.external_id,
  };

  const commandTemplate = [
    "node",
    "scripts/plane/plane-create-work-item.mjs",
    "--workspace",
    args.workspace,
    "--project-id",
    args.projectId,
    "--name",
    shellQuote(title),
    "--description-html-file",
    "<write-payload.description_html-to-file-first>",
    "--label",
    labelId || "<missing-label-id>",
    "--parent",
    args.parentId,
    "--external-source",
    args.externalSource,
    "--external-id",
    item.external_id,
    "--auth",
    args.auth,
    "--dry-run",
    "--json",
  ].join(" ");

  return {
    slug: item.slug,
    ref_hint: item.ref_hint,
    gate: item.gate,
    source_markdown: item.source_markdown,
    title,
    role,
    expected_role: item.role,
    label_id: labelId || null,
    validation_ok: validation.ok,
    validation_reason_codes: validation.reason_codes || [],
    payload,
    create_command_template: commandTemplate,
    payload_is_authoritative: true,
    create_command_requires_human_gate: true,
  };
}

export function buildPlan(args, items = DEFAULT_ITEMS) {
  const errors = validateArgs(args);
  let labels = null;
  if (!errors.length) {
    try {
      labels = loadRoleLabelMap(args.labelMap);
      if (labels.workspace && labels.workspace !== args.workspace) {
        errors.push(`label-map workspace mismatch: ${labels.workspace} !== ${args.workspace}`);
      }
      if (labels.project_id && labels.project_id !== args.projectId) {
        errors.push(`label-map project mismatch: ${labels.project_id} !== ${args.projectId}`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  const planned = [];
  if (!errors.length) {
    for (const item of items) {
      try {
        const row = planSplitItem({ item, args, labels });
        planned.push(row);
        if (row.role !== row.expected_role) {
          errors.push(`${item.slug}: role mismatch ${row.role} !== ${row.expected_role}`);
        }
        if (!row.label_id) errors.push(`${item.slug}: label missing for ${row.expected_role}`);
        if (!row.validation_ok) {
          errors.push(`${item.slug}: validation failed ${row.validation_reason_codes.join(", ")}`);
        }
      } catch (error) {
        errors.push(`${item.slug}: ${error.message}`);
      }
    }
  }

  return {
    version: VERSION,
    mode: "dry-run-plan-only",
    ok: errors.length === 0,
    errors,
    workspace: args.workspace,
    project_id: args.projectId,
    parent_id: args.parentId,
    label_map: args.labelMap,
    external_source: args.externalSource,
    hard_boundaries: [
      "no_plane_write",
      "no_plane_done",
      "no_worker_spawn",
      "no_merge",
      "no_push",
      "no_pr",
      "no_deploy",
      "no_production_write",
      "no_schema_rls_auth_apply",
      "no_public_mcp",
      "no_medical_rx_diagnosis_dose_claim",
    ],
    planned,
  };
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`[WORK_ITEM_ID] split materialization plan: ${result.ok ? "pass" : "fail"}`);
  console.log(`planned: ${result.planned.length}`);
  for (const error of result.errors) console.log(`error: ${error}`);
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return;
  }
  const result = buildPlan(args);
  printResult(result, args.json);
  if (!result.ok) process.exitCode = 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
