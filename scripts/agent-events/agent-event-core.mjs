import fs from "node:fs";
import path from "node:path";

export const SCHEMA_VERSION = "agent-event/v1";

export const EVENT_TYPES = new Set([
  "worker.locked",
  "worker.heartbeat",
  "worker.blocked",
  "worker.reported",
  "sandbox.created",
  "sandbox.patch_produced",
  "sandbox.max_turns_reached",
  "sandbox.rework_requested",
  "controller.audit_started",
  "controller.verdict",
  "human_gate.required",
  "human_gate.released",
  "human_gate.rejected",
  "memory.proposal_created",
  "memory.dream_requested",
  "memory.dream_reviewed",
  "runtime.auth_passed",
  "runtime.auth_failed",
  "runtime.lock_acquired",
  "runtime.lock_blocked",
  "runtime.lock_released",
  "runtime.timeout",
  "runtime.killed",
  "ledger.run_summarized",
]);

export const REVIEW_VERDICTS = new Set(["PASS", "NEEDS_REWORK", "BLOCKED", "NEEDS_HUMAN", "REJECT"]);
export const AUTONOMY_RECOMMENDATIONS = new Set(["PROMOTE", "KEEP", "RESTRICT", "RETRAIN", "RETIRE", "NO_CHANGE"]);
// Canonical HumanGate enum per docs/governance/human-gate-levels.md.
// HG-3 is CEO/Codex critical authority. HG-3.5 is Chief-of-Staff /
// founder-proxy review. HG-4 is the real founder/strategic boundary.
export const HUMAN_GATE_LEVELS = new Set(["HG-0", "HG-1", "HG-2", "HG-2.5", "HG-3", "HG-3.5", "HG-4"]);
export const HUMAN_GATE_CONFIDENCE_THRESHOLDS = {
  "HG-0": 0,
  "HG-1": 0.8,
  "HG-2": 0.85,
  "HG-2.5": 0.92,
  "HG-3": 0.96,
  "HG-3.5": 1,
  "HG-4": 1,
};

const HG35_RELEASE_OWNERS = new Set(["Chief-of-Staff", "Founder-Proxy", "Founder", "human"]);
const HG4_RELEASE_OWNERS = new Set(["Founder", "human"]);
const CEO_RELEASE_OWNERS = new Set(["CEO", "Codex-GPT-5.5-xhigh", "GPT-5.5-xhigh", "delegated-controller", "Founder", "human"]);

const REQUIRED_BASE_FIELDS = [
  "schema_version",
  "event_id",
  "event_type",
  "occurred_at",
  "producer",
  "workspace",
  "workspace_path",
  "issue_id",
  "run_id",
  "session_id",
  "agent",
  "mode",
  "role_owner",
  "department",
  "autonomy_level",
  "event_policy",
  "payload",
  "artifact_paths",
  "linear_comment_ids",
  "human_gate_required",
  "redaction_level",
];

export function parseJsonl(text, source = "<memory>") {
  return String(text)
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter((item) => item.line)
    .map((item) => {
      try {
        return { row: JSON.parse(item.line), lineNumber: item.lineNumber };
      } catch (error) {
        const wrapped = new Error(`${source}:${item.lineNumber}: invalid JSON: ${error.message}`);
        wrapped.cause = error;
        throw wrapped;
      }
    });
}

export function readJsonlFile(filePath) {
  return parseJsonl(fs.readFileSync(filePath, "utf8"), filePath);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isIsoUtc(value) {
  if (typeof value !== "string" || !value.endsWith("Z")) return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime());
}

function isNamespacedExtension(eventType) {
  return /^[a-z][a-z0-9_-]+\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)?$/.test(eventType);
}

function validateControllerVerdictPayload(payload, errors) {
  if (!REVIEW_VERDICTS.has(payload.review_verdict)) {
    errors.push(`payload.review_verdict must be one of ${[...REVIEW_VERDICTS].join(", ")}`);
  }
  if (payload.autonomy_recommendation && !AUTONOMY_RECOMMENDATIONS.has(payload.autonomy_recommendation)) {
    errors.push(`payload.autonomy_recommendation must be one of ${[...AUTONOMY_RECOMMENDATIONS].join(", ")}`);
  }
}

