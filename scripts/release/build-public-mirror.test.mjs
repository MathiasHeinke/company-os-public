import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  REPLACEMENT_FIXTURES,
  STRIP_LIST_VERSION_DEFAULT,
  globToRegex,
  hashOutputTree,
  isIncluded,
  isStripped,
  planPublicMirror,
  runBuildPublicMirror,
  sanitizePublicMirrorText,
  verifyPublicMirrorOutput,
} from "./build-public-mirror.mjs";

function fixtureRoot(prefix = "build-public-mirror-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function write(root, relativePath, content = "ok\n") {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
}

function writeMinimalIncludeTree(root) {
  write(root, "AGENTS.md", "# AGENTS\n");
  write(root, "LICENSE", "MIT\n");
  write(root, "README.md", "Current version: `0.4.1-alpha.1`\n\nguided alpha; not self-serve.\n");
  write(root, "VERSION", "0.4.1-alpha.1\n");
  write(root, "CHANGELOG.md", "# Changelog\n\n## 0.4.1-alpha.1 - 2026-05-13\n");
  write(root, "ROADMAP.md", "# Roadmap\n");
  write(root, ".env.example", "PLANE_WORKSPACE_SLUG=your-workspace-slug\n");
  write(root, ".gitignore", ".env\nnode_modules/\n");
  write(root, ".github/ISSUE_TEMPLATE/agent-worker.yml", "name: Agent Worker\n");
  write(root, ".github/pull_request_template.md", "## Summary\n");

  write(root, "docs/example/intro.md", "intro\n");
  write(root, "docs/orchestration/supergoal-execution-ladder.md", "# Supergoal Execution Ladder\n");
  write(root, "docs/orchestration/post-worker-quality-loop.md", "# Post-Worker Quality Loop\n");
  write(root, "docs/templates/post-worker-quality-worker-contracts.md", "# Post-Worker Quality Worker Contracts\n");
  write(root, "scripts/install/bootstrap.mjs", "// bootstrap\n");
  write(root, "scripts/install/bootstrap-core.mjs", "// bootstrap core\n");
  write(root, "scripts/install/bootstrap.test.mjs", "// bootstrap test\n");
  write(root, "scripts/orchestration/example.mjs", "// example\n");
  write(root, "scripts/release-gates/example.mjs", "// example\n");
  write(root, "scripts/plane/plane-app-token-rotation.mjs", "// example\n");
  write(root, "scripts/plane/enrich-batch-5-mirror-plans.mjs", "// internal-only\n");
  write(root, "scripts/capabilities/example.mjs", "// example\n");
  write(root, "scripts/sandbox-pr/example.mjs", "// example\n");
  write(root, "scripts/agent-events/example.mjs", "// example\n");
  write(root, "scripts/goal/example.mjs", "// example\n");
  write(root, "scripts/git-hygiene/example.mjs", "// example\n");
  write(root, "scripts/page-index/example.mjs", "// example\n");
  write(root, "scripts/dreams/example.mjs", "// example\n");
  write(root, "scripts/artifact-truth/example.mjs", "// example\n");
  write(root, "scripts/model-router/example.mjs", "// example\n");
  write(root, "scripts/runtime/example.mjs", "// example\n");
  write(
    root,
    "registries/quality/post-worker-quality-loop.json",
    JSON.stringify({
      version: "post-worker-quality-loop/v0",
      worker_classes: [
        { id: "quality-auditor" },
        { id: "security-auditor" },
        { id: "bug-regression-auditor" },
        { id: "deep-audit-worker" },
        { id: "hotfix-worker" },
      ],
      matrix: {
        "P0-doc-small": {},
        "P1-code-bounded": {},
        "P2-code-shared": {},
        "P3-cross-repo": {},
        "P4-high-risk": {},
      },
    }, null, 2),
  );
  write(root, "registries/domain-packs/company-os.json", "{\"version\":\"domain-pack-registry/v0\",\"packs\":[]}\n");
  write(root, "registries/domain-packs/company-os.schema.json", "{\"title\":\"Domain Pack Registry\"}\n");
  write(root, "registries/plane-templates/company-os.json", "{\"version\":\"plane-template-registry/v0\"}\n");
  write(root, "registries/inference/eve-hermes-brain.json", "{\"version\":\"eve-brain-router/v0\",\"brain_classes\":[],\"routes\":{}}\n");

  write(root, "kits/company-os-kit/README.md", "# Kit\n");
  write(root, "kits/company-os-kit/templates/AGENTS.md", "# Template\n");
  write(root, "kits/company-os-kit/.agents/rules/example.md", "rule\n");
  write(root, "kits/company-os-kit/.company-os/charters/example.md", "charter\n");
  write(root, "kits/company-os-kit/.antigravity/agentic-plan-template.md", "plan\n");
  write(root, "kits/company-os-kit/.antigravity/agentic-router.md", "router\n");
  write(root, "kits/company-os-kit/.antigravity/copy-rules.md", "copy\n");
  write(root, "kits/company-os-kit/.antigravity/system-prompt.md", "system\n");
  write(root, "kits/company-os-kit/.antigravity/tech-stack-context.md", "stack\n");
  write(root, "kits/company-os-kit/.antigravity/workspace-strategy.md", "workspace\n");
  write(
    root,
    "kits/company-os-kit/.antigravity/personas/compliance-officer.md",
    "role: compliance\n",
  );
  write(root, "kits/company-os-kit/.antigravity/personas/elon-musk.md", "named-person\n");
}

