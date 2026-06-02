import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildDepartmentPackScaffold,
  writeDepartmentPackScaffold,
} from "./company-os-department-pack-scaffold-core.mjs";
import {
  evaluateDepartmentCapabilityPack,
  renderDepartmentPackEvaluationMarkdown,
  scoreDepartmentPackDiscipline,
  toPortableDepartmentPackEvaluationReport,
  writeDepartmentPackEvaluation,
} from "./company-os-department-pack-evaluator-core.mjs";

function makeCompletePack() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "department-pack-eval-"));
  const scaffold = buildDepartmentPackScaffold({
    root,
    packId: "customer-support-kb",
    name: "Customer Support KB",
    ownerRole: "role:coo",
    clientDomain: "customer-support-kb",
    date: "2026-05-26",
  });
  writeDepartmentPackScaffold(scaffold);
  fs.mkdirSync(path.join(root, "reports/examples/department-pack-creator"), { recursive: true });
  fs.writeFileSync(path.join(root, "reports/examples/department-pack-creator/customer-support-kb-evaluation.example.md"), "# Evaluation\n");
  fs.mkdirSync(path.join(root, "registries/capabilities"), { recursive: true });
  fs.writeFileSync(path.join(root, "registries/capabilities/company-os.json"), JSON.stringify({
    version: "capability-registry/v0",
    profiles: [{
      id: "claude-clevel-worker/cto/department-capability-pack-creator",
      role: "role:cto",
      forbidden_surfaces: ["production-write", "public-publish", "secret-read", "plane-done-by-worker"],
    }],
  }, null, 2));
  return root;
}

test("complete fake pack evaluates READY with 10/10 all disciplines", () => {
  const root = makeCompletePack();
  const report = evaluateDepartmentCapabilityPack({ root, packId: "customer-support-kb", date: "2026-05-26" });

  assert.equal(report.status, "READY");
  assert.equal(report.score_summary.average, 10);
  assert.equal(report.disciplines.length, 10);
  assert.ok(report.disciplines.every((discipline) => discipline.score === 10));
  assert.equal(report.blockers.length, 0);
});

test("missing EVE skill blocks the pack", () => {
  const root = makeCompletePack();
  fs.rmSync(path.join(root, "docs/integrations/aionui-hermes-customer-support-kb-skill.md"));
  const report = evaluateDepartmentCapabilityPack({ root, packId: "customer-support-kb" });

  assert.equal(report.status, "BLOCKED");
  assert.ok(report.blockers.some((blocker) => blocker.id === "artifact.eve_skill_missing"));
});

test("missing worker contract blocks the pack", () => {
  const root = makeCompletePack();
  fs.rmSync(path.join(root, "docs/templates/company-os-customer-support-kb-draft-worker-contract.md"));
  const report = evaluateDepartmentCapabilityPack({ root, packId: "customer-support-kb" });

  assert.equal(report.status, "BLOCKED");
  assert.ok(report.blockers.some((blocker) => blocker.id === "artifact.worker_contract_missing"));
});

test("missing CapabilityProfile blocks the pack", () => {
  const root = makeCompletePack();
  fs.writeFileSync(path.join(root, "registries/capabilities/company-os.json"), JSON.stringify({ version: "capability-registry/v0", profiles: [] }));
  const report = evaluateDepartmentCapabilityPack({ root, packId: "customer-support-kb" });

  assert.equal(report.status, "BLOCKED");
  assert.ok(report.blockers.some((blocker) => blocker.id === "capability_profile.missing"));
});

test("pack-specific CapabilityProfile can satisfy capability checks", () => {
  const root = makeCompletePack();
  const profileId = "claude-clevel-worker/cmo/video-first-content-engine";
  for (const name of [
    "company-os-customer-support-kb-parent-worker-contract.md",
    "company-os-customer-support-kb-research-worker-contract.md",
    "company-os-customer-support-kb-draft-worker-contract.md",
  ]) {
    const filePath = path.join(root, "docs/templates", name);
    fs.writeFileSync(
      filePath,
      fs.readFileSync(filePath, "utf8").replace(
        "CapabilityProfile: claude-clevel-worker/cto/department-capability-pack-creator",
        `CapabilityProfile: ${profileId}`,
      ),
    );
  }
  fs.writeFileSync(path.join(root, "registries/capabilities/company-os.json"), JSON.stringify({
    version: "capability-registry/v0",
    profiles: [{
      id: profileId,
      role: "role:cmo",
      forbidden_surfaces: ["production-write", "public-publish", "secret-read", "plane-done-by-worker"],
    }],
  }, null, 2));

  const report = evaluateDepartmentCapabilityPack({ root, packId: "customer-support-kb", date: "2026-05-26" });

  assert.equal(report.status, "READY");
  assert.equal(report.blockers.length, 0);
  assert.ok(report.checks.some((item) => item.id === "capability_profile.present" && item.status === "pass"));
});

