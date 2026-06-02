import assert from "node:assert/strict";
import test from "node:test";

import {
  DECISION_MODES,
  HG_35_REJECT_TEMPLATE,
  HG_35_SIGN_TEMPLATE,
  SELFFIX_REJECT_CODES,
  SELFFIX_THRESHOLDS,
  HUMAN_GATE_AUTO_GO_THRESHOLDS,
  evaluateSelfFixEligibility,
  normalizeHumanGateLevel,
  resolveControllerInputs,
  decideController,
  buildPostWorkerQualityPlanForController,
  buildDecisionCardYaml,
  findCaoVerdictComment,
  findHumanGateReleaseComment,
} from "./codex-controller-dryrun.mjs";
import { loadPostWorkerQualityRegistry } from "./post-worker-quality-loop-core.mjs";
import { stripHtml } from "./plane-html.mjs";
import { extractContractBlock } from "./worker-ledger-validator.mjs";

const EMPTY_GATES = { green: [], red: [] };
const QUALITY_REGISTRY = loadPostWorkerQualityRegistry().registry;

test("normalizeHumanGateLevel extracts canonical level from descriptive contracts", () => {
  assert.equal(normalizeHumanGateLevel("HG-2.5 sandbox only; no merge"), "HG-2.5");
  assert.equal(normalizeHumanGateLevel("hg-3 ceo critical gate"), "HG-3");
  assert.equal(normalizeHumanGateLevel("hg-4 founder strategic gate"), "HG-4");
  assert.equal(normalizeHumanGateLevel("custom-policy"), "custom-policy");
});

test("controller contract extraction accepts raw Plane pre/code worker contracts", () => {
  const rawContract = [
    "role: role:cao",
    "parent_seat: role:cao",
    "agent: claude",
    "mode: report",
    "workspace: registry:company-os",
    "dispatch: ready",
    "source_of_truth:",
    "  - docs/releases/0.6-growth-beta-entry-plan.md",
    "acceptance_criteria:",
    "  - Produce a readiness synthesis.",
    "gates:",
    "  - git diff --check",
    "human_gate: HG-2",
    "reporting: Plane worker.reported",
  ].join("\n");
  const descriptionHtml = `<p>Goal</p><pre><code>${rawContract}</code></pre>`;
  const extracted = extractContractBlock(stripHtml(descriptionHtml));

  assert.equal(extracted.ok, true);
  assert.equal(extracted.fields.human_gate, "HG-2");
});

test("resolveControllerInputs prefers CLI confidence over contract confidence", () => {
  const result = resolveControllerInputs({
    args: { confidence: 0.93 },
    contractFields: {
      ceoconfidence: "0.81",
      founderpredictionconfidence: "0.94",
      releaseauthority: "CEO_AUTONOMOUS",
    },
  });
  assert.equal(result.ceoConfidence, 0.93);
  assert.equal(result.ceoConfidenceSource, "cli");
});

test("resolveControllerInputs prefers CLI release authority over contract release authority", () => {
  const result = resolveControllerInputs({
    args: { confidence: 0.97, releaseAuthority: "CEO_CRITICAL" },
    contractFields: {
      releaseauthority: "CEO_AUTONOMOUS",
    },
  });
  assert.equal(result.ceoConfidence, 0.97);
  assert.equal(result.ceoConfidenceSource, "cli");
  assert.equal(result.releaseAuthorityDeclared, "CEO_CRITICAL");
});

test("resolveControllerInputs derives confidence from HG-2.5 CEO release metadata", () => {
  const result = resolveControllerInputs({
    args: { confidence: NaN },
    contractFields: {
      founderprediction: "GO_MIT_AUFLAGEN",
      founderpredictionconfidence: "0.94",
      releaseauthority: "CEO_AUTONOMOUS",
    },
  });
  assert.equal(result.ceoConfidence, 0.94);
  assert.equal(result.ceoConfidenceSource, "contract-founderpredictionconfidence");
  assert.equal(result.founderPrediction, "GO_MIT_AUFLAGEN");
  assert.equal(result.releaseAuthorityDeclared, "CEO_AUTONOMOUS");
});

