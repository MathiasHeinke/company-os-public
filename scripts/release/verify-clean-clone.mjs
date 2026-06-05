#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

import {
  buildPageIndex,
  renderPageIndex,
} from "../page-index/page-index-core.mjs";
import { evaluateProductizationReadiness } from "../release-gates/productization-readiness-core.mjs";

export const CLEAN_CLONE_VERIFIER_VERSION = "verify-clean-clone/v0";

// Blocker classes that the public-release gate may still emit on a freshly
// built public mirror because the underlying source-tree fixes live in later
// PUB items (per docs/releases/public-mirror-builder-spec.md §10.2). A PUB-02C
// verifier run does NOT block on these; it only blocks on blockers the
// builder was supposed to strip.
export const KNOWN_DEFERRED_BLOCKER_IDS = new Set([
  "docs.hard-coded-developer-paths",
  "kit.founder-identity-leak",
  "kit.private-domain-leak",
  "install.prerequisite-drift",
]);

const SOURCE_COMPANY_TOKEN_PREFIX = ["ares", "hermes"].join("-");
const ARES_HERMES_TOKEN_PATTERN = new RegExp(
  String.raw`\b${SOURCE_COMPANY_TOKEN_PREFIX}-[A-Za-z0-9_-]{20,}`,
);
const PRIVATE_HOME_PATH_PATTERN = /\/Users\/[a-zA-Z][-a-zA-Z0-9]+/;
const INTERNAL_WORK_ITEM_PATTERN = /\b(?:ATLAS|COMPA|MAT)-[0-9]+/;
const regexDot = "\\.";
function regexEscape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const PRIVATE_WORKSPACE_NAMES = [
  ["ares", "app"].join("-"),
  ["ares", "website"].join("-"),
  ["ares", "bio", "os", "desktop"].join("-"),
  ["ares", "bio", "os", "dashboard"].join("-"),
  ["MH", "DEV"].join("_"),
  [".agent", "sandboxes"].join("-"),
];
const PRIVATE_SOURCE_MARKER_PATTERN = new RegExp(
  [
    String.raw`\b${["bio-os", "io"].join(regexDot)}\b`,
    String.raw`\b${["ares", "bio", "os"].join("-")}\b`,
    String.raw`\b${SOURCE_COMPANY_TOKEN_PREFIX}\b`,
    String.raw`\b${["dash", "bio-os"].join(regexDot)}\b`,
    String.raw`\b${["app", "bio-os"].join(regexDot)}\b`,
    String.raw`\b${["api", "bio-os"].join(regexDot)}\b`,
    String.raw`(?:^|(?<=\W))(?:${PRIVATE_WORKSPACE_NAMES.map(regexEscape).join("|")})(?=$|\W)`,
    String.raw`\b(?:ARES|ATLAS|Fyn Labs|FYN Labs|Mathias)\b`,
  ].join("|"),
);
const TOKEN_PATTERNS = [
  { id: "source-company-token", regex: ARES_HERMES_TOKEN_PATTERN },
  { id: "anthropic-key", regex: /\bsk-ant-[A-Za-z0-9_-]{20,}/ },
  { id: "openai-key", regex: /\bsk-[A-Za-z0-9]{20,}/ },
  { id: "github-pat", regex: /\bghp_[A-Za-z0-9]{20,}/ },
  { id: "github-fine-grained-pat", regex: /\bgithub_pat_[A-Za-z0-9_]{20,}/ },
  { id: "slack-bot-token", regex: /\bxoxb-[A-Za-z0-9-]{10,}/ },
  { id: "slack-user-token", regex: /\bxoxp-[A-Za-z0-9-]{10,}/ },
  { id: "supabase-token", regex: /\b(?:sbp_[A-Za-z0-9_-]{16,}|su_(?:live|test)_[A-Za-z0-9_-]{16,})\b/ },
  { id: "google-api-key", regex: /\bAIza[0-9A-Za-z_-]{30,}/ },
];

const TEXT_FILE_EXTENSIONS = new Set([
  ".md", ".mdx", ".mjs", ".cjs", ".js", ".ts", ".tsx", ".jsx", ".py",
  ".json", ".yaml", ".yml", ".sh", ".txt", ".env", ".jsonl",
]);

