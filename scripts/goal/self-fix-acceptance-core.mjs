import fs from "node:fs";
import path from "node:path";

export const SELF_FIX_ACCEPTANCE_VERSION = "self-fix-acceptance/v0";

function compact(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function commentBody(comment) {
  return compact(comment?.body || comment?.comment_stripped || comment?.comment_html || comment?.text);
}

function commentTime(comment) {
  const parsed = Date.parse(comment?.created_at || comment?.updated_at || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function markerRegex(marker) {
  const base = String(marker || "").replace(/:$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${base}(?:\\s*\\([^)]*\\))?\\s*:?\\s*$`);
}

export function parseMarkerFields(body, marker) {
  const lines = String(body || "").split(/\r?\n/);
  const rx = markerRegex(marker);
  let start = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (rx.test(lines[index].trim())) start = index;
  }
  if (start === -1) return {};

  const fields = {};
  let currentKey = "";
  for (const raw of lines.slice(start + 1)) {
    if (!raw.trim()) continue;
    const kv = raw.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*?)\s*$/);
    if (kv) {
      currentKey = kv[1].toLowerCase();
      fields[currentKey] = kv[2].trim();
      continue;
    }
    const item = raw.match(/^\s*-\s+(.*?)\s*$/);
    if (item && currentKey) {
      if (!Array.isArray(fields[currentKey])) fields[currentKey] = fields[currentKey] ? [fields[currentKey]] : [];
      fields[currentKey].push(item[1].trim());
      continue;
    }
    if (/^\S/.test(raw)) break;
  }
  return fields;
}

export function latestMarkerComment(comments = [], marker) {
  let best = null;
  for (const comment of comments || []) {
    const body = commentBody(comment);
    if (!body.includes(String(marker).replace(/:$/, ""))) continue;
    const fields = parseMarkerFields(body, marker);
    if (!Object.keys(fields).length) continue;
    const ts = commentTime(comment);
    if (!best || ts >= best.ts) {
      best = {
        comment_id: comment.id || null,
        created_at: comment.created_at || null,
        body,
        fields,
        ts,
      };
    }
  }
  return best;
}

function markerCommentById(comments = [], marker, id) {
  const targetId = compact(id);
  if (!targetId) return null;
  for (const comment of comments || []) {
    if (compact(comment?.id) !== targetId) continue;
    const body = commentBody(comment);
    const fields = parseMarkerFields(body, marker);
    if (!Object.keys(fields).length) return null;
    return {
      comment_id: comment.id || null,
      created_at: comment.created_at || null,
      body,
      fields,
      ts: commentTime(comment),
    };
  }
  return null;
}

function normalizeGate(gate) {
  if (typeof gate === "string") {
    return { command: gate, ok: true, output: "" };
  }
  return {
    command: compact(gate?.command || gate?.name),
    ok: Boolean(gate?.ok),
    output: compact(gate?.output || gate?.summary),
  };
}

export function buildSelfFixAcceptance({
  workItem = "",
  comments = [],
  commit = "",
  commitReachable = false,
  pushedToMain = false,
  gates = [],
  forbiddenActions = [],
  reportPath = "",
  now = new Date(),
} = {}) {
  const selfFix = latestMarkerComment(comments, "controller.self-fix");
  const referencedWorkerReportedId = compact(
    selfFix?.fields?.worker_reported_comment_id
    || selfFix?.fields?.worker_report_comment_id
    || selfFix?.fields?.worker_reported_comment
  );
  const workerReported = markerCommentById(comments, "worker.reported", referencedWorkerReportedId)
    || latestMarkerComment(comments, "worker.reported");
  const blockers = [];
  const warnings = [];
  const normalizedGates = gates.map(normalizeGate);
  const declaredCommit = compact(commit || selfFix?.fields?.commit);

  if (!selfFix) blockers.push("controller.self-fix-missing");
  if (selfFix && compact(selfFix.fields.status).toUpperCase() !== "SELF_FIX_APPLIED") {
    blockers.push("controller.self-fix-not-applied");
  }
  if (!workerReported) blockers.push("worker.reported-missing");
  const workerState = compact(workerReported?.fields?.state).toUpperCase();
  if (workerReported && !["TIMEOUT", "RUNTIME_ERROR", "NEEDS_HUMAN"].includes(workerState)) {
    warnings.push(`worker.state-unexpected:${workerState || "missing"}`);
  }
  const streamHealth = compact(workerReported?.fields?.stream_health).toUpperCase();
  if (streamHealth && streamHealth !== "PASS") blockers.push("worker.stream-health-not-pass");
  const outOfScope = Number.parseInt(compact(workerReported?.fields?.out_of_scope_change_count || "0"), 10);
  if (Number.isFinite(outOfScope) && outOfScope > 0) blockers.push("worker.out-of-scope-changes");
  if (!declaredCommit) blockers.push("self-fix.commit-missing");
  if (declaredCommit && !commitReachable) blockers.push("self-fix.commit-not-reachable");
  if (declaredCommit && !pushedToMain) blockers.push("self-fix.commit-not-on-main");
  for (const gate of normalizedGates) {
    if (!gate.command) blockers.push("gate.command-missing");
    if (!gate.ok) blockers.push(`gate.failed:${gate.command || "unknown"}`);
  }

  return {
    version: SELF_FIX_ACCEPTANCE_VERSION,
    work_item: compact(workItem),
    generated_at: now.toISOString(),
    status: blockers.length ? "REJECT" : "ACCEPTED",
    accepted: blockers.length === 0,
    commit: declaredCommit,
    evidence: {
      self_fix_comment_id: selfFix?.comment_id || null,
      worker_reported_comment_id: workerReported?.comment_id || null,
      worker_state: workerState || null,
      stream_health: streamHealth || null,
      commit_reachable: Boolean(commitReachable),
      pushed_to_main: Boolean(pushedToMain),
      report_path: compact(reportPath) || null,
      forbidden_actions_still_forbidden: asArray(forbiddenActions).map(compact).filter(Boolean),
    },
    gates: normalizedGates,
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
  };
}

export function renderSelfFixAcceptanceMarkdown(result) {
  return [
    `# Controller Self-Fix Acceptance - ${result.work_item || "unknown"}`,
    "",
    `Version: ${result.version}`,
    `Generated: ${result.generated_at}`,
    `Status: ${result.status}`,
    "",
    "## Evidence",
    "",
    `- Commit: ${result.commit || "missing"}`,
    `- Self-fix comment: ${result.evidence.self_fix_comment_id || "missing"}`,
    `- Worker reported: ${result.evidence.worker_reported_comment_id || "missing"}`,
    `- Worker state: ${result.evidence.worker_state || "missing"}`,
    `- Stream health: ${result.evidence.stream_health || "missing"}`,
    `- Commit reachable: ${result.evidence.commit_reachable}`,
    `- Pushed to main: ${result.evidence.pushed_to_main}`,
    `- Report path: ${result.evidence.report_path || "missing"}`,
    "",
    "## Gates",
    "",
    "| Gate | Result | Notes |",
    "|---|---:|---|",
    ...result.gates.map((gate) => `| \`${gate.command || "missing"}\` | ${gate.ok ? "PASS" : "FAIL"} | ${gate.output || ""} |`),
    "",
    "## Forbidden Actions Still Forbidden",
    "",
    result.evidence.forbidden_actions_still_forbidden.length
      ? result.evidence.forbidden_actions_still_forbidden.map((action) => `- ${action}`).join("\n")
      : "- none declared",
    "",
    "## Blockers",
    "",
    result.blockers.length ? result.blockers.map((blocker) => `- ${blocker}`).join("\n") : "- none",
    "",
    "## Warnings",
    "",
    result.warnings.length ? result.warnings.map((warning) => `- ${warning}`).join("\n") : "- none",
    "",
    "## Policy",
    "",
    "This acceptance does not claim a retroactive CAO PASS or Worker PASS. It records a separate Controller acceptance path for bounded cases where a worker produced useful scoped work but runtime mechanics ended non-PASS, Codex applied a scoped self-fix, and deterministic gates passed after the pushed commit.",
    "",
  ].join("\n");
}

export function writeSelfFixAcceptance({ workspaceRoot = process.cwd(), result, reportPath }) {
  const root = path.resolve(workspaceRoot);
  const target = reportPath
    ? path.resolve(root, reportPath)
    : path.join(root, "reports", "runs", `${String(result.work_item || "unknown").toUpperCase()}-controller-self-fix-acceptance.md`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, renderSelfFixAcceptanceMarkdown(result));
  return target;
}