// ---------- evaluateSelfFixEligibility — every reject code ----------

test("evaluateSelfFixEligibility: PASS for tiny patch with high confidence", () => {
  const r = evaluateSelfFixEligibility({
    changeScope: { files_count: 1, lines_changed: 5, surfaces: ["docs"] },
    gates: { green: ["lint"], red: [] },
    humanGateLevel: "HG-1",
    ceoConfidence: 0.95,
  });
  assert.equal(r.eligible, true);
  assert.deepEqual(r.reject_codes, []);
});

test("evaluateSelfFixEligibility: selffix.scope-too-large by lines", () => {
  const r = evaluateSelfFixEligibility({
    changeScope: { files_count: 1, lines_changed: SELFFIX_THRESHOLDS.MAX_LINES_CHANGED + 5, surfaces: [] },
    gates: EMPTY_GATES,
    humanGateLevel: "HG-1",
    ceoConfidence: 0.95,
  });
  assert.equal(r.eligible, false);
  assert.ok(r.reject_codes.includes(SELFFIX_REJECT_CODES.SCOPE_TOO_LARGE));
});

test("evaluateSelfFixEligibility: selffix.scope-too-large by file count", () => {
  const r = evaluateSelfFixEligibility({
    changeScope: { files_count: SELFFIX_THRESHOLDS.MAX_FILES_TOUCHED + 1, lines_changed: 5 },
    gates: EMPTY_GATES,
    humanGateLevel: "HG-1",
    ceoConfidence: 0.95,
  });
  assert.equal(r.eligible, false);
  assert.ok(r.reject_codes.includes(SELFFIX_REJECT_CODES.SCOPE_TOO_LARGE));
});

test("evaluateSelfFixEligibility: selffix.touches-hg3 via HG-3 level", () => {
  const r = evaluateSelfFixEligibility({
    changeScope: { files_count: 1, lines_changed: 5 },
    gates: EMPTY_GATES,
    humanGateLevel: "HG-3",
    ceoConfidence: 0.95,
  });
  assert.equal(r.eligible, false);
  assert.ok(r.reject_codes.includes(SELFFIX_REJECT_CODES.TOUCHES_HG3));
});

test("evaluateSelfFixEligibility: selffix.touches-hg3 via scope surface", () => {
  const r = evaluateSelfFixEligibility({
    changeScope: { files_count: 1, lines_changed: 5, surfaces: ["material-spend"] },
    gates: EMPTY_GATES,
    humanGateLevel: "HG-1",
    ceoConfidence: 0.95,
  });
  assert.equal(r.eligible, false);
  assert.ok(r.reject_codes.includes(SELFFIX_REJECT_CODES.TOUCHES_HG3));
});

test("evaluateSelfFixEligibility: selffix.confidence-too-low", () => {
  const r = evaluateSelfFixEligibility({
    changeScope: { files_count: 1, lines_changed: 5 },
    gates: EMPTY_GATES,
    humanGateLevel: "HG-1",
    ceoConfidence: 0.91,
  });
  assert.equal(r.eligible, false);
  assert.ok(r.reject_codes.includes(SELFFIX_REJECT_CODES.CONFIDENCE_TOO_LOW));
});

test("evaluateSelfFixEligibility: selffix.production-write via deploy surface", () => {
  const r = evaluateSelfFixEligibility({
    changeScope: { files_count: 1, lines_changed: 5, surfaces: ["deploy"] },
    gates: EMPTY_GATES,
    humanGateLevel: "HG-2.5",
    ceoConfidence: 0.95,
  });
  assert.equal(r.eligible, false);
  assert.ok(r.reject_codes.includes(SELFFIX_REJECT_CODES.PRODUCTION_WRITE));
});

test("evaluateSelfFixEligibility: selffix.secrets-auth-schema-rls", () => {
  const r = evaluateSelfFixEligibility({
    changeScope: { files_count: 1, lines_changed: 5, surfaces: ["auth"] },
    gates: EMPTY_GATES,
    humanGateLevel: "HG-2",
    ceoConfidence: 0.95,
  });
  assert.equal(r.eligible, false);
  assert.ok(r.reject_codes.includes(SELFFIX_REJECT_CODES.SECRETS_AUTH_SCHEMA_RLS));
});

