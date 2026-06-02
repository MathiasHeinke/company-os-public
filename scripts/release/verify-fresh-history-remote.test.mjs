import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  FRESH_HISTORY_REMOTE_VERIFIER_VERSION,
  runVerifyFreshHistoryRemote,
} from "./verify-fresh-history-remote.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

function tempRoot(prefix = "fresh-history-remote-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test("runVerifyFreshHistoryRemote reports version and missing source as runtime error", async () => {
  const missing = path.join(os.tmpdir(), `missing-company-os-${Date.now()}`);
  const result = await runVerifyFreshHistoryRemote({
    sourceRoot: missing,
    tempDir: tempRoot(),
  });

  assert.equal(result.version, FRESH_HISTORY_REMOTE_VERIFIER_VERSION);
  assert.equal(result.status, "RUNTIME_ERROR");
  assert.equal(result.exit_code, 5);
  assert.match(result.reason, /source\.not-found/);
});

test("runVerifyFreshHistoryRemote proves local fresh-history remote, remote clone and bootstrap", async () => {
  const root = tempRoot();
  const result = await runVerifyFreshHistoryRemote({
    sourceRoot: REPO_ROOT,
    tempDir: root,
    keepTemp: false,
    now: () => new Date("2026-05-17T08:00:00.000Z"),
  });

  assert.equal(result.status, "PASS");
  assert.equal(result.exit_code, 0);
  assert.equal(result.run_root_retained, false);
  assert.equal(result.public_head, result.clone_head);

  const checks = new Map(result.checks.map((check) => [check.id, check]));
  assert.equal(checks.get("public-mirror.build")?.status, "pass");
  assert.equal(checks.get("fresh-history.local-remote")?.status, "pass");
  assert.equal(
    checks.get("fresh-history.local-remote")?.evidence?.remote_kind,
    "local-bare-temp",
  );
  assert.equal(checks.get("remote-clone.verify-clean-clone")?.status, "pass");
  assert.equal(checks.get("remote-clone.bootstrap-install")?.status, "pass");
  assert.ok(
    checks.get("remote-clone.bootstrap-install")?.evidence?.files_copied > 0,
    "bootstrap should copy kit files into the fresh target",
  );
});
