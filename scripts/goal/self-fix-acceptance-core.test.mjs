import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  SELF_FIX_ACCEPTANCE_VERSION,
  buildSelfFixAcceptance,
  latestMarkerComment,
  parseMarkerFields,
  renderSelfFixAcceptanceMarkdown,
  writeSelfFixAcceptance,
} from "./self-fix-acceptance-core.mjs";

function comments() {
  return [
    {
      id: "worker-1",
      created_at: "2026-05-18T12:00:00Z",
      body: `worker.reported:
  state: RUNTIME_ERROR
  stream_health: PASS
  out_of_scope_change_count: 0`,
    },
    {
      id: "self-fix-1",
      created_at: "2026-05-18T12:05:00Z",
      body: `controller.self-fix:
  work_item: [WORK_ITEM_ID]
  status: SELF_FIX_APPLIED
  commit: abc1234
  changed_files:
    - scripts/goal/example.mjs`,
    },
  ];
}

test("parseMarkerFields parses scalar and list fields after marker", () => {
  const fields = parseMarkerFields(comments()[1].body, "controller.self-fix");
  assert.equal(fields.work_item, "[WORK_ITEM_ID]");
  assert.equal(fields.status, "SELF_FIX_APPLIED");
  assert.equal(fields.commit, "abc1234");
  assert.deepEqual(fields.changed_files, ["scripts/goal/example.mjs"]);
});

test("latestMarkerComment selects latest structured marker comment", () => {
  const latest = latestMarkerComment([
    ...comments(),
    {
      id: "self-fix-2",
      created_at: "2026-05-18T12:10:00Z",
      body: `controller.self-fix:
  status: SELF_FIX_APPLIED
  commit: def5678`,
    },
  ], "controller.self-fix");
  assert.equal(latest.comment_id, "self-fix-2");
  assert.equal(latest.fields.commit, "def5678");
});

test("buildSelfFixAcceptance accepts applied self-fix with reachable pushed commit and green gates", () => {
  const result = buildSelfFixAcceptance({
    workItem: "[WORK_ITEM_ID]",
    comments: comments(),
    commitReachable: true,
    pushedToMain: true,
    gates: [
      { command: "node --test scripts/goal/*.test.mjs", ok: true, output: "107/107" },
      { command: "git diff --check", ok: true },
    ],
    forbiddenActions: ["no Plane Done by worker", "no production write"],
    reportPath: "reports/runs/[WORK_ITEM_ID]-self-fix-acceptance.md",
    now: new Date("2026-05-18T13:00:00Z"),
  });
  assert.equal(result.version, SELF_FIX_ACCEPTANCE_VERSION);
  assert.equal(result.accepted, true);
  assert.equal(result.status, "ACCEPTED");
  assert.equal(result.commit, "abc1234");
  assert.deepEqual(result.blockers, []);
  assert.equal(result.evidence.worker_state, "RUNTIME_ERROR");
});

test("buildSelfFixAcceptance uses worker_reported_comment_id from self-fix evidence when present", () => {
  const result = buildSelfFixAcceptance({
    workItem: "[WORK_ITEM_ID]",
    comments: [
      {
        id: "worker-referenced",
        created_at: "2026-05-18T12:00:00Z",
        body: `worker.reported:
  state: TIMEOUT
  stream_health: PASS
  out_of_scope_change_count: 0`,
      },
      {
        id: "worker-latest",
        created_at: "2026-05-18T12:20:00Z",
        body: `worker.reported:
  state: TIMEOUT
  stream_health: PASS
  out_of_scope_change_count: 0`,
      },
      {
        id: "self-fix-1",
        created_at: "2026-05-18T12:05:00Z",
        body: `controller.self-fix:
  status: SELF_FIX_APPLIED
  commit: abc1234
  worker_reported_comment_id: worker-referenced`,
      },
    ],
    commitReachable: true,
    pushedToMain: true,
    gates: ["git diff --check"],
  });

  assert.equal(result.accepted, true);
  assert.equal(result.evidence.worker_reported_comment_id, "worker-referenced");
});

test("buildSelfFixAcceptance rejects missing self-fix, failed gate and unpushed commit", () => {
  const result = buildSelfFixAcceptance({
    workItem: "[WORK_ITEM_ID]",
    comments: [comments()[0]],
    commit: "abc1234",
    commitReachable: true,
    pushedToMain: false,
    gates: [{ command: "git diff --check", ok: false }],
    now: new Date("2026-05-18T13:00:00Z"),
  });
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes("controller.self-fix-missing"));
  assert.ok(result.blockers.includes("self-fix.commit-not-on-main"));
  assert.ok(result.blockers.includes("gate.failed:git diff --check"));
});

test("buildSelfFixAcceptance rejects out-of-scope worker evidence", () => {
  const result = buildSelfFixAcceptance({
    workItem: "[WORK_ITEM_ID]",
    comments: [
      {
        id: "worker-1",
        created_at: "2026-05-18T12:00:00Z",
        body: `worker.reported:
  state: TIMEOUT
  stream_health: PASS
  out_of_scope_change_count: 2`,
      },
      comments()[1],
    ],
    commitReachable: true,
    pushedToMain: true,
    gates: ["node --test scripts/goal/*.test.mjs"],
  });
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes("worker.out-of-scope-changes"));
});

test("render and write self-fix acceptance report", () => {
  const result = buildSelfFixAcceptance({
    workItem: "[WORK_ITEM_ID]",
    comments: comments(),
    commitReachable: true,
    pushedToMain: true,
    gates: ["git diff --check"],
    now: new Date("2026-05-18T13:00:00Z"),
  });
  const markdown = renderSelfFixAcceptanceMarkdown(result);
  assert.match(markdown, /Controller Self-Fix Acceptance - [WORK_ITEM_ID]/);
  assert.match(markdown, /Status: ACCEPTED/);
  assert.match(markdown, /does not claim a retroactive CAO PASS/);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "self-fix-acceptance-"));
  const written = writeSelfFixAcceptance({ workspaceRoot: root, result });
  assert.equal(fs.existsSync(written), true);
  assert.match(fs.readFileSync(written, "utf8"), /Status: ACCEPTED/);
});
