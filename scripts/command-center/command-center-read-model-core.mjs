import fs from "node:fs";
import path from "node:path";
import { HUMAN_GATE_LEVELS, reduceAgentEvents } from "../agent-events/agent-event-core.mjs";

export const COMMAND_CENTER_READ_MODEL_VERSION = "command-center-read-model/v0";

const TERMINAL_WORKER_STATES = new Set(["reported", "needs_audit", "blocked", "timed_out", "cancelled"]);
const BLOCKED_ISSUE_STATES = new Set(["blocked", "rejected"]);
const HUMAN_GATE_EVENT_TYPES = new Set(["human_gate.required", "human_gate.released", "human_gate.rejected"]);
const CEO_CRITICAL_RELEASE_OWNERS = new Set(["CEO", "Codex-GPT-5.5-xhigh", "GPT-5.5-xhigh", "delegated-controller", "Founder", "human"]);
const HG35_ROUTE_PATTERN = /\b(?:CEO_CRITICAL_HOLD|HG-3\.5|Chief[-\s]?of[-\s]?Staff|Founder[-\s]?Proxy|EVE|founder-proxy-review|route(?:d)?\s+to\s+HG-3\.5|hold|held)\b/i;

function asArray(value) {
  if (value === null || value === undefined || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function byIsoAsc(a, b) {
  return Date.parse(a.occurred_at || "") - Date.parse(b.occurred_at || "");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function latestEvent(rows) {
  return [...rows].sort(byIsoAsc).at(-1) || null;
}

function groupByRun(rows) {
  const groups = new Map();
  for (const row of rows || []) {
    const key = row.run_id || row.session_id || row.issue_id || "(unknown)";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

function eventTypeCounts(rows) {
  const counts = {};
  for (const row of rows || []) counts[row.event_type] = (counts[row.event_type] || 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function traceCardFromEvent(row) {
  const payload = row?.payload || {};
  const artifacts = asArray(row?.artifact_paths);
  const traceJson = payload.raindrop_summary_json
    || artifacts.find((item) => item.includes("/raindrop-workshop/") && item.endsWith(".json") && !item.includes(".prompt-result."))
    || null;
  const traceMd = payload.raindrop_summary_md
    || artifacts.find((item) => item.includes("/raindrop-workshop/") && item.endsWith(".md") && !item.includes(".prompt-result."))
    || null;
  const promptResult = artifacts.find((item) => item.includes(".prompt-result.") && item.endsWith(".md"))
    || artifacts.find((item) => item.includes(".prompt-result."))
    || null;
  if (!traceJson && !traceMd && !promptResult) return null;
  return {
    run_id: row.run_id || "",
    issue_id: row.issue_id || "",
    agent: row.agent || "",
    mode: row.mode || "",
    source_event_id: row.event_id || "",
    redaction_level: row.redaction_level || "",
    trace_json: traceJson,
    trace_markdown: traceMd,
    prompt_result: promptResult,
  };
}

function dedupeTraceCards(cards) {
  const seen = new Set();
  const out = [];
  for (const card of cards) {
    const key = [
      card.run_id,
      card.trace_json || "",
      card.trace_markdown || "",
      card.prompt_result || "",
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(card);
  }
  return out;
}

function humanGateLevelFromRows(rows) {
  const ordered = [...rows].sort(byIsoAsc).reverse();
  for (const row of ordered) {
    const level = row?.payload?.level || row?.payload?.human_gate_level || row?.payload?.gate_level || "";
    if (HUMAN_GATE_LEVELS.has(level)) return level;
  }
  return "";
}

function firstString(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function latestDecisionGateRow(rows) {
  const ordered = [...rows].sort(byIsoAsc);
  return latestEvent(ordered.filter((row) => (
    HUMAN_GATE_EVENT_TYPES.has(row.event_type)
    || (row.payload?.decision_mode && (row.payload?.level || row.payload?.human_gate_level || row.payload?.gate_level))
  )));
}

function decisionGateState(row) {
  if (row?.event_type === "human_gate.released") return "released";
  if (row?.event_type === "human_gate.rejected") return "rejected";
  if (row?.event_type === "human_gate.required") return "required";
  if (String(row?.payload?.decision_mode || "").includes("PENDING")) return "required";
  return row?.human_gate_required ? "required" : "none";
}

function decisionGateFromRows(rows) {
  const row = latestDecisionGateRow(rows);
  if (!row) return null;
  const payload = row.payload || {};
  const release = isObject(payload.human_gate_release)
    ? payload.human_gate_release
    : isObject(payload.release)
      ? payload.release
      : {};
  const hg35 = isObject(payload.hg35) ? payload.hg35 : {};
  const level = firstString(release.level, payload.level, payload.human_gate_level, payload.gate_level);
  if (!HUMAN_GATE_LEVELS.has(level)) return null;

  const state = decisionGateState(row);
  const releaseAuthority = firstString(release.release_authority, payload.release_authority, payload.releaseAuthority);
  const decisionMode = firstString(payload.decision_mode, release.decision_mode);
  const decision = firstString(payload.decision, release.decision, payload.requested_decision, decisionMode);
  const artifactPaths = unique([
    ...asArray(row.artifact_paths),
    ...asArray(payload.artifact_paths),
    ...asArray(release.artifact_paths),
    hg35.pause_artifact,
  ].map((item) => String(item || "")));
  const eveRuntime = firstString(payload.eve_runtime, payload.hg35_runtime, hg35.runtime);
  const routesToHg35 = HG35_ROUTE_PATTERN.test([
    level,
    state,
    releaseAuthority,
    decisionMode,
    decision,
    payload.next_action,
    payload.next_state_hint,
    payload.reason,
  ].join(" "));

  return {
    level,
    state,
    source_event_id: row.event_id || "",
    source_event_type: row.event_type || "",
    release_authority: releaseAuthority,
    released_by: firstString(release.released_by, payload.released_by, payload.gate_owner),
    founder_prediction_confidence: numberOrNull(release.founder_prediction_confidence ?? payload.founder_prediction_confidence),
    decision_mode: decisionMode,
    decision,
    next_action: firstString(payload.next_action, payload.next_state_hint, release.next_action, asArray(row.payload?.conditions).join("; ")),
    reason: firstString(payload.reason, release.reason),
    release_validation: isObject(payload.release_validation) ? payload.release_validation : null,
    requested_actions: unique([...asArray(release.requested_actions), ...asArray(payload.requested_actions)].map(String)),
    blocked_actions: unique([
      ...asArray(release.blocked_actions_still_forbidden),
      ...asArray(payload.blocked_actions_still_forbidden),
      ...asArray(payload.blocked_actions),
    ].map(String)),
    assumptions: unique([...asArray(payload.assumptions), ...asArray(hg35.assumptions)].map(String)),
    challenge_questions: unique([
      ...asArray(payload.challenge_questions),
      ...asArray(payload.challenges),
      ...asArray(hg35.challenge_questions),
      ...asArray(hg35.challenges),
    ].map(String)),
    consequences: {
      if_go: firstString(payload.consequence_if_go, payload.if_go, hg35.consequence_if_go),
      if_no_go: firstString(payload.consequence_if_no_go, payload.if_no_go, hg35.consequence_if_no_go),
      if_wrong: firstString(payload.consequence_if_wrong, payload.if_wrong, hg35.consequence_if_wrong),
    },
    hg35_pause_artifact: firstString(hg35.pause_artifact, payload.hg35_pause_artifact),
    eve_runtime: eveRuntime || "simulated",
    routes_to_hg35: routesToHg35,
    simulated: Boolean(payload.simulated ?? hg35.simulated ?? (routesToHg35 && eveRuntime !== "live")),
    artifact_paths: artifactPaths,
  };
}

function buildRunCard(runId, rows) {
  const ordered = [...rows].sort(byIsoAsc);
  const last = latestEvent(ordered);
  const reduced = reduceAgentEvents(ordered);
  const artifacts = unique(ordered.flatMap((row) => asArray(row.artifact_paths)));
  const traceCards = dedupeTraceCards(ordered.map(traceCardFromEvent).filter(Boolean));
  const decisionGate = decisionGateFromRows(ordered);
  return {
    run_id: runId,
    issue_id: reduced.issue_id || last?.issue_id || "",
    parent_issue_id: reduced.parent_issue_id || last?.parent_issue_id || "",
    agent: last?.agent || "",
    mode: last?.mode || "",
    role_owner: last?.role_owner || "",
    department: last?.department || "",
    worker_state: reduced.worker_state,
    controller_state: reduced.controller_state,
    issue_state_recommendation: reduced.issue_state_recommendation,
    human_gate_state: reduced.human_gate_state,
    human_gate_level: humanGateLevelFromRows(ordered),
    decision_gate: decisionGate,
    merge_state: reduced.merge_state,
    next_action: reduced.next_action,
    blocking_reasons: reduced.blocking_reasons,
    event_count: ordered.length,
    first_event_at: ordered[0]?.occurred_at || null,
    last_event_at: last?.occurred_at || null,
    last_event_id: reduced.last_event_id,
    source_event_ids: ordered.map((row) => row.event_id).filter(Boolean),
    artifact_paths: artifacts,
    trace_cards: traceCards,
  };
}

function isCeoCriticalRelease(run) {
  const gate = run.decision_gate;
  if (!gate || gate.level !== "HG-3" || gate.state !== "released") return false;
  return gate.release_authority === "CEO_CRITICAL" || CEO_CRITICAL_RELEASE_OWNERS.has(gate.released_by);
}

function isEveHg35Packet(run) {
  const gate = run.decision_gate;
  if (!gate) return false;
  if (gate.level === "HG-3.5") return true;
  return gate.level === "HG-3" && gate.state !== "released" && gate.routes_to_hg35;
}

function buildCeoCriticalReleaseCards(runs) {
  return runs
    .filter(isCeoCriticalRelease)
    .map((run) => ({
      issue_id: run.issue_id,
      run_id: run.run_id,
      human_gate_level: "HG-3",
      status: "released",
      release_authority: run.decision_gate.release_authority || "CEO_CRITICAL",
      released_by: run.decision_gate.released_by,
      founder_prediction_confidence: run.decision_gate.founder_prediction_confidence,
      release_validation: run.decision_gate.release_validation,
      next_action: run.decision_gate.next_action || run.next_action,
      source_event_id: run.decision_gate.source_event_id,
      artifact_paths: unique([...run.decision_gate.artifact_paths, ...run.artifact_paths]),
    }));
}

function buildEveHg35Packets(runs) {
  return runs
    .filter(isEveHg35Packet)
    .map((run) => {
      const gate = run.decision_gate;
      return {
        issue_id: run.issue_id,
        run_id: run.run_id,
        originating_gate: gate.level,
        target_gate: "HG-3.5",
        status: gate.state === "released" ? "signed" : "awaiting-chief-of-staff-review",
        simulated: gate.eve_runtime !== "live" || gate.simulated,
        decision_mode: gate.decision_mode || (gate.level === "HG-3" ? "CEO_CRITICAL_HOLD" : "HG-3.5-PENDING-ARTIFACT-REVIEW"),
        decision: gate.decision,
        reason: gate.reason,
        next_action: gate.next_action || run.next_action,
        challenge_questions: gate.challenge_questions,
        assumptions: gate.assumptions,
        consequences: gate.consequences,
        blocked_actions: gate.blocked_actions,
        source_event_id: gate.source_event_id,
        source_event_type: gate.source_event_type,
        artifact_paths: unique([...gate.artifact_paths, ...run.artifact_paths]),
      };
    });
}

function buildMorningBrief(runs) {
  const totals = {
    runs: runs.length,
    active: 0,
    blocked: 0,
    needs_gate_review: 0,
    needs_human: 0,
    hg3_ceo_releases: 0,
    hg35_packets: 0,
    trace_cards: 0,
  };
  for (const run of runs) {
    const blocked = run.blocking_reasons.length
      || ["blocked", "timed_out", "cancelled"].includes(run.worker_state)
      || BLOCKED_ISSUE_STATES.has(run.issue_state_recommendation)
      || run.controller_state === "blocked";
    const gateOnlyIdle = run.worker_state === "idle" && run.human_gate_state !== "none";
    if (!blocked && !gateOnlyIdle && !TERMINAL_WORKER_STATES.has(run.worker_state)) totals.active += 1;
    if (blocked) totals.blocked += 1;
    if (run.human_gate_state === "required" || run.issue_state_recommendation === "needs_human") {
      totals.needs_gate_review += 1;
      if (run.human_gate_level === "HG-4") totals.needs_human += 1;
    }
    if (isCeoCriticalRelease(run)) totals.hg3_ceo_releases += 1;
    if (isEveHg35Packet(run)) totals.hg35_packets += 1;
    totals.trace_cards += run.trace_cards.length;
  }
  const headline = [
    `${totals.runs} run(s) visible`,
    `${totals.blocked} blocked`,
    `${totals.needs_gate_review} need decision-gate review`,
    `${totals.needs_human} need HG-4 human review`,
    `${totals.hg3_ceo_releases} HG-3 CEO release(s)`,
    `${totals.hg35_packets} HG-3.5 packet(s)`,
    `${totals.trace_cards} trace card(s)`,
  ].join("; ");
  return { headline, totals };
}

function buildHumanGateQueue(runs) {
  return runs
    .filter((run) => run.human_gate_state === "required" || run.issue_state_recommendation === "needs_human")
    .map((run) => ({
      issue_id: run.issue_id,
      run_id: run.run_id,
      human_gate_level: run.human_gate_level,
      role_owner: run.role_owner,
      next_action: run.next_action,
      blocking_reasons: run.blocking_reasons,
      source_event_id: run.last_event_id,
      artifact_paths: run.artifact_paths,
    }));
}

export function buildCommandCenterReadModel({
  rows = [],
  generatedAt = new Date().toISOString(),
  maxRuns = 20,
  eventLedger = "metrics/agent-events.jsonl",
} = {}) {
  const groups = groupByRun(rows);
  const runs = [...groups.entries()]
    .map(([runId, groupRows]) => buildRunCard(runId, groupRows))
    .sort((a, b) => Date.parse(b.last_event_at || "") - Date.parse(a.last_event_at || ""))
    .slice(0, maxRuns);
  const traceCards = runs.flatMap((run) => run.trace_cards);
  const ceoCriticalReleases = buildCeoCriticalReleaseCards(runs);
  const eveHg35Packets = buildEveHg35Packets(runs);
  return {
    schema_version: COMMAND_CENTER_READ_MODEL_VERSION,
    generated_at: generatedAt,
    read_only: true,
    source_policy: "artifact-linked-no-state-mutation",
    sources: {
      event_ledger: eventLedger,
      reducer: "scripts/command-center/command-center-read-model-core.mjs",
    },
    morning_brief: buildMorningBrief(runs),
    worker_runs: runs,
    human_gate_queue: buildHumanGateQueue(runs),
    ceo_critical_releases: ceoCriticalReleases,
    eve_hg35_packets: eveHg35Packets,
    trace_summary_cards: traceCards,
    event_type_counts: eventTypeCounts(rows),
    blocked_actions: [
      "no Plane writes",
      "no Plane Done transitions",
      "no worker dispatch",
      "no deploy/publish/send/schedule/spend",
      "no production writes",
    ],
  };
}

function tableCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

export function renderCommandCenterReadModelMarkdown(model) {
  const runs = asArray(model.worker_runs);
  const gateItems = asArray(model.human_gate_queue);
  const ceoReleases = asArray(model.ceo_critical_releases);
  const hg35Packets = asArray(model.eve_hg35_packets);
  const traceCards = asArray(model.trace_summary_cards);
  const lines = [
    "# Command Center Read Model",
    "",
    `Generated: ${model.generated_at}`,
    `Schema: ${model.schema_version}`,
    `Read-only: ${model.read_only ? "true" : "false"}`,
    "",
    "## Morning Brief",
    "",
    model.morning_brief?.headline || "No visible runs.",
    "",
    "## Worker Runs",
    "",
    "| Issue | Run | Worker | Controller | Decision Gate | Next Action | Source Event |",
    "|---|---|---|---|---|---|---|",
    ...runs.map((run) => `| ${tableCell(run.issue_id)} | ${tableCell(run.run_id)} | ${tableCell(run.worker_state)} | ${tableCell(run.controller_state)} | ${tableCell([run.human_gate_state, run.human_gate_level].filter(Boolean).join(" "))} | ${tableCell(run.next_action)} | ${tableCell(run.last_event_id)} |`),
    "",
    "## Decision Gate Queue",
    "",
  ];
  if (gateItems.length) {
    lines.push("| Issue | Run | Gate | Next Action | Source Event |", "|---|---|---|---|---|");
    for (const item of gateItems) {
      lines.push(`| ${tableCell(item.issue_id)} | ${tableCell(item.run_id)} | ${tableCell(item.human_gate_level || "unknown")} | ${tableCell(item.next_action)} | ${tableCell(item.source_event_id)} |`);
    }
  } else {
    lines.push("No decision-gate items in the visible event slice.");
  }
  lines.push("", "## CEO Critical Releases", "");
  if (ceoReleases.length) {
    lines.push("| Issue | Run | Authority | Released By | Confidence | Source Event |", "|---|---|---|---|---|---|");
    for (const item of ceoReleases) {
      lines.push(`| ${tableCell(item.issue_id)} | ${tableCell(item.run_id)} | ${tableCell(item.release_authority)} | ${tableCell(item.released_by)} | ${tableCell(item.founder_prediction_confidence ?? "n/a")} | ${tableCell(item.source_event_id)} |`);
    }
  } else {
    lines.push("No HG-3 CEO/Codex critical releases in the visible event slice.");
  }
  lines.push("", "## EVE / HG-3.5 Packets", "");
  if (hg35Packets.length) {
    lines.push("| Issue | Run | Origin | Status | Simulated | Source Event |", "|---|---|---|---|---|---|");
    for (const item of hg35Packets) {
      lines.push(`| ${tableCell(item.issue_id)} | ${tableCell(item.run_id)} | ${tableCell(item.originating_gate)} | ${tableCell(item.status)} | ${tableCell(item.simulated ? "true" : "false")} | ${tableCell(item.source_event_id)} |`);
    }
  } else {
    lines.push("No EVE / HG-3.5 packets in the visible event slice.");
  }
  lines.push("", "## Trace Summary Cards", "");
  if (traceCards.length) {
    lines.push("| Issue | Run | Agent | Trace Markdown | Prompt Result | Source Event |", "|---|---|---|---|---|---|");
    for (const card of traceCards) {
      lines.push(`| ${tableCell(card.issue_id)} | ${tableCell(card.run_id)} | ${tableCell(card.agent)} | ${tableCell(card.trace_markdown || "none")} | ${tableCell(card.prompt_result || "none")} | ${tableCell(card.source_event_id)} |`);
    }
  } else {
    lines.push("No Raindrop trace summaries in the visible event slice.");
  }
  lines.push(
    "",
    "## Blocked Actions",
    "",
    ...asArray(model.blocked_actions).map((item) => `- ${item}`),
    "",
  );
  return lines.join("\n");
}

export function writeCommandCenterReadModel({ model, outputDir, fileStem = "command-center-read-model" }) {
  if (!outputDir || !path.isAbsolute(outputDir)) {
    throw new Error("outputDir must be an absolute path");
  }
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(fileStem)) {
    throw new Error("fileStem must be a simple filename stem");
  }
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, `${fileStem}.json`);
  const markdownPath = path.join(outputDir, `${fileStem}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(model, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderCommandCenterReadModelMarkdown(model));
  return { jsonPath, markdownPath };
}
