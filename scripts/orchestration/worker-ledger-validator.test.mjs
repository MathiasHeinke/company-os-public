import assert from "node:assert/strict";
import test from "node:test";

import {
  KNOWN_HUMAN_GATES,
  SUPPORTED_SHAPES,
  normalizeHumanGateLevel,
  parseContractText,
  validateContract,
  validateWorkerReportedConfidence,
} from "./worker-ledger-validator.mjs";
import { stripHtml } from "./plane-html.mjs";

test("validateContract PASSes the canonical flat ```yaml fence", () => {
  const shape = SUPPORTED_SHAPES.find((s) => s.name === "flat-yaml-fence");
  const verdict = validateContract({ description: shape.description, labels: shape.labels });
  assert.equal(verdict.ok, true, JSON.stringify(verdict.reason_codes));
  assert.deepEqual(verdict.reason_codes, []);
});

test("validateContract PASSes the ```worker-issue-contract synonym fence", () => {
  const shape = SUPPORTED_SHAPES.find((s) => s.name === "worker-issue-contract-fence");
  const verdict = validateContract({ description: shape.description, labels: shape.labels });
  assert.equal(verdict.ok, true, JSON.stringify(verdict.reason_codes));
});

test("validateContract PASSes Plane HTML round-trip after stripHtml", () => {
  const shape = SUPPORTED_SHAPES.find((s) => s.name === "plane-html-roundtrip");
  const stripped = stripHtml(shape.description);
  const verdict = validateContract({ description: stripped, labels: shape.labels });
  assert.equal(verdict.ok, true, JSON.stringify(verdict.reason_codes));
  assert.match(stripped, /"quoted scalar" survives entity decoding/);
});

test("validateContract PASSes raw Plane <pre><code> contract without inner fence after stripHtml", () => {
  const shape = SUPPORTED_SHAPES.find((s) => s.name === "plane-html-raw-pre-code-contract");
  const stripped = stripHtml(shape.description);
  const verdict = validateContract({ description: stripped, labels: shape.labels });
  assert.equal(verdict.ok, true, JSON.stringify(verdict.reason_codes));
  assert.match(stripped, /^```yaml\nrole: role:cto/m);
  assert.match(stripped, /\n```$/);
});

test("validateContract REJECTs nested wrappers with contract.fields-wrapped-in-parent-block", () => {
  const shape = SUPPORTED_SHAPES.find((s) => s.name === "nested-under-worker_issue_contract");
  const verdict = validateContract({ description: shape.description, labels: shape.labels });
  assert.equal(verdict.ok, false);
  assert.ok(
    verdict.reason_codes.includes("contract.fields-wrapped-in-parent-block"),
    `expected contract.fields-wrapped-in-parent-block in ${JSON.stringify(verdict.reason_codes)}`,
  );
  assert.ok(verdict.evidence.nested_keys?.length, "evidence should include the offending nested keys");
  assert.ok(
    verdict.evidence.nested_keys.some((entry) => entry.key === "role" && entry.parent === "worker_issue_contract"),
    "nested_keys should record parent + key for the operator's blast-radius",
  );
});

test("validateContract REJECTs the metadata: wrapper variant", () => {
  const shape = SUPPORTED_SHAPES.find((s) => s.name === "nested-under-metadata");
  const verdict = validateContract({ description: shape.description, labels: shape.labels });
  assert.equal(verdict.ok, false);
  assert.ok(verdict.reason_codes.includes("contract.fields-wrapped-in-parent-block"));
});

test("validateContract REJECTs missing fence with contract.required-field-missing", () => {
  const shape = SUPPORTED_SHAPES.find((s) => s.name === "missing-fence");
  const verdict = validateContract({ description: shape.description, labels: shape.labels });
  assert.equal(verdict.ok, false);
  assert.ok(verdict.reason_codes.includes("contract.required-field-missing"));
});

