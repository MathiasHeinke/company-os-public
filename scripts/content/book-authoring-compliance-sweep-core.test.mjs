import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateVoiceBeliefReport,
  extractForbiddenPatterns,
  runBookAuthoringComplianceSweep,
} from "./book-authoring-compliance-sweep-core.mjs";

test("extracts inline and block FVBM forbidden patterns", () => {
  assert.deepEqual(
    extractForbiddenPatterns("forbidden_patterns: [foo, \"bar\"]\n"),
    ["foo", "bar"],
  );
  assert.deepEqual(
    extractForbiddenPatterns(["voice:", "  forbidden_patterns:", "    - slop phrase", "    - Neverword"].join("\n")),
    ["slop phrase", "Neverword"],
  );
});

test("evaluates voice and belief pass markers", () => {
  assert.deepEqual(
    evaluateVoiceBeliefReport("voice_match: PASS\nbelief_match: pass\n"),
    { voice_match: true, belief_match: true },
  );
  assert.deepEqual(
    evaluateVoiceBeliefReport("voice_match: NEEDS_FOUNDER\nbelief_match: PASS\n"),
    { voice_match: false, belief_match: true },
  );
});

test("passes a clean manuscript with voice and belief evidence", () => {
  const result = runBookAuthoringComplianceSweep({
    manuscriptText: "This is a clean chapter with a hard objection and a sourced claim marker.",
    fvbmText: "forbidden_patterns: [forbidden phrase]",
    voiceBeliefReportText: "voice_match: PASS\nbelief_match: PASS\n",
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "PASS");
});

test("rejects dash tells, gendering, worker leaks, forbidden terms and missing voice pass", () => {
  const result = runBookAuthoringComplianceSweep({
    manuscriptText: "Founder:innen draft -- but also an em dash \u2014 and FACT_VERIFY plus forbidden phrase.",
    fvbmText: "forbidden_patterns: [forbidden phrase]",
    voiceBeliefReportText: "voice_match: NEEDS_FOUNDER\nbelief_match: PASS\n",
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "REJECT");
  assert.equal(result.checks.find((entry) => entry.id === "dash_tells.none").status, "block");
  assert.equal(result.checks.find((entry) => entry.id === "gendering.none").status, "block");
  assert.equal(result.checks.find((entry) => entry.id === "worker_leaks.none").status, "block");
  assert.equal(result.checks.find((entry) => entry.id === "fvbm_forbidden.none").status, "block");
  assert.equal(result.checks.find((entry) => entry.id === "voice_match.pass").status, "block");
});
