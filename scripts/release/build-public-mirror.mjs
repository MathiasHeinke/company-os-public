#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

import {
  buildPageIndex,
  renderPageIndex,
} from "../page-index/page-index-core.mjs";

export const PUBLIC_MIRROR_BUILDER_VERSION = "build-public-mirror/v0";
export const STRIP_LIST_VERSION_DEFAULT = "v2";

const SKIP_DIRECTORY_NAMES = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  ".cache",
  ".turbo",
  ".pnpm-store",
  ".venv",
]);

const SKIP_FILE_NAMES = new Set([".DS_Store"]);

export const INCLUDE_RULES = [
  { pattern: ".env.example" },
  { pattern: ".gitignore" },
  { pattern: ".github/ISSUE_TEMPLATE/**" },
  { pattern: ".github/pull_request_template.md" },
  { pattern: "docs/**" },
  { pattern: "scripts/install/**" },
  { pattern: "scripts/orchestration/**" },
  { pattern: "scripts/release-gates/**" },
  { pattern: "scripts/release/**" },
  { pattern: "scripts/plane/**" },
  { pattern: "scripts/capabilities/**" },
  { pattern: "scripts/sandbox-pr/**" },
  { pattern: "scripts/agent-events/**" },
  { pattern: "scripts/goal/**" },
  { pattern: "scripts/git-hygiene/**" },
  { pattern: "scripts/page-index/**" },
  { pattern: "scripts/dreams/**" },
  { pattern: "scripts/artifact-truth/**" },
  { pattern: "scripts/model-router/**" },
  { pattern: "scripts/runtime/**" },
  // v2 (0.7.x): Command EVE public product + brand surface.
  // Excluded by design: scripts/linear/** (superseded by Plane), the private
  // .claude/.agents/CLAUDE.md harness layer, and raw registries/*/company-os.json
  // (only example.json registries are public). Verified by the --verify invariant scan.
  { pattern: "assets/brand/eve-command/**" },
  { pattern: "schemas/eve/**" },
  { pattern: "scripts/operator-shell/**" },
  { pattern: "scripts/update/**" },
  { pattern: "scripts/onboarding/**" },
  { pattern: "scripts/command-center/**" },
  { pattern: "scripts/content/**" },
  { pattern: "scripts/engineering/**" },
  { pattern: "scripts/marketing/**" },
  { pattern: "kits/company-os-kit/README.md" },
  { pattern: "kits/company-os-kit/templates/**" },
  { pattern: "kits/company-os-kit/.agents/**" },
  { pattern: "kits/company-os-kit/.company-os/**" },
  { pattern: "kits/company-os-kit/scripts/**" },
  { pattern: "kits/company-os-kit/memory-bank/**" },
  { pattern: "kits/company-os-kit/.antigravity/agentic-plan-template.md" },
  { pattern: "kits/company-os-kit/.antigravity/agentic-router.md" },
  { pattern: "kits/company-os-kit/.antigravity/copy-rules.md" },
  { pattern: "kits/company-os-kit/.antigravity/system-prompt.md" },
  { pattern: "kits/company-os-kit/.antigravity/tech-stack-context.md" },
  { pattern: "kits/company-os-kit/.antigravity/workspace-strategy.md" },
  { pattern: "kits/company-os-kit/.antigravity/personas/**" },
  { pattern: "LICENSE" },
  { pattern: "README.md" },
  { pattern: "CHANGELOG.md" },
  { pattern: "ROADMAP.md" },
  { pattern: "VERSION" },
  { pattern: "AGENTS.md" },
  { pattern: "metrics/agent-events.example.jsonl" },
  { pattern: "metrics/ai-cost-ledger.example.jsonl" },
  { pattern: "registries/capabilities/example.json" },
  { pattern: "registries/inference/example.json" },
  { pattern: "registries/inference/eve-hermes-brain.json" },
  { pattern: "registries/sessions/**" },
  { pattern: "registries/domain-packs/**" },
  { pattern: "registries/plane-templates/**" },
  { pattern: "registries/quality/**" },
  { pattern: "reports/.gitkeep" },
  { pattern: "reports/examples/**" },
];

export const NAMED_PERSON_PERSONA_FILES = [
  "kits/company-os-kit/.antigravity/personas/andrej-karpathy.md",
  "kits/company-os-kit/.antigravity/personas/daniel-kahneman.md",
  "kits/company-os-kit/.antigravity/personas/elon-musk.md",
  "kits/company-os-kit/.antigravity/personas/steve-jobs.md",
  "kits/company-os-kit/.antigravity/personas/john-carmack.md",
  "kits/company-os-kit/.antigravity/personas/don-draper.md",
  "kits/company-os-kit/.antigravity/personas/sherlock-holmes.md",
  "kits/company-os-kit/.antigravity/personas/mr-robot.md",
  "kits/company-os-kit/.antigravity/personas/elara-voss.md",
  "kits/company-os-kit/.antigravity/personas/valeria-castellano.md",
  "kits/company-os-kit/.antigravity/personas/jonah-jansen.md",
  "kits/company-os-kit/.antigravity/personas/kai-renner.md",
  "kits/company-os-kit/.antigravity/personas/cypher-sre.md",
  "kits/company-os-kit/.antigravity/personas/the-refactorer.md",
  "kits/company-os-kit/.antigravity/personas/the-nexus.md",
];

