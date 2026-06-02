import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const GIT_HYGIENE_VERSION = "git-hygiene-controller/v1";

function toPosix(value) {
  return String(value || "").split(path.sep).join("/");
}

function escapeTable(value) {
  return String(value ?? "-").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim() || "-";
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeExpectedBranches(workspace, defaults) {
  const branches =
    workspace.expectedBranches ||
    workspace.expected_branches ||
    workspace.defaultBranches ||
    workspace.default_branches ||
    defaults.expectedBranches ||
    defaults.expected_branches ||
    defaults.defaultBranches ||
    defaults.default_branches ||
    ["main", "master"];
  return asArray(branches).map(String).filter(Boolean);
}

function boolValue(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function numberValue(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function expandRegistryString(value, env = process.env) {
  if (typeof value !== "string") return value;
  return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, name) => {
    const replacement = env[name];
    return replacement === undefined || replacement === "" ? match : replacement;
  });
}

function normalizeWorkspace(workspace, index, defaults = {}, key = "", env = process.env) {
  if (!workspace || typeof workspace !== "object") {
    throw new Error(`workspace[${index}] must be an object`);
  }
  const root = expandRegistryString(workspace.root || workspace.path, env);
  if (!root || typeof root !== "string") {
    throw new Error(`workspace[${index}].root or .path must be a string`);
  }
  return {
    name: workspace.name || key || path.basename(root),
    root,
    expectedBranches: normalizeExpectedBranches(workspace, defaults),
    integrationBranch: workspace.integrationBranch || workspace.integration_branch || defaults.integrationBranch || defaults.integration_branch || "main",
    maxWorktrees: numberValue(workspace.maxWorktrees ?? workspace.max_worktrees ?? defaults.maxWorktrees ?? defaults.max_worktrees, 1),
    allowDirty: boolValue(workspace.allowDirty ?? workspace.allow_dirty ?? defaults.allowDirty ?? defaults.allow_dirty, false),
    allowDetached: boolValue(workspace.allowDetached ?? workspace.allow_detached ?? defaults.allowDetached ?? defaults.allow_detached, false),
    allowStashes: boolValue(workspace.allowStashes ?? workspace.allow_stashes ?? defaults.allowStashes ?? defaults.allow_stashes, false),
    allowNoUpstream: boolValue(workspace.allowNoUpstream ?? workspace.allow_no_upstream ?? defaults.allowNoUpstream ?? defaults.allow_no_upstream, false),
    requireUpstream: boolValue(workspace.requireUpstream ?? workspace.require_upstream ?? defaults.requireUpstream ?? defaults.require_upstream, false),
  };
}

export function normalizeGitHygieneRegistry(registry, options = {}) {
  const env = options.env || process.env;
  const defaults = registry?.defaults || {};
  let rawWorkspaces;
  if (Array.isArray(registry)) rawWorkspaces = registry.map((workspace, index) => [String(index), workspace]);
  else if (Array.isArray(registry?.workspaces)) rawWorkspaces = registry.workspaces.map((workspace, index) => [String(index), workspace]);
  else if (registry?.workspaces && typeof registry.workspaces === "object") rawWorkspaces = Object.entries(registry.workspaces);
  else throw new Error("registry must be an array or an object with workspaces");

  const sandboxRoots = [
    ...asArray(registry?.sandboxRoots),
    ...asArray(registry?.sandbox_roots),
    ...asArray(defaults.sandboxRoots),
    ...asArray(defaults.sandbox_roots),
  ].map((item) => expandRegistryString(String(item), env)).filter(Boolean);

  return {
    schema_version: registry?.schema_version || "company-os-git-hygiene/v1",
    generated_from: registry?.company?.name || registry?.name || "",
    defaults,
    sandboxRoots,
    workspaces: rawWorkspaces.map(([key, workspace], index) => normalizeWorkspace(workspace, index, defaults, key, env)),
  };
}

export function readGitHygieneRegistry(filePath, options = {}) {
  return normalizeGitHygieneRegistry(JSON.parse(fs.readFileSync(filePath, "utf8")), options);
}

function defaultCommandRunner({ command, args, cwd }) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runGit({ cwd, args, commandRunner = defaultCommandRunner }) {
  const result = commandRunner({ command: "git", args, cwd });
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim(),
  };
}

