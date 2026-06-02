import fs from "node:fs";
import path from "node:path";

export const PRODUCTIZATION_READINESS_VERSION = "productization-readiness/v0";

export const REQUIRED_DOCS = [
  "README.md",
  "VERSION",
  "CHANGELOG.md",
  "docs/bootstrap/fresh-company-setup.md",
  "docs/operations/company-os-client-rollout-doctrine.md",
  "docs/operations/client-productization-readiness.md",
  "docs/operations/operating-system-setup-checklist.md",
  "docs/orchestration/spec-to-worker-pipeline.md",
  "docs/orchestration/plane-first-linear-bridge.md",
  "docs/orchestration/headless-worker-runtime-boot-contract.md",
  "docs/registries/capability-registry.md",
  "docs/integrations/plane-app-control-plane.md",
  "docs/templates/worker-issue-contract.md",
  "kits/company-os-kit/README.md",
  "kits/company-os-kit/templates/AGENTS.md",
];

export const REQUIRED_SCRIPTS = [
  "scripts/page-index/generate-page-index.mjs",
  "scripts/plane/plane-api-sanity.mjs",
  "scripts/plane/plane-app-token-rotation.mjs",
  "scripts/orchestration/plane-dispatcher-v0.mjs",
  "scripts/orchestration/runtime-dispatcher-v1.mjs",
  "scripts/orchestration/runtime-dispatcher-v12-core.mjs",
  "scripts/orchestration/cao-pass.mjs",
  "scripts/orchestration/codex-controller-dryrun.mjs",
  "scripts/capabilities/capability-registry.mjs",
  "scripts/release-gates/human-gate-release.mjs",
  "scripts/release-gates/productization-readiness.mjs",
  "scripts/release-gates/runtime-04-readiness.mjs",
  "scripts/operator-shell/start_eve.mjs",
];

function readText(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function pushCheck(checks, status, id, message, details = {}) {
  checks.push({ status, id, message, details });
}

function listFiles(root, predicate, base = root) {
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      files.push(...listFiles(absolute, predicate, base));
    } else if (predicate(absolute, entry)) {
      files.push(path.relative(base, absolute));
    }
  }
  return files.sort();
}

const TEXT_FILE_EXTENSIONS = new Set([
  ".md", ".mdx", ".mjs", ".cjs", ".js", ".ts", ".tsx", ".jsx", ".py",
  ".json", ".yaml", ".yml", ".sh", ".txt", ".env",
]);

const SKIP_DIR_NAMES = new Set([
  ".git", "node_modules", ".next", "dist", "build", ".cache", ".turbo",
]);

function isExampleFile(relativePath) {
  const base = path.basename(relativePath);
  if (base === ".env.example") return true;
  if (base.endsWith(".example")) return true;
  if (base.includes(".example.")) return true;
  return false;
}

function isPublicSafeReport(relativePath) {
  if (relativePath === "reports/.gitkeep") return true;
  if (!relativePath.startsWith("reports/examples/")) return false;
  return path.basename(relativePath).includes(".example.");
}

function listTextFiles(rootDir, base) {
  if (!fs.existsSync(rootDir)) return [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      files.push(...listTextFiles(absolute, base));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (!TEXT_FILE_EXTENSIONS.has(ext)) continue;
      files.push(path.relative(base, absolute));
    }
  }
  return files.sort();
}

function scanLinesForRegex(root, relativeFiles, regex, { skipExamples = true } = {}) {
  const hits = [];
  for (const relativePath of relativeFiles) {
    if (skipExamples && isExampleFile(relativePath)) continue;
    let content;
    try {
      content = fs.readFileSync(path.join(root, relativePath), "utf8");
    } catch {
      continue;
    }
    const lines = content.split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      regex.lastIndex = 0;
      if (regex.test(lines[index])) {
        hits.push({ path: relativePath, line: index + 1 });
      }
    }
  }
  return hits;
}

function publicSeverity(publicRelease) {
  return publicRelease ? "block" : "warn";
}

