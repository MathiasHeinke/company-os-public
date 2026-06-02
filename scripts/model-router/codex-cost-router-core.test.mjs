import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  CLAUDE_AUDIT_EXPECT_OUTPUT_AFTER_SECONDS,
  CLAUDE_AUDIT_FIRST_RECHECK_SECONDS,
  CLAUDE_AUDIT_TIMEOUT_MS,
  buildCodexOpenRouterArgs,
  buildModelRouterRaindropOutputDir,
  buildGeminiArgs,
  buildRunPlan,
  buildWorkerPrompt,
  detectPromptRisk,
  parseModelList,
  persistModelResult,
  persistModelRouterRaindropSummary,
  runModelWorker,
  sanitizeWorkerOutput,
  writeRunFiles,
} from "./codex-cost-router-core.mjs";

test("task modes select cheap workers by default", () => {
  assert.deepEqual(parseModelList("", "issue-triage"), ["grok"]);
  assert.deepEqual(parseModelList("", "spec-drift"), ["deepseek"]);
  assert.deepEqual(parseModelList("", "morning-briefing-redacted"), ["grok", "deepseek"]);
});

test("secret prompts are blocked even when private override is enabled", () => {
  const fakeOpenRouterKey = ["sk-or-v1", "secretvalue"].join("-");
  const envName = ["OPENROUTER", "API", "KEY"].join("_");
  const plan = buildRunPlan({
    mode: "issue-triage",
    prompt: `Use ${envName}=${fakeOpenRouterKey}`,
    allowPrivate: true,
  });

  assert.equal(plan.blocked, true);
  assert.equal(plan.blockReason, "secret_detected");
  assert.ok(plan.risk.secretBlockers.includes("openrouter_key"));
});

test("private prompts require explicit allow-private", () => {
  const plan = buildRunPlan({
    mode: "morning-briefing-redacted",
    prompt: "Read ${LOCAL_WORKSPACE}",
  });

  assert.equal(plan.blocked, true);
  assert.equal(plan.blockReason, "private_context_requires_explicit_allow_private");
});

test("blocked prompts are not persisted to run files", () => {
  const fakeOpenRouterKey = ["sk-or-v1", "secretvalue"].join("-");
  const privatePath = "${LOCAL_WORKSPACE}";
  const prompt = `Use ${fakeOpenRouterKey} and ${privatePath}`;
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-cost-router-blocked-"));
  const plan = buildRunPlan({
    mode: "issue-triage",
    prompt,
    outDir,
  });

  assert.equal(plan.blocked, true);
  writeRunFiles({ plan, prompt });

  const storedPrompt = fs.readFileSync(path.join(outDir, "prompt.md"), "utf8");
  const storedWorkerPrompt = fs.readFileSync(path.join(outDir, "worker-prompt.md"), "utf8");
  assert.match(storedPrompt, /Prompt Not Stored/);
  assert.match(storedWorkerPrompt, /Worker Prompt Not Stored/);
  assert.equal(storedPrompt.includes(fakeOpenRouterKey), false);
  assert.equal(storedPrompt.includes(privatePath), false);
  assert.equal(storedWorkerPrompt.includes(fakeOpenRouterKey), false);
  assert.equal(storedWorkerPrompt.includes(privatePath), false);
});

test("safe redacted worker prompt stays executable", () => {
  const prompt = buildWorkerPrompt({
    mode: "implementation-plan",
    issueId: "[WORK_ITEM_ID]",
    prompt: "Plan a public non-private CLI helper.",
  });

  assert.match(prompt, /bounded read-only worker/);
  assert.match(prompt, /Do not edit files/);
  assert.match(prompt, /[WORK_ITEM_ID]/);
});

test("codex OpenRouter args avoid user config and rules", () => {
  const args = buildCodexOpenRouterArgs({
    profile: { model: "x-ai/grok-4.3", reasoningEffort: "xhigh" },
    workspace: "/tmp/company-os",
  });

  assert.ok(args.includes("--ignore-user-config"));
  assert.ok(args.includes("--ignore-rules"));
  assert.ok(args.includes("--ephemeral"));
  assert.ok(args.includes("x-ai/grok-4.3"));
});

test("Gemini CLI args stay in read-only plan mode", () => {
  const args = buildGeminiArgs({
    prompt: "Return a bounded audit.",
    profile: { model: "gemini-3.1-pro-preview" },
  });

  assert.deepEqual(args.slice(0, 4), ["--skip-trust", "-p", "Return a bounded audit.", "-m"]);
  assert.ok(args.includes("gemini-3.1-pro-preview"));
  assert.ok(args.includes("--approval-mode"));
  assert.ok(args.includes("plan"));
});

test("runModelWorker dispatches Gemini through the configured CLI binary", () => {
  const plan = buildRunPlan({
    mode: "spec-drift",
    models: "gemini",
    prompt: "Public spec drift prompt.",
    workspace: "/tmp",
  });
  const calls = [];
  const result = runModelWorker({
    modelAlias: "gemini",
    plan,
    geminiBinary: "/tmp/gemini",
    commandRunner: (call) => {
      calls.push(call);
      return { status: 0, stdout: "ok", stderr: "" };
    },
  });

  assert.equal(result.status, 0);
  assert.equal(calls[0].command, "/tmp/gemini");
  assert.ok(calls[0].args.includes("--approval-mode"));
});

