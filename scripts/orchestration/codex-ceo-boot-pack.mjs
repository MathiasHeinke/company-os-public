#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const BOOT_PACK_VERSION = "codex-ceo-boot-pack/v0";

export const BOOT_PACK_REQUIRED_PATHS = Object.freeze([
  "AGENTS.md",
  "docs/system-index.md",
  "docs/page-index.md",
  "CHANGELOG.md",
  "ROADMAP.md",
  "VERSION",
  "docs/orchestration/plane-first-linear-bridge.md",
  "docs/orchestration/plane-role-routing.md",
  "docs/operations/global-plane-auth-bridge.md",
  "docs/orchestration/contract-controller.md",
  "docs/orchestration/contract-remediation-router.md",
  "docs/orchestration/plane-worker-dispatcher-v0.md",
  "docs/orchestration/company-os-runtime-dispatcher-v1.md",
  "docs/orchestration/headless-worker-runtime-boot-contract.md",
  "docs/orchestration/spec-to-worker-pipeline.md",
  "docs/orchestration/claude-clevel-worker-runtime.md",
  "docs/orchestration/multi-inference-c-level-runtime.md",
  "docs/orchestration/runtime-inference-router.md",
  "docs/orchestration/codex-controller-runtime.md",
  "docs/orchestration/codex-ceo-cli-boot-pack.md",
  "docs/agents/cao.md",
  "docs/templates/worker-issue-contract.md",
  "docs/governance/ceo-release-authority.md",
  "docs/governance/fast-lane-flight-doctrine.md",
]);

const DEFAULT_ROOT = "${LOCAL_WORKSPACE}";
const DEFAULT_USER_CODEX_RULES = `${process.env.HOME || "${LOCAL_WORKSPACE}"}/.codex/AGENTS.md`;

export function buildCodexCeoBootPack({
  root = DEFAULT_ROOT,
  objective = "",
  now = new Date(),
  env = process.env,
  includeUserCodexRules = true,
  userCodexRulesPath = DEFAULT_USER_CODEX_RULES,
  maxBytesPerFile = 180_000,
} = {}) {
  const workspaceRoot = resolve(root);
  const requiredFiles = BOOT_PACK_REQUIRED_PATHS.map((path) => readBootFile({
    root: workspaceRoot,
    path,
    required: true,
    maxBytesPerFile,
  }));
  const optionalFiles = includeUserCodexRules
    ? [readBootFile({
        root: workspaceRoot,
        path: userCodexRulesPath,
        required: false,
        source: "runtime-local-user-codex-rules",
        maxBytesPerFile,
      })].filter((file) => file.exists)
    : [];
  const sourceFiles = [...requiredFiles, ...optionalFiles];
  const missingRequiredFiles = sourceFiles
    .filter((file) => file.required && !file.exists)
    .map((file) => file.path);
  const ok = missingRequiredFiles.length === 0;
  const auth = {
    subscription_lane: "preferred",
    api_lane: env.OPENAI_API_KEY ? "available-explicit-fallback" : "unavailable",
    api_key_present: Boolean(env.OPENAI_API_KEY),
    api_key_value: "[never included]",
    fallback_rule: "Do not switch to API billing silently; require explicit CostCeiling/MaxSpend/HumanGate.",
  };
  const pack = {
    version: BOOT_PACK_VERSION,
    ok,
    identity: "codex-ceo-orchestrator",
    generated_at: now.toISOString(),
    run_id: randomUUID(),
    workspace_root: workspaceRoot,
    objective: String(objective || "").trim() || "Review Company.OS controller state and propose the next safe action.",
    auth,
    missing_required_files: missingRequiredFiles,
    source_files: sourceFiles,
  };
  pack.prompt = buildPrompt(pack);
  pack.prompt_sha256 = sha256(pack.prompt);
  return pack;
}

export function buildCodexExecCommand({
  root = DEFAULT_ROOT,
  promptPath,
  model = "gpt-5.5",
  approval = "never",
  sandbox = "workspace-write",
  authLane = "subscription",
} = {}) {
  const command = [
    "codex",
    "exec",
    "--cd",
    root,
    "--model",
    model,
    "--ask-for-approval",
    approval,
    "--sandbox",
    sandbox,
  ];
  if (authLane === "api") command.unshift("CODEX_AUTH_LANE=api");
  command.push(`"$(cat ${shellQuote(promptPath)})"`);
  return command;
}

function readBootFile({
  root,
  path,
  required,
  source = "repo",
  maxBytesPerFile,
}) {
  const absolutePath = isAbsolute(path) ? path : join(root, path);
  const publicPath = isAbsolute(path) ? path : path;
  if (!existsSync(absolutePath)) {
    return {
      path: publicPath,
      absolute_path: absolutePath,
      source,
      required,
      exists: false,
      bytes: 0,
      sha256: "",
      truncated: false,
      content: "",
    };
  }
  const raw = readFileSync(absolutePath, "utf8");
  const bytes = Buffer.byteLength(raw, "utf8");
  const truncated = bytes > maxBytesPerFile;
  const content = truncated ? raw.slice(0, maxBytesPerFile) : raw;
  return {
    path: publicPath,
    absolute_path: absolutePath,
    source,
    required,
    exists: true,
    bytes,
    sha256: sha256(raw),
    truncated,
    content,
  };
}

