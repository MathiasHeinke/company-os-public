import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  RAINDROP_ADAPTER_VERSION,
  RAINDROP_SUMMARY_VERSION,
  INSTRUMENTED_SURFACES,
  NOT_YET_INSTRUMENTED_SURFACES,
  SURFACE_BUILDER_REGISTRY,
  RAINDROP_HOOK_PRODUCER_REGISTRY,
  REQUIRED_HOOK_PRODUCERS,
  buildRaindropCallSummary,
  buildRaindropCallSummaryFromDispatcherRun,
  buildRaindropCallSummaryFromHardCronRun,
  buildRaindropCallSummaryFromPlaneUiCadenceRun,
  buildRaindropCallSummaryFromCodexControllerDecision,
  buildRaindropCallSummaryFromModelRouterResult,
  buildRaindropCallSummaryFromGoalRuntimeWorkerRun,
  buildRaindropCallSummaryMarkdown,
  writeRaindropCallSummary,
  validateRaindropCallSummary,
  validateRaindropHook,
  validateRaindropHookProducerCoverage,
  validateSurfaceBuilderCoverage,
} from "./raindrop-call-adapter.mjs";

import { buildGoalRuntimeAdapter } from "../goal/goal-runtime-adapter-core.mjs";

import { CANONICAL_MANAGED_SURFACES } from "./raindrop-observability-policy.mjs";

// ---- Shape and version tests ----

test("INSTRUMENTED_SURFACES lists runtime, wrapper, cadence, controller-decision and goal-runtime surfaces", () => {
  assert.ok(INSTRUMENTED_SURFACES.includes("runtime-dispatcher-v1.2/worker-spawn"));
  assert.ok(INSTRUMENTED_SURFACES.includes("hard-cron-wrapper/llm-spawn"));
  assert.ok(INSTRUMENTED_SURFACES.includes("plane-ui-worker-cadence-runner/llm-spawn"));
  assert.ok(INSTRUMENTED_SURFACES.includes("model-router/claude-cli-worker"));
  assert.ok(INSTRUMENTED_SURFACES.includes("model-router/gemini-cli-worker"));
  assert.ok(INSTRUMENTED_SURFACES.includes("model-router/codex-openrouter-worker"));
  assert.ok(INSTRUMENTED_SURFACES.includes("codex-controller/decision"));
  assert.ok(INSTRUMENTED_SURFACES.includes("goal-runtime/worker-run"));
});

test("NOT_YET_INSTRUMENTED_SURFACES keeps future model-backed controller and external sessions explicit", () => {
  assert.ok(NOT_YET_INSTRUMENTED_SURFACES.includes("codex-controller/llm-spawn"));
  assert.ok(NOT_YET_INSTRUMENTED_SURFACES.includes("hermes-assistant/llm-calls"));
  assert.equal(NOT_YET_INSTRUMENTED_SURFACES.includes("hard-cron-wrapper/llm-spawn"), false);
  assert.equal(NOT_YET_INSTRUMENTED_SURFACES.includes("gemini-cli-workers"), false);
  assert.ok(NOT_YET_INSTRUMENTED_SURFACES.includes("gemini-cli-workers-outside-company-os-runtime"));
});

test("NOT_YET_INSTRUMENTED_SURFACES covers the six [WORK_ITEM_ID] [SOURCE_WORKSPACE] marketing-pipeline surfaces", () => {
  for (const surface of [
    "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-openai",
    "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-codex-cli",
    "[SOURCE_WORKSPACE]/marketing-pipeline/visual-directions-openai",
    "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openrouter",
    "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openai-fallback",
    "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-claude-cli",
  ]) {
    assert.ok(
      NOT_YET_INSTRUMENTED_SURFACES.includes(surface),
      `${surface} must remain in NOT_YET_INSTRUMENTED_SURFACES until [SOURCE_WORKSPACE] wrapper ships`,
    );
    assert.equal(
      INSTRUMENTED_SURFACES.includes(surface),
      false,
      `${surface} must NOT be in INSTRUMENTED_SURFACES until [SOURCE_WORKSPACE] wrapper ships and a builder is registered`,
    );
    assert.equal(
      surface in SURFACE_BUILDER_REGISTRY,
      false,
      `${surface} must NOT be in SURFACE_BUILDER_REGISTRY until its dedicated builder lands`,
    );
  }
});

test("buildRaindropCallSummary accepts openai and openrouter agent enum values for [SOURCE_WORKSPACE] surfaces", () => {
  const openai = buildRaindropCallSummary({
    runId: "ares-openai-1",
    agent: "openai",
    modelRoute: "gpt-image-2",
    mode: "image",
    surface: "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-openai",
  });
  assert.equal(openai["raindrop.llm_call_summary"].agent, "openai");
  const openrouter = buildRaindropCallSummary({
    runId: "ares-openrouter-1",
    agent: "openrouter",
    modelRoute: "anthropic/claude-opus-4.7",
    mode: "eval",
    surface: "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openrouter",
  });
  assert.equal(openrouter["raindrop.llm_call_summary"].agent, "openrouter");
});

// ---- buildRaindropCallSummary tests ----

