import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  AIONUI_COMMAND_EVE_ASSETS,
  AIONUI_COMMAND_EVE_LOCALE_PACK_FILES,
  COMMAND_EVE_BRAND_CONFIG_VERSION,
} from "./aionui-command-eve-overlay-core.mjs";
import {
  DEFAULT_CONTEXT_FILES,
  DEFAULT_EVE_CONNECTOR_MANIFEST_FILE,
  DEFAULT_EVE_RUNTIME_POLICY_FILE,
} from "./eve-sidecar-core.mjs";
import {
  resolveStartEveOptions,
  runStartEve,
  START_EVE_VERSION,
  writeStartEveReport,
} from "./start-eve-core.mjs";
import { DEFAULT_SESSION_CONTINUITY_REGISTRY_PATH } from "../orchestration/session-continuity-router.mjs";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const START_EVE_CLI = path.join(THIS_DIR, "start_eve.mjs");
const AIONUI_CHAT_CONVERSATION_TARGET =
  "packages/desktop/src/renderer/pages/conversation/components/ChatConversation.tsx";
const AIONUI_ACP_SEND_BOX_TARGET =
  "packages/desktop/src/renderer/pages/conversation/platforms/acp/AcpSendBox.tsx";

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
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")} failed: ${result.stderr}`,
  );
  return result;
}

function chatConversationBaseline() {
  return [
    "import StarOfficeMonitorCard from '../platforms/openclaw/StarOfficeMonitorCard.tsx';",
    "",
    "const ChatConversation = () => {",
    "  const conversationAgentName = (conversation?.extra as { agent_name?: string } | undefined)?.agent_name;",
    "  const assistantDisplayName = presetAssistantInfo?.name || conversationAgentName;",
    "  const modelSelector = useMemo(() => {",
    "    if (conversation.type === 'acp') {",
    "      const extra = conversation.extra as { backend?: string; current_model_id?: string };",
    "      return (",
    "        <AcpModelSelector />",
    "      );",
    "    }",
    "  }, [conversation]);",
    "  const chatLayoutProps = {",
    "          agent_name: conversationAgentName,",
    "  };",
    "  return assistantDisplayName;",
    "};",
    "",
  ].join("\n");
}

function chatConversationTransformed() {
  return [
    "import StarOfficeMonitorCard from '../platforms/openclaw/StarOfficeMonitorCard.tsx';",
    "",
    "const COMMAND_EVE_AGENT_BACKEND = 'hermes';",
    "const COMMAND_EVE_DISPLAY_NAME = 'EVE';",
    "",
    "const ChatConversation = () => {",
    "  const conversationAgentName = (conversation?.extra as { agent_name?: string } | undefined)?.agent_name;",
    "  const isCommandEveConversation =",
    "    conversation?.type === 'acp' && conversation.extra?.backend === COMMAND_EVE_AGENT_BACKEND;",
    "  const assistantDisplayName = isCommandEveConversation",
    "    ? COMMAND_EVE_DISPLAY_NAME",
    "    : presetAssistantInfo?.name || conversationAgentName;",
    "  const modelSelector = useMemo(() => {",
    "    if (conversation.type === 'acp') {",
    "      const extra = conversation.extra as { backend?: string; current_model_id?: string };",
    "      if (extra.backend === COMMAND_EVE_AGENT_BACKEND) return undefined;",
    "      return (",
    "        <AcpModelSelector />",
    "      );",
    "    }",
    "  }, [conversation]);",
    "  const chatLayoutProps = {",
    "          agent_name: isCommandEveConversation ? COMMAND_EVE_DISPLAY_NAME : conversationAgentName,",
    "  };",
    "  return assistantDisplayName;",
    "};",
    "",
  ].join("\n");
}

function chatConversationPath(aionuiRoot) {
  return path.join(aionuiRoot, AIONUI_CHAT_CONVERSATION_TARGET);
}

function acpSendBoxPath(aionuiRoot) {
  return path.join(aionuiRoot, AIONUI_ACP_SEND_BOX_TARGET);
}

