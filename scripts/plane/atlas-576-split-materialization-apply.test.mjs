import assert from "node:assert/strict";
import test from "node:test";

import {
  EXPECTED,
  buildCreatePlan,
  createMissingItems,
  parseArgs,
  validateArgs,
} from "./atlas-576-split-materialization-apply.mjs";

function splitPlan(overrides = {}) {
  return {
    ok: true,
    project_id: EXPECTED.projectId,
    parent_id: EXPECTED.parentId,
    external_source: EXPECTED.externalSource,
    planned: EXPECTED.externalIds.map((externalId, index) => ({
      slug: index === 0 ? "g6" : "g7",
      ref_hint: index === 0 ? "[WORK_ITEM_ID]" : "[WORK_ITEM_ID]",
      validation_ok: true,
      payload_is_authoritative: true,
      payload: {
        name: index === 0 ? "G6" : "G7",
        description_html: "<pre><code>contract</code></pre>",
        labels: [index === 0 ? "role-cto-id" : "role-cpo-id"],
        parent: EXPECTED.parentId,
        priority: "medium",
        external_source: EXPECTED.externalSource,
        external_id: externalId,
      },
    })),
    ...overrides,
  };
}

function args(overrides = {}) {
  return {
    workspace: EXPECTED.workspace,
    projectId: EXPECTED.projectId,
    parentId: EXPECTED.parentId,
    planFile: "plan.json",
    baseUrl: "https://api.plane.so",
    auth: "app-token",
    apply: false,
    confirmHumanGate: false,
    ...overrides,
  };
}

test("parseArgs defaults to dry-run and canonical target", () => {
  const parsed = parseArgs(["--json"]);

  assert.equal(parsed.apply, false);
  assert.equal(parsed.projectId, EXPECTED.projectId);
  assert.equal(parsed.parentId, EXPECTED.parentId);
  assert.match(parsed.planFile, /[WORK_ITEM_ID]-materialization-plan/);
});

test("validateArgs requires confirm-human-gate for apply", () => {
  assert.deepEqual(validateArgs(args({ apply: true })), ["--apply requires --confirm-human-gate"]);
  assert.deepEqual(validateArgs(args({ apply: true, confirmHumanGate: true })), []);
});

test("buildCreatePlan validates expected split payloads and skips existing items", () => {
  const result = buildCreatePlan({
    splitPlan: splitPlan(),
    args: args(),
    existingRows: [{
      id: "existing-id",
      sequence_id: "[WORK_ITEM_ID]",
      name: "G6",
      external_source: EXPECTED.externalSource,
      external_id: EXPECTED.externalIds[0],
    }],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.skipped_existing, [EXPECTED.externalIds[0]]);
  assert.deepEqual(result.to_create, [EXPECTED.externalIds[1]]);
  assert.equal(result.planned[0].action, "skip-existing");
  assert.equal(result.planned[1].action, "create");
  assert.equal(result.hard_boundaries.includes("no_update_existing"), true);
});

test("buildCreatePlan rejects parent drift before write planning", () => {
  const bad = splitPlan();
  bad.planned[0].payload.parent = "wrong-parent";

  const result = buildCreatePlan({
    splitPlan: bad,
    args: args(),
    existingRows: [],
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /payload.parent/);
});

test("createMissingItems posts only create-action payloads", async () => {
  const result = buildCreatePlan({
    splitPlan: splitPlan(),
    args: args(),
    existingRows: [{
      id: "existing-id",
      external_source: EXPECTED.externalSource,
      external_id: EXPECTED.externalIds[0],
    }],
  });
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 201,
      async text() {
        return JSON.stringify({ id: "new-id", sequence_id: "[WORK_ITEM_ID]", name: "G7", external_source: EXPECTED.externalSource, external_id: EXPECTED.externalIds[1] });
      },
    };
  };

  const writes = await createMissingItems({
    args: args(),
    authHeaders: { Authorization: "Bearer test" },
    plan: result,
    fetchImpl,
  });

  assert.equal(writes.ok, true);
  assert.equal(writes.created.length, 1);
  assert.equal(calls.length, 1);
  assert.match(calls[0].init.body, /g7-copy-claim-founder-record/);
});
