import fs from "node:fs";
import path from "node:path";

export const VIDEO_FIRST_CONTENT_ENGINE_START_VERSION = "video-first-content-engine-start/v0";

export const VIDEO_ENGINE_FOLDERS = Object.freeze([
  ["01_inbox_raw", "Raw operator drops only. Put the first test video here."],
  ["02_processing", "Working copies, transcripts, segments and processing notes."],
  ["03_review_required", "HG-3/HG-4, private, regulated or blocked packages."],
  ["04_publish_ready", "Reviewed dry-run publish packages only; not auto-published."],
  ["05_clips", "Clip plans and optional local clip files."],
  ["06_reports", "Risk reports, scorecards, gate output and learning proposals."],
  ["07_archive", "Archived local packages after review or parking."],
]);

const PRIVATE_LITERAL_PATTERNS = Object.freeze([
  /\/Users\/[^/\s]+/i,
  /\bsk-[A-Za-z0-9._-]{20,}\b/,
  /\bsk-or-v1-[A-Za-z0-9._-]+\b/,
]);

function compact(value) {
  return String(value ?? "").trim();
}

function requireSafeText(label, value) {
  const text = compact(value);
  if (!text) throw new Error(`${label} is required`);
  for (const pattern of PRIVATE_LITERAL_PATTERNS) {
    if (pattern.test(text)) throw new Error(`${label} contains a private path or token-shaped literal`);
  }
  return text;
}

function relativeEnginePath(...parts) {
  return path.join("content", "video-engine", ...parts);
}

function file(relativePath, content) {
  return {
    relative_path: relativePath.split(path.sep).join("/"),
    content: `${content.trimEnd()}\n`,
  };
}

function folderReadme(folder, description) {
  return [
    `# ${folder}`,
    "",
    description,
    "",
    "## Stop Rules",
    "",
    "- Do not put secrets, credentials or private unrelated files here.",
    "- Do not publish, upload, schedule, send or spend from this folder.",
    "- Keep raw video immutable; create working copies in `02_processing/`.",
  ].join("\n");
}

function runbook({ company, approvalOwner, date }) {
  return [
    "# Video-First Content Engine Runbook",
    "",
    `Company: ${company}`,
    `Approval Owner: ${approvalOwner}`,
    `Initialized: ${date}`,
    "Mode: dry-run-only",
    "",
    "## First Test",
    "",
    "1. Drop one raw video into `01_inbox_raw/`.",
    "2. Do not edit or delete the raw file.",
    "3. Create processing artifacts in `02_processing/`.",
    "4. Route HG-3/HG-4 material to `03_review_required/`.",
    "5. Put only reviewed dry-run packages in `04_publish_ready/`.",
    "",
    "## HumanGate Routing",
    "",
    "- HG-1/HG-2: normal build logs, product thinking and low-risk commentary.",
    "- HG-2.5: any upload, public publish, schedule or send action.",
    "- HG-3: health, legal, financial, customer, private screen or regulated claims.",
    "- HG-4: medical recommendations, third-party private data or non-restorable legal/brand risk.",
    "",
    "## Blocked Actions",
    "",
    "- no public upload, post, schedule, send or spend",
    "- no publisher API writes",
    "- no secret or browser-cookie reads",
    "- no production writes",
    "- no Done transition by worker or CAO",
  ].join("\n");
}

function configJson({ company, approvalOwner, date }) {
  return JSON.stringify({
    schema_version: VIDEO_FIRST_CONTENT_ENGINE_START_VERSION,
    company,
    approval_owner: approvalOwner,
    initialized_at: `${date}T00:00:00.000Z`,
    mode: "dry-run-only",
    root_policy: "paths are relative to the selected client root",
    engine_root: "content/video-engine",
    inbox_folder: "content/video-engine/01_inbox_raw",
    folders: VIDEO_ENGINE_FOLDERS.map(([name, description]) => ({
      path: `content/video-engine/${name}`,
      description,
    })),
    publisher_policy: {
      youtube: "dry-run-only",
      linkedin: "dry-run-only",
      x: "dry-run-only",
      blog_article: "dry-run-only",
    },
    human_gate_policy: {
      hg1_hg2: "local draft package may continue",
      hg25: "required for upload, public publish, schedule or send",
      hg3: "required for health, legal, finance, customer, private screen or regulated claims",
      hg4: "required for medical recommendations, third-party private data or non-restorable legal/brand risk",
    },
    blocked_actions: [
      "public-upload",
      "public-post",
      "public-schedule",
      "public-send",
      "publisher-api-write",
      "secret-read",
      "production-write",
      "done-transition-by-worker-or-cao",
    ],
  }, null, 2);
}

export function buildVideoFirstContentEngineStartPlan({
  root = process.cwd(),
  company,
  approvalOwner,
  date = new Date().toISOString().slice(0, 10),
} = {}) {
  const normalized = {
    root: path.resolve(root || process.cwd()),
    company: requireSafeText("company", company || "Example Company"),
    approvalOwner: requireSafeText("approvalOwner", approvalOwner || "Founder"),
    date: requireSafeText("date", date),
  };
  const directories = VIDEO_ENGINE_FOLDERS.map(([name, description]) => ({
    relative_path: relativeEnginePath(name).split(path.sep).join("/"),
    description,
  }));
  const files = [
    file(relativeEnginePath("RUNBOOK.md"), runbook(normalized)),
    file(relativeEnginePath("video-engine.config.json"), configJson(normalized)),
    ...VIDEO_ENGINE_FOLDERS.map(([name, description]) => file(relativeEnginePath(name, "README.md"), folderReadme(name, description))),
  ];
  return {
    version: VIDEO_FIRST_CONTENT_ENGINE_START_VERSION,
    date: normalized.date,
    root: normalized.root,
    engine_root: path.join(normalized.root, "content", "video-engine"),
    company: normalized.company,
    approval_owner: normalized.approvalOwner,
    directories,
    files,
    blocked_actions: [
      "public-upload",
      "public-post",
      "public-schedule",
      "public-send",
      "publisher-api-write",
      "secret-read",
      "production-write",
      "done-transition-by-worker-or-cao",
    ],
  };
}

export function writeVideoFirstContentEngineStartPlan(plan, { force = false } = {}) {
  if (!plan?.root || !Array.isArray(plan.directories) || !Array.isArray(plan.files)) {
    throw new Error("valid start plan is required");
  }
  const directories = [];
  const files = [];
  for (const directory of plan.directories) {
    const absolutePath = path.join(plan.root, directory.relative_path);
    const existed = fs.existsSync(absolutePath);
    fs.mkdirSync(absolutePath, { recursive: true });
    directories.push({ ...directory, absolute_path: absolutePath, status: existed ? "kept" : "created" });
  }
  for (const entry of plan.files) {
    const absolutePath = path.join(plan.root, entry.relative_path);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    const existed = fs.existsSync(absolutePath);
    if (!existed || force) {
      fs.writeFileSync(absolutePath, entry.content);
      files.push({ relative_path: entry.relative_path, absolute_path: absolutePath, status: existed ? "overwritten" : "created" });
    } else {
      files.push({ relative_path: entry.relative_path, absolute_path: absolutePath, status: "kept" });
    }
  }
  return {
    version: plan.version,
    root: plan.root,
    engine_root: plan.engine_root,
    directories,
    files,
  };
}
