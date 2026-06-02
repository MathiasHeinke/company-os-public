#!/usr/bin/env node

/**
 * raindrop-prompt-result-loop.mjs
 *
 * Evaluates Company.OS-owned worker contracts as a prompt/result quality loop.
 * The loop intentionally stores hashes, counts and safe verdict metadata, not
 * raw prompts, raw model output, tool payloads, secrets or private data.
 */

import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

export const RAINDROP_PROMPT_RESULT_VERSION = "raindrop-prompt-result-eval/v0";

const FORBIDDEN_EXACT_KEYS = new Set([
  "raw_prompt",
  "raw_prompt_text",
  "raw_model_output",
  "raw_output",
  "raw_output_text",
  "prompt_text",
  "system_prompt",
  "tool_input",
  "tool_output",
  "tool_payload",
  "api_key",
  "secret_key",
  "bearer_token",
  "cookie",
  "browser_storage",
  "private_memory",
  "customer_data",
  "regulated_data",
]);

const SECRET_TEXT_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bghp_[A-Za-z0-9_]{30,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  /\bBearer [A-Za-z0-9._-]{24,}\b/,
];

function sha256(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function asText(value) {
  return String(value || "");
}

function asList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  const text = String(value || "").trim();
  if (!text) return [];
  return text
    .split(/\n|;/)
    .map((item) => item.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

function hasField(text, name) {
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\n)\\s*${escaped}\\s*:`, "i").test(text);
}

function countYamlListItems(text, fieldName) {
  const lines = String(text || "").split(/\r?\n/);
  const fieldRx = new RegExp(`^\\s*${fieldName}\\s*:`, "i");
  const start = lines.findIndex((line) => fieldRx.test(line));
  if (start < 0) return 0;
  let count = 0;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*[a-zA-Z0-9_]+\s*:/.test(line)) break;
    if (/^\s*-\s+\S/.test(line)) count += 1;
  }
  return count;
}

function countInlineFieldItems(text, fieldName) {
  const match = String(text || "").match(new RegExp(`(^|\\n)\\s*${fieldName}\\s*:\\s*(.+)`, "i"));
  if (!match) return 0;
  return String(match[2] || "").split(",").map((item) => item.trim()).filter(Boolean).length;
}

function extractPlaneIssueFromSummary(callSummary) {
  return callSummary?.["raindrop.llm_call_summary"]?.plane_issue || "none";
}

function extractSummary(callSummary) {
  return callSummary?.["raindrop.llm_call_summary"] || {};
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function detectWorkerState(text) {
  if (/\bstate:\s*PASS\b/i.test(text) || /\|\s*Worker\s*\|\s*PASS\s*\|/i.test(text)) return "PASS";
  if (/\bstate:\s*REJECT\b/i.test(text)) return "REJECT";
  if (/\bstate:\s*NEEDS_HUMAN\b/i.test(text)) return "NEEDS_HUMAN";
  if (/\bstate:\s*BLOCKED_/i.test(text)) return "BLOCKED";
  return "unknown";
}

function detectCaoVerdict(text) {
  if (/\bcao(?:\.verdict|_verdict|_pass)?\b[\s\S]{0,120}\bPASS\b/i.test(text) || /\|\s*CAO\s*\|\s*PASS\s*\|/i.test(text)) return "PASS";
  if (/\bcao(?:\.verdict|_verdict)?\b[\s\S]{0,120}\bREJECT\b/i.test(text)) return "REJECT";
  if (/\bcao(?:\.verdict|_verdict)?\b[\s\S]{0,120}\bPARK\b/i.test(text)) return "PARK";
  return "unknown";
}

function detectControllerDecision(text) {
  if (/\bcontroller(?:\.decision|_decision)?\b[\s\S]{0,160}\bAUTO-GO\b/i.test(text) || /\|\s*Controller\s*\|\s*AUTO-GO\s*\|/i.test(text)) return "AUTO-GO";
  if (/\bdecision_mode:\s*REJECT\b/i.test(text)) return "REJECT";
  if (/\bdecision_mode:\s*PARK\b/i.test(text)) return "PARK";
  if (/\bdecision_mode:\s*DELEGATE\b/i.test(text)) return "DELEGATE";
  return "unknown";
}

function extractFirstPassCount(text) {
  const match = String(text || "").match(/\bPASS(?:,|\s+)(\d+)\/(\d+)\b/i);
  if (!match) return { passed: null, total: null };
  return { passed: Number(match[1]), total: Number(match[2]) };
}

export function buildPromptContractEnvelope({
  runId,
  planeIssue = "none",
  promptTemplateVersion = "unknown",
  contractText = "",
  contractFields = {},
} = {}) {
  const text = asText(contractText);
  const sourceCount = asList(contractFields.source_of_truth || contractFields.sourceoftruth).length
    || countYamlListItems(text, "source_of_truth")
    || countYamlListItems(text, "SourceOfTruth");
  const gateCount = asList(contractFields.gates).length || countYamlListItems(text, "gates");
  const acceptanceCount = asList(contractFields.acceptance_criteria || contractFields.acceptancecriteria).length
    || countYamlListItems(text, "acceptance_criteria");
  const blockedActionCount = asList(contractFields.blocked_actions || contractFields.blockedactions).length
    || countInlineFieldItems(text, "blocked_actions");

  const missing = [];
  if (!sourceCount) missing.push("source_of_truth");
  if (!gateCount) missing.push("gates");
  if (!acceptanceCount) missing.push("acceptance_criteria");
  if (!blockedActionCount) missing.push("blocked_actions");
  if (!(contractFields.human_gate || contractFields.humangate || hasField(text, "human_gate"))) missing.push("human_gate");
  if (!(contractFields.reporting || hasField(text, "reporting"))) missing.push("reporting");
  if (!(contractFields.capability_profile || contractFields.capabilityprofile || hasField(text, "capability_profile"))) {
    missing.push("capability_profile");
  }

  const contractFingerprintSource = text || JSON.stringify(contractFields || {});
  return {
    version: RAINDROP_PROMPT_RESULT_VERSION,
    run_id: String(runId || randomUUID()),
    plane_issue: String(planeIssue || "none"),
    prompt_template_version: String(promptTemplateVersion || "unknown"),
    contract_hash: sha256(contractFingerprintSource),
    raw_prompt_captured: false,
    raw_contract_text_captured: false,
    source_of_truth_count: sourceCount,
    gate_count: gateCount,
    acceptance_criteria_count: acceptanceCount,
    blocked_actions_count: blockedActionCount,
    has_human_gate: !missing.includes("human_gate"),
    has_reporting: !missing.includes("reporting"),
    has_capability_profile: !missing.includes("capability_profile"),
    missing_contract_fields: missing,
  };
}

export function buildResultEnvelope({
  callSummary = null,
  workerReportText = "",
  controllerEvidenceText = "",
  changedFiles = [],
} = {}) {
  const s = extractSummary(callSummary);
  const combined = `${workerReportText}\n${controllerEvidenceText}`;
  const passCount = extractFirstPassCount(combined);
  const notYetInstrumented = Array.isArray(s.not_yet_instrumented_surfaces)
    ? s.not_yet_instrumented_surfaces
    : [];

  return {
    call_summary_version: s.version || "missing",
    call_state: s.state || "unknown",
    call_error_class: s.error_class || "unknown",
    input_redaction_level: s.input_redaction_level || "unknown",
    output_redaction_level: s.output_redaction_level || "unknown",
    worker_state: detectWorkerState(workerReportText),
    cao_verdict: detectCaoVerdict(controllerEvidenceText || workerReportText),
    controller_decision: detectControllerDecision(controllerEvidenceText || workerReportText),
    changed_file_count: Array.isArray(changedFiles) ? changedFiles.length : 0,
    tests_passed: passCount.passed,
    tests_total: passCount.total,
    reflection_present: /\nreflection\s*:|^reflection\s*:|##\s*Reflection/i.test(combined),
    learning_proposals_present: /\nlearning_proposals\s*:|^learning_proposals\s*:|##\s*Learning Proposals/i.test(combined),
    controller_hotfix_detected: /controller hotfix|hotfix/i.test(combined),
    missing_instrumented_surface_count: notYetInstrumented.length,
    missing_instrumented_surfaces: notYetInstrumented,
  };
}

export function scorePromptResultEvaluation({ promptEnvelope, resultEnvelope } = {}) {
  const prompt = promptEnvelope || {};
  const result = resultEnvelope || {};

  const contractSignals = [
    prompt.source_of_truth_count > 0,
    prompt.gate_count > 0,
    prompt.acceptance_criteria_count > 0,
    prompt.blocked_actions_count > 0,
    prompt.has_human_gate,
    prompt.has_reporting,
    prompt.has_capability_profile,
  ];
  const contract_completeness = contractSignals.filter(Boolean).length / contractSignals.length;

  const resultSignals = [
    result.worker_state === "PASS",
    result.cao_verdict === "PASS",
    result.controller_decision === "AUTO-GO",
    result.tests_total === null || result.tests_passed === result.tests_total,
  ];
  const result_alignment = resultSignals.filter(Boolean).length / resultSignals.length;

  const observabilitySignals = [
    result.call_summary_version !== "missing",
    result.input_redaction_level === "redacted",
    result.output_redaction_level === "internal",
    Array.isArray(result.missing_instrumented_surfaces),
  ];
  const observability_quality = observabilitySignals.filter(Boolean).length / observabilitySignals.length;

  const learningSignals = [
    result.reflection_present,
    result.learning_proposals_present,
    prompt.raw_prompt_captured === false,
    prompt.raw_contract_text_captured === false,
  ];
  const learning_capture = learningSignals.filter(Boolean).length / learningSignals.length;

  let overall = Number(((contract_completeness + result_alignment + observability_quality + learning_capture) / 4).toFixed(3));
  const observedCallFailed = !["PASS", "unknown"].includes(String(result.call_state || "unknown"));
  if (observedCallFailed) overall = Math.min(overall, 0.84);
  let verdict = overall >= 0.85 ? "PASS" : (overall >= 0.65 ? "WARN" : "FAIL");
  if (observedCallFailed && verdict === "PASS") {
    verdict = "WARN";
  }
  return {
    verdict,
    overall,
    dimensions: {
      contract_completeness: Number(contract_completeness.toFixed(3)),
      result_alignment: Number(result_alignment.toFixed(3)),
      observability_quality: Number(observability_quality.toFixed(3)),
      learning_capture: Number(learning_capture.toFixed(3)),
    },
  };
}

export function buildImprovementProposals({ promptEnvelope, resultEnvelope } = {}) {
  const proposals = [];
  const prompt = promptEnvelope || {};
  const result = resultEnvelope || {};

  for (const field of prompt.missing_contract_fields || []) {
    proposals.push({
      target: "worker-contract-template",
      reason: `missing_contract_field:${field}`,
      proposal: `Require ${field} before runtime dispatch.`,
    });
  }

  if (result.call_state && !["PASS", "unknown"].includes(result.call_state)) {
    proposals.push({
      target: "runtime-preflight",
      reason: `call_state:${result.call_state}:${result.call_error_class}`,
      proposal: "Promote this runtime failure into a pre-dispatch check or clearer contract field.",
    });
  }

  if (result.controller_hotfix_detected) {
    proposals.push({
      target: "controller-release-process",
      reason: "controller_hotfix_after_worker_pass",
      proposal: "Record operator hotfixes as first-class release evidence and consider a follow-up worker item when the hotfix changes runtime behavior.",
    });
  }

  if ((result.missing_instrumented_surface_count || 0) > 0) {
    proposals.push({
      target: "raindrop-coverage",
      reason: "missing_instrumented_surfaces",
      proposal: "Create follow-up coverage items for Company.OS-owned LLM surfaces that still bypass Raindrop summaries.",
    });
  }

  if (!result.reflection_present || !result.learning_proposals_present) {
    proposals.push({
      target: "cao-gate",
      reason: "learning_loop_missing",
      proposal: "Reject or re-run worker reports that omit reflection or learning_proposals.",
    });
  }

  return proposals;
}

export function buildPromptResultEvaluation({
  runId,
  planeIssue,
  promptTemplateVersion,
  contractText = "",
  contractFields = {},
  callSummary = null,
  workerReportText = "",
  controllerEvidenceText = "",
  changedFiles = [],
} = {}) {
  const issue = planeIssue || extractPlaneIssueFromSummary(callSummary);
  const promptEnvelope = buildPromptContractEnvelope({
    runId,
    planeIssue: issue,
    promptTemplateVersion,
    contractText,
    contractFields,
  });
  const resultEnvelope = buildResultEnvelope({
    callSummary,
    workerReportText,
    controllerEvidenceText,
    changedFiles,
  });
  const score = scorePromptResultEvaluation({ promptEnvelope, resultEnvelope });
  const improvementProposals = buildImprovementProposals({ promptEnvelope, resultEnvelope });
  return {
    "raindrop.prompt_result_evaluation": {
      version: RAINDROP_PROMPT_RESULT_VERSION,
      run_id: promptEnvelope.run_id,
      plane_issue: issue,
      prompt_contract_envelope: promptEnvelope,
      result_envelope: resultEnvelope,
      score,
      improvement_proposals: improvementProposals,
      privacy_verdict: "PASS",
      raw_prompt_captured: false,
      raw_output_captured: false,
    },
  };
}

function walkKeys(value, path = []) {
  if (!value || typeof value !== "object") return [];
  const rows = [];
  for (const [key, child] of Object.entries(value)) {
    rows.push([...path, key]);
    rows.push(...walkKeys(child, [...path, key]));
  }
  return rows;
}

export function validatePromptResultEvaluation(evaluation) {
  const errors = [];
  const root = evaluation?.["raindrop.prompt_result_evaluation"];
  if (!root || typeof root !== "object") {
    return { ok: false, errors: ["missing top-level key: raindrop.prompt_result_evaluation"] };
  }
  if (root.version !== RAINDROP_PROMPT_RESULT_VERSION) errors.push("invalid version");
  if (!root.run_id) errors.push("missing run_id");
  if (!root.plane_issue) errors.push("missing plane_issue");
  if (!root.prompt_contract_envelope) errors.push("missing prompt_contract_envelope");
  if (!root.result_envelope) errors.push("missing result_envelope");
  if (!root.score) errors.push("missing score");
  if (root.raw_prompt_captured !== false) errors.push("raw_prompt_captured must be false");
  if (root.raw_output_captured !== false) errors.push("raw_output_captured must be false");

  for (const keyPath of walkKeys(evaluation)) {
    const key = keyPath[keyPath.length - 1].toLowerCase();
    if (FORBIDDEN_EXACT_KEYS.has(key)) {
      errors.push(`privacy violation: forbidden key ${keyPath.join(".")}`);
    }
  }

  const serialized = JSON.stringify(evaluation);
  if (includesAny(serialized, SECRET_TEXT_PATTERNS)) {
    errors.push("privacy violation: token-shaped text found in evaluation");
  }
  return { ok: errors.length === 0, errors };
}

export function renderPromptResultEvaluationMarkdown(evaluation) {
  const root = evaluation?.["raindrop.prompt_result_evaluation"] || {};
  const score = root.score || {};
  const prompt = root.prompt_contract_envelope || {};
  const result = root.result_envelope || {};
  const proposals = Array.isArray(root.improvement_proposals) ? root.improvement_proposals : [];

  return [
    "# Raindrop Prompt-Result Evaluation",
    "",
    `> Version: ${root.version || "unknown"} | Work item: ${root.plane_issue || "none"} | Run: ${root.run_id || "unknown"}`,
    "",
    "## Verdict",
    "",
    `Overall: **${score.verdict || "unknown"}** (${score.overall ?? "unknown"})`,
    "",
    "| Dimension | Score |",
    "|---|---:|",
    `| Contract completeness | ${score.dimensions?.contract_completeness ?? "unknown"} |`,
    `| Result alignment | ${score.dimensions?.result_alignment ?? "unknown"} |`,
    `| Observability quality | ${score.dimensions?.observability_quality ?? "unknown"} |`,
    `| Learning capture | ${score.dimensions?.learning_capture ?? "unknown"} |`,
    "",
    "## Prompt / Contract Envelope",
    "",
    "| Field | Value |",
    "|---|---|",
    `| prompt_template_version | ${prompt.prompt_template_version || "unknown"} |`,
    `| contract_hash | ${prompt.contract_hash || "unknown"} |`,
    `| raw_prompt_captured | ${prompt.raw_prompt_captured === false ? "false" : "unknown"} |`,
    `| raw_contract_text_captured | ${prompt.raw_contract_text_captured === false ? "false" : "unknown"} |`,
    `| source_of_truth_count | ${prompt.source_of_truth_count ?? 0} |`,
    `| gate_count | ${prompt.gate_count ?? 0} |`,
    `| acceptance_criteria_count | ${prompt.acceptance_criteria_count ?? 0} |`,
    `| blocked_actions_count | ${prompt.blocked_actions_count ?? 0} |`,
    "",
    "## Result Envelope",
    "",
    "| Field | Value |",
    "|---|---|",
    `| call_state | ${result.call_state || "unknown"} |`,
    `| call_error_class | ${result.call_error_class || "unknown"} |`,
    `| worker_state | ${result.worker_state || "unknown"} |`,
    `| cao_verdict | ${result.cao_verdict || "unknown"} |`,
    `| controller_decision | ${result.controller_decision || "unknown"} |`,
    `| tests | ${result.tests_passed ?? "unknown"}/${result.tests_total ?? "unknown"} |`,
    `| reflection_present | ${Boolean(result.reflection_present)} |`,
    `| learning_proposals_present | ${Boolean(result.learning_proposals_present)} |`,
    `| missing_instrumented_surface_count | ${result.missing_instrumented_surface_count ?? 0} |`,
    "",
    "## Improvement Proposals",
    "",
    ...(proposals.length
      ? proposals.map((proposal) => `- ${proposal.target}: ${proposal.reason} - ${proposal.proposal}`)
      : ["- none"]),
    "",
    "## Privacy Verdict",
    "",
    "PASS - raw prompts, raw model output, tool payloads, secrets, browser storage,",
    "private memory, customer data and regulated content are not captured in this",
    "evaluation artifact.",
    "",
  ].join("\n");
}

export function writePromptResultEvaluation(evaluation, dir, { runId = "" } = {}) {
  const validation = validatePromptResultEvaluation(evaluation);
  if (!validation.ok) {
    throw new Error(`prompt-result evaluation failed validation: ${validation.errors.join("; ")}`);
  }
  const root = evaluation["raindrop.prompt_result_evaluation"];
  const id = runId || root.run_id || randomUUID();
  mkdirSync(dir, { recursive: true });
  const jsonPath = join(dir, `${id}.prompt-result.json`);
  const mdPath = join(dir, `${id}.prompt-result.md`);
  writeFileSync(jsonPath, JSON.stringify(evaluation, null, 2), "utf8");
  writeFileSync(mdPath, renderPromptResultEvaluationMarkdown(evaluation), "utf8");
  return { jsonPath, mdPath };
}

function parseArgs(argv) {
  const args = {
    callSummaryJson: "",
    workerReport: "",
    controllerEvidence: "",
    contractFile: "",
    outDir: "",
    runId: "",
    planeIssue: "",
    promptTemplateVersion: "unknown",
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--call-summary-json") args.callSummaryJson = argv[++i] || "";
    else if (arg === "--worker-report") args.workerReport = argv[++i] || "";
    else if (arg === "--controller-evidence") args.controllerEvidence = argv[++i] || "";
    else if (arg === "--contract-file") args.contractFile = argv[++i] || "";
    else if (arg === "--out-dir") args.outDir = argv[++i] || "";
    else if (arg === "--run-id") args.runId = argv[++i] || "";
    else if (arg === "--plane-issue") args.planeIssue = argv[++i] || "";
    else if (arg === "--prompt-template-version") args.promptTemplateVersion = argv[++i] || "unknown";
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  node scripts/orchestration/raindrop-prompt-result-loop.mjs \\
    --call-summary-json reports/observability/.../run.json \\
    --worker-report reports/runs/.../worker.md \\
    --controller-evidence reports/runs/.../controller-release-evidence.md \\
    --contract-file reports/runs/.../contract.md \\
    --out-dir reports/observability/raindrop-workshop/YYYY-MM-DD \\
    --run-id <id> \\
    --plane-issue [WORK_ITEM_ID] \\
    [--prompt-template-version <version>] [--json]
`;
}

function readOptional(path) {
  return path && existsSync(path) ? readFileSync(path, "utf8") : "";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const errors = [];
  if (!args.callSummaryJson) errors.push("--call-summary-json is required");
  if (!args.workerReport) errors.push("--worker-report is required");
  if (!args.controllerEvidence) errors.push("--controller-evidence is required");
  if (!args.contractFile) errors.push("--contract-file is required");
  if (!args.outDir) errors.push("--out-dir is required");
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 2;
    return;
  }

  const callSummary = JSON.parse(readFileSync(args.callSummaryJson, "utf8"));
  const workerReportText = readOptional(args.workerReport);
  const controllerEvidenceText = readOptional(args.controllerEvidence);
  const contractText = readOptional(args.contractFile);
  const evaluation = buildPromptResultEvaluation({
    runId: args.runId || basename(args.callSummaryJson, ".json"),
    planeIssue: args.planeIssue || extractPlaneIssueFromSummary(callSummary),
    promptTemplateVersion: args.promptTemplateVersion,
    contractText,
    callSummary,
    workerReportText,
    controllerEvidenceText,
  });
  const written = writePromptResultEvaluation(evaluation, args.outDir, { runId: args.runId });
  const result = {
    ok: true,
    version: RAINDROP_PROMPT_RESULT_VERSION,
    verdict: evaluation["raindrop.prompt_result_evaluation"].score.verdict,
    score: evaluation["raindrop.prompt_result_evaluation"].score.overall,
    jsonPath: written.jsonPath,
    mdPath: written.mdPath,
  };
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`prompt-result evaluation: ${result.verdict} ${result.score}`);
    console.log(`json: ${result.jsonPath}`);
    console.log(`markdown: ${result.mdPath}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`raindrop prompt-result loop failed: ${error.message}`);
    process.exitCode = 1;
  });
}
