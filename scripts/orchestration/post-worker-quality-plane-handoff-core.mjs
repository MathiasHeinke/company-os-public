import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_POST_WORKER_QUALITY_REGISTRY_PATH,
  loadPostWorkerQualityRegistry,
} from "./post-worker-quality-loop-core.mjs";
import {
  POST_WORKER_QUALITY_SCHEDULER_VERSION,
  buildLowerWorkerDispatchFromMarker,
} from "./post-worker-quality-scheduler-core.mjs";
import {
  canonicalDescriptionText,
  stripHtml,
} from "./plane-html.mjs";
import {
  extractContractBlock,
  validateContract,
} from "./worker-ledger-validator.mjs";

export const POST_WORKER_QUALITY_PLANE_HANDOFF_VERSION = "post-worker-quality-plane-handoff/v0";
export const POST_WORKER_QUALITY_CANDIDATE_MARKER = "scheduler.lower-worker-candidate";
export const QUALITY_CONTROLLER_MARKERS = Object.freeze([
  "controller.audit-followup",
  "controller.hotfix-request",
]);

export const PLANE_HANDOFF_REASONS = Object.freeze({
  PARENT_CONTRACT_MISSING: "quality-plane-handoff.parent-contract-missing",
  PARENT_CONTRACT_INVALID: "quality-plane-handoff.parent-contract-invalid",
});

