/**
 * raindrop-call-adapter.mjs
 *
 * Local call-summary adapter for Company.OS-owned LLM call boundaries.
 *
 * Produces Raindrop-shaped local JSON/Markdown summaries for every instrumented
 * Company.OS runtime call. Does NOT capture raw prompts, tool payloads, API
 * keys, private memory, customer data or regulated content.
 *
 * Privacy guarantee:
 *   - input_redaction_level is always "redacted" (raw prompts never captured)
 *   - output_redaction_level is "internal" (summary counts only, no raw text)
 *   - No secrets, cookies, browser storage or private data appear in artifacts
 *
 * Source of truth: docs/operations/raindrop-llm-call-observability.md
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

import { buildGoalRuntimeAdapter } from "../goal/goal-runtime-adapter-core.mjs";
import { formatPlaneWorkItemSequence } from "./runtime-dispatcher-v12-core.mjs";

export const RAINDROP_ADAPTER_VERSION = "raindrop-call-adapter/v0";

// Canonical version identifier that appears in every summary artifact.
export const RAINDROP_SUMMARY_VERSION = "raindrop-llm-call/v0";

// Surfaces that currently emit raindrop call summaries.
export const INSTRUMENTED_SURFACES = Object.freeze([
  "runtime-dispatcher-v1.2/worker-spawn",
  "hard-cron-wrapper/llm-spawn",
  "plane-ui-worker-cadence-runner/llm-spawn",
  "model-router/claude-cli-worker",
  "model-router/gemini-cli-worker",
  "model-router/codex-openrouter-worker",
  "codex-controller/decision",
  "goal-runtime/worker-run",
]);

// Required coverage surfaces that are NOT yet instrumented.
// Every canonical managed surface from CANONICAL_MANAGED_SURFACES that is not
// in INSTRUMENTED_SURFACES must appear here, plus informational non-canonical
// out-of-scope surfaces. The coverage harness test enforces this invariant.
//
// The six `[SOURCE_WORKSPACE]/marketing-pipeline/*` surfaces are declared NOT YET
// instrumented on the Company.OS side: the ingestion adapter in
// scripts/orchestration/raindrop-marketing-pipeline-ingest.mjs can consume
// envelopes that arrive locally, but the [SOURCE_WORKSPACE] wrapper that actually
// emits these envelopes is a separate role:cto contract that has not yet
// shipped. Promotion into INSTRUMENTED_SURFACES requires that the wrapper
// ships, that envelopes flow end-to-end, and that the SURFACE_BUILDER_REGISTRY
// gains an explicit builder per surface.
export const NOT_YET_INSTRUMENTED_SURFACES = Object.freeze([
  "codex-controller/llm-spawn",
  "hermes-assistant/llm-calls",
  "aionui-hermes/command-layer",
  "scheduler/worker-run",
  "manual-claude-desktop-sessions",
  "arbitrary-cli-sessions-outside-runtime",
  "gemini-cli-workers-outside-company-os-runtime",
  "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-openai",
  "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-codex-cli",
  "[SOURCE_WORKSPACE]/marketing-pipeline/visual-directions-openai",
  "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openrouter",
  "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openai-fallback",
  "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-claude-cli",
]);

const VALID_AGENTS = new Set([
  "claude",
  "codex",
  "gemini",
  "hermes",
  "openai",
  "openrouter",
  "unknown",
]);
const VALID_ERROR_CLASSES = new Set(["none", "auth", "timeout", "nonzero_exit", "scope", "stream", "other"]);
const VALID_REDACTION_LEVELS = new Set(["none", "internal", "redacted", "blocked"]);

function localDate(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function buildRaindropOutputDir({ companyRoot = process.cwd(), now = new Date() } = {}) {
  return join(companyRoot, "reports", "observability", "raindrop-workshop", localDate(now));
}

/**
 * Build a safe Raindrop-shaped LLM call summary object.
 * Never includes raw prompts, tool payloads, secrets, or private data.
 */