function writeFixtures(root) {
  for (const fixture of REPLACEMENT_FIXTURES) {
    write(root, fixture.target, `fixture: ${fixture.target}\n`);
  }
}

function writePrivateContent(root) {
  write(root, "metrics/agent-events.jsonl", "{\"private\": true}\n");
  write(root, "metrics/agent-runs.jsonl", "{\"private\": true}\n");
  write(root, "metrics/ai-cost-ledger.jsonl", "{\"private\": true}\n");
  write(root, "reports/runs/internal.md", "private report\n");
  write(root, "reports/runs/internal.stream.jsonl", "{\"private\":true}\n");
  write(root, "registries/capabilities/company-os.json", "{\"private\":true}\n");
  write(root, "registries/inference/company-os.json", "{\"private\":true}\n");
  write(
    root,
    "docs/operations/ares-product-domain-night-shift-queue.md",
    "ARES-private\n",
  );
  write(
    root,
    "kits/company-os-kit/.antigravity/logs/architect-memory.md",
    "private memory\n",
  );
  write(root, ".env", "SECRET=do-not-publish\n");
  write(root, "docs/templates/atlas-worker-templates.md", "atlas\n");
  write(root, "docs/orchestration/atlas-claude-c-level-boot-contract.md", "atlas\n");
  write(root, "kits/company-os-kit/.antigravity/knowledge/source-x.md", "knowledge\n");
}

test("globToRegex compiles ** and * to expected matchers", () => {
  assert.ok(globToRegex("docs/**").test("docs/operations/example.md"));
  assert.ok(globToRegex("docs/**").test("docs/example.md"));
  assert.ok(!globToRegex("docs/**").test("kits/docs/example.md"));
  assert.ok(globToRegex("**/.env").test("nested/.env"));
  assert.ok(globToRegex(".env").test(".env"));
  assert.ok(!globToRegex(".env").test("nested/.env"));
});

test("isStripped recognizes private paths and keeps reports/.gitkeep", () => {
  assert.ok(isStripped("metrics/agent-events.jsonl"));
  assert.ok(isStripped("metrics/agent-runs.jsonl"));
  assert.ok(isStripped("registries/capabilities/company-os.json"));
  assert.ok(isStripped("scripts/plane/enrich-batch-5-mirror-plans.mjs"));
  assert.ok(isStripped("reports/runs/internal.md"));
  assert.ok(isStripped("reports/runs/internal.stream.jsonl"));
  assert.ok(isStripped("kits/company-os-kit/.antigravity/personas/elon-musk.md"));
  assert.ok(isStripped("kits/company-os-kit/.antigravity/knowledge/anything.md"));
  assert.equal(isStripped("reports/.gitkeep"), null);
  assert.equal(isStripped("reports/examples/cao-pass.example.md"), null);
});

test("isIncluded recognizes documented include rules", () => {
  assert.ok(isIncluded(".env.example"));
  assert.ok(isIncluded(".gitignore"));
  assert.ok(isIncluded(".github/ISSUE_TEMPLATE/agent-worker.yml"));
  assert.ok(isIncluded(".github/pull_request_template.md"));
  assert.ok(isIncluded("docs/operations/example.md"));
  assert.ok(isIncluded("scripts/install/bootstrap.mjs"));
  assert.ok(isIncluded("scripts/plane/plane-app-token-rotation.mjs"));
  assert.ok(isIncluded("registries/domain-packs/company-os.json"));
  assert.ok(isIncluded("registries/inference/eve-hermes-brain.json"));
  assert.ok(isIncluded("registries/plane-templates/company-os.json"));
  assert.ok(isIncluded("registries/quality/post-worker-quality-loop.json"));
  assert.ok(isIncluded("kits/company-os-kit/.antigravity/agentic-plan-template.md"));
  assert.ok(isIncluded("kits/company-os-kit/.antigravity/personas/compliance-officer.md"));
  assert.equal(isIncluded("docs/CLAUDE-private.txt") !== null, true);
  assert.equal(isIncluded("CLAUDE.md"), null);
});

