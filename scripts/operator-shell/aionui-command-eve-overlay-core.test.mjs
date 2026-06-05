import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AIONUI_COMMAND_EVE_ASSETS,
  AIONUI_COMMAND_EVE_LOCALE_PACK_FILES,
  AIONUI_COMMAND_EVE_LOCALE_PACK_NAMESPACES,
  COMMAND_EVE_BRAND_CONFIG_VERSION,
  EVE_EXTENSION_MANIFEST_VERSION,
  EVE_CAPABILITY_CARDS_VERSION,
  EVE_SKILL_REGISTRY,
  applyAionuiCommandEveAcpSendBoxRepair,
  applyAionuiCommandEveChatConversationTransform,
  applyAionuiCommandEveGuidPageRepair,
  applyAionuiCommandEveOverlay,
  buildCommandEveBrandConfig,
  buildEveCapabilityCards,
  buildEveExtensionManifest,
  formatCommandEveDisplayVersion,
  inspectAionuiCommandEveAcpSendBoxRepair,
  inspectAionuiCommandEveChatConversationTransform,
  inspectAionuiCommandEveGuidPageRepair,
  inspectAionuiCommandEveOverlay,
  inspectAionuiCommandEveBrandConfig,
  isAionuiCommandEveAcpSendBoxRepaired,
  isAionuiCommandEveChatConversationTransformed,
  isAionuiCommandEveGuidPageRepaired,
  isAionuiCommandEveOverlayApplied,
  readConnectorManifestFromSource,
  readPreflightEvidence,
  resolveAionuiCommandEveOverlayPaths,
  writeAionuiCommandEveBrandConfig,
} from "./aionui-command-eve-overlay-core.mjs";

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "aionui-eve-overlay-test-"));
}

