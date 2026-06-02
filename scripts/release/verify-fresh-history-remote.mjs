#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { runBootstrap } from "../install/bootstrap-core.mjs";
import { runBuildPublicMirror } from "./build-public-mirror.mjs";
import { runVerifyCleanClone } from "./verify-clean-clone.mjs";

export const FRESH_HISTORY_REMOTE_VERIFIER_VERSION = "verify-fresh-history-remote/v0";

export const STATUS_EXIT_CODES = {
  PASS: 0,
  BUILD_FAILED: 1,
  GIT_REMOTE_FAILED: 2,
  CLEAN_CLONE_FAILED: 3,
  BOOTSTRAP_FAILED: 4,
  RUNTIME_ERROR: 5,
};

function makeResult(fields) {
  return {
    version: FRESH_HISTORY_REMOTE_VERIFIER_VERSION,
    status: "RUNTIME_ERROR",
    exit_code: STATUS_EXIT_CODES.RUNTIME_ERROR,
    generated_at: new Date().toISOString(),
    source_root: null,
    source_snapshot: null,
    run_root: null,
    run_root_retained: false,
    public_mirror: null,
    local_bare_remote: null,
    remote_clone: null,
    bootstrap_target: null,
    checks: [],
    ...fields,
  };
}

function appendCheck(checks, id, status, detail, evidence = {}) {
  checks.push({ id, status, detail, evidence });
}

