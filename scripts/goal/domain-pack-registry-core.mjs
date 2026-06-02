export const REGISTRY_VALIDATOR_VERSION = "domain-pack-registry-core/v0";

export const REASON_CODES = Object.freeze({
  DUPLICATE_PACK_ID: "DUPLICATE_PACK_ID",
  MISSING_OWNER_ROLE: "MISSING_OWNER_ROLE",
  INVALID_OWNER_ROLE: "INVALID_OWNER_ROLE",
  INVALID_HUMAN_GATE: "INVALID_HUMAN_GATE",
  MISSING_BLOCKED_ACTIONS: "MISSING_BLOCKED_ACTIONS",
  FINANCE_GATE_TOO_WEAK: "FINANCE_GATE_TOO_WEAK",
  FINANCE_BLOCKED_ACTION_MISSING: "FINANCE_BLOCKED_ACTION_MISSING",
  UNSAFE_ACTIVATION_MODE: "UNSAFE_ACTIVATION_MODE",
  INVALID_REGISTRY: "INVALID_REGISTRY",
});

const VALID_HUMAN_GATES = new Set(["HG-1", "HG-2", "HG-2.5", "HG-3", "HG-3.5", "HG-4"]);

// Numeric strength for gate comparison; higher = stronger gate required.
const GATE_STRENGTH = { "HG-1": 1, "HG-2": 2, "HG-2.5": 2.5, "HG-3": 3, "HG-3.5": 3.5, "HG-4": 4 };

const VALID_ROLE_LABELS = new Set(["role:cto", "role:cpo", "role:cmo", "role:coo", "role:cfo", "role:cao"]);

const FINANCE_MIN_GATE = "HG-3";
const FINANCE_MIN_GATE_STRENGTH = GATE_STRENGTH[FINANCE_MIN_GATE];

// Finance packs must explicitly block each of these action categories.
const FINANCE_REQUIRED_CATEGORIES = [
  { name: "bank-action", keywords: ["bank"] },
  { name: "payment-initiation", keywords: ["payment"] },
  { name: "accounting-system", keywords: ["accounting"] },
];

// Packs whose blocked_actions include any of these keywords are
// considered external-action-capable (send, publish, CRM mass-write, outreach)
// and must stay in draft-only mode.
const SEND_PUBLISH_KEYWORDS = [
  "send", "publish", "post", "email", "linkedin", "x-post", "mail", "distribute", "broadcast",
  "crm", "outreach",
];

function compact(value) {
  return String(value ?? "").trim();
}

function isFinancePack(pack) {
  return (
    compact(pack.id).toLowerCase().includes("finance") ||
    compact(pack.owner_role).toLowerCase() === "role:cfo"
  );
}

function isSendPublishCapable(pack) {
  if (!Array.isArray(pack.blocked_actions)) return false;
  return pack.blocked_actions.some((action) =>
    SEND_PUBLISH_KEYWORDS.some((kw) => compact(action).toLowerCase().includes(kw)),
  );
}

function validatePack(pack, seenIds) {
  const errors = [];
  const packId = compact(pack.id);

  if (!packId) {
    errors.push({ code: REASON_CODES.INVALID_REGISTRY, pack_id: null, message: "pack entry missing required id field" });
    return errors;
  }

  const normalizedId = packId.toLowerCase();
  if (seenIds.has(normalizedId)) {
    errors.push({ code: REASON_CODES.DUPLICATE_PACK_ID, pack_id: packId, message: `duplicate pack id: ${packId}` });
  } else {
    seenIds.add(normalizedId);
  }

  const ownerRole = compact(pack.owner_role);
  if (!ownerRole) {
    errors.push({ code: REASON_CODES.MISSING_OWNER_ROLE, pack_id: packId, message: `pack ${packId}: owner_role is required` });
  } else if (!VALID_ROLE_LABELS.has(ownerRole.toLowerCase())) {
    errors.push({
      code: REASON_CODES.INVALID_OWNER_ROLE,
      pack_id: packId,
      message: `pack ${packId}: owner_role '${ownerRole}' is not a valid C-level role label (allowed: ${[...VALID_ROLE_LABELS].join(", ")})`,
    });
  }

  const gate = compact(pack.default_human_gate);
  if (!gate) {
    errors.push({ code: REASON_CODES.INVALID_HUMAN_GATE, pack_id: packId, message: `pack ${packId}: default_human_gate is required` });
  } else if (!VALID_HUMAN_GATES.has(gate)) {
    errors.push({
      code: REASON_CODES.INVALID_HUMAN_GATE,
      pack_id: packId,
      message: `pack ${packId}: default_human_gate '${gate}' is not valid (allowed: ${[...VALID_HUMAN_GATES].join(", ")})`,
    });
  }

  if (!Array.isArray(pack.blocked_actions) || pack.blocked_actions.length === 0) {
    errors.push({
      code: REASON_CODES.MISSING_BLOCKED_ACTIONS,
      pack_id: packId,
      message: `pack ${packId}: blocked_actions must be a non-empty array`,
    });
  }

  if (isFinancePack(pack)) {
    const gateStrength = GATE_STRENGTH[gate] ?? 0;
    if (gateStrength < FINANCE_MIN_GATE_STRENGTH) {
      errors.push({
        code: REASON_CODES.FINANCE_GATE_TOO_WEAK,
        pack_id: packId,
        message: `pack ${packId}: finance pack default_human_gate '${gate}' is weaker than required minimum ${FINANCE_MIN_GATE}`,
      });
    }

    if (Array.isArray(pack.blocked_actions) && pack.blocked_actions.length > 0) {
      for (const category of FINANCE_REQUIRED_CATEGORIES) {
        const covered = pack.blocked_actions.some((action) =>
          category.keywords.some((kw) => compact(action).toLowerCase().includes(kw)),
        );
        if (!covered) {
          errors.push({
            code: REASON_CODES.FINANCE_BLOCKED_ACTION_MISSING,
            pack_id: packId,
            message: `pack ${packId}: finance pack must explicitly block ${category.name} actions in blocked_actions`,
          });
        }
      }
    }
  }

  if (isSendPublishCapable(pack)) {
    const activationMode = compact(pack.activation_mode);
    if (activationMode !== "draft-only") {
      errors.push({
        code: REASON_CODES.UNSAFE_ACTIVATION_MODE,
        pack_id: packId,
        message: `pack ${packId}: send/publish-capable pack must have activation_mode 'draft-only', got '${activationMode || "(empty)"}'`,
      });
    }
  }

  return errors;
}

/**
 * Validate a domain-pack registry object.
 * Returns { ok: boolean, errors: Array<{ code, pack_id, message }> }.
 * An empty errors array means the registry is safe to use.
 */
export function validateRegistry(registry) {
  if (!registry || typeof registry !== "object") {
    return {
      ok: false,
      errors: [{ code: REASON_CODES.INVALID_REGISTRY, pack_id: null, message: "registry must be a non-null object" }],
    };
  }
  if (!Array.isArray(registry.packs)) {
    return {
      ok: false,
      errors: [{ code: REASON_CODES.INVALID_REGISTRY, pack_id: null, message: "registry.packs must be an array" }],
    };
  }

  const errors = [];
  const seenIds = new Set();

  for (const pack of registry.packs) {
    errors.push(...validatePack(pack, seenIds));
  }

  return { ok: errors.length === 0, errors };
}