export const STRIP_RULES = [
  // Internal reports — keep only .gitkeep and examples/*.example.*
  {
    pattern: "reports/**",
    keep: ["reports/.gitkeep", "reports/examples/**"],
    reason: "internal-reports",
  },
  // Internal metrics ledgers
  { pattern: "metrics/agent-events.jsonl", reason: "internal-metrics-ledger" },
  { pattern: "metrics/agent-runs.jsonl", reason: "internal-metrics-ledger" },
  { pattern: "metrics/ai-cost-ledger.jsonl", reason: "internal-metrics-ledger" },
  // Live worker stream JSONL anywhere under reports/
  {
    pattern: "reports/**/*.stream.jsonl",
    keep: ["reports/examples/**"],
    reason: "live-stream-jsonl",
  },
  // Private kit log body
  {
    pattern: "kits/company-os-kit/.antigravity/logs/architect-memory.md",
    reason: "private-kit-log",
  },
  // ARES-named operations doc
  {
    pattern: "docs/operations/ares-product-domain-night-shift-queue.md",
    reason: "ares-domain-overlay",
  },
  // Atlas/ARES domain overlay docs
  {
    pattern: "docs/calibration/**",
    reason: "source-company-calibration",
  },
  {
    pattern: "docs/superpowers/**",
    reason: "internal-implementation-plans",
  },
  {
    pattern: "docs/strategy/command-eve-outreach-kit.md",
    reason: "source-company-commercial-copy",
  },
  {
    pattern: "docs/operations/atlas-*.md",
    reason: "source-company-domain-overlay",
  },
  {
    pattern: "docs/orchestration/atlas-*.md",
    reason: "source-company-domain-overlay",
  },
  {
    pattern: "docs/templates/atlas-*.md",
    reason: "source-company-domain-overlay",
  },
  {
    pattern: "docs/operations/marketing-public-fetch-fallback.md",
    reason: "source-company-marketing-overlay",
  },
  {
    pattern: "scripts/sandbox-pr/**",
    reason: "source-founder-shadow-run",
  },
  {
    pattern: "assets/brand/eve-command/site/public/agb.html",
    reason: "site-legal-page-not-install-mirror",
  },
  {
    pattern: "assets/brand/eve-command/site/public/datenschutz.html",
    reason: "site-legal-page-not-install-mirror",
  },
  {
    pattern: "assets/brand/eve-command/site/public/impressum.html",
    reason: "site-legal-page-not-install-mirror",
  },
  {
    pattern: "kits/company-os-kit/scripts/autoresearch-bioengine/**",
    reason: "source-company-kit-example",
  },
  {
    pattern: "kits/company-os-kit/scripts/engine-eval-template/**",
    reason: "source-company-kit-example",
  },
  {
    pattern: "kits/company-os-kit/scripts/mcp-gateway/**",
    reason: "source-company-kit-example",
  },
  {
    pattern: "kits/company-os-kit/scripts/mcp-gateway-template/**",
    reason: "source-company-kit-example",
  },
  {
    pattern: "docs/templates/atlas-worker-templates.md",
    reason: "atlas-domain-overlay",
  },
  {
    pattern: "docs/orchestration/atlas-claude-c-level-boot-contract.md",
    reason: "atlas-domain-overlay",
  },
  // Internal migration script
  {
    pattern: "scripts/plane/enrich-batch-5-mirror-plans.mjs",
    reason: "internal-migration-script",
  },
  // Private company registries — example variants take their place via include list
  {
    pattern: "registries/capabilities/company-os.json",
    reason: "private-company-registry",
  },
  { pattern: "registries/inference/company-os.json", reason: "private-company-registry" },
  // Named-person persona files (Doctrine A)
  ...NAMED_PERSON_PERSONA_FILES.map((pattern) => ({ pattern, reason: "named-person-persona" })),
  // Knowledge files held back until PUB-09 audit
  {
    pattern: "kits/company-os-kit/.antigravity/knowledge/**",
    reason: "knowledge-pending-pub09",
  },
  // .env files (any depth)
  { pattern: ".env", reason: "env-file" },
  { pattern: "**/.env", reason: "env-file" },
  { pattern: "**/.env.local", reason: "env-file" },
  { pattern: "**/.env.*.local", reason: "env-file" },
];

