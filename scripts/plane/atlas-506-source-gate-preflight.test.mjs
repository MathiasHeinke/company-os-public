import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  evaluateContracts,
  extractList,
  parseArgs,
} from "./atlas-506-source-gate-preflight.mjs";

test("parseArgs reads contract and split-plan inputs", () => {
  const args = parseArgs(["--contract-file", "a.md", "--split-plan-file", "plan.json", "--json"]);

  assert.deepEqual(args.contractFiles, ["a.md"]);
  assert.equal(args.splitPlanFile, "plan.json");
  assert.equal(args.json, true);
});

test("extractList reads flat yaml arrays", () => {
  const yaml = `source_of_truth:\n  - /a\n  - /b\ngates:\n  - test -f /c\nhuman_gate: HG-2`;

  assert.deepEqual(extractList(yaml, "source_of_truth"), ["/a", "/b"]);
  assert.deepEqual(extractList(yaml, "gates"), ["test -f /c"]);
});

test("evaluateContracts fails closed on missing sources and gates", () => {
  const dir = mkdtempSync(join(tmpdir(), "atlas-source-gate-"));
  const present = join(dir, "present.md");
  const missing = join(dir, "missing.md");
  const gateMissing = join(dir, "gate-missing.ts");
  writeFileSync(present, "ok");
  const contract = join(dir, "contract.md");
  writeFileSync(contract, [
    "# Contract",
    "",
    "```yaml",
    "source_of_truth:",
    `  - ${present}`,
    `  - ${missing}`,
    "gates:",
    `  - test -f ${gateMissing}`,
    "  - git status --short",
    "human_gate: HG-2",
    "```",
    "",
  ].join("\n"));

  const result = evaluateContracts([contract]);

  assert.equal(result.ok, false);
  assert.equal(result.failed.length, 2);
  assert.equal(result.failed.some((row) => row.target === missing), true);
  assert.equal(result.failed.some((row) => row.target === gateMissing), true);
  assert.equal(result.hard_boundaries.includes("no_worker_spawn"), true);
});
