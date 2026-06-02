import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_COCKPIT_CYCLES,
  DEFAULT_COCKPIT_MODULES,
  DEFAULT_COCKPIT_PAGES,
  buildProjectOverviewHtml,
  inferOwnerId,
  planCockpitBootstrap,
} from "./plane-cockpit-bootstrap-core.mjs";

test("planCockpitBootstrap creates all cockpit surfaces when absent", () => {
  const plan = planCockpitBootstrap({
    project: { description_html: "<p>demo</p>" },
    modules: [],
    cycles: [],
    pages: [],
    ownerId: "owner-1",
    projectId: "project-1",
  });

  assert.equal(plan.summary.create_modules, DEFAULT_COCKPIT_MODULES.length);
  assert.equal(plan.summary.create_cycles, DEFAULT_COCKPIT_CYCLES.length);
  assert.equal(plan.summary.create_pages, DEFAULT_COCKPIT_PAGES.length);
  assert.equal(plan.summary.update_project_overview, true);
  assert.equal(plan.cycles[0].payload.owned_by, "owner-1");
  assert.equal(plan.cycles[0].payload.project_id, "project-1");
});

test("planCockpitBootstrap is idempotent by Plane name", () => {
  const plan = planCockpitBootstrap({
    project: { description_html: buildProjectOverviewHtml() },
    modules: DEFAULT_COCKPIT_MODULES.map((module, index) => ({ ...module, id: `m-${index}` })),
    cycles: DEFAULT_COCKPIT_CYCLES.map((cycle, index) => ({ ...cycle, id: `c-${index}` })),
    pages: DEFAULT_COCKPIT_PAGES.map((page, index) => ({ ...page, id: `p-${index}` })),
    ownerId: "owner-1",
  });

  assert.equal(plan.summary.create_modules, 0);
  assert.equal(plan.summary.create_cycles, 0);
  assert.equal(plan.summary.create_pages, 0);
  assert.equal(plan.summary.update_project_overview, false);
  assert.equal(plan.modules[0].action, "present");
});

test("inferOwnerId prefers project lead then creator then existing cycle owner", () => {
  assert.equal(inferOwnerId({ project: { project_lead: "lead", created_by: "creator" }, cycles: [] }), "lead");
  assert.equal(inferOwnerId({ project: { created_by: "creator" }, cycles: [{ owned_by: "cycle-owner" }] }), "creator");
  assert.equal(inferOwnerId({ project: {}, cycles: [{ owned_by: "cycle-owner" }] }), "cycle-owner");
});

test("DEFAULT_COCKPIT_MODULES descriptions contain no private-domain literals", () => {
  const sourceCompanyTokenPrefix = ["ares", "hermes"].join("-");
  const privateDomainPattern = new RegExp(
    [
      String.raw`\b${["bio-os", "io"].join(String.raw`\.`)}\b`,
      String.raw`\b${["ares", "bio", "os"].join("-")}\b`,
      String.raw`\b${sourceCompanyTokenPrefix}\b`,
      String.raw`\b${["dash", "bio-os"].join(String.raw`\.`)}\b`,
      String.raw`\b${["app", "bio-os"].join(String.raw`\.`)}\b`,
      String.raw`\b${["api", "bio-os"].join(String.raw`\.`)}\b`,
    ].join("|"),
  );
  for (const mod of DEFAULT_COCKPIT_MODULES) {
    const desc = mod.description ?? "";
    assert.ok(
      !privateDomainPattern.test(desc),
      `Module "${mod.name}" description leaks private domain: ${desc}`,
    );
  }
});
