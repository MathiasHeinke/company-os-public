import fs from "node:fs";
import path from "node:path";

import {
  applyAionuiCommandEveOverlay,
  inspectAionuiCommandEveOverlay,
} from "./aionui-command-eve-overlay-core.mjs";
import {
  buildAionuiStartCommand,
  EVE_SIDECAR_VERSION,
  prepareEveSidecar,
  preflightEveSidecar,
  runHermesEveSmoke,
} from "./eve-sidecar-core.mjs";
import {
  registerStartEveSession,
} from "./eve-session-registry-core.mjs";
import {
  DEFAULT_SESSION_CONTINUITY_REGISTRY_PATH,
  routeSessionContinuity,
  loadSessionContinuityRegistry,
} from "../orchestration/session-continuity-router.mjs";

export const START_EVE_VERSION = "start-eve/v0";
export const DEFAULT_START_EVE_SESSION_CLASS = "SC2-workstream-continuity";
export const DEFAULT_START_EVE_SESSION_MESSAGE = [
  "Start Command EVE as the founder companion and Chief-of-Staff workstream.",
  "Keep long-context EVE/CEO planning continuity available for iterative company setup.",
  "Production writes, external sends, customer data and Plane Done remain blocked.",
].join(" ");

function compact(value) {
  return String(value ?? "").trim();
}

