import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  closeEveWorkstreamSession,
  defaultEveSessionRegistryPath,
  emptyEveSessionRegistry,
  evaluateEveSessionHygiene,
  loadEveSessionRegistry,
  registerStartEveSession,
} from "./eve-session-registry-core.mjs";

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eve-session-registry-test-"));
}

const route = {
  route_class: "SC2-workstream-continuity",
  route_receipt: {
    version: "session-continuity-router/v0",
    route_class: "SC2-workstream-continuity",
    session_policy: "workstream-continuity",
    reuse_allowed: true,
    session_group_allowed: false,
    route_reason: "explicit-class",
    human_gate: "HG-2.5",
    required_registry_state: "open-workstream-session",
    blocked_actions: ["production write", "external send", "customer data", "Plane Done"],
  },
};

const preflight = {
  hermes: {
    model_config: {
      model: "gpt-5.1-codex-mini",
      provider: "openrouter",
    },
  },
};

test("registerStartEveSession creates a local private workstream registry", () => {
  const root = tmpDir();
  const contextRoot = path.join(root, "context");
  const registryPath = defaultEveSessionRegistryPath({ contextRoot });

  const result = registerStartEveSession({
    route,
    preflight,
    paths: { contextRoot },
    now: new Date("2026-06-02T10:00:00.000Z"),
  });

  assert.equal(result.ok, true);
  assert.equal(result.written, true);
  assert.equal(result.registry_path, registryPath);
  assert.ok(fs.existsSync(registryPath));
  const loaded = loadEveSessionRegistry(registryPath);
  assert.equal(loaded.ok, true);
  const session = loaded.registry.sessions["eve-founder-companion"];
  assert.equal(session.session_policy, "workstream-continuity");
  assert.equal(session.route_class, "SC2-workstream-continuity");
  assert.equal(session.runtime_sessions.eve_hermes.session_id_status, "not-yet-captured");
  assert.equal(session.runtime_sessions.eve_hermes.session_id, "");
  assert.equal(session.hygiene.close_required, false);
});

test("registerStartEveSession rotates stale open workstream generations", () => {
  const registry = emptyEveSessionRegistry(new Date("2026-06-02T00:00:00.000Z"));
  registry.sessions["eve-founder-companion"] = {
    id: "eve-founder-companion",
    generation: 1,
    status: "open",
    opened_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
    hygiene: { stale_after_days: 14 },
  };
  const root = tmpDir();
  const registryPath = path.join(root, "registry.json");
  fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

  const result = registerStartEveSession({
    route,
    preflight,
    paths: { contextRoot: root },
    registryPath,
    now: new Date("2026-06-02T00:00:00.000Z"),
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "pass_rotated_stale");
  assert.equal(result.session.generation, 2);
  assert.equal(result.session.hygiene.rotated_stale_session, true);
  assert.ok(result.registry.events.some((event) => event.type === "start_eve.session-rotated-stale"));
});

test("registerStartEveSession blocks polluted continuity state", () => {
  const registry = emptyEveSessionRegistry(new Date("2026-06-02T00:00:00.000Z"));
  registry.sessions["eve-founder-companion"] = {
    id: "eve-founder-companion",
    status: "polluted",
    updated_at: "2026-06-02T00:00:00.000Z",
    hygiene: {
      stale_after_days: 14,
      pollution: { detected: true, reason: "secret pasted" },
      pollution_markers_found: ["secret"],
    },
  };
  const root = tmpDir();
  const registryPath = path.join(root, "registry.json");
  fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

  const result = registerStartEveSession({
    route,
    preflight,
    paths: { contextRoot: root },
    registryPath,
    now: new Date("2026-06-02T00:00:00.000Z"),
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "eve-session-registry.polluted-session");
  assert.equal(result.hygiene.polluted, true);
  assert.equal(result.written, false);
});

test("closeEveWorkstreamSession marks the workstream closed", () => {
  const registry = emptyEveSessionRegistry(new Date("2026-06-02T00:00:00.000Z"));
  registry.sessions["eve-founder-companion"] = {
    id: "eve-founder-companion",
    status: "open",
    opened_at: "2026-06-02T00:00:00.000Z",
    updated_at: "2026-06-02T00:00:00.000Z",
    hygiene: { stale_after_days: 14 },
  };

  const result = closeEveWorkstreamSession({
    registry,
    reason: "operator close",
    now: new Date("2026-06-03T00:00:00.000Z"),
  });

  assert.equal(result.ok, true);
  assert.equal(result.session.status, "closed");
  assert.equal(result.session.close_reason, "operator close");
  assert.equal(evaluateEveSessionHygiene(result.session).close_required, true);
});
