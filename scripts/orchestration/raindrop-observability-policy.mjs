/**
 * raindrop-observability-policy.mjs
 *
 * Executable policy for deciding which Company.OS LLM calls should be observed,
 * which should receive a safe call summary only, and which should trigger a
 * deeper prompt/result quality evaluation.
 *
 * This policy intentionally avoids "observe everything". It applies to managed
 * Company.OS work and excludes private ideation or arbitrary desktop sessions
 * unless they are promoted into a Plane/Goal/runtime-managed run.
 */

export const RAINDROP_OBSERVABILITY_POLICY_VERSION = "raindrop-observability-policy/v0.1";

export const OBSERVABILITY_DECISIONS = Object.freeze({
  OBSERVE_AND_EVALUATE: "observe_and_evaluate",
  OBSERVE_SUMMARY_ONLY: "observe_summary_only",
  NOT_OBSERVED: "not_observed",
  BLOCKED_PRIVATE: "blocked_private",
});

export const DEEP_EVAL_REASONS = Object.freeze({
  NON_PASS_STATE: "non_pass_state",
  NEEDS_HUMAN_ESCALATION: "needs_human_escalation",
  CAO_CONTROLLER_DISAGREE: "cao_controller_disagree",
  HUMAN_GATE_HIGH: "human_gate_high",
  TEMPLATE_OR_PROMPT_VERSION_CHANGE: "template_or_prompt_version_change",
  EXTERNAL_IMPACT_OUTPUT: "external_impact_output",
  SAMPLING: "sampling",
});

// Coverage classes describe the policy bucket a managed surface belongs to.
// Each class drives default summary-vs-deep-eval routing and documents which
// boundary the call crosses. The "productive_marketing_ares_website_pipeline"
// class covers the six S1-S6 [SOURCE_WORKSPACE] marketing-pipeline surfaces; their
// envelopes default to summary-only retention but always promote to
// observe_and_evaluate when externalImpact=true (publish-bound output).
export const COVERAGE_CLASSES = Object.freeze({
  MANAGED_RUNTIME_CALLS: "managed_runtime_calls",
  MANAGED_WORKER_ROUTER_CALLS: "managed_worker_router_calls",
  MANAGED_CONTROLLER_CALLS: "managed_controller_calls",
  TOP_LAYER_COMMAND_CALLS: "top_layer_command_calls",
  PRODUCTIVE_MARKETING_ARES_WEBSITE_PIPELINE: "productive_marketing_ares_website_pipeline",
  MANUAL_IDEATION: "manual_ideation",
  PRIVATE_FOUNDER_CONTEXT: "private_founder_context",
  ARBITRARY_LOCAL_CLI: "arbitrary_local_cli",
  UNKNOWN: "unknown",
});

const MANAGED_SURFACE_PATTERNS = [
  /^runtime-dispatcher-v1\.2\/worker-spawn$/,
  /^hard-cron-wrapper\/llm-spawn$/,
  /^plane-ui-worker-cadence-runner\/llm-spawn$/,
  /^model-router\/(claude-cli|gemini-cli|codex-openrouter)-worker$/,
  /^codex-controller\/decision$/,
  /^codex-controller\/llm-spawn$/,
  /^aionui-hermes\/command-layer$/,
  /^hermes-assistant\/llm-calls$/,
  /^goal-runtime\/worker-run$/,
  /^scheduler\/worker-run$/,
  /^[SOURCE_WORKSPACE]\/marketing-pipeline\/[a-z0-9][a-z0-9-]*$/,
];

// Flat canonical string list derived from MANAGED_SURFACE_PATTERNS.
// Each entry is the exact surface string that isManagedCompanyOsSurface accepts.
// The model-router alternation pattern is expanded into three discrete entries.
// This list is the machine-readable surface catalog for coverage harness checks.
export const CANONICAL_MANAGED_SURFACES = Object.freeze([
  "runtime-dispatcher-v1.2/worker-spawn",
  "hard-cron-wrapper/llm-spawn",
  "plane-ui-worker-cadence-runner/llm-spawn",
  "model-router/claude-cli-worker",
  "model-router/gemini-cli-worker",
  "model-router/codex-openrouter-worker",
  "codex-controller/decision",
  "codex-controller/llm-spawn",
  "aionui-hermes/command-layer",
  "hermes-assistant/llm-calls",
  "goal-runtime/worker-run",
  "scheduler/worker-run",
  "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-openai",
  "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-codex-cli",
  "[SOURCE_WORKSPACE]/marketing-pipeline/visual-directions-openai",
  "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openrouter",
  "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openai-fallback",
  "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-claude-cli",
]);