test("evaluateSelfFixEligibility: selffix.large-refactor", () => {
  const r = evaluateSelfFixEligibility({
    changeScope: {
      files_count: 1,
      lines_changed: 30,
      refactor_lines: SELFFIX_THRESHOLDS.MAX_REFACTOR_LINES + 5,
      surfaces: ["refactor"],
    },
    gates: EMPTY_GATES,
    humanGateLevel: "HG-1",
    ceoConfidence: 0.95,
  });
  assert.equal(r.eligible, false);
  assert.ok(r.reject_codes.includes(SELFFIX_REJECT_CODES.LARGE_REFACTOR));
});

test("evaluateSelfFixEligibility: selffix.gates-not-green", () => {
  const r = evaluateSelfFixEligibility({
    changeScope: { files_count: 1, lines_changed: 5 },
    gates: { green: ["lint"], red: ["tests"] },
    humanGateLevel: "HG-1",
    ceoConfidence: 0.95,
  });
  assert.equal(r.eligible, false);
  assert.ok(r.reject_codes.includes(SELFFIX_REJECT_CODES.GATES_NOT_GREEN));
});

// ---------- decideController — every decision mode ----------

test("decideController REJECT on CAO REJECT", () => {
  const d = decideController({ caoVerdict: "REJECT", humanGateLevel: "HG-1", ceoConfidence: 0.99 });
  assert.equal(d.decision_mode, DECISION_MODES.REJECT);
});

test("decideController PARK when CAO verdict is missing", () => {
  const d = decideController({ caoVerdict: null, humanGateLevel: "HG-1", ceoConfidence: 0.99 });
  assert.equal(d.decision_mode, DECISION_MODES.PARK);
  assert.equal(d.reason, "cao-missing");
});

test("decideController PARK on CAO PARK", () => {
  const d = decideController({ caoVerdict: "PARK", humanGateLevel: "HG-1", ceoConfidence: 0.99 });
  assert.equal(d.decision_mode, DECISION_MODES.PARK);
});

test("decideController HG-3.5-PENDING-ARTIFACT-REVIEW on CAO PARK + HG-3.5 contract", () => {
  // Source of truth: docs/governance/human-gate-levels.md.
  const d = decideController({
    caoVerdict: "PARK",
    humanGateLevel: "HG-3.5",
    ceoConfidence: 0.5,
    pauseArtifact: "reports/runs/2026-05-13/founder-proxy-mirror.md",
  });
  assert.equal(d.decision_mode, DECISION_MODES.HG_35_PENDING_ARTIFACT_REVIEW);
  assert.equal(d.reason, "cao-park-hg35");
  assert.equal(d.release_authority, "none");
  assert.equal(d.next_state_hint, "founder-proxy-review");
  assert.equal(d.hg35.pause_artifact, "reports/runs/2026-05-13/founder-proxy-mirror.md");
  assert.equal(d.hg35.sign_template, HG_35_SIGN_TEMPLATE);
  assert.equal(d.hg35.reject_template, HG_35_REJECT_TEMPLATE);
});

test("decideController HG-3.5 PARK without contract pause_artifact surfaces null artifact", () => {
  const d = decideController({
    caoVerdict: "PARK",
    humanGateLevel: "HG-3.5",
    ceoConfidence: 0.5,
  });
  assert.equal(d.decision_mode, DECISION_MODES.HG_35_PENDING_ARTIFACT_REVIEW);
  assert.equal(d.hg35.pause_artifact, null);
});

test("decideController HG-3.5 ASK-FOUNDER when CAO PASS without pause (HG-3.5 has no AUTO-GO path)", () => {
  // HG-3.5 isn't in HUMAN_GATE_AUTO_GO_THRESHOLDS, so a CAO PASS at low
  // confidence falls through to ASK-FOUNDER. AUTO-GO is reserved for
  // levels with declared thresholds. This guards against a CAO PASS
  // accidentally promoting a founder-proxy slice past the founder.
  const d = decideController({
    caoVerdict: "PASS",
    humanGateLevel: "HG-3.5",
    ceoConfidence: 0.6,
  });
  assert.equal(d.decision_mode, DECISION_MODES.ASK_FOUNDER);
});

