import {
  requestedActionsContainBlockedAction,
  requestedActionsContainHg25FounderOnlyAction,
} from "./human-gate-release-core.mjs";

export const FAST_LANE_VERSION = "fast-lane-classifier/v1";

export const FAST_LANE_RINGS = ["R0", "R1", "R2", "R3", "R4"];

export const FAST_LANE_RING_POLICY = {
  R0: {
    name: "Read-only audit",
    policy: "Run automatically when budget and auth are green.",
    fast_lane_default: true,
  },
  R1: {
    name: "Reversible docs/contracts/reports",
    policy: "Run fast through Plane + dispatcher; CAO checks output.",
    fast_lane_default: true,
  },
  R2: {
    name: "Low-risk code/tools/tests",
    policy: "Run with HG-2.5, stream/heartbeat, scope guard and rollback.",
    fast_lane_default: true,
  },
  R3: {
    name: "Integration/release",
    policy: "CEO/Codex may push, mark Done or release only after CAO PASS and controller decision.",
    fast_lane_default: false,
  },
  R4: {
    name: "Production/regulated",
    policy: "Founder gate. No autonomous release.",
    fast_lane_default: false,
  },
};

const R3_RELEASE_ACTION_PATTERNS = [
  /\bmerge\b/i,
  /\bpush\b/i,
  /\bdeploy\b/i,
  /\brelease\b/i,
  /\bplane[-_\s]?done\b/i,
  /\blinear[-_\s]?done\b/i,
  /\bdone[-_\s]?transition\b/i,
  /\bpublish[-_\s]?live\b/i,
  /\blive[-_\s]?(?:publish|publishing|scheduling)\b/i,
  /\bpublic[-_\s]?publish(?:ing)?\b/i,
  /\bproduction[-_\s]?write\b/i,
];

const R4_PRODUCTION_REGULATED_PATTERNS = [
  /\bsecrets?\b/i,
  /\bsubscriptions?\b/i,
  /\bpayments?\b/i,
  /\birreversible\b/i,
  /\bmass[-_\s]?(?:mutation|delete|deletion)\b/i,
  /\bproduction[-_\s]?(?:db|database)\b/i,
  /\bdurable[-_\s]?(?:honcho|memory)[-_\s]?write\b/i,
  /\bautonomy[-_\s]?(?:promote|promotion|increase)?[-_\s]?L?[45]\b/i,
];

const R1_PATH_PATTERNS = [
  /^docs\//,
  /^reports\//,
  /^kits\/[^/]+\/(?:docs|charters|templates)\//,
  /^templates\//,
  /^README\.md$/,
];

const R2_PATH_PATTERNS = [
  /^scripts\//,
  /^evals\//,
  /^tests\//,
  /\.test\.[mc]?[jt]sx?$/,
];

const R3_INTERNAL_PATH_PATTERNS = [
  /^scripts\/runtime\//,
  /^scripts\/plane\/.*\.mjs$/,
  /^scripts\/linear\/.*\.mjs$/,
  /^scripts\/release-gates\/human-gate-release/,
];

const ALWAYS_FLY_REQUIRED_FIELDS = [
  "RoleLabel",
  "CapabilityProfile",
  "Workspace",
  "MaxRuntime",
  "MaxTurns",
  "Heartbeat",
  "KillSwitch",
  "Reporting",
  "AllowedWritePaths",
];

const CONTRACT_FIELD_ALIASES = {
  RoleLabel: ["RoleLabel", "rolelabel", "role_label", "role"],
  CapabilityProfile: ["CapabilityProfile", "capabilityprofile", "capability_profile"],
  Workspace: ["Workspace", "workspace"],
  MaxRuntime: ["MaxRuntime", "maxruntime", "max_runtime"],
  MaxTurns: ["MaxTurns", "maxturns", "max_turns"],
  Heartbeat: ["Heartbeat", "heartbeat"],
  KillSwitch: ["KillSwitch", "killswitch", "kill_switch"],
  Reporting: ["Reporting", "reporting"],
  AllowedWritePaths: ["AllowedWritePaths", "allowedwritepaths", "allowed_write_paths"],
};

