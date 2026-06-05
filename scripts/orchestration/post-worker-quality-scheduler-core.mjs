import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_POST_WORKER_QUALITY_REGISTRY_PATH,
  POST_WORKER_QUALITY_LOOP_VERSION,
  loadPostWorkerQualityRegistry,
  validatePostWorkerQualityRegistry,
} from "./post-worker-quality-loop-core.mjs";

export const POST_WORKER_QUALITY_SCHEDULER_VERSION = "post-worker-quality-scheduler/v0";

export const QUALITY_SCHEDULER_REASONS = Object.freeze({
  REGISTRY_INVALID: "quality-scheduler.registry-invalid",
  MARKER_MISSING: "quality-scheduler.marker-missing",
  MARKER_UNKNOWN: "quality-scheduler.marker-unknown",
  WORKER_CLASS_MISSING: "quality-scheduler.worker-class-missing",
  WORKER_CLASS_UNKNOWN: "quality-scheduler.worker-class-unknown",
  CONTROLLER_ONLY: "quality-scheduler.controller-only",
  MARKER_TERMINAL: "quality-scheduler.marker-terminal",
  HOTFIX_LIMIT: "quality-scheduler.hotfix-round-limit",
  HOTFIX_WRITE_SCOPE_MISSING: "quality-scheduler.hotfix-write-scope-missing",
  HUMAN_GATE_BLOCKED: "quality-scheduler.human-gate-blocked",
  CONTROLLER_SPAWN_FORBIDDEN: "quality-scheduler.controller-spawn-forbidden",
});

const QUALITY_MARKERS = Object.freeze([
  "controller.audit-followup",
  "controller.hotfix-request",
]);

const AUDIT_CLASSES = new Set([
  "quality-auditor",
  "security-auditor",
  "bug-regression-auditor",
  "deep-audit-worker",
]);

const TERMINAL_MARKER_STATES = new Set([
  "AUDIT_COMPLETED",
  "AUDIT_REPORTED",
  "HOTFIX_COMPLETED",
  "HOTFIX_REPORTED",
  "FOLLOWUP_COMPLETED",
  "CANDIDATE_CONSUMED",
  "DONE",
  "COMPLETE",
  "COMPLETED",
]);

function compact(value) {
  return String(value ?? "").trim();
}

