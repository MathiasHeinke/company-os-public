#!/usr/bin/env node

/*
 * runtime-dispatcher-v1.mjs
 *
 * Runtime Dispatcher v1.
 *
 * Reads a Plane work item that has already been validated and locked by
 * dispatcher-v0, runs the hard preflights from the v1 doctrine, and either
 * prints the structured run-summary (`--mode dry-run`) or executes one
 * bounded local runtime (`--mode run`).
 *
 * Hard guarantees:
 *   - dry-run mode never spawns Claude / Codex / Gemini / OpenRouter or any worker
 *   - run mode spawns exactly one bounded runtime
 *   - never transitions a Plane work item state
 *   - never writes Linear or sets Done
 *   - never enables cron, schedules, or webhooks
 *   - never reads or prints secrets
 *
 * Source of truth:
 *   docs/orchestration/company-os-runtime-dispatcher-v1.md (canonical doctrine)
 *   docs/orchestration/plane-worker-dispatcher-v0.md (lock source)
 *   docs/templates/worker-issue-contract.md (contract surface)
 */

import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative as relativePath, resolve as resolvePath, sep } from "node:path";
import {
  DEFAULT_BASE_URL,
  PLANE_API_KEY_ACCOUNT,
  PLANE_API_KEY_SERVICE,
  PLANE_APP_BOT_TOKEN_ACCOUNT,
  PLANE_APP_SERVICE,
  resolvePlaneAuth,
} from "../plane/plane-auth.mjs";
import { extractContractBlock } from "./worker-ledger-validator.mjs";
import {
  CAPABILITY_REASONS,
  DEFAULT_CAPABILITY_REGISTRY_PATH,
  evaluateCapabilityProfile,
  loadCapabilityRegistry,
} from "../capabilities/capability-registry-core.mjs";
import {
  RUNTIME_READY_VERDICTS,
  evaluateRuntimeExecutability,
} from "./contract-controller.mjs";
import {
  canonicalDescriptionHash,
  descriptionHashCandidates,
  extractLockDescriptionHash,
  htmlEscape,
  parseYamlScalar,
  stripHtml,
} from "./plane-html.mjs";
import {
  buildAgentEventRow,
  buildClaudeRuntimeArgs,
  buildRunReportMarkdown,
  buildRunSummaryYaml,
  buildWorkerPrompt,
  buildWorkerReportedYaml,
  deriveRuntimeRunReportPath,
  deriveRuntimeStreamPath,
  detectRuntimeToolScopeViolations,
  detectRuntimeToolWriteScopeViolations,
  detectOutOfScopeFiles,
  evaluateGateToolAllowlist,
  extractRuntimeToolWritePaths,
  extractDeclaredArtifactPath,
  findDeclaredAbsolutePath,
  formatPlaneWorkItemSequence,
  inferRuntimeStateFromWorkerOutput,
  parseRuntimeDurationMs,
  redactRuntimeOutput,
  resolveClaudeAllowedTools,
  resolveAllowedReadPaths,
  resolveEffectiveAllowedReadPaths,
  reportParentDir,
  resolveAllowedWritePaths,
  resolveKillSwitchPaths,
  resolveRuntimeMaxTurns,
  resolveRuntimeWorkspacePath,
  sanitizeRuntimeCommandArgs,
  evaluateRuntimeStreamHealth,
  splitChangedFilesByRuntimeAttribution,
  summarizeRuntimeStreamLog,
} from "./runtime-dispatcher-v12-core.mjs";
import {
  DEFAULT_INFERENCE_REGISTRY_PATH,
  loadInferenceRegistry,
  routeInference,
} from "./inference-router.mjs";
import { validateAgentEventRow } from "../agent-events/agent-event-core.mjs";
import {
  buildRaindropCallSummaryFromDispatcherRun,
  INSTRUMENTED_SURFACES,
  RAINDROP_HOOK_PRODUCER_REGISTRY,
  REQUIRED_HOOK_PRODUCERS,
  SURFACE_BUILDER_REGISTRY,
  validateRaindropHookProducerCoverage,
  validateSurfaceBuilderCoverage,
  writeRaindropCallSummary,
} from "./raindrop-call-adapter.mjs";
import {
  buildPromptResultEvaluation,
  writePromptResultEvaluation,
} from "./raindrop-prompt-result-loop.mjs";
import {
  buildAutomationRuntimeEnv,
  runClaudeSentinelWithLocalConfigFallback,
  summarizeClaudeRuntimeAuthCheck,
} from "../runtime/automation-runtime-core.mjs";
import {
  DEFAULT_BROWSER_AUTH_PROOF_FILE,
  evaluateBrowserAuthProof,
} from "../runtime/browser-auth-proof-core.mjs";

// Stable run states. The dispatcher must emit one of these exactly.
export const RUN_STATES = Object.freeze({
  PASS: "PASS",
  REJECT: "REJECT",
  BLOCKED_AUTH: "BLOCKED_AUTH",
  BLOCKED_BUDGET: "BLOCKED_BUDGET",
  BLOCKED_DEPENDENCY: "BLOCKED_DEPENDENCY",
  TIMEOUT: "TIMEOUT",
  RUNTIME_ERROR: "RUNTIME_ERROR",
  NEEDS_HUMAN: "NEEDS_HUMAN",
});

// Stable preflight reason codes. Never rename.
export const PREFLIGHT_REASONS = Object.freeze({
  AUTH_AGENT_MISSING: "runtime.auth-agent-missing",
  AUTH_RUNTIME_UNKNOWN: "runtime.auth-runtime-unknown",
  AUTH_SENTINEL_MISSING: "runtime.auth-sentinel-missing",
  AUTH_SENTINEL_FAILED: "runtime.auth-sentinel-failed",
  BROWSER_AUTH_MISSING: "runtime.browser-auth-missing",
  BROWSER_AUTH_UNAVAILABLE: "runtime.browser-auth-unavailable",
  BROWSER_AUTH_UNKNOWN: "runtime.browser-auth-unknown",
  LOCK_MISSING: "runtime.lock-missing",
  LOCK_EXPIRED: "runtime.lock-expired",
  LOCK_DRIFT: "runtime.lock-drift",
  BUDGET_UNDECLARED: "runtime.budget-undeclared",
  BUDGET_OVER_MAX_NO_APPROVAL: "runtime.budget-over-max-no-approval",
  WORKSPACE_UNDECLARED: "runtime.workspace-undeclared",
  WORKSPACE_UNHEALTHY: "runtime.workspace-unhealthy",
  SANDBOX_WORKSPACE_ALIAS_UNSAFE: "runtime.sandbox-workspace-alias-unsafe",
  SECRET_LEAK_SUSPECTED: "runtime.secret-leak-suspected",
  CAPABILITY_PROFILE_MISSING: CAPABILITY_REASONS.PROFILE_MISSING,
  CAPABILITY_PROFILE_NOT_FOUND: CAPABILITY_REASONS.PROFILE_NOT_FOUND,
  CAPABILITY_STALE: CAPABILITY_REASONS.STALE,
  CAPABILITY_UNDECLARED_TOOL: CAPABILITY_REASONS.UNDECLARED_TOOL,
  CAPABILITY_MEMORY_BOUNDARY_VIOLATION: CAPABILITY_REASONS.MEMORY_BOUNDARY_VIOLATION,
  CAPABILITY_AUTONOMY_TOO_HIGH: CAPABILITY_REASONS.AUTONOMY_TOO_HIGH,
  CAPABILITY_REGISTRY_INVALID: CAPABILITY_REASONS.REGISTRY_INVALID,
  DEPENDENCY_NOT_RESOLVED: "runtime.dependency-not-resolved",
  TIMEOUT_POLICY_MISSING: "runtime.timeout-policy-missing",
  ARTIFACT_PATH_INVALID: "runtime.artifact-path-invalid",
  GATE_TOOL_NOT_ALLOWED: "runtime.gate-tool-not-allowed",
  RUNTIME_EXECUTABILITY_BLOCKED: "runtime.executability-blocked",
  RAINDROP_BUILDER_COVERAGE_BROKEN: "runtime.raindrop-builder-coverage-broken",
  RAINDROP_HOOK_SHAPE_BROKEN: "runtime.raindrop-hook-shape-broken",
});

const KNOWN_RUNTIMES = new Set(["claude", "codex", "gemini", "human"]);
const DEFAULT_COMPANY_OS_PATH = "[LOCAL_WORKSPACE]";
const RUNTIME_BROWSER_AUTH_VALUES = new Set([
  "none",
  "forbidden",
  "browser-connector",
  "operator-shared-session",
]);

const SECRET_PATTERNS = [
  /\bhch-v3-[A-Za-z0-9_-]{16,}\b/,
  /\bsk-or-v1-[A-Za-z0-9_-]{16,}\b/,
  /\bplane_api_[A-Za-z0-9]{16,}\b/,
  /\b(?:sk|pk)-[A-Za-z0-9]{20,}\b/, // OpenAI/Stripe-style keys
  /\bAKIA[0-9A-Z]{16}\b/, // AWS access keys
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, // PEM keys
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/, // JWT
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, // Slack tokens
  /\bghp_[A-Za-z0-9]{20,}\b/, // GitHub PAT
];

const DEFAULT_CLAUDE_COMMAND = process.env.CLAUDE_BIN || "[LOCAL_WORKSPACE]";

// ---------- Pure preflight functions ----------

function pass(name, evidence = {}) {
  return { name, state: RUN_STATES.PASS, reason: null, evidence };
}

function fail(name, state, reason, evidence = {}) {
  return { name, state, reason, evidence };
}

/**
 * Auth preflight: the contract must name a known runtime under `agent` and
 * either be a human-routed item or have a `RuntimeAuth` declaration.
 * Phase 1.1 does not run sentinel commands; it checks declaration only.
 */
export function preflightAuth({ contractFields, runtimeAuthDeclared, runtimeAuthCheck = null }) {
  const agent = String(contractFields?.agent || "").toLowerCase().trim();
  if (!agent) {
    return fail("auth", RUN_STATES.BLOCKED_AUTH, PREFLIGHT_REASONS.AUTH_AGENT_MISSING, { agent: null });
  }
  if (!KNOWN_RUNTIMES.has(agent)) {
    return fail("auth", RUN_STATES.BLOCKED_AUTH, PREFLIGHT_REASONS.AUTH_RUNTIME_UNKNOWN, { agent });
  }
  if (agent === "human") return pass("auth", { agent });
  if (!runtimeAuthDeclared) {
    return fail("auth", RUN_STATES.BLOCKED_AUTH, PREFLIGHT_REASONS.AUTH_SENTINEL_MISSING, { agent });
  }
  if (runtimeAuthCheck && runtimeAuthCheck.ok === false) {
    return fail("auth", RUN_STATES.BLOCKED_AUTH, PREFLIGHT_REASONS.AUTH_SENTINEL_FAILED, {
      agent,
      check: runtimeAuthCheck,
    });
  }
  return pass("auth", { agent });
}

/**
 * Browser/UI preflight: browser-backed worker contracts must declare whether
 * they need an authenticated browser lane. The app-token/API auth bridge is
 * not equivalent to a browser session.
 */
export function preflightRuntimeBrowserAuth({ contractFields, runtimeBrowserAuthCheck = null }) {
  const declared = String(
    contractFields?.runtimebrowserauth
      || contractFields?.runtime_browser_auth
      || "",
  ).trim().toLowerCase();
  const uiBound = isBrowserUiBoundContract(contractFields);

  if (!declared) {
    if (!uiBound) return pass("browser_auth", { required: false });
    return fail("browser_auth", RUN_STATES.BLOCKED_AUTH, PREFLIGHT_REASONS.BROWSER_AUTH_MISSING, {
      required: true,
      reason: "browser/UI-bound contract has no RuntimeBrowserAuth declaration",
    });
  }

  if (!RUNTIME_BROWSER_AUTH_VALUES.has(declared)) {
    return fail("browser_auth", RUN_STATES.BLOCKED_AUTH, PREFLIGHT_REASONS.BROWSER_AUTH_UNKNOWN, {
      declared,
      allowed: Array.from(RUNTIME_BROWSER_AUTH_VALUES),
    });
  }

  if (["none", "forbidden"].includes(declared)) {
    return pass("browser_auth", { required: false, declared });
  }

  if (runtimeBrowserAuthCheck?.ok === true) {
    return pass("browser_auth", { required: true, declared, check: runtimeBrowserAuthCheck });
  }

  return fail("browser_auth", RUN_STATES.BLOCKED_AUTH, PREFLIGHT_REASONS.BROWSER_AUTH_UNAVAILABLE, {
    required: true,
    declared,
    check: runtimeBrowserAuthCheck || null,
  });
}

