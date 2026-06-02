import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildAgentEventRow,
  buildClaudeRuntimeArgs,
  buildRunReportMarkdown,
  buildRunSummaryYaml,
  buildWorkerPrompt,
  selectWorkerPromptGuards,
  WORKER_PROMPT_GUARDS,
  buildWorkerReportedYaml,
  claudeProjectSlugCandidatesForWorkspace,
  claudeProjectSlugForWorkspace,
  deriveRuntimeRunReportPath,
  deriveRuntimeStreamPath,
  extractRuntimeToolWritePaths,
  isAllowedClaudePlanScratchWritePath,
  isAllowedClaudeProjectMemoryReadPath,
  detectRuntimeToolScopeViolations,
  detectRuntimeToolWriteScopeViolations,
  detectOutOfScopeFiles,
  evaluateGateToolAllowlist,
  evaluateRuntimeStreamHealth,
  extractDeclaredArtifactPath,
  findDeclaredAbsolutePath,
  formatPlaneWorkItemSequence,
  inferRuntimeStateFromWorkerOutput,
  parseRuntimeDurationMs,
  redactRuntimeOutput,
  resolveClaudeAllowedTools,
  resolveClaudeRuntimeBuiltinTools,
  resolveAllowedReadPaths,
  resolveEffectiveAllowedReadPaths,
  resolveAllowedWritePaths,
  isAllowedClaudeToolResultPath,
  resolveKillSwitchPaths,
  resolveRuntimeMaxTurns,
  resolveRuntimeWorkspacePath,
  sanitizeRuntimeCommandArgs,
  splitChangedFilesByRuntimeAttribution,
  summarizeRuntimeStreamLog,
  workerOutputHasTopLevelField,
  readReportArtifactText,
} from "./runtime-dispatcher-v12-core.mjs";
import { validateAgentEventRow } from "../agent-events/agent-event-core.mjs";

test("parseRuntimeDurationMs supports minutes, seconds and fallback", () => {
  assert.equal(parseRuntimeDurationMs("2m"), 120000);
  assert.equal(parseRuntimeDurationMs("3s"), 3000);
  assert.equal(parseRuntimeDurationMs("", 123), 123);
});

test("resolveRuntimeMaxTurns prefers contract MaxTurns and clamps unsafe values", () => {
  assert.equal(resolveRuntimeMaxTurns({ maxturns: "120" }, "30"), "120");
  assert.equal(resolveRuntimeMaxTurns({ max_turns: "80 turns" }, "30"), "80");
  assert.equal(resolveRuntimeMaxTurns({ maxturns: "900" }, "30"), "200");
  assert.equal(resolveRuntimeMaxTurns({ maxturns: "nope" }, "45"), "45");
});

test("resolveRuntimeWorkspacePath maps company registry aliases", () => {
  assert.equal(resolveRuntimeWorkspacePath("registry:company-os"), "[LOCAL_WORKSPACE]");
  assert.equal(resolveRuntimeWorkspacePath("/tmp/example"), "/tmp/example");
  assert.equal(resolveRuntimeWorkspacePath("unknown"), "");
});

test("deriveRuntimeStreamPath creates a sibling JSONL stream artifact", () => {
  assert.equal(
    deriveRuntimeStreamPath("/tmp/run.md", "run-1"),
    "/tmp/run.run-1.stream.jsonl",
  );
});

test("deriveRuntimeRunReportPath creates a sibling runtime sidecar artifact", () => {
  assert.equal(
    deriveRuntimeRunReportPath("/tmp/run.md", "run-1"),
    "/tmp/run.md.run-1.runtime.md",
  );
});

test("formatPlaneWorkItemSequence uses project identifiers beyond COMPA", () => {
  assert.equal(formatPlaneWorkItemSequence({ sequence_id: 47, _project_identifier: "GROW" }), "GROW-47");
  assert.equal(formatPlaneWorkItemSequence({ sequence_id: 316 }), "[WORK_ITEM_ID]");
  assert.equal(formatPlaneWorkItemSequence({ id: "uuid-only" }), "uuid-only");
});

test("resolveAllowedWritePaths prefers explicit AllowedWritePaths", () => {
  const resolved = resolveAllowedWritePaths({
    allowedwritepaths: ["scripts/orchestration", "/tmp/exact.md"],
    scope: ["Only docs/ should be ignored because explicit paths win."],
  }, "/repo");
  assert.equal(resolved.source, "allowed_write_paths");
  assert.deepEqual(resolved.paths.sort(), ["/repo/scripts/orchestration", "/tmp/exact.md"].sort());
});

test("resolveAllowedReadPaths defaults to workspace and accepts explicit paths", () => {
  assert.deepEqual(resolveAllowedReadPaths({}, "/repo"), { source: "workspace", paths: ["/repo"] });
  const explicit = resolveAllowedReadPaths({ allowedreadpaths: ["docs/", "/tmp/readme.md"] }, "/repo");
  assert.equal(explicit.source, "allowed_read_paths");
  assert.deepEqual(explicit.paths.sort(), ["/repo/docs", "/tmp/readme.md"].sort());
});

test("resolveEffectiveAllowedReadPaths always includes runtime workspace for sandbox boot reads", () => {
  const explicit = resolveAllowedReadPaths({ allowedreadpaths: ["/canonical/company-os"] }, "/sandbox/company-os");
  assert.deepEqual(
    resolveEffectiveAllowedReadPaths({
      allowedReadPaths: explicit,
      workspacePath: "/sandbox/company-os",
      runtimeOwnedReadPaths: ["/sandbox/company-os/reports/runtime"],
    }).sort(),
    ["/canonical/company-os", "/sandbox/company-os", "/sandbox/company-os/reports/runtime"].sort(),
  );
});

test("detectRuntimeToolScopeViolations allows Claude project memory for allowed workspace roots only", () => {
  const previousHome = process.env.HOME;
  process.env.HOME = "[LOCAL_WORKSPACE]";
  try {
    const companyRoot = "[LOCAL_WORKSPACE]";
    const sandboxRoot = "[LOCAL_WORKSPACE]";
    const companyMemory = "[LOCAL_WORKSPACE]";
    const otherMemory = "[LOCAL_WORKSPACE]";
    assert.equal(isAllowedClaudeProjectMemoryReadPath(companyMemory, [companyRoot]), true);
    assert.equal(isAllowedClaudeProjectMemoryReadPath(otherMemory, [companyRoot]), false);

    const allowedToolUse = JSON.stringify({
      type: "stream_event",
      event: {
        type: "content_block_start",
        content_block: {
          type: "tool_use",
          name: "Read",
          input: { file_path: companyMemory },
        },
      },
    });
    const blockedToolUse = JSON.stringify({
      type: "stream_event",
      event: {
        type: "content_block_start",
        content_block: {
          type: "tool_use",
          name: "Read",
          input: { file_path: otherMemory },
        },
      },
    });

    assert.deepEqual(
      detectRuntimeToolScopeViolations(allowedToolUse, [companyRoot, sandboxRoot], { workspacePath: sandboxRoot }),
      [],
    );
    assert.deepEqual(
      detectRuntimeToolScopeViolations(blockedToolUse, [companyRoot, sandboxRoot], { workspacePath: sandboxRoot }),
      [{ tool: "Read", reason: "runtime.tool-read-path-out-of-scope", path: otherMemory }],
    );
  } finally {
    if (previousHome === undefined) delete process.env.HOME;
    else process.env.HOME = previousHome;
  }
});

