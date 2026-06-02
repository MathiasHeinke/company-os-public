import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  buildRaindropCallSummaryFromModelRouterResult,
  writeRaindropCallSummary,
} from "../orchestration/raindrop-call-adapter.mjs";

export const ROUTER_VERSION = "codex-cost-router/v0";

export const DEFAULT_WORKSPACE = "${LOCAL_WORKSPACE}";
export const DEFAULT_CLAUDE_BINARY = "${LOCAL_WORKSPACE}";
export const DEFAULT_GEMINI_BINARY = "${LOCAL_WORKSPACE}";
export const CLAUDE_AUDIT_FIRST_RECHECK_SECONDS = 300;
export const CLAUDE_AUDIT_EXPECT_OUTPUT_AFTER_SECONDS = 600;
export const CLAUDE_AUDIT_TIMEOUT_MS = 1_800_000;
export const MAX_PERSISTED_WORKER_LOG_CHARS = 200_000;

export const TASK_MODES = {
  "issue-triage": {
    label: "Issue triage",
    defaultModels: ["grok"],
    instruction: "Classify priority, blockers, next concrete step, and whether escalation is needed.",
  },
  "diff-review": {
    label: "Diff review",
    defaultModels: ["grok", "deepseek"],
    instruction: "Review a bounded diff for regressions, missing tests, and risky assumptions.",
  },
  "implementation-plan": {
    label: "Implementation plan",
    defaultModels: ["grok"],
    instruction: "Produce a compact implementation plan with files, gates, risks, and human gates.",
  },
  "test-generation": {
    label: "Test generation",
    defaultModels: ["deepseek"],
    instruction: "Find missing test cases and propose focused tests without editing files.",
  },
  "spec-drift": {
    label: "Spec drift audit",
    defaultModels: ["deepseek"],
    instruction: "Compare source-of-truth requirements with current implementation notes and identify drift.",
  },
  "morning-briefing-redacted": {
    label: "Morning briefing redacted worker",
    defaultModels: ["grok", "deepseek"],
    instruction: "Analyze only the redacted priorities provided. Do not infer or request private context.",
  },
  "external-audit": {
    label: "External audit",
    defaultModels: ["claude"],
    instruction: "Run a high-signal read-only audit and return findings with severity and evidence.",
  },
};

export const MODEL_PROFILES = {
  grok: {
    label: "Grok 4.3 via OpenRouter",
    kind: "codex-openrouter",
    model: "x-ai/grok-4.3",
    reasoningEffort: "xhigh",
    reportName: "grok-4-3",
    privacy: "external",
  },
  deepseek: {
    label: "DeepSeek V4 Pro via OpenRouter",
    kind: "codex-openrouter",
    model: "deepseek/deepseek-v4-pro",
    reasoningEffort: "xhigh",
    reportName: "deepseek-v4-pro",
    privacy: "external",
  },
  claude: {
    label: "Claude Opus Max CLI",
    kind: "claude-cli",
    model: "opus",
    reportName: "claude-opus-4-7",
    privacy: "external",
    firstRecheckSeconds: CLAUDE_AUDIT_FIRST_RECHECK_SECONDS,
    expectOutputAfterSeconds: CLAUDE_AUDIT_EXPECT_OUTPUT_AFTER_SECONDS,
    timeoutMs: CLAUDE_AUDIT_TIMEOUT_MS,
  },
  gemini: {
    label: "Gemini 3.1 Pro Preview CLI",
    kind: "gemini-cli",
    model: "gemini-3.1-pro-preview",
    reportName: "gemini-3-1-pro-preview",
    privacy: "external",
  },
};

const SECRET_PATTERNS = [
  { id: "openrouter_key", pattern: /sk-or-v1-[A-Za-z0-9._-]+/ },
  { id: "openai_or_compatible_key", pattern: /\bsk-[A-Za-z0-9._-]{20,}\b/ },
  { id: "xai_key", pattern: /\bxai-[A-Za-z0-9._-]{20,}\b/ },
  { id: "honcho_token", pattern: /\bhch-v3-[A-Za-z0-9._-]+/ },
  { id: "jwt", pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/ },
  { id: "private_key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { id: "secret_env_name", pattern: /\b(OPENAI_API_KEY|OPENROUTER_API_KEY|XAI_API_KEY|ANTHROPIC_API_KEY|SUPABASE_SERVICE_ROLE|HONCHO_AUTH_HEADER)\b/ },
];

const PRIVATE_PATTERNS = [
  { id: "mh_dev_path", pattern: /\/Users\/mathiasheinke\/Developer\/[SOURCE_WORKSPACE]\b/ },
  { id: "private_finance", pattern: /\b(Finanzamt|finance-decisions|Cashflow|Stundung|private tax|Steuer)\b/i },
  { id: "customer_or_health", pattern: /\b(UKHD|Salem|patient|Patient|MDR|Rx|medical|Gesundheit|health data)\b/ },
  { id: "personal_memory", pattern: /\b(honcho_personal|mathias-personal|life-strategy|relationships|personal memory)\b/i },
  { id: "email_address", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
];

function globalPattern(pattern) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
}

export function localParts(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hhmm: `${parts.hour}${parts.minute}` };
}

