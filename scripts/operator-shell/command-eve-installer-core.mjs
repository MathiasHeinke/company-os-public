import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { applyAionuiCommandEveOverlay } from "./aionui-command-eve-overlay-core.mjs";
import {
  buildAionuiStartCommand,
  prepareEveSidecar,
  preflightEveSidecar,
  resolveEveSidecarPaths,
} from "./eve-sidecar-core.mjs";

export const COMMAND_EVE_INSTALLER_VERSION = "command-eve-installer/v0";
export const COMMAND_EVE_OPERATOR_MANIFEST =
  "registries/operator-shell/command-eve-1.0-alpha.json";

function compact(value) {
  return String(value ?? "").trim();
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function exists(file) {
  return Boolean(file) && fs.existsSync(file);
}

function resolveDate(value) {
  const text = compact(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return new Date().toISOString().slice(0, 10);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readJsonIfExists(file) {
  if (!exists(file)) return null;
  try {
    return readJson(file);
  } catch {
    return null;
  }
}

function runCapture(command, args = [], options = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env || {}) },
    encoding: "utf8",
    timeout: Number(options.timeoutMs || 120_000),
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    command: [command, ...args].join(" "),
    cwd: options.cwd || "",
    status: result.status,
    signal: result.signal,
    stdout: compact(result.stdout),
    stderr: compact(result.stderr),
    error: result.error ? result.error.message : "",
    ok: result.status === 0 && !result.error,
  };
}

function commandExists(command) {
  const result = runCapture("bash", ["-lc", `command -v ${command}`], { timeoutMs: 10_000 });
  return {
    command,
    ok: result.ok,
    path: result.stdout,
    status: result.ok ? "found" : "missing",
  };
}

export function loadOperatorManifest(companyOsRoot = process.cwd()) {
  const manifestPath = path.join(path.resolve(companyOsRoot), COMMAND_EVE_OPERATOR_MANIFEST);
  return {
    path: manifestPath,
    data: readJson(manifestPath),
  };
}

export function resolveCommandEveInstallerPaths(options = {}) {
  const companyOsRoot = path.resolve(options.companyOsRoot || process.cwd());
  const clientRoot = path.resolve(options.clientRoot || companyOsRoot);
  const operatorRoot = path.resolve(
    options.operatorRoot
      || process.env.COMMAND_EVE_OPERATOR_ROOT
      || path.join(clientRoot, ".company-os", "operator-shell"),
  );
  const aionuiRoot = path.resolve(options.aionuiRoot || path.join(operatorRoot, "aionui", "AionUi"));
  const hermesRoot = path.resolve(options.hermesRoot || path.join(operatorRoot, "hermes"));
  const hermesHome = path.resolve(options.hermesHome || path.join(hermesRoot, "home"));
  const hermesWrapper = path.resolve(options.hermesWrapper || path.join(hermesRoot, "hermes-command-eve"));
  const binRoot = path.resolve(options.binRoot || path.join(clientRoot, ".company-os", "bin"));
  const reportRoot = path.resolve(options.reportRoot || path.join(clientRoot, "reports", "operator-shell"));
  return {
    companyOsRoot,
    clientRoot,
    operatorRoot,
    aionuiRoot,
    hermesRoot,
    hermesHome,
    hermesWrapper,
    binRoot,
    startLauncher: path.join(binRoot, "start_eve"),
    updateLauncher: path.join(binRoot, "update_eve"),
    reportRoot,
  };
}

export function detectOperatorPlatform(platform = process.platform, arch = process.arch) {
  const os = platform === "darwin" ? "darwin"
    : platform === "linux" ? "linux"
      : platform === "win32" ? "win"
        : "unsupported";
  const cpu = arch === "arm64" ? "arm64"
    : arch === "x64" ? "x86_64"
      : "unsupported";
  return {
    ok: os !== "unsupported" && cpu !== "unsupported",
    os,
    arch: cpu,
    node_platform: platform,
    node_arch: arch,
  };
}

export function buildPrerequisitePlan({ installMode = "source-overlay" } = {}) {
  const required = ["git", "python3"];
  if (installMode === "source-overlay") required.push("bun");
  return {
    id: "prerequisites",
    required,
    checks: required.map(commandExists),
  };
}