function resolveDate(value) {
  const text = compact(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return new Date().toISOString().slice(0, 10);
}

function stage(id, result = {}, extra = {}) {
  return {
    id,
    ok: Boolean(result.ok),
    status: result.status || "error",
    failures: result.failures || [],
    errors: result.errors || [],
    ...extra,
  };
}

function blocked({ stages, failedStage, failures, nextActions, overlay, prepare, preflight, sessionContinuity, sessionRegistry, smoke, startCommand }) {
  return {
    version: START_EVE_VERSION,
    sidecar_version: EVE_SIDECAR_VERSION,
    ok: false,
    status: "blocked",
    failed_stage: failedStage,
    failures,
    stages,
    overlay,
    prepare,
    preflight,
    session_continuity: sessionContinuity,
    session_registry: sessionRegistry,
    smoke,
    start_command: startCommand,
    next_actions: nextActions,
    summary: summarize({ overlay, preflight, sessionContinuity }),
  };
}

function summarize({ overlay, preflight, sessionContinuity, sessionRegistry } = {}) {
  const modelConfig = preflight?.hermes?.model_config || {};
  const runtimePolicy = preflight?.eve?.runtime_policy || {};
  const routeReceipt = sessionContinuity?.route_receipt || {};
  return {
    default_agent: overlay?.overlay_applied || overlay?.overlay_applied_after ? "EVE via Hermes" : "not verified",
    aionui_version: preflight?.aionui?.version || "",
    hermes_version: (preflight?.hermes?.version_text || "").split("\n")[0],
    hermes_model: modelConfig.model || "",
    hermes_provider: modelConfig.provider || "",
    soul_status: preflight?.hermes?.soul_location?.status || "",
    runtime_policy_profile: runtimePolicy.profile || "",
    runtime_policy_mode: runtimePolicy.default_mode || "",
    session_route_class: routeReceipt.route_class || "",
    session_policy: routeReceipt.session_policy || "",
    session_reuse_allowed: routeReceipt.reuse_allowed === true,
    session_human_gate: routeReceipt.human_gate || "",
    session_registry_status: sessionRegistry?.status || "",
    session_registry_hygiene: sessionRegistry?.hygiene?.status || "",
  };
}

function normalizeSessionClass(value) {
  const text = compact(value);
  if (!text) return DEFAULT_START_EVE_SESSION_CLASS;
  if (text.toLowerCase() === "auto") return "";
  return text;
}

export function routeStartEveSessionContinuity(options = {}) {
  const companyOsRoot = path.resolve(options.companyOsRoot || process.cwd());
  const registryPath = path.resolve(
    options.sessionRegistry || path.join(companyOsRoot, DEFAULT_SESSION_CONTINUITY_REGISTRY_PATH),
  );
  const loaded = loadSessionContinuityRegistry(registryPath);
  if (!loaded.ok) {
    return {
      ok: false,
      status: "blocked",
      registry_path: registryPath,
      reason_codes: loaded.reason_codes || [],
      evidence: loaded.evidence || {},
      route_receipt: null,
    };
  }
  const explicitClass = normalizeSessionClass(options.sessionClass);
  const message = compact(options.sessionMessage) || DEFAULT_START_EVE_SESSION_MESSAGE;
  const fields = {
    source: "start_eve",
    intent: "Command EVE operator-shell startup",
    human_gate: "HG-2.5",
    session_policy: "workstream-continuity",
    scope: "EVE companion setup continuity; production writes remain blocked; external sends remain blocked; Plane Done remains blocked",
    ...(options.sessionFields || {}),
  };
  const route = routeSessionContinuity({
    registry: loaded.registry,
    message,
    fields,
    explicitClass,
  });
  return {
    ...route,
    status: route.ok ? "pass" : "blocked",
    registry_path: registryPath,
    message,
    requested_class: explicitClass || "auto",
    fields,
  };
}

export function runStartEve(options = {}) {
  const port = Number(options.port || 25809);
  const stages = [];

  const overlayInspection = inspectAionuiCommandEveOverlay(options);
  let overlay = overlayInspection;
  if (options.applyOverlay && overlayInspection.ok && !overlayInspection.overlay_applied) {
    overlay = applyAionuiCommandEveOverlay(options);
  }
  const overlayApplied = Boolean(overlay.overlay_applied || overlay.overlay_applied_after);
  const overlayStatus = overlayApplied
    ? overlay.status
    : overlay.ok
      ? "needs_apply"
      : overlay.status;
  stages.push(stage("aionui.default_agent_overlay", overlay, {
    status: overlayStatus,
    overlay_applied: overlayApplied,
  }));
  if (!overlay.ok || !overlayApplied) {
    return blocked({
      stages,
      failedStage: "aionui.default_agent_overlay",
      failures: [
        ...overlay.failures || [],
        ...(overlayApplied ? [] : ["aionui_command_eve_overlay_not_applied"]),
      ],
      nextActions: [
        "Run scripts/operator-shell/start_eve.mjs check --apply-overlay --json after reviewing local AionUI changes.",
        "Or run scripts/operator-shell/aionui-command-eve-overlay.mjs apply explicitly.",
      ],
      overlay,
      startCommand: [],
    });
  }

  const prepare = prepareEveSidecar(options);
  stages.push(stage("eve.prepare", prepare, {
    files_written: prepare.files_written?.length || 0,
  }));
  if (!prepare.ok) {
    return blocked({
      stages,
      failedStage: "eve.prepare",
      failures: prepare.errors || ["eve_prepare_failed"],
      nextActions: ["Fix missing sidecar paths or context files, then rerun start_eve check."],
      overlay,
      prepare,
      startCommand: [],
    });
  }

  const preflight = preflightEveSidecar(options);
  const startCommand = buildAionuiStartCommand({ paths: preflight.paths, port });
  stages.push(stage("eve.preflight", preflight, {
    failures: preflight.failures || [],
  }));
  if (!preflight.ok) {
    return blocked({
      stages,
      failedStage: "eve.preflight",
      failures: preflight.failures || ["eve_preflight_failed"],
      nextActions: ["Fix the failing EVE/Hermes/AionUI preflight checks before launching AionUI."],
      overlay,
      prepare,
      preflight,
      startCommand,
    });
  }

  const sessionContinuity = routeStartEveSessionContinuity(options);
  stages.push(stage("eve.session_continuity", sessionContinuity, {
    status: sessionContinuity.ok ? "pass" : "blocked",
    route_class: sessionContinuity.route_class || "",
    session_policy: sessionContinuity.route_receipt?.session_policy || "",
    reuse_allowed: sessionContinuity.route_receipt?.reuse_allowed === true,
    human_gate: sessionContinuity.route_receipt?.human_gate || "",
    reason_codes: sessionContinuity.reason_codes || [],
  }));
  if (!sessionContinuity.ok) {
    return blocked({
      stages,
      failedStage: "eve.session_continuity",
      failures: sessionContinuity.reason_codes || ["eve_session_continuity_route_failed"],
      nextActions: [
        "Fix the session-continuity registry or choose a lower-risk session class.",
        "For normal EVE startup use --session-class SC2-workstream-continuity.",
        "For high-risk/HG-4 work start fresh and prepare a Founder decision card instead.",
      ],
      overlay,
      prepare,
      preflight,
      sessionContinuity,
      startCommand,
    });
  }

  const sessionRegistry = registerStartEveSession({
    route: sessionContinuity,
    preflight,
    paths: preflight.paths,
    registryPath: options.sessionRegistryPath,
    now: options.now || new Date(),
    dryRun: options.sessionRegistryDryRun === true,
  });
  stages.push(stage("eve.session_registry", sessionRegistry, {
    status: sessionRegistry.status || (sessionRegistry.ok ? "pass" : "blocked"),
    registry_path: sessionRegistry.registry_path || "",
    hygiene_status: sessionRegistry.hygiene?.status || "",
    generation: sessionRegistry.session?.generation || 0,
    written: sessionRegistry.written === true,
  }));
  if (!sessionRegistry.ok) {
    return blocked({
      stages,
      failedStage: "eve.session_registry",
      failures: [sessionRegistry.reason || "eve_session_registry_failed", ...(sessionRegistry.errors || [])],
      nextActions: [
        "Inspect the local EVE session registry and close or reset polluted continuity state.",
        "Run scripts/operator-shell/eve-session-registry.mjs inspect --json.",
        "If safe, close the stale/polluted workstream with eve-session-registry.mjs close --reason <reason>.",
      ],
      overlay,
      prepare,
      preflight,
      sessionContinuity,
      sessionRegistry,
      startCommand,
    });
  }

  let smoke = null;
  if (options.authCheck) {
    smoke = runHermesEveSmoke({
      ...options,
      prompt: options.prompt || "Command EVE auth/model preflight: reply with one short readiness line.",
    });
    stages.push(stage("hermes.auth_model_smoke", smoke, {
      reason: smoke.reason,
      model: smoke.model,
      provider: smoke.provider,
    }));
    if (!smoke.ok) {
      return blocked({
        stages,
        failedStage: "hermes.auth_model_smoke",
        failures: [smoke.reason || "hermes_auth_model_smoke_failed"],
        nextActions: [
          "Fix Hermes provider/model auth or pass --provider and --model explicitly.",
          "Then rerun scripts/operator-shell/start_eve.mjs check --auth-check --json.",
        ],
        overlay,
        prepare,
        preflight,
        smoke,
        startCommand,
      });
    }
  } else {
    stages.push({
      id: "hermes.auth_model_smoke",
      ok: true,
      status: "skipped",
      reason: "auth_check_not_requested",
      failures: [],
      errors: [],
    });
  }

  return {
    version: START_EVE_VERSION,
    sidecar_version: EVE_SIDECAR_VERSION,
    ok: true,
    status: "ready",
    stages,
    overlay,
    prepare,
    preflight,
    session_continuity: sessionContinuity,
    session_registry: sessionRegistry,
    smoke,
    start_command: startCommand,
    next_actions: [
      "Run the start_command to launch AionUI locally.",
      "Open the local URL and verify the first screen shows EVE with Hermes hidden behind the default agent path.",
      "Ask EVE what she already knows; she should load the boot packet before asking for broad setup data.",
    ],
    summary: summarize({ overlay, preflight, sessionContinuity, sessionRegistry }),
  };
}

export function renderStartEveReport(result = {}) {
  const stages = result.stages || [];
  return [
    "# Start EVE Preflight",
    "",
    `Version: ${START_EVE_VERSION}`,
    `Status: ${result.status || "unknown"}`,
    `Failed stage: ${result.failed_stage || "none"}`,
    "",
    "## Summary",
    "",
    `Default agent: ${result.summary?.default_agent || ""}`,
    `AionUI version: ${result.summary?.aionui_version || ""}`,
    `Hermes version: ${result.summary?.hermes_version || ""}`,
    `Hermes model: ${result.summary?.hermes_model || ""}`,
    `Hermes provider: ${result.summary?.hermes_provider || ""}`,
    `Soul status: ${result.summary?.soul_status || ""}`,
    `Runtime policy: ${result.summary?.runtime_policy_profile || ""}`,
    `Runtime policy mode: ${result.summary?.runtime_policy_mode || ""}`,
    `Session route class: ${result.summary?.session_route_class || ""}`,
    `Session policy: ${result.summary?.session_policy || ""}`,
    `Session reuse allowed: ${result.summary?.session_reuse_allowed === true}`,
    `Session HumanGate: ${result.summary?.session_human_gate || ""}`,
    `Session registry status: ${result.summary?.session_registry_status || ""}`,
    `Session registry hygiene: ${result.summary?.session_registry_hygiene || ""}`,
    "",
    "## Session Continuity",
    "",
    `Registry: ${result.session_continuity?.registry_path || ""}`,
    `Requested class: ${result.session_continuity?.requested_class || ""}`,
    `Route reason: ${result.session_continuity?.route_receipt?.route_reason || ""}`,
    `Required registry state: ${result.session_continuity?.route_receipt?.required_registry_state || ""}`,
    "Blocked actions:",
    ...((result.session_continuity?.route_receipt?.blocked_actions || []).map((row) => `- ${row}`)),
    "",
    "## Local Session Registry",
    "",
    `Registry: ${result.session_registry?.registry_path || ""}`,
    `Status: ${result.session_registry?.status || ""}`,
    `Hygiene: ${result.session_registry?.hygiene?.status || ""}`,
    `Generation: ${result.session_registry?.session?.generation || ""}`,
    `Written: ${result.session_registry?.written === true}`,
    "",
    "## Stages",
    "",
    stages.length
      ? stages.map((stageRow) => `- ${stageRow.id}: ${stageRow.status}`).join("\n")
      : "- none",
    "",
    "## Start Command",
    "",
    "```bash",
    ...(result.start_command || []),
    "```",
    "",
    "## Next Actions",
    "",
    (result.next_actions || []).map((row) => `- ${row}`).join("\n") || "- none",
    "",
    "## Blocked Actions",
    "",
    "- no Plane writes from AionUI",
    "- no Plane Done",
    "- no dispatch: ready",
    "- no worker dispatch",
    "- no deploy, publish, send, schedule or spend",
    "- no secret, cookie, browser-storage or raw private-memory ingestion",
    "",
  ].join("\n");
}

export function writeStartEveReport({ result, companyOsRoot = process.cwd(), date } = {}) {
  const root = path.resolve(companyOsRoot || process.cwd());
  const day = resolveDate(date);
  const reportDir = path.join(root, "reports", "operator-shell", day);
  const markdown = path.join(reportDir, "start-eve-preflight.md");
  const json = path.join(reportDir, "start-eve-preflight.json");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(markdown, `${renderStartEveReport(result).replace(/\n+$/, "")}\n`);
  fs.writeFileSync(json, `${JSON.stringify(result, null, 2)}\n`);
  return { markdown, json };
}
