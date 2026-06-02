import fs from "node:fs";
import path from "node:path";

import {
  buildSandboxEvents,
  buildSandboxWorktreeCommand,
  parseWorkerContract,
  validateSandboxPrReadiness,
} from "./sandbox-pr-core.mjs";

const HIGH_RISK_PATTERNS = [
  ["schema/RLS/auth", /schema|rls|auth|service-role/i],
  ["production write", /production[-\s]?write|prod(?:uction)? db|live[-\s]?write/i],
  ["public send", /public[-\s]?send|outreach send|publish|post to/i],
  ["money/spend", /spend|payment|invoice|billing/i],
  ["medical/legal", /medical|rx|legal|claim|diagnosis/i],
];

function shellQuote(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:@=-]+$/.test(text)) return text;
  return `'${text.replace(/'/g, "'\\''")}'`;
}

function commandToString(command) {
  return command.map(shellQuote).join(" ");
}

function parseSeconds(value) {
  const match = String(value || "").match(/(\d+)/);
  if (!match) return 900;
  return Number.parseInt(match[1], 10);
}

function firstSectionLine(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)[0] || "execute the approved sandbox worker contract";
}

function highRiskFindings(contract) {
  const source = [
    contract.sections.Scope,
    contract.sections["Acceptance Criteria"],
    contract.sections.Gates,
    contract.fields.HumanGate,
    contract.fields.BlockedActions,
  ].join("\n");
  return HIGH_RISK_PATTERNS
    .filter(([, pattern]) => pattern.test(source))
    .map(([label]) => label);
}

function whatMathiasWouldReject({ contract, readiness }) {
  const findings = highRiskFindings(contract);
  const result = [];
  if (readiness.errors.length) {
    result.push("Contract is not ready; Mathias would reject dispatch until the controller can name the exact missing fields and gates.");
  }
  if (findings.includes("schema/RLS/auth")) {
    result.push("Scope references schema/RLS/auth/service-role risk; Mathias would reject any implementation that crosses that boundary without a separate HumanGate.");
  }
  if (findings.includes("production write")) {
    result.push("Production/live writes are present as a risk signal; Mathias would reject any real write in shadow or sandbox mode.");
  }
  if (findings.includes("public send")) {
    result.push("Public send or publishing language is present; Mathias would reject external output without a send gate.");
  }
  if (findings.includes("money/spend")) {
    result.push("Spend/billing language is present; Mathias would reject cost-bearing execution without a finance gate.");
  }
  if (findings.includes("medical/legal")) {
    result.push("Medical/legal/claim language is present; Mathias would reject claim-affecting changes without the correct domain gate.");
  }
  if (!result.length) {
    result.push("Mathias would likely reject broadening scope beyond the named acceptance criteria or skipping controller audit.");
  }
  return result;
}

function buildClaudeCommand({ contract, readiness }) {
  const runtimeSeconds = Math.max(300, parseSeconds(contract.fields.MaxRuntime));
  const task = [
    `Shadow-approved next worker would implement ${readiness.normalized.issueId} in sandbox only.`,
    `Scope: ${firstSectionLine(contract.sections.Scope)}`,
    "Stop before merge, push, deploy, production writes, durable memory writes or Linear Done.",
    "Report changed files, tests, residual risks and controller handoff.",
  ].join(" ");
  return [
    "claude",
    "-p",
    task,
    "--model",
    "claude-opus-4-7[1m]",
    "--permission-mode",
    "plan",
    "--output-format",
    "text",
    "--max-turns",
    "30",
    "--timeout",
    String(runtimeSeconds),
  ];
}

function packetCommand({ contractPath, workspaceRoot }) {
  return [
    "node",
    "scripts/sandbox-pr/prepare-sandbox-pr-pilot.mjs",
    "--contract",
    contractPath || "<contract.md>",
    "--workspace-root",
    workspaceRoot,
    "--json",
  ];
}

function realAction({ readiness }) {
  if (!readiness.ready) return "Backfill the worker contract and rerun the shadow simulation.";
  return "Run the packet-only readiness gate, review the shadow decision, then decide whether to allow --create-worktree for one real pilot.";
}

export function parseShadowRunContractFile(contractPath) {
  const markdown = fs.readFileSync(contractPath, "utf8");
  const contract = parseWorkerContract(markdown);
  const readiness = validateSandboxPrReadiness(contract);
  return { markdown, contract, readiness };
}

