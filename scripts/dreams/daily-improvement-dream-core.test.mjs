import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildDailyImprovementDream,
  collectDreamInputs,
  createDreamEvents,
  renderDailyImprovementDreamMarkdown,
  upsertMorningBriefDreamSection,
  writeDailyImprovementDream,
} from "./daily-improvement-dream-core.mjs";
import { reduceAgentEvents } from "../agent-events/agent-event-core.mjs";

function makeTmpWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "company-os-dream-test-"));
  fs.mkdirSync(path.join(root, "reports/night-shift/2026-05-07"), { recursive: true });
  fs.mkdirSync(path.join(root, "reports/runtime-auth/2026-05-07"), { recursive: true });
  fs.mkdirSync(path.join(root, "reports/agent-runs"), { recursive: true });
  fs.mkdirSync(path.join(root, "metrics"), { recursive: true });
  return root;
}

function writeFixture(root) {
  fs.writeFileSync(
    path.join(root, "reports/night-shift/2026-05-07/morning-ceo-brief.md"),
    [
      "# Morning CEO Brief - 2026-05-07",
      "",
      "## Executive Read",
      "",
      "Runtime auth is repaired, but HumanGate is still required before merge.",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(root, "reports/night-shift/2026-05-07/controller-pass.md"),
    [
      "# Controller Pass",
      "",
      "BLOCKED: Claude runtime auth failed before dispatch.",
      "Required rework: add runtime sentinel to every scheduled worker lane.",
      "DreamPolicy missing on the memory-affecting worker contract.",
      "Linear [WORK_ITEM_ID] should receive a morning-ready improvement section.",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(root, "reports/runtime-auth/2026-05-07/auth.md"),
    [
      "# Runtime Auth",
      "",
      "sentinel_output: CLAUDE_AUTH_OK",
      "Previous failure was Not logged in.",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(root, "metrics/agent-runs.jsonl"),
    `${JSON.stringify({
      agent_run_id: "run-1",
      timestamp: "2026-05-07T06:36:30+0200",
      status: "needs-human",
      verdict: "BLOCKED_RUNTIME",
      required_rework: "Restore runtime auth before dispatch.",
      linear_issue: "[WORK_ITEM_ID]",
      output_artifact: "reports/night-shift/2026-05-07/morning-ceo-brief.md",
    })}\n`,
  );
}

test("collectDreamInputs reads daily reports and dated run-ledger rows without mutating inputs", () => {
  const root = makeTmpWorkspace();
  writeFixture(root);
  const controllerPath = path.join(root, "reports/night-shift/2026-05-07/controller-pass.md");
  const before = fs.statSync(controllerPath).mtimeMs;

  const inputs = collectDreamInputs({ workspaceRoot: root, date: "2026-05-07" });

  assert.equal(fs.statSync(controllerPath).mtimeMs, before);
  assert.equal(inputs.date, "2026-05-07");
  assert.equal(inputs.artifacts.some((artifact) => artifact.path.endsWith("controller-pass.md")), true);
  assert.equal(inputs.agentRuns.length, 1);
  assert.equal(inputs.agentRuns[0].verdict, "BLOCKED_RUNTIME");
});

test("buildDailyImprovementDream turns recurring signals into proposal-only improvement actions", () => {
  const root = makeTmpWorkspace();
  writeFixture(root);
  const inputs = collectDreamInputs({ workspaceRoot: root, date: "2026-05-07" });

  const dream = buildDailyImprovementDream({
    workspaceRoot: root,
    date: "2026-05-07",
    inputs,
    issueId: "[WORK_ITEM_ID]",
  });

  assert.equal(dream.dream_policy, "proposal-only");
  assert.equal(dream.durable_write_performed, false);
  assert.equal(dream.review_required, true);
  assert.ok(dream.findings.some((finding) => finding.category === "runtime-auth"));
  assert.ok(dream.findings.some((finding) => finding.category === "memory-dream"));
  assert.ok(dream.proposals.some((proposal) => proposal.target === "worker-contract"));
  assert.ok(dream.morning_meeting.top_items.length > 0);
});

test("renderDailyImprovementDreamMarkdown produces a morning-ready review artifact", () => {
  const root = makeTmpWorkspace();
  writeFixture(root);
  const inputs = collectDreamInputs({ workspaceRoot: root, date: "2026-05-07" });
  const dream = buildDailyImprovementDream({ workspaceRoot: root, date: "2026-05-07", inputs });

  const markdown = renderDailyImprovementDreamMarkdown(dream);

  assert.match(markdown, /^# Daily Improvement Dream - 2026-05-07/m);
  assert.match(markdown, /## Morning Meeting Insert/);
  assert.match(markdown, /InputStore/);
  assert.match(markdown, /durable_write_performed: false/);
});

test("upsertMorningBriefDreamSection is idempotent", () => {
  const root = makeTmpWorkspace();
  writeFixture(root);
  const inputs = collectDreamInputs({ workspaceRoot: root, date: "2026-05-07" });
  const dream = buildDailyImprovementDream({ workspaceRoot: root, date: "2026-05-07", inputs });
  const morningBriefPath = path.join(root, "reports/night-shift/2026-05-07/morning-ceo-brief.md");
  const original = fs.readFileSync(morningBriefPath, "utf8");

  const once = upsertMorningBriefDreamSection(original, dream);
  const twice = upsertMorningBriefDreamSection(once, dream);

  assert.equal(once, twice);
  assert.equal((twice.match(/daily-improvement-dream:start/g) || []).length, 1);
  assert.match(twice, /Daily Improvement Dream/);
});

test("writeDailyImprovementDream writes report, JSON, morning insert and valid dream events", () => {
  const root = makeTmpWorkspace();
  writeFixture(root);
  const output = writeDailyImprovementDream({
    workspaceRoot: root,
    date: "2026-05-07",
    issueId: "[WORK_ITEM_ID]",
    updateMorningBrief: true,
    appendEvents: true,
    now: new Date("2026-05-07T04:10:00Z"),
  });

  assert.equal(fs.existsSync(output.reportPath), true);
  assert.equal(fs.existsSync(output.jsonPath), true);
  assert.equal(fs.existsSync(output.eventLedgerPath), true);
  assert.match(fs.readFileSync(output.morningBriefPath, "utf8"), /Daily Improvement Dream/);

  const events = createDreamEvents({
    dream: output.dream,
    workspaceRoot: root,
    now: new Date("2026-05-07T04:10:00Z"),
  });
  assert.equal(events.length, 2);
  assert.equal(events[0].event_type, "memory.dream_requested");
  assert.equal(events[1].event_type, "memory.proposal_created");
});

test("dream events reduce to a reviewable memory next action", () => {
  const root = makeTmpWorkspace();
  writeFixture(root);
  const output = writeDailyImprovementDream({
    workspaceRoot: root,
    date: "2026-05-07",
    issueId: "[WORK_ITEM_ID]",
    now: new Date("2026-05-07T04:10:00Z"),
  });

  const state = reduceAgentEvents(
    createDreamEvents({
      dream: output.dream,
      workspaceRoot: root,
      now: new Date("2026-05-07T04:10:00Z"),
    }),
  );

  assert.equal(state.memory_state, "proposal_created");
  assert.equal(state.next_action, "review memory proposal before durable write");
});
