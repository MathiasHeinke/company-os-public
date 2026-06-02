/*
 * scheduler-stage-0506-core.mjs
 *
 * Closed-loop pre-dispatch glue that wires Stage 0.5 (Contract Controller)
 * and Stage 0.6 (Contract Remediation Router) into a single scheduler
 * decision: should the dispatcher lock and spawn, or must the work item be
 * routed to a C-Level seat for repair first?
 *
 * Pure functions only. No fetch, no spawn, no Plane writes, no fs writes.
 * The CLI (`scheduler-stage-0506.mjs`) is the I/O wrapper.
 *
 * Source of truth:
 *   docs/orchestration/contract-controller.md
 *   docs/orchestration/contract-remediation-router.md
 *   docs/orchestration/company-os-runtime-dispatcher-v1.md
 */

import {
  CONTRACT_REVIEW_TITLE,
  CONTRACT_REVIEW_VERDICTS,
  buildContractReviewYaml,
  evaluateContractForDispatch,
} from "./contract-controller.mjs";
import {
  CONTRACT_REMEDIATION_TITLE,
  REMEDIATION_REASON_CODES,
  buildRemediationYaml,
  routeContractRemediation,
} from "./contract-remediation-router.mjs";
import { canonicalDescriptionHash, stripHtml } from "./plane-html.mjs";
import { formatPlaneWorkItemSequence } from "./runtime-dispatcher-v12-core.mjs";
import { extractContractBlock } from "./worker-ledger-validator.mjs";

export const SCHEDULER_STAGE_0506_VERSION = "scheduler-stage-0506-v0";
export const EXECUTIVE_ROUTING_TITLE = "controller.executive-routing";

export const SCHEDULER_DECISIONS = Object.freeze({
  LOCK_ALLOWED: "lock-allowed",
  LOCK_ALLOWED_EXECUTIVE_FIRST: "lock-allowed-executive-first",
  LOCK_ALLOWED_DIRECT_CHILD: "lock-allowed-direct-child",
  LOCK_BLOCKED_REMEDIATION: "lock-blocked-remediation",
  LOCK_BLOCKED_OWNER_MISSING: "lock-blocked-owner-missing",
  LOCK_BLOCKED_CEO_GATE: "lock-blocked-ceo-gate",
  LOCK_BLOCKED_FOUNDER_GATE: "lock-blocked-founder-gate",
  LOCK_BLOCKED_REVIEW_UNKNOWN: "lock-blocked-review-unknown",
  LOCK_BLOCKED_EXECUTIVE_MISSING_PROFILE: "lock-blocked-executive-missing-profile",
  LOCK_BLOCKED_EXECUTIVE_OVER_BUDGET: "lock-blocked-executive-over-budget",
  LOCK_BLOCKED_EXECUTIVE_OVER_LANE: "lock-blocked-executive-over-lane",
});

export const EXECUTIVE_FIRST_REASON_CODES = Object.freeze({
  EXECUTIVE_FIRST: "scheduler.executive-first-routing",
  DIRECT_CHILD_FALLBACK: "scheduler.direct-child-fallback",
  MISSING_PROFILE: "scheduler.executive-missing-profile",
  OVER_BUDGET: "scheduler.executive-over-budget",
  OVER_LANE: "scheduler.executive-over-lane",
});

export const EXECUTIVE_LANE_KEY = "department_executive_v0";
export const EXECUTIVE_FIRST_CHILD_COUNT_THRESHOLD_DEFAULT = 3;

const EXECUTIVE_ROLE_LABELS = Object.freeze(new Set([
  "role:cto",
  "role:cmo",
  "role:coo",
  "role:cpo",
  "role:cfo",
]));

const EXECUTIVE_PROFILE_PATTERN = /^claude-clevel-worker\/(cto|cmo|coo|cpo|cfo)\/runtime$/;

