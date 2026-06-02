import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export const MARKETING_HG25_VISION_VERSION = "marketing-hg25-vision-v0";

export const CREATIVE_QUALITY_DIMENSIONS = [
  {
    key: "brand_fit",
    label: "Brand fit",
    prompt: "Matches the established ATLAS / Company.OS voice, positioning and audience expectation.",
  },
  {
    key: "copy_quality",
    label: "Copy quality",
    prompt: "Clear, platform-appropriate, no obvious typo, grammar, truncation or wrong-language issue.",
  },
  {
    key: "visual_quality",
    label: "Visual quality",
    prompt: "Readable at mobile size, correct aspect ratio, no broken layout, cropping, low contrast or artifacting.",
  },
  {
    key: "claim_safety",
    label: "Claim safety",
    prompt: "No unsupported medical, partnership, performance, legal or founder-voice claim.",
  },
  {
    key: "channel_fit",
    label: "Channel fit",
    prompt: "Suitable for the declared platform, schedule and content lane.",
  },
];

export function readScheduleFile(filePath) {
  const schedule = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return normalizeSchedule(schedule, filePath);
}

export function normalizeSchedule(schedule, filePath = "") {
  const results = Array.isArray(schedule)
    ? schedule
    : Array.isArray(schedule?.results)
      ? schedule.results
      : Array.isArray(schedule?.jobs)
        ? schedule.jobs
        : Array.isArray(schedule?.scheduled_jobs)
          ? schedule.scheduled_jobs
          : [];
  return {
    source_path: filePath,
    date: schedule?.date || "",
    pipeline: schedule?.pipeline || inferPipelineFromPath(filePath),
    status: schedule?.status || "",
    live: Boolean(schedule?.live),
    approval_kind: schedule?.approval_kind || "",
    approval_marker: schedule?.approval_marker || "",
    jobs: results,
  };
}

export function inferPipelineFromPath(filePath = "") {
  const text = String(filePath);
  if (text.includes("/daily-editorial/")) return "editorial";
  if (text.includes("/product-desk/")) return "product";
  return "unknown";
}

