import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildPageIndex,
  renderPageIndex,
} from "../page-index/page-index-core.mjs";
import {
  CLEAN_CLONE_VERIFIER_VERSION,
  KNOWN_DEFERRED_BLOCKER_IDS,
  STATUS_EXIT_CODES,
  deriveStatus,
  runVerifyCleanClone,
} from "./verify-clean-clone.mjs";

const VERSION_FIXTURE = "0.4.1-alpha.1";

function fixtureRoot(prefix = "verify-clean-clone-root-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function write(root, relativePath, content) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
}

function cleanupTempClone(result) {
  if (result?.temp_clone && fs.existsSync(result.temp_clone)) {
    fs.rmSync(result.temp_clone, { recursive: true, force: true });
  }
}

function writeCompletePublicTree(root) {
  write(root, "VERSION", `${VERSION_FIXTURE}\n`);
  write(
    root,
    "README.md",
    [
      "# Company.OS",
      "",
      `Current version: \`${VERSION_FIXTURE}\``,
      "",
      "guided alpha; not self-serve.",
      "",
    ].join("\n"),
  );
  write(
    root,
    "CHANGELOG.md",
    `# Changelog\n\n## ${VERSION_FIXTURE} - 2026-05-14\n\nentry\n`,
  );
  write(root, "LICENSE", "MIT\n");
  write(root, "ROADMAP.md", "# Roadmap\n");
  write(root, "AGENTS.md", "# AGENTS\n");

  write(root, "docs/bootstrap/fresh-company-setup.md", "# Setup\n");
  write(root, "docs/operations/company-os-client-rollout-doctrine.md", "# Rollout\n");
  write(
    root,
    "docs/operations/client-productization-readiness.md",
    [
      "# Client Productization Readiness",
      "",
      "Supabase is an optional backend connector, not a core requirement.",
      "",
      "Honcho coverage, Plane App integration, Scheduler boundaries documented.",
      "",
    ].join("\n"),
  );
  write(
    root,
    "docs/operations/operating-system-setup-checklist.md",
    "# Checklist\n",
  );
  write(root, "docs/orchestration/spec-to-worker-pipeline.md", "# Spec to worker\n");
  write(root, "docs/orchestration/plane-first-linear-bridge.md", "# Plane first\n");
  write(
    root,
    "docs/orchestration/headless-worker-runtime-boot-contract.md",
    "# Boot contract\n",
  );
  write(root, "docs/registries/capability-registry.md", "# Capability registry\n");
  write(root, "docs/integrations/plane-app-control-plane.md", "# Plane app\n");
  write(root, "docs/templates/worker-issue-contract.md", "# Worker contract\n");

  write(root, "scripts/page-index/generate-page-index.mjs", "// stub\n");
  write(root, "scripts/plane/plane-api-sanity.mjs", "// stub\n");
  write(root, "scripts/plane/plane-app-token-rotation.mjs", "// stub\n");
  write(root, "scripts/orchestration/plane-dispatcher-v0.mjs", "// stub\n");
  write(root, "scripts/orchestration/runtime-dispatcher-v1.mjs", "// stub\n");
  write(root, "scripts/orchestration/runtime-dispatcher-v12-core.mjs", "// stub\n");
  write(root, "scripts/orchestration/cao-pass.mjs", "// stub\n");
  write(root, "scripts/orchestration/codex-controller-dryrun.mjs", "// stub\n");
  write(root, "scripts/capabilities/capability-registry.mjs", "// stub\n");
  write(root, "scripts/release-gates/human-gate-release.mjs", "// stub\n");
  write(root, "scripts/release-gates/productization-readiness.mjs", "// stub\n");
  write(root, "scripts/release-gates/runtime-04-readiness.mjs", "// stub\n");
  write(root, "scripts/operator-shell/start_eve.mjs", "// stub\n");

  write(root, "kits/company-os-kit/README.md", "# Kit\n");
  write(
    root,
    "kits/company-os-kit/templates/AGENTS.md",
    [
      "# Kit AGENTS template",
      "",
      "Plane-First Execution Ledger is canonical.",
      "Spec-to-Worker pipeline links spec, plan, tasks to a parseable contract.",
      "",
    ].join("\n"),
  );

  write(root, "reports/.gitkeep", "");
  write(root, "reports/examples/example.example.md", "example\n");
  write(root, "metrics/agent-events.example.jsonl", "{}\n");
  write(root, "registries/capabilities/example.json", "{}\n");
  write(root, "registries/inference/example.json", "{}\n");

  const index = buildPageIndex(root, {
    source: "filesystem",
    ignoreFiles: ["docs/page-index.md"],
  });
  write(root, "docs/page-index.md", renderPageIndex({ ...index, source: "tracked" }));
}