// Map a managed surface string to its policy coverage class. Surfaces that are
// not managed return COVERAGE_CLASSES.UNKNOWN so callers can still tag them in
// classification artifacts without ambiguity.
export function inferCoverageClass(surface = "") {
  const normalized = String(surface || "").trim().toLowerCase();
  if (/^[SOURCE_WORKSPACE]\/marketing-pipeline\/[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    return COVERAGE_CLASSES.PRODUCTIVE_MARKETING_ARES_WEBSITE_PIPELINE;
  }
  if (/^runtime-dispatcher-v1\.2\/worker-spawn$/.test(normalized)) return COVERAGE_CLASSES.MANAGED_RUNTIME_CALLS;
  if (/^hard-cron-wrapper\/llm-spawn$/.test(normalized)) return COVERAGE_CLASSES.MANAGED_RUNTIME_CALLS;
  if (/^plane-ui-worker-cadence-runner\/llm-spawn$/.test(normalized)) return COVERAGE_CLASSES.MANAGED_RUNTIME_CALLS;
  if (/^scheduler\/worker-run$/.test(normalized)) return COVERAGE_CLASSES.MANAGED_RUNTIME_CALLS;
  if (/^goal-runtime\/worker-run$/.test(normalized)) return COVERAGE_CLASSES.MANAGED_RUNTIME_CALLS;
  if (/^model-router\//.test(normalized)) return COVERAGE_CLASSES.MANAGED_WORKER_ROUTER_CALLS;
  if (/^codex-controller\//.test(normalized)) return COVERAGE_CLASSES.MANAGED_CONTROLLER_CALLS;
  if (/^aionui-hermes\//.test(normalized) || /^hermes-assistant\//.test(normalized)) {
    return COVERAGE_CLASSES.TOP_LAYER_COMMAND_CALLS;
  }
  return COVERAGE_CLASSES.UNKNOWN;
}

const PRIVATE_CONTEXT_PATTERNS = [
  /^mh-dev\/personal-memory$/,
  /^private-founder-ideation$/,
  /^manual-private-chat$/,
];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function list(value) {
  if (Array.isArray(value)) return value.map((item) => normalize(item)).filter(Boolean);
  return String(value || "")
    .split(/[,;\n]/)
    .map((item) => normalize(item.replace(/^\s*-\s*/, "")))
    .filter(Boolean);
}

export function isManagedCompanyOsSurface(surface = "") {
  const normalized = normalize(surface);
  return MANAGED_SURFACE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isPrivateUnmanagedSurface(surface = "") {
  const normalized = normalize(surface);
  return PRIVATE_CONTEXT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function shouldDeepEvaluate({
  state = "PASS",
  caoVerdict = "",
  controllerDecision = "",
  humanGate = "HG-2",
  promptTemplateChanged = false,
  externalImpact = false,
  samplingHit = false,
} = {}) {
  const reasons = [];
  const normalizedState = normalize(state);
  const normalizedCao = normalize(caoVerdict);
  const normalizedController = normalize(controllerDecision);
  const normalizedGate = normalize(humanGate).replace(/\s+/g, "");

  if (normalizedState === "needs_human") {
    reasons.push(DEEP_EVAL_REASONS.NEEDS_HUMAN_ESCALATION);
  } else if (normalizedState && normalizedState !== "pass") {
    reasons.push(DEEP_EVAL_REASONS.NON_PASS_STATE);
  }
  if (normalizedCao === "pass" && ["reject", "park", "ask-founder"].includes(normalizedController)) {
    reasons.push(DEEP_EVAL_REASONS.CAO_CONTROLLER_DISAGREE);
  }
  if (["hg-3", "hg-3.5", "hg-4"].includes(normalizedGate)) reasons.push(DEEP_EVAL_REASONS.HUMAN_GATE_HIGH);
  if (promptTemplateChanged) reasons.push(DEEP_EVAL_REASONS.TEMPLATE_OR_PROMPT_VERSION_CHANGE);
  if (externalImpact) reasons.push(DEEP_EVAL_REASONS.EXTERNAL_IMPACT_OUTPUT);
  if (samplingHit) reasons.push(DEEP_EVAL_REASONS.SAMPLING);

  return {
    required: reasons.length > 0,
    reasons,
  };
}

export function classifyRaindropObservability({
  surface = "",
  route = "",
  contextClass = "",
  promotedToCompanyOsRun = false,
  state = "PASS",
  caoVerdict = "",
  controllerDecision = "",
  humanGate = "HG-2",
  promptTemplateChanged = false,
  externalImpact = false,
  samplingHit = false,
  tags = [],
} = {}) {
  const normalizedSurface = normalize(surface || route);
  const normalizedContext = normalize(contextClass);
  const normalizedTags = list(tags);
  const privateContext = normalizedContext.includes("private")
    || normalizedTags.includes("private")
    || isPrivateUnmanagedSurface(normalizedSurface);

  const coverageClass = inferCoverageClass(normalizedSurface);

  if (privateContext && !promotedToCompanyOsRun) {
    return {
      version: RAINDROP_OBSERVABILITY_POLICY_VERSION,
      decision: OBSERVABILITY_DECISIONS.BLOCKED_PRIVATE,
      summary_required: false,
      deep_eval_required: false,
      deep_eval_reasons: [],
      retention: "none",
      reason: "private_or_personal_context_not_promoted",
      coverage_class: COVERAGE_CLASSES.PRIVATE_FOUNDER_CONTEXT,
    };
  }

  const managed = promotedToCompanyOsRun || isManagedCompanyOsSurface(normalizedSurface);
  if (!managed) {
    return {
      version: RAINDROP_OBSERVABILITY_POLICY_VERSION,
      decision: OBSERVABILITY_DECISIONS.NOT_OBSERVED,
      summary_required: false,
      deep_eval_required: false,
      deep_eval_reasons: [],
      retention: "none",
      reason: "unmanaged_surface",
      coverage_class: COVERAGE_CLASSES.ARBITRARY_LOCAL_CLI,
    };
  }

  const deepEval = shouldDeepEvaluate({
    state,
    caoVerdict,
    controllerDecision,
    humanGate,
    promptTemplateChanged,
    externalImpact,
    samplingHit,
  });

  return {
    version: RAINDROP_OBSERVABILITY_POLICY_VERSION,
    decision: deepEval.required
      ? OBSERVABILITY_DECISIONS.OBSERVE_AND_EVALUATE
      : OBSERVABILITY_DECISIONS.OBSERVE_SUMMARY_ONLY,
    summary_required: true,
    deep_eval_required: deepEval.required,
    deep_eval_reasons: deepEval.reasons,
    retention: deepEval.required ? "summary_plus_prompt_result_eval" : "summary_metadata_only",
    reason: deepEval.required ? "managed_call_with_deep_eval_trigger" : "managed_call_summary_only",
    coverage_class: coverageClass,
  };
}
