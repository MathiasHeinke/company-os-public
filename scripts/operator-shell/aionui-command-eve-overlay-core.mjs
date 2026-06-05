import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const AIONUI_COMMAND_EVE_OVERLAY_VERSION =
  "aionui-command-eve-overlay/v0";
export const EVE_EXTENSION_MANIFEST_VERSION = "eve-extension-manifest/v0";
export const EVE_CAPABILITY_CARDS_VERSION = "eve-capability-cards/v0";
export const COMMAND_EVE_BRAND_CONFIG_VERSION = "command-eve-brand-config/v0";

export const AIONUI_COMMAND_EVE_PATCH =
  "assets/brand/eve-command/aionui-overlay/patches/command-eve-aionui.patch";

export const AIONUI_COMMAND_EVE_LOCALE_PACK_LANGUAGE = "de-DE";
export const AIONUI_COMMAND_EVE_LOCALE_PACK_NAMESPACES = [
  "common",
  "agentMode",
  "update",
  "login",
  "fileSelection",
  "preview",
  "conversation",
  "settings",
  "messages",
  "mcp",
  "acp",
  "codex",
  "tools",
  "google",
  "cron",
  "starOffice",
  "guid",
  "agent",
  "team",
  "pet",
];

export const AIONUI_COMMAND_EVE_LOCALE_PACK_FILES = [
  ...AIONUI_COMMAND_EVE_LOCALE_PACK_NAMESPACES.map((namespace) => ({
    language: AIONUI_COMMAND_EVE_LOCALE_PACK_LANGUAGE,
    namespace,
    source: `assets/brand/eve-command/aionui-overlay/locales/${AIONUI_COMMAND_EVE_LOCALE_PACK_LANGUAGE}/${namespace}.json`,
    target: `packages/desktop/src/renderer/services/i18n/locales/${AIONUI_COMMAND_EVE_LOCALE_PACK_LANGUAGE}/${namespace}.json`,
  })),
  {
    language: AIONUI_COMMAND_EVE_LOCALE_PACK_LANGUAGE,
    namespace: "index",
    source: `assets/brand/eve-command/aionui-overlay/locales/${AIONUI_COMMAND_EVE_LOCALE_PACK_LANGUAGE}/index.ts`,
    target: `packages/desktop/src/renderer/services/i18n/locales/${AIONUI_COMMAND_EVE_LOCALE_PACK_LANGUAGE}/index.ts`,
  },
];

export const EVE_CONNECTOR_MANIFEST_SOURCE =
  "kits/company-os-kit/.company-os/eve/connector-manifests.json";

export const EVE_SKILL_REGISTRY = [
  {
    id: "command-eve-first-run",
    name: "Command EVE First-Run Setup",
    description:
      "EVE inspects install state, inventories known systems and guides the next smallest setup step.",
    tier: "core",
    source_doc: "docs/operations/command-eve-first-run-skill-pack.md",
    required: true,
    human_gate: "HG-1",
    next_action:
      "Inspect the onboarding boot packet and choose the next setup step.",
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
    description:
      "Turns founder content intent into a bounded blog draft, claim-safety and editorial review pipeline.",
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
    id: "content-machine",
    name: "Content Machine",
    description:
      "Turns founder context, approved sources and raw briefs into a draft-only content operating system before social, blog, video or book lanes run.",
    tier: "department",
    source_doc: "docs/integrations/aionui-hermes-content-machine-skill.md",
    required: false,
    human_gate: "HG-2.5",
    next_action:
      "Initialize the local Content Machine, confirm FVBM status and create the first Source Inventory.",
    allowed_actions: [
      "inspect company discovery artifacts",
      "check FVBM status",
      "create local content-machine folder structure",
      "draft source inventory and vault cards",
      "produce raw founder brief and council review packet",
    ],
    blocked_actions: [
      "publish or schedule content without HG-2.5 release card",
      "mine private sources without Source Inventory approval",
      "collect credentials or OAuth tokens in chat",
      "write durable memory without confirmation",
      "mark Plane Done",
    ],
  },
  {
    id: "video-first-content-engine",
    name: "Video-First Content Engine",
    description:
      "Turns raw video drops into YouTube packages, clips, social posts, articles and risk-gated review packets.",
    tier: "department",
    source_doc:
      "docs/integrations/aionui-hermes-video-first-content-engine-skill.md",
    required: false,
    human_gate: "HG-2.5",
    next_action:
      "Initialize the video drop-folder and create the first dry-run package plan.",
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
    description:
      "Turns a requested capability into SOP, domain pack, AionUI skill seed, worker contracts and evaluator proof.",
    tier: "department",
    source_doc:
      "docs/integrations/aionui-hermes-department-pack-creator-skill.md",
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
    source:
      "assets/brand/eve-command/aionui-overlay/public/command-eve-logo.svg",
    target: "public/command-eve-logo.svg",
  },
  {
    source:
      "assets/brand/eve-command/aionui-overlay/public/eve-intent-wait.mp4",
    target: "public/eve-intent-wait.mp4",
  },
  {
    source:
      "assets/brand/eve-command/aionui-overlay/public/eve-intent-wait-anchor.png",
    target: "public/eve-intent-wait-anchor.png",
  },
  {
    source: "assets/brand/eve-command/aionui-overlay/public/eve-wait-focus.mp4",
    target: "public/eve-wait-focus.mp4",
  },
  {
    source:
      "assets/brand/eve-command/aionui-overlay/public/eve-wait-focus-loop.gif",
    target: "public/eve-wait-focus-loop.gif",
  },
  {
    source:
      "assets/brand/eve-command/aionui-overlay/public/eve-wait-focus-anchor.png",
    target: "public/eve-wait-focus-anchor.png",
  },
  {
    source:
      "assets/brand/eve-command/aionui-overlay/public/eve-wait-companion.mp4",
    target: "public/eve-wait-companion.mp4",
  },
  {
    source:
      "assets/brand/eve-command/aionui-overlay/public/eve-wait-companion-anchor.png",
    target: "public/eve-wait-companion-anchor.png",
  },
  {
    source:
      "assets/brand/eve-command/aionui-overlay/public/eve-wait-review.mp4",
    target: "public/eve-wait-review.mp4",
  },
  {
    source:
      "assets/brand/eve-command/aionui-overlay/public/eve-wait-review-anchor.png",
    target: "public/eve-wait-review-anchor.png",
  },
  {
    source: "assets/brand/eve-command/aionui-overlay/public/eve-wait-call.mp4",
    target: "public/eve-wait-call.mp4",
  },
  {
    source:
      "assets/brand/eve-command/aionui-overlay/public/eve-wait-call-anchor.png",
    target: "public/eve-wait-call-anchor.png",
  },
];

