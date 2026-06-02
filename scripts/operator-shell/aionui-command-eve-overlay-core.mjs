import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const AIONUI_COMMAND_EVE_OVERLAY_VERSION = "aionui-command-eve-overlay/v0";
export const EVE_EXTENSION_MANIFEST_VERSION = "eve-extension-manifest/v0";
export const EVE_CAPABILITY_CARDS_VERSION = "eve-capability-cards/v0";

export const AIONUI_COMMAND_EVE_PATCH =
  "assets/brand/eve-command/aionui-overlay/patches/command-eve-aionui.patch";

export const EVE_CONNECTOR_MANIFEST_SOURCE =
  "kits/company-os-kit/.company-os/eve/connector-manifests.json";

export const EVE_SKILL_REGISTRY = [
  {
    id: "command-eve-first-run",
    name: "Command EVE First-Run Setup",
    description: "EVE inspects install state, inventories known systems and guides the next smallest setup step.",
    tier: "core",
    source_doc: "docs/operations/command-eve-first-run-skill-pack.md",
    required: true,
    human_gate: "HG-1",
    next_action: "Inspect the onboarding boot packet and choose the next setup step.",
    allowed_actions: [
      "read install state",
      "inspect onboarding boot packet",
      "classify connector states",
      "draft Founder Intent Packet",
      "draft CEO Delegation Packet",
    ],
    blocked_actions: [
      "dispatch workers",
      "collect passwords or tokens in chat",
      "mark Plane Done",
      "write production systems",
    ],
  },
  {
    id: "blog-department",
    name: "Blog Department",
    description: "Turns founder content intent into a bounded blog draft, claim-safety and editorial review pipeline.",
    tier: "department",
    source_doc: "docs/integrations/aionui-hermes-blog-department-skill.md",
    required: false,
    human_gate: "HG-2.5",
    next_action: "Draft a blog article brief and run claim safety locally.",
    allowed_actions: [
      "read founder content intent",
      "draft blog article outline",
      "draft local Markdown article",
      "apply claim safety check",
      "produce editorial review packet",
    ],
    blocked_actions: [
      "publish to CMS without HG-2.5 release card",
      "schedule or send newsletter without HumanGate",
      "collect API keys or OAuth tokens in chat",
      "mark Plane Done",
    ],
  },
  {
    id: "video-first-content-engine",
    name: "Video-First Content Engine",
    description: "Turns raw video drops into YouTube packages, clips, social posts, articles and risk-gated review packets.",
    tier: "department",
    source_doc: "docs/integrations/aionui-hermes-video-first-content-engine-skill.md",
    required: false,
    human_gate: "HG-2.5",
    next_action: "Initialize the video drop-folder and create the first dry-run package plan.",
    allowed_actions: [
      "create local drop-folder structure",
      "inspect raw video metadata",
      "draft publish package plan",
      "draft worker contracts with dispatch: manual",
      "produce risk and claim safety report",
    ],
    blocked_actions: [
      "upload video without HG-2.5 release card",
      "publish or schedule social posts without HumanGate",
      "process regulated footage into public outputs without HG-3",
      "mark Plane Done",
    ],
  },
  {
    id: "department-capability-pack-creator",
    name: "Department Capability Pack Creator",
    description: "Turns a requested capability into SOP, domain pack, AionUI skill seed, worker contracts and evaluator proof.",
    tier: "department",
    source_doc: "docs/integrations/aionui-hermes-department-pack-creator-skill.md",
    required: false,
    human_gate: "HG-2.5",
    next_action: "Describe the department or capability you want to create.",
    allowed_actions: [
      "intake capability request from Founder",
      "draft Department Intent Packet",
      "draft CEO Delegation Packet",
      "run pack scaffold dry-run",
      "produce draft parent and child worker contracts",
    ],
    blocked_actions: [
      "set dispatch: ready during scaffold",
      "install arbitrary code or skill packages",
      "expand connector scope without controller review",
      "mark Plane Done",
    ],
  },
];

