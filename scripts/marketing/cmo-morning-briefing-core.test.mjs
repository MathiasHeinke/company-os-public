import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildCmoMorningBrief,
  collectCmoMorningBriefSignals,
  findMorningBriefCommentForDate,
  hasMorningBriefForDate,
  renderCmoMorningBriefMarkdown,
} from "./cmo-morning-briefing-core.mjs";

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cmo-brief-"));
}

test("collectCmoMorningBriefSignals finds Company.OS reports and dated website outputs", () => {
  const root = tmpDir();
  const companyRoot = path.join(root, "Company.OS");
  const websiteRoot = path.join(root, "[SOURCE_WORKSPACE]");
  fs.mkdirSync(path.join(companyRoot, "reports", "marketing-department-v067"), { recursive: true });
  fs.mkdirSync(path.join(companyRoot, "docs", "operations"), { recursive: true });
  fs.writeFileSync(
    path.join(companyRoot, "reports", "marketing-department-v067", "blog-controller-2026-05-20.md"),
    "Status: PASS_CONTROLLER_READY_BLOG_BLOCKED\n- Blog remains blocked by cron drift.\n",
  );
  fs.writeFileSync(
    path.join(companyRoot, "reports", "marketing-department-v067", "linkedin-brain-health-proof-point-2026-05-20.md"),
    "## Verdict\n\n`KEEP_AS_MARKETING_PATTERN`\n\n- 2,169 impressions\n- 33 reactions\n",
  );
  fs.writeFileSync(
    path.join(companyRoot, "docs", "operations", "atlas-marketing-performance-memory.md"),
    "Status: active learning ledger\n- Treat LinkedIn API zeros as missing metrics.\n",
  );
  fs.mkdirSync(path.join(websiteRoot, "marketing", "daily-editorial", "2026-05-20"), { recursive: true });
  fs.writeFileSync(path.join(websiteRoot, "marketing", "daily-editorial", "2026-05-20", "article.md"), "draft");
  fs.mkdirSync(path.join(websiteRoot, "docs", "audits", "blog-local-content-audit"), { recursive: true });
  fs.writeFileSync(
    path.join(websiteRoot, "docs", "audits", "blog-local-content-audit", "2026-05-20.md"),
    "Status: `pass`\n\n| Slugs | 8 |\n| Blockers | 0 |\n",
  );
  fs.mkdirSync(path.join(companyRoot, "reports", "artifact-truth", "2026-05-20"), { recursive: true });
  fs.writeFileSync(
    path.join(companyRoot, "reports", "artifact-truth", "2026-05-20", "editorial-morning-brief.json"),
    JSON.stringify({ pipeline: "editorial", date: "2026-05-20", status: "blocked", ok: false, blocker_count: 2, warning_count: 1, check_count: 42 }),
  );
  fs.mkdirSync(path.join(websiteRoot, "marketing", "product-desk", "2026-05-20", "08-upload-post"), { recursive: true });
  fs.writeFileSync(
    path.join(websiteRoot, "marketing", "product-desk", "2026-05-20", "08-upload-post", "scheduled-jobs.json"),
    JSON.stringify({
      pipeline: "product",
      status: "scheduled",
      live: true,
      approved: true,
      approval_kind: "standing",
      approval_marker: "standing.md",
      remote_preflight_total: 7,
      results: [{ status: "scheduled", platform: "linkedin" }],
    }),
  );
  fs.mkdirSync(path.join(websiteRoot, "marketing", "performance", "2026-05-19"), { recursive: true });
  fs.writeFileSync(
    path.join(websiteRoot, "marketing", "performance", "2026-05-19", "report.json"),
    JSON.stringify({
      date: "2026-05-19",
      status: "ok",
      summary: { impressions: 30, total_impressions_api: 0, comments: 1, shares: 2 },
      post_metric_totals: { posts_with_metrics: 3 },
      post_analytics: [{ platform: "linkedin", status: 200, error: "Could not fetch LinkedIn post metrics. The token may need reconnection." }],
    }),
  );
  fs.mkdirSync(path.join(websiteRoot, "marketing", "performance", "2026-05-20"), { recursive: true });
  fs.writeFileSync(
    path.join(websiteRoot, "marketing", "performance", "2026-05-20", "post-metrics-harvester.json"),
    JSON.stringify({
      schema_version: "ares-post-metrics-harvester-run/v1",
      date: "2026-05-20",
      status: "metrics_blocked",
      summary: { trusted_posts: 1, likes: 3, comments: 1 },
      records: [
        {
          request_id: "post-reddit",
          platform: "reddit",
          status: "ok",
          post_url: "https://www.reddit.com/r/test/comments/abc/test/",
          best_snapshot: { source: "reddit_public_json", metrics: { score: 2, likes: 2, comments: 1 } },
          blockers: [],
        },
        {
          request_id: "post-linkedin",
          platform: "linkedin",
          status: "metrics_blocked",
          blockers: ["linkedin_browser_snapshot_missing"],
        },
      ],
    }),
  );
  fs.mkdirSync(path.join(websiteRoot, "marketing", "performance", "browser-snapshots", "2026-05-20", "linkedin"), { recursive: true });
  fs.writeFileSync(
    path.join(websiteRoot, "marketing", "performance", "browser-snapshots", "2026-05-20", "linkedin", "snapshot-plan.json"),
    JSON.stringify({
      schema_version: "linkedin-browser-snapshot-plan/v1",
      date: "2026-05-20",
      status: "skipped_requires_live_browser",
      targets: [{ request_id: "post-linkedin", post_url: "https://www.linkedin.com/feed/update/urn:li:share:1/" }],
    }),
  );

  const signals = collectCmoMorningBriefSignals({ companyRoot, aresWebsiteRoot: websiteRoot, date: "2026-05-20" });
  assert.equal(signals.reports.length, 1);
  assert.equal(signals.learning_reports.length, 2);
  assert.equal(signals.learning_reports[0].status, "KEEP_AS_MARKETING_PATTERN");
  assert.deepEqual(signals.learning_reports[0].highlights, ["`KEEP_AS_MARKETING_PATTERN`", "2,169 impressions", "33 reactions"]);
  assert.equal(signals.reports[0].status, "PASS_CONTROLLER_READY_BLOG_BLOCKED");
  assert.equal(signals.blog_audits.length, 1);
  assert.equal(signals.blog_audits[0].status, "`pass`");
  assert.match(signals.blog_audits[0].path, /blog-local-content-audit/);
  assert.equal(signals.dated_output_dirs[0].exists, true);
  assert.equal(signals.dated_output_dirs[0].file_count, 1);
  assert.equal(signals.artifact_truth_reports[0].pipeline, "editorial");
  assert.equal(signals.artifact_truth_reports[0].blocker_count, 2);
  assert.equal(signals.upload_post_schedules[0].scheduled_count, 1);
  assert.equal(signals.upload_post_schedules[0].blockers.length, 1);
  assert.equal(signals.performance_analytics.summary.impressions, 30);
  assert.equal(signals.performance_analytics.stale, true);
  assert.equal(signals.performance_analytics.blockers.length, 3);
  assert.equal(signals.post_metrics_harvester.trusted_count, 1);
  assert.equal(signals.post_metrics_harvester.target_count, 2);
  assert.equal(signals.post_metrics_harvester.platform_counts.find((item) => item.platform === "linkedin").blocked, 1);
  assert.equal(signals.linkedin_snapshot_evidence.target_count, 1);
  assert.equal(signals.linkedin_snapshot_evidence.blockers.length, 1);
  const brief = buildCmoMorningBrief({ signals, generatedAt: "2026-05-20T08:00:00.000Z" });
  assert.equal(brief.linkedin_creator_export_action.status, "required");
  assert.equal(brief.linkedin_creator_export_action.required, true);
  assert.match(brief.linkedin_creator_export_action.command, /marketing:linkedin-pull/);
  assert.match(brief.linkedin_creator_export_action.command, /--include-existing-downloads/);
  assert.match(brief.linkedin_creator_export_action.command, /--latest-download/);
  assert.match(brief.linkedin_creator_export_action.command, /--max-download-age-minutes 720/);
  assert.match(brief.linkedin_creator_export_action.command, /--run-post-metrics/);
  assert.match(brief.linkedin_creator_export_action.command, /--post-metrics-max-targets 100/);
  assert.match(brief.linkedin_creator_export_action.command, /--mh-dev-output-root \/Users\/mathiasheinke\/Developer\/[SOURCE_WORKSPACE]\/domains\/marketing\/linkedin/);
  assert.equal(brief.linkedin_creator_export_action.analytics_url, "https://www.linkedin.com/analytics/creator/content/");
  assert.match(brief.linkedin_creator_export_action.export_anchor_url, /Exportieren/);
  assert.match(brief.linkedin_creator_export_action.manual_file_command, /--file ~\/Downloads\/linkedin-posts\.xlsx/);
  assert.match(brief.linkedin_creator_export_action.manual_file_command, /--mh-dev-output-root \/Users\/mathiasheinke\/Developer\/[SOURCE_WORKSPACE]\/domains\/marketing\/linkedin/);
  assert.equal(brief.linkedin_creator_export_action.mh_dev_report, "${LOCAL_WORKSPACE}");
  assert.equal(brief.linkedin_creator_export_action.mh_dev_raw_archive_dir, "${LOCAL_WORKSPACE}");
  assert.equal(brief.linkedin_creator_export_action.max_download_age_minutes, 720);
  assert.match(brief.linkedin_creator_export_action.follow_up_command, /marketing:post-metrics/);
  assert.match(brief.linkedin_creator_export_action.follow_up_command, /--max-targets 100/);
});

