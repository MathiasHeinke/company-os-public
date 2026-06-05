import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  REQUIRED_DOCS,
  REQUIRED_OPERATOR_SHELL_FILES,
  REQUIRED_SCRIPTS,
  evaluateProductizationReadiness,
  extractReadmeVersion,
} from "./productization-readiness-core.mjs";

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "productization-readiness-"));
}

function write(root, relativePath, content = "ok\n") {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
  return absolutePath;
}

function writeMinimalRepo(root, { version = "0.3.1-alpha.1", readmeVersion = version } = {}) {
  for (const doc of REQUIRED_DOCS) write(root, doc);
  for (const script of REQUIRED_SCRIPTS) write(root, script);
  for (const file of REQUIRED_OPERATOR_SHELL_FILES) write(root, file, "{}\n");
  write(root, "VERSION", `${version}\n`);
  write(root, "CHANGELOG.md", `# Changelog\n\n## ${version} - 2026-05-10\n`);
  write(
    root,
    "README.md",
    [
      "# Company.OS",
      "",
      `Current version: \`${readmeVersion}\``,
      "",
      "Status: guided alpha; not yet self-serve.",
      "",
    ].join("\n"),
  );
  write(
    root,
    "kits/company-os-kit/templates/AGENTS.md",
    "# Kit\n\n## Plane-First Execution Ledger\n\n## Spec-to-Worker Pipeline\n",
  );
  write(
    root,
    "docs/operations/client-productization-readiness.md",
    "Honcho setup. Plane App setup. Scheduler gate. Supabase is optional connector/backend, not core.\n",
  );
}

test("extractReadmeVersion reads the README current version line", () => {
  assert.equal(extractReadmeVersion("Current version: `0.3.1-alpha.1`\n"), "0.3.1-alpha.1");
});

test("evaluateProductizationReadiness passes a minimal guided-alpha fixture", () => {
  const root = fixtureRoot();
  writeMinimalRepo(root);

  const result = evaluateProductizationReadiness({ root });
  assert.equal(result.ok, true, result.blockers.map((item) => item.message).join("\n"));
  assert.equal(result.blocker_count, 0);
});

test("evaluateProductizationReadiness blocks README/VERSION drift", () => {
  const root = fixtureRoot();
  writeMinimalRepo(root, { readmeVersion: "0.2.0-alpha.1" });

  const result = evaluateProductizationReadiness({ root });
  assert.equal(result.ok, false);
  assert.ok(result.blockers.some((item) => item.id === "version.readme"));
});

test("evaluateProductizationReadiness warns on reports in guided alpha and blocks them for public release", () => {
  const root = fixtureRoot();
  writeMinimalRepo(root);
  write(root, "reports/internal.md", "internal report\n");

  const guided = evaluateProductizationReadiness({ root });
  assert.equal(guided.ok, true);
  assert.ok(guided.warnings.some((item) => item.id === "sanitize.reports"));

  const publicRelease = evaluateProductizationReadiness({ root, publicRelease: true });
  assert.equal(publicRelease.ok, false);
  assert.ok(publicRelease.blockers.some((item) => item.id === "sanitize.reports"));
});

test("evaluateProductizationReadiness allows curated public report examples", () => {
  const root = fixtureRoot();
  writeMinimalRepo(root);
  write(root, "reports/.gitkeep", "");
  write(root, "reports/examples/worker-issue-report.example.md", "example report\n");
  write(root, "reports/examples/runtime-pilot.example.stream.jsonl", "{}\n");

  const result = evaluateProductizationReadiness({ root, publicRelease: true });
  assert.equal(
    result.blockers.some((item) => item.id === "sanitize.reports"),
    false,
  );
  assert.equal(
    result.warnings.some((item) => item.id === "sanitize.reports"),
    false,
  );
});