export function buildVisionReleasePacket({
  workspaceRoot,
  schedulePaths = [],
  now = new Date(),
  maxJobs = 40,
  includePast = false,
} = {}) {
  if (!workspaceRoot) throw new Error("workspaceRoot is required");
  const schedules = schedulePaths.map(readScheduleFile);
  const jobs = [];
  const blockers = [];
  const warnings = [];
  const nowKey = dateTimeKey(now);

  for (const schedule of schedules) {
    for (const rawJob of schedule.jobs) {
      const scheduledFor = String(rawJob.scheduled_for || rawJob.scheduled_date || rawJob.upload_post_submission?.form_fields?.scheduled_date || "");
      if (!includePast && scheduledFor && dateTimeKey(scheduledFor) < nowKey) continue;
      const mediaPaths = mediaPathsForJob(rawJob);
      const media = mediaPaths.map((relativePath) => inspectMediaPath(workspaceRoot, relativePath));
      for (const item of media) {
        if (!item.exists) blockers.push(`missing media: ${item.relative_path}`);
        else if (!item.valid_image) blockers.push(`invalid image: ${item.relative_path}`);
        else if (item.width < 256 || item.height < 256) warnings.push(`small image: ${item.relative_path} (${item.width}x${item.height})`);
      }
      if (media.length === 0 && expectsMedia(rawJob)) blockers.push(`job expects media but declares none: ${rawJob.request_id || rawJob.id || "unknown"}`);
      jobs.push({
        id: rawJob.id || "",
        request_id: rawJob.request_id || rawJob.upload_post_submission?.form_fields?.request_id || "",
        job_id: rawJob.job_id || rawJob.response?.job_id || "",
        pipeline: schedule.pipeline,
        channel: rawJob.channel || rawJob.platform || platformFromSubmission(rawJob),
        platform: rawJob.platform || rawJob.channel || platformFromSubmission(rawJob),
        profile: rawJob.profile || rawJob.upload_post_profile || rawJob.upload_post_submission?.form_fields?.user || "",
        scheduled_for: scheduledFor,
        timezone: rawJob.timezone || rawJob.upload_post_submission?.form_fields?.timezone || "",
        title: rawJob.title || rawJob.upload_post_submission?.form_fields?.title || "",
        body_excerpt: bodyForJob(rawJob).slice(0, 700),
        source_run: rawJob.source_run || "",
        status: rawJob.status || "",
        endpoint: rawJob.endpoint || rawJob.upload_post_submission?.endpoint || "",
        media,
        content_hash: rawJob.content_hash || "",
        source_path: rawJob.source_path || "",
      });
    }
  }

  jobs.sort((a, b) => String(a.scheduled_for).localeCompare(String(b.scheduled_for)) || String(a.request_id).localeCompare(String(b.request_id)));
  const visibleJobs = jobs.slice(0, maxJobs);
  const truncated = jobs.length > visibleJobs.length;
  const visualJobs = jobs.filter((job) => job.media.length > 0);
  const mediaReuse = detectMediaReuse(jobs);
  for (const reuse of mediaReuse) {
    warnings.push(
      `media hash reused across distinct topics: ${reuse.sha256.slice(0, 12)} -> ${reuse.topics.join(", ")} (${reuse.media_paths.join(", ")})`,
    );
  }
  const summary = {
    version: MARKETING_HG25_VISION_VERSION,
    generated_at: new Date(now).toISOString(),
    workspace_root: workspaceRoot,
    schedule_paths: schedulePaths,
    jobs_total: jobs.length,
    jobs_rendered: visibleJobs.length,
    jobs_requiring_visual_review: visualJobs.length,
    blockers,
    warnings,
    media_reuse: mediaReuse,
    status: blockers.length ? "BLOCKED" : "PENDING_HG25_VISION_REVIEW",
    settlement_recommendation: blockers.length ? "CANCEL_OR_HOLD" : "BACKFILL_WITH_VISUAL_REVIEW",
    truncated,
  };

  return {
    ok: blockers.length === 0,
    summary,
    markdown: renderVisionReleasePacketMarkdown({ summary, jobs: visibleJobs }),
  };
}

export function detectMediaReuse(jobs = []) {
  const byHash = new Map();
  for (const job of jobs) {
    const requestId = String(job.request_id || job.id || "unknown");
    for (const media of Array.isArray(job.media) ? job.media : []) {
      if (!media?.exists || !media?.sha256) continue;
      if (!byHash.has(media.sha256)) byHash.set(media.sha256, new Map());
      const bucket = byHash.get(media.sha256);
      if (!bucket.has(requestId)) bucket.set(requestId, new Set());
      bucket.get(requestId).add(String(media.relative_path || ""));
    }
  }
  const reuses = [];
  for (const [sha256, bucket] of byHash) {
    if (bucket.size < 2) continue;
    const topics = Array.from(bucket.keys()).sort();
    const paths = new Set();
    for (const set of bucket.values()) for (const p of set) paths.add(p);
    reuses.push({ sha256, topics, media_paths: Array.from(paths).sort() });
  }
  reuses.sort((a, b) => a.sha256.localeCompare(b.sha256));
  return reuses;
}

export function derivePerRunOutputPath(basePath, { runId = "", generatedAt = "" } = {}) {
  if (!basePath) return "";
  const ext = path.extname(basePath);
  const stem = ext ? basePath.slice(0, basePath.length - ext.length) : basePath;
  const stampParts = [];
  if (generatedAt) {
    const iso = generatedAt instanceof Date ? generatedAt.toISOString() : String(generatedAt);
    stampParts.push(iso.replace(/[:.]/g, "-").replace(/[TZ]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""));
  }
  if (runId) stampParts.push(String(runId));
  const stamp = stampParts.filter(Boolean).join("-");
  if (!stamp) return basePath;
  return `${stem}.${stamp}${ext}`;
}

