import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";

export const RUNTIME_V12_VERSION = "runtime-dispatcher-v1.2/run";

const DEFAULT_COMPANY_OS_PATH = "[LOCAL_WORKSPACE]";

const SECRET_PATTERNS = [
  /\bhch-v3-[A-Za-z0-9_-]{16,}\b/g,
  /\bsk-or-v1-[A-Za-z0-9_-]{16,}\b/g,
  /\bplane_api_[A-Za-z0-9]{16,}\b/g,
  /\b(?:sk|pk)-[A-Za-z0-9]{20,}\b/g,
  /\b(?:sbp_[A-Za-z0-9_-]{16,}|su_(?:live|test)_[A-Za-z0-9_-]{16,})\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
];

const STREAM_JSON_STRING_FIELDS = Object.freeze([
  ["signature", "[REDACTED_STREAM_SIGNATURE]"],
  ["thinking", "[REDACTED_STREAM_THINKING]"],
]);

const STABLE_RUN_STATES = new Set([
  "PASS",
  "REJECT",
  "BLOCKED_AUTH",
  "BLOCKED_BUDGET",
  "BLOCKED_DEPENDENCY",
  "TIMEOUT",
  "RUNTIME_ERROR",
  "NEEDS_HUMAN",
]);

const EXECUTABLE_GATE_COMMANDS = new Set([
  "bash",
  "bun",
  "cargo",
  "deno",
  "git",
  "gitnexus",
  "go",
  "make",
  "node",
  "npm",
  "npx",
  "pnpm",
  "pytest",
  "python",
  "python3",
  "sh",
  "tsc",
  "vitest",
  "yarn",
]);

export function parseRuntimeDurationMs(value, fallbackMs = 30 * 60 * 1000) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return fallbackMs;
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(ms|s|sec|secs|m|min|mins|h|hr|hrs)?/);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return fallbackMs;
  const unit = match[2] || "ms";
  if (unit === "ms") return Math.round(amount);
  if (["s", "sec", "secs"].includes(unit)) return Math.round(amount * 1000);
  if (["m", "min", "mins"].includes(unit)) return Math.round(amount * 60 * 1000);
  if (["h", "hr", "hrs"].includes(unit)) return Math.round(amount * 60 * 60 * 1000);
  return fallbackMs;
}

export function resolveRuntimeMaxTurns(contractFields = {}, fallbackTurns = "30") {
  const raw = [
    contractFields.maxturns,
    contractFields.max_turns,
    contractFields.max_turn_count,
  ].find((value) => String(value || "").trim());
  const candidate = String(raw || fallbackTurns || "30").trim();
  const match = candidate.match(/\d+/);
  if (!match) return String(fallbackTurns || "30");
  const turns = Number.parseInt(match[0], 10);
  if (!Number.isFinite(turns) || turns <= 0) return String(fallbackTurns || "30");
  return String(Math.min(turns, 200));
}

export function resolveRuntimeWorkspacePath(workspace) {
  const raw = String(workspace || "").trim();
  if (isAbsolute(raw)) return raw;
  const normalized = raw.toLowerCase().replace(/[^a-z0-9:-]/g, "");
  if (["companyos", "company-os", "registry:company-os"].includes(normalized)) {
    return DEFAULT_COMPANY_OS_PATH;
  }
  return "";
}

export function extractDeclaredArtifactPath(contractFields = {}, runId = randomUUID()) {
  const candidates = [
    contractFields.reporting,
    contractFields.outcomeartifacts,
    contractFields.outcome_artifacts,
  ];
  for (const entry of candidates) {
    for (const item of asList(entry)) {
      const declaredPath = findDeclaredAbsolutePath(item);
      if (declaredPath) return normalizeReportArtifactPath(declaredPath, runId);
    }
  }
  const day = new Date().toISOString().slice(0, 10);
  return join(DEFAULT_COMPANY_OS_PATH, "reports", "runs", day, `${runId}.md`);
}