export const AIONUI_COMMAND_EVE_ASSETS = [
  {
    source: "assets/brand/eve-command/aionui-overlay/public/command-eve-logo.svg",
    target: "public/command-eve-logo.svg",
  },
  {
    source: "assets/brand/eve-command/aionui-overlay/public/eve-intent-wait.mp4",
    target: "public/eve-intent-wait.mp4",
  },
  {
    source: "assets/brand/eve-command/aionui-overlay/public/eve-intent-wait-anchor.png",
    target: "public/eve-intent-wait-anchor.png",
  },
  {
    source: "assets/brand/eve-command/aionui-overlay/public/eve-wait-focus.mp4",
    target: "public/eve-wait-focus.mp4",
  },
  {
    source: "assets/brand/eve-command/aionui-overlay/public/eve-wait-focus-anchor.png",
    target: "public/eve-wait-focus-anchor.png",
  },
  {
    source: "assets/brand/eve-command/aionui-overlay/public/eve-wait-companion.mp4",
    target: "public/eve-wait-companion.mp4",
  },
  {
    source: "assets/brand/eve-command/aionui-overlay/public/eve-wait-companion-anchor.png",
    target: "public/eve-wait-companion-anchor.png",
  },
  {
    source: "assets/brand/eve-command/aionui-overlay/public/eve-wait-review.mp4",
    target: "public/eve-wait-review.mp4",
  },
  {
    source: "assets/brand/eve-command/aionui-overlay/public/eve-wait-review-anchor.png",
    target: "public/eve-wait-review-anchor.png",
  },
  {
    source: "assets/brand/eve-command/aionui-overlay/public/eve-wait-call.mp4",
    target: "public/eve-wait-call.mp4",
  },
  {
    source: "assets/brand/eve-command/aionui-overlay/public/eve-wait-call-anchor.png",
    target: "public/eve-wait-call-anchor.png",
  },
];

function exists(filePath) {
  return Boolean(filePath) && fs.existsSync(filePath);
}

function readTextIfExists(filePath) {
  return exists(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function sameFile(source, target) {
  if (!exists(source) || !exists(target)) return false;
  return fs.readFileSync(source).equals(fs.readFileSync(target));
}

function runGit(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

export function readCompanyOsVersion(companyOsRoot) {
  const versionFile = path.join(companyOsRoot, "VERSION");
  if (exists(versionFile)) return fs.readFileSync(versionFile, "utf8").trim();
  return "unknown";
}

export function readConnectorManifestFromSource(paths) {
  const sourceFile = path.join(paths.companyOsRoot, EVE_CONNECTOR_MANIFEST_SOURCE);
  if (!exists(sourceFile)) {
    return {
      ok: false,
      status: "missing",
      path: sourceFile,
      errors: [`Connector manifest not found: ${sourceFile}`],
      data: { version: "", connectors: [] },
    };
  }
  try {
    const data = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
    const errors = [];
    if (!Array.isArray(data.connectors) || data.connectors.length === 0) {
      errors.push("connectors must be a non-empty array");
    }
    return {
      ok: errors.length === 0,
      status: errors.length ? "invalid" : "found",
      path: sourceFile,
      errors,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: "invalid_json",
      path: sourceFile,
      errors: [error.message],
      data: { version: "", connectors: [] },
    };
  }
}

function deriveConnectorState(connector) {
  const { tier, setup_mode } = connector;
  if (tier === "gated" || tier === "optional_gated") return "gated";
  if (tier === "optional") return "available";
  if (setup_mode === "bootstrap") return "installed";
  return "needs_auth";
}

function deriveConnectorBlockedReason(connector, manifestState) {
  if (manifestState === "gated") {
    return `Requires ${connector.human_gate} before setup may begin.`;
  }
  if (manifestState === "blocked") {
    return "Explicitly blocked by capability profile or HumanGate owner decision.";
  }
  return null;
}

export function readPreflightEvidence(connectorId, preflightResultsDir) {
  if (!preflightResultsDir) return null;
  const latestFile = path.join(preflightResultsDir, `${connectorId}-latest.json`);
  if (exists(latestFile)) {
    try {
      return JSON.parse(fs.readFileSync(latestFile, "utf8"));
    } catch {
      return null;
    }
  }
  if (!exists(preflightResultsDir)) return null;
  let files;
  try {
    files = fs.readdirSync(preflightResultsDir)
      .filter((f) => f.startsWith(`${connectorId}-`) && f.endsWith(".json") && /\d{4}-\d{2}-\d{2}/.test(f))
      .sort()
      .reverse();
  } catch {
    return null;
  }
  if (files.length === 0) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(preflightResultsDir, files[0]), "utf8"));
  } catch {
    return null;
  }
}

