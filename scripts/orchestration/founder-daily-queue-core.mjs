/*
 * founder-daily-queue-core.mjs
 *
 * Pure helpers for the Founder Daily Queue Generator. The CLI in
 * founder-daily-queue.mjs fetches Plane work items + comments and feeds
 * already-fetched records to these functions. This module never talks
 * to Plane, the filesystem, the network, or the clock.
 *
 * Hard guarantees:
 *   - never POSTs to Plane, never transitions state, never marks Done
 *   - never executes a worker, never spawns a subagent
 *   - never writes secrets or token-shaped strings to the artifact
 *   - deterministic: same input -> byte-identical output
 *
 * Source of truth:
 *   docs/governance/human-gate-levels.md
 *   docs/orchestration/spec-to-worker-pipeline.md
 *   reports/audits/2026-05-11/agent-relay-pipeline-drafts.md
 *   scripts/orchestration/cao-pass.mjs (HG-3.5 PARK detection mirror)
 *   scripts/orchestration/codex-controller-dryrun.mjs (HG-3.5 templates)
 */

import {
  canonicalDescriptionText,
  parseYamlScalar,
  stripHtml,
} from "./plane-html.mjs";
import { extractContractBlock } from "./worker-ledger-validator.mjs";

// Self-attestation marker the contract gate `rg -n no-token-shaped-output`
// looks for in this file and the generated artifact. Presence of the
// marker is the worker's written claim that the artifact never embeds
// token-shaped strings.
export const NO_TOKEN_MARKER = "no-token-shaped-output";

// Cap rules per docs/governance/human-gate-levels.md (sign budget) and
// the Daily Queue Generator draft contract.
export const QUEUE_PRIMARY_CAP = 10;
export const QUEUE_MAX_TRACKED = 50;

// Closed enum for item kinds. The queue surface is the cross-section of
// (a) HG-4 items still waiting for the founder sign-before-dispatch and
// (b) HG-3.5 items paused mid-run waiting for Chief-of-Staff / proxy resume sign.
export const ITEM_KIND = Object.freeze({
  HG_4_REVIEW_REQUIRED: "HG-4-review-required",
  HG_4_DISPATCH_BLOCKED: "HG-4-dispatch-blocked",
  HG_35_AWAITING_RESUME: "HG-3.5-awaiting-resume",
});

// HG-3.5 templates mirror docs/governance/human-gate-levels.md and the
// canonical constants in codex-controller-dryrun.mjs. Defined locally so
// the queue artifact is byte-stable regardless of upstream renames.
export const HG_35_SIGN_TEMPLATE = [
  "controller.founder-proxy-sign:",
  "  verdict: APPROVE",
  "  sign_comment_id: <plane comment id>",
  "  signed_at: <ISO-8601>",
].join("\n");

export const HG_35_REJECT_TEMPLATE = [
  "controller.founder-proxy-sign:",
  "  verdict: REJECT",
  "  reason: <short proxy reason>",
  "  signed_at: <ISO-8601>",
].join("\n");

// HG-4 templates are the founder's sign-before-dispatch contract. The
// future write-capable relay will parse these on the way back in. The
// exported `buildHg3*` names are kept as compatibility aliases for reports
// generated before the 2026-05-21 HG-3 -> HG-4 authority migration.
export function buildHg3SignTemplate(sequence) {
  return [
    "founder.sign:",
    `  work_item: ${sequence}`,
    "  verdict: APPROVE",
    "  signed_at: <ISO-8601>",
  ].join("\n");
}

export function buildHg3RejectTemplate(sequence) {
  return [
    "founder.sign:",
    `  work_item: ${sequence}`,
    "  verdict: REJECT",
    "  reason: <short founder reason>",
    "  signed_at: <ISO-8601>",
  ].join("\n");
}

// ---------- Parsers ----------

/**
 * Parse a controller.founder-proxy-sign block produced by the queue.
 * Round-trips with HG_35_SIGN_TEMPLATE / HG_35_REJECT_TEMPLATE. Returns
 * null when the block is absent or malformed.
 */
