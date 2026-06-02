import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const COMPANY_OS_UPDATE_VERSION = "company-os-update/v0";

const SKIP_DIR_NAMES = new Set([
  ".git", "node_modules", ".next", "dist", "build", ".cache", ".turbo",
  ".pytest_cache", "__pycache__",
]);

const SKIP_FILE_NAMES = new Set([".DS_Store"]);

// User-authored active files: reported in local_state and never auto-overwritten.
export const LOCAL_STATE_FILES = [
  ".company-os/install-record.md",
  ".company-os/company-discovery-brief.md",
  ".company-os/first-run-checklist.md",
  ".company-os/onboarding/intake-record.json",
  ".company-os/onboarding/first-plane-parent-draft.md",
  ".company-os/operations/workspace-registry.json",
  ".company-os/operations/software-stack.md",
  ".company-os/operations/human-gates.md",
  ".company-os/operations/automation-registry.md",
];

const LOCAL_STATE_PATH_SET = new Set(LOCAL_STATE_FILES);

// Hard-blocked paths: update will NEVER write to these, even if the kit
// contains a file at the same relative path. These are the most sensitive
// user-authored files whose loss is unrecoverable without a full re-onboard.
export const HARD_BLOCKED_UPDATE_PATHS = new Set([
  ".company-os/install-record.md",
  ".company-os/company-discovery-brief.md",
  ".company-os/onboarding/intake-record.json",
  ".company-os/onboarding/first-plane-parent-draft.md",
  ".company-os/operations/workspace-registry.json",
  ".company-os/operations/human-gates.md",
]);

// Manual-review paths: the update can propose changes, but the operator must
// review the diff before apply (e.g. connector manifests need a merge review,
// not a blind overwrite).
export const MANUAL_REVIEW_PATHS = new Set([
  ".company-os/eve/connector-manifests.json",
  ".company-os/eve/SOUL.md",
]);

function compact(value) {
  return String(value ?? "").trim();
}

