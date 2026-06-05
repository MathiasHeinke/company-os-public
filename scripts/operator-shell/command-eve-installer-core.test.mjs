import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import test from "node:test";
import path from "node:path";

import {
  COMMAND_EVE_INSTALLER_VERSION,
  buildInstallerPlan,
  buildPrerequisiteInstructions,
  detectOperatorPlatform,
  loadOperatorManifest,
  prepareAionCoreBackend,
  renderCommandEveInstallReport,
  renderStartEveLauncherScript,
  renderUpdateEveLauncherScript,
  resolveAionCoreBinaryPath,
  resolveCommandEveInstallerPaths,
  runCommandEveInstall,
} from "./command-eve-installer-core.mjs";

const ROOT = process.cwd();

test("operator manifest pins current AionUI, Hermes and MiniMax defaults", () => {
  const manifest = loadOperatorManifest(ROOT).data;
  assert.equal(manifest.release, "1.0.0-alpha.3");
  assert.equal(manifest.components.aionui.tag, "v2.1.10");
  assert.equal(manifest.components.aionui.commit, "83f52aff5c3e79c066798162dbdaa6d4c8ec220f");
  assert.equal(manifest.components.aionui.license, "Apache-2.0");
  assert.equal(manifest.components.aioncore.version, "v0.1.19");
  assert.equal(manifest.components.aioncore.install_mode, "aionui-prepare-script");
  assert.equal(manifest.components.hermes.version, "0.15.2");
  assert.equal(manifest.components.hermes.tag, "v2026.5.29.2");
  assert.equal(manifest.components.hermes.license, "MIT");
  assert.equal(manifest.default_inference.provider, "openrouter");
  assert.equal(manifest.default_inference.model, "minimax/minimax-m3");
  assert.equal(manifest.default_inference.blocked_auth_code, "BLOCKED_AUTH");
  assert.match(manifest.default_inference.official_setup_rule, /official BYOK\/API-key flow/);
});

test("path resolution separates source repo from client install root", () => {
  const paths = resolveCommandEveInstallerPaths({
    companyOsRoot: ROOT,
    clientRoot: "/tmp/company-eve-client",
  });
  assert.equal(paths.companyOsRoot, ROOT);
  assert.equal(paths.clientRoot, "/tmp/company-eve-client");
  assert.equal(paths.operatorRoot, "/tmp/company-eve-client/.company-os/operator-shell");
  assert.equal(paths.aionuiRoot, "/tmp/company-eve-client/.company-os/operator-shell/aionui/AionUi");
  assert.equal(paths.hermesRoot, "/tmp/company-eve-client/.company-os/operator-shell/hermes");
  assert.equal(paths.binRoot, "/tmp/company-eve-client/.company-os/bin");
  assert.equal(paths.startLauncher, "/tmp/company-eve-client/.company-os/bin/start_eve");
  assert.equal(paths.updateLauncher, "/tmp/company-eve-client/.company-os/bin/update_eve");
});

test("aioncore binary path follows AionUI runtime key layout", () => {
  const paths = resolveCommandEveInstallerPaths({
    companyOsRoot: ROOT,
    clientRoot: "/tmp/company-eve-client",
  });
  assert.equal(
    resolveAionCoreBinaryPath({ paths, platform: "darwin", arch: "arm64" }),
    "/tmp/company-eve-client/.company-os/operator-shell/aionui/AionUi/resources/bundled-aioncore/darwin-arm64/aioncore",
  );
});

test("platform detector maps supported mac arm64 target", () => {
  assert.deepEqual(detectOperatorPlatform("darwin", "arm64"), {
    ok: true,
    os: "darwin",
    arch: "arm64",
    node_platform: "darwin",
    node_arch: "arm64",
  });
});

test("platform detector rejects unsupported targets", () => {
  assert.equal(detectOperatorPlatform("sunos", "mips").ok, false);
});