export function findDeclaredAbsolutePath(value) {
  const text = String(value || "");
  const rx = /(?:^|[\s"'`([{<])((\/(?!\/)[^\s,'"`)>\]}]+))/g;
  for (const match of text.matchAll(rx)) {
    const candidate = String(match[1] || "").trim().replace(/[.,;:)\]]+$/g, "");
    if (candidate) return candidate;
  }
  return "";
}

export function extractAbsoluteArtifactPathToken(value) {
  return findDeclaredAbsolutePath(value);
}

export function normalizeReportArtifactPath(candidatePath, runId = randomUUID()) {
  const raw = String(candidatePath || "").trim().replace(/[.,;:)\]]+$/g, "");
  if (!raw) return raw;
  if (raw.endsWith("/") || !extname(raw)) {
    return join(raw, `${runId}.md`);
  }
  return raw;
}

export function reportParentDir(reportPath) {
  return dirname(reportPath);
}

export function deriveRuntimeStreamPath(reportPath, runId = randomUUID()) {
  const ext = extname(reportPath) || ".md";
  const base = basename(reportPath, ext);
  return join(dirname(reportPath), `${base}.${runId}.stream.jsonl`);
}

export function deriveRuntimeRunReportPath(reportPath, runId = randomUUID()) {
  return `${reportPath}.${runId}.runtime.md`;
}

export function resolveKillSwitchPaths(contractFields = {}, workspacePath = DEFAULT_COMPANY_OS_PATH) {
  const raw = asList(contractFields.killswitch || contractFields.kill_switch).join("\n");
  return uniquePaths(extractPathLikeTokens(raw)
    .filter((token) => token.includes("runtime/kill") || isAbsolute(token))
    .map((token) => normalizeWorkspacePath(token, workspacePath))
    .filter(Boolean));
}

export function resolveAllowedWritePaths(contractFields = {}, workspacePath = DEFAULT_COMPANY_OS_PATH) {
  const declared = asList(contractFields.allowedwritepaths || contractFields.allowed_write_paths);
  const scopeDerived = declared.length ? [] : extractPathLikeTokens(asList(contractFields.scope).join("\n"));
  const raw = declared.length ? declared : scopeDerived;
  const paths = uniquePaths(raw.map((token) => normalizeWorkspacePath(token, workspacePath)).filter(Boolean));
  return {
    source: declared.length ? "allowed_write_paths" : paths.length ? "scope" : "none",
    paths,
  };
}

export function resolveAllowedReadPaths(contractFields = {}, workspacePath = DEFAULT_COMPANY_OS_PATH) {
  const declared = asList(contractFields.allowedreadpaths || contractFields.allowed_read_paths);
  const paths = uniquePaths(declared.map((token) => normalizeWorkspacePath(token, workspacePath)).filter(Boolean));
  return {
    source: declared.length ? "allowed_read_paths" : "workspace",
    paths: paths.length ? paths : [resolve(workspacePath)],
  };
}

export function resolveEffectiveAllowedReadPaths({
  allowedReadPaths = {},
  workspacePath = DEFAULT_COMPANY_OS_PATH,
  runtimeOwnedReadPaths = [],
} = {}) {
  return uniquePaths([
    ...(allowedReadPaths.paths || []),
    workspacePath,
    ...runtimeOwnedReadPaths,
  ].filter(Boolean));
}

export function formatPlaneWorkItemSequence(workItem = {}, fallbackPrefix = "COMPA") {
  if (!workItem?.sequence_id) return workItem?.id || "unknown";
  const rawPrefix = workItem.project_identifier
    || workItem._project_identifier
    || workItem.project_detail?.identifier
    || (typeof workItem.project === "object" ? workItem.project?.identifier : "")
    || fallbackPrefix;
  const prefix = String(rawPrefix || fallbackPrefix).trim().toUpperCase();
  return `${prefix || fallbackPrefix}-${workItem.sequence_id}`;
}

export function detectOutOfScopeFiles(changedFiles = [], allowedPaths = []) {
  const allowed = uniquePaths(allowedPaths);
  if (!allowed.length) return [];
  return changedFiles
    .map((file) => resolve(file))
    .filter((file) => !allowed.some((allowedPath) => isPathAllowed(file, allowedPath)));
}

export function claudeProjectSlugForWorkspace(workspacePath = DEFAULT_COMPANY_OS_PATH) {
  return resolve(workspacePath).replaceAll("/", "-").replaceAll(".", "");
}

export function claudeProjectSlugCandidatesForWorkspace(workspacePath = DEFAULT_COMPANY_OS_PATH) {
  const resolved = resolve(workspacePath);
  const legacySlug = resolved.replaceAll("/", "-").replaceAll(".", "");
  const currentSlug = resolved.replace(/[/.]/g, "-");
  return [...new Set([legacySlug, currentSlug])];
}

export function isAllowedClaudeToolResultPath(candidate = "", workspacePath = DEFAULT_COMPANY_OS_PATH) {
  const home = process.env.HOME ? resolve(process.env.HOME) : "";
  if (!home) return false;
  const normalized = normalizeCommandPath(candidate);
  if (!normalized) return false;
  if (!/^[A-Za-z0-9_-]+\.txt$/.test(basename(normalized))) return false;
  for (const slug of claudeProjectSlugCandidatesForWorkspace(workspacePath)) {
    const projectRoot = join(home, ".claude", "projects", slug);
    const projectRelativePath = relative(projectRoot, normalized);
    if (!projectRelativePath || projectRelativePath.startsWith("..") || isAbsolute(projectRelativePath)) continue;
    const parts = projectRelativePath.split(sep);
    if (parts.length === 2 && parts[0] === "tool-results") return true;
    if (parts.length === 3 && isClaudeSessionId(parts[0]) && parts[1] === "tool-results") return true;
  }
  return false;
}

export function isAllowedClaudeProjectMemoryReadPath(candidate = "", workspacePaths = [DEFAULT_COMPANY_OS_PATH]) {
  const home = process.env.HOME ? resolve(process.env.HOME) : "";
  if (!home) return false;
  const normalized = normalizeCommandPath(candidate);
  if (!normalized) return false;
  if (basename(normalized) !== "MEMORY.md") return false;

  for (const workspacePath of asList(workspacePaths)) {
    for (const slug of claudeProjectSlugCandidatesForWorkspace(workspacePath)) {
      const memoryRoot = join(home, ".claude", "projects", slug, "memory");
      const relativePath = relative(memoryRoot, normalized);
      if (relativePath && !relativePath.startsWith("..") && !isAbsolute(relativePath) && !relativePath.includes(sep)) {
        return true;
      }
    }
  }
  return false;
}

export function isAllowedClaudePlanScratchWritePath(candidate = "") {
  const home = process.env.HOME ? resolve(process.env.HOME) : "";
  if (!home) return false;
  const normalized = normalizeCommandPath(candidate);
  if (!normalized) return false;
  const plansRoot = join(home, ".claude", "plans");
  const relativePath = relative(plansRoot, normalized);
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) return false;
  if (relativePath.includes(sep)) return false;
  return /^[A-Za-z0-9_.-]+\.md$/.test(basename(normalized));
}

function isClaudeSessionId(candidate = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(candidate));
}

export function detectRuntimeToolScopeViolations(streamText = "", allowedReadPaths = [], options = {}) {
  const allowed = uniquePaths(allowedReadPaths.length ? allowedReadPaths : [DEFAULT_COMPANY_OS_PATH]);
  const workspacePath = options.workspacePath || allowed[0] || DEFAULT_COMPANY_OS_PATH;
  const claudeMemoryWorkspacePaths = uniquePaths([workspacePath, ...allowed]);
  const violations = [];
  const toolUses = extractRuntimeToolUses(streamText);
  for (const tool of toolUses) {
    if (tool.name === "Bash") {
      const command = String(tool.input?.command || "");
      const paths = extractCommandPathTokens(command).filter((token) =>
        !isCommandExecutableToken(command, token) && !isSearchPatternToken(command, token)
      );
      const outOfScope = paths
        .map((candidate) => normalizeCommandPath(candidate))
        .filter(Boolean)
        .filter((candidate) => !isRuntimeLocalNullDevicePath(candidate))
        .filter((candidate) => !allowed.some((allowedPath) => isPathAllowed(candidate, allowedPath)));
      if (outOfScope.length) {
        violations.push({ tool: "Bash", reason: "runtime.bash-read-path-out-of-scope", command, paths: outOfScope });
      }
    }
    if (WRITE_TOOL_NAMES.has(tool.name)) continue;
    for (const key of ["file_path", "path"]) {
      const candidate = tool.input?.[key];
      if (!candidate) continue;
      const normalized = normalizeCommandPath(candidate);
      if (normalized && isAllowedClaudeToolResultPath(normalized, workspacePath)) continue;
      if (normalized && isAllowedClaudeProjectMemoryReadPath(normalized, claudeMemoryWorkspacePaths)) continue;
      if (normalized && !allowed.some((allowedPath) => isPathAllowed(normalized, allowedPath))) {
        violations.push({ tool: tool.name, reason: "runtime.tool-read-path-out-of-scope", path: normalized });
      }
    }
  }
  return violations;
}

function isRuntimeLocalNullDevicePath(candidate = "") {
  return candidate === "/dev/null";
}

const WRITE_TOOL_NAMES = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

export function extractRuntimeToolWritePaths(streamText = "", workspacePath = DEFAULT_COMPANY_OS_PATH) {
  return uniquePaths(extractRuntimeToolWriteEntries(streamText, workspacePath).map((entry) => entry.path));
}

export function detectRuntimeToolWriteScopeViolations(
  streamText = "",
  allowedWritePaths = [],
  { workspacePath = DEFAULT_COMPANY_OS_PATH } = {},
) {
  const allowed = uniquePaths(allowedWritePaths);
  if (!allowed.length) return [];
  const violations = [];
  for (const entry of extractRuntimeToolWriteEntries(streamText, workspacePath)) {
    if (isAllowedClaudePlanScratchWritePath(entry.path)) continue;
    if (!allowed.some((allowedPath) => isPathAllowed(entry.path, allowedPath))) {
      violations.push({ tool: entry.tool, reason: "runtime.tool-write-path-out-of-scope", path: entry.path });
    }
  }
  return violations;
}

export function splitChangedFilesByRuntimeAttribution(changedFiles = [], workerWritePaths = []) {
  const attributedPaths = uniquePaths(workerWritePaths);
  const workerAttributed = [];
  const external = [];
  for (const file of uniquePaths(changedFiles)) {
    if (attributedPaths.some((attributedPath) => isPathAllowed(file, attributedPath))) {
      workerAttributed.push(file);
    } else {
      external.push(file);
    }
  }
  return {
    worker_attributed_changed_files: workerAttributed,
    external_changed_files: external,
  };
}

export function redactRuntimeOutput(value) {
  let text = String(value || "");
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, "[REDACTED_SECRET]");
  }
  for (const [field, marker] of STREAM_JSON_STRING_FIELDS) {
    text = redactJsonStringField(text, field, marker);
  }
  return text;
}

function redactJsonStringField(text, field, marker) {
  const fieldPattern = new RegExp(`("${field}"\\s*:\\s*")((?:\\\\.|[^"\\\\])*)(")`, "g");
  return String(text || "").replace(fieldPattern, (_match, prefix, value, suffix) => {
    return value ? `${prefix}${marker}${suffix}` : `${prefix}${value}${suffix}`;
  });
}

export function summarizeRuntimeStreamLog(streamText = "") {
  const summary = {
    line_count: 0,
    malformed_lines: 0,
    worker_spawned: 0,
    stream: 0,
    stdout_stream: 0,
    stderr_stream: 0,
    worker_heartbeat: 0,
    worker_exit: 0,
    worker_intervention: 0,
    redacted_secret_markers: 0,
    redacted_signature_markers: 0,
    redacted_thinking_markers: 0,
    stream_text_bytes: 0,
  };

  for (const line of String(streamText || "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    summary.line_count += 1;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      summary.malformed_lines += 1;
      continue;
    }

    if (row.type === "worker.spawned") summary.worker_spawned += 1;
    else if (row.type === "stream") {
      summary.stream += 1;
      if (row.stream === "stdout") summary.stdout_stream += 1;
      if (row.stream === "stderr") summary.stderr_stream += 1;
      const text = String(row.text || "");
      summary.stream_text_bytes += Buffer.byteLength(text, "utf8");
      if (text.includes("[REDACTED_SECRET]")) summary.redacted_secret_markers += 1;
      if (text.includes("[REDACTED_STREAM_SIGNATURE]")) summary.redacted_signature_markers += 1;
      if (text.includes("[REDACTED_STREAM_THINKING]")) summary.redacted_thinking_markers += 1;
    } else if (row.type === "worker.heartbeat") summary.worker_heartbeat += 1;
    else if (row.type === "worker.exit") summary.worker_exit += 1;
    else if (row.type === "worker.intervention") summary.worker_intervention += 1;
  }

  return summary;
}

export function evaluateRuntimeStreamHealth(summary = {}, { requireStream = true } = {}) {
  const reasonCodes = [];
  if (!summary.worker_spawned) reasonCodes.push("stream.worker-spawned-missing");
  if (requireStream && !summary.stream) reasonCodes.push("stream.events-missing");
  if (!summary.worker_exit) reasonCodes.push("stream.worker-exit-missing");
  if (summary.malformed_lines) reasonCodes.push("stream.malformed-lines");
  return {
    ok: reasonCodes.length === 0,
    state: reasonCodes.length === 0 ? "PASS" : "NEEDS_HUMAN",
    reason_codes: reasonCodes,
    summary,
  };
}

export function sanitizeRuntimeCommandArgs(args = []) {
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = String(args[i] ?? "");
    out.push(redactRuntimeOutput(arg));
    if (arg === "-p" || arg === "--prompt") {
      if (i + 1 < args.length) {
        i += 1;
        out.push("<prompt>");
      }
    }
  }
  return out;
}

