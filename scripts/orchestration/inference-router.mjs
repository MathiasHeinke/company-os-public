#!/usr/bin/env node

/*
 * inference-router.mjs
 *
 * Stage 3.5 between Capability Registry and Runtime Dispatcher v1.2.
 * It decides the minimum sufficient inference layer for a locked Plane worker
 * item before a runtime is spawned.
 *
 * Hard guarantees:
 *   - dry-run only; this CLI never spawns a worker
 *   - never writes Plane, Linear, git, metrics or memory
 *   - high-risk / HG-3 surfaces fail closed as P4-high-risk
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const INFERENCE_ROUTER_VERSION = "inference-router/v0";
export const DEFAULT_INFERENCE_REGISTRY_PATH = "registries/inference/company-os.json";

export const INFERENCE_REASONS = Object.freeze({
  REGISTRY_INVALID: "inference.registry-invalid",
  TASK_CLASS_UNKNOWN: "inference.task-class-unknown",
  ROUTE_MISSING: "inference.route-missing",
  SPAWN_BLOCKED: "inference.spawn-blocked",
});

const TASK_CLASS_ORDER = Object.freeze([
  "P0-doc-small",
  "P1-code-bounded",
  "P2-code-shared",
  "P3-cross-repo",
  "P4-high-risk",
]);

const HIGH_RISK_PATTERNS = [
  /\bHG-3\b/i,
  /\b(schema|rls|service-role|auth)\b/i,
  /\bproduction[-\s]?write\b/i,
  /\bdeploy\b/i,
  /\bpublic[-\s]?publish\b/i,
  /\bmaterial[-\s]?spend|money[-\s]?movement|pricing[-\s]?change\b/i,
  /\bregulated[-\s]?claim|medical[-\s]?claim|legal[-\s]?claim\b/i,
  /\bfounder[-\s]?outreach\b/i,
];

const SHARED_RUNTIME_PATTERNS = [
  /scripts\/orchestration\/runtime-dispatcher-v1\.mjs/,
  /scripts\/orchestration\/runtime-dispatcher-v12-core\.mjs/,
  /scripts\/orchestration\/worker-ledger-validator\.mjs/,
  /scripts\/orchestration\/plane-dispatcher-v0\.mjs/,
  /scripts\/orchestration\/cao-pass\.mjs/,
  /scripts\/orchestration\/codex-controller-dryrun\.mjs/,
  /scripts\/capabilities\/capability-registry-core\.mjs/,
  /registries\/capabilities\/company-os\.json/,
  /registries\/inference\/company-os\.json/,
  /\bruntime dispatcher\b/i,
  /\bcapability registry\b/i,
  /\bcontroller\b/i,
  /\bCAO\b/,
];

const CODE_PATTERNS = [
  /\bscripts\//,
  /\bsrc\//,
  /\.(mjs|js|ts|tsx|jsx|css|html)\b/,
  /\bunit[-\s]?test\b/i,
  /\bnode --test\b/,
  /\bpnpm (test|build|lint)\b/,
  /\bnpm run (test|build|lint)\b/,
];

const DOC_PATTERNS = [
  /\bdocs\//,
  /\.md\b/,
  /\breport\b/i,
  /\bmarkdown\b/i,
  /\bdocumentation\b/i,
];

const CROSS_WORKSPACE_PATTERNS = [
  /\bcross[-\s]?(repo|workspace)\b/i,
  /\/Users\/mathiasheinke\/Developer\/ares-/,
  /\/Users\/mathiasheinke\/Developer\/[SOURCE_WORKSPACE]/,
  /\/Users\/mathiasheinke\/Developer\/Company\.OS[\s\S]*\/Users\/mathiasheinke\/Developer\//,
];

export function loadInferenceRegistry(path = DEFAULT_INFERENCE_REGISTRY_PATH) {
  try {
    const raw = readFileSync(resolve(path), "utf8");
    const registry = JSON.parse(raw);
    const validation = validateInferenceRegistry(registry);
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
      reason_codes: [INFERENCE_REASONS.REGISTRY_INVALID],
      evidence: { error: String(error.message || error) },
    };
  }
}

export function validateInferenceRegistry(registry) {
  const reasonCodes = [];
  const taskClasses = new Set();
  if (!registry || typeof registry !== "object") {
    return invalid(["registry-not-object"]);
  }
  if (registry.version !== INFERENCE_ROUTER_VERSION) {
    reasonCodes.push(INFERENCE_REASONS.REGISTRY_INVALID);
  }
  if (!Array.isArray(registry.task_classes)) {
    reasonCodes.push(INFERENCE_REASONS.REGISTRY_INVALID);
  }
  if (!registry.routes || typeof registry.routes !== "object") {
    reasonCodes.push(INFERENCE_REASONS.REGISTRY_INVALID);
  }

  for (const row of registry.task_classes || []) {
    if (!row?.id || !TASK_CLASS_ORDER.includes(row.id)) {
      reasonCodes.push(INFERENCE_REASONS.REGISTRY_INVALID);
      continue;
    }
    taskClasses.add(row.id);
    const route = registry.routes?.[row.id];
    if (!route?.runtime || typeof route.runtime !== "object") {
      reasonCodes.push(INFERENCE_REASONS.ROUTE_MISSING);
    }
  }

  for (const id of Object.keys(registry.routes || {})) {
    if (!TASK_CLASS_ORDER.includes(id)) reasonCodes.push(INFERENCE_REASONS.TASK_CLASS_UNKNOWN);
  }

  return {
    ok: reasonCodes.length === 0,
    reason_codes: [...new Set(reasonCodes)],
    evidence: {
      version: registry.version,
      task_classes: [...taskClasses],
      route_count: Object.keys(registry.routes || {}).length,
    },
  };
}

export function classifyInferenceTask({
  contractFields = {},
  workItem = {},
  explicitClass = "",
} = {}) {
  const normalized = normalizeContractFields(contractFields);
  const requested = explicitClass || normalized.inferenceclass || normalized.inference_class;
  if (requested) {
    const value = String(requested).trim();
    if (value.toLowerCase() === "auto") {
      // Template-level `InferenceClass: auto` means "classify from the
      // contract", not an explicit class override.
    } else if (TASK_CLASS_ORDER.includes(value)) {
      return {
        task_class: value,
        confidence: 1,
        reason: "explicit-class",
        evidence: { explicit_class: value },
      };
    } else {
      return {
        task_class: "",
        confidence: 0,
        reason: INFERENCE_REASONS.TASK_CLASS_UNKNOWN,
        evidence: { explicit_class: value },
      };
    }
  }

  const text = buildClassificationText(normalized, workItem);
  const highRiskText = normalizeHighRiskText(text);
  if (matchesAny(highRiskText, HIGH_RISK_PATTERNS)) {
    return {
      task_class: "P4-high-risk",
      confidence: 0.95,
      reason: "high-risk-surface",
      evidence: matchedEvidence(highRiskText, HIGH_RISK_PATTERNS),
    };
  }
  if (matchesAny(text, CROSS_WORKSPACE_PATTERNS)) {
    return {
      task_class: "P3-cross-repo",
      confidence: 0.82,
      reason: "cross-workspace-context",
      evidence: matchedEvidence(text, CROSS_WORKSPACE_PATTERNS),
    };
  }
  if (matchesAny(text, SHARED_RUNTIME_PATTERNS)) {
    return {
      task_class: "P2-code-shared",
      confidence: 0.88,
      reason: "shared-runtime-surface",
      evidence: matchedEvidence(text, SHARED_RUNTIME_PATTERNS),
    };
  }
  if (matchesAny(text, CODE_PATTERNS)) {
    return {
      task_class: "P1-code-bounded",
      confidence: 0.82,
      reason: "bounded-code-surface",
      evidence: matchedEvidence(text, CODE_PATTERNS),
    };
  }
  if (matchesAny(text, DOC_PATTERNS)) {
    return {
      task_class: "P0-doc-small",
      confidence: 0.78,
      reason: "docs-only-surface",
      evidence: matchedEvidence(text, DOC_PATTERNS),
    };
  }

  return {
    task_class: "P1-code-bounded",
    confidence: 0.64,
    reason: "fallback-class",
    evidence: { fallback: true },
  };
}

export function routeInference({
  registry,
  contractFields = {},
  workItem = {},
  explicitClass = "",
} = {}) {
  const validation = validateInferenceRegistry(registry);
  if (!validation.ok) {
    return {
      ok: false,
      reason_codes: validation.reason_codes,
      evidence: validation.evidence,
    };
  }

  const classification = classifyInferenceTask({ contractFields, workItem, explicitClass });
  if (!classification.task_class) {
    return {
      ok: false,
      reason_codes: [INFERENCE_REASONS.TASK_CLASS_UNKNOWN],
      classification,
    };
  }

  const route = registry.routes[classification.task_class];
  if (!route) {
    return {
      ok: false,
      reason_codes: [INFERENCE_REASONS.ROUTE_MISSING],
      classification,
    };
  }

  const classMeta = (registry.task_classes || []).find((row) => row.id === classification.task_class) || {};
  const spawnAllowed = classMeta.spawn_allowed !== false;
  return {
    ok: spawnAllowed,
    reason_codes: spawnAllowed ? [] : [INFERENCE_REASONS.SPAWN_BLOCKED],
    version: INFERENCE_ROUTER_VERSION,
    task_class: classification.task_class,
    classification,
    runtime: route.runtime,
    context_profile: route.context_profile,
    split_policy: route.split_policy,
    controller: route.controller,
    spawn_allowed: spawnAllowed,
    class_meta: classMeta,
  };
}

function invalid(notes) {
  return {
    ok: false,
    reason_codes: [INFERENCE_REASONS.REGISTRY_INVALID],
    evidence: { notes },
  };
}

function normalizeContractFields(fields) {
  const normalized = {};
  for (const [key, value] of Object.entries(fields || {})) {
    normalized[String(key).replace(/[-_\s]/g, "").toLowerCase()] = value;
    normalized[String(key).trim().toLowerCase()] = value;
  }
  return normalized;
}

function asList(value) {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildClassificationText(fields, workItem) {
  return [
    workItem?.name,
    workItem?.sequence_id ? `COMPA-${workItem.sequence_id}` : "",
    fields.agent,
    fields.mode,
    fields.workspace,
    fields.role,
    fields.rolelabel,
    fields.humangate,
    fields.human_gate,
    fields.capabilityprofile,
    fields.scope,
    fields.allowedwritepaths,
    fields.allowed_write_paths,
    fields.sourceoftruth,
    fields.source_of_truth,
    fields.gates,
    fields.acceptancecriteria,
    fields.acceptance_criteria,
  ]
    .flatMap(asList)
    .join("\n");
}

function stripSafetyOnlyLines(text = "") {
  return String(text || "")
    .split(/\r?\n/)
    .filter((line) => !isSafetyOnlyHighRiskLine(line))
    .join("\n");
}

function normalizeHighRiskText(text = "") {
  return stripSafetyOnlyLines(text)
    .replace(/\s--auth(?:=|\s+)\S+/gi, " ")
    .replace(/\s--auth-mode(?:=|\s+)\S+/gi, " ");
}

function isSafetyOnlyHighRiskLine(line = "") {
  const text = String(line || "").trim();
  if (!text) return true;
  if (!matchesAny(text, HIGH_RISK_PATTERNS)) return false;
  if (/^(do not|don't|never|no|exclude|excluded|blocked|forbid|forbidden|disallow|disallowed|must not|not allowed)\b/i.test(text)) {
    return true;
  }
  if (/\b(remain|remains|still|are|is)\s+(blocked|forbidden|disallowed|out[-\s]?of[-\s]?scope)\b/i.test(text)) {
    return true;
  }
  if (/\b(blocked actions?|forbidden actions?|guardrail|prohibited)\b/i.test(text)) {
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
    registry: process.env.COMPANY_OS_INFERENCE_REGISTRY || DEFAULT_INFERENCE_REGISTRY_PATH,
    explicitClass: "",
    fields: {},
    name: "",
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--registry") args.registry = argv[++i] || DEFAULT_INFERENCE_REGISTRY_PATH;
    else if (arg === "--class") args.explicitClass = argv[++i] || "";
    else if (arg === "--name") args.name = argv[++i] || "";
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
  node scripts/orchestration/inference-router.mjs \\
    [--registry registries/inference/company-os.json] \\
    [--class P0-doc-small|P1-code-bounded|P2-code-shared|P3-cross-repo|P4-high-risk] \\
    [--name "Work item title"] \\
    [--field key=value ...] \\
    [--json]

Dry-run only. Writes nothing. Returns the route Runtime Dispatcher v1.2 should
use for model, max turns, context profile, split policy and controller gates.
`;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`inference-router: ${result.ok ? "PASS" : "BLOCKED"}`);
  if (result.task_class) console.log(`task_class: ${result.task_class}`);
  if (result.runtime) {
    console.log(`runtime: ${result.runtime.agent}`);
    console.log(`model: ${result.runtime.model}`);
    console.log(`max_turns: ${result.runtime.max_turns}`);
  }
  if (result.reason_codes?.length) console.log(`reason_codes: ${result.reason_codes.join(", ")}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const loaded = loadInferenceRegistry(args.registry);
  if (!loaded.ok) {
    const result = { ok: false, reason_codes: loaded.reason_codes, evidence: loaded.evidence };
    printResult(result, args.json);
    process.exitCode = 2;
    return;
  }
  const result = routeInference({
    registry: loaded.registry,
    contractFields: args.fields,
    workItem: { name: args.name },
    explicitClass: args.explicitClass,
  });
  printResult(result, args.json);
  process.exitCode = result.ok ? 0 : 2;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((error) => {
    console.error(`inference-router failed: ${error.message}`);
    process.exitCode = 1;
  });
}