export function buildEveExtensionManifest({
  companyOsVersion = "unknown",
  generatedAt = new Date().toISOString(),
} = {}) {
  return {
    version: EVE_EXTENSION_MANIFEST_VERSION,
    company_os_version: companyOsVersion,
    generated_at: generatedAt,
    generated_by: "aionui-command-eve-overlay.mjs",
    bundle_root: "${COMPANY_OS_PRIVATE_ROOT}/aion-companyos-context",
    skills: EVE_SKILL_REGISTRY.map((skill) => ({
      id: skill.id,
      skill_file: `aionui-skills/${skill.id}/SKILL.md`,
      required: skill.required,
    })),
    capability_cards: "EVE_CAPABILITY_CARDS.json",
    connector_manifests: "EVE_CONNECTOR_MANIFESTS.json",
    security: {
      credential_store: "never",
      write_capable_connectors: "human_gate_required_before_activation",
      silent_enable: "blocked",
      secret_rule: "Never ask for passwords, cookies, recovery codes, payment details, raw tokens or .env contents in chat.",
      state_authority: "local-preflight-result-files-only",
    },
    load_order: [
      "EVE_EXTENSION_MANIFEST.json",
      "EVE_CAPABILITY_CARDS.json",
      "EVE_CONNECTOR_MANIFESTS.json",
      ...EVE_SKILL_REGISTRY.map((skill) => `aionui-skills/${skill.id}/SKILL.md`),
    ],
  };
}

export function buildEveCapabilityCards({
  connectorManifest = { data: { connectors: [] } },
  companyOsVersion = "unknown",
  generatedAt = new Date().toISOString(),
  preflightResultsDir = null,
} = {}) {
  const connectors = connectorManifest.data.connectors || [];
  const connectorCards = connectors.map((connector) => {
    const manifestState = deriveConnectorState(connector);
    const blockedReason = deriveConnectorBlockedReason(connector, manifestState);
    let state = manifestState;
    let stateSource = "manifest";
    if (preflightResultsDir && manifestState !== "gated" && manifestState !== "blocked") {
      const evidence = readPreflightEvidence(connector.id, preflightResultsDir);
      if (evidence && evidence.ok === true) {
        state = "connected";
        stateSource = "preflight-evidence";
      }
    }
    return {
      id: connector.id,
      type: "connector",
      name: connector.name,
      description: connector.purpose,
      tier: connector.tier,
      state,
      manifest_state: manifestState,
      state_source: stateSource,
      human_gate: connector.human_gate,
      source_doc: null,
      skill_file: null,
      preflight_command: connector.verify_command || null,
      preflight_result_file: connector.preflight_result_file || null,
      allowed_actions: connector.allowed_actions || [],
      blocked_actions: connector.blocked_actions || [],
      next_action: state === "installed" || state === "connected" ? null
        : `Configure ${connector.name} using the guided setup.`,
      blocked_reason: blockedReason,
    };
  });
  const skillCards = EVE_SKILL_REGISTRY.map((skill) => ({
    id: skill.id,
    type: "skill",
    name: skill.name,
    description: skill.description,
    tier: skill.tier,
    state: "installed",
    human_gate: skill.human_gate,
    source_doc: `\${COMPANY_OS_ROOT}/${skill.source_doc}`,
    skill_file: `aionui-skills/${skill.id}/SKILL.md`,
    preflight_command: null,
    allowed_actions: skill.allowed_actions,
    blocked_actions: skill.blocked_actions,
    next_action: skill.next_action,
    blocked_reason: null,
  }));
  return {
    version: EVE_CAPABILITY_CARDS_VERSION,
    company_os_version: companyOsVersion,
    generated_at: generatedAt,
    generated_by: "aionui-command-eve-overlay.mjs",
    cards: [...skillCards, ...connectorCards],
  };
}