test("resolveAllowedWritePaths can derive path-like tokens from Scope prose", () => {
  const resolved = resolveAllowedWritePaths({
    scope: [
      "Only inside scripts/orchestration, scripts/plane, docs/page-index.md, and reports/headless-pilot.",
    ],
  }, "/repo");
  assert.equal(resolved.source, "scope");
  assert.ok(resolved.paths.includes("/repo/scripts/orchestration"));
  assert.ok(resolved.paths.includes("/repo/docs/page-index.md"));
});

test("detectOutOfScopeFiles flags changed files outside allowed paths", () => {
  const out = detectOutOfScopeFiles(
    ["/repo/scripts/orchestration/a.mjs", "/repo/src/app.ts"],
    ["/repo/scripts/orchestration", "/repo/docs/page-index.md"],
  );
  assert.deepEqual(out, ["/repo/src/app.ts"]);
});

test("detectRuntimeToolScopeViolations blocks streamed tool reads outside AllowedReadPaths", () => {
  const toolUse = JSON.stringify({
    type: "stream_event",
    event: {
      type: "content_block_start",
      content_block: {
        type: "tool_use",
        name: "Bash",
        input: {
          command: "grep -rlI 'BEGIN PRIVATE KEY' ~/Downloads [LOCAL_WORKSPACE]",
        },
      },
    },
  });
  const streamLine = JSON.stringify({ type: "stream", text: toolUse });
  const violations = detectRuntimeToolScopeViolations(streamLine, ["[LOCAL_WORKSPACE]"]);

  assert.equal(violations.length, 1);
  assert.equal(violations[0].reason, "runtime.bash-read-path-out-of-scope");
  assert.ok(violations[0].paths.some((path) => path.endsWith("/Downloads")));
  assert.equal(violations[0].paths.some((path) => path.includes("/Company.OS/docs")), false);
});

test("detectRuntimeToolScopeViolations does not treat absolute executable path as read drift", () => {
  const toolUse = JSON.stringify({
    type: "stream_event",
    event: {
      type: "content_block_start",
      content_block: {
        type: "tool_use",
        name: "Bash",
        input: {
          command: "[LOCAL_WORKSPACE] detect-changes --repo company-os --scope unstaged",
        },
      },
    },
  });
  const streamLine = JSON.stringify({ type: "stream", text: toolUse });
  const violations = detectRuntimeToolScopeViolations(streamLine, ["[LOCAL_WORKSPACE]"]);

  assert.deepEqual(violations, []);
});

test("detectRuntimeToolScopeViolations does not treat grep path-looking regex as read drift", () => {
  const toolUse = JSON.stringify({
    type: "stream_event",
    event: {
      type: "content_block_start",
      content_block: {
        type: "tool_use",
        name: "Bash",
        input: {
          command: "grep -nP '/Users/[a-zA-Z][-a-zA-Z0-9]+' docs/operations/runtime-auth-preflight.md",
        },
      },
    },
  });
  const streamLine = JSON.stringify({ type: "stream", text: toolUse });
  const violations = detectRuntimeToolScopeViolations(streamLine, ["[LOCAL_WORKSPACE]"]);

  assert.deepEqual(violations, []);
});

test("detectRuntimeToolScopeViolations ignores POSIX null-device redirection", () => {
  const toolUse = JSON.stringify({
    type: "stream_event",
    event: {
      type: "content_block_start",
      content_block: {
        type: "tool_use",
        name: "Bash",
        input: {
          command: "git show HEAD:AGENTS.md > /dev/null && git show HEAD:CLAUDE.md > /dev/null && echo OK",
        },
      },
    },
  });
  const streamLine = JSON.stringify({ type: "stream", text: toolUse });
  const violations = detectRuntimeToolScopeViolations(streamLine, ["[LOCAL_WORKSPACE]"]);

  assert.deepEqual(violations, []);
});

test("detectRuntimeToolScopeViolations still blocks quoted grep file paths outside scope", () => {
  const toolUse = JSON.stringify({
    type: "stream_event",
    event: {
      type: "content_block_start",
      content_block: {
        type: "tool_use",
        name: "Bash",
        input: {
          command: "grep -n TODO '[LOCAL_WORKSPACE]'",
        },
      },
    },
  });
  const streamLine = JSON.stringify({ type: "stream", text: toolUse });
  const violations = detectRuntimeToolScopeViolations(streamLine, ["[LOCAL_WORKSPACE]"]);

  assert.equal(violations.length, 1);
  assert.equal(violations[0].reason, "runtime.bash-read-path-out-of-scope");
  assert.ok(violations[0].paths.includes("[LOCAL_WORKSPACE]"));
});

test("detectRuntimeToolScopeViolations ignores write tools; write guard owns them", () => {
  const toolUse = JSON.stringify({
    type: "stream_event",
    event: {
      type: "content_block_start",
      content_block: {
        type: "tool_use",
        name: "Write",
        input: {
          file_path: "[LOCAL_WORKSPACE]",
        },
      },
    },
  });
  const streamLine = JSON.stringify({ type: "stream", text: toolUse });
  const violations = detectRuntimeToolScopeViolations(streamLine, ["[LOCAL_WORKSPACE]"]);

  assert.deepEqual(violations, []);
});

test("detectRuntimeToolScopeViolations allows current Claude project tool-result reads", () => {
  const workspacePath = "[LOCAL_WORKSPACE]";
  const toolResultPath = join(
    process.env.HOME || "[LOCAL_WORKSPACE]",
    ".claude",
    "projects",
    claudeProjectSlugForWorkspace(workspacePath),
    "tool-results",
    "toolu_01YVY16vo3SCtWe5eWCxvz2z.txt",
  );
  const toolUse = JSON.stringify({
    type: "stream_event",
    event: {
      type: "content_block_start",
      content_block: {
        type: "tool_use",
        name: "Read",
        input: {
          file_path: toolResultPath,
        },
      },
    },
  });
  const streamLine = JSON.stringify({ type: "stream", text: toolUse });
  const violations = detectRuntimeToolScopeViolations(streamLine, [workspacePath], { workspacePath });

  assert.equal(isAllowedClaudeToolResultPath(toolResultPath, workspacePath), true);
  assert.deepEqual(violations, []);
});

test("claudeProjectSlugCandidatesForWorkspace pins legacy and current slug formats", () => {
  const workspacePath = "[LOCAL_WORKSPACE]";

  assert.deepEqual(claudeProjectSlugCandidatesForWorkspace(workspacePath), [
    "-Users-mathiasheinke-Developer-agent-sandboxes-company-os-pub06-persona-doctrine",
    "-Users-mathiasheinke-Developer--agent-sandboxes-company-os-pub06-persona-doctrine",
  ]);
});