export function buildPrerequisiteInstructions({ missing = [], platform = detectOperatorPlatform() } = {}) {
  const installBun = [
    "Preferred: brew install oven-sh/bun/bun",
    "Alternative: install Bun from https://bun.sh/docs/installation after verifying the official installer for your platform.",
    "export PATH=\"$HOME/.bun/bin:$PATH\"",
    "bun --version",
  ];
  const commandsByTool = {
    git: platform.os === "darwin"
      ? ["xcode-select --install", "git --version"]
      : ["Install Git with your OS package manager.", "git --version"],
    python3: platform.os === "darwin"
      ? ["python3 --version", "If missing: brew install python"]
      : ["python3 --version", "Install Python 3 with your OS package manager."],
    bun: installBun,
  };
  return missing.map((tool) => ({
    tool,
    status: "required",
    purpose: tool === "bun"
      ? "AionUI source-overlay install and local web UI start."
      : tool === "python3"
        ? "Hermes Agent local venv install."
        : "Fetch pinned AionUI source and update public Company.OS source.",
    commands: commandsByTool[tool] || [`Install ${tool} and rerun the plan command.`],
  }));
}

function buildOperatorCommands(paths) {
  return {
    start_eve: paths.startLauncher,
    update_eve_check: `${paths.updateLauncher} check`,
    update_eve_apply: `${paths.updateLauncher} apply`,
  };
}

function getAionCoreBinaryName(platform = process.platform) {
  return platform === "win32" ? "aioncore.exe" : "aioncore";
}

function normalizeReleaseTag(version) {
  const text = compact(version || "latest");
  if (!text || text === "latest") return "";
  return text.startsWith("v") ? text : `v${text}`;
}

function aionCoreAssetName({ platform = process.platform, arch = process.arch, tag }) {
  const archMap = { x64: "x86_64", arm64: "aarch64" };
  const platformMap = {
    darwin: "apple-darwin",
    linux: "unknown-linux-gnu",
    win32: "pc-windows-msvc",
  };
  const normalizedArch = archMap[arch];
  const normalizedPlatform = platformMap[platform];
  if (!normalizedArch || !normalizedPlatform || !tag) return "";
  const ext = platform === "win32" ? ".zip" : ".tar.gz";
  return `aioncore-${tag}-${normalizedArch}-${normalizedPlatform}${ext}`;
}

function findFileRecursive(dir, fileName) {
  if (!exists(dir)) return "";
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === fileName) return fullPath;
    if (entry.isDirectory()) {
      const found = findFileRecursive(fullPath, fileName);
      if (found) return found;
    }
  }
  return "";
}

function extractArchive({ archive, outputDir, platform = process.platform }) {
  ensureDir(outputDir);
  if (platform === "win32" || archive.endsWith(".zip")) {
    return runCapture("unzip", ["-o", archive, "-d", outputDir], { timeoutMs: 300_000 });
  }
  return runCapture("tar", ["-xzf", archive, "-C", outputDir], { timeoutMs: 300_000 });
}

function writeAionCorePreparedManifest({ targetDir, platform, arch, tag, sourceType, source }) {
  fs.writeFileSync(path.join(targetDir, "manifest.json"), JSON.stringify({
    platform,
    arch,
    version: tag,
    generatedAt: new Date().toISOString(),
    sourceType,
    source,
    files: [getAionCoreBinaryName(platform)],
  }, null, 2) + "\n");
}

function downloadAionCoreArchiveWithCurl({ url, archive }) {
  return runCapture("curl", [
    "-L",
    "--fail",
    "--show-error",
    "--retry",
    "5",
    "--retry-delay",
    "3",
    "--retry-all-errors",
    "--connect-timeout",
    "30",
    "-o",
    archive,
    url,
  ], { timeoutMs: 900_000 });
}