test("KNOWN_DEFERRED_BLOCKER_IDS covers the documented deferred classes", () => {
  for (const id of [
    "docs.hard-coded-developer-paths",
    "kit.founder-identity-leak",
    "kit.private-domain-leak",
    "install.prerequisite-drift",
  ]) {
    assert.ok(
      KNOWN_DEFERRED_BLOCKER_IDS.has(id),
      `KNOWN_DEFERRED_BLOCKER_IDS missing ${id}`,
    );
  }
  assert.equal(
    KNOWN_DEFERRED_BLOCKER_IDS.has("sanitize.reports"),
    false,
    "sanitize.reports must be solved by the mirror builder/gate and must not be deferred",
  );
});

test("STATUS_EXIT_CODES match the documented contract", () => {
  assert.equal(STATUS_EXIT_CODES.PASS, 0);
  assert.equal(STATUS_EXIT_CODES.BLOCKED_PUBLIC_GATE, 1);
  assert.equal(STATUS_EXIT_CODES.BLOCKED_BOOTSTRAP, 2);
  assert.equal(STATUS_EXIT_CODES.BLOCKED_SECRET_SCAN, 3);
  assert.equal(STATUS_EXIT_CODES.BLOCKED_PRIVATE_PATH, 4);
  assert.equal(STATUS_EXIT_CODES.RUNTIME_ERROR, 5);
});

test("deriveStatus picks PASS when no checks failed", () => {
  assert.equal(
    deriveStatus([
      { id: "readme.version", status: "pass", detail: "" },
      { id: "git.bootstrap", status: "pass", detail: "" },
    ]),
    "PASS",
  );
});

test("deriveStatus precedence: SECRET_SCAN > PRIVATE_PATH > BOOTSTRAP > PUBLIC_GATE", () => {
  assert.equal(
    deriveStatus([
      { id: "secret.scan", status: "fail", detail: "" },
      { id: "private.path.scan", status: "fail", detail: "" },
      { id: "git.bootstrap", status: "fail", detail: "" },
      { id: "readme.version", status: "fail", detail: "" },
    ]),
    "BLOCKED_SECRET_SCAN",
  );
  assert.equal(
    deriveStatus([
      { id: "private.path.scan", status: "fail", detail: "" },
      { id: "git.bootstrap", status: "fail", detail: "" },
      { id: "public.release.gate", status: "fail", detail: "" },
    ]),
    "BLOCKED_PRIVATE_PATH",
  );
  assert.equal(
    deriveStatus([
      { id: "git.bootstrap", status: "fail", detail: "" },
      { id: "metrics.example-only", status: "fail", detail: "" },
    ]),
    "BLOCKED_BOOTSTRAP",
  );
  assert.equal(
    deriveStatus([
      { id: "reports.no-jsonl", status: "fail", detail: "" },
      { id: "changelog.version", status: "fail", detail: "" },
    ]),
    "BLOCKED_PUBLIC_GATE",
  );
});

