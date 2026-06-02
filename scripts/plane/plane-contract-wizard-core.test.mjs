import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

import { validateContract } from "../orchestration/worker-ledger-validator.mjs";
import { evaluateGateToolAllowlist } from "../orchestration/runtime-dispatcher-v12-core.mjs";
import {
  CONTRACT_WIZARD_QUESTIONS,
  buildWizardAnswers,
  deriveAllowedClaudeToolsFromGates,
  diagnoseWizardTooling,
  isBrowserUiBoundWizardAnswers,
  normalizeWizardList,
  renderWizardMarkdown,
  renderWizardToolDiagnosticsSection,
  resolveWizardAllowedClaudeTools,
  validateWizardAnswers,
  wizardToolingDiagnosticsIsEmpty,
} from "./plane-contract-wizard-core.mjs";

const WIZARD_CLI = path.resolve("scripts/plane/plane-contract-wizard.mjs");

function runWizardCli(args) {
  return spawnSync(process.execPath, [WIZARD_CLI, ...args], {
    cwd: path.resolve("."),
    encoding: "utf8",
  });
}

const SAMPLE_INPUT = {
  title: "Bounded Template Probe",
  role: "role:cto",
  mode: "implement",
  source: [
    "docs/operations/plane-native-template-registry.md",
    "registries/plane-templates/company-os.json",
  ],
  acceptance: [
    "Probe is read-only and reports manual-required when no endpoint exists.",
    "Rendered artifacts verify against the registry.",
  ],
  gate: [
    "node --test scripts/plane/*.test.mjs",
    "node scripts/release-gates/productization-readiness.mjs check",
    "git diff --check",
  ],
  allowed_write_path: [
    "scripts/plane/",
    "docs/operations/plane-native-template-registry.md",
    "reports/runs/[WORK_ITEM_ID]/",
    "docs/page-index.md",
  ],
  capability_profile: "claude-clevel-worker/cto/runtime",
  sandbox: "required",
  runtime_permission_mode: "acceptEdits",
  inference_class: "P1-code-bounded",
};

test("CONTRACT_WIZARD_QUESTIONS define the minimum intake surface", () => {
  const ids = CONTRACT_WIZARD_QUESTIONS.map((question) => question.id);
  assert.deepEqual(ids, [
    "title",
    "role",
    "mode",
    "source_of_truth",
    "acceptance_criteria",
    "gates",
    "allowed_write_paths",
    "allowed_claude_tools",
    "human_gate",
    "runtime_browser_auth",
  ]);
});

test("normalizeWizardList accepts arrays, semicolon strings and markdown lists", () => {
  assert.deepEqual(normalizeWizardList([" a ", "", "b"]), ["a", "b"]);
  assert.deepEqual(normalizeWizardList("- one\n- two; three"), ["one", "two", "three"]);
});

test("buildWizardAnswers applies safe defaults and validates required fields", () => {
  const answers = buildWizardAnswers(SAMPLE_INPUT);
  assert.equal(answers.agent, "claude");
  assert.equal(answers.dispatch, "manual");
  assert.equal(answers.human_gate, "HG-2");
  assert.equal(answers.runtime_browser_auth, "");
  assert.equal(validateWizardAnswers(answers).ok, true);

  const invalid = buildWizardAnswers({ title: "No sources", role: "role:cto" });
  assert.equal(validateWizardAnswers(invalid).ok, false);
  assert.ok(validateWizardAnswers(invalid).errors.includes("source_of_truth requires at least one item"));
});

test("browser/UI-bound wizard answers require RuntimeBrowserAuth", () => {
  const browserUi = {
    ...SAMPLE_INPUT,
    title: "Plane Browser UI Screenshot Probe",
    acceptance: [
      "Worker captures browser screenshot evidence after trying the Plane UI.",
    ],
    gate: [
      "Playwright screenshot capture",
      "git diff --check",
    ],
  };

  const answers = buildWizardAnswers(browserUi);
  assert.equal(isBrowserUiBoundWizardAnswers(answers), true);
  const validation = validateWizardAnswers(answers);
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.includes("runtime_browser_auth is required for browser/UI-bound work"));
});

