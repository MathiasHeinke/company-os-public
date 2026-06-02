import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";

import { parseHg35Block, runCaoPass } from "./cao-pass.mjs";
import { canonicalDescriptionHash } from "./plane-html.mjs";

function legacySha256(s) { return createHash("sha256").update(s || "", "utf8").digest("hex"); }

const VALID_CONTRACT = `\`\`\`yaml
role: role:cto
parent_seat: none
agent: claude
mode: implement
workspace: companyos
dispatch: ready
source_of_truth:
  - /abs/a.md
acceptance_criteria:
  - tests green
gates:
  - git diff --check
human_gate: HG-2
reporting: comment
BlockedActions: do not merge / never push.
\`\`\``;

function makeItem(overrides = {}) {
  const base = {
    id: "item-uuid-1",
    sequence_id: 99,
    name: "Test Item",
    description_html: VALID_CONTRACT,
  };
  return Object.assign({}, base, overrides);
}

function makeLockComment(item, { runId = "run-1", role = "role:cto", expiresAt, hash, createdAt } = {}) {
  const descHash = hash || canonicalDescriptionHash(item);
  const expires = expiresAt || new Date(Date.now() + 60_000).toISOString();
  const body = [
    "<p><strong>worker.lock (dispatcher-v0)</strong></p>",
    "<pre><code>worker.lock:",
    "  version: dispatcher-v0",
    `  parent_id: ${item.id}`,
    `  parent_sequence: COMPA-${item.sequence_id}`,
    `  role: ${role}`,
    "  parent_seat: none",
    "  agent: claude",
    "  mode: implement",
    "  workspace: companyos",
    "  dispatch: ready",
    `  expires_at: ${expires}`,
    `  dispatcher_run_id: ${runId}`,
    "  hash:",
    `    description: ${descHash}`,
    "    labels: 0",
    "</code></pre>",
  ].join("\n");
  return { id: "lock-c1", created_at: createdAt || new Date().toISOString(), comment_html: body };
}

function makeContextComment() {
  return {
    id: "ctx-c1",
    created_at: new Date().toISOString(),
    comment_html: "<p><strong>worker.context (dispatcher-v0)</strong></p><pre><code># Worker Context\n</code></pre>",
  };
}

function makeReportComment(overrides = {}) {
  const state = `state: ${overrides.state || "PASS"}\n`;
  const versionLine = overrides.version ? `version: ${overrides.version}\n` : "";
  const reflectionBlock = overrides.reflection === false ? "" : (overrides.reflection || "");
  const learningBlock = overrides.learningProposals === false ? "" : (overrides.learningProposals || "");
  const body = `${versionLine}${state}files: a, b\n${reflectionBlock}${learningBlock}`;
  return {
    id: overrides.id || "rep-c1",
    created_at: overrides.created_at || new Date().toISOString(),
    comment_html: `<p><strong>worker.reported</strong></p><pre><code>${body}</code></pre>`,
  };
}

const REFLECTION_BLOCK = `reflection:
  summary: scope-guard caught read drift on attempt 2; runtime fix unblocked attempt 3
  confidence: 0.92
  blast_radius: small
`;
const LEARNING_BLOCK = `learning_proposals:
  - target: cao-pass.mjs
    proposal: gate reflection enforcement by dispatcher version
`;

test("runCaoPass PASS when lock+context+report present, hash unchanged, validator green", () => {
  const item = makeItem();
  const lock = makeLockComment(item);
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [lock, makeContextComment(), makeReportComment()],
  });
  assert.equal(verdict.verdict, "PASS", JSON.stringify(verdict.reason_codes));
  assert.deepEqual(verdict.reason_codes, []);
  assert.equal(verdict.next_state, "ceo:review");
});

test("runCaoPass PASS for pre-canonical legacy raw description hash", () => {
  const item = makeItem();
  const lock = makeLockComment(item, { hash: legacySha256(item.description_html) });
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [lock, makeContextComment(), makeReportComment()],
  });
  assert.equal(verdict.verdict, "PASS", JSON.stringify(verdict.reason_codes));
  assert.equal(verdict.evidence.description.match, true);
});

