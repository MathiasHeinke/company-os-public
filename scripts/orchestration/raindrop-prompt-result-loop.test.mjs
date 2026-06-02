import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  RAINDROP_PROMPT_RESULT_VERSION,
  buildPromptContractEnvelope,
  buildResultEnvelope,
  buildPromptResultEvaluation,
  renderPromptResultEvaluationMarkdown,
  validatePromptResultEvaluation,
  writePromptResultEvaluation,
} from "./raindrop-prompt-result-loop.mjs";

function callSummary(overrides = {}) {
  return {
    "raindrop.llm_call_summary": {
      version: "raindrop-llm-call/v0",
      run_id: "run-1",
      plane_issue: "[WORK_ITEM_ID]",
      agent: "claude",
      model_route: "claude-sonnet-4-6",
      mode: "implement",
      started_at: "2026-05-19T10:00:00.000Z",
      ended_at: "2026-05-19T10:05:00.000Z",
      duration_ms: 300000,
      input_redaction_level: "redacted",
      output_redaction_level: "internal",
      token_counts_available: false,
      tool_call_count: 12,
      stream_event_count: 12,
      redacted_secret_markers: 0,
      error_class: "none",
      state: "PASS",
      surface: "runtime-dispatcher-v1.2/worker-spawn",
      trace_artifact: "reports/runs/run-1.stream.jsonl",
      report_artifact: "reports/runs/run-1.md",
      instrumented_surfaces: ["runtime-dispatcher-v1.2/worker-spawn"],
      not_yet_instrumented_surfaces: ["codex-controller/llm-spawn"],
      ...overrides,
    },
  };
}

const CONTRACT_TEXT = `role: role:cto
source_of_truth:
  - docs/operations/raindrop-llm-call-observability.md
  - docs/orchestration/company-os-runtime-dispatcher-v1.md
acceptance_criteria:
  - Adapter writes safe summaries.
  - Evaluation loop writes prompt/result reports.
gates:
  - node --test scripts/orchestration/raindrop-prompt-result-loop.test.mjs
human_gate: HG-2.5
reporting: Plane worker.reported with artifacts.
capability_profile: claude-clevel-worker/cto/runtime
blocked_actions: no raw prompt, no hosted raindrop, no Plane Done`;

const WORKER_REPORT = `# Worker Report
state: PASS

Gate Results:
- PASS 178/178

reflection:
  summary: The contract was strong enough.

learning_proposals:
  - target: raindrop-coverage
    proposal: add more surfaces`;

const CONTROLLER_EVIDENCE = `controller.release-evidence:
  verdict: PASS
  controller_decision: AUTO-GO
  cao_verdict: PASS
  note: controller hotfix recorded`;

test("buildPromptContractEnvelope stores hash and counts instead of raw prompt text", () => {
  const envelope = buildPromptContractEnvelope({
    runId: "run-1",
    planeIssue: "[WORK_ITEM_ID]",
    promptTemplateVersion: "runtime-dispatcher-v1.2/contract-v0",
    contractText: CONTRACT_TEXT,
  });

  assert.equal(envelope.version, RAINDROP_PROMPT_RESULT_VERSION);
  assert.equal(envelope.raw_prompt_captured, false);
  assert.equal(envelope.raw_contract_text_captured, false);
  assert.equal(envelope.source_of_truth_count, 2);
  assert.equal(envelope.gate_count, 1);
  assert.equal(envelope.acceptance_criteria_count, 2);
  assert.equal(envelope.missing_contract_fields.length, 0);
  assert.match(envelope.contract_hash, /^[a-f0-9]{64}$/);
});

test("buildResultEnvelope detects worker, CAO, controller and learning state", () => {
  const envelope = buildResultEnvelope({
    callSummary: callSummary(),
    workerReportText: WORKER_REPORT,
    controllerEvidenceText: CONTROLLER_EVIDENCE,
  });

  assert.equal(envelope.call_state, "PASS");
  assert.equal(envelope.worker_state, "PASS");
  assert.equal(envelope.cao_verdict, "PASS");
  assert.equal(envelope.controller_decision, "AUTO-GO");
  assert.equal(envelope.tests_passed, 178);
  assert.equal(envelope.tests_total, 178);
  assert.equal(envelope.reflection_present, true);
  assert.equal(envelope.learning_proposals_present, true);
  assert.equal(envelope.controller_hotfix_detected, true);
  assert.equal(envelope.missing_instrumented_surface_count, 1);
});

