import test from "node:test";
import assert from "node:assert/strict";

import {
  CANONICAL_MANAGED_SURFACES,
  COVERAGE_CLASSES,
  DEEP_EVAL_REASONS,
  OBSERVABILITY_DECISIONS,
  RAINDROP_OBSERVABILITY_POLICY_VERSION,
  classifyRaindropObservability,
  inferCoverageClass,
  isManagedCompanyOsSurface,
  shouldDeepEvaluate,
} from "./raindrop-observability-policy.mjs";

test("managed Company.OS runtime surfaces are observable", () => {
  assert.equal(isManagedCompanyOsSurface("runtime-dispatcher-v1.2/worker-spawn"), true);
  assert.equal(isManagedCompanyOsSurface("model-router/gemini-cli-worker"), true);
  assert.equal(isManagedCompanyOsSurface("aionui-hermes/command-layer"), true);
  assert.equal(isManagedCompanyOsSurface("manual-claude-desktop-sessions"), false);
});

test("managed PASS calls get summary only by default", () => {
  const result = classifyRaindropObservability({
    surface: "model-router/claude-cli-worker",
    state: "PASS",
    humanGate: "HG-2",
  });

  assert.equal(result.version, RAINDROP_OBSERVABILITY_POLICY_VERSION);
  assert.equal(result.decision, OBSERVABILITY_DECISIONS.OBSERVE_SUMMARY_ONLY);
  assert.equal(result.summary_required, true);
  assert.equal(result.deep_eval_required, false);
  assert.equal(result.retention, "summary_metadata_only");
});

test("NEEDS_HUMAN managed calls require deep evaluation with needs_human_escalation reason", () => {
  const result = classifyRaindropObservability({
    surface: "runtime-dispatcher-v1.2/worker-spawn",
    state: "NEEDS_HUMAN",
  });

  assert.equal(result.decision, OBSERVABILITY_DECISIONS.OBSERVE_AND_EVALUATE);
  assert.equal(result.deep_eval_required, true);
  assert.deepEqual(result.deep_eval_reasons, [DEEP_EVAL_REASONS.NEEDS_HUMAN_ESCALATION]);
});

test("hard error states require deep evaluation with non_pass_state reason", () => {
  for (const state of ["REJECT", "RUNTIME_ERROR", "TIMEOUT", "BLOCKED_AUTH", "BLOCKED_BUDGET", "BLOCKED_DEPENDENCY"]) {
    const result = classifyRaindropObservability({
      surface: "runtime-dispatcher-v1.2/worker-spawn",
      state,
    });
    assert.equal(result.decision, OBSERVABILITY_DECISIONS.OBSERVE_AND_EVALUATE, `expected observe_and_evaluate for state=${state}`);
    assert.deepEqual(result.deep_eval_reasons, [DEEP_EVAL_REASONS.NON_PASS_STATE], `expected non_pass_state for state=${state}`);
  }
});

test("HG-3 and HG-4 managed calls require deep evaluation", () => {
  assert.equal(shouldDeepEvaluate({ humanGate: "HG-3" }).required, true);
  assert.equal(shouldDeepEvaluate({ humanGate: "HG-3.5" }).required, true);
  assert.equal(shouldDeepEvaluate({ humanGate: "HG-4" }).required, true);
});

test("external-impact marketing/coding output requires deep evaluation", () => {
  const result = classifyRaindropObservability({
    surface: "goal-runtime/worker-run",
    state: "PASS",
    externalImpact: true,
  });

  assert.equal(result.decision, OBSERVABILITY_DECISIONS.OBSERVE_AND_EVALUATE);
  assert.ok(result.deep_eval_reasons.includes(DEEP_EVAL_REASONS.EXTERNAL_IMPACT_OUTPUT));
});

test("prompt or template version changes require deep evaluation", () => {
  const result = classifyRaindropObservability({
    surface: "scheduler/worker-run",
    state: "PASS",
    promptTemplateChanged: true,
  });

  assert.equal(result.decision, OBSERVABILITY_DECISIONS.OBSERVE_AND_EVALUATE);
  assert.ok(result.deep_eval_reasons.includes(DEEP_EVAL_REASONS.TEMPLATE_OR_PROMPT_VERSION_CHANGE));
});

test("sampling can promote a successful managed call to deep eval", () => {
  const result = classifyRaindropObservability({
    surface: "codex-controller/decision",
    state: "PASS",
    samplingHit: true,
  });

  assert.equal(result.decision, OBSERVABILITY_DECISIONS.OBSERVE_AND_EVALUATE);
  assert.ok(result.deep_eval_reasons.includes(DEEP_EVAL_REASONS.SAMPLING));
});

test("manual/private calls are not observed unless promoted into Company.OS", () => {
  const blocked = classifyRaindropObservability({
    surface: "manual-private-chat",
    contextClass: "private ideation",
  });
  assert.equal(blocked.decision, OBSERVABILITY_DECISIONS.BLOCKED_PRIVATE);
  assert.equal(blocked.summary_required, false);

  const promoted = classifyRaindropObservability({
    surface: "manual-private-chat",
    contextClass: "private ideation",
    promotedToCompanyOsRun: true,
  });
  assert.equal(promoted.decision, OBSERVABILITY_DECISIONS.OBSERVE_SUMMARY_ONLY);
  assert.equal(promoted.summary_required, true);
});

