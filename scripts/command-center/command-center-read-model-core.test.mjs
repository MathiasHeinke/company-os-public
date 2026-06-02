import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildCommandCenterReadModel,
  renderCommandCenterReadModelMarkdown,
  writeCommandCenterReadModel,
} from "./command-center-read-model-core.mjs";

function event(overrides = {}) {
  return {
    schema_version: "agent-event/v1",
    event_id: overrides.event_id || crypto.randomUUID(),
    event_type: overrides.event_type || "worker.reported",
    occurred_at: overrides.occurred_at || "2026-05-20T10:00:00.000Z",
    producer: overrides.producer || "runtime-dispatcher-v1.2",
    workspace: overrides.workspace || "registry:company-os",
    workspace_path: overrides.workspace_path || "/tmp/company-os",
    issue_id: overrides.issue_id || "[WORK_ITEM_ID]",
    run_id: overrides.run_id || "run-1",
    session_id: overrides.session_id || overrides.run_id || "run-1",
    agent: overrides.agent || "claude",
    mode: overrides.mode || "implement",
    role_owner: overrides.role_owner || "role:cto",
    department: overrides.department || "cto",
    autonomy_level: overrides.autonomy_level || "L2",
    event_policy: overrides.event_policy || "runtime-dispatcher-v1.2",
    payload: overrides.payload || { state: "PASS", needs_controller_audit: true },
    artifact_paths: overrides.artifact_paths || [],
    linear_comment_ids: overrides.linear_comment_ids || [],
    human_gate_required: overrides.human_gate_required ?? false,
    redaction_level: overrides.redaction_level || "standard",
  };
}

test("buildCommandCenterReadModel groups runs and exposes source-linked trace cards", () => {
  const rows = [
    event({
      event_id: "evt-heartbeat",
      event_type: "worker.heartbeat",
      occurred_at: "2026-05-20T09:59:00.000Z",
      payload: { state: "running" },
    }),
    event({
      event_id: "evt-report",
      event_type: "worker.reported",
      occurred_at: "2026-05-20T10:00:00.000Z",
      artifact_paths: ["/tmp/reports/run.md"],
      payload: { state: "PASS", needs_controller_audit: true },
    }),
    event({
      event_id: "evt-summary",
      event_type: "ledger.run_summarized",
      occurred_at: "2026-05-20T10:01:00.000Z",
      payload: {
        raindrop_summary_json: "/tmp/reports/observability/raindrop-workshop/run.json",
        raindrop_summary_md: "/tmp/reports/observability/raindrop-workshop/run.md",
      },
    }),
  ];
  const model = buildCommandCenterReadModel({ rows, generatedAt: "2026-05-20T10:02:00.000Z" });
  assert.equal(model.read_only, true);
  assert.equal(model.sources.event_ledger, "metrics/agent-events.jsonl");
  assert.equal(model.worker_runs.length, 1);
  assert.equal(model.worker_runs[0].issue_id, "[WORK_ITEM_ID]");
  assert.equal(model.worker_runs[0].worker_state, "needs_audit");
  assert.equal(model.trace_summary_cards.length, 1);
  assert.equal(model.trace_summary_cards[0].source_event_id, "evt-summary");
  assert.equal(model.morning_brief.totals.trace_cards, 1);
});

test("buildCommandCenterReadModel can declare a sanitized fixture event ledger", () => {
  const model = buildCommandCenterReadModel({
    rows: [event({ event_id: "evt-fixture-source" })],
    eventLedger: "reports/examples/command-center-read-model/agent-events.example.jsonl",
  });
  assert.equal(model.sources.event_ledger, "reports/examples/command-center-read-model/agent-events.example.jsonl");
});

