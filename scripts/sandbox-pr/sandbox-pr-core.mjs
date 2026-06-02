import fs from "node:fs";
import path from "node:path";

import { validateAgentEventRow } from "../agent-events/agent-event-core.mjs";

const REQUIRED_FIELDS = [
  "Layer",
  "RoleOwner",
  "Department",
  "AccountableLayer",
  "ReportsTo",
  "AutonomyLevel",
  "Controller",
  "DecisionOwner",
  "Agent",
  "Mode",
  "Workspace",
  "Dispatch",
  "Sandbox",
  "BranchName",
  "WorktreeRoot",
  "IntegrationTarget",
  "OutcomeSpec",
  "OutcomeRubric",
  "OutcomeGrader",
  "OutcomeArtifacts",
  "AlwaysAllow",
  "RuntimeAuth",
  "EventPolicy",
  "EventSink",
  "EventTypes",
  "StateReducer",
  "DreamPolicy",
  "MemoryUpdatePolicy",
  "SessionPolicy",
  "SharedFilesystem",
  "ContextIsolation",
  "RuntimeAdapter",
  "HumanGate",
  "HumanGateLevel",
  "HumanGateOwner",
  "FounderPrediction",
  "FounderPredictionConfidence",
  "BlockedActions",
  "Reporting",
  "MaxRuntime",
  "MaxSpend",
  "KillSwitch",
  "Heartbeat",
];

const REQUIRED_SECTIONS = ["SourceOfTruth", "Scope", "Acceptance Criteria", "Gates"];
const BLOCKED_ACTIONS = ["merge", "push", "deploy", "production-write", "memory-write", "done-transition"];

function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
}

function normalizeFieldName(name) {
  if (name === "Acceptance Criteria") return "Acceptance Criteria";
  return name.trim();
}

export function parseWorkerContract(markdown) {
  const fields = {};
  const sections = {};
  let currentSection = "";

  for (const rawLine of String(markdown).split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      currentSection = normalizeFieldName(heading[1].trim());
      if (!sections[currentSection]) sections[currentSection] = "";
      continue;
    }

    const field = line.match(/^([A-Za-z][A-Za-z0-9 /_-]*):\s*(.*)$/);
    if (field) {
      const key = normalizeFieldName(field[1]);
      fields[key] = field[2].trim();
      currentSection = key;
      if (!sections[currentSection]) sections[currentSection] = "";
      continue;
    }

    if (currentSection) {
      sections[currentSection] = `${sections[currentSection] || ""}${rawLine}\n`;
    }
  }

  return {
    fields,
    sections: Object.fromEntries(Object.entries(sections).map(([key, value]) => [key, value.trim()])),
    raw: String(markdown),
  };
}

function fieldValue(contract, field) {
  return contract.fields[field] || contract.sections[field] || "";
}

function hasContent(contract, field) {
  return Boolean(fieldValue(contract, field).trim());
}

function issueId(contract) {
  const fromField = contract.fields.Issue || contract.fields.LinearIssue || "";
  if (fromField) return fromField;
  const firstMatch = contract.raw.match(/\b[A-Z]+-\d+\b/);
  return firstMatch ? firstMatch[0] : "ISSUE-UNKNOWN";
}

function workspaceKeyFromField(value) {
  if (String(value).startsWith("registry:")) return String(value).slice("registry:".length);
  const base = path.basename(String(value).replace(/\/$/, ""));
  return base || "workspace";
}

function branchPattern({ workspaceKey, date, issue, worker, roleOwner }) {
  return new RegExp(
    `^codex/sandbox/${workspaceKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/${date}-${issue.toLowerCase()}-${worker.toLowerCase()}-${roleOwner.toLowerCase()}-[a-z0-9-]+-\\d{6}$`,
  );
}

export function buildSandboxBranchName({ workspaceKey, date, issueId, worker, roleOwner, taskSlug, time }) {
  return [
    "codex/sandbox",
    slugify(workspaceKey),
    `${date}-${String(issueId).toLowerCase()}-${slugify(worker)}-${slugify(roleOwner)}-${slugify(taskSlug)}-${time}`,
  ].join("/");
}

function branchLeaf(branchName) {
  const parts = String(branchName).split("/");
  return parts[parts.length - 1] || "";
}

