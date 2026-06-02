import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalDescriptionHash,
  canonicalDescriptionText,
  decodeHtmlEntities,
  descriptionHashCandidates,
  legacyRawDescriptionHash,
  parseYamlScalar,
  stripHtml,
} from "./plane-html.mjs";

test("stripHtml decodes Plane TipTap entity encoded fenced contracts", () => {
  const html = [
    "<p>Intro</p>",
    "<pre><code>```yaml",
    "role: role:cto",
    "acceptance_criteria:",
    "  - &quot;quoted&quot; and &apos;single&apos; and &#39;apos&#39; and &#x27;hex&#x27;",
    "```</code></pre>",
  ].join("\n");

  const text = stripHtml(html);

  assert.match(text, /```yaml/);
  assert.match(text, /"quoted" and 'single' and 'apos' and 'hex'/);
});

test("stripHtml wraps raw Plane pre/code worker contracts in a yaml fence", () => {
  const html = [
    "<p>Intro</p>",
    "<pre><code class=\"language-yaml\">",
    "role: role:cto",
    "parent_seat: none",
    "agent: claude",
    "mode: implement",
    "workspace: registry:company-os",
    "dispatch: ready",
    "source_of_truth:",
    "  - docs/templates/worker-issue-contract.md",
    "acceptance_criteria:",
    "  - parser accepts raw code block",
    "gates:",
    "  - node --test scripts/orchestration/plane-html.test.mjs",
    "human_gate: HG-2.5",
    "reporting: reports/runs/test.md",
    "</code></pre>",
  ].join("\n");

  const text = stripHtml(html);

  assert.match(text, /```yaml\nrole: role:cto/);
  assert.match(text, /reporting: reports\/runs\/test\.md\n```/);
});

test("decodeHtmlEntities handles named, decimal numeric, and hex numeric entities", () => {
  assert.equal(
    decodeHtmlEntities("&amp;&lt;&gt;&quot;&apos;&#39;&#x27;&#x2F;&#47;&nbsp;"),
    "&<>\"'''// ",
  );
});

test("canonicalDescriptionHash uses stripped fallback when description_html is absent", () => {
  const withHtml = { description_html: "<p>Hello&nbsp;World</p>", description_stripped: "" };
  const strippedOnly = { description_html: "", description_stripped: "Hello World" };

  assert.equal(canonicalDescriptionText(withHtml), "Hello World");
  assert.equal(canonicalDescriptionText(strippedOnly), "Hello World");
  assert.equal(canonicalDescriptionHash(withHtml), canonicalDescriptionHash(strippedOnly));
});

test("descriptionHashCandidates preserves legacy raw-hash compatibility", () => {
  const item = { description_html: "<p>Hello&nbsp;World</p>", description_stripped: "Hello World" };
  const hashes = descriptionHashCandidates(item);

  assert.ok(hashes.includes(canonicalDescriptionHash(item)));
  assert.ok(hashes.includes(legacyRawDescriptionHash(item)));
});

test("parseYamlScalar extracts indented lock fields", () => {
  const parsed = parseYamlScalar(`
    version: dispatcher-v0
    dispatcher_run_id: run-123
    hash:
      description: ${"a".repeat(64)}
      labels: 0
  `);

  assert.equal(parsed.version, "dispatcher-v0");
  assert.equal(parsed.dispatcher_run_id, "run-123");
  assert.equal(parsed.description, "a".repeat(64));
  assert.equal(parsed.labels, "0");
});