const HARD_CODED_PATH_PATTERN = /\/Users\/mathiasheinke\//;
const FOUNDER_IDENTITY_PATTERN = /(?:Mathias Heinke|Founder ARES)/;
const SOURCE_COMPANY_TOKEN_PREFIX = ["ares", "hermes"].join("-");
const PRIVATE_WORKSPACE_NAMES = [
  ["ares", "app"].join("-"),
  ["ares", "website"].join("-"),
  ["ares", "bio", "os", "desktop"].join("-"),
  ["ares", "bio", "os", "dashboard"].join("-"),
  ["MH", "DEV"].join("_"),
  [".agent", "sandboxes"].join("-"),
];
function regexEscape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const PRIVATE_DOMAIN_PATTERN = new RegExp(
  [
    String.raw`\b${["bio-os", "io"].join(String.raw`\.`)}\b`,
    String.raw`\b${["ares", "bio", "os"].join("-")}\b`,
    String.raw`\b${SOURCE_COMPANY_TOKEN_PREFIX}\b`,
    String.raw`\b${["dash", "bio-os"].join(String.raw`\.`)}\b`,
    String.raw`\b${["app", "bio-os"].join(String.raw`\.`)}\b`,
    String.raw`\b${["api", "bio-os"].join(String.raw`\.`)}\b`,
    String.raw`(?:^|(?<=\W))(?:${PRIVATE_WORKSPACE_NAMES.map(regexEscape).join("|")})(?=$|\W)`,
  ].join("|"),
);
const LEGACY_LEDGER_ASSERTION_PATTERN = /(?:^|[\s>*_`(\[-])Linear\s+is\s+the\s+execution\s+ledger\b/i;

const TOKEN_PATTERNS = [
  { id: "anthropic-key", regex: /\bsk-ant-[A-Za-z0-9_-]{20,}/ },
  { id: "openai-key", regex: /\bsk-[A-Za-z0-9]{20,}/ },
  { id: "github-pat", regex: /\bghp_[A-Za-z0-9]{20,}/ },
  { id: "github-fine-grained-pat", regex: /\bgithub_pat_[A-Za-z0-9_]{20,}/ },
  { id: "slack-bot-token", regex: /\bxoxb-[A-Za-z0-9-]{10,}/ },
  { id: "slack-user-token", regex: /\bxoxp-[A-Za-z0-9-]{10,}/ },
  {
    id: "source-company-token",
    regex: new RegExp(String.raw`\b${SOURCE_COMPANY_TOKEN_PREFIX}-[A-Za-z0-9_-]{20,}`),
  },
  { id: "google-api-key", regex: /\bAIza[0-9A-Za-z_-]{30,}/ },
];

function evidenceSummary(hits, limit = 5) {
  return {
    count: hits.length,
    sample: hits.slice(0, limit).map((hit) => `${hit.path}:${hit.line}`),
  };
}

function tokenEvidenceSummary(hits, limit = 5) {
  return {
    count: hits.length,
    sample: hits.slice(0, limit).map((hit) => ({
      path: hit.path,
      line: hit.line,
      pattern: hit.pattern,
    })),
  };
}

export function extractReadmeVersion(readmeText) {
  return readmeText.match(/Current version:\s*`([^`]+)`/)?.[1] || "";
}

export function evaluateProductizationReadiness({
  root = process.cwd(),
  publicRelease = false,
} = {}) {
  const resolvedRoot = path.resolve(root);
  const checks = [];

  for (const doc of REQUIRED_DOCS) {
    pushCheck(
      checks,
      exists(resolvedRoot, doc) ? "pass" : "block",
      "docs.required",
      exists(resolvedRoot, doc) ? `Required doc exists: ${doc}` : `Required doc missing: ${doc}`,
      { path: doc },
    );
  }

  for (const script of REQUIRED_SCRIPTS) {
    pushCheck(
      checks,
      exists(resolvedRoot, script) ? "pass" : "block",
      "scripts.required",
      exists(resolvedRoot, script) ? `Required script exists: ${script}` : `Required script missing: ${script}`,
      { path: script },
    );
  }

  if (exists(resolvedRoot, "VERSION") && exists(resolvedRoot, "README.md")) {
    const version = readText(resolvedRoot, "VERSION").trim();
    const readme = readText(resolvedRoot, "README.md");
    const readmeVersion = extractReadmeVersion(readme);
    pushCheck(
      checks,
      readmeVersion === version ? "pass" : "block",
      "version.readme",
      readmeVersion === version
        ? "README version matches VERSION"
        : "README Current version does not match VERSION",
      { version, readme_version: readmeVersion },
    );

    const changelog = exists(resolvedRoot, "CHANGELOG.md") ? readText(resolvedRoot, "CHANGELOG.md") : "";
    pushCheck(
      checks,
      changelog.includes(`## ${version}`) ? "pass" : "block",
      "version.changelog",
      changelog.includes(`## ${version}`) ? "CHANGELOG has current version section" : "CHANGELOG missing current version section",
      { version },
    );

    pushCheck(
      checks,
      /guided alpha/i.test(readme) && /not.*self-serve/i.test(readme)
        ? "pass"
        : "warn",
      "readme.boundary",
      "README should state guided-alpha vs self-serve boundary",
      {},
    );
  }

  const kitAgents = exists(resolvedRoot, "kits/company-os-kit/templates/AGENTS.md")
    ? readText(resolvedRoot, "kits/company-os-kit/templates/AGENTS.md")
    : "";
  pushCheck(
    checks,
    /Plane-First Execution Ledger/.test(kitAgents) && /Spec-to-Worker/.test(kitAgents) ? "pass" : "block",
    "kit.boot-doctrine",
    "Kit AGENTS template includes Plane-first and Spec-to-Worker doctrine",
    {},
  );

  const productizationDoc = exists(resolvedRoot, "docs/operations/client-productization-readiness.md")
    ? readText(resolvedRoot, "docs/operations/client-productization-readiness.md")
    : "";
  pushCheck(
    checks,
    /Supabase.*optional/i.test(productizationDoc) || /optional.*Supabase/i.test(productizationDoc) ? "pass" : "block",
    "boundaries.supabase",
    "Productization doc states Supabase is optional connector/backend, not core requirement",
    {},
  );
  pushCheck(
    checks,
    /Honcho/i.test(productizationDoc) && /Plane App/i.test(productizationDoc) && /Scheduler/i.test(productizationDoc) ? "pass" : "block",
    "boundaries.runtime-stack",
    "Productization doc covers Honcho, Plane App and Scheduler boundaries",
    {},
  );

  const realEnvFiles = listFiles(resolvedRoot, (absolute, entry) => {
    if (entry.name.endsWith(".example")) return false;
    if (entry.name === ".env.example") return false;
    return entry.name === ".env" || entry.name.startsWith(".env.");
  });
  pushCheck(
    checks,
    realEnvFiles.length === 0 ? "pass" : "block",
    "sanitize.no-real-env",
    realEnvFiles.length === 0 ? "No real env files found" : "Real env files found",
    { files: realEnvFiles },
  );

  const nonExampleMetrics = listFiles(path.join(resolvedRoot, "metrics"), (absolute, entry) => {
    return entry.name.endsWith(".jsonl") && !entry.name.includes(".example.");
  }, resolvedRoot);
  if (nonExampleMetrics.length) {
    pushCheck(
      checks,
      publicRelease ? "block" : "warn",
      "sanitize.metrics-ledgers",
      publicRelease
        ? "Public release cannot include live metrics ledgers"
        : "Live metrics ledgers are present; guided/private alpha only unless sanitized",
      { files: nonExampleMetrics },
    );
  }

  const reports = listFiles(path.join(resolvedRoot, "reports"), () => true, resolvedRoot);
  const unsafeReports = reports.filter((file) => !isPublicSafeReport(file));
  if (unsafeReports.length) {
    pushCheck(
      checks,
      publicRelease ? "block" : "warn",
      "sanitize.reports",
      publicRelease
        ? "Public release cannot include unsanitized internal reports"
        : "Internal reports are present; keep private or sanitize before public/self-serve release",
      {
        count: unsafeReports.length,
        total_reports: reports.length,
        sample: unsafeReports.slice(0, 5),
      },
    );
  }

  const legacyLedgerTemplatePath =
    "kits/company-os-kit/.company-os/templates/linear-worker-issue-template.md";
  if (exists(resolvedRoot, legacyLedgerTemplatePath)) {
    const body = readText(resolvedRoot, legacyLedgerTemplatePath);
    const lines = body.split("\n");
    const offendingLines = [];
    for (let index = 0; index < lines.length; index += 1) {
      LEGACY_LEDGER_ASSERTION_PATTERN.lastIndex = 0;
      if (LEGACY_LEDGER_ASSERTION_PATTERN.test(lines[index])) {
        offendingLines.push(index + 1);
      }
    }
    pushCheck(
      checks,
      offendingLines.length === 0 ? "pass" : "block",
      "kit.legacy-ledger-template",
      offendingLines.length === 0
        ? "Kit Linear template no longer asserts Linear as canonical execution ledger"
        : "Kit Linear template still asserts Linear as the execution ledger (Plane is canonical)",
      { path: legacyLedgerTemplatePath, lines: offendingLines },
    );
  }

  const legacyLedgerRegistryPath =
    "kits/company-os-kit/.company-os/operations/workspace-registry.example.json";
  if (exists(resolvedRoot, legacyLedgerRegistryPath)) {
    let registryStatus = "pass";
    let registryMessage = "Kit workspace registry defaults execution_ledger to Plane";
    const registryDetails = { path: legacyLedgerRegistryPath };
    try {
      const parsed = JSON.parse(readText(resolvedRoot, legacyLedgerRegistryPath));
      const ledger = parsed?.defaults?.execution_ledger;
      registryDetails.execution_ledger = ledger ?? null;
      if (ledger !== "plane") {
        registryStatus = "block";
        registryMessage = `Kit workspace registry defaults.execution_ledger is "${ledger ?? "missing"}"; Plane is canonical`;
      }
    } catch (error) {
      registryStatus = "block";
      registryMessage = "Kit workspace registry JSON failed to parse";
      registryDetails.error = error.message;
    }
    pushCheck(checks, registryStatus, "kit.legacy-ledger-registry", registryMessage, registryDetails);
  }

  const docPathFiles = [
    ...listTextFiles(path.join(resolvedRoot, "docs/operations"), resolvedRoot),
    ...listTextFiles(path.join(resolvedRoot, "docs/orchestration"), resolvedRoot),
    ...listTextFiles(path.join(resolvedRoot, "kits"), resolvedRoot),
    ...listTextFiles(path.join(resolvedRoot, "scripts"), resolvedRoot),
  ];
  const pathLeakHits = scanLinesForRegex(resolvedRoot, docPathFiles, HARD_CODED_PATH_PATTERN);
  pushCheck(
    checks,
    pathLeakHits.length === 0 ? "pass" : publicSeverity(publicRelease),
    "docs.hard-coded-developer-paths",
    pathLeakHits.length === 0
      ? "No hard-coded developer paths in docs/operations, docs/orchestration, kits or scripts"
      : publicRelease
        ? "Public release cannot include hard-coded developer paths in docs, kit or scripts"
        : "Hard-coded developer paths leak into docs/operations, docs/orchestration, kit or scripts (warn for guided alpha)",
    evidenceSummary(pathLeakHits),
  );

  const kitFiles = listTextFiles(path.join(resolvedRoot, "kits"), resolvedRoot);
  const founderHits = scanLinesForRegex(resolvedRoot, kitFiles, FOUNDER_IDENTITY_PATTERN);
  pushCheck(
    checks,
    founderHits.length === 0 ? "pass" : publicSeverity(publicRelease),
    "kit.founder-identity-leak",
    founderHits.length === 0
      ? "Kit content has no founder identity literals"
      : publicRelease
        ? "Public release cannot embed founder identity literals in the kit"
        : "Kit content embeds founder identity literals (warn for guided alpha; replace with placeholders before public release)",
    evidenceSummary(founderHits),
  );

  const privateDomainScopeFiles = [
    ...kitFiles,
    ...listTextFiles(path.join(resolvedRoot, "scripts"), resolvedRoot),
    ...listTextFiles(path.join(resolvedRoot, "docs"), resolvedRoot),
  ];
  const privateDomainHits = scanLinesForRegex(
    resolvedRoot,
    privateDomainScopeFiles,
    PRIVATE_DOMAIN_PATTERN,
  );
  pushCheck(
    checks,
    privateDomainHits.length === 0 ? "pass" : publicSeverity(publicRelease),
    "kit.private-domain-leak",
    privateDomainHits.length === 0
      ? "No source-company domain literals in kit, scripts or docs"
      : publicRelease
        ? "Public release cannot include source-company domain literals"
        : "Source-company domain literals present; warn for guided alpha",
    evidenceSummary(privateDomainHits),
  );

  const tokenHits = [];
  for (const relativePath of kitFiles) {
    if (isExampleFile(relativePath)) continue;
    let content;
    try {
      content = fs.readFileSync(path.join(resolvedRoot, relativePath), "utf8");
    } catch {
      continue;
    }
    const lines = content.split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      for (const pattern of TOKEN_PATTERNS) {
        pattern.regex.lastIndex = 0;
        if (pattern.regex.test(lines[index])) {
          tokenHits.push({ path: relativePath, line: index + 1, pattern: pattern.id });
        }
      }
    }
  }
  pushCheck(
    checks,
    tokenHits.length === 0 ? "pass" : publicSeverity(publicRelease),
    "kit.token-shaped-string",
    tokenHits.length === 0
      ? "No token-shaped strings detected in kit content"
      : publicRelease
        ? "Public release fails closed on token-shaped strings in kit content (values redacted)"
        : "Token-shaped strings detected in kit content (values redacted; rotate and remove before public release)",
    tokenEvidenceSummary(tokenHits),
  );

  const installPrereqMissing = [];
  if (!exists(resolvedRoot, ".env.example")) installPrereqMissing.push(".env.example");
  if (!exists(resolvedRoot, "scripts/install/bootstrap.mjs")) {
    installPrereqMissing.push("scripts/install/bootstrap.mjs");
  }
  pushCheck(
    checks,
    installPrereqMissing.length === 0 ? "pass" : publicSeverity(publicRelease),
    "install.prerequisite-drift",
    installPrereqMissing.length === 0
      ? "Top-level installer prerequisites present"
      : publicRelease
        ? "Public release requires top-level installer prerequisites"
        : "Top-level installer prerequisites missing (guided alpha may run without them)",
    { missing: installPrereqMissing },
  );

  const blockers = checks.filter((check) => check.status === "block");
  const warnings = checks.filter((check) => check.status === "warn");
  return {
    version: PRODUCTIZATION_READINESS_VERSION,
    root: resolvedRoot,
    status: blockers.length ? "blocked" : "pass",
    ok: blockers.length === 0,
    public_release: Boolean(publicRelease),
    blocker_count: blockers.length,
    warning_count: warnings.length,
    blockers,
    warnings,
    checks,
  };
}

export function renderProductizationReadinessMarkdown(result) {
  const lines = [
    "# Company.OS Productization Readiness Gate",
    "",
    `Status: **${result.status.toUpperCase()}**`,
    `Root: \`${result.root}\``,
    `Public release mode: \`${result.public_release}\``,
    `Blockers: ${result.blocker_count}`,
    `Warnings: ${result.warning_count}`,
    "",
    "## Blockers",
    "",
  ];

  if (!result.blockers.length) lines.push("- none");
  for (const blocker of result.blockers) {
    lines.push(`- \`${blocker.id}\`: ${blocker.message}`);
  }

  lines.push("", "## Warnings", "");
  if (!result.warnings.length) lines.push("- none");
  for (const warning of result.warnings) {
    lines.push(`- \`${warning.id}\`: ${warning.message}`);
  }

  lines.push("", "## Checks", "");
  for (const check of result.checks) {
    lines.push(`- ${check.status.toUpperCase()} \`${check.id}\`: ${check.message}`);
  }

  return `${lines.join("\n")}\n`;
}
