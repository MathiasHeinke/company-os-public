import assert from "node:assert/strict";
import test from "node:test";

import {
  HG_35_REJECT_TEMPLATE,
  HG_35_SIGN_TEMPLATE,
  ITEM_KIND,
  NO_TOKEN_MARKER,
  QUEUE_PRIMARY_CAP,
  buildHg3RejectTemplate,
  buildHg3SignTemplate,
  buildQueueModel,
  buildRejectTemplateFor,
  buildSignTemplateFor,
  classifyItemForQueue,
  findLatestCaoVerdict,
  findLatestControllerDecision,
  findLatestHumanGateRelease,
  findLatestWorkerReported,
  parseFounderProxySign,
  parseHg3FounderSign,
  parseIndentedBlock,
  redactSecrets,
  renderQueueJson,
  renderQueueMarkdown,
} from "./founder-daily-queue-core.mjs";

// ---------- Fixture helpers ----------

function fencedContract(yaml) {
  return [
    "Some description prose.",
    "",
    "```yaml",
    yaml.trim(),
    "```",
  ].join("\n");
}

function hg4ContractYaml({ role = "role:coo" } = {}) {
  return `role: ${role}
parent_seat: ${role}
agent: claude
mode: implement
workspace: companyos
dispatch: ready
source_of_truth:
  - docs/governance/human-gate-levels.md
acceptance_criteria:
  - Founder decides
gates:
  - founder sign required before dispatcher lock
human_gate: HG-4
reporting: Plane worker.reported`;
}

function hg35ContractYaml({ role = "role:coo", artifact = "reports/runs/2026-05-13/artifact.md" } = {}) {
  return `role: ${role}
parent_seat: ${role}
agent: claude
mode: implement
workspace: companyos
dispatch: ready
source_of_truth:
  - docs/governance/human-gate-levels.md
acceptance_criteria:
  - Pause at stage 5
gates:
  - node --test scripts/orchestration/cao-pass.test.mjs
human_gate: HG-3.5
hg35_pause_artifact: ${artifact}
reporting: Plane worker.reported`;
}

function hg2ContractYaml() {
  return `role: role:cto
parent_seat: role:cto
agent: claude
mode: implement
workspace: companyos
dispatch: ready
source_of_truth:
  - docs/governance/human-gate-levels.md
acceptance_criteria:
  - lint passes
gates:
  - pnpm lint
human_gate: HG-2
reporting: Plane worker.reported`;
}

function buildItem({ sequence_id, name, updated_at, contractYaml }) {
  const description = fencedContract(contractYaml);
  return {
    id: `item-${sequence_id}`,
    sequence_id,
    name,
    updated_at,
    description_html: `<pre><code>${description}</code></pre>`,
  };
}

function caoVerdictComment({ verdict = "PARK", hg35 = null, created_at, id = "cao-1" } = {}) {
  const hg35Block = hg35
    ? [
      "hg35:",
      `  pause_artifact: ${hg35.pause_artifact || "null"}`,
      `  awaiting_sign: ${hg35.awaiting_sign === undefined ? "true" : hg35.awaiting_sign}`,
      `  sign_comment_id: ${hg35.sign_comment_id || "null"}`,
    ].join("\n")
    : "";
  const body = [
    "controller.verdict:",
    `  verdict: ${verdict}`,
    hg35Block,
  ].filter(Boolean).join("\n");
  return {
    id,
    created_at: created_at || "2026-05-13T08:00:00Z",
    comment_html: `<p><strong>controller.verdict (cao-v0)</strong></p><pre><code>${body}</code></pre>`,
  };
}

function workerReportComment({ state = "NEEDS_HUMAN", reason = "hg35-pause-pending", hg35 = null, created_at, id = "rep-1" } = {}) {
  const hg35Block = hg35
    ? [
      "hg35:",
      `  pause_artifact: ${hg35.pause_artifact || "null"}`,
      `  awaiting_sign: ${hg35.awaiting_sign === undefined ? "true" : hg35.awaiting_sign}`,
      `  sign_comment_id: ${hg35.sign_comment_id || "null"}`,
    ].join("\n")
    : "";
  const body = [
    "version: dispatcher-v1.2",
    `state: ${state}`,
    `reason: ${reason}`,
    hg35Block,
  ].filter(Boolean).join("\n");
  return {
    id,
    created_at: created_at || "2026-05-13T07:30:00Z",
    comment_html: `<p><strong>worker.reported</strong></p><pre><code>${body}</code></pre>`,
  };
}