test("planPublicMirror returns copied + stripped + missing_fixtures for a synthetic tree", () => {
  const sourceRoot = fixtureRoot();
  writeMinimalIncludeTree(sourceRoot);
  writeFixtures(sourceRoot);
  writePrivateContent(sourceRoot);

  const plan = planPublicMirror({ sourceRoot });

  assert.equal(plan.missing_fixtures.length, 0);
  assert.ok(plan.copied.some((entry) => entry.path === "README.md"));
  assert.ok(plan.copied.some((entry) => entry.path === "metrics/agent-events.example.jsonl"));
  assert.ok(plan.copied.some((entry) => entry.path === "registries/capabilities/example.json"));
  assert.ok(plan.copied.some((entry) => entry.path === "registries/inference/eve-hermes-brain.json"));
  assert.ok(plan.copied.some((entry) => entry.path === "registries/domain-packs/company-os.json"));
  assert.ok(plan.copied.some((entry) => entry.path === "registries/plane-templates/company-os.json"));
  assert.ok(plan.copied.some((entry) => entry.path === "registries/quality/post-worker-quality-loop.json"));
  assert.ok(
    plan.copied.some((entry) => entry.path === "kits/company-os-kit/.antigravity/personas/compliance-officer.md"),
  );

  const strippedPaths = plan.stripped.map((entry) => entry.path);
  assert.ok(strippedPaths.includes("metrics/agent-events.jsonl"));
  assert.ok(strippedPaths.includes("registries/capabilities/company-os.json"));
  assert.ok(strippedPaths.includes("scripts/plane/enrich-batch-5-mirror-plans.mjs"));
  assert.ok(strippedPaths.includes("kits/company-os-kit/.antigravity/personas/elon-musk.md"));
  assert.ok(strippedPaths.includes("kits/company-os-kit/.antigravity/logs/architect-memory.md"));
  assert.ok(strippedPaths.includes(".env"));
  assert.ok(strippedPaths.some((entry) => entry === "reports/runs/internal.stream.jsonl"));
});

test("planPublicMirror reports missing fixtures and never silently omits them", () => {
  const sourceRoot = fixtureRoot();
  writeMinimalIncludeTree(sourceRoot);

  const plan = planPublicMirror({ sourceRoot });

  const missing = plan.missing_fixtures.map((entry) => entry.target);
  for (const fixture of REPLACEMENT_FIXTURES) {
    assert.ok(missing.includes(fixture.target), `missing fixture ${fixture.target} not reported`);
  }
});

test("runBuildPublicMirror dry-run reports RUNTIME_ERROR when fixtures missing", async () => {
  const sourceRoot = fixtureRoot();
  writeMinimalIncludeTree(sourceRoot);
  const outRoot = path.join(fixtureRoot("build-out-"), "mirror");

  const result = await runBuildPublicMirror({
    sourceRoot,
    outRoot,
    dryRun: true,
    sourceSha: "deadbeef",
    now: () => new Date("2026-05-14T00:00:00.000Z"),
  });

  assert.equal(result.status, "RUNTIME_ERROR");
  assert.equal(result.exit_code, 2);
  assert.equal(result.reason, "missing-fixtures");
  assert.ok(result.missing_fixtures.length > 0);
  assert.equal(fs.existsSync(outRoot), false);
});

test("runBuildPublicMirror dry-run on complete fixture tree returns PASS without copying", async () => {
  const sourceRoot = fixtureRoot();
  writeMinimalIncludeTree(sourceRoot);
  writeFixtures(sourceRoot);
  writePrivateContent(sourceRoot);
  const outRoot = path.join(fixtureRoot("build-out-"), "mirror");

  const result = await runBuildPublicMirror({
    sourceRoot,
    outRoot,
    dryRun: true,
    sourceSha: "deadbeef",
    now: () => new Date("2026-05-14T00:00:00.000Z"),
  });

  assert.equal(result.status, "PASS");
  assert.equal(result.exit_code, 0);
  assert.equal(result.missing_fixtures.length, 0);
  assert.equal(fs.existsSync(outRoot), false);
});

