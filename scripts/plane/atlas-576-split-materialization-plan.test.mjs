import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildPlan,
  parseArgs,
  roleFromMarkdown,
  validateArgs,
} from "./atlas-576-split-materialization-plan.mjs";

function tempFile(name, content) {
  const dir = mkdtempSync(join(tmpdir(), "atlas-576-split-"));
  const file = join(dir, name);
  writeFileSync(file, content, "utf8");
  return file;
}

const CONTRACT = `
# Demo Split

\`\`\`yaml
role: role:cto
parent_seat: role:cao
agent: claude
mode: verify
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
source_of_truth:
  - ${LOCAL_WORKSPACE}
scope:
  - Include non-production verification only.
acceptance_criteria:
  - Produces a report with PASS/BLOCKED/REJECT.
gates:
  - git diff --check
human_gate: HG-2.5
reporting: ${LOCAL_WORKSPACE}
blocked_actions:
  - never write production data
target_class: report-only
\`\`\`
`;

test("parseArgs derives the default label-map path", () => {
  const args = parseArgs([
    "--project-id", "project-1",
    "--parent-id", "parent-1",
    "--json",
  ]);

  assert.equal(args.workspace, "companyos");
  assert.equal(args.projectId, "project-1");
  assert.equal(args.parentId, "parent-1");
  assert.equal(args.labelMap, "runtime/plane-label-map/companyos-project-1.json");
  assert.equal(args.json, true);
});

test("validateArgs requires project, parent and label map", () => {
  assert.deepEqual(validateArgs({
    workspace: "companyos",
    projectId: "",
    parentId: "",
    labelMap: "",
    externalSource: "atlas-576-split-materialization",
  }), [
    "--project-id is required",
    "--parent-id is required",
    "--label-map is required or derivable",
  ]);
});

test("roleFromMarkdown reads only flat role keys", () => {
  assert.equal(roleFromMarkdown(CONTRACT), "role:cto");
  assert.equal(roleFromMarkdown("worker:\n  role: role:cto"), "");
});

test("buildPlan emits dry-run payloads and create commands without applying", () => {
  const labelMap = tempFile("labels.json", JSON.stringify({
    workspace: "companyos",
    project_id: "project-1",
    labels: [{ name: "role:cto", id: "label-cto" }],
  }));
  const source = tempFile("contract.md", CONTRACT);
  const args = parseArgs([
    "--project-id", "project-1",
    "--parent-id", "parent-1",
    "--label-map", labelMap,
  ]);
  const result = buildPlan(args, [{
    slug: "g6",
    ref_hint: "[WORK_ITEM_ID]",
    source_markdown: source,
    role: "role:cto",
    external_id: "atlas-576-split:g6",
    gate: "HG-2.5",
  }]);

  assert.equal(result.ok, true);
  assert.equal(result.mode, "dry-run-plan-only");
  assert.equal(result.planned.length, 1);
  assert.equal(result.planned[0].label_id, "label-cto");
  assert.equal(result.planned[0].payload.parent, "parent-1");
  assert.equal(result.planned[0].payload.external_source, "atlas-576-split-materialization");
  assert.equal(result.planned[0].validation_ok, true);
  assert.match(result.planned[0].create_command_template, /plane-create-work-item\.mjs/);
  assert.match(result.planned[0].create_command_template, /--dry-run/);
  assert.equal(result.planned[0].payload_is_authoritative, true);
  assert.equal(result.hard_boundaries.includes("no_plane_write"), true);
});