function buildPrompt(pack) {
  const header = [
    "You are the Company.OS Codex CEO/Orchestrator running headless via Codex CLI.",
    "",
    "Your job is to be as context-complete as the interactive Codex CEO session by using this boot pack as your loaded memory surface.",
    "Do not assume hidden chat memory. If a fact is not in the boot pack, Plane, Honcho, GitNexus, or the target repo, mark it as unknown.",
    "",
    "Objective:",
    pack.objective,
    "",
    "Hard rules:",
    "- Plane is the canonical execution ledger for Company.OS/cross-workspace orchestration.",
    "- Prefer native Plane connector tools when exposed; otherwise use the Global Plane Auth Bridge commands included below.",
    "- Do not silently fall back to Linear.",
    "- Do not silently switch to OpenAI API billing when subscription/Codex plan quota is exhausted.",
    "- If API fallback is needed, require explicit MaxSpend/CostCeiling/HumanGate and report it as a separate cost lane.",
    "- Do not mark Plane Done unless the CEO/Founder release doctrine explicitly allows it.",
    "- Do not spawn workers from weak contracts; require Stage 0.5/0.6 and CAO/controller gates.",
    "- Codex as CEO/controller is not the same identity as Codex as future worker.",
    "- Non-Claude worker lanes remain blocked unless adapter, stream health, capability profile, CAO tests and cost/event taxonomy are proven.",
    "",
    "Required first response shape:",
    "```yaml",
    "boot_context_proof:",
    "  boot_pack_version: " + pack.version,
    "  source_file_count: " + pack.source_files.filter((file) => file.exists).length,
    "  missing_required_files: " + (pack.missing_required_files.length ? pack.missing_required_files.join(", ") : "none"),
    "  plane_access_path: native-connector | global-plane-auth-bridge | blocked",
    "  gitnexus_status: up-to-date | stale | unavailable",
    "  memory_status: boot-pack | honcho-read | unavailable",
    "  auth_lane: subscription | api-explicit | blocked",
    "  next_action: <one concrete action>",
    "```",
    "",
  ].join("\n");

  const body = pack.source_files.map((file) => [
    `--- SOURCE ${file.path}`,
    `source: ${file.source}`,
    `required: ${file.required}`,
    `exists: ${file.exists}`,
    `sha256: ${file.sha256 || "missing"}`,
    `bytes: ${file.bytes}`,
    `truncated: ${file.truncated}`,
    "```markdown",
    file.content || "",
    "```",
    "",
  ].join("\n")).join("\n");

  const footer = [
    "End of boot pack.",
    "Before acting, classify whether the request belongs in ActiveContext, Wiki/ADR, Honcho, GitNexus, Plane, or Linear bridge.",
    "If execution is requested, produce a dispatch-safe plan or a controller decision; do not guess missing state.",
  ].join("\n");

  return `${pack.ok ? "" : "BOOT PACK INCOMPLETE: missing required source files. Stop before controller decisions.\n\n"}${header}${body}${footer}\n`;
}

function sha256(value) {
  return createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function shellQuote(value) {
  const raw = String(value || "");
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(raw)) return raw;
  return `'${raw.replace(/'/g, "'\\''")}'`;
}

function parseArgs(argv) {
  const args = {
    root: DEFAULT_ROOT,
    objective: "",
    outDir: "",
    json: false,
    printCommand: false,
    authLane: "subscription",
    includeUserCodexRules: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root") args.root = argv[++i] || DEFAULT_ROOT;
    else if (arg === "--objective") args.objective = argv[++i] || "";
    else if (arg === "--out-dir") args.outDir = argv[++i] || "";
    else if (arg === "--json") args.json = true;
    else if (arg === "--print-command") args.printCommand = true;
    else if (arg === "--auth-lane") args.authLane = argv[++i] || "subscription";
    else if (arg === "--no-user-codex-rules") args.includeUserCodexRules = false;
    else if (arg === "--help" || arg === "-h") args.help = true;
  }
  return args;
}

function usage() {
  return `Usage:
  node scripts/orchestration/codex-ceo-boot-pack.mjs \\
    --objective "Review Plane controller queue" \\
    [--out-dir runtime/codex-ceo/<run>] [--auth-lane subscription|api] \\
    [--print-command] [--json]

Writes a local, gitignored Codex CEO boot prompt + manifest. It does not call
Codex unless you run the printed command yourself.
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const pack = buildCodexCeoBootPack({
    root: args.root,
    objective: args.objective,
    includeUserCodexRules: args.includeUserCodexRules,
  });
  const outDir = resolve(args.outDir || join(args.root, "runtime", "codex-ceo", pack.run_id));
  const promptPath = join(outDir, "prompt.md");
  const manifestPath = join(outDir, "manifest.json");
  mkdirSync(dirname(promptPath), { recursive: true });
  writeFileSync(promptPath, pack.prompt, "utf8");
  writeFileSync(manifestPath, JSON.stringify({ ...pack, prompt: undefined }, null, 2), "utf8");
  const command = buildCodexExecCommand({
    root: pack.workspace_root,
    promptPath,
    authLane: args.authLane,
  });
  const result = {
    ok: pack.ok,
    version: pack.version,
    run_id: pack.run_id,
    prompt_path: promptPath,
    manifest_path: manifestPath,
    prompt_sha256: pack.prompt_sha256,
    missing_required_files: pack.missing_required_files,
    command: args.printCommand ? command.join(" ") : undefined,
  };
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`codex-ceo-boot-pack: ${result.ok ? "PASS" : "BLOCKED"}`);
    console.log(`prompt: ${promptPath}`);
    console.log(`manifest: ${manifestPath}`);
    if (result.missing_required_files.length) console.log(`missing: ${result.missing_required_files.join(", ")}`);
    if (args.printCommand) console.log(command.join(" "));
  }
  if (!pack.ok) process.exitCode = 2;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) main();
