import fs from "node:fs";
import path from "node:path";

import { runBootstrap } from "./bootstrap-core.mjs";
import {
  buildPublicRcIntake,
  runPublicRcInstall,
} from "./public-rc-core.mjs";
import {
  buildInstallerPlan,
  runCommandEveInstall,
  writeCommandEveInstallReport,
} from "../operator-shell/command-eve-installer-core.mjs";

export const COMMAND_EVE_SELF_INSTALL_VERSION = "command-eve-self-install/v0";

function compact(value) {
  return String(value ?? "").trim();
}

function resolveDate(value) {
  const text = compact(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return new Date().toISOString().slice(0, 10);
}

function readOptional(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveSelfInstallPaths(options = {}) {
  const source = path.resolve(options.source || options.companyOsRoot || process.cwd());
  const rawTarget = compact(options.target || options.clientRoot);
  const target = rawTarget ? path.resolve(rawTarget) : "";
  return { source, target };
}

function inputFromOptions(options = {}) {
  if (compact(options.inputPath)) return readJson(path.resolve(options.inputPath));
  return buildPublicRcIntake(options.seed || {});
}

function validateInput(input = {}) {
  const errors = [];
  const company = input.company || {};
  if (!compact(company.name)) errors.push("company.name is required");
  if (!compact(company.website || company.domain)) errors.push("company.website or company.domain is required");
  if (!compact(company.primary_offer || input.primary_offer)) errors.push("company.primary_offer is required");
  if (!compact(input.buyer)) errors.push("buyer is required");
  if (!compact(input.approval_owner || company.human_gate_owner || company.founder_ceo)) {
    errors.push("approval_owner is required");
  }
  if (!compact(input.first_department || input.first_pack || input.first_wedge)) {
    errors.push("first_department is required");
  }
  return {
    id: "input.validate",
    ok: errors.length === 0,
    status: errors.length === 0 ? "pass" : "error",
    errors,
  };
}

function nearestExistingPath(target) {
  let current = path.resolve(target || ".");
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return current;
    current = parent;
  }
  return current;
}

function checkWritablePath(target) {
  if (!compact(target)) {
    return {
      id: "target.writable",
      ok: false,
      status: "error",
      target,
      errors: ["target is required"],
    };
  }
  const resolvedTarget = path.resolve(target);
  const existingCheckPath = fs.existsSync(resolvedTarget)
    ? resolvedTarget
    : nearestExistingPath(path.dirname(resolvedTarget));
  try {
    fs.accessSync(existingCheckPath, fs.constants.W_OK);
    return {
      id: "target.writable",
      ok: true,
      status: "pass",
      target: resolvedTarget,
      checked_path: existingCheckPath,
      target_exists: fs.existsSync(resolvedTarget),
    };
  } catch (error) {
    return {
      id: "target.writable",
      ok: false,
      status: "blocked",
      target: resolvedTarget,
      checked_path: existingCheckPath,
      errors: [error.message || String(error)],
    };
  }
}

function checkSource(source) {
  const resolvedSource = path.resolve(source || "");
  const manifestPath = path.join(resolvedSource, "registries", "operator-shell", "command-eve-1.0-alpha.json");
  const version = compact(readOptional(path.join(resolvedSource, "VERSION"))) || "unknown";
  const errors = [];
  if (!fs.existsSync(resolvedSource)) errors.push(`source not found: ${resolvedSource}`);
  if (!fs.existsSync(path.join(resolvedSource, "kits", "company-os-kit"))) {
    errors.push("kits/company-os-kit is required");
  }
  if (!fs.existsSync(manifestPath)) {
    errors.push("registries/operator-shell/command-eve-1.0-alpha.json is required");
  }
  let manifest = null;
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = readJson(manifestPath);
    } catch (error) {
      errors.push(`operator manifest is not valid JSON: ${error.message || String(error)}`);
    }
  }
  return {
    id: "source.check",
    ok: errors.length === 0,
    status: errors.length === 0 ? "pass" : "error",
    source: resolvedSource,
    source_version: version,
    operator_manifest: manifestPath,
    release: manifest?.release || "",
    components: manifest
      ? {
        aionui: manifest.components?.aionui?.tag || "",
        aioncore: manifest.components?.aioncore?.version || "",
        hermes: manifest.components?.hermes?.version || "",
        inference: `${manifest.default_inference?.provider || ""}/${manifest.default_inference?.model || ""}`,
      }
      : {},
    blocked_actions: manifest?.blocked_actions || [],
    errors,
  };
}

