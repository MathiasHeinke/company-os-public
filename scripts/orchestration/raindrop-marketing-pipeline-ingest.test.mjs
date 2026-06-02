import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  INGEST_ADAPTER_VERSION,
  INGEST_EVENT_TYPE,
  SECRET_SHAPE_PATTERNS,
  buildMarketingPipelineLedgerRow,
  ingestMarketingPipelineEnvelopes,
  ingestSingleEnvelope,
  normalizeMarketingEnvelope,
  resolveEnvelopeSources,
  sweepEnvelopeForSecretShapes,
} from "./raindrop-marketing-pipeline-ingest.mjs";
import {
  NOT_YET_INSTRUMENTED_SURFACES,
  validateRaindropCallSummary,
} from "./raindrop-call-adapter.mjs";
import {
  COVERAGE_CLASSES,
  OBSERVABILITY_DECISIONS,
  classifyRaindropObservability,
} from "./raindrop-observability-policy.mjs";
import { parseJsonl, validateAgentEventRow } from "../agent-events/agent-event-core.mjs";

function makeWorkspace() {
  return mkdtempSync(join(tmpdir(), "raindrop-mkt-ingest-"));
}

function writeEnvelope(dir, fileName, envelope) {
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, fileName);
  writeFileSync(filePath, JSON.stringify(envelope, null, 2), "utf8");
  return filePath;
}

function baseEnvelope({
  runId = "01HQEZTESTRUN0000000000001",
  surface = "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-openai",
  agent = "openai",
  state = "PASS",
  errorClass = "none",
  modelRoute = "gpt-image-2",
  mode = "image",
  startedAt = "2026-05-23T08:00:00.000Z",
  endedAt = "2026-05-23T08:00:02.500Z",
  pipelineStage = "visual_gen",
  providerRouteUsed = "api",
  pipelineCtxOverrides = {},
  canonicalOverrides = {},
} = {}) {
  return {
    "raindrop.llm_call_summary": {
      version: "raindrop-llm-call/v0",
      adapter: "raindrop-call-adapter/v0",
      run_id: runId,
      plane_issue: "[WORK_ITEM_ID]",
      agent,
      model_route: modelRoute,
      mode,
      started_at: startedAt,
      ended_at: endedAt,
      duration_ms: 2500,
      input_redaction_level: "redacted",
      output_redaction_level: "internal",
      token_counts_available: false,
      tool_call_count: 1,
      stream_event_count: 0,
      redacted_secret_markers: 0,
      error_class: errorClass,
      state,
      surface,
      trace_artifact: "marketing/observability/raindrop-pipeline/2026-05-23/run.json",
      report_artifact: "none",
      ...canonicalOverrides,
    },
    "raindrop.marketing_pipeline_context": {
      version: "raindrop-marketing-pipeline-ctx/v0",
      surface,
      pipeline_stage: pipelineStage,
      manifest_run_folder: "marketing/daily-editorial/2026-05-23/run-1",
      distribution_language: "en",
      piece_count: 1,
      prompt_template_hash: "sha256:deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      prompt_template_version: "v3.2.1",
      provider_route_default: "api",
      provider_route_used: providerRouteUsed,
      fallback_used: false,
      fallback_reason_class: "none",
      http_status: 200,
      response_size_class: "small",
      notes: "envelope produced by safe wrapper",
      ...pipelineCtxOverrides,
    },
  };
}

// ---------------------------------------------------------------------------
// Surface enum / NOT_YET coverage
// ---------------------------------------------------------------------------

test("six [SOURCE_WORKSPACE] marketing-pipeline surfaces appear in NOT_YET_INSTRUMENTED_SURFACES", () => {
  const expected = [
    "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-openai",
    "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-codex-cli",
    "[SOURCE_WORKSPACE]/marketing-pipeline/visual-directions-openai",
    "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openrouter",
    "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openai-fallback",
    "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-claude-cli",
  ];
  for (const surface of expected) {
    assert.ok(
      NOT_YET_INSTRUMENTED_SURFACES.includes(surface),
      `${surface} must be in NOT_YET_INSTRUMENTED_SURFACES until [SOURCE_WORKSPACE] wrapper ships`,
    );
  }
});

// ---------------------------------------------------------------------------
// Secret-shape sweep
// ---------------------------------------------------------------------------

test("sweepEnvelopeForSecretShapes accepts a clean envelope", () => {
  const result = sweepEnvelopeForSecretShapes(baseEnvelope());
  assert.equal(result.ok, true);
  assert.deepEqual(result.matches, []);
});