function guidPageTransformed() {
  return [
    "const COMMAND_EVE_GUID_ENABLED = true;",
    "const COMMAND_EVE_AGENT_BACKEND = 'hermes';",
    "const COMMAND_EVE_DISPLAY_NAME = 'EVE';",
    "const COMMAND_EVE_WAIT_VIDEO_OPTIONS = [{ src: '/eve-intent-wait.mp4', poster: '/eve-intent-wait-anchor.png' }] as const;",
    "",
    "const GuidPage: React.FC = () => {",
    "  const [commandEveWaitVideoIndex, setCommandEveWaitVideoIndex] = useState(() => 0);",
    "  const commandEveWaitVideo = COMMAND_EVE_WAIT_VIDEO_OPTIONS[commandEveWaitVideoIndex];",
    "  const modelSelection = useGuidModelSelection('aionrs');",
    "  const agentSelection = useGuidAgentSelection({",
    "    modelList: modelSelection.modelList,",
    "  });",
    "",
    "  const commandEveAgentKey = useMemo(() => {",
    "    if (!COMMAND_EVE_GUID_ENABLED || !agentSelection.availableAgents) return undefined;",
    "    const hermesAgent = agentSelection.availableAgents.find(",
    "      (agent) =>",
    "        !agent.is_preset &&",
    "        (agent.backend === COMMAND_EVE_AGENT_BACKEND || agent.agent_type === COMMAND_EVE_AGENT_BACKEND)",
    "    );",
    "    return hermesAgent ? agentSelection.getAgentKey(hermesAgent) : undefined;",
    "  }, [agentSelection.availableAgents, agentSelection.getAgentKey]);",
    "",
    "  useEffect(() => {",
    "    if (!COMMAND_EVE_GUID_ENABLED || !commandEveAgentKey) return;",
    "    if (agentSelection.selectedAgentKey === commandEveAgentKey) return;",
    "    agentSelection.setSelectedAgentKey(commandEveAgentKey);",
    "  }, [agentSelection, commandEveAgentKey]);",
    "",
    "  const guidInput = useGuidInput({});",
    "  const modelSelectorNode = <GuidModelSelector />;",
    "  const commandEvePrompt = t('guid.commandEve.prompt');",
    "",
    "  // Build the action row",
    "  const actionRowNode = <GuidActionRow modelSelectorNode={COMMAND_EVE_GUID_ENABLED ? null : modelSelectorNode} />;",
    "  return <p>{commandEvePrompt}{commandEveWaitVideo.src}</p>;",
    "};",
    "",
  ].join("\n");
}

function acpSendBoxBaseline() {
  return [
    "const EMPTY_UPLOAD_FILES: string[] = [];",
    "",
    "const AcpSendBox = ({ backend, agent_name, messageState }) => {",
    "  const {",
    "    running,",
    "    aiProcessing,",
    "  } = messageState;",
    "  const payload = {",
    "          backend: agent_name || backend,",
    "  };",
    "  return payload;",
    "};",
    "",
  ].join("\n");
}

function acpSendBoxTransformed() {
  return [
    "const EMPTY_UPLOAD_FILES: string[] = [];",
    "const COMMAND_EVE_AGENT_BACKEND = 'hermes';",
    "const COMMAND_EVE_DISPLAY_NAME = 'EVE';",
    "",
    "const AcpSendBox = ({ backend, agent_name, messageState }) => {",
    "  const {",
    "    running,",
    "    aiProcessing,",
    "  } = messageState;",
    "  const displayBackendName = backend === COMMAND_EVE_AGENT_BACKEND ? COMMAND_EVE_DISPLAY_NAME : agent_name || backend;",
    "  const payload = {",
    "          backend: displayBackendName,",
    "  };",
    "  return payload;",
    "};",
    "",
  ].join("\n");
}