function inspectExistingInstallState(target) {
  const root = path.resolve(target || "");
  const files = {
    install_record: ".company-os/install-record.md",
    company_intake: ".company-os/onboarding/company-intake.json",
    eve_boot_packet: ".company-os/onboarding/eve-boot-packet.json",
    operator_shell: ".company-os/operator-shell",
    start_eve: ".company-os/bin/start_eve",
    update_eve: ".company-os/bin/update_eve",
  };
  const present = Object.fromEntries(
    Object.entries(files).map(([key, relativePath]) => [key, fs.existsSync(path.join(root, relativePath))]),
  );
  return {
    id: "target.existing_install_state",
    ok: true,
    status: Object.values(present).some(Boolean) ? "found-existing-state" : "clean",
    target: root,
    present,
  };
}

function stage(id, result, extra = {}) {
  return {
    id,
    ok: Boolean(result?.ok),
    status: result?.status || "error",
    errors: result?.errors || (result?.error ? [result.error] : []),
    failed_stage: result?.failed_stage || "",
    ...extra,
  };
}

function operatorOptions(options, paths) {
  return {
    companyOsRoot: paths.source,
    clientRoot: paths.target,
    operatorRoot: options.operatorRoot || undefined,
    installMode: options.installMode || undefined,
    provider: options.provider || undefined,
    model: options.model || undefined,
    port: options.port || 25809,
    date: options.date,
    dryRun: options.dryRun,
    force: options.force === true,
    skipAionuiDependencies: options.skipAionuiDependencies === true,
    skipAionuiBuild: options.skipAionuiBuild === true,
    aionCoreArchivePath:
      options.aionCoreArchivePath ||
      process.env.COMMAND_EVE_AIONCORE_ARCHIVE ||
      undefined,
    platform: options.platform,
    arch: options.arch,
  };
}

function nextActionsFor(result) {
  if (result.ok) {
    const fallbackUpdate = result.target ? path.join(result.target, ".company-os", "bin", "update_eve") : "";
    return [
      `Start EVE: ${result.operator_commands?.start_eve || path.join(result.target, ".company-os", "bin", "start_eve")}`,
      `Open local UI: http://127.0.0.1:${Number(result.port || 25809)}`,
      `Check updates: ${result.operator_commands?.update_eve_check || `${fallbackUpdate} check`}`,
      "Let EVE confirm the company seed before writing durable memory or dispatching workers.",
    ];
  }
  const missing = result.operator_shell?.missing_prerequisites || result.operator_plan?.missing_prerequisites || [];
  if (missing.length) return [`Install missing prerequisite(s): ${missing.join(", ")}`, "Re-run the dry-run command."];
  return ["Fix the failed stage, then re-run the dry-run command before install."];
}