export const REPLACEMENT_FIXTURES = [
  {
    target: "metrics/agent-events.example.jsonl",
    description: "Sanitized minimal agent event set",
  },
  {
    target: "metrics/ai-cost-ledger.example.jsonl",
    description: "Sanitized cost ledger template",
  },
  {
    target: "reports/.gitkeep",
    description: "Preserves reports/ directory entry",
  },
  {
    target: "reports/examples/worker-issue-report.example.md",
    description: "worker.reported shape template",
  },
  {
    target: "reports/examples/cao-pass.example.md",
    description: "CAO PASS verdict shape template",
  },
  {
    target: "reports/examples/controller-decision.example.md",
    description: "controller.decision shape template",
  },
  {
    target: "reports/examples/runtime-pilot.example.stream.jsonl",
    description: "Minimal runtime pilot stream template",
  },
  {
    target: "registries/capabilities/example.json",
    description: "Capability registry template",
  },
  {
    target: "registries/inference/example.json",
    description: "Inference registry template",
  },
  {
    target: "kits/company-os-kit/.antigravity/logs/architect-memory.example.md",
    description: "Architect memory template",
  },
];

const regexDot = "\\.";
function regexEscape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const PRIVATE_WORKSPACE_NAMES = [
  ["ares", "app"].join("-"),
  ["ares", "website"].join("-"),
  ["ares", "bio", "os", "desktop"].join("-"),
  ["ares", "bio", "os", "dashboard"].join("-"),
  ["MH", "DEV"].join("_"),
  [".agent", "sandboxes"].join("-"),
];

const PUBLIC_READER_MARKER_SCOPES = [
  "README.md",
  "CHANGELOG.md",
  "ROADMAP.md",
  "AGENTS.md",
  "docs/",
  "kits/",
  "registries/",
  "assets/brand/eve-command/site/public/",
];

const PRIVATE_CONTENT_PATTERNS = [
  {
    id: "source-company-token",
    regex: new RegExp(String.raw`\b${["ares", "hermes"].join("-")}-[A-Za-z0-9_-]{20,}`),
    severity: "private-content",
  },
  {
    id: "anthropic-key",
    regex: /\bsk-ant-[A-Za-z0-9_-]{20,}/,
    severity: "private-content",
  },
  {
    id: "openai-key",
    regex: /\bsk-[A-Za-z0-9]{20,}/,
    severity: "private-content",
  },
  {
    id: "github-pat",
    regex: /\bghp_[A-Za-z0-9]{20,}/,
    severity: "private-content",
  },
  {
    id: "github-fine-grained-pat",
    regex: /\bgithub_pat_[A-Za-z0-9_]{20,}/,
    severity: "private-content",
  },
  {
    id: "slack-bot-token",
    regex: /\bxoxb-[A-Za-z0-9-]{10,}/,
    severity: "private-content",
  },
  {
    id: "private-home-path",
    regex: /\/Users\/[a-zA-Z][-a-zA-Z0-9]+/,
    severity: "private-content",
  },
  {
    id: "private-source-domain",
    regex: new RegExp(
      String.raw`\b(?:${[
        ["bio-os", "io"].join(regexDot),
        ["ares", "bio", "os"].join("-"),
        ["dash", "bio-os"].join(regexDot),
        ["api", "bio-os"].join(regexDot),
        ["app", "bio-os"].join(regexDot),
        ...PRIVATE_WORKSPACE_NAMES.map(regexEscape),
      ].join("|")})\b`,
    ),
    severity: "private-content",
  },
  {
    id: "source-company-visible-marker",
    regex: /\b(?:ARES|ATLAS|Fyn Labs|FYN Labs)\b/,
    severity: "private-content",
    scope: PUBLIC_READER_MARKER_SCOPES,
  },
  {
    id: "founder-visible-marker",
    regex: /\bMathias\b/,
    severity: "private-content",
    scope: PUBLIC_READER_MARKER_SCOPES,
  },
  {
    id: "founder-email",
    regex: /marketing@mathiasheinke\.de/,
    severity: "private-content",
  },
  {
    id: "work-item-id",
    regex: /\b(?:ATLAS|COMPA|MAT)-[0-9]+/,
    severity: "private-content",
    scope: PUBLIC_READER_MARKER_SCOPES,
  },
];