test("runBuildPublicMirror full build copies sanitized tree and writes provenance manifest", async () => {
  const sourceRoot = fixtureRoot();
  writeMinimalIncludeTree(sourceRoot);
  writeFixtures(sourceRoot);
  writePrivateContent(sourceRoot);
  const outRoot = path.join(fixtureRoot("build-out-"), "mirror");

  const result = await runBuildPublicMirror({
    sourceRoot,
    outRoot,
    verify: true,
    sourceSha: "deadbeef",
    now: () => new Date("2026-05-14T00:00:00.000Z"),
  });

  assert.equal(result.status, "PASS", JSON.stringify(result.invariant_failures));
  assert.equal(result.exit_code, 0);
  assert.equal(fs.existsSync(path.join(outRoot, "mirror-provenance.json")), true);
  assert.equal(fs.existsSync(path.join(outRoot, "docs/page-index.md")), true);
  assert.match(
    fs.readFileSync(path.join(outRoot, "docs/page-index.md"), "utf8"),
    /Source: tracked-canonical/,
  );
  assert.match(
    fs.readFileSync(path.join(outRoot, "docs/page-index.md"), "utf8"),
    /`docs\/example\/intro\.md`/,
  );
  assert.equal(fs.existsSync(path.join(outRoot, "metrics/agent-events.jsonl")), false);
  assert.equal(fs.existsSync(path.join(outRoot, "metrics/agent-events.example.jsonl")), true);
  assert.equal(
    fs.existsSync(path.join(outRoot, "registries/capabilities/company-os.json")),
    false,
  );
  assert.equal(
    fs.existsSync(path.join(outRoot, "registries/capabilities/example.json")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(outRoot, "registries/inference/eve-hermes-brain.json")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(outRoot, "registries/domain-packs/company-os.json")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(outRoot, "registries/domain-packs/company-os.schema.json")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(outRoot, "registries/plane-templates/company-os.json")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(outRoot, "registries/quality/post-worker-quality-loop.json")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(outRoot, "docs/orchestration/supergoal-execution-ladder.md")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(outRoot, "docs/orchestration/post-worker-quality-loop.md")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(outRoot, "docs/templates/post-worker-quality-worker-contracts.md")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(outRoot, "scripts/plane/enrich-batch-5-mirror-plans.mjs")),
    false,
  );
  assert.equal(fs.existsSync(path.join(outRoot, ".env")), false);
  assert.equal(fs.existsSync(path.join(outRoot, ".env.example")), true);
  assert.equal(fs.existsSync(path.join(outRoot, ".gitignore")), true);
  assert.equal(
    fs.existsSync(path.join(outRoot, ".github/ISSUE_TEMPLATE/agent-worker.yml")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(outRoot, ".github/pull_request_template.md")),
    true,
  );
  assert.equal(fs.existsSync(path.join(outRoot, "scripts/install/bootstrap.mjs")), true);
  assert.equal(fs.existsSync(path.join(outRoot, "reports/runs/internal.md")), false);
  assert.equal(
    fs.existsSync(path.join(outRoot, "reports/runs/internal.stream.jsonl")),
    false,
  );
  assert.equal(
    fs.existsSync(
      path.join(outRoot, "kits/company-os-kit/.antigravity/personas/elon-musk.md"),
    ),
    false,
  );
  assert.equal(
    fs.existsSync(
      path.join(outRoot, "kits/company-os-kit/.antigravity/personas/compliance-officer.md"),
    ),
    true,
  );

  const manifest = JSON.parse(
    fs.readFileSync(path.join(outRoot, "mirror-provenance.json"), "utf8"),
  );
  assert.equal(manifest.source_sha, "deadbeef");
  assert.equal(manifest.strip_list_version, STRIP_LIST_VERSION_DEFAULT);
  assert.equal(manifest.generated_at, "2026-05-14T00:00:00.000Z");
  assert.ok(manifest.output_file_count > 0);
  assert.ok(Array.isArray(manifest.blocker_summary));
});