/**
 * Lock preflight: an unexpired `worker.lock (dispatcher-v0)` comment must
 * exist on the work item, and its embedded description hash must match the
 * current description.
 */
export function preflightLock({ comments, currentDescriptionHash, currentDescriptionHashes, now = new Date() }) {
  const nowMs = now.getTime();
  let active = null;
  let expired = null;
  for (const row of comments || []) {
    const html = row.comment_html || "";
    if (!html.includes("worker.lock (dispatcher-v0)")) continue;
    const body = stripHtml(html);
    const yamlMatch = body.match(/worker\.lock:\s*\n([\s\S]*?)(?:\n\S|$)/);
    if (!yamlMatch) continue;
    const fields = parseYamlScalar(yamlMatch[1]);
    const hashMatch = extractLockDescriptionHash(body);
    const expiry = fields.expires_at ? Date.parse(fields.expires_at) : NaN;
    if (Number.isFinite(expiry) && expiry > nowMs) {
      active = {
        comment_id: row.id || null,
        dispatcher_run_id: fields.dispatcher_run_id || null,
        description_hash: hashMatch,
        expires_at: fields.expires_at,
      };
      break;
    }
    if (Number.isFinite(expiry) && expiry <= nowMs) {
      expired = {
        comment_id: row.id || null,
        dispatcher_run_id: fields.dispatcher_run_id || null,
        expires_at: fields.expires_at,
      };
    }
  }

  if (!active) {
    if (expired) {
      return fail("lock", RUN_STATES.BLOCKED_DEPENDENCY, PREFLIGHT_REASONS.LOCK_EXPIRED, expired);
    }
    return fail("lock", RUN_STATES.BLOCKED_DEPENDENCY, PREFLIGHT_REASONS.LOCK_MISSING, {});
  }
  if (!active.description_hash) {
    return fail("lock", RUN_STATES.BLOCKED_DEPENDENCY, PREFLIGHT_REASONS.LOCK_DRIFT, {
      reason: "lock comment missing description hash",
    });
  }
  const acceptedHashes = Array.isArray(currentDescriptionHashes) && currentDescriptionHashes.length
    ? currentDescriptionHashes
    : [currentDescriptionHash];
  if (!acceptedHashes.includes(active.description_hash)) {
    return fail("lock", RUN_STATES.BLOCKED_DEPENDENCY, PREFLIGHT_REASONS.LOCK_DRIFT, {
      lock_hash: active.description_hash,
      current_hash: currentDescriptionHash,
    });
  }
  return pass("lock", {
    dispatcher_run_id: active.dispatcher_run_id,
    expires_at: active.expires_at,
  });
}

/**
 * Budget preflight: contract must declare a parseable MaxSpend. EUR 0 is
 * allowed for read-only / audit work. Anything > 0 requires explicit
 * AlwaysAllow + cost-router approval (signalled by injected approval).
 */
export function preflightBudget({ contractFields, costRouterApproval = false }) {
  const raw = String(contractFields?.maxspend || contractFields?.max_spend || "").trim();
  if (!raw) {
    return fail("budget", RUN_STATES.BLOCKED_BUDGET, PREFLIGHT_REASONS.BUDGET_UNDECLARED, {});
  }
  const m = raw.match(/EUR\s*(\d+(?:\.\d+)?)/i);
  const amount = m ? Number(m[1]) : NaN;
  if (!Number.isFinite(amount)) {
    return fail("budget", RUN_STATES.BLOCKED_BUDGET, PREFLIGHT_REASONS.BUDGET_UNDECLARED, { raw });
  }
  if (amount === 0) return pass("budget", { eur: 0 });
  if (!costRouterApproval) {
    return fail("budget", RUN_STATES.BLOCKED_BUDGET, PREFLIGHT_REASONS.BUDGET_OVER_MAX_NO_APPROVAL, {
      eur: amount,
    });
  }
  return pass("budget", { eur: amount, cost_router_approved: true });
}

/**
 * Workspace preflight: Workspace field must be declared and resolve via
 * registry or absolute path. Phase 1.1 only checks declaration shape; it
 * does not git-status the worktree (that wires in v1.2).
 */
export function preflightWorkspace({ contractFields, workspaceHealthChecker }) {
  const ws = String(contractFields?.workspace || "").trim();
  if (!ws) {
    return fail("workspace", RUN_STATES.BLOCKED_DEPENDENCY, PREFLIGHT_REASONS.WORKSPACE_UNDECLARED, {});
  }
  const looksRegistry = /^registry:[\w-]+/i.test(ws);
  const looksAbsolute = ws.startsWith("/");
  const looksWorkspace = /^[a-z][a-z0-9-]+$/.test(ws);
  if (!looksRegistry && !looksAbsolute && !looksWorkspace) {
    return fail("workspace", RUN_STATES.BLOCKED_DEPENDENCY, PREFLIGHT_REASONS.WORKSPACE_UNHEALTHY, {
      workspace: ws,
      reason: "workspace field shape not registry, absolute path, or slug",
    });
  }
  if (typeof workspaceHealthChecker === "function") {
    const result = workspaceHealthChecker(ws);
    if (result && result.healthy === false) {
      return fail("workspace", RUN_STATES.BLOCKED_DEPENDENCY, PREFLIGHT_REASONS.WORKSPACE_UNHEALTHY, {
        workspace: ws,
        reason: result.reason || "workspace health check failed",
      });
    }
  }
  return pass("workspace", { workspace: ws });
}

const APPROVED_SANDBOX_ROOT_PREFIXES = [
  "[LOCAL_WORKSPACE]",
];

function isApprovedSandboxWorkspacePath(workspace) {
  const raw = String(workspace || "").trim();
  if (!raw.startsWith("/") || raw.includes("/..")) return false;
  return APPROVED_SANDBOX_ROOT_PREFIXES.some((prefix) => {
    if (!raw.startsWith(prefix)) return false;
    const suffix = raw.slice(prefix.length).replace(/^\/+|\/+$/g, "");
    const segments = suffix.split("/").filter(Boolean);
    return segments.length >= 2;
  });
}

/**
 * Sandbox-workspace preflight: write-capable, sandbox-required implement
 * contracts must declare `Workspace` as an absolute path under an approved
 * sandbox root (for example `/Users/.../Developer/[SOURCE_WORKSPACE]/<workspace>/...`).
 * Canonical aliases such as `registry:company-os`, bare slugs, or absolute
 * paths into the canonical source tree are treated as unsafe because the
 * worker would write directly into the source-of-truth checkout. This
 * captures the [WORK_ITEM_ID]/283 routing failure mode before worker spawn.
 *
 * Triggers only when both `Mode: implement` and `Sandbox: required` are
 * declared; read-only, audit, or non-sandbox alias contracts are untouched.
 */
export function preflightSandboxWorkspace({ contractFields }) {
  const mode = String(contractFields?.mode || "").toLowerCase().trim();
  const sandbox = String(contractFields?.sandbox || "").toLowerCase().trim();

  if (mode !== "implement") {
    return pass("sandbox_workspace", { applied: false, reason: "mode-not-implement" });
  }
  if (sandbox !== "required") {
    return pass("sandbox_workspace", { applied: false, reason: "sandbox-not-required" });
  }

  const ws = String(contractFields?.workspace || "").trim();
  if (!ws) {
    // preflightWorkspace owns the undeclared case; do not double-report.
    return pass("sandbox_workspace", { applied: false, reason: "workspace-undeclared-deferred" });
  }

  if (isApprovedSandboxWorkspacePath(ws)) {
    return pass("sandbox_workspace", { applied: true, workspace: ws });
  }

  const reason = ws.startsWith("/")
    ? "workspace is an absolute path outside an approved sandbox worktree; write-capable sandbox-required implement runs must use /Users/<dev>/Developer/[SOURCE_WORKSPACE]/<workspace>/<run-slug>"
    : "workspace is a canonical alias (registry:* / slug); write-capable sandbox-required implement runs must use an absolute sandbox worktree path under /Users/<dev>/Developer/[SOURCE_WORKSPACE]/<workspace>/...";

  return fail(
    "sandbox_workspace",
    RUN_STATES.BLOCKED_DEPENDENCY,
    PREFLIGHT_REASONS.SANDBOX_WORKSPACE_ALIAS_UNSAFE,
    {
      workspace: ws,
      mode,
      sandbox,
      approved_sandbox_root_prefixes: [...APPROVED_SANDBOX_ROOT_PREFIXES],
      reason,
    },
  );
}

/**
 * Secrets preflight: scan description and contract block fields for
 * obvious secret patterns. Conservative: BLOCKED_AUTH with
 * `runtime.secret-leak-suspected` if any pattern hits.
 */
export function preflightSecrets({ description, contractFields }) {
  const surfaces = [String(description || "")];
  if (contractFields) {
    for (const [k, v] of Object.entries(contractFields)) {
      surfaces.push(typeof v === "string" ? v : Array.isArray(v) ? v.join("\n") : "");
    }
  }
  const text = surfaces.join("\n");
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      return fail("secrets", RUN_STATES.BLOCKED_AUTH, PREFLIGHT_REASONS.SECRET_LEAK_SUSPECTED, {
        matched_pattern: String(pattern),
      });
    }
  }
  return pass("secrets", {});
}

function isBrowserUiBoundContract(contractFields = {}) {
  const lines = [
    contractFields?.runtimepermissionmode,
    contractFields?.runtime_permission_mode,
    contractFields?.capabilityprofile,
    contractFields?.capability_profile,
    contractFields?.scope,
    contractFields?.outcomespec,
    contractFields?.outcome_spec,
    contractFields?.outcomerubric,
    contractFields?.outcome_rubric,
    contractFields?.acceptancecriteria,
    contractFields?.acceptance_criteria,
    contractFields?.gates,
    contractFields?.reporting,
  ].flatMap(asList).map((line) => String(line || "").trim()).filter(Boolean);
  return lines.some((line) => {
    if (/^(exclude|blocked|forbid|forbidden|do not|no)\b/i.test(line)) return false;
    return /\b(browser|ui|playwright|screenshot|click|route)\b/i.test(line)
      && /\b(install|template|authenticated|plane|screenshot|verify|capture|browser-confirmed)\b/i.test(line);
  });
}

function asList(value) {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.flatMap(asList);
  return String(value).split(/[,;\n]/g).map((entry) => entry.trim()).filter(Boolean);
}

/**
 * Capability profile preflight: scheduler-runnable runtime work must declare
 * a profile from the executable Capability Registry. The registry is the
 * hard allowlist for role, workspace, subagents, commands, connectors,
 * memory surface, and autonomy level.
 */
export function preflightCapabilityProfile({
  contractFields,
  capabilityRegistry,
  usedCapabilities = {},
  now = new Date(),
}) {
  const result = evaluateCapabilityProfile({
    contractFields,
    registry: capabilityRegistry,
    usedCapabilities,
    now,
  });
  if (result.ok) return pass("capability_profile", result.evidence);
  return fail(
    "capability_profile",
    RUN_STATES.BLOCKED_DEPENDENCY,
    result.reason_codes?.[0] || PREFLIGHT_REASONS.CAPABILITY_REGISTRY_INVALID,
    result.evidence,
  );
}

/**
 * Dependencies preflight: every entry in `DependsOn` must resolve to a PASS
 * or PARK state via the injected resolver. Empty `DependsOn` passes.
 */
export function preflightDependencies({ contractFields, dependencyStatusResolver }) {
  const deps = extractDependencyRefs(contractFields);
  if (deps.length === 0) return pass("dependencies", { dependencies: [] });

  const unresolved = [];
  const evidence = [];
  for (const dep of deps) {
    const status = typeof dependencyStatusResolver === "function"
      ? dependencyStatusResolver(dep)
      : { status: "unknown" };
    evidence.push({ dep, status });
    if (!status || (status.status !== "PASS" && status.status !== "PARK")) {
      unresolved.push(dep);
    }
  }
  if (unresolved.length > 0) {
    return fail("dependencies", RUN_STATES.BLOCKED_DEPENDENCY, PREFLIGHT_REASONS.DEPENDENCY_NOT_RESOLVED, {
      unresolved,
      evidence,
    });
  }
  return pass("dependencies", { evidence });
}