test("detectRuntimeToolScopeViolations allows Claude v2 session tool-result reads", () => {
  const workspacePath = "[LOCAL_WORKSPACE]";
  const currentSlug = "-Users-mathiasheinke-Developer--agent-sandboxes-company-os-pub06-persona-doctrine";
  assert.equal(claudeProjectSlugCandidatesForWorkspace(workspacePath).includes(currentSlug), true);
  const toolResultPath = join(
    process.env.HOME || "[LOCAL_WORKSPACE]",
    ".claude",
    "projects",
    currentSlug,
    "6dd6cfd2-0f1d-425e-8ead-a7c82f17ee37",
    "tool-results",
    "buij1ouo2.txt",
  );
  const toolUse = JSON.stringify({
    type: "stream_event",
    event: {
      type: "content_block_start",
      content_block: {
        type: "tool_use",
        name: "Read",
        input: {
          file_path: toolResultPath,
        },
      },
    },
  });
  const streamLine = JSON.stringify({ type: "stream", text: toolUse });
  const violations = detectRuntimeToolScopeViolations(streamLine, [workspacePath], { workspacePath });

  assert.equal(isAllowedClaudeToolResultPath(toolResultPath, workspacePath), true);
  assert.deepEqual(violations, []);
});

test("detectRuntimeToolScopeViolations blocks Claude tool-result reads for other workspaces", () => {
  const workspacePath = "[LOCAL_WORKSPACE]";
  const otherWorkspacePath = "[LOCAL_WORKSPACE]";
  const toolResultPath = join(
    process.env.HOME || "[LOCAL_WORKSPACE]",
    ".claude",
    "projects",
    claudeProjectSlugForWorkspace(otherWorkspacePath),
    "tool-results",
    "toolu_01YVY16vo3SCtWe5eWCxvz2z.txt",
  );
  const toolUse = JSON.stringify({
    type: "stream_event",
    event: {
      type: "content_block_start",
      content_block: {
        type: "tool_use",
        name: "Read",
        input: {
          file_path: toolResultPath,
        },
      },
    },
  });
  const streamLine = JSON.stringify({ type: "stream", text: toolUse });
  const violations = detectRuntimeToolScopeViolations(streamLine, [workspacePath], { workspacePath });

  assert.equal(isAllowedClaudeToolResultPath(toolResultPath, workspacePath), false);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].reason, "runtime.tool-read-path-out-of-scope");
});

test("detectRuntimeToolScopeViolations still blocks non-tool-result Claude reads", () => {
  const workspacePath = "[LOCAL_WORKSPACE]";
  const planPath = join(
    process.env.HOME || "[LOCAL_WORKSPACE]",
    ".claude",
    "projects",
    claudeProjectSlugForWorkspace(workspacePath),
    "plans",
    "example.md",
  );
  const toolUse = JSON.stringify({
    type: "stream_event",
    event: {
      type: "content_block_start",
      content_block: {
        type: "tool_use",
        name: "Read",
        input: {
          file_path: planPath,
        },
      },
    },
  });
  const streamLine = JSON.stringify({ type: "stream", text: toolUse });
  const violations = detectRuntimeToolScopeViolations(streamLine, [workspacePath], { workspacePath });

  assert.equal(isAllowedClaudeToolResultPath(planPath, workspacePath), false);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].reason, "runtime.tool-read-path-out-of-scope");
});

test("detectRuntimeToolWriteScopeViolations blocks worker-attributed writes outside AllowedWritePaths", () => {
  const toolUse = JSON.stringify({
    type: "stream_event",
    event: {
      type: "content_block_start",
      content_block: {
        type: "tool_use",
        name: "Write",
        input: {
          file_path: "[LOCAL_WORKSPACE]",
        },
      },
    },
  });
  const streamLine = JSON.stringify({ type: "stream", text: toolUse });
  const violations = detectRuntimeToolWriteScopeViolations(streamLine, [
    "[LOCAL_WORKSPACE]",
  ]);

  assert.equal(violations.length, 1);
  assert.equal(violations[0].reason, "runtime.tool-write-path-out-of-scope");
  assert.equal(
    violations[0].path,
    "[LOCAL_WORKSPACE]",
  );
});

test("detectRuntimeToolWriteScopeViolations allows Claude plan-mode scratch writes", () => {
  const planPath = join(
    process.env.HOME || "[LOCAL_WORKSPACE]",
    ".claude",
    "plans",
    "you-are-a-company-os-temporal-wilkinson.md",
  );
  const toolUse = JSON.stringify({
    type: "stream_event",
    event: {
      type: "content_block_start",
      content_block: {
        type: "tool_use",
        name: "Write",
        input: {
          file_path: planPath,
        },
      },
    },
  });
  const streamLine = JSON.stringify({ type: "stream", text: toolUse });

  assert.equal(isAllowedClaudePlanScratchWritePath(planPath), true);
  assert.deepEqual(detectRuntimeToolWriteScopeViolations(streamLine, ["/repo/allowed"]), []);
});

test("detectRuntimeToolWriteScopeViolations blocks non-markdown Claude scratch writes", () => {
  const planPath = join(
    process.env.HOME || "[LOCAL_WORKSPACE]",
    ".claude",
    "plans",
    "raw-session.json",
  );
  const toolUse = JSON.stringify({
    type: "stream_event",
    event: {
      type: "content_block_start",
      content_block: {
        type: "tool_use",
        name: "Write",
        input: {
          file_path: planPath,
        },
      },
    },
  });
  const streamLine = JSON.stringify({ type: "stream", text: toolUse });
  const violations = detectRuntimeToolWriteScopeViolations(streamLine, ["/repo/allowed"]);

  assert.equal(isAllowedClaudePlanScratchWritePath(planPath), false);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].reason, "runtime.tool-write-path-out-of-scope");
});

test("detectRuntimeToolWriteScopeViolations ignores read-only tools and in-scope writes", () => {
  const rows = [
    {
      type: "stream_event",
      event: {
        type: "content_block_start",
        content_block: {
          type: "tool_use",
          name: "Read",
          input: { file_path: "/repo/outside.md" },
        },
      },
    },
    {
      type: "stream_event",
      event: {
        type: "content_block_start",
        content_block: {
          type: "tool_use",
          name: "Edit",
          input: { file_path: "/repo/allowed/file.md" },
        },
      },
    },
  ].map((row) => JSON.stringify({ type: "stream", text: JSON.stringify(row) })).join("\n");

  assert.deepEqual(detectRuntimeToolWriteScopeViolations(rows, ["/repo/allowed"]), []);
});

test("extractRuntimeToolWritePaths normalizes worker write tools for attribution", () => {
  const rows = [
    {
      type: "stream_event",
      event: {
        type: "content_block_start",
        content_block: {
          type: "tool_use",
          name: "Read",
          input: { file_path: "/repo/outside.md" },
        },
      },
    },
    {
      type: "stream_event",
      event: {
        type: "content_block_start",
        content_block: {
          type: "tool_use",
          name: "MultiEdit",
          input: { file_path: "docs/runtime.md" },
        },
      },
    },
    {
      type: "stream_event",
      event: {
        type: "content_block_start",
        content_block: {
          type: "tool_use",
          name: "NotebookEdit",
          input: { notebook_path: "/repo/notebooks/a.ipynb" },
        },
      },
    },
  ].map((row) => JSON.stringify({ type: "stream", text: JSON.stringify(row) })).join("\n");

  assert.deepEqual(extractRuntimeToolWritePaths(rows, "/repo"), [
    "/repo/docs/runtime.md",
    "/repo/notebooks/a.ipynb",
  ]);
});