function asList(value) {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.flatMap(asList);
  return String(value)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeFieldMap(fields = {}) {
  const normalized = {};
  for (const [key, value] of Object.entries(fields || {})) {
    normalized[String(key).replace(/[-_\s]/g, "").toLowerCase()] = value;
    normalized[String(key).trim().toLowerCase()] = value;
  }
  return normalized;
}

function commentBody(comment) {
  return compact(comment?.body || comment?.comment_stripped || comment?.comment_html || comment?.text);
}

function commentTime(comment) {
  const parsed = Date.parse(comment?.created_at || comment?.updated_at || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function markerRegex(marker) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}(?:\\s*\\([^)]*\\))?\\s*:?\\s*$`);
}

export function parseQualityMarkerFields(body, marker) {
  const lines = String(body || "").split(/\r?\n/);
  const rx = markerRegex(marker);
  let startIndex = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (rx.test(lines[index].trim())) startIndex = index;
  }
  if (startIndex === -1) return {};

  return parseMarkerFieldsFromLines(lines, startIndex);
}

function parseMarkerFieldsFromLines(lines, startIndex) {
  const fields = {};
  let currentKey = "";
  for (const raw of lines.slice(startIndex + 1)) {
    if (!raw.trim()) continue;
    if (isTopLevelMarkerStart(raw)) break;

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
    }
  }
  return fields;
}

function isTopLevelMarkerStart(raw) {
  const trimmed = raw.trim();
  if (/^\s/.test(raw) || !trimmed.endsWith(":")) return false;
  return QUALITY_MARKERS.includes(trimmed.slice(0, -1));
}

function qualityMarkersInBody(body, markers = QUALITY_MARKERS) {
  const lines = String(body || "").split(/\r?\n/);
  const markerEntries = markers.map((marker) => ({ marker, rx: markerRegex(marker) }));
  const controllerQuality = parseQualityMarkerFields(body, "post_worker_quality");
  const found = [];
  for (let index = 0; index < lines.length; index += 1) {
    const matched = markerEntries.find((entry) => entry.rx.test(lines[index].trim()));
    if (!matched) continue;
    const fields = parseMarkerFieldsFromLines(lines, index);
    if (!Object.keys(fields).length) continue;
    found.push({
      marker: matched.marker,
      fields,
      controller_quality: controllerQuality,
      ordinal: found.length,
    });
  }
  return found;
}

export function latestQualityMarkers(comments = [], markers = QUALITY_MARKERS) {
  let best = null;
  for (const comment of comments || []) {
    const body = commentBody(comment);
    const found = qualityMarkersInBody(body, markers);
    if (!found.length) continue;
    const ts = commentTime(comment);
    if (!best || ts >= best.ts) {
      best = {
        comment,
        body,
        found,
        ts,
      };
    }
  }
  if (!best) return [];
  return best.found.map((marker) => ({
    marker: marker.marker,
    comment_id: best.comment.id || null,
    created_at: best.comment.created_at || null,
    body: best.body,
    fields: marker.fields,
    controller_quality: marker.controller_quality || {},
    ts: best.ts,
    ordinal: marker.ordinal,
  }));
}

export function latestQualityMarker(comments = [], markers = QUALITY_MARKERS) {
  return latestQualityMarkers(comments, markers).at(-1) || null;
}

function sequenceRef(workItem = {}) {
  const ref = compact(workItem.ref || workItem.sequence_id || workItem.sequence);
  if (!ref) return compact(workItem.id || "unknown");
  if (/^[A-Z]+-\d+$/i.test(ref)) return ref.toUpperCase();
  if (/^\d+$/.test(ref)) return `COMPA-${ref}`;
  return ref;
}

function reportPath({ workspaceRoot, workItem, workerClass, marker }) {
  const fields = marker?.fields || {};
  const explicit = compact(fields.report_path || fields.outcome_artifact || fields.outcome_artifacts);
  if (explicit) return explicit;
  const date = new Date().toISOString().slice(0, 10);
  const ref = sequenceRef(workItem).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const fileName = `${ref}-${workerClass}.md`;
  const dir = AUDIT_CLASSES.has(workerClass) ? "reports/audits" : "reports/runs";
  return path.join(path.resolve(workspaceRoot), dir, date, fileName);
}

function chooseHumanGate(workerClass) {
  if (workerClass === "hotfix-worker") return "HG-2.5";
  if (workerClass === "security-auditor" || workerClass === "deep-audit-worker") return "HG-2.5";
  return "HG-2";
}

function chooseRuntimePermissionMode(workerClass) {
  return workerClass === "hotfix-worker" ? "acceptEdits" : "plan";
}

function defaultAcceptance(workerClass) {
  if (workerClass === "hotfix-worker") {
    return [
      "Apply the smallest coherent fix for the named bounded finding.",
      "Emit worker.hotfix-reported with changed files, gates, blockers and report path.",
      "Do not merge, push, deploy, publish, touch production, change schema/RLS/auth, or mark Plane Done.",
    ];
  }
  if (workerClass === "security-auditor") {
    return [
      "Produce a read-only security, credential, auth, RLS and data-risk report.",
      "Redact any secret-like value and do not print credentials.",
      "Recommend follow-up contracts only; do not edit files.",
    ];
  }
  if (workerClass === "deep-audit-worker") {
    return [
      "Produce a severity-ordered long-context audit with FACT/INFERENCE/HYPOTHESIS claim labels.",
      "Recommend follow-up contracts only; do not edit files.",
      "Respect the Opus silent-window rule before duplicate dispatch.",
    ];
  }
  return [
    "Re-run or verify the declared gates and state any gate that cannot be rerun.",
    "Produce a severity-ordered quality, bug and regression report with evidence.",
    "Recommend follow-up contracts only; do not edit files.",
  ];
}

function defaultGates(workerClass) {
  const gates = [
    "git diff --check",
    "node scripts/orchestration/post-worker-quality-loop-core.mjs --json",
  ];
  if (workerClass !== "quality-auditor") {
    gates.push("[LOCAL_WORKSPACE] detect-changes");
  }
  return gates;
}

function blockedActions(workerClass, worker = {}) {
  const actions = new Set(worker.blocked_actions || []);
  for (const action of ["merge", "push", "deploy", "production-write", "public-publish", "plane-done"]) {
    actions.add(action);
  }
  if (workerClass === "hotfix-worker") actions.add("schema/RLS/auth");
  if (workerClass !== "hotfix-worker") actions.add("source-code-write");
  return [...actions];
}

function sourceOfTruth({ workspaceRoot, parentFields, marker }) {
  const parent = normalizeFieldMap(parentFields);
  return [
    path.join(path.resolve(workspaceRoot), "docs/orchestration/post-worker-quality-loop.md"),
    path.join(path.resolve(workspaceRoot), "registries/quality/post-worker-quality-loop.json"),
    ...asList(parent.source_of_truth || parent.sourceoftruth),
    marker?.fields?.source_worker_report_path,
    marker?.fields?.worker_report_path,
    marker?.fields?.source_report_path,
  ].map(compact).filter(Boolean);
}

function yamlList(key, values) {
  const list = asList(values);
  if (!list.length) return `${key}:`;
  return [`${key}:`, ...list.map((value) => `  - ${value}`)].join("\n");
}

export function renderLowerWorkerContractMarkdown(fields = {}) {
  const lines = [
    "```yaml",
    `role: ${fields.role}`,
    `parent_seat: ${fields.parent_seat}`,
    `agent: ${fields.agent}`,
    `mode: ${fields.mode}`,
    `workspace: ${fields.workspace}`,
    `dispatch: ${fields.dispatch || "ready"}`,
    yamlList("source_of_truth", fields.source_of_truth),
    fields.scope?.length ? yamlList("scope", fields.scope) : "",
    fields.allowedwritepaths?.length ? yamlList("allowedwritepaths", fields.allowedwritepaths) : "",
    yamlList("acceptance_criteria", fields.acceptance_criteria),
    yamlList("gates", fields.gates),
    `human_gate: ${fields.human_gate}`,
    `reporting: ${fields.reporting}`,
    `BlockedActions: ${fields.blocked_actions.join("; ")}`,
    `CapabilityProfile: ${fields.capability_profile}`,
    `WorkerClass: ${fields.worker_class}`,
    `PostWorkerQualityPolicy: ${POST_WORKER_QUALITY_LOOP_VERSION}`,
    `QualityLoopMaxHotfixRounds: ${fields.quality_loop_max_hotfix_rounds}`,
    `QualityLoopPreviousHotfixRounds: ${fields.quality_loop_previous_hotfix_rounds}`,
    `RuntimePermissionMode: ${fields.runtime_permission_mode}`,
    "ReflectionPolicy: required",
    "LearningProposalPolicy: required",
    "```",
  ].filter((line) => line !== "");
  return lines.join("\n");
}

