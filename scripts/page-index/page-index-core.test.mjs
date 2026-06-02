import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";

import {
  buildPageIndex,
  discoverMarkdownFiles,
  discoverTrackedMarkdownFiles,
  renderPageIndex,
  scrubPrivatePathsInString,
} from "./page-index-core.mjs";

function makeWorkspace(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "company-os-page-index-"));
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, "utf8");
  }
  return root;
}

function makeTrackedWorkspace(files, { stageOnly = [] } = {}) {
  const root = makeWorkspace(files);
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
  execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: root });
  const toStage = stageOnly.length ? stageOnly : Object.keys(files);
  if (toStage.length) {
    execFileSync("git", ["add", ...toStage], { cwd: root });
    execFileSync("git", ["commit", "-q", "-m", "fixture"], { cwd: root });
  }
  return root;
}

test("discoverMarkdownFiles skips generated, dependency, git and private report paths", () => {
  const root = makeWorkspace({
    "AGENTS.md": "# Agents\n",
    "docs/operations/runbook.md": "# Runbook\n",
    "docs/page-index.md": "# generated\n",
    ".claude/worktrees/old/memory-bank/activeContext.md": "# ignored\n",
    "node_modules/pkg/README.md": "# ignored\n",
    ".git/COMMIT_EDITMSG.md": "# ignored\n",
    "reports/private/raw.md": "# ignored\n",
  });

  const files = discoverMarkdownFiles(root).map((file) => path.relative(root, file));

  assert.deepEqual(files, ["AGENTS.md", "docs/operations/runbook.md"]);
});

test("discoverMarkdownFiles skips broken symlink markdown entries", () => {
  const root = makeWorkspace({
    "AGENTS.md": "# Agents\n",
  });
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.symlinkSync(path.join(root, "docs", "missing-target.md"), path.join(root, "docs", "broken.md"));

  const files = discoverMarkdownFiles(root).map((file) => path.relative(root, file));

  assert.deepEqual(files, ["AGENTS.md"]);
});

test("buildPageIndex extracts titles, purpose text, headings and boot warnings", () => {
  const root = makeWorkspace({
    "AGENTS.md": "# AGENTS.md - Test\n\n## Boot\n",
    "memory-bank/activeContext.md": "# Active\n\n1\n2\n3\n4\n",
    "docs/operations/runner.md": [
      "# Runner Protocol",
      "",
      "> Controls worker dispatch.",
      "",
      "## Scope",
      "## Gates",
      "",
    ].join("\n"),
  });

  const index = buildPageIndex(root, { maxActiveContextLines: 3 });

  assert.equal(index.entries.length, 3);
  assert.deepEqual(
    index.entries.map((entry) => entry.relativePath),
    ["AGENTS.md", "docs/operations/runner.md", "memory-bank/activeContext.md"],
  );

  const runner = index.entries.find((entry) => entry.relativePath === "docs/operations/runner.md");
  assert.equal(runner.title, "Runner Protocol");
  assert.equal(runner.purpose, "Controls worker dispatch.");
  assert.deepEqual(runner.headings, ["Scope", "Gates"]);
  assert.equal(runner.category, "Operations");

  assert.ok(index.warnings.some((warning) => warning.includes("missing Layer-0.5 system index")));
  assert.ok(index.warnings.some((warning) => warning.includes("activeContext.md has 6 lines")));
});