test("runVerifyCleanClone returns PASS on a complete sanitized tree", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);

  const result = await runVerifyCleanClone({ root });

  assert.equal(
    result.status,
    "PASS",
    `expected PASS; checks: ${JSON.stringify(
      result.checks.filter((c) => c.status === "fail"),
      null,
      2,
    )}`,
  );
  assert.equal(result.exit_code, 0);
  assert.equal(result.version, CLEAN_CLONE_VERIFIER_VERSION);
  assert.equal(result.root, path.resolve(root));
  for (const check of result.checks) {
    assert.equal(
      check.status,
      "pass",
      `check ${check.id} not pass: ${check.detail}`,
    );
  }
  assert.equal(fs.existsSync(result.temp_clone), false);
  assert.equal(result.temp_clone_retained, false);
});

test("--keep-temp retains the temp clone after PASS", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);

  const result = await runVerifyCleanClone({ root, keepTemp: true });

  assert.equal(result.status, "PASS");
  assert.equal(fs.existsSync(result.temp_clone), true);
  assert.equal(result.temp_clone_retained, true);
  cleanupTempClone(result);
});

test("planted source-company token forces BLOCKED_SECRET_SCAN exit 3", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);
  const planted = ["ares", "hermes", "AABBCCDDEEFFGGHHIIJJ12345"].join("-");
  write(root, "scripts/orchestration/planted.mjs", `// planted: ${planted}\n`);

  const result = await runVerifyCleanClone({ root });

  assert.equal(result.status, "BLOCKED_SECRET_SCAN");
  assert.equal(result.exit_code, 3);
  const secretCheck = result.checks.find((entry) => entry.id === "secret.scan");
  assert.equal(secretCheck.status, "fail");
  assert.ok(secretCheck.evidence.count >= 1);
  assert.equal(fs.existsSync(result.temp_clone), true);
  cleanupTempClone(result);
});

test("planted /Users private path in docs forces BLOCKED_PRIVATE_PATH exit 4", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);
  write(
    root,
    "docs/operations/local-paths.md",
    "Run ${LOCAL_WORKSPACE} to start.\n",
  );

  const result = await runVerifyCleanClone({ root });

  assert.equal(result.status, "BLOCKED_PRIVATE_PATH");
  assert.equal(result.exit_code, 4);
  const pathCheck = result.checks.find((entry) => entry.id === "private.path.scan");
  assert.equal(pathCheck.status, "fail");
  cleanupTempClone(result);
});

test("planted /Users private path in scripts forces BLOCKED_PRIVATE_PATH exit 4", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);
  write(
    root,
    "scripts/orchestration/local-path.mjs",
    "const root = '${LOCAL_WORKSPACE}';\n",
  );

  const result = await runVerifyCleanClone({ root });

  assert.equal(result.status, "BLOCKED_PRIVATE_PATH");
  assert.equal(result.exit_code, 4);
  const pathCheck = result.checks.find((entry) => entry.id === "private.path.scan");
  assert.equal(pathCheck.status, "fail");
  assert.match(pathCheck.detail, /public mirror text files/);
  cleanupTempClone(result);
});

test("internal work item ids in scripts force BLOCKED_PRIVATE_PATH exit 4", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);
  write(
    root,
    "scripts/goal/example.mjs",
    `const issue = '${["COMPA", "215"].join("-")}';\n`,
  );

  const result = await runVerifyCleanClone({ root });

  assert.equal(result.status, "BLOCKED_PRIVATE_PATH");
  assert.equal(result.exit_code, 4);
  const markerCheck = result.checks.find((entry) => entry.id === "private.marker.scan");
  assert.equal(markerCheck.status, "fail");
  assert.match(markerCheck.evidence.sample[0], /internal-work-item-id/);
  cleanupTempClone(result);
});