test("buildRaindropCallSummary throws without runId", () => {
  assert.throws(() => buildRaindropCallSummary({ agent: "claude" }), /runId is required/);
});

test("buildRaindropCallSummary throws with invalid agent", () => {
  assert.throws(
    () => buildRaindropCallSummary({ runId: "abc", agent: "gpt-4" }),
    /agent must be one of/,
  );
});

test("buildRaindropCallSummary produces correct top-level structure", () => {
  const summary = buildRaindropCallSummary({
    runId: "run-001",
    agent: "claude",
    modelRoute: "claude-opus-4-7",
    mode: "implement",
    planeIssue: "[WORK_ITEM_ID]",
    startedAt: "2026-05-19T10:00:00.000Z",
    endedAt: "2026-05-19T10:05:00.000Z",
    state: "PASS",
    errorClass: "none",
    toolCallCount: 42,
    traceArtifact: "reports/observability/raindrop-workshop/2026-05-19/run-001.json",
    reportArtifact: "reports/observability/raindrop-workshop/2026-05-19/run-001.md",
  });

  const s = summary["raindrop.llm_call_summary"];
  assert.ok(s, "must have raindrop.llm_call_summary top-level key");
  assert.equal(s.version, RAINDROP_SUMMARY_VERSION);
  assert.equal(s.adapter, RAINDROP_ADAPTER_VERSION);
  assert.equal(s.run_id, "run-001");
  assert.equal(s.plane_issue, "[WORK_ITEM_ID]");
  assert.equal(s.agent, "claude");
  assert.equal(s.model_route, "claude-opus-4-7");
  assert.equal(s.mode, "implement");
  assert.equal(s.state, "PASS");
  assert.equal(s.error_class, "none");
  assert.equal(s.tool_call_count, 42);
});

test("buildRaindropCallSummary always sets input_redaction_level to redacted", () => {
  const summary = buildRaindropCallSummary({ runId: "r1", agent: "codex" });
  assert.equal(summary["raindrop.llm_call_summary"].input_redaction_level, "redacted");
});

test("buildRaindropCallSummary always sets output_redaction_level to internal", () => {
  const summary = buildRaindropCallSummary({ runId: "r1", agent: "gemini" });
  assert.equal(summary["raindrop.llm_call_summary"].output_redaction_level, "internal");
});

test("buildRaindropCallSummary always sets token_counts_available to false", () => {
  const summary = buildRaindropCallSummary({ runId: "r1", agent: "claude" });
  assert.equal(summary["raindrop.llm_call_summary"].token_counts_available, false);
});

test("buildRaindropCallSummary computes duration_ms from timestamps", () => {
  const summary = buildRaindropCallSummary({
    runId: "r2",
    agent: "claude",
    startedAt: "2026-05-19T10:00:00.000Z",
    endedAt: "2026-05-19T10:02:30.000Z",
  });
  assert.equal(summary["raindrop.llm_call_summary"].duration_ms, 150000);
});

test("buildRaindropCallSummary includes instrumented and not_yet_instrumented surfaces", () => {
  const summary = buildRaindropCallSummary({ runId: "r3", agent: "claude" });
  const s = summary["raindrop.llm_call_summary"];
  assert.ok(Array.isArray(s.instrumented_surfaces));
  assert.ok(Array.isArray(s.not_yet_instrumented_surfaces));
  assert.ok(s.instrumented_surfaces.length > 0);
  assert.ok(s.not_yet_instrumented_surfaces.length > 0);
});

// ---- buildRaindropCallSummaryFromDispatcherRun tests ----

test("buildRaindropCallSummaryFromDispatcherRun derives planeIssue from workItem", () => {
  const summary = buildRaindropCallSummaryFromDispatcherRun({
    runId: "rd-001",
    workItem: { sequence_id: 270, _project_identifier: "GROW" },
    contractFields: { agent: "claude", mode: "implement" },
    startedAt: "2026-05-19T10:00:00.000Z",
    endedAt: "2026-05-19T10:03:00.000Z",
    state: "PASS",
  });
  const s = summary["raindrop.llm_call_summary"];
  assert.equal(s.plane_issue, "GROW-270");
  assert.equal(s.agent, "claude");
  assert.equal(s.mode, "implement");
  assert.equal(s.state, "PASS");
  assert.equal(s.error_class, "none");
});

test("buildRaindropCallSummaryFromDispatcherRun maps TIMEOUT state to timeout error_class", () => {
  const summary = buildRaindropCallSummaryFromDispatcherRun({
    runId: "rd-002",
    workItem: { sequence_id: 1 },
    contractFields: { agent: "claude" },
    state: "TIMEOUT",
  });
  assert.equal(summary["raindrop.llm_call_summary"].error_class, "timeout");
});

test("buildRaindropCallSummaryFromDispatcherRun maps BLOCKED_AUTH to auth error_class", () => {
  const summary = buildRaindropCallSummaryFromDispatcherRun({
    runId: "rd-003",
    workItem: {},
    contractFields: { agent: "claude" },
    state: "BLOCKED_AUTH",
  });
  assert.equal(summary["raindrop.llm_call_summary"].error_class, "auth");
});