test("runCaoPass REJECT cao.lock-missing when no worker.lock comment", () => {
  const item = makeItem();
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [makeContextComment(), makeReportComment()],
  });
  assert.equal(verdict.verdict, "REJECT");
  assert.ok(verdict.reason_codes.includes("cao.lock-missing"));
});

test("runCaoPass REJECT cao.report-missing when no worker.reported", () => {
  const item = makeItem();
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [makeLockComment(item), makeContextComment()],
  });
  assert.equal(verdict.verdict, "REJECT");
  assert.ok(verdict.reason_codes.includes("cao.report-missing"));
});

test("runCaoPass REJECT cao.report-non-pass when worker reported NEEDS_HUMAN", () => {
  const item = makeItem();
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [makeLockComment(item), makeContextComment(), makeReportComment({ state: "NEEDS_HUMAN" })],
  });
  assert.equal(verdict.verdict, "REJECT");
  assert.ok(verdict.reason_codes.includes("cao.report-non-pass"));
});

test("runCaoPass REJECT cao.report-duplicate when multiple worker.reported comments exist", () => {
  const item = makeItem();
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [makeLockComment(item), makeContextComment(), makeReportComment(), {
      ...makeReportComment(),
      id: "rep-c2",
    }],
  });
  assert.equal(verdict.verdict, "REJECT");
  assert.ok(verdict.reason_codes.includes("cao.report-duplicate"));
});

test("runCaoPass PASS when latest PASS supersedes failed retry reports under the same lock", () => {
  const item = makeItem();
  const lock = makeLockComment(item, {
    createdAt: "2030-01-01T00:00:00.000Z",
    expiresAt: "2030-01-01T01:00:00.000Z",
  });
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [
      lock,
      makeContextComment(),
      makeReportComment({ id: "rep-retry-1", state: "NEEDS_HUMAN", created_at: "2030-01-01T00:01:00.000Z" }),
      makeReportComment({ id: "rep-retry-2", state: "RUNTIME_ERROR", created_at: "2030-01-01T00:02:00.000Z" }),
      makeReportComment({ id: "rep-pass", state: "PASS", created_at: "2030-01-01T00:03:00.000Z" }),
    ],
    now: new Date("2030-01-01T00:04:00.000Z"),
  });
  assert.equal(verdict.verdict, "PASS", JSON.stringify(verdict.reason_codes));
  assert.deepEqual(verdict.reason_codes, []);
  assert.equal(verdict.evidence.report.comment_id, "rep-pass");
  assert.equal(verdict.evidence.report_selection.policy, "latest-pass-supersedes-failed-retries");
  assert.equal(verdict.evidence.report_selection.superseded_count, 2);
});

test("runCaoPass REJECT when duplicate worker.reported comments include earlier PASS", () => {
  const item = makeItem();
  const lock = makeLockComment(item, {
    createdAt: "2030-01-01T00:00:00.000Z",
    expiresAt: "2030-01-01T01:00:00.000Z",
  });
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [
      lock,
      makeContextComment(),
      makeReportComment({ id: "rep-pass-1", state: "PASS", created_at: "2030-01-01T00:01:00.000Z" }),
      makeReportComment({ id: "rep-pass-2", state: "PASS", created_at: "2030-01-01T00:02:00.000Z" }),
    ],
    now: new Date("2030-01-01T00:04:00.000Z"),
  });
  assert.equal(verdict.verdict, "REJECT");
  assert.ok(verdict.reason_codes.includes("cao.report-duplicate"));
});

test("runCaoPass ignores stale worker.reported comments before current lock", () => {
  const item = makeItem();
  const lock = makeLockComment(item, {
    createdAt: "2030-01-01T00:00:00.000Z",
    expiresAt: "2030-01-01T01:00:00.000Z",
  });
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [
      makeReportComment({ id: "rep-old", created_at: "2029-12-31T23:59:59.000Z" }),
      lock,
      makeContextComment(),
      makeReportComment({ id: "rep-current", created_at: "2030-01-01T00:00:01.000Z" }),
    ],
    now: new Date("2029-12-31T12:00:00.000Z"),
  });
  assert.equal(verdict.verdict, "PASS", JSON.stringify(verdict.reason_codes));
  assert.deepEqual(verdict.reason_codes, []);
  assert.equal(verdict.evidence.report_count, 1);
  assert.equal(verdict.evidence.report.comment_id, "rep-current");
  assert.equal(verdict.evidence.report_scope, "after-current-lock");
});

