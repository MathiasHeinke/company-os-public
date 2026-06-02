export const GOAL_RUNTIME_ADAPTER_VERSION = "goal-runtime-adapter/v0";

const DEFAULT_SOURCE_DOCS = [
  "https://code.claude.com/docs/en/goal",
  "https://developers.openai.com/codex/use-cases/follow-goals",
  "docs/orchestration/goal-runtime-plane-loop.md",
  "docs/orchestration/company-os-runtime-dispatcher-v1.md",
  "docs/templates/worker-issue-contract.md",
];

const VALID_EFFORT_LEVELS = new Set(["low", "medium", "high", "xhigh", "max"]);

function compact(value) {
  return String(value || "").trim();
}

function asList(value) {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map(compact).filter(Boolean);
  return String(value)
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

function refForWorkItem(workItem, projectIdentifier = "COMPA") {
  const sequence = compact(workItem?.sequence_id);
  if (!sequence) return compact(workItem?.id) || "unknown";
  if (/^[A-Z]+-\d+$/i.test(sequence)) return sequence.toUpperCase();
  return `${projectIdentifier}-${sequence}`;
}

function truncateGoalCondition(text, maxChars = 3800) {
  const value = compact(text).replace(/\s+/g, " ");
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars - 22).trim()} ... [truncated]`;
}

function normalizeHumanGateLevel(value) {
  return compact(value).match(/\bHG-(?:0|1|2(?:\.5)?|3(?:\.5)?|4)\b/i)?.[0]?.toUpperCase() || "";
}

function normalizeEffort(value, fallback = "high") {
  const effort = compact(value).toLowerCase();
  if (VALID_EFFORT_LEVELS.has(effort)) return effort;
  return fallback;
}

function subAgentRosterValue(contractFields = {}) {
  return compact(
    contractFields.subagentroster
      || contractFields.sub_agent_roster
      || contractFields.subagents
      || contractFields.sub_agents
      || "",
  );
}

function hasDeclaredSubAgents(contractFields = {}) {
  const roster = subAgentRosterValue(contractFields);
  return Boolean(roster && !/^(?:none|\[\]|empty|n\/a)$/i.test(roster));
}

function dynamicWorkflowPolicy(contractFields = {}) {
  const humanGate = normalizeHumanGateLevel(contractFields.human_gate || "");
  const declaredSubAgents = hasDeclaredSubAgents(contractFields);
  const rawMax = Number.parseInt(
    compact(contractFields.maxsubagents || contractFields.max_subagents || contractFields.subagentlimit || contractFields.sub_agent_limit),
    10,
  );
  const maxSubAgents = Number.isFinite(rawMax) ? Math.max(0, Math.min(rawMax, 100)) : (declaredSubAgents ? 8 : 0);
  const allowed = declaredSubAgents && humanGate !== "HG-4" && maxSubAgents > 0;
  const blockedReasons = [];
  if (!declaredSubAgents) blockedReasons.push("subagent-roster-missing");
  if (humanGate === "HG-4") blockedReasons.push("hg4-founder-required");
  if (maxSubAgents <= 0) blockedReasons.push("max-subagents-zero");
  return {
    available: true,
    allowed,
    max_subagents: allowed ? maxSubAgents : 0,
    declared_subagents: declaredSubAgents,
    roster: declaredSubAgents ? subAgentRosterValue(contractFields) : "",
    blocked_reasons: allowed ? [] : blockedReasons,
    guarantee: "dynamic workflows may only run inside this selected child and must be summarized in worker.reported subagents: [].",
  };
}

function gateStopInstruction(humanGate) {
  const level = normalizeHumanGateLevel(humanGate);
  if (level === "HG-4") {
    return `Respect human_gate ${humanGate}; if HG-4 is reached, stop with NEEDS_HUMAN and explain the Founder decision needed.`;
  }
  if (level === "HG-3.5") {
    return `Respect human_gate ${humanGate}; if HG-3.5 is reached, stop before mutation with an HG-3.5 Chief-of-Staff / Founder-Proxy review artifact, not a Founder request.`;
  }
  if (level === "HG-2.5" || level === "HG-3") {
    return `Respect human_gate ${humanGate}; if this decision gate is reached, stop with a CEO/Codex release packet and exact evidence, not a Founder request.`;
  }
  return `Respect human_gate ${humanGate}; if evidence is insufficient or scope is unclear, stop with BLOCKED or NEEDS_REWORK instead of continuing.`;
}

function buildGoalCondition({ workItem, contractFields = {}, maxTurns = 20, projectIdentifier }) {
  const ref = refForWorkItem(workItem, projectIdentifier);
  const acceptance = asList(contractFields.acceptance_criteria);
  const gates = asList(contractFields.gates);
  const humanGate = compact(contractFields.human_gate) || "HG-2";
  const blocked = compact(contractFields.blockedactions || contractFields.blocked_actions);
  return truncateGoalCondition([
    `Complete only Plane child ${ref}: ${compact(workItem?.name) || "selected work item"}.`,
    "Stop when every listed acceptance criterion is satisfied, every gate has transcript-visible proof, and the final response is ready to become one worker.reported Plane comment.",
    acceptance.length ? `Acceptance criteria: ${acceptance.join("; ")}.` : "",
    gates.length ? `Validation gates: ${gates.join("; ")}.` : "",
    gateStopInstruction(humanGate),
    blocked ? `Blocked actions: ${blocked}.` : "",
    `Stop after ${maxTurns} turns if the end state is not proven.`,
  ].filter(Boolean).join(" "));
}

function buildCommonPrompt({ workItem, contractFields = {}, description = "", goalCondition, projectIdentifier, runtime }) {
  const ref = refForWorkItem(workItem, projectIdentifier);
  const contractAgent = compact(contractFields.agent) || "unknown";
  const runtimeAgent = compact(runtime) || contractAgent;
  return [
    `/goal ${goalCondition}`,
    "",
    "Company.OS bounded goal wrapper:",
    `- Work item: ${ref} ${compact(workItem?.name)}`,
    `- Runtime agent: ${runtimeAgent}`,
    `- Contract agent: ${contractAgent}`,
    `- Role: ${compact(contractFields.role) || "unknown"}`,
    `- Mode: ${compact(contractFields.mode) || "unknown"}`,
    `- Workspace: ${compact(contractFields.workspace) || "unknown"}`,
    "",
    "Hard boundaries:",
    "- Work only on this selected child item, not the parent backlog.",
    "- Do not mark Plane Done.",
    "- Do not write Plane, Linear, Honcho or durable memory directly.",
    "- Do not deploy, push, merge, publish, spend money or touch production data.",
    "- Do not spawn dynamic subagents unless the contract declares SubAgentRoster/MaxSubAgents and the adapter dynamic_workflow_policy says allowed=true.",
    "- If dynamic subagents are allowed, keep them inside this selected child, enforce the adapter max_subagents cap, and report every subagent in the final subagents block.",
    "- If the goal evaluator cannot see proof in the transcript, surface the proof before claiming completion.",
    "- If blocked by auth, policy, missing context, decision gate or scope, stop with the correct gate state: BLOCKED/NEEDS_REWORK, CEO_RELEASE_PACKET for HG-2.5/HG-3, HG35_REVIEW for HG-3.5, and NEEDS_HUMAN only for HG-4.",
    "",
    "Final response must be suitable for worker.reported and include: changed files, commands, gate results, blockers, rollback path, reflection, learning_proposals, and subagents: [].",
    "",
    "Plane work item description:",
    description,
  ].join("\n");
}

function buildCommandPreview({ runtime, prompt, workspace, model, permissionMode, maxTurns, effort }) {
  if (runtime === "claude") {
    return [
      "claude",
      "-p",
      "<goal-prompt>",
      "--model",
      model || "opus",
      "--effort",
      effort || "high",
      "--permission-mode",
      permissionMode || "plan",
      "--output-format",
      "text",
      "--max-turns",
      String(maxTurns || 20),
    ];
  }
  if (runtime === "codex") {
    return [
      "codex",
      "exec",
      "--cd",
      workspace || ".",
      "<goal-prompt>",
    ];
  }
  return [];
}

function resolvePermissionMode(contractFields = {}, fallback = "") {
  return compact(
    contractFields.runtimepermissionmode
      || contractFields.runtime_permission_mode
      || fallback
      || "plan",
  );
}

function resolveEffort(contractFields = {}, fallback = "") {
  return normalizeEffort(
    contractFields.runtimeeffort
      || contractFields.runtime_effort
      || fallback
      || "",
    "high",
  );
}

export function buildGoalRuntimeAdapter({
  workItem,
  contractFields = {},
  contractValidation = { ok: false, reason_codes: ["contract.validation-missing"] },
  description = "",
  runtime,
  projectIdentifier = "COMPA",
  model = "",
  permissionMode = "",
  effort = "",
  maxTurns = 20,
  sourceDocs = DEFAULT_SOURCE_DOCS,
} = {}) {
  const resolvedRuntime = compact(runtime || contractFields.agent || "claude").toLowerCase();
  const resolvedPermissionMode = resolvePermissionMode(contractFields, permissionMode);
  const resolvedEffort = resolveEffort(contractFields, effort);
  const dynamicPolicy = dynamicWorkflowPolicy(contractFields);
  const goalCondition = buildGoalCondition({ workItem, contractFields, maxTurns, projectIdentifier });
  const prompt = buildCommonPrompt({
    workItem,
    contractFields,
    description,
    goalCondition,
    projectIdentifier,
    runtime: resolvedRuntime,
  });
  const workspace = compact(contractFields.workspace);
  const featureGates = [];
  const smokeTests = [];
  if (resolvedRuntime === "codex") {
    featureGates.push("Codex CLI [features].goals = true or /experimental goals enabled");
    smokeTests.push("Run a non-mutating Codex goal smoke before live worker dispatch.");
  }
  if (resolvedRuntime === "claude") {
    featureGates.push("Claude Code workspace trust accepted and hooks not disabled");
  }

  return {
    version: GOAL_RUNTIME_ADAPTER_VERSION,
    runtime: resolvedRuntime,
    work_item: {
      id: compact(workItem?.id) || null,
      ref: refForWorkItem(workItem, projectIdentifier),
      name: compact(workItem?.name),
    },
    can_start: contractValidation.ok === true,
    blocked_reasons: contractValidation.ok === true ? [] : asList(contractValidation.reason_codes),
    goal_condition: goalCondition,
    prompt,
    prompt_chars: prompt.length,
    command_preview: buildCommandPreview({
      runtime: resolvedRuntime,
      prompt,
      workspace,
      model,
      permissionMode: resolvedPermissionMode,
      effort: resolvedEffort,
      maxTurns,
    }),
    fallback_prompt: prompt.replace(/^\/goal /, "Goal fallback, no managed goal primitive available: "),
    feature_gates: featureGates,
    smoke_tests: smokeTests,
    effort: resolvedEffort,
    dynamic_workflow_policy: dynamicPolicy,
    source_docs: sourceDocs,
    guarantees: [
      "adapter does not spawn workers",
      "adapter does not write Plane",
      "adapter does not mark Done",
      "adapter is scoped to one selected child",
    ],
    raindrop_hook: {
      surface: "goal-runtime/worker-run",
      adapter_version: GOAL_RUNTIME_ADAPTER_VERSION,
      work_item_ref: refForWorkItem(workItem, projectIdentifier),
      agent: resolvedRuntime,
      mode: compact(contractFields.mode) || "unknown",
      instrumentation: "call buildRaindropCallSummaryFromGoalRuntimeWorkerRun with run metadata after worker completes",
    },
  };
}
