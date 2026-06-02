import fs from "node:fs";
import path from "node:path";

import { validateAgentEventRow } from "../agent-events/agent-event-core.mjs";

const SIGNAL_PATTERNS = [
  /BLOCKED|blocked|failed|failure|Not logged in|runtime|auth|sentinel/i,
  /HumanGate|needs-human|needs_human|review required|requires_review/i,
  /DreamPolicy|MemoryUpdatePolicy|memory|Honcho|activeContext|PageIndex/i,
  /Linear|MAT-\d+|RunAt|DependsOn|issue/i,
  /sandbox|branch|worktree|merge/i,
  /morning|brief|automation|schedule|cron|LaunchAgent/i,
  /required rework|required_rework|next action|naechster|next_action/i,
];

const CATEGORY_RULES = [
  {
    category: "runtime-auth",
    title: "Runtime/Auth gates need stronger preflight",
    pattern: /runtime|auth|sentinel|Not logged in|CLAUDE_AUTH_OK|connector/i,
    target: "runtime-auth-preflight",
    action: "Keep auth sentinels mandatory before scheduled worker dispatch and surface failures in the morning brief.",
  },
  {
    category: "memory-dream",
    title: "Memory-affecting work needs explicit DreamPolicy",
    pattern: /DreamPolicy|MemoryUpdatePolicy|memory|Honcho|activeContext|PageIndex/i,
    target: "worker-contract",
    action: "Require proposal-only DreamPolicy for work that can change memory, SOPs, skills, harnesses or knowledge.",
  },
  {
    category: "human-gate",
    title: "HumanGate state must stay decision-ready",
    pattern: /HumanGate|needs-human|needs_human|review required|requires_review/i,
    target: "human-gate-brief",
    action: "Convert gate blockers into explicit accept/reject/split decisions for the morning review.",
  },
  {
    category: "linear-execution",
    title: "Linear contracts need parseable next actions",
    pattern: /Linear|MAT-\d+|RunAt|DependsOn|issue/i,
    target: "linear-worker-contract",
    action: "Backfill missing owner, dependency, RunAt, source-of-truth and reporting fields only when they unblock execution.",
  },
  {
    category: "sandbox-branch",
    title: "Edit-capable work must stay sandboxed",
    pattern: /sandbox|branch|worktree|merge/i,
    target: "sandbox-lane",
    action: "Keep branch names deterministic and route patches through controller audit before any integration gate.",
  },
  {
    category: "automation-morning",
    title: "Morning brief should include process-improvement output",
    pattern: /morning|brief|automation|schedule|cron|LaunchAgent/i,
    target: "morning-ceo-brief",
    action: "Add the Daily Improvement Dream section to the morning meeting packet when the night or early run completed.",
  },
  {
    category: "work-quality",
    title: "Recurring rework should become SOP, skill or harness changes",
    pattern: /required rework|required_rework|next action|next_action|needs_rework/i,
    target: "sop-skill-harness",
    action: "Promote repeated required rework into one proposed SOP, skill, harness or checklist patch.",
  },
];

function walkFiles(root) {
  if (!fs.existsSync(root)) return [];
  const output = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(fullPath));
    else if (entry.isFile()) output.push(fullPath);
  }
  return output;
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function parseJsonl(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function relativeArtifactPath(workspaceRoot, filePath) {
  return path.relative(workspaceRoot, filePath).split(path.sep).join("/");
}

function extractTitle(text, fallback) {
  const heading = String(text).match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : fallback;
}

function extractSignals(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 8)
    .filter((line) => SIGNAL_PATTERNS.some((pattern) => pattern.test(line)))
    .slice(0, 25);
}

