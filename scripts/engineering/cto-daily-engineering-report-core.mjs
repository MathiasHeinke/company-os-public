import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const CTO_DAILY_ENGINEERING_REPORT_VERSION = "cto-engineering-brief/v0";

const DEFAULT_COMPANY_ROOT = "${LOCAL_WORKSPACE}";
const DEFAULT_WORKSPACE_ROOTS = [
  "${LOCAL_WORKSPACE}",
  "${LOCAL_WORKSPACE}",
  "${LOCAL_WORKSPACE}",
  "${LOCAL_WORKSPACE}",
];

export function localDate(now = new Date()) {
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function exists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function walkFiles(root, { maxFiles = 1200 } = {}) {
  const out = [];
  function walk(dir) {
    if (out.length >= maxFiles || !exists(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(full);
      if (out.length >= maxFiles) return;
    }
  }
  walk(root);
  return out.sort();
}

function execGit(workspace, args) {
  try {
    return {
      ok: true,
      output: childProcess.execFileSync("git", ["-C", workspace, ...args], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim(),
    };
  } catch (error) {
    return {
      ok: false,
      output: String(error.stderr || error.message || "").trim(),
    };
  }
}

function uniqueExistingRoots(roots = []) {
  return [...new Set(roots.map((root) => path.resolve(root)).filter(Boolean))];
}

function classifyWorkspaceStatus(shortStatus) {
  if (!shortStatus) return "unknown";
  const lines = shortStatus.split(/\r?\n/).filter(Boolean);
  const dirty = lines.some((line) => !line.startsWith("## "));
  return dirty ? "dirty" : "clean";
}

function summarizeWorkspace(root) {
  const workspace = path.resolve(root);
  if (!exists(workspace)) {
    return {
      workspace,
      exists: false,
      branch: "missing",
      head: "UNKNOWN",
      dirty_state: "missing",
      status_lines: [],
      blocker: `${workspace} missing or inaccessible.`,
    };
  }
  const status = execGit(workspace, ["status", "--short", "--branch"]);
  const head = execGit(workspace, ["rev-parse", "--short", "HEAD"]);
  const branchLine = status.output.split(/\r?\n/).find((line) => line.startsWith("## ")) || "## UNKNOWN";
  const dirtyState = status.ok ? classifyWorkspaceStatus(status.output) : "unknown";
  return {
    workspace,
    exists: true,
    branch: branchLine.replace(/^##\s*/, ""),
    head: head.ok ? head.output : "UNKNOWN",
    dirty_state: dirtyState,
    status_lines: status.output ? status.output.split(/\r?\n/) : [],
    blocker: status.ok ? "" : `git status failed for ${workspace}: ${status.output || "UNKNOWN"}`,
  };
}

function firstHeading(content) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() || "";
}

function extractWorkItem(filePath, content) {
  const fromPath = filePath.match(/\b([A-Z]+-\d+)\b/)?.[1];
  if (fromPath) return fromPath;
  return content.match(/\bwork_item\s*\|\s*([A-Z]+-\d+)\b/i)?.[1]
    || content.match(/\bwork_item:\s*([A-Z]+-\d+)\b/i)?.[1]
    || "";
}

function extractStatus(content) {
  return content.match(/\|\s*outcome_state\s*\|\s*([^|]+)\|/i)?.[1]?.trim()
    || content.match(/^`?([A-Z_]+(?:_[A-Z_]+)?)`?$/m)?.[1]?.trim()
    || content.match(/^Status:\s*(.+)$/im)?.[1]?.trim()
    || content.match(/\b(PASS|HOLD|BLOCKED|FAIL|DONE|READY|MERGED|DEPLOYED)(?:\b|_)/i)?.[0]?.toUpperCase()
    || "present";
}

function statusClass(status, content = "") {
  const statusText = String(status || "").toLowerCase().replace(/[_-]+/g, " ");
  if (/\b(fail|failed|blocked|blocker|hold|reject|timeout|runtime_error|needs_human)\b/.test(statusText)) {
    return "blocked";
  }
  if (/\b(pass|done|ready|merged|deployed|closed|released)\b/.test(statusText)) {
    return "pass";
  }
  const text = String(content || "").toLowerCase();
  if (/\b(fail|failed|blocked|blocker|hold|reject|timeout|runtime_error|needs_human)\b/.test(text)) return "blocked";
  if (/\b(pass|done|ready|merged|deployed|closed|released)\b/.test(text)) return "pass";
  return "present";
}

function isFalsePositiveBlockerLine(line) {
  const lower = String(line || "").toLowerCase();
  return /\b(no|not|must not|is not|was not|without)\b.{0,80}\b(blocker|blocked|fail|failed|missing)\b/.test(lower)
    || /\b(blocker|blocked|fail|failed|missing)\b.{0,80}\b(closed|resolved|superseded|not required)\b/.test(lower)
    || /\b0\s+blocker/.test(lower)
    || /\b0\/\d+\s+failed\b/.test(lower)
    || /blocker_count["']?\s*[:=]\s*0/.test(lower);
}

function collectSignalLines(content, pattern, limit = 6) {
  const out = [];
  for (const line of content.split(/\r?\n/)) {
    const clean = line.replace(/^\s*[-*]\s*/, "").trim();
    if (!clean) continue;
    if (/\b(blocked|blocker|failed|fail|hold|reject|needs human|missing|not live|not ready)\b/i.test(clean)
      && isFalsePositiveBlockerLine(clean)) {
      continue;
    }
    if (pattern.test(clean)) out.push(clean);
    if (out.length >= limit) break;
  }
  return out;
}

function summarizeMarkdownReport(filePath) {
  const content = safeRead(filePath);
  const status = extractStatus(content);
  return {
    path: filePath,
    work_item: extractWorkItem(filePath, content),
    title: firstHeading(content) || path.basename(filePath),
    status,
    status_class: statusClass(status),
    gates: collectSignalLines(content, /\|\s*[^|]+\s*\|\s*`?[^|]*\b(PASS|FAIL|BLOCKED|HOLD|READY|MERGED|DEPLOYED)\b/i, 8),
    blockers: collectSignalLines(content, /\b(blocked|blocker|failed|fail|hold|reject|needs human|missing|not live|not ready)\b/i, 8),
    highlights: collectSignalLines(content, /\b(pass|done|ready|merged|deployed|closed|released|verified|live smoke)\b/i, 6),
  };
}

function summarizeReleaseJson(filePath) {
  const data = safeReadJson(filePath);
  if (!data || typeof data !== "object") return null;
  const blockers = Array.isArray(data.blockers) ? data.blockers.map((item) => (
    typeof item === "string" ? item : (item.message || JSON.stringify(item))
  )) : [];
  const checks = Array.isArray(data.checks) ? data.checks : [];
  const failedChecks = checks.filter((check) => check?.status && check.status !== "pass");
  const status = data.status || (data.ok === true ? "pass" : data.ok === false ? "blocked" : "present");
  return {
    path: filePath,
    kind: "json",
    title: data.schema_version || path.basename(filePath),
    status,
    status_class: statusClass(status, JSON.stringify({ blockers, failedChecks })),
    level: data.level || "",
    blocker_count: Number(data.blocker_count ?? blockers.length ?? 0),
    check_count: Number(data.check_count ?? checks.length ?? 0),
    blockers: [...blockers, ...failedChecks.map((check) => check.message || check.id || "failed check")].slice(0, 8),
    highlights: [
      data.released_by ? `released_by=${data.released_by}` : "",
      data.founder_prediction_confidence != null ? `founder_prediction_confidence=${data.founder_prediction_confidence}` : "",
      data.event_id ? `event_id=${data.event_id}` : "",
    ].filter(Boolean),
  };
}

function summarizeReleaseFile(filePath) {
  if (filePath.endsWith(".json")) return summarizeReleaseJson(filePath);
  if (filePath.endsWith(".md")) {
    const report = summarizeMarkdownReport(filePath);
    return {
      ...report,
      kind: "markdown",
      level: "",
      blocker_count: report.blockers.length,
      check_count: report.gates.length,
    };
  }
  return null;
}

function summarizeAgentEvents(companyRoot, date) {
  const filePath = path.join(companyRoot, "metrics", "agent-events.jsonl");
  const content = safeRead(filePath);
  if (!content) {
    return {
      path: filePath,
      present: false,
      matching_count: 0,
      runtime_count: 0,
      controller_count: 0,
      release_count: 0,
      blocker_count: 0,
      latest_events: [],
    };
  }
  const records = content.split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((record) => JSON.stringify(record).includes(date));
  const matching = records.filter((record) => /\b(cto|engineering|ATLAS|controller|runtime|human_gate)\b/i.test(JSON.stringify(record)));
  const latest = matching.slice(-8);
  return {
    path: filePath,
    present: true,
    matching_count: matching.length,
    runtime_count: matching.filter((record) => /runtime/i.test(record.type || record.event || JSON.stringify(record))).length,
    controller_count: matching.filter((record) => /controller/i.test(record.type || record.event || JSON.stringify(record))).length,
    release_count: matching.filter((record) => /human_gate|release/i.test(record.type || record.event || JSON.stringify(record))).length,
    blocker_count: matching.filter((record) => /blocked|fail|hold|reject|error/i.test(JSON.stringify(record))).length,
    latest_events: latest.map((record) => ({
      type: record.type || record.event || "unknown",
      id: record.id || record.run_id || record.dispatcher_run_id || "",
      status: record.status || record.outcome || record.verdict || "",
    })),
  };
}

export function collectCtoEngineeringSignals({
  companyRoot = DEFAULT_COMPANY_ROOT,
  date = localDate(),
  workspaceRoots = DEFAULT_WORKSPACE_ROOTS,
} = {}) {
  const resolvedCompanyRoot = path.resolve(companyRoot);
  const engineeringRoot = path.join(resolvedCompanyRoot, "reports", "engineering");
  const releaseRoot = path.join(resolvedCompanyRoot, "reports", "releases", date);

  const engineeringReports = walkFiles(engineeringRoot, { maxFiles: 1800 })
    .filter((filePath) => filePath.endsWith(".md"))
    .filter((filePath) => !/\.runtime\.md$/.test(filePath))
    .filter((filePath) => !filePath.includes(`${path.sep}daily-briefs${path.sep}`))
    .map((filePath) => summarizeMarkdownReport(filePath));

  const releaseArtifacts = walkFiles(releaseRoot, { maxFiles: 400 })
    .filter((filePath) => /\.(md|json)$/.test(filePath))
    .map((filePath) => summarizeReleaseFile(filePath))
    .filter(Boolean);

  const workspaceStates = uniqueExistingRoots(workspaceRoots.length ? workspaceRoots : [resolvedCompanyRoot])
    .map((workspace) => summarizeWorkspace(workspace));

  return {
    date,
    company_root: resolvedCompanyRoot,
    engineering_root: engineeringRoot,
    release_root: releaseRoot,
    engineering_reports: engineeringReports,
    release_artifacts: releaseArtifacts,
    workspace_states: workspaceStates,
    agent_events: summarizeAgentEvents(resolvedCompanyRoot, date),
  };
}

function inferStatus(signals) {
  const hasReleasePass = signals.release_artifacts.some((artifact) => (
    /hg-release\.json$/.test(artifact.path) && artifact.status_class === "pass"
  ));
  const hasFinalCloseout = signals.release_artifacts.some((artifact) => /final-closeout/i.test(artifact.path));
  if (hasReleasePass || hasFinalCloseout) return "green_release_closed";
  const blockerText = JSON.stringify({
    engineering_reports: signals.engineering_reports,
    release_artifacts: signals.release_artifacts,
    workspace_states: signals.workspace_states.map((workspace) => workspace.blocker),
  }).toLowerCase();
  if (/\b(fail|failed|blocked|blocker|hold|reject|timeout|runtime_error|needs_human)\b/.test(blockerText)) {
    return "active_with_blockers";
  }
  if (signals.engineering_reports.length || signals.release_artifacts.length) return "active";
  return "no_signal";
}

function extractBlockers(signals) {
  const hasReleasePass = signals.release_artifacts.some((artifact) => (
    /hg-release\.json$/.test(artifact.path) && artifact.status_class === "pass"
  ));
  const hasFinalCloseout = signals.release_artifacts.some((artifact) => /final-closeout/i.test(artifact.path));
  const closedContainer = hasReleasePass || hasFinalCloseout;
  return [
    ...(closedContainer ? [] : signals.engineering_reports.flatMap((report) => report.blockers.map((line) => ({ source: report.path, line })))),
    ...(closedContainer ? [] : signals.release_artifacts
      .flatMap((artifact) => artifact.blockers.map((line) => ({ source: artifact.path, line })))),
    ...signals.workspace_states
      .filter((workspace) => workspace.blocker)
      .map((workspace) => ({ source: workspace.workspace, line: workspace.blocker })),
  ].slice(0, 16);
}

function workspaceStewardshipStatus(workspaceStates) {
  if (workspaceStates.some((workspace) => workspace.dirty_state === "missing" || workspace.dirty_state === "unknown")) {
    return "blocked";
  }
  if (workspaceStates.some((workspace) => workspace.dirty_state === "dirty")) return "parked";
  return "clean";
}

export function buildCtoDailyEngineeringReport({
  signals,
  generatedAt = new Date().toISOString(),
  planeSink = "CMD-31 Engineering Briefing - Current",
} = {}) {
  const status = inferStatus(signals);
  const blockers = extractBlockers(signals);
  const releaseArtifacts = signals.release_artifacts || [];
  const hg3Pass = releaseArtifacts.find((artifact) => /hg-release\.json$/.test(artifact.path) && artifact.status_class === "pass" && artifact.level === "HG-3");
  return {
    version: CTO_DAILY_ENGINEERING_REPORT_VERSION,
    date: signals.date,
    generated_at: generatedAt,
    department: "engineering",
    owner: "CTO",
    reporter: "role:cto",
    reports_to: "CEO",
    recipient: "CEO",
    source_projects: ["COMPA", "ATLAS"],
    release_authority: "none",
    done_authority: "none",
    plane_sink: planeSink,
    status,
    workspace_stewardship: workspaceStewardshipStatus(signals.workspace_states || []),
    release_policy: "CTO reports and recommends only; CEO/Codex owns HG-2.5/HG-3 release/Done, Chief-of-Staff routes HG-3.5, Founder owns HG-4.",
    engineering_reports: signals.engineering_reports || [],
    release_artifacts: releaseArtifacts,
    workspace_states: signals.workspace_states || [],
    agent_events: signals.agent_events,
    blockers,
    ceo_decisions_requested: blockers.length
      ? ["Review listed blockers and either route rework, park, split, or approve the next bounded worker contract."]
      : hg3Pass
        ? ["No release decision requested for the closed ATLAS Desktop MVP container; keep future ATLAS work in a fresh parent/child session."]
        : ["No CEO release decision requested by this reduced evidence slice."],
    next_dispatches: [
      "For new ATLAS build work, create one fresh CTO parent with child contracts before running goal.",
      "Require Stage 0.5 contract review and Stage 0.65 runtime executability before any worker spawn.",
      "Append this CTO brief to the singleton Engineering Briefing sink; create Plane follow-ups only for bounded contracts.",
    ],
  };
}

function yamlScalar(value) {
  return String(value ?? "").replace(/\n/g, " ").replace(/:/g, "-").trim();
}

function tableCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

export function renderCtoDailyEngineeringReportMarkdown(brief) {
  const lines = [
    "engineering.brief:",
    `  version: ${brief.version}`,
    `  date: ${brief.date}`,
    `  department: ${brief.department}`,
    `  owner: ${brief.owner}`,
    `  reporter: ${brief.reporter}`,
    `  reports_to: ${brief.reports_to}`,
    `  recipient: ${brief.recipient}`,
    "  source_projects:",
    ...brief.source_projects.map((project) => `    - ${project}`),
    `  release_authority: ${brief.release_authority}`,
    `  done_authority: ${brief.done_authority}`,
    `  status: ${brief.status}`,
    `  workspace_stewardship: ${brief.workspace_stewardship}`,
    `  plane_sink: ${yamlScalar(brief.plane_sink)}`,
    `  generated_at: ${brief.generated_at}`,
    "",
    "# CTO Daily Engineering Report",
    "",
    `Date: ${brief.date}`,
    `Status: ${brief.status}`,
    `Release policy: ${brief.release_policy}`,
    "",
    "## Executive Status",
    "",
    brief.status === "green_release_closed"
      ? "Engineering evidence is green for the closed release container. The CTO has no autonomous release or Done authority."
      : brief.status === "released_with_residual_notes"
        ? "A release packet passed, but the evidence slice still contains residual notes or blockers that need CEO review before the next parent starts."
        : brief.status === "active_with_blockers"
          ? "Engineering is active with blockers. CTO should route bounded rework or escalate to CEO/Codex."
          : "No strong engineering signal was found in the reduced evidence slice.",
    "",
    "## Engineering Reports",
    "",
    "| Work Item | Status | Class | Title | Path |",
    "|---|---|---|---|---|",
    ...brief.engineering_reports.map((report) => `| ${tableCell(report.work_item || "unknown")} | ${tableCell(report.status)} | ${tableCell(report.status_class)} | ${tableCell(report.title)} | ${tableCell(report.path)} |`),
    ...(brief.engineering_reports.length ? [] : ["| none | no_signal | none | none | none |"]),
    "",
    "## Release Artifacts",
    "",
    "| Status | Class | Level | Blockers | Checks | Path |",
    "|---|---|---|---:|---:|---|",
    ...brief.release_artifacts.map((artifact) => `| ${tableCell(artifact.status)} | ${tableCell(artifact.status_class)} | ${tableCell(artifact.level || "none")} | ${artifact.blocker_count ?? artifact.blockers?.length ?? 0} | ${artifact.check_count ?? 0} | ${tableCell(artifact.path)} |`),
    ...(brief.release_artifacts.length ? [] : ["| none | no_signal | none | 0 | 0 | none |"]),
    "",
    "## Workspace Stewardship",
    "",
    "| Dirty State | Branch | Head | Workspace |",
    "|---|---|---|---|",
    ...brief.workspace_states.map((workspace) => `| ${tableCell(workspace.dirty_state)} | ${tableCell(workspace.branch)} | ${tableCell(workspace.head)} | ${tableCell(workspace.workspace)} |`),
    ...(brief.workspace_states.length ? [] : ["| unknown | none | UNKNOWN | none |"]),
    "",
    "## Agent Events",
    "",
    brief.agent_events?.present
      ? [
          `Source: ${brief.agent_events.path}`,
          `Matching events: ${brief.agent_events.matching_count}`,
          `Runtime events: ${brief.agent_events.runtime_count}`,
          `Controller events: ${brief.agent_events.controller_count}`,
          `Release events: ${brief.agent_events.release_count}`,
          `Potential blocker events: ${brief.agent_events.blocker_count}`,
        ].join("\n")
      : `No agent event ledger found at ${brief.agent_events?.path || "UNKNOWN"}.`,
    "",
    "## Risks And Gates",
    "",
    ...(brief.blockers.length
      ? brief.blockers.map((item) => `- ${item.line} (${item.source})`)
      : ["- No blocker line found in the reduced evidence slice."]),
    "",
    "## CEO Decisions Requested",
    "",
    ...brief.ceo_decisions_requested.map((item) => `- ${item}`),
    "",
    "## Next Dispatches",
    "",
    ...brief.next_dispatches.map((item) => `- ${item}`),
    "",
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

export function defaultOutputPaths({ companyRoot = DEFAULT_COMPANY_ROOT, date = localDate() } = {}) {
  const outputDir = path.join(companyRoot, "reports", "engineering", "daily-briefs", date);
  return {
    outputDir,
    markdownPath: path.join(outputDir, "cto-daily-engineering-report.md"),
    jsonPath: path.join(outputDir, "cto-daily-engineering-report.json"),
  };
}

export function hasEngineeringBriefForDate(comments = [], date) {
  return Boolean(findEngineeringBriefForDate(comments, date));
}

export function findEngineeringBriefForDate(comments = [], date) {
  const escaped = date.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`engineering\\.brief:[\\s\\S]*date:\\s*${escaped}\\b`);
  return (comments || []).find((comment) => {
    const body = comment.comment_stripped || comment.comment_html || "";
    return matcher.test(String(body));
  }) || null;
}