const REQUIRED_BLOCKED_ACTION_TOKENS = Object.freeze([
  "plane-done-by-worker",
  "push",
  "merge",
  "deploy",
  "publish",
  "schedule",
  "send",
  "import",
  "capability-profile-expansion",
  "runtime-auth-expansion",
]);

const ELIGIBLE_HUMAN_GATES = Object.freeze(new Set(["HG-1", "HG-2"]));

/**
 * Pure executive-first routing evaluator.
 *
 * Implements the policy proposed in
 * `reports/department-executive-runtime/[WORK_ITEM_ID]-policy.md`
 * sections 3 (triggers/anti-triggers) and 4 (controller-readable reason
 * codes). The evaluator is additive: it returns `null` (fall through to the
 * existing direct-dispatch flow) unless the work item matches the executive-
 * first hard triggers T1..T5 AND no anti-trigger A1..A7 fires.
 *
 * The function performs no I/O, no Plane write, no scheduler activation, and
 * no auto-flip of child items. Inserting the executive layer at runtime is
 * the caller's responsibility (HG-2.5 release card); this evaluator only
 * proposes a decision.
 *
 * @param {object} options
 * @param {object} options.contractFields - flat parsed contract block; field
 *   names follow `parseContractText` lowercase convention.
 * @param {string[]} options.labelNames - Plane label names resolved on item.
 * @param {object|null} options.capabilityRegistry - loaded capability
 *   registry (see `loadCapabilityRegistry`). Optional; when omitted, the
 *   evaluator fails closed with `MISSING_PROFILE`.
 * @param {number} options.childCountThreshold - `N_child_threshold` from
 *   [WORK_ITEM_ID] section 3.2. Defaults to 3.
 * @returns {null | object} either `null` (no executive-first routing) or
 *   `{ decision, reason_codes, capability_profile_id, evidence }`.
 */