export function parsePorcelainStatus(stdout) {
  const lines = String(stdout || "").split(/\r?\n/).filter(Boolean);
  const counts = {
    total: lines.length,
    untracked: 0,
    modified: 0,
    deleted: 0,
    renamed: 0,
    conflicted: 0,
    other: 0,
  };

  for (const line of lines) {
    const status = line.slice(0, 2);
    if (status === "??") counts.untracked += 1;
    else if (status.includes("U") || status === "AA" || status === "DD") counts.conflicted += 1;
    else if (status.includes("R")) counts.renamed += 1;
    else if (status.includes("D")) counts.deleted += 1;
    else if (status.includes("M") || status.includes("A")) counts.modified += 1;
    else counts.other += 1;
  }

  return { dirty: lines.length > 0, counts, entries: lines };
}

export function parseWorktreePorcelain(stdout) {
  const records = [];
  let current = null;

  function pushCurrent() {
    if (current?.path) records.push(current);
    current = null;
  }

  for (const line of String(stdout || "").split(/\r?\n/)) {
    if (!line.trim()) {
      pushCurrent();
      continue;
    }
    if (line.startsWith("worktree ")) {
      pushCurrent();
      current = { path: line.slice("worktree ".length), head: "", branch: "", detached: false };
      continue;
    }
    if (!current) current = { path: "", head: "", branch: "", detached: false };
    if (line.startsWith("HEAD ")) current.head = line.slice("HEAD ".length);
    else if (line.startsWith("branch ")) current.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
    else if (line === "detached") current.detached = true;
  }
  pushCurrent();
  return records;
}

function parseAheadBehind(stdout) {
  const [behind, ahead] = String(stdout || "").trim().split(/\s+/).map((value) => Number(value));
  return {
    ahead: Number.isFinite(ahead) ? ahead : 0,
    behind: Number.isFinite(behind) ? behind : 0,
  };
}

function inspectGitDirectory({ root, commandRunner = defaultCommandRunner, includeWorktrees = true } = {}) {
  const gitRoot = runGit({ cwd: root, args: ["rev-parse", "--show-toplevel"], commandRunner });
  if (!gitRoot.ok) {
    return {
      isGit: false,
      branch: "",
      commit: "",
      detached: false,
      upstream: "",
      ahead: 0,
      behind: 0,
      stashCount: 0,
      status: parsePorcelainStatus(""),
      worktrees: [],
      warnings: [`not a git worktree: ${gitRoot.stderr || root}`],
    };
  }

  const branchResult = runGit({ cwd: root, args: ["branch", "--show-current"], commandRunner });
  const commitResult = runGit({ cwd: root, args: ["rev-parse", "--short", "HEAD"], commandRunner });
  const upstreamResult = runGit({ cwd: root, args: ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], commandRunner });
  const statusResult = runGit({ cwd: root, args: ["status", "--porcelain=v1"], commandRunner });
  const stashResult = runGit({ cwd: root, args: ["stash", "list", "--format=%H"], commandRunner });
  const warnings = [];

  let ahead = 0;
  let behind = 0;
  if (upstreamResult.ok) {
    const revList = runGit({ cwd: root, args: ["rev-list", "--left-right", "--count", `${upstreamResult.stdout}...HEAD`], commandRunner });
    if (revList.ok) ({ ahead, behind } = parseAheadBehind(revList.stdout));
    else warnings.push(`could not calculate ahead/behind: ${revList.stderr}`);
  }

  let worktrees = [];
  if (includeWorktrees) {
    const worktreeResult = runGit({ cwd: root, args: ["worktree", "list", "--porcelain"], commandRunner });
    if (worktreeResult.ok) worktrees = parseWorktreePorcelain(worktreeResult.stdout);
    else warnings.push(`could not list worktrees: ${worktreeResult.stderr}`);
  }

  const branch = branchResult.stdout || "";
  return {
    isGit: true,
    branch,
    commit: commitResult.ok ? commitResult.stdout : "",
    detached: !branch,
    upstream: upstreamResult.ok ? upstreamResult.stdout : "",
    ahead,
    behind,
    stashCount: stashResult.ok ? String(stashResult.stdout || "").split(/\r?\n/).filter(Boolean).length : 0,
    status: parsePorcelainStatus(statusResult.ok ? statusResult.stdout : ""),
    worktrees,
    warnings,
  };
}

