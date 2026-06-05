import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  CONTENT_MACHINE_FOLDERS,
  buildContentMachineStartPlan,
  writeContentMachineStartPlan,
} from "./content-machine-start-core.mjs";

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "content-machine-start-"));
}

test("builds a dry-run plan without writing files", () => {
  const root = tmpRoot();
  const plan = buildContentMachineStartPlan({
    root,
    company: "Example Company",
    approvalOwner: "Founder",
    primaryChannel: "LinkedIn",
    date: "2026-06-04",
  });

  assert.equal(plan.company, "Example Company");
  assert.equal(plan.approval_owner, "Founder");
  assert.equal(plan.primary_channel, "LinkedIn");
  assert.equal(plan.directories.length, CONTENT_MACHINE_FOLDERS.length);
  assert.equal(fs.existsSync(path.join(root, "content/content-machine")), false);
  assert.ok(plan.files.some((entry) => entry.relative_path === "content/content-machine/RUNBOOK.md"));
  assert.ok(plan.files.some((entry) => entry.relative_path === "content/content-machine/01_source_inventory/SOURCE_INVENTORY.md"));
  assert.ok(plan.blocked_actions.includes("broad-private-source-mining"));
});

test("writes the folder structure and starter artifacts", () => {
  const root = tmpRoot();
  const plan = buildContentMachineStartPlan({
    root,
    company: "Example Company",
    approvalOwner: "Founder",
    primaryChannel: "Blog",
    date: "2026-06-04",
  });
  const result = writeContentMachineStartPlan(plan);

  assert.equal(result.directories.length, CONTENT_MACHINE_FOLDERS.length);
  for (const [folder] of CONTENT_MACHINE_FOLDERS) {
    assert.equal(fs.existsSync(path.join(root, "content/content-machine", folder)), true);
    assert.equal(fs.existsSync(path.join(root, "content/content-machine", folder, "README.md")), true);
  }
  const config = JSON.parse(fs.readFileSync(path.join(root, "content/content-machine/content-machine.config.json"), "utf8"));
  assert.equal(config.mode, "draft-only");
  assert.equal(config.primary_channel, "Blog");
  assert.equal(config.source_policy.default, "none-until-approved");
  assert.equal(config.human_gate_policy.founder_voice_identity, "HG-4");
});

test("write is idempotent and keeps existing files by default", () => {
  const root = tmpRoot();
  const plan = buildContentMachineStartPlan({
    root,
    company: "Example Company",
    approvalOwner: "Founder",
    primaryChannel: "LinkedIn",
  });
  writeContentMachineStartPlan(plan);
  const runbook = path.join(root, "content/content-machine/RUNBOOK.md");
  fs.writeFileSync(runbook, "custom local runbook\n");
  const second = writeContentMachineStartPlan(plan);

  assert.equal(fs.readFileSync(runbook, "utf8"), "custom local runbook\n");
  assert.ok(second.files.some((entry) => entry.relative_path === "content/content-machine/RUNBOOK.md" && entry.status === "kept"));
});

test("force overwrites existing generated files", () => {
  const root = tmpRoot();
  const plan = buildContentMachineStartPlan({
    root,
    company: "Example Company",
    approvalOwner: "Founder",
    primaryChannel: "LinkedIn",
  });
  writeContentMachineStartPlan(plan);
  const runbook = path.join(root, "content/content-machine/RUNBOOK.md");
  fs.writeFileSync(runbook, "custom local runbook\n");
  const second = writeContentMachineStartPlan(plan, { force: true });

  assert.match(fs.readFileSync(runbook, "utf8"), /Content Machine Runbook/);
  assert.ok(second.files.some((entry) => entry.relative_path === "content/content-machine/RUNBOOK.md" && entry.status === "overwritten"));
});

test("rejects private path or token-shaped literals in public config fields", () => {
  const fakeToken = `sk-or-v1-${"x".repeat(24)}`;
  assert.throws(
    () => buildContentMachineStartPlan({
      root: tmpRoot(),
      company: "[LOCAL_WORKSPACE]",
      approvalOwner: "Founder",
      primaryChannel: "LinkedIn",
    }),
    /company contains a private path or token-shaped literal/,
  );
  assert.throws(
    () => buildContentMachineStartPlan({
      root: tmpRoot(),
      company: "Example Company",
      approvalOwner: fakeToken,
      primaryChannel: "LinkedIn",
    }),
    /approvalOwner contains a private path or token-shaped literal/,
  );
});
