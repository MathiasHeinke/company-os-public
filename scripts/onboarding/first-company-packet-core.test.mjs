import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildEveBootPacket,
  buildFirstCompanyPacket,
  buildIntakeRecord,
  EVE_BOOT_PACKET_VERSION,
  FIRST_COMPANY_PACKET_VERSION,
  resolvePackId,
  validateFirstCompanyInput,
  writeFirstCompanyPacket,
} from "./first-company-packet-core.mjs";

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "first-company-packet-"));
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
      {
        id: "sales-crm",
        name: "Sales / CRM",
        owner_role: "role:coo",
        default_human_gate: "HG-2.5",
        activation_mode: "draft-only",
        blocked_actions: ["crm-mass-write-without-hg25"],
      },
    ],
  };
}

function sampleInput() {
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
    sales_motion: "founder-led sales",
    initial_report_context: "Founder completed the public AI business report before install.",
    first_department: "marketing",
    approval_owner: "Jane Founder",
    bottlenecks: ["founder memory", "manual reporting"],
    founder_memory_dependencies: ["customer context"],
    blocked_actions: ["public publishing"],
    existing_systems: {
      discovery_status: "partial",
      active_ledger: "Plane",
      execution_ledgers: ["Plane", "Linear"],
      task_sources_to_review: ["Plane backlog", "Linear active project"],
      roles_and_people_sources: ["Plane members", "team spreadsheet"],
      connected_tools: ["Plane", "GitNexus"],
      already_available: ["Plane workspace", "GitNexus index"],
      missing_or_blocked: ["Honcho workspace"],
      adoption_policy: "adapt_existing_first",
      import_policy: "read-only inventory before migration",
      conflict_policy: "map existing tasks before creating duplicates",
    },
    eve_onboarding: {
      decision_style: "fast options with explicit gates",
      preferences: ["direct prompts", "no silent autonomy"],
      refusal_patterns: ["do not publish without approval"],
      accounts_to_connect: ["Plane", "Honcho", "GitNexus"],
      websites_to_open: ["https://app.plane.so"],
      permissions_needed: ["Plane app access", "workspace read access"],
      skills_or_workflows_requested: ["marketing UGC video pipeline"],
      first_goals: ["create the first marketing parent contract"],
      allowed_memory_sources: [".company-os/company-discovery-brief.md"],
      forbidden_memory_sources: [".env", "browser cookies"],
    },
  };
}

test("resolvePackId maps common first department aliases", () => {
  assert.equal(resolvePackId("marketing"), "marketing-outreach");
  assert.equal(resolvePackId("sales"), "sales-crm");
  assert.equal(resolvePackId("unknown-pack"), "unknown-pack");
});

test("validateFirstCompanyInput requires core first-run fields", () => {
  const result = validateFirstCompanyInput({});
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("company.name is required"));
  assert.ok(result.errors.includes("buyer is required"));
  assert.ok(result.errors.includes("approval_owner is required"));
});

test("buildIntakeRecord produces confirmed intake with manual first pack", () => {
  const intake = buildIntakeRecord(sampleInput(), { date: "2026-05-25" });
  assert.equal(intake.company.name, "Acme Systems");
  assert.equal(intake.company.confidence, "confirmed");
  assert.equal(intake.approval_owner, "Jane Founder");
  assert.equal(intake.active_domains[0].pack_id, "marketing-outreach");
  assert.equal(intake.record_path, ".company-os/onboarding/intake-record.json");
  assert.equal(intake.eve_onboarding.role, "chief-of-staff-onboarding");
  assert.equal(intake.eve_onboarding.boot_packet_path, ".company-os/onboarding/eve-boot-packet.json");
  assert.ok(intake.eve_onboarding.soul_sources.includes(".company-os/eve/SOUL.md"));
  assert.ok(intake.eve_onboarding.soul_sources.includes("docs/operations/eve-soul-boot-contract.md"));
  assert.ok(intake.eve_onboarding.soul_sources.includes("docs/operations/command-eve-founder-offline-readiness.md"));
  assert.equal(intake.eve_onboarding.north_star.id, "founder-offline-test");
  assert.deepEqual(intake.eve_onboarding.setup_assistance.accounts_to_connect, ["Plane", "Honcho", "GitNexus"]);
  assert.equal(intake.eve_onboarding.memory_policy.save_requires_confirmation, true);
  assert.equal(intake.eve_onboarding.initialization.greeting_identity, "Command EVE");
  assert.equal(intake.eve_onboarding.initialization.inventory_existing_systems, true);
  assert.deepEqual(intake.existing_systems.execution_ledgers, ["Plane", "Linear"]);
  assert.equal(intake.existing_systems.import_policy, "read-only inventory before migration");
});

