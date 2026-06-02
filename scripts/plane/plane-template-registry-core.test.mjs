import assert from "node:assert/strict";
import test from "node:test";

import {
  collectPlaceholders,
  findTemplateById,
  listTemplates,
  parseVarAssignment,
  renderTemplate,
  validateTemplateRegistry,
} from "./plane-template-registry-core.mjs";
import registry from "../../registries/plane-templates/company-os.json" with { type: "json" };

test("canonical Plane template registry validates", () => {
  const result = validateTemplateRegistry(registry);
  assert.deepEqual(result, { ok: true, errors: [] });
});

test("template ids are unique and surfaces are listable", () => {
  const all = listTemplates(registry);
  assert.equal(all.length, registry.templates.length);
  assert.equal(new Set(all.map((row) => row.id)).size, all.length);
  assert.ok(listTemplates(registry, { surface: "work_item" }).length >= 4);
  assert.ok(listTemplates(registry, { surface: "page" }).some((row) => row.id === "page.founder-daily-queue"));
});

test("founder review template is HG-4, not legacy HG-3", () => {
  assert.equal(findTemplateById(registry, "work-item.hg3-founder-review"), null);
  const template = findTemplateById(registry, "work-item.hg4-founder-review");
  assert.ok(template);
  const rendered = renderTemplate(template);
  assert.match(rendered.body_markdown, /human_gate: HG-4/);
  assert.doesNotMatch(rendered.body_markdown, /human_gate: HG-3\b/);
});

test("renderTemplate fills defaults and variable overrides", () => {
  const template = findTemplateById(registry, "work-item.clevel-worker-contract");
  const rendered = renderTemplate(template, {
    TITLE: "Bounded Parser Fix",
    ROLE_LABEL: "role:cto",
    SOURCE_OF_TRUTH: "- docs/orchestration/spec-to-worker-pipeline.md",
  });
  assert.match(rendered.body_markdown, /Bounded Parser Fix/);
  assert.match(rendered.body_markdown, /role: role:cto/);
  assert.match(rendered.body_markdown, /docs\/orchestration\/spec-to-worker-pipeline\.md/);
  assert.deepEqual(rendered.default_labels, ["role:cto"]);
});

test("renderTemplate fails closed when a placeholder has no default", () => {
  assert.throws(
    () => renderTemplate({
      id: "bad",
      plane_surface: "work_item",
      name: "Bad",
      description: "Bad",
      default_labels: [],
      variables: {},
      body_markdown: "${MISSING}",
    }),
    /Missing template variables: MISSING/,
  );
});

test("validateTemplateRegistry catches duplicate ids and unknown surfaces", () => {
  const result = validateTemplateRegistry({
    version: "plane-template-registry/v0",
    templates: [
      { id: "same", plane_surface: "work_item", name: "One", description: "One", default_labels: [], variables: {}, body_markdown: "one" },
      { id: "same", plane_surface: "dashboard", name: "Two", description: "Two", default_labels: [], variables: {}, body_markdown: "two" },
    ],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((line) => line.includes("duplicate")));
  assert.ok(result.errors.some((line) => line.includes("plane_surface")));
});

test("collectPlaceholders and parseVarAssignment are deterministic", () => {
  assert.deepEqual(collectPlaceholders("${B} ${A} ${B}"), ["A", "B"]);
  assert.deepEqual(parseVarAssignment("TITLE=Hello=World"), ["TITLE", "Hello=World"]);
  assert.throws(() => parseVarAssignment("TITLE"), /Invalid --var/);
});