export function buildRaindropCallSummary({
  runId,
  planeIssue = "none",
  agent,
  modelRoute,
  mode,
  startedAt,
  endedAt,
  durationMs = null,
  toolCallCount = 0,
  state = "PASS",
  errorClass = "none",
  traceArtifact = "none",
  reportArtifact = "none",
  streamEventCount = 0,
  redactedSecretMarkers = 0,
  surface = "runtime-dispatcher-v1.2/worker-spawn",
} = {}) {
  if (!runId) throw new Error("raindrop-call-adapter: runId is required");

  const normalizedAgent = String(agent || "unknown").toLowerCase();
  if (!VALID_AGENTS.has(normalizedAgent)) {
    throw new Error(`raindrop-call-adapter: agent must be one of ${[...VALID_AGENTS].join(", ")}`);
  }

  const normalizedError = String(errorClass || "none").toLowerCase();
  if (!VALID_ERROR_CLASSES.has(normalizedError)) {
    throw new Error(`raindrop-call-adapter: error_class must be one of ${[...VALID_ERROR_CLASSES].join(", ")}`);
  }

  const computedDurationMs = typeof durationMs === "number" && Number.isFinite(durationMs)
    ? Math.round(durationMs)
    : (startedAt && endedAt
        ? Math.round(new Date(endedAt).getTime() - new Date(startedAt).getTime())
        : null);

  return {
    "raindrop.llm_call_summary": {
      version: RAINDROP_SUMMARY_VERSION,
      adapter: RAINDROP_ADAPTER_VERSION,
      run_id: String(runId),
      plane_issue: String(planeIssue || "none"),
      agent: normalizedAgent,
      model_route: String(modelRoute || "unknown"),
      mode: String(mode || "unknown"),
      started_at: String(startedAt || ""),
      ended_at: String(endedAt || ""),
      duration_ms: computedDurationMs,
      input_redaction_level: "redacted",
      output_redaction_level: "internal",
      token_counts_available: false,
      tool_call_count: Math.max(0, Number(toolCallCount) || 0),
      stream_event_count: Math.max(0, Number(streamEventCount) || 0),
      redacted_secret_markers: Math.max(0, Number(redactedSecretMarkers) || 0),
      error_class: normalizedError,
      state: String(state || "unknown"),
      surface: String(surface || "unknown"),
      trace_artifact: String(traceArtifact || "none"),
      report_artifact: String(reportArtifact || "none"),
      instrumented_surfaces: [...INSTRUMENTED_SURFACES],
      not_yet_instrumented_surfaces: [...NOT_YET_INSTRUMENTED_SURFACES],
    },
  };
}

/**
 * Build a Raindrop call summary from the output of a Runtime Dispatcher v1.2 run.
 * Accepts the same fields that buildRunReportMarkdown receives.
 */
export function buildRaindropCallSummaryFromDispatcherRun({
  runId,
  workItem = {},
  contractFields = {},
  startedAt,
  endedAt,
  state,
  streamHealth = null,
  streamSummary = null,
  traceArtifact = "none",
  reportArtifact = "none",
} = {}) {
  const seq = workItem?.sequence_id ? formatPlaneWorkItemSequence(workItem) : "none";
  const agent = String(contractFields?.agent || "unknown").toLowerCase();
  const modelRoute = String(
    contractFields?.model_route
      || contractFields?.runtimemodel
      || contractFields?.runtime_model_alias
      || "unknown",
  );
  const mode = String(contractFields?.mode || "unknown");
  const toolCallCount = streamSummary?.stream || 0;
  const streamEventCount = streamSummary?.stream || 0;
  const redactedSecretMarkers = streamSummary?.redacted_secret_markers || 0;

  let errorClass = "none";
  if (state === "TIMEOUT") errorClass = "timeout";
  else if (state === "BLOCKED_AUTH") errorClass = "auth";
  else if (state === "RUNTIME_ERROR") errorClass = "nonzero_exit";
  else if (state === "NEEDS_HUMAN") {
    const reason = streamHealth?.reason_codes?.[0] || "";
    if (reason.startsWith("stream.")) errorClass = "stream";
    else errorClass = "scope";
  } else if (state && state !== "PASS") {
    errorClass = "other";
  }

  return buildRaindropCallSummary({
    runId,
    planeIssue: seq,
    agent,
    modelRoute,
    mode,
    startedAt,
    endedAt,
    toolCallCount,
    state,
    errorClass,
    traceArtifact,
    reportArtifact,
    streamEventCount,
    redactedSecretMarkers,
    surface: "runtime-dispatcher-v1.2/worker-spawn",
  });
}

