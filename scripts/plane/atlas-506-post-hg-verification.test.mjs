import assert from "node:assert/strict";
import test from "node:test";

import {
  buildVerificationResult,
  parseArgs,
  verifyDescriptions,
  verifySplitChildren,
} from "./atlas-506-post-hg-verification.mjs";
import { EXPECTED as SPLIT_EXPECTED } from "./atlas-576-split-materialization-apply.mjs";
import { canonicalDescriptionHash } from "../orchestration/plane-html.mjs";

test("parseArgs requires explicit verification targets", () => {
  const args = parseArgs(["--ref", "[WORK_ITEM_ID]", "--verify-split-children", "--json"]);

  assert.deepEqual(args.refs, ["[WORK_ITEM_ID]"]);
  assert.equal(args.verifySplitChildren, true);
  assert.equal(args.json, true);
});

test("verifyDescriptions passes only when hashes match and source validated", () => {
  const expectedRows = [{
    ref: "[WORK_ITEM_ID]",
    work_item_id: "wi-1",
    expected_hash: canonicalDescriptionHash("same"),
    source_validation_ok: true,
    source_reason_codes: [],
  }];
  const workItemsById = new Map([["wi-1", "same"]]);

  const checks = verifyDescriptions({ expectedRows, workItemsById });

  assert.equal(checks[0].ok, true);
  assert.equal(checks[0].status, "patched");
});

test("verifyDescriptions reports missing or stale descriptions", () => {
  const expectedRows = [{
    ref: "[WORK_ITEM_ID]",
    work_item_id: "wi-1",
    expected_hash: "next",
    source_validation_ok: true,
    source_reason_codes: [],
  }];

  const missing = verifyDescriptions({ expectedRows, workItemsById: new Map() });
  const stale = verifyDescriptions({ expectedRows, workItemsById: new Map([["wi-1", "old"]]) });

  assert.equal(missing[0].ok, false);
  assert.equal(missing[0].status, "missing");
  assert.equal(stale[0].ok, false);
  assert.equal(stale[0].status, "hash_mismatch");
});

test("verifySplitChildren requires existing child, parent and role label", () => {
  const splitPlan = {
    planned: SPLIT_EXPECTED.externalIds.map((externalId, index) => ({
      payload: {
        external_id: externalId,
        labels: [index === 0 ? "role-cto-id" : "role-cpo-id"],
      },
    })),
  };
  const rows = [{
    id: "child-1",
    sequence_id: "[WORK_ITEM_ID]",
    external_source: SPLIT_EXPECTED.externalSource,
    external_id: SPLIT_EXPECTED.externalIds[0],
    parent: { id: SPLIT_EXPECTED.parentId },
    labels: [{ id: "role-cto-id" }],
  }];

  const checks = verifySplitChildren({ splitPlan, existingRows: rows });

  assert.equal(checks[0].ok, true);
  assert.equal(checks[0].sequence_id, "[WORK_ITEM_ID]");
  assert.equal(checks[1].ok, false);
  assert.equal(checks[1].status, "missing");
});

test("buildVerificationResult fails closed on any failed check", () => {
  const result = buildVerificationResult({
    descriptionChecks: [{ ref: "[WORK_ITEM_ID]", ok: false }],
    splitChecks: [{ external_id: SPLIT_EXPECTED.externalIds[0], ok: true }],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.failed_description_refs, ["[WORK_ITEM_ID]"]);
  assert.equal(result.hard_boundaries.includes("no_plane_write"), true);
});
