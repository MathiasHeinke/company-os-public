import assert from "node:assert/strict";
import test from "node:test";

import {
  SANDBOX_LIFECYCLE_STATES,
  SANDBOX_LIFECYCLE_VERSION,
  attachLifecycleStates,
  deriveSandboxLifecycleState,
  listStaleSandboxes,
  parseSandboxCreationDate,
  renderLifecycleReport,
} from "./sandbox-lifecycle-core.mjs";

const NOW = new Date("2026-05-20T12:00:00.000Z");

function makeWorktree(overrides = {}) {
  return {
    root: "${LOCAL_WORKSPACE}",
    branch: "codex/sandbox/company-os/2026-05-20-compa-999-claude-cto-fix-something-120000",
    commit: "abc123",
    dirty: false,
    dirtyCounts: { total: 0 },
    status: "needs_attention",
    blockers: [],
    warnings: [],
    ...overrides,
  };
}

test("SANDBOX_LIFECYCLE_VERSION is set", () => {
  assert.ok(SANDBOX_LIFECYCLE_VERSION.startsWith("sandbox-lifecycle-register/"));
});

test("SANDBOX_LIFECYCLE_STATES defines all seven states", () => {
  const expected = ["created", "reported", "audited", "integrated", "parked", "archived", "removable"];
  for (const state of expected) {
    assert.ok(state in SANDBOX_LIFECYCLE_STATES, `missing state: ${state}`);
    const s = SANDBOX_LIFECYCLE_STATES[state];
    assert.ok(Array.isArray(s.allowedActions), `${state}.allowedActions must be an array`);
    assert.ok(Array.isArray(s.forbiddenActions), `${state}.forbiddenActions must be an array`);
    assert.ok(typeof s.staleRecommendation === "string", `${state}.staleRecommendation must be a string`);
  }
});

test("parseSandboxCreationDate extracts date from path with YYYY-MM-DD prefix", () => {
  const date = parseSandboxCreationDate("${LOCAL_WORKSPACE}");
  assert.ok(date instanceof Date);
  assert.equal(date.toISOString(), "2026-05-15T00:00:00.000Z");
});

test("parseSandboxCreationDate returns null for paths without date prefix", () => {
  assert.equal(parseSandboxCreationDate("${LOCAL_WORKSPACE}"), null);
  assert.equal(parseSandboxCreationDate(""), null);
  assert.equal(parseSandboxCreationDate(null), null);
});

test("deriveSandboxLifecycleState returns created for dirty worktrees", () => {
  const worktree = makeWorktree({ dirty: true, root: "/dev/[SOURCE_WORKSPACE]/co/2026-05-20-compa-1-claude-cto-fix-120000" });
  const result = deriveSandboxLifecycleState(worktree, { now: NOW });
  assert.equal(result.lifecycleState, "created");
  assert.equal(result.isStale, false);
});

test("deriveSandboxLifecycleState returns reported for clean worktree created < 24h ago", () => {
  const worktree = makeWorktree({ root: "/dev/[SOURCE_WORKSPACE]/co/2026-05-20-compa-1-claude-cto-fix-000000", dirty: false });
  const result = deriveSandboxLifecycleState(worktree, { now: NOW });
  assert.equal(result.lifecycleState, "reported");
  assert.equal(result.isStale, false);
  assert.equal(result.createdAt, "2026-05-20T00:00:00.000Z");
});

test("deriveSandboxLifecycleState returns audited for clean worktree 24-72h old", () => {
  const worktree = makeWorktree({ root: "/dev/[SOURCE_WORKSPACE]/co/2026-05-18-compa-1-claude-cto-fix-000000", dirty: false });
  const result = deriveSandboxLifecycleState(worktree, { now: NOW });
  assert.equal(result.lifecycleState, "audited");
});

test("deriveSandboxLifecycleState returns parked for clean worktree > 72h old", () => {
  const worktree = makeWorktree({ root: "/dev/[SOURCE_WORKSPACE]/co/2026-05-15-compa-1-claude-cto-fix-000000", dirty: false });
  const result = deriveSandboxLifecycleState(worktree, { now: NOW });
  assert.equal(result.lifecycleState, "parked");
});

test("deriveSandboxLifecycleState marks parked stale after 168h", () => {
  // 2026-05-10 is 10 days (240h) before 2026-05-20
  const worktree = makeWorktree({ root: "/dev/[SOURCE_WORKSPACE]/co/2026-05-10-compa-1-claude-cto-fix-000000", dirty: false });
  const result = deriveSandboxLifecycleState(worktree, { now: NOW });
  assert.equal(result.lifecycleState, "parked");
  assert.equal(result.isStale, true);
  assert.ok(typeof result.recommendation === "string" && result.recommendation.length > 0);
});

test("deriveSandboxLifecycleState returns archived for detached HEAD clean worktree", () => {
  const worktree = makeWorktree({ branch: "(detached)", dirty: false, root: "/dev/[SOURCE_WORKSPACE]/co/2026-05-10-compa-1-claude-cto-fix-000000" });
  const result = deriveSandboxLifecycleState(worktree, { now: NOW });
  assert.equal(result.lifecycleState, "archived");
});

test("deriveSandboxLifecycleState returns archived for empty branch clean worktree", () => {
  const worktree = makeWorktree({ branch: "", dirty: false, root: "/dev/[SOURCE_WORKSPACE]/co/2026-05-10-compa-1-claude-cto-fix-000000" });
  const result = deriveSandboxLifecycleState(worktree, { now: NOW });
  assert.equal(result.lifecycleState, "archived");
});

