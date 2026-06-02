#!/usr/bin/env node

/*
 * worker-ledger-validator.mjs
 *
 * Validates a Plane work item description against the Company.OS Worker
 * Issue Contract. Phase 1: parses a fenced YAML-ish block from the
 * description and checks the dispatcher-required fields.
 *
 * Pure validation: no Plane writes.
 *
 * Source of truth:
 *   docs/templates/worker-issue-contract.md
 *   docs/orchestration/plane-role-routing.md
 *   docs/orchestration/plane-worker-dispatcher-v0.md
 */

import { readFileSync } from "node:fs";
import { validateWorkerConfidence } from "./confidence-calibration-core.mjs";

export const ROLE_LABEL_SET = new Set([
  "role:cto",
  "role:cpo",
  "role:cmo",
  "role:coo",
  "role:cfo",
  "role:cao",
]);

export const KNOWN_AGENTS = new Set(["claude", "codex", "gemini", "human"]);
export const KNOWN_MODES = new Set([
  "audit",
  "plan",
  "implement",
  "verify",
  "research",
  "report",
  "review",
]);
export const KNOWN_DISPATCH = new Set(["manual", "scheduled", "ready"]);

// Canonical HumanGate enum per docs/governance/human-gate-levels.md.
// HG-3 is CEO/Codex critical authority, HG-3.5 is Chief-of-Staff /
// founder-proxy review, and HG-4 is the real founder/strategic boundary.
export const KNOWN_HUMAN_GATES = new Set([
  "HG-0",
  "HG-1",
  "HG-2",
  "HG-2.5",
  "HG-3",
  "HG-3.5",
  "HG-4",
]);

// Canonical TargetClass enum per docs/orchestration/supergoal-execution-ladder.md.
// TargetClass declares which Execution-Ladder stage a work item's DONE maps to,
// so the ledger reflects integration truth (built != integrated != live):
//   report-only         -> DONE at CONTROLLER_AUTO_GO / SANDBOX_VERIFIED (no main/prod change)
//   main-integrated     -> DONE only at INTEGRATED_MAIN (Codex/CEO authority)
//   production-deployed  -> DONE only at DEPLOYED_PROD (Codex/Founder/Release-Gate authority)
// The field is OPTIONAL (not in REQUIRED_FIELDS) so historic contracts keep their
// verdict; when present, an unknown value REJECTs with contract.unknown-target-class.
export const KNOWN_TARGET_CLASSES = new Set([
  "report-only",
  "main-integrated",
  "production-deployed",
]);

// Normalize a target_class scalar (lowercased, exact enum token). Returns empty
// string when absent so the optional-field semantics hold.
export function normalizeTargetClass(value = "") {
  return String(value || "").trim().toLowerCase();
}

// Validate the WorkerConfidence / WorkerConfidenceBasis pair from a worker.reported
// block. Additive, contract-style wrapper over confidence-calibration-core's
// validateWorkerConfidence; it does NOT alter validateContract or any existing
// validation path. Returns { ok, reason, confidence } with stable reason codes so
// a controller/CAO can enforce the native confidence field when wiring it in.
export function validateWorkerReportedConfidence({ workerConfidence, workerConfidenceBasis } = {}) {
  const r = validateWorkerConfidence({ confidence: workerConfidence, basis: workerConfidenceBasis });
  const reasonMap = {
    "confidence.ok": "reported.worker-confidence-ok",
    "confidence.missing": "reported.worker-confidence-missing",
    "confidence.out-of-range": "reported.worker-confidence-out-of-range",
    "confidence.basis-missing": "reported.worker-confidence-basis-missing",
  };
  return { ok: r.ok, reason: reasonMap[r.reason] || r.reason, confidence: r.confidence };
}

// Extract the leading HG-* token from a human_gate scalar that may carry
// descriptive prose ("HG-2.5 sandbox only; no merge"). Returns the
// uppercase canonical token, or empty string when no token is present.
export function normalizeHumanGateLevel(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/\bHG-(?:0|1|2(?:\.5)?|3(?:\.5)?|4)\b/i);
  if (match) return match[0].toUpperCase();
  // Distinguish "the operator wrote a level we don't recognize yet" from
  // "the operator wrote prose with no level token at all". Returning the
  // raw text lets the validator emit contract.unknown-human-gate-level
  // for explicit unknown levels like "HG-9" or "hg-4 founder gate".
  return /\bHG-[^\s,;]*/i.test(text) ? text.match(/\bHG-[^\s,;]+/i)[0].toUpperCase() : "";
}

