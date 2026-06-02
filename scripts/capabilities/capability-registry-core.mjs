import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const DEFAULT_CAPABILITY_REGISTRY_PATH = "registries/capabilities/company-os.json";

export const CAPABILITY_REASONS = Object.freeze({
  PROFILE_MISSING: "capability.profile-missing",
  PROFILE_NOT_FOUND: "capability.profile-not-found",
  STALE: "capability.stale",
  UNDECLARED_TOOL: "capability.undeclared-tool",
  MEMORY_BOUNDARY_VIOLATION: "capability.memory-boundary-violation",
  AUTONOMY_TOO_HIGH: "capability.autonomy-too-high",
  REGISTRY_INVALID: "capability.registry-invalid"
});

export const SANDBOX_PATTERN_REASONS = Object.freeze({
  EMPTY: "sandbox-pattern-empty",
  NOT_ABSOLUTE: "sandbox-pattern-not-absolute",
  TRAVERSAL: "sandbox-pattern-traversal",
  WILDCARD_NOT_FINAL: "sandbox-pattern-wildcard-not-final"
});

const AUTONOMY_ORDER = Object.freeze({
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
  L5: 5
});

const REQUIRED_PROFILE_FIELDS = Object.freeze([
  "id",
  "role",
  "agents",
  "modes",
  "workspaces",
  "max_autonomy_level",
  "last_verified_at",
  "stale_after_days"
]);

export function loadCapabilityRegistry(path = DEFAULT_CAPABILITY_REGISTRY_PATH) {
  try {
    const raw = readFileSync(resolve(path), "utf8");
    const registry = JSON.parse(raw);
    const validation = validateCapabilityRegistry(registry);
    if (!validation.ok) {
      return {
        ok: false,
        registry,
        reason_codes: validation.reason_codes,
        evidence: validation.evidence
      };
    }
    return {
      ok: true,
      registry,
      reason_codes: [],
      evidence: validation.evidence
    };
  } catch (error) {
    return {
      ok: false,
      registry: null,
      reason_codes: [CAPABILITY_REASONS.REGISTRY_INVALID],
      evidence: { error: String(error.message || error) }
    };
  }
}

export function validateCapabilityRegistry(registry) {
  const reasonCodes = [];
  const profileIds = [];

  if (!registry || typeof registry !== "object") {
    return invalid(["registry-not-object"]);
  }
  if (registry.version !== "capability-registry/v0") {
    reasonCodes.push(CAPABILITY_REASONS.REGISTRY_INVALID);
  }
  if (!Array.isArray(registry.profiles)) {
    reasonCodes.push(CAPABILITY_REASONS.REGISTRY_INVALID);
  }

  const seen = new Set();
  for (const profile of registry.profiles || []) {
    if (!profile || typeof profile !== "object") {
      reasonCodes.push(CAPABILITY_REASONS.REGISTRY_INVALID);
      continue;
    }
    for (const field of REQUIRED_PROFILE_FIELDS) {
      if (profile[field] === undefined || profile[field] === null || profile[field] === "") {
        reasonCodes.push(CAPABILITY_REASONS.REGISTRY_INVALID);
      }
    }
    if (profile.id) {
      profileIds.push(profile.id);
      if (seen.has(profile.id)) {
        reasonCodes.push(CAPABILITY_REASONS.REGISTRY_INVALID);
      }
      seen.add(profile.id);
    }
    if (profile.last_verified_at && Number.isNaN(Date.parse(profile.last_verified_at))) {
      reasonCodes.push(CAPABILITY_REASONS.REGISTRY_INVALID);
    }
    if (!Number.isInteger(Number(profile.stale_after_days)) || Number(profile.stale_after_days) < 1) {
      reasonCodes.push(CAPABILITY_REASONS.REGISTRY_INVALID);
    }
    if (!AUTONOMY_ORDER[normalizeAutonomy(profile.max_autonomy_level)]) {
      if (normalizeAutonomy(profile.max_autonomy_level) !== "L0") {
        reasonCodes.push(CAPABILITY_REASONS.REGISTRY_INVALID);
      }
    }
    if (profile.sandbox_workspaces !== undefined) {
      if (!Array.isArray(profile.sandbox_workspaces)) {
        reasonCodes.push(CAPABILITY_REASONS.REGISTRY_INVALID);
      } else {
        for (const pattern of profile.sandbox_workspaces) {
          if (validateSandboxPatternEntry(pattern).length > 0) {
            reasonCodes.push(CAPABILITY_REASONS.REGISTRY_INVALID);
            break;
          }
        }
      }
    }
  }

  const uniqueReasons = [...new Set(reasonCodes)];
  return {
    ok: uniqueReasons.length === 0,
    reason_codes: uniqueReasons,
    evidence: {
      version: registry.version,
      profile_count: Array.isArray(registry.profiles) ? registry.profiles.length : 0,
      profile_ids: profileIds
    }
  };
}

