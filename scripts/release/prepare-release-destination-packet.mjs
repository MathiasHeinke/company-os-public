#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const RELEASE_DESTINATION_PACKET_VERSION = "prepare-release-destination-packet/v0";

export const STATUS_EXIT_CODES = Object.freeze({
  PASS: 0,
  REJECT: 2,
  RUNTIME_ERROR: 5,
});

const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export const DEFAULT_REQUIRED_GATES = Object.freeze([
  "node --test scripts/release/prepare-release-destination-packet.test.mjs",
  "node scripts/release/prepare-release-destination-packet.mjs --target-repo <owner>/<repo> --json",
  "node scripts/release/verify-fresh-history-remote.mjs --json",
  "node scripts/release-gates/productization-readiness.mjs check",
  "node scripts/page-index/generate-page-index.mjs --check",
  "git diff --check",
]);

export const BLOCKED_ACTIONS_REMAINING = Object.freeze([
  "external remote write",
  "tag creation",
  "release upload",
  "credential change",
  "Plane Done by worker",
  "Linear write",
]);

function makeResult(fields = {}) {
  return {
    version: RELEASE_DESTINATION_PACKET_VERSION,
    status: "RUNTIME_ERROR",
    exit_code: STATUS_EXIT_CODES.RUNTIME_ERROR,
    generated_at: new Date().toISOString(),
    source_root: null,
    source_snapshot: null,
    source_repo: null,
    release_version: null,
    target_repo: null,
    target_remote_ssh: null,
    target_remote_https: null,
    performs_remote_write: false,
    required_human_gate: "HG-2.5",
    required_gates: [...DEFAULT_REQUIRED_GATES],
    blocked_actions_remaining: [...BLOCKED_ACTIONS_REMAINING],
    command_packet: null,
    checks: [],
    ...fields,
  };
}

function appendCheck(checks, id, status, detail, evidence = {}) {
  checks.push({ id, status, detail, evidence });
}