const CLAUDE_RUNTIME_BUILTIN_TOOL_ORDER = Object.freeze([
  "Read",
  "Edit",
  "Write",
  "MultiEdit",
  "Glob",
  "Grep",
  "LS",
  "TodoWrite",
  "Bash",
  "Task",
]);
const CLAUDE_RUNTIME_BUILTIN_TOOL_SET = new Set(CLAUDE_RUNTIME_BUILTIN_TOOL_ORDER);
const CLAUDE_EMPTY_MCP_CONFIG = JSON.stringify({ mcpServers: {} });

export function resolveClaudeRuntimeBuiltinTools(allowedTools = []) {
  const requested = new Set();
  for (const tool of asList(allowedTools)) {
    const base = String(tool || "").trim().match(/^([A-Za-z][A-Za-z0-9_]*)/)?.[1] || "";
    if (CLAUDE_RUNTIME_BUILTIN_TOOL_SET.has(base)) requested.add(base);
  }
  return CLAUDE_RUNTIME_BUILTIN_TOOL_ORDER.filter((tool) => requested.has(tool));
}

export function buildClaudeRuntimeArgs({
  prompt,
  model,
  effort = "",
  permissionMode,
  maxTurns,
  allowedTools = [],
  addDirs = [],
  mcpConfig = CLAUDE_EMPTY_MCP_CONFIG,
  strictMcpConfig = true,
}) {
  const args = [
    "-p", prompt,
    "--model", model,
  ];
  if (effort) args.push("--effort", String(effort));
  args.push(
    "--permission-mode", permissionMode,
    "--output-format", "stream-json",
    "--verbose",
    "--include-partial-messages",
  );
  const tools = [...new Set(asList(allowedTools)
    .map(String)
    .map((tool) => tool.trim())
    .filter(Boolean))];
  const dirs = [...new Set(asList(addDirs)
    .map(String)
    .map((dir) => dir.trim())
    .filter(Boolean))];
  const builtinTools = resolveClaudeRuntimeBuiltinTools(tools);
  if (strictMcpConfig) args.push("--strict-mcp-config");
  if (mcpConfig) args.push("--mcp-config", String(mcpConfig));
  if (builtinTools.length) args.push("--tools", ...builtinTools);
  if (dirs.length) args.push("--add-dir", ...dirs);
  if (tools.length) args.push("--allowed-tools", ...tools);
  args.push("--max-turns", String(maxTurns));
  return args;
}

function collectJsonStrings(value, out = []) {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectJsonStrings(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectJsonStrings(item, out);
  }
  return out;
}

export function resolveClaudeAllowedTools({
  contractFields = {},
  capabilityProfile = {},
} = {}) {
  const profileTools = asList(capabilityProfile?.allowed_claude_tools);
  const contractTools = asList(contractFields.allowedclaudetools || contractFields.allowed_claude_tools);
  const gateTools = deriveGateAllowedTools(contractFields.gates);
  return [...new Set([...profileTools, ...contractTools, ...gateTools]
    .map(String)
    .map((tool) => tool.trim())
    .filter(Boolean)
    .filter((tool) => isSubagentToolAllowed(tool, contractFields))
    .filter(isSafeClaudeAllowedTool))];
}