export function slugify(value) {
  return String(value || "run")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "run";
}

export function parseModelList(value, mode = "issue-triage") {
  if (!value) return [...(TASK_MODES[mode]?.defaultModels || ["grok"])];
  const models = String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  for (const model of models) {
    if (!MODEL_PROFILES[model]) throw new Error(`Unknown model alias: ${model}`);
  }
  return models;
}

export function redactSecrets(text) {
  let output = String(text ?? "");
  for (const item of SECRET_PATTERNS) {
    output = output.replace(globalPattern(item.pattern), `[REDACTED:${item.id}]`);
  }
  return output;
}

export function sanitizeWorkerOutput(text, { maxChars = MAX_PERSISTED_WORKER_LOG_CHARS } = {}) {
  let output = redactSecrets(text);
  const privateHits = [];
  for (const item of PRIVATE_PATTERNS) {
    if (item.pattern.test(output)) privateHits.push(item.id);
    output = output.replace(globalPattern(item.pattern), `[REDACTED_PRIVATE:${item.id}]`);
  }
  const truncated = output.length > maxChars;
  if (truncated) output = `${output.slice(0, maxChars)}\n[TRUNCATED:${output.length - maxChars} chars]\n`;
  return { text: output, truncated, privateHits };
}

export function detectPromptRisk(text) {
  const source = String(text ?? "");
  const secretBlockers = SECRET_PATTERNS.filter((item) => item.pattern.test(source)).map((item) => item.id);
  const privateBlockers = PRIVATE_PATTERNS.filter((item) => item.pattern.test(source)).map((item) => item.id);
  return {
    ok: secretBlockers.length === 0 && privateBlockers.length === 0,
    secretBlockers,
    privateBlockers,
  };
}