function runGit({ cwd, args }) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function normalizeRepoName(repo) {
  return String(repo || "")
    .trim()
    .replace(/^git@github\.com:/i, "")
    .replace(/^https:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .toLowerCase();
}

function parseOriginRepo(sourceRoot) {
  try {
    return normalizeRepoName(runGit({ cwd: sourceRoot, args: ["config", "--get", "remote.origin.url"] }));
  } catch {
    return null;
  }
}

function resolveSourceSnapshot(sourceRoot) {
  try {
    const head = runGit({ cwd: sourceRoot, args: ["rev-parse", "HEAD"] });
    const status = runGit({ cwd: sourceRoot, args: ["status", "--porcelain"] });
    return {
      head,
      dirty: status.trim().length > 0,
      label: status.trim().length > 0 ? `${head}+working-tree` : head,
    };
  } catch {
    return {
      head: null,
      dirty: null,
      label: "unknown-source-snapshot",
    };
  }
}

function resolveReleaseVersion({ sourceRoot, override }) {
  if (override) return override;
  const versionPath = path.join(sourceRoot, "VERSION");
  try {
    return fs.readFileSync(versionPath, "utf8").trim();
  } catch {
    return "unknown";
  }
}

function buildCommandPacket({ targetRepo, releaseVersion }) {
  const targetRemoteSsh = `git@github.com:${targetRepo}.git`;
  return {
    intent: "Prepare a fresh-history mirror locally, then stop before the external remote write.",
    operator_variables: {
      COMPANY_OS_PRIVATE_ROOT: "<absolute path to private Company.OS checkout>",
      RUN_ROOT: "$(mktemp -d -t company-os-release-XXXXXX)",
      MIRROR: "$RUN_ROOT/public-mirror",
      TARGET_REMOTE: targetRemoteSsh,
    },
    preflight_commands: [
      "cd \"$COMPANY_OS_PRIVATE_ROOT\"",
      "git status --short --branch",
      "cat VERSION",
      "node scripts/release-gates/productization-readiness.mjs check",
      "node scripts/release/verify-fresh-history-remote.mjs --json",
    ],
    packet_commands: [
      "mkdir -p \"$RUN_ROOT\"",
      "node scripts/release/build-public-mirror.mjs --out \"$MIRROR\" --verify --json > \"$RUN_ROOT/build-public-mirror.json\"",
      "node scripts/release/verify-clean-clone.mjs --root \"$MIRROR\" --json > \"$RUN_ROOT/verify-clean-clone.json\"",
      "git -C \"$MIRROR\" init --initial-branch=main",
      "git -C \"$MIRROR\" add -A",
      `git -C "$MIRROR" -c user.email=company-os-release@example.invalid -c user.name="Company.OS Release" -c commit.gpgsign=false commit -m "Company.OS ${releaseVersion} fresh-history mirror"`,
      "git -C \"$MIRROR\" remote add origin \"$TARGET_REMOTE\"",
      "git -C \"$MIRROR\" status --short --branch",
      "git -C \"$MIRROR\" log --oneline --max-count=1",
    ],
    hg25_hold_commands: [
      "# Execute only after CEO/Codex HG-2.5 release sign-off:",
      "git -C \"$MIRROR\" push -u origin main",
    ],
  };
}

export function runPrepareReleaseDestinationPacket({
  targetRepo = "",
  sourceRoot = process.cwd(),
  releaseVersion,
  now = () => new Date(),
  sourceRepo,
} = {}) {
  const resolvedSourceRoot = path.resolve(sourceRoot || "");
  const generatedAt = now().toISOString();
  const checks = [];
  const normalizedTarget = normalizeRepoName(targetRepo);
  const resolvedSourceRepo = sourceRepo ? normalizeRepoName(sourceRepo) : parseOriginRepo(resolvedSourceRoot);
  const version = resolveReleaseVersion({ sourceRoot: resolvedSourceRoot, override: releaseVersion });

  if (!targetRepo) {
    appendCheck(checks, "target-repo.present", "fail", "--target-repo is required");
    return makeResult({
      status: "REJECT",
      exit_code: STATUS_EXIT_CODES.REJECT,
      generated_at: generatedAt,
      source_root: resolvedSourceRoot,
      source_repo: resolvedSourceRepo,
      release_version: version,
      reason: "target_repo.required",
      checks,
    });
  }

  if (!REPO_RE.test(String(targetRepo).trim())) {
    appendCheck(checks, "target-repo.format", "fail", "Target repository must use owner/repo format");
    return makeResult({
      status: "REJECT",
      exit_code: STATUS_EXIT_CODES.REJECT,
      generated_at: generatedAt,
      source_root: resolvedSourceRoot,
      source_repo: resolvedSourceRepo,
      release_version: version,
      target_repo: targetRepo,
      reason: "target_repo.invalid-format",
      checks,
    });
  }

  appendCheck(checks, "target-repo.format", "pass", "Target repository uses owner/repo format");

  if (resolvedSourceRepo && normalizedTarget === resolvedSourceRepo) {
    appendCheck(
      checks,
      "target-repo.not-private-source",
      "fail",
      "Target repository matches the current private source repository",
      { source_repo: resolvedSourceRepo },
    );
    return makeResult({
      status: "REJECT",
      exit_code: STATUS_EXIT_CODES.REJECT,
      generated_at: generatedAt,
      source_root: resolvedSourceRoot,
      source_repo: resolvedSourceRepo,
      release_version: version,
      target_repo: targetRepo,
      reason: "target_repo.matches-private-source",
      checks,
    });
  }

  appendCheck(
    checks,
    "target-repo.not-private-source",
    "pass",
    "Target repository is distinct from the current private source repository",
    { source_repo: resolvedSourceRepo },
  );

  const sourceSnapshot = resolveSourceSnapshot(resolvedSourceRoot);
  appendCheck(checks, "source-snapshot.resolved", "pass", "Source git snapshot resolved", sourceSnapshot);
  appendCheck(checks, "remote-write.not-executed", "pass", "This command generated a packet only; no external remote write was executed");

  const commandPacket = buildCommandPacket({ targetRepo: String(targetRepo).trim(), releaseVersion: version });

  return makeResult({
    status: "PASS",
    exit_code: STATUS_EXIT_CODES.PASS,
    generated_at: generatedAt,
    source_root: resolvedSourceRoot,
    source_snapshot: sourceSnapshot,
    source_repo: resolvedSourceRepo,
    release_version: version,
    target_repo: String(targetRepo).trim(),
    target_remote_ssh: `git@github.com:${String(targetRepo).trim()}.git`,
    target_remote_https: `https://github.com/${String(targetRepo).trim()}.git`,
    command_packet: commandPacket,
    checks,
  });
}

function parseArgs(argv) {
  const options = {
    targetRepo: "",
    sourceRoot: process.cwd(),
    releaseVersion: "",
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--json") options.json = true;
    else {
      const nextValue = () => {
        index += 1;
        if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
        return argv[index];
      };
      if (arg === "--target-repo") options.targetRepo = nextValue();
      else if (arg === "--source-root") options.sourceRoot = nextValue();
      else if (arg === "--version") options.releaseVersion = nextValue();
      else throw new Error(`Unknown argument: ${arg}`);
    }
  }
  options.sourceRoot = path.resolve(options.sourceRoot);
  return options;
}

function printHelp() {
  process.stdout.write(
    [
      "Usage:",
      "  prepare-release-destination-packet.mjs --target-repo <owner>/<repo> [--source-root PATH] [--version VERSION] [--json]",
      "",
      "Generates a deterministic release destination packet for a later HG-2.5",
      "external remote write. This script never pushes, tags, uploads a release,",
      "rotates credentials, transitions Plane, or writes to Linear.",
      "",
      "Exit codes:",
      "  0 PASS",
      "  2 REJECT",
      "  5 RUNTIME_ERROR",
      "",
    ].join("\n"),
  );
}

function printPlain(result) {
  process.stdout.write(`RELEASE DESTINATION PACKET [${result.status}]: exit ${result.exit_code}\n`);
  if (result.reason) process.stdout.write(`  reason: ${result.reason}\n`);
  if (result.target_repo) process.stdout.write(`  target: ${result.target_repo}\n`);
  for (const check of result.checks || []) {
    process.stdout.write(`  ${check.status.toUpperCase()} ${check.id}: ${check.detail}\n`);
  }
  if (result.command_packet) {
    process.stdout.write("  held command: git -C \"$MIRROR\" push -u origin main\n");
  }
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message || String(error));
    process.exitCode = STATUS_EXIT_CODES.RUNTIME_ERROR;
    return;
  }
  if (options.help) {
    printHelp();
    return;
  }
  const result = runPrepareReleaseDestinationPacket(options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else printPlain(result);
  process.exitCode = result.exit_code;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message || String(error));
    process.exitCode = STATUS_EXIT_CODES.RUNTIME_ERROR;
  });
}
