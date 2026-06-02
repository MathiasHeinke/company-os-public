import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildCtoDailyEngineeringReport,
  collectCtoEngineeringSignals,
  findEngineeringBriefForDate,
  hasEngineeringBriefForDate,
  renderCtoDailyEngineeringReportMarkdown,
} from "./cto-daily-engineering-report-core.mjs";

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cto-brief-"));
}

test("collectCtoEngineeringSignals summarizes engineering reports, release artifacts and workspaces", () => {
  const root = tmpDir();
  const companyRoot = path.join(root, "Company.OS");
  fs.mkdirSync(path.join(companyRoot, "reports", "engineering", "atlas-desktop-mvp", "[WORK_ITEM_ID]"), { recursive: true });
  fs.writeFileSync(
    path.join(companyRoot, "reports", "engineering", "atlas-desktop-mvp", "[WORK_ITEM_ID]", "worker-report.md"),
    [
      "# Worker Report - [WORK_ITEM_ID] Live Lab Adapter",
      "",
      "| Field | Value |",
      "|---|---|",
      "| work_item | [WORK_ITEM_ID] |",
      "| outcome_state | PASS |",
      "",
      "## Gates",
      "",
      "| full test suite | `pnpm test` | PASS |",
      "- Live smoke verified signed-out production semantics.",
    ].join("\n"),
  );
  fs.mkdirSync(path.join(companyRoot, "reports", "releases", "2026-05-24", "atlas-desktop-mvp-hg3-pass"), { recursive: true });
  fs.writeFileSync(
    path.join(companyRoot, "reports", "releases", "2026-05-24", "atlas-desktop-mvp-hg3-pass", "hg-release.json"),
    JSON.stringify({
      schema_version: "human-gate-release/v1",
      status: "pass",
      ok: true,
      level: "HG-3",
      released_by: "Codex-GPT-5.5-xhigh",
      founder_prediction_confidence: 0.97,
      blocker_count: 0,
      check_count: 33,
      blockers: [],
      checks: [{ status: "pass", id: "artifact-truth", message: "artifact truth passed" }],
    }),
  );
  fs.mkdirSync(path.join(companyRoot, "metrics"), { recursive: true });
  fs.writeFileSync(
    path.join(companyRoot, "metrics", "agent-events.jsonl"),
    `${JSON.stringify({ type: "human_gate.released", date: "2026-05-24", status: "pass", item: "[WORK_ITEM_ID]" })}\n`,
  );

  const signals = collectCtoEngineeringSignals({
    companyRoot,
    date: "2026-05-24",
    workspaceRoots: [companyRoot],
  });

  assert.equal(signals.engineering_reports.length, 1);
  assert.equal(signals.engineering_reports[0].work_item, "[WORK_ITEM_ID]");
  assert.equal(signals.engineering_reports[0].status_class, "pass");
  assert.equal(signals.release_artifacts.length, 1);
  assert.equal(signals.release_artifacts[0].level, "HG-3");
  assert.equal(signals.release_artifacts[0].status_class, "pass");
  assert.equal(signals.workspace_states.length, 1);
  assert.equal(signals.agent_events.matching_count, 1);
});

test("renderCtoDailyEngineeringReportMarkdown emits parseable engineering.brief header", () => {
  const signals = {
    date: "2026-05-24",
    engineering_reports: [
      {
        path: "/tmp/[WORK_ITEM_ID]/worker-report.md",
        work_item: "[WORK_ITEM_ID]",
        title: "Worker Report - [WORK_ITEM_ID]",
        status: "PASS",
        status_class: "pass",
        blockers: [],
        gates: ["| full test suite | `pnpm test` | PASS |"],
      },
    ],
    release_artifacts: [
      {
        path: "/tmp/hg-release.json",
        kind: "json",
        title: "human-gate-release/v1",
        status: "pass",
        status_class: "pass",
        level: "HG-3",
        blocker_count: 0,
        check_count: 33,
        blockers: [],
      },
    ],
    workspace_states: [
      {
        workspace: "/tmp/Company.OS",
        branch: "main",
        head: "abc123",
        dirty_state: "clean",
        blocker: "",
      },
    ],
    agent_events: {
      present: true,
      path: "/tmp/metrics/agent-events.jsonl",
      matching_count: 1,
      runtime_count: 0,
      controller_count: 0,
      release_count: 1,
      blocker_count: 0,
      latest_events: [],
    },
  };

  const brief = buildCtoDailyEngineeringReport({ signals, generatedAt: "2026-05-24T18:00:00.000Z" });
  assert.equal(brief.status, "green_release_closed");
  assert.equal(brief.workspace_stewardship, "clean");

  const markdown = renderCtoDailyEngineeringReportMarkdown(brief);
  assert.match(markdown, /^engineering\.brief:/);
  assert.match(markdown, /date: 2026-05-24/);
  assert.match(markdown, /workspace_stewardship: clean/);
  assert.match(markdown, /CTO Daily Engineering Report/);
  assert.match(markdown, /[WORK_ITEM_ID]/);
  assert.match(markdown, /HG-3/);
  assert.match(markdown, /No release decision requested/);
});

test("findEngineeringBriefForDate detects existing dated Plane comments", () => {
  const comments = [
    { id: "old", comment_stripped: "engineering.brief:\n  date: 2026-05-23\n" },
    { id: "current", comment_html: "<pre>engineering.brief:\n  date: 2026-05-24\n</pre>" },
  ];
  assert.equal(hasEngineeringBriefForDate(comments, "2026-05-24"), true);
  assert.equal(findEngineeringBriefForDate(comments, "2026-05-24").id, "current");
  assert.equal(findEngineeringBriefForDate(comments, "2026-05-25"), null);
});