/**
 * Gate tool preflight: every executable command in `gates` must be executable
 * by the worker harness before the worker starts. Safe known gates can be
 * derived automatically; project-specific gates must be declared explicitly in
 * `allowed_claude_tools` / `AllowedClaudeTools`.
 */
export function preflightGateToolAllowlist({ contractFields, capabilityProfile }) {
  const result = evaluateGateToolAllowlist({ contractFields, capabilityProfile });
  if (result.ok) return pass("gate_tool_allowlist", result);
  return fail(
    "gate_tool_allowlist",
    RUN_STATES.BLOCKED_DEPENDENCY,
    PREFLIGHT_REASONS.GATE_TOOL_NOT_ALLOWED,
    result,
  );
}

export function extractDependencyRefs(contractFields = {}) {
  const raw = contractFields?.dependson ?? contractFields?.depends_on ?? [];
  const values = Array.isArray(raw) ? raw : [raw];
  return values
    .flatMap((entry) => String(entry || "").split(/[,;\n]/g))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function normalizeDependencyRef(dep) {
  const raw = String(dep || "").trim();
  const projectSequence = raw.match(/\b([A-Z][A-Z0-9]*)-(\d+)\b/i);
  if (projectSequence) return `${projectSequence[1].toUpperCase()}-${Number(projectSequence[2])}`;
  const sequence = raw.match(/^\s*(\d+)\s*$/);
  if (sequence) return `COMPA-${Number(sequence[1])}`;
  return raw;
}

export function resolveDependencyStatusFromComments(comments = []) {
  const rows = [...(comments || [])].sort((a, b) => {
    const aTime = Date.parse(a?.created_at || "") || 0;
    const bTime = Date.parse(b?.created_at || "") || 0;
    return bTime - aTime;
  });

  for (const row of rows) {
    const body = stripHtml(row?.comment_html || "");
    if (/human_gate\.released/i.test(body)) {
      return {
        status: "PASS",
        source: "human_gate.released",
        comment_id: row.id || null
      };
    }

    if (/controller\.decision/i.test(body)) {
      const mode = (body.match(/\bdecision_mode:\s*([A-Z0-9_.-]+)/i)?.[1] || "").toUpperCase();
      if (mode === "AUTO-GO") {
        return {
          status: "PASS",
          source: "controller.decision",
          decision_mode: mode,
          comment_id: row.id || null
        };
      }
      if (["PARK", "HG-3.5-PENDING-ARTIFACT-REVIEW"].includes(mode)) {
        return {
          status: "PARK",
          source: "controller.decision",
          decision_mode: mode,
          comment_id: row.id || null
        };
      }
      if (["REJECT", "ASK-FOUNDER", "DELEGATE", "SELF-FIX"].includes(mode)) {
        return {
          status: mode,
          source: "controller.decision",
          decision_mode: mode,
          comment_id: row.id || null
        };
      }
    }

    if (/controller\.verdict/i.test(body)) {
      const verdict = (body.match(/\bverdict:\s*(PASS|PARK|REJECT)\b/i)?.[1] || "").toUpperCase();
      if (verdict) {
        return {
          status: verdict,
          source: "controller.verdict",
          comment_id: row.id || null
        };
      }
    }

    if (/worker\.reported/i.test(body)) {
      const state = (body.match(/\bstate:\s*(PASS|PARK|REJECT|NEEDS_HUMAN|BLOCKED_[A-Z_]+|RUNTIME_ERROR|TIMEOUT)\b/i)?.[1] || "").toUpperCase();
      if (state) {
        return {
          status: state,
          source: "worker.reported",
          comment_id: row.id || null
        };
      }
    }
  }

  return { status: "unknown", source: "comments-no-terminal-status" };
}

/**
 * Timeout policy preflight: MaxRuntime, Heartbeat, KillSwitch must all be
 * declared in the contract. Missing any → BLOCKED_DEPENDENCY with reason
 * `runtime.timeout-policy-missing`.
 */
export function preflightTimeout({ contractFields }) {
  const required = ["maxruntime", "heartbeat", "killswitch"];
  const missing = required.filter((k) => {
    const v = contractFields?.[k];
    if (v === undefined || v === null) return true;
    if (typeof v === "string" && !v.trim()) return true;
    if (Array.isArray(v) && v.length === 0) return true;
    return false;
  });
  if (missing.length > 0) {
    return fail("timeout", RUN_STATES.BLOCKED_DEPENDENCY, PREFLIGHT_REASONS.TIMEOUT_POLICY_MISSING, {
      missing,
    });
  }
  return pass("timeout", {});
}

export function preflightRuntimeExecutability({
  workItem,
  description,
  contractFields,
  labelNames = [],
  capabilityRegistry,
  now = new Date(),
} = {}) {
  const synthesizedItem = workItem && (workItem.description_html || workItem.description_stripped || workItem.description)
    ? workItem
    : { ...(workItem || {}), description_stripped: description || "" };
  const executability = evaluateRuntimeExecutability({
    item: synthesizedItem,
    contractFields,
    labelNames,
    capabilityRegistry,
    now,
  });
  if (executability.verdict !== RUNTIME_READY_VERDICTS.REJECT) {
    return pass("runtime_executability", {
      verdict: executability.verdict,
      profile_id: executability.evidence?.profile_id || null,
      reporting_absolute_paths: executability.evidence?.reporting_absolute_paths || [],
    });
  }
  return fail("runtime_executability", RUN_STATES.BLOCKED_DEPENDENCY, PREFLIGHT_REASONS.RUNTIME_EXECUTABILITY_BLOCKED, {
    verdict: executability.verdict,
    runtime_ready_reasons: executability.reason_codes,
    suggestions: executability.suggestions,
    description_hash: executability.evidence?.description_hash || null,
  });
}

/**
 * Artifact paths preflight: Reporting and OutcomeArtifacts entries must be
 * absolute paths and their parent directories must exist (Phase 1.1
 * checks parent existence; writability is wired in v1.2).
 */
export function preflightArtifactPaths({ contractFields, fsExists = existsSync, fsStat = statSync }) {
  const raw = [
    contractFields?.reporting,
    contractFields?.outcomeartifacts,
    contractFields?.outcome_artifacts,
  ];
  const paths = [];
  for (const entry of raw) {
    if (!entry) continue;
    if (Array.isArray(entry)) {
      for (const item of entry) if (typeof item === "string") paths.push(item);
    } else if (typeof entry === "string") {
      paths.push(entry);
    }
  }
  if (paths.length === 0) {
    return fail("artifact_paths", RUN_STATES.BLOCKED_DEPENDENCY, PREFLIGHT_REASONS.ARTIFACT_PATH_INVALID, {
      reason: "no reporting or outcome artifact path declared",
    });
  }

  const invalid = [];
  let absoluteCount = 0;
  for (const p of paths) {
    const candidate = findDeclaredAbsolutePath(p);
    if (!candidate) continue;
    absoluteCount += 1;
    if (!fsExists(candidate)) {
      const parent = dirname(candidate);
      if (!fsExists(parent)) {
        invalid.push({ path: candidate, reason: "parent directory missing" });
        continue;
      }
      try {
        const st = fsStat(parent);
        if (!st.isDirectory()) invalid.push({ path: candidate, reason: "parent not a directory" });
      } catch (e) {
        invalid.push({ path: candidate, reason: "parent stat failed: " + e.message });
      }
    }
  }
  if (absoluteCount === 0) {
    invalid.push({ path: null, reason: "no absolute artifact path found" });
  }
  if (invalid.length > 0) {
    return fail("artifact_paths", RUN_STATES.BLOCKED_DEPENDENCY, PREFLIGHT_REASONS.ARTIFACT_PATH_INVALID, {
      invalid,
    });
  }
  return pass("artifact_paths", { checked: paths.length });
}

/**
 * Raindrop adapter invariant preflight: every surface promoted to
 * INSTRUMENTED_SURFACES must have an explicit builder in
 * SURFACE_BUILDER_REGISTRY. Broken adapter coverage blocks before worker
 * spawn so observability cannot silently regress.
 *
 * Scope-near to the adapter: no new surfaces are added here. Scheduler,
 * Hermes, AionUI, hosted ingestion and arbitrary manual sessions remain
 * outside this slice.
 */
export function preflightRaindropBuilderCoverage({
  instrumentedSurfaces = INSTRUMENTED_SURFACES,
  surfaceBuilderRegistry = SURFACE_BUILDER_REGISTRY,
} = {}) {
  const result = validateSurfaceBuilderCoverage(instrumentedSurfaces, surfaceBuilderRegistry);
  if (result.ok) {
    return pass("raindrop_builder_coverage", {
      surface_count: instrumentedSurfaces.length,
    });
  }
  return fail(
    "raindrop_builder_coverage",
    RUN_STATES.BLOCKED_DEPENDENCY,
    PREFLIGHT_REASONS.RAINDROP_BUILDER_COVERAGE_BROKEN,
    {
      errors: result.errors,
      instrumented_surfaces: [...instrumentedSurfaces],
    },
  );
}

/**
 * Raindrop hook-shape invariant preflight: every currently declared Raindrop
 * hook producer must build a `raindrop_hook` that passes `validateRaindropHook`
 * before a worker can spawn. Catches structural drift (missing required field,
 * unknown surface, forbidden private field) in any producer.
 *
 * Scope-near to existing producers: Scheduler, Hermes, AionUI, manual and
 * external sessions stay outside this guard until they have a real producer.
 */
export function preflightRaindropHookShape({
  hookProducerRegistry = RAINDROP_HOOK_PRODUCER_REGISTRY,
  requiredHookProducers = REQUIRED_HOOK_PRODUCERS,
} = {}) {
  const result = validateRaindropHookProducerCoverage({
    registry: hookProducerRegistry,
    required: requiredHookProducers,
  });
  const producers = Object.keys(hookProducerRegistry);
  if (result.ok) {
    return pass("raindrop_hook_shape", {
      producer_count: producers.length,
      producers,
    });
  }
  return fail(
    "raindrop_hook_shape",
    RUN_STATES.BLOCKED_DEPENDENCY,
    PREFLIGHT_REASONS.RAINDROP_HOOK_SHAPE_BROKEN,
    {
      errors: result.errors,
      producers,
      required: [...requiredHookProducers],
    },
  );
}

// ---------- Composer ----------

/**
 * Compose all preflight results. Returns the overall result and what would
 * have been emitted in a real run. No I/O; the caller passes already-
 * fetched/computed inputs.
 */
export function runDryRun({
  workItem,
  comments,
  contractFields,
  description,
  currentDescriptionHash,
  currentDescriptionHashes,
  runtimeAuthDeclared,
  runtimeAuthCheck,
  runtimeBrowserAuthCheck,
  costRouterApproval = false,
  workspaceHealthChecker,
  dependencyStatusResolver,
  capabilityRegistry,
  usedCapabilities,
  fsExists,
  fsStat,
  instrumentedSurfaces,
  surfaceBuilderRegistry,
  hookProducerRegistry,
  requiredHookProducers,
  now = new Date(),
}) {
  const labelNames = Array.isArray(workItem?.label_names)
    ? workItem.label_names
    : Array.isArray(workItem?.labels)
      ? workItem.labels.map((label) => (typeof label === "string" ? label : label?.name || "")).filter(Boolean)
      : [];
  const executabilityPreflight = preflightRuntimeExecutability({
    workItem,
    description,
    contractFields,
    labelNames,
    capabilityRegistry,
    now,
  });
  const preflights = [
    preflightAuth({ contractFields, runtimeAuthDeclared, runtimeAuthCheck }),
    preflightRuntimeBrowserAuth({ contractFields, runtimeBrowserAuthCheck }),
    preflightLock({ comments, currentDescriptionHash, currentDescriptionHashes, now }),
    preflightBudget({ contractFields, costRouterApproval }),
    preflightWorkspace({ contractFields, workspaceHealthChecker }),
    preflightSandboxWorkspace({ contractFields }),
    preflightSecrets({ description, contractFields }),
    preflightCapabilityProfile({ contractFields, capabilityRegistry, usedCapabilities, now }),
    preflightGateToolAllowlist({
      contractFields,
      capabilityProfile: findCapabilityProfile(capabilityRegistry, contractFields),
    }),
    preflightDependencies({ contractFields, dependencyStatusResolver }),
    preflightTimeout({ contractFields }),
    executabilityPreflight,
    preflightArtifactPaths({ contractFields, fsExists, fsStat }),
    preflightRaindropBuilderCoverage({ instrumentedSurfaces, surfaceBuilderRegistry }),
    preflightRaindropHookShape({ hookProducerRegistry, requiredHookProducers }),
  ];

  const blocked = preflights.find((p) => p.state !== RUN_STATES.PASS);
  const overall = blocked ? blocked.state : RUN_STATES.PASS;
  const blockedReasons = preflights
    .filter((p) => p.state !== RUN_STATES.PASS && p.reason)
    .map((p) => p.reason);

  return {
    version: "runtime-dispatcher-v1/dry-run",
    work_item: {
      id: workItem?.id || null,
      sequence_id: workItem?.sequence_id ? formatPlaneWorkItemSequence(workItem) : null,
      name: workItem?.name || null,
    },
    state: overall,
    blocked_reasons: blockedReasons,
    runtime_ready_state: executabilityPreflight.evidence?.verdict || null,
    runtime_ready_reasons: executabilityPreflight.evidence?.runtime_ready_reasons || [],
    preflights,
    would_emit_if_v12_run: {
      plane_short_comment_title: "worker.run-summary (dispatcher-v1)",
      report_md_path_template: "reports/runs/YYYY-MM-DD/<dispatcher_run_id>.md",
      metrics_event_types: [
        "dispatcher.preflight-pass",
        "dispatcher.preflight-fail",
        "worker.spawned",
        "worker.heartbeat",
        "worker.exit",
        "dispatcher.run-summary",
        "controller.verdict",
      ],
    },
    no_writes_performed: true,
    signed_at: now.toISOString(),
  };
}

// ---------- Helpers (shared with cao-pass / dispatcher) ----------

async function postComment({ baseUrl, authHeaders, path, title, yaml }) {
  return requestJson({
    baseUrl,
    authHeaders,
    path: `${path}comments/`,
    method: "POST",
    body: {
      comment_html: [
        `<p><strong>${htmlEscape(title)}</strong></p>`,
        `<pre><code>${htmlEscape(yaml)}</code></pre>`,
      ].join("\n"),
    },
  });
}

function listChangedFilesSync(workspacePath) {
  const result = spawnSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: workspacePath,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  });
  if (result.status !== 0) return [];
  return parseGitStatusChangedFiles(result.stdout, workspacePath);
}