function writeAionuiOverlayMarkers(aionuiRoot) {
  writeFile(
    path.join(
      aionuiRoot,
      "packages/desktop/src/renderer/components/layout/Layout.tsx",
    ),
    "src='/command-eve-logo.svg?v=command-eve-20260526'\n<div>EVE</div>\n",
  );
  writeFile(
    path.join(
      aionuiRoot,
      "packages/desktop/src/renderer/components/layout/Titlebar/index.tsx",
    ),
    "const appTitle = useMemo(() => 'EVE', []);\n",
  );
  writeFile(
    path.join(aionuiRoot, "packages/desktop/src/renderer/index.html"),
    '<meta name="theme-color" content="#2563eb" />\n<link rel="icon" type="image/svg+xml" href="/command-eve-logo.svg?v=command-eve-favicon-20260604" />\n',
  );
  writeFile(
    chatConversationPath(aionuiRoot),
    chatConversationTransformed(),
  );
  writeFile(
    path.join(
      aionuiRoot,
      "packages/desktop/src/renderer/pages/guid/GuidPage.tsx",
    ),
    guidPageTransformed(),
  );
  writeFile(acpSendBoxPath(aionuiRoot), acpSendBoxTransformed());
  writeFile(
    path.join(
      aionuiRoot,
      "packages/desktop/src/renderer/pages/guid/index.module.css",
    ),
    ".commandEveWaitVideo { width: 1px; }\n",
  );
  writeFile(
    path.join(
      aionuiRoot,
      "packages/desktop/src/renderer/pages/login/index.tsx",
    ),
    "const COMMAND_EVE_LOGIN_VIDEO = '/eve-wait-focus.mp4';\nconst COMMAND_EVE_LOGIN_ANIMATION = '/eve-wait-focus-loop.gif';\nconst x = '/command-eve-brand.json';\nconst COMMAND_EVE_HERO_FIELD_GAP = 32;\nconst commandEveLoginVideoRef = useRef(null);\nconst [commandEveVideoPlaying] = useState(false);\nconst CommandEveHeroField = () => drawCommandEveHeroField();\n<canvas className='login-page__hero-field-canvas' />;\n<div className='login-page__card-glow' />;\n<button className='login-page__lang-option' />;\n<span className='login-page__title-command'>⌘</span>;\n<p className='login-page__version'>v1.x</p>;\nvideo.defaultMuted = true;\n<video preload='auto' />;\n",
  );
  writeFile(
    path.join(
      aionuiRoot,
      "packages/desktop/src/renderer/pages/login/LoginPage.css",
    ),
    ".login-page { background: #fbfcfe; }\n.login-page__submit { background: #2563eb; }\n.login-page__hero-field-canvas { opacity: 1; }\n.login-page__hero-field-fade { opacity: 1; }\n.login-page__card-glow { opacity: 1; }\n.login-page__brand-animation { opacity: 1; }\n.login-page__brand-video--playing { opacity: 1; }\n.login-page__lang-option--active { background: #0f172a; }\n.login-page__title-command { color: #f97316; }\n.login-page__version { color: #64748b; }\n",
  );
  writeFile(
    path.join(
      aionuiRoot,
      "packages/desktop/src/renderer/services/i18n/locales/en-US/login.json",
    ),
    JSON.stringify({
      footerPrimary: "Command EVE Operator Shell",
      footerSecondary: "Company.OS with Human-Gates",
    }),
  );
  writeFile(
    path.join(
      aionuiRoot,
      "packages/desktop/src/common/config/i18n-config.json",
    ),
    JSON.stringify({
      fallbackLanguage: "de-DE",
      supportedLanguages: ["de-DE", "en-US"],
    }),
  );
}

function writeAionuiBaselineFiles(aionuiRoot) {
  writeFile(
    path.join(
      aionuiRoot,
      "packages/desktop/src/renderer/components/layout/Layout.tsx",
    ),
    "<div>AionUI</div>\n",
  );
  writeFile(
    path.join(
      aionuiRoot,
      "packages/desktop/src/renderer/components/layout/Titlebar/index.tsx",
    ),
    "const appTitle = 'AionUI';\n",
  );
  writeFile(
    path.join(aionuiRoot, "packages/desktop/src/renderer/index.html"),
    '<link rel="icon" type="image/png" href="./pwa/icon-192.png" />\n',
  );
  writeFile(
    chatConversationPath(aionuiRoot),
    chatConversationBaseline(),
  );
  writeFile(acpSendBoxPath(aionuiRoot), acpSendBoxBaseline());
  writeFile(
    path.join(
      aionuiRoot,
      "packages/desktop/src/renderer/pages/guid/GuidPage.tsx",
    ),
    "export function Guid() {}\n",
  );
  writeFile(
    path.join(
      aionuiRoot,
      "packages/desktop/src/renderer/pages/guid/index.module.css",
    ),
    ".root {}\n",
  );
  writeFile(
    path.join(
      aionuiRoot,
      "packages/desktop/src/renderer/pages/login/index.tsx",
    ),
    "const loginLogo = 'app.png';\n",
  );
  writeFile(
    path.join(
      aionuiRoot,
      "packages/desktop/src/renderer/pages/login/LoginPage.css",
    ),
    ".login-page { background: #667eea; }\n",
  );
  writeFile(
    path.join(
      aionuiRoot,
      "packages/desktop/src/common/config/i18n-config.json",
    ),
    JSON.stringify({
      fallbackLanguage: "en-US",
      supportedLanguages: ["en-US"],
    }),
  );
}