const REQUIRED_FIELDS = [
  "role",
  "parent_seat",
  "agent",
  "mode",
  "workspace",
  "dispatch",
  "source_of_truth",
  "acceptance_criteria",
  "gates",
  "human_gate",
  "reporting",
];

const ROLE_FIELD = "role";
const PARENT_SEAT_FIELD = "parent_seat";

const BLOCKED_ACTION_HINTS = [
  /\b(merge|push|deploy|schema|rls|production[- ]write|public[- ]publish|plane done|linear write)\b/i,
];

const BROAD_SCOPE_HINTS = [
  /\bdo (everything|all|the whole)\b/i,
  /\b(rewrite|refactor) (the )?(entire|whole|complete) (codebase|repo|project)\b/i,
];

/**
 * Extract a worker-issue-contract YAML block from a Plane work item
 * description. Accepts either a fenced ```yaml ... ``` or a fenced
 * ```worker-issue-contract ... ``` block. The block is parsed as a flat
 * key:value dictionary with array values written as `- ...` lines.
 */
export function extractContractBlock(description) {
  if (!description || typeof description !== "string") {
    return { ok: false, reason: "description.empty" };
  }

  const fenceRegex = /```(?:yaml|worker-issue-contract|contract)\s*\n([\s\S]*?)\n```/m;
  const match = description.match(fenceRegex);
  if (!match) return { ok: false, reason: "contract.block-missing" };

  return parseContractText(match[1]);
}

export function parseContractText(text) {
  const lines = text.split(/\r?\n/);
  const fields = {};
  const nestedKeys = [];
  let currentKey = null;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) continue;
    if (/^\s*#/.test(line)) continue;

    const arrayItem = line.match(/^\s*-\s+(.*)$/);
    if (arrayItem && currentKey) {
      const v = arrayItem[1].trim();
      if (!Array.isArray(fields[currentKey])) fields[currentKey] = [];
      fields[currentKey].push(v);
      continue;
    }

    const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!kv) {
      const indentedKv = line.match(/^\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
      if (indentedKv) {
        if (currentKey === "intervention_budget") {
          if (!fields.intervention_budget || Array.isArray(fields.intervention_budget)) {
            fields.intervention_budget = {};
          }
          fields.intervention_budget[indentedKv[1].toLowerCase()] = parseContractScalar(indentedKv[2].trim());
          continue;
        }
        nestedKeys.push({
          parent: currentKey,
          key: indentedKv[1].toLowerCase(),
        });
      }
      continue;
    }
    const key = kv[1].toLowerCase();
    const value = kv[2].trim();
    if (value.length === 0) {
      fields[key] = [];
      currentKey = key;
    } else {
      fields[key] = value;
      currentKey = key;
    }
  }

  const malformed = nestedKeys.length > 0 ? { nested_keys: nestedKeys } : undefined;
  return malformed ? { ok: true, fields, malformed } : { ok: true, fields };
}

function parseContractScalar(value) {
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === "true";
  return value;
}

/**
 * Validate a Plane work item description + labels against the contract.
 *
 * Optional inputs:
 *   parentRoleLabel — the role:* of the parent work item, used to enforce
 *     the parent_seat field on cross-role child items.
 *   authorRoleLabel — the role:* of the seat that authored the work item.
 *     Currently passed in by the caller when known. If omitted, the
 *     `role.cao.created-by-non-cao-seat` check is treated as a Phase 2
 *     feature and skipped silently rather than failing closed. The Plane
 *     comment-author identity resolver lands in Phase 2.
 */
