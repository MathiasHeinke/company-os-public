import fs from "node:fs";
import path from "node:path";

export const POST_WORKER_QUALITY_LOOP_VERSION = "post-worker-quality-loop/v0";
export const DEFAULT_POST_WORKER_QUALITY_REGISTRY_PATH = "registries/quality/post-worker-quality-loop.json";

export const QUALITY_LOOP_REASONS = Object.freeze({
  REGISTRY_INVALID: "quality-loop.registry-invalid",
  CLASS_UNKNOWN: "quality-loop.inference-class-unknown",
  NO_FOLLOWUP: "quality-loop.no-followup-required",
  CONTROLLER_ONLY: "quality-loop.controller-only",
  AUDIT_REQUIRED: "quality-loop.audit-required",
  SECURITY_AUDIT_REQUIRED: "quality-loop.security-audit-required",
  DEEP_AUDIT_REQUIRED: "quality-loop.deep-audit-required",
  HOTFIX_ELIGIBLE: "quality-loop.hotfix-eligible",
  HOTFIX_LIMIT: "quality-loop.hotfix-round-limit",
  HUMAN_GATE_REQUIRED: "quality-loop.human-gate-required",
  AUTONOMOUS_SPAWN_BLOCKED: "quality-loop.autonomous-spawn-blocked",
});

const KNOWN_CLASSES = new Set([
  "P0-doc-small",
  "P1-code-bounded",
  "P2-code-shared",
  "P3-cross-repo",
  "P4-high-risk",
]);

const SECURITY_PATTERNS = [
  /\bsecurity\b/i,
  /\bsecret\b/i,
  /\bcredential\b/i,
  /\btoken\b/i,
  /\bauth\b/i,
  /\brls\b/i,
  /\bsql[-\s]?injection\b/i,
  /\bxss\b/i,
  /\bcsrf\b/i,
  /\bservice[-\s]?role\b/i,
];

const HIGH_RISK_PATTERNS = [
  /\bHG-3\b/i,
  /\bHG-3\.5\b/i,
  /\bHG-4\b/i,
  /\bschema\b/i,
  /\brls\b/i,
  /\bservice[-\s]?role\b/i,
  /\bproduction[-\s]?write\b/i,
  /\bdeploy\b/i,
  /\bpublic[-\s]?publish\b/i,
  /\bmaterial[-\s]?spend\b/i,
  /\blegal[-\s]?claim\b/i,
  /\bregulated[-\s]?claim\b/i,
  /\bmedical[-\s]?claim\b/i,
];

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