function prepareAionCoreFallback({ paths, manifest, platform = process.platform, arch = process.arch, archivePath = "" }) {
  if (platform !== process.platform) {
    return {
      ok: false,
      status: "cross_platform_unsupported",
      error: `Command EVE AionCore fallback runs on current platform ${process.platform}; requested ${platform}.`,
    };
  }
  const aioncore = manifest?.data?.components?.aioncore || {};
  const tag = normalizeReleaseTag(aioncore.version);
  const assetName = aionCoreAssetName({ platform, arch, tag });
  if (!tag || !assetName) {
    return {
      ok: false,
      status: "unsupported_target",
      error: `Unsupported AionCore fallback target: ${platform}-${arch} (${aioncore.version || "unknown"})`,
    };
  }

  const binaryName = getAionCoreBinaryName(platform);
  const targetDir = path.dirname(resolveAionCoreBinaryPath({ paths, platform, arch }));
  const targetBinary = path.join(targetDir, binaryName);
  const repo = compact(aioncore.repo || "https://github.com/iOfficeAI/AionCore").replace(/\.git$/, "");
  const url = `${repo}/releases/download/${tag}/${assetName}`;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "command-eve-aioncore-"));
  const resolvedArchive = compact(archivePath || process.env.COMMAND_EVE_AIONCORE_ARCHIVE)
    || path.join(tempDir, assetName);
  const extractDir = path.join(tempDir, "extract");
  const download = archivePath || process.env.COMMAND_EVE_AIONCORE_ARCHIVE
    ? { ok: true, status: "local-archive", archive: resolvedArchive, command: "local archive" }
    : downloadAionCoreArchiveWithCurl({ url, archive: resolvedArchive });

  if (!download.ok || !exists(resolvedArchive)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    return {
      ok: false,
      status: "download_failed",
      url,
      archive: resolvedArchive,
      download,
      error: "AionCore fallback download failed. Retry or provide COMMAND_EVE_AIONCORE_ARCHIVE with the downloaded release archive.",
    };
  }

  const extract = extractArchive({ archive: resolvedArchive, outputDir: extractDir, platform });
  if (!extract.ok) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    return {
      ok: false,
      status: "extract_failed",
      url,
      archive: resolvedArchive,
      extract,
    };
  }

  const sourceBinary = findFileRecursive(extractDir, binaryName);
  if (!sourceBinary) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    return {
      ok: false,
      status: "binary_missing",
      url,
      archive: resolvedArchive,
      error: `Binary ${binaryName} not found in AionCore archive.`,
    };
  }

  ensureDir(targetDir);
  fs.copyFileSync(sourceBinary, targetBinary);
  if (platform !== "win32") fs.chmodSync(targetBinary, 0o755);
  writeAionCorePreparedManifest({
    targetDir,
    platform,
    arch,
    tag,
    sourceType: archivePath || process.env.COMMAND_EVE_AIONCORE_ARCHIVE
      ? "command-eve-local-archive"
      : "command-eve-fallback-download",
    source: { url, archive: archivePath || process.env.COMMAND_EVE_AIONCORE_ARCHIVE ? resolvedArchive : assetName },
  });
  const preparedManifest = readAionCorePreparedManifest({ paths, platform, arch });
  fs.rmSync(tempDir, { recursive: true, force: true });
  return {
    ok: exists(targetBinary) && Boolean(preparedManifest.data),
    status: exists(targetBinary) && preparedManifest.data ? "prepared" : "error",
    binary: targetBinary,
    prepared_manifest: preparedManifest,
    url,
  };
}

export function resolveAionCoreBinaryPath({ paths, platform = process.platform, arch = process.arch } = {}) {
  const resolvedPaths = paths || resolveCommandEveInstallerPaths();
  return path.join(
    resolvedPaths.aionuiRoot,
    "resources",
    "bundled-aioncore",
    `${platform}-${arch}`,
    getAionCoreBinaryName(platform),
  );
}