function exists(filePath) {
  return Boolean(filePath) && fs.existsSync(filePath);
}

function readTextIfExists(filePath) {
  return exists(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

const AIONUI_CHAT_CONVERSATION_TARGET =
  "packages/desktop/src/renderer/pages/conversation/components/ChatConversation.tsx";
const AIONUI_GUID_PAGE_TARGET =
  "packages/desktop/src/renderer/pages/guid/GuidPage.tsx";
const AIONUI_ACP_SEND_BOX_TARGET =
  "packages/desktop/src/renderer/pages/conversation/platforms/acp/AcpSendBox.tsx";

const CHAT_CONVERSATION_TRANSFORM_MARKERS = [
  "const COMMAND_EVE_AGENT_BACKEND = 'hermes';",
  "const COMMAND_EVE_DISPLAY_NAME = 'EVE';",
  "const isCommandEveConversation =",
  "if (extra.backend === COMMAND_EVE_AGENT_BACKEND) return undefined;",
  "agent_name: isCommandEveConversation ? COMMAND_EVE_DISPLAY_NAME : conversationAgentName",
];

function chatConversationTargetPath(paths) {
  return path.join(paths.aionuiRoot, AIONUI_CHAT_CONVERSATION_TARGET);
}

function guidPageTargetPath(paths) {
  return path.join(paths.aionuiRoot, AIONUI_GUID_PAGE_TARGET);
}

function acpSendBoxTargetPath(paths) {
  return path.join(paths.aionuiRoot, AIONUI_ACP_SEND_BOX_TARGET);
}

function isChatConversationCommandEveTransformed(content) {
  return CHAT_CONVERSATION_TRANSFORM_MARKERS.every((marker) =>
    content.includes(marker),
  );
}

function buildChatConversationCommandEveReplacements() {
  return [
    {
      id: "command-eve-constants",
      search:
        "import StarOfficeMonitorCard from '../platforms/openclaw/StarOfficeMonitorCard.tsx';\n",
      replace:
        "import StarOfficeMonitorCard from '../platforms/openclaw/StarOfficeMonitorCard.tsx';\n\nconst COMMAND_EVE_AGENT_BACKEND = 'hermes';\nconst COMMAND_EVE_DISPLAY_NAME = 'EVE';\n",
    },
    {
      id: "command-eve-assistant-display-name",
      search:
        "  const conversationAgentName = (conversation?.extra as { agent_name?: string } | undefined)?.agent_name;\n  const assistantDisplayName = presetAssistantInfo?.name || conversationAgentName;\n",
      replace:
        "  const conversationAgentName = (conversation?.extra as { agent_name?: string } | undefined)?.agent_name;\n  const isCommandEveConversation =\n    conversation?.type === 'acp' && conversation.extra?.backend === COMMAND_EVE_AGENT_BACKEND;\n  const assistantDisplayName = isCommandEveConversation\n    ? COMMAND_EVE_DISPLAY_NAME\n    : presetAssistantInfo?.name || conversationAgentName;\n",
    },
    {
      id: "command-eve-model-selector-bypass",
      search:
        "      const extra = conversation.extra as { backend?: string; current_model_id?: string };\n      return (\n",
      replace:
        "      const extra = conversation.extra as { backend?: string; current_model_id?: string };\n      if (extra.backend === COMMAND_EVE_AGENT_BACKEND) return undefined;\n      return (\n",
    },
    {
      id: "command-eve-agent-name",
      search: "          agent_name: conversationAgentName,\n",
      replace:
        "          agent_name: isCommandEveConversation ? COMMAND_EVE_DISPLAY_NAME : conversationAgentName,\n",
    },
  ];
}

export function inspectAionuiCommandEveChatConversationTransform(paths) {
  const targetPath = chatConversationTargetPath(paths);
  if (!exists(targetPath)) {
    return {
      ok: false,
      status: "missing",
      reason: "chat_conversation_missing",
      target_path: targetPath,
      missing_replacements: [],
    };
  }

  const content = fs.readFileSync(targetPath, "utf8");
  if (isChatConversationCommandEveTransformed(content)) {
    return {
      ok: true,
      status: "already-applied",
      target_path: targetPath,
      missing_replacements: [],
    };
  }

  const missingReplacements = buildChatConversationCommandEveReplacements()
    .filter((replacement) => !content.includes(replacement.search))
    .map((replacement) => replacement.id);

  return {
    ok: missingReplacements.length === 0,
    status: missingReplacements.length ? "blocked" : "ready",
    target_path: targetPath,
    missing_replacements: missingReplacements,
  };
}

export function applyAionuiCommandEveChatConversationTransform(paths) {
  const inspection = inspectAionuiCommandEveChatConversationTransform(paths);
  if (!inspection.ok || inspection.status === "already-applied") {
    return {
      ...inspection,
      files_written: [],
    };
  }

  const targetPath = chatConversationTargetPath(paths);
  let content = fs.readFileSync(targetPath, "utf8");
  for (const replacement of buildChatConversationCommandEveReplacements()) {
    content = content.replace(replacement.search, replacement.replace);
  }

  if (!isChatConversationCommandEveTransformed(content)) {
    return {
      ok: false,
      status: "blocked",
      reason: "chat_conversation_markers_missing_after_transform",
      target_path: targetPath,
      missing_replacements: [],
      files_written: [],
    };
  }

  fs.writeFileSync(targetPath, content);
  return {
    ok: true,
    status: "applied",
    target_path: targetPath,
    missing_replacements: [],
    files_written: [targetPath],
  };
}

export function isAionuiCommandEveChatConversationTransformed(paths) {
  return isChatConversationCommandEveTransformed(
    readTextIfExists(chatConversationTargetPath(paths)),
  );
}

function buildGuidPageCommandEveAgentBlock() {
  return [
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
  ].join("\n");
}

function isGuidPageCommandEveRepaired(content) {
  const agentSelectionIndex = content.indexOf(
    "  const agentSelection = useGuidAgentSelection({",
  );
  const agentKeyIndex = content.indexOf("  const commandEveAgentKey = useMemo");
  const guidInputIndex = content.indexOf("  const guidInput = useGuidInput({");
  const promptIndex = content.indexOf(
    "  const commandEvePrompt = t('guid.commandEve.prompt');",
  );
  const actionRowIndex = content.indexOf("  // Build the action row");
  const misplacedPrompt =
    /agentSelection\.setSelectedAgentKey,\s*\n\s*const commandEvePrompt = t\('guid\.commandEve\.prompt'\);/.test(
      content,
    );
  return (
    agentSelectionIndex !== -1 &&
    agentKeyIndex > agentSelectionIndex &&
    guidInputIndex > agentKeyIndex &&
    promptIndex > guidInputIndex &&
    actionRowIndex > promptIndex &&
    !misplacedPrompt
  );
}

export function inspectAionuiCommandEveGuidPageRepair(paths) {
  const targetPath = guidPageTargetPath(paths);
  if (!exists(targetPath)) {
    return {
      ok: false,
      status: "missing",
      reason: "guid_page_missing",
      target_path: targetPath,
    };
  }
  const content = fs.readFileSync(targetPath, "utf8");
  const hasEvePatch = content.includes("COMMAND_EVE_GUID_ENABLED");
  if (!hasEvePatch) {
    return {
      ok: false,
      status: "blocked",
      reason: "guid_page_eve_patch_missing",
      target_path: targetPath,
    };
  }
  return {
    ok: true,
    status: isGuidPageCommandEveRepaired(content) ? "already-applied" : "ready",
    target_path: targetPath,
  };
}

export function applyAionuiCommandEveGuidPageRepair(paths) {
  const inspection = inspectAionuiCommandEveGuidPageRepair(paths);
  if (!inspection.ok || inspection.status === "already-applied") {
    return {
      ...inspection,
      files_written: [],
    };
  }

  const targetPath = guidPageTargetPath(paths);
  let content = fs.readFileSync(targetPath, "utf8");
  content = content.replace(
    /\n  const commandEveAgentKey = useMemo\(\(\) => \{[\s\S]*?\n  \}, \[agentSelection, commandEveAgentKey\]\);\n/g,
    "\n",
  );
  content = content.replace(
    /\n\s*const commandEvePrompt = t\('guid\.commandEve\.prompt'\);\n/g,
    "\n",
  );
  const agentBlockAnchor =
    /(\n  const agentSelection = useGuidAgentSelection\(\{\n[\s\S]*?\n  \}\);\n)/;
  if (!agentBlockAnchor.test(content)) {
    return {
      ok: false,
      status: "blocked",
      reason: "guid_page_agent_selection_anchor_missing",
      target_path: targetPath,
      files_written: [],
    };
  }
  content = content.replace(
    agentBlockAnchor,
    `$1\n${buildGuidPageCommandEveAgentBlock()}`,
  );
  const promptAnchor = "\n  // Build the action row\n";
  if (!content.includes(promptAnchor)) {
    return {
      ok: false,
      status: "blocked",
      reason: "guid_page_action_row_anchor_missing",
      target_path: targetPath,
      files_written: [],
    };
  }
  content = content.replace(
    promptAnchor,
    "\n  const commandEvePrompt = t('guid.commandEve.prompt');\n\n  // Build the action row\n",
  );
  if (!isGuidPageCommandEveRepaired(content)) {
    return {
      ok: false,
      status: "blocked",
      reason: "guid_page_markers_misordered_after_repair",
      target_path: targetPath,
      files_written: [],
    };
  }
  fs.writeFileSync(targetPath, content);
  return {
    ok: true,
    status: "applied",
    target_path: targetPath,
    files_written: [targetPath],
  };
}

export function isAionuiCommandEveGuidPageRepaired(paths) {
  return isGuidPageCommandEveRepaired(readTextIfExists(guidPageTargetPath(paths)));
}

function isAcpSendBoxCommandEveRepaired(content) {
  return (
    content.includes("const COMMAND_EVE_AGENT_BACKEND = 'hermes';") &&
    content.includes("const COMMAND_EVE_DISPLAY_NAME = 'EVE';") &&
    content.includes(
      "  } = messageState;\n  const displayBackendName = backend === COMMAND_EVE_AGENT_BACKEND ? COMMAND_EVE_DISPLAY_NAME : agent_name || backend;",
    ) &&
    content.includes("          backend: displayBackendName,")
  );
}

export function inspectAionuiCommandEveAcpSendBoxRepair(paths) {
  const targetPath = acpSendBoxTargetPath(paths);
  if (!exists(targetPath)) {
    return {
      ok: false,
      status: "missing",
      reason: "acp_send_box_missing",
      target_path: targetPath,
    };
  }
  const content = fs.readFileSync(targetPath, "utf8");
  return {
    ok: true,
    status: isAcpSendBoxCommandEveRepaired(content) ? "already-applied" : "ready",
    target_path: targetPath,
  };
}

export function applyAionuiCommandEveAcpSendBoxRepair(paths) {
  const inspection = inspectAionuiCommandEveAcpSendBoxRepair(paths);
  if (!inspection.ok || inspection.status === "already-applied") {
    return {
      ...inspection,
      files_written: [],
    };
  }

  const targetPath = acpSendBoxTargetPath(paths);
  let content = fs.readFileSync(targetPath, "utf8");
  content = content.replace(
    /\n\s*const displayBackendName = backend === COMMAND_EVE_AGENT_BACKEND \? COMMAND_EVE_DISPLAY_NAME : agent_name \|\| backend;\n/g,
    "\n",
  );
  if (!content.includes("const COMMAND_EVE_AGENT_BACKEND = 'hermes';")) {
    const constantsAnchor = "const EMPTY_UPLOAD_FILES: string[] = [];\n";
    if (!content.includes(constantsAnchor)) {
      return {
        ok: false,
        status: "blocked",
        reason: "acp_send_box_constants_anchor_missing",
        target_path: targetPath,
        files_written: [],
      };
    }
    content = content.replace(
      constantsAnchor,
      `${constantsAnchor}const COMMAND_EVE_AGENT_BACKEND = 'hermes';\nconst COMMAND_EVE_DISPLAY_NAME = 'EVE';\n`,
    );
  }
  const displayNameAnchor = "  } = messageState;\n";
  if (!content.includes(displayNameAnchor)) {
    return {
      ok: false,
      status: "blocked",
      reason: "acp_send_box_message_state_anchor_missing",
      target_path: targetPath,
      files_written: [],
    };
  }
  content = content.replace(
    displayNameAnchor,
    `${displayNameAnchor}  const displayBackendName = backend === COMMAND_EVE_AGENT_BACKEND ? COMMAND_EVE_DISPLAY_NAME : agent_name || backend;\n`,
  );
  content = content.replace(
    "          backend: agent_name || backend,\n",
    "          backend: displayBackendName,\n",
  );
  if (!isAcpSendBoxCommandEveRepaired(content)) {
    return {
      ok: false,
      status: "blocked",
      reason: "acp_send_box_markers_missing_after_repair",
      target_path: targetPath,
      files_written: [],
    };
  }
  fs.writeFileSync(targetPath, content);
  return {
    ok: true,
    status: "applied",
    target_path: targetPath,
    files_written: [targetPath],
  };
}

export function isAionuiCommandEveAcpSendBoxRepaired(paths) {
  return isAcpSendBoxCommandEveRepaired(
    readTextIfExists(acpSendBoxTargetPath(paths)),
  );
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

export function formatCommandEveDisplayVersion(companyOsVersion = "unknown") {
  const version = String(companyOsVersion || "").trim();
  if (!version || version === "unknown") return "v1.x";
  return version.startsWith("v") ? version : `v${version}`;
}

export function readConnectorManifestFromSource(paths) {
  const sourceFile = path.join(
    paths.companyOsRoot,
    EVE_CONNECTOR_MANIFEST_SOURCE,
  );
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
  const latestFile = path.join(
    preflightResultsDir,
    `${connectorId}-latest.json`,
  );
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
    files = fs
      .readdirSync(preflightResultsDir)
      .filter(
        (f) =>
          f.startsWith(`${connectorId}-`) &&
          f.endsWith(".json") &&
          /\d{4}-\d{2}-\d{2}/.test(f),
      )
      .sort()
      .reverse();
  } catch {
    return null;
  }
  if (files.length === 0) return null;
  try {
    return JSON.parse(
      fs.readFileSync(path.join(preflightResultsDir, files[0]), "utf8"),
    );
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
    brand_config: "public/command-eve-brand.json",
    security: {
      credential_store: "never",
      write_capable_connectors: "human_gate_required_before_activation",
      silent_enable: "blocked",
      secret_rule:
        "Never ask for passwords, cookies, recovery codes, payment details, raw tokens or .env contents in chat.",
      state_authority: "local-preflight-result-files-only",
    },
    load_order: [
      "EVE_EXTENSION_MANIFEST.json",
      "EVE_CAPABILITY_CARDS.json",
      "EVE_CONNECTOR_MANIFESTS.json",
      ...EVE_SKILL_REGISTRY.map(
        (skill) => `aionui-skills/${skill.id}/SKILL.md`,
      ),
    ],
  };
}

export function buildCommandEveBrandConfig({
  companyOsVersion = "unknown",
  generatedAt = new Date().toISOString(),
} = {}) {
  const displayVersion = formatCommandEveDisplayVersion(companyOsVersion);
  return {
    schema_version: COMMAND_EVE_BRAND_CONFIG_VERSION,
    version: displayVersion,
    generated_at: generatedAt,
    brand: {
      product: "Command EVE",
      display_name: "⌘ EVE",
      login_title_template: "⌘ EVE",
      login_version_template: "{{version}}",
    },
    language_pack: {
      default_language: "de-DE",
      supported_languages: ["de-DE", "en-US"],
      fallback_language: "de-DE",
      coverage: "full-key-parity",
      managed_locale: AIONUI_COMMAND_EVE_LOCALE_PACK_LANGUAGE,
      namespaces: AIONUI_COMMAND_EVE_LOCALE_PACK_NAMESPACES,
    },
    login_media: {
      video: "/eve-wait-focus.mp4",
      animation: "/eve-wait-focus-loop.gif",
      poster: "/eve-wait-focus-anchor.png",
      aspect_ratio: "1 / 1",
      framing: "face-focus",
      autoplay_fallback: "animated-gif-until-video-playing",
    },
  };
}

export function inspectAionuiCommandEveBrandConfig(
  paths,
  { companyOsVersion = readCompanyOsVersion(paths.companyOsRoot) } = {},
) {
  const expectedVersion = formatCommandEveDisplayVersion(companyOsVersion);
  if (!exists(paths.aionuiBrandConfig)) {
    return {
      ok: false,
      status: "missing",
      path: paths.aionuiBrandConfig,
      expected_version: expectedVersion,
      actual_version: "",
      failures: ["command_eve_brand_config_missing"],
      errors: [],
    };
  }
  try {
    const data = JSON.parse(fs.readFileSync(paths.aionuiBrandConfig, "utf8"));
    const actualVersion = String(data.version || "");
    const actualSchema = String(data.schema_version || "");
    const failures = [
      actualSchema !== COMMAND_EVE_BRAND_CONFIG_VERSION
        ? "command_eve_brand_config_schema_mismatch"
        : "",
      actualVersion !== expectedVersion
        ? "command_eve_brand_config_version_mismatch"
        : "",
    ].filter(Boolean);
    return {
      ok: failures.length === 0,
      status: failures.length ? "stale" : "pass",
      path: paths.aionuiBrandConfig,
      expected_version: expectedVersion,
      actual_version: actualVersion,
      actual_schema_version: actualSchema,
      company_os_version: companyOsVersion,
      generated_at: data.generated_at || "",
      failures,
      errors: [],
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: "invalid_json",
      path: paths.aionuiBrandConfig,
      expected_version: expectedVersion,
      actual_version: "",
      company_os_version: companyOsVersion,
      failures: ["command_eve_brand_config_invalid_json"],
      errors: [error.message],
    };
  }
}

export function writeAionuiCommandEveBrandConfig(
  paths,
  {
    companyOsVersion = readCompanyOsVersion(paths.companyOsRoot),
    generatedAt = new Date().toISOString(),
  } = {},
) {
  try {
    fs.mkdirSync(path.dirname(paths.aionuiBrandConfig), { recursive: true });
    const data = buildCommandEveBrandConfig({ companyOsVersion, generatedAt });
    fs.writeFileSync(
      paths.aionuiBrandConfig,
      `${JSON.stringify(data, null, 2)}\n`,
    );
    return {
      ok: true,
      status: "written",
      path: paths.aionuiBrandConfig,
      version: data.version,
      company_os_version: companyOsVersion,
      schema_version: data.schema_version,
      generated_at: generatedAt,
      failures: [],
      errors: [],
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      path: paths.aionuiBrandConfig,
      company_os_version: companyOsVersion,
      failures: ["command_eve_brand_config_write_failed"],
      errors: [error.message],
    };
  }
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
    const blockedReason = deriveConnectorBlockedReason(
      connector,
      manifestState,
    );
    let state = manifestState;
    let stateSource = "manifest";
    if (
      preflightResultsDir &&
      manifestState !== "gated" &&
      manifestState !== "blocked"
    ) {
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
      next_action:
        state === "installed" || state === "connected"
          ? null
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

export function resolveAionuiCommandEveOverlayPaths(
  options = {},
  env = process.env,
) {
  const home = env.HOME || process.env.HOME || "";
  const companyOsRoot = path.resolve(
    options.companyOsRoot || env.COMPANY_OS_ROOT || process.cwd(),
  );
  const privateRoot = path.resolve(
    options.privateRoot ||
      env.COMPANY_OS_PRIVATE_ROOT ||
      path.join(home, "Developer", "company-os-private-ops"),
  );
  const aionuiRoot = path.resolve(
    options.aionuiRoot ||
      env.AIONUI_SIDECAR_ROOT ||
      path.join(privateRoot, "aionui-sidecar", "AionUi"),
  );
  const contextRoot = path.resolve(
    options.contextRoot ||
      env.AIONUI_COMPANYOS_CONTEXT ||
      path.join(privateRoot, "aion-companyos-context"),
  );
  return {
    companyOsRoot,
    privateRoot,
    aionuiRoot,
    contextRoot,
    patch: path.join(companyOsRoot, AIONUI_COMMAND_EVE_PATCH),
    killswitch: path.join(
      companyOsRoot,
      "runtime",
      "killswitch",
      "[WORK_ITEM_ID].stop",
    ),
    eveExtensionManifest: path.join(contextRoot, "EVE_EXTENSION_MANIFEST.json"),
    eveCapabilityCards: path.join(contextRoot, "EVE_CAPABILITY_CARDS.json"),
    eveConnectorManifests: path.join(
      contextRoot,
      "EVE_CONNECTOR_MANIFESTS.json",
    ),
    aionuiConfigPointer: path.join(aionuiRoot, "config", "company-os.json"),
    aionuiBrandConfig: path.join(
      aionuiRoot,
      "public",
      "command-eve-brand.json",
    ),
    assets: AIONUI_COMMAND_EVE_ASSETS.map((asset) => ({
      ...asset,
      source_path: path.join(companyOsRoot, asset.source),
      target_path: path.join(aionuiRoot, asset.target),
    })),
    localePack: AIONUI_COMMAND_EVE_LOCALE_PACK_FILES.map((file) => ({
      ...file,
      source_path: path.join(companyOsRoot, file.source),
      target_path: path.join(aionuiRoot, file.target),
    })),
  };
}

export function isAionuiCommandEvePatchedSourceOverlayApplied(paths) {
  const layout = readTextIfExists(
    path.join(
      paths.aionuiRoot,
      "packages/desktop/src/renderer/components/layout/Layout.tsx",
    ),
  );
  const titlebar = readTextIfExists(
    path.join(
      paths.aionuiRoot,
      "packages/desktop/src/renderer/components/layout/Titlebar/index.tsx",
    ),
  );
  const indexHtml = readTextIfExists(
    path.join(paths.aionuiRoot, "packages/desktop/src/renderer/index.html"),
  );
  const guid = readTextIfExists(
    path.join(
      paths.aionuiRoot,
      "packages/desktop/src/renderer/pages/guid/GuidPage.tsx",
    ),
  );
  const css = readTextIfExists(
    path.join(
      paths.aionuiRoot,
      "packages/desktop/src/renderer/pages/guid/index.module.css",
    ),
  );
  const login = readTextIfExists(
    path.join(
      paths.aionuiRoot,
      "packages/desktop/src/renderer/pages/login/index.tsx",
    ),
  );
  const loginCss = readTextIfExists(
    path.join(
      paths.aionuiRoot,
      "packages/desktop/src/renderer/pages/login/LoginPage.css",
    ),
  );
  const enLoginLocale = readTextIfExists(
    path.join(
      paths.aionuiRoot,
      "packages/desktop/src/renderer/services/i18n/locales/en-US/login.json",
    ),
  );
  const i18nConfig = readTextIfExists(
    path.join(
      paths.aionuiRoot,
      "packages/desktop/src/common/config/i18n-config.json",
    ),
  );
  return (
    layout.includes("command-eve-logo.svg") &&
    layout.includes(">EVE<") &&
    titlebar.includes("useMemo(() => 'EVE'") &&
    indexHtml.includes("command-eve-logo.svg") &&
    indexHtml.includes('theme-color" content="#2563eb"') &&
    !indexHtml.includes("pwa/icon-192.png") &&
    guid.includes("COMMAND_EVE_GUID_ENABLED") &&
    guid.includes("eve-intent-wait.mp4") &&
    css.includes("commandEveWaitVideo") &&
    login.includes("COMMAND_EVE_LOGIN_VIDEO") &&
    login.includes("COMMAND_EVE_LOGIN_ANIMATION") &&
    login.includes("command-eve-brand.json") &&
    login.includes("commandEveLoginVideoRef") &&
    login.includes("commandEveVideoPlaying") &&
    login.includes("CommandEveHeroField") &&
    login.includes("COMMAND_EVE_HERO_FIELD_GAP") &&
    login.includes("drawCommandEveHeroField") &&
    login.includes("login-page__hero-field-canvas") &&
    login.includes("login-page__card-glow") &&
    login.includes("login-page__lang-option") &&
    login.includes("login-page__title-command") &&
    login.includes("login-page__version") &&
    login.includes("video.defaultMuted = true") &&
    login.includes("preload='auto'") &&
    loginCss.includes("#fbfcfe") &&
    loginCss.includes("#2563eb") &&
    loginCss.includes("#f97316") &&
    loginCss.includes("login-page__hero-field-canvas") &&
    loginCss.includes("login-page__hero-field-fade") &&
    loginCss.includes("login-page__card-glow") &&
    loginCss.includes("login-page__brand-animation") &&
    loginCss.includes("login-page__brand-video--playing") &&
    loginCss.includes("login-page__lang-option--active") &&
    loginCss.includes("login-page__title-command") &&
    loginCss.includes("login-page__version") &&
    !loginCss.includes("#667eea") &&
    enLoginLocale.includes("Command EVE Operator Shell") &&
    enLoginLocale.includes("Company.OS with Human-Gates") &&
    !enLoginLocale.includes("Transform your command-line AI") &&
    !enLoginLocale.includes("Modern & Efficient") &&
    /"fallbackLanguage"\s*:\s*"de-DE"/.test(i18nConfig)
  );
}

export function isAionuiCommandEveSourceOverlayApplied(paths) {
  return (
    isAionuiCommandEvePatchedSourceOverlayApplied(paths) &&
    isAionuiCommandEveChatConversationTransformed(paths) &&
    isAionuiCommandEveGuidPageRepaired(paths) &&
    isAionuiCommandEveAcpSendBoxRepaired(paths)
  );
}

export function isAionuiCommandEveLocalePackApplied(paths) {
  const localeIndex = readTextIfExists(
    path.join(
      paths.aionuiRoot,
      "packages/desktop/src/renderer/services/i18n/locales",
      AIONUI_COMMAND_EVE_LOCALE_PACK_LANGUAGE,
      "index.ts",
    ),
  );
  return Boolean(
    localeIndex &&
    !localeIndex.includes("../en-US") &&
    paths.localePack.every(
      (file) =>
        exists(file.target_path) &&
        sameFile(file.source_path, file.target_path),
    ),
  );
}

export function isAionuiCommandEveOverlayApplied(paths) {
  return (
    isAionuiCommandEveSourceOverlayApplied(paths) &&
    isAionuiCommandEveLocalePackApplied(paths)
  );
}

function planManagedFileCopies(
  files,
  { force = false, allowOverwrite = false } = {},
) {
  return files.map((file) => {
    const sourceExists = exists(file.source_path);
    const targetExists = exists(file.target_path);
    const identical =
      sourceExists &&
      targetExists &&
      sameFile(file.source_path, file.target_path);
    const shouldCopy =
      sourceExists &&
      (!targetExists || force || (!identical && allowOverwrite));
    const blocked =
      sourceExists && targetExists && !identical && !force && !allowOverwrite;
    return {
      source: file.source,
      target: file.target,
      namespace: file.namespace,
      source_exists: sourceExists,
      target_exists: targetExists,
      identical,
      should_copy: shouldCopy && !blocked,
      blocked,
    };
  });
}

export function planAionuiCommandEveAssetCopies(paths, { force = false } = {}) {
  return planManagedFileCopies(paths.assets, { force, allowOverwrite: false });
}

export function planAionuiCommandEveLocalePackCopies(
  paths,
  { force = false } = {},
) {
  return planManagedFileCopies(paths.localePack, {
    force,
    allowOverwrite: true,
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
  const patchedSourceOverlayApplied =
    aionuiRootExists && isAionuiCommandEvePatchedSourceOverlayApplied(paths);
  const chatConversationTransform = aionuiRootExists
    ? inspectAionuiCommandEveChatConversationTransform(paths)
    : {
        ok: true,
        status: "not-applicable",
        target_path: chatConversationTargetPath(paths),
        missing_replacements: [],
      };
  const guidPageRepair = aionuiRootExists && patchedSourceOverlayApplied
    ? inspectAionuiCommandEveGuidPageRepair(paths)
    : {
        ok: true,
        status: patchedSourceOverlayApplied
          ? "not-applicable"
          : "pending-source-patch",
        target_path: guidPageTargetPath(paths),
      };
  const acpSendBoxRepair = aionuiRootExists && patchedSourceOverlayApplied
    ? inspectAionuiCommandEveAcpSendBoxRepair(paths)
    : {
        ok: true,
        status: patchedSourceOverlayApplied
          ? "not-applicable"
          : "pending-source-patch",
        target_path: acpSendBoxTargetPath(paths),
      };
  const sourceOverlayApplied =
    aionuiRootExists && isAionuiCommandEveSourceOverlayApplied(paths);
  const localePackApplied =
    aionuiRootExists && isAionuiCommandEveLocalePackApplied(paths);
  const overlayApplied = sourceOverlayApplied && localePackApplied;
  const assets = planAionuiCommandEveAssetCopies(paths, {
    force: options.force,
  });
  const localePack = planAionuiCommandEveLocalePackCopies(paths, {
    force: options.force,
  });
  const missingAssets = assets
    .filter((asset) => !asset.source_exists)
    .map((asset) => asset.source);
  const missingLocaleFiles = localePack
    .filter((file) => !file.source_exists)
    .map((file) => file.source);
  const assetBlocks = assets
    .filter((asset) => asset.blocked)
    .map((asset) => asset.target);
  const patchCheck =
    patchExists && aionuiRootExists && !patchedSourceOverlayApplied
      ? runGit(
          ["apply", "--check", "--unidiff-zero", paths.patch],
          paths.aionuiRoot,
        )
      : {
          ok: true,
          status: 0,
          stdout: "",
          stderr: patchedSourceOverlayApplied
            ? "source_patch_already_applied"
            : "",
        };
  const failures = [
    !patchExists ? "overlay_patch_missing" : "",
    !aionuiRootExists ? "aionui_root_missing" : "",
    !packageExists ? "aionui_package_missing" : "",
    missingAssets.length ? "overlay_assets_missing" : "",
    missingLocaleFiles.length ? "overlay_locale_pack_missing" : "",
    assetBlocks.length ? "overlay_target_asset_conflict" : "",
    !patchCheck.ok ? "overlay_patch_not_applicable" : "",
    aionuiRootExists && !chatConversationTransform.ok
      ? "overlay_chat_conversation_transform_not_applicable"
      : "",
    aionuiRootExists && patchedSourceOverlayApplied && !guidPageRepair.ok
      ? "overlay_guid_page_repair_not_applicable"
      : "",
    aionuiRootExists && patchedSourceOverlayApplied && !acpSendBoxRepair.ok
      ? "overlay_acp_send_box_repair_not_applicable"
      : "",
  ].filter(Boolean);

  return {
    ok: failures.length === 0,
    version: AIONUI_COMMAND_EVE_OVERLAY_VERSION,
    status: failures.length
      ? "blocked"
      : overlayApplied
        ? "already-applied"
        : "ready",
    paths,
    overlay_applied: overlayApplied,
    patched_source_overlay_applied: patchedSourceOverlayApplied,
    source_overlay_applied: sourceOverlayApplied,
    locale_pack_applied: localePackApplied,
    chat_conversation_transform: chatConversationTransform,
    guid_page_repair: guidPageRepair,
    acp_send_box_repair: acpSendBoxRepair,
    assets,
    locale_pack: localePack,
    missing_assets: missingAssets,
    missing_locale_files: missingLocaleFiles,
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

  const aionuiPresent =
    exists(paths.aionuiRoot) &&
    exists(path.join(paths.aionuiRoot, "package.json"));
  const patchExists = exists(paths.patch);
  const assets = planAionuiCommandEveAssetCopies(paths, {
    force: options.force,
  });
  const localePack = planAionuiCommandEveLocalePackCopies(paths, {
    force: options.force,
  });
  const patchedSourceOverlayApplied =
    aionuiPresent && isAionuiCommandEvePatchedSourceOverlayApplied(paths);
  const sourceOverlayApplied =
    aionuiPresent && isAionuiCommandEveSourceOverlayApplied(paths);
  const localePackApplied =
    aionuiPresent && isAionuiCommandEveLocalePackApplied(paths);
  const overlayApplied = sourceOverlayApplied && localePackApplied;

  const required_external = [];
  if (!aionuiPresent) {
    required_external.push({
      component: "aionui_root",
      path: paths.aionuiRoot,
      reason: "AionUI source tree required for overlay patch and asset copy.",
      install_hint:
        "Clone the AionUI repository and pass --aionui-root to this command.",
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
    const assetTargetPathByTarget = new Map(
      paths.assets.map((asset) => [asset.target, asset.target_path]),
    );
    const localeTargetPathByTarget = new Map(
      paths.localePack.map((file) => [file.target, file.target_path]),
    );
    would_write.push(
      ...assets
        .filter((a) => a.should_copy)
        .map((a) => assetTargetPathByTarget.get(a.target))
        .filter(Boolean),
    );
    would_write.push(
      ...localePack
        .filter((file) => file.should_copy)
        .map((file) => localeTargetPathByTarget.get(file.target))
        .filter(Boolean),
    );
    would_write.push(paths.aionuiBrandConfig);
    if (!patchedSourceOverlayApplied) would_write.push("(aionui-source-patch)");
    if (!isAionuiCommandEveChatConversationTransformed(paths)) {
      would_write.push(chatConversationTargetPath(paths));
    }
    if (!isAionuiCommandEveGuidPageRepaired(paths)) {
      would_write.push(guidPageTargetPath(paths));
    }
    if (!isAionuiCommandEveAcpSendBoxRepaired(paths)) {
      would_write.push(acpSendBoxTargetPath(paths));
    }
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
      would_overwrite: bundlePlanned
        .filter((b) => exists(b.path))
        .map((b) => b.path),
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
        patched_source_overlay_applied: patchedSourceOverlayApplied,
        source_overlay_applied: sourceOverlayApplied,
        locale_pack_applied: localePackApplied,
        chat_conversation_transformed:
          aionuiPresent && isAionuiCommandEveChatConversationTransformed(paths),
        guid_page_repaired:
          aionuiPresent && isAionuiCommandEveGuidPageRepaired(paths),
        acp_send_box_repaired:
          aionuiPresent && isAionuiCommandEveAcpSendBoxRepaired(paths),
      },
      paths,
    };
  }

  const generatedAt = new Date().toISOString();
  const files_written = [];

  fs.mkdirSync(paths.contextRoot, { recursive: true });

  const manifest = buildEveExtensionManifest({ companyOsVersion, generatedAt });
  fs.writeFileSync(
    paths.eveExtensionManifest,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  files_written.push(paths.eveExtensionManifest);

  const cards = buildEveCapabilityCards({
    connectorManifest,
    companyOsVersion,
    generatedAt,
    preflightResultsDir: options.preflightResultsDir || null,
  });
  fs.writeFileSync(
    paths.eveCapabilityCards,
    `${JSON.stringify(cards, null, 2)}\n`,
  );
  files_written.push(paths.eveCapabilityCards);

  fs.writeFileSync(
    paths.eveConnectorManifests,
    `${JSON.stringify(connectorManifest.data, null, 2)}\n`,
  );
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

    fs.mkdirSync(path.dirname(paths.aionuiBrandConfig), { recursive: true });
    const brandConfig = buildCommandEveBrandConfig({
      companyOsVersion,
      generatedAt,
    });
    fs.writeFileSync(
      paths.aionuiBrandConfig,
      `${JSON.stringify(brandConfig, null, 2)}\n`,
    );
    files_written.push(paths.aionuiBrandConfig);

    let patch_apply = {
      ok: true,
      status: 0,
      stdout: "",
      stderr: patchedSourceOverlayApplied ? "source_patch_already_applied" : "",
    };
    if (!patchedSourceOverlayApplied) {
      patch_apply = runGit(
        ["apply", "--unidiff-zero", paths.patch],
        paths.aionuiRoot,
      );
    }

    let chat_conversation_transform = {
      ok: true,
      status: sourceOverlayApplied ? "already-applied" : "not-run",
      target_path: chatConversationTargetPath(paths),
      missing_replacements: [],
      files_written: [],
    };
    if (patch_apply.ok && !isAionuiCommandEveChatConversationTransformed(paths)) {
      chat_conversation_transform =
        applyAionuiCommandEveChatConversationTransform(paths);
      files_written.push(...chat_conversation_transform.files_written);
    }

    let guid_page_repair = {
      ok: true,
      status: sourceOverlayApplied ? "already-applied" : "not-run",
      target_path: guidPageTargetPath(paths),
      files_written: [],
    };
    if (patch_apply.ok && chat_conversation_transform.ok && !isAionuiCommandEveGuidPageRepaired(paths)) {
      guid_page_repair = applyAionuiCommandEveGuidPageRepair(paths);
      files_written.push(...guid_page_repair.files_written);
    }

    let acp_send_box_repair = {
      ok: true,
      status: sourceOverlayApplied ? "already-applied" : "not-run",
      target_path: acpSendBoxTargetPath(paths),
      files_written: [],
    };
    if (
      patch_apply.ok &&
      chat_conversation_transform.ok &&
      guid_page_repair.ok &&
      !isAionuiCommandEveAcpSendBoxRepaired(paths)
    ) {
      acp_send_box_repair = applyAionuiCommandEveAcpSendBoxRepair(paths);
      files_written.push(...acp_send_box_repair.files_written);
    }

    const copied_locale_files = [];
    if (
      patch_apply.ok &&
      chat_conversation_transform.ok &&
      guid_page_repair.ok &&
      acp_send_box_repair.ok
    ) {
      const localePlanByTarget = new Map(
        localePack.map((row) => [row.target, row]),
      );
      for (const file of paths.localePack) {
        const planned = localePlanByTarget.get(file.target);
        if (!planned?.should_copy) continue;
        fs.mkdirSync(path.dirname(file.target_path), { recursive: true });
        fs.copyFileSync(file.source_path, file.target_path);
        copied_locale_files.push(file.target);
        files_written.push(file.target_path);
      }
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
      fs.writeFileSync(
        paths.aionuiConfigPointer,
        `${JSON.stringify(configPointer, null, 2)}\n`,
      );
      files_written.push(paths.aionuiConfigPointer);
      aionui_config_written = true;
    }

    const appliedAfter = isAionuiCommandEveOverlayApplied(paths);
    const overlayOk =
      patch_apply.ok &&
      chat_conversation_transform.ok &&
      guid_page_repair.ok &&
      acp_send_box_repair.ok;
    return {
      ok: overlayOk,
      version: AIONUI_COMMAND_EVE_OVERLAY_VERSION,
      status: overlayOk ? "pass" : "blocked",
      company_os_version: companyOsVersion,
      files_written,
      copied_assets,
      copied_locale_files,
      patch_apply,
      chat_conversation_transform,
      guid_page_repair,
      acp_send_box_repair,
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
