#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";

import {
  planGoalMaterializationApply,
  planGoalRun,
  buildGoalMaterialization,
  buildGoalState,
  renderGoalMarkdown,
  renderGoalMaterializationMarkdown,
  writeGoalDraft,
  writeGoalMaterialization,
} from "./goal-core.mjs";
import { buildGoalRuntimeAdapter } from "./goal-runtime-adapter-core.mjs";
import { buildGoalLoopPilot } from "./goal-loop-core.mjs";
import {
  buildGoalSynthesis,
  classifySynthesisChild,
  renderGoalSynthesisMarkdown,
  writeGoalSynthesis,
} from "./goal-synthesis-core.mjs";
import {
  buildSupergoalPlan,
  renderSupergoalPlanMarkdown,
  writeSupergoalPlan,
} from "./supergoal-core.mjs";
import { DEFAULT_BASE_URL, resolvePlaneAuth } from "../plane/plane-auth.mjs";
import { extractContractBlock, validateContract } from "../orchestration/worker-ledger-validator.mjs";
import { stripHtml } from "../orchestration/plane-html.mjs";

function usage() {
  console.log([
    "Usage:",
    "  goal.mjs draft --title TEXT --outcome TEXT --role role:coo [options]",
    "  goal.mjs materialize --title TEXT --outcome TEXT --role role:coo [options]",
    "  goal.mjs run --parent [WORK_ITEM_ID] --project-id UUID --max-children 1 --dry-run [options]",
    "  goal.mjs adapt --sequence [WORK_ITEM_ID] --project-id UUID --runtime claude --dry-run [options]",
    "  goal.mjs loop --parent [WORK_ITEM_ID] --project-id UUID --dry-run [options]",
    "  goal.mjs synthesize --parent [WORK_ITEM_ID] --project-id UUID --dry-run [options]",
    "  goal.mjs supergoal --parent [WORK_ITEM_ID] --project-id UUID --project-identifier ATLAS --dry-run [options]",
    "",
    "Options:",
    "  --workspace VALUE        Workspace path or registry key. Default: registry:company-os.",
    "  --owner VALUE            Goal owner. Default: CEO.",
    "  --agent VALUE            Worker agent for first draft. Default: claude.",
    "  --mode VALUE             Worker mode for first draft. Default: plan.",
    "  --horizon VALUE          Time horizon. Default: 30d.",
    "  --human-gate VALUE       Human gate. Default: HG-2.",
    "  --source VALUE           Repeatable source-of-truth entry.",
    "  --metric VALUE           Repeatable measurable success signal.",
    "  --non-goal VALUE         Repeatable non-goal.",
    "  --acceptance VALUE       Repeatable acceptance criterion.",
    "  --gate VALUE             Repeatable gate.",
    "  --risk VALUE             Repeatable risk.",
    "  --date YYYY-MM-DD        Draft date. Default: local today.",
    "  --workspace-root PATH    Repo root for --write. Default: cwd.",
    "  --workspace-slug VALUE   Plane workspace slug for materialize. Default: companyos.",
    "  --project-id UUID        Plane project id for materialize payloads.",
    "  --project-identifier ID  Plane project identifier. Default: COMPA.",
    "  --parent-name VALUE      Override Plane parent item name.",
    "  --parent VALUE           Plane parent ref for run: [WORK_ITEM_ID], sequence id, item id, or exact name.",
    "  --priority VALUE         Plane priority for generated payloads. Default: medium.",
    "  --label-map-file PATH    Optional Plane role label map JSON.",
    "  --child VALUE            Repeatable child spec: title|role|agent|mode.",
    "  --max-children N         Maximum ready children selected by run. Default: 1.",
    "  --sequence COMPA-N        Plane sequence ref for adapt.",
    "  --work-item-id UUID       Plane work item id for adapt.",
    "  --runtime VALUE          Runtime adapter target: claude or codex.",
    "  --model VALUE            Runtime model preview.",
    "  --effort VALUE           Claude effort preview: low, medium, high, xhigh, max. Default: high.",
    "  --permission-mode VALUE  Runtime permission mode preview. Default: plan.",
    "  --max-turns N            Runtime max turns for goal condition. Default: 20.",
    "  --window-hours N         Scheduler loop pilot window. Default: 24.",
    "  --max-passes N           Reserved for supergoal run windows. Current dry-run plans selected pass only.",
    "  --dry-run                Required for run/adapt/loop/synthesize/supergoal. Reads Plane and prints output only.",
    "  --apply                  Apply materialization to Plane idempotently.",
    "  --auth VALUE             Plane auth mode for --apply. Default: app-token.",
    "  --base-url URL           Plane API base URL. Default: https://api.plane.so.",
    "  --write                  Write reports/goals/<date>/<slug>-goal.{md,json}.",
    "  --json                   Print machine-readable output.",
    "  --help                   Show this help.",
    "",
    "Default behavior prints the Markdown draft or materialization payloads and performs no writes. `run --dry-run` and `supergoal --dry-run` only read Plane. Only materialize --apply writes Plane items.",
  ].join("\n"));
}

function pushOption(options, key, value) {
  if (!options[key]) options[key] = [];
  options[key].push(value);
}

