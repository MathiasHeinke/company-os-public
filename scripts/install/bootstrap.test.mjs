import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { BOOTSTRAP_VERSION, runBootstrap } from "./bootstrap-core.mjs";

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bootstrap-test-"));
}

function writeFile(dir, relativePath, content = "placeholder\n") {
  const absolute = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
  return absolute;
}

function makeMinimalSource() {
  const sourceRoot = tmpDir();
  const kitDir = path.join(sourceRoot, "kits", "company-os-kit");
  writeFile(sourceRoot, "kits/company-os-kit/AGENTS.md", "# Kit agents\n");
  writeFile(sourceRoot, "kits/company-os-kit/README.md", "# Kit readme\n");
  writeFile(sourceRoot, "kits/company-os-kit/.DS_Store", "ignore me\n");
  writeFile(sourceRoot, "kits/company-os-kit/.company-os/operations/install-record.example.md", "# Install\n");
  writeFile(sourceRoot, "kits/company-os-kit/.company-os/operations/workspace-registry.example.json", "{}\n");
  writeFile(sourceRoot, "kits/company-os-kit/.company-os/operations/software-stack.example.md", "# Stack\n");
  writeFile(sourceRoot, "kits/company-os-kit/.company-os/operations/human-gates.example.md", "# Gates\n");
  writeFile(sourceRoot, "kits/company-os-kit/.company-os/operations/first-run-checklist.example.md", "# Checklist\n");
  writeFile(sourceRoot, "kits/company-os-kit/.company-os/templates/company-discovery-brief.md", "# Discovery\n");
  writeFile(sourceRoot, "kits/company-os-kit/scripts/example/.pytest_cache/CACHEDIR.TAG", "ignore me\n");
  writeFile(sourceRoot, "kits/company-os-kit/templates/worker-template.md", "# Worker\n");
  return { sourceRoot, kitDir };
}

test("runBootstrap returns version field matching BOOTSTRAP_VERSION", () => {
  const { sourceRoot } = makeMinimalSource();
  const target = tmpDir();
  const result = runBootstrap({ source: sourceRoot, target, dryRun: true });
  assert.equal(result.version, BOOTSTRAP_VERSION);
});

test("dry-run: reports files_to_copy without writing any files", () => {
  const { sourceRoot } = makeMinimalSource();
  const target = tmpDir();

  const result = runBootstrap({ source: sourceRoot, target, dryRun: true });

  assert.equal(result.ok, true);
  assert.equal(result.dry_run, true);
  assert.equal(result.status, "dry-run");
  assert.ok(result.files_to_copy.length > 0, "should list files to copy");
  assert.ok(!result.files_to_copy.includes(".DS_Store"), "should not copy macOS metadata files");
  assert.ok(
    !result.files_to_copy.some((file) => file.includes(".pytest_cache")),
    "should not copy pytest cache files",
  );
  assert.ok(result.generated_files.length > 0, "should list active files to generate");
  assert.deepEqual(result.files_copied, [], "dry-run must not copy files");
  assert.deepEqual(result.files_generated, [], "dry-run must not generate active files");

  const targetContents = fs.readdirSync(target);
  assert.deepEqual(targetContents, [], "target directory must remain empty after dry-run");
});

test("missing generated-file template: returns error before writing", () => {
  const sourceRoot = tmpDir();
  writeFile(sourceRoot, "kits/company-os-kit/AGENTS.md", "# Kit agents\n");
  const target = tmpDir();

  const result = runBootstrap({ source: sourceRoot, target });

  assert.equal(result.ok, false);
  assert.equal(result.status, "error");
  assert.ok(result.missing_templates.includes(".company-os/operations/install-record.example.md"));
  assert.deepEqual(fs.readdirSync(target), [], "target directory must remain empty on template error");
});

test("missing source: returns error status when source path does not exist", () => {
  const missingSource = path.join(os.tmpdir(), `nonexistent-${Date.now()}`);
  const target = tmpDir();

  const result = runBootstrap({ source: missingSource, target });

  assert.equal(result.ok, false);
  assert.equal(result.status, "error");
  assert.ok(result.error, "error field should be set");
  assert.ok(result.error.includes("Source not found"), `unexpected error: ${result.error}`);
});