function validateHumanGateReleasePayload(payload, errors) {
  const level = payload.level || "";
  if (!HUMAN_GATE_LEVELS.has(level)) {
    errors.push(`payload.level must be one of ${[...HUMAN_GATE_LEVELS].join(", ")}`);
    return;
  }

  if (!payload.released_by) errors.push("payload.released_by is required for human_gate.released");
  if (!Array.isArray(payload.blocked_actions_still_forbidden)) {
    errors.push("payload.blocked_actions_still_forbidden must be an array for human_gate.released");
  }

  const confidence = Number(payload.founder_prediction_confidence);
  const threshold = HUMAN_GATE_CONFIDENCE_THRESHOLDS[level] ?? 1;
  if (!Number.isFinite(confidence)) {
    errors.push("payload.founder_prediction_confidence must be a number for human_gate.released");
  } else if (confidence < threshold) {
    errors.push(`payload.founder_prediction_confidence must be >= ${threshold} for ${level}`);
  }

  if (["HG-1", "HG-2", "HG-2.5", "HG-3"].includes(level)) {
    if (!CEO_RELEASE_OWNERS.has(payload.released_by)) {
      errors.push("HG-1/HG-2/HG-2.5/HG-3 human_gate.released must be released_by CEO, Codex controller, Founder or human");
    }
    const validation = payload.release_validation;
    if (!validation || typeof validation !== "object" || Array.isArray(validation)) {
      errors.push("payload.release_validation is required for HG-1/HG-2/HG-2.5/HG-3 human_gate.released");
    } else if (validation.status !== "pass" || validation.blocker_count !== 0) {
      errors.push("payload.release_validation must have status pass and blocker_count 0 for HG-1/HG-2/HG-2.5/HG-3 human_gate.released");
    }
  }

  if (level === "HG-3.5" && !HG35_RELEASE_OWNERS.has(payload.released_by)) {
    errors.push("HG-3.5 human_gate.released must be released_by Chief-of-Staff, Founder-Proxy, Founder or human");
  }
  if (level === "HG-4" && !HG4_RELEASE_OWNERS.has(payload.released_by)) {
    errors.push("HG-4 human_gate.released must be released_by Founder or human");
  }
}

export function validateAgentEventRow(row, { lineNumber = 0 } = {}) {
  const errors = [];
  const prefix = lineNumber ? `line ${lineNumber}: ` : "";

  if (!isObject(row)) {
    return { valid: false, errors: [`${prefix}row must be a JSON object`] };
  }

  for (const field of REQUIRED_BASE_FIELDS) {
    if (!(field in row)) errors.push(`${prefix}missing required field: ${field}`);
  }

  if (row.schema_version !== SCHEMA_VERSION) errors.push(`${prefix}schema_version must be ${SCHEMA_VERSION}`);
  if (typeof row.event_id !== "string" || !row.event_id.trim()) errors.push(`${prefix}event_id must be a non-empty string`);
  if (!EVENT_TYPES.has(row.event_type) && !isNamespacedExtension(row.event_type)) {
    errors.push(`${prefix}event_type is not canonical or a valid namespaced extension: ${row.event_type}`);
  }
  if (!isIsoUtc(row.occurred_at)) errors.push(`${prefix}occurred_at must be UTC ISO 8601 with Z`);
  if (typeof row.workspace_path !== "string" || !path.isAbsolute(row.workspace_path)) {
    errors.push(`${prefix}workspace_path must be absolute`);
  }
  if (!isObject(row.payload)) errors.push(`${prefix}payload must be an object`);
  if (!Array.isArray(row.artifact_paths)) errors.push(`${prefix}artifact_paths must be an array`);
  if (!Array.isArray(row.linear_comment_ids)) errors.push(`${prefix}linear_comment_ids must be an array`);
  if (typeof row.human_gate_required !== "boolean") errors.push(`${prefix}human_gate_required must be boolean`);

  if (Array.isArray(row.artifact_paths)) {
    row.artifact_paths.forEach((artifactPath, index) => {
      if (typeof artifactPath !== "string" || !path.isAbsolute(artifactPath)) {
        errors.push(`${prefix}artifact_paths[${index}] must be absolute`);
      }
    });
  }

  if (row.event_type === "controller.verdict" && isObject(row.payload)) {
    validateControllerVerdictPayload(row.payload, errors);
  }
  if (row.event_type === "human_gate.released" && isObject(row.payload)) {
    validateHumanGateReleasePayload(row.payload, errors);
  }

  return { valid: errors.length === 0, errors };
}