test("runCaoPass does not count worker.context mentions as worker.reported deliveries", () => {
  const item = makeItem();
  const context = {
    ...makeContextComment(),
    comment_html: "<p><strong>worker.context (dispatcher-v0)</strong></p><pre><code>Report exactly one worker.reported payload.</code></pre>",
  };
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [makeLockComment(item), context, makeReportComment()],
  });
  assert.equal(verdict.verdict, "PASS", JSON.stringify(verdict.reason_codes));
  assert.equal(verdict.evidence.report_count, 1);
});

test("runCaoPass REJECT cao.context-missing when no worker.context", () => {
  const item = makeItem();
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [makeLockComment(item), makeReportComment()],
  });
  assert.equal(verdict.verdict, "REJECT");
  assert.ok(verdict.reason_codes.includes("cao.context-missing"));
});

test("runCaoPass REJECT cao.description-hash-changed when description mutated post-lock", () => {
  const item = makeItem();
  // Lock against original hash
  const lock = makeLockComment(item);
  // Mutate description after lock
  item.description_html = item.description_html + "\n<p>Sneaky edit.</p>";
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [lock, makeContextComment(), makeReportComment()],
  });
  assert.equal(verdict.verdict, "REJECT");
  assert.ok(verdict.reason_codes.includes("cao.description-hash-changed"));
});

test("runCaoPass REJECT cao.lock-expired when expires_at in past", () => {
  const item = makeItem();
  const past = new Date(Date.now() - 60_000).toISOString();
  const lock = makeLockComment(item, { expiresAt: past });
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [lock, makeContextComment(), makeReportComment()],
  });
  assert.equal(verdict.verdict, "REJECT");
  assert.ok(verdict.reason_codes.includes("cao.lock-expired"));
});

test("runCaoPass REJECT cao.role-label-changed when label drifted since lock", () => {
  const item = makeItem();
  const lock = makeLockComment(item, { role: "role:cto" });
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cpo"],
    comments: [lock, makeContextComment(), makeReportComment()],
  });
  assert.equal(verdict.verdict, "REJECT");
  // contract.role-field-label-mismatch is from the validator; CAO additionally records role-label-changed.
  assert.ok(verdict.reason_codes.includes("cao.role-label-changed"));
});

test("runCaoPass REJECT cao.contract-validator-fail when description block invalid", () => {
  const item = makeItem({ description_html: "<p>No fenced contract</p>" });
  const lock = makeLockComment(item);
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [lock, makeContextComment(), makeReportComment()],
  });
  assert.equal(verdict.verdict, "REJECT");
  assert.ok(verdict.reason_codes.includes("cao.contract-validator-fail"));
});

test("runCaoPass historic report without dispatcher version stays PASS (backwards compat)", () => {
  const item = makeItem();
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [makeLockComment(item), makeContextComment(), makeReportComment()],
  });
  assert.equal(verdict.verdict, "PASS", JSON.stringify(verdict.reason_codes));
  assert.equal(verdict.evidence.reflection.required, false);
  assert.equal(verdict.evidence.learning_proposals.required, false);
});

test("runCaoPass dispatcher-v1.2 report without reflection -> REJECT cao.reflection-block-missing", () => {
  const item = makeItem();
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [
      makeLockComment(item),
      makeContextComment(),
      makeReportComment({ version: "dispatcher-v1.2" }),
    ],
  });
  assert.equal(verdict.verdict, "REJECT");
  assert.ok(verdict.reason_codes.includes("cao.reflection-block-missing"));
  assert.ok(verdict.reason_codes.includes("cao.learning-proposals-missing"));
  assert.equal(verdict.evidence.reflection.dispatcher_version, "dispatcher-v1.2");
});

test("runCaoPass dispatcher-v1.2 report with reflection + learning_proposals -> PASS", () => {
  const item = makeItem();
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [
      makeLockComment(item),
      makeContextComment(),
      makeReportComment({
        version: "dispatcher-v1.2",
        reflection: REFLECTION_BLOCK,
        learningProposals: LEARNING_BLOCK,
      }),
    ],
  });
  assert.equal(verdict.verdict, "PASS", JSON.stringify(verdict.reason_codes));
  assert.equal(verdict.evidence.reflection.present, true);
  assert.equal(verdict.evidence.learning_proposals.present, true);
});