function controllerDecisionComment({ decisionMode = "AUTO-GO", created_at, id = "dec-1" } = {}) {
  const body = [
    "controller.decision:",
    `  decision_mode: ${decisionMode}`,
    "  reason: confidence-meets-threshold",
  ].join("\n");
  return {
    id,
    created_at: created_at || "2026-05-13T09:00:00Z",
    comment_html: `<p><strong>controller.decision (codex-controller-v0)</strong></p><pre><code>${body}</code></pre>`,
  };
}

function humanGateReleaseComment({ created_at, id = "release-1" } = {}) {
  return {
    id,
    created_at: created_at || "2026-05-13T07:00:00Z",
    comment_html: "<p><strong>human_gate.released</strong></p><pre><code>work_item: [WORK_ITEM_ID]</code></pre>",
  };
}

// ---------- Templates round-trip ----------

test("HG-3.5 sign template is byte-stable and round-trips through parser", () => {
  assert.equal(HG_35_SIGN_TEMPLATE.startsWith("controller.founder-proxy-sign:"), true);
  const parsed = parseFounderProxySign(HG_35_SIGN_TEMPLATE);
  assert.equal(parsed.verdict, "APPROVE");
  assert.equal(parsed.sign_comment_id, "<plane comment id>");
  assert.equal(parsed.signed_at, "<ISO-8601>");
});

test("HG-3.5 reject template round-trips with verdict REJECT", () => {
  const parsed = parseFounderProxySign(HG_35_REJECT_TEMPLATE);
  assert.equal(parsed.verdict, "REJECT");
  assert.equal(parsed.reason, "<short proxy reason>");
});

test("HG-4 sign template carries the sequence id and round-trips", () => {
  const tpl = buildHg3SignTemplate("[WORK_ITEM_ID]");
  assert.match(tpl, /^founder\.sign:/m);
  const parsed = parseHg3FounderSign(tpl);
  assert.equal(parsed.work_item, "[WORK_ITEM_ID]");
  assert.equal(parsed.verdict, "APPROVE");
});

test("HG-4 reject template round-trips with verdict REJECT and a reason placeholder", () => {
  const tpl = buildHg3RejectTemplate("[WORK_ITEM_ID]");
  const parsed = parseHg3FounderSign(tpl);
  assert.equal(parsed.verdict, "REJECT");
  assert.equal(parsed.reason, "<short founder reason>");
});

test("parseFounderProxySign returns null on missing block", () => {
  assert.equal(parseFounderProxySign("nothing here"), null);
});

test("parseHg3FounderSign returns null on missing block", () => {
  assert.equal(parseHg3FounderSign("nothing here"), null);
});

// ---------- Indented block parser ----------

test("parseIndentedBlock extracts a nested hg35 block with boolean coercion", () => {
  const body = [
    "header: ok",
    "hg35:",
    "  pause_artifact: reports/runs/2026-05-13/p.md",
    "  awaiting_sign: true",
    "  sign_comment_id: null",
    "other: ignored",
  ].join("\n");
  const result = parseIndentedBlock(body, "hg35");
  assert.deepEqual(result, {
    pause_artifact: "reports/runs/2026-05-13/p.md",
    awaiting_sign: true,
    sign_comment_id: null,
  });
});

test("parseIndentedBlock returns null when the header is absent", () => {
  assert.equal(parseIndentedBlock("header: ok", "hg35"), null);
});

// ---------- Comment scanners ----------

test("findLatestCaoVerdict picks the most recent PARK with hg35 block", () => {
  const cao = findLatestCaoVerdict([
    caoVerdictComment({ verdict: "REJECT", created_at: "2026-05-12T08:00:00Z", id: "cao-0" }),
    caoVerdictComment({
      verdict: "PARK",
      created_at: "2026-05-13T08:00:00Z",
      hg35: { pause_artifact: "p.md", awaiting_sign: true },
    }),
  ]);
  assert.equal(cao.verdict, "PARK");
  assert.equal(cao.hg35.pause_artifact, "p.md");
  assert.equal(cao.hg35.awaiting_sign, true);
});

