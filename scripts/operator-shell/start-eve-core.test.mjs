import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { AIONUI_COMMAND_EVE_ASSETS } from "./aionui-command-eve-overlay-core.mjs";
import {
  DEFAULT_CONTEXT_FILES,
  DEFAULT_EVE_CONNECTOR_MANIFEST_FILE,
  DEFAULT_EVE_RUNTIME_POLICY_FILE,
} from "./eve-sidecar-core.mjs";
import {
  runStartEve,
  START_EVE_VERSION,
  writeStartEveReport,
} from "./start-eve-core.mjs";
import { DEFAULT_SESSION_CONTINUITY_REGISTRY_PATH } from "../orchestration/session-continuity-router.mjs";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const START_EVE_CLI = path.join(THIS_DIR, "start_eve.mjs");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "start-eve-test-"));
}

function writeFile(file, content = "x\n", mode) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  if (mode) fs.chmodSync(file, mode);
}

function run(command, args, cwd) {
  const result = childProcess.spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed: ${result.stderr}`);
  return result;
}

function makeFixture({ overlayApplied = true, hermesOutputsArgs = false } = {}) {
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
  writeFile(
    path.join(companyOsRoot, DEFAULT_SESSION_CONTINUITY_REGISTRY_PATH),
    fs.readFileSync(path.resolve(DEFAULT_SESSION_CONTINUITY_REGISTRY_PATH), "utf8"),
  );
  for (const asset of AIONUI_COMMAND_EVE_ASSETS) {
    writeFile(path.join(companyOsRoot, asset.source), `asset:${asset.target}\n`);
  }

  const aionuiRoot = path.join(privateRoot, "aionui-sidecar", "AionUi");
  writeFile(path.join(aionuiRoot, "package.json"), JSON.stringify({ version: "2.1.1" }));
  if (overlayApplied) {
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
  } else {
    writeFile(path.join(aionuiRoot, "packages/desktop/src/renderer/components/layout/Layout.tsx"), "<div>AionUI</div>\n");
    writeFile(path.join(aionuiRoot, "packages/desktop/src/renderer/components/layout/Titlebar/index.tsx"), "const appTitle = 'AionUI';\n");
    writeFile(path.join(aionuiRoot, "packages/desktop/src/renderer/pages/guid/GuidPage.tsx"), "export function Guid() {}\n");
    writeFile(path.join(aionuiRoot, "packages/desktop/src/renderer/pages/guid/index.module.css"), ".root {}\n");
  }
  run("git", ["init"], aionuiRoot);
  run("git", ["add", "."], aionuiRoot);
  run("git", ["-c", "user.email=test@example.com", "-c", "user.name=Test", "commit", "-m", "fixture"], aionuiRoot);
  if (!overlayApplied) {
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
    const patch = run("git", ["diff", "--", "packages/desktop/src/renderer"], aionuiRoot).stdout;
    writeFile(path.join(companyOsRoot, "assets/brand/eve-command/aionui-overlay/patches/command-eve-aionui.patch"), patch);
    run("git", ["checkout", "--", "packages/desktop/src/renderer"], aionuiRoot);
  } else {
    writeFile(path.join(companyOsRoot, "assets/brand/eve-command/aionui-overlay/patches/command-eve-aionui.patch"), "");
  }

  const hermesRoot = path.join(privateRoot, "hermes-sidecar", "hermes-agent");
  writeFile(
    path.join(hermesRoot, "venv/bin/hermes"),
    hermesOutputsArgs
      ? "#!/usr/bin/env bash\nprintf '%s\\n' \"$*\"\n"
      : "#!/usr/bin/env bash\necho 'Hermes Agent v0.test'\n",
    0o755,
  );
  writeFile(path.join(hermesRoot, "venv/bin/python"), "#!/usr/bin/env bash\nexit 0\n", 0o755);
  writeFile(path.join(privateRoot, "hermes-sidecar", "hermes-home", "config.yaml"), [
    "model:",
    "  default: gpt-5.1-codex-mini",
    "  provider: openrouter",
    "",
  ].join("\n"));

  return { root, privateRoot, companyOsRoot, aionuiRoot, hermesRoot };
}

test("runStartEve passes when overlay, sidecar preflight and start command are ready", () => {
  const fixture = makeFixture();
  const result = runStartEve({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
    date: "2026-05-26",
  });

  assert.equal(result.version, START_EVE_VERSION);
  assert.equal(result.ok, true);
  assert.equal(result.status, "ready");
  assert.deepEqual(
    result.stages.map((stage) => [stage.id, stage.status]),
    [
      ["aionui.default_agent_overlay", "already-applied"],
      ["eve.prepare", "pass"],
      ["eve.preflight", "pass"],
      ["eve.session_continuity", "pass"],
      ["hermes.auth_model_smoke", "skipped"],
    ],
  );
  assert.match(result.start_command.join("\n"), /bun run webui --no-build --port 25809/);
  assert.equal(result.summary.default_agent, "EVE via Hermes");
  assert.equal(result.summary.hermes_model, "gpt-5.1-codex-mini");
  assert.equal(result.summary.hermes_provider, "openrouter");
  assert.equal(result.summary.runtime_policy_profile, "command-eve-073-proposal-only");
  assert.equal(result.summary.runtime_policy_mode, "proposal_only");
  assert.equal(result.summary.session_route_class, "SC2-workstream-continuity");
  assert.equal(result.summary.session_policy, "workstream-continuity");
  assert.equal(result.summary.session_reuse_allowed, true);
  assert.equal(result.summary.session_human_gate, "HG-2.5");
  assert.equal(result.session_continuity.route_receipt.required_registry_state, "open-workstream-session");
  assert.match(result.start_command.join("\n"), /COMMAND_EVE_RUNTIME_POLICY_PATH/);
  assert.match(result.start_command.join("\n"), /AIONUI_COMMAND_EVE_DISABLE_NATIVE_AUTONOMY="1"/);
});

test("runStartEve blocks when Command EVE overlay is not applied and applyOverlay is false", () => {
  const fixture = makeFixture({ overlayApplied: false });
  const result = runStartEve({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
    date: "2026-05-26",
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.failed_stage, "aionui.default_agent_overlay");
  assert.ok(result.failures.includes("aionui_command_eve_overlay_not_applied"));
  assert.equal(result.stages[0].status, "needs_apply");
  assert.match(result.next_actions[0], /--apply-overlay/);
});

test("runStartEve can apply the Command EVE overlay before preflight", () => {
  const fixture = makeFixture({ overlayApplied: false });
  const result = runStartEve({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
    date: "2026-05-26",
    applyOverlay: true,
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "ready");
  assert.equal(result.stages[0].id, "aionui.default_agent_overlay");
  assert.equal(result.stages[0].status, "pass");
  assert.equal(result.stages[0].overlay_applied, true);
  assert.ok(fs.existsSync(path.join(fixture.aionuiRoot, "public/command-eve-logo.svg")));
});

test("runStartEve blocks high-risk session-continuity startup classes", () => {
  const fixture = makeFixture();
  const result = runStartEve({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
    date: "2026-05-26",
    sessionClass: "SC4-continuity-blocked",
    sessionMessage: "Keep session open for a production write and legal commitment.",
    sessionFields: { human_gate: "HG-4" },
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.failed_stage, "eve.session_continuity");
  assert.ok(result.failures.includes("session-continuity.reuse-blocked"));
  const stage = result.stages.find((row) => row.id === "eve.session_continuity");
  assert.equal(stage.status, "blocked");
  assert.equal(stage.route_class, "SC4-continuity-blocked");
});

test("runStartEve includes Hermes model/auth smoke when requested", () => {
  const fixture = makeFixture({ hermesOutputsArgs: true });
  const result = runStartEve({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
    date: "2026-05-26",
    authCheck: true,
    timeoutMs: 10_000,
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "ready");
  const smoke = result.stages.find((stage) => stage.id === "hermes.auth_model_smoke");
  assert.equal(smoke.status, "pass");
  assert.match(smoke.model, /gpt-5\.1-codex-mini/);
  assert.match(smoke.provider, /openrouter/);
});

test("writeStartEveReport writes markdown and json evidence", () => {
  const fixture = makeFixture();
  const result = runStartEve({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
    date: "2026-05-26",
  });

  const report = writeStartEveReport({
    result,
    companyOsRoot: fixture.companyOsRoot,
    date: "2026-05-26",
  });

  assert.ok(fs.existsSync(report.markdown));
  assert.ok(fs.existsSync(report.json));
  assert.match(fs.readFileSync(report.markdown, "utf8"), /# Start EVE Preflight/);
  assert.match(fs.readFileSync(report.markdown, "utf8"), /Runtime policy: command-eve-073-proposal-only/);
  assert.match(fs.readFileSync(report.markdown, "utf8"), /Session policy: workstream-continuity/);
  assert.equal(JSON.parse(fs.readFileSync(report.json, "utf8")).status, "ready");
  assert.equal(JSON.parse(fs.readFileSync(report.json, "utf8")).summary.session_route_class, "SC2-workstream-continuity");
});

test("start_eve CLI emits JSON preflight for a prepared fixture", () => {
  const fixture = makeFixture();
  const result = run(process.execPath, [
    START_EVE_CLI,
    "check",
    "--company-os-root",
    fixture.companyOsRoot,
    "--private-root",
    fixture.privateRoot,
    "--json",
  ], fixture.companyOsRoot);

  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.version, START_EVE_VERSION);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.status, "ready");
  assert.equal(parsed.summary.default_agent, "EVE via Hermes");
  assert.equal(parsed.summary.runtime_policy_profile, "command-eve-073-proposal-only");
  assert.equal(parsed.summary.session_policy, "workstream-continuity");
  assert.equal(parsed.session_continuity.route_receipt.route_class, "SC2-workstream-continuity");
});
