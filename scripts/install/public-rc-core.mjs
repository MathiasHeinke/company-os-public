import fs from "node:fs";
import path from "node:path";

import { runBootstrap } from "./bootstrap-core.mjs";
import {
  buildFirstCompanyPacket,
  writeFirstCompanyPacket,
} from "../onboarding/first-company-packet-core.mjs";
import {
  applyCompanyOsUpdate,
  planCompanyOsUpdate,
  writeUpdateReport,
} from "../update/company-os-update-core.mjs";

export const PUBLIC_RC_INSTALL_VERSION = "company-os-public-rc/v0";
const EXPECTED_PACKET_TEMPLATE_OVERWRITES = new Set([
  ".company-os/company-discovery-brief.md",
]);

function compact(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value.map(compact).filter(Boolean) : [compact(value)].filter(Boolean);
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

function readOptionalJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function defaultToVersion(source, toVersion) {
  return compact(toVersion) || compact(readOptional(path.join(source, "VERSION"))) || "unknown";
}

function stageFromResult(id, result, extra = {}) {
  return {
    id,
    ok: Boolean(result?.ok),
    status: result?.status || "error",
    error: result?.error,
    errors: result?.errors,
    collisions: result?.collisions || [],
    ...extra,
  };
}

function blockedResult({ source, target, date, toVersion, stages, failedStage, artifacts = {}, nextSteps = [] }) {
  const failed = stages.find((stage) => stage.id === failedStage) || {};
  return {
    version: PUBLIC_RC_INSTALL_VERSION,
    ok: false,
    status: failed.status === "blocked" ? "blocked" : "error",
    failed_stage: failedStage,
    source,
    target,
    date,
    to_version: toVersion,
    stages,
    artifacts,
    next_steps: nextSteps,
  };
}

function sourceProvenance(source, toVersion) {
  const mirrorProvenancePath = path.join(source, "mirror-provenance.json");
  const mirrorProvenance = readOptionalJson(mirrorProvenancePath);
  return {
    distribution_channel: mirrorProvenance ? "public-mirror-artifact" : "public-clone-or-local-source",
    source_path: source,
    source_version: compact(readOptional(path.join(source, "VERSION"))) || "unknown",
    target_version: toVersion,
    mirror_provenance_present: Boolean(mirrorProvenance),
    mirror_provenance_path: mirrorProvenance ? "mirror-provenance.json" : "",
    mirror_source_sha: compact(mirrorProvenance?.source_sha || mirrorProvenance?.source_commit || ""),
    mirror_strip_list_version: compact(mirrorProvenance?.strip_list_version || ""),
  };
}

export function buildPublicRcIntake(seed = {}) {
  const companyName = compact(seed.companyName || seed.company || seed.company_name);
  const website = compact(seed.website || seed.domain || seed.company_website);
  const primaryOffer = compact(seed.primaryOffer || seed.offer || seed.primary_offer);
  const founder = compact(seed.founderName || seed.founder || seed.founder_ceo || seed.userName || seed.user_name);
  const approvalOwner = compact(seed.approvalOwner || seed.approval_owner || founder);
  return {
    user_name: compact(seed.userName || seed.user_name || founder),
    company: {
      name: companyName,
      website,
      domain: compact(seed.domain || website),
      industry: compact(seed.industry),
      stage: compact(seed.stage || "first-run"),
      primary_offer: primaryOffer,
      revenue_model: compact(seed.revenueModel || seed.revenue_model),
      founder_ceo: founder,
      human_gate_owner: approvalOwner,
    },
    buyer: compact(seed.buyer),
    why_now: compact(seed.whyNow || seed.why_now),
    sales_motion: compact(seed.salesMotion || seed.sales_motion),
    first_department: compact(seed.firstDepartment || seed.first_department || seed.firstPack || seed.first_pack || "marketing"),
    approval_owner: approvalOwner,
    data_sensitivity: compact(seed.dataSensitivity || seed.data_sensitivity || "internal"),
    blocked_actions: asArray(seed.blockedActions || seed.blocked_actions),
    existing_systems: {
      discovery_status: compact(seed.existingDiscoveryStatus || seed.existing_discovery_status || "pending"),
      active_ledger: compact(seed.executionLedger || seed.execution_ledger || "Plane"),
      execution_ledgers: asArray(seed.executionLedgers || seed.execution_ledgers || seed.executionLedger || seed.execution_ledger || "Plane"),
      task_sources_to_review: asArray(seed.taskSources || seed.task_sources || seed.task_sources_to_review),
      roles_and_people_sources: asArray(seed.rolesAndPeopleSources || seed.roles_and_people_sources),
      connected_tools: asArray(seed.connectedTools || seed.connected_tools),
      already_available: asArray(seed.alreadyAvailable || seed.already_available),
      missing_or_blocked: asArray(seed.missingTools || seed.missing_tools || seed.missing_or_blocked),
    },
    eve_onboarding: {
      setup_mode: compact(seed.eveSetupMode || seed.eve_setup_mode || "guided-public-rc"),
      accounts_to_connect: asArray(seed.accountsToConnect || seed.accounts_to_connect),
      permissions_needed: asArray(seed.permissionsNeeded || seed.permissions_needed),
      tools_to_install: asArray(seed.toolsToInstall || seed.tools_to_install),
      first_goals: asArray(seed.firstGoals || seed.first_goals),
      allowed_memory_sources: asArray(seed.allowedMemorySources || seed.allowed_memory_sources || [".company-os/company-discovery-brief.md"]),
      forbidden_memory_sources: asArray(seed.forbiddenMemorySources || seed.forbidden_memory_sources || [".env", ".env.local"]),
      decision_style: compact(seed.founderDecisionStyle || seed.founder_decision_style),
      communication_notes: compact(seed.founderCommunicationNotes || seed.founder_communication_notes),
      preferences: asArray(seed.founderPreferences || seed.founder_preferences),
    },
    initial_report_context: compact(seed.initialReportContext || seed.initial_report_context),
  };
}

function validateSeedOrInput(input = {}) {
  const errors = [];
  const company = input.company || {};
  if (!compact(company.name)) errors.push("company.name is required");
  if (!compact(company.website || company.domain)) errors.push("company.website or company.domain is required");
  if (!compact(company.primary_offer || input.primary_offer)) errors.push("company.primary_offer is required");
  if (!compact(input.buyer)) errors.push("buyer is required");
  if (!compact(input.approval_owner || company.human_gate_owner || company.founder_ceo)) errors.push("approval_owner is required");
  if (!compact(input.first_department || input.first_pack || input.first_wedge)) errors.push("first_department is required");
  return {
    ok: errors.length === 0,
    status: errors.length === 0 ? "pass" : "error",
    errors,
  };
}

function writeCompanyIntake({ target, input, force = false } = {}) {
  const destination = path.join(target, ".company-os", "onboarding", "company-intake.json");
  if (fs.existsSync(destination) && !force) {
    return {
      ok: false,
      status: "blocked",
      collisions: [".company-os/onboarding/company-intake.json"],
      errors: ["company-intake.json already exists. Re-run with --force after reviewing local state."],
      destination,
    };
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(input, null, 2)}\n`);
  return {
    ok: true,
    status: "pass",
    destination,
    path: ".company-os/onboarding/company-intake.json",
  };
}

function artifactsFor(date, updateReport, handoffReport) {
  return {
    install_record: ".company-os/install-record.md",
    company_intake: ".company-os/onboarding/company-intake.json",
    discovery_brief: ".company-os/company-discovery-brief.md",
    intake_record: ".company-os/onboarding/intake-record.json",
    eve_boot_packet: ".company-os/onboarding/eve-boot-packet.json",
    first_plane_parent_draft: ".company-os/onboarding/first-plane-parent-draft.md",
    first_company_packet: `reports/company-discovery/${date}/first-company-packet.md`,
    update_report: updateReport?.markdown || "",
    update_report_json: updateReport?.json || "",
    handoff_report: handoffReport?.markdown || "",
    handoff_report_json: handoffReport?.json || "",
  };
}

function renderHandoffReport(result) {
  const artifactLines = Object.entries(result.artifacts || {})
    .filter(([, value]) => value)
    .map(([key, value]) => `- ${key}: ${value}`);
  const stageLines = (result.stages || []).map((stage) =>
    `- ${stage.id}: ${stage.status}${stage.ok ? "" : " (failed)"}`,
  );
  return [
    `# Company.OS Public RC Start Handoff - ${result.to_version}`,
    "",
    `Date: ${result.date}`,
    `Status: ${result.status}`,
    `Version: ${PUBLIC_RC_INSTALL_VERSION}`,
    "",
    "## Distribution Boundary",
    "",
    "This handoff is generic public-RC evidence. It is not client-specific and does not assume a private upstream.",
    "Install source must be a public clone or a sanitized public mirror artifact before private overlays update from it.",
    "",
    "## Source Provenance",
    "",
    `Distribution channel: ${result.source_provenance.distribution_channel}`,
    `Source version: ${result.source_provenance.source_version}`,
    `Target version: ${result.source_provenance.target_version}`,
    `Mirror provenance present: ${result.source_provenance.mirror_provenance_present ? "yes" : "no"}`,
    result.source_provenance.mirror_source_sha
      ? `Mirror source sha: ${result.source_provenance.mirror_source_sha}`
      : "",
    "",
    "## Stages",
    "",
    stageLines.join("\n"),
    "",
    "## Artifacts",
    "",
    artifactLines.join("\n"),
    "",
    "## EVE First Greeting Contract",
    "",
    result.first_eve_prompt,
    "",
    "## Next Steps",
    "",
    result.next_steps.map((step) => `- ${step}`).join("\n"),
    "",
  ].filter((line) => line !== "").join("\n");
}