const MIRROR_TEXT_REWRITE_EXTENSIONS = new Set([
  ".cjs",
  ".js",
  ".json",
  ".jsonl",
  ".md",
  ".mjs",
  ".py",
  ".sh",
  ".ts",
  ".txt",
  ".yaml",
  ".yml",
]);
const CODE_TEXT_REWRITE_EXTENSIONS = new Set([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);

function allowsVisibleMarkerRewrite(relativePath) {
  if (relativePath.startsWith("assets/brand/eve-command/site/public/assets/")) return true;
  return !CODE_TEXT_REWRITE_EXTENSIONS.has(path.extname(relativePath).toLowerCase());
}

const PUBLIC_MIRROR_TEXT_REWRITES = [
  {
    id: "github-pat-test-fixture",
    regex: /\bghp_[A-Za-z0-9]{20,}/g,
    replacement: "[GITHUB_PAT_EXAMPLE]",
    appliesTo: (relativePath) => relativePath.startsWith("scripts/") && /\.test\.(?:mjs|cjs|js|ts)$/.test(relativePath),
  },
  {
    id: "github-fine-grained-pat-test-fixture",
    regex: /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
    replacement: "[GITHUB_FINE_GRAINED_PAT_EXAMPLE]",
    appliesTo: (relativePath) => relativePath.startsWith("scripts/") && /\.test\.(?:mjs|cjs|js|ts)$/.test(relativePath),
  },
  {
    id: "slack-bot-token-test-fixture",
    regex: /\bxoxb-[A-Za-z0-9-]{10,}/g,
    replacement: "[SLACK_BOT_TOKEN_EXAMPLE]",
    appliesTo: (relativePath) => relativePath.startsWith("scripts/") && /\.test\.(?:mjs|cjs|js|ts)$/.test(relativePath),
  },
  {
    id: "internal-work-item-id",
    regex: /\b(?:ATLAS|COMPA|MAT)-[0-9]+(?:-[A-Za-z0-9]+|[A-Za-z])?/g,
    replacement: "[WORK_ITEM_ID]",
    appliesTo: () => true,
  },
  {
    id: "private-home-path",
    regex: /\/Users\/[a-zA-Z][-a-zA-Z0-9]+(?:\/[^\s"'`)>,}]*)?/g,
    replacement: ({ relativePath }) =>
      CODE_TEXT_REWRITE_EXTENSIONS.has(path.extname(relativePath).toLowerCase())
        ? "[LOCAL_WORKSPACE]"
        : "${LOCAL_WORKSPACE}",
    appliesTo: () => true,
  },
  {
    id: "source-company-domain",
    regex: new RegExp(
      String.raw`\b(?:${[
        ["bio-os", "io"].join(regexDot),
        ["ares", "bio", "os"].join("-"),
        ["dash", "bio-os"].join(regexDot),
        ["api", "bio-os"].join(regexDot),
        ["app", "bio-os"].join(regexDot),
      ].join("|")})\b`,
      "g",
    ),
    replacement: "[SOURCE_COMPANY_DOMAIN]",
    appliesTo: () => true,
  },
  {
    id: "private-workspace-name",
    regex: new RegExp(String.raw`(?:^|(?<=\W))(?:${PRIVATE_WORKSPACE_NAMES.map(regexEscape).join("|")})(?=$|\W)`, "g"),
    replacement: "[SOURCE_WORKSPACE]",
    appliesTo: () => true,
  },
  {
    id: "source-company-visible-marker",
    regex: /\b(?:ARES|ATLAS|Fyn Labs|FYN Labs)\b/g,
    replacement: "[SOURCE_COMPANY]",
    appliesTo: allowsVisibleMarkerRewrite,
  },
  {
    id: "founder-possessive-visible-marker",
    regex: /\bMathias['’]/g,
    replacement: "the founder's",
    appliesTo: allowsVisibleMarkerRewrite,
  },
  {
    id: "founder-visible-marker",
    regex: /\bMathias\b/g,
    replacement: "the founder",
    appliesTo: allowsVisibleMarkerRewrite,
  },
];

function isTextRewriteCandidate(relativePath) {
  return MIRROR_TEXT_REWRITE_EXTENSIONS.has(path.extname(relativePath).toLowerCase());
}

export function sanitizePublicMirrorText(relativePath, content) {
  if (!isTextRewriteCandidate(relativePath)) return content;
  let sanitized = content;
  for (const rule of PUBLIC_MIRROR_TEXT_REWRITES) {
    if (!rule.appliesTo(relativePath)) continue;
    const replacement = typeof rule.replacement === "function"
      ? (...args) => rule.replacement({ relativePath, match: args[0] })
      : rule.replacement;
    sanitized = sanitized.replace(rule.regex, replacement);
  }
  return sanitized;
}

const PRESENCE_INVARIANTS = [
  {
    id: "stripped.registries.capabilities-company-os",
    type: "absent",
    path: "registries/capabilities/company-os.json",
  },
  {
    id: "stripped.registries.inference-company-os",
    type: "absent",
    path: "registries/inference/company-os.json",
  },
  {
    id: "stripped.scripts.enrich-batch-5",
    type: "absent",
    path: "scripts/plane/enrich-batch-5-mirror-plans.mjs",
  },
  {
    id: "stripped.docs.ares-night-shift",
    type: "absent",
    path: "docs/operations/ares-product-domain-night-shift-queue.md",
  },
  {
    id: "stripped.kit.architect-memory-private",
    type: "absent",
    path: "kits/company-os-kit/.antigravity/logs/architect-memory.md",
  },
];

export function globToRegex(pattern) {
  let regex = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "*") {
      if (pattern[index + 1] === "*") {
        index += 1;
        if (pattern[index + 1] === "/") {
          index += 1;
          regex += "(?:.*/)?";
        } else {
          regex += ".*";
        }
      } else {
        regex += "[^/]*";
      }
    } else if (char === "?") {
      regex += "[^/]";
    } else if (char === ".") {
      regex += "\\.";
    } else if (char === "/") {
      regex += "/";
    } else if ("()[]{}+|^$\\".includes(char)) {
      regex += `\\${char}`;
    } else {
      regex += char;
    }
  }
  regex += "$";
  return new RegExp(regex);
}

const compiledIncludeRules = INCLUDE_RULES.map((rule) => ({
  ...rule,
  regex: globToRegex(rule.pattern),
}));

const compiledStripRules = STRIP_RULES.map((rule) => ({
  ...rule,
  regex: globToRegex(rule.pattern),
  keepRegexes: (rule.keep || []).map((entry) => globToRegex(entry)),
}));

export function isIncluded(relativePath) {
  for (const rule of compiledIncludeRules) {
    if (rule.regex.test(relativePath)) return rule;
  }
  return null;
}

export function isStripped(relativePath) {
  for (const rule of compiledStripRules) {
    if (!rule.regex.test(relativePath)) continue;
    if (rule.keepRegexes.length) {
      const kept = rule.keepRegexes.some((regex) => regex.test(relativePath));
      if (kept) continue;
    }
    return rule;
  }
  return null;
}

function walkSourceTree(sourceRoot) {
  const collected = [];
  const stack = [sourceRoot];
  while (stack.length) {
    const directory = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      throw new Error(`source.walk-failed: ${directory}: ${error.message}`);
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRECTORY_NAMES.has(entry.name)) continue;
        stack.push(path.join(directory, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      if (SKIP_FILE_NAMES.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(sourceRoot, absolute).split(path.sep).join("/");
      collected.push(relative);
    }
  }
  return collected.sort();
}

function sha256OfFile(absolutePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(absolutePath));
  return hash.digest("hex");
}

export function planPublicMirror({
  sourceRoot,
  stripListVersion = STRIP_LIST_VERSION_DEFAULT,
} = {}) {
  if (!sourceRoot) throw new Error("planPublicMirror: sourceRoot is required");
  const resolvedSourceRoot = path.resolve(sourceRoot);
  if (!fs.existsSync(resolvedSourceRoot)) {
    throw new Error(`source.not-found: ${resolvedSourceRoot}`);
  }

  const files = walkSourceTree(resolvedSourceRoot);
  const copied = [];
  const stripped = [];
  const unexpected = [];

  for (const relativePath of files) {
    const stripRule = isStripped(relativePath);
    if (stripRule) {
      stripped.push({ path: relativePath, reason: stripRule.reason });
      continue;
    }
    const includeRule = isIncluded(relativePath);
    if (includeRule) {
      copied.push({ path: relativePath, rule: includeRule.pattern });
      continue;
    }
    unexpected.push({ path: relativePath, reason: "not-on-include-list" });
  }

  const missingFixtures = [];
  for (const fixture of REPLACEMENT_FIXTURES) {
    const absolute = path.join(resolvedSourceRoot, fixture.target);
    if (!fs.existsSync(absolute)) {
      missingFixtures.push({ target: fixture.target, description: fixture.description });
    }
  }

  return {
    source_root: resolvedSourceRoot,
    strip_list_version: stripListVersion,
    copied: copied.sort((left, right) => left.path.localeCompare(right.path)),
    stripped: stripped.sort((left, right) => left.path.localeCompare(right.path)),
    unexpected: unexpected.sort((left, right) => left.path.localeCompare(right.path)),
    missing_fixtures: missingFixtures.sort((left, right) => left.target.localeCompare(right.target)),
  };
}

function ensureEmptyDirectory(targetRoot) {
  if (!fs.existsSync(targetRoot)) {
    fs.mkdirSync(targetRoot, { recursive: true });
    return;
  }
  const entries = fs.readdirSync(targetRoot);
  if (entries.length) {
    throw new Error(`out.not-empty: ${targetRoot}`);
  }
}

function copyOneFile(sourceRoot, targetRoot, relativePath) {
  const sourceAbsolute = path.join(sourceRoot, relativePath);
  const targetAbsolute = path.join(targetRoot, relativePath);
  fs.mkdirSync(path.dirname(targetAbsolute), { recursive: true });
  if (isTextRewriteCandidate(relativePath)) {
    const sourceContent = fs.readFileSync(sourceAbsolute, "utf8");
    const sanitizedContent = sanitizePublicMirrorText(relativePath, sourceContent);
    if (sanitizedContent !== sourceContent) {
      fs.writeFileSync(targetAbsolute, sanitizedContent, "utf8");
      fs.chmodSync(targetAbsolute, fs.statSync(sourceAbsolute).mode & 0o777);
      return;
    }
  }
  fs.copyFileSync(sourceAbsolute, targetAbsolute);
}

export function executeMirrorCopy({ plan, outRoot }) {
  if (!plan || !plan.source_root) {
    throw new Error("executeMirrorCopy: plan with source_root required");
  }
  const resolvedOut = path.resolve(outRoot);
  ensureEmptyDirectory(resolvedOut);
  for (const entry of plan.copied) {
    copyOneFile(plan.source_root, resolvedOut, entry.path);
  }
  return resolvedOut;
}

function writePublicMirrorPageIndex(outRoot) {
  const resolvedOut = path.resolve(outRoot);
  const outputPath = path.join(resolvedOut, "docs/page-index.md");
  const index = buildPageIndex(resolvedOut, {
    source: "filesystem",
    ignoreFiles: ["docs/page-index.md"],
  });
  const publicationIndex = {
    ...index,
    // The mirror directory is later committed as a clean public repository.
    // Build from filesystem before `.git` exists, but render the canonical
    // published semantics so `generate-page-index --check` passes after clone.
    source: "tracked",
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, renderPageIndex(publicationIndex), "utf8");
  return {
    path: "docs/page-index.md",
    files: index.entries.length,
  };
}

function scanForPrivateContent(outRoot) {
  const failures = [];
  const stack = [outRoot];
  while (stack.length) {
    const directory = stack.pop();
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRECTORY_NAMES.has(entry.name)) continue;
        stack.push(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      const relative = path.relative(outRoot, absolute).split(path.sep).join("/");
      let content;
      try {
        content = fs.readFileSync(absolute, "utf8");
      } catch {
        continue;
      }
      const lines = content.split("\n");
      for (let index = 0; index < lines.length; index += 1) {
        for (const pattern of PRIVATE_CONTENT_PATTERNS) {
          if (pattern.scope && !pattern.scope.some((prefix) => relative.startsWith(prefix))) {
            continue;
          }
          pattern.regex.lastIndex = 0;
          if (pattern.regex.test(lines[index])) {
            if (pattern.id === "founder-visible-marker" && relative === "LICENSE") {
              continue;
            }
            failures.push({
              id: pattern.id,
              path: relative,
              line: index + 1,
              severity: pattern.severity,
            });
          }
        }
      }
    }
  }
  return failures;
}

function checkPresenceInvariants(outRoot) {
  const failures = [];
  for (const invariant of PRESENCE_INVARIANTS) {
    const absolute = path.join(outRoot, invariant.path);
    if (invariant.type === "absent" && fs.existsSync(absolute)) {
      failures.push({
        id: invariant.id,
        path: invariant.path,
        severity: "private-content",
        detail: "stripped path present in output",
      });
    }
  }
  return failures;
}

function checkDirectoryStripInvariants(outRoot) {
  const failures = [];
  const reportsDir = path.join(outRoot, "reports");
  if (fs.existsSync(reportsDir)) {
    const stack = [reportsDir];
    while (stack.length) {
      const directory = stack.pop();
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          stack.push(absolute);
          continue;
        }
        const relative = path.relative(outRoot, absolute).split(path.sep).join("/");
        if (relative === "reports/.gitkeep") continue;
        if (relative.startsWith("reports/examples/")) continue;
        failures.push({
          id: "stripped.reports.unexpected-file",
          path: relative,
          severity: "private-content",
          detail: "reports/ contains a file outside .gitkeep / examples",
        });
      }
    }
  }
  const metricsDir = path.join(outRoot, "metrics");
  if (fs.existsSync(metricsDir)) {
    for (const entry of fs.readdirSync(metricsDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".jsonl")) continue;
      if (entry.name.includes(".example.")) continue;
      failures.push({
        id: "stripped.metrics.non-example-jsonl",
        path: `metrics/${entry.name}`,
        severity: "private-content",
        detail: "metrics/ contains a non-example .jsonl",
      });
    }
  }
  return failures;
}