test("findLatestControllerDecision returns null when no decision is posted", () => {
  assert.equal(findLatestControllerDecision([]), null);
});

test("findLatestHumanGateRelease picks the latest release comment", () => {
  const release = findLatestHumanGateRelease([
    humanGateReleaseComment({ id: "release-old", created_at: "2026-05-13T06:00:00Z" }),
    humanGateReleaseComment({ id: "release-new", created_at: "2026-05-13T07:00:00Z" }),
  ]);
  assert.equal(release.comment_id, "release-new");
});

test("findLatestHumanGateRelease ignores prose quotes of the release marker", () => {
  const release = findLatestHumanGateRelease([
    {
      id: "quote",
      created_at: "2026-05-13T07:00:00Z",
      comment_html: "<p>worker.reported mentioned human_gate.released in prose only.</p>",
    },
  ]);
  assert.equal(release, null);
});

test("findLatestWorkerReported extracts state + reason + hg35", () => {
  const r = findLatestWorkerReported([
    workerReportComment({
      hg35: { pause_artifact: "reports/runs/2026-05-13/p.md", awaiting_sign: true },
    }),
  ]);
  assert.equal(r.state, "NEEDS_HUMAN");
  assert.equal(r.reason, "hg35-pause-pending");
  assert.equal(r.hg35.awaiting_sign, true);
});

// ---------- Classifier ----------

test("classifyItemForQueue returns null for HG-2 items", () => {
  const result = classifyItemForQueue({
    item: buildItem({ sequence_id: 1, name: "Skip me", updated_at: "2026-05-13T00:00:00Z", contractYaml: hg2ContractYaml() }),
    comments: [],
    labelNames: ["role:cto"],
  });
  assert.equal(result, null);
});

test("classifyItemForQueue picks an HG-4 item without a controller.decision", () => {
  const result = classifyItemForQueue({
    item: buildItem({ sequence_id: 2, name: "HG-4 ask", updated_at: "2026-05-13T00:00:00Z", contractYaml: hg4ContractYaml() }),
    comments: [],
    labelNames: ["role:coo"],
  });
  assert.equal(result.kind, ITEM_KIND.HG_4_DISPATCH_BLOCKED);
  assert.equal(result.sequence, "[WORK_ITEM_ID]");
  assert.equal(result.contract_human_gate, "HG-4");
  assert.equal(result.role, "role:coo");
});

test("classifyItemForQueue treats released HG-4 item with report as review-required", () => {
  const result = classifyItemForQueue({
    item: buildItem({ sequence_id: 228, name: "Claim gate", updated_at: "2026-05-13T00:00:00Z", contractYaml: hg4ContractYaml({ role: "role:cao" }) }),
    comments: [
      humanGateReleaseComment(),
      workerReportComment({ state: "NEEDS_HUMAN", reason: "hg3-mandatory-per-contract" }),
    ],
    labelNames: ["role:cao"],
  });
  assert.equal(result.kind, ITEM_KIND.HG_4_REVIEW_REQUIRED);
  assert.equal(result.sequence, "[WORK_ITEM_ID]");
  assert.equal(result.ask, "Review completed HG-4 artifact and sign or reject");
  assert.equal(result.evidence.human_gate_release, "release-1");
  assert.equal(result.evidence.report_state, "NEEDS_HUMAN");
});

test("classifyItemForQueue does not review released HG-4 item with non-HG report", () => {
  const result = classifyItemForQueue({
    item: buildItem({ sequence_id: 228, name: "Claim gate", updated_at: "2026-05-13T00:00:00Z", contractYaml: hg4ContractYaml({ role: "role:cao" }) }),
    comments: [
      humanGateReleaseComment(),
      workerReportComment({ state: "PASS", reason: "normal-pass" }),
    ],
    labelNames: ["role:cao"],
  });
  assert.equal(result, null);
});

