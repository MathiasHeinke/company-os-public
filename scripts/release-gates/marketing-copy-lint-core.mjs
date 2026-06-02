export const COPY_LINT_GATE_VERSION = "marketing-copy-lint-v0";

const WINDOW_METAPHOR = 150;
const WINDOW_CONTEXT = 200;
const WINDOW_CLAIM = 300;

const NUMERIC_ANCHOR_RE = /(\b\d{2,}\b|\d+[\.,]?\d*\s*(?:%|mg|g|kg|kcal|ml|mmol|umol|ng\/dL|bpm|IU|mcg|nmol|hr|h|min|d|wk|mo|yr|x|\+))/i;
const SOURCE_ANCHOR_RE = /\b(doi|study|trial|guideline|consensus|cohort|sample|n\s*=\s*\d+|nature|jama|nejm|lancet|circulation|frontiers|pmid)\b/i;
const CAVEAT_RE = /\b(not|cannot|does not|doesn't|without|uncertain|uncertainty|caveat|limit|boundary|signal|context|not diagnosis|not medical advice|not treatment)\b/i;

const METAPHOR_PATTERNS = [
  /game.?changer/gi,
  /level.?up/gi,
  /unlock.{0,20}(potential|power|results)/gi,
  /supercharge/gi,
  /skyrocket/gi,
  /rocket.?fuel/gi,
  /transform.{0,15}(your|the)/gi,
  /next.?level/gi,
  /cut.?through.{0,20}noise/gi,
  /on.?another.{0,10}level/gi,
  /take.{0,10}(it|this).{0,10}to.{0,10}(next|higher)/gi,
  /silver.?bullet/gi,
  /holy.?grail/gi,
  /game.?plan/gi,
  /power.?up/gi,
  /optimize.{0,20}(your|the)/gi,
  /peak.?performance/gi,
  /boost.{0,20}(your|the)/gi,
];

const CONTEXT_LABEL_PATTERNS = [
  /for\s+context[,:]?/gi,
  /to\s+provide\s+context[,:]?/gi,
  /this\s+provides?\s+context/gi,
  /as\s+background[,:]?/gi,
  /by\s+way\s+of\s+background/gi,
  /some\s+context\s+here/gi,
  /a\s+bit\s+of\s+context/gi,
];

const DECISION_SIGNAL_RE = /\b(this\s+means|which\s+means|so\s+if|the\s+(key|takeaway|implication|point|question)|what\s+(this|that)\s+(means|tells|shows|suggests)|ask\s+(whether|if|how|what)|inspect|check\s+(whether|if|how|what)|therefore)\b/i;

const INTERNAL_METADATA_PATTERNS = [
  /\brequest_id\s*[:=]/gi,
  /\bjob_id\s*[:=]/gi,
  /\bdispatcher_run_id\s*[:=]/gi,
  /\bsource_run\s*[:=]/gi,
  /\bUpload-?Post\s+job\b/gi,
  /\bscheduled_for\s*[:=]/gi,
  /\bpipeline\s*[:=]\s*["']?(editorial|product|unknown)/gi,
  /\bform_fields\s*[:=]/gi,
  /\bendpoint\s*[:=]\s*["']?\/api\//gi,
  /\bmedia_paths\s*[:=]/gi,
  /\bcancel_path\s*[:=]/gi,
  /\bWorker\s+Contract\b[\s\S]{0,80}\brole:\s*(cmo|cto|cpo|coo|cfo|cao)\b/gi,
  /\bCapabilityProfile\s*[:=]/gi,
  /\bRuntime(Auth|Adapter)\s*[:=]/gi,
];

const DRUG_TERMS = [
  "glp-1",
  "semaglutide",
  "tirzepatide",
  "testosterone",
  "peptide",
  "bpc-157",
  "growth hormone",
  "hgh",
  "sarm",
  "sarms",
  "creatine",
  "metformin",
  "rapamycin",
  "trt",
  "estrogen",
  "progesterone",
  "cortisol",
];

const MEDICAL_TERMS = [
  "condition",
  "symptom",
  "disease",
  "diagnosis",
  "diagnostic",
  "disorder",
  "syndrome",
  "deficiency",
  "level",
  "marker",
  "lab",
  "test",
  "trt",
  "testosterone",
  "glucose",
  "insulin",
  "obesity",
  "diabetes",
];

const PROTOCOL_REJECT_PATTERNS = [
  /\b(your|my)\s+(protocol|stack|cycle|dose|regimen)\b/gi,
  /\btake\s+\d/gi,
  /\bstart\s+(with|on|taking)\s+\d/gi,
  /\binject\s+(yourself|your)\b/gi,
  /\b(inject|injection)\s+(at\s+home|yourself)/gi,
  /\bself.?inject/gi,
  /\bhow\s+to\s+(dose|inject|titrate|cycle)\b/gi,
  /\bdo\s+this\s+(daily|weekly|every)\b/gi,
  /\bhere['']?s\s+(how|what|when)\s+to\s+(take|inject|start|dose)\b/gi,
  /\b(take|use)\s+it\s+(before|after|with|daily|weekly)\b/gi,
  /\boptimize\s+your\s+(dose|protocol|stack|cycle)\b/gi,
];

const PROTOCOL_WARN_PATTERNS = [
  /\bfor\s+you\b/gi,
  /\byour\s+body\b/gi,
  /\byou\s+should\s+(take|try|consider)\b/gi,
  /\byou\s+need\s+(to\s+take|more|less)\b/gi,
  /\beveryone\s+should\b/gi,
  /\bworks\s+for\s+everyone\b/gi,
];

const SOURCING_PATTERNS = [
  /\bbuy\s+(from|at|through|via)\b/gi,
  /\bsource\s+(from|at|through)\b/gi,
  /\border\s+(from|at|through)\b/gi,
  /\bcompound(ing)?\s+(pharmacy|drug|version|form|alternative)\b/gi,
  /\bfind\s+a\s+(pharmacy|clinic|provider|source)\b/gi,
  /\bwhere\s+to\s+(get|find|buy|source|order)\b/gi,
  /\b(hallandale|empower|tailor.?made|olympia|wells)\b/gi,
  /\bprocur(e|ement)\s+(of|from)\b/gi,
  /\bget\s+it\s+from\b/gi,
  /\bthis\s+(pharmacy|clinic|provider|vendor)\b/gi,
];

const DIAGNOSIS_TREATMENT_PATTERNS = [
  /\bdiagnose\s+(yourself|with|this\s+as)\b/gi,
  /\b(this|that)\s+(means|proves)\s+you\s+have\b/gi,
  /\byou\s+have\s+(low|high|elevated|insufficient)\b/gi,
  /\btreat\s+(this|that|it)\s+with\b/gi,
  /\buse\s+\w+\s+(to\s+treat|for)\b/gi,
  /\b(this|that)\s+treats?\b/gi,
  /\b(this|that)\s+(cures?|reverses?|eliminates?|fixes?)\b/gi,
  /\b(guaranteed|proven)\s+to\s+(cure|treat|prevent|reverse|eliminate)\b/gi,
  /\bno\s+(side\s+effects|downside|risk)\b/gi,
  /\brisk.?free\b/gi,
];

const TITRATION_PATTERNS = [
  /\btitrat(e|ing|ion)\s+(up|down|to|from)\s+\d/gi,
  /\bdos(e|ing)\s+of\s+\d/gi,
  /\bcycle\s+(length|duration|of\s+\d+\s+week)/gi,
  /\binject\s+(at\s+home|yourself|subcutaneously|intramuscularly)\b/gi,
  /\bsubcutaneous(ly)?\s+injection\s+instructions?\b/gi,
  /\b(self|home).?administer/gi,
  /\bprescription\s+(for|of|to)\b/gi,
  /\bprescribe\s+(yourself|this)\b/gi,
  /\bget\s+a\s+prescription\b/gi,
  /\bRx\s+(for|to)\b/gi,
  /\bstart\s+(with\s+a\s+)?dose\s+of\s+\d/gi,
  /\b(weekly|daily|every\s+\d+\s+days?)\s+(injection|dose|shot)\b/gi,
];

const EVIDENCE_EXEMPTION_RE = /\b(studied context|commonly studied|research context|observed in|trial design|guideline context|per\s+(guideline|study))\b/i;
const LEGAL_CLAIM_PATTERNS = [
  /\bclinically\s+proven\s+to\b/gi,
  /\bmedically\s+proven\b/gi,
  /\b(guaranteed|proven)\s+to\s+(cure|treat|prevent|reverse|eliminate)\b/gi,
  /\bno\s+side\s+effects\b/gi,
  /\bsafe\s+for\s+everyone\b/gi,
  /\b(partner(ship|ed)|endorsed\s+by|certified\s+by)\s+[A-Z][a-zA-Z]+\b/gi,
  /\b(ATLAS|Company\.?OS|ARES)\s+(is\s+)?(a\s+)?(medical\s+(device|company)|FDA.?regulated)\b/gi,
];
const PARTNERSHIP_OR_FOUNDER_RE = /\b(partnership\s+with|partnered\s+with|endorsed\s+by|co-developed\s+with|founder\s+[A-Z][a-z]+\s+recommends)\b/i;

export function runCopyLint(text = "", payload = {}) {
  const source = normalizeText(text);
  const warnings = [];
  const violations = [];

  collectRegexMatches(source, /ARES\s+Bio\.?OS/gi, (match) => {
    violations.push(makeFinding({
      rule: "ares-bioos-in-atlas-copy",
      classification: "REJECT",
      message: "Public ATLAS copy must not say ARES Bio.OS.",
      text: source,
      match,
    }));
  });

  for (const pattern of INTERNAL_METADATA_PATTERNS) {
    collectRegexMatches(source, pattern, (match) => {
      violations.push(makeFinding({
        rule: "internal-routing-metadata",
        classification: "REJECT",
        message: "Public copy contains internal routing metadata.",
        text: source,
        match,
      }));
    });
  }

  for (const pattern of METAPHOR_PATTERNS) {
    collectRegexMatches(source, pattern, (match) => {
      const context = windowAround(source, match.index, WINDOW_METAPHOR);
      if (NUMERIC_ANCHOR_RE.test(context) || SOURCE_ANCHOR_RE.test(context)) return;
      warnings.push(makeFinding({
        rule: "generic-metaphor-without-number",
        classification: "WARN",
        message: "Generic metaphor appears without a nearby numeric or source anchor.",
        text: source,
        match,
      }));
    });
  }

  for (const pattern of CONTEXT_LABEL_PATTERNS) {
    collectRegexMatches(source, pattern, (match) => {
      const after = source.slice(match.index, match.index + match[0].length + WINDOW_CONTEXT);
      if (DECISION_SIGNAL_RE.test(after)) return;
      warnings.push(makeFinding({
        rule: "context-label-without-decision",
        classification: "WARN",
        message: "Context label appears without a nearby decision or implication signal.",
        text: source,
        match,
      }));
    });
  }

  if (mentionsProduct(source)) {
    warnings.push({
      rule: "product-explainer-standalone-value",
      classification: "REVIEW_REQUIRED",
      message: "Model/editor review must confirm the copy stands alone as useful content before product explanation.",
    });
  }

  const { warnings: filteredWarnings, overrides_applied } = applyWarnOverrides(warnings, payload);
  return resultFrom({ violations, warnings: filteredWarnings, overrides_applied });
}

export function runClaimSafety(text = "", payload = {}) {
  const source = normalizeText(text);
  const warnings = [];
  const violations = [];

  for (const pattern of PROTOCOL_REJECT_PATTERNS) {
    collectRegexMatches(source, pattern, (match) => {
      violations.push(makeFinding({
        rule: "personal-protocol-advice",
        classification: "REJECT",
        message: "Copy appears to give personal protocol, dosing or regimen advice.",
        text: source,
        match,
      }));
    });
  }

  for (const pattern of PROTOCOL_WARN_PATTERNS) {
    collectRegexMatches(source, pattern, (match) => {
      violationsOrWarnings({ source, match, warnings, rule: "personalized-framing-review", message: "Personalized framing requires Claim Safety review." });
    });
  }

  for (const pattern of SOURCING_PATTERNS) {
    collectRegexMatches(source, pattern, (match) => {
      if (!hasAnyTermNear(source, match.index, DRUG_TERMS, WINDOW_CLAIM)) return;
      violations.push(makeFinding({
        rule: "sourcing-vendor-compounding-guidance",
        classification: "REJECT",
        message: "Copy appears to provide sourcing, vendor or compounding guidance.",
        text: source,
        match,
      }));
    });
  }

  for (const pattern of DIAGNOSIS_TREATMENT_PATTERNS) {
    collectRegexMatches(source, pattern, (match) => {
      const lower = match[0].toLowerCase();
      if (lower.includes("treats the topic") || lower.includes("treat the topic")) return;
      if (!hasAnyTermNear(source, match.index, MEDICAL_TERMS, 200)) return;
      violations.push(makeFinding({
        rule: "diagnosis-treatment-instruction",
        classification: "REJECT",
        message: "Copy appears to diagnose, treat, cure, reverse or eliminate a health condition.",
        text: source,
        match,
      }));
    });
  }

  for (const pattern of TITRATION_PATTERNS) {
    collectRegexMatches(source, pattern, (match) => {
      if (EVIDENCE_EXEMPTION_RE.test(windowAround(source, match.index, WINDOW_CLAIM))) return;
      violations.push(makeFinding({
        rule: "prescription-titration-injection-instruction",
        classification: "REJECT",
        message: "Copy appears to provide prescription, titration, cycle or injection instruction.",
        text: source,
        match,
      }));
    });
  }

  collectRegexMatches(source, /\bFDA.?approved\b/gi, (match) => {
    if (allowedFdaApprovedContext(source, match.index)) return;
    violations.push(makeFinding({
      rule: "regulated-fda-overclaim",
      classification: "REJECT",
      message: "FDA-approved claim needs approved indication context or a release decision.",
      text: source,
      match,
    }));
  });

  for (const pattern of LEGAL_CLAIM_PATTERNS) {
    collectRegexMatches(source, pattern, (match) => {
      violations.push(makeFinding({
        rule: "legal-regulated-overclaim",
        classification: "REJECT",
        message: "Copy contains a legal, regulated, partnership or efficacy overclaim.",
        text: source,
        match,
      }));
    });
  }

  if (PARTNERSHIP_OR_FOUNDER_RE.test(source) && !payload.release_card_id) {
    violations.push({
      rule: "partnership-founder-claim-without-release-card",
      classification: "REJECT",
      message: "Partnership, endorsement or founder recommendation claim requires release_card_id.",
      match: "",
      position: -1,
      window: "",
    });
  }

  if (!NUMERIC_ANCHOR_RE.test(source) && !SOURCE_ANCHOR_RE.test(source)) {
    warnings.push({
      rule: "missing-evidence-anchor",
      classification: "WARN",
      message: "No numeric, DOI, source or study anchor detected in the public copy.",
    });
  }
  if (source.trim() && !CAVEAT_RE.test(source)) {
    warnings.push({
      rule: "missing-caveat",
      classification: "WARN",
      message: "No caveat or boundary language detected; Claim Safety should verify framing.",
    });
  }

  const { warnings: filteredWarnings, overrides_applied } = applyWarnOverrides(warnings, payload);
  return resultFrom({ violations, warnings: filteredWarnings, overrides_applied });
}

export function runPolicyCheck(payload = {}) {
  const target = String(payload.distribution_target || "draft").trim() || "draft";
  const releaseCardId = String(payload.release_card_id || "").trim();
  const violations = [];
  if (target !== "draft" && !releaseCardId) {
    violations.push({
      rule: "external-distribution-without-release-card",
      classification: "REJECT",
      message: "distribution_target is not draft, but release_card_id is missing.",
      match: target,
      position: -1,
      window: "",
    });
  }
  return resultFrom({ violations, warnings: [], overrides_applied: [] });
}

export function runFullGate(payload = {}, opts = {}) {
  const text = String(payload.text ?? opts.text ?? "");
  const artifactId = String(payload.artifact_id || opts.artifactId || "");
  const evaluatedAt = opts.now instanceof Date ? opts.now.toISOString() : new Date().toISOString();
  const copy_lint = runCopyLint(text, payload);
  const claim_safety = runClaimSafety(text, payload);
  const policy_check = runPolicyCheck(payload);
  const violations = [
    ...copy_lint.violations,
    ...claim_safety.violations,
    ...policy_check.violations,
  ];
  const warnings = [
    ...copy_lint.warnings,
    ...claim_safety.warnings,
    ...policy_check.warnings,
  ];
  return {
    ok: violations.length === 0,
    gate_version: COPY_LINT_GATE_VERSION,
    evaluated_at: evaluatedAt,
    artifact_id: artifactId || undefined,
    copy_lint,
    claim_safety,
    policy_check,
    violations,
    warnings,
    status: violations.length ? "REJECT" : warnings.length ? "WARN" : "PASS",
  };
}

export function renderFullGateMarkdown(result) {
  const lines = [
    "# Marketing Copy-Lint and Claim-Safety Gate",
    "",
    "```yaml",
    "marketing.copy_claim_gate:",
    `  version: ${result.gate_version}`,
    `  status: ${result.status}`,
    `  ok: ${Boolean(result.ok)}`,
    `  artifact_id: ${result.artifact_id || "unknown"}`,
    `  evaluated_at: ${result.evaluated_at}`,
    `  violations: ${result.violations.length}`,
    `  warnings: ${result.warnings.length}`,
    "```",
    "",
  ];
  if (result.violations.length) {
    lines.push("## Violations", "");
    for (const item of result.violations) lines.push(`- \`${item.rule}\` (${item.classification}): ${item.message}${item.match ? ` — \`${item.match}\`` : ""}`);
    lines.push("");
  }
  if (result.warnings.length) {
    lines.push("## Warnings", "");
    for (const item of result.warnings) lines.push(`- \`${item.rule}\` (${item.classification}): ${item.message}${item.match ? ` — \`${item.match}\`` : ""}`);
    lines.push("");
  }
  lines.push("No publish, schedule, send, import, Plane Done or HumanGate change is performed by this gate.", "");
  return `${lines.join("\n")}\n`;
}

function normalizeText(text) {
  return String(text || "").replace(/\r\n?/g, "\n");
}

function collectRegexMatches(text, pattern, fn) {
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  let match;
  while ((match = re.exec(text))) {
    fn(match);
    if (match[0] === "") re.lastIndex += 1;
  }
}

function makeFinding({ rule, classification, message, text, match }) {
  return {
    rule,
    classification,
    message,
    match: match[0],
    position: match.index,
    window: sentenceWindow(text, match.index),
  };
}

function resultFrom({ violations, warnings, overrides_applied }) {
  return {
    ok: violations.length === 0,
    violations,
    warnings,
    overrides_applied,
  };
}

function applyWarnOverrides(warnings, payload = {}) {
  const reason = String(payload.override_reason || "").trim();
  if (!reason) return { warnings, overrides_applied: [] };
  const keep = [];
  const overrides = [];
  for (const warning of warnings) {
    if (warning.classification === "WARN") {
      overrides.push({ ...warning, override_reason: reason });
    } else {
      keep.push(warning);
    }
  }
  return { warnings: keep, overrides_applied: overrides };
}

function windowAround(text, index, radius) {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end);
}

function sentenceWindow(text, index) {
  const start = Math.max(0, text.lastIndexOf(".", index - 1), text.lastIndexOf("\n", index - 1));
  const afterPeriod = text.indexOf(".", index + 1);
  const afterLine = text.indexOf("\n", index + 1);
  const candidates = [afterPeriod, afterLine].filter((n) => n >= 0);
  const end = candidates.length ? Math.min(...candidates) + 1 : Math.min(text.length, index + 180);
  return text.slice(start ? start + 1 : 0, end).trim();
}

function hasAnyTermNear(text, index, terms, radius) {
  const context = windowAround(text.toLowerCase(), index, radius);
  return terms.some((term) => context.includes(term.toLowerCase()));
}

function allowedFdaApprovedContext(text, index) {
  const context = windowAround(text.toLowerCase(), index, 140);
  const allowedDrug = /(semaglutide|tirzepatide|liraglutide|orlistat|metformin)/i.test(context);
  const approvedIndication = /\b(for|in)\s+(obesity|diabetes|type\s+2\s+diabetes|weight\s+management)\b/i.test(context);
  const negated = /\b(is\s+not|not\s+yet|pending|under\s+review|awaiting)\b/i.test(context);
  return negated || (allowedDrug && approvedIndication);
}

function mentionsProduct(text) {
  return /\b(ATLAS|Company\.?OS|Bio\.?OS|product|platform|software|app|system)\b/i.test(text);
}

function violationsOrWarnings({ source, match, warnings, rule, message }) {
  warnings.push(makeFinding({
    rule,
    classification: "WARN",
    message,
    text: source,
    match,
  }));
}
