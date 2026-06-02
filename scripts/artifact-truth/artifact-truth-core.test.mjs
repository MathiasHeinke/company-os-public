import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  parseStageList,
  renderArtifactTruthMarkdown,
  verifyAresMarketingArtifacts,
} from "./artifact-truth-core.mjs";

function write(filePath, content = "ok\n") {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function writeJson(filePath, value) {
  write(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writePng(filePath) {
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.concat([pngSignature, Buffer.alloc(5000)]));
}

function makeEditorialFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-truth-editorial-"));
  const date = "2026-05-07";
  const runRoot = path.join(root, "marketing", "daily-editorial", date);
  const itemId = "01-test-item";
  writeJson(path.join(root, "marketing", "daily-editorial", "_latest.json"), { date, run_folder: `marketing/daily-editorial/${date}` });
  writeJson(path.join(runRoot, "manifest.json"), {
    date,
    run_folder: `marketing/daily-editorial/${date}`,
    policy: { distribution_language: "en" },
    items: [
      {
        id: itemId,
        article_path: `marketing/daily-editorial/${date}/02-articles/${itemId}/article.md`,
        source_table_path: `marketing/daily-editorial/${date}/02-articles/${itemId}/source-table.md`,
        seo_path: `marketing/daily-editorial/${date}/02-articles/${itemId}/seo.md`,
        x_path: `marketing/daily-editorial/${date}/03-social/${itemId}/x-5x5.md`,
        linkedin_path: `marketing/daily-editorial/${date}/03-social/${itemId}/linkedin.md`,
        reddit_path: `marketing/daily-editorial/${date}/03-social/${itemId}/reddit.md`,
        visual_brief_path: `marketing/daily-editorial/${date}/04-assets/${itemId}/visual-brief.md`,
      },
    ],
  });

  for (const relativePath of [
    `marketing/daily-editorial/${date}/02-articles/${itemId}/article.md`,
    `marketing/daily-editorial/${date}/02-articles/${itemId}/source-table.md`,
    `marketing/daily-editorial/${date}/02-articles/${itemId}/seo.md`,
    `marketing/daily-editorial/${date}/03-social/${itemId}/x-5x5.md`,
    `marketing/daily-editorial/${date}/03-social/${itemId}/linkedin.md`,
    `marketing/daily-editorial/${date}/03-social/${itemId}/reddit.md`,
    `marketing/daily-editorial/${date}/04-assets/${itemId}/visual-brief.md`,
    `marketing/daily-editorial/${date}/07-final/${itemId}/article-final.md`,
    `marketing/daily-editorial/${date}/07-final/${itemId}/scientific-brief.md`,
    `marketing/daily-editorial/${date}/07-final/${itemId}/visual-final.md`,
    `marketing/daily-editorial/${date}/07-final/${itemId}/seo-final.md`,
    `marketing/daily-editorial/${date}/07-final/${itemId}/x-final.en.md`,
    `marketing/daily-editorial/${date}/07-final/${itemId}/linkedin-final.en.md`,
    `marketing/daily-editorial/${date}/07-final/${itemId}/image.png`,
  ]) {
    if (relativePath.endsWith("/image.png")) {
      writePng(path.join(root, relativePath));
    } else if (relativePath.includes("source-table")) {
      write(path.join(root, relativePath), "Source: https://example.com/study\n");
    } else {
      write(path.join(root, relativePath));
    }
  }

  writeJson(path.join(runRoot, "10-eval-gate", "eval-report.json"), {
    status: "passed",
    result: {
      ok_to_schedule: true,
      piece_results: [{ piece_id: itemId, decision: "publish_ready" }],
      image_results: [{ piece_id: itemId, decision: "usable" }],
    },
  });
  writeJson(path.join(runRoot, "09-upload-post", "scheduled-jobs.json"), {
    date,
    status: "scheduled",
    live: true,
    results: [
      {
        id: `${itemId}-x_article`,
        item_id: itemId,
        status: "scheduled",
        job_id: "job-1",
        media_paths: [`marketing/daily-editorial/${date}/07-final/${itemId}/image.png`],
      },
    ],
  });

  return { root, date, itemId };
}

test("verifyAresMarketingArtifacts passes a complete editorial fixture", () => {
  const { root } = makeEditorialFixture();
  const report = verifyAresMarketingArtifacts({
    workspaceRoot: root,
    pipeline: "editorial",
    date: "latest",
  });

  assert.equal(report.ok, true);
  assert.equal(report.status, "passed");
  assert.equal(report.blocker_count, 0);
});

test("verifyAresMarketingArtifacts blocks missing final images", () => {
  const { root, date, itemId } = makeEditorialFixture();
  fs.unlinkSync(path.join(root, "marketing", "daily-editorial", date, "07-final", itemId, "image.png"));

  const report = verifyAresMarketingArtifacts({
    workspaceRoot: root,
    pipeline: "editorial",
    date,
  });

  assert.equal(report.ok, false);
  assert.ok(report.checks.some((check) => check.id === "image.file" && check.status === "block"));
  assert.ok(report.checks.some((check) => check.id === "scheduler.media" && check.status === "block"));
});

test("verifyAresMarketingArtifacts blocks eval reports that do not pass", () => {
  const { root, date } = makeEditorialFixture();
  writeJson(path.join(root, "marketing", "daily-editorial", date, "10-eval-gate", "eval-report.json"), {
    status: "blocked_or_review_required",
    result: { ok_to_schedule: false, piece_results: [], image_results: [] },
  });

  const report = verifyAresMarketingArtifacts({
    workspaceRoot: root,
    pipeline: "editorial",
    date,
    stages: parseStageList("manifest,eval"),
  });

  assert.equal(report.ok, false);
  assert.ok(report.checks.some((check) => check.id === "eval.status" && check.status === "block"));
  assert.ok(report.checks.some((check) => check.id === "eval.ok_to_schedule" && check.status === "block"));
});

test("verifyAresMarketingArtifacts supports product dry-run verification", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-truth-product-"));
  const date = "2026-05-07";
  const itemId = "01-product-item";
  const runRoot = path.join(root, "marketing", "product-desk", date);
  writeJson(path.join(root, "marketing", "product-desk", "_latest.json"), { date, run_folder: `marketing/product-desk/${date}` });
  writeJson(path.join(runRoot, "manifest.json"), {
    date,
    run_folder: `marketing/product-desk/${date}`,
    items: [
      {
        id: itemId,
        insight_path: `marketing/product-desk/${date}/02-product-insights/${itemId}/insight.md`,
        narrative_angles_path: `marketing/product-desk/${date}/03-narrative-angles/${itemId}/angles.md`,
        x_path: `marketing/product-desk/${date}/04-social/${itemId}/x-5x5.md`,
        linkedin_path: `marketing/product-desk/${date}/04-social/${itemId}/linkedin.md`,
        reddit_path: `marketing/product-desk/${date}/04-social/${itemId}/reddit.md`,
        visual_brief_path: `marketing/product-desk/${date}/04-assets/${itemId}/visual-brief.md`,
      },
    ],
  });
  for (const relativePath of [
    `marketing/product-desk/${date}/02-product-insights/${itemId}/insight.md`,
    `marketing/product-desk/${date}/03-narrative-angles/${itemId}/angles.md`,
    `marketing/product-desk/${date}/04-social/${itemId}/x-5x5.md`,
    `marketing/product-desk/${date}/04-social/${itemId}/linkedin.md`,
    `marketing/product-desk/${date}/04-social/${itemId}/reddit.md`,
    `marketing/product-desk/${date}/04-assets/${itemId}/visual-brief.md`,
    `marketing/product-desk/${date}/06-final/${itemId}/product-brief.md`,
    `marketing/product-desk/${date}/06-final/${itemId}/visual-final.md`,
    `marketing/product-desk/${date}/06-final/${itemId}/x-final.en.md`,
    `marketing/product-desk/${date}/06-final/${itemId}/linkedin-final.en.md`,
    `marketing/product-desk/${date}/06-final/${itemId}/reddit-final.md`,
    `marketing/product-desk/${date}/06-final/${itemId}/image.png`,
  ]) {
    if (relativePath.endsWith("/image.png")) {
      writePng(path.join(root, relativePath));
    } else if (relativePath.includes("/insight.md")) {
      write(path.join(root, relativePath), "Source: docs/wiki/engineering-story.md\n");
    } else {
      write(path.join(root, relativePath));
    }
  }
  writeJson(path.join(runRoot, "08-upload-post", "dry-run-report.json"), {
    date,
    status: "dry_run_ready",
    live: false,
    results: [{ id: `${itemId}-linkedin`, item_id: itemId, status: "dry_run_ready" }],
  });

  const report = verifyAresMarketingArtifacts({
    workspaceRoot: root,
    pipeline: "product",
    date,
    schedulerMode: "dry-run",
  });

  assert.equal(report.ok, true);
});