test("decideController asks CEO HG-3 when CEO_CRITICAL release authority is missing", () => {
  const d = decideController({ caoVerdict: "PASS", humanGateLevel: "HG-3", ceoConfidence: 0.99 });
  assert.equal(d.decision_mode, DECISION_MODES.ASK_CEO_HG3);
  assert.equal(d.release_authority, "CEO_CRITICAL");
});

test("decideController AUTO-GO with CEO_CRITICAL for evidenced HG-3", () => {
  const d = decideController({
    caoVerdict: "PASS",
    humanGateLevel: "HG-3",
    ceoConfidence: HUMAN_GATE_AUTO_GO_THRESHOLDS["HG-3"],
    releaseAuthorityDeclared: "CEO_CRITICAL",
  });
  assert.equal(d.decision_mode, DECISION_MODES.AUTO_GO);
  assert.equal(d.release_authority, "CEO_CRITICAL");
  assert.equal(d.next_state_hint, "ready-for-critical-release");
});

test("decideController ASK-FOUNDER on HG-4 regardless of confidence", () => {
  const d = decideController({ caoVerdict: "PASS", humanGateLevel: "HG-4", ceoConfidence: 1 });
  assert.equal(d.decision_mode, DECISION_MODES.ASK_FOUNDER);
  assert.equal(d.release_authority, "FOUNDER_REQUIRED");
});

test("decideController AUTO-GO on HG-4 only when explicit human gate release exists", () => {
  const d = decideController({
    caoVerdict: "PASS",
    humanGateLevel: "HG-4",
    ceoConfidence: 0,
    humanGateRelease: {
      ok: true,
      comment_id: "release-1",
      released_by: "Mathias Heinke",
      level: "HG-4",
      scope: "ARES-private-only",
    },
  });
  assert.equal(d.decision_mode, DECISION_MODES.AUTO_GO);
  assert.equal(d.reason, "hg-4-founder-released");
  assert.equal(d.release_authority, "FOUNDER_REQUIRED");
  assert.equal(d.next_state_hint, "founder-released");
  assert.equal(d.human_gate_release.comment_id, "release-1");
});

test("decideController ASK-FOUNDER when HG-2.5 contract declares founder-required release", () => {
  const d = decideController({
    caoVerdict: "PASS",
    humanGateLevel: "HG-2.5",
    ceoConfidence: 0.99,
    releaseAuthorityDeclared: "FOUNDER_REQUIRED",
  });
  assert.equal(d.decision_mode, DECISION_MODES.ASK_FOUNDER);
  assert.equal(d.reason, "declared-founder-required");
  assert.equal(d.release_authority, "FOUNDER_REQUIRED");
});

test("decideController AUTO-GO when HG-2.5 release metadata confidence is sufficient", () => {
  const inputs = resolveControllerInputs({
    args: { confidence: NaN },
    contractFields: {
      founderpredictionconfidence: "0.94",
      releaseauthority: "CEO_AUTONOMOUS",
    },
  });
  const d = decideController({
    caoVerdict: "PASS",
    humanGateLevel: "HG-2.5",
    ceoConfidence: inputs.ceoConfidence,
    releaseAuthorityDeclared: inputs.releaseAuthorityDeclared,
  });
  assert.equal(d.decision_mode, DECISION_MODES.AUTO_GO);
  assert.equal(d.release_authority, "CEO_AUTONOMOUS");
});

test("decideController ASK-FOUNDER on low confidence", () => {
  const d = decideController({ caoVerdict: "PASS", humanGateLevel: "HG-1", ceoConfidence: 0.5 });
  assert.equal(d.decision_mode, DECISION_MODES.ASK_FOUNDER);
});

test("decideController SELF-FIX when requested and eligible", () => {
  const d = decideController({
    caoVerdict: "PASS",
    humanGateLevel: "HG-1",
    ceoConfidence: 0.95,
    selfFixRequested: true,
    changeScope: { files_count: 1, lines_changed: 5, surfaces: ["docs"] },
    gates: { green: ["lint"], red: [] },
  });
  assert.equal(d.decision_mode, DECISION_MODES.SELF_FIX);
  assert.equal(d.selffix.eligible, true);
});