export function buildInstallerPlan(options = {}) {
  const paths = resolveCommandEveInstallerPaths(options);
  const manifest = loadOperatorManifest(paths.companyOsRoot);
  const installMode = compact(options.installMode)
    || manifest.data.components.aionui.default_install_mode
    || "source-overlay";
  const platform = detectOperatorPlatform(options.platform, options.arch);
  const prerequisites = buildPrerequisitePlan({ installMode });
  const missing = prerequisites.checks.filter((check) => !check.ok).map((check) => check.command);
  const aionui = manifest.data.components.aionui;
  const aioncore = manifest.data.components.aioncore;
  const hermes = manifest.data.components.hermes;
  const inference = {
    provider: compact(options.provider) || manifest.data.default_inference.provider,
    model: compact(options.model) || manifest.data.default_inference.model,
  };
  return {
    ok: platform.ok && missing.length === 0,
    version: COMMAND_EVE_INSTALLER_VERSION,
    release: manifest.data.release,
    status: platform.ok && missing.length === 0 ? "ready" : "blocked",
    install_mode: installMode,
    platform,
    paths,
    manifest: {
      path: manifest.path,
      aionui: {
        repo: aionui.repo,
        tag: aionui.tag,
        commit: aionui.commit,
        license: aionui.license,
      },
      aioncore: {
        repo: aioncore.repo,
        version: aioncore.version,
        source: aioncore.source,
        install_mode: aioncore.install_mode,
      },
      hermes: {
        package: hermes.package,
        version: hermes.version,
        tag: hermes.tag,
        license: hermes.license,
      },
      inference,
    },
    prerequisites,
    prerequisite_instructions: buildPrerequisiteInstructions({ missing, platform }),
    missing_prerequisites: missing,
    operator_commands: buildOperatorCommands(paths),
    stages: [
      "clone_or_update_aionui_source",
      "install_aionui_dependencies",
      "prepare_aioncore_backend",
      "create_hermes_venv",
      "install_hermes_agent",
      "write_hermes_model_config",
      "apply_command_eve_overlay",
      "build_aionui_renderer_assets",
      "prepare_eve_sidecar",
      "preflight_eve_sidecar",
      "write_operator_launchers",
      "emit_start_command",
    ],
  };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeHermesConfig({ hermesHome, provider, model }) {
  ensureDir(hermesHome);
  const configPath = path.join(hermesHome, "config.yaml");
  const existing = exists(configPath) ? fs.readFileSync(configPath, "utf8") : "";
  if (existing.trim()) {
    return {
      ok: true,
      status: "preserved",
      path: configPath,
      reason: "Existing Hermes config.yaml preserved.",
    };
  }
  fs.writeFileSync(configPath, [
    "model:",
    `  provider: ${provider}`,
    `  default: ${model}`,
    "",
  ].join("\n"));
  return {
    ok: true,
    status: "written",
    path: configPath,
    provider,
    model,
  };
}

function cloneOrUpdateAionUi({ paths, manifest, force = false }) {
  const aionui = manifest.data.components.aionui;
  if (exists(path.join(paths.aionuiRoot, ".git"))) {
    if (!force) {
      const checkout = runCapture("git", ["checkout", aionui.tag], { cwd: paths.aionuiRoot });
      return {
        ok: checkout.ok,
        status: checkout.ok ? "checked-out" : "error",
        result: checkout,
      };
    }
    fs.rmSync(paths.aionuiRoot, { recursive: true, force: true });
  } else if (exists(paths.aionuiRoot) && force) {
    fs.rmSync(paths.aionuiRoot, { recursive: true, force: true });
  } else if (exists(paths.aionuiRoot)) {
    return {
      ok: false,
      status: "collision",
      error: `AionUI root exists and is not a git repo: ${paths.aionuiRoot}`,
    };
  }
  ensureDir(path.dirname(paths.aionuiRoot));
  const clone = runCapture("git", [
    "clone",
    "--depth",
    "1",
    "--branch",
    aionui.tag,
    aionui.repo,
    paths.aionuiRoot,
  ], { timeoutMs: 300_000 });
  return {
    ok: clone.ok,
    status: clone.ok ? "cloned" : "error",
    result: clone,
  };
}

function installAionUiDependencies({ paths }) {
  return runCapture("bun", ["install", "--frozen-lockfile"], {
    cwd: paths.aionuiRoot,
    timeoutMs: 600_000,
  });
}

function readAionUiPackageMetadata({ paths }) {
  const packagePath = path.join(paths.aionuiRoot, "package.json");
  const data = readJsonIfExists(packagePath) || {};
  return {
    path: packagePath,
    version: data.version || "",
    aioncore_version: data.aioncoreVersion || "",
  };
}

function readAionCorePreparedManifest({ paths, platform = process.platform, arch = process.arch }) {
  const manifestPath = path.join(
    paths.aionuiRoot,
    "resources",
    "bundled-aioncore",
    `${platform}-${arch}`,
    "manifest.json",
  );
  return {
    path: manifestPath,
    data: readJsonIfExists(manifestPath),
  };
}

export function prepareAionCoreBackend({
  paths,
  manifest,
  platform = process.platform,
  arch = process.arch,
  aionCoreArchivePath = "",
} = {}) {
  const packageMetadata = readAionUiPackageMetadata({ paths });
  const binary = resolveAionCoreBinaryPath({ paths, platform, arch });
  const preparedManifest = readAionCorePreparedManifest({ paths, platform, arch });
  if (exists(binary) && preparedManifest.data) {
    return {
      ok: true,
      status: "already-prepared",
      binary,
      package_metadata: packageMetadata,
      prepared_manifest: preparedManifest,
    };
  }
  if (platform !== process.platform) {
    return {
      ok: false,
      status: "cross_platform_unsupported",
      binary,
      package_metadata: packageMetadata,
      error: `AionUI prepareAioncore.js runs on current platform ${process.platform}; requested ${platform}.`,
    };
  }
  if (aionCoreArchivePath && manifest) {
    const fallback = prepareAionCoreFallback({
      paths,
      manifest,
      platform,
      arch,
      archivePath: aionCoreArchivePath,
    });
    return fallback.ok
      ? {
          ok: true,
          status: "prepared-fallback",
          binary,
          package_metadata: packageMetadata,
          prepared_manifest: fallback.prepared_manifest,
          result: {
            ok: true,
            status: "skipped",
            stderr: "upstream_prepare_skipped_for_local_archive",
          },
          fallback,
        }
      : {
          ok: false,
          status: "fallback_archive_failed",
          binary,
          package_metadata: packageMetadata,
          fallback,
        };
  }
  const prepareScript = path.join(paths.aionuiRoot, "scripts", "prepareAioncore.js");
  if (!exists(prepareScript)) {
    return {
      ok: false,
      status: "missing_prepare_script",
      binary,
      package_metadata: packageMetadata,
      error: `AionUI prepare script not found: ${prepareScript}`,
    };
  }
  const result = runCapture("node", [prepareScript], {
    cwd: paths.aionuiRoot,
    env: { AIONUI_BACKEND_ARCH: arch },
    timeoutMs: 300_000,
  });
  const afterManifest = readAionCorePreparedManifest({ paths, platform, arch });
  if (!(result.ok && exists(binary)) && manifest) {
    const fallback = prepareAionCoreFallback({
      paths,
      manifest,
      platform,
      arch,
      archivePath: aionCoreArchivePath,
    });
    if (fallback.ok) {
      return {
        ok: true,
        status: "prepared-fallback",
        binary,
        package_metadata: packageMetadata,
        prepared_manifest: fallback.prepared_manifest,
        result,
        fallback,
      };
    }
    return {
      ok: false,
      status: "error",
      binary,
      package_metadata: packageMetadata,
      prepared_manifest: afterManifest,
      result,
      fallback,
    };
  }
  return {
    ok: result.ok && exists(binary),
    status: result.ok && exists(binary) ? "prepared" : "error",
    binary,
    package_metadata: packageMetadata,
    prepared_manifest: afterManifest,
    result,
  };
}

function buildAionUiRendererAssets({ paths }) {
  const rendererIndex = path.join(paths.aionuiRoot, "out", "renderer", "index.html");
  if (exists(rendererIndex)) {
    return {
      ok: true,
      status: "already-built",
      renderer_index: rendererIndex,
    };
  }
  const build = runCapture("bun", ["run", "package"], {
    cwd: paths.aionuiRoot,
    timeoutMs: 900_000,
  });
  return {
    ok: build.ok && exists(rendererIndex),
    status: build.ok && exists(rendererIndex) ? "built" : "error",
    renderer_index: rendererIndex,
    result: build,
  };
}

function installHermes({ paths, manifest }) {
  ensureDir(paths.hermesRoot);
  const venvPython = path.join(paths.hermesRoot, "venv", "bin", "python");
  const venv = exists(venvPython)
    ? { ok: true, status: "exists", command: "python3 -m venv" }
    : runCapture("python3", ["-m", "venv", path.join(paths.hermesRoot, "venv")], {
      timeoutMs: 180_000,
    });
  if (!venv.ok) return { ok: false, status: "venv_failed", venv };
  const pip = runCapture(venvPython, ["-m", "pip", "install", "--upgrade", "pip"], {
    timeoutMs: 180_000,
  });
  if (!pip.ok) return { ok: false, status: "pip_upgrade_failed", venv, pip };
  const spec = `${manifest.data.components.hermes.package}[acp]==${manifest.data.components.hermes.version}`;
  const install = runCapture(venvPython, ["-m", "pip", "install", spec], {
    timeoutMs: 600_000,
  });
  return {
    ok: install.ok,
    status: install.ok ? "installed" : "install_failed",
    package_spec: spec,
    venv,
    pip,
    install,
  };
}

function writeExecutable(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content);
  fs.chmodSync(file, 0o755);
}