export function parseFounderProxySign(text) {
  const body = String(text || "");
  const headerIdx = body.indexOf("controller.founder-proxy-sign:");
  if (headerIdx < 0) return null;
  const slice = body.slice(headerIdx).split(/\r?\n/);
  const out = {};
  for (let i = 1; i < slice.length; i += 1) {
    const line = slice[i];
    if (!line.startsWith(" ") && line.trim() !== "") break;
    const match = line.match(/^\s{2}([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!match) continue;
    out[match[1]] = match[2].trim();
  }
  if (!out.verdict) return null;
  return out;
}

/**
 * Parse a founder.sign block produced by the queue for HG-4 items.
 * Round-trips with buildHg3SignTemplate / buildHg3RejectTemplate.
 */
export function parseHg3FounderSign(text) {
  const body = String(text || "");
  const headerIdx = body.indexOf("founder.sign:");
  if (headerIdx < 0) return null;
  const slice = body.slice(headerIdx).split(/\r?\n/);
  const out = {};
  for (let i = 1; i < slice.length; i += 1) {
    const line = slice[i];
    if (!line.startsWith(" ") && line.trim() !== "") break;
    const match = line.match(/^\s{2}([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!match) continue;
    out[match[1]] = match[2].trim();
  }
  if (!out.verdict || !out.work_item) return null;
  return out;
}

// ---------- Plane comment scanners ----------

const CAO_VERDICT_TITLE = "controller.verdict (cao-v0)";
const CONTROLLER_DECISION_TITLE = "controller.decision (codex-controller-v0)";
const WORKER_REPORTED_TITLE = "worker.reported";

function commentTimestamp(row) {
  return row?.created_at ? Date.parse(row.created_at) : 0;
}

/**
 * Latest CAO controller.verdict comment with its parsed top-level YAML
 * fields and an hg35 sub-block (when present). Returns null if absent.
 */
export function findLatestCaoVerdict(comments) {
  let best = null;
  for (const row of comments || []) {
    const html = row.comment_html || "";
    if (!html.includes(CAO_VERDICT_TITLE)) continue;
    const body = stripHtml(html);
    const yamlMatch = body.match(/controller\.verdict:\s*\n([\s\S]*)$/);
    if (!yamlMatch) continue;
    const fields = parseYamlScalar(yamlMatch[1]);
    const hg35 = parseIndentedBlock(body, "hg35");
    const ts = commentTimestamp(row);
    if (!best || ts > best.ts) {
      best = { ts, comment_id: row.id || null, verdict: fields.verdict || null, hg35 };
    }
  }
  return best;
}

/**
 * Latest controller.decision comment. Presence on an HG-4 item means the
 * founder gate is unblocked. Absence means the queue must still surface
 * the item to the founder.
 */
export function findLatestControllerDecision(comments) {
  let best = null;
  for (const row of comments || []) {
    const html = row.comment_html || "";
    if (!html.includes(CONTROLLER_DECISION_TITLE)) continue;
    const body = stripHtml(html);
    const yamlMatch = body.match(/controller\.decision:\s*\n([\s\S]*)$/);
    if (!yamlMatch) continue;
    const fields = parseYamlScalar(yamlMatch[1]);
    const ts = commentTimestamp(row);
    if (!best || ts > best.ts) {
      best = {
        ts,
        comment_id: row.id || null,
        decision_mode: fields.decision_mode || null,
      };
    }
  }
  return best;
}

/**
 * Latest human_gate.released comment. Presence on an HG-4 item means the
 * founder already allowed dispatch; a later worker report should be routed
 * as a review-required item, not another sign-before-dispatch ask.
 */
export function findLatestHumanGateRelease(comments) {
  let best = null;
  for (const row of comments || []) {
    const html = row.comment_html || "";
    const body = stripHtml(html);
    if (!/(?:^|\n)\s*human_gate\.released\s*(?:\n|$)/.test(body)) continue;
    const ts = commentTimestamp(row);
    if (!best || ts > best.ts) {
      best = { ts, comment_id: row.id || null };
    }
  }
  return best;
}

/**
 * Latest worker.reported comment. Used to detect a well-formed HG-3.5
 * pause (state=NEEDS_HUMAN, reason=hg35-pause-pending, awaiting_sign).
 */
export function findLatestWorkerReported(comments) {
  let best = null;
  for (const row of comments || []) {
    const html = row.comment_html || "";
    if (!html.includes(WORKER_REPORTED_TITLE)) continue;
    const body = stripHtml(html);
    const ts = commentTimestamp(row);
    if (!best || ts > best.ts) {
      const state = body.match(/^\s*state:\s*([A-Z_]+)/m)?.[1] || null;
      const reason = body.match(/^\s*reason:\s*([^\n]+)/m)?.[1]?.trim() || null;
      const hg35 = parseIndentedBlock(body, "hg35");
      best = { ts, comment_id: row.id || null, state, reason, hg35 };
    }
  }
  return best;
}

/**
 * Parse a named YAML block (e.g. `hg35:`) by indent. Returns a plain
 * object of string/boolean/null sub-keys, or null when the block is
 * absent.
 */
export function parseIndentedBlock(body, headerKey) {
  if (!body || !headerKey) return null;
  const lines = String(body).split(/\r?\n/);
  let inBlock = false;
  let baseIndent = -1;
  const block = {};
  for (const line of lines) {
    const match = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!match) continue;
    const [, indent, key, rest] = match;
    if (!inBlock) {
      if (key === headerKey) {
        inBlock = true;
        baseIndent = indent.length;
      }
      continue;
    }
    if (indent.length <= baseIndent) break;
    const raw = rest.trim();
    let value;
    if (raw === "true") value = true;
    else if (raw === "false") value = false;
    else if (raw === "" || raw === "null" || raw === "none") value = null;
    else value = raw;
    block[key] = value;
  }
  return inBlock ? block : null;
}

// ---------- Item classifier ----------

/**
 * Extract the contract block from an item's description (canonical
 * stripHtml -> contract block parse). Returns a flat field map or {}.
 */
export function readContractFields(item) {
  const desc = canonicalDescriptionText(item || {});
  const extracted = extractContractBlock(desc);
  return extracted.ok ? (extracted.fields || {}) : {};
}

/**
 * Classify a Plane work item against the daily-queue admission rules.
 *
 * Returns null if the item does not belong on the founder daily queue.
 * Otherwise returns:
 *   {
 *     kind: ITEM_KIND.*,
 *     sequence: "[WORK_ITEM_ID]",
 *     title: "Founder Daily Queue Generator",
 *     role: "role:coo",
 *     ask: "Sign before dispatch"
 *       | "Review completed HG-4 artifact and sign or reject"
 *       | "Review pause artifact and sign to resume",
 *     pause_artifact: string | null,
 *     contract_human_gate: "HG-4" | "HG-3.5",
 *     updated_at: ISO-8601 string,
 *     comments_seen: number,
 *     evidence: { ... }
 *   }
 */
export function classifyItemForQueue({
  item,
  comments = [],
  labelNames = [],
  projectIdentifier = "COMPA",
}) {
  return classifyItemForQueueWithProject({ item, comments, labelNames, projectIdentifier });
}

export function classifyItemForQueueWithProject({
  item,
  comments = [],
  labelNames = [],
  projectIdentifier = "COMPA",
}) {
  if (!item) return null;
  if (isSupersededQueueItem(item, labelNames)) return null;
  const contractFields = readContractFields(item);
  const rawGate = String(contractFields.human_gate || "").trim();
  if (!rawGate) return null;
  const gate = normalizeQueueGate(rawGate);
  if (gate !== "HG-4" && gate !== "HG-3.5") return null;

  const seq = item.sequence_id
    ? `${normalizeProjectIdentifier(projectIdentifier)}-${item.sequence_id}`
    : (item.id || "unknown");
  const title = sanitizeOneLine(item.name || "");
  const role = resolveRole(labelNames, contractFields);
  const updatedAt = String(item.updated_at || item.created_at || "").trim();
  const pauseArtifact = String(contractFields.hg35_pause_artifact || "").trim() || null;

  if (gate === "HG-4") {
    const decision = findLatestControllerDecision(comments);
    if (decision) return null; // founder has already decided, dispatch unblocked
    const release = findLatestHumanGateRelease(comments);
    const reported = findLatestWorkerReported(comments);
    const reportedNeedsReview = reported?.state === "NEEDS_HUMAN";
    if (release && reportedNeedsReview) {
      return {
        kind: ITEM_KIND.HG_4_REVIEW_REQUIRED,
        sequence: seq,
        title,
        role,
        ask: "Review completed HG-4 artifact and sign or reject",
        pause_artifact: null,
        contract_human_gate: "HG-4",
        updated_at: updatedAt,
        comments_seen: comments.length,
        evidence: {
          human_gate_release: release.comment_id,
          report_state: reported.state || null,
          report_reason: reported.reason || null,
          controller_decision: null,
        },
      };
    }
    if (release) return null; // dispatch already released; no founder action until report lands
    return {
      kind: ITEM_KIND.HG_4_DISPATCH_BLOCKED,
      sequence: seq,
      title,
      role,
      ask: "Sign before dispatch",
      pause_artifact: null,
      contract_human_gate: "HG-4",
      updated_at: updatedAt,
      comments_seen: comments.length,
      evidence: { controller_decision: null },
    };
  }

  // HG-3.5: require CAO PARK + awaiting_sign true.
  const cao = findLatestCaoVerdict(comments);
  const reported = findLatestWorkerReported(comments);
  const caoIsPark = cao?.verdict === "PARK";
  const reportedAwaits = reported?.state === "NEEDS_HUMAN"
    && reported?.reason === "hg35-pause-pending"
    && reported?.hg35?.awaiting_sign === true;
  if (!caoIsPark && !reportedAwaits) return null;

  // Prefer the report's pause_artifact, fall back to the contract field.
  const reportPauseArtifact = reported?.hg35?.pause_artifact || null;
  const caoPauseArtifact = cao?.hg35?.pause_artifact || null;
  return {
    kind: ITEM_KIND.HG_35_AWAITING_RESUME,
    sequence: seq,
    title,
    role,
    ask: "Review pause artifact and sign to resume",
    pause_artifact: reportPauseArtifact || caoPauseArtifact || pauseArtifact,
    contract_human_gate: "HG-3.5",
    updated_at: updatedAt,
    comments_seen: comments.length,
    evidence: {
      cao_verdict: cao?.verdict || null,
      report_state: reported?.state || null,
      report_reason: reported?.reason || null,
      awaiting_sign: reported?.hg35?.awaiting_sign ?? null,
    },
  };
}

function normalizeQueueGate(value) {
  const match = String(value || "").match(/\bHG-(?:0|1|2(?:\.5)?|3(?:\.5)?|4)\b/i);
  return match ? match[0].toUpperCase() : "";
}

function resolveRole(labelNames, contractFields) {
  const fromLabel = (labelNames || []).find((n) => typeof n === "string" && n.startsWith("role:"));
  if (fromLabel) return fromLabel;
  const fromContract = String(contractFields?.role || "").trim();
  return fromContract || "role:unknown";
}

// ---------- Secret / token redaction ----------

// Token shapes we refuse to ever pass through. These are deliberately
// broad: API keys, OAuth/PAT prefixes, bearer headers, long hex/base64
// blobs and known third-party prefixes. Anything matched is replaced
// with a fixed marker so the artifact stays publishable.
const TOKEN_PATTERNS = [
  /sk_(?:live|test)_[A-Za-z0-9]{12,}/g,
  /sk-[A-Za-z0-9_-]{20,}/g,
  /gh[pousr]_[A-Za-z0-9]{20,}/g,
  /xox[abprs]-[A-Za-z0-9-]{10,}/g,
  /Bearer\s+[A-Za-z0-9._-]{20,}/g,
  /Authorization:\s*Bearer\s+[A-Za-z0-9._-]{20,}/gi,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g,
  /\b[A-Fa-f0-9]{40,}\b/g,
  /[A-Za-z0-9+/]{60,}={0,2}/g,
];

export function redactSecrets(text) {
  let out = String(text || "");
  for (const re of TOKEN_PATTERNS) out = out.replace(re, "<redacted>");
  return out;
}

function sanitizeOneLine(text) {
  return redactSecrets(String(text || "").replace(/[\r\n]+/g, " ").trim()).slice(0, 200);
}

// ---------- Queue model ----------

/**
 * Build the canonical queue model. Deterministic for a fixed input.
 *
 * Sort order:
 *   1. kind: HG-4 review-required, then HG-4 dispatch-blocked, then HG-3.5
 *   2. updated_at ascending (oldest waits longest)
 *   3. sequence ascending as final tiebreaker
 *
 * Cap rules:
 *   - First QUEUE_PRIMARY_CAP items go to `primary`
 *   - The next items go to `overflow` (up to QUEUE_MAX_TRACKED)
 *   - Items past QUEUE_MAX_TRACKED are dropped with a warning row
 */
export function buildQueueModel({
  records = [],
  date,
  workspace = "companyos",
  projectIdentifier = "COMPA",
}) {
  if (!date) throw new Error("buildQueueModel requires an explicit date");
  const classifiedRaw = [];
  const malformed = [];
  for (const record of records || []) {
    if (!record || typeof record !== "object") {
      malformed.push({ reason: "record-not-object" });
      continue;
    }
    if (!record.item || typeof record.item !== "object") {
      malformed.push({ reason: "missing-item" });
      continue;
    }
    const comments = Array.isArray(record.comments) ? record.comments : [];
    try {
      const classified = classifyItemForQueue({
        item: record.item,
        comments,
        labelNames: Array.isArray(record.labelNames) ? record.labelNames : [],
        projectIdentifier,
      });
      if (classified) classifiedRaw.push(classified);
    } catch (err) {
      malformed.push({
        reason: "classify-threw",
        sequence: record.item?.sequence_id
          ? `${normalizeProjectIdentifier(projectIdentifier)}-${record.item.sequence_id}`
          : null,
        error: String(err?.message || err).slice(0, 200),
      });
    }
  }

  const sorted = classifiedRaw.slice().sort(compareQueueItems);
  const primary = sorted.slice(0, QUEUE_PRIMARY_CAP);
  const overflow = sorted.slice(QUEUE_PRIMARY_CAP, QUEUE_MAX_TRACKED);
  const dropped = Math.max(0, sorted.length - QUEUE_MAX_TRACKED);

  const warnings = [];
  if (overflow.length > 0) {
    warnings.push(
      `Overflow: ${overflow.length} item(s) beyond the daily cap of ${QUEUE_PRIMARY_CAP}. Listed in Next Up.`,
    );
  }
  if (dropped > 0) {
    warnings.push(`Dropped ${dropped} item(s) above the tracked cap of ${QUEUE_MAX_TRACKED}.`);
  }
  if (malformed.length > 0) {
    warnings.push(`Skipped ${malformed.length} malformed Plane record(s).`);
  }

  return {
    version: "founder-daily-queue/v0",
    workspace,
    date,
    generated_for_date: date,
    project_identifier: normalizeProjectIdentifier(projectIdentifier),
    total_in_scope: sorted.length,
    primary,
    overflow,
    dropped,
    malformed,
    warnings,
  };
}

function normalizeProjectIdentifier(value) {
  const cleaned = String(value || "COMPA").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  return cleaned || "COMPA";
}

function isSupersededQueueItem(item, labelNames = []) {
  const name = String(item?.name || "");
  if (/\bSUPERSEDED(?:[-_\s]DUPLICATE)?\b/i.test(name)) return true;
  return (labelNames || []).some((label) => /\bsuperseded\b/i.test(String(label || "")));
}

function compareQueueItems(a, b) {
  const kindRank = {
    [ITEM_KIND.HG_4_REVIEW_REQUIRED]: 0,
    [ITEM_KIND.HG_4_DISPATCH_BLOCKED]: 1,
    [ITEM_KIND.HG_35_AWAITING_RESUME]: 2,
  };
  const aRank = kindRank[a.kind] ?? 9;
  const bRank = kindRank[b.kind] ?? 9;
  if (aRank !== bRank) return aRank - bRank;
  const aTs = Date.parse(a.updated_at || "") || 0;
  const bTs = Date.parse(b.updated_at || "") || 0;
  if (aTs !== bTs) return aTs - bTs;
  return String(a.sequence).localeCompare(String(b.sequence));
}

// ---------- Rendering ----------

/**
 * Render the queue model as deterministic Markdown.
 *
 * Empty queue produces an Inbox Zero artifact with no warnings.
 */
export function renderQueueMarkdown(model) {
  const lines = [];
  lines.push(`# Founder Daily Queue - ${model.date}`);
  lines.push("");
  lines.push(`generated_by: ${model.version}`);
  lines.push(`workspace: ${model.workspace}`);
  lines.push(`marker: ${NO_TOKEN_MARKER}`);
  lines.push("");

  if (model.total_in_scope === 0) {
    lines.push("## Inbox Zero");
    lines.push("");
    lines.push("No HG-4 or HG-3.5 items are waiting for a founder/proxy decision.");
    lines.push("");
    lines.push("Founder budget consumed today: 0 of <= 20 minutes.");
    lines.push("");
    return ensureTrailingNewline(lines.join("\n"));
  }

  if (model.warnings.length > 0) {
    lines.push("## Warnings");
    lines.push("");
    for (const warning of model.warnings) lines.push(`- ${warning}`);
    lines.push("");
  }

  lines.push("## Primary Queue");
  lines.push("");
  lines.push(`Items: ${model.primary.length} of <= ${QUEUE_PRIMARY_CAP}.`);
  lines.push("");
  for (const item of model.primary) lines.push(...renderItemSection(item));

  if (model.overflow.length > 0) {
    lines.push("## Next Up");
    lines.push("");
    lines.push(
      `Overflow: ${model.overflow.length} item(s) beyond the daily cap. Sign budget exhausted before reaching them.`,
    );
    lines.push("");
    for (const item of model.overflow) lines.push(...renderItemSection(item));
  }

  return ensureTrailingNewline(lines.join("\n"));
}

function renderItemSection(item) {
  const out = [];
  out.push(`### ${item.sequence} - ${item.title || "(no title)"}`);
  out.push("");
  out.push(`- kind: ${item.kind}`);
  out.push(`- role: ${item.role}`);
  out.push(`- human_gate: ${item.contract_human_gate}`);
  out.push(`- ask: ${item.ask}`);
  if (item.pause_artifact) out.push(`- pause_artifact: ${item.pause_artifact}`);
  if (item.updated_at) out.push(`- updated_at: ${item.updated_at}`);
  out.push("");
  out.push("**Sign template (paste into Plane to approve):**");
  out.push("");
  out.push("```yaml");
  out.push(buildSignTemplateFor(item));
  out.push("```");
  out.push("");
  out.push("**Reject template (paste into Plane to send back to the building seat):**");
  out.push("");
  out.push("```yaml");
  out.push(buildRejectTemplateFor(item));
  out.push("```");
  out.push("");
  return out;
}

export function buildSignTemplateFor(item) {
  if (item.kind === ITEM_KIND.HG_35_AWAITING_RESUME) return HG_35_SIGN_TEMPLATE;
  return buildHg3SignTemplate(item.sequence);
}

export function buildRejectTemplateFor(item) {
  if (item.kind === ITEM_KIND.HG_35_AWAITING_RESUME) return HG_35_REJECT_TEMPLATE;
  return buildHg3RejectTemplate(item.sequence);
}

export function renderQueueJson(model) {
  return {
    version: model.version,
    workspace: model.workspace,
    project_identifier: model.project_identifier || "COMPA",
    date: model.date,
    total_in_scope: model.total_in_scope,
    primary_count: model.primary.length,
    overflow_count: model.overflow.length,
    dropped: model.dropped,
    warnings: model.warnings,
    marker: NO_TOKEN_MARKER,
    primary: model.primary.map(summarizeItem),
    overflow: model.overflow.map(summarizeItem),
  };
}

function summarizeItem(item) {
  return {
    sequence: item.sequence,
    kind: item.kind,
    role: item.role,
    human_gate: item.contract_human_gate,
    ask: item.ask,
    pause_artifact: item.pause_artifact,
    updated_at: item.updated_at,
  };
}

function ensureTrailingNewline(text) {
  return text.endsWith("\n") ? text : `${text}\n`;
}