export function parseGitStatusChangedFiles(stdout, workspacePath) {
  return String(stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^(?:[ MARCUD?!]{1,2}|\?\?)\s+/, ""))
    .map((line) => line.includes(" -> ") ? line.split(" -> ").pop() : line)
    .map((line) => line.replace(/^"|"$/g, ""))
    .map((file) => `${workspacePath}/${file}`);
}

export function subtractBaselineChangedFiles(changedFiles = [], baselineChangedFiles = []) {
  const baseline = new Set((baselineChangedFiles || []).map((file) => resolvePath(file)));
  return (changedFiles || [])
    .map((file) => resolvePath(file))
    .filter((file) => !baseline.has(file));
}

function appendStreamEvent(streamPath, event) {
  if (!streamPath) return;
  mkdirSync(dirname(streamPath), { recursive: true });
  appendFileSync(streamPath, `${JSON.stringify(event)}\n`, "utf8");
}

function resolveRuntimePath(path, workspacePath) {
  if (!path) return "";
  return isAbsolute(path) ? resolvePath(path) : resolvePath(workspacePath, path);
}

export function resolveRuntimeOwnedWritePaths({ workspacePath, reportPath, streamPath, metricsPath } = {}) {
  return [reportPath, streamPath, metricsPath]
    .map((path) => resolveRuntimePath(path, workspacePath))
    .filter(Boolean);
}

export function resolveRuntimeOwnedReadPaths({ reportPath, streamPath } = {}) {
  return [...new Set([reportPath, streamPath]
    .map((path) => (path ? dirname(resolvePath(path)) : ""))
    .filter(Boolean))];
}

export function finalizeRuntimeState({
  initialState,
  initialReason,
  streamHealth,
  outOfScopeFiles = [],
}) {
  if (initialState === RUN_STATES.PASS && streamHealth && !streamHealth.ok) {
    return {
      state: RUN_STATES.NEEDS_HUMAN,
      reason: `stream-health:${streamHealth.reason_codes.join(",")}`,
    };
  }

  if (initialState === RUN_STATES.PASS && outOfScopeFiles.length) {
    return {
      state: RUN_STATES.NEEDS_HUMAN,
      reason: `scope-drift:${outOfScopeFiles.length}`,
    };
  }

  return { state: initialState, reason: initialReason };
}

function signalProcessGroup(child, signal) {
  if (!child?.pid) return false;
  if (process.platform !== "win32") {
    try {
      process.kill(-child.pid, signal);
      return true;
    } catch {
      // Fall back to direct child signalling below.
    }
  }
  try {
    return child.kill(signal);
  } catch {
    return false;
  }
}

export function runProcess(command, args, {
  cwd,
  env = process.env,
  timeoutMs,
  streamPath = "",
  heartbeatMs = 60_000,
  allowedReadPaths = [],
  allowedWritePaths = [],
  baselineChangedFiles = [],
  scopeGuardMode = "kill",
  killSwitchPaths = [],
  killSwitchCheck,
  onHeartbeat,
} = {}) {
  return new Promise((resolve) => {
    const effectiveTimeoutMs = Number(timeoutMs) > 0 ? Number(timeoutMs) : 30 * 60 * 1000;
    const child = spawn(command, args, {
      cwd,
      env,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    let heartbeatCount = 0;
    let killedReason = "";
    let heartbeatTimer;
    const interventions = [];
    const workerWritePathSet = new Set();
    const startedAt = Date.now();
    appendStreamEvent(streamPath, {
      type: "worker.spawned",
      at: new Date().toISOString(),
      command,
      args: sanitizeRuntimeCommandArgs(args),
      cwd,
    });

    const terminate = (reason, detail = {}) => {
      if (settled || killedReason) return;
      killedReason = reason;
      interventions.push({ reason, ...detail });
      appendStreamEvent(streamPath, { type: "worker.intervention", at: new Date().toISOString(), reason, ...detail });
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      const signaled = signalProcessGroup(child, "SIGTERM");
      appendStreamEvent(streamPath, { type: "worker.signal", at: new Date().toISOString(), signal: "SIGTERM", signaled });
      setTimeout(() => {
        if (!settled) {
          const killed = signalProcessGroup(child, "SIGKILL");
          appendStreamEvent(streamPath, { type: "worker.signal", at: new Date().toISOString(), signal: "SIGKILL", signaled: killed });
        }
      }, 5_000).unref();
    };

    const timer = setTimeout(() => {
      timedOut = true;
      terminate("timeout", { timeout_ms: effectiveTimeoutMs });
    }, effectiveTimeoutMs);
    heartbeatTimer = setInterval(async () => {
      if (settled || killedReason) return;
      const changedFiles = subtractBaselineChangedFiles(listChangedFilesSync(cwd), baselineChangedFiles);
      const attribution = splitChangedFilesByRuntimeAttribution(changedFiles, Array.from(workerWritePathSet));
      const outOfScopeFiles = detectOutOfScopeFiles(attribution.worker_attributed_changed_files, allowedWritePaths);
      heartbeatCount += 1;
      const heartbeat = {
        type: "worker.heartbeat",
        at: new Date().toISOString(),
        elapsed_ms: Date.now() - startedAt,
        changed_files: changedFiles,
        worker_attributed_changed_files: attribution.worker_attributed_changed_files,
        external_changed_files: attribution.external_changed_files,
        out_of_scope_files: outOfScopeFiles,
        scope_guard_mode: allowedWritePaths.length ? scopeGuardMode : "advisory-no-allowed-paths",
      };
      appendStreamEvent(streamPath, heartbeat);
      try { onHeartbeat?.(heartbeat); } catch { /* heartbeat telemetry must not crash the worker */ }
      if (outOfScopeFiles.length && scopeGuardMode === "kill") {
        terminate("scope-drift", { files: outOfScopeFiles });
        return;
      }
      const localKill = killSwitchPaths.find((path) => existsSync(path));
      if (localKill) {
        terminate("kill-switch-local", { path: localKill });
        return;
      }
      try {
        const planeKill = await killSwitchCheck?.();
        if (planeKill?.kill) terminate("kill-switch-plane", { detail: planeKill.reason || "Plane kill comment present" });
      } catch {
        appendStreamEvent(streamPath, { type: "worker.kill-switch-check-error", at: new Date().toISOString() });
      }
    }, Math.max(1_000, Number(heartbeatMs) || 60_000));
    heartbeatTimer.unref();
    const observeStreamForReadScope = (stream, text) => {
      const violations = detectRuntimeToolScopeViolations(text, allowedReadPaths, { workspacePath: cwd });
      if (violations.length && scopeGuardMode === "kill") {
        terminate("scope-read-drift", { stream, violations: violations.slice(0, 5) });
      }
    };
    const observeStreamForWriteScope = (stream, text) => {
      for (const path of extractRuntimeToolWritePaths(text, cwd)) workerWritePathSet.add(path);
      const violations = detectRuntimeToolWriteScopeViolations(text, allowedWritePaths, { workspacePath: cwd });
      if (violations.length && scopeGuardMode === "kill") {
        terminate("scope-write-drift", { stream, violations: violations.slice(0, 5) });
      }
    };

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      appendStreamEvent(streamPath, { type: "stream", at: new Date().toISOString(), stream: "stdout", text: redactRuntimeOutput(text) });
      observeStreamForReadScope("stdout", text);
      observeStreamForWriteScope("stdout", text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      appendStreamEvent(streamPath, { type: "stream", at: new Date().toISOString(), stream: "stderr", text: redactRuntimeOutput(text) });
      observeStreamForReadScope("stderr", text);
      observeStreamForWriteScope("stderr", text);
    });
    child.on("error", (error) => {
      settled = true;
      clearTimeout(timer);
      clearInterval(heartbeatTimer);
      appendStreamEvent(streamPath, { type: "worker.exit", at: new Date().toISOString(), exit_code: 127, error: error.message });
      resolve({
        exitCode: 127,
        stdout,
        stderr: `${stderr}\n${error.message}`,
        timedOut,
        heartbeatCount,
        killedReason,
        interventions,
        workerWritePaths: Array.from(workerWritePathSet),
      });
    });
    child.on("close", (code, signal) => {
      settled = true;
      clearTimeout(timer);
      clearInterval(heartbeatTimer);
      appendStreamEvent(streamPath, { type: "worker.exit", at: new Date().toISOString(), exit_code: code ?? 1, signal, timed_out: timedOut, killed_reason: killedReason || null });
      resolve({
        exitCode: code ?? 1,
        signal,
        stdout,
        stderr,
        timedOut,
        heartbeatCount,
        killedReason,
        interventions,
        workerWritePaths: Array.from(workerWritePathSet),
      });
    });
  });
}

async function listChangedFiles(workspacePath) {
  const result = await runProcess("git", ["status", "--short", "--untracked-files=all"], { cwd: workspacePath, timeoutMs: 30_000 });
  if (result.exitCode !== 0) return [];
  return parseGitStatusChangedFiles(result.stdout, workspacePath);
}

function appendAgentEvents(metricsPath, rows) {
  mkdirSync(dirname(metricsPath), { recursive: true });
  for (const row of rows) {
    const validation = validateAgentEventRow(row);
    if (!validation.valid) {
      throw new Error(`invalid agent-event row: ${validation.errors.join("; ")}`);
    }
    appendFileSync(metricsPath, `${JSON.stringify(row)}\n`, "utf8");
  }
}

async function maybeRunCao({ args, auth }) {
  if (args.controller === "off") return { mode: "off", skipped: true };
  const mode = args.controller === "post" ? "post" : "dry-run";
  const caoArgs = [
    "scripts/orchestration/cao-pass.mjs",
    "--workspace", args.workspace,
    "--project-id", args.projectId,
    "--work-item-id", args.workItemId,
    "--mode", mode,
    "--auth", auth.authMode,
    "--base-url", args.baseUrl,
    "--json",
  ];
  const proc = await runProcess(process.execPath, caoArgs, { cwd: process.cwd(), timeoutMs: 120_000 });
  return {
    mode,
    exitCode: proc.exitCode,
    stdout: redactRuntimeOutput(proc.stdout).slice(0, 8000),
    stderr: redactRuntimeOutput(proc.stderr).slice(0, 4000),
  };
}

async function maybeRunCodexController({ args, auth }) {
  if (args.codexController === "off") return { mode: "off", skipped: true };
  const mode = args.codexController === "post" ? "post" : "dry-run";
  const controllerArgs = [
    "scripts/orchestration/codex-controller-dryrun.mjs",
    "--workspace", args.workspace,
    "--project-id", args.projectId,
    "--work-item-id", args.workItemId,
    "--mode", mode,
    "--auth", auth.authMode,
    "--base-url", args.baseUrl,
    "--confidence", process.env.COMPANY_OS_CONTROLLER_CONFIDENCE || "0.93",
    "--gate-green", "runtime-dispatcher-v1.2",
    "--json",
  ];
  const proc = await runProcess(process.execPath, controllerArgs, { cwd: process.cwd(), timeoutMs: 120_000 });
  return {
    mode,
    exitCode: proc.exitCode,
    stdout: redactRuntimeOutput(proc.stdout).slice(0, 8000),
    stderr: redactRuntimeOutput(proc.stderr).slice(0, 4000),
  };
}

// ---------- CLI ----------

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    auth: process.env.PLANE_AUTH_MODE || "app-token",
    workspace: process.env.PLANE_WORKSPACE_SLUG || "",
    projectId: "",
    workItemId: "",
    capabilityRegistry: process.env.COMPANY_OS_CAPABILITY_REGISTRY || DEFAULT_CAPABILITY_REGISTRY_PATH,
    inferenceRegistry: process.env.COMPANY_OS_INFERENCE_REGISTRY || DEFAULT_INFERENCE_REGISTRY_PATH,
    inferenceRoute: process.env.COMPANY_OS_INFERENCE_ROUTE || "auto",
    mode: "dry-run",
    runtimeCommand: process.env.COMPANY_OS_RUNTIME_COMMAND || DEFAULT_CLAUDE_COMMAND,
    runtimeModel: process.env.COMPANY_OS_RUNTIME_MODEL || "opus",
    runtimeEffort: process.env.COMPANY_OS_RUNTIME_EFFORT || "",
    permissionMode: process.env.COMPANY_OS_RUNTIME_PERMISSION_MODE || "plan",
    maxTurns: process.env.COMPANY_OS_RUNTIME_MAX_TURNS || "30",
    controller: process.env.COMPANY_OS_RUNTIME_CONTROLLER || "dry-run",
    codexController: process.env.COMPANY_OS_CODEX_CONTROLLER || "off",
    heartbeatMs: process.env.COMPANY_OS_RUNTIME_HEARTBEAT_MS || "60000",
    scopeGuard: process.env.COMPANY_OS_RUNTIME_SCOPE_GUARD || "kill",
    killSwitchPollMs: process.env.COMPANY_OS_RUNTIME_KILL_SWITCH_POLL_MS || "60000",
    authSentinel: process.env.COMPANY_OS_RUNTIME_AUTH_SENTINEL || "auto",
    planeWrite: true,
    metricsPath: process.env.COMPANY_OS_AGENT_EVENTS_PATH || "metrics/agent-events.jsonl",
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--workspace") args.workspace = argv[++i] || "";
    else if (arg === "--project-id") args.projectId = argv[++i] || "";
    else if (arg === "--work-item-id") args.workItemId = argv[++i] || "";
    else if (arg === "--mode") args.mode = argv[++i] || "dry-run";
    else if (arg === "--capability-registry") args.capabilityRegistry = argv[++i] || DEFAULT_CAPABILITY_REGISTRY_PATH;
    else if (arg === "--inference-registry") args.inferenceRegistry = argv[++i] || DEFAULT_INFERENCE_REGISTRY_PATH;
    else if (arg === "--inference-route") args.inferenceRoute = argv[++i] || "auto";
    else if (arg === "--runtime-command") args.runtimeCommand = argv[++i] || DEFAULT_CLAUDE_COMMAND;
    else if (arg === "--runtime-model") args.runtimeModel = argv[++i] || "opus";
    else if (arg === "--runtime-effort") args.runtimeEffort = argv[++i] || "";
    else if (arg === "--permission-mode") args.permissionMode = argv[++i] || "plan";
    else if (arg === "--max-turns") args.maxTurns = argv[++i] || "30";
    else if (arg === "--controller") args.controller = argv[++i] || "dry-run";
    else if (arg === "--codex-controller") args.codexController = argv[++i] || "off";
    else if (arg === "--heartbeat-ms") args.heartbeatMs = argv[++i] || "60000";
    else if (arg === "--scope-guard") args.scopeGuard = argv[++i] || "kill";
    else if (arg === "--kill-switch-poll-ms") args.killSwitchPollMs = argv[++i] || "60000";
    else if (arg === "--auth-sentinel") args.authSentinel = argv[++i] || "auto";
    else if (arg === "--metrics-path") args.metricsPath = argv[++i] || "metrics/agent-events.jsonl";
    else if (arg === "--no-plane-write") args.planeWrite = false;
    else if (arg === "--auth") args.auth = argv[++i] || "app-token";
    else if (arg === "--base-url") args.baseUrl = argv[++i] || DEFAULT_BASE_URL;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  return args;
}