export function evaluateExecutiveFirstRouting({
  contractFields = {},
  labelNames = [],
  capabilityRegistry = null,
  childCountThreshold = EXECUTIVE_FIRST_CHILD_COUNT_THRESHOLD_DEFAULT,
} = {}) {
  const roleLabels = (labelNames || []).filter((name) => typeof name === "string" && name.startsWith("role:"));

  // A1: role:cao is never an executive-first lane.
  if (roleLabels.includes("role:cao")) return null;

  // T1: role:* in {cto, cmo, coo, cpo, cfo}.
  const hasExecutiveRole = roleLabels.some((label) => EXECUTIVE_ROLE_LABELS.has(label));
  if (!hasExecutiveRole) return null;

  // A7: SubAgentRoster non-empty is out of band for v0 lane.
  const subAgentRosterRaw = stringField(contractFields, ["SubAgentRoster", "subagentroster", "subagent_roster"]);
  if (subAgentRosterRaw && !/^(none|\[\])\s*$/i.test(subAgentRosterRaw.trim())) {
    return null;
  }

  // T2: explicit parent_runner key OR scope keywords + N child items.
  const parentRunner = stringField(contractFields, ["parent_runner", "ParentRunner", "parentrunner"]).trim().toLowerCase();
  const explicitParentRunner = parentRunner === "department-executive-v0";
  const dependsOn = arrayField(contractFields, ["depends_on", "DependsOn", "dependson", "child_items", "childitems"]);
  const scopeText = stringifyValue(contractFields.scope || contractFields.Scope || "").toLowerCase();
  const hasScopeKeyword = /\b(supervise|parent objective|children|closeout)\b/.test(scopeText);
  const meetsT2 = explicitParentRunner || (hasScopeKeyword && dependsOn.length >= childCountThreshold);
  if (!meetsT2) return null;

  // A5: tiny bounded items stay on the direct-dispatch path.
  if (
    !explicitParentRunner &&
    dependsOn.length < childCountThreshold &&
    /\b(single report|single edit|single audit|one report|tiny bounded|bounded artifact)\b/.test(scopeText)
  ) {
    return null;
  }

  // T3: CapabilityProfile resolves to claude-clevel-worker/{cto,cmo,coo,cpo,cfo}/runtime.
  const profileId = stringField(contractFields, ["CapabilityProfile", "capabilityprofile", "capability_profile"]).trim();
  if (!EXECUTIVE_PROFILE_PATTERN.test(profileId)) return null;

  // T4: human_gate floor + complete BlockedActions enumeration.
  const humanGate = stringField(contractFields, ["human_gate", "HumanGate", "humangate", "HumanGateLevel", "humangatelevel"]).trim().toUpperCase();
  if (!ELIGIBLE_HUMAN_GATES.has(humanGate)) return null;

  const blockedActionsText = stringifyValue(
    contractFields.BlockedActions
    ?? contractFields.blocked_actions
    ?? contractFields.blockedactions
    ?? "",
  ).toLowerCase();
  const blockedTokensPresent = REQUIRED_BLOCKED_ACTION_TOKENS.every((token) =>
    blockedActionsText.includes(token),
  );
  if (!blockedTokensPresent) return null;

  // Registry lookup: lane metadata must exist for an executive-first lock.
  const profile = (capabilityRegistry?.profiles || []).find((entry) => entry?.id === profileId);
  const lane = profile?.lanes?.[EXECUTIVE_LANE_KEY] || null;
  if (!lane) {
    return {
      decision: SCHEDULER_DECISIONS.LOCK_BLOCKED_EXECUTIVE_MISSING_PROFILE,
      reason_codes: [EXECUTIVE_FIRST_REASON_CODES.MISSING_PROFILE],
      capability_profile_id: profileId,
      evidence: {
        triggers: ["T1", "T2", "T3", "T4"],
        profile_found: Boolean(profile),
        lane_key: EXECUTIVE_LANE_KEY,
      },
    };
  }

  // T5 / over-lane: AllowedWritePaths must be inside lane.allowed_write_paths_lane.
  const allowedWritePaths = arrayField(contractFields, [
    "AllowedWritePaths",
    "allowedwritepaths",
    "allowed_write_paths",
  ]);
  const lanePaths = Array.isArray(lane.allowed_write_paths_lane)
    ? lane.allowed_write_paths_lane.filter((p) => typeof p === "string" && p.length > 0)
    : [];
  if (allowedWritePaths.length === 0 || !allowedWritePaths.every((p) => isPathWithinLane(p, lanePaths))) {
    return {
      decision: SCHEDULER_DECISIONS.LOCK_BLOCKED_EXECUTIVE_OVER_LANE,
      reason_codes: [EXECUTIVE_FIRST_REASON_CODES.OVER_LANE],
      capability_profile_id: profileId,
      evidence: {
        allowed_write_paths: allowedWritePaths,
        allowed_write_paths_lane: lanePaths,
      },
    };
  }

  // Over-budget: contract intervention_budget must not exceed lane defaults.
  const budget = readInterventionBudget(contractFields);
  const laneBudget = lane.intervention_budget || {};
  if (budget && isInterventionBudgetOverLane(budget, laneBudget)) {
    return {
      decision: SCHEDULER_DECISIONS.LOCK_BLOCKED_EXECUTIVE_OVER_BUDGET,
      reason_codes: [EXECUTIVE_FIRST_REASON_CODES.OVER_BUDGET],
      capability_profile_id: profileId,
      evidence: {
        intervention_budget: budget,
        lane_intervention_budget: laneBudget,
      },
    };
  }

  return {
    decision: SCHEDULER_DECISIONS.LOCK_ALLOWED_EXECUTIVE_FIRST,
    reason_codes: [EXECUTIVE_FIRST_REASON_CODES.EXECUTIVE_FIRST],
    capability_profile_id: profileId,
    evidence: {
      triggers: ["T1", "T2", "T3", "T4", "T5"],
      child_count: dependsOn.length,
      child_count_threshold: childCountThreshold,
      parent_runner_inference: explicitParentRunner ? "explicit" : "heuristic",
    },
  };
}

