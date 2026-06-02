/**
 * raindrop-marketing-pipeline-ingest.mjs
 *
 * Company.OS-side ingestion adapter for [SOURCE_WORKSPACE] marketing pipeline
 * Raindrop envelopes ([WORK_ITEM_ID] S1-S6 surfaces).
 *
 * The adapter:
 *   - reads local envelope JSON files written by the [SOURCE_WORKSPACE] wrapper
 *     (when that wrapper ships in a follow-on contract) or by an upstream
 *     sync step; it never edits [SOURCE_WORKSPACE] and never calls any external
 *     network
 *   - rejects any envelope whose visible string fields match a known
 *     secret-shape regex (log + skip, never crash)
 *   - normalizes the envelope into the canonical
 *     `raindrop.llm_call_summary` shape via `buildRaindropCallSummary`, so
 *     downstream Company.OS consumers (raindrop-prompt-result-loop,
 *     coverage policy classifier, CAO/Codex controller readers) work with no
 *     parser change
 *   - classifies the call against the Raindrop observability coverage policy
 *     (`productive_marketing_ares_website_pipeline` class) and decides
 *     summary-only vs deep evaluation
 *   - appends one deterministic `marketing.pipeline.raindrop_call` row per
 *     envelope to `metrics/agent-events.jsonl`, keyed by envelope `run_id`
 *     so re-running ingestion is idempotent
 *
 * Privacy guarantee:
 *   - no raw prompts, raw model output, b64 payloads, video bytes, cookies,
 *     API keys or private memory are read, persisted or echoed
 *   - input_redaction_level is always "redacted"; output_redaction_level is
 *     always "internal"; surfaces that fail the secret-shape sweep are
 *     skipped with a machine-readable reason
 *
 * Source of truth:
 *   - reports/department-executive-runtime/[WORK_ITEM_ID]-direct-call-instrumentation-plan.md
 *   - docs/operations/raindrop-llm-call-observability.md
 *   - docs/operations/raindrop-observability-coverage-policy.md
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, join, resolve } from "node:path";

import {
  buildRaindropCallSummary,
  validateRaindropCallSummary,
} from "./raindrop-call-adapter.mjs";
import {
  COVERAGE_CLASSES,
  RAINDROP_OBSERVABILITY_POLICY_VERSION,
  classifyRaindropObservability,
  inferCoverageClass,
} from "./raindrop-observability-policy.mjs";
import {
  SCHEMA_VERSION,
  parseJsonl,
  validateAgentEventRow,
} from "../agent-events/agent-event-core.mjs";

export const INGEST_ADAPTER_VERSION = "raindrop-marketing-pipeline-ingest/v0";
export const INGEST_EVENT_TYPE = "marketing.pipeline.raindrop_call";
export const PIPELINE_CONTEXT_VERSION = "raindrop-marketing-pipeline-ctx/v0";

// Secret-shape regexes. The sweep is conservative: any single match anywhere
// in the envelope's string-typed values rejects the entire envelope.
//
// These patterns intentionally target the providers and key formats used by
// the S1-S6 [SOURCE_WORKSPACE] marketing-pipeline surfaces (OpenAI, OpenRouter,
// xAI, Anthropic CLI, Supabase) and a few well-known JWT/Bearer shapes.
// They are not a full secret scanner: the upstream wrapper is the privacy
// boundary, this sweep is the second line of defense at ingest time.
export const SECRET_SHAPE_PATTERNS = Object.freeze([
  { id: "openai_sk", pattern: /sk-(?:proj-|or-)?[A-Za-z0-9_-]{20,}/ },
  { id: "anthropic_sk_ant", pattern: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { id: "xai_key", pattern: /xai-[A-Za-z0-9_-]{20,}/ },
  { id: "jwt_three_segment", pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/ },
  { id: "bearer_token", pattern: /Bearer\s+[A-Za-z0-9._-]{16,}/i },
  { id: "openai_env_value", pattern: /OPENAI_API_KEY\s*[:=]\s*\S+/i },
  { id: "openrouter_env_value", pattern: /OPENROUTER_API_KEY\s*[:=]\s*\S+/i },
  { id: "supabase_env_value", pattern: /SUPABASE_(?:URL|ANON_KEY|SERVICE_ROLE_KEY)\s*[:=]\s*\S+/i },
  { id: "operator_secret_value", pattern: /OPERATOR_SECRET\s*[:=]\s*\S+/i },
]);

const VALID_AGENT_ENUM = new Set([
  "claude",
  "codex",
  "gemini",
  "hermes",
  "openai",
  "openrouter",
  "unknown",
]);

const VALID_ERROR_CLASS_ENUM = new Set([
  "none",
  "auth",
  "timeout",
  "nonzero_exit",
  "scope",
  "stream",
  "other",
]);

const PUBLISH_PIPELINE_STAGES = new Set([
  "visual_gen",
  "visual_directions",
  "eval_gate",
  "video_gen",
]);

function optionalBoolean(value) {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  return null;
}

/**
 * Walk a value recursively and yield every string leaf so the secret-shape
 * sweep covers nested fields without missing arrays or sibling pipeline
 * context blocks.
 */
