import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildMainMirrorCommands,
  expandRegistryString,
  normalizeGitHygieneRegistry,
  parsePorcelainStatus,
  parseWorktreePorcelain,
  renderGitHygieneMarkdown,
  runGitHygieneController,
  scanSandboxRoots,
} from "./git-hygiene-core.mjs";

function makeTempRoot(prefix = "company-os-git-hygiene-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result;
}

function makeGitRoot({ dirty = false } = {}) {
  const root = makeTempRoot();
  run("git", ["init", "-b", "main"], root);
  if (dirty) fs.writeFileSync(path.join(root, "untracked.txt"), "dirty\n", "utf8");
  return root;
}

test("normalizeGitHygieneRegistry accepts object workspace registries", () => {
  const registry = normalizeGitHygieneRegistry({
    defaults: { max_worktrees: 2, default_branches: ["main"] },
    sandbox_roots: ["/tmp/sandboxes"],
    workspaces: {
      product: { path: "/tmp/product", department: "Engineering" },
      website: { root: "/tmp/website", maxWorktrees: 1 },
    },
  });

  assert.equal(registry.workspaces.length, 2);
  assert.equal(registry.workspaces[0].name, "product");
  assert.equal(registry.workspaces[0].root, "/tmp/product");
  assert.equal(registry.workspaces[0].maxWorktrees, 2);
  assert.deepEqual(registry.sandboxRoots, ["/tmp/sandboxes"]);
});

test("normalizeGitHygieneRegistry expands environment placeholders in paths", () => {
  const registry = normalizeGitHygieneRegistry({
    defaults: {
      sandbox_roots: ["${DEVELOPER_ROOT}/[SOURCE_WORKSPACE]/company-os"],
    },
    workspaces: {
      "company-os": {
        path: "${COMPANY_OS_ROOT}",
      },
    },
  }, {
    env: {
      COMPANY_OS_ROOT: "/tmp/company-os",
      DEVELOPER_ROOT: "/tmp/developer",
    },
  });

  assert.equal(expandRegistryString("${MISSING_ROOT}/repo", {}), "${MISSING_ROOT}/repo");
  assert.equal(registry.workspaces[0].root, "/tmp/company-os");
  assert.deepEqual(registry.sandboxRoots, ["/tmp/developer/[SOURCE_WORKSPACE]/company-os"]);
});

test("parsePorcelainStatus classifies dirty status lines", () => {
  const parsed = parsePorcelainStatus([" M app.js", "?? note.md", " D old.js", "UU merge.txt"].join("\n"));

  assert.equal(parsed.dirty, true);
  assert.equal(parsed.counts.total, 4);
  assert.equal(parsed.counts.modified, 1);
  assert.equal(parsed.counts.untracked, 1);
  assert.equal(parsed.counts.deleted, 1);
  assert.equal(parsed.counts.conflicted, 1);
});

test("parseWorktreePorcelain extracts branch and detached records", () => {
  const records = parseWorktreePorcelain([
    "worktree /repo",
    "HEAD abc123",
    "branch refs/heads/main",
    "",
    "worktree /repo-sandbox",
    "HEAD def456",
    "detached",
    "",
  ].join("\n"));

  assert.deepEqual(records, [
    { path: "/repo", head: "abc123", branch: "main", detached: false },
    { path: "/repo-sandbox", head: "def456", branch: "", detached: true },
  ]);
});

test("runGitHygieneController passes clean git roots and blocks dirty roots", () => {
  const cleanRoot = makeGitRoot();
  const dirtyRoot = makeGitRoot({ dirty: true });
  const missingRoot = path.join(os.tmpdir(), "company-os-missing-root");

  const result = runGitHygieneController({
    workspaces: [
      { name: "clean", root: cleanRoot },
      { name: "dirty", root: dirtyRoot },
      { name: "missing", root: missingRoot },
    ],
  }, { generatedAt: "2026-05-08T10:00:00.000Z" });

  assert.equal(result.status, "blocked");
  assert.equal(result.ok, false);
  assert.equal(result.summary.totalWorkspaces, 3);
  assert.equal(result.summary.cleanWorkspaces, 1);
  assert.equal(result.summary.dirtyWorkspaces, 1);
  assert.equal(result.summary.blockedWorkspaces, 2);
  assert.ok(result.workspaces.find((workspace) => workspace.name === "dirty").blockers.some((item) => item.includes("dirty worktree")));
  assert.ok(result.workspaces.find((workspace) => workspace.name === "missing").blockers.some((item) => item.includes("does not exist")));
});