function asArray(value) {
  if (value === null || value === undefined || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

function firstPresent(object, keys) {
  for (const key of keys) {
    const value = object?.[key];
    const present = Array.isArray(value) ? value.length > 0 : Boolean(value);
    if (present) return value;
  }
  return undefined;
}

function uniqueStrings(values) {
  return Array.from(new Set(values.map((value) => String(value || "")).filter(Boolean)));
}

function matchActionPatterns(values, patterns) {
  const hits = [];
  for (const value of values) {
    const text = String(value || "");
    if (patterns.some((pattern) => pattern.test(text))) hits.push(text);
  }
  return uniqueStrings(hits);
}

function matchPathPatterns(paths, patterns) {
  const hits = [];
  for (const value of paths) {
    const text = String(value || "");
    if (patterns.some((pattern) => pattern.test(text))) hits.push(text);
  }
  return uniqueStrings(hits);
}

export function classifyFastLaneRing(input = {}) {
  const actions = uniqueStrings(asArray(input.requested_actions ?? input.requestedActions ?? input.scope));
  const paths = uniqueStrings(asArray(
    input.paths_touched
      ?? input.pathsTouched
      ?? input.AllowedWritePaths
      ?? input.allowedwritepaths
      ?? input.allowed_write_paths,
  ));
  const readOnly = input.read_only === true || input.readOnly === true;

  const matched = {
    r4_actions: [],
    r3_actions: [],
    r3_internal_paths: [],
    r1_paths: [],
    r2_paths: [],
  };
  const reasons = [];

  matched.r4_actions = uniqueStrings([
    ...requestedActionsContainHg25FounderOnlyAction(actions),
    ...matchActionPatterns(actions, R4_PRODUCTION_REGULATED_PATTERNS),
  ]);

  matched.r3_actions = matchActionPatterns(actions, R3_RELEASE_ACTION_PATTERNS);
  matched.r3_internal_paths = matchPathPatterns(paths, R3_INTERNAL_PATH_PATTERNS);

  matched.r1_paths = matchPathPatterns(paths, R1_PATH_PATTERNS);

  const nonInternalPaths = paths.filter(
    (value) => !R3_INTERNAL_PATH_PATTERNS.some((pattern) => pattern.test(value)),
  );
  matched.r2_paths = matchPathPatterns(nonInternalPaths, R2_PATH_PATTERNS);

  if (matched.r4_actions.length) {
    reasons.push("R4: requested action matches founder-only/production/regulated pattern.");
    return { ring: "R4", reasons, matched };
  }

  if (matched.r3_actions.length || matched.r3_internal_paths.length) {
    if (matched.r3_actions.length) reasons.push("R3: requested action matches release/integration pattern.");
    if (matched.r3_internal_paths.length) {
      reasons.push("R3: paths touch runtime dispatcher, Plane API, Linear API or release validator internals.");
    }
    return { ring: "R3", reasons, matched };
  }

  if (readOnly) {
    reasons.push("R0: caller declared the work as read-only audit.");
    return { ring: "R0", reasons, matched };
  }

  if (paths.length === 0 && actions.length === 0) {
    reasons.push("R0: no actions or paths declared; treat as read-only by default.");
    return { ring: "R0", reasons, matched };
  }

  if (paths.length > 0 && matched.r1_paths.length === paths.length) {
    reasons.push("R1: every touched path is a reversible docs/contracts/reports surface.");
    return { ring: "R1", reasons, matched };
  }

  const r1OrR2Hits = new Set([...matched.r1_paths, ...matched.r2_paths]);
  if (paths.length > 0 && paths.every((value) => r1OrR2Hits.has(value))) {
    reasons.push("R2: touched paths are low-risk code/tools/tests.");
    return { ring: "R2", reasons, matched };
  }

  reasons.push("R3 (default): touched paths or actions are not recognized as fast-lane safe; require integration controls.");
  return { ring: "R3", reasons, matched };
}

export function evaluateFastLaneEligibility(input = {}, ring = "") {
  const blockers = [];

  if (!["R1", "R2"].includes(ring)) {
    blockers.push({ id: "ring.not_fast_lane", message: `Always-Fly applies only to R1/R2 (got ${ring || "n/a"}).` });
  }

  const contract = input.contract || {};
  for (const field of ALWAYS_FLY_REQUIRED_FIELDS) {
    const value = firstPresent(contract, CONTRACT_FIELD_ALIASES[field] || [field]);
    const present = Array.isArray(value) ? value.length > 0 : Boolean(value);
    if (!present) blockers.push({ id: `contract.${field}`, message: `Contract field ${field} is required for Always-Fly.` });
  }

  if (input.has_runtime_stream !== true && input.runtimeStream !== true) {
    blockers.push({ id: "telemetry.runtime_stream", message: "Runtime Dispatcher v1.2 must stream output to .stream.jsonl." });
  }
  if (input.heartbeat_active !== true && input.heartbeatActive !== true) {
    blockers.push({ id: "telemetry.heartbeat", message: "Heartbeat telemetry must be active." });
  }

  const scopeGuard = String(input.scope_guard ?? input.scopeGuard ?? "").toLowerCase();
  const auditOnly = input.audit_only === true || input.auditOnly === true;
  if (scopeGuard !== "kill" && !auditOnly) {
    blockers.push({ id: "scope_guard.kill", message: "Scope guard must be 'kill' unless work item is explicitly audit-only." });
  }

  if (input.cao_in_loop !== true && input.caoInLoop !== true) {
    blockers.push({ id: "loop.cao", message: "CAO must be in the loop." });
  }
  if (input.controller_in_loop !== true && input.controllerInLoop !== true) {
    blockers.push({ id: "loop.controller", message: "Codex Controller decision must be in the loop." });
  }

  if (input.rollback_trivial !== true && input.rollbackTrivial !== true) {
    blockers.push({ id: "rollback.trivial", message: "Rollback must be trivial (revert commit, restore file, delete artifact, mark run rejected)." });
  }

  return {
    ring,
    eligible: blockers.length === 0,
    blocker_count: blockers.length,
    blockers,
  };
}

export function evaluateFastLaneRequest(input = {}) {
  const classification = classifyFastLaneRing(input);
  const policy = FAST_LANE_RING_POLICY[classification.ring];
  const eligibility = evaluateFastLaneEligibility(input, classification.ring);
  const nonDelegableActions = requestedActionsContainBlockedAction(
    asArray(input.requested_actions ?? input.requestedActions ?? input.scope),
  );
  const fastLaneEligible = ["R0", "R1", "R2"].includes(classification.ring);
  const alwaysFly = fastLaneEligible && classification.ring !== "R0" && eligibility.eligible;

  return {
    schema_version: FAST_LANE_VERSION,
    ring: classification.ring,
    policy,
    reasons: classification.reasons,
    matched: classification.matched,
    fast_lane_eligible: fastLaneEligible,
    always_fly: alwaysFly,
    eligibility,
    non_delegable_actions: nonDelegableActions,
  };
}