function writeHandoffReport({ target, date, result }) {
  const reportDir = path.join(target, "reports", "company-os-public-rc", date);
  const markdownPath = path.join(reportDir, `company-os-public-rc-${result.to_version}.md`);
  const jsonPath = path.join(reportDir, `company-os-public-rc-${result.to_version}.json`);
  fs.mkdirSync(reportDir, { recursive: true });
  const markdown = renderHandoffReport(result);
  fs.writeFileSync(markdownPath, markdown);
  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  return {
    markdown: path.relative(target, markdownPath),
    json: path.relative(target, jsonPath),
  };
}

function firstEvePrompt(input) {
  const company = input.company || {};
  return [
    "Hey, ich bin EVE. Ich habe schon diese Startdaten aus deinem Account und dem ersten Intake:",
    `- Founder/Operator: ${compact(input.user_name || company.founder_ceo) || "noch offen"}`,
    `- Company: ${compact(company.name) || "noch offen"}`,
    `- Website: ${compact(company.website || company.domain) || "noch offen"}`,
    `- Offer: ${compact(company.primary_offer || input.primary_offer) || "noch offen"}`,
    `- Buyer: ${compact(input.buyer) || "noch offen"}`,
    "",
    "Bitte korrigiere zuerst, was falsch ist. Danach richte ich mich in Stufen ein: Company-Verstaendnis, Memory-Grenzen, vorhandene Tools, erster Workflow.",
  ].join("\n");
}