test("installer plan is source-overlay by default and includes staged sidecar work", () => {
  const plan = buildInstallerPlan({
    companyOsRoot: ROOT,
    clientRoot: "/tmp/company-eve-client",
    platform: "darwin",
    arch: "arm64",
  });
  assert.equal(plan.version, COMMAND_EVE_INSTALLER_VERSION);
  assert.equal(plan.release, "1.0.0-alpha.3");
  assert.equal(plan.install_mode, "source-overlay");
  assert.equal(plan.manifest.aionui.tag, "v2.1.10");
  assert.equal(plan.manifest.aioncore.version, "v0.1.19");
  assert.equal(plan.manifest.hermes.version, "0.15.2");
  assert.equal(plan.manifest.inference.model, "minimax/minimax-m3");
  assert.equal(plan.operator_commands.start_eve, "/tmp/company-eve-client/.company-os/bin/start_eve");
  assert.equal(plan.operator_commands.update_eve_check, "/tmp/company-eve-client/.company-os/bin/update_eve check");
  assert.ok(plan.stages.includes("apply_command_eve_overlay"));
  assert.ok(plan.stages.includes("prepare_aioncore_backend"));
  assert.ok(plan.stages.includes("build_aionui_renderer_assets"));
  assert.ok(plan.stages.includes("preflight_eve_sidecar"));
  assert.ok(plan.stages.includes("write_operator_launchers"));
});

test("prerequisite instructions include guided Bun install command without pipe-to-shell", () => {
  const instructions = buildPrerequisiteInstructions({
    missing: ["bun"],
    platform: detectOperatorPlatform("darwin", "arm64"),
  });
  assert.equal(instructions[0].tool, "bun");
  assert.match(instructions[0].purpose, /AionUI source-overlay/);
  assert.ok(instructions[0].commands.some((command) => command.includes("brew install oven-sh/bun/bun")));
  assert.ok(instructions[0].commands.some((command) => command.includes("bun.sh/docs/installation")));
  assert.equal(instructions[0].commands.some((command) => /\|\s*(?:sh|bash)\b/.test(command)), false);
});

test("dry-run install does not emit a start command or write sidecar state", () => {
  const result = runCommandEveInstall({
    companyOsRoot: ROOT,
    clientRoot: "/tmp/company-eve-client",
    dryRun: true,
    platform: "darwin",
    arch: "arm64",
  });
  assert.equal(result.dry_run, true);
  assert.equal(result.release, "1.0.0-alpha.3");
  assert.deepEqual(result.start_command, []);
});

test("generated start_eve launcher supports local auth-check preflight mode", () => {
  const script = renderStartEveLauncherScript({
    sourceRoot: "/tmp/company-os-public",
    clientRoot: "/tmp/company-eve-client",
    operatorRoot: "/tmp/company-eve-client/.company-os/operator-shell",
    aionuiRoot: "/tmp/company-eve-client/.company-os/operator-shell/aionui/AionUi",
    aionuiBin: "/tmp/company-eve-client/.company-os/operator-shell/aionui-sidecar/bin",
    aionuiData: "/tmp/company-eve-client/.company-os/operator-shell/aionui-sidecar/aionui-data",
    aionuiLog: "/tmp/company-eve-client/.company-os/operator-shell/aionui-sidecar/aionui-logs",
    aionCoreBinary: "/tmp/aioncore",
    aionCoreBundledDir: "/tmp/bundled-aioncore",
    hermesHome: "/tmp/company-eve-client/.company-os/operator-shell/hermes/home",
    eveRuntimePolicy: "/tmp/company-eve-client/.company-os/operator-shell/aion-companyos-context/EVE_RUNTIME_POLICY.json",
    port: 25809,
  });

  assert.match(script, /MODE="\$\{1:-start\}"/);
  assert.match(script, /--auth-check/);
  assert.match(script, /start_eve\.mjs" check --company-os-root "\$SOURCE_ROOT" --client-root "\$CLIENT_ROOT" --operator-root "\$OPERATOR_ROOT" --auth-check/);
  assert.doesNotMatch(script, /--private-root "\$OPERATOR_ROOT"/);
  assert.match(script, /exec bun run webui --no-build --port "\$PORT"/);
});

test("generated update_eve launcher supports exported mirrors without git metadata", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "command-eve-update-launcher-"));
  const sourceRoot = path.join(root, "public-mirror");
  const clientRoot = path.join(root, "client");
  const updateScriptPath = path.join(sourceRoot, "scripts", "update", "company-os-update.mjs");
  const launcherPath = path.join(root, "update_eve");
  fs.mkdirSync(path.dirname(updateScriptPath), { recursive: true });
  fs.mkdirSync(clientRoot, { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, "VERSION"), "1.0.0-alpha.3\n");
  fs.writeFileSync(
    updateScriptPath,
    [
      "#!/usr/bin/env node",
      "import fs from 'node:fs';",
      "import path from 'node:path';",
      "const sourceIndex = process.argv.indexOf('--source');",
      "const sourceRoot = sourceIndex === -1 ? process.cwd() : process.argv[sourceIndex + 1];",
      "fs.writeFileSync(path.join(sourceRoot, 'update-called.json'), JSON.stringify(process.argv.slice(2)));",
      "process.stdout.write(JSON.stringify({ ok: true, status: 'mock-pass' }) + '\\n');",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    launcherPath,
    renderUpdateEveLauncherScript({ sourceRoot, clientRoot }),
    { mode: 0o755 },
  );

  const result = spawnSync("bash", [launcherPath, "check"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stderr, /skipping source pull/);
  assert.ok(fs.existsSync(path.join(sourceRoot, "update-called.json")));
});