export function evaluateCapabilityProfile({
  contractFields = {},
  registry,
  usedCapabilities = {},
  now = new Date()
} = {}) {
  const reasonCodes = [];
  const normalizedFields = normalizeContractFields(contractFields);
  const profileId = normalizedFields.capabilityprofile || normalizedFields.capability_profile;
  const agent = normalizeName(normalizedFields.agent);

  const registryValidation = validateCapabilityRegistry(registry);
  if (!registryValidation.ok) {
    return {
      ok: false,
      reason_codes: registryValidation.reason_codes,
      evidence: registryValidation.evidence
    };
  }

  if (!profileId) {
    if (agent && agent !== "human") {
      return {
        ok: false,
        reason_codes: [CAPABILITY_REASONS.PROFILE_MISSING],
        evidence: {
          agent: normalizedFields.agent || null,
          profile_id: null
        }
      };
    }
    return {
      ok: true,
      reason_codes: [],
      evidence: {
        skipped: true,
        reason: agent === "human" ? "human-agent-profile-optional" : "no-agent-declared"
      }
    };
  }

  const profile = registry.profiles.find((entry) => entry.id === String(profileId).trim());
  if (!profile) {
    return {
      ok: false,
      reason_codes: [CAPABILITY_REASONS.PROFILE_NOT_FOUND],
      evidence: {
        profile_id: String(profileId).trim(),
        known_profiles: registry.profiles.map((entry) => entry.id)
      }
    };
  }

  if (isProfileStale(profile, now)) {
    reasonCodes.push(CAPABILITY_REASONS.STALE);
  }

  if (normalizedFields.agent && !hasAllowed(profile.agents, normalizedFields.agent)) {
    reasonCodes.push(CAPABILITY_REASONS.UNDECLARED_TOOL);
  }
  if (normalizedFields.role && normalizeName(normalizedFields.role) !== normalizeName(profile.role)) {
    reasonCodes.push(CAPABILITY_REASONS.UNDECLARED_TOOL);
  }
  if (normalizedFields.rolelabel && normalizeName(normalizedFields.rolelabel) !== normalizeName(profile.role)) {
    reasonCodes.push(CAPABILITY_REASONS.UNDECLARED_TOOL);
  }
  if (normalizedFields.mode && !hasAllowed(profile.modes, normalizedFields.mode)) {
    reasonCodes.push(CAPABILITY_REASONS.UNDECLARED_TOOL);
  }
  if (normalizedFields.workspace && !isWorkspaceAllowedForProfile(profile, normalizedFields.workspace)) {
    reasonCodes.push(CAPABILITY_REASONS.UNDECLARED_TOOL);
  }

  const requestedAutonomy = normalizeAutonomy(normalizedFields.autonomylevel || normalizedFields.autonomy_level);
  const maxAutonomy = normalizeAutonomy(profile.max_autonomy_level);
  if (requestedAutonomy && AUTONOMY_ORDER[requestedAutonomy] > AUTONOMY_ORDER[maxAutonomy]) {
    reasonCodes.push(CAPABILITY_REASONS.AUTONOMY_TOO_HIGH);
  }

  if (memoryBoundaryViolation(profile, normalizedFields)) {
    reasonCodes.push(CAPABILITY_REASONS.MEMORY_BOUNDARY_VIOLATION);
  }

  const undeclared = findUndeclaredCapabilities(profile, normalizedFields, usedCapabilities);
  if (undeclared.length > 0) {
    reasonCodes.push(CAPABILITY_REASONS.UNDECLARED_TOOL);
  }

  const uniqueReasons = [...new Set(reasonCodes)];
  return {
    ok: uniqueReasons.length === 0,
    reason_codes: uniqueReasons,
    evidence: {
      profile_id: profile.id,
      role: profile.role,
      max_autonomy_level: profile.max_autonomy_level,
      requested_autonomy_level: requestedAutonomy || null,
      last_verified_at: profile.last_verified_at,
      stale_after_days: profile.stale_after_days,
      undeclared
    }
  };
}