function artifactFromMarkdown(workspaceRoot, filePath) {
  const text = safeRead(filePath);
  return {
    path: filePath,
    relative_path: relativeArtifactPath(workspaceRoot, filePath),
    title: extractTitle(text, path.basename(filePath)),
    headings: [...text.matchAll(/^#{1,3}\s+(.+)$/gm)].map((match) => match[1].trim()).slice(0, 20),
    signals: extractSignals(text),
    linear_issues: unique(text.match(/\b[A-Z]+-\d+\b/g) || []),
  };
}

function runBelongsToDate(row, date) {
  return String(row.timestamp || "").startsWith(date) || String(row.output_artifact || "").includes(date);
}

export function collectDreamInputs({ workspaceRoot, date }) {
  const reports = [
    path.join(workspaceRoot, "reports", "night-shift", date),
    path.join(workspaceRoot, "reports", "runtime-auth", date),
  ];
  const agentRunReportRoot = path.join(workspaceRoot, "reports", "agent-runs");
  const markdownPaths = unique([
    ...reports.flatMap((dir) => walkFiles(dir).filter((filePath) => filePath.endsWith(".md"))),
    ...walkFiles(agentRunReportRoot).filter((filePath) => filePath.endsWith(".md") && filePath.includes(date)),
  ]).sort();

  const metricsPath = path.join(workspaceRoot, "metrics", "agent-runs.jsonl");
  const agentRuns = fs.existsSync(metricsPath)
    ? parseJsonl(safeRead(metricsPath)).filter((row) => runBelongsToDate(row, date))
    : [];

  const eventLedgerPath = path.join(workspaceRoot, "metrics", "agent-events.jsonl");
  const existingEvents = fs.existsSync(eventLedgerPath) ? parseJsonl(safeRead(eventLedgerPath)) : [];

  return {
    date,
    workspace_root: workspaceRoot,
    input_store: "reports + metrics ledgers read-only",
    artifacts: markdownPaths.map((filePath) => artifactFromMarkdown(workspaceRoot, filePath)),
    agentRuns,
    existingEvents,
    metrics_path: metricsPath,
    event_ledger_path: eventLedgerPath,
  };
}

function countSignalsForRule(inputs, rule) {
  const artifactMatches = [];
  for (const artifact of inputs.artifacts) {
    const matches = artifact.signals.filter((line) => rule.pattern.test(line));
    if (matches.length) {
      artifactMatches.push({
        artifact: artifact.relative_path,
        title: artifact.title,
        signals: matches.slice(0, 5),
      });
    }
  }

  const runMatches = inputs.agentRuns
    .filter((run) => rule.pattern.test(JSON.stringify(run)))
    .map((run) => ({
      artifact: run.output_artifact || "metrics/agent-runs.jsonl",
      title: run.agent_run_id || run.verdict || "agent run",
      signals: [run.required_rework || run.worker_blocker || run.verdict || run.status].filter(Boolean),
    }));

  return [...artifactMatches, ...runMatches];
}

function proposalForFinding(finding) {
  return {
    target: finding.target,
    proposal_type: finding.category === "memory-dream" ? "contract-patch" : "process-patch",
    action: finding.action,
    source_categories: [finding.category],
    review_required: true,
    durable_write_performed: false,
  };
}

function sortFindings(findings) {
  return findings.sort((a, b) => b.evidence_count - a.evidence_count || a.category.localeCompare(b.category));
}

export function buildDailyImprovementDream({ workspaceRoot, date, inputs, issueId = "COMPANY-OS-DREAM" }) {
  const findings = sortFindings(
    CATEGORY_RULES.map((rule) => {
      const evidence = countSignalsForRule(inputs, rule);
      return {
        category: rule.category,
        title: rule.title,
        target: rule.target,
        action: rule.action,
        evidence_count: evidence.reduce((sum, item) => sum + item.signals.length, 0),
        evidence: evidence.slice(0, 6),
      };
    }).filter((finding) => finding.evidence_count > 0),
  );

  const proposals = findings.map(proposalForFinding);
  const reportPath = path.join(workspaceRoot, "reports", "dreams", date, "daily-improvement-dream.md");
  const jsonPath = path.join(workspaceRoot, "reports", "dreams", date, "daily-improvement-dream.json");
  const morningBriefPath = path.join(workspaceRoot, "reports", "night-shift", date, "morning-ceo-brief.md");

  return {
    dream_id: `daily-improvement-dream-${date}`,
    date,
    issue_id: issueId,
    workspace: "registry:company-os",
    workspace_path: workspaceRoot,
    dream_policy: "proposal-only",
    memory_update_policy: "proposal-only",
    input_store: inputs.input_store,
    output_store: path.dirname(reportPath),
    input_artifacts: inputs.artifacts.map((artifact) => artifact.relative_path),
    agent_run_count: inputs.agentRuns.length,
    finding_count: findings.length,
    proposal_count: proposals.length,
    durable_write_performed: false,
    review_required: true,
    report_path: reportPath,
    json_path: jsonPath,
    morning_brief_path: morningBriefPath,
    findings,
    proposals,
    morning_meeting: {
      title: "Daily Improvement Dream",
      top_items: findings.slice(0, 5).map((finding) => ({
        category: finding.category,
        decision: finding.action,
        evidence_count: finding.evidence_count,
      })),
      controller_question:
        findings.length > 0
          ? "Welche Vorschlaege gehen in Memory/SOP/Skill/Linear, und was bleibt nur Report?"
          : "Keine wiederkehrenden Verbesserungsmuster gefunden; Dream nur archivieren.",
    },
  };
}

function tableRow(values) {
  return `| ${values.map((value) => String(value).replace(/\n/g, " ")).join(" | ")} |`;
}

function renderEvidence(finding) {
  const lines = [];
  for (const item of finding.evidence) {
    lines.push(`- ${item.artifact} - ${item.title}`);
    for (const signal of item.signals.slice(0, 3)) {
      lines.push(`  - ${signal}`);
    }
  }
  return lines.join("\n");
}

export function renderDailyImprovementDreamMarkdown(dream) {
  const lines = [
    `# Daily Improvement Dream - ${dream.date}`,
    "",
    "Status: proposal-only",
    `Issue: ${dream.issue_id}`,
    `InputStore: ${dream.input_store}`,
    `OutputStore: ${dream.output_store}`,
    `DreamPolicy: ${dream.dream_policy}`,
    `MemoryUpdatePolicy: ${dream.memory_update_policy}`,
    `review_required: ${dream.review_required}`,
    `durable_write_performed: ${dream.durable_write_performed}`,
    "",
    "## Controller Verdict",
    "",
    dream.finding_count
      ? "Review the proposed improvements before promoting anything into durable memory, SOPs, skills, harnesses or Linear."
      : "No recurring improvement pattern was detected. Keep the artifact for traceability.",
    "",
    "## Morning Meeting Insert",
    "",
    ...dream.morning_meeting.top_items.map(
      (item, index) => `${index + 1}. ${item.category}: ${item.decision} (${item.evidence_count} signals)`,
    ),
    "",
    `Controller question: ${dream.morning_meeting.controller_question}`,
    "",
    "## Improvement Proposals",
    "",
    tableRow(["Target", "Type", "Action", "Review", "Durable Write"]),
    tableRow(["---", "---", "---", "---", "---"]),
    ...dream.proposals.map((proposal) =>
      tableRow([
        proposal.target,
        proposal.proposal_type,
        proposal.action,
        proposal.review_required,
        proposal.durable_write_performed,
      ]),
    ),
    "",
    "## Findings",
    "",
  ];

  for (const finding of dream.findings) {
    lines.push(`### ${finding.category} - ${finding.title}`);
    lines.push("");
    lines.push(`Recommended action: ${finding.action}`);
    lines.push("");
    lines.push(renderEvidence(finding));
    lines.push("");
  }

  lines.push("## Input Artifacts");
  lines.push("");
  for (const artifact of dream.input_artifacts) {
    lines.push(`- ${artifact}`);
  }
  lines.push("");
  lines.push("## Non-Negotiables");
  lines.push("");
  lines.push("- This dream does not write durable memory.");
  lines.push("- This dream does not update Linear.");
  lines.push("- This dream does not change SOPs, skills, harnesses or source files.");
  lines.push("- Controller or CEO review decides which proposals become durable updates.");
  lines.push("");

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderMorningBriefSection(dream) {
  const lines = [
    "<!-- daily-improvement-dream:start -->",
    "## Daily Improvement Dream",
    "",
    `Report: ${dream.report_path}`,
    `Policy: ${dream.dream_policy}; durable writes: ${dream.durable_write_performed}; review required: ${dream.review_required}`,
    "",
  ];

  if (dream.morning_meeting.top_items.length) {
    lines.push("Top process improvements for morning review:");
    dream.morning_meeting.top_items.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.category}: ${item.decision}`);
    });
  } else {
    lines.push("No recurring improvement pattern detected.");
  }

  lines.push("");
  lines.push(`Controller question: ${dream.morning_meeting.controller_question}`);
  lines.push("<!-- daily-improvement-dream:end -->");
  lines.push("");
  return lines.join("\n");
}

export function upsertMorningBriefDreamSection(markdown, dream) {
  const section = renderMorningBriefSection(dream);
  const pattern = /<!-- daily-improvement-dream:start -->[\s\S]*?<!-- daily-improvement-dream:end -->\n?/;
  if (pattern.test(markdown)) return markdown.replace(pattern, section);
  return `${String(markdown).trimEnd()}\n\n${section}`;
}

function eventDateSlug(date) {
  return date.replace(/-/g, "");
}

export function createDreamEvents({ dream, workspaceRoot, now = new Date() }) {
  const occurredAt = now.toISOString();
  const dateSlug = eventDateSlug(dream.date);
  const requestedId = `evt_${dateSlug}_daily_improvement_dream_requested`;
  const proposalId = `evt_${dateSlug}_daily_improvement_memory_proposal_created`;

  const base = {
    schema_version: "agent-event/v1",
    occurred_at: occurredAt,
    producer: "controller",
    workspace: dream.workspace,
    workspace_path: workspaceRoot,
    issue_id: dream.issue_id,
    parent_issue_id: "",
    run_id: dream.dream_id,
    session_id: `dream_${dateSlug}_daily_improvement`,
    agent: "codex",
    mode: "dream",
    role_owner: "CEO",
    department: "Ops",
    autonomy_level: "L1",
    event_policy: "issue-state-from-agent-events",
    linear_comment_ids: [],
    redaction_level: "internal",
  };

  const events = [
    {
      ...base,
      event_id: requestedId,
      event_type: "memory.dream_requested",
      payload: {
        store: "memory-bank | honcho | wiki | adr | skill-library",
        scope: "daily company-os improvement dream",
        input_artifacts: dream.input_artifacts,
        review_required: true,
        output_store: dream.output_store,
      },
      artifact_paths: [dream.report_path, dream.json_path],
      human_gate_required: false,
      previous_event_id: null,
    },
    {
      ...base,
      event_id: proposalId,
      event_type: "memory.proposal_created",
      payload: {
        store: "memory-bank | honcho | wiki | adr | skill-library",
        summary: `Daily Improvement Dream created ${dream.proposal_count} proposal(s) for controller review.`,
        proposal_path: dream.report_path,
        requires_review: true,
        durable_write_performed: false,
      },
      artifact_paths: [dream.report_path, dream.json_path],
      human_gate_required: true,
      previous_event_id: requestedId,
    },
  ];

  for (const event of events) {
    const validation = validateAgentEventRow(event);
    if (!validation.valid) throw new Error(validation.errors.join("\n"));
  }

  return events;
}

function appendEventsIfMissing(eventLedgerPath, events) {
  fs.mkdirSync(path.dirname(eventLedgerPath), { recursive: true });
  const existing = fs.existsSync(eventLedgerPath) ? parseJsonl(safeRead(eventLedgerPath)) : [];
  const seen = new Set(existing.map((event) => event.event_id));
  const missing = events.filter((event) => !seen.has(event.event_id));
  if (!missing.length) return { appended: 0, eventLedgerPath };
  fs.appendFileSync(eventLedgerPath, `${missing.map((event) => JSON.stringify(event)).join("\n")}\n`);
  return { appended: missing.length, eventLedgerPath };
}

export function writeDailyImprovementDream({
  workspaceRoot,
  date,
  issueId = "COMPANY-OS-DREAM",
  updateMorningBrief = false,
  appendEvents = false,
  eventLedgerPath,
  now = new Date(),
}) {
  const inputs = collectDreamInputs({ workspaceRoot, date });
  const dream = buildDailyImprovementDream({ workspaceRoot, date, inputs, issueId });
  const markdown = renderDailyImprovementDreamMarkdown(dream);

  fs.mkdirSync(path.dirname(dream.report_path), { recursive: true });
  fs.writeFileSync(dream.report_path, markdown);
  fs.writeFileSync(dream.json_path, `${JSON.stringify(dream, null, 2)}\n`);

  let morningBriefPath = "";
  if (updateMorningBrief) {
    morningBriefPath = dream.morning_brief_path;
    const existing = fs.existsSync(morningBriefPath)
      ? fs.readFileSync(morningBriefPath, "utf8")
      : `# Morning CEO Brief - ${date}\n`;
    fs.mkdirSync(path.dirname(morningBriefPath), { recursive: true });
    fs.writeFileSync(morningBriefPath, upsertMorningBriefDreamSection(existing, dream));
  }

  const resolvedEventLedgerPath = eventLedgerPath || path.join(workspaceRoot, "metrics", "agent-events.jsonl");
  let eventAppend = { appended: 0, eventLedgerPath: resolvedEventLedgerPath };
  if (appendEvents) {
    eventAppend = appendEventsIfMissing(
      resolvedEventLedgerPath,
      createDreamEvents({ dream, workspaceRoot, now }),
    );
  }

  return {
    dream,
    reportPath: dream.report_path,
    jsonPath: dream.json_path,
    morningBriefPath,
    eventLedgerPath: eventAppend.eventLedgerPath,
    appendedEvents: eventAppend.appended,
  };
}
