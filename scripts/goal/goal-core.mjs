import fs from "node:fs";
import path from "node:path";

export const GOAL_COMMAND_VERSION = "goal-command/v0";
export const GOAL_MATERIALIZE_VERSION = "goal-materialize/v0";
export const GOAL_RUNNER_VERSION = "goal-run/v0";

export const ALLOWED_ROLE_LABELS = new Set([
  "role:cto",
  "role:cpo",
  "role:cmo",
  "role:coo",
  "role:cfo",
  "role:cao",
]);

const DEFAULT_BLOCKED_ACTIONS = [
  "do not create Plane work items automatically",
  "do not dispatch workers automatically",
  "do not mark Plane Done",
  "do not push, merge, deploy, publish, spend money or write production data",
];

function compact(value) {
  return String(value || "").trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value.map(compact).filter(Boolean) : [compact(value)].filter(Boolean);
}

function normalizeLabelMap(labelMap) {
  if (!labelMap || typeof labelMap !== "object") return new Map();
  const rows = Array.isArray(labelMap.labels) ? labelMap.labels : [];
  return new Map(rows.map((row) => [row.name, row.id]).filter(([name, id]) => name && id));
}

function htmlEscape(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPlaneDescriptionHtml({ title, summary, bullets = [], code = "" }) {
  const bulletHtml = bullets.length
    ? `<ul>${bullets.map((item) => `<li>${htmlEscape(item)}</li>`).join("")}</ul>`
    : "";
  const codeHtml = code ? `<pre><code>${htmlEscape(code)}</code></pre>` : "";
  return `<h2>${htmlEscape(title)}</h2><p>${htmlEscape(summary)}</p>${bulletHtml}${codeHtml}`;
}

export function slugifyGoalTitle(title) {
  const slug = compact(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || "goal";
}

export function normalizeRoleLabel(role) {
  const value = compact(role).toLowerCase();
  if (!value) return "";
  const roleLabel = value.startsWith("role:") ? value : `role:${value.replace(/^role-/, "")}`;
  return ALLOWED_ROLE_LABELS.has(roleLabel) ? roleLabel : "";
}

export function localIsoDate(now = new Date()) {
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function buildGoalState(input = {}) {
  const date = compact(input.date) || localIsoDate(input.now);
  const title = compact(input.title);
  const outcome = compact(input.outcome);
  const roleLabel = normalizeRoleLabel(input.role || input.roleLabel || input.role_label);
  const workspace = compact(input.workspace) || "registry:company-os";
  const horizon = compact(input.horizon) || "30d";
  const humanGate = compact(input.humanGate || input.human_gate) || "HG-2";
  const agent = compact(input.agent) || "claude";
  const mode = compact(input.mode) || "plan";
  const dispatch = compact(input.dispatch) || "manual";
  const owner = compact(input.owner) || "CEO";

  const errors = [];
  if (!title) errors.push("title is required");
  if (!outcome) errors.push("outcome is required");
  if (!roleLabel) errors.push("role must be one of role:cto, role:cpo, role:cmo, role:coo, role:cfo, role:cao");
  if (!/^HG-(0|1|2|2\.5|3|3\.5|4)$/.test(humanGate)) errors.push(`unsupported human gate: ${humanGate}`);
  if (errors.length) {
    const error = new Error(`Invalid goal input: ${errors.join("; ")}`);
    error.errors = errors;
    throw error;
  }

  const sourceOfTruth = asArray(input.sourceOfTruth || input.source_of_truth || input.source);
  const metrics = asArray(input.metrics || input.metric);
  const nonGoals = asArray(input.nonGoals || input.non_goals || input.nonGoal || input.non_goal);
  const acceptanceCriteria = asArray(input.acceptanceCriteria || input.acceptance_criteria || input.acceptance);
  const gates = asArray(input.gates || input.gate);
  const risks = asArray(input.risks || input.risk);

  const slug = slugifyGoalTitle(title);
  const id = compact(input.id) || `goal-${date}-${slug}`;

  return {
    version: GOAL_COMMAND_VERSION,
    id,
    date,
    title,
    slug,
    outcome,
    owner,
    role_label: roleLabel,
    parent_seat: roleLabel,
    agent,
    mode,
    workspace,
    dispatch,
    horizon,
    human_gate: humanGate,
    metrics: metrics.length ? metrics : ["Define one measurable success signal before dispatch."],
    non_goals: nonGoals.length ? nonGoals : ["No worker dispatch until this draft is reviewed and normalized in Plane."],
    risks,
    source_of_truth: sourceOfTruth.length ? sourceOfTruth : ["docs/system-index.md"],
    acceptance_criteria: acceptanceCriteria.length
      ? acceptanceCriteria
      : [`Controller can verify whether the outcome is met: ${outcome}`],
    gates: gates.length ? gates : ["controller review of GoalState, ObjectiveLoop and first worker contract"],
    blocked_actions: asArray(input.blockedActions || input.blocked_actions).length
      ? asArray(input.blockedActions || input.blocked_actions)
      : DEFAULT_BLOCKED_ACTIONS,
  };
}

function yamlList(items, indent = "") {
  return items.map((item) => `${indent}- ${item}`).join("\n");
}

export function renderWorkerContract(goal) {
  return [
    "```yaml",
    `role: ${goal.role_label}`,
    `parent_seat: ${goal.parent_seat}`,
    `agent: ${goal.agent}`,
    `mode: ${goal.mode}`,
    `workspace: ${goal.workspace}`,
    `dispatch: ${goal.dispatch}`,
    "source_of_truth:",
    yamlList(goal.source_of_truth, "  "),
    "acceptance_criteria:",
    yamlList(goal.acceptance_criteria, "  "),
    "gates:",
    yamlList(goal.gates, "  "),
    `human_gate: ${goal.human_gate}`,
    "reporting: Plane worker.reported with changed files, commands, results, blockers, reflection and learning_proposals.",
    `BlockedActions: ${goal.blocked_actions.join("; ")}`,
    "ReflectionPolicy: required",
    "LearningProposalPolicy: required",
    "```",
  ].join("\n");
}

export function renderGoalMarkdown(goal) {
  return [
    `# Goal Command Draft - ${goal.title}`,
    "",
    `Status: draft`,
    `Version: ${goal.version}`,
    `Date: ${goal.date}`,
    "",
    "## GoalState",
    "",
    "```goalstate",
    `id: ${goal.id}`,
    `title: ${goal.title}`,
    `outcome: ${goal.outcome}`,
    `owner: ${goal.owner}`,
    `role_label: ${goal.role_label}`,
    `workspace: ${goal.workspace}`,
    `horizon: ${goal.horizon}`,
    "metrics:",
    yamlList(goal.metrics, "  "),
    "non_goals:",
    yamlList(goal.non_goals, "  "),
    "source_of_truth:",
    yamlList(goal.source_of_truth, "  "),
    "```",
    "",
    "## ObjectiveLoop",
    "",
    "| Step | Action | Gate |",
    "|---|---|---|",
    "| 1. Observe | Read source truth and current ledger state. | Evidence is cited, not inferred. |",
    "| 2. Shape | Convert intent into one bounded worker contract or a split plan. | Scope has explicit include/exclude boundaries. |",
    "| 3. Dispatch | Keep `dispatch: manual` until CEO/Codex flips it. | Stage 0.5/0.6 CONTRACT_PASS required. |",
    "| 4. Verify | Worker output must satisfy gates and report reflection. | CAO PASS before controller decision. |",
    "| 5. Learn | Capture only reusable doctrine, SOP, skill or gate improvements. | Memory/Plane split classifier runs before writes. |",
    "",
    "## First Worker Contract Draft",
    "",
    renderWorkerContract(goal),
    "",
    "## Risks",
    "",
    goal.risks.length ? yamlList(goal.risks) : "- No additional risks declared.",
    "",
    "## Next Action",
    "",
    "Review this draft, then create or patch a Plane item with exactly one `role:*` label and the fenced worker contract above. Do not dispatch until the contract controller returns `CONTRACT_PASS`.",
    "",
  ].join("\n");
}

export function writeGoalDraft({ workspaceRoot = process.cwd(), goal }) {
  const root = path.resolve(workspaceRoot);
  const reportPath = path.join(root, "reports", "goals", goal.date, `${goal.slug}-goal.md`);
  const jsonPath = path.join(root, "reports", "goals", goal.date, `${goal.slug}-goal.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, renderGoalMarkdown(goal));
  fs.writeFileSync(jsonPath, `${JSON.stringify(goal, null, 2)}\n`);
  return { reportPath, jsonPath };
}

function normalizeMaterializeChildren(inputChildren, goal) {
  const children = Array.isArray(inputChildren) ? inputChildren : [];
  if (!children.length) {
    return [{
      title: `First worker - ${goal.title}`,
      role: goal.role_label,
      agent: goal.agent,
      mode: goal.mode,
      acceptance_criteria: goal.acceptance_criteria,
      gates: goal.gates,
      source_of_truth: goal.source_of_truth,
    }];
  }
  return children;
}

function labelIdsFor(roleLabel, labelMap) {
  const id = labelMap.get(roleLabel);
  return id ? [id] : [];
}

function parentIdOf(item) {
  if (!item || typeof item !== "object") return "";
  if (typeof item.parent === "string") return item.parent;
  if (item.parent && typeof item.parent === "object") return compact(item.parent.id);
  return "";
}

function sequenceRef(item, projectIdentifier) {
  const sequence = compact(item?.sequence_id);
  if (!sequence) return compact(item?.id) || compact(item?.name);
  if (/^[A-Z]+-\d+$/i.test(sequence)) return sequence.toUpperCase();
  return `${compact(projectIdentifier) || "COMPA"}-${sequence}`;
}

function stateNameOf(item) {
  const state = item?.state;
  if (!state) return "";
  if (typeof state === "string") return state;
  if (typeof state === "object") return compact(state.name || state.group || state.id);
  return "";
}

function stateGroupOf(item) {
  const state = item?.state;
  if (!state || typeof state !== "object") return "";
  return compact(state.group || state.state_group || state.category);
}

function isDoneState(item) {
  const values = [stateNameOf(item), stateGroupOf(item)].map((value) => value.toLowerCase()).filter(Boolean);
  return values.some((value) => ["done", "completed", "complete", "cancelled", "canceled"].includes(value));
}

function goalCompletionOf(item) {
  const completion = item?.goal_completion;
  if (!completion || typeof completion !== "object") return { complete: false };
  return {
    complete: completion.complete === true,
    integration_status: compact(completion.integration_status),
    controller_decision: compact(completion.controller_decision).toUpperCase(),
  };
}

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function roleLabelsFrom(labels) {
  return (labels || []).map(compact).filter((label) => label.startsWith("role:"));
}

function summarizeRunItem(item, projectIdentifier) {
  return {
    id: compact(item?.id) || null,
    sequence_id: item?.sequence_id ?? null,
    ref: sequenceRef(item, projectIdentifier),
    name: compact(item?.name),
    state: stateNameOf(item) || null,
    state_group: stateGroupOf(item) || null,
    role_labels: roleLabelsFrom(item?.labels),
  };
}

function summarizeRunChild(item, projectIdentifier) {
  const summary = summarizeRunItem(item, projectIdentifier);
  const reasonCodes = unique(asArray(item?.contract?.reason_codes || item?.reason_codes));
  const contractFields = item?.contract_fields || item?.contract?.fields || {};
  const contractOk = item?.contract?.ok === true || item?.contract_ok === true;
  const stateDone = isDoneState(item);
  const goalCompletion = goalCompletionOf(item);
  const complete = stateDone || goalCompletion.complete;
  if (!contractOk && !reasonCodes.length) reasonCodes.push("contract.validation-missing");
  if (stateDone) reasonCodes.push("child.state-done");
  else if (goalCompletion.complete) reasonCodes.push("child.controller-auto-go");

  return {
    ...summary,
    contract_ok: contractOk,
    dispatch: compact(contractFields.dispatch) || null,
    agent: compact(contractFields.agent) || null,
    mode: compact(contractFields.mode) || null,
    workspace: compact(contractFields.workspace) || null,
    human_gate: compact(contractFields.human_gate) || null,
    reason_codes: unique(reasonCodes),
    ready: contractOk && !complete,
    done: stateDone,
    complete,
    integration_status: goalCompletion.integration_status || null,
    controller_decision: goalCompletion.controller_decision || null,
  };
}

function sequenceSortValue(child) {
  const sequence = compact(child.sequence_id || child.ref);
  const match = sequence.match(/(\d+)$/);
  if (match) return Number.parseInt(match[1], 10);
  return Number.MAX_SAFE_INTEGER;
}

function itemPayload({ name, priority, descriptionHtml, labelIds }) {
  const payload = {
    name,
    priority,
    description_html: descriptionHtml,
  };
  if (labelIds.length) payload.labels = labelIds;
  return payload;
}

function childGoalFromInput(goal, child = {}) {
  const roleLabel = normalizeRoleLabel(child.role || child.roleLabel || child.role_label) || goal.role_label;
  const title = compact(child.title || child.name) || `Worker - ${goal.title}`;
  const outcome = compact(child.outcome) || goal.outcome;
  const childGoal = {
    ...goal,
    title,
    outcome,
    role_label: roleLabel,
    parent_seat: goal.role_label,
    agent: compact(child.agent) || goal.agent,
    mode: compact(child.mode) || goal.mode,
    dispatch: compact(child.dispatch) || "manual",
    human_gate: compact(child.humanGate || child.human_gate) || goal.human_gate,
    source_of_truth: asArray(child.sourceOfTruth || child.source_of_truth || child.source).length
      ? asArray(child.sourceOfTruth || child.source_of_truth || child.source)
      : goal.source_of_truth,
    acceptance_criteria: asArray(child.acceptanceCriteria || child.acceptance_criteria || child.acceptance).length
      ? asArray(child.acceptanceCriteria || child.acceptance_criteria || child.acceptance)
      : [`Child proves this bounded outcome: ${outcome}`],
    gates: asArray(child.gates || child.gate).length
      ? asArray(child.gates || child.gate)
      : goal.gates,
    blocked_actions: asArray(child.blockedActions || child.blocked_actions).length
      ? asArray(child.blockedActions || child.blocked_actions)
      : goal.blocked_actions,
  };
  return childGoal;
}

export function buildGoalMaterialization(input = {}) {
  const goal = input.goal || buildGoalState(input);
  const labelMap = normalizeLabelMap(input.labelMap || input.label_map);
  const workspaceSlug = compact(input.workspaceSlug || input.workspace_slug || input.planeWorkspace || input.plane_workspace) || "companyos";
  const projectId = compact(input.projectId || input.project_id);
  const projectIdentifier = compact(input.projectIdentifier || input.project_identifier) || "COMPA";
  const priority = compact(input.priority) || "medium";
  const parentName = compact(input.parentName || input.parent_name) || `Goal: ${goal.title}`;
  const warnings = [];
  const parentLabelIds = labelIdsFor(goal.role_label, labelMap);
  if (!parentLabelIds.length) warnings.push(`label id missing for ${goal.role_label}`);

  const parentCode = [
    "goal_parent:",
    `  version: ${GOAL_MATERIALIZE_VERSION}`,
    `  goal_id: ${goal.id}`,
    `  owner: ${goal.owner}`,
    `  role_label: ${goal.role_label}`,
    `  workspace: ${goal.workspace}`,
    `  horizon: ${goal.horizon}`,
    "  success:",
    ...goal.acceptance_criteria.map((item) => `    - ${item}`),
    "  non_goals:",
    ...goal.non_goals.map((item) => `    - ${item}`),
  ].join("\n");

  const parent = {
    ref: "parent",
    role_label: goal.role_label,
    label_ids: parentLabelIds,
    payload: itemPayload({
      name: parentName,
      priority,
      labelIds: parentLabelIds,
      descriptionHtml: renderPlaneDescriptionHtml({
        title: parentName,
        summary: goal.outcome,
        bullets: [
          "Parent owns intent, sequencing, synthesis and human gates.",
          "Children own bounded worker contracts.",
          "Dispatch remains manual until Stage 0.5/0.6 and controller gates pass.",
        ],
        code: parentCode,
      }),
    }),
  };

  const children = normalizeMaterializeChildren(input.children, goal).map((child, index) => {
    const childGoal = childGoalFromInput(goal, child);
    const labelIds = labelIdsFor(childGoal.role_label, labelMap);
    if (!labelIds.length) warnings.push(`label id missing for ${childGoal.role_label}`);
    return {
      ref: `child-${index + 1}`,
      parent_ref: parent.ref,
      role_label: childGoal.role_label,
      label_ids: labelIds,
      contract: renderWorkerContract(childGoal),
      payload: itemPayload({
        name: childGoal.title,
        priority: compact(child.priority) || priority,
        labelIds,
        descriptionHtml: renderPlaneDescriptionHtml({
          title: childGoal.title,
          summary: `Child worker contract under ${parentName}. Dispatch stays manual until Stage 0.5 CONTRACT_PASS.`,
          bullets: [
            `Parent: ${parentName}`,
            `Goal: ${goal.id}`,
            "Current state: materialization payload, not dispatch-ready.",
          ],
          code: renderWorkerContract(childGoal),
        }),
      }),
    };
  });

  return {
    version: GOAL_MATERIALIZE_VERSION,
    goal,
    plane: {
      workspace_slug: workspaceSlug,
      project_id: projectId || null,
      project_identifier: projectIdentifier,
    },
    parent,
    children,
    warnings: Array.from(new Set(warnings)),
  };
}

export function planGoalMaterializationApply({ materialization, existingItems = [] } = {}) {
  const errors = [];
  if (!materialization || typeof materialization !== "object") {
    errors.push("materialization is required");
    return { ok: false, errors, actions: [] };
  }
  if (!materialization.plane?.project_id) errors.push("plane.project_id is required for apply");
  if (materialization.warnings?.length) errors.push(...materialization.warnings.map((warning) => `materialization warning blocks apply: ${warning}`));

  const existingByName = new Map((existingItems || []).map((item) => [item.name, item]).filter(([name]) => name));
  const parentExisting = existingByName.get(materialization.parent.payload.name);
  const parentAction = parentExisting ? "keep" : "create";
  const parentId = compact(parentExisting?.id);
  const parent = {
    ref: materialization.parent.ref,
    action: parentAction,
    existing_id: parentId || null,
    payload: materialization.parent.payload,
  };

  const children = materialization.children.map((child) => {
    const existing = existingByName.get(child.payload.name);
    const existingId = compact(existing?.id);
    const existingParentId = parentIdOf(existing);
    let action = "create";
    if (existing) action = (!parentId || existingParentId !== parentId) ? "patch-parent" : "keep";
    return {
      ref: child.ref,
      parent_ref: child.parent_ref,
      action,
      existing_id: existingId || null,
      existing_parent_id: existingParentId || null,
      payload: child.payload,
    };
  });

  const actions = [parent, ...children];
  return {
    ok: errors.length === 0,
    errors,
    parent,
    children,
    actions,
    summary: {
      create: actions.filter((action) => action.action === "create").length,
      keep: actions.filter((action) => action.action === "keep").length,
      patch_parent: actions.filter((action) => action.action === "patch-parent").length,
    },
  };
}

export function planGoalRun({ parent, children = [], maxChildren = 1, projectIdentifier = "COMPA" } = {}) {
  const max = Math.max(1, Number.parseInt(maxChildren, 10) || 1);
  if (!parent) {
    return {
      version: GOAL_RUNNER_VERSION,
      ok: false,
      status: "BLOCKED_DEPENDENCY",
      reason_codes: ["parent.not-found"],
      parent: null,
      max_children: max,
      selected: [],
      queued: [],
      blocked: [],
      skipped: [],
      summary: { children_total: 0, selected: 0, queued: 0, blocked: 0, skipped: 0 },
      next_action: "Resolve the parent reference before selecting child work.",
    };
  }

  const normalizedChildren = (children || [])
    .map((child) => summarizeRunChild(child, projectIdentifier))
    .sort((a, b) => sequenceSortValue(a) - sequenceSortValue(b) || a.name.localeCompare(b.name));
  const skipped = normalizedChildren.filter((child) => child.complete);
  const candidates = normalizedChildren.filter((child) => !child.complete);
  const readyCandidates = candidates.filter((child) => child.ready);
  const selected = readyCandidates.slice(0, max);
  const queued = readyCandidates.slice(max);
  const blocked = candidates.filter((child) => !child.ready);

  let status = "READY";
  let reasonCodes = [];
  let nextAction = "Run the selected dispatcher dry-runs or lock step manually; goal run did not spawn workers.";

  if (!normalizedChildren.length) {
    status = "BLOCKED_DEPENDENCY";
    reasonCodes = ["child.none-found"];
    nextAction = "Create or materialize child work items under the parent before running the goal.";
  } else if (!candidates.length) {
    status = "COMPLETE";
    reasonCodes = ["child.all-done"];
    nextAction = "All child items are completed or cancelled; synthesize the parent outcome and ask for CEO review.";
  } else if (!selected.length) {
    status = "BLOCKED_DEPENDENCY";
    reasonCodes = unique(blocked.flatMap((child) => child.reason_codes));
    if (!reasonCodes.length) reasonCodes = ["child.no-ready-candidates"];
    nextAction = "Resolve child blocker codes first. Materialized children usually need Stage 0.5 contract review and `dispatch: ready` before selection.";
  }

  return {
    version: GOAL_RUNNER_VERSION,
    ok: true,
    status,
    reason_codes: reasonCodes,
    parent: summarizeRunItem(parent, projectIdentifier),
    max_children: max,
    selected,
    queued,
    blocked,
    skipped,
    summary: {
      children_total: normalizedChildren.length,
      selected: selected.length,
      queued: queued.length,
      blocked: blocked.length,
      skipped: skipped.length,
    },
    next_action: nextAction,
  };
}

export function renderGoalMaterializationMarkdown(materialization) {
  return [
    `# Goal Materialization Plan - ${materialization.goal.title}`,
    "",
    `Status: dry-run`,
    `Version: ${materialization.version}`,
    `Date: ${materialization.goal.date}`,
    "",
    "## Plane Target",
    "",
    `- Workspace: ${materialization.plane.workspace_slug}`,
    `- Project: ${materialization.plane.project_identifier}${materialization.plane.project_id ? ` (${materialization.plane.project_id})` : ""}`,
    "",
    "## Parent Payload",
    "",
    "```json",
    JSON.stringify(materialization.parent.payload, null, 2),
    "```",
    "",
    "## Child Payloads",
    "",
    ...materialization.children.flatMap((child) => [
      `### ${child.ref}: ${child.payload.name}`,
      "",
      "```json",
      JSON.stringify(child.payload, null, 2),
      "```",
      "",
    ]),
    "## Warnings",
    "",
    materialization.warnings.length ? yamlList(materialization.warnings) : "- none",
    "",
    "## Next Action",
    "",
    "Review these payloads before applying them to Plane. `materialize --apply` creates or keeps matching items and links children to the parent, but keeps child contracts at `dispatch: manual` until Stage 0.5 returns `CONTRACT_PASS`.",
    "",
  ].join("\n");
}

export function writeGoalMaterialization({ workspaceRoot = process.cwd(), materialization }) {
  const root = path.resolve(workspaceRoot);
  const reportPath = path.join(root, "reports", "goals", materialization.goal.date, `${materialization.goal.slug}-materialize.md`);
  const jsonPath = path.join(root, "reports", "goals", materialization.goal.date, `${materialization.goal.slug}-materialize.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, renderGoalMaterializationMarkdown(materialization));
  fs.writeFileSync(jsonPath, `${JSON.stringify(materialization, null, 2)}\n`);
  return { reportPath, jsonPath };
}