test("classifyItemForQueue skips released HG-4 item until a worker report lands", () => {
  const result = classifyItemForQueue({
    item: buildItem({ sequence_id: 229, name: "Released not run", updated_at: "2026-05-13T00:00:00Z", contractYaml: hg4ContractYaml() }),
    comments: [humanGateReleaseComment()],
    labelNames: ["role:coo"],
  });
  assert.equal(result, null);
});

test("classifyItemForQueue drops HG-4 items once a controller.decision is posted", () => {
  const result = classifyItemForQueue({
    item: buildItem({ sequence_id: 3, name: "HG-4 done", updated_at: "2026-05-13T00:00:00Z", contractYaml: hg4ContractYaml() }),
    comments: [
      humanGateReleaseComment(),
      workerReportComment({ state: "NEEDS_HUMAN", reason: "hg3-mandatory-per-contract" }),
      controllerDecisionComment({ decisionMode: "ASK-FOUNDER" }),
    ],
    labelNames: ["role:coo"],
  });
  assert.equal(result, null);
});

test("classifyItemForQueue admits an HG-3.5 item with CAO PARK and awaiting_sign", () => {
  const result = classifyItemForQueue({
    item: buildItem({
      sequence_id: 4,
      name: "HG-3.5 pause",
      updated_at: "2026-05-13T00:00:00Z",
      contractYaml: hg35ContractYaml({ artifact: "reports/runs/2026-05-13/p.md" }),
    }),
    comments: [
      workerReportComment({
        hg35: { pause_artifact: "reports/runs/2026-05-13/p.md", awaiting_sign: true },
      }),
      caoVerdictComment({
        verdict: "PARK",
        hg35: { pause_artifact: "reports/runs/2026-05-13/p.md", awaiting_sign: true },
      }),
    ],
    labelNames: ["role:cmo"],
  });
  assert.equal(result.kind, ITEM_KIND.HG_35_AWAITING_RESUME);
  assert.equal(result.pause_artifact, "reports/runs/2026-05-13/p.md");
});

test("classifyItemForQueue skips HG-3.5 items that are not awaiting sign", () => {
  const result = classifyItemForQueue({
    item: buildItem({
      sequence_id: 5,
      name: "HG-3.5 not paused",
      updated_at: "2026-05-13T00:00:00Z",
      contractYaml: hg35ContractYaml({ artifact: "reports/runs/2026-05-13/p.md" }),
    }),
    comments: [],
    labelNames: ["role:cmo"],
  });
  assert.equal(result, null);
});

test("classifyItemForQueue tolerates malformed contract block with no human_gate", () => {
  const item = {
    id: "weird",
    sequence_id: 6,
    name: "no contract",
    description_html: "<p>just prose, no contract block</p>",
  };
  const result = classifyItemForQueue({ item, comments: [], labelNames: ["role:coo"] });
  assert.equal(result, null);
});

// ---------- buildQueueModel: cap, overflow, empty, malformed ----------

function pendingHg4Record(seq, updated) {
  return {
    item: buildItem({
      sequence_id: seq,
      name: `HG-4 item ${seq}`,
      updated_at: updated,
      contractYaml: hg4ContractYaml(),
    }),
    comments: [],
    labelNames: ["role:coo"],
  };
}

function pendingHg35Record(seq, updated) {
  return {
    item: buildItem({
      sequence_id: seq,
      name: `HG-3.5 item ${seq}`,
      updated_at: updated,
      contractYaml: hg35ContractYaml({ artifact: `reports/runs/2026-05-13/p-${seq}.md` }),
    }),
    comments: [
      workerReportComment({
        hg35: { pause_artifact: `reports/runs/2026-05-13/p-${seq}.md`, awaiting_sign: true },
        id: `rep-${seq}`,
      }),
      caoVerdictComment({
        verdict: "PARK",
        hg35: { pause_artifact: `reports/runs/2026-05-13/p-${seq}.md`, awaiting_sign: true },
        id: `cao-${seq}`,
      }),
    ],
    labelNames: ["role:cmo"],
  };
}