export function evaluateGateToolAllowlist({
  contractFields = {},
  capabilityProfile = {},
} = {}) {
  const allowedTools = resolveClaudeAllowedTools({ contractFields, capabilityProfile });
  const executableGates = extractExecutableGateCommands(contractFields.gates);
  const missing = executableGates
    .filter((gate) => gate.unsafe_reason || !allowedTools.some((tool) => allowedBashToolCoversCommand(tool, gate.command)))
    .map((gate) => ({
      gate: gate.raw,
      command: gate.command,
      reason: gate.unsafe_reason || "allowed_tool_missing",
      suggested_allowed_tool: suggestGateAllowedTool(gate.command),
    }));
  return {
    ok: missing.length === 0,
    checked_count: executableGates.length,
    allowed_tools: allowedTools,
    missing,
  };
}

export function isSubagentToolAllowed(tool, contractFields = {}) {
  const normalized = String(tool || "").trim();
  if (normalized !== "Task") return true;
  return contractDeclaresSubagents(contractFields);
}

export function contractDeclaresSubagents(contractFields = {}) {
  const raw = [
    contractFields.subagentroster,
    contractFields.subagent_roster,
    contractFields.subagents,
  ].find((value) => String(value || "").trim());
  const roster = String(raw || "").trim().toLowerCase();
  if (!roster || roster === "none" || roster === "[]" || roster === "empty" || roster === "n/a") {
    return false;
  }
  return true;
}

export function isSafeClaudeAllowedTool(tool) {
  const normalized = String(tool || "").trim();
  if (!normalized) return false;
  const bash = normalized.match(/^Bash\(([\s\S]*)\)$/);
  if (!bash) return true;
  const pattern = bash[1].trim();
  if (!pattern || pattern === "*" || pattern.toLowerCase() === "bash") return false;
  if (/^(rg|grep|find|cat|sed|awk|python|python3|perl)\b/i.test(pattern)) return false;
  if (/[;&|`$<>]/.test(pattern)) return false;
  return true;
}

function deriveGateAllowedTools(gates) {
  const tools = [];
  for (const gate of asList(gates)) {
    const command = cleanGateCommand(gate);
    const pattern = safeGateBashPattern(command);
    if (pattern) tools.push(`Bash(${pattern})`);
  }
  return tools;
}

function extractExecutableGateCommands(gates) {
  const out = [];
  for (const gate of asList(gates)) {
    const command = cleanGateCommand(gate);
    if (isExecutableGateCommand(command)) {
      out.push({ raw: gate, command, unsafe_reason: unsafeGateCommandReason(command) });
    }
  }
  return out;
}

function cleanGateCommand(gate) {
  return String(gate || "")
    .trim()
    .replace(/^[-*]\s+/, "")
    .replace(/^`+|`+$/g, "")
    .replace(/^["']+|["']+$/g, "")
    .replace(/\s+/g, " ");
}

function isExecutableGateCommand(command) {
  const words = shellWords(command);
  if (!words.length) return false;
  const executable = basename(words[0]).toLowerCase();
  return EXECUTABLE_GATE_COMMANDS.has(executable);
}

function safeGateBashPattern(command) {
  const normalized = String(command || "").trim();
  if (unsafeGateCommandReason(normalized)) return "";
  const safePrefixes = [
    "git status",
    "git diff --check",
    "git diff",
    "node --check",
    "node --test",
    "pnpm test",
    "pnpm build",
    "pnpm lint",
    "pnpm exec eslint",
    "pnpm run test",
    "pnpm run build",
    "pnpm run lint",
    "npm test",
    "npm run test",
    "npm run build",
    "npm run lint",
    "node scripts/page-index/generate-page-index.mjs",
    "node scripts/release-gates/productization-readiness.mjs",
    "node scripts/goal/goal.mjs run",
    "node scripts/goal/goal.mjs adapt",
    "node scripts/goal/goal.mjs synthesize",
    "npx gitnexus status",
    "npx gitnexus detect-changes",
    "[LOCAL_WORKSPACE] status",
    "[LOCAL_WORKSPACE] detect-changes",
  ];
  const prefix = safePrefixes.find((candidate) => normalized === candidate || normalized.startsWith(`${candidate} `));
  return prefix ? `${prefix}*` : "";
}

function unsafeGateCommandReason(command) {
  const operator = findUnquotedShellControlOperator(command);
  return operator ? `shell-control-operator:${operator}` : "";
}

function findUnquotedShellControlOperator(command = "") {
  const text = String(command || "");
  let quote = "";
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1] || "";
    if (char === "\\") {
      i += 1;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (char === "'" || char === "\"") {
      quote = char;
      continue;
    }
    if (char === "`") return "`";
    if (char === "$" && next === "(") return "$(";
    if (char === ";" || char === "<" || char === ">") return char;
    if ((char === "&" && next === "&") || (char === "|" && next === "|")) return `${char}${next}`;
    if (char === "|") return "|";
  }
  return "";
}

function allowedBashToolCoversCommand(tool, command) {
  const match = String(tool || "").trim().match(/^Bash\(([\s\S]*)\)$/);
  if (!match) return false;
  const pattern = match[1].trim();
  if (!pattern) return false;
  const normalized = cleanGateCommand(command);
  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1).trimEnd();
    return normalized === prefix || normalized.startsWith(prefix);
  }
  return normalized === pattern;
}

function suggestGateAllowedTool(command) {
  if (unsafeGateCommandReason(command)) return "";
  const safe = safeGateBashPattern(command);
  if (safe) return `Bash(${safe})`;
  const words = shellWords(command);
  if (!words.length || /[;&|`$<>]/.test(command)) return "";
  const [cmd, firstArg] = words;
  if (basename(cmd) === "node" && firstArg?.startsWith("scripts/")) {
    return `Bash(${cmd} ${firstArg}*)`;
  }
  if (basename(cmd) === "gitnexus" || cmd.includes("/gitnexus")) {
    return `Bash(${cmd} ${firstArg || ""}*)`.replace(/\s+\*\)$/, "*)");
  }
  return `Bash(${command}*)`;
}

function extractRuntimeToolUses(streamText = "") {
  const out = [];
  for (const line of String(streamText || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      collectRuntimeToolUses(JSON.parse(trimmed), out);
    } catch {
      collectRuntimeToolUses(trimmed, out);
    }
  }
  return out;
}

function collectRuntimeToolUses(value, out = []) {
  if (typeof value === "string") {
    if (!value.includes("tool_use")) return out;
    try {
      collectRuntimeToolUses(JSON.parse(value), out);
    } catch {
      // Ignore non-JSON stream fragments that only mention tool_use in prose.
    }
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectRuntimeToolUses(item, out);
    return out;
  }
  if (!value || typeof value !== "object") return out;
  if (value.type === "tool_use" && typeof value.name === "string") {
    out.push({ name: value.name, input: value.input || {} });
  }
  for (const item of Object.values(value)) collectRuntimeToolUses(item, out);
  return out;
}

