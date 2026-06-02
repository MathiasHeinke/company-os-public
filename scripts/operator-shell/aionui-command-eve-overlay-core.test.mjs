import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AIONUI_COMMAND_EVE_ASSETS,
  EVE_EXTENSION_MANIFEST_VERSION,
  EVE_CAPABILITY_CARDS_VERSION,
  EVE_SKILL_REGISTRY,
  applyAionuiCommandEveOverlay,
  buildEveCapabilityCards,
  buildEveExtensionManifest,
  inspectAionuiCommandEveOverlay,
  isAionuiCommandEveOverlayApplied,
  readConnectorManifestFromSource,
  readPreflightEvidence,
  resolveAionuiCommandEveOverlayPaths,
} from "./aionui-command-eve-overlay-core.mjs";

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "aionui-eve-overlay-test-"));
}

function writeFile(file, content = "x\n") {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function makeFixture() {
  const root = tmpDir();
  const companyOsRoot = path.join(root, "Company.OS");
  const aionuiRoot = path.join(root, "AionUi");
  writeFile(path.join(companyOsRoot, "assets/brand/eve-command/aionui-overlay/patches/command-eve-aionui.patch"), "");
  writeFile(path.join(companyOsRoot, "VERSION"), "0.7.1-rc.0\n");
  writeFile(
    path.join(companyOsRoot, "kits/company-os-kit/.company-os/eve/connector-manifests.json"),
    fs.readFileSync(path.resolve("kits/company-os-kit/.company-os/eve/connector-manifests.json"), "utf8"),
  );
  for (const skill of EVE_SKILL_REGISTRY) {
    writeFile(path.join(companyOsRoot, skill.source_doc), `# Skill: ${skill.id}\nContent.\n`);
  }
  for (const asset of AIONUI_COMMAND_EVE_ASSETS) {
    writeFile(path.join(companyOsRoot, asset.source), `asset:${asset.target}\n`);
  }
  writeFile(path.join(aionuiRoot, "package.json"), JSON.stringify({ version: "2.1.1" }));
  writeFile(
    path.join(aionuiRoot, "packages/desktop/src/renderer/components/layout/Layout.tsx"),
    "src='/command-eve-logo.svg?v=command-eve-20260526'\n<div>EVE</div>\n",
  );
  writeFile(
    path.join(aionuiRoot, "packages/desktop/src/renderer/components/layout/Titlebar/index.tsx"),
    "const appTitle = useMemo(() => 'EVE', []);\n",
  );
  writeFile(
    path.join(aionuiRoot, "packages/desktop/src/renderer/pages/guid/GuidPage.tsx"),
    "const COMMAND_EVE_GUID_ENABLED = true;\nconst x = '/eve-intent-wait.mp4';\n",
  );
  writeFile(
    path.join(aionuiRoot, "packages/desktop/src/renderer/pages/guid/index.module.css"),
    ".commandEveWaitVideo { width: 1px; }\n",
  );
  return { root, companyOsRoot, aionuiRoot };
}

test("resolveAionuiCommandEveOverlayPaths uses portable private-root defaults", () => {
  const fixture = makeFixture();
  const paths = resolveAionuiCommandEveOverlayPaths({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: path.join(fixture.root, "private"),
  });
  assert.equal(paths.aionuiRoot, path.join(fixture.root, "private", "aionui-sidecar", "AionUi"));
  assert.equal(paths.contextRoot, path.join(fixture.root, "private", "aion-companyos-context"));
  assert.equal(paths.assets.length, AIONUI_COMMAND_EVE_ASSETS.length);
  assert.ok(paths.eveExtensionManifest.endsWith("EVE_EXTENSION_MANIFEST.json"));
  assert.ok(paths.eveCapabilityCards.endsWith("EVE_CAPABILITY_CARDS.json"));
  assert.ok(paths.killswitch.includes("[WORK_ITEM_ID].stop"));
});

test("isAionuiCommandEveOverlayApplied recognizes the applied source markers", () => {
  const fixture = makeFixture();
  const paths = resolveAionuiCommandEveOverlayPaths({
    companyOsRoot: fixture.companyOsRoot,
    aionuiRoot: fixture.aionuiRoot,
  });
  assert.equal(isAionuiCommandEveOverlayApplied(paths), true);
});

test("inspectAionuiCommandEveOverlay plans asset copies for an already-patched AionUI tree", () => {
  const fixture = makeFixture();
  const result = inspectAionuiCommandEveOverlay({
    companyOsRoot: fixture.companyOsRoot,
    aionuiRoot: fixture.aionuiRoot,
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, "already-applied");
  assert.equal(result.assets.filter((asset) => asset.should_copy).length, AIONUI_COMMAND_EVE_ASSETS.length);
});

test("applyAionuiCommandEveOverlay copies assets without reapplying source patch when markers are present", () => {
  const fixture = makeFixture();
  const result = applyAionuiCommandEveOverlay({
    companyOsRoot: fixture.companyOsRoot,
    aionuiRoot: fixture.aionuiRoot,
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, "pass");
  assert.equal(result.copied_assets.length, AIONUI_COMMAND_EVE_ASSETS.length);
  for (const asset of AIONUI_COMMAND_EVE_ASSETS) {
    assert.ok(fs.existsSync(path.join(fixture.aionuiRoot, asset.target)));
  }
});

test("buildEveExtensionManifest produces required fields", () => {
  const manifest = buildEveExtensionManifest({
    companyOsVersion: "0.7.1-rc.0",
    generatedAt: "2026-05-28T00:00:00.000Z",
  });
  assert.equal(manifest.version, EVE_EXTENSION_MANIFEST_VERSION);
  assert.equal(manifest.company_os_version, "0.7.1-rc.0");
  assert.equal(manifest.generated_at, "2026-05-28T00:00:00.000Z");
  assert.equal(manifest.generated_by, "aionui-command-eve-overlay.mjs");
  assert.equal(manifest.bundle_root, "${COMPANY_OS_PRIVATE_ROOT}/aion-companyos-context");
  assert.equal(manifest.skills.length, EVE_SKILL_REGISTRY.length);
  assert.equal(manifest.skills[0].id, "command-eve-first-run");
  assert.equal(manifest.skills[0].required, true);
  assert.ok(Array.isArray(manifest.load_order));
  assert.ok(manifest.load_order.includes("EVE_EXTENSION_MANIFEST.json"));
  assert.equal(manifest.security.credential_store, "never");
  assert.equal(manifest.security.silent_enable, "blocked");
});

test("buildEveCapabilityCards derives connector states from tier", () => {
  const fixture = makeFixture();
  const paths = resolveAionuiCommandEveOverlayPaths({
    companyOsRoot: fixture.companyOsRoot,
    aionuiRoot: fixture.aionuiRoot,
  });
  const connectorManifest = readConnectorManifestFromSource(paths);
  assert.equal(connectorManifest.ok, true);
  const cards = buildEveCapabilityCards({
    connectorManifest,
    companyOsVersion: "0.7.1-rc.0",
    generatedAt: "2026-05-28T00:00:00.000Z",
  });
  assert.equal(cards.version, EVE_CAPABILITY_CARDS_VERSION);
  assert.equal(cards.company_os_version, "0.7.1-rc.0");
  const byId = new Map(cards.cards.map((c) => [c.id, c]));
  assert.equal(byId.get("command-eve-first-run").state, "installed");
  assert.equal(byId.get("command-eve-first-run").type, "skill");
  assert.equal(byId.get("blog-department").name, "Blog Department");
  assert.ok(byId.get("blog-department").description.includes("blog draft"));
  assert.ok(byId.get("blog-department").allowed_actions.includes("apply claim safety check"));
  assert.ok(byId.get("blog-department").blocked_actions.includes("publish to CMS without HG-2.5 release card"));
  assert.equal(byId.get("local-company-os-workspace").state, "installed");
  assert.equal(byId.get("aionui-hermes-runtime").state, "needs_auth");
  assert.equal(byId.get("memory-honcho").state, "needs_auth");
  assert.equal(byId.get("google-mail").state, "gated");
  assert.equal(byId.get("product-backend-stack").state, "gated");
  assert.equal(byId.get("marketing-publishing-stack").state, "gated");
});

test("apply generates context bundle files to contextRoot", () => {
  const fixture = makeFixture();
  const privateRoot = path.join(fixture.root, "private");
  const result = applyAionuiCommandEveOverlay({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot,
    aionuiRoot: fixture.aionuiRoot,
  });
  assert.equal(result.ok, true);
  assert.equal(result.company_os_version, "0.7.1-rc.0");
  const contextRoot = path.join(privateRoot, "aion-companyos-context");
  assert.ok(fs.existsSync(path.join(contextRoot, "EVE_EXTENSION_MANIFEST.json")));
  assert.ok(fs.existsSync(path.join(contextRoot, "EVE_CAPABILITY_CARDS.json")));
  assert.ok(fs.existsSync(path.join(contextRoot, "EVE_CONNECTOR_MANIFESTS.json")));
  for (const skill of EVE_SKILL_REGISTRY) {
    assert.ok(fs.existsSync(path.join(contextRoot, "aionui-skills", skill.id, "SKILL.md")));
  }
  const manifestJson = JSON.parse(fs.readFileSync(path.join(contextRoot, "EVE_EXTENSION_MANIFEST.json"), "utf8"));
  assert.equal(manifestJson.version, EVE_EXTENSION_MANIFEST_VERSION);
  assert.equal(manifestJson.skills.length, EVE_SKILL_REGISTRY.length);
});

test("apply dry-run with missing AionUI returns ok:true with required_external", () => {
  const fixture = makeFixture();
  const privateRoot = path.join(fixture.root, "private");
  const missingAionui = path.join(fixture.root, "nonexistent-aionui");
  const result = applyAionuiCommandEveOverlay({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot,
    aionuiRoot: missingAionui,
    dryRun: true,
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, "dry-run");
  assert.equal(result.dry_run, true);
  assert.equal(result.aionui.present, false);
  assert.ok(result.required_external.length > 0);
  assert.equal(result.required_external[0].component, "aionui_root");
  assert.ok(result.would_write.length >= 3 + EVE_SKILL_REGISTRY.length);
  assert.ok(result.would_write.some((p) => p.endsWith("EVE_EXTENSION_MANIFEST.json")));
  assert.ok(result.would_write.some((p) => p.endsWith("EVE_CAPABILITY_CARDS.json")));
  assert.ok(!fs.existsSync(path.join(privateRoot, "aion-companyos-context", "EVE_EXTENSION_MANIFEST.json")));
});

test("apply dry-run lists context bundle planned files even with AionUI present", () => {
  const fixture = makeFixture();
  const privateRoot = path.join(fixture.root, "private");
  const result = applyAionuiCommandEveOverlay({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot,
    aionuiRoot: fixture.aionuiRoot,
    dryRun: true,
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, "dry-run");
  assert.ok(result.would_write.length > EVE_SKILL_REGISTRY.length + 3);
  assert.equal(result.aionui.present, true);
  assert.equal(result.aionui.overlay_applied, true);
  assert.equal(result.required_external.length, 0);
  assert.equal(result.company_os_version, "0.7.1-rc.0");
});

test("readConnectorManifestFromSource reads from companyOsRoot/kits path", () => {
  const fixture = makeFixture();
  const paths = resolveAionuiCommandEveOverlayPaths({
    companyOsRoot: fixture.companyOsRoot,
    aionuiRoot: fixture.aionuiRoot,
  });
  const manifest = readConnectorManifestFromSource(paths);
  assert.equal(manifest.ok, true);
  assert.ok(manifest.data.connectors.length >= 8);
});

test("buildEveCapabilityCards adds manifest_state, state_source and preflight_result_file fields", () => {
  const fixture = makeFixture();
  const paths = resolveAionuiCommandEveOverlayPaths({
    companyOsRoot: fixture.companyOsRoot,
    aionuiRoot: fixture.aionuiRoot,
  });
  const connectorManifest = readConnectorManifestFromSource(paths);
  const cards = buildEveCapabilityCards({ connectorManifest });
  const byId = new Map(cards.cards.map((c) => [c.id, c]));
  const plane = byId.get("execution-ledger-plane");
  assert.ok(plane, "execution-ledger-plane card must exist");
  assert.equal(plane.manifest_state, "needs_auth");
  assert.equal(plane.state_source, "manifest");
  assert.ok(plane.preflight_result_file, "preflight_result_file must be present");
  assert.ok(plane.preflight_result_file.includes("execution-ledger-plane"));
  const gated = byId.get("google-mail");
  assert.equal(gated.manifest_state, "gated");
  assert.equal(gated.state_source, "manifest");
  assert.ok(gated.blocked_reason, "gated connector must have blocked_reason");
  assert.ok(gated.blocked_reason.includes("HG-"), "blocked_reason must reference HumanGate");
});

test("buildEveCapabilityCards sets state to connected when passing preflight evidence exists", () => {
  const fixture = makeFixture();
  const paths = resolveAionuiCommandEveOverlayPaths({
    companyOsRoot: fixture.companyOsRoot,
    aionuiRoot: fixture.aionuiRoot,
  });
  const connectorManifest = readConnectorManifestFromSource(paths);
  const preflightDir = path.join(fixture.root, "preflight-results");
  fs.mkdirSync(preflightDir, { recursive: true });
  fs.writeFileSync(
    path.join(preflightDir, "execution-ledger-plane-latest.json"),
    JSON.stringify({ ok: true, status: "pass", connector: "execution-ledger-plane" }),
  );
  fs.writeFileSync(
    path.join(preflightDir, "github-gitnexus-latest.json"),
    JSON.stringify({ ok: true, status: "pass", connector: "github-gitnexus" }),
  );
  const cards = buildEveCapabilityCards({ connectorManifest, preflightResultsDir: preflightDir });
  const byId = new Map(cards.cards.map((c) => [c.id, c]));
  const plane = byId.get("execution-ledger-plane");
  assert.equal(plane.state, "connected");
  assert.equal(plane.state_source, "preflight-evidence");
  assert.equal(plane.manifest_state, "needs_auth");
  assert.equal(plane.next_action, null);
  const github = byId.get("github-gitnexus");
  assert.equal(github.state, "connected");
  assert.equal(github.state_source, "preflight-evidence");
  const honcho = byId.get("memory-honcho");
  assert.equal(honcho.state, "needs_auth");
  assert.equal(honcho.state_source, "manifest");
});

test("buildEveCapabilityCards never promotes gated connectors to connected via evidence", () => {
  const fixture = makeFixture();
  const paths = resolveAionuiCommandEveOverlayPaths({
    companyOsRoot: fixture.companyOsRoot,
    aionuiRoot: fixture.aionuiRoot,
  });
  const connectorManifest = readConnectorManifestFromSource(paths);
  const preflightDir = path.join(fixture.root, "preflight-results-gated");
  fs.mkdirSync(preflightDir, { recursive: true });
  for (const id of ["google-mail", "product-backend-stack", "marketing-publishing-stack"]) {
    fs.writeFileSync(
      path.join(preflightDir, `${id}-latest.json`),
      JSON.stringify({ ok: true, status: "pass", connector: id }),
    );
  }
  const cards = buildEveCapabilityCards({ connectorManifest, preflightResultsDir: preflightDir });
  const byId = new Map(cards.cards.map((c) => [c.id, c]));
  assert.equal(byId.get("google-mail").state, "gated", "gated must not be promoted to connected");
  assert.equal(byId.get("product-backend-stack").state, "gated");
  assert.equal(byId.get("marketing-publishing-stack").state, "gated");
});

test("readPreflightEvidence returns null when dir is absent or file missing", () => {
  const dir = path.join(os.tmpdir(), `eve-preflight-test-${Date.now()}`);
  assert.equal(readPreflightEvidence("some-connector", null), null);
  assert.equal(readPreflightEvidence("some-connector", dir), null);
  fs.mkdirSync(dir, { recursive: true });
  assert.equal(readPreflightEvidence("some-connector", dir), null);
});

test("readPreflightEvidence returns parsed JSON from latest file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eve-preflight-"));
  const evidence = { ok: true, status: "pass", connector: "my-connector" };
  fs.writeFileSync(path.join(dir, "my-connector-latest.json"), JSON.stringify(evidence));
  const result = readPreflightEvidence("my-connector", dir);
  assert.deepEqual(result, evidence);
  fs.rmSync(dir, { recursive: true });
});

test("readPreflightEvidence falls back to most recent dated file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eve-preflight-dated-"));
  const older = { ok: false, status: "blocked" };
  const newer = { ok: true, status: "pass" };
  fs.writeFileSync(path.join(dir, "my-conn-2026-05-27.json"), JSON.stringify(older));
  fs.writeFileSync(path.join(dir, "my-conn-2026-05-28.json"), JSON.stringify(newer));
  const result = readPreflightEvidence("my-conn", dir);
  assert.deepEqual(result, newer);
  fs.rmSync(dir, { recursive: true });
});