const PUBLIC_READER_MARKER_SCOPES = [
  "README.md",
  "CHANGELOG.md",
  "ROADMAP.md",
  "AGENTS.md",
  "docs/",
  "kits/",
  "registries/",
  "assets/brand/eve-command/site/public/",
];

const SKIP_DIRECTORY_NAMES = new Set([
  ".git", "node_modules", ".next", "dist", "build", ".cache", ".turbo",
]);

export const STATUS_EXIT_CODES = {
  PASS: 0,
  BLOCKED_PUBLIC_GATE: 1,
  BLOCKED_BOOTSTRAP: 2,
  BLOCKED_SECRET_SCAN: 3,
  BLOCKED_PRIVATE_PATH: 4,
  RUNTIME_ERROR: 5,
};

// Highest-severity status wins. SECRET_SCAN and PRIVATE_PATH are hard stops
// (spec §9). BOOTSTRAP is structural. PUBLIC_GATE is the catch-all for
// gate / smoke check failures the builder should have prevented.
const STATUS_PRECEDENCE = [
  "BLOCKED_SECRET_SCAN",
  "BLOCKED_PRIVATE_PATH",
  "BLOCKED_BOOTSTRAP",
  "BLOCKED_PUBLIC_GATE",
];

const CHECK_TO_STATUS = {
  "readme.version": "BLOCKED_PUBLIC_GATE",
  "changelog.version": "BLOCKED_PUBLIC_GATE",
  "public.release.gate": "BLOCKED_PUBLIC_GATE",
  "reports.no-jsonl": "BLOCKED_PUBLIC_GATE",
  "metrics.example-only": "BLOCKED_PUBLIC_GATE",
  "page-index.current": "BLOCKED_PUBLIC_GATE",
  "secret.scan": "BLOCKED_SECRET_SCAN",
  "private.path.scan": "BLOCKED_PRIVATE_PATH",
  "private.marker.scan": "BLOCKED_PRIVATE_PATH",
  "git.bootstrap": "BLOCKED_BOOTSTRAP",
};

function listTextFiles(rootDir, base = rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const collected = [];
  const stack = [rootDir];
  while (stack.length) {
    const directory = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRECTORY_NAMES.has(entry.name)) continue;
        stack.push(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!TEXT_FILE_EXTENSIONS.has(ext) && entry.name !== ".env") continue;
      collected.push(path.relative(base, absolute).split(path.sep).join("/"));
    }
  }
  return collected.sort();
}

function listAllFiles(rootDir, base = rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const collected = [];
  const stack = [rootDir];
  while (stack.length) {
    const directory = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRECTORY_NAMES.has(entry.name)) continue;
        stack.push(absolute);
        continue;
      }
      if (entry.isFile()) {
        collected.push(path.relative(base, absolute).split(path.sep).join("/"));
      }
    }
  }
  return collected.sort();
}

function readTextSafe(absolute) {
  try {
    return fs.readFileSync(absolute, "utf8");
  } catch {
    return null;
  }
}