function* walkStringLeaves(value) {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    yield value;
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) yield* walkStringLeaves(item);
    return;
  }
  if (typeof value === "object") {
    for (const child of Object.values(value)) yield* walkStringLeaves(child);
  }
}

/**
 * Sweep an arbitrary object/value for known secret-shape patterns.
 * Returns { ok, matches } where matches is the list of pattern ids that fired.
 * The returned matches list is sorted and de-duplicated so callers can
 * compare it across runs without flakiness.
 */
export function sweepEnvelopeForSecretShapes(envelope) {
  const hits = new Set();
  for (const leaf of walkStringLeaves(envelope)) {
    for (const { id, pattern } of SECRET_SHAPE_PATTERNS) {
      if (pattern.test(leaf)) hits.add(id);
    }
  }
  const matches = [...hits].sort();
  return { ok: matches.length === 0, matches };
}

function normalizeAgentEnumValue(value) {
  const normalized = String(value || "unknown").trim().toLowerCase();
  return VALID_AGENT_ENUM.has(normalized) ? normalized : "unknown";
}

function normalizeErrorClass(value) {
  const normalized = String(value || "none").trim().toLowerCase();
  return VALID_ERROR_CLASS_ENUM.has(normalized) ? normalized : "other";
}

function safeStringOr(value, fallback = "unknown") {
  const candidate = String(value ?? "").trim();
  return candidate ? candidate : fallback;
}

function deriveExternalImpact(pipelineContext = {}) {
  const explicit = optionalBoolean(
    pipelineContext.external_impact_output ?? pipelineContext.externalImpactOutput,
  );
  if (explicit !== null) return explicit;

  const stage = safeStringOr(pipelineContext.pipeline_stage, "").toLowerCase();
  if (PUBLISH_PIPELINE_STAGES.has(stage)) return true;
  return false;
}

/**
 * Build the canonical raindrop.llm_call_summary block for an [SOURCE_WORKSPACE]
 * marketing-pipeline envelope. Missing or absent canonical fields are filled
 * in from the sibling raindrop.marketing_pipeline_context block where it is
 * safe to do so (no raw text, no prompts, no payloads).
 */
export function normalizeMarketingEnvelope(envelope, { runIdFallback = "" } = {}) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    throw new Error("normalizeMarketingEnvelope: envelope must be a non-null object");
  }

  const canonical = envelope["raindrop.llm_call_summary"] || {};
  const pipelineCtx = envelope["raindrop.marketing_pipeline_context"] || {};

  const runId = safeStringOr(canonical.run_id, "")
    || safeStringOr(pipelineCtx.run_id, "")
    || safeStringOr(runIdFallback, "");
  if (!runId) {
    throw new Error("normalizeMarketingEnvelope: envelope is missing run_id in both canonical and pipeline context blocks");
  }

  const surface = safeStringOr(canonical.surface, "")
    || safeStringOr(pipelineCtx.surface, "")
    || "[SOURCE_WORKSPACE]/marketing-pipeline/unknown";

  const agent = normalizeAgentEnumValue(canonical.agent);
  const errorClass = normalizeErrorClass(canonical.error_class);
  const modelRoute = safeStringOr(canonical.model_route, "")
    || safeStringOr(pipelineCtx.provider_route_used, "")
    || safeStringOr(pipelineCtx.provider_route_default, "")
    || "unknown";

  const mode = safeStringOr(canonical.mode, "")
    || safeStringOr(pipelineCtx.pipeline_stage, "")
    || "unknown";

  const summary = buildRaindropCallSummary({
    runId,
    planeIssue: safeStringOr(canonical.plane_issue, "none"),
    agent,
    modelRoute,
    mode,
    startedAt: safeStringOr(canonical.started_at, ""),
    endedAt: safeStringOr(canonical.ended_at, ""),
    durationMs: typeof canonical.duration_ms === "number" ? canonical.duration_ms : null,
    toolCallCount: Number(canonical.tool_call_count) || 0,
    state: safeStringOr(canonical.state, "PASS"),
    errorClass,
    traceArtifact: safeStringOr(canonical.trace_artifact, "none"),
    reportArtifact: safeStringOr(canonical.report_artifact, "none"),
    streamEventCount: Number(canonical.stream_event_count) || 0,
    redactedSecretMarkers: Number(canonical.redacted_secret_markers) || 0,
    surface,
  });

  return { summary, pipelineCtx, runId, surface };
}

