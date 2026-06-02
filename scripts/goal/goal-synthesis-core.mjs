import fs from "node:fs";
import path from "node:path";

export const GOAL_SYNTHESIS_VERSION = "goal-synthesis/v0";

function compact(value) {
  return String(value || "").trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function sequenceRef(item, projectIdentifier = "COMPA") {
  const sequence = compact(item?.sequence_id);
  if (!sequence) return compact(item?.id) || compact(item?.name);
  if (/^[A-Z]+-\d+$/i.test(sequence)) return sequence.toUpperCase();
  return `${projectIdentifier}-${sequence}`;
}

function sequenceSortValue(item) {
  const ref = compact(item?.sequence_id || item?.ref);
  const match = ref.match(/(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function stateNameOf(item) {
  const state = item?.state;
  if (!state) return "";
  if (typeof state === "string") return state;
  if (typeof state === "object") return compact(state.name || state.group || state.id);
  return "";
}

function stateGroupOf(item) {
  const state = item?.state;
  if (!state || typeof state !== "object") return "";
  return compact(state.group || state.state_group || state.category);
}

function isDoneState(item) {
  const values = [stateNameOf(item), stateGroupOf(item)].map((value) => value.toLowerCase()).filter(Boolean);
  return values.some((value) => ["done", "completed", "complete"].includes(value));
}

function commentBody(row) {
  return compact(row?.body || row?.comment_stripped || row?.comment_html || row?.text);
}

function commentTimestamp(row) {
  const timestamp = Date.parse(row?.created_at || row?.updated_at || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function findLatestMarkerComment(comments = [], marker) {
  let best = null;
  for (const comment of comments || []) {
    const body = commentBody(comment);
    if (!body.includes(marker)) continue;
    const ts = commentTimestamp(comment);
    if (!best || ts >= best.ts) best = { comment, body, ts };
  }
  return best;
}

function escapeRegExp(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseMarkerFields(body, marker) {
  const markerBase = String(marker || "").replace(/:$/, "");
  const fields = {};
  const markerLine = new RegExp(`^${escapeRegExp(markerBase)}(?:\\s*\\([^)]*\\))?\\s*:?\\s*$`);
  const lines = String(body || "").split(/\r?\n/);
  let startIndex = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (markerLine.test(lines[index].trim())) startIndex = index;
  }
  if (startIndex === -1) return {};
  for (const raw of lines.slice(startIndex + 1)) {
    if (!raw.trim()) continue;
    const match = raw.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*?)\s*$/);
    if (match) fields[match[1].toLowerCase()] = match[2];
    else if (/^\S/.test(raw)) break;
  }
  return fields;
}

function latestMarker(comments, marker) {
  const latest = findLatestMarkerComment(comments, marker);
  if (!latest) return null;
  return {
    comment_id: latest.comment?.id || null,
    created_at: latest.comment?.created_at || null,
    body: latest.body,
    fields: parseMarkerFields(latest.body, marker),
  };
}

export function classifySynthesisChild({ item, comments = [], projectIdentifier = "COMPA" } = {}) {
  const workerReported = latestMarker(comments, "worker.reported:");
  const caoVerdict = latestMarker(comments, "controller.verdict:");
  const controllerDecision = latestMarker(comments, "controller.decision");
  const auditFollowup = latestMarker(comments, "controller.audit-followup");
  const selfFixAccepted = latestMarker(comments, "controller.self-fix-accepted");
  const done = isDoneState(item);
  const verdict = compact(caoVerdict?.fields?.verdict).toUpperCase();
  const decisionMode = compact(controllerDecision?.fields?.decision_mode || controllerDecision?.fields?.decision).toUpperCase();
  const selfFixVerdict = compact(selfFixAccepted?.fields?.verdict || selfFixAccepted?.fields?.status).toUpperCase();
  const auditText = [
    auditFollowup?.fields?.state,
    auditFollowup?.fields?.verdict,
    auditFollowup?.fields?.release_state,
    auditFollowup?.fields?.runtime_reason,
    auditFollowup?.fields?.reason,
    auditFollowup?.fields?.human_gate,
    auditFollowup?.fields?.human_gate_level,
  ].map(compact).join(" ");
  const ceoCriticalReview = Boolean(auditFollowup)
    && /(?:HG-?3|CEO_CRITICAL|COMMITTED_FOR_HG3_REVIEW)/i.test(auditText);
  const founderGateReview = Boolean(auditFollowup)
    && /(?:HG-?4|FOUNDER|NEEDS_HUMAN|COMMITTED_FOR_HG4_REVIEW)/i.test(auditText);

  let integrationStatus = "pending-worker";
  const blockers = [];
  if (done) integrationStatus = "done";
  else if (decisionMode === "AUTO-GO") integrationStatus = "controller:auto-go";
  else if (selfFixVerdict === "ACCEPTED") integrationStatus = "controller:self-fix-accepted";
  else if (founderGateReview) integrationStatus = "founder:review";
  else if (ceoCriticalReview) integrationStatus = "ceo:hg3-review";
  else if (decisionMode === "DELEGATE") integrationStatus = "controller:delegate";
  else if (decisionMode === "SELF-FIX") integrationStatus = "controller:self-fix";
  else if (decisionMode === "ASK-FOUNDER") integrationStatus = "ask-founder";
  else if (verdict === "PASS") integrationStatus = "ceo:review";
  else if (verdict === "REJECT") integrationStatus = "cao:reject";
  else if (verdict === "PARK") integrationStatus = "cao:park";
  else if (workerReported) integrationStatus = "cao-review";

  if (!workerReported && !done && selfFixVerdict !== "ACCEPTED") blockers.push("worker.reported-missing");
  if (workerReported && !caoVerdict && !done && !founderGateReview && !ceoCriticalReview && selfFixVerdict !== "ACCEPTED") blockers.push("cao.verdict-missing");
  if (ceoCriticalReview && !done && decisionMode !== "AUTO-GO" && selfFixVerdict !== "ACCEPTED") {
    blockers.push("ceo.hg3-review-required");
  }
  if (founderGateReview && !done && decisionMode !== "AUTO-GO" && selfFixVerdict !== "ACCEPTED") {
    blockers.push("founder.hg4-review-required");
  }
  if (verdict === "REJECT" && selfFixVerdict !== "ACCEPTED") blockers.push("cao.reject");
  if (verdict === "PARK" && selfFixVerdict !== "ACCEPTED") blockers.push("cao.park");
  if (verdict === "PASS" && !controllerDecision && !done && selfFixVerdict !== "ACCEPTED") {
    blockers.push("controller.decision-missing");
  }
  if (
    decisionMode === "DELEGATE"
    && !done
    && selfFixVerdict !== "ACCEPTED"
    && !ceoCriticalReview
    && !founderGateReview
  ) {
    blockers.push("controller.delegate-open");
  }
  if (decisionMode === "ASK-FOUNDER" && selfFixVerdict !== "ACCEPTED") blockers.push("founder-attention-required");

  return {
    id: compact(item?.id) || null,
    sequence_id: item?.sequence_id ?? null,
    ref: sequenceRef(item, projectIdentifier),
    name: compact(item?.name),
    state: stateNameOf(item) || null,
    state_group: stateGroupOf(item) || null,
    worker_reported: Boolean(workerReported),
    cao_verdict: verdict || null,
    controller_decision: decisionMode || null,
    integration_status: integrationStatus,
    blockers,
    evidence: {
      worker_reported_comment: workerReported?.comment_id || null,
      cao_verdict_comment: caoVerdict?.comment_id || null,
      controller_decision_comment: controllerDecision?.comment_id || null,
      audit_followup_comment: auditFollowup?.comment_id || null,
      self_fix_accepted_comment: selfFixAccepted?.comment_id || null,
    },
    complete: done || decisionMode === "AUTO-GO" || selfFixVerdict === "ACCEPTED",
  };
}

export function buildGoalSynthesis({
  parent,
  children = [],
  commentsByItemId = {},
  projectIdentifier = "COMPA",
  now = new Date(),
} = {}) {
  const childRows = (children || [])
    .map((item) => classifySynthesisChild({
      item,
      comments: asArray(commentsByItemId[item.id]),
      projectIdentifier,
    }))
    .sort((a, b) => sequenceSortValue(a) - sequenceSortValue(b) || a.name.localeCompare(b.name));
  const blockers = [];
  if (!parent) blockers.push("parent.not-found");
  if (!childRows.length) blockers.push("children.none-found");
  for (const child of childRows) {
    for (const blocker of child.blockers) blockers.push(`${child.ref}:${blocker}`);
  }
  const allChildrenComplete = childRows.length > 0 && childRows.every((child) => child.complete);
  const readyForDoneReview = Boolean(parent && allChildrenComplete && blockers.length === 0);
  const status = readyForDoneReview ? "READY_FOR_PARENT_COMPLETION_REVIEW" : "BLOCKED_DEPENDENCY";

  return {
    version: GOAL_SYNTHESIS_VERSION,
    generated_at: now.toISOString(),
    parent: parent ? {
      id: compact(parent.id) || null,
      ref: sequenceRef(parent, projectIdentifier),
      name: compact(parent.name),
      state: stateNameOf(parent) || null,
      state_group: stateGroupOf(parent) || null,
    } : null,
    status,
    ready_for_done_review: readyForDoneReview,
    done_authority: "CEO/Codex via HG-2.5/HG-3 or Founder via HG-4 only; CAO and workers never set Done.",
    child_count: childRows.length,
    complete_children: childRows.filter((child) => child.complete).length,
    children: childRows,
    blockers: Array.from(new Set(blockers)),
    required_next_action: readyForDoneReview
      ? "Run CAO parent synthesis audit, then Codex Controller parent completion review. Do not transition Done without HG authority."
      : "Finish or unblock all child items before parent completion review.",
  };
}

export function renderGoalSynthesisMarkdown(synthesis) {
  return [
    `# Goal Synthesis - ${synthesis.parent?.ref || "unknown"}`,
    "",
    `Status: ${synthesis.status}`,
    `Version: ${synthesis.version}`,
    `Generated: ${synthesis.generated_at}`,
    "",
    "## Parent",
    "",
    `- Ref: ${synthesis.parent?.ref || "missing"}`,
    `- Name: ${synthesis.parent?.name || ""}`,
    `- State: ${synthesis.parent?.state || ""}`,
    "",
    "## Completion Policy",
    "",
    `- Ready for Done review: ${synthesis.ready_for_done_review}`,
    `- Done authority: ${synthesis.done_authority}`,
    `- Required next action: ${synthesis.required_next_action}`,
    "",
    "## Children",
    "",
    "| Child | Status | Worker | CAO | Controller | Blockers |",
    "|---|---|---:|---|---|---|",
    ...synthesis.children.map((child) => `| ${child.ref} ${child.name} | ${child.integration_status} | ${child.worker_reported ? "yes" : "no"} | ${child.cao_verdict || ""} | ${child.controller_decision || ""} | ${child.blockers.join(", ") || "none"} |`),
    "",
    "## Blockers",
    "",
    synthesis.blockers.length ? synthesis.blockers.map((blocker) => `- ${blocker}`).join("\n") : "- none",
    "",
  ].join("\n");
}

export function writeGoalSynthesis({ workspaceRoot = process.cwd(), synthesis }) {
  const root = path.resolve(workspaceRoot);
  const parentRef = synthesis.parent?.ref || "unknown-parent";
  const date = synthesis.generated_at.slice(0, 10);
  const reportPath = path.join(root, "reports", "goals", date, `${parentRef.toLowerCase()}-synthesis.md`);
  const jsonPath = path.join(root, "reports", "goals", date, `${parentRef.toLowerCase()}-synthesis.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, renderGoalSynthesisMarkdown(synthesis));
  fs.writeFileSync(jsonPath, `${JSON.stringify(synthesis, null, 2)}\n`);
  return { reportPath, jsonPath };
}
