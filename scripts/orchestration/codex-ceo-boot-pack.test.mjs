import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  BOOT_PACK_REQUIRED_PATHS,
  buildCodexCeoBootPack,
  buildCodexExecCommand,
} from "./codex-ceo-boot-pack.mjs";

function makeFixtureRoot() {
  const root = join(tmpdir(), `codex-ceo-boot-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(join(root, "docs", "orchestration"), { recursive: true });
  mkdirSync(join(root, "docs", "operations"), { recursive: true });
  mkdirSync(join(root, "docs", "governance"), { recursive: true });
  mkdirSync(join(root, "docs", "agents"), { recursive: true });
  mkdirSync(join(root, "docs", "templates"), { recursive: true });
  mkdirSync(join(root, "docs", "registries"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "# AGENTS\nCEO boot rules\n", "utf8");
  writeFileSync(join(root, "docs", "system-index.md"), "# System Index\nLayer map\n", "utf8");
  writeFileSync(join(root, "docs", "page-index.md"), "# Page Index\nKnowledge map\n", "utf8");
  writeFileSync(join(root, "CHANGELOG.md"), "# Changelog\n## Unreleased\n", "utf8");
  writeFileSync(join(root, "ROADMAP.md"), "# Roadmap\n", "utf8");
  writeFileSync(join(root, "VERSION"), "0.4.0-alpha.1\n", "utf8");
  for (const file of BOOT_PACK_REQUIRED_PATHS.filter((item) => item.startsWith("docs/"))) {
    writeFileSync(join(root, file), `# ${file}\nRequired source truth.\n`, "utf8");
  }
  return root;
}

test("buildCodexCeoBootPack loads required CEO/controller source files with hashes", () => {
  const root = makeFixtureRoot();
  try {
    const pack = buildCodexCeoBootPack({
      root,
      objective: "Review dispatch queue and decide next action.",
      now: new Date("2026-05-11T12:00:00.000Z"),
      env: { OPENAI_API_KEY: "sk-secret-value" },
      includeUserCodexRules: false,
    });

    assert.equal(pack.version, "codex-ceo-boot-pack/v0");
    assert.equal(pack.identity, "codex-ceo-orchestrator");
    assert.equal(pack.auth.api_key_present, true);
    assert.equal(pack.source_files.filter((file) => file.required).every((file) => file.exists), true);
    assert.ok(pack.source_files.some((file) => file.path === "AGENTS.md" && file.sha256.length === 64));
    assert.match(pack.prompt, /Review dispatch queue/);
    assert.match(pack.prompt, /boot_context_proof/);
    assert.match(pack.prompt, /Global Plane Auth Bridge/);
    assert.doesNotMatch(JSON.stringify(pack), /sk-secret-value/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("buildCodexCeoBootPack fails closed when required boot files are missing", () => {
  const root = makeFixtureRoot();
  rmSync(join(root, "docs", "orchestration", "codex-controller-runtime.md"));
  try {
    const pack = buildCodexCeoBootPack({
      root,
      objective: "Decide next controller action.",
      includeUserCodexRules: false,
    });

    assert.equal(pack.ok, false);
    assert.ok(pack.missing_required_files.includes("docs/orchestration/codex-controller-runtime.md"));
    assert.match(pack.prompt, /BOOT PACK INCOMPLETE/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("buildCodexExecCommand emits subscription lane by default and explicit API lane on request", () => {
  const subscription = buildCodexExecCommand({
    root: "/repo",
    promptPath: "/repo/runtime/codex-ceo/prompt.md",
  });
  assert.equal(subscription[0], "codex");
  assert.deepEqual(subscription.slice(0, 4), ["codex", "exec", "--cd", "/repo"]);
  assert.equal(subscription.includes("--ask-for-approval"), true);
  assert.equal(subscription.includes("\"$(cat /repo/runtime/codex-ceo/prompt.md)\""), true);
  assert.equal(subscription.some((part) => /OPENAI_API_KEY/.test(part)), false);

  const api = buildCodexExecCommand({
    root: "/repo",
    promptPath: "/repo/runtime/codex-ceo/prompt.md",
    authLane: "api",
  });
  assert.equal(api.includes("CODEX_AUTH_LANE=api"), true);
});