test("AionCore fallback prepares from a local release archive before upstream prepare", (t) => {
  if (process.platform === "win32") {
    t.skip("local tar fixture is only needed for non-Windows fallback coverage");
    return;
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "command-eve-aioncore-fallback-"));
  const sourceRoot = path.join(root, "source");
  const clientRoot = path.join(root, "client");
  const paths = resolveCommandEveInstallerPaths({
    companyOsRoot: sourceRoot,
    clientRoot,
  });
  fs.mkdirSync(path.join(paths.aionuiRoot, "scripts"), { recursive: true });
  fs.writeFileSync(
    path.join(paths.aionuiRoot, "package.json"),
    JSON.stringify({ version: "2.1.10", aioncoreVersion: "v0.1.19" }, null, 2),
  );
  fs.writeFileSync(
    path.join(paths.aionuiRoot, "scripts", "prepareAioncore.js"),
    "console.error('simulated wget timeout'); process.exit(1);\n",
  );

  const archiveSource = path.join(root, "archive-source", "nested");
  const binaryName = "aioncore";
  fs.mkdirSync(archiveSource, { recursive: true });
  fs.writeFileSync(path.join(archiveSource, binaryName), "#!/usr/bin/env bash\necho aioncore\n", { mode: 0o755 });
  const archive = path.join(root, "aioncore.tar.gz");
  const tar = spawnSync("tar", ["-czf", archive, "-C", path.join(root, "archive-source"), "."], { encoding: "utf8" });
  assert.equal(tar.status, 0, tar.stderr || tar.stdout);

  const result = prepareAionCoreBackend({
    paths,
    manifest: {
      data: {
        components: {
          aioncore: {
            repo: "https://github.com/iOfficeAI/AionCore",
            version: "v0.1.19",
          },
        },
      },
    },
    aionCoreArchivePath: archive,
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "prepared-fallback");
  assert.equal(result.result.status, "skipped");
  assert.equal(result.fallback.prepared_manifest.data.sourceType, "command-eve-local-archive");
  assert.ok(fs.existsSync(resolveAionCoreBinaryPath({ paths })));
});

test("install report renders source, client and component evidence", () => {
  const plan = buildInstallerPlan({
    companyOsRoot: ROOT,
    clientRoot: "/tmp/company-eve-client",
    platform: "darwin",
    arch: "arm64",
  });
  const report = renderCommandEveInstallReport({
    ...plan,
    start_command: ["cd /tmp/company-eve-client/.company-os/operator-shell/aionui/AionUi"],
  });
  assert.match(report, /Command EVE Operator Shell Install - 1\.0\.0-alpha\.3/);
  assert.match(report, /AionUI: v2\.1\.10/);
  assert.match(report, /AionCore: v0\.1\.19/);
  assert.match(report, /Hermes Agent: 0\.15\.2/);
  assert.match(report, /Client root: \/tmp\/company-eve-client/);
  assert.match(report, /Operator Commands/);
  assert.match(report, /Start EVE/);
  assert.match(report, /no raw API keys in chat/);
});

test("custom provider and model override MiniMax defaults without changing manifest", () => {
  const plan = buildInstallerPlan({
    companyOsRoot: ROOT,
    clientRoot: path.join("/tmp", "company-eve-client"),
    provider: "minimax",
    model: "minimax-m3",
    platform: "darwin",
    arch: "arm64",
  });
  assert.equal(plan.manifest.inference.provider, "minimax");
  assert.equal(plan.manifest.inference.model, "minimax-m3");
});