test("splitChangedFilesByRuntimeAttribution keeps external dirty files away from worker drift", () => {
  const attribution = splitChangedFilesByRuntimeAttribution(
    [
      "/repo/docs/runtime.md",
      "/repo/external.md",
      "/repo/reports/run.md",
    ],
    [
      "/repo/docs/runtime.md",
      "/repo/reports",
    ],
  );

  assert.deepEqual(attribution.worker_attributed_changed_files, [
    "/repo/docs/runtime.md",
    "/repo/reports/run.md",
  ]);
  assert.deepEqual(attribution.external_changed_files, ["/repo/external.md"]);
});

test("resolveKillSwitchPaths extracts runtime/kill sentinel paths", () => {
  const resolved = resolveKillSwitchPaths({
    killswitch: "Plane comment KILL [WORK_ITEM_ID] or local sentinel runtime/kill/run-1",
  }, "/repo");
  assert.deepEqual(resolved, ["/repo/runtime/kill/run-1"]);
});

test("extractDeclaredArtifactPath prefers absolute Reporting path", () => {
  const path = extractDeclaredArtifactPath({ reporting: ["Plane comment", "/tmp/run.md"] }, "run-1");
  assert.equal(path, "/tmp/run.md");
});

test("extractDeclaredArtifactPath trims sentence punctuation from markdown path", () => {
  const path = extractDeclaredArtifactPath({ reporting: "Artifact: /tmp/run.md." }, "run-1");
  assert.equal(path, "/tmp/run.md");
});

test("extractDeclaredArtifactPath normalizes directory Reporting path to run markdown file", () => {
  const path = extractDeclaredArtifactPath({ reporting: "Plane comment plus /tmp/runtime-pilots/" }, "run-1");
  assert.equal(path, "/tmp/runtime-pilots/run-1.md");
});

test("findDeclaredAbsolutePath ignores relative slash tokens in prose", () => {
  assert.equal(findDeclaredAbsolutePath("Plane worker.reported with commands/results and report paths"), "");
});

test("extractDeclaredArtifactPath skips commands/results and uses OutcomeArtifacts", () => {
  const path = extractDeclaredArtifactPath({
    reporting: "Plane worker.reported with changed files, commands/results and summary paths.",
    outcome_artifacts: ["/tmp/runtime-pilots/"],
  }, "run-1");
  assert.equal(path, "/tmp/runtime-pilots/run-1.md");
});

test("workerOutputHasTopLevelField detects fields inside stream-json fragments", () => {
  const line = JSON.stringify({
    type: "stream_event",
    event: {
      delta: {
        partial_json: "reflection:\n  summary: ok\nlearning_proposals:\n  - target: docs/x.md",
      },
    },
  });
  assert.equal(workerOutputHasTopLevelField(line, "reflection"), true);
  assert.equal(workerOutputHasTopLevelField(line, "learning_proposals"), true);
  assert.equal(workerOutputHasTopLevelField(line, "capability_context_proof"), false);
});

test("workerOutputHasTopLevelField detects markdown report headings", () => {
  const report = [
    "# worker.reported",
    "",
    "## reflection",
    "",
    "The worker reflected on the implementation.",
    "",
    "## learning_proposals",
    "",
    "- target: scripts/orchestration/relay.mjs",
  ].join("\n");

  assert.equal(workerOutputHasTopLevelField(report, "reflection"), true);
  assert.equal(workerOutputHasTopLevelField(report, "learning_proposals"), true);
  assert.equal(workerOutputHasTopLevelField(report, "capability_context_proof"), false);
});

test("workerOutputHasTopLevelField detects humanized markdown headings", () => {
  const report = [
    "# Worker Report",
    "",
    "## Reflection",
    "",
    "ok",
    "",
    "## Learning Proposals",
    "",
    "- tighten runtime normalization",
  ].join("\n");
  assert.equal(workerOutputHasTopLevelField(report, "reflection"), true);
  assert.equal(workerOutputHasTopLevelField(report, "learning_proposals"), true);
});

test("workerOutputHasTopLevelField detects numbered markdown section headings", () => {
  const report = [
    "# Worker Report",
    "",
    "## 15. Reflection",
    "",
    "ok",
    "",
    "## 16. Learning Proposals",
    "",
    "- proposal",
  ].join("\n");
  assert.equal(workerOutputHasTopLevelField(report, "reflection"), true);
  assert.equal(workerOutputHasTopLevelField(report, "learning_proposals"), true);
});

test("redactRuntimeOutput strips obvious secret patterns", () => {
  const fakeKey = ["sk", "abcdefghijklmnopqrstuvwxyz123456"].join("-");
  const redacted = redactRuntimeOutput(`token ${fakeKey}`);
  assert.equal(redacted.includes(fakeKey), false);
  assert.equal(redacted.includes("[REDACTED_SECRET]"), true);
});

test("redactRuntimeOutput strips runtime connector tokens that can appear in process args", () => {
  const honchoToken = ["hch", "v3", "abcdefghijklmnopqrstuvwxyz123456"].join("-");
  const openRouterToken = ["sk", "or", "v1", "abcdefghijklmnopqrstuvwxyz123456"].join("-");
  const planeToken = ["plane", "api", "abcdef0123456789"].join("_");
  const output = [
    `honcho ${honchoToken}`,
    `openrouter ${openRouterToken}`,
    `plane ${planeToken}`,
  ].join("\n");
  const redacted = redactRuntimeOutput(output);

  assert.equal(redacted.includes("hch-v3-"), false);
  assert.equal(redacted.includes("sk-or-v1-"), false);
  assert.equal(redacted.includes("plane_api_"), false);
  assert.match(redacted, /\[REDACTED_SECRET\]/);
});

test("redactRuntimeOutput strips Claude stream-json signature and thinking fields", () => {
  const streamFrame = JSON.stringify({
    type: "stream_event",
    event: {
      type: "content_block_delta",
      delta: {
        type: "signature_delta",
        signature: "Ep4NClkIDRgCKkAp5XDiGxGZm0kKWUcE".repeat(8),
        thinking: "private scratchpad that must not persist",
      },
    },
  });
  const redacted = redactRuntimeOutput(streamFrame);

  assert.equal(redacted.includes("Ep4NClkIDRg"), false);
  assert.equal(redacted.includes("private scratchpad"), false);
  assert.match(redacted, /\[REDACTED_STREAM_SIGNATURE\]/);
  assert.match(redacted, /\[REDACTED_STREAM_THINKING\]/);
});

test("sanitizeRuntimeCommandArgs hides prompt bodies and redacts token-like args", () => {
  const token = ["hch", "v3", "abcdefghijklmnopqrstuvwxyz123456"].join("-");
  const args = sanitizeRuntimeCommandArgs([
    "-p",
    "private prompt",
    "--mcp-token",
    token,
  ]);

  assert.deepEqual(args, ["-p", "<prompt>", "--mcp-token", "[REDACTED_SECRET]"]);
});