export function validateAgentEventRows(items) {
  const errors = [];
  const seen = new Set();

  for (const item of items) {
    const { row, lineNumber } = "row" in item ? item : { row: item, lineNumber: 0 };
    const result = validateAgentEventRow(row, { lineNumber });
    errors.push(...result.errors);
    if (row?.event_id) {
      if (seen.has(row.event_id)) errors.push(`${lineNumber ? `line ${lineNumber}: ` : ""}duplicate event_id: ${row.event_id}`);
      seen.add(row.event_id);
    }
  }

  return { valid: errors.length === 0, errors };
}

function emptyState(seed = {}) {
  return {
    issue_id: seed.issue_id || "",
    parent_issue_id: seed.parent_issue_id || "",
    run_id: seed.run_id || "",
    worker_state: "idle",
    controller_state: "none",
    issue_state_recommendation: "intake",
    merge_state: "not_applicable",
    human_gate_state: "none",
    memory_state: "none",
    last_event_id: "",
    blocking_reasons: [],
    next_action: "no events",
  };
}

function uniquePush(values, value) {
  if (value && !values.includes(value)) values.push(value);
}

function sortEvents(rows) {
  return rows
    .map((row, appendIndex) => ({ row, appendIndex }))
    .sort((a, b) => {
      const byDate = new Date(a.row.occurred_at).getTime() - new Date(b.row.occurred_at).getTime();
      return byDate || a.appendIndex - b.appendIndex;
    })
    .map((item) => item.row);
}

function reviewVerdict(row) {
  return row.payload?.review_verdict || "";
}

function resultNeedsAudit(row) {
  return Boolean(row.payload?.needs_controller_audit);
}

function isSandboxEvent(row) {
  return row.event_type.startsWith("sandbox.") || Boolean(row.payload?.branch_name || row.payload?.worktree_path);
}

