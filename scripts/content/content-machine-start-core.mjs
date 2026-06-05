import fs from "node:fs";
import path from "node:path";

export const CONTENT_MACHINE_START_VERSION = "content-machine-start/v0";

export const CONTENT_MACHINE_FOLDERS = Object.freeze([
  ["00_intake", "Channel intent, approval owner, audience, offer and setup decisions."],
  ["01_source_inventory", "Approved source classes, scope, sensitivity, freshness and owners."],
  ["02_vault", "Scored idea cards before drafting."],
  ["03_research", "Source dossiers, contrarian angles, caveats and open questions."],
  ["04_founder_interviews", "Founder interview questions, answers and unresolved gaps."],
  ["05_raw_briefs", "Sacred raw founder material: exact words, stories, numbers and refusals."],
  ["06_anchor_drafts", "Anchor drafts before derivatives or release packets."],
  ["07_council_reviews", "Writer Council scores, revision requests and founder-only gaps."],
  ["08_derivatives", "Platform-native derivatives traced to approved anchors."],
  ["09_release_packets", "Draft-only release packets for Social, Blog, Video or Book gates."],
  ["10_performance", "Post-approval or post-publish observations and metric notes."],
  ["11_lessons", "Proposal-only content lessons and FVBM update candidates."],
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

function relativeMachinePath(...parts) {
  return path.join("content", "content-machine", ...parts);
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
    "- Do not publish, upload, schedule, send or spend from this folder.",
    "- Do not read optional source systems unless Source Inventory approves scope and owner.",
    "- Keep durable memory updates proposal-only until approved.",
  ].join("\n");
}

function intake({ company, approvalOwner, primaryChannel }) {
  return [
    "# Content Machine Intake",
    "",
    `Company: ${company}`,
    `Approval Owner: ${approvalOwner}`,
    `Primary Channel: ${primaryChannel}`,
    "Status: setup draft",
    "",
    "```yaml",
    "content_machine_intake:",
    `  company: ${JSON.stringify(company)}`,
    `  approval_owner: ${JSON.stringify(approvalOwner)}`,
    `  primary_channel: ${JSON.stringify(primaryChannel)}`,
    "  offer:",
    "  audience:",
    "  market:",
    "  first_goal:",
    "  fvbm_status: missing",
    "  allowed_channels: []",
    "  blocked_topics: []",
    "  off_limits_claims: []",
    "  public_release_owner:",
    "```",
  ].join("\n");
}

function sourceInventory() {
  return [
    "# Source Inventory",
    "",
    "Record only sources the operator explicitly approves. Missing connectors are normal.",
    "",
    "| Source | Location | Owner | Sensitivity | Allowed Action | Freshness | Status |",
    "|---|---|---|---|---|---|---|",
    "| Website |  | Founder | public | read-only | 30d | proposed |",
    "| Manual notes |  | Founder | internal | draft-only | 30d | proposed |",
    "",
    "## Rules",
    "",
    "- No broad inbox, repo, Drive, Slack, Notion, CRM or transcript mining by default.",
    "- Each source needs scope, owner, sensitivity and allowed action ceiling.",
    "- `hypothesis` and `stale` sources are read-only background, not draft truth.",
  ].join("\n");
}

function contentVault() {
  return [
    "# Content Vault",
    "",
    "Scored ideas before research or drafting.",
    "",
    "| ID | Idea | Source | Audience Value | Founder Truth | Proof Potential | Channel Fit | Gate | Score | Status |",
    "|---|---|---|---|---|---|---|---|---:|---|",
    "| CM-001 |  |  |  |  |  |  | HG-1 | 0 | empty |",
    "",
    "## Score Dimensions",
    "",
    "- Founder truth: is there a real story, belief or operating lesson?",
    "- Buyer value: does the reader learn something useful?",
    "- Proof potential: can we back this with source, number, screenshot, story or mechanism?",
    "- Channel fit: is this native to the selected channel?",
    "- Gate level: what HumanGate applies before public use?",
  ].join("\n");
}

function founderInterview() {
  return [
    "# Founder Interview",
    "",
    "Use short waves. Do not advance if answers stay vague.",
    "",
    "## Required Signals",
    "",
    "- one concrete story",
    "- one number, threshold, timeline or mechanism",
    "- one market belief or tension",
    "- one refusal: what must not be said under the founder's name",
    "- one desired reader action or thought shift",
    "",
    "## Questions",
    "",
    "1. What happened that makes this idea true in your own work?",
    "2. Which number, cost, time range or concrete mechanism makes it real?",
    "3. What does your market usually get wrong here?",
    "4. What would make this sound fake if EVE wrote it badly?",
  ].join("\n");
}

function rawBriefTemplate() {
  return [
    "# Raw Founder Brief Template",
    "",
    "This file preserves raw founder material. Keep AI interpretation separate.",
    "",
    "```yaml",
    "raw_brief:",
    "  idea_id:",
    "  founder_words:",
    "    - \"\"",
    "  stories:",
    "    - \"\"",
    "  numbers_or_mechanisms:",
    "    - \"\"",
    "  emotional_anchor:",
    "  surprising_reveal:",
    "  so_what:",
    "  refusals:",
    "    - \"\"",
    "  information_gaps:",
    "    - \"\"",
    "```",
  ].join("\n");
}

function councilRubric() {
  return [
    "# Writer Council Rubric",
    "",
    "Score each lens from 1 to 10. Split fixes into machine-editable fixes and founder-only gaps.",
    "",
    "| Lens | Question | Score | Fixes | Founder-only gaps |",
    "|---|---|---:|---|---|",
    "| Anti-slop Editor | Does this sound like real judgment, not fluent filler? | 0 |  |  |",
    "| Founder Voice | Does it match FVBM evidence and raw founder words? | 0 |  |  |",
    "| Buyer Value | Is the reader smarter in the first five seconds? | 0 |  |  |",
    "| Claim Safety | Are claims sourced, bounded and gate-aware? | 0 |  |  |",
    "| Platform Fit | Is the format native to the selected channel? | 0 |  |  |",
    "| Business Outcome | Does this support trust, pipeline or authority? | 0 |  |  |",
    "",
    "Default pass thresholds:",
    "",
    "- Daily social draft: 8/10 average.",
    "- Anchor/blog/campaign: 8.5/10 average.",
    "- Book or high-risk public stance: 9/10 average plus CAO/HumanGate review.",
  ].join("\n");
}

function contentLessons() {
  return [
    "# Content Lessons",
    "",
    "Status: proposal-only until approved.",
    "",
    "## Confirmed Lessons",
    "",
    "- None yet.",
    "",
    "## Hypotheses",
    "",
    "- None yet.",
    "",
    "## Rejected Patterns",
    "",
    "- None yet.",
    "",
    "## Promotion Rule",
    "",
    "A lesson becomes durable only after a founder-approved final artifact or explicit review.",
    "Lessons may inform drafts, but founder voice identity remains HG-4.",
  ].join("\n");
}

function runbook({ company, approvalOwner, primaryChannel, date }) {
  return [
    "# Content Machine Runbook",
    "",
    `Company: ${company}`,
    `Approval Owner: ${approvalOwner}`,
    `Primary Channel: ${primaryChannel}`,
    `Initialized: ${date}`,
    "Mode: draft-only",
    "",
    "## First Run",
    "",
    "1. Complete `00_intake/CONTENT_MACHINE_INTAKE.md`.",
    "2. Confirm FVBM status or run the M0 seed interview.",
    "3. Complete `01_source_inventory/SOURCE_INVENTORY.md` before source reads.",
    "4. Add first topic cards to `02_vault/CONTENT_VAULT.md`.",
    "5. Create a founder interview and raw brief before drafting.",
    "6. Draft one anchor, then run Writer Council.",
    "7. Create derivatives only after council pass.",
    "8. Route release packets into existing gated social/blog/video/book lanes.",
    "",
    "## Blocked Actions",
    "",
    "- no public publish, upload, schedule, send or spend",
    "- no connector writes without release card",
    "- no credential, password, token or cookie collection",
    "- no broad private-source mining",
    "- no durable memory writes without approval",
    "- no Done transition by worker or CAO",
  ].join("\n");
}

function configJson({ company, approvalOwner, primaryChannel, date }) {
  return JSON.stringify({
    schema_version: CONTENT_MACHINE_START_VERSION,
    company,
    approval_owner: approvalOwner,
    primary_channel: primaryChannel,
    initialized_at: `${date}T00:00:00.000Z`,
    mode: "draft-only",
    root_policy: "paths are relative to the selected client root",
    machine_root: "content/content-machine",
    folders: CONTENT_MACHINE_FOLDERS.map(([name, description]) => ({
      path: `content/content-machine/${name}`,
      description,
    })),
    source_policy: {
      default: "none-until-approved",
      approved_by: approvalOwner,
      required_fields: ["source", "location", "owner", "sensitivity", "allowed_action", "freshness", "status"],
    },
    fvbm_policy: {
      required_before_voice_claim: true,
      missing_state: "run M0 seed interview or keep voice_match NEEDS_FOUNDER",
      durable_updates: "proposal-only",
    },
    human_gate_policy: {
      local_inventory_and_vault: "HG-1",
      local_drafts: "HG-2",
      external_publish_schedule_send: "HG-2.5",
      regulated_or_private_claims: "HG-3",
      founder_voice_identity: "HG-4",
      strategic_public_positioning: "HG-4",
    },
    blocked_actions: [
      "public-publish",
      "public-upload",
      "public-schedule",
      "public-send",
      "spend",
      "connector-write-without-release-card",
      "credential-collection",
      "broad-private-source-mining",
      "durable-memory-write-without-approval",
      "done-transition-by-worker-or-cao",
    ],
  }, null, 2);
}

export function buildContentMachineStartPlan({
  root = process.cwd(),
  company,
  approvalOwner,
  primaryChannel = "LinkedIn",
  date = new Date().toISOString().slice(0, 10),
} = {}) {
  const normalized = {
    root: path.resolve(root || process.cwd()),
    company: requireSafeText("company", company || "Example Company"),
    approvalOwner: requireSafeText("approvalOwner", approvalOwner || "Founder"),
    primaryChannel: requireSafeText("primaryChannel", primaryChannel || "LinkedIn"),
    date: requireSafeText("date", date),
  };
  const directories = CONTENT_MACHINE_FOLDERS.map(([name, description]) => ({
    relative_path: relativeMachinePath(name).split(path.sep).join("/"),
    description,
  }));
  const files = [
    file(relativeMachinePath("RUNBOOK.md"), runbook(normalized)),
    file(relativeMachinePath("content-machine.config.json"), configJson(normalized)),
    file(relativeMachinePath("00_intake", "CONTENT_MACHINE_INTAKE.md"), intake(normalized)),
    file(relativeMachinePath("01_source_inventory", "SOURCE_INVENTORY.md"), sourceInventory()),
    file(relativeMachinePath("02_vault", "CONTENT_VAULT.md"), contentVault()),
    file(relativeMachinePath("04_founder_interviews", "FOUNDER_INTERVIEW.md"), founderInterview()),
    file(relativeMachinePath("05_raw_briefs", "RAW_BRIEF_TEMPLATE.md"), rawBriefTemplate()),
    file(relativeMachinePath("07_council_reviews", "COUNCIL_RUBRIC.md"), councilRubric()),
    file(relativeMachinePath("11_lessons", "content-lessons.md"), contentLessons()),
    ...CONTENT_MACHINE_FOLDERS.map(([name, description]) => file(relativeMachinePath(name, "README.md"), folderReadme(name, description))),
  ];
  return {
    version: CONTENT_MACHINE_START_VERSION,
    date: normalized.date,
    root: normalized.root,
    machine_root: path.join(normalized.root, "content", "content-machine"),
    company: normalized.company,
    approval_owner: normalized.approvalOwner,
    primary_channel: normalized.primaryChannel,
    directories,
    files,
    blocked_actions: [
      "public-publish",
      "public-upload",
      "public-schedule",
      "public-send",
      "spend",
      "connector-write-without-release-card",
      "credential-collection",
      "broad-private-source-mining",
      "durable-memory-write-without-approval",
      "done-transition-by-worker-or-cao",
    ],
  };
}

export function writeContentMachineStartPlan(plan, { force = false } = {}) {
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
    machine_root: plan.machine_root,
    directories,
    files,
  };
}