test("private path literal blocks portability", () => {
  const root = makeCompletePack();
  fs.appendFileSync(path.join(root, "docs/orchestration/company-os-customer-support-kb-department-pack-v0.md"), "\n${LOCAL_WORKSPACE}");
  const report = evaluateDepartmentCapabilityPack({ root, packId: "customer-support-kb" });

  assert.equal(report.status, "BLOCKED");
  assert.ok(report.blockers.some((blocker) => blocker.id === "privacy.private_literal"));
});

test("score below 10 without justification is blocked", () => {
  const discipline = scoreDepartmentPackDiscipline("Founder Intent Fit", {
    score: 9,
    evidence_paths: ["/tmp/evidence.md"],
  });

  assert.equal(discipline.ok, false);
  assert.equal(discipline.status, "block");
  assert.equal(discipline.blocker.id, "score.justification_missing");
});

test("score 9 with external constraint, evidence and follow-up is justified", () => {
  const root = makeCompletePack();
  const evidencePath = path.join(root, "reports/examples/department-pack-creator/customer-support-kb-evaluation.example.md");
  const discipline = scoreDepartmentPackDiscipline("Evidence Completeness", {
    score: 9,
    evidence_paths: [evidencePath],
    missing_point: "No real customer installation yet.",
    why_10_is_not_currently_possible: "A live customer install requires founder approval and a pilot company.",
    follow_up_contract: "Create a guided customer install proof after HG-2.5 approval.",
  });

  assert.equal(discipline.ok, true);
  assert.equal(discipline.status, "justified_gap");
});

test("daily autonomy without pilot, monitor and rollback gates blocks the pack", () => {
  const root = makeCompletePack();
  fs.appendFileSync(
    path.join(root, "docs/orchestration/company-os-customer-support-kb-department-pack-v0.md"),
    "\nDaily cron may run automatically after one green draft.\n",
  );
  const report = evaluateDepartmentCapabilityPack({ root, packId: "customer-support-kb" });

  assert.equal(report.status, "BLOCKED");
  assert.ok(report.blockers.some((blocker) => blocker.id === "autonomy.unsafe_daily_claim"));
});

test("missing learning loop blocks the Learning Loop discipline", () => {
  const root = makeCompletePack();
  const departmentPack = path.join(root, "docs/orchestration/company-os-customer-support-kb-department-pack-v0.md");
  const text = fs.readFileSync(departmentPack, "utf8")
    .replace(/## Learning Loop[\s\S]*?## Autonomy Promotion Path/, "## Autonomy Promotion Path");
  fs.writeFileSync(departmentPack, text);
  const report = evaluateDepartmentCapabilityPack({ root, packId: "customer-support-kb" });
  const learning = report.disciplines.find((discipline) => discipline.name === "Learning Loop");

  assert.equal(report.status, "BLOCKED");
  assert.ok(report.blockers.some((blocker) => blocker.id === "semantic.learning_loop"));
  assert.equal(learning.score, 8);
  assert.equal(learning.status, "block");
});

test("missing EVE response shape blocks the EVE/AionUI/Hermes UX discipline", () => {
  const root = makeCompletePack();
  const skill = path.join(root, "docs/integrations/aionui-hermes-customer-support-kb-skill.md");
  fs.writeFileSync(skill, "# AionUI / Hermes Customer Support KB Skill\n\nStatus: generated EVE skill contract seed\n");
  const report = evaluateDepartmentCapabilityPack({ root, packId: "customer-support-kb" });
  const ux = report.disciplines.find((discipline) => discipline.name === "EVE/AionUI/Hermes UX");

  assert.equal(report.status, "BLOCKED");
  assert.ok(report.blockers.some((blocker) => blocker.id === "semantic.eve_ux"));
  assert.equal(ux.score, 8);
  assert.equal(ux.status, "block");
});

test("render and write evaluation report", () => {
  const root = makeCompletePack();
  const report = evaluateDepartmentCapabilityPack({ root, packId: "customer-support-kb", date: "2026-05-26" });
  const markdown = renderDepartmentPackEvaluationMarkdown(report);
  const paths = writeDepartmentPackEvaluation(report);

  assert.match(markdown, /Department Capability Pack Evaluation/);
  assert.match(markdown, /Founder Intent Fit/);
  assert.equal(fs.existsSync(paths.markdown), true);
  assert.equal(fs.existsSync(paths.json), true);
});

test("written evaluation JSON uses portable Company.OS paths", () => {
  const root = makeCompletePack();
  const report = evaluateDepartmentCapabilityPack({ root, packId: "customer-support-kb", date: "2026-05-26" });
  const portable = toPortableDepartmentPackEvaluationReport(report);
  const paths = writeDepartmentPackEvaluation(report);
  const json = fs.readFileSync(paths.json, "utf8");

  assert.equal(portable.root, "${COMPANY_OS_ROOT}");
  assert.match(json, /\$\{COMPANY_OS_ROOT\}\/docs\/orchestration\/company-os-customer-support-kb-department-pack-v0\.md/);
  assert.doesNotMatch(json, new RegExp(root.replaceAll("\\", "\\\\")));
});
