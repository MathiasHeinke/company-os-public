import fs from "node:fs";
import path from "node:path";

import {
  buildPageIndex,
  renderPageIndex,
} from "./page-index-core.mjs";

const DEFAULT_OUTPUT = "docs/page-index.md";
const DEFAULT_MAX_ACTIVE_CONTEXT_LINES = 300;

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function escapeTable(value) {
  return String(value ?? "-").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim() || "-";
}

function normalizeWorkspace(workspace, index) {
  if (!workspace || typeof workspace !== "object") {
    throw new Error(`workspace[${index}] must be an object`);
  }
  if (!workspace.root || typeof workspace.root !== "string") {
    throw new Error(`workspace[${index}].root must be a string`);
  }
  return {
    name: workspace.name || path.basename(workspace.root),
    root: workspace.root,
    output: workspace.output || DEFAULT_OUTPUT,
    maxActiveContextLines: Number(workspace.maxActiveContextLines || DEFAULT_MAX_ACTIVE_CONTEXT_LINES),
  };
}

export function normalizeRegistry(registry) {
  const workspaces = Array.isArray(registry) ? registry : registry?.workspaces;
  if (!Array.isArray(workspaces)) {
    throw new Error("registry must be an array or an object with a workspaces array");
  }
  return workspaces.map((workspace, index) => normalizeWorkspace(workspace, index));
}

function resolveOutput(root, output) {
  return path.isAbsolute(output) ? output : path.join(root, output);
}

function outputRelative(root, outputPath) {
  return toPosix(path.relative(root, outputPath));
}

function sweepWorkspace(workspace, options = {}) {
  const root = path.resolve(workspace.root);
  const outputPath = resolveOutput(root, workspace.output);
  const output = outputRelative(root, outputPath);

  if (!fs.existsSync(root)) {
    return {
      name: workspace.name,
      root,
      output,
      files: 0,
      stale: true,
      status: "missing_root",
      warnings: [`workspace root does not exist: ${root}`],
    };
  }

  const index = buildPageIndex(root, {
    maxActiveContextLines: workspace.maxActiveContextLines,
    ignoreFiles: [output],
  });
  const markdown = renderPageIndex(index);
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  let stale = current !== markdown;
  let wroteIndex = false;
  const warnings = [...index.warnings];

  if (options.writeIndexes && stale) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, markdown, "utf8");
    stale = false;
    wroteIndex = true;
  }

  if (stale) warnings.push(`page index is stale or missing: ${output}`);

  return {
    name: workspace.name,
    root,
    output,
    files: index.entries.length,
    stale,
    wroteIndex,
    status: warnings.length ? "needs_attention" : "current",
    warnings,
  };
}

export function sweepWorkspaces(registry, options = {}) {
  const workspaces = normalizeRegistry(registry).map((workspace) => sweepWorkspace(workspace, options));
  const current = workspaces.filter((workspace) => workspace.status === "current").length;
  return {
    generatedAt: options.generatedAt || new Date().toISOString(),
    summary: {
      total: workspaces.length,
      current,
      needsAttention: workspaces.length - current,
    },
    workspaces,
  };
}

export function readWorkspaceRegistry(filePath) {
  return normalizeRegistry(JSON.parse(fs.readFileSync(filePath, "utf8")));
}

export function renderWorkspaceSweepReport(result) {
  const lines = [
    "# Page Index Workspace Sweep",
    "",
    `Generated: ${result.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Total workspaces: ${result.summary.total}`,
    `- Current: ${result.summary.current}`,
    `- Needs attention: ${result.summary.needsAttention}`,
    "",
    "## Workspaces",
    "",
    "| Workspace | Status | Files | Stale | Wrote | Warnings | Output |",
    "|---|---|---:|---|---|---:|---|",
  ];

  for (const workspace of result.workspaces) {
    lines.push(`| ${escapeTable(workspace.name)} | ${escapeTable(workspace.status)} | ${workspace.files} | ${workspace.stale ? "yes" : "no"} | ${workspace.wroteIndex ? "yes" : "no"} | ${workspace.warnings.length} | \`${escapeTable(workspace.output)}\` |`);
  }

  const warningRows = result.workspaces.filter((workspace) => workspace.warnings.length);
  if (warningRows.length) {
    lines.push("", "## Warnings", "");
    for (const workspace of warningRows) {
      lines.push(`### ${workspace.name}`, "");
      for (const warning of workspace.warnings) lines.push(`- ${warning}`);
      lines.push("");
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
