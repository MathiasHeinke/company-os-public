import fs from "node:fs";
import path from "node:path";

import { SCHEMA_VERSION } from "../agent-events/agent-event-core.mjs";

export const HUMAN_GATE_RELEASE_VERSION = "human-gate-release/v1";

// Canonical HumanGate enum per docs/governance/human-gate-levels.md.
// HG-3 is CEO/Codex critical authority. HG-3.5 is Chief-of-Staff /
// founder-proxy review. HG-4 is the real founder/strategic boundary.
export const HUMAN_GATE_THRESHOLDS = {
  "HG-0": 0,
  "HG-1": 0.8,
  "HG-2": 0.85,
  "HG-2.5": 0.92,
  "HG-3": 0.96,
  "HG-3.5": 1,
  "HG-4": 1,
};

export const AUTONOMOUS_RELEASE_OWNERS = new Set([
  "CEO",
  "Codex-GPT-5.5-xhigh",
  "GPT-5.5-xhigh",
  "delegated-controller",
]);

const HG35_RELEASE_OWNERS = new Set(["Chief-of-Staff", "Founder-Proxy", "Founder", "human"]);
const HG4_RELEASE_OWNERS = new Set(["Founder", "human"]);

const PASS_STATUSES = new Set(["pass", "passed", "ok", "accepted", "green"]);
const BLOCKED_ACTION_PATTERNS = [
  /\bmerge\b/i,
  /\bpush\b/i,
  /\bdeploy\b/i,
  /\brelease\b/i,
  /\bproduction(?:[-_\s]?write|[-_\s]?db|[-_\s]?system)?\b/i,
  /\bschema\b/i,
  /\brls\b/i,
  /\bauth\b/i,
  /\bservice[-_\s]?role\b/i,
  /\bspend\b/i,
  /\bpricing\b/i,
  /\bpublic[-_\s]?(?:medical|legal|financial|rx|regulated)[-_\s]?claim\b/i,
  /\bregulated[-_\s]?claim\b/i,
  /\bautonomy[-_\s]?(?:increase|promotion|promote)\b/i,
  /\bdurable[-_\s]?memory[-_\s]?write\b/i,
  /\bmemory[-_\s]?write\b/i,
  /\blinear[-_\s]?done\b/i,
  /\bdone[-_\s]?transition\b/i,
  /\bpublish[-_\s]?live\b/i,
  /\blive[-_\s]?(?:publish|publishing|outreach|scheduling)\b/i,
  /\bpublic[-_\s]?publish(?:ing)?\b/i,
];

const HG25_ALLOWED_RELEASE_ACTION_PATTERNS = [
  /\bmerge\b/i,
  /\bpush\b/i,
  /\bdeploy\b/i,
  /\brelease\b/i,
  /\bproduction(?:[-_\s]?write|[-_\s]?db|[-_\s]?system)?\b/i,
  /\blinear[-_\s]?done\b/i,
  /\bplane[-_\s]?done\b/i,
  /\bdone[-_\s]?transition\b/i,
  /\bpublish[-_\s]?live\b/i,
  /\blive[-_\s]?(?:publish|publishing|scheduling)\b/i,
  /\bpublic[-_\s]?publish(?:ing)?\b/i,
];

const HG25_ESCALATE_TO_HG3_ACTION_PATTERNS = [
  /\bschema\b/i,
  /\brls\b/i,
  /\bauth\b/i,
  /\bservice[-_\s]?role\b/i,
  /\bspend\b/i,
  /\bpricing\b/i,
  /\bpublic[-_\s]?(?:medical|legal|financial|rx|regulated)[-_\s]?claim\b/i,
  /\bregulated[-_\s]?claim\b/i,
  /\bautonomy[-_\s]?(?:increase|promotion|promote)\b/i,
  /\bdurable[-_\s]?memory[-_\s]?write\b/i,
  /\bmemory[-_\s]?write\b/i,
  /\blive[-_\s]?outreach\b/i,
];