export function runPublicRcInstall({
  source = process.cwd(),
  target,
  date,
  toVersion,
  inputPath,
  seed = {},
  force = false,
} = {}) {
  const resolvedSource = path.resolve(source || "");
  const resolvedTarget = path.resolve(target || "");
  const resolvedDate = resolveDate(date);
  const resolvedToVersion = defaultToVersion(resolvedSource, toVersion);
  const stages = [];

  if (!compact(target)) {
    return blockedResult({
      source: resolvedSource,
      target: resolvedTarget,
      date: resolvedDate,
      toVersion: resolvedToVersion,
      stages: [{ id: "input.validate", ok: false, status: "error", errors: ["target is required"] }],
      failedStage: "input.validate",
    });
  }

  const input = compact(inputPath)
    ? readJson(path.resolve(inputPath))
    : buildPublicRcIntake(seed);
  const inputValidation = validateSeedOrInput(input);
  stages.push(stageFromResult("input.validate", inputValidation));
  if (!inputValidation.ok) {
    return blockedResult({
      source: resolvedSource,
      target: resolvedTarget,
      date: resolvedDate,
      toVersion: resolvedToVersion,
      stages,
      failedStage: "input.validate",
    });
  }

  const installDryRun = runBootstrap({
    source: resolvedSource,
    target: resolvedTarget,
    dryRun: true,
    force,
  });
  stages.push(stageFromResult("install.dry_run", installDryRun, {
    files_to_copy: installDryRun.files_to_copy?.length || 0,
    generated_files: installDryRun.generated_files?.length || 0,
  }));
  if (!installDryRun.ok) {
    return blockedResult({
      source: resolvedSource,
      target: resolvedTarget,
      date: resolvedDate,
      toVersion: resolvedToVersion,
      stages,
      failedStage: "install.dry_run",
    });
  }

  const installApply = runBootstrap({
    source: resolvedSource,
    target: resolvedTarget,
    force,
  });
  stages.push(stageFromResult("install.apply", installApply, {
    files_copied: installApply.files_copied?.length || 0,
    files_generated: installApply.files_generated?.length || 0,
  }));
  if (!installApply.ok) {
    return blockedResult({
      source: resolvedSource,
      target: resolvedTarget,
      date: resolvedDate,
      toVersion: resolvedToVersion,
      stages,
      failedStage: "install.apply",
    });
  }

  const intakeWrite = writeCompanyIntake({ target: resolvedTarget, input, force });
  stages.push(stageFromResult("intake.write", intakeWrite, {
    path: intakeWrite.path,
  }));
  if (!intakeWrite.ok) {
    return blockedResult({
      source: resolvedSource,
      target: resolvedTarget,
      date: resolvedDate,
      toVersion: resolvedToVersion,
      stages,
      failedStage: "intake.write",
    });
  }

  const registryPath = path.join(resolvedSource, "registries", "domain-packs", "company-os.json");
  let packet;
  try {
    packet = buildFirstCompanyPacket(input, {
      registry: readJson(registryPath),
      date: resolvedDate,
    });
  } catch (error) {
    const packetError = {
      ok: false,
      status: "error",
      errors: [error.message || String(error)],
    };
    stages.push(stageFromResult("onboarding.packet", packetError));
    return blockedResult({
      source: resolvedSource,
      target: resolvedTarget,
      date: resolvedDate,
      toVersion: resolvedToVersion,
      stages,
      failedStage: "onboarding.packet",
    });
  }

  if (!packet.ok) {
    const packetError = {
      ok: false,
      status: "error",
      errors: packet.errors || [],
    };
    stages.push(stageFromResult("onboarding.packet", packetError));
    return blockedResult({
      source: resolvedSource,
      target: resolvedTarget,
      date: resolvedDate,
      toVersion: resolvedToVersion,
      stages,
      failedStage: "onboarding.packet",
    });
  }

  const packetWrite = writeFirstCompanyPacket({
    target: resolvedTarget,
    packet,
    force: true,
  });
  const expectedPacketOverwrites = (packetWrite.collisions || [])
    .filter((file) => EXPECTED_PACKET_TEMPLATE_OVERWRITES.has(file));
  const unexpectedPacketCollisions = (packetWrite.collisions || [])
    .filter((file) => !EXPECTED_PACKET_TEMPLATE_OVERWRITES.has(file));
  stages.push(stageFromResult("onboarding.packet", {
    ...packetWrite,
    collisions: unexpectedPacketCollisions,
  }, {
    expected_template_overwrites: expectedPacketOverwrites,
    files: packetWrite.files || [],
  }));
  if (!packetWrite.ok) {
    return blockedResult({
      source: resolvedSource,
      target: resolvedTarget,
      date: resolvedDate,
      toVersion: resolvedToVersion,
      stages,
      failedStage: "onboarding.packet",
    });
  }

  const updatePlan = planCompanyOsUpdate({
    source: resolvedSource,
    target: resolvedTarget,
    toVersion: resolvedToVersion,
    date: resolvedDate,
  });
  let updateReport = null;
  if (updatePlan.ok) {
    updateReport = writeUpdateReport({
      target: resolvedTarget,
      plan: updatePlan,
      applied: false,
      dryRun: true,
    });
  }
  stages.push(stageFromResult("update.check", updatePlan, {
    summary: updatePlan.summary,
    report: updateReport,
  }));
  if (!updatePlan.ok) {
    return blockedResult({
      source: resolvedSource,
      target: resolvedTarget,
      date: resolvedDate,
      toVersion: resolvedToVersion,
      stages,
      failedStage: "update.check",
      artifacts: artifactsFor(resolvedDate, updateReport, null),
    });
  }

  const updateDryRun = applyCompanyOsUpdate({
    source: resolvedSource,
    target: resolvedTarget,
    toVersion: resolvedToVersion,
    date: resolvedDate,
    dryRun: true,
    writeReport: false,
  });
  stages.push(stageFromResult("update.apply_dry_run", updateDryRun, {
    summary: updateDryRun.summary,
  }));
  if (!updateDryRun.ok) {
    return blockedResult({
      source: resolvedSource,
      target: resolvedTarget,
      date: resolvedDate,
      toVersion: resolvedToVersion,
      stages,
      failedStage: "update.apply_dry_run",
      artifacts: artifactsFor(resolvedDate, updateReport, null),
    });
  }

  const preliminary = {
    version: PUBLIC_RC_INSTALL_VERSION,
    ok: true,
    status: "pass",
    source: resolvedSource,
    target: resolvedTarget,
    date: resolvedDate,
    to_version: resolvedToVersion,
    source_provenance: sourceProvenance(resolvedSource, resolvedToVersion),
    stages,
    artifacts: artifactsFor(resolvedDate, updateReport, null),
    first_eve_prompt: firstEvePrompt(input),
    next_steps: [
      "Open .company-os/onboarding/eve-boot-packet.json before first EVE runtime start.",
      "Let EVE confirm the account/company seed before saving durable memory.",
      "Confirm .company-os/operations/human-gates.md and software-stack.md before worker dispatch.",
      "Connect only the tools needed for the first department wedge.",
      "Use reports/company-os-updates/<date>/ before private overlays run /update_eve from public.",
    ],
  };
  const handoffReport = writeHandoffReport({
    target: resolvedTarget,
    date: resolvedDate,
    result: preliminary,
  });

  return {
    ...preliminary,
    artifacts: artifactsFor(resolvedDate, updateReport, handoffReport),
  };
}