function makeFixture({
  overlayApplied = true,
  hermesOutputsArgs = false,
  installLayout = false,
  companyOsVersion = "1.0.0-alpha.3",
  brandConfigVersion = `v${companyOsVersion}`,
} = {}) {
  const root = tmpDir();
  const clientRoot = path.join(root, "client");
  const operatorRoot = path.join(clientRoot, ".company-os", "operator-shell");
  const privateRoot = installLayout ? operatorRoot : path.join(root, "private");
  const companyOsRoot = path.join(root, "Company.OS");
  writeFile(path.join(companyOsRoot, "VERSION"), `${companyOsVersion}\n`);
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
    fs.readFileSync(
      path.resolve(DEFAULT_SESSION_CONTINUITY_REGISTRY_PATH),
      "utf8",
    ),
  );
  for (const asset of AIONUI_COMMAND_EVE_ASSETS) {
    writeFile(
      path.join(companyOsRoot, asset.source),
      `asset:${asset.target}\n`,
    );
  }
  for (const file of AIONUI_COMMAND_EVE_LOCALE_PACK_FILES) {
    const content = file.target.endsWith(".json")
      ? JSON.stringify({ namespace: file.namespace }, null, 2)
      : "export default {};\n";
    writeFile(
      path.join(companyOsRoot, file.source),
      content.endsWith("\n") ? content : `${content}\n`,
    );
  }

  const aionuiRoot = installLayout
    ? path.join(operatorRoot, "aionui", "AionUi")
    : path.join(privateRoot, "aionui-sidecar", "AionUi");
  writeFile(
    path.join(aionuiRoot, "package.json"),
    JSON.stringify({ version: "2.1.1" }),
  );
  if (overlayApplied) {
    writeAionuiOverlayMarkers(aionuiRoot);
    writeFile(
      path.join(aionuiRoot, "public/command-eve-brand.json"),
      JSON.stringify({
        schema_version: COMMAND_EVE_BRAND_CONFIG_VERSION,
        version: brandConfigVersion,
      }),
    );
    for (const file of AIONUI_COMMAND_EVE_LOCALE_PACK_FILES) {
      writeFile(
        path.join(aionuiRoot, file.target),
        fs.readFileSync(path.join(companyOsRoot, file.source), "utf8"),
      );
    }
  } else {
    writeAionuiBaselineFiles(aionuiRoot);
  }
  run("git", ["init"], aionuiRoot);
  run("git", ["add", "."], aionuiRoot);
  run(
    "git",
    [
      "-c",
      "user.email=test@example.com",
      "-c",
      "user.name=Test",
      "commit",
      "-m",
      "fixture",
    ],
    aionuiRoot,
  );
  if (!overlayApplied) {
    writeAionuiOverlayMarkers(aionuiRoot);
    run(
      "git",
      ["checkout", "--", AIONUI_CHAT_CONVERSATION_TARGET],
      aionuiRoot,
    );
    run(
      "git",
      ["checkout", "--", AIONUI_ACP_SEND_BOX_TARGET],
      aionuiRoot,
    );
    const patch = run(
      "git",
      [
        "diff",
        "--",
        "packages/desktop/src/renderer",
        "packages/desktop/src/common",
      ],
      aionuiRoot,
    ).stdout;
    writeFile(
      path.join(
        companyOsRoot,
        "assets/brand/eve-command/aionui-overlay/patches/command-eve-aionui.patch",
      ),
      patch,
    );
    run(
      "git",
      [
        "checkout",
        "--",
        "packages/desktop/src/renderer",
        "packages/desktop/src/common",
      ],
      aionuiRoot,
    );
    fs.rmSync(
      path.join(
        aionuiRoot,
        "packages/desktop/src/renderer/services/i18n/locales/de-DE",
      ),
      { recursive: true, force: true },
    );
  } else {
    writeFile(
      path.join(
        companyOsRoot,
        "assets/brand/eve-command/aionui-overlay/patches/command-eve-aionui.patch",
      ),
      "",
    );
  }

  const hermesRoot = installLayout
    ? path.join(operatorRoot, "hermes")
    : path.join(privateRoot, "hermes-sidecar", "hermes-agent");
  const hermesHome = installLayout
    ? path.join(hermesRoot, "home")
    : path.join(privateRoot, "hermes-sidecar", "hermes-home");
  writeFile(
    path.join(hermesRoot, "venv/bin/hermes"),
    hermesOutputsArgs
      ? "#!/usr/bin/env bash\nprintf '%s\\n' \"$*\"\n"
      : "#!/usr/bin/env bash\necho 'Hermes Agent v0.test'\n",
    0o755,
  );
  writeFile(
    path.join(hermesRoot, "venv/bin/python"),
    "#!/usr/bin/env bash\nexit 0\n",
    0o755,
  );
  writeFile(
    path.join(hermesHome, "config.yaml"),
    [
      "model:",
      "  default: gpt-5.1-codex-mini",
      "  provider: openrouter",
      "",
    ].join("\n"),
  );

  return {
    root,
    clientRoot,
    operatorRoot,
    privateRoot,
    companyOsRoot,
    aionuiRoot,
    hermesRoot,
    hermesHome,
  };
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
      ["aionui.brand_version", "pass"],
      ["eve.prepare", "pass"],
      ["eve.preflight", "pass"],
      ["eve.session_continuity", "pass"],
      ["eve.session_registry", "pass"],
      ["hermes.auth_model_smoke", "skipped"],
    ],
  );
  assert.match(
    result.start_command.join("\n"),
    /bun run webui --no-build --port 25809/,
  );
  assert.equal(result.summary.default_agent, "EVE via Hermes");
  assert.equal(result.summary.command_eve_ui_version, "v1.0.0-alpha.3");
  assert.equal(result.summary.hermes_model, "gpt-5.1-codex-mini");
  assert.equal(result.summary.hermes_provider, "openrouter");
  assert.equal(result.summary.hermes_auth_status, "model_profile_ready_auth_unverified");
  assert.equal(result.summary.hermes_auth_mode, "bring-your-own-key");
  assert.equal(result.summary.first_run_seed_status, "client_seed_missing");
  assert.equal(result.summary.first_run_confirmation_status, "needs_initialization");
  assert.equal(
    result.summary.runtime_policy_profile,
    "command-eve-073-proposal-only",
  );
  assert.equal(result.summary.runtime_policy_mode, "proposal_only");
  assert.equal(result.summary.session_route_class, "SC2-workstream-continuity");
  assert.equal(result.summary.session_policy, "workstream-continuity");
  assert.equal(result.summary.session_reuse_allowed, true);
  assert.equal(result.summary.session_human_gate, "HG-2.5");
  assert.equal(result.summary.session_registry_status, "pass");
  assert.equal(result.summary.session_registry_hygiene, "pass");
  assert.equal(
    result.session_continuity.route_receipt.required_registry_state,
    "open-workstream-session",
  );
  assert.equal(
    result.session_registry.session.runtime_sessions.eve_hermes.session_id,
    "",
  );
  assert.equal(
    result.session_registry.session.runtime_sessions.eve_hermes
      .session_id_status,
    "not-yet-captured",
  );
  assert.ok(fs.existsSync(result.session_registry.registry_path));
  assert.match(
    result.start_command.join("\n"),
    /COMMAND_EVE_RUNTIME_POLICY_PATH/,
  );
  assert.match(
    result.start_command.join("\n"),
    /AIONUI_COMMAND_EVE_DISABLE_NATIVE_AUTONOMY="1"/,
  );
});

