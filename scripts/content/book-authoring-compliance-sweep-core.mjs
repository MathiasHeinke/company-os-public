import fs from "node:fs";

export const BOOK_AUTHORING_COMPLIANCE_SWEEP_VERSION = "book-authoring-compliance-sweep/v0";

const DASH_TELLS = Object.freeze([
  { id: "en_dash", pattern: /\u2013/g },
  { id: "em_dash", pattern: /\u2014/g },
]);

const WORKER_LEAK_PATTERNS = Object.freeze([
  { id: "fact_verify_marker", pattern: /FACT_VERIFY|TODO_SOURCE|SOURCE_NEEDED/g },
  { id: "worker_report_marker", pattern: /worker\.reported|controller\.decision|controller\.verdict/g },
  { id: "contract_marker", pattern: /Acceptance Criteria:|SourceOfTruth:|RoleLabel:|ParentSeat:/g },
  { id: "worker_yaml_contract", pattern: /```yaml\s+role:\s+role:/g },
]);

const GENDERING_PATTERNS = Object.freeze([
  { id: "colon_gendering", pattern: /\b[A-Za-z]+:innen\b/g },
  { id: "asterisk_gendering", pattern: /\b[A-Za-z]+\*innen\b/g },
  { id: "slash_gendering", pattern: /\b[A-Za-z]+\/innen\b/g },
  { id: "underscore_gendering", pattern: /\b[A-Za-z]+_innen\b/g },
]);

function countMatches(text, patterns) {
  return patterns.flatMap(({ id, pattern }) => {
    const matches = [...String(text || "").matchAll(pattern)];
    return matches.map((match) => ({ id, index: match.index ?? 0, match: match[0] }));
  });
}

function check(status, id, message, details = {}) {
  return { status: status ? "pass" : "block", id, message, details };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractForbiddenPatterns(fvbmText = "") {
  const lines = String(fvbmText || "").split(/\r?\n/);
  const values = [];
  let inList = false;
  let listIndent = 0;
  for (const line of lines) {
    const field = line.match(/^(\s*)forbidden_patterns:\s*(.*)$/);
    if (field) {
      inList = true;
      listIndent = field[1].length;
      const inline = field[2].trim();
      if (inline.startsWith("[") && inline.endsWith("]")) {
        for (const entry of inline.slice(1, -1).split(",")) {
          const clean = entry.trim().replace(/^["']|["']$/g, "");
          if (clean) values.push(clean);
        }
        inList = false;
      }
      continue;
    }
    if (!inList) continue;
    const item = line.match(/^(\s*)-\s+(.+)$/);
    if (!item) {
      if (line.trim() && line.search(/\S/) <= listIndent) inList = false;
      continue;
    }
    const clean = item[2].trim().replace(/^["']|["']$/g, "");
    if (clean) values.push(clean);
  }
  return [...new Set(values)];
}

export function evaluateVoiceBeliefReport(reportText = "") {
  const text = String(reportText || "");
  return {
    voice_match: /\bvoice_match:\s*(PASS|pass)\b/.test(text),
    belief_match: /\bbelief_match:\s*(PASS|pass)\b/.test(text),
  };
}

export function runBookAuthoringComplianceSweep({
  manuscriptText = "",
  fvbmText = "",
  voiceBeliefReportText = "",
} = {}) {
  const dashHits = countMatches(manuscriptText, DASH_TELLS);
  const workerLeaks = countMatches(manuscriptText, WORKER_LEAK_PATTERNS);
  const genderingHits = countMatches(manuscriptText, GENDERING_PATTERNS);
  const forbiddenPatterns = extractForbiddenPatterns(fvbmText);
  const forbiddenHits = forbiddenPatterns.flatMap((term) => {
    const pattern = new RegExp(escapeRegExp(term), "gi");
    return [...String(manuscriptText || "").matchAll(pattern)].map((match) => ({
      id: "fvbm_forbidden_pattern",
      term,
      index: match.index ?? 0,
      match: match[0],
    }));
  });
  const voiceBelief = evaluateVoiceBeliefReport(voiceBeliefReportText);
  const checks = [
    check(dashHits.length === 0, "dash_tells.none", "No en dash or em dash AI-tell punctuation.", { hits: dashHits }),
    check(genderingHits.length === 0, "gendering.none", "No configured gendering shorthand patterns.", { hits: genderingHits }),
    check(workerLeaks.length === 0, "worker_leaks.none", "No worker notes, contract markers or controller comments leaked into manuscript.", { hits: workerLeaks }),
    check(forbiddenHits.length === 0, "fvbm_forbidden.none", "No FVBM forbidden patterns found in manuscript.", { hits: forbiddenHits, forbidden_patterns: forbiddenPatterns }),
    check(voiceBelief.voice_match, "voice_match.pass", "Voice-match reviewer verdict is PASS.", { present: voiceBelief.voice_match }),
    check(voiceBelief.belief_match, "belief_match.pass", "Belief-match reviewer verdict is PASS.", { present: voiceBelief.belief_match }),
  ];
  const ok = checks.every((entry) => entry.status === "pass");
  return {
    ok,
    version: BOOK_AUTHORING_COMPLIANCE_SWEEP_VERSION,
    status: ok ? "PASS" : "REJECT",
    checks,
  };
}

export function readSweepInput({ manuscript, fvbm, voiceBeliefReport }) {
  if (!manuscript) throw new Error("--manuscript is required");
  if (!fvbm) throw new Error("--fvbm is required");
  if (!voiceBeliefReport) throw new Error("--voice-belief-report is required");
  return {
    manuscriptText: fs.readFileSync(manuscript, "utf8"),
    fvbmText: fs.readFileSync(fvbm, "utf8"),
    voiceBeliefReportText: fs.readFileSync(voiceBeliefReport, "utf8"),
  };
}
