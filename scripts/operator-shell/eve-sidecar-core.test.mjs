import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildAionuiStartCommand,
  buildEveFirstRunSkillContent,
  buildEveFirstRunConfirmationFlow,
  buildEveSoulContent,
  buildEveRuntimeBootPacket,
  buildHermesAuthPreflightProfile,
  buildHermesPackageDecision,
  classifyFailureTaxonomy,
  DEFAULT_EVE_CONNECTOR_MANIFEST_FILE,
  DEFAULT_EVE_RUNTIME_POLICY_FILE,
  DEFAULT_CONTEXT_FILES,
  FAILURE_CODES,
  EVE_FIRST_RUN_CONFIRMATION_VERSION,
  EVE_HERMES_AUTH_PREFLIGHT_VERSION,
  prepareEveSidecar,
  preflightEveSidecar,
  readEveConnectorManifest,
  readEveRuntimePolicy,
  resolveEveSidecarPaths,
  runHermesEveSmoke,
} from "./eve-sidecar-core.mjs";

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eve-sidecar-test-"));
}

function writeFile(file, content = "x\n", mode) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  if (mode) fs.chmodSync(file, mode);
}

function makeFixture() {
  const root = tmpDir();
  const privateRoot = path.join(root, "private");
  const companyOsRoot = path.join(root, "Company.OS");
  for (const file of DEFAULT_CONTEXT_FILES) {
    writeFile(path.join(companyOsRoot, file), `${file}\n`);
  }
  writeFile(
    path.join(companyOsRoot, DEFAULT_EVE_CONNECTOR_MANIFEST_FILE),
    fs.readFileSync(path.resolve(DEFAULT_EVE_CONNECTOR_MANIFEST_FILE), "utf8"),
  );
  writeFile(
    path.join(companyOsRoot, DEFAULT_EVE_RUNTIME_POLICY_FILE),
    fs.readFileSync(path.resolve(DEFAULT_EVE_RUNTIME_POLICY_FILE), "utf8"),
  );
  const aionuiRoot = path.join(privateRoot, "aionui-sidecar", "AionUi");
  writeFile(path.join(aionuiRoot, "package.json"), JSON.stringify({ version: "2.1.1" }));
  const hermesRoot = path.join(privateRoot, "hermes-sidecar", "hermes-agent");
  writeFile(path.join(hermesRoot, "venv/bin/hermes"), "#!/usr/bin/env bash\necho 'Hermes Agent v0.test'\n", 0o755);
  writeFile(path.join(hermesRoot, "venv/bin/python"), "#!/usr/bin/env bash\nexit 0\n", 0o755);
  writeFile(path.join(privateRoot, "hermes-sidecar", "hermes-home", "config.yaml"), [
    "model:",
    "  default: gpt-5.1-codex-mini",
    "  provider: openrouter",
    "",
  ].join("\n"));
  return { root, privateRoot, companyOsRoot, aionuiRoot, hermesRoot };
}