test("source-company workspace names in scripts force BLOCKED_PRIVATE_PATH exit 4", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);
  write(
    root,
    "scripts/model-router/example.mjs",
    `const workspace = '${["ares", "app"].join("-")}';\n`,
  );

  const result = await runVerifyCleanClone({ root });

  assert.equal(result.status, "BLOCKED_PRIVATE_PATH");
  assert.equal(result.exit_code, 4);
  const markerCheck = result.checks.find((entry) => entry.id === "private.marker.scan");
  assert.equal(markerCheck.status, "fail");
  assert.match(markerCheck.evidence.sample[0], /private-source-marker/);
  cleanupTempClone(result);
});

test("sanitized source workspace placeholders are allowed in public trees", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);
  write(
    root,
    "docs/example.md",
    "Workspace: [SOURCE_WORKSPACE]\n",
  );
  const index = buildPageIndex(root, {
    source: "filesystem",
    ignoreFiles: ["docs/page-index.md"],
  });
  write(root, "docs/page-index.md", renderPageIndex({ ...index, source: "tracked" }));

  const result = await runVerifyCleanClone({ root });

  assert.equal(result.status, "PASS");
  const markerCheck = result.checks.find((entry) => entry.id === "private.marker.scan");
  assert.equal(markerCheck.status, "pass");
  cleanupTempClone(result);
});

test("README/VERSION mismatch yields BLOCKED_PUBLIC_GATE exit 1", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);
  write(root, "VERSION", "0.0.0-test\n");

  const result = await runVerifyCleanClone({ root });

  assert.equal(result.status, "BLOCKED_PUBLIC_GATE");
  assert.equal(result.exit_code, 1);
  const readmeCheck = result.checks.find((entry) => entry.id === "readme.version");
  assert.equal(readmeCheck.status, "fail");
  cleanupTempClone(result);
});

test("CHANGELOG missing version section yields BLOCKED_PUBLIC_GATE", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);
  write(root, "CHANGELOG.md", "# Changelog\n\nNo current version section yet.\n");

  const result = await runVerifyCleanClone({ root });

  assert.equal(result.status, "BLOCKED_PUBLIC_GATE");
  assert.equal(result.exit_code, 1);
  const changelogCheck = result.checks.find((entry) => entry.id === "changelog.version");
  assert.equal(changelogCheck.status, "fail");
  cleanupTempClone(result);
});

test("non-example reports/*.jsonl yields BLOCKED_PUBLIC_GATE", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);
  write(root, "reports/runs/internal.stream.jsonl", "{}\n");

  const result = await runVerifyCleanClone({ root });

  assert.equal(result.status, "BLOCKED_PUBLIC_GATE");
  assert.equal(result.exit_code, 1);
  const reportsCheck = result.checks.find((entry) => entry.id === "reports.no-jsonl");
  assert.equal(reportsCheck.status, "fail");
  cleanupTempClone(result);
});

test("non-example metrics/agent-*.jsonl yields BLOCKED_PUBLIC_GATE", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);
  write(root, "metrics/agent-events.jsonl", "{}\n");

  const result = await runVerifyCleanClone({ root });

  assert.equal(result.status, "BLOCKED_PUBLIC_GATE");
  assert.equal(result.exit_code, 1);
  const metricsCheck = result.checks.find((entry) => entry.id === "metrics.example-only");
  assert.equal(metricsCheck.status, "fail");
  cleanupTempClone(result);
});

test("missing required doc trips the public.release.gate check", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);
  fs.unlinkSync(path.join(root, "docs/bootstrap/fresh-company-setup.md"));

  const result = await runVerifyCleanClone({ root });

  assert.equal(result.status, "BLOCKED_PUBLIC_GATE");
  assert.equal(result.exit_code, 1);
  const gateCheck = result.checks.find((entry) => entry.id === "public.release.gate");
  assert.equal(gateCheck.status, "fail");
  assert.ok(
    Array.isArray(gateCheck.evidence.unexpected_blockers) &&
      gateCheck.evidence.unexpected_blockers.length >= 1,
  );
  cleanupTempClone(result);
});

