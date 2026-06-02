import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildDescriptionHtml,
  defaultLabelMapPath,
  markdownTitle,
  planContractMaterialization,
  resolvePortablePlaceholders,
} from "./plane-contract-materializer-core.mjs";
import { stripHtml } from "../orchestration/plane-html.mjs";

function writeFixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), "company-os-plane-materializer-"));
  const templateDir = join(root, "docs/templates");
  mkdirSync(templateDir, { recursive: true });
  writeFileSync(join(root, "labels.json"), JSON.stringify({
    version: "plane-label-map/v0",
    workspace: "companyos",
    project_id: "project-1",
    labels: [{ id: "label-cto", name: "role:cto" }],
  }), "utf8");
  writeFileSync(join(templateDir, "parent.md"), `
# Parent Contract

\`\`\`yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: plan
workspace: registry:company-os
dispatch: manual
source_of_truth:
  - docs/a.md
acceptance_criteria:
  - parent is planned
gates:
  - node --test scripts/plane/plane-contract-materializer-core.test.mjs
human_gate: HG-2.5
reporting: Plane worker.reported
\`\`\`
`, "utf8");
  return root;
}

test("defaultLabelMapPath resolves runtime label-map path", () => {
  assert.equal(
    defaultLabelMapPath({ root: "/repo", workspace: "companyos", projectId: "p1" }),
    "/repo/runtime/plane-label-map/companyos-p1.json",
  );
});

test("markdownTitle reads first H1", () => {
  assert.equal(markdownTitle("# Hello\n\nbody", "fallback"), "Hello");
  assert.equal(markdownTitle("body", "fallback"), "fallback");
});

test("buildDescriptionHtml roundtrips through Plane stripHtml", () => {
  const markdown = "# T\n\n```yaml\nrole: role:cto\n```\n";
  assert.match(stripHtml(buildDescriptionHtml(markdown)), /```yaml\nrole: role:cto\n```/);
});

test("resolvePortablePlaceholders materializes COMPANY_OS_ROOT for Plane runtime checks", () => {
  assert.equal(
    resolvePortablePlaceholders("${COMPANY_OS_ROOT}/reports/x.md", { root: "/repo/" }),
    "/repo/reports/x.md",
  );
});

test("planContractMaterialization validates templates and resolves role labels", () => {
  const root = writeFixtureRoot();
  const plan = planContractMaterialization({
    root,
    workspace: "companyos",
    projectId: "project-1",
    labelMapPath: join(root, "labels.json"),
    contractSet: [{ slug: "parent", file: "docs/templates/parent.md" }],
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.items.length, 1);
  assert.equal(plan.items[0].title, "Parent Contract");
  assert.equal(plan.items[0].role, "role:cto");
  assert.equal(plan.items[0].labelId, "label-cto");
  assert.deepEqual(plan.items[0].validation.unexpected, []);
  assert.match(stripHtml(plan.items[0].payload.description_html), /docs\/a\.md/);
});

test("planContractMaterialization rejects missing label ids", () => {
  const root = writeFixtureRoot();
  const emptyMap = join(root, "labels-empty.json");
  writeFileSync(emptyMap, JSON.stringify({
    version: "plane-label-map/v0",
    workspace: "companyos",
    project_id: "project-1",
    labels: [],
  }), "utf8");

  const bad = planContractMaterialization({
    root,
    workspace: "companyos",
    projectId: "project-1",
    labelMapPath: emptyMap,
    contractSet: [{ slug: "parent", file: "docs/templates/parent.md" }],
  });

  assert.equal(bad.ok, false);
  assert.match(bad.errors.join("\n"), /label id missing for role:cto/);
});