test("resolveEveSidecarPaths uses portable private-root defaults", () => {
  const fixture = makeFixture();
  const paths = resolveEveSidecarPaths({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  assert.equal(paths.aionuiRoot, path.join(fixture.privateRoot, "aionui-sidecar", "AionUi"));
  assert.equal(paths.hermesHome, path.join(fixture.privateRoot, "hermes-sidecar", "hermes-home"));
  assert.equal(paths.aionuiHermesShim, path.join(fixture.privateRoot, "aionui-sidecar", "bin", "hermes"));
  assert.equal(paths.eveRuntimeBootPacket, path.join(fixture.privateRoot, "aion-companyos-context", "EVE_RUNTIME_BOOT_PACKET.json"));
  assert.equal(paths.eveRuntimePolicy, path.join(fixture.privateRoot, "aion-companyos-context", "EVE_RUNTIME_POLICY.json"));
  assert.equal(paths.eveFirstRunSkill, path.join(fixture.privateRoot, "aion-companyos-context", "aionui-skills", "command-eve-first-run", "SKILL.md"));
  assert.equal(paths.eveConnectorManifest, path.join(fixture.privateRoot, "aion-companyos-context", "EVE_CONNECTOR_MANIFESTS.json"));
  assert.equal(paths.departmentPackCreatorSkill, path.join(fixture.companyOsRoot, "docs/integrations/aionui-hermes-department-pack-creator-skill.md"));
});

test("buildEveSoulContent contains Command EVE identity and hard boundaries", () => {
  const fixture = makeFixture();
  const paths = resolveEveSidecarPaths({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  const soul = buildEveSoulContent({ paths, generatedAt: "2026-05-25T00:00:00.000Z" });
  assert.match(soul, /Command EVE/);
  assert.match(soul, /Founder Offline Test/);
  assert.match(soul, /14 days/);
  assert.match(soul, /command-eve-founder-offline-readiness\.md/);
  assert.match(soul, /truth and correctness over approval/);
  assert.match(soul, /First-Run Onboarding Protocol/);
  assert.match(soul, /EVE_RUNTIME_BOOT_PACKET\.json/);
  assert.match(soul, /Command EVE First-Run Skill Pack/);
  assert.match(soul, /EVE_CONNECTOR_MANIFESTS\.json/);
  assert.match(soul, /EVE_RUNTIME_POLICY\.json/);
  assert.match(soul, /no native AionUI\/Hermes cron, team mode, direct delegation or durable Honcho memory write/);
  assert.match(soul, /client runtime is not initialized yet/);
  assert.match(soul, /wo stehen wir\?/);
  assert.match(soul, /Do not ask for company identity/);
  assert.match(soul, /eve-boot-packet\.json/);
  assert.match(soul, /intake-record\.json/);
  assert.match(soul, /dispatch: ready/);
  assert.match(soul, /dispatch: manual/);
  assert.match(soul, /HG-4 approval/);
});

test("repository runtime policy disables native AionUI and Hermes autonomy", () => {
  const fixture = makeFixture();
  const paths = resolveEveSidecarPaths({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  const policy = readEveRuntimePolicy({ paths });
  assert.equal(policy.ok, true);
  assert.equal(policy.data.profile, "command-eve-073-proposal-only");
  assert.equal(policy.data.default_mode, "proposal_only");
  assert.equal(policy.data.north_star, "founder-offline-test");
  const aionuiDisabled = policy.data.surfaces.aionui.disabled_features.map((feature) => feature.id);
  const hermesDisabled = policy.data.surfaces.hermes.disabled_features.map((feature) => feature.id);
  const hermesGated = policy.data.surfaces.hermes.gated_features.map((feature) => feature.id);
  assert.ok(aionuiDisabled.includes("native-scheduled-tasks"));
  assert.ok(aionuiDisabled.includes("team-mode"));
  assert.ok(aionuiDisabled.includes("assistant-switching"));
  assert.ok(aionuiDisabled.includes("yolo-full-auto"));
  assert.ok(hermesDisabled.includes("native-cronjob"));
  assert.ok(hermesDisabled.includes("delegate-task-spawn"));
  assert.ok(hermesDisabled.includes("kanban-mutation"));
  assert.ok(hermesGated.includes("durable-memory-writes"));
});

test("repository connector manifest is parseable and keeps risky connectors gated", () => {
  const fixture = makeFixture();
  const paths = resolveEveSidecarPaths({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  const manifest = readEveConnectorManifest({ paths });
  assert.equal(manifest.ok, true);
  const connectors = new Map(manifest.data.connectors.map((connector) => [connector.id, connector]));
  assert.equal(connectors.get("local-company-os-workspace").tier, "core");
  assert.equal(connectors.get("aionui-hermes-runtime").tier, "core");
  assert.equal(connectors.get("execution-ledger-plane").tier, "core");
  assert.equal(connectors.get("memory-honcho").tier, "autonomy_core");
  assert.equal(connectors.get("github-gitnexus").tier, "autonomy_core");
  assert.equal(connectors.get("google-mail").tier, "gated");
  assert.equal(connectors.get("product-backend-stack").tier, "gated");
});

test("buildEveFirstRunSkillContent gives EVE startup modules and connector rules", () => {
  const fixture = makeFixture();
  const paths = resolveEveSidecarPaths({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  const skill = buildEveFirstRunSkillContent({
    paths,
    connectorManifest: readEveConnectorManifest({ paths }),
    generatedAt: "2026-05-26T00:00:00.000Z",
  });
  assert.match(skill, /company-discovery/);
  assert.match(skill, /system-inventory/);
  assert.match(skill, /connector-setup/);
  assert.match(skill, /memory-setup/);
  assert.match(skill, /execution-ledger-setup/);
  assert.match(skill, /github-workspace-setup/);
  assert.match(skill, /google-workspace-setup/);
  assert.match(skill, /first-goal-setup/);
  assert.match(skill, /department-pack-creator/);
  assert.match(skill, /aionui-hermes-department-pack-creator-skill\.md/);
  assert.match(skill, /google-mail \(gated\)/);
  assert.match(skill, /Do not behave like a blank chatbot/);
  assert.match(skill, /First Response Modes/);
  assert.match(skill, /client_seed_missing/);
  assert.match(skill, /do not start the full setup queue/);
  assert.match(skill, /Ask no company identity, tool-stack or permission questions/);
  assert.match(skill, /manifest as policy, not proof of availability/);
  assert.match(skill, /Runtime Policy/);
  assert.match(skill, /Auth \/ Model Preflight/);
  assert.match(skill, /minimax\/minimax-m3/);
  assert.match(skill, /BLOCKED_AUTH means provider key/);
  assert.match(skill, /native-scheduled-tasks/);
  assert.match(skill, /durable-memory-writes/);
  assert.match(skill, /unverified until the verify command or connector evidence passes/);
  assert.match(skill, /Never present a full questionnaire as the first response/);
  assert.match(skill, /do not collect passwords, cookies, recovery codes, raw tokens or payment details/);
});

test("buildEveRuntimeBootPacket distinguishes templates from client seed", () => {
  const fixture = makeFixture();
  writeFile(path.join(fixture.companyOsRoot, "kits/company-os-kit/.company-os/onboarding/eve-boot-packet.example.json"), "{}\n");
  const paths = resolveEveSidecarPaths({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  const packet = buildEveRuntimeBootPacket({ paths, generatedAt: "2026-05-26T00:00:00.000Z" });
  assert.equal(packet.client_status, "client_seed_missing");
  assert.equal(packet.north_star.id, "founder-offline-test");
  assert.match(packet.north_star.mission, /14 days/);
  assert.equal(packet.fallback_template.status, "found");
  assert.match(packet.first_response_rule, /Do not claim the workspace is empty/);
  assert.equal(packet.first_response_modes.client_seed_missing.choices.length, 3);
  assert.match(packet.first_response_modes.client_seed_missing.forbidden.join("\n"), /full setup queue/);
  assert.match(packet.first_response_modes.client_seed_present.opening, /already have these company\/account facts/);
  assert.equal(packet.first_run_confirmation.version, EVE_FIRST_RUN_CONFIRMATION_VERSION);
  assert.equal(packet.first_run_confirmation.seed_status, "client_seed_missing");
  assert.ok(packet.first_run_confirmation.progressive_setup_queue.required_now.includes("confirm known account/company facts"));
});

test("buildEveFirstRunConfirmationFlow states known facts before setup queue", () => {
  const fixture = makeFixture();
  writeFile(
    path.join(fixture.companyOsRoot, ".company-os/onboarding/eve-boot-packet.json"),
    JSON.stringify({
      account_seed: {
        user_name: "Jane Founder",
        company_name: "Acme Systems",
        website: "https://acme.example",
        primary_offer: "AI operating-system setup",
        buyer: "founder-led service firms",
        first_department: "marketing",
      },
      existing_systems: {
        discovery_status: "partial",
        connected_tools: ["Plane"],
        already_available: ["GitHub repo"],
        missing_or_blocked: ["Honcho auth"],
      },
    }),
  );
  const paths = resolveEveSidecarPaths({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  const flow = buildEveFirstRunConfirmationFlow({ paths, generatedAt: "2026-06-04T00:00:00.000Z" });

  assert.equal(flow.version, EVE_FIRST_RUN_CONFIRMATION_VERSION);
  assert.equal(flow.seed_status, "client_seed_present");
  assert.equal(flow.status, "needs_confirmation");
  assert.equal(flow.first_response_contract.ask, "Is this correct?");
  assert.equal(flow.known_facts.find((fact) => fact.id === "company_name").value, "Acme Systems");
  assert.equal(flow.known_facts.find((fact) => fact.id === "primary_offer").source, ".company-os/onboarding/eve-boot-packet.json");
  assert.equal(flow.existing_system_inventory.policy, "adapt_existing_first");
  assert.deepEqual(flow.existing_system_inventory.connected_tools, ["Plane"]);
  assert.ok(flow.progressive_setup_queue.required_now.includes("run Hermes provider auth/model smoke if auth is unverified"));
  assert.ok(flow.allowed_drafts.includes("CEO Delegation Packet"));
  assert.ok(flow.blocked_actions.includes("no worker dispatch"));
});

test("buildHermesAuthPreflightProfile points to official BYOK flow without storing secrets", () => {
  const fixture = makeFixture();
  const paths = resolveEveSidecarPaths({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  const profile = buildHermesAuthPreflightProfile({ paths });

  assert.equal(profile.version, EVE_HERMES_AUTH_PREFLIGHT_VERSION);
  assert.equal(profile.provider, "openrouter");
  assert.equal(profile.model, "gpt-5.1-codex-mini");
  assert.equal(profile.status, "model_profile_ready_auth_unverified");
  assert.equal(profile.official_setup.blocked_auth_result, FAILURE_CODES.BLOCKED_AUTH);
  assert.match(profile.official_setup.rule, /official BYOK\/API-key flow/);
  assert.match(profile.secret_policy, /do-not-store-raw-api-key/);
  assert.ok(profile.blocked_actions.some((action) => /raw API keys/.test(action)));
});

test("prepare dry-run plans writes without mutating private sidecar", () => {
  const fixture = makeFixture();
  const result = prepareEveSidecar({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
    dryRun: true,
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, "dry-run");
  assert.ok(result.planned_writes.some((row) => row.path.endsWith("SOUL.md")));
  assert.ok(result.planned_writes.some((row) => row.kind === "runtime-policy"));
  assert.ok(result.planned_writes.some((row) => row.kind === "eve-first-run-skill"));
  assert.ok(result.planned_writes.some((row) => row.kind === "eve-connector-manifest"));
  assert.equal(fs.existsSync(result.paths.soulPath), false);
});

test("prepare writes Hermes soul, private overlays and executable shims", () => {
  const fixture = makeFixture();
  const result = prepareEveSidecar({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
    generatedAt: "2026-05-25T00:00:00.000Z",
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, "pass");
  assert.ok(fs.existsSync(result.paths.soulPath));
  assert.ok(fs.readFileSync(result.paths.soulPath, "utf8").includes("Command EVE"));
  assert.ok(fs.existsSync(result.paths.eveSoulOverlay));
  assert.ok(fs.existsSync(result.paths.eveRuntimeBootPacket));
  assert.ok(fs.existsSync(result.paths.eveRuntimePolicy));
  assert.ok(fs.existsSync(result.paths.eveFirstRunSkill));
  assert.ok(fs.existsSync(result.paths.eveConnectorManifest));
  assert.equal(JSON.parse(fs.readFileSync(result.paths.eveRuntimePolicy, "utf8")).profile, "command-eve-073-proposal-only");
  assert.ok(fs.readFileSync(result.paths.eveFirstRunSkill, "utf8").includes("Command EVE First-Run Skill Pack"));
  assert.ok(fs.existsSync(result.paths.operatorBrief));
  assert.ok(fs.existsSync(result.paths.startGuide));
  fs.accessSync(result.paths.hermesWrapper, fs.constants.X_OK);
  fs.accessSync(result.paths.aionuiHermesShim, fs.constants.X_OK);
});

test("preflight passes after prepare against fixture sidecars", () => {
  const fixture = makeFixture();
  prepareEveSidecar({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  const result = preflightEveSidecar({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, "pass");
  assert.equal(result.aionui.version, "2.1.1");
  assert.match(result.hermes.version_text, /Hermes Agent v0\.test/);
  assert.equal(result.hermes.model_config.model, "gpt-5.1-codex-mini");
  assert.equal(result.hermes.model_config.provider, "openrouter");
  assert.equal(result.hermes.auth_profile.status, "model_profile_ready_auth_unverified");
  assert.equal(result.hermes.auth_profile.auth_mode, "bring-your-own-key");
  assert.equal(result.eve.first_run_confirmation.seed_status, "client_seed_missing");
  assert.equal(result.hermes.acp_dependency.status, "found");
  assert.equal(result.hermes.soul_location.status, "found");
  assert.equal(result.eve.first_run_skill.status, "found");
  assert.equal(result.eve.department_pack_creator_skill.status, "found");
  assert.equal(result.checks.department_pack_creator_skill_exists, true);
  assert.equal(result.eve.connector_manifest.status, "found");
  assert.ok(result.eve.connector_manifest.connector_count >= 8);
  assert.equal(result.checks.eve_runtime_policy_exists, true);
  assert.equal(result.eve.runtime_policy.status, "found");
  assert.equal(result.eve.runtime_policy.profile, "command-eve-073-proposal-only");
  assert.equal(result.eve.runtime_policy.default_mode, "proposal_only");
  assert.ok(result.eve.runtime_policy.disabled_features.aionui.includes("native-scheduled-tasks"));
  assert.ok(result.eve.runtime_policy.gated_features.hermes.includes("durable-memory-writes"));
});

test("preflight blocks when generated runtime policy is invalid", () => {
  const fixture = makeFixture();
  const prepared = prepareEveSidecar({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  assert.equal(prepared.ok, true);
  writeFile(prepared.paths.eveRuntimePolicy, "{}\n");
  const result = preflightEveSidecar({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.ok(result.failures.includes("eve_runtime_policy_exists"));
  assert.equal(result.eve.runtime_policy.status, "invalid");
});

test("preflight blocks when Hermes has no default model for AionUI", () => {
  const fixture = makeFixture();
  fs.rmSync(path.join(fixture.privateRoot, "hermes-sidecar", "hermes-home", "config.yaml"));
  prepareEveSidecar({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  const result = preflightEveSidecar({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.deepEqual(result.failures, ["hermes_default_model_configured"]);
  assert.equal(result.hermes.model_config.status, "missing_config");
});

test("Hermes smoke blocks when one-shot exits zero with an empty response", () => {
  const fixture = makeFixture();
  writeFile(path.join(fixture.hermesRoot, "venv/bin/hermes"), "#!/usr/bin/env bash\nexit 0\n", 0o755);
  prepareEveSidecar({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  const result = runHermesEveSmoke({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
    timeoutMs: 10_000,
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "hermes.oneshot-empty-response");
});

test("Hermes smoke passes provider and model through to the local wrapper", () => {
  const fixture = makeFixture();
  writeFile(path.join(fixture.hermesRoot, "venv/bin/hermes"), [
    "#!/usr/bin/env bash",
    "printf '%s\\n' \"$*\"",
    "",
  ].join("\n"), 0o755);
  prepareEveSidecar({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  const result = runHermesEveSmoke({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
    provider: "openrouter",
    model: "gpt-5.1-codex-mini",
    prompt: "EVE smoke",
    timeoutMs: 10_000,
  });
  assert.equal(result.ok, true);
  assert.match(result.result.stdout, /--model gpt-5\.1-codex-mini --provider openrouter -z EVE smoke/);
  assert.equal(result.auth_profile.status, "verified");
  assert.equal(result.auth_profile.readiness_proof.status, "pass");
});

test("Hermes smoke falls back to HERMES_HOME default model config", () => {
  const fixture = makeFixture();
  writeFile(path.join(fixture.hermesRoot, "venv/bin/hermes"), [
    "#!/usr/bin/env bash",
    "printf '%s\\n' \"$*\"",
    "",
  ].join("\n"), 0o755);
  prepareEveSidecar({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  const result = runHermesEveSmoke({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
    prompt: "EVE smoke",
    timeoutMs: 10_000,
  });
  assert.equal(result.ok, true);
  assert.equal(result.model, "gpt-5.1-codex-mini");
  assert.equal(result.provider, "openrouter");
  assert.match(result.result.stdout, /--model gpt-5\.1-codex-mini --provider openrouter -z EVE smoke/);
  assert.equal(result.auth_profile.provider, "openrouter");
});

test("start command exports local Hermes shim and AionUI state dirs", () => {
  const fixture = makeFixture();
  const paths = resolveEveSidecarPaths({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  const command = buildAionuiStartCommand({ paths, port: 25809 }).join("\n");
  assert.match(command, /AIONUI_DATA_DIR/);
  assert.match(command, /HERMES_HOME/);
  assert.match(command, /COMMAND_EVE_RUNTIME_POLICY_PATH/);
  assert.match(command, /AIONUI_COMMAND_EVE_DISABLE_NATIVE_AUTONOMY="1"/);
  assert.match(command, /bun run webui --no-build --port 25809/);
});

// [WORK_ITEM_ID]: Hermes runtime packaging tests

test("buildHermesPackageDecision reads version from pyproject.toml", () => {
  const fixture = makeFixture();
  writeFile(path.join(fixture.hermesRoot, "pyproject.toml"), [
    '[project]',
    'name = "hermes-agent"',
    'version = "0.14.0"',
    '',
  ].join("\n"));
  const paths = resolveEveSidecarPaths({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  const decision = buildHermesPackageDecision(paths);
  assert.equal(decision.version, "0.14.0");
  assert.equal(decision.update_channel, "manual-explicit");
  assert.match(decision.decision, /0\.14\.0/);
  assert.ok(decision.install_path);
  assert.ok(Array.isArray(decision.update_procedure.split(" ").filter(Boolean)));
});

test("buildHermesPackageDecision falls back to installed package metadata", () => {
  const fixture = makeFixture();
  writeFile(path.join(fixture.hermesRoot, "venv/bin/python"), "#!/usr/bin/env bash\necho '0.15.2'\n", 0o755);
  const paths = resolveEveSidecarPaths({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  const decision = buildHermesPackageDecision(paths);
  assert.equal(decision.version, "0.15.2");
  assert.match(decision.decision, /0\.15\.2/);
});

test("buildHermesPackageDecision returns unknown version when pyproject.toml is missing", () => {
  const fixture = makeFixture();
  const paths = resolveEveSidecarPaths({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  const decision = buildHermesPackageDecision(paths);
  assert.equal(decision.version, "unknown");
  assert.equal(decision.update_channel, "manual-explicit");
});

test("classifyFailureTaxonomy returns BLOCKED_RUNTIME for missing hermes_root", () => {
  const taxonomy = classifyFailureTaxonomy(["hermes_root", "hermes_wrapper_executable"], null);
  assert.equal(taxonomy.code, FAILURE_CODES.BLOCKED_RUNTIME);
  assert.ok(taxonomy.reasons.includes("hermes_root"));
  assert.ok(taxonomy.next_actions.length > 0);
});

test("classifyFailureTaxonomy returns BLOCKED_MODEL for missing model config", () => {
  const taxonomy = classifyFailureTaxonomy(["hermes_default_model_configured"], null);
  assert.equal(taxonomy.code, FAILURE_CODES.BLOCKED_MODEL);
  assert.ok(taxonomy.reasons.includes("hermes_default_model_configured"));
});

test("classifyFailureTaxonomy returns BLOCKED_MODEL for empty smoke response", () => {
  const smoke = { reason: "hermes.oneshot-empty-response", result: { stderr: "" } };
  const taxonomy = classifyFailureTaxonomy([], smoke);
  assert.equal(taxonomy.code, FAILURE_CODES.BLOCKED_MODEL);
  assert.ok(taxonomy.reasons.includes("hermes.oneshot-empty-response"));
});

test("classifyFailureTaxonomy returns BLOCKED_AUTH for unauthorized smoke stderr", () => {
  const smoke = {
    reason: "hermes.oneshot-command-failed",
    result: { stderr: "Error: 401 Unauthorized - Invalid API key" },
  };
  const taxonomy = classifyFailureTaxonomy([], smoke);
  assert.equal(taxonomy.code, FAILURE_CODES.BLOCKED_AUTH);
  assert.ok(taxonomy.next_actions.some((a) => /api.?key|auth|provider/i.test(a)));
});

test("classifyFailureTaxonomy returns BLOCKED_RUNTIME for generic smoke command failure", () => {
  const smoke = {
    reason: "hermes.oneshot-command-failed",
    result: { stderr: "Command not found: hermes", error: "" },
  };
  const taxonomy = classifyFailureTaxonomy([], smoke);
  assert.equal(taxonomy.code, FAILURE_CODES.BLOCKED_RUNTIME);
});

test("classifyFailureTaxonomy returns BLOCKED_AUTH for provider timeout (ETIMEDOUT)", () => {
  const smoke = {
    reason: "hermes.oneshot-command-failed",
    result: { stderr: "", error: "spawnSync /path/hermes ETIMEDOUT" },
  };
  const taxonomy = classifyFailureTaxonomy([], smoke);
  assert.equal(taxonomy.code, FAILURE_CODES.BLOCKED_AUTH);
  assert.ok(taxonomy.reasons.includes("hermes.oneshot-provider-timeout"));
  assert.ok(taxonomy.next_actions.some((a) => /timeout|network|provider/i.test(a)));
});

test("classifyFailureTaxonomy returns null code when all pass", () => {
  const taxonomy = classifyFailureTaxonomy([], null);
  assert.equal(taxonomy.code, null);
  assert.deepEqual(taxonomy.reasons, []);
});

test("preflightEveSidecar includes failure_taxonomy and hermes_package_decision in output", () => {
  const fixture = makeFixture();
  writeFile(path.join(fixture.hermesRoot, "pyproject.toml"), [
    '[project]',
    'name = "hermes-agent"',
    'version = "0.14.0"',
    '',
  ].join("\n"));
  prepareEveSidecar({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  const result = preflightEveSidecar({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
  });
  assert.ok("failure_taxonomy" in result, "failure_taxonomy must be present");
  assert.ok("hermes_package_decision" in result, "hermes_package_decision must be present");
  assert.ok("auth_profile" in result, "auth_profile must be present");
  assert.equal(result.failure_taxonomy.code, null);
  assert.equal(result.hermes_package_decision.version, "0.14.0");
  assert.equal(result.hermes_package_decision.update_channel, "manual-explicit");
  assert.equal(result.auth_profile.auth_mode, "bring-your-own-key");
});
