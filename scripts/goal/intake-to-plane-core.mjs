import { validateRegistry } from "./domain-pack-registry-core.mjs";

export const INTAKE_TO_PLANE_VERSION = "intake-to-plane/v0";

export const INTAKE_REASON_CODES = Object.freeze({
  INTAKE_FACT_FRESHNESS_MISSING: "INTAKE_FACT_FRESHNESS_MISSING",
  INTAKE_FACT_STALE: "INTAKE_FACT_STALE",
});

export const DEFAULT_INTAKE_FRESHNESS_WINDOW_DAYS = 30;

const ALLOWED_CONFIDENCE = new Set(["confirmed", "inferred", "hypothesis", "stale"]);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function compact(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value.map(compact).filter(Boolean) : [compact(value)].filter(Boolean);
}

function isConfirmed(level) {
  return compact(level).toLowerCase() === "confirmed";
}

function parseTimestamp(value) {
  const text = compact(value);
  if (!text) return null;
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : parsed;
}

function resolveNow(now) {
  if (typeof now === "number" && Number.isFinite(now)) return now;
  if (typeof now === "string" && now) {
    const parsed = Date.parse(now);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (now instanceof Date && !Number.isNaN(now.getTime())) return now.getTime();
  return Date.now();
}

function resolveWindowDays(windowDays) {
  if (typeof windowDays === "number" && Number.isFinite(windowDays) && windowDays > 0) return windowDays;
  return DEFAULT_INTAKE_FRESHNESS_WINDOW_DAYS;
}

function evaluateFreshness({ row, fallback, scope, nowMs, windowMs, windowDays }) {
  const lastVerified = parseTimestamp(row?.last_verified);
  const fallbackMs = parseTimestamp(fallback);
  const effective = lastVerified ?? fallbackMs;
  if (effective === null) {
    return {
      ok: false,
      code: INTAKE_REASON_CODES.INTAKE_FACT_FRESHNESS_MISSING,
      scope,
      message: `${scope} requires last_verified or a fresh confirmed_at fallback`,
      effective_source: null,
      last_verified: null,
    };
  }
  const ageMs = nowMs - effective;
  const source = lastVerified !== null ? "last_verified" : "confirmed_at";
  const lastVerifiedIso = new Date(effective).toISOString();
  if (ageMs > windowMs) {
    const ageDays = Math.round((ageMs / MS_PER_DAY) * 10) / 10;
    return {
      ok: false,
      code: INTAKE_REASON_CODES.INTAKE_FACT_STALE,
      scope,
      message: `${scope} is stale: age ${ageDays}d exceeds ${windowDays}d window`,
      effective_source: source,
      last_verified: lastVerifiedIso,
      age_days: ageDays,
    };
  }
  return {
    ok: true,
    scope,
    effective_source: source,
    last_verified: lastVerifiedIso,
    age_days: Math.round((ageMs / MS_PER_DAY) * 10) / 10,
  };
}

export function validateConfirmedIntake(intake, options = {}) {
  const errors = [];
  const reasons = [];
  if (!intake || typeof intake !== "object") {
    return { ok: false, errors: ["intake record is required"], reasons, freshness: null };
  }
  if (!compact(intake.confirmed_at)) errors.push("intake.confirmed_at is required (operator confirmation timestamp)");

  const company = intake.company || {};
  if (!compact(company.name)) errors.push("intake.company.name is required");
  if (!isConfirmed(company.confidence)) errors.push("intake.company.confidence must be 'confirmed' before materialization");
  if (company.confidence && !ALLOWED_CONFIDENCE.has(compact(company.confidence).toLowerCase())) {
    errors.push(`intake.company.confidence unknown: ${company.confidence}`);
  }

  const operating = intake.operating_state || {};
  const approvalOwner = compact(intake.approval_owner || operating.approval_owner);
  if (!approvalOwner) errors.push("intake.approval_owner is required (named human approver)");

  const domains = Array.isArray(intake.active_domains) ? intake.active_domains : [];
  const confirmedDomains = domains.filter((row) => isConfirmed(row?.confidence));
  if (!confirmedDomains.length) errors.push("intake.active_domains requires at least one entry with confidence 'confirmed'");
  for (const row of domains) {
    if (row?.confidence && !ALLOWED_CONFIDENCE.has(compact(row.confidence).toLowerCase())) {
      errors.push(`intake.active_domains.${row?.pack_id || "<missing>"}.confidence unknown: ${row.confidence}`);
    }
  }

  const nowMs = resolveNow(options.now);
  const windowDays = resolveWindowDays(options.freshnessWindowDays);
  const windowMs = windowDays * MS_PER_DAY;
  const freshnessByPack = {};
  let companyFreshness = null;

  if (isConfirmed(company.confidence)) {
    companyFreshness = evaluateFreshness({
      row: company,
      fallback: intake.confirmed_at,
      scope: "intake.company",
      nowMs,
      windowMs,
      windowDays,
    });
    if (!companyFreshness.ok) {
      reasons.push(companyFreshness);
      errors.push(`${companyFreshness.code}: ${companyFreshness.message}`);
    }
  }

  for (const row of confirmedDomains) {
    const packId = compact(row?.pack_id) || "<missing>";
    const result = evaluateFreshness({
      row,
      fallback: intake.confirmed_at,
      scope: `intake.active_domains.${packId}`,
      nowMs,
      windowMs,
      windowDays,
    });
    freshnessByPack[packId.toLowerCase()] = result;
    if (!result.ok) {
      reasons.push(result);
      errors.push(`${result.code}: ${result.message}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    approval_owner: approvalOwner,
    reasons,
    freshness: {
      window_days: windowDays,
      now: new Date(nowMs).toISOString(),
      company: companyFreshness,
      by_pack: freshnessByPack,
    },
  };
}

function resolvePack(packs, packId) {
  const wanted = compact(packId).toLowerCase();
  if (!wanted) return null;
  return (packs || []).find((pack) => compact(pack.id).toLowerCase() === wanted) || null;
}

function packChildAcceptance({ company, pack, approvalOwner, freshness }) {
  const baseline = [
    `Operator-confirmed company context (${company.name}) drives the pack scope; no inferred facts may be promoted to draft without re-confirmation.`,
    `Pack ${pack.id} stays in ${pack.activation_mode || "draft-only"} mode until ${approvalOwner} reviews artifacts.`,
    `Stage 0.5 CONTRACT_PASS is required before dispatch flips off manual.`,
    `CAO PASS and Controller decision card precede any HG-2 release.`,
    `Blocked actions inherited from pack registry: ${(pack.blocked_actions || []).join(", ") || "none declared"}.`,
  ];
  if (freshness && freshness.ok) {
    const source = freshness.effective_source === "last_verified"
      ? `pack last_verified=${freshness.last_verified}`
      : `intake confirmed_at fallback=${freshness.last_verified}`;
    baseline.push(`Freshness evidence: ${source}; workers must re-check the stale-fact guard before HG-2 release and treat any stale fact as NEEDS_HUMAN.`);
  }
  return baseline;
}

function packChildSources({ intake, pack }) {
  return [
    "docs/operations/adaptive-company-onboarding-domain-packs.md",
    "registries/domain-packs/company-os.json",
    compact(intake.record_path) || "intake-record (path not declared)",
  ];
}

function packChildGates({ pack }) {
  return [
    "operator-confirmation-complete",
    "stage-0.5-contract-pass",
    "cao-pass",
    "controller-decision-card",
    `human-gate-${compact(pack.default_human_gate || "HG-2")}`,
  ];
}

function packChildBlockedActions({ pack }) {
  const declared = asArray(pack.blocked_actions);
  const base = [
    "do not auto-dispatch",
    "do not mark Plane Done",
    "do not write production data",
    "do not push, merge, deploy or publish",
    "do not send email, LinkedIn, X, CRM mass-write or any external message without operator approval",
  ];
  return declared.length ? Array.from(new Set([...base, ...declared])) : base;
}

function packChildTitle({ pack }) {
  const name = compact(pack.name) || pack.id;
  return `${name} pack v0 - confirmed-intake draft`;
}

function packChildMode(pack) {
  const mode = compact(pack.default_child_mode);
  return mode || "implement";
}

export function buildIntakeMaterializationInput({ intake, registry, date, owner, projectId, workspaceSlug, projectIdentifier, parentNameOverride, now, freshnessWindowDays } = {}) {
  const validation = validateConfirmedIntake(intake, { now, freshnessWindowDays });
  if (!validation.ok) {
    return {
      ok: false,
      version: INTAKE_TO_PLANE_VERSION,
      errors: validation.errors,
      reasons: validation.reasons,
      freshness: validation.freshness,
      goal: null,
      children: [],
    };
  }
  if (!registry || !Array.isArray(registry.packs)) {
    return {
      ok: false,
      version: INTAKE_TO_PLANE_VERSION,
      errors: ["domain-pack registry is required and must have a packs array"],
      reasons: [],
      freshness: validation.freshness,
      goal: null,
      children: [],
    };
  }
  const registryValidation = validateRegistry(registry);
  if (!registryValidation.ok) {
    return {
      ok: false,
      version: INTAKE_TO_PLANE_VERSION,
      errors: registryValidation.errors.map((error) => `${error.code}: ${error.message}`),
      reasons: registryValidation.errors,
      freshness: validation.freshness,
      goal: null,
      children: [],
    };
  }

  const company = intake.company || {};
  const approvalOwner = validation.approval_owner;
  const errors = [];

  const selectedDomains = (intake.active_domains || []).filter((row) => isConfirmed(row?.confidence));
  const children = [];
  const warnings = [];
  const seen = new Set();
  for (const row of selectedDomains) {
    const packId = compact(row?.pack_id);
    if (!packId) {
      errors.push("intake.active_domains entry missing pack_id");
      continue;
    }
    const normalizedPackId = packId.toLowerCase();
    if (seen.has(normalizedPackId)) {
      warnings.push(`duplicate pack ${packId} in intake.active_domains; using first occurrence`);
      continue;
    }
    seen.add(normalizedPackId);
    const pack = resolvePack(registry.packs, packId);
    if (!pack) {
      errors.push(`pack ${packId} not found in registry`);
      continue;
    }
    const freshness = validation.freshness?.by_pack?.[normalizedPackId] || null;
    children.push({
      title: packChildTitle({ pack }),
      role: compact(pack.owner_role) || "role:coo",
      agent: "claude",
      mode: packChildMode(pack),
      dispatch: "manual",
      human_gate: compact(pack.default_human_gate) || "HG-2",
      outcome: `Confirmed-intake driven ${pack.id} draft for ${company.name}, ${pack.activation_mode || "draft-only"}, gated by ${approvalOwner}.`,
      source_of_truth: packChildSources({ intake, pack }),
      acceptance_criteria: packChildAcceptance({ company, pack, approvalOwner, freshness }),
      gates: packChildGates({ pack }),
      blocked_actions: packChildBlockedActions({ pack }),
      pack_id: pack.id,
      freshness,
    });
  }

  if (errors.length) {
    return {
      ok: false,
      version: INTAKE_TO_PLANE_VERSION,
      errors,
      reasons: validation.reasons,
      freshness: validation.freshness,
      goal: null,
      children: [],
    };
  }

  const parentSources = [
    "docs/operations/adaptive-company-onboarding-domain-packs.md",
    "registries/domain-packs/company-os.json",
  ];
  if (compact(intake.record_path)) parentSources.push(compact(intake.record_path));

  const parentAcceptance = [
    `Confirmed intake summary for ${company.name} drives parent and child contracts; no hypothesis-grade fact is promoted.`,
    `All children inherit dispatch: manual and the operator's approval owner: ${approvalOwner}.`,
    "Plane drafts are stage-0.5-gated; no child item is locked or dispatched by this materializer.",
    "CAO PASS and Controller decision precede any HG-2 release; Done remains Founder/CEO authority.",
    "Memory updates happen via Honcho proposal only; no direct memory write from this materializer.",
    `Stale-fact guard: every confirmed fact carries last_verified (or fresh confirmed_at fallback) within ${validation.freshness.window_days}d; stale active-domain selections are rejected with stable reason codes.`,
  ];

  const parentGates = [
    "operator-confirmation-complete",
    "stage-0.5-contract-pass-per-child",
    "cao-pass-per-child",
    "controller-decision-card-per-child",
    "intake-freshness-window-passed",
    "founder-or-ceo-release-before-done",
  ];

  const parentMetrics = [
    `${children.length} domain pack child draft(s) ready for Stage 0.5 review`,
    "All children dispatch: manual at materialization time",
    "Zero auto-dispatched items emitted by this materializer",
    `Freshness window in effect: ${validation.freshness.window_days}d`,
  ];

  const goal = {
    date: compact(date) || undefined,
    title: compact(parentNameOverride) || `Adaptive Onboarding Materialization - ${company.name}`,
    outcome: `Company.OS materializes confirmed first-run intake for ${company.name} into Plane parent and child worker-contract drafts without auto-dispatch.`,
    role: "role:coo",
    owner: compact(owner) || "CEO",
    workspace: compact(intake.workspace) || "registry:company-os",
    horizon: "30d",
    humanGate: "HG-2",
    source: parentSources,
    metric: parentMetrics,
    acceptance: parentAcceptance,
    gate: parentGates,
    risk: [
      "Confirmation drift if intake record is edited without re-running the AI Discovery + Operator Confirmation loop.",
      "Pack registry drift if a child's pack_id is renamed without intake update.",
      "Operator misreads draft-only output as production-ready; mitigated by inherited blocked_actions and HG-2 gate.",
      "Silent staleness if a worker bypasses the stale-fact guard; mitigated by per-child freshness evidence and INTAKE_FACT_STALE / INTAKE_FACT_FRESHNESS_MISSING reason codes.",
    ],
  };

  return {
    ok: true,
    version: INTAKE_TO_PLANE_VERSION,
    confirmed_at: compact(intake.confirmed_at),
    approval_owner: approvalOwner,
    plane: {
      workspace_slug: compact(workspaceSlug) || "companyos",
      project_id: compact(projectId) || null,
      project_identifier: compact(projectIdentifier) || "COMPA",
    },
    goal,
    children,
    warnings,
    freshness: validation.freshness,
    reasons: validation.reasons,
  };
}

export function renderIntakeRollbackMarkdown(input = {}) {
  const goalTitle = compact(input?.goal?.title) || "Adaptive Onboarding Materialization";
  const childRefs = (input?.children || []).map((child, index) => `child-${index + 1} (${child.pack_id || child.title})`);
  return [
    `# Intake Materializer Rollback - ${goalTitle}`,
    "",
    "Rollback applies to local artifacts written by `goal.mjs materialize --write` and to Plane drafts created by `goal.mjs materialize --apply`. The materializer never marks Plane Done and never dispatches workers, so rollback only undoes draft state.",
    "",
    "## Local artifact rollback",
    "",
    "1. Identify the materialization report under `reports/goals/<date>/<slug>-materialize.md` and the matching `.json` sibling.",
    "2. Delete or move both files; nothing else on disk is touched by this materializer.",
    "3. Re-run `goal.mjs draft` if a fresh draft is needed before re-materializing.",
    "",
    "## Plane draft rollback",
    "",
    "All generated items are `dispatch: manual` and never auto-locked or auto-Done. To withdraw drafts:",
    "",
    "1. Open each child item in Plane and confirm it is still in the initial (Backlog/Draft) state with no `worker.locked` comment. If any child has been locked, stop and escalate to the Controller; this rollback does not cover dispatched items.",
    "2. Cancel children before parent: set each child Plane item state to `Cancelled` (Founder/CEO step, not worker, not CAO).",
    "3. After all children are cancelled, set the parent item to `Cancelled`.",
    "4. Do not delete Plane items; the cancellation preserves audit trail of the original materialization.",
    "",
    "## Sequence-specific items in this draft",
    "",
    childRefs.length ? childRefs.map((ref) => `- ${ref}`).join("\n") : "- none",
    "",
    "## Stop rules",
    "",
    "- No Plane Done by worker or CAO during rollback.",
    "- No bulk delete; cancellation only.",
    "- No automatic memory rewrite; if memory-seed files were proposed alongside materialization, revert them through the standard Honcho proposal flow.",
    "",
  ].join("\n");
}