const HG3_ESCALATE_TO_HG4_ACTION_PATTERNS = [
  /\bstrategic[-_\s]?(?:direction|shift|decision|pivot)\b/i,
  /\bmission[-_\s]?(?:change|shift)\b/i,
  /\bnon[-_\s]?restorable\b/i,
  /\birreversible[-_\s]?(?:delete|deletion|data[-_\s]?loss|drop)\b/i,
  /\bdrop[-_\s]?(?:database|table|bucket)\b/i,
  /\bdelete[-_\s]?(?:production[-_\s]?)?(?:database|table|bucket)\b/i,
  /\bmaterial[-_\s]?(?:spend|contract|liability)\b/i,
  /\blegal[-_\s]?(?:commitment|claim|filing)\b/i,
  /\bmedical[-_\s]?claim\b/i,
  /\bfinancial[-_\s]?claim\b/i,
  /\bregulated[-_\s]?(?:public[-_\s]?)?claim\b/i,
  /\blive[-_\s]?outreach[-_\s]?in[-_\s]?founder/i,
  /\bfounder[-_\s]?(?:voice|name|identity)[-_\s]?(?:live|external|outreach)\b/i,
  /\bautonomy[-_\s]?(?:promote|promotion|increase)[-_\s]?L?[45]\b/i,
];