test("evaluateProductizationReadiness blocks non-example files under reports/examples", () => {
  const root = fixtureRoot();
  writeMinimalRepo(root);
  write(root, "reports/.gitkeep", "");
  write(root, "reports/examples/internal.md", "not curated\n");

  const result = evaluateProductizationReadiness({ root, publicRelease: true });
  const blocker = result.blockers.find((item) => item.id === "sanitize.reports");
  assert.ok(blocker);
  assert.deepEqual(blocker.details.sample, ["reports/examples/internal.md"]);
});

test("evaluateProductizationReadiness blocks real env files", () => {
  const root = fixtureRoot();
  writeMinimalRepo(root);
  write(root, "kits/company-os-kit/.env", "SECRET=1\n");
  write(root, "kits/company-os-kit/.env.example", "SECRET=\n");

  const result = evaluateProductizationReadiness({ root });
  assert.equal(result.ok, false);
  assert.ok(result.blockers.some((item) => item.id === "sanitize.no-real-env"));
});

test("kit.legacy-ledger-template passes when the Linear template is labelled legacy", () => {
  const root = fixtureRoot();
  writeMinimalRepo(root);
  write(
    root,
    "kits/company-os-kit/.company-os/templates/linear-worker-issue-template.md",
    "# Legacy bridge\n\nLinear is legacy / bridge surface. Plane is canonical.\n",
  );

  const result = evaluateProductizationReadiness({ root });
  assert.equal(result.ok, true, result.blockers.map((item) => item.message).join("\n"));
  assert.ok(
    result.checks.some(
      (check) => check.id === "kit.legacy-ledger-template" && check.status === "pass",
    ),
  );
});

test("kit.legacy-ledger-template blocks when the kit asserts Linear-as-canonical", () => {
  const root = fixtureRoot();
  writeMinimalRepo(root);
  write(
    root,
    "kits/company-os-kit/.company-os/templates/linear-worker-issue-template.md",
    "# Kit\n\nLinear is the execution ledger. Use it for every worker.\n",
  );

  const result = evaluateProductizationReadiness({ root });
  assert.equal(result.ok, false);
  const blocker = result.blockers.find((item) => item.id === "kit.legacy-ledger-template");
  assert.ok(blocker, "expected kit.legacy-ledger-template blocker");
  assert.deepEqual(blocker.details.lines, [3]);
});

test("kit.legacy-ledger-registry blocks when execution_ledger is not Plane", () => {
  const root = fixtureRoot();
  writeMinimalRepo(root);
  write(
    root,
    "kits/company-os-kit/.company-os/operations/workspace-registry.example.json",
    JSON.stringify({ defaults: { execution_ledger: "linear" } }, null, 2),
  );

  const result = evaluateProductizationReadiness({ root });
  assert.equal(result.ok, false);
  const blocker = result.blockers.find((item) => item.id === "kit.legacy-ledger-registry");
  assert.ok(blocker, "expected kit.legacy-ledger-registry blocker");
  assert.equal(blocker.details.execution_ledger, "linear");
});

test("kit.legacy-ledger-registry passes when execution_ledger is plane", () => {
  const root = fixtureRoot();
  writeMinimalRepo(root);
  write(
    root,
    "kits/company-os-kit/.company-os/operations/workspace-registry.example.json",
    JSON.stringify({ defaults: { execution_ledger: "plane" } }, null, 2),
  );

  const result = evaluateProductizationReadiness({ root });
  assert.ok(
    result.checks.some(
      (check) => check.id === "kit.legacy-ledger-registry" && check.status === "pass",
    ),
  );
});