export function renderUpdateEveLauncherScript({ sourceRoot, clientRoot }) {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    `SOURCE_ROOT=${shellQuote(sourceRoot)}`,
    `CLIENT_ROOT=${shellQuote(clientRoot)}`,
    "",
    "pull_source_if_git() {",
    '  if git -C "$SOURCE_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then',
    '    git -C "$SOURCE_ROOT" pull --ff-only',
    "  else",
    '    echo "update_eve: source is not a git checkout; skipping source pull." >&2',
    "  fi",
    "}",
    "",
    'MODE="${1:-check}"',
    'case "$MODE" in',
    "  check)",
    "    pull_source_if_git",
    '    node "$SOURCE_ROOT/scripts/update/company-os-update.mjs" check --source "$SOURCE_ROOT" --target "$CLIENT_ROOT" --write-report',
    "    ;;",
    "  apply)",
    "    pull_source_if_git",
    '    TO_VERSION="$(tr -d \'\\n\' < "$SOURCE_ROOT/VERSION")"',
    '    node "$SOURCE_ROOT/scripts/update/company-os-update.mjs" apply --source "$SOURCE_ROOT" --target "$CLIENT_ROOT" --to "$TO_VERSION"',
    '    node "$SOURCE_ROOT/scripts/operator-shell/install-command-eve.mjs" install --company-os-root "$SOURCE_ROOT" --client-root "$CLIENT_ROOT" --force --write-report',
    "    ;;",
    "  *)",
    '    echo "Usage: update_eve [check|apply]"',
    "    exit 2",
    "    ;;",
    "esac",
    "",
  ].join("\n");
}