test("runCaoPass dispatcher-v1.1 report without reflection stays PASS (version gate)", () => {
  const item = makeItem();
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [
      makeLockComment(item),
      makeContextComment(),
      makeReportComment({ version: "dispatcher-v1.1" }),
    ],
  });
  assert.equal(verdict.verdict, "PASS", JSON.stringify(verdict.reason_codes));
  assert.equal(verdict.evidence.reflection.required, false);
});

test("runCaoPass contract ReflectionPolicy: required enforces even on v1.1 report", () => {
  const item = makeItem({
    description_html: VALID_CONTRACT + "\n<p>ReflectionPolicy: required</p>",
  });
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [
      makeLockComment(item),
      makeContextComment(),
      makeReportComment({ version: "dispatcher-v1.1" }),
    ],
  });
  assert.equal(verdict.verdict, "REJECT");
  assert.ok(verdict.reason_codes.includes("cao.reflection-block-missing"));
  assert.equal(verdict.evidence.reflection.contract_policy, "required");
});

test("runCaoPass contract ReflectionPolicy: optional silences v1.2 default enforcement", () => {
  const item = makeItem({
    description_html: VALID_CONTRACT + "\n<p>ReflectionPolicy: optional\nLearningProposalPolicy: optional</p>",
  });
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [
      makeLockComment(item),
      makeContextComment(),
      makeReportComment({ version: "dispatcher-v1.2" }),
    ],
  });
  assert.equal(verdict.verdict, "PASS", JSON.stringify(verdict.reason_codes));
  assert.equal(verdict.evidence.reflection.contract_policy, "optional");
  assert.equal(verdict.evidence.reflection.required, false);
});

test("runCaoPass accepts snake_case reflection and learning policy fields", () => {
  const item = makeItem({
    description_html: VALID_CONTRACT + "\n<p>reflection_policy: optional\nlearning_proposal_policy: optional</p>",
  });
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [
      makeLockComment(item),
      makeContextComment(),
      makeReportComment({ version: "dispatcher-v1.2" }),
    ],
  });
  assert.equal(verdict.verdict, "PASS", JSON.stringify(verdict.reason_codes));
  assert.equal(verdict.evidence.reflection.contract_policy, "optional");
  assert.equal(verdict.evidence.learning_proposals.contract_policy, "optional");
});

const HG35_CONTRACT = `\`\`\`yaml
role: role:coo
parent_seat: none
agent: claude
mode: implement
workspace: companyos
dispatch: ready
source_of_truth:
  - /abs/a.md
acceptance_criteria:
  - Worker pauses at Stage 5 with the pause artifact authored.
gates:
  - git diff --check
human_gate: HG-3.5
hg35_pause_artifact: reports/runs/2026-05-13/founder-proxy-mirror.md
reporting: Plane worker.reported with hg35 block.
BlockedActions: do not push, never deploy.
\`\`\``;

function makeHg35Item(overrides = {}) {
  return Object.assign(
    {
      id: "item-uuid-hg35",
      sequence_id: 186,
      name: "HG-3.5 Founder-Proxy Test",
      description_html: HG35_CONTRACT,
    },
    overrides,
  );
}

function makeHg35PauseReport({
  state = "NEEDS_HUMAN",
  reason = "hg35-pause-pending",
  awaitingSign = "true",
  pauseArtifact = "reports/runs/2026-05-13/founder-proxy-mirror.md",
  signCommentId = "null",
  reflection = "reflection:\n  summary: paused at Stage 5 with the founder-proxy artifact authored\n  confidence: 0.9\n",
  learningProposals = "learning_proposals:\n  - target: cao-pass.mjs\n    proposal: PARK on well-formed HG-3.5 pause\n",
  version = "dispatcher-v1.2",
} = {}) {
  const body = [
    `version: ${version}`,
    `state: ${state}`,
    `reason: ${reason}`,
    "hg35:",
    `  pause_artifact: ${pauseArtifact}`,
    `  awaiting_sign: ${awaitingSign}`,
    `  sign_comment_id: ${signCommentId}`,
    "files: docs/governance/human-gate-levels.md",
    reflection,
    learningProposals,
  ].filter(Boolean).join("\n");
  return {
    id: "rep-hg35",
    created_at: new Date().toISOString(),
    comment_html: `<p><strong>worker.reported</strong></p><pre><code>${body}</code></pre>`,
  };
}