function readEnvelopeFile(filePath) {
  const text = readFileSync(filePath, "utf8");
  return JSON.parse(text);
}

/**
 * Resolve the list of envelope JSON files for the given source. The source
 * may be a single file path or a directory; directories are scanned
 * non-recursively for `*.json` files. Markdown sidecar files are ignored.
 */
export function resolveEnvelopeSources(source) {
  if (!source) return [];
  const absolute = isAbsolute(source) ? source : resolve(source);
  if (!existsSync(absolute)) return [];
  const info = statSync(absolute);
  if (info.isFile()) return absolute.endsWith(".json") ? [absolute] : [];
  if (info.isDirectory()) {
    return readdirSync(absolute)
      .filter((name) => name.endsWith(".json") && !name.endsWith(".prompt-result.json"))
      .map((name) => join(absolute, name))
      .sort();
  }
  return [];
}

/**
 * Build the deterministic agent-events ledger row for one envelope. The
 * event_id is a stable hash of (runId, surface) so re-ingesting the same
 * envelope produces the same row id and the idempotency guard can detect it.
 */
export function buildMarketingPipelineLedgerRow({
  summary,
  pipelineCtx = {},
  decision,
  workspacePath,
  envelopePath,
  occurredAt,
}) {
  const s = summary["raindrop.llm_call_summary"];
  if (!s) throw new Error("buildMarketingPipelineLedgerRow: summary missing raindrop.llm_call_summary block");
  if (!workspacePath || !isAbsolute(workspacePath)) {
    throw new Error("buildMarketingPipelineLedgerRow: workspacePath must be absolute");
  }
  if (!envelopePath || !isAbsolute(envelopePath)) {
    throw new Error("buildMarketingPipelineLedgerRow: envelopePath must be absolute");
  }

  const eventId = `mkt-raindrop-${createHash("sha256")
    .update(`${s.run_id}|${s.surface}`)
    .digest("hex")
    .slice(0, 16)}`;

  const planeIssue = s.plane_issue && s.plane_issue !== "none" ? s.plane_issue : "";
  const role = "role:cmo";

  return {
    schema_version: SCHEMA_VERSION,
    event_id: eventId,
    event_type: INGEST_EVENT_TYPE,
    occurred_at: occurredAt,
    producer: "raindrop-marketing-pipeline-ingest",
    workspace: "registry:company-os",
    workspace_path: workspacePath,
    issue_id: planeIssue,
    run_id: s.run_id,
    session_id: s.run_id,
    agent: s.agent || "unknown",
    mode: s.mode || "unknown",
    role_owner: role,
    department: role.replace(/^role:/, ""),
    autonomy_level: "L2",
    event_policy: INGEST_ADAPTER_VERSION,
    payload: {
      adapter_version: INGEST_ADAPTER_VERSION,
      surface: s.surface,
      coverage_class: decision.coverage_class || COVERAGE_CLASSES.UNKNOWN,
      decision: decision.decision,
      deep_eval_required: decision.deep_eval_required,
      deep_eval_reasons: decision.deep_eval_reasons || [],
      retention: decision.retention,
      policy_version: decision.version || RAINDROP_OBSERVABILITY_POLICY_VERSION,
      state: s.state,
      error_class: s.error_class,
      duration_ms: s.duration_ms,
      tool_call_count: s.tool_call_count,
      stream_event_count: s.stream_event_count,
      redacted_secret_markers: s.redacted_secret_markers,
      pipeline_stage: safeStringOr(pipelineCtx.pipeline_stage, "unknown"),
      provider_route_used: safeStringOr(pipelineCtx.provider_route_used, "unknown"),
      provider_route_default: safeStringOr(pipelineCtx.provider_route_default, "unknown"),
      fallback_used: Boolean(pipelineCtx.fallback_used),
      fallback_reason_class: safeStringOr(pipelineCtx.fallback_reason_class, "none"),
      response_size_class: safeStringOr(pipelineCtx.response_size_class, "unknown"),
      distribution_language: safeStringOr(pipelineCtx.distribution_language, "none"),
      piece_count: Number(pipelineCtx.piece_count) || 0,
      external_impact_output: deriveExternalImpact(pipelineCtx),
    },
    artifact_paths: [envelopePath],
    linear_comment_ids: [],
    human_gate_required: false,
    redaction_level: "standard",
  };
}

