import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateDecisionText,
  parseDecisionText,
  validateDecision,
} from "./atlas-506-hg-decision-intake.mjs";

test("parseDecisionText reads narrow approval blocks", () => {
  const parsed = parseDecisionText(`
decisions:
  - APPROVE_DESCRIPTION_PATCH_QUEUE
  - APPROVE_ATLAS_576_SPLIT_MATERIALIZATION
description_patch_items:
  - [WORK_ITEM_ID]
materialize_atlas_576_split: true
`);

  assert.deepEqual(parsed.decisions, [
    "APPROVE_DESCRIPTION_PATCH_QUEUE",
    "APPROVE_ATLAS_576_SPLIT_MATERIALIZATION",
  ]);
  assert.deepEqual(parsed.description_patch_items, ["[WORK_ITEM_ID]"]);
  assert.equal(parsed.materialize_atlas_576_split, true);
});

test("validateDecision rejects broad selectors and unknown items", () => {
  const verdict = validateDecision({
    decisions: ["APPROVE_DESCRIPTION_PATCH_QUEUE"],
    description_patch_items: ["all", "[WORK_ITEM_ID]"],
    already_parseable_items: [],
    materialize_atlas_576_split: false,
    notes: [],
  });

  assert.equal(verdict.ok, false);
  assert.match(verdict.errors.join("\n"), /broad selector/);
  assert.match(verdict.errors.join("\n"), /[WORK_ITEM_ID]/);
});

test("evaluateDecisionText emits exact allowed commands for minimal batch", () => {
  const result = evaluateDecisionText(`
decisions:
  - APPROVE_DESCRIPTION_PATCH_QUEUE
  - APPROVE_ATLAS_576_SPLIT_MATERIALIZATION
description_patch_items:
  - [WORK_ITEM_ID]
materialize_atlas_576_split: true
`);

  assert.equal(result.ok, true);
  assert.equal(result.allowed_commands.length, 3);
  assert.match(result.allowed_commands[0].command, /atlas-description-patch-queue\.mjs/);
  assert.match(result.allowed_commands[0].command, /--ref [WORK_ITEM_ID]/);
  assert.match(result.allowed_commands[0].command, /--confirm-human-gate/);
  assert.match(result.allowed_commands[1].command, /scheduler-stage-0506\.mjs/);
  assert.match(result.allowed_commands[1].command, /--sequence [WORK_ITEM_ID]/);
  assert.match(result.allowed_commands[2].command, /atlas-576-split-materialization-plan\.mjs/);
  assert.equal(result.hard_boundaries.includes("no_command_execution"), true);
});

test("evaluateDecisionText requires matching decision code for already parseable items", () => {
  const result = evaluateDecisionText(`
already_parseable_items:
  - [WORK_ITEM_ID]
`);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /APPROVE_ALREADY_PARSEABLE_REPORT_ONLY_ITEMS/);
  assert.deepEqual(result.allowed_commands, []);
});