export function renderStartEveLauncherScript({
  sourceRoot,
  clientRoot,
  operatorRoot,
  aionuiRoot,
  aionuiBin,
  aionuiData,
  aionuiLog,
  aionCoreBinary,
  aionCoreBundledDir,
  hermesHome,
  eveRuntimePolicy,
  port,
}) {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    `SOURCE_ROOT=${shellQuote(sourceRoot)}`,
    `CLIENT_ROOT=${shellQuote(clientRoot)}`,
    `OPERATOR_ROOT=${shellQuote(operatorRoot)}`,
    `PORT="\${COMMAND_EVE_PORT:-${Number(port || 25809)}}"`,
    'MODE="${1:-start}"',
    'if [[ "$MODE" == "--auth-check" ]]; then',
    '  shift || true',
    '  exec node "$SOURCE_ROOT/scripts/operator-shell/start_eve.mjs" check --company-os-root "$SOURCE_ROOT" --client-root "$CLIENT_ROOT" --operator-root "$OPERATOR_ROOT" --auth-check "$@"',
    "fi",
    'if [[ "$MODE" == "check" ]]; then',
    "  shift || true",
    '  exec node "$SOURCE_ROOT/scripts/operator-shell/start_eve.mjs" check --company-os-root "$SOURCE_ROOT" --client-root "$CLIENT_ROOT" --operator-root "$OPERATOR_ROOT" "$@"',
    "fi",
    `cd ${shellQuote(aionuiRoot)}`,
    `export PATH=${shellQuote(aionuiBin)}":$HOME/.bun/bin:$PATH"`,
    `export AIONUI_DATA_DIR=${shellQuote(aionuiData)}`,
    `export AIONUI_LOG_DIR=${shellQuote(aionuiLog)}`,
    `export AIONUI_BACKEND_BIN=${shellQuote(aionCoreBinary)}`,
    `export AIONUI_BACKEND_BUNDLED_DIR=${shellQuote(aionCoreBundledDir)}`,
    `export HERMES_HOME=${shellQuote(hermesHome)}`,
    `export COMMAND_EVE_RUNTIME_POLICY_PATH=${shellQuote(eveRuntimePolicy)}`,
    'export AIONUI_COMMAND_EVE_PROFILE="command-eve-073-proposal-only"',
    'export AIONUI_COMMAND_EVE_DEFAULT_AGENT="hermes"',
    'export AIONUI_COMMAND_EVE_DISABLE_NATIVE_AUTONOMY="1"',
    'export AIONUI_COMMAND_EVE_DISABLE_SCHEDULED_TASKS="1"',
    'export AIONUI_COMMAND_EVE_DISABLE_TEAM_MODE="1"',
    'export AIONUI_COMMAND_EVE_DISABLE_ASSISTANT_SWITCHING="1"',
    'export COMMAND_EVE_PROPOSAL_ONLY="1"',
    'exec bun run webui --no-build --port "$PORT"',
    "",
  ].join("\n");
}

