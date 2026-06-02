import assert from "node:assert/strict";
import test from "node:test";

import { validateAgentEventRow } from "./agent-event-core.mjs";

function baseEvent(overrides = {}) {
  return {
    schema_version: "agent-event/v1",
    event_id: "evt-test",
    event_type: "human_gate.released",
    occurred_at: "2026-05-08T10:00:00.000Z",
    producer: "controller",
    workspace: "registry:company-os",
    workspace_path: "[LOCAL_WORKSPACE]",
    issue_id: "[WORK_ITEM_ID]",
    run_id: "run-1",
    session_id: "session-1",
    agent: "codex",
    mode: "release-gate",
    role_owner: "CEO",
    department: "Operations",
    autonomy_level: "L2",
    event_policy: "issue-state-from-agent-events",
    payload: {
      gate_owner: "Codex-GPT-5.5-xhigh",
      released_by: "Codex-GPT-5.5-xhigh",
      level: "HG-2",
      founder_prediction_confidence: 0.88,
      blocked_actions_still_forbidden: ["merge", "deploy"],
      release_validation: {
        schema_version: "human-gate-release/v1",
        status: "pass",
        blocker_count: 0,
      },
    },
    artifact_paths: [],
    linear_comment_ids: [],
    human_gate_required: false,
    redaction_level: "internal",
    ...overrides,
  };
}

test("validateAgentEventRow accepts HG-1/HG-2/HG-2.5 releases only with passing validation metadata", () => {
  const result = validateAgentEventRow(baseEvent());

  assert.equal(result.valid, true, result.errors.join("\n"));
});

test("validateAgentEventRow accepts high-confidence HG-2.5 release events", () => {
  const result = validateAgentEventRow(baseEvent({
    payload: {
      ...baseEvent().payload,
      level: "HG-2.5",
      founder_prediction_confidence: 0.93,
    },
  }));

  assert.equal(result.valid, true, result.errors.join("\n"));
});

test("validateAgentEventRow blocks low-confidence or unvalidated HG-2 releases", () => {
  const lowConfidence = validateAgentEventRow(baseEvent({
    payload: {
      ...baseEvent().payload,
      founder_prediction_confidence: 0.84,
    },
  }));
  assert.equal(lowConfidence.valid, false);
  assert.ok(lowConfidence.errors.some((error) => error.includes(">= 0.85")));

  const missingValidation = validateAgentEventRow(baseEvent({
    payload: {
      ...baseEvent().payload,
      release_validation: undefined,
    },
  }));
  assert.equal(missingValidation.valid, false);
  assert.ok(missingValidation.errors.some((error) => error.includes("release_validation")));
});

test("validateAgentEventRow accepts evidenced HG-3 CEO/Codex release events", () => {
  const result = validateAgentEventRow(baseEvent({
    payload: {
      ...baseEvent().payload,
      level: "HG-3",
      founder_prediction_confidence: 0.97,
      released_by: "Codex-GPT-5.5-xhigh",
    },
  }));

  assert.equal(result.valid, true, result.errors.join("\n"));
});

test("validateAgentEventRow routes HG-3.5 to Chief-of-Staff and HG-4 to Founder", () => {
  // Source of truth: docs/governance/human-gate-levels.md. HG-3.5 is
  // Chief-of-Staff / founder-proxy review; HG-4 is the real founder
  // boundary.
  const autonomous = validateAgentEventRow(baseEvent({
    payload: {
      ...baseEvent().payload,
      level: "HG-3.5",
      founder_prediction_confidence: 1,
      released_by: "Codex-GPT-5.5-xhigh",
    },
  }));
  assert.equal(autonomous.valid, false);
  assert.ok(autonomous.errors.some((error) => error.includes("HG-3.5")));

  const chiefOfStaffSigned = validateAgentEventRow(baseEvent({
    producer: "human",
    payload: {
      ...baseEvent().payload,
      level: "HG-3.5",
      founder_prediction_confidence: 1,
      released_by: "Chief-of-Staff",
      release_validation: undefined,
    },
  }));
  assert.equal(chiefOfStaffSigned.valid, true, chiefOfStaffSigned.errors.join("\n"));

  const hg4Autonomous = validateAgentEventRow(baseEvent({
    payload: {
      ...baseEvent().payload,
      level: "HG-4",
      founder_prediction_confidence: 1,
      released_by: "Codex-GPT-5.5-xhigh",
      release_validation: undefined,
    },
  }));
  assert.equal(hg4Autonomous.valid, false);
  assert.ok(hg4Autonomous.errors.some((error) => error.includes("HG-4")));
});