export function reduceAgentEvents(rows) {
  const deduped = [];
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.event_id)) continue;
    seen.add(row.event_id);
    deduped.push(row);
  }

  const ordered = sortEvents(deduped);
  const state = emptyState(ordered[0] || {});

  for (const row of ordered) {
    state.issue_id = state.issue_id || row.issue_id || "";
    state.parent_issue_id = state.parent_issue_id || row.parent_issue_id || "";
    state.run_id = state.run_id || row.run_id || "";
    state.last_event_id = row.event_id;

    if (row.human_gate_required) state.human_gate_state = "required";

    switch (row.event_type) {
      case "worker.locked":
        state.worker_state = "locked";
        state.issue_state_recommendation = "in_progress";
        state.next_action = "wait for worker heartbeat or report";
        break;
      case "worker.heartbeat":
        state.worker_state = "running";
        state.issue_state_recommendation = "in_progress";
        state.next_action = "wait for worker report";
        break;
      case "worker.blocked":
        state.worker_state = "blocked";
        state.issue_state_recommendation = "blocked";
        uniquePush(state.blocking_reasons, row.payload?.blocker || row.payload?.blocker_type || "worker blocked");
        state.next_action = row.payload?.required_action || "resolve worker blocker";
        break;
      case "worker.reported":
        state.worker_state = resultNeedsAudit(row) ? "needs_audit" : "reported";
        state.controller_state = "audit_required";
        state.issue_state_recommendation = "in_progress";
        state.next_action = "controller review worker report";
        break;
      case "sandbox.created":
        state.worker_state = "running";
        state.issue_state_recommendation = "in_progress";
        state.merge_state = "not_ready_to_merge";
        state.next_action = "wait for sandbox patch or worker report";
        break;
      case "sandbox.patch_produced":
        state.worker_state = "needs_audit";
        state.controller_state = "audit_required";
        state.issue_state_recommendation = "in_progress";
        state.merge_state = "not_ready_to_merge";
        state.next_action = "controller audit sandbox branch";
        break;
      case "sandbox.max_turns_reached":
      case "runtime.timeout":
        state.worker_state = "timed_out";
        state.issue_state_recommendation = "blocked";
        uniquePush(state.blocking_reasons, row.payload?.required_rework || row.payload?.classification || "runtime timeout");
        state.next_action = row.payload?.required_rework || "split before rerun";
        break;
      case "runtime.killed":
        state.worker_state = "cancelled";
        state.issue_state_recommendation = "blocked";
        uniquePush(state.blocking_reasons, row.payload?.reason || "runtime killed");
        state.next_action = "review kill reason";
        break;
      case "runtime.auth_failed":
        state.issue_state_recommendation = "blocked";
        state.controller_state = "blocked";
        uniquePush(state.blocking_reasons, row.payload?.failure || "runtime auth failed");
        state.next_action = "repair runtime auth";
        break;
      case "controller.audit_started":
        state.controller_state = "audit_running";
        state.next_action = "finish controller audit";
        break;
      case "controller.verdict": {
        const verdict = reviewVerdict(row);
        if (verdict === "PASS") {
          state.controller_state = row.human_gate_required || isSandboxEvent(row) ? "ready_for_gate_review" : "pass";
          state.issue_state_recommendation = row.human_gate_required ? "needs_human" : isSandboxEvent(row) ? "verified" : "done_candidate";
          if (isSandboxEvent(row)) state.merge_state = "ready_for_gate_review";
          state.next_action = row.human_gate_required ? "decision gate review required" : "dispatch dependent work or close";
        }
        if (verdict === "NEEDS_REWORK") {
          state.controller_state = "needs_rework";
          state.issue_state_recommendation = "in_progress";
          state.next_action = row.payload?.required_rework || "create rework slice";
        }
        if (verdict === "BLOCKED") {
          state.controller_state = "blocked";
          state.issue_state_recommendation = "blocked";
          uniquePush(state.blocking_reasons, row.payload?.required_rework || "controller blocked");
          state.next_action = row.payload?.required_rework || "resolve blocker";
        }
        if (verdict === "NEEDS_HUMAN") {
          state.controller_state = "ready_for_gate_review";
          state.issue_state_recommendation = "needs_human";
          state.human_gate_state = "required";
          if (state.merge_state !== "not_applicable") state.merge_state = "merge_gated";
          state.next_action = row.payload?.required_rework || "decision gate review required";
        }
        if (verdict === "REJECT") {
          state.controller_state = "reject";
          state.issue_state_recommendation = "rejected";
          if (state.merge_state !== "not_applicable") state.merge_state = "rejected";
          state.next_action = row.payload?.required_rework || "reject or rewrite";
        }
        break;
      }
      case "human_gate.required":
        state.human_gate_state = "required";
        state.issue_state_recommendation = "needs_human";
        if (row.payload?.blocks?.includes("merge")) state.merge_state = "merge_gated";
        state.next_action = row.payload?.decision || "decision gate review required";
        break;
      case "human_gate.released":
        state.human_gate_state = "released";
        if (state.merge_state === "merge_gated") state.merge_state = "ready_for_gate_review";
        state.next_action = row.payload?.conditions?.join("; ") || "continue under released gate conditions";
        break;
      case "human_gate.rejected":
        state.human_gate_state = "rejected";
        state.issue_state_recommendation = "rejected";
        if (state.merge_state !== "not_applicable") state.merge_state = "rejected";
        state.next_action = row.payload?.next_action || "stop or split";
        break;
      case "memory.proposal_created":
        state.memory_state = "proposal_created";
        state.next_action = row.payload?.requires_review === false
          ? "archive memory proposal"
          : "review memory proposal before durable write";
        break;
      case "memory.dream_requested":
        state.memory_state = "dream_requested";
        state.next_action = "wait for dream output proposal";
        break;
      case "memory.dream_reviewed":
        if (row.payload?.review_verdict === "accepted") state.memory_state = "approved";
        else if (row.payload?.review_verdict === "rejected") state.memory_state = "rejected";
        else state.memory_state = "dream_reviewed";
        state.next_action = row.payload?.review_verdict === "accepted"
          ? "apply approved memory update conditions"
          : "split, reject or rework dream output";
        break;
      default:
        break;
    }
  }

  return state;
}

export function filterEvents(rows, filters = {}) {
  return rows.filter((row) => {
    if (filters.issue && row.issue_id !== filters.issue && row.parent_issue_id !== filters.issue) return false;
    if (filters.run && row.run_id !== filters.run) return false;
    if (filters.session && row.session_id !== filters.session) return false;
    return true;
  });
}

export function summarizeByIssue(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = row.issue_id || row.parent_issue_id || "(unknown)";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.entries()].map(([issue_id, events]) => ({ issue_id, state: reduceAgentEvents(events) }));
}
