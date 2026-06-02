import fs from "node:fs";
import path from "node:path";

import { extractContractBlock, validateContract } from "../orchestration/worker-ledger-validator.mjs";
import {
  canonicalDescriptionHash,
  parseYamlScalar,
  stripHtml,
} from "../orchestration/plane-html.mjs";
import { classifySynthesisChild } from "./goal-synthesis-core.mjs";

export const SUPERGOAL_PLANNER_VERSION = "supergoal-planner/v0";

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

function localIsoDate(now = new Date()) {
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function parentIdOf(item) {
  if (!item || typeof item !== "object") return "";
  if (typeof item.parent === "string") return item.parent;
  if (item.parent && typeof item.parent === "object") return compact(item.parent.id);
  return "";
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
  return values.some((value) => ["done", "completed", "complete", "cancelled", "canceled"].includes(value));
}

function roleLabelForItem(item) {
  return (item?.labels || []).find((label) => compact(label).startsWith("role:")) || "";
}

function descriptionOf(item) {
  const htmlDescription = stripHtml(item?.description_html || "");
  if (htmlDescription && extractContractBlock(htmlDescription).ok) return htmlDescription;
  return stripHtml(item?.description_stripped || item?.description || item?.description_html || "");
}

function commentText(row) {
  return stripHtml(row?.comment_html || row?.body || row?.comment_stripped || row?.text || "");
}

function commentTimestamp(row) {
  const ts = Date.parse(row?.created_at || row?.updated_at || "");
  return Number.isFinite(ts) ? ts : 0;
}

function latestContractReviewForDescription({ item, comments = [] } = {}) {
  const currentHash = canonicalDescriptionHash(item || "");
  let best = null;
  for (const comment of comments || []) {
    const body = commentText(comment);
    if (!body.includes("controller.contract-review")) continue;
    const match = body.match(/controller\.contract-review:\s*\n([\s\S]*?)(?:\n\S|$)/);
    if (!match) continue;
    const fields = parseYamlScalar(match[1]);
    if (fields.description_hash !== currentHash) continue;
    const ts = commentTimestamp(comment);
    if (!best || ts >= best.ts) best = { comment_id: comment?.id || null, ts, fields };
  }
  return best;
}

function contractReviewReasonCodes(review) {
  if (!review) return [];
  const verdict = compact(review.fields?.verdict).toUpperCase();
  if (verdict && verdict !== "CONTRACT_PASS") return ["contract-review.not-pass"];
  return [];
}

function isSuperseded(item) {
  return /^\s*\[SUPERSEDED/i.test(compact(item?.name));
}

function normalizeHumanGate(value) {
  return compact(value).match(/\bHG-(?:0|1|2(?:\.5)?|3(?:\.5)?|4)\b/i)?.[0]?.toUpperCase() || "";
}

function gateClass(humanGate) {
  const gate = normalizeHumanGate(humanGate);
  if (gate === "HG-4") return "founder";
  if (gate === "HG-3.5") return "founder_proxy";
  if (gate === "HG-2.5" || gate === "HG-3") return "ceo_codex";
  return "local";
}

function modelRouteFor(row) {
  const text = [
    row.ref,
    row.name,
    row.mode,
    row.human_gate,
  ].join(" ").toLowerCase();
  const heavy = /\b(reconcile|security|privacy|consent|mcp|oauth|auth|broker|care|ledger|cross|architecture|public|external|cao|hg-3|hg-4)\b/.test(text);
  if (row.agent === "codex") {
    return {
      runtime: "codex",
      model_class: heavy ? "gpt-5.5-xhigh-controller" : "gpt-5.5-controller",
      effort: heavy ? "xhigh" : "high",
      reason: heavy ? "controller/high-context-or-gated-work" : "contract-agent-codex",
    };
  }
  if (heavy) {
    return {
      runtime: "claude",
      model_class: "opus-4.8-1m-max",
      effort: "max",
      reason: "high-context-or-gated-worker",
    };
  }
  return {
    runtime: row.agent || "claude",
    model_class: "opus-4.8-high",
    effort: "high",
    reason: "bounded-child-worker",
  };
}

function buildChildIndex(items) {
  const byParent = new Map();
  for (const item of items || []) {
    const parentId = parentIdOf(item);
    if (!parentId) continue;
    if (!byParent.has(parentId)) byParent.set(parentId, []);
    byParent.get(parentId).push(item);
  }
  for (const children of byParent.values()) {
    children.sort((a, b) => sequenceSortValue(a) - sequenceSortValue(b) || compact(a.name).localeCompare(compact(b.name)));
  }
  return byParent;
}

function collectDescendants(root, items) {
  const byParent = buildChildIndex(items);
  const rows = [];
  const queue = (byParent.get(root?.id) || []).map((item) => ({ item, depth: 1 }));
  const seen = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!current?.item?.id || seen.has(current.item.id)) continue;
    seen.add(current.item.id);
    rows.push(current);
    for (const child of byParent.get(current.item.id) || []) {
      queue.push({ item: child, depth: current.depth + 1 });
    }
  }
  return { rows, byParent };
}