export function buildRaindropCallSummaryFromHardCronRun({
  runId,
  issueId = "",
  agent = "codex",
  mode = "cron",
  costModelAliases = [],
  startedAt,
  endedAt,
  ok = false,
  timedOut = false,
  exitCode = null,
  eventLedgerPath = "none",
  reportArtifact = "none",
} = {}) {
  let errorClass = "none";
  if (timedOut) errorClass = "timeout";
  else if (!ok && exitCode !== 0) errorClass = "nonzero_exit";
  else if (!ok) errorClass = "other";

  return buildRaindropCallSummary({
    runId,
    planeIssue: issueId || "none",
    agent,
    modelRoute: costModelAliases.length ? costModelAliases.join(",") : "unknown",
    mode,
    startedAt,
    endedAt,
    toolCallCount: 1,
    state: ok ? "PASS" : "FAILED",
    errorClass,
    traceArtifact: eventLedgerPath || "none",
    reportArtifact,
    streamEventCount: 0,
    redactedSecretMarkers: 0,
    surface: "hard-cron-wrapper/llm-spawn",
  });
}

export function buildRaindropCallSummaryFromPlaneUiCadenceRun({
  runId,
  issueId = "",
  startedAt,
  endedAt,
  ok = false,
  hardCron = null,
  proofArtifact = "none",
  reportArtifact = "none",
} = {}) {
  const exitCode = hardCron?.exit_code ?? hardCron?.stdout?.exit_code ?? null;
  const timedOut = Boolean(hardCron?.stdout?.timed_out);
  let errorClass = "none";
  if (timedOut) errorClass = "timeout";
  else if (!ok && exitCode !== 0) errorClass = "nonzero_exit";
  else if (!ok) errorClass = "other";

  return buildRaindropCallSummary({
    runId,
    planeIssue: issueId || "none",
    agent: "codex",
    modelRoute: hardCron?.stdout?.raindrop_summary?.model_route || "unknown",
    mode: "cadence",
    startedAt,
    endedAt,
    toolCallCount: 1,
    state: ok ? "PASS" : "FAILED",
    errorClass,
    traceArtifact: proofArtifact || "none",
    reportArtifact,
    streamEventCount: 0,
    redactedSecretMarkers: 0,
    surface: "plane-ui-worker-cadence-runner/llm-spawn",
  });
}

export function buildRaindropCallSummaryFromCodexControllerDecision({
  runId,
  workItem = {},
  decision = {},
  mode = "dry-run",
  startedAt,
  endedAt,
  caoVerdict = null,
  postCommentId = "",
  reportArtifact = "none",
} = {}) {
  const seq = workItem?.sequence_id ? formatPlaneWorkItemSequence(workItem) : (workItem?.id || "none");
  const decisionMode = String(decision?.decision_mode || "PARK");
  const state = decisionMode === "AUTO-GO" ? "PASS" : decisionMode;
  let errorClass = "none";
  if (decisionMode === "REJECT") errorClass = "scope";
  else if (decisionMode === "PARK" || decisionMode === "ASK-FOUNDER") errorClass = "other";

  return buildRaindropCallSummary({
    runId,
    planeIssue: seq,
    agent: "codex",
    modelRoute: "deterministic-node-controller",
    mode,
    startedAt,
    endedAt,
    toolCallCount: postCommentId ? 1 : 0,
    state,
    errorClass,
    traceArtifact: postCommentId || caoVerdict || "none",
    reportArtifact,
    streamEventCount: 0,
    redactedSecretMarkers: 0,
    surface: "codex-controller/decision",
  });
}