export function validateContract({ description, labels, parentRoleLabel, authorRoleLabel }) {
  const reasons = [];
  const evidence = {};
  if (authorRoleLabel) evidence.author_role = authorRoleLabel;

  // Role label gate
  const roleLabels = (labels || []).filter((l) => l.startsWith("role:"));
  if (roleLabels.length === 0) reasons.push("role.label.missing");
  else if (roleLabels.length > 1) reasons.push("role.label.multiple");
  else if (!ROLE_LABEL_SET.has(roleLabels[0])) reasons.push("role.label.unknown");
  evidence.role_labels = roleLabels;

  // Contract block extraction
  const extracted = extractContractBlock(description);
  if (!extracted.ok) {
    if (extracted.reason === "description.empty") reasons.push("contract.required-field-missing");
    else if (extracted.reason === "contract.block-missing") reasons.push("contract.required-field-missing");
    return finalize(reasons, evidence);
  }

  const fields = extracted.fields;
  evidence.fields = Object.keys(fields).sort();

  // Nested wrapper detection. Plane Phase 1 contracts must be flat at column 0.
  // If indented `key:` continuations are present, the description is wrapped
  // under a parent block (worker_issue_contract:, contract:, metadata:, or a
  // legacy nested human_gate:). The parser intentionally does not parse YAML
  // sub-trees; we surface a stable, specific reject so operators see why the
  // required fields look "missing".
  if (extracted.malformed?.nested_keys?.length) {
    reasons.push("contract.fields-wrapped-in-parent-block");
    evidence.nested_keys = extracted.malformed.nested_keys.slice(0, 8);
  }

  // Required field presence
  for (const field of REQUIRED_FIELDS) {
    const v = fields[field];
    if (v === undefined) reasons.push("contract.required-field-missing");
    if (Array.isArray(v) && v.length === 0) {
      if (field === "source_of_truth") reasons.push("contract.source-of-truth-empty");
      else if (field === "gates") reasons.push("contract.gates-empty");
      else if (field === "acceptance_criteria") reasons.push("contract.required-field-missing");
    }
  }

  // role + parent_seat
  if (fields[ROLE_FIELD] && roleLabels.length === 1 && fields[ROLE_FIELD] !== roleLabels[0]) {
    reasons.push("contract.role-field-label-mismatch");
  }

  const parentSeat = fields[PARENT_SEAT_FIELD];
  if (parentSeat && parentSeat !== "none" && !ROLE_LABEL_SET.has(parentSeat)) {
    reasons.push("contract.parent_seat-mismatch");
  }
  if (parentRoleLabel && parentSeat && parentSeat !== "none" && parentSeat !== parentRoleLabel) {
    reasons.push("contract.parent_seat-mismatch");
  }

  // Enum checks
  const agent = String(fields.agent || "").toLowerCase();
  if (agent && !KNOWN_AGENTS.has(agent)) reasons.push("contract.unknown-agent");

  const mode = String(fields.mode || "").toLowerCase();
  if (mode && !KNOWN_MODES.has(mode)) reasons.push("contract.unknown-mode");

  const dispatch = String(fields.dispatch || "").toLowerCase();
  if (dispatch && !KNOWN_DISPATCH.has(dispatch)) reasons.push("contract.unknown-dispatch");
  if (dispatch && dispatch !== "ready") reasons.push("contract.dispatch-not-ready");

  // HumanGate enum check (docs/governance/human-gate-levels.md).
  // The validator is intentionally tolerant of descriptive prose after
  // the level token; "HG-2.5 sandbox only; no merge" is allowed. Unknown
  // levels REJECT with a stable code so operators see why.
  const humanGateLevel = normalizeHumanGateLevel(fields.human_gate || "");
  if (humanGateLevel) {
    evidence.human_gate_level = humanGateLevel;
    if (!KNOWN_HUMAN_GATES.has(humanGateLevel)) {
      reasons.push("contract.unknown-human-gate-level");
    }
    // Founder-Proxy (HG-3.5) requires a declared pause artifact.
    if (humanGateLevel === "HG-3.5") {
      const pauseArtifact = String(fields.hg35_pause_artifact || "").trim();
      if (!pauseArtifact) reasons.push("contract.hg35-pause-artifact-missing");
    }
  }

  // TargetClass enum check (docs/orchestration/supergoal-execution-ladder.md).
  // Optional field. When present, the value must be one of the canonical
  // classes so the controller/synthesis can map DONE to the correct
  // Execution-Ladder stage. Unknown values REJECT with a stable code.
  const targetClassRaw = fields.target_class;
  if (targetClassRaw !== undefined && String(targetClassRaw).trim() !== "") {
    const targetClass = normalizeTargetClass(targetClassRaw);
    evidence.target_class = targetClass;
    if (!KNOWN_TARGET_CLASSES.has(targetClass)) {
      reasons.push("contract.unknown-target-class");
    }
  }

  // CAO author rule. Phase 2: requires a Plane comment-author identity
  // resolver. When `authorRoleLabel` is supplied (manual CLI flag or
  // future dispatcher integration), the rule is enforced. When omitted,
  // the rule is skipped — reject code stays stable for forward
  // compatibility but is not emitted in Phase 1 dispatcher runs.
  if (roleLabels[0] === "role:cao" && authorRoleLabel && authorRoleLabel !== "role:cao") {
    reasons.push("role.cao.created-by-non-cao-seat");
  }

  // Safety heuristics
  const fullText = description.toLowerCase();
  if (BROAD_SCOPE_HINTS.some((rx) => rx.test(fullText))) {
    reasons.push("safety.scope-too-broad");
  }
  for (const rx of BLOCKED_ACTION_HINTS) {
    if (rx.test(fullText) && !/blockedactions|blocked_actions|do not|never/i.test(fullText)) {
      reasons.push("safety.blocked-action-requested");
      break;
    }
  }

  return finalize(reasons, evidence);
}

