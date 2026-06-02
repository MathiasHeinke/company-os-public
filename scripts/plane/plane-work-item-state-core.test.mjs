import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWorkItemStatePatch,
  findStateByName,
  isDoneState,
  normalizeStateName,
  resolveTargetState,
  stateAlreadySet,
  validateStateChangeArgs,
} from "./plane-work-item-state-core.mjs";

const STATES = [
  { id: "state-backlog", name: "Backlog", group: "backlog" },
  { id: "state-done", name: "Done", group: "completed" },
];

test("normalizeStateName handles Plane display names", () => {
  assert.equal(normalizeStateName("In Progress"), "in-progress");
  assert.equal(normalizeStateName("state:ceo_review"), "state:ceo-review");
});

test("findStateByName resolves case-insensitive Plane states", () => {
  assert.equal(findStateByName(STATES, "done")?.id, "state-done");
  assert.equal(findStateByName(STATES, "Backlog")?.id, "state-backlog");
  assert.equal(findStateByName(STATES, "Missing"), null);
});

test("buildWorkItemStatePatch uses Plane's required state key, never state_id", () => {
  const patch = buildWorkItemStatePatch({ stateId: "state-done" });
  assert.deepEqual(patch, { state: "state-done" });
  assert.equal(Object.hasOwn(patch, "state_id"), false);
});

test("validateStateChangeArgs requires target, state and confirmation for live Done", () => {
  assert.deepEqual(validateStateChangeArgs({}), [
    "--workspace is required",
    "--project-id is required",
    "--work-item-id or --sequence-id is required",
    "--state or --state-id is required",
  ]);
  assert.deepEqual(validateStateChangeArgs({
    workspace: "companyos",
    projectId: "project",
    sequenceId: "70",
    state: "Done",
    dryRun: false,
  }), ["--confirm-done is required when setting --state Done"]);
  assert.deepEqual(validateStateChangeArgs({
    workspace: "companyos",
    projectId: "project",
    sequenceId: "70",
    state: "Done",
    dryRun: true,
  }), []);
});

test("resolveTargetState supports name and id paths", () => {
  assert.deepEqual(resolveTargetState({ states: STATES, state: "Done" }), {
    ok: true,
    state: STATES[1],
    reason: "",
  });
  assert.deepEqual(resolveTargetState({ states: STATES, stateId: "state-backlog" }), {
    ok: true,
    state: STATES[0],
    reason: "",
  });
  assert.equal(resolveTargetState({ states: STATES, state: "Nope" }).ok, false);
});

test("isDoneState detects name and completed group", () => {
  assert.equal(isDoneState({ name: "Done", group: "completed" }), true);
  assert.equal(isDoneState({ name: "Finished", group: "completed" }), true);
  assert.equal(isDoneState({ name: "Backlog", group: "backlog" }), false);
});

test("stateAlreadySet compares by state id or name", () => {
  assert.equal(stateAlreadySet({ item: { state: STATES[1] }, targetState: STATES[1] }), true);
  assert.equal(stateAlreadySet({ item: { state: "Done" }, targetState: STATES[1] }), true);
  assert.equal(stateAlreadySet({ item: { state: STATES[0] }, targetState: STATES[1] }), false);
});