export function buildLowerWorkerDispatchFromMarker({
  registry,
  comments = [],
  parentContractFields = {},
  workItem = {},
  workspaceRoot = process.cwd(),
  now = new Date(),
} = {}) {
  const validation = validatePostWorkerQualityRegistry(registry);
  if (!validation.ok) {
    return blocked([QUALITY_SCHEDULER_REASONS.REGISTRY_INVALID], { validation });
  }

  const marker = latestQualityMarker(comments);
  if (!marker) {
    return {
      ok: true,
      version: POST_WORKER_QUALITY_SCHEDULER_VERSION,
      status: "NO_SPAWN",
      generated_at: now.toISOString(),
      reason_codes: [QUALITY_SCHEDULER_REASONS.MARKER_MISSING],
      evidence: {},
    };
  }

  return buildLowerWorkerDispatchFromResolvedMarker({
    registry,
    marker,
    parentContractFields,
    workItem,
    workspaceRoot,
    now,
  });
}

export function buildLowerWorkerDispatchesFromMarkers({
  registry,
  comments = [],
  parentContractFields = {},
  workItem = {},
  workspaceRoot = process.cwd(),
  now = new Date(),
} = {}) {
  const validation = validatePostWorkerQualityRegistry(registry);
  if (!validation.ok) {
    return blocked([QUALITY_SCHEDULER_REASONS.REGISTRY_INVALID], { validation });
  }

  const markers = latestQualityMarkers(comments);
  if (!markers.length) {
    return {
      ok: true,
      version: POST_WORKER_QUALITY_SCHEDULER_VERSION,
      status: "NO_SPAWN",
      generated_at: now.toISOString(),
      reason_codes: [QUALITY_SCHEDULER_REASONS.MARKER_MISSING],
      evidence: {},
      marker_count: 0,
      candidate_count: 0,
      blocked_count: 0,
      no_spawn_count: 1,
      candidates: [],
      blocked: [],
      no_spawn: [],
    };
  }

  if (markers.length === 1) {
    const single = buildLowerWorkerDispatchFromResolvedMarker({
      registry,
      marker: markers[0],
      parentContractFields,
      workItem,
      workspaceRoot,
      now,
    });
    return {
      ...single,
      marker_count: 1,
      candidate_count: single.status === "LOWER_WORKER_READY" ? 1 : 0,
      blocked_count: single.status === "BLOCKED" ? 1 : 0,
      no_spawn_count: single.status === "NO_SPAWN" ? 1 : 0,
      candidates: single.status === "LOWER_WORKER_READY" ? [single] : [],
      blocked: single.status === "BLOCKED" ? [single] : [],
      no_spawn: single.status === "NO_SPAWN" ? [single] : [],
    };
  }

  const results = markers.map((marker) => buildLowerWorkerDispatchFromResolvedMarker({
    registry,
    marker,
    parentContractFields,
    workItem,
    workspaceRoot,
    now,
  }));
  const candidates = results.filter((result) => result.status === "LOWER_WORKER_READY");
  const blockedResults = results.filter((result) => result.status === "BLOCKED");
  const noSpawn = results.filter((result) => result.status === "NO_SPAWN");
  const reasonCodes = [...new Set(results.flatMap((result) => result.reason_codes || []))];
  return {
    ok: blockedResults.length === 0,
    version: POST_WORKER_QUALITY_SCHEDULER_VERSION,
    status: blockedResults.length ? "BLOCKED" : candidates.length ? "CANDIDATES_READY" : "NO_SPAWN",
    generated_at: now.toISOString(),
    reason_codes: reasonCodes,
    marker_count: markers.length,
    candidate_count: candidates.length,
    blocked_count: blockedResults.length,
    no_spawn_count: noSpawn.length,
    candidates,
    blocked: blockedResults,
    no_spawn: noSpawn,
    scheduler: {
      controller_may_spawn_workers: false,
      scheduler_may_spawn_next_lower_worker: candidates.length > 0 && blockedResults.length === 0,
      required_next_step: "Runtime Dispatcher may consume each generated lower-worker contract after normal Stage 0.5/0.65/capability gates pass.",
    },
  };
}