export function buildRaindropCallSummaryFromModelRouterResult({
  runId,
  plan = {},
  modelAlias = "unknown",
  profile = {},
  result = {},
  persisted = {},
  startedAt,
  endedAt,
} = {}) {
  const profileKind = String(profile?.kind || "");
  const agent = profileKind === "gemini-cli"
    ? "gemini"
    : profileKind === "claude-cli"
      ? "claude"
      : "codex";
  const surface = profileKind === "gemini-cli"
    ? "model-router/gemini-cli-worker"
    : profileKind === "claude-cli"
      ? "model-router/claude-cli-worker"
      : "model-router/codex-openrouter-worker";
  const timedOut = Boolean(persisted?.timedOut || result?.error?.code === "ETIMEDOUT" || result?.signal === "SIGTERM");
  const exitCode = persisted?.exitCode ?? result?.status ?? null;
  const ok = exitCode === 0 && !timedOut;
  let errorClass = "none";
  if (timedOut) errorClass = "timeout";
  else if (exitCode !== 0) errorClass = "nonzero_exit";
  else if (result?.error) errorClass = "other";

  return buildRaindropCallSummary({
    runId,
    planeIssue: plan?.issueId || "none",
    agent,
    modelRoute: profile?.model || modelAlias || "unknown",
    mode: plan?.mode || "unknown",
    startedAt,
    endedAt,
    toolCallCount: 1,
    state: ok ? "PASS" : "FAILED",
    errorClass,
    traceArtifact: persisted?.meta || "none",
    reportArtifact: persisted?.report || "none",
    streamEventCount: 0,
    redactedSecretMarkers: 0,
    surface,
  });
}

/**
 * Build a Raindrop call summary from a goal-runtime/worker-run completion.
 * Accepts only safe metadata: no raw prompts, no raw tool payloads, no workspace
 * paths that might contain private context.
 */
export function buildRaindropCallSummaryFromGoalRuntimeWorkerRun({
  runId,
  workItemRef = "none",
  agent = "claude",
  goalAdapterVersion = "goal-runtime-adapter/v0",
  mode = "unknown",
  startedAt,
  endedAt,
  state = "PASS",
  toolCallCount = 0,
  streamEventCount = 0,
  redactedSecretMarkers = 0,
  traceArtifact = "none",
  reportArtifact = "none",
} = {}) {
  let errorClass = "none";
  if (state === "TIMEOUT") errorClass = "timeout";
  else if (state === "BLOCKED_AUTH") errorClass = "auth";
  else if (state === "RUNTIME_ERROR") errorClass = "nonzero_exit";
  else if (state === "NEEDS_HUMAN") errorClass = "scope";
  else if (state && state !== "PASS") errorClass = "other";

  return buildRaindropCallSummary({
    runId,
    planeIssue: workItemRef || "none",
    agent,
    modelRoute: goalAdapterVersion || "goal-runtime-adapter/v0",
    mode,
    startedAt,
    endedAt,
    toolCallCount,
    streamEventCount,
    redactedSecretMarkers,
    state,
    errorClass,
    traceArtifact,
    reportArtifact,
    surface: "goal-runtime/worker-run",
  });
}

/**
 * Render a Raindrop call summary object to Markdown.
 */
export function buildRaindropCallSummaryMarkdown(summaryObject, { date = "" } = {}) {
  const s = summaryObject?.["raindrop.llm_call_summary"] || {};
  const lines = [
    `# Raindrop LLM Call Summary`,
    ``,
    `> Version: ${s.version || "unknown"} | Adapter: ${s.adapter || "unknown"}`,
    ``,
    `## Call Metadata`,
    ``,
    `| Field | Value |`,
    `|---|---|`,
    `| run_id | ${s.run_id || ""} |`,
    `| plane_issue | ${s.plane_issue || "none"} |`,
    `| agent | ${s.agent || "unknown"} |`,
    `| model_route | ${s.model_route || "unknown"} |`,
    `| mode | ${s.mode || "unknown"} |`,
    `| started_at | ${s.started_at || ""} |`,
    `| ended_at | ${s.ended_at || ""} |`,
    `| duration_ms | ${s.duration_ms ?? "unknown"} |`,
    `| state | ${s.state || "unknown"} |`,
    `| error_class | ${s.error_class || "none"} |`,
    `| surface | ${s.surface || "unknown"} |`,
    ``,
    `## Redaction and Privacy`,
    ``,
    `| Field | Value |`,
    `|---|---|`,
    `| input_redaction_level | ${s.input_redaction_level || "redacted"} |`,
    `| output_redaction_level | ${s.output_redaction_level || "internal"} |`,
    `| token_counts_available | ${s.token_counts_available ?? false} |`,
    `| redacted_secret_markers | ${s.redacted_secret_markers ?? 0} |`,
    ``,
    `No raw prompts, tool payloads, API keys, cookies, browser storage, private`,
    `memory, customer data or regulated content appear in this summary.`,
    ``,
    `## Call Statistics`,
    ``,
    `| Field | Value |`,
    `|---|---|`,
    `| tool_call_count | ${s.tool_call_count ?? 0} |`,
    `| stream_event_count | ${s.stream_event_count ?? 0} |`,
    ``,
    `## Artifacts`,
    ``,
    `| Field | Value |`,
    `|---|---|`,
    `| trace_artifact | ${s.trace_artifact || "none"} |`,
    `| report_artifact | ${s.report_artifact || "none"} |`,
    ``,
    `## Instrumentation Coverage`,
    ``,
    `### Currently Instrumented`,
    ``,
    ...(s.instrumented_surfaces || INSTRUMENTED_SURFACES).map((surface) => `- ${surface}`),
    ``,
    `### Not Yet Instrumented (Missing Coverage)`,
    ``,
    ...(s.not_yet_instrumented_surfaces || NOT_YET_INSTRUMENTED_SURFACES).map((surface) => `- ${surface}`),
    ``,
    `## Privacy Verdict`,
    ``,
    `PASS — no raw prompts, secrets, tool payloads, browser storage, private memory,`,
    `customer data or regulated content in this artifact.`,
  ];
  return lines.join("\n");
}