function writeCommandEveLauncherScripts({ paths, port }) {
  const sidecarPaths = resolveEveSidecarPaths({
    companyOsRoot: paths.companyOsRoot,
    clientRoot: paths.clientRoot,
    privateRoot: paths.operatorRoot,
    aionuiRoot: paths.aionuiRoot,
    hermesRoot: paths.hermesRoot,
    hermesHome: paths.hermesHome,
    hermesWrapper: paths.hermesWrapper,
  });
  const aionCoreBinary = resolveAionCoreBinaryPath({ paths });
  const aionCoreBundledDir = path.join(paths.aionuiRoot, "resources", "bundled-aioncore");
  const startScript = renderStartEveLauncherScript({
    sourceRoot: paths.companyOsRoot,
    clientRoot: paths.clientRoot,
    operatorRoot: paths.operatorRoot,
    aionuiRoot: paths.aionuiRoot,
    aionuiBin: sidecarPaths.aionuiBin,
    aionuiData: sidecarPaths.aionuiData,
    aionuiLog: sidecarPaths.aionuiLog,
    aionCoreBinary,
    aionCoreBundledDir,
    hermesHome: paths.hermesHome,
    eveRuntimePolicy: sidecarPaths.eveRuntimePolicy,
    port,
  });
  const updateScript = renderUpdateEveLauncherScript({
    sourceRoot: paths.companyOsRoot,
    clientRoot: paths.clientRoot,
  });
  writeExecutable(paths.startLauncher, startScript);
  writeExecutable(paths.updateLauncher, updateScript);
  return {
    ok: true,
    status: "written",
    bin_root: paths.binRoot,
    start_eve: paths.startLauncher,
    update_eve: paths.updateLauncher,
    aioncore_binary: aionCoreBinary,
  };
}

export function runCommandEveInstall(options = {}) {
  const date = resolveDate(options.date);
  const plan = buildInstallerPlan(options);
  if (options.dryRun) {
    return {
      ...plan,
      ok: plan.status === "ready",
      status: plan.status === "ready" ? "dry-run" : plan.status,
      dry_run: true,
      start_command: [],
    };
  }
  if (!plan.ok) return { ...plan, dry_run: false };

  const paths = plan.paths;
  const manifest = loadOperatorManifest(paths.companyOsRoot);
  const inference = plan.manifest.inference;
  const stages = [];
  ensureDir(paths.operatorRoot);

  const aion = cloneOrUpdateAionUi({ paths, manifest, force: options.force === true });
  stages.push({ id: "aionui.source", ...aion });
  if (!aion.ok) return { ...plan, ok: false, status: "blocked", failed_stage: "aionui.source", stages };

  if (options.skipAionuiDependencies !== true) {
    const deps = installAionUiDependencies({ paths });
    stages.push({ id: "aionui.dependencies", ok: deps.ok, status: deps.ok ? "installed" : "error", result: deps });
    if (!deps.ok) return { ...plan, ok: false, status: "blocked", failed_stage: "aionui.dependencies", stages };
  } else {
    stages.push({ id: "aionui.dependencies", ok: true, status: "skipped" });
  }

  const aioncore = prepareAionCoreBackend({
    paths,
    manifest,
    aionCoreArchivePath: options.aionCoreArchivePath,
  });
  stages.push({ id: "aionui.aioncore", ...aioncore });
  if (!aioncore.ok) return { ...plan, ok: false, status: "blocked", failed_stage: "aionui.aioncore", stages };

  const hermes = installHermes({ paths, manifest });
  stages.push({ id: "hermes.install", ...hermes });
  if (!hermes.ok) return { ...plan, ok: false, status: "blocked", failed_stage: "hermes.install", stages };

  const hermesConfig = writeHermesConfig({
    hermesHome: paths.hermesHome,
    provider: inference.provider,
    model: inference.model,
  });
  stages.push({ id: "hermes.model_config", ...hermesConfig });

  const overlay = applyAionuiCommandEveOverlay({
    companyOsRoot: paths.companyOsRoot,
    privateRoot: paths.operatorRoot,
    aionuiRoot: paths.aionuiRoot,
  });
  stages.push({ id: "aionui.command_eve_overlay", ...overlay });
  if (!overlay.ok) return { ...plan, ok: false, status: "blocked", failed_stage: "aionui.command_eve_overlay", stages };

  if (options.skipAionuiBuild !== true) {
    const build = buildAionUiRendererAssets({ paths });
    stages.push({ id: "aionui.renderer_build", ...build });
    if (!build.ok) return { ...plan, ok: false, status: "blocked", failed_stage: "aionui.renderer_build", stages };
  } else {
    stages.push({ id: "aionui.renderer_build", ok: true, status: "skipped" });
  }

  const sidecarOptions = {
    companyOsRoot: paths.companyOsRoot,
    clientRoot: paths.clientRoot,
    privateRoot: paths.operatorRoot,
    aionuiRoot: paths.aionuiRoot,
    hermesRoot: paths.hermesRoot,
    hermesHome: paths.hermesHome,
    hermesWrapper: paths.hermesWrapper,
    port: options.port || 25809,
    date,
  };
  const prepare = prepareEveSidecar(sidecarOptions);
  stages.push({ id: "eve.prepare", ...prepare });
  if (!prepare.ok) return { ...plan, ok: false, status: "blocked", failed_stage: "eve.prepare", stages };

  const preflight = preflightEveSidecar(sidecarOptions);
  stages.push({ id: "eve.preflight", ...preflight });

  const startCommand = preflight.paths
    ? buildAionuiStartCommand({ paths: preflight.paths, port: options.port || 25809 })
    : [];
  const launchers = writeCommandEveLauncherScripts({ paths, port: options.port || 25809 });
  stages.push({ id: "operator.launchers", ...launchers });
  return {
    ...plan,
    ok: preflight.ok && launchers.ok,
    status: preflight.ok && launchers.ok ? "pass" : "blocked",
    failed_stage: preflight.ok ? (launchers.ok ? "" : "operator.launchers") : "eve.preflight",
    date,
    dry_run: false,
    stages,
    start_command: startCommand,
    operator_commands: buildOperatorCommands(paths),
    next_steps: preflight.ok
      ? [
        `Run: ${paths.startLauncher}`,
        `Open: http://127.0.0.1:${Number(options.port || 25809)}`,
        `For updates run: ${paths.updateLauncher} check, then ${paths.updateLauncher} apply after operator approval.`,
        "When prompted for provider auth, use the provider's official auth/key flow; do not paste raw keys into chat.",
      ]
      : [
        "Fix the failed preflight stage.",
        "Do not start AionUI until eve.preflight passes.",
      ],
  };
}