test("docs.hard-coded-developer-paths warns in guided alpha, blocks for public release", () => {
  const root = fixtureRoot();
  writeMinimalRepo(root);
  write(
    root,
    "docs/operations/example.md",
    "Run [LOCAL_WORKSPACE]",
  );

  const guided = evaluateProductizationReadiness({ root });
  assert.equal(guided.ok, true);
  const guidedWarn = guided.warnings.find((item) => item.id === "docs.hard-coded-developer-paths");
  assert.ok(guidedWarn);
  assert.equal(guidedWarn.details.count, 1);
  assert.ok(guidedWarn.details.sample[0].startsWith("docs/operations/example.md:"));

  const publicRelease = evaluateProductizationReadiness({ root, publicRelease: true });
  assert.equal(publicRelease.ok, false);
  assert.ok(
    publicRelease.blockers.some((item) => item.id === "docs.hard-coded-developer-paths"),
  );
});

test("docs.hard-coded-developer-paths also covers scripts before public release", () => {
  const root = fixtureRoot();
  writeMinimalRepo(root);
  write(
    root,
    "scripts/orchestration/local-path.mjs",
    "const root = '[LOCAL_WORKSPACE]';\n",
  );

  const guided = evaluateProductizationReadiness({ root });
  assert.equal(guided.ok, true);
  const guidedWarn = guided.warnings.find((item) => item.id === "docs.hard-coded-developer-paths");
  assert.ok(guidedWarn);
  assert.equal(guidedWarn.details.count, 1);
  assert.ok(guidedWarn.details.sample[0].startsWith("scripts/orchestration/local-path.mjs:"));

  const publicRelease = evaluateProductizationReadiness({ root, publicRelease: true });
  assert.equal(publicRelease.ok, false);
  assert.ok(
    publicRelease.blockers.some((item) => item.id === "docs.hard-coded-developer-paths"),
  );
});

test("kit.founder-identity-leak warns in guided alpha, blocks for public release", () => {
  const root = fixtureRoot();
  writeMinimalRepo(root);
  write(
    root,
    "kits/company-os-kit/templates/AGENTS.md",
    [
      "# Kit",
      "",
      "**User:** Mathias Heinke, Founder ARES",
      "",
      "## Plane-First Execution Ledger",
      "",
      "## Spec-to-Worker Pipeline",
      "",
    ].join("\n"),
  );

  const guided = evaluateProductizationReadiness({ root });
  assert.equal(guided.ok, true);
  assert.ok(
    guided.warnings.some((item) => item.id === "kit.founder-identity-leak"),
  );

  const publicRelease = evaluateProductizationReadiness({ root, publicRelease: true });
  assert.equal(publicRelease.ok, false);
  assert.ok(
    publicRelease.blockers.some((item) => item.id === "kit.founder-identity-leak"),
  );
});

test("kit.private-domain-leak warns in guided alpha, blocks for public release", () => {
  const root = fixtureRoot();
  writeMinimalRepo(root);
  const privateDomain = ["dash", "bio-os"].join(".");
  const privateAdapter = ["ares", "hermes"].join("-");
  write(
    root,
    "kits/company-os-kit/.antigravity/tech-stack-context.md",
    `Production runs at https://${privateDomain}.io with ${privateAdapter} adapter.\n`,
  );

  const guided = evaluateProductizationReadiness({ root });
  assert.equal(guided.ok, true);
  const guidedWarn = guided.warnings.find((item) => item.id === "kit.private-domain-leak");
  assert.ok(guidedWarn);
  assert.ok(guidedWarn.details.count >= 1);

  const publicRelease = evaluateProductizationReadiness({ root, publicRelease: true });
  assert.equal(publicRelease.ok, false);
  assert.ok(
    publicRelease.blockers.some((item) => item.id === "kit.private-domain-leak"),
  );
});

test("kit.private-domain-leak catches source workspace names such as [SOURCE_WORKSPACE]", () => {
  const root = fixtureRoot();
  writeMinimalRepo(root);
  write(
    root,
    "scripts/model-router/example.mjs",
    `const workspace = '${["ares", "app"].join("-")}';\n`,
  );

  const guided = evaluateProductizationReadiness({ root });
  assert.equal(guided.ok, true);
  const guidedWarn = guided.warnings.find((item) => item.id === "kit.private-domain-leak");
  assert.ok(guidedWarn);
  assert.equal(guidedWarn.details.count, 1);

  const publicRelease = evaluateProductizationReadiness({ root, publicRelease: true });
  assert.equal(publicRelease.ok, false);
  assert.ok(
    publicRelease.blockers.some((item) => item.id === "kit.private-domain-leak"),
  );
});

