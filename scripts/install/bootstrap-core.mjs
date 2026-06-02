import fs from "node:fs";
import path from "node:path";

export const BOOTSTRAP_VERSION = "bootstrap/v0";

const AUTH_SURFACES = [
  "AionUI session auth + model provider key - operator pre-configures in AionUI before first EVE session (HG-1)",
  "Plane App token/bot-token - Plane developer app setup required before first worker dispatch (HG-3 write)",
  "GitHub CLI/OAuth - gh auth login required before code worker dispatch (HG-3 write)",
  "Honcho workspace IDs + token - HG-2 approval required before durable memory write",
  "Google OAuth Calendar/Drive - HG-2 read scopes; HG-3 write/share scopes",
];

function readCompanyOsVersion(sourceRoot) {
  const versionFile = path.join(sourceRoot, "VERSION");
  if (fs.existsSync(versionFile)) return fs.readFileSync(versionFile, "utf8").trim();
  return "unknown";
}

const SKIP_DIR_NAMES = new Set([
  ".git", "node_modules", ".next", "dist", "build", ".cache", ".turbo",
  ".pytest_cache", "__pycache__",
]);

const SKIP_FILE_NAMES = new Set([".DS_Store"]);

const GENERATED_FILE_SPECS = [
  {
    source: ".company-os/operations/install-record.example.md",
    target: ".company-os/install-record.md",
  },
  {
    source: ".company-os/operations/workspace-registry.example.json",
    target: ".company-os/operations/workspace-registry.json",
  },
  {
    source: ".company-os/operations/software-stack.example.md",
    target: ".company-os/operations/software-stack.md",
  },
  {
    source: ".company-os/operations/human-gates.example.md",
    target: ".company-os/operations/human-gates.md",
  },
  {
    source: ".company-os/operations/first-run-checklist.example.md",
    target: ".company-os/first-run-checklist.md",
  },
  {
    source: ".company-os/templates/company-discovery-brief.md",
    target: ".company-os/company-discovery-brief.md",
  },
];

const NEXT_STEPS = [
  "Edit .company-os/install-record.md and pin VERSION plus autonomy ceiling.",
  "Edit .company-os/operations/workspace-registry.json for local repo paths and Plane project IDs.",
  "Edit .company-os/operations/software-stack.md and enable only the first pilot connectors.",
  "Edit .company-os/operations/human-gates.md before any worker dispatch.",
  "Complete .company-os/first-run-checklist.md before creating the first Plane parent.",
];

function listFilesRecursive(dir, base) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      files.push(...listFilesRecursive(absolute, base));
    } else if (!SKIP_FILE_NAMES.has(entry.name)) {
      files.push(path.relative(base, absolute));
    }
  }
  return files.sort();
}

function makeResult(fields) {
  return {
    version: BOOTSTRAP_VERSION,
    ok: false,
    dry_run: false,
    source: "",
    target: "",
    company_os_version: "unknown",
    status: "error",
    files_to_copy: [],
    files_copied: [],
    generated_files: [],
    files_generated: [],
    collisions: [],
    missing_templates: [],
    auth_surfaces: [],
    next_steps: [],
    ...fields,
  };
}

/**
 * Copy Company.OS kit files from <source>/kits/company-os-kit/ into <target>.
 *
 * Options:
 *   source  — path to the Company.OS repo root (must contain kits/company-os-kit/).
 *   target  — destination directory (need not exist yet).
 *   dryRun  — if true, return what would happen without writing anything.
 *   force   — if true, allow overwriting existing target files.
 *
 * Returns a result object suitable for JSON serialisation.
 */
export function runBootstrap({ source, target, dryRun = false, force = false } = {}) {
  const resolvedSource = path.resolve(source ?? "");
  const resolvedTarget = path.resolve(target ?? "");
  const kitDir = path.join(resolvedSource, "kits", "company-os-kit");
  const companyOsVersion = readCompanyOsVersion(resolvedSource);

  if (!fs.existsSync(resolvedSource)) {
    return makeResult({
      source: resolvedSource,
      target: resolvedTarget,
      company_os_version: companyOsVersion,
      dry_run: dryRun,
      status: "error",
      error: `Source not found: ${resolvedSource}`,
    });
  }

  if (!fs.existsSync(kitDir)) {
    return makeResult({
      source: resolvedSource,
      target: resolvedTarget,
      company_os_version: companyOsVersion,
      dry_run: dryRun,
      status: "error",
      error: `Kit directory not found inside source: ${kitDir}`,
    });
  }

  const filesToCopy = listFilesRecursive(kitDir, kitDir);
  const missingTemplates = GENERATED_FILE_SPECS
    .filter((spec) => !fs.existsSync(path.join(kitDir, spec.source)))
    .map((spec) => spec.source);

  if (missingTemplates.length > 0) {
    return makeResult({
      source: resolvedSource,
      target: resolvedTarget,
      company_os_version: companyOsVersion,
      dry_run: dryRun,
      status: "error",
      error: `Required generated-file template(s) missing from kit: ${missingTemplates.join(", ")}`,
      files_to_copy: filesToCopy,
      missing_templates: missingTemplates,
    });
  }

  const generatedFiles = GENERATED_FILE_SPECS.map((spec) => spec.target);
  const copyCollisions = filesToCopy.filter((file) =>
    fs.existsSync(path.join(resolvedTarget, file)),
  );
  const generatedCollisions = generatedFiles.filter((file) =>
    fs.existsSync(path.join(resolvedTarget, file)),
  );
  const collisions = [...new Set([...copyCollisions, ...generatedCollisions])].sort();

  if (!force && collisions.length > 0) {
    return makeResult({
      source: resolvedSource,
      target: resolvedTarget,
      company_os_version: companyOsVersion,
      dry_run: dryRun,
      status: "blocked",
      message: `${collisions.length} target file(s) already exist. Re-run with --force to overwrite.`,
      files_to_copy: filesToCopy,
      generated_files: generatedFiles,
      collisions,
    });
  }

  if (dryRun) {
    return makeResult({
      ok: true,
      dry_run: true,
      source: resolvedSource,
      target: resolvedTarget,
      company_os_version: companyOsVersion,
      status: "dry-run",
      files_to_copy: filesToCopy,
      generated_files: generatedFiles,
      collisions,
      auth_surfaces: AUTH_SURFACES,
      next_steps: NEXT_STEPS,
    });
  }

  const filesCopied = [];
  for (const file of filesToCopy) {
    const src = path.join(kitDir, file);
    const dst = path.join(resolvedTarget, file);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    filesCopied.push(file);
  }

  const filesGenerated = [];
  for (const spec of GENERATED_FILE_SPECS) {
    const src = path.join(kitDir, spec.source);
    const dst = path.join(resolvedTarget, spec.target);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    filesGenerated.push(spec.target);
  }

  return makeResult({
    ok: true,
    source: resolvedSource,
    target: resolvedTarget,
    company_os_version: companyOsVersion,
    status: "pass",
    files_to_copy: filesToCopy,
    files_copied: filesCopied,
    generated_files: generatedFiles,
    files_generated: filesGenerated,
    collisions,
    auth_surfaces: AUTH_SURFACES,
    next_steps: NEXT_STEPS,
  });
}