/**
 * Write a Raindrop call summary to disk as JSON and Markdown artifacts.
 * Returns the paths of the written files.
 *
 * @param {object} summaryObject - Output of buildRaindropCallSummary
 * @param {string} dir - Directory to write artifacts into
 * @param {string} [runId] - Override the run ID for the file name
 */
export function writeRaindropCallSummary(summaryObject, dir, { runId = "" } = {}) {
  const s = summaryObject?.["raindrop.llm_call_summary"] || {};
  const id = runId || s.run_id || randomUUID();
  mkdirSync(dir, { recursive: true });

  const jsonPath = join(dir, `${id}.json`);
  const mdPath = join(dir, `${id}.md`);

  writeFileSync(jsonPath, JSON.stringify(summaryObject, null, 2), "utf8");
  writeFileSync(mdPath, buildRaindropCallSummaryMarkdown(summaryObject), "utf8");

  return { jsonPath, mdPath };
}

/**
 * Validate that a raindrop_hook metadata object is safe before a managed
 * surface is promoted as instrumented.
 *
 * Enforces:
 * - Required fields present and non-empty
 * - surface is a known instrumented surface (not unknown or not-yet-instrumented)
 * - agent is a valid known agent
 * - No forbidden raw/private field patterns (raw prompts, API keys, workspace paths, etc.)
 *
 * Returns { ok, errors }.
 */
export function validateRaindropHook(hookObject) {
  const errors = [];
  if (!hookObject || typeof hookObject !== "object" || Array.isArray(hookObject)) {
    return { ok: false, errors: ["raindrop_hook must be a non-null object"] };
  }

  const REQUIRED_HOOK_FIELDS = ["surface", "adapter_version", "work_item_ref", "agent", "mode", "instrumentation"];
  for (const field of REQUIRED_HOOK_FIELDS) {
    if (!(field in hookObject) || hookObject[field] === undefined || hookObject[field] === null || hookObject[field] === "") {
      errors.push(`missing or empty required hook field: ${field}`);
    }
  }

  // surface must be a currently instrumented surface — rejects unknown and not-yet-instrumented surfaces
  if (hookObject.surface !== undefined && hookObject.surface !== null) {
    if (!INSTRUMENTED_SURFACES.includes(String(hookObject.surface))) {
      errors.push(
        `hook surface "${hookObject.surface}" is not in INSTRUMENTED_SURFACES — cannot promote unknown or not-yet-instrumented surface`,
      );
    }
  }

  // agent must be a known valid agent
  if (hookObject.agent !== undefined && hookObject.agent !== null && hookObject.agent !== "") {
    if (!VALID_AGENTS.has(String(hookObject.agent).toLowerCase())) {
      errors.push(`invalid hook agent: "${hookObject.agent}" — must be one of ${[...VALID_AGENTS].join(", ")}`);
    }
  }

  // Forbidden raw/private field patterns — raw prompt content, credentials, private paths
  const FORBIDDEN_HOOK_PREFIXES = [
    "raw_prompt", "prompt_text", "system_prompt",
    "tool_input", "tool_output", "tool_payload",
    "api_key", "secret_key", "bearer_token",
    "cookie", "browser_storage",
    "private_memory", "customer_data", "regulated_data",
    "workspace_path", "workspace_root", "private_context",
  ];
  const hookKeys = Object.keys(hookObject);
  for (const forbidden of FORBIDDEN_HOOK_PREFIXES) {
    if (hookKeys.some((k) => k.toLowerCase().startsWith(forbidden))) {
      errors.push(`privacy violation: forbidden field pattern "${forbidden}" found in raindrop_hook`);
    }
  }

  return { ok: errors.length === 0, errors };
}

