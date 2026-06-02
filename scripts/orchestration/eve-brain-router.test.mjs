import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_EVE_BRAIN_REGISTRY_PATH,
  EVE_BRAIN_REASONS,
  classifyEveBrainRequest,
  loadEveBrainRegistry,
  routeEveBrain,
} from "./eve-brain-router.mjs";

const loaded = loadEveBrainRegistry(DEFAULT_EVE_BRAIN_REGISTRY_PATH);

test("loadEveBrainRegistry validates the canonical registry", () => {
  assert.equal(loaded.ok, true, JSON.stringify(loaded.reason_codes));
  assert.equal(loaded.registry.version, "eve-brain-router/v0");
  assert.equal(Object.keys(loaded.registry.routes).length, 5);
});

test("classifyEveBrainRequest routes cheap triage to B0", () => {
  const result = classifyEveBrainRequest({
    message: "Classify this short request and ask one next question.",
  });
  assert.equal(result.route_class, "B0-intake-scout");
});

test("routeEveBrain routes normal onboarding to daily brain", () => {
  const result = routeEveBrain({
    registry: loaded.registry,
    message: "Help with first-run onboarding and the next setup step.",
  });
  assert.equal(result.ok, true);
  assert.equal(result.route_class, "B1-daily-brain");
  assert.equal(result.route_receipt.selected_alias, "daily-brain");
});

test("routeEveBrain routes large context work to long-context challenger", () => {
  const result = routeEveBrain({
    registry: loaded.registry,
    message: "Review this source bundle and find contradictions.",
    fields: { context_tokens: "450000" },
  });
  assert.equal(result.ok, true);
  assert.equal(result.route_class, "B2-long-context-challenger");
  assert.equal(result.route_receipt.selected_alias, "long-context-challenger");
});

test("routeEveBrain routes founder intent and orchestration to superbrain", () => {
  const result = routeEveBrain({
    registry: loaded.registry,
    message: "Translate founder intent into CEO delegation and C-Level worker routing for Command EVE.",
  });
  assert.equal(result.ok, true);
  assert.equal(result.route_class, "B3-superbrain");
  assert.equal(result.route_receipt.selected_alias, "superbrain-primary");
  assert.equal(result.route_receipt.autonomous_model_selection, true);
  assert.equal(result.route_receipt.autonomous_decision_authority, false);
});

test("routeEveBrain blocks HG-4 founder veto work", () => {
  const result = routeEveBrain({
    registry: loaded.registry,
    message: "Make an irreversible legal commitment and pricing promise for a customer.",
    fields: { human_gate: "HG-4" },
  });
  assert.equal(result.ok, false);
  assert.equal(result.route_class, "B4-founder-veto");
  assert.deepEqual(result.reason_codes, [EVE_BRAIN_REASONS.AUTONOMY_BLOCKED]);
  assert.equal(result.route_receipt.human_gate, "HG-4");
});

test("explicit brain class override wins when known", () => {
  const result = routeEveBrain({
    registry: loaded.registry,
    explicitClass: "B3-superbrain",
    message: "short text",
  });
  assert.equal(result.ok, true);
  assert.equal(result.route_class, "B3-superbrain");
  assert.equal(result.classification.reason, "explicit-class");
});

test("unknown explicit brain class rejects deterministically", () => {
  const result = routeEveBrain({
    registry: loaded.registry,
    explicitClass: "B9-magic",
    message: "short text",
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.reason_codes, [EVE_BRAIN_REASONS.CLASS_UNKNOWN]);
});
