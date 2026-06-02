import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  SELF_SERVE_SMOKE_VERSION,
  runSelfServeSmoke,
} from "./self-serve-smoke-core.mjs";

function tmpDir(prefix = "self-serve-smoke-") {
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

function sampleIntake() {
  return {
    company: {
      name: "Acme Systems",
      website: "https://acme.example",
      industry: "B2B software",
      stage: "seed",
      primary_offer: "AI workflow audits",
      revenue_model: "monthly retainer",
      founder_ceo: "Jane Founder",
    },
    buyer: "operations leaders",
    why_now: "manual coordination work is blocking delivery",
    first_department: "marketing",
    approval_owner: "Jane Founder",
    existing_systems: {
      active_ledger: "Plane",
      execution_ledgers: ["Plane"],
      task_sources_to_review: ["Plane backlog"],
      connected_tools: ["Plane"],
      already_available: ["public website"],
      missing_or_blocked: ["Honcho workspace"],
    },
    eve_onboarding: {
      accounts_to_connect: ["Plane", "Honcho"],
      first_goals: ["create first marketing parent"],
      allowed_memory_sources: [".company-os/company-discovery-brief.md"],
      forbidden_memory_sources: [".env"],
    },
    blocked_actions: ["public publishing"],
  };
}

function makeSource() {
  const source = tmpDir("self-serve-source-");
  writeFile(source, "VERSION", "0.7.1-rc.0\n");
  writeFile(source, "kits/company-os-kit/README.md", "# Kit readme\n");
  writeFile(source, "kits/company-os-kit/AGENTS.md", "# Kit agents\n");
  writeFile(source, "kits/company-os-kit/templates/worker-template.md", "# Worker\n");
  writeFile(source, "kits/company-os-kit/.company-os/operations/install-record.example.md", "Company.OS version: 0.7.0-alpha.1\n");
  writeFile(source, "kits/company-os-kit/.company-os/operations/workspace-registry.example.json", "{}\n");
  writeFile(source, "kits/company-os-kit/.company-os/operations/software-stack.example.md", "# Stack\n");
  writeFile(source, "kits/company-os-kit/.company-os/operations/human-gates.example.md", "# Gates\n");
  writeFile(source, "kits/company-os-kit/.company-os/operations/first-run-checklist.example.md", "# Checklist\n");
  writeFile(source, "kits/company-os-kit/.company-os/templates/company-discovery-brief.md", "# Discovery template\n");
  writeFile(
    source,
    "kits/company-os-kit/.company-os/onboarding/company-intake.example.json",
    `${JSON.stringify(sampleIntake(), null, 2)}\n`,
  );
  writeFile(
    source,
    "registries/domain-packs/company-os.json",
    `${JSON.stringify(sampleRegistry(), null, 2)}\n`,
  );
  return source;
}

test("runSelfServeSmoke proves install, onboarding packet and update dry-run together", () => {
  const source = makeSource();
  const target = tmpDir("self-serve-target-");

  const result = runSelfServeSmoke({
    source,
    target,
    date: "2026-05-26",
    toVersion: "0.7.1-rc.0",
  });

  assert.equal(result.version, SELF_SERVE_SMOKE_VERSION);
  assert.equal(result.ok, true);
  assert.equal(result.status, "pass");
  assert.equal(result.target, target);
  assert.deepEqual(
    result.stages.map((stage) => [stage.id, stage.ok, stage.status]),
    [
      ["install.dry_run", true, "dry-run"],
      ["install.apply", true, "pass"],
      ["onboarding.packet", true, "pass"],
      ["update.check", true, "up-to-date"],
      ["update.apply_dry_run", true, "dry-run"],
    ],
  );

  assert.ok(fs.existsSync(path.join(target, ".company-os/install-record.md")));
  assert.ok(fs.existsSync(path.join(target, ".company-os/onboarding/intake-record.json")));
  assert.ok(fs.existsSync(path.join(target, ".company-os/onboarding/eve-boot-packet.json")));
  assert.ok(fs.existsSync(path.join(target, "reports/company-discovery/2026-05-26/first-company-packet.md")));
  assert.ok(fs.existsSync(path.join(target, "reports/company-os-updates/2026-05-26/company-os-update-0.7.1-rc.0.md")));
  assert.equal(result.artifacts.eve_boot_packet, ".company-os/onboarding/eve-boot-packet.json");
  assert.equal(result.artifacts.update_report, "reports/company-os-updates/2026-05-26/company-os-update-0.7.1-rc.0.md");
  assert.ok(result.next_steps.some((step) => step.includes("Review")));
});

test("runSelfServeSmoke blocks before writing when install dry-run sees collisions", () => {
  const source = makeSource();
  const target = tmpDir("self-serve-target-");
  writeFile(target, "AGENTS.md", "# Existing local file\n");

  const result = runSelfServeSmoke({
    source,
    target,
    date: "2026-05-26",
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.failed_stage, "install.dry_run");
  assert.deepEqual(result.stages.map((stage) => stage.id), ["install.dry_run"]);
  assert.ok(result.stages[0].collisions.includes("AGENTS.md"));
  assert.equal(fs.readFileSync(path.join(target, "AGENTS.md"), "utf8"), "# Existing local file\n");
});
