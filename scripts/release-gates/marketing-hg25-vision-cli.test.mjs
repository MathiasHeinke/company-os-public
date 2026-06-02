import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(__dirname, "marketing-hg25-vision.mjs");

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hg25-vision-cli-"));
  const mediaPath = "marketing/daily-editorial/2026-05-24/07-final/01-topic/image.png";
  write(path.join(root, mediaPath), png(1080, 1080));
  const schedulePath = path.join(root, "marketing/daily-editorial/2026-05-24/09-upload-post/scheduled-jobs.json");
  write(schedulePath, `${JSON.stringify({
    date: "2026-05-24",
    pipeline: "editorial",
    status: "scheduled",
    live: true,
    results: [{
      id: "01-topic-linkedin",
      request_id: "ares-2026-05-24-01-topic-linkedin",
      job_id: "job-123",
      scheduled_for: "2026-05-25T09:00:00",
      channel: "linkedin",
      endpoint: "/api/upload_photos",
      media_paths: [mediaPath],
    }],
  }, null, 2)}\n`);
  return { root, schedulePath };
}

function runCli(args) {
  const stdout = execFileSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
  });
  return JSON.parse(stdout);
}

test("CLI writes per-run output by default and preserves canonical packet", () => {
  const { root, schedulePath } = fixture();
  const canonical = path.join(root, "reports/vision-release-packet.md");
  write(canonical, "canonical");

  const result = runCli([
    "--workspace-root", root,
    "--schedule", schedulePath,
    "--output", canonical,
    "--run-id", "cli-default",
    "--json",
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.per_run_output, true);
  assert.equal(result.canonical_output, canonical);
  assert.notEqual(result.output, canonical);
  assert.match(result.output, /cli-default/);
  assert.equal(fs.readFileSync(canonical, "utf8"), "canonical");
  assert.match(fs.readFileSync(result.output, "utf8"), /Marketing HG-2\.5 Vision Release Packet/);
});

test("CLI overwrites canonical packet only with explicit allow flag", () => {
  const { root, schedulePath } = fixture();
  const canonical = path.join(root, "reports/vision-release-packet.md");
  write(canonical, "canonical");

  const result = runCli([
    "--workspace-root", root,
    "--schedule", schedulePath,
    "--output", canonical,
    "--allow-canonical-overwrite",
    "--json",
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.per_run_output, false);
  assert.equal(result.output, canonical);
  assert.match(fs.readFileSync(canonical, "utf8"), /Marketing HG-2\.5 Vision Release Packet/);
});