function summarizeRow({ item, depth, byParent, byId, commentsByItemId, projectIdentifier }) {
  const parentId = parentIdOf(item);
  const parent = parentId ? byId.get(parentId) : null;
  const children = byParent.get(item.id) || [];
  const description = descriptionOf(item);
  const extracted = extractContractBlock(description);
  const parentRoleLabel = roleLabelForItem(parent);
  const contract = validateContract({
    description,
    labels: item.labels || [],
    parentRoleLabel,
  });
  const fields = extracted.ok ? extracted.fields : {};
  const synthesis = classifySynthesisChild({
    item,
    comments: asArray(commentsByItemId?.[item.id]),
    projectIdentifier,
  });
  const contractReview = latestContractReviewForDescription({
    item,
    comments: asArray(commentsByItemId?.[item.id]),
  });
  const humanGate = normalizeHumanGate(fields.human_gate) || null;
  const done = isDoneState(item) || synthesis.complete;
  const superseded = isSuperseded(item);
  const leaf = children.length === 0;
  const reasonCodes = Array.from(new Set([
    ...(contract.reason_codes || []),
    ...contractReviewReasonCodes(contractReview),
    ...(superseded ? ["supergoal.superseded"] : []),
    ...(!leaf ? ["supergoal.parent-has-children"] : []),
    ...(done ? ["supergoal.complete"] : []),
  ]));

  const row = {
    id: compact(item.id) || null,
    sequence_id: item.sequence_id ?? null,
    ref: sequenceRef(item, projectIdentifier),
    name: compact(item.name),
    parent_ref: parent ? sequenceRef(parent, projectIdentifier) : null,
    depth,
    children_count: children.length,
    leaf,
    superseded,
    state: stateNameOf(item) || null,
    state_group: stateGroupOf(item) || null,
    role: compact(fields.role) || roleLabelForItem(item) || null,
    parent_seat: compact(fields.parent_seat) || parentRoleLabel || null,
    agent: compact(fields.agent) || null,
    mode: compact(fields.mode) || null,
    workspace: compact(fields.workspace) || null,
    dispatch: compact(fields.dispatch) || null,
    human_gate: humanGate,
    gate_class: gateClass(humanGate),
    contract_ok: contract.ok === true,
    reason_codes: reasonCodes,
    integration_status: synthesis.integration_status,
    complete: done,
    worker_reported: synthesis.worker_reported,
    cao_verdict: synthesis.cao_verdict,
    controller_decision: synthesis.controller_decision,
    blockers: [
      ...synthesis.blockers,
      ...contractReviewReasonCodes(contractReview),
    ],
  };
  return { ...row, model_route: modelRouteFor(row) };
}

function buildPasses(selected, maxPerPass, windowHours) {
  const max = Math.max(1, Number.parseInt(maxPerPass, 10) || 1);
  const passes = [];
  for (let index = 0; index < selected.length; index += max) {
    const batch = selected.slice(index, index + max);
    passes.push({
      pass: passes.length + 1,
      window_hours: Number(windowHours) || 24,
      selected_refs: batch.map((item) => item.ref),
      stop_on: ["BLOCKED_*", "NEEDS_HUMAN", "TIMEOUT", "RUNTIME_ERROR", "REJECT"],
    });
  }
  return passes;
}

function stage05SortValue(row) {
  const text = `${row.ref} ${row.name}`.toLowerCase();
  if (/\breconcile\b/.test(text)) return 0;
  return 1;
}

function isRuntimeDispatchable(row) {
  if (!row.leaf || !row.contract_ok || row.superseded) return false;
  if (!row.worker_reported) {
    return row.blockers.every((blocker) => blocker === "worker.reported-missing");
  }
  return row.blockers.length === 0;
}