function extractReadmeVersion(text) {
  const match = text.match(/Current version:\s*`([^`]+)`/);
  return match ? match[1] : "";
}

function makeCheck(id, status, detail, evidence = null) {
  const result = { id, status, detail };
  if (evidence !== null) result.evidence = evidence;
  return result;
}

function copyTreeDeep(sourceRoot, targetRoot) {
  fs.mkdirSync(targetRoot, { recursive: true });
  fs.cpSync(sourceRoot, targetRoot, { recursive: true, dereference: false });
}

function checkReadmeVersion(rootDir) {
  const readmePath = path.join(rootDir, "README.md");
  const versionPath = path.join(rootDir, "VERSION");
  if (!fs.existsSync(readmePath)) {
    return makeCheck("readme.version", "fail", "README.md missing");
  }
  if (!fs.existsSync(versionPath)) {
    return makeCheck("readme.version", "fail", "VERSION missing");
  }
  const version = fs.readFileSync(versionPath, "utf8").trim();
  const readmeText = fs.readFileSync(readmePath, "utf8");
  const readmeVersion = extractReadmeVersion(readmeText);
  if (!readmeVersion) {
    return makeCheck("readme.version", "fail", "README has no `Current version:` line");
  }
  if (readmeVersion !== version) {
    return makeCheck(
      "readme.version",
      "fail",
      `README version "${readmeVersion}" does not match VERSION "${version}"`,
      { version, readme_version: readmeVersion },
    );
  }
  return makeCheck(
    "readme.version",
    "pass",
    `README version matches VERSION (${version})`,
    { version },
  );
}

function checkChangelogVersion(rootDir) {
  const versionPath = path.join(rootDir, "VERSION");
  const changelogPath = path.join(rootDir, "CHANGELOG.md");
  if (!fs.existsSync(changelogPath)) {
    return makeCheck("changelog.version", "fail", "CHANGELOG.md missing");
  }
  if (!fs.existsSync(versionPath)) {
    return makeCheck("changelog.version", "fail", "VERSION missing");
  }
  const version = fs.readFileSync(versionPath, "utf8").trim();
  const changelog = fs.readFileSync(changelogPath, "utf8");
  if (!changelog.includes(`## ${version}`)) {
    return makeCheck(
      "changelog.version",
      "fail",
      `CHANGELOG missing \`## ${version}\` section`,
      { version },
    );
  }
  return makeCheck(
    "changelog.version",
    "pass",
    `CHANGELOG contains \`## ${version}\` section`,
    { version },
  );
}

function checkPublicReleaseGate(rootDir) {
  let result;
  try {
    result = evaluateProductizationReadiness({ root: rootDir, publicRelease: true });
  } catch (error) {
    return makeCheck(
      "public.release.gate",
      "fail",
      `productization-readiness threw: ${error.message || String(error)}`,
    );
  }
  const unexpected = result.blockers.filter(
    (blocker) => !KNOWN_DEFERRED_BLOCKER_IDS.has(blocker.id),
  );
  const deferred = result.blockers
    .filter((blocker) => KNOWN_DEFERRED_BLOCKER_IDS.has(blocker.id))
    .map((blocker) => blocker.id);
  if (unexpected.length === 0) {
    return makeCheck(
      "public.release.gate",
      "pass",
      `productization-readiness reports ${result.blocker_count} blocker(s); all are known-deferred or zero`,
      {
        blocker_count: result.blocker_count,
        deferred_blockers: deferred,
        gate_status: result.status,
      },
    );
  }
  return makeCheck(
    "public.release.gate",
    "fail",
    `productization-readiness has ${unexpected.length} unexpected blocker(s)`,
    {
      blocker_count: result.blocker_count,
      unexpected_blockers: unexpected.map((blocker) => blocker.id),
      deferred_blockers: deferred,
      gate_status: result.status,
    },
  );
}

function scanLinesForRegex(rootDir, files, regex) {
  const hits = [];
  for (const relative of files) {
    const text = readTextSafe(path.join(rootDir, relative));
    if (text === null) continue;
    const lines = text.split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      regex.lastIndex = 0;
      if (regex.test(lines[index])) {
        hits.push({ path: relative, line: index + 1 });
      }
    }
  }
  return hits;
}

function checkSecretScan(rootDir) {
  const files = listTextFiles(rootDir);
  const hits = [];
  for (const pattern of TOKEN_PATTERNS) {
    for (const hit of scanLinesForRegex(rootDir, files, pattern.regex)) {
      hits.push({ ...hit, pattern: pattern.id });
    }
  }
  if (hits.length === 0) {
    return makeCheck("secret.scan", "pass", "No token-shaped strings detected");
  }
  return makeCheck(
    "secret.scan",
    "fail",
    `${hits.length} token-shaped match(es) detected`,
    {
      count: hits.length,
      sample: hits.slice(0, 5).map((hit) => `${hit.path}:${hit.line}:${hit.pattern}`),
    },
  );
}