export function mediaPathsForJob(job = {}) {
  return unique([
    ...(Array.isArray(job.media_paths) ? job.media_paths : []),
    ...(Array.isArray(job.upload_post_submission?.media_paths) ? job.upload_post_submission.media_paths : []),
    ...(Array.isArray(job.upload_post_submission?.form_fields?.["photos[]"]) ? job.upload_post_submission.form_fields["photos[]"] : []),
    job.image_path,
  ].filter(Boolean));
}

function unique(values) {
  return Array.from(new Set(values.map(String)));
}

function platformFromSubmission(job = {}) {
  const platforms = job.upload_post_submission?.form_fields?.["platform[]"];
  if (Array.isArray(platforms)) return platforms.join(",");
  return "";
}

function bodyForJob(job = {}) {
  const fields = job.upload_post_submission?.form_fields || {};
  return String(fields.linkedin_description || fields.x_title || fields.description || job.description || "");
}

function expectsMedia(job = {}) {
  const endpoint = String(job.endpoint || job.upload_post_submission?.endpoint || "");
  return endpoint.includes("upload_photos") || Boolean(job.image_path);
}

function dateTimeKey(value) {
  if (value instanceof Date) return value.toISOString().replace(/[TZ]/g, " ").slice(0, 19);
  return String(value || "").replace(/[TZ]/g, " ").slice(0, 19);
}

function inspectMediaPath(workspaceRoot, relativePath) {
  const absolutePath = path.isAbsolute(relativePath) ? relativePath : path.join(workspaceRoot, relativePath);
  const state = fileState(absolutePath);
  const png = state.exists ? readPngDimensions(absolutePath) : null;
  const hash = state.exists ? sha256File(absolutePath) : "";
  return {
    relative_path: relativePath,
    absolute_path: absolutePath,
    exists: state.exists,
    bytes: state.bytes,
    sha256: hash,
    type: png ? "png" : state.exists ? "unknown" : "missing",
    valid_image: Boolean(png),
    width: png?.width || 0,
    height: png?.height || 0,
  };
}

function fileState(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return { exists: stats.isFile(), bytes: stats.size };
  } catch {
    return { exists: false, bytes: 0 };
  }
}

function readPngDimensions(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) return null;
    const chunkType = buffer.subarray(12, 16).toString("ascii");
    if (chunkType !== "IHDR") return null;
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  } catch {
    return null;
  }
}