export function inspectWorkspaceGitHygiene(workspace, options = {}) {
  const root = path.resolve(workspace.root);
  const blockers = [];
  const warnings = [];

  if (!fs.existsSync(root)) {
    return {
      name: workspace.name,
      root,
      status: "blocked",
      branch: "",
      commit: "",
      upstream: "",
      ahead: 0,
      behind: 0,
      stashCount: 0,
      dirty: false,
      dirtyCounts: parsePorcelainStatus("").counts,
      worktreeCount: 0,
      expectedBranches: workspace.expectedBranches,
      maxWorktrees: workspace.maxWorktrees,
      blockers: [`workspace root does not exist: ${root}`],
      warnings,
    };
  }

  const git = inspectGitDirectory({ root, commandRunner: options.commandRunner });
  const strictClean = boolValue(options.strictClean ?? options.closeSession ?? options.close_session, false);
  warnings.push(...git.warnings);
  if (!git.isGit) blockers.push(`workspace is not a git worktree: ${root}`);

  if (git.status.dirty && !workspace.allowDirty) {
    blockers.push(`dirty worktree with ${git.status.counts.total} changed/untracked path(s)`);
  }
  if (git.detached && !workspace.allowDetached) blockers.push("detached HEAD is not allowed for this workspace");
  if (workspace.expectedBranches.length && git.branch && !workspace.expectedBranches.includes(git.branch)) {
    const message = `root branch '${git.branch}' is not in expected branches: ${workspace.expectedBranches.join(", ")}`;
    if (strictClean) blockers.push(message);
    else warnings.push(message);
  }
  if (git.stashCount > 0 && !workspace.allowStashes) blockers.push(`stash list contains ${git.stashCount} entry(s)`);
  if ((workspace.requireUpstream || strictClean) && !git.upstream && !workspace.allowNoUpstream) {
    const message = "no upstream configured";
    if (strictClean) blockers.push(message);
    else warnings.push(message);
  }
  if (git.ahead > 0) {
    const message = `local branch is ahead of upstream by ${git.ahead} commit(s)`;
    if (strictClean) blockers.push(message);
    else warnings.push(message);
  }
  if (git.behind > 0) {
    const message = `local branch is behind upstream by ${git.behind} commit(s)`;
    if (strictClean) blockers.push(message);
    else warnings.push(message);
  }
  if (git.worktrees.length > workspace.maxWorktrees) {
    blockers.push(`git worktree count ${git.worktrees.length} exceeds max ${workspace.maxWorktrees}`);
  }

  return {
    name: workspace.name,
    root,
    status: blockers.length ? "blocked" : warnings.length ? "needs_attention" : "clean",
    branch: git.branch || "(detached)",
    commit: git.commit,
    upstream: git.upstream,
    ahead: git.ahead,
    behind: git.behind,
    stashCount: git.stashCount,
    dirty: git.status.dirty,
    dirtyCounts: git.status.counts,
    worktreeCount: git.worktrees.length,
    worktrees: git.worktrees,
    expectedBranches: workspace.expectedBranches,
    maxWorktrees: workspace.maxWorktrees,
    blockers,
    warnings,
  };
}

function findGitDirectories(root, maxDepth = 3) {
  const found = [];
  function walk(current, depth) {
    if (depth < 0 || !fs.existsSync(current)) return;
    const gitMarker = path.join(current, ".git");
    if (fs.existsSync(gitMarker)) {
      found.push(current);
      return;
    }
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      walk(path.join(current, entry.name), depth - 1);
    }
  }
  walk(root, maxDepth);
  return found;
}