function parseArgs(argv) {
  const [rawCommand, ...rest] = argv;
  const command = ["--help", "-h"].includes(rawCommand) ? undefined : rawCommand;
  const options = {
    command,
    workspaceRoot: process.cwd(),
    write: false,
    json: false,
    help: ["--help", "-h"].includes(rawCommand),
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--write") {
      options.write = true;
      continue;
    }
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    const nextValue = () => {
      index += 1;
      if (index >= rest.length) throw new Error(`Missing value for ${arg}`);
      return rest[index];
    };

    if (arg === "--title") options.title = nextValue();
    else if (arg === "--outcome") options.outcome = nextValue();
    else if (arg === "--role") options.role = nextValue();
    else if (arg === "--workspace") options.workspace = nextValue();
    else if (arg === "--owner") options.owner = nextValue();
    else if (arg === "--agent") options.agent = nextValue();
    else if (arg === "--mode") options.mode = nextValue();
    else if (arg === "--horizon") options.horizon = nextValue();
    else if (arg === "--human-gate") options.humanGate = nextValue();
    else if (arg === "--date") options.date = nextValue();
    else if (arg === "--workspace-root") options.workspaceRoot = nextValue();
    else if (arg === "--workspace-slug") options.workspaceSlug = nextValue();
    else if (arg === "--project-id") options.projectId = nextValue();
    else if (arg === "--project-identifier") options.projectIdentifier = nextValue();
    else if (arg === "--parent-name") options.parentName = nextValue();
    else if (arg === "--parent") options.parent = nextValue();
    else if (arg === "--priority") options.priority = nextValue();
    else if (arg === "--max-children") options.maxChildren = nextValue();
    else if (arg === "--sequence") options.sequence = nextValue();
    else if (arg === "--work-item-id") options.workItemId = nextValue();
    else if (arg === "--runtime") options.runtime = nextValue();
    else if (arg === "--model") options.model = nextValue();
    else if (arg === "--effort") options.effort = nextValue();
    else if (arg === "--permission-mode") options.permissionMode = nextValue();
    else if (arg === "--max-turns") options.maxTurns = nextValue();
    else if (arg === "--window-hours") options.windowHours = nextValue();
    else if (arg === "--max-passes") options.maxPasses = nextValue();
    else if (arg === "--label-map-file") options.labelMapFile = nextValue();
    else if (arg === "--auth") options.auth = nextValue();
    else if (arg === "--base-url") options.baseUrl = nextValue();
    else if (arg === "--source") pushOption(options, "source", nextValue());
    else if (arg === "--metric") pushOption(options, "metric", nextValue());
    else if (arg === "--non-goal") pushOption(options, "nonGoal", nextValue());
    else if (arg === "--acceptance") pushOption(options, "acceptance", nextValue());
    else if (arg === "--gate") pushOption(options, "gate", nextValue());
    else if (arg === "--risk") pushOption(options, "risk", nextValue());
    else if (arg === "--child") pushOption(options, "child", nextValue());
    else throw new Error(`Unknown argument: ${arg}`);
  }

  options.workspaceRoot = path.resolve(options.workspaceRoot);
  if (options.labelMapFile) options.labelMapFile = path.resolve(options.labelMapFile);
  options.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  options.auth = options.auth || "app-token";
  return options;
}

function parseChildSpec(spec) {
  const [title, role, agent, mode] = String(spec || "").split("|").map((part) => part.trim());
  return { title, role, agent, mode };
}