function buildLowerWorkerDispatchFromResolvedMarker({
  registry,
  marker,
  parentContractFields = {},
  workItem = {},
  workspaceRoot = process.cwd(),
  now = new Date(),
} = {}) {
  if (!QUALITY_MARKERS.includes(marker.marker)) {
    return blocked([QUALITY_SCHEDULER_REASONS.MARKER_UNKNOWN], { marker: marker.marker });
  }

  const controllerQuality = normalizeFieldMap(marker.controller_quality || {});
  const controllerQualityStatus = compact(controllerQuality.status).toUpperCase();
  const schedulerMaySpawn = compact(controllerQuality.schedulermayspawn || controllerQuality.scheduler_may_spawn).toLowerCase();
  if (schedulerMaySpawn === "false" || ["NEEDS_HUMAN", "BLOCKED"].includes(controllerQualityStatus)) {
    return {
      ok: true,
      version: POST_WORKER_QUALITY_SCHEDULER_VERSION,
      status: "NO_SPAWN",
      generated_at: now.toISOString(),
      reason_codes: [
        schedulerMaySpawn === "false"
          ? QUALITY_SCHEDULER_REASONS.CONTROLLER_SPAWN_FORBIDDEN
          : QUALITY_SCHEDULER_REASONS.HUMAN_GATE_BLOCKED,
      ],
      marker,
      evidence: {
        post_worker_quality_status: controllerQualityStatus || null,
        scheduler_may_spawn: schedulerMaySpawn || null,
      },
    };
  }

  const markerState = compact(marker.fields.state).toUpperCase();
  if (TERMINAL_MARKER_STATES.has(markerState)) {
    return {
      ok: true,
      version: POST_WORKER_QUALITY_SCHEDULER_VERSION,
      status: "NO_SPAWN",
      generated_at: now.toISOString(),
      reason_codes: [QUALITY_SCHEDULER_REASONS.MARKER_TERMINAL],
      marker,
      evidence: { marker_state: markerState },
    };
  }

  const workerClass = compact(marker.fields.worker_class);
  if (!workerClass) return blocked([QUALITY_SCHEDULER_REASONS.WORKER_CLASS_MISSING], { marker });
  if (workerClass === "controller-only") {
    return {
      ok: true,
      version: POST_WORKER_QUALITY_SCHEDULER_VERSION,
      status: "NO_SPAWN",
      generated_at: now.toISOString(),
      reason_codes: [QUALITY_SCHEDULER_REASONS.CONTROLLER_ONLY],
      marker,
      evidence: { worker_class: workerClass },
    };
  }

  const worker = (registry.worker_classes || []).find((candidate) => candidate.id === workerClass);
  if (!worker) return blocked([QUALITY_SCHEDULER_REASONS.WORKER_CLASS_UNKNOWN], { worker_class: workerClass });

  const parent = normalizeFieldMap(parentContractFields);
  const maxRounds = Number(marker.fields.max_auto_hotfix_rounds || registry.defaults?.max_auto_hotfix_rounds || 0);
  const previousRounds = Number(marker.fields.previous_hotfix_rounds || parent.qualityloopprevioushotfixrounds || 0);
  if (workerClass === "hotfix-worker" && previousRounds >= maxRounds) {
    return blocked([QUALITY_SCHEDULER_REASONS.HOTFIX_LIMIT], { max_auto_hotfix_rounds: maxRounds, previous_hotfix_rounds: previousRounds });
  }

  const allowedWritePaths = asList(marker.fields.allowed_write_paths || marker.fields.allowedwritepaths || parent.allowed_write_paths || parent.allowedwritepaths);
  if (workerClass === "hotfix-worker" && allowedWritePaths.length === 0) {
    return blocked([QUALITY_SCHEDULER_REASONS.HOTFIX_WRITE_SCOPE_MISSING], { worker_class: workerClass });
  }

  const gate = chooseHumanGate(workerClass);
  const outputReport = reportPath({ workspaceRoot, workItem, workerClass, marker });
  const contractFields = {
    role: compact(parent.role) || "role:cto",
    parent_seat: compact(parent.parent_seat || parent.parentseat) || compact(parent.role) || "role:cto",
    agent: worker.agent,
    mode: worker.mode,
    workspace: compact(parent.workspace) || "registry:company-os",
    dispatch: "ready",
    source_of_truth: sourceOfTruth({ workspaceRoot, parentFields: parentContractFields, marker }),
    scope: [
      `Include only the ${workerClass} follow-up requested by ${marker.marker}.`,
      workerClass === "hotfix-worker" ? "Exclude every file outside allowedwritepaths." : "Exclude source edits; audit/report only.",
    ],
    allowedwritepaths: workerClass === "hotfix-worker" ? allowedWritePaths : [],
    acceptance_criteria: defaultAcceptance(workerClass),
    gates: defaultGates(workerClass),
    human_gate: gate,
    reporting: `${workerClass === "hotfix-worker" ? "Plane worker.hotfix-reported" : "Plane controller.audit-followup"} plus ${outputReport}`,
    blocked_actions: blockedActions(workerClass, worker),
    capability_profile: worker.capability_profile,
    worker_class: workerClass,
    quality_loop_max_hotfix_rounds: Number.isFinite(maxRounds) ? maxRounds : 0,
    quality_loop_previous_hotfix_rounds: Number.isFinite(previousRounds) ? previousRounds : 0,
    runtime_permission_mode: chooseRuntimePermissionMode(workerClass),
    report_path: outputReport,
  };

  return {
    ok: true,
    version: POST_WORKER_QUALITY_SCHEDULER_VERSION,
    status: "LOWER_WORKER_READY",
    generated_at: now.toISOString(),
    reason_codes: [],
    marker,
    worker_class: workerClass,
    worker_contract: contractFields,
    worker_contract_markdown: renderLowerWorkerContractMarkdown(contractFields),
    scheduler: {
      controller_may_spawn_workers: false,
      scheduler_may_spawn_next_lower_worker: true,
      required_next_step: "Runtime Dispatcher may consume the generated lower-worker contract after normal Stage 0.5/0.65/capability gates pass.",
    },
  };
}