function invalid(notes) {
  return {
    ok: false,
    reason_codes: [CAPABILITY_REASONS.REGISTRY_INVALID],
    evidence: { notes }
  };
}

function normalizeContractFields(fields) {
  const normalized = {};
  for (const [key, value] of Object.entries(fields || {})) {
    normalized[String(key).replace(/[-_\s]/g, "").toLowerCase()] = value;
  }
  return normalized;
}

function asList(value) {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^role:/, "")
    .replace(/\s+/g, "-");
}

function normalizeCapabilityName(value) {
  return normalizeName(String(value || "").split(":")[0]);
}

function normalizeWorkspace(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/.-]/g, "")
    .replace(/company\.os/g, "company-os")
    .replace(/companyos/g, "company-os");
}

function normalizeAutonomy(value) {
  const match = String(value || "").trim().toUpperCase().match(/L[0-5]/);
  return match ? match[0] : "";
}

function hasAllowed(allowed, value) {
  const wanted = normalizeName(value);
  return asList(allowed).some((entry) => normalizeName(entry) === wanted);
}

function workspaceAllowed(allowed, value) {
  const wanted = normalizeWorkspace(value);
  return asList(allowed).some((entry) => normalizeWorkspace(entry) === wanted);
}

export function isWorkspaceAllowedForProfile(profile, value) {
  if (!isWorkspaceCandidateSafe(value)) return false;
  if (workspaceAllowed(profile?.workspaces, value)) return true;
  const patterns = Array.isArray(profile?.sandbox_workspaces) ? profile.sandbox_workspaces : [];
  for (const pattern of patterns) {
    if (matchSandboxWorkspace(value, pattern)) return true;
  }
  return false;
}

function isWorkspaceCandidateSafe(value) {
  const raw = String(value || "").trim();
  if (!raw) return false;
  if (raw.split(/[\\/]+/).includes("..")) return false;
  return true;
}

export function validateSandboxPatternEntry(pattern) {
  const reasons = [];
  if (typeof pattern !== "string") {
    return [SANDBOX_PATTERN_REASONS.EMPTY];
  }
  const raw = pattern.trim();
  if (!raw) {
    return [SANDBOX_PATTERN_REASONS.EMPTY];
  }
  if (!raw.startsWith("/")) {
    reasons.push(SANDBOX_PATTERN_REASONS.NOT_ABSOLUTE);
  }
  const segments = raw.split("/");
  if (segments.includes("..")) {
    reasons.push(SANDBOX_PATTERN_REASONS.TRAVERSAL);
  }
  // segments[0] is "" because of the leading "/". Wildcards are only allowed
  // in the final non-empty segment.
  for (let i = 1; i < segments.length - 1; i += 1) {
    if (segments[i].includes("*")) {
      reasons.push(SANDBOX_PATTERN_REASONS.WILDCARD_NOT_FINAL);
      break;
    }
  }
  const last = segments[segments.length - 1];
  if (last && last !== "*" && last !== "**" && last.includes("*")) {
    reasons.push(SANDBOX_PATTERN_REASONS.WILDCARD_NOT_FINAL);
  }
  return [...new Set(reasons)];
}