test("decideController DELEGATE when SELF-FIX requested but ineligible", () => {
  const d = decideController({
    caoVerdict: "PASS",
    humanGateLevel: "HG-1",
    ceoConfidence: 0.99,
    selfFixRequested: true,
    changeScope: { files_count: 5, lines_changed: 200 },
    gates: { green: ["lint"], red: ["tests"] },
  });
  assert.equal(d.decision_mode, DECISION_MODES.DELEGATE);
  assert.equal(d.selffix.eligible, false);
  assert.ok(d.selffix.reject_codes.includes(SELFFIX_REJECT_CODES.SCOPE_TOO_LARGE));
  assert.ok(d.selffix.reject_codes.includes(SELFFIX_REJECT_CODES.GATES_NOT_GREEN));
});

test("decideController AUTO-GO when HG-1 confidence meets threshold", () => {
  const d = decideController({
    caoVerdict: "PASS",
    humanGateLevel: "HG-1",
    ceoConfidence: HUMAN_GATE_AUTO_GO_THRESHOLDS["HG-1"],
  });
  assert.equal(d.decision_mode, DECISION_MODES.AUTO_GO);
  assert.equal(d.release_authority, "none");
});

test("decideController AUTO-GO with CEO_AUTONOMOUS for HG-2.5", () => {
  const d = decideController({
    caoVerdict: "PASS",
    humanGateLevel: "HG-2.5",
    ceoConfidence: HUMAN_GATE_AUTO_GO_THRESHOLDS["HG-2.5"],
  });
  assert.equal(d.decision_mode, DECISION_MODES.AUTO_GO);
  assert.equal(d.release_authority, "CEO_AUTONOMOUS");
});

test("decideController AUTO-GO when HG-2.5 contract field contains guardrail prose", () => {
  const d = decideController({
    caoVerdict: "PASS",
    humanGateLevel: "HG-2.5 sandbox only; no merge, no push",
    ceoConfidence: HUMAN_GATE_AUTO_GO_THRESHOLDS["HG-2.5"],
  });
  assert.equal(d.decision_mode, DECISION_MODES.AUTO_GO);
  assert.equal(d.release_authority, "CEO_AUTONOMOUS");
});

test("decideController DELEGATE as default when HG threshold not met", () => {
  const d = decideController({
    caoVerdict: "PASS",
    humanGateLevel: "HG-2.5",
    ceoConfidence: 0.85, // above 0.70 floor, below 0.92 HG-2.5 threshold
  });
  assert.equal(d.decision_mode, DECISION_MODES.DELEGATE);
});

// ---------- buildDecisionCardYaml ----------

test("buildDecisionCardYaml emits expected keys for SELF-FIX", () => {
  const decision = decideController({
    caoVerdict: "PASS",
    humanGateLevel: "HG-1",
    ceoConfidence: 0.95,
    selfFixRequested: true,
    changeScope: { files_count: 1, lines_changed: 5, surfaces: ["docs"] },
    gates: { green: ["lint"], red: [] },
  });
  decision._inputs = { ceoConfidence: 0.95 };
  const yaml = buildDecisionCardYaml({
    runId: "abc",
    workItem: { id: "x", sequence_id: 99, name: "Test" },
    caoVerdict: "PASS",
    decision,
    contractFields: { human_gate: "HG-1", blockedactions: "merge,push" },
    signedAt: "2026-05-09T00:00:00.000Z",
  });
  assert.match(yaml, /^controller\.decision:/m);
  assert.match(yaml, /version: codex-controller-dryrun-v0/);
  assert.match(yaml, /decision_mode: SELF-FIX/);
  assert.match(yaml, /ceo_confidence_source: n\/a/);
  assert.match(yaml, /founder_prediction_confidence: n\/a/);
  assert.match(yaml, /work_item: [WORK_ITEM_ID]/);
  assert.match(yaml, /selffix:/);
  assert.match(yaml, /eligible: true/);
  assert.match(yaml, /no_writes_performed: true/);
});

