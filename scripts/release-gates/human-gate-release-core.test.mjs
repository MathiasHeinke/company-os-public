import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildHumanGateReleaseEvent,
  evaluateHumanGateRelease,
  readHumanGateDecisionFile,
  requestedActionsContainBlockedAction,
  requestedActionsContainHg25FounderOnlyAction,
} from "./human-gate-release-core.mjs";

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "human-gate-release-"));
}

function write(filePath, content = "ok\n") {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
}

function passingDecision(root, overrides = {}) {
  const evidence = write(path.join(root, "evidence.md"));
  const artifact = write(path.join(root, "artifact-truth.md"));
  return {
    generated_at: "2026-05-08T10:00:00.000Z",
    human_gate_release: {
      level: "HG-2",
      released_by: "Codex-GPT-5.5-xhigh",
      founder_prediction_confidence: 0.9,
      requested_actions: ["append report", "write Linear outcome comment"],
      blocked_actions_still_forbidden: ["merge", "deploy", "production_write", "linear_done"],
      rollback_path: "Delete the generated report/comment and rerun the controller pass.",
      conditions: ["No production writes", "No Linear Done"],
      ...overrides.release,
    },
    source_of_truth: [evidence],
    gates: [{ id: "warm-preflight", status: "pass", evidence_path: evidence }],
    artifact_truth: [{ pipeline: "editorial", status: "passed", ok: true, date: "2026-05-08", report_path: artifact }],
    budget: { status: "pass", estimated_usd: 0.04, limit_usd: 0.25 },
    ...overrides.root,
  };
}

test("evaluateHumanGateRelease passes a fully evidenced HG-2 CEO release", () => {
  const root = fixtureRoot();
  const validation = evaluateHumanGateRelease(passingDecision(root), {
    now: new Date("2026-05-08T10:10:00.000Z"),
    requireToday: true,
  });

  assert.equal(validation.ok, true);
  assert.equal(validation.status, "pass");
  assert.equal(validation.blocker_count, 0);
});

test("evaluateHumanGateRelease blocks HG-2 below confidence threshold", () => {
  const root = fixtureRoot();
  const validation = evaluateHumanGateRelease(
    passingDecision(root, { release: { founder_prediction_confidence: 0.84 } }),
    { now: new Date("2026-05-08T10:10:00.000Z") },
  );

  assert.equal(validation.ok, false);
  assert.ok(validation.blockers.some((item) => item.id === "confidence.threshold"));
});

test("evaluateHumanGateRelease blocks non-delegable requested actions", () => {
  const root = fixtureRoot();
  const validation = evaluateHumanGateRelease(
    passingDecision(root, { release: { requested_actions: ["merge sandbox branch"] } }),
    { now: new Date("2026-05-08T10:10:00.000Z") },
  );

  assert.equal(validation.ok, false);
  assert.ok(validation.blockers.some((item) => item.id === "scope.blocked_actions"));
  assert.deepEqual(requestedActionsContainBlockedAction(["publish live", "write report"]), ["publish live"]);
});

test("evaluateHumanGateRelease allows evidenced HG-2.5 CEO release actions", () => {
  const root = fixtureRoot();
  const validation = evaluateHumanGateRelease(
    passingDecision(root, {
      release: {
        level: "HG-2.5",
        founder_prediction_confidence: 0.94,
        requested_actions: ["merge main", "deploy canary", "production write small config", "public publish", "plane done transition"],
        release_authority: "CEO_AUTONOMOUS",
        cao_verdict: { verdict: "PASS" },
        rollback_verification: { status: "pass" },
        blast_radius: { level: "canary", surface: "single project" },
        blocked_actions_still_forbidden: ["schema/RLS/auth/service-role", "new spend", "regulated claim", "autonomy increase"],
      },
    }),
    { now: new Date("2026-05-08T10:10:00.000Z") },
  );

  assert.equal(validation.ok, true, validation.blockers.map((item) => `${item.id}: ${item.message}`).join("\n"));
  assert.ok(validation.checks.some((item) => item.id === "scope.hg25_release_actions" && item.status === "pass"));
});

test("evaluateHumanGateRelease blocks HG-2.5 founder-only actions", () => {
  const root = fixtureRoot();
  const validation = evaluateHumanGateRelease(
    passingDecision(root, {
      release: {
        level: "HG-2.5",
        founder_prediction_confidence: 0.94,
        requested_actions: ["schema migration", "pricing change", "live outreach"],
        release_authority: "CEO_AUTONOMOUS",
        cao_verdict: { verdict: "PASS" },
        rollback_verification: true,
        blast_radius: { level: "low" },
      },
    }),
    { now: new Date("2026-05-08T10:10:00.000Z") },
  );

  assert.equal(validation.ok, false);
  assert.ok(validation.blockers.some((item) => item.id === "scope.hg25_release_actions"));
  assert.deepEqual(requestedActionsContainHg25FounderOnlyAction(["schema migration", "deploy canary"]), ["schema migration"]);
});

test("evaluateHumanGateRelease allows evidenced HG-3 CEO critical releases when reversible", () => {
  const root = fixtureRoot();
  const validation = evaluateHumanGateRelease(
    passingDecision(root, {
      release: {
        level: "HG-3",
        founder_prediction_confidence: 0.97,
        requested_actions: ["auth configuration change", "production db reversible migration"],
        release_authority: "CEO_CRITICAL",
        cao_verdict: { verdict: "PASS" },
        rollback_verification: { status: "pass", restore_path: "snapshot-2026-05-21" },
        blocked_actions_still_forbidden: ["strategic direction", "non-restorable deletion", "HG-4 founder decision"],
      },
    }),
    { now: new Date("2026-05-08T10:10:00.000Z") },
  );

  assert.equal(validation.ok, true, validation.blockers.map((item) => `${item.id}: ${item.message}`).join("\n"));
  assert.ok(validation.checks.some((item) => item.id === "scope.hg3_critical_actions" && item.status === "pass"));
  assert.ok(validation.checks.some((item) => item.id === "hg3.rollback_verified" && item.status === "pass"));
});