function worktreePath(contract) {
  const root = contract.fields.Worktree || contract.fields.WorktreeRoot || "";
  if (!root) return "";
  const workspaceKey = workspaceKeyFromField(contract.fields.Workspace);
  const branchName = contract.fields.BranchName || "";
  const leaf = branchLeaf(branchName);
  if (contract.fields.Worktree) return contract.fields.Worktree;
  return path.join(root, workspaceKey, leaf);
}

function numericConfidence(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validateBranchName(contract, errors) {
  const branchName = contract.fields.BranchName || "";
  const workspaceKey = workspaceKeyFromField(contract.fields.Workspace);
  const issue = issueId(contract);
  const worker = contract.fields.Agent || "";
  const roleOwner = contract.fields.RoleOwner || "";
  const runAt = contract.fields.RunAt || "";
  const date = runAt.match(/\d{4}-\d{2}-\d{2}/)?.[0] || branchName.match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";

  if (!branchName) {
    errors.push("BranchName is required for sandbox PR autopilot.");
    return;
  }
  if (!date || !branchPattern({ workspaceKey, date, issue, worker, roleOwner }).test(branchName)) {
    errors.push("BranchName must follow codex/sandbox/<workspace>/<date>-<issue>-<worker>-<role-owner>-<task-slug>-<hhmmss>.");
  }
}

function validateBlockedActions(contract, errors) {
  const blocked = fieldValue(contract, "BlockedActions").toLowerCase();
  const missing = BLOCKED_ACTIONS.filter((action) => !blocked.includes(action));
  if (missing.length) {
    errors.push(`BlockedActions must explicitly include: ${missing.join(", ")}.`);
  }
}

function validateForbiddenClaims(contract, errors) {
  const raw = contract.raw.toLowerCase();
  const forbidden = [
    ["auto-merge", /auto[-\s]?merge|may merge|can merge/],
    ["auto-push", /auto[-\s]?push|may push|can push/],
    ["auto-deploy", /auto[-\s]?deploy|may deploy|can deploy/],
    ["auto-done", /mark .*done|set .*done|done transition allowed/],
    ["memory-write", /write durable memory|honcho write allowed|memory write allowed/],
  ];
  for (const [label, pattern] of forbidden) {
    if (pattern.test(raw)) errors.push(`Contract contains forbidden ${label} permission.`);
  }
}

export function validateSandboxPrReadiness(contract) {
  const errors = [];
  const warnings = [];

  for (const field of REQUIRED_FIELDS) {
    if (!hasContent(contract, field)) errors.push(`Missing required field: ${field}.`);
  }
  for (const section of REQUIRED_SECTIONS) {
    if (!hasContent(contract, section)) errors.push(`Missing required section: ${section}.`);
  }

  if (contract.fields.Mode !== "implement") errors.push("Mode must be implement for sandbox PR autopilot.");
  if (contract.fields.Sandbox !== "required") errors.push("Sandbox: required is mandatory.");
  if (contract.fields.AutonomyLevel !== "L3") errors.push("AutonomyLevel: L3 is mandatory.");
  if (contract.fields.SharedFilesystem !== "sandbox-worktree") errors.push("SharedFilesystem must be sandbox-worktree.");
  if (contract.fields.StateReducer && contract.fields.StateReducer !== "issue-state-from-agent-events") {
    errors.push("StateReducer must be issue-state-from-agent-events.");
  }
  if (!String(contract.fields.Workspace || "").startsWith("registry:") && !path.isAbsolute(contract.fields.Workspace || "")) {
    errors.push("Workspace must be registry:<key> or an absolute path.");
  }
  if (contract.fields.WorktreeRoot && !path.isAbsolute(contract.fields.WorktreeRoot)) {
    errors.push("WorktreeRoot must be absolute.");
  }
  if (numericConfidence(contract.fields.FounderPredictionConfidence) < 0.7) {
    errors.push("FounderPredictionConfidence must be >= 0.70 before L3 sandbox autopilot.");
  }
  if (contract.fields.MaxSpend && !/^EUR\s*0\b/i.test(contract.fields.MaxSpend)) {
    errors.push("MaxSpend must be EUR 0 for this autopilot lane.");
  }

  validateBranchName(contract, errors);
  validateBlockedActions(contract, errors);
  validateForbiddenClaims(contract, errors);

  if (!fieldValue(contract, "RuntimeAuth").includes("CLAUDE_AUTH_OK")) {
    warnings.push("RuntimeAuth does not explicitly name CLAUDE_AUTH_OK; controller must verify equivalent sentinel before dispatch.");
  }
  if (!fieldValue(contract, "Reporting").split(/\s+/).some((token) => token.startsWith("/"))) {
    errors.push("Reporting must include an absolute report path.");
  }

  const branchName = contract.fields.BranchName || "";
  const normalized = {
    issueId: issueId(contract),
    workspaceKey: workspaceKeyFromField(contract.fields.Workspace),
    branchName,
    worktreePath: worktreePath(contract),
    integrationTarget: contract.fields.IntegrationTarget || "",
    agent: contract.fields.Agent || "",
    roleOwner: contract.fields.RoleOwner || "",
    department: contract.fields.Department || "",
    humanGateOwner: contract.fields.HumanGateOwner || "",
    humanGateLevel: contract.fields.HumanGateLevel || "",
    reportPath: fieldValue(contract, "Reporting").split(/\s+/).find((token) => token.startsWith("/")) || "",
  };

  if (normalized.worktreePath && !path.isAbsolute(normalized.worktreePath)) {
    errors.push("Worktree path must be absolute.");
  }

  return {
    ready: errors.length === 0,
    errors,
    warnings,
    normalized,
  };
}

function tableRow(values) {
  return `| ${values.map((value) => String(value || "").replace(/\n/g, " ")).join(" | ")} |`;
}

export function buildDraftPrPacket({ contract, readiness, controllerVerdict = "NEEDS_HUMAN" }) {
  const normalized = readiness.normalized;
  const status = readiness.ready ? "READY_FOR_SANDBOX_REVIEW_PACKET" : "BLOCKED_BY_CONTRACT";
  const lines = [
    "# Sandbox Draft PR Packet",
    "",
    `Status: ${status}`,
    `ControllerVerdict: ${controllerVerdict}`,
    `Issue: ${normalized.issueId}`,
    `Workspace: ${contract.fields.Workspace}`,
    `Branch: \`${normalized.branchName}\``,
    `Worktree: \`${normalized.worktreePath}\``,
    `IntegrationTarget: ${normalized.integrationTarget}`,
    `HumanGateOwner: ${normalized.humanGateOwner}`,
    `HumanGateLevel: ${normalized.humanGateLevel}`,
    "",
    "## No Auto-Merge",
    "",
    "This packet is a human review surface. It does not authorize merge, push, deploy, production writes, durable memory writes or Linear Done transitions.",
    "",
    "## Readiness",
    "",
    tableRow(["Ready", "Errors", "Warnings"]),
    tableRow(["---", "---", "---"]),
    tableRow([readiness.ready, readiness.errors.length, readiness.warnings.length]),
    "",
    "## Blockers",
    "",
    ...(readiness.errors.length ? readiness.errors.map((error) => `- ${error}`) : ["- None."]),
    "",
    "## Warnings",
    "",
    ...(readiness.warnings.length ? readiness.warnings.map((warning) => `- ${warning}`) : ["- None."]),
    "",
    "## Source Of Truth",
    "",
    contract.sections.SourceOfTruth || "- Missing.",
    "",
    "## Scope",
    "",
    contract.sections.Scope || "- Missing.",
    "",
    "## Acceptance Criteria",
    "",
    contract.sections["Acceptance Criteria"] || contract.sections["Acceptance"] || "- Missing.",
    "",
    "## Gates",
    "",
    contract.sections.Gates || "- Missing.",
    "",
    "## Blocked Actions",
    "",
    fieldValue(contract, "BlockedActions") || "- Missing.",
    "",
    "## Human Review Decision",
    "",
    "- approve: human accepts the sandbox packet and separately authorizes integration conditions",
    "- reject: stop this sandbox path",
    "- split: create narrower worker contract",
    "- park: keep artifact, no further automation",
    "",
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

export function buildSandboxWorktreeCommand({ readiness, workspaceRoot }) {
  const normalized = readiness.normalized;
  return [
    "git",
    "-C",
    workspaceRoot,
    "worktree",
    "add",
    "-b",
    normalized.branchName,
    normalized.worktreePath,
    normalized.integrationTarget,
  ];
}

function baseEvent({ contract, readiness, workspaceRoot, now }) {
  const normalized = readiness.normalized;
  const dateSlug = now.toISOString().slice(0, 10).replace(/-/g, "");
  const runSlug = branchLeaf(normalized.branchName).replace(/[^a-zA-Z0-9_-]/g, "_");
  return {
    schema_version: "agent-event/v1",
    occurred_at: now.toISOString(),
    producer: "controller",
    workspace: contract.fields.Workspace,
    workspace_path: workspaceRoot,
    issue_id: normalized.issueId,
    parent_issue_id: contract.fields.DependsOn || "",
    run_id: `sandbox-pr-${dateSlug}-${normalized.issueId.toLowerCase()}-${runSlug}`,
    session_id: `sandbox_pr_${dateSlug}_${normalized.issueId.toLowerCase()}_${runSlug}`,
    agent: contract.fields.Agent,
    mode: "implement",
    role_owner: contract.fields.RoleOwner,
    department: contract.fields.Department,
    autonomy_level: contract.fields.AutonomyLevel,
    event_policy: "issue-state-from-agent-events",
    linear_comment_ids: [],
    redaction_level: "internal",
  };
}

export function buildSandboxEvents({ contract, readiness, packetPath, jsonPath, workspaceRoot, now = new Date() }) {
  const base = baseEvent({ contract, readiness, workspaceRoot, now });
  const normalized = readiness.normalized;
  const eventPrefix = `${base.run_id.replace(/[^a-zA-Z0-9_]/g, "_")}`;
  const lockedId = `evt_${eventPrefix}_worker_locked`;
  const createdId = `evt_${eventPrefix}_sandbox_created`;
  const gateId = `evt_${eventPrefix}_human_gate_required`;

  const events = [
    {
      ...base,
      event_id: lockedId,
      event_type: "worker.locked",
      payload: {
        lock_id: `lock_${normalized.issueId.toLowerCase()}_${now.toISOString().slice(0, 10).replace(/-/g, "")}`,
        locked_by: "controller",
        scope_hash: `branch:${normalized.branchName}`,
        max_runtime_minutes: Number.parseInt(contract.fields.MaxRuntime, 10) || 15,
        heartbeat_interval_minutes: 15,
        kill_switch: contract.fields.KillSwitch,
        allowed_actions: ["create_sandbox_worktree", "write_patch", "write_report", "append_event"],
      },
      artifact_paths: [packetPath, jsonPath],
      human_gate_required: false,
      previous_event_id: null,
    },
    {
      ...base,
      event_id: createdId,
      event_type: "sandbox.created",
      payload: {
        branch_name: normalized.branchName,
        worktree_path: normalized.worktreePath,
        integration_target: normalized.integrationTarget,
        sandbox_policy: "docs/operations/sandbox-branch-lane.md",
      },
      artifact_paths: [packetPath, jsonPath],
      human_gate_required: false,
      previous_event_id: lockedId,
    },
    {
      ...base,
      event_id: gateId,
      event_type: "human_gate.required",
      payload: {
        gate_owner: normalized.humanGateOwner,
        decision: "approve sandbox integration review",
        options: ["approve", "reject", "split", "park"],
        blocks: ["merge", "push", "deploy", "done", "production-write", "memory-write"],
        decision_surface: packetPath,
      },
      artifact_paths: [packetPath, jsonPath],
      human_gate_required: true,
      previous_event_id: createdId,
    },
  ];

  for (const event of events) {
    const validation = validateAgentEventRow(event);
    if (!validation.valid) throw new Error(validation.errors.join("\n"));
  }
  return events;
}

export function writeSandboxPrPacket({ contractPath, outputDir, workspaceRoot, now = new Date() }) {
  const markdown = fs.readFileSync(contractPath, "utf8");
  const contract = parseWorkerContract(markdown);
  const readiness = validateSandboxPrReadiness(contract);
  const normalized = readiness.normalized;
  const safeIssue = normalized.issueId.toLowerCase();
  const packetPath = path.join(outputDir, `${safeIssue}-sandbox-draft-pr-packet.md`);
  const jsonPath = path.join(outputDir, `${safeIssue}-sandbox-draft-pr-packet.json`);
  const packet = buildDraftPrPacket({ contract, readiness });
  const payload = {
    generated_at: now.toISOString(),
    contract_path: contractPath,
    readiness,
    branch_name: normalized.branchName,
    worktree_path: normalized.worktreePath,
    no_auto_merge: true,
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(packetPath, packet);
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);

  return { contract, readiness, packetPath, jsonPath };
}