function checkPrivatePathScan(rootDir) {
  const allFiles = listTextFiles(rootDir);
  const hits = scanLinesForRegex(rootDir, allFiles, PRIVATE_HOME_PATH_PATTERN);
  if (hits.length === 0) {
    return makeCheck(
      "private.path.scan",
      "pass",
      "No hard-coded /Users/ private paths in public mirror text files",
    );
  }
  return makeCheck(
    "private.path.scan",
    "fail",
    `${hits.length} hard-coded /Users/ path match(es) in public mirror text files`,
    {
      count: hits.length,
      sample: hits.slice(0, 5).map((hit) => `${hit.path}:${hit.line}`),
    },
  );
}

function checkPrivateMarkerScan(rootDir) {
  const files = listTextFiles(rootDir);
  const markerFiles = files.filter((file) =>
    PUBLIC_READER_MARKER_SCOPES.some((scope) => file.startsWith(scope)),
  );
  const hits = [
    ...scanLinesForRegex(rootDir, markerFiles, INTERNAL_WORK_ITEM_PATTERN).map((hit) => ({
      ...hit,
      pattern: "internal-work-item-id",
    })),
    ...scanLinesForRegex(rootDir, markerFiles, PRIVATE_SOURCE_MARKER_PATTERN)
      .filter((hit) => hit.path !== "LICENSE")
      .map((hit) => ({
        ...hit,
        pattern: "private-source-marker",
      })),
  ];
  if (hits.length === 0) {
    return makeCheck("private.marker.scan", "pass", "No internal work item ids or source-company markers detected");
  }
  return makeCheck(
    "private.marker.scan",
    "fail",
    `${hits.length} internal work item id or source-company marker match(es) detected`,
    {
      count: hits.length,
      sample: hits.slice(0, 5).map((hit) => `${hit.path}:${hit.line}:${hit.pattern}`),
    },
  );
}

function checkReportsNoJsonl(rootDir) {
  const reportsDir = path.join(rootDir, "reports");
  if (!fs.existsSync(reportsDir)) {
    return makeCheck("reports.no-jsonl", "pass", "reports/ does not exist");
  }
  const files = listAllFiles(reportsDir, rootDir);
  const offending = files.filter((file) => {
    if (!file.endsWith(".jsonl")) return false;
    if (file.startsWith("reports/examples/")) return false;
    return true;
  });
  if (offending.length === 0) {
    return makeCheck(
      "reports.no-jsonl",
      "pass",
      "No .jsonl files in reports/ outside reports/examples/",
    );
  }
  return makeCheck(
    "reports.no-jsonl",
    "fail",
    `${offending.length} unexpected .jsonl file(s) in reports/`,
    { count: offending.length, sample: offending.slice(0, 5) },
  );
}

function checkMetricsExampleOnly(rootDir) {
  const metricsDir = path.join(rootDir, "metrics");
  if (!fs.existsSync(metricsDir)) {
    return makeCheck("metrics.example-only", "pass", "metrics/ does not exist");
  }
  let entries;
  try {
    entries = fs.readdirSync(metricsDir, { withFileTypes: true });
  } catch (error) {
    return makeCheck(
      "metrics.example-only",
      "fail",
      `metrics/ readdir failed: ${error.message || String(error)}`,
    );
  }
  const offending = entries
    .filter((entry) => entry.isFile())
    .filter((entry) => /^agent-.*\.jsonl$/.test(entry.name))
    .filter((entry) => !entry.name.includes(".example."))
    .map((entry) => `metrics/${entry.name}`);
  if (offending.length === 0) {
    return makeCheck(
      "metrics.example-only",
      "pass",
      "metrics/agent-*.jsonl only includes .example. variants",
    );
  }
  return makeCheck(
    "metrics.example-only",
    "fail",
    `${offending.length} unexpected metrics/agent-*.jsonl file(s)`,
    { count: offending.length, sample: offending },
  );
}