function usage() {
  return `Usage:
  node scripts/orchestration/runtime-dispatcher-v1.mjs \\
    --workspace <slug> --project-id <uuid> --work-item-id <uuid> \\
    [--mode dry-run|run] \\
    [--capability-registry registries/capabilities/company-os.json] \\
    [--inference-registry registries/inference/company-os.json] \\
    [--inference-route auto|off|P0-doc-small|P1-code-bounded|P2-code-shared|P3-cross-repo|P4-high-risk] \\
    [--runtime-command <path>] [--runtime-model opus] [--runtime-effort max] \\
    [--permission-mode plan|acceptEdits] [--controller off|dry-run|post] \\
    [--codex-controller off|dry-run|post] \\
    [--heartbeat-ms 60000] [--scope-guard off|warn|kill] \\
    [--kill-switch-poll-ms 60000] \\
    [--auth-sentinel auto|off|require] \\
    [--no-plane-write] \\
    [--auth api-key|app-token] [--json]

Phase 1.1: --mode dry-run validates all preflights and writes nothing.
Phase 1.2: --mode run executes one bounded runtime, writes run report,
metrics rows, worker.run-summary and worker.reported comments, then can
call CAO and Codex Controller in dry-run or post mode. It never writes Linear,
never schedules anything, never merges/pushes/deploys, and never sets Plane
Done.

Keychain fallback:
  api key:   ${PLANE_API_KEY_SERVICE} / ${PLANE_API_KEY_ACCOUNT}
  app token: ${PLANE_APP_SERVICE} / ${PLANE_APP_BOT_TOKEN_ACCOUNT}
`;
}

async function requestJson({ baseUrl, authHeaders, path, method = "GET", body }) {
  const r = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...authHeaders, "Accept": "application/json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text.slice(0, 500) }; }
  return { ok: r.ok, status: r.status, body: parsed };
}

function listResults(body) {
  if (Array.isArray(body)) return body;
  return Array.isArray(body?.results) ? body.results : [];
}

async function fetchWorkItemBySequence({ baseUrl, authHeaders, workspace, projectId, sequence, projectIdentifier = "" }) {
  let cursor = "";
  const wanted = String(sequence).replace(/^.+-/, "");
  for (let page = 0; page < 20; page += 1) {
    const cursorPart = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
    const path = [
      `/api/v1/workspaces/${encodeURIComponent(workspace)}`,
      `/projects/${encodeURIComponent(projectId)}`,
      `/work-items/?per_page=100&fields=id,sequence_id,name${cursorPart}`
    ].join("");
    const response = await requestJson({ baseUrl, authHeaders, path });
    if (!response.ok) {
      return { ok: false, status: response.status, error: response.body };
    }
    const found = listResults(response.body).find((row) => String(row.sequence_id) === wanted);
    if (found) {
      if (projectIdentifier) found._project_identifier = projectIdentifier;
      return { ok: true, item: found };
    }
    if (!response.body?.next_page_results || !response.body?.next_cursor) break;
    cursor = response.body.next_cursor;
  }
  return { ok: false, status: 404, error: { detail: `sequence ${sequence} not found in project` } };
}

async function fetchWorkItemComments({ baseUrl, authHeaders, workspace, projectId, workItemId }) {
  const path = [
    `/api/v1/workspaces/${encodeURIComponent(workspace)}`,
    `/projects/${encodeURIComponent(projectId)}`,
    `/work-items/${encodeURIComponent(workItemId)}/comments/`
  ].join("");
  const response = await requestJson({ baseUrl, authHeaders, path });
  if (!response.ok) {
    return { ok: false, status: response.status, error: response.body, comments: [] };
  }
  return { ok: true, comments: listResults(response.body) };
}

async function fetchProjectIdentifier({ baseUrl, authHeaders, workspace, projectId }) {
  const path = `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/`;
  const response = await requestJson({ baseUrl, authHeaders, path });
  if (!response.ok) return "";
  return String(response.body?.identifier || "").trim().toUpperCase();
}

async function loadPlaneDependencyStatusMap({
  baseUrl,
  authHeaders,
  workspace,
  projectId,
  contractFields,
  projectIdentifier = "",
}) {
  const statuses = new Map();
  for (const dep of extractDependencyRefs(contractFields)) {
    const normalized = normalizeDependencyRef(dep);
    const sequence = normalized.match(/^[A-Z][A-Z0-9]*-(\d+)$/i)?.[1];
    if (!sequence) {
      statuses.set(normalized, { status: "unknown", source: "unsupported-dependency-ref" });
      continue;
    }
    const item = await fetchWorkItemBySequence({ baseUrl, authHeaders, workspace, projectId, sequence, projectIdentifier });
    if (!item.ok) {
      statuses.set(normalized, { status: "unknown", source: "work-item-not-found", status_code: item.status || null });
      continue;
    }
    const comments = await fetchWorkItemComments({
      baseUrl,
      authHeaders,
      workspace,
      projectId,
      workItemId: item.item.id
    });
    if (!comments.ok) {
      statuses.set(normalized, { status: "unknown", source: "comments-fetch-failed", status_code: comments.status || null });
      continue;
    }
    statuses.set(normalized, {
      ...resolveDependencyStatusFromComments(comments.comments),
      item: {
        id: item.item.id,
        sequence_id: formatPlaneWorkItemSequence(item.item),
        name: item.item.name || null
      }
    });
  }
  return statuses;
}

function buildPlaneKillSwitchCheck({ baseUrl, authHeaders, itemPath, workItem, pollMs }) {
  let lastChecked = 0;
  const seq = workItem?.sequence_id ? formatPlaneWorkItemSequence(workItem) : "";
  const id = workItem?.id || "";
  return async function checkPlaneKillSwitch() {
    const now = Date.now();
    if (now - lastChecked < Math.max(5_000, Number(pollMs) || 60_000)) return { kill: false };
    lastChecked = now;
    const response = await requestJson({ baseUrl, authHeaders, path: `${itemPath}comments/` });
    if (!response.ok) return { kill: false, reason: `comment-poll-http-${response.status}` };
    const rows = Array.isArray(response.body) ? response.body : (response.body?.results || []);
    const killPattern = new RegExp(`\\bKILL\\s+(${seq || "[WORK_ITEM_ID]"}|${id})\\b`, "i");
    const hit = rows.find((row) => killPattern.test(stripHtml(row.comment_html || "")));
    return hit ? { kill: true, reason: `Plane kill comment ${hit.id || "unknown"}` } : { kill: false };
  };
}

function resolveRuntimePermissionMode(contractFields, fallback) {
  const declared = String(contractFields.runtimepermissionmode || contractFields.runtime_permission_mode || "").trim();
  if (!declared) return fallback;
  const allowed = new Set(["plan", "default", "auto", "acceptEdits", "dontAsk"]);
  return allowed.has(declared) ? declared : fallback;
}