test("sweepEnvelopeForSecretShapes detects an OpenAI sk- token anywhere in the envelope", () => {
  const envelope = baseEnvelope({
    pipelineCtxOverrides: {
      notes: "internal note that accidentally leaked sk-proj-abcdefghijklmnopqrstuvwxyz0123",
    },
  });
  const result = sweepEnvelopeForSecretShapes(envelope);
  assert.equal(result.ok, false);
  assert.ok(result.matches.includes("openai_sk"), `matches: ${result.matches.join(", ")}`);
});

test("sweepEnvelopeForSecretShapes detects a Bearer token, an xai key and a JWT", () => {
  const envelope = baseEnvelope({
    pipelineCtxOverrides: {
      notes: "Authorization: Bearer abcdef1234567890ghij and xai-abcdefghijklmnopqrstuvwxyz",
      provider_route_used: "eyJabcdefghij1234.abcdefghij1234.abcdef",
    },
  });
  const result = sweepEnvelopeForSecretShapes(envelope);
  assert.equal(result.ok, false);
  assert.ok(result.matches.includes("bearer_token"));
  assert.ok(result.matches.includes("xai_key"));
  assert.ok(result.matches.includes("jwt_three_segment"));
});

test("SECRET_SHAPE_PATTERNS exposes a stable, non-empty ordered list", () => {
  assert.ok(Array.isArray(SECRET_SHAPE_PATTERNS));
  assert.ok(SECRET_SHAPE_PATTERNS.length >= 5);
  for (const entry of SECRET_SHAPE_PATTERNS) {
    assert.ok(entry.id && typeof entry.id === "string");
    assert.ok(entry.pattern instanceof RegExp);
  }
});

// ---------------------------------------------------------------------------
// Provider enum extension (openai/openrouter)
// ---------------------------------------------------------------------------

test("normalizeMarketingEnvelope accepts agent=openai without falling back to unknown", () => {
  const normalized = normalizeMarketingEnvelope(baseEnvelope({ agent: "openai" }));
  assert.equal(normalized.summary["raindrop.llm_call_summary"].agent, "openai");
});

test("normalizeMarketingEnvelope accepts agent=openrouter without falling back to unknown", () => {
  const normalized = normalizeMarketingEnvelope(
    baseEnvelope({
      surface: "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openrouter",
      agent: "openrouter",
    }),
  );
  assert.equal(normalized.summary["raindrop.llm_call_summary"].agent, "openrouter");
});

test("normalizeMarketingEnvelope falls back to unknown agent for an unrecognized provider", () => {
  const normalized = normalizeMarketingEnvelope(baseEnvelope({ agent: "gpt-4-custom" }));
  assert.equal(normalized.summary["raindrop.llm_call_summary"].agent, "unknown");
});

// ---------------------------------------------------------------------------
// Normalization: missing canonical fields filled from pipeline context
// ---------------------------------------------------------------------------

test("normalizeMarketingEnvelope fills missing canonical surface/agent/route from pipeline context", () => {
  const envelope = baseEnvelope();
  delete envelope["raindrop.llm_call_summary"].surface;
  delete envelope["raindrop.llm_call_summary"].model_route;
  envelope["raindrop.llm_call_summary"].mode = "";
  envelope["raindrop.marketing_pipeline_context"].provider_route_used = "codex-default";

  const normalized = normalizeMarketingEnvelope(envelope);
  const s = normalized.summary["raindrop.llm_call_summary"];
  assert.equal(s.surface, "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-openai");
  assert.equal(s.model_route, "codex-default");
  assert.equal(s.mode, "visual_gen");
});

test("normalizeMarketingEnvelope throws when no run_id is present in either block", () => {
  const envelope = baseEnvelope();
  delete envelope["raindrop.llm_call_summary"].run_id;
  delete envelope["raindrop.marketing_pipeline_context"].run_id;
  assert.throws(
    () => normalizeMarketingEnvelope(envelope),
    /missing run_id/,
  );
});

test("normalizeMarketingEnvelope produces a summary that passes validateRaindropCallSummary", () => {
  const normalized = normalizeMarketingEnvelope(baseEnvelope());
  const validation = validateRaindropCallSummary(normalized.summary);
  assert.ok(
    validation.ok,
    `normalized summary failed validation: ${validation.errors.join("; ")}`,
  );
});

test("normalizeMarketingEnvelope always enforces redacted/internal redaction levels even if envelope tries to override", () => {
  const envelope = baseEnvelope({
    canonicalOverrides: {
      input_redaction_level: "none",
      output_redaction_level: "none",
    },
  });
  const normalized = normalizeMarketingEnvelope(envelope);
  const s = normalized.summary["raindrop.llm_call_summary"];
  assert.equal(s.input_redaction_level, "redacted");
  assert.equal(s.output_redaction_level, "internal");
});