function checkGitBootstrap(tempCloneRoot, { gitBin = "git", env = process.env } = {}) {
  const childOptions = {
    cwd: tempCloneRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  };
  try {
    execFileSync(gitBin, ["init", "--quiet"], childOptions);
    execFileSync(gitBin, ["add", "-A"], childOptions);
    execFileSync(
      gitBin,
      [
        "-c",
        "user.email=verifier@example.invalid",
        "-c",
        "user.name=verify-clean-clone",
        "-c",
        "commit.gpgsign=false",
        "commit",
        "--quiet",
        "--allow-empty",
        "-m",
        "verify",
      ],
      childOptions,
    );
    return makeCheck(
      "git.bootstrap",
      "pass",
      "git init + add + commit succeeded in temp clone",
    );
  } catch (error) {
    return makeCheck(
      "git.bootstrap",
      "fail",
      `git bootstrap failed: ${error.message || String(error)}`,
    );
  }
}

function checkPageIndexCurrent(rootDir) {
  const pageIndexPath = path.join(rootDir, "docs/page-index.md");
  if (!fs.existsSync(pageIndexPath)) {
    return makeCheck("page-index.current", "fail", "docs/page-index.md missing");
  }
  try {
    const index = buildPageIndex(rootDir, {
      source: "tracked",
      fallbackToFilesystem: false,
      ignoreFiles: ["docs/page-index.md"],
    });
    const expected = renderPageIndex(index);
    const current = fs.readFileSync(pageIndexPath, "utf8");
    if (current === expected) {
      return makeCheck(
        "page-index.current",
        "pass",
        `docs/page-index.md matches tracked public mirror (${index.entries.length} files)`,
        { files: index.entries.length, source: "tracked" },
      );
    }
    return makeCheck(
      "page-index.current",
      "fail",
      "docs/page-index.md is stale for the public mirror tracked tree",
      { files: index.entries.length, source: "tracked" },
    );
  } catch (error) {
    return makeCheck(
      "page-index.current",
      "fail",
      `page-index check failed: ${error.message || String(error)}`,
    );
  }
}

export function deriveStatus(checks) {
  const failedStatuses = new Set();
  for (const check of checks) {
    if (check.status === "fail") {
      const mapped = CHECK_TO_STATUS[check.id];
      if (mapped) failedStatuses.add(mapped);
    }
  }
  for (const candidate of STATUS_PRECEDENCE) {
    if (failedStatuses.has(candidate)) return candidate;
  }
  return "PASS";
}

export async function runVerifyCleanClone({
  root,
  tempDir,
  keepTemp = false,
  gitBin = "git",
  tempLabel = "verify-clean-clone-",
  now = () => new Date(),
} = {}) {
  const generatedAt = () => now().toISOString();
  if (!root) {
    return {
      status: "RUNTIME_ERROR",
      exit_code: STATUS_EXIT_CODES.RUNTIME_ERROR,
      reason: "missing-root",
      root: null,
      temp_clone: null,
      temp_clone_retained: false,
      generated_at: generatedAt(),
      version: CLEAN_CLONE_VERIFIER_VERSION,
      checks: [],
    };
  }

  const resolvedRoot = path.resolve(root);
  if (!fs.existsSync(resolvedRoot)) {
    return {
      status: "RUNTIME_ERROR",
      exit_code: STATUS_EXIT_CODES.RUNTIME_ERROR,
      reason: `root.not-found: ${resolvedRoot}`,
      root: resolvedRoot,
      temp_clone: null,
      temp_clone_retained: false,
      generated_at: generatedAt(),
      version: CLEAN_CLONE_VERIFIER_VERSION,
      checks: [],
    };
  }

  let tempClone;
  try {
    const baseTempDir = tempDir ? path.resolve(tempDir) : os.tmpdir();
    fs.mkdirSync(baseTempDir, { recursive: true });
    const suffix = `${tempLabel}${crypto.randomBytes(6).toString("hex")}`;
    tempClone = path.join(baseTempDir, suffix);
    copyTreeDeep(resolvedRoot, tempClone);
  } catch (error) {
    return {
      status: "RUNTIME_ERROR",
      exit_code: STATUS_EXIT_CODES.RUNTIME_ERROR,
      reason: `temp-clone.copy-failed: ${error.message || String(error)}`,
      root: resolvedRoot,
      temp_clone: tempClone || null,
      temp_clone_retained: Boolean(tempClone),
      generated_at: generatedAt(),
      version: CLEAN_CLONE_VERIFIER_VERSION,
      checks: [],
    };
  }

  const checks = [
    checkReadmeVersion(tempClone),
    checkChangelogVersion(tempClone),
    checkPublicReleaseGate(tempClone),
    checkSecretScan(tempClone),
    checkPrivatePathScan(tempClone),
    checkPrivateMarkerScan(tempClone),
    checkReportsNoJsonl(tempClone),
    checkMetricsExampleOnly(tempClone),
    checkGitBootstrap(tempClone, { gitBin }),
  ];
  checks.push(checkPageIndexCurrent(tempClone));

  const status = deriveStatus(checks);
  const exitCode = STATUS_EXIT_CODES[status];
  const isoNow = generatedAt();

  let tempCloneRetained = true;
  if (!keepTemp && status === "PASS") {
    try {
      fs.rmSync(tempClone, { recursive: true, force: true });
      tempCloneRetained = false;
    } catch {
      tempCloneRetained = true;
    }
  }

  return {
    status,
    exit_code: exitCode,
    root: resolvedRoot,
    temp_clone: tempClone,
    temp_clone_retained: tempCloneRetained,
    generated_at: isoNow,
    version: CLEAN_CLONE_VERIFIER_VERSION,
    checks,
  };
}

