import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const DEFAULT_IGNORE_DIRS = new Set([
  ".claude",
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "tmp",
]);

const DEFAULT_IGNORE_FILES = new Set([
  "docs/page-index.md",
]);

const SYSTEM_INDEX_PATHS = new Set([
  "memory-bank/system-index.md",
  "docs/system-index.md",
  ".antigravity/system-index.md",
]);

const CATEGORY_ORDER = [
  "Boot",
  "Memory",
  "Operations",
  "Governance",
  "Harnesses",
  "Templates",
  "Kit",
  "Reports",
  "Docs",
  "Root",
  "Other",
];

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function isIgnoredRelativePath(relativePath, ignoreFiles = DEFAULT_IGNORE_FILES) {
  const posix = toPosix(relativePath);
  if (ignoreFiles.has(posix)) return true;
  if (posix.startsWith("reports/private/")) return true;
  return posix
    .split("/")
    .some((segment) => DEFAULT_IGNORE_DIRS.has(segment));
}

export function discoverMarkdownFiles(root, options = {}) {
  const absoluteRoot = path.resolve(root);
  const ignoreFiles = new Set(options.ignoreFiles || DEFAULT_IGNORE_FILES);
  const files = [];

  function walk(currentPath) {
    const relativePath = toPosix(path.relative(absoluteRoot, currentPath));
    if (relativePath && isIgnoredRelativePath(relativePath, ignoreFiles)) return;

    let stat;
    try {
      stat = fs.statSync(currentPath);
    } catch (error) {
      if (error?.code === "ENOENT" || error?.code === "ELOOP") return;
      throw error;
    }
    if (stat.isDirectory()) {
      const children = fs.readdirSync(currentPath).sort((a, b) => a.localeCompare(b));
      for (const child of children) walk(path.join(currentPath, child));
      return;
    }

    if (stat.isFile() && currentPath.endsWith(".md")) {
      files.push(currentPath);
    }
  }

  walk(absoluteRoot);
  return files.sort((a, b) => toPosix(path.relative(absoluteRoot, a)).localeCompare(toPosix(path.relative(absoluteRoot, b))));
}