test("runModelWorker gives Claude Opus 4.7 Max audit workers long timeout metadata", () => {
  const plan = buildRunPlan({
    mode: "external-audit",
    models: "claude",
    prompt: "Public audit prompt.",
    workspace: "/tmp",
  });
  const calls = [];
  const result = runModelWorker({
    modelAlias: "claude",
    plan,
    claudeBinary: "/tmp/claude",
    commandRunner: (call) => {
      calls.push(call);
      return { status: 0, stdout: "ok", stderr: "" };
    },
  });

  assert.equal(result.status, 0);
  assert.equal(calls[0].command, "/tmp/claude");
  assert.equal(calls[0].timeoutMs, CLAUDE_AUDIT_TIMEOUT_MS);
  assert.equal(CLAUDE_AUDIT_FIRST_RECHECK_SECONDS, 300);
  assert.equal(CLAUDE_AUDIT_EXPECT_OUTPUT_AFTER_SECONDS, 600);
});

test("risk detector catches private patterns without catching normal public issue text", () => {
  const publicRisk = detectPromptRisk("[WORK_ITEM_ID]: implement a worktree reconcile gate.");
  assert.equal(publicRisk.secretBlockers.length, 0);
  assert.equal(publicRisk.privateBlockers.length, 0);

  const privateRisk = detectPromptRisk("Finance: Finanzamt rate status for a personal account.");
  assert.ok(privateRisk.privateBlockers.includes("private_finance"));
});

test("persistModelResult redacts leaked secrets in reports", () => {
  const fakeOpenRouterKey = ["sk-or-v1", "abc123def456ghi789jkl"].join("-");
  const plan = buildRunPlan({
    mode: "issue-triage",
    prompt: "Safe prompt",
    outDir: "/tmp/codex-cost-router-test-redact",
  });
  const result = persistModelResult({
    plan,
    modelAlias: "grok",
    result: {
      status: 0,
      signal: null,
      stdout: `token ${fakeOpenRouterKey} should not persist`,
      stderr: "",
    },
  });

  assert.equal(result.exitCode, 0);
  assert.match(fs.readFileSync(result.report, "utf8"), /\[REDACTED:openrouter_key\]/);
});

test("sanitizeWorkerOutput redacts private markers and truncates noisy logs", () => {
  const sanitized = sanitizeWorkerOutput(
    "private ${LOCAL_WORKSPACE} contact ceo@example.com\n".repeat(20),
    { maxChars: 120 },
  );

  assert.equal(sanitized.text.includes("${LOCAL_WORKSPACE}"), false);
  assert.equal(sanitized.text.includes("ceo@example.com"), false);
  assert.ok(sanitized.privateHits.includes("mh_dev_path"));
  assert.ok(sanitized.privateHits.includes("email_address"));
  assert.equal(sanitized.truncated, true);
  assert.match(sanitized.text, /\[TRUNCATED:/);
});

test("persistModelResult stores log-isolation metadata for redacted worker output", () => {
  const plan = buildRunPlan({
    mode: "issue-triage",
    prompt: "Safe prompt",
    outDir: fs.mkdtempSync(path.join(os.tmpdir(), "codex-cost-router-log-isolation-")),
  });
  const result = persistModelResult({
    plan,
    modelAlias: "grok",
    result: {
      status: 0,
      signal: null,
      stdout: "private ${LOCAL_WORKSPACE}",
      stderr: "",
    },
  });
  const report = fs.readFileSync(result.report, "utf8");
  const meta = JSON.parse(fs.readFileSync(path.join(plan.outDir, "grok-4-3.json"), "utf8"));

  assert.equal(report.includes("${LOCAL_WORKSPACE}"), false);
  assert.ok(meta.logIsolation.stdoutPrivateHits.includes("mh_dev_path"));
});

test("buildModelRouterRaindropOutputDir maps model-router reports to observability date lane", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "company-os-root-"));
  const plan = {
    outDir: path.join(root, "reports", "model-router", "2026-05-19", "1200-spec-drift-compa-270"),
  };

  assert.equal(
    buildModelRouterRaindropOutputDir({ plan }),
    path.join(root, "reports", "observability", "raindrop-workshop", "2026-05-19"),
  );
});

test("persistModelRouterRaindropSummary writes safe call summary for Gemini worker", () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-cost-router-raindrop-"));
  const plan = buildRunPlan({
    mode: "spec-drift",
    models: "gemini",
    prompt: "Safe public prompt",
    issueId: "[WORK_ITEM_ID]",
    outDir,
  });
  const persisted = persistModelResult({
    plan,
    modelAlias: "gemini",
    result: { status: 0, signal: null, stdout: "ok", stderr: "" },
  });
  const raindropDir = path.join(outDir, "raindrop-test");
  const artifacts = persistModelRouterRaindropSummary({
    plan,
    modelAlias: "gemini",
    result: { status: 0, signal: null, stdout: "ok", stderr: "" },
    persisted,
    startedAt: "2026-05-19T12:00:00.000Z",
    endedAt: "2026-05-19T12:00:02.000Z",
    outputDir: raindropDir,
  });

  assert.equal(artifacts.surface, "model-router/gemini-cli-worker");
  const json = JSON.parse(fs.readFileSync(artifacts.jsonPath, "utf8"));
  const s = json["raindrop.llm_call_summary"];
  assert.equal(s.agent, "gemini");
  assert.equal(s.plane_issue, "[WORK_ITEM_ID]");
  assert.equal(s.input_redaction_level, "redacted");
  assert.equal("raw_prompt" in s, false);
});