export function buildSupergoalPlan({
  root,
  items = [],
  commentsByItemId = {},
  projectIdentifier = "COMPA",
  maxChildren = 1,
  windowHours = 24,
  includeSuperseded = false,
  now = new Date(),
} = {}) {
  const max = Math.max(1, Number.parseInt(maxChildren, 10) || 1);
  if (!root) {
    return {
      version: SUPERGOAL_PLANNER_VERSION,
      generated_at: now.toISOString(),
      ok: false,
      status: "BLOCKED_DEPENDENCY",
      reason_codes: ["parent.not-found"],
      root: null,
      selected: [],
      planned_passes: [],
      next_action: "Resolve the supergoal parent reference before planning multi-child execution.",
    };
  }

  const byId = new Map((items || []).map((item) => [item.id, item]).filter(([id]) => id));
  const { rows: descendants, byParent } = collectDescendants(root, items);
  const allRows = descendants
    .map((entry) => summarizeRow({
      ...entry,
      byParent,
      byId,
      commentsByItemId,
      projectIdentifier,
    }))
    .sort((a, b) => sequenceSortValue(a) - sequenceSortValue(b) || a.name.localeCompare(b.name));
  const activeRows = includeSuperseded ? allRows : allRows.filter((row) => !row.superseded);
  const incomplete = activeRows.filter((row) => !row.complete);
  const dispatchable = incomplete.filter(isRuntimeDispatchable);
  const stage05Candidates = incomplete
    .filter((row) => row.leaf && !row.superseded && row.reason_codes.length === 1 && row.reason_codes[0] === "contract.dispatch-not-ready")
    .sort((a, b) => stage05SortValue(a) - stage05SortValue(b) || sequenceSortValue(a) - sequenceSortValue(b) || a.name.localeCompare(b.name));
  const founderQueue = dispatchable.filter((row) => row.gate_class === "founder");
  const founderProxyQueue = dispatchable.filter((row) => row.gate_class === "founder_proxy");
  const ceoQueue = dispatchable.filter((row) => row.gate_class === "ceo_codex");
  const localQueue = dispatchable.filter((row) => row.gate_class === "local");
  const runnable = [...localQueue, ...ceoQueue];
  const selected = runnable.slice(0, max);
  const queued = runnable.slice(max);
  const stage05Selected = selected.length ? [] : stage05Candidates.slice(0, max);
  const stage05Queue = stage05Candidates.slice(stage05Selected.length);
  const blocked = incomplete.filter((row) => !dispatchable.includes(row) && !stage05Candidates.includes(row));
  const completeRows = activeRows.filter((row) => row.complete);

  let status = "READY_FOR_CONTROLLER_LOOP";
  let reasonCodes = [];
  let nextAction = "Run Stage 0.5/0.6 and runtime adapter for the selected child only; do not spawn broad parent execution.";
  if (!activeRows.length) {
    status = "BLOCKED_DEPENDENCY";
    reasonCodes = ["child.none-found"];
    nextAction = "Create or materialize child contracts before running supergoal planning.";
  } else if (!incomplete.length) {
    status = "COMPLETE";
    reasonCodes = ["child.all-complete"];
    nextAction = "Run supergoal synthesis and parent completion review; workers and CAO still must not set Done.";
  } else if (!selected.length && stage05Selected.length) {
    status = "READY_FOR_STAGE_05_REVIEW";
    reasonCodes = ["contract.dispatch-not-ready"];
    nextAction = "Run Stage 0.5/0.6 contract review for the selected manual contracts; flip only reviewed children to dispatch: ready.";
  } else if (!selected.length && founderQueue.length) {
    status = "NEEDS_HUMAN";
    reasonCodes = ["hg4.founder-queue"];
    nextAction = "Batch the Founder decision cards before any HG-4 work proceeds.";
  } else if (!selected.length && founderProxyQueue.length) {
    status = "NEEDS_HG35_REVIEW";
    reasonCodes = ["hg35.proxy-review-queue"];
    nextAction = "Route HG-3.5 items to Chief-of-Staff / Founder-proxy review before worker dispatch.";
  } else if (!selected.length) {
    status = "BLOCKED_DEPENDENCY";
    reasonCodes = Array.from(new Set(blocked.flatMap((row) => [
      ...(row.reason_codes || []),
      ...(row.blockers || []),
    ]))).filter(Boolean);
    if (!reasonCodes.length) reasonCodes = ["child.no-runnable-candidates"];
    nextAction = "Resolve blocked contracts, parent container dependencies or dispatch state before the next pass.";
  }

  return {
    version: SUPERGOAL_PLANNER_VERSION,
    generated_at: now.toISOString(),
    ok: true,
    status,
    reason_codes: reasonCodes,
    root: {
      id: compact(root.id) || null,
      ref: sequenceRef(root, projectIdentifier),
      name: compact(root.name),
      state: stateNameOf(root) || null,
      state_group: stateGroupOf(root) || null,
    },
    policy: {
      max_children_per_pass: max,
      window_hours: Number(windowHours) || 24,
      hg2_hg25_hg3_authority: "CEO/Codex controller packet required; Founder not requested by default.",
      hg35_authority: "Chief-of-Staff / Founder-proxy review packet.",
      hg4_authority: "Founder decision card; never auto-resolve.",
      done_authority: "CEO/Codex or Founder only under HumanGate policy; workers and CAO never set Done.",
    },
    summary: {
      descendants_total: allRows.length,
      active_total: activeRows.length,
      complete: completeRows.length,
      runnable: runnable.length,
      selected: selected.length,
      queued: queued.length,
      stage05_selected: stage05Selected.length,
      stage05_queue: stage05Queue.length,
      blocked: blocked.length,
      hg35_queue: founderProxyQueue.length,
      hg4_queue: founderQueue.length,
      superseded: allRows.filter((row) => row.superseded).length,
      parent_containers: activeRows.filter((row) => !row.leaf).length,
      projected_min_passes: runnable.length ? Math.ceil(runnable.length / max) : 0,
    },
    selected,
    queued,
    stage05_selected: stage05Selected,
    stage05_queue: stage05Queue,
    blocked,
    hg35_queue: founderProxyQueue,
    hg4_queue: founderQueue,
    complete: completeRows,
    parent_containers: activeRows.filter((row) => !row.leaf),
    planned_passes: buildPasses(selected.length ? selected : stage05Selected, max, windowHours).map((pass) => ({
      ...pass,
      stage: selected.length ? "worker-runtime" : "stage-05-contract-review",
    })),
    next_action: nextAction,
    guarantees: [
      "dry-run planner only",
      "no worker spawned",
      "no Plane state transition",
      "no Plane Done transition",
      "HG-4 becomes Founder queue, not automatic work",
      "HG-2.5/HG-3 require CEO/Codex release evidence before mutation or release",
    ],
  };
}

