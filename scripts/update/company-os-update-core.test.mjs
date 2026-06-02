import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyCompanyOsUpdate,
  HARD_BLOCKED_UPDATE_PATHS,
  LOCAL_STATE_FILES,
  MANUAL_REVIEW_PATHS,
  planCompanyOsUpdate,
  renderEveUpdateSummary,
  renderUpdateReport,
  writeUpdateReport,
} from "./company-os-update-core.mjs";

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "company-os-update-"));
}

function writeFile(root, relativePath, content) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
  return absolute;
}

function makeSource() {
  const source = tmpDir();
  writeFile(source, "VERSION", "0.7.2\n");
  writeFile(source, "kits/company-os-kit/README.md", "# Kit v2\n");
  writeFile(source, "kits/company-os-kit/.company-os/env.example", "COMPANY_OS_VERSION=0.7.2\n");
  writeFile(source, "kits/company-os-kit/.company-os/operations/software-stack.example.md", "# Stack v2\n");
  writeFile(source, "kits/company-os-kit/scripts/example/.pytest_cache/CACHEDIR.TAG", "ignore\n");
  return source;
}

function makeTarget() {
  const target = tmpDir();
  writeFile(target, "README.md", "# Kit v1\n");
  writeFile(target, ".company-os/env.example", "COMPANY_OS_VERSION=0.7.1\n");
  writeFile(target, ".company-os/install-record.md", "Company.OS version: 0.7.1\n");
  writeFile(target, ".company-os/operations/workspace-registry.json", "{}\n");
  return target;
}

// --- Original tests (preserved) ---

test("planCompanyOsUpdate reports add/update/unchanged and preserves local state", () => {
  const source = makeSource();
  const target = makeTarget();
  const plan = planCompanyOsUpdate({ source, target, toVersion: "0.7.2", date: "2026-05-28" });
  assert.equal(plan.ok, true);
  assert.equal(plan.source_version, "0.7.2");
  assert.equal(plan.target_version, "0.7.1");
  assert.equal(plan.summary.update, 2);
  assert.equal(plan.summary.add, 1);
  assert.equal(plan.changed_files.some((row) => row.path.includes(".pytest_cache")), false);
  assert.ok(plan.local_state.find((row) => row.path === ".company-os/install-record.md").preserved);
});

test("applyCompanyOsUpdate dry-run does not modify target files", () => {
  const source = makeSource();
  const target = makeTarget();
  const before = fs.readFileSync(path.join(target, "README.md"), "utf8");
  const result = applyCompanyOsUpdate({ source, target, toVersion: "0.7.2", dryRun: true, date: "2026-05-28" });
  assert.equal(result.ok, true);
  assert.equal(result.status, "dry-run");
  assert.equal(fs.readFileSync(path.join(target, "README.md"), "utf8"), before);
});

test("applyCompanyOsUpdate refuses source-is-target apply", () => {
  const source = makeSource();
  const result = applyCompanyOsUpdate({ source, target: source, date: "2026-05-28" });
  assert.equal(result.ok, false);
  assert.equal(result.status, "source-is-target");
  assert.equal(result.applied, false);
  assert.ok(result.errors.some((e) => e.includes("same path")));
});

test("applyCompanyOsUpdate refuses not-installed target apply", () => {
  const source = makeSource();
  const target = tmpDir();
  writeFile(target, "README.md", "# Bare workspace\n");
  const result = applyCompanyOsUpdate({ source, target, date: "2026-05-28" });
  assert.equal(result.ok, false);
  assert.equal(result.status, "not-installed");
  assert.equal(result.applied, false);
  assert.ok(result.errors.some((e) => e.includes("not installed")));
  assert.equal(fs.existsSync(path.join(target, ".agents/rules/system.md")), false);
});