export function resolveAionuiCommandEveOverlayPaths(options = {}, env = process.env) {
  const home = env.HOME || process.env.HOME || "";
  const companyOsRoot = path.resolve(options.companyOsRoot || env.COMPANY_OS_ROOT || process.cwd());
  const privateRoot = path.resolve(
    options.privateRoot || env.COMPANY_OS_PRIVATE_ROOT || path.join(home, "Developer", "company-os-private-ops"),
  );
  const aionuiRoot = path.resolve(
    options.aionuiRoot || env.AIONUI_SIDECAR_ROOT || path.join(privateRoot, "aionui-sidecar", "AionUi"),
  );
  const contextRoot = path.resolve(
    options.contextRoot || env.AIONUI_COMPANYOS_CONTEXT || path.join(privateRoot, "aion-companyos-context"),
  );
  return {
    companyOsRoot,
    privateRoot,
    aionuiRoot,
    contextRoot,
    patch: path.join(companyOsRoot, AIONUI_COMMAND_EVE_PATCH),
    killswitch: path.join(companyOsRoot, "runtime", "killswitch", "[WORK_ITEM_ID].stop"),
    eveExtensionManifest: path.join(contextRoot, "EVE_EXTENSION_MANIFEST.json"),
    eveCapabilityCards: path.join(contextRoot, "EVE_CAPABILITY_CARDS.json"),
    eveConnectorManifests: path.join(contextRoot, "EVE_CONNECTOR_MANIFESTS.json"),
    aionuiConfigPointer: path.join(aionuiRoot, "config", "company-os.json"),
    assets: AIONUI_COMMAND_EVE_ASSETS.map((asset) => ({
      ...asset,
      source_path: path.join(companyOsRoot, asset.source),
      target_path: path.join(aionuiRoot, asset.target),
    })),
  };
}

export function isAionuiCommandEveOverlayApplied(paths) {
  const layout = readTextIfExists(path.join(paths.aionuiRoot, "packages/desktop/src/renderer/components/layout/Layout.tsx"));
  const titlebar = readTextIfExists(path.join(paths.aionuiRoot, "packages/desktop/src/renderer/components/layout/Titlebar/index.tsx"));
  const guid = readTextIfExists(path.join(paths.aionuiRoot, "packages/desktop/src/renderer/pages/guid/GuidPage.tsx"));
  const css = readTextIfExists(path.join(paths.aionuiRoot, "packages/desktop/src/renderer/pages/guid/index.module.css"));
  return (
    layout.includes("command-eve-logo.svg") &&
    layout.includes(">EVE<") &&
    titlebar.includes("useMemo(() => 'EVE'") &&
    guid.includes("COMMAND_EVE_GUID_ENABLED") &&
    guid.includes("eve-intent-wait.mp4") &&
    css.includes("commandEveWaitVideo")
  );
}

export function planAionuiCommandEveAssetCopies(paths, { force = false } = {}) {
  return paths.assets.map((asset) => {
    const sourceExists = exists(asset.source_path);
    const targetExists = exists(asset.target_path);
    const identical = sourceExists && targetExists && sameFile(asset.source_path, asset.target_path);
    const shouldCopy = sourceExists && (!targetExists || force || !identical);
    const blocked = sourceExists && targetExists && !identical && !force;
    return {
      source: asset.source,
      target: asset.target,
      source_exists: sourceExists,
      target_exists: targetExists,
      identical,
      should_copy: shouldCopy && !blocked,
      blocked,
    };
  });
}

function planContextBundleWrites(paths, connectorManifest) {
  const writes = [
    { path: paths.eveExtensionManifest, kind: "eve-extension-manifest" },
    { path: paths.eveCapabilityCards, kind: "eve-capability-cards" },
    { path: paths.eveConnectorManifests, kind: "eve-connector-manifests" },
  ];
  for (const skill of EVE_SKILL_REGISTRY) {
    writes.push({
      path: path.join(paths.contextRoot, "aionui-skills", skill.id, "SKILL.md"),
      kind: "skill",
      skill_id: skill.id,
    });
  }
  return writes;
}