test("validateContract REJECTs a fenced block that uses 'Acceptance Criteria' display label instead of acceptance_criteria machine key", () => {
  // Regression for [WORK_ITEM_ID] LP-1: the dispatcher-required fenced block
  // uses lowercase snake_case machine keys. A capitalized, space-separated
  // display label like "Acceptance Criteria:" must NOT satisfy the
  // required `acceptance_criteria` machine key — the parser regex only
  // matches identifier characters and the validator must REJECT with
  // `contract.required-field-missing`.
  const description = [
    "```yaml",
    "role: role:cto",
    "parent_seat: none",
    "agent: claude",
    "mode: implement",
    "workspace: registry:company-os",
    "dispatch: ready",
    "source_of_truth:",
    "  - /abs/source.md",
    "Acceptance Criteria:",
    "  - One verifiable outcome (display label, not machine key).",
    "gates:",
    "  - node --check scripts/orchestration/worker-ledger-validator.mjs",
    "human_gate: HG-1",
    "reporting: Plane worker.reported with changed files and gates.",
    "```",
  ].join("\n");
  const verdict = validateContract({ description, labels: ["role:cto"] });
  assert.equal(verdict.ok, false, JSON.stringify(verdict.reason_codes));
  assert.ok(
    verdict.reason_codes.includes("contract.required-field-missing"),
    `expected contract.required-field-missing in ${JSON.stringify(verdict.reason_codes)}`,
  );
  // Also assert the parser did not silently coerce the display label into
  // the required machine field, which would mask the rejection.
  assert.ok(
    !verdict.evidence.fields?.includes("acceptance_criteria"),
    "display label 'Acceptance Criteria' must not register as the acceptance_criteria machine key",
  );
});

test("parseContractText keeps indented array items as values, not nested keys", () => {
  const text = [
    "role: role:cto",
    "source_of_truth:",
    "  - /abs/a.md",
    "  - /abs/b.md",
    "gates:",
    "  - node --check",
  ].join("\n");
  const parsed = parseContractText(text);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.fields.source_of_truth, ["/abs/a.md", "/abs/b.md"]);
  assert.deepEqual(parsed.fields.gates, ["node --check"]);
  assert.equal(parsed.malformed, undefined, "indented array items must not trip the nested-keys detector");
});

test("parseContractText flags indented key:value continuations under a parent", () => {
  const text = [
    "human_gate:",
    "  level: HG-1",
    "  owner: CEO",
  ].join("\n");
  const parsed = parseContractText(text);
  assert.equal(parsed.ok, true);
  assert.ok(parsed.malformed?.nested_keys?.length === 2);
  assert.deepEqual(
    parsed.malformed.nested_keys.map((row) => row.key).sort(),
    ["level", "owner"],
  );
});

test("parseContractText accepts intervention_budget as the only structured nested contract block", () => {
  const text = [
    "role: role:cmo",
    "intervention_budget:",
    "  ceo_mechanical_target: 0",
    "  ceo_decision_hard_limit: 3",
    "  worker_retry_hard_limit: 2",
    "human_gate: HG-2",
  ].join("\n");
  const parsed = parseContractText(text);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.malformed, undefined, "intervention_budget must not trip the nested-wrapper detector");
  assert.deepEqual(parsed.fields.intervention_budget, {
    ceo_mechanical_target: 0,
    ceo_decision_hard_limit: 3,
    worker_retry_hard_limit: 2,
  });
});

test("KNOWN_HUMAN_GATES exposes the canonical enum through HG-4 founder authority", () => {
  // Source of truth: docs/governance/human-gate-levels.md
  assert.deepEqual(
    [...KNOWN_HUMAN_GATES].sort(),
    ["HG-0", "HG-1", "HG-2", "HG-2.5", "HG-3", "HG-3.5", "HG-4"],
  );
});

test("normalizeHumanGateLevel pulls the canonical token from prose contracts", () => {
  assert.equal(normalizeHumanGateLevel("HG-3.5 founder-proxy pause"), "HG-3.5");
  assert.equal(normalizeHumanGateLevel("hg-4 founder strategic decision"), "HG-4");
  assert.equal(normalizeHumanGateLevel("hg-2 sandbox only; no merge"), "HG-2");
  assert.equal(normalizeHumanGateLevel("HG-9 some made-up level"), "HG-9");
  assert.equal(normalizeHumanGateLevel("ad hoc operator note"), "");
});