test("summarizeRuntimeStreamLog counts stream frames, heartbeats, exits and redaction markers", () => {
  const rows = [
    { type: "worker.spawned" },
    { type: "stream", stream: "stdout", text: "hello" },
    {
      type: "stream",
      stream: "stderr",
      text: "[REDACTED_SECRET] [REDACTED_STREAM_SIGNATURE] [REDACTED_STREAM_THINKING]",
    },
    { type: "worker.heartbeat" },
    { type: "worker.exit" },
    "not-json",
  ].map((row) => typeof row === "string" ? row : JSON.stringify(row)).join("\n");
  const summary = summarizeRuntimeStreamLog(rows);

  assert.equal(summary.line_count, 6);
  assert.equal(summary.malformed_lines, 1);
  assert.equal(summary.worker_spawned, 1);
  assert.equal(summary.stream, 2);
  assert.equal(summary.stdout_stream, 1);
  assert.equal(summary.stderr_stream, 1);
  assert.equal(summary.worker_heartbeat, 1);
  assert.equal(summary.worker_exit, 1);
  assert.equal(summary.redacted_secret_markers, 1);
  assert.equal(summary.redacted_signature_markers, 1);
  assert.equal(summary.redacted_thinking_markers, 1);
});

test("evaluateRuntimeStreamHealth rejects silent or malformed stream logs", () => {
  assert.deepEqual(
    evaluateRuntimeStreamHealth({ worker_spawned: 1, stream: 1, worker_exit: 1, malformed_lines: 0 }).reason_codes,
    [],
  );
  const verdict = evaluateRuntimeStreamHealth({ worker_spawned: 1, stream: 0, worker_exit: 0, malformed_lines: 1 });
  assert.equal(verdict.ok, false);
  assert.deepEqual(verdict.reason_codes, [
    "stream.events-missing",
    "stream.worker-exit-missing",
    "stream.malformed-lines",
  ]);
});

test("buildClaudeRuntimeArgs enables stream-json with partial messages", () => {
  const args = buildClaudeRuntimeArgs({
    prompt: "do work",
    model: "opus",
    effort: "max",
    permissionMode: "acceptEdits",
    maxTurns: "120",
    allowedTools: ["Read", "Edit", "Bash(pnpm test*)"],
    addDirs: ["/tmp/sidecar"],
  });

  assert.deepEqual(args, [
    "-p",
    "do work",
    "--model",
    "opus",
    "--effort",
    "max",
    "--permission-mode",
    "acceptEdits",
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--strict-mcp-config",
    "--mcp-config",
    "{\"mcpServers\":{}}",
    "--tools",
    "Read",
    "Edit",
    "Bash",
    "--add-dir",
    "/tmp/sidecar",
    "--allowed-tools",
    "Read",
    "Edit",
    "Bash(pnpm test*)",
    "--max-turns",
    "120",
  ]);
});

test("resolveClaudeRuntimeBuiltinTools maps allowed tool specs to built-in tool names", () => {
  assert.deepEqual(
    resolveClaudeRuntimeBuiltinTools(["Bash(pnpm test*)", "Read", "ToolSearch", "Task"]),
    ["Read", "Bash", "Task"],
  );
});

test("resolveClaudeAllowedTools merges profile, contract and safe declared gate tools", () => {
  const tools = resolveClaudeAllowedTools({
    capabilityProfile: {
      allowed_claude_tools: ["Read", "Edit", "Bash(pnpm test*)"],
    },
    contractFields: {
      allowedclaudetools: "TodoWrite",
      gates: [
        "`pnpm build`",
        "pnpm exec eslint src/app.ts",
        "node scripts/page-index/generate-page-index.mjs --root . --output docs/page-index.md --check --json",
        "node scripts/release-gates/productization-readiness.mjs check --json",
        "node scripts/goal/goal.mjs run --parent [WORK_ITEM_ID] --dry-run --json",
        "[LOCAL_WORKSPACE] detect-changes --repo company-os",
        "pnpm deploy",
      ],
    },
  });

  assert.equal(tools.includes("Read"), true);
  assert.equal(tools.includes("TodoWrite"), true);
  assert.equal(tools.includes("Bash(pnpm build*)"), true);
  assert.equal(tools.includes("Bash(pnpm exec eslint*)"), true);
  assert.equal(tools.includes("Bash(node scripts/page-index/generate-page-index.mjs*)"), true);
  assert.equal(tools.includes("Bash(node scripts/release-gates/productization-readiness.mjs*)"), true);
  assert.equal(tools.includes("Bash(node scripts/goal/goal.mjs run*)"), true);
  assert.equal(tools.some((tool) => tool === "Bash(node scripts/goal/goal.mjs*)"), false);
  assert.equal(tools.includes("Bash([LOCAL_WORKSPACE] detect-changes*)"), true);
  assert.equal(tools.some((tool) => tool.includes("deploy")), false);
});

test("resolveClaudeAllowedTools filters broad read-shell tools from profiles and gates", () => {
  const tools = resolveClaudeAllowedTools({
    capabilityProfile: {
      allowed_claude_tools: ["Read", "Bash(rg *)", "Bash(grep *)", "Bash(git status*)"],
    },
    contractFields: {
      gates: ["rg TODO docs", "git diff --check"],
    },
  });

  assert.equal(tools.includes("Read"), true);
  assert.equal(tools.includes("Bash(git status*)"), true);
  assert.equal(tools.includes("Bash(git diff --check*)"), true);
  assert.equal(tools.some((tool) => tool.includes("rg")), false);
  assert.equal(tools.some((tool) => tool.includes("grep")), false);
});

test("resolveClaudeAllowedTools blocks Task unless SubAgentRoster is declared", () => {
  const withoutRoster = resolveClaudeAllowedTools({
    capabilityProfile: {
      allowed_claude_tools: ["Read", "Task", "TodoWrite"],
    },
    contractFields: {
      subagentroster: "none",
    },
  });

  const withRoster = resolveClaudeAllowedTools({
    capabilityProfile: {
      allowed_claude_tools: ["Read", "Task", "TodoWrite"],
    },
    contractFields: {
      subagentroster: "[explorer]",
    },
  });

  assert.equal(withoutRoster.includes("Read"), true);
  assert.equal(withoutRoster.includes("Task"), false);
  assert.equal(withoutRoster.includes("TodoWrite"), true);
  assert.equal(withRoster.includes("Task"), true);
});