test("renderPageIndex creates a deterministic markdown map grouped by category", () => {
  const root = makeWorkspace({
    "AGENTS.md": "# Agents\n",
    "docs/system-index.md": "# System Index\n",
    "docs/templates/worker.md": "# Worker Contract\n\n> Issue shape.\n\n## Fields\n",
  });
  const index = buildPageIndex(root);

  const markdown = renderPageIndex(index, {
    generatedAt: "2026-05-07T12:00:00.000Z",
    title: "Page Index - Fixture",
  });

  assert.match(markdown, /^# Page Index - Fixture/m);
  assert.match(markdown, /Generated: 2026-05-07T12:00:00.000Z/);
  assert.match(markdown, /## Templates/);
  assert.match(markdown, /\| `docs\/templates\/worker.md` \| Worker Contract \| Issue shape\. \| Fields \|/);
});

test("renderPageIndex default title is worktree-stable", () => {
  const root = makeWorkspace({
    "AGENTS.md": "# Agents\n",
    "docs/system-index.md": "# System Index\n",
  });
  const markdown = renderPageIndex(buildPageIndex(root));

  assert.match(markdown, /^# Page Index$/m);
  assert.doesNotMatch(markdown, new RegExp(path.basename(root)));
});

test("discoverTrackedMarkdownFiles enumerates only files staged in git", () => {
  const root = makeTrackedWorkspace(
    {
      "AGENTS.md": "# Agents\n",
      "docs/operations/runbook.md": "# Runbook\n",
      "runtime-only.md": "# Untracked local\n",
    },
    { stageOnly: ["AGENTS.md", "docs/operations/runbook.md"] },
  );
  fs.writeFileSync(path.join(root, "runtime-only.md"), "# Untracked local\n", "utf8");
  const files = discoverTrackedMarkdownFiles(root).map((file) => path.relative(root, file));
  assert.deepEqual(files, ["AGENTS.md", "docs/operations/runbook.md"]);
});

test("buildPageIndex({ source: 'tracked' }) reports source and excludes untracked", () => {
  const root = makeTrackedWorkspace(
    {
      "AGENTS.md": "# Agents\n",
      "docs/system-index.md": "# System Index\n",
    },
    { stageOnly: ["AGENTS.md", "docs/system-index.md"] },
  );
  fs.mkdirSync(path.join(root, "docs", "operations"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "operations", "draft.md"), "# Draft\n", "utf8");
  const index = buildPageIndex(root, { source: "tracked" });
  assert.equal(index.source, "tracked");
  assert.equal(index.sourceRequested, "tracked");
  assert.deepEqual(
    index.entries.map((entry) => entry.relativePath).sort(),
    ["AGENTS.md", "docs/system-index.md"],
  );
});

test("buildPageIndex tracked source falls back to filesystem with warning when no git index", () => {
  const root = makeWorkspace({ "AGENTS.md": "# Agents\n", "docs/system-index.md": "# System\n" });
  const index = buildPageIndex(root, { source: "tracked" });
  assert.equal(index.source, "filesystem");
  assert.equal(index.sourceRequested, "tracked");
  assert.ok(index.warnings.some((warning) => warning.includes("tracked source unavailable")));
});

test("buildPageIndex tracked source throws when fallbackToFilesystem is false", () => {
  const root = makeWorkspace({ "AGENTS.md": "# Agents\n" });
  assert.throws(
    () => buildPageIndex(root, { source: "tracked", fallbackToFilesystem: false }),
    /git ls-files failed/,
  );
});

test("renderPageIndex prints Source: tracked-canonical vs runtime-local", () => {
  const root = makeTrackedWorkspace(
    { "AGENTS.md": "# Agents\n", "docs/system-index.md": "# System\n" },
  );
  const trackedIndex = buildPageIndex(root, { source: "tracked" });
  assert.match(renderPageIndex(trackedIndex), /Source: tracked-canonical/);
  const fsIndex = buildPageIndex(root, { source: "filesystem" });
  assert.match(renderPageIndex(fsIndex), /Source: runtime-local/);
});

test("renderPageIndex scrubs private home paths from extracted table text", () => {
  const root = makeWorkspace({
    "AGENTS.md": [
      "# Agents",
      "",
      "Report lives at [LOCAL_WORKSPACE]",
      "",
      "## Path [LOCAL_WORKSPACE]",
      "",
    ].join("\n"),
    "docs/system-index.md": "# System\n",
  });
  const markdown = renderPageIndex(buildPageIndex(root));

  assert.equal(scrubPrivatePathsInString("[LOCAL_WORKSPACE]"), "~/Developer/Company.OS");
  assert.doesNotMatch(markdown, /\/Users\/[a-zA-Z][-a-zA-Z0-9]+/);
  assert.match(markdown, /~\/\.claude\/plans\/example\.md/);
  assert.match(markdown, /Path ~\/Developer\/Company\.OS/);
});