test("missing source: returns error when source exists but kits/company-os-kit is absent", () => {
  const sourceRoot = tmpDir();
  writeFile(sourceRoot, "README.md", "# Not a kit source\n");
  const target = tmpDir();

  const result = runBootstrap({ source: sourceRoot, target });

  assert.equal(result.ok, false);
  assert.equal(result.status, "error");
  assert.ok(result.error.includes("Kit directory not found"), `unexpected error: ${result.error}`);
});

test("target exists: refuses destructive overwrite by default when collision found", () => {
  const { sourceRoot } = makeMinimalSource();
  const target = tmpDir();
  writeFile(target, "AGENTS.md", "# Existing local customisation\n");

  const result = runBootstrap({ source: sourceRoot, target });

  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.ok(result.collisions.includes("AGENTS.md"));
  assert.ok(result.message, "blocked result should include a message");

  const targetContent = fs.readFileSync(path.join(target, "AGENTS.md"), "utf8");
  assert.equal(targetContent, "# Existing local customisation\n", "existing file must not be overwritten");
});

test("target exists: refuses to overwrite generated active files by default", () => {
  const { sourceRoot } = makeMinimalSource();
  const target = tmpDir();
  writeFile(target, ".company-os/install-record.md", "# Existing install\n");

  const result = runBootstrap({ source: sourceRoot, target });

  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.ok(result.collisions.includes(".company-os/install-record.md"));

  const targetContent = fs.readFileSync(path.join(target, ".company-os/install-record.md"), "utf8");
  assert.equal(targetContent, "# Existing install\n", "existing active file must not be overwritten");
});

test("--force allows overwriting existing files", () => {
  const { sourceRoot } = makeMinimalSource();
  const target = tmpDir();
  writeFile(target, "AGENTS.md", "# Old content\n");

  const result = runBootstrap({ source: sourceRoot, target, force: true });

  assert.equal(result.ok, true);
  assert.equal(result.status, "pass");
  const overwritten = fs.readFileSync(path.join(target, "AGENTS.md"), "utf8");
  assert.equal(overwritten, "# Kit agents\n", "force should overwrite the existing file");
});

test("happy path: copies all kit files into target without --force when no collision", () => {
  const { sourceRoot } = makeMinimalSource();
  const target = tmpDir();

  const result = runBootstrap({ source: sourceRoot, target });

  assert.equal(result.ok, true);
  assert.equal(result.status, "pass");
  assert.ok(result.files_copied.length > 0);
  assert.deepEqual(result.files_to_copy.sort(), result.files_copied.sort());
  assert.deepEqual(result.generated_files.sort(), result.files_generated.sort());

  for (const file of result.files_copied) {
    assert.ok(
      fs.existsSync(path.join(target, file)),
      `copied file should exist in target: ${file}`,
    );
  }

  for (const file of result.files_generated) {
    assert.ok(
      fs.existsSync(path.join(target, file)),
      `generated active file should exist in target: ${file}`,
    );
  }
});

test("dry-run with --force: reports collisions but does not copy", () => {
  const { sourceRoot } = makeMinimalSource();
  const target = tmpDir();
  writeFile(target, "AGENTS.md", "# Existing\n");

  const result = runBootstrap({ source: sourceRoot, target, dryRun: true, force: true });

  assert.equal(result.ok, true);
  assert.equal(result.dry_run, true);
  assert.equal(result.status, "dry-run");
  assert.ok(result.collisions.includes("AGENTS.md"));
  assert.ok(result.generated_files.includes(".company-os/install-record.md"));
  assert.deepEqual(result.files_copied, []);
  assert.deepEqual(result.files_generated, []);

  const unchanged = fs.readFileSync(path.join(target, "AGENTS.md"), "utf8");
  assert.equal(unchanged, "# Existing\n", "dry-run must not overwrite even with --force");
});
