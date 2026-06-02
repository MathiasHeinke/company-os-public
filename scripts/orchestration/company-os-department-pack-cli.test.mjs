import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(".");
const SCAFFOLD_CLI = path.join(ROOT, "scripts/orchestration/company-os-department-pack-scaffold.mjs");
const EVALUATOR_CLI = path.join(ROOT, "scripts/orchestration/company-os-department-pack-evaluator.mjs");

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "company-os-department-pack-cli-"));
}

function runNode(args) {
  return childProcess.spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
  });
}

function writeCapabilityRegistry(root) {
  const file = path.join(root, "registries/capabilities/company-os.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({
    version: "capability-registry/v0",
    profiles: [
      {
        id: "claude-clevel-worker/cto/department-capability-pack-creator",
        forbidden_surfaces: [
          "plane-done-by-worker",
          "production-write",
          "public-publish",
          "secret-read",
        ],
      },
    ],
  }, null, 2)}\n`);
}

test("department pack CLI dry-run emits scaffold JSON without writing files", () => {
  const root = tempRoot();
  const result = runNode([
    SCAFFOLD_CLI,
    "--root", root,
    "--pack-id", "customer-support-kb",
    "--name", "Customer Support KB",
    "--owner-role", "role:coo",
    "--client-domain", "customer-support-kb",
    "--date", "2026-05-26",
    "--json",
  ]);
  assert.equal(result.status, 0, result.stderr);
  const json = JSON.parse(result.stdout);
  assert.equal(json.ok, true);
  assert.equal(json.written, false);
  assert.equal(json.scaffold.files.length, 8);
  assert.equal(
    fs.existsSync(path.join(root, "docs/orchestration/company-os-customer-support-kb-department-pack-v0.md")),
    false,
  );
});

test("department pack CLI write plus evaluator produce READY scorecard", () => {
  const root = tempRoot();
  writeCapabilityRegistry(root);
  const scaffold = runNode([
    SCAFFOLD_CLI,
    "--root", root,
    "--pack-id", "customer-support-kb",
    "--name", "Customer Support KB",
    "--owner-role", "role:coo",
    "--client-domain", "customer-support-kb",
    "--date", "2026-05-26",
    "--write",
    "--json",
  ]);
  assert.equal(scaffold.status, 0, scaffold.stderr);
  const evaluate = runNode([
    EVALUATOR_CLI,
    "--root", root,
    "--pack-id", "customer-support-kb",
    "--date", "2026-05-26",
    "--write",
    "--json",
  ]);
  assert.equal(evaluate.status, 0, evaluate.stderr);
  const json = JSON.parse(evaluate.stdout);
  assert.equal(json.ok, true);
  assert.equal(json.status, "READY");
  assert.equal(json.report.score_summary.average, 10);
  assert.equal(json.report.score_summary.minimum, 10);
  assert.ok(fs.existsSync(json.paths.markdown));
  assert.ok(fs.existsSync(json.paths.json));
});