test("runStartEve resolves a client-root operator-shell install layout", () => {
  const fixture = makeFixture({ installLayout: true });
  const resolved = resolveStartEveOptions({
    companyOsRoot: fixture.companyOsRoot,
    clientRoot: fixture.clientRoot,
  });
  assert.equal(resolved.privateRoot, fixture.operatorRoot);
  assert.equal(resolved.aionuiRoot, fixture.aionuiRoot);
  assert.equal(resolved.hermesRoot, fixture.hermesRoot);
  assert.equal(resolved.hermesHome, fixture.hermesHome);
  const sidecarRoot = path.join(fixture.root, "explicit-private");
  const explicitSidecar = resolveStartEveOptions({
    companyOsRoot: fixture.companyOsRoot,
    clientRoot: fixture.clientRoot,
    privateRoot: sidecarRoot,
  });
  assert.equal(explicitSidecar.privateRoot, sidecarRoot);
  assert.equal(
    explicitSidecar.aionuiRoot,
    path.join(sidecarRoot, "aionui-sidecar", "AionUi"),
  );
  assert.equal(
    explicitSidecar.hermesRoot,
    path.join(sidecarRoot, "hermes-sidecar", "hermes-agent"),
  );

  const result = runStartEve({
    companyOsRoot: fixture.companyOsRoot,
    clientRoot: fixture.clientRoot,
    date: "2026-05-26",
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "ready");
  assert.equal(result.preflight.paths.clientRoot, fixture.clientRoot);
  assert.equal(result.preflight.paths.aionuiRoot, fixture.aionuiRoot);
  assert.equal(result.preflight.paths.hermesRoot, fixture.hermesRoot);
  assert.match(
    result.start_command.join("\n"),
    new RegExp(fixture.aionuiRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
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
  assert.equal(result.stages[1].id, "aionui.brand_version");
  assert.equal(result.stages[1].status, "pass");
  assert.ok(
    fs.existsSync(path.join(fixture.aionuiRoot, "public/command-eve-logo.svg")),
  );
});

test("runStartEve refreshes stale Command EVE UI version from VERSION before preflight", () => {
  const fixture = makeFixture({
    companyOsVersion: "1.0.0-alpha.3",
    brandConfigVersion: "v1.0.0-alpha.1",
  });
  const result = runStartEve({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
    date: "2026-06-04",
  });

  assert.equal(result.ok, true);
  const brandStage = result.stages.find(
    (stage) => stage.id === "aionui.brand_version",
  );
  assert.equal(brandStage.status, "refreshed");
  assert.equal(brandStage.expected_version, "v1.0.0-alpha.3");
  assert.equal(brandStage.previous_version, "v1.0.0-alpha.1");
  assert.equal(brandStage.actual_version, "v1.0.0-alpha.3");
  assert.equal(result.summary.command_eve_ui_version, "v1.0.0-alpha.3");
  const brandJson = JSON.parse(
    fs.readFileSync(
      path.join(fixture.aionuiRoot, "public/command-eve-brand.json"),
      "utf8",
    ),
  );
  assert.equal(brandJson.version, "v1.0.0-alpha.3");
});

test("runStartEve blocks high-risk session-continuity startup classes", () => {
  const fixture = makeFixture();
  const result = runStartEve({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
    date: "2026-05-26",
    sessionClass: "SC4-continuity-blocked",
    sessionMessage:
      "Keep session open for a production write and legal commitment.",
    sessionFields: { human_gate: "HG-4" },
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.failed_stage, "eve.session_continuity");
  assert.ok(result.failures.includes("session-continuity.reuse-blocked"));
  const stage = result.stages.find(
    (row) => row.id === "eve.session_continuity",
  );
  assert.equal(stage.status, "blocked");
  assert.equal(stage.route_class, "SC4-continuity-blocked");
});

test("runStartEve blocks when the local EVE session registry is polluted", () => {
  const fixture = makeFixture();
  const registryPath = path.join(fixture.privateRoot, "polluted-registry.json");
  writeFile(
    registryPath,
    JSON.stringify({
      version: "eve-workstream-session-registry/v0",
      generated_by: "test",
      created_at: "2026-05-26T00:00:00.000Z",
      updated_at: "2026-05-26T00:00:00.000Z",
      default_workstream_id: "eve-founder-companion",
      sessions: {
        "eve-founder-companion": {
          id: "eve-founder-companion",
          status: "polluted",
          updated_at: "2026-05-26T00:00:00.000Z",
          hygiene: {
            stale_after_days: 14,
            pollution: { detected: true, reason: "secret pasted" },
            pollution_markers_found: ["secret"],
          },
        },
      },
      events: [],
    }),
  );
  const result = runStartEve({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: fixture.privateRoot,
    date: "2026-05-26",
    sessionRegistryPath: registryPath,
  });

  assert.equal(result.ok, false);
  assert.equal(result.failed_stage, "eve.session_registry");
  assert.ok(result.failures.includes("eve-session-registry.polluted-session"));
  const stage = result.stages.find((row) => row.id === "eve.session_registry");
  assert.equal(stage.status, "blocked");
  assert.equal(stage.hygiene_status, "blocked_polluted");
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
  const smoke = result.stages.find(
    (stage) => stage.id === "hermes.auth_model_smoke",
  );
  assert.equal(smoke.status, "pass");
  assert.match(smoke.model, /gpt-5\.1-codex-mini/);
  assert.match(smoke.provider, /openrouter/);
  assert.equal(result.smoke.auth_profile.status, "verified");
  assert.equal(result.smoke.auth_profile.readiness_proof.status, "pass");
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
  assert.match(
    fs.readFileSync(report.markdown, "utf8"),
    /# Start EVE Preflight/,
  );
  assert.match(
    fs.readFileSync(report.markdown, "utf8"),
    /Command EVE UI version: v1\.0\.0-alpha\.3/,
  );
  assert.match(
    fs.readFileSync(report.markdown, "utf8"),
    /Runtime policy: command-eve-073-proposal-only/,
  );
  assert.match(
    fs.readFileSync(report.markdown, "utf8"),
    /Session policy: workstream-continuity/,
  );
  assert.match(
    fs.readFileSync(report.markdown, "utf8"),
    /Session registry hygiene: pass/,
  );
  assert.match(
    fs.readFileSync(report.markdown, "utf8"),
    /Hermes auth status: model_profile_ready_auth_unverified/,
  );
  assert.match(
    fs.readFileSync(report.markdown, "utf8"),
    /First-run seed: client_seed_missing/,
  );
  assert.equal(
    JSON.parse(fs.readFileSync(report.json, "utf8")).status,
    "ready",
  );
  assert.equal(
    JSON.parse(fs.readFileSync(report.json, "utf8")).summary
      .session_route_class,
    "SC2-workstream-continuity",
  );
  assert.equal(
    JSON.parse(fs.readFileSync(report.json, "utf8")).session_registry.hygiene
      .status,
    "pass",
  );
});

test("start_eve CLI emits JSON preflight for a prepared fixture", () => {
  const fixture = makeFixture();
  const result = run(
    process.execPath,
    [
      START_EVE_CLI,
      "check",
      "--company-os-root",
      fixture.companyOsRoot,
      "--private-root",
      fixture.privateRoot,
      "--json",
    ],
    fixture.companyOsRoot,
  );

  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.version, START_EVE_VERSION);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.status, "ready");
  assert.equal(parsed.summary.default_agent, "EVE via Hermes");
  assert.equal(parsed.summary.hermes_auth_mode, "bring-your-own-key");
  assert.equal(parsed.summary.first_run_seed_status, "client_seed_missing");
  assert.equal(
    parsed.summary.runtime_policy_profile,
    "command-eve-073-proposal-only",
  );
  assert.equal(parsed.summary.session_policy, "workstream-continuity");
  assert.equal(parsed.summary.session_registry_hygiene, "pass");
  assert.equal(
    parsed.session_continuity.route_receipt.route_class,
    "SC2-workstream-continuity",
  );
});

test("start_eve CLI resolves installed operator layout from client and operator roots", () => {
  const fixture = makeFixture({ installLayout: true });
  const result = run(
    process.execPath,
    [
      START_EVE_CLI,
      "check",
      "--company-os-root",
      fixture.companyOsRoot,
      "--client-root",
      fixture.clientRoot,
      "--operator-root",
      fixture.operatorRoot,
      "--json",
    ],
    fixture.companyOsRoot,
  );

  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.version, START_EVE_VERSION);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.status, "ready");
  assert.equal(parsed.summary.default_agent, "EVE via Hermes");
  assert.equal(parsed.summary.command_eve_ui_version, "v1.0.0-alpha.3");
  assert.equal(parsed.summary.hermes_auth_mode, "bring-your-own-key");
});