function parseArgs(argv) {
  const options = {
    root: "",
    tempDir: "",
    keepTemp: false,
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--keep-temp") {
      options.keepTemp = true;
      continue;
    }
    const nextValue = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };
    if (arg === "--root") options.root = nextValue();
    else if (arg === "--temp-dir") options.tempDir = nextValue();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.root) options.root = path.resolve(options.root);
  if (options.tempDir) options.tempDir = path.resolve(options.tempDir);
  return options;
}

function printHelp() {
  process.stdout.write(
    [
      "Usage:",
      "  verify-clean-clone.mjs --root PATH [--json] [--temp-dir PATH] [--keep-temp]",
      "",
      "Options:",
      "  --root PATH       Path to a public mirror tree already produced by build-public-mirror.mjs (required).",
      "  --temp-dir PATH   Parent directory for the temp clone. Default: system temp.",
      "  --keep-temp       Do not delete the temp clone on PASS (always retained on failure).",
      "  --json            Print structured JSON to stdout.",
      "",
      "Exit codes:",
      "  0 PASS",
      "  1 BLOCKED_PUBLIC_GATE",
      "  2 BLOCKED_BOOTSTRAP",
      "  3 BLOCKED_SECRET_SCAN",
      "  4 BLOCKED_PRIVATE_PATH",
      "  5 RUNTIME_ERROR",
      "",
    ].join("\n"),
  );
}

function printPlain(result) {
  process.stdout.write(`VERIFY [${result.status}]: exit ${result.exit_code}\n`);
  if (result.reason) {
    process.stdout.write(`  reason: ${result.reason}\n`);
  }
  for (const check of result.checks) {
    process.stdout.write(`  ${check.status.toUpperCase()} ${check.id}: ${check.detail}\n`);
  }
  if (result.temp_clone) {
    process.stdout.write(
      `  temp_clone${result.temp_clone_retained ? " (retained)" : " (deleted)"}: ${result.temp_clone}\n`,
    );
  }
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message || String(error)}\n`);
    printHelp();
    process.exitCode = STATUS_EXIT_CODES.RUNTIME_ERROR;
    return;
  }
  if (options.help) {
    printHelp();
    return;
  }
  if (!options.root) {
    process.stderr.write("--root is required\n");
    printHelp();
    process.exitCode = STATUS_EXIT_CODES.RUNTIME_ERROR;
    return;
  }

  const result = await runVerifyCleanClone({
    root: options.root,
    tempDir: options.tempDir || undefined,
    keepTemp: options.keepTemp,
  });

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    printPlain(result);
  }
  if (result.exit_code) process.exitCode = result.exit_code;
}

const invokedDirectly =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1]);
if (invokedDirectly) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message || String(error)}\n`);
    process.exitCode = STATUS_EXIT_CODES.RUNTIME_ERROR;
  });
}