function finalize(reasons, evidence) {
  const unique = Array.from(new Set(reasons));
  return {
    ok: unique.length === 0,
    reason_codes: unique,
    evidence,
  };
}

function parseArgs(argv) {
  const args = { description: "", descriptionFile: "", labels: [], parentRoleLabel: "", authorRoleLabel: "", json: false, examples: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--description") args.description = argv[++i] || "";
    else if (arg === "--description-file") args.descriptionFile = argv[++i] || "";
    else if (arg === "--label") args.labels.push(argv[++i] || "");
    else if (arg === "--parent-role-label") args.parentRoleLabel = argv[++i] || "";
    else if (arg === "--author-role-label") args.authorRoleLabel = argv[++i] || "";
    else if (arg === "--json") args.json = true;
    else if (arg === "--examples") args.examples = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.descriptionFile) args.description = readFileSync(args.descriptionFile, "utf8");
  return args;
}

/**
 * Canonical and rejected description shapes the validator supports. Returned
 * as a structured catalog so the CLI `--examples` flag, the test suite, and
 * any external verifier all consume the same source of truth.
 */
export const SUPPORTED_SHAPES = Object.freeze([
  {
    name: "flat-yaml-fence",
    summary: "Markdown ```yaml fence with flat keys at column 0",
    expected: "PASS",
    description: [
      "```yaml",
      "role: role:cto",
      "parent_seat: none",
      "agent: claude",
      "mode: implement",
      "workspace: registry:company-os",
      "dispatch: ready",
      "source_of_truth:",
      "  - /abs/source.md",
      "acceptance_criteria:",
      "  - One verifiable outcome.",
      "gates:",
      "  - node --check scripts/orchestration/worker-ledger-validator.mjs",
      "human_gate: HG-1",
      "reporting: Plane worker.reported with changed files and gates.",
      "BlockedActions: never push, never deploy.",
      "```",
    ].join("\n"),
    labels: ["role:cto"],
  },
  {
    name: "worker-issue-contract-fence",
    summary: "Markdown ```worker-issue-contract fence accepted as a synonym",
    expected: "PASS",
    description: [
      "```worker-issue-contract",
      "role: role:cpo",
      "parent_seat: none",
      "agent: claude",
      "mode: audit",
      "workspace: registry:company-os",
      "dispatch: ready",
      "source_of_truth:",
      "  - /abs/source.md",
      "acceptance_criteria:",
      "  - Audit report committed to absolute path.",
      "gates:",
      "  - node --check scripts/orchestration/worker-ledger-validator.mjs",
      "human_gate: HG-1",
      "reporting: Plane worker.reported with verdict.",
      "```",
    ].join("\n"),
    labels: ["role:cpo"],
  },
  {
    name: "plane-html-roundtrip",
    summary: "Plane TipTap HTML wrapping the markdown fence inside <pre><code>",
    expected: "PASS",
    description: [
      "<p>Worker contract for COMPA-XXX</p>",
      "<pre><code>```yaml",
      "role: role:cto",
      "parent_seat: none",
      "agent: claude",
      "mode: implement",
      "workspace: registry:company-os",
      "dispatch: ready",
      "source_of_truth:",
      "  - /abs/source.md",
      "acceptance_criteria:",
      "  - &quot;quoted scalar&quot; survives entity decoding.",
      "gates:",
      "  - node --check scripts/orchestration/*.mjs",
      "human_gate: HG-2.5",
      "reporting: Plane worker.reported with capability_context_proof.",
      "```</code></pre>",
    ].join("\n"),
    labels: ["role:cto"],
    note: "Plane stores entity-encoded YAML scalars; the verifier strips the HTML and decodes &quot; / &apos; / &#39; / &#x27; before parsing.",
  },
  {
    name: "plane-html-raw-pre-code-contract",
    summary: "Plane TipTap HTML <pre><code> with raw flat contract keys and no inner markdown fence",
    expected: "PASS",
    description: [
      "<p>Worker contract for COMPA-XXX</p>",
      "<pre><code>",
      "role: role:cto",
      "parent_seat: role:cto",
      "agent: claude",
      "mode: implement",
      "workspace: registry:company-os",
      "dispatch: ready",
      "source_of_truth:",
      "  - /abs/source.md",
      "acceptance_criteria:",
      "  - Raw pre/code contract is normalized into a yaml fence.",
      "gates:",
      "  - node --test scripts/orchestration/worker-ledger-validator.test.mjs",
      "human_gate: HG-2.5",
      "reporting: Plane worker.reported with capability_context_proof.",
      "BlockedActions: never push, never deploy.",
      "</code></pre>",
    ].join("\n"),
    labels: ["role:cto"],
    note: "This is the [WORK_ITEM_ID] shape: Plane stores a raw pre/code block without an inner ```yaml fence; stripHtml synthesizes the fence before validation.",
  },
  {
    name: "nested-under-worker_issue_contract",
    summary: "Required fields wrapped under a parent block (forbidden)",
    expected: "REJECT",
    expected_reason_codes: ["contract.fields-wrapped-in-parent-block"],
    description: [
      "```yaml",
      "worker_issue_contract:",
      "  role: role:cto",
      "  agent: claude",
      "  mode: implement",
      "  workspace: registry:company-os",
      "  dispatch: ready",
      "  source_of_truth:",
      "    - /abs/source.md",
      "  acceptance_criteria:",
      "    - tests green",
      "  gates:",
      "    - node --check",
      "  human_gate: HG-1",
      "  reporting: Plane worker.reported.",
      "```",
    ].join("\n"),
    labels: ["role:cto"],
  },
  {
    name: "nested-under-metadata",
    summary: "Legacy metadata: wrapper (forbidden)",
    expected: "REJECT",
    expected_reason_codes: ["contract.fields-wrapped-in-parent-block"],
    description: [
      "```yaml",
      "metadata:",
      "  role: role:coo",
      "  agent: claude",
      "```",
    ].join("\n"),
    labels: ["role:coo"],
  },
  {
    name: "missing-fence",
    summary: "Description without any fenced contract block",
    expected: "REJECT",
    expected_reason_codes: ["contract.required-field-missing"],
    description: "role: role:cto\nagent: claude\nmode: implement\n",
    labels: ["role:cto"],
  },
]);

