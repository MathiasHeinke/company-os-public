import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  LABEL_MAP_VERSION,
  loadLabelMap,
  resolveLabelsViaMap,
} from "./plane-label-map-resolver.mjs";

function writeFixture(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "company-os-label-map-"));
  const file = path.join(dir, "map.json");
  fs.writeFileSync(file, typeof content === "string" ? content : JSON.stringify(content), "utf8");
  return file;
}

const VALID_MAP = {
  version: LABEL_MAP_VERSION,
  workspace: "companyos",
  project_id: "11111111-1111-1111-1111-111111111111",
  generated_at: "2026-05-08T20:00:00.000Z",
  labels: [
    { id: "aaaa-cto", name: "role:cto" },
    { id: "bbbb-cpo", name: "role:cpo" },
    { id: "cccc-cao", name: "role:cao" },
  ],
};

test("loadLabelMap returns runtime.label-map-missing when path is empty", () => {
  const result = loadLabelMap("");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "runtime.label-map-missing");
});

test("loadLabelMap returns runtime.label-map-missing when file does not exist", () => {
  const result = loadLabelMap("/tmp/definitely-does-not-exist-2026-05-08-xyz.json");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "runtime.label-map-missing");
});

test("loadLabelMap returns runtime.label-map-malformed for invalid JSON", () => {
  const file = writeFixture("not json");
  const result = loadLabelMap(file);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "runtime.label-map-malformed");
});

test("loadLabelMap rejects wrong version string", () => {
  const file = writeFixture({ ...VALID_MAP, version: "plane-label-map/v9999" });
  const result = loadLabelMap(file);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "runtime.label-map-malformed");
});

test("loadLabelMap rejects when labels array is missing", () => {
  const { labels: _omit, ...withoutLabels } = VALID_MAP;
  const file = writeFixture(withoutLabels);
  const result = loadLabelMap(file);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "runtime.label-map-malformed");
});

test("loadLabelMap rejects label entries missing id or name", () => {
  const file = writeFixture({ ...VALID_MAP, labels: [{ id: "x" }] });
  const result = loadLabelMap(file);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "runtime.label-map-malformed");
});

test("loadLabelMap accepts a valid map", () => {
  const file = writeFixture(VALID_MAP);
  const result = loadLabelMap(file);
  assert.equal(result.ok, true);
  assert.equal(result.map.workspace, "companyos");
  assert.equal(result.map.labels.length, 3);
});

test("resolveLabelsViaMap rejects on workspace mismatch", () => {
  const result = resolveLabelsViaMap({
    map: VALID_MAP,
    workspace: "other-workspace",
    projectId: VALID_MAP.project_id,
    labelIds: ["aaaa-cto"],
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "runtime.label-map-mismatch");
});

test("resolveLabelsViaMap rejects on project mismatch", () => {
  const result = resolveLabelsViaMap({
    map: VALID_MAP,
    workspace: VALID_MAP.workspace,
    projectId: "00000000-0000-0000-0000-000000000000",
    labelIds: ["aaaa-cto"],
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "runtime.label-map-mismatch");
});

test("resolveLabelsViaMap rejects on incomplete map (id not present)", () => {
  const result = resolveLabelsViaMap({
    map: VALID_MAP,
    workspace: VALID_MAP.workspace,
    projectId: VALID_MAP.project_id,
    labelIds: ["aaaa-cto", "missing-id"],
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "runtime.label-map-incomplete");
  assert.equal(result.missing_id, "missing-id");
});

test("resolveLabelsViaMap returns names when all ids resolve", () => {
  const result = resolveLabelsViaMap({
    map: VALID_MAP,
    workspace: VALID_MAP.workspace,
    projectId: VALID_MAP.project_id,
    labelIds: ["bbbb-cpo", "aaaa-cto"],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.names, ["role:cpo", "role:cto"]);
});

test("resolveLabelsViaMap returns empty names when item has no labels", () => {
  const result = resolveLabelsViaMap({
    map: VALID_MAP,
    workspace: VALID_MAP.workspace,
    projectId: VALID_MAP.project_id,
    labelIds: [],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.names, []);
});
