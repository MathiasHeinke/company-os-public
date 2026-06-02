import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  BOOK_AUTHORING_FOLDERS,
  buildBookAuthoringStartPlan,
  writeBookAuthoringStartPlan,
} from "./book-authoring-start-core.mjs";

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "book-authoring-start-"));
}

test("builds a dry-run plan without writing files", () => {
  const root = tmpRoot();
  const plan = buildBookAuthoringStartPlan({
    root,
    company: "Example Company",
    projectSlug: "Founder Book",
    workingTitle: "Working Title",
    approvalOwner: "Founder",
    date: "2026-05-31",
  });

  assert.equal(plan.company, "Example Company");
  assert.equal(plan.project_slug, "founder-book");
  assert.equal(plan.approval_owner, "Founder");
  assert.equal(plan.directories.length, BOOK_AUTHORING_FOLDERS.length);
  assert.equal(fs.existsSync(path.join(root, "content/book-authoring/founder-book")), false);
  assert.ok(plan.files.some((entry) => entry.relative_path === "content/book-authoring/founder-book/00_book_spec/BOOK_SPEC.md"));
  assert.ok(plan.blocked_actions.includes("publisher-api-write"));
});

test("writes the folder structure and config", () => {
  const root = tmpRoot();
  const plan = buildBookAuthoringStartPlan({
    root,
    company: "Example Company",
    projectSlug: "founder-book",
    workingTitle: "Working Title",
    approvalOwner: "Founder",
    date: "2026-05-31",
  });
  const result = writeBookAuthoringStartPlan(plan);

  assert.equal(result.directories.length, BOOK_AUTHORING_FOLDERS.length);
  for (const [folder] of BOOK_AUTHORING_FOLDERS) {
    assert.equal(fs.existsSync(path.join(root, "content/book-authoring/founder-book", folder)), true);
    assert.equal(fs.existsSync(path.join(root, "content/book-authoring/founder-book", folder, "README.md")), true);
  }
  const config = JSON.parse(fs.readFileSync(path.join(root, "content/book-authoring/founder-book/book-authoring.config.json"), "utf8"));
  assert.equal(config.mode, "draft-only");
  assert.equal(config.project_slug, "founder-book");
  assert.equal(config.human_gate_policy.final_publish, "HG-4");
});

test("write is idempotent and keeps existing files by default", () => {
  const root = tmpRoot();
  const plan = buildBookAuthoringStartPlan({
    root,
    company: "Example Company",
    projectSlug: "founder-book",
    workingTitle: "Working Title",
    approvalOwner: "Founder",
  });
  writeBookAuthoringStartPlan(plan);
  const runbook = path.join(root, "content/book-authoring/founder-book/RUNBOOK.md");
  fs.writeFileSync(runbook, "custom local runbook\n");
  const second = writeBookAuthoringStartPlan(plan);

  assert.equal(fs.readFileSync(runbook, "utf8"), "custom local runbook\n");
  assert.ok(second.files.some((entry) => entry.relative_path === "content/book-authoring/founder-book/RUNBOOK.md" && entry.status === "kept"));
});

test("force overwrites existing generated files", () => {
  const root = tmpRoot();
  const plan = buildBookAuthoringStartPlan({
    root,
    company: "Example Company",
    projectSlug: "founder-book",
    workingTitle: "Working Title",
    approvalOwner: "Founder",
  });
  writeBookAuthoringStartPlan(plan);
  const runbook = path.join(root, "content/book-authoring/founder-book/RUNBOOK.md");
  fs.writeFileSync(runbook, "custom local runbook\n");
  const second = writeBookAuthoringStartPlan(plan, { force: true });

  assert.match(fs.readFileSync(runbook, "utf8"), /Book Authoring Runbook/);
  assert.ok(second.files.some((entry) => entry.relative_path === "content/book-authoring/founder-book/RUNBOOK.md" && entry.status === "overwritten"));
});

test("rejects private path or token-shaped literals in public config fields", () => {
  assert.throws(
    () => buildBookAuthoringStartPlan({
      root: tmpRoot(),
      company: "${LOCAL_WORKSPACE}",
      projectSlug: "book",
      workingTitle: "Working Title",
      approvalOwner: "Founder",
    }),
    /company contains a private path or token-shaped literal/,
  );
  assert.throws(
    () => buildBookAuthoringStartPlan({
      root: tmpRoot(),
      company: "Example Company",
      projectSlug: "book",
      workingTitle: "Working Title",
      approvalOwner: "${LOCAL_WORKSPACE}",
    }),
    /approvalOwner contains a private path or token-shaped literal/,
  );
});