test("runGitHygieneController blocks stashes and strict close-session drift", () => {
  const root = makeGitRoot();
  const commands = [];
  const commandRunner = ({ command, args, cwd }) => {
    commands.push({ command, args, cwd });
    const joined = args.join(" ");
    if (joined === "rev-parse --show-toplevel") return { status: 0, stdout: `${root}\n`, stderr: "" };
    if (joined === "branch --show-current") return { status: 0, stdout: "main\n", stderr: "" };
    if (joined === "rev-parse --short HEAD") return { status: 0, stdout: "abc123\n", stderr: "" };
    if (joined === "rev-parse --abbrev-ref --symbolic-full-name @{u}") return { status: 0, stdout: "origin/main\n", stderr: "" };
    if (joined === "status --porcelain=v1") return { status: 0, stdout: "", stderr: "" };
    if (joined === "stash list --format=%H") return { status: 0, stdout: "stash-a\nstash-b\n", stderr: "" };
    if (joined === "rev-list --left-right --count origin/main...HEAD") return { status: 0, stdout: "1 2\n", stderr: "" };
    if (joined === "worktree list --porcelain") return { status: 0, stdout: `worktree ${root}\nHEAD abc123\nbranch refs/heads/main\n\n`, stderr: "" };
    return { status: 1, stdout: "", stderr: `unexpected command: ${command} ${joined}` };
  };

  const result = runGitHygieneController({
    workspaces: [{ name: "product", root }],
  }, { commandRunner, closeSession: true, generatedAt: "2026-05-08T10:00:00.000Z" });

  assert.equal(result.status, "blocked");
  assert.equal(result.summary.stashedWorkspaces, 1);
  assert.equal(result.summary.totalStashEntries, 2);
  const product = result.workspaces[0];
  assert.equal(product.stashCount, 2);
  assert.ok(product.blockers.some((item) => item.includes("stash list contains 2")));
  assert.ok(product.blockers.some((item) => item.includes("ahead of upstream by 2")));
  assert.ok(product.blockers.some((item) => item.includes("behind upstream by 1")));
  assert.ok(commands.length > 0);
});

test("scanSandboxRoots blocks dirty sandbox worktrees and warns on clean leftovers", () => {
  const sandboxRoot = makeTempRoot("company-os-sandbox-root-");
  const cleanSandbox = path.join(sandboxRoot, "product", "clean");
  const dirtySandbox = path.join(sandboxRoot, "product", "dirty");
  fs.mkdirSync(cleanSandbox, { recursive: true });
  fs.mkdirSync(dirtySandbox, { recursive: true });
  run("git", ["init", "-b", "main"], cleanSandbox);
  run("git", ["init", "-b", "main"], dirtySandbox);
  fs.writeFileSync(path.join(dirtySandbox, "change.txt"), "dirty\n", "utf8");

  const [result] = scanSandboxRoots([sandboxRoot]);

  assert.equal(result.status, "blocked");
  assert.equal(result.worktrees.length, 2);
  assert.equal(result.worktrees.filter((worktree) => worktree.dirty).length, 1);
  assert.ok(result.blockers.some((item) => item.includes("dirty sandbox worktree")));
  assert.ok(result.warnings.some((item) => item.includes("clean sandbox worktree remains")));
});