test("evaluateHumanGateRelease blocks HG-3 strategic or non-restorable actions", () => {
  const root = fixtureRoot();
  const validation = evaluateHumanGateRelease(
    passingDecision(root, {
      release: {
        level: "HG-3",
        founder_prediction_confidence: 0.99,
        requested_actions: ["strategic direction pivot", "drop production database non-restorable"],
        release_authority: "CEO_CRITICAL",
        cao_verdict: { verdict: "PASS" },
        rollback_verification: { status: "pass" },
      },
    }),
    { now: new Date("2026-05-08T10:10:00.000Z") },
  );

  assert.equal(validation.ok, false);
  assert.ok(validation.blockers.some((item) => item.id === "scope.hg3_critical_actions"));
});

test("evaluateHumanGateRelease blocks private context and stale cards", () => {
  const root = fixtureRoot();
  const validation = evaluateHumanGateRelease(
    passingDecision(root, {
      release: { generated_at: "2026-05-06T10:00:00.000Z" },
      root: { note: "Read ${LOCAL_WORKSPACE}" },
    }),
    {
      now: new Date("2026-05-08T10:10:00.000Z"),
      decisionText: "Read ${LOCAL_WORKSPACE}",
      maxAgeMinutes: 60,
    },
  );

  assert.equal(validation.ok, false);
  assert.ok(validation.blockers.some((item) => item.id === "privacy.no_sensitive_payload"));
  assert.ok(validation.blockers.some((item) => item.id === "freshness.age"));
});

test("buildHumanGateReleaseEvent refuses blocked validation and emits valid payload for pass", () => {
  const root = fixtureRoot();
  const decision = passingDecision(root);
  const validation = evaluateHumanGateRelease(decision, { now: new Date("2026-05-08T10:10:00.000Z") });
  const event = buildHumanGateReleaseEvent({
    validation,
    decision,
    runId: "run-1",
    issueId: "[WORK_ITEM_ID]",
    workspacePath: root,
    now: new Date("2026-05-08T10:10:00.000Z"),
  });

  assert.equal(event.event_type, "human_gate.released");
  assert.equal(event.payload.release_validation.status, "pass");
  assert.equal(event.payload.founder_prediction_confidence, 0.9);
  assert.deepEqual(event.payload.requested_actions, ["append report", "write Linear outcome comment"]);

  const blocked = { ...validation, ok: false, status: "blocked" };
  assert.throws(() => buildHumanGateReleaseEvent({ validation: blocked, decision, runId: "run-1", workspacePath: root }));
});

test("buildHumanGateReleaseEvent preserves HG-3 CEO critical authority for read models", () => {
  const root = fixtureRoot();
  const decision = passingDecision(root, {
    release: {
      level: "HG-3",
      founder_prediction_confidence: 0.97,
      requested_actions: ["auth configuration change", "production db reversible migration"],
      release_authority: "CEO_CRITICAL",
      cao_verdict: { verdict: "PASS" },
      rollback_verification: { status: "pass" },
      blocked_actions_still_forbidden: ["strategic direction", "non-restorable deletion"],
    },
  });
  const validation = evaluateHumanGateRelease(decision, { now: new Date("2026-05-08T10:10:00.000Z") });
  const event = buildHumanGateReleaseEvent({
    validation,
    decision,
    runId: "run-hg3",
    issueId: "[WORK_ITEM_ID]",
    workspacePath: root,
    now: new Date("2026-05-08T10:10:00.000Z"),
  });

  assert.equal(event.payload.level, "HG-3");
  assert.equal(event.payload.release_authority, "CEO_CRITICAL");
  assert.equal(event.payload.rollback_path, "Delete the generated report/comment and rerun the controller pass.");
});

test("evaluateHumanGateRelease routes HG-3.5 to Chief-of-Staff and HG-4 to Founder", () => {
  // Source of truth: docs/governance/human-gate-levels.md.
  const root = fixtureRoot();
  const proxyInvalid = evaluateHumanGateRelease(
    passingDecision(root, {
      release: {
        level: "HG-3.5",
        founder_prediction_confidence: 1,
        released_by: "Codex-GPT-5.5-xhigh",
        requested_actions: ["resume after founder review"],
      },
    }),
    { now: new Date("2026-05-13T10:10:00.000Z") },
  );
  assert.equal(proxyInvalid.ok, false);
  assert.ok(proxyInvalid.blockers.some((item) => item.id === "level.hg35_owner_invalid"));

  const founderInvalid = evaluateHumanGateRelease(
    passingDecision(root, {
      release: {
        level: "HG-4",
        founder_prediction_confidence: 1,
        released_by: "Codex-GPT-5.5-xhigh",
        requested_actions: ["strategic direction pivot"],
      },
    }),
    { now: new Date("2026-05-13T10:10:00.000Z") },
  );
  assert.equal(founderInvalid.ok, false);
  assert.ok(founderInvalid.blockers.some((item) => item.id === "level.hg4_founder_release_required"));
});

test("readHumanGateDecisionFile accepts Markdown fenced JSON", () => {
  const root = fixtureRoot();
  const decisionPath = write(
    path.join(root, "decision.md"),
    [
      "# Decision",
      "",
      "```json",
      JSON.stringify(passingDecision(root), null, 2),
      "```",
      "",
    ].join("\n"),
  );

  const result = readHumanGateDecisionFile(decisionPath);
  assert.equal(result.decision.human_gate_release.level, "HG-2");
});