const SENSITIVE_PATTERNS = [
  { id: "openrouter_key", pattern: /sk-or-v1-[A-Za-z0-9._-]+/ },
  { id: "openai_or_compatible_key", pattern: /\bsk-[A-Za-z0-9._-]{20,}\b/ },
  { id: "linear_api_key", pattern: /\blin_api_[A-Za-z0-9._-]+/ },
  { id: "xai_key", pattern: /\bxai-[A-Za-z0-9._-]{20,}\b/ },
  { id: "honcho_token", pattern: /\bhch-v3-[A-Za-z0-9._-]+/ },
  { id: "jwt", pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/ },
  { id: "private_key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { id: "mh_dev_path", pattern: /\/Users\/mathiasheinke\/Developer\/[SOURCE_WORKSPACE]\b/ },
  { id: "personal_memory", pattern: /\b(honcho_personal|mathias-personal|life-strategy|relationships|personal memory)\b/i },
  { id: "private_finance", pattern: /\b(Finanzamt|finance-decisions|Cashflow|Stundung|private tax|Steuer)\b/i },
  { id: "customer_or_health", pattern: /\b(UKHD|Salem|patient|Patient|MDR|Rx|medical|Gesundheit|health data)\b/ },
  { id: "email_address", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
];

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asArray(value) {
  if (value === null || value === undefined || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

function statusIsPass(value) {
  return PASS_STATUSES.has(String(value || "").trim().toLowerCase());
}

function localDate(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function pathExists(value) {
  if (!value) return false;
  if (/^https?:\/\//i.test(String(value))) return true;
  return path.isAbsolute(String(value)) && fs.existsSync(String(value));
}

function pushCheck(checks, status, id, message, details = {}) {
  checks.push({ status, id, message, details });
}

export function readHumanGateDecisionFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const text = fs.readFileSync(absolutePath, "utf8");
  const trimmed = text.trim();
  if (!trimmed) throw new Error(`Decision file is empty: ${absolutePath}`);
  if (trimmed.startsWith("{")) return { decision: JSON.parse(trimmed), text, path: absolutePath };

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return { decision: JSON.parse(fenced[1]), text, path: absolutePath };
  throw new Error("Decision file must be JSON or contain a fenced JSON block.");
}

export function scanHumanGateSensitiveText(text) {
  const source = String(text ?? "");
  return SENSITIVE_PATTERNS.filter((item) => item.pattern.test(source)).map((item) => item.id);
}

export function requestedActionsContainBlockedAction(actions) {
  const values = asArray(actions).map((item) => String(item || ""));
  return values.filter((action) => BLOCKED_ACTION_PATTERNS.some((pattern) => pattern.test(action)));
}

export function requestedActionsContainHg25FounderOnlyAction(actions) {
  const values = asArray(actions).map((item) => String(item || ""));
  return values.filter((action) => HG25_ESCALATE_TO_HG3_ACTION_PATTERNS.some((pattern) => pattern.test(action)));
}

export function requestedActionsContainHg3FounderOnlyAction(actions) {
  const values = asArray(actions).map((item) => String(item || ""));
  return values.filter((action) => HG3_ESCALATE_TO_HG4_ACTION_PATTERNS.some((pattern) => pattern.test(action)));
}

function normalizeDecision(decision) {
  const release = decision.human_gate_release || decision.release || decision;
  return {
    ...decision,
    release,
    level: String(release.level || decision.level || "").trim(),
    releasedBy: String(release.released_by || release.releasedBy || decision.released_by || "").trim(),
    confidence: Number(release.founder_prediction_confidence ?? release.confidence ?? decision.founder_prediction_confidence),
    requestedActions: asArray(release.requested_actions ?? release.scope ?? decision.requested_actions ?? decision.scope),
    blockedActionsStillForbidden: asArray(
      release.blocked_actions_still_forbidden ?? release.blockedActionsStillForbidden ?? decision.blocked_actions_still_forbidden,
    ),
    sourceOfTruth: asArray(decision.source_of_truth ?? decision.SourceOfTruth ?? release.source_of_truth),
    gates: asArray(decision.gates ?? decision.Gates ?? release.gates),
    artifactTruth: asArray(decision.artifact_truth ?? decision.artifactTruth ?? release.artifact_truth),
    budget: decision.budget ?? release.budget ?? null,
    rollback: release.rollback_path || release.rollback || decision.rollback_path || decision.rollback || "",
    rollbackVerification: release.rollback_verification ?? release.rollbackVerification ?? decision.rollback_verification ?? null,
    blastRadius: release.blast_radius ?? release.blastRadius ?? decision.blast_radius ?? null,
    caoVerdict: release.cao_verdict ?? release.caoVerdict ?? decision.cao_verdict ?? null,
    releaseAuthority: release.release_authority ?? release.releaseAuthority ?? decision.release_authority ?? "",
    generatedAt: release.generated_at || decision.generated_at || decision.generatedAt || "",
  };
}

export function evaluateHumanGateRelease(decision, {
  now = new Date(),
  requireBudget = true,
  requireArtifactTruth = true,
  requireSourceOfTruth = true,
  requireRollback = true,
  requireToday = false,
  maxAgeMinutes = 24 * 60,
  decisionText = "",
  decisionPath = "",
} = {}) {
  const normalized = normalizeDecision(decision);
  const checks = [];

  const level = normalized.level;
  const threshold = HUMAN_GATE_THRESHOLDS[level];
  if (!(level in HUMAN_GATE_THRESHOLDS)) {
    pushCheck(checks, "block", "level.valid", "HumanGate level must be HG-0, HG-1, HG-2, HG-2.5, HG-3, HG-3.5 or HG-4", { level });
  } else {
    pushCheck(checks, "pass", "level.valid", `${level} is a known HumanGate level`, { level });
  }

  if (level === "HG-3.5" && !HG35_RELEASE_OWNERS.has(normalized.releasedBy)) {
    pushCheck(checks, "block", "level.hg35_owner_invalid", "HG-3.5 must be released by Chief-of-Staff, Founder-Proxy, Founder or human", {
      released_by: normalized.releasedBy,
    });
  }

  if (level === "HG-4" && !HG4_RELEASE_OWNERS.has(normalized.releasedBy)) {
    pushCheck(checks, "block", "level.hg4_founder_release_required", "HG-4 requires real founder/human release", {
      released_by: normalized.releasedBy,
    });
  }

  const releaseOwnerAllowed = (
    ["HG-1", "HG-2", "HG-2.5", "HG-3"].includes(level)
      ? AUTONOMOUS_RELEASE_OWNERS.has(normalized.releasedBy) || normalized.releasedBy === "Founder" || normalized.releasedBy === "human"
      : level === "HG-3.5"
        ? HG35_RELEASE_OWNERS.has(normalized.releasedBy)
        : level === "HG-4"
          ? HG4_RELEASE_OWNERS.has(normalized.releasedBy)
          : false
  );
  if (level && !releaseOwnerAllowed) {
    pushCheck(checks, "block", "released_by.valid", "Release owner is not allowed for this HumanGate level", {
      released_by: normalized.releasedBy,
    });
  } else if (normalized.releasedBy) {
    pushCheck(checks, "pass", "released_by.valid", "Release owner is allowed for this level", {
      released_by: normalized.releasedBy,
    });
  } else {
    pushCheck(checks, "block", "released_by.valid", "released_by is required", {});
  }

  if (!Number.isFinite(normalized.confidence)) {
    pushCheck(checks, "block", "confidence.present", "founder_prediction_confidence is required", {});
  } else {
    const confidenceOk = normalized.confidence >= (threshold ?? 1);
    pushCheck(
      checks,
      confidenceOk ? "pass" : "block",
      "confidence.threshold",
      confidenceOk ? "Founder prediction confidence meets threshold" : "Founder prediction confidence is below threshold",
      { confidence: normalized.confidence, threshold },
    );
  }

  const blockedRequestedActions = requestedActionsContainBlockedAction(normalized.requestedActions);
  if (blockedRequestedActions.length && level === "HG-2.5") {
    const hg3Actions = requestedActionsContainHg25FounderOnlyAction(normalized.requestedActions);
    pushCheck(
      checks,
      hg3Actions.length ? "block" : "pass",
      "scope.hg25_release_actions",
      hg3Actions.length
        ? "HG-2.5 scope touches actions that require HG-3 CEO/Codex critical authority"
        : "HG-2.5 scope touches only CEO-autonomous release actions",
      {
        requested_actions: normalized.requestedActions,
        blocked_requested_actions: blockedRequestedActions,
        hg3_actions: hg3Actions,
      },
    );
  } else if (blockedRequestedActions.length && level === "HG-3") {
    const hg4Actions = requestedActionsContainHg3FounderOnlyAction(normalized.requestedActions);
    pushCheck(
      checks,
      hg4Actions.length ? "block" : "pass",
      "scope.hg3_critical_actions",
      hg4Actions.length
        ? "HG-3 scope touches strategic or non-restorable actions that require HG-4 Founder authority"
        : "HG-3 scope stays inside reversible CEO/Codex critical authority",
      {
        requested_actions: normalized.requestedActions,
        blocked_requested_actions: blockedRequestedActions,
        hg4_actions: hg4Actions,
      },
    );
  } else if (blockedRequestedActions.length && ["HG-3.5", "HG-4"].includes(level)) {
    pushCheck(checks, "pass", "scope.blocked_actions", `${level} is allowed to carry high-gate requested actions`, {
      requested_actions: normalized.requestedActions,
      blocked_requested_actions: blockedRequestedActions,
    });
  } else {
    pushCheck(
      checks,
      blockedRequestedActions.length ? "block" : "pass",
      "scope.blocked_actions",
      blockedRequestedActions.length ? "Requested scope touches non-delegable blocked actions" : "Requested scope avoids non-delegable blocked actions",
      { requested_actions: normalized.requestedActions, blocked_requested_actions: blockedRequestedActions },
    );
  }

  if (level === "HG-2.5") {
    const authority = String(normalized.releaseAuthority || "").trim();
    const authorityOk = ["CEO_AUTONOMOUS", "CEO", "Codex-GPT-5.5-xhigh"].includes(authority);
    pushCheck(
      checks,
      authorityOk ? "pass" : "block",
      "hg25.release_authority",
      authorityOk ? "HG-2.5 release authority is explicit" : "HG-2.5 requires release_authority CEO_AUTONOMOUS",
      { release_authority: authority },
    );

    const cao = normalized.caoVerdict;
    const caoStatus = isObject(cao) ? (cao.verdict || cao.status || cao.result) : cao;
    pushCheck(
      checks,
      statusIsPass(caoStatus) ? "pass" : "block",
      "hg25.cao_verdict",
      statusIsPass(caoStatus) ? "CAO/controller verdict is PASS" : "HG-2.5 requires CAO/controller PASS",
      { cao_verdict: caoStatus || null },
    );

    const rollbackVerification = normalized.rollbackVerification;
    const rollbackStatus = isObject(rollbackVerification)
      ? (rollbackVerification.status || rollbackVerification.result || rollbackVerification.verdict)
      : rollbackVerification;
    pushCheck(
      checks,
      rollbackVerification === true || statusIsPass(rollbackStatus) || String(rollbackStatus || "").toLowerCase() === "trivial"
        ? "pass"
        : "block",
      "hg25.rollback_verified",
      "HG-2.5 requires rollback to be verified or trivial",
      { rollback_verification: rollbackVerification },
    );

    const blast = normalized.blastRadius;
    const blastLevel = isObject(blast) ? String(blast.level || blast.risk || "").toLowerCase() : String(blast || "").toLowerCase();
    const blastOk = ["low", "medium", "staged", "canary", "trivial"].includes(blastLevel);
    pushCheck(
      checks,
      blastOk ? "pass" : "block",
      "hg25.blast_radius",
      blastOk ? "Blast radius is acceptable for autonomous CEO release" : "HG-2.5 requires low/medium/staged/canary blast radius",
      { blast_radius: blast },
    );
  }

  if (level === "HG-3") {
    const authority = String(normalized.releaseAuthority || "").trim();
    const authorityOk = ["CEO_CRITICAL", "CEO", "Codex-GPT-5.5-xhigh"].includes(authority);
    pushCheck(
      checks,
      authorityOk ? "pass" : "block",
      "hg3.release_authority",
      authorityOk ? "HG-3 CEO/Codex critical authority is explicit" : "HG-3 requires release_authority CEO_CRITICAL",
      { release_authority: authority },
    );

    const cao = normalized.caoVerdict;
    const caoStatus = isObject(cao) ? (cao.verdict || cao.status || cao.result) : cao;
    pushCheck(
      checks,
      statusIsPass(caoStatus) ? "pass" : "block",
      "hg3.cao_verdict",
      statusIsPass(caoStatus) ? "CAO/controller verdict is PASS" : "HG-3 requires CAO/controller PASS",
      { cao_verdict: caoStatus || null },
    );

    const rollbackVerification = normalized.rollbackVerification;
    const rollbackStatus = isObject(rollbackVerification)
      ? (rollbackVerification.status || rollbackVerification.result || rollbackVerification.verdict)
      : rollbackVerification;
    pushCheck(
      checks,
      rollbackVerification === true || statusIsPass(rollbackStatus)
        ? "pass"
        : "block",
      "hg3.rollback_verified",
      "HG-3 requires a verified rollback, snapshot or restore path before release",
      { rollback_verification: rollbackVerification },
    );
  }

  if (requireSourceOfTruth && normalized.sourceOfTruth.length === 0) {
    pushCheck(checks, "block", "source_of_truth.present", "SourceOfTruth is required", {});
  } else {
    for (const source of normalized.sourceOfTruth) {
      pushCheck(
        checks,
        pathExists(source) ? "pass" : "block",
        "source_of_truth.exists",
        pathExists(source) ? "SourceOfTruth exists" : "SourceOfTruth path or URL is missing",
        { source },
      );
    }
  }

  if (normalized.gates.length === 0) {
    pushCheck(checks, "block", "gates.present", "At least one executable gate result is required", {});
  }
  for (const gate of normalized.gates) {
    const id = gate.id || gate.name || "gate";
    const passed = statusIsPass(gate.status || gate.result || gate.verdict);
    const evidencePath = gate.evidence_path || gate.evidence || gate.report_path || "";
    pushCheck(checks, passed ? "pass" : "block", "gate.status", passed ? `${id} passed` : `${id} did not pass`, {
      gate: id,
      status: gate.status || gate.result || gate.verdict || "",
    });
    if (evidencePath) {
      pushCheck(
        checks,
        pathExists(evidencePath) ? "pass" : "block",
        "gate.evidence",
        pathExists(evidencePath) ? `${id} evidence exists` : `${id} evidence is missing`,
        { gate: id, evidence_path: evidencePath },
      );
    } else {
      pushCheck(checks, "block", "gate.evidence", `${id} evidence_path is required`, { gate: id });
    }
  }

  if (requireArtifactTruth && normalized.artifactTruth.length === 0) {
    pushCheck(checks, "block", "artifact_truth.present", "Artifact Truth report is required", {});
  }
  for (const artifact of normalized.artifactTruth) {
    const id = artifact.pipeline || artifact.id || "artifact_truth";
    const ok = artifact.ok === true || statusIsPass(artifact.status);
    const reportPath = artifact.report_path || artifact.path || artifact.evidence_path || "";
    pushCheck(checks, ok ? "pass" : "block", "artifact_truth.status", ok ? `${id} Artifact Truth passed` : `${id} Artifact Truth did not pass`, {
      pipeline: id,
      status: artifact.status || "",
      ok: artifact.ok,
    });
    if (reportPath) {
      pushCheck(
        checks,
        pathExists(reportPath) ? "pass" : "block",
        "artifact_truth.report_exists",
        pathExists(reportPath) ? `${id} Artifact Truth report exists` : `${id} Artifact Truth report missing`,
        { report_path: reportPath },
      );
    } else {
      pushCheck(checks, "block", "artifact_truth.report_exists", `${id} Artifact Truth report path is required`, {});
    }
    if (requireToday && artifact.date) {
      const today = localDate(now);
      pushCheck(
        checks,
        artifact.date === today ? "pass" : "block",
        "artifact_truth.require_today",
        artifact.date === today ? `${id} Artifact Truth is for today` : `${id} Artifact Truth is not for today`,
        { expected: today, actual: artifact.date },
      );
    }
  }

  if (requireBudget && !isObject(normalized.budget)) {
    pushCheck(checks, "block", "budget.present", "Budget decision is required", {});
  } else if (isObject(normalized.budget)) {
    const estimated = Number(normalized.budget.estimated_usd ?? normalized.budget.estimatedUsd ?? 0);
    const limit = Number(normalized.budget.limit_usd ?? normalized.budget.limitUsd ?? normalized.budget.max_run_usd);
    const status = normalized.budget.status || normalized.budget.result || "pass";
    pushCheck(checks, statusIsPass(status) ? "pass" : "block", "budget.status", "Budget status must pass", { status });
    if (Number.isFinite(limit)) {
      pushCheck(
        checks,
        Number.isFinite(estimated) && estimated <= limit ? "pass" : "block",
        "budget.limit",
        Number.isFinite(estimated) && estimated <= limit ? "Estimated cost is within budget" : "Estimated cost exceeds budget",
        { estimated_usd: estimated, limit_usd: limit },
      );
    } else {
      pushCheck(checks, "block", "budget.limit", "Budget limit is required", { estimated_usd: estimated });
    }
    if (normalized.budget.unknown_cost === true || normalized.budget.unknownCost === true) {
      pushCheck(checks, "block", "budget.unknown_cost", "Unknown-cost release is not allowed", {});
    } else {
      pushCheck(checks, "pass", "budget.unknown_cost", "Budget has no unknown-cost flag", {});
    }
  }

  if (requireRollback && !String(normalized.rollback || "").trim()) {
    pushCheck(checks, "block", "rollback.present", "Rollback path is required", {});
  } else if (String(normalized.rollback || "").trim()) {
    pushCheck(checks, "pass", "rollback.present", "Rollback path is named", { rollback: normalized.rollback });
  }

  if (normalized.generatedAt) {
    const generatedTime = Date.parse(normalized.generatedAt);
    const ageMinutes = (now.getTime() - generatedTime) / 60_000;
    pushCheck(
      checks,
      Number.isFinite(generatedTime) && ageMinutes >= 0 && ageMinutes <= maxAgeMinutes ? "pass" : "block",
      "freshness.age",
      Number.isFinite(generatedTime) && ageMinutes >= 0 && ageMinutes <= maxAgeMinutes
        ? "Decision card is fresh"
        : "Decision card is stale or has invalid generated_at",
      { generated_at: normalized.generatedAt, max_age_minutes: maxAgeMinutes, age_minutes: Number.isFinite(ageMinutes) ? Number(ageMinutes.toFixed(2)) : null },
    );
  } else {
    pushCheck(checks, "block", "freshness.generated_at", "generated_at is required", {});
  }

  const sensitiveHits = scanHumanGateSensitiveText(decisionText || JSON.stringify(decision));
  pushCheck(
    checks,
    sensitiveHits.length ? "block" : "pass",
    "privacy.no_sensitive_payload",
    sensitiveHits.length ? "Decision payload contains secrets or private context markers" : "Decision payload has no detected secrets/private markers",
    { sensitive_hits: sensitiveHits },
  );

  const blockers = checks.filter((check) => check.status === "block");
  return {
    schema_version: HUMAN_GATE_RELEASE_VERSION,
    generated_at: now.toISOString(),
    decision_path: decisionPath,
    ok: blockers.length === 0,
    status: blockers.length ? "blocked" : "pass",
    level,
    released_by: normalized.releasedBy,
    founder_prediction_confidence: Number.isFinite(normalized.confidence) ? normalized.confidence : null,
    threshold: threshold ?? null,
    blocker_count: blockers.length,
    check_count: checks.length,
    blockers,
    checks,
  };
}

function isoStamp(now) {
  return now.toISOString().replace(/[^0-9]/g, "").slice(0, 17);
}

export function buildHumanGateReleaseEvent({
  validation,
  decision,
  runId,
  issueId = "",
  sessionId = "",
  workspace = "registry:company-os",
  workspacePath,
  agent = "codex",
  mode = "release-gate",
  roleOwner = "CEO",
  department = "Operations",
  autonomyLevel = "L2",
  artifactPaths = [],
  linearCommentIds = [],
  now = new Date(),
} = {}) {
  if (!validation?.ok) throw new Error("Cannot build human_gate.released event from blocked validation.");
  if (!workspacePath || !path.isAbsolute(workspacePath)) throw new Error("workspacePath must be absolute.");
  const normalized = normalizeDecision(decision);
  return {
    schema_version: SCHEMA_VERSION,
    event_id: `${String(runId || "run")}-human_gate.released-${normalized.level}-${isoStamp(now)}`,
    event_type: "human_gate.released",
    occurred_at: now.toISOString(),
    producer: AUTONOMOUS_RELEASE_OWNERS.has(normalized.releasedBy) ? "controller" : "human",
    workspace,
    workspace_path: workspacePath,
    issue_id: String(issueId || ""),
    run_id: String(runId || ""),
    session_id: String(sessionId || ""),
    agent,
    mode,
    role_owner: roleOwner,
    department,
    autonomy_level: autonomyLevel,
    event_policy: "issue-state-from-agent-events",
    payload: {
      gate_owner: normalized.releasedBy,
      released_by: normalized.releasedBy,
      level: normalized.level,
      release_authority: normalized.releaseAuthority,
      founder_prediction_confidence: normalized.confidence,
      decision: normalized.release.decision || "release bounded HumanGate",
      requested_actions: normalized.requestedActions,
      conditions: asArray(normalized.release.conditions),
      blocked_actions_still_forbidden: normalized.blockedActionsStillForbidden,
      rollback_path: normalized.rollback,
      release_validation: {
        schema_version: validation.schema_version,
        status: validation.status,
        check_count: validation.check_count,
        blocker_count: validation.blocker_count,
        decision_path: validation.decision_path,
      },
    },
    artifact_paths: artifactPaths,
    linear_comment_ids: linearCommentIds,
    human_gate_required: false,
    redaction_level: "internal",
  };
}

export function renderHumanGateReleaseMarkdown(validation) {
  const lines = [
    `# HumanGate Release Validation - ${validation.level || "unknown"}`,
    "",
    `Status: \`${validation.status}\``,
    `Released By: \`${validation.released_by || "n/a"}\``,
    `Confidence: \`${validation.founder_prediction_confidence ?? "n/a"}\``,
    `Threshold: \`${validation.threshold ?? "n/a"}\``,
    `Checks: \`${validation.check_count}\``,
    `Blockers: \`${validation.blocker_count}\``,
    "",
    "## Blockers",
    "",
  ];
  lines.push(...(validation.blockers.length ? validation.blockers.map((item) => `- ${item.id}: ${item.message}`) : ["- none"]));
  lines.push("", "## Checks", "");
  for (const check of validation.checks) lines.push(`- \`${check.status}\` ${check.id}: ${check.message}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}