test("renderCmoMorningBriefMarkdown emits parseable morning.brief header and blockers", () => {
  const signals = {
    date: "2026-05-20",
    reports: [{ path: "/tmp/blog-controller.md", status: "PASS_CONTROLLER_READY_BLOG_BLOCKED", blockers: ["Blog blocked by billing."] }],
    learning_reports: [{ path: "/tmp/performance-memory.md", status: "KEEP_AS_MARKETING_PATTERN", blockers: [] }],
    blog_audits: [],
    artifact_truth_reports: [{ path: "/tmp/artifact.json", pipeline: "editorial", status: "blocked", blocker_count: 3, warning_count: 1, check_count: 12, blockers: ["editorial Artifact Truth blocked: 3 blocker(s), 1 warning(s)."] }],
    upload_post_schedules: [{ path: "/tmp/scheduled.json", pipeline: "product", status: "scheduled", live: true, approved: true, approval_kind: "standing", scheduled_count: 2, platforms: ["linkedin", "x_article"], blockers: ["Live Upload-Post scheduled 2 job(s) via standing approval marker."] }],
    performance_analytics: { path: "/tmp/performance.json", status: "ok", summary: { impressions: 30, comments: 1, shares: 2 }, post_checks: 5, blockers: ["Performance analytics partial."] },
    post_metrics_harvester: {
      path: "/tmp/post-metrics-harvester.json",
      status: "metrics_blocked",
      target_count: 2,
      trusted_count: 1,
      blocked_count: 1,
      platform_counts: [{ platform: "reddit", total: 1, trusted: 1, blocked: 0 }, { platform: "linkedin", total: 1, trusted: 0, blocked: 1 }],
      top_trusted: [{ request_id: "post-reddit", platform: "reddit", source: "reddit_public_json", metrics: { score: 2, likes: 2, comments: 1 } }],
      top_blockers: [{ blocker: "linkedin_browser_snapshot_missing", count: 1 }],
      blockers: ["LinkedIn post metrics still missing."],
    },
    linkedin_snapshot_evidence: { path: "/tmp/snapshot-plan.json", status: "skipped_requires_live_browser", target_count: 1, snapshot_count: 0, blockers: ["LinkedIn browser snapshot plan pending."] },
    dated_output_dirs: [],
  };
  const brief = buildCmoMorningBrief({ signals, generatedAt: "2026-05-20T08:00:00.000Z" });
  const markdown = renderCmoMorningBriefMarkdown(brief);
  assert.match(markdown, /^morning\.brief:/);
  assert.match(markdown, /date: 2026-05-20/);
  assert.match(markdown, /active_with_blockers/);
  assert.match(markdown, /Blog blocked by billing/);
  assert.match(markdown, /## Learning Inputs/);
  assert.match(markdown, /KEEP_AS_MARKETING_PATTERN/);
  assert.match(markdown, /performance-memory/);
  assert.match(markdown, /## Artifact Truth/);
  assert.match(markdown, /editorial/);
  assert.match(markdown, /## Upload-Post Release Evidence/);
  assert.match(markdown, /standing/);
  assert.match(markdown, /## Performance Analytics/);
  assert.match(markdown, /impressions=30/);
  assert.match(markdown, /Date: unknown/);
  assert.match(markdown, /## Post Metrics Harvester/);
  assert.match(markdown, /trusted=1\/2/);
  assert.match(markdown, /reddit_public_json/);
  assert.match(markdown, /## LinkedIn Snapshot Evidence/);
  assert.match(markdown, /skipped_requires_live_browser/);
  assert.match(markdown, /## LinkedIn Creator Export Pull/);
  assert.match(markdown, /Status: required/);
  assert.match(markdown, /https:\/\/www\.linkedin\.com\/analytics\/creator\/content\//);
  assert.match(markdown, /Export shortcut:/);
  assert.match(markdown, /marketing:linkedin-pull/);
  assert.match(markdown, /--run-post-metrics/);
  assert.match(markdown, /Manual file import:/);
  assert.match(markdown, /Latest-download window: 720 minutes/);
  assert.match(markdown, /Founder report: \/Users\/mathiasheinke\/Developer\/[SOURCE_WORKSPACE]\/domains\/marketing\/linkedin\/2026-05-20_linkedin-performance\.md/);
  assert.match(markdown, /Raw archive: \/Users\/mathiasheinke\/Developer\/[SOURCE_WORKSPACE]\/domains\/marketing\/linkedin\/_raw\/2026-05-20\//);
  assert.match(markdown, /click Export\/Exportieren and save the XLSX\/CSV in Downloads/);
});

test("buildCmoMorningBrief treats imported aggregate LinkedIn export as attribution blocker, not export blocker", () => {
  const signals = {
    date: "2026-05-24",
    company_root: "/tmp/company",
    ares_website_root: "/tmp/website",
    reports: [],
    learning_reports: [],
    blog_audits: [],
    artifact_truth_reports: [],
    upload_post_schedules: [],
    performance_analytics: null,
    post_metrics_harvester: {
      path: "/tmp/website/marketing/performance/2026-05-24/post-metrics-harvester.json",
      status: "metrics_blocked",
      platform_counts: [{ platform: "linkedin", total: 30, trusted: 0, blocked: 30 }],
      blockers: ["LinkedIn post metrics still missing for 30 target(s); browser/manual snapshot evidence remains required."],
    },
    linkedin_snapshot_evidence: null,
    linkedin_creator_export_report: {
      path: "/tmp/website/marketing/performance/linkedin/2026-05-24_linkedin-performance.json",
      status: "blocked_no_matches",
      rows: 50,
      matched_rows: 0,
      snapshots_written: 0,
      metrics: { impressions: 7243, interactions: 162 },
      creator_summary: {
        reached_members: 3642,
        followers_total: 9545,
        new_followers_total: 99,
        top_day: { date: "2026-05-21", impressions: 1585, interactions: 43 },
      },
    },
    dated_output_dirs: [],
  };

  const brief = buildCmoMorningBrief({ signals, generatedAt: "2026-05-24T08:00:00.000Z" });
  assert.equal(brief.linkedin_creator_export_action.status, "aggregate_imported_post_level_blocked");
  assert.equal(brief.linkedin_creator_export_action.required, false);
  assert.match(brief.next_dispatches.join("\n"), /Repair LinkedIn post URL\/request_id attribution/);
  assert.match(brief.blockers.map((item) => item.line).join("\n"), /50 row\(s\), 0 matched/);

  const markdown = renderCmoMorningBriefMarkdown(brief);
  assert.match(markdown, /LinkedIn Creator Export Evidence/);
  assert.match(markdown, /Reached members: 3642/);
  assert.match(markdown, /Top day: 2026-05-21/);
});

test("buildCmoMorningBrief treats partial LinkedIn Creator export matches as remaining attribution blocker", () => {
  const signals = {
    date: "2026-05-24",
    company_root: "/tmp/company",
    ares_website_root: "/tmp/website",
    reports: [],
    learning_reports: [],
    blog_audits: [],
    artifact_truth_reports: [],
    upload_post_schedules: [],
    performance_analytics: null,
    post_metrics_harvester: {
      path: "/tmp/website/marketing/performance/2026-05-24/post-metrics-harvester.json",
      status: "metrics_blocked",
      platform_counts: [{ platform: "linkedin", total: 29, trusted: 6, blocked: 23 }],
      top_trusted: [{ request_id: "post-linkedin", platform: "linkedin", source: "linkedin_creator_export", metrics: { impressions: 51 } }],
      blockers: ["LinkedIn post metrics still missing for 23 target(s); attribution repair remains required."],
    },
    linkedin_snapshot_evidence: null,
    linkedin_creator_export_report: {
      path: "/tmp/website/marketing/performance/linkedin/2026-05-24_linkedin-performance.json",
      status: "partial_unmatched_rows",
      rows: 50,
      matched_rows: 7,
      snapshots_written: 7,
      metrics: { impressions: 353, interactions: 2 },
      creator_summary: {
        reached_members: 3642,
        followers_total: 9545,
        new_followers_total: 99,
      },
    },
    dated_output_dirs: [],
  };

  const brief = buildCmoMorningBrief({ signals, generatedAt: "2026-05-24T08:00:00.000Z" });
  assert.equal(brief.linkedin_creator_export_action.status, "partial_imported_post_level_blocked");
  assert.equal(brief.linkedin_creator_export_action.required, false);
  assert.match(brief.linkedin_creator_export_action.reasons.join("\n"), /23\/29 LinkedIn target/);
  assert.match(brief.next_dispatches.join("\n"), /Repair LinkedIn post URL\/request_id attribution/);
  assert.match(brief.blockers.map((item) => item.line).join("\n"), /50 row\(s\), 7 matched/);
});

test("buildCmoMorningBrief treats current linkedin_creator_export rows as imported", () => {
  const signals = {
    date: "2026-05-20",
    ares_website_root: "/tmp/[SOURCE_WORKSPACE]",
    reports: [],
    learning_reports: [
      {
        path: "/tmp/company/docs/operations/atlas-marketing-performance-memory.md",
        blockers: [
          "LinkedIn remains mostly blocked, but public fetch can bridge it.",
          "X remains blocked until token reconnect.",
          "Claim Safety: preserve the blocked-claim section before copy is approved.",
        ],
      },
    ],
    blog_audits: [],
    artifact_truth_reports: [],
    upload_post_schedules: [],
    performance_analytics: {
      path: "/tmp/ares/marketing/performance/2026-05-20/report.json",
      blockers: ["Upload-Post analytics returned 2 HTTP error row(s)."],
    },
    post_metrics_harvester: {
      status: "ok",
      target_count: 3,
      trusted_count: 3,
      blocked_count: 0,
      platform_counts: [
        { platform: "linkedin", total: 1, trusted: 1, blocked: 0 },
        { platform: "x", total: 1, trusted: 1, blocked: 0 },
        { platform: "reddit", total: 1, trusted: 1, blocked: 0 },
      ],
      top_trusted: [{ request_id: "post-linkedin", platform: "linkedin", source: "linkedin_creator_export", metrics: { impressions: 1200 } }],
      blockers: [],
    },
    linkedin_snapshot_evidence: null,
    dated_output_dirs: [],
  };
  const brief = buildCmoMorningBrief({ signals, generatedAt: "2026-05-20T08:00:00.000Z" });
  assert.equal(brief.linkedin_creator_export_action.status, "imported");
  assert.equal(brief.linkedin_creator_export_action.required, false);
  assert.ok(!brief.blockers.some((item) => item.source === "linkedin_creator_export_action"));
  assert.ok(!brief.blockers.some((item) => /LinkedIn remains mostly blocked/i.test(item.line)));
  assert.ok(!brief.blockers.some((item) => /X remains blocked/i.test(item.line)));
  assert.ok(!brief.blockers.some((item) => /Upload-Post analytics returned/i.test(item.line)));
  assert.ok(brief.blockers.some((item) => /Claim Safety/i.test(item.line)));
  assert.ok(!brief.learning_reports[0].blockers.some((line) => /LinkedIn remains mostly blocked|X remains blocked/i.test(line)));
  assert.deepEqual(brief.performance_analytics.blockers, []);
});

test("hasMorningBriefForDate prevents duplicate daily Plane comments", () => {
  const comments = [
    { id: "comment-1", comment_stripped: "morning.brief:\n  version: cmo-morning-brief/v0\n  date: 2026-05-20\n" },
  ];
  assert.equal(hasMorningBriefForDate(comments, "2026-05-20"), true);
  assert.equal(hasMorningBriefForDate(comments, "2026-05-21"), false);
  assert.equal(findMorningBriefCommentForDate(comments, "2026-05-20").id, "comment-1");
  assert.equal(findMorningBriefCommentForDate(comments, "2026-05-21"), null);
});
