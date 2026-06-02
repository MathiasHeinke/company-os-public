import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  PUBLIC_RC_INSTALL_VERSION,
  buildPublicRcIntake,
  runPublicRcInstall,
} from "./public-rc-core.mjs";

function tmpDir(prefix = "company-os-public-rc-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(dir, relativePath, content = "placeholder\n") {
  const absolute = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
  return absolute;
}

function sampleRegistry() {
  return {
    version: "domain-pack-registry/v0",
    packs: [
      {
        id: "marketing-outreach",
        name: "Marketing / Outreach",
        owner_role: "role:cmo",
        default_human_gate: "HG-2",
        activation_mode: "draft-only",
        blocked_actions: ["email-send", "linkedin-send"],
      },
    ],
  };
}

function makeSource({ mirrorProvenance = false } = {}) {
  const source = tmpDir("company-os-public-rc-source-");
  writeFile(source, "VERSION", "0.9.0-rc.0\n");
  writeFile(source, "kits/company-os-kit/README.md", "# Kit readme\n");
  writeFile(source, "kits/company-os-kit/AGENTS.md", "# Kit agents\n");
  writeFile(source, "kits/company-os-kit/templates/worker-template.md", "# Worker\n");
  writeFile(source, "kits/company-os-kit/.company-os/operations/install-record.example.md", "Company.OS version: 0.9.0-rc.0\n");
  writeFile(source, "kits/company-os-kit/.company-os/operations/workspace-registry.example.json", "{\"execution_ledger\":\"plane\"}\n");
  writeFile(source, "kits/company-os-kit/.company-os/operations/software-stack.example.md", "# Stack\n");
  writeFile(source, "kits/company-os-kit/.company-os/operations/human-gates.example.md", "# Gates\n");
  writeFile(source, "kits/company-os-kit/.company-os/operations/first-run-checklist.example.md", "# Checklist\n");
  writeFile(source, "kits/company-os-kit/.company-os/templates/company-discovery-brief.md", "# Discovery template\n");
  writeFile(source, "kits/company-os-kit/.company-os/onboarding/company-intake.example.json", "{}\n");
  writeFile(source, "registries/domain-packs/company-os.json", `${JSON.stringify(sampleRegistry(), null, 2)}\n`);
  if (mirrorProvenance) {
    writeFile(source, "mirror-provenance.json", `${JSON.stringify({
      source_sha: "deadbeef",
      strip_list_version: "v2",
    }, null, 2)}\n`);
  }
  return source;
}

function seed() {
  return {
    companyName: "Acme Systems",
    website: "https://acme.example",
    primaryOffer: "AI operating-system setup",
    buyer: "founder-led service firms",
    founderName: "Jane Founder",
    approvalOwner: "Jane Founder",
    firstDepartment: "marketing",
    connectedTools: ["GitHub"],
    alreadyAvailable: ["public website"],
    missingTools: ["Plane App"],
    firstGoals: ["create first marketing operating goal"],
    blockedActions: ["public publishing"],
  };
}

test("buildPublicRcIntake maps signup/report seed into first-run intake", () => {
  const intake = buildPublicRcIntake(seed());

  assert.equal(intake.company.name, "Acme Systems");
  assert.equal(intake.company.website, "https://acme.example");
  assert.equal(intake.company.primary_offer, "AI operating-system setup");
  assert.equal(intake.buyer, "founder-led service firms");
  assert.equal(intake.approval_owner, "Jane Founder");
  assert.equal(intake.first_department, "marketing");
  assert.deepEqual(intake.existing_systems.connected_tools, ["GitHub"]);
  assert.equal(intake.eve_onboarding.setup_mode, "guided-public-rc");
});

test("runPublicRcInstall installs public RC and writes EVE handoff artifacts", () => {
  const source = makeSource({ mirrorProvenance: true });
  const target = tmpDir("company-os-public-rc-target-");

  const result = runPublicRcInstall({
    source,
    target,
    date: "2026-06-02",
    seed: seed(),
  });

  assert.equal(result.version, PUBLIC_RC_INSTALL_VERSION);
  assert.equal(result.ok, true);
  assert.equal(result.status, "pass");
  assert.equal(result.to_version, "0.9.0-rc.0");
  assert.equal(result.source_provenance.distribution_channel, "public-mirror-artifact");
  assert.deepEqual(
    result.stages.map((stage) => [stage.id, stage.ok, stage.status]),
    [
      ["input.validate", true, "pass"],
      ["install.dry_run", true, "dry-run"],
      ["install.apply", true, "pass"],
      ["intake.write", true, "pass"],
      ["onboarding.packet", true, "pass"],
      ["update.check", true, "up-to-date"],
      ["update.apply_dry_run", true, "dry-run"],
    ],
  );

  assert.ok(fs.existsSync(path.join(target, ".company-os/install-record.md")));
  assert.ok(fs.existsSync(path.join(target, ".company-os/onboarding/company-intake.json")));
  assert.ok(fs.existsSync(path.join(target, ".company-os/onboarding/intake-record.json")));
  assert.ok(fs.existsSync(path.join(target, ".company-os/onboarding/eve-boot-packet.json")));
  assert.ok(fs.existsSync(path.join(target, "reports/company-discovery/2026-06-02/first-company-packet.md")));
  assert.ok(fs.existsSync(path.join(target, "reports/company-os-updates/2026-06-02/company-os-update-0.9.0-rc.0.md")));
  assert.ok(fs.existsSync(path.join(target, "reports/company-os-public-rc/2026-06-02/company-os-public-rc-0.9.0-rc.0.md")));
  assert.match(result.first_eve_prompt, /ich bin EVE/);
  assert.equal(result.artifacts.handoff_report, "reports/company-os-public-rc/2026-06-02/company-os-public-rc-0.9.0-rc.0.md");
});

test("runPublicRcInstall blocks on target collision before install writes", () => {
  const source = makeSource();
  const target = tmpDir("company-os-public-rc-target-");
  writeFile(target, "AGENTS.md", "# Existing\n");

  const result = runPublicRcInstall({
    source,
    target,
    date: "2026-06-02",
    seed: seed(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.failed_stage, "install.dry_run");
  assert.deepEqual(result.stages.map((stage) => stage.id), ["input.validate", "install.dry_run"]);
  assert.ok(result.stages[1].collisions.includes("AGENTS.md"));
  assert.equal(fs.readFileSync(path.join(target, "AGENTS.md"), "utf8"), "# Existing\n");
});

test("runPublicRcInstall blocks unexpected onboarding packet collisions before overwrite", () => {
  const source = makeSource();
  const target = tmpDir("company-os-public-rc-target-");
  const existingBootPacket = "{\"existing\":true}\n";
  writeFile(target, ".company-os/onboarding/eve-boot-packet.json", existingBootPacket);

  const result = runPublicRcInstall({
    source,
    target,
    date: "2026-06-02",
    seed: seed(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.failed_stage, "onboarding.packet");
  assert.ok(result.stages.at(-1).collisions.includes(".company-os/onboarding/eve-boot-packet.json"));
  assert.equal(
    fs.readFileSync(path.join(target, ".company-os/onboarding/eve-boot-packet.json"), "utf8"),
    existingBootPacket,
  );
});
