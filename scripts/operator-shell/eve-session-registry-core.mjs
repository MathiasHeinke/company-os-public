import fs from "node:fs";
import path from "node:path";

export const EVE_SESSION_REGISTRY_VERSION = "eve-workstream-session-registry/v0";
export const EVE_SESSION_REGISTRY_FILE = "EVE_WORKSTREAM_SESSIONS.json";
export const DEFAULT_EVE_WORKSTREAM_ID = "eve-founder-companion";
export const DEFAULT_EVE_WORKSTREAM_TITLE = "Command EVE founder companion";
export const DEFAULT_STALE_AFTER_DAYS = 14;

const GENERATED_BY = "Company.OS start_eve";

function compact(value) {
  return String(value ?? "").trim();
}

function iso(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function nowMs(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? Date.now() : date.getTime();
}

function daysBetween(from, to) {
  const delta = nowMs(to) - nowMs(from);
  return delta / (24 * 60 * 60 * 1000);
}

function uniqueRows(rows = []) {
  return [...new Set(rows.map(compact).filter(Boolean))];
}

export function defaultEveSessionRegistryPath(paths = {}) {
  if (paths.eveSessionRegistry) return paths.eveSessionRegistry;
  if (paths.contextRoot) return path.join(paths.contextRoot, EVE_SESSION_REGISTRY_FILE);
  return path.join(process.cwd(), EVE_SESSION_REGISTRY_FILE);
}

export function emptyEveSessionRegistry(now = new Date()) {
  return {
    version: EVE_SESSION_REGISTRY_VERSION,
    generated_by: GENERATED_BY,
    created_at: iso(now),
    updated_at: iso(now),
    default_workstream_id: DEFAULT_EVE_WORKSTREAM_ID,
    sessions: {},
    events: [],
  };
}

export function loadEveSessionRegistry(file) {
  if (!fs.existsSync(file)) {
    return { ok: true, status: "missing", registry: emptyEveSessionRegistry(), path: file };
  }
  try {
    const registry = JSON.parse(fs.readFileSync(file, "utf8"));
    const validation = validateEveSessionRegistry(registry);
    return { ...validation, status: validation.ok ? "found" : "invalid", registry, path: file };
  } catch (error) {
    return {
      ok: false,
      status: "invalid_json",
      registry: null,
      path: file,
      errors: [error.message],
    };
  }
}

export function validateEveSessionRegistry(registry = {}) {
  const errors = [];
  if (!registry || typeof registry !== "object") errors.push("registry_not_object");
  if (registry.version !== EVE_SESSION_REGISTRY_VERSION) errors.push("registry_version_mismatch");
  if (!registry.sessions || typeof registry.sessions !== "object" || Array.isArray(registry.sessions)) {
    errors.push("registry_sessions_not_object");
  }
  if (!Array.isArray(registry.events)) errors.push("registry_events_not_array");
  return { ok: errors.length === 0, errors };
}

export function evaluateEveSessionHygiene(session = {}, { now = new Date() } = {}) {
  const staleAfterDays = Number(session.hygiene?.stale_after_days || DEFAULT_STALE_AFTER_DAYS);
  const updatedAt = session.updated_at || session.opened_at || now;
  const ageDays = daysBetween(updatedAt, now);
  const pollutionMarkers = uniqueRows([
    ...(session.hygiene?.pollution_markers_found || []),
    ...(session.pollution_markers_found || []),
  ]);
  const polluted = Boolean(
    session.status === "polluted"
      || session.hygiene?.pollution?.detected
      || pollutionMarkers.length > 0,
  );
  const stale = session.status === "open" && ageDays > staleAfterDays;
  const closeRequired = polluted || stale || session.status === "closed";
  return {
    ok: !polluted,
    status: polluted ? "blocked_polluted" : stale ? "needs_close_stale" : "pass",
    close_required: closeRequired,
    stale,
    polluted,
    age_days: Number.isFinite(ageDays) ? Number(ageDays.toFixed(3)) : 0,
    stale_after_days: staleAfterDays,
    pollution_markers_found: pollutionMarkers,
  };
}

export function buildStartEveWorkstreamSession({
  existing = null,
  route = {},
  preflight = {},
  paths = {},
  now = new Date(),
  staleAfterDays = DEFAULT_STALE_AFTER_DAYS,
} = {}) {
  const routeReceipt = route.route_receipt || {};
  const modelConfig = preflight?.hermes?.model_config || {};
  const existingHygiene = existing ? evaluateEveSessionHygiene(existing, { now }) : null;
  const rotated = Boolean(existing && existingHygiene?.stale);
  const generation = Number(existing?.generation || 0) + (rotated || !existing ? 1 : 0);
  return {
    id: DEFAULT_EVE_WORKSTREAM_ID,
    generation,
    title: DEFAULT_EVE_WORKSTREAM_TITLE,
    parent_ref: "local:start_eve",
    owner_role: "chief-of-staff",
    reports_to: "CEO",
    status: "open",
    session_policy: routeReceipt.session_policy || "workstream-continuity",
    route_class: routeReceipt.route_class || route.route_class || "",
    opened_at: rotated || !existing ? iso(now) : existing.opened_at || iso(now),
    updated_at: iso(now),
    route_receipt: routeReceipt,
    runtime_sessions: {
      eve_hermes: {
        runtime: "hermes",
        model_alias: modelConfig.model || "",
        provider: modelConfig.provider || "",
        session_id: "",
        session_id_status: "not-yet-captured",
        opened_at: iso(now),
      },
      ceo_codex: {
        runtime: "codex",
        model_alias: "superbrain-veto",
        session_id: "",
        session_id_status: "not-yet-captured",
        opened_at: "",
      },
    },
    allowed_scope: [
      "Command EVE onboarding and founder-companion setup",
      "Company.OS boot packet and EVE context files",
      "CEO/C-Level planning proposals",
    ],
    blocked_actions: uniqueRows(routeReceipt.blocked_actions || [
      "production write",
      "external send",
      "customer data",
      "Plane Done",
    ]),
    local_paths: {
      context_root: paths.contextRoot || "",
      registry_path: defaultEveSessionRegistryPath(paths),
    },
    hygiene: {
      stale_after_days: staleAfterDays,
      last_checked_at: iso(now),
      close_required: false,
      pollution: { detected: false, reason: "" },
      pollution_markers_found: [],
      close_conditions: [
        "parent done",
        "context polluted",
        "scope drift",
        "stale after configured days",
        "owner closes workstream",
      ],
      previous_status: existing?.status || "",
      rotated_stale_session: rotated,
    },
  };
}

export function upsertStartEveWorkstreamSession({
  registry,
  route,
  preflight,
  paths,
  now = new Date(),
  staleAfterDays = DEFAULT_STALE_AFTER_DAYS,
} = {}) {
  const current = registry || emptyEveSessionRegistry(now);
  const existing = current.sessions?.[DEFAULT_EVE_WORKSTREAM_ID] || null;
  const existingHygiene = existing ? evaluateEveSessionHygiene(existing, { now }) : null;
  if (existingHygiene && !existingHygiene.ok) {
    return {
      ok: false,
      status: "blocked",
      reason: "eve-session-registry.polluted-session",
      hygiene: existingHygiene,
      registry: current,
      session: existing,
    };
  }
  const session = buildStartEveWorkstreamSession({
    existing,
    route,
    preflight,
    paths,
    now,
    staleAfterDays,
  });
  const next = {
    ...current,
    version: EVE_SESSION_REGISTRY_VERSION,
    generated_by: current.generated_by || GENERATED_BY,
    created_at: current.created_at || iso(now),
    updated_at: iso(now),
    default_workstream_id: DEFAULT_EVE_WORKSTREAM_ID,
    sessions: {
      ...(current.sessions || {}),
      [DEFAULT_EVE_WORKSTREAM_ID]: session,
    },
    events: [
      ...(current.events || []),
      ...(existingHygiene?.stale ? [{
        type: "start_eve.session-rotated-stale",
        at: iso(now),
        workstream_id: DEFAULT_EVE_WORKSTREAM_ID,
        previous_generation: existing?.generation || 1,
        age_days: existingHygiene.age_days,
      }] : []),
      {
        type: "start_eve.session-upserted",
        at: iso(now),
        workstream_id: DEFAULT_EVE_WORKSTREAM_ID,
        generation: session.generation,
        route_class: session.route_class,
        session_policy: session.session_policy,
      },
    ].slice(-100),
  };
  return {
    ok: true,
    status: existingHygiene?.stale ? "pass_rotated_stale" : "pass",
    reason: existing ? "session-upserted" : "session-created",
    hygiene: evaluateEveSessionHygiene(session, { now }),
    registry: next,
    session,
  };
}

export function writeEveSessionRegistry(file, registry) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(registry, null, 2)}\n`);
}

export function registerStartEveSession({
  route,
  preflight,
  paths = {},
  registryPath,
  now = new Date(),
  dryRun = false,
} = {}) {
  const file = registryPath || defaultEveSessionRegistryPath(paths);
  const loaded = loadEveSessionRegistry(file);
  if (!loaded.ok) {
    return {
      ok: false,
      status: "blocked",
      registry_path: file,
      reason: "eve-session-registry.invalid",
      errors: loaded.errors || [],
    };
  }
  const result = upsertStartEveWorkstreamSession({
    registry: loaded.registry,
    route,
    preflight,
    paths,
    now,
  });
  if (!result.ok) {
    return {
      ...result,
      registry_path: file,
      written: false,
    };
  }
  if (!dryRun) writeEveSessionRegistry(file, result.registry);
  return {
    ...result,
    registry_path: file,
    written: !dryRun,
  };
}

export function closeEveWorkstreamSession({
  registry,
  workstreamId = DEFAULT_EVE_WORKSTREAM_ID,
  reason = "owner-closed",
  now = new Date(),
} = {}) {
  const current = registry || emptyEveSessionRegistry(now);
  const session = current.sessions?.[workstreamId];
  if (!session) {
    return {
      ok: false,
      status: "missing",
      reason: "eve-session-registry.session-missing",
      registry: current,
    };
  }
  const closed = {
    ...session,
    status: "closed",
    closed_at: iso(now),
    close_reason: compact(reason) || "owner-closed",
    updated_at: iso(now),
    hygiene: {
      ...(session.hygiene || {}),
      close_required: true,
      last_checked_at: iso(now),
    },
  };
  const next = {
    ...current,
    updated_at: iso(now),
    sessions: {
      ...(current.sessions || {}),
      [workstreamId]: closed,
    },
    events: [
      ...(current.events || []),
      {
        type: "start_eve.session-closed",
        at: iso(now),
        workstream_id: workstreamId,
        reason: closed.close_reason,
      },
    ].slice(-100),
  };
  return {
    ok: true,
    status: "closed",
    registry: next,
    session: closed,
  };
}