test("buildPostWorkerQualityPlanForController makes coding work scheduler-visible", () => {
  const decision = decideController({
    caoVerdict: "PASS",
    humanGateLevel: "HG-2.5",
    ceoConfidence: HUMAN_GATE_AUTO_GO_THRESHOLDS["HG-2.5"],
  });
  const plan = buildPostWorkerQualityPlanForController({
    registry: QUALITY_REGISTRY,
    decision,
    contractFields: {
      agent: "claude",
      mode: "implement",
      inferenceclass: "P2-code-shared",
      postworkerqualitypolicy: "required",
      scope: "scripts/orchestration runtime auth work",
    },
    workerReport: { state: "PASS" },
    caoVerdict: "PASS",
  });

  assert.equal(plan.status, "FOLLOWUP_READY");
  assert.equal(plan.scheduler.scheduler_may_spawn, true);
  assert.deepEqual(
    plan.markers_to_post.map((item) => `${item.marker}:${item.worker_class}`),
    [
      "controller.audit-followup:quality-auditor",
      "controller.audit-followup:security-auditor",
    ],
  );
});

test("buildDecisionCardYaml emits post-worker quality markers into controller decision card", () => {
  const decision = decideController({
    caoVerdict: "PASS",
    humanGateLevel: "HG-2.5",
    ceoConfidence: HUMAN_GATE_AUTO_GO_THRESHOLDS["HG-2.5"],
  });
  decision._inputs = { ceoConfidence: HUMAN_GATE_AUTO_GO_THRESHOLDS["HG-2.5"] };
  const postWorkerQualityPlan = buildPostWorkerQualityPlanForController({
    registry: QUALITY_REGISTRY,
    decision,
    contractFields: {
      agent: "claude",
      mode: "implement",
      inferenceclass: "P2-code-shared",
      postworkerqualitypolicy: "required",
      scope: "scripts/orchestration runtime auth work",
    },
    workerReport: { state: "PASS" },
    caoVerdict: "PASS",
  });

  const yaml = buildDecisionCardYaml({
    runId: "abc",
    workItem: { id: "x", sequence_id: 456, name: "Quality Gate Test" },
    caoVerdict: "PASS",
    decision,
    contractFields: { human_gate: "HG-2.5", blockedactions: "merge,push" },
    signedAt: "2026-05-31T00:00:00.000Z",
    postWorkerQualityPlan,
  });

  assert.match(yaml, /post_worker_quality:/);
  assert.match(yaml, /controller\.audit-followup:/);
  assert.match(yaml, /worker_class: quality-auditor/);
  assert.match(yaml, /worker_class: security-auditor/);
  assert.match(yaml, /scheduler_may_spawn: true/);
});

test("buildDecisionCardYaml preserves non-COMPA project identifiers", () => {
  const decision = decideController({
    caoVerdict: "PASS",
    humanGateLevel: "HG-2",
    ceoConfidence: 0.9,
  });
  decision._inputs = { ceoConfidence: 0.9 };
  const yaml = buildDecisionCardYaml({
    runId: "abc",
    workItem: { id: "x", sequence_id: 467, _project_identifier: "ATLAS", name: "Atlas child" },
    caoVerdict: "PASS",
    decision,
    contractFields: { human_gate: "HG-2", blockedactions: "merge,push" },
    signedAt: "2026-05-24T00:00:00.000Z",
  });

  assert.match(yaml, /work_item: [WORK_ITEM_ID]/);
  assert.doesNotMatch(yaml, /work_item: [WORK_ITEM_ID]/);
});

