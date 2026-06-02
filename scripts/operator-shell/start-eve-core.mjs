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

export const START_EVE_VERSION = "start-eve/v0";

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

function blocked({ stages, failedStage, failures, nextActions, overlay, prepare, preflight, smoke, startCommand }) {
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
    smoke,
    start_command: startCommand,
    next_actions: nextActions,
    summary: summarize({ overlay, preflight }),
  };
}

function summarize({ overlay, preflight } = {}) {
  const modelConfig = preflight?.hermes?.model_config || {};
  const runtimePolicy = preflight?.eve?.runtime_policy || {};
  return {
    default_agent: overlay?.overlay_applied || overlay?.overlay_applied_after ? "EVE via Hermes" : "not verified",
    aionui_version: preflight?.aionui?.version || "",
    hermes_version: (preflight?.hermes?.version_text || "").split("\n")[0],
    hermes_model: modelConfig.model || "",
    hermes_provider: modelConfig.provider || "",
    soul_status: preflight?.hermes?.soul_location?.status || "",
    runtime_policy_profile: runtimePolicy.profile || "",
    runtime_policy_mode: runtimePolicy.default_mode || "",
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
    smoke,
    start_command: startCommand,
    next_actions: [
      "Run the start_command to launch AionUI locally.",
      "Open the local URL and verify the first screen shows EVE with Hermes hidden behind the default agent path.",
      "Ask EVE what she already knows; she should load the boot packet before asking for broad setup data.",
    ],
    summary: summarize({ overlay, preflight }),
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
