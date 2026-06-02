import fs from "node:fs";
import path from "node:path";

export const BOOK_AUTHORING_START_VERSION = "book-authoring-start/v0";

export const BOOK_AUTHORING_FOLDERS = Object.freeze([
  ["00_book_spec", "BookSpec, founder decisions and HG-4 direction evidence."],
  ["01_fvbm", "Founder Voice and Belief Model seed, StyleProfile and correction notes."],
  ["02_research", "Discovery dossier, source map, debate map and open questions."],
  ["03_frame_outline", "Frame Brief, outline, chapter architecture and structure decisions."],
  ["04_claim_inventory", "Chapter-level claims, source tiers, unresolved claims and risk notes."],
  ["05_drafts", "Manuscript drafts, chapter batches and sharpening notes."],
  ["06_audit", "Blind audit, voice/belief match verdict, CAO packet and compliance output."],
  ["07_cover", "Cover brief, variants, review notes and HG-4 taste decision evidence."],
  ["08_build_bundle", "Deterministic local PDF/build artifacts and reader-package bundle."],
  ["09_publication", "Publication decision cards, listing drafts and publish blockers."],
  ["10_reports", "Worker reports, gate output, learning proposals and controller notes."],
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

function slugify(value) {
  const slug = requireSafeText("projectSlug", value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) throw new Error("projectSlug must contain at least one letter or number");
  return slug;
}

function relativeBookPath(slug, ...parts) {
  return path.join("content", "book-authoring", slug, ...parts);
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
    "- Do not put secrets, credentials, raw private memory or unrelated files here.",
    "- Do not publish, upload, submit, send, schedule or spend from this folder.",
    "- Keep HG-4 decisions explicit for BookSpec direction, voice, cover and final publish.",
  ].join("\n");
}

function bookSpec({ workingTitle, approvalOwner }) {
  return [
    "# BookSpec",
    "",
    `Working Title: ${workingTitle}`,
    `Approval Owner: ${approvalOwner}`,
    "Status: HG-4 direction pending until founder confirms.",
    "",
    "```yaml",
    "book_spec:",
    `  working_title: ${JSON.stringify(workingTitle)}`,
    "  topic:",
    "  goal:",
    "  audience:",
    "  desired_frame:",
    "  scope_boundaries:",
    "    include: []",
    "    exclude: []",
    "  constraints:",
    "    language:",
    "    target_length:",
    "    market:",
    "    regulated_claim_risk:",
    "  source_material: []",
    "  success_signal: []",
    "  human_gate:",
    "    book_direction: HG-4",
    "    frame_brief: HG-3.5",
    "    outline: HG-3.5",
    "    cover: HG-4",
    "    final_publish: HG-4",
    "```",
  ].join("\n");
}

function fvbmSeed() {
  return [
    "# FVBM Seed",
    "",
    "Status: missing_or_unconfirmed",
    "Maturity: M0 unless a confirmed model exists.",
    "",
    "Use `${COMPANY_OS_ROOT}/docs/operations/eve-m0-seed-interview.md` if no confirmed FVBM exists.",
    "",
    "```yaml",
    "fvbm:",
    "  maturity: M0",
    "  dimensions:",
    "    voice:",
    "      confidence: 0.0",
    "      forbidden_patterns: []",
    "    belief:",
    "      confidence: 0.0",
    "      convictions: []",
    "    frame:",
    "      confidence: 0.0",
    "    refusals:",
    "      confidence: 0.0",
    "    proof:",
    "      confidence: 0.0",
    "    positioning:",
    "      confidence: 0.0",
    "  open_questions: []",
    "```",
  ].join("\n");
}

function runbook({ company, workingTitle, approvalOwner, date }) {
  return [
    "# Book Authoring Runbook",
    "",
    `Company: ${company}`,
    `Working Title: ${workingTitle}`,
    `Approval Owner: ${approvalOwner}`,
    `Initialized: ${date}`,
    "Mode: draft-only",
    "",
    "## First Run",
    "",
    "1. Complete `00_book_spec/BOOK_SPEC.md`.",
    "2. Confirm or seed `01_fvbm/FVBM.md`.",
    "3. Run Discovery Research before outline.",
    "4. Produce `03_frame_outline/frame-brief.md` before drafting.",
    "5. Keep claims in `04_claim_inventory/` until verified.",
    "6. Run blind audit and compliance sweep before build or publication claims.",
    "",
    "## HumanGate Routing",
    "",
    "- HG-2: local draft and low-risk research work.",
    "- HG-3.5: Frame Brief, outline, steelman depth, acknowledgements and final bundle.",
    "- HG-4: BookSpec direction, voice identity, cover and final publish.",
    "",
    "## Blocked Actions",
    "",
    "- no public publish, upload, submit, send, schedule or spend",
    "- no publisher API writes",
    "- no durable memory writes without confirmation",
    "- no secret reads",
    "- no Done transition by worker or CAO",
  ].join("\n");
}

function configJson({ company, projectSlug, workingTitle, approvalOwner, date }) {
  return JSON.stringify({
    schema_version: BOOK_AUTHORING_START_VERSION,
    company,
    project_slug: projectSlug,
    working_title: workingTitle,
    approval_owner: approvalOwner,
    initialized_at: `${date}T00:00:00.000Z`,
    mode: "draft-only",
    root_policy: "paths are relative to the selected client root",
    project_root: `content/book-authoring/${projectSlug}`,
    folders: BOOK_AUTHORING_FOLDERS.map(([name, description]) => ({
      path: `content/book-authoring/${projectSlug}/${name}`,
      description,
    })),
    human_gate_policy: {
      book_direction: "HG-4",
      frame_brief: "HG-3.5",
      outline: "HG-3.5",
      cover: "HG-4",
      final_publish: "HG-4",
    },
    blocked_actions: [
      "public-publish",
      "public-upload",
      "kdp-submit",
      "public-send",
      "public-schedule",
      "publisher-api-write",
      "durable-memory-write-without-confirmation",
      "secret-read",
      "done-transition-by-worker-or-cao",
    ],
  }, null, 2);
}

export function buildBookAuthoringStartPlan({
  root = process.cwd(),
  company,
  projectSlug,
  workingTitle,
  approvalOwner,
  date = new Date().toISOString().slice(0, 10),
} = {}) {
  const normalized = {
    root: path.resolve(root || process.cwd()),
    company: requireSafeText("company", company || "Example Company"),
    projectSlug: slugify(projectSlug || "founder-book"),
    workingTitle: requireSafeText("workingTitle", workingTitle || "Working Title"),
    approvalOwner: requireSafeText("approvalOwner", approvalOwner || "Founder"),
    date: requireSafeText("date", date),
  };
  const directories = BOOK_AUTHORING_FOLDERS.map(([name, description]) => ({
    relative_path: relativeBookPath(normalized.projectSlug, name).split(path.sep).join("/"),
    description,
  }));
  const files = [
    file(relativeBookPath(normalized.projectSlug, "RUNBOOK.md"), runbook(normalized)),
    file(relativeBookPath(normalized.projectSlug, "book-authoring.config.json"), configJson(normalized)),
    file(relativeBookPath(normalized.projectSlug, "00_book_spec", "BOOK_SPEC.md"), bookSpec(normalized)),
    file(relativeBookPath(normalized.projectSlug, "01_fvbm", "FVBM.md"), fvbmSeed()),
    ...BOOK_AUTHORING_FOLDERS.map(([name, description]) => file(relativeBookPath(normalized.projectSlug, name, "README.md"), folderReadme(name, description))),
  ];
  return {
    version: BOOK_AUTHORING_START_VERSION,
    date: normalized.date,
    root: normalized.root,
    project_root: path.join(normalized.root, "content", "book-authoring", normalized.projectSlug),
    company: normalized.company,
    project_slug: normalized.projectSlug,
    working_title: normalized.workingTitle,
    approval_owner: normalized.approvalOwner,
    directories,
    files,
    blocked_actions: [
      "public-publish",
      "public-upload",
      "kdp-submit",
      "public-send",
      "public-schedule",
      "publisher-api-write",
      "secret-read",
      "done-transition-by-worker-or-cao",
    ],
  };
}

export function writeBookAuthoringStartPlan(plan, { force = false } = {}) {
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
    project_root: plan.project_root,
    directories,
    files,
  };
}
