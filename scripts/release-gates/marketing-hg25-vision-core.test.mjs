import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildVisionReleasePacket,
  derivePerRunOutputPath,
  detectMediaReuse,
  mediaPathsForJob,
  normalizeSchedule,
} from "./marketing-hg25-vision-core.mjs";

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function writeJson(filePath, value) {
  write(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function png(width = 1200, height = 1200) {
  const buffer = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, 4, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 8;
  buffer[25] = 2;
  return buffer;
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hg25-vision-"));
  const mediaPath = "marketing/daily-editorial/2026-05-21/07-final/01-test/image.png";
  write(path.join(root, mediaPath), png(1080, 1080));
  const schedulePath = path.join(root, "marketing/daily-editorial/2026-05-21/09-upload-post/scheduled-jobs.json");
  writeJson(schedulePath, {
    date: "2026-05-21",
    pipeline: "editorial",
    status: "scheduled",
    live: true,
    results: [
      {
        id: "01-test-linkedin",
        request_id: "ares-2026-05-21-01-test-linkedin",
        job_id: "job-123",
        source_run: "marketing/daily-editorial/2026-05-21",
        channel: "linkedin",
        platform: "linkedin",
        scheduled_for: "2026-05-22T11:00:00",
        title: "A visual release card needs the image.",
        endpoint: "/api/upload_photos",
        media_paths: [mediaPath],
        upload_post_submission: {
          form_fields: {
            description: "This is the public body.",
          },
        },
      },
    ],
  });
  return { root, schedulePath, mediaPath };
}

test("normalizeSchedule handles Upload-Post result arrays", () => {
  const schedule = normalizeSchedule({ pipeline: "product", results: [{ id: "a" }] }, "/tmp/product-desk/scheduled-jobs.json");
  assert.equal(schedule.pipeline, "product");
  assert.equal(schedule.jobs.length, 1);
});

test("mediaPathsForJob collects direct and nested media paths", () => {
  assert.deepEqual(mediaPathsForJob({
    media_paths: ["a.png"],
    upload_post_submission: { media_paths: ["b.png"], form_fields: { "photos[]": ["c.png"] } },
    image_path: "d.png",
  }), ["a.png", "b.png", "c.png", "d.png"]);
});

test("buildVisionReleasePacket renders local image evidence and pending HG-2.5 review", () => {
  const { root, schedulePath, mediaPath } = fixture();
  const packet = buildVisionReleasePacket({
    workspaceRoot: root,
    schedulePaths: [schedulePath],
    now: new Date("2026-05-21T10:00:00.000Z"),
  });

  assert.equal(packet.ok, true);
  assert.equal(packet.summary.status, "PENDING_HG25_VISION_REVIEW");
  assert.equal(packet.summary.jobs_total, 1);
  assert.equal(packet.summary.jobs_requiring_visual_review, 1);
  assert.match(packet.markdown, /visual_review:/);
  assert.match(packet.markdown, /creative_quality_review:/);
  assert.match(packet.markdown, /## Creative Quality Rubric/);
  assert.match(packet.markdown, /Brand fit/);
  assert.match(packet.markdown, /verdict: PENDING/);
  assert.match(packet.markdown, /Creative QA: `PENDING`/);
  assert.match(packet.markdown, new RegExp(mediaPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(packet.markdown, /1080x1080/);
  assert.match(packet.markdown, /human_gate\.released:/);
  assert.match(packet.markdown, /creative_quality_verdict: PASS \| NEEDS_REVISION \| BLOCK/);
});

test("buildVisionReleasePacket blocks missing media", () => {
  const { root, schedulePath, mediaPath } = fixture();
  fs.unlinkSync(path.join(root, mediaPath));
  const packet = buildVisionReleasePacket({
    workspaceRoot: root,
    schedulePaths: [schedulePath],
    now: new Date("2026-05-21T10:00:00.000Z"),
  });

  assert.equal(packet.ok, false);
  assert.equal(packet.summary.status, "BLOCKED");
  assert.ok(packet.summary.blockers.some((entry) => entry.includes("missing media")));
});

test("buildVisionReleasePacket filters past jobs by default", () => {
  const { root, schedulePath } = fixture();
  const packet = buildVisionReleasePacket({
    workspaceRoot: root,
    schedulePaths: [schedulePath],
    now: new Date("2026-05-23T10:00:00.000Z"),
  });

  assert.equal(packet.summary.jobs_total, 0);
});

test("buildVisionReleasePacket keeps same-day future jobs by default", () => {
  const { root, schedulePath } = fixture();
  const packet = buildVisionReleasePacket({
    workspaceRoot: root,
    schedulePaths: [schedulePath],
    now: new Date("2026-05-22T10:00:00.000Z"),
  });

  assert.equal(packet.summary.jobs_total, 1);
  assert.equal(packet.summary.jobs_rendered, 1);
});

function reuseFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hg25-vision-reuse-"));
  const mediaPath = "marketing/daily-editorial/2026-05-21/07-final/shared/image.png";
  write(path.join(root, mediaPath), png(1080, 1080));
  const schedulePath = path.join(root, "marketing/daily-editorial/2026-05-21/09-upload-post/scheduled-jobs.json");
  writeJson(schedulePath, {
    date: "2026-05-21",
    pipeline: "editorial",
    status: "scheduled",
    live: true,
    results: [
      {
        id: "01-topic-a-linkedin",
        request_id: "ares-2026-05-21-01-topic-a-linkedin",
        scheduled_for: "2026-05-22T11:00:00",
        channel: "linkedin",
        endpoint: "/api/upload_photos",
        media_paths: [mediaPath],
      },
      {
        id: "02-topic-b-linkedin",
        request_id: "ares-2026-05-21-02-topic-b-linkedin",
        scheduled_for: "2026-05-22T13:00:00",
        channel: "linkedin",
        endpoint: "/api/upload_photos",
        media_paths: [mediaPath],
      },
    ],
  });
  return { root, schedulePath, mediaPath };
}

test("detectMediaReuse surfaces identical sha256 spanning distinct request_id topics", () => {
  const media = [
    { exists: true, sha256: "abc123", relative_path: "a.png" },
  ];
  const reuses = detectMediaReuse([
    { request_id: "topic-a", media },
    { request_id: "topic-b", media },
  ]);
  assert.equal(reuses.length, 1);
  assert.equal(reuses[0].sha256, "abc123");
  assert.deepEqual(reuses[0].topics, ["topic-a", "topic-b"]);
  assert.deepEqual(reuses[0].media_paths, ["a.png"]);
});

test("detectMediaReuse ignores duplicate media inside a single topic", () => {
  const media = [{ exists: true, sha256: "abc123", relative_path: "a.png" }];
  const reuses = detectMediaReuse([
    { request_id: "topic-a", media },
    { request_id: "topic-a", media },
  ]);
  assert.equal(reuses.length, 0);
});

test("detectMediaReuse skips missing or unhashed media", () => {
  const reuses = detectMediaReuse([
    { request_id: "topic-a", media: [{ exists: false, sha256: "x", relative_path: "a.png" }] },
    { request_id: "topic-b", media: [{ exists: true, sha256: "", relative_path: "b.png" }] },
  ]);
  assert.equal(reuses.length, 0);
});

test("buildVisionReleasePacket warns when one media hash spans distinct request_id topics", () => {
  const { root, schedulePath, mediaPath } = reuseFixture();
  const packet = buildVisionReleasePacket({
    workspaceRoot: root,
    schedulePaths: [schedulePath],
    now: new Date("2026-05-22T10:00:00.000Z"),
  });

  assert.equal(packet.ok, true);
  assert.equal(packet.summary.media_reuse.length, 1);
  const reuse = packet.summary.media_reuse[0];
  assert.deepEqual(reuse.topics, [
    "ares-2026-05-21-01-topic-a-linkedin",
    "ares-2026-05-21-02-topic-b-linkedin",
  ]);
  assert.deepEqual(reuse.media_paths, [mediaPath]);
  assert.ok(packet.summary.warnings.some((w) => w.startsWith("media hash reused across distinct topics")));
  assert.match(packet.markdown, /## Media Reuse Across Topics/);
  assert.match(packet.markdown, /ares-2026-05-21-01-topic-a-linkedin/);
});

test("buildVisionReleasePacket reports empty media_reuse when topics are unique", () => {
  const { root, schedulePath } = fixture();
  const packet = buildVisionReleasePacket({
    workspaceRoot: root,
    schedulePaths: [schedulePath],
    now: new Date("2026-05-22T10:00:00.000Z"),
  });

  assert.deepEqual(packet.summary.media_reuse, []);
  assert.ok(!packet.markdown.includes("## Media Reuse Across Topics"));
});

test("derivePerRunOutputPath inserts a run stamp before the extension", () => {
  const out = derivePerRunOutputPath(
    "/abs/reports/vision-release-packet.md",
    { runId: "8196581d", generatedAt: "2026-05-23T07:08:09.000Z" },
  );
  assert.notEqual(out, "/abs/reports/vision-release-packet.md");
  assert.ok(out.startsWith("/abs/reports/vision-release-packet."));
  assert.ok(out.endsWith(".md"));
  assert.ok(out.includes("8196581d"));
});

test("derivePerRunOutputPath keeps distinct runs from colliding with the canonical path", () => {
  const canonical = "/abs/reports/vision-release-packet.md";
  const a = derivePerRunOutputPath(canonical, { runId: "run-a", generatedAt: "2026-05-23T07:00:00.000Z" });
  const b = derivePerRunOutputPath(canonical, { runId: "run-b", generatedAt: "2026-05-23T07:00:00.000Z" });
  assert.notEqual(a, canonical);
  assert.notEqual(b, canonical);
  assert.notEqual(a, b);
});

test("derivePerRunOutputPath returns the base path when no stamp source is provided", () => {
  assert.equal(
    derivePerRunOutputPath("/abs/reports/vision-release-packet.md", {}),
    "/abs/reports/vision-release-packet.md",
  );
});

test("derivePerRunOutputPath written files do not overwrite a canonical packet on disk", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hg25-vision-output-"));
  const canonical = path.join(dir, "vision-release-packet.md");
  fs.writeFileSync(canonical, "canonical");
  const perRun = derivePerRunOutputPath(canonical, {
    runId: "8196581d",
    generatedAt: "2026-05-23T07:08:09.000Z",
  });
  fs.writeFileSync(perRun, "per-run");
  assert.equal(fs.readFileSync(canonical, "utf8"), "canonical");
  assert.equal(fs.readFileSync(perRun, "utf8"), "per-run");
  assert.notEqual(perRun, canonical);
});