test("validateContract accepts a well-formed HG-3.5 contract with hg35_pause_artifact", () => {
  const description = [
    "```yaml",
    "role: role:coo",
    "parent_seat: none",
    "agent: claude",
    "mode: implement",
    "workspace: registry:company-os",
    "dispatch: ready",
    "source_of_truth:",
    "  - /abs/source.md",
    "acceptance_criteria:",
    "  - Worker pauses at Stage 5 with the pause artifact authored.",
    "gates:",
    "  - node --test scripts/orchestration/worker-ledger-validator.test.mjs",
    "human_gate: HG-3.5",
    "hg35_pause_artifact: reports/runs/2026-05-13/founder-proxy-mirror.md",
    "reporting: Plane worker.reported with hg35 block.",
    "BlockedActions: never push, never deploy.",
    "```",
  ].join("\n");
  const verdict = validateContract({ description, labels: ["role:coo"] });
  assert.equal(verdict.ok, true, JSON.stringify(verdict.reason_codes));
  assert.deepEqual(verdict.reason_codes, []);
  assert.equal(verdict.evidence.human_gate_level, "HG-3.5");
});

test("validateContract REJECTs HG-3.5 without hg35_pause_artifact", () => {
  const description = [
    "```yaml",
    "role: role:coo",
    "parent_seat: none",
    "agent: claude",
    "mode: implement",
    "workspace: registry:company-os",
    "dispatch: ready",
    "source_of_truth:",
    "  - /abs/source.md",
    "acceptance_criteria:",
    "  - Worker pauses at Stage 5.",
    "gates:",
    "  - node --test scripts/orchestration/worker-ledger-validator.test.mjs",
    "human_gate: HG-3.5",
    "reporting: Plane worker.reported.",
    "```",
  ].join("\n");
  const verdict = validateContract({ description, labels: ["role:coo"] });
  assert.equal(verdict.ok, false);
  assert.ok(
    verdict.reason_codes.includes("contract.hg35-pause-artifact-missing"),
    `expected contract.hg35-pause-artifact-missing in ${JSON.stringify(verdict.reason_codes)}`,
  );
});

test("validateContract REJECTs an unknown HumanGate level with a stable reason code", () => {
  const description = [
    "```yaml",
    "role: role:cto",
    "parent_seat: none",
    "agent: claude",
    "mode: implement",
    "workspace: registry:company-os",
    "dispatch: ready",
    "source_of_truth:",
    "  - /abs/source.md",
    "acceptance_criteria:",
    "  - One verifiable outcome.",
    "gates:",
    "  - node --test scripts/orchestration/worker-ledger-validator.test.mjs",
    "human_gate: HG-9 some made-up level",
    "reporting: Plane worker.reported.",
    "```",
  ].join("\n");
  const verdict = validateContract({ description, labels: ["role:cto"] });
  assert.equal(verdict.ok, false);
  assert.ok(verdict.reason_codes.includes("contract.unknown-human-gate-level"));
  assert.equal(verdict.evidence.human_gate_level, "HG-9");
});

test("validateContract tolerates descriptive prose after a known HumanGate level", () => {
  const description = [
    "```yaml",
    "role: role:cto",
    "parent_seat: none",
    "agent: claude",
    "mode: implement",
    "workspace: registry:company-os",
    "dispatch: ready",
    "source_of_truth:",
    "  - /abs/source.md",
    "acceptance_criteria:",
    "  - Sandbox-only verification.",
    "gates:",
    "  - git diff --check",
    "human_gate: HG-2.5 sandbox guardrails apply",
    "reporting: Plane worker.reported.",
    "BlockedActions: never push, never deploy.",
    "```",
  ].join("\n");
  const verdict = validateContract({ description, labels: ["role:cto"] });
  assert.equal(verdict.ok, true, JSON.stringify(verdict.reason_codes));
  assert.equal(verdict.evidence.human_gate_level, "HG-2.5");
});