function runGit({ gitBin, cwd, args }) {
  return execFileSync(gitBin, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function initGitRepository({ gitBin, cwd }) {
  try {
    runGit({ gitBin, cwd, args: ["init", "--quiet", "--initial-branch=main"] });
  } catch {
    runGit({ gitBin, cwd, args: ["init", "--quiet"] });
    runGit({ gitBin, cwd, args: ["symbolic-ref", "HEAD", "refs/heads/main"] });
  }
}

function initFreshHistoryRemote({
  gitBin,
  publicMirror,
  localBareRemote,
  remoteClone,
}) {
  initGitRepository({ gitBin, cwd: publicMirror });
  runGit({ gitBin, cwd: publicMirror, args: ["add", "-A"] });
  runGit({
    gitBin,
    cwd: publicMirror,
    args: [
      "-c",
      "user.email=company-os-release@example.invalid",
      "-c",
      "user.name=Company.OS Release Verifier",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--quiet",
      "--allow-empty",
      "-m",
      "Initial Company.OS public mirror",
    ],
  });
  const publicHead = runGit({ gitBin, cwd: publicMirror, args: ["rev-parse", "HEAD"] });

  runGit({ gitBin, cwd: path.dirname(localBareRemote), args: ["init", "--bare", "--quiet", localBareRemote] });
  runGit({ gitBin, cwd: publicMirror, args: ["remote", "add", "origin", localBareRemote] });
  runGit({ gitBin, cwd: publicMirror, args: ["push", "--quiet", "origin", "HEAD:refs/heads/main"] });
  runGit({ gitBin, cwd: path.dirname(remoteClone), args: ["clone", "--quiet", localBareRemote, remoteClone] });
  const cloneHead = runGit({ gitBin, cwd: remoteClone, args: ["rev-parse", "HEAD"] });

  return { publicHead, cloneHead };
}

function cleanupRunRoot({ runRoot, keepTemp, status }) {
  if (!runRoot) return false;
  if (keepTemp || status !== "PASS") return true;
  try {
    fs.rmSync(runRoot, { recursive: true, force: true });
    return false;
  } catch {
    return true;
  }
}

function resolveSourceSnapshot({ sourceRoot, gitBin }) {
  try {
    const head = runGit({ gitBin, cwd: sourceRoot, args: ["rev-parse", "HEAD"] });
    const status = runGit({
      gitBin,
      cwd: sourceRoot,
      args: ["status", "--porcelain"],
    });
    const dirty = status.trim().length > 0;
    return {
      head,
      dirty,
      label: dirty ? `${head}+working-tree` : head,
    };
  } catch {
    return {
      head: null,
      dirty: null,
      label: "unknown-source-snapshot",
    };
  }
}

export async function runVerifyFreshHistoryRemote({
  sourceRoot = process.cwd(),
  tempDir = os.tmpdir(),
  keepTemp = false,
  gitBin = "git",
  now = () => new Date(),
} = {}) {
  const generatedAt = now().toISOString();
  const checks = [];
  const resolvedSourceRoot = path.resolve(sourceRoot || "");
  const resolvedTempDir = path.resolve(tempDir || os.tmpdir());

  if (!fs.existsSync(resolvedSourceRoot)) {
    return makeResult({
      generated_at: generatedAt,
      source_root: resolvedSourceRoot,
      reason: `source.not-found: ${resolvedSourceRoot}`,
      checks,
    });
  }

  let runRoot = null;
  try {
    fs.mkdirSync(resolvedTempDir, { recursive: true });
    runRoot = fs.mkdtempSync(path.join(resolvedTempDir, "company-os-fresh-history-"));
  } catch (error) {
    return makeResult({
      generated_at: generatedAt,
      source_root: resolvedSourceRoot,
      reason: `temp-root.failed: ${error.message || String(error)}`,
      checks,
    });
  }

  const publicMirror = path.join(runRoot, "public-mirror");
  const localBareRemote = path.join(runRoot, "public-mirror.git");
  const remoteClone = path.join(runRoot, "remote-clone");
  const bootstrapTarget = path.join(runRoot, "fresh-company-target");
  const sourceSnapshot = resolveSourceSnapshot({ sourceRoot: resolvedSourceRoot, gitBin });

  try {
    const build = await runBuildPublicMirror({
      sourceRoot: resolvedSourceRoot,
      outRoot: publicMirror,
      verify: true,
      sourceSha: sourceSnapshot.label,
      now,
    });
    appendCheck(
      checks,
      "public-mirror.build",
      build.status === "PASS" ? "pass" : "fail",
      build.status === "PASS"
        ? `Public mirror build passed with ${build.output_file_count} output files`
        : `Public mirror build failed with status ${build.status}`,
      {
        status: build.status,
        output_file_count: build.output_file_count,
        source_sha: build.source_sha,
        source_snapshot: sourceSnapshot,
        blocker_summary: build.blocker_summary,
      },
    );
    if (build.status !== "PASS") {
      const status = "BUILD_FAILED";
      const retained = cleanupRunRoot({ runRoot, keepTemp, status });
      return makeResult({
        status,
        exit_code: STATUS_EXIT_CODES[status],
        generated_at: generatedAt,
        source_root: resolvedSourceRoot,
        source_snapshot: sourceSnapshot,
        run_root: runRoot,
        run_root_retained: retained,
        public_mirror: publicMirror,
        checks,
      });
    }

    let gitEvidence;
    try {
      gitEvidence = initFreshHistoryRemote({
        gitBin,
        publicMirror,
        localBareRemote,
        remoteClone,
      });
      appendCheck(
        checks,
        "fresh-history.local-remote",
        "pass",
        "Pushed to a local temp bare Git remote and cloned from that remote",
        {
          remote_kind: "local-bare-temp",
          public_head: gitEvidence.publicHead,
          clone_head: gitEvidence.cloneHead,
        },
      );
      if (gitEvidence.publicHead !== gitEvidence.cloneHead) {
        throw new Error("clone HEAD does not match pushed public mirror HEAD");
      }
    } catch (error) {
      appendCheck(
        checks,
        "fresh-history.local-remote",
        "fail",
        `Local fresh-history remote failed: ${error.message || String(error)}`,
      );
      const status = "GIT_REMOTE_FAILED";
      const retained = cleanupRunRoot({ runRoot, keepTemp, status });
      return makeResult({
        status,
        exit_code: STATUS_EXIT_CODES[status],
        generated_at: generatedAt,
        source_root: resolvedSourceRoot,
        source_snapshot: sourceSnapshot,
        run_root: runRoot,
        run_root_retained: retained,
        public_mirror: publicMirror,
        local_bare_remote: localBareRemote,
        remote_clone: remoteClone,
        checks,
      });
    }

    const cleanClone = await runVerifyCleanClone({
      root: remoteClone,
      tempDir: runRoot,
      keepTemp,
      gitBin,
      now,
      tempLabel: "clean-clone-",
    });
    appendCheck(
      checks,
      "remote-clone.verify-clean-clone",
      cleanClone.status === "PASS" ? "pass" : "fail",
      cleanClone.status === "PASS"
        ? "Clean-clone verifier passed on the clone produced from the local bare remote"
        : `Clean-clone verifier failed with status ${cleanClone.status}`,
      {
        status: cleanClone.status,
        checks: cleanClone.checks.map((check) => ({
          id: check.id,
          status: check.status,
          detail: check.detail,
        })),
      },
    );
    if (cleanClone.status !== "PASS") {
      const status = "CLEAN_CLONE_FAILED";
      const retained = cleanupRunRoot({ runRoot, keepTemp, status });
      return makeResult({
        status,
        exit_code: STATUS_EXIT_CODES[status],
        generated_at: generatedAt,
        source_root: resolvedSourceRoot,
        source_snapshot: sourceSnapshot,
        run_root: runRoot,
        run_root_retained: retained,
        public_mirror: publicMirror,
        local_bare_remote: localBareRemote,
        remote_clone: remoteClone,
        checks,
      });
    }

    const bootstrap = runBootstrap({
      source: remoteClone,
      target: bootstrapTarget,
      dryRun: false,
      force: false,
    });
    appendCheck(
      checks,
      "remote-clone.bootstrap-install",
      bootstrap.ok ? "pass" : "fail",
      bootstrap.ok
        ? `Bootstrap install copied ${bootstrap.files_copied.length} files into a fresh target`
        : `Bootstrap install failed with status ${bootstrap.status}`,
      {
        status: bootstrap.status,
        files_copied: bootstrap.files_copied.length,
        collisions: bootstrap.collisions,
      },
    );
    if (!bootstrap.ok) {
      const status = "BOOTSTRAP_FAILED";
      const retained = cleanupRunRoot({ runRoot, keepTemp, status });
      return makeResult({
        status,
        exit_code: STATUS_EXIT_CODES[status],
        generated_at: generatedAt,
        source_root: resolvedSourceRoot,
        source_snapshot: sourceSnapshot,
        run_root: runRoot,
        run_root_retained: retained,
        public_mirror: publicMirror,
        local_bare_remote: localBareRemote,
        remote_clone: remoteClone,
        bootstrap_target: bootstrapTarget,
        checks,
      });
    }

    const status = "PASS";
    const retained = cleanupRunRoot({ runRoot, keepTemp, status });
    return makeResult({
      status,
      exit_code: STATUS_EXIT_CODES[status],
      generated_at: generatedAt,
      source_root: resolvedSourceRoot,
      source_snapshot: sourceSnapshot,
      run_root: runRoot,
      run_root_retained: retained,
      public_mirror: publicMirror,
      local_bare_remote: localBareRemote,
      remote_clone: remoteClone,
      bootstrap_target: bootstrapTarget,
      public_head: gitEvidence.publicHead,
      clone_head: gitEvidence.cloneHead,
      checks,
    });
  } catch (error) {
    appendCheck(checks, "runtime.unhandled", "fail", error.message || String(error));
    const status = "RUNTIME_ERROR";
    const retained = cleanupRunRoot({ runRoot, keepTemp, status });
    return makeResult({
      status,
      exit_code: STATUS_EXIT_CODES[status],
      generated_at: generatedAt,
      source_root: resolvedSourceRoot,
      run_root: runRoot,
      run_root_retained: retained,
      public_mirror: publicMirror,
      local_bare_remote: localBareRemote,
      remote_clone: remoteClone,
      bootstrap_target: bootstrapTarget,
      reason: error.message || String(error),
      checks,
      source_snapshot: sourceSnapshot,
    });
  }
}

function parseArgs(argv) {
  const options = {
    sourceRoot: process.cwd(),
    tempDir: os.tmpdir(),
    keepTemp: false,
    gitBin: "git",
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--keep-temp") options.keepTemp = true;
    else {
      const nextValue = () => {
        index += 1;
        if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
        return argv[index];
      };
      if (arg === "--source-root") options.sourceRoot = nextValue();
      else if (arg === "--temp-dir") options.tempDir = nextValue();
      else if (arg === "--git-bin") options.gitBin = nextValue();
      else throw new Error(`Unknown argument: ${arg}`);
    }
  }
  options.sourceRoot = path.resolve(options.sourceRoot);
  options.tempDir = path.resolve(options.tempDir);
  return options;
}

function printHelp() {
  process.stdout.write(
    [
      "Usage:",
      "  verify-fresh-history-remote.mjs [--source-root PATH] [--temp-dir PATH] [--keep-temp] [--json]",
      "",
      "Builds a sanitized public mirror, initializes it as a fresh-history Git",
      "repository, pushes only to a local temp bare remote, clones from that",
      "remote, runs clean-clone verification, and bootstraps the Company.OS kit",
      "into a fresh target.",
      "",
      "No public remote push, tag, deploy, production write, credential rotation",
      "or Plane transition is performed.",
      "",
      "Exit codes:",
      "  0 PASS",
      "  1 BUILD_FAILED",
      "  2 GIT_REMOTE_FAILED",
      "  3 CLEAN_CLONE_FAILED",
      "  4 BOOTSTRAP_FAILED",
      "  5 RUNTIME_ERROR",
      "",
    ].join("\n"),
  );
}

function printPlain(result) {
  process.stdout.write(`FRESH HISTORY REMOTE [${result.status}]: exit ${result.exit_code}\n`);
  if (result.reason) process.stdout.write(`  reason: ${result.reason}\n`);
  for (const check of result.checks || []) {
    process.stdout.write(`  ${check.status.toUpperCase()} ${check.id}: ${check.detail}\n`);
  }
  if (result.run_root) {
    process.stdout.write(
      `  run_root${result.run_root_retained ? " (retained)" : " (deleted)"}: ${result.run_root}\n`,
    );
  }
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = STATUS_EXIT_CODES.RUNTIME_ERROR;
    return;
  }
  if (options.help) {
    printHelp();
    return;
  }
  const result = await runVerifyFreshHistoryRemote(options);
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