function runRuntimeAuthLiveCheck({ contractFields, mode, authSentinel, workspacePath, runtimeCommand }) {
  const agent = String(contractFields?.agent || "").toLowerCase().trim();
  if (authSentinel === "off") {
    return { ok: true, skipped: true, reason: "auth-sentinel-off", agent };
  }
  if (authSentinel === "auto" && !(mode === "run" && agent === "claude")) {
    return { ok: true, skipped: true, reason: "auth-sentinel-auto-skip", agent };
  }
  if (agent === "human") {
    return { ok: true, skipped: true, reason: "human-runtime", agent };
  }
  if (agent !== "claude") {
    return { ok: true, skipped: true, reason: "live-sentinel-not-implemented", agent };
  }
  const runtime = buildAutomationRuntimeEnv({ env: process.env });
  const sentinelCheck = runClaudeSentinelWithLocalConfigFallback({
    companyRoot: workspacePath || process.cwd(),
    env: runtime.env,
    claudeBinary: runtimeCommand || DEFAULT_CLAUDE_COMMAND,
  });
  const runtimeAuth = summarizeClaudeRuntimeAuthCheck({
    runtimeAuth: runtime.summary.claude,
    sentinelCheck,
  });
  const ok = Boolean(runtimeAuth.ok && sentinelCheck.ok);
  const check = {
    ok,
    skipped: false,
    agent,
    runtime_auth: runtimeAuth,
    sentinel: {
      ok: sentinelCheck.sentinel.ok,
      exitCode: sentinelCheck.sentinel.exitCode,
      signal: sentinelCheck.sentinel.signal,
      timedOut: sentinelCheck.sentinel.timedOut,
      stdout: sentinelCheck.sentinel.stdout,
      stderr: sentinelCheck.sentinel.stderr,
      blocker: sentinelCheck.sentinel.blocker,
      fallback: sentinelCheck.fallback,
    },
  };
  Object.defineProperty(check, "selected_env", {
    value: sentinelCheck.env,
    enumerable: false,
    configurable: false,
  });
  return check;
}

function parseProbeCommand(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string" && entry.trim())) {
        return parsed.map((entry) => entry.trim());
      }
    } catch {
      return null;
    }
    return null;
  }
  return text.split(/\s+/).filter(Boolean);
}

function runBrowserAuthProbeCommand({ declared, env = process.env }) {
  const command = parseProbeCommand(env.COMPANY_OS_BROWSER_AUTH_PROBE_COMMAND);
  if (!command?.length) return null;
  const [bin, ...args] = command;
  const probe = spawnSync(bin, [...args, "--declared", declared, "--json"], {
    encoding: "utf8",
    timeout: 5_000,
    env,
  });
  let parsed = null;
  try {
    parsed = probe.stdout ? JSON.parse(probe.stdout) : null;
  } catch {
    parsed = null;
  }
  if (probe.status === 0 && parsed?.ok === true) {
    return {
      ok: true,
      source: "probe-command",
      declared,
      browser_auth_kind: parsed.browser_auth_kind || parsed.proof?.kind || declared,
      proof: parsed.proof || null,
    };
  }
  return {
    ok: false,
    source: "probe-command",
    declared,
    reason: parsed?.reason || "browser-auth-probe-command-failed",
    status: probe.status,
    signal: probe.signal,
    timedOut: Boolean(probe.error && probe.error.code === "ETIMEDOUT"),
    stderr: (probe.stderr || "").slice(0, 500),
  };
}

function runBrowserAuthProofFileCheck({ declared, env = process.env }) {
  const proofFile = String(
    env.COMPANY_OS_BROWSER_AUTH_PROOF_FILE
      || (env === process.env ? DEFAULT_BROWSER_AUTH_PROOF_FILE : "")
      || "",
  ).trim();
  if (!proofFile || !existsSync(proofFile)) return null;
  let proof = null;
  try {
    proof = JSON.parse(readFileSync(proofFile, "utf8"));
  } catch (error) {
    return {
      ok: false,
      source: "proof-file",
      declared,
      proof_file: proofFile,
      reason: "browser-auth-proof-read-failed",
      error: error.message,
    };
  }
  const result = evaluateBrowserAuthProof({ proof, declared });
  return { ...result, source: "proof-file", proof_file: proofFile };
}

export function runRuntimeBrowserAuthLiveCheck({ contractFields, env = process.env } = {}) {
  const declared = String(
    contractFields?.runtimebrowserauth
      || contractFields?.runtime_browser_auth
      || "",
  ).trim().toLowerCase();
  if (!declared || ["none", "forbidden"].includes(declared)) {
    return null;
  }

  const commandCheck = runBrowserAuthProbeCommand({ declared, env });
  if (commandCheck) return commandCheck;

  const proofFileCheck = runBrowserAuthProofFileCheck({ declared, env });
  if (proofFileCheck) return proofFileCheck;

  const envOk = String(env.COMPANY_OS_BROWSER_AUTH_OK || "").trim() === "1";
  if (envOk) {
    return {
      ok: true,
      source: "legacy-env-sentinel",
      declared,
      browser_auth_kind: env.COMPANY_OS_BROWSER_AUTH_KIND || declared,
    };
  }
  return {
    ok: false,
    source: "runtime-preflight",
    declared,
    reason: "authenticated browser connector is not exposed to this runtime",
  };
}

function toWorkspaceRelativeArtifact(workspacePath, absolutePath) {
  const rel = relativePath(workspacePath, absolutePath);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) return absolutePath;
  return rel.split(sep).join("/");
}

export function writeRuntimeRaindropSummaryArtifacts({
  workspacePath,
  runId,
  workItem,
  contractFields,
  startedAt,
  endedAt,
  state,
  streamHealth,
  streamPath,
  reportPath,
} = {}) {
  const day = String(endedAt || new Date().toISOString()).slice(0, 10);
  const outputDir = resolvePath(workspacePath, "reports", "observability", "raindrop-workshop", day);
  const summary = buildRaindropCallSummaryFromDispatcherRun({
    runId,
    workItem,
    contractFields,
    startedAt,
    endedAt,
    state,
    streamHealth,
    streamSummary: streamHealth?.summary || null,
    traceArtifact: toWorkspaceRelativeArtifact(workspacePath, streamPath),
    reportArtifact: toWorkspaceRelativeArtifact(workspacePath, reportPath),
  });
  const written = writeRaindropCallSummary(summary, outputDir, { runId });
  return {
    summary,
    jsonPath: written.jsonPath,
    mdPath: written.mdPath,
  };
}

/**
 * Prompt-result evaluation eligibility: the artifact is only generated after a
 * successful worker + CAO + Codex Controller chain. Any skipped or non-zero
 * stage produces a documented skip reason so downstream observability and
 * Plane comments can see why no artifact was emitted.
 */
export function evaluatePromptResultEvaluationEligibility({
  state,
  caoResult,
  codexControllerResult,
} = {}) {
  if (state !== RUN_STATES.PASS) {
    return { eligible: false, skip_reason: "runtime-not-pass" };
  }
  if (!caoResult) {
    return { eligible: false, skip_reason: "cao-missing" };
  }
  if (caoResult.skipped) {
    const detail = caoResult.reason || caoResult.mode || "unknown";
    return { eligible: false, skip_reason: `cao-skipped:${detail}` };
  }
  if (caoResult.exitCode !== 0) {
    return { eligible: false, skip_reason: `cao-exit-${caoResult.exitCode}` };
  }
  if (!codexControllerResult) {
    return { eligible: false, skip_reason: "codex-controller-missing" };
  }
  if (codexControllerResult.skipped) {
    const detail = codexControllerResult.reason || codexControllerResult.mode || "unknown";
    return { eligible: false, skip_reason: `codex-controller-skipped:${detail}` };
  }
  if (codexControllerResult.exitCode !== 0) {
    return { eligible: false, skip_reason: `codex-controller-exit-${codexControllerResult.exitCode}` };
  }
  return { eligible: true, skip_reason: null };
}

/**
 * Build and write the privacy-safe Raindrop prompt-result evaluation artifact
 * for a completed worker + CAO + Codex Controller chain. The artifact stores
 * hashes, counts and verdict metadata only; raw prompts, raw model output, tool
 * payloads, secrets, browser storage, private memory, customer data and
 * regulated content are never captured. Validation runs inside
 * `writePromptResultEvaluation`; a privacy failure throws and prevents the
 * file from landing on disk.
 */
export function writeRuntimePromptResultEvaluationArtifacts({
  workspacePath,
  runId,
  workItem,
  contractFields = {},
  description = "",
  endedAt,
  callSummary = null,
  workerReportText = "",
  caoEvidenceText = "",
  controllerEvidenceText = "",
  changedFiles = [],
  promptTemplateVersion = "runtime-dispatcher-v1.2/contract-v0",
} = {}) {
  const day = String(endedAt || new Date().toISOString()).slice(0, 10);
  const outputDir = resolvePath(workspacePath, "reports", "observability", "raindrop-workshop", day);
  const planeIssue = workItem?.sequence_id ? formatPlaneWorkItemSequence(workItem) : (workItem?.id || "none");
  const combinedControllerEvidence = [caoEvidenceText, controllerEvidenceText]
    .map((entry) => String(entry || ""))
    .filter(Boolean)
    .join("\n\n");
  const evaluation = buildPromptResultEvaluation({
    runId,
    planeIssue,
    promptTemplateVersion,
    contractText: String(description || ""),
    contractFields,
    callSummary,
    workerReportText: String(workerReportText || ""),
    controllerEvidenceText: combinedControllerEvidence,
    changedFiles,
  });
  const written = writePromptResultEvaluation(evaluation, outputDir, { runId });
  return {
    evaluation,
    jsonPath: written.jsonPath,
    mdPath: written.mdPath,
  };
}

function setRunPromptResultEvaluation(result, value) {
  if (!result?.run) return;
  result.run.promptResultEvaluation = value;
  result.run.prompt_result_evaluation = value;
}

export function promptResultEvaluationBlocksRuntime(result = {}) {
  const pre = result?.run?.promptResultEvaluation || result?.run?.prompt_result_evaluation || {};
  return String(pre.skip_reason || "").startsWith("prompt-result-eval-error:");
}

