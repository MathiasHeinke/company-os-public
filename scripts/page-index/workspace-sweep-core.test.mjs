import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  renderPageIndex,
  buildPageIndex,
} from "./page-index-core.mjs";
import {
  normalizeRegistry,
  renderWorkspaceSweepReport,
  sweepWorkspaces,
} from "./workspace-sweep-core.mjs";

function makeWorkspace(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "company-os-page-sweep-"));
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, "utf8");
  }
  return root;
}

test("normalizeRegistry accepts array and object registry shapes", () => {
  const root = makeWorkspace({ "docs/system-index.md": "# System Index\n" });

  assert.deepEqual(normalizeRegistry([{ name: "one", root }]), [{ name: "one", root, output: "docs/page-index.md", maxActiveContextLines: 300 }]);
  assert.deepEqual(normalizeRegistry({ workspaces: [{ name: "two", root, output: "x.md", maxActiveContextLines: 12 }] }), [
    { name: "two", root, output: "x.md", maxActiveContextLines: 12 },
  ]);
});

test("sweepWorkspaces reports current, stale and warning states", () => {
  const currentRoot = makeWorkspace({
    "docs/system-index.md": "# System Index\n",
    "AGENTS.md": "# Agents\n",
  });
  const currentIndex = buildPageIndex(currentRoot, { ignoreFiles: ["docs/page-index.md"] });
  fs.writeFileSync(path.join(currentRoot, "docs/page-index.md"), renderPageIndex(currentIndex), "utf8");

  const warningRoot = makeWorkspace({
    "AGENTS.md": "# Agents\n",
    "memory-bank/activeContext.md": "# Active\n\n1\n2\n3\n4\n",
  });

  const result = sweepWorkspaces([
    { name: "current", root: currentRoot },
    { name: "warning", root: warningRoot, maxActiveContextLines: 3 },
    { name: "missing", root: path.join(os.tmpdir(), "does-not-exist-page-sweep") },
  ]);

  assert.equal(result.summary.total, 3);
  assert.equal(result.summary.current, 1);
  assert.equal(result.summary.needsAttention, 2);

  const current = result.workspaces.find((workspace) => workspace.name === "current");
  assert.equal(current.status, "current");
  assert.equal(current.stale, false);

  const warning = result.workspaces.find((workspace) => workspace.name === "warning");
  assert.equal(warning.status, "needs_attention");
  assert.equal(warning.stale, true);
  assert.ok(warning.warnings.some((item) => item.includes("missing Layer-0.5 system index")));

  const missing = result.workspaces.find((workspace) => workspace.name === "missing");
  assert.equal(missing.status, "missing_root");
});

test("sweepWorkspaces with writeIndexes reports post-write stale state", () => {
  const root = makeWorkspace({
    "docs/system-index.md": "# System Index\n",
    "AGENTS.md": "# Agents\n",
  });

  const result = sweepWorkspaces([{ name: "workspace", root }], { writeIndexes: true });
  const workspace = result.workspaces[0];

  assert.equal(workspace.stale, false);
  assert.equal(workspace.wroteIndex, true);
  assert.equal(workspace.status, "current");
  assert.deepEqual(workspace.warnings, []);
  assert.ok(fs.existsSync(path.join(root, "docs/page-index.md")));
});

test("sweepWorkspaces with writeIndexes keeps non-stale warnings", () => {
  const root = makeWorkspace({
    "AGENTS.md": "# Agents\n",
    "memory-bank/activeContext.md": "# Active\n\n1\n2\n3\n4\n",
  });

  const result = sweepWorkspaces([{ name: "workspace", root, maxActiveContextLines: 3 }], { writeIndexes: true });
  const workspace = result.workspaces[0];

  assert.equal(workspace.stale, false);
  assert.equal(workspace.wroteIndex, true);
  assert.equal(workspace.status, "needs_attention");
  assert.ok(workspace.warnings.some((warning) => warning.includes("missing Layer-0.5 system index")));
  assert.ok(workspace.warnings.some((warning) => warning.includes("activeContext.md has 6 lines")));
  assert.ok(!workspace.warnings.some((warning) => warning.includes("page index is stale")));
});

test("renderWorkspaceSweepReport emits a controller-readable markdown table", () => {
  const result = {
    generatedAt: "2026-05-07T12:00:00.000Z",
    summary: { total: 2, current: 1, needsAttention: 1 },
    workspaces: [
      { name: "current", status: "current", files: 3, stale: false, wroteIndex: false, output: "docs/page-index.md", warnings: [] },
      { name: "warning", status: "needs_attention", files: 2, stale: true, wroteIndex: true, output: "docs/page-index.md", warnings: ["missing Layer-0.5 system index"] },
    ],
  };

  const markdown = renderWorkspaceSweepReport(result);

  assert.match(markdown, /^# Page Index Workspace Sweep/m);
  assert.match(markdown, /\| current \| current \| 3 \| no \| no \| 0 \| `docs\/page-index.md` \|/);
  assert.match(markdown, /\| warning \| needs_attention \| 2 \| yes \| yes \| 1 \| `docs\/page-index.md` \|/);
  assert.match(markdown, /missing Layer-0\.5 system index/);
});