test("evaluateGateToolAllowlist passes safe derived gates and ignores named review gates", () => {
  const result = evaluateGateToolAllowlist({
    contractFields: {
      gates: [
        "node --test scripts/orchestration/runtime-dispatcher-v12-core.test.mjs",
        "git diff --check",
        "CAO review verifies report shape",
      ],
    },
    capabilityProfile: {
      allowed_claude_tools: ["Read"],
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.checked_count, 2);
  assert.equal(result.missing.length, 0);
});

test("evaluateGateToolAllowlist blocks executable gates missing from allowed tools", () => {
  const result = evaluateGateToolAllowlist({
    contractFields: {
      gates: ["node scripts/plane/plane-template-registry.mjs validate"],
    },
    capabilityProfile: {
      allowed_claude_tools: ["Read"],
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.checked_count, 1);
  assert.equal(result.missing.length, 1);
  assert.equal(result.missing[0].command, "node scripts/plane/plane-template-registry.mjs validate");
  assert.equal(result.missing[0].suggested_allowed_tool, "Bash(node scripts/plane/plane-template-registry.mjs*)");
});

test("evaluateGateToolAllowlist treats common non-node runners as executable gates", () => {
  const result = evaluateGateToolAllowlist({
    contractFields: {
      gates: [
        "python -m pytest tests/",
        "python3 scripts/check.py",
        "make test",
        "cargo test",
        "go test ./...",
        "pytest tests/",
        "deno test",
      ],
    },
    capabilityProfile: {
      allowed_claude_tools: ["Read"],
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.checked_count, 7);
  assert.deepEqual(result.missing.map((item) => item.command), [
    "python -m pytest tests/",
    "python3 scripts/check.py",
    "make test",
    "cargo test",
    "go test ./...",
    "pytest tests/",
    "deno test",
  ]);
});

test("evaluateGateToolAllowlist rejects shell-composed gates before deriving a safe prefix", () => {
  const result = evaluateGateToolAllowlist({
    contractFields: {
      gates: ["pnpm test && pnpm exec eslint"],
    },
    capabilityProfile: {
      allowed_claude_tools: ["Read"],
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.checked_count, 1);
  assert.equal(result.missing[0].reason, "shell-control-operator:&&");
  assert.equal(result.missing[0].suggested_allowed_tool, "");
  assert.equal(result.allowed_tools.includes("Bash(pnpm test*)"), false);
});

test("evaluateGateToolAllowlist requires wildcard Bash entries for commands with arguments", () => {
  const result = evaluateGateToolAllowlist({
    contractFields: {
      allowedclaudetools: ["Bash(node scripts/plane/plane-template-registry.mjs)"],
      gates: ["node scripts/plane/plane-template-registry.mjs validate"],
    },
    capabilityProfile: {
      allowed_claude_tools: ["Read"],
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.checked_count, 1);
  assert.equal(result.missing[0].reason, "allowed_tool_missing");
  assert.equal(result.missing[0].suggested_allowed_tool, "Bash(node scripts/plane/plane-template-registry.mjs*)");
});

test("evaluateGateToolAllowlist accepts project-specific gates when explicitly allowed", () => {
  const result = evaluateGateToolAllowlist({
    contractFields: {
      allowedclaudetools: ["Bash(node scripts/plane/plane-template-registry.mjs*)"],
      gates: ["node scripts/plane/plane-template-registry.mjs validate"],
    },
    capabilityProfile: {
      allowed_claude_tools: ["Read"],
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.checked_count, 1);
  assert.equal(result.missing.length, 0);
});

test("inferRuntimeStateFromWorkerOutput respects worker-declared NEEDS_HUMAN over exit code 0", () => {
  const result = inferRuntimeStateFromWorkerOutput({
    exitCode: 0,
    stdout: "**state**: NEEDS_HUMAN - gates blocked",
    stderr: "",
    timedOut: false,
    killedReason: "",
  });

  assert.equal(result.state, "NEEDS_HUMAN");
  assert.equal(result.worker_declared_state, "NEEDS_HUMAN");
  assert.equal(result.reason, "worker-declared-non-pass");
});

test("inferRuntimeStateFromWorkerOutput reads state from stream-json content blocks", () => {
  const stdout = [
    JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "state: BLOCKED_AUTH" }] } }),
    JSON.stringify({ type: "result", subtype: "success" }),
  ].join("\n");
  const result = inferRuntimeStateFromWorkerOutput({
    exitCode: 0,
    stdout,
    stderr: "",
    timedOut: false,
    killedReason: "",
  });

  assert.equal(result.state, "BLOCKED_AUTH");
  assert.equal(result.worker_declared_state, "BLOCKED_AUTH");
});

test("inferRuntimeStateFromWorkerOutput ignores states inside stream-json user tool results", () => {
  const userToolResult = JSON.stringify({
    type: "user",
    message: {
      role: "user",
      content: [{
        type: "tool_result",
        content: "Template excerpt: worker.reported with state: NEEDS_HUMAN for HG-3.5 pauses.",
      }],
    },
  });
  const stdout = [
    JSON.stringify({ type: "stream", stream: "stdout", text: `${userToolResult}\n` }),
    JSON.stringify({
      type: "result",
      subtype: "success",
      terminal_reason: "completed",
      result: "Report written. Final worker.reported-ready summary follows.",
    }),
  ].join("\n");
  const result = inferRuntimeStateFromWorkerOutput({
    exitCode: 0,
    stdout,
    stderr: "",
    timedOut: false,
    killedReason: "",
  });

  assert.equal(result.state, "PASS");
  assert.equal(result.worker_declared_state, "");
  assert.equal(result.reason, "exit-zero");
});

test("inferRuntimeStateFromWorkerOutput lets final bold State PASS override earlier examples", () => {
  const stdout = [
    "source example says `state: NEEDS_HUMAN` for HG-4 pauses",
    "## worker.reported",
    "**State:** PASS",
    "reflection:",
  ].join("\n");
  const result = inferRuntimeStateFromWorkerOutput({
    exitCode: 0,
    stdout,
    stderr: "",
    timedOut: false,
    killedReason: "",
  });

  assert.equal(result.state, "PASS");
  assert.equal(result.worker_declared_state, "PASS");
});

test("inferRuntimeStateFromWorkerOutput reads direct JSON state properties", () => {
  const result = inferRuntimeStateFromWorkerOutput({
    exitCode: 0,
    stdout: JSON.stringify({ type: "result", state: "REJECT" }),
    stderr: "",
    timedOut: false,
    killedReason: "",
  });

  assert.equal(result.state, "REJECT");
  assert.equal(result.worker_declared_state, "REJECT");
});

test("buildWorkerPrompt includes hard boundaries and capability profile", () => {
  const prompt = buildWorkerPrompt({
    workItem: { sequence_id: 12, id: "id-1" },
    contractFields: { agent: "claude", role: "role:cto", mode: "implement", capabilityprofile: "claude-clevel-worker/cto/runtime" },
    description: "Do the work",
    dryRun: { state: "PASS", blocked_reasons: [] },
    reportPath: "/tmp/report.md",
    runId: "run-1",
    capabilityProfile: {
      id: "claude-clevel-worker/cto/runtime",
      role: "role:cto",
      max_autonomy_level: "L3",
      runtime_defaults: { runtime_agent: "claude", runtime_model_alias: "opus" },
      context_packs: [
        {
          id: "runtime-core-v0",
          required_for: ["shared-runtime"],
          read_paths: ["/repo/docs/runtime.md"],
          write_paths: [],
          blocked_reads: ["secrets"],
        },
      ],
    },
    allowedWritePaths: ["/repo/reports/runs", "/repo/metrics/agent-events.jsonl"],
  });
  assert.match(prompt, /Do not mark Plane Done/);
  assert.match(prompt, /claude-clevel-worker\/cto\/runtime/);
  assert.match(prompt, /Use exact absolute paths/);
  assert.match(prompt, /Do not use Task\/subagents unless/);
  assert.match(prompt, /HG-3 is CEO\/Codex or accountable C-Level critical authority/);
  assert.match(prompt, /BLOCKED_DEPENDENCY with reason `hg3-ceo-escalation`/);
  assert.match(prompt, /Report NEEDS_HUMAN only for HG-4/);
  assert.doesNotMatch(prompt, /NEEDS_HUMAN for HG-3/);
  assert.match(prompt, /Effective allowed write\/output paths/);
  assert.match(prompt, /Do not use `\/tmp`/);
  assert.match(prompt, /literal top-level markers `reflection:`, `learning_proposals:`, and `capability_context_proof:`/);
  assert.match(prompt, /\/repo\/reports\/runs/);
  assert.match(prompt, /runtime_model_alias/);
  assert.match(prompt, /runtime-core-v0/);
  assert.match(prompt, /\/repo\/docs\/runtime\.md/);
});

test("buildWorkerPrompt without guards has no guard block", () => {
  const prompt = buildWorkerPrompt({
    workItem: { sequence_id: 13, id: "id-2" },
    contractFields: { agent: "claude", role: "role:cto", mode: "implement" },
    description: "Do the work",
    dryRun: { state: "PASS", blocked_reasons: [] },
    reportPath: "/tmp/report.md",
    runId: "run-2",
  });
  assert.doesNotMatch(prompt, /Contract-declared runtime guards/);
  assert.doesNotMatch(prompt, /relay-write-temptation/);
});

test("buildWorkerPrompt injects relay-write-temptation guard when declared", () => {
  const prompt = buildWorkerPrompt({
    workItem: { sequence_id: 185, id: "id-3" },
    contractFields: {
      agent: "claude",
      role: "role:cto",
      mode: "implement",
      guards: ["relay-write-temptation"],
    },
    description: "Build the relay",
    dryRun: { state: "PASS", blocked_reasons: [] },
    reportPath: "/tmp/report.md",
    runId: "run-3",
  });
  assert.match(prompt, /Contract-declared runtime guards/);
  assert.match(prompt, /Read-only relay guard \(relay-write-temptation\)/);
  assert.match(prompt, /NEEDS_HUMAN with reason `relay-write-temptation`/);
});

test("buildWorkerPrompt injects exact-read-roots-only guard when declared", () => {
  const prompt = buildWorkerPrompt({
    workItem: { sequence_id: 507, project_identifier: "ATLAS" },
    contractFields: {
      agent: "claude",
      role: "role:coo",
      mode: "audit",
      guards: ["exact-read-roots-only"],
    },
    description: "desc",
    dryRun: false,
    reportPath: "[LOCAL_WORKSPACE]",
    runId: "run-guard-read-root",
    capabilityProfile: { name: "claude-clevel-worker/coo/runtime" },
  });

  assert.match(prompt, /Contract-declared runtime guards/);
  assert.match(prompt, /Exact read-root guard \(exact-read-roots-only\)/);
  assert.match(prompt, /read-root-expansion-required/);
  assert.match(prompt, /never scan `\/Users\/mathiasheinke\/Developer`/);
});

test("buildWorkerPrompt ignores unknown guard names without erroring", () => {
  const prompt = buildWorkerPrompt({
    workItem: { sequence_id: 14, id: "id-4" },
    contractFields: {
      agent: "claude",
      role: "role:cto",
      mode: "implement",
      guards: ["this-guard-does-not-exist"],
    },
    description: "Do the work",
    dryRun: { state: "PASS", blocked_reasons: [] },
    reportPath: "/tmp/report.md",
    runId: "run-4",
  });
  assert.doesNotMatch(prompt, /Contract-declared runtime guards/);
});

test("selectWorkerPromptGuards dedupes and lowercases guard names", () => {
  const matched = selectWorkerPromptGuards({
    guards: ["relay-write-temptation", "Relay-Write-Temptation", "  relay-write-temptation  "],
  });
  assert.equal(matched.length, 1);
  assert.equal(matched[0], WORKER_PROMPT_GUARDS["relay-write-temptation"]);
});

test("selectWorkerPromptGuards accepts comma-separated string form", () => {
  const matched = selectWorkerPromptGuards({
    guards: "relay-write-temptation, this-guard-does-not-exist",
  });
  assert.equal(matched.length, 1);
});

test("selectWorkerPromptGuards returns empty array when guards field absent", () => {
  assert.deepEqual(selectWorkerPromptGuards({}), []);
  assert.deepEqual(selectWorkerPromptGuards({ guards: null }), []);
  assert.deepEqual(selectWorkerPromptGuards({ guards: "" }), []);
  assert.deepEqual(selectWorkerPromptGuards({ guards: [] }), []);
});

test("buildRunReportMarkdown renders state, command and changed files", () => {
  const report = buildRunReportMarkdown({
    runId: "run-1",
    state: "PASS",
    startedAt: "2026-05-09T00:00:00.000Z",
    endedAt: "2026-05-09T00:01:00.000Z",
    workItem: { sequence_id: 12 },
    contractFields: { role: "role:cto", mode: "implement" },
    runtime: "claude",
    command: ["claude", "-p", "<prompt>"],
    exitCode: 0,
    stdout: "ok",
    stderr: "",
    changedFiles: ["/tmp/a.md"],
    dryRun: { preflights: [{ name: "auth", state: "PASS" }] },
    reportPath: "/tmp/report.md",
    streamHealth: {
      ok: true,
      reason_codes: [],
      summary: { line_count: 3, stream: 1, worker_heartbeat: 1, worker_exit: 1 },
    },
    allowedWriteScope: {
      effective_paths: ["/tmp/a.md"],
      worker_scope_guard_paths: ["/tmp/a.md"],
      changed_files: ["/tmp/a.md"],
      worker_attributed_changed_files: ["/tmp/a.md"],
      external_changed_files: ["/tmp/external.md"],
      out_of_scope_files: [],
    },
  });
  assert.match(report, /Runtime Dispatcher v1\.2 Run Report/);
  assert.match(report, /\/tmp\/a\.md/);
  assert.match(report, /\| stream_health \| PASS \|/);
  assert.match(report, /\| allowed_write_drift_count \| 0 \|/);
  assert.match(report, /worker_scope_guard_path_count: 1/);
  assert.match(report, /external_changed: \/tmp\/external\.md/);
});

test("buildWorkerReportedYaml uses canonical worker.reported title", () => {
  const yaml = buildWorkerReportedYaml({
    runId: "run-1",
    state: "PASS",
    workItem: { sequence_id: 12 },
    reportPath: "/tmp/report.md",
    runtime: "claude",
    exitCode: 0,
    changedFiles: [],
    startedAt: "2026-05-09T00:00:00.000Z",
    endedAt: "2026-05-09T00:01:00.000Z",
    streamHealth: { ok: true, summary: { stream: 2, redacted_signature_markers: 1 } },
    outOfScopeFiles: [],
  });
  assert.match(yaml, /^worker\.reported:/);
  assert.match(yaml, /next: cao-pass/);
  assert.match(yaml, /stream_health: PASS/);
  assert.match(yaml, /redacted_signature_markers: 1/);
  assert.match(yaml, /out_of_scope_change_count: 0/);
  assert.doesNotMatch(yaml, /\n  reflection:/);
  assert.doesNotMatch(yaml, /\n  learning_proposals:/);
});

test("buildWorkerReportedYaml mirrors reflection and learning presence from worker output", () => {
  const yaml = buildWorkerReportedYaml({
    runId: "run-1",
    state: "PASS",
    workItem: { sequence_id: 12 },
    reportPath: "/tmp/report.md",
    runtime: "claude",
    exitCode: 0,
    changedFiles: [],
    startedAt: "2026-05-09T00:00:00.000Z",
    endedAt: "2026-05-09T00:01:00.000Z",
    streamHealth: { ok: true, summary: { stream: 2, redacted_signature_markers: 1 } },
    outOfScopeFiles: [],
    workerOutputText: "reflection:\n  summary: ok\nlearning_proposals:\n  - target: scripts/x.mjs",
  });
  assert.match(yaml, /\n  reflection:\n    source: worker-output-or-report-artifact\n    present: true/);
  assert.match(yaml, /\n  learning_proposals:\n    source: worker-output-or-report-artifact\n    present: true/);
});

test("buildWorkerReportedYaml mirrors reflection and learning presence from markdown report headings", () => {
  const yaml = buildWorkerReportedYaml({
    runId: "run-1",
    state: "PASS",
    workItem: { sequence_id: 185 },
    reportPath: "/tmp/report.md",
    runtime: "claude",
    exitCode: 0,
    changedFiles: [],
    startedAt: "2026-05-11T00:00:00.000Z",
    endedAt: "2026-05-11T00:01:00.000Z",
    streamHealth: { ok: true, summary: { stream: 2, redacted_signature_markers: 1 } },
    outOfScopeFiles: [],
    workerOutputText: "# worker.reported\n\n## reflection\n\nok\n\n## learning_proposals\n\n- one",
  });
  assert.match(yaml, /\n  reflection:\n    source: worker-output-or-report-artifact\n    present: true/);
  assert.match(yaml, /\n  learning_proposals:\n    source: worker-output-or-report-artifact\n    present: true/);
});

test("buildWorkerReportedYaml reads reflection from the durable report artifact when final output omits it", () => {
  const root = mkdtempSync(join(tmpdir(), "runtime-report-artifact-"));
  const reportPath = join(root, "worker-report.md");
  writeFileSync(
    reportPath,
    [
      "# worker.reported",
      "",
      "```yaml",
      "worker.reported:",
      "  state: PASS_ARTIFACT_RUN",
      "  reflection:",
      "    summary: present only in report file",
      "  learning_proposals:",
      "    - target: scripts/orchestration/runtime-dispatcher-v12-core.mjs",
      "      proposal: scan declared report artifact for required fields",
      "```",
      "",
    ].join("\n"),
  );

  const yaml = buildWorkerReportedYaml({
    runId: "run-report-artifact",
    state: "PASS",
    workItem: { sequence_id: 202 },
    reportPath,
    runtime: "claude",
    exitCode: 0,
    changedFiles: [reportPath],
    startedAt: "2026-05-14T21:52:00.000Z",
    endedAt: "2026-05-14T21:57:00.000Z",
    streamHealth: { ok: true, summary: { stream: 8, redacted_signature_markers: 0 } },
    outOfScopeFiles: [],
    workerOutputText: "## final summary\n\n### learning_proposals\n\n- repeated in stream",
  });

  assert.match(yaml, /\n  reflection:\n    source: worker-output-or-report-artifact\n    present: true/);
  assert.match(yaml, /\n  learning_proposals:\n    source: worker-output-or-report-artifact\n    present: true/);
  rmSync(root, { recursive: true, force: true });
});

test("buildWorkerReportedYaml reads numbered reflection headings from the durable report artifact", () => {
  const root = mkdtempSync(join(tmpdir(), "company-os-runtime-report-numbered-"));
  const reportPath = join(root, "report.md");
  writeFileSync(
    reportPath,
    [
      "# Run Report",
      "",
      "## 15. Reflection",
      "",
      "ok",
      "",
      "## 16. Learning Proposals",
      "",
      "- proposal",
      "",
    ].join("\n"),
  );

  const yaml = buildWorkerReportedYaml({
    runId: "run-report-numbered",
    state: "PASS",
    workItem: { sequence_id: 227 },
    reportPath,
    runtime: "claude",
    exitCode: 0,
    changedFiles: [reportPath],
    startedAt: "2026-05-17T17:00:00.000Z",
    endedAt: "2026-05-17T17:05:00.000Z",
    streamHealth: { ok: true, summary: { stream: 8, redacted_signature_markers: 0 } },
    outOfScopeFiles: [],
    workerOutputText: "all gates pass",
  });

  assert.match(yaml, /\n  reflection:\n    source: worker-output-or-report-artifact\n    present: true/);
  assert.match(yaml, /\n  learning_proposals:\n    source: worker-output-or-report-artifact\n    present: true/);
  rmSync(root, { recursive: true, force: true });
});

test("readReportArtifactText quietly ignores missing or relative report paths", () => {
  assert.equal(readReportArtifactText("reports/runs/local.md"), "");
  assert.equal(readReportArtifactText("/tmp/this-file-should-not-exist-company-os.md"), "");
});

test("buildRunSummaryYaml includes report, stream and fast triage fields", () => {
  const yaml = buildRunSummaryYaml({
    runId: "run-1",
    state: "PASS",
    workItem: { sequence_id: 12 },
    reportPath: "/tmp/report.md",
    streamPath: "/tmp/report.run-1.stream.jsonl",
    runtime: "claude",
    startedAt: "2026-05-09T00:00:00.000Z",
    endedAt: "2026-05-09T00:01:00.000Z",
    workerDeclaredState: "PASS",
    workerStateReason: "worker-declared-pass",
    heartbeatCount: 4,
    streamHealth: { ok: true, summary: { stream: 8, redacted_signature_markers: 3 } },
    outOfScopeFiles: ["/tmp/outside.md"],
  });
  assert.match(yaml, /^worker\.run-summary:/);
  assert.match(yaml, /report_path: \/tmp\/report\.md/);
  assert.match(yaml, /stream_path: \/tmp\/report\.run-1\.stream\.jsonl/);
  assert.match(yaml, /worker_declared_state: PASS/);
  assert.match(yaml, /state_reason: worker-declared-pass/);
  assert.match(yaml, /heartbeat_count: 4/);
  assert.match(yaml, /stream_health: PASS/);
  assert.match(yaml, /stream_event_count: 8/);
  assert.match(yaml, /redacted_signature_markers: 3/);
  assert.match(yaml, /out_of_scope_change_count: 1/);
});

test("buildAgentEventRow emits a valid agent-event row", () => {
  const row = buildAgentEventRow({
    eventType: "worker.reported",
    runId: "run-1",
    workItem: { sequence_id: 12 },
    contractFields: { agent: "claude", mode: "implement", workspace: "registry:company-os", role: "role:cto", humangate: "HG-2.5" },
    workspacePath: "[LOCAL_WORKSPACE]",
    artifactPaths: ["/tmp/report.md"],
    payload: { state: "PASS" },
    occurredAt: "2026-05-09T00:00:00.000Z",
  });
  const validation = validateAgentEventRow(row);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
});
