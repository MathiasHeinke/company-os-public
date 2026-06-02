import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  REQUIRED_RUNTIME_DOCS,
  REQUIRED_RUNTIME_SCRIPTS,
  REQUIRED_RUNTIME_TESTS,
  collectRuntime04Evidence,
  evaluateRuntime04Readiness,
} from "./runtime-04-readiness-core.mjs";

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "runtime-04-readiness-"));
}

function write(root, relativePath, content = "ok\n") {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
}

function writeMinimalRuntimeRepo(root) {
  for (const doc of REQUIRED_RUNTIME_DOCS) write(root, doc);
  for (const script of REQUIRED_RUNTIME_SCRIPTS) write(root, script);
  for (const testFile of REQUIRED_RUNTIME_TESTS) write(root, testFile);
  write(root, "docs/releases/versioning.md", "Stage 7 / 9 proven, Stage 8-9 gated\n");
}

function writeRuntimePassReport(root, name = "reports/runtime-pilots/2026-05-11/pass.md") {
  write(root, name, [
    "# Runtime",
    "| state | PASS |",
    "| stream_health | PASS |",
    "worker.run-summary",
    "CAO PASS",
    "controller.decision AUTO-GO",
    "- auth: PASS",
    "- capability_profile: PASS",
    "- artifact_paths: PASS",
    "",
  ].join("\n"));
}

function writeSchedulerSuccessReport(root, name) {
  if (name.endsWith(".json")) {
    write(root, name, `${JSON.stringify({ version: "hard-cron-wrapper/v1", ok: true, status: "success" }, null, 2)}\n`);
    return;
  }
  write(root, name, [
    "# Hard Cron",
    "Status: `success`",
    "OK: `true`",
    "",
  ].join("\n"));
}

test("collectRuntime04Evidence finds runtime PASS, CAO, controller and scheduler reports", () => {
  const root = fixtureRoot();
  writeRuntimePassReport(root);
  writeSchedulerSuccessReport(root, "reports/runtime-auth/2026-05-11/one-hard-cron.md");

  const evidence = collectRuntime04Evidence({ root });
  assert.equal(evidence.runtime_pass_reports.length, 1);
  assert.equal(evidence.runtime_cao_reports.length, 1);
  assert.equal(evidence.runtime_controller_reports.length, 1);
  assert.equal(evidence.scheduler_success_reports.length, 1);
});

test("evaluateRuntime04Readiness is alpha-ready when runtime docs, scripts and evidence are present", () => {
  const root = fixtureRoot();
  writeMinimalRuntimeRepo(root);
  writeRuntimePassReport(root);
  writeSchedulerSuccessReport(root, "reports/runtime-auth/2026-05-11/one-hard-cron.md");
  writeSchedulerSuccessReport(root, "reports/runtime-auth/2026-05-11/two-hard-cron.md");
  writeSchedulerSuccessReport(root, "reports/runtime-auth/2026-05-11/three-hard-cron.json");

  const result = evaluateRuntime04Readiness({ root });
  assert.equal(result.status, "alpha-ready", result.blockers.map((item) => item.message).join("\n"));
  assert.equal(result.ok, true);
  assert.equal(result.rc_ready, true);
});

test("evaluateRuntime04Readiness can be RC-ready while scheduler threshold is still open", () => {
  const root = fixtureRoot();
  writeMinimalRuntimeRepo(root);
  writeRuntimePassReport(root);

  const result = evaluateRuntime04Readiness({ root });
  assert.equal(result.status, "rc-ready");
  assert.equal(result.ok, false);
  assert.equal(result.rc_ready, true);
  assert.ok(result.blockers.some((item) => item.id === "runtime04.evidence.scheduler-success"));
});

test("evaluateRuntime04Readiness blocks when required scripts are missing", () => {
  const root = fixtureRoot();
  writeMinimalRuntimeRepo(root);
  fs.rmSync(path.join(root, REQUIRED_RUNTIME_SCRIPTS[0]));
  writeRuntimePassReport(root);
  writeSchedulerSuccessReport(root, "reports/runtime-auth/2026-05-11/one-hard-cron.md");
  writeSchedulerSuccessReport(root, "reports/runtime-auth/2026-05-11/two-hard-cron.md");
  writeSchedulerSuccessReport(root, "reports/runtime-auth/2026-05-11/three-hard-cron.md");

  const result = evaluateRuntime04Readiness({ root });
  assert.equal(result.status, "blocked");
  assert.equal(result.rc_ready, false);
  assert.ok(result.blockers.some((item) => item.id === "runtime04.scripts.required"));
});