export function buildCommandEveSelfInstallPlan(options = {}) {
  const paths = resolveSelfInstallPaths(options);
  const date = resolveDate(options.date);
  let input;
  let inputValidation;
  try {
    input = inputFromOptions(options);
    inputValidation = validateInput(input);
  } catch (error) {
    inputValidation = {
      id: "input.validate",
      ok: false,
      status: "error",
      errors: [error.message || String(error)],
    };
  }

  const sourceCheck = checkSource(paths.source);
  const targetCheck = checkWritablePath(paths.target);
  const existingInstallState = inspectExistingInstallState(paths.target);
  const stages = [inputValidation, sourceCheck, targetCheck, existingInstallState];

  let publicRcDryRun = null;
  if (sourceCheck.ok && targetCheck.ok) {
    publicRcDryRun = runBootstrap({
      source: paths.source,
      target: paths.target,
      dryRun: true,
      force: options.force === true,
    });
  } else {
    publicRcDryRun = {
      ok: false,
      status: "skipped",
      errors: ["source.check and target.writable must pass before public RC dry-run"],
    };
  }
  stages.push(stage("public_rc.bootstrap_dry_run", publicRcDryRun, {
    files_to_copy: publicRcDryRun?.files_to_copy?.length || 0,
    generated_files: publicRcDryRun?.generated_files?.length || 0,
    collisions: publicRcDryRun?.collisions || [],
  }));

  let operatorPlan = null;
  if (sourceCheck.ok && targetCheck.ok) {
    try {
      operatorPlan = buildInstallerPlan(operatorOptions({ ...options, dryRun: true, date }, paths));
    } catch (error) {
      operatorPlan = {
        ok: false,
        status: "error",
        errors: [error.message || String(error)],
      };
    }
  } else {
    operatorPlan = {
      ok: false,
      status: "skipped",
      errors: ["source.check and target.writable must pass before operator-shell plan"],
    };
  }
  stages.push(stage("operator_shell.plan", operatorPlan, {
    missing_prerequisites: operatorPlan?.missing_prerequisites || [],
    release: operatorPlan?.release || sourceCheck.release || "",
  }));

  const ok = stages
    .filter((item) => item.id !== "target.existing_install_state")
    .every((item) => item.ok);
  const result = {
    version: COMMAND_EVE_SELF_INSTALL_VERSION,
    ok,
    status: ok ? "ready" : "blocked",
    dry_run: true,
    source: paths.source,
    target: paths.target,
    date,
    source_version: sourceCheck.source_version,
    release: operatorPlan?.release || sourceCheck.release || "",
    port: Number(options.port || 25809),
    seed_preview: {
      company: input?.company?.name || "",
      website: input?.company?.website || input?.company?.domain || "",
      offer: input?.company?.primary_offer || "",
      buyer: input?.buyer || "",
      first_department: input?.first_department || "",
      approval_owner: input?.approval_owner || input?.company?.human_gate_owner || "",
    },
    checks: {
      input: inputValidation,
      source: sourceCheck,
      target: targetCheck,
      existing_install_state: existingInstallState,
    },
    public_rc_dry_run: publicRcDryRun,
    operator_plan: operatorPlan,
    operator_commands: operatorPlan?.operator_commands || {},
    prerequisite_instructions: operatorPlan?.prerequisite_instructions || [],
    stages,
    blocked_actions: sourceCheck.blocked_actions || [],
  };
  return {
    ...result,
    next_steps: nextActionsFor(result),
  };
}

export function runCommandEveSelfInstall(options = {}) {
  const paths = resolveSelfInstallPaths(options);
  const date = resolveDate(options.date);
  const plan = buildCommandEveSelfInstallPlan({ ...options, date });
  if (options.dryRun === true) {
    const dryRunResult = {
      ...plan,
      status: plan.ok ? "dry-run" : "blocked",
      dry_run: true,
    };
    return {
      ...dryRunResult,
      next_steps: nextActionsFor(dryRunResult),
    };
  }
  if (!plan.ok) {
    return {
      ...plan,
      dry_run: false,
      failed_stage: plan.stages.find((item) => !item.ok && item.id !== "target.existing_install_state")?.id || "",
      next_steps: nextActionsFor(plan),
    };
  }

  const publicRc = runPublicRcInstall({
    source: paths.source,
    target: paths.target,
    date,
    toVersion: options.toVersion,
    inputPath: options.inputPath,
    seed: options.seed || {},
    force: options.force === true,
  });
  const stages = [
    stage("self_install.preflight", plan),
    stage("public_rc.install", publicRc, {
      artifacts: publicRc.artifacts || {},
    }),
  ];
  if (!publicRc.ok) {
    const blocked = {
      ...plan,
      ok: false,
      status: "blocked",
      dry_run: false,
      failed_stage: "public_rc.install",
      public_rc: publicRc,
      stages,
      next_steps: ["Fix the public-RC install failure before installing AionUI/Hermes sidecars."],
    };
    return maybeWriteSelfInstallReport(blocked, { ...options, date });
  }

  const operatorShell = runCommandEveInstall(operatorOptions({
    ...options,
    dryRun: false,
    date,
  }, paths));
  let operatorReport = null;
  if (operatorShell.paths) {
    operatorReport = writeCommandEveInstallReport({ result: operatorShell, date });
  }
  stages.push(stage("operator_shell.install", operatorShell, {
    failed_stage: operatorShell.failed_stage || "",
    report: operatorReport,
  }));

  const result = {
    version: COMMAND_EVE_SELF_INSTALL_VERSION,
    ok: publicRc.ok && operatorShell.ok,
    status: publicRc.ok && operatorShell.ok ? "pass" : "blocked",
    dry_run: false,
    source: paths.source,
    target: paths.target,
    date,
    source_version: plan.source_version,
    release: operatorShell.release || plan.release,
    port: Number(options.port || 25809),
    seed_preview: plan.seed_preview,
    checks: plan.checks,
    public_rc: publicRc,
    operator_shell: operatorShell,
    stages,
    reports: {
      public_rc_handoff: publicRc.artifacts?.handoff_report || "",
      public_rc_json: publicRc.artifacts?.handoff_report_json || "",
      operator_shell_markdown: operatorReport?.markdown || "",
      operator_shell_json: operatorReport?.json || "",
    },
    operator_commands: operatorShell.operator_commands || plan.operator_commands,
    blocked_actions: plan.blocked_actions,
  };
  return maybeWriteSelfInstallReport({
    ...result,
    next_steps: nextActionsFor(result),
  }, { ...options, date });
}

