import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import registry from "../../registries/plane-templates/company-os.json" with { type: "json" };
import {
  buildTemplateApiProbePlan,
  buildTemplateInstallArtifacts,
  classifyTemplateApiProbe,
  slugifyTemplateId,
  verifyTemplateInstallArtifacts,
  writeTemplateInstallArtifacts,
} from "./plane-template-installer-core.mjs";

test("buildTemplateApiProbePlan uses read-only GET candidates and respects project scope", () => {
  const withoutProject = buildTemplateApiProbePlan({ workspace: "companyos" });
  assert.ok(withoutProject.length >= 2);
  assert.equal(withoutProject.every((row) => row.method === "GET"), true);
  assert.equal(withoutProject.some((row) => row.path.includes("/projects/")), false);

  const withProject = buildTemplateApiProbePlan({
    workspace: "companyos",
    projectId: "3537d502-b5a7-4214-9f7d-8f571fb1cd1e",
  });
  assert.ok(withProject.some((row) => row.path.includes("/projects/3537d502-b5a7-4214-9f7d-8f571fb1cd1e/")));
});

test("classifyTemplateApiProbe distinguishes supported, manual and auth-blocked states", () => {
  assert.equal(classifyTemplateApiProbe([
    { id: "workspace.templates", status: 404, ok: false },
    { id: "workspace.issue_templates", status: 405, ok: false },
  ]).status, "manual-required");

  assert.equal(classifyTemplateApiProbe([
    { id: "workspace.templates", status: 200, ok: true },
    { id: "workspace.issue_templates", status: 404, ok: false },
  ]).status, "api-supported");

  assert.equal(classifyTemplateApiProbe([
    { id: "workspace.templates", status: 403, ok: false },
    { id: "workspace.issue_templates", status: 401, ok: false },
  ]).status, "blocked-auth");
});

test("buildTemplateInstallArtifacts renders every registry template with manifest and runbook", () => {
  const artifacts = buildTemplateInstallArtifacts(registry, {
    generatedAt: "2026-05-18T00:00:00.000Z",
  });
  const relativePaths = artifacts.files.map((file) => file.relativePath).sort();
  assert.ok(relativePaths.includes("manifest.json"));
  assert.ok(relativePaths.includes("install-runbook.md"));
  assert.equal(relativePaths.filter((item) => item.startsWith("templates/")).length, registry.templates.length);

  const manifest = JSON.parse(artifacts.files.find((file) => file.relativePath === "manifest.json").content);
  assert.equal(manifest.install_mode, "ui-artifact");
  assert.equal(manifest.plane_write_path, "none");
  assert.equal(manifest.templates.length, registry.templates.length);

  const workerTemplate = artifacts.files.find((file) => file.relativePath === "templates/work_item/work-item-clevel-worker-contract.md");
  assert.match(workerTemplate.content, /Registry ID: `work-item\.clevel-worker-contract`/);
  assert.match(workerTemplate.content, /```markdown\n## Purpose/);
});

test("write and verify install artifacts detect stale rendered files", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "plane-template-installer-"));
  const artifacts = buildTemplateInstallArtifacts(registry, {
    generatedAt: "2026-05-18T00:00:00.000Z",
  });
  writeTemplateInstallArtifacts(artifacts, tmp);
  assert.equal(verifyTemplateInstallArtifacts(registry, tmp).ok, true);

  const stalePath = path.join(tmp, "templates", "work_item", "work-item-clevel-worker-contract.md");
  fs.appendFileSync(stalePath, "\nSTALE\n", "utf8");
  const result = verifyTemplateInstallArtifacts(registry, tmp);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("artifact drift")));
});

test("slugifyTemplateId is stable for Plane registry ids", () => {
  assert.equal(slugifyTemplateId("work-item.clevel-worker-contract"), "work-item-clevel-worker-contract");
  assert.equal(slugifyTemplateId(" Page Founder Daily Queue "), "page-founder-daily-queue");
});