export function buildAutonomyShadowRun({
  contractMarkdown,
  contractPath = "",
  workspaceRoot,
  now = new Date(),
}) {
  const contract = parseWorkerContract(contractMarkdown);
  const readiness = validateSandboxPrReadiness(contract);
  const normalized = readiness.normalized;
  const ready = readiness.ready;
  const packetOnly = packetCommand({ contractPath, workspaceRoot });
  const worktree = ready ? buildSandboxWorktreeCommand({ readiness, workspaceRoot }) : [];
  const claude = ready ? buildClaudeCommand({ contract, readiness }) : [];
  const wouldAppendEvents = ready
    ? buildSandboxEvents({
        contract,
        readiness,
        packetPath: normalized.reportPath || "<sandbox-packet.md>",
        jsonPath: `${normalized.reportPath || "<sandbox-packet>"}.json`,
        workspaceRoot,
        now,
      }).map((event) => event.event_type)
    : [];

  return {
    shadow_only: true,
    side_effects_allowed: false,
    generated_at: now.toISOString(),
    selected_issue: normalized.issueId,
    workspace: contract.fields.Workspace || "",
    workspace_root: workspaceRoot,
    role_owner: normalized.roleOwner,
    human_gate_owner: normalized.humanGateOwner,
    human_gate_level: normalized.humanGateLevel,
    would_dispatch: ready,
    would_create_branch: ready ? normalized.branchName : "",
    would_create_worktree: ready ? normalized.worktreePath : "",
    would_start_worker: ready ? `${normalized.agent} implement sandbox` : "none",
    would_run_commands: [packetOnly, worktree, claude].filter((command) => command.length).map(commandToString),
    would_append_events: wouldAppendEvents,
    blocked_actions_respected: ready,
    controller_verdict_if_finished: ready ? "slice-ready-for-human-review" : "blocked-by-contract",
    what_mathias_would_reject: whatMathiasWouldReject({ contract, readiness }),
    would_fail_because: readiness.errors,
    warnings: readiness.warnings,
    next_safe_real_action: realAction({ readiness }),
    confidence: Number.parseFloat(contract.fields.FounderPredictionConfidence || "0") || 0,
    no_side_effects: [
      "no worktree creation",
      "no event append",
      "no Linear write",
      "no memory write",
      "no worker execution",
      "no merge/push/deploy",
    ],
  };
}

function bool(value) {
  return value ? "yes" : "no";
}

export function renderAutonomyShadowRunMarkdown(run) {
  const lines = [
    "# Autonomy Shadow Run",
    "",
    "Status: shadow-only",
    `GeneratedAt: ${run.generated_at}`,
    `Issue: ${run.selected_issue}`,
    `Workspace: ${run.workspace}`,
    `RoleOwner: ${run.role_owner}`,
    `HumanGateOwner: ${run.human_gate_owner}`,
    `HumanGateLevel: ${run.human_gate_level}`,
    "",
    "## No Side Effects",
    "",
    ...run.no_side_effects.map((item) => `- ${item}`),
    "",
    "## Decision",
    "",
    `would_dispatch: ${bool(run.would_dispatch)}`,
    `would_create_branch: ${run.would_create_branch || "no"}`,
    `would_create_worktree: ${run.would_create_worktree || "no"}`,
    `would_start_worker: ${run.would_start_worker}`,
    `controller_verdict_if_finished: ${run.controller_verdict_if_finished}`,
    `blocked_actions_respected: ${bool(run.blocked_actions_respected)}`,
    `confidence: ${run.confidence.toFixed(2)}`,
    "",
    "## Would Run Commands",
    "",
    ...(run.would_run_commands.length ? run.would_run_commands.map((command) => `- \`${command}\``) : ["- None."]),
    "",
    "## Would Append Events",
    "",
    ...(run.would_append_events.length ? run.would_append_events.map((event) => `- ${event}`) : ["- None."]),
    "",
    "## What Mathias Would Reject",
    "",
    ...run.what_mathias_would_reject.map((item) => `- ${item}`),
    "",
    "## Would Fail Because",
    "",
    ...(run.would_fail_because.length ? run.would_fail_because.map((item) => `- ${item}`) : ["- No readiness errors predicted."]),
    "",
    "## Warnings",
    "",
    ...(run.warnings.length ? run.warnings.map((item) => `- ${item}`) : ["- None."]),
    "",
    "## Next Safe Real Action",
    "",
    run.next_safe_real_action,
    "",
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

export function writeAutonomyShadowRunReport({ run, reportPath }) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, renderAutonomyShadowRunMarkdown(run));
  return reportPath;
}