function normalizeFields(fields = {}) {
  const normalized = {};
  for (const [key, value] of Object.entries(fields || {})) {
    normalized[String(key).replace(/[-_\s]/g, "").toLowerCase()] = value;
    normalized[String(key).trim().toLowerCase()] = value;
  }
  return normalized;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function registryPath(filePath) {
  return path.resolve(filePath || DEFAULT_POST_WORKER_QUALITY_REGISTRY_PATH);
}

export function loadPostWorkerQualityRegistry(filePath = DEFAULT_POST_WORKER_QUALITY_REGISTRY_PATH) {
  try {
    const registry = JSON.parse(fs.readFileSync(registryPath(filePath), "utf8"));
    const validation = validatePostWorkerQualityRegistry(registry);
    return {
      ok: validation.ok,
      registry,
      reason_codes: validation.reason_codes,
      evidence: validation.evidence,
    };
  } catch (error) {
    return {
      ok: false,
      registry: null,
      reason_codes: [QUALITY_LOOP_REASONS.REGISTRY_INVALID],
      evidence: { error: String(error.message || error) },
    };
  }
}

export function validatePostWorkerQualityRegistry(registry) {
  const reasonCodes = [];
  if (!registry || typeof registry !== "object") {
    return invalid(["registry-not-object"]);
  }
  if (registry.version !== POST_WORKER_QUALITY_LOOP_VERSION) {
    reasonCodes.push(QUALITY_LOOP_REASONS.REGISTRY_INVALID);
  }
  if (!Array.isArray(registry.worker_classes) || registry.worker_classes.length < 1) {
    reasonCodes.push(QUALITY_LOOP_REASONS.REGISTRY_INVALID);
  }
  const classIds = new Set((registry.worker_classes || []).map((entry) => entry?.id).filter(Boolean));
  for (const required of ["quality-auditor", "security-auditor", "bug-regression-auditor", "deep-audit-worker", "hotfix-worker"]) {
    if (!classIds.has(required)) reasonCodes.push(QUALITY_LOOP_REASONS.REGISTRY_INVALID);
  }
  if (!registry.matrix || typeof registry.matrix !== "object") {
    reasonCodes.push(QUALITY_LOOP_REASONS.REGISTRY_INVALID);
  } else {
    for (const id of KNOWN_CLASSES) {
      if (!registry.matrix[id]) reasonCodes.push(QUALITY_LOOP_REASONS.REGISTRY_INVALID);
    }
  }
  return {
    ok: reasonCodes.length === 0,
    reason_codes: unique(reasonCodes),
    evidence: {
      version: registry.version,
      worker_class_count: classIds.size,
      matrix_classes: Object.keys(registry.matrix || {}),
    },
  };
}

function invalid(notes) {
  return {
    ok: false,
    reason_codes: [QUALITY_LOOP_REASONS.REGISTRY_INVALID],
    evidence: { notes },
  };
}

function inferClass(fields, workerReport) {
  const normalized = normalizeFields(fields);
  const value = compact(
    normalized.inferenceclass
    || normalized.inference_class
    || workerReport?.inference_class
    || workerReport?.task_class
    || "P1-code-bounded",
  );
  if (value.toLowerCase() === "auto") return "P1-code-bounded";
  return value;
}

function workerState(workerReport = {}) {
  return compact(workerReport.state || workerReport.verdict || workerReport.status).toUpperCase();
}

function caoState(caoVerdict) {
  if (typeof caoVerdict === "string") return compact(caoVerdict).toUpperCase();
  return compact(caoVerdict?.verdict || caoVerdict?.status).toUpperCase();
}

function severityOfFinding(finding) {
  const text = typeof finding === "string" ? finding : [
    finding?.severity,
    finding?.level,
    finding?.code,
    finding?.title,
    finding?.body,
    finding?.summary,
  ].map(compact).join(" ");
  if (/\b(S0|critical|blocker|high)\b/i.test(text)) return "high";
  if (/\b(S1|major)\b/i.test(text)) return "high";
  if (/\b(S2|medium|warning)\b/i.test(text)) return "medium";
  if (/\b(S3|S4|minor|low|info)\b/i.test(text)) return "low";
  return includesAny(text, SECURITY_PATTERNS) ? "medium" : "unknown";
}

function buildRiskText(fields, workerReport, findings) {
  const normalized = normalizeFields(fields);
  return [
    normalized.humangate,
    normalized.human_gate,
    normalized.humangatelevel,
    normalized.human_gate_level,
    normalized.scope,
    normalized.sourceoftruth,
    normalized.source_of_truth,
    normalized.allowedwritepaths,
    normalized.allowed_write_paths,
    workerReport?.state,
    workerReport?.reason,
    workerReport?.summary,
    ...asList(workerReport?.reason_codes),
    ...asList(findings).map((finding) => (typeof finding === "string" ? finding : JSON.stringify(finding))),
  ].flatMap(asList).join("\n");
}

function highRiskSignal(fields, workerReport, findings, inferenceClass) {
  if (inferenceClass === "P4-high-risk") return true;
  if (findings.some((finding) => severityOfFinding(finding) === "high")) return true;
  return includesAny(buildRiskText(fields, workerReport, findings), HIGH_RISK_PATTERNS);
}

function securitySignal(fields, workerReport, findings) {
  return includesAny(buildRiskText(fields, workerReport, findings), SECURITY_PATTERNS);
}

function classPolicy(registry, inferenceClass) {
  return registry?.matrix?.[inferenceClass] || null;
}

function workerById(registry, id) {
  return (registry?.worker_classes || []).find((entry) => entry.id === id) || null;
}

function contractFor(registry, id, reason) {
  const worker = workerById(registry, id);
  if (!worker) return null;
  return {
    worker_class: worker.id,
    agent: worker.agent,
    mode: worker.mode,
    capability_profile: worker.capability_profile,
    dispatch: "manual-until-controller-marker",
    reason,
    blocked_actions: worker.blocked_actions || [],
    writes: worker.writes || [],
  };
}

function needsFix(workerReport, caoVerdict, findings) {
  const state = workerState(workerReport);
  const cao = caoState(caoVerdict);
  if (["REJECT", "FAIL", "FAILED", "RUNTIME_ERROR", "TIMEOUT"].includes(state)) return true;
  if (cao === "REJECT") return true;
  return findings.some((finding) => ["high", "medium"].includes(severityOfFinding(finding)));
}

function passLike(workerReport, caoVerdict, findings) {
  const state = workerState(workerReport);
  const cao = caoState(caoVerdict);
  return ["PASS", "PASSED", "SUCCESS"].includes(state) && (!cao || cao === "PASS") && findings.length === 0;
}

export function planPostWorkerQualityLoop({
  registry,
  contractFields = {},
  workerReport = {},
  caoVerdict = "",
  findings = [],
  previousHotfixRounds = 0,
  now = new Date(),
} = {}) {
  const validation = validatePostWorkerQualityRegistry(registry);
  if (!validation.ok) {
    return {
      ok: false,
      version: POST_WORKER_QUALITY_LOOP_VERSION,
      status: "BLOCKED",
      reason_codes: validation.reason_codes,
      evidence: validation.evidence,
    };
  }

  const inferenceClass = inferClass(contractFields, workerReport);
  if (!KNOWN_CLASSES.has(inferenceClass)) {
    return {
      ok: false,
      version: POST_WORKER_QUALITY_LOOP_VERSION,
      status: "BLOCKED",
      reason_codes: [QUALITY_LOOP_REASONS.CLASS_UNKNOWN],
      evidence: { inference_class: inferenceClass },
    };
  }

  const policy = classPolicy(registry, inferenceClass);
  const followups = [];
  const markers = [];
  const reasonCodes = [];
  const findingList = asList(findings);
  const highRisk = highRiskSignal(contractFields, workerReport, findingList, inferenceClass);
  const security = securitySignal(contractFields, workerReport, findingList);
  const fixNeeded = needsFix(workerReport, caoVerdict, findingList);
  const successful = passLike(workerReport, caoVerdict, findingList);
  const autonomousSpawnAllowed = policy.autonomous_spawn_allowed !== false && !highRisk;

  if (highRisk) {
    reasonCodes.push(QUALITY_LOOP_REASONS.HUMAN_GATE_REQUIRED);
    if (inferenceClass === "P4-high-risk") reasonCodes.push(QUALITY_LOOP_REASONS.AUTONOMOUS_SPAWN_BLOCKED);
  }

  for (const id of policy.mandatory_followups || []) {
    if (id === "controller-rerun-gates") {
      reasonCodes.push(QUALITY_LOOP_REASONS.CONTROLLER_ONLY);
      markers.push({
        marker: registry.plane_markers.audit_request,
        state: "CONTROLLER_RERUN_GATES",
        worker_class: "controller-only",
      });
      continue;
    }
    const contract = contractFor(registry, id, "mandatory-followup");
    if (contract) followups.push(contract);
  }

  if (fixNeeded) {
    reasonCodes.push(QUALITY_LOOP_REASONS.AUDIT_REQUIRED);
    for (const id of policy.audit_on_fail || []) {
      const contract = contractFor(registry, id, "failure-or-finding");
      if (contract) followups.push(contract);
    }
  }

  if (security && policy.security_audit_on_security_signal !== false) {
    reasonCodes.push(QUALITY_LOOP_REASONS.SECURITY_AUDIT_REQUIRED);
    const contract = contractFor(registry, "security-auditor", "security-signal");
    if (contract) followups.push(contract);
  }

  if (inferenceClass === "P3-cross-repo") {
    reasonCodes.push(QUALITY_LOOP_REASONS.DEEP_AUDIT_REQUIRED);
  }

  const maxRounds = Number(policy.max_auto_hotfix_rounds ?? registry.defaults?.max_auto_hotfix_rounds ?? 0);
  const hotfixAllowedByPolicy = Boolean(policy.auto_hotfix_allowed);
  const hotfixRoundAllowed = previousHotfixRounds < maxRounds;
  if (fixNeeded && hotfixAllowedByPolicy && !highRisk && autonomousSpawnAllowed) {
    if (hotfixRoundAllowed) {
      reasonCodes.push(QUALITY_LOOP_REASONS.HOTFIX_ELIGIBLE);
      const contract = contractFor(registry, "hotfix-worker", "bounded-failure-repair");
      if (contract) {
        followups.push({
          ...contract,
          dispatch: "manual-until-controller-hotfix-request",
          max_auto_hotfix_rounds: maxRounds,
          previous_hotfix_rounds: previousHotfixRounds,
        });
      }
      markers.push({
        marker: registry.plane_markers.hotfix_request,
        state: "HOTFIX_REQUESTED",
        worker_class: "hotfix-worker",
      });
    } else {
      reasonCodes.push(QUALITY_LOOP_REASONS.HOTFIX_LIMIT);
    }
  }

  const dedupedFollowups = [];
  const seen = new Set();
  for (const item of followups) {
    if (!item || seen.has(item.worker_class)) continue;
    seen.add(item.worker_class);
    dedupedFollowups.push(item);
  }

  if (successful && dedupedFollowups.length === 0 && !markers.length) {
    reasonCodes.push(QUALITY_LOOP_REASONS.NO_FOLLOWUP);
  }

  const schedulerMaySpawn = autonomousSpawnAllowed && dedupedFollowups.length > 0 && !reasonCodes.includes(QUALITY_LOOP_REASONS.AUTONOMOUS_SPAWN_BLOCKED);
  const status = highRisk
    ? "NEEDS_HUMAN"
    : dedupedFollowups.length > 0
      ? "FOLLOWUP_READY"
      : "NO_FOLLOWUP";

  return {
    ok: status !== "BLOCKED",
    version: POST_WORKER_QUALITY_LOOP_VERSION,
    generated_at: now.toISOString(),
    status,
    inference_class: inferenceClass,
    reason_codes: unique(reasonCodes),
    scheduler: {
      controller_may_spawn_workers: false,
      scheduler_may_spawn: schedulerMaySpawn,
      requires_plane_marker: schedulerMaySpawn ? "controller.audit-followup or controller.hotfix-request" : "n/a",
    },
    loop_limits: {
      max_auto_hotfix_rounds: maxRounds,
      previous_hotfix_rounds: previousHotfixRounds,
      hotfix_round_allowed: hotfixRoundAllowed,
    },
    signals: {
      worker_state: workerState(workerReport) || null,
      cao_verdict: caoState(caoVerdict) || null,
      high_risk: highRisk,
      security_signal: security,
      fix_needed: fixNeeded,
      pass_like: successful,
    },
    followup_worker_contracts: dedupedFollowups,
    markers_to_post: markers,
  };
}

function parseArgs(argv) {
  const args = {
    registry: process.env.COMPANY_OS_POST_WORKER_QUALITY_REGISTRY || DEFAULT_POST_WORKER_QUALITY_REGISTRY_PATH,
    fields: {},
    workerReport: {},
    caoVerdict: "",
    findings: [],
    previousHotfixRounds: 0,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--registry") args.registry = argv[++index] || args.registry;
    else if (arg === "--field") {
      const raw = argv[++index] || "";
      const split = raw.indexOf("=");
      if (split === -1) throw new Error("--field expects key=value");
      args.fields[raw.slice(0, split)] = raw.slice(split + 1);
    } else if (arg === "--worker-state") args.workerReport.state = argv[++index] || "";
    else if (arg === "--worker-reason") args.workerReport.reason = argv[++index] || "";
    else if (arg === "--cao-verdict") args.caoVerdict = argv[++index] || "";
    else if (arg === "--finding") args.findings.push(argv[++index] || "");
    else if (arg === "--previous-hotfix-rounds") args.previousHotfixRounds = Number(argv[++index] || 0);
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  node scripts/orchestration/post-worker-quality-loop-core.mjs \\
    [--registry registries/quality/post-worker-quality-loop.json] \\
    [--field InferenceClass=P1-code-bounded] \\
    [--worker-state PASS|REJECT|TIMEOUT|RUNTIME_ERROR] \\
    [--cao-verdict PASS|REJECT|PARK] \\
    [--finding "S2 bug: ..."] \\
    [--previous-hotfix-rounds 0] \\
    [--json]

Dry-run only. Writes nothing. Returns the post-worker audit/hotfix follow-up
plan that a scheduler may consume after controller marker approval.
`;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`post-worker-quality-loop: ${result.status || "BLOCKED"}`);
  if (result.inference_class) console.log(`inference_class: ${result.inference_class}`);
  if (result.reason_codes?.length) console.log(`reason_codes: ${result.reason_codes.join(", ")}`);
  if (result.followup_worker_contracts?.length) {
    console.log(`followups: ${result.followup_worker_contracts.map((item) => item.worker_class).join(", ")}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const loaded = loadPostWorkerQualityRegistry(args.registry);
  if (!loaded.ok) {
    const result = { ok: false, status: "BLOCKED", reason_codes: loaded.reason_codes, evidence: loaded.evidence };
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }
  const result = planPostWorkerQualityLoop({
    registry: loaded.registry,
    contractFields: args.fields,
    workerReport: args.workerReport,
    caoVerdict: args.caoVerdict,
    findings: args.findings,
    previousHotfixRounds: args.previousHotfixRounds,
  });
  printResult(result, args.json);
  process.exitCode = result.ok ? 0 : 2;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((error) => {
    console.error(`post-worker-quality-loop failed: ${error.message}`);
    process.exitCode = 1;
  });
}