test("arbitrary unmanaged CLI sessions stay out of scope", () => {
  const result = classifyRaindropObservability({
    surface: "random-local-cli/experiment",
    state: "PASS",
  });

  assert.equal(result.decision, OBSERVABILITY_DECISIONS.NOT_OBSERVED);
  assert.equal(result.retention, "none");
});

test("isManagedCompanyOsSurface recognizes [SOURCE_WORKSPACE] marketing-pipeline surfaces (S1-S6)", () => {
  for (const surface of [
    "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-openai",
    "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-codex-cli",
    "[SOURCE_WORKSPACE]/marketing-pipeline/visual-directions-openai",
    "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openrouter",
    "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openai-fallback",
    "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-claude-cli",
  ]) {
    assert.equal(
      isManagedCompanyOsSurface(surface),
      true,
      `${surface} must be a managed Company.OS surface after [WORK_ITEM_ID]`,
    );
  }
});

test("inferCoverageClass maps [SOURCE_WORKSPACE] marketing surfaces to productive_marketing_ares_website_pipeline", () => {
  const surfaces = [
    "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-openai",
    "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openrouter",
  ];
  for (const surface of surfaces) {
    assert.equal(
      inferCoverageClass(surface),
      COVERAGE_CLASSES.PRODUCTIVE_MARKETING_ARES_WEBSITE_PIPELINE,
    );
  }
  assert.equal(
    inferCoverageClass("model-router/claude-cli-worker"),
    COVERAGE_CLASSES.MANAGED_WORKER_ROUTER_CALLS,
  );
  assert.equal(
    inferCoverageClass("runtime-dispatcher-v1.2/worker-spawn"),
    COVERAGE_CLASSES.MANAGED_RUNTIME_CALLS,
  );
  assert.equal(
    inferCoverageClass("totally-unmanaged"),
    COVERAGE_CLASSES.UNKNOWN,
  );
});

test("classifyRaindropObservability tags [SOURCE_WORKSPACE] marketing PASS calls as observe_summary_only with the marketing coverage class", () => {
  const result = classifyRaindropObservability({
    surface: "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-image-codex-cli",
    state: "PASS",
  });
  assert.equal(result.decision, OBSERVABILITY_DECISIONS.OBSERVE_SUMMARY_ONLY);
  assert.equal(result.coverage_class, COVERAGE_CLASSES.PRODUCTIVE_MARKETING_ARES_WEBSITE_PIPELINE);
  assert.equal(result.summary_required, true);
  assert.equal(result.deep_eval_required, false);
});

test("classifyRaindropObservability promotes [SOURCE_WORKSPACE] marketing publish-bound calls to observe_and_evaluate", () => {
  const result = classifyRaindropObservability({
    surface: "[SOURCE_WORKSPACE]/marketing-pipeline/editorial-eval-openrouter",
    state: "PASS",
    externalImpact: true,
  });
  assert.equal(result.decision, OBSERVABILITY_DECISIONS.OBSERVE_AND_EVALUATE);
  assert.equal(result.coverage_class, COVERAGE_CLASSES.PRODUCTIVE_MARKETING_ARES_WEBSITE_PIPELINE);
  assert.ok(result.deep_eval_reasons.includes(DEEP_EVAL_REASONS.EXTERNAL_IMPACT_OUTPUT));
});

test("CANONICAL_MANAGED_SURFACES covers all pattern variants and each entry is recognized by isManagedCompanyOsSurface", () => {
  assert.ok(Array.isArray(CANONICAL_MANAGED_SURFACES), "must be an array");
  assert.ok(CANONICAL_MANAGED_SURFACES.length >= 12, "must have at least 12 entries");
  for (const surface of CANONICAL_MANAGED_SURFACES) {
    assert.ok(
      isManagedCompanyOsSurface(surface),
      `CANONICAL_MANAGED_SURFACES entry "${surface}" is not recognized by isManagedCompanyOsSurface — the flat list is out of sync with MANAGED_SURFACE_PATTERNS`,
    );
  }
  assert.ok(CANONICAL_MANAGED_SURFACES.includes("runtime-dispatcher-v1.2/worker-spawn"));
  assert.ok(CANONICAL_MANAGED_SURFACES.includes("codex-controller/decision"));
  assert.ok(CANONICAL_MANAGED_SURFACES.includes("codex-controller/llm-spawn"));
  assert.ok(CANONICAL_MANAGED_SURFACES.includes("aionui-hermes/command-layer"));
  assert.ok(CANONICAL_MANAGED_SURFACES.includes("goal-runtime/worker-run"));
  assert.ok(CANONICAL_MANAGED_SURFACES.includes("scheduler/worker-run"));
});