export function inspectAionuiCommandEveOverlay(options = {}) {
  const paths = resolveAionuiCommandEveOverlayPaths(options);
  const patchExists = exists(paths.patch);
  const aionuiRootExists = exists(paths.aionuiRoot);
  const packageExists = exists(path.join(paths.aionuiRoot, "package.json"));
  const overlayApplied = aionuiRootExists && isAionuiCommandEveOverlayApplied(paths);
  const assets = planAionuiCommandEveAssetCopies(paths, { force: options.force });
  const missingAssets = assets.filter((asset) => !asset.source_exists).map((asset) => asset.source);
  const assetBlocks = assets.filter((asset) => asset.blocked).map((asset) => asset.target);
  const patchCheck = patchExists && aionuiRootExists && !overlayApplied
    ? runGit(["apply", "--check", "--unidiff-zero", paths.patch], paths.aionuiRoot)
    : {
      ok: true,
      status: 0,
      stdout: "",
      stderr: overlayApplied ? "overlay_already_applied" : "",
    };
  const failures = [
    !patchExists ? "overlay_patch_missing" : "",
    !aionuiRootExists ? "aionui_root_missing" : "",
    !packageExists ? "aionui_package_missing" : "",
    missingAssets.length ? "overlay_assets_missing" : "",
    assetBlocks.length ? "overlay_target_asset_conflict" : "",
    !patchCheck.ok ? "overlay_patch_not_applicable" : "",
  ].filter(Boolean);

  return {
    ok: failures.length === 0,
    version: AIONUI_COMMAND_EVE_OVERLAY_VERSION,
    status: failures.length ? "blocked" : overlayApplied ? "already-applied" : "ready",
    paths,
    overlay_applied: overlayApplied,
    assets,
    missing_assets: missingAssets,
    asset_conflicts: assetBlocks,
    patch_check: patchCheck,
    failures,
  };
}