export function renderSupergoalPlanMarkdown(plan) {
  const row = (item) => `| ${item.ref} | ${item.name} | ${item.human_gate || ""} | ${item.gate_class || ""} | ${item.model_route?.model_class || ""} | ${item.model_route?.effort || ""} | ${item.reason_codes?.join(", ") || ""} |`;
  return [
    `# Supergoal Plan - ${plan.root?.ref || "unknown"}`,
    "",
    `Status: ${plan.status}`,
    `Version: ${plan.version}`,
    `Generated: ${plan.generated_at}`,
    "",
    "## Policy",
    "",
    `- Max children per pass: ${plan.policy?.max_children_per_pass ?? ""}`,
    `- HG-2.5/HG-3: ${plan.policy?.hg2_hg25_hg3_authority || ""}`,
    `- HG-3.5: ${plan.policy?.hg35_authority || ""}`,
    `- HG-4: ${plan.policy?.hg4_authority || ""}`,
    `- Done: ${plan.policy?.done_authority || ""}`,
    "",
    "## Summary",
    "",
    "```json",
    JSON.stringify(plan.summary || {}, null, 2),
    "```",
    "",
    "## Selected Next Pass",
    "",
    "| Ref | Name | HumanGate | Gate Class | Model Route | Effort | Reason Codes |",
    "|---|---|---|---|---|---|---|",
    ...(plan.selected || []).map(row),
    ...(plan.selected?.length ? [] : ["| - | No selected child | - | - | - | - | - |"]),
    "",
    "## Stage 0.5 Candidates",
    "",
    "| Ref | Name | HumanGate | Gate Class | Model Route | Effort | Reason Codes |",
    "|---|---|---|---|---|---|---|",
    ...(plan.stage05_selected || []).map(row),
    ...(plan.stage05_selected?.length ? [] : ["| - | No Stage 0.5 candidates selected | - | - | - | - | - |"]),
    "",
    "## HG-4 Founder Queue",
    "",
    "| Ref | Name | HumanGate | Gate Class | Model Route | Effort | Reason Codes |",
    "|---|---|---|---|---|---|---|",
    ...(plan.hg4_queue || []).map(row),
    ...(plan.hg4_queue?.length ? [] : ["| - | No HG-4 items ready | - | - | - | - | - |"]),
    "",
    "## Blocked",
    "",
    "| Ref | Name | HumanGate | Gate Class | Model Route | Effort | Reason Codes |",
    "|---|---|---|---|---|---|---|",
    ...(plan.blocked || []).slice(0, 50).map(row),
    ...(plan.blocked?.length ? [] : ["| - | No blocked items | - | - | - | - | - |"]),
    "",
    "## Next Action",
    "",
    plan.next_action || "",
    "",
  ].join("\n");
}

export function writeSupergoalPlan({ workspaceRoot = process.cwd(), plan }) {
  const date = localIsoDate(plan.generated_at ? new Date(plan.generated_at) : new Date());
  const ref = compact(plan.root?.ref).toLowerCase() || "unknown";
  const root = path.resolve(workspaceRoot);
  const reportPath = path.join(root, "reports", "goals", date, `${ref}-supergoal.md`);
  const jsonPath = path.join(root, "reports", "goals", date, `${ref}-supergoal.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, renderSupergoalPlanMarkdown(plan));
  fs.writeFileSync(jsonPath, `${JSON.stringify(plan, null, 2)}\n`);
  return { reportPath, jsonPath };
}
