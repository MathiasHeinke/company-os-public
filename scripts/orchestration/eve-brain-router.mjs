#!/usr/bin/env node

/*
 * EVE / Hermes operator-brain router.
 *
 * Dry-run only. This file does not call a provider, write a ledger, mutate
 * Plane or dispatch workers. It returns the model-power class that EVE/Hermes
 * should use for an operator-shell request.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const EVE_BRAIN_ROUTER_VERSION = "eve-brain-router/v0";
export const DEFAULT_EVE_BRAIN_REGISTRY_PATH = "registries/inference/eve-hermes-brain.json";

export const EVE_BRAIN_REASONS = Object.freeze({
  REGISTRY_INVALID: "eve-brain.registry-invalid",
  ROUTE_MISSING: "eve-brain.route-missing",
  CLASS_UNKNOWN: "eve-brain.class-unknown",
  AUTONOMY_BLOCKED: "eve-brain.autonomy-blocked",
});

const BRAIN_CLASS_ORDER = Object.freeze([
  "B0-intake-scout",
  "B1-daily-brain",
  "B2-long-context-challenger",
  "B3-superbrain",
  "B4-founder-veto",
]);

const FOUNDER_VETO_PATTERNS = [
  /\bHG-4\b/i,
  /\birreversible|non[-\s]?restorable|cannot\s+rollback\b/i,
  /\blegal\s+commitment|contract\s+signature|capital\s+allocation\b/i,
  /\bpricing\s+(change|commitment|promise)|customer[-\s]?facing\s+promise\b/i,
  /\bpublic\s+(founder\s+voice|commitment|statement)\b/i,
  /\bproduction\s+write|hosted\s+account\s+creation|create\s+hosted\s+account\b/i,
  /\bservice[-\s]?role|schema|RLS|money\s+movement\b/i,
];

const SUPERBRAIN_PATTERNS = [
  /\bfounder\s+intent|chief\s+of\s+staff|CEO\s+delegation\b/i,
  /\bC[-\s]?Level|multi[-\s]?department|orchestrat/i,
  /\bambiguous|unclear|conflict|contradiction|trade[-\s]?off\b/i,
  /\bstrategy|roadmap|release\s+gate|HumanGate|HG-3\b/i,
  /\bdecision\s+path|decision\s+tree|what\s+should\s+we\s+do\b/i,
  /\bEVE|Hermes|Command\s+Center\b/i,
];

const LONG_CONTEXT_PATTERNS = [
  /\blong[-\s]?context|large\s+(context|bundle|source|report)\b/i,
  /\btranscript|screenshot|screen\s+record|source\s+sweep\b/i,
  /\bcross[-\s]?source|cross[-\s]?workspace|cross[-\s]?repo\b/i,
  /\bcompare\s+sources|find\s+contradictions|audit\s+all\b/i,
];

const SCOUT_PATTERNS = [
  /\bclassify|dedupe|summari[sz]e\s+short|title|label\b/i,
  /\bone\s+(question|next\s+step)|quick\s+triage\b/i,
];

const DAILY_PATTERNS = [
  /\bonboarding|morning\s+report|status|setup|next\s+step\b/i,
  /\bintent\s+card|department\s+routing|draft\s+plan\b/i,
];

export function loadEveBrainRegistry(path = DEFAULT_EVE_BRAIN_REGISTRY_PATH) {
  try {
    const raw = readFileSync(resolve(path), "utf8");
    const registry = JSON.parse(raw);
    const validation = validateEveBrainRegistry(registry);
    if (!validation.ok) {
      return {
        ok: false,
        registry,
        reason_codes: validation.reason_codes,
        evidence: validation.evidence,
      };
    }
    return {
      ok: true,
      registry,
      reason_codes: [],
      evidence: validation.evidence,
    };
  } catch (error) {
    return {
      ok: false,
      registry: null,
      reason_codes: [EVE_BRAIN_REASONS.REGISTRY_INVALID],
      evidence: { error: String(error.message || error) },
    };
  }
}

export function validateEveBrainRegistry(registry) {
  const reasonCodes = [];
  const classes = new Set();

  if (!registry || typeof registry !== "object") return invalid(["registry-not-object"]);
  if (registry.version !== EVE_BRAIN_ROUTER_VERSION) reasonCodes.push(EVE_BRAIN_REASONS.REGISTRY_INVALID);
  if (!Array.isArray(registry.brain_classes)) reasonCodes.push(EVE_BRAIN_REASONS.REGISTRY_INVALID);
  if (!registry.routes || typeof registry.routes !== "object") reasonCodes.push(EVE_BRAIN_REASONS.REGISTRY_INVALID);

  for (const row of registry.brain_classes || []) {
    if (!row?.id || !BRAIN_CLASS_ORDER.includes(row.id)) {
      reasonCodes.push(EVE_BRAIN_REASONS.CLASS_UNKNOWN);
      continue;
    }
    classes.add(row.id);
    if (!registry.routes?.[row.id]) reasonCodes.push(EVE_BRAIN_REASONS.ROUTE_MISSING);
  }

  for (const id of Object.keys(registry.routes || {})) {
    if (!BRAIN_CLASS_ORDER.includes(id)) reasonCodes.push(EVE_BRAIN_REASONS.CLASS_UNKNOWN);
  }

  return {
    ok: reasonCodes.length === 0,
    reason_codes: [...new Set(reasonCodes)],
    evidence: {
      version: registry.version,
      brain_classes: [...classes],
      route_count: Object.keys(registry.routes || {}).length,
    },
  };
}

export function classifyEveBrainRequest({
  message = "",
  fields = {},
  explicitClass = "",
} = {}) {
  const normalized = normalizeFields(fields);
  const requested = explicitClass || normalized.brainclass || normalized.brain_class || normalized.evebrainclass;
  if (requested) {
    const value = String(requested).trim();
    if (value.toLowerCase() === "auto") {
      // Classify from content.
    } else if (BRAIN_CLASS_ORDER.includes(value)) {
      return {
        route_class: value,
        confidence: 1,
        reason: "explicit-class",
        evidence: { explicit_class: value },
      };
    } else {
      return {
        route_class: "",
        confidence: 0,
        reason: EVE_BRAIN_REASONS.CLASS_UNKNOWN,
        evidence: { explicit_class: value },
      };
    }
  }

  const contextTokens = Number(normalized.contexttokens || normalized.context_tokens || 0);
  const text = buildClassificationText(message, normalized);
  const highRiskText = stripSafetyOnlyLines(text);

  if (matchesAny(highRiskText, FOUNDER_VETO_PATTERNS)) {
    return {
      route_class: "B4-founder-veto",
      confidence: 0.96,
      reason: "founder-or-high-risk-gate",
      evidence: matchedEvidence(highRiskText, FOUNDER_VETO_PATTERNS),
    };
  }

  if (contextTokens >= 200000) {
    return {
      route_class: "B2-long-context-challenger",
      confidence: 0.9,
      reason: "large-context-token-need",
      evidence: { context_tokens: contextTokens },
    };
  }

  if (matchesAny(text, SUPERBRAIN_PATTERNS)) {
    return {
      route_class: "B3-superbrain",
      confidence: 0.88,
      reason: "founder-intent-orchestration",
      evidence: matchedEvidence(text, SUPERBRAIN_PATTERNS),
    };
  }

  if (matchesAny(text, LONG_CONTEXT_PATTERNS)) {
    return {
      route_class: "B2-long-context-challenger",
      confidence: 0.84,
      reason: "long-context-source-sweep",
      evidence: matchedEvidence(text, LONG_CONTEXT_PATTERNS),
    };
  }

  if (matchesAny(text, SCOUT_PATTERNS)) {
    return {
      route_class: "B0-intake-scout",
      confidence: 0.82,
      reason: "cheap-intake-work",
      evidence: matchedEvidence(text, SCOUT_PATTERNS),
    };
  }

  if (matchesAny(text, DAILY_PATTERNS)) {
    return {
      route_class: "B1-daily-brain",
      confidence: 0.78,
      reason: "daily-operator-work",
      evidence: matchedEvidence(text, DAILY_PATTERNS),
    };
  }

  return {
    route_class: "B1-daily-brain",
    confidence: 0.64,
    reason: "fallback-daily-brain",
    evidence: { fallback: true },
  };
}

export function routeEveBrain({
  registry,
  message = "",
  fields = {},
  explicitClass = "",
} = {}) {
  const validation = validateEveBrainRegistry(registry);
  if (!validation.ok) {
    return {
      ok: false,
      reason_codes: validation.reason_codes,
      evidence: validation.evidence,
    };
  }

  const classification = classifyEveBrainRequest({ message, fields, explicitClass });
  if (!classification.route_class) {
    return {
      ok: false,
      reason_codes: [EVE_BRAIN_REASONS.CLASS_UNKNOWN],
      classification,
    };
  }

  const route = registry.routes[classification.route_class];
  if (!route) {
    return {
      ok: false,
      reason_codes: [EVE_BRAIN_REASONS.ROUTE_MISSING],
      classification,
    };
  }

  const classMeta = (registry.brain_classes || []).find((row) => row.id === classification.route_class) || {};
  const autonomous = classMeta.autonomous !== false && route.autonomous_model_selection !== false;
  const result = {
    ok: autonomous,
    reason_codes: autonomous ? [] : [EVE_BRAIN_REASONS.AUTONOMY_BLOCKED],
    version: EVE_BRAIN_ROUTER_VERSION,
    route_class: classification.route_class,
    classification,
    route,
    class_meta: classMeta,
    route_receipt: {
      version: EVE_BRAIN_ROUTER_VERSION,
      route_class: classification.route_class,
      selected_alias: route.primary_model_alias,
      selected_model: route.candidate_models?.[0] || "none",
      fallback_alias: route.fallback_model_alias || "none",
      context_profile: route.context_profile,
      route_reason: classification.reason,
      autonomous_model_selection: autonomous,
      autonomous_decision_authority: route.autonomous_decision_authority === true,
      max_auto_cost_usd: route.max_auto_cost_usd,
      human_gate: route.human_gate,
      blocked_actions: route.blocked_actions || [],
    },
  };

  return result;
}

function invalid(notes) {
  return {
    ok: false,
    reason_codes: [EVE_BRAIN_REASONS.REGISTRY_INVALID],
    evidence: { notes },
  };
}

function normalizeFields(fields) {
  const normalized = {};
  for (const [key, value] of Object.entries(fields || {})) {
    normalized[String(key).replace(/[-_\s]/g, "").toLowerCase()] = value;
    normalized[String(key).trim().toLowerCase()] = value;
  }
  return normalized;
}

function buildClassificationText(message, fields) {
  return [
    message,
    fields.mode,
    fields.scope,
    fields.intent,
    fields.humangate,
    fields.human_gate,
    fields.risk,
    fields.context,
    fields.sourceoftruth,
    fields.source_of_truth,
  ]
    .flatMap(asList)
    .join("\n");
}

function asList(value) {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function stripSafetyOnlyLines(text = "") {
  return String(text || "")
    .split(/\r?\n/)
    .filter((line) => !isSafetyOnlyHighRiskLine(line))
    .join("\n");
}

function isSafetyOnlyHighRiskLine(line = "") {
  const text = String(line || "").trim();
  if (!text) return true;
  if (!matchesAny(text, FOUNDER_VETO_PATTERNS)) return false;
  if (/^(do not|don't|never|no|exclude|excluded|blocked|forbid|forbidden|disallow|disallowed|must not|not allowed)\b/i.test(text)) {
    return true;
  }
  if (/\b(remain|remains|still|are|is)\s+(blocked|forbidden|disallowed|out[-\s]?of[-\s]?scope)\b/i.test(text)) {
    return true;
  }
  return false;
}

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function matchedEvidence(text, patterns) {
  const hits = [];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) hits.push(match[0]);
  }
  return { matched: hits.slice(0, 5) };
}

function parseArgs(argv) {
  const args = {
    registry: process.env.EVE_BRAIN_REGISTRY || DEFAULT_EVE_BRAIN_REGISTRY_PATH,
    explicitClass: "",
    fields: {},
    message: "",
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--registry") args.registry = argv[++i] || DEFAULT_EVE_BRAIN_REGISTRY_PATH;
    else if (arg === "--class") args.explicitClass = argv[++i] || "";
    else if (arg === "--message") args.message = argv[++i] || "";
    else if (arg === "--field") {
      const raw = argv[++i] || "";
      const idx = raw.indexOf("=");
      if (idx === -1) throw new Error("--field expects key=value");
      args.fields[raw.slice(0, idx)] = raw.slice(idx + 1);
    } else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  node scripts/orchestration/eve-brain-router.mjs \\
    [--registry registries/inference/eve-hermes-brain.json] \\
    [--class B0-intake-scout|B1-daily-brain|B2-long-context-challenger|B3-superbrain|B4-founder-veto] \\
    [--message "operator request"] \\
    [--field key=value ...] \\
    [--json]

Dry-run only. Writes nothing. Returns the route receipt EVE/Hermes should keep
before selecting a model tier.
`;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`eve-brain-router: ${result.ok ? "PASS" : "BLOCKED"}`);
  if (result.route_class) console.log(`route_class: ${result.route_class}`);
  if (result.route_receipt) {
    console.log(`selected_alias: ${result.route_receipt.selected_alias}`);
    console.log(`selected_model: ${result.route_receipt.selected_model}`);
    console.log(`human_gate: ${result.route_receipt.human_gate}`);
  }
  if (result.reason_codes?.length) console.log(`reason_codes: ${result.reason_codes.join(", ")}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const loaded = loadEveBrainRegistry(args.registry);
  if (!loaded.ok) {
    const result = { ok: false, reason_codes: loaded.reason_codes, evidence: loaded.evidence };
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }

  const result = routeEveBrain({
    registry: loaded.registry,
    message: args.message,
    fields: args.fields,
    explicitClass: args.explicitClass,
  });
  printResult(result, args.json);
  process.exitCode = result.ok ? 0 : 2;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((error) => {
    console.error(`eve-brain-router failed: ${error.message}`);
    process.exitCode = 1;
  });
}