export function scanSandboxRoots(sandboxRoots, options = {}) {
  return asArray(sandboxRoots).map((sandboxRoot) => {
    const root = path.resolve(sandboxRoot);
    if (!fs.existsSync(root)) {
      return {
        root,
        status: "clean",
        worktrees: [],
        blockers: [],
        warnings: [],
      };
    }

    const worktrees = findGitDirectories(root, options.maxDepth ?? 3).map((worktreeRoot) => {
      const git = inspectGitDirectory({ root: worktreeRoot, commandRunner: options.commandRunner, includeWorktrees: false });
      const blockers = [];
      const warnings = [];
      if (!git.isGit) blockers.push("sandbox path is not a git worktree");
      if (git.status.dirty) blockers.push(`dirty sandbox worktree with ${git.status.counts.total} changed/untracked path(s)`);
      else warnings.push("clean sandbox worktree remains and should be archived or removed after controller review");
      if (git.detached) warnings.push("detached HEAD in sandbox worktree; commits may exist outside any named branch");
      return {
        root: worktreeRoot,
        branch: git.branch || "(detached)",
        commit: git.commit,
        dirty: git.status.dirty,
        dirtyCounts: git.status.counts,
        status: blockers.length ? "blocked" : "needs_attention",
        blockers,
        warnings,
      };
    });

    const blockers = worktrees.flatMap((worktree) => worktree.blockers.map((blocker) => `${worktree.root}: ${blocker}`));
    const warnings = worktrees.flatMap((worktree) => worktree.warnings.map((warning) => `${worktree.root}: ${warning}`));
    return {
      root,
      status: blockers.length ? "blocked" : warnings.length ? "needs_attention" : "clean",
      worktrees,
      blockers,
      warnings,
    };
  });
}

export function runGitHygieneController(registry, options = {}) {
  const normalized =
    Array.isArray(registry?.workspaces) &&
    Array.isArray(registry?.sandboxRoots) &&
    registry.workspaces.every((workspace) => Array.isArray(workspace.expectedBranches))
      ? registry
      : normalizeGitHygieneRegistry(registry);
  const workspaces = normalized.workspaces.map((workspace) => inspectWorkspaceGitHygiene(workspace, options));
  const sandboxRoots = [
    ...normalized.sandboxRoots,
    ...asArray(options.sandboxRoots),
  ];
  const sandboxes = scanSandboxRoots(sandboxRoots, options);
  const workspaceBlockers = workspaces.flatMap((workspace) => workspace.blockers);
  const sandboxBlockers = sandboxes.flatMap((sandbox) => sandbox.blockers);
  const workspaceWarnings = workspaces.flatMap((workspace) => workspace.warnings);
  const sandboxWarnings = sandboxes.flatMap((sandbox) => sandbox.warnings);
  const blockerCount = workspaceBlockers.length + sandboxBlockers.length;
  const warningCount = workspaceWarnings.length + sandboxWarnings.length;
  const status = blockerCount ? "blocked" : warningCount ? "needs_attention" : "clean";

  return {
    version: GIT_HYGIENE_VERSION,
    generatedAt: options.generatedAt || new Date().toISOString(),
    status,
    ok: status !== "blocked",
    summary: {
      totalWorkspaces: workspaces.length,
      cleanWorkspaces: workspaces.filter((workspace) => workspace.status === "clean").length,
      needsAttentionWorkspaces: workspaces.filter((workspace) => workspace.status === "needs_attention").length,
      blockedWorkspaces: workspaces.filter((workspace) => workspace.status === "blocked").length,
      dirtyWorkspaces: workspaces.filter((workspace) => workspace.dirty).length,
      stashedWorkspaces: workspaces.filter((workspace) => (workspace.stashCount ?? 0) > 0).length,
      totalStashEntries: workspaces.reduce((sum, workspace) => sum + (workspace.stashCount ?? 0), 0),
      sandboxRoots: sandboxes.length,
      sandboxWorktrees: sandboxes.reduce((sum, sandbox) => sum + sandbox.worktrees.length, 0),
      dirtySandboxWorktrees: sandboxes.reduce((sum, sandbox) => sum + sandbox.worktrees.filter((worktree) => worktree.dirty).length, 0),
      blockerCount,
      warningCount,
    },
    workspaces,
    sandboxes,
  };
}

export function buildMainMirrorCommands({ branch = "main", upstream = "origin/main" } = {}) {
  if (!branch || !upstream) throw new Error("branch and upstream are required");
  const remote = upstream.includes("/") ? upstream.split("/")[0] : "origin";
  return [
    ["fetch", remote, "--prune"],
    ["switch", "--detach", upstream],
    ["branch", "-f", branch, upstream],
    ["switch", branch],
  ];
}

