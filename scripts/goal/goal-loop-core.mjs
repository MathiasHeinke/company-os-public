export const GOAL_LOOP_PILOT_VERSION = "goal-loop-pilot/v0";

const STOP_REASONS = new Set([
  "BLOCKED_AUTH",
  "BLOCKED_BUDGET",
  "BLOCKED_DEPENDENCY",
  "TIMEOUT",
  "RUNTIME_ERROR",
  "NEEDS_HUMAN",
  "REJECT",
]);

function compact(value) {
  return String(value || "").trim();
}

function command(parts) {
  return parts.map(String).join(" ");
}

function childCommandParts({ workspaceSlug, projectId, workItemId, authMode }) {
  return [
    "--workspace", workspaceSlug,
    "--project-id", projectId,
    "--work-item-id", workItemId,
    "--auth", authMode,
    "--json",
  ];
}

function buildPlannedSteps({ child, workspaceSlug, projectId, authMode }) {
  const base = childCommandParts({ workspaceSlug, projectId, workItemId: child.id, authMode });
  return [
    {
      step: "stage-0506",
      status: "planned",
      command: command(["node scripts/orchestration/scheduler-stage-0506.mjs", ...base, "--mode", "dry-run"]),
      stop_on: ["CONTRACT_REJECT", "NEEDS_HUMAN", "BLOCKED_*"],
    },
    {
      step: "dispatcher-v0",
      status: "planned",
      command: command(["node scripts/orchestration/plane-dispatcher-v0.mjs", ...base, "--mode", "dry-run", "--contract-review", "require"]),
      stop_on: ["contract.dispatch-not-ready", "lock.active", "BLOCKED_*"],
    },
    {
      step: "goal-adapter",
      status: "planned",
      command: command([
        "node scripts/goal/goal.mjs",
        "adapt",
        "--work-item-id", child.id,
        "--project-id", projectId,
        "--runtime", child.agent || "claude",
        "--dry-run",
        "--auth", authMode,
        "--json",
      ]),
      stop_on: ["can_start=false", "BLOCKED_*"],
    },
    {
      step: "runtime-dispatcher-v1",
      status: "planned",
      command: command(["node scripts/orchestration/runtime-dispatcher-v1.mjs", ...base, "--mode", "dry-run", "--controller", "off", "--codex-controller", "off"]),
      stop_on: ["BLOCKED_AUTH", "BLOCKED_BUDGET", "BLOCKED_DEPENDENCY", "TIMEOUT", "RUNTIME_ERROR", "NEEDS_HUMAN", "REJECT"],
    },
    {
      step: "cao-pass",
      status: "planned",
      command: command(["node scripts/orchestration/cao-pass.mjs", ...base, "--mode", "dry-run"]),
      stop_on: ["REJECT", "PARK", "NEEDS_HUMAN"],
    },
    {
      step: "codex-controller",
      status: "planned",
      command: command([
        "node scripts/orchestration/codex-controller-dryrun.mjs",
        ...base,
        "--mode", "dry-run",
        "--confidence", "0.93",
        "--gate-green", "runtime-dispatcher-v1.2",
      ]),
      stop_on: ["ASK-FOUNDER", "REJECT", "PARK", "NEEDS_HUMAN"],
    },
  ];
}

export function buildGoalLoopPilot({
  runPlan,
  workspaceSlug = "companyos",
  projectId,
  projectIdentifier = "COMPA",
  authMode = "app-token",
  parentRef = "",
  windowHours = 24,
} = {}) {
  const selected = runPlan?.selected || [];
  const status = compact(runPlan?.status) || "BLOCKED_DEPENDENCY";
  const reasonCodes = runPlan?.reason_codes || [];
  const stopped = STOP_REASONS.has(status) || selected.length === 0;
  const selectedChild = selected[0] || null;
  const plannedSteps = selectedChild
    ? buildPlannedSteps({ child: selectedChild, workspaceSlug, projectId, authMode })
    : [];

  return {
    version: GOAL_LOOP_PILOT_VERSION,
    mode: "dry-run",
    scope: {
      workspace_slug: workspaceSlug,
      project_id: projectId || null,
      project_identifier: projectIdentifier,
      parent_ref: parentRef || runPlan?.parent?.ref || null,
      max_children: 1,
      window_hours: Number(windowHours) || 24,
    },
    status: stopped ? status : "READY_FOR_MANUAL_PILOT",
    stopped_at: stopped ? "select-child" : null,
    stop_reason_codes: stopped ? reasonCodes : [],
    selected_child: selectedChild,
    planned_steps: plannedSteps,
    event_ledger: {
      would_append: !stopped,
      path: "metrics/agent-events.jsonl",
      rows: stopped ? 0 : 1,
      reason: stopped ? "no selected child" : "pilot-loop-dry-run-ready",
    },
    plane_comment: {
      would_write: false,
      reason: "dry-run mode only; controller.progress is written manually after Codex verification",
    },
    guarantees: [
      "one parent only",
      "max one selected child per pass",
      "no automation created",
      "no worker spawned",
      "no Plane state transition",
      "no Done transition",
      "stop on BLOCKED_*, NEEDS_HUMAN, TIMEOUT, RUNTIME_ERROR or REJECT",
    ],
  };
}