function maybeWriteSelfInstallReport(result, options = {}) {
  if (options.writeReport === false || result.dry_run === true || !result.target) return result;
  return {
    ...result,
    report: writeCommandEveSelfInstallReport({ result, date: options.date }),
  };
}

export function renderCommandEveSelfInstallReport(result = {}) {
  const stageLines = (result.stages || []).map((item) =>
    `- ${item.id}: ${item.status}${item.ok ? "" : " (failed)"}`,
  );
  const reportLines = Object.entries(result.reports || {})
    .filter(([, value]) => value)
    .map(([key, value]) => `- ${key}: ${value}`);
  const nextStepLines = (result.next_steps || []).map((step) => `- ${step}`);
  return [
    `# Command EVE Self-Install - ${result.release || result.source_version || "unknown"}`,
    "",
    `Status: ${result.status || "unknown"}`,
    `Version: ${COMMAND_EVE_SELF_INSTALL_VERSION}`,
    `Date: ${result.date || ""}`,
    "",
    "## Source And Target",
    "",
    `- Source: ${result.source || ""}`,
    `- Source version: ${result.source_version || ""}`,
    `- Target: ${result.target || ""}`,
    "",
    "## Components",
    "",
    `- AionUI: ${result.operator_shell?.manifest?.aionui?.tag || result.operator_plan?.manifest?.aionui?.tag || ""}`,
    `- AionCore: ${result.operator_shell?.manifest?.aioncore?.version || result.operator_plan?.manifest?.aioncore?.version || ""}`,
    `- Hermes Agent: ${result.operator_shell?.manifest?.hermes?.version || result.operator_plan?.manifest?.hermes?.version || ""}`,
    `- Inference default: ${result.operator_shell?.manifest?.inference?.provider || result.operator_plan?.manifest?.inference?.provider || ""} / ${result.operator_shell?.manifest?.inference?.model || result.operator_plan?.manifest?.inference?.model || ""}`,
    "",
    "## Company Seed",
    "",
    `- Company: ${result.seed_preview?.company || ""}`,
    `- Website: ${result.seed_preview?.website || ""}`,
    `- Offer: ${result.seed_preview?.offer || ""}`,
    `- Buyer: ${result.seed_preview?.buyer || ""}`,
    `- First department: ${result.seed_preview?.first_department || ""}`,
    `- Approval owner: ${result.seed_preview?.approval_owner || ""}`,
    "",
    "## Stages",
    "",
    ...stageLines,
    "",
    "## Reports",
    "",
    ...(reportLines.length ? reportLines : ["- none"]),
    "",
    "## Commands",
    "",
    `- Start EVE: ${result.operator_commands?.start_eve || ""}`,
    `- Check update: ${result.operator_commands?.update_eve_check || ""}`,
    `- Apply update: ${result.operator_commands?.update_eve_apply || ""}`,
    "",
    "## Next Steps",
    "",
    ...(nextStepLines.length ? nextStepLines : ["- none"]),
    "",
    "## Boundaries",
    "",
    "- no raw API keys in chat",
    "- no provider account creation inside the installer",
    "- no hosted tenant provisioning",
    "- no publish/send/spend/deploy",
    "- no Plane Done",
    "",
  ].join("\n");
}

export function writeCommandEveSelfInstallReport({ result, date = new Date().toISOString().slice(0, 10) } = {}) {
  const root = result.target || process.cwd();
  const reportDir = path.join(root, "reports", "command-eve-self-install", resolveDate(date));
  const safeRelease = compact(result.release || result.source_version || "unknown").replace(/[^a-zA-Z0-9._-]/g, "-");
  const markdown = path.join(reportDir, `command-eve-self-install-${safeRelease}.md`);
  const json = path.join(reportDir, `command-eve-self-install-${safeRelease}.json`);
  const report = { markdown, json };
  const resultWithReport = { ...result, report };
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(markdown, `${renderCommandEveSelfInstallReport(resultWithReport)}\n`);
  fs.writeFileSync(json, `${JSON.stringify(resultWithReport, null, 2)}\n`);
  return report;
}