function extractRuntimeToolWriteEntries(streamText = "", workspacePath = DEFAULT_COMPANY_OS_PATH) {
  const entries = [];
  for (const tool of extractRuntimeToolUses(streamText)) {
    if (!WRITE_TOOL_NAMES.has(tool.name)) continue;
    for (const key of ["file_path", "path", "notebook_path"]) {
      const candidate = tool.input?.[key];
      if (!candidate) continue;
      const normalized = normalizeRuntimeToolPath(candidate, workspacePath);
      if (normalized) entries.push({ tool: tool.name, path: normalized });
    }
  }
  return entries;
}

function extractCommandPathTokens(command = "") {
  const tokens = [];
  const matcher = /(?:^|[\s"'`=])((?:~(?:\/[^\s"'`;&|]*)?)|(?:\$HOME(?:\/[^\s"'`;&|]*)?)|(?:\/[A-Za-z0-9._~+@%=-][A-Za-z0-9._~+@%=/:-]*))/g;
  let match;
  while ((match = matcher.exec(String(command || "")))) {
    const cleaned = cleanPathToken(match[1]);
    if (cleaned) tokens.push(cleaned);
  }
  return tokens;
}

function isCommandExecutableToken(command = "", token = "") {
  const trimmed = String(command || "").trim();
  if (!trimmed || !token) return false;
  const first = trimmed.match(/^((?:~(?:\/[^\s"'`;&|]*)?)|(?:\$HOME(?:\/[^\s"'`;&|]*)?)|(?:\/[A-Za-z0-9._~+@%=-][A-Za-z0-9._~+@%=/:-]*))/);
  return first?.[1] === token;
}

function shellWords(command = "") {
  const words = [];
  const matcher = /'([^']*)'|"([^"]*)"|`([^`]*)`|([^\s]+)/g;
  let match;
  while ((match = matcher.exec(String(command || "")))) {
    words.push(match[1] ?? match[2] ?? match[3] ?? match[4] ?? "");
  }
  return words.filter(Boolean);
}

function isSearchPatternToken(command = "", token = "") {
  if (!token) return false;
  const tokenPatternMatch = (word) => {
    const cleaned = cleanPathToken(word);
    return cleaned === token || cleaned.startsWith(token);
  };
  const words = shellWords(command);
  if (!words.length) return false;
  const commandName = basename(words[0]);
  if (!["grep", "egrep", "fgrep", "rg"].includes(commandName)) return false;
  let expectPattern = false;
  for (const word of words.slice(1)) {
    if (expectPattern) return tokenPatternMatch(word);
    if (word === "-e" || word === "--regexp") {
      expectPattern = true;
      continue;
    }
    if (word.startsWith("-")) continue;
    return tokenPatternMatch(word);
  }
  return false;
}

function normalizeCommandPath(token) {
  const cleaned = cleanPathToken(token);
  if (!cleaned) return "";
  const home = process.env.HOME || "[LOCAL_WORKSPACE]";
  if (cleaned === "~") return resolve(home);
  if (cleaned.startsWith("~/")) return resolve(home, cleaned.slice(2));
  if (cleaned === "$HOME") return resolve(home);
  if (cleaned.startsWith("$HOME/")) return resolve(home, cleaned.slice(6));
  if (isAbsolute(cleaned)) return resolve(cleaned);
  return "";
}

function normalizeRuntimeToolPath(token, workspacePath = DEFAULT_COMPANY_OS_PATH) {
  return normalizeCommandPath(token) || normalizeWorkspacePath(token, workspacePath);
}

function collectJsonStates(value, out = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectJsonStates(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (String(key).toLowerCase() === "state" && typeof item === "string") {
        const state = item.toUpperCase();
        if (STABLE_RUN_STATES.has(state)) out.push(state);
      }
      collectJsonStates(item, out);
    }
  }
  return out;
}