test("applyCompanyOsUpdate copies changed kit files and preserves active local state", () => {
  const source = makeSource();
  const target = makeTarget();
  const result = applyCompanyOsUpdate({ source, target, toVersion: "0.7.2", date: "2026-05-28" });
  assert.equal(result.ok, true);
  assert.equal(result.status, "pass");
  assert.ok(result.files_copied.includes("README.md"));
  assert.equal(fs.readFileSync(path.join(target, "README.md"), "utf8"), "# Kit v2\n");
  assert.equal(
    fs.readFileSync(path.join(target, ".company-os/install-record.md"), "utf8"),
    "Company.OS version: 0.7.1\n",
    "active install record must be preserved",
  );
  assert.ok(result.report.markdown.endsWith("company-os-update-0.7.2.md"));
});

test("writeUpdateReport creates markdown and json report", () => {
  const source = makeSource();
  const target = makeTarget();
  const plan = planCompanyOsUpdate({ source, target, toVersion: "0.7.2", date: "2026-05-28" });
  const report = writeUpdateReport({ target, plan, applied: false, dryRun: true });
  assert.ok(fs.existsSync(path.join(target, report.markdown)));
  assert.ok(fs.existsSync(path.join(target, report.json)));
  const markdown = fs.readFileSync(path.join(target, report.markdown), "utf8");
  assert.match(markdown, /Company.OS Update Report/);
  assert.match(markdown, /Dry-run: yes/);
});

test("renderUpdateReport names blocked actions for /update_eve handoff", () => {
  const source = makeSource();
  const target = makeTarget();
  const plan = planCompanyOsUpdate({ source, target, toVersion: "0.7.2", date: "2026-05-28" });
  const markdown = renderUpdateReport(plan, { applied: false, dryRun: true });
  assert.match(markdown, /do not overwrite active \.company-os local state/);
  assert.match(markdown, /AionUI\/Hermes sidecar updates/);
});

// --- New tests: source==target, not-installed, collision, blocked, manual-review, version pin, EVE summary ---

test("planCompanyOsUpdate detects source-is-target and returns explicit classification", () => {
  const source = makeSource();
  const plan = planCompanyOsUpdate({ source, target: source, date: "2026-05-28" });
  assert.equal(plan.ok, true);
  assert.equal(plan.status, "source-is-target");
  assert.equal(plan.source_is_target, true);
  assert.equal(plan.installed, false);
  assert.equal(plan.changes.length, 0);
  assert.equal(plan.changed_files.length, 0);
});

test("planCompanyOsUpdate flags not-installed when target has no install-record.md", () => {
  const source = makeSource();
  const target = tmpDir();
  writeFile(target, "README.md", "# Bare workspace\n");
  const plan = planCompanyOsUpdate({ source, target, date: "2026-05-28" });
  assert.equal(plan.ok, true);
  assert.equal(plan.status, "not-installed");
  assert.equal(plan.installed, false);
  assert.ok(plan.changes.length > 0, "plan must still list kit files for operator reference");
});

test("planCompanyOsUpdate classifies collision when kit file would overwrite local state", () => {
  const source = makeSource();
  const target = makeTarget();
  const collisionPath = ".company-os/operations/software-stack.md";
  assert.ok(LOCAL_STATE_FILES.includes(collisionPath));
  writeFile(source, `kits/company-os-kit/${collisionPath}`, "# kit version\n");
  writeFile(target, collisionPath, "# user-customized stack\n");
  const plan = planCompanyOsUpdate({ source, target, toVersion: "0.7.2", date: "2026-05-28" });
  const col = plan.changes.find((r) => r.path === collisionPath);
  assert.ok(col, "collision entry must appear in changes");
  assert.equal(col.status, "collision");
  assert.equal(plan.summary.collision, 1);
});

