import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_INFERENCE_REGISTRY_PATH,
  INFERENCE_REASONS,
  classifyInferenceTask,
  loadInferenceRegistry,
  routeInference,
} from "./inference-router.mjs";

const loaded = loadInferenceRegistry(DEFAULT_INFERENCE_REGISTRY_PATH);

test("loadInferenceRegistry validates the canonical registry", () => {
  assert.equal(loaded.ok, true, JSON.stringify(loaded.reason_codes));
  assert.equal(loaded.registry.version, "inference-router/v0");
  assert.equal(Object.keys(loaded.registry.routes).length, 5);
});

test("classifyInferenceTask routes docs-only work to P0-doc-small", () => {
  const result = classifyInferenceTask({
    contractFields: {
      mode: "implement",
      scope: "docs/templates/worker-issue-contract.md",
      gates: "git diff --check",
    },
    workItem: { name: "Small docs contract wording" },
  });
  assert.equal(result.task_class, "P0-doc-small");
});

test("routeInference maps bounded code and tests to Sonnet with moderate turns", () => {
  const result = routeInference({
    registry: loaded.registry,
    contractFields: {
      mode: "implement",
      scope: "scripts/orchestration/inference-router.test.mjs",
      gates: "node --test scripts/orchestration/inference-router.test.mjs",
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.task_class, "P1-code-bounded");
  assert.equal(result.runtime.model, "claude-sonnet-4-6");
  assert.equal(result.runtime.max_turns, 75);
});

test("routeInference routes shared runtime surfaces to verified Opus alias with higher turns", () => {
  const result = routeInference({
    registry: loaded.registry,
    contractFields: {
      mode: "implement",
      scope: "scripts/orchestration/runtime-dispatcher-v1.mjs",
      gates: "node --test scripts/orchestration/runtime-dispatcher-v1.test.mjs",
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.task_class, "P2-code-shared");
  assert.equal(result.runtime.model, "opus");
  assert.equal(result.runtime.model_alias, "opus");
  assert.equal(result.runtime.max_turns, 120);
});

const FIXTURE_COMPANY_OS_ROOT = process.env.COMPANY_OS_ROOT || "/opt/company-os";
const FIXTURE_CLIENT_APP_ROOT = process.env.CLIENT_APP_ROOT || "/opt/client-app";

test("routeInference routes cross-workspace work to P3-cross-repo", () => {
  const result = routeInference({
    registry: loaded.registry,
    contractFields: {
      mode: "implement",
      scope: [
        "cross-workspace implementation touching the operating system and a client app",
        `${FIXTURE_COMPANY_OS_ROOT}/docs/orchestration/runtime-inference-router.md`,
        `${FIXTURE_CLIENT_APP_ROOT}/src/App.tsx`,
      ],
      gates: "pnpm build",
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.task_class, "P3-cross-repo");
  assert.equal(result.runtime.model, "opus");
  assert.equal(result.runtime.model_alias, "opus");
  assert.equal(result.runtime.max_turns, 180);
  assert.equal(result.split_policy.mode, "primary-worker-plus-sidecar-audit");
});

test("routeInference blocks HG-3/schema/auth production surfaces", () => {
  const result = routeInference({
    registry: loaded.registry,
    contractFields: {
      mode: "implement",
      human_gate: "HG-3",
      scope: "Supabase schema/RLS/auth migration against production",
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.task_class, "P4-high-risk");
  assert.deepEqual(result.reason_codes, [INFERENCE_REASONS.SPAWN_BLOCKED]);
  assert.equal(result.spawn_allowed, false);
});

test("routeInference does not treat BlockedActions as requested high-risk work", () => {
  const result = routeInference({
    registry: loaded.registry,
    contractFields: {
      mode: "implement",
      scope: "docs/orchestration/runtime-inference-router.md",
      blockedactions: "do not deploy, do not publish, do not touch production",
      gates: "git diff --check",
    },
  });
  assert.equal(result.ok, true);
  assert.notEqual(result.task_class, "P4-high-risk");
});

test("routeInference ignores negated safety gates when classifying high-risk surfaces", () => {
  const result = routeInference({
    registry: loaded.registry,
    contractFields: {
      mode: "plan",
      scope: "docs/orchestration/atlas-desktop-mvp-cto-department-runtime.md",
      acceptance_criteria: [
        "No deploy, schema, RLS, auth or service-role change is performed.",
        "Worker report documents that production writes remain blocked.",
      ],
      gates: [
        "git diff --check",
        "Do not deploy or public-publish; verify the blocked actions remain forbidden.",
      ],
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.task_class, "P0-doc-small");
});

test("routeInference does not treat --auth CLI flags as auth surface changes", () => {
  const result = routeInference({
    registry: loaded.registry,
    contractFields: {
      mode: "plan",
      scope: "docs/orchestration/atlas-desktop-mvp-cto-department-runtime.md",
      gates: [
        "node scripts/goal/goal.mjs run --parent [WORK_ITEM_ID] --dry-run --auth api-key --json",
      ],
    },
  });
  assert.equal(result.ok, true);
  assert.notEqual(result.task_class, "P4-high-risk");
});

test("explicit class override wins when it is known", () => {
  const result = routeInference({
    registry: loaded.registry,
    explicitClass: "P0-doc-small",
    contractFields: { scope: "scripts/orchestration/runtime-dispatcher-v1.mjs" },
  });
  assert.equal(result.ok, true);
  assert.equal(result.task_class, "P0-doc-small");
  assert.equal(result.classification.reason, "explicit-class");
});

test("InferenceClass auto uses classifier instead of explicit-class rejection", () => {
  const result = routeInference({
    registry: loaded.registry,
    contractFields: {
      inferenceclass: "auto",
      mode: "implement",
      scope: "scripts/orchestration/runtime-dispatcher-v1.mjs",
      gates: "node --test scripts/orchestration/runtime-dispatcher-v1.test.mjs",
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.task_class, "P2-code-shared");
  assert.equal(result.classification.reason, "shared-runtime-surface");
});

test("unknown explicit class rejects deterministically", () => {
  const result = routeInference({
    registry: loaded.registry,
    explicitClass: "P9-magic",
    contractFields: { scope: "docs/foo.md" },
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.reason_codes, [INFERENCE_REASONS.TASK_CLASS_UNKNOWN]);
});