function listFilesRecursive(dir, base) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      files.push(...listFilesRecursive(absolute, base));
    } else if (!SKIP_FILE_NAMES.has(entry.name)) {
      files.push(path.relative(base, absolute));
    }
  }
  return files.sort();
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readOptional(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function parseInstalledVersion(text) {
  const match = String(text).match(/^Company\.OS version:[ \t]*([^\r\n]*)$/im);
  return match ? compact(match[1]) : "";
}

function resolveDate(value) {
  const text = compact(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return new Date().toISOString().slice(0, 10);
}

// Classify a single kit file change into one of six update statuses.
// Priority: blocked > manual-review > collision > update/add/unchanged.
function classifyChange(filePath, srcHash, dstExists, dstHash) {
  if (!dstExists) {
    return HARD_BLOCKED_UPDATE_PATHS.has(filePath) ? "blocked" : "add";
  }
  if (srcHash === dstHash) return "unchanged";
  if (HARD_BLOCKED_UPDATE_PATHS.has(filePath)) return "blocked";
  if (LOCAL_STATE_PATH_SET.has(filePath)) return "collision";
  if (MANUAL_REVIEW_PATHS.has(filePath)) return "manual-review";
  return "update";
}

const BLOCKED_ACTIONS = [
  "do not overwrite active .company-os local state",
  "do not apply AionUI/Hermes sidecar updates without explicit operator confirmation",
  "do not enable scheduler autonomy",
  "do not mark Plane Done",
];

export function planCompanyOsUpdate({ source, target, toVersion = "", date } = {}) {
  const resolvedSource = path.resolve(source || "");
  const resolvedTarget = path.resolve(target || "");

  // Explicit source==target classification: this is a kit source check, not a
  // client update check. Operators must not mistake this for an update plan.
  if (resolvedSource === resolvedTarget) {
    const sourceVersion = compact(readOptional(path.join(resolvedSource, "VERSION"))) || "unknown";
    return {
      ok: true,
      version: COMPANY_OS_UPDATE_VERSION,
      status: "source-is-target",
      source_is_target: true,
      installed: false,
      date: resolveDate(date),
      source: resolvedSource,
      target: resolvedTarget,
      source_version: sourceVersion,
      target_version: "n/a",
      to_version: "n/a",
      summary: {
        total_files: 0, add: 0, update: 0, unchanged: 0,
        collision: 0, blocked: 0, manual_review: 0, local_state_preserved: 0,
      },
      changes: [],
      changed_files: [],
      local_state: [],
      blocked_actions: BLOCKED_ACTIONS,
    };
  }

  const kitDir = path.join(resolvedSource, "kits", "company-os-kit");
  const errors = [];
  if (!fs.existsSync(resolvedSource)) errors.push(`Source not found: ${resolvedSource}`);
  if (!fs.existsSync(kitDir)) errors.push(`Kit directory not found inside source: ${kitDir}`);
  if (!fs.existsSync(resolvedTarget)) errors.push(`Target not found: ${resolvedTarget}`);
  if (errors.length) {
    return {
      ok: false,
      version: COMPANY_OS_UPDATE_VERSION,
      status: "error",
      errors,
      source: resolvedSource,
      target: resolvedTarget,
      changes: [],
    };
  }

  // Detect not-yet-installed workspace (install-record.md absent).
  const installRecordPath = path.join(resolvedTarget, ".company-os", "install-record.md");
  const installed = fs.existsSync(installRecordPath);

  const sourceVersion = compact(readOptional(path.join(resolvedSource, "VERSION"))) || "unknown";
  const targetVersion = parseInstalledVersion(readOptional(installRecordPath)) || "unknown";
  const effectiveToVersion = compact(toVersion) || sourceVersion;

  const files = listFilesRecursive(kitDir, kitDir);
  const changes = files.map((file) => {
    const src = path.join(kitDir, file);
    const dst = path.join(resolvedTarget, file);
    const srcHash = sha256(src);
    const dstExists = fs.existsSync(dst);
    const dstHash = dstExists ? sha256(dst) : null;
    return { path: file, status: classifyChange(file, srcHash, dstExists, dstHash), source_sha256: srcHash, target_sha256: dstHash };
  });

  const changed = changes.filter((row) => row.status !== "unchanged");
  const localState = LOCAL_STATE_FILES.map((file) => ({
    path: file,
    exists: fs.existsSync(path.join(resolvedTarget, file)),
    preserved: true,
  }));

  const safeChanges = changed.filter((r) => r.status === "add" || r.status === "update");
  const manualReviewChanges = changed.filter((r) => r.status === "manual-review");
  let status;
  if (!installed) {
    status = "not-installed";
  } else if (safeChanges.length || manualReviewChanges.length) {
    status = "changes-available";
  } else if (changed.filter((r) => r.status === "collision" || r.status === "blocked").length) {
    status = "blocked-only";
  } else {
    status = "up-to-date";
  }

  return {
    ok: true,
    version: COMPANY_OS_UPDATE_VERSION,
    status,
    source_is_target: false,
    installed,
    date: resolveDate(date),
    source: resolvedSource,
    target: resolvedTarget,
    source_version: sourceVersion,
    target_version: targetVersion,
    to_version: effectiveToVersion,
    summary: {
      total_files: files.length,
      add: changes.filter((row) => row.status === "add").length,
      update: changes.filter((row) => row.status === "update").length,
      unchanged: changes.filter((row) => row.status === "unchanged").length,
      collision: changes.filter((row) => row.status === "collision").length,
      blocked: changes.filter((row) => row.status === "blocked").length,
      manual_review: changes.filter((row) => row.status === "manual-review").length,
      local_state_preserved: localState.filter((row) => row.exists).length,
    },
    changes,
    changed_files: changed,
    local_state: localState,
    blocked_actions: BLOCKED_ACTIONS,
  };
}

export function renderUpdateReport(plan, { applied = false, dryRun = true } = {}) {
  const byStatus = (s) => (plan.changes || []).filter((r) => r.status === s);
  const safe = [...byStatus("add"), ...byStatus("update")];
  const collisions = byStatus("collision");
  const blocked = byStatus("blocked");
  const manualReview = byStatus("manual-review");

  return [
    `# Company.OS Update Report - ${plan.to_version}`,
    "",
    `Date: ${plan.date}`,
    `Version: ${COMPANY_OS_UPDATE_VERSION}`,
    `Status: ${plan.status}`,
    `Installed: ${plan.installed === false ? "no (not-yet-installed workspace)" : "yes"}`,
    `Source-is-target: ${plan.source_is_target ? "yes" : "no"}`,
    `Applied: ${applied ? "yes" : "no"}`,
    `Dry-run: ${dryRun ? "yes" : "no"}`,
    "",
    "## Versions",
    "",
    `Source version: ${plan.source_version}`,
    `Installed version: ${plan.target_version}`,
    `Target version: ${plan.to_version}`,
    "",
    "## Summary",
    "",
    `Total kit files: ${plan.summary?.total_files ?? 0}`,
    `Add: ${plan.summary?.add ?? 0}`,
    `Update: ${plan.summary?.update ?? 0}`,
    `Unchanged: ${plan.summary?.unchanged ?? 0}`,
    `Manual review: ${plan.summary?.manual_review ?? 0}`,
    `Collision: ${plan.summary?.collision ?? 0}`,
    `Blocked: ${plan.summary?.blocked ?? 0}`,
    `Local state files preserved: ${plan.summary?.local_state_preserved ?? 0}`,
    "",
    "## Safe Changes (add / update)",
    "",
    safe.length
      ? safe.map((r) => `- ${r.status}: ${r.path}`).join("\n")
      : "- none",
    "",
    "## Manual Review Required",
    "",
    manualReview.length
      ? [
          "These files can be updated but require operator review before apply.",
          ...manualReview.map((r) => `- manual-review: ${r.path}`),
        ].join("\n")
      : "- none",
    "",
    "## Collisions (would overwrite local state)",
    "",
    collisions.length
      ? [
          "These kit files share a path with user-authored local state. Use --force after manual review.",
          ...collisions.map((r) => `- collision: ${r.path}`),
        ].join("\n")
      : "- none",
    "",
    "## Blocked by Policy",
    "",
    blocked.length
      ? [
          "These files are never auto-updated. Bootstrap installer manages them at first install.",
          ...blocked.map((r) => `- blocked: ${r.path}`),
        ].join("\n")
      : "- none",
    "",
    "## Preserved Local State",
    "",
    (plan.local_state || [])
      .filter((row) => row.exists)
      .map((row) => `- ${row.path}`)
      .join("\n") || "- none present",
    "",
    "## Rollback",
    "",
    "- Kit files are plain text/JSON; rollback by git restore or re-run installer from prior Company.OS clone.",
    "- Protected local state is never touched; no rollback needed for those files.",
    "",
    "## Blocked Actions",
    "",
    (plan.blocked_actions || []).map((row) => `- ${row}`).join("\n"),
    "",
  ].join("\n");
}

// EVE-readable impact summary: lets EVE explain what will change before the
// operator approves apply. Covers source-is-target and not-installed edge cases.
export function renderEveUpdateSummary(plan) {
  if (!plan) return "# EVE Update Impact: no plan provided";

  if (plan.source_is_target) {
    return [
      "# EVE Update Impact: source-is-target",
      "",
      "Source and target resolve to the same path.",
      "This is a kit source check, not a client update check.",
      "Run the check against a separate installed client workspace.",
      "",
      `Source: ${plan.source}`,
    ].join("\n");
  }

  if (!plan.ok) {
    return [
      "# EVE Update Impact: error",
      "",
      ...(plan.errors || ["Unknown error"]).map((e) => `- ${e}`),
    ].join("\n");
  }

  if (!plan.installed) {
    return [
      `# EVE Update Impact: ${plan.source_version} (not-yet-installed target)`,
      "",
      "The target workspace has no install-record.md.",
      "This workspace is not yet a Company.OS install.",
      "Run the bootstrap installer first:",
      "  node scripts/install/bootstrap.mjs install --target <workspace>",
      "",
      `Target: ${plan.target}`,
    ].join("\n");
  }

  const s = plan.summary || {};
  const safeCount = (s.add || 0) + (s.update || 0);
  const preservedLines = (plan.local_state || [])
    .filter((r) => r.exists)
    .map((r) => `  - ${r.path}`);

  const nextSteps = [];
  if (safeCount === 0 && !(s.manual_review) && !(s.collision) && !(s.blocked)) {
    nextSteps.push("No action needed. Workspace is up-to-date.");
  } else {
    let step = 1;
    nextSteps.push(`${step}. Review the full update report before apply.`);
    if (s.manual_review) {
      step += 1;
      nextSteps.push(`${step}. Manual review: ${s.manual_review} file(s) need diff review (connector manifests / soul files).`);
    }
    if (s.collision) {
      step += 1;
      nextSteps.push(`${step}. Resolve ${s.collision} collision(s) before applying.`);
    }
    step += 1;
    nextSteps.push(`${step}. Dry-run: node scripts/update/company-os-update.mjs apply --dry-run`);
    step += 1;
    nextSteps.push(`${step}. Apply: node scripts/update/company-os-update.mjs apply`);
    step += 1;
    nextSteps.push(`${step}. Refresh EVE: node scripts/operator-shell/eve-sidecar.mjs prepare`);
  }

  return [
    `# EVE Update Impact: ${plan.target_version} -> ${plan.to_version}`,
    "",
    `Date: ${plan.date}`,
    `Status: ${plan.status}`,
    "",
    "## Safe to Apply",
    `- Add: ${s.add || 0} new kit files`,
    `- Update: ${s.update || 0} changed kit files`,
    `- Unchanged: ${s.unchanged || 0} files (no action needed)`,
    "",
    "## Needs Attention Before Apply",
    `- Manual review: ${s.manual_review || 0} (connector manifests / soul files need diff review)`,
    `- Collision: ${s.collision || 0} (kit file would overwrite local state)`,
    `- Blocked: ${s.blocked || 0} (policy blocks; never auto-updated)`,
    "",
    "## Protected Local State (never touched by update)",
    preservedLines.length ? preservedLines.join("\n") : "  - none present",
    "",
    "## Rollback Path",
    "- git restore <files> or re-run installer from prior Company.OS clone.",
    "- All protected local state is preserved automatically.",
    "",
    "## Next Steps",
    nextSteps.join("\n"),
    "",
  ].join("\n");
}

export function writeUpdateReport({ target, plan, applied = false, dryRun = true } = {}) {
  const date = resolveDate(plan?.date);
  const safeVersion = compact(plan?.to_version).replace(/[^a-zA-Z0-9._-]+/g, "-") || "unknown";
  const reportDir = path.join(path.resolve(target || ""), "reports", "company-os-updates", date);
  const markdownPath = path.join(reportDir, `company-os-update-${safeVersion}.md`);
  const jsonPath = path.join(reportDir, `company-os-update-${safeVersion}.json`);
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(markdownPath, renderUpdateReport(plan, { applied, dryRun }));
  fs.writeFileSync(jsonPath, `${JSON.stringify({ ...plan, applied, dry_run: dryRun }, null, 2)}\n`);
  return {
    markdown: path.relative(path.resolve(target || ""), markdownPath),
    json: path.relative(path.resolve(target || ""), jsonPath),
  };
}

export function applyCompanyOsUpdate({ source, target, toVersion = "", date, dryRun = false, writeReport = true } = {}) {
  // Version pin: if --to is explicitly specified it must match the source VERSION.
  // Prevents silent version drift when an operator pins the wrong label.
  const requestedVersion = compact(toVersion);
  if (requestedVersion) {
    const resolvedSource = path.resolve(source || "");
    const actualSourceVersion = compact(readOptional(path.join(resolvedSource, "VERSION"))) || "unknown";
    if (requestedVersion !== actualSourceVersion) {
      return {
        ok: false,
        version: COMPANY_OS_UPDATE_VERSION,
        status: "error",
        errors: [
          `Version pin mismatch: requested "${requestedVersion}" but source VERSION is "${actualSourceVersion}".`,
          `Pin your Company.OS clone to the exact version before applying.`,
        ],
        source: resolvedSource,
        target: path.resolve(target || ""),
        changes: [],
      };
    }
  }

  const plan = planCompanyOsUpdate({ source, target, toVersion, date });
  if (!plan.ok) return plan;
  if (plan.source_is_target) {
    return {
      ...plan,
      ok: false,
      applied: false,
      dry_run: Boolean(dryRun),
      files_copied: [],
      files_skipped: [],
      errors: [
        "Source and target resolve to the same path. This is a source check, not an update apply target.",
      ],
    };
  }
  if (!plan.installed) {
    return {
      ...plan,
      ok: false,
      applied: false,
      dry_run: Boolean(dryRun),
      files_copied: [],
      files_skipped: plan.changed_files.map((change) => ({ path: change.path, reason: "not-installed" })),
      errors: [
        "Target workspace is not installed yet. Run bootstrap install before update apply.",
      ],
    };
  }

  const resolvedSource = path.resolve(source || "");
  const resolvedTarget = path.resolve(target || "");
  const kitDir = path.join(resolvedSource, "kits", "company-os-kit");

  if (dryRun) {
    return {
      ...plan,
      status: "dry-run",
      applied: false,
      dry_run: true,
      report: null,
    };
  }

  // Apply only safe add/update changes; skip collision, blocked, manual-review.
  const SKIP_STATUSES = new Set(["collision", "blocked", "manual-review", "unchanged"]);
  const copied = [];
  const skipped = [];
  for (const change of plan.changed_files) {
    if (SKIP_STATUSES.has(change.status)) {
      skipped.push({ path: change.path, reason: change.status });
      continue;
    }
    const src = path.join(kitDir, change.path);
    const dst = path.join(resolvedTarget, change.path);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    copied.push(change.path);
  }

  const report = writeReport
    ? writeUpdateReport({ target: resolvedTarget, plan, applied: true, dryRun: false })
    : null;

  return {
    ...plan,
    status: "pass",
    applied: true,
    dry_run: false,
    files_copied: copied,
    files_skipped: skipped,
    report,
  };
}