function compact(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function labelName(label) {
  if (!label) return "";
  if (typeof label === "string") return label;
  return compact(label.name || label.slug || label.id);
}

export function sequenceRef(workItem = {}, projectIdentifier = "COMPA") {
  const direct = compact(workItem.ref || workItem.sequence || workItem.sequence_id);
  if (!direct) return compact(workItem.id || "unknown");
  if (/^[A-Z][A-Z0-9]+-\d+$/i.test(direct)) return direct.toUpperCase();
  if (/^\d+$/.test(direct)) return `${projectIdentifier || "COMPA"}-${direct}`;
  return direct;
}

export function normalizePlaneComment(comment = {}) {
  const body = stripHtml(
    comment.body
      || comment.comment_html
      || comment.comment_stripped
      || comment.description_html
      || comment.text
      || "",
  );
  return {
    id: comment.id || null,
    created_at: comment.created_at || null,
    updated_at: comment.updated_at || null,
    body,
  };
}

export function hasQualityControllerMarker(comments = []) {
  return asArray(comments).some((comment) => {
    const body = normalizePlaneComment(comment).body;
    return QUALITY_CONTROLLER_MARKERS.some((marker) => body.includes(marker));
  });
}

export function parentContractFromWorkItem(workItem = {}) {
  const description = canonicalDescriptionText(workItem);
  const labels = asArray(workItem.labels).map(labelName).filter(Boolean);
  const extracted = extractContractBlock(description);
  if (!extracted.ok) {
    return {
      ok: false,
      status: "BLOCKED",
      reason_codes: [PLANE_HANDOFF_REASONS.PARENT_CONTRACT_MISSING],
      description_present: Boolean(description),
      labels,
      fields: {},
    };
  }
  const validation = validateContract({ description, labels });
  if (!validation.ok) {
    return {
      ok: false,
      status: "BLOCKED",
      reason_codes: [PLANE_HANDOFF_REASONS.PARENT_CONTRACT_INVALID],
      validation,
      labels,
      fields: extracted.fields,
    };
  }
  return {
    ok: true,
    status: "READY",
    reason_codes: [],
    validation,
    labels,
    fields: extracted.fields,
  };
}

export function buildPlaneQualityProjectScan({
  registry,
  workItems = [],
  commentsByWorkItemId = {},
  workspaceRoot = process.cwd(),
  projectIdentifier = "COMPA",
  now = new Date(),
} = {}) {
  const results = [];
  const skippedNoMarker = [];
  for (const workItem of asArray(workItems)) {
    const comments = asArray(commentsByWorkItemId[workItem.id]);
    if (!hasQualityControllerMarker(comments)) {
      skippedNoMarker.push({
        id: workItem.id || null,
        ref: sequenceRef(workItem, projectIdentifier),
        name: workItem.name || null,
        comments_read: comments.length,
      });
      continue;
    }
    results.push(buildPlaneQualitySchedulerHandoff({
      registry,
      workItem,
      comments,
      workspaceRoot,
      projectIdentifier,
      now,
    }));
  }

  const candidates = results.filter((result) => result.status === "LOWER_WORKER_READY");
  const blocked = results.filter((result) => result.status === "BLOCKED");
  const noSpawn = results.filter((result) => result.status === "NO_SPAWN");
  return {
    ok: true,
    version: POST_WORKER_QUALITY_PLANE_HANDOFF_VERSION,
    scheduler_version: POST_WORKER_QUALITY_SCHEDULER_VERSION,
    status: candidates.length ? "CANDIDATES_READY" : "NO_CANDIDATES",
    generated_at: now.toISOString(),
    scanned_items: asArray(workItems).length,
    marked_items: results.length,
    skipped_no_marker: skippedNoMarker.length,
    candidate_count: candidates.length,
    blocked_count: blocked.length,
    no_spawn_count: noSpawn.length,
    candidates,
    blocked,
    no_spawn: noSpawn,
    skipped_no_marker_sample: skippedNoMarker.slice(0, 10),
  };
}

export function buildPlaneQualitySchedulerHandoff({
  registry,
  workItem = {},
  comments = [],
  workspaceRoot = process.cwd(),
  projectIdentifier = "COMPA",
  now = new Date(),
} = {}) {
  const parentContract = parentContractFromWorkItem(workItem);
  const ref = sequenceRef(workItem, projectIdentifier);
  const normalizedComments = asArray(comments).map(normalizePlaneComment);

  if (!parentContract.ok) {
    return {
      ok: false,
      version: POST_WORKER_QUALITY_PLANE_HANDOFF_VERSION,
      scheduler_version: POST_WORKER_QUALITY_SCHEDULER_VERSION,
      status: "BLOCKED",
      generated_at: now.toISOString(),
      reason_codes: parentContract.reason_codes,
      work_item: {
        id: workItem.id || null,
        ref,
        name: workItem.name || null,
      },
      comments_read: normalizedComments.length,
      parent_contract: parentContract,
      scheduler_result: null,
    };
  }

  const schedulerResult = buildLowerWorkerDispatchFromMarker({
    registry,
    comments: normalizedComments,
    parentContractFields: parentContract.fields,
    workItem: { ...workItem, ref },
    workspaceRoot,
    now,
  });

  return {
    ok: schedulerResult.ok,
    version: POST_WORKER_QUALITY_PLANE_HANDOFF_VERSION,
    scheduler_version: POST_WORKER_QUALITY_SCHEDULER_VERSION,
    status: schedulerResult.status,
    generated_at: now.toISOString(),
    reason_codes: schedulerResult.reason_codes || [],
    work_item: {
      id: workItem.id || null,
      ref,
      name: workItem.name || null,
    },
    comments_read: normalizedComments.length,
    parent_contract: {
      ok: parentContract.ok,
      labels: parentContract.labels,
      field_keys: Object.keys(parentContract.fields || {}).sort(),
      validation: parentContract.validation,
    },
    marker: schedulerResult.marker || null,
    worker_class: schedulerResult.worker_class || null,
    worker_contract: schedulerResult.worker_contract || null,
    worker_contract_markdown: schedulerResult.worker_contract_markdown || "",
    scheduler: schedulerResult.scheduler || null,
  };
}

export function renderPlaneCandidateMarkdown(result = {}) {
  const lines = [
    `# ${POST_WORKER_QUALITY_CANDIDATE_MARKER}`,
    "",
    "```yaml",
    `${POST_WORKER_QUALITY_CANDIDATE_MARKER}:`,
    `  version: ${POST_WORKER_QUALITY_PLANE_HANDOFF_VERSION}`,
    `  scheduler_version: ${result.scheduler_version || POST_WORKER_QUALITY_SCHEDULER_VERSION}`,
    `  work_item: ${result.work_item?.ref || "unknown"}`,
    `  work_item_id: ${result.work_item?.id || "unknown"}`,
    `  status: ${result.status || "UNKNOWN"}`,
    `  worker_class: ${result.worker_class || "none"}`,
    `  marker_comment_id: ${result.marker?.comment_id || "none"}`,
    `  writes_or_spawns: false`,
    `  scheduler_may_spawn_next_lower_worker: ${result.status === "LOWER_WORKER_READY"}`,
    `  next_gate: Stage 0.5 / Stage 0.65 / CapabilityProfile / HumanGate`,
    "  reason_codes:",
    ...asArray(result.reason_codes).map((reason) => `    - ${reason}`),
    "```",
    "",
  ];

  if (result.status === "LOWER_WORKER_READY" && result.worker_contract_markdown) {
    lines.push(
      "## Generated Lower-Worker Contract",
      "",
      result.worker_contract_markdown,
      "",
      "This is a candidate only. Runtime Dispatcher may consume it only after normal controller, runtime, capability and HumanGate checks pass.",
    );
  } else {
    lines.push(
      "## No Candidate Spawn",
      "",
      `Status: ${result.status || "UNKNOWN"}`,
      asArray(result.reason_codes).length ? `Reason codes: ${asArray(result.reason_codes).join(", ")}` : "Reason codes: none",
    );
  }

  return lines.join("\n");
}

export function findExistingCandidateComment(comments = [], result = {}) {
  const markerCommentId = compact(result.marker?.comment_id);
  const workerClass = compact(result.worker_class);
  if (!markerCommentId || !workerClass) return null;
  for (const comment of asArray(comments).map(normalizePlaneComment)) {
    if (!comment.body.includes(POST_WORKER_QUALITY_CANDIDATE_MARKER)) continue;
    if (!comment.body.includes(`marker_comment_id: ${markerCommentId}`)) continue;
    if (!comment.body.includes(`worker_class: ${workerClass}`)) continue;
    return {
      id: comment.id || null,
      created_at: comment.created_at || null,
      updated_at: comment.updated_at || null,
    };
  }
  return null;
}

export function writePlaneHandoffReport({
  result,
  workspaceRoot = process.cwd(),
  date = new Date().toISOString().slice(0, 10),
} = {}) {
  const ref = String(result?.work_item?.ref || "unknown").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const dir = path.join(path.resolve(workspaceRoot), "reports", "runs", date);
  fs.mkdirSync(dir, { recursive: true });
  const base = path.join(dir, `${ref}-quality-scheduler-handoff`);
  const markdown = `${base}.md`;
  const json = `${base}.json`;
  fs.writeFileSync(markdown, `${renderPlaneCandidateMarkdown(result)}\n`);
  fs.writeFileSync(json, `${JSON.stringify(result, null, 2)}\n`);
  return { markdown, json };
}

export function renderPlaneProjectScanMarkdown(scan = {}) {
  const lines = [
    "# Post-Worker Quality Plane Project Scan",
    "",
    `Status: ${scan.status || "UNKNOWN"}`,
    "",
    "| Metric | Value |",
    "|---|---:|",
    `| scanned_items | ${scan.scanned_items || 0} |`,
    `| marked_items | ${scan.marked_items || 0} |`,
    `| skipped_no_marker | ${scan.skipped_no_marker || 0} |`,
    `| candidate_count | ${scan.candidate_count || 0} |`,
    `| blocked_count | ${scan.blocked_count || 0} |`,
    `| no_spawn_count | ${scan.no_spawn_count || 0} |`,
    "",
    "## Candidates",
    "",
  ];

  if (!scan.candidates?.length) {
    lines.push("None.");
  } else {
    for (const candidate of scan.candidates) {
      lines.push(`- ${candidate.work_item?.ref || "unknown"}: ${candidate.worker_class || "unknown"} from ${candidate.marker?.marker || "marker"} (${candidate.marker?.comment_id || "no-comment-id"})`);
    }
  }

  lines.push("", "## Blocked Marked Items", "");
  if (!scan.blocked?.length) {
    lines.push("None.");
  } else {
    for (const blocked of scan.blocked) {
      lines.push(`- ${blocked.work_item?.ref || "unknown"}: ${(blocked.reason_codes || []).join(", ") || "blocked"}`);
    }
  }

  lines.push(
    "",
    "Boundary: this scan writes nothing, spawns nothing, locks nothing and marks no Plane item Done.",
  );
  return lines.join("\n");
}

export function writePlaneProjectScanReport({
  scan,
  workspaceRoot = process.cwd(),
  date = new Date().toISOString().slice(0, 10),
} = {}) {
  const dir = path.join(path.resolve(workspaceRoot), "reports", "runs", date);
  fs.mkdirSync(dir, { recursive: true });
  const base = path.join(dir, "project-quality-scheduler-scan");
  const markdown = `${base}.md`;
  const json = `${base}.json`;
  fs.writeFileSync(markdown, `${renderPlaneProjectScanMarkdown(scan)}\n`);
  fs.writeFileSync(json, `${JSON.stringify(scan, null, 2)}\n`);
  return { markdown, json };
}

export function loadDefaultQualityRegistry(registryPath = DEFAULT_POST_WORKER_QUALITY_REGISTRY_PATH) {
  return loadPostWorkerQualityRegistry(registryPath);
}