export function buildWorkerPrompt({ mode, prompt, issueId = "", source = "" }) {
  const task = TASK_MODES[mode] || TASK_MODES["issue-triage"];
  return [
    `# Worker Task (${ROUTER_VERSION})`,
    "",
    `Mode: ${mode}`,
    issueId ? `Issue: ${issueId}` : "",
    source ? `Source: ${source}` : "",
    "",
    "You are a bounded read-only worker. Do not edit files. Do not update Linear.",
    "Do not call external tools unless explicitly instructed by the prompt.",
    "If the prompt contains secrets, private personal data, customer data, health data, or raw credentials, return BLOCKED_PRIVACY instead of analyzing it.",
    "",
    "## Worker Instruction",
    task.instruction,
    "",
    "## Input",
    prompt.trim(),
    "",
    "## Required Output",
    "- Verdict",
    "- Key findings",
    "- Recommended next action",
    "- Risks and gates",
    "- Escalate-to-GPT-5.5 items",
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildCodexOpenRouterArgs({ profile, workspace }) {
  return [
    "exec",
    "--ignore-user-config",
    "--ignore-rules",
    "--ephemeral",
    "--skip-git-repo-check",
    "-C",
    workspace,
    "-m",
    profile.model,
    "-c",
    'model_provider="openrouter"',
    "-c",
    'model_providers.openrouter.name="OpenRouter"',
    "-c",
    'model_providers.openrouter.base_url="https://openrouter.ai/api/v1"',
    "-c",
    'model_providers.openrouter.env_key="OPENROUTER_API_KEY"',
    "-c",
    'model_providers.openrouter.wire_api="responses"',
    "-c",
    "model_providers.openrouter.requires_openai_auth=false",
    "-c",
    `model_reasoning_effort="${profile.reasoningEffort}"`,
  ];
}

export function buildClaudeArgs({ prompt, profile = MODEL_PROFILES.claude }) {
  return [
    "-p",
    prompt,
    "--model",
    profile.model,
    "--permission-mode",
    "plan",
    "--output-format",
    "text",
    "--max-turns",
    "30",
    "--mcp-config",
    '{"mcpServers":{}}',
    "--strict-mcp-config",
    "--no-session-persistence",
  ];
}

export function buildGeminiArgs({ prompt, profile = MODEL_PROFILES.gemini }) {
  return [
    "--skip-trust",
    "-p",
    prompt,
    "-m",
    profile.model,
    "--approval-mode",
    "plan",
    "--output-format",
    "text",
  ];
}

export function buildDefaultOutDir({ companyRoot = DEFAULT_WORKSPACE, mode, issueId = "", now = new Date() }) {
  const parts = localParts(now);
  const suffix = slugify([parts.hhmm, mode, issueId].filter(Boolean).join("-"));
  return path.join(companyRoot, "reports", "model-router", parts.date, suffix);
}

export function buildRunPlan({
  mode = "issue-triage",
  models,
  prompt,
  workspace = DEFAULT_WORKSPACE,
  issueId = "",
  source = "",
  outDir = "",
  allowPrivate = false,
  now = new Date(),
}) {
  if (!TASK_MODES[mode]) throw new Error(`Unknown mode: ${mode}`);
  const selectedModels = parseModelList(models, mode);
  const risk = detectPromptRisk(prompt);
  const secretBlocked = risk.secretBlockers.length > 0;
  const privateBlocked = risk.privateBlockers.length > 0 && !allowPrivate;
  const blocked = secretBlocked || privateBlocked;
  const resolvedOutDir = outDir || buildDefaultOutDir({ companyRoot: DEFAULT_WORKSPACE, mode, issueId, now });
  return {
    version: ROUTER_VERSION,
    mode,
    issueId,
    source,
    workspace: path.resolve(workspace),
    outDir: path.resolve(resolvedOutDir),
    models: selectedModels,
    risk,
    allowPrivate,
    blocked,
    blockReason: secretBlocked ? "secret_detected" : privateBlocked ? "private_context_requires_explicit_allow_private" : "",
    workerPrompt: buildWorkerPrompt({ mode, prompt, issueId, source }),
  };
}

export function runCommand({ command, args, cwd, env = process.env, input = "", timeoutMs = 900_000 }) {
  return spawnSync(command, args, {
    cwd,
    env,
    input,
    timeout: timeoutMs,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

export function runModelWorker({
  modelAlias,
  plan,
  env = process.env,
  commandRunner = runCommand,
  codexBinary = "codex",
  claudeBinary = DEFAULT_CLAUDE_BINARY,
  geminiBinary = DEFAULT_GEMINI_BINARY,
}) {
  const profile = MODEL_PROFILES[modelAlias];
  if (!profile) throw new Error(`Unknown model alias: ${modelAlias}`);

  if (profile.kind === "codex-openrouter") {
    return commandRunner({
      command: codexBinary,
      args: buildCodexOpenRouterArgs({ profile, workspace: plan.workspace }),
      cwd: plan.workspace,
      env,
      input: plan.workerPrompt,
      timeoutMs: 900_000,
    });
  }

  if (profile.kind === "claude-cli") {
    return commandRunner({
      command: claudeBinary,
      args: buildClaudeArgs({ prompt: plan.workerPrompt, profile }),
      cwd: plan.workspace,
      env,
      input: "",
      timeoutMs: profile.timeoutMs ?? CLAUDE_AUDIT_TIMEOUT_MS,
    });
  }

  if (profile.kind === "gemini-cli") {
    return commandRunner({
      command: geminiBinary,
      args: buildGeminiArgs({ prompt: plan.workerPrompt, profile }),
      cwd: plan.workspace,
      env,
      input: "",
      timeoutMs: 1_800_000,
    });
  }

  throw new Error(`Unsupported model kind: ${profile.kind}`);
}

export function writeRunFiles({ plan, prompt, results = [] }) {
  fs.mkdirSync(plan.outDir, { recursive: true });
  const promptText = plan.blocked
    ? [
        "# Prompt Not Stored",
        "",
        "The router blocked this run before worker dispatch. The original prompt was intentionally not persisted.",
        "",
        `BlockReason: ${plan.blockReason || "blocked"}`,
        `SecretBlockers: ${plan.risk.secretBlockers.join(", ") || "none"}`,
        `PrivateBlockers: ${plan.risk.privateBlockers.join(", ") || "none"}`,
        "",
      ].join("\n")
    : `${prompt.trim()}\n`;
  const workerPromptText = plan.blocked
    ? [
        "# Worker Prompt Not Stored",
        "",
        "The worker prompt includes the blocked input and was intentionally not persisted.",
        "",
      ].join("\n")
    : `${redactSecrets(plan.workerPrompt)}\n`;
  fs.writeFileSync(path.join(plan.outDir, "prompt.md"), promptText);
  fs.writeFileSync(path.join(plan.outDir, "worker-prompt.md"), workerPromptText);
  fs.writeFileSync(
    path.join(plan.outDir, "manifest.json"),
    `${JSON.stringify(
      {
        version: plan.version,
        mode: plan.mode,
        issueId: plan.issueId,
        source: plan.source,
        workspace: plan.workspace,
        models: plan.models,
        risk: plan.risk,
        allowPrivate: plan.allowPrivate,
        blocked: plan.blocked,
        blockReason: plan.blockReason,
        budget: plan.budget ?? null,
        results: results.map((item) => ({
          model: item.model,
          exitCode: item.exitCode,
          timedOut: item.timedOut,
          report: item.report,
          stderr: item.stderr,
          meta: item.meta,
          raindrop: item.raindrop || null,
        })),
        workerRuntimePolicy: plan.models.includes("claude")
          ? {
              claudeFirstRecheckSeconds: CLAUDE_AUDIT_FIRST_RECHECK_SECONDS,
              claudeExpectOutputAfterSeconds: CLAUDE_AUDIT_EXPECT_OUTPUT_AFTER_SECONDS,
              claudeTimeoutMs: CLAUDE_AUDIT_TIMEOUT_MS,
            }
          : undefined,
      },
      null,
      2,
    )}\n`,
  );
}

export function persistModelResult({ plan, modelAlias, result }) {
  const profile = MODEL_PROFILES[modelAlias];
  const basename = profile.reportName;
  fs.mkdirSync(plan.outDir, { recursive: true });
  const stdoutPath = path.join(plan.outDir, `${basename}.md`);
  const stderrPath = path.join(plan.outDir, `${basename}.stderr.log`);
  const metaPath = path.join(plan.outDir, `${basename}.json`);
  const timedOut = result.error?.code === "ETIMEDOUT" || result.signal === "SIGTERM";
  const exitCode = result.status ?? null;
  const stdout = sanitizeWorkerOutput(result.stdout || "");
  const stderr = sanitizeWorkerOutput(result.stderr || "");

  fs.writeFileSync(stdoutPath, stdout.text);
  fs.writeFileSync(stderrPath, stderr.text);
  fs.writeFileSync(
    metaPath,
    `${JSON.stringify(
      {
        model: modelAlias,
        label: profile.label,
        exitCode,
        signal: result.signal ?? "",
        timedOut,
        error: result.error?.message ?? "",
        logIsolation: {
          maxPersistedWorkerLogChars: MAX_PERSISTED_WORKER_LOG_CHARS,
          stdoutTruncated: stdout.truncated,
          stderrTruncated: stderr.truncated,
          stdoutPrivateHits: stdout.privateHits,
          stderrPrivateHits: stderr.privateHits,
        },
      },
      null,
      2,
    )}\n`,
  );
  return { model: modelAlias, exitCode, timedOut, report: stdoutPath, stderr: stderrPath, meta: metaPath };
}

export function buildModelRouterRaindropOutputDir({ plan }) {
  const outDir = path.resolve(plan?.outDir || "");
  const marker = `${path.sep}reports${path.sep}model-router${path.sep}`;
  const index = outDir.indexOf(marker);
  if (index === -1) return path.join(outDir, "raindrop");
  const root = outDir.slice(0, index);
  const rest = outDir.slice(index + marker.length);
  const [date] = rest.split(path.sep);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return path.join(outDir, "raindrop");
  return path.join(root, "reports", "observability", "raindrop-workshop", date);
}

export function persistModelRouterRaindropSummary({
  plan,
  modelAlias,
  result,
  persisted,
  startedAt,
  endedAt,
  outputDir = "",
}) {
  const profile = MODEL_PROFILES[modelAlias];
  if (!profile) throw new Error(`Unknown model alias: ${modelAlias}`);
  const runId = `${path.basename(plan.outDir)}.${modelAlias}`;
  const summary = buildRaindropCallSummaryFromModelRouterResult({
    runId,
    plan,
    modelAlias,
    profile,
    result,
    persisted,
    startedAt,
    endedAt,
  });
  const artifacts = writeRaindropCallSummary(
    summary,
    outputDir || buildModelRouterRaindropOutputDir({ plan }),
    { runId },
  );
  return {
    ...artifacts,
    surface: summary["raindrop.llm_call_summary"].surface,
  };
}