async function requestJson({ baseUrl, authHeaders, path: apiPath, method = "GET", body }) {
  const response = await fetch(`${baseUrl}${apiPath}`, {
    method,
    headers: {
      ...authHeaders,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text.slice(0, 500) };
  }

  return { ok: response.ok, status: response.status, body: parsed };
}

function listFromPlaneResponse(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function sanitizeState(state) {
  if (!state) return null;
  if (typeof state === "string") return state;
  if (typeof state !== "object") return String(state);
  return {
    id: state.id || null,
    name: state.name || null,
    group: state.group || state.state_group || state.category || null,
  };
}

function sanitizeItem(item) {
  if (!item || typeof item !== "object") return null;
  return {
    id: item.id,
    sequence_id: item.sequence_id,
    name: item.name,
    parent: typeof item.parent === "object" ? item.parent?.id : item.parent,
    state: sanitizeState(item.state),
    labels: (item.labels || []).map((label) => typeof label === "object" ? (label.name || label.id) : label),
    description_html: item.description_html || "",
    description_stripped: item.description_stripped || "",
    description: item.description || "",
  };
}

async function listPlaneWorkItems({ baseUrl, authHeaders, workspaceSlug, projectId }) {
  const items = [];
  let cursor = "";
  for (let page = 0; page < 50; page += 1) {
    const cursorPart = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
    const pathWithQuery = `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/work-items/?fields=id,sequence_id,name,parent,state,labels,description_html,description_stripped&expand=labels,parent,state&per_page=100${cursorPart}`;
    const response = await requestJson({ baseUrl, authHeaders, path: pathWithQuery });
    if (!response.ok) return { ok: false, status: response.status, error: response.body, items };
    items.push(...listFromPlaneResponse(response.body).map(sanitizeItem).filter(Boolean));
    if (!response.body?.next_page_results) {
      return {
        ok: true,
        status: response.status,
        items,
        pagination: { pages: page + 1, complete: true },
      };
    }
    if (!response.body?.next_cursor) {
      return {
        ok: false,
        status: response.status,
        error: { detail: "Plane pagination indicated next_page_results without next_cursor", page: page + 1 },
        items,
      };
    }
    cursor = response.body.next_cursor;
  }
  return {
    ok: false,
    status: 508,
    error: { detail: "Plane pagination exceeded 50 pages; refusing partial supergoal state" },
    items,
  };
}

async function listPlaneComments({ baseUrl, authHeaders, workspaceSlug, projectId, workItemId }) {
  const apiPath = `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(workItemId)}/comments/`;
  const response = await requestJson({ baseUrl, authHeaders, path: apiPath });
  if (!response.ok) return { ok: false, status: response.status, error: response.body, comments: [] };
  return {
    ok: true,
    status: response.status,
    comments: listFromPlaneResponse(response.body).map((comment) => ({
      id: comment.id || null,
      created_at: comment.created_at || null,
      updated_at: comment.updated_at || null,
      body: stripHtml(comment.comment_html || comment.comment_stripped || comment.description_html || ""),
    })),
  };
}

function sequenceRef(item, projectIdentifier) {
  const sequence = String(item?.sequence_id || "").trim();
  if (!sequence) return item?.id || item?.name || "";
  if (/^[A-Z]+-\d+$/i.test(sequence)) return sequence.toUpperCase();
  return `${projectIdentifier || "COMPA"}-${sequence}`;
}

function sequenceNumber(ref) {
  const text = String(ref || "").trim();
  const match = text.match(/(?:^|[A-Z]+-)(\d+)$/i);
  return match ? match[1] : text;
}

function resolveParentItem({ items, parentRef, projectIdentifier }) {
  const wanted = String(parentRef || "").trim();
  if (!wanted) return null;
  const wantedLower = wanted.toLowerCase();
  const wantedSequence = sequenceNumber(wanted);
  return (items || []).find((item) => {
    const sequence = String(item.sequence_id || "").trim();
    return item.id === wanted
      || String(item.name || "").trim().toLowerCase() === wantedLower
      || sequence === wantedSequence
      || sequenceRef(item, projectIdentifier).toLowerCase() === wantedLower;
  }) || null;
}

function resolveWorkItem({ items, workItemId, sequenceId, projectIdentifier }) {
  if (workItemId) return (items || []).find((item) => item.id === workItemId) || null;
  if (!sequenceId) return null;
  const wantedLower = String(sequenceId).trim().toLowerCase();
  const wantedSequence = sequenceNumber(sequenceId);
  return (items || []).find((item) => {
    const sequence = String(item.sequence_id || "").trim();
    return sequence === wantedSequence
      || sequenceRef(item, projectIdentifier).toLowerCase() === wantedLower
      || String(item.name || "").trim().toLowerCase() === wantedLower;
  }) || null;
}

function roleLabelForItem(item) {
  return (item?.labels || []).find((label) => String(label || "").startsWith("role:")) || "";
}

function enrichChildForRun({ item, parentRoleLabel }) {
  const description = stripHtml(item.description_html || item.description_stripped || item.description || "");
  const contract = validateContract({
    description,
    labels: item.labels || [],
    parentRoleLabel,
  });
  const extracted = extractContractBlock(description);
  return {
    ...item,
    contract,
    contract_fields: extracted.ok ? extracted.fields : {},
  };
}

function dispatcherDryRunCommand({ item, workspaceSlug, projectId, projectIdentifier, authMode }) {
  return [
    "node scripts/orchestration/plane-dispatcher-v0.mjs",
    `--workspace ${workspaceSlug}`,
    `--project-id ${projectId}`,
    `--sequence ${sequenceRef(item, projectIdentifier)}`,
    "--mode dry-run",
    "--contract-review require",
    `--auth ${authMode}`,
    "--json",
  ].join(" ");
}

async function runGoalDryRun({ baseUrl, authMode, workspaceSlug, projectId, projectIdentifier, parentRef, maxChildren }) {
  if (!parentRef) {
    return { ok: false, error_code: "RUN_PARENT_REQUIRED", errors: ["--parent is required for run"] };
  }
  if (!projectId) {
    return { ok: false, error_code: "RUN_PROJECT_REQUIRED", errors: ["--project-id is required for run"] };
  }

  const auth = resolvePlaneAuth(authMode);
  if (!auth.ok) {
    return {
      ok: false,
      error_code: "BLOCKED_AUTH",
      errors: [auth.missingError],
      authMode: auth.authMode,
    };
  }

  const listed = await listPlaneWorkItems({ baseUrl, authHeaders: auth.headers, workspaceSlug, projectId });
  if (!listed.ok) {
    return {
      ok: false,
      error_code: "PLANE_LIST_FAILED",
      status: listed.status,
      errors: [JSON.stringify(listed.error)],
      authMode: auth.authMode,
    };
  }

  const parent = resolveParentItem({ items: listed.items, parentRef, projectIdentifier });
  const parentRoleLabel = roleLabelForItem(parent);
  const children = [];
  if (parent) {
    for (const item of listed.items.filter((row) => row.parent === parent.id)) {
      const comments = await listPlaneComments({
        baseUrl,
        authHeaders: auth.headers,
        workspaceSlug,
        projectId,
        workItemId: item.id,
      });
      if (!comments.ok) {
        return {
          ok: false,
          error_code: "PLANE_COMMENTS_FAILED",
          status: comments.status,
          errors: [JSON.stringify(comments.error)],
          authMode: auth.authMode,
        };
      }
      const synthesisChild = classifySynthesisChild({
        item,
        comments: comments.comments,
        projectIdentifier,
      });
      children.push({
        ...enrichChildForRun({ item, parentRoleLabel }),
        goal_completion: {
          complete: synthesisChild.complete,
          integration_status: synthesisChild.integration_status,
          controller_decision: synthesisChild.controller_decision,
          evidence: synthesisChild.evidence,
          blockers: synthesisChild.blockers,
        },
      });
    }
  }
  const plan = planGoalRun({
    parent,
    children,
    maxChildren,
    projectIdentifier,
  });
  const selectedById = new Map(children.map((item) => [item.id, item]));
  const selected = plan.selected.map((child) => ({
    ...child,
    dispatcher_dry_run_command: dispatcherDryRunCommand({
      item: selectedById.get(child.id) || child,
      workspaceSlug,
      projectId,
      projectIdentifier,
      authMode: auth.authMode,
    }),
  }));

  return {
    ok: plan.ok,
    dry_run: true,
    authMode: auth.authMode,
    plane: {
      workspace_slug: workspaceSlug,
      project_id: projectId,
      project_identifier: projectIdentifier,
      parent_ref: parentRef,
    },
    plan: { ...plan, selected },
  };
}

async function runGoalAdapterDryRun({
  baseUrl,
  authMode,
  workspaceSlug,
  projectId,
  projectIdentifier,
  sequenceId,
  workItemId,
  runtime,
  model,
  effort,
  permissionMode,
  maxTurns,
}) {
  if (!sequenceId && !workItemId) {
    return { ok: false, error_code: "ADAPTER_ITEM_REQUIRED", errors: ["--sequence or --work-item-id is required for adapt"] };
  }
  if (!projectId) {
    return { ok: false, error_code: "ADAPTER_PROJECT_REQUIRED", errors: ["--project-id is required for adapt"] };
  }

  const auth = resolvePlaneAuth(authMode);
  if (!auth.ok) {
    return {
      ok: false,
      error_code: "BLOCKED_AUTH",
      errors: [auth.missingError],
      authMode: auth.authMode,
    };
  }

  const listed = await listPlaneWorkItems({ baseUrl, authHeaders: auth.headers, workspaceSlug, projectId });
  if (!listed.ok) {
    return {
      ok: false,
      error_code: "PLANE_LIST_FAILED",
      status: listed.status,
      errors: [JSON.stringify(listed.error)],
      authMode: auth.authMode,
    };
  }

  const item = resolveWorkItem({ items: listed.items, workItemId, sequenceId, projectIdentifier });
  if (!item) {
    return {
      ok: false,
      error_code: "ADAPTER_ITEM_NOT_FOUND",
      errors: [`work item not found: ${workItemId || sequenceId}`],
      authMode: auth.authMode,
    };
  }

  const description = stripHtml(item.description_html || item.description_stripped || item.description || "");
  const contractValidation = validateContract({ description, labels: item.labels || [] });
  const extracted = extractContractBlock(description);
  const contractFields = extracted.ok ? extracted.fields : {};
  const adapter = buildGoalRuntimeAdapter({
    workItem: item,
    contractFields,
    contractValidation,
    description,
    runtime,
    projectIdentifier,
    model,
    effort,
    permissionMode,
    maxTurns: Number.parseInt(maxTurns, 10) || 20,
  });

  return {
    ok: true,
    dry_run: true,
    authMode: auth.authMode,
    plane: {
      workspace_slug: workspaceSlug,
      project_id: projectId,
      project_identifier: projectIdentifier,
      item_ref: sequenceId || workItemId,
    },
    contract: contractValidation,
    adapter,
  };
}

async function runGoalLoopDryRun({
  baseUrl,
  authMode,
  workspaceSlug,
  projectId,
  projectIdentifier,
  parentRef,
  windowHours,
}) {
  const runResult = await runGoalDryRun({
    baseUrl,
    authMode,
    workspaceSlug,
    projectId,
    projectIdentifier,
    parentRef,
    maxChildren: 1,
  });
  if (!runResult.ok) return runResult;
  const loop = buildGoalLoopPilot({
    runPlan: runResult.plan,
    workspaceSlug,
    projectId,
    projectIdentifier,
    authMode: runResult.authMode,
    parentRef,
    windowHours,
  });
  return {
    ok: true,
    dry_run: true,
    authMode: runResult.authMode,
    plane: runResult.plane,
    selector: runResult.plan,
    loop,
  };
}

async function runGoalSynthesisDryRun({
  baseUrl,
  authMode,
  workspaceSlug,
  projectId,
  projectIdentifier,
  parentRef,
  workspaceRoot,
  write,
}) {
  if (!parentRef) {
    return { ok: false, error_code: "SYNTHESIS_PARENT_REQUIRED", errors: ["--parent is required for synthesize"] };
  }
  if (!projectId) {
    return { ok: false, error_code: "SYNTHESIS_PROJECT_REQUIRED", errors: ["--project-id is required for synthesize"] };
  }
  const auth = resolvePlaneAuth(authMode);
  if (!auth.ok) {
    return {
      ok: false,
      error_code: "BLOCKED_AUTH",
      errors: [auth.missingError],
      authMode: auth.authMode,
    };
  }

  const listed = await listPlaneWorkItems({ baseUrl, authHeaders: auth.headers, workspaceSlug, projectId });
  if (!listed.ok) {
    return {
      ok: false,
      error_code: "PLANE_LIST_FAILED",
      status: listed.status,
      errors: [JSON.stringify(listed.error)],
      authMode: auth.authMode,
    };
  }

  const parent = resolveParentItem({ items: listed.items, parentRef, projectIdentifier });
  const children = parent ? listed.items.filter((item) => item.parent === parent.id) : [];
  const commentsByItemId = {};
  for (const item of children) {
    const comments = await listPlaneComments({
      baseUrl,
      authHeaders: auth.headers,
      workspaceSlug,
      projectId,
      workItemId: item.id,
    });
    if (!comments.ok) {
      return {
        ok: false,
        error_code: "PLANE_COMMENTS_FAILED",
        status: comments.status,
        errors: [`${item.id}: ${JSON.stringify(comments.error)}`],
        authMode: auth.authMode,
      };
    }
    commentsByItemId[item.id] = comments.comments;
  }
  const synthesis = buildGoalSynthesis({
    parent,
    children,
    commentsByItemId,
    projectIdentifier,
  });
  const output = write ? writeGoalSynthesis({ workspaceRoot, synthesis }) : {};
  return {
    ok: true,
    dry_run: true,
    authMode: auth.authMode,
    plane: {
      workspace_slug: workspaceSlug,
      project_id: projectId,
      project_identifier: projectIdentifier,
      parent_ref: parentRef,
    },
    write: Boolean(write),
    synthesis,
    ...output,
  };
}

function collectDescendantItemsForComments({ items, parent }) {
  if (!parent?.id) return [];
  const childrenByParent = new Map();
  for (const item of items || []) {
    const parentId = typeof item.parent === "object" ? item.parent?.id : item.parent;
    if (!parentId) continue;
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(item);
  }
  const descendants = [];
  const queue = [...(childrenByParent.get(parent.id) || [])];
  const seen = new Set();
  while (queue.length) {
    const item = queue.shift();
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    descendants.push(item);
    queue.push(...(childrenByParent.get(item.id) || []));
  }
  return descendants;
}

async function runSupergoalDryRun({
  baseUrl,
  authMode,
  workspaceSlug,
  projectId,
  projectIdentifier,
  parentRef,
  maxChildren,
  windowHours,
  workspaceRoot,
  write,
}) {
  if (!parentRef) {
    return { ok: false, error_code: "SUPERGOAL_PARENT_REQUIRED", errors: ["--parent is required for supergoal"] };
  }
  if (!projectId) {
    return { ok: false, error_code: "SUPERGOAL_PROJECT_REQUIRED", errors: ["--project-id is required for supergoal"] };
  }
  const auth = resolvePlaneAuth(authMode);
  if (!auth.ok) {
    return {
      ok: false,
      error_code: "BLOCKED_AUTH",
      errors: [auth.missingError],
      authMode: auth.authMode,
    };
  }

  const listed = await listPlaneWorkItems({ baseUrl, authHeaders: auth.headers, workspaceSlug, projectId });
  if (!listed.ok) {
    return {
      ok: false,
      error_code: "PLANE_LIST_FAILED",
      status: listed.status,
      errors: [JSON.stringify(listed.error)],
      authMode: auth.authMode,
    };
  }

  const parent = resolveParentItem({ items: listed.items, parentRef, projectIdentifier });
  const descendants = collectDescendantItemsForComments({ items: listed.items, parent });
  const commentsByItemId = {};
  for (const item of descendants) {
    const comments = await listPlaneComments({
      baseUrl,
      authHeaders: auth.headers,
      workspaceSlug,
      projectId,
      workItemId: item.id,
    });
    if (!comments.ok) {
      return {
        ok: false,
        error_code: "PLANE_COMMENTS_FAILED",
        status: comments.status,
        errors: [`${item.id}: ${JSON.stringify(comments.error)}`],
        authMode: auth.authMode,
      };
    }
    commentsByItemId[item.id] = comments.comments;
  }

  const plan = buildSupergoalPlan({
    root: parent,
    items: listed.items,
    commentsByItemId,
    projectIdentifier,
    maxChildren,
    windowHours,
  });
  const output = write ? writeSupergoalPlan({ workspaceRoot, plan }) : {};
  return {
    ok: plan.ok,
    dry_run: true,
    authMode: auth.authMode,
    plane: {
      workspace_slug: workspaceSlug,
      project_id: projectId,
      project_identifier: projectIdentifier,
      parent_ref: parentRef,
      listed_items: listed.items.length,
      listed_pages: listed.pagination?.pages || null,
    },
    write: Boolean(write),
    plan,
    ...output,
  };
}

async function createPlaneWorkItem({ baseUrl, authHeaders, workspaceSlug, projectId, payload }) {
  const response = await requestJson({
    baseUrl,
    authHeaders,
    method: "POST",
    path: `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/work-items/`,
    body: payload,
  });
  return {
    ok: response.ok,
    status: response.status,
    item: response.ok ? sanitizeItem(response.body) : null,
    error: response.ok ? null : response.body,
  };
}

async function patchPlaneWorkItem({ baseUrl, authHeaders, workspaceSlug, projectId, workItemId, payload }) {
  const response = await requestJson({
    baseUrl,
    authHeaders,
    method: "PATCH",
    path: `/api/v1/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(workItemId)}/`,
    body: payload,
  });
  return {
    ok: response.ok,
    status: response.status,
    item: response.ok ? sanitizeItem(response.body) : null,
    error: response.ok ? null : response.body,
  };
}

async function applyGoalMaterialization({ materialization, baseUrl, authMode }) {
  const auth = resolvePlaneAuth(authMode);
  if (!auth.ok) {
    return {
      ok: false,
      error_code: "BLOCKED_AUTH",
      errors: [auth.missingError],
      authMode: auth.authMode,
    };
  }

  const workspaceSlug = materialization.plane.workspace_slug;
  const projectId = materialization.plane.project_id;
  const listed = await listPlaneWorkItems({ baseUrl, authHeaders: auth.headers, workspaceSlug, projectId });
  if (!listed.ok) {
    return {
      ok: false,
      error_code: "PLANE_LIST_FAILED",
      status: listed.status,
      errors: [JSON.stringify(listed.error)],
      authMode: auth.authMode,
    };
  }

  const plan = planGoalMaterializationApply({ materialization, existingItems: listed.items });
  if (!plan.ok) {
    return {
      ok: false,
      error_code: "APPLY_PLAN_REJECTED",
      errors: plan.errors,
      plan,
      authMode: auth.authMode,
    };
  }

  let parentResult = null;
  if (plan.parent.action === "create") {
    parentResult = await createPlaneWorkItem({
      baseUrl,
      authHeaders: auth.headers,
      workspaceSlug,
      projectId,
      payload: plan.parent.payload,
    });
    if (!parentResult.ok) {
      return {
        ok: false,
        error_code: "PLANE_PARENT_CREATE_FAILED",
        status: parentResult.status,
        error: parentResult.error,
        plan,
        authMode: auth.authMode,
      };
    }
  } else {
    parentResult = {
      ok: true,
      status: 200,
      item: listed.items.find((item) => item.id === plan.parent.existing_id),
    };
  }

  const parentId = parentResult.item?.id;
  const children = [];
  for (const child of plan.children) {
    if (child.action === "create") {
      const created = await createPlaneWorkItem({
        baseUrl,
        authHeaders: auth.headers,
        workspaceSlug,
        projectId,
        payload: { ...child.payload, parent: parentId },
      });
      children.push({ ...child, result: created });
      if (!created.ok) {
        return {
          ok: false,
          error_code: "PLANE_CHILD_CREATE_FAILED",
          status: created.status,
          error: created.error,
          parent: { action: plan.parent.action, item: parentResult.item },
          children,
          plan,
          authMode: auth.authMode,
        };
      }
      continue;
    }

    if (child.action === "patch-parent") {
      const patched = await patchPlaneWorkItem({
        baseUrl,
        authHeaders: auth.headers,
        workspaceSlug,
        projectId,
        workItemId: child.existing_id,
        payload: { parent: parentId },
      });
      children.push({ ...child, result: patched });
      if (!patched.ok) {
        return {
          ok: false,
          error_code: "PLANE_CHILD_PATCH_FAILED",
          status: patched.status,
          error: patched.error,
          parent: { action: plan.parent.action, item: parentResult.item },
          children,
          plan,
          authMode: auth.authMode,
        };
      }
      continue;
    }

    children.push({
      ...child,
      result: {
        ok: true,
        status: 200,
        item: listed.items.find((item) => item.id === child.existing_id),
      },
    });
  }

  return {
    ok: true,
    authMode: auth.authMode,
    parent: { action: plan.parent.action, item: parentResult.item },
    children: children.map((child) => ({
      ref: child.ref,
      action: child.action,
      item: child.result.item,
    })),
    summary: {
      parent: plan.parent.action,
      children_created: children.filter((child) => child.action === "create").length,
      children_kept: children.filter((child) => child.action === "keep").length,
      children_patched: children.filter((child) => child.action === "patch-parent").length,
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !["draft", "materialize", "run", "adapt", "loop", "synthesize", "supergoal"].includes(options.command)) {
    usage();
    if (!options.help) process.exitCode = 2;
    return;
  }

  if (options.command === "run") {
    if (!options.dryRun) {
      process.stderr.write("Goal run currently requires --dry-run. It reads Plane and never spawns workers.\n");
      process.exitCode = 2;
      return;
    }
    const runResult = await runGoalDryRun({
      baseUrl: options.baseUrl,
      authMode: options.auth,
      workspaceSlug: options.workspaceSlug || "companyos",
      projectId: options.projectId,
      projectIdentifier: options.projectIdentifier || "COMPA",
      parentRef: options.parent,
      maxChildren: options.maxChildren || 1,
    });
    if (options.json) {
      process.stdout.write(`${JSON.stringify(runResult, null, 2)}\n`);
      if (!runResult.ok) process.exitCode = runResult.error_code === "BLOCKED_AUTH" ? 2 : 1;
      return;
    }
    if (!runResult.ok) {
      process.stderr.write(`Goal run failed: ${runResult.error_code}\n`);
      for (const error of runResult.errors || []) process.stderr.write(`error: ${error}\n`);
      process.exitCode = runResult.error_code === "BLOCKED_AUTH" ? 2 : 1;
      return;
    }
    const { plan } = runResult;
    process.stdout.write(`Goal run dry-run: ${plan.status}\n`);
    process.stdout.write(`Parent: ${plan.parent?.ref || options.parent} ${plan.parent?.name || ""}\n`);
    if (plan.reason_codes.length) process.stdout.write(`Reason codes: ${plan.reason_codes.join(", ")}\n`);
    for (const child of plan.selected) {
      process.stdout.write(`Selected: ${child.ref} ${child.name}\n`);
      process.stdout.write(`Command: ${child.dispatcher_dry_run_command}\n`);
    }
    for (const child of plan.blocked) {
      process.stdout.write(`Blocked: ${child.ref} ${child.name} [${child.reason_codes.join(", ")}]\n`);
    }
    process.stdout.write(`Next action: ${plan.next_action}\n`);
    return;
  }

  if (options.command === "adapt") {
    if (!options.dryRun) {
      process.stderr.write("Goal adapt currently requires --dry-run. It reads Plane and emits wrapper previews only.\n");
      process.exitCode = 2;
      return;
    }
    const adapterResult = await runGoalAdapterDryRun({
      baseUrl: options.baseUrl,
      authMode: options.auth,
      workspaceSlug: options.workspaceSlug || "companyos",
      projectId: options.projectId,
      projectIdentifier: options.projectIdentifier || "COMPA",
      sequenceId: options.sequence,
      workItemId: options.workItemId,
      runtime: options.runtime,
      model: options.model,
      effort: options.effort,
      permissionMode: options.permissionMode || "plan",
      maxTurns: options.maxTurns || 20,
    });
    if (options.json) {
      process.stdout.write(`${JSON.stringify(adapterResult, null, 2)}\n`);
      if (!adapterResult.ok) process.exitCode = adapterResult.error_code === "BLOCKED_AUTH" ? 2 : 1;
      return;
    }
    if (!adapterResult.ok) {
      process.stderr.write(`Goal adapter failed: ${adapterResult.error_code}\n`);
      for (const error of adapterResult.errors || []) process.stderr.write(`error: ${error}\n`);
      process.exitCode = adapterResult.error_code === "BLOCKED_AUTH" ? 2 : 1;
      return;
    }
    const { adapter } = adapterResult;
    process.stdout.write(`Goal adapter dry-run: ${adapter.runtime} ${adapter.can_start ? "STARTABLE" : "BLOCKED"}\n`);
    process.stdout.write(`Work item: ${adapter.work_item.ref} ${adapter.work_item.name}\n`);
    if (adapter.blocked_reasons.length) process.stdout.write(`Blocked reasons: ${adapter.blocked_reasons.join(", ")}\n`);
    process.stdout.write(`Command preview: ${adapter.command_preview.join(" ")}\n`);
    process.stdout.write(`Prompt chars: ${adapter.prompt_chars}\n`);
    return;
  }

  if (options.command === "loop") {
    if (!options.dryRun) {
      process.stderr.write("Goal loop currently requires --dry-run. It plans one parent pass and never creates an automation.\n");
      process.exitCode = 2;
      return;
    }
    const loopResult = await runGoalLoopDryRun({
      baseUrl: options.baseUrl,
      authMode: options.auth,
      workspaceSlug: options.workspaceSlug || "companyos",
      projectId: options.projectId,
      projectIdentifier: options.projectIdentifier || "COMPA",
      parentRef: options.parent,
      windowHours: options.windowHours || 24,
    });
    if (options.json) {
      process.stdout.write(`${JSON.stringify(loopResult, null, 2)}\n`);
      if (!loopResult.ok) process.exitCode = loopResult.error_code === "BLOCKED_AUTH" ? 2 : 1;
      return;
    }
    if (!loopResult.ok) {
      process.stderr.write(`Goal loop failed: ${loopResult.error_code}\n`);
      for (const error of loopResult.errors || []) process.stderr.write(`error: ${error}\n`);
      process.exitCode = loopResult.error_code === "BLOCKED_AUTH" ? 2 : 1;
      return;
    }
    const { loop } = loopResult;
    process.stdout.write(`Goal loop dry-run: ${loop.status}\n`);
    if (loop.stop_reason_codes.length) process.stdout.write(`Stop reasons: ${loop.stop_reason_codes.join(", ")}\n`);
    if (loop.selected_child) process.stdout.write(`Selected child: ${loop.selected_child.ref} ${loop.selected_child.name}\n`);
    for (const step of loop.planned_steps) process.stdout.write(`Planned ${step.step}: ${step.command}\n`);
    for (const guarantee of loop.guarantees) process.stdout.write(`Guarantee: ${guarantee}\n`);
    return;
  }

  if (options.command === "synthesize") {
    if (!options.dryRun) {
      process.stderr.write("Goal synthesize currently requires --dry-run. It reads Plane and may write only local artifacts with --write.\n");
      process.exitCode = 2;
      return;
    }
    const synthesisResult = await runGoalSynthesisDryRun({
      baseUrl: options.baseUrl,
      authMode: options.auth,
      workspaceSlug: options.workspaceSlug || "companyos",
      projectId: options.projectId,
      projectIdentifier: options.projectIdentifier || "COMPA",
      parentRef: options.parent,
      workspaceRoot: options.workspaceRoot,
      write: options.write,
    });
    if (options.json) {
      process.stdout.write(`${JSON.stringify(synthesisResult, null, 2)}\n`);
      if (!synthesisResult.ok) process.exitCode = synthesisResult.error_code === "BLOCKED_AUTH" ? 2 : 1;
      return;
    }
    if (!synthesisResult.ok) {
      process.stderr.write(`Goal synthesis failed: ${synthesisResult.error_code}\n`);
      for (const error of synthesisResult.errors || []) process.stderr.write(`error: ${error}\n`);
      process.exitCode = synthesisResult.error_code === "BLOCKED_AUTH" ? 2 : 1;
      return;
    }
    if (options.write) {
      process.stdout.write(`Goal synthesis written: ${synthesisResult.reportPath}\n`);
      process.stdout.write(`Goal synthesis JSON written: ${synthesisResult.jsonPath}\n`);
      return;
    }
    process.stdout.write(renderGoalSynthesisMarkdown(synthesisResult.synthesis));
    return;
  }

  if (options.command === "supergoal") {
    if (!options.dryRun) {
      process.stderr.write("Goal supergoal currently requires --dry-run. It reads Plane, classifies gates and never spawns workers.\n");
      process.exitCode = 2;
      return;
    }
    const supergoalResult = await runSupergoalDryRun({
      baseUrl: options.baseUrl,
      authMode: options.auth,
      workspaceSlug: options.workspaceSlug || "companyos",
      projectId: options.projectId,
      projectIdentifier: options.projectIdentifier || "COMPA",
      parentRef: options.parent,
      maxChildren: options.maxChildren || 1,
      windowHours: options.windowHours || 24,
      workspaceRoot: options.workspaceRoot,
      write: options.write,
    });
    if (options.json) {
      process.stdout.write(`${JSON.stringify(supergoalResult, null, 2)}\n`);
      if (!supergoalResult.ok) process.exitCode = supergoalResult.error_code === "BLOCKED_AUTH" ? 2 : 1;
      return;
    }
    if (!supergoalResult.ok) {
      process.stderr.write(`Goal supergoal failed: ${supergoalResult.error_code}\n`);
      for (const error of supergoalResult.errors || []) process.stderr.write(`error: ${error}\n`);
      process.exitCode = supergoalResult.error_code === "BLOCKED_AUTH" ? 2 : 1;
      return;
    }
    if (options.write) {
      process.stdout.write(`Supergoal plan written: ${supergoalResult.reportPath}\n`);
      process.stdout.write(`Supergoal plan JSON written: ${supergoalResult.jsonPath}\n`);
      return;
    }
    process.stdout.write(renderSupergoalPlanMarkdown(supergoalResult.plan));
    return;
  }

  const goal = buildGoalState(options);
  if (options.command === "materialize") {
    const labelMap = options.labelMapFile ? JSON.parse(fs.readFileSync(options.labelMapFile, "utf8")) : undefined;
    const materialization = buildGoalMaterialization({
      goal,
      labelMap,
      workspaceSlug: options.workspaceSlug,
      projectId: options.projectId,
      projectIdentifier: options.projectIdentifier,
      parentName: options.parentName,
      priority: options.priority,
      children: (options.child || []).map(parseChildSpec),
    });
    const applyResult = options.apply
      ? await applyGoalMaterialization({
        materialization,
        baseUrl: options.baseUrl,
        authMode: options.auth,
      })
      : null;
    const output = options.write
      ? writeGoalMaterialization({ workspaceRoot: options.workspaceRoot, materialization })
      : {};
    if (options.json) {
      process.stdout.write(`${JSON.stringify({ write: options.write, apply: options.apply, materialization, applyResult, ...output }, null, 2)}\n`);
      if (applyResult && !applyResult.ok) process.exitCode = applyResult.error_code === "BLOCKED_AUTH" ? 2 : 1;
      return;
    }
    if (applyResult) {
      if (!applyResult.ok) {
        process.stderr.write(`Goal materialization apply failed: ${applyResult.error_code}\n`);
        for (const error of applyResult.errors || []) process.stderr.write(`error: ${error}\n`);
        process.exitCode = applyResult.error_code === "BLOCKED_AUTH" ? 2 : 1;
        return;
      }
      process.stdout.write(`Goal materialization applied: parent ${applyResult.parent.item?.sequence_id || applyResult.parent.item?.id} (${applyResult.parent.action})\n`);
      for (const child of applyResult.children) {
        process.stdout.write(`Child ${child.item?.sequence_id || child.item?.id}: ${child.item?.name} (${child.action})\n`);
      }
      return;
    }
    if (options.write) {
      process.stdout.write(`Goal materialization written: ${output.reportPath}\n`);
      process.stdout.write(`Goal materialization JSON written: ${output.jsonPath}\n`);
      return;
    }
    process.stdout.write(renderGoalMaterializationMarkdown(materialization));
    return;
  }

  const output = options.write ? writeGoalDraft({ workspaceRoot: options.workspaceRoot, goal }) : {};
  if (options.json) {
    process.stdout.write(`${JSON.stringify({ write: options.write, goal, ...output }, null, 2)}\n`);
    return;
  }
  if (options.write) {
    process.stdout.write(`Goal draft written: ${output.reportPath}\n`);
    process.stdout.write(`Goal JSON written: ${output.jsonPath}\n`);
    return;
  }
  process.stdout.write(renderGoalMarkdown(goal));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