test("runBuildPublicMirror produces equivalent output content on a second run for the same source SHA", async () => {
  const sourceRoot = fixtureRoot();
  writeMinimalIncludeTree(sourceRoot);
  writeFixtures(sourceRoot);
  writePrivateContent(sourceRoot);

  const outA = path.join(fixtureRoot("build-out-"), "mirror");
  const outB = path.join(fixtureRoot("build-out-"), "mirror");

  await runBuildPublicMirror({
    sourceRoot,
    outRoot: outA,
    sourceSha: "deadbeef",
    now: () => new Date("2026-05-14T01:00:00.000Z"),
  });
  await runBuildPublicMirror({
    sourceRoot,
    outRoot: outB,
    sourceSha: "deadbeef",
    now: () => new Date("2026-05-14T02:00:00.000Z"),
  });

  const hashesA = hashOutputTree(outA).filter((entry) => entry.path !== "mirror-provenance.json");
  const hashesB = hashOutputTree(outB).filter((entry) => entry.path !== "mirror-provenance.json");
  assert.deepEqual(hashesA, hashesB, "determinism failure: non-manifest files differ between runs");

  const manifestA = JSON.parse(fs.readFileSync(path.join(outA, "mirror-provenance.json"), "utf8"));
  const manifestB = JSON.parse(fs.readFileSync(path.join(outB, "mirror-provenance.json"), "utf8"));
  assert.notEqual(manifestA.generated_at, manifestB.generated_at);
  assert.equal(manifestA.source_sha, manifestB.source_sha);
  assert.equal(manifestA.strip_list_version, manifestB.strip_list_version);
  assert.equal(manifestA.output_file_count, manifestB.output_file_count);
});

test("verifyPublicMirrorOutput flags planted token-shaped strings as PRIVATE_CONTENT_DETECTED", async () => {
  const sourceRoot = fixtureRoot();
  writeMinimalIncludeTree(sourceRoot);
  writeFixtures(sourceRoot);
  // Plant a token-shaped string in an included script.
  const plantedToken = ["ares", "hermes", "AABBCCDDEEFFGGHHIIJJ12345"].join("-");
  write(
    sourceRoot,
    "scripts/orchestration/example.mjs",
    `// planted: ${plantedToken} // do-not-publish\n`,
  );

  const outRoot = path.join(fixtureRoot("build-out-"), "mirror");
  const result = await runBuildPublicMirror({
    sourceRoot,
    outRoot,
    verify: true,
    sourceSha: "deadbeef",
    now: () => new Date("2026-05-14T03:00:00.000Z"),
  });

  assert.equal(result.status, "PRIVATE_CONTENT_DETECTED");
  assert.equal(result.exit_code, 3);
  assert.ok(
    result.invariant_failures.some((entry) => entry.id === "source-company-token"),
    JSON.stringify(result.invariant_failures),
  );
});

test("sanitizePublicMirrorText scrubs safe public mirror fixture tokens and work item ids", () => {
  const githubPatFixture = `ghp_${"A".repeat(20)}`;
  const githubFineGrainedPatFixture = `github_pat_${"A".repeat(24)}`;
  const slackBotFixture = `xoxb-${"1".repeat(20)}`;
  const privateHomePathFixture = ["/Users", "mathiasheinke", "Developer", "Company.OS"].join("/");
  assert.equal(
    sanitizePublicMirrorText("scripts/orchestration/example.test.mjs", `const token = '${githubPatFixture}';\nconst fine = '${githubFineGrainedPatFixture}';\nconst slack = '${slackBotFixture}';\n`),
    "const token = '[GITHUB_PAT_EXAMPLE]';\nconst fine = '[GITHUB_FINE_GRAINED_PAT_EXAMPLE]';\nconst slack = '[SLACK_BOT_TOKEN_EXAMPLE]';\n",
  );
  assert.equal(
    sanitizePublicMirrorText("docs/operations/example.md", "See [WORK_ITEM_ID], [WORK_ITEM_ID], [WORK_ITEM_ID] and [WORK_ITEM_ID].\n"),
    "See [WORK_ITEM_ID], [WORK_ITEM_ID], [WORK_ITEM_ID] and [WORK_ITEM_ID].\n",
  );
  assert.equal(
    sanitizePublicMirrorText("scripts/goal/example.mjs", "const issue = '[WORK_ITEM_ID]';\n"),
    "const issue = '[WORK_ITEM_ID]';\n",
  );
  assert.equal(
    sanitizePublicMirrorText(
      "scripts/runtime/example.mjs",
      `const root = '${privateHomePathFixture}';\n`,
    ),
    "const root = '[LOCAL_WORKSPACE]';\n",
  );
  assert.equal(
    sanitizePublicMirrorText(
      "docs/operations/example.md",
      `Workspace root: ${privateHomePathFixture}\n`,
    ),
    "Workspace root: ${LOCAL_WORKSPACE}\n",
  );
  assert.equal(
    sanitizePublicMirrorText(
      "scripts/model-router/example.mjs",
      `const workspace = '${["ares", "app"].join("-")}';\n`,
    ),
    "const workspace = '[SOURCE_WORKSPACE]';\n",
  );
  assert.equal(
    sanitizePublicMirrorText("scripts/orchestration/example.mjs", `const token = '${githubPatFixture}';\n`),
    `const token = '${githubPatFixture}';\n`,
  );
});