// Registry mapping each currently instrumented surface to its dedicated adapter
// builder function. Every entry in INSTRUMENTED_SURFACES must have a key here.
// NOT_YET_INSTRUMENTED_SURFACES surfaces must NOT appear — their absence from
// this registry is the machine-readable gate that blocks premature promotion.
// Add a surface here only when its builder is implemented and tested.
export const SURFACE_BUILDER_REGISTRY = Object.freeze({
  "runtime-dispatcher-v1.2/worker-spawn": buildRaindropCallSummaryFromDispatcherRun,
  "hard-cron-wrapper/llm-spawn": buildRaindropCallSummaryFromHardCronRun,
  "plane-ui-worker-cadence-runner/llm-spawn": buildRaindropCallSummaryFromPlaneUiCadenceRun,
  "model-router/claude-cli-worker": buildRaindropCallSummaryFromModelRouterResult,
  "model-router/gemini-cli-worker": buildRaindropCallSummaryFromModelRouterResult,
  "model-router/codex-openrouter-worker": buildRaindropCallSummaryFromModelRouterResult,
  "codex-controller/decision": buildRaindropCallSummaryFromCodexControllerDecision,
  "goal-runtime/worker-run": buildRaindropCallSummaryFromGoalRuntimeWorkerRun,
});

/**
 * Validate that every surface in the given list has an explicit builder in the
 * registry. Fails fast when a surface is promoted to INSTRUMENTED_SURFACES
 * without a corresponding adapter builder being registered.
 *
 * Returns { ok, errors }. Errors name each uncovered surface.
 */
export function validateSurfaceBuilderCoverage(surfaceList, registry = SURFACE_BUILDER_REGISTRY) {
  const errors = [];
  for (const surface of surfaceList) {
    if (!(surface in registry)) {
      errors.push(
        `instrumented surface "${surface}" has no registered builder in SURFACE_BUILDER_REGISTRY` +
        ` — add a builder or move to NOT_YET_INSTRUMENTED_SURFACES with a documented exception`,
      );
    }
  }
  return { ok: errors.length === 0, errors };
}

// Registry of currently declared Raindrop hook producers. Each entry is a
// factory that returns the `raindrop_hook` metadata its producer emits, so the
// runtime hook-shape preflight can rebuild a representative hook from real code
// (not a hand-mirrored copy) and pass it through `validateRaindropHook`.
//
// Only producers that actually emit `raindrop_hook` metadata appear here.
// Scheduler, Hermes, AionUI, manual sessions and other surfaces in
// NOT_YET_INSTRUMENTED_SURFACES MUST NOT be added here until they have a real
// producer wired and a builder in SURFACE_BUILDER_REGISTRY.
export const RAINDROP_HOOK_PRODUCER_REGISTRY = Object.freeze({
  "goal-runtime/worker-run": () => buildGoalRuntimeAdapter({
    workItem: {
      id: "raindrop-hook-shape-preflight-probe",
      sequence_id: 0,
      name: "raindrop hook shape preflight probe",
    },
    contractFields: {
      role: "role:cto",
      agent: "claude",
      mode: "implement",
      workspace: "raindrop-hook-shape-preflight-probe",
    },
    contractValidation: { ok: true, reason_codes: [] },
    runtime: "claude",
  }).raindrop_hook,
});

// Producer ids that must always be present in RAINDROP_HOOK_PRODUCER_REGISTRY.
// A missing required producer fails the runtime hook-shape preflight closed.
export const REQUIRED_HOOK_PRODUCERS = Object.freeze([
  "goal-runtime/worker-run",
]);