test("trace cards dedupe repeated worker.reported and ledger summary pointers", () => {
  const sharedArtifacts = [
    "/tmp/reports/observability/raindrop-workshop/run.json",
    "/tmp/reports/observability/raindrop-workshop/run.md",
  ];
  const rows = [
    event({
      event_id: "evt-report",
      event_type: "worker.reported",
      artifact_paths: sharedArtifacts,
    }),
    event({
      event_id: "evt-summary",
      event_type: "ledger.run_summarized",
      artifact_paths: sharedArtifacts,
      occurred_at: "2026-05-20T10:01:00.000Z",
    }),
    event({
      event_id: "evt-prompt-result",
      event_type: "dispatcher.prompt_result_eval",
      artifact_paths: ["/tmp/reports/observability/raindrop-workshop/run.prompt-result.json", "/tmp/reports/observability/raindrop-workshop/run.prompt-result.md"],
      occurred_at: "2026-05-20T10:02:00.000Z",
    }),
  ];
  const model = buildCommandCenterReadModel({ rows });
  assert.equal(model.trace_summary_cards.length, 2);
  assert.equal(model.trace_summary_cards[0].trace_markdown, "/tmp/reports/observability/raindrop-workshop/run.md");
  assert.equal(model.trace_summary_cards[1].trace_markdown, null);
  assert.equal(model.trace_summary_cards[1].prompt_result, "/tmp/reports/observability/raindrop-workshop/run.prompt-result.md");
});

test("decision gate queue includes lower gates without counting them as HG-4 human review", () => {
  const rows = [
    event({
      event_id: "evt-human",
      event_type: "human_gate.required",
      issue_id: "[WORK_ITEM_ID]",
      run_id: "run-2",
      human_gate_required: true,
      payload: { level: "HG-3", decision: "CEO/Codex release required" },
    }),
  ];
  const model = buildCommandCenterReadModel({ rows });
  assert.equal(model.human_gate_queue.length, 1);
  assert.equal(model.human_gate_queue[0].issue_id, "[WORK_ITEM_ID]");
  assert.equal(model.human_gate_queue[0].human_gate_level, "HG-3");
  assert.equal(model.morning_brief.totals.needs_gate_review, 1);
  assert.equal(model.morning_brief.totals.needs_human, 0);
  assert.match(model.human_gate_queue[0].next_action, /CEO\/Codex release required/);
  assert.ok(model.blocked_actions.includes("no Plane writes"));
});

test("HG-3 release events surface as CEO critical releases, not Founder queue", () => {
  const model = buildCommandCenterReadModel({
    rows: [
      event({
        event_id: "evt-atlas-hg3-release",
        event_type: "human_gate.released",
        issue_id: "[WORK_ITEM_ID]",
        run_id: "run-atlas-hg3",
        agent: "codex",
        role_owner: "CEO",
        department: "ceo",
        payload: {
          level: "HG-3",
          released_by: "Codex-GPT-5.5-xhigh",
          release_authority: "CEO_CRITICAL",
          founder_prediction_confidence: 0.98,
          decision: "CEO_CRITICAL_RELEASE",
          conditions: ["private beta release may proceed"],
          requested_actions: ["merge sandbox branch", "deploy private beta"],
          blocked_actions_still_forbidden: ["HG-4 strategic change", "non-restorable deletion"],
          release_validation: { status: "pass", blocker_count: 0, check_count: 21 },
        },
        artifact_paths: ["/tmp/reports/atlas-hg3-release.json"],
      }),
    ],
  });

  assert.equal(model.human_gate_queue.length, 0);
  assert.equal(model.ceo_critical_releases.length, 1);
  assert.equal(model.ceo_critical_releases[0].issue_id, "[WORK_ITEM_ID]");
  assert.equal(model.ceo_critical_releases[0].release_authority, "CEO_CRITICAL");
  assert.equal(model.ceo_critical_releases[0].source_event_id, "evt-atlas-hg3-release");
  assert.equal(model.morning_brief.totals.hg3_ceo_releases, 1);
  assert.equal(model.morning_brief.totals.active, 0);
  assert.equal(model.morning_brief.totals.needs_human, 0);
  assert.equal(model.eve_hg35_packets.length, 0);
});

