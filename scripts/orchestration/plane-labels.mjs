import {
  loadLabelMap,
  resolveLabelsViaMap,
} from "./plane-label-map-resolver.mjs";

async function defaultRequestJson({ baseUrl, authHeaders, path }) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      ...authHeaders,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text.slice(0, 500) }; }
  return { ok: response.ok, status: response.status, body: parsed };
}

export async function resolvePlaneItemLabels({
  baseUrl,
  authHeaders,
  workspace,
  projectId,
  item,
  labelMapPath,
  requestJson = defaultRequestJson,
}) {
  const rawLabels = Array.isArray(item?.labels)
    ? item.labels
    : (Array.isArray(item?.label_ids) ? item.label_ids : []);

  if (rawLabels.length === 0) {
    return { ok: true, names: [], source: "embedded", labelIds: [] };
  }

  if (rawLabels.every((row) => row && typeof row === "object" && typeof row.name === "string")) {
    return {
      ok: true,
      names: rawLabels.map((row) => row.name),
      source: "embedded",
      labelIds: rawLabels.map((row) => row.id).filter(Boolean),
    };
  }

  const labelIds = rawLabels
    .map((row) => (typeof row === "string" ? row : row?.id))
    .filter(Boolean);
  if (labelIds.length === 0) {
    return { ok: true, names: [], source: "embedded", labelIds: [] };
  }

  const apiPath = `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/labels/`;
  const list = await requestJson({ baseUrl, authHeaders, path: apiPath });

  if (list.ok) {
    const rows = Array.isArray(list.body) ? list.body : (list.body?.results || []);
    const byId = new Map(rows.map((row) => [row.id, row.name]));
    const names = labelIds.map((id) => byId.get(id)).filter(Boolean);
    if (names.length !== labelIds.length) {
      return { ok: false, reason: "runtime.label-map-incomplete", source: "api", labelIds, api_status: list.status };
    }
    return { ok: true, names, source: "api", labelIds, api_status: list.status };
  }

  const map = loadLabelMap(labelMapPath);
  if (!map.ok) {
    return { ok: false, reason: map.reason, source: "label-map", labelIds, api_status: list.status };
  }
  const resolved = resolveLabelsViaMap({ map: map.map, workspace, projectId, labelIds });
  if (!resolved.ok) {
    return { ok: false, reason: resolved.reason, source: "label-map", labelIds, api_status: list.status };
  }
  return { ok: true, names: resolved.names, source: "label-map", labelIds, api_status: list.status };
}