test("applyCompanyOsUpdate skips collision files and does not overwrite local state", () => {
  const source = makeSource();
  const target = makeTarget();
  const collisionPath = ".company-os/operations/software-stack.md";
  writeFile(source, `kits/company-os-kit/${collisionPath}`, "# kit version\n");
  writeFile(target, collisionPath, "# user-customized stack\n");
  const result = applyCompanyOsUpdate({ source, target, toVersion: "0.7.2", date: "2026-05-28" });
  assert.equal(result.ok, true);
  assert.equal(result.status, "pass");
  assert.ok(!result.files_copied.includes(collisionPath), "collision must not be copied");
  assert.ok(result.files_skipped.some((r) => r.path === collisionPath && r.reason === "collision"));
  assert.equal(fs.readFileSync(path.join(target, collisionPath), "utf8"), "# user-customized stack\n");
});

test("planCompanyOsUpdate classifies blocked when kit file is at a hard-blocked path", () => {
  const source = makeSource();
  const target = makeTarget();
  const blockedPath = ".company-os/operations/human-gates.md";
  assert.ok(HARD_BLOCKED_UPDATE_PATHS.has(blockedPath));
  writeFile(source, `kits/company-os-kit/${blockedPath}`, "# kit human gates\n");
  writeFile(target, blockedPath, "# operator human gates\n");
  const plan = planCompanyOsUpdate({ source, target, toVersion: "0.7.2", date: "2026-05-28" });
  const blk = plan.changes.find((r) => r.path === blockedPath);
  assert.ok(blk, "blocked entry must appear in changes");
  assert.equal(blk.status, "blocked");
  assert.equal(plan.summary.blocked, 1);
});

test("applyCompanyOsUpdate skips blocked files", () => {
  const source = makeSource();
  const target = makeTarget();
  const blockedPath = ".company-os/operations/human-gates.md";
  writeFile(source, `kits/company-os-kit/${blockedPath}`, "# kit human gates\n");
  writeFile(target, blockedPath, "# operator human gates\n");
  const result = applyCompanyOsUpdate({ source, target, toVersion: "0.7.2", date: "2026-05-28" });
  assert.equal(result.ok, true);
  assert.ok(!result.files_copied.includes(blockedPath));
  assert.ok(result.files_skipped.some((r) => r.path === blockedPath && r.reason === "blocked"));
  assert.equal(fs.readFileSync(path.join(target, blockedPath), "utf8"), "# operator human gates\n");
});

test("planCompanyOsUpdate classifies manual-review for connector manifests", () => {
  const source = makeSource();
  const target = makeTarget();
  const reviewPath = ".company-os/eve/connector-manifests.json";
  assert.ok(MANUAL_REVIEW_PATHS.has(reviewPath));
  writeFile(source, `kits/company-os-kit/${reviewPath}`, '{"version":"2"}\n');
  writeFile(target, reviewPath, '{"version":"1"}\n');
  const plan = planCompanyOsUpdate({ source, target, toVersion: "0.7.2", date: "2026-05-28" });
  const mr = plan.changes.find((r) => r.path === reviewPath);
  assert.ok(mr, "manual-review entry must appear in changes");
  assert.equal(mr.status, "manual-review");
  assert.equal(plan.summary.manual_review, 1);
});

test("applyCompanyOsUpdate skips manual-review files without operator approval", () => {
  const source = makeSource();
  const target = makeTarget();
  const reviewPath = ".company-os/eve/connector-manifests.json";
  writeFile(source, `kits/company-os-kit/${reviewPath}`, '{"version":"2"}\n');
  writeFile(target, reviewPath, '{"version":"1"}\n');
  const result = applyCompanyOsUpdate({ source, target, toVersion: "0.7.2", date: "2026-05-28" });
  assert.ok(!result.files_copied.includes(reviewPath));
  assert.ok(result.files_skipped.some((r) => r.path === reviewPath && r.reason === "manual-review"));
  assert.equal(fs.readFileSync(path.join(target, reviewPath), "utf8"), '{"version":"1"}\n');
});

test("applyCompanyOsUpdate rejects version pin mismatch", () => {
  const source = makeSource(); // VERSION=0.7.2
  const target = makeTarget();
  const result = applyCompanyOsUpdate({ source, target, toVersion: "0.9.0", date: "2026-05-28" });
  assert.equal(result.ok, false);
  assert.equal(result.status, "error");
  assert.ok(result.errors.some((e) => e.includes("Version pin mismatch")));
  assert.ok(result.errors.some((e) => e.includes("0.9.0")));
  assert.ok(result.errors.some((e) => e.includes("0.7.2")));
});

