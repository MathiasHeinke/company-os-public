import assert from "node:assert/strict";
import test from "node:test";

import { buildContextComment, findExistingLock } from "./plane-dispatcher-v0.mjs";

test("buildContextComment emits headless boot-pack fields needed by fresh CLI workers", () => {
  const text = buildContextComment({
    item: {
      id: "item-1",
      sequence_id: 133,
      name: "Pilot",
      state: "Todo",
    },
    role: "role:cto",
    contractFields: {
      agent: "claude",
      mode: "audit",
      workspace: "${LOCAL_WORKSPACE}",
      dispatch: "ready",
      source_of_truth: ["${LOCAL_WORKSPACE}"],
      acceptance_criteria: ["boot proof present"],
      gates: ["no edits"],
      human_gate: "HG-1",
    },
    runId: "run-133",
  });

  assert.match(text, /runtime_identity:/);
  assert.match(text, /boot_reading_order:/);
  assert.match(text, /plane_work_item_snapshot:/);
  assert.match(text, /boot_context_proof:/);
  assert.match(text, /timing_policy:/);
  assert.match(text, /min_silent_seconds: 300/);
  assert.match(text, /normal_audit_wait_seconds: 600-900/);
  assert.match(text, /docs\/orchestration\/headless-worker-runtime-boot-contract\.md/);
});

function lockComment({ runId, hash, expiresAt }) {
  return {
    id: `comment-${runId}`,
    comment_html: `<p>worker.lock (dispatcher-v0)</p><pre><code>worker.lock:
  dispatcher_run_id: ${runId}
  expires_at: ${expiresAt}
  hash:
    description: ${hash}
</code></pre>`,
  };
}

test("findExistingLock treats matching active lock as duplicate", () => {
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  const lock = lockComment({ runId: "run-current", hash: "a".repeat(64), expiresAt });

  const state = findExistingLock([lock], { currentDescriptionHash: "a".repeat(64) });

  assert.equal(state.active?.dispatcher_run_id, "run-current");
  assert.equal(state.superseded, null);
  assert.equal(state.stale_active, null);
});

test("findExistingLock supersedes active lock with stale description hash", () => {
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  const lock = lockComment({ runId: "run-stale", hash: "b".repeat(64), expiresAt });

  const state = findExistingLock([lock], { currentDescriptionHash: "c".repeat(64) });

  assert.equal(state.active, null);
  assert.equal(state.superseded, "run-stale");
  assert.equal(state.stale_active?.dispatcher_run_id, "run-stale");
});