test("parseHg35Block captures pause_artifact, awaiting_sign and sign_comment_id sub-keys", () => {
  const body = [
    "version: dispatcher-v1.2",
    "state: NEEDS_HUMAN",
    "reason: hg35-pause-pending",
    "hg35:",
    "  pause_artifact: reports/runs/2026-05-13/x.md",
    "  awaiting_sign: true",
    "  sign_comment_id: null",
    "files: a, b",
  ].join("\n");
  const block = parseHg35Block(body);
  assert.deepEqual(block, {
    pause_artifact: "reports/runs/2026-05-13/x.md",
    awaiting_sign: true,
    sign_comment_id: null,
  });
});

test("parseHg35Block returns null when no hg35: block is present", () => {
  assert.equal(parseHg35Block("state: PASS\nfiles: a\n"), null);
});

test("runCaoPass emits PARK with cao.hg35-awaiting-sign on a well-formed founder-proxy pause", () => {
  const item = makeHg35Item();
  const verdict = runCaoPass({
    item,
    labelNames: ["role:coo"],
    comments: [makeLockComment(item, { role: "role:coo" }), makeContextComment(), makeHg35PauseReport()],
  });
  assert.equal(verdict.verdict, "PARK", JSON.stringify(verdict.reason_codes));
  assert.deepEqual(verdict.reason_codes, ["cao.hg35-awaiting-sign"]);
  assert.equal(verdict.next_state, "parked-hg35-founder-proxy-review");
  assert.equal(verdict.evidence.human_gate_level, "HG-3.5");
  assert.equal(verdict.evidence.hg35.awaiting_sign, true);
  assert.equal(verdict.evidence.hg35.pause_artifact, "reports/runs/2026-05-13/founder-proxy-mirror.md");
});

test("runCaoPass REJECTs HG-3.5 report missing the hg35 pause shape (falls through to cao.report-non-pass)", () => {
  const item = makeHg35Item();
  const verdict = runCaoPass({
    item,
    labelNames: ["role:coo"],
    comments: [
      makeLockComment(item, { role: "role:coo" }),
      makeContextComment(),
      makeReportComment({ state: "NEEDS_HUMAN" }),
    ],
  });
  assert.equal(verdict.verdict, "REJECT");
  assert.ok(verdict.reason_codes.includes("cao.report-non-pass"));
});

test("runCaoPass treats HG-3.5 pause as PARK only when other reason codes are clear", () => {
  // Same well-formed pause shape but with a lock-expired condition. PARK
  // must not silence real REJECT codes — the slice still needs founder-
  // proxy review AND a fresh lock, so REJECT wins.
  const item = makeHg35Item();
  const past = new Date(Date.now() - 60_000).toISOString();
  const verdict = runCaoPass({
    item,
    labelNames: ["role:coo"],
    comments: [
      makeLockComment(item, { role: "role:coo", expiresAt: past }),
      makeContextComment(),
      makeHg35PauseReport(),
    ],
  });
  assert.equal(verdict.verdict, "REJECT");
  assert.ok(verdict.reason_codes.includes("cao.lock-expired"));
});

test("runCaoPass treats empty reflection: block as missing", () => {
  const item = makeItem();
  const verdict = runCaoPass({
    item,
    labelNames: ["role:cto"],
    comments: [
      makeLockComment(item),
      makeContextComment(),
      makeReportComment({
        version: "dispatcher-v1.2",
        reflection: "reflection: null\n",
        learningProposals: "learning_proposals: []\n",
      }),
    ],
  });
  assert.equal(verdict.verdict, "REJECT");
  assert.ok(verdict.reason_codes.includes("cao.reflection-block-missing"));
  assert.ok(verdict.reason_codes.includes("cao.learning-proposals-missing"));
});