export function verifyPublicMirrorOutput({ outRoot }) {
  const resolvedOut = path.resolve(outRoot);
  if (!fs.existsSync(resolvedOut)) {
    throw new Error(`verify.out-not-found: ${resolvedOut}`);
  }
  const failures = [
    ...scanForPrivateContent(resolvedOut),
    ...checkPresenceInvariants(resolvedOut),
    ...checkDirectoryStripInvariants(resolvedOut),
  ];
  return {
    passed: failures.length === 0,
    invariant_failures: failures.sort((left, right) =>
      `${left.id}:${left.path}:${left.line || 0}`.localeCompare(
        `${right.id}:${right.path}:${right.line || 0}`,
      ),
    ),
  };
}

function resolveSourceSha(sourceRoot, override) {
  if (override) return override;
  try {
    const result = execFileSync("git", ["-C", sourceRoot, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return result.trim();
  } catch {
    return "unknown";
  }
}

function countOutputFiles(outRoot) {
  if (!fs.existsSync(outRoot)) return 0;
  let count = 0;
  const stack = [outRoot];
  while (stack.length) {
    const directory = stack.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
        continue;
      }
      if (entry.isFile()) count += 1;
    }
  }
  return count;
}

function buildBlockerSummary({ missingFixtures, invariantFailures, unexpected }) {
  const summary = [];
  if (missingFixtures.length) {
    summary.push({
      id: "fixtures.missing",
      severity: "runtime-error",
      detail: `${missingFixtures.length} replacement fixture(s) missing`,
      sample: missingFixtures.slice(0, 5).map((entry) => entry.target),
    });
  }
  if (invariantFailures.length) {
    summary.push({
      id: "invariants.failed",
      severity: "private-content",
      detail: `${invariantFailures.length} invariant failure(s)`,
      sample: invariantFailures.slice(0, 5).map((entry) => `${entry.id}@${entry.path}`),
    });
  }
  if (unexpected.length) {
    summary.push({
      id: "include.unexpected",
      severity: "warn",
      detail: `${unexpected.length} file(s) excluded by default (not on include list, not on strip list)`,
      sample: unexpected.slice(0, 5).map((entry) => entry.path),
    });
  }
  return summary;
}

