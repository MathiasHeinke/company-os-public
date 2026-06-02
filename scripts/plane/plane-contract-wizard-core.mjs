import {
  contractDeclaresSubagents,
  evaluateGateToolAllowlist,
  isSafeClaudeAllowedTool,
  resolveClaudeAllowedTools,
} from "../orchestration/runtime-dispatcher-v12-core.mjs";

export const CONTRACT_WIZARD_VERSION = "plane-contract-wizard/v0";

export const CONTRACT_WIZARD_QUESTIONS = [
  {
    id: "title",
    label: "Title",
    required: true,
    prompt: "What is the smallest concrete outcome this worker should deliver?",
  },
  {
    id: "role",
    label: "Role label",
    required: true,
    prompt: "Which C-Level seat owns this work?",
    choices: ["role:cto", "role:cpo", "role:cmo", "role:coo", "role:cfo", "role:cao"],
  },
  {
    id: "mode",
    label: "Mode",
    required: true,
    prompt: "Should the worker audit, plan, implement, verify, research, report or review?",
    choices: ["audit", "plan", "implement", "verify", "research", "report", "review"],
  },
  {
    id: "source_of_truth",
    label: "Source of truth",
    required: true,
    repeatable: true,
    prompt: "Which files, reports, Plane items or docs must the worker read first?",
  },
  {
    id: "acceptance_criteria",
    label: "Acceptance criteria",
    required: true,
    repeatable: true,
    prompt: "What must be true before this work can be accepted?",
  },
  {
    id: "gates",
    label: "Gates",
    required: true,
    repeatable: true,
    prompt: "Which commands or review gates must pass?",
  },
  {
    id: "allowed_write_paths",
    label: "Allowed write paths",
    required: true,
    repeatable: true,
    prompt: "Where may the worker write?",
  },
  {
    id: "allowed_claude_tools",
    label: "Allowed Claude tools",
    required: false,
    repeatable: true,
    prompt: "Which Claude tools must be allowed beyond what gates derive? (e.g. Read, Edit, Write, Bash(node scripts/foo*))",
  },
  {
    id: "human_gate",
    label: "Human gate",
    required: true,
    prompt: "What HumanGate level applies?",
    choices: ["HG-1", "HG-2", "HG-2.5", "HG-3", "HG-3.5", "HG-4"],
  },
  {
    id: "runtime_browser_auth",
    label: "Runtime browser auth",
    required: false,
    prompt: "If this is browser/UI/screenshot/Playwright work, which browser auth lane is required?",
    choices: ["none", "forbidden", "browser-connector", "operator-shared-session"],
    required_when: "browser_or_ui_bound",
  },
];

const DEFAULTS = {
  agent: "claude",
  mode: "implement",
  workspace: "registry:company-os",
  dispatch: "manual",
  human_gate: "HG-2",
  blocked_actions: "No Plane Done, no push, no merge, no deploy, no production write, no secrets, no Linear writes.",
  reporting: "Plane worker.reported with changed files, commands/results, blockers, reflection, learning_proposals and artifact paths.",
  reflection_policy: "required",
  learning_proposal_policy: "required",
};

const RUNTIME_BROWSER_AUTH_VALUES = new Set([
  "none",
  "forbidden",
  "browser-connector",
  "operator-shared-session",
]);

const BROWSER_UI_PATTERNS = [
  /\bbrowser[-\s/]?ui\b/i,
  /\b(browser-backed|authenticated browser|browser-confirmed|playwright|screenshot)\b/i,
];