test("runBuildPublicMirror scrubs fixture tokens and work item ids in output only", async () => {
  const sourceRoot = fixtureRoot();
  const githubPatFixture = `ghp_${"A".repeat(20)}`;
  const slackBotFixture = `xoxb-${"1".repeat(20)}`;
  const privateHomePathFixture = ["/Users", "mathiasheinke", "Developer", "Company.OS"].join("/");
  writeMinimalIncludeTree(sourceRoot);
  writeFixtures(sourceRoot);
  write(
    sourceRoot,
    "scripts/orchestration/example.test.mjs",
    `const github = '${githubPatFixture}';\nconst slack = '${slackBotFixture}';\nconst issue = '[WORK_ITEM_ID]';\nconst root = '${privateHomePathFixture}';\n`,
  );
  write(sourceRoot, "docs/example/intro.md", "Follow [WORK_ITEM_ID] then [WORK_ITEM_ID].\n");

  const outRoot = path.join(fixtureRoot("build-out-"), "mirror");
  const result = await runBuildPublicMirror({
    sourceRoot,
    outRoot,
    verify: true,
    sourceSha: "deadbeef",
    now: () => new Date("2026-05-14T03:30:00.000Z"),
  });

  assert.equal(result.status, "PASS", JSON.stringify(result.invariant_failures));
  assert.doesNotMatch(
    fs.readFileSync(path.join(outRoot, "scripts/orchestration/example.test.mjs"), "utf8"),
    /ghp_|xoxb-|COMPA-|\/Users\/mathiasheinke/,
  );
  assert.match(
    fs.readFileSync(path.join(outRoot, "docs/example/intro.md"), "utf8"),
    /\[WORK_ITEM_ID\]/,
  );
});

test("verifyPublicMirrorOutput flags planted ARES domain strings in already-built output", () => {
  const outRoot = fixtureRoot("mirror-out-");
  write(
    outRoot,
    "kits/company-os-kit/.antigravity/system-prompt.md",
    `Use ${["bio-os", "io"].join(".")} for everything\n`,
  );

  const result = verifyPublicMirrorOutput({ outRoot });

  assert.equal(result.passed, false);
  assert.ok(result.invariant_failures.some((entry) => entry.id === "private-source-domain"));
});

test("runBuildPublicMirror refuses to overwrite a non-empty --out directory", async () => {
  const sourceRoot = fixtureRoot();
  writeMinimalIncludeTree(sourceRoot);
  writeFixtures(sourceRoot);

  const outRoot = path.join(fixtureRoot("build-out-"), "mirror");
  fs.mkdirSync(outRoot, { recursive: true });
  fs.writeFileSync(path.join(outRoot, "pre-existing.txt"), "pre-existing");

  const result = await runBuildPublicMirror({
    sourceRoot,
    outRoot,
    sourceSha: "deadbeef",
    now: () => new Date("2026-05-14T05:00:00.000Z"),
  });

  assert.equal(result.status, "RUNTIME_ERROR");
  assert.equal(result.exit_code, 2);
  assert.match(result.reason, /out\.not-empty/);
});

test("verifyPublicMirrorOutput passes a freshly-built sanitized tree", async () => {
  const sourceRoot = fixtureRoot();
  writeMinimalIncludeTree(sourceRoot);
  writeFixtures(sourceRoot);
  writePrivateContent(sourceRoot);

  const outRoot = path.join(fixtureRoot("build-out-"), "mirror");
  await runBuildPublicMirror({
    sourceRoot,
    outRoot,
    sourceSha: "deadbeef",
    now: () => new Date("2026-05-14T06:00:00.000Z"),
  });

  const verification = verifyPublicMirrorOutput({ outRoot });
  assert.equal(verification.passed, true, JSON.stringify(verification.invariant_failures));
  assert.equal(verification.invariant_failures.length, 0);
});
