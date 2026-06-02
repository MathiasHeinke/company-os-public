import assert from "node:assert/strict";
import test from "node:test";

import {
  runClaimSafety,
  runCopyLint,
  runFullGate,
} from "./marketing-copy-lint-core.mjs";

test("blocks ARES Bio.OS in public ATLAS copy", () => {
  const result = runCopyLint("This ATLAS post accidentally says ARES Bio.OS.");
  assert.equal(result.ok, false);
  assert.equal(result.violations[0].rule, "ares-bioos-in-atlas-copy");
});

test("allows ATLAS Bio.OS brand copy", () => {
  const result = runCopyLint("ATLAS Bio.OS turns noisy signals into context, not diagnosis.");
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
});

test("blocks internal routing metadata fields", () => {
  const result = runCopyLint("request_id: abc123 should never be public.");
  assert.equal(result.ok, false);
  assert.equal(result.violations[0].rule, "internal-routing-metadata");
});

test("does not confuse normal request words with metadata", () => {
  const result = runCopyLint("Request a demo when you want to inspect the system.");
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
});

test("warns on generic metaphor without numeric or source anchor", () => {
  const result = runCopyLint("This is a game changer for health teams.");
  assert.equal(result.ok, true);
  assert.equal(result.warnings.some((item) => item.rule === "generic-metaphor-without-number"), true);
});

test("does not warn on metaphor with nearby numeric anchor", () => {
  const result = runCopyLint("This is not a game changer by vibe; the cohort moved 42% over 12 weeks.");
  assert.equal(result.warnings.some((item) => item.rule === "generic-metaphor-without-number"), false);
});

test("warns on context label without decision signal", () => {
  const result = runCopyLint("For context, this market has a lot of noise.");
  assert.equal(result.warnings.some((item) => item.rule === "context-label-without-decision"), true);
});

test("allows context label when implication is explicit", () => {
  const result = runCopyLint("For context, which means you should inspect the baseline before personalization.");
  assert.equal(result.warnings.some((item) => item.rule === "context-label-without-decision"), false);
});

test("adds review annotation for product explainer value", () => {
  const result = runCopyLint("ATLAS Bio.OS is a system for signal interpretation.");
  assert.equal(result.warnings.some((item) => item.classification === "REVIEW_REQUIRED"), true);
});

test("blocks titration instruction", () => {
  const result = runClaimSafety("Titrate up to 2.4mg weekly injection for better results.");
  assert.equal(result.ok, false);
  assert.equal(result.violations.some((item) => item.rule === "prescription-titration-injection-instruction"), true);
});

test("allows studied context dosage language", () => {
  const result = runClaimSafety("In a studied context, trial design described 0.3 g/kg/day creatine monohydrate loading.");
  assert.equal(result.violations.some((item) => item.rule === "prescription-titration-injection-instruction"), false);
});

test("blocks sourcing near drug context", () => {
  const result = runClaimSafety("Do not tell people where to buy semaglutide from a compounding pharmacy.");
  assert.equal(result.ok, false);
  assert.equal(result.violations.some((item) => item.rule === "sourcing-vendor-compounding-guidance"), true);
});

test("allows non-drug compound language", () => {
  const result = runClaimSafety("The compounding effect on markets can be misleading.");
  assert.equal(result.violations.some((item) => item.rule === "sourcing-vendor-compounding-guidance"), false);
});

test("blocks diagnosis or treatment instruction in medical context", () => {
  const result = runClaimSafety("This proves you have low testosterone and should treat it with a protocol.");
  assert.equal(result.ok, false);
  assert.equal(result.violations.some((item) => item.rule === "diagnosis-treatment-instruction"), true);
});

test("allows diagnostic cutoff as educational guideline fact", () => {
  const result = runClaimSafety("AUA uses total testosterone below 300 ng/dL as a diagnostic cutoff; this is not diagnosis.");
  assert.equal(result.violations.some((item) => item.rule === "diagnosis-treatment-instruction"), false);
});

test("blocks legal overclaim", () => {
  const result = runClaimSafety("This is clinically proven to cure fatigue.");
  assert.equal(result.ok, false);
  assert.equal(result.violations.some((item) => item.rule === "legal-regulated-overclaim"), true);
});

test("allows FDA-approved drug fact with approved indication context", () => {
  const result = runClaimSafety("Semaglutide is FDA-approved for obesity; this is not a claim about ATLAS.");
  assert.equal(result.violations.some((item) => item.rule === "regulated-fda-overclaim"), false);
});

test("policy rejects external distribution without release card", () => {
  const result = runFullGate({
    text: "ATLAS explains signal, not diagnosis. DOI: 10.1234/example.",
    distribution_target: "upload_post_live",
  });
  assert.equal(result.ok, false);
  assert.equal(result.violations.some((item) => item.rule === "external-distribution-without-release-card"), true);
});

test("policy passes draft target without release card", () => {
  const result = runFullGate({
    text: "ATLAS explains signal, not diagnosis. DOI: 10.1234/example.",
    distribution_target: "draft",
  });
  assert.equal(result.violations.some((item) => item.rule === "external-distribution-without-release-card"), false);
});

test("warn overrides do not clear reject violations", () => {
  const result = runFullGate({
    text: "ARES Bio.OS is a game changer.",
    override_reason: "editor accepted the metaphor",
  });
  assert.equal(result.ok, false);
  assert.equal(result.violations.some((item) => item.rule === "ares-bioos-in-atlas-copy"), true);
  assert.equal(result.copy_lint.overrides_applied.some((item) => item.rule === "generic-metaphor-without-number"), true);
});

test("combined result includes multiple reject violations", () => {
  const result = runFullGate({
    text: "request_id: abc. ARES Bio.OS can diagnose yourself with this.",
    distribution_target: "draft",
  });
  assert.equal(result.ok, false);
  assert.ok(result.violations.length >= 2);
});

test("large input completes with deterministic output", () => {
  const text = `${"Signal, not diagnosis. ".repeat(500)} DOI: 10.1000/test`;
  const start = Date.now();
  const result = runFullGate({ text });
  const elapsed = Date.now() - start;
  assert.equal(result.violations.length, 0);
  assert.ok(elapsed < 200);
});