test("buildRaindropCallSummaryFromHardCronRun maps nonzero exits without raw output", () => {
  const summary = buildRaindropCallSummaryFromHardCronRun({
    runId: "cron-1",
    issueId: "[WORK_ITEM_ID]",
    agent: "claude",
    mode: "implement",
    costModelAliases: ["opus"],
    startedAt: "2026-05-19T12:00:00.000Z",
    endedAt: "2026-05-19T12:01:00.000Z",
    ok: false,
    exitCode: 1,
    eventLedgerPath: "metrics/agent-events.jsonl",
  });
  const s = summary["raindrop.llm_call_summary"];
  assert.equal(s.surface, "hard-cron-wrapper/llm-spawn");
  assert.equal(s.agent, "claude");
  assert.equal(s.model_route, "opus");
  assert.equal(s.error_class, "nonzero_exit");
  assert.equal(s.input_redaction_level, "redacted");
  assert.equal("raw_prompt" in s, false);
});

test("buildRaindropCallSummaryFromPlaneUiCadenceRun records cadence surface", () => {
  const summary = buildRaindropCallSummaryFromPlaneUiCadenceRun({
    runId: "plane-ui-1",
    issueId: "[WORK_ITEM_ID]",
    startedAt: "2026-05-19T12:00:00.000Z",
    endedAt: "2026-05-19T12:02:00.000Z",
    ok: true,
    hardCron: { exit_code: 0, stdout: { ok: true } },
    proofArtifact: "reports/runtime-auth/proof.json",
  });
  const s = summary["raindrop.llm_call_summary"];
  assert.equal(s.surface, "plane-ui-worker-cadence-runner/llm-spawn");
  assert.equal(s.plane_issue, "[WORK_ITEM_ID]");
  assert.equal(s.state, "PASS");
});

test("buildRaindropCallSummaryFromCodexControllerDecision records deterministic controller boundary", () => {
  const summary = buildRaindropCallSummaryFromCodexControllerDecision({
    runId: "controller-1",
    workItem: { sequence_id: 270, project_detail: { identifier: "GROW" } },
    decision: { decision_mode: "AUTO-GO" },
    mode: "post",
    startedAt: "2026-05-19T12:00:00.000Z",
    endedAt: "2026-05-19T12:00:05.000Z",
    caoVerdict: "PASS",
    postCommentId: "plane-comment-1",
  });
  const s = summary["raindrop.llm_call_summary"];
  assert.equal(s.plane_issue, "GROW-270");
  assert.equal(s.surface, "codex-controller/decision");
  assert.equal(s.model_route, "deterministic-node-controller");
  assert.equal(s.agent, "codex");
  assert.equal(s.state, "PASS");
  assert.equal(s.tool_call_count, 1);
});

test("buildRaindropCallSummaryFromModelRouterResult records Gemini CLI worker without raw content", () => {
  const summary = buildRaindropCallSummaryFromModelRouterResult({
    runId: "router-1.gemini",
    plan: { issueId: "[WORK_ITEM_ID]", mode: "spec-drift" },
    modelAlias: "gemini",
    profile: { kind: "gemini-cli", model: "gemini-3.1-pro-preview" },
    result: { status: 0, stdout: "raw worker output stays elsewhere" },
    persisted: { exitCode: 0, timedOut: false, report: "reports/model-router/run/gemini.md", meta: "reports/model-router/run/gemini.json" },
    startedAt: "2026-05-19T12:00:00.000Z",
    endedAt: "2026-05-19T12:00:04.000Z",
  });
  const s = summary["raindrop.llm_call_summary"];
  assert.equal(s.surface, "model-router/gemini-cli-worker");
  assert.equal(s.agent, "gemini");
  assert.equal(s.model_route, "gemini-3.1-pro-preview");
  assert.equal(s.state, "PASS");
  assert.equal(s.report_artifact, "reports/model-router/run/gemini.md");
  assert.equal("raw_prompt" in s, false);
  assert.equal("raw_output" in s, false);
});

test("buildRaindropCallSummaryFromModelRouterResult maps model-router nonzero exit", () => {
  const summary = buildRaindropCallSummaryFromModelRouterResult({
    runId: "router-2.claude",
    plan: { issueId: "[WORK_ITEM_ID]", mode: "external-audit" },
    modelAlias: "claude",
    profile: { kind: "claude-cli", model: "opus" },
    result: { status: 1 },
    persisted: { exitCode: 1, timedOut: false, report: "claude.md", meta: "claude.json" },
  });
  const s = summary["raindrop.llm_call_summary"];
  assert.equal(s.surface, "model-router/claude-cli-worker");
  assert.equal(s.agent, "claude");
  assert.equal(s.state, "FAILED");
  assert.equal(s.error_class, "nonzero_exit");
});

// ---- validateRaindropCallSummary tests ----

test("validateRaindropCallSummary passes a correct summary", () => {
  const summary = buildRaindropCallSummary({
    runId: "val-001",
    agent: "claude",
    modelRoute: "claude-opus-4-7",
    mode: "implement",
    planeIssue: "[WORK_ITEM_ID]",
    startedAt: "2026-05-19T10:00:00.000Z",
    endedAt: "2026-05-19T10:05:00.000Z",
    state: "PASS",
    errorClass: "none",
  });
  const result = validateRaindropCallSummary(summary);
  assert.ok(result.ok, `expected ok but got errors: ${result.errors.join("; ")}`);
  assert.deepEqual(result.errors, []);
});