test("git bootstrap failure yields BLOCKED_BOOTSTRAP exit 2", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);

  const result = await runVerifyCleanClone({
    root,
    gitBin: "git-this-does-not-exist-on-purpose",
  });

  assert.equal(result.status, "BLOCKED_BOOTSTRAP");
  assert.equal(result.exit_code, 2);
  const gitCheck = result.checks.find((entry) => entry.id === "git.bootstrap");
  assert.equal(gitCheck.status, "fail");
  cleanupTempClone(result);
});

test("stale public page index yields BLOCKED_PUBLIC_GATE", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);
  write(root, "docs/page-index.md", "# Page Index\n\nstale\n");

  const result = await runVerifyCleanClone({ root });

  assert.equal(result.status, "BLOCKED_PUBLIC_GATE");
  assert.equal(result.exit_code, 1);
  const pageIndexCheck = result.checks.find((entry) => entry.id === "page-index.current");
  assert.equal(pageIndexCheck.status, "fail");
  cleanupTempClone(result);
});

test("missing public page index yields BLOCKED_PUBLIC_GATE", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);
  fs.unlinkSync(path.join(root, "docs/page-index.md"));

  const result = await runVerifyCleanClone({ root });

  assert.equal(result.status, "BLOCKED_PUBLIC_GATE");
  assert.equal(result.exit_code, 1);
  const pageIndexCheck = result.checks.find((entry) => entry.id === "page-index.current");
  assert.equal(pageIndexCheck.status, "fail");
  cleanupTempClone(result);
});

test("RUNTIME_ERROR exit 5 when --root path does not exist", async () => {
  const nonExistent = path.join(
    os.tmpdir(),
    `verify-clean-clone-missing-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const result = await runVerifyCleanClone({ root: nonExistent });
  assert.equal(result.status, "RUNTIME_ERROR");
  assert.equal(result.exit_code, 5);
  assert.match(result.reason, /root\.not-found/);
});

test("RUNTIME_ERROR exit 5 when --root not provided", async () => {
  const result = await runVerifyCleanClone({});
  assert.equal(result.status, "RUNTIME_ERROR");
  assert.equal(result.exit_code, 5);
  assert.equal(result.reason, "missing-root");
});

test("secret scan takes precedence over private path on combined fail", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);
  const planted = ["ares", "hermes", "AABBCCDDEEFFGGHHIIJJ12345"].join("-");
  write(root, "scripts/orchestration/planted.mjs", `// planted: ${planted}\n`);
  write(
    root,
    "docs/operations/private-path.md",
    "Run ${LOCAL_WORKSPACE} here.\n",
  );

  const result = await runVerifyCleanClone({ root });

  assert.equal(result.status, "BLOCKED_SECRET_SCAN");
  assert.equal(result.exit_code, 3);
  cleanupTempClone(result);
});

test("--temp-dir places the temp clone under the requested parent directory", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);
  const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), "verify-clean-clone-tempdir-"));

  const result = await runVerifyCleanClone({ root, tempDir: tempParent, keepTemp: true });

  assert.equal(result.status, "PASS");
  assert.ok(
    result.temp_clone.startsWith(tempParent),
    `expected temp clone ${result.temp_clone} under ${tempParent}`,
  );
  cleanupTempClone(result);
  fs.rmSync(tempParent, { recursive: true, force: true });
});

test("script-private-path scanner no longer permits source-root leaks", async () => {
  const root = fixtureRoot();
  writeCompletePublicTree(root);
  write(
    root,
    "scripts/orchestration/path-fixture.mjs",
    "// reference path ${LOCAL_WORKSPACE} for tests\n",
  );

  const result = await runVerifyCleanClone({ root });
  assert.equal(result.status, "BLOCKED_PRIVATE_PATH");
  cleanupTempClone(result);
});