test("applyCompanyOsUpdate accepts correct version pin", () => {
  const source = makeSource(); // VERSION=0.7.2
  const target = makeTarget();
  const result = applyCompanyOsUpdate({ source, target, toVersion: "0.7.2", date: "2026-05-28" });
  assert.equal(result.ok, true);
  assert.equal(result.status, "pass");
});

test("applyCompanyOsUpdate proceeds with no --to (defaults to source version)", () => {
  const source = makeSource();
  const target = makeTarget();
  const result = applyCompanyOsUpdate({ source, target, date: "2026-05-28" });
  assert.equal(result.ok, true);
  assert.equal(result.status, "pass");
});

test("renderUpdateReport includes collision/blocked/manual-review sections", () => {
  const source = makeSource();
  const target = makeTarget();
  const collisionPath = ".company-os/operations/software-stack.md";
  writeFile(source, `kits/company-os-kit/${collisionPath}`, "# kit\n");
  writeFile(target, collisionPath, "# user\n");
  const plan = planCompanyOsUpdate({ source, target, toVersion: "0.7.2", date: "2026-05-28" });
  const md = renderUpdateReport(plan, { dryRun: true });
  assert.match(md, /Collision: 1/);
  assert.match(md, /## Collisions/);
  assert.match(md, /collision: .company-os\/operations\/software-stack.md/);
  assert.match(md, /## Manual Review Required/);
  assert.match(md, /## Blocked by Policy/);
  assert.match(md, /Installed: yes/);
});

test("renderEveUpdateSummary explains source-is-target to operator", () => {
  const source = makeSource();
  const plan = planCompanyOsUpdate({ source, target: source, date: "2026-05-28" });
  const summary = renderEveUpdateSummary(plan);
  assert.match(summary, /source-is-target/);
  assert.match(summary, /kit source check, not a client update check/);
});

test("renderEveUpdateSummary explains not-installed target to operator", () => {
  const source = makeSource();
  const target = tmpDir();
  writeFile(target, "README.md", "bare\n");
  const plan = planCompanyOsUpdate({ source, target, date: "2026-05-28" });
  const summary = renderEveUpdateSummary(plan);
  assert.match(summary, /not-yet-installed/);
  assert.match(summary, /install-record\.md/);
});

test("renderEveUpdateSummary shows impact counts before apply", () => {
  const source = makeSource();
  const target = makeTarget();
  const reviewPath = ".company-os/eve/connector-manifests.json";
  writeFile(source, `kits/company-os-kit/${reviewPath}`, '{"v":2}\n');
  writeFile(target, reviewPath, '{"v":1}\n');
  const plan = planCompanyOsUpdate({ source, target, toVersion: "0.7.2", date: "2026-05-28" });
  const summary = renderEveUpdateSummary(plan);
  assert.match(summary, /EVE Update Impact/);
  assert.match(summary, /Manual review: 1/);
  assert.match(summary, /Next Steps/);
});

test("protected state list covers install-record, workspace-registry, human-gates", () => {
  assert.ok(LOCAL_STATE_FILES.includes(".company-os/install-record.md"));
  assert.ok(LOCAL_STATE_FILES.includes(".company-os/operations/workspace-registry.json"));
  assert.ok(LOCAL_STATE_FILES.includes(".company-os/operations/human-gates.md"));
  assert.ok(HARD_BLOCKED_UPDATE_PATHS.has(".company-os/install-record.md"));
  assert.ok(HARD_BLOCKED_UPDATE_PATHS.has(".company-os/operations/workspace-registry.json"));
  assert.ok(HARD_BLOCKED_UPDATE_PATHS.has(".company-os/operations/human-gates.md"));
});
