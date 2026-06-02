import fs from "node:fs";
import path from "node:path";

export const ARTIFACT_TRUTH_VERSION = "artifact-truth/v1";

const PIPELINE_CONFIG = {
  editorial: {
    root: path.join("marketing", "daily-editorial"),
    finalFolder: "07-final",
    schedulerFolder: "09-upload-post",
    evalFolder: "10-eval-gate",
    requiredSourcePathFields: [
      "article_path",
      "source_table_path",
      "seo_path",
      "x_path",
      "linkedin_path",
      "reddit_path",
      "visual_brief_path",
    ],
    requiredFinalFiles: ["article-final.md", "scientific-brief.md", "visual-final.md", "seo-final.md"],
    requiresEval: true,
  },
  product: {
    root: path.join("marketing", "product-desk"),
    finalFolder: "06-final",
    schedulerFolder: "08-upload-post",
    evalFolder: null,
    requiredSourcePathFields: [
      "insight_path",
      "narrative_angles_path",
      "x_path",
      "linkedin_path",
      "reddit_path",
      "visual_brief_path",
    ],
    requiredFinalFiles: ["product-brief.md", "visual-final.md"],
    requiresEval: false,
  },
};

export function parseStageList(value = "manifest,source,final,images,eval,scheduler,provenance,freshness") {
  return new Set(
    String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export function resolveAresDate(workspaceRoot, pipeline, date) {
  if (date && date !== "latest") return date;
  const config = pipelineConfig(pipeline);
  const latestPath = path.join(workspaceRoot, config.root, "_latest.json");
  if (!fs.existsSync(latestPath)) throw new Error(`Missing latest pointer: ${latestPath}`);
  const latest = readJson(latestPath);
  if (!latest.date) throw new Error(`Latest pointer has no date: ${latestPath}`);
  return latest.date;
}

function pipelineConfig(pipeline) {
  const config = PIPELINE_CONFIG[pipeline];
  if (!config) throw new Error(`Unknown pipeline: ${pipeline}`);
  return config;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fileState(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return { exists: stats.isFile(), bytes: stats.size, mtime_ms: stats.mtimeMs, mtime_iso: stats.mtime.toISOString() };
  } catch {
    return { exists: false, bytes: 0, mtime_ms: null, mtime_iso: "" };
  }
}

function filePrefix(filePath, length = 8) {
  try {
    const handle = fs.openSync(filePath, "r");
    try {
      const buffer = Buffer.alloc(length);
      const bytesRead = fs.readSync(handle, buffer, 0, length, 0);
      return buffer.subarray(0, bytesRead);
    } finally {
      fs.closeSync(handle);
    }
  } catch {
    return Buffer.alloc(0);
  }
}

function isPng(filePath) {
  return filePrefix(filePath, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function rel(root, absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

function result(ok, id, message, absolutePath = "", details = {}) {
  return {
    id,
    status: ok ? "pass" : "block",
    message,
    path: absolutePath,
    details,
  };
}

function warning(id, message, absolutePath = "", details = {}) {
  return { id, status: "warn", message, path: absolutePath, details };
}

function localDate(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function requireNonEmptyFile(checks, workspaceRoot, relativePath, id, label) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  const state = fileState(absolutePath);
  checks.push(
    result(
      state.exists && state.bytes > 0,
      id,
      state.exists && state.bytes > 0 ? `${label} exists` : `${label} missing or empty`,
      absolutePath,
      { relative_path: relativePath, bytes: state.bytes },
    ),
  );
}

function manifestForRun(workspaceRoot, pipeline, date, checks) {
  const config = pipelineConfig(pipeline);
  const manifestPath = path.join(workspaceRoot, config.root, date, "manifest.json");
  const state = fileState(manifestPath);
  checks.push(result(state.exists && state.bytes > 0, "manifest.exists", "manifest.json exists", manifestPath, { bytes: state.bytes }));
  if (!state.exists || state.bytes === 0) return null;

  const manifest = readJson(manifestPath);
  manifest._artifact_truth_manifest_path = manifestPath;
  checks.push(result(manifest.date === date, "manifest.date", "manifest date matches requested date", manifestPath, { expected: date, actual: manifest.date }));
  const expectedRunFolder = `${config.root.split(path.sep).join("/")}/${date}`;
  checks.push(
    result(
      manifest.run_folder === expectedRunFolder,
      "manifest.run_folder",
      "manifest run_folder matches pipeline/date",
      manifestPath,
      { expected: expectedRunFolder, actual: manifest.run_folder },
    ),
  );
  checks.push(
    result(Array.isArray(manifest.items) && manifest.items.length > 0, "manifest.items", "manifest has item list", manifestPath, {
      item_count: Array.isArray(manifest.items) ? manifest.items.length : 0,
    }),
  );
  return manifest;
}

function provenanceSignalsForItem(item) {
  return [
    item.primary_source,
    item.source_confidence,
    item.source_table_path,
    item.insight_path,
    item.product_claim_audit_path,
    ...(Array.isArray(item.source_refs) ? item.source_refs : []),
  ].filter(Boolean);
}

function provenanceTextSignalsForItem(item) {
  return [
    item.primary_source,
    item.source_confidence,
    ...(Array.isArray(item.source_refs) ? item.source_refs : []),
  ].filter(Boolean);
}

function readSmallFile(filePath, maxBytes = 20_000) {
  try {
    const handle = fs.openSync(filePath, "r");
    try {
      const buffer = Buffer.alloc(maxBytes);
      const bytesRead = fs.readSync(handle, buffer, 0, maxBytes, 0);
      return buffer.subarray(0, bytesRead).toString("utf8");
    } finally {
      fs.closeSync(handle);
    }
  } catch {
    return "";
  }
}

function hasSourceTraceText(text) {
  return /\b(https?:\/\/|doi:|pmid|source|reference|scripts\/|docs\/|memory-bank\/|evidence|study|paper)\b/i.test(String(text || ""));
}

function verifyProvenance({ workspaceRoot, manifest, checks }) {
  for (const item of manifest.items ?? []) {
    const signals = provenanceSignalsForItem(item);
    checks.push(
      result(
        signals.length > 0,
        "provenance.signal",
        signals.length > 0 ? `${item.id} has provenance signal` : `${item.id} has no provenance/source signal`,
        manifest._artifact_truth_manifest_path,
        { item_id: item.id, signals },
      ),
    );

    const sourceFiles = [item.source_table_path, item.insight_path, item.product_claim_audit_path]
      .filter(Boolean)
      .map((relativePath) => path.join(workspaceRoot, relativePath));
    if (sourceFiles.length === 0) continue;

    const sourceText = sourceFiles.map((filePath) => readSmallFile(filePath)).join("\n");
    const textSignals = provenanceTextSignalsForItem(item);
    checks.push(
      result(
        hasSourceTraceText(sourceText) || textSignals.some((signal) => hasSourceTraceText(signal)),
        "provenance.trace_text",
        hasSourceTraceText(sourceText) || textSignals.some((signal) => hasSourceTraceText(signal))
          ? `${item.id} source artifacts contain traceable provenance text`
          : `${item.id} source artifacts lack traceable provenance text`,
        sourceFiles[0],
        { item_id: item.id, source_files: sourceFiles },
      ),
    );
  }
}

function verifyFreshness({
  workspaceRoot,
  pipeline,
  date,
  manifest,
  checks,
  generatedAt,
  requireToday = false,
  maxArtifactAgeHours = null,
}) {
  const today = localDate(new Date(generatedAt));
  if (requireToday) {
    checks.push(
      result(date === today, "freshness.require_today", "artifact date matches today's Europe/Berlin date", manifest._artifact_truth_manifest_path, {
        expected: today,
        actual: date,
      }),
    );
  }

  const manifestState = fileState(manifest._artifact_truth_manifest_path);
  if (Number.isFinite(maxArtifactAgeHours) && maxArtifactAgeHours > 0) {
    const generatedTime = Date.parse(generatedAt);
    const ageHours = (generatedTime - manifestState.mtime_ms) / 3_600_000;
    checks.push(
      result(
        manifestState.exists && Number.isFinite(ageHours) && ageHours >= 0 && ageHours <= maxArtifactAgeHours,
        "freshness.max_age",
        manifestState.exists && Number.isFinite(ageHours) && ageHours >= 0 && ageHours <= maxArtifactAgeHours
          ? "manifest file is within max artifact age"
          : "manifest file is stale or has invalid mtime",
        manifest._artifact_truth_manifest_path,
        {
          pipeline,
          max_artifact_age_hours: maxArtifactAgeHours,
          manifest_mtime: manifestState.mtime_iso,
          generated_at: generatedAt,
          age_hours: Number.isFinite(ageHours) ? Number(ageHours.toFixed(3)) : null,
        },
      ),
    );
  } else {
    checks.push(warning("freshness.max_age_not_enforced", "max artifact age is not enforced for this verifier run", manifest._artifact_truth_manifest_path, {
      workspace_root: workspaceRoot,
      pipeline,
    }));
  }
}

function verifySourceFiles({ workspaceRoot, pipeline, manifest, checks }) {
  const config = pipelineConfig(pipeline);
  for (const item of manifest.items ?? []) {
    for (const field of config.requiredSourcePathFields) {
      if (!item[field]) {
        checks.push(result(false, `source.${field}`, `${item.id} missing ${field}`, ""));
        continue;
      }
      requireNonEmptyFile(checks, workspaceRoot, item[field], `source.${field}`, `${item.id} ${field}`);
    }
  }
}

function publicFinalNames(manifest, pipeline) {
  const language = manifest.policy?.distribution_language ?? "en";
  const localized = language ? `.${language}` : "";
  const names = [`x-final${localized}.md`, `linkedin-final${localized}.md`];
  if (pipeline === "product") names.push("reddit-final.md");
  return names;
}

function verifyFinalFiles({ workspaceRoot, pipeline, date, manifest, checks }) {
  const config = pipelineConfig(pipeline);
  const finalRoot = path.join(config.root, date, config.finalFolder);
  for (const item of manifest.items ?? []) {
    const base = path.join(finalRoot, item.id);
    for (const fileName of [...config.requiredFinalFiles, ...publicFinalNames(manifest, pipeline)]) {
      requireNonEmptyFile(checks, workspaceRoot, path.join(base, fileName), "final.file", `${item.id}/${fileName}`);
    }
  }
}

function verifyImages({ workspaceRoot, pipeline, date, manifest, checks }) {
  const config = pipelineConfig(pipeline);
  const finalRoot = path.join(config.root, date, config.finalFolder);
  for (const item of manifest.items ?? []) {
    const base = path.join(finalRoot, item.id);
    const relativeImagePath = path.join(base, "image.png");
    const absoluteImagePath = path.join(workspaceRoot, relativeImagePath);
    requireNonEmptyFile(checks, workspaceRoot, relativeImagePath, "image.file", `${item.id}/image.png`);
    const state = fileState(absoluteImagePath);
    if (state.exists && state.bytes > 0) {
      checks.push(
        result(
          isPng(absoluteImagePath) && state.bytes > 4096,
          "image.integrity",
          `${item.id}/image.png has PNG signature and plausible size`,
          absoluteImagePath,
          { relative_path: relativeImagePath, bytes: state.bytes, min_bytes: 4096 },
        ),
      );
    }
    const errorPath = path.join(workspaceRoot, base, "image-generation-error.json");
    if (fs.existsSync(errorPath)) {
      checks.push(warning("image.error_artifact", `${item.id} has image-generation-error.json`, errorPath));
    }
  }
}

function verifyEval({ workspaceRoot, pipeline, date, manifest, checks }) {
  const config = pipelineConfig(pipeline);
  if (!config.requiresEval) return;
  const evalPath = path.join(workspaceRoot, config.root, date, config.evalFolder, "eval-report.json");
  const state = fileState(evalPath);
  checks.push(result(state.exists && state.bytes > 0, "eval.exists", "eval-report.json exists", evalPath, { bytes: state.bytes }));
  if (!state.exists || state.bytes === 0) return;

  const report = readJson(evalPath);
  checks.push(result(report.status === "passed", "eval.status", "eval status is passed", evalPath, { actual: report.status }));
  checks.push(
    result(report.result?.ok_to_schedule === true, "eval.ok_to_schedule", "eval ok_to_schedule is true", evalPath, {
      actual: report.result?.ok_to_schedule,
    }),
  );
  const itemCount = manifest.items?.length ?? 0;
  checks.push(
    result((report.result?.piece_results ?? []).length === itemCount, "eval.piece_count", "eval piece count matches manifest", evalPath, {
      expected: itemCount,
      actual: (report.result?.piece_results ?? []).length,
    }),
  );
  checks.push(
    result((report.result?.image_results ?? []).length === itemCount, "eval.image_count", "eval image count matches manifest", evalPath, {
      expected: itemCount,
      actual: (report.result?.image_results ?? []).length,
    }),
  );
}

function schedulerReportPath(workspaceRoot, pipeline, date, mode) {
  const config = pipelineConfig(pipeline);
  const folder = path.join(workspaceRoot, config.root, date, config.schedulerFolder);
  if (mode === "scheduled") return path.join(folder, "scheduled-jobs.json");
  if (mode === "dry-run") return path.join(folder, "dry-run-report.json");
  const scheduled = path.join(folder, "scheduled-jobs.json");
  if (fs.existsSync(scheduled)) return scheduled;
  return path.join(folder, "dry-run-report.json");
}

function fieldArray(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap(fieldArray);
  return [String(value)];
}

function mediaPathsForResult(entry) {
  return [...new Set([
    ...fieldArray(entry.media_paths),
    ...fieldArray(entry.image_path),
    ...fieldArray(entry.upload_post_submission?.media_paths),
    ...fieldArray(entry.upload_post_submission?.form_fields?.["photos[]"]),
  ].filter(Boolean))];
}

function verifyScheduler({ workspaceRoot, pipeline, date, manifest, checks, schedulerMode }) {
  const reportPath = schedulerReportPath(workspaceRoot, pipeline, date, schedulerMode);
  const state = fileState(reportPath);
  checks.push(result(state.exists && state.bytes > 0, "scheduler.exists", "scheduler report exists", reportPath, { bytes: state.bytes }));
  if (!state.exists || state.bytes === 0) return;

  const report = readJson(reportPath);
  checks.push(result(report.date === date, "scheduler.date", "scheduler report date matches", reportPath, { expected: date, actual: report.date }));
  checks.push(result(Array.isArray(report.results) && report.results.length > 0, "scheduler.results", "scheduler has result rows", reportPath, {
    result_count: Array.isArray(report.results) ? report.results.length : 0,
  }));

  const manifestItemIds = new Set((manifest.items ?? []).map((item) => item.id));
  for (const entry of report.results ?? []) {
    if (entry.item_id) {
      checks.push(
        result(manifestItemIds.has(entry.item_id), "scheduler.item_id", `${entry.id ?? entry.item_id} item_id is in manifest`, reportPath, {
          item_id: entry.item_id,
        }),
      );
    }
    if (report.live || entry.status === "scheduled") {
      checks.push(result(Boolean(entry.job_id), "scheduler.job_id", `${entry.id ?? entry.item_id} scheduled row has job_id`, reportPath));
      checks.push(result(!entry.error, "scheduler.no_error", `${entry.id ?? entry.item_id} scheduled row has no error`, reportPath, { error: entry.error }));
    }

    for (const mediaPath of mediaPathsForResult(entry)) {
      const absolutePath = path.isAbsolute(mediaPath) ? mediaPath : path.join(workspaceRoot, mediaPath);
      const media = fileState(absolutePath);
      checks.push(
        result(media.exists && media.bytes > 0, "scheduler.media", `${entry.id ?? entry.item_id} media exists`, absolutePath, {
          relative_path: path.isAbsolute(mediaPath) ? rel(workspaceRoot, mediaPath) : mediaPath,
          bytes: media.bytes,
        }),
      );
    }
  }
}

export function verifyAresMarketingArtifacts({
  workspaceRoot,
  pipeline = "editorial",
  date = "latest",
  stages = parseStageList(),
  schedulerMode = "any",
  generatedAt = new Date().toISOString(),
  requireToday = false,
  maxArtifactAgeHours = null,
} = {}) {
  const resolvedWorkspace = path.resolve(workspaceRoot);
  const resolvedDate = resolveAresDate(resolvedWorkspace, pipeline, date);
  const checks = [];
  const manifest = manifestForRun(resolvedWorkspace, pipeline, resolvedDate, checks);

  if (manifest) {
    if (stages.has("source")) verifySourceFiles({ workspaceRoot: resolvedWorkspace, pipeline, manifest, checks });
    if (stages.has("final")) verifyFinalFiles({ workspaceRoot: resolvedWorkspace, pipeline, date: resolvedDate, manifest, checks });
    if (stages.has("images")) verifyImages({ workspaceRoot: resolvedWorkspace, pipeline, date: resolvedDate, manifest, checks });
    if (stages.has("eval")) verifyEval({ workspaceRoot: resolvedWorkspace, pipeline, date: resolvedDate, manifest, checks });
    if (stages.has("provenance")) verifyProvenance({ workspaceRoot: resolvedWorkspace, manifest, checks });
    if (stages.has("freshness")) {
      verifyFreshness({
        workspaceRoot: resolvedWorkspace,
        pipeline,
        date: resolvedDate,
        manifest,
        checks,
        generatedAt,
        requireToday,
        maxArtifactAgeHours,
      });
    }
    if (stages.has("scheduler")) {
      verifyScheduler({
        workspaceRoot: resolvedWorkspace,
        pipeline,
        date: resolvedDate,
        manifest,
        checks,
        schedulerMode,
      });
    }
  }

  const blockers = checks.filter((check) => check.status === "block");
  const warnings = checks.filter((check) => check.status === "warn");
  return {
    schema_version: ARTIFACT_TRUTH_VERSION,
    generated_at: generatedAt,
    workspace_root: resolvedWorkspace,
    pipeline,
    date: resolvedDate,
    status: blockers.length ? "blocked" : "passed",
    ok: blockers.length === 0,
    blocker_count: blockers.length,
    warning_count: warnings.length,
    check_count: checks.length,
    stages: [...stages],
    scheduler_mode: schedulerMode,
    require_today: requireToday,
    max_artifact_age_hours: maxArtifactAgeHours,
    checks,
  };
}

export function renderArtifactTruthMarkdown(report) {
  const lines = [
    `# Artifact Truth Verification - ${report.pipeline} ${report.date}`,
    "",
    `Status: \`${report.status}\``,
    `Generated: \`${report.generated_at}\``,
    `Workspace: \`${report.workspace_root}\``,
    `Checks: \`${report.check_count}\``,
    `Blockers: \`${report.blocker_count}\``,
    `Warnings: \`${report.warning_count}\``,
    "",
    "## Blockers",
    "",
  ];

  const blockers = report.checks.filter((check) => check.status === "block");
  lines.push(...(blockers.length ? blockers.map((check) => `- ${check.id}: ${check.message}${check.path ? ` (${check.path})` : ""}`) : ["- none"]));
  lines.push("", "## Warnings", "");
  const warnings = report.checks.filter((check) => check.status === "warn");
  lines.push(...(warnings.length ? warnings.map((check) => `- ${check.id}: ${check.message}${check.path ? ` (${check.path})` : ""}`) : ["- none"]));
  lines.push("", "## Summary By Status", "");
  for (const status of ["pass", "warn", "block"]) {
    lines.push(`- ${status}: ${report.checks.filter((check) => check.status === status).length}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}