function printExamples({ json } = {}) {
  if (json) {
    console.log(JSON.stringify(SUPPORTED_SHAPES, null, 2));
    return;
  }
  for (const shape of SUPPORTED_SHAPES) {
    console.log(`# ${shape.name} (${shape.expected})`);
    console.log(`# ${shape.summary}`);
    if (shape.note) console.log(`# note: ${shape.note}`);
    if (shape.expected_reason_codes) {
      console.log(`# expected reject codes: ${shape.expected_reason_codes.join(", ")}`);
    }
    console.log(shape.description);
    console.log("");
  }
}

function usage() {
  return `Usage:
  node scripts/orchestration/worker-ledger-validator.mjs \\
    [--description "<text>" | --description-file file.md] \\
    [--label role:cto] [--label other-label] \\
    [--parent-role-label role:cto] \\
    [--author-role-label role:cao] \\
    [--examples] \\
    [--json]

Returns exit code 0 on PASS, 2 on REJECT.

Use --examples to print the catalog of supported and rejected description
shapes (Markdown, Plane HTML round-trip, malformed nested wrappers). Combine
with --json to get a structured fixture catalog.

Note: --author-role-label enables the role.cao.created-by-non-cao-seat
check. In Phase 1 the dispatcher does not pass this flag because Plane
comment-author identity resolution is Phase 2; the check is silently
skipped when the flag is absent.
`;
}

async function cli() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (args.examples) {
    printExamples({ json: args.json });
    return;
  }

  const verdict = validateContract({
    description: args.description,
    labels: args.labels,
    parentRoleLabel: args.parentRoleLabel || undefined,
    authorRoleLabel: args.authorRoleLabel || undefined,
  });

  if (args.json) {
    console.log(JSON.stringify(verdict, null, 2));
  } else {
    console.log(`worker-ledger-validator: ${verdict.ok ? "PASS" : "REJECT"}`);
    for (const code of verdict.reason_codes) console.log(`reject: ${code}`);
  }

  process.exitCode = verdict.ok ? 0 : 2;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  cli().catch((err) => {
    console.error(`worker-ledger-validator failed: ${err.message}`);
    process.exitCode = 1;
  });
}