export function discoverTrackedMarkdownFiles(root, options = {}) {
  const absoluteRoot = path.resolve(root);
  const ignoreFiles = new Set(options.ignoreFiles || DEFAULT_IGNORE_FILES);
  let output;
  try {
    output = execFileSync("git", ["ls-files", "-z", "--", "*.md"], {
      cwd: absoluteRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const err = new Error(`git ls-files failed in ${absoluteRoot}: ${error.message}`);
    err.code = "TRACKED_INDEX_UNAVAILABLE";
    throw err;
  }
  const entries = output.split("\0").filter(Boolean);
  const absolute = [];
  for (const relative of entries) {
    if (isIgnoredRelativePath(relative, ignoreFiles)) continue;
    const absolutePath = path.join(absoluteRoot, relative);
    let stat;
    try {
      stat = fs.statSync(absolutePath);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    if (stat.isFile()) absolute.push(absolutePath);
  }
  return absolute.sort((a, b) => toPosix(path.relative(absoluteRoot, a)).localeCompare(toPosix(path.relative(absoluteRoot, b))));
}

function firstHeading(lines) {
  for (const line of lines) {
    const match = line.match(/^#\s+(.+?)\s*$/);
    if (match) return match[1].trim();
  }
  return "";
}

function purposeLine(lines) {
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;
    if (trimmed.startsWith(">")) return trimmed.replace(/^>\s*/, "").trim();
    return trimmed;
  }
  return "";
}

function sectionHeadings(lines) {
  return lines
    .map((line) => line.match(/^#{2,3}\s+(.+?)\s*$/)?.[1]?.trim())
    .filter(Boolean);
}

export function scrubPrivatePathsInString(value) {
  return String(value || "").replace(/\/Users\/[a-zA-Z][-a-zA-Z0-9]*/g, "~");
}

function categoryFor(relativePath) {
  if (relativePath === "AGENTS.md" || relativePath === "CLAUDE.md" || relativePath.endsWith("/AGENTS.md")) return "Boot";
  if (relativePath.startsWith("memory-bank/") || relativePath.includes("/memory-bank/")) return "Memory";
  if (relativePath.startsWith("docs/operations/")) return "Operations";
  if (relativePath.startsWith("docs/governance/")) return "Governance";
  if (relativePath.startsWith("docs/harnesses/")) return "Harnesses";
  if (relativePath.startsWith("docs/templates/") || relativePath.includes("/templates/")) return "Templates";
  if (relativePath.startsWith("kits/")) return "Kit";
  if (relativePath.startsWith("reports/")) return "Reports";
  if (relativePath.startsWith("docs/")) return "Docs";
  if (!relativePath.includes("/")) return "Root";
  return "Other";
}

function lineCount(content) {
  const normalized = content.replace(/\r?\n$/, "");
  if (!normalized) return 0;
  return normalized.split(/\r?\n/).length;
}

function wordCount(content) {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

function analyzeMarkdownFile(root, filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const relativePath = toPosix(path.relative(root, filePath));
  const lines = content.split(/\r?\n/);
  const title = firstHeading(lines) || path.basename(filePath);

  return {
    relativePath,
    category: categoryFor(relativePath),
    title: scrubPrivatePathsInString(title),
    purpose: scrubPrivatePathsInString(purposeLine(lines)),
    headings: sectionHeadings(lines).map((heading) => scrubPrivatePathsInString(heading)),
    lineCount: lineCount(content),
    wordCount: wordCount(content),
  };
}

export function buildPageIndex(root, options = {}) {
  const absoluteRoot = path.resolve(root);
  const maxActiveContextLines = Number(options.maxActiveContextLines || 300);
  const requestedSource = options.source || "filesystem";
  if (!["filesystem", "tracked"].includes(requestedSource)) {
    throw new Error(`Unknown page-index source: ${requestedSource}`);
  }
  let source = requestedSource;
  let files = [];
  const warnings = [];
  if (source === "tracked") {
    try {
      files = discoverTrackedMarkdownFiles(absoluteRoot, options);
    } catch (error) {
      if (error?.code === "TRACKED_INDEX_UNAVAILABLE" && options.fallbackToFilesystem !== false) {
        warnings.push("tracked source unavailable (no git index); falling back to filesystem");
        source = "filesystem";
        files = discoverMarkdownFiles(absoluteRoot, options);
      } else {
        throw error;
      }
    }
  } else {
    files = discoverMarkdownFiles(absoluteRoot, options);
  }
  const entries = files.map((file) => analyzeMarkdownFile(absoluteRoot, file));
  const paths = new Set(entries.map((entry) => entry.relativePath));

  if (![...SYSTEM_INDEX_PATHS].some((systemIndexPath) => paths.has(systemIndexPath))) {
    warnings.push("missing Layer-0.5 system index: expected memory-bank/system-index.md, docs/system-index.md or .antigravity/system-index.md");
  }

  for (const entry of entries) {
    if (entry.relativePath.endsWith("activeContext.md") && entry.lineCount > maxActiveContextLines) {
      warnings.push(`${entry.relativePath} has ${entry.lineCount} lines (max ${maxActiveContextLines})`);
    }
  }

  return {
    root: absoluteRoot,
    entries,
    warnings,
    maxActiveContextLines,
    source,
    sourceRequested: requestedSource,
  };
}

function escapeTable(value) {
  const text = scrubPrivatePathsInString(value || "-");
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim() || "-";
}

function groupEntries(entries) {
  const groups = new Map();
  for (const entry of entries) {
    if (!groups.has(entry.category)) groups.set(entry.category, []);
    groups.get(entry.category).push(entry);
  }
  return [...groups.entries()].sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a[0]);
    const bIndex = CATEGORY_ORDER.indexOf(b[0]);
    const normalizedA = aIndex === -1 ? CATEGORY_ORDER.length : aIndex;
    const normalizedB = bIndex === -1 ? CATEGORY_ORDER.length : bIndex;
    return normalizedA - normalizedB || a[0].localeCompare(b[0]);
  });
}

export function renderPageIndex(index, options = {}) {
  const generatedAt = options.generatedAt || "deterministic";
  const title = options.title || "Page Index";
  const rootLabel = options.rootLabel || ".";
  const sourceLabel = index.source === "tracked" ? "tracked-canonical" : "runtime-local";
  const lines = [
    `# ${title}`,
    "",
    `Generated: ${generatedAt}`,
    `Root: \`${rootLabel}\``,
    `Source: ${sourceLabel}`,
    `Files: ${index.entries.length}`,
    "",
    "> Generated Layer-0.5-compatible Markdown map. Edit source files, then regenerate this page index.",
    "> Source `tracked-canonical` enumerates only files tracked by git; `runtime-local` includes untracked working-tree files (developer view).",
    "",
  ];

  if (index.warnings.length) {
    lines.push("## Warnings", "");
    for (const warning of index.warnings) lines.push(`- ${warning}`);
    lines.push("");
  }

  for (const [category, entries] of groupEntries(index.entries)) {
    lines.push(`## ${category}`, "");
    lines.push("| File | Title | Purpose | Headings |");
    lines.push("|---|---|---|---|");
    for (const entry of entries) {
      lines.push(`| \`${escapeTable(entry.relativePath)}\` | ${escapeTable(entry.title)} | ${escapeTable(entry.purpose)} | ${escapeTable(entry.headings.join(", "))} |`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