test("verifyAresMarketingArtifacts blocks require-today mismatches", () => {
  const { root } = makeEditorialFixture();
  const report = verifyAresMarketingArtifacts({
    workspaceRoot: root,
    pipeline: "editorial",
    date: "2026-05-07",
    stages: parseStageList("manifest,freshness"),
    generatedAt: "2026-05-08T10:00:00.000Z",
    requireToday: true,
  });

  assert.equal(report.ok, false);
  assert.ok(report.checks.some((check) => check.id === "freshness.require_today" && check.status === "block"));
});

test("verifyAresMarketingArtifacts blocks missing provenance traces in hard mode", () => {
  const { root, date, itemId } = makeEditorialFixture();
  write(path.join(root, "marketing", "daily-editorial", date, "02-articles", itemId, "source-table.md"), "no trace here\n");
  const report = verifyAresMarketingArtifacts({
    workspaceRoot: root,
    pipeline: "editorial",
    date,
    stages: parseStageList("manifest,provenance"),
  });

  assert.equal(report.ok, false);
  assert.ok(report.checks.some((check) => check.id === "provenance.trace_text" && check.status === "block"));
});

test("verifyAresMarketingArtifacts can enforce max artifact age", () => {
  const { root, date } = makeEditorialFixture();
  const manifestPath = path.join(root, "marketing", "daily-editorial", date, "manifest.json");
  fs.utimesSync(manifestPath, new Date("2026-05-08T08:00:00.000Z"), new Date("2026-05-08T08:00:00.000Z"));
  const report = verifyAresMarketingArtifacts({
    workspaceRoot: root,
    pipeline: "editorial",
    date,
    stages: parseStageList("manifest,freshness"),
    generatedAt: "2026-05-08T10:00:00.000Z",
    maxArtifactAgeHours: 1,
  });

  assert.equal(report.ok, false);
  assert.ok(report.checks.some((check) => check.id === "freshness.max_age" && check.status === "block"));
});

test("renderArtifactTruthMarkdown makes blockers visible", () => {
  const { root, date, itemId } = makeEditorialFixture();
  fs.unlinkSync(path.join(root, "marketing", "daily-editorial", date, "07-final", itemId, "image.png"));
  const report = verifyAresMarketingArtifacts({ workspaceRoot: root, pipeline: "editorial", date });
  const markdown = renderArtifactTruthMarkdown(report);

  assert.match(markdown, /Status: `blocked`/);
  assert.match(markdown, /image.file/);
});