export function writeProvenanceManifest({
  outRoot,
  sourceSha,
  stripListVersion,
  generatedAt,
  outputFileCount,
  blockerSummary,
}) {
  const manifest = {
    schema: PUBLIC_MIRROR_BUILDER_VERSION,
    source_sha: sourceSha,
    strip_list_version: stripListVersion,
    generated_at: generatedAt,
    output_file_count: outputFileCount,
    blocker_summary: blockerSummary,
  };
  const targetPath = path.join(outRoot, "mirror-provenance.json");
  fs.writeFileSync(targetPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function runBuildPublicMirror({
  sourceRoot = process.cwd(),
  outRoot,
  dryRun = false,
  verify = false,
  stripListVersion = STRIP_LIST_VERSION_DEFAULT,
  sourceSha,
  now = () => new Date(),
} = {}) {
  if (!outRoot) {
    return {
      status: "RUNTIME_ERROR",
      exit_code: 2,
      reason: "missing-out",
      source_sha: sourceSha || null,
      strip_list_version: stripListVersion,
      generated_at: now().toISOString(),
      output_file_count: 0,
      copied: [],
      stripped: [],
      missing_fixtures: [],
      unexpected: [],
      invariant_failures: [],
      blocker_summary: [
        { id: "cli.missing-out", severity: "runtime-error", detail: "--out is required" },
      ],
    };
  }

  const resolvedSourceRoot = path.resolve(sourceRoot);
  const resolvedSourceSha = resolveSourceSha(resolvedSourceRoot, sourceSha);
  const generatedAt = now().toISOString();

  let plan;
  try {
    plan = planPublicMirror({ sourceRoot: resolvedSourceRoot, stripListVersion });
  } catch (error) {
    return {
      status: "RUNTIME_ERROR",
      exit_code: 2,
      reason: error.message,
      source_sha: resolvedSourceSha,
      strip_list_version: stripListVersion,
      generated_at: generatedAt,
      output_file_count: 0,
      copied: [],
      stripped: [],
      missing_fixtures: [],
      unexpected: [],
      invariant_failures: [],
      blocker_summary: [
        { id: "plan.failed", severity: "runtime-error", detail: error.message },
      ],
    };
  }

  if (dryRun) {
    const blockerSummary = buildBlockerSummary({
      missingFixtures: plan.missing_fixtures,
      invariantFailures: [],
      unexpected: plan.unexpected,
    });
    const status = plan.missing_fixtures.length ? "RUNTIME_ERROR" : "PASS";
    return {
      status,
      exit_code: plan.missing_fixtures.length ? 2 : 0,
      dry_run: true,
      reason: plan.missing_fixtures.length ? "missing-fixtures" : null,
      source_sha: resolvedSourceSha,
      strip_list_version: stripListVersion,
      generated_at: generatedAt,
      output_file_count: 0,
      copied: plan.copied,
      stripped: plan.stripped,
      missing_fixtures: plan.missing_fixtures,
      unexpected: plan.unexpected,
      invariant_failures: [],
      blocker_summary: blockerSummary,
    };
  }

  if (plan.missing_fixtures.length) {
    return {
      status: "RUNTIME_ERROR",
      exit_code: 2,
      reason: "missing-fixtures",
      source_sha: resolvedSourceSha,
      strip_list_version: stripListVersion,
      generated_at: generatedAt,
      output_file_count: 0,
      copied: plan.copied,
      stripped: plan.stripped,
      missing_fixtures: plan.missing_fixtures,
      unexpected: plan.unexpected,
      invariant_failures: [],
      blocker_summary: buildBlockerSummary({
        missingFixtures: plan.missing_fixtures,
        invariantFailures: [],
        unexpected: plan.unexpected,
      }),
    };
  }

  const resolvedOut = path.resolve(outRoot);
  try {
    executeMirrorCopy({ plan, outRoot: resolvedOut });
    writePublicMirrorPageIndex(resolvedOut);
  } catch (error) {
    return {
      status: "RUNTIME_ERROR",
      exit_code: 2,
      reason: error.message,
      source_sha: resolvedSourceSha,
      strip_list_version: stripListVersion,
      generated_at: generatedAt,
      output_file_count: 0,
      copied: plan.copied,
      stripped: plan.stripped,
      missing_fixtures: plan.missing_fixtures,
      unexpected: plan.unexpected,
      invariant_failures: [],
      blocker_summary: [
        { id: "copy.failed", severity: "runtime-error", detail: error.message },
      ],
    };
  }

  let invariantFailures = [];
  let status = "PASS";
  let exitCode = 0;
  if (verify) {
    const verification = verifyPublicMirrorOutput({ outRoot: resolvedOut });
    invariantFailures = verification.invariant_failures;
    if (!verification.passed) {
      status = "PRIVATE_CONTENT_DETECTED";
      exitCode = 3;
    }
  }

  const outputFileCount = countOutputFiles(resolvedOut);
  const blockerSummary = buildBlockerSummary({
    missingFixtures: plan.missing_fixtures,
    invariantFailures,
    unexpected: plan.unexpected,
  });
  writeProvenanceManifest({
    outRoot: resolvedOut,
    sourceSha: resolvedSourceSha,
    stripListVersion,
    generatedAt,
    outputFileCount: outputFileCount + 1,
    blockerSummary,
  });

  return {
    status,
    exit_code: exitCode,
    source_sha: resolvedSourceSha,
    strip_list_version: stripListVersion,
    generated_at: generatedAt,
    output_file_count: outputFileCount + 1,
    copied: plan.copied,
    stripped: plan.stripped,
    missing_fixtures: plan.missing_fixtures,
    unexpected: plan.unexpected,
    invariant_failures: invariantFailures,
    blocker_summary: blockerSummary,
  };
}

export function hashOutputTree(outRoot) {
  const resolved = path.resolve(outRoot);
  const stack = [resolved];
  const files = [];
  while (stack.length) {
    const directory = stack.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      const relative = path.relative(resolved, absolute).split(path.sep).join("/");
      files.push({ path: relative, absolute });
    }
  }
  files.sort((left, right) => left.path.localeCompare(right.path));
  return files.map((entry) => ({ path: entry.path, sha256: sha256OfFile(entry.absolute) }));
}

function parseArgs(argv) {
  const options = {
    sourceRoot: process.cwd(),
    outRoot: "",
    dryRun: false,
    verify: false,
    json: false,
    stripListVersion: STRIP_LIST_VERSION_DEFAULT,
    sourceSha: "",
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--verify") {
      options.verify = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    const nextValue = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };
    if (arg === "--out") options.outRoot = nextValue();
    else if (arg === "--source-root") options.sourceRoot = nextValue();
    else if (arg === "--strip-list-version") options.stripListVersion = nextValue();
    else if (arg === "--source-sha") options.sourceSha = nextValue();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  options.sourceRoot = path.resolve(options.sourceRoot);
  if (options.outRoot) options.outRoot = path.resolve(options.outRoot);
  return options;
}

function printHelp() {
  process.stdout.write(
    [
      "Usage:",
      "  build-public-mirror.mjs --out PATH [--dry-run | --verify] [--json]",
      "",
      "Options:",
      "  --out PATH                Output directory (must not exist or be empty).",
      "  --dry-run                 List included/stripped files without copying.",
      "  --verify                  Build then scan output for invariants.",
      "  --json                    Print structured JSON to stdout.",
      "  --source-root PATH        Private source tree (default: cwd).",
      "  --strip-list-version STR  Strip-list version label (default: v1).",
      "  --source-sha SHA          Override source SHA recorded in manifest.",
      "",
    ].join("\n"),
  );
}

function printPlain(result) {
  const head = result.dry_run ? "DRY-RUN" : "BUILD";
  process.stdout.write(
    `${head} [${result.status}]: ${result.copied.length} files included, ${result.stripped.length} files stripped\n`,
  );
  if (result.missing_fixtures.length) {
    process.stdout.write(
      `  missing_fixtures: ${result.missing_fixtures.map((entry) => entry.target).join(", ")}\n`,
    );
  }
  if (result.invariant_failures.length) {
    process.stdout.write(`VERIFY [${result.status}]: ${result.invariant_failures.length} invariant failure(s)\n`);
  } else if (result.status !== "RUNTIME_ERROR" && !result.dry_run) {
    process.stdout.write(`VERIFY [PASS]: 0 invariant failure(s)\n`);
  }
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    printHelp();
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    printHelp();
    return;
  }
  if (!options.outRoot) {
    process.stderr.write("--out is required\n");
    printHelp();
    process.exitCode = 2;
    return;
  }

  const result = await runBuildPublicMirror({
    sourceRoot: options.sourceRoot,
    outRoot: options.outRoot,
    dryRun: options.dryRun,
    verify: options.verify,
    stripListVersion: options.stripListVersion,
    sourceSha: options.sourceSha || undefined,
  });

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    printPlain(result);
  }
  if (result.exit_code) process.exitCode = result.exit_code;
}

const invokedDirectly =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1]);
if (invokedDirectly) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message || String(error)}\n`);
    process.exitCode = 1;
  });
}
