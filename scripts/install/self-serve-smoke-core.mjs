import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runBootstrap } from "./bootstrap-core.mjs";
import { buildFirstCompanyPacket, writeFirstCompanyPacket } from "../onboarding/first-company-packet-core.mjs";
import {
  applyCompanyOsUpdate,
  planCompanyOsUpdate,
  writeUpdateReport,
} from "../update/company-os-update-core.mjs";

export const SELF_SERVE_SMOKE_VERSION = "self-serve-smoke/v0";
const EXPECTED_PACKET_TEMPLATE_OVERWRITES = new Set([
  ".company-os/company-discovery-brief.md",
]);

function compact(value) {
  return String(value ?? "").trim();
}

function resolveDate(value) {
  const text = compact(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return new Date().toISOString().slice(0, 10);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readOptional(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function resolveTarget(target) {
  if (compact(target)) return path.resolve(target);
  return fs.mkdtempSync(path.join(os.tmpdir(), "company-os-self-serve-smoke-"));
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
    version: SELF_SERVE_SMOKE_VERSION,
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

function artifactsFor(date, updateReport) {
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
  };
}

function ensureSmokeIntake({ target, intakePath }) {
  const destination = path.join(target, ".company-os", "onboarding", "company-intake.json");
  const source = compact(intakePath)
    ? path.resolve(intakePath)
    : path.join(target, ".company-os", "onboarding", "company-intake.example.json");

  if (!fs.existsSync(source)) {
    return {
      ok: false,
      status: "error",
      errors: [`Intake file not found: ${source}`],
      source,
      destination,
    };
  }

  if (!fs.existsSync(destination)) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }

  return {
    ok: true,
    status: "pass",
    source,
    destination,
    created: true,
  };
}

export function runSelfServeSmoke({
  source = process.cwd(),
  target,
  date,
  toVersion,
  intakePath,
} = {}) {
  const resolvedSource = path.resolve(source || "");
  const resolvedTarget = resolveTarget(target);
  const resolvedDate = resolveDate(date);
  const resolvedToVersion = defaultToVersion(resolvedSource, toVersion);
  const stages = [];

  const installDryRun = runBootstrap({
    source: resolvedSource,
    target: resolvedTarget,
    dryRun: true,
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

  const intake = ensureSmokeIntake({ target: resolvedTarget, intakePath });
  if (!intake.ok) {
    stages.push(stageFromResult("onboarding.packet", intake));
    return blockedResult({
      source: resolvedSource,
      target: resolvedTarget,
      date: resolvedDate,
      toVersion: resolvedToVersion,
      stages,
      failedStage: "onboarding.packet",
    });
  }

  const registryPath = path.join(resolvedSource, "registries", "domain-packs", "company-os.json");
  let packet;
  try {
    packet = buildFirstCompanyPacket(readJson(intake.destination), {
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
    allowedCollisions: [...EXPECTED_PACKET_TEMPLATE_OVERWRITES],
  });
  stages.push(stageFromResult("onboarding.packet", packetWrite, {
    files: packetWrite.files || [],
    intake_source: path.relative(resolvedTarget, intake.source),
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
      artifacts: artifactsFor(resolvedDate, updateReport),
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
      artifacts: artifactsFor(resolvedDate, updateReport),
    });
  }

  return {
    version: SELF_SERVE_SMOKE_VERSION,
    ok: true,
    status: "pass",
    source: resolvedSource,
    target: resolvedTarget,
    date: resolvedDate,
    to_version: resolvedToVersion,
    stages,
    artifacts: artifactsFor(resolvedDate, updateReport),
    next_steps: [
      "Review .company-os/company-discovery-brief.md with the founder/operator.",
      "Open .company-os/onboarding/eve-boot-packet.json before first EVE runtime start.",
      "Confirm .company-os/operations/human-gates.md and software-stack.md before any worker dispatch.",
      "Use reports/company-os-updates/<date>/ as the update evidence before /update_eve apply.",
    ],
  };
}