test("buildDecisionCardYaml emits the hg35 block with literal sign and reject templates for founder-proxy review", () => {
  const decision = decideController({
    caoVerdict: "PARK",
    humanGateLevel: "HG-3.5",
    ceoConfidence: 0.5,
    pauseArtifact: "reports/runs/2026-05-13/founder-proxy-mirror.md",
  });
  decision._inputs = { ceoConfidence: 0.5 };
  const yaml = buildDecisionCardYaml({
    runId: "abc",
    workItem: { id: "x", sequence_id: 186, name: "HG-3.5 Founder-Proxy Test" },
    caoVerdict: "PARK",
    decision,
    contractFields: { humangate: "HG-3.5", hg35_pause_artifact: "reports/runs/2026-05-13/founder-proxy-mirror.md", blockedactions: "merge,push" },
    signedAt: "2026-05-13T00:00:00.000Z",
  });
  assert.match(yaml, /decision_mode: HG-3\.5-PENDING-ARTIFACT-REVIEW/);
  assert.match(yaml, /reason: cao-park-hg35/);
  assert.match(yaml, /hg35:/);
  assert.match(yaml, /pause_artifact: reports\/runs\/2026-05-13\/founder-proxy-mirror\.md/);
  assert.match(yaml, /sign_template: \|/);
  assert.match(yaml, /reject_template: \|/);
  assert.match(yaml, /controller\.founder-proxy-sign:/);
  assert.match(yaml, /verdict: APPROVE/);
  assert.match(yaml, /verdict: REJECT/);
});

test("buildDecisionCardYaml supports post-mode version and write flag", () => {
  const decision = decideController({
    caoVerdict: "PASS",
    humanGateLevel: "HG-2.5",
    ceoConfidence: 0.95,
  });
  decision._inputs = { ceoConfidence: 0.95 };
  const yaml = buildDecisionCardYaml({
    runId: "abc",
    workItem: { id: "x", sequence_id: 99, name: "Test" },
    caoVerdict: "PASS",
    decision,
    contractFields: { humangate: "HG-2.5", blockedactions: "merge,push" },
    signedAt: "2026-05-09T00:00:00.000Z",
    version: "codex-controller-v0",
    noWritesPerformed: false,
  });
  assert.match(yaml, /version: codex-controller-v0/);
  assert.match(yaml, /human_gate_level: HG-2.5/);
  assert.match(yaml, /no_writes_performed: false/);
});

// ---------- findCaoVerdictComment ----------

test("findCaoVerdictComment picks the most recent CAO verdict", () => {
  const older = {
    id: "old",
    created_at: "2026-05-01T00:00:00Z",
    comment_html: '<p><strong>controller.verdict (cao-v0)</strong></p><pre><code>controller.verdict:\n  verdict: REJECT\n</code></pre>',
  };
  const newer = {
    id: "new",
    created_at: "2026-05-09T00:00:00Z",
    comment_html: '<p><strong>controller.verdict (cao-v0)</strong></p><pre><code>controller.verdict:\n  verdict: PASS\n  cao_session_id: sid-1\n</code></pre>',
  };
  const r = findCaoVerdictComment([older, newer]);
  assert.equal(r.verdict, "PASS");
  assert.equal(r.comment_id, "new");
  assert.equal(r.cao_session_id, "sid-1");
});

test("findCaoVerdictComment returns null if no CAO verdict comment present", () => {
  const r = findCaoVerdictComment([{ id: "x", comment_html: "<p>nope</p>" }]);
  assert.equal(r, null);
});

test("findHumanGateReleaseComment requires exact marker title and picks latest", () => {
  const proseOnly = {
    id: "prose",
    created_at: "2026-05-08T00:00:00Z",
    comment_html: "<p>worker.reported mentioned human_gate.released in prose only.</p>",
  };
  const older = {
    id: "old-release",
    created_at: "2026-05-08T01:00:00Z",
    comment_html: '<p><strong>human_gate.released</strong></p><pre><code>human_gate.released:\n  level: HG-4\n  released_by: Founder\n  scope: old\n</code></pre>',
  };
  const newer = {
    id: "new-release",
    created_at: "2026-05-08T02:00:00Z",
    comment_html: '<p><strong>human_gate.released</strong></p><pre><code>human_gate.released:\n  human_gate_level: HG-4\n  released_by: Mathias Heinke\n  tenant_scope: ARES-private-only\n</code></pre>',
  };
  const r = findHumanGateReleaseComment([proseOnly, older, newer]);
  assert.equal(r.comment_id, "new-release");
  assert.equal(r.released_by, "Mathias Heinke");
  assert.equal(r.level, "HG-4");
  assert.equal(r.scope, "ARES-private-only");
});