test("validateRaindropCallSummary fails for null input", () => {
  const result = validateRaindropCallSummary(null);
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});

test("validateRaindropCallSummary fails if raindrop.llm_call_summary key is missing", () => {
  const result = validateRaindropCallSummary({ some_other_key: {} });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("raindrop.llm_call_summary")));
});

test("validateRaindropCallSummary enforces redaction: input_redaction_level must not be none", () => {
  const summary = buildRaindropCallSummary({ runId: "r-priv", agent: "claude" });
  // Forcibly set to none to simulate a privacy violation
  summary["raindrop.llm_call_summary"].input_redaction_level = "none";
  const result = validateRaindropCallSummary(summary);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("input_redaction_level")));
});

test("validateRaindropCallSummary enforces redaction: output_redaction_level must not be none", () => {
  const summary = buildRaindropCallSummary({ runId: "r-output-priv", agent: "claude" });
  summary["raindrop.llm_call_summary"].output_redaction_level = "none";
  const result = validateRaindropCallSummary(summary);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("output_redaction_level")));
});

test("validateRaindropCallSummary detects forbidden field patterns", () => {
  const summary = buildRaindropCallSummary({ runId: "r-forb", agent: "claude" });
  // Inject a forbidden field to simulate a privacy leak
  summary["raindrop.llm_call_summary"]["raw_prompt"] = "some prompt";
  const result = validateRaindropCallSummary(summary);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("prompt")));
});

// ---- writeRaindropCallSummary tests ----

