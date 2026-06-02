import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  VIDEO_ENGINE_FOLDERS,
  buildVideoFirstContentEngineStartPlan,
  writeVideoFirstContentEngineStartPlan,
} from "./video-first-content-engine-start-core.mjs";

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "video-engine-start-"));
}

test("builds a dry-run plan without writing files", () => {
  const root = tmpRoot();
  const plan = buildVideoFirstContentEngineStartPlan({
    root,
    company: "Example Company",
    approvalOwner: "Founder",
    date: "2026-05-27",
  });

  assert.equal(plan.company, "Example Company");
  assert.equal(plan.approval_owner, "Founder");
  assert.equal(plan.directories.length, VIDEO_ENGINE_FOLDERS.length);
  assert.equal(fs.existsSync(path.join(root, "content/video-engine")), false);
  assert.ok(plan.files.some((entry) => entry.relative_path === "content/video-engine/RUNBOOK.md"));
  assert.ok(plan.blocked_actions.includes("publisher-api-write"));
});

test("writes the folder structure and config", () => {
  const root = tmpRoot();
  const plan = buildVideoFirstContentEngineStartPlan({
    root,
    company: "Example Company",
    approvalOwner: "Founder",
    date: "2026-05-27",
  });
  const result = writeVideoFirstContentEngineStartPlan(plan);

  assert.equal(result.directories.length, VIDEO_ENGINE_FOLDERS.length);
  for (const [folder] of VIDEO_ENGINE_FOLDERS) {
    assert.equal(fs.existsSync(path.join(root, "content/video-engine", folder)), true);
    assert.equal(fs.existsSync(path.join(root, "content/video-engine", folder, "README.md")), true);
  }
  const config = JSON.parse(fs.readFileSync(path.join(root, "content/video-engine/video-engine.config.json"), "utf8"));
  assert.equal(config.mode, "dry-run-only");
  assert.equal(config.publisher_policy.youtube, "dry-run-only");
  assert.equal(config.approval_owner, "Founder");
});

test("write is idempotent and keeps existing files by default", () => {
  const root = tmpRoot();
  const plan = buildVideoFirstContentEngineStartPlan({
    root,
    company: "Example Company",
    approvalOwner: "Founder",
    date: "2026-05-27",
  });
  writeVideoFirstContentEngineStartPlan(plan);
  const runbook = path.join(root, "content/video-engine/RUNBOOK.md");
  fs.writeFileSync(runbook, "custom local runbook\n");
  const second = writeVideoFirstContentEngineStartPlan(plan);

  assert.equal(fs.readFileSync(runbook, "utf8"), "custom local runbook\n");
  assert.ok(second.files.some((entry) => entry.relative_path === "content/video-engine/RUNBOOK.md" && entry.status === "kept"));
});

test("force overwrites existing generated files", () => {
  const root = tmpRoot();
  const plan = buildVideoFirstContentEngineStartPlan({
    root,
    company: "Example Company",
    approvalOwner: "Founder",
    date: "2026-05-27",
  });
  writeVideoFirstContentEngineStartPlan(plan);
  const runbook = path.join(root, "content/video-engine/RUNBOOK.md");
  fs.writeFileSync(runbook, "custom local runbook\n");
  const second = writeVideoFirstContentEngineStartPlan(plan, { force: true });

  assert.match(fs.readFileSync(runbook, "utf8"), /Video-First Content Engine Runbook/);
  assert.ok(second.files.some((entry) => entry.relative_path === "content/video-engine/RUNBOOK.md" && entry.status === "overwritten"));
});

test("rejects private path or token-shaped literals in public config fields", () => {
  assert.throws(
    () => buildVideoFirstContentEngineStartPlan({
      root: tmpRoot(),
      company: "${LOCAL_WORKSPACE}",
      approvalOwner: "Founder",
    }),
    /company contains a private path or token-shaped literal/,
  );
  assert.throws(
    () => buildVideoFirstContentEngineStartPlan({
      root: tmpRoot(),
      company: "Example Company",
      approvalOwner: "sk-or-v1-exampletokenexampletoken",
    }),
    /approvalOwner contains a private path or token-shaped literal/,
  );
});