test("buildPromptResultEvaluation scores a complete chain as PASS with proposals", () => {
  const evaluation = buildPromptResultEvaluation({
    runId: "run-1",
    planeIssue: "[WORK_ITEM_ID]",
    promptTemplateVersion: "runtime-dispatcher-v1.2/contract-v0",
    contractText: CONTRACT_TEXT,
    callSummary: callSummary(),
    workerReportText: WORKER_REPORT,
    controllerEvidenceText: CONTROLLER_EVIDENCE,
  });
  const root = evaluation["raindrop.prompt_result_evaluation"];

  assert.equal(root.version, RAINDROP_PROMPT_RESULT_VERSION);
  assert.equal(root.score.verdict, "PASS");
  assert.equal(root.raw_prompt_captured, false);
  assert.equal(root.raw_output_captured, false);
  assert.ok(root.improvement_proposals.some((proposal) => proposal.target === "raindrop-coverage"));
  assert.ok(root.improvement_proposals.some((proposal) => proposal.target === "controller-release-process"));
});

test("validatePromptResultEvaluation rejects forbidden raw payload keys", () => {
  const evaluation = buildPromptResultEvaluation({
    runId: "run-1",
    contractText: CONTRACT_TEXT,
    callSummary: callSummary(),
    workerReportText: WORKER_REPORT,
    controllerEvidenceText: CONTROLLER_EVIDENCE,
  });
  evaluation["raindrop.prompt_result_evaluation"].raw_output_text = "private payload";

  const result = validatePromptResultEvaluation(evaluation);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("raw_output_text")));
});

test("validatePromptResultEvaluation rejects token-shaped text", () => {
  const evaluation = buildPromptResultEvaluation({
    runId: "run-1",
    contractText: CONTRACT_TEXT,
    callSummary: callSummary(),
    workerReportText: WORKER_REPORT,
    controllerEvidenceText: CONTROLLER_EVIDENCE,
  });
  evaluation["raindrop.prompt_result_evaluation"].improvement_proposals.push({
    target: "bad",
    reason: "leak",
    proposal: `never store sk-${"a".repeat(24)}`,
  });

  const result = validatePromptResultEvaluation(evaluation);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("token-shaped")));
});

test("renderPromptResultEvaluationMarkdown never includes raw contract text", () => {
  const evaluation = buildPromptResultEvaluation({
    runId: "run-1",
    contractText: CONTRACT_TEXT,
    callSummary: callSummary(),
    workerReportText: WORKER_REPORT,
    controllerEvidenceText: CONTROLLER_EVIDENCE,
  });
  const markdown = renderPromptResultEvaluationMarkdown(evaluation);

  assert.match(markdown, /Raindrop Prompt-Result Evaluation/);
  assert.match(markdown, /contract_hash/);
  assert.doesNotMatch(markdown, /Adapter writes safe summaries/);
  assert.doesNotMatch(markdown, /private payload/);
});

test("writePromptResultEvaluation writes valid JSON and Markdown artifacts", () => {
  const dir = mkdtempSync(join(tmpdir(), "raindrop-prompt-result-"));
  try {
    const evaluation = buildPromptResultEvaluation({
      runId: "run-write",
      contractText: CONTRACT_TEXT,
      callSummary: callSummary(),
      workerReportText: WORKER_REPORT,
      controllerEvidenceText: CONTROLLER_EVIDENCE,
    });
    const written = writePromptResultEvaluation(evaluation, dir, { runId: "run-write" });
    const loaded = JSON.parse(readFileSync(written.jsonPath, "utf8"));
    assert.equal(validatePromptResultEvaluation(loaded).ok, true);
    assert.match(readFileSync(written.mdPath, "utf8"), /Improvement Proposals/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("incomplete contract or failed call produces WARN or FAIL", () => {
  const evaluation = buildPromptResultEvaluation({
    runId: "run-warn",
    contractText: "role: role:cto",
    callSummary: callSummary({ state: "NEEDS_HUMAN", error_class: "scope" }),
    workerReportText: "state: NEEDS_HUMAN",
    controllerEvidenceText: "controller.decision:\n  decision_mode: REJECT",
  });
  const root = evaluation["raindrop.prompt_result_evaluation"];

  assert.notEqual(root.score.verdict, "PASS");
  assert.ok(root.improvement_proposals.some((proposal) => proposal.reason.includes("call_state")));
  assert.ok(root.improvement_proposals.some((proposal) => proposal.reason.includes("missing_contract_field")));
});

test("failed observed call caps an otherwise complete evaluation at WARN", () => {
  const evaluation = buildPromptResultEvaluation({
    runId: "run-scope-drift",
    contractText: CONTRACT_TEXT,
    callSummary: callSummary({ state: "NEEDS_HUMAN", error_class: "scope" }),
    workerReportText: WORKER_REPORT,
    controllerEvidenceText: CONTROLLER_EVIDENCE,
  });
  const root = evaluation["raindrop.prompt_result_evaluation"];

  assert.equal(root.score.verdict, "WARN");
  assert.ok(root.improvement_proposals.some((proposal) => proposal.reason.includes("call_state")));
});
