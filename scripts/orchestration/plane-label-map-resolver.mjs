/*
 * plane-label-map-resolver.mjs
 *
 * Pure resolver. Loads a non-secret Plane label map (workspace + project_id
 * + label_id -> role:* names), validates shape, and resolves a work item's
 * label UUIDs to role:* names without calling Plane's /labels/ endpoint.
 *
 * Used by the dispatcher when the App bot token cannot read /labels/.
 *
 * Source of truth:
 *   docs/orchestration/plane-role-routing.md (HG-2b-C path)
 *   docs/orchestration/plane-worker-dispatcher-v0.md (resolver convention)
 *   kits/company-os-kit/templates/plane-label-map.example.json (shape)
 *
 * No I/O beyond `fs.readFileSync`. No Plane writes. No secrets.
 */

import { existsSync, readFileSync } from "node:fs";

export const RESOLVER_VERSION = "plane-label-map-resolver/v0";
export const LABEL_MAP_VERSION = "plane-label-map/v0";

/**
 * Load + validate a label-map JSON file from disk.
 *
 * Returns:
 *   { ok: true, map }                            on success
 *   { ok: false, reason: "<reject-code>" }       on any structural failure
 *
 * Reject codes (stable):
 *   runtime.label-map-missing
 *   runtime.label-map-malformed
 *
 * The function does NOT compare workspace/project_id; that comparison is the
 * caller's concern (resolveLabelsViaMap).
 */
export function loadLabelMap(path) {
  if (!path) return { ok: false, reason: "runtime.label-map-missing" };
  if (!existsSync(path)) return { ok: false, reason: "runtime.label-map-missing" };

  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return { ok: false, reason: "runtime.label-map-missing" };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "runtime.label-map-malformed" };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, reason: "runtime.label-map-malformed" };
  }
  if (parsed.version !== LABEL_MAP_VERSION) {
    return { ok: false, reason: "runtime.label-map-malformed" };
  }
  if (typeof parsed.workspace !== "string" || !parsed.workspace) {
    return { ok: false, reason: "runtime.label-map-malformed" };
  }
  if (typeof parsed.project_id !== "string" || !parsed.project_id) {
    return { ok: false, reason: "runtime.label-map-malformed" };
  }
  if (!Array.isArray(parsed.labels)) {
    return { ok: false, reason: "runtime.label-map-malformed" };
  }
  for (const entry of parsed.labels) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, reason: "runtime.label-map-malformed" };
    }
    if (typeof entry.id !== "string" || !entry.id) {
      return { ok: false, reason: "runtime.label-map-malformed" };
    }
    if (typeof entry.name !== "string" || !entry.name) {
      return { ok: false, reason: "runtime.label-map-malformed" };
    }
  }

  return { ok: true, map: parsed };
}

/**
 * Resolve a work item's label UUIDs to label names through the loaded map.
 *
 * Strict invariants:
 *   - map.workspace must equal the dispatcher's workspace (mismatch = fail).
 *   - map.project_id must equal the dispatcher's project_id (mismatch = fail).
 *   - every label_id present on the work item must have a matching entry in
 *     the map; otherwise fail. We never silently drop unknown labels because
 *     a missing entry could hide a role label drift.
 *
 * Returns:
 *   { ok: true, names: [...] }                  on success
 *   { ok: false, reason: "<reject-code>" }      on any failure
 *
 * Reject codes (stable):
 *   runtime.label-map-mismatch       (workspace or project_id mismatch)
 *   runtime.label-map-incomplete     (a label_id has no map entry)
 */
export function resolveLabelsViaMap({ map, workspace, projectId, labelIds }) {
  if (!map || typeof map !== "object") {
    return { ok: false, reason: "runtime.label-map-malformed" };
  }
  if (map.workspace !== workspace) {
    return { ok: false, reason: "runtime.label-map-mismatch" };
  }
  if (map.project_id !== projectId) {
    return { ok: false, reason: "runtime.label-map-mismatch" };
  }
  const ids = Array.isArray(labelIds) ? labelIds : [];
  if (ids.length === 0) return { ok: true, names: [] };

  const byId = new Map();
  for (const entry of map.labels || []) {
    byId.set(entry.id, entry.name);
  }

  const names = [];
  for (const id of ids) {
    const name = byId.get(id);
    if (!name) {
      return { ok: false, reason: "runtime.label-map-incomplete", missing_id: id };
    }
    names.push(name);
  }

  return { ok: true, names };
}

/**
 * Default search path for the label map. Caller may override via
 * PLANE_LABEL_MAP_PATH environment variable or an explicit CLI flag.
 */
export function defaultLabelMapPath({ workspace, projectId, root = process.cwd() }) {
  return `${root.replace(/\/+$/, "")}/runtime/plane-label-map/${workspace}-${projectId}.json`;
}