function readExistingIngestedRunIds(ledgerPath) {
  if (!existsSync(ledgerPath)) return new Set();
  const text = readFileSync(ledgerPath, "utf8");
  const ids = new Set();
  for (const { row } of parseJsonl(text, ledgerPath)) {
    if (row && row.event_type === INGEST_EVENT_TYPE && row.run_id) {
      ids.add(`${row.run_id}|${row.payload?.surface || ""}`);
    }
  }
  return ids;
}

/**
 * Ingest one envelope object. Returns a structured result describing what
 * happened. The function does NOT write to disk; the caller decides when to
 * append the ledger row, so this stays unit-testable without filesystem.
 */
export function ingestSingleEnvelope({
  envelope,
  workspacePath,
  envelopePath,
  occurredAt = new Date().toISOString(),
  alreadyIngested = new Set(),
}) {
  const secrets = sweepEnvelopeForSecretShapes(envelope);
  if (!secrets.ok) {
    return {
      status: "skipped",
      reason: "secret_shape_detected",
      matches: secrets.matches,
      envelopePath,
    };
  }

  let normalized;
  try {
    normalized = normalizeMarketingEnvelope(envelope);
  } catch (error) {
    return {
      status: "skipped",
      reason: "invalid_envelope",
      detail: error?.message || String(error),
      envelopePath,
    };
  }

  const validation = validateRaindropCallSummary(normalized.summary);
  if (!validation.ok) {
    return {
      status: "skipped",
      reason: "summary_validation_failed",
      errors: validation.errors,
      envelopePath,
    };
  }

  const s = normalized.summary["raindrop.llm_call_summary"];
  const externalImpact = deriveExternalImpact(normalized.pipelineCtx);
  const decision = classifyRaindropObservability({
    surface: s.surface,
    state: s.state,
    externalImpact,
    contextClass: "productive_marketing_ares_website_pipeline",
    promotedToCompanyOsRun: true,
  });
  if (!decision.coverage_class) {
    decision.coverage_class = inferCoverageClass(s.surface);
  }

  const dedupeKey = `${s.run_id}|${s.surface}`;
  if (alreadyIngested.has(dedupeKey)) {
    return {
      status: "skipped",
      reason: "already_ingested",
      runId: s.run_id,
      surface: s.surface,
      envelopePath,
    };
  }

  const row = buildMarketingPipelineLedgerRow({
    summary: normalized.summary,
    pipelineCtx: normalized.pipelineCtx,
    decision,
    workspacePath,
    envelopePath,
    occurredAt,
  });

  const rowValidation = validateAgentEventRow(row);
  if (!rowValidation.valid) {
    return {
      status: "skipped",
      reason: "ledger_row_invalid",
      errors: rowValidation.errors,
      envelopePath,
    };
  }

  return {
    status: "ingested",
    runId: s.run_id,
    surface: s.surface,
    decision,
    row,
    envelopePath,
  };
}

/**
 * Ingest every envelope under one or more sources (file paths or
 * directories) and append accepted ledger rows to `ledgerPath`.
 *
 * `dryRun: true` performs validation and classification but does not write
 * to the ledger. The function always returns a structured summary of every
 * envelope encountered so callers (CLI, tests, controller) can render or
 * assert on the outcome.
 */