// ---------------------------------------------------------------------------
// Policy class routing
// ---------------------------------------------------------------------------

test("classifyRaindropObservability returns the productive_marketing_ares_website_pipeline class for [SOURCE_WORKSPACE] surfaces", () => {
  const decision = classifyRaindropObservability({
    surface: "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-openai",
    state: "PASS",
  });
  assert.equal(decision.decision, OBSERVABILITY_DECISIONS.OBSERVE_SUMMARY_ONLY);
  assert.equal(decision.coverage_class, COVERAGE_CLASSES.PRODUCTIVE_MARKETING_ARES_WEBSITE_PIPELINE);
});

test("classifyRaindropObservability promotes [SOURCE_WORKSPACE] marketing surfaces to OBSERVE_AND_EVALUATE when externalImpact=true", () => {
  const decision = classifyRaindropObservability({
    surface: "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openrouter",
    state: "PASS",
    externalImpact: true,
  });
  assert.equal(decision.decision, OBSERVABILITY_DECISIONS.OBSERVE_AND_EVALUATE);
  assert.equal(decision.coverage_class, COVERAGE_CLASSES.PRODUCTIVE_MARKETING_ARES_WEBSITE_PIPELINE);
  assert.ok(decision.deep_eval_reasons.includes("external_impact_output"));
});

test("ingestSingleEnvelope attaches the productive marketing coverage class to the decision and the ledger row", () => {
  const workspacePath = makeWorkspace();
  try {
    const envelope = baseEnvelope();
    const envelopePath = writeEnvelope(workspacePath, "01h-run-1.json", envelope);
    const result = ingestSingleEnvelope({
      envelope,
      workspacePath,
      envelopePath,
    });
    assert.equal(result.status, "ingested");
    assert.equal(
      result.decision.coverage_class,
      COVERAGE_CLASSES.PRODUCTIVE_MARKETING_ARES_WEBSITE_PIPELINE,
    );
    assert.equal(
      result.row.payload.coverage_class,
      COVERAGE_CLASSES.PRODUCTIVE_MARKETING_ARES_WEBSITE_PIPELINE,
    );
    assert.equal(result.row.payload.surface, envelope["raindrop.llm_call_summary"].surface);
    assert.equal(result.row.payload.external_impact_output, true);
  } finally {
    rmSync(workspacePath, { recursive: true, force: true });
  }
});

test("ingestSingleEnvelope keeps non-publish stages at summary-only retention", () => {
  const workspacePath = makeWorkspace();
  try {
    const envelope = baseEnvelope({
      surface: "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-codex-cli",
      pipelineStage: "child_worker_spawn",
    });
    const envelopePath = writeEnvelope(workspacePath, "child-worker.json", envelope);
    const result = ingestSingleEnvelope({
      envelope,
      workspacePath,
      envelopePath,
    });
    assert.equal(result.status, "ingested");
    assert.equal(result.decision.decision, OBSERVABILITY_DECISIONS.OBSERVE_SUMMARY_ONLY);
    assert.equal(result.row.payload.external_impact_output, false);
    assert.equal(result.row.payload.retention, "summary_metadata_only");
  } finally {
    rmSync(workspacePath, { recursive: true, force: true });
  }
});