function sha256File(filePath) {
  const hash = createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

export function renderVisionReleasePacketMarkdown({ summary, jobs }) {
  const lines = [
    "# Marketing HG-2.5 Vision Release Packet",
    "",
    "```yaml",
    "marketing.hg25.vision_release:",
    `  version: ${summary.version}`,
    "  release_surface: upload-post",
    "  source_schedule:",
    ...summary.schedule_paths.map((filePath) => `    - ${filePath}`),
    `  jobs_total: ${summary.jobs_total}`,
    `  jobs_rendered: ${summary.jobs_rendered}`,
    `  jobs_requiring_visual_review: ${summary.jobs_requiring_visual_review}`,
    "  visual_review:",
    "    required: true",
    "    verdict: PENDING",
    "    reviewer: CEO/Codex",
    "  creative_quality_review:",
    "    required: true",
    "    verdict: PENDING",
    "    dimensions:",
    ...CREATIVE_QUALITY_DIMENSIONS.map((dimension) => `      - ${dimension.key}`),
    `  settlement_recommendation: ${summary.settlement_recommendation}`,
    "  cancel_path:",
    "    available: true",
    "    instructions: Use Upload-Post job ids/request ids from the table below; do not publish externally until HG-2.5 signs.",
    `  signed_at: ${summary.generated_at}`,
    "```",
    "",
    `Status: **${summary.status}**`,
    "",
  ];

  if (summary.blockers.length) {
    lines.push("## Blockers", "", ...summary.blockers.map((item) => `- ${item}`), "");
  }
  if (summary.warnings.length) {
    lines.push("## Warnings", "", ...summary.warnings.map((item) => `- ${item}`), "");
  }
  if (Array.isArray(summary.media_reuse) && summary.media_reuse.length) {
    lines.push("## Media Reuse Across Topics", "");
    lines.push("Distinct `request_id` topics share identical media hashes. CMO must confirm reuse is intentional before HG-2.5 signs.");
    lines.push("");
    lines.push("| SHA-256 | Topics | Media paths |");
    lines.push("|---|---|---|");
    for (const reuse of summary.media_reuse) {
      lines.push(`| \`${reuse.sha256.slice(0, 12)}\` | ${reuse.topics.join(", ")} | ${reuse.media_paths.join(", ")} |`);
    }
    lines.push("");
  }
  if (summary.truncated) {
    lines.push(`Note: packet truncated to ${summary.jobs_rendered} of ${summary.jobs_total} pending jobs.`, "");
  }

  lines.push("## Creative Quality Rubric", "");
  lines.push("Each rendered job needs an explicit creative-quality verdict before HG-2.5 can sign publication, backfill or hold.");
  lines.push("");
  lines.push("| Dimension | Reviewer question |");
  lines.push("|---|---|");
  for (const dimension of CREATIVE_QUALITY_DIMENSIONS) {
    lines.push(`| ${dimension.label} | ${dimension.prompt} |`);
  }
  lines.push("");
  lines.push("Allowed per-job verdicts: `PASS`, `NEEDS_REVISION`, `BLOCK`.");
  lines.push("");

  lines.push("## Jobs", "");
  for (const job of jobs) {
    lines.push(`### ${job.scheduled_for || "unscheduled"} — ${job.channel || job.platform || "unknown"} — ${job.title || job.request_id || job.id}`);
    lines.push("");
    lines.push(`- Request: \`${job.request_id || "unknown"}\``);
    lines.push(`- Job ID: \`${job.job_id || "none"}\``);
    lines.push(`- Pipeline: \`${job.pipeline}\``);
    lines.push(`- Source run: \`${job.source_run || "unknown"}\``);
    lines.push(`- Endpoint: \`${job.endpoint || "unknown"}\``);
    if (job.body_excerpt) lines.push(`- Copy excerpt: ${job.body_excerpt.replace(/\s+/g, " ").trim()}`);
    lines.push("- Creative QA: `PENDING`");
    lines.push("");
    if (job.media.length) {
      lines.push("| Media | State | Dimensions | Bytes | SHA-256 |");
      lines.push("|---|---|---:|---:|---|");
      for (const media of job.media) {
        lines.push(`| ![](${media.absolute_path})<br><code>${media.relative_path}</code> | ${media.exists && media.valid_image ? "PASS" : "BLOCK"} | ${media.width}x${media.height} | ${media.bytes} | \`${media.sha256.slice(0, 12)}\` |`);
      }
      lines.push("");
    } else {
      lines.push("_No media declared._", "");
    }
  }

  lines.push("## Decision Template", "");
  lines.push("```yaml");
  lines.push("human_gate.released:");
  lines.push("  level: HG-2.5");
  lines.push("  verdict: APPROVE_REVIEW_CALENDAR | BACKFILL_WITH_VISUAL_REVIEW | CANCEL_OR_HOLD");
  lines.push("  visual_review_verdict: PASS | NEEDS_REVISION | BLOCK");
  lines.push("  creative_quality_verdict: PASS | NEEDS_REVISION | BLOCK");
  lines.push("  reviewed_artifacts:");
  lines.push("    - <absolute image or packet path>");
  lines.push("  reason: <short decision>");
  lines.push("  signed_at: <ISO-8601>");
  lines.push("```");
  lines.push("");
  return `${lines.join("\n")}\n`;
}