test("buildEveBootPacket separates seed, runtime probe and capability tiers", () => {
  const intake = buildIntakeRecord(sampleInput(), { date: "2026-05-25" });
  const packet = buildEveBootPacket({ input: sampleInput(), intake, date: "2026-05-25" });
  assert.equal(packet.version, EVE_BOOT_PACKET_VERSION);
  assert.equal(packet.account_seed.company_name, "Acme Systems");
  assert.equal(packet.account_seed.initial_report_context, "Founder completed the public AI business report before install.");
  assert.equal(packet.north_star.id, "founder-offline-test");
  assert.match(packet.north_star.mission, /14 days/);
  assert.ok(packet.source_of_truth.includes(".company-os/eve/SOUL.md"));
  assert.ok(packet.source_of_truth.includes("docs/operations/command-eve-founder-offline-readiness.md"));
  assert.equal(packet.runtime_probe.model_provider_status, "unknown_until_preflight");
  assert.equal(packet.first_greeting_protocol.must_start_with_known_context, true);
  assert.equal(packet.first_greeting_protocol.max_initial_questions, 3);
  assert.ok(packet.capability_matrix.some((tier) => tier.tier === "T0" && tier.not_required.includes("Honcho")));
  assert.ok(packet.operating_boundaries.required_core_for_company_os_native.includes("Plane"));
  assert.equal(packet.operating_boundaries.adapt_existing_systems_first, true);
});

test("buildFirstCompanyPacket renders expected files and manual Plane draft", () => {
  const packet = buildFirstCompanyPacket(sampleInput(), {
    registry: sampleRegistry(),
    date: "2026-05-25",
  });
  assert.equal(packet.ok, true);
  assert.equal(packet.version, FIRST_COMPANY_PACKET_VERSION);
  const paths = packet.files.map((file) => file.path);
  assert.ok(paths.includes(".company-os/company-discovery-brief.md"));
  assert.ok(paths.includes(".company-os/onboarding/intake-record.json"));
  assert.ok(paths.includes(".company-os/onboarding/eve-boot-packet.json"));
  assert.ok(paths.includes(".company-os/onboarding/first-plane-parent-draft.md"));
  assert.ok(paths.includes("reports/company-discovery/2026-05-25/first-company-packet.md"));
  const draft = packet.files.find((file) => file.path.endsWith("first-plane-parent-draft.md")).content;
  assert.match(draft, /dispatch: manual/);
  assert.match(draft, /do not auto-dispatch/);
  assert.match(draft, /human_gate: HG-2/);
  const packetMd = packet.files.find((file) => file.path.endsWith("first-company-packet.md")).content;
  assert.match(packetMd, /## EVE Setup Queue/);
  assert.match(packetMd, /## Existing System Adoption/);
  assert.match(packetMd, /eve-boot-packet\.json/);
  assert.match(packetMd, /Linear active project/);
  assert.match(packetMd, /marketing UGC video pipeline/);
  const eveBoot = JSON.parse(packet.files.find((file) => file.path === ".company-os/onboarding/eve-boot-packet.json").content);
  assert.equal(eveBoot.north_star.id, "founder-offline-test");
  assert.equal(eveBoot.first_greeting_protocol.posture, "chief_of_staff_not_setup_bot");
  assert.equal(eveBoot.progressive_setup_queue.now[0], "confirm account seed");
  const brief = packet.files.find((file) => file.path === ".company-os/company-discovery-brief.md").content;
  assert.match(brief, /## EVE Chief-of-Staff Onboarding/);
  assert.match(brief, /## Existing System Discovery/);
  assert.match(brief, /Create new ledger only if missing: yes/);
  assert.match(brief, /Plane app access/);
});

test("buildFirstCompanyPacket rejects unknown pack via registry validation", () => {
  const input = sampleInput();
  input.first_department = "unknown-pack";
  const packet = buildFirstCompanyPacket(input, {
    registry: sampleRegistry(),
    date: "2026-05-25",
  });
  assert.equal(packet.ok, false);
  assert.ok(packet.errors.some((error) => error.includes("unknown-pack")));
});

test("writeFirstCompanyPacket dry-run reports files without writing", () => {
  const packet = buildFirstCompanyPacket(sampleInput(), {
    registry: sampleRegistry(),
    date: "2026-05-25",
  });
  const target = tmpDir();
  const result = writeFirstCompanyPacket({ target, packet, dryRun: true });
  assert.equal(result.ok, true);
  assert.equal(result.status, "dry-run");
  assert.deepEqual(fs.readdirSync(target), []);
});

test("writeFirstCompanyPacket writes generated files and blocks collisions", () => {
  const packet = buildFirstCompanyPacket(sampleInput(), {
    registry: sampleRegistry(),
    date: "2026-05-25",
  });
  const target = tmpDir();
  const first = writeFirstCompanyPacket({ target, packet });
  assert.equal(first.ok, true);
  assert.equal(first.status, "pass");
  assert.ok(fs.existsSync(path.join(target, ".company-os/company-discovery-brief.md")));
  assert.ok(fs.existsSync(path.join(target, ".company-os/onboarding/eve-boot-packet.json")));
  assert.ok(fs.existsSync(path.join(target, "reports/company-discovery/2026-05-25/first-company-packet.md")));

  const second = writeFirstCompanyPacket({ target, packet });
  assert.equal(second.ok, false);
  assert.equal(second.status, "blocked");
  assert.ok(second.collisions.includes(".company-os/company-discovery-brief.md"));
});