function writeFile(file, content = "x\n") {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function originalChatConversationSource() {
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

function transformedChatConversationSource() {
  return originalChatConversationSource()
    .replace(
      "import StarOfficeMonitorCard from '../platforms/openclaw/StarOfficeMonitorCard.tsx';\n",
      "import StarOfficeMonitorCard from '../platforms/openclaw/StarOfficeMonitorCard.tsx';\n\nconst COMMAND_EVE_AGENT_BACKEND = 'hermes';\nconst COMMAND_EVE_DISPLAY_NAME = 'EVE';\n",
    )
    .replace(
      "  const conversationAgentName = (conversation?.extra as { agent_name?: string } | undefined)?.agent_name;\n  const assistantDisplayName = presetAssistantInfo?.name || conversationAgentName;\n",
      "  const conversationAgentName = (conversation?.extra as { agent_name?: string } | undefined)?.agent_name;\n  const isCommandEveConversation =\n    conversation?.type === 'acp' && conversation.extra?.backend === COMMAND_EVE_AGENT_BACKEND;\n  const assistantDisplayName = isCommandEveConversation\n    ? COMMAND_EVE_DISPLAY_NAME\n    : presetAssistantInfo?.name || conversationAgentName;\n",
    )
    .replace(
      "      const extra = conversation.extra as { backend?: string; current_model_id?: string };\n      return (\n",
      "      const extra = conversation.extra as { backend?: string; current_model_id?: string };\n      if (extra.backend === COMMAND_EVE_AGENT_BACKEND) return undefined;\n      return (\n",
    )
    .replace(
      "          agent_name: conversationAgentName,\n",
      "          agent_name: isCommandEveConversation ? COMMAND_EVE_DISPLAY_NAME : conversationAgentName,\n",
    );
}

function transformedGuidPageSource() {
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

function misplacedGuidPageSource() {
  return [
    "const COMMAND_EVE_GUID_ENABLED = true;",
    "const COMMAND_EVE_AGENT_BACKEND = 'hermes';",
    "const COMMAND_EVE_DISPLAY_NAME = 'EVE';",
    "const COMMAND_EVE_WAIT_VIDEO_OPTIONS = [{ src: '/eve-intent-wait.mp4', poster: '/eve-intent-wait-anchor.png' }] as const;",
    "",
    "const GuidPage: React.FC = () => {",
    "  const [commandEveWaitVideoIndex, setCommandEveWaitVideoIndex] = useState(() => 0);",
    "  const commandEveWaitVideo = COMMAND_EVE_WAIT_VIDEO_OPTIONS[commandEveWaitVideoIndex];",
    "  const commandEveAgentKey = useMemo(() => {",
    "    if (!COMMAND_EVE_GUID_ENABLED || !agentSelection.availableAgents) return undefined;",
    "    return agentSelection.getAgentKey(agentSelection.availableAgents[0]);",
    "  }, [agentSelection.availableAgents, agentSelection.getAgentKey]);",
    "",
    "  useEffect(() => {",
    "    if (!COMMAND_EVE_GUID_ENABLED || !commandEveAgentKey) return;",
    "    agentSelection.setSelectedAgentKey(commandEveAgentKey);",
    "  }, [agentSelection, commandEveAgentKey]);",
    "",
    "  const modelSelection = useGuidModelSelection('aionrs');",
    "  const agentSelection = useGuidAgentSelection({",
    "    modelList: modelSelection.modelList,",
    "  });",
    "  const guidInput = useGuidInput({});",
    "  const modelSelectorNode = <GuidModelSelector />;",
    "  const handleSelectAgentFromPillBar = useCallback(() => {}, [",
    "    agentSelection.setSelectedAgentKey,",
    "  const commandEvePrompt = t('guid.commandEve.prompt');",
    "    mention.setMentionOpen,",
    "  ]);",
    "  // Build the action row",
    "  const actionRowNode = <GuidActionRow modelSelectorNode={COMMAND_EVE_GUID_ENABLED ? null : modelSelectorNode} />;",
    "  return <p>{commandEvePrompt}{commandEveWaitVideo.src}</p>;",
    "};",
    "",
  ].join("\n");
}

function originalAcpSendBoxSource() {
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

function transformedAcpSendBoxSource() {
  return originalAcpSendBoxSource()
    .replace(
      "const EMPTY_UPLOAD_FILES: string[] = [];\n",
      "const EMPTY_UPLOAD_FILES: string[] = [];\nconst COMMAND_EVE_AGENT_BACKEND = 'hermes';\nconst COMMAND_EVE_DISPLAY_NAME = 'EVE';\n",
    )
    .replace(
      "  } = messageState;\n",
      "  } = messageState;\n  const displayBackendName = backend === COMMAND_EVE_AGENT_BACKEND ? COMMAND_EVE_DISPLAY_NAME : agent_name || backend;\n",
    )
    .replace(
      "          backend: agent_name || backend,\n",
      "          backend: displayBackendName,\n",
    );
}

function misplacedAcpSendBoxSource() {
  return [
    "const EMPTY_UPLOAD_FILES: string[] = [];",
    "const COMMAND_EVE_AGENT_BACKEND = 'hermes';",
    "const COMMAND_EVE_DISPLAY_NAME = 'EVE';",
    "",
    "const AcpSendBox = ({ backend, agent_name, messageState }) => {",
    "  const {",
    "    running,",
    "  const displayBackendName = backend === COMMAND_EVE_AGENT_BACKEND ? COMMAND_EVE_DISPLAY_NAME : agent_name || backend;",
    "    aiProcessing,",
    "  } = messageState;",
    "  const payload = {",
    "          backend: displayBackendName,",
    "  };",
    "  return payload;",
    "};",
    "",
  ].join("\n");
}

function writeLocalePackSources(companyOsRoot) {
  for (const file of AIONUI_COMMAND_EVE_LOCALE_PACK_FILES) {
    const content = file.target.endsWith(".json")
      ? JSON.stringify({ namespace: file.namespace }, null, 2)
      : "export default {};\n";
    writeFile(
      path.join(companyOsRoot, file.source),
      content.endsWith("\n") ? content : `${content}\n`,
    );
  }
}

function writeLocalePackTargets(companyOsRoot, aionuiRoot) {
  for (const file of AIONUI_COMMAND_EVE_LOCALE_PACK_FILES) {
    const source = path.join(companyOsRoot, file.source);
    writeFile(
      path.join(aionuiRoot, file.target),
      fs.readFileSync(source, "utf8"),
    );
  }
}

function makeFixture() {
  const root = tmpDir();
  const companyOsRoot = path.join(root, "Company.OS");
  const aionuiRoot = path.join(root, "AionUi");
  writeFile(
    path.join(
      companyOsRoot,
      "assets/brand/eve-command/aionui-overlay/patches/command-eve-aionui.patch",
    ),
    "",
  );
  writeFile(path.join(companyOsRoot, "VERSION"), "0.7.1-rc.0\n");
  writeFile(
    path.join(
      companyOsRoot,
      "kits/company-os-kit/.company-os/eve/connector-manifests.json",
    ),
    fs.readFileSync(
      path.resolve(
        "kits/company-os-kit/.company-os/eve/connector-manifests.json",
      ),
      "utf8",
    ),
  );
  for (const skill of EVE_SKILL_REGISTRY) {
    writeFile(
      path.join(companyOsRoot, skill.source_doc),
      `# Skill: ${skill.id}\nContent.\n`,
    );
  }
  for (const asset of AIONUI_COMMAND_EVE_ASSETS) {
    writeFile(
      path.join(companyOsRoot, asset.source),
      `asset:${asset.target}\n`,
    );
  }
  writeLocalePackSources(companyOsRoot);
  writeFile(
    path.join(aionuiRoot, "package.json"),
    JSON.stringify({ version: "2.1.1" }),
  );
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
    path.join(
      aionuiRoot,
      "packages/desktop/src/renderer/pages/conversation/components/ChatConversation.tsx",
    ),
    transformedChatConversationSource(),
  );
  writeFile(
    path.join(
      aionuiRoot,
      "packages/desktop/src/renderer/pages/guid/GuidPage.tsx",
    ),
    transformedGuidPageSource(),
  );
  writeFile(
    path.join(
      aionuiRoot,
      "packages/desktop/src/renderer/pages/conversation/platforms/acp/AcpSendBox.tsx",
    ),
    transformedAcpSendBoxSource(),
  );
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
  writeLocalePackTargets(companyOsRoot, aionuiRoot);
  return { root, companyOsRoot, aionuiRoot };
}

test("resolveAionuiCommandEveOverlayPaths uses portable private-root defaults", () => {
  const fixture = makeFixture();
  const paths = resolveAionuiCommandEveOverlayPaths({
    companyOsRoot: fixture.companyOsRoot,
    privateRoot: path.join(fixture.root, "private"),
  });
  assert.equal(
    paths.aionuiRoot,
    path.join(fixture.root, "private", "aionui-sidecar", "AionUi"),
  );
  assert.equal(
    paths.contextRoot,
    path.join(fixture.root, "private", "aion-companyos-context"),
  );
  assert.equal(paths.assets.length, AIONUI_COMMAND_EVE_ASSETS.length);
  assert.equal(
    paths.localePack.length,
    AIONUI_COMMAND_EVE_LOCALE_PACK_FILES.length,
  );
  assert.ok(paths.eveExtensionManifest.endsWith("EVE_EXTENSION_MANIFEST.json"));
  assert.ok(paths.eveCapabilityCards.endsWith("EVE_CAPABILITY_CARDS.json"));
  assert.ok(paths.aionuiBrandConfig.endsWith("public/command-eve-brand.json"));
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

test("ChatConversation transform applies EVE markers and is idempotent", () => {
  const fixture = makeFixture();
  const paths = resolveAionuiCommandEveOverlayPaths({
    companyOsRoot: fixture.companyOsRoot,
    aionuiRoot: fixture.aionuiRoot,
  });
  const chatConversationPath = path.join(
    fixture.aionuiRoot,
    "packages/desktop/src/renderer/pages/conversation/components/ChatConversation.tsx",
  );
  fs.writeFileSync(chatConversationPath, originalChatConversationSource());

  assert.equal(isAionuiCommandEveChatConversationTransformed(paths), false);
  const ready = inspectAionuiCommandEveChatConversationTransform(paths);
  assert.equal(ready.ok, true);
  assert.equal(ready.status, "ready");

  const applied = applyAionuiCommandEveChatConversationTransform(paths);
  assert.equal(applied.ok, true);
  assert.equal(applied.status, "applied");
  assert.deepEqual(applied.files_written, [chatConversationPath]);
  assert.equal(isAionuiCommandEveChatConversationTransformed(paths), true);

  const again = applyAionuiCommandEveChatConversationTransform(paths);
  assert.equal(again.ok, true);
  assert.equal(again.status, "already-applied");
  assert.deepEqual(again.files_written, []);
});

test("GuidPage repair moves fragile EVE blocks into stable hook positions", () => {
  const fixture = makeFixture();
  const paths = resolveAionuiCommandEveOverlayPaths({
    companyOsRoot: fixture.companyOsRoot,
    aionuiRoot: fixture.aionuiRoot,
  });
  const guidPagePath = path.join(
    fixture.aionuiRoot,
    "packages/desktop/src/renderer/pages/guid/GuidPage.tsx",
  );
  fs.writeFileSync(guidPagePath, misplacedGuidPageSource());

  assert.equal(isAionuiCommandEveGuidPageRepaired(paths), false);
  const ready = inspectAionuiCommandEveGuidPageRepair(paths);
  assert.equal(ready.ok, true);
  assert.equal(ready.status, "ready");

  const repaired = applyAionuiCommandEveGuidPageRepair(paths);
  assert.equal(repaired.ok, true);
  assert.equal(repaired.status, "applied");
  assert.deepEqual(repaired.files_written, [guidPagePath]);
  assert.equal(isAionuiCommandEveGuidPageRepaired(paths), true);

  const again = applyAionuiCommandEveGuidPageRepair(paths);
  assert.equal(again.ok, true);
  assert.equal(again.status, "already-applied");
  assert.deepEqual(again.files_written, []);
});

test("AcpSendBox repair moves display backend name after messageState destructuring", () => {
  const fixture = makeFixture();
  const paths = resolveAionuiCommandEveOverlayPaths({
    companyOsRoot: fixture.companyOsRoot,
    aionuiRoot: fixture.aionuiRoot,
  });
  const acpSendBoxPath = path.join(
    fixture.aionuiRoot,
    "packages/desktop/src/renderer/pages/conversation/platforms/acp/AcpSendBox.tsx",
  );
  fs.writeFileSync(acpSendBoxPath, misplacedAcpSendBoxSource());

  assert.equal(isAionuiCommandEveAcpSendBoxRepaired(paths), false);
  const ready = inspectAionuiCommandEveAcpSendBoxRepair(paths);
  assert.equal(ready.ok, true);
  assert.equal(ready.status, "ready");

  const repaired = applyAionuiCommandEveAcpSendBoxRepair(paths);
  assert.equal(repaired.ok, true);
  assert.equal(repaired.status, "applied");
  assert.deepEqual(repaired.files_written, [acpSendBoxPath]);
  assert.equal(isAionuiCommandEveAcpSendBoxRepaired(paths), true);

  const source = fs.readFileSync(acpSendBoxPath, "utf8");
  assert.ok(
    source.includes(
      "  } = messageState;\n  const displayBackendName = backend === COMMAND_EVE_AGENT_BACKEND ? COMMAND_EVE_DISPLAY_NAME : agent_name || backend;",
    ),
  );
  assert.ok(source.includes("          backend: displayBackendName,"));

  const again = applyAionuiCommandEveAcpSendBoxRepair(paths);
  assert.equal(again.ok, true);
  assert.equal(again.status, "already-applied");
  assert.deepEqual(again.files_written, []);
});

test("inspectAionuiCommandEveOverlay plans asset copies for an already-patched AionUI tree", () => {
  const fixture = makeFixture();
  const result = inspectAionuiCommandEveOverlay({
    companyOsRoot: fixture.companyOsRoot,
    aionuiRoot: fixture.aionuiRoot,
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, "already-applied");
  assert.equal(
    result.assets.filter((asset) => asset.should_copy).length,
    AIONUI_COMMAND_EVE_ASSETS.length,
  );
  assert.equal(result.locale_pack_applied, true);
  assert.equal(result.locale_pack.filter((file) => file.should_copy).length, 0);
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
  assert.equal(result.copied_locale_files.length, 0);
  for (const asset of AIONUI_COMMAND_EVE_ASSETS) {
    assert.ok(fs.existsSync(path.join(fixture.aionuiRoot, asset.target)));
  }
  assert.ok(
    fs.existsSync(
      path.join(fixture.aionuiRoot, "public/command-eve-brand.json"),
    ),
  );
});

test("apply refreshes the managed de-DE locale pack without reapplying an existing source overlay", () => {
  const fixture = makeFixture();
  fs.rmSync(
    path.join(
      fixture.aionuiRoot,
      "packages/desktop/src/renderer/services/i18n/locales/de-DE/settings.json",
    ),
    { force: true },
  );
  fs.writeFileSync(
    path.join(
      fixture.aionuiRoot,
      "packages/desktop/src/renderer/services/i18n/locales/de-DE/login.json",
    ),
    JSON.stringify({ stale: true }),
  );

  const result = applyAionuiCommandEveOverlay({
    companyOsRoot: fixture.companyOsRoot,
    aionuiRoot: fixture.aionuiRoot,
  });

  assert.equal(result.ok, true);
  assert.equal(result.patch_apply.stderr, "source_patch_already_applied");
  assert.ok(
    result.copied_locale_files.includes(
      "packages/desktop/src/renderer/services/i18n/locales/de-DE/login.json",
    ),
  );
  assert.ok(
    result.copied_locale_files.includes(
      "packages/desktop/src/renderer/services/i18n/locales/de-DE/settings.json",
    ),
  );
  assert.equal(result.overlay_applied_after, true);
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
  assert.equal(
    manifest.bundle_root,
    "${COMPANY_OS_PRIVATE_ROOT}/aion-companyos-context",
  );
  assert.equal(manifest.skills.length, EVE_SKILL_REGISTRY.length);
  assert.equal(manifest.skills[0].id, "command-eve-first-run");
  assert.equal(manifest.skills[0].required, true);
  assert.equal(manifest.brand_config, "public/command-eve-brand.json");
  assert.ok(Array.isArray(manifest.load_order));
  assert.ok(manifest.load_order.includes("EVE_EXTENSION_MANIFEST.json"));
  assert.equal(manifest.security.credential_store, "never");
  assert.equal(manifest.security.silent_enable, "blocked");
});

test("buildCommandEveBrandConfig produces versioned German-first brand pack metadata", () => {
  const brand = buildCommandEveBrandConfig({
    companyOsVersion: "1.0.0-alpha.1",
    generatedAt: "2026-06-04T00:00:00.000Z",
  });
  assert.equal(brand.schema_version, COMMAND_EVE_BRAND_CONFIG_VERSION);
  assert.equal(brand.version, "v1.0.0-alpha.1");
  assert.equal(brand.brand.display_name, "⌘ EVE");
  assert.equal(brand.brand.login_title_template, "⌘ EVE");
  assert.equal(brand.brand.login_version_template, "{{version}}");
  assert.equal(brand.language_pack.default_language, "de-DE");
  assert.deepEqual(brand.language_pack.supported_languages, ["de-DE", "en-US"]);
  assert.equal(brand.language_pack.coverage, "full-key-parity");
  assert.equal(brand.language_pack.managed_locale, "de-DE");
  assert.deepEqual(
    brand.language_pack.namespaces,
    AIONUI_COMMAND_EVE_LOCALE_PACK_NAMESPACES,
  );
  assert.equal(brand.login_media.animation, "/eve-wait-focus-loop.gif");
  assert.equal(brand.login_media.video, "/eve-wait-focus.mp4");
  assert.equal(brand.login_media.poster, "/eve-wait-focus-anchor.png");
  assert.equal(
    brand.login_media.autoplay_fallback,
    "animated-gif-until-video-playing",
  );
  assert.equal(brand.login_media.framing, "face-focus");
});

test("formatCommandEveDisplayVersion always renders UI-safe product versions", () => {
  assert.equal(formatCommandEveDisplayVersion("1.0.0-alpha.1"), "v1.0.0-alpha.1");
  assert.equal(formatCommandEveDisplayVersion("v1.0.0-alpha.1"), "v1.0.0-alpha.1");
  assert.equal(formatCommandEveDisplayVersion("unknown"), "v1.x");
  assert.equal(formatCommandEveDisplayVersion(""), "v1.x");
});

test("brand config inspection detects and refreshes stale UI release identity", () => {
  const fixture = makeFixture();
  const paths = resolveAionuiCommandEveOverlayPaths({
    companyOsRoot: fixture.companyOsRoot,
    aionuiRoot: fixture.aionuiRoot,
  });
  writeFile(
    paths.aionuiBrandConfig,
    JSON.stringify({
      schema_version: COMMAND_EVE_BRAND_CONFIG_VERSION,
      version: "v1.0.0-alpha.0",
    }),
  );

  const stale = inspectAionuiCommandEveBrandConfig(paths, {
    companyOsVersion: "1.0.0-alpha.1",
  });
  assert.equal(stale.ok, false);
  assert.equal(stale.status, "stale");
  assert.equal(stale.expected_version, "v1.0.0-alpha.1");
  assert.equal(stale.actual_version, "v1.0.0-alpha.0");
  assert.ok(
    stale.failures.includes("command_eve_brand_config_version_mismatch"),
  );

  const write = writeAionuiCommandEveBrandConfig(paths, {
    companyOsVersion: "1.0.0-alpha.1",
    generatedAt: "2026-06-04T10:00:00.000Z",
  });
  assert.equal(write.ok, true);
  assert.equal(write.version, "v1.0.0-alpha.1");

  const current = inspectAionuiCommandEveBrandConfig(paths, {
    companyOsVersion: "1.0.0-alpha.1",
  });
  assert.equal(current.ok, true);
  assert.equal(current.status, "pass");
  assert.equal(current.actual_version, "v1.0.0-alpha.1");
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
  assert.ok(
    byId
      .get("blog-department")
      .allowed_actions.includes("apply claim safety check"),
  );
  assert.ok(
    byId
      .get("blog-department")
      .blocked_actions.includes("publish to CMS without HG-2.5 release card"),
  );
  assert.equal(byId.get("content-machine").name, "Content Machine");
  assert.ok(
    byId.get("content-machine").description.includes("founder context"),
  );
  assert.ok(
    byId
      .get("content-machine")
      .allowed_actions.includes("draft source inventory and vault cards"),
  );
  assert.ok(
    byId
      .get("content-machine")
      .blocked_actions.includes(
        "mine private sources without Source Inventory approval",
      ),
  );
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
  assert.ok(
    fs.existsSync(path.join(contextRoot, "EVE_EXTENSION_MANIFEST.json")),
  );
  assert.ok(fs.existsSync(path.join(contextRoot, "EVE_CAPABILITY_CARDS.json")));
  assert.ok(
    fs.existsSync(path.join(contextRoot, "EVE_CONNECTOR_MANIFESTS.json")),
  );
  for (const skill of EVE_SKILL_REGISTRY) {
    assert.ok(
      fs.existsSync(
        path.join(contextRoot, "aionui-skills", skill.id, "SKILL.md"),
      ),
    );
  }
  const manifestJson = JSON.parse(
    fs.readFileSync(
      path.join(contextRoot, "EVE_EXTENSION_MANIFEST.json"),
      "utf8",
    ),
  );
  assert.equal(manifestJson.version, EVE_EXTENSION_MANIFEST_VERSION);
  assert.equal(manifestJson.skills.length, EVE_SKILL_REGISTRY.length);
  const brandJson = JSON.parse(
    fs.readFileSync(
      path.join(fixture.aionuiRoot, "public/command-eve-brand.json"),
      "utf8",
    ),
  );
  assert.equal(brandJson.version, "v0.7.1-rc.0");
  assert.equal(brandJson.language_pack.default_language, "de-DE");
  assert.equal(brandJson.language_pack.coverage, "full-key-parity");
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
  assert.ok(
    result.would_write.some((p) => p.endsWith("EVE_EXTENSION_MANIFEST.json")),
  );
  assert.ok(
    result.would_write.some((p) => p.endsWith("EVE_CAPABILITY_CARDS.json")),
  );
  assert.ok(
    !result.would_write.some((p) => p.endsWith("command-eve-brand.json")),
  );
  assert.ok(!result.would_write.some((p) => p.includes("locales/de-DE")));
  assert.ok(
    !fs.existsSync(
      path.join(
        privateRoot,
        "aion-companyos-context",
        "EVE_EXTENSION_MANIFEST.json",
      ),
    ),
  );
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
  assert.ok(
    result.would_write.some((p) => p.endsWith("public/command-eve-brand.json")),
  );
  assert.ok(!result.would_write.some((p) => p.includes("locales/de-DE")));
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
  assert.ok(
    plane.preflight_result_file,
    "preflight_result_file must be present",
  );
  assert.ok(plane.preflight_result_file.includes("execution-ledger-plane"));
  const gated = byId.get("google-mail");
  assert.equal(gated.manifest_state, "gated");
  assert.equal(gated.state_source, "manifest");
  assert.ok(gated.blocked_reason, "gated connector must have blocked_reason");
  assert.ok(
    gated.blocked_reason.includes("HG-"),
    "blocked_reason must reference HumanGate",
  );
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
    JSON.stringify({
      ok: true,
      status: "pass",
      connector: "execution-ledger-plane",
    }),
  );
  fs.writeFileSync(
    path.join(preflightDir, "github-gitnexus-latest.json"),
    JSON.stringify({ ok: true, status: "pass", connector: "github-gitnexus" }),
  );
  const cards = buildEveCapabilityCards({
    connectorManifest,
    preflightResultsDir: preflightDir,
  });
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
  for (const id of [
    "google-mail",
    "product-backend-stack",
    "marketing-publishing-stack",
  ]) {
    fs.writeFileSync(
      path.join(preflightDir, `${id}-latest.json`),
      JSON.stringify({ ok: true, status: "pass", connector: id }),
    );
  }
  const cards = buildEveCapabilityCards({
    connectorManifest,
    preflightResultsDir: preflightDir,
  });
  const byId = new Map(cards.cards.map((c) => [c.id, c]));
  assert.equal(
    byId.get("google-mail").state,
    "gated",
    "gated must not be promoted to connected",
  );
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
  fs.writeFileSync(
    path.join(dir, "my-connector-latest.json"),
    JSON.stringify(evidence),
  );
  const result = readPreflightEvidence("my-connector", dir);
  assert.deepEqual(result, evidence);
  fs.rmSync(dir, { recursive: true });
});

test("readPreflightEvidence falls back to most recent dated file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eve-preflight-dated-"));
  const older = { ok: false, status: "blocked" };
  const newer = { ok: true, status: "pass" };
  fs.writeFileSync(
    path.join(dir, "my-conn-2026-05-27.json"),
    JSON.stringify(older),
  );
  fs.writeFileSync(
    path.join(dir, "my-conn-2026-05-28.json"),
    JSON.stringify(newer),
  );
  const result = readPreflightEvidence("my-conn", dir);
  assert.deepEqual(result, newer);
  fs.rmSync(dir, { recursive: true });
});