export function renderCommandEveInstallReport(result) {
  const stageLines = (result.stages || []).map((stage) =>
    `- ${stage.id}: ${stage.status || (stage.ok ? "pass" : "failed")}`,
  );
  return [
    `# Command EVE Operator Shell Install - ${result.release}`,
    "",
    `Status: ${result.status}`,
    `Version: ${COMMAND_EVE_INSTALLER_VERSION}`,
    `Install mode: ${result.install_mode}`,
    "",
    "## Components",
    "",
    `- AionUI: ${result.manifest?.aionui?.tag || ""} (${result.manifest?.aionui?.license || ""})`,
    `- AionCore: ${result.manifest?.aioncore?.version || ""} (${result.manifest?.aioncore?.install_mode || ""})`,
    `- Hermes Agent: ${result.manifest?.hermes?.version || ""} (${result.manifest?.hermes?.license || ""})`,
    `- Inference default: ${result.manifest?.inference?.provider || ""} / ${result.manifest?.inference?.model || ""}`,
    "",
    "## Paths",
    "",
    `- Company.OS source root: ${result.paths?.companyOsRoot || ""}`,
    `- Client root: ${result.paths?.clientRoot || ""}`,
    `- Operator root: ${result.paths?.operatorRoot || ""}`,
    `- AionUI root: ${result.paths?.aionuiRoot || ""}`,
    `- Hermes root: ${result.paths?.hermesRoot || ""}`,
    `- Launcher bin: ${result.paths?.binRoot || ""}`,
    "",
    "## Stages",
    "",
    ...stageLines,
    "",
    "## Start Command",
    "",
    "```bash",
    ...(result.start_command || []),
    "```",
    "",
    "## Operator Commands",
    "",
    `- Start EVE: ${result.operator_commands?.start_eve || ""}`,
    `- Check update: ${result.operator_commands?.update_eve_check || ""}`,
    `- Apply update: ${result.operator_commands?.update_eve_apply || ""}`,
    "",
    "## Boundaries",
    "",
    "- no raw API keys in chat",
    "- no Plane Done",
    "- no worker dispatch before CEO/Codex review",
    "- no publish/send/spend/deploy",
    "",
  ].join("\n");
}

export function writeCommandEveInstallReport({ result, date = new Date().toISOString().slice(0, 10) } = {}) {
  const root = result.paths?.clientRoot || process.cwd();
  const reportDir = path.join(root, "reports", "operator-shell", resolveDate(date));
  const markdown = path.join(reportDir, `command-eve-install-${result.release || "unknown"}.md`);
  const json = path.join(reportDir, `command-eve-install-${result.release || "unknown"}.json`);
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(markdown, `${renderCommandEveInstallReport(result)}\n`);
  fs.writeFileSync(json, `${JSON.stringify(result, null, 2)}\n`);
  return { markdown, json };
}