export function ingestMarketingPipelineEnvelopes({
  sources = [],
  ledgerPath,
  workspacePath,
  dryRun = false,
  occurredAt = new Date().toISOString(),
} = {}) {
  if (!ledgerPath) throw new Error("ingestMarketingPipelineEnvelopes: ledgerPath is required");
  if (!workspacePath || !isAbsolute(workspacePath)) {
    throw new Error("ingestMarketingPipelineEnvelopes: workspacePath must be absolute");
  }

  const envelopePaths = sources
    .flatMap((source) => resolveEnvelopeSources(source))
    .filter((path, index, all) => all.indexOf(path) === index);

  const alreadyIngested = readExistingIngestedRunIds(ledgerPath);
  const results = [];
  const accepted = [];

  for (const envelopePath of envelopePaths) {
    let envelope;
    try {
      envelope = readEnvelopeFile(envelopePath);
    } catch (error) {
      results.push({
        status: "skipped",
        reason: "envelope_parse_failed",
        detail: error?.message || String(error),
        envelopePath,
      });
      continue;
    }

    const result = ingestSingleEnvelope({
      envelope,
      workspacePath,
      envelopePath,
      occurredAt,
      alreadyIngested,
    });
    results.push(result);

    if (result.status === "ingested") {
      accepted.push(result.row);
      alreadyIngested.add(`${result.runId}|${result.surface}`);
    }
  }

  if (!dryRun && accepted.length > 0) {
    mkdirSync(dirname(ledgerPath), { recursive: true });
    for (const row of accepted) {
      appendFileSync(ledgerPath, `${JSON.stringify(row)}\n`, "utf8");
    }
  }

  return {
    adapter_version: INGEST_ADAPTER_VERSION,
    policy_version: RAINDROP_OBSERVABILITY_POLICY_VERSION,
    ledger_path: ledgerPath,
    workspace_path: workspacePath,
    dry_run: Boolean(dryRun),
    total: results.length,
    ingested_count: results.filter((r) => r.status === "ingested").length,
    skipped_count: results.filter((r) => r.status === "skipped").length,
    skipped_reasons: results
      .filter((r) => r.status === "skipped")
      .map((r) => r.reason),
    results,
  };
}

function parseArg(argv, name, defaultValue = "") {
  const flag = `--${name}`;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === flag) {
      return argv[i + 1] || defaultValue;
    }
    if (argv[i].startsWith(`${flag}=`)) {
      return argv[i].slice(flag.length + 1) || defaultValue;
    }
  }
  return defaultValue;
}

function parseBoolFlag(argv, name) {
  return argv.includes(`--${name}`);
}

async function mainCli(argv) {
  const inputs = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--input") {
      inputs.push(argv[i + 1]);
      i += 1;
    } else if (argv[i].startsWith("--input=")) {
      inputs.push(argv[i].slice("--input=".length));
    }
  }
  const workspacePath = parseArg(argv, "workspace-path", process.cwd());
  const ledgerPath = parseArg(argv, "ledger", join(workspacePath, "metrics", "agent-events.jsonl"));
  const dryRun = parseBoolFlag(argv, "dry-run");
  const json = parseBoolFlag(argv, "json");

  const sources = inputs.length > 0 ? inputs : [];
  const summary = ingestMarketingPipelineEnvelopes({
    sources,
    ledgerPath: isAbsolute(ledgerPath) ? ledgerPath : resolve(workspacePath, ledgerPath),
    workspacePath: isAbsolute(workspacePath) ? workspacePath : resolve(workspacePath),
    dryRun,
  });

  if (json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } else {
    process.stdout.write(
      `raindrop-marketing-pipeline-ingest: ${summary.ingested_count} ingested, ${summary.skipped_count} skipped (dry_run=${summary.dry_run})\n`,
    );
    for (const result of summary.results) {
      process.stdout.write(`  ${result.status}: ${result.envelopePath} (${result.reason || result.runId || ""})\n`);
    }
  }
  return summary.skipped_count > 0 && summary.skipped_reasons.some((r) => r === "summary_validation_failed" || r === "ledger_row_invalid")
    ? 1
    : 0;
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith("raindrop-marketing-pipeline-ingest.mjs");
if (invokedDirectly) {
  mainCli(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((error) => {
      process.stderr.write(`raindrop-marketing-pipeline-ingest: fatal: ${error?.message || String(error)}\n`);
      process.exit(1);
    });
}