export function matchSandboxWorkspace(candidate, pattern) {
  const candidateRaw = String(candidate || "").trim();
  if (!candidateRaw.startsWith("/")) return false;
  if (!isWorkspaceCandidateSafe(candidateRaw)) return false;
  if (validateSandboxPatternEntry(pattern).length > 0) return false;

  const trimmedCandidate = candidateRaw.replace(/\/+$/g, "") || "/";
  const candidateSegments = trimmedCandidate.split("/").slice(1).filter((segment) => segment !== "");
  const patternSegments = String(pattern).split("/").slice(1).filter((segment, index, all) => {
    return segment !== "" || index === all.length - 1;
  });

  if (patternSegments.length === 0) return false;
  const last = patternSegments[patternSegments.length - 1];

  if (last === "**") {
    const prefix = patternSegments.slice(0, -1);
    if (candidateSegments.length <= prefix.length) return false;
    for (let i = 0; i < prefix.length; i += 1) {
      if (prefix[i] !== candidateSegments[i]) return false;
    }
    return true;
  }

  if (last === "*") {
    const prefix = patternSegments.slice(0, -1);
    if (candidateSegments.length !== prefix.length + 1) return false;
    for (let i = 0; i < prefix.length; i += 1) {
      if (prefix[i] !== candidateSegments[i]) return false;
    }
    return true;
  }

  if (patternSegments.length !== candidateSegments.length) return false;
  for (let i = 0; i < patternSegments.length; i += 1) {
    if (patternSegments[i] !== candidateSegments[i]) return false;
  }
  return true;
}

function isProfileStale(profile, now) {
  const verified = Date.parse(profile.last_verified_at);
  if (Number.isNaN(verified)) return true;
  const staleAfterMs = Number(profile.stale_after_days) * 24 * 60 * 60 * 1000;
  return new Date(now).getTime() > verified + staleAfterMs;
}

function memoryBoundaryViolation(profile, fields) {
  const memoryStore = normalizeName(fields.memorystore || fields.memory_store);
  const updatePolicy = normalizeName(fields.memoryupdatepolicy || fields.memory_update_policy);
  const profileMemory = profile.memory || {};

  if (memoryStore.includes("personal") && normalizeName(profileMemory.honcho_read) !== "personal") {
    return true;
  }
  if (updatePolicy.includes("direct") && normalizeName(profileMemory.honcho_write) !== "direct") {
    return true;
  }
  if (updatePolicy.includes("controller-approved") && !["controller-approved", "proposal-only"].includes(normalizeName(profileMemory.honcho_write))) {
    return true;
  }
  return false;
}

function findUndeclaredCapabilities(profile, fields, usedCapabilities) {
  const checks = [
    ["plugins", "allowed_plugins", usedCapabilities.plugins],
    ["connectors", "allowed_connectors", usedCapabilities.connectors],
    ["commands", "allowed_commands", usedCapabilities.commands],
    ["skills", "allowed_skills", usedCapabilities.skills],
    ["subagents", "allowed_subagents", usedCapabilities.subagents]
  ];
  const undeclared = [];

  for (const [kind, allowedKey, values] of checks) {
    for (const value of asList(values)) {
      if (!hasCapability(profile[allowedKey], value)) {
        undeclared.push({ kind, value });
      }
    }
  }

  for (const subagent of asList(fields.subagentroster || fields.subagent_roster)) {
    const normalized = normalizeCapabilityName(subagent);
    if (["none", "empty", "[]"].includes(normalized)) continue;
    if (!hasCapability(profile.allowed_subagents, normalized)) {
      undeclared.push({ kind: "subagents", value: subagent });
    }
  }

  return undeclared;
}

function hasCapability(allowed, value) {
  const wanted = normalizeCapabilityName(value);
  return asList(allowed).some((entry) => normalizeCapabilityName(entry) === wanted);
}