test("renderGitHygieneMarkdown emits controller-readable sections", () => {
  const result = {
    generatedAt: "2026-05-08T10:00:00.000Z",
    status: "needs_attention",
    ok: true,
    summary: {
      totalWorkspaces: 1,
      cleanWorkspaces: 0,
      needsAttentionWorkspaces: 1,
      blockedWorkspaces: 0,
      dirtyWorkspaces: 0,
      stashedWorkspaces: 0,
      totalStashEntries: 0,
      sandboxRoots: 0,
      sandboxWorktrees: 0,
      dirtySandboxWorktrees: 0,
      blockerCount: 0,
      warningCount: 1,
    },
    workspaces: [
      {
        name: "website",
        status: "needs_attention",
        branch: "main",
        commit: "abc123",
        dirty: false,
        stashCount: 0,
        ahead: 2,
        behind: 0,
        worktreeCount: 1,
        blockers: [],
        warnings: ["local branch is ahead of upstream by 2 commit(s)"],
      },
    ],
    sandboxes: [],
  };

  const markdown = renderGitHygieneMarkdown(result);

  assert.match(markdown, /^# Git Worktree Hygiene Controller/m);
  assert.match(markdown, /\| website \| needs_attention \| main \| abc123 \| no \| 0 \| 2 \| 0 \| 1 \| 0 \| 1 \|/);
  assert.match(markdown, /This controller never runs `git reset`/);
});

test("runGitHygieneController blocks excess worktrees beyond maxWorktrees", () => {
  const root = makeTempRoot("company-os-excess-wt-");
  const commandRunner = ({ args }) => {
    const joined = args.join(" ");
    if (joined === "rev-parse --show-toplevel") return { status: 0, stdout: `${root}\n`, stderr: "" };
    if (joined === "branch --show-current") return { status: 0, stdout: "main\n", stderr: "" };
    if (joined === "rev-parse --short HEAD") return { status: 0, stdout: "abc123\n", stderr: "" };
    if (joined === "rev-parse --abbrev-ref --symbolic-full-name @{u}") return { status: 0, stdout: "origin/main\n", stderr: "" };
    if (joined === "status --porcelain=v1") return { status: 0, stdout: "", stderr: "" };
    if (joined === "stash list --format=%H") return { status: 0, stdout: "", stderr: "" };
    if (joined === "rev-list --left-right --count origin/main...HEAD") return { status: 0, stdout: "0 0\n", stderr: "" };
    if (joined === "worktree list --porcelain") {
      return {
        status: 0,
        stdout: [
          `worktree ${root}`, "HEAD abc123", "branch refs/heads/main", "",
          `worktree ${root}-wt1`, "HEAD abc123", "branch refs/heads/feature-a", "",
          `worktree ${root}-wt2`, "HEAD abc123", "branch refs/heads/feature-b", "",
        ].join("\n"),
        stderr: "",
      };
    }
    return { status: 1, stdout: "", stderr: `unexpected: ${joined}` };
  };

  const result = runGitHygieneController({
    workspaces: [{ name: "product", root, maxWorktrees: 1 }],
  }, { commandRunner, generatedAt: "2026-05-20T10:00:00.000Z" });

  assert.equal(result.status, "blocked");
  const product = result.workspaces[0];
  assert.ok(product.blockers.some((item) => item.includes("worktree count 3 exceeds max 1")));
});

test("inspectWorkspaceGitHygiene blocks detached HEAD root unless allowDetached is set", () => {
  const root = makeTempRoot("company-os-detached-root-");
  const commandRunner = ({ args }) => {
    const joined = args.join(" ");
    if (joined === "rev-parse --show-toplevel") return { status: 0, stdout: `${root}\n`, stderr: "" };
    if (joined === "branch --show-current") return { status: 0, stdout: "", stderr: "" };
    if (joined === "rev-parse --short HEAD") return { status: 0, stdout: "deadbeef\n", stderr: "" };
    if (joined === "rev-parse --abbrev-ref --symbolic-full-name @{u}") return { status: 1, stdout: "", stderr: "no upstream" };
    if (joined === "status --porcelain=v1") return { status: 0, stdout: "", stderr: "" };
    if (joined === "stash list --format=%H") return { status: 0, stdout: "", stderr: "" };
    if (joined === "worktree list --porcelain") return { status: 0, stdout: `worktree ${root}\nHEAD deadbeef\ndetached\n\n`, stderr: "" };
    return { status: 1, stdout: "", stderr: `unexpected: ${joined}` };
  };

  const result = runGitHygieneController({
    workspaces: [{ name: "product", root }],
  }, { commandRunner, generatedAt: "2026-05-20T10:00:00.000Z" });

  assert.equal(result.status, "blocked");
  assert.ok(result.workspaces[0].blockers.some((item) => item.includes("detached HEAD")));
});

test("scanSandboxRoots warns on detached HEAD sandbox worktrees", () => {
  const sandboxRoot = makeTempRoot("company-os-sandbox-detached-root-");
  const detachedSandbox = path.join(sandboxRoot, "product", "detached");
  fs.mkdirSync(detachedSandbox, { recursive: true });
  run("git", ["init", "-b", "main"], detachedSandbox);
  run("git", ["-c", "user.email=test@test.com", "-c", "user.name=Test", "commit", "--allow-empty", "-m", "init"], detachedSandbox);
  run("git", ["checkout", "--detach", "HEAD"], detachedSandbox);

  const [result] = scanSandboxRoots([sandboxRoot]);

  assert.equal(result.worktrees.length, 1);
  assert.ok(result.worktrees[0].warnings.some((item) => item.includes("detached HEAD in sandbox worktree")));
});

test("buildMainMirrorCommands emits the non-reset main mirror sequence", () => {
  assert.deepEqual(buildMainMirrorCommands({ branch: "develop", upstream: "upstream/develop" }), [
    ["fetch", "upstream", "--prune"],
    ["switch", "--detach", "upstream/develop"],
    ["branch", "-f", "develop", "upstream/develop"],
    ["switch", "develop"],
  ]);
});