test("browser/UI-bound wizard answers render RuntimeBrowserAuth when declared", () => {
  const markdown = renderWizardMarkdown({
    ...SAMPLE_INPUT,
    title: "Plane Browser UI Screenshot Probe",
    acceptance: [
      "Worker captures browser screenshot evidence after trying the Plane UI.",
    ],
    gate: [
      "Playwright screenshot capture",
      "git diff --check",
    ],
    runtime_browser_auth: "browser-connector",
    runtime_permission_mode: "browser-confirmed",
  });

  assert.match(markdown, /RuntimeBrowserAuth: browser-connector/);
  const result = validateContract({
    description: markdown,
    labels: ["role:cto"],
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.reason_codes, ["contract.dispatch-not-ready"]);
});

test("wizard rejects unknown RuntimeBrowserAuth values", () => {
  const answers = buildWizardAnswers({
    ...SAMPLE_INPUT,
    runtime_browser_auth: "shared-cookie-jar",
  });
  const validation = validateWizardAnswers(answers);
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.includes(
    "runtime_browser_auth must be one of: none, forbidden, browser-connector, operator-shared-session",
  ));
});

test("renderWizardMarkdown creates a dispatcher-parseable Worker Issue Contract", () => {
  const markdown = renderWizardMarkdown(SAMPLE_INPUT);
  assert.match(markdown, /```yaml\nrole: role:cto/);
  assert.match(markdown, /CapabilityProfile: claude-clevel-worker\/cto\/runtime/);
  assert.match(markdown, /ReflectionPolicy: required/);
  const result = validateContract({
    description: markdown,
    labels: ["role:cto"],
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.reason_codes, ["contract.dispatch-not-ready"]);
  assert.ok(result.evidence.fields.includes("source_of_truth"));
  assert.ok(result.evidence.fields.includes("acceptance_criteria"));
  assert.ok(result.evidence.fields.includes("gates"));
});

test("renderWizardMarkdown fails closed on weak intake", () => {
  assert.throws(
    () => renderWizardMarkdown({ title: "Weak", role: "role:cto" }),
    /source_of_truth requires at least one item/,
  );
});

test("deriveAllowedClaudeToolsFromGates emits safe Bash entries for common executable gates", () => {
  const { tools, rejected, suggestions } = deriveAllowedClaudeToolsFromGates([
    "node --test scripts/plane/plane-contract-wizard-core.test.mjs",
    "node --test scripts/orchestration/runtime-dispatcher-v12-core.test.mjs",
    "node scripts/page-index/generate-page-index.mjs --check",
    "node scripts/release-gates/productization-readiness.mjs check",
    "git diff --check",
    "git status",
    "${LOCAL_WORKSPACE} detect-changes --scope all",
    "CAO review verifies report shape",
  ]);

  assert.ok(tools.includes("Bash(node --test*)"));
  assert.ok(tools.includes("Bash(node scripts/page-index/generate-page-index.mjs*)"));
  assert.ok(tools.includes("Bash(node scripts/release-gates/productization-readiness.mjs*)"));
  assert.ok(tools.includes("Bash(git diff --check*)"));
  assert.ok(tools.includes("Bash(git status*)"));
  assert.ok(tools.includes("Bash(${LOCAL_WORKSPACE} detect-changes*)"));
  assert.deepEqual(rejected, []);
  assert.deepEqual(suggestions, []);
});

test("deriveAllowedClaudeToolsFromGates rejects unsafe shell-composed gates from auto-allowlisting", () => {
  const { tools, rejected, suggestions } = deriveAllowedClaudeToolsFromGates([
    "pnpm test && pnpm exec eslint",
    "node --check scripts/foo.mjs | tee /tmp/out.log",
    "node --test $(echo scripts/foo.test.mjs)",
    "git diff > /tmp/diff.txt",
  ]);

  assert.equal(tools.length, 0);
  assert.equal(suggestions.length, 0);
  assert.deepEqual(rejected.map((entry) => entry.reason).sort(), [
    "shell-control-operator:$(",
    "shell-control-operator:&&",
    "shell-control-operator:>",
    "shell-control-operator:|",
  ]);
  assert.ok(rejected.every((entry) => entry.gate && entry.command));
});

test("deriveAllowedClaudeToolsFromGates surfaces best-effort suggestions for unmatched executable gates", () => {
  const { tools, suggestions } = deriveAllowedClaudeToolsFromGates([
    "node scripts/plane/plane-template-registry.mjs validate",
  ]);
  assert.equal(tools.length, 0);
  assert.equal(suggestions.length, 1);
  assert.equal(
    suggestions[0].suggested_allowed_tool,
    "Bash(node scripts/plane/plane-template-registry.mjs*)",
  );
});

test("renderWizardMarkdown auto-renders an AllowedClaudeTools block derived from safe gates", () => {
  const markdown = renderWizardMarkdown(SAMPLE_INPUT);
  assert.match(markdown, /AllowedClaudeTools:\n(?:\s*-\s.+\n)+/);
  assert.match(markdown, /\n\s*-\s+Bash\(node --test\*\)/);
  assert.match(markdown, /\n\s*-\s+Bash\(node scripts\/release-gates\/productization-readiness\.mjs\*\)/);
  assert.match(markdown, /\n\s*-\s+Bash\(git diff --check\*\)/);
});

test("renderWizardMarkdown does NOT emit Bash entries for unsafe shell-composed gates", () => {
  const markdown = renderWizardMarkdown({
    ...SAMPLE_INPUT,
    gate: [
      "node --test scripts/plane/plane-contract-wizard-core.test.mjs",
      "pnpm test && pnpm exec eslint",
      "git diff --check",
    ],
  });
  const allowedBlock = markdown.match(/AllowedClaudeTools:\n((?:\s*-\s.+\n)+)/);
  assert.ok(allowedBlock, "expected AllowedClaudeTools block in markdown");
  const renderedTools = allowedBlock[1];
  assert.match(renderedTools, /Bash\(node --test\*\)/);
  assert.doesNotMatch(renderedTools, /Bash\(pnpm test\*\)/);
  assert.doesNotMatch(renderedTools, /pnpm test &&/);
});

test("renderWizardMarkdown merges explicit allowed_claude_tools input with derived gate tools", () => {
  const markdown = renderWizardMarkdown({
    ...SAMPLE_INPUT,
    allowed_claude_tools: [
      "Read",
      "Edit",
      "Write",
      "Grep",
      "Glob",
      "Bash(node scripts/plane/plane-template-registry.mjs*)",
    ],
  });

  for (const tool of ["Read", "Edit", "Write", "Grep", "Glob"]) {
    assert.match(markdown, new RegExp(`\\n\\s*-\\s+${tool}\\n`));
  }
  assert.match(
    markdown,
    /\n\s*-\s+Bash\(node scripts\/plane\/plane-template-registry\.mjs\*\)\n/,
  );
  assert.match(markdown, /Bash\(node --test\*\)/);
});

test("renderWizardMarkdown filters explicit allowed_claude_tools that fail safety filters", () => {
  const markdown = renderWizardMarkdown({
    ...SAMPLE_INPUT,
    allowed_claude_tools: [
      "Read",
      "Bash(rg *)",
      "Bash(*)",
      "Task",
    ],
  });
  const fenceBody = (markdown.match(/```yaml\n([\s\S]*?)\n```/) || [, ""])[1];
  assert.match(fenceBody, /\n\s*-\s+Read\n/);
  assert.doesNotMatch(fenceBody, /Bash\(rg/);
  assert.doesNotMatch(fenceBody, /Bash\(\*\)/);
  assert.doesNotMatch(fenceBody, /\n\s*-\s+Task\n/);
});

test("renderWizardMarkdown emits Task only when SubAgentRoster declares non-empty roster", () => {
  const withoutRoster = renderWizardMarkdown({
    ...SAMPLE_INPUT,
    allowed_claude_tools: ["Read", "Task"],
  });
  assert.doesNotMatch(withoutRoster, /\n\s*-\s+Task\n/);

  const withRoster = renderWizardMarkdown({
    ...SAMPLE_INPUT,
    allowed_claude_tools: ["Read", "Task"],
    subagent_roster: ["explorer"],
  });
  assert.match(withRoster, /\n\s*-\s+Task\n/);
});

test("wizard AllowedClaudeTools render avoids the RS-13a runtime.gate-tool-not-allowed failure class", () => {
  const gates = [
    "${LOCAL_WORKSPACE} detect-changes --scope all --repo /tmp/example",
    "node --test scripts/plane/plane-contract-wizard-core.test.mjs",
    "node --test scripts/orchestration/runtime-dispatcher-v12-core.test.mjs",
    "node scripts/page-index/generate-page-index.mjs --check",
    "node scripts/release-gates/productization-readiness.mjs check",
    "git diff --check",
    "git status",
  ];
  const answers = buildWizardAnswers({ ...SAMPLE_INPUT, gate: gates });
  const tools = resolveWizardAllowedClaudeTools(answers);

  const evaluation = evaluateGateToolAllowlist({
    contractFields: { allowedclaudetools: tools, gates },
    capabilityProfile: { allowed_claude_tools: [] },
  });

  assert.equal(evaluation.ok, true, JSON.stringify(evaluation, null, 2));
  assert.equal(evaluation.missing.length, 0);
});

test("wizard with no gates omits the AllowedClaudeTools block", () => {
  const answers = buildWizardAnswers({});
  assert.deepEqual(resolveWizardAllowedClaudeTools(answers), []);
});

test("diagnoseWizardTooling reports rejected unsafe shell-composed gates", () => {
  const answers = buildWizardAnswers({
    ...SAMPLE_INPUT,
    gate: [
      "node --test scripts/plane/plane-contract-wizard-core.test.mjs",
      "pnpm test && pnpm exec eslint",
      "git diff --check",
    ],
  });
  const diagnostics = diagnoseWizardTooling(answers);
  assert.equal(diagnostics.filtered_explicit_tools.length, 0);
  assert.equal(diagnostics.rejected_gates.length, 1);
  assert.equal(diagnostics.rejected_gates[0].reason, "shell-control-operator:&&");
  assert.match(diagnostics.rejected_gates[0].command, /pnpm test && pnpm exec eslint/);
  assert.ok(diagnostics.resolved_tools.includes("Bash(node --test*)"));
  assert.ok(diagnostics.resolved_tools.includes("Bash(git diff --check*)"));
  assert.equal(wizardToolingDiagnosticsIsEmpty(diagnostics), false);
});

test("diagnoseWizardTooling flags explicit Bash tool inputs that fail the safety filter", () => {
  const answers = buildWizardAnswers({
    ...SAMPLE_INPUT,
    allowed_claude_tools: [
      "Read",
      "Bash(rg *)",
      "Bash(*)",
      "Bash(cat /etc/passwd)",
    ],
  });
  const diagnostics = diagnoseWizardTooling(answers);
  const filtered = diagnostics.filtered_explicit_tools.map((entry) => entry.tool).sort();
  assert.deepEqual(filtered, ["Bash(*)", "Bash(cat /etc/passwd)", "Bash(rg *)"]);
  for (const entry of diagnostics.filtered_explicit_tools) {
    assert.equal(entry.reason, "bash-pattern-unsafe");
  }
  assert.ok(diagnostics.resolved_tools.includes("Read"));
  for (const tool of filtered) {
    assert.ok(!diagnostics.resolved_tools.includes(tool));
  }
});

test("diagnoseWizardTooling reports Task filtered when SubAgentRoster is empty and accepts it when declared", () => {
  const withoutRoster = diagnoseWizardTooling(buildWizardAnswers({
    ...SAMPLE_INPUT,
    allowed_claude_tools: ["Read", "Task"],
  }));
  assert.deepEqual(
    withoutRoster.filtered_explicit_tools,
    [{ tool: "Task", reason: "subagent-roster-empty" }],
  );
  assert.ok(!withoutRoster.resolved_tools.includes("Task"));

  const withRoster = diagnoseWizardTooling(buildWizardAnswers({
    ...SAMPLE_INPUT,
    allowed_claude_tools: ["Read", "Task"],
    subagent_roster: ["explorer"],
  }));
  assert.deepEqual(withRoster.filtered_explicit_tools, []);
  assert.ok(withRoster.resolved_tools.includes("Task"));
});

test("diagnoseWizardTooling surfaces suggestion-only executable gates", () => {
  const answers = buildWizardAnswers({
    ...SAMPLE_INPUT,
    gate: [
      "node --test scripts/plane/plane-contract-wizard-core.test.mjs",
      "node scripts/plane/plane-template-registry.mjs validate",
      "git diff --check",
    ],
  });
  const diagnostics = diagnoseWizardTooling(answers);
  assert.equal(diagnostics.suggestion_only_gates.length, 1);
  assert.equal(
    diagnostics.suggestion_only_gates[0].suggested_allowed_tool,
    "Bash(node scripts/plane/plane-template-registry.mjs*)",
  );
  assert.equal(diagnostics.rejected_gates.length, 0);
  assert.equal(diagnostics.filtered_explicit_tools.length, 0);
});

test("diagnoseWizardTooling emits derived_gate_tools for a single safe auto-derived gate", () => {
  const answers = buildWizardAnswers({
    ...SAMPLE_INPUT,
    gate: ["node --test scripts/plane/plane-contract-wizard-core.test.mjs"],
  });
  const diagnostics = diagnoseWizardTooling(answers);
  assert.deepEqual(diagnostics.rejected_gates, []);
  assert.deepEqual(diagnostics.suggestion_only_gates, []);
  assert.deepEqual(diagnostics.filtered_explicit_tools, []);
  assert.deepEqual(diagnostics.derived_gate_tools, [
    {
      gate: "node --test scripts/plane/plane-contract-wizard-core.test.mjs",
      command: "node --test scripts/plane/plane-contract-wizard-core.test.mjs",
      allowed_claude_tool: "Bash(node --test*)",
    },
  ]);
  assert.equal(wizardToolingDiagnosticsIsEmpty(diagnostics), false);
});

test("diagnoseWizardTooling maps each safe auto-derived gate deterministically", () => {
  const answers = buildWizardAnswers(SAMPLE_INPUT);
  const diagnostics = diagnoseWizardTooling(answers);
  assert.deepEqual(diagnostics.rejected_gates, []);
  assert.deepEqual(diagnostics.suggestion_only_gates, []);
  assert.deepEqual(diagnostics.filtered_explicit_tools, []);
  const mapping = diagnostics.derived_gate_tools.map((entry) => [entry.gate, entry.allowed_claude_tool]);
  assert.deepEqual(mapping, [
    ["node --test scripts/plane/*.test.mjs", "Bash(node --test*)"],
    [
      "node scripts/release-gates/productization-readiness.mjs check",
      "Bash(node scripts/release-gates/productization-readiness.mjs*)",
    ],
    ["git diff --check", "Bash(git diff --check*)"],
  ]);
  assert.ok(diagnostics.resolved_tools.includes("Bash(node --test*)"));
  assert.equal(wizardToolingDiagnosticsIsEmpty(diagnostics), false);
});

test("diagnoseWizardTooling returns an empty diagnostic surface for the no-gate no-diagnostics case", () => {
  const diagnostics = diagnoseWizardTooling(buildWizardAnswers({
    title: "No Gates",
    role: "role:cto",
    mode: "report",
    source: ["docs/system-index.md"],
    acceptance: ["nothing"],
    allowed_write_path: ["reports/runs/"],
  }));
  assert.deepEqual(diagnostics.rejected_gates, []);
  assert.deepEqual(diagnostics.suggestion_only_gates, []);
  assert.deepEqual(diagnostics.filtered_explicit_tools, []);
  assert.deepEqual(diagnostics.derived_gate_tools, []);
  assert.deepEqual(diagnostics.resolved_tools, []);
  assert.equal(wizardToolingDiagnosticsIsEmpty(diagnostics), true);
  assert.equal(renderWizardToolDiagnosticsSection(diagnostics), "");
});

test("diagnoseWizardTooling combines positive mapping with rejected, suggestion-only, and filtered entries", () => {
  const answers = buildWizardAnswers({
    ...SAMPLE_INPUT,
    allowed_claude_tools: ["Read", "Bash(rg *)", "Task"],
    gate: [
      "node --test scripts/plane/plane-contract-wizard-core.test.mjs",
      "pnpm test && pnpm exec eslint",
      "node scripts/plane/plane-template-registry.mjs validate",
      "git diff --check",
    ],
  });
  const diagnostics = diagnoseWizardTooling(answers);

  assert.deepEqual(diagnostics.derived_gate_tools.map((entry) => entry.allowed_claude_tool), [
    "Bash(node --test*)",
    "Bash(git diff --check*)",
  ]);
  assert.equal(diagnostics.rejected_gates.length, 1);
  assert.equal(diagnostics.rejected_gates[0].reason, "shell-control-operator:&&");
  assert.equal(diagnostics.suggestion_only_gates.length, 1);
  assert.equal(
    diagnostics.suggestion_only_gates[0].suggested_allowed_tool,
    "Bash(node scripts/plane/plane-template-registry.mjs*)",
  );
  const filtered = diagnostics.filtered_explicit_tools.map((entry) => entry.tool).sort();
  assert.deepEqual(filtered, ["Bash(rg *)", "Task"]);
  assert.equal(wizardToolingDiagnosticsIsEmpty(diagnostics), false);
});

test("renderWizardMarkdown emits a Tool Diagnostics section outside the contract fence when entries exist", () => {
  const markdown = renderWizardMarkdown({
    ...SAMPLE_INPUT,
    allowed_claude_tools: ["Read", "Bash(rg *)", "Task"],
    gate: [
      "node --test scripts/plane/plane-contract-wizard-core.test.mjs",
      "pnpm test && pnpm exec eslint",
      "node scripts/plane/plane-template-registry.mjs validate",
      "git diff --check",
    ],
  });
  const fenceMatches = markdown.match(/```yaml[\s\S]*?```/g) || [];
  assert.equal(fenceMatches.length, 1, "Worker Issue Contract must remain the only ```yaml fence");
  const fenceBody = fenceMatches[0];
  assert.doesNotMatch(fenceBody, /## Tool Diagnostics/);
  assert.doesNotMatch(fenceBody, /Rejected gates/);
  assert.doesNotMatch(fenceBody, /Auto-derived gate tools/);

  const diagnosticsHeadingIndex = markdown.indexOf("## Tool Diagnostics");
  const contractFenceEndIndex = markdown.indexOf("```", markdown.indexOf("```yaml") + 1);
  assert.ok(diagnosticsHeadingIndex > contractFenceEndIndex, "diagnostics must follow contract fence");
  assert.match(markdown, /## Tool Diagnostics/);
  assert.match(markdown, /Auto-derived gate tools \(safe gates mapped to AllowedClaudeTools entries\)/);
  assert.match(markdown, /allowed_claude_tool: `Bash\(node --test\*\)`/);
  assert.match(markdown, /allowed_claude_tool: `Bash\(git diff --check\*\)`/);
  assert.match(markdown, /Rejected gates \(unsafe shell control operator/);
  assert.match(markdown, /shell-control-operator:&&/);
  assert.match(markdown, /Suggestion-only gates/);
  assert.match(markdown, /Bash\(node scripts\/plane\/plane-template-registry\.mjs\*\)/);
  assert.match(markdown, /Filtered explicit tool inputs/);
  assert.match(markdown, /Bash\(rg \*\)/);
  assert.match(markdown, /subagent-roster-empty/);

  const result = validateContract({ description: markdown, labels: ["role:cto"] });
  assert.equal(result.ok, false);
  assert.deepEqual(result.reason_codes, ["contract.dispatch-not-ready"]);
  assert.ok(result.evidence.fields.includes("allowedclaudetools"));
});

test("renderWizardMarkdown emits Auto-derived gate tools mapping outside the contract fence for safe gates", () => {
  const markdown = renderWizardMarkdown(SAMPLE_INPUT);
  const fenceMatches = markdown.match(/```yaml[\s\S]*?```/g) || [];
  assert.equal(fenceMatches.length, 1);
  const fenceBody = fenceMatches[0];
  assert.doesNotMatch(fenceBody, /Auto-derived gate tools/);
  assert.match(markdown, /## Tool Diagnostics/);
  assert.match(markdown, /Auto-derived gate tools/);
  assert.match(markdown, /gate: `node --test scripts\/plane\/\*\.test\.mjs`/);
  assert.match(markdown, /allowed_claude_tool: `Bash\(node --test\*\)`/);
  assert.match(markdown, /allowed_claude_tool: `Bash\(git diff --check\*\)`/);
  assert.doesNotMatch(markdown, /Rejected gates/);
  assert.doesNotMatch(markdown, /Suggestion-only gates/);
  assert.doesNotMatch(markdown, /Filtered explicit tool inputs/);

  const result = validateContract({ description: markdown, labels: ["role:cto"] });
  assert.equal(result.ok, false);
  assert.deepEqual(result.reason_codes, ["contract.dispatch-not-ready"]);
  assert.ok(result.evidence.fields.includes("gates"));
});

test("renderWizardMarkdown omits the Tool Diagnostics section when no gates produce diagnostics", () => {
  const markdown = renderWizardMarkdown({
    title: "No-gate contract",
    role: "role:cto",
    mode: "report",
    source: ["docs/system-index.md"],
    acceptance: ["nothing to do"],
    gate: ["CAO review verifies report shape"],
    allowed_write_path: ["reports/runs/"],
  });
  assert.doesNotMatch(markdown, /## Tool Diagnostics/);
});

test("CLI diagnose --json emits a single JSON object with ok true and tool_diagnostics for a mixed input smoke case", () => {
  const result = runWizardCli([
    "diagnose",
    "--json",
    "--title",
    "RS-17 Diagnose Smoke",
    "--role",
    "role:cto",
    "--mode",
    "implement",
    "--source",
    "docs/system-index.md",
    "--acceptance",
    "diagnose ledger renders without markdown",
    "--gate",
    "node --test scripts/plane/plane-contract-wizard-core.test.mjs",
    "--gate",
    "pnpm test && pnpm exec eslint",
    "--gate",
    "node scripts/plane/plane-template-registry.mjs validate",
    "--gate",
    "git diff --check",
    "--allowed-claude-tool",
    "Read",
    "--allowed-claude-tool",
    "Bash(rg *)",
    "--allowed-claude-tool",
    "Task",
    "--allowed-write-path",
    "scripts/plane/",
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.version, "plane-contract-wizard/v0");
  assert.deepEqual(Object.keys(payload).sort(), ["ok", "tool_diagnostics", "version"]);
  assert.equal(typeof payload.markdown, "undefined");

  const diagnostics = payload.tool_diagnostics;
  assert.ok(Array.isArray(diagnostics.derived_gate_tools));
  assert.ok(Array.isArray(diagnostics.rejected_gates));
  assert.ok(Array.isArray(diagnostics.suggestion_only_gates));
  assert.ok(Array.isArray(diagnostics.filtered_explicit_tools));
  assert.ok(diagnostics.derived_gate_tools.length >= 1);
  assert.ok(diagnostics.rejected_gates.length >= 1);
  assert.ok(diagnostics.suggestion_only_gates.length >= 1);
  assert.ok(diagnostics.filtered_explicit_tools.length >= 1);
  assert.equal(diagnostics.rejected_gates[0].reason, "shell-control-operator:&&");
  assert.equal(
    diagnostics.suggestion_only_gates[0].suggested_allowed_tool,
    "Bash(node scripts/plane/plane-template-registry.mjs*)",
  );
  const filteredTools = diagnostics.filtered_explicit_tools.map((entry) => entry.tool).sort();
  assert.deepEqual(filteredTools, ["Bash(rg *)", "Task"]);

  assert.doesNotMatch(result.stdout, /```yaml/);
  assert.doesNotMatch(result.stdout, /^#\s/m);
  assert.doesNotMatch(result.stdout, /^##\s/m);
  assert.doesNotMatch(result.stdout, /## Worker Issue Contract/);
  assert.doesNotMatch(result.stdout, /## Tool Diagnostics/);
  assert.doesNotMatch(result.stdout, /## Operator Notes/);
});

test("CLI diagnose --json works without wizard inputs and returns empty diagnostic arrays", () => {
  const result = runWizardCli(["diagnose", "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.tool_diagnostics, {
    resolved_tools: [],
    derived_gate_tools: [],
    rejected_gates: [],
    suggestion_only_gates: [],
    filtered_explicit_tools: [],
  });
  assert.doesNotMatch(result.stdout, /## Tool Diagnostics/);
});

test("CLI draft --json remains backward-compatible with markdown and tool_diagnostics", () => {
  const result = runWizardCli([
    "draft",
    "--json",
    "--title",
    "RS-17 Draft Backcompat",
    "--role",
    "role:cto",
    "--mode",
    "implement",
    "--source",
    "docs/system-index.md",
    "--acceptance",
    "draft remains backward-compatible",
    "--gate",
    "node --test scripts/plane/plane-contract-wizard-core.test.mjs",
    "--gate",
    "git diff --check",
    "--allowed-write-path",
    "scripts/plane/",
  ]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.version, "plane-contract-wizard/v0");
  assert.equal(typeof payload.markdown, "string");
  assert.match(payload.markdown, /## Worker Issue Contract/);
  assert.match(payload.markdown, /```yaml\nrole: role:cto/);
  assert.ok(payload.tool_diagnostics);
  assert.ok(Array.isArray(payload.tool_diagnostics.derived_gate_tools));
  assert.ok(payload.tool_diagnostics.derived_gate_tools.length >= 1);
});