test("SUPPORTED_SHAPES catalog is non-empty and labeled with PASS or REJECT", () => {
  assert.ok(SUPPORTED_SHAPES.length >= 4);
  for (const shape of SUPPORTED_SHAPES) {
    assert.ok(shape.name, "shape needs a name");
    assert.ok(shape.summary, "shape needs a summary");
    assert.ok(["PASS", "REJECT"].includes(shape.expected), `unexpected verdict ${shape.expected}`);
    if (shape.expected === "REJECT") {
      assert.ok(Array.isArray(shape.expected_reason_codes), "REJECT shapes must declare expected_reason_codes");
    }
  }
});

function targetClassContract(tc) {
  return [
    "```yaml",
    "role: role:cto",
    "parent_seat: none",
    "agent: claude",
    "mode: plan",
    "workspace: registry:company-os",
    "dispatch: manual",
    "source_of_truth:",
    "  - /abs/spec.md",
    "acceptance_criteria:",
    "  - One verifiable outcome.",
    "gates:",
    "  - git diff --check",
    "human_gate: HG-2",
    `target_class: ${tc}`,
    "reporting: Plane worker.reported.",
    "BlockedActions: never deploy.",
    "```",
  ].join("\n");
}

test("validateContract accepts canonical target_class values and records evidence", () => {
  for (const tc of ["report-only", "main-integrated", "production-deployed"]) {
    const verdict = validateContract({ description: targetClassContract(tc), labels: ["role:cto"] });
    assert.ok(!verdict.reason_codes.includes("contract.unknown-target-class"), `${tc} should be accepted`);
    assert.equal(verdict.evidence.target_class, tc);
  }
});

test("validateContract REJECTs an unknown target_class", () => {
  const verdict = validateContract({ description: targetClassContract("ship-it-yolo"), labels: ["role:cto"] });
  assert.ok(verdict.reason_codes.includes("contract.unknown-target-class"), JSON.stringify(verdict.reason_codes));
});

test("validateContract REJECTs target_class prose instead of a strict enum token", () => {
  const verdict = validateContract({
    description: targetClassContract("report-only later maybe"),
    labels: ["role:cto"],
  });
  assert.ok(verdict.reason_codes.includes("contract.unknown-target-class"), JSON.stringify(verdict.reason_codes));
  assert.equal(verdict.evidence.target_class, "report-only later maybe");
});

test("validateContract ignores absent target_class (optional, non-breaking)", () => {
  const desc = targetClassContract("report-only").replace(/\ntarget_class: report-only/, "");
  const verdict = validateContract({ description: desc, labels: ["role:cto"] });
  assert.equal(verdict.evidence.target_class, undefined);
  assert.ok(!verdict.reason_codes.includes("contract.unknown-target-class"));
});

test("validateWorkerReportedConfidence accepts a 0-1 confidence with a basis", () => {
  const r = validateWorkerReportedConfidence({ workerConfidence: 0.93, workerConfidenceBasis: "tests pass; diff clean" });
  assert.equal(r.ok, true);
  assert.equal(r.reason, "reported.worker-confidence-ok");
  assert.equal(r.confidence, 0.93);
});

test("validateWorkerReportedConfidence REJECTs a missing confidence", () => {
  const r = validateWorkerReportedConfidence({ workerConfidenceBasis: "no number" });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "reported.worker-confidence-missing");
});

test("validateWorkerReportedConfidence REJECTs an out-of-range confidence", () => {
  const r = validateWorkerReportedConfidence({ workerConfidence: 1.5, workerConfidenceBasis: "too high" });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "reported.worker-confidence-out-of-range");
});

test("validateWorkerReportedConfidence REJECTs a confidence with no basis", () => {
  const r = validateWorkerReportedConfidence({ workerConfidence: 0.9, workerConfidenceBasis: "" });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "reported.worker-confidence-basis-missing");
});