test("writeRaindropCallSummary writes JSON and Markdown artifacts to the target dir", () => {
  const dir = mkdtempSync(join(tmpdir(), "raindrop-adapter-test-"));
  try {
    const summary = buildRaindropCallSummary({
      runId: "write-001",
      agent: "claude",
      modelRoute: "claude-opus-4-7",
      mode: "implement",
      planeIssue: "[WORK_ITEM_ID]",
      startedAt: "2026-05-19T10:00:00.000Z",
      endedAt: "2026-05-19T10:03:00.000Z",
      state: "PASS",
    });

    const { jsonPath, mdPath } = writeRaindropCallSummary(summary, dir, { runId: "write-001" });

    const jsonContent = JSON.parse(readFileSync(jsonPath, "utf8"));
    assert.equal(jsonContent["raindrop.llm_call_summary"].run_id, "write-001");
    assert.equal(jsonContent["raindrop.llm_call_summary"].agent, "claude");
    assert.equal(jsonContent["raindrop.llm_call_summary"].input_redaction_level, "redacted");

    const mdContent = readFileSync(mdPath, "utf8");
    assert.ok(mdContent.includes("# Raindrop LLM Call Summary"));
    assert.ok(mdContent.includes("[WORK_ITEM_ID]"));
    assert.ok(mdContent.includes("redacted"));
    assert.ok(mdContent.includes("Currently Instrumented"));
    assert.ok(mdContent.includes("hard-cron-wrapper/llm-spawn"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("writeRaindropCallSummary produces a JSON artifact that passes validation", () => {
  const dir = mkdtempSync(join(tmpdir(), "raindrop-adapter-test-"));
  try {
    const summary = buildRaindropCallSummary({
      runId: "write-002",
      agent: "codex",
      mode: "review",
      planeIssue: "none",
      startedAt: "2026-05-19T11:00:00.000Z",
      endedAt: "2026-05-19T11:05:00.000Z",
      state: "PASS",
    });

    const { jsonPath } = writeRaindropCallSummary(summary, dir, { runId: "write-002" });
    const loaded = JSON.parse(readFileSync(jsonPath, "utf8"));
    const result = validateRaindropCallSummary(loaded);
    assert.ok(result.ok, `JSON artifact failed validation: ${result.errors.join("; ")}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---- buildRaindropCallSummaryMarkdown tests ----

test("buildRaindropCallSummaryMarkdown includes privacy verdict section", () => {
  const summary = buildRaindropCallSummary({ runId: "md-001", agent: "claude" });
  const md = buildRaindropCallSummaryMarkdown(summary);
  assert.ok(md.includes("Privacy Verdict"));
  assert.ok(md.includes("PASS"));
  assert.ok(md.includes("no raw prompts"));
});

test("buildRaindropCallSummaryMarkdown lists missing surfaces", () => {
  const summary = buildRaindropCallSummary({ runId: "md-002", agent: "hermes" });
  const md = buildRaindropCallSummaryMarkdown(summary);
  assert.ok(md.includes("Not Yet Instrumented"));
  assert.ok(md.includes("codex-controller/llm-spawn"));
});

// ---- buildRaindropCallSummaryFromGoalRuntimeWorkerRun tests (RS-04) ----

test("buildRaindropCallSummaryFromGoalRuntimeWorkerRun emits goal-runtime/worker-run surface", () => {
  const summary = buildRaindropCallSummaryFromGoalRuntimeWorkerRun({
    runId: "goal-001",
    workItemRef: "[WORK_ITEM_ID]",
    agent: "claude",
    goalAdapterVersion: "goal-runtime-adapter/v0",
    mode: "implement",
    startedAt: "2026-05-19T12:00:00.000Z",
    endedAt: "2026-05-19T12:10:00.000Z",
    state: "PASS",
  });
  const s = summary["raindrop.llm_call_summary"];
  assert.equal(s.surface, "goal-runtime/worker-run");
  assert.equal(s.plane_issue, "[WORK_ITEM_ID]");
  assert.equal(s.agent, "claude");
  assert.equal(s.mode, "implement");
  assert.equal(s.state, "PASS");
  assert.equal(s.error_class, "none");
  assert.equal(s.model_route, "goal-runtime-adapter/v0");
});

test("buildRaindropCallSummaryFromGoalRuntimeWorkerRun enforces privacy: input redaction is always redacted", () => {
  const summary = buildRaindropCallSummaryFromGoalRuntimeWorkerRun({
    runId: "goal-002",
    agent: "claude",
  });
  assert.equal(summary["raindrop.llm_call_summary"].input_redaction_level, "redacted");
  assert.equal(summary["raindrop.llm_call_summary"].output_redaction_level, "internal");
  assert.equal(summary["raindrop.llm_call_summary"].token_counts_available, false);
});

test("buildRaindropCallSummaryFromGoalRuntimeWorkerRun contains no raw prompt or output fields", () => {
  const summary = buildRaindropCallSummaryFromGoalRuntimeWorkerRun({
    runId: "goal-003",
    agent: "claude",
    mode: "implement",
    state: "PASS",
  });
  const s = summary["raindrop.llm_call_summary"];
  const keys = Object.keys(s);
  assert.equal(keys.some((k) => k.toLowerCase().startsWith("raw_prompt")), false, "must not have raw_prompt field");
  assert.equal(keys.some((k) => k.toLowerCase().startsWith("raw_output")), false, "must not have raw_output field");
  assert.equal(keys.some((k) => k.toLowerCase().startsWith("system_prompt")), false, "must not have system_prompt field");
  assert.equal(keys.some((k) => k.toLowerCase().startsWith("tool_payload")), false, "must not have tool_payload field");
});

test("buildRaindropCallSummaryFromGoalRuntimeWorkerRun maps NEEDS_HUMAN to scope error_class", () => {
  const summary = buildRaindropCallSummaryFromGoalRuntimeWorkerRun({
    runId: "goal-004",
    agent: "claude",
    state: "NEEDS_HUMAN",
  });
  assert.equal(summary["raindrop.llm_call_summary"].error_class, "scope");
  assert.equal(summary["raindrop.llm_call_summary"].state, "NEEDS_HUMAN");
});

test("buildRaindropCallSummaryFromGoalRuntimeWorkerRun maps TIMEOUT to timeout error_class", () => {
  const summary = buildRaindropCallSummaryFromGoalRuntimeWorkerRun({
    runId: "goal-005",
    agent: "codex",
    state: "TIMEOUT",
  });
  assert.equal(summary["raindrop.llm_call_summary"].error_class, "timeout");
});

test("buildRaindropCallSummaryFromGoalRuntimeWorkerRun produces a summary that passes validation", () => {
  const summary = buildRaindropCallSummaryFromGoalRuntimeWorkerRun({
    runId: "goal-006",
    workItemRef: "[WORK_ITEM_ID]",
    agent: "claude",
    mode: "implement",
    startedAt: "2026-05-19T10:00:00.000Z",
    endedAt: "2026-05-19T10:15:00.000Z",
    state: "PASS",
    toolCallCount: 31,
    traceArtifact: "reports/observability/raindrop-workshop/2026-05-19/goal-006.json",
    reportArtifact: "reports/observability/raindrop-workshop/2026-05-19/goal-006.md",
  });
  const result = validateRaindropCallSummary(summary);
  assert.ok(result.ok, `goal-runtime summary failed validation: ${result.errors.join("; ")}`);
});

// ---- Coverage harness: every canonical managed surface must be accounted for ----

test("every canonical managed surface is in INSTRUMENTED_SURFACES or NOT_YET_INSTRUMENTED_SURFACES", () => {
  const covered = new Set([...INSTRUMENTED_SURFACES, ...NOT_YET_INSTRUMENTED_SURFACES]);
  for (const surface of CANONICAL_MANAGED_SURFACES) {
    assert.ok(
      covered.has(surface),
      `canonical managed surface "${surface}" is missing from both INSTRUMENTED_SURFACES and NOT_YET_INSTRUMENTED_SURFACES — add it to one list`,
    );
  }
});

test("RS-01 gap surfaces that remain uninstrumented are explicitly listed in NOT_YET_INSTRUMENTED_SURFACES", () => {
  const remainingGapSurfaces = [
    "scheduler/worker-run",
    "aionui-hermes/command-layer",
    "hermes-assistant/llm-calls",
    "codex-controller/llm-spawn",
  ];
  for (const surface of remainingGapSurfaces) {
    assert.ok(
      NOT_YET_INSTRUMENTED_SURFACES.includes(surface),
      `RS-01 gap surface "${surface}" must be explicitly listed in NOT_YET_INSTRUMENTED_SURFACES`,
    );
  }
});

// ---- validateRaindropHook tests (RS-06) ----

// AC-1: valid hook accepted
test("validateRaindropHook accepts a fully valid hook with an instrumented surface", () => {
  const hook = {
    surface: "goal-runtime/worker-run",
    adapter_version: "goal-runtime-adapter/v0",
    work_item_ref: "[WORK_ITEM_ID]",
    agent: "claude",
    mode: "implement",
    instrumentation: "call buildRaindropCallSummaryFromGoalRuntimeWorkerRun after worker completes",
  };
  const result = validateRaindropHook(hook);
  assert.ok(result.ok, `expected ok but got errors: ${result.errors.join("; ")}`);
  assert.deepEqual(result.errors, []);
});

// AC-2: invalid hook rejected (missing required fields)
test("validateRaindropHook rejects a hook with missing required fields", () => {
  const result = validateRaindropHook({ surface: "goal-runtime/worker-run" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("adapter_version")), "must report missing adapter_version");
  assert.ok(result.errors.some((e) => e.includes("work_item_ref")), "must report missing work_item_ref");
  assert.ok(result.errors.some((e) => e.includes("agent")), "must report missing agent");
  assert.ok(result.errors.some((e) => e.includes("mode")), "must report missing mode");
  assert.ok(result.errors.some((e) => e.includes("instrumentation")), "must report missing instrumentation");
});

// AC-3: unknown surface rejected
test("validateRaindropHook rejects a hook with an unknown surface not in INSTRUMENTED_SURFACES", () => {
  const unknownHook = {
    surface: "hermes-assistant/llm-calls",
    adapter_version: "hermes-adapter/v0",
    work_item_ref: "[WORK_ITEM_ID]",
    agent: "hermes",
    mode: "assist",
    instrumentation: "future instrumentation pending",
  };
  const result = validateRaindropHook(unknownHook);
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((e) => e.includes("INSTRUMENTED_SURFACES")),
    "must reject not-yet-instrumented surface",
  );
});

test("validateRaindropHook rejects a hook with a surface that is completely unrecognized", () => {
  const result = validateRaindropHook({
    surface: "completely-unknown/new-surface",
    adapter_version: "v0",
    work_item_ref: "[WORK_ITEM_ID]",
    agent: "claude",
    mode: "implement",
    instrumentation: "some instrumentation",
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("INSTRUMENTED_SURFACES")));
});

// AC-4: forbidden raw/private fields rejected
test("validateRaindropHook rejects a hook containing a raw_prompt field", () => {
  const result = validateRaindropHook({
    surface: "goal-runtime/worker-run",
    adapter_version: "goal-runtime-adapter/v0",
    work_item_ref: "[WORK_ITEM_ID]",
    agent: "claude",
    mode: "implement",
    instrumentation: "wired",
    raw_prompt: "the actual system prompt text",
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("raw_prompt")));
});

test("validateRaindropHook rejects a hook containing workspace_path or workspace_root fields", () => {
  const withPath = validateRaindropHook({
    surface: "goal-runtime/worker-run",
    adapter_version: "goal-runtime-adapter/v0",
    work_item_ref: "[WORK_ITEM_ID]",
    agent: "claude",
    mode: "implement",
    instrumentation: "wired",
    workspace_path: "${LOCAL_WORKSPACE}",
  });
  assert.equal(withPath.ok, false);
  assert.ok(withPath.errors.some((e) => e.includes("workspace_path")));
});

test("validateRaindropHook rejects a hook containing api_key field", () => {
  const result = validateRaindropHook({
    surface: "runtime-dispatcher-v1.2/worker-spawn",
    adapter_version: "dispatcher/v1.2",
    work_item_ref: "[WORK_ITEM_ID]",
    agent: "claude",
    mode: "implement",
    instrumentation: "wired",
    api_key: "sk-secret",
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("api_key")));
});

// AC-5: goal-runtime hook compatibility preserved
test("validateRaindropHook accepts the actual raindrop_hook emitted by buildGoalRuntimeAdapter", () => {
  const adapter = buildGoalRuntimeAdapter({
    workItem: { id: "item-277", sequence_id: 277, name: "RS-06 hook shape validator" },
    contractFields: {
      role: "role:cto",
      agent: "claude",
      mode: "implement",
      workspace: "/sandbox/company-os",
      acceptance_criteria: ["validator rejects unknown surfaces"],
      gates: ["node --test scripts/orchestration/raindrop-call-adapter.test.mjs"],
      human_gate: "HG-2",
      blocked_actions: "no Plane Done",
    },
    description: "Formal raindrop hook validator work item",
    runtime: "claude",
  });

  assert.ok(adapter.raindrop_hook, "buildGoalRuntimeAdapter must emit a raindrop_hook");
  const result = validateRaindropHook(adapter.raindrop_hook);
  assert.ok(
    result.ok,
    `goal-runtime adapter raindrop_hook failed validation: ${result.errors.join("; ")}`,
  );
  assert.equal(adapter.raindrop_hook.surface, "goal-runtime/worker-run");
});

test("goal-runtime/worker-run is now instrumented (RS-04) and must not appear in NOT_YET_INSTRUMENTED_SURFACES", () => {
  assert.ok(
    INSTRUMENTED_SURFACES.includes("goal-runtime/worker-run"),
    "goal-runtime/worker-run must be in INSTRUMENTED_SURFACES after RS-04",
  );
  assert.equal(
    NOT_YET_INSTRUMENTED_SURFACES.includes("goal-runtime/worker-run"),
    false,
    "goal-runtime/worker-run must not remain in NOT_YET_INSTRUMENTED_SURFACES after RS-04",
  );
});

// ---- RS-07 Builder Coverage Harness ----

// AC-1 (passing path): every currently instrumented surface has an adapter builder
test("RS-07 coverage harness: all INSTRUMENTED_SURFACES have an explicit builder in SURFACE_BUILDER_REGISTRY", () => {
  const result = validateSurfaceBuilderCoverage(INSTRUMENTED_SURFACES);
  assert.ok(result.ok, `coverage gaps found: ${result.errors.join("; ")}`);
  assert.deepEqual(result.errors, []);
});

// AC-1 (failing path): a synthetic surface promoted to the list without a builder is rejected
test("RS-07 coverage harness failing path: a synthetic instrumented surface without a builder is rejected", () => {
  const withSynthetic = [...INSTRUMENTED_SURFACES, "synthetic-test-surface/fake-spawn"];
  const result = validateSurfaceBuilderCoverage(withSynthetic);
  assert.equal(result.ok, false, "harness must reject a surface without builder coverage");
  assert.ok(
    result.errors.some((e) => e.includes("synthetic-test-surface/fake-spawn")),
    "error must name the uncovered synthetic surface",
  );
});

// AC-3: future Hermes/AionUI and Scheduler surfaces are absent from the registry (gated)
test("RS-07 coverage harness: NOT_YET_INSTRUMENTED_SURFACES future surfaces are absent from SURFACE_BUILDER_REGISTRY", () => {
  const futureGated = [
    "hermes-assistant/llm-calls",
    "aionui-hermes/command-layer",
    "scheduler/worker-run",
    "codex-controller/llm-spawn",
  ];
  for (const surface of futureGated) {
    assert.equal(
      surface in SURFACE_BUILDER_REGISTRY,
      false,
      `"${surface}" must NOT be in SURFACE_BUILDER_REGISTRY until fully instrumented`,
    );
  }
});

// AC-2 + AC-3 combined: registry and INSTRUMENTED_SURFACES are exactly in sync
test("RS-07 coverage harness: SURFACE_BUILDER_REGISTRY and INSTRUMENTED_SURFACES are exactly in sync", () => {
  const registryKeys = new Set(Object.keys(SURFACE_BUILDER_REGISTRY));
  const instrumentedSet = new Set(INSTRUMENTED_SURFACES);

  for (const key of registryKeys) {
    assert.ok(
      instrumentedSet.has(key),
      `SURFACE_BUILDER_REGISTRY key "${key}" is not in INSTRUMENTED_SURFACES — remove it or add it to INSTRUMENTED_SURFACES`,
    );
  }
  for (const surface of INSTRUMENTED_SURFACES) {
    assert.ok(
      registryKeys.has(surface),
      `INSTRUMENTED_SURFACES entry "${surface}" is missing from SURFACE_BUILDER_REGISTRY — add a builder`,
    );
  }
});

// ---- RS-09 Hook Producer Coverage Harness ----

// AC: every currently declared Raindrop hook producer emits a hook that passes
// validateRaindropHook. The registry must cover every required producer id.
test("RS-09 hook producer coverage: current registry has every required hook producer", () => {
  for (const id of REQUIRED_HOOK_PRODUCERS) {
    assert.ok(
      id in RAINDROP_HOOK_PRODUCER_REGISTRY,
      `required hook producer "${id}" is missing from RAINDROP_HOOK_PRODUCER_REGISTRY`,
    );
  }
});

test("RS-09 hook producer coverage: every producer in the registry emits a hook that passes validateRaindropHook", () => {
  for (const [producerId, build] of Object.entries(RAINDROP_HOOK_PRODUCER_REGISTRY)) {
    const hook = build();
    const result = validateRaindropHook(hook);
    assert.ok(
      result.ok,
      `producer "${producerId}" emitted invalid hook: ${result.errors.join("; ")}`,
    );
  }
});

test("RS-09 hook producer coverage: goal-runtime/worker-run probe carries the goal-runtime surface", () => {
  const hook = RAINDROP_HOOK_PRODUCER_REGISTRY["goal-runtime/worker-run"]();
  assert.equal(hook.surface, "goal-runtime/worker-run");
  assert.equal(hook.agent, "claude");
  assert.equal(hook.mode, "implement");
  assert.ok(hook.adapter_version);
  assert.ok(hook.instrumentation.includes("buildRaindropCallSummaryFromGoalRuntimeWorkerRun"));
});

// AC: validator passes for the live registry
test("RS-09 validateRaindropHookProducerCoverage PASS for the live registry", () => {
  const result = validateRaindropHookProducerCoverage();
  assert.ok(result.ok, `expected ok but got: ${result.errors.join("; ")}`);
  assert.deepEqual(result.errors, []);
});

// FAIL proof 1: missing hook producer
test("RS-09 validateRaindropHookProducerCoverage FAIL when a required hook producer is missing", () => {
  const result = validateRaindropHookProducerCoverage({
    registry: {},
    required: ["goal-runtime/worker-run"],
  });
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((e) => e.includes("goal-runtime/worker-run") && e.includes("missing")),
    `errors did not name the missing producer: ${result.errors.join("; ")}`,
  );
});

// FAIL proof 2: invalid hook shape (producer emits a hook missing required fields)
test("RS-09 validateRaindropHookProducerCoverage FAIL when a producer emits a structurally invalid hook", () => {
  const result = validateRaindropHookProducerCoverage({
    registry: {
      "goal-runtime/worker-run": () => ({
        surface: "goal-runtime/worker-run",
        // adapter_version, work_item_ref, agent, mode, instrumentation all missing
      }),
    },
    required: ["goal-runtime/worker-run"],
  });
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((e) => e.includes("adapter_version")),
    "must report missing adapter_version",
  );
  assert.ok(
    result.errors.some((e) => e.includes("instrumentation")),
    "must report missing instrumentation",
  );
});

// FAIL proof 3: producer emits hook containing a forbidden private field
test("RS-09 validateRaindropHookProducerCoverage FAIL when a producer emits a hook with a forbidden private field", () => {
  const result = validateRaindropHookProducerCoverage({
    registry: {
      "goal-runtime/worker-run": () => ({
        surface: "goal-runtime/worker-run",
        adapter_version: "goal-runtime-adapter/v0",
        work_item_ref: "[WORK_ITEM_ID]",
        agent: "claude",
        mode: "implement",
        instrumentation: "wired",
        raw_prompt: "leaked system prompt",
      }),
    },
    required: ["goal-runtime/worker-run"],
  });
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((e) => e.includes("raw_prompt")),
    `errors did not flag the forbidden field: ${result.errors.join("; ")}`,
  );
});

// FAIL proof 4: producer emits a hook whose surface is not instrumented (e.g. Hermes)
test("RS-09 validateRaindropHookProducerCoverage FAIL when a producer emits a hook with a not-yet-instrumented surface", () => {
  const result = validateRaindropHookProducerCoverage({
    registry: {
      "hermes-assistant/llm-calls": () => ({
        surface: "hermes-assistant/llm-calls",
        adapter_version: "hermes-adapter/v0",
        work_item_ref: "[WORK_ITEM_ID]",
        agent: "hermes",
        mode: "assist",
        instrumentation: "future hermes hook",
      }),
    },
    required: [],
  });
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((e) => e.includes("INSTRUMENTED_SURFACES")),
    `errors did not reject the not-yet-instrumented surface: ${result.errors.join("; ")}`,
  );
});

// FAIL proof 5: a registry entry that is not a callable factory
test("RS-09 validateRaindropHookProducerCoverage FAIL when a registry entry is not a function", () => {
  const result = validateRaindropHookProducerCoverage({
    registry: {
      "goal-runtime/worker-run": "not-a-function",
    },
    required: ["goal-runtime/worker-run"],
  });
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((e) => e.includes("must be a function")),
    `errors did not flag non-callable producer: ${result.errors.join("; ")}`,
  );
});

// FAIL proof 6: a producer factory that throws
test("RS-09 validateRaindropHookProducerCoverage FAIL when a producer factory throws", () => {
  const result = validateRaindropHookProducerCoverage({
    registry: {
      "goal-runtime/worker-run": () => { throw new Error("boom"); },
    },
    required: ["goal-runtime/worker-run"],
  });
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((e) => e.includes("threw") && e.includes("boom")),
    `errors did not surface the thrown error: ${result.errors.join("; ")}`,
  );
});

// AC: Scheduler / Hermes / AionUI / manual / external surfaces stay out of the producer registry
test("RS-09 hook producer coverage: not-yet-instrumented surfaces are absent from RAINDROP_HOOK_PRODUCER_REGISTRY", () => {
  const gated = [
    "scheduler/worker-run",
    "hermes-assistant/llm-calls",
    "aionui-hermes/command-layer",
    "codex-controller/llm-spawn",
    "manual-claude-desktop-sessions",
    "arbitrary-cli-sessions-outside-runtime",
    "gemini-cli-workers-outside-company-os-runtime",
  ];
  for (const surface of gated) {
    assert.equal(
      surface in RAINDROP_HOOK_PRODUCER_REGISTRY,
      false,
      `not-yet-instrumented surface "${surface}" must NOT be promoted into RAINDROP_HOOK_PRODUCER_REGISTRY`,
    );
  }
});

// AC: producer registry keys must all be in INSTRUMENTED_SURFACES (no phantom keys)
test("RS-09 hook producer coverage: every producer key is in INSTRUMENTED_SURFACES", () => {
  for (const key of Object.keys(RAINDROP_HOOK_PRODUCER_REGISTRY)) {
    assert.ok(
      INSTRUMENTED_SURFACES.includes(key),
      `RAINDROP_HOOK_PRODUCER_REGISTRY key "${key}" is not in INSTRUMENTED_SURFACES — remove it or instrument the surface first`,
    );
  }
});