export function applyAionuiCommandEveOverlay(options = {}) {
  const paths = resolveAionuiCommandEveOverlayPaths(options);

  if (exists(paths.killswitch)) {
    return {
      ok: false,
      version: AIONUI_COMMAND_EVE_OVERLAY_VERSION,
      status: "FAIL",
      reason: "killswitch_active",
      killswitch_path: paths.killswitch,
    };
  }

  if (!exists(paths.companyOsRoot)) {
    return {
      ok: false,
      version: AIONUI_COMMAND_EVE_OVERLAY_VERSION,
      status: "error",
      errors: [`Company.OS root not found: ${paths.companyOsRoot}`],
    };
  }

  const companyOsVersion = readCompanyOsVersion(paths.companyOsRoot);
  const connectorManifest = readConnectorManifestFromSource(paths);
  if (!connectorManifest.ok) {
    return {
      ok: false,
      version: AIONUI_COMMAND_EVE_OVERLAY_VERSION,
      status: "error",
      errors: [`Connector manifest: ${connectorManifest.errors.join("; ")}`],
      paths,
    };
  }

  const bundlePlanned = planContextBundleWrites(paths, connectorManifest);

  const aionuiPresent = exists(paths.aionuiRoot) && exists(path.join(paths.aionuiRoot, "package.json"));
  const patchExists = exists(paths.patch);
  const assets = planAionuiCommandEveAssetCopies(paths, { force: options.force });
  const overlayApplied = aionuiPresent && isAionuiCommandEveOverlayApplied(paths);

  const required_external = [];
  if (!aionuiPresent) {
    required_external.push({
      component: "aionui_root",
      path: paths.aionuiRoot,
      reason: "AionUI source tree required for overlay patch and asset copy.",
      install_hint: "Clone the AionUI repository and pass --aionui-root to this command.",
    });
  }

  const warnings = [];
  for (const skill of EVE_SKILL_REGISTRY) {
    const sourceDoc = path.join(paths.companyOsRoot, skill.source_doc);
    if (!exists(sourceDoc)) warnings.push(`skill_source_missing:${skill.id}`);
  }

  const would_write = bundlePlanned.map((b) => b.path);
  if (aionuiPresent) {
    const aionuiConfigDir = path.join(paths.aionuiRoot, "config");
    would_write.push(...assets.filter((a) => a.should_copy).map((a) => a.target_path));
    if (!overlayApplied) would_write.push("(aionui-source-patch)");
    if (exists(aionuiConfigDir)) would_write.push(paths.aionuiConfigPointer);
  }

  if (options.dryRun) {
    return {
      ok: true,
      version: AIONUI_COMMAND_EVE_OVERLAY_VERSION,
      status: "dry-run",
      dry_run: true,
      company_os_version: companyOsVersion,
      would_write,
      would_overwrite: bundlePlanned.filter((b) => exists(b.path)).map((b) => b.path),
      required_external,
      warnings,
      blockers: [],
      context_bundle: {
        bundle_root: paths.contextRoot,
        planned_files: bundlePlanned.length,
        skill_count: EVE_SKILL_REGISTRY.length,
        connector_count: connectorManifest.data.connectors.length,
      },
      aionui: {
        present: aionuiPresent,
        patch_exists: patchExists,
        overlay_applied: overlayApplied,
      },
      paths,
    };
  }

  const generatedAt = new Date().toISOString();
  const files_written = [];

  fs.mkdirSync(paths.contextRoot, { recursive: true });

  const manifest = buildEveExtensionManifest({ companyOsVersion, generatedAt });
  fs.writeFileSync(paths.eveExtensionManifest, `${JSON.stringify(manifest, null, 2)}\n`);
  files_written.push(paths.eveExtensionManifest);

  const cards = buildEveCapabilityCards({ connectorManifest, companyOsVersion, generatedAt, preflightResultsDir: options.preflightResultsDir || null });
  fs.writeFileSync(paths.eveCapabilityCards, `${JSON.stringify(cards, null, 2)}\n`);
  files_written.push(paths.eveCapabilityCards);

  fs.writeFileSync(paths.eveConnectorManifests, `${JSON.stringify(connectorManifest.data, null, 2)}\n`);
  files_written.push(paths.eveConnectorManifests);

  for (const skill of EVE_SKILL_REGISTRY) {
    const skillDir = path.join(paths.contextRoot, "aionui-skills", skill.id);
    fs.mkdirSync(skillDir, { recursive: true });
    const skillFile = path.join(skillDir, "SKILL.md");
    const sourceDoc = path.join(paths.companyOsRoot, skill.source_doc);
    const content = exists(sourceDoc)
      ? fs.readFileSync(sourceDoc, "utf8")
      : `# ${skill.id}\n\nSkill source doc not yet available at ${skill.source_doc}.\n`;
    fs.writeFileSync(skillFile, content);
    files_written.push(skillFile);
  }

  if (aionuiPresent) {
    const copied_assets = [];
    for (const asset of paths.assets) {
      const planned = assets.find((row) => row.target === asset.target);
      if (!planned?.should_copy) continue;
      fs.mkdirSync(path.dirname(asset.target_path), { recursive: true });
      fs.copyFileSync(asset.source_path, asset.target_path);
      copied_assets.push(asset.target);
      files_written.push(asset.target_path);
    }

    let patch_apply = { ok: true, status: 0, stdout: "", stderr: overlayApplied ? "overlay_already_applied" : "" };
    if (!overlayApplied) {
      patch_apply = runGit(["apply", "--unidiff-zero", paths.patch], paths.aionuiRoot);
    }

    const aionuiConfigDir = path.join(paths.aionuiRoot, "config");
    let aionui_config_written = false;
    if (exists(aionuiConfigDir)) {
      const configPointer = {
        company_os_extension: {
          manifest_path: paths.eveExtensionManifest,
          skills_root: path.join(paths.contextRoot, "aionui-skills"),
          auto_reload: false,
        },
      };
      fs.writeFileSync(paths.aionuiConfigPointer, `${JSON.stringify(configPointer, null, 2)}\n`);
      files_written.push(paths.aionuiConfigPointer);
      aionui_config_written = true;
    }

    const appliedAfter = isAionuiCommandEveOverlayApplied(paths);
    return {
      ok: patch_apply.ok,
      version: AIONUI_COMMAND_EVE_OVERLAY_VERSION,
      status: patch_apply.ok ? "pass" : "blocked",
      company_os_version: companyOsVersion,
      files_written,
      copied_assets,
      patch_apply,
      overlay_applied_after: appliedAfter,
      aionui_config_written,
      context_bundle: {
        bundle_root: paths.contextRoot,
        skill_count: EVE_SKILL_REGISTRY.length,
        connector_count: connectorManifest.data.connectors.length,
      },
      warnings,
      paths,
    };
  }

  return {
    ok: true,
    version: AIONUI_COMMAND_EVE_OVERLAY_VERSION,
    status: "pass",
    company_os_version: companyOsVersion,
    files_written,
    context_bundle: {
      bundle_root: paths.contextRoot,
      skill_count: EVE_SKILL_REGISTRY.length,
      connector_count: connectorManifest.data.connectors.length,
    },
    required_external,
    warnings,
    paths,
  };
}