export function normalizeWizardList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  if (value === undefined || value === null) return [];
  return String(value)
    .split(/\r?\n|;/)
    .map((item) => item.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

export function buildWizardAnswers(input = {}) {
  const role = String(input.role || input.role_label || DEFAULTS.role || "").trim();
  return {
    title: String(input.title || "C-Level Worker Contract").trim(),
    role,
    parent_seat: String(input.parent_seat || role || "role:cto").trim(),
    agent: String(input.agent || DEFAULTS.agent).trim(),
    mode: String(input.mode || DEFAULTS.mode).trim(),
    workspace: String(input.workspace || DEFAULTS.workspace).trim(),
    dispatch: String(input.dispatch || DEFAULTS.dispatch).trim(),
    source_of_truth: normalizeWizardList(input.source_of_truth || input.source),
    acceptance_criteria: normalizeWizardList(input.acceptance_criteria || input.acceptance),
    gates: normalizeWizardList(input.gates || input.gate),
    allowed_write_paths: normalizeWizardList(input.allowed_write_paths || input.allowed_write_path),
    allowed_claude_tools: normalizeWizardList(
      input.allowed_claude_tools || input.allowed_claude_tool || input.allowedclaudetools,
    ),
    subagent_roster: normalizeWizardList(
      input.subagent_roster || input.subagents || input.subagentroster,
    ),
    human_gate: String(input.human_gate || DEFAULTS.human_gate).trim(),
    blocked_actions: String(input.blocked_actions || DEFAULTS.blocked_actions).trim(),
    reporting: String(input.reporting || DEFAULTS.reporting).trim(),
    capability_profile: String(input.capability_profile || "").trim(),
    sandbox: String(input.sandbox || "").trim(),
    runtime_auth: String(input.runtime_auth || "").trim(),
    runtime_browser_auth: String(input.runtime_browser_auth || input.runtimebrowserauth || "").trim(),
    runtime_permission_mode: String(input.runtime_permission_mode || "").trim(),
    inference_class: String(input.inference_class || "").trim(),
    reflection_policy: String(input.reflection_policy || DEFAULTS.reflection_policy).trim(),
    learning_proposal_policy: String(input.learning_proposal_policy || DEFAULTS.learning_proposal_policy).trim(),
  };
}

export function isBrowserUiBoundWizardAnswers(answers = {}) {
  const text = [
    answers.title,
    answers.mode,
    answers.runtime_permission_mode,
    answers.reporting,
    ...(answers.source_of_truth || []),
    ...(answers.acceptance_criteria || []),
    ...(answers.gates || []),
    ...(answers.allowed_write_paths || []),
  ].filter(Boolean).join("\n");
  return BROWSER_UI_PATTERNS.some((pattern) => pattern.test(text));
}

export function validateWizardAnswers(answers) {
  const errors = [];
  for (const field of ["title", "role", "parent_seat", "agent", "mode", "workspace", "dispatch", "human_gate", "reporting"]) {
    if (!String(answers[field] || "").trim()) errors.push(`${field} is required`);
  }
  for (const field of ["source_of_truth", "acceptance_criteria", "gates", "allowed_write_paths"]) {
    if (!Array.isArray(answers[field]) || answers[field].length === 0) errors.push(`${field} requires at least one item`);
  }
  if (answers.role && !/^role:(cto|cpo|cmo|coo|cfo|cao)$/.test(answers.role)) {
    errors.push(`role must be a known role:* label: ${answers.role}`);
  }
  if (answers.runtime_browser_auth && !RUNTIME_BROWSER_AUTH_VALUES.has(answers.runtime_browser_auth)) {
    errors.push(`runtime_browser_auth must be one of: ${[...RUNTIME_BROWSER_AUTH_VALUES].join(", ")}`);
  }
  if (isBrowserUiBoundWizardAnswers(answers) && !answers.runtime_browser_auth) {
    errors.push("runtime_browser_auth is required for browser/UI-bound work");
  }
  return { ok: errors.length === 0, errors };
}

export function deriveAllowedClaudeToolsFromGates(gates) {
  const normalized = normalizeWizardList(gates);
  if (normalized.length === 0) {
    return { tools: [], rejected: [], suggestions: [] };
  }
  const contractFields = { gates: normalized };
  const capabilityProfile = { allowed_claude_tools: [] };
  const tools = resolveClaudeAllowedTools({ contractFields, capabilityProfile });
  const evaluation = evaluateGateToolAllowlist({ contractFields, capabilityProfile });
  const rejected = [];
  const suggestions = [];
  for (const entry of evaluation.missing) {
    if (entry.reason && entry.reason !== "allowed_tool_missing") {
      rejected.push({ gate: entry.gate, command: entry.command, reason: entry.reason });
    } else if (entry.suggested_allowed_tool) {
      suggestions.push({
        gate: entry.gate,
        command: entry.command,
        suggested_allowed_tool: entry.suggested_allowed_tool,
      });
    }
  }
  return { tools, rejected, suggestions };
}

export function resolveWizardAllowedClaudeTools(answers) {
  return resolveClaudeAllowedTools({
    contractFields: {
      allowedclaudetools: normalizeWizardList(answers?.allowed_claude_tools),
      gates: normalizeWizardList(answers?.gates),
      subagentroster: normalizeWizardList(answers?.subagent_roster),
    },
    capabilityProfile: { allowed_claude_tools: [] },
  });
}

function classifyExplicitToolInput(tool, contractFields) {
  const normalized = String(tool || "").trim();
  if (!normalized) return { ok: false, reason: "empty-entry" };
  if (normalized === "Task" && !contractDeclaresSubagents(contractFields)) {
    return { ok: false, reason: "subagent-roster-empty" };
  }
  if (!isSafeClaudeAllowedTool(normalized)) {
    return { ok: false, reason: "bash-pattern-unsafe" };
  }
  return { ok: true };
}

function cleanWizardGateCommand(gate) {
  return String(gate || "")
    .trim()
    .replace(/^[-*]\s+/, "")
    .replace(/^`+|`+$/g, "")
    .replace(/^["']+|["']+$/g, "")
    .replace(/\s+/g, " ");
}

function deriveGateToolMapping(gates) {
  const out = [];
  for (const gate of normalizeWizardList(gates)) {
    const derived = resolveClaudeAllowedTools({
      contractFields: { gates: [gate], allowedclaudetools: [] },
      capabilityProfile: { allowed_claude_tools: [] },
    });
    if (!derived.length) continue;
    out.push({
      gate,
      command: cleanWizardGateCommand(gate),
      allowed_claude_tool: derived[0],
    });
  }
  return out;
}

export function diagnoseWizardTooling(answers = {}) {
  const explicitTools = normalizeWizardList(answers?.allowed_claude_tools);
  const gates = normalizeWizardList(answers?.gates);
  const subagentRoster = normalizeWizardList(answers?.subagent_roster);
  const contractFields = {
    allowedclaudetools: explicitTools,
    gates,
    subagentroster: subagentRoster,
  };
  const gateDiagnostics = deriveAllowedClaudeToolsFromGates(gates);
  const resolvedTools = resolveClaudeAllowedTools({
    contractFields,
    capabilityProfile: { allowed_claude_tools: [] },
  });
  const filteredExplicit = [];
  const seenExplicit = new Set();
  for (const tool of explicitTools) {
    if (seenExplicit.has(tool)) continue;
    seenExplicit.add(tool);
    const classification = classifyExplicitToolInput(tool, contractFields);
    if (!classification.ok) {
      filteredExplicit.push({ tool, reason: classification.reason });
    }
  }
  return {
    resolved_tools: resolvedTools,
    derived_gate_tools: deriveGateToolMapping(gates),
    rejected_gates: gateDiagnostics.rejected,
    suggestion_only_gates: gateDiagnostics.suggestions,
    filtered_explicit_tools: filteredExplicit,
  };
}

export function wizardToolingDiagnosticsIsEmpty(diagnostics = {}) {
  const rejected = Array.isArray(diagnostics.rejected_gates) ? diagnostics.rejected_gates.length : 0;
  const suggestions = Array.isArray(diagnostics.suggestion_only_gates)
    ? diagnostics.suggestion_only_gates.length
    : 0;
  const filtered = Array.isArray(diagnostics.filtered_explicit_tools)
    ? diagnostics.filtered_explicit_tools.length
    : 0;
  const derived = Array.isArray(diagnostics.derived_gate_tools)
    ? diagnostics.derived_gate_tools.length
    : 0;
  return rejected + suggestions + filtered + derived === 0;
}

export function renderWizardToolDiagnosticsSection(diagnostics = {}) {
  if (wizardToolingDiagnosticsIsEmpty(diagnostics)) return "";
  const resolved = Array.isArray(diagnostics.resolved_tools) ? diagnostics.resolved_tools : [];
  const lines = ["## Tool Diagnostics", ""];
  lines.push("Resolved AllowedClaudeTools (rendered into the Worker Issue Contract):");
  if (resolved.length) {
    for (const tool of resolved) lines.push(`- ${tool}`);
  } else {
    lines.push("- none");
  }
  lines.push("");
  const derivedTools = diagnostics.derived_gate_tools || [];
  if (derivedTools.length) {
    lines.push("Auto-derived gate tools (safe gates mapped to AllowedClaudeTools entries):");
    for (const entry of derivedTools) {
      lines.push(`- gate: \`${entry.gate}\``);
      lines.push(`  - command: \`${entry.command}\``);
      lines.push(`  - allowed_claude_tool: \`${entry.allowed_claude_tool}\``);
    }
    lines.push("");
  }
  const rejected = diagnostics.rejected_gates || [];
  if (rejected.length) {
    lines.push("Rejected gates (unsafe shell control operator, not auto-allowlisted):");
    for (const entry of rejected) {
      lines.push(`- gate: \`${entry.gate}\``);
      lines.push(`  - command: \`${entry.command}\``);
      lines.push(`  - reason: \`${entry.reason}\``);
    }
    lines.push("");
  }
  const suggestions = diagnostics.suggestion_only_gates || [];
  if (suggestions.length) {
    lines.push("Suggestion-only gates (executable but no safe prefix; declare an AllowedClaudeTools entry to permit):");
    for (const entry of suggestions) {
      lines.push(`- gate: \`${entry.gate}\``);
      lines.push(`  - command: \`${entry.command}\``);
      lines.push(`  - suggested_allowed_tool: \`${entry.suggested_allowed_tool}\``);
    }
    lines.push("");
  }
  const filtered = diagnostics.filtered_explicit_tools || [];
  if (filtered.length) {
    lines.push("Filtered explicit tool inputs (removed by safety filter):");
    for (const entry of filtered) {
      lines.push(`- tool: \`${entry.tool}\``);
      lines.push(`  - reason: \`${entry.reason}\``);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function renderYamlList(key, values) {
  const rows = normalizeWizardList(values);
  if (!rows.length) return `${key}: []`;
  return [`${key}:`, ...rows.map((item) => `  - ${item}`)].join("\n");
}

function renderOptionalScalar(key, value) {
  const text = String(value || "").trim();
  return text ? `${key}: ${text}\n` : "";
}

export function renderWorkerContractBlock(answers) {
  const resolvedAllowedClaudeTools = resolveWizardAllowedClaudeTools(answers);
  return [
    `role: ${answers.role}`,
    `parent_seat: ${answers.parent_seat}`,
    `agent: ${answers.agent}`,
    `mode: ${answers.mode}`,
    `workspace: ${answers.workspace}`,
    `dispatch: ${answers.dispatch}`,
    renderYamlList("source_of_truth", answers.source_of_truth),
    renderYamlList("acceptance_criteria", answers.acceptance_criteria),
    renderYamlList("gates", answers.gates),
    `human_gate: ${answers.human_gate}`,
    renderYamlList("AllowedWritePaths", answers.allowed_write_paths),
    resolvedAllowedClaudeTools.length
      ? renderYamlList("AllowedClaudeTools", resolvedAllowedClaudeTools)
      : "",
    `BlockedActions: ${answers.blocked_actions}`,
    renderOptionalScalar("CapabilityProfile", answers.capability_profile).trimEnd(),
    renderOptionalScalar("Sandbox", answers.sandbox).trimEnd(),
    renderOptionalScalar("RuntimeAuth", answers.runtime_auth).trimEnd(),
    renderOptionalScalar("RuntimeBrowserAuth", answers.runtime_browser_auth).trimEnd(),
    renderOptionalScalar("RuntimePermissionMode", answers.runtime_permission_mode).trimEnd(),
    renderOptionalScalar("InferenceClass", answers.inference_class).trimEnd(),
    `ReflectionPolicy: ${answers.reflection_policy}`,
    `LearningProposalPolicy: ${answers.learning_proposal_policy}`,
    `reporting: ${answers.reporting}`,
  ].filter(Boolean).join("\n");
}

export function renderWizardMarkdown(input = {}) {
  const answers = buildWizardAnswers(input);
  const validation = validateWizardAnswers(answers);
  if (!validation.ok) {
    const error = new Error(`Contract wizard answers invalid:\n- ${validation.errors.join("\n- ")}`);
    error.validation = validation;
    throw error;
  }
  const block = renderWorkerContractBlock(answers);
  const diagnostics = diagnoseWizardTooling(answers);
  const diagnosticsSection = renderWizardToolDiagnosticsSection(diagnostics);
  const sections = [
    `# ${answers.title}`,
    "",
    "## Purpose",
    "",
    answers.title,
    "",
    "## Worker Issue Contract",
    "",
    "```yaml",
    block,
    "```",
    "",
  ];
  if (diagnosticsSection) {
    sections.push(diagnosticsSection);
  }
  sections.push(
    "## Operator Notes",
    "",
    "- Keep this item narrow.",
    "- Rerun Stage 0.5 after any description edit.",
    "- Worker and CAO do not mark Plane Done.",
    "",
  );
  return sections.join("\n");
}
