import fs from "node:fs";
import path from "node:path";

export const CMO_MORNING_BRIEF_VERSION = "cmo-morning-brief/v0";

const DEFAULT_COMPANY_ROOT = "${LOCAL_WORKSPACE}";
const DEFAULT_ARES_WEBSITE_ROOT = "${LOCAL_WORKSPACE}";
const LINKEDIN_CREATOR_ANALYTICS_URL = "https://www.linkedin.com/analytics/creator/content/";
const LINKEDIN_CREATOR_EXPORT_ANCHOR_URL = "https://www.linkedin.com/analytics/creator/content/#:~:text=Zielgruppe-,Exportieren,-Vergangene%207%20Tage";
const LINKEDIN_PULL_PROFILE = "mheinke_founder";
const POST_METRICS_MAX_TARGETS = 100;
const MH_DEV_LINKEDIN_OUTPUT_ROOT = "${LOCAL_WORKSPACE}";
const LINKEDIN_DOWNLOAD_MAX_AGE_MINUTES = 720;

export function localDate(now = new Date()) {
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function exists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function walkFiles(root, { maxFiles = 500 } = {}) {
  const out = [];
  function walk(dir) {
    if (out.length >= maxFiles || !exists(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
      if (out.length >= maxFiles) return;
    }
  }
  walk(root);
  return out.sort();
}

function firstExisting(candidates) {
  return candidates.find((filePath) => exists(filePath)) || "";
}

function summarizeReport(filePath, content = safeRead(filePath)) {
  const status = content.match(/^Status:\s*(.+)$/im)?.[1]?.trim()
    || content.match(/\b(PASS_[A-Z0-9_]+|CAPABILITIES_[A-Z0-9_]+|BLOCKED_[A-Z0-9_]+|KEEP_AS_[A-Z0-9_]+|PARTIALLY_CONNECTED_[A-Z0-9_]+)\b/)?.[1]
    || "present";
  const blockers = [];
  const highlights = [];
  for (const line of content.split(/\r?\n/)) {
    const normalizedLine = line.replace(/^\s*[-*]\s*/, "").trim();
    const lowerLine = normalizedLine.toLowerCase();
    const looksLikePassingTableRow = /\|\s*pass\s*\|/i.test(normalizedLine);
    const onlyReportsZeroFailures = /\b0\/\d+\s+failed\b/i.test(normalizedLine);
    const isInactiveButExpected = /\binactive\b/i.test(normalizedLine) && !/\b(check|expected active|differs|drift)\b/i.test(normalizedLine);
    if (
      !looksLikePassingTableRow
      && !onlyReportsZeroFailures
      && !isInactiveButExpected
      && /\b(blocked|blocker|billing|cron drift|review required|await human review|failed|not live|check)\b/i.test(line)
    ) {
      blockers.push(normalizeGateLanguage(normalizedLine));
    }
    if (/\b(impressions|reactions|likes|comments|reposts|shares|manual screenshot|screenshot metrics|trusted metric|KEEP_AS_MARKETING_PATTERN|Prediction is not explanation)\b/i.test(line)) {
      highlights.push(line.replace(/^\s*[-*]\s*/, "").trim());
    }
    if (blockers.length >= 5 && highlights.length >= 5) break;
  }
  return {
    path: filePath,
    status,
    blockers,
    highlights: highlights.slice(0, 5),
  };
}

function summarizeArtifactTruth(filePath) {
  const data = safeReadJson(filePath);
  if (!data || typeof data !== "object") return null;
  const pipeline = data.pipeline || path.basename(filePath, ".json");
  const blockerCount = Number(data.blocker_count || 0);
  const warningCount = Number(data.warning_count || 0);
  const status = data.status || (data.ok ? "passed" : "unknown");
  const blockers = [];
  if (data.ok === false || blockerCount > 0) {
    blockers.push(`${pipeline} Artifact Truth ${status}: ${blockerCount} blocker(s), ${warningCount} warning(s).`);
  }
  return {
    path: filePath,
    pipeline,
    date: data.date || "",
    status,
    ok: data.ok === true,
    blocker_count: blockerCount,
    warning_count: warningCount,
    check_count: Number(data.check_count || 0),
    blockers,
  };
}

function summarizeUploadPostSchedule(filePath) {
  const data = safeReadJson(filePath);
  if (!data || typeof data !== "object") return null;
  const results = Array.isArray(data.results) ? data.results : [];
  const scheduled = results.filter((row) => row?.status === "scheduled");
  const platforms = [...new Set(scheduled.map((row) => row.platform || row.channel).filter(Boolean))].sort();
  const blockers = [];
  if (data.live === true && scheduled.length > 0 && data.approval_kind === "standing") {
    blockers.push(`Live Upload-Post scheduled ${scheduled.length} job(s) via standing approval marker; verify explicit CEO HG-2.5 release-card / human_gate.released evidence before calling this autonomous release safe.`);
  }
  if (data.live === true && scheduled.length > 0 && !data.approved) {
    blockers.push(`Live Upload-Post scheduled ${scheduled.length} job(s) but approved=false.`);
  }
  return {
    path: filePath,
    status: data.status || "unknown",
    pipeline: data.pipeline || "",
    live: data.live === true,
    approved: data.approved === true,
    approval_kind: data.approval_kind || "",
    approval_marker: data.approval_marker || "",
    remote_preflight_total: Number(data.remote_preflight_total || 0),
    scheduled_count: scheduled.length,
    platforms,
    blockers,
  };
}

function latestPerformanceReport(aresWebsiteRoot, date) {
  const exact = path.join(aresWebsiteRoot, "marketing", "performance", date, "report.json");
  if (exists(exact)) return exact;
  return walkFiles(path.join(aresWebsiteRoot, "marketing", "performance"), { maxFiles: 1000 })
    .filter((filePath) => filePath.endsWith("report.json"))
    .sort()
    .slice(-1)[0] || "";
}

function latestPostMetricsHarvesterReport(aresWebsiteRoot, date) {
  const exact = path.join(aresWebsiteRoot, "marketing", "performance", date, "post-metrics-harvester.json");
  if (exists(exact)) return exact;
  return walkFiles(path.join(aresWebsiteRoot, "marketing", "performance"), { maxFiles: 1000 })
    .filter((filePath) => filePath.endsWith("post-metrics-harvester.json"))
    .sort()
    .slice(-1)[0] || "";
}

function latestLinkedInSnapshotReport(aresWebsiteRoot, date) {
  const base = path.join(aresWebsiteRoot, "marketing", "performance", "browser-snapshots", date, "linkedin");
  const run = path.join(base, "snapshot-run.json");
  if (exists(run)) return run;
  const plan = path.join(base, "snapshot-plan.json");
  if (exists(plan)) return plan;
  return "";
}

function latestLinkedInCreatorExportReport(aresWebsiteRoot, date) {
  const exact = path.join(aresWebsiteRoot, "marketing", "performance", "linkedin", `${date}_linkedin-performance.json`);
  if (exists(exact)) return exact;
  return walkFiles(path.join(aresWebsiteRoot, "marketing", "performance", "linkedin"), { maxFiles: 500 })
    .filter((filePath) => /_linkedin-performance\.json$/.test(filePath))
    .sort()
    .slice(-1)[0] || "";
}

function summarizePerformanceAnalytics(filePath, expectedDate = "") {
  const data = safeReadJson(filePath);
  if (!data || typeof data !== "object") return null;
  const reportDate = data.date || "";
  const summary = data.summary || {};
  const totals = data.post_metric_totals || {};
  const postAnalytics = Array.isArray(data.post_analytics) ? data.post_analytics : [];
  const errors = postAnalytics.filter((row) => row?.status && Number(row.status) >= 400);
  const linkedinMetricErrors = postAnalytics.filter((row) => {
    const text = JSON.stringify(row).toLowerCase();
    return row?.platform === "linkedin" && /token|could not fetch|metrics error/.test(text);
  });
  const blockers = [];
  if (expectedDate && reportDate && reportDate !== expectedDate) {
    blockers.push(`Performance analytics stale: latest report date=${reportDate}, brief date=${expectedDate}.`);
  }
  if (Number(summary.total_impressions_api || 0) === 0 && Number(summary.impressions || 0) > 0) {
    blockers.push(`Performance analytics partial: profile total_impressions_api=0 while summarized impressions=${summary.impressions}; treat as data gap, not strategy-grade truth.`);
  }
  if (linkedinMetricErrors.length > 0) {
    blockers.push(`LinkedIn metrics unavailable for ${linkedinMetricErrors.length} post check(s); browser/manual evidence remains required.`);
  }
  if (errors.length > 0) {
    blockers.push(`Upload-Post analytics returned ${errors.length} HTTP error row(s).`);
  }
  return {
    path: filePath,
    date: reportDate,
    stale: Boolean(expectedDate && reportDate && reportDate !== expectedDate),
    status: data.status || "unknown",
    summary,
    post_metric_totals: totals,
    post_checks: postAnalytics.length,
    errors: errors.length,
    linkedin_metric_errors: linkedinMetricErrors.length,
    blockers,
  };
}

function groupCountsByPlatform(records) {
  const groups = new Map();
  for (const record of records) {
    const platform = record.platform || "unknown";
    const current = groups.get(platform) || { platform, total: 0, trusted: 0, blocked: 0 };
    current.total += 1;
    if (record.status === "ok" && record.best_snapshot) current.trusted += 1;
    else current.blocked += 1;
    groups.set(platform, current);
  }
  return [...groups.values()].sort((left, right) => left.platform.localeCompare(right.platform));
}

function blockerCounts(records) {
  const counts = new Map();
  for (const record of records) {
    for (const blocker of record.blockers || []) {
      counts.set(blocker, (counts.get(blocker) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([blocker, count]) => ({ blocker, count }))
    .sort((left, right) => right.count - left.count || left.blocker.localeCompare(right.blocker));
}

function metricScore(metrics = {}) {
  return Number(metrics.impressions || 0)
    + Number(metrics.reach || 0)
    + Number(metrics.views || 0)
    + Number(metrics.likes || 0)
    + Number(metrics.comments || 0)
    + Number(metrics.shares || 0)
    + Number(metrics.reposts || 0)
    + Number(metrics.score || 0);
}

function summarizePostMetricsHarvester(filePath) {
  const data = safeReadJson(filePath);
  if (!data || typeof data !== "object") return null;
  const records = Array.isArray(data.records) ? data.records : [];
  const trusted = records.filter((record) => record.status === "ok" && record.best_snapshot);
  const platform_counts = groupCountsByPlatform(records);
  const blockersByCount = blockerCounts(records);
  const blockers = [];
  if (data.status && data.status !== "ok") {
    blockers.push(`Post metrics harvester ${data.status}: trusted_posts=${trusted.length}/${records.length}; top blockers: ${blockersByCount.slice(0, 3).map((item) => `${item.blocker} (${item.count})`).join(", ") || "none"}.`);
  }
  const linkedIn = platform_counts.find((item) => item.platform === "linkedin");
  if (linkedIn && linkedIn.trusted === 0 && linkedIn.total > 0) {
    blockers.push(`LinkedIn post metrics still missing for ${linkedIn.total} target(s); browser/manual snapshot evidence remains required.`);
  }
  const x = platform_counts.find((item) => item.platform === "x");
  if (x && x.trusted === 0 && x.total > 0) {
    blockers.push(`X post metrics still missing for ${x.total} target(s); API token or post URL attribution needs repair before CMO learning can trust X.`);
  }
  return {
    path: filePath,
    date: data.date || "",
    status: data.status || "unknown",
    target_count: records.length,
    trusted_count: trusted.length,
    blocked_count: Math.max(0, records.length - trusted.length),
    summary: data.summary || {},
    platform_counts,
    top_blockers: blockersByCount.slice(0, 8),
    top_trusted: trusted
      .map((record) => ({
        request_id: record.request_id || "",
        platform: record.platform || "unknown",
        source: record.best_snapshot?.source || "unknown",
        post_url: record.post_url || record.best_snapshot?.post_url || "",
        metrics: record.best_snapshot?.metrics || {},
        score: metricScore(record.best_snapshot?.metrics || {}),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 5),
    blockers,
  };
}

function summarizeLinkedInSnapshotEvidence(filePath) {
  const data = safeReadJson(filePath);
  if (!data || typeof data !== "object") return null;
  const targets = Array.isArray(data.targets) ? data.targets : [];
  const snapshots = Array.isArray(data.snapshots) ? data.snapshots : [];
  const blockers = [];
  if (data.status === "skipped_requires_live_browser") {
    blockers.push(`LinkedIn browser snapshot plan has ${targets.length} target(s) but no CEO-approved read-only browser profile/live-browser run yet.`);
  } else if (data.status && data.status !== "ok") {
    blockers.push(`LinkedIn browser snapshot status ${data.status}; inspect snapshot evidence before trusting LinkedIn metrics.`);
  }
  return {
    path: filePath,
    date: data.date || "",
    status: data.status || "unknown",
    target_count: targets.length || snapshots.length,
    snapshot_count: snapshots.length,
    blockers,
  };
}

function summarizeLinkedInCreatorExportReport(filePath) {
  const data = safeReadJson(filePath);
  if (!data || typeof data !== "object") return null;
  const summary = data.summary || {};
  const creatorSummary = data.creator_summary || null;
  return {
    path: filePath,
    date: data.date || "",
    status: data.status || "unknown",
    export_format: data.export_format || null,
    export_archive_path: data.export_archive_path || null,
    mh_dev_report: data.mh_dev_output?.markdown_path || null,
    mh_dev_raw_archive: data.mh_dev_output?.raw_archive_path || null,
    rows: Number(summary.rows || 0),
    matched_rows: Number(summary.matched_rows || 0),
    snapshots_written: Number(summary.snapshots_written || 0),
    metrics: summary.metrics || {},
    creator_summary: creatorSummary
      ? {
          impressions: creatorSummary.overall?.impressions ?? null,
          reached_members: creatorSummary.overall?.reached_members ?? null,
          followers_total: creatorSummary.followers?.total ?? null,
          new_followers_total: creatorSummary.followers?.new_followers_total ?? null,
          top_day: (creatorSummary.engagement || [])
            .slice()
            .sort((left, right) => Number(right.impressions || 0) - Number(left.impressions || 0))[0] || null,
        }
      : null,
  };
}

function normalizeGateLanguage(line) {
  const value = String(line || "");
  if (/\b(HG-4|Founder|founder)\b/.test(value)) return value;
  return value
    .replace(/\bawait human review\b/gi, "await decision-gate review")
    .replace(/\bhuman review required\b/gi, "decision-gate review required")
    .replace(/\bhuman decision required\b/gi, "decision-gate decision required");
}

function linkedInPlatformCounts(postMetricsHarvester) {
  return postMetricsHarvester?.platform_counts?.find((item) => item.platform === "linkedin") || null;
}

function xHasTrustedMetrics(postMetricsHarvester) {
  const xCounts = postMetricsHarvester?.platform_counts?.find((item) => item.platform === "x");
  return Number(xCounts?.trusted || 0) > 0;
}

function platformFullyTrusted(postMetricsHarvester, platform) {
  const counts = postMetricsHarvester?.platform_counts?.find((item) => item.platform === platform);
  return Number(counts?.total || 0) > 0
    && Number(counts?.trusted || 0) === Number(counts?.total || 0)
    && Number(counts?.blocked || 0) === 0;
}

function allPostMetricsTrusted(postMetricsHarvester) {
  return Number(postMetricsHarvester?.target_count || 0) > 0
    && Number(postMetricsHarvester?.trusted_count || 0) === Number(postMetricsHarvester?.target_count || 0)
    && Number(postMetricsHarvester?.blocked_count || 0) === 0;
}

function isStaleLinkedInMetricsBlocker(line) {
  return /\bLinkedIn\b/i.test(String(line || ""))
    && /\b(blocked|missing|0 trusted|0\/|31\/31|mostly blocked|stayed blocked|snapshot evidence remains required)\b/i.test(String(line || ""));
}

function isStaleXMetricsBlocker(line) {
  return /\bX\b/i.test(String(line || ""))
    && /\b(blocked|missing|token|bearer|post URL attribution|needs repair)\b/i.test(String(line || ""));
}

function isStaleUploadPostHttpBlocker(line) {
  return /Upload-Post analytics returned .*HTTP error row/i.test(String(line || ""));
}

function filterResolvedMetricBlockers(lines, {
  skipX = false,
  skipLinkedIn = false,
  skipUploadPostHttp = false,
} = {}) {
  return (lines || [])
    .filter((line) => !(skipX && isStaleXMetricsBlocker(line)))
    .filter((line) => !(skipLinkedIn && isStaleLinkedInMetricsBlocker(line)))
    .filter((line) => !(skipUploadPostHttp && isStaleUploadPostHttpBlocker(line)));
}

function sanitizeReportMetricBlockers(report, options) {
  if (!report) return report;
  return {
    ...report,
    blockers: filterResolvedMetricBlockers(report.blockers, options),
  };
}

function hasTrustedLinkedInCreatorExport(postMetricsHarvester) {
  return Boolean((postMetricsHarvester?.top_trusted || []).some((item) => (
    item.platform === "linkedin" && item.source === "linkedin_creator_export"
  )));
}

function linkedInPullCommand(date) {
  return `npm run marketing:linkedin-pull -- --date ${date} --profile ${LINKEDIN_PULL_PROFILE} --open --watch-downloads --include-existing-downloads --latest-download --timeout-minutes 5 --max-download-age-minutes ${LINKEDIN_DOWNLOAD_MAX_AGE_MINUTES} --run-post-metrics --post-metrics-max-targets ${POST_METRICS_MAX_TARGETS} --mh-dev-output-root ${MH_DEV_LINKEDIN_OUTPUT_ROOT}`;
}

function linkedInManualFileCommand(date) {
  return `npm run marketing:linkedin-pull -- --date ${date} --profile ${LINKEDIN_PULL_PROFILE} --file ~/Downloads/linkedin-posts.xlsx --run-post-metrics --post-metrics-max-targets ${POST_METRICS_MAX_TARGETS} --mh-dev-output-root ${MH_DEV_LINKEDIN_OUTPUT_ROOT}`;
}

function postMetricsFollowUpCommand(date) {
  return `npm run marketing:post-metrics -- --date ${date} --profile ${LINKEDIN_PULL_PROFILE} --lookback-days 14 --max-targets ${POST_METRICS_MAX_TARGETS}`;
}

function buildLinkedInCreatorExportAction(signals) {
  const date = signals.date;
  const workspace = signals.ares_website_root || DEFAULT_ARES_WEBSITE_ROOT;
  const linkedInCounts = linkedInPlatformCounts(signals.post_metrics_harvester);
  const creatorReport = signals.linkedin_creator_export_report;
  const reasons = [];
  if (creatorReport?.rows > 0 && Number(linkedInCounts?.blocked || 0) > 0) {
    const partialMatch = Number(creatorReport.matched_rows || 0) > 0;
    return {
      status: partialMatch ? "partial_imported_post_level_blocked" : "aggregate_imported_post_level_blocked",
      required: false,
      profile: LINKEDIN_PULL_PROFILE,
      analytics_url: LINKEDIN_CREATOR_ANALYTICS_URL,
      export_anchor_url: LINKEDIN_CREATOR_EXPORT_ANCHOR_URL,
      workspace,
      command: linkedInPullCommand(date),
      manual_file_command: linkedInManualFileCommand(date),
      follow_up_command: postMetricsFollowUpCommand(date),
      mh_dev_report: creatorReport.mh_dev_report || `${MH_DEV_LINKEDIN_OUTPUT_ROOT}/${date}_linkedin-performance.md`,
      mh_dev_raw_archive_dir: creatorReport.mh_dev_raw_archive ? path.dirname(creatorReport.mh_dev_raw_archive) : `${MH_DEV_LINKEDIN_OUTPUT_ROOT}/_raw/${date}/`,
      timeout_minutes: 5,
      max_download_age_minutes: LINKEDIN_DOWNLOAD_MAX_AGE_MINUTES,
      reasons: [
        `LinkedIn Creator export is already imported with ${creatorReport.rows} row(s), ${creatorReport.matched_rows} request_id match(es), and ${creatorReport.snapshots_written} snapshot(s).`,
        `Post Metrics Harvester still blocks ${linkedInCounts.blocked}/${linkedInCounts.total} LinkedIn target(s).`,
        partialMatch
          ? "Next blocker is remaining post URL/request_id attribution coverage, not another export click."
          : "Next blocker is post URL/request_id attribution, not another export click.",
      ],
    };
  }
  if (hasTrustedLinkedInCreatorExport(signals.post_metrics_harvester)) {
    return {
      status: "imported",
      required: false,
      profile: LINKEDIN_PULL_PROFILE,
      analytics_url: LINKEDIN_CREATOR_ANALYTICS_URL,
      export_anchor_url: LINKEDIN_CREATOR_EXPORT_ANCHOR_URL,
      workspace,
      command: linkedInPullCommand(date),
      manual_file_command: linkedInManualFileCommand(date),
      follow_up_command: postMetricsFollowUpCommand(date),
      mh_dev_report: `${MH_DEV_LINKEDIN_OUTPUT_ROOT}/${date}_linkedin-performance.md`,
      mh_dev_raw_archive_dir: `${MH_DEV_LINKEDIN_OUTPUT_ROOT}/_raw/${date}/`,
      timeout_minutes: 5,
      max_download_age_minutes: LINKEDIN_DOWNLOAD_MAX_AGE_MINUTES,
      reasons: ["A trusted linkedin_creator_export snapshot is already present in the current harvester evidence."],
    };
  }
  if (creatorReport?.rows > 0 && creatorReport.matched_rows === 0) {
    return {
      status: "aggregate_imported_post_level_blocked",
      required: false,
      profile: LINKEDIN_PULL_PROFILE,
      analytics_url: LINKEDIN_CREATOR_ANALYTICS_URL,
      export_anchor_url: LINKEDIN_CREATOR_EXPORT_ANCHOR_URL,
      workspace,
      command: linkedInPullCommand(date),
      manual_file_command: linkedInManualFileCommand(date),
      follow_up_command: postMetricsFollowUpCommand(date),
      mh_dev_report: creatorReport.mh_dev_report || `${MH_DEV_LINKEDIN_OUTPUT_ROOT}/${date}_linkedin-performance.md`,
      mh_dev_raw_archive_dir: creatorReport.mh_dev_raw_archive ? path.dirname(creatorReport.mh_dev_raw_archive) : `${MH_DEV_LINKEDIN_OUTPUT_ROOT}/_raw/${date}/`,
      timeout_minutes: 5,
      max_download_age_minutes: LINKEDIN_DOWNLOAD_MAX_AGE_MINUTES,
      reasons: [
        `LinkedIn Creator export is already imported with ${creatorReport.rows} row(s), ${creatorReport.matched_rows} request_id match(es), and ${creatorReport.snapshots_written} snapshot(s).`,
        "Next blocker is post URL/request_id attribution, not another export click.",
      ],
    };
  }
  if (linkedInCounts?.total > 0 && linkedInCounts.trusted === 0) {
    reasons.push(`Post Metrics Harvester has ${linkedInCounts.total} LinkedIn target(s) and 0 trusted LinkedIn metric rows.`);
  } else if (linkedInCounts?.blocked > 0) {
    reasons.push(`Post Metrics Harvester still blocks ${linkedInCounts.blocked}/${linkedInCounts.total} LinkedIn target(s).`);
  }
  if (signals.performance_analytics?.linkedin_metric_errors > 0) {
    reasons.push(`Upload-Post analytics reports ${signals.performance_analytics.linkedin_metric_errors} LinkedIn metric error row(s).`);
  }
  if (signals.linkedin_snapshot_evidence?.target_count > 0 && signals.linkedin_snapshot_evidence.snapshot_count === 0) {
    reasons.push(`LinkedIn browser snapshot evidence has ${signals.linkedin_snapshot_evidence.target_count} target(s) and 0 snapshots.`);
  }
  const required = reasons.length > 0;
  return {
    status: required ? "required" : "not_required",
    required,
    profile: LINKEDIN_PULL_PROFILE,
    analytics_url: LINKEDIN_CREATOR_ANALYTICS_URL,
    export_anchor_url: LINKEDIN_CREATOR_EXPORT_ANCHOR_URL,
    workspace,
    command: linkedInPullCommand(date),
    manual_file_command: linkedInManualFileCommand(date),
    follow_up_command: postMetricsFollowUpCommand(date),
    mh_dev_report: `${MH_DEV_LINKEDIN_OUTPUT_ROOT}/${date}_linkedin-performance.md`,
    mh_dev_raw_archive_dir: `${MH_DEV_LINKEDIN_OUTPUT_ROOT}/_raw/${date}/`,
    timeout_minutes: 5,
    max_download_age_minutes: LINKEDIN_DOWNLOAD_MAX_AGE_MINUTES,
    reasons: required ? reasons : ["No current LinkedIn metric blocker detected in the reduced evidence slice."],
  };
}

export function collectCmoMorningBriefSignals({
  companyRoot = DEFAULT_COMPANY_ROOT,
  aresWebsiteRoot = DEFAULT_ARES_WEBSITE_ROOT,
  date = localDate(),
} = {}) {
  const marketingRoot = path.join(companyRoot, "reports", "marketing-department-v067");
  const completion = firstExisting([
    path.join(marketingRoot, `marketing-department-v067-completion-${date}.md`),
    path.join(marketingRoot, "marketing-department-v067-completion-2026-05-20.md"),
  ]);
  const performance = firstExisting([
    path.join(marketingRoot, `performance-analyst-${date}.md`),
    path.join(marketingRoot, "performance-analyst-2026-05-20.md"),
  ]);
  const reactionRadar = firstExisting([
    path.join(marketingRoot, `reaction-radar-${date}.md`),
    path.join(marketingRoot, "reaction-radar-2026-05-20.md"),
  ]);
  const blogController = firstExisting([
    path.join(marketingRoot, `blog-controller-${date}.md`),
    path.join(marketingRoot, "blog-controller-2026-05-20.md"),
  ]);
  const learningReports = [
    path.join(marketingRoot, `linkedin-brain-health-proof-point-${date}.md`),
    path.join(marketingRoot, `upload-post-analytics-connection-audit-${date}.md`),
    path.join(companyRoot, "docs", "operations", "atlas-marketing-performance-memory.md"),
  ].filter((filePath) => exists(filePath));

  const blogAuditDirs = [
    path.join(aresWebsiteRoot, "docs", "audits", "blog-local-content-audit"),
    path.join(aresWebsiteRoot, "docs", "audits", "blog-morning-after"),
  ];
  const blogAudits = [...new Set(blogAuditDirs.flatMap((dir) => (
    walkFiles(dir)
      .filter((filePath) => filePath.endsWith(".md"))
      .filter((filePath) => path.basename(filePath).startsWith(date) || date === "latest")
  )))].slice(-8);

  const artifactTruthReports = walkFiles(path.join(companyRoot, "reports", "artifact-truth", date), { maxFiles: 100 })
    .filter((filePath) => filePath.endsWith(".json"))
    .map((filePath) => summarizeArtifactTruth(filePath))
    .filter(Boolean);

  const uploadPostSchedules = [
    path.join(aresWebsiteRoot, "marketing", "daily-editorial", date, "08-upload-post", "scheduled-jobs.json"),
    path.join(aresWebsiteRoot, "marketing", "product-desk", date, "08-upload-post", "scheduled-jobs.json"),
  ]
    .filter((filePath) => exists(filePath))
    .map((filePath) => summarizeUploadPostSchedule(filePath))
    .filter(Boolean);

  const performanceReport = latestPerformanceReport(aresWebsiteRoot, date);
  const performanceAnalytics = performanceReport ? summarizePerformanceAnalytics(performanceReport, date) : null;
  const postMetricsReport = latestPostMetricsHarvesterReport(aresWebsiteRoot, date);
  const postMetricsHarvester = postMetricsReport ? summarizePostMetricsHarvester(postMetricsReport) : null;
  const linkedInSnapshotReport = latestLinkedInSnapshotReport(aresWebsiteRoot, date);
  const linkedInSnapshotEvidence = linkedInSnapshotReport ? summarizeLinkedInSnapshotEvidence(linkedInSnapshotReport) : null;
  const linkedInCreatorReportPath = latestLinkedInCreatorExportReport(aresWebsiteRoot, date);
  const linkedInCreatorExportReport = linkedInCreatorReportPath ? summarizeLinkedInCreatorExportReport(linkedInCreatorReportPath) : null;

  const datedOutputDirs = [
    path.join(aresWebsiteRoot, "marketing", "daily-editorial", date),
    path.join(aresWebsiteRoot, "marketing", "product-desk", date),
    path.join(aresWebsiteRoot, "marketing", "performance", date),
  ].map((dir) => ({
    path: dir,
    exists: exists(dir),
    file_count: exists(dir) ? walkFiles(dir, { maxFiles: 2000 }).length : 0,
  }));

  const reports = [completion, performance, reactionRadar, blogController]
    .filter(Boolean)
    .map((filePath) => summarizeReport(filePath));

  return {
    date,
    company_root: companyRoot,
    ares_website_root: aresWebsiteRoot,
    reports,
    learning_reports: learningReports.map((filePath) => summarizeReport(filePath)),
    blog_audits: blogAudits.map((filePath) => summarizeReport(filePath)),
    artifact_truth_reports: artifactTruthReports,
    upload_post_schedules: uploadPostSchedules,
    performance_analytics: performanceAnalytics,
    post_metrics_harvester: postMetricsHarvester,
    linkedin_snapshot_evidence: linkedInSnapshotEvidence,
    linkedin_creator_export_report: linkedInCreatorExportReport,
    dated_output_dirs: datedOutputDirs,
  };
}

function inferStatus(signals) {
  const text = JSON.stringify(signals).toLowerCase();
  if (/release_blockers|blog_blocked|blocked|billing|cron drift|inactive/.test(text)) {
    return "active_with_blockers";
  }
  if (signals.reports.length || signals.blog_audits.length) return "active";
  return "no_signal";
}

export function buildCmoMorningBrief({
  signals,
  generatedAt = new Date().toISOString(),
  planeSink = "CMD-30 Morning Briefing - Current",
} = {}) {
  const status = inferStatus(signals);
  const linkedInCreatorExportAction = buildLinkedInCreatorExportAction(signals);
  const linkedInCounts = linkedInPlatformCounts(signals.post_metrics_harvester);
  const skipStaleXLearningBlockers = xHasTrustedMetrics(signals.post_metrics_harvester);
  const skipStaleLinkedInLearningBlockers = platformFullyTrusted(signals.post_metrics_harvester, "linkedin");
  const skipStaleUploadPostHttpBlockers = allPostMetricsTrusted(signals.post_metrics_harvester);
  const resolvedMetricBlockerFilter = {
    skipX: skipStaleXLearningBlockers,
    skipLinkedIn: skipStaleLinkedInLearningBlockers,
    skipUploadPostHttp: skipStaleUploadPostHttpBlockers,
  };
  const performanceAnalytics = sanitizeReportMetricBlockers(
    signals.performance_analytics,
    { skipUploadPostHttp: skipStaleUploadPostHttpBlockers },
  );
  const learningReports = (signals.learning_reports || [])
    .map((report) => sanitizeReportMetricBlockers(report, resolvedMetricBlockerFilter));
  const reports = (signals.reports || [])
    .map((report) => sanitizeReportMetricBlockers(report, resolvedMetricBlockerFilter));
  const blockers = [
    ...(signals.artifact_truth_reports || []).flatMap((report) => report.blockers.map((line) => ({ source: report.path, line: normalizeGateLanguage(line) }))),
    ...(signals.upload_post_schedules || []).flatMap((report) => report.blockers.map((line) => ({ source: report.path, line: normalizeGateLanguage(line) }))),
    ...(performanceAnalytics?.blockers || [])
      .map((line) => ({ source: performanceAnalytics.path, line: normalizeGateLanguage(line) })),
    ...(signals.post_metrics_harvester?.blockers || []).map((line) => ({ source: signals.post_metrics_harvester.path, line: normalizeGateLanguage(line) })),
    ...(signals.linkedin_snapshot_evidence?.blockers || []).map((line) => ({ source: signals.linkedin_snapshot_evidence.path, line: normalizeGateLanguage(line) })),
    ...(signals.linkedin_creator_export_report?.rows > 0 && Number(linkedInCounts?.blocked || 0) > 0
      ? [{ source: signals.linkedin_creator_export_report.path, line: `LinkedIn Creator export imported (${signals.linkedin_creator_export_report.rows} row(s), ${signals.linkedin_creator_export_report.matched_rows} matched) but ${linkedInCounts.blocked}/${linkedInCounts.total} LinkedIn target(s) still need Upload-Post request_id/post URL attribution.` }]
      : []),
    ...(linkedInCreatorExportAction.required
      ? [{ source: "linkedin_creator_export_action", line: `LinkedIn Creator Export pull required: ${linkedInCreatorExportAction.reasons.join("; ")}` }]
      : []),
    ...signals.blog_audits.flatMap((report) => report.blockers.map((line) => ({ source: report.path, line: normalizeGateLanguage(line) }))),
    ...learningReports.flatMap((report) => report.blockers
      .map((line) => ({ source: report.path, line: normalizeGateLanguage(line) }))),
    ...reports.flatMap((report) => report.blockers
      .map((line) => ({ source: report.path, line: normalizeGateLanguage(line) }))),
  ].slice(0, 12);
  return {
    version: CMO_MORNING_BRIEF_VERSION,
    date: signals.date,
    generated_at: generatedAt,
    department: "marketing",
    owner: "CMO",
    reports_to: "CEO",
    plane_sink: planeSink,
    status,
    blog_lane: "claude_codex_local_until_gemini_vertex_restored",
    publish_policy: "CEO HG-2.5 release required for Supabase apply, publish, index, schedule and external posting; Founder/human starts at HG-4 only",
    reports,
    learning_reports: learningReports,
    blog_audits: signals.blog_audits,
    artifact_truth_reports: signals.artifact_truth_reports || [],
    upload_post_schedules: signals.upload_post_schedules || [],
    performance_analytics: performanceAnalytics || null,
    post_metrics_harvester: signals.post_metrics_harvester || null,
    linkedin_snapshot_evidence: signals.linkedin_snapshot_evidence || null,
    linkedin_creator_export_report: signals.linkedin_creator_export_report || null,
    linkedin_creator_export_action: linkedInCreatorExportAction,
    output_dirs: signals.dated_output_dirs,
    blockers,
    next_dispatches: [
      "Run one Blog Article Claude/Codex worker in a clean sandbox or explicitly scoped [SOURCE_WORKSPACE] worktree.",
      linkedInCreatorExportAction.required
        ? "Run the assisted LinkedIn Creator Export pull during Morning Brief; it will refresh marketing:post-metrics after a valid export lands."
        : ["aggregate_imported_post_level_blocked", "partial_imported_post_level_blocked"].includes(linkedInCreatorExportAction.status)
          ? "Repair LinkedIn post URL/request_id attribution so imported Creator export rows can become trusted post-level snapshots."
          : "Keep LinkedIn Creator Export on standby; rerun it when LinkedIn post metrics become blocked or stale.",
      "Run content:article-audit --fail-on-blockers before any import/publish/index release card.",
      "Run import-research-articles-to-supabase.js dry-run with --require-content-audit only; escalate --apply/publish/index as HG-2.5 release action.",
      "Append the next CMO report to the same Plane singleton instead of creating daily briefing items.",
    ],
  };
}

function yamlScalar(value) {
  return String(value ?? "").replace(/\n/g, " ").replace(/:/g, "-").trim();
}

function tableCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

export function renderCmoMorningBriefMarkdown(brief) {
  const lines = [
    "morning.brief:",
    `  version: ${brief.version}`,
    `  date: ${brief.date}`,
    `  department: ${brief.department}`,
    `  owner: ${brief.owner}`,
    `  reports_to: ${brief.reports_to}`,
    `  status: ${brief.status}`,
    `  blog_lane: ${brief.blog_lane}`,
    `  plane_sink: ${yamlScalar(brief.plane_sink)}`,
    `  generated_at: ${brief.generated_at}`,
    "",
    "# CMO Morning Brief",
    "",
    `Date: ${brief.date}`,
    `Status: ${brief.status}`,
    `Blog lane: ${brief.blog_lane}`,
    `Publish policy: ${brief.publish_policy}`,
    "",
    "## Executive Status",
    "",
    brief.status === "active_with_blockers"
      ? "Marketing is operating, but live publishing/indexing remains gated by explicit blockers and CEO HG-2.5 release authority."
      : "Marketing signal is present and no hard blocker was detected in the reduced evidence slice.",
    "",
    "## Department Reports",
    "",
    "| Status | Path |",
    "|---|---|",
    ...brief.reports.map((report) => `| ${tableCell(report.status)} | ${tableCell(report.path)} |`),
    ...(brief.reports.length ? [] : ["| no_signal | none |"]),
    "",
    "## Learning Inputs",
    "",
    "| Status | Highlights | Path |",
    "|---|---|---|",
    ...brief.learning_reports.map((report) => {
      const highlights = report.highlights?.length ? report.highlights.join("; ") : "see source";
      return `| ${tableCell(report.status)} | ${tableCell(highlights)} | ${tableCell(report.path)} |`;
    }),
    ...(brief.learning_reports.length ? [] : ["| no_learning_signal | none | none |"]),
    "",
    "## Blog / Publishing",
    "",
    "| Status | Audit Path |",
    "|---|---|",
    ...brief.blog_audits.map((report) => `| ${tableCell(report.status)} | ${tableCell(report.path)} |`),
    ...(brief.blog_audits.length ? [] : ["| no_current_audit | none |"]),
    "",
    "## Artifact Truth",
    "",
    "| Pipeline | Status | Blockers | Warnings | Checks | Path |",
    "|---|---|---:|---:|---:|---|",
    ...brief.artifact_truth_reports.map((report) => `| ${tableCell(report.pipeline)} | ${tableCell(report.status)} | ${report.blocker_count} | ${report.warning_count} | ${report.check_count} | ${tableCell(report.path)} |`),
    ...(brief.artifact_truth_reports.length ? [] : ["| no_artifact_truth | none | 0 | 0 | 0 | none |"]),
    "",
    "## Upload-Post Release Evidence",
    "",
    "| Pipeline | Status | Live | Approved | Approval | Scheduled | Platforms | Path |",
    "|---|---|---|---|---|---:|---|---|",
    ...brief.upload_post_schedules.map((report) => `| ${tableCell(report.pipeline)} | ${tableCell(report.status)} | ${report.live ? "yes" : "no"} | ${report.approved ? "yes" : "no"} | ${tableCell(report.approval_kind || "none")} | ${report.scheduled_count} | ${tableCell(report.platforms.join(", ") || "none")} | ${tableCell(report.path)} |`),
    ...(brief.upload_post_schedules.length ? [] : ["| no_schedule | none | no | no | none | 0 | none | none |"]),
    "",
    "## Performance Analytics",
    "",
    brief.performance_analytics
      ? [
          `Status: ${brief.performance_analytics.status}`,
          `Date: ${brief.performance_analytics.date || "unknown"}${brief.performance_analytics.stale ? " (stale)" : ""}`,
          `Report: ${brief.performance_analytics.path}`,
          `Summary: impressions=${brief.performance_analytics.summary?.impressions ?? "unknown"}, comments=${brief.performance_analytics.summary?.comments ?? "unknown"}, shares=${brief.performance_analytics.summary?.shares ?? "unknown"}, post_checks=${brief.performance_analytics.post_checks}`,
        ].join("\n")
      : "No current performance report found.",
    "",
    "## Post Metrics Harvester",
    "",
    brief.post_metrics_harvester
      ? [
          `Status: ${brief.post_metrics_harvester.status}`,
          `Report: ${brief.post_metrics_harvester.path}`,
          `Coverage: trusted=${brief.post_metrics_harvester.trusted_count}/${brief.post_metrics_harvester.target_count}, blocked=${brief.post_metrics_harvester.blocked_count}`,
          "",
          "| Platform | Targets | Trusted | Blocked |",
          "|---|---:|---:|---:|",
          ...(brief.post_metrics_harvester.platform_counts || []).map((item) => `| ${tableCell(item.platform)} | ${item.total} | ${item.trusted} | ${item.blocked} |`),
          "",
          "| Trusted Source | Platform | Metrics | Request |",
          "|---|---|---|---|",
          ...((brief.post_metrics_harvester.top_trusted || []).length
            ? brief.post_metrics_harvester.top_trusted.map((item) => {
                const metrics = Object.entries(item.metrics || {}).map(([key, value]) => `${key}=${value}`).join(", ") || "none";
                return `| ${tableCell(item.source)} | ${tableCell(item.platform)} | ${tableCell(metrics)} | ${tableCell(item.request_id)} |`;
              })
            : ["| none | none | none | none |"]),
          "",
          "| Blocker | Count |",
          "|---|---:|",
          ...((brief.post_metrics_harvester.top_blockers || []).length
            ? brief.post_metrics_harvester.top_blockers.slice(0, 5).map((item) => `| ${tableCell(item.blocker)} | ${item.count} |`)
            : ["| none | 0 |"]),
        ].join("\n")
      : "No current post metrics harvester report found.",
    "",
    "## LinkedIn Snapshot Evidence",
    "",
    brief.linkedin_snapshot_evidence
      ? [
          `Status: ${brief.linkedin_snapshot_evidence.status}`,
          `Report: ${brief.linkedin_snapshot_evidence.path}`,
          `Targets: ${brief.linkedin_snapshot_evidence.target_count}`,
          `Snapshots: ${brief.linkedin_snapshot_evidence.snapshot_count}`,
        ].join("\n")
      : "No LinkedIn snapshot plan or run found.",
    "",
    "## LinkedIn Creator Export Evidence",
    "",
    brief.linkedin_creator_export_report
      ? [
          `Status: ${brief.linkedin_creator_export_report.status}`,
          `Report: ${brief.linkedin_creator_export_report.path}`,
          `Rows: ${brief.linkedin_creator_export_report.rows}`,
          `Matched rows: ${brief.linkedin_creator_export_report.matched_rows}`,
          `Snapshots: ${brief.linkedin_creator_export_report.snapshots_written}`,
          `Impressions: ${brief.linkedin_creator_export_report.metrics?.impressions ?? 0}`,
          `Interactions: ${brief.linkedin_creator_export_report.metrics?.interactions ?? 0}`,
          `Reached members: ${brief.linkedin_creator_export_report.creator_summary?.reached_members ?? "unknown"}`,
          `Followers total: ${brief.linkedin_creator_export_report.creator_summary?.followers_total ?? "unknown"}`,
          `New followers: ${brief.linkedin_creator_export_report.creator_summary?.new_followers_total ?? "unknown"}`,
          brief.linkedin_creator_export_report.creator_summary?.top_day
            ? `Top day: ${brief.linkedin_creator_export_report.creator_summary.top_day.date} (${brief.linkedin_creator_export_report.creator_summary.top_day.impressions} impressions, ${brief.linkedin_creator_export_report.creator_summary.top_day.interactions} interactions)`
            : null,
        ].filter(Boolean).join("\n")
      : "No same-date LinkedIn Creator export report found.",
    "",
    "## LinkedIn Creator Export Pull",
    "",
    `Status: ${brief.linkedin_creator_export_action.status}`,
    `Analytics URL: ${brief.linkedin_creator_export_action.analytics_url}`,
    `Export shortcut: ${brief.linkedin_creator_export_action.export_anchor_url}`,
    `Workspace: ${brief.linkedin_creator_export_action.workspace}`,
    `Command: cd ${brief.linkedin_creator_export_action.workspace} && ${brief.linkedin_creator_export_action.command}`,
    `Manual file import: cd ${brief.linkedin_creator_export_action.workspace} && ${brief.linkedin_creator_export_action.manual_file_command}`,
    `Follow-up: cd ${brief.linkedin_creator_export_action.workspace} && ${brief.linkedin_creator_export_action.follow_up_command}`,
    `Founder report: ${brief.linkedin_creator_export_action.mh_dev_report}`,
    `Raw archive: ${brief.linkedin_creator_export_action.mh_dev_raw_archive_dir}`,
    `Timeout: ${brief.linkedin_creator_export_action.timeout_minutes} minutes`,
    `Latest-download window: ${brief.linkedin_creator_export_action.max_download_age_minutes} minutes`,
    "Operator step: if a valid export is already in Downloads, the runner imports it; otherwise, after the browser opens LinkedIn Creator Analytics content, click Export/Exportieren and save the XLSX/CSV in Downloads.",
    "",
    "Reasons:",
    ...brief.linkedin_creator_export_action.reasons.map((reason) => `- ${reason}`),
    "",
    "## Output Inventory",
    "",
    "| Exists | Files | Path |",
    "|---|---:|---|",
    ...brief.output_dirs.map((dir) => `| ${dir.exists ? "yes" : "no"} | ${dir.file_count} | ${tableCell(dir.path)} |`),
    "",
    "## Risks And Gates",
    "",
    ...(brief.blockers.length
      ? brief.blockers.map((item) => `- ${item.line} (${item.source})`)
      : ["- No blocker line found in the reduced evidence slice."]),
    "",
    "## Next Dispatches",
    "",
    ...brief.next_dispatches.map((item) => `- ${item}`),
    "",
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

export function defaultOutputPaths({ companyRoot = DEFAULT_COMPANY_ROOT, date = localDate() } = {}) {
  const outputDir = path.join(companyRoot, "reports", "marketing", "morning-briefs", date);
  return {
    outputDir,
    markdownPath: path.join(outputDir, "cmo-morning-brief.md"),
    jsonPath: path.join(outputDir, "cmo-morning-brief.json"),
  };
}

export function hasMorningBriefForDate(comments = [], date) {
  const pattern = new RegExp(`morning\\.brief:[\\s\\S]*date:\\s*${date.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
  return Boolean(findMorningBriefCommentForDate(comments, date, pattern));
}

export function findMorningBriefCommentForDate(comments = [], date, pattern = null) {
  const matcher = pattern || new RegExp(`morning\\.brief:[\\s\\S]*date:\\s*${date.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
  return (comments || []).find((comment) => {
    const body = comment.comment_stripped || comment.comment_html || "";
    return matcher.test(String(body));
  }) || null;
}