test("ingestSingleEnvelope honors explicit external_impact_output over pipeline_stage fallback", () => {
  const workspacePath = makeWorkspace();
  try {
    const envelope = baseEnvelope({
      pipelineStage: "visual_gen",
      pipelineCtxOverrides: {
        external_impact_output: false,
      },
    });
    const envelopePath = writeEnvelope(workspacePath, "explicit-external-impact.json", envelope);
    const result = ingestSingleEnvelope({
      envelope,
      workspacePath,
      envelopePath,
    });
    assert.equal(result.status, "ingested");
    assert.equal(result.row.payload.external_impact_output, false);
    assert.equal(result.row.payload.retention, "summary_metadata_only");
  } finally {
    rmSync(workspacePath, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

test("ingestMarketingPipelineEnvelopes appends one row per envelope and skips duplicates on re-run", () => {
  const workspacePath = makeWorkspace();
  try {
    const envelopeDir = join(workspacePath, "reports", "observability", "raindrop-workshop", "2026-05-23");
    const ledgerPath = join(workspacePath, "metrics", "agent-events.jsonl");

    const envelopeA = baseEnvelope({ runId: "01HQEZTESTRUNA000000000001" });
    const envelopeB = baseEnvelope({
      runId: "01HQEZTESTRUNB000000000002",
      surface: "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-claude-cli",
      agent: "claude",
      pipelineStage: "eval_gate",
      modelRoute: "opus",
    });
    writeEnvelope(envelopeDir, "a.json", envelopeA);
    writeEnvelope(envelopeDir, "b.json", envelopeB);

    const first = ingestMarketingPipelineEnvelopes({
      sources: [envelopeDir],
      ledgerPath,
      workspacePath,
    });
    assert.equal(first.ingested_count, 2);
    assert.equal(first.skipped_count, 0);

    const ledgerRows = parseJsonl(readFileSync(ledgerPath, "utf8"), ledgerPath).map(({ row }) => row);
    assert.equal(ledgerRows.length, 2);
    for (const row of ledgerRows) {
      assert.equal(row.event_type, INGEST_EVENT_TYPE);
      assert.equal(row.event_policy, INGEST_ADAPTER_VERSION);
    }

    const second = ingestMarketingPipelineEnvelopes({
      sources: [envelopeDir],
      ledgerPath,
      workspacePath,
    });
    assert.equal(second.ingested_count, 0);
    assert.equal(second.skipped_count, 2);
    assert.ok(second.skipped_reasons.every((reason) => reason === "already_ingested"));
    const ledgerRowsAfter = parseJsonl(readFileSync(ledgerPath, "utf8"), ledgerPath).map(({ row }) => row);
    assert.equal(ledgerRowsAfter.length, 2);
  } finally {
    rmSync(workspacePath, { recursive: true, force: true });
  }
});

test("ingestMarketingPipelineEnvelopes dry-run does not write to the ledger", () => {
  const workspacePath = makeWorkspace();
  try {
    const envelopeDir = join(workspacePath, "envelopes");
    const ledgerPath = join(workspacePath, "metrics", "agent-events.jsonl");
    writeEnvelope(envelopeDir, "only.json", baseEnvelope());
    const result = ingestMarketingPipelineEnvelopes({
      sources: [envelopeDir],
      ledgerPath,
      workspacePath,
      dryRun: true,
    });
    assert.equal(result.ingested_count, 1);
    assert.equal(result.dry_run, true);
    assert.equal(existsSync(ledgerPath), false);
  } finally {
    rmSync(workspacePath, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Redaction at ingest time
// ---------------------------------------------------------------------------

test("ingestMarketingPipelineEnvelopes skips an envelope whose visible fields match a secret-shape", () => {
  const workspacePath = makeWorkspace();
  try {
    const envelopeDir = join(workspacePath, "envelopes");
    const ledgerPath = join(workspacePath, "metrics", "agent-events.jsonl");

    const envelope = baseEnvelope({
      pipelineCtxOverrides: {
        notes: "leaked OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuv012345",
      },
    });
    writeEnvelope(envelopeDir, "secret.json", envelope);

    const result = ingestMarketingPipelineEnvelopes({
      sources: [envelopeDir],
      ledgerPath,
      workspacePath,
    });
    assert.equal(result.ingested_count, 0);
    assert.equal(result.skipped_count, 1);
    assert.equal(result.results[0].reason, "secret_shape_detected");
    assert.ok(Array.isArray(result.results[0].matches));
    assert.ok(result.results[0].matches.length > 0);
    assert.equal(existsSync(ledgerPath), false);
  } finally {
    rmSync(workspacePath, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Resilience
// ---------------------------------------------------------------------------

test("ingestMarketingPipelineEnvelopes handles a parse-failed envelope without crashing", () => {
  const workspacePath = makeWorkspace();
  try {
    const envelopeDir = join(workspacePath, "envelopes");
    const ledgerPath = join(workspacePath, "metrics", "agent-events.jsonl");
    mkdirSync(envelopeDir, { recursive: true });
    writeFileSync(join(envelopeDir, "broken.json"), "{ not valid json", "utf8");
    writeEnvelope(envelopeDir, "ok.json", baseEnvelope());

    const result = ingestMarketingPipelineEnvelopes({
      sources: [envelopeDir],
      ledgerPath,
      workspacePath,
    });
    assert.equal(result.ingested_count, 1);
    assert.equal(result.skipped_count, 1);
    const reasons = result.results.map((r) => r.reason || r.status);
    assert.ok(reasons.includes("envelope_parse_failed"));
  } finally {
    rmSync(workspacePath, { recursive: true, force: true });
  }
});

test("ingestMarketingPipelineEnvelopes throws when workspacePath is not absolute", () => {
  assert.throws(
    () => ingestMarketingPipelineEnvelopes({
      sources: [],
      ledgerPath: "/tmp/some.jsonl",
      workspacePath: "relative/path",
    }),
    /workspacePath must be absolute/,
  );
});

// ---------------------------------------------------------------------------
// Ledger row shape
// ---------------------------------------------------------------------------

test("buildMarketingPipelineLedgerRow produces an event row that passes validateAgentEventRow", () => {
  const workspacePath = makeWorkspace();
  try {
    const envelope = baseEnvelope();
    const envelopePath = writeEnvelope(workspacePath, "row.json", envelope);
    const normalized = normalizeMarketingEnvelope(envelope);
    const decision = classifyRaindropObservability({
      surface: normalized.summary["raindrop.llm_call_summary"].surface,
      state: "PASS",
      externalImpact: true,
    });
    const row = buildMarketingPipelineLedgerRow({
      summary: normalized.summary,
      pipelineCtx: normalized.pipelineCtx,
      decision,
      workspacePath,
      envelopePath,
      occurredAt: "2026-05-23T08:00:05.000Z",
    });
    const validation = validateAgentEventRow(row);
    assert.ok(validation.valid, `ledger row invalid: ${validation.errors.join("; ")}`);
    assert.equal(row.event_type, INGEST_EVENT_TYPE);
    assert.equal(row.producer, "raindrop-marketing-pipeline-ingest");
    assert.equal(row.role_owner, "role:cmo");
    assert.equal(row.department, "cmo");
    assert.equal(row.redaction_level, "standard");
    assert.equal(row.artifact_paths[0], envelopePath);
  } finally {
    rmSync(workspacePath, { recursive: true, force: true });
  }
});

test("buildMarketingPipelineLedgerRow event_id is deterministic for the same (runId, surface)", () => {
  const workspacePath = makeWorkspace();
  try {
    const envelopePath = writeEnvelope(workspacePath, "det.json", baseEnvelope());
    const normalized = normalizeMarketingEnvelope(baseEnvelope());
    const decision = classifyRaindropObservability({
      surface: normalized.summary["raindrop.llm_call_summary"].surface,
      state: "PASS",
    });
    const first = buildMarketingPipelineLedgerRow({
      summary: normalized.summary,
      pipelineCtx: normalized.pipelineCtx,
      decision,
      workspacePath,
      envelopePath,
      occurredAt: "2026-05-23T08:00:05.000Z",
    });
    const second = buildMarketingPipelineLedgerRow({
      summary: normalized.summary,
      pipelineCtx: normalized.pipelineCtx,
      decision,
      workspacePath,
      envelopePath,
      occurredAt: "2026-05-23T08:00:06.000Z",
    });
    assert.equal(first.event_id, second.event_id);
  } finally {
    rmSync(workspacePath, { recursive: true, force: true });
  }
});

test("buildMarketingPipelineLedgerRow rejects a relative workspacePath", () => {
  assert.throws(
    () => buildMarketingPipelineLedgerRow({
      summary: { "raindrop.llm_call_summary": { run_id: "x", surface: "y" } },
      decision: { decision: "observe_summary_only" },
      workspacePath: "relative",
      envelopePath: "/abs/path.json",
    }),
    /workspacePath must be absolute/,
  );
});

// ---------------------------------------------------------------------------
// Source resolution
// ---------------------------------------------------------------------------

test("resolveEnvelopeSources scans a directory for *.json envelopes and ignores prompt-result.json sidecars", () => {
  const workspacePath = makeWorkspace();
  try {
    mkdirSync(workspacePath, { recursive: true });
    writeFileSync(join(workspacePath, "a.json"), JSON.stringify(baseEnvelope()), "utf8");
    writeFileSync(join(workspacePath, "b.json"), JSON.stringify(baseEnvelope()), "utf8");
    writeFileSync(join(workspacePath, "c.prompt-result.json"), "{}", "utf8");
    writeFileSync(join(workspacePath, "ignored.md"), "# nope", "utf8");
    const paths = resolveEnvelopeSources(workspacePath);
    assert.equal(paths.length, 2);
    for (const p of paths) assert.ok(p.endsWith(".json") && !p.endsWith(".prompt-result.json"));
  } finally {
    rmSync(workspacePath, { recursive: true, force: true });
  }
});

test("resolveEnvelopeSources returns an empty list for non-existent or non-json sources", () => {
  assert.deepEqual(resolveEnvelopeSources("/nonexistent/path/does/not/exist"), []);
});