export function renderGitHygieneMarkdown(result) {
  const lines = [
    "# Git Worktree Hygiene Controller",
    "",
    `Generated: ${result.generatedAt}`,
    `Status: \`${result.status}\``,
    `OK: \`${result.ok}\``,
    "",
    "## Summary",
    "",
    `- Total workspaces: ${result.summary.totalWorkspaces}`,
    `- Clean workspaces: ${result.summary.cleanWorkspaces}`,
    `- Needs attention: ${result.summary.needsAttentionWorkspaces}`,
    `- Blocked workspaces: ${result.summary.blockedWorkspaces}`,
    `- Dirty workspaces: ${result.summary.dirtyWorkspaces}`,
    `- Workspaces with stashes: ${result.summary.stashedWorkspaces}`,
    `- Total stash entries: ${result.summary.totalStashEntries}`,
    `- Sandbox roots: ${result.summary.sandboxRoots}`,
    `- Sandbox worktrees: ${result.summary.sandboxWorktrees}`,
    `- Dirty sandbox worktrees: ${result.summary.dirtySandboxWorktrees}`,
    `- Blockers: ${result.summary.blockerCount}`,
    `- Warnings: ${result.summary.warningCount}`,
    "",
    "## Workspace Table",
    "",
    "| Workspace | Status | Branch | Commit | Dirty | Stashes | Ahead | Behind | Worktrees | Blockers | Warnings |",
    "|---|---|---|---|---|---:|---:|---:|---:|---:|---:|",
  ];

  for (const workspace of result.workspaces) {
    lines.push(`| ${escapeTable(workspace.name)} | ${escapeTable(workspace.status)} | ${escapeTable(workspace.branch)} | ${escapeTable(workspace.commit)} | ${workspace.dirty ? "yes" : "no"} | ${workspace.stashCount ?? 0} | ${workspace.ahead} | ${workspace.behind} | ${workspace.worktreeCount} | ${workspace.blockers.length} | ${workspace.warnings.length} |`);
  }

  if (result.sandboxes.length) {
    lines.push("", "## Sandbox Roots", "");
    for (const sandbox of result.sandboxes) {
      lines.push(`### ${sandbox.root}`, "");
      lines.push(`Status: \`${sandbox.status}\``);
      lines.push(`Worktrees: ${sandbox.worktrees.length}`);
      if (sandbox.worktrees.length) {
        lines.push("", "| Path | Status | Branch | Commit | Dirty | Blockers | Warnings |", "|---|---|---|---|---|---:|---:|");
        for (const worktree of sandbox.worktrees) {
          lines.push(`| \`${escapeTable(toPosix(worktree.root))}\` | ${escapeTable(worktree.status)} | ${escapeTable(worktree.branch)} | ${escapeTable(worktree.commit)} | ${worktree.dirty ? "yes" : "no"} | ${worktree.blockers.length} | ${worktree.warnings.length} |`);
        }
      }
      lines.push("");
    }
  }

  const detailRows = [
    ...result.workspaces.filter((workspace) => workspace.blockers.length || workspace.warnings.length).map((workspace) => ({
      title: workspace.name,
      blockers: workspace.blockers,
      warnings: workspace.warnings,
    })),
    ...result.sandboxes.filter((sandbox) => sandbox.blockers.length || sandbox.warnings.length).map((sandbox) => ({
      title: sandbox.root,
      blockers: sandbox.blockers,
      warnings: sandbox.warnings,
    })),
  ];

  if (detailRows.length) {
    lines.push("## Findings", "");
    for (const row of detailRows) {
      lines.push(`### ${row.title}`, "");
      for (const blocker of row.blockers) lines.push(`- BLOCK: ${blocker}`);
      for (const warning of row.warnings) lines.push(`- WARN: ${warning}`);
      lines.push("");
    }
  }

  lines.push(
    "## Controller Rule",
    "",
    "- This controller never runs `git reset`, `git clean`, branch deletion, worktree removal, push, merge or deploy.",
    "- Dirty roots and dirty sandbox worktrees are blockers because they make unattended night jobs ambiguous.",
    "- Stash entries are blockers by default because they hide work outside the reviewable branch/PR path.",
    "- Clean leftover sandbox worktrees are warnings unless the local registry intentionally allows active L3 sandboxes.",
    "- Ahead/behind state is reported so the morning CEO brief can decide push, PR, review or park.",
    "- In close-session mode, ahead/behind, missing upstreams and unexpected root branches are promoted to blockers.",
    "",
  );

  return `${lines.join("\n").trimEnd()}\n`;
}