function stringField(fields, keys) {
  for (const key of keys) {
    const value = fields?.[key];
    if (typeof value === "string") return value;
  }
  return "";
}

function arrayField(fields, keys) {
  for (const key of keys) {
    const value = fields?.[key];
    if (Array.isArray(value)) {
      return value.map((entry) => String(entry).trim()).filter(Boolean);
    }
    if (typeof value === "string" && value.length > 0) {
      return value.split(/[,;\s\n]+/).map((entry) => entry.trim()).filter(Boolean);
    }
  }
  return [];
}

function stringifyValue(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(stringifyValue).join("\n");
  return String(value);
}

function isPathWithinLane(candidate, lanePaths) {
  const normalized = String(candidate || "").trim();
  if (!normalized) return false;
  return lanePaths.some((lanePath) => {
    const lane = String(lanePath || "").trim();
    if (!lane) return false;
    if (lane.includes("**")) return wildcardLanePathMatches(normalized, lane);
    if (normalized === lane) return true;
    if (lane.endsWith("/")) return normalized.startsWith(lane);
    return normalized === lane || normalized.startsWith(`${lane}/`);
  });
}

function wildcardLanePathMatches(candidate, lanePath) {
  const escapedPattern = lanePath.split("**").map(escapeRegExp).join(".+");
  const suffix = lanePath.endsWith("/") ? ".*" : "";
  return new RegExp(`^${escapedPattern}${suffix}$`).test(candidate);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readInterventionBudget(contractFields) {
  const candidate = contractFields?.intervention_budget
    ?? contractFields?.InterventionBudget
    ?? contractFields?.interventionbudget
    ?? null;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  return candidate;
}

function isInterventionBudgetOverLane(budget, laneBudget) {
  const ceoMechTarget = toFiniteNumber(budget.ceo_mechanical_target);
  if (ceoMechTarget !== null && ceoMechTarget > 0) return true;
  const ceoMechHard = toFiniteNumber(budget.ceo_mechanical_hard_limit);
  if (ceoMechHard !== null) {
    const laneCeoMechHard = toFiniteNumber(laneBudget.ceo_mechanical_hard_limit) ?? 0;
    if (ceoMechHard > laneCeoMechHard) return true;
  }
  const ceoDecisionHard = toFiniteNumber(budget.ceo_decision_hard_limit);
  if (ceoDecisionHard !== null) {
    const laneCeoDecisionHard = toFiniteNumber(laneBudget.ceo_decision_hard_limit) ?? 3;
    if (ceoDecisionHard > laneCeoDecisionHard) return true;
  }
  const ceoDecisionTarget = toFiniteNumber(budget.ceo_decision_target);
  if (ceoDecisionTarget !== null) {
    const laneCeoDecisionTarget = toFiniteNumber(laneBudget.ceo_decision_target) ?? 1;
    if (ceoDecisionTarget > laneCeoDecisionTarget) return true;
  }
  return false;
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Decide whether the scheduler may lock+spawn for a Plane work item.
 *
 * The decision is computed from the current Plane description (Stage 0.5)
 * and, when Stage 0.5 is not PASS, the corresponding Stage 0.6 remediation
 * route. The function never writes anywhere; it returns the YAML payloads
 * that the scheduler should ask the Stage 0.5 / Stage 0.6 post-mode CLIs
 * to write.
 *
 * @param {object} options
 * @param {object} options.item - the Plane work item (description_html etc.)
 * @param {string[]} options.labelNames - resolved label names on the item
 * @param {string} [options.reviewer="scheduler"] - signed_at reviewer field
 * @param {Date} [options.now=new Date()] - clock injection for tests
 * @returns {object} closed-loop decision
 */
export function decideSchedulerStage0506({
  item = {},
  labelNames = [],
  comments = [],
  reviewer = "scheduler",
  now = new Date(),
  capabilityRegistry = null,
} = {}) {
  const humanGateRelease = findHumanGateRelease(comments);
  const review = evaluateContractForDispatch({ item, labelNames, now, humanGateRelease });
  const reviewYaml = buildContractReviewYaml({ review, item, reviewer });
  const contractReview = {
    verdict: review.verdict,
    ok: review.ok,
    reason_codes: review.reason_codes,
    suggestions: review.suggestions,
    description_hash: review.evidence.description_hash,
    yaml: reviewYaml,
    comment_title: CONTRACT_REVIEW_TITLE,
  };

  if (review.verdict === CONTRACT_REVIEW_VERDICTS.PASS) {
    const description = stripHtml(item.description_html || item.description_stripped || item.description || "");
    const extracted = extractContractBlock(description);
    const contractFields = extracted.ok ? { ...extracted.fields } : {};
    const interventionBudget = extractInterventionBudgetBlock(description);
    if (interventionBudget) contractFields.intervention_budget = interventionBudget;

    const routing = evaluateExecutiveFirstRouting({
      contractFields,
      labelNames,
      capabilityRegistry,
    });

    const commentsToPost = [{ title: CONTRACT_REVIEW_TITLE, yaml: reviewYaml }];
    let allowLock = true;
    let decisionCode = SCHEDULER_DECISIONS.LOCK_ALLOWED;
    let executiveRouting = null;
    if (routing) {
      allowLock = routing.decision === SCHEDULER_DECISIONS.LOCK_ALLOWED_EXECUTIVE_FIRST;
      decisionCode = routing.decision;
      const routingYaml = buildExecutiveRoutingYaml({
        routing,
        item,
        reviewer,
        descriptionHash: review.evidence.description_hash,
        signedAt: now.toISOString(),
      });
      executiveRouting = {
        decision: routing.decision,
        allow_lock: allowLock,
        reason_codes: routing.reason_codes,
        capability_profile_id: routing.capability_profile_id,
        evidence: routing.evidence,
        yaml: routingYaml,
        comment_title: EXECUTIVE_ROUTING_TITLE,
      };
      commentsToPost.push({ title: EXECUTIVE_ROUTING_TITLE, yaml: routingYaml });
    }

    return {
      version: SCHEDULER_STAGE_0506_VERSION,
      allow_lock: allowLock,
      decision: decisionCode,
      contract_review: contractReview,
      remediation_route: null,
      remediation_yaml: null,
      remediation_comment_title: null,
      executive_routing: executiveRouting,
      comments_to_post: commentsToPost,
      decided_at: now.toISOString(),
    };
  }

  // For non-PASS, synthesize a "latestReview" object so Stage 0.6 can route
  // against the freshly computed verdict and the current description hash.
  const synthesizedReview = {
    comment_id: null,
    created_at: now.toISOString(),
    fields: {
      verdict: review.verdict,
      description_hash: review.evidence.description_hash,
    },
  };
  const route = routeContractRemediation({
    item,
    labelNames,
    latestReview: synthesizedReview,
    now,
  });
  const routeYaml = buildRemediationYaml({ route, reviewer });

  let decision = SCHEDULER_DECISIONS.LOCK_BLOCKED_REMEDIATION;
  if (route.reason_codes.includes(REMEDIATION_REASON_CODES.OWNER_MISSING)) {
    decision = SCHEDULER_DECISIONS.LOCK_BLOCKED_OWNER_MISSING;
  } else if (route.ceo_gate_required) {
    decision = SCHEDULER_DECISIONS.LOCK_BLOCKED_CEO_GATE;
  } else if (route.founder_gate_required) {
    decision = SCHEDULER_DECISIONS.LOCK_BLOCKED_FOUNDER_GATE;
  } else if (route.reason_codes.includes(REMEDIATION_REASON_CODES.UNKNOWN_VERDICT)) {
    decision = SCHEDULER_DECISIONS.LOCK_BLOCKED_REVIEW_UNKNOWN;
  }

  return {
    version: SCHEDULER_STAGE_0506_VERSION,
    allow_lock: false,
    decision,
    contract_review: contractReview,
    remediation_route: route,
    remediation_yaml: routeYaml,
    remediation_comment_title: CONTRACT_REMEDIATION_TITLE,
    executive_routing: null,
    comments_to_post: [
      { title: CONTRACT_REVIEW_TITLE, yaml: reviewYaml },
      { title: CONTRACT_REMEDIATION_TITLE, yaml: routeYaml },
    ],
    decided_at: now.toISOString(),
  };
}

/**
 * Extract the nested `intervention_budget:` YAML block from a worker contract
 * description. `extractContractBlock` only parses flat key:value pairs, so
 * any nested block (e.g. the intervention_budget defaults declared by the
 * department-executive parent-runner template) is lost. The evaluator needs
 * the structured object to compare against the lane defaults.
 *
 * Returns null when no block is present or when no scalar children parse.
 */
export function extractInterventionBudgetBlock(text) {
  if (!text || typeof text !== "string") return null;
  const lines = text.split(/\r?\n/);
  let baseIndent = -1;
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^(\s*)intervention_budget\s*:\s*$/);
    if (match) {
      baseIndent = match[1].length;
      start = i + 1;
      break;
    }
  }
  if (start === -1) return null;
  const out = {};
  for (let i = start; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const childMatch = raw.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!childMatch || childMatch[1].length <= baseIndent) break;
    const value = childMatch[3].trim();
    if (/^-?\d+(?:\.\d+)?$/.test(value)) {
      out[childMatch[2]] = Number(value);
    } else {
      out[childMatch[2]] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function buildExecutiveRoutingYaml({ routing, item, reviewer = "scheduler", descriptionHash = "", signedAt }) {
  const sequence = formatPlaneWorkItemSequence(item);
  const reasons = routing.reason_codes?.length ? routing.reason_codes.join(", ") : "none";
  const hash = descriptionHash || canonicalDescriptionHash(item);
  const signed = signedAt || new Date().toISOString();
  const allowLock = routing.decision === SCHEDULER_DECISIONS.LOCK_ALLOWED_EXECUTIVE_FIRST;
  const lines = [
    `${EXECUTIVE_ROUTING_TITLE}:`,
    `  version: ${SCHEDULER_STAGE_0506_VERSION}`,
    `  work_item: ${sequence}`,
    `  reviewer: ${reviewer}`,
    `  decision: ${routing.decision}`,
    `  allow_lock: ${allowLock}`,
    `  capability_profile: ${routing.capability_profile_id || "none"}`,
    `  reason_codes: ${reasons}`,
    `  description_hash: ${hash}`,
  ];
  const ev = routing.evidence || {};
  if (typeof ev.child_count === "number") lines.push(`  child_count: ${ev.child_count}`);
  if (typeof ev.child_count_threshold === "number") lines.push(`  child_count_threshold: ${ev.child_count_threshold}`);
  if (ev.parent_runner_inference) lines.push(`  parent_runner_inference: ${ev.parent_runner_inference}`);
  if (typeof ev.lane_key === "string") lines.push(`  lane_key: ${ev.lane_key}`);
  lines.push(`  signed_at: ${signed}`);
  return lines.join("\n");
}

export function findHumanGateRelease(comments = []) {
  const sorted = [...(comments || [])].sort((a, b) => {
    const aTime = Date.parse(a?.created_at || "") || 0;
    const bTime = Date.parse(b?.created_at || "") || 0;
    return bTime - aTime;
  });
  for (const row of sorted) {
    const body = stripHtml(row?.comment_html || row?.comment_stripped || "");
    if (!/human_gate\.released/i.test(body)) continue;
    return {
      ok: true,
      source: "human_gate.released",
      comment_id: row.id || null,
      created_at: row.created_at || null,
    };
  }
  return null;
}