export function extractWorkerDeclaredState(text) {
  const chunks = [];
  const states = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      if (line) chunks.push(line);
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed);
      for (const fragment of workerStateJsonFragments(parsed)) {
        states.push(...collectJsonStates(fragment));
        chunks.push(...collectJsonStrings(fragment));
      }
    } catch {
      chunks.push(line);
    }
  }

  for (const chunk of chunks) {
    const matcher = /(?:^|[\s*_`>-])(?:\*\*)?state(?:\*\*)?\s*[:=](?:\*\*)?\s*`?([A-Z_]+)`?/gim;
    let match;
    while ((match = matcher.exec(chunk))) {
      const state = String(match[1] || "").toUpperCase();
      if (STABLE_RUN_STATES.has(state)) states.push(state);
    }
  }
  return states.length ? states[states.length - 1] : "";
}

function workerStateJsonFragments(value) {
  if (!value || typeof value !== "object") return [value];

  const type = String(value.type || "").toLowerCase();
  const role = String(value.message?.role || value.role || "").toLowerCase();
  if (type === "user" || role === "user") return [];

  if (type === "stream" && typeof value.text === "string") {
    const nested = [];
    let parsedAnyNestedJson = false;
    for (const line of value.text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) continue;
      try {
        parsedAnyNestedJson = true;
        nested.push(...workerStateJsonFragments(JSON.parse(trimmed)));
      } catch {
        // If the stream text is not valid nested JSON, handle it as raw text below.
      }
    }
    if (parsedAnyNestedJson) return nested;
  }

  return [value];
}

export function workerOutputHasTopLevelField(text, fieldName) {
  if (!text || !fieldName) return false;
  const chunks = [String(text || "")];
  for (const line of String(text || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) continue;
    try {
      chunks.push(...collectJsonStrings(JSON.parse(trimmed)));
    } catch {
      // Ignore non-JSON stream fragments.
    }
  }

  const field = String(fieldName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fieldRe = new RegExp(`(?:^|\\n)\\s{0,4}${field}\\s*:\\s*(?:\\S|\\n\\s+)`, "m");
  const markdownHeadingField = String(fieldName)
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\s_-]+");
  const markdownHeadingRe = new RegExp(
    `(?:^|\\n)#{1,6}\\s+(?:\\d+(?:\\.\\d+)*[.)]?\\s+)?${markdownHeadingField}\\b`,
    "im",
  );
  return chunks.some((chunk) => {
    const body = String(chunk || "");
    return fieldRe.test(body) || markdownHeadingRe.test(body);
  });
}

export function readReportArtifactText(reportPath) {
  const resolved = String(reportPath || "").trim();
  if (!resolved || !isAbsolute(resolved) || !existsSync(resolved)) return "";
  try {
    return readFileSync(resolved, "utf8");
  } catch {
    return "";
  }
}

export function inferRuntimeStateFromWorkerOutput({
  exitCode,
  stdout = "",
  stderr = "",
  timedOut = false,
  killedReason = "",
}) {
  if (timedOut) {
    return { state: "TIMEOUT", worker_declared_state: extractWorkerDeclaredState(`${stdout}\n${stderr}`), reason: "timeout" };
  }
  if (killedReason) {
    return { state: "NEEDS_HUMAN", worker_declared_state: extractWorkerDeclaredState(`${stdout}\n${stderr}`), reason: killedReason };
  }
  const workerDeclaredState = extractWorkerDeclaredState(`${stdout}\n${stderr}`);
  if (workerDeclaredState && workerDeclaredState !== "PASS") {
    return { state: workerDeclaredState, worker_declared_state: workerDeclaredState, reason: "worker-declared-non-pass" };
  }
  if (Number(exitCode) === 0) {
    return {
      state: "PASS",
      worker_declared_state: workerDeclaredState || "",
      reason: workerDeclaredState === "PASS" ? "worker-declared-pass" : "exit-zero",
    };
  }
  return {
    state: "RUNTIME_ERROR",
    worker_declared_state: workerDeclaredState || "",
    reason: "nonzero-exit",
  };
}

export const WORKER_PROMPT_GUARDS = Object.freeze({
  "exact-read-roots-only": [
    "Exact read-root guard (exact-read-roots-only):",
    "- Treat every allowed_read_paths entry as an exact root boundary.",
    "- Do not run Grep, Glob, LS, Read, Bash, or any filesystem scan against a shared parent directory when the contract lists narrower child roots.",
    "- In particular, never scan `[LOCAL_WORKSPACE]` unless that exact path is explicitly listed in allowed_read_paths.",
    "- If cross-workspace evidence requires a broader parent-root scan, stop and report BLOCKED_DEPENDENCY with reason `read-root-expansion-required` and name the exact additional root.",
  ].join("\n"),
  "relay-write-temptation": [
    "Read-only relay guard (relay-write-temptation):",
    "- The contract for this work item is explicitly read-only. Worker scope is poll + dedupe + rate-limit + journal-to-disk only.",
    "- If you are about to add any Plane POST/PATCH/DELETE call, execute another dispatcher/controller script, spawn a worker, or write a Plane comment, stop and report NEEDS_HUMAN with reason `relay-write-temptation`.",
    "- Wiring the relay's output to a live dispatch path belongs to Relay v1, not this contract. Surface the temptation; do not satisfy it.",
  ].join("\n"),
});

export function selectWorkerPromptGuards(contractFields = {}, registry = WORKER_PROMPT_GUARDS) {
  const raw = contractFields?.guards;
  if (!raw) return [];
  const names = Array.isArray(raw)
    ? raw
    : String(raw).split(/[,\s]+/).filter(Boolean);
  const seen = new Set();
  const output = [];
  for (const name of names) {
    const key = String(name || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (Object.prototype.hasOwnProperty.call(registry, key)) {
      output.push(registry[key]);
    }
  }
  return output;
}

export function buildWorkerPrompt({
  workItem,
  contractFields = {},
  description = "",
  dryRun,
  reportPath,
  runId,
  capabilityProfile = null,
  allowedTools = [],
  allowedWritePaths = [],
}) {
  const seq = formatPlaneWorkItemSequence(workItem);
  const guards = selectWorkerPromptGuards(contractFields);
  const guardBlock = guards.length
    ? ["", "Contract-declared runtime guards (each must be honored as a hard boundary):", ...guards.map((g) => g.split("\n").map((l) => l).join("\n"))]
    : [];
  return [
    "You are a Company.OS bounded C-Level worker.",
    "",
    "You are running under Runtime Dispatcher v1.2. Do the assigned work only inside the declared Plane work item.",
    "",
    "Hard boundaries:",
    "- Do not mark Plane Done.",
    "- Do not deploy, merge, push, publish, or write production systems.",
    "- Do not write durable Honcho or private memory directly.",
    "- Do not use tools outside the declared CapabilityProfile.",
    "- HG-3 is CEO/Codex or accountable C-Level critical authority, not a founder/human stop. If HG-3 approval is needed, stop and report BLOCKED_DEPENDENCY with reason `hg3-ceo-escalation` and the exact CEO/C-Level release evidence required.",
    "- Report NEEDS_HUMAN only for HG-4 founder/human boundaries or a declared HG-3.5 founder-proxy pause.",
    "- For any forbidden surface, stop before acting and classify the needed authority: BLOCKED_DEPENDENCY for CEO/C-Level scope, NEEDS_HUMAN only for HG-4.",
    "- Use exact absolute paths from the Plane contract and boot pack. Do not rewrite, abbreviate, infer, autocorrect, or normalize `/Users/...` paths.",
    "- If an absolute path appears missing or ambiguous, stop and report NEEDS_HUMAN instead of trying a similar path.",
    "- Do not use Task/subagents unless the Plane contract declares a non-empty SubAgentRoster and the Task tool is present in allowed_claude_tools.",
    "- Write files, shell redirections, tee outputs, logs, reports and temporary artifacts only under the effective allowed write/output paths listed below.",
    "- Do not use `/tmp`, `/var/tmp`, Desktop, Downloads, Documents, or any path outside the effective allowed write/output paths for intermediate artifacts.",
    "- If a gate needs captured output, write it under `reports/runs/` or `reports/goals/` when those paths are listed below; otherwise stream it to stdout only.",
    ...guardBlock,
    "",
    "Required final response:",
    "- Summarize changed files, commands, gates, risks, rollback path.",
    "- Include literal top-level markers `reflection:`, `learning_proposals:`, and `capability_context_proof:` in your final worker.reported-ready response or durable report.",
    "- Run the declared Gates yourself when the declared CapabilityProfile and allowed Claude tools permit it.",
    "- If a declared gate is denied by the Claude harness, quote the denied command and denial reason exactly.",
    "- For Company.OS GitNexus gates, prefer `[LOCAL_WORKSPACE]` over `npx gitnexus` when that exact tool is listed in allowed_claude_tools.",
    "- Keep the final response suitable for a worker.reported Plane comment.",
    "",
    `dispatcher_run_id: ${runId}`,
    `work_item: ${seq}`,
    `report_path: ${reportPath}`,
    `agent: ${contractFields.agent || ""}`,
    `role: ${contractFields.role || contractFields.rolelabel || ""}`,
    `mode: ${contractFields.mode || ""}`,
    `workspace: ${contractFields.workspace || ""}`,
    `capability_profile: ${contractFields.capabilityprofile || ""}`,
    "",
    "Dry-run preflight summary:",
    JSON.stringify({
      state: dryRun?.state,
      blocked_reasons: dryRun?.blocked_reasons || [],
    }, null, 2),
    "",
    "Declared capability profile summary:",
    JSON.stringify(summarizeCapabilityProfileForPrompt(capabilityProfile, allowedTools), null, 2),
    "",
    "Effective allowed write/output paths:",
    JSON.stringify(asList(allowedWritePaths), null, 2),
    "",
    "Plane work item description:",
    description,
  ].join("\n");
}

function summarizeCapabilityProfileForPrompt(profile, allowedTools) {
  if (!profile) {
    return {
      profile_loaded: false,
      allowed_claude_tools: asList(allowedTools),
    };
  }
  return {
    profile_loaded: true,
    id: profile.id || "",
    role: profile.role || "",
    max_autonomy_level: profile.max_autonomy_level || "",
    allowed_plugins: asList(profile.allowed_plugins),
    allowed_connectors: asList(profile.allowed_connectors),
    allowed_commands: asList(profile.allowed_commands),
    allowed_skills: asList(profile.allowed_skills),
    allowed_subagents: asList(profile.allowed_subagents),
    runtime_defaults: profile.runtime_defaults || {},
    context_packs: asList(profile.context_packs).map((pack) => ({
      id: pack?.id || "",
      required_for: asList(pack?.required_for),
      read_paths: asList(pack?.read_paths),
      write_paths: asList(pack?.write_paths),
      blocked_reads: asList(pack?.blocked_reads),
    })),
    gate_execution: profile.gate_execution || {},
    allowed_claude_tools: asList(allowedTools),
    forbidden_surfaces: asList(profile.forbidden_surfaces),
    memory: profile.memory || {},
  };
}

export function buildRunReportMarkdown({
  runId,
  state,
  startedAt,
  endedAt,
  workItem,
  contractFields = {},
  runtime,
  command,
  exitCode,
  stdout,
  stderr,
  changedFiles = [],
  streamPath,
  heartbeatCount = 0,
  interventions = [],
  dryRun,
  reportPath,
  workerStateReason = "",
  workerDeclaredState = "",
  streamHealth,
  allowedWriteScope,
}) {
  const seq = formatPlaneWorkItemSequence(workItem);
  const streamSummary = streamHealth?.summary || {};
  const streamHealthLabel = streamHealth ? (streamHealth.ok ? "PASS" : "NEEDS_HUMAN") : "";
  const outOfScopeFiles = allowedWriteScope?.out_of_scope_files || [];
  const workerAttributedChangedFiles = allowedWriteScope?.worker_attributed_changed_files || [];
  const externalChangedFiles = allowedWriteScope?.external_changed_files || [];
  return [
    `# Runtime Dispatcher v1.2 Run Report - ${seq}`,
    "",
    "| Field | Value |",
    "|---|---|",
    `| dispatcher_run_id | ${runId} |`,
    `| state | ${state} |`,
    `| runtime | ${runtime} |`,
    `| started_at | ${startedAt} |`,
    `| ended_at | ${endedAt} |`,
    `| work_item | ${seq} |`,
    `| role | ${contractFields.role || contractFields.rolelabel || ""} |`,
    `| mode | ${contractFields.mode || ""} |`,
    `| capability_profile | ${contractFields.capabilityprofile || ""} |`,
    `| report_path | ${reportPath} |`,
    `| stream_path | ${streamPath || ""} |`,
    `| heartbeat_count | ${heartbeatCount} |`,
    `| worker_declared_state | ${workerDeclaredState || ""} |`,
    `| state_reason | ${workerStateReason || ""} |`,
    `| stream_health | ${streamHealthLabel} |`,
    `| stream_event_count | ${streamSummary.stream || 0} |`,
    `| allowed_write_drift_count | ${outOfScopeFiles.length} |`,
    `| worker_attributed_change_count | ${workerAttributedChangedFiles.length} |`,
    `| external_change_count | ${externalChangedFiles.length} |`,
    "",
    "## Command",
    "",
    "```text",
    command.join(" "),
    `exit_code=${exitCode}`,
    "```",
    "",
    "## Changed Files",
    "",
    changedFiles.length ? changedFiles.map((file) => `- ${file}`).join("\n") : "- none detected",
    "",
    "## Runtime Interventions",
    "",
    interventions.length
      ? interventions.map((item) => `- ${item.reason}: ${(item.files || []).join(", ") || item.detail || "n/a"}`).join("\n")
      : "- none",
    "",
    "## Stream Log",
    "",
    streamPath ? `- ${streamPath}` : "- none",
    "",
    "## Stream Health",
    "",
    streamHealth
      ? [
          `- verdict: ${streamHealth.ok ? "PASS" : "NEEDS_HUMAN"}`,
          `- reason_codes: ${streamHealth.reason_codes.length ? streamHealth.reason_codes.join(", ") : "none"}`,
          `- line_count: ${streamSummary.line_count || 0}`,
          `- stream_events: ${streamSummary.stream || 0}`,
          `- heartbeats: ${streamSummary.worker_heartbeat || 0}`,
          `- worker_exit_events: ${streamSummary.worker_exit || 0}`,
          `- redacted_secret_markers: ${streamSummary.redacted_secret_markers || 0}`,
          `- redacted_signature_markers: ${streamSummary.redacted_signature_markers || 0}`,
          `- redacted_thinking_markers: ${streamSummary.redacted_thinking_markers || 0}`,
        ].join("\n")
      : "- not evaluated",
    "",
    "## Allowed Write Scope",
    "",
    allowedWriteScope
      ? [
          `- allowed_path_count: ${(allowedWriteScope.effective_paths || []).length}`,
          `- worker_scope_guard_path_count: ${(allowedWriteScope.worker_scope_guard_paths || allowedWriteScope.effective_paths || []).length}`,
          `- changed_file_count: ${(allowedWriteScope.changed_files || []).length}`,
          `- worker_attributed_change_count: ${workerAttributedChangedFiles.length}`,
          `- external_change_count: ${externalChangedFiles.length}`,
          `- out_of_scope_change_count: ${outOfScopeFiles.length}`,
          ...(outOfScopeFiles.length ? outOfScopeFiles.map((file) => `- out_of_scope: ${file}`) : ["- out_of_scope: none"]),
          ...(externalChangedFiles.length ? externalChangedFiles.map((file) => `- external_changed: ${file}`) : ["- external_changed: none"]),
        ].join("\n")
      : "- not evaluated",
    "",
    "## Preflights",
    "",
    (dryRun?.preflights || []).map((item) => `- ${item.name}: ${item.state}${item.reason ? ` (${item.reason})` : ""}`).join("\n"),
    "",
    "## Stdout",
    "",
    "```text",
    redactRuntimeOutput(stdout).slice(0, 20000),
    "```",
    "",
    "## Stderr",
    "",
    "```text",
    redactRuntimeOutput(stderr).slice(0, 12000),
    "```",
    "",
    "## Stop Rules",
    "",
    "- No Plane Done transition by worker.",
    "- No merge, push, deploy or public publish by worker.",
    "- No production write by worker.",
    "- CAO/Controller review remains required.",
  ].join("\n");
}

export function buildWorkerReportedYaml({
  runId,
  state,
  workItem,
  reportPath,
  runtime,
  exitCode,
  changedFiles = [],
  streamPath,
  heartbeatCount = 0,
  interventions = [],
  startedAt,
  endedAt,
  workerDeclaredState = "",
  workerStateReason = "",
  streamHealth,
  outOfScopeFiles = [],
  workerOutputText = "",
  reportArtifactText = "",
}) {
  const seq = formatPlaneWorkItemSequence(workItem);
  const evidenceText = [
    workerOutputText,
    reportArtifactText || readReportArtifactText(reportPath),
  ].filter(Boolean).join("\n");
  const hasReflection = workerOutputHasTopLevelField(evidenceText, "reflection");
  const hasLearningProposals = workerOutputHasTopLevelField(evidenceText, "learning_proposals");
  return [
    "worker.reported:",
    "  version: dispatcher-v1.2",
    `  dispatcher_run_id: ${runId}`,
    `  state: ${state}`,
    `  work_item: ${seq}`,
    `  runtime: ${runtime}`,
    `  exit_code: ${exitCode}`,
    `  worker_declared_state: ${workerDeclaredState || "none"}`,
    `  state_reason: ${workerStateReason || "none"}`,
    `  started_at: ${startedAt}`,
    `  ended_at: ${endedAt}`,
    `  report_path: ${reportPath}`,
    `  stream_path: ${streamPath || "none"}`,
    `  heartbeat_count: ${heartbeatCount}`,
    `  stream_health: ${streamHealth ? (streamHealth.ok ? "PASS" : "NEEDS_HUMAN") : "not-evaluated"}`,
    `  stream_event_count: ${streamHealth?.summary?.stream || 0}`,
    `  redacted_signature_markers: ${streamHealth?.summary?.redacted_signature_markers || 0}`,
    `  out_of_scope_change_count: ${outOfScopeFiles.length}`,
    ...(hasReflection
      ? [
          "  reflection:",
          "    source: worker-output-or-report-artifact",
          "    present: true",
        ]
      : []),
    ...(hasLearningProposals
      ? [
          "  learning_proposals:",
          "    source: worker-output-or-report-artifact",
          "    present: true",
        ]
      : []),
    "  changed_files:",
    ...(changedFiles.length ? changedFiles.map((file) => `    - ${file}`) : ["    - none"]),
    "  interventions:",
    ...(interventions.length ? interventions.map((item) => `    - ${item.reason}`) : ["    - none"]),
    "  blocked_actions_remaining:",
    "    - plane-done",
    "    - merge",
    "    - push",
    "    - deploy",
    "    - production-write",
    "    - public-publish",
    "  next: cao-pass",
  ].join("\n");
}

export function buildRunSummaryYaml({
  runId,
  state,
  workItem,
  reportPath,
  streamPath,
  runtime,
  startedAt,
  endedAt,
  workerDeclaredState = "",
  workerStateReason = "",
  heartbeatCount = 0,
  streamHealth,
  outOfScopeFiles = [],
}) {
  const seq = formatPlaneWorkItemSequence(workItem);
  return [
    "worker.run-summary:",
    "  version: dispatcher-v1.2",
    `  dispatcher_run_id: ${runId}`,
    `  state: ${state}`,
    `  runtime: ${runtime}`,
    `  work_item: ${seq}`,
    `  started_at: ${startedAt}`,
    `  ended_at: ${endedAt}`,
    `  worker_declared_state: ${workerDeclaredState || "none"}`,
    `  state_reason: ${workerStateReason || "none"}`,
    `  heartbeat_count: ${heartbeatCount}`,
    `  stream_health: ${streamHealth ? (streamHealth.ok ? "PASS" : "NEEDS_HUMAN") : "not-evaluated"}`,
    `  stream_event_count: ${streamHealth?.summary?.stream || 0}`,
    `  redacted_signature_markers: ${streamHealth?.summary?.redacted_signature_markers || 0}`,
    `  out_of_scope_change_count: ${outOfScopeFiles.length}`,
    `  report_path: ${reportPath}`,
    `  stream_path: ${streamPath || "none"}`,
  ].join("\n");
}

export function buildAgentEventRow({
  eventType,
  runId,
  workItem,
  contractFields = {},
  workspacePath,
  artifactPaths = [],
  payload = {},
  occurredAt = new Date().toISOString(),
}) {
  const role = contractFields.role || contractFields.rolelabel || "role:unknown";
  return {
    schema_version: "agent-event/v1",
    event_id: randomUUID(),
    event_type: eventType,
    occurred_at: occurredAt,
    producer: "runtime-dispatcher-v1.2",
    workspace: contractFields.workspace || "",
    workspace_path: workspacePath,
    issue_id: formatPlaneWorkItemSequence(workItem),
    run_id: runId,
    session_id: runId,
    agent: contractFields.agent || "",
    mode: contractFields.mode || "",
    role_owner: role,
    department: String(role).replace(/^role:/, ""),
    autonomy_level: contractFields.autonomylevel || contractFields.autonomy_level || "L2",
    event_policy: "runtime-dispatcher-v1.2",
    payload,
    artifact_paths: artifactPaths,
    linear_comment_ids: [],
    human_gate_required: String(contractFields.humangate || contractFields.human_gate || "").toUpperCase() !== "HG-0",
    redaction_level: "standard",
  };
}

function asList(value) {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value;
  return String(value).split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
}

function uniquePaths(paths) {
  return [...new Set(paths.map((item) => resolve(item)))];
}

function normalizeWorkspacePath(token, workspacePath) {
  const cleaned = cleanPathToken(token);
  if (!cleaned) return "";
  if (isAbsolute(cleaned)) return resolve(cleaned);
  if (cleaned.startsWith("./")) return resolve(workspacePath, cleaned.slice(2));
  if (/^(docs|scripts|reports|metrics|registries|kits|runtime)\//.test(cleaned)) {
    return resolve(workspacePath, cleaned);
  }
  return "";
}

function cleanPathToken(token) {
  return String(token || "")
    .trim()
    .replace(/^[`'"]+|[`'"]+$/g, "")
    .replace(/[),.;:\]]+$/g, "");
}

function extractPathLikeTokens(value) {
  const text = String(value || "");
  const tokens = [];
  const matcher = /(?:^|[\s(["'`])((?:\/[A-Za-z0-9._/-]+)|(?:(?:\.\/)?(?:docs|scripts|reports|metrics|registries|kits|runtime)\/[A-Za-z0-9._/-]+)|(?:[A-Za-z0-9._/-]+\.(?:md|mjs|js|json|jsonl|ts|tsx|css|html|yml|yaml)))/g;
  let match;
  while ((match = matcher.exec(text))) tokens.push(cleanPathToken(match[1]));
  return tokens;
}

function isPathAllowed(file, allowedPath) {
  const normalizedFile = resolve(file);
  const normalizedAllowed = resolve(allowedPath);
  if (normalizedFile === normalizedAllowed) return true;
  return normalizedFile.startsWith(normalizedAllowed.endsWith(sep) ? normalizedAllowed : `${normalizedAllowed}${sep}`);
}