/**
 * Validate that every currently declared Raindrop hook producer emits a hook
 * that passes `validateRaindropHook` and that every required producer id is
 * present. Returns { ok, errors }.
 *
 * Fails closed for:
 *   - a missing required producer id
 *   - a registry entry that is not a callable factory
 *   - a factory that throws while building a sample hook
 *   - a producer whose emitted hook is missing required fields, has an unknown
 *     surface, or contains a forbidden raw/private field pattern
 */
export function validateRaindropHookProducerCoverage({
  registry = RAINDROP_HOOK_PRODUCER_REGISTRY,
  required = REQUIRED_HOOK_PRODUCERS,
} = {}) {
  const errors = [];

  for (const id of required) {
    if (!(id in registry)) {
      errors.push(
        `required hook producer "${id}" is missing from RAINDROP_HOOK_PRODUCER_REGISTRY` +
        ` — wire its producer or document the removal explicitly`,
      );
    }
  }

  for (const [producerId, build] of Object.entries(registry)) {
    if (typeof build !== "function") {
      errors.push(`hook producer "${producerId}" must be a function that returns a sample hook`);
      continue;
    }
    let hook;
    try {
      hook = build();
    } catch (err) {
      errors.push(
        `hook producer "${producerId}" threw while building sample hook: ${err?.message || String(err)}`,
      );
      continue;
    }
    const result = validateRaindropHook(hook);
    if (!result.ok) {
      for (const e of result.errors) {
        errors.push(`hook producer "${producerId}" emits invalid hook: ${e}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Validate that a summary object matches the required shape.
 * Returns { ok, errors }.
 */
export function validateRaindropCallSummary(summaryObject) {
  const errors = [];
  if (!summaryObject || typeof summaryObject !== "object") {
    return { ok: false, errors: ["summary must be a non-null object"] };
  }
  const s = summaryObject["raindrop.llm_call_summary"];
  if (!s || typeof s !== "object") {
    errors.push("missing top-level key: raindrop.llm_call_summary");
    return { ok: false, errors };
  }

  const requiredFields = [
    "version", "adapter", "run_id", "plane_issue", "agent", "model_route",
    "mode", "started_at", "ended_at", "input_redaction_level",
    "output_redaction_level", "token_counts_available", "tool_call_count",
    "error_class", "state", "surface", "trace_artifact", "report_artifact",
  ];
  for (const field of requiredFields) {
    if (!(field in s)) errors.push(`missing required field: ${field}`);
  }

  if (s.input_redaction_level && !VALID_REDACTION_LEVELS.has(s.input_redaction_level)) {
    errors.push(`invalid input_redaction_level: ${s.input_redaction_level}`);
  }
  if (s.output_redaction_level && !VALID_REDACTION_LEVELS.has(s.output_redaction_level)) {
    errors.push(`invalid output_redaction_level: ${s.output_redaction_level}`);
  }
  if (s.agent && !VALID_AGENTS.has(s.agent)) {
    errors.push(`invalid agent: ${s.agent}`);
  }
  if (s.error_class && !VALID_ERROR_CLASSES.has(s.error_class)) {
    errors.push(`invalid error_class: ${s.error_class}`);
  }

  // Privacy boundary checks — exact forbidden field names that must never appear.
  // Note: "redacted_secret_markers" is an allowed safe counter field; the
  // forbidden patterns below target raw-content field names, not counters.
  const FORBIDDEN_EXACT_PREFIXES = [
    "raw_prompt", "prompt_text", "system_prompt",
    "tool_input", "tool_output", "tool_payload",
    "api_key", "secret_key", "bearer_token",
    "cookie", "browser_storage",
    "private_memory", "customer_data", "regulated_data",
  ];
  const keys = Object.keys(s);
  for (const forbidden of FORBIDDEN_EXACT_PREFIXES) {
    if (keys.some((k) => k.toLowerCase().startsWith(forbidden))) {
      errors.push(`privacy violation: forbidden field pattern "${forbidden}" found in summary`);
    }
  }

  // Redaction enforcement
  if (s.input_redaction_level === "none") {
    errors.push("privacy enforcement: input_redaction_level must not be 'none' for Company.OS summaries");
  }
  if (s.output_redaction_level === "none") {
    errors.push("privacy enforcement: output_redaction_level must not be 'none' for Company.OS summaries");
  }

  return { ok: errors.length === 0, errors };
}
