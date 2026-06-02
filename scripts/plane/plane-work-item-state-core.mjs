export const PLANE_WORK_ITEM_STATE_VERSION = "plane-work-item-state/v0";

export function normalizeStateName(value = "") {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "-");
}

export function sanitizeState(state) {
  if (!state || typeof state !== "object") return null;
  return {
    id: state.id || "",
    name: state.name || "",
    group: state.group || "",
  };
}

export function sanitizeWorkItem(item) {
  if (!item || typeof item !== "object") return null;
  return {
    id: item.id || "",
    sequence_id: item.sequence_id ?? null,
    name: item.name || "",
    state: sanitizeState(item.state) || item.state || null,
    updated_at: item.updated_at || item.updatedAt || "",
  };
}

export function findStateByName(states = [], targetName = "") {
  const normalized = normalizeStateName(targetName);
  if (!normalized) return null;
  return states.find((state) => normalizeStateName(state?.name) === normalized) || null;
}

export function isDoneState(state) {
  const name = normalizeStateName(state?.name || state);
  const group = normalizeStateName(state?.group || "");
  return name === "done" || group === "completed";
}

export function buildWorkItemStatePatch({ stateId }) {
  if (!stateId) throw new Error("stateId is required");
  return { state: stateId };
}

export function validateStateChangeArgs({
  workspace,
  projectId,
  workItemId,
  sequenceId,
  state,
  stateId,
  confirmDone = false,
  dryRun = false,
} = {}) {
  const errors = [];
  if (!workspace) errors.push("--workspace is required");
  if (!projectId) errors.push("--project-id is required");
  if (!workItemId && !sequenceId) errors.push("--work-item-id or --sequence-id is required");
  if (workItemId && sequenceId) errors.push("use either --work-item-id or --sequence-id, not both");
  if (!state && !stateId) errors.push("--state or --state-id is required");
  if (state && stateId) errors.push("use either --state or --state-id, not both");
  if (!dryRun && normalizeStateName(state) === "done" && !confirmDone) {
    errors.push("--confirm-done is required when setting --state Done");
  }
  return errors;
}

export function resolveTargetState({ states = [], state = "", stateId = "" } = {}) {
  if (stateId) {
    const found = states.find((candidate) => candidate?.id === stateId) || null;
    return {
      ok: Boolean(found),
      state: found || { id: stateId, name: "", group: "" },
      reason: found ? "" : "state-id-not-found-in-project",
    };
  }
  const found = findStateByName(states, state);
  return {
    ok: Boolean(found),
    state: found || null,
    reason: found ? "" : "state-name-not-found-in-project",
  };
}

export function stateAlreadySet({ item, targetState } = {}) {
  const current = item?.state;
  if (!current || !targetState) return false;
  if (typeof current === "string") return current === targetState.id || normalizeStateName(current) === normalizeStateName(targetState.name);
  return current.id === targetState.id || normalizeStateName(current.name) === normalizeStateName(targetState.name);
}
