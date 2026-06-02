import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_SESSION_CONTINUITY_REGISTRY_PATH,
  SESSION_CONTINUITY_REASONS,
  classifySessionContinuity,
  loadSessionContinuityRegistry,
  routeSessionContinuity,
} from "./session-continuity-router.mjs";

const loaded = loadSessionContinuityRegistry(DEFAULT_SESSION_CONTINUITY_REGISTRY_PATH);

test("loadSessionContinuityRegistry validates the canonical registry", () => {
  assert.equal(loaded.ok, true, JSON.stringify(loaded.reason_codes));
  assert.equal(loaded.registry.version, "session-continuity-router/v0");
  assert.equal(Object.keys(loaded.registry.routes).length, 5);
});

test("classifySessionContinuity defaults bounded audits to fresh task", () => {
  const result = classifySessionContinuity({
    message: "Run a one-off security audit and release gate.",
  });
  assert.equal(result.route_class, "SC0-fresh-task");
});

test("routeSessionContinuity allows same-item resume only with stored session proof", () => {
  const result = routeSessionContinuity({
    registry: loaded.registry,
    message: "Resume after the worker timed out.",
    fields: {
      same_item: "true",
      session_id: "claude-session-1",
      prior_outcome: "TIMEOUT",
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.route_class, "SC1-same-item-resume");
  assert.equal(result.route_receipt.reuse_allowed, true);
  assert.equal(result.route_receipt.session_policy, "same-item-resume");
});

test("routeSessionContinuity routes book and brand work to workstream continuity", () => {
  const result = routeSessionContinuity({
    registry: loaded.registry,
    message: "Continue the book drafting workstream with the same CEO session and long context.",
  });
  assert.equal(result.ok, true);
  assert.equal(result.route_class, "SC2-workstream-continuity");
  assert.equal(result.route_receipt.reuse_allowed, true);
  assert.equal(result.route_receipt.human_gate, "HG-2.5");
});

test("routeSessionContinuity routes linked CEO and worker sessions to session group", () => {
  const result = routeSessionContinuity({
    registry: loaded.registry,
    message: "Keep the EVE CEO and C-Level worker sessions linked and resume together.",
  });
  assert.equal(result.ok, true);
  assert.equal(result.route_class, "SC3-session-group");
  assert.equal(result.route_receipt.session_group_allowed, true);
  assert.equal(result.route_receipt.human_gate, "HG-3");
});

test("routeSessionContinuity blocks continuity for HG-4 and production surfaces", () => {
  const result = routeSessionContinuity({
    registry: loaded.registry,
    message: "Keep this session open for a production write and legal commitment.",
    fields: { human_gate: "HG-4" },
  });
  assert.equal(result.ok, false);
  assert.equal(result.route_class, "SC4-continuity-blocked");
  assert.deepEqual(result.reason_codes, [SESSION_CONTINUITY_REASONS.REUSE_BLOCKED]);
  assert.equal(result.route_receipt.reuse_allowed, false);
});

test("explicit session class override wins when known", () => {
  const result = routeSessionContinuity({
    registry: loaded.registry,
    explicitClass: "SC2-workstream-continuity",
    message: "short item",
  });
  assert.equal(result.ok, true);
  assert.equal(result.route_class, "SC2-workstream-continuity");
  assert.equal(result.classification.reason, "explicit-class");
});

test("unknown explicit session class rejects deterministically", () => {
  const result = routeSessionContinuity({
    registry: loaded.registry,
    explicitClass: "SC9-magic",
    message: "short item",
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.reason_codes, [SESSION_CONTINUITY_REASONS.CLASS_UNKNOWN]);
});