function findCapabilityProfile(registry, contractFields) {
  const profileId = String(contractFields.capabilityprofile || contractFields.capability_profile || "").trim();
  if (!profileId) return null;
  return (registry?.profiles || []).find((profile) => profile.id === profileId) || null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(usage()); return; }

  const errors = [];
  if (!["dry-run", "run"].includes(args.mode)) errors.push("--mode must be dry-run or run");
  if (!["off", "dry-run", "post"].includes(args.controller)) errors.push("--controller must be off, dry-run or post");
  if (!["off", "dry-run", "post"].includes(args.codexController)) errors.push("--codex-controller must be off, dry-run or post");
  if (!["off", "warn", "kill"].includes(args.scopeGuard)) errors.push("--scope-guard must be off, warn or kill");
  if (!["auto", "off", "require"].includes(args.authSentinel)) errors.push("--auth-sentinel must be auto, off or require");
  if (!args.workspace) errors.push("--workspace is required");
  if (!args.projectId) errors.push("--project-id is required");
  if (!args.workItemId) errors.push("--work-item-id is required");
  const auth = resolvePlaneAuth(args.auth);
  if (!auth.ok) errors.push(auth.missingError);
  const capabilityRegistry = loadCapabilityRegistry(args.capabilityRegistry);
  if (!capabilityRegistry.ok) {
    errors.push(`capability registry invalid: ${capabilityRegistry.reason_codes.join(",")}`);
  }
  const inferenceRegistry = args.inferenceRoute === "off"
    ? { ok: true, registry: null, reason_codes: [] }
    : loadInferenceRegistry(args.inferenceRegistry);
  if (!inferenceRegistry.ok) {
    errors.push(`inference registry invalid: ${inferenceRegistry.reason_codes.join(",")}`);
  }

  const result = {
    version: "runtime-dispatcher-v1-cli/1.2",
    workspace: args.workspace,
    projectId: args.projectId,
    workItemId: args.workItemId,
    mode: args.mode,
    authMode: auth.authMode,
    capabilityRegistry: args.capabilityRegistry,
    inferenceRegistry: args.inferenceRegistry,
    inferenceRoute: args.inferenceRoute,
    runtimeCommand: args.runtimeCommand,
    runtimeModel: args.runtimeModel,
    runtimeEffort: args.runtimeEffort,
    permissionMode: args.permissionMode,
    authSentinel: args.authSentinel,
    controller: args.controller,
    codexController: args.codexController,
    ok: errors.length === 0,
    errors,
  };
  if (errors.length) { printResult(result, args.json); process.exitCode = 2; return; }

  const itemPath = `/api/v1/workspaces/${encodeURIComponent(args.workspace)}/projects/${encodeURIComponent(args.projectId)}/work-items/${encodeURIComponent(args.workItemId)}/`;
  const itemResp = await requestJson({ baseUrl: args.baseUrl, authHeaders: auth.headers, path: itemPath });
  if (!itemResp.ok) {
    result.ok = false;
    result.error = itemResp.body;
    result.status = itemResp.status;
    printResult(result, args.json);
    process.exitCode = 1;
    return;
  }
  const workItem = itemResp.body;
  const projectIdentifier = await fetchProjectIdentifier({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    workspace: args.workspace,
    projectId: args.projectId,
  });
  if (projectIdentifier) workItem._project_identifier = projectIdentifier;

  const commentsPath = `${itemPath}comments/`;
  const commentsResp = await requestJson({ baseUrl: args.baseUrl, authHeaders: auth.headers, path: commentsPath });
  if (!commentsResp.ok) {
    result.ok = false;
    result.error = commentsResp.body;
    result.status = commentsResp.status;
    printResult(result, args.json);
    process.exitCode = 1;
    return;
  }
  const comments = Array.isArray(commentsResp.body) ? commentsResp.body : (commentsResp.body?.results || []);

  const description = stripHtml(workItem.description_html || workItem.description_stripped || "");
  const currentDescriptionHash = canonicalDescriptionHash(workItem);
  const currentDescriptionHashes = descriptionHashCandidates(workItem);
  const extracted = extractContractBlock(description);
  const contractFields = extracted.ok ? extracted.fields : {};
  const capabilityProfile = findCapabilityProfile(capabilityRegistry.registry, contractFields);
  let selectedRuntimeModel = args.runtimeModel;
  let selectedMaxTurnsFallback = args.maxTurns;
  let selectedPermissionModeFallback = args.permissionMode;
  if (args.inferenceRoute !== "off") {
    const explicitClass = args.inferenceRoute === "auto" ? "" : args.inferenceRoute;
    const inference = routeInference({
      registry: inferenceRegistry.registry,
      contractFields,
      workItem,
      explicitClass,
    });
    result.inference_route = inference;
    if (!inference.ok) {
      result.ok = false;
      result.error = "inference-blocked";
      printResult(result, args.json);
      process.exitCode = 2;
      return;
    }
    if (inference.runtime?.model && inference.runtime.model !== "none") {
      selectedRuntimeModel = inference.runtime.model;
    }
    if (inference.runtime?.max_turns) {
      selectedMaxTurnsFallback = String(inference.runtime.max_turns);
    }
    if (inference.runtime?.permission_mode) {
      selectedPermissionModeFallback = String(inference.runtime.permission_mode);
    }
    result.runtimeModel = selectedRuntimeModel;
  }

  const runtimeAuthCheck = runRuntimeAuthLiveCheck({
    contractFields,
    mode: args.mode,
    authSentinel: args.authSentinel,
    workspacePath: resolveRuntimeWorkspacePath(contractFields.workspace) || process.cwd(),
    runtimeCommand: args.runtimeCommand,
  });
  result.runtime_auth_check = runtimeAuthCheck;
  const runtimeBrowserAuthCheck = runRuntimeBrowserAuthLiveCheck({ contractFields });
  result.runtime_browser_auth_check = runtimeBrowserAuthCheck;
  const dependencyStatuses = await loadPlaneDependencyStatusMap({
    baseUrl: args.baseUrl,
    authHeaders: auth.headers,
    workspace: args.workspace,
    projectId: args.projectId,
    contractFields,
    projectIdentifier,
  });
  result.dependency_statuses = Object.fromEntries(dependencyStatuses.entries());

  const dryRun = runDryRun({
    workItem,
    comments,
    contractFields,
    description,
    currentDescriptionHash,
    currentDescriptionHashes,
    runtimeAuthDeclared: Boolean(contractFields.runtimeauth || contractFields.runtime_auth),
    runtimeAuthCheck,
    runtimeBrowserAuthCheck,
    // No real cost-router or dependency adapters in Phase 1.1; defaults are
    // conservative. Dependency status is resolved from Plane comments.
    costRouterApproval: false,
    workspaceHealthChecker: undefined,
    dependencyStatusResolver: (dep) => {
      const normalized = normalizeDependencyRef(dep);
      return dependencyStatuses.get(normalized) || { status: "unknown", source: "dependency-status-missing" };
    },
    capabilityRegistry: capabilityRegistry.registry,
    fsExists: existsSync,
    fsStat: statSync,
    now: new Date(),
  });

  result.dry_run = dryRun;
  if (args.mode === "dry-run") {
    result.ok = dryRun.state === RUN_STATES.PASS;
    printResult(result, args.json);
    process.exitCode = result.ok ? 0 : 2;
    return;
  }

  if (dryRun.state !== RUN_STATES.PASS) {
    result.ok = false;
    result.error = "preflight-blocked";
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  const runId = randomUUID();
  const workspacePath = resolveRuntimeWorkspacePath(contractFields.workspace);
  if (!workspacePath) {
    result.ok = false;
    result.error = "runtime workspace could not be resolved";
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  const reportPath = extractDeclaredArtifactPath(contractFields, runId);
  const streamPath = deriveRuntimeStreamPath(reportPath, runId);
  const allowedReadPaths = resolveAllowedReadPaths(contractFields, workspacePath);
  const allowedWritePaths = resolveAllowedWritePaths(contractFields, workspacePath);
  const runtimeOwnedReadPaths = resolveRuntimeOwnedReadPaths({ reportPath, streamPath });
  const effectiveAllowedReadPaths = resolveEffectiveAllowedReadPaths({
    allowedReadPaths,
    workspacePath,
    runtimeOwnedReadPaths,
  });
  const runtimeOwnedWritePaths = resolveRuntimeOwnedWritePaths({
    workspacePath,
    reportPath,
    streamPath,
    metricsPath: args.metricsPath,
  });
  const effectiveAllowedWritePaths = [...new Set([...allowedWritePaths.paths, ...runtimeOwnedWritePaths])];
  const workerScopeGuardWritePaths = allowedWritePaths.paths.length ? effectiveAllowedWritePaths : [];
  const killSwitchPaths = resolveKillSwitchPaths(contractFields, workspacePath);
  mkdirSync(reportParentDir(reportPath), { recursive: true });
  const startedAt = new Date().toISOString();
  const baselineChangedFiles = listChangedFilesSync(workspacePath);
  const allowedTools = resolveClaudeAllowedTools({ contractFields, capabilityProfile });
  const runtimePermissionMode = resolveRuntimePermissionMode(contractFields, selectedPermissionModeFallback);
  result.permissionMode = runtimePermissionMode;
  result.allowedTools = allowedTools;
  const prompt = buildWorkerPrompt({
    workItem,
    contractFields,
    description,
    dryRun,
    reportPath,
    runId,
    capabilityProfile,
    allowedTools,
    allowedWritePaths: workerScopeGuardWritePaths,
  });
  const maxTurns = resolveRuntimeMaxTurns(contractFields, selectedMaxTurnsFallback);
  result.maxTurns = maxTurns;
  const runtimeArgs = buildClaudeRuntimeArgs({
    prompt,
    model: selectedRuntimeModel,
    effort: args.runtimeEffort,
    permissionMode: runtimePermissionMode,
    maxTurns,
    allowedTools,
    addDirs: allowedReadPaths.paths.filter((path) => path !== workspacePath),
  });
  const timeoutMs = parseRuntimeDurationMs(contractFields.maxruntime || contractFields.max_runtime, 30 * 60 * 1000);
  const runtime = await runProcess(args.runtimeCommand, runtimeArgs, {
    cwd: workspacePath,
    env: runtimeAuthCheck.selected_env || process.env,
    timeoutMs,
    streamPath,
    heartbeatMs: Number(args.heartbeatMs) || 60_000,
    allowedReadPaths: effectiveAllowedReadPaths,
    allowedWritePaths: workerScopeGuardWritePaths,
    baselineChangedFiles,
    scopeGuardMode: args.scopeGuard,
    killSwitchPaths,
    killSwitchCheck: buildPlaneKillSwitchCheck({
      baseUrl: args.baseUrl,
      authHeaders: auth.headers,
      itemPath,
      workItem,
      pollMs: args.killSwitchPollMs,
    }),
    onHeartbeat: (heartbeat) => {
      appendAgentEvents(args.metricsPath, [
        buildAgentEventRow({
          eventType: "worker.heartbeat",
          runId,
          workItem,
          contractFields,
          workspacePath,
          artifactPaths: [streamPath],
          payload: {
            state: "running",
            progress: "runtime process alive",
            elapsed_ms: heartbeat.elapsed_ms,
            changed_files: heartbeat.changed_files,
            worker_attributed_changed_files: heartbeat.worker_attributed_changed_files,
            external_changed_files: heartbeat.external_changed_files,
            out_of_scope_files: heartbeat.out_of_scope_files,
            scope_guard_mode: heartbeat.scope_guard_mode,
          },
          occurredAt: heartbeat.at,
        }),
      ]);
    },
  });
  const endedAt = new Date().toISOString();
  const stateInference = inferRuntimeStateFromWorkerOutput(runtime);
  const changedFiles = subtractBaselineChangedFiles(await listChangedFiles(workspacePath), baselineChangedFiles);
  const finalAttribution = splitChangedFilesByRuntimeAttribution(
    changedFiles,
    [...(runtime.workerWritePaths || []), ...runtimeOwnedWritePaths],
  );
  const outOfScopeFiles = detectOutOfScopeFiles(finalAttribution.worker_attributed_changed_files, workerScopeGuardWritePaths);
  const streamText = existsSync(streamPath) ? readFileSync(streamPath, "utf8") : "";
  const streamHealth = evaluateRuntimeStreamHealth(summarizeRuntimeStreamLog(streamText));
  const finalState = finalizeRuntimeState({
    initialState: stateInference.state,
    initialReason: stateInference.reason,
    streamHealth,
    outOfScopeFiles,
  });
  let state = finalState.state;
  let stateReason = finalState.reason;
  const workerReportExists = existsSync(reportPath);
  const workerReportText = workerReportExists ? readFileSync(reportPath, "utf8") : "";
  const runtimeReportPath = deriveRuntimeRunReportPath(reportPath, runId);
  const report = buildRunReportMarkdown({
    runId,
    state,
    startedAt,
    endedAt,
    workItem,
    contractFields,
    runtime: contractFields.agent || "claude",
    command: [args.runtimeCommand, ...sanitizeRuntimeCommandArgs(runtimeArgs)],
    exitCode: runtime.exitCode,
    stdout: runtime.stdout,
    stderr: runtime.stderr,
    changedFiles,
    streamPath,
    heartbeatCount: runtime.heartbeatCount,
    interventions: runtime.interventions,
    dryRun,
    reportPath: runtimeReportPath,
    workerStateReason: stateReason,
    workerDeclaredState: stateInference.worker_declared_state,
    streamHealth,
    allowedWriteScope: {
      effective_paths: effectiveAllowedWritePaths,
      worker_scope_guard_paths: workerScopeGuardWritePaths,
      changed_files: changedFiles,
      worker_write_paths: runtime.workerWritePaths || [],
      worker_attributed_changed_files: finalAttribution.worker_attributed_changed_files,
      external_changed_files: finalAttribution.external_changed_files,
      out_of_scope_files: outOfScopeFiles,
    },
  });
  writeFileSync(runtimeReportPath, report, "utf8");
  const raindropArtifacts = writeRuntimeRaindropSummaryArtifacts({
    workspacePath,
    runId,
    workItem,
    contractFields,
    startedAt,
    endedAt,
    state,
    streamHealth,
    streamPath,
    reportPath: runtimeReportPath,
  });
  const runArtifactPaths = [
    reportPath,
    runtimeReportPath,
    streamPath,
    raindropArtifacts.jsonPath,
    raindropArtifacts.mdPath,
  ];

  const eventOccurredAt = new Date().toISOString();
  const eventRows = [
    buildAgentEventRow({
      eventType: "worker.reported",
      runId,
      workItem,
      contractFields,
      workspacePath,
      artifactPaths: runArtifactPaths,
      payload: {
        state,
        exit_code: runtime.exitCode,
        timed_out: runtime.timedOut,
        killed_reason: runtime.killedReason || null,
        worker_declared_state: stateInference.worker_declared_state,
        state_reason: stateReason,
        stream_health: streamHealth.ok ? "PASS" : "NEEDS_HUMAN",
        stream_reason_codes: streamHealth.reason_codes,
        stream_event_count: streamHealth.summary.stream,
        worker_attributed_change_count: finalAttribution.worker_attributed_changed_files.length,
        external_change_count: finalAttribution.external_changed_files.length,
        out_of_scope_change_count: outOfScopeFiles.length,
      },
      occurredAt: eventOccurredAt,
    }),
    buildAgentEventRow({
      eventType: "ledger.run_summarized",
      runId,
      workItem,
      contractFields,
      workspacePath,
      artifactPaths: runArtifactPaths,
      payload: {
        state,
        report_path: reportPath,
        stream_path: streamPath,
        raindrop_summary_json: raindropArtifacts.jsonPath,
        raindrop_summary_md: raindropArtifacts.mdPath,
        stream_health: streamHealth.ok ? "PASS" : "NEEDS_HUMAN",
        stream_event_count: streamHealth.summary.stream,
        worker_attributed_change_count: finalAttribution.worker_attributed_changed_files.length,
        external_change_count: finalAttribution.external_changed_files.length,
        out_of_scope_change_count: outOfScopeFiles.length,
      },
      occurredAt: eventOccurredAt,
    }),
  ];
  appendAgentEvents(args.metricsPath, eventRows);

  const summaryYaml = buildRunSummaryYaml({
    runId,
    state,
    workItem,
    reportPath,
    streamPath,
    runtime: contractFields.agent || "claude",
    startedAt,
    endedAt,
    workerDeclaredState: stateInference.worker_declared_state,
    workerStateReason: stateReason,
    heartbeatCount: runtime.heartbeatCount,
    streamHealth,
    outOfScopeFiles,
  });
  const reportedYaml = buildWorkerReportedYaml({
    runId,
    state,
    workItem,
    reportPath,
    runtime: contractFields.agent || "claude",
    exitCode: runtime.exitCode,
    changedFiles,
    streamPath,
    heartbeatCount: runtime.heartbeatCount,
    interventions: runtime.interventions,
    startedAt,
    endedAt,
    workerDeclaredState: stateInference.worker_declared_state,
    workerStateReason: stateReason,
    streamHealth,
    outOfScopeFiles,
    workerOutputText: `${workerReportText}\n${runtime.stdout}\n${runtime.stderr}`,
  });

  result.run = {
    dispatcher_run_id: runId,
    state,
    exitCode: runtime.exitCode,
    workerDeclaredState: stateInference.worker_declared_state,
    stateReason,
    timedOut: runtime.timedOut,
    maxTurns,
    streamPath,
    heartbeatCount: runtime.heartbeatCount,
    killedReason: runtime.killedReason || null,
    interventions: runtime.interventions,
    allowedReadPaths: {
      ...allowedReadPaths,
      runtime_owned_paths: runtimeOwnedReadPaths,
      effective_paths: effectiveAllowedReadPaths,
    },
    allowedWritePaths: {
      ...allowedWritePaths,
      runtime_owned_paths: runtimeOwnedWritePaths,
      effective_paths: effectiveAllowedWritePaths,
      worker_scope_guard_paths: workerScopeGuardWritePaths,
    },
    killSwitchPaths,
    reportPath,
    runtimeReportPath,
    changedFiles,
    workerWritePaths: runtime.workerWritePaths || [],
    workerAttributedChangedFiles: finalAttribution.worker_attributed_changed_files,
    externalChangedFiles: finalAttribution.external_changed_files,
    outOfScopeFiles,
    streamHealth: {
      ok: streamHealth.ok,
      reason_codes: streamHealth.reason_codes,
      summary: streamHealth.summary,
    },
    metricsRowsAppended: eventRows.length,
    raindropSummary: {
      jsonPath: raindropArtifacts.jsonPath,
      mdPath: raindropArtifacts.mdPath,
      version: raindropArtifacts.summary?.["raindrop.llm_call_summary"]?.version || null,
    },
  };

  if (args.planeWrite) {
    const summaryPost = await postComment({
      baseUrl: args.baseUrl,
      authHeaders: auth.headers,
      path: itemPath,
      title: "worker.run-summary (dispatcher-v1)",
      yaml: summaryYaml,
    });
    const reportedPost = await postComment({
      baseUrl: args.baseUrl,
      authHeaders: auth.headers,
      path: itemPath,
      title: "worker.reported",
      yaml: reportedYaml,
    });
    result.run.plane_comments = {
      run_summary: { ok: summaryPost.ok, status: summaryPost.status, id: summaryPost.body?.id || null },
      worker_reported: { ok: reportedPost.ok, status: reportedPost.status, id: reportedPost.body?.id || null },
    };
    if (!summaryPost.ok || !reportedPost.ok) {
      result.ok = false;
      result.error = "plane-comment-post-failed";
      printResult(result, args.json);
      process.exitCode = 1;
      return;
    }
  }

  if (state !== RUN_STATES.PASS) {
    result.cao_result = { skipped: true, reason: "runtime-not-pass" };
    result.codex_controller_result = { skipped: true, reason: "runtime-not-pass" };
    const skipEligibility = evaluatePromptResultEvaluationEligibility({
      state,
      caoResult: result.cao_result,
      codexControllerResult: result.codex_controller_result,
    });
    setRunPromptResultEvaluation(result, {
      jsonPath: null,
      mdPath: null,
      verdict: null,
      overall: null,
      skip_reason: skipEligibility.skip_reason,
    });
    appendAgentEvents(args.metricsPath, [
      buildAgentEventRow({
        eventType: "dispatcher.prompt_result_eval",
        runId,
        workItem,
        contractFields,
        workspacePath,
        artifactPaths: [],
        payload: {
          generated: false,
          skip_reason: skipEligibility.skip_reason,
          verdict: null,
          overall: null,
        },
        occurredAt: new Date().toISOString(),
      }),
    ]);
    result.run.metricsRowsAppended += 1;
    result.ok = false;
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  result.cao_result = args.planeWrite
    ? await maybeRunCao({ args, auth })
    : { skipped: true, reason: "plane-write-disabled" };
  result.codex_controller_result = args.planeWrite && args.controller === "post" && result.cao_result.exitCode === 0
    ? await maybeRunCodexController({ args, auth })
    : { skipped: true, reason: "cao-not-posted-or-failed" };

  const eligibility = evaluatePromptResultEvaluationEligibility({
    state,
    caoResult: result.cao_result,
    codexControllerResult: result.codex_controller_result,
  });
  if (eligibility.eligible) {
    try {
      const promptResultArtifacts = writeRuntimePromptResultEvaluationArtifacts({
        workspacePath,
        runId,
        workItem,
        contractFields,
        description,
        endedAt,
        callSummary: raindropArtifacts.summary,
        workerReportText,
        caoEvidenceText: result.cao_result?.stdout || "",
        controllerEvidenceText: result.codex_controller_result?.stdout || "",
        changedFiles,
      });
      const evaluationRoot = promptResultArtifacts.evaluation["raindrop.prompt_result_evaluation"];
      setRunPromptResultEvaluation(result, {
        jsonPath: promptResultArtifacts.jsonPath,
        mdPath: promptResultArtifacts.mdPath,
        verdict: evaluationRoot.score?.verdict || null,
        overall: evaluationRoot.score?.overall ?? null,
        skip_reason: null,
      });
      appendAgentEvents(args.metricsPath, [
        buildAgentEventRow({
          eventType: "dispatcher.prompt_result_eval",
          runId,
          workItem,
          contractFields,
          workspacePath,
          artifactPaths: [promptResultArtifacts.jsonPath, promptResultArtifacts.mdPath],
          payload: {
            generated: true,
            skip_reason: null,
            verdict: evaluationRoot.score?.verdict || null,
            overall: evaluationRoot.score?.overall ?? null,
            improvement_proposal_count: Array.isArray(evaluationRoot.improvement_proposals)
              ? evaluationRoot.improvement_proposals.length
              : 0,
          },
          occurredAt: new Date().toISOString(),
        }),
      ]);
      result.run.metricsRowsAppended += 1;
    } catch (error) {
      setRunPromptResultEvaluation(result, {
        jsonPath: null,
        mdPath: null,
        verdict: null,
        overall: null,
        skip_reason: `prompt-result-eval-error:${error.message}`,
      });
      appendAgentEvents(args.metricsPath, [
        buildAgentEventRow({
          eventType: "dispatcher.prompt_result_eval",
          runId,
          workItem,
          contractFields,
          workspacePath,
          artifactPaths: [],
          payload: {
            generated: false,
            skip_reason: `prompt-result-eval-error:${error.message}`,
            verdict: null,
            overall: null,
          },
          occurredAt: new Date().toISOString(),
        }),
      ]);
      result.run.metricsRowsAppended += 1;
    }
  } else {
    setRunPromptResultEvaluation(result, {
      jsonPath: null,
      mdPath: null,
      verdict: null,
      overall: null,
      skip_reason: eligibility.skip_reason,
    });
    appendAgentEvents(args.metricsPath, [
      buildAgentEventRow({
        eventType: "dispatcher.prompt_result_eval",
        runId,
        workItem,
        contractFields,
        workspacePath,
        artifactPaths: [],
        payload: {
          generated: false,
          skip_reason: eligibility.skip_reason,
          verdict: null,
          overall: null,
        },
        occurredAt: new Date().toISOString(),
      }),
    ]);
    result.run.metricsRowsAppended += 1;
  }

  result.ok = state === RUN_STATES.PASS
    && (!result.cao_result || result.cao_result.exitCode === undefined || result.cao_result.exitCode === 0)
    && (!result.codex_controller_result || result.codex_controller_result.exitCode === undefined || result.codex_controller_result.exitCode === 0)
    && !promptResultEvaluationBlocksRuntime(result);
  printResult(result, args.json);
  process.exitCode = result.ok ? 0 : 2;
}

function printResult(result, json) {
  if (json) { console.log(JSON.stringify(result, null, 2)); return; }
  console.log(`runtime-dispatcher-v1 ${result.mode}: ${result.ok ? "PASS" : "BLOCKED"}`);
  if (result.dry_run) {
    console.log(`work item: ${result.dry_run.work_item.sequence_id || result.dry_run.work_item.id}`);
    console.log(`state: ${result.dry_run.state}`);
    if (result.dry_run.blocked_reasons.length) {
      console.log(`blocked reasons: ${result.dry_run.blocked_reasons.join(", ")}`);
    }
    for (const p of result.dry_run.preflights) {
      console.log(`  ${p.name}: ${p.state}${p.reason ? " (" + p.reason + ")" : ""}`);
    }
  }
  if (result.run) {
    console.log(`run state: ${result.run.state}`);
    console.log(`report: ${result.run.reportPath}`);
    console.log(`metrics rows: ${result.run.metricsRowsAppended}`);
    if (result.run.promptResultEvaluation) {
      const pre = result.run.promptResultEvaluation;
      if (pre.jsonPath) {
        console.log(`prompt-result evaluation: ${pre.verdict} ${pre.overall}`);
        console.log(`prompt-result json: ${pre.jsonPath}`);
        console.log(`prompt-result md: ${pre.mdPath}`);
      } else if (pre.skip_reason) {
        console.log(`prompt-result evaluation: skipped (${pre.skip_reason})`);
      }
    }
  }
  for (const e of result.errors || []) console.log(`error: ${e}`);
  if (result.error) console.log(`error: ${JSON.stringify(result.error).slice(0, 300)}`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    console.error(`runtime-dispatcher-v1 failed: ${err.message}`);
    process.exitCode = 1;
  });
}