test("buildQueueModel caps primary at QUEUE_PRIMARY_CAP and emits overflow warning", () => {
  const records = [];
  for (let i = 0; i < 13; i += 1) {
    records.push(pendingHg4Record(100 + i, `2026-05-1${i % 9}T00:00:00Z`));
  }
  const model = buildQueueModel({ records, date: "2026-05-13" });
  assert.equal(model.primary.length, QUEUE_PRIMARY_CAP);
  assert.equal(model.overflow.length, 3);
  assert.equal(model.warnings.some((w) => /Overflow/.test(w)), true);
});

test("buildQueueModel produces deterministic output across two runs", () => {
  const records = [
    pendingHg35Record(401, "2026-05-13T01:00:00Z"),
    pendingHg4Record(402, "2026-05-13T02:00:00Z"),
    pendingHg4Record(403, "2026-05-13T01:30:00Z"),
  ];
  const m1 = buildQueueModel({ records, date: "2026-05-13" });
  const m2 = buildQueueModel({ records, date: "2026-05-13" });
  assert.equal(renderQueueMarkdown(m1), renderQueueMarkdown(m2));
});

test("renderQueueMarkdown: empty queue produces Inbox Zero with no warnings", () => {
  const model = buildQueueModel({ records: [], date: "2026-05-13" });
  const md = renderQueueMarkdown(model);
  assert.match(md, /## Inbox Zero/);
  assert.equal(model.warnings.length, 0);
  assert.doesNotMatch(md, /## Warnings/);
});

test("buildQueueModel records malformed Plane records and surfaces a warning", () => {
  const records = [
    pendingHg4Record(500, "2026-05-13T00:00:00Z"),
    null, // record-not-object
    { item: undefined }, // missing-item
  ];
  const model = buildQueueModel({ records, date: "2026-05-13" });
  assert.equal(model.malformed.length, 2);
  assert.equal(model.warnings.some((w) => /malformed/i.test(w)), true);
  assert.equal(model.primary.length, 1);
});

test("buildQueueModel sorts HG-4 ahead of HG-3.5 and oldest first within a kind", () => {
  const records = [
    pendingHg35Record(601, "2026-05-13T05:00:00Z"),
    pendingHg4Record(602, "2026-05-13T03:00:00Z"),
    pendingHg4Record(603, "2026-05-13T01:00:00Z"),
  ];
  const model = buildQueueModel({ records, date: "2026-05-13" });
  assert.equal(model.primary[0].sequence, "[WORK_ITEM_ID]");
  assert.equal(model.primary[1].sequence, "[WORK_ITEM_ID]");
  assert.equal(model.primary[2].sequence, "[WORK_ITEM_ID]");
});

test("buildQueueModel sorts HG-4 review-required ahead of dispatch-blocked items", () => {
  const model = buildQueueModel({
    records: [
      pendingHg4Record(901, "2026-05-13T01:00:00Z"),
      {
        item: buildItem({
          sequence_id: 902,
          name: "Review required",
          updated_at: "2026-05-13T02:00:00Z",
          contractYaml: hg4ContractYaml({ role: "role:cao" }),
        }),
        comments: [
          humanGateReleaseComment(),
          workerReportComment({ state: "NEEDS_HUMAN", reason: "hg3-mandatory-per-contract" }),
        ],
        labelNames: ["role:cao"],
      },
    ],
    date: "2026-05-13",
  });

  assert.equal(model.primary[0].sequence, "[WORK_ITEM_ID]");
  assert.equal(model.primary[0].kind, ITEM_KIND.HG_4_REVIEW_REQUIRED);
  assert.equal(model.primary[1].kind, ITEM_KIND.HG_4_DISPATCH_BLOCKED);
});

test("buildQueueModel throws when called without an explicit date", () => {
  assert.throws(() => buildQueueModel({ records: [] }), /requires an explicit date/);
});

// ---------- Rendering ----------

test("renderQueueMarkdown wires the right templates per kind", () => {
  const records = [
    pendingHg4Record(701, "2026-05-13T01:00:00Z"),
    pendingHg35Record(702, "2026-05-13T02:00:00Z"),
  ];
  const model = buildQueueModel({ records, date: "2026-05-13" });
  const md = renderQueueMarkdown(model);
  assert.match(md, /founder\.sign:\n {2}work_item: [WORK_ITEM_ID]/);
  assert.match(md, /controller\.founder-proxy-sign:\n {2}verdict: APPROVE/);
  assert.match(md, new RegExp(NO_TOKEN_MARKER));
});

test("renderQueueMarkdown renders HG-4 review-required items with founder sign templates", () => {
  const model = buildQueueModel({
    records: [{
      item: buildItem({
        sequence_id: 228,
        name: "Claim gate",
        updated_at: "2026-05-13T00:00:00Z",
        contractYaml: hg4ContractYaml({ role: "role:cao" }),
      }),
      comments: [
        humanGateReleaseComment(),
        workerReportComment({ state: "NEEDS_HUMAN", reason: "hg3-mandatory-per-contract" }),
      ],
      labelNames: ["role:cao"],
    }],
    date: "2026-05-13",
  });
  const md = renderQueueMarkdown(model);

  assert.match(md, /kind: HG-4-review-required/);
  assert.match(md, /ask: Review completed HG-4 artifact and sign or reject/);
  assert.match(md, /founder\.sign:\n {2}work_item: [WORK_ITEM_ID]/);
});

test("buildSignTemplateFor and buildRejectTemplateFor dispatch by kind", () => {
  const hg3 = { kind: ITEM_KIND.HG_4_DISPATCH_BLOCKED, sequence: "[WORK_ITEM_ID]" };
  const hg35 = { kind: ITEM_KIND.HG_35_AWAITING_RESUME, sequence: "[WORK_ITEM_ID]" };
  assert.equal(buildSignTemplateFor(hg3), buildHg3SignTemplate("[WORK_ITEM_ID]"));
  assert.equal(buildRejectTemplateFor(hg3), buildHg3RejectTemplate("[WORK_ITEM_ID]"));
  assert.equal(buildSignTemplateFor(hg35), HG_35_SIGN_TEMPLATE);
  assert.equal(buildRejectTemplateFor(hg35), HG_35_REJECT_TEMPLATE);
});

test("renderQueueJson summarizes counts and never includes raw item description", () => {
  const records = [pendingHg4Record(801, "2026-05-13T00:00:00Z")];
  const model = buildQueueModel({ records, date: "2026-05-13" });
  const json = renderQueueJson(model);
  assert.equal(json.primary_count, 1);
  assert.equal(json.overflow_count, 0);
  assert.equal(json.marker, NO_TOKEN_MARKER);
  assert.equal("description_html" in json.primary[0], false);
});

// ---------- Secret redaction ----------

test("redactSecrets scrubs token-shaped values", () => {
  const samples = [
    "Authorization: Bearer abcdefghijklmnopqrstuvwxyzABCDEFG",
    "sk_live_AbCdEfGhIjKlMnOp012345",
    "[GITHUB_PAT_EXAMPLE]",
    "[SLACK_BOT_TOKEN_EXAMPLE]",
    "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  ];
  for (const sample of samples) {
    assert.equal(/<redacted>/.test(redactSecrets(sample)), true, `expected <redacted> for ${sample}`);
  }
});

test("queue artifact never contains token-shaped strings even when source comments do", () => {
  const tokenedReport = workerReportComment({
    hg35: { pause_artifact: "reports/runs/2026-05-13/p.md", awaiting_sign: true },
  });
  // Inject a token-shaped value into the work item title; the classifier sanitizes it.
  const record = {
    item: buildItem({
      sequence_id: 999,
      name: "HG-3.5 with leaked Bearer abcdefghijklmnopqrstuvwxyzABCDEFG token",
      updated_at: "2026-05-13T00:00:00Z",
      contractYaml: hg35ContractYaml({ artifact: "reports/runs/2026-05-13/p.md" }),
    }),
    comments: [
      tokenedReport,
      caoVerdictComment({
        verdict: "PARK",
        hg35: { pause_artifact: "reports/runs/2026-05-13/p.md", awaiting_sign: true },
      }),
    ],
    labelNames: ["role:cmo"],
  };
  const model = buildQueueModel({ records: [record], date: "2026-05-13" });
  const md = renderQueueMarkdown(model);
  assert.doesNotMatch(md, /Bearer\s+[A-Za-z0-9._-]{20,}/);
  assert.match(md, /<redacted>/);
});