test("deriveSandboxLifecycleState sets recommendation to null when not stale", () => {
  const worktree = makeWorktree({ dirty: true, root: "/dev/[SOURCE_WORKSPACE]/co/2026-05-20-compa-1-claude-cto-fix-000000" });
  const result = deriveSandboxLifecycleState(worktree, { now: NOW });
  assert.equal(result.isStale, false);
  assert.equal(result.recommendation, null);
});

test("deriveSandboxLifecycleState handles missing date in root path gracefully", () => {
  const worktree = makeWorktree({ root: "/dev/[SOURCE_WORKSPACE]/co/compa-186", dirty: false, branch: "some-branch" });
  const result = deriveSandboxLifecycleState(worktree, { now: NOW });
  assert.ok(["reported", "audited", "parked"].includes(result.lifecycleState));
  assert.equal(result.ageHours, null);
  assert.equal(result.isStale, false);
});

test("deriveSandboxLifecycleState marks reported stale after 24h", () => {
  // Created 2026-05-20, now is 2026-05-21T12:00 → 36h later (still reported, stale since > 24h)
  const laterNow = new Date("2026-05-21T12:00:00.000Z");
  const worktree = makeWorktree({ root: "/dev/[SOURCE_WORKSPACE]/co/2026-05-20-compa-1-fix-000000", dirty: false });
  const result = deriveSandboxLifecycleState(worktree, { now: laterNow });
  // At 36h age, state stays reported (range: 0-48h) but stale threshold was 24h
  assert.equal(result.lifecycleState, "reported");
  assert.equal(result.isStale, true);
});

test("deriveSandboxLifecycleState marks audited stale after 72h", () => {
  // Created 2026-05-17, now 2026-05-20T12:00 → ~84h (still audited, range: 48-120h, stale after 72h)
  const worktree = makeWorktree({ root: "/dev/[SOURCE_WORKSPACE]/co/2026-05-17-compa-1-fix-000000", dirty: false });
  const result = deriveSandboxLifecycleState(worktree, { now: NOW });
  assert.equal(result.lifecycleState, "audited");
  assert.equal(result.isStale, true);
  assert.ok(result.recommendation.includes("CEO decision"));
});

test("attachLifecycleStates layers lifecycle state onto scanSandboxRoots output", () => {
  const scanResults = [
    {
      root: "/dev/[SOURCE_WORKSPACE]/co",
      status: "needs_attention",
      worktrees: [
        makeWorktree({ root: "/dev/[SOURCE_WORKSPACE]/co/2026-05-20-compa-1-fix-000000", dirty: false }),
        makeWorktree({ root: "/dev/[SOURCE_WORKSPACE]/co/2026-05-10-compa-2-fix-000000", dirty: true }),
      ],
      blockers: [],
      warnings: [],
    },
  ];

  const annotated = attachLifecycleStates(scanResults, { now: NOW });

  assert.equal(annotated.length, 1);
  assert.equal(annotated[0].worktrees.length, 2);
  assert.equal(annotated[0].worktrees[0].lifecycleState, "reported");
  assert.equal(annotated[0].worktrees[1].lifecycleState, "created");
});

test("listStaleSandboxes returns only stale worktrees", () => {
  const annotated = [
    {
      root: "/dev/[SOURCE_WORKSPACE]/co",
      worktrees: [
        { root: "/dev/[SOURCE_WORKSPACE]/co/fresh", lifecycleState: "reported", isStale: false },
        { root: "/dev/[SOURCE_WORKSPACE]/co/stale", lifecycleState: "parked", isStale: true, recommendation: "Park review" },
      ],
    },
  ];

  const stale = listStaleSandboxes(annotated);
  assert.equal(stale.length, 1);
  assert.equal(stale[0].root, "/dev/[SOURCE_WORKSPACE]/co/stale");
});

test("renderLifecycleReport emits header and governance section", () => {
  const annotated = [
    {
      root: "/dev/[SOURCE_WORKSPACE]/co",
      worktrees: [
        {
          root: "/dev/[SOURCE_WORKSPACE]/co/2026-05-10-compa-1-fix-000000",
          lifecycleState: "parked",
          ageHours: 240,
          branch: "codex/sandbox/co/2026-05-10-compa-1-fix-000000",
          dirty: false,
          isStale: true,
          recommendation: "Park review required; consider resumption or archive",
        },
      ],
    },
  ];

  const report = renderLifecycleReport(annotated, { generatedAt: "2026-05-20T12:00:00.000Z" });

  assert.match(report, /^# Sandbox Lifecycle Report/m);
  assert.match(report, /Stale sandboxes: 1/);
  assert.match(report, /parked/);
  assert.match(report, /240/);
  assert.match(report, /Park review required/);
  assert.match(report, /No automatic deletion/);
});

test("renderLifecycleReport handles empty sandbox list gracefully", () => {
  const report = renderLifecycleReport([], { generatedAt: "2026-05-20T12:00:00.000Z" });
  assert.match(report, /No sandbox worktrees found/);
});

test("SANDBOX_LIFECYCLE_STATES removable forbids automatic-delete", () => {
  const removable = SANDBOX_LIFECYCLE_STATES.removable;
  assert.ok(removable.forbiddenActions.includes("automatic-delete"));
  assert.ok(removable.forbiddenActions.includes("worker-delete"));
  assert.ok(removable.allowedActions.includes("human-branch-delete"));
  assert.ok(removable.allowedActions.includes("human-worktree-remove"));
});

test("SANDBOX_LIFECYCLE_STATES integrated and archived have null staleThreshold", () => {
  assert.equal(SANDBOX_LIFECYCLE_STATES.integrated.staleThresholdHours, null);
  assert.equal(SANDBOX_LIFECYCLE_STATES.archived.staleThresholdHours, null);
  assert.equal(SANDBOX_LIFECYCLE_STATES.removable.staleThresholdHours, null);
});
