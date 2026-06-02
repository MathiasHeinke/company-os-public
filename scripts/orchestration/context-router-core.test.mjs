import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyDomains,
  scoreDomain,
  selectContextSlice,
  routeSession,
} from "./context-router-core.mjs";

const REGISTRY = [
  { id: "health", label: "Gesundheit", keywords: ["training", "peptide", "sleep", "workout"], status: "active" },
  { id: "coding", label: "Coding", keywords: ["bug", "deploy", "refactor", "test"], status: "active" },
  { id: "finance", label: "Finanzen", keywords: ["invoice", "revenue", "spend", "budget"], status: "active" },
  { id: "legacy", label: "Old", keywords: ["whatever"], status: "archived" },
];

test("classifyDomains picks the clear domain with high confidence", () => {
  const r = classifyDomains("Wie viel training und peptide verträgt mein workout", REGISTRY);
  assert.equal(r.top, "health");
  assert.ok(r.confidence > 0.6, `confidence ${r.confidence}`);
  assert.equal(r.ambiguous, false);
});

test("classifyDomains flags ambiguity when two domains tie", () => {
  const r = classifyDomains("training bug", REGISTRY);
  assert.equal(r.ambiguous, true);
});

test("classifyDomains returns no match for unrelated opener", () => {
  const r = classifyDomains("hallo wie geht es dir heute", REGISTRY);
  assert.equal(r.top, null);
  assert.equal(r.ambiguous, true);
});

test("archived domains are ignored", () => {
  const r = classifyDomains("whatever", REGISTRY);
  assert.equal(r.top, null);
});

test("scoreDomain weights label match higher than keyword", () => {
  assert.ok(scoreDomain(["gesundheit"], REGISTRY[0]) >= 2);
  assert.equal(scoreDomain(["training"], REGISTRY[0]), 1);
});

test("selectContextSlice honors read scope and drops out-of-scope nodes", () => {
  const nodes = [
    { id: "n1", domains: ["health"], source: "honcho", created_at: "2026-05-01" },
    { id: "n2", domains: ["health"], source: "obsidian", created_at: "2026-05-02" },
    { id: "n3", domains: ["finance"], source: "honcho", created_at: "2026-05-03" },
  ];
  const out = selectContextSlice(["health"], nodes, { allowedReadScope: ["honcho"] });
  assert.deepEqual(out.slice, ["n1"]);
  assert.ok(out.dropped_out_of_scope.includes("n2"));
});

test("selectContextSlice truncates to maxNodes, most-recent first", () => {
  const nodes = Array.from({ length: 5 }, (_, i) => ({
    id: `n${i}`, domains: ["health"], source: "honcho", created_at: `2026-05-0${i + 1}`,
  }));
  const out = selectContextSlice(["health"], nodes, { maxNodes: 2 });
  assert.equal(out.truncated, true);
  assert.deepEqual(out.slice, ["n4", "n3"]);
});

test("routeSession loads slice on confident classification", () => {
  const nodes = [{ id: "h1", domains: ["health"], source: "honcho", created_at: "2026-05-05" }];
  const r = routeSession({ opener: "training peptide workout sleep", registry: REGISTRY, graphNodes: nodes });
  assert.equal(r.action, "load");
  assert.deepEqual(r.domains, ["health"]);
  assert.deepEqual(r.slice, ["h1"]);
});

test("routeSession disambiguates on no match and on ambiguity", () => {
  assert.equal(routeSession({ opener: "hallo", registry: REGISTRY }).action, "disambiguate");
  assert.equal(routeSession({ opener: "training bug", registry: REGISTRY }).reason, "context-router.ambiguous-domains");
});