test("HG-3 holds route into simulated EVE / HG-3.5 packets with source evidence", () => {
  const model = buildCommandCenterReadModel({
    rows: [
      event({
        event_id: "evt-atlas-hg3-hold",
        event_type: "human_gate.required",
        issue_id: "[WORK_ITEM_ID]",
        run_id: "run-atlas-hg35",
        human_gate_required: true,
        agent: "codex",
        role_owner: "CEO",
        department: "ceo",
        payload: {
          level: "HG-3",
          decision_mode: "CEO_CRITICAL_HOLD",
          decision: "Hold the CEO critical release and route to EVE HG-3.5",
          release_authority: "CEO_CRITICAL",
          next_action: "write simulated EVE / HG-3.5 decision packet",
          hg35: {
            simulated: true,
            pause_artifact: "/tmp/reports/atlas-hg35-eve-packet.json",
            assumptions: ["rollback evidence is complete but product risk is ambiguous"],
            challenge_questions: ["What breaks if the private beta gate is wrong?"],
          },
          consequence_if_go: "Private beta can start with reversible release controls.",
          consequence_if_no_go: "ATLAS desktop MVP remains gated until rework closes.",
          consequence_if_wrong: "Founder sees a clean packet before any HG-4 implication.",
          blocked_actions_still_forbidden: ["Plane Done", "public launch"],
        },
        artifact_paths: ["/tmp/reports/atlas-hg35-eve-packet.json"],
      }),
    ],
  });

  assert.equal(model.eve_hg35_packets.length, 1);
  assert.equal(model.eve_hg35_packets[0].originating_gate, "HG-3");
  assert.equal(model.eve_hg35_packets[0].target_gate, "HG-3.5");
  assert.equal(model.eve_hg35_packets[0].simulated, true);
  assert.equal(model.eve_hg35_packets[0].source_event_id, "evt-atlas-hg3-hold");
  assert.equal(model.eve_hg35_packets[0].challenge_questions.length, 1);
  assert.equal(model.morning_brief.totals.hg35_packets, 1);
});

test("HG-4 decision gate counts as human review", () => {
  const model = buildCommandCenterReadModel({
    rows: [
      event({
        event_id: "evt-hg4",
        event_type: "human_gate.required",
        issue_id: "[WORK_ITEM_ID]",
        run_id: "run-4",
        human_gate_required: true,
        payload: { level: "HG-4", decision: "Founder decision required" },
      }),
    ],
  });
  assert.equal(model.morning_brief.totals.needs_gate_review, 1);
  assert.equal(model.morning_brief.totals.needs_human, 1);
});

test("morning brief does not count blocked idle runs as active", () => {
  const model = buildCommandCenterReadModel({
    rows: [
      event({
        event_id: "evt-auth-failed",
        event_type: "runtime.auth_failed",
        payload: { failure: "plane-app-token-unavailable" },
      }),
    ],
  });
  assert.equal(model.morning_brief.totals.active, 0);
  assert.equal(model.morning_brief.totals.blocked, 1);
});

test("renderCommandCenterReadModelMarkdown is deterministic and read-only explicit", () => {
  const model = buildCommandCenterReadModel({
    generatedAt: "2026-05-20T10:02:00.000Z",
    rows: [
      event({
        event_id: "evt-report",
        payload: { state: "PASS", needs_controller_audit: true },
      }),
    ],
  });
  const markdown = renderCommandCenterReadModelMarkdown(model);
  assert.match(markdown, /Read-only: true/);
  assert.match(markdown, /CEO Critical Releases/);
  assert.match(markdown, /EVE \/ HG-3\.5 Packets/);
  assert.match(markdown, /no Plane writes/);
  assert.match(markdown, /evt-report/);
});

test("writeCommandCenterReadModel requires absolute outputDir and writes JSON plus Markdown", () => {
  const model = buildCommandCenterReadModel({ rows: [event({ event_id: "evt-write" })] });
  assert.throws(() => writeCommandCenterReadModel({ model, outputDir: "relative" }), /absolute path/);
  assert.throws(() => writeCommandCenterReadModel({ model, outputDir: "/tmp", fileStem: "../bad" }), /filename stem/);
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "command-center-read-model-"));
  const result = writeCommandCenterReadModel({ model, outputDir });
  assert.ok(fs.existsSync(result.jsonPath));
  assert.ok(fs.existsSync(result.markdownPath));
  assert.match(fs.readFileSync(result.markdownPath, "utf8"), /Command Center Read Model/);
});

test("writeCommandCenterReadModel supports public-safe example file stems", () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "command-center-read-model-example-"));
  const model = buildCommandCenterReadModel({ rows: [event({ event_id: "evt-example-write" })] });
  const result = writeCommandCenterReadModel({
    model,
    outputDir,
    fileStem: "command-center-read-model.example",
  });
  assert.equal(path.basename(result.jsonPath), "command-center-read-model.example.json");
  assert.equal(path.basename(result.markdownPath), "command-center-read-model.example.md");
});