function blocked(reasonCodes, evidence = {}) {
  return {
    ok: false,
    version: POST_WORKER_QUALITY_SCHEDULER_VERSION,
    status: "BLOCKED",
    generated_at: new Date().toISOString(),
    reason_codes: reasonCodes,
    evidence,
  };
}

function parseJsonFile(filePath, fallback) {
  if (!filePath) return fallback;
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function parseArgs(argv) {
  const args = {
    registry: process.env.COMPANY_OS_POST_WORKER_QUALITY_REGISTRY || DEFAULT_POST_WORKER_QUALITY_REGISTRY_PATH,
    commentsFile: "",
    parentFieldsFile: "",
    workspaceRoot: process.cwd(),
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--registry") args.registry = argv[++index] || args.registry;
    else if (arg === "--comments-file") args.commentsFile = argv[++index] || "";
    else if (arg === "--parent-fields-file") args.parentFieldsFile = argv[++index] || "";
    else if (arg === "--workspace-root") args.workspaceRoot = argv[++index] || args.workspaceRoot;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  node scripts/orchestration/post-worker-quality-scheduler-core.mjs \\
    --comments-file comments.json \\
    --parent-fields-file parent-contract-fields.json \\
    [--workspace-root /path/to/workspace] \\
    [--registry registries/quality/post-worker-quality-loop.json] \\
    [--json]

Dry-run only. Converts controller.audit-followup / controller.hotfix-request
markers into the next lower-worker contract. Writes nothing and spawns nothing.
`;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`post-worker-quality-scheduler: ${result.status}`);
  if (result.worker_class) console.log(`worker_class: ${result.worker_class}`);
  if (result.reason_codes?.length) console.log(`reason_codes: ${result.reason_codes.join(", ")}`);
  if (result.worker_contract_markdown) console.log(result.worker_contract_markdown);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const loaded = loadPostWorkerQualityRegistry(args.registry);
  if (!loaded.ok) {
    printResult(blocked([QUALITY_SCHEDULER_REASONS.REGISTRY_INVALID], loaded.evidence), args.json);
    process.exitCode = 2;
    return;
  }
  const result = buildLowerWorkerDispatchFromMarker({
    registry: loaded.registry,
    comments: parseJsonFile(args.commentsFile, []),
    parentContractFields: parseJsonFile(args.parentFieldsFile, {}),
    workspaceRoot: args.workspaceRoot,
  });
  printResult(result, args.json);
  process.exitCode = result.ok ? 0 : 2;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((error) => {
    console.error(`post-worker-quality-scheduler failed: ${error.message}`);
    process.exitCode = 1;
  });
}