test("kit.token-shaped-string redacts token values and blocks on public release", () => {
  const root = fixtureRoot();
  writeMinimalRepo(root);
  const leakedToken = `${["ares", "hermes"].join("-")}-${"a".repeat(28)}`;
  write(
    root,
    "kits/company-os-kit/.antigravity/logs/architect-memory.md",
    `# Memory\n\nVITE_HERMES_API_TOKEN = ${leakedToken}\n`,
  );

  const guided = evaluateProductizationReadiness({ root });
  const guidedWarn = guided.warnings.find((item) => item.id === "kit.token-shaped-string");
  assert.ok(guidedWarn, "expected kit.token-shaped-string warning in guided mode");
  assert.equal(guidedWarn.details.count, 1);
  const [evidence] = guidedWarn.details.sample;
  assert.equal(evidence.pattern, "source-company-token");
  assert.equal(evidence.line, 3);
  assert.ok(evidence.path.endsWith("architect-memory.md"));
  const serialized = JSON.stringify(guidedWarn);
  assert.ok(
    !serialized.includes(leakedToken),
    "token-shaped-string evidence must not include the redacted value",
  );

  const publicRelease = evaluateProductizationReadiness({ root, publicRelease: true });
  assert.equal(publicRelease.ok, false);
  const blocker = publicRelease.blockers.find((item) => item.id === "kit.token-shaped-string");
  assert.ok(blocker, "expected kit.token-shaped-string blocker for public release");
  const publicSerialized = JSON.stringify(blocker);
  assert.ok(
    !publicSerialized.includes(leakedToken),
    "public-release blocker must not include the redacted token value",
  );
});

test("kit.token-shaped-string catches Supabase token-shaped values", () => {
  const root = fixtureRoot();
  writeMinimalRepo(root);
  const leakedToken = ["su", "test", "abcdefghijklmnopqrstuvwxyz"].join("_");
  write(
    root,
    "kits/company-os-kit/.company-os/operations/example.md",
    `SUPABASE_ACCESS_TOKEN=${leakedToken}\n`,
  );

  const publicRelease = evaluateProductizationReadiness({ root, publicRelease: true });
  assert.equal(publicRelease.ok, false);
  const blocker = publicRelease.blockers.find((item) => item.id === "kit.token-shaped-string");
  assert.ok(blocker, "expected kit.token-shaped-string blocker for Supabase-like token");
  assert.equal(blocker.details.sample[0].pattern, "supabase-token");
  assert.equal(JSON.stringify(blocker).includes(leakedToken), false);
});

test("install.prerequisite-drift warns when installer scaffolding is missing", () => {
  const root = fixtureRoot();
  writeMinimalRepo(root);

  const guided = evaluateProductizationReadiness({ root });
  const guidedWarn = guided.warnings.find((item) => item.id === "install.prerequisite-drift");
  assert.ok(guidedWarn);
  assert.deepEqual(guidedWarn.details.missing, [".env.example", "scripts/install/bootstrap.mjs"]);

  const publicRelease = evaluateProductizationReadiness({ root, publicRelease: true });
  assert.equal(publicRelease.ok, false);
  assert.ok(
    publicRelease.blockers.some((item) => item.id === "install.prerequisite-drift"),
  );

  write(root, ".env.example", "PLANE_API_KEY=\n");
  write(root, "scripts/install/bootstrap.mjs", "// placeholder\n");

  const afterFix = evaluateProductizationReadiness({ root });
  assert.ok(
    afterFix.checks.some(
      (check) => check.id === "install.prerequisite-drift" && check.status === "pass",
    ),
  );
});
